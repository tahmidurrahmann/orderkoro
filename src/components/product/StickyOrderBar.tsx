"use client";

import React from "react";
import type { SupportedLocale } from "@/lib/format";
import { formatNumber, formatPrice } from "@/lib/format";
import type { CopyDictionary } from "@/lib/i18n";

export interface StickyOrderBarProps {
  soldOut: boolean;
  isFormInView: boolean;
  price: number;
  quantity?: number;
  lang: SupportedLocale;
  copy: CopyDictionary;
  onOrderClick: () => void;
}

export default function StickyOrderBar({
  soldOut,
  isFormInView,
  price,
  quantity = 1,
  lang,
  copy,
  onOrderClick,
}: StickyOrderBarProps) {
  if (soldOut || isFormInView) {
    return null;
  }

  return (
    <aside
      aria-label="Quick order bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 min-[360px]:px-4 py-2 min-[360px]:py-2.5 shadow-lg pb-safe-bar"
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-xs text-[var(--text-muted)] truncate">
            {copy.summaryTotalRow}
            {quantity > 1 ? ` (${formatNumber(quantity, lang)}${lang === "bn" ? "টি" : " items"})` : ""}
          </span>
          <p className="text-base min-[360px]:text-lg font-bold text-[var(--brand-primary)] leading-tight">
            {formatPrice(price, lang)}
          </p>
        </div>
        <button
          type="button"
          onClick={onOrderClick}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-primary)] px-3.5 min-[360px]:px-5 text-sm min-[360px]:text-base font-bold text-white shadow-xs transition hover:bg-[var(--brand-primary-hover)] active:scale-[0.98] whitespace-nowrap cursor-pointer"
        >
          <span>{copy.stickyBarOrderNow} ↓</span>
        </button>
      </div>
    </aside>
  );
}
