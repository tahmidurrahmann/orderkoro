import Link from "next/link";

export default function NotFound() {
  return (
    <main
      data-lang="bn"
      className="mx-auto flex min-h-screen-safe max-w-[480px] flex-col items-center justify-center bg-[var(--bg-surface)] px-5 py-12 text-center shadow-sm"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xl font-bold text-[var(--text-secondary)]">
        ৪০৪
      </div>
      <h1 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
        পেজটি খুঁজে পাওয়া যায়নি (Page Not Found)
      </h1>
      <p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
        আপনি যে পণ্যের লিংকটি খুঁজছেন তা সঠিক নয় অথবা বর্তমানে সরিয়ে নেওয়া হয়েছে।
      </p>
      <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
        The product page link you followed does not exist or may have been moved.
      </p>
      <Link
        href="/demo-brand"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[#1E3A5F] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#152944] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A5F]"
      >
        ডেমো স্টোর দেখুন (View Demo Store)
      </Link>
    </main>
  );
}
