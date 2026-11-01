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

export function parseCallbackData(
  data: string
): { action: OrderStatus; orderNumber: string } | null {
  const parts = data.split(":");
  if (parts.length < 3 || parts[0] !== "s") {
    return null;
  }
  const rawAction = parts[1].toLowerCase();
  const action = ACTION_ALIASES[rawAction];
  const orderNumber = parts.slice(2).join(":");
  if (!action || !VALID_STATUSES.includes(action) || action === "new" || !orderNumber) {
    return null;
  }
  return { action, orderNumber };
}

export interface TelegramInlineButton {
  text: string;
  callback_data: string;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineButton[][];
}

const STATUS_BUTTON_LABELS: Record<OrderStatus, { en: string; bn: string }> = {
  new: { en: "New", bn: "নতুন" },
  confirmed: { en: "✅ Confirm", bn: "✅ নিশ্চিত" },
  no_answer: { en: "📵 No Answer", bn: "📵 ফোন ধরেননি" },
  cancelled: { en: "❌ Cancel", bn: "❌ বাতিল" },
  shipped: { en: "🚚 Shipped", bn: "🚚 কুরিয়ারে দেওয়া হয়েছে" },
  delivered: { en: "📦 Delivered", bn: "📦 ডেলিভার্ড" },
  returned: { en: "↩️ Returned", bn: "↩️ রিটার্ন" },
};

export function buildStatusInlineKeyboard(
  status: OrderStatus,
  orderNumber: string
): TelegramInlineKeyboard {
  const nextActions = VALID_TRANSITIONS[status] || [];
  if (nextActions.length === 0) {
    return { inline_keyboard: [] };
  }

  const buttons: TelegramInlineButton[] = nextActions.map((action) => ({
    text: STATUS_BUTTON_LABELS[action].en,
    callback_data: buildCallbackData(action, orderNumber),
  }));

  return {
    inline_keyboard: [buttons],
  };
}
