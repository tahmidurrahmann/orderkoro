import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/order/route";
import type { ClientConfig } from "../src/lib/config-schema";
import * as sheetsModule from "../src/lib/server/sheets";
import * as telegramModule from "../src/lib/server/telegram";
import {
  computeOrderPayloadHash,
  getIdempotencyRecord,
  getRedisDriver,
} from "../src/lib/server/redis";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

describe("Production Concurrency, Idempotency and Crash Safety Tests", () => {
  beforeEach(() => {
    vi.stubEnv("MOCK_INTEGRATIONS", "1");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ADMIN_TELEGRAM_CHAT_ID", "-1001234567890");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("handles 20 parallel identical requests with exactly 1 order, 1 Sheet row, 1 Telegram message, and identical responses", async () => {
    const appendSpy = vi.spyOn(sheetsModule, "appendOrderRowWithRetry");
    const telegramSpy = vi.spyOn(telegramModule, "sendTelegramOrderMessage");

    const idempotencyKey = `par-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      slug: "demo-brand",
      name: "Tariqul Islam",
      phone: "01712345678",
      address: "House 20, Road 4, Sector 7, Uttara, Dhaka",
      district: "Dhaka",
      zone: "dhaka-city",
      color: "deep-indigo",
      size: "L (42)",
      quantity: 1,
      paymentMethod: "cod",
      idempotencyKey,
      formStartedAt: Date.now() - 4000,
      lang: "bn",
    };

    // Dispatch 20 parallel identical requests simultaneously
    const requests = Array.from({ length: 20 }, () => POST(makeRequest(payload)));
    const responses = await Promise.all(requests);

    // Verify all 20 responses returned HTTP 200
    for (const res of responses) {
      expect(res.status).toBe(200);
    }

    const jsonResults = await Promise.all(responses.map((r) => r.json()));

    // Verify identical responses and same order number
    const firstOrderNumber = jsonResults[0].orderNumber;
    expect(firstOrderNumber).toBeDefined();
    expect(firstOrderNumber).toMatch(/^[A-Z0-9]+-\d{4}$/);

    for (let i = 1; i < jsonResults.length; i++) {
      expect(jsonResults[i].ok).toBe(true);
      expect(jsonResults[i].orderNumber).toBe(firstOrderNumber);
      expect(jsonResults[i].summary.total).toBe(jsonResults[0].summary.total);
    }

    // Verify exactly 1 Sheet append and 1 Telegram message
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(telegramSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 422 when same idempotency key is reused with a different payload", async () => {
    const idempotencyKey = `mismatch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payloadA = {
      slug: "demo-brand",
      name: "Habib Rahman",
      phone: "01811223344",
      address: "House 10, Road 2, Dhanmondi, Dhaka",
      district: "Dhaka",
      zone: "dhaka-city",
      color: "deep-indigo",
      size: "M (40)",
      quantity: 1,
      paymentMethod: "cod",
      idempotencyKey,
      formStartedAt: Date.now() - 4000,
      lang: "bn",
    };

    // First request succeeds with status 200
    const resA = await POST(makeRequest(payloadA));
    expect(resA.status).toBe(200);
    const dataA = await resA.json();
    expect(dataA.ok).toBe(true);

    // Second request with same key but different quantity and size
    const payloadB = {
      ...payloadA,
      size: "XL (44)",
      quantity: 2,
    };

    const resB = await POST(makeRequest(payloadB));
    expect(resB.status).toBe(422);
    const dataB = await resB.json();
    expect(dataB.ok).toBe(false);
    expect(dataB.code).toBe("IDEMPOTENCY_PAYLOAD_MISMATCH");
  });

  it("recovers from simulated crash after Sheet append without duplicating Sheet row on retry", async () => {
    const appendSpy = vi.spyOn(sheetsModule, "appendOrderRowWithRetry");
    const telegramSpy = vi.spyOn(telegramModule, "sendTelegramOrderMessage");

    const idempotencyKey = `crash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      slug: "demo-brand",
      name: "Shahidul Alam",
      phone: "01911998877",
      address: "Block C, Bashundhara R/A, Dhaka",
      district: "Dhaka",
      zone: "dhaka-city",
      color: "deep-indigo",
      size: "M (40)",
      quantity: 1,
      paymentMethod: "cod",
      idempotencyKey,
      formStartedAt: Date.now() - 4000,
      lang: "bn",
    };

    const payloadHash = computeOrderPayloadHash({
      slug: payload.slug,
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
      district: payload.district,
      zone: payload.zone,
      color: payload.color,
      size: payload.size,
      quantity: payload.quantity,
      paymentMethod: payload.paymentMethod,
    });

    const redis = getRedisDriver();

    // Simulate state after crash: Sheet was appended (sheetDone: true) and orderNumber was assigned,
    // but process died before sending Telegram or writing completed record.
    const crashedOrderNumber = "BNN-7777";
    await redis.set(
      `idem:${idempotencyKey}`,
      {
        status: "pending",
        payloadHash,
        orderNumber: crashedOrderNumber,
        sheetDone: true,
        rowRef: "Sheet1!A50:AC50",
        telegramDone: false,
        createdAt: Date.now(),
      },
      { ex: 60 }
    );

    // Send retry request with the same idempotency key
    const retryRes = await POST(makeRequest(payload));
    expect(retryRes.status).toBe(200);
    const retryData = await retryRes.json();

    expect(retryData.ok).toBe(true);
    expect(retryData.orderNumber).toBe(crashedOrderNumber);

    // Sheet append was skipped to prevent duplicate row
    expect(appendSpy).toHaveBeenCalledTimes(0);

    // Telegram message was sent for remaining step
    expect(telegramSpy).toHaveBeenCalledTimes(1);

    // Final state in Redis is completed
    const finalRecord = await getIdempotencyRecord(idempotencyKey, redis);
    expect(finalRecord?.status).toBe("completed");
    expect(finalRecord?.orderNumber).toBe(crashedOrderNumber);
  });

  it("releases TrxID reservation when an error is thrown mid-processing", async () => {
    const clientsModule = await import("../src/lib/server/clients");
    const baseConfig = clientsModule.getServerClientConfig("demo-brand");
    const mockBkashConfig = {
      ...baseConfig,
      payments: {
        cod: { enabled: true },
        bkash: {
          enabled: true,
          number: "01711002233",
          type: "personal" as const,
        },
      },
    };
    vi.spyOn(clientsModule, "getServerClientConfig").mockReturnValue(mockBkashConfig as unknown as ClientConfig);

    // Force both sheets append and telegram message to fail (total failure)
    vi.spyOn(sheetsModule, "appendOrderRowWithRetry").mockRejectedValue(
      new Error("Simulated Sheets Unhandled Failure")
    );
    vi.spyOn(telegramModule, "sendTelegramOrderMessage").mockRejectedValue(
      new Error("Simulated Telegram Failure")
    );

    const idempotencyKey = `fail-trx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const testTrxId = "ERRTRX12345";
    const payload = {
      slug: "demo-brand",
      name: "Trx Test User",
      phone: "01799887766",
      address: "House 5, Road 10, Dhanmondi, Dhaka",
      district: "Dhaka",
      zone: "dhaka-city",
      color: "deep-indigo",
      size: "M (40)",
      quantity: 1,
      paymentMethod: "bkash",
      transactionId: testTrxId,
      paidFrom: "01799887766",
      idempotencyKey,
      formStartedAt: Date.now() - 4000,
      lang: "bn",
    };

    const redis = getRedisDriver();

    // Verify TrxID is initially free
    const initialTrx = await redis.get(`trx:demo-brand:${testTrxId}`);
    expect(initialTrx).toBeNull();

    // Send request that fails mid-processing
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(502);

    // Verify TrxID was released in try/finally
    const trxAfterFailure = await redis.get(`trx:demo-brand:${testTrxId}`);
    expect(trxAfterFailure).toBeNull();
  });
});
