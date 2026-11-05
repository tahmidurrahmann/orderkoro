import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/telegram/webhook/route";
import { POST as orderPost } from "../src/app/api/order/route";
import { getOrderMeta, getRedisDriver, storeOrderMeta, storeOrderToken } from "../src/lib/server/redis";
import * as sheetsModule from "../src/lib/server/sheets";
import * as telegramModule from "../src/lib/server/telegram";

const SECRET = "test_webhook_secret_12345";
const SELLER_CHAT_ID = "-5233056020";
const WRONG_CHAT_ID = "-9999999999";

function makeWebhookRequest(body: unknown, secretHeader: string | undefined = SECRET) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secretHeader !== undefined) {
    headers["x-telegram-bot-api-secret-token"] = secretHeader;
  }
  return new NextRequest("http://localhost:3000/api/telegram/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Telegram Webhook Payment Callbacks Verification (pay:v and pay:nr)", () => {
  beforeEach(async () => {
    vi.stubEnv("MOCK_INTEGRATIONS", "1");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("ADMIN_TELEGRAM_CHAT_ID", "-1001234567890");
    vi.restoreAllMocks();
    const redis = getRedisDriver();
    await redis.del("rl:demo:global");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("1. rejects requests with wrong or missing secret header (403)", async () => {
    const res = await POST(
      makeWebhookRequest(
        {
          callback_query: {
            id: "cb_sec",
            data: "pay:v:BNN-9001",
            message: { message_id: 101, chat: { id: SELLER_CHAT_ID } },
          },
        },
        "wrong_secret"
      )
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("2. rejects press from wrong chat ID", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "BNN-9002",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "bkash",
        paymentStatus: "Unverified",
        telegramChatId: SELLER_CHAT_ID,
        rowRef: "Sheet1!A10:AC10",
      },
      redis
    );

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_wrong_chat",
          data: "pay:v:BNN-9002",
          message: { message_id: 101, chat: { id: WRONG_CHAT_ID } },
        },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized chat ID");
    expect(data.changed).toBe(false);
  });

  it("3. accepts valid pay:v press, updates Sheet and edits Telegram message", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "BNN-9003",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "bkash",
        paymentStatus: "Unverified",
        telegramChatId: SELLER_CHAT_ID,
        rowRef: "Sheet1!A12:AC12",
      },
      redis
    );

    const sheetSpy = vi.spyOn(sheetsModule, "updateSheetPaymentStatusWithRetry").mockResolvedValue();
    const editSpy = vi.spyOn(telegramModule, "editTelegramOrderMessage").mockResolvedValue();

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_valid_v",
          data: "pay:v:BNN-9003",
          message: {
            message_id: 201,
            chat: { id: SELLER_CHAT_ID },
            text: "📦 Order BNN-9003\nPayment Method: bkash\nPayment Status: Unverified\n⚠️ UNVERIFIED: Check TrxID",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(sheetSpy).toHaveBeenCalledWith(expect.any(String), "Sheet1!A12:AC12", "BNN-9003", "Verified");
    expect(editSpy).toHaveBeenCalledWith(
      SELLER_CHAT_ID,
      201,
      expect.stringContaining("Payment Verified"),
      "new",
      "BNN-9003",
      expect.objectContaining({ inline_keyboard: expect.any(Array) })
    );
  });

  it("4. handles repeated press idempotently without duplicate Sheet updates", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "BNN-9004",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "bkash",
        paymentStatus: "Verified", // already verified
        telegramChatId: SELLER_CHAT_ID,
        rowRef: "Sheet1!A14:AC14",
      },
      redis
    );

    const sheetSpy = vi.spyOn(sheetsModule, "updateSheetPaymentStatusWithRetry");

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_repeated",
          data: "pay:v:BNN-9004",
          message: { message_id: 202, chat: { id: SELLER_CHAT_ID } },
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.idempotent).toBe(true);
    expect(sheetSpy).not.toHaveBeenCalled();
  });

  it("5. supports late pay:v after pay:nr (Payment verified after Payment not received)", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "BNN-9005",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "bkash",
        paymentStatus: "Not received", // currently not received
        telegramChatId: SELLER_CHAT_ID,
        rowRef: "Sheet1!A15:AC15",
      },
      redis
    );

    const sheetSpy = vi.spyOn(sheetsModule, "updateSheetPaymentStatusWithRetry").mockResolvedValue();
    const editSpy = vi.spyOn(telegramModule, "editTelegramOrderMessage").mockResolvedValue();

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_late_v",
          data: "pay:v:BNN-9005",
          message: {
            message_id: 205,
            chat: { id: SELLER_CHAT_ID },
            text: "📦 Order BNN-9005\nPayment Status: Not received\n⚠️ PAYMENT NOT RECEIVED",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(sheetSpy).toHaveBeenCalledWith(expect.any(String), "Sheet1!A15:AC15", "BNN-9005", "Verified");
    expect(editSpy).toHaveBeenCalledWith(
      SELLER_CHAT_ID,
      205,
      expect.stringContaining("Payment Verified"),
      "new",
      "BNN-9005",
      expect.objectContaining({ inline_keyboard: expect.any(Array) })
    );
  });

  it("6. rejects pay:v on COD orders", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "BNN-9006",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: SELLER_CHAT_ID,
        rowRef: "Sheet1!A16:AC16",
      },
      redis
    );

    const sheetSpy = vi.spyOn(sheetsModule, "updateSheetPaymentStatusWithRetry");

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_cod",
          data: "pay:v:BNN-9006",
          message: { message_id: 206, chat: { id: SELLER_CHAT_ID } },
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("Cash on Delivery");
    expect(sheetSpy).not.toHaveBeenCalled();
  });
});

describe("Demo Alerts Channel Mode & Callback Security", () => {
  const DEMO_CHANNEL_ID = "-1004447230623";
  const REAL_SELLER_CHAT_ID = "-5233056020";
  const REAL_SELLER_USER_ID = "5233056020";
  const STRANGER_USER_ID = "999888777";
  const OTHER_CHAT_ID = "-999111222333";

  beforeEach(async () => {
    vi.stubEnv("MOCK_INTEGRATIONS", "1");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("ADMIN_TELEGRAM_CHAT_ID", "-1001234567890");
    vi.restoreAllMocks();
    const redis = getRedisDriver();
    await redis.del("rl:demo:global");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function makeOrderRequest(body: unknown, ip = "127.0.0.1") {
    return new NextRequest("http://localhost:3000/api/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(body),
    });
  }

  it("1. stranger tap on a REAL client order is rejected", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "TMP-1001",
      {
        slug: "test-template",
        status: "new",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: REAL_SELLER_CHAT_ID,
        sellerTelegramUserId: REAL_SELLER_USER_ID,
        rowRef: "Sheet1!A2:AC2",
        isDemo: false,
      },
      redis
    );

    const answerSpy = vi.spyOn(telegramModule, "answerTelegramCallback").mockResolvedValue();

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_stranger_real",
          data: "s:confirmed:TMP-1001",
          from: { id: STRANGER_USER_ID },
          message: {
            message_id: 301,
            chat: { id: REAL_SELLER_CHAT_ID },
            text: "📦 Order #TMP-1001\nStatus: NEW",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized user ID");
    expect(data.changed).toBe(false);
    expect(answerSpy).toHaveBeenCalledWith(
      "cb_stranger_real",
      "Unauthorized: Only the seller may update order status",
      false
    );
  });

  it("2. seller tap on a REAL client order is accepted", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "TMP-1002",
      {
        slug: "test-template",
        status: "new",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: REAL_SELLER_CHAT_ID,
        sellerTelegramUserId: REAL_SELLER_USER_ID,
        rowRef: "Sheet1!A3:AC3",
        isDemo: false,
      },
      redis
    );

    vi.spyOn(sheetsModule, "updateSheetOrderStatusWithRetry").mockResolvedValue();
    vi.spyOn(telegramModule, "editTelegramOrderMessage").mockResolvedValue();
    const answerSpy = vi.spyOn(telegramModule, "answerTelegramCallback").mockResolvedValue();

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_seller_real",
          data: "s:confirmed:TMP-1002",
          from: { id: REAL_SELLER_USER_ID },
          message: {
            message_id: 302,
            chat: { id: REAL_SELLER_CHAT_ID },
            text: "📦 Order #TMP-1002\nStatus: NEW",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.newStatus).toBe("confirmed");
    expect(answerSpy).toHaveBeenCalledWith("cb_seller_real", expect.stringContaining("Status updated to Confirmed"));
  });

  it("3. stranger tap on a demo order in demo channel works", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "DEMO-2001",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: DEMO_CHANNEL_ID,
        rowRef: "Sheet1!A4:AC4",
        isDemo: true,
      },
      redis,
      86400
    );

    vi.spyOn(sheetsModule, "updateSheetOrderStatusWithRetry").mockResolvedValue();
    const editSpy = vi.spyOn(telegramModule, "editTelegramOrderMessage").mockResolvedValue();
    const answerSpy = vi.spyOn(telegramModule, "answerTelegramCallback").mockResolvedValue();

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_stranger_demo",
          data: "s:confirmed:DEMO-2001",
          from: { id: STRANGER_USER_ID },
          message: {
            message_id: 401,
            chat: { id: DEMO_CHANNEL_ID },
            text: "📦 [ডেমো] Order #DEMO-2001\nStatus: NEW\n👤 Customer: Test",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.newStatus).toBe("confirmed");
    expect(editSpy).toHaveBeenCalledWith(
      DEMO_CHANNEL_ID,
      401,
      expect.stringContaining("[ডেমো]"),
      "confirmed",
      "DEMO-2001"
    );
    expect(answerSpy).toHaveBeenCalledWith("cb_stranger_demo", expect.stringContaining("Status updated to Confirmed"));
  });

  it("4. tap with a demo order id from a chat that is not the demo channel is rejected", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "DEMO-2002",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: DEMO_CHANNEL_ID,
        rowRef: "Sheet1!A5:AC5",
        isDemo: true,
      },
      redis
    );

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_wrong_channel",
          data: "s:confirmed:DEMO-2002",
          from: { id: STRANGER_USER_ID },
          message: {
            message_id: 402,
            chat: { id: OTHER_CHAT_ID },
            text: "📦 [ডেমো] Order #DEMO-2002\nStatus: NEW",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized chat ID");
    expect(data.changed).toBe(false);
  });

  it("5. demo tap rate limit: 10 allowed per minute, 11th rejected with short Bangla message", async () => {
    const redis = getRedisDriver();
    const orderNumber = "DEMO-2003";
    await storeOrderMeta(
      orderNumber,
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: DEMO_CHANNEL_ID,
        rowRef: "Sheet1!A6:AC6",
        isDemo: true,
      },
      redis
    );

    vi.spyOn(sheetsModule, "updateSheetOrderStatusWithRetry").mockResolvedValue();
    vi.spyOn(telegramModule, "editTelegramOrderMessage").mockResolvedValue();
    const answerSpy = vi.spyOn(telegramModule, "answerTelegramCallback").mockResolvedValue();

    const rateLimitedUser = "user_rate_limit_demo";

    // 10 taps should be processed without rate limit error
    for (let i = 1; i <= 10; i++) {
      const res = await POST(
        makeWebhookRequest({
          callback_query: {
            id: `cb_tap_${i}`,
            data: "s:confirmed:DEMO-2003",
            from: { id: rateLimitedUser },
            message: {
              message_id: 500 + i,
              chat: { id: DEMO_CHANNEL_ID },
              text: "📦 [ডেমো] Order #DEMO-2003\nStatus: NEW",
            },
          },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.rateLimited).toBeUndefined();
    }

    // 11th tap must be rate limited
    const res11 = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_tap_11",
          data: "s:confirmed:DEMO-2003",
          from: { id: rateLimitedUser },
          message: {
            message_id: 511,
            chat: { id: DEMO_CHANNEL_ID },
            text: "📦 [ডেমো] Order #DEMO-2003\nStatus: NEW",
          },
        },
      })
    );

    expect(res11.status).toBe(200);
    const data11 = await res11.json();
    expect(data11.rateLimited).toBe(true);
    expect(data11.changed).toBe(false);
    expect(answerSpy).toHaveBeenLastCalledWith(
      "cb_tap_11",
      "অনেক বেশি অনুরোধ, একটু পর চেষ্টা করুন",
      false
    );
  });

  it("6. demo order submission IP rate limit (5 allowed per hour, 6th rejected with 429 and Bangla message)", async () => {
    vi.spyOn(sheetsModule, "appendOrderRowWithRetry").mockResolvedValue({ updatedRange: "Sheet1!A10:AC10" });
    vi.spyOn(telegramModule, "sendTelegramOrderMessage").mockResolvedValue({ messageId: 601 });

    const testIp = "192.168.100.42";

    // 5 submissions from testIp should succeed
    for (let i = 1; i <= 5; i++) {
      const payload = {
        slug: "demo-brand",
        name: `Tester ${i}`,
        phone: `0171100223${i}`,
        address: "House 10, Road 5, Block B, Mirpur 10",
        district: "Dhaka",
        zone: "dhaka-city",
        color: "deep-indigo",
        size: "L (42)",
        quantity: 1,
        paymentMethod: "cod",
        idempotencyKey: `demo-ip-test-key-${i}`,
        formStartedAt: Date.now() - 5000,
        lang: "bn",
      };

      const res = await orderPost(makeOrderRequest(payload, testIp));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    }

    // 6th submission from testIp must be rejected with 429 and friendly Bangla message
    const payload6 = {
      slug: "demo-brand",
      name: "Tester 6",
      phone: "01711002236",
      address: "House 10, Road 5, Block B, Mirpur 10",
      district: "Dhaka",
      zone: "dhaka-city",
      color: "deep-indigo",
      size: "L (42)",
      quantity: 1,
      paymentMethod: "cod",
      idempotencyKey: "demo-ip-test-key-6",
      formStartedAt: Date.now() - 5000,
      lang: "bn",
    };

    const res6 = await orderPost(makeOrderRequest(payload6, testIp));
    expect(res6.status).toBe(429);
    const data6 = await res6.json();
    expect(data6.ok).toBe(false);
    expect(data6.error).toBe("ডেমো এখন ব্যস্ত, একটু পরে চেষ্টা করুন");
  });

  it("6b. demo order submission global rate limit (60 allowed per hour, 61st rejected with 429)", async () => {
    const redis = getRedisDriver();
    // Simulate global count reaching 60
    await redis.set("rl:demo:global", 60);

    const payload = {
      slug: "demo-brand",
      name: "Global Tester",
      phone: "01711002299",
      address: "House 10, Road 5, Block B, Mirpur 10",
      district: "Dhaka",
      zone: "dhaka-city",
      color: "deep-indigo",
      size: "L (42)",
      quantity: 1,
      paymentMethod: "cod",
      idempotencyKey: "demo-global-test-key-61",
      formStartedAt: Date.now() - 5000,
      lang: "bn",
    };

    const res = await orderPost(makeOrderRequest(payload, "192.168.100.99"));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("ডেমো এখন ব্যস্ত, একটু পরে চেষ্টা করুন");
  });

  it("7. demo order masks phone and address in Sheet and Telegram, and includes statusUrl for testing", async () => {
    let capturedSheetRow: unknown[] = [];
    let capturedTelegramPayload: telegramModule.TelegramOrderPayload | null = null;

    vi.spyOn(sheetsModule, "appendOrderRowWithRetry").mockImplementation(async (_id, row) => {
      capturedSheetRow = row;
      return { updatedRange: "Sheet1!A15:AC15" };
    });

    vi.spyOn(telegramModule, "sendTelegramOrderMessage").mockImplementation(async (_chat, payload) => {
      capturedTelegramPayload = payload;
      return { messageId: 701 };
    });

    const payload = {
      slug: "demo-brand",
      name: "Tanjim Demo Customer",
      phone: "01819998877",
      address: "Road 15, Sector 11, Uttara, Dhaka",
      district: "Dhaka",
      zone: "dhaka-city",
      color: "deep-indigo",
      size: "L (42)",
      quantity: 1,
      paymentMethod: "cod",
      idempotencyKey: "demo-masking-test-key-1",
      formStartedAt: Date.now() - 5000,
      lang: "bn",
    };

    const res = await orderPost(makeOrderRequest(payload, "192.168.200.50"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    // Verify Google Sheet masking: phone masked, address replaced by "***"
    expect(capturedSheetRow[4]).toBe("01XXX-XXX***");
    expect(capturedSheetRow[5]).toBe("***");

    // Verify Telegram payload masking and demo flags
    expect(capturedTelegramPayload).not.toBeNull();
    expect(capturedTelegramPayload!.phone).toBe("01XXX-XXX***");
    expect(capturedTelegramPayload!.address).toBe("***");
    expect(capturedTelegramPayload!.isDemo).toBe(true);
    expect(capturedTelegramPayload!.statusUrl).toContain("/demo-brand/order/");

    // Verify formatted HTML has [ডেমো], masked phone, no tel: link, and includes status link
    const formattedHtml = telegramModule.formatTelegramOrderHtml(capturedTelegramPayload!);
    expect(formattedHtml).toContain("[ডেমো]");
    expect(formattedHtml).toContain("01XXX-XXX***");
    expect(formattedHtml).not.toContain("tel:01");
    expect(formattedHtml).toContain("Status Link:");
    expect(formattedHtml).toContain("/demo-brand/order/");

    // Verify Redis metadata stores masked PII and isDemo flag
    const meta = await getOrderMeta(data.orderNumber, getRedisDriver());
    expect(meta).not.toBeNull();
    expect(meta!.isDemo).toBe(true);
    expect(meta!.phone).toBe("01XXX-XXX***");
    expect(meta!.address).toBe("***");
  });

  it("8. demo order Redis state gets 24h TTL (86400s)", async () => {
    const redis = getRedisDriver();
    const setSpy = vi.spyOn(redis, "set");

    await storeOrderMeta(
      "DEMO-3001",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: DEMO_CHANNEL_ID,
        rowRef: "Sheet1!A20:AC20",
        isDemo: true,
      },
      redis
    );

    expect(setSpy).toHaveBeenCalledWith(
      "ordmeta:DEMO-3001",
      expect.objectContaining({ isDemo: true }),
      { ex: 86400 }
    );

    await storeOrderToken("demo_token_12345", { slug: "demo-brand", orderNumber: "DEMO-3001" }, redis, 86400);

    expect(setSpy).toHaveBeenCalledWith(
      "ordtoken:demo_token_12345",
      { slug: "demo-brand", orderNumber: "DEMO-3001" },
      { ex: 86400 }
    );
  });

  it("9. demoMode is strictly server-only and excluded from PublicClientConfig", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { ClientConfigSchema, toPublicClientConfig } = await import("../src/lib/config-schema");

    const rawDemo = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../clients/demo-brand.json"), "utf8")
    );
    expect(rawDemo.demoMode).toBe(true);
    const parsed = ClientConfigSchema.parse(rawDemo);
    expect(parsed.demoMode).toBe(true);

    const publicConfig = toPublicClientConfig(parsed) as Record<string, unknown>;
    expect(publicConfig.demoMode).toBeUndefined();
    expect(publicConfig.sellerTelegramUserId).toBeUndefined();
    expect(publicConfig.sheetId).toBeUndefined();
    expect(publicConfig.telegramChatId).toBeUndefined();
  });
});
