"use client";

// src/components/LandingBody.tsx  (replaces your current file)
import Image from "next/image";
import Link from "next/link";
import {
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { SupportedLocale } from "@/lib/format";
import { LANDING } from "@/lib/landing-config";
import { LANDING_COPY, type BenefitIcon } from "@/lib/landing-copy";
import {
  CONTACT_PHONE,
  DEMO_PATH,
  FOUNDER,
  LEGAL_LINKS,
  MEASURED,
  NO_COMMISSION,
  RISK_REVERSAL,
  SHOTS,
} from "@/lib/landing-extra";
import { getSavedLocale, subscribeLocale } from "@/lib/locale-preference";

interface LandingBodyProps {
  contactUrl: string;
  demoAlertsUrl?: string;
}

// Self-contained colours so the page does not depend on other CSS variables.
const THEME = {
  "--k-green": "#0A694B",
  "--k-green-dark": "#064A35",
  "--k-tint": "#E6F1EC",
  "--k-orange": "#F78E10",
  "--k-cream": "#F5F4F0",
  "--k-ink": "#1B1B18",
  "--k-muted": "#5C5A52",
  "--k-line": "#DDD9CF",
  "--k-red": "#B42318",
  "--k-red-tint": "#FBEFEC",
} as CSSProperties;

/* ------------------------------ icons ------------------------------ */

function Ico({
  children,
  className = "h-5 w-5",
  sw = 2,
}: {
  children: ReactNode;
  className?: string;
  sw?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const CheckIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className} sw={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </Ico>
);
const CrossIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className} sw={2.5}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Ico>
);
const DashIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className} sw={2.5}>
    <path d="M5 12h14" />
  </Ico>
);
const ArrowRight = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className} sw={2.5}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </Ico>
);
const ArrowDown = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className}>
    <path d="M12 5v14M5 12l7 7 7-7" />
  </Ico>
);
const ChevronDown = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className}>
    <polyline points="6 9 12 15 18 9" />
  </Ico>
);
const MessengerIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.3A8.4 8.4 0 1 1 21 11.5z" />
  </Ico>
);
const SendIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </Ico>
);
const PhoneIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Ico className={className}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </Ico>
);

function BenefitGlyph({ icon }: { icon: BenefitIcon }) {
  switch (icon) {
    case "telegram":
      return (
        <Ico className="h-6 w-6">
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </Ico>
      );
    case "sheet":
      return (
        <Ico className="h-6 w-6">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18" />
        </Ico>
      );
    case "speed":
      return (
        <Ico className="h-6 w-6">
          <path d="M12 14l4-4" />
          <path d="M3.3 17a10 10 0 1 1 17.4 0" />
        </Ico>
      );
    case "payment":
      return (
        <Ico className="h-6 w-6">
          <rect x="1" y="3" width="15" height="13" />
          <path d="M16 8h4l3 3v5h-7z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </Ico>
      );
    case "policy":
      return (
        <Ico className="h-6 w-6">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8" />
        </Ico>
      );
    case "protection":
      return (
        <Ico className="h-6 w-6">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </Ico>
      );
    case "pixel":
    default:
      return (
        <Ico className="h-6 w-6">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
        </Ico>
      );
  }
}

/* ---------------------------- small pieces ---------------------------- */

function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

function SectionHead({
  label,
  title,
  subtitle,
  light = false,
}: {
  label: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <div
        className={`text-base font-bold ${light ? "text-[#9FD3BE]" : "text-[var(--k-green)]"}`}
      >
        {label}
      </div>
      <h2
        className={`mt-2 text-[28px] font-extrabold leading-[1.3] sm:text-[40px] sm:leading-[1.25] ${
          light ? "text-white" : "text-[var(--k-ink)]"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={`mt-4 text-[17px] leading-relaxed sm:text-lg ${light ? "text-[#CFE5DB]" : "text-[var(--k-muted)]"}`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

const BTN_PRIMARY =
  "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-[var(--k-green)] px-7 text-[17px] font-bold text-white transition hover:opacity-95 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--k-green)]";
const BTN_OUTLINE =
  "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border-2 border-[var(--k-green)] bg-white px-6 text-[17px] font-bold text-[var(--k-green)] transition hover:bg-[var(--k-tint)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--k-green)]";

/* ------------------- hero sample (until real screenshot) ------------------- */

function HeroSample({ lang }: { lang: SupportedLocale }) {
  const s = LANDING_COPY.hero.sample;
  return (
    <div className="mx-auto w-full max-w-[420px]" aria-label={s.tag[lang]}>
      <div className="rounded-[28px] border border-[var(--k-line)] bg-white p-5 shadow-[0_24px_60px_rgba(27,27,24,0.12)] sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--k-line)] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--k-green)] text-white">
              <SendIcon className="h-5 w-5" />
            </span>
            <span className="text-base font-bold">{s.botName}</span>
          </div>
          <span className="rounded-full bg-[#FDEBD0] px-3 py-1 text-[13px] font-bold text-[#8A4B00]">
            {s.tag[lang]}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-lg font-extrabold">{s.heading[lang]}</span>
          <span className="text-base font-bold text-[var(--k-muted)]">
            #{s.orderNo}
          </span>
          <span className="rounded-md bg-[var(--k-tint)] px-2 py-0.5 text-[13px] font-extrabold text-[var(--k-green)]">
            {s.status}
          </span>
        </div>

        <dl className="mt-3 space-y-2 text-[15px] leading-snug">
          {s.rows.map((r, i) => (
            <div key={i} className="flex gap-3">
              <dt className="w-[92px] shrink-0 text-[var(--k-muted)]">
                {r.label[lang]}
              </dt>
              <dd className="font-semibold">{r.value[lang]}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-baseline justify-between gap-3 rounded-2xl bg-[var(--k-cream)] px-4 py-3">
          <div className="text-[15px] font-bold">
            {s.totalLabel[lang]}
            <span className="ml-2 text-[13px] font-medium text-[var(--k-muted)]">
              {s.totalNote[lang]}
            </span>
          </div>
          <div className="text-xl font-extrabold">{s.totalValue[lang]}</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {s.buttons.map((b, i) => (
            <span
              key={i}
              className="rounded-xl border border-[var(--k-line)] bg-[var(--k-cream)] px-2 py-2.5 text-center text-[14px] font-semibold"
            >
              {b[lang]}
            </span>
          ))}
        </div>
      </div>

      <div className="relative -mt-3 ml-6 rounded-2xl border border-[var(--k-line)] bg-white p-4 shadow-[0_14px_36px_rgba(27,27,24,0.1)] sm:ml-10">
        <div className="mb-2.5 text-[14px] font-bold text-[var(--k-green)]">
          {s.sheetTitle[lang]}
        </div>
        <div className="grid grid-cols-4 gap-2 text-[13px] font-semibold text-[var(--k-muted)]">
          {s.sheetCols.map((c, i) => (
            <div key={i}>{c[lang]}</div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-2 rounded-lg bg-[var(--k-tint)] px-2 py-2 text-[14px] font-bold">
          {s.sheetRow.map((c, i) => (
            <div key={i} className="truncate">
              {c[lang]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- page ------------------------------- */

export function LandingBody({ contactUrl, demoAlertsUrl }: LandingBodyProps) {
  const lang: SupportedLocale = useSyncExternalStore(
    subscribeLocale,
    () => getSavedLocale("bn"),
    () => "bn",
  );

  const L = LANDING_COPY;
  const contact = contactUrl || "https://m.me/61596152341071";
  const hasAlertsUrl = Boolean(
    demoAlertsUrl && demoAlertsUrl.trim().length > 0,
  );
  const showEarlyOffer = LANDING.earlyOfferRemaining > 0;
  const claimedCount = Math.max(
    0,
    LANDING.earlyOfferTotal - LANDING.earlyOfferRemaining,
  );
  const segments = Array.from(
    { length: LANDING.earlyOfferTotal },
    (_, i) => i < claimedCount,
  );

  const showLighthouse =
    MEASURED.lighthouseMobile !== null && MEASURED.measuredOn !== null;
  const trustItems: { key: string; icon: ReactNode; text: string }[] = [
    {
      key: "sheet",
      icon: (
        <Ico>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18" />
        </Ico>
      ),
      text: L.trust.sheet[lang],
    },
    {
      key: "tg",
      icon: (
        <Ico>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </Ico>
      ),
      text: L.trust.telegram[lang],
    },
  ];
  if (NO_COMMISSION) {
    trustItems.push({
      key: "commission",
      icon: (
        <Ico>
          <line x1="19" y1="5" x2="5" y2="19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </Ico>
      ),
      text: L.trust.commission[lang],
    });
  }
  if (showLighthouse) {
    trustItems.push({
      key: "lh",
      icon: (
        <Ico>
          <path d="M12 14l4-4" />
          <path d="M3.3 17a10 10 0 1 1 17.4 0" />
        </Ico>
      ),
      text: L.trust.lighthouse(
        MEASURED.lighthouseMobile as number,
        MEASURED.measuredOn as string,
        lang,
      ),
    });
  }

  const showProof = Boolean(SHOTS.telegram || SHOTS.sheet || hasAlertsUrl);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      style={THEME}
      className="min-h-screen bg-[var(--k-cream)] text-[var(--k-ink)] outline-none pb-24 lg:pb-0"
    >
      {/* ============================ 1. HERO ============================ */}
      <section aria-labelledby="hero-heading" className="bg-[var(--k-cream)]">
        <Container className="py-10 sm:py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-[var(--k-line)] bg-white px-4 py-2 text-[14px] font-semibold text-[var(--k-muted)] sm:text-[15px]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--k-orange)]" />
                {L.eyebrow[lang]}
              </span>

              <h1
                id="hero-heading"
                className="mt-6 text-[36px] font-extrabold leading-[1.24] tracking-tight sm:text-[52px] lg:text-[58px] lg:leading-[1.2]"
              >
                <span className="block">{L.hero.line1[lang]}</span>
                <span className="block text-[var(--k-green)]">
                  {L.hero.line2[lang]}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[18px] leading-[1.7] text-[var(--k-muted)] sm:text-xl">
                {L.hero.subline[lang]}
              </p>

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                <Link href={DEMO_PATH} className={BTN_PRIMARY}>
                  <span>{L.hero.primaryCta[lang]}</span>
                  <ArrowRight />
                </Link>
                <a
                  href={contact}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={BTN_OUTLINE}
                >
                  <MessengerIcon />
                  <span>{L.hero.secondaryCta[lang]}</span>
                </a>
              </div>

              {RISK_REVERSAL ? (
                <p className="mt-5 flex items-center gap-2.5 text-base font-semibold">
                  <span className="text-[var(--k-green)]">
                    <CheckIcon className="h-5 w-5" />
                  </span>
                  {RISK_REVERSAL[lang]}
                </p>
              ) : null}
            </div>

            {SHOTS.demoPage ? (
              <div className="flex justify-center">
                <div className="w-[270px] rounded-[44px] bg-[var(--k-ink)] p-2.5 shadow-[0_24px_60px_rgba(27,27,24,0.18)] sm:w-[300px]">
                  <Image
                    src={SHOTS.demoPage.src}
                    width={SHOTS.demoPage.width}
                    height={SHOTS.demoPage.height}
                    alt={SHOTS.demoPage.alt[lang]}
                    priority
                    sizes="300px"
                    className="h-auto w-full rounded-[34px]"
                  />
                </div>
              </div>
            ) : (
              <HeroSample lang={lang} />
            )}
          </div>
        </Container>
      </section>

      {/* ========================= 2. TRUST STRIP ========================= */}
      <section
        aria-label="trust"
        className="border-y border-[var(--k-line)] bg-white"
      >
        <Container className="py-6 sm:py-7">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-3.5 text-base font-semibold leading-snug"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--k-tint)] text-[var(--k-green)]">
                  {item.icon}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ======================= 3. BEFORE / AFTER ======================= */}
      <section
        aria-labelledby="compare-heading"
        className="bg-[var(--k-cream)] py-16 sm:py-24"
      >
        <Container>
          <div id="compare-heading">
            <SectionHead
              label={L.compare.label[lang]}
              title={L.compare.title[lang]}
              subtitle={L.compare.subtitle[lang]}
            />
          </div>

          <div className="mt-10 hidden gap-3 px-1 text-lg font-bold md:grid md:grid-cols-2">
            <div className="text-[var(--k-red)]">
              {L.compare.leftTitle[lang]}
            </div>
            <div className="text-[var(--k-green)]">
              {L.compare.rightTitle[lang]}
            </div>
          </div>

          <div className="mt-6 space-y-3 md:mt-3">
            {L.compare.rows.map((row, i) => (
              <div key={i} className="grid gap-1.5 md:grid-cols-2 md:gap-3">
                <div className="flex items-start gap-3.5 rounded-2xl bg-[var(--k-red-tint)] px-5 py-4 text-[16px] leading-relaxed sm:px-6 sm:py-5 sm:text-[17px]">
                  <span className="mt-1 shrink-0 text-[var(--k-red)]">
                    <CrossIcon className="h-5 w-5" />
                  </span>
                  <span>{row.a[lang]}</span>
                </div>
                <div className="flex items-start gap-3.5 rounded-2xl bg-[var(--k-tint)] px-5 py-4 text-[16px] font-semibold leading-relaxed sm:px-6 sm:py-5 sm:text-[17px]">
                  <span className="mt-1 shrink-0 text-[var(--k-green)]">
                    <CheckIcon className="h-5 w-5" />
                  </span>
                  <span>{row.b[lang]}</span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ========================= 4. HOW IT WORKS ========================= */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="scroll-mt-20 bg-white py-16 sm:py-24"
      >
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <div id="how-heading">
                <SectionHead
                  label={L.how.label[lang]}
                  title={L.how.title[lang]}
                />
              </div>
              <ol className="mt-10 space-y-9">
                {L.how.steps.map((step, i) => (
                  <li key={i} className="flex gap-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--k-green)] text-xl font-extrabold text-white">
                      {lang === "bn" ? step.number : step.numberEn}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold leading-snug sm:text-[22px]">
                        {step.title[lang]}
                      </h3>
                      <p className="mt-2 text-[16px] leading-[1.7] text-[var(--k-muted)] sm:text-[17px]">
                        {step.description[lang]}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div
              aria-hidden="true"
              className="rounded-[28px] bg-[var(--k-cream)] p-7 sm:p-9"
            >
              <div className="flex flex-col items-center gap-2.5 text-center">
                <div className="w-full rounded-2xl border border-[var(--k-line)] bg-white px-5 py-4 text-lg font-bold">
                  {L.how.flow.ad[lang]}
                </div>
                <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--k-muted)]">
                  <ArrowDown className="h-5 w-5" />
                  {L.how.flow.click[lang]}
                </div>
                <div className="w-full rounded-2xl bg-[var(--k-green)] px-5 py-5 text-xl font-extrabold text-white">
                  {L.how.flow.page[lang]}
                </div>
                <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--k-muted)]">
                  <ArrowDown className="h-5 w-5" />
                  {L.how.flow.ordered[lang]}
                </div>
                <div className="grid w-full gap-2.5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--k-line)] bg-white px-4 py-4 text-base font-bold leading-snug">
                    {L.how.flow.telegram[lang]}
                  </div>
                  <div className="rounded-2xl border border-[var(--k-line)] bg-white px-4 py-4 text-base font-bold leading-snug">
                    {L.how.flow.sheet[lang]}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ============================ 5. PROOF ============================ */}
      {showProof ? (
        <section
          id="demo"
          aria-labelledby="proof-heading"
          className="scroll-mt-20 bg-[var(--k-green-dark)] py-16 text-white sm:py-24"
        >
          <Container>
            <div id="proof-heading">
              <SectionHead
                light
                label={L.proof.label[lang]}
                title={L.proof.title[lang]}
                subtitle={
                  SHOTS.telegram || SHOTS.sheet
                    ? L.proof.subtitle[lang]
                    : undefined
                }
              />
            </div>

            {SHOTS.telegram || SHOTS.sheet ? (
              <div className="mt-12 grid items-start gap-8 lg:grid-cols-[380px_1fr]">
                {SHOTS.telegram ? (
                  <figure>
                    <Image
                      src={SHOTS.telegram.src}
                      width={SHOTS.telegram.width}
                      height={SHOTS.telegram.height}
                      alt={SHOTS.telegram.alt[lang]}
                      sizes="(min-width: 1024px) 380px, 100vw"
                      className="h-auto w-full rounded-2xl border border-white/20"
                    />
                    <figcaption className="mt-3.5 text-base text-[#CFE5DB]">
                      {L.proof.telegramCaption[lang]}
                    </figcaption>
                  </figure>
                ) : null}
                {SHOTS.sheet ? (
                  <figure className={SHOTS.telegram ? "" : "lg:col-span-2"}>
                    <Image
                      src={SHOTS.sheet.src}
                      width={SHOTS.sheet.width}
                      height={SHOTS.sheet.height}
                      alt={SHOTS.sheet.alt[lang]}
                      sizes="(min-width: 1024px) 700px, 100vw"
                      className="h-auto w-full rounded-2xl border border-white/20"
                    />
                    <figcaption className="mt-3.5 text-base text-[#CFE5DB]">
                      {L.proof.sheetCaption[lang]}
                    </figcaption>
                  </figure>
                ) : null}
              </div>
            ) : null}

            {hasAlertsUrl ? (
              <div className="mt-11 flex flex-col gap-5 sm:flex-row sm:items-center">
                <a
                  href={demoAlertsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-white px-6 text-[17px] font-bold text-[var(--k-green)] transition hover:opacity-95 active:scale-[0.98]"
                >
                  <SendIcon />
                  <span>{L.proof.channelButton[lang]}</span>
                </a>
                <p className="max-w-md text-base leading-relaxed text-[#CFE5DB]">
                  {L.proof.warning[lang]} {L.proof.channelNotice[lang]}
                </p>
              </div>
            ) : null}
          </Container>
        </section>
      ) : null}

      {/* =========================== 6. BENEFITS =========================== */}
      <section
        aria-labelledby="benefits-heading"
        className="bg-[var(--k-cream)] py-16 sm:py-24"
      >
        <Container>
          <div id="benefits-heading">
            <SectionHead
              label={L.benefits.label[lang]}
              title={L.benefits.title[lang]}
            />
          </div>
          <div className="mt-12 grid gap-x-10 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {L.benefits.items.map((b) => (
              <div key={b.id}>
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--k-tint)] text-[var(--k-green)]">
                  <BenefitGlyph icon={b.icon} />
                </span>
                <h3 className="mt-4 text-[20px] font-bold leading-snug sm:text-[21px]">
                  {b.title[lang]}
                </h3>
                <p className="mt-2 text-[16px] leading-[1.7] text-[var(--k-muted)] sm:text-[17px]">
                  {b.description[lang]}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ============================ 7. WHO FOR ============================ */}
      <section
        aria-labelledby="who-heading"
        className="bg-white py-16 sm:py-24"
      >
        <Container>
          <div id="who-heading">
            <SectionHead label={L.who.label[lang]} title={L.who.title[lang]} />
          </div>
          <div className="mt-11 grid gap-5 md:grid-cols-2 md:gap-6">
            <div className="rounded-3xl bg-[var(--k-tint)] p-7 sm:p-9">
              <h3 className="text-xl font-extrabold text-[var(--k-green)] sm:text-[22px]">
                {L.who.forTitle[lang]}
              </h3>
              <ul className="mt-5 space-y-4 text-[17px] leading-relaxed sm:text-lg">
                {L.who.forItems.map((it, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1 shrink-0 text-[var(--k-green)]">
                      <CheckIcon className="h-5 w-5" />
                    </span>
                    {it[lang]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-[var(--k-line)] bg-[var(--k-cream)] p-7 sm:p-9">
              <h3 className="text-xl font-extrabold text-[var(--k-muted)] sm:text-[22px]">
                {L.who.notTitle[lang]}
              </h3>
              <ul className="mt-5 space-y-4 text-[17px] leading-relaxed text-[var(--k-muted)] sm:text-lg">
                {L.who.notItems.map((it, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1 shrink-0">
                      <DashIcon className="h-5 w-5" />
                    </span>
                    {it[lang]}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* ============================ 8. PRICING ============================ */}
      <section
        id="pricing"
        aria-labelledby="pricing-heading"
        className="scroll-mt-20 bg-[var(--k-cream)] py-16 sm:py-24"
      >
        <Container>
          <div id="pricing-heading">
            <SectionHead
              label={L.pricing.label[lang]}
              title={L.pricing.title[lang]}
              subtitle={L.pricing.subtitle[lang]}
            />
          </div>

          <div
            className={`mt-11 grid items-stretch gap-6 ${
              showEarlyOffer ? "lg:grid-cols-[1.15fr_1fr]" : "mx-auto max-w-xl"
            }`}
          >
            {showEarlyOffer ? (
              <div className="flex flex-col justify-between gap-7 rounded-[28px] border-2 border-[var(--k-green)] bg-white p-7 shadow-[0_18px_48px_rgba(10,105,75,0.12)] sm:p-10">
                <div>
                  <span className="inline-flex rounded-full bg-[var(--k-tint)] px-4 py-1.5 text-[15px] font-bold text-[var(--k-green)]">
                    {L.pricing.earlyCard.badge(LANDING.earlyOfferTotal, lang)}
                  </span>
                  <div className="mt-5 flex items-baseline gap-3">
                    <span className="text-[46px] font-extrabold leading-tight sm:text-[60px]">
                      {L.pricing.earlyCard.price(LANDING.earlyPrice, lang)}
                    </span>
                    <span className="text-lg font-bold text-[var(--k-muted)]">
                      {L.pricing.earlyCard.oneTimeLabel[lang]}
                    </span>
                  </div>

                  <div className="mt-5 text-base font-bold text-[var(--k-green)]">
                    {L.pricing.earlyCard.remainingText(
                      LANDING.earlyOfferRemaining,
                      LANDING.earlyOfferTotal,
                      lang,
                    )}
                  </div>
                  <div
                    className="mt-2.5 flex gap-2"
                    role="progressbar"
                    aria-label={L.pricing.earlyCard.remainingText(
                      LANDING.earlyOfferRemaining,
                      LANDING.earlyOfferTotal,
                      lang,
                    )}
                    aria-valuenow={claimedCount}
                    aria-valuemin={0}
                    aria-valuemax={LANDING.earlyOfferTotal}
                  >
                    {segments.map((claimed, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full ${claimed ? "bg-[var(--k-green)]" : "bg-[var(--k-line)]"}`}
                      />
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl bg-[var(--k-cream)] p-5 text-[16px] leading-[1.7]">
                    <p className="font-semibold">
                      {L.pricing.earlyCard.scopeText[lang]}
                    </p>
                    <p className="mt-2.5 border-t border-[var(--k-line)] pt-2.5 text-[15px] text-[var(--k-muted)]">
                      {L.pricing.earlyCard.scopeSubtext[lang]}
                    </p>
                  </div>
                  <p className="mt-4 text-[15px] leading-relaxed text-[var(--k-muted)]">
                    {L.pricing.earlyCard.nextPriceNote[lang]}
                  </p>
                </div>
                <a
                  href={contact}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${BTN_PRIMARY} w-full`}
                >
                  <MessengerIcon />
                  <span>{L.pricing.earlyCard.ctaButton[lang]}</span>
                </a>
              </div>
            ) : null}

            <div
              className={`flex flex-col justify-between gap-7 rounded-[28px] bg-white p-7 sm:p-10 ${
                showEarlyOffer
                  ? "border border-[var(--k-line)]"
                  : "border-2 border-[var(--k-green)] shadow-[0_18px_48px_rgba(10,105,75,0.12)]"
              }`}
            >
              <div>
                <span className="inline-flex rounded-full border border-[var(--k-line)] bg-[var(--k-cream)] px-4 py-1.5 text-[15px] font-bold">
                  {L.pricing.standardCard.badge[lang]}
                </span>
                <h3 className="mt-4 text-[22px] font-bold">
                  {L.pricing.standardCard.title[lang]}
                </h3>
                <div className="mt-3 text-[40px] font-extrabold leading-tight sm:text-[52px]">
                  {L.pricing.standardCard.price(LANDING.standardPrice, lang)}
                </div>
                <div className="mt-1.5 text-base font-semibold text-[var(--k-muted)]">
                  {L.pricing.standardCard.includedNote(
                    LANDING.standardIncludedMonths,
                    lang,
                  )}
                </div>

                <div className="mt-6 border-t border-[var(--k-line)] pt-5 text-[14px] font-bold text-[var(--k-muted)]">
                  {L.pricing.standardCard.featuresTitle[lang]}
                </div>
                <ul className="mt-3.5 space-y-3 text-[16px] leading-snug">
                  {L.pricing.standardCard.features.map((f, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-0.5 shrink-0 text-[var(--k-green)]">
                        <CheckIcon className="h-[18px] w-[18px]" />
                      </span>
                      {f[lang]}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 border-t border-[var(--k-line)] pt-5 text-[14px] font-bold text-[var(--k-muted)]">
                  {L.pricing.standardCard.extraCostsTitle[lang]}
                </div>
                <ul className="mt-2.5 space-y-1.5 text-[15px] leading-relaxed text-[var(--k-muted)]">
                  {L.pricing.standardCard.extraCosts.map((x, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span aria-hidden="true">•</span>
                      {x[lang]}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href={contact}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl px-6 text-[17px] font-bold transition active:scale-[0.98] ${
                  showEarlyOffer
                    ? "border-2 border-[var(--k-line)] bg-white text-[var(--k-ink)] hover:bg-[var(--k-cream)]"
                    : "bg-[var(--k-green)] text-white hover:opacity-95"
                }`}
              >
                <MessengerIcon />
                <span>{L.pricing.standardCard.ctaButton[lang]}</span>
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* ============================ 9. ABOUT ============================ */}
      {FOUNDER ? (
        <section
          aria-labelledby="about-heading"
          className="bg-white py-16 sm:py-24"
        >
          <Container>
            <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:gap-12">
              {FOUNDER.photo ? (
                <Image
                  src={FOUNDER.photo.src}
                  width={FOUNDER.photo.width}
                  height={FOUNDER.photo.height}
                  alt={FOUNDER.name[lang]}
                  className="h-36 w-36 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <div className="max-w-2xl">
                <div className="text-base font-bold text-[var(--k-green)]">
                  {L.about.label[lang]}
                </div>
                <h2
                  id="about-heading"
                  className="mt-2 text-[28px] font-extrabold leading-snug sm:text-[34px]"
                >
                  {FOUNDER.name[lang]}
                </h2>
                <div className="mt-1 text-base font-semibold text-[var(--k-muted)]">
                  {FOUNDER.role[lang]}
                </div>
                <p className="mt-4 text-[17px] leading-[1.75] text-[var(--k-muted)] sm:text-lg">
                  {FOUNDER.note[lang]}
                </p>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* ============================== 10. FAQ ============================== */}
      <section
        aria-labelledby="faq-heading"
        className="bg-[var(--k-cream)] py-16 sm:py-24"
      >
        <Container className="max-w-3xl">
          <div id="faq-heading">
            <SectionHead label={L.faq.label[lang]} title={L.faq.title[lang]} />
          </div>
          <div className="mt-9 border-t border-[var(--k-line)]">
            {L.faq.items.map((item) => (
              <details
                key={item.id}
                className="group border-b border-[var(--k-line)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-bold leading-snug focus-visible:outline-2 focus-visible:outline-[var(--k-green)] sm:text-[19px] [&::-webkit-details-marker]:hidden">
                  <span>{item.question[lang]}</span>
                  <span className="shrink-0 text-[var(--k-muted)] transition-transform duration-200 group-open:rotate-180">
                    <ChevronDown className="h-5 w-5" />
                  </span>
                </summary>
                <p className="pb-6 text-[16px] leading-[1.75] text-[var(--k-muted)] sm:text-[17px]">
                  {item.answer[lang]}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* =========================== 11. FINAL CTA =========================== */}
      <section
        aria-labelledby="final-cta-heading"
        className="bg-[var(--k-green)] text-white"
      >
        <Container className="flex flex-col gap-9 py-16 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2
              id="final-cta-heading"
              className="text-[28px] font-extrabold leading-[1.3] sm:text-[40px]"
            >
              {L.finalCta.title[lang]}
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-[#D6EBE2] sm:text-[19px]">
              {L.finalCta.subtitle[lang]}
            </p>
          </div>
          <div className="flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
            <a
              href={contact}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-xl bg-white px-7 text-[17px] font-extrabold text-[var(--k-green)] transition hover:opacity-95 active:scale-[0.98]"
            >
              <MessengerIcon />
              <span>{L.finalCta.primaryButton[lang]}</span>
            </a>
            {CONTACT_PHONE ? (
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-xl border-2 border-white/70 px-7 text-[17px] font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                <PhoneIcon />
                <span>{L.finalCta.callButton[lang]}</span>
              </a>
            ) : null}
            <Link
              href={DEMO_PATH}
              className="inline-flex min-h-[54px] items-center justify-center rounded-xl border-2 border-white/70 px-7 text-[17px] font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              {L.finalCta.secondaryButton[lang]}
            </Link>
          </div>
        </Container>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer className="bg-[var(--k-ink)] text-white">
        <Container className="flex flex-col gap-4 py-9 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-5 text-[15px] font-semibold text-[#D8D6CE]">
            <Link href={LEGAL_LINKS.privacy} className="hover:underline">
              {L.footer.privacy[lang]}
            </Link>
            <Link href={LEGAL_LINKS.terms} className="hover:underline">
              {L.footer.terms[lang]}
            </Link>
          </div>
          <p className="text-sm text-[#BDBAB0]">{L.footer.copyright[lang]}</p>
        </Container>
      </footer>

      {/* ======================= MOBILE STICKY CTA BAR ======================= */}
      <div
        role="region"
        aria-label="Quick actions"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--k-line)] bg-white/95 px-4 pt-3 shadow-[0_-6px_20px_rgba(27,27,24,0.08)] backdrop-blur-md lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Link
            href={DEMO_PATH}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-[var(--k-line)] bg-white px-3 text-base font-bold active:scale-[0.98]"
          >
            {L.stickyBar.demoButton[lang]}
          </Link>
          <a
            href={contact}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--k-green)] px-3 text-base font-bold text-white active:scale-[0.98]"
          >
            <MessengerIcon className="h-[18px] w-[18px]" />
            <span>{L.stickyBar.messageUs[lang]}</span>
          </a>
        </div>
      </div>
    </main>
  );
}
