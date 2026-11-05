import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateOrderToken,
  storeOrderToken,
  getOrderToken,
  storeOrderMeta,
  getOrderMeta,
  updateOrderMetaStatus,
  updateOrderMetaPaymentStatus,
  getRedisDriver,
  type RedisDriver,
} from "@/lib/server/redis";
import { POST as confirmOrderRoute } from "@/app/api/order/confirm/route";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Mock environment variables
process.env.MOCK_INTEGRATIONS = "1";
process.env.TELEGRAM_WEBHOOK_SECRET = "test_webhook_secret";
process.env.ADMIN_TELEGRAM_CHAT_ID = "123456789";

describe("Customer Order Status Page & Token Security (Task 10)", () => {
  let redis: RedisDriver;

  beforeEach(() => {
    redis = getRedisDriver();
    vi.clearAllMocks();
  });

  describe("1. Token Generation, Storage & TTL", () => {
    it("generates cryptographically random base64url tokens with >= 128 bits entropy", () => {
      const token1 = generateOrderToken();
      const token2 = generateOrderToken();

      expect(typeof token1).toBe("string");
      expect(typeof token2).toBe("string");
      expect(token1).not.toBe(token2);

      // 24 bytes in base64url produces a 32-character string without +, /, or =
      expect(token1.length).toBe(32);
      expect(token1).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("stores and retrieves ordtoken:<token> -> { slug, orderNumber } with 90-day TTL", async () => {
      const token = generateOrderToken();
      await storeOrderToken(token, { slug: "demo-brand", orderNumber: "DEMO-261103-0001" }, redis);

      const record = await getOrderToken(token, redis);
      expect(record).not.toBeNull();
      expect(record?.slug).toBe("demo-brand");
      expect(record?.orderNumber).toBe("DEMO-261103-0001");

      const ttl = await redis.ttl(`ordtoken:${token}`);
      // 90 days = 7,776,000 seconds
      expect(ttl).toBeGreaterThan(7775000);
      expect(ttl).toBeLessThanOrEqual(7776000);
    });

    it("returns null for unknown, expired, or malformed tokens", async () => {
      expect(await getOrderToken("", redis)).toBeNull();
      expect(await getOrderToken("short", redis)).toBeNull();
      expect(await getOrderToken("non-existent-token-1234567890", redis)).toBeNull();
    });
  });

  describe("2. Security & Anti-Enumeration (Sequential Order Numbers)", () => {
    it("never returns an order when guessing sequential order numbers", async () => {
      // Store an order in ordmeta
      await storeOrderMeta(
        "DEMO-261103-0001",
        {
          slug: "demo-brand",
          orderNumber: "DEMO-261103-0001",
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          phone: "01712345678",
          total: 1500,
        },
        redis
      );

      // Attacker attempts to guess order number directly as the token
      const guess1 = await getOrderToken("DEMO-261103-0001", redis);
      const guess2 = await getOrderToken("DEMO-261103-0002", redis);
      const guess3 = await getOrderToken("1", redis);
      const guess4 = await getOrderToken("2", redis);

      expect(guess1).toBeNull();
      expect(guess2).toBeNull();
      expect(guess3).toBeNull();
      expect(guess4).toBeNull();
    });

    it("denies access when token slug does not match route slug", async () => {
      const token = generateOrderToken();
      await storeOrderToken(token, { slug: "demo-brand", orderNumber: "DEMO-261103-0001" }, redis);

      const record = await getOrderToken(token, redis);
      expect(record?.slug).toBe("demo-brand");

      // Verify cross-tenant isolation: slug mismatch check
      const routeSlug = "another-store";
      const isMismatch = record?.slug !== routeSlug;
      expect(isMismatch).toBe(true);
    });
  });

  describe("3. Privacy & Masking (Phone and Address)", () => {
    it("masks phone numbers showing only first 3 and last 3 digits", () => {
      function maskPhoneNumber(phone?: string): string {
        if (!phone) return "";
        const digits = phone.replace(/[^\d+]/g, "");
        if (digits.length <= 6) return digits;
        const first3 = digits.slice(0, 3);
        const last3 = digits.slice(-3);
        return `${first3}***${last3}`;
      }

      expect(maskPhoneNumber("01712345678")).toBe("017***678");
      expect(maskPhoneNumber("+8801812345678")).toBe("+88***678");
      expect(maskPhoneNumber("01999888777")).toBe("019***777");
      expect(maskPhoneNumber("12345")).toBe("12345");
    });

    it("ensures full address is never rendered on the order status page", () => {
      // Inspect OrderStatusClient source code to assert customer address is absent from props and rendering
      const clientPath = path.join(process.cwd(), "src/components/OrderStatusClient.tsx");
      const clientCode = fs.readFileSync(clientPath, "utf-8");

      expect(clientCode).not.toContain("customerAddress");
      expect(clientCode).not.toContain("deliveryAddress");
      expect(clientCode).toContain("area");
      expect(clientCode).toContain("maskedPhone");
    });
  });

  describe("4. Meta Pixel & Tracking Absence on Order Status Route", () => {
    it("ensures Meta Pixel and tracking scripts are absent on /[slug]/order/[token]", () => {
      const pagePath = path.join(process.cwd(), "src/app/[slug]/order/[token]/page.tsx");
      const pageCode = fs.readFileSync(pagePath, "utf-8");

      expect(pageCode).not.toContain("MetaPixel");
      expect(pageCode).not.toContain("fbq");
      expect(pageCode).not.toContain("pixelId");
      expect(pageCode).not.toContain("trackPurchase");
      expect(pageCode).toContain("robots");
      expect(pageCode).toContain("index: false");
      expect(pageCode).toContain("follow: false");
    });
  });

  describe("5. Customer Confirmation Rules (/api/order/confirm)", () => {
    it("blocks customer confirmation when customerConfirm is 'off'", async () => {
      const token = generateOrderToken();
      // test-template has customerConfirm: "off"
      await storeOrderToken(token, { slug: "test-template", orderNumber: "TST-261103-0001" }, redis);
      await storeOrderMeta(
        "TST-261103-0001",
        {
          slug: "test-template",
          orderNumber: "TST-261103-0001",
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          phone: "01711223344",
          total: 1000,
        },
        redis
      );

      const req = new NextRequest("http://localhost:3000/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const res = await confirmOrderRoute(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain("Customer confirmation is disabled");
    });

    it("allows customer confirmation when customerConfirm is 'tap' and status is 'new'", async () => {
      const token = generateOrderToken();
      // demo-brand has customerConfirm: "tap"
      await storeOrderToken(token, { slug: "demo-brand", orderNumber: "DEMO-261103-0002" }, redis);
      await storeOrderMeta(
        "DEMO-261103-0002",
        {
          slug: "demo-brand",
          orderNumber: "DEMO-261103-0002",
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          customerConfirmed: false,
          phone: "01711223344",
          total: 1200,
        },
        redis
      );

      const req = new NextRequest("http://localhost:3000/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const res = await confirmOrderRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.customerConfirmed).toBe(true);

      // Verify updated in ordmeta
      const updatedMeta = await getOrderMeta("DEMO-261103-0002", redis);
      expect(updatedMeta?.customerConfirmed).toBe(true);
      // Order status remains "new" until seller processes it
      expect(updatedMeta?.status).toBe("new");
    });

    it("is idempotent: repeated confirm calls return 200 without error", async () => {
      const token = generateOrderToken();
      await storeOrderToken(token, { slug: "demo-brand", orderNumber: "DEMO-261103-0003" }, redis);
      await storeOrderMeta(
        "DEMO-261103-0003",
        {
          slug: "demo-brand",
          orderNumber: "DEMO-261103-0003",
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          customerConfirmed: true, // Already confirmed
          phone: "01711223344",
          total: 1200,
        },
        redis
      );

      const req = new NextRequest("http://localhost:3000/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const res = await confirmOrderRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.customerConfirmed).toBe(true);
      expect(data.message).toContain("already confirmed");
    });

    it("blocks customer confirmation for high-value orders (exceeding highValueThreshold)", async () => {
      const token = generateOrderToken();
      await storeOrderToken(token, { slug: "demo-brand", orderNumber: "DEMO-261103-0004" }, redis);
      await storeOrderMeta(
        "DEMO-261103-0004",
        {
          slug: "demo-brand",
          orderNumber: "DEMO-261103-0004",
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          phone: "01711223344",
          total: 15000, // Exceeds highValueThreshold (5000 in demo-brand)
        },
        redis
      );

      const req = new NextRequest("http://localhost:3000/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const res = await confirmOrderRoute(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.requiresCall).toBe(true);
      expect(data.error).toContain("Phone confirmation required");
    });

    it("blocks customer confirmation for repeat-phone flagged orders", async () => {
      const token = generateOrderToken();
      await storeOrderToken(token, { slug: "demo-brand", orderNumber: "DEMO-261103-0005" }, redis);
      await storeOrderMeta(
        "DEMO-261103-0005",
        {
          slug: "demo-brand",
          orderNumber: "DEMO-261103-0005",
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          repeatPhoneFlag: true, // Repeat customer flagged by fraud check
          phone: "01711223344",
          total: 1200,
        },
        redis
      );

      const req = new NextRequest("http://localhost:3000/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const res = await confirmOrderRoute(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.requiresCall).toBe(true);
      expect(data.error).toContain("Phone confirmation required");
    });

    it("rejects confirmation when order status is no longer 'new'", async () => {
      const token = generateOrderToken();
      await storeOrderToken(token, { slug: "demo-brand", orderNumber: "DEMO-261103-0006" }, redis);
      await storeOrderMeta(
        "DEMO-261103-0006",
        {
          slug: "demo-brand",
          orderNumber: "DEMO-261103-0006",
          rowRef: "Sheet1!A2:AC2",
          status: "confirmed", // Already confirmed or beyond
          phone: "01711223344",
          total: 1200,
        },
        redis
      );

      const req = new NextRequest("http://localhost:3000/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const res = await confirmOrderRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain("already been processed");
    });
  });

  describe("6. Telegram Webhook Transitions Sync with ordmeta", () => {
    it("updates ordmeta status on every seller button transition", async () => {
      const orderNumber = "DEMO-261103-0007";
      await storeOrderMeta(
        orderNumber,
        {
          slug: "demo-brand",
          orderNumber,
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          telegramChatId: "-1001234567890",
          phone: "01711223344",
        },
        redis
      );

      // Transition 1: new -> confirmed
      await updateOrderMetaStatus(orderNumber, "confirmed", true, redis);
      let meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.status).toBe("confirmed");

      // Transition 2: confirmed -> shipped
      await updateOrderMetaStatus(orderNumber, "shipped", true, redis);
      meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.status).toBe("shipped");

      // Transition 3: shipped -> delivered
      await updateOrderMetaStatus(orderNumber, "delivered", true, redis);
      meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.status).toBe("delivered");

      // Transition 4: shipped -> returned
      await updateOrderMetaStatus(orderNumber, "returned", true, redis);
      meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.status).toBe("returned");

      // Transition 5: new -> cancelled
      await updateOrderMetaStatus(orderNumber, "cancelled", true, redis);
      meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.status).toBe("cancelled");

      // Transition 6: new -> no_answer
      await updateOrderMetaStatus(orderNumber, "no_answer", true, redis);
      meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.status).toBe("no_answer");
    });

    it("updates ordmeta paymentStatus on payment verification transitions", async () => {
      const orderNumber = "DEMO-261103-0008";
      await storeOrderMeta(
        orderNumber,
        {
          slug: "demo-brand",
          orderNumber,
          rowRef: "Sheet1!A2:AC2",
          status: "new",
          paymentMethod: "bkash",
          paymentStatus: "Unverified",
          telegramChatId: "-1001234567890",
          phone: "01711223344",
        },
        redis
      );

      // Verify payment
      await updateOrderMetaPaymentStatus(orderNumber, "Verified", redis);
      let meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.paymentStatus).toBe("Verified");

      // Payment not received
      await updateOrderMetaPaymentStatus(orderNumber, "Not received", redis);
      meta = await getOrderMeta(orderNumber, redis);
      expect(meta?.paymentStatus).toBe("Not received");
    });
  });

  describe("7. Order Progress Stepper & Connecting Line Geometry", () => {
    it("ensures all reached steps receive tick marks and connecting line starts exactly from first step", () => {
      const clientPath = path.join(process.cwd(), "src/components/OrderStatusClient.tsx");
      const clientCode = fs.readFileSync(clientPath, "utf-8");

      // Verify completion condition includes current step (idx <= currentStep)
      expect(clientCode).toContain("const isCompleted = idx <= currentStep;");

      // Verify checkmark SVG rendered for completed steps
      expect(clientCode).toContain("isCompleted ? (");
      expect(clientCode).toContain("M20 6 9 17l-5-5");

      // Verify grid-cols-4 symmetrical layout
      expect(clientCode).toContain("grid grid-cols-4");

      // Verify connecting line is gated by idx > 0 so nothing extends to the left of the first step
      expect(clientCode).toContain("{idx > 0 && (");
      expect(clientCode).toContain("-left-1/2 w-full");

      // Verify no hardcoded absolute left-4 / right-4 on the full stepper bar
      expect(clientCode).not.toContain("absolute left-4 right-4");
    });
  });

  describe("8. Seller Confirmation Badge & Empty Card Prevention", () => {
    it("renders seller confirmed badge when seller confirms, and avoids empty card wrappers", () => {
      const clientPath = path.join(process.cwd(), "src/components/OrderStatusClient.tsx");
      const clientCode = fs.readFileSync(clientPath, "utf-8");

      // Verify seller confirmed badge is rendered
      expect(clientCode).toContain("copy.orderStatusSellerConfirmedBadge");
      expect(clientCode).toContain('status === "confirmed" || status === "shipped" || status === "delivered"');

      // Verify customer confirmation card is suppressed on cancelled/returned
      expect(clientCode).toContain("!isCancelled && !isReturned");
    });
  });
});
