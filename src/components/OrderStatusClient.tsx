"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SupportedLocale } from "@/lib/format";
import { formatPrice, localizeDigits } from "@/lib/format";
import type { LocalizedText } from "@/lib/i18n";
import { getClientCopy, resolveLocalizedText } from "@/lib/i18n";
import { darkenHex } from "@/lib/contrast";
import { formatDhakaDateTime } from "@/lib/receipt";
import PoweredByOrderKoro from "./PoweredByOrderKoro";

export interface OrderStatusClientProps {
  slug: string;
  token: string;
  orderNumber: string;
  status: string; // "new" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned" | "no_answer"
  paymentMethod?: string;
  paymentStatus?: "COD" | "Unverified" | "Verified" | "Not received";
  customerConfirmed: boolean;
  productTitle: string;
  color: string;
  size: string;
  quantity: number;
  total: number;
  daysMin: number;
  daysMax: number;
  maskedPhone: string;
  area: string;
  createdAtDhakaIso: string;
  sellerPhone?: string;
  sellerMessenger?: string;
  customerConfirmConfig: "off" | "tap";
  isHighValueOrRepeat: boolean;
  brand: {
    name: LocalizedText;
    logoUrl?: string | { bn?: string; en?: string };
    primaryColor: string;
  };
  language: {
    default: SupportedLocale;
    allowSwitch: boolean;
  };
  copy?: {
    bn?: Record<string, string>;
    en?: Record<string, string>;
  };
  showPoweredBy?: boolean;
}

export default function OrderStatusClient({
  slug,
  token,
  orderNumber,
  status,
  paymentMethod,
  paymentStatus,
  customerConfirmed: initialCustomerConfirmed,
  productTitle,
  color,
  size,
  quantity,
  total,
  daysMin,
  daysMax,
  maskedPhone,
  area,
  createdAtDhakaIso,
  sellerPhone,
  sellerMessenger,
  customerConfirmConfig,
  isHighValueOrRepeat,
  brand,
  language,
  copy: customCopy,
  showPoweredBy = true,
}: OrderStatusClientProps) {
  const [lang, setLang] = useState<SupportedLocale>(language.default);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);
  const [copiedStatusLink, setCopiedStatusLink] = useState(false);
  const [customerConfirmed, setCustomerConfirmed] = useState(initialCustomerConfirmed);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const copy = useMemo(() => getClientCopy(lang, customCopy), [lang, customCopy]);
  const brandNameText = resolveLocalizedText(brand.name, lang);
  const activeLogoUrl =
    typeof brand.logoUrl === "string"
      ? brand.logoUrl
      : brand.logoUrl?.[lang] || brand.logoUrl?.bn || brand.logoUrl?.en;
  const primaryColor = brand.primaryColor || "#1E3A5F";
  const primaryHover = darkenHex(primaryColor, 0.85);

  const formattedDateTime = formatDhakaDateTime(createdAtDhakaIso, lang);

  const handleCopyOrderNumber = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderNumber);
      } else {
        const temp = document.createElement("textarea");
        temp.value = orderNumber;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopiedOrderNumber(true);
      window.setTimeout(() => setCopiedOrderNumber(false), 2200);
    } catch {
      setCopiedOrderNumber(false);
    }
  }, [orderNumber]);

  const handleCopyLink = useCallback(async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${slug}/order/${token}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const temp = document.createElement("textarea");
        temp.value = url;
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
  }, [slug, token]);

  const handleCustomerConfirm = useCallback(async () => {
    if (isConfirming || customerConfirmed) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch("/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCustomerConfirmed(true);
      } else {
        setConfirmError(
          data.error ||
            (lang === "bn"
              ? "অর্ডার নিশ্চিত করা যায়নি। অনুগ্রহ করে বিক্রেতার সাথে যোগাযোগ করুন।"
              : "Could not confirm order. Please contact seller.")
        );
      }
    } catch {
      setConfirmError(
        lang === "bn"
          ? "নেটওয়ার্ক সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।"
          : "Network error. Please try again."
      );
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, customerConfirmed, token, lang]);

  // Determine Timeline Steps
  const isCancelled = status === "cancelled";
  const isReturned = status === "returned";

  // Timeline Step Indices
  // Normal flow: Received (0) -> Confirmed (1) -> Shipped (2) -> Delivered (3)
  const currentStep = useMemo(() => {
    if (isCancelled || isReturned) return -1;
    switch (status) {
      case "delivered":
        return 3;
      case "shipped":
        return 2;
      case "confirmed":
        return 1;
      case "new":
      case "no_answer":
      default:
        return 0;
    }
  }, [status, isCancelled, isReturned]);

  const normalTimelineSteps = [
    { label: copy.orderStatusProgressReceived, key: "received" },
    { label: copy.orderStatusProgressConfirmed, key: "confirmed" },
    { label: copy.orderStatusProgressShipped, key: "shipped" },
    { label: copy.orderStatusProgressDelivered, key: "delivered" },
  ];

  // Delivery Estimate Text
  const deliveryEstimateText =
    lang === "bn"
      ? `আনুমানিক ডেলিভারি সময়: ${localizeDigits(String(daysMin), "bn")} থেকে ${localizeDigits(String(daysMax), "bn")} কার্যদিবস`
      : `Estimated delivery: ${daysMin} to ${daysMax} business days`;

  // Payment Method Display
  const isMobilePayment = Boolean(paymentMethod && paymentMethod !== "cod");
  const paymentMethodLabel =
    paymentMethod === "bkash"
      ? "bKash (বিকাশ)"
      : paymentMethod === "nagad"
      ? "Nagad (নগদ)"
      : paymentMethod === "rocket"
      ? "Rocket (রকেট)"
      : lang === "bn"
      ? "ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে পরিশোধ)"
      : "Cash on Delivery";

  return (
    <div
      className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased"
      style={
        {
          "--brand-primary": primaryColor,
          "--brand-primary-hover": primaryHover,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-xl px-3.5 py-6 sm:px-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <Link
            href={`/${slug}`}
            className="flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]"
          >
            {activeLogoUrl ? (
              <Image
                src={activeLogoUrl}
                alt={brandNameText}
                width={140}
                height={32}
                priority
                className="h-7 min-[360px]:h-8 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="text-lg font-bold text-[var(--text-primary)]">
                {brandNameText}
              </span>
            )}
          </Link>

          {language.allowSwitch && (
            <div
              role="group"
              aria-label="Language switch"
              className="inline-flex items-center rounded-lg bg-neutral-100 p-1 border border-neutral-200/80 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setLang("bn")}
                aria-pressed={lang === "bn"}
                className={`min-h-8 min-w-9 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  lang === "bn"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {copy.langToggleBn}
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
                className={`min-h-8 min-w-9 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
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

        {/* Page Title & Order Number Card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {copy.orderStatusHeading}
              </span>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-base sm:text-lg font-bold tracking-wide text-[var(--text-primary)]">
                  {orderNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  aria-label={copy.thanksCopyOrderNo}
                  className="inline-flex min-h-8 items-center gap-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-2 py-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition cursor-pointer"
                >
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copiedOrderNumber ? copy.thanksCopiedOrderNo : copy.thanksCopyOrderNo}</span>
                </button>
              </div>
            </div>

            <div className="text-right text-xs text-[var(--text-muted)]">
              <span>{formattedDateTime}</span>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
            {copy.orderStatusTimelineHeading}
          </h2>

          {isCancelled ? (
            /* Cancelled Terminal State */
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-bold text-rose-800">
                {copy.orderStatusProgressCancelled}
              </h3>
              <p className="mt-1 text-xs text-rose-700">
                {lang === "bn"
                  ? "এই অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে বিক্রেতার সাথে যোগাযোগ করুন।"
                  : "This order has been cancelled. Please contact the seller if you have questions."}
              </p>
            </div>
          ) : isReturned ? (
            /* Returned Terminal State */
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 14-4-4 4-4" />
                  <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-bold text-amber-800">
                {copy.orderStatusProgressReturned}
              </h3>
              <p className="mt-1 text-xs text-amber-700">
                {lang === "bn"
                  ? "পণ্যটি বিক্রেতার নিকট ফেরত এসেছে।"
                  : "The package has been returned to the seller."}
              </p>
            </div>
          ) : (
            /* Normal Progress Stepper */
            <div>
              <div className="relative flex items-center justify-between">
                {/* Connecting Line */}
                <div className="absolute left-4 right-4 top-4 -translate-y-1/2 h-1 bg-neutral-200 -z-0" />
                <div
                  className="absolute left-4 top-4 -translate-y-1/2 h-1 bg-[var(--brand-primary)] -z-0 transition-all duration-500"
                  style={{
                    width: `${(currentStep / (normalTimelineSteps.length - 1)) * 100}%`,
                  }}
                />

                {normalTimelineSteps.map((step, idx) => {
                  const isDone = idx < currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div
                      key={step.key}
                      className="relative z-10 flex flex-col items-center"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                          isDone
                            ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white"
                            : isCurrent
                            ? "bg-white border-[var(--brand-primary)] text-[var(--brand-primary)] ring-4 ring-[var(--brand-primary)]/15"
                            : "bg-white border-neutral-300 text-neutral-400"
                        }`}
                      >
                        {isDone ? (
                          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <span
                        className={`mt-2 text-center text-[11px] sm:text-xs font-semibold ${
                          isDone || isCurrent
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Estimate Note */}
              <div className="mt-5 rounded-md bg-[var(--bg-subtle)] px-3 py-2 text-center text-xs text-[var(--text-secondary)] font-medium">
                {deliveryEstimateText}
              </div>
            </div>
          )}
        </div>

        {/* Customer Confirmation Action Section (when customerConfirm === "tap") */}
        {customerConfirmConfig === "tap" && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs">
            {isHighValueOrRepeat ? (
              /* High value or repeat order notice */
              <div className="flex items-start gap-2.5 rounded-md bg-neutral-50 p-3 text-xs text-[var(--text-secondary)]">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <p className="font-medium">{copy.orderStatusSellerWillCall}</p>
              </div>
            ) : customerConfirmed ? (
              /* Already confirmed by customer */
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-emerald-600 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>{copy.orderStatusConfirmedBadge}</span>
              </div>
            ) : status === "new" ? (
              /* Unconfirmed status: show confirmation button */
              <div>
                <button
                  type="button"
                  onClick={handleCustomerConfirm}
                  disabled={isConfirming}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white shadow-xs hover:bg-[var(--brand-primary-hover)] transition cursor-pointer disabled:opacity-60"
                >
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>
                    {isConfirming
                      ? copy.orderStatusConfirmingButton
                      : copy.orderStatusConfirmButton}
                  </span>
                </button>

                {confirmError && (
                  <p className="mt-2 text-center text-xs font-semibold text-rose-600">
                    {confirmError}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Order Details Card */}
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2">
            {copy.orderStatusDetailsHeading}
          </h2>

          {/* Item details */}
          <div className="flex items-start justify-between gap-3 text-xs sm:text-sm">
            <div>
              <span className="font-bold text-[var(--text-primary)] block">
                {productTitle}
              </span>
              <span className="text-[var(--text-secondary)] block mt-0.5">
                {color} | {size}
              </span>
            </div>
            <span className="font-semibold text-[var(--text-primary)] shrink-0">
              {localizeDigits(String(quantity), lang)} ×
            </span>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-3 space-y-2 text-xs sm:text-sm">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)]">
                {copy.orderStatusTotalLabel}:
              </span>
              <span className="font-bold text-[var(--brand-primary)] text-sm sm:text-base">
                {formatPrice(total, lang)}
              </span>
            </div>

            {/* Payment Method & Status */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[var(--text-secondary)] font-medium">
                {copy.thanksPaymentMethodLabel}:
              </span>
              <span className="text-[var(--text-primary)] font-semibold">
                {paymentMethodLabel}
              </span>
            </div>

            {isMobilePayment && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)] font-medium">
                  {copy.thanksPaymentStatusLabel}:
                </span>
                {paymentStatus === "Verified" ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {lang === "bn" ? "পেমেন্ট ভেরিফাইড" : "Payment Verified"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {copy.thanksPaymentPendingVerification}
                  </span>
                )}
              </div>
            )}

            {/* Masked Phone (first 3 and last 3 digits) */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[var(--text-secondary)] font-medium">
                {copy.orderStatusPhoneLabel}:
              </span>
              <span className="font-mono text-[var(--text-primary)] font-semibold">
                {maskedPhone}
              </span>
            </div>

            {/* Area only (Never full address) */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)] font-medium">
                {copy.orderStatusAreaLabel}:
              </span>
              <span className="text-[var(--text-primary)] font-semibold text-right">
                {area}
              </span>
            </div>
          </div>

          {/* Seller Direct Contact (hidden when unset) */}
          {(sellerPhone || sellerMessenger) && (
            <div className="border-t border-[var(--border-subtle)] pt-3 text-xs space-y-1.5">
              <span className="block font-semibold text-[var(--text-secondary)]">
                {copy.thanksSellerContactHeading}:
              </span>
              {sellerPhone && (
                <p className="text-[var(--text-secondary)]">
                  {lang === "bn" ? "ফোন" : "Phone"}:{" "}
                  <a href={`tel:${sellerPhone}`} className="text-[var(--brand-primary)] font-semibold hover:underline">
                    {sellerPhone}
                  </a>
                </p>
              )}
              {sellerMessenger && (
                <p className="text-[var(--text-secondary)]">
                  Messenger:{" "}
                  <a
                    href={`https://m.me/${sellerMessenger}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-primary)] font-semibold hover:underline"
                  >
                    m.me/{sellerMessenger}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Share / Save Status Link Card */}
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {copy.thanksStatusLinkLabel}
              </span>
              <span className="block font-mono text-xs text-[var(--text-secondary)] truncate">
                {typeof window !== "undefined" ? window.location.origin : ""}/{slug}/order/{token}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--border-subtle)] transition shrink-0"
            >
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copiedStatusLink ? copy.thanksCopiedStatusLinkFeedback : copy.thanksCopyStatusLinkButton}</span>
            </button>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            {copy.thanksStatusLinkHint}
          </p>
        </div>

        {/* Back to Store Link */}
        <div className="mt-6 text-center">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
          >
            <span>← {copy.thanksBackToProduct}</span>
          </Link>
        </div>

        {/* Footer */}
        {showPoweredBy && (
          <footer className="mt-8 text-center">
            <PoweredByOrderKoro slug={slug} lang={lang} />
          </footer>
        )}
      </div>
    </div>
  );
}
