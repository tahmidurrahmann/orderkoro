import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClientConfig } from "@/lib/server/clients";
import { logger } from "@/lib/server/logger";
import { validateBdPhone } from "@/lib/phone";
import { verifyAndRecomputeOrderOnServer } from "@/lib/delivery";
import {
  acquireIdempotencyKey,
  checkIpRateLimit,
  checkPhoneRateLimit,
  computeCartDedupeHash,
  finalizeIdempotencyKey,
  getRedisDriver,
  nextOrderNumber,
  pushDeadLetterOrder,
  releaseIdempotencyKey,
  storeOrderMeta,
} from "@/lib/server/redis";
import { buildSheetRow, type OrderRecordForSheet } from "@/lib/server/sheet-row";
import { appendOrderRowWithRetry } from "@/lib/server/sheets";
import {
  escapeTelegramHtml,
  getAdminChatId,
  sendAdminTelegramAlert,
  sendTelegramOrderMessage,
  type TelegramOrderPayload,
} from "@/lib/server/telegram";
import { resolveLocalizedText } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024; // 16 KB

const AttributionSchema = z
  .object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_content: z.string().optional(),
    utm_term: z.string().optional(),
    fbclid: z.string().optional(),
    _fbp: z.string().optional(),
    _fbc: z.string().optional(),
  })
  .optional()
  .default({});

const OrderInputSchema = z.object({
  slug: z.string({ error: "Client slug is required" }).min(1),
  name: z
    .string({ error: "Customer name is required" })
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(80, { error: "Name cannot exceed 80 characters" }),
  phone: z.string({ error: "Phone number is required" }).min(1),
  address: z
    .string({ error: "Address is required" })
    .trim()
    .min(10, { error: "Address must be at least 10 characters" })
    .max(300, { error: "Address cannot exceed 300 characters" }),
  district: z.string({ error: "District is required" }).min(1),
  zone: z.string({ error: "Zone is required" }).min(1),
  color: z.string({ error: "Color selection is required" }).min(1),
  size: z.string({ error: "Size selection is required" }).min(1),
  quantity: z
    .number({ error: "Quantity is required" })
    .int()
    .min(1, { error: "Quantity must be at least 1" })
    .max(5, { error: "Quantity cannot exceed 5" }),
  note: z.string().max(200, { error: "Note cannot exceed 200 characters" }).optional().default(""),
  honeypot: z.string().optional().default(""),
  website: z.string().optional().default(""),
  formStartedAt: z.number().optional().default(0),
  idempotencyKey: z.string({ error: "Idempotency key is required" }).min(1),
  lang: z.enum(["bn", "en"]).optional().default("bn"),
  attribution: AttributionSchema,
});

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
}

function getDhakaIsoTime(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const find = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${find("year")}-${find("month")}-${find("day")}T${find("hour")}:${find("minute")}:${find("second")}+06:00`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIp(req);

  try {
    // 1. Origin verification against NEXT_PUBLIC_SITE_URL
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!siteUrl && process.env.MOCK_INTEGRATIONS === "1") {
          siteUrl = "http://localhost:3000";
        }
        if (siteUrl) {
          const expectedHost = new URL(siteUrl).host;
          if (originHost !== expectedHost && !originHost.includes("localhost") && !originHost.includes("127.0.0.1")) {
            logger.warn("Origin mismatch", { origin, expectedHost });
            return NextResponse.json({ ok: false, error: "Invalid request origin" }, { status: 403 });
          }
        }
      } catch {
        // Invalid origin format
      }
    }

    // 2. Request size check (max 16 KB)
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Payload exceeds 16 KB limit" },
        { status: 413 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    // 3. Schema validation
    const result = OrderInputSchema.safeParse(parsedJson);
    if (!result.success) {
      const issue = result.error.issues[0];
      return NextResponse.json(
        {
          ok: false,
          error: issue.message,
          field: issue.path.join("."),
          fieldErrors: { [issue.path[0] || "form"]: issue.message },
        },
        { status: 400 }
      );
    }

    const payload = result.data;
    const redis = getRedisDriver();

    // 4. Bot Defense: Honeypot check and submission timing (< 2.5s)
    const honeypotVal = payload.honeypot || payload.website;
    const isBotHoneypot = Boolean(honeypotVal && honeypotVal.trim().length > 0);
    const durationSinceStart = Date.now() - payload.formStartedAt;
    const isBotSpeed = payload.formStartedAt > 0 && durationSinceStart < 2500;

    if (isBotHoneypot || isBotSpeed) {
      logger.info("Bot defense triggered. Returning fake success.", {
        isBotHoneypot,
        isBotSpeed,
        durationSinceStart,
      });
      return NextResponse.json({
        ok: true,
        orderNumber: "BNN-0000",
        eventId: "BNN-0000",
        summary: {
          orderNumber: "BNN-0000",
          productTitle: "Product",
          color: payload.color,
          size: payload.size,
          quantity: payload.quantity,
          total: 0,
        },
      });
    }

    // 5. Load client config on server
    const config = getServerClientConfig(payload.slug);
    if (!config) {
      return NextResponse.json(
        { ok: false, error: `Store configuration not found for slug: ${payload.slug}` },
        { status: 404 }
      );
    }

    // 5b. Seller Pause Control: Reject orders if store is paused
    if (config.status === "paused") {
      const isBn = payload.lang === "bn";
      return NextResponse.json(
        {
          ok: false,
          error: isBn
            ? "এই স্টোরের অর্ডার গ্রহণ সাময়িকভাবে স্থগিত রয়েছে। অনুসন্ধানের জন্য মেসেঞ্জারে যোগাযোগ করুন।"
            : "Orders for this store are currently paused. Please contact us on Messenger for inquiries.",
          code: "STORE_PAUSED",
        },
        { status: 403 }
      );
    }

    // 6. Phone validation & normalization
    const phoneRes = validateBdPhone(payload.phone);
    if (!phoneRes.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: payload.lang === "bn"
            ? "সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)"
            : "Please enter a valid 11-digit Bangladeshi mobile number",
          field: "phone",
          fieldErrors: { phone: "Invalid mobile number" },
        },
        { status: 400 }
      );
    }

    // 7. Server-side verification and pricing recomputation
    const verification = verifyAndRecomputeOrderOnServer(config, {
      district: payload.district,
      zone: payload.zone,
      color: payload.color,
      size: payload.size,
      quantity: payload.quantity,
    });

    if (!verification.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: verification.message,
          fieldErrors: verification.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { unitPrice, quantity, deliveryFee, codTotal, colorName, sizeName } = verification.data;
    const productTitle = resolveLocalizedText(config.product.title, payload.lang);

    // 8. Idempotency Key Handling (checked before rate limits so retries never consume rate quota)
    const idempotency = await acquireIdempotencyKey(
      payload.idempotencyKey,
      { status: "pending", orderNumber: "", eventId: "" },
      redis
    );

    if (!idempotency.acquired) {
      if (idempotency.existing?.orderNumber) {
        logger.info("Idempotent retry detected", {
          idempotencyKey: payload.idempotencyKey,
          orderNumber: idempotency.existing.orderNumber,
        });
        return NextResponse.json({
          ok: true,
          orderNumber: idempotency.existing.orderNumber,
          eventId: idempotency.existing.eventId || idempotency.existing.orderNumber,
          summary: idempotency.existing.summary || {
            orderNumber: idempotency.existing.orderNumber,
            productTitle,
            color: colorName,
            size: sizeName,
            quantity,
            total: codTotal,
          },
        });
      }
    }

    // 9. Content-Based Cart Deduplication (phone + cart hash including delivery address, 10-minute TTL)
    const cartHash = computeCartDedupeHash(
      payload.slug,
      phoneRes.normalized,
      payload.color,
      payload.size,
      payload.quantity,
      payload.address
    );
    const cartDedupeKey = `dedupe:cart:${payload.slug}:${phoneRes.normalized}:${cartHash}`;
    const existingCartOrder = await redis.get<{
      orderNumber: string;
      summary: unknown;
    }>(cartDedupeKey);

    if (existingCartOrder?.orderNumber) {
      logger.info("Content-based cart dedupe hit (same phone + cart within 10m)", {
        cartDedupeKey,
        orderNumber: existingCartOrder.orderNumber,
      });
      return NextResponse.json({
        ok: true,
        orderNumber: existingCartOrder.orderNumber,
        eventId: existingCartOrder.orderNumber,
        summary: existingCartOrder.summary,
      });
    }

    // 10. Rate Limiting: IP (5 per 10m) & Phone (3 per 24h)
    const ipLimit = await checkIpRateLimit(clientIp, redis);
    if (!ipLimit.allowed) {
      logger.warn("IP rate limit exceeded", { clientIp, count: ipLimit.count });
      return NextResponse.json(
        {
          ok: false,
          error: payload.lang === "bn"
            ? "অতিরিক্ত চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।"
            : "Too many orders from this IP. Please try again later.",
        },
        { status: 429 }
      );
    }

    const phoneLimit = await checkPhoneRateLimit(phoneRes.normalized, redis);
    if (!phoneLimit.allowed) {
      logger.warn("Phone rate limit exceeded", { phone: phoneRes.normalized, count: phoneLimit.count });
      return NextResponse.json(
        {
          ok: false,
          error: payload.lang === "bn"
            ? "এই নম্বরে আজকের সর্বোচ্চ অর্ডারের সীমা অতিক্রম করেছে।"
            : "Daily order limit exceeded for this mobile number.",
        },
        { status: 429 }
      );
    }

    // 10. Generate Atomic Order Number (PREFIX-0001)
    const orderNumber = await nextOrderNumber(payload.slug, config.orderPrefix, redis);
    const createdAtDhakaIso = getDhakaIsoTime();

    const sheetRecord: OrderRecordForSheet = {
      orderNumber,
      createdAtDhakaIso,
      status: "new",
      name: payload.name,
      phone: phoneRes.normalized,
      address: payload.address,
      district: payload.district,
      zone: payload.zone,
      productTitle,
      color: colorName,
      size: sizeName,
      quantity,
      unitPrice,
      deliveryFee,
      codTotal,
      note: payload.note,
      confirmationMode: config.confirmationMode || "call",
      attribution: payload.attribution,
    };

    const telegramOrderPayload: TelegramOrderPayload = {
      orderNumber,
      createdAtDhakaIso,
      status: "new",
      name: payload.name,
      phone: phoneRes.normalized,
      address: payload.address,
      district: payload.district,
      zone: payload.zone,
      productTitle,
      color: colorName,
      size: sizeName,
      quantity,
      unitPrice,
      deliveryFee,
      codTotal,
      note: payload.note,
      confirmationMode: config.confirmationMode || "call",
    };

    // 11. Write to Sheets & Telegram in parallel via Promise.allSettled (8s timeout)
    const [sheetResult, telegramResult] = await Promise.allSettled([
      appendOrderRowWithRetry(config.sheetId, buildSheetRow(sheetRecord)),
      sendTelegramOrderMessage(config.telegramChatId, telegramOrderPayload, phoneLimit.repeatPhoneFlag),
    ]);

    const isSheetSuccess = sheetResult.status === "fulfilled";
    const isTelegramSuccess = telegramResult.status === "fulfilled";

    const updatedRowRef = isSheetSuccess ? sheetResult.value.updatedRange : "";
    const telegramMessageId = isTelegramSuccess ? telegramResult.value.messageId : undefined;

    // Dual failure: Release idempotency key and return 502
    if (!isSheetSuccess && !isTelegramSuccess) {
      await releaseIdempotencyKey(payload.idempotencyKey, redis);
      const sheetErr = sheetResult.reason?.message || "Sheets failed";
      const tgErr = telegramResult.reason?.message || "Telegram failed";

      logger.error("Dual destination failure", {
        orderNumber,
        sheetError: sheetErr,
        telegramError: tgErr,
      });

      const adminChatId = getAdminChatId();
      if (adminChatId) {
        let adminText =
          `🚨 <b>CRITICAL: Both Primary Channels Failed</b>\n` +
          `• <b>Slug:</b> <code>${escapeTelegramHtml(payload.slug)}</code>\n` +
          `• <b>Order:</b> <code>${escapeTelegramHtml(orderNumber)}</code>\n` +
          `• <b>Failed Channel(s):</b> sheets, telegram\n` +
          `• <b>Sheets Error:</b> <code>${escapeTelegramHtml(sheetErr)}</code>\n` +
          `• <b>Telegram Error:</b> <code>${escapeTelegramHtml(tgErr)}</code>\n` +
          `• <b>Time:</b> ${escapeTelegramHtml(createdAtDhakaIso)}`;

        if (adminText.length > 3500) {
          adminText = adminText.slice(0, 3490) + "...[truncated]";
        }

        try {
          const alertRes = await sendAdminTelegramAlert(adminChatId, adminText);
          if (!alertRes.ok) {
            logger.error("Failed to send critical dual-failure admin alert", {
              error: alertRes.description,
              orderNumber,
            });
          }
        } catch (alertErr) {
          logger.error("Error dispatching critical dual-failure admin alert", {
            error: alertErr as Error,
            orderNumber,
          });
        }
      }

      return NextResponse.json(
        {
          ok: false,
          error: payload.lang === "bn"
            ? "অর্ডার প্রসেস করতে সাময়িক সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।"
            : "Failed to process order. Please try again.",
        },
        { status: 502 }
      );
    }

    // At least one succeeded: Store order metadata and dead-letter queue any partial failure
    await storeOrderMeta(
      orderNumber,
      {
        slug: payload.slug,
        rowRef: updatedRowRef,
        status: "new",
        telegramChatId: config.telegramChatId,
        telegramMessageId,
        phone: phoneRes.normalized,
        sheetSynced: isSheetSuccess,
      },
      redis
    );

    const failedChannels: string[] = [];
    if (!isSheetSuccess) failedChannels.push("sheets");
    if (!isTelegramSuccess) failedChannels.push("telegram");

    if (failedChannels.length > 0) {
      const errSummary = failedChannels
        .map((ch) => {
          if (ch === "sheets") return `Sheets: ${(sheetResult as PromiseRejectedResult).reason?.message}`;
          if (ch === "telegram") return `Telegram: ${(telegramResult as PromiseRejectedResult).reason?.message}`;
          return `${ch} failure`;
        })
        .join("; ");

      await pushDeadLetterOrder(
        payload.slug,
        {
          type: "order_create",
          slug: payload.slug,
          orderNumber,
          failedChannels,
          errorSummary: String(errSummary || "Unknown partial channel failure"),
          failedAtIso: createdAtDhakaIso,
          orderRecord: sheetRecord,
        },
        redis
      );

      const adminChatId = getAdminChatId();
      if (adminChatId) {
        let adminText =
          `⚠️ <b>ADMIN ALERT: Channel Failure</b>\n` +
          `• <b>Slug:</b> <code>${escapeTelegramHtml(payload.slug)}</code>\n` +
          `• <b>Order:</b> <code>${escapeTelegramHtml(orderNumber)}</code>\n` +
          `• <b>Failed Channel(s):</b> ${escapeTelegramHtml(failedChannels.join(", "))}\n` +
          `• <b>Error:</b> <code>${escapeTelegramHtml(String(errSummary || "Unknown"))}</code>\n` +
          `• <b>Time:</b> ${escapeTelegramHtml(createdAtDhakaIso)}`;

        if (adminText.length > 3500) {
          adminText = adminText.slice(0, 3490) + "...[truncated]";
        }

        try {
          const alertRes = await sendAdminTelegramAlert(adminChatId, adminText);
          if (!alertRes.ok) {
            logger.error("Failed to send channel failure admin alert", {
              error: alertRes.description,
              orderNumber,
            });
          }
        } catch (alertErr) {
          logger.error("Error dispatching channel failure admin alert", {
            error: alertErr as Error,
            orderNumber,
          });
        }
      }

      logger.warn("Order partially delivered; dead-letter queued", {
        orderNumber,
        failedChannels,
      });
    }

    const orderSummary = {
      orderNumber,
      productTitle,
      color: colorName,
      size: sizeName,
      quantity,
      unitPrice,
      deliveryFee,
      total: codTotal,
      name: payload.name,
      phone: phoneRes.normalized,
      address: payload.address,
      district: payload.district,
      confirmationMode: config.confirmationMode || "call",
      status: "new",
      createdAtIso: createdAtDhakaIso,
    };

    // Finalize idempotency key
    await finalizeIdempotencyKey(
      payload.idempotencyKey,
      {
        status: "completed",
        orderNumber,
        eventId: orderNumber,
        summary: orderSummary,
      },
      redis
    );

    // Save content-based dedupe record (10-minute TTL = 600s)
    await redis.set(
      cartDedupeKey,
      {
        orderNumber,
        summary: orderSummary,
      },
      { ex: 600 }
    );

    logger.info("Order created successfully", {
      orderNumber,
      slug: payload.slug,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      ok: true,
      orderNumber,
      eventId: orderNumber,
      summary: orderSummary,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Unhandled error in POST /api/order", { error: err });

    const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
    if (adminChatId) {
      let adminText =
        `🚨 <b>CRITICAL: Unhandled Order Route Failure</b>\n` +
        `• <b>Error:</b> <code>${escapeTelegramHtml(err?.message || "Unknown error")}</code>\n` +
        `• <b>Failed Channel(s):</b> server/redis`;

      if (adminText.length > 3500) {
        adminText = adminText.slice(0, 3490) + "...[truncated]";
      }

      try {
        const alertRes = await sendAdminTelegramAlert(adminChatId, adminText);
        if (!alertRes.ok) {
          logger.error("Failed to send unhandled error admin alert", {
            error: alertRes.description,
          });
        }
      } catch (alertErr) {
        logger.error("Error dispatching unhandled error admin alert", {
          error: alertErr as Error,
        });
      }
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
