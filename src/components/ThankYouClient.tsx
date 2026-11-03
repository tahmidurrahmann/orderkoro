"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { PublicClientConfig } from "@/lib/config-schema";
import { darkenHex } from "@/lib/contrast";
import {
  formatNumber,
  formatPrice,
  localizeDigits,
  type SupportedLocale,
} from "@/lib/format";
import { getClientCopy, resolveLocalizedText } from "@/lib/i18n";
import { getSavedLocale, saveLocalePreference } from "@/lib/locale-preference";
import { getThankYouReassurance } from "@/lib/policy-text";
import {
  hasFiredPurchaseForOrder,
  markPurchaseFiredForOrder,
} from "@/lib/order-session";
import {
  buildReceiptPlainText,
  formatDhakaDateTime,
  readReceiptFromStorage,
  type StoredReceipt,
} from "@/lib/receipt";
import { trackPurchase } from "@/lib/tracking";
import PoweredByOrderKoro from "./PoweredByOrderKoro";

interface ThankYouClientProps {
  config: PublicClientConfig;
}

const emptySubscribe = () => () => {};

export default function ThankYouClient({ config }: ThankYouClientProps) {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Read stored receipt from sessionStorage or 30-day localStorage
  const receipt = useSyncExternalStore(
    emptySubscribe,
    () => readReceiptFromStorage(config.slug),
    () => null as StoredReceipt | null
  );

  const initialLang =
    receipt?.language ||
    (isHydrated ? getSavedLocale(config.language.default) : config.language.default);

  const [customLang, setCustomLang] = useState<SupportedLocale | null>(null);
  const lang = customLang ?? initialLang;
  const isLoaded = isHydrated;

  const [copiedOrderNo, setCopiedOrderNo] = useState<boolean>(false);
  const [copiedStatusLink, setCopiedStatusLink] = useState<boolean>(false);
  const [copiedDetails, setCopiedDetails] = useState<boolean>(false);
  const [isSavingImage, setIsSavingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const thankYouReassurance = getThankYouReassurance(config.returnPolicy, lang);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  useEffect(() => {
    if (receipt?.orderNumber && !hasFiredPurchaseForOrder(receipt.orderNumber)) {
      markPurchaseFiredForOrder(receipt.orderNumber);
      trackPurchase(receipt.orderNumber, receipt.total);
    }
  }, [receipt]);

  function handleLanguageChange(newLang: SupportedLocale) {
    setCustomLang(newLang);
    saveLocalePreference(newLang);
  }

  const copy = useMemo(
    () => getClientCopy(lang, config.copy),
    [lang, config.copy]
  );

  const brandNameText = resolveLocalizedText(config.brand.name, lang);
  const activeLogoUrl =
    typeof config.brand.logoUrl === "string"
      ? config.brand.logoUrl
      : config.brand.logoUrl[lang] ||
        config.brand.logoUrl.bn ||
        config.brand.logoUrl.en;
  const primaryColor = config.brand.primaryColor;
  const primaryHover = darkenHex(primaryColor, 0.84);

  async function handleCopyOrderNumber() {
    if (!receipt) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(receipt.orderNumber);
      } else {
        const temp = document.createElement("textarea");
        temp.value = receipt.orderNumber;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopiedOrderNo(true);
      window.setTimeout(() => setCopiedOrderNo(false), 2200);
    } catch {
      setCopiedOrderNo(false);
    }
  }

  async function handleCopyStatusLink() {
    if (!receipt?.token) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const statusUrl = `${origin}/${receipt.slug}/order/${receipt.token}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(statusUrl);
      } else {
        const temp = document.createElement("textarea");
        temp.value = statusUrl;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopiedStatusLink(true);
      window.setTimeout(() => setCopiedStatusLink(false), 2200);
    } catch {
      setCopiedStatusLink(false);
    }
  }

  async function handleCopyDetails() {
    if (!receipt) return;
    const plainText = buildReceiptPlainText({
      receipt,
      brandName: brandNameText,
      lang,
      reassurance: thankYouReassurance,
      phone: config.contact.phone,
      messengerUsername: config.contact.messengerPageUsername,
    });
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(plainText);
      } else {
        const temp = document.createElement("textarea");
        temp.value = plainText;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopiedDetails(true);
      window.setTimeout(() => setCopiedDetails(false), 2500);
    } catch {
      setCopiedDetails(false);
    }
  }

  async function handleSaveImage() {
    if (!receipt || isSavingImage) return;
    setIsSavingImage(true);
    setImageError(null);
    try {
      // Lazy load canvas generator strictly on demand so initial JS bundle does not increase
      const { saveReceiptAsImage } = await import("@/lib/client/receipt-image");
      const res = await saveReceiptAsImage({
        receipt,
        brandName: brandNameText,
        lang,
        reassurance: thankYouReassurance,
        phone: config.contact.phone,
        messengerUsername: config.contact.messengerPageUsername,
      });
      if (!res.success && res.method !== "cancelled") {
        setImageError(copy.thanksScreenshotFallbackMessage);
      }
    } catch {
      setImageError(copy.thanksScreenshotFallbackMessage);
    } finally {
      setIsSavingImage(false);
    }
  }

  // Exact confirmationMode message ("call" vs "tap"): never says "confirmed" or promises a date
  const confirmationMessage =
    receipt?.confirmationMode === "call" || config.confirmationMode === "call"
      ? copy.thanksMessageCallMode
      : copy.thanksMessageTapMode;

  const nextStepLine =
    receipt?.confirmationMode === "call" || config.confirmationMode === "call"
      ? copy.thanksNextStepCall
      : copy.thanksNextStepTap;

  const estimateLine = copy.thanksDeliveryEstimateNote
    .replace("{daysMin}", formatNumber(receipt?.daysMin ?? 2, lang))
    .replace("{daysMax}", formatNumber(receipt?.daysMax ?? 4, lang));

  const paymentMethodLabel = (() => {
    switch (receipt?.paymentMethod) {
      case "bkash":
        return lang === "bn" ? "বিকাশ (bKash)" : "bKash";
      case "nagad":
        return lang === "bn" ? "নগদ (Nagad)" : "Nagad";
      case "rocket":
        return lang === "bn" ? "রকেট (Rocket)" : "Rocket";
      case "cod":
      default:
        return copy.thanksPaymentCodNote;
    }
  })();

  const hasPhone = Boolean(config.contact.phone && !config.contact.phone.startsWith("TODO"));
  const hasMessenger = Boolean(
    config.contact.messengerPageUsername &&
      !config.contact.messengerPageUsername.startsWith("TODO")
  );

  return (
    <div
      data-lang={lang}
      data-purchase-eligible={Boolean(receipt)}
      style={
        {
          "--brand-primary": primaryColor,
          "--brand-primary-hover": primaryHover,
        } as React.CSSProperties
      }
      className="min-h-screen-safe bg-[var(--bg-canvas)] text-[var(--text-primary)] sm:py-6 lg:py-10 print:min-h-0 print:py-0 print:bg-white"
    >
      <div className="mx-auto flex min-h-screen-safe w-full max-w-xl flex-col justify-between bg-[var(--bg-surface)] shadow-[var(--shadow-card)] sm:min-h-0 sm:rounded-2xl sm:border sm:border-[var(--border-subtle)] overflow-hidden print:max-w-none print:min-h-0 print:border-none print:shadow-none print:rounded-none">
        {/* Header (hidden in print) */}
        <header
          suppressHydrationWarning
          className="flex min-h-12 items-center justify-between border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-2.5 sm:px-6 print:hidden"
        >
          <div suppressHydrationWarning className="flex items-center gap-2">
            <Link
              href={`/${config.slug}`}
              className="flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]"
            >
              {activeLogoUrl ? (
                <Image
                  src={activeLogoUrl}
                  alt={brandNameText}
                  width={150}
                  height={32}
                  priority
                  className="h-7 min-[360px]:h-8 w-auto max-w-[125px] min-[360px]:max-w-[160px] object-contain"
                />
              ) : (
                <span className="text-lg font-bold text-[var(--text-primary)]">
                  {brandNameText}
                </span>
              )}
            </Link>
            {config.slug === "demo-brand" && (
              <span className="shrink-0 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 shadow-2xs">
                Demo
              </span>
            )}
          </div>

          {config.language.allowSwitch && (
            <div
              role="group"
              aria-label="Language switch"
              className="inline-flex items-center rounded-lg bg-neutral-100 p-1 border border-neutral-200/80 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => handleLanguageChange("bn")}
                aria-pressed={lang === "bn"}
                className={`min-h-8 min-w-9 sm:min-w-10 rounded-md sm:rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  lang === "bn"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {copy.langToggleBn}
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                aria-pressed={lang === "en"}
                className={`min-h-8 min-w-9 sm:min-w-10 rounded-md sm:rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {copy.langToggleEn}
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 px-3 min-[360px]:px-4 py-6 sm:px-6 print:p-0">
          {!isLoaded ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">
              ...
            </div>
          ) : receipt ? (
            /* =========================================================
               ACTIVE ORDER THANK-YOU & RECEIPT
               Persisted across sessions & tabs (30-day expiry)
               ========================================================= */
            <div className="space-y-5 print:space-y-4">
              {/* Calm Success Card (hidden in print to keep printed receipt clean) */}
              <div className="rounded-[var(--radius-lg)] border border-[#A7F3D0] bg-[var(--status-success-bg)] p-5 text-center print:hidden">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#065F46] text-white">
                  <svg
                    aria-hidden="true"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>

                <h1 className="mt-3 text-xl font-bold text-[#065F46]">
                  {copy.thanksHeading}
                </h1>
                <p className="mt-1.5 text-sm font-medium text-[#065F46]/90">
                  {confirmationMessage}
                </p>
                {receipt.paymentMethod && receipt.paymentMethod !== "cod" && (
                  <p className="mt-1.5 text-sm font-medium text-[#065F46]/90">
                    {lang === "bn"
                      ? "ডেলিভারি পাঠানোর পূর্বে বিক্রেতা আপনার পেমেন্ট যাচাই করবেন।"
                      : "The seller will verify your payment before dispatching your delivery."}
                  </p>
                )}
                {thankYouReassurance && (
                  <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#065F46]/90">
                    {thankYouReassurance}
                  </p>
                )}

                {/* Order Number Pill + Copy Button */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[#A7F3D0] bg-white px-3.5 py-2.5">
                  <div className="text-left">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {copy.thanksOrderNumberLabel}
                    </span>
                    <span className="font-mono text-base font-bold tracking-wide text-[var(--text-primary)] select-all">
                      {receipt.orderNumber}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyOrderNumber}
                    className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] cursor-pointer transition hover:bg-[var(--border-subtle)]"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span aria-live="polite">
                      {copiedOrderNo
                        ? copy.thanksCopiedOrderNo
                        : copy.thanksCopyOrderNo}
                    </span>
                  </button>
                </div>

                {/* Order Status Link Card */}
                {receipt.token && (
                  <div className="mt-3 rounded-[var(--radius-md)] border border-[#A7F3D0] bg-white p-3 text-left">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          {copy.thanksStatusLinkLabel}
                        </span>
                        <a
                          href={`/${receipt.slug}/order/${receipt.token}`}
                          className="block font-mono text-xs font-semibold text-[var(--brand-primary)] hover:underline truncate"
                        >
                          {typeof window !== "undefined" ? window.location.origin : ""}/{receipt.slug}/order/{receipt.token}
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyStatusLink}
                        className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] cursor-pointer transition hover:bg-[var(--border-subtle)]"
                      >
                        <svg
                          aria-hidden="true"
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span aria-live="polite">
                          {copiedStatusLink
                            ? copy.thanksCopiedStatusLinkFeedback
                            : copy.thanksCopyStatusLinkButton}
                        </span>
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                      {copy.thanksStatusLinkHint}
                    </p>
                  </div>
                )}
              </div>

              {/* What Happens Next Card */}
              <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 print:border-neutral-300 print:bg-white">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 text-[var(--brand-primary)] shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{copy.thanksNextStepsHeading}</span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {nextStepLine} {estimateLine}
                </p>
              </div>

              {/* Comprehensive Customer Receipt Block */}
              <div
                id="order-receipt-card"
                className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 sm:p-5 print:rounded-none print:border print:border-neutral-300 print:bg-white print:p-6"
              >
                {/* Print-only Header */}
                <div className="hidden print:block border-b border-neutral-300 pb-4 mb-4 text-center">
                  <h2 className="text-xl font-bold text-black">{brandNameText}</h2>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600 mt-1">
                    {copy.thanksReceiptHeading}
                  </p>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-3 print:border-neutral-300">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">
                      {copy.thanksReceiptHeading}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                      #{receipt.orderNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {copy.thanksDateTimeLabel}
                    </span>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      {formatDhakaDateTime(receipt.createdAtIso, lang)}
                    </span>
                  </div>
                </div>

                {/* Line Items Breakdown */}
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">
                      {copy.summaryProductRow}
                    </dt>
                    <dd className="text-right font-semibold text-[var(--text-primary)]">
                      {resolveLocalizedText(receipt.productTitle, lang)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">
                      {copy.summaryVariantRow}
                    </dt>
                    <dd className="text-right font-medium text-[var(--text-primary)]">
                      {resolveLocalizedText(receipt.colorName, lang)} •{" "}
                      {localizeDigits(receipt.sizeName, lang)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">
                      {copy.quantityLabel}
                    </dt>
                    <dd className="text-right font-medium text-[var(--text-primary)]">
                      {formatNumber(receipt.quantity, lang)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">
                      {copy.thanksUnitPriceLabel}
                    </dt>
                    <dd className="text-right font-medium text-[var(--text-primary)]">
                      {formatPrice(receipt.unitPrice, lang)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-2 print:border-neutral-300">
                    <dt className="text-[var(--text-secondary)]">
                      {copy.summarySubtotalRow}
                    </dt>
                    <dd className="font-semibold text-[var(--text-primary)]">
                      {formatPrice(receipt.subtotal, lang)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">
                      {copy.summaryDeliveryRow}
                    </dt>
                    <dd className="font-semibold text-[var(--text-primary)]">
                      {receipt.deliveryCharge === 0
                        ? `${copy.deliveryFreeBadge} (${formatPrice(0, lang)})`
                        : formatPrice(receipt.deliveryCharge, lang)}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 border-t border-[var(--border-strong)] pt-2.5 print:border-neutral-400">
                    <dt className="text-base font-bold text-[var(--text-primary)]">
                      {copy.summaryTotalRow}
                    </dt>
                    <dd className="text-xl font-bold text-[var(--brand-primary)] print:text-black">
                      {formatPrice(receipt.total, lang)}
                    </dd>
                  </div>
                </dl>

                {/* Delivery & Payment Details */}
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2 text-xs sm:text-sm print:border-neutral-300">
                  {receipt.deliveryAddress && receipt.deliveryAddress.trim() && (
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {copy.thanksDeliveryAddressLabel}:
                      </span>
                      <span className="sm:text-right font-medium text-[var(--text-primary)]">
                        {receipt.deliveryAddress.trim()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {copy.thanksDeliveryZoneLabel}:
                    </span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {resolveLocalizedText(receipt.deliveryZoneLabel, lang)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {copy.thanksPaymentMethodLabel}:
                    </span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {paymentMethodLabel}
                    </span>
                  </div>

                  {receipt.paymentMethod && receipt.paymentMethod !== "cod" && (
                    <>
                      {receipt.transactionId && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--text-secondary)]">
                            {copy.thanksTrxIdLabel}:
                          </span>
                          <code className="font-mono bg-white px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-primary)] print:border-neutral-300">
                            {receipt.transactionId}
                          </code>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text-secondary)]">
                          {copy.thanksPaymentStatusLabel}:
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {copy.thanksPaymentPendingVerification}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Seller contact in receipt */}
                {(hasPhone || hasMessenger) && (
                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-1 print:border-neutral-300">
                    <span className="block font-semibold text-[var(--text-secondary)]">
                      {copy.thanksSellerContactHeading}:
                    </span>
                    {hasPhone && (
                      <p>
                        {lang === "bn" ? "ফোন" : "Phone"}: {config.contact.phone}
                      </p>
                    )}
                    {hasMessenger && (
                      <p>Messenger: m.me/{config.contact.messengerPageUsername}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Receipt Buttons: Copy Order Details + Save as Image (hidden in print) */}
              <div className="space-y-2.5 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Copy Order Details Button */}
                  <button
                    type="button"
                    onClick={handleCopyDetails}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 py-3 text-xs sm:text-sm font-bold text-[var(--text-primary)] cursor-pointer transition hover:bg-[var(--bg-subtle)]"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-[var(--text-secondary)] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>
                      {copiedDetails
                        ? copy.thanksCopiedDetailsFeedback
                        : copy.thanksCopyDetailsButton}
                    </span>
                  </button>

                  {/* Save as Image Button (lazy-loaded) */}
                  <button
                    type="button"
                    onClick={handleSaveImage}
                    disabled={isSavingImage}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 py-3 text-xs sm:text-sm font-bold text-[var(--text-primary)] cursor-pointer transition hover:bg-[var(--bg-subtle)] disabled:opacity-60"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-[var(--text-secondary)] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>
                      {isSavingImage
                        ? copy.thanksSavingImageButton
                        : copy.thanksSaveImageButton}
                    </span>
                  </button>
                </div>

                {/* Screenshot Hint */}
                <p className="text-center text-[11px] sm:text-xs text-[var(--text-muted)]">
                  💡 {copy.thanksScreenshotHint}
                </p>

                {/* Image Error Alert (if browser blocked canvas/download) */}
                {imageError && (
                  <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                    {imageError}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* =========================================================
               CALM GENERIC STATE (Direct visit or refresh after clearing)
               Never fires a Purchase event.
               ========================================================= */
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--brand-primary)]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
                {copy.thanksGenericHeading}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {copy.thanksGenericBody}
              </p>
            </div>
          )}

          {/* Action Buttons: Call us, Message us on Messenger, Back to the product (hidden in print) */}
          <div className="mt-6 space-y-2.5 print:hidden">
            {hasPhone && (
              <a
                href={`tel:${config.contact.phone}`}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white cursor-pointer transition hover:bg-[var(--brand-primary-hover)]"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>
                  {copy.thanksCallUsButton} ({config.contact.phone})
                </span>
              </a>
            )}

            {hasMessenger && (
              <a
                href={`https://m.me/${encodeURIComponent(
                  config.contact.messengerPageUsername!
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] cursor-pointer transition hover:bg-[var(--border-subtle)]"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-[#0084FF]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.78c.04.57.61.94 1.13.71l1.98-.87c.17-.08.36-.1.55-.06.91.25 1.87.38 2.88.38 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm6 7.46-2.93 4.67c-.47.73-1.47.92-2.17.4l-2.33-1.75a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.69-.63l2.93-4.67c.47-.73 1.47-.92 2.17-.4l2.33 1.75a.6.6 0 0 0 .72 0l3.15-2.39c.42-.32.97.18.69.63z" />
                </svg>
                <span>{copy.thanksMessengerButton}</span>
              </a>
            )}

            <Link
              href={`/${config.slug}`}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] cursor-pointer transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <span>← {copy.thanksBackToProduct}</span>
            </Link>
          </div>
        </main>

        {/* Footer (hidden in print) */}
        <footer className="border-t border-[var(--border-subtle)] px-4 py-4 text-center text-xs text-[var(--text-muted)] sm:px-5 print:hidden">
          <div className="mb-2 flex items-center justify-center gap-4 text-xs">
            <Link
              href={`/${config.slug}/privacy`}
              className="text-[var(--text-secondary)] hover:underline hover:text-[var(--text-primary)]"
            >
              {lang === "bn" ? "প্রাইভেসি পলিসি" : "Privacy Policy"}
            </Link>
            <span aria-hidden="true">•</span>
            <Link
              href={`/${config.slug}/terms`}
              className="text-[var(--text-secondary)] hover:underline hover:text-[var(--text-primary)]"
            >
              {lang === "bn" ? "শর্তাবলী ও রিটার্ন পলিসি" : "Terms & Returns"}
            </Link>
          </div>
          <p className="font-semibold text-[var(--text-secondary)]">
            © {new Date().getFullYear()} {brandNameText}. {copy.footerRightsReserved}
          </p>
          {config.showPoweredBy !== false && (
            <div className="mt-1">
              <PoweredByOrderKoro slug={config.slug} lang={lang} />
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
