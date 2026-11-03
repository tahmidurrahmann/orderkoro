import "server-only";

export type OrderStatus =
  | "new"
  | "confirmed"
  | "no_answer"
  | "cancelled"
  | "shipped"
  | "delivered"
  | "returned";

export const VALID_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "no_answer",
  "cancelled",
  "shipped",
  "delivered",
  "returned",
];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "no_answer", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  no_answer: ["confirmed", "cancelled"],
  cancelled: [],
  delivered: [],
  returned: [],
};

export function canTransitionStatus(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as OrderStatus];
  if (!allowed) return false;
  return allowed.includes(to as OrderStatus);
}

export function buildCallbackData(action: OrderStatus, orderNumber: string): string {
  const data = `s:${action}:${orderNumber}`;
  if (Buffer.byteLength(data, "utf8") > 64) {
    throw new Error(`Callback data exceeds Telegram 64-byte limit: ${data}`);
  }
  return data;
}

const ACTION_ALIASES: Record<string, OrderStatus> = {
  confirm: "confirmed",
  confirmed: "confirmed",
  cancel: "cancelled",
  cancelled: "cancelled",
  no_answer: "no_answer",
  noanswer: "no_answer",
  shipped: "shipped",
  delivered: "delivered",
  returned: "returned",
};

export type ParsedCallbackData =
  | { type?: "status"; action: OrderStatus; orderNumber: string }
  | { type: "payment"; paymentAction: "verified" | "not_received"; orderNumber: string };

export function parseCallbackData(
  data: string
): ParsedCallbackData | null {
  const parts = data.split(":");
  if (parts.length < 3) {
    return null;
  }

  if (parts[0] === "pay") {
    const act = parts[1].toLowerCase();
    const orderNumber = parts.slice(2).join(":");
    if (!orderNumber) return null;
    if (act === "v" || act === "verified") {
      return { type: "payment", paymentAction: "verified", orderNumber };
    }
    if (act === "nr" || act === "not_received") {
      return { type: "payment", paymentAction: "not_received", orderNumber };
    }
    return null;
  }

  if (parts[0] === "s") {
    const rawAction = parts[1].toLowerCase();
    const action = ACTION_ALIASES[rawAction];
    const orderNumber = parts.slice(2).join(":");
    if (!action || !VALID_STATUSES.includes(action) || action === "new" || !orderNumber) {
      return null;
    }
    return { action, orderNumber };
  }

  return null;
}

export function buildMobilePaymentInlineKeyboard(
  paymentStatus: "Unverified" | "Not received",
  orderNumber: string
): TelegramInlineKeyboard {
  if (paymentStatus === "Not received") {
    return {
      inline_keyboard: [
        [
          { text: "✅ Payment verified", callback_data: `pay:v:${orderNumber}` },
        ],
        [
          { text: "❌ Cancel", callback_data: buildCallbackData("cancelled", orderNumber) },
        ],
      ],
    };
  }

  return {
    inline_keyboard: [
      [
        { text: "✅ Payment verified", callback_data: `pay:v:${orderNumber}` },
      ],
      [
        { text: "⏳ Not received", callback_data: `pay:nr:${orderNumber}` },
        { text: "❌ Cancel", callback_data: buildCallbackData("cancelled", orderNumber) },
      ],
    ],
  };
}

export interface TelegramInlineButton {
  text: string;
  callback_data: string;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineButton[][];
}

export function buildStatusInlineKeyboard(
  status: OrderStatus,
  orderNumber: string
): TelegramInlineKeyboard {
  switch (status) {
    case "new":
      return {
        inline_keyboard: [
          [
            { text: "✅ Confirm", callback_data: buildCallbackData("confirmed", orderNumber) },
            { text: "📵 No answer", callback_data: buildCallbackData("no_answer", orderNumber) },
          ],
          [
            { text: "❌ Cancel", callback_data: buildCallbackData("cancelled", orderNumber) },
          ],
        ],
      };
    case "confirmed":
      return {
        inline_keyboard: [
          [
            { text: "🚚 Shipped", callback_data: buildCallbackData("shipped", orderNumber) },
          ],
          [
            { text: "❌ Cancel", callback_data: buildCallbackData("cancelled", orderNumber) },
          ],
        ],
      };
    case "shipped":
      return {
        inline_keyboard: [
          [
            { text: "📦 Delivered", callback_data: buildCallbackData("delivered", orderNumber) },
            { text: "↩️ Returned", callback_data: buildCallbackData("returned", orderNumber) },
          ],
        ],
      };
    case "no_answer":
      return {
        inline_keyboard: [
          [
            { text: "✅ Confirm", callback_data: buildCallbackData("confirmed", orderNumber) },
          ],
          [
            { text: "❌ Cancel", callback_data: buildCallbackData("cancelled", orderNumber) },
          ],
        ],
      };
    case "cancelled":
    case "delivered":
    case "returned":
    default:
      return {
        inline_keyboard: [],
      };
  }
}
