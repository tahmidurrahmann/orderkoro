import "server-only";

import crypto from "node:crypto";
import { Redis } from "@upstash/redis";

export interface RedisDriver {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { nx?: boolean; ex?: number }): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
  rpush(key: string, ...elements: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  eval<T = unknown>(script: string, keys: string[], args: unknown[]): Promise<T>;
  ttl(key: string): Promise<number>;
  pipeline(): RedisPipeline;
}

export interface RedisPipeline {
  incr(key: string): RedisPipeline;
  expire(key: string, seconds: number): RedisPipeline;
  exec(): Promise<unknown[]>;
}

export class InMemoryRedisDriver implements RedisDriver {
  private store = new Map<string, unknown>();
  private expirations = new Map<string, number>();

  private isExpired(key: string): boolean {
    const exp = this.expirations.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.expirations.delete(key);
      return true;
    }
    return false;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.isExpired(key)) return null;
    const val = this.store.get(key);
    if (val === undefined) return null;
    return val as T;
  }

  async set(
    key: string,
    value: unknown,
    options?: { nx?: boolean; ex?: number }
  ): Promise<string | null> {
    if (this.isExpired(key)) {
      this.store.delete(key);
    }

    if (options?.nx && this.store.has(key)) {
      return null;
    }

    this.store.set(key, value);
    if (options?.ex) {
      this.expirations.set(key, Date.now() + options.ex * 1000);
    }
    return "OK";
  }

  async incr(key: string): Promise<number> {
    if (this.isExpired(key)) {
      this.store.delete(key);
    }
    const current = Number(this.store.get(key) || 0);
    const next = current + 1;
    this.store.set(key, next);
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.store.has(key) || this.isExpired(key)) {
      return 0;
    }
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async del(key: string): Promise<number> {
    this.expirations.delete(key);
    return this.store.delete(key) ? 1 : 0;
  }

  async rpush(key: string, ...elements: string[]): Promise<number> {
    if (this.isExpired(key)) {
      this.store.delete(key);
    }
    const list = (this.store.get(key) as string[]) || [];
    list.push(...elements);
    this.store.set(key, list);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.isExpired(key)) return [];
    const list = (this.store.get(key) as string[]) || [];
    if (stop === -1) {
      return list.slice(start);
    }
    return list.slice(start, stop + 1);
  }

  async eval<T = unknown>(_script: string, keys: string[], args: unknown[]): Promise<T> {
    const key = keys[0];
    const expectedVal = String(args[0]);
    const currentVal = await this.get(key);
    if (currentVal !== null && String(currentVal) === expectedVal) {
      await this.del(key);
      return 1 as unknown as T;
    }
    return 0 as unknown as T;
  }

  async ttl(key: string): Promise<number> {
    if (this.isExpired(key) || !this.store.has(key)) {
      return -2;
    }
    const exp = this.expirations.get(key);
    if (!exp) {
      return -1;
    }
    return Math.max(0, Math.ceil((exp - Date.now()) / 1000));
  }

  pipeline(): RedisPipeline {
    const ops: Array<() => Promise<unknown>> = [];
    const pipe: RedisPipeline = {
      incr: (key: string) => {
        ops.push(() => this.incr(key));
        return pipe;
      },
      expire: (key: string, seconds: number) => {
        ops.push(() => this.expire(key, seconds));
        return pipe;
      },
      exec: async () => {
        const results: unknown[] = [];
        for (const op of ops) {
          results.push(await op());
        }
        return results;
      },
    };
    return pipe;
  }
}

export class UpstashRedisDriver implements RedisDriver {
  private client: Redis;

  constructor(url: string, token: string) {
    this.client = new Redis({ url, token });
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.client.get<T>(key);
  }

  async set(
    key: string,
    value: unknown,
    options?: { nx?: boolean; ex?: number }
  ): Promise<string | null> {
    if (options?.nx && options?.ex) {
      const res = await this.client.set(key, value, { nx: true, ex: options.ex });
      return res as string | null;
    }
    if (options?.nx) {
      const res = await this.client.set(key, value, { nx: true });
      return res as string | null;
    }
    if (options?.ex) {
      const res = await this.client.set(key, value, { ex: options.ex });
      return res as string | null;
    }
    const res = await this.client.set(key, value);
    return res as string | null;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async rpush(key: string, ...elements: string[]): Promise<number> {
    return this.client.rpush(key, ...elements);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async eval<T = unknown>(script: string, keys: string[], args: unknown[]): Promise<T> {
    return this.client.eval(script, keys, args) as Promise<T>;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  pipeline(): RedisPipeline {
    const p = this.client.pipeline();
    const pipe: RedisPipeline = {
      incr: (key: string) => {
        p.incr(key);
        return pipe;
      },
      expire: (key: string, seconds: number) => {
        p.expire(key, seconds);
        return pipe;
      },
      exec: async () => {
        return p.exec();
      },
    };
    return pipe;
  }
}

let globalRedisDriver: RedisDriver | null = null;

export function getRedisDriver(): RedisDriver {
  if (globalRedisDriver) {
    return globalRedisDriver;
  }

  if (process.env.MOCK_INTEGRATIONS === "1") {
    globalRedisDriver = new InMemoryRedisDriver();
    return globalRedisDriver;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!url || !token) {
    console.warn("[Redis] Missing Upstash credentials, falling back to InMemoryRedisDriver");
    globalRedisDriver = new InMemoryRedisDriver();
    return globalRedisDriver;
  }

  globalRedisDriver = new UpstashRedisDriver(url, token);
  return globalRedisDriver;
}

// ---------------------------------------------------------------------
// Order Number Sequence: Atomic INCR on ord:<slug> formatted PREFIX-0001
// ---------------------------------------------------------------------
export async function nextOrderNumber(
  slug: string,
  orderPrefix?: string,
  driver: RedisDriver = getRedisDriver()
): Promise<string> {
  const prefix = orderPrefix || slug.slice(0, 3).toUpperCase();
  const key = `ord:${slug}`;
  const seq = await driver.incr(key);
  const formattedSeq = String(seq).padStart(4, "0");
  return `${prefix}-${formattedSeq}`;
}

// ---------------------------------------------------------------------
// Idempotency: SET NX on idem:<key> (24h TTL)
// ---------------------------------------------------------------------
export interface IdempotencyRecord {
  status: "pending" | "completed";
  orderNumber: string;
  eventId?: string;
  summary?: unknown;
}

export async function acquireIdempotencyKey(
  key: string,
  data: IdempotencyRecord,
  driver: RedisDriver = getRedisDriver()
): Promise<{ acquired: boolean; existing?: IdempotencyRecord }> {
  const redisKey = `idem:${key}`;
  const setRes = await driver.set(redisKey, data, { nx: true, ex: 86400 });
  if (setRes === "OK") {
    return { acquired: true };
  }
  const existing = await driver.get<IdempotencyRecord>(redisKey);
  return { acquired: false, existing: existing || undefined };
}

export async function finalizeIdempotencyKey(
  key: string,
  data: IdempotencyRecord,
  driver: RedisDriver = getRedisDriver()
): Promise<void> {
  const redisKey = `idem:${key}`;
  await driver.set(redisKey, data, { ex: 86400 });
}

export async function releaseIdempotencyKey(
  key: string,
  driver: RedisDriver = getRedisDriver()
): Promise<void> {
  const redisKey = `idem:${key}`;
  await driver.del(redisKey);
}

// ---------------------------------------------------------------------
// Content-Based Cart Dedupe Hash (includes normalized delivery address)
// ---------------------------------------------------------------------
export function computeCartDedupeHash(
  slug: string,
  phone: string,
  color: string,
  size: string,
  quantity: number,
  address: string
): string {
  const normalizedAddress = address.trim().toLowerCase();
  return crypto
    .createHash("sha256")
    .update(`${slug}:${phone}:${color}:${size}:${quantity}:${normalizedAddress}`)
    .digest("hex")
    .slice(0, 16);
}

// ---------------------------------------------------------------------
// Rate Limiting: IP (5 per 10m) & Phone (3 per 24h, 3rd allowed flagged, 4th rejected)
// ---------------------------------------------------------------------
export async function checkIpRateLimit(
  ip: string,
  driver: RedisDriver = getRedisDriver()
): Promise<{ allowed: boolean; count: number }> {
  const key = `rl:ip:${ip}`;
  const pipe = driver.pipeline();
  pipe.incr(key);
  pipe.expire(key, 600); // 10 minutes
  const results = await pipe.exec();
  const count = Number(results[0] || 1);

  return {
    allowed: count <= 5,
    count,
  };
}

export async function checkPhoneRateLimit(
  phone: string,
  driver: RedisDriver = getRedisDriver()
): Promise<{ allowed: boolean; count: number; repeatPhoneFlag: boolean }> {
  const key = `rl:phone:${phone}`;
  const pipe = driver.pipeline();
  pipe.incr(key);
  pipe.expire(key, 86400); // 24 hours
  const results = await pipe.exec();
  const count = Number(results[0] || 1);

  if (count <= 2) {
    return { allowed: true, count, repeatPhoneFlag: false };
  }
  if (count === 3) {
    return { allowed: true, count, repeatPhoneFlag: true };
  }
  return { allowed: false, count, repeatPhoneFlag: false };
}

// ---------------------------------------------------------------------
// Dead Letter Queue: failed:<slug> (14d TTL)
// ---------------------------------------------------------------------
export interface DeadLetterOrder {
  type?: string;
  slug: string;
  orderNumber: string;
  failedChannels: string[];
  errorSummary: string;
  failedAtIso: string;
  orderRecord?: unknown;
}

export async function pushDeadLetterOrder(
  slug: string,
  payload: DeadLetterOrder,
  driver: RedisDriver = getRedisDriver()
): Promise<void> {
  const key = `failed:${slug}`;
  await driver.rpush(key, JSON.stringify(payload));
  await driver.expire(key, 1209600); // 14 days
}

// ---------------------------------------------------------------------
// Order Metadata Storage: ordmeta:<orderNumber> (90d TTL)
// ---------------------------------------------------------------------
export interface OrderMetaRecord {
  slug: string;
  rowRef: string;
  status: string;
  telegramChatId?: string;
  telegramMessageId?: number;
  phone?: string;
  sheetSynced?: boolean;
}

export async function storeOrderMeta(
  orderNumber: string,
  meta: OrderMetaRecord,
  driver: RedisDriver = getRedisDriver()
): Promise<void> {
  const key = `ordmeta:${orderNumber}`;
  await driver.set(key, meta, { ex: 7776000 }); // 90 days
}

export async function getOrderMeta(
  orderNumber: string,
  driver: RedisDriver = getRedisDriver()
): Promise<OrderMetaRecord | null> {
  const key = `ordmeta:${orderNumber}`;
  return driver.get<OrderMetaRecord>(key);
}

export async function updateOrderMetaStatus(
  orderNumber: string,
  newStatus: string,
  sheetSynced?: boolean,
  driver: RedisDriver = getRedisDriver()
): Promise<void> {
  const meta = await getOrderMeta(orderNumber, driver);
  if (meta) {
    meta.status = newStatus;
    if (typeof sheetSynced === "boolean") {
      meta.sheetSynced = sheetSynced;
    }
    await storeOrderMeta(orderNumber, meta, driver);
  }
}

// ---------------------------------------------------------------------
// Order Concurrency Lock: ordlock:<orderNumber> (60s TTL, Owner-Guarded)
// ---------------------------------------------------------------------
export async function acquireOrderLock(
  orderNumber: string,
  lockToken: string,
  ttlSeconds = 60,
  driver: RedisDriver = getRedisDriver()
): Promise<boolean> {
  const key = `ordlock:${orderNumber}`;
  const res = await driver.set(key, lockToken, { nx: true, ex: ttlSeconds });
  return res === "OK";
}

export async function releaseOrderLock(
  orderNumber: string,
  lockToken: string,
  driver: RedisDriver = getRedisDriver()
): Promise<boolean> {
  const key = `ordlock:${orderNumber}`;
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `.trim();
  const res = await driver.eval<number>(luaScript, [key], [lockToken]);
  return res === 1;
}

export async function getOrderLockTtl(
  orderNumber: string,
  driver: RedisDriver = getRedisDriver()
): Promise<number> {
  const key = `ordlock:${orderNumber}`;
  return driver.ttl(key);
}
