"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bn">
      <body className="min-h-screen flex items-center justify-center bg-neutral-50 p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 text-2xl font-bold">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-neutral-900">
            একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            পেজটি প্রস্তুত করতে সমস্যা হচ্ছে। অনুগ্রহ করে নিচে ক্লিক করে পুনরায় চেষ্টা করুন।
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-neutral-800 cursor-pointer"
            >
              পুনরায় চেষ্টা করুন (Try Again)
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
