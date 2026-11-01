import { toLatinDigits } from "./format";

/**
 * Bangladesh Mobile Phone Normalization & Validation
 * - Accepts Bangla digits (০১৭...) and converts to Latin (017...)
 * - Strips spaces, hyphens, parentheses, plus signs
 * - Accepts +8801XXXXXXXXX, 8801XXXXXXXXX, or 01XXXXXXXXX and normalizes to:
 *     1) 11 digits: 01[3-9]XXXXXXXX
 *     2) E.164: 8801[3-9]XXXXXXXX (for Meta CAPI / server integrations)
 */

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string;
  e164: string;
  errorCode?: "EMPTY" | "INVALID_PREFIX" | "INVALID_LENGTH" | "INVALID_OPERATOR";
}

export function normalizeBdPhone(raw: string): string {
  const latin = toLatinDigits(raw || "").trim();
  const cleaned = latin.replace(/[\s\-().]/g, "");

  if (cleaned.startsWith("+880")) {
    return "0" + cleaned.slice(4);
  }
  if (cleaned.startsWith("880") && cleaned.length === 13) {
    return "0" + cleaned.slice(3);
  }
  if (/^1[3-9]\d{8}$/.test(cleaned)) {
    return "0" + cleaned;
  }
  return cleaned;
}

export function toE164BdPhone(phone: string): string {
  const normalized = normalizeBdPhone(phone);
  if (BD_PHONE_REGEX.test(normalized)) {
    return "88" + normalized;
  }
  return normalized;
}

export function validateBdPhone(raw: string): PhoneValidationResult {
  const normalized = normalizeBdPhone(raw);

  if (!normalized) {
    return { valid: false, normalized: "", e164: "", errorCode: "EMPTY" };
  }

  if (!/^\d+$/.test(normalized) || !normalized.startsWith("01")) {
    return { valid: false, normalized, e164: "", errorCode: "INVALID_PREFIX" };
  }

  if (normalized.length !== 11) {
    return { valid: false, normalized, e164: "", errorCode: "INVALID_LENGTH" };
  }

  if (!BD_PHONE_REGEX.test(normalized)) {
    return { valid: false, normalized, e164: "", errorCode: "INVALID_OPERATOR" };
  }

  return {
    valid: true,
    normalized,
    e164: "88" + normalized,
  };
}

export function maskPhoneForLog(phone: string): string {
  const clean = normalizeBdPhone(phone);
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}****${clean.slice(7)}`;
  }
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
  }
  return "****";
}
