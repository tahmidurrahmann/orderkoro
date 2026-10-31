import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { getClientBySlug } from "@/lib/clients";
import { DISTRICT_IDS } from "@/lib/districts";
import { calculateOrderTotals, resolveDeliveryQuote, DhakaAreaChoice } from "@/lib/delivery";
import { validateBdPhone } from "@/lib/phone";
import {
  checkIpRateLimit,
  checkPhoneRateLimit,
  generateOrderNumber,
  getDhakaDateTime,
  getPhoneStats,
  saveOrderBackup,
  type OrderRecord,
} from "@/lib/redis";
import { appendOrderToGoogleSheet } from "@/lib/google-sheets";
import {
  formatTelegramOrderMessage,
  getStatusInlineButtons,
  sendTelegramMessage,
} from "@/lib/telegram";
import { resolveLocalizedText } from "@/lib/i18n";
import { toLatinDigits } from "@/lib/format";

const OrderInputSchema = z.object({
  slug: z.string({ error: "Client slug is required" }).min(1),
  name: z
    .string({ error: "Customer name is required" })
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(80, { error: "Name cannot exceed 80 characters" }),
  phone: z.string({ error: "Phone number is required" }).min(1),
  district: z.string({ error: "District is required" }).min(1),
  zoneId: z.string({ error: "Zone ID is required" }).min(1),
  dhakaArea: z.enum(["city", "suburb"]).optional(),
  address: z
    .string({ error: "Address is required" })
    .trim()
    .min(10, { error: "Address must be at least 10 characters" })
    .max(300, { error: "Address cannot exceed 300 characters" }),
  size: z.string({ error: "Size selection is required" }).min(1),
  color: z.string({ error: "Color selection is required" }).min(1),
  quantity: z
    .number({ error: "Quantity is required" })
    .int()
    .min(1, { error: "Quantity must be at least 1" })
    .max(5, { error: "Quantity cannot exceed 5" }),
  note: z.string().max(200, { error: "Note cannot exceed 200 characters" }).optional().default(""),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  fbclid: z.string().optional(),
  eventId: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  website: z.string().optional(), // Honeypot field
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

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const parseResult = OrderInputSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          ok: false,
          error: firstIssue.message,
          field: firstIssue.path.join("."),
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // 1. Honeypot check: If the hidden honeypot field is filled, silently return a realistic fake success
    if (input.website && input.website.trim().length > 0) {
      console.warn("[Order API] Honeypot triggered. Silently ignoring bot order submission.");
      return NextResponse.json({
        ok: true,
        orderNumber: `BOT-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: {
          orderNumber: `BOT-${Math.floor(100000 + Math.random() * 900000)}`,
          productTitle: "Product",
          size: input.size,
          color: input.color,
          quantity: input.quantity,
          subtotal: 0,
          deliveryCharge: 0,
          total: 0,
          currency: "BDT",
          confirmationMode: "call",
        },
      });
    }

    // 2. Resolve Client Config
    const client = getClientBySlug(input.slug);
    if (!client) {
      return NextResponse.json(
        { ok: false, error: `Store with slug "${input.slug}" not found` },
        { status: 404 }
      );
    }

    // Check if product is sold out
    if (client.soldOut) {
      return NextResponse.json(
        {
          ok: false,
          error: "দুঃখিত, এই পণ্যটি স্টক আউট হয়ে গেছে। (Product is currently sold out)",
        },
        { status: 400 }
      );
    }

    // 3. Phone validation and normalization
    const phoneCheck = validateBdPhone(input.phone);
    if (!phoneCheck.valid) {
      return NextResponse.json(
        {
          ok: false,
          field: "phone",
          error: "সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)",
        },
        { status: 400 }
      );
    }
    const normalizedPhone = phoneCheck.normalized;

    // 4. District validation against 64 districts
    if (!DISTRICT_IDS.has(input.district)) {
      return NextResponse.json(
        {
          ok: false,
          field: "district",
          error: `অবৈধ জেলা নির্বাচন ("${input.district}")। তালিকা থেকে সঠিক জেলা বেছে নিন।`,
        },
        { status: 400 }
      );
    }

    // 5. Size validation (must exist and available === true, tolerant to Bangla/Latin digits)
    const targetSizeNormalized = toLatinDigits(input.size.trim().toLowerCase());
    const matchingSize = client.sizes.find(
      (s) =>
        s.name.trim().toLowerCase() === input.size.trim().toLowerCase() ||
        toLatinDigits(s.name.trim().toLowerCase()) === targetSizeNormalized
    );
    if (!matchingSize) {
      return NextResponse.json(
        {
          ok: false,
          field: "size",
          error: `নির্বাচিত সাইজটি ("${input.size}") বিদ্যমান নেই।`,
        },
        { status: 400 }
      );
    }
    if (!matchingSize.available) {
      return NextResponse.json(
        {
          ok: false,
          field: "size",
          error: `দুঃখিত, "${input.size}" সাইজটি স্টক আউট হয়ে গেছে। অন্য সাইজ বেছে নিন।`,
        },
        { status: 400 }
      );
    }

    // 6. Color validation (must exist in client.colors)
    const activeLang = client.language.default;
    const targetColor = input.color.trim().toLowerCase();
    const matchingColor = client.colors.find((c) => {
      const bnName = typeof c.name === "string" ? c.name : c.name.bn;
      const enName = typeof c.name === "string" ? c.name : c.name.en;
      return (
        bnName.toLowerCase() === targetColor ||
        enName.toLowerCase() === targetColor ||
        c.id?.toLowerCase() === targetColor ||
        c.hex.toLowerCase() === targetColor ||
        bnName.toLowerCase().includes(targetColor) ||
        targetColor.includes(bnName.toLowerCase()) ||
        enName.toLowerCase().includes(targetColor) ||
        targetColor.includes(enName.toLowerCase())
      );
    });

    if (!matchingColor) {
      return NextResponse.json(
        {
          ok: false,
          field: "color",
          error: `নির্বাচিত রঙটি ("${input.color}") বিদ্যমান নেই।`,
        },
        { status: 400 }
      );
    }

    // 7. Quantity check
    const maxQty = client.maxQuantity ?? 5;
    if (input.quantity < 1 || input.quantity > maxQty) {
      return NextResponse.json(
        {
          ok: false,
          field: "quantity",
          error: `সর্বোচ্চ ${maxQty} টি পণ্য একসাথে অর্ডার করা যাবে।`,
        },
        { status: 400 }
      );
    }

    // 8. IP Rate Limiting (5 orders per 10 mins)
    const clientIp = getClientIp(req);
    const ipCheck = await checkIpRateLimit(clientIp, 5, 600);
    if (!ipCheck.allowed) {
      console.warn(`[Order API] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        {
          ok: false,
          error: "অতিরিক্ত অনুরোধ লক্ষ্য করা গেছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
        },
        { status: 429 }
      );
    }

    // 9. Phone Rate Limiting (Max 3 orders in 24 hours)
    const phoneCheckResult = await checkPhoneRateLimit(normalizedPhone, 3, 86400);
    if (!phoneCheckResult.allowed) {
      console.warn(`[Order API] Phone 24h limit reached for: ${normalizedPhone}`);
      return NextResponse.json(
        {
          ok: false,
          error:
            "আপনার এই নম্বর দিয়ে ইতিমধ্যে একাধিক অর্ডার গ্রহণ করা হয়েছে। নতুন অর্ডারের জন্য সরাসরি আমাদের কল করুন বা মেসেঞ্জারে জানান।",
        },
        { status: 429 }
      );
    }

    // 10. Recompute Server-Side Prices (NEVER trust client amounts)
    const dhakaArea: DhakaAreaChoice = input.dhakaArea === "suburb" ? "suburb" : "city";
    const totals = calculateOrderTotals(client, input.quantity, input.district, dhakaArea);
    const deliveryQuote = resolveDeliveryQuote(client, input.district, dhakaArea, totals.subtotal);

    if (!deliveryQuote) {
      return NextResponse.json(
        {
          ok: false,
          field: "district",
          error: "ডেলিভারি চার্জ নির্ধারণে সমস্যা হয়েছে। অনুগ্রহ করে জেলা পুনঃনির্বাচন করুন।",
        },
        { status: 400 }
      );
    }

    const unitPrice = client.product.price;
    const subtotal = totals.subtotal;
    const deliveryCharge = deliveryQuote.effectiveCharge;
    const total = subtotal + deliveryCharge;

    // 11. Generate Atomic Order Number (e.g. BNN-261101-0001)
    const orderNumber = await generateOrderNumber(client.orderPrefix);
    const { dhakaFormatted, iso } = getDhakaDateTime();

    // 12. Evaluate Flags
    const flags: string[] = [];
    if (phoneCheckResult.isRepeat) {
      flags.push(`পুনরাবৃত্তি ফোন (২৪ ঘণ্টায় ${phoneCheckResult.count} নং অর্ডার)`);
    }

    const highValueThreshold = client.highValueThreshold ?? 3000;
    if (total >= highValueThreshold) {
      flags.push(`উচ্চ মূল্যের অর্ডার (>৳${highValueThreshold})`);
    }

    const phoneStats = await getPhoneStats(normalizedPhone);
    if (phoneStats.returned > 0) {
      flags.push(`⚠️ পূর্ববর্তী রিটার্ন: ${phoneStats.returned} টি`);
    }
    if (phoneStats.delivered > 0) {
      flags.push(`পূর্ববর্তী সফল ডেলিভারি: ${phoneStats.delivered} টি`);
    }

    const zoneLabelResolved = resolveLocalizedText(deliveryQuote.label, activeLang);
    if (deliveryQuote.zoneId.toLowerCase().includes("outside")) {
      flags.push("ঢাকার বাইরে (দূরবর্তী জোন)");
    }

    // Read cookies if not explicitly sent in body
    const fbp = input.fbp || req.cookies.get("_fbp")?.value || "";
    const fbc = input.fbc || req.cookies.get("_fbc")?.value || "";

    const productTitleResolved = resolveLocalizedText(client.product.title, activeLang);
    const colorResolved = resolveLocalizedText(matchingColor.name, activeLang);

    // 13. Persistence Step 1: Save full order JSON in Redis (30-day expiry as backup)
    const orderRecord: OrderRecord = {
      orderNumber,
      slug: client.slug,
      orderPrefix: client.orderPrefix,
      createdAtDhaka: dhakaFormatted,
      createdAtIso: iso,
      name: input.name,
      phone: normalizedPhone,
      district: input.district,
      zoneId: deliveryQuote.zoneId,
      zoneLabel: zoneLabelResolved,
      address: input.address,
      productTitle: productTitleResolved,
      size: input.size,
      color: colorResolved,
      quantity: input.quantity,
      unitPrice,
      subtotal,
      deliveryCharge,
      total,
      note: input.note || "",
      status: "new",
      flags,
      utm: {
        source: input.utm_source,
        medium: input.utm_medium,
        campaign: input.utm_campaign,
        content: input.utm_content,
      },
      fbclid: input.fbclid,
      eventId: input.eventId,
      fbp,
      fbc,
      sheetSaved: false,
      telegramNotified: false,
    };

    let sheetSaved = false;
    let telegramNotified = false;

    try {
      await saveOrderBackup(orderRecord);
    } catch (redisErr) {
      console.error("[Order API] Redis order backup failed:", redisErr);
    }

    // 14. Persistence Step 2: Append row to client's Google Sheet
    try {
      await appendOrderToGoogleSheet({
        sheetId: client.sheetId,
        orderNumber,
        dhakaTime: dhakaFormatted,
        name: input.name,
        phone: normalizedPhone,
        district: input.district,
        zone: zoneLabelResolved,
        address: input.address,
        product: productTitleResolved,
        size: input.size,
        color: colorResolved,
        qty: input.quantity,
        subtotal,
        delivery: deliveryCharge,
        total,
        note: input.note || "",
        status: "new",
        flags: flags.join("; "),
        utmSource: input.utm_source,
        utmMedium: input.utm_medium,
        utmCampaign: input.utm_campaign,
        utmContent: input.utm_content,
        fbclid: input.fbclid,
        eventId: input.eventId,
        fbp,
        fbc,
      });
      sheetSaved = true;
      orderRecord.sheetSaved = true;
    } catch (sheetErr) {
      console.error(`[Order API] Google Sheet append failed for order ${orderNumber}:`, sheetErr);
      sheetSaved = false;
    }

    // 15. Persistence Step 3: Send Telegram notification with interactive buttons
    try {
      const brandName = resolveLocalizedText(client.brand.name, activeLang);
      const telegramText = formatTelegramOrderMessage({
        orderNumber,
        brandName,
        customerName: input.name,
        phone: normalizedPhone,
        address: input.address,
        district: input.district,
        zoneLabel: zoneLabelResolved,
        productTitle: productTitleResolved,
        size: input.size,
        color: colorResolved,
        quantity: input.quantity,
        subtotal,
        deliveryCharge,
        total,
        note: input.note,
        flags,
        dhakaTime: dhakaFormatted,
        sheetSaved,
        status: "new",
      });

      const buttons = getStatusInlineButtons("new", orderNumber);
      const tgRes = await sendTelegramMessage(client.telegramChatId, telegramText, {
        inline_keyboard: buttons,
      });

      telegramNotified = tgRes.ok;
      orderRecord.telegramNotified = tgRes.ok;
    } catch (tgErr) {
      console.error(`[Order API] Telegram notification failed for order ${orderNumber}:`, tgErr);
    }

    // Update Redis backup with final dispatch states
    try {
      await saveOrderBackup(orderRecord);
    } catch {
      // Best effort update
    }

    // 16. Return Safe Summary for Front-End Session Storage
    return NextResponse.json({
      ok: true,
      orderNumber,
      summary: {
        orderNumber,
        productTitle: productTitleResolved,
        size: input.size,
        color: colorResolved,
        quantity: input.quantity,
        subtotal,
        deliveryCharge,
        total,
        currency: "BDT",
        confirmationMode: client.confirmationMode,
        eventId: input.eventId,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Order API] Unexpected server error:", errorMsg);
    return NextResponse.json(
      {
        ok: false,
        error: "অর্ডার প্রক্রিয়াকরণে অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
      },
      { status: 500 }
    );
  }
}
