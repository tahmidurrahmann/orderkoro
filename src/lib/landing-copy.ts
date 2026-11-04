import { formatNumber, formatPrice, type SupportedLocale } from "@/lib/format";
import { LANDING, LANDING_CLAIMS } from "@/lib/landing-config";

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

export interface BenefitItem {
  id: string;
  icon: "telegram" | "sheet" | "speed" | "payment" | "policy" | "protection" | "pixel";
  title: {
    bn: string;
    en: string;
  };
  description: {
    bn: string;
    en: string;
  };
}

export const LANDING_COPY = {
  meta: {
    title: "OrderKoro (অর্ডারকরো) - ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ",
    description:
      "ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ। কাস্টমার সাইজ ও কালার বেছে অর্ডার করে। অর্ডার সাথে সাথে আপনার টেলিগ্রামে আসে এবং নিজের গুগল শিটে জমা হয়।",
  },
  eyebrow: {
    bn: "ফেসবুক ও এফ-কমার্স সেলারদের জন্য",
    en: "For Facebook & F-commerce sellers",
  },
  hero: {
    headline: {
      bn: "ফেসবুক অ্যাড চালান? অর্ডার ইনবক্সে হারাবেন না।",
      en: "Running Facebook ads? Stop losing orders in inbox.",
    },
    subline: {
      bn: `আপনার নিজের অর্ডার পেজ তৈরি করে দিই আমরা, ${LANDING.deliveryPromise.bn}।`,
      en: `We build your custom single-product order page, ${LANDING.deliveryPromise.en}.`,
    },
    primaryCta: {
      bn: "ডেমো অর্ডার করে দেখুন",
      en: "Try demo order",
    },
    secondaryCta: {
      bn: "মেসেজ করুন",
      en: "Message us",
    },
    badges: [
      {
        bn: "সুপার ফাস্ট স্পিড",
        en: "Super fast speed",
      },
      {
        bn: "ক্যাশ অন ডেলিভারি",
        en: "Cash on Delivery",
      },
      {
        bn: "টেলিগ্রাম অ্যালার্ট",
        en: "Telegram alert",
      },
      {
        bn: "গুগল শিট ইন্টিগ্রেশন",
        en: "Google Sheets sync",
      },
    ],
    previewCard: {
      badge: {
        bn: "আপনার পেজ যেমন দেখাবে",
        en: "What your page looks like",
      },
      brandName: {
        bn: "বুনন স্টোর",
        en: "Bunon Atelier",
      },
      productTitle: {
        bn: "প্রিমিয়াম সুতি পাঞ্জাবি",
        en: "Premium Cotton Panjabi",
      },
      price: {
        bn: "৳১,৪৯০",
        en: "৳1,490",
      },
      oldPrice: {
        bn: "৳১,৮৫০",
        en: "৳1,850",
      },
      colorLabel: {
        bn: "কালার: মিডনাইট ব্লু",
        en: "Color: Midnight Blue",
      },
      sizeLabel: {
        bn: "সাইজ নির্বাচন:",
        en: "Select size:",
      },
      ctaButton: {
        bn: "অর্ডার কনফার্ম করুন",
        en: "Confirm Order",
      },
      pillSpeed: {
        bn: "⚡ ১ সেকেন্ডে লোড",
        en: "⚡ 1s fast load",
      },
      pillSync: {
        bn: "✓ শিট ও টেলিগ্রাম সিঙ্ক",
        en: "✓ Sheets & Telegram sync",
      },
    },
  },
  problemStrip: {
    title: {
      bn: "যে সমস্যাগুলোর সমাধান পাবেন",
      en: "Common seller problems we solve",
    },
    items: [
      {
        id: "p1",
        bn: "ইনবক্সে অর্ডার হারিয়ে যায়",
        en: "Orders get lost in inbox",
      },
      {
        id: "p2",
        bn: "ফেক ও ডুপ্লিকেট অর্ডার",
        en: "Fake and duplicate orders",
      },
      {
        id: "p3",
        bn: "স্লো পেজে অ্যাডের টাকা নষ্ট",
        en: "Slow landing pages waste ad budget",
      },
      {
        id: "p4",
        bn: "খাতায় হাতে অর্ডার লেখা",
        en: "Writing orders by hand in notebooks",
      },
    ],
  },
  howItWorks: {
    title: {
      bn: "কীভাবে কাজ করে?",
      en: "How does it work?",
    },
    subtitle: {
      bn: "সহজ ৩ ধাপে আপনার অর্ডার পেজ চালু করুন",
      en: "Launch your order page in 3 easy steps",
    },
    steps: [
      {
        number: "০১",
        numberEn: "01",
        title: {
          bn: "পণ্যের ছবি ও তথ্য দিন",
          en: "Send product photos and details",
        },
        description: {
          bn: "পণ্যের ছবি, সাইজ, রঙ, দাম এবং ডেলিভারি চার্জের তথ্য আমাদের দিন।",
          en: "Send your product photos, sizes, available colors, prices, and delivery charges.",
        },
      },
      {
        number: "০২",
        numberEn: "02",
        title: {
          bn: "আমরা পেজ বানিয়ে লিংক দিই",
          en: "We build your page and send the link",
        },
        description: {
          bn: `${LANDING.deliveryPromise.bn} আপনার পেজ তৈরি করে প্রস্তুত লিংক বুঝিয়ে দেওয়া হবে।`,
          en: `Your high-converting page is prepared and delivered ${LANDING.deliveryPromise.en}.`,
        },
      },
      {
        number: "০৩",
        numberEn: "03",
        title: {
          bn: "লিংক অ্যাডে বসান, অর্ডার আসে আপনার টেলিগ্রামে ও গুগল শিটে",
          en: "Put the link in your ads, orders arrive in your Telegram and Google Sheet",
        },
        description: {
          bn: "ফেসবুক বিজ্ঞাপনে লিংক দিন। প্রতিটি নতুন অর্ডার সাথে সাথে আপনার ফোনে নোটিফিকেশন আসবে।",
          en: "Attach the link to your Facebook ads. Every new order immediately alerts your phone.",
        },
      },
    ],
  },
  whatYouGet: {
    title: {
      bn: "যা যা পাচ্ছেন",
      en: "What you get",
    },
    subtitle: {
      bn: "আপনার বিজনেসের সেলস বৃদ্ধি ও সময় বাঁচানোর সব সুবিধা",
      en: "Everything you need to boost sales and save hours every day",
    },
    items: [
      {
        id: "benefit-telegram",
        icon: "telegram" as const,
        title: {
          bn: "নতুন অর্ডার এলেই ফোনে টেলিগ্রাম মেসেজ",
          en: "Instant Telegram notification when an order arrives",
        },
        description: {
          bn: "ইনবক্স চেক করার ঝামেলা নেই। কাস্টমার অর্ডার সাবমিট করলেই পূর্ণ বিবরণসহ টেলিগ্রামে অ্যালার্ট পাবেন।",
          en: "No more checking messy inboxes. Instant alerts with full order details ring right on your phone.",
        },
      },
      {
        id: "benefit-sheet",
        icon: "sheet" as const,
        title: {
          bn: "সব অর্ডার আপনার নিজের গুগল শিটে, ডেটা আপনার",
          en: "All orders in your own Google Sheet, you own your data",
        },
        description: {
          bn: "অর্ডার স্বয়ংক্রিয়ভাবে আপনার গুগল শিটে জমা হয়। ডেটার পূর্ণ মালিকানা শুধুই আপনার।",
          en: "Every customer order auto-syncs to your Google Sheet. You retain 100% data ownership.",
        },
      },
      {
        id: "benefit-speed",
        icon: "speed" as const,
        title: {
          bn: "মোবাইলে দ্রুত লোড",
          en: "Fast loading on mobile",
        },
        description: {
          bn: "বাংলাদেশের যেকোনো মোবাইল ৪জি কানেকশনে পলকের মধ্যে খোলে। লোডিং দেরিতে কাস্টমার হারানোর ভয় নেই।",
          en: "Loads in the blink of an eye on mobile 4G networks, keeping bounce rates minimal.",
        },
      },
      {
        id: "benefit-payment",
        icon: "payment" as const,
        title: {
          bn: LANDING_CLAIMS.mobilePayments
            ? "ক্যাশ অন ডেলিভারি (+ বিকাশ ও নগদ)"
            : "ক্যাশ অন ডেলিভারি",
          en: LANDING_CLAIMS.mobilePayments
            ? "Cash on Delivery (+ bKash & Nagad)"
            : "Cash on Delivery",
        },
        description: {
          bn: LANDING_CLAIMS.mobilePayments
            ? "সারা দেশে ক্যাশ অন ডেলিভারির পাশাপাশি বিকাশ ও নগদ ট্রানজেকশন আইডি নেওয়ার সুবিধা।"
            : "ক্যাশ অন ডেলিভারিতে এলাকাভিত্তিক স্বয়ংক্রিয় ডেলিভারি চার্জ গণনার সুবিধা।",
          en: LANDING_CLAIMS.mobilePayments
            ? "Nationwide Cash on Delivery with upfront TrxID collection for bKash and Nagad."
            : "Smooth Cash on Delivery checkout with automatic location-based delivery fees.",
        },
      },
      {
        id: "benefit-policy",
        icon: "policy" as const,
        title: {
          bn: "রিটার্ন ও প্রাইভেসি পেজ রেডি",
          en: "Return & privacy policy pages ready",
        },
        description: {
          bn: "ফেসবুক অ্যাড পলিসি মানতে এবং কাস্টমারের ভরসা বাড়াতে রিটার্ন ও প্রাইভেসি পেজ রেডি থাকে।",
          en: "Pre-built return, exchange, and privacy policy pages to build buyer trust and satisfy ad policies.",
        },
      },
      ...(LANDING_CLAIMS.duplicateProtection
        ? [
            {
              id: "benefit-protection",
              icon: "protection" as const,
              title: {
                bn: "ডুপ্লিকেট সাবমিট থেকে সুরক্ষা",
                en: "Protection against duplicate submissions",
              },
              description: {
                bn: "কাস্টমার বাটন ডাবল ট্যাপ করলেও ডুপ্লিকেট অর্ডার ঢুকবে না। অর্ডার ও ট্রানজেকশন আইডি সুরক্ষিত থাকে।",
                en: "Smart deduplication prevents accidental duplicate orders when buyers tap repeatedly.",
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
                bn: "ফেসবুক পিক্সেল ও কনভার্সন এপিআই (CAPI)",
                en: "Facebook Pixel & Conversions API (CAPI)",
              },
              description: {
                bn: "ব্রাউজার ও সার্ভার দুই পাশ থেকেই নির্ভুল ইভেন্ট ট্র্যাকিং।",
                en: "Flawless dual tracking via both browser Pixel and server-side Conversions API.",
              },
            },
          ]
        : []),
    ] as BenefitItem[],
  },
  demoBlock: {
    badge: {
      bn: "লাইভ প্রিভিউ",
      en: "Live Preview",
    },
    title: {
      bn: "টেলিগ্রামে অ্যালার্ট কীভাবে আসে দেখুন",
      en: "See how Telegram order alerts look",
    },
    subtitle: {
      bn: "অর্ডার সম্পন্ন হওয়া মাত্র সেকেন্ডের মধ্যে আপনার ফোনে এমন অ্যালার্ট পৌঁছে যায়:",
      en: "The exact moment an order is placed, an instant alert arrives on your phone:",
    },
    warning: {
      bn: "ডেমোতে আসল নাম/নম্বর দেবেন না।",
      en: "Do not enter real name or phone number in the demo.",
    },
    channelNotice: {
      bn: "চ্যানেলে অ্যালার্টে ট্যাপ করেও দেখতে পারেন",
      en: "You can also tap alerts in the public channel to test it live",
    },
    channelButton: {
      bn: "পাবলিক ডেমো চ্যানেল দেখুন",
      en: "View Telegram Demo Channel",
    },
    tryDemoButton: {
      bn: "ডেমো অর্ডার করে দেখুন",
      en: "Try demo order",
    },
    features: [
      {
        bn: "কাস্টমারের নাম, ফোন নম্বর ও এলাকা",
        en: "Customer name, phone, and area",
      },
      {
        bn: "পণ্যের সাইজ, রঙ, পরিমাণ ও মোট হিসাব",
        en: "Product size, color, qty, and total",
      },
      {
        bn: "ক্যাশ অন ডেলিভারি বা বিকাশ TrxID ট্র্যাকিং",
        en: "Cash on delivery or bKash TrxID tracking",
      },
      {
        bn: "১-ট্যাপে অর্ডার কনফার্ম বা ক্যানসেল বাটন",
        en: "1-tap order confirm and cancel buttons",
      },
    ],
    mock: {
      tag: "ডেমো",
      orderNumber: "BNN-1042",
      status: "NEW",
      customerLabel: { bn: "Customer:", en: "Customer:" },
      customerValue: "তানজিম আহমেদ",
      phoneLabel: { bn: "Phone:", en: "Phone:" },
      phoneValue: "01XXX-XXX***",
      addressLabel: { bn: "Address:", en: "Address:" },
      addressValue: "***, Dhaka (ঢাকা সিটি)",
      itemLabel: { bn: "Item:", en: "Item:" },
      itemValue: {
        bn: "প্রিমিয়াম সুতি পাঞ্জাবি (নকশী কলার)",
        en: "Premium Cotton Panjabi (Nakshi Collar)",
      },
      colorLabel: { bn: "Color:", en: "Color:" },
      colorValue: { bn: "কালো (Black)", en: "Black" },
      sizeLabel: { bn: "Size:", en: "Size:" },
      sizeValue: "L (42)",
      qtyLabel: { bn: "Qty:", en: "Qty:" },
      qtyValue: "1 × ৳1490",
      deliveryLabel: { bn: "Delivery:", en: "Delivery:" },
      deliveryValue: "৳70",
      paymentLabel: { bn: "Payment:", en: "Payment:" },
      paymentValue: { bn: "Cash on Delivery", en: "Cash on Delivery" },
      totalLabel: { bn: "Total Payable:", en: "Total Payable:" },
      totalValue: "৳1560",
      btnConfirm: { bn: "✅ Confirm", en: "✅ Confirm" },
      btnNoAnswer: { bn: "📵 No answer", en: "📵 No answer" },
      btnCancel: { bn: "❌ Cancel", en: "❌ Cancel" },
    },
  },
  pricing: {
    title: {
      bn: "সহজ ও স্বচ্ছ প্রাইসিং",
      en: "Simple, transparent pricing",
    },
    subtitle: {
      bn: "কোনো গোপন চার্জ নেই। যা লেখা আছে ঠিক তাই।",
      en: "No hidden charges. Exactly what you see.",
    },
    earlyCard: {
      badge: (total: number, lang: SupportedLocale) =>
        lang === "bn"
          ? `প্রথম ${formatNumber(total, "bn")} জন সেলার`
          : `First ${formatNumber(total, "en")} sellers`,
      price: (amount: number, lang: SupportedLocale) => formatPrice(amount, lang),
      oneTimeLabel: {
        bn: "একবারই",
        en: "one-time",
      },
      remainingText: (remaining: number, total: number, lang: SupportedLocale) =>
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
        en: `After this, setup fee is ${formatPrice(LANDING.standardPrice, "en")} (including first ${formatNumber(LANDING.standardIncludedMonths, "en")} months hosting & support).`,
      },
      ctaButton: {
        bn: "লঞ্চ অফারে শুরু করুন",
        en: "Claim launch offer",
      },
    },
    standardCard: {
      badge: {
        bn: "স্ট্যান্ডার্ড প্যাকেজ",
        en: "Standard package",
      },
      title: {
        bn: "কমপ্লিট অর্ডার পেজ সেটআপ",
        en: "Complete order page setup",
      },
      price: (amount: number, lang: SupportedLocale) => formatPrice(amount, lang),
      includedNote: (months: number, lang: SupportedLocale) =>
        lang === "bn"
          ? `প্রথম ${formatNumber(months, "bn")} মাসের হোস্টিং ও সাপোর্টসহ`
          : `Includes first ${formatNumber(months, "en")} months hosting & support`,
      featuresTitle: {
        bn: "কী কী পাবেন:",
        en: "What's included:",
      },
      features: [
        {
          bn: "১টি পণ্যের জন্য ফাস্ট-লোডিং ল্যান্ডিং পেজ",
          en: "Fast-loading landing page for 1 product",
        },
        {
          bn: "প্রতি অর্ডারে ইনস্ট্যান্ট টেলিগ্রাম অ্যালার্ট",
          en: "Instant Telegram alert on every order",
        },
        {
          bn: "আপনার নিজস্ব গুগল শিটে সব ডেটা সংরক্ষণ",
          en: "All order data saved to your own Google Sheet",
        },
        {
          bn: "ক্যাশ অন ডেলিভারি ও মোবাইল পেমেন্ট (বিকাশ ও নগদ)",
          en: "Cash on Delivery & mobile payments (bKash & Nagad)",
        },
        {
          bn: "রিটার্ন পলিসি ও প্রাইভেসি পলিসি পেজ",
          en: "Dedicated return and privacy policy pages",
        },
        {
          bn: `প্রথম ${formatNumber(LANDING.standardIncludedMonths, "bn")} মাসের হোস্টিং ও টেকনিক্যাল সাপোর্ট`,
          en: `First ${formatNumber(LANDING.standardIncludedMonths, "en")} months hosting & technical support`,
        },
      ],
      extraCostsTitle: {
        bn: "আলাদা খরচ:",
        en: "Separate costs:",
      },
      extraCosts: [
        {
          bn: "ফেসবুক অ্যাডের নিজস্ব খরচ",
          en: "Facebook advertising spend",
        },
        {
          bn: "আলাদা কাস্টম ডোমেইন (.com ইত্যাদি) চাইলে তার খরচ",
          en: "Custom domain (.com etc.) if desired",
        },
      ],
      ctaButton: {
        bn: "সেটআপ শুরু করুন",
        en: "Get started",
      },
    },
  },
  faq: {
    title: {
      bn: "সচরাচর সাধারণ জিজ্ঞাসা (FAQ)",
      en: "Frequently asked questions (FAQ)",
    },
    subtitle: {
      bn: "আপনার মনের যেকোনো প্রশ্নের স্পষ্ট উত্তর",
      en: "Clear answers to your questions",
    },
    items: [
      {
        id: "faq-data",
        question: {
          bn: "ডেটা কার কাছে থাকে?",
          en: "Who owns the customer data?",
        },
        answer: {
          bn: "আপনার কাস্টমারের সমস্ত ডেটা শুধুই আপনার নিজস্ব গুগল শিটে জমা হয়। আমরা কোনো কাস্টমার ডেটা বিক্রি, শেয়ার বা অন্য কোনো উদ্দেশ্যে ব্যবহার করি না। সম্পূর্ণ ডেটার মালিকানা আপনার নিজের।",
          en: "All customer data is saved directly into your own Google Sheet. We do not sell, share, or store customer data anywhere else. You retain 100% data ownership.",
        },
      },
      {
        id: "faq-delivery-time",
        question: {
          bn: "কতদিনে পেজ পাব?",
          en: "How long does it take to get the page?",
        },
        answer: {
          bn: `আপনার পণ্যের ছবি, সাইজ, কালার, মূল্য ও ডেলিভারি তথ্য দেওয়ার ${LANDING.deliveryPromise.bn} আপনার পেজ লাইভ করে লিঙ্ক বুঝিয়ে দেওয়া হয়।`,
          en: `Once you provide product photos, sizes, colors, pricing, and delivery details, your page is delivered live ${LANDING.deliveryPromise.en}.`,
        },
      },
      {
        id: "faq-changes",
        question: {
          bn: "পেজ বদলাতে চাইলে?",
          en: "What if I want to change the page?",
        },
        answer: {
          bn: "মূল্য পরিবর্তন, স্টক আউট বা টেক্সটের ছোটখাটো সংশোধনের সাপোর্ট সেটআপের সাথে অন্তর্ভুক্ত। তবে নতুন পণ্যের আলাদা পেজ বা সম্পূর্ণ নতুন ডিজাইনের জন্য আলাদা চার্জ প্রযোজ্য।",
          en: "Routine minor updates like price adjustments, sold-out markings, or text fixes are covered. Creating a page for a new product or a brand-new design is billed separately.",
        },
      },
      {
        id: "faq-delivery-returns",
        question: {
          bn: "ডেলিভারি ও রিটার্ন কীভাবে?",
          en: "How are delivery and returns handled?",
        },
        answer: {
          bn: "অর্ডার ফর্মে গ্রাহকের এলাকা অনুযায়ী (যেমন: ঢাকা সিটি, ঢাকার বাইরে) সঠিক ডেলিভারি চার্জ স্বয়ংক্রিয়ভাবে যোগ হয়। এছাড়া ফেসবুক পলিসি মানতে আপনার রিটার্ন ও এক্সচেঞ্জ পলিসির আলাদা পেজ অর্ডার পেজের সাথেই দেওয়া থাকে।",
          en: "Delivery charges are calculated automatically based on the customer's area (e.g. Dhaka City, Outside Dhaka). Compliant return and exchange policy pages are also included with your order page.",
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
            ? "আমরা ব্রাউজার পিক্সেল এবং সার্ভার-সাইড কনভার্সন এপিআই (CAPI) দুটোই যুক্ত করে দিই, যাতে আইওএস বা অ্যাডব্লকার থাকলেও ১০০% সেলস ট্র্যাক হয়।"
            : "শিগগিরই আসছে। আমরা ব্রাউজার ও সার্ভার-সাইড (CAPI) ট্র্যাকিং নিখুঁতভাবে যুক্ত করার কাজ করছি।",
          en: LANDING_CLAIMS.pixelCapi
            ? "We connect both browser Pixel and server-side Conversions API (CAPI) so you track 100% of sales even with iOS restrictions and ad blockers."
            : "Coming soon. We are currently implementing seamless browser and server-side (CAPI) tracking.",
        },
      },
      {
        id: "faq-start",
        question: {
          bn: "কীভাবে শুরু করব?",
          en: "How do I get started?",
        },
        answer: {
          bn: "আমাদের মেসেঞ্জারে একটি মেসেজ দিন। আপনার পণ্যের ছবি ও বিবরণ পাঠান। আমরা পেজ প্রস্তুত করে ডেমো দেখাব, পছন্দ হলে ফাইনাল ডেলিভারি বুঝে নিন।",
          en: "Simply send us a message on Messenger. Provide your product photos and details. We will build your page, let you review the demo, and deliver your live link.",
        },
      },
    ],
  },
  finalCta: {
    title: {
      bn: "আজই আপনার পণ্যের অর্ডার পেজ চালু করুন",
      en: "Launch your single-product order page today",
    },
    subtitle: {
      bn: "অর্ডার ইনবক্সে হারানোর দিন শেষ। ২৪ ঘণ্টার মধ্যে আপনার পেজ রেডি করে দিই আমরা।",
      en: "Stop losing orders in inbox chaos. Get your high-converting page ready within 24 hours.",
    },
    primaryButton: {
      bn: "মেসেজ করুন",
      en: "Message us",
    },
    secondaryButton: {
      bn: "ডেমো অর্ডার করে দেখুন",
      en: "Try demo order",
    },
  },
  stickyBar: {
    messageUs: {
      bn: "মেসেজ করুন",
      en: "Message us",
    },
    demoButton: {
      bn: "ডেমো দেখুন",
      en: "Try demo",
    },
  },
  footer: {
    tagline: {
      bn: "ফেসবুক সেলারদের জন্য এক পণ্যের ফাস্ট অর্ডার পেজ",
      en: "Single-product high-converting order pages for Facebook sellers",
    },
    privacy: {
      bn: "প্রাইভেসি পলিসি",
      en: "Privacy Policy",
    },
    terms: {
      bn: "শর্তাবলী",
      en: "Terms & Conditions",
    },
    copyright: {
      bn: "© ২০২৬ OrderKoro। সর্বস্বত্ব সংরক্ষিত।",
      en: "© 2026 OrderKoro. All rights reserved.",
    },
  },
};
