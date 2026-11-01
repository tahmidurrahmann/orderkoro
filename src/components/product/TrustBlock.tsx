"use client";

import React from "react";
import type { SupportedLocale } from "@/lib/format";
import { type CopyDictionary, resolveLocalizedText, type LocalizedText } from "@/lib/i18n";

export interface TrustBlockProps {
  phone?: string;
  messengerPageUsername?: string;
  returnPolicyText: LocalizedText;
  copy: CopyDictionary;
  lang: SupportedLocale;
}

export default function TrustBlock({
  phone,
  messengerPageUsername,
  returnPolicyText,
  copy,
  lang,
}: TrustBlockProps) {
  return (
    <div className="space-y-4">
      {/* 3 Trust Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pillar 1: Cash on Delivery */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-center space-y-2 hover:border-[var(--brand-primary)]/40 transition">
          <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <circle cx="12" cy="15" r="2" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-snug">
              {copy.trustPillar1Title}
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
              {copy.trustPillar1Body}
            </p>
          </div>
        </div>

        {/* Pillar 2: 7-Day Easy Return */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-center space-y-2 hover:border-[var(--brand-primary)]/40 transition">
          <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-snug">
              {copy.trustPillar2Title}
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
              {copy.trustPillar2Body}
            </p>
          </div>
        </div>

        {/* Pillar 3: 100% Quality Guaranteed */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-center space-y-2 hover:border-[var(--brand-primary)]/40 transition">
          <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-snug">
              {copy.trustPillar3Title}
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
              {copy.trustPillar3Body}
            </p>
          </div>
        </div>
      </div>

      {/* Return policy note */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 sm:p-4 text-xs sm:text-sm text-[var(--text-secondary)]">
        <p className="font-bold text-[var(--text-primary)] mb-1">
          {copy.trustPolicyHeading}
        </p>
        <p>{resolveLocalizedText(returnPolicyText, lang)}</p>
      </div>

      {/* Helpline Buttons */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {copy.trustContactHeading}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{copy.trustCallButton}: {phone}</span>
            </a>
          )}
          {messengerPageUsername && (
            <a
              href={`https://m.me/${messengerPageUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.49 5.43 3.82 7.04v3.52c0 .41.44.66.79.46l3.19-1.78c.71.2 1.45.31 2.2.31 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1.09 12.14-2.61-2.79-5.1 2.79 5.61-5.96 2.67 2.79 5.04-2.79-5.61 5.96z" />
              </svg>
              <span>{copy.trustMessengerButton}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
