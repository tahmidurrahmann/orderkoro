/**
 * Unified Numeral, Currency (৳1,290), and Savings Formatter
 * Consistently formats numbers and BDT prices in either Bangla (০-৯) or Latin (0-9) digits.
 */

export type SupportedLocale = "bn" | "en";

const LATIN_TO_BANGLA_DIGITS: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

const BANGLA_TO_LATIN_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/**
 * Converts any Bangla digits in a string to standard ASCII Latin digits (0-9)
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BANGLA_TO_LATIN_DIGITS[d] ?? d);
}

/**
 * Converts any ASCII Latin digits (0-9) in a string to Bangla digits (০-৯)
 */
export function toBanglaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => LATIN_TO_BANGLA_DIGITS[d] ?? d);
}

/**
 * Formats an integer/number using Indian/Bangladeshi grouping (e.g. 1,290 or 1,25,000)
 * and converts digits to the active language's numerals.
 */
export function formatNumber(value: number, lang: SupportedLocale): string {
  const rounded = Math.round(value);
  const isNegative = rounded < 0;
  const absStr = Math.abs(rounded).toString();

  let grouped = absStr;
  if (absStr.length > 3) {
    const lastThree = absStr.slice(-3);
    const otherNumbers = absStr.slice(0, -3);
    grouped =
      otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  const signed = isNegative ? `-${grouped}` : grouped;
  return lang === "bn" ? toBanglaDigits(signed) : signed;
}

/**
 * Formats a BDT amount as ৳1,290 (or ৳১,২৯০ in Bangla)
 */
export function formatPrice(amount: number, lang: SupportedLocale): string {
  return `৳${formatNumber(amount, lang)}`;
}

/**
 * Formats a generic string containing digits into the active language's numerals
 */
export function localizeDigits(text: string, lang: SupportedLocale): string {
  return lang === "bn" ? toBanglaDigits(toLatinDigits(text)) : toLatinDigits(text);
}

/**
 * Computes real savings from price and oldPrice. Returns null if oldPrice is missing or <= price.
 */
export function calculateSavings(
  price: number,
  oldPrice?: number
): { amount: number; percent: number } | null {
  if (typeof oldPrice !== "number" || oldPrice <= price || price < 0) {
    return null;
  }
  const amount = oldPrice - price;
  const percent = Math.round((amount / oldPrice) * 100);
  if (amount <= 0 || percent <= 0) {
    return null;
  }
  return { amount, percent };
}
