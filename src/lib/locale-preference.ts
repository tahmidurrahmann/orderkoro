import type { SupportedLocale } from "./format";

export const LOCALE_STORAGE_KEY = "orderpage_selected_locale";
export const LOCALE_COOKIE_NAME = "orderpage_locale";

/**
 * Retrieves the user's saved language preference from localStorage or cookie.
 * Defaults to the seller's config default ("bn" or "en") if no prior selection exists.
 */
export function getSavedLocale(defaultLocale: SupportedLocale = "bn"): SupportedLocale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  try {
    // 1. Check localStorage first
    const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (fromStorage === "bn" || fromStorage === "en") {
      return fromStorage;
    }

    // 2. Check cookie fallback
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`)
    );
    if (match && (match[1] === "bn" || match[1] === "en")) {
      return match[1];
    }
  } catch {
    // Ignore storage errors in privacy-restricted environments (e.g. incognito)
  }

  return defaultLocale;
}

/**
 * Persists the user's chosen language across page reloads and browser sessions.
 * Writes to both localStorage and a 1-year cookie, and updates document.documentElement.
 */
export function saveLocalePreference(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Persist to localStorage
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);

    // 2. Persist to cookie (valid for 1 year across all pages)
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;

    // 3. Keep root html attributes synchronized
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-lang", locale);
  } catch {
    // Ignore storage errors in privacy-restricted environments
  }
}
