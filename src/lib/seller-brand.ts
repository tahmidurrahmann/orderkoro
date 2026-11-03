import type { PublicClientConfig } from "@/lib/config-schema";

/**
 * Returns the favicon URL for a seller storefront.
 * - Uses seller's own faviconUrl if configured.
 * - Else uses seller's logoUrl if configured.
 * - If the seller has no logo or favicon, generates a letter tile (first letter of brand name,
 *   seller primary colour background, white letter) as an inline SVG data URI.
 * - Never falls back to the OrderKoro platform favicon.
 */
export function getSellerFavicon(config: PublicClientConfig): string {
  const defaultLang = config.language?.default || "bn";

  // 1. Explicit faviconUrl
  const rawFavicon = config.brand.faviconUrl;
  const favicon =
    typeof rawFavicon === "string"
      ? rawFavicon
      : rawFavicon
        ? defaultLang === "en"
          ? rawFavicon.en || rawFavicon.bn
          : rawFavicon.bn || rawFavicon.en
        : undefined;

  if (favicon && favicon.trim()) {
    return favicon.trim();
  }

  // 2. Logo URL if provided
  const logo =
    typeof config.brand.logoUrl === "string"
      ? config.brand.logoUrl
      : config.brand.logoUrl?.[defaultLang] ||
        config.brand.logoUrl?.en ||
        config.brand.logoUrl?.bn;

  if (logo && logo.trim()) {
    return logo.trim();
  }

  // 3. Fallback: Dynamic Letter Tile SVG
  const brandName =
    typeof config.brand.name === "string"
      ? config.brand.name
      : config.brand.name?.[defaultLang] ||
        config.brand.name?.en ||
        config.brand.name?.bn ||
        "O";

  const firstLetter = (brandName.trim()[0] || "O").toUpperCase();
  const bg = config.brand.primaryColor || "#1E3A5F";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="bold">${firstLetter}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
