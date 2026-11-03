import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildReceiptPlainText,
  clearReceiptFromStorage,
  formatDhakaDateTime,
  isReceiptExpired,
  readReceiptFromStorage,
  RECEIPT_EXPIRY_MS,
  saveReceiptToStorage,
  type StoredReceipt,
} from "@/lib/receipt";

describe("Receipt persistence and expiry logic", () => {
  const now = 1700000000000;

  it("identifies expired timestamps accurately", () => {
    // Missing or invalid timestamps are treated as expired
    expect(isReceiptExpired(undefined, now)).toBe(true);
    expect(isReceiptExpired(0, now)).toBe(true);
    expect(isReceiptExpired(-100, now)).toBe(true);
    expect(isReceiptExpired(NaN, now)).toBe(true);

    // Within 30 days
    const twentyNineDaysAgo = now - 29 * 24 * 60 * 60 * 1000;
    expect(isReceiptExpired(twentyNineDaysAgo, now)).toBe(false);

    const oneMinuteAgo = now - 60 * 1000;
    expect(isReceiptExpired(oneMinuteAgo, now)).toBe(false);

    // Exactly 30 days
    const exactlyThirtyDays = now - RECEIPT_EXPIRY_MS;
    expect(isReceiptExpired(exactlyThirtyDays, now)).toBe(false);

    // Expired past 30 days
    const thirtyDaysAndOneMs = now - (RECEIPT_EXPIRY_MS + 1);
    expect(isReceiptExpired(thirtyDaysAndOneMs, now)).toBe(true);

    const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000;
    expect(isReceiptExpired(fortyDaysAgo, now)).toBe(true);
  });

  describe("Browser storage interaction with fallback and expiry", () => {
    let mockSession: Record<string, string> = {};
    let mockLocal: Record<string, string> = {};

    beforeEach(() => {
      mockSession = {};
      mockLocal = {};

      vi.stubGlobal("window", {
        sessionStorage: {
          getItem: (k: string) => mockSession[k] || null,
          setItem: (k: string, v: string) => {
            mockSession[k] = v;
          },
          removeItem: (k: string) => {
            delete mockSession[k];
          },
        },
        localStorage: {
          getItem: (k: string) => mockLocal[k] || null,
          setItem: (k: string, v: string) => {
            mockLocal[k] = v;
          },
          removeItem: (k: string) => {
            delete mockLocal[k];
          },
        },
      });
    });

    const sampleReceipt: StoredReceipt = {
      orderNumber: "ORD-9912",
      slug: "demo-brand",
      productTitle: { bn: "প্রিমিয়াম পাঞ্জাবি", en: "Premium Panjabi" },
      colorName: { bn: "সাদা", en: "White" },
      sizeName: "42",
      quantity: 1,
      unitPrice: 1250,
      subtotal: 1250,
      deliveryCharge: 60,
      deliveryZoneLabel: { bn: "ঢাকা সিটি", en: "Dhaka City" },
      daysMin: 2,
      daysMax: 3,
      total: 1310,
      deliveryAddress: "House 12, Road 4, Dhanmondi, Dhaka",
      confirmationMode: "call",
      language: "bn",
      paymentMethod: "cod",
      createdAtIso: "2026-11-03T04:00:00.000Z",
    };

    it("saves to both sessionStorage and localStorage", () => {
      saveReceiptToStorage(sampleReceipt);

      const sessionRaw = mockSession["orderpage_receipt_demo-brand"];
      const localRaw = mockLocal["orderpage_receipt_demo-brand"];
      expect(sessionRaw).toBeDefined();
      expect(localRaw).toBeDefined();

      const parsedLocal = JSON.parse(localRaw!);
      expect(parsedLocal.orderNumber).toBe("ORD-9912");
      expect(parsedLocal.savedAt).toBeTypeOf("number");
    });

    it("reads from sessionStorage when active", () => {
      saveReceiptToStorage(sampleReceipt);
      const read = readReceiptFromStorage("demo-brand");
      expect(read).not.toBeNull();
      expect(read?.orderNumber).toBe("ORD-9912");
      expect(read?.deliveryAddress).toBe("House 12, Road 4, Dhanmondi, Dhaka");
    });

    it("falls back to localStorage when sessionStorage is cleared", () => {
      saveReceiptToStorage(sampleReceipt);
      // Simulate tab close / session clear
      mockSession = {};

      const read = readReceiptFromStorage("demo-brand");
      expect(read).not.toBeNull();
      expect(read?.orderNumber).toBe("ORD-9912");
    });

    it("cleans up and returns null if localStorage entry is older than 30 days", () => {
      const expiredReceipt = {
        ...sampleReceipt,
        savedAt: now - (RECEIPT_EXPIRY_MS + 100000),
      };
      mockLocal["orderpage_receipt_demo-brand"] = JSON.stringify(expiredReceipt);
      mockSession = {};

      const read = readReceiptFromStorage("demo-brand", now);
      expect(read).toBeNull();
      // Verifies cleanup from storage
      expect(mockLocal["orderpage_receipt_demo-brand"]).toBeUndefined();
    });

    it("clears both storages when requested", () => {
      saveReceiptToStorage(sampleReceipt);
      clearReceiptFromStorage("demo-brand");

      expect(mockSession["orderpage_receipt_demo-brand"]).toBeUndefined();
      expect(mockLocal["orderpage_receipt_demo-brand"]).toBeUndefined();
    });
  });
});

describe("Dhaka timezone date formatter", () => {
  it("formats ISO timestamps in Asia/Dhaka time without throwing", () => {
    const iso = "2026-11-03T06:30:00.000Z"; // 12:30 PM Dhaka (UTC+6)
    const formattedBn = formatDhakaDateTime(iso, "bn");
    const formattedEn = formatDhakaDateTime(iso, "en");

    expect(formattedBn).toBeTruthy();
    expect(formattedEn).toBeTruthy();
    expect(formattedEn).toMatch(/2026/);
    expect(formattedEn).toMatch(/12:30/);

    // Invalid ISO gracefully returns input without throwing
    expect(formatDhakaDateTime("invalid-date", "en")).toBe("invalid-date");
  });
});

describe("Plain-text receipt summary builder", () => {
  const codReceipt: StoredReceipt = {
    orderNumber: "OK-48201",
    slug: "demo-brand",
    productTitle: { bn: "প্রিমিয়াম সুতি পাঞ্জাবি", en: "Premium Cotton Panjabi" },
    colorName: { bn: "রয়েল ব্লু", en: "Royal Blue" },
    sizeName: "42",
    quantity: 2,
    unitPrice: 1500,
    subtotal: 3000,
    deliveryCharge: 60,
    deliveryZoneLabel: { bn: "ঢাকা সিটি", en: "Dhaka City" },
    daysMin: 2,
    daysMax: 3,
    total: 3060,
    deliveryAddress: "Flat 4B, House 10, Road 7, Banani, Dhaka",
    confirmationMode: "call",
    language: "bn",
    paymentMethod: "cod",
    createdAtIso: "2026-11-03T06:00:00.000Z",
  };

  const mobileReceipt: StoredReceipt = {
    orderNumber: "OK-77312",
    slug: "demo-brand",
    productTitle: { bn: "প্রিমিয়াম সুতি পাঞ্জাবি", en: "Premium Cotton Panjabi" },
    colorName: { bn: "কালো", en: "Black" },
    sizeName: "40",
    quantity: 1,
    unitPrice: 1500,
    subtotal: 1500,
    deliveryCharge: 120,
    deliveryZoneLabel: { bn: "ঢাকার বাইরে", en: "Outside Dhaka" },
    daysMin: 3,
    daysMax: 5,
    total: 1620,
    deliveryAddress: "GEC Circle, Chittagong",
    confirmationMode: "tap",
    language: "en",
    paymentMethod: "bkash",
    transactionId: "BK9X77A12",
    createdAtIso: "2026-11-03T07:15:00.000Z",
  };

  it("builds a clean Bangla plain-text summary for COD orders", () => {
    const text = buildReceiptPlainText({
      receipt: codReceipt,
      brandName: "Rumon Atelier",
      lang: "bn",
      reassurance: "পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধ করার সুবিধা।",
      phone: "01900000000",
      messengerUsername: "rumonatelier",
    });

    expect(text).toContain("Rumon Atelier - অর্ডার রসিদ");
    expect(text).toContain("অর্ডার নম্বর: OK-48201");
    expect(text).toContain("পণ্য: প্রিমিয়াম সুতি পাঞ্জাবি");
    expect(text).toContain("ভ্যারিয়েন্ট: রয়েল ব্লু (সাইজ: ৪২)");
    expect(text).toContain("পরিমাণ: ২");
    expect(text).toContain("একক মূল্য: ৳১,৫০০");
    expect(text).toContain("সাবটোটাল: ৳৩,০০০");
    expect(text).toContain("ডেলিভারি চার্জ: ৳৬০ (ঢাকা সিটি)");
    expect(text).toContain("সর্বমোট প্রদেয়: ৳৩,০৬০");
    expect(text).toContain("ডেলিভারি ঠিকানা: Flat 4B, House 10, Road 7, Banani, Dhaka");
    expect(text).toContain("পেমেন্ট মাধ্যম: ক্যাশ অন ডেলিভারি (COD)");
    expect(text).toContain("ফোন করে অর্ডারটি নিশ্চিত করবেন");
    expect(text).toContain("01900000000");
    expect(text).toContain("m.me/rumonatelier");
    expect(text).not.toContain("BK9X77A12");

    // Zero em or en dashes
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });

  it("builds a clean English plain-text summary for mobile payment orders", () => {
    const text = buildReceiptPlainText({
      receipt: mobileReceipt,
      brandName: "Rumon Atelier",
      lang: "en",
      phone: "01900000000",
      messengerUsername: "rumonatelier",
    });

    expect(text).toContain("Rumon Atelier - Order Receipt");
    expect(text).toContain("Order Number: OK-77312");
    expect(text).toContain("Product: Premium Cotton Panjabi");
    expect(text).toContain("Variant: Black (Size: 40)");
    expect(text).toContain("Quantity: 1");
    expect(text).toContain("Unit Price: ৳1,500");
    expect(text).toContain("Subtotal: ৳1,500");
    expect(text).toContain("Delivery Fee: ৳120 (Outside Dhaka)");
    expect(text).toContain("Total Amount: ৳1,620");
    expect(text).toContain("Delivery Address: GEC Circle, Chittagong");
    expect(text).toContain("Payment Method: bKash");
    expect(text).toContain("Transaction ID (TrxID): BK9X77A12");
    expect(text).toContain("Payment Status: Payment being verified by seller");
    expect(text).toContain("Estimated delivery: 3 to 5 business days");
    expect(text).toContain("Customer Support");
    expect(text).toContain("Phone: 01900000000");

    // Zero em or en dashes
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });

  it("handles free delivery and missing optional fields cleanly", () => {
    const freeDeliveryReceipt: StoredReceipt = {
      ...codReceipt,
      deliveryCharge: 0,
      deliveryAddress: undefined,
    };

    const textBn = buildReceiptPlainText({
      receipt: freeDeliveryReceipt,
      brandName: "Test Brand",
      lang: "bn",
    });

    expect(textBn).toContain("ফ্রি (৳০)");
    expect(textBn).not.toContain("ডেলিভারি ঠিকানা:");
    expect(textBn).not.toContain("যোগাযোগ ও সহায়তা:");

    const textEn = buildReceiptPlainText({
      receipt: freeDeliveryReceipt,
      brandName: "Test Brand",
      lang: "en",
    });

    expect(textEn).toContain("Free (৳0)");
    expect(textEn).not.toContain("Delivery Address:");
    expect(textEn).not.toContain("Customer Support:");
  });
});
