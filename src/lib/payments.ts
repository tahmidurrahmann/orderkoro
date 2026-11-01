import type { PublicClientConfig } from "./config-schema";

export type PaymentMethodId = "cod" | "bkash" | "nagad" | "rocket";

export type PaymentAccountType =
  | "personal"
  | "agent"
  | "uddokta"
  | "merchant"
  | "retail"
  | "pra"
  | "swadhin"
  | "islamic"
  | "salary"
  | "corporate"
  | string;

export interface PaymentMethodConfigItem {
  enabled?: boolean;
  number?: string;
  type?: PaymentAccountType;
}

export interface ClientPaymentsConfig {
  cod?: boolean | { enabled?: boolean };
  bkash?: boolean | string | PaymentMethodConfigItem;
  nagad?: boolean | string | PaymentMethodConfigItem;
  rocket?: boolean | string | PaymentMethodConfigItem;
}

export interface ResolvedPaymentMethod {
  id: PaymentMethodId;
  enabled: boolean;
  number: string;
  type: PaymentAccountType;
}

export interface PaymentTypeInfo {
  badgeBn: string;
  badgeEn: string;
  actionBn: string;
  actionEn: string;
  instructionBn: string;
  instructionEn: string;
}

export function getPaymentTypeInfo(
  methodId: "bkash" | "nagad" | "rocket",
  rawType?: string
): PaymentTypeInfo {
  const norm = (rawType || "personal").toLowerCase().trim();
  const methodNameBn = methodId === "bkash" ? "বিকাশ" : methodId === "nagad" ? "নগদ" : "রকেট";
  const methodNameEn = methodId === "bkash" ? "bKash" : methodId === "nagad" ? "Nagad" : "Rocket";

  if (norm === "agent" || norm === "uddokta") {
    const isUddokta = norm === "uddokta" || methodId === "nagad";
    const badgeLabelBn = isUddokta ? "উদ্যোক্তা (Cash Out)" : "এজেন্ট (Cash Out)";
    const badgeLabelEn = isUddokta ? "Uddokta / Agent (Cash Out)" : "Agent (Cash Out)";
    return {
      badgeBn: badgeLabelBn,
      badgeEn: badgeLabelEn,
      actionBn: "Cash Out",
      actionEn: "Cash Out",
      instructionBn: `💡 উপরের ${methodNameBn} এজেন্ট নম্বরে Cash Out করার পর নিচে ট্রানজেকশন আইডি (TrxID) লিখুন।`,
      instructionEn: `💡 Cash Out to the ${methodNameEn} agent number above and enter your TrxID below.`,
    };
  }

  if (norm === "merchant") {
    return {
      badgeBn: "মার্চেন্ট (Payment)",
      badgeEn: "Merchant (Make Payment)",
      actionBn: "Payment",
      actionEn: "Payment",
      instructionBn: `💡 উপরের ${methodNameBn} মার্চেন্ট নম্বরে Payment অপশন থেকে পরিশোধ করে নিচে ট্রানজেকশন আইডি (TrxID) লিখুন।`,
      instructionEn: `💡 Make Payment to the ${methodNameEn} merchant number above and enter your TrxID below.`,
    };
  }

  if (norm === "retail" || norm === "pra" || norm === "swadhin") {
    const badgeNameBn = norm === "swadhin" ? "স্বাধীন একাউন্ট (Payment)" : "পার্সোনাল রিটেইল (Payment)";
    const badgeNameEn = norm === "swadhin" ? "Swadhin Account (Payment)" : "Personal Retail / PRA (Payment)";
    return {
      badgeBn: badgeNameBn,
      badgeEn: badgeNameEn,
      actionBn: "Payment",
      actionEn: "Payment",
      instructionBn: `💡 উপরের ${methodNameBn} নম্বরে Payment অপশন থেকে পরিশোধ করে নিচে ট্রানজেকশন আইডি (TrxID) লিখুন (কোনো বাড়তি খরচ নেই)।`,
      instructionEn: `💡 Make Payment to the ${methodNameEn} retail number above and enter your TrxID below (No extra fee).`,
    };
  }

  if (norm === "islamic") {
    return {
      badgeBn: "ইসলামিক একাউন্ট (Send Money)",
      badgeEn: "Nagad Islamic (Send Money)",
      actionBn: "Send Money",
      actionEn: "Send Money",
      instructionBn: `💡 উপরের শরিয়াহ্-সম্মত নগদ একাউন্টে Send Money করার পর নিচে ট্রানজেকশন আইডি (TrxID) লিখুন।`,
      instructionEn: `💡 Send Money to the Nagad Islamic account above and enter your TrxID below.`,
    };
  }

  if (norm === "salary" || norm === "corporate") {
    return {
      badgeBn: "করপোরেট / ডিসবার্সমেন্ট",
      badgeEn: "Corporate / Disbursement",
      actionBn: "Payment",
      actionEn: "Payment",
      instructionBn: `💡 উপরের ${methodNameBn} একাউন্টে পরিশোধ সম্পন্ন করে নিচে ট্রানজেকশন আইডি (TrxID) লিখুন।`,
      instructionEn: `💡 Transfer or pay to the ${methodNameEn} corporate account above and enter your TrxID below.`,
    };
  }

  // Default: Personal Account (Send Money)
  return {
    badgeBn: "পার্সোনাল (Send Money)",
    badgeEn: "Personal (Send Money)",
    actionBn: "Send Money",
    actionEn: "Send Money",
    instructionBn: `💡 উপরের ${methodNameBn} নম্বরে Send Money করার পর ট্রানজেকশন আইডি (TrxID) নিচে লিখুন।`,
    instructionEn: `💡 Send Money to the ${methodNameEn} personal number above and enter your TrxID below.`,
  };
}

export function getEnabledPaymentMethods(
  config: Pick<PublicClientConfig, "payments" | "paymentNumbers" | "contact">
): ResolvedPaymentMethod[] {
  const result: ResolvedPaymentMethod[] = [];
  const payments = config.payments;
  const paymentNumbers = config.paymentNumbers;
  const fallbackPhone = config.contact?.phone || "";

  // 1. Cash on Delivery (default true unless explicitly set to false)
  const codConfig = payments?.cod;
  const isCodEnabled =
    codConfig === undefined
      ? true
      : typeof codConfig === "boolean"
      ? codConfig
      : codConfig?.enabled !== false;

  if (isCodEnabled) {
    result.push({
      id: "cod",
      enabled: true,
      number: "",
      type: "personal",
    });
  }

  // 2. Helper to resolve MFS options
  const resolveMfs = (
    id: "bkash" | "nagad" | "rocket",
    val?: boolean | string | PaymentMethodConfigItem,
    legacyNumber?: string
  ): ResolvedPaymentMethod | null => {
    if (val === false) return null;
    if (val === true) {
      return {
        id,
        enabled: true,
        number: legacyNumber || fallbackPhone,
        type: "personal",
      };
    }
    if (typeof val === "string") {
      return {
        id,
        enabled: true,
        number: val.trim() || legacyNumber || fallbackPhone,
        type: "personal",
      };
    }
    if (typeof val === "object" && val !== null) {
      if (val.enabled === false) return null;
      return {
        id,
        enabled: true,
        number: val.number?.trim() || legacyNumber || fallbackPhone,
        type: val.type || "personal",
      };
    }
    if (legacyNumber) {
      return {
        id,
        enabled: true,
        number: legacyNumber,
        type: "personal",
      };
    }
    return null;
  };

  const bkash = resolveMfs("bkash", payments?.bkash, paymentNumbers?.bkash);
  if (bkash) result.push(bkash);

  const nagad = resolveMfs("nagad", payments?.nagad, paymentNumbers?.nagad);
  if (nagad) result.push(nagad);

  const rocket = resolveMfs("rocket", payments?.rocket, paymentNumbers?.rocket);
  if (rocket) result.push(rocket);

  if (result.length === 0) {
    result.push({ id: "cod", enabled: true, number: "", type: "personal" });
  }

  return result;
}
