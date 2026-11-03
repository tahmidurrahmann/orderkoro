import type { StoredReceipt } from "@/lib/receipt";
import { formatDhakaDateTime } from "@/lib/receipt";
import type { SupportedLocale } from "@/lib/format";
import { formatNumber, formatPrice, localizeDigits } from "@/lib/format";
import { resolveLocalizedText } from "@/lib/i18n";

export interface SaveReceiptImageOptions {
  receipt: StoredReceipt;
  brandName: string;
  lang: SupportedLocale;
  reassurance?: string;
  phone?: string;
  messengerUsername?: string;
}

export interface SaveReceiptImageResult {
  success: boolean;
  method?: "share" | "download" | "cancelled";
  error?: string;
}

/**
 * Lazy-loaded helper that renders a complete receipt card onto an HTML5 canvas
 * and shares or downloads it as a PNG image.
 */
export async function saveReceiptAsImage({
  receipt,
  brandName,
  lang,
  reassurance,
  phone,
  messengerUsername,
}: SaveReceiptImageOptions): Promise<SaveReceiptImageResult> {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return { success: false, error: "Browser environment required" };
    }

    const isBn = lang === "bn";
    const width = 640; // High-resolution card width
    const padding = 36;
    const contentWidth = width - padding * 2;

    // Off-screen canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { success: false, error: "Canvas 2D context not supported" };
    }

    // Prepare text elements
    const title = resolveLocalizedText(receipt.productTitle, lang);
    const color = resolveLocalizedText(receipt.colorName, lang);
    const size = localizeDigits(receipt.sizeName, lang);
    const qty = formatNumber(receipt.quantity, lang);
    const unitPrice = formatPrice(receipt.unitPrice, lang);
    const subtotal = formatPrice(receipt.subtotal, lang);
    const zoneLabel = resolveLocalizedText(receipt.deliveryZoneLabel, lang);
    const delivery =
      receipt.deliveryCharge === 0
        ? isBn
          ? "ফ্রি (৳০)"
          : "Free (৳0)"
        : formatPrice(receipt.deliveryCharge, lang);
    const total = formatPrice(receipt.total, lang);
    const formattedDate = formatDhakaDateTime(receipt.createdAtIso, lang);

    const paymentMethodLabel = (() => {
      switch (receipt.paymentMethod) {
        case "bkash":
          return isBn ? "বিকাশ (bKash)" : "bKash";
        case "nagad":
          return isBn ? "নগদ (Nagad)" : "Nagad";
        case "rocket":
          return isBn ? "রকেট (Rocket)" : "Rocket";
        case "cod":
        default:
          return isBn ? "ক্যাশ অন ডেলিভারি (COD)" : "Cash on Delivery (COD)";
      }
    })();

    const nextStepText =
      receipt.confirmationMode === "call"
        ? isBn
          ? "ডেলিভারির পূর্বে বিক্রেতা আপনাকে ফোন করে অর্ডারটি নিশ্চিত করবেন।"
          : "The seller will call you to confirm your order before dispatch."
        : isBn
        ? "বিক্রেতা সরাসরি আপনার অর্ডারটি প্রসেস করবেন এবং দ্রুত কুরিয়ারে পাঠাবেন।"
        : "The seller will process and dispatch your order directly.";

    const estimateText = isBn
      ? `আনুমানিক ডেলিভারি সময়সীমা: ${formatNumber(receipt.daysMin, lang)} থেকে ${formatNumber(
          receipt.daysMax,
          lang
        )} কার্যদিবস।`
      : `Estimated delivery: ${receipt.daysMin} to ${receipt.daysMax} business days.`;

    // Font stack suitable for cross-platform Bengali and English rendering
    const fontStack =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hind Siliguri", "Noto Sans Bengali", sans-serif';

    // Helper: Wrap text into lines fitting max width
    function wrapText(text: string, maxWidth: number, font: string): string[] {
      ctx!.font = font;
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx!.measureText(testLine).width;
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    }

    // Dynamic height calculation
    let calculatedHeight = 50; // top padding
    calculatedHeight += 40; // Brand header
    calculatedHeight += 30; // Receipt title
    calculatedHeight += 60; // Order number box
    calculatedHeight += 35; // Date & time
    calculatedHeight += 25; // Divider
    calculatedHeight += 30; // Product row
    calculatedHeight += 25; // Variant row
    calculatedHeight += 25; // Qty & unit price
    calculatedHeight += 25; // Subtotal
    calculatedHeight += 25; // Delivery
    calculatedHeight += 35; // Total
    calculatedHeight += 25; // Divider

    if (receipt.deliveryAddress && receipt.deliveryAddress.trim()) {
      const addrLines = wrapText(
        `${isBn ? "ঠিকানা" : "Address"}: ${receipt.deliveryAddress.trim()}`,
        contentWidth,
        `14px ${fontStack}`
      );
      calculatedHeight += addrLines.length * 20 + 10;
    }
    calculatedHeight += 25; // Zone

    calculatedHeight += 25; // Payment method
    if (receipt.paymentMethod && receipt.paymentMethod !== "cod") {
      if (receipt.transactionId) calculatedHeight += 22;
      calculatedHeight += 22; // Status
    }

    // Next steps
    calculatedHeight += 25; // Next steps heading
    const nextStepLines = wrapText(`${nextStepText} ${estimateText}`, contentWidth, `13px ${fontStack}`);
    calculatedHeight += nextStepLines.length * 18 + 15;

    // Policy reassurance
    if (reassurance && reassurance.trim()) {
      calculatedHeight += 20; // heading
      const policyLines = wrapText(reassurance.trim(), contentWidth, `13px ${fontStack}`);
      calculatedHeight += policyLines.length * 18 + 15;
    }

    // Contact
    if (phone || (messengerUsername && !messengerUsername.startsWith("TODO"))) {
      calculatedHeight += 20;
      if (phone) calculatedHeight += 20;
      if (messengerUsername && !messengerUsername.startsWith("TODO")) calculatedHeight += 20;
      calculatedHeight += 10;
    }

    calculatedHeight += 50; // Footer
    calculatedHeight += padding; // bottom padding

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = calculatedHeight;

    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, calculatedHeight);

    // Outer border
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, calculatedHeight - 2);

    let y = padding + 10;

    // Brand Name
    ctx.fillStyle = "#111827";
    ctx.font = `bold 24px ${fontStack}`;
    ctx.textAlign = "center";
    ctx.fillText(brandName, width / 2, y);
    y += 28;

    // Receipt Title Badge
    ctx.fillStyle = "#4B5563";
    ctx.font = `600 13px ${fontStack}`;
    ctx.fillText(isBn ? "অর্ডার রসিদ" : "ORDER RECEIPT", width / 2, y);
    y += 26;

    // Order Number Box
    const boxX = padding;
    const boxWidth = contentWidth;
    const boxHeight = 50;
    ctx.fillStyle = "#F9FAFB";
    ctx.fillRect(boxX, y, boxWidth, boxHeight);
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, y, boxWidth, boxHeight);

    ctx.textAlign = "left";
    ctx.fillStyle = "#6B7280";
    ctx.font = `600 10px ${fontStack}`;
    ctx.fillText((isBn ? "অর্ডার নম্বর" : "ORDER NUMBER").toUpperCase(), boxX + 16, y + 20);

    ctx.fillStyle = "#111827";
    ctx.font = `bold 16px ${fontStack}`;
    ctx.fillText(receipt.orderNumber, boxX + 16, y + 38);

    // Date on the right of order number box
    ctx.textAlign = "right";
    ctx.fillStyle = "#6B7280";
    ctx.font = `500 12px ${fontStack}`;
    ctx.fillText(formattedDate, boxX + boxWidth - 16, y + 32);

    y += boxHeight + 20;

    // Helper: horizontal divider
    function drawDivider(atY: number) {
      ctx!.strokeStyle = "#E5E7EB";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(padding, atY);
      ctx!.lineTo(width - padding, atY);
      ctx!.stroke();
    }

    // Helper: key-value row
    function drawRow(label: string, value: string, isBold: boolean = false, isAccent: boolean = false) {
      ctx!.textAlign = "left";
      ctx!.fillStyle = isBold ? "#111827" : "#4B5563";
      ctx!.font = `${isBold ? "600" : "400"} 13px ${fontStack}`;
      ctx!.fillText(label, padding, y);

      ctx!.textAlign = "right";
      ctx!.fillStyle = isAccent ? "#059669" : isBold ? "#111827" : "#1F2937";
      ctx!.font = `${isBold ? "700" : "500"} 13px ${fontStack}`;
      ctx!.fillText(value, width - padding, y);
      y += 22;
    }

    // Order items section
    drawRow(isBn ? "পণ্য" : "Product", title, true);
    drawRow(isBn ? "ভ্যারিয়েন্ট" : "Variant", `${color} (${size})`);
    drawRow(isBn ? "পরিমাণ ও একক মূল্য" : "Quantity & Unit Price", `${qty} × ${unitPrice}`);
    drawRow(isBn ? "সাবটোটাল" : "Subtotal", subtotal);
    drawRow(isBn ? "ডেলিভারি চার্জ" : "Delivery Charge", delivery);

    y += 4;
    drawDivider(y);
    y += 18;

    // Total row
    ctx.textAlign = "left";
    ctx.fillStyle = "#111827";
    ctx.font = `bold 16px ${fontStack}`;
    ctx.fillText(isBn ? "সর্বমোট প্রদেয়" : "Total Payable", padding, y);

    ctx.textAlign = "right";
    ctx.fillStyle = "#059669";
    ctx.font = `bold 18px ${fontStack}`;
    ctx.fillText(total, width - padding, y);
    y += 24;

    drawDivider(y);
    y += 18;

    // Delivery & Payment section
    if (receipt.deliveryAddress && receipt.deliveryAddress.trim()) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#6B7280";
      ctx.font = `600 11px ${fontStack}`;
      ctx.fillText((isBn ? "ডেলিভারি ঠিকানা" : "DELIVERY ADDRESS").toUpperCase(), padding, y);
      y += 16;

      ctx.fillStyle = "#1F2937";
      ctx.font = `400 13px ${fontStack}`;
      const addrLines = wrapText(receipt.deliveryAddress.trim(), contentWidth, `13px ${fontStack}`);
      for (const line of addrLines) {
        ctx.fillText(line, padding, y);
        y += 18;
      }
      y += 4;
    }

    drawRow(isBn ? "ডেলিভারি এলাকা" : "Delivery Zone", zoneLabel);
    drawRow(isBn ? "পেমেন্ট মাধ্যম" : "Payment Method", paymentMethodLabel, true);

    if (receipt.paymentMethod && receipt.paymentMethod !== "cod") {
      if (receipt.transactionId) {
        drawRow(isBn ? "ট্রানজেকশন আইডি" : "Transaction ID", receipt.transactionId);
      }
      drawRow(
        isBn ? "পেমেন্ট স্ট্যাটাস" : "Payment Status",
        isBn ? "যাচাই প্রক্রিয়াধীন" : "Pending Verification",
        false,
        true
      );
    }

    y += 6;
    drawDivider(y);
    y += 18;

    // Next steps
    ctx.textAlign = "left";
    ctx.fillStyle = "#111827";
    ctx.font = `bold 13px ${fontStack}`;
    ctx.fillText(isBn ? "পরবর্তী ধাপ" : "What Happens Next", padding, y);
    y += 16;

    ctx.fillStyle = "#4B5563";
    ctx.font = `400 12px ${fontStack}`;
    for (const line of nextStepLines) {
      ctx.fillText(line, padding, y);
      y += 16;
    }

    // Policy reassurance
    if (reassurance && reassurance.trim()) {
      y += 8;
      ctx.fillStyle = "#111827";
      ctx.font = `bold 13px ${fontStack}`;
      ctx.fillText(isBn ? "পলিসি ও নিশ্চয়তা" : "Policy & Guarantee", padding, y);
      y += 16;

      ctx.fillStyle = "#4B5563";
      ctx.font = `400 12px ${fontStack}`;
      const policyLines = wrapText(reassurance.trim(), contentWidth, `12px ${fontStack}`);
      for (const line of policyLines) {
        ctx.fillText(line, padding, y);
        y += 16;
      }
    }

    // Contact info
    if (phone || (messengerUsername && !messengerUsername.startsWith("TODO"))) {
      y += 8;
      ctx.fillStyle = "#111827";
      ctx.font = `bold 13px ${fontStack}`;
      ctx.fillText(isBn ? "সহায়তা ও যোগাযোগ" : "Customer Support", padding, y);
      y += 16;

      if (phone) {
        ctx.fillStyle = "#4B5563";
        ctx.font = `400 12px ${fontStack}`;
        ctx.fillText(`${isBn ? "ফোন" : "Phone"}: ${phone}`, padding, y);
        y += 16;
      }
      if (messengerUsername && !messengerUsername.startsWith("TODO")) {
        ctx.fillStyle = "#4B5563";
        ctx.font = `400 12px ${fontStack}`;
        ctx.fillText(`Messenger: m.me/${messengerUsername}`, padding, y);
        y += 16;
      }
    }

    // Bottom Footer
    y += 16;
    drawDivider(y);
    y += 20;

    ctx.textAlign = "center";
    ctx.fillStyle = "#9CA3AF";
    ctx.font = `500 11px ${fontStack}`;
    ctx.fillText("OrderKoro - Smart Single Product Checkout", width / 2, y);

    // Convert canvas to Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });

    if (!blob) {
      return { success: false, error: "Failed to generate image blob" };
    }

    const fileName = `receipt-${receipt.orderNumber}.png`;

    // Try Web Share API with file first (supported on mobile Chrome/Safari)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${brandName} - ${receipt.orderNumber}`,
            text: isBn ? `${brandName} অর্ডার রসিদ` : `${brandName} Order Receipt`,
          });
          return { success: true, method: "share" };
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return { success: true, method: "cancelled" };
        }
        // If sharing failed, fall through to download
      }
    }

    // Fallback: browser download via object URL
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      return { success: true, method: "download" };
    } catch (downloadErr: unknown) {
      return {
        success: false,
        error: downloadErr instanceof Error ? downloadErr.message : "Download failed",
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error during image creation",
    };
  }
}
