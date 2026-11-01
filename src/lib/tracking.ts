"use client";

/**
 * Meta Pixel & Facebook Attribution Tracking Utilities (Stage 3)
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Formats a standard Facebook Click ID (_fbc) cookie string:
 * format: fb.1.<timestamp>.<fbclid>
 */
export function buildFbcFromFbclid(fbclid: string, timestamp: number = Date.now()): string {
  const cleanFbclid = fbclid.trim();
  return `fb.1.${timestamp}.${cleanFbclid}`;
}

/**
 * Reads standard _fbp and _fbc attribution parameters from document.cookie,
 * with automatic fallback to build _fbc if fbclid is found in URL query parameters.
 */
export function getFbAttribution(searchQuery?: string): { fbp?: string; fbc?: string } {
  if (typeof window === "undefined") {
    return {};
  }

  const result: { fbp?: string; fbc?: string } = {};

  try {
    const cookies = document.cookie ? document.cookie.split("; ") : [];
    for (const cookie of cookies) {
      const [name, ...valParts] = cookie.split("=");
      const val = valParts.join("=");
      if (name === "_fbp") {
        result.fbp = decodeURIComponent(val);
      } else if (name === "_fbc") {
        result.fbc = decodeURIComponent(val);
      }
    }
  } catch {
    // Ignore cookie reading errors
  }

  // Fallback: If _fbc is missing, check URL parameters for fbclid
  if (!result.fbc) {
    try {
      const queryStr = searchQuery ?? window.location.search;
      const params = new URLSearchParams(queryStr);
      const fbclid = params.get("fbclid");
      if (fbclid && fbclid.trim().length > 0) {
        result.fbc = buildFbcFromFbclid(fbclid);
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  return result;
}

/**
 * Safely calls window.fbq with provided arguments if available.
 */
export function callFbq(...args: unknown[]): void {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq(...args);
    }
  } catch {
    // Silent fail if adblocker blocks fbq
  }
}

export function trackPageView(): void {
  callFbq("track", "PageView");
}

export function trackViewContent(slug: string, price: number): void {
  callFbq("track", "ViewContent", {
    content_ids: [slug],
    content_type: "product",
    value: price,
    currency: "BDT",
  });
}

export function trackInitiateCheckout(): void {
  callFbq("track", "InitiateCheckout");
}

export function trackPurchase(orderNumber: string, total: number): void {
  callFbq(
    "track",
    "Purchase",
    {
      value: total,
      currency: "BDT",
      content_type: "product",
    },
    { eventID: orderNumber }
  );
}
