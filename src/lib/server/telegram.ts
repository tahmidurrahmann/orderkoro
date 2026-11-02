import "server-only";

import {
  buildMobilePaymentInlineKeyboard,
  buildStatusInlineKeyboard,
  type OrderStatus,
  type TelegramInlineKeyboard,
} from "./status-machine";

export interface TelegramOrderPayload {
  orderNumber: string;
  createdAtDhakaIso: string;
  status: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  zone: string;
  productTitle: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  deliveryFee: number;
  codTotal: number;
  paymentMethod?: string;
  paymentStatus?: "COD" | "Unverified" | "Verified" | "Not received";
  transactionId?: string;
  paidFrom?: string;
  note?: string;
  confirmationMode: string;
}

export function escapeTelegramHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatTelegramOrderHtml(
  order: TelegramOrderPayload,
  status: OrderStatus = "new",
  repeatPhoneFlag = false
): string {
  const lines: string[] = [];

  lines.push(`📦 <b>Order #${escapeTelegramHtml(order.orderNumber)}</b>`);
  lines.push(`Status: <b>${status.toUpperCase()}</b>`);

  if (repeatPhoneFlag) {
    lines.push(`⚠️ <b>REPEAT PHONE</b> (3rd order in 24h)`);
  }

  lines.push("");
  lines.push(`👤 <b>Customer:</b> ${escapeTelegramHtml(order.name)}`);
  lines.push(`📞 <b>Phone:</b> <a href="tel:${escapeTelegramHtml(order.phone)}">${escapeTelegramHtml(order.phone)}</a>`);
  lines.push(`📍 <b>Address:</b> ${escapeTelegramHtml(order.address)}, ${escapeTelegramHtml(order.district)} (${escapeTelegramHtml(order.zone)})`);
  lines.push("");
  lines.push(`🛍️ <b>Item:</b> ${escapeTelegramHtml(order.productTitle)}`);
  lines.push(`🎨 <b>Color:</b> ${escapeTelegramHtml(order.color)}`);
  lines.push(`📏 <b>Size:</b> ${escapeTelegramHtml(order.size)}`);
  lines.push(`🔢 <b>Qty:</b> ${order.quantity} × ৳${order.unitPrice}`);
  lines.push(`🚚 <b>Delivery:</b> ৳${order.deliveryFee}`);
  const isMobilePayment = Boolean(order.paymentMethod && order.paymentMethod !== "cod");
  const actualMethodName =
    order.paymentMethod === "bkash"
      ? "bKash"
      : order.paymentMethod === "nagad"
      ? "Nagad"
      : order.paymentMethod === "rocket"
      ? "Rocket"
      : "Cash on Delivery";
  const methodLabel =
    order.paymentMethod === "bkash"
      ? "bKash (বিকাশ)"
      : order.paymentMethod === "nagad"
      ? "Nagad (নগদ)"
      : order.paymentMethod === "rocket"
      ? "Rocket (রকেট)"
      : "Cash on Delivery";

  if (isMobilePayment) {
    lines.push(`💳 <b>Payment Method:</b> ${escapeTelegramHtml(methodLabel)}`);
    if (order.paymentStatus) {
      lines.push(`📊 <b>Payment Status:</b> <b>${escapeTelegramHtml(order.paymentStatus)}</b>`);
    }
    if (order.transactionId) {
      lines.push(`🧾 <b>TrxID:</b> <code>${escapeTelegramHtml(order.transactionId)}</code>`);
    }
    if (order.paidFrom) {
      lines.push(`📱 <b>Paid From:</b> <code>${escapeTelegramHtml(order.paidFrom)}</code>`);
    }
    lines.push(`💵 <b>Expected Amount:</b> <b>৳${order.codTotal}</b>`);
    if (!order.paymentStatus || order.paymentStatus === "Unverified") {
      lines.push(`⚠️ <b>UNVERIFIED: check your ${actualMethodName} app before shipping</b>`);
    }
  } else {
    lines.push(`💳 <b>Payment:</b> ${escapeTelegramHtml(methodLabel)}`);
    lines.push(`💵 <b>Total Payable:</b> <b>৳${order.codTotal}</b>`);
  }

  if (order.note) {
    lines.push(`📝 <b>Note:</b> ${escapeTelegramHtml(order.note)}`);
  }
  if (order.confirmationMode) {
    lines.push(`📞 <b>Confirmation Mode:</b> ${escapeTelegramHtml(order.confirmationMode)}`);
  }

  return lines.join("\n");
}

async function fetchWithRetry(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const doFetch = () =>
    fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });

  let res = await doFetch();
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 600));
    res = await doFetch();
  }
  return res;
}

export async function sendTelegramOrderMessage(
  chatId: string | number,
  order: TelegramOrderPayload,
  repeatPhoneFlag = false
): Promise<{ messageId: number }> {
  if (process.env.MOCK_INTEGRATIONS === "1") {
    return { messageId: 1001 };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  const rawText = formatTelegramOrderHtml(order, "new", repeatPhoneFlag);
  const text = rawText.length > 4000 ? rawText.slice(0, 3950) + "\n...[truncated]" : rawText;
  const isMobile = Boolean(order.paymentMethod && order.paymentMethod !== "cod");
  const replyMarkup = isMobile && order.paymentStatus !== "Verified"
    ? buildMobilePaymentInlineKeyboard(
        order.paymentStatus === "Not received" ? "Not received" : "Unverified",
        order.orderNumber
      )
    : buildStatusInlineKeyboard("new", order.orderNumber);

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram sendMessage failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { result?: { message_id?: number } };
  return {
    messageId: data.result?.message_id || 0,
  };
}

export async function editTelegramOrderMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  status: OrderStatus,
  orderNumber: string,
  customReplyMarkup?: TelegramInlineKeyboard
): Promise<void> {
  if (process.env.MOCK_INTEGRATIONS === "1") {
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const replyMarkup = customReplyMarkup || buildStatusInlineKeyboard(status, orderNumber);
  const url = `https://api.telegram.org/bot${token}/editMessageText`;

  await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
}

export async function answerTelegramCallback(
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<void> {
  if (process.env.MOCK_INTEGRATIONS === "1") {
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
}

export function getAdminChatId(): string {
  const adminChatId = (process.env.ADMIN_TELEGRAM_CHAT_ID || "").trim();
  if (!adminChatId) {
    throw new Error("Missing required environment variable: ADMIN_TELEGRAM_CHAT_ID");
  }
  return adminChatId;
}

export async function sendAdminTelegramAlert(
  chatId: string | number,
  text: string
): Promise<{ ok: boolean; messageId?: number; description?: string }> {
  if (process.env.MOCK_INTEGRATIONS === "1") {
    return { ok: true, messageId: 1002 };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  const truncatedText = text.length > 3500 ? text.slice(0, 3490) + "...[truncated]" : text;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: truncatedText,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = (await res.json()) as { ok: boolean; result?: { message_id?: number }; description?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, description: data.description || `HTTP ${res.status}` };
  }
  return { ok: true, messageId: data.result?.message_id };
}
