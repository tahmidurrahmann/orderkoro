import type { SupportedLocale } from "./format";
import type { LocalizedText } from "./i18n";

/**
 * Safe Order Summary stored in sessionStorage after order creation.
 * Deliberately excludes customer PII (name, phone, address) from URLs and analytics.
 */
export interface SafeOrderSummary {
  orderNumber: string;
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
  confirmationMode: "call" | "tap";
  language: SupportedLocale;
  eventId: string;
  createdAtIso: string;
}

export function getOrderStorageKey(slug: string): string {
  return `orderpage_last_order_${slug}`;
}

let cachedRaw: string | null = null;
let cachedSummary: SafeOrderSummary | null = null;

export function saveOrderSummaryToSession(summary: SafeOrderSummary): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const raw = JSON.stringify(summary);
      window.sessionStorage.setItem(
        getOrderStorageKey(summary.slug),
        raw
      );
      cachedRaw = raw;
      cachedSummary = summary;
    }
  } catch {
    // Ignore storage quota or private mode errors gracefully
  }
}

export function readOrderSummaryFromSession(slug: string): SafeOrderSummary | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return null;
    }
    const raw = window.sessionStorage.getItem(getOrderStorageKey(slug));
    if (!raw) {
      cachedRaw = null;
      cachedSummary = null;
      return null;
    }
    if (raw === cachedRaw && cachedSummary && cachedSummary.slug === slug) {
      return cachedSummary;
    }
    const parsed = JSON.parse(raw) as SafeOrderSummary;
    if (
      !parsed ||
      typeof parsed.orderNumber !== "string" ||
      parsed.slug !== slug ||
      typeof parsed.total !== "number"
    ) {
      cachedRaw = null;
      cachedSummary = null;
      return null;
    }
    cachedRaw = raw;
    cachedSummary = parsed;
    return cachedSummary;
  } catch {
    return null;
  }
}

export function clearOrderSummaryFromSession(slug: string): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem(getOrderStorageKey(slug));
      cachedRaw = null;
      cachedSummary = null;
    }
  } catch {
    // Ignore storage quota or private mode errors gracefully
  }
}

export function hasFiredPurchaseForOrder(orderNumber: string): boolean {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return false;
    return window.sessionStorage.getItem(`purch_fired:${orderNumber}`) === "1";
  } catch {
    return false;
  }
}

export function markPurchaseFiredForOrder(orderNumber: string): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(`purch_fired:${orderNumber}`, "1");
    }
  } catch {
    // Ignore storage quota or private mode errors gracefully
  }
}
