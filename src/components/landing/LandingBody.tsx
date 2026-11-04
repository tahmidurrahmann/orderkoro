"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { SupportedLocale } from "@/lib/format";
import { LANDING } from "@/lib/landing-config";
import { LANDING_COPY, type BenefitItem } from "@/lib/landing-copy";
import { getSavedLocale, subscribeLocale } from "@/lib/locale-preference";
import { LandingWordmark } from "./LandingHeader";

interface LandingBodyProps {
  contactUrl: string;
  demoAlertsUrl?: string;
}

function TelegramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

function MessengerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.455 5.518 3.735 7.21V22l3.39-1.86c.915.253 1.884.39 2.875.39 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.448l-2.556-2.727-4.99 2.727 5.485-5.823 2.62 2.727 4.927-2.727-5.486 5.823z" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function BenefitCardIcon({ icon }: { icon: BenefitItem["icon"] }) {
  switch (icon) {
    case "telegram":
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
          <TelegramIcon className="h-5 w-5" />
        </span>
      );
    case "sheet":
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
          </svg>
        </span>
      );
    case "speed":
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
      );
    case "payment":
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shadow-2xs">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        </span>
      );
    case "policy":
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </span>
      );
    case "protection":
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100 shadow-2xs">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
      );
    case "pixel":
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </span>
      );
    default:
      return null;
  }
}

export function LandingBody({ contactUrl, demoAlertsUrl }: LandingBodyProps) {
  const lang: SupportedLocale = useSyncExternalStore(
    subscribeLocale,
    () => getSavedLocale("bn"),
    () => "bn",
  );

  const effectiveContactUrl = contactUrl || "https://m.me/61596152341071";
  const hasAlertsUrl = Boolean(
    demoAlertsUrl && demoAlertsUrl.trim().length > 0,
  );
  const showEarlyOffer = LANDING.earlyOfferRemaining > 0;

  // Segmented bar for early offer: total segments = earlyOfferTotal
  const claimedCount = Math.max(
    0,
    LANDING.earlyOfferTotal - LANDING.earlyOfferRemaining,
  );
  const segments = Array.from(
    { length: LANDING.earlyOfferTotal },
    (_, i) => i < claimedCount,
  );

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] outline-none pb-28 lg:pb-16"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-16 sm:space-y-24">
        {/* ================================================================= */}
        {/* 1. HERO SECTION */}
        {/* ================================================================= */}
        <section aria-labelledby="hero-heading" className="pt-2 sm:pt-6">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center">
            {/* Left Column: Headline, Copy, Action Buttons, Badges */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>{LANDING_COPY.eyebrow[lang]}</span>
              </div>

              {/* Main H1 */}
              <h1
                id="hero-heading"
                className="text-3xl sm:text-5xl lg:text-[3.25rem] font-black tracking-tight text-[var(--text-primary)] leading-[1.18] sm:leading-[1.15]"
              >
                {LANDING_COPY.hero.headline[lang]}
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {LANDING_COPY.hero.subline[lang]}
              </p>

              {/* Primary & Secondary Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2 max-w-md mx-auto lg:mx-0">
                <Link
                  href="/demo-brand"
                  className="w-full sm:w-auto flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ok-green)] px-7 py-3.5 text-base font-bold text-white shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>{LANDING_COPY.hero.primaryCta[lang]}</span>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>

                <a
                  href={effectiveContactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--ok-green)] bg-[var(--bg-surface)] px-6 py-3.5 text-base font-bold text-[var(--ok-green)] hover:bg-[var(--bg-subtle)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <MessengerIcon className="h-5 w-5 text-[var(--ok-green)]" />
                  <span>{LANDING_COPY.hero.secondaryCta[lang]}</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                {LANDING_COPY.hero.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 shadow-2xs"
                  >
                    <span className="text-emerald-600">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    <span>{badge[lang]}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right Column (Desktop Only): Interactive-style Product Page Showcase */}
            <div className="lg:col-span-5 hidden lg:block relative">
              {/* Floating Pill Top */}
              <div className="absolute -top-4 -right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3.5 py-1.5 text-xs font-bold shadow-lg">
                <span>{LANDING_COPY.hero.previewCard.pillSpeed[lang]}</span>
              </div>

              {/* Showcase Card */}
              <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-xl space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 text-xs font-bold text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5 text-[var(--ok-green)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--ok-green)]" />
                    {LANDING_COPY.hero.previewCard.badge[lang]}
                  </span>
                  <span className="font-mono text-slate-400">
                    orderkoro.app/demo
                  </span>
                </div>

                {/* Product Meta */}
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    {LANDING_COPY.hero.previewCard.brandName[lang]}
                  </span>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    {LANDING_COPY.hero.previewCard.productTitle[lang]}
                  </h3>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black text-[var(--text-primary)]">
                      {LANDING_COPY.hero.previewCard.price[lang]}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] line-through">
                      {LANDING_COPY.hero.previewCard.oldPrice[lang]}
                    </span>
                  </div>
                </div>

                {/* Color swatches mock */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">
                    {LANDING_COPY.hero.previewCard.colorLabel[lang]}
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-900 ring-2 ring-emerald-500 ring-offset-1" />
                    <div className="h-6 w-6 rounded-full bg-amber-800 opacity-60" />
                    <div className="h-6 w-6 rounded-full bg-emerald-800 opacity-60" />
                  </div>
                </div>

                {/* Size options mock */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">
                    {LANDING_COPY.hero.previewCard.sizeLabel[lang]}
                  </div>
                  <div className="flex gap-1.5">
                    {["S (38)", "M (40)", "L (42)", "XL (44)"].map(
                      (sz, sIdx) => (
                        <span
                          key={sz}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                            sIdx === 2
                              ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                              : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                          }`}
                        >
                          {sz}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                {/* Instant CTA mock */}
                <div className="pt-2">
                  <div className="w-full py-2.5 rounded-xl bg-[var(--ok-green)] text-white font-bold text-xs text-center shadow-xs">
                    {LANDING_COPY.hero.previewCard.ctaButton[lang]}
                  </div>
                </div>
              </div>

              {/* Floating Pill Bottom */}
              <div className="absolute -bottom-4 -left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3.5 py-1.5 text-xs font-semibold shadow-lg">
                <span>{LANDING_COPY.hero.previewCard.pillSync[lang]}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 2. PROBLEM STRIP */}
        {/* ================================================================= */}
        <section aria-labelledby="problem-heading" className="space-y-4">
          <div>
            <h2
              id="problem-heading"
              className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]"
            >
              {LANDING_COPY.problemStrip.title[lang]}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {LANDING_COPY.problemStrip.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 flex items-center gap-3 text-sm font-semibold text-rose-950 shadow-2xs hover:border-rose-300 hover:shadow-xs transition-all"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold text-xs">
                  ✕
                </span>
                <span className="leading-snug">{item[lang]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. HOW IT WORKS */}
        {/* ================================================================= */}
        <section aria-labelledby="how-it-works-heading" className="space-y-8">
          <div className="space-y-2 max-w-xl">
            <h2
              id="how-it-works-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)]"
            >
              {LANDING_COPY.howItWorks.title[lang]}
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              {LANDING_COPY.howItWorks.subtitle[lang]}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {LANDING_COPY.howItWorks.steps.map((step, idx) => (
              <div
                key={idx}
                className="relative rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-xs hover:shadow-sm hover:border-[var(--border-strong)] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ok-green)] text-white font-black text-sm shadow-xs">
                    {lang === "bn" ? step.number : step.numberEn}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                    {step.title[lang]}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {step.description[lang]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. WHAT YOU GET (BENEFIT-FIRST, FLAG-GATED) */}
        {/* ================================================================= */}
        <section aria-labelledby="what-you-get-heading" className="space-y-8">
          <div className="space-y-2 max-w-xl">
            <h2
              id="what-you-get-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)]"
            >
              {LANDING_COPY.whatYouGet.title[lang]}
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              {LANDING_COPY.whatYouGet.subtitle[lang]}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {LANDING_COPY.whatYouGet.items.map((benefit) => (
              <div
                key={benefit.id}
                className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs hover:border-[var(--border-strong)] hover:shadow-sm transition-all flex flex-col justify-start space-y-3"
              >
                <BenefitCardIcon icon={benefit.icon} />
                <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug pt-1">
                  {benefit.title[lang]}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {benefit.description[lang]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 5. DEMO BLOCK (TELEGRAM ALERT MOCK) */}
        {/* ================================================================= */}
        <section aria-labelledby="demo-heading" className="space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Left side on desktop: Heading, Features list, Action buttons */}
            <div className="flex-1 text-center lg:text-left space-y-6 mb-8 lg:mb-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 text-sky-800 px-3.5 py-1 text-xs font-bold">
                <TelegramIcon className="h-3.5 w-3.5" />
                <span>{LANDING_COPY.demoBlock.badge[lang]}</span>
              </div>
              <h2
                id="demo-heading"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] leading-tight"
              >
                {LANDING_COPY.demoBlock.title[lang]}
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)]">
                {LANDING_COPY.demoBlock.subtitle[lang]}
              </p>

              {/* Feature bullet list */}
              <ul className="space-y-2.5 text-xs sm:text-sm text-[var(--text-secondary)] font-medium text-left max-w-md mx-auto lg:mx-0">
                {LANDING_COPY.demoBlock.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2.5">
                    <span className="text-emerald-600 mt-0.5 shrink-0">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <span>{feat[lang]}</span>
                  </li>
                ))}
              </ul>

              {/* Actions & Warning */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 max-w-md mx-auto lg:mx-0">
                  {hasAlertsUrl && (
                    <a
                      href={demoAlertsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <TelegramIcon className="h-4 w-4" />
                      <span>{LANDING_COPY.demoBlock.channelButton[lang]}</span>
                    </a>
                  )}

                  <Link
                    href="/demo-brand"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>{LANDING_COPY.demoBlock.tryDemoButton[lang]}</span>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                <p className="text-xs font-medium text-slate-600">
                  ⚠️ {LANDING_COPY.demoBlock.warning[lang]}
                </p>
                {hasAlertsUrl && (
                  <p className="text-xs text-sky-800 font-semibold">
                    {LANDING_COPY.demoBlock.channelNotice[lang]}
                  </p>
                )}
              </div>
            </div>

            {/* Right side: Telegram Window Mockup */}
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-lg rounded-3xl border border-slate-300 bg-[#eef3f7] p-4 sm:p-6 shadow-xl space-y-4">
                {/* Telegram Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                      <TelegramIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>OrderKoro Bot</span>
                        <span className="text-sky-600 text-xs">✓</span>
                      </div>
                      <div className="text-xs text-slate-600">bot</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-600">
                    12:34 PM
                  </span>
                </div>

                {/* Telegram Message Bubble */}
                <div className="rounded-2xl bg-white p-4 sm:p-5 text-xs sm:text-sm text-slate-900 shadow-xs font-sans space-y-2 border border-slate-100 leading-relaxed">
                  <div className="font-bold text-slate-950 flex items-center gap-1.5">
                    <span>📦</span>
                    <span className="rounded-xs bg-amber-100 text-amber-900 px-1.5 py-0.5 text-2xs font-extrabold">
                      [{LANDING_COPY.demoBlock.mock.tag}]
                    </span>
                    <span>
                      Order #{LANDING_COPY.demoBlock.mock.orderNumber}
                    </span>
                  </div>
                  <div>
                    Status:{" "}
                    <strong className="text-emerald-700">
                      {LANDING_COPY.demoBlock.mock.status}
                    </strong>
                  </div>

                  <div className="pt-1 space-y-0.5 border-t border-slate-100">
                    <p>
                      👤{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.customerLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.customerValue}
                    </p>
                    <p>
                      📞{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.phoneLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.phoneValue}
                    </p>
                    <p>
                      📍{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.addressLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.addressValue}
                    </p>
                  </div>

                  <div className="pt-1 space-y-0.5 border-t border-slate-100">
                    <p>
                      🛍️{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.itemLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.itemValue[lang]}
                    </p>
                    <p>
                      🎨{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.colorLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.colorValue[lang]}
                    </p>
                    <p>
                      📏{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.sizeLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.sizeValue}
                    </p>
                    <p>
                      🔢{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.qtyLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.qtyValue}
                    </p>
                    <p>
                      🚚{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.deliveryLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.deliveryValue}
                    </p>
                    <p>
                      💳{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.paymentLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.paymentValue[lang]}
                    </p>
                    <p className="font-bold text-slate-950 text-sm pt-1">
                      💵{" "}
                      <strong>
                        {LANDING_COPY.demoBlock.mock.totalLabel[lang]}
                      </strong>{" "}
                      {LANDING_COPY.demoBlock.mock.totalValue}
                    </p>
                  </div>
                </div>

                {/* Telegram Action Buttons Mockup */}
                <div className="space-y-1.5 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-xl bg-white/95 border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-800 shadow-2xs pointer-events-none"
                    >
                      {LANDING_COPY.demoBlock.mock.btnConfirm[lang]}
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-xl bg-white/95 border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-800 shadow-2xs pointer-events-none"
                    >
                      {LANDING_COPY.demoBlock.mock.btnNoAnswer[lang]}
                    </button>
                  </div>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="w-full rounded-xl bg-white/95 border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-800 shadow-2xs pointer-events-none"
                  >
                    {LANDING_COPY.demoBlock.mock.btnCancel[lang]}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 6. PRICING SECTION */}
        {/* ================================================================= */}
        <section
          id="pricing"
          aria-labelledby="pricing-heading"
          className="space-y-8 scroll-mt-20"
        >
          <div className="space-y-2">
            <h2
              id="pricing-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)]"
            >
              {LANDING_COPY.pricing.title[lang]}
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              {LANDING_COPY.pricing.subtitle[lang]}
            </p>
          </div>

          <div
            className={`grid grid-cols-1 ${showEarlyOffer ? "md:grid-cols-2" : "max-w-xl mx-auto"} gap-8 items-stretch`}
          >
            {/* Early Offer Card (Rendered ONLY if earlyOfferRemaining > 0) */}
            {showEarlyOffer && (
              <div className="rounded-3xl border-2 border-[var(--ok-green)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-lg flex flex-col justify-between space-y-6 relative overflow-hidden">
                <div className="space-y-4">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-[var(--ok-green)] border border-emerald-200 px-3.5 py-1 text-xs font-bold">
                    <span>
                      {LANDING_COPY.pricing.earlyCard.badge(
                        LANDING.earlyOfferTotal,
                        lang,
                      )}
                    </span>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
                        {LANDING_COPY.pricing.earlyCard.price(
                          LANDING.earlyPrice,
                          lang,
                        )}
                      </span>
                      <span className="text-sm font-bold text-[var(--text-secondary)]">
                        {LANDING_COPY.pricing.earlyCard.oneTimeLabel[lang]}
                      </span>
                    </div>

                    {/* Remaining & Segmented Progress Bar */}
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-bold text-[var(--ok-green)]">
                        {LANDING_COPY.pricing.earlyCard.remainingText(
                          LANDING.earlyOfferRemaining,
                          LANDING.earlyOfferTotal,
                          lang,
                        )}
                      </div>
                      {/* Segmented bar - no fake urgency / animations */}
                      <div
                        className="flex gap-1.5"
                        role="progressbar"
                        aria-label={LANDING_COPY.pricing.earlyCard.remainingText(
                          LANDING.earlyOfferRemaining,
                          LANDING.earlyOfferTotal,
                          lang,
                        )}
                        aria-valuenow={claimedCount}
                        aria-valuemin={0}
                        aria-valuemax={LANDING.earlyOfferTotal}
                      >
                        {segments.map((isClaimed, sIdx) => (
                          <div
                            key={sIdx}
                            className={`h-2 flex-1 rounded-full ${
                              isClaimed
                                ? "bg-[var(--ok-green)]"
                                : "bg-[var(--border-strong)]"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Exact Scope Text */}
                  <div className="rounded-2xl bg-[var(--bg-subtle)] p-4 border border-[var(--border-subtle)] space-y-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    <p className="font-medium text-[var(--text-primary)]">
                      {LANDING_COPY.pricing.earlyCard.scopeText[lang]}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-2">
                      {LANDING_COPY.pricing.earlyCard.scopeSubtext[lang]}
                    </p>
                  </div>

                  {/* Next Price Note */}
                  <p className="text-xs text-[var(--text-secondary)]">
                    {LANDING_COPY.pricing.earlyCard.nextPriceNote[lang]}
                  </p>
                </div>

                <a
                  href={effectiveContactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ok-green)] px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <MessengerIcon className="h-5 w-5" />
                  <span>{LANDING_COPY.pricing.earlyCard.ctaButton[lang]}</span>
                </a>
              </div>
            )}

            {/* Standard Card */}
            <div
              className={`rounded-3xl border ${
                showEarlyOffer
                  ? "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  : "border-2 border-[var(--ok-green)] bg-[var(--bg-surface)] shadow-lg"
              } p-6 sm:p-8 flex flex-col justify-between space-y-6`}
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 text-xs font-bold">
                    <span>{LANDING_COPY.pricing.standardCard.badge[lang]}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {LANDING_COPY.pricing.standardCard.title[lang]}
                  </h3>
                </div>

                {/* Price */}
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
                    {LANDING_COPY.pricing.standardCard.price(
                      LANDING.standardPrice,
                      lang,
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mt-1">
                    {LANDING_COPY.pricing.standardCard.includedNote(
                      LANDING.standardIncludedMonths,
                      lang,
                    )}
                  </div>
                </div>

                {/* What's Included */}
                <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {LANDING_COPY.pricing.standardCard.featuresTitle[lang]}
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                    {LANDING_COPY.pricing.standardCard.features.map(
                      (feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <span className="text-emerald-600 mt-0.5 shrink-0">
                            <CheckIcon className="h-4 w-4" />
                          </span>
                          <span>{feat[lang]}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                {/* Separate Costs */}
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {LANDING_COPY.pricing.standardCard.extraCostsTitle[lang]}
                  </div>
                  <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                    {LANDING_COPY.pricing.standardCard.extraCosts.map(
                      (extra, eIdx) => (
                        <li key={eIdx} className="flex items-start gap-2">
                          <span className="text-slate-400 mt-0.5 shrink-0">
                            •
                          </span>
                          <span>{extra[lang]}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>

              <a
                href={effectiveContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl ${
                  showEarlyOffer
                    ? "border-2 border-[var(--border-strong)] bg-white text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    : "bg-[var(--ok-green)] text-white shadow-md hover:opacity-95"
                } px-6 py-3.5 text-sm sm:text-base font-bold active:scale-[0.98] transition-all cursor-pointer`}
              >
                <MessengerIcon className="h-5 w-5" />
                <span>{LANDING_COPY.pricing.standardCard.ctaButton[lang]}</span>
              </a>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 7. FAQ ACCORDION */}
        {/* ================================================================= */}
        <section aria-labelledby="faq-heading" className="space-y-8">
          <div className="space-y-2 max-w-xl">
            <h2
              id="faq-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)]"
            >
              {LANDING_COPY.faq.title[lang]}
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              {LANDING_COPY.faq.subtitle[lang]}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {LANDING_COPY.faq.items.map((faqItem) => (
              <details
                key={faqItem.id}
                className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-all shadow-2xs hover:border-[var(--border-strong)] open:border-[var(--ok-green)]"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm sm:text-base font-bold text-[var(--text-primary)] list-none gap-3 focus-visible:outline-2 focus-visible:outline-[var(--ok-green)] rounded-md">
                  <span>{faqItem.question[lang]}</span>
                  <span className="text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180 shrink-0">
                    <ChevronDownIcon className="h-5 w-5" />
                  </span>
                </summary>
                <div className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3">
                  {faqItem.answer[lang]}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 8. FINAL CTA */}
        {/* ================================================================= */}
        <section aria-labelledby="final-cta-heading">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-surface)] via-emerald-50/20 to-[var(--bg-subtle)] p-8 sm:p-12 lg:p-16 text-center space-y-6 shadow-sm">
            <div className="max-w-xl mx-auto space-y-3">
              <h2
                id="final-cta-heading"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] leading-tight"
              >
                {LANDING_COPY.finalCta.title[lang]}
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-[var(--text-secondary)]">
                {LANDING_COPY.finalCta.subtitle[lang]}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto pt-2">
              <a
                href={effectiveContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ok-green)] px-7 py-3.5 text-base font-bold text-white shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
              >
                <MessengerIcon className="h-5 w-5" />
                <span>{LANDING_COPY.finalCta.primaryButton[lang]}</span>
              </a>

              <Link
                href="/demo-brand"
                className="w-full sm:w-auto flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--border-strong)] bg-white px-7 py-3.5 text-base font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>{LANDING_COPY.finalCta.secondaryButton[lang]}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* FOOTER */}
        {/* ================================================================= */}
        <footer className="pt-10 border-t border-[var(--border-subtle)] space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-center lg:text-left">
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <LandingWordmark />
              <span className="hidden sm:inline text-slate-300">•</span>
              <p className="text-xs text-[var(--text-muted)]">
                {LANDING_COPY.footer.tagline[lang]}
              </p>
            </div>

            <div className="flex items-center justify-center gap-5 text-xs font-semibold text-[var(--text-secondary)]">
              <Link href="/demo-brand/privacy" className="hover:underline">
                {LANDING_COPY.footer.privacy[lang]}
              </Link>
              <span>•</span>
              <Link href="/demo-brand/terms" className="hover:underline">
                {LANDING_COPY.footer.terms[lang]}
              </Link>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] text-center pt-2">
            {LANDING_COPY.footer.copyright[lang]}
          </p>
        </footer>
      </div>

      {/* ================================================================= */}
      {/* MOBILE STICKY BOTTOM CTA BAR */}
      {/* ================================================================= */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] px-4 py-3 lg:hidden shadow-sticky pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        role="region"
        aria-label="Quick Actions"
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Link
            href="/demo-brand"
            className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-xs font-bold text-[var(--text-primary)] active:scale-[0.98] transition-all"
          >
            {LANDING_COPY.stickyBar.demoButton[lang]}
          </Link>
          <a
            href={effectiveContactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-[2] min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ok-green)] px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-[0.98] transition-all"
          >
            <MessengerIcon className="h-4 w-4" />
            <span>{LANDING_COPY.stickyBar.messageUs[lang]}</span>
          </a>
        </div>
      </div>
    </main>
  );
}
