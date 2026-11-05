"use client";

import Image from "next/image";
import Link from "next/link";
import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { PublicClientConfig } from "@/lib/config-schema";
import type { SupportedLocale } from "@/lib/format";
import { getClientCopy, resolveLocalizedText } from "@/lib/i18n";
import { getSavedLocale, saveLocalePreference } from "@/lib/locale-preference";
import {
  getLegalFooterText,
  getPolicyLastUpdatedDate,
  getPrivacyPageSections,
  getTermsPageSections,
} from "@/lib/policy-text";
import PoweredByOrderKoro from "./PoweredByOrderKoro";

export type LegalPageType = "privacy" | "terms";

interface LegalPageClientProps {
  config: PublicClientConfig;
  type: LegalPageType;
}

const emptySubscribe = () => () => {};

export default function LegalPageClient({
  config,
  type,
}: LegalPageClientProps) {
  const initialLang = useSyncExternalStore(
    emptySubscribe,
    () =>
      config.language.allowSwitch
        ? getSavedLocale(config.language.default)
        : config.language.default,
    () => config.language.default,
  );

  const [selectedLang, setSelectedLang] = useState<SupportedLocale | null>(
    null,
  );
  const lang = selectedLang ?? initialLang;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute("data-lang", lang);
    }
  }, [lang]);

  function handleLanguageChange(newLang: SupportedLocale) {
    setSelectedLang(newLang);
    saveLocalePreference(newLang);
  }

  const copy = useMemo(
    () => getClientCopy(lang, config.copy),
    [lang, config.copy],
  );

  const brandName = resolveLocalizedText(config.brand.name, lang);
  const businessAddress = config.contact.businessAddress
    ? resolveLocalizedText(config.contact.businessAddress, lang)
    : "";

  const activeLogoUrl =
    typeof config.brand.logoUrl === "string"
      ? config.brand.logoUrl
      : config.brand.logoUrl[lang] ||
        config.brand.logoUrl.bn ||
        config.brand.logoUrl.en;

  const isPrivacy = type === "privacy";
  const pageTitle = isPrivacy
    ? lang === "bn"
      ? "প্রাইভেসি পলিসি (Privacy Policy)"
      : "Privacy Policy"
    : lang === "bn"
      ? "শর্তাবলী, ডেলিভারি ও রিটার্ন পলিসি (Terms & Returns)"
      : "Terms, Delivery & Return Policy";

  const lastUpdatedText = getPolicyLastUpdatedDate(
    config.policyUpdatedAt,
    lang,
  );
  const sections = isPrivacy
    ? getPrivacyPageSections(config, lang)
    : getTermsPageSections(config, lang);

  const footerText = getLegalFooterText(brandName, lang);

  const hasMessenger =
    Boolean(config.contact.messengerPageUsername) &&
    !config.contact.messengerPageUsername.startsWith("TODO");

  const tradeLicense = config.contact.tradeLicenseNumber?.trim();

  return (
    <div
      data-lang={lang}
      style={
        {
          "--brand-primary": config.brand.primaryColor,
        } as React.CSSProperties
      }
      className="min-h-screen-safe flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]"
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-4 sm:px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex min-h-11 max-w-4xl items-center justify-between">
          <Link
            href={`/${config.slug}`}
            className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition cursor-pointer"
          >
            {activeLogoUrl ? (
              <Image
                src={activeLogoUrl}
                alt={brandName}
                width={140}
                height={32}
                className="h-7 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="truncate text-base font-bold text-[var(--text-primary)]">
                {brandName}
              </span>
            )}
          </Link>

          {/* Language Switcher */}
          {config.language.allowSwitch && (
            <div
              role="group"
              aria-label="Language switch"
              className="inline-flex items-center rounded-lg bg-neutral-100 p-1 border border-neutral-200 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => handleLanguageChange("bn")}
                className={`min-h-7 min-w-9 rounded-md px-2 py-0.5 text-xs font-bold transition cursor-pointer ${
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
                className={`min-h-7 min-w-9 rounded-md px-2 py-0.5 text-xs font-bold transition cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {copy.langToggleEn}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs space-y-6">
          <Link
            href={`/${config.slug}`}
            className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline mb-3 cursor-pointer w-full"
          >
            <span>← {copy.thanksBackToProduct}</span>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {pageTitle}
            </h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {lastUpdatedText}
            </p>
          </div>

          {/* Dynamic Content Sections */}
          <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
            {sections.map((section) => (
              <section key={section.id} className="space-y-2.5">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {section.title}
                </h2>

                {section.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}

                {section.listItems && section.listItems.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    {section.listItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}

                {section.table && (
                  <div className="overflow-x-auto pt-1">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                          {section.table.headers.map((h, idx) => (
                            <th key={idx} className="py-2 pr-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {section.table.rows.map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                              {row.zone}
                            </td>
                            <td className="py-2.5 pr-3 text-[var(--brand-primary)] font-bold">
                              {row.charge}
                            </td>
                            <td className="py-2.5 text-[var(--text-secondary)]">
                              {row.duration}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {section.note && (
                  <p className="text-xs text-emerald-700 font-semibold pt-1">
                    {section.note}
                  </p>
                )}
              </section>
            ))}

            {/* Responsible Business Contact Card (Always Present on Both Pages) */}
            <section className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {lang === "bn"
                  ? "দায়িত্বশীল প্রতিষ্ঠান ও যোগাযোগ"
                  : "Responsible Business & Contact"}
              </h2>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-1.5 text-xs sm:text-sm">
                <p>
                  <strong className="text-[var(--text-primary)]">
                    {lang === "bn" ? "ব্যবসা/ব্র্যান্ড:" : "Business/Brand:"}
                  </strong>{" "}
                  {brandName}
                </p>
                {businessAddress && (
                  <p>
                    <strong className="text-[var(--text-primary)]">
                      {lang === "bn" ? "ঠিকানা:" : "Address:"}
                    </strong>{" "}
                    {businessAddress}
                  </p>
                )}
                {tradeLicense && (
                  <p>
                    <strong className="text-[var(--text-primary)]">
                      {lang === "bn" ? "ট্রেড লাইসেন্স:" : "Trade License:"}
                    </strong>{" "}
                    {tradeLicense}
                  </p>
                )}
                <p>
                  <strong className="text-[var(--text-primary)]">
                    {lang === "bn" ? "ফোন:" : "Phone:"}
                  </strong>{" "}
                  <a
                    href={`tel:${config.contact.phone}`}
                    className="text-[var(--brand-primary)] hover:underline"
                  >
                    {config.contact.phone}
                  </a>
                </p>
                {hasMessenger && (
                  <p>
                    <strong className="text-[var(--text-primary)]">
                      {lang === "bn" ? "মেসেঞ্জার:" : "Messenger:"}
                    </strong>{" "}
                    <a
                      href={`https://m.me/${encodeURIComponent(config.contact.messengerPageUsername)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-primary)] hover:underline"
                    >
                      m.me/{config.contact.messengerPageUsername}
                    </a>
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <Link
              href={`/${config.slug}/${isPrivacy ? "terms" : "privacy"}`}
              className="text-[var(--brand-primary)] hover:underline font-semibold cursor-pointer"
            >
              {isPrivacy
                ? lang === "bn"
                  ? "শর্তাবলী ও রিটার্ন পলিসি দেখুন →"
                  : "View Terms & Returns Policy →"
                : lang === "bn"
                  ? "প্রাইভেসি পলিসি দেখুন →"
                  : "View Privacy Policy →"}
            </Link>

            <Link
              href={`/${config.slug}`}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline cursor-pointer"
            >
              ← {copy.thanksBackToProduct}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-4 text-center text-xs text-[var(--text-muted)] space-y-1">
        <p>{footerText.copyright}</p>
        {config.showPoweredBy !== false && (
          <div>
            <PoweredByOrderKoro slug={config.slug} lang={lang} />
          </div>
        )}
      </footer>
    </div>
  );
}
