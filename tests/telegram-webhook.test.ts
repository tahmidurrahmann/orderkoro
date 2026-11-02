import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/telegram/webhook/route";
import { getRedisDriver, storeOrderMeta } from "../src/lib/server/redis";
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
  beforeEach(() => {
    vi.stubEnv("MOCK_INTEGRATIONS", "1");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("ADMIN_TELEGRAM_CHAT_ID", "-1001234567890");
    vi.restoreAllMocks();
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
