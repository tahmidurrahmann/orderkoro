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

export function saveOrderSummaryToSession(summary: SafeOrderSummary): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(
        getOrderStorageKey(summary.slug),
        JSON.stringify(summary)
      );
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
      return null;
    }
    const parsed = JSON.parse(raw) as SafeOrderSummary;
    if (
      !parsed ||
      typeof parsed.orderNumber !== "string" ||
      parsed.slug !== slug ||
      typeof parsed.total !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Generates a realistic Stage 1 mock order number in Asia/Dhaka time:
 * <orderPrefix>-<YYMMDD>-<4-digit sequence>
 */
export function generateMockOrderNumber(orderPrefix: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const yy = parts.find((p) => p.type === "year")?.value ?? "26";
  const mm = parts.find((p) => p.type === "month")?.value ?? "10";
  const dd = parts.find((p) => p.type === "day")?.value ?? "31";

  let seq = 1;
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const seqKey = `orderpage_mock_seq_${orderPrefix}_${yy}${mm}${dd}`;
      const prev = parseInt(window.sessionStorage.getItem(seqKey) || "0", 10);
      seq = Number.isNaN(prev) ? 1 : prev + 1;
      window.sessionStorage.setItem(seqKey, String(seq));
    }
  } catch {
    seq = 1;
  }

  return `${orderPrefix}-${yy}${mm}${dd}-${String(seq).padStart(4, "0")}`;
}
