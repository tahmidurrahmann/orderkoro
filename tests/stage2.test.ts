import { beforeEach, describe, expect, it } from "vitest";
import demoBrandRaw from "../clients/demo-brand.json";
import { ClientConfigSchema } from "../src/lib/config-schema";
import { verifyAndRecomputeOrderOnServer } from "../src/lib/delivery";
import {
  maskPhoneForLog,
  normalizeBdPhone,
  toE164BdPhone,
  validateBdPhone,
} from "../src/lib/phone";
import { toPublicClientConfig } from "../src/lib/server/clients";
import { parseServerEnv } from "../src/lib/server/env";
import {
  acquireIdempotencyKey,
  checkIpRateLimit,
  checkPhoneRateLimit,
  finalizeIdempotencyKey,
  InMemoryRedisDriver,
  nextOrderNumber,
  pushDeadLetterOrder,
  releaseIdempotencyKey,
} from "../src/lib/server/redis";
import {
  buildSheetRow,
  type OrderRecordForSheet,
  SHEET_HEADERS,
  sanitizeSpreadsheetCell,
} from "../src/lib/server/sheet-row";
import { verifyHeaderRowMatch } from "../src/lib/server/sheets";
import {
  buildCallbackData,
  buildStatusInlineKeyboard,
  canTransitionStatus,
  parseCallbackData,
} from "../src/lib/server/status-machine";
import {
  escapeTelegramHtml,
  formatTelegramOrderHtml,
} from "../src/lib/server/telegram";

const demoConfig = ClientConfigSchema.parse(demoBrandRaw);

describe("OrderPage Stage 2 Unit Tests", () => {
  describe("1. Server-only config stripping & environment rules", () => {
    it("strips sheetId, telegramChatId, and highValueThreshold in toPublicClientConfig", () => {
      const pub = toPublicClientConfig(demoConfig) as Record<string, unknown>;
      expect(pub.slug).toBe("demo-brand");
      expect(pub.sheetId).toBeUndefined();
      expect(pub.telegramChatId).toBeUndefined();
      expect(pub.highValueThreshold).toBeUndefined();
    });

    it("throws at startup if MOCK_INTEGRATIONS=1 and NODE_ENV=production", () => {
      expect(() =>
        parseServerEnv({
          NODE_ENV: "production",
          MOCK_INTEGRATIONS: "1",
          NEXT_PUBLIC_SITE_URL: "https://orderpage.example",
        })
      ).toThrow(/MOCK_INTEGRATIONS=1 is forbidden when NODE_ENV=production/);
    });

    it("fails fast listing all missing env var names when MOCK_INTEGRATIONS is not enabled", () => {
      expect(() =>
        parseServerEnv({
          NODE_ENV: "development",
        })
      ).toThrow(
        /Missing required environment variables: NEXT_PUBLIC_SITE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, ADMIN_TELEGRAM_CHAT_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN/
      );
    });
  });

  describe("2. Phone normalization & E.164 conversion", () => {
    it("normalizes Bangla digits, +880, 880, and 01 forms to 01XXXXXXXXX and E.164 8801XXXXXXXXX", () => {
      const p1 = validateBdPhone("০১৭১১-০০২২৩৩");
      expect(p1.valid).toBe(true);
      expect(p1.normalized).toBe("01711002233");
      expect(p1.e164).toBe("8801711002233");

      const p2 = validateBdPhone("+880 1812 345678");
      expect(p2.valid).toBe(true);
      expect(p2.normalized).toBe("01812345678");
      expect(p2.e164).toBe("8801812345678");

      const p3 = validateBdPhone("8801911223344");
      expect(p3.valid).toBe(true);
      expect(p3.normalized).toBe("01911223344");
      expect(p3.e164).toBe("8801911223344");
      expect(toE164BdPhone("01911223344")).toBe("8801911223344");
    });

    it("rejects invalid operator prefixes and wrong lengths", () => {
      expect(validateBdPhone("01112345678").valid).toBe(false);
      expect(validateBdPhone("017110022").valid).toBe(false);
      expect(normalizeBdPhone("০১৫৫৫৬৬৭৭৮৮")).toBe("01555667788");
    });

    it("masks phone numbers for logs without exposing PII", () => {
      expect(maskPhoneForLog("01711002233")).toBe("017****2233");
    });
  });

  describe("3. Price & delivery server-side recomputation", () => {
    it("recomputes unit price, Dhaka City vs Suburb vs Outside Dhaka delivery, and freeDeliveryAbove", () => {
      // 1 unit in Dhaka City: 1490 + 70 = 1560
      const dhakaCity = verifyAndRecomputeOrderOnServer(demoConfig, {
        district: "Dhaka",
        zone: "dhaka-city",
        color: "Deep Indigo",
        size: "L (42)",
        quantity: 1,
      });
      expect(dhakaCity.ok).toBe(true);
      if (dhakaCity.ok) {
        expect(dhakaCity.data.unitPrice).toBe(1490);
        expect(dhakaCity.data.deliveryFee).toBe(70);
        expect(dhakaCity.data.codTotal).toBe(1560);
      }

      // 1 unit in Dhaka Suburb: 1490 + 100 = 1590
      const dhakaSuburb = verifyAndRecomputeOrderOnServer(demoConfig, {
        district: "Dhaka",
        zone: "dhaka-suburb",
        color: "deep-indigo",
        size: "M (40)",
        quantity: 1,
      });
      expect(dhakaSuburb.ok).toBe(true);
      if (dhakaSuburb.ok) {
        expect(dhakaSuburb.data.deliveryFee).toBe(100);
        expect(dhakaSuburb.data.codTotal).toBe(1590);
      }

      // 2 units in Sylhet (subtotal 2980 >= 2800 freeDeliveryAbove): delivery 0, total 2980
      const sylhetFree = verifyAndRecomputeOrderOnServer(demoConfig, {
        district: "Sylhet",
        zone: "outside-dhaka",
        color: "Olive Green",
        size: "XL (44)",
        quantity: 2,
      });
      expect(sylhetFree.ok).toBe(true);
      if (sylhetFree.ok) {
        expect(sylhetFree.data.subtotal).toBe(2980);
        expect(sylhetFree.data.deliveryFee).toBe(0);
        expect(sylhetFree.data.codTotal).toBe(2980);
      }
    });

    it("rejects unavailable sizes, nonexistent colors, and mismatched district-zone pairs", () => {
      const badSize = verifyAndRecomputeOrderOnServer(demoConfig, {
        district: "Dhaka",
        zone: "dhaka-city",
        color: "Deep Indigo",
        size: "XXL (46)", // available: false
        quantity: 1,
      });
      expect(badSize.ok).toBe(false);
      if (!badSize.ok) {
        expect(badSize.fieldErrors.size).toBeDefined();
      }

      const badZoneForDistrict = verifyAndRecomputeOrderOnServer(demoConfig, {
        district: "Rajshahi",
        zone: "dhaka-city", // Rajshahi maps to outside-dhaka, not dhaka-city
        color: "Deep Indigo",
        size: "M (40)",
        quantity: 1,
      });
      expect(badZoneForDistrict.ok).toBe(false);
      if (!badZoneForDistrict.ok) {
        expect(badZoneForDistrict.fieldErrors.zone).toBeDefined();
      }
    });
  });

  describe("4. Formula-injection guard & 25-column Sheet row builder", () => {
    it("prefixes cells starting with =, +, -, @ (including leading whitespace) with an apostrophe", () => {
      expect(sanitizeSpreadsheetCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeSpreadsheetCell("+8801711002233")).toBe("'+8801711002233");
      expect(sanitizeSpreadsheetCell("-100+200")).toBe("'-100+200");
      expect(sanitizeSpreadsheetCell("@import")).toBe("'@import");
      expect(sanitizeSpreadsheetCell("  =CMD|' /C calc'!A0")).toBe(
        "'  =CMD|' /C calc'!A0"
      );
      expect(sanitizeSpreadsheetCell("House 12, Road 5")).toBe("House 12, Road 5");
    });

    it("builds the exact 29-column row in order and preserves leading 0 on phone", () => {
      expect(SHEET_HEADERS).toHaveLength(29);
      const record: OrderRecordForSheet = {
        orderNumber: "BNN-0001",
        createdAtDhakaIso: "2026-11-01T13:05:00+06:00",
        status: "new",
        name: "=EvilName",
        phone: "01711002233",
        address: "House 14, Road 7, Dhanmondi",
        district: "Dhaka",
        zone: "dhaka-city",
        productTitle: "Premium Cotton Panjabi",
        color: "Deep Indigo",
        size: "L (42)",
        quantity: 2,
        unitPrice: 1490,
        deliveryFee: 0,
        codTotal: 2980,
        note: "@urgent",
        confirmationMode: "call",
        attribution: {
          utm_source: "facebook",
          utm_medium: "paid_social",
          utm_campaign: "eid_panjabi",
          utm_content: "video_1",
          utm_term: "menswear",
          fbclid: "IwAR12345",
          _fbp: "fb.1.1700000000.111",
          _fbc: "fb.1.1700000000.IwAR12345",
        },
      };

      const row = buildSheetRow(record);
      expect(row).toHaveLength(29);
      expect(row[0]).toBe("BNN-0001"); // Order No
      expect(row[1]).toBe("2026-11-01T13:05:00+06:00"); // Created At
      expect(row[2]).toBe("new"); // Status
      expect(row[3]).toBe("'=EvilName"); // Name (escaped)
      expect(row[4]).toBe("01711002233"); // Phone (string with leading 0)
      expect(typeof row[4]).toBe("string");
      expect(row[11]).toBe(2); // Qty
      expect(row[12]).toBe(1490); // Unit Price
      expect(row[13]).toBe(0); // Delivery Fee
      expect(row[14]).toBe(2980); // COD Total
      expect(row[15]).toBe("'@urgent"); // Note (escaped)
      expect(row[16]).toBe("call"); // Confirmation Mode
      expect(row[21]).toBe("menswear"); // UTM Term
      expect(row[22]).toBe("IwAR12345"); // fbclid
      expect(row[23]).toBe("fb.1.1700000000.111"); // _fbp
      expect(row[24]).toBe("fb.1.1700000000.IwAR12345"); // _fbc
    });

    it("verifies Row 1 headers and fails loudly on mismatch", () => {
      expect(() => verifyHeaderRowMatch([...SHEET_HEADERS])).not.toThrow();
      const badHeaders: string[] = [...SHEET_HEADERS];
      badHeaders[2] = "WrongColumn";
      expect(() => verifyHeaderRowMatch(badHeaders)).toThrow(
        /Column 3: expected "Status", found "WrongColumn"/
      );
    });
  });

  describe("5. Telegram status transitions & callback_data parse/build", () => {
    it("enforces valid status transitions only", () => {
      // new -> [confirmed, no_answer, cancelled]
      expect(canTransitionStatus("new", "confirmed")).toBe(true);
      expect(canTransitionStatus("new", "no_answer")).toBe(true);
      expect(canTransitionStatus("new", "cancelled")).toBe(true);
      expect(canTransitionStatus("new", "delivered")).toBe(false);

      // confirmed -> [shipped, cancelled]
      expect(canTransitionStatus("confirmed", "shipped")).toBe(true);
      expect(canTransitionStatus("confirmed", "cancelled")).toBe(true);
      expect(canTransitionStatus("confirmed", "delivered")).toBe(false);

      // shipped -> [delivered, returned]
      expect(canTransitionStatus("shipped", "delivered")).toBe(true);
      expect(canTransitionStatus("shipped", "returned")).toBe(true);
      expect(canTransitionStatus("shipped", "cancelled")).toBe(false);

      // no_answer -> [confirmed, cancelled]
      expect(canTransitionStatus("no_answer", "confirmed")).toBe(true);
      expect(canTransitionStatus("no_answer", "cancelled")).toBe(true);
      expect(canTransitionStatus("no_answer", "shipped")).toBe(false);

      // terminal states
      expect(canTransitionStatus("delivered", "returned")).toBe(false);
      expect(canTransitionStatus("cancelled", "confirmed")).toBe(false);
    });

    it("builds and parses callback_data under 64 bytes and generates matching keyboards", () => {
      const cb = buildCallbackData("confirmed", "BNN-0001");
      expect(cb).toBe("s:confirmed:BNN-0001");
      expect(Buffer.byteLength(cb, "utf8")).toBeLessThanOrEqual(64);

      const parsed = parseCallbackData(cb);
      expect(parsed).toEqual({ action: "confirmed", orderNumber: "BNN-0001" });

      expect(parseCallbackData("invalid:data")).toBeNull();
      expect(parseCallbackData("s:unknown_status:BNN-0001")).toBeNull();

      const kbNew = buildStatusInlineKeyboard("new", "BNN-0001");
      expect(kbNew.inline_keyboard[0]?.map((b) => b.callback_data)).toEqual([
        "s:confirmed:BNN-0001",
        "s:no_answer:BNN-0001",
      ]);
      expect(kbNew.inline_keyboard[1]?.map((b) => b.callback_data)).toEqual([
        "s:cancelled:BNN-0001",
      ]);
    });

    it("escapes user-supplied HTML in Telegram messages and includes REPEAT PHONE flag when set", () => {
      expect(escapeTelegramHtml('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
      );
      const html = formatTelegramOrderHtml(
        {
          orderNumber: "BNN-0003",
          createdAtDhakaIso: "2026-11-01T13:05:00+06:00",
          status: "new",
          name: "<b>Ahsan</b>",
          phone: "01711002233",
          address: "Road <5>",
          district: "Dhaka",
          zone: "dhaka-city",
          productTitle: "Panjabi",
          color: "Indigo",
          size: "L (42)",
          quantity: 1,
          unitPrice: 1490,
          deliveryFee: 70,
          codTotal: 1560,
          confirmationMode: "call",
        },
        "new",
        true
      );
      expect(html).toContain("REPEAT PHONE");
      expect(html).toContain("&lt;b&gt;Ahsan&lt;/b&gt;");
      expect(html).toContain("Road &lt;5&gt;");
    });
  });

  describe("6. Redis idempotency, IP rate limit, 3rd/4th repeat-phone rule, and order numbering", () => {
    let redis: InMemoryRedisDriver;

    beforeEach(() => {
      redis = new InMemoryRedisDriver();
    });

    it("generates atomic order numbers formatted PREFIX-0001", async () => {
      const o1 = await nextOrderNumber("demo-brand", "BNN", redis);
      const o2 = await nextOrderNumber("demo-brand", "BNN", redis);
      const o3 = await nextOrderNumber("custom-shop", undefined, redis);
      expect(o1).toBe("BNN-0001");
      expect(o2).toBe("BNN-0002");
      expect(o3).toBe("CUS-0001");
    });

    it("enforces idempotency via SET NX on idem:<key> and releases key on failure", async () => {
      const key = "550e8400-e29b-41d4-a716-446655440000";
      const first = await acquireIdempotencyKey(
        key,
        { status: "pending", orderNumber: "", eventId: "" },
        redis
      );
      expect(first.acquired).toBe(true);

      await finalizeIdempotencyKey(
        key,
        { status: "completed", orderNumber: "BNN-0001", eventId: "BNN-0001" },
        redis
      );

      const second = await acquireIdempotencyKey(
        key,
        { status: "pending", orderNumber: "", eventId: "" },
        redis
      );
      expect(second.acquired).toBe(false);
      if (!second.acquired) {
        expect(second.existing?.orderNumber).toBe("BNN-0001");
      }

      // Release key when both channels fail so retry can acquire it
      await releaseIdempotencyKey(key, redis);
      const third = await acquireIdempotencyKey(
        key,
        { status: "pending", orderNumber: "", eventId: "" },
        redis
      );
      expect(third.acquired).toBe(true);
    });

    it("enforces IP rate limit (5 allowed per 10 min, 6th rejected)", async () => {
      const ip = "203.112.218.10";
      for (let i = 1; i <= 5; i++) {
        const res = await checkIpRateLimit(ip, redis);
        expect(res.allowed).toBe(true);
        expect(res.count).toBe(i);
      }
      const sixth = await checkIpRateLimit(ip, redis);
      expect(sixth.allowed).toBe(false);
      expect(sixth.count).toBe(6);
    });

    it("enforces the 3rd/4th repeat-phone rule (1st & 2nd normal, 3rd allowed + REPEAT PHONE flag, 4th rejected)", async () => {
      const phone = "01711002233";

      const r1 = await checkPhoneRateLimit(phone, redis);
      expect(r1).toEqual({ allowed: true, count: 1, repeatPhoneFlag: false });

      const r2 = await checkPhoneRateLimit(phone, redis);
      expect(r2).toEqual({ allowed: true, count: 2, repeatPhoneFlag: false });

      const r3 = await checkPhoneRateLimit(phone, redis);
      expect(r3).toEqual({ allowed: true, count: 3, repeatPhoneFlag: true });

      const r4 = await checkPhoneRateLimit(phone, redis);
      expect(r4).toEqual({ allowed: false, count: 4, repeatPhoneFlag: false });
    });

    it("queues failed channel payloads into failed:<slug>", async () => {
      await pushDeadLetterOrder(
        "demo-brand",
        {
          type: "order_create",
          slug: "demo-brand",
          orderNumber: "BNN-0001",
          failedChannels: ["sheets"],
          errorSummary: "Sheets timeout",
          failedAtIso: new Date().toISOString(),
        },
        redis
      );
      const list = await redis.lrange("failed:demo-brand", 0, -1);
      expect(list).toHaveLength(1);
      expect(JSON.parse(list[0]).orderNumber).toBe("BNN-0001");
    });
  });
});
