export type PaymentMethodId = "cod" | "bkash" | "nagad" | "rocket";

export type PaymentAccountType = "personal" | "agent" | "merchant";

export interface MobilePaymentMethodConfig {
  enabled: boolean;
  number?: string;
  type?: PaymentAccountType;
}

export interface ClientPaymentsConfig {
  cod?: { enabled: boolean };
  bkash?: MobilePaymentMethodConfig;
  nagad?: MobilePaymentMethodConfig;
  rocket?: MobilePaymentMethodConfig;
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

  if (norm === "agent") {
    return {
      badgeBn: "এজেন্ট (Cash Out)",
      badgeEn: "Agent (Cash Out)",
      actionBn: "Cash Out",
      actionEn: "Cash Out",
      instructionBn: `দয়া করে ${methodNameBn} এজেন্ট নম্বরে Cash Out করুন এবং নিচে আপনার ট্রানজেকশন আইডি (TrxID) লিখুন।`,
      instructionEn: `Please Cash Out to the ${methodNameEn} agent number above and enter your TrxID below.`,
    };
  }

  if (norm === "merchant") {
    return {
      badgeBn: "মার্চেন্ট (Payment)",
      badgeEn: "Merchant (Make Payment)",
      actionBn: "Payment",
      actionEn: "Payment",
      instructionBn: `দয়া করে ${methodNameBn} মার্চেন্ট নম্বরে Payment অপশন ব্যবহার করে পেমেন্ট করুন এবং নিচে আপনার ট্রানজেকশন আইডি (TrxID) লিখুন।`,
      instructionEn: `Please Make Payment to the ${methodNameEn} merchant number above and enter your TrxID below.`,
    };
  }

  // Default: Personal Account (Send Money)
  return {
    badgeBn: "পার্সোনাল (Send Money)",
    badgeEn: "Personal (Send Money)",
    actionBn: "Send Money",
    actionEn: "Send Money",
    instructionBn: `দয়া করে ${methodNameBn} পার্সোনাল নম্বরে Send Money করুন এবং নিচে আপনার ট্রানজেকশন আইডি (TrxID) লিখুন।`,
    instructionEn: `Please Send Money to the ${methodNameEn} personal number above and enter your TrxID below.`,
  };
}

export function getEnabledPaymentMethods(
  config: { payments?: ClientPaymentsConfig }
): ResolvedPaymentMethod[] {
  const result: ResolvedPaymentMethod[] = [];
  const payments = config.payments;

  // 1. Cash on Delivery (default true unless explicitly set to false)
  const isCodEnabled = payments?.cod === undefined || payments?.cod?.enabled !== false;

  if (isCodEnabled) {
    result.push({
      id: "cod",
      enabled: true,
      number: "",
      type: "personal",
    });
  }

  // 2. Mobile methods (absent means disabled; requires enabled: true and valid number)
  const mfsKeys: Array<"bkash" | "nagad" | "rocket"> = ["bkash", "nagad", "rocket"];
  for (const id of mfsKeys) {
    const item = payments?.[id];
    if (item && item.enabled && typeof item.number === "string" && item.number.trim().length > 0) {
      const type: PaymentAccountType =
        item.type === "agent" || item.type === "merchant" ? item.type : "personal";
      result.push({
        id,
        enabled: true,
        number: item.number.trim(),
        type,
      });
    }
  }

  if (result.length === 0) {
    result.push({ id: "cod", enabled: true, number: "", type: "personal" });
  }

  return result;
}
