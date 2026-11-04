import Link from "next/link";
import Image from "next/image";
import { LandingLanguageSwitch } from "./LandingLanguageSwitch";

export const BRAND_WORDMARK_TEXT = "OrderKoro";

export function LandingWordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ok-green)] rounded-xs"
      aria-label={`${BRAND_WORDMARK_TEXT} Home`}
    >
      <Image
        src="/brand/logo/logo-mark.svg"
        alt="OrderKoro"
        width={34}
        height={34}
        className="h-8.5 w-auto shrink-0"
        priority
      />
    </Link>
  );
}

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 w-full h-14 sm:h-16 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-b border-[var(--border-subtle)]">
      <nav
        aria-label="Main Navigation"
        className="mx-auto flex h-14 sm:h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <LandingWordmark />
        <LandingLanguageSwitch />
      </nav>
    </header>
  );
}
