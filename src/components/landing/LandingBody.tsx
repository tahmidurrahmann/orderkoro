"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { SupportedLocale } from "@/lib/format";
import { LANDING_COPY, getPricingLine } from "@/lib/landing-copy";
import { getSavedLocale, subscribeLocale } from "@/lib/locale-preference";

interface LandingBodyProps {
  contactUrl: string;
}

function FeatureIcon({ type }: { type: string }) {
  switch (type) {
    case "speed":
      return (
        <svg
          className="h-4 w-4 text-emerald-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "cod":
      return (
        <svg
          className="h-4 w-4 text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.29 7 12 12.01 20.71 7" />
          <line x1="12" y1="22" x2="12" y2="12" />
        </svg>
      );
    case "mfs":
      return (
        <svg
          className="h-4 w-4 text-purple-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case "automation":
      return (
        <svg
          className="h-4 w-4 text-amber-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    default:
      return null;
  }
}

export function LandingBody({ contactUrl }: LandingBodyProps) {
  const lang: SupportedLocale = useSyncExternalStore(
    subscribeLocale,
    () => getSavedLocale("bn"),
    () => "bn",
  );

  const pricingLine = getPricingLine();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between bg-[var(--bg-canvas)] p-4 text-[var(--text-primary)] outline-none"
    >
      <div className="mx-auto w-full max-w-xl space-y-3">
        {/* Top Badge: leading "OrderKoro •" removed, single language */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>{LANDING_COPY.eyebrow[lang]}</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
            {LANDING_COPY.hero.headline[lang]}
          </h1>

          {/* Subline */}
          <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {LANDING_COPY.hero.subline[lang]}
          </p>
        </div>

        {/* Value Proposition Card */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </span>
            <span>{LANDING_COPY.banner.title[lang]}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
            {LANDING_COPY.features.map((feature) => (
              <div
                key={feature.id}
                className="rounded-xl bg-[var(--bg-subtle)] p-3.5 border border-[var(--border-subtle)] flex items-start gap-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs mt-0.5">
                  <FeatureIcon type={feature.iconType} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[var(--text-primary)] text-xs sm:text-sm block leading-tight mb-1">
                    {feature.title[lang]}
                  </span>
                  <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                    {feature.body[lang]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Highlight */}
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-center">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-800 block mb-0.5">
              {LANDING_COPY.pricing.heading[lang]}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-amber-950 block">
              {pricingLine[lang]}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {/* Live Demo Link */}
            <Link
              href="/demo-brand"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[var(--brand-primary-hover)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>{LANDING_COPY.actions.demoButton[lang]}</span>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            {/* Messenger Contact Button (Rendered only when NEXT_PUBLIC_CONTACT_URL is set) */}
            {contactUrl && (
              <a
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-bold text-[var(--brand-primary)] hover:bg-[var(--bg-subtle)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.455 5.518 3.735 7.21V22l3.39-1.86c.915.253 1.884.39 2.875.39 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.448l-2.556-2.727-4.99 2.727 5.485-5.823 2.62 2.727 4.927-2.727-5.486 5.823z" />
                </svg>
                <span>{LANDING_COPY.actions.contactButton[lang]}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-[var(--text-muted)] pt-4 space-y-1">
        <p>{LANDING_COPY.footer[lang]}</p>
      </footer>
    </main>
  );
}
