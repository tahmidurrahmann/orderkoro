import { toLatinDigits } from "./format";

/**
 * Bangladesh Mobile Phone Normalization & Validation
 * - Accepts Bangla digits (০১৭...) and converts to Latin (017...)
 * - Strips spaces, hyphens, parentheses
 * - Accepts +8801XXXXXXXXX, 8801XXXXXXXXX, or 01XXXXXXXXX and normalizes to 11 digits: 01[3-9]XXXXXXXX
 */

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string;
  errorCode?: "EMPTY" | "INVALID_PREFIX" | "INVALID_LENGTH" | "INVALID_OPERATOR";
}

export function normalizeBdPhone(raw: string): string {
  const latin = toLatinDigits(raw).trim();
  // Keep leading + temporarily to detect +880, remove spaces/dashes/parens/dots
  const cleaned = latin.replace(/[\s\-().]/g, "");

  if (cleaned.startsWith("+880")) {
    return "0" + cleaned.slice(4);
  }
  if (cleaned.startsWith("880") && cleaned.length === 13) {
    return "0" + cleaned.slice(3);
  }
  // If user typed 1XXXXXXXXX (10 digits missing leading 0)
  if (/^1[3-9]\d{8}$/.test(cleaned)) {
    return "0" + cleaned;
  }
  return cleaned;
}

export function validateBdPhone(raw: string): PhoneValidationResult {
  const normalized = normalizeBdPhone(raw);

  if (!normalized) {
    return { valid: false, normalized: "", errorCode: "EMPTY" };
  }

  if (!/^\d+$/.test(normalized) || !normalized.startsWith("01")) {
    return { valid: false, normalized, errorCode: "INVALID_PREFIX" };
  }

  if (normalized.length !== 11) {
    return { valid: false, normalized, errorCode: "INVALID_LENGTH" };
  }

  if (!BD_PHONE_REGEX.test(normalized)) {
    return { valid: false, normalized, errorCode: "INVALID_OPERATOR" };
  }

  return { valid: true, normalized };
}
