import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import {
  PaymentsConfigSchema,
  MobilePaymentMethodSchema,
  ClientConfigSchema,
} from "../src/lib/config-schema";
import {
  InMemoryRedisDriver,
  reserveTrxId,
  releaseTrxId,
  acquireIdempotencyKey,
  finalizeIdempotencyKey,
  storeOrderMeta,
  getOrderMeta,
  updateOrderMetaPaymentStatus,
} from "../src/lib/server/redis";
import {
  buildSheetRow,
  SHEET_HEADERS,
  type OrderRecordForSheet,
} from "../src/lib/server/sheet-row";
import {
  parseCallbackData,
  buildMobilePaymentInlineKeyboard,
  buildStatusInlineKeyboard,
} from "../src/lib/server/status-machine";
import { checkHeaderMatch } from "../scripts/init-sheet.mjs";

describe("Manual Mobile Payments End-to-End Tests", () => {
  let redis: InMemoryRedisDriver;

  beforeEach(() => {
    redis = new InMemoryRedisDriver();
  });

  describe("1. Schema validation (canonical shape, missing number rejection, legacy shapes)", () => {
    it("fails validation when a mobile method is enabled without a phone number", () => {
      const invalidConfig = {
        enabled: true,
        type: "personal",
      };
      const result = MobilePaymentMethodSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("number"))).toBe(true);
      }
    });

    it("fails validation when an enabled mobile number is not a valid BD mobile number", () => {
      const invalidPhoneConfig = {
        enabled: true,
        number: "01234567890", // Invalid prefix 012
        type: "personal",
      };
      const result = MobilePaymentMethodSchema.safeParse(invalidPhoneConfig);
      expect(result.success).toBe(false);
    });

    it("fails validation when an invalid account type is provided", () => {
      const invalidTypeConfig = {
        enabled: true,
        number: "01711002233",
        type: "islamic", // Removed legacy type
      };
      const result = MobilePaymentMethodSchema.safeParse(invalidTypeConfig);
      expect(result.success).toBe(false);
    });

    it("accepts valid canonical mobile payment configuration", () => {
      const validConfig = {
        cod: { enabled: true },
        bkash: { enabled: true, number: "01711002233", type: "personal" },
        nagad: { enabled: true, number: "01811002233", type: "agent" },
        rocket: { enabled: true, number: "01911002233", type: "merchant" },
      };
      const result = PaymentsConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it("defaults to COD enabled only when payments config is absent", () => {
      const parsed = PaymentsConfigSchema.parse(undefined);
      expect(parsed.cod.enabled).toBe(true);
      expect(parsed.bkash).toBeUndefined();
      expect(parsed.nagad).toBeUndefined();
      expect(parsed.rocket).toBeUndefined();
    });

    it("rejects legacy boolean and string forms in payments", () => {
      const legacyBoolean = {
        cod: true,
        bkash: "01711002233",
      };
      const result = PaymentsConfigSchema.safeParse(legacyBoolean);
      expect(result.success).toBe(false);
    });

    it("rejects SVG for ogImage and accepts raster ogImage", () => {
      const demoConfig = JSON.parse(fs.readFileSync("clients/demo-brand.json", "utf-8"));
      
      const svgConfig = { ...demoConfig, ogImage: "/demo-brand/preview.svg" };
      const resSvg = ClientConfigSchema.safeParse(svgConfig);
      expect(resSvg.success).toBe(false);

      const jpgConfig = { ...demoConfig, ogImage: "/demo-brand/og.jpg" };
      const resJpg = ClientConfigSchema.safeParse(jpgConfig);
      expect(resJpg.success).toBe(true);
    });
  });

  describe("2. TrxID normalization (uppercase, 6-20 alphanumeric)", () => {
    const TRXID_REGEX = /^[A-Z0-9]{6,20}$/;

    it("normalizes lowercase alphanumeric TrxIDs to uppercase", () => {
      const raw = "  9a8b7c6d5e  ";
      const normalized = raw.trim().toUpperCase();
      expect(normalized).toBe("9A8B7C6D5E");
      expect(TRXID_REGEX.test(normalized)).toBe(true);
    });

    it("accepts valid 6 to 20 alphanumeric TrxID formats across providers", () => {
      const samples = [
        "BN7A6D5E",
        "9A8B7C6D5E",
        "ROCKET12345",
        "ABC123",
        "A1B2C3D4E5F6G7H8I9J0",
      ];
      for (const s of samples) {
        expect(TRXID_REGEX.test(s)).toBe(true);
      }
    });

    it("rejects invalid TrxID strings (too short, too long, special characters)", () => {
      const invalidSamples = [
        "A1B2C", // 5 chars (too short)
        "A".repeat(21), // 21 chars (too long)
        "TRX-12345", // Contains hyphen
        "TRX_12345", // Contains underscore
        "TRX#12345", // Contains special char
        "",
      ];
      for (const s of invalidSamples) {
        expect(TRXID_REGEX.test(s)).toBe(false);
      }
    });
  });

  describe("3. Duplicate TrxID rejection via Redis reserveTrxId", () => {
    it("reserves TrxID on first attempt and rejects duplicate attempt for same client", async () => {
      const slug = "demo-brand";
      const trxId = "TRX123456";

      const firstAttempt = await reserveTrxId(slug, trxId, redis);
      expect(firstAttempt).toBe(true);

      const secondAttempt = await reserveTrxId(slug, trxId, redis);
      expect(secondAttempt).toBe(false);
    });

    it("allows same TrxID for different client slugs", async () => {
      const trxId = "SHAREDTRX123";

      const client1 = await reserveTrxId("client-alpha", trxId, redis);
      expect(client1).toBe(true);

      const client2 = await reserveTrxId("client-beta", trxId, redis);
      expect(client2).toBe(true);
    });
  });

  describe("4. Idempotency retry returns existing order without hitting duplicate rule", () => {
    it("returns completed cached order on retry with same idempotencyKey", async () => {
      const key = "idem-test-key-001";
      const cachedSummary = {
        orderNumber: "BNN-0001",
        total: 1590,
        customerName: "Rahim",
      };

      const acquireFirst = await acquireIdempotencyKey(
        key,
        { status: "pending", orderNumber: "PENDING-001" },
        redis
      );
      expect(acquireFirst.acquired).toBe(true);

      await finalizeIdempotencyKey(
        key,
        {
          status: "completed",
          orderNumber: "BNN-0001",
          eventId: "BNN-0001",
          summary: cachedSummary,
        },
        redis
      );

      const acquireRetry = await acquireIdempotencyKey(
        key,
        { status: "pending", orderNumber: "PENDING-002" },
        redis
      );
      expect(acquireRetry.acquired).toBe(false);
      expect(acquireRetry.existing?.status).toBe("completed");
      expect(acquireRetry.existing?.orderNumber).toBe("BNN-0001");
    });
  });

  describe("5. TrxID reservation released on dual channel failure", () => {
    it("releases reserved TrxID so customer can retry after dual channel failure", async () => {
      const slug = "demo-brand";
      const trxId = "TRXFAILOVER123";

      const reserved = await reserveTrxId(slug, trxId, redis);
      expect(reserved).toBe(true);

      const keyVal = await redis.get(`trx:${slug}:${trxId}`);
      expect(keyVal).toBe("1");

      await releaseTrxId(slug, trxId, redis);

      const afterRelease = await redis.get(`trx:${slug}:${trxId}`);
      expect(afterRelease).toBeNull();

      const reReserved = await reserveTrxId(slug, trxId, redis);
      expect(reReserved).toBe(true);
    });
  });

  describe("6. Telegram webhook transitions including late 'Payment verified' after 'Payment not received'", () => {
    it("parses payment callback queries correctly", () => {
      const verifiedQuery = parseCallbackData("pay:v:BNN-0042");
      expect(verifiedQuery).toEqual({
        type: "payment",
        paymentAction: "verified",
        orderNumber: "BNN-0042",
      });

      const notReceivedQuery = parseCallbackData("pay:nr:BNN-0042");
      expect(notReceivedQuery).toEqual({
        type: "payment",
        paymentAction: "not_received",
        orderNumber: "BNN-0042",
      });
    });

    it("builds correct mobile payment inline keyboard for Unverified status", () => {
      const keyboard = buildMobilePaymentInlineKeyboard("Unverified", "BNN-0042");
      const buttons = keyboard.inline_keyboard[0];
      expect(buttons).toHaveLength(3);
      expect(buttons[0].text).toBe("Payment verified");
      expect(buttons[0].callback_data).toBe("pay:v:BNN-0042");
      expect(buttons[1].text).toBe("Payment not received");
      expect(buttons[1].callback_data).toBe("pay:nr:BNN-0042");
      expect(buttons[2].text).toBe("Cancelled");
      expect(buttons[2].callback_data).toBe("s:cancelled:BNN-0042");
    });

    it("builds correct mobile payment inline keyboard for Not received status", () => {
      const keyboard = buildMobilePaymentInlineKeyboard("Not received", "BNN-0042");
      const buttons = keyboard.inline_keyboard[0];
      expect(buttons).toHaveLength(2);
      expect(buttons[0].text).toBe("Payment verified");
      expect(buttons[0].callback_data).toBe("pay:v:BNN-0042");
      expect(buttons[1].text).toBe("Cancelled");
      expect(buttons[1].callback_data).toBe("s:cancelled:BNN-0042");
    });

    it("supports late 'Payment verified' transition after 'Payment not received'", async () => {
      const orderNumber = "BNN-0099";

      await storeOrderMeta(
        orderNumber,
        {
          slug: "demo-brand",
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          phone: "01711002233",
          sheetSynced: true,
          paymentMethod: "bkash",
          paymentStatus: "Unverified",
          trxId: "TRX998877",
          paidFrom: "01711002233",
        },
        redis
      );

      await updateOrderMetaPaymentStatus(orderNumber, "Not received", redis);
      let meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.paymentStatus).toBe("Not received");

      const notReceivedKeyboard = buildMobilePaymentInlineKeyboard(
        meta?.paymentStatus as "Not received",
        orderNumber
      );
      expect(notReceivedKeyboard.inline_keyboard[0]).toHaveLength(2);
      expect(notReceivedKeyboard.inline_keyboard[0][0].text).toBe("Payment verified");

      await updateOrderMetaPaymentStatus(orderNumber, "Verified", redis);
      meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.paymentStatus).toBe("Verified");

      const verifiedKeyboard = buildStatusInlineKeyboard("new", orderNumber);
      expect(verifiedKeyboard.inline_keyboard[0].length).toBeGreaterThan(0);
      expect(verifiedKeyboard.inline_keyboard[0].some((b) => b.text.includes("Confirm"))).toBe(true);
    });
  });

  describe("7. buildSheetRow returns exactly 29 columns with correct payment cells", () => {
    it("returns 29 columns with correct cells for Cash on Delivery", () => {
      const record: OrderRecordForSheet = {
        orderNumber: "BNN-0101",
        createdAtDhakaIso: "2026-11-02T16:00:00+06:00",
        status: "new",
        name: "Tanvir Ahmed",
        phone: "01711002233",
        address: "Dhanmondi 27",
        district: "Dhaka",
        zone: "dhaka-city",
        productTitle: "Cotton Panjabi",
        color: "Navy",
        size: "L",
        quantity: 1,
        unitPrice: 1490,
        deliveryFee: 70,
        codTotal: 1560,
        confirmationMode: "call",
        paymentMethod: "cod",
        paymentStatus: "COD",
      };

      const row = buildSheetRow(record);
      expect(row).toHaveLength(29);
      expect(SHEET_HEADERS).toHaveLength(29);

      expect(row[25]).toBe("cod"); // Payment Method
      expect(row[26]).toBe("COD"); // Payment Status
      expect(row[27]).toBe(""); // TrxID
      expect(row[28]).toBe(""); // Paid From Number
    });

    it("returns 29 columns with correct cells for bKash mobile payment", () => {
      const record: OrderRecordForSheet = {
        orderNumber: "BNN-0102",
        createdAtDhakaIso: "2026-11-02T16:00:00+06:00",
        status: "new",
        name: "Sumon Khan",
        phone: "01811002233",
        address: "GEC Circle",
        district: "Chattogram",
        zone: "outside-dhaka",
        productTitle: "Cotton Panjabi",
        color: "Black",
        size: "XL",
        quantity: 2,
        unitPrice: 1490,
        deliveryFee: 130,
        codTotal: 3110,
        confirmationMode: "call",
        paymentMethod: "bkash",
        paymentStatus: "Unverified",
        trxId: "9A8B7C6D5E",
        paidFrom: "01811002233",
      };

      const row = buildSheetRow(record);
      expect(row).toHaveLength(29);

      expect(row[25]).toBe("bkash"); // Payment Method
      expect(row[26]).toBe("Unverified"); // Payment Status
      expect(row[27]).toBe("9A8B7C6D5E"); // TrxID
      expect(row[28]).toBe("01811002233"); // Paid From Number
    });
  });

  describe("8. checkHeaderMatch in init-sheet.mjs correctly identifies header states", () => {
    it("identifies empty header rows", () => {
      expect(checkHeaderMatch([])).toEqual({ status: "empty" });
      expect(checkHeaderMatch(null as unknown as string[])).toEqual({ status: "empty" });
    });

    it("identifies existing 25-column sheets that need extension to 29 columns", () => {
      const legacy25 = SHEET_HEADERS.slice(0, 25);
      expect(checkHeaderMatch(legacy25)).toEqual({ status: "needs_extension" });
    });

    it("identifies completed 29-column canonical sheets", () => {
      expect(checkHeaderMatch([...SHEET_HEADERS])).toEqual({ status: "complete" });
    });

    it("identifies mismatched base columns", () => {
      const corrupted = [...SHEET_HEADERS] as string[];
      corrupted[0] = "Wrong Order No";
      const check = checkHeaderMatch(corrupted);
      expect(check.status).toBe("mismatched");
    });

    it("identifies mismatched payment columns", () => {
      const badPayments = [...SHEET_HEADERS.slice(0, 25), "Wrong Method", "Wrong Status", "Wrong Trx", "Wrong From"];
      const check = checkHeaderMatch(badPayments);
      expect(check.status).toBe("mismatched");
    });
  });

  describe("9. Google Sheets grid limits handling and automatic widening", () => {
    it("isGridLimitsError correctly detects grid limit error messages", async () => {
      const { isGridLimitsError } = await import("../src/lib/server/sheets");
      expect(isGridLimitsError("Range exceeds grid limits. Max columns: 26")).toBe(true);
      expect(isGridLimitsError("Cannot write to sheet: out of bounds")).toBe(true);
      expect(isGridLimitsError("Append range exceeds sheet limits")).toBe(true);
      expect(isGridLimitsError("403 Forbidden: Permission denied")).toBe(false);
      expect(isGridLimitsError("500 Internal Server Error")).toBe(false);
    });

    it("widens sheet columns to at least 30 and retries when Sheets API returns exceeds grid limits error", async () => {
      const sheetsModule = await import("../src/lib/server/sheets");
      vi.stubEnv("TEST_SHEETS_REAL_FLOW", "1");
      vi.stubEnv("NODE_ENV", "test");

      // Mock getGoogleSheetsAccessToken
      vi.spyOn(sheetsModule, "getGoogleSheetsAccessToken").mockResolvedValue("mock-access-token");

      let widened = false;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes(":batchUpdate")) {
          widened = true;
          return new Response(JSON.stringify({ replies: [{}] }), { status: 200 });
        }
        if (urlStr.includes("fields=sheets.properties")) {
          return new Response(
            JSON.stringify({
              sheets: [{ properties: { sheetId: 0, gridProperties: { columnCount: 26 } } }],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes("values/A:AC:append")) {
          if (!widened) {
            return new Response(
              "Range (Sheet1!A:AC) exceeds grid limits: Max columns is 26",
              { status: 400 }
            );
          }
          return new Response(
            JSON.stringify({ updates: { updatedRange: "Sheet1!A2:AC2" } }),
            { status: 200 }
          );
        }
        return new Response("{}", { status: 200 });
      });

      try {
        const dummyRow = Array(29).fill("test-val");
        const res = await sheetsModule.appendOrderRow("test-sheet-id", dummyRow);
        expect(res.updatedRange).toBe("Sheet1!A2:AC2");
        expect(widened).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
        vi.unstubAllEnvs();
      }
    });
  });
});
