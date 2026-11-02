import type { PublicClientConfig, QualityBadgeConfig, ReturnPolicyConfig } from "@/lib/config-schema";
import { formatNumber, formatPrice, type SupportedLocale } from "@/lib/format";
import { resolveLocalizedText } from "@/lib/i18n";

export interface ResolvedPaymentsSummary {
  cod: boolean;
  mobileMethods: Array<"bkash" | "nagad" | "rocket">;
}

export function resolveEnabledPaymentMethods(
  payments: PublicClientConfig["payments"] | undefined
): ResolvedPaymentsSummary {
  const codEnabled = payments?.cod === undefined ? true : Boolean(payments?.cod?.enabled);
  const mobileMethods: Array<"bkash" | "nagad" | "rocket"> = [];
  const keys: Array<"bkash" | "nagad" | "rocket"> = ["bkash", "nagad", "rocket"];
  for (const k of keys) {
    const item = payments?.[k];
    if (item && item.enabled && typeof item.number === "string" && item.number.trim().length > 0) {
      mobileMethods.push(k);
    }
  }
  return { cod: codEnabled, mobileMethods };
}

export interface TrustBadgeItem {
  id: "payment" | "return" | "exchange" | "quality";
  title: string;
  subtitle: string;
  iconType: "payment" | "return" | "exchange" | "quality";
}

/**
 * Derives the Header Return & Exchange chip text.
 * Rules:
 * - Both enabled with equal days > 0: "{d}-Day Return & Exchange" / "{d} দিনের রিটার্ন ও এক্সচেঞ্জ"
 * - Both enabled otherwise: "Return & Exchange" / "রিটার্ন ও এক্সচেঞ্জ"
 * - Only return: "{d}-Day Return" or "Return at delivery" when days is 0 / "{d} দিনের রিটার্ন" or "ডেলিভারির সময় রিটার্ন"
 * - Only exchange: "{d}-Day Exchange" / "{d} দিনের এক্সচেঞ্জ"
 * - Neither: null (hide chip)
 */
export function getHeaderReturnChip(
  policy: Partial<ReturnPolicyConfig> | undefined,
  lang: SupportedLocale
): string | null {
  if (!policy) return null;
  const ret = policy.return;
  const exc = policy.exchange;

  const retEnabled = Boolean(ret?.enabled);
  const excEnabled = Boolean(exc?.enabled);

  if (!retEnabled && !excEnabled) {
    return null;
  }

  if (retEnabled && excEnabled) {
    const retDays = ret?.days ?? 0;
    const excDays = exc?.days ?? 0;
    if (retDays > 0 && retDays === excDays) {
      return lang === "bn"
        ? `${formatNumber(retDays, "bn")} দিনের রিটার্ন ও এক্সচেঞ্জ`
        : `${retDays}-Day Return & Exchange`;
    }
    return lang === "bn" ? "রিটার্ন ও এক্সচেঞ্জ" : "Return & Exchange";
  }

  if (retEnabled && !excEnabled) {
    const retDays = ret?.days ?? 0;
    if (retDays === 0) {
      return lang === "bn" ? "ডেলিভারির সময় রিটার্ন" : "Return at delivery";
    }
    return lang === "bn"
      ? `${formatNumber(retDays, "bn")} দিনের রিটার্ন`
      : `${retDays}-Day Return`;
  }

  if (!retEnabled && excEnabled) {
    const excDays = exc?.days ?? 0;
    return lang === "bn"
      ? `${formatNumber(excDays, "bn")} দিনের এক্সচেঞ্জ`
      : `${excDays}-Day Exchange`;
  }

  return null;
}

/**
 * Derives the Header Payment chip text.
 * Rules:
 * - COD only: "Cash on Delivery" / "ক্যাশ অন ডেলিভারি"
 * - COD plus one mobile method: "COD · <method>"
 * - COD plus two or more: "COD & mobile payment" / "ক্যাশ অন ডেলিভারি ও মোবাইল পেমেন্ট"
 * - COD disabled: enabled mobile method names (e.g. "bKash, Nagad" / "বিকাশ ও নগদ")
 */
export function getHeaderPaymentChip(
  payments: PublicClientConfig["payments"] | undefined,
  lang: SupportedLocale
): string {
  const resolved = resolveEnabledPaymentMethods(payments);
  const codEnabled = resolved.cod;
  const mobileMethods = resolved.mobileMethods;

  const mobileLabels: Record<string, { bn: string; en: string }> = {
    bkash: { bn: "বিকাশ", en: "bKash" },
    nagad: { bn: "নগদ", en: "Nagad" },
    rocket: { bn: "রকেট", en: "Rocket" },
  };

  const enabledLabels = mobileMethods.map((m) => mobileLabels[m]?.[lang] || m);

  if (codEnabled && enabledLabels.length === 0) {
    return lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery";
  }

  if (codEnabled && enabledLabels.length === 1) {
    return `COD · ${enabledLabels[0]}`;
  }

  if (codEnabled && enabledLabels.length >= 2) {
    return lang === "bn"
      ? "ক্যাশ অন ডেলিভারি ও মোবাইল পেমেন্ট"
      : "COD & mobile payment";
  }

  // COD disabled
  if (enabledLabels.length === 0) {
    return lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Methods";
  }

  if (enabledLabels.length === 1) {
    return enabledLabels[0];
  }

  if (enabledLabels.length === 2) {
    return lang === "bn"
      ? `${enabledLabels[0]} ও ${enabledLabels[1]}`
      : `${enabledLabels[0]}, ${enabledLabels[1]}`;
  }

  return lang === "bn"
    ? `${enabledLabels.slice(0, -1).join(", ")} ও ${enabledLabels[enabledLabels.length - 1]}`
    : enabledLabels.join(", ");
}

/**
 * Derives the trust badges array:
 * 1. Payment badge (from enabled payment methods)
 * 2. Return badge (only when return is enabled)
 * 3. Exchange badge (only when exchange is enabled)
 * 4. Quality badge (optional, from config.qualityBadge, hidden when absent)
 */
export function getTrustBadges(
  config: {
    returnPolicy?: ReturnPolicyConfig;
    payments?: PublicClientConfig["payments"];
    qualityBadge?: QualityBadgeConfig;
  },
  lang: SupportedLocale
): TrustBadgeItem[] {
  const badges: TrustBadgeItem[] = [];
  const resolvedPayments = resolveEnabledPaymentMethods(config.payments);
  const ret = config.returnPolicy?.return;
  const exc = config.returnPolicy?.exchange;

  // 1. Payment Badge
  if (resolvedPayments.cod && resolvedPayments.mobileMethods.length > 0) {
    badges.push({
      id: "payment",
      iconType: "payment",
      title:
        lang === "bn"
          ? "ক্যাশ অন ডেলিভারি ও মোবাইল পেমেন্ট"
          : "Cash on Delivery & Mobile Payment",
      subtitle:
        lang === "bn"
          ? "হাতে পেয়ে বা অগ্রিম পেমেন্ট সুবিধা"
          : "Pay on delivery or in advance",
    });
  } else if (resolvedPayments.cod) {
    badges.push({
      id: "payment",
      iconType: "payment",
      title: lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery",
      subtitle:
        lang === "bn"
          ? "পণ্য হাতে পেয়ে মূল্য পরিশোধ"
          : "Pay upon inspecting your parcel",
    });
  } else if (resolvedPayments.mobileMethods.length > 0) {
    badges.push({
      id: "payment",
      iconType: "payment",
      title: lang === "bn" ? "নিরাপদ মোবাইল পেমেন্ট" : "Secure Mobile Payment",
      subtitle:
        lang === "bn"
          ? "বিকাশ, নগদ বা রকেটে পেমেন্ট"
          : "Pay via bKash, Nagad or Rocket",
    });
  }

  // 2. Return Badge (only if return is enabled)
  if (ret?.enabled) {
    const days = ret.days ?? 0;
    if (days === 0) {
      badges.push({
        id: "return",
        iconType: "return",
        title: lang === "bn" ? "ডেলিভারির সময় রিটার্ন" : "Instant Return at Delivery",
        subtitle:
          lang === "bn"
            ? "ডেলিভারি ম্যানের সামনে চেক করে ফেরত"
            : "Check in front of rider & return",
      });
    } else {
      badges.push({
        id: "return",
        iconType: "return",
        title:
          lang === "bn"
            ? `${formatNumber(days, "bn")} দিনের সহজ রিটার্ন`
            : `${days}-Day Easy Return`,
        subtitle:
          lang === "bn"
            ? "পছন্দ না হলে সহজ ফেরত সুবিধা"
            : "Hassle-free return policy",
      });
    }
  }

  // 3. Exchange Badge (only if exchange is enabled)
  if (exc?.enabled) {
    const days = exc.days ?? 1;
    badges.push({
      id: "exchange",
      iconType: "exchange",
      title:
        lang === "bn"
          ? `${formatNumber(days, "bn")} দিনের সহজ এক্সচেঞ্জ`
          : `${days}-Day Easy Exchange`,
      subtitle:
        lang === "bn"
          ? "সাইজ বা রঙের সহজ পরিবর্তন"
          : "Hassle-free size or color swap",
    });
  }

  // 4. Quality Badge (optional, hidden when absent)
  if (config.qualityBadge) {
    badges.push({
      id: "quality",
      iconType: "quality",
      title: resolveLocalizedText(config.qualityBadge.title, lang),
      subtitle: resolveLocalizedText(config.qualityBadge.subtitle, lang),
    });
  }

  return badges;
}

/**
 * Derives the Product-page policy paragraph from returnPolicy.
 * Combines return window, exchange window, return shipping coverage, and extra conditions.
 */
export function getProductPolicyParagraph(
  policy: Partial<ReturnPolicyConfig> | undefined,
  lang: SupportedLocale
): string {
  if (!policy) {
    return lang === "bn"
      ? "ডেলিভারির সময় কোনো ত্রুটিপূর্ণ বা ভুল পণ্য পেলে তাৎক্ষণিক রিটার্ন বা পরিবর্তনের ব্যবস্থা করা হবে।"
      : "Returns and exchanges apply only for damaged or incorrect items upon delivery.";
  }

  const ret = policy.return;
  const exc = policy.exchange;
  const retEnabled = Boolean(ret?.enabled);
  const excEnabled = Boolean(exc?.enabled);

  const parts: string[] = [];

  if (retEnabled && excEnabled) {
    const retDays = ret?.days ?? 0;
    const excDays = exc?.days ?? 0;
    if (retDays === 0) {
      parts.push(
        lang === "bn"
          ? `পণ্য হাতে পাওয়ার সময় ডেলিভারি ম্যানের সামনে চেক করে নিন। সাইজ বা পণ্যে কোনো ত্রুটি থাকলে তাৎক্ষণিক রিটার্ন অথবা ${formatNumber(
              excDays,
              "bn"
            )} দিনের মধ্যে সহজ এক্সচেঞ্জ সুবিধা রয়েছে।`
          : `Inspect your product in front of the rider upon delivery. Instant return for any defect, or easy exchange within ${excDays} days of delivery.`
      );
    } else {
      parts.push(
        lang === "bn"
          ? `পণ্য হাতে পাওয়ার পর ${formatNumber(
              retDays,
              "bn"
            )} দিনের মধ্যে সহজ রিটার্ন অথবা ${formatNumber(
              excDays,
              "bn"
            )} দিনের মধ্যে সহজ এক্সচেঞ্জ সুবিধা রয়েছে।`
          : `Easy return within ${retDays} days or easy exchange within ${excDays} days of delivery.`
      );
    }
  } else if (retEnabled && !excEnabled) {
    const retDays = ret?.days ?? 0;
    if (retDays === 0) {
      parts.push(
        lang === "bn"
          ? "পণ্য হাতে পাওয়ার সময় ডেলিভারি ম্যানের সামনে চেক করে নিন। কোনো ত্রুটি থাকলে ডেলিভারি ম্যানের সামনে তাৎক্ষণিক রিটার্ন সুবিধা রয়েছে।"
          : "Inspect your product in front of the rider upon delivery. Instant return for any defect upon delivery."
      );
    } else {
      parts.push(
        lang === "bn"
          ? `পণ্য হাতে পাওয়ার পর ${formatNumber(
              retDays,
              "bn"
            )} দিনের মধ্যে সহজ রিটার্ন সুবিধা রয়েছে।`
          : `Easy return within ${retDays} days of delivery.`
      );
    }
  } else if (!retEnabled && excEnabled) {
    const excDays = exc?.days ?? 0;
    parts.push(
      lang === "bn"
        ? `পণ্য হাতে পাওয়ার পর ${formatNumber(
            excDays,
            "bn"
          )} দিনের মধ্যে সহজ এক্সচেঞ্জ সুবিধা রয়েছে।`
        : `Easy exchange within ${excDays} days of delivery.`
    );
  } else {
    // Both disabled
    parts.push(
      lang === "bn"
        ? "ডেলিভারির সময় কোনো ত্রুটিপূর্ণ বা ভুল পণ্য পেলে তাৎক্ষণিক রিটার্ন বা পরিবর্তনের ব্যবস্থা করা হবে।"
        : "Returns and exchanges apply only for damaged or incorrect items upon delivery."
    );
  }

  // Shipping coverage note
  if (policy.returnShippingPaidBy === "seller") {
    parts.push(
      lang === "bn"
        ? "রিটার্ন বা এক্সচেঞ্জের ডেলিভারি চার্জ বিক্রেতা বহন করবেন।"
        : "Return or exchange shipping is covered by the seller."
    );
  } else if (policy.returnShippingPaidBy === "shared") {
    parts.push(
      lang === "bn"
        ? "ত্রুটিপূর্ণ পণ্যের ডেলিভারি চার্জ বিক্রেতা বহন করবেন, সাইজ বা রঙের পরিবর্তনের ক্ষেত্রে চার্জ কাস্টমার বহন করবেন।"
        : "Return shipping for defects is covered by the seller; customer covers exchange delivery."
    );
  }

  // Optional extra conditions
  if (policy.conditions) {
    const condText = resolveLocalizedText(policy.conditions, lang);
    if (condText) parts.push(condText);
  }

  return parts.join(" ");
}

/**
 * Derives the thank-you page reassurance line.
 */
export function getThankYouReassurance(
  policy: Partial<ReturnPolicyConfig> | undefined,
  lang: SupportedLocale
): string {
  if (!policy) {
    return lang === "bn"
      ? "ডেলিভারির সময় পার্সেলটি চেক করে গ্রহণ করুন।"
      : "Please inspect your parcel upon delivery.";
  }

  const ret = policy.return;
  const exc = policy.exchange;
  const retEnabled = Boolean(ret?.enabled);
  const excEnabled = Boolean(exc?.enabled);

  if (retEnabled && excEnabled) {
    const retDays = ret?.days ?? 0;
    const excDays = exc?.days ?? 0;
    if (retDays === 0) {
      return lang === "bn"
        ? `পণ্য হাতে পেয়ে চেক করে নিন। ${formatNumber(
            excDays,
            "bn"
          )} দিনের মধ্যে সহজ এক্সচেঞ্জ সুবিধা রয়েছে।`
        : `Inspect your parcel upon delivery. Easy exchange available within ${excDays} days.`;
    }
    return lang === "bn"
      ? `${formatNumber(retDays, "bn")} দিনের রিটার্ন ও ${formatNumber(
          excDays,
          "bn"
        )} দিনের এক্সচেঞ্জ সুবিধা রয়েছে।`
      : `${retDays}-day return and ${excDays}-day exchange available.`;
  }

  if (retEnabled && !excEnabled) {
    const retDays = ret?.days ?? 0;
    if (retDays === 0) {
      return lang === "bn"
        ? "পণ্য হাতে পাওয়ার সময় ডেলিভারি ম্যানের সামনে চেক করে নিন।"
        : "Please inspect your parcel in front of the delivery rider.";
    }
    return lang === "bn"
      ? `${formatNumber(retDays, "bn")} দিনের মধ্যে সহজ রিটার্ন সুবিধা রয়েছে।`
      : `${retDays}-day return available.`;
  }

  if (!retEnabled && excEnabled) {
    const excDays = exc?.days ?? 0;
    return lang === "bn"
      ? `${formatNumber(excDays, "bn")} দিনের মধ্যে সহজ এক্সচেঞ্জ সুবিধা রয়েছে।`
      : `${excDays}-day exchange available.`;
  }

  return lang === "bn"
    ? "ডেলিভারির সময় পার্সেলটি চেক করে গ্রহণ করুন। কোনো ত্রুটি থাকলে সাথে সাথে আমাদের জানান।"
    : "Please inspect your parcel upon delivery. Notify us immediately for damaged or incorrect items.";
}

/**
 * Returns structured return policy section for legal pages.
 */
export function getLegalReturnSection(
  policy: Partial<ReturnPolicyConfig> | undefined,
  lang: SupportedLocale
): { title: string; paragraph: string; termsList: string[] } {
  const title =
    lang === "bn" ? "রিটার্ন ও এক্সচেঞ্জ পলিসি" : "Return & Exchange Policy";
  const paragraph = getProductPolicyParagraph(policy, lang);

  const termsList: string[] = [];

  const ret = policy?.return;
  const exc = policy?.exchange;
  const retEnabled = Boolean(ret?.enabled);
  const excEnabled = Boolean(exc?.enabled);

  if (!retEnabled && !excEnabled) {
    termsList.push(
      lang === "bn"
        ? "রিটার্ন বা এক্সচেঞ্জ শুধুমাত্র পণ্য ভাঙা, ত্রুটিপূর্ণ বা ভুল অর্ডারের ক্ষেত্রে প্রযোজ্য।"
        : "Returns and exchanges apply only for damaged, defective, or incorrect items."
    );
  } else {
    if (retEnabled) {
      const days = ret?.days ?? 0;
      termsList.push(
        days === 0
          ? lang === "bn"
            ? "রিটার্ন: ডেলিভারির সময় ডেলিভারি ম্যানের উপস্থিতিতে পণ্য পরীক্ষা করে তাৎক্ষণিক রিটার্ন করা যাবে।"
            : "Return: Products may be inspected and returned immediately in front of the delivery rider."
          : lang === "bn"
          ? `রিটার্ন: পণ্য গ্রহণের ${formatNumber(
              days,
              "bn"
            )} দিনের মধ্যে রিটার্ন রিকোয়েস্ট পাঠাতে হবে।`
          : `Return: Return requests must be initiated within ${days} days of delivery.`
      );
    }
    if (excEnabled) {
      const days = exc?.days ?? 0;
      termsList.push(
        lang === "bn"
          ? `এক্সচেঞ্জ: সাইজ বা রঙের পরিবর্তনের জন্য ডেলিভারির ${formatNumber(
              days,
              "bn"
            )} দিনের মধ্যে যোগাযোগ করতে হবে।`
          : `Exchange: Size or color replacement requests must be made within ${days} days of delivery.`
      );
    }
  }

  // Shipping
  if (policy?.returnShippingPaidBy === "seller") {
    termsList.push(
      lang === "bn"
        ? "শিপিং চার্জ: অনুমোদিত রিটার্ন ও এক্সচেঞ্জের সম্পূর্ণ ডেলিভারি চার্জ বিক্রেতা বহন করবেন।"
        : "Shipping Charges: All approved return and exchange shipping charges are borne by the seller."
    );
  } else if (policy?.returnShippingPaidBy === "shared") {
    termsList.push(
      lang === "bn"
        ? "শিপিং চার্জ: পণ্যের ত্রুটির ক্ষেত্রে চার্জ বিক্রেতা বহন করবেন; সাইজ বা পছন্দের পরিবর্তনের ক্ষেত্রে রিটার্ন ডেলিভারি চার্জ কাস্টমার বহন করবেন।"
        : "Shipping Charges: The seller covers delivery for defects; customer covers exchange courier fees."
    );
  } else {
    termsList.push(
      lang === "bn"
        ? "শিপিং চার্জ: রিটার্ন বা এক্সচেঞ্জের ডেলিভারি চার্জ কাস্টমার বহন করবেন।"
        : "Shipping Charges: Return or exchange courier charges are borne by the customer."
    );
  }

  // Condition clause
  termsList.push(
    lang === "bn"
      ? "পণ্যের অবস্থা: পণ্যটি অব্যবহৃত, অক্ষত এবং মূল ট্যাগ বা প্যাকেজিংসহ ফেরত দিতে হবে।"
      : "Item Condition: Items must be unused, unwashed, and in their original packaging with tags intact."
  );

  return { title, paragraph, termsList };
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  listItems?: string[];
  note?: string;
  table?: {
    headers: string[];
    rows: { zone: string; charge: string; duration: string }[];
  };
}

export function getPolicyLastUpdatedDate(
  policyUpdatedAt: string | undefined,
  lang: SupportedLocale
): string {
  if (policyUpdatedAt && policyUpdatedAt.trim()) {
    return lang === "bn"
      ? `সর্বশেষ আপডেট: ${policyUpdatedAt.trim()}`
      : `Last updated: ${policyUpdatedAt.trim()}`;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const defaultDate = `${year}-${month}-${day}`;
  return lang === "bn"
    ? `সর্বশেষ আপডেট: ${defaultDate}`
    : `Last updated: ${defaultDate}`;
}

export function getLegalFooterText(
  brandName: string,
  lang: SupportedLocale
): { copyright: string; poweredBy: string } {
  const year = new Date().getFullYear();
  return {
    copyright: `© ${year} ${brandName}. ${
      lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."
    }`,
    poweredBy:
      lang === "bn"
        ? "এই অনলাইন স্টোরফ্রন্টটি OrderKoro প্ল্যাটফর্মের মাধ্যমে পরিচালিত।"
        : "This storefront is provided by OrderKoro.",
  };
}

export function getPrivacyPageSections(
  config: PublicClientConfig,
  lang: SupportedLocale
): LegalSection[] {
  const brandName = resolveLocalizedText(config.brand.name, lang);
  const sections: LegalSection[] = [];

  // 1. Info collection
  sections.push({
    id: "collection",
    title:
      lang === "bn"
        ? "১. তথ্য সংগ্রহ ও দায়িত্বশীল প্রতিষ্ঠান"
        : "1. Information Collection & Responsible Business",
    paragraphs: [
      lang === "bn"
        ? `${brandName} এই স্টোরফ্রন্টের বাণিজ্যিক কার্যক্রম এবং গ্রাহক তথ্যের সুরক্ষার জন্য সরাসরি দায়িত্বশীল প্রতিষ্ঠান। আপনার অর্ডার সফলভাবে সরবরাহ করার উদ্দেশ্যে আমরা কেবল আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা সংগ্রহ করি।`
        : `${brandName} is the business entity responsible for customer data and storefront operations. To fulfill your orders, we collect only your recipient name, phone number, and delivery address.`,
    ],
  });

  // 2. Data Processors
  sections.push({
    id: "processors",
    title:
      lang === "bn"
        ? "২. তথ্য প্রক্রিয়াকরণ ও থার্ড-পার্টি সার্ভিস"
        : "2. Data Processors & Service Providers",
    paragraphs: [
      lang === "bn"
        ? "অর্ডার ব্যবস্থাপনা ও নির্বিঘ্ন ডেলিভারি নিশ্চিত করতে আপনার তথ্য নিম্নলিখিত সেবাসমূহের মাধ্যমে প্রক্রিয়াজাত হয়:"
        : "To reliably manage and deliver your orders, customer data is processed solely by the following providers:",
    ],
    listItems: [
      lang === "bn"
        ? `দায়িত্বশীল বিক্রেতা (${brandName}): পণ্য প্যাকেজিং, অর্ডার যাচাই এবং গ্রাহক সেবা প্রদান।`
        : `The Seller (${brandName}): Order verification, packaging, and direct customer communication.`,
      lang === "bn"
        ? "গুগল শিট (Google Sheets): অর্ডারের ডাটাবেজ ও ডেলিভারি হিসাব সংরক্ষণের জন্য।"
        : "Google Sheets: Secure order record storage and inventory accounting.",
      lang === "bn"
        ? "টেলিগ্রাম (Telegram): বিক্রেতার কাছে তাৎক্ষণিক অর্ডার অ্যালার্ট প্রেরণের জন্য।"
        : "Telegram: Immediate order dispatch notifications to the seller's operations team.",
      lang === "bn"
        ? "হোস্টিং প্রোভাইডার (Vercel): ওয়েব অবকাঠামো ও নিরাপদ ক্লাউড পরিবেশ।"
        : "Hosting Provider (Vercel): Web application hosting and cloud infrastructure.",
      lang === "bn"
        ? "অনুমোদিত কুরিয়ার পার্টনার: কাস্টমারের ঠিকানায় পার্সেল পৌঁছে দেওয়ার জন্য।"
        : "Courier Partners: Using recipient details solely for parcel transit and physical delivery.",
    ],
    note:
      lang === "bn"
        ? "আমরা কোনো অবস্থাতেই আপনার ব্যক্তিগত তথ্য কোনো থার্ড-পার্টির কাছে বিজ্ঞাপন বা অন্য কোনো উদ্দেশ্যে বিক্রি বা লিজ দিই না।"
        : "We never sell, rent, or lease your personal contact information to any third party.",
  });

  // 3. Meta Pixel (ONLY when pixelId is set)
  if (config.pixelId) {
    sections.push({
      id: "tracking",
      title:
        lang === "bn"
          ? "৩. মেটা পিক্সেল ও ট্র্যাকিং কুকি"
          : "3. Meta Pixel & Tracking Cookies",
      paragraphs: [
        lang === "bn"
          ? "এই ওয়েবসাইটে বিজ্ঞাপন প্রচারণার কার্যকারিতা ও পণ্যের সঠিক চাহিদা বিশ্লেষণ করার জন্য মেটা পিক্সেল (Meta Pixel) এবং প্রয়োজনীয় অ্যানালিটিক্স কুকি ব্যবহার করা হয়। আপনি ব্রাউজারের সেটিংস থেকে যেকোনো সময় কুকি নিয়ন্ত্রণ বা মুছে ফেলতে পারেন।"
          : "This storefront utilizes the Meta Pixel and necessary analytics cookies to evaluate marketing performance and visitor interactions. You can adjust your browser settings at any time to block or delete cookies.",
      ],
    });
  }

  return sections;
}

export function getTermsPageSections(
  config: PublicClientConfig,
  lang: SupportedLocale
): LegalSection[] {
  const sections: LegalSection[] = [];
  const resolvedPayments = resolveEnabledPaymentMethods(config.payments);

  // 1. Payment Policy
  const paymentParagraphs: string[] = [];
  if (resolvedPayments.cod) {
    paymentParagraphs.push(
      lang === "bn"
        ? "ক্যাশ অন ডেলিভারি (COD): আমাদের পণ্যে ক্যাশ অন ডেলিভারি প্রযোজ্য। পার্সেল ডেলিভারি ম্যানের সামনে খুলে দেখে রঙ ও সাইজ সঠিক থাকলে মূল্য পরিশোধ করুন।"
        : "Cash on Delivery (COD): All products are available with Cash on Delivery. Please inspect the parcel and confirm the color and size in front of the rider before paying."
    );
  }
  if (resolvedPayments.mobileMethods.length > 0) {
    const mobileNames = resolvedPayments.mobileMethods
      .map((m) => (m === "bkash" ? "bKash" : m === "nagad" ? "Nagad" : "Rocket"))
      .join(", ");
    paymentParagraphs.push(
      lang === "bn"
        ? `মোবাইল পেমেন্ট (${mobileNames}): চাইলে বিকাশ, নগদ বা রকেটে অগ্রিম পেমেন্ট করা যায়। টাকা পাঠিয়ে ট্রানজেকশন আইডি (TrxID) দিলে বিক্রেতা নিজস্ব অ্যাপে যাচাই করে অর্ডার কনফার্ম করেন।`
        : `Mobile Payment (${mobileNames}): Advance payments via bKash, Nagad, or Rocket are accepted. Provide the Transaction ID (TrxID) after payment, and the seller verifies it before shipment.`
    );
  }
  sections.push({
    id: "payment",
    title:
      lang === "bn"
        ? "১. পেমেন্ট ও লেনদেন পদ্ধতি"
        : "1. Payment & Transaction Terms",
    paragraphs: paymentParagraphs,
  });

  // 2. Return & Exchange Policy
  const legalReturn = getLegalReturnSection(config.returnPolicy, lang);
  sections.push({
    id: "returns",
    title:
      lang === "bn"
        ? "২. রিটার্ন ও এক্সচেঞ্জ পলিসি"
        : "2. Return & Exchange Policy",
    paragraphs: [legalReturn.paragraph],
    listItems: legalReturn.termsList,
  });

  // 3. Delivery charges and zones
  const zoneRows = config.delivery.zones.map((z) => ({
    zone: resolveLocalizedText(z.label, lang),
    charge: formatPrice(z.charge, lang),
    duration:
      lang === "bn"
        ? `${formatNumber(z.daysMin, "bn")}-${formatNumber(z.daysMax, "bn")} কর্মদিবস`
        : `${z.daysMin}-${z.daysMax} business days`,
  }));

  const freeDeliveryNote = config.delivery.freeDeliveryAbove
    ? lang === "bn"
      ? `* ${formatPrice(
          config.delivery.freeDeliveryAbove,
          lang
        )} টাকার বেশি অর্ডারে সারা দেশে ডেলিভারি সম্পূর্ণ ফ্রি!`
      : `* Free delivery nationwide on orders above ${formatPrice(
          config.delivery.freeDeliveryAbove,
          lang
        )}!`
    : undefined;

  sections.push({
    id: "delivery",
    title:
      lang === "bn"
        ? "৩. ডেলিভারি চার্জ ও সময়সীমা"
        : "3. Delivery Charges & Timelines",
    paragraphs: [],
    table: {
      headers: [
        lang === "bn" ? "এলাকা" : "Zone",
        lang === "bn" ? "চার্জ" : "Charge",
        lang === "bn" ? "সময়সীমা" : "Duration",
      ],
      rows: zoneRows,
    },
    note: freeDeliveryNote,
  });

  // 4. Refund Policy (for mobile payments)
  const refundDays = config.refundDays ?? 5;
  const refundNoteText = config.refundNote
    ? resolveLocalizedText(config.refundNote, lang)
    : "";
  sections.push({
    id: "refund",
    title: lang === "bn" ? "৪. রিফান্ড নীতি" : "4. Refund Policy",
    paragraphs: [
      lang === "bn"
        ? `মোবাইল পেমেন্টে অর্ডার বাতিল বা পণ্য ফেরতের ক্ষেত্রে বিক্রেতা সরাসরি কাস্টমারের মোবাইল ওয়ালেটে রিফান্ড সম্পন্ন করেন। অনুমোদিত রিফান্ড সাধারণত ${formatNumber(
            refundDays,
            "bn"
          )} কার্যদিবসের মধ্যে প্রদান করা হয়।${
            refundNoteText ? " " + refundNoteText : ""
          }`
        : `For orders paid via mobile payments that are cancelled or returned, refunds are processed directly by the seller to the customer's mobile wallet. Approved refunds are issued within ${refundDays} business days.${
            refundNoteText ? " " + refundNoteText : ""
          }`,
    ],
  });

  // 5. Order Cancellation
  sections.push({
    id: "cancellation",
    title: lang === "bn" ? "৫. অর্ডার বাতিলকরণ" : "5. Order Cancellation",
    paragraphs: [
      lang === "bn"
        ? `পার্সেল কুরিয়ার সার্ভিসে হস্তান্তর করার পূর্ব পর্যন্ত কাস্টমার সরাসরি ফোনে (${config.contact.phone}) অথবা মেসেঞ্জারে যোগাযোগের মাধ্যমে যেকোনো অর্ডার বাতিল করতে পারেন।`
        : `Customers may cancel an order free of charge prior to parcel dispatch with the courier by contacting us via phone (${config.contact.phone}) or Messenger.`,
    ],
  });

  return sections;
}
