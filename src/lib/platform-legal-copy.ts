export interface LegalSection {
  id: string;
  title: {
    bn: string;
    en: string;
  };
  paragraphs: Array<{
    bn: string;
    en: string;
  }>;
  listItems?: Array<{
    bn: string;
    en: string;
  }>;
}

export interface PlatformLegalDocument {
  title: {
    bn: string;
    en: string;
  };
  lastUpdated: {
    bn: string;
    en: string;
  };
  subtitle: {
    bn: string;
    en: string;
  };
  sections: LegalSection[];
  contactBox: {
    title: {
      bn: string;
      en: string;
    };
    description: {
      bn: string;
      en: string;
    };
    messengerLabel: {
      bn: string;
      en: string;
    };
    messengerUrl: string;
  };
}

export const PLATFORM_PRIVACY_COPY: PlatformLegalDocument = {
  title: {
    bn: "প্রাইভেসি পলিসি (Privacy Policy)",
    en: "Privacy Policy",
  },
  lastUpdated: {
    bn: "সর্বশেষ সংস্করণ: নভেম্বর ২০২৬",
    en: "Last updated: November 2026",
  },
  subtitle: {
    bn: "OrderKoro প্ল্যাটফর্মের গ্রাহক ও সেলার তথ্য সুরক্ষা নীতিমালা",
    en: "Customer and seller data protection policy for the OrderKoro platform",
  },
  sections: [
    {
      id: "intro",
      title: {
        bn: "১. ভূমিকা ও মূল অঙ্গীকার",
        en: "1. Introduction & Core Commitment",
      },
      paragraphs: [
        {
          bn: "OrderKoro (https://orderkoro.shop) ফেসবুক ও অনলাইন সেলারদের জন্য এক-পণ্যের ফাস্ট অর্ডার পেজ তৈরি ও পরিচালনার সফটওয়্যার সেবা প্রদান করে। আমরা সেলার এবং তাদের ক্রেতাদের তথ্যের গোপনীয়তা রক্ষা করতে সম্পূর্ণ দায়বদ্ধ।",
          en: "OrderKoro (https://orderkoro.shop) provides software services for single-product high-converting order pages for Facebook and online sellers. We are strictly committed to safeguarding the privacy and security of both sellers and their customers.",
        },
        {
          bn: "আমাদের নীতি স্পষ্ট: আমরা কোনো সেলারের কাস্টমার ডেটা বিক্রি করি না, ভাড়া দিই না এবং বিজ্ঞাপনের উদ্দেশ্যে কোনো তৃতীয় পক্ষের কাছে হস্তান্তর করি না। সব অর্ডার তথ্য সরাসরি সেলারের নিজস্ব গুগল ড্রাইভে সেভ হয়।",
          en: "Our core pledge is simple: we never sell, rent, or monetize sellers' customer data, nor do we disclose it to third parties for advertising purposes. Order data is routed directly to the seller's own Google Sheet.",
        },
      ],
    },
    {
      id: "data-collected",
      title: {
        bn: "২. আমরা কোন তথ্য প্রক্রিয়াকরণ করি",
        en: "2. Information We Process",
      },
      paragraphs: [
        {
          bn: "আমাদের সার্ভিস পরিচালনার সুবিধার্থে দুই ধরণের তথ্য প্রক্রিয়াকরণ করা হয়:",
          en: "To operate our platform effectively, we process two categories of information:",
        },
      ],
      listItems: [
        {
          bn: "সেলার তথ্য: সার্ভিস চালুর সময় সেলারের নাম, পেজ লিংক, টেলিগ্রাম চ্যানেল/চ্যাট আইডি এবং গুগল শিটের অনুমতি।",
          en: "Seller details: Name, Facebook page link, Telegram chat ID, and Google Sheet authorization during setup.",
        },
        {
          bn: "ক্রেতার অর্ডার তথ্য: ক্রেতা যখন সেলারের পেজে অর্ডার করেন, তখন সংগৃহীত নাম, মোবাইল নম্বর, ডেলিভারি ঠিকানা, পণ্যের রঙ/সাইজ এবং পেমেন্ট ট্রানজেকশন আইডি (প্রযোজ্য ক্ষেত্রে)।",
          en: "Buyer order details: Name, phone number, delivery address, selected size/color, and payment transaction ID (where applicable) submitted via the order page.",
        },
        {
          bn: "টেকনিক্যাল সিকিউরিটি ডেটা: ফেক বা স্প্যাম অর্ডার রোধের জন্য ক্রেতার আইপি অ্যাড্রেস এবং ব্রাউজার ইউজার এজেন্ট সাময়িকভাবে যাচাই করা হয়।",
          en: "Technical security data: IP addresses and browser user-agent signatures evaluated temporarily for rate limiting and spam prevention.",
        },
      ],
    },
    {
      id: "data-usage",
      title: {
        bn: "৩. তথ্যের ব্যবহার ও উদ্দেশ্য",
        en: "3. How We Use Data",
      },
      paragraphs: [
        {
          bn: "সংগৃহীত তথ্যাবলী কেবলমাত্র নিম্নোক্ত কার্যক্রমে ব্যবহার করা হয়:",
          en: "Processed data is exclusively utilized for the following functional purposes:",
        },
      ],
      listItems: [
        {
          bn: "সেলারকে তাৎক্ষণিকভাবে নতুন অর্ডারের টেলিগ্রাম অ্যালার্ট নোটিফিকেশন প্রদান করা।",
          en: "Dispatching instant real-time Telegram alert notifications to the seller.",
        },
        {
          bn: "সেলারকে তার নিজস্ব গুগল শিটে স্বয়ংক্রিয়ভাবে অর্ডার সংরক্ষণ করে দেওয়া।",
          en: "Automatically syncing order records into the seller's designated Google Sheet.",
        },
        {
          bn: "ক্রেতাকে তার অর্ডারের স্ট্যাটাস ট্র্যাকিং লিংক প্রদান করা।",
          en: "Providing customers with a cryptographically secure status tracking link.",
        },
        {
          bn: "ডুপ্লিকেট সাবমিশন ও একই গ্রাহকের ভুলবশত একাধিকবার অর্ডার করা ঠেকানো।",
          en: "Preventing accidental duplicate submissions and blocking fraudulent attempts.",
        },
      ],
    },
    {
      id: "storage-retention",
      title: {
        bn: "৪. ডেটা সংরক্ষণ ও নিরাপত্তা",
        en: "4. Data Storage & Security",
      },
      paragraphs: [
        {
          bn: "OrderKoro কোনো কেন্দ্রীয় ডেটাবেজে গ্রাহকের ব্যক্তিগত তথ্য (নাম, পূর্ণ ঠিকানা, ফোন) স্থায়ীভাবে সংরক্ষণ করে না। গ্রাহকের মূল ডেটা শুধুই সেলারের নিজস্ব গুগল শিটে থাকে, যার মালিকানা সম্পূর্ণ সেলারের।",
          en: "OrderKoro does not store permanent central databases of customer PII (full address, phone number). The master copy of customer records resides solely in the seller's private Google Sheet.",
        },
        {
          bn: "অর্ডার ট্র্যাকিং ও ডেলিভারি স্ট্যাটাস লিংকের কার্যকারিতার জন্য সাময়িক ক্যাশে (Redis) সর্বোচ্চ ৯০ দিনের মেয়াদে সুরক্ষিত টোকেন রাখা হয়। মেয়াদ উত্তীর্ণের পর তা স্বয়ংক্রিয়ভাবে মুছে যায়।",
          en: "For order status tracking and deduplication, transient cache records (Redis) are retained under secure tokens with a maximum 90-day time-to-live (TTL), after which they expire permanently.",
        },
      ],
    },
    {
      id: "third-parties",
      title: {
        bn: "৫. থার্ড-পার্টি সার্ভিস ও অবকাঠামো",
        en: "5. Third-Party Services & Infrastructure",
      },
      paragraphs: [
        {
          bn: "সার্ভিস সুষ্ঠুভাবে পরিচালনার জন্য বিশ্বমানের নিরাপদ অবকাঠামো ব্যবহার করা হয়:",
          en: "To deliver reliable and secure operations, we utilize trusted cloud infrastructure:",
        },
      ],
      listItems: [
        {
          bn: "টেলিগ্রাম বট এপিআই: সেলারের ফোনে নোটিফিকেশন পৌঁছানোর জন্য।",
          en: "Telegram Bot API: For transmitting real-time order alerts to the seller.",
        },
        {
          bn: "গুগল ওয়ার্কস্পেস / গুগল শিটস এপিআই: সেলারের নিজস্ব শিটে ডেটা লেখার জন্য।",
          en: "Google Sheets API: For securely appending customer order rows into the seller's sheet.",
        },
        {
          bn: "ভার্সেল (Vercel) ও আপস্ট্যাশ (Upstash): হাই-স্পিড এজ হোস্টিং ও সিকিউর ক্যাশিংয়ের জন্য।",
          en: "Vercel & Upstash: High-speed edge hosting and encrypted ephemeral cache infrastructure.",
        },
      ],
    },
    {
      id: "contact",
      title: {
        bn: "৬. প্রশ্ন ও যোগাযোগ",
        en: "6. Questions & Contact",
      },
      paragraphs: [
        {
          bn: "প্রাইভেসি পলিসি সম্পর্কিত যেকোনো জিজ্ঞাসা বা ডেটা সংক্রান্ত অনুরোধের জন্য আমাদের ফেসবুক মেসেঞ্জারে সরাসরি নক দিতে পারেন।",
          en: "For any questions regarding this Privacy Policy or data inquiries, reach out directly to our team via Facebook Messenger.",
        },
      ],
    },
  ],
  contactBox: {
    title: {
      bn: "প্রাইভেসি হেল্পডেস্ক",
      en: "Privacy Helpdesk",
    },
    description: {
      bn: "ডেটা সুরক্ষা সংক্রান্ত যেকোনো বিষয়ে আমাদের মেসেঞ্জারে যোগাযোগ করুন।",
      en: "Reach out via Messenger for any data protection or privacy questions.",
    },
    messengerLabel: {
      bn: "মেসেঞ্জারে যোগাযোগ করুন",
      en: "Contact on Messenger",
    },
    messengerUrl: "https://m.me/61596152341071",
  },
};

export const PLATFORM_TERMS_COPY: PlatformLegalDocument = {
  title: {
    bn: "ব্যবহারের শর্তাবলী (Terms & Conditions)",
    en: "Terms & Conditions",
  },
  lastUpdated: {
    bn: "সর্বশেষ সংস্করণ: নভেম্বর ২০২৬",
    en: "Last updated: November 2026",
  },
  subtitle: {
    bn: "OrderKoro সফটওয়্যার ও ল্যান্ডিং পেজ সার্ভিসের ব্যবহারের নিয়মাবলী",
    en: "Service terms and rules for using the OrderKoro software platform",
  },
  sections: [
    {
      id: "acceptance",
      title: {
        bn: "১. শর্তাবলীতে সম্মতি",
        en: "1. Acceptance of Terms",
      },
      paragraphs: [
        {
          bn: "OrderKoro (https://orderkoro.shop) প্ল্যাটফর্ম ব্যবহার বা পেজ সেটআপ সার্ভিসের জন্য অনুরোধ জানানোর মাধ্যমে আপনি এই ব্যবহারের শর্তাবলীর সাথে সম্পূর্ণ সম্মত হচ্ছেন।",
          en: "By accessing the OrderKoro (https://orderkoro.shop) platform or commissioning a single-product order page, you agree to be legally bound by these Terms and Conditions.",
        },
      ],
    },
    {
      id: "scope",
      title: {
        bn: "২. সার্ভিসের পরিধি ও সুযোগ",
        en: "2. Scope of Services",
      },
      paragraphs: [
        {
          bn: "OrderKoro অনলাইন সেলারদের জন্য ১টি একক পণ্যের জন্য ফাস্ট-লোডিং ল্যান্ডিং পেজ তৈরি, ক্লাউড হোস্টিং, টেলিগ্রাম ইনস্ট্যান্ট অ্যালার্ট বট সংযোগ এবং গুগল শিট ইন্টিগ্রেশনের প্রযুক্তিগত সুবিধা প্রদান করে।",
          en: "OrderKoro provides single-product high-converting landing page creation, cloud hosting, instant Telegram alert integration, and Google Sheet synchronization services for digital sellers.",
        },
      ],
      listItems: [
        {
          bn: "লঞ্চ অফার (৳১,৯৯৯ একবারই): যতদিন OrderKoro চালু আছে, পেজ অনলাইন রাখা, বাগ ফিক্স এবং টেলিগ্রাম/গুগল শিট সংযোগের টেকনিক্যাল সাপোর্ট সেটআপ ফির মধ্যেই অন্তর্ভুক্ত। কোনো নিয়মিত মাসিক ফি নেই।",
          en: "Launch Offer (৳1,999 one-time): As long as OrderKoro is active, hosting maintenance, bug fixes, and Telegram/Google Sheet connection support are included with no recurring monthly fee.",
        },
        {
          bn: "স্ট্যান্ডার্ড প্যাকেজ (৳২,৯৯৯): প্রথম ৩ মাসের ক্লাউড হোস্টিং এবং টেকনিক্যাল সাপোর্ট অন্তর্ভুক্ত।",
          en: "Standard Package (৳2,999): Includes page setup plus first 3 months of hosting and technical support.",
        },
        {
          bn: "আলাদা খরচ: নতুন কোনো পণ্যের আলাদা পেজ তৈরি, কাস্টম নতুন ডিজাইন তৈরি, নিজস্ব ফেসবুক অ্যাড বাজেট এবং আলাদা কাস্টম ডোমেইন (.com ইত্যাদি) এই ফির অন্তর্ভুক্ত নয়।",
          en: "Excluded / Separate costs: Creating pages for new products, custom redesigns, Facebook ad spend, and custom third-party domain registrations are billed separately.",
        },
      ],
    },
    {
      id: "seller-responsibilities",
      title: {
        bn: "৩. সেলারের দায়িত্ব ও বাধ্যবাধকতা",
        en: "3. Seller Responsibilities",
      },
      paragraphs: [
        {
          bn: "OrderKoro শুধুমাত্র টেকনোলজি ও ল্যান্ডিং পেজ প্ল্যাটফর্ম প্রদানকারী। সেলারের নিম্নলিখিত বিষয়গুলোর একক ও সম্পূর্ণ দায়িত্ব বহন করবেন:",
          en: "OrderKoro functions solely as a technology and software facilitator. The seller assumes sole and absolute responsibility for:",
        },
      ],
      listItems: [
        {
          bn: "পণ্যের সঠিকতা: পেজে প্রদর্শিত পণ্যের বিবরণ, সাইজ, রঙ, ডেলিভারি চার্জ এবং মূল্য নির্ভুল হওয়া।",
          en: "Product accuracy: Ensuring accurate descriptions, sizes, colors, delivery fees, and pricing.",
        },
        {
          bn: "কপিরাইট ও স্বত্ব: পেজে ব্যবহারের জন্য সরবরাহকৃত ছবি ও লেখার বৈধ মালিকানা থাকা।",
          en: "Content rights: Holding lawful ownership or license for all photos and text provided.",
        },
        {
          bn: "অর্ডার ডেলিভারি ও কাস্টমার সার্ভিস: পণ্যের মান নিশ্চিত করা, কাস্টমারকে যথাসময়ে পার্সেল ডেলিভারি দেওয়া, ক্যাশ কালেকশন এবং রিটার্ন বা এক্সচেঞ্জ পরিচালনা করা।",
          en: "Fulfillment & support: Ensuring product quality, timely parcel dispatch, cash collection, and customer return/exchange management.",
        },
      ],
    },
    {
      id: "prohibited",
      title: {
        bn: "৪. নিষিদ্ধ পণ্য ও কার্যকলাপ",
        en: "4. Prohibited Uses & Products",
      },
      paragraphs: [
        {
          bn: "OrderKoro প্ল্যাটফর্মের মাধ্যমে কোনো ধরণের অনৈতিক বা অবৈধ পণ্য বিক্রি করা কঠোরভাবে নিষিদ্ধ। নিম্নোক্ত ক্ষেত্রে OrderKoro তাৎক্ষণিকভাবে কোনো নোটিশ বা রিফান্ড ছাড়াই পেজ স্থগিত বা বন্ধ করার অধিকার রাখে:",
          en: "Promoting unethical, illegal, or fraudulent items via the OrderKoro platform is strictly prohibited. OrderKoro reserves the right to immediately suspend pages without notice or refund in cases involving:",
        },
      ],
      listItems: [
        {
          bn: "জাল, নকল বা কপিরাইট লঙ্ঘনকারী পণ্য (Counterfeit items)।",
          en: "Counterfeit goods, trademark infringements, or unauthorized replicas.",
        },
        {
          bn: "বাংলাদেশের আইনে নিষিদ্ধ পণ্য বা অবৈজ্ঞানিক বিভ্রান্তিকর অফার।",
          en: "Substances, items, or claims prohibited under the laws of Bangladesh.",
        },
        {
          bn: "প্রতারণামূলক স্কিম বা টাকা নিয়ে পণ্য না দেওয়ার অভিযোগ প্রমাণিত হলে।",
          en: "Fraudulent schemes, deliberate non-delivery, or deceptive commerce practices.",
        },
      ],
    },
    {
      id: "liability",
      title: {
        bn: "৫. দায়বদ্ধতার সীমাবদ্ধতা ও তৃতীয় পক্ষ",
        en: "5. Limitation of Liability & Third Parties",
      },
      paragraphs: [
        {
          bn: "OrderKoro সর্বোচ্চ আপটাইম এবং বাগ-মুক্ত সেবা নিশ্চিত করার আপ্রাণ চেষ্টা করে। তবে তৃতীয় পক্ষের কোনো বিভ্রাটের কারণে সাময়িক সমস্যা দেখা দিলে OrderKoro কোনো পরোক্ষ ব্যবসায়িক ক্ষতির জন্য দায়ী থাকবে না:",
          en: "OrderKoro strives for maximum uptime and stability. However, OrderKoro cannot be held liable for indirect commercial losses arising from external third-party outages:",
        },
      ],
      listItems: [
        {
          bn: "ফেসবুক অ্যাড একাউন্ট বা বিজনেস ম্যানেজারের কোনো নিজস্ব নিষেধাজ্ঞা বা পলিসি সিদ্ধান্ত।",
          en: "Account suspensions or policy decisions implemented by Meta / Facebook.",
        },
        {
          bn: "টেলিগ্রাম বা গুগল শিট ক্লাউড সার্ভারের আকস্মিক বৈশ্বিক ডাউনটাইম।",
          en: "Global upstream service disruptions by Telegram, Google Cloud, or internet transit providers.",
        },
        {
          bn: "সেলার ও কুরিয়ারের মধ্যকার কোনো ক্ষতি বা পার্সেল বিনষ্ট হওয়া।",
          en: "Loss, delay, or damage caused during transit between courier services and customers.",
        },
      ],
    },
    {
      id: "governing-law",
      title: {
        bn: "৬. প্রযোজ্য আইন ও বিচারিক এখতিয়ার",
        en: "6. Governing Law & Jurisdiction",
      },
      paragraphs: [
        {
          bn: "এই ব্যবহারের শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের প্রচলিত তথ্য ও যোগাযোগ প্রযুক্তি আইন এবং ই-কমার্স নির্দেশিকা অনুসারে পরিচালিত ও নিয়ন্ত্রিত হবে।",
          en: "These Terms and Conditions shall be governed by and interpreted in accordance with the laws, digital commerce regulations, and ICT statutes of the People's Republic of Bangladesh.",
        },
      ],
    },
  ],
  contactBox: {
    title: {
      bn: "সাপোর্ট ও যোগাযোগ",
      en: "Support & Inquiries",
    },
    description: {
      bn: "শর্তাবলী সম্পর্কিত যেকোনো প্রশ্ন থাকলে আমাদের সাথে মেসেঞ্জারে সরাসরি কথা বলুন।",
      en: "Have questions about these terms? Message our team directly.",
    },
    messengerLabel: {
      bn: "মেসেঞ্জারে যোগাযোগ করুন",
      en: "Contact on Messenger",
    },
    messengerUrl: "https://m.me/61596152341071",
  },
};
