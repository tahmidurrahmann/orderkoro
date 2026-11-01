import type { SupportedLocale } from "./format";

export interface CopyDictionary {
  // Header & Language
  langToggleBn: string;
  langToggleEn: string;
  soldOutBadge: string;
  soldOutNotice: string;

  // Gallery
  galleryTapToZoom: string;
  galleryCloseZoom: string;
  galleryPrevImage: string;
  galleryNextImage: string;
  galleryImageCount: string;

  // Pricing
  saveAmountLabel: string; // e.g. "সাশ্রয় {amount} ({percent}%)"
  codBadgeText: string;

  // Selectors
  colorLabel: string;
  sizeLabel: string;
  sizeUnavailableSuffix: string;
  sizeChartTrigger: string;
  sizeChartTitle: string;
  sizeChartClose: string;
  quantityLabel: string;
  quantityDecreaseAria: string;
  quantityIncreaseAria: string;

  // Details & Delivery
  detailsHeading: string;
  deliveryHeading: string;
  deliveryPromptSelectDistrict: string;
  deliveryEstimateTemplate: string; // "ডেলিভারি চার্জ: {charge}, সময়: {daysMin}-{daysMax} দিন"
  deliveryFreeBadge: string;
  deliveryFreeThresholdHint: string;

  // Order Form
  formHeading: string;
  formSubheading: string;
  errorSummaryHeading: string;
  fieldNameLabel: string;
  fieldNamePlaceholder: string;
  fieldNameError: string;
  fieldPhoneLabel: string;
  fieldPhonePlaceholder: string;
  fieldPhoneHint: string;
  fieldPhoneError: string;
  fieldDistrictLabel: string;
  fieldDistrictPlaceholder: string;
  fieldDistrictSearchPlaceholder: string;
  fieldDistrictNoMatch: string;
  fieldDistrictError: string;
  fieldDhakaAreaQuestion: string;
  fieldDhakaCityOption: string;
  fieldDhakaSuburbOption: string;
  fieldAddressLabel: string;
  fieldAddressPlaceholder: string;
  fieldAddressError: string;
  fieldNoteLabel: string;
  fieldNoteOptionalBadge: string;
  fieldNotePlaceholder: string;
  fieldSizeError: string;

  // Order Summary Card
  summaryHeading: string;
  summaryProductRow: string;
  summaryVariantRow: string;
  summarySubtotalRow: string;
  summaryDeliveryRow: string;
  summaryDeliveryPending: string;
  summaryTotalRow: string;
  summaryPaymentMethod: string;
  submitButtonText: string;
  submitButtonLoading: string;
  submitSoldOutText: string;

  // Sticky Mobile Bar
  stickyBarOrderNow: string;

  // Trust Block
  trustReturnBadge: string;
  trustHeading: string;
  trustPillar1Title: string;
  trustPillar1Body: string;
  trustPillar2Title: string;
  trustPillar2Body: string;
  trustPillar3Title: string;
  trustPillar3Body: string;
  trustPolicyHeading: string;
  trustContactHeading: string;
  trustCodTitle: string;
  trustCodBody: string;
  trustReturnTitle: string;
  trustSupportHeading: string;
  trustCallButton: string;
  trustMessengerButton: string;
  trustDirectPhoneLabel: string;

  // Share Row
  shareHeading: string;
  shareCopyLink: string;
  shareCopiedFeedback: string;
  shareMessenger: string;
  shareFacebook: string;
  shareWhatsApp: string;
  shareNative: string;

  // Footer
  footerRightsReserved: string;
  poweredByText: string;

  // Thank-You Page
  thanksHeading: string;
  thanksOrderNumberLabel: string;
  thanksCopyOrderNo: string;
  thanksCopiedOrderNo: string;
  thanksMessageCallMode: string;
  thanksMessageTapMode: string;
  thanksSummaryHeading: string;
  thanksCallUsButton: string;
  thanksMessengerButton: string;
  thanksBackToProduct: string;
  thanksGenericHeading: string;
  thanksGenericBody: string;
}

export const DEFAULT_COPY: Record<SupportedLocale, CopyDictionary> = {
  bn: {
    langToggleBn: "বাং",
    langToggleEn: "EN",
    soldOutBadge: "স্টক শেষ",
    soldOutNotice: "দুঃখিত, এই পণ্যটির স্টক বর্তমানে শেষ। নতুন স্টকের তথ্যের জন্য আমাদের কল বা মেসেজ করুন।",

    galleryTapToZoom: "বড় করে দেখতে ছবির ওপর ট্যাপ করুন",
    galleryCloseZoom: "বন্ধ করুন",
    galleryPrevImage: "আগের ছবি",
    galleryNextImage: "পরের ছবি",
    galleryImageCount: "ছবি",

    saveAmountLabel: "সাশ্রয় {amount} ({percent}%)",
    codBadgeText: "ক্যাশ অন ডেলিভারি",

    colorLabel: "রঙ",
    sizeLabel: "সাইজ নির্বাচন করুন",
    sizeUnavailableSuffix: "(স্টক নেই)",
    sizeChartTrigger: "সাইজ চার্ট দেখুন",
    sizeChartTitle: "সাইজ চার্ট (ইঞ্চিতে মাপ)",
    sizeChartClose: "বন্ধ করুন",
    quantityLabel: "পরিমাণ",
    quantityDecreaseAria: "পরিমাণ কমান",
    quantityIncreaseAria: "পরিমাণ বাড়ান",

    detailsHeading: "পণ্যের বিস্তারিত বৈশিষ্ট্য",
    deliveryHeading: "ডেলিভারি তথ্য",
    deliveryPromptSelectDistrict: "ডেলিভারি চার্জ ও সময় জানতে নিচে আপনার জেলা নির্বাচন করুন",
    deliveryEstimateTemplate: "ডেলিভারি: {charge}, {daysMin} থেকে {daysMax} কার্যদিবস",
    deliveryFreeBadge: "ফ্রি ডেলিভারি",
    deliveryFreeThresholdHint: "{threshold} বা তার বেশি অর্ডারে ডেলিভারি ফ্রি",

    formHeading: "অর্ডার করতে নিচের তথ্যগুলো পূরণ করুন",
    formSubheading: "অর্ডার কনফার্ম করার পর আমরা দ্রুত ডেলিভারি প্রক্রিয়া শুরু করব।",
    errorSummaryHeading: "অনুগ্রহ করে নিচের ঘরগুলো সঠিকভাবে পূরণ করুন:",
    fieldNameLabel: "আপনার নাম",
    fieldNamePlaceholder: "যেমন: মো: রাকিব হাসান",
    fieldNameError: "অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (কমপক্ষে ২ অক্ষর)",
    fieldPhoneLabel: "মোবাইল নম্বর",
    fieldPhonePlaceholder: "01XXXXXXXXX",
    fieldPhoneHint: "১১ ডিজিটের সচল মোবাইল নম্বর দিন",
    fieldPhoneError: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01 দিয়ে শুরু)",
    fieldDistrictLabel: "জেলা",
    fieldDistrictPlaceholder: "আপনার জেলা নির্বাচন করুন",
    fieldDistrictSearchPlaceholder: "জেলার নাম লিখুন (বাংলা বা English)...",
    fieldDistrictNoMatch: "কোনো জেলা পাওয়া যায়নি",
    fieldDistrictError: "অনুগ্রহ করে আপনার জেলা নির্বাচন করুন",
    fieldDhakaAreaQuestion: "ঢাকা সিটি নাকি ঢাকার পার্শ্ববর্তী এলাকা?",
    fieldDhakaCityOption: "ঢাকা সিটি কর্পোরেশন (ভেতরে)",
    fieldDhakaSuburbOption: "ঢাকার পার্শ্ববর্তী এলাকা (সাভার, কেরানীগঞ্জ, টঙ্গী, দোহার, নবাবগঞ্জ, ধামরাই)",
    fieldAddressLabel: "সম্পূর্ণ ঠিকানা",
    fieldAddressPlaceholder: "বাসা/ফ্ল্যাট নম্বর, রোড, এলাকা বা গ্রাম, থানা/উপজেলা",
    fieldAddressError: "ডেলিভারির জন্য আপনার বিস্তারিত ঠিকানা লিখুন (কমপক্ষে ১০ অক্ষর)",
    fieldNoteLabel: "বিশেষ নির্দেশনা",
    fieldNoteOptionalBadge: "(ঐচ্ছিক)",
    fieldNotePlaceholder: "ডেলিভারি সংক্রান্ত কোনো নির্দেশনা থাকলে লিখুন",
    fieldSizeError: "অনুগ্রহ করে একটি সাইজ নির্বাচন করুন",

    summaryHeading: "অর্ডার সামারি",
    summaryProductRow: "পণ্য",
    summaryVariantRow: "রঙ ও সাইজ",
    summarySubtotalRow: "পণ্যের মূল্য",
    summaryDeliveryRow: "ডেলিভারি চার্জ",
    summaryDeliveryPending: "জেলা নির্বাচন করুন",
    summaryTotalRow: "সর্বমোট প্রদেয়",
    summaryPaymentMethod: "পেমেন্ট মাধ্যম: ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে পরিশোধ)",
    submitButtonText: "অর্ডার সম্পন্ন করুন",
    submitButtonLoading: "অর্ডার পাঠানো হচ্ছে...",
    submitSoldOutText: "স্টক শেষ (অর্ডার বন্ধ আছে)",

    stickyBarOrderNow: "অর্ডার করুন",

    trustReturnBadge: "৭ দিনের সহজ রিটার্ন সুবিধা",
    trustHeading: "কেন আমাদের থেকে নিশ্চিন্তে নেবেন",
    trustPillar1Title: "ক্যাশ অন ডেলিভারি",
    trustPillar1Body: "হাতে পেয়ে দেখে পেমেন্ট",
    trustPillar2Title: "৭ দিনের সহজ রিটার্ন",
    trustPillar2Body: "পছন্দ না হলে সহজ পরিবর্তন",
    trustPillar3Title: "১০০% প্রিমিয়াম সুতি",
    trustPillar3Body: "খাঁটি কোয়ালিটি নিশ্চিত",
    trustPolicyHeading: "রিটার্ন ও এক্সচেঞ্জ পলিসি:",
    trustContactHeading: "প্রয়োজনে সরাসরি যোগাযোগ করুন:",
    trustCodTitle: "১০০% ক্যাশ অন ডেলিভারি",
    trustCodBody: "পণ্য হাতে পেয়ে ডেলিভারি ম্যানের সামনে দেখে মূল্য পরিশোধ করার সুবিধা।",
    trustReturnTitle: "সহজ রিটার্ন ও পরিবর্তন নীতি",
    trustSupportHeading: "যেকোনো প্রয়োজনে সরাসরি কথা বলুন",
    trustCallButton: "কল করুন",
    trustMessengerButton: "মেসেঞ্জারে মেসেজ দিন",
    trustDirectPhoneLabel: "হেল্পলাইন নম্বর:",

    shareHeading: "পণ্যটি শেয়ার করুন",
    shareCopyLink: "লিংক কপি",
    shareCopiedFeedback: "কপি হয়েছে!",
    shareMessenger: "মেসেঞ্জার",
    shareFacebook: "ফেসবুক",
    shareWhatsApp: "হোয়াটসঅ্যাপ",
    shareNative: "শেয়ার",

    poweredByText: "Powered by OrderPage",
    footerRightsReserved: "সর্বস্বত্ব সংরক্ষিত।",

    thanksHeading: "আপনার অর্ডারটি আমরা পেয়েছি",
    thanksOrderNumberLabel: "অর্ডার নম্বর",
    thanksCopyOrderNo: "কপি করুন",
    thanksCopiedOrderNo: "কপি হয়েছে",
    thanksMessageCallMode: "অর্ডারটি গৃহীত হয়েছে। আমরা শীঘ্রই আপনাকে কল করে অর্ডারটি যাচাই করব।",
    thanksMessageTapMode: "অর্ডারটি গৃহীত হয়েছে। আমরা শীঘ্রই এটি প্রসেস করব।",
    thanksSummaryHeading: "আপনার অর্ডারের বিবরণ",
    thanksCallUsButton: "আমাদের কল করুন",
    thanksMessengerButton: "মেসেঞ্জারে মেসেজ দিন",
    thanksBackToProduct: "পণ্যের পাতায় ফিরে যান",
    thanksGenericHeading: "ধন্যবাদ!",
    thanksGenericBody: "এই মুহূর্তে কোনো নতুন অর্ডারের তথ্য পাওয়া যায়নি। আপনার অর্ডার সম্পর্কে জানতে আমাদের কল করুন অথবা মেসেঞ্জারে মেসেজ দিন।",
  },
  en: {
    langToggleBn: "বাং",
    langToggleEn: "EN",
    soldOutBadge: "Sold Out",
    soldOutNotice: "Sorry, this item is currently out of stock. Call or message us for restock updates.",

    galleryTapToZoom: "Tap image to view fullscreen",
    galleryCloseZoom: "Close",
    galleryPrevImage: "Previous image",
    galleryNextImage: "Next image",
    galleryImageCount: "Image",

    saveAmountLabel: "Save {amount} ({percent}%)",
    codBadgeText: "Cash on Delivery",

    colorLabel: "Color",
    sizeLabel: "Select Size",
    sizeUnavailableSuffix: "(Out of stock)",
    sizeChartTrigger: "Size chart",
    sizeChartTitle: "Size Chart (in inches)",
    sizeChartClose: "Close",
    quantityLabel: "Quantity",
    quantityDecreaseAria: "Decrease quantity",
    quantityIncreaseAria: "Increase quantity",

    detailsHeading: "Product Details",
    deliveryHeading: "Delivery Information",
    deliveryPromptSelectDistrict: "Choose your district to see delivery charge and time",
    deliveryEstimateTemplate: "Delivery: {charge}, {daysMin} to {daysMax} days",
    deliveryFreeBadge: "Free Delivery",
    deliveryFreeThresholdHint: "Free delivery on orders of {threshold} or above",

    formHeading: "Fill in the details below to order",
    formSubheading: "We will start the delivery process quickly after confirming your order.",
    errorSummaryHeading: "Please check the highlighted fields below:",
    fieldNameLabel: "Full Name",
    fieldNamePlaceholder: "e.g. Rakib Hasan",
    fieldNameError: "Please enter your full name (at least 2 characters)",
    fieldPhoneLabel: "Mobile Number",
    fieldPhonePlaceholder: "01XXXXXXXXX",
    fieldPhoneHint: "11-digit Bangladeshi mobile number",
    fieldPhoneError: "Enter a valid 11-digit mobile number starting with 01",
    fieldDistrictLabel: "District",
    fieldDistrictPlaceholder: "Choose your district",
    fieldDistrictSearchPlaceholder: "Search district (English or বাংলা)...",
    fieldDistrictNoMatch: "No matching district found",
    fieldDistrictError: "Please select your district",
    fieldDhakaAreaQuestion: "Dhaka city or suburb?",
    fieldDhakaCityOption: "Dhaka City (Inside Metro)",
    fieldDhakaSuburbOption: "Dhaka Suburb (Savar, Keraniganj, Tongi, Dohar, Nawabganj, Dhamrai)",
    fieldAddressLabel: "Full Address",
    fieldAddressPlaceholder: "House/Flat no, Road, Area/Village, Thana/Upazila",
    fieldAddressError: "Please enter your complete delivery address (at least 10 characters)",
    fieldNoteLabel: "Order Note",
    fieldNoteOptionalBadge: "(Optional)",
    fieldNotePlaceholder: "Any special instructions for delivery",
    fieldSizeError: "Please select an available size",

    summaryHeading: "Order Summary",
    summaryProductRow: "Product",
    summaryVariantRow: "Color & Size",
    summarySubtotalRow: "Subtotal",
    summaryDeliveryRow: "Delivery Charge",
    summaryDeliveryPending: "Select district",
    summaryTotalRow: "Total Payable",
    summaryPaymentMethod: "Payment: Cash on Delivery",
    submitButtonText: "Place Order",
    submitButtonLoading: "Submitting order...",
    submitSoldOutText: "Sold out",

    stickyBarOrderNow: "Order now",

    trustReturnBadge: "7-Day Easy Return",
    trustHeading: "Shop with Confidence",
    trustPillar1Title: "Cash on Delivery",
    trustPillar1Body: "Pay upon inspecting parcel",
    trustPillar2Title: "7-Day Easy Return",
    trustPillar2Body: "Hassle-free return & exchange",
    trustPillar3Title: "100% Premium Cotton",
    trustPillar3Body: "Certified authentic quality",
    trustPolicyHeading: "Return & Exchange Policy:",
    trustContactHeading: "Need assistance? Contact us directly:",
    trustCodTitle: "Cash on Delivery",
    trustCodBody: "Pay in cash at your doorstep when the parcel is delivered to you.",
    trustReturnTitle: "Return & Exchange Policy",
    trustSupportHeading: "Need help with sizing or delivery?",
    trustCallButton: "Call us",
    trustMessengerButton: "Message us on Messenger",
    trustDirectPhoneLabel: "Direct Phone:",

    shareHeading: "Share this product",
    shareCopyLink: "Copy link",
    shareCopiedFeedback: "Copied",
    shareMessenger: "Messenger",
    shareFacebook: "Facebook",
    shareWhatsApp: "WhatsApp",
    shareNative: "Share",

    poweredByText: "Powered by OrderPage",
    footerRightsReserved: "All rights reserved.",

    thanksHeading: "Order Received",
    thanksOrderNumberLabel: "Order Number",
    thanksCopyOrderNo: "Copy",
    thanksCopiedOrderNo: "Copied",
    thanksMessageCallMode: "Order received. We will call you to confirm.",
    thanksMessageTapMode: "Order received. We will process it soon.",
    thanksSummaryHeading: "Order Summary",
    thanksCallUsButton: "Call us",
    thanksMessengerButton: "Message us on Messenger",
    thanksBackToProduct: "Back to the product",
    thanksGenericHeading: "Thank You",
    thanksGenericBody: "No recent order details were found in this session. If you placed an order or have a question, please call or message us.",
  },
};

export type LocalizedText = string | { bn: string; en: string };

export function resolveLocalizedText(value: LocalizedText, lang: SupportedLocale): string {
  if (typeof value === "string") {
    return value;
  }
  return value[lang] || value.bn || value.en;
}

export function getClientCopy(
  lang: SupportedLocale,
  overrides?: { bn?: Partial<CopyDictionary>; en?: Partial<CopyDictionary> }
): CopyDictionary {
  return {
    ...DEFAULT_COPY[lang],
    ...(overrides?.[lang] ?? {}),
  };
}
