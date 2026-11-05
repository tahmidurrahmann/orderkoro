import { describe, it, expect, beforeEach, vi } from "vitest";
import { BRAND_WORDMARK_TEXT } from "@/components/landing/LandingHeader";
import { LANDING, LANDING_CLAIMS } from "@/lib/landing-config";
import { LANDING_COPY, getPricingLine } from "@/lib/landing-copy";
import {
  getSavedLocale,
  saveLocalePreference,
  subscribeLocale,
} from "@/lib/locale-preference";

describe("Landing Page Header, Language Switch, Config, and Copy Unit Tests", () => {
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

    it("ensures eyebrow copy is non-empty and has no leading 'OrderKoro •'", () => {
      expect(LANDING_COPY.eyebrow.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.eyebrow.en.trim()).toBeTruthy();
      expect(LANDING_COPY.eyebrow.bn).not.toMatch(/^OrderKoro\s*•/);
      expect(LANDING_COPY.eyebrow.en).not.toMatch(/^OrderKoro\s*•/);
    });
  });

  describe("2. Single-Language Landing Copy Completeness", () => {
    it("has non-empty bn and en strings for all hero, compare, how, benefits, proof, pricing, faq, and footer items", () => {
      // Hero
      expect(LANDING_COPY.hero.line1.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.line1.en.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.line2.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.line2.en.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.subline.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.subline.en.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.primaryCta.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.primaryCta.en.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.secondaryCta.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.hero.secondaryCta.en.trim()).toBeTruthy();

      // Compare (before / after)
      expect(LANDING_COPY.compare.rows.length).toBeGreaterThan(0);
      for (const row of LANDING_COPY.compare.rows) {
        expect(row.a.bn.trim()).toBeTruthy();
        expect(row.a.en.trim()).toBeTruthy();
        expect(row.b.bn.trim()).toBeTruthy();
        expect(row.b.en.trim()).toBeTruthy();
      }

      // How it works
      expect(LANDING_COPY.how.steps.length).toBe(3);
      for (const step of LANDING_COPY.how.steps) {
        expect(step.title.bn.trim()).toBeTruthy();
        expect(step.title.en.trim()).toBeTruthy();
        expect(step.description.bn.trim()).toBeTruthy();
        expect(step.description.en.trim()).toBeTruthy();
      }

      // Benefits
      expect(LANDING_COPY.benefits.items.length).toBeGreaterThan(0);
      for (const item of LANDING_COPY.benefits.items) {
        expect(item.title.bn.trim()).toBeTruthy();
        expect(item.title.en.trim()).toBeTruthy();
        expect(item.description.bn.trim()).toBeTruthy();
        expect(item.description.en.trim()).toBeTruthy();
      }

      // Proof (demo)
      expect(LANDING_COPY.proof.warning.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.proof.warning.en.trim()).toBeTruthy();
      expect(LANDING_COPY.proof.channelButton.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.proof.channelButton.en.trim()).toBeTruthy();

      // Pricing
      expect(LANDING_COPY.pricing.earlyCard.scopeText.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.pricing.earlyCard.scopeText.en.trim()).toBeTruthy();
      expect(LANDING_COPY.pricing.standardCard.features.length).toBeGreaterThan(
        0,
      );
      expect(
        LANDING_COPY.pricing.standardCard.extraCosts.length,
      ).toBeGreaterThan(0);

      // FAQ
      expect(LANDING_COPY.faq.items.length).toBeGreaterThan(0);
      for (const faq of LANDING_COPY.faq.items) {
        expect(faq.question.bn.trim()).toBeTruthy();
        expect(faq.question.en.trim()).toBeTruthy();
        expect(faq.answer.bn.trim()).toBeTruthy();
        expect(faq.answer.en.trim()).toBeTruthy();
      }

      // Footer
      expect(LANDING_COPY.footer.privacy.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.footer.privacy.en.trim()).toBeTruthy();
      expect(LANDING_COPY.footer.terms.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.footer.terms.en.trim()).toBeTruthy();
      expect(LANDING_COPY.footer.copyright.bn.trim()).toBeTruthy();
      expect(LANDING_COPY.footer.copyright.en.trim()).toBeTruthy();
    });

    it("ensures zero em dashes or en dashes in any copy string", () => {
      const allText = JSON.stringify(LANDING_COPY);
      expect(allText).not.toContain("\u2014"); // em dash
      expect(allText).not.toContain("\u2013"); // en dash
    });
  });

  describe("3. Honesty and Claim Flag Rules", () => {
    it("hides Pixel/CAPI benefit card when pixelCapi is false", () => {
      expect(LANDING_CLAIMS.pixelCapi).toBe(false);
      const pixelBenefit = LANDING_COPY.benefits.items.find(
        (item) => item.id === "benefit-pixel",
      );
      expect(pixelBenefit).toBeUndefined();
    });

    it("displays 'শিগগিরই' in the Pixel FAQ when pixelCapi is false", () => {
      const pixelFaq = LANDING_COPY.faq.items.find(
        (item) => item.id === "faq-pixel",
      );
      expect(pixelFaq).toBeDefined();
      expect(pixelFaq?.answer.bn).toContain("শিগগিরই");
      expect(pixelFaq?.answer.en).toContain("Coming soon");
    });

    it("does not render any monthly price when monthly is null", () => {
      expect(LANDING.monthly).toBeNull();
      const pricingLine = getPricingLine();
      expect(pricingLine.bn).not.toContain("মাসিক");
      expect(pricingLine.en).not.toContain("Monthly");
    });
  });

  describe("4. Pricing Early Offer Logic", () => {
    it("keeps early offer numbers consistent", () => {
      expect(LANDING.earlyOfferTotal).toBeGreaterThan(0);
      expect(LANDING.earlyOfferRemaining).toBeGreaterThanOrEqual(0);
      expect(LANDING.earlyOfferRemaining).toBeLessThanOrEqual(
        LANDING.earlyOfferTotal,
      );
    });
  });

  describe("5. Locale Preference and Storage Safety", () => {
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
