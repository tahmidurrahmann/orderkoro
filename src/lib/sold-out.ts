/**
 * Checks whether a product is effectively sold out:
 * either explicitly marked soldOut: true, or all sizes are unavailable, or all colors are unavailable.
 */
export function isEffectivelySoldOut(
  config: {
    soldOut?: boolean;
    sizes: Array<{ available?: boolean }>;
    colors: Array<{ available?: boolean }>;
  }
): boolean {
  if (config.soldOut) return true;
  if (config.sizes.length > 0 && config.sizes.every((s) => !s.available)) return true;
  if (config.colors.length > 0 && config.colors.every((c) => c.available === false)) return true;
  return false;
}
