import type { SupportedLocale } from "./format";

export const LOCALE_STORAGE_KEY = "orderpage_selected_locale";
export const LOCALE_COOKIE_NAME = "orderpage_locale";

type LocaleListener = () => void;
const listeners = new Set<LocaleListener>();
let inMemoryLocale: SupportedLocale | null = null;

export function subscribeLocale(callback: LocaleListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function notifyLocaleChange(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Retrieves the user's saved language preference from in-memory state, URL param,
 * localStorage, or cookie. Defaults to "bn" if no prior selection exists.
 */
export function getSavedLocale(defaultLocale: SupportedLocale = "bn"): SupportedLocale {
  if (inMemoryLocale) {
    return inMemoryLocale;
  }

  if (typeof window === "undefined") {
    return defaultLocale;
  }

  // 1. Check URL query param (?lang=en or ?lang=bn)
  try {
    if (window.location && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const paramLang = searchParams.get("lang");
      if (paramLang === "bn" || paramLang === "en") {
        inMemoryLocale = paramLang;
        return paramLang;
      }
    }
  } catch {
    // Ignore URL parsing errors
  }

  // 2. Check localStorage
  try {
    const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (fromStorage === "bn" || fromStorage === "en") {
      inMemoryLocale = fromStorage;
      return fromStorage;
    }
  } catch {
    // Ignore storage errors in privacy-restricted environments (e.g. blocked storage)
  }

  // 3. Check cookie fallback
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`)
    );
    if (match && (match[1] === "bn" || match[1] === "en")) {
      inMemoryLocale = match[1] as SupportedLocale;
      return inMemoryLocale;
    }
  } catch {
    // Ignore cookie errors
  }

  return defaultLocale;
}

/**
 * Persists the user's chosen language across page reloads and browser sessions.
 * Writes to in-memory state, localStorage, cookie, synchronizes document.documentElement,
 * and updates ?lang= query param in the address bar.
 */
export function saveLocalePreference(locale: SupportedLocale): void {
  inMemoryLocale = locale;
  notifyLocaleChange();

  if (typeof window === "undefined") return;

  // 1. Keep root html attributes synchronized
  try {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-lang", locale);
  } catch {
    // Ignore DOM attribute errors
  }

  // 2. Update address bar ?lang= param if available without reloading
  try {
    if (window.location) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("lang") !== locale) {
        url.searchParams.set("lang", locale);
        window.history.replaceState(null, "", url.toString());
      }
    }
  } catch {
    // Ignore history errors
  }

  // 3. Persist to localStorage
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage errors when localStorage is blocked
  }

  // 4. Persist to cookie (valid for 1 year across all pages)
  try {
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }

  notifyLocaleChange();
}
