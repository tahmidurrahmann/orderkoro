import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import {
  getHeaderReturnChip,
  getHeaderPaymentChip,
  getTrustBadges,
  getProductPolicyParagraph,
  getThankYouReassurance,
  getLegalReturnSection,
  getPrivacyPageSections,
  getTermsPageSections,
  getPolicyLastUpdatedDate,
  getLegalFooterText,
} from "@/lib/policy-text";
import LegalPageClient from "@/components/LegalPageClient";
import type { PublicClientConfig } from "@/lib/config-schema";

function createMockConfig(overrides?: Partial<PublicClientConfig>): PublicClientConfig {
  return {
    slug: "test-brand",
    orderPrefix: "TST",
    brand: {
      name: { bn: "টেস্ট ব্র্যান্ড", en: "Test Brand" },
      logoUrl: "/test-brand/logo.svg",
      primaryColor: "#1E3A5F",
      originalPrimaryColor: "#1E3A5F",
      primaryColorContrast: 8.5,
      primaryColorWasAdjusted: false,
    },
    language: {
      default: "bn",
      allowSwitch: true,
    },
    product: {
      title: { bn: "প্রিমিয়াম শার্ট", en: "Premium Shirt" },
      shortDescription: { bn: "খাঁটি সুতির আরামদায়ক শার্ট", en: "Comfortable pure cotton shirt" },
      price: 1500,
      details: [{ bn: "১০০% কটন", en: "100% Cotton" }],
      images: ["/test-brand/front.webp"],
    },
    colors: [
      {
        id: "blue",
        name: { bn: "নীল", en: "Blue" },
        hex: "#0000FF",
        available: true,
        images: ["/test-brand/front.webp"],
      },
    ],
    sizes: [
      { name: "M", available: true },
      { name: "L", available: true },
    ],
    maxQuantity: 5,
    delivery: {
      defaultZoneId: "inside-dhaka",
      zones: [
        { id: "inside-dhaka", label: { bn: "ঢাকা সিটি", en: "Dhaka City" }, charge: 70, daysMin: 1, daysMax: 2 },
        { id: "outside-dhaka", label: { bn: "ঢাকার বাইরে", en: "Outside Dhaka" }, charge: 130, daysMin: 3, daysMax: 5 },
      ],
      freeDeliveryAbove: 3000,
    },
    contact: {
      phone: "01700000000",
      messengerPageUsername: "testbrand",
      businessAddress: { bn: "মিরপুর, ঢাকা", en: "Mirpur, Dhaka" },
    },
    confirmationMode: "tap",
    customerConfirm: "off",
    payments: {
      cod: { enabled: true },
    },
    soldOut: false,
    testOnly: false,
    status: "active" as const,
    seo: { index: true },
    showPoweredBy: true,
    copy: undefined,
    returnPolicy: {
      return: { enabled: true, days: 0 },
      exchange: { enabled: true, days: 3 },
      returnShippingPaidBy: "customer",
    },
    ...overrides,
  };
}

describe("Single Source of Truth Policy Text Unit Tests", () => {
  describe("1. Header Return Chip Derivation", () => {
    it("returns '{d}-Day Return & Exchange' when both enabled with equal days > 0", () => {
      const policy7 = {
        return: { enabled: true, days: 7 },
        exchange: { enabled: true, days: 7 },
      };
      expect(getHeaderReturnChip(policy7, "bn")).toBe("৭ দিনের রিটার্ন ও এক্সচেঞ্জ");
      expect(getHeaderReturnChip(policy7, "en")).toBe("7-Day Return & Exchange");

      const policy3 = {
        return: { enabled: true, days: 3 },
        exchange: { enabled: true, days: 3 },
      };
      expect(getHeaderReturnChip(policy3, "bn")).toBe("৩ দিনের রিটার্ন ও এক্সচেঞ্জ");
      expect(getHeaderReturnChip(policy3, "en")).toBe("3-Day Return & Exchange");
    });

    it("returns 'Return & Exchange' when both enabled with unequal days or days 0", () => {
      // Unequal days
      const unequal = {
        return: { enabled: true, days: 7 },
        exchange: { enabled: true, days: 3 },
      };
      expect(getHeaderReturnChip(unequal, "bn")).toBe("রিটার্ন ও এক্সচেঞ্জ");
      expect(getHeaderReturnChip(unequal, "en")).toBe("Return & Exchange");

      // Return at delivery (0 days), exchange 3 days (demo-brand configuration)
      const demoBrandPolicy = {
        return: { enabled: true, days: 0 },
        exchange: { enabled: true, days: 3 },
      };
      expect(getHeaderReturnChip(demoBrandPolicy, "bn")).toBe("রিটার্ন ও এক্সচেঞ্জ");
      expect(getHeaderReturnChip(demoBrandPolicy, "en")).toBe("Return & Exchange");
    });

    it("returns '{d}-Day Return' or 'Return at delivery' when only return is enabled", () => {
      const returnDelivery = {
        return: { enabled: true, days: 0 },
        exchange: { enabled: false },
      };
      expect(getHeaderReturnChip(returnDelivery, "bn")).toBe("ডেলিভারির সময় রিটার্ন");
      expect(getHeaderReturnChip(returnDelivery, "en")).toBe("Return at delivery");

      const return7 = {
        return: { enabled: true, days: 7 },
        exchange: { enabled: false },
      };
      expect(getHeaderReturnChip(return7, "bn")).toBe("৭ দিনের রিটার্ন");
      expect(getHeaderReturnChip(return7, "en")).toBe("7-Day Return");
    });

    it("returns '{d}-Day Exchange' when only exchange is enabled", () => {
      const exchange3 = {
        return: { enabled: false },
        exchange: { enabled: true, days: 3 },
      };
      expect(getHeaderReturnChip(exchange3, "bn")).toBe("৩ দিনের এক্সচেঞ্জ");
      expect(getHeaderReturnChip(exchange3, "en")).toBe("3-Day Exchange");
    });

    it("returns null when neither return nor exchange is enabled", () => {
      expect(getHeaderReturnChip(undefined, "bn")).toBeNull();
      expect(getHeaderReturnChip({ return: { enabled: false }, exchange: { enabled: false } }, "bn")).toBeNull();
      expect(getHeaderReturnChip({ return: { enabled: false }, exchange: { enabled: false } }, "en")).toBeNull();
    });
  });

  describe("2. Header Payment Chip Derivation", () => {
    it("returns 'Cash on Delivery' when only COD is enabled", () => {
      const codOnly = { cod: { enabled: true } };
      expect(getHeaderPaymentChip(codOnly, "bn")).toBe("ক্যাশ অন ডেলিভারি");
      expect(getHeaderPaymentChip(codOnly, "en")).toBe("Cash on Delivery");
    });

    it("returns 'COD · <method>' when COD plus exactly one mobile method is enabled", () => {
      const codBkash = {
        cod: { enabled: true },
        bkash: { enabled: true, number: "01711002233", type: "personal" as const },
      };
      expect(getHeaderPaymentChip(codBkash, "bn")).toBe("COD · বিকাশ");
      expect(getHeaderPaymentChip(codBkash, "en")).toBe("COD · bKash");
    });

    it("returns 'COD & mobile payment' when COD plus 2 or more mobile methods are enabled", () => {
      const codMulti = {
        cod: { enabled: true },
        bkash: { enabled: true, number: "01711002233", type: "personal" as const },
        nagad: { enabled: true, number: "01811002233", type: "personal" as const },
        rocket: { enabled: true, number: "01911002233", type: "personal" as const },
      };
      expect(getHeaderPaymentChip(codMulti, "bn")).toBe("ক্যাশ অন ডেলিভারি ও মোবাইল পেমেন্ট");
      expect(getHeaderPaymentChip(codMulti, "en")).toBe("COD & mobile payment");
    });

    it("returns enabled mobile names when COD is disabled", () => {
      const singleMobile = {
        cod: { enabled: false },
        nagad: { enabled: true, number: "01811002233", type: "personal" as const },
      };
      expect(getHeaderPaymentChip(singleMobile, "bn")).toBe("নগদ");
      expect(getHeaderPaymentChip(singleMobile, "en")).toBe("Nagad");

      const threeMobile = {
        cod: { enabled: false },
        bkash: { enabled: true, number: "01711002233", type: "personal" as const },
        nagad: { enabled: true, number: "01811002233", type: "personal" as const },
        rocket: { enabled: true, number: "01911002233", type: "personal" as const },
      };
      expect(getHeaderPaymentChip(threeMobile, "bn")).toBe("বিকাশ, নগদ ও রকেট");
      expect(getHeaderPaymentChip(threeMobile, "en")).toBe("bKash, Nagad, Rocket");
    });
  });

  describe("3. Trust Badges Derivation", () => {
    it("derives payment, return, exchange, and optional quality badges correctly", () => {
      const config = createMockConfig({
        qualityBadge: {
          title: { bn: "১০০% প্রিমিয়াম সুতি", en: "100% Premium Cotton" },
          subtitle: { bn: "খাঁটি সুতায় প্রস্তুত", en: "Crafted from pure yarn" },
        },
      });

      const badgesBn = getTrustBadges(config, "bn");
      expect(badgesBn.some((b) => b.id === "payment")).toBe(true);
      expect(badgesBn.some((b) => b.id === "return" && b.title === "ডেলিভারির সময় রিটার্ন")).toBe(true);
      expect(badgesBn.some((b) => b.id === "exchange" && b.title === "৩ দিনের সহজ এক্সচেঞ্জ")).toBe(true);
      expect(badgesBn.some((b) => b.id === "quality" && b.title === "১০০% প্রিমিয়াম সুতি")).toBe(true);

      const badgesEn = getTrustBadges(config, "en");
      expect(badgesEn.some((b) => b.id === "return" && b.title === "Instant Return at Delivery")).toBe(true);
      expect(badgesEn.some((b) => b.id === "exchange" && b.title === "3-Day Easy Exchange")).toBe(true);
      expect(badgesEn.some((b) => b.id === "quality" && b.title === "100% Premium Cotton")).toBe(true);
    });

    it("hides quality badge when not configured", () => {
      const configWithoutQuality = createMockConfig({ qualityBadge: undefined });
      const badges = getTrustBadges(configWithoutQuality, "en");
      expect(badges.some((b) => b.id === "quality")).toBe(false);
    });

    it("hides return and exchange badges when disabled", () => {
      const configNoReturn = createMockConfig({
        returnPolicy: {
          return: { enabled: false },
          exchange: { enabled: false },
          returnShippingPaidBy: "customer",
        },
      });
      const badges = getTrustBadges(configNoReturn, "en");
      expect(badges.some((b) => b.id === "return")).toBe(false);
      expect(badges.some((b) => b.id === "exchange")).toBe(false);
    });
  });

  describe("4. Product Policy Paragraph & Thank You Reassurance", () => {
    it("generates correct product policy paragraph for demo-brand config (0 days return, 3 days exchange)", () => {
      const policy = {
        return: { enabled: true, days: 0 },
        exchange: { enabled: true, days: 3 },
        returnShippingPaidBy: "customer" as const,
      };
      const textBn = getProductPolicyParagraph(policy, "bn");
      expect(textBn).toContain("ডেলিভারি ম্যানের সামনে চেক");
      expect(textBn).toContain("৩ দিনের মধ্যে সহজ এক্সচেঞ্জ");

      const textEn = getProductPolicyParagraph(policy, "en");
      expect(textEn).toContain("Inspect your product in front of the rider");
      expect(textEn).toContain("3 days");
    });

    it("generates fallback paragraph when both return and exchange are disabled", () => {
      const disabledPolicy = {
        return: { enabled: false },
        exchange: { enabled: false },
      };
      const textBn = getProductPolicyParagraph(disabledPolicy, "bn");
      expect(textBn).toContain("ত্রুটিপূর্ণ বা ভুল পণ্য পেলে");

      const textEn = getProductPolicyParagraph(disabledPolicy, "en");
      expect(textEn).toContain("damaged or incorrect items");
    });

    it("derives thank-you reassurance line matching return/exchange terms", () => {
      const demoPolicy = {
        return: { enabled: true, days: 0 },
        exchange: { enabled: true, days: 3 },
      };
      const reassureBn = getThankYouReassurance(demoPolicy, "bn");
      expect(reassureBn).toContain("৩ দিনের মধ্যে সহজ এক্সচেঞ্জ");

      const reassureEn = getThankYouReassurance(demoPolicy, "en");
      expect(reassureEn).toContain("within 3 days");
    });

    it("derives legal return section terms list based on return policy", () => {
      const policy = {
        return: { enabled: true, days: 0 },
        exchange: { enabled: true, days: 3 },
        returnShippingPaidBy: "seller" as const,
      };
      const sectionBn = getLegalReturnSection(policy, "bn");
      expect(sectionBn.title).toBe("রিটার্ন ও এক্সচেঞ্জ পলিসি");
      expect(sectionBn.termsList.some((t) => t.includes("তাৎক্ষণিক রিটার্ন"))).toBe(true);
      expect(sectionBn.termsList.some((t) => t.includes("৩ দিনের মধ্যে"))).toBe(true);
      expect(sectionBn.termsList.some((t) => t.includes("সম্পূর্ণ ডেলিভারি চার্জ বিক্রেতা বহন করবেন"))).toBe(true);

      const sectionEn = getLegalReturnSection(policy, "en");
      expect(sectionEn.title).toBe("Return & Exchange Policy");
      expect(sectionEn.termsList.some((t) => t.includes("immediately in front of the delivery rider"))).toBe(true);
      expect(sectionEn.termsList.some((t) => t.includes("within 3 days of delivery"))).toBe(true);
    });

    it("derives terms page sections structure correctly", () => {
      const config = createMockConfig();
      const sectionsBn = getTermsPageSections(config, "bn");
      expect(sectionsBn.some((s) => s.id === "payment")).toBe(true);
      expect(sectionsBn.some((s) => s.id === "returns")).toBe(true);
      expect(sectionsBn.some((s) => s.id === "delivery")).toBe(true);
      expect(sectionsBn.some((s) => s.id === "refund")).toBe(true);
      expect(sectionsBn.some((s) => s.id === "cancellation")).toBe(true);
    });

    it("formats policy last updated date with fallback", () => {
      expect(getPolicyLastUpdatedDate("2026-11-03", "bn")).toBe("সর্বশেষ আপডেট: 2026-11-03");
      expect(getPolicyLastUpdatedDate("2026-11-03", "en")).toBe("Last updated: 2026-11-03");
      expect(getPolicyLastUpdatedDate(undefined, "bn")).toMatch(/^সর্বশেষ আপডেট: \d{4}-\d{2}-\d{2}$/);
      expect(getPolicyLastUpdatedDate(undefined, "en")).toMatch(/^Last updated: \d{4}-\d{2}-\d{2}$/);
    });

    it("formats legal footer text with OrderKoro attribution", () => {
      const footerBn = getLegalFooterText("বুনন", "bn");
      expect(footerBn.copyright).toContain("বুনন");
      expect(footerBn.poweredBy).toContain("OrderKoro");

      const footerEn = getLegalFooterText("Bunon", "en");
      expect(footerEn.copyright).toContain("Bunon");
      expect(footerEn.poweredBy).toContain("OrderKoro");
    });
  });

  describe("5. Legal Pages Rendering for Three Specific Configurations", () => {
    // Config 1: COD only with no return/exchange and no Pixel
    const config1 = createMockConfig({
      payments: { cod: { enabled: true } },
      returnPolicy: { return: { enabled: false }, exchange: { enabled: false }, returnShippingPaidBy: "customer" },
      pixelId: undefined,
    });

    // Config 2: COD + 3 mobile methods with return (0 days) and exchange (3 days) and a Pixel
    const config2 = createMockConfig({
      payments: {
        cod: { enabled: true },
        bkash: { enabled: true, number: "01711002233", type: "personal" },
        nagad: { enabled: true, number: "01811002233", type: "personal" },
        rocket: { enabled: true, number: "01911002233", type: "personal" },
      },
      returnPolicy: {
        return: { enabled: true, days: 0 },
        exchange: { enabled: true, days: 3 },
        returnShippingPaidBy: "shared",
      },
      pixelId: "123456789012345",
      contact: {
        phone: "01700000000",
        messengerPageUsername: "testbrand",
        businessAddress: { bn: "মিরপুর, ঢাকা", en: "Mirpur, Dhaka" },
        tradeLicenseNumber: "TRAD/DNCC/012345/2026",
      },
    });

    // Config 3: Exchange only with 3 days
    const config3 = createMockConfig({
      payments: { cod: { enabled: true } },
      returnPolicy: {
        return: { enabled: false },
        exchange: { enabled: true, days: 3 },
        returnShippingPaidBy: "customer",
      },
      pixelId: undefined,
    });

    it("Config 1 (COD only, no return/exchange, no Pixel) renders privacy and terms without Pixel or mobile payments", () => {
      // Privacy page
      const privacyHtml = ReactDOMServer.renderToString(
        React.createElement(LegalPageClient, { config: config1, type: "privacy" })
      );
      expect(privacyHtml).not.toContain("মেটা পিক্সেল");
      expect(privacyHtml).not.toContain("Meta Pixel");
      expect(privacyHtml).toContain("Google Sheets");
      expect(privacyHtml).toContain("Telegram");
      expect(privacyHtml).toContain("Vercel");

      // Terms page
      const termsHtml = ReactDOMServer.renderToString(
        React.createElement(LegalPageClient, { config: config1, type: "terms" })
      );
      expect(termsHtml).toContain("ক্যাশ অন ডেলিভারি");
      expect(termsHtml).not.toContain("বিকাশ, নগদ বা রকেটে অগ্রিম");
      expect(termsHtml).toContain("ত্রুটিপূর্ণ বা ভুল অর্ডারের ক্ষেত্রে প্রযোজ্য");
    });

    it("Config 2 (COD + 3 mobile methods, return + exchange, Pixel) renders Pixel section, mobile payments, and trade license", () => {
      // Privacy page
      const privacyHtml = ReactDOMServer.renderToString(
        React.createElement(LegalPageClient, { config: config2, type: "privacy" })
      );
      expect(privacyHtml).toContain("মেটা পিক্সেল");
      expect(privacyHtml).toContain("Meta Pixel");

      // Terms page
      const termsHtml = ReactDOMServer.renderToString(
        React.createElement(LegalPageClient, { config: config2, type: "terms" })
      );
      expect(termsHtml).toContain("ক্যাশ অন ডেলিভারি");
      expect(termsHtml).toContain("bKash, Nagad, Rocket");
      expect(termsHtml).toContain("রিফান্ড নীতি");
      expect(termsHtml).toContain("TRAD/DNCC/012345/2026");
    });

    it("Config 3 (Exchange only with 3 days) specifies 3-day exchange and omits general return window", () => {
      const termsHtml = ReactDOMServer.renderToString(
        React.createElement(LegalPageClient, { config: config3, type: "terms" })
      );
      expect(termsHtml).toContain("৩ দিনের মধ্যে");
      expect(termsHtml).not.toContain("৭ দিনের");
    });
  });

  describe("6. Pixel Paragraph Conditional Rendering Check", () => {
    it("renders Pixel section in getPrivacyPageSections ONLY when pixelId is provided", () => {
      const configNoPixel = createMockConfig({ pixelId: undefined });
      const sectionsNoPixel = getPrivacyPageSections(configNoPixel, "bn");
      expect(sectionsNoPixel.some((s) => s.id === "tracking")).toBe(false);

      const configWithPixel = createMockConfig({ pixelId: "987654321" });
      const sectionsWithPixel = getPrivacyPageSections(configWithPixel, "bn");
      expect(sectionsWithPixel.some((s) => s.id === "tracking")).toBe(true);
      expect(sectionsWithPixel.find((s) => s.id === "tracking")?.title).toContain("মেটা পিক্সেল");
    });
  });

  describe("7. Strict Guard Test: No Hard-Coded Claims Outside policy-text.ts", () => {
    const FORBIDDEN_PATTERNS = [
      "৭ দিনের",
      "7-Day",
      "7 Day",
      "৩ দিনের",
      "3 days",
      "১০০% প্রিমিয়াম",
      "100% Premium",
      "পছন্দ না হলে",
    ];

    it("asserts no file in src outside policy-text.ts contains hard-coded day count or claim phrases", () => {
      const srcDir = path.resolve("src");
      const offenses: { file: string; pattern: string }[] = [];

      function walkDir(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))) {
            // policy-text.ts is the canonical single source of truth
            if (fullPath.endsWith("policy-text.ts")) continue;
            const content = fs.readFileSync(fullPath, "utf8");
            for (const pattern of FORBIDDEN_PATTERNS) {
              if (content.includes(pattern)) {
                offenses.push({ file: path.relative(srcDir, fullPath), pattern });
              }
            }
          }
        }
      }

      walkDir(srcDir);
      expect(offenses).toEqual([]);
    });

    it("asserts zero em-dashes and en-dashes anywhere in src directory", () => {
      const srcDir = path.resolve("src");
      const dashOffenses: { file: string; char: string }[] = [];

      function walkDir(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))) {
            const content = fs.readFileSync(fullPath, "utf8");
            if (content.includes("—")) {
              dashOffenses.push({ file: path.relative(srcDir, fullPath), char: "em-dash (—)" });
            }
            if (content.includes("–")) {
              dashOffenses.push({ file: path.relative(srcDir, fullPath), char: "en-dash (–)" });
            }
          }
        }
      }

      walkDir(srcDir);
      expect(dashOffenses).toEqual([]);
    });
  });
});
