"use client";

import Image from "next/image";
import React from "react";
import type { SupportedLocale } from "@/lib/format";
import { formatNumber, formatPrice, localizeDigits } from "@/lib/format";
import { type CopyDictionary, resolveLocalizedText } from "@/lib/i18n";
import type { PublicClientConfig } from "@/lib/config-schema";

export interface ProductSelectorsProps {
  config: PublicClientConfig;
  selectedColorIdx: number;
  onSelectColor: (idx: number) => void;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  savings: { amount: number; percent: number } | null;
  sizeGroupRef: React.RefObject<HTMLDivElement | null>;
  isSizeChartOpen: boolean;
  setIsSizeChartOpen: (open: boolean) => void;
  copy: CopyDictionary;
  lang: SupportedLocale;
  activeColorName: string;
  productTitleText: string;
}

export default function ProductSelectors({
  config,
  selectedColorIdx,
  onSelectColor,
  selectedSize,
  onSelectSize,
  quantity,
  setQuantity,
  savings,
  sizeGroupRef,
  isSizeChartOpen,
  setIsSizeChartOpen,
  copy,
  lang,
  activeColorName,
  productTitleText,
}: ProductSelectorsProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Title & Pricing */}
      <div className="space-y-1.5 sm:space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {config.soldOut && (
            <span className="inline-flex items-center rounded-full bg-[var(--status-error-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--status-error-text)]">
              {copy.soldOutBadge}
            </span>
          )}
        </div>

        <h1 className="text-lg min-[360px]:text-xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
          {productTitleText}
        </h1>

        <div className="flex flex-wrap items-baseline gap-2 min-[360px]:gap-2.5 pt-0.5">
          <span className="text-xl min-[360px]:text-2xl lg:text-3xl font-black text-[var(--brand-primary)]">
            {formatPrice(config.product.price * quantity, lang)}
          </span>
          {quantity > 1 && (
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              ({formatNumber(quantity, lang)} ×{" "}
              {formatPrice(config.product.price, lang)})
            </span>
          )}
          {savings && typeof config.product.oldPrice === "number" && (
            <>
              <span className="text-sm min-[360px]:text-base text-[var(--text-muted)] line-through">
                {formatPrice(config.product.oldPrice * quantity, lang)}
              </span>
              <span className="inline-flex items-center rounded-lg bg-[var(--status-success-bg)] px-2 min-[360px]:px-2.5 py-0.5 min-[360px]:py-1 text-xs font-bold text-[var(--status-success-text)]">
                {copy.saveAmountLabel
                  .replace(
                    "{amount}",
                    formatPrice(savings.amount * quantity, lang),
                  )
                  .replace("{percent}", formatNumber(savings.percent, lang))}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Selectors */}
      <div className="space-y-3.5 sm:space-y-5">
        {/* Color Swatches */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
              {copy.colorLabel}:{" "}
              <span className="font-normal text-[var(--text-secondary)]">
                {activeColorName}
              </span>
            </span>
          </div>
          {config.colors.length > 1 && (
            <div
              role="radiogroup"
              aria-label={copy.colorLabel}
              className="mt-2 flex flex-wrap items-center gap-2.5 sm:gap-3"
            >
              {config.colors.map((colorItem, idx) => {
                const isSelected = idx === selectedColorIdx;
                const cName = resolveLocalizedText(colorItem.name, lang);
                const isColorAvailable = colorItem.available !== false;

                if (!isColorAvailable) {
                  return (
                    <button
                      key={colorItem.hex + idx}
                      type="button"
                      role="radio"
                      aria-checked={false}
                      aria-disabled="true"
                      disabled
                      title={`${cName} (${copy.sizeUnavailableSuffix})`}
                      aria-label={`${cName} ${copy.sizeUnavailableSuffix}`}
                      className="diagonal-strike relative h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 rounded-full border border-black/20 p-0.5 opacity-40 cursor-not-allowed"
                    >
                      <span
                        className="block h-full w-full rounded-full"
                        style={{ backgroundColor: colorItem.hex }}
                      />
                    </button>
                  );
                }

                return (
                  <button
                    key={colorItem.hex + idx}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={config.soldOut}
                    onClick={() => onSelectColor(idx)}
                    title={cName}
                    aria-label={cName}
                    className={`group relative flex h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 items-center justify-center rounded-full p-0.5 transition cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-[var(--brand-primary)] ring-offset-2 scale-105"
                        : "hover:scale-105 opacity-85 hover:opacity-100"
                    } ${config.soldOut ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <span
                      className="flex h-full w-full items-center justify-center rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: colorItem.hex }}
                    >
                      {isSelected && (
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-white drop-shadow-xs"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.2"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Size Pills + Size Chart Link */}
        <div ref={sizeGroupRef}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
              {copy.sizeLabel}:{" "}
              {selectedSize && (
                <span className="font-normal text-[var(--text-secondary)]">
                  {localizeDigits(selectedSize, lang)}
                </span>
              )}
            </span>

            {config.product.sizeChartImage && (
              <button
                type="button"
                onClick={() => setIsSizeChartOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] underline underline-offset-4 hover:opacity-85 cursor-pointer py-1"
              >
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                  <path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
                </svg>
                <span>{copy.sizeChartTrigger}</span>
              </button>
            )}
          </div>

          <div
            role="radiogroup"
            aria-label={copy.sizeLabel}
            className="mt-2 flex flex-wrap gap-1.5 sm:gap-2"
          >
            {config.sizes.map((sizeObj) => {
              const isSelected =
                sizeObj.available && selectedSize === sizeObj.name;
              const localizedSizeName = localizeDigits(sizeObj.name, lang);

              if (!sizeObj.available) {
                return (
                  <button
                    key={sizeObj.name}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    aria-disabled="true"
                    disabled
                    aria-label={`${localizedSizeName} ${copy.sizeUnavailableSuffix}`}
                    className="diagonal-strike inline-flex h-9 sm:h-10 min-w-[44px] sm:min-w-[50px] cursor-not-allowed items-center justify-center rounded-lg sm:rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-[var(--text-muted)] opacity-50"
                  >
                    <span>{localizedSizeName}</span>
                  </button>
                );
              }

              return (
                <button
                  key={sizeObj.name}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={config.soldOut}
                  onClick={() => onSelectSize(sizeObj.name)}
                  className={`inline-flex h-9 sm:h-10 min-w-[44px] sm:min-w-[50px] items-center justify-center rounded-lg sm:rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    isSelected
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-xs"
                      : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--text-primary)]"
                  } ${config.soldOut ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span>{localizedSizeName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity Stepper */}
        <div>
          <span className="block text-sm font-semibold text-[var(--text-primary)]">
            {copy.quantityLabel}:
          </span>
          <div className="mt-2 flex items-center gap-3">
            <div className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)]">
              <button
                type="button"
                disabled={quantity <= 1 || config.soldOut}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label={copy.quantityDecreaseAria}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-l-xl text-lg font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                −
              </button>
              <span className="min-w-10 text-center font-bold text-base text-[var(--text-primary)]">
                {formatNumber(quantity, lang)}
              </span>
              <button
                type="button"
                disabled={
                  quantity >= (config.maxQuantity ?? 5) || config.soldOut
                }
                onClick={() =>
                  setQuantity((q) => Math.min(config.maxQuantity ?? 5, q + 1))
                }
                aria-label={copy.quantityIncreaseAria}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-r-xl text-lg font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                +
              </button>
            </div>
            {quantity > 1 && (
              <span className="text-sm font-bold text-[var(--brand-primary)]">
                = {formatPrice(config.product.price * quantity, lang)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Size Chart Modal */}
      {isSizeChartOpen && config.product.sizeChartImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.sizeChartTitle}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
        >
          <div
            className="fixed inset-0 -z-10 cursor-pointer"
            onClick={() => setIsSizeChartOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--bg-surface)] p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {copy.sizeChartTitle}
              </h2>
              <button
                type="button"
                onClick={() => setIsSizeChartOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition cursor-pointer"
                aria-label={copy.sizeChartClose}
              >
                ✕
              </button>
            </div>

            <div className="relative mt-4 aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <Image
                src={config.product.sizeChartImage}
                alt={copy.sizeChartTitle}
                fill
                sizes="(max-width: 640px) 100vw, 500px"
                className="object-contain p-2"
              />
            </div>

            {/* Responsive Advice Callout (পরামর্শ) - Config-Driven Per Product/Seller */}
            {config.product.sizeAdviceText && (
              <div className="mt-3.5 flex items-start gap-2.5 sm:gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/90 p-3 sm:p-3.5 text-emerald-950 shadow-xs">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold"
                  aria-hidden="true"
                >
                  💡
                </span>
                <p className="text-xs sm:text-sm leading-relaxed text-emerald-950">
                  <strong className="font-semibold text-emerald-950">
                    {lang === "bn" ? "পরামর্শ: " : "Pro Tip: "}
                  </strong>
                  {resolveLocalizedText(config.product.sizeAdviceText, lang)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
