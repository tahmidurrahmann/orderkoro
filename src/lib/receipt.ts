import type { SupportedLocale } from "@/lib/format";
import { formatNumber, formatPrice, localizeDigits } from "@/lib/format";
import type { LocalizedText } from "@/lib/i18n";
import { resolveLocalizedText } from "@/lib/i18n";

export interface StoredReceipt {
  orderNumber: string;
  token?: string;
  slug: string;
  productTitle: LocalizedText;
  colorName: LocalizedText;
  sizeName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  deliveryCharge: number;
  deliveryZoneLabel: LocalizedText;
  daysMin: number;
  daysMax: number;
  total: number;
  deliveryAddress?: string;
  confirmationMode: "call" | "tap";
  language: SupportedLocale;
  paymentMethod?: "cod" | "bkash" | "nagad" | "rocket";
  transactionId?: string;
  createdAtIso: string;
  savedAt?: number;
}

export const RECEIPT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Checks whether a saved receipt timestamp has expired (exceeds 30 days).
 */
export function isReceiptExpired(savedAt?: number, now: number = Date.now()): boolean {
  if (typeof savedAt !== "number" || isNaN(savedAt) || savedAt <= 0) {
    return true;
  }
  return now - savedAt > RECEIPT_EXPIRY_MS;
}

export function getReceiptStorageKey(slug: string): string {
  return `orderpage_receipt_${slug}`;
}

export function getLegacyStorageKey(slug: string): string {
  return `orderpage_last_order_${slug}`;
}

/**
 * Formats an ISO date string in Asia/Dhaka time zone.
 */
export function formatDhakaDateTime(isoString: string, lang: SupportedLocale): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const localeStr = lang === "bn" ? "bn-BD" : "en-US";
    return new Intl.DateTimeFormat(localeStr, options).format(date);
  } catch {
    return isoString;
  }
}

let cachedRaw: string | null = null;
let cachedReceipt: StoredReceipt | null = null;

/**
 * Saves receipt fields to sessionStorage (for current tab) and localStorage (for 30-day persistence).
 * Wrapped in try/catch to operate safely in private browsing or when storage is blocked.
 */
export function saveReceiptToStorage(receipt: StoredReceipt): void {
  try {
    if (typeof window === "undefined") return;

    const key = getReceiptStorageKey(receipt.slug);
    const legacyKey = getLegacyStorageKey(receipt.slug);
    const payload = JSON.stringify({
      ...receipt,
      savedAt: Date.now(),
    });

    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(key, payload);
        window.sessionStorage.setItem(legacyKey, payload);
      }
    } catch {}

    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, payload);
      }
    } catch {}

    cachedRaw = payload;
    cachedReceipt = JSON.parse(payload);
  } catch {}
}

/**
 * Reads the last stored receipt for a seller slug.
 * Checks sessionStorage first, then falls back to localStorage with a 30-day expiry check.
 * Caches parsed result by raw string to prevent infinite React re-renders in useSyncExternalStore.
 */
export function readReceiptFromStorage(
  slug: string,
  now: number = Date.now()
): StoredReceipt | null {
  try {
    if (typeof window === "undefined") return null;

    const key = getReceiptStorageKey(slug);
    const legacyKey = getLegacyStorageKey(slug);

    let raw: string | null = null;

    // 1. Try sessionStorage first
    try {
      if (window.sessionStorage) {
        raw =
          window.sessionStorage.getItem(key) ||
          window.sessionStorage.getItem(legacyKey);
      }
    } catch {}

    // 2. Try localStorage if sessionStorage is empty
    if (!raw) {
      try {
        if (window.localStorage) {
          raw = window.localStorage.getItem(key);
        }
      } catch {}
    }

    if (!raw) {
      cachedRaw = null;
      cachedReceipt = null;
      return null;
    }

    // If raw JSON string has not changed, return cached reference
    if (raw === cachedRaw && cachedReceipt && cachedReceipt.slug === slug) {
      if (isReceiptExpired(cachedReceipt.savedAt, now)) {
        try {
          window.localStorage?.removeItem(key);
        } catch {}
        cachedRaw = null;
        cachedReceipt = null;
        return null;
      }
      return cachedReceipt;
    }

    const parsed = JSON.parse(raw) as StoredReceipt;
    if (parsed && parsed.slug === slug && typeof parsed.orderNumber === "string") {
      if (isReceiptExpired(parsed.savedAt, now)) {
        try {
          window.localStorage?.removeItem(key);
        } catch {}
        cachedRaw = null;
        cachedReceipt = null;
        return null;
      }
      cachedRaw = raw;
      cachedReceipt = parsed;
      return cachedReceipt;
    }

    cachedRaw = null;
    cachedReceipt = null;
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears receipt from storage and invalidates cache.
 */
export function clearReceiptFromStorage(slug: string): void {
  try {
    if (typeof window === "undefined") return;
    const key = getReceiptStorageKey(slug);
    const legacyKey = getLegacyStorageKey(slug);
    try {
      window.sessionStorage?.removeItem(key);
      window.sessionStorage?.removeItem(legacyKey);
    } catch {}
    try {
      window.localStorage?.removeItem(key);
    } catch {}
    cachedRaw = null;
    cachedReceipt = null;
  } catch {}
}

export interface BuildReceiptPlainTextOptions {
  receipt: StoredReceipt;
  brandName: string;
  lang: SupportedLocale;
  reassurance?: string;
  phone?: string;
  messengerUsername?: string;
}

/**
 * Builds a clean, human-readable plain-text summary of the order receipt.
 * Suitable for clipboard copying, SMS, WhatsApp, and messaging apps.
 */
export function buildReceiptPlainText({
  receipt,
  brandName,
  lang,
  reassurance,
  phone,
  messengerUsername,
}: BuildReceiptPlainTextOptions): string {
  const isBn = lang === "bn";
  const title = resolveLocalizedText(receipt.productTitle, lang);
  const color = resolveLocalizedText(receipt.colorName, lang);
  const size = localizeDigits(receipt.sizeName, lang);
  const qty = formatNumber(receipt.quantity, lang);
  const unitPrice = formatPrice(receipt.unitPrice, lang);
  const subtotal = formatPrice(receipt.subtotal, lang);
  const zoneLabel = resolveLocalizedText(receipt.deliveryZoneLabel, lang);
  const delivery =
    receipt.deliveryCharge === 0
      ? isBn
        ? "ফ্রি (৳০)"
        : "Free (৳0)"
      : formatPrice(receipt.deliveryCharge, lang);
  const total = formatPrice(receipt.total, lang);
  const formattedDate = formatDhakaDateTime(receipt.createdAtIso, lang);

  const paymentMethodLabel = (() => {
    switch (receipt.paymentMethod) {
      case "bkash":
        return isBn ? "বিকাশ (bKash)" : "bKash";
      case "nagad":
        return isBn ? "নগদ (Nagad)" : "Nagad";
      case "rocket":
        return isBn ? "রকেট (Rocket)" : "Rocket";
      case "cod":
      default:
        return isBn ? "ক্যাশ অন ডেলিভারি (COD)" : "Cash on Delivery (COD)";
    }
  })();

  const lines: string[] = [];

  // Header
  lines.push("==============================");
  lines.push(isBn ? `${brandName} - অর্ডার রসিদ` : `${brandName} - Order Receipt`);
  lines.push("==============================");
  lines.push(`${isBn ? "অর্ডার নম্বর" : "Order Number"}: ${receipt.orderNumber}`);
  lines.push(`${isBn ? "তারিখ ও সময়" : "Date & Time"}: ${formattedDate}`);
  lines.push("");

  // Product details
  lines.push(`${isBn ? "পণ্য" : "Product"}: ${title}`);
  lines.push(`${isBn ? "ভ্যারিয়েন্ট" : "Variant"}: ${color} (${isBn ? "সাইজ" : "Size"}: ${size})`);
  lines.push(`${isBn ? "পরিমাণ" : "Quantity"}: ${qty}`);
  lines.push(`${isBn ? "একক মূল্য" : "Unit Price"}: ${unitPrice}`);
  lines.push(`${isBn ? "সাবটোটাল" : "Subtotal"}: ${subtotal}`);
  lines.push(`${isBn ? "ডেলিভারি চার্জ" : "Delivery Fee"}: ${delivery} (${zoneLabel})`);
  lines.push("------------------------------");
  lines.push(`${isBn ? "সর্বমোট প্রদেয়" : "Total Amount"}: ${total}`);
  lines.push("------------------------------");

  // Delivery details
  if (receipt.deliveryAddress && receipt.deliveryAddress.trim()) {
    lines.push(`${isBn ? "ডেলিভারি ঠিকানা" : "Delivery Address"}: ${receipt.deliveryAddress.trim()}`);
  }
  lines.push(`${isBn ? "ডেলিভারি এলাকা" : "Delivery Zone"}: ${zoneLabel}`);
  lines.push("");

  // Payment details
  lines.push(`${isBn ? "পেমেন্ট মাধ্যম" : "Payment Method"}: ${paymentMethodLabel}`);
  if (receipt.paymentMethod && receipt.paymentMethod !== "cod") {
    if (receipt.transactionId) {
      lines.push(`${isBn ? "ট্রানজেকশন আইডি (TrxID)" : "Transaction ID (TrxID)"}: ${receipt.transactionId}`);
    }
    lines.push(
      `${isBn ? "পেমেন্ট স্ট্যাটাস" : "Payment Status"}: ${
        isBn ? "বিক্রেতা কর্তৃক যাচাই প্রক্রিয়াধীন" : "Payment being verified by seller"
      }`
    );
  }
  lines.push("");

  // What happens next
  lines.push(`${isBn ? "পরবর্তী ধাপ" : "Next Steps"}:`);
  const nextStepLine =
    receipt.confirmationMode === "call"
      ? isBn
        ? "ডেলিভারির পূর্বে বিক্রেতা আপনাকে ফোন করে অর্ডারটি নিশ্চিত করবেন।"
        : "The seller will call you to confirm your order before dispatch."
      : isBn
      ? "বিক্রেতা সরাসরি অর্ডারটি প্রসেস করবেন এবং দ্রুত কুরিয়ারে পাঠাবেন।"
      : "The seller will process and dispatch your order directly.";

  const timelineLine = isBn
    ? `আনুমানিক ডেলিভারি সময়সীমা: ${formatNumber(receipt.daysMin, lang)} থেকে ${formatNumber(
        receipt.daysMax,
        lang
      )} কার্যদিবস।`
    : `Estimated delivery: ${receipt.daysMin} to ${receipt.daysMax} business days.`;

  lines.push(`${nextStepLine} ${timelineLine}`);
  lines.push("");

  // Policy reassurance if provided
  if (reassurance && reassurance.trim()) {
    lines.push(`${isBn ? "পলিসি ও নিশ্চয়তা" : "Policy & Guarantee"}:`);
    lines.push(reassurance.trim());
    lines.push("");
  }

  // Seller assistance
  const contactLines: string[] = [];
  if (phone && phone.trim()) {
    contactLines.push(`${isBn ? "ফোন" : "Phone"}: ${phone.trim()}`);
  }
  if (messengerUsername && messengerUsername.trim() && !messengerUsername.startsWith("TODO")) {
    contactLines.push(`Messenger: m.me/${messengerUsername.trim()}`);
  }
  if (contactLines.length > 0) {
    lines.push(`${isBn ? "যোগাযোগ ও সহায়তা" : "Customer Support"}:`);
    lines.push(...contactLines);
    lines.push("");
  }

  lines.push("==============================");
  lines.push("OrderKoro - Smart Single Product Checkout");

  return lines.join("\n");
}
