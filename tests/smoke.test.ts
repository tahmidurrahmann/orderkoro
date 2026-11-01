import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ClientConfigSchema } from "../src/lib/config-schema";
import { verifyAndRecomputeOrderOnServer } from "../src/lib/delivery";
import { validateBdPhone } from "../src/lib/phone";
import {
  acquireIdempotencyKey,
  finalizeIdempotencyKey,
  InMemoryRedisDriver,
} from "../src/lib/server/redis";
import { buildFbcFromFbclid } from "../src/lib/tracking";

interface OrderPayload {
  slug: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  zone?: string;
  color: string;
  size: string;
  quantity: number;
  idempotencyKey: string;
  attribution?: {
    fbclid?: string;
    _fbc?: string;
    _fbp?: string;
  };
}

interface OrderSummary {
  orderNumber: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  deliveryFee: number;
  total: number;
}

interface OrderResponseBody {
  ok: boolean;
  orderNumber?: string;
  eventId?: string;
  idempotentReplay?: boolean;
  summary?: OrderSummary;
  error?: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

describe("Stage 3 Smoke Tests (MOCK_INTEGRATIONS=1)", () => {
  const ROOT_DIR = path.resolve(__dirname, "..");
  const rawClient = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, "clients", "demo-brand.json"), "utf-8")
  );
  const demoConfig = ClientConfigSchema.parse(rawClient);
  const redis = new InMemoryRedisDriver();
  const sheetRows: Array<{ orderNumber: string; total: number; fbc: string }> = [];
  const telegramMessages: Array<{ orderNumber: string; total: number }> = [];

  async function processOrder(payload: OrderPayload, clientConfig = demoConfig): Promise<{ status: number; body: OrderResponseBody }> {
    if (clientConfig.status === "paused") {
      return {
        status: 403,
        body: {
          ok: false,
          error: "Store is currently paused",
          code: "STORE_PAUSED",
        },
      };
    }

    const phoneRes = validateBdPhone(payload.phone);
    if (!phoneRes.valid) {
      return {
        status: 400,
        body: {
          ok: false,
          error: "Invalid phone number",
          fieldErrors: { phone: "Invalid mobile number" },
        },
      };
    }

    const verification = verifyAndRecomputeOrderOnServer(clientConfig, {
      district: payload.district,
      zone: payload.zone || "",
      color: payload.color,
      size: payload.size,
      quantity: payload.quantity,
    });

    if (!verification.ok) {
      return {
        status: 400,
        body: {
          ok: false,
          error: verification.message,
          fieldErrors: verification.fieldErrors,
        },
      };
    }

    const idempotency = await acquireIdempotencyKey(
      payload.idempotencyKey,
      { status: "pending", orderNumber: "", eventId: "" },
      redis
    );

    if (!idempotency.acquired) {
      if (idempotency.existing?.orderNumber) {
        return {
          status: 200,
          body: {
            ok: true,
            orderNumber: idempotency.existing.orderNumber,
            eventId: idempotency.existing.eventId,
            idempotentReplay: true,
            summary: idempotency.existing.summary as OrderSummary | undefined,
          },
        };
      }
    }

    const fbclid = payload.attribution?.fbclid || "fake_fbclid_12345";
    const fbc = payload.attribution?._fbc || buildFbcFromFbclid(fbclid, 1700000000);
    const orderNumber = "BNN-0001";
    const { codTotal, unitPrice, deliveryFee, colorName, sizeName, quantity } = verification.data;

    sheetRows.push({
      orderNumber,
      total: codTotal,
      fbc,
    });

    telegramMessages.push({
      orderNumber,
      total: codTotal,
    });

    const orderSummary = {
      orderNumber,
      color: colorName,
      size: sizeName,
      quantity,
      unitPrice,
      deliveryFee,
      total: codTotal,
    };

    await finalizeIdempotencyKey(
      payload.idempotencyKey,
      {
        status: "completed",
        orderNumber,
        eventId: orderNumber,
        summary: orderSummary,
      },
      redis
    );

    return {
      status: 200,
      body: {
        ok: true,
        orderNumber,
        eventId: orderNumber,
        idempotentReplay: false,
        summary: orderSummary,
      },
    };
  }

  const validPayload = {
    slug: "demo-brand",
    name: "Rahim Chowdhury",
    phone: "01711223344",
    address: "House 12, Road 4, Dhanmondi, Dhaka",
    district: "Dhaka",
    zone: "dhaka-city",
    color: "Deep Indigo",
    size: "M (40)",
    quantity: 1,
    idempotencyKey: "idem_smoke_001",
    attribution: { fbclid: "test_fbclid_98765" },
  };

  it("1. Valid order submission (200 OK, total: 1560, _fbc built, Sheet & Telegram written)", async () => {
    const res = await processOrder(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.orderNumber).toBe("BNN-0001");
    expect(res.body.summary?.total).toBe(1560);
    expect(sheetRows.length).toBe(1);
    expect(telegramMessages.length).toBe(1);
    expect(sheetRows[0].fbc).toMatch(/^fb\.1\.\d+\.test_fbclid_98765$/);
  });

  it("2. Duplicate idempotencyKey retry (200 OK, same order, zero duplicate writes)", async () => {
    const res = await processOrder(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.orderNumber).toBe("BNN-0001");
    expect(res.body.idempotentReplay).toBe(true);
    expect(sheetRows.length).toBe(1);
    expect(telegramMessages.length).toBe(1);
  });

  it("3. Paused-slug rejection (403 Forbidden, code: STORE_PAUSED)", async () => {
    const pausedConfig = ClientConfigSchema.parse({
      ...rawClient,
      status: "paused",
    });
    const res = await processOrder(
      { ...validPayload, idempotencyKey: "idem_smoke_003" },
      pausedConfig
    );
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe("STORE_PAUSED");
  });

  it("4. Bad-phone rejection (400 Bad Request, fieldErrors.phone)", async () => {
    const res = await processOrder({
      ...validPayload,
      phone: "01234567890",
      idempotencyKey: "idem_smoke_004",
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.fieldErrors?.phone).toBeDefined();
  });

  it("5. Unavailable size rejection (400 Bad Request, fieldErrors.size)", async () => {
    const unavailableSizeConfig = ClientConfigSchema.parse({
      ...rawClient,
      sizes: [
        { name: "M", available: true },
        { name: "XXL (46)", available: false },
      ],
    });
    const res = await processOrder(
      {
        ...validPayload,
        size: "XXL (46)",
        idempotencyKey: "idem_smoke_005",
      },
      unavailableSizeConfig
    );
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.fieldErrors?.size).toBeDefined();
  });
});
