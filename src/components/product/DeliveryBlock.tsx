"use client";

import React from "react";
import type { SupportedLocale } from "@/lib/format";
import { formatNumber, formatPrice } from "@/lib/format";
import type { CopyDictionary } from "@/lib/i18n";
import type { OrderTotals } from "@/lib/delivery";

export interface DeliveryBlockProps {
  orderTotals: OrderTotals;
  freeDeliveryAbove?: number;
  copy: CopyDictionary;
  lang: SupportedLocale;
}

export default function DeliveryBlock({
  orderTotals,
  freeDeliveryAbove,
  copy,
  lang,
}: DeliveryBlockProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 min-[360px]:p-4 text-sm space-y-1.5">
      <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
        <svg aria-hidden="true" className="h-5 w-5 text-[var(--brand-primary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5h-7V8zM5.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        </svg>
        <span>
          {orderTotals.delivery
            ? copy.deliveryEstimateTemplate
                .replace("{charge}", formatPrice(orderTotals.delivery.effectiveCharge, lang))
                .replace("{daysMin}", formatNumber(orderTotals.delivery.daysMin, lang))
                .replace("{daysMax}", formatNumber(orderTotals.delivery.daysMax, lang))
            : copy.deliveryPromptSelectDistrict}
        </span>
      </div>

      {typeof freeDeliveryAbove === "number" && (
        <p className="text-xs text-[var(--text-secondary)] pl-7">
          {orderTotals.delivery?.isFreeDelivery
            ? (lang === "bn" ? "🎉 আপনি ফ্রি ডেলিভারি পেয়েছেন!" : "🎉 You got free delivery!")
            : (lang === "bn"
                ? `৳${formatNumber(freeDeliveryAbove, lang)} বা তার বেশি অর্ডারে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!`
                : `Free delivery on orders above ৳${formatNumber(freeDeliveryAbove, lang)}!`)}
        </p>
      )}
    </div>
  );
}
