export interface TelegramInlineButton {
  text: string;
  callback_data: string;
}

export interface TelegramSendMessageOptions {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "MarkdownV2" | "Markdown";
  replyMarkup?: {
    inline_keyboard: TelegramInlineButton[][];
  };
}

export interface FormatTelegramOrderParams {
  orderNumber: string;
  brandName: string;
  customerName: string;
  phone: string;
  address: string;
  district: string;
  zoneLabel: string;
  productTitle: string;
  size: string;
  color: string;
  quantity: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  note?: string;
  flags: string[];
  dhakaTime: string;
  sheetSaved: boolean;
  status?: string;
}

/**
 * Escapes characters for Telegram HTML parse mode: &, <, >, "
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generates inline keyboard buttons matching current order status
 */
export function getStatusInlineButtons(
  status: string,
  orderNumber: string
): TelegramInlineButton[][] {
  switch (status) {
    case "new":
      return [
        [
          { text: "✅ Confirm", callback_data: `s:confirm:${orderNumber}` },
          { text: "❌ Cancel", callback_data: `s:cancel:${orderNumber}` },
        ],
      ];
    case "confirmed":
      return [
        [
          { text: "🚚 Shipped", callback_data: `s:shipped:${orderNumber}` },
          { text: "❌ Cancel", callback_data: `s:cancel:${orderNumber}` },
        ],
      ];
    case "shipped":
      return [
        [
          { text: "🎉 Delivered", callback_data: `s:delivered:${orderNumber}` },
          { text: "↩️ Returned", callback_data: `s:returned:${orderNumber}` },
        ],
      ];
    case "delivered":
    case "returned":
    case "cancelled":
    default:
      return [];
  }
}

/**
 * Formats Telegram notification message body in HTML parse mode
 */
export function formatTelegramOrderMessage(params: FormatTelegramOrderParams): string {
  const statusDisplay = (params.status || "new").toUpperCase();
  const phoneEscaped = escapeHtml(params.phone);
  const cleanPhone = params.phone.replace(/[^\d+]/g, "");

  const lines: string[] = [
    `🛍️ <b>নতুন অর্ডার | ${escapeHtml(params.brandName)}</b>`,
    `📋 <b>অর্ডার নং:</b> <code>${escapeHtml(params.orderNumber)}</code>`,
    `📌 <b>স্ট্যাটাস:</b> <code>${statusDisplay}</code>`,
    `⏰ <b>সময়:</b> ${escapeHtml(params.dhakaTime)}`,
    ``,
    `👤 <b>গ্রাহক:</b> ${escapeHtml(params.customerName)}`,
    `📞 <b>ফোন:</b> <a href="tel:${cleanPhone}">${phoneEscaped}</a>`,
    `📍 <b>ঠিকানা:</b> ${escapeHtml(params.address)}`,
    `🏛️ <b>জেলা ও জোন:</b> ${escapeHtml(params.district)} (${escapeHtml(params.zoneLabel)})`,
    ``,
    `📦 <b>পণ্য:</b> ${escapeHtml(params.productTitle)}`,
    `🎨 <b>রঙ:</b> ${escapeHtml(params.color)} | <b>সাইজ:</b> ${escapeHtml(params.size)}`,
    `🔢 <b>পরিমাণ:</b> ${params.quantity} টি`,
    ``,
    `💵 <b>সাবটোটাল:</b> ৳${params.subtotal}`,
    `🚚 <b>ডেলিভারি চার্জ:</b> ৳${params.deliveryCharge}`,
    `💰 <b>সর্বমোট প্রদেয়:</b> ৳${params.total} (ক্যাশ অন ডেলিভারি)`,
  ];

  if (params.note && params.note.trim()) {
    lines.push(`📝 <b>নোট:</b> ${escapeHtml(params.note.trim())}`);
  }

  if (params.flags && params.flags.length > 0) {
    lines.push(``, `🚩 <b>ফ্ল্যাগ:</b>`);
    for (const flag of params.flags) {
      lines.push(`  • ${escapeHtml(flag)}`);
    }
  }

  if (!params.sheetSaved) {
    lines.push(``, `⚠️ <b>সতর্কতা: Google Sheet-এ সেভ করা যায়নি! (ডাটা Redis-এ সংরক্ষিত)</b>`);
  }

  return lines.join("\n");
}

/**
 * Sends a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: { inline_keyboard: TelegramInlineButton[][] }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Telegram] Warning: TELEGRAM_BOT_TOKEN not configured. Skipping message.");
    return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    });

    const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!res.ok || !data.ok) {
      console.error(`[Telegram] sendMessage failed: ${data.description}`);
      return { ok: false, error: data.description };
    }

    return { ok: true, messageId: data.result?.message_id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Telegram] Error sending message: ${message}`);
    return { ok: false, error: message };
  }
}

/**
 * Updates an existing Telegram message's text and buttons
 */
export async function editTelegramMessageText(
  chatId: string | number,
  messageId: number,
  newText: string,
  replyMarkup?: { inline_keyboard: TelegramInlineButton[][] }
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const endpoint = `https://api.telegram.org/bot${token}/editMessageText`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    });

    const data = (await res.json()) as { ok: boolean };
    return Boolean(data.ok);
  } catch (err) {
    console.error("[Telegram] Error editing message:", err);
    return false;
  }
}

/**
 * Answers a Telegram callback query with feedback toast
 */
export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text: string,
  showAlert = false
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const endpoint = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });

    const data = (await res.json()) as { ok: boolean };
    return Boolean(data.ok);
  } catch (err) {
    console.error("[Telegram] Error answering callback query:", err);
    return false;
  }
}
