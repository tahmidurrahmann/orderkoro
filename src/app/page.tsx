import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OrderKoro: Single-Product Order Pages for Facebook Sellers",
  description:
    "Ultra-fast single-product Cash on Delivery, bKash, Nagad, and Rocket landing pages for Bangladeshi Facebook & Instagram sellers. Instant order alerts, automated Google Sheets sync, and zero friction checkout.",
};

export default function HomePage() {
  const contactUrl =
    process.env.NEXT_PUBLIC_CONTACT_URL || "https://m.me/orderkoro.bd";
  const pricingLine =
    process.env.NEXT_PUBLIC_PRICING_LINE ||
    "শুরু করুন মাত্র ৳১,৯৯৯ থেকে (Setup starts at only ৳1,999)";

  return (
    <main className="min-h-screen-safe flex flex-col justify-between bg-[var(--bg-canvas)] px-4 py-8 sm:py-12 text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-xl space-y-6">
        {/* Top Badge */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>OrderKoro BD</span>
            <span>•</span>
            <span>Facebook & F-Commerce Sellers</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
            বাংলাদেশি ফেসবুক সেলারদের জন্য উচ্চ-কনভার্সন সিঙ্গেল-প্রোডাক্ট
            অর্ডার পেজ
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-[var(--text-muted)]">
            High-Converting Cash on Delivery, bKash, Nagad & Rocket
            Single-Product Order Pages
          </p>
        </div>

        {/* Value Proposition Card */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>🚀</span>
            <span>
              সেলস বাড়ানোর আধুনিক সমাধান (Built for Maximum Conversions)
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
            <div className="rounded-xl bg-[var(--bg-subtle)] p-3.5 border border-[var(--border-subtle)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">
                ⚡ ৩ সেকেন্ডে দ্রুত লোড
              </span>
              দুর্বল মোবাইল নেটওয়ার্কেও কোনো লোডিং ড্রপ-অফ ছাড়াই ইনস্ট্যান্ট পেজ
              ওপেন হয়।
            </div>

            <div className="rounded-xl bg-[var(--bg-subtle)] p-3.5 border border-[var(--border-subtle)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">
                📦 স্মার্ট ক্যাশ অন ডেলিভারি
              </span>
              ৬৪ জেলার অটোমেটিক ডেলিভারি চার্জ হিসাব এবং সহজ ক্যাশ অন ডেলিভারি
              (Cash on Delivery) ফর্ম।
            </div>

            <div className="rounded-xl bg-[var(--bg-subtle)] p-3.5 border border-[var(--border-subtle)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">
                💳 বিকাশ, নগদ ও রকেট
              </span>
              ক্যাশ অন ডেলিভারির পাশাপাশি বিকাশ (bKash), নগদ (Nagad) ও রকেট
              (Rocket) পেমেন্ট সুবিধা।
            </div>

            <div className="rounded-xl bg-[var(--bg-subtle)] p-3.5 border border-[var(--border-subtle)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">
                📲 টেলিগ্রাম ইনস্ট্যান্ট অ্যালার্ট
              </span>
              প্রতিটি অর্ডারে সাথে সাথে টেলিগ্রামে কনফার্ম ও ক্যানসেল বাটনের
              সুবিধা।
            </div>

            <div className="sm:col-span-2 rounded-xl bg-[var(--bg-subtle)] p-3.5 border border-[var(--border-subtle)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">
                📊 গুগল শিট অটো-সিঙ্ক
              </span>
              সব কাস্টমার ও অর্ডার ডাটা রিয়েল-টাইমে নিজস্ব গুগল শিটে
              স্বয়ংক্রিয়ভাবে রেকর্ড হয়।
            </div>
          </div>

          {/* Pricing Highlight */}
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-center">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-800 block mb-0.5">
              সাশ্রয়ী প্যাকেজ (Pricing)
            </span>
            <span className="text-sm sm:text-base font-extrabold text-amber-950">
              {pricingLine}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {/* Live Demo Link */}
            <Link
              href="/demo-brand"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[var(--brand-primary-hover)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>লাইভ ডেমো দেখুন (View Live Demo)</span>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            {/* Messenger Contact Button */}
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-bold text-[var(--brand-primary)] hover:bg-[var(--bg-subtle)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.455 5.518 3.735 7.21V22l3.39-1.86c.915.253 1.884.39 2.875.39 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.448l-2.556-2.727-4.99 2.727 5.485-5.823 2.62 2.727 4.927-2.727-5.486 5.823z" />
              </svg>
              <span>মেসেঞ্জারে নক দিন (Contact)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-[var(--text-muted)] pt-4">
        OrderKoro: E-Commerce Storefront Platform for Bangladeshi Facebook
        Sellers
      </footer>
    </main>
  );
}
