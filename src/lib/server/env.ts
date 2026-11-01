import "server-only";

import { z } from "zod";

export interface ServerEnv {
  NODE_ENV: string;
  NEXT_PUBLIC_SITE_URL: string;
  MOCK_INTEGRATIONS?: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  ADMIN_TELEGRAM_CHAT_ID: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

const REQUIRED_LIVE_VARS = [
  "NEXT_PUBLIC_SITE_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "ADMIN_TELEGRAM_CHAT_ID",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

export function parseServerEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  const nodeEnv = env.NODE_ENV || "development";
  const mockIntegrations = env.MOCK_INTEGRATIONS === "1" ? "1" : undefined;
  const isProduction =
    nodeEnv === "production" ||
    env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (mockIntegrations === "1" && isProduction) {
    throw new Error(
      "MOCK_INTEGRATIONS=1 is forbidden when NODE_ENV=production or VERCEL_ENV=production"
    );
  }

  if (mockIntegrations === "1") {
    const siteUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return {
      NODE_ENV: nodeEnv,
      NEXT_PUBLIC_SITE_URL: siteUrl,
      MOCK_INTEGRATIONS: "1",
      TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN || "mock-telegram-token",
      TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET || "mock-webhook-secret",
      ADMIN_TELEGRAM_CHAT_ID: env.ADMIN_TELEGRAM_CHAT_ID || "0",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "mock@example.com",
      GOOGLE_PRIVATE_KEY: env.GOOGLE_PRIVATE_KEY || "mock-private-key",
      UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL || "http://localhost:8079",
      UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN || "mock-redis-token",
    };
  }

  // Live validation
  const missing: string[] = [];
  for (const key of REQUIRED_LIVE_VARS) {
    if (!env[key] || env[key]?.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const schema = z.object({
    NODE_ENV: z.string().default("development"),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    MOCK_INTEGRATIONS: z.string().optional(),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
    ADMIN_TELEGRAM_CHAT_ID: z.string().min(1),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
    GOOGLE_PRIVATE_KEY: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  });

  return schema.parse(env) as ServerEnv;
}

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv(process.env);
  }
  return cachedEnv;
}
