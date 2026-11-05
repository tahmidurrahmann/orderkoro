import Image from "next/image";
import Link from "next/link";

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
        width={32}
        height={32}
        className="h-7 md:h-8 w-auto shrink-0"
        priority
      />
    </Link>
  );
}
