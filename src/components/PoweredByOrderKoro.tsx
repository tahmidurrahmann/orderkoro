import Image from "next/image";

interface PoweredByOrderKoroProps {
  slug: string;
  lang: "bn" | "en";
  className?: string;
}

export default function PoweredByOrderKoro({
  slug,
  lang,
  className = "",
}: PoweredByOrderKoroProps) {
  const text =
    lang === "bn" ? "OrderKoro দ্বারা চালিত" : "Powered by OrderKoro";
  const href = `https://orderkoro.shop/?utm_source=seller_page&utm_medium=footer&utm_campaign=${encodeURIComponent(
    slug,
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity opacity-75 hover:opacity-100 ${className}`}
    >
      <Image
        src="/brand/logo/logo-mark.svg"
        alt=""
        width={26}
        height={16}
        className="h-4 w-auto shrink-0 inline-block object-contain"
      />
      <span>{text}</span>
    </a>
  );
}
