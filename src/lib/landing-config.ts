export interface LocalizedString {
  bn: string;
  en: string;
}

export interface LandingConfig {
  deliveryPromise: LocalizedString;
  earlyOfferTotal: number;
  earlyOfferRemaining: number;
  earlyPrice: number;
  standardPrice: number;
  standardIncludedMonths: number;
  monthly: number | null;
}

export const LANDING: LandingConfig = {
  deliveryPromise: { bn: "২৪ ঘণ্টার মধ্যে", en: "within 24 hours" },
  earlyOfferTotal: 5,
  earlyOfferRemaining: 5, // I edit this by hand as I sign sellers
  earlyPrice: 1999,
  standardPrice: 2999,
  standardIncludedMonths: 3,
  monthly: null, // do NOT show any monthly price while null
};

export const LANDING_CLAIMS = {
  pixelCapi: false,
  mobilePayments: true,
  duplicateProtection: true,
};
