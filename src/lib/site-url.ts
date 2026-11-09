/**
 * Site URL Resolver Helper
 * Resolves fully-qualified canonical and metadata URLs for sitemaps, robots, and OpenGraph.
 * Respects NEXT_PUBLIC_SITE_URL, VERCEL_URL, or defaults to https://orderkoro.shop.
 */
export function getSiteUrl(pathname = "/"): URL {
  const rawBase =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://orderkoro.shop");

  const normalizedBase =
    rawBase.startsWith("http://") || rawBase.startsWith("https://")
      ? rawBase
      : `https://${rawBase}`;

  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(cleanPath, normalizedBase);
}
