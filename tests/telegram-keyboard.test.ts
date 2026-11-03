import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/telegram/webhook/route";
import { getRedisDriver, storeOrderMeta } from "../src/lib/server/redis";
import * as sheetsModule from "../src/lib/server/sheets";
import * as telegramModule from "../src/lib/server/telegram";
import {
  buildMobilePaymentInlineKeyboard,
  buildStatusInlineKeyboard,
  type OrderStatus,
  type TelegramInlineKeyboard,
} from "../src/lib/server/status-machine";
import {
  formatTelegramOrderHtml,
  getDeliveryZoneLabel,
  type TelegramOrderPayload,
} from "../src/lib/server/telegram";

const SECRET = "test_webhook_secret_12345";
const SELLER_CHAT_ID = "-5233056020";

function makeWebhookRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/telegram/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-telegram-bot-api-secret-token": SECRET,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Validates keyboard layout constraints:
 * - At most two buttons per row
 * - For two-per-row buttons, label length <= 14 characters
 * - Every button contains an emoji
 * - Callback data <= 64 bytes
 */
export function assertKeyboardConstraints(keyboard: TelegramInlineKeyboard): void {
  for (const [rowIndex, row] of keyboard.inline_keyboard.entries()) {
    if (row.length > 2) {
      throw new Error(`Row ${rowIndex} has ${row.length} buttons, exceeding max limit of 2`);
    }
    if (row.length === 2) {
      for (const [btnIndex, btn] of row.entries()) {
        if (btn.text.length > 14) {
          throw new Error(
            `Button "${btn.text}" at row ${rowIndex}, col ${btnIndex} exceeds 14 chars (${btn.text.length})`
          );
        }
      }
    }
    for (const btn of row) {
      if (!/\p{Emoji}/u.test(btn.text)) {
        throw new Error(`Button "${btn.text}" is missing an emoji`);
      }
      if (Buffer.byteLength(btn.callback_data, "utf8") > 64) {
        throw new Error(`Button "${btn.text}" callback_data exceeds 64 bytes: ${btn.callback_data}`);
      }
    }
  }
}

describe("Telegram Keyboard Layout Constraints & State Specifications", () => {
  it("validator rejects keyboards with more than 2 buttons in any row", () => {
    const invalidKeyboard: TelegramInlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Button 1", callback_data: "cb:1" },
          { text: "⏳ Button 2", callback_data: "cb:2" },
          { text: "❌ Button 3", callback_data: "cb:3" },
        ],
      ],
    };
    expect(() => assertKeyboardConstraints(invalidKeyboard)).toThrow(/exceeding max limit of 2/);
  });

  it("validator rejects two-button rows with labels exceeding 14 characters", () => {
    const invalidKeyboard: TelegramInlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ ThisIsTooLongLabel", callback_data: "cb:1" },
          { text: "❌ Cancel", callback_data: "cb:2" },
        ],
      ],
    };
    expect(() => assertKeyboardConstraints(invalidKeyboard)).toThrow(/exceeds 14 chars/);
  });

  it("validator rejects buttons without emojis", () => {
    const invalidKeyboard: TelegramInlineKeyboard = {
      inline_keyboard: [
        [
          { text: "No Emoji Here", callback_data: "cb:1" },
        ],
      ],
    };
    expect(() => assertKeyboardConstraints(invalidKeyboard)).toThrow(/missing an emoji/);
  });

  it("1. new mobile-payment order: [✅ Payment verified] / [⏳ Not received | ❌ Cancel]", () => {
    const kb = buildMobilePaymentInlineKeyboard("Unverified", "ORD-1001");
    assertKeyboardConstraints(kb);

    expect(kb.inline_keyboard).toHaveLength(2);
    // Row 1: 1 button
    expect(kb.inline_keyboard[0]).toHaveLength(1);
    expect(kb.inline_keyboard[0][0]).toEqual({
      text: "✅ Payment verified",
      callback_data: "pay:v:ORD-1001",
    });
    // Row 2: 2 buttons (both <= 14 chars)
    expect(kb.inline_keyboard[1]).toHaveLength(2);
    expect(kb.inline_keyboard[1][0]).toEqual({
      text: "⏳ Not received",
      callback_data: "pay:nr:ORD-1001",
    });
    expect(kb.inline_keyboard[1][1]).toEqual({
      text: "❌ Cancel",
      callback_data: "s:cancelled:ORD-1001",
    });
  });

  it("2. after not received: [✅ Payment verified] / [❌ Cancel]", () => {
    const kb = buildMobilePaymentInlineKeyboard("Not received", "ORD-1002");
    assertKeyboardConstraints(kb);

    expect(kb.inline_keyboard).toHaveLength(2);
    expect(kb.inline_keyboard[0]).toHaveLength(1);
    expect(kb.inline_keyboard[0][0]).toEqual({
      text: "✅ Payment verified",
      callback_data: "pay:v:ORD-1002",
    });
    expect(kb.inline_keyboard[1]).toHaveLength(1);
    expect(kb.inline_keyboard[1][0]).toEqual({
      text: "❌ Cancel",
      callback_data: "s:cancelled:ORD-1002",
    });
  });

  it("3. new COD order or after payment verified: [✅ Confirm | 📵 No answer] / [❌ Cancel]", () => {
    const kb = buildStatusInlineKeyboard("new", "ORD-1003");
    assertKeyboardConstraints(kb);

    expect(kb.inline_keyboard).toHaveLength(2);
    // Row 1: 2 buttons (both <= 14 chars)
    expect(kb.inline_keyboard[0]).toHaveLength(2);
    expect(kb.inline_keyboard[0][0]).toEqual({
      text: "✅ Confirm",
      callback_data: "s:confirmed:ORD-1003",
    });
    expect(kb.inline_keyboard[0][1]).toEqual({
      text: "📵 No answer",
      callback_data: "s:no_answer:ORD-1003",
    });
    // Row 2: 1 button
    expect(kb.inline_keyboard[1]).toHaveLength(1);
    expect(kb.inline_keyboard[1][0]).toEqual({
      text: "❌ Cancel",
      callback_data: "s:cancelled:ORD-1003",
    });
  });

  it("4. confirmed: [🚚 Shipped] / [❌ Cancel]", () => {
    const kb = buildStatusInlineKeyboard("confirmed", "ORD-1004");
    assertKeyboardConstraints(kb);

    expect(kb.inline_keyboard).toHaveLength(2);
    expect(kb.inline_keyboard[0]).toHaveLength(1);
    expect(kb.inline_keyboard[0][0]).toEqual({
      text: "🚚 Shipped",
      callback_data: "s:shipped:ORD-1004",
    });
    expect(kb.inline_keyboard[1]).toHaveLength(1);
    expect(kb.inline_keyboard[1][0]).toEqual({
      text: "❌ Cancel",
      callback_data: "s:cancelled:ORD-1004",
    });
  });

  it("5. shipped: [📦 Delivered | ↩️ Returned]", () => {
    const kb = buildStatusInlineKeyboard("shipped", "ORD-1005");
    assertKeyboardConstraints(kb);

    expect(kb.inline_keyboard).toHaveLength(1);
    expect(kb.inline_keyboard[0]).toHaveLength(2);
    expect(kb.inline_keyboard[0][0]).toEqual({
      text: "📦 Delivered",
      callback_data: "s:delivered:ORD-1005",
    });
    expect(kb.inline_keyboard[0][1]).toEqual({
      text: "↩️ Returned",
      callback_data: "s:returned:ORD-1005",
    });
  });

  it("6. no_answer status: [✅ Confirm] / [❌ Cancel]", () => {
    const kb = buildStatusInlineKeyboard("no_answer", "ORD-1006");
    assertKeyboardConstraints(kb);

    expect(kb.inline_keyboard).toHaveLength(2);
    expect(kb.inline_keyboard[0][0]).toEqual({
      text: "✅ Confirm",
      callback_data: "s:confirmed:ORD-1006",
    });
    expect(kb.inline_keyboard[1][0]).toEqual({
      text: "❌ Cancel",
      callback_data: "s:cancelled:ORD-1006",
    });
  });

  it("7. terminal states have empty keyboards", () => {
    const terminalStates: OrderStatus[] = ["delivered", "returned", "cancelled"];
    for (const st of terminalStates) {
      const kb = buildStatusInlineKeyboard(st, "ORD-1007");
      expect(kb.inline_keyboard).toEqual([]);
    }
  });
});

describe("Delivery Zone Label in Address Line", () => {
  const sampleZones = [
    { id: "dhaka_city", label: { bn: "ঢাকা সিটি", en: "Dhaka City" } },
    { id: "dhaka_suburb", label: { bn: "ঢাকা পার্শ্ববর্তী", en: "Dhaka Suburb" } },
    { id: "outside_dhaka", label: { bn: "ঢাকার বাইরে", en: "Outside Dhaka" } },
  ];

  const baseOrder: TelegramOrderPayload = {
    orderNumber: "BNN-5001",
    createdAtDhakaIso: "2026-11-03T05:30:00+06:00",
    status: "new",
    name: "Rahim Uddin",
    phone: "01711000000",
    address: "House 10, Road 4, Sector 7",
    district: "Dhaka",
    zone: "dhaka_city",
    productTitle: "Cotton Panjabi",
    color: "White",
    size: "42",
    quantity: 1,
    unitPrice: 1200,
    deliveryFee: 70,
    codTotal: 1270,
    confirmationMode: "call",
  };

  it("resolves delivery zone label helper in seller language", () => {
    expect(getDeliveryZoneLabel("dhaka_city", sampleZones, "bn")).toBe("ঢাকা সিটি");
    expect(getDeliveryZoneLabel("dhaka_city", sampleZones, "en")).toBe("Dhaka City");
    expect(getDeliveryZoneLabel("outside_dhaka", sampleZones, "bn")).toBe("ঢাকার বাইরে");
    expect(getDeliveryZoneLabel("unknown_zone", sampleZones, "bn")).toBe("unknown_zone");
  });

  it("displays delivery zone label in Bengali in the Address line", () => {
    const html = formatTelegramOrderHtml(
      baseOrder,
      "new",
      false,
      sampleZones,
      "bn"
    );
    expect(html).toContain("📍 <b>Address:</b> House 10, Road 4, Sector 7, Dhaka (ঢাকা সিটি)");
    expect(html).not.toContain("(dhaka_city)");
  });

  it("displays delivery zone label in English in the Address line when seller language is English", () => {
    const html = formatTelegramOrderHtml(
      baseOrder,
      "new",
      false,
      sampleZones,
      "en"
    );
    expect(html).toContain("📍 <b>Address:</b> House 10, Road 4, Sector 7, Dhaka (Dhaka City)");
    expect(html).not.toContain("(dhaka_city)");
  });

  it("honors pre-resolved order.zoneLabel directly", () => {
    const orderWithLabel: TelegramOrderPayload = {
      ...baseOrder,
      zone: "dhaka_city",
      zoneLabel: "ঢাকা সিটি কর্পোরেশন",
    };
    const html = formatTelegramOrderHtml(orderWithLabel, "new", false);
    expect(html).toContain("📍 <b>Address:</b> House 10, Road 4, Sector 7, Dhaka (ঢাকা সিটি কর্পোরেশন)");
  });
});

describe("Message Editing & Idempotency on Button Press", () => {
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

  it("s:confirm: updates text to CONFIRMED, sets keyboard to [🚚 Shipped] / [❌ Cancel], and repeated press is idempotent", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "BNN-7001",
      {
        slug: "demo-brand",
        status: "new",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: SELLER_CHAT_ID,
        rowRef: "Sheet1!A20:AC20",
      },
      redis
    );

    const sheetSpy = vi.spyOn(sheetsModule, "updateSheetOrderStatusWithRetry").mockResolvedValue();
    const editSpy = vi.spyOn(telegramModule, "editTelegramOrderMessage").mockResolvedValue();

    // 1st press: transition new -> confirmed
    const res1 = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_confirm_1",
          data: "s:confirm:BNN-7001",
          message: {
            message_id: 301,
            chat: { id: SELLER_CHAT_ID },
            text: "📦 Order BNN-7001\nStatus: NEW\n👤 Customer: Test",
          },
        },
      })
    );

    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.ok).toBe(true);
    expect(data1.newStatus).toBe("confirmed");

    // Verified sheet update
    expect(sheetSpy).toHaveBeenCalledTimes(1);
    expect(sheetSpy).toHaveBeenCalledWith(expect.any(String), "Sheet1!A20:AC20", "BNN-7001", "confirmed");

    // Verified message edited with updated status text and confirmed keyboard
    expect(editSpy).toHaveBeenCalledTimes(1);
    expect(editSpy).toHaveBeenCalledWith(
      SELLER_CHAT_ID,
      301,
      expect.stringContaining("Status: <b>CONFIRMED</b>"),
      "confirmed",
      "BNN-7001"
    );

    // 2nd press (repeated press): idempotent
    const res2 = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_confirm_repeat",
          data: "s:confirm:BNN-7001",
          message: {
            message_id: 301,
            chat: { id: SELLER_CHAT_ID },
            text: "📦 Order BNN-7001\nStatus: <b>CONFIRMED</b>\n👤 Customer: Test",
          },
        },
      })
    );

    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.ok).toBe(true);
    expect(data2.idempotent).toBe(true);
    expect(data2.status).toBe("confirmed");

    // Sheet update was not duplicated
    expect(sheetSpy).toHaveBeenCalledTimes(1);
  });

  it("s:shipped: updates status from confirmed to shipped with [📦 Delivered | ↩️ Returned] keyboard", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "BNN-7002",
      {
        slug: "demo-brand",
        status: "confirmed",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: SELLER_CHAT_ID,
        rowRef: "Sheet1!A21:AC21",
      },
      redis
    );

    const sheetSpy = vi.spyOn(sheetsModule, "updateSheetOrderStatusWithRetry").mockResolvedValue();
    const editSpy = vi.spyOn(telegramModule, "editTelegramOrderMessage").mockResolvedValue();

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_ship_1",
          data: "s:shipped:BNN-7002",
          message: {
            message_id: 302,
            chat: { id: SELLER_CHAT_ID },
            text: "📦 Order BNN-7002\nStatus: CONFIRMED\n👤 Customer: Test",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.newStatus).toBe("shipped");

    expect(sheetSpy).toHaveBeenCalledWith(expect.any(String), "Sheet1!A21:AC21", "BNN-7002", "shipped");
    expect(editSpy).toHaveBeenCalledWith(
      SELLER_CHAT_ID,
      302,
      expect.stringContaining("Status: <b>SHIPPED</b>"),
      "shipped",
      "BNN-7002"
    );
  });

  it("s:cancel: updates status to cancelled with empty keyboard", async () => {
    const redis = getRedisDriver();
    await storeOrderMeta(
      "BNN-7003",
      {
        slug: "demo-brand",
        status: "confirmed",
        paymentMethod: "cod",
        paymentStatus: "COD",
        telegramChatId: SELLER_CHAT_ID,
        rowRef: "Sheet1!A22:AC22",
      },
      redis
    );

    const sheetSpy = vi.spyOn(sheetsModule, "updateSheetOrderStatusWithRetry").mockResolvedValue();
    const editSpy = vi.spyOn(telegramModule, "editTelegramOrderMessage").mockResolvedValue();

    const res = await POST(
      makeWebhookRequest({
        callback_query: {
          id: "cb_cancel_1",
          data: "s:cancelled:BNN-7003",
          message: {
            message_id: 303,
            chat: { id: SELLER_CHAT_ID },
            text: "📦 Order BNN-7003\nStatus: CONFIRMED",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.newStatus).toBe("cancelled");

    expect(sheetSpy).toHaveBeenCalledWith(expect.any(String), "Sheet1!A22:AC22", "BNN-7003", "cancelled");
    expect(editSpy).toHaveBeenCalledWith(
      SELLER_CHAT_ID,
      303,
      expect.stringContaining("Status: <b>CANCELLED</b>"),
      "cancelled",
      "BNN-7003"
    );
  });
});
