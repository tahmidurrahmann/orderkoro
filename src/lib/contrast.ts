/**
 * WCAG 2.1 Contrast & Shade Fallback Utilities
 * Ensures client primaryColor always achieves >= 4.5:1 contrast with white (#FFFFFF) button text.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(hex: string): boolean {
  return HEX_REGEX.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  const clean = hex.trim();
  if (!HEX_REGEX.test(clean)) {
    throw new Error(`Invalid hex color "${hex}". Expected #RGB or #RRGGBB.`);
  }
  if (clean.length === 4) {
    const r = clean[1];
    const g = clean[2];
    const b = clean[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return clean.toUpperCase();
}

export function hexToRgb(hex: string): RGB {
  const full = normalizeHex(hex);
  return {
    r: parseInt(full.slice(1, 3), 16),
    g: parseInt(full.slice(3, 5), 16),
    b: parseInt(full.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * Computes WCAG 2.1 relative luminance (0.0 darkest to 1.0 brightest)
 */
export function getRelativeLuminance({ r, g, b }: RGB): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes WCAG 2.1 contrast ratio against white (#FFFFFF, luminance = 1.0)
 */
export function getContrastWithWhite(hex: string): number {
  const lum = getRelativeLuminance(hexToRgb(hex));
  return (1.0 + 0.05) / (lum + 0.05);
}

/**
 * Darkens a hex color iteratively until it achieves at least `minContrast` (default 4.5:1) against white.
 */
export function ensureAccessiblePrimaryColor(
  hex: string,
  contextLabel = "client",
  minContrast = 4.5
): { color: string; originalColor: string; contrast: number; wasAdjusted: boolean } {
  const normalized = normalizeHex(hex);
  const initialContrast = getContrastWithWhite(normalized);

  if (initialContrast >= minContrast) {
    return {
      color: normalized,
      originalColor: normalized,
      contrast: Number(initialContrast.toFixed(2)),
      wasAdjusted: false,
    };
  }

  let { r, g, b } = hexToRgb(normalized);
  let candidate = normalized;
  let currentContrast = initialContrast;

  for (let step = 0; step < 100; step++) {
    r = Math.max(0, Math.floor(r * 0.92 - 2));
    g = Math.max(0, Math.floor(g * 0.92 - 2));
    b = Math.max(0, Math.floor(b * 0.92 - 2));
    candidate = rgbToHex({ r, g, b });
    currentContrast = getContrastWithWhite(candidate);
    if (currentContrast >= minContrast) {
      break;
    }
  }

  console.warn(
    `[OrderKoro Config Warning] ${contextLabel}: primaryColor "${normalized}" has insufficient WCAG AA contrast with white text (${initialContrast.toFixed(
      2
    )}:1 < ${minContrast}:1). Auto-falling back to darker shade "${candidate}" (${currentContrast.toFixed(
      2
    )}:1).`
  );

  return {
    color: candidate,
    originalColor: normalized,
    contrast: Number(currentContrast.toFixed(2)),
    wasAdjusted: true,
  };
}

/**
 * Produces a slightly darker hover shade from a base hex color
 */
export function darkenHex(hex: string, factor = 0.85): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({
    r: r * factor,
    g: g * factor,
    b: b * factor,
  });
}
