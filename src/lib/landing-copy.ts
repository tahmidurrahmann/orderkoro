// src/lib/landing-copy.ts  (replaces your current file)
import { formatNumber, formatPrice, type SupportedLocale } from "@/lib/format";
import { LANDING, LANDING_CLAIMS } from "@/lib/landing-config";
import { DATA_FAQ_ANSWER } from "@/lib/landing-extra";

export function getPricingLine(): { bn: string; en: string } {
  let bn = `সেটআপ ${formatPrice(LANDING.standardPrice, "bn")}।`;
  let en = `Setup ${formatPrice(LANDING.standardPrice, "en")}.`;

  if (LANDING.earlyOfferRemaining > 0) {
    bn += ` প্রথম ${formatNumber(LANDING.earlyOfferTotal, "bn")} জন সেলারের জন্য লঞ্চ অফার ${formatPrice(LANDING.earlyPrice, "bn")} (বাকি ${formatNumber(LANDING.earlyOfferRemaining, "bn")})।`;
    en += ` Launch offer for the first ${formatNumber(LANDING.earlyOfferTotal, "en")} sellers: ${formatPrice(LANDING.earlyPrice, "en")} (${formatNumber(LANDING.earlyOfferRemaining, "en")} left).`;
  }

  if (typeof LANDING.monthly === "number" && LANDING.monthly !== null) {
    bn += ` মাসিক ফি: ${formatPrice(LANDING.monthly, "bn")}`;
    en += ` Monthly fee: ${formatPrice(LANDING.monthly, "en")}`;
  }

  return { bn, en };
}

export type BenefitIcon =
  | "telegram"
  | "sheet"
  | "speed"
  | "payment"
  | "policy"
  | "protection"
  | "pixel";

export interface BenefitItem {
  id: string;
  icon: BenefitIcon;
  title: { bn: string; en: string };
  description: { bn: string; en: string };
}

const dp = LANDING.deliveryPromise;

export const LANDING_COPY = {
  // Used by the page metadata. Unchanged.
  meta: {
    title: "OrderKoro (অর্ডারকরো) - ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ",
    description:
      "ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ। কাস্টমার সাইজ ও কালার বেছে অর্ডার করে। অর্ডার সাথে সাথে আপনার টেলিগ্রামে আসে এবং নিজের গুগল শিটে জমা হয়।",
  },

  eyebrow: {
    bn: "ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ",
    en: "Single-product order pages for Facebook sellers",
  },

  hero: {
    line1: { bn: "ফেসবুক অ্যাড চালান?", en: "Running Facebook ads?" },
    line2: {
      bn: "অর্ডার ইনবক্সে হারাবেন না।",
      en: "Stop losing orders in the inbox.",
    },
    subline: {
      bn: `আপনার নিজের অর্ডার পেজ তৈরি করে দিই আমরা, ${dp.bn}। অর্ডার আসবে আপনার টেলিগ্রামে আর নিজের গুগল শিটে।`,
      en: `We build your own order page ${dp.en}. Orders arrive in your Telegram and your own Google Sheet.`,
    },
    primaryCta: { bn: "ডেমো অর্ডার করে দেখুন", en: "Try a demo order" },
    secondaryCta: { bn: "মেসেজ করুন", en: "Message us" },
    // Animated demo shown in the hero (see OrderAlertDemo.tsx). Sample data only.
    // Keep the alert fields in line with your real Telegram alert.
    anim: {
      badge: { bn: "নমুনা · ডেমো ডেটা", en: "Sample · demo data" },
      ariaLabel: {
        bn: "১৪ সেকেন্ডের অ্যানিমেশন: কাস্টমার পেজে অর্ডার করে, টেলিগ্রামে অ্যালার্ট আসে, বিক্রেতা বাটনে ট্যাপ করে কনফার্ম করেন এবং অর্ডার গুগল শিটে জমা হয়",
        en: "14-second animation: a customer orders on the page, a Telegram alert arrives, the seller taps Confirm, and the order is saved to Google Sheet",
      },
      pause: { bn: "অ্যানিমেশন থামান", en: "Pause animation" },
      play: { bn: "অ্যানিমেশন চালান", en: "Play animation" },
      steps: [
        {
          n: "১",
          nEn: "1",
          text: {
            bn: "কাস্টমার আপনার পেজে অর্ডার করে",
            en: "The customer orders on your page",
          },
        },
        {
          n: "২",
          nEn: "2",
          text: {
            bn: "টেলিগ্রামে অ্যালার্ট আসে, বাটনে ট্যাপ করে কনফার্ম",
            en: "A Telegram alert arrives; tap to confirm",
          },
        },
        {
          n: "৩",
          nEn: "3",
          text: {
            bn: "অর্ডার আপনার গুগল শিটে জমা হয়",
            en: "The order is saved to your Google Sheet",
          },
        },
      ],
      page: {
        brand: { bn: "বুনন", en: "Bunon Atelier" },
        product: {
          bn: "প্রিমিয়াম সুতি পাঞ্জাবি",
          en: "Premium Cotton Panjabi",
        },
        price: { bn: "৳১,৪৯০", en: "৳1,490" },
        colorLabel: { bn: "রঙ: গভীর নীল", en: "Colour: Deep Indigo" },
        sizeLabel: { bn: "সাইজ", en: "Size" },
        sizes: ["S (38)", "M (40)", "L (42)", "XL (44)"],
        nameLabel: { bn: "আপনার নাম", en: "Your name" },
        nameValue: { bn: "তানজিম আহমেদ", en: "Tanzim Ahmed" },
        phoneLabel: { bn: "মোবাইল নম্বর", en: "Mobile number" },
        phoneValue: "01XXX-XXXXXX",
        delivery: {
          bn: "ঢাকা সিটি · ডেলিভারি ৳৭০",
          en: "Dhaka City · delivery ৳70",
        },
        totalLabel: { bn: "মোট", en: "Total" },
        totalValue: { bn: "৳১,৫৬০", en: "৳1,560" },
        cta: { bn: "অর্ডার কনফার্ম করুন", en: "Confirm order" },
      },
      alert: {
        botName: "OrderKoro Bot",
        now: { bn: "এখন", en: "now" },
        heading: { bn: "নতুন অর্ডার", en: "New order" },
        orderNo: "BNN-1042",
        statusNew: "NEW",
        statusDone: "CONFIRMED",
        rows: [
          {
            label: { bn: "কাস্টমার", en: "Customer" },
            value: { bn: "তানজিম আহমেদ", en: "Tanzim Ahmed" },
          },
          {
            label: { bn: "ফোন", en: "Phone" },
            value: { bn: "01XXX-XXX***", en: "01XXX-XXX***" },
          },
          {
            label: { bn: "এলাকা", en: "Area" },
            value: { bn: "***, ঢাকা সিটি", en: "***, Dhaka City" },
          },
          {
            label: { bn: "পণ্য", en: "Item" },
            value: {
              bn: "প্রিমিয়াম সুতি পাঞ্জাবি × ১",
              en: "Premium Cotton Panjabi × 1",
            },
          },
          {
            label: { bn: "রঙ, সাইজ", en: "Colour, size" },
            value: { bn: "গভীর নীল, L (42)", en: "Deep Indigo, L (42)" },
          },
          {
            label: { bn: "ডেলিভারি", en: "Delivery" },
            value: { bn: "৳৭০", en: "৳70" },
          },
          {
            label: { bn: "পেমেন্ট", en: "Payment" },
            value: { bn: "ক্যাশ অন ডেলিভারি", en: "Cash on Delivery" },
          },
        ],
        totalLabel: { bn: "মোট", en: "Total" },
        totalValue: { bn: "৳১,৫৬০", en: "৳1,560" },
        buttons: [
          { bn: "কনফার্ম", en: "Confirm" },
          { bn: "ফোন ধরেনি", en: "No answer" },
          { bn: "ক্যানসেল", en: "Cancel" },
        ],
        callNote: {
          bn: "কাস্টমারকে কল করে, বাটনে ট্যাপ করে কনফার্ম করুন",
          en: "Call the customer, then tap to confirm",
        },
      },
      sheet: {
        title: { bn: "আপনার গুগল শিট", en: "Your Google Sheet" },
        cols: [
          { bn: "অর্ডার", en: "Order" },
          { bn: "কাস্টমার", en: "Customer" },
          { bn: "সাইজ", en: "Size" },
          { bn: "মোট", en: "Total" },
          { bn: "স্ট্যাটাস", en: "Status" },
        ],
        prevRow: [
          { bn: "BNN-1041", en: "BNN-1041" },
          { bn: "রাকিব হাসান", en: "Rakib Hasan" },
          { bn: "M (40)", en: "M (40)" },
          { bn: "৳১,৫৬০", en: "৳1,560" },
          { bn: "Confirmed", en: "Confirmed" },
        ],
        newRow: [
          { bn: "BNN-1042", en: "BNN-1042" },
          { bn: "তানজিম আহমেদ", en: "Tanzim Ahmed" },
          { bn: "L (42)", en: "L (42)" },
          { bn: "৳১,৫৬০", en: "৳1,560" },
          { bn: "Confirmed", en: "Confirmed" },
        ],
        saved: {
          bn: "অর্ডার আপনার শিটে জমা হয়েছে",
          en: "Order saved to your Sheet",
        },
      },
    },
  },

  trust: {
    sheet: {
      bn: "ডেটা আপনার নিজের গুগল শিটে",
      en: "Your data lives in your own Google Sheet",
    },
    telegram: {
      bn: "নতুন অর্ডারে টেলিগ্রাম অ্যালার্ট",
      en: "Telegram alert on every new order",
    },
    commission: {
      bn: "প্রতি অর্ডারে কোনো কমিশন নেই",
      en: "No commission on orders",
    },
    lighthouse: (score: number, date: string, lang: SupportedLocale) =>
      lang === "bn"
        ? `মোবাইল Lighthouse ${formatNumber(score, "bn")}/১০০ (${date}, লাইভ সাইটে মাপা)`
        : `Mobile Lighthouse ${score}/100 (measured on the live site, ${date})`,
  },

  compare: {
    label: { bn: "পার্থক্যটা দেখুন", en: "See the difference" },
    title: {
      bn: "ইনবক্সে অর্ডার নেওয়া বনাম OrderKoro",
      en: "Taking orders in the inbox vs OrderKoro",
    },
    subtitle: {
      bn: "একটি পণ্য, একটি লিংক। কাস্টমার নিজে সব বেছে নেয়, আপনি শুধু কনফার্ম করেন।",
      en: "One product, one link. The customer picks everything; you just confirm.",
    },
    leftTitle: { bn: "ইনবক্সে অর্ডার নিলে", en: "Taking orders in the inbox" },
    rightTitle: { bn: "OrderKoro-তে", en: "With OrderKoro" },
    rows: [
      {
        a: {
          bn: "মেসেজের ভিড়ে অর্ডার খুঁজতে হয়",
          en: "You dig through messages to find orders",
        },
        b: {
          bn: "প্রতিটি অর্ডার আলাদা টেলিগ্রাম অ্যালার্টে, একটি কার্ডে",
          en: "Each order arrives as its own Telegram alert, in one card",
        },
      },
      {
        a: {
          bn: "নাম, নম্বর, ঠিকানা হাতে কপি-পেস্ট করতে হয়",
          en: "You copy-paste names, numbers and addresses by hand",
        },
        b: {
          bn: "অর্ডার আপনাআপনি আপনার গুগল শিটের নতুন সারিতে জমা হয়",
          en: "Each order is added to your Google Sheet automatically",
        },
      },
      {
        a: {
          bn: "ভুল সাইজ বা রঙ লিখলে আবার জিজ্ঞেস করতে হয়",
          en: "Wrong size or colour means asking again",
        },
        b: {
          bn: "কাস্টমার নিজেই সাইজ ও রঙ বেছে নেয়",
          en: "The customer picks size and colour themselves",
        },
      },
      {
        a: {
          bn: "একই কাস্টমার দুবার অর্ডার দিলে ধরা কঠিন",
          en: "Double orders from one customer are hard to spot",
        },
        b: {
          bn: "ডাবল ট্যাপ করলেও ডুপ্লিকেট অর্ডার ঢোকে না",
          en: "Double taps do not create duplicate orders",
        },
      },
      {
        a: {
          bn: "প্রতিবার ডেলিভারি চার্জ হিসাব করতে হয়",
          en: "You work out the delivery charge every time",
        },
        b: {
          bn: "এলাকা বেছে নিলে ডেলিভারি চার্জ নিজে যোগ হয়",
          en: "Delivery charge is added once the area is chosen",
        },
      },
    ],
  },

  how: {
    label: { bn: "কীভাবে কাজ করে", en: "How it works" },
    title: {
      bn: "সহজ ৩ ধাপে আপনার পেজ চালু",
      en: "Your page live in 3 simple steps",
    },
    steps: [
      {
        number: "১",
        numberEn: "1",
        title: {
          bn: "পণ্যের ছবি ও তথ্য দিন",
          en: "Send product photos and details",
        },
        description: {
          bn: "ছবি, সাইজ, রঙ, দাম আর ডেলিভারি চার্জ আমাদের পাঠান।",
          en: "Send photos, sizes, colours, price and delivery charges.",
        },
      },
      {
        number: "২",
        numberEn: "2",
        title: {
          bn: "আমরা পেজ বানিয়ে লিংক দিই",
          en: "We build the page and send the link",
        },
        description: {
          bn: `${dp.bn} আপনার পেজ তৈরি হয়ে যায়। আপনি দেখে নেন।`,
          en: `Your page is ready ${dp.en}. You review it.`,
        },
      },
      {
        number: "৩",
        numberEn: "3",
        title: {
          bn: "লিংক অ্যাডে বসান, অর্ডার আসে",
          en: "Put the link in your ad, orders arrive",
        },
        description: {
          bn: "প্রতিটি নতুন অর্ডার সাথে সাথে আপনার টেলিগ্রামে আসে ও গুগল শিটে জমা হয়।",
          en: "Every new order reaches your Telegram and Google Sheet right away.",
        },
      },
    ],
    flow: {
      ad: { bn: "ফেসবুক অ্যাড", en: "Facebook ad" },
      click: { bn: "লিংকে ক্লিক", en: "Link click" },
      page: { bn: "আপনার OrderKoro পেজ", en: "Your OrderKoro page" },
      ordered: { bn: "কাস্টমার অর্ডার করলে", en: "When a customer orders" },
      telegram: { bn: "টেলিগ্রাম অ্যালার্ট", en: "Telegram alert" },
      sheet: { bn: "গুগল শিটে নতুন সারি", en: "New row in Google Sheet" },
    },
  },

  proof: {
    label: { bn: "আপনি যা দেখবেন", en: "What you will see" },
    title: {
      bn: "অর্ডার এলে ফোনে আর শিটে ঠিক এমনটাই আসে",
      en: "This is exactly what lands on your phone and in your Sheet",
    },
    subtitle: {
      bn: "নিচের ছবিগুলো আসল ডেমো অর্ডার থেকে নেওয়া।",
      en: "These screenshots come from a real demo order.",
    },
    telegramCaption: {
      bn: "১. নতুন অর্ডারে এই অ্যালার্ট আপনার ফোনে আসে",
      en: "1. A new order sends this alert to your phone",
    },
    sheetCaption: {
      bn: "২. একই অর্ডার আপনার শিটে নতুন সারি হয়ে জমা হয়",
      en: "2. The same order is saved as a new row in your Sheet",
    },
    channelButton: {
      bn: "পাবলিক ডেমো চ্যানেল দেখুন",
      en: "Open the public demo channel",
    },
    warning: {
      bn: "ডেমোতে আসল নাম বা নম্বর দেবেন না।",
      en: "Do not enter a real name or phone number in the demo.",
    },
    channelNotice: {
      bn: "চ্যানেলে অ্যালার্টের বাটনে ট্যাপ করেও দেখতে পারেন।",
      en: "You can also tap the buttons on alerts in the channel.",
    },
  },

  benefits: {
    label: { bn: "যা যা পাচ্ছেন", en: "What you get" },
    title: {
      bn: "সময় বাঁচানো আর অর্ডার না হারানোর সব সুবিধা",
      en: "Everything to save time and stop losing orders",
    },
    items: [
      {
        id: "benefit-telegram",
        icon: "telegram",
        title: {
          bn: "টেলিগ্রামে সাথে সাথে অ্যালার্ট",
          en: "Instant Telegram alert",
        },
        description: {
          bn: "অর্ডার সাবমিট হলেই পূর্ণ বিবরণসহ আপনার ফোনে মেসেজ আসে। ইনবক্স ঘাঁটতে হয় না।",
          en: "The moment an order is placed, you get the full details on your phone. No inbox digging.",
        },
      },
      {
        id: "benefit-sheet",
        icon: "sheet",
        title: { bn: "আপনার নিজের গুগল শিট", en: "Your own Google Sheet" },
        description: {
          bn: "সব অর্ডার আপনার শিটে আপনাআপনি জমা হয়। শিট আপনার, ডেটাও আপনার।",
          en: "Every order is saved to your Sheet automatically. The Sheet and the data are yours.",
        },
      },
      {
        id: "benefit-speed",
        icon: "speed",
        title: {
          bn: "মোবাইলের জন্য হালকা পেজ",
          en: "A light page built for mobile",
        },
        description: {
          bn: "ছোট ছবি আর হালকা কোড দিয়ে বানানো, ফেসবুক অ্যাডের মোবাইল ট্রাফিকের কথা ভেবে।",
          en: "Built with small images and light code for mobile traffic from Facebook ads.",
        },
      },
      {
        id: "benefit-payment",
        icon: "payment",
        title: {
          bn: LANDING_CLAIMS.mobilePayments
            ? "ক্যাশ অন ডেলিভারি (+ বিকাশ ও নগদ)"
            : "ক্যাশ অন ডেলিভারি ও এলাকাভিত্তিক চার্জ",
          en: LANDING_CLAIMS.mobilePayments
            ? "Cash on Delivery (+ bKash, Nagad & Rocket)"
            : "Cash on Delivery and area-based charges",
        },
        description: {
          bn: LANDING_CLAIMS.mobilePayments
            ? "ক্যাশ অন ডেলিভারির পাশাপাশি বিকাশ, নগদ ও রকেটের ট্রানজেকশন আইডি দিয়েও পেমেন্ট নেওয়া যায়। এলাকা অনুযায়ী ডেলিভারি চার্জ স্বয়ংক্রিয়ভাবে যোগ হয়।"
            : "কাস্টমার এলাকা নির্বাচন করলেই ডেলিভারি চার্জ স্বয়ংক্রিয়ভাবে যোগ হয়ে যায়।",
          en: LANDING_CLAIMS.mobilePayments
            ? "Cash on Delivery plus bKash, Nagad, Rocket transaction IDs. Delivery charge is added by area."
            : "Delivery charge is added automatically once the customer chooses an area.",
        },
      },
      {
        id: "benefit-policy",
        icon: "policy",
        title: {
          bn: "রিটার্ন ও প্রাইভেসি পেজ রেডি",
          en: "Return and privacy pages ready",
        },
        description: {
          bn: "কাস্টমারের ভরসা বাড়াতে আর ফেসবুকের নিয়ম মানতে পেজের সাথেই থাকে।",
          en: "Included with your page to build buyer trust and meet Facebook's requirements.",
        },
      },
      ...(LANDING_CLAIMS.duplicateProtection
        ? [
            {
              id: "benefit-protection",
              icon: "protection" as const,
              title: {
                bn: "ডুপ্লিকেট অর্ডার থেকে সুরক্ষা",
                en: "Protection from duplicate orders",
              },
              description: {
                bn: "কাস্টমার বাটনে দুবার ট্যাপ করলেও একটি অর্ডারই ঢোকে।",
                en: "If a customer taps the button twice, only one order is created.",
              },
            },
          ]
        : []),
      ...(LANDING_CLAIMS.pixelCapi
        ? [
            {
              id: "benefit-pixel",
              icon: "pixel" as const,
              title: {
                bn: "ফেসবুক পিক্সেল ও কনভার্সন এপিআই",
                en: "Facebook Pixel and Conversions API",
              },
              description: {
                bn: "ব্রাউজার ও সার্ভার দুই দিক থেকেই অর্ডার ট্র্যাকিং।",
                en: "Order tracking from both the browser and the server.",
              },
            },
          ]
        : []),
    ] as BenefitItem[],
  },

  who: {
    label: { bn: "সৎ কথা", en: "Straight talk" },
    title: {
      bn: "OrderKoro কার জন্য, আর কার জন্য নয়",
      en: "Who OrderKoro is for, and who it is not for",
    },
    forTitle: { bn: "আপনার জন্য, যদি আপনি", en: "It is for you if you" },
    forItems: [
      {
        bn: "ফেসবুক অ্যাডে একটি পণ্য বিক্রি করেন",
        en: "Sell one product through Facebook ads",
      },
      {
        bn: "বেশির ভাগ অর্ডার ক্যাশ অন ডেলিভারিতে নেন",
        en: "Take most orders as Cash on Delivery",
      },
      {
        bn: "ইনবক্সে অর্ডার সামলাতে হিমশিম খান",
        en: "Struggle to manage orders in the inbox",
      },
    ],
    notTitle: {
      bn: "আপনার জন্য নয়, যদি আপনি",
      en: "It is not for you if you",
    },
    notItems: [
      {
        bn: "শত শত পণ্যের পূর্ণ অনলাইন স্টোর চান",
        en: "Want a full online store with hundreds of products",
      },
      {
        bn: "কার্টে একসাথে অনেক পণ্য কেনার ব্যবস্থা চান",
        en: "Need a cart for buying many products at once",
      },
      {
        bn: "অনলাইনে কার্ড পেমেন্ট গেটওয়ে চান",
        en: "Need an online card payment gateway",
      },
    ],
  },

  pricing: {
    label: { bn: "প্রাইসিং", en: "Pricing" },
    title: {
      bn: "সহজ ও স্বচ্ছ, কোনো গোপন চার্জ নেই",
      en: "Simple and transparent, no hidden charges",
    },
    subtitle: {
      bn: "যা লেখা আছে ঠিক তাই।",
      en: "Exactly what you see.",
    },
    earlyCard: {
      badge: (total: number, lang: SupportedLocale) =>
        lang === "bn"
          ? `প্রথম ${formatNumber(total, "bn")} জন সেলার`
          : `First ${formatNumber(total, "en")} sellers`,
      price: (amount: number, lang: SupportedLocale) =>
        formatPrice(amount, lang),
      oneTimeLabel: { bn: "একবারই", en: "one-time" },
      remainingText: (
        remaining: number,
        total: number,
        lang: SupportedLocale,
      ) =>
        lang === "bn"
          ? `বাকি আছে: ${formatNumber(remaining, "bn")}/${formatNumber(total, "bn")}`
          : `Remaining: ${formatNumber(remaining, "en")}/${formatNumber(total, "en")}`,
      scopeText: {
        bn: "যতদিন OrderKoro চালু আছে, পেজ অনলাইন রাখা, বাগ ফিক্স এবং টেলিগ্রাম/গুগল শিট সংযোগের সাপোর্ট সেটআপ ফির মধ্যেই। কোনো মাসিক ফি নেই।",
        en: "As long as OrderKoro is active, keeping the page online, bug fixes, and Telegram/Google Sheet connection support are included in the setup fee. No monthly fee.",
      },
      scopeSubtext: {
        bn: "নতুন পণ্যের পেজ বা ডিজাইন বদল আলাদা।",
        en: "New product pages or design changes are billed separately.",
      },
      nextPriceNote: {
        bn: `এরপর সেটআপ ফি ${formatPrice(LANDING.standardPrice, "bn")} (প্রথম ${formatNumber(LANDING.standardIncludedMonths, "bn")} মাসের হোস্টিং ও সাপোর্টসহ)।`,
        en: `After this, the setup fee is ${formatPrice(LANDING.standardPrice, "en")} (including the first ${formatNumber(LANDING.standardIncludedMonths, "en")} months of hosting and support).`,
      },
      ctaButton: { bn: "লঞ্চ অফারে শুরু করুন", en: "Claim the launch offer" },
    },
    standardCard: {
      badge: { bn: "স্ট্যান্ডার্ড প্যাকেজ", en: "Standard package" },
      title: {
        bn: "কমপ্লিট অর্ডার পেজ সেটআপ",
        en: "Complete order page setup",
      },
      price: (amount: number, lang: SupportedLocale) =>
        formatPrice(amount, lang),
      includedNote: (months: number, lang: SupportedLocale) =>
        lang === "bn"
          ? `প্রথম ${formatNumber(months, "bn")} মাসের হোস্টিং ও সাপোর্টসহ`
          : `Includes the first ${formatNumber(months, "en")} months of hosting and support`,
      featuresTitle: { bn: "কী কী পাবেন", en: "What is included" },
      features: [
        {
          bn: "১টি পণ্যের জন্য ফাস্ট-লোডিং পেজ",
          en: "A fast-loading page for 1 product",
        },
        {
          bn: "প্রতি অর্ডারে টেলিগ্রাম অ্যালার্ট",
          en: "A Telegram alert on every order",
        },
        {
          bn: "আপনার নিজের গুগল শিটে সব ডেটা",
          en: "All order data in your own Google Sheet",
        },
        {
          bn: LANDING_CLAIMS.mobilePayments
            ? "ক্যাশ অন ডেলিভারি ও মোবাইল পেমেন্ট (বিকাশ ও নগদ)"
            : "ক্যাশ অন ডেলিভারি ও এলাকাভিত্তিক ডেলিভারি চার্জ",
          en: LANDING_CLAIMS.mobilePayments
            ? "Cash on Delivery and mobile payments (bKash, Nagad & Rocket)"
            : "Cash on Delivery and area-based delivery charges",
        },
        {
          bn: "রিটার্ন ও প্রাইভেসি পলিসি পেজ",
          en: "Return and privacy policy pages",
        },
      ],
      extraCostsTitle: { bn: "আলাদা খরচ", en: "Separate costs" },
      extraCosts: [
        { bn: "ফেসবুক অ্যাডের নিজস্ব খরচ", en: "Your Facebook ad spend" },
        {
          bn: "আলাদা ডোমেইন চাইলে তার খরচ",
          en: "A custom domain, if you want one",
        },
      ],
      ctaButton: { bn: "সেটআপ শুরু করুন", en: "Get started" },
    },
  },

  about: {
    label: { bn: "যিনি আপনার পেজ বানাবেন", en: "Who builds your page" },
  },

  faq: {
    label: { bn: "প্রশ্নোত্তর", en: "FAQ" },
    title: { bn: "সচরাচর জিজ্ঞাসা", en: "Frequently asked questions" },
    items: [
      {
        id: "faq-data",
        question: {
          bn: "ডেটা কার কাছে থাকে?",
          en: "Who owns the customer data?",
        },
        answer: DATA_FAQ_ANSWER,
      },
      {
        id: "faq-delivery-time",
        question: {
          bn: "কতদিনে পেজ পাব?",
          en: "How long until I get my page?",
        },
        answer: {
          bn: `ছবি, সাইজ, রঙ, দাম ও ডেলিভারি তথ্য দেওয়ার ${dp.bn} আপনার পেজ লাইভ করে লিংক বুঝিয়ে দেওয়া হয়।`,
          en: `Once you send the photos, sizes, colours, price and delivery details, your page goes live ${dp.en} and we send you the link.`,
        },
      },
      {
        id: "faq-changes",
        question: {
          bn: "পেজ বদলাতে চাইলে?",
          en: "What if I want to change the page?",
        },
        answer: {
          bn: "দাম বদল, স্টক আউট বা লেখার ছোট সংশোধন সাপোর্টের মধ্যেই। নতুন পণ্যের পেজ বা সম্পূর্ণ নতুন ডিজাইন আলাদা।",
          en: "Price changes, sold-out marking and small text fixes are covered. A page for a new product or a brand-new design is billed separately.",
        },
      },
      {
        id: "faq-delivery-returns",
        question: {
          bn: "ডেলিভারি ও রিটার্ন কীভাবে?",
          en: "How do delivery and returns work?",
        },
        answer: {
          bn: "কাস্টমারের এলাকা অনুযায়ী ডেলিভারি চার্জ নিজে থেকে যোগ হয়। আপনার রিটার্ন ও এক্সচেঞ্জ পলিসির আলাদা পেজ অর্ডার পেজের সাথেই থাকে।",
          en: "Delivery charge is added automatically by the customer's area. Your return and exchange policy has its own page, included with your order page.",
        },
      },
      {
        id: "faq-pixel",
        question: {
          bn: "ফেসবুক পিক্সেল লাগালে কী হয়?",
          en: "What about Facebook Pixel?",
        },
        answer: {
          bn: LANDING_CLAIMS.pixelCapi
            ? "ব্রাউজার পিক্সেল এবং সার্ভার-সাইড কনভার্সন এপিআই দুটোই যুক্ত করে দিই, যাতে অর্ডার ট্র্যাকিং আরও নির্ভুল হয়।"
            : "শিগগিরই আসছে। ব্রাউজার ও সার্ভার-সাইড ট্র্যাকিং যুক্ত করার কাজ চলছে।",
          en: LANDING_CLAIMS.pixelCapi
            ? "We set up both the browser Pixel and the server-side Conversions API so order tracking is more accurate."
            : "Coming soon. We are working on browser and server-side tracking.",
        },
      },
      {
        id: "faq-start",
        question: { bn: "কীভাবে শুরু করব?", en: "How do I get started?" },
        answer: {
          bn: "আমাদের মেসেঞ্জারে একটি মেসেজ দিন, পণ্যের ছবি ও তথ্য পাঠান। আমরা পেজ বানিয়ে দেখাব, পছন্দ হলে তবেই চূড়ান্ত করুন।",
          en: "Send us a message on Messenger with your product photos and details. We build the page and show it to you; finalise it only if you like it.",
        },
      },
    ],
  },

  finalCta: {
    title: {
      bn: "আজই আপনার পণ্যের অর্ডার পেজ চালু করুন",
      en: "Launch your product's order page today",
    },
    subtitle: {
      bn: `অর্ডার ইনবক্সে হারানোর দিন শেষ। ${dp.bn} আপনার পেজ রেডি করে দিই আমরা।`,
      en: `No more losing orders in the inbox. We get your page ready ${dp.en}.`,
    },
    primaryButton: { bn: "মেসেজ করুন", en: "Message us" },
    secondaryButton: { bn: "ডেমো অর্ডার করে দেখুন", en: "Try a demo order" },
    callButton: { bn: "কল করুন", en: "Call us" },
  },

  stickyBar: {
    messageUs: { bn: "মেসেজ করুন", en: "Message us" },
    demoButton: { bn: "ডেমো দেখুন", en: "Try demo" },
  },

  footer: {
    privacy: { bn: "প্রাইভেসি পলিসি", en: "Privacy Policy" },
    terms: { bn: "শর্তাবলী", en: "Terms & Conditions" },
    copyright: {
      bn: "© ২০২৬ OrderKoro। সর্বস্বত্ব সংরক্ষিত।",
      en: "© 2026 OrderKoro. All rights reserved.",
    },
  },
};
