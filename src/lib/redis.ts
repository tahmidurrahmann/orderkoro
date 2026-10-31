import { Redis } from "@upstash/redis";

export interface OrderRecord {
  orderNumber: string;
  slug: string;
  orderPrefix: string;
  createdAtDhaka: string;
  createdAtIso: string;
  name: string;
  phone: string;
  district: string;
  zoneId: string;
  zoneLabel: string;
  address: string;
  productTitle: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  note: string;
  status: "new" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled";
  flags: string[];
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  };
  fbclid?: string;
  eventId?: string;
  fbp?: string;
  fbc?: string;
  sheetSaved: boolean;
  telegramNotified: boolean;
}

/**
 * In-memory fallback store when Upstash credentials are not supplied (e.g. testing or offline dev).
 */
class InMemoryRedisFallback {
  private data = new Map<string, { value: string | number; expiresAt?: number }>();

  private cleanKey(key: string): void {
    const item = this.data.get(key);
    if (item && item.expiresAt && Date.now() > item.expiresAt) {
      this.data.delete(key);
    }
  }

  async incr(key: string): Promise<number> {
    this.cleanKey(key);
    const item = this.data.get(key);
    const current = typeof item?.value === "number" ? item.value : 0;
    const next = current + 1;
    this.data.set(key, { value: next, expiresAt: item?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.data.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    this.cleanKey(key);
    const item = this.data.get(key);
    if (!item) return null;
    return item.value as unknown as T;
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<string> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.data.set(key, {
      value: typeof value === "object" && value !== null ? JSON.stringify(value) : (value as string | number),
      expiresAt,
    });
    return "OK";
  }

  async mget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  clear(): void {
    this.data.clear();
  }
}

const memoryFallback = new InMemoryRedisFallback();

let redisClientInstance: Redis | InMemoryRedisFallback | null = null;

export function getRedisClient(): Redis | InMemoryRedisFallback {
  if (redisClientInstance) {
    return redisClientInstance;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redisClientInstance = new Redis({
      url,
      token,
    });
  } else {
    redisClientInstance = memoryFallback;
  }

  return redisClientInstance;
}

/**
 * Test helper to reset or swap Redis client
 */
export function setCustomRedisClient(custom: Redis | InMemoryRedisFallback | null): void {
  redisClientInstance = custom;
}

/**
 * Returns formatted date & time in Asia/Dhaka timezone (UTC+6)
 */
export function getDhakaDateTime(date = new Date()): {
  yymmdd: string;
  dhakaFormatted: string;
  iso: string;
} {
  const timeZone = "Asia/Dhaka";
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const yy = parts.find((p) => p.type === "year")?.value || "00";
  const mm = parts.find((p) => p.type === "month")?.value || "01";
  const dd = parts.find((p) => p.type === "day")?.value || "01";
  const yymmdd = `${yy}${mm}${dd}`;

  const fullFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dhakaFormatted = fullFormatter.format(date);

  return {
    yymmdd,
    dhakaFormatted,
    iso: date.toISOString(),
  };
}

/**
 * IP Rate Limit: atomic INCR with 600s TTL. Max 5 orders per 10 mins.
 */
export async function checkIpRateLimit(
  ip: string,
  limit = 5,
  windowSeconds = 600
): Promise<{ allowed: boolean; count: number }> {
  const redis = getRedisClient();
  const key = `ratelimit:ip:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return {
    allowed: count <= limit,
    count,
  };
}

/**
 * Phone Rate Limit & Repeat Detection:
 * Max 3 orders from same phone within 24 hours.
 */
export async function checkPhoneRateLimit(
  phone: string,
  limit = 3,
  windowSeconds = 86400
): Promise<{ allowed: boolean; count: number; isRepeat: boolean }> {
  const redis = getRedisClient();
  const key = `ratelimit:phone:${phone}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return {
    allowed: count <= limit,
    count,
    isRepeat: count > 1,
  };
}

/**
 * Fetches historical delivery & return counters for a phone number
 */
export async function getPhoneStats(
  phone: string
): Promise<{ delivered: number; returned: number }> {
  const redis = getRedisClient();
  const deliveredVal = await redis.get<number | string>(`phone_stats:${phone}:delivered`);
  const returnedVal = await redis.get<number | string>(`phone_stats:${phone}:returned`);

  return {
    delivered: Number(deliveredVal) || 0,
    returned: Number(returnedVal) || 0,
  };
}

/**
 * Increments delivery or return count for a customer phone
 */
export async function incrementPhoneStat(
  phone: string,
  stat: "delivered" | "returned"
): Promise<number> {
  const redis = getRedisClient();
  return redis.incr(`phone_stats:${phone}:${stat}`);
}

/**
 * Generates an atomic daily order sequence: <orderPrefix>-<YYMMDD>-<4-digit sequence>
 * e.g. BNN-261101-0001
 */
export async function generateOrderNumber(
  orderPrefix: string,
  date = new Date()
): Promise<string> {
  const redis = getRedisClient();
  const { yymmdd } = getDhakaDateTime(date);
  const key = `order_seq:${orderPrefix.toUpperCase()}:${yymmdd}`;
  const seq = await redis.incr(key);
  if (seq === 1) {
    // 48 hour TTL ensures key automatically cleans up after day rollover
    await redis.expire(key, 172800);
  }
  const sequenceStr = String(seq).padStart(4, "0");
  return `${orderPrefix.toUpperCase()}-${yymmdd}-${sequenceStr}`;
}

/**
 * Stores full order record in Redis with 30-day expiry as backup
 */
export async function saveOrderBackup(
  order: OrderRecord,
  ttlSeconds = 30 * 86400
): Promise<void> {
  const redis = getRedisClient();
  await Promise.all([
    redis.set(`order:${order.orderNumber}`, JSON.stringify(order), { ex: ttlSeconds }),
    redis.set(`order_status:${order.orderNumber}`, order.status, { ex: ttlSeconds }),
    redis.set(`order_phone:${order.orderNumber}`, order.phone, { ex: ttlSeconds }),
    redis.set(`order_client:${order.orderNumber}`, order.slug, { ex: ttlSeconds }),
  ]);
}

/**
 * Reads order backup from Redis
 */
export async function getOrderBackup(orderNumber: string): Promise<OrderRecord | null> {
  const redis = getRedisClient();
  const raw = await redis.get<string | OrderRecord>(`order:${orderNumber}`);
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as OrderRecord;
    } catch {
      return null;
    }
  }
  return raw as OrderRecord;
}

/**
 * Reads current order status from Redis
 */
export async function getOrderStatus(orderNumber: string): Promise<string | null> {
  const redis = getRedisClient();
  const status = await redis.get<string>(`order_status:${orderNumber}`);
  return status ?? null;
}

/**
 * Updates order status in Redis
 */
export async function setOrderStatus(
  orderNumber: string,
  status: OrderRecord["status"],
  ttlSeconds = 30 * 86400
): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`order_status:${orderNumber}`, status, { ex: ttlSeconds });

  // If order record exists, update its status field as well
  const existing = await getOrderBackup(orderNumber);
  if (existing) {
    existing.status = status;
    await redis.set(`order:${orderNumber}`, JSON.stringify(existing), { ex: ttlSeconds });
  }
}
