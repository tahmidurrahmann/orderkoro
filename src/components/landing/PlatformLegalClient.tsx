"use client";

import Link from "next/link";
import { useSyncExternalStore, type CSSProperties } from "react";
import type { SupportedLocale } from "@/lib/format";
import { getSavedLocale, subscribeLocale } from "@/lib/locale-preference";
import { LandingHeader } from "@/components/landing/LandingHeader";
import {
  PLATFORM_PRIVACY_COPY,
  PLATFORM_TERMS_COPY,
  type PlatformLegalDocument,
} from "@/lib/platform-legal-copy";

const THEME = {
  "--k-green": "#0A694B",
  "--k-green-dark": "#064A35",
  "--k-tint": "#E6F1EC",
  "--k-orange": "#F78E10",
  "--k-cream": "#F5F4F0",
  "--k-ink": "#1B1B18",
  "--k-muted": "#5C5A52",
  "--k-line": "#DDD9CF",
  "--k-red": "#B42318",
  "--k-red-tint": "#FBEFEC",
} as CSSProperties;

interface PlatformLegalClientProps {
  type: "privacy" | "terms";
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

export function PlatformLegalClient({ type }: PlatformLegalClientProps) {
  const lang: SupportedLocale = useSyncExternalStore(
    subscribeLocale,
    () => getSavedLocale("bn"),
    () => "bn",
  );

  const doc: PlatformLegalDocument =
    type === "privacy" ? PLATFORM_PRIVACY_COPY : PLATFORM_TERMS_COPY;

  const otherType = type === "privacy" ? "terms" : "privacy";
  const otherDoc =
    otherType === "privacy" ? PLATFORM_PRIVACY_COPY : PLATFORM_TERMS_COPY;

  const backToHomeText =
    lang === "bn" ? "← হোম পেজে ফিরে যান" : "← Back to Home";
  const otherLinkText =
    lang === "bn"
      ? `${otherDoc.title.bn} দেখুন →`
      : `View ${otherDoc.title.en} →`;

  return (
    <div
      style={THEME}
      className="min-h-screen bg-[var(--k-cream)] text-[var(--k-ink)] flex flex-col justify-between"
    >
      <LandingHeader />

      <main className="flex-1 w-full max-w-[1208px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="pt-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-bold text-[var(--k-green)] hover:underline cursor-pointer"
          >
            {backToHomeText}
          </Link>
        </div>

        {/* Page Container */}
        <div className="rounded-3xl border border-[var(--k-line)] bg-white p-6 sm:p-10 shadow-sm space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--k-tint)] text-[var(--k-green)] border border-emerald-200 px-3.5 py-1 text-xs font-bold">
              <span>{doc.lastUpdated[lang]}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-[var(--k-ink)] tracking-tight">
              {doc.title[lang]}
            </h1>

            <p className="text-base sm:text-lg text-[var(--k-muted)] leading-relaxed">
              {doc.subtitle[lang]}
            </p>
          </div>

          <hr className="border-[var(--k-line)] my-6" />

          {/* Document Content Sections */}
          <div className="space-y-8 text-sm sm:text-base text-[var(--k-muted)] leading-relaxed">
            {doc.sections.map((section) => (
              <section key={section.id} className="space-y-3">
                <h2 className="text-lg sm:text-xl font-extrabold text-[var(--k-ink)]">
                  {section.title[lang]}
                </h2>

                {section.paragraphs.map((p, pIdx) => (
                  <p
                    key={pIdx}
                    className="leading-relaxed text-[var(--k-ink)]/90"
                  >
                    {p[lang]}
                  </p>
                ))}

                {section.listItems && section.listItems.length > 0 && (
                  <ul className="space-y-2 pt-1 pl-4 list-disc text-sm sm:text-base text-[var(--k-ink)]/90">
                    {section.listItems.map((item, iIdx) => (
                      <li key={iIdx} className="leading-relaxed">
                        {item[lang]}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Contact Box */}
          <div className="rounded-2xl border border-[var(--k-line)] bg-[var(--k-tint)]/60 p-5 sm:p-6 mt-8 space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-[var(--k-ink)]">
              {doc.contactBox.title[lang]}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--k-muted)]">
              {doc.contactBox.description[lang]}
            </p>
            <div className="pt-1">
              <a
                href={doc.contactBox.messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--k-green)] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[var(--k-green-dark)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <MessengerIcon className="h-4 w-4" />
                <span>{doc.contactBox.messengerLabel[lang]}</span>
              </a>
            </div>
          </div>

          {/* Cross Link to Other Legal Page */}
          <div className="pt-6 border-t border-[var(--k-line)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm">
            <Link
              href={`/${otherType}`}
              className="text-[var(--k-green)] font-bold hover:underline"
            >
              {otherLinkText}
            </Link>
            <Link href="/" className="text-[var(--k-muted)] hover:underline">
              {backToHomeText}
            </Link>
          </div>
        </div>
      </main>

      {/* Platform Footer */}
      <footer className="bg-[var(--k-cream)] border-t border-[var(--k-line)] py-9">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-5 text-[15px] font-semibold text-neutral-950">
            <Link href="/privacy" className="hover:underline">
              {PLATFORM_PRIVACY_COPY.title[lang]}
            </Link>
            <Link href="/terms" className="hover:underline">
              {PLATFORM_TERMS_COPY.title[lang]}
            </Link>
          </div>
          <p className="text-sm text-neutral-950">
            {lang === "bn"
              ? "© ২০২৬ OrderKoro। সর্বস্বত্ব সংরক্ষিত।"
              : "© 2026 OrderKoro. All rights reserved."}
          </p>
        </div>
      </footer>
    </div>
  );
}
