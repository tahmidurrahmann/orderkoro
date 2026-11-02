"use client";

import React, { useSyncExternalStore } from "react";
import type { SupportedLocale } from "@/lib/format";
import {
  getSavedLocale,
  saveLocalePreference,
  subscribeLocale,
} from "@/lib/locale-preference";

export function LandingLanguageSwitch() {
  const lang = useSyncExternalStore(
    subscribeLocale,
    () => getSavedLocale("bn"),
    () => "bn"
  );

  function handleLanguageChange(newLang: SupportedLocale) {
    saveLocalePreference(newLang);
  }

  return (
    <div
      role="group"
      aria-label="Language switch / ভাষা পরিবর্তন"
      className="inline-flex items-center rounded-lg bg-[var(--bg-subtle)] p-0.5 border border-[var(--border-subtle)] shadow-2xs"
    >
      <button
        type="button"
        onClick={() => handleLanguageChange("bn")}
        aria-pressed={lang === "bn"}
        aria-label="বাংলা ভাষায় পরিবর্তন করুন (Switch to Bangla)"
        className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] focus-visible:outline-offset-1 ${
          lang === "bn"
            ? "bg-white text-[var(--text-primary)] shadow-2xs"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        বাং
      </button>
      <button
        type="button"
        onClick={() => handleLanguageChange("en")}
        aria-pressed={lang === "en"}
        aria-label="Switch to English (ইংরেজি ভাষায় পরিবর্তন করুন)"
        className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] focus-visible:outline-offset-1 ${
          lang === "en"
            ? "bg-white text-[var(--text-primary)] shadow-2xs"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        EN
      </button>
    </div>
  );
}
