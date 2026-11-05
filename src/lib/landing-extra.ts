// src/lib/landing-extra.ts
// NEW file. Everything you may want to edit by hand on the landing page lives here,
// so you never have to touch landing-config.ts or the components.

export type Bi = { bn: string; en: string };

export interface Shot {
  src: string; // path under /public, e.g. "/landing/demo-page-390.webp"
  width: number;
  height: number;
  alt: Bi;
}

/** Real screenshots. Leave a value null and that block is hidden (no fake mockups). */
export const SHOTS: {
  demoPage: Shot | null;
  telegram: Shot | null;
  sheet: Shot | null;
} = {
  // Example once you have the file:
  // demoPage: { src: "/landing/demo-page-390.webp", width: 390, height: 844,
  //   alt: { bn: "ডেমো অর্ডার পেজ", en: "Demo order page" } },
  demoPage: null,
  telegram: null,
  sheet: null,
};

/** Only keep true if you really take no per-order commission. */
export const NO_COMMISSION = true;

/** Shown under the hero buttons. Set only if you will honour it. null = hidden. */
export const RISK_REVERSAL: Bi | null = null;
// Example:
// export const RISK_REVERSAL: Bi | null = {
//   bn: "আগে পেজ দেখুন, পছন্দ হলে তবেই পেমেন্ট",
//   en: "See the page first, pay only if you like it",
// };

/** Fill after you measure the LIVE production site. Both must be set to show the badge. */
export const MEASURED: {
  lighthouseMobile: number | null;
  measuredOn: string | null;
} = {
  lighthouseMobile: null, // e.g. 96
  measuredOn: null, // e.g. "৫ নভেম্বর ২০২৬" / "5 Nov 2026" (shown as-is)
};

/** "About" block. null = hidden. */
export const FOUNDER: {
  name: Bi;
  role: Bi;
  note: Bi;
  photo?: { src: string; width: number; height: number };
} | null = null;

/** Optional phone number for a "call us" link in the final CTA, e.g. "01XXXXXXXXX". */
export const CONTACT_PHONE: string | null = null;

/** Footer links. Change to "/privacy" and "/terms" once OrderKoro's own pages exist. */
export const LEGAL_LINKS = {
  privacy: "/privacy",
  terms: "/terms",
};

export const DEMO_PATH = "/demo-brand";

/**
 * FAQ answer about data. VERIFY against what your server really stores
 * (Sheet, Redis order state, idempotency keys, TrxID reservations) before launch.
 */
export const DATA_FAQ_ANSWER: Bi = {
  bn: "আপনার কাস্টমারের অর্ডারের সব তথ্য আপনার নিজের গুগল শিটে জমা হয়। আমরা কোনো কাস্টমার ডেটা বিক্রি করি না বা বিজ্ঞাপনে ব্যবহার করি না। অর্ডার প্রসেস করতে যতটুকু দরকার, শুধু ততটুকু তথ্যই আমাদের সার্ভারে থাকে।",
  en: "All your customers' order details are saved in your own Google Sheet. We never sell customer data or use it for ads. Our servers keep only what is needed to process an order.",
};
