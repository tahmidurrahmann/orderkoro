import { formatNumber, formatPrice } from "@/lib/format";

// -----------------------------------------------------------------------------
// Pricing Constants
// Edit these values to configure pricing across the landing page.
// -----------------------------------------------------------------------------
export const SETUP_PRICE_BDT = 2999;
export const LAUNCH_PRICE_BDT = 1999;
export const LAUNCH_SELLER_LIMIT = 5;
export const MONTHLY_FEE_BDT: number | undefined = undefined;

/**
 * Builds the localized pricing line using active constants.
 * - Formats all numbers with formatPrice and formatNumber helpers.
 * - If LAUNCH_SELLER_LIMIT is 0, the launch-offer sentence is omitted.
 * - If MONTHLY_FEE_BDT is unset (undefined), no monthly-fee text is rendered.
 */
export function getPricingLine(): { bn: string; en: string } {
  let bn = `সেটআপ ${formatPrice(SETUP_PRICE_BDT, "bn")}।`;
  let en = `Setup ${formatPrice(SETUP_PRICE_BDT, "en")}.`;

  if (LAUNCH_SELLER_LIMIT > 0) {
    bn += ` প্রথম ${formatNumber(LAUNCH_SELLER_LIMIT, "bn")} জন সেলারের জন্য লঞ্চ অফার ${formatPrice(LAUNCH_PRICE_BDT, "bn")}।`;
    en += ` Launch offer for the first ${formatNumber(LAUNCH_SELLER_LIMIT, "en")} sellers: ${formatPrice(LAUNCH_PRICE_BDT, "en")}.`;
  }

  if (typeof MONTHLY_FEE_BDT === "number") {
    bn += ` মাসিক ফি: ${formatPrice(MONTHLY_FEE_BDT, "bn")}`;
    en += ` Monthly fee: ${formatPrice(MONTHLY_FEE_BDT, "en")}`;
  }

  return { bn, en };
}

export interface LandingFeatureItem {
  id: string;
  iconType: "speed" | "cod" | "mfs" | "automation";
  title: {
    bn: string;
    en: string;
  };
  body: {
    bn: string;
    en: string;
  };
}

export const LANDING_COPY = {
  meta: {
    title: "OrderKoro · ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ",
    description:
      "ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ। কাস্টমার সাইজ ও কালার বেছে অর্ডার করে। অর্ডার সাথে সাথে আপনার টেলিগ্রামে আসে এবং নিজের গুগল শিটে জমা হয়।",
  },
  eyebrow: {
    brand: "OrderKoro",
    bn: "ফেসবুক ও এফ-কমার্স সেলারদের জন্য",
    en: "For Facebook & F-commerce sellers",
    fullTextBn: "OrderKoro • ফেসবুক ও এফ-কমার্স সেলারদের জন্য",
    fullTextEn: "OrderKoro • For Facebook & F-commerce sellers",
  },
  hero: {
    headline: {
      bn: "ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ",
      en: "A single-product order page for Facebook sellers",
    },
    subline: {
      bn: "কাস্টমার সাইজ ও কালার বেছে অর্ডার করে। অর্ডার সাথে সাথে আপনার টেলিগ্রামে আসে, আর সব তথ্য আপনার নিজের গুগল শিটে জমা হয়।",
      en: "Customers pick a size and color and order. The order reaches your Telegram instantly and is saved in your own Google Sheet.",
    },
  },
  banner: {
    title: {
      bn: "ছবি আর দাম দিন, পেজ আমরা বানিয়ে দিই",
      en: "Send your photos and price, we build the page",
    },
  },
  features: [
    {
      id: "feature-speed",
      iconType: "speed",
      title: {
        bn: "সুপার ফাস্ট পেজ",
        en: "Super Fast Loading",
      },
      body: {
        bn: "ধীরগতির ৪জি ইন্টারনেটেও কাস্টমার চোখের পলকে পেজ দেখতে পায়।",
        en: "Loads in ~1 second even on slow 4G mobile connections.",
      },
    },
    {
      id: "feature-cod",
      iconType: "cod",
      title: {
        bn: "ক্যাশ অন ডেলিভারি",
        en: "Cash on Delivery",
      },
      body: {
        bn: "এলাকা অনুযায়ী ডেলিভারি চার্জসহ মোট দাম কাস্টমার শুরুতেই দেখে।",
        en: "Area-based delivery charges calculated upfront before ordering.",
      },
    },
    {
      id: "feature-mfs",
      iconType: "mfs",
      title: {
        bn: "বিকাশ, নগদ ও রকেট",
        en: "bKash, Nagad & Rocket",
      },
      body: {
        bn: "কাস্টমার ট্রানজেকশন আইডি দিলে আপনি নিজের অ্যাপে মিলিয়ে নেন।",
        en: "Customers submit their TrxID for instant verification in your app.",
      },
    },
    {
      id: "feature-automation",
      iconType: "automation",
      title: {
        bn: "টেলিগ্রাম ও গুগল শিট",
        en: "Telegram & Google Sheets",
      },
      body: {
        bn: "প্রতিটি অর্ডার সাথে সাথে টেলিগ্রামে অ্যালার্ট আসে এবং শিটে সেভ হয়।",
        en: "Real-time alerts in your Telegram and auto-saved to your Sheet.",
      },
    },
  ] as LandingFeatureItem[],
  pricing: {
    heading: {
      bn: "প্যাকেজ",
      en: "Pricing",
    },
  },
  actions: {
    demoButton: {
      bn: "লাইভ ডেমো দেখুন",
      en: "View Live Demo",
    },
    contactButton: {
      bn: "মেসেঞ্জারে নক দিন",
      en: "Contact",
    },
  },
  footer: {
    bn: "OrderKoro · ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ",
    en: "OrderKoro · Single-product order pages for Facebook sellers",
  },
};
