import { describe, it, expect, beforeEach, vi } from "vitest";
import { BRAND_WORDMARK_TEXT } from "@/components/landing/LandingHeader";
import { LANDING_COPY, getPricingLine } from "@/lib/landing-copy";
import {
  getSavedLocale,
  saveLocalePreference,
  subscribeLocale,
} from "@/lib/locale-preference";

describe("Landing Page Header, Language Switch, and Copy Unit Tests", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.clear();
      } catch {}
    }
  });

  describe("1. Wordmark Constant and Header Isolation", () => {
    it("exports BRAND_WORDMARK_TEXT as 'OrderKoro'", () => {
      expect(BRAND_WORDMARK_TEXT).toBe("OrderKoro");
    });

    it("ensures eyebrow copy has no leading 'OrderKoro •'", () => {
      expect(LANDING_COPY.eyebrow.bn).not.toMatch(/^OrderKoro\s*•/);
      expect(LANDING_COPY.eyebrow.en).not.toMatch(/^OrderKoro\s*•/);
      expect(LANDING_COPY.eyebrow.bn).toBe("ফেসবুক ও এফ-কমার্স সেলারদের জন্য");
      expect(LANDING_COPY.eyebrow.en).toBe("For Facebook & F-commerce sellers");
    });
  });

  describe("2. Single-Language Landing Copy Completeness", () => {
    it("has valid bn and en strings for all hero, banner, pricing, and action elements", () => {
      // Hero headline & subline
      expect(LANDING_COPY.hero.headline.bn).toBeTruthy();
      expect(LANDING_COPY.hero.headline.en).toBeTruthy();
      expect(LANDING_COPY.hero.subline.bn).toBeTruthy();
      expect(LANDING_COPY.hero.subline.en).toBeTruthy();

      // Banner title
      expect(LANDING_COPY.banner.title.bn).toBeTruthy();
      expect(LANDING_COPY.banner.title.en).toBeTruthy();

      // Features
      expect(LANDING_COPY.features.length).toBeGreaterThan(0);
      for (const f of LANDING_COPY.features) {
        expect(f.title.bn).toBeTruthy();
        expect(f.title.en).toBeTruthy();
        expect(f.body.bn).toBeTruthy();
        expect(f.body.en).toBeTruthy();
      }

      // Pricing heading
      expect(LANDING_COPY.pricing.heading.bn).toBe("প্যাকেজ");
      expect(LANDING_COPY.pricing.heading.en).toBe("Pricing");

      // Actions
      expect(LANDING_COPY.actions.demoButton.bn).toBe("লাইভ ডেমো দেখুন");
      expect(LANDING_COPY.actions.demoButton.en).toBe("View Live Demo");

      // Footer
      expect(LANDING_COPY.footer.bn).toBeTruthy();
      expect(LANDING_COPY.footer.en).toBeTruthy();
    });

    it("computes pricing line for both bn and en correctly", () => {
      const pricing = getPricingLine();
      expect(pricing.bn).toContain("সেটআপ");
      expect(pricing.en).toContain("Setup");
    });
  });

  describe("3. Locale Preference and Storage Safety", () => {
    it("defaults to 'bn' when no locale is saved", () => {
      expect(getSavedLocale("bn")).toBe("bn");
    });

    it("persists language to memory and storage via saveLocalePreference", () => {
      saveLocalePreference("en");
      expect(getSavedLocale("bn")).toBe("en");

      saveLocalePreference("bn");
      expect(getSavedLocale("en")).toBe("bn");
    });

    it("notifies subscribers when language changes", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeLocale(listener);

      saveLocalePreference("en");
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      listener.mockClear();
      saveLocalePreference("bn");
      expect(listener).not.toHaveBeenCalled();
    });

    it("gracefully operates when localStorage is blocked", () => {
      // Simulate window with blocked localStorage
      const originalWindow = globalThis.window;
      try {
        const mockWindow = {
          location: { href: "http://localhost:3000/", search: "" },
          get localStorage() {
            throw new Error("SecurityError: localStorage is blocked");
          },
        } as unknown as Window & typeof globalThis;
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: mockWindow,
        });

        // Does not throw when saving or getting locale
        expect(() => saveLocalePreference("en")).not.toThrow();
        expect(getSavedLocale("bn")).toBe("en");
      } finally {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: originalWindow,
        });
      }
    });
  });
});
