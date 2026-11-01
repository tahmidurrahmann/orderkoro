"use client";

import Link from "next/link";
import React from "react";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen-safe max-w-lg flex-col items-center justify-center bg-[var(--bg-canvas)] px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-2xl font-bold">
        ⚠️
      </div>
      <h1 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
        একটি অপ্রত্যাশিত সমস্যা হয়েছে
      </h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        An unexpected error occurred.
      </p>
      <p className="mt-3 max-w-sm text-sm text-[var(--text-secondary)] leading-relaxed">
        পেজটি লোড হতে সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।
      </p>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-primary,#1E3A5F)] px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:opacity-90 cursor-pointer"
        >
          আবার চেষ্টা করুন (Try Again)
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-strong,#D1D5DB)] bg-[var(--bg-surface,#FFFFFF)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary,#4B5563)] hover:bg-neutral-100 cursor-pointer"
        >
          হোম পেজ (Home)
        </Link>
      </div>
    </main>
  );
}
