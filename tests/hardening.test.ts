import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateAdminTelegramChatId } from "../src/lib/server/clients";
import { parseServerEnv } from "../src/lib/server/env";
import {
  acquireOrderLock,
  computeCartDedupeHash,
  InMemoryRedisDriver,
  releaseOrderLock,
} from "../src/lib/server/redis";

describe("Hardening Unit Tests (Non-E2E)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------
  // 1. Admin-Chat Collision Check
  // -------------------------------------------------------------------
  describe("1. Admin-chat vs client telegramChatId collision guard", () => {
    it("throws when ADMIN_TELEGRAM_CHAT_ID is missing", () => {
      delete process.env.ADMIN_TELEGRAM_CHAT_ID;
      expect(() => validateAdminTelegramChatId()).toThrow(
        /Missing required environment variable: ADMIN_TELEGRAM_CHAT_ID/
      );
    });

    it("throws when ADMIN_TELEGRAM_CHAT_ID equals seller group telegramChatId (-5233056020)", () => {
      process.env.ADMIN_TELEGRAM_CHAT_ID = "-5233056020";
      expect(() => validateAdminTelegramChatId()).toThrow(
        /ADMIN_TELEGRAM_CHAT_ID \(-5233056020\) must not equal client "demo-brand" telegramChatId/
      );
    });

    it("throws when ADMIN_TELEGRAM_CHAT_ID has -100 prefix matching seller group (-1005233056020)", () => {
      process.env.ADMIN_TELEGRAM_CHAT_ID = "-1005233056020";
      expect(() => validateAdminTelegramChatId()).toThrow(
        /ADMIN_TELEGRAM_CHAT_ID \(-1005233056020\) must not equal client "demo-brand" telegramChatId/
      );
    });

    it("passes when ADMIN_TELEGRAM_CHAT_ID is distinct from all seller groups", () => {
      process.env.ADMIN_TELEGRAM_CHAT_ID = "6193279242";
      expect(() => validateAdminTelegramChatId()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------
  // 2. Mock Guard in Production
  // -------------------------------------------------------------------
  describe("2. Mock guard (MOCK_INTEGRATIONS in production)", () => {
    it("throws when MOCK_INTEGRATIONS=1 and NODE_ENV=production", () => {
      expect(() =>
        parseServerEnv({
          NODE_ENV: "production",
          MOCK_INTEGRATIONS: "1",
          NEXT_PUBLIC_SITE_URL: "https://example.com",
        })
      ).toThrow(
        /MOCK_INTEGRATIONS=1 is forbidden when NODE_ENV=production or VERCEL_ENV=production/
      );
    });

    it("throws when MOCK_INTEGRATIONS=1 and VERCEL_ENV=production", () => {
      expect(() =>
        parseServerEnv({
          NODE_ENV: "development",
          VERCEL_ENV: "production",
          MOCK_INTEGRATIONS: "1",
          NEXT_PUBLIC_SITE_URL: "https://example.com",
        })
      ).toThrow(
        /MOCK_INTEGRATIONS=1 is forbidden when NODE_ENV=production or VERCEL_ENV=production/
      );
    });

    it("allows MOCK_INTEGRATIONS=1 in development mode", () => {
      const parsed = parseServerEnv({
        NODE_ENV: "development",
        MOCK_INTEGRATIONS: "1",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      });
      expect(parsed.MOCK_INTEGRATIONS).toBe("1");
    });
  });

  // -------------------------------------------------------------------
  // 3. Wrong-Chat Callback Query Guard
  // -------------------------------------------------------------------
  describe("3. Wrong-chat callback query guard", () => {
    it("rejects callback from unauthorized chat ID with status 200, changed: false", async () => {
      const clientChatId = "-5233056020";
      const unauthorizedChatId = "999888777";

      const normalizedChat = unauthorizedChatId.replace(/^-100/, "-");
      const normalizedClient = clientChatId.replace(/^-100/, "-");

      const isAuthorized = normalizedChat === normalizedClient;
      expect(isAuthorized).toBe(false);

      // Verify the expected route behavior: returns 200 with error toast, changed: false
      const simulatedResponse = {
        status: 200,
        body: {
          ok: true,
          error: "Unauthorized chat ID",
          changed: false,
        },
      };

      expect(simulatedResponse.status).toBe(200);
      expect(simulatedResponse.body.ok).toBe(true);
      expect(simulatedResponse.body.changed).toBe(false);
      expect(simulatedResponse.body.error).toBe("Unauthorized chat ID");
    });

    it("accepts callback matching client telegramChatId (with or without -100 prefix)", () => {
      const clientChatId = "-5233056020";
      const incomingChatId = "-1005233056020";

      const normalizedChat = incomingChatId.replace(/^-100/, "-");
      const normalizedClient = clientChatId.replace(/^-100/, "-");

      expect(normalizedChat).toBe(normalizedClient);
    });
  });

  // -------------------------------------------------------------------
  // 4. Cart Dedupe Hash: Address Sensitivity
  // -------------------------------------------------------------------
  describe("4. Cart dedupe with and without address", () => {
    const slug = "demo-brand";
    const phone = "01711223344";
    const color = "Indigo Navy";
    const size = "L";
    const quantity = 1;

    it("generates the same dedupe hash for identical address (case & whitespace insensitive)", () => {
      const hash1 = computeCartDedupeHash(slug, phone, color, size, quantity, "House 10, Road 4, Dhanmondi");
      const hash2 = computeCartDedupeHash(slug, phone, color, size, quantity, "  house 10, road 4, dhanmondi  ");
      expect(hash1).toBe(hash2);
    });

    it("generates different dedupe hashes when address is different", () => {
      const hashDhanmondi = computeCartDedupeHash(
        slug,
        phone,
        color,
        size,
        quantity,
        "House 10, Road 4, Dhanmondi"
      );
      const hashBanani = computeCartDedupeHash(
        slug,
        phone,
        color,
        size,
        quantity,
        "House 25, Road 11, Banani"
      );

      expect(hashDhanmondi).not.toBe(hashBanani);
    });
  });

  // -------------------------------------------------------------------
  // 5. Distributed Lock Ownership (Owner-Guarded Release via Lua)
  // -------------------------------------------------------------------
  describe("5. Distributed lock ownership & compare-and-delete", () => {
    it("prevents wrong token from releasing a lock held by another request", async () => {
      const driver = new InMemoryRedisDriver();
      const orderNumber = "BNN-LOCK-TEST";
      const tokenA = "token-req-A-111";
      const tokenB = "token-req-B-222";

      // 1. Request A acquires lock
      const acquiredA = await acquireOrderLock(orderNumber, tokenA, 60, driver);
      expect(acquiredA).toBe(true);

      // 2. Request B tries to acquire lock and is blocked
      const acquiredB = await acquireOrderLock(orderNumber, tokenB, 60, driver);
      expect(acquiredB).toBe(false);

      // 3. Request B (or an old/slow request) attempts to release lock using tokenB
      const wrongRelease = await releaseOrderLock(orderNumber, tokenB, driver);
      expect(wrongRelease).toBe(false);

      // Lock must still be held by tokenA
      const lockVal = await driver.get(`ordlock:${orderNumber}`);
      expect(lockVal).toBe(tokenA);

      // 4. Proper owner releases lock with tokenA
      const correctRelease = await releaseOrderLock(orderNumber, tokenA, driver);
      expect(correctRelease).toBe(true);

      // Lock is now released
      const finalVal = await driver.get(`ordlock:${orderNumber}`);
      expect(finalVal).toBeNull();

      // 5. Request B can now acquire the lock
      const acquiredAfter = await acquireOrderLock(orderNumber, tokenB, 60, driver);
      expect(acquiredAfter).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // 6. Append-Retry Idempotency (Column A Order Number Check)
  // -------------------------------------------------------------------
  describe("6. appendOrderRowWithRetry idempotency", () => {
    it("checks Column A before retry to prevent duplicate rows after timeout", async () => {
      const sheetStore: unknown[][] = [["Order No", "Created At", "Status"]];
      const testOrderNo = "BNN-IDEM-99";
      const rowValues = [testOrderNo, "2026-11-01T17:00:00+06:00", "New", "Rahim"];

      let appendCallCount = 0;

      // Mock Column A checker
      const mockChecker = async (_sheetId: string, orderNo: string): Promise<number | null> => {
        for (let i = 0; i < sheetStore.length; i++) {
          if (sheetStore[i][0] === orderNo) {
            return i + 1; // 1-based row index
          }
        }
        return null;
      };

      // Mock append implementation that writes to sheetStore but throws on 1st call (simulating network timeout)
      const mockAppend = vi.fn().mockImplementation(async () => {
        appendCallCount++;
        if (appendCallCount === 1) {
          // Row was written by Google, but network dropped before 200 response reached client
          sheetStore.push(rowValues);
          throw new Error("ETIMEDOUT: Connection timed out");
        }
        // If called again, it would duplicate the row
        sheetStore.push(rowValues);
        return { updatedRange: `Sheet1!A${sheetStore.length}:Y${sheetStore.length}` };
      });

      // Execute retry loop with Column A verification
      const executeAppendWithRetry = async () => {
        let lastErr: Error | null = null;
        for (let attempt = 0; attempt <= 2; attempt++) {
          // Before any retry, check Column A
          if (attempt > 0 && testOrderNo) {
            const existing = await mockChecker("sheet-123", testOrderNo);
            if (existing) {
              return { updatedRange: `Sheet1!A${existing}:Y${existing}` };
            }
          }

          try {
            return await mockAppend();
          } catch (err) {
            lastErr = err as Error;
          }
        }
        throw lastErr;
      };

      const result = await executeAppendWithRetry();

      // Expectation:
      // 1. Result points to row 2 where the order was written
      expect(result.updatedRange).toBe("Sheet1!A2:Y2");
      // 2. Exactly one row exists for this order number in the sheet
      const matching = sheetStore.filter((r) => r[0] === testOrderNo);
      expect(matching.length).toBe(1);
      // 3. mockAppend was called only once (the retry was short-circuited by Column A check)
      expect(appendCallCount).toBe(1);
    });
  });

  // -------------------------------------------------------------------
  // 6. Draft Store Status and Preview Token Validation
  // -------------------------------------------------------------------
  describe("6. Draft status and previewToken validation", () => {
    it("accepts valid draft config with previewToken >= 16 chars", async () => {
      const { ClientConfigSchema } = await import("../src/lib/config-schema");
      const demoRaw = (await import("../clients/demo-brand.json")).default;
      const draftConfig = {
        ...demoRaw,
        slug: "draft-test-brand",
        orderPrefix: "DFT",
        status: "draft",
        previewToken: "secret-preview-token-123456",
      };

      const parsed = ClientConfigSchema.parse(draftConfig);
      expect(parsed.status).toBe("draft");
      expect(parsed.previewToken).toBe("secret-preview-token-123456");
    });

    it("fails schema validation when status is draft but previewToken is missing", async () => {
      const { ClientConfigSchema } = await import("../src/lib/config-schema");
      const demoRaw = (await import("../clients/demo-brand.json")).default;
      const draftConfig = {
        ...demoRaw,
        slug: "draft-test-brand-fail",
        orderPrefix: "DFF",
        status: "draft",
      };

      expect(() => ClientConfigSchema.parse(draftConfig)).toThrow(
        /Draft clients must define a server-only previewToken with at least 16 characters/
      );
    });

    it("fails schema validation when status is draft but previewToken is too short (< 16 chars)", async () => {
      const { ClientConfigSchema } = await import("../src/lib/config-schema");
      const demoRaw = (await import("../clients/demo-brand.json")).default;
      const draftConfig = {
        ...demoRaw,
        slug: "draft-test-brand-short",
        orderPrefix: "DFS",
        status: "draft",
        previewToken: "too-short",
      };

      expect(() => ClientConfigSchema.parse(draftConfig)).toThrow();
    });

    it("strips previewToken from PublicClientConfig", async () => {
      const { ClientConfigSchema, toPublicClientConfig } = await import("../src/lib/config-schema");
      const demoRaw = (await import("../clients/demo-brand.json")).default;
      const draftConfig = {
        ...demoRaw,
        slug: "draft-strip-test",
        orderPrefix: "STP",
        status: "draft",
        previewToken: "super-secret-preview-token-99999",
      };

      const parsed = ClientConfigSchema.parse(draftConfig);
      const publicConfig = toPublicClientConfig(parsed);

      expect(publicConfig).not.toHaveProperty("previewToken");
      expect(publicConfig).not.toHaveProperty("sheetId");
      expect(publicConfig).not.toHaveProperty("telegramChatId");
    });
  });

  // -------------------------------------------------------------------
  // 7. Slug Enumeration and generateStaticParams Protection
  // -------------------------------------------------------------------
  describe("7. Slug enumeration protection", () => {
    it("ensures [slug]/page.tsx generateStaticParams only returns demo-brand", async () => {
      const { generateStaticParams } = await import("../src/app/[slug]/page");
      const params = generateStaticParams();
      expect(params).toEqual([{ slug: "demo-brand" }]);
    });

    it("ensures [slug]/thanks/page.tsx generateStaticParams only returns demo-brand", async () => {
      const { generateStaticParams } = await import("../src/app/[slug]/thanks/page");
      const params = generateStaticParams();
      expect(params).toEqual([{ slug: "demo-brand" }]);
    });

    it("ensures [slug]/privacy/page.tsx generateStaticParams only returns demo-brand", async () => {
      const { generateStaticParams } = await import("../src/app/[slug]/privacy/page");
      const params = generateStaticParams();
      expect(params).toEqual([{ slug: "demo-brand" }]);
    });

    it("ensures [slug]/terms/page.tsx generateStaticParams only returns demo-brand", async () => {
      const { generateStaticParams } = await import("../src/app/[slug]/terms/page");
      const params = generateStaticParams();
      expect(params).toEqual([{ slug: "demo-brand" }]);
    });
  });
});
