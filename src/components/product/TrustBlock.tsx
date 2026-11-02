"use client";

import React from "react";
import type { PublicClientConfig, QualityBadgeConfig, ReturnPolicyConfig } from "@/lib/config-schema";
import type { SupportedLocale } from "@/lib/format";
import type { CopyDictionary } from "@/lib/i18n";
import { getProductPolicyParagraph, getTrustBadges } from "@/lib/policy-text";

export interface TrustBlockProps {
  phone?: string;
  messengerPageUsername?: string;
  returnPolicy: ReturnPolicyConfig;
  payments?: PublicClientConfig["payments"];
  qualityBadge?: QualityBadgeConfig;
  copy: CopyDictionary;
  lang: SupportedLocale;
}

export default function TrustBlock({
  phone,
  messengerPageUsername,
  returnPolicy,
  payments,
  qualityBadge,
  copy,
  lang,
}: TrustBlockProps) {
  const envContactUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CONTACT_URL?.trim() : undefined;
  const rawMessenger = envContactUrl || (messengerPageUsername && !messengerPageUsername.startsWith("TODO") ? messengerPageUsername.trim() : "");
  const messengerHref = rawMessenger
    ? (rawMessenger.startsWith("http://") || rawMessenger.startsWith("https://") ? rawMessenger : `https://m.me/${rawMessenger}`)
    : "";

  const badges = getTrustBadges({ returnPolicy, payments, qualityBadge }, lang);
  const policyParagraph = getProductPolicyParagraph(returnPolicy, lang);

  const gridColsClass =
    badges.length === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : badges.length === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-3";

  return (
    <div className="space-y-4">
      {/* Derived Trust Badges */}
      <div className={`grid grid-cols-1 ${gridColsClass} gap-3`}>
        {badges.map((badge) => {
          let iconColor = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
          if (badge.iconType === "return") {
            iconColor = "bg-blue-50 text-blue-700 border-blue-200/60";
          } else if (badge.iconType === "exchange") {
            iconColor = "bg-purple-50 text-purple-700 border-purple-200/60";
          } else if (badge.iconType === "quality") {
            iconColor = "bg-amber-50 text-amber-700 border-amber-200/60";
          }

          return (
            <div
              key={badge.id}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-center space-y-2 hover:border-[var(--brand-primary)]/40 transition"
            >
              <div
                className={`mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border shadow-xs ${iconColor}`}
              >
                {badge.iconType === "payment" && (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                    <circle cx="12" cy="15" r="2" />
                  </svg>
                )}
                {badge.iconType === "return" && (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                )}
                {badge.iconType === "exchange" && (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                )}
                {badge.iconType === "quality" && (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-snug">
                  {badge.title}
                </p>
                <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
                  {badge.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Return policy note */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 sm:p-4 text-xs sm:text-sm text-[var(--text-secondary)]">
        <p className="font-bold text-[var(--text-primary)] mb-1">
          {copy.trustPolicyHeading}
        </p>
        <p>{policyParagraph}</p>
      </div>

      {/* Helpline Buttons */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">
              {copy.trustContactHeading}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {lang === "bn" ? "সরাসরি ফোন বা মেসেঞ্জারে দ্রুত উত্তর পান" : "Instant reply via direct phone call or Messenger"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {phone && (
            <a
              href={`tel:${phone}`}
              style={{
                background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                backgroundColor: "#059669",
                color: "#ffffff",
              }}
              className="contact-btn-call group relative flex items-center gap-3 rounded-2xl p-3 sm:p-3.5 text-white shadow-md hover:shadow-lg shadow-emerald-900/15 transition-all duration-200 active:scale-[0.98] border border-emerald-400/30"
            >
              <div
                style={{ backgroundColor: "rgba(255, 255, 255, 0.22)" }}
                className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-white backdrop-blur-xs shadow-inner group-hover:scale-105 transition-transform"
              >
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span style={{ color: "rgba(255, 255, 255, 0.85)" }} className="block text-[11px] font-semibold uppercase tracking-wider">
                  {copy.trustCallButton}
                </span>
                <span style={{ color: "#ffffff" }} className="block text-xs min-[360px]:text-sm sm:text-base font-extrabold tracking-wide text-white font-mono leading-tight">
                  {phone}
                </span>
              </div>
              <div
                style={{ backgroundColor: "rgba(255, 255, 255, 0.18)" }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white group-hover:translate-x-0.5 transition-transform"
              >
                <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </a>
          )}
          {messengerHref && (
            <a
              href={messengerHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "linear-gradient(135deg, #0084FF 0%, #0066FF 100%)",
                backgroundColor: "#0084FF",
                color: "#ffffff",
              }}
              className="contact-btn-messenger group relative flex items-center gap-3 rounded-2xl p-3 sm:p-3.5 text-white shadow-md hover:shadow-lg shadow-blue-900/15 transition-all duration-200 active:scale-[0.98] border border-blue-300/30"
            >
              <div
                style={{ backgroundColor: "rgba(255, 255, 255, 0.22)" }}
                className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-white backdrop-blur-xs shadow-inner group-hover:scale-105 transition-transform"
              >
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.49 5.43 3.82 7.04v3.52c0 .41.44.66.79.46l3.19-1.78c.71.2 1.45.31 2.2.31 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1.09 12.14-2.61-2.79-5.1 2.79 5.61-5.96 2.67 2.79 5.04-2.79-5.61 5.96z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span style={{ color: "rgba(255, 255, 255, 0.85)" }} className="block text-[11px] font-semibold uppercase tracking-wider">
                  {lang === "bn" ? "ফেসবুক মেসেঞ্জার" : "Facebook Messenger"}
                </span>
                <span style={{ color: "#ffffff" }} className="block text-xs min-[360px]:text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight">
                  {copy.trustMessengerButton}
                </span>
              </div>
              <div
                style={{ backgroundColor: "rgba(255, 255, 255, 0.18)" }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white group-hover:translate-x-0.5 transition-transform"
              >
                <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
