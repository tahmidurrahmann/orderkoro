import Link from "next/link";
import { LandingLanguageSwitch } from "./LandingLanguageSwitch";

export const BRAND_WORDMARK_TEXT = "OrderKoro";

export function LandingWordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center text-lg font-extrabold tracking-tight text-[var(--text-primary)] hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] rounded-xs"
      aria-label={`${BRAND_WORDMARK_TEXT} Home`}
    >
      <span>Order</span>
      <span className="text-[var(--brand-primary)]">Koro</span>
    </Link>
  );
}

export function LandingHeader() {
  return (
    <>
      {/* Fixed 56px sticky header */}
      <header className="sticky top-0 z-30 w-full h-14 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
        <nav
          aria-label="Main Navigation"
          className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-4"
        >
          <LandingWordmark />
          <LandingLanguageSwitch />
        </nav>
      </header>
    </>
  );
}
