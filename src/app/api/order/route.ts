import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClientConfig } from "@/lib/server/clients";
import { logger } from "@/lib/server/logger";
import { validateBdPhone } from "@/lib/phone";
import { getEnabledPaymentMethods } from "@/lib/payments";
import { verifyAndRecomputeOrderOnServer } from "@/lib/delivery";
import {
  acquireIdempotencyKey,
  checkDemoGlobalRateLimit,
  checkDemoIpRateLimit,
  checkIpRateLimit,
  checkPhoneRateLimit,
  computeCartDedupeHash,
  computeOrderPayloadHash,
  finalizeIdempotencyKey,
  generateOrderToken,
  getIdempotencyRecord,
  getRedisDriver,
  nextOrderNumber,
  pushDeadLetterOrder,
  releaseIdempotencyKey,
  releaseIdempotencyLock,
  releaseTrxId,
  reserveTrxId,
  storeOrderMeta,
  storeOrderToken,
  updatePendingIdempotencyKey,
  type PendingIdempotencyRecord,
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
  paymentMethod: z.enum(["cod", "bkash", "nagad", "rocket"]).optional().default("cod"),
  transactionId: z.string().max(60, { error: "Transaction ID cannot exceed 60 characters" }).optional(),
  paidFrom: z.string().optional(),
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

    // 5c. Draft Store Control: Reject orders if store is in draft status
    if (config.status === "draft") {
      const isBn = payload.lang === "bn";
      return NextResponse.json(
        {
          ok: false,
          error: isBn
            ? "এই স্টোরটি এখনও ড্রাফট অবস্থায় রয়েছে। কোনো অর্ডার গ্রহণ করা সম্ভব নয়।"
            : "This store is currently in draft mode. Orders are not accepted.",
          code: "STORE_DRAFT",
        },
        { status: 403 }
      );
    }

    // 5d. Payment Method Check: Verify selected payment method is enabled for this store
    const enabledMethods = getEnabledPaymentMethods(config);
    const isMethodAllowed = enabledMethods.some((m) => m.id === payload.paymentMethod);
    if (!isMethodAllowed) {
      return NextResponse.json(
        {
          ok: false,
          error: payload.lang === "bn"
            ? `পেমেন্ট মাধ্যম "${payload.paymentMethod}" এই স্টোরের জন্য অনুমোদিত নয়।`
            : `Payment method "${payload.paymentMethod}" is not enabled for this store.`,
          code: "PAYMENT_METHOD_NOT_ENABLED",
        },
        { status: 400 }
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

    // 8. Canonical Payload Hash & Atomic Idempotency Claim (60s TTL)
    const payloadHash = computeOrderPayloadHash({
      slug: payload.slug,
      name: payload.name,
      phone: phoneRes.normalized,
      address: payload.address,
      district: payload.district,
      zone: payload.zone,
      color: payload.color,
      size: payload.size,
      quantity: payload.quantity,
      paymentMethod: payload.paymentMethod,
      transactionId: payload.transactionId,
      paidFrom: payload.paidFrom,
      note: payload.note,
    });

    const generatedToken = generateOrderToken();

    const initialPending: PendingIdempotencyRecord = {
      status: "pending",
      payloadHash,
      token: generatedToken,
      createdAt: Date.now(),
    };

    const idempotency = await acquireIdempotencyKey(
      payload.idempotencyKey,
      initialPending,
      60,
      redis
    );

    if (!idempotency.acquired) {
      const existing = idempotency.existing || (await getIdempotencyRecord(payload.idempotencyKey, redis));

      // Same key with different payload hash: return 422
      if (existing?.payloadHash && existing.payloadHash !== payloadHash) {
        return NextResponse.json(
          {
            ok: false,
            error: payload.lang === "bn"
              ? "এই আইডেমপোটেন্সি কি দিয়ে পূর্বেই ভিন্ন তথ্যের অর্ডার প্রসেস করা হয়েছে।"
              : "Idempotency key payload mismatch",
            code: "IDEMPOTENCY_PAYLOAD_MISMATCH",
          },
          { status: 422 }
        );
      }

      // Not claimed and completed: return stored result
      if (existing?.status === "completed") {
        logger.info("Idempotent completed hit", {
          idempotencyKey: payload.idempotencyKey,
          orderNumber: existing.orderNumber,
        });
        const completedToken = existing.token || (existing.summary as Record<string, unknown> | undefined)?.token;
        return NextResponse.json({
          ok: true,
          orderNumber: existing.orderNumber,
          eventId: existing.eventId || existing.orderNumber,
          token: completedToken,
          summary: existing.summary || {
            orderNumber: existing.orderNumber,
            token: completedToken,
            productTitle,
            color: colorName,
            size: sizeName,
            quantity,
            total: codTotal,
          },
        });
      }

      // Not claimed and pending: poll every 300 ms for up to 8 s
      if (existing?.status === "pending") {
        const pollStart = Date.now();
        while (Date.now() - pollStart < 8000) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const currentRecord = await getIdempotencyRecord(payload.idempotencyKey, redis);
          if (currentRecord?.status === "completed") {
            const currentToken = currentRecord.token || (currentRecord.summary as Record<string, unknown> | undefined)?.token;
            return NextResponse.json({
              ok: true,
              orderNumber: currentRecord.orderNumber,
              eventId: currentRecord.eventId || currentRecord.orderNumber,
              token: currentToken,
              summary: currentRecord.summary,
            });
          }
        }

        // 8s elapsed and still pending: return 409 retryable
        return NextResponse.json(
          {
            ok: false,
            retryable: true,
            error: payload.lang === "bn"
              ? "অর্ডারটি প্রসেস হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করে পুনরায় চেষ্টা করুন।"
              : "Order is processing. Please wait and retry.",
            code: "CONCURRENT_ORDER_PROCESSING",
          },
          { status: 409 }
        );
      }
    }

    let normalizedTrxId: string | undefined;
    let paidFromPhone: string | undefined;
    let trxReservedInThisClaim = false;

    try {
      // 8b. Mobile Payment Validation & Redis TrxID Reservation (180d TTL)
      if (payload.paymentMethod !== "cod") {
        const rawTrx = (payload.transactionId || "").trim().toUpperCase();
        if (!rawTrx || !/^[A-Z0-9]{6,20}$/.test(rawTrx)) {
          return NextResponse.json(
            {
              ok: false,
              error: payload.lang === "bn"
                ? "সঠিক ট্রানজেকশন আইডি (TrxID) লিখুন (৬-২০ অক্ষর বা সংখ্যা)"
                : "Please enter a valid Transaction ID (TrxID) containing 6 to 20 alphanumeric characters",
              field: "transactionId",
              fieldErrors: { transactionId: "Invalid Transaction ID" },
            },
            { status: 400 }
          );
        }
        normalizedTrxId = rawTrx;

        const paidFromCheck = validateBdPhone(payload.paidFrom || "");
        if (!paidFromCheck.valid) {
          return NextResponse.json(
            {
              ok: false,
              error: payload.lang === "bn"
                ? "টাকা পাঠানোর সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)"
                : "Please enter a valid 11-digit mobile number from which payment was sent",
              field: "paidFrom",
              fieldErrors: { paidFrom: "Invalid mobile number" },
            },
            { status: 400 }
          );
        }
        paidFromPhone = paidFromCheck.normalized;

        const reserved = await reserveTrxId(
          payload.slug,
          normalizedTrxId,
          15552000,
          payload.idempotencyKey,
          redis
        );
        if (!reserved) {
          return NextResponse.json(
            {
              ok: false,
              error: payload.lang === "bn"
                ? "এই ট্রানজেকশন আইডি (TrxID) দিয়ে ইতোমধ্যে একটি অর্ডার সম্পন্ন করা হয়েছে। সঠিক TrxID লিখুন।"
                : "This Transaction ID (TrxID) has already been used for an order. Please enter a valid unique TrxID.",
              field: "transactionId",
              fieldErrors: { transactionId: "Duplicate Transaction ID" },
              code: "DUPLICATE_TRX_ID",
            },
            { status: 400 }
          );
        }
        trxReservedInThisClaim = true;
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

      // 10. Rate Limiting: Demo Mode (5/hr per IP, 60/hr global) vs Real Store (5/10m IP, 3/24h Phone)
      const isDemo = Boolean(config.demoMode);
      let repeatPhoneFlag = false;

      if (isDemo) {
        const [demoIpLimit, demoGlobalLimit] = await Promise.all([
          checkDemoIpRateLimit(clientIp, redis),
          checkDemoGlobalRateLimit(redis),
        ]);
        if (!demoIpLimit.allowed || !demoGlobalLimit.allowed) {
          logger.warn("Demo order rate limit exceeded", {
            clientIp,
            ipCount: demoIpLimit.count,
            globalCount: demoGlobalLimit.count,
          });
          return NextResponse.json(
            {
              ok: false,
              error: "ডেমো এখন ব্যস্ত, একটু পরে চেষ্টা করুন",
            },
            { status: 429 }
          );
        }
      } else {
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
        repeatPhoneFlag = phoneLimit.repeatPhoneFlag;
      }

      // 10b. Order Number Allocation: Reuse from pending record on crash retry, or allocate once
      const existingPending = idempotency.existing?.status === "pending" ? idempotency.existing : undefined;
      const orderToken = existingPending?.token || generatedToken;
      let orderNumber = existingPending?.orderNumber;
      if (!orderNumber) {
        orderNumber = await nextOrderNumber(payload.slug, config.orderPrefix, redis);
        await updatePendingIdempotencyKey(
          payload.idempotencyKey,
          { orderNumber, token: orderToken },
          redis
        );
      }
      const createdAtDhakaIso = getDhakaIsoTime();

      const sheetRecord: OrderRecordForSheet = {
        orderNumber,
        createdAtDhakaIso,
        status: "new",
        name: payload.name,
        phone: isDemo ? "01XXX-XXX***" : phoneRes.normalized,
        address: isDemo ? "***" : payload.address,
        district: payload.district,
        zone: payload.zone,
        productTitle,
        color: colorName,
        size: sizeName,
        quantity,
        unitPrice,
        deliveryFee,
        codTotal,
        note: (() => {
          let n = payload.note ? payload.note.trim() : "";
          if (payload.paymentMethod && payload.paymentMethod !== "cod") {
            n = `${n ? n + " " : ""}[Payment: ${payload.paymentMethod.toUpperCase()}]`;
          }
          if (payload.transactionId) {
            n = `${n ? n + " " : ""}[TrxID: ${payload.transactionId}]`;
          }
          return n;
        })(),
        confirmationMode: config.confirmationMode || "call",
        attribution: payload.attribution,
        paymentMethod: payload.paymentMethod,
        paymentStatus: (payload.paymentMethod === "cod" ? "COD" : "Unverified") as "COD" | "Unverified",
        trxId: normalizedTrxId,
        paidFrom: isDemo && paidFromPhone ? "01XXX-XXX***" : paidFromPhone,
      };

      const sellerLang = config.language.default || "bn";
      const matchedZone =
        config.delivery.zones.find((z) => z.id === payload.zone) ||
        config.delivery.zones.find((z) => z.id === config.delivery.defaultZoneId) ||
        config.delivery.zones[0];
      const zoneLabel = matchedZone
        ? resolveLocalizedText(matchedZone.label, sellerLang)
        : payload.zone;

      const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const statusUrl = `${origin}/${payload.slug}/order/${orderToken}`;

      const telegramOrderPayload: TelegramOrderPayload = {
        orderNumber,
        createdAtDhakaIso,
        status: "new",
        name: payload.name,
        phone: isDemo ? "01XXX-XXX***" : phoneRes.normalized,
        address: isDemo ? "***" : payload.address,
        district: payload.district,
        zone: zoneLabel,
        zoneLabel: zoneLabel,
        productTitle,
        color: colorName,
        size: sizeName,
        quantity,
        unitPrice,
        deliveryFee,
        codTotal,
        paymentMethod: payload.paymentMethod,
        paymentStatus: (payload.paymentMethod === "cod" ? "COD" : "Unverified") as "COD" | "Unverified",
        transactionId: normalizedTrxId,
        paidFrom: isDemo && paidFromPhone ? "01XXX-XXX***" : paidFromPhone,
        note: payload.note,
        confirmationMode: config.confirmationMode || "call",
        statusUrl: isDemo ? undefined : statusUrl,
        isDemo,
      };

      // 11. External Channels with Step Skipping on Retries
      const alreadySheetDone = Boolean(existingPending?.sheetDone);
      const alreadyTelegramDone = Boolean(existingPending?.telegramDone);

      const sheetPromise = alreadySheetDone
        ? Promise.resolve({ updatedRange: existingPending?.rowRef || "Sheet1!A2:AC2" })
        : appendOrderRowWithRetry(config.sheetId, buildSheetRow(sheetRecord));

      const telegramPromise = alreadyTelegramDone
        ? Promise.resolve({ messageId: existingPending?.telegramMessageId || 0 })
        : sendTelegramOrderMessage(
            config.telegramChatId,
            telegramOrderPayload,
            repeatPhoneFlag,
            config.delivery.zones,
            sellerLang
          );

      const [sheetResult, telegramResult] = await Promise.allSettled([
        sheetPromise,
        telegramPromise,
      ]);

      const isSheetSuccess = sheetResult.status === "fulfilled";
      const isTelegramSuccess = telegramResult.status === "fulfilled";

      const updatedRowRef = isSheetSuccess ? (sheetResult.value as { updatedRange: string }).updatedRange : "";
      const telegramMessageId = isTelegramSuccess ? (telegramResult.value as { messageId?: number }).messageId : undefined;

      if (!alreadySheetDone && isSheetSuccess) {
        await updatePendingIdempotencyKey(
          payload.idempotencyKey,
          { sheetDone: true, rowRef: updatedRowRef },
          redis
        );
      }

      if (!alreadyTelegramDone && isTelegramSuccess) {
        await updatePendingIdempotencyKey(
          payload.idempotencyKey,
          { telegramDone: true, telegramMessageId },
          redis
        );
      }

      // Dual failure: Release idempotency key, release TrxID, and return 502
      if (!isSheetSuccess && !isTelegramSuccess) {
        await releaseIdempotencyKey(payload.idempotencyKey, redis);
        if (normalizedTrxId) {
          await releaseTrxId(payload.slug, normalizedTrxId, redis);
        }
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
          orderNumber,
          token: orderToken,
          rowRef: updatedRowRef,
          status: "new",
          customerConfirmed: false,
          telegramChatId: config.telegramChatId,
          telegramMessageId,
          phone: isDemo ? "01XXX-XXX***" : phoneRes.normalized,
          address: isDemo ? "***" : payload.address,
          sheetSynced: isSheetSuccess,
          paymentMethod: payload.paymentMethod,
          paymentStatus: payload.paymentMethod === "cod" ? "COD" : "Unverified",
          trxId: normalizedTrxId,
          paidFrom: isDemo && paidFromPhone ? "01XXX-XXX***" : paidFromPhone,
          productTitle,
          color: colorName,
          size: sizeName,
          quantity,
          unitPrice,
          deliveryFee,
          total: codTotal,
          district: payload.district,
          zone: payload.zone,
          zoneLabel,
          daysMin: matchedZone?.daysMin ?? 2,
          daysMax: matchedZone?.daysMax ?? 4,
          createdAtDhakaIso,
          repeatPhoneFlag,
          confirmationMode: (config.confirmationMode || "call") as "call" | "tap",
          isDemo,
          sellerTelegramUserId: config.sellerTelegramUserId,
        },
        redis
      );

      // Store ordtoken:<token> -> { slug, orderNumber } with 90-day TTL (24h for demo)
      await storeOrderToken(orderToken, { slug: payload.slug, orderNumber }, redis, isDemo ? 86400 : 7776000);

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
        token: orderToken,
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

      // Finalize idempotency key with 24h TTL
      await finalizeIdempotencyKey(
        payload.idempotencyKey,
        {
          status: "completed",
          payloadHash,
          orderNumber,
          token: orderToken,
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
        token: orderToken,
        summary: orderSummary,
      });
    } catch (innerError) {
      if (normalizedTrxId && trxReservedInThisClaim) {
        await releaseTrxId(payload.slug, normalizedTrxId, redis);
      }
      throw innerError;
    } finally {
      await releaseIdempotencyLock(payload.idempotencyKey, redis);
    }
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
