"use client";

import React, { useState } from "react";
import type { CopyDictionary } from "@/lib/i18n";

export interface ShareRowProps {
  shareUrl: string;
  canNativeShare: boolean;
  productTitleText: string;
  copy: CopyDictionary;
}

export default function ShareRow({
  shareUrl,
  canNativeShare,
  productTitleText,
  copy,
}: ShareRowProps) {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  function handleCopyLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: productTitleText,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--text-primary)] cursor-pointer transition"
      >
        <span>{copiedLink ? `✓ ${copy.shareCopiedFeedback}` : `🔗 ${copy.shareCopyLink}`}</span>
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--text-primary)] cursor-pointer transition"
        >
          <span>📤 {copy.shareNative}</span>
        </button>
      )}

      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${productTitleText}: ${shareUrl}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        suppressHydrationWarning
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition"
      >
        <span>💬 WhatsApp</span>
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        suppressHydrationWarning
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 cursor-pointer transition"
      >
        <span>Facebook</span>
      </a>
    </div>
  );
}
