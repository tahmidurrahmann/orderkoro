import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClientConfig } from "@/lib/server/clients";
import { logger } from "@/lib/server/logger";
import {
  checkIpRateLimit,
  getOrderMeta,
  getOrderToken,
  getRedisDriver,
  updateOrderMetaCustomerConfirmed,
} from "@/lib/server/redis";
import { updateSheetCustomerConfirmedWithRetry } from "@/lib/server/sheets";
import {
  editTelegramOrderMessage,
  formatTelegramOrderHtml,
  type TelegramOrderPayload,
} from "@/lib/server/telegram";
import {
  buildMobilePaymentInlineKeyboard,
  buildStatusInlineKeyboard,
  type OrderStatus,
} from "@/lib/server/status-machine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ConfirmOrderSchema = z.object({
  token: z.string().min(8, { error: "Invalid token" }),
});

export async function POST(req: NextRequest) {
  try {
    const redis = getRedisDriver();

    // 1. Per-IP Rate Limiting (10 requests per minute)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateLimit = await checkIpRateLimit(clientIp, redis, 10, 60, "confirm");
    if (!rateLimit.allowed) {
      logger.warn("IP rate limit exceeded on customer confirm", { ip: clientIp });
      return NextResponse.json(
        { ok: false, error: "Too many confirmation attempts. Please wait a minute." },
        { status: 429 }
      );
    }

    // 2. Validate Body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parseRes = ConfirmOrderSchema.safeParse(rawBody);
    if (!parseRes.success) {
      return NextResponse.json(
        { ok: false, error: "Valid order token is required" },
        { status: 400 }
      );
    }

    const { token } = parseRes.data;

    // 3. Lookup Token in Redis
    const tokenRecord = await getOrderToken(token, redis);
    if (!tokenRecord) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    const { slug, orderNumber } = tokenRecord;

    // 4. Lookup Order Metadata
    const meta = await getOrderMeta(orderNumber, redis);
    if (!meta || meta.slug !== slug) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    // 5. Lookup Client Config
    const config = getServerClientConfig(slug);
    if (!config) {
      return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });
    }

    // 6. Check customerConfirm configuration
    if (config.customerConfirm !== "tap") {
      return NextResponse.json(
        { ok: false, error: "Customer confirmation is disabled for this store" },
        { status: 403 }
      );
    }

    // 7. Fraud Protection: Block high-value and repeat-phone orders
    const isHighValue =
      typeof config.highValueThreshold === "number" &&
      (meta.total ?? 0) >= config.highValueThreshold;
    const isRepeatPhone = Boolean(meta.repeatPhoneFlag);

    if (isHighValue || isRepeatPhone) {
      return NextResponse.json(
        {
          ok: false,
          error: "Phone confirmation required. The seller will call you to confirm your order.",
          requiresCall: true,
        },
        { status: 403 }
      );
    }

    // 8. Order Status Validation: Only unconfirmed (status: "new") orders can be confirmed
    if (meta.status !== "new") {
      return NextResponse.json(
        { ok: false, error: "Order has already been processed or status is no longer pending" },
        { status: 400 }
      );
    }

    // 9. Idempotency: If already confirmed by customer, return success
    if (meta.customerConfirmed) {
      return NextResponse.json({
        ok: true,
        orderNumber,
        customerConfirmed: true,
        message: "Order already confirmed by customer",
      });
    }

    // 10. Persist customer confirmation in ordmeta
    await updateOrderMetaCustomerConfirmed(orderNumber, redis);

    // 11. Edit Telegram Notification Message
    if (meta.telegramChatId && meta.telegramMessageId) {
      try {
        const origin =
          req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const statusUrl = `${origin}/${slug}/order/${token}`;

        const telegramPayload: TelegramOrderPayload = {
          orderNumber,
          createdAtDhakaIso: meta.createdAtDhakaIso || new Date().toISOString(),
          status: "new",
          name: "",
          phone: meta.phone || "",
          address: "",
          district: meta.district || "",
          zone: meta.zoneLabel || meta.zone || "",
          zoneLabel: meta.zoneLabel,
          productTitle: meta.productTitle || "",
          color: meta.color || "",
          size: meta.size || "",
          quantity: meta.quantity || 1,
          unitPrice: meta.unitPrice || 0,
          deliveryFee: meta.deliveryFee || 0,
          codTotal: meta.total || 0,
          paymentMethod: meta.paymentMethod,
          paymentStatus: meta.paymentStatus,
          transactionId: meta.trxId,
          paidFrom: meta.paidFrom,
          confirmationMode: meta.confirmationMode || config.confirmationMode || "call",
          statusUrl,
        };

        const sellerLang = config.language?.default || "bn";
        let baseText = formatTelegramOrderHtml(
          telegramPayload,
          "new",
          Boolean(meta.repeatPhoneFlag),
          config.delivery?.zones,
          sellerLang
        );

        baseText += "\n\n✅ <b>Customer confirmed via order page</b>";

        const keyboard =
          meta.paymentMethod && meta.paymentMethod !== "cod" && meta.paymentStatus !== "Verified"
            ? buildMobilePaymentInlineKeyboard(
                meta.paymentStatus === "Not received" ? "Not received" : "Unverified",
                orderNumber
              )
            : buildStatusInlineKeyboard("new" as OrderStatus, orderNumber);

        await editTelegramOrderMessage(
          meta.telegramChatId,
          meta.telegramMessageId,
          baseText,
          "new" as OrderStatus,
          orderNumber,
          keyboard
        );
      } catch (tgErr) {
        logger.warn("Failed to edit Telegram message on customer confirm", {
          orderNumber,
          error: (tgErr as Error).message,
        });
      }
    }

    // 12. Update Google Sheet Note (Column P)
    if (config.sheetId) {
      try {
        await updateSheetCustomerConfirmedWithRetry(config.sheetId, meta.rowRef || "", orderNumber);
      } catch (sheetErr) {
        logger.warn("Failed to update Google Sheet note on customer confirm", {
          orderNumber,
          error: (sheetErr as Error).message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      orderNumber,
      customerConfirmed: true,
      message: "Order confirmed successfully",
    });
  } catch (error) {
    logger.error("Unhandled error in POST /api/order/confirm", {
      error: error as Error,
    });
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
