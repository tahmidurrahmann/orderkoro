"use client";

// src/components/OrderAlertDemo.tsx
// A code-driven "video": customer orders -> Telegram alert -> seller taps Confirm -> Google Sheet row.
// Pure CSS keyframes (see order-alert-demo.css). Nothing in it is clickable. No video file.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SupportedLocale } from "@/lib/format";
import { LANDING_COPY } from "@/lib/landing-copy";
import "./order-alert-demo.css";

export interface OrderAlertDemoProps {
  lang: SupportedLocale;
  /** Freeze the timeline at this second (used for testing and screenshots). */
  timeFreeze?: number;
  className?: string;
}

const SHEET_GRID = { gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1.5fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(0,1.1fr)" } as const;

function SendIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function Cursor({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`oad-a ${className} pointer-events-none absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0A694B] bg-[#0A694B]/25`}
    />
  );
}

/** The Telegram alert. animated=false renders the finished (confirmed) state for reduced motion. */
function AlertCard({ lang, animated }: { lang: SupportedLocale; animated: boolean }) {
  const A = LANDING_COPY.hero.anim.alert;
  const a = (name: string) => (animated ? `oad-a ${name}` : "");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A694B] text-white">
          <SendIcon className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[15px] font-bold">{A.botName}</span>
        <span className="ml-auto text-[13px] text-[#5C5A52]">{A.now[lang]}</span>
      </div>

      <div className={`rounded-2xl rounded-tl-md border border-[#DDD9CF] bg-white p-3.5 shadow-[0_8px_24px_rgba(27,27,24,0.08)] ${a("oad-bubble")}`}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-[16px] font-extrabold">{A.heading[lang]}</span>
          <span className="text-[14px] font-bold text-[#5C5A52]">#{A.orderNo}</span>
          <span className="relative inline-block h-[22px] w-[104px]">
            <span className={`absolute left-0 top-0 rounded-md bg-[#FDEBD0] px-2 py-0.5 text-[12px] font-extrabold text-[#8A4B00] ${animated ? "oad-a oad-status-new" : "opacity-0"}`}>
              {A.statusNew}
            </span>
            <span className={`absolute left-0 top-0 rounded-md bg-[#E6F1EC] px-2 py-0.5 text-[12px] font-extrabold text-[#0A694B] ${animated ? "oad-a oad-status-done" : ""}`}>
              {A.statusDone}
            </span>
          </span>
        </div>

        <dl className="mt-2.5 space-y-1 text-[14px] leading-snug">
          {A.rows.map((r, i) => (
            <div key={i} className="flex gap-2.5">
              <dt className="w-[84px] shrink-0 text-[#5C5A52]">{r.label[lang]}</dt>
              <dd className="font-semibold">{r.value[lang]}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-2.5 flex items-baseline justify-between rounded-xl bg-[#F5F4F0] px-3 py-2">
          <span className="text-[14px] font-bold">{A.totalLabel[lang]}</span>
          <span className="text-[17px] font-extrabold">{A.totalValue[lang]}</span>
        </div>

        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }} aria-hidden="true">
          <span className={`min-w-0 truncate rounded-lg border border-[#DDD9CF] bg-[#F5F4F0] px-1 py-2 text-center text-[12px] font-semibold ${animated ? "oad-a oad-btn-confirm" : "!border-[#0A694B] !bg-[#0A694B] !text-white"}`}>
            {A.buttons[0][lang]}
          </span>
          <span className={`min-w-0 truncate rounded-lg border border-[#DDD9CF] bg-[#F5F4F0] px-1 py-2 text-center text-[12px] font-semibold ${animated ? "oad-a oad-btn-other" : "opacity-40"}`}>
            {A.buttons[1][lang]}
          </span>
          <span className={`min-w-0 truncate rounded-lg border border-[#DDD9CF] bg-[#F5F4F0] px-1 py-2 text-center text-[12px] font-semibold ${animated ? "oad-a oad-btn-other" : "opacity-40"}`}>
            {A.buttons[2][lang]}
          </span>
        </div>
      </div>
    </div>
  );
}

export function OrderAlertDemo({ lang, timeFreeze, className = "" }: OrderAlertDemoProps) {
  const D = LANDING_COPY.hero.anim;
  const rootRef = useRef<HTMLDivElement>(null);
  const [manualPause, setManualPause] = useState(false);
  const [offScreen, setOffScreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => e && setOffScreen(!e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const frozen = typeof timeFreeze === "number";
  const playing = !frozen && !manualPause && !offScreen && !tabHidden;
  const style = (frozen ? { "--oad-delay": `-${timeFreeze}s` } : {}) as CSSProperties;

  const P = D.page;
  const S = D.sheet;

  return (
    <div
      ref={rootRef}
      className={`oad relative mx-auto w-full max-w-[440px] select-none ${className}`}
      data-playing={playing ? "true" : "false"}
      style={style}
      role="img"
      aria-label={D.ariaLabel[lang]}
    >
      <div className="overflow-hidden rounded-[28px] border border-[#DDD9CF] bg-white shadow-[0_24px_60px_rgba(27,27,24,0.12)]">
        {/* header: sample label + step captions + pause */}
        <div className="flex items-center justify-between gap-3 border-b border-[#DDD9CF] bg-[#F5F4F0] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 rounded-full bg-[#FDEBD0] px-2.5 py-0.5 text-[12px] font-bold text-[#8A4B00]">
              {D.badge[lang]}
            </span>
            <div className="oad-motion flex items-center gap-1.5" aria-hidden="true">
              <span className="oad-a oad-dot1 h-2 rounded-full" />
              <span className="oad-a oad-dot2 h-2 rounded-full" />
              <span className="oad-a oad-dot3 h-2 rounded-full" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setManualPause((p) => !p)}
            aria-label={playing ? D.pause[lang] : D.play[lang]}
            className="oad-pause flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#5C5A52] hover:bg-white active:scale-95"
          >
            <span className="text-sm font-bold" aria-hidden="true">{playing ? "⏸" : "▶"}</span>
          </button>
        </div>

        {/* captions */}
        <div className="relative h-[52px] border-b border-[#DDD9CF] px-4">
          <div className="oad-motion" aria-hidden="true">
            {D.steps.map((s, i) => (
              <p key={i} className={`oad-a oad-s${i + 1} oad-scene flex items-center gap-2.5 px-4 text-[15px] font-bold leading-snug`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A694B] text-[13px] font-extrabold text-white">
                  {lang === "bn" ? s.n : s.nEn}
                </span>
                <span>{s.text[lang]}</span>
              </p>
            ))}
          </div>
          <p className="oad-static flex h-full items-center text-[15px] font-bold" aria-hidden="true">
            {D.steps[1].text[lang]}
          </p>
        </div>

        {/* stage */}
        <div className="relative h-[452px] bg-white">
          <div className="oad-motion absolute inset-0" aria-hidden="true">
            {/* ---------- scene 1: customer order page ---------- */}
            <div className="oad-a oad-s1 oad-scene p-4">
              <div className="flex items-center gap-3">
                <span className="h-14 w-14 shrink-0 rounded-xl bg-[#1E3A5F]" />
                <div className="min-w-0">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-[#B45309]">{P.brand[lang]}</div>
                  <div className="text-[16px] font-extrabold leading-snug">{P.product[lang]}</div>
                  <div className="text-[15px] font-bold text-[#0A694B]">{P.price[lang]}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="mr-1 text-[13px] font-semibold text-[#5C5A52]">{P.colorLabel[lang]}</span>
                <span className="h-6 w-6 rounded-full bg-[#1E3A5F] ring-2 ring-[#0A694B] ring-offset-2" />
                <span className="h-6 w-6 rounded-full bg-[#3B523E] opacity-60" />
                <span className="h-6 w-6 rounded-full bg-[#7C3E29] opacity-60" />
              </div>

              <div className="mt-3">
                <div className="mb-1.5 text-[13px] font-semibold text-[#5C5A52]">{P.sizeLabel[lang]}</div>
                <div className="flex gap-2">
                  {P.sizes.map((sz, i) => (
                    <span
                      key={sz}
                      className={`rounded-lg border px-3 py-1.5 text-[13px] font-bold ${
                        i === 2 ? "oad-a oad-size-pick border-[#DDD9CF] bg-[#F5F4F0]" : "border-[#DDD9CF] bg-[#F5F4F0]"
                      }`}
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                <div>
                  <div className="mb-1 text-[13px] font-semibold text-[#5C5A52]">{P.nameLabel[lang]}</div>
                  <div className="flex h-10 items-center rounded-xl border border-[#DDD9CF] px-3 text-[15px] font-semibold">
                    <span className="oad-a oad-type-name inline-block whitespace-nowrap">{P.nameValue[lang]}</span>
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[13px] font-semibold text-[#5C5A52]">{P.phoneLabel[lang]}</div>
                  <div className="flex h-10 items-center rounded-xl border border-[#DDD9CF] px-3 text-[15px] font-semibold">
                    <span className="oad-a oad-type-phone inline-block whitespace-nowrap">{P.phoneValue}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 text-[13px] font-medium text-[#5C5A52]">{P.delivery[lang]}</div>

              <div className="mt-2.5 flex items-center justify-between text-[15px] font-bold">
                <span>{P.totalLabel[lang]}</span>
                <span>{P.totalValue[lang]}</span>
              </div>
              <div className="oad-a oad-btn-tap mt-2.5 flex min-h-[48px] items-center justify-center rounded-xl bg-[#0A694B] text-[16px] font-bold text-white">
                {P.cta[lang]}
              </div>
              <Cursor className="oad-cur1" />
            </div>

            {/* ---------- scene 2: telegram alert ---------- */}
            <div className="oad-a oad-s2 oad-scene p-4">
              <AlertCard lang={lang} animated />
              <p className="oad-a oad-call-note mt-2.5 text-center text-[13px] font-semibold text-[#5C5A52]">
                {D.alert.callNote[lang]}
              </p>
              <Cursor className="oad-cur2" />
            </div>

            {/* ---------- scene 3: google sheet ---------- */}
            <div className="oad-a oad-s3 oad-scene p-4">
              <div className="text-[15px] font-bold text-[#0A694B]">{S.title[lang]}</div>
              <div className="mt-3 overflow-hidden rounded-xl border border-[#DDD9CF] text-[13px]">
                <div className="grid gap-1 bg-[#F5F4F0] px-2.5 py-2 font-bold text-[#5C5A52]" style={SHEET_GRID}>
                  {S.cols.map((c, i) => (
                    <div key={i} className="min-w-0 truncate">{c[lang]}</div>
                  ))}
                </div>
                <div className="grid gap-1 border-t border-[#DDD9CF] px-2.5 py-2.5 font-medium text-[#5C5A52]" style={SHEET_GRID}>
                  {S.prevRow.map((c, i) => (
                    <div key={i} className="min-w-0 truncate">{c[lang]}</div>
                  ))}
                </div>
                <div className="oad-a oad-row-new grid gap-1 border-t border-[#DDD9CF] px-2.5 py-2.5 font-bold" style={SHEET_GRID}>
                  {S.newRow.map((c, i) => (
                    <div key={i} className="min-w-0 truncate">{c[lang]}</div>
                  ))}
                </div>
              </div>
              <div className="oad-a oad-saved mt-4 flex items-center gap-2 text-[15px] font-bold text-[#0A694B]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A694B] text-white">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                {S.saved[lang]}
              </div>
            </div>
          </div>

          {/* reduced-motion: one finished frame */}
          <div className="oad-static p-4" aria-hidden="true">
            <AlertCard lang={lang} animated={false} />
          </div>
        </div>
      </div>
    </div>
  );
}