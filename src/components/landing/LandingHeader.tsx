import Link from "next/link";
import Image from "next/image";
import { LandingLanguageSwitch } from "./LandingLanguageSwitch";

export const BRAND_WORDMARK_TEXT = "OrderKoro";

export function LandingWordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ok-green)] rounded-xs"
      aria-label={`${BRAND_WORDMARK_TEXT} Home`}
    >
      <span
        className="text-xl tracking-tight text-[var(--ok-green)]"
        style={{
          fontFamily: "var(--font-anek-bangla), sans-serif",
          fontWeight: 800,
        }}
      >
        OrderKoro
      </span>
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
