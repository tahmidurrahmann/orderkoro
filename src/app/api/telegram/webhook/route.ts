import { NextRequest, NextResponse } from "next/server";
import { getClientByOrderPrefix } from "@/lib/clients";
import {
  getOrderBackup,
  getOrderStatus,
  incrementPhoneStat,
  setOrderStatus,
  type OrderRecord,
} from "@/lib/redis";
import { updateOrderStatusInGoogleSheet } from "@/lib/google-sheets";
import {
  answerTelegramCallbackQuery,
  editTelegramMessageText,
  formatTelegramOrderMessage,
  getStatusInlineButtons,
  sendTelegramMessage,
} from "@/lib/telegram";

type OrderStatus = OrderRecord["status"];

const VALID_TRANSITIONS: Record<OrderStatus, Record<string, OrderStatus>> = {
  new: {
    confirm: "confirmed",
    cancel: "cancelled",
  },
  confirmed: {
    shipped: "shipped",
    cancel: "cancelled",
  },
  shipped: {
    delivered: "delivered",
    returned: "returned",
  },
  delivered: {},
  returned: {},
  cancelled: {},
};

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Secret Token Header
    const secretTokenHeader = req.headers.get("x-telegram-bot-api-secret-token");
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!expectedSecret || secretTokenHeader !== expectedSecret) {
      console.warn("[Telegram Webhook] Unauthorized attempt: Invalid or missing secret token header.");
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let update: any;
    try {
      update = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    // 2. Handle /start command from seller
    if (update.message?.text?.trim().startsWith("/start")) {
      const chatId = String(update.message.chat.id);
      const welcomeText = [
        `👋 <b>OrderPage Bot Connected!</b>`,
        ``,
        `Your Telegram Chat ID is:`,
        `<code>${chatId}</code>`,
        ``,
        `📋 Copy this number into your client config under <code>"telegramChatId"</code> during seller onboarding.`,
      ].join("\n");

      await sendTelegramMessage(chatId, welcomeText);
      return NextResponse.json({ ok: true, handled: "start_command" });
    }

    // 3. Handle Callback Query (Inline Keyboard Buttons)
    const callbackQuery = update.callback_query;
    if (!callbackQuery || !callbackQuery.data) {
      // Ignored update type (e.g. general chat message)
      return NextResponse.json({ ok: true, ignored: true });
    }

    const callbackQueryId = String(callbackQuery.id);
    const callbackData = String(callbackQuery.data); // e.g. "s:confirm:BNN-261101-0001"
    const chatId = String(callbackQuery.message?.chat?.id ?? "");
    const messageId = Number(callbackQuery.message?.message_id);

    // Format check: "s:<action>:<orderNumber>"
    const parts = callbackData.split(":");
    if (parts.length !== 3 || parts[0] !== "s") {
      await answerTelegramCallbackQuery(callbackQueryId, "Unknown button action");
      return NextResponse.json({ ok: true, error: "Invalid callback format" });
    }

    const [, action, orderNumber] = parts;

    // Resolve client prefix from orderNumber (e.g. "BNN" from "BNN-261101-0001")
    const orderPrefix = orderNumber.split("-")[0]?.toUpperCase();
    if (!orderPrefix) {
      await answerTelegramCallbackQuery(callbackQueryId, "Invalid order prefix");
      return NextResponse.json({ ok: true, error: "Missing order prefix" });
    }

    const client = getClientByOrderPrefix(orderPrefix);
    if (!client) {
      await answerTelegramCallbackQuery(callbackQueryId, "Store client not found");
      return NextResponse.json({ ok: true, error: "Client not found" });
    }

    // Verify Chat ID equals client's registered telegramChatId
    if (chatId !== String(client.telegramChatId)) {
      console.warn(
        `[Telegram Webhook] Chat ID mismatch: received ${chatId}, expected ${client.telegramChatId}`
      );
      await answerTelegramCallbackQuery(callbackQueryId, "Unauthorized chat for this order");
      return NextResponse.json({ ok: true, error: "Chat ID mismatch" });
    }

    // Retrieve order record and current status from Redis
    const orderRecord = await getOrderBackup(orderNumber);
    const currentStatus = ((await getOrderStatus(orderNumber)) ||
      orderRecord?.status ||
      "new") as OrderStatus;

    // Target status resolution
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || {};
    const targetStatus = allowedNextStatuses[action];

    // Idempotency: Check if order is already in the target status (e.g. double tap)
    if (currentStatus === (action === "confirm" ? "confirmed" : action)) {
      await answerTelegramCallbackQuery(
        callbackQueryId,
        `Order is already marked as ${currentStatus.toUpperCase()}`
      );
      return NextResponse.json({ ok: true, idempotent: true, status: currentStatus });
    }

    // Check if the transition is invalid
    if (!targetStatus) {
      await answerTelegramCallbackQuery(
        callbackQueryId,
        `Cannot ${action} order when status is already ${currentStatus.toUpperCase()}`
      );
      return NextResponse.json({
        ok: true,
        error: `Invalid status transition from ${currentStatus} via ${action}`,
      });
    }

    // 4. Perform Valid Transition
    // Step A: Update Redis status
    await setOrderStatus(orderNumber, targetStatus);

    // Step B: Update customer phone delivery/return stats if terminal
    const phone = orderRecord?.phone;
    if (phone) {
      if (targetStatus === "delivered") {
        await incrementPhoneStat(phone, "delivered");
      } else if (targetStatus === "returned") {
        await incrementPhoneStat(phone, "returned");
      }
    }

    // Step C: Update Google Sheet Status (Column P)
    let sheetUpdated = false;
    try {
      sheetUpdated = await updateOrderStatusInGoogleSheet(
        client.sheetId,
        orderNumber,
        targetStatus
      );
    } catch (sheetErr) {
      console.error(`[Telegram Webhook] Failed to update Google Sheet for ${orderNumber}:`, sheetErr);
    }

    // Step D: Edit Telegram Message with updated status and next inline buttons
    if (messageId && orderRecord) {
      const activeLang = client.language.default;
      const brandName =
        typeof client.brand.name === "string" ? client.brand.name : client.brand.name[activeLang];

      const updatedText = formatTelegramOrderMessage({
        orderNumber,
        brandName,
        customerName: orderRecord.name,
        phone: orderRecord.phone,
        address: orderRecord.address,
        district: orderRecord.district,
        zoneLabel: orderRecord.zoneLabel,
        productTitle: orderRecord.productTitle,
        size: orderRecord.size,
        color: orderRecord.color,
        quantity: orderRecord.quantity,
        subtotal: orderRecord.subtotal,
        deliveryCharge: orderRecord.deliveryCharge,
        total: orderRecord.total,
        note: orderRecord.note,
        flags: orderRecord.flags,
        dhakaTime: orderRecord.createdAtDhaka,
        sheetSaved: orderRecord.sheetSaved || sheetUpdated,
        status: targetStatus,
      });

      const nextButtons = getStatusInlineButtons(targetStatus, orderNumber);
      await editTelegramMessageText(chatId, messageId, updatedText, {
        inline_keyboard: nextButtons,
      });
    }

    // Step E: Acknowledge Telegram callback query
    await answerTelegramCallbackQuery(
      callbackQueryId,
      `Order status updated to: ${targetStatus.toUpperCase()}`
    );

    return NextResponse.json({
      ok: true,
      orderNumber,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      sheetUpdated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Telegram Webhook] Unexpected error:", errorMsg);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
