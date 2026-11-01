"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { PublicClientConfig } from "@/lib/config-schema";
import { formatPrice, type SupportedLocale } from "@/lib/format";
import { getClientCopy, resolveLocalizedText } from "@/lib/i18n";
import { getSavedLocale, saveLocalePreference } from "@/lib/locale-preference";

export type LegalPageType = "privacy" | "terms";

interface LegalPageClientProps {
  config: PublicClientConfig;
  type: LegalPageType;
}

const emptySubscribe = () => () => {};

export default function LegalPageClient({ config, type }: LegalPageClientProps) {
  const initialLang = useSyncExternalStore(
    emptySubscribe,
    () => (config.language.allowSwitch ? getSavedLocale(config.language.default) : config.language.default),
    () => config.language.default
  );

  const [selectedLang, setSelectedLang] = useState<SupportedLocale | null>(null);
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

  const copy = useMemo(() => getClientCopy(lang, config.copy), [lang, config.copy]);

  const brandName = resolveLocalizedText(config.brand.name, lang);
  const businessAddress = resolveLocalizedText(config.contact.businessAddress, lang);
  const returnPolicy = resolveLocalizedText(config.returnPolicyText, lang);

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
          <div>
            <Link
              href={`/${config.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline mb-3 cursor-pointer"
            >
              <span>← {copy.thanksBackToProduct}</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {pageTitle}
            </h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {lang === "bn"
                ? `সর্বশেষ আপডেট: ${new Date().getFullYear()}`
                : `Last updated: ${new Date().getFullYear()}`}
            </p>
          </div>

          {isPrivacy ? (
            /* Privacy Policy Body */
            <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {lang === "bn" ? "১. তথ্য সংগ্রহ ও ব্যবহার" : "1. Information We Collect"}
                </h2>
                <p>
                  {lang === "bn"
                    ? `${brandName} এ আপনার গোপনীয়তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ। ক্যাশ অন ডেলিভারি (COD) অর্ডার সফলভাবে সরবরাহ করার উদ্দেশ্যে আমরা কেবল আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা সংগ্রহ করি।`
                    : `At ${brandName}, your privacy is of utmost importance. To successfully deliver your Cash on Delivery (COD) orders, we collect only your full name, phone number, and delivery address.`}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {lang === "bn" ? "২. তথ্য সংরক্ষণ ও সুরক্ষা" : "2. How We Protect Your Data"}
                </h2>
                <p>
                  {lang === "bn"
                    ? "আপনার তথ্যের নিরাপত্তা নিশ্চিত করতে আমরা আধুনিক এনক্রিপশন ও সীমিত অ্যাক্সেস প্রোটোকল ব্যবহার করি। পার্সেল ডেলিভারি ব্যতীত কোনো তৃতীয় পক্ষের কাছে আপনার ব্যক্তিগত তথ্য বিক্রি, হস্তান্তর বা প্রকাশ করা হয় না।"
                    : "We use modern encryption protocols and restricted access controls to keep your data safe. We never sell, rent, or disclose your personal contact information to any third parties other than authorized courier partners for order delivery."}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {lang === "bn" ? "৩. যোগাযোগ ও সহায়তা" : "3. Contact & Business Information"}
                </h2>
                <p>
                  {lang === "bn"
                    ? `যেকোনো গোপনীয়তা সংক্রান্ত প্রশ্ন বা তথ্যের জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন:`
                    : `For any privacy-related queries or information, please reach out to us:`}
                </p>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-1.5 text-xs sm:text-sm">
                  <p>
                    <strong className="text-[var(--text-primary)]">
                      {lang === "bn" ? "প্রতিষ্ঠান:" : "Brand:"}
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
                  <p>
                    <strong className="text-[var(--text-primary)]">
                      {lang === "bn" ? "ফোন:" : "Phone:"}
                    </strong>{" "}
                    <a href={`tel:${config.contact.phone}`} className="text-[var(--brand-primary)] hover:underline">
                      {config.contact.phone}
                    </a>
                  </p>
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
                </div>
              </section>
            </div>
          ) : (
            /* Terms, Delivery & Return Policy Body */
            <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {lang === "bn" ? "১. ক্যাশ অন ডেলিভারি (COD) নীতি" : "1. Cash on Delivery (COD) Policy"}
                </h2>
                <p>
                  {lang === "bn"
                    ? "আমাদের সমস্ত পণ্যে ক্যাশ অন ডেলিভারি প্রযোজ্য। কোনো অগ্রিম পেমেন্ট ছাড়াই অর্ডার করুন। পার্সেল ডেলিভারি ম্যানের সামনে খুলে দেখে রঙ ও সাইজ সঠিক থাকলে মূল্য পরিশোধ করুন।"
                    : "All our products are shipped with Cash on Delivery (COD). No advance payment is needed. Please inspect the parcel and confirm the color and size in front of the rider before paying."}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {lang === "bn" ? "২. রিটার্ন ও এক্সচেঞ্জ পলিসি" : "2. Return & Exchange Policy"}
                </h2>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-950 font-medium">
                  {returnPolicy}
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {lang === "bn" ? "৩. ডেলিভারি চার্জ ও সময়সীমা" : "3. Delivery Charges & Timelines"}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                        <th className="py-2 pr-3">{lang === "bn" ? "এলাকা" : "Zone"}</th>
                        <th className="py-2 pr-3">{lang === "bn" ? "চার্জ" : "Charge"}</th>
                        <th className="py-2">{lang === "bn" ? "সময়সীমা" : "Duration"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {config.delivery.zones.map((z) => (
                        <tr key={z.id}>
                          <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                            {resolveLocalizedText(z.label, lang)}
                          </td>
                          <td className="py-2.5 pr-3 text-[var(--brand-primary)] font-bold">
                            {formatPrice(z.charge, lang)}
                          </td>
                          <td className="py-2.5 text-[var(--text-secondary)]">
                            {lang === "bn"
                              ? `${z.daysMin}-${z.daysMax} কর্মদিবস`
                              : `${z.daysMin}-${z.daysMax} business days`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {config.delivery.freeDeliveryAbove && (
                  <p className="text-xs text-emerald-700 font-semibold pt-1">
                    {lang === "bn"
                      ? `* ${formatPrice(config.delivery.freeDeliveryAbove, lang)} টাকার বেশি অর্ডারে সারা দেশে ডেলিভারি সম্পূর্ণ ফ্রি!`
                      : `* Free delivery nationwide on orders above ${formatPrice(config.delivery.freeDeliveryAbove, lang)}!`}
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {lang === "bn" ? "৪. যোগাযোগ" : "4. Contact Us"}
                </h2>
                <p>
                  {lang === "bn"
                    ? `যেকোনো এক্সচেঞ্জ বা প্রশ্নের জন্য যোগাযোগ করুন: ${config.contact.phone} অথবা মেসেঞ্জারে m.me/${config.contact.messengerPageUsername}`
                    : `For any exchange requests or questions, please contact us at ${config.contact.phone} or on Messenger at m.me/${config.contact.messengerPageUsername}`}
                </p>
              </section>
            </div>
          )}

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
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-4 text-center text-xs text-[var(--text-muted)]">
        <p>© {new Date().getFullYear()} {brandName}. {copy.footerRightsReserved}</p>
        {config.showPoweredBy && (
          <p className="mt-1 text-[11px] opacity-75">{copy.poweredByText}</p>
        )}
      </footer>
    </div>
  );
}
