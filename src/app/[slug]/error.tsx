"use client";

import { useParams } from "next/navigation";
import React from "react";
import { getPublicContactBySlug } from "@/lib/public-contacts";

export default function SlugErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const contact = getPublicContactBySlug(slug);

  const brandName =
    typeof contact?.brandName === "string"
      ? contact.brandName
      : contact?.brandName?.bn || "আমাদের স্টোর";

  return (
    <main className="mx-auto flex min-h-screen-safe max-w-lg flex-col items-center justify-center bg-[var(--bg-canvas,#F8FAFC)] px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-2xl font-bold">
        ⚠️
      </div>
      <h1 className="mt-5 text-xl font-bold text-neutral-900">
        পেজটি লোড হতে সমস্যা হয়েছে
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        We encountered an error loading this product page.
      </p>

      <p className="mt-3 max-w-sm text-sm text-neutral-700 leading-relaxed">
        অর্ডার বা পণ্য সম্পর্কে যেকোনো তথ্যের জন্য সরাসরি আমাদের সাথে মেসেঞ্জারে বা ফোনে যোগাযোগ করতে পারেন।
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-neutral-800 cursor-pointer"
        >
          আবার লোড করুন (Retry)
        </button>

        {contact?.messengerPageUsername && (
          <a
            href={`https://m.me/${encodeURIComponent(contact.messengerPageUsername)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#0073e6] cursor-pointer"
          >
            <span>মেসেঞ্জারে চ্যাট (Messenger)</span>
          </a>
        )}

        {contact?.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-800 hover:bg-neutral-50 cursor-pointer"
          >
            <span>কল করুন ({contact.phone})</span>
          </a>
        )}
      </div>

      <div className="mt-8 text-xs text-neutral-400">
        © {new Date().getFullYear()} {brandName}
      </div>
    </main>
  );
}
