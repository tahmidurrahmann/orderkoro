#!/usr/bin/env node
/**
 * Utility script to reset rate limit keys (IP & phone) in Redis during development/testing.
 * Usage:
 *   npm run clear-rate-limits
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

if (process.env.MOCK_INTEGRATIONS === "1") {
  console.log("ℹ️  Running in MOCK_INTEGRATIONS=1 mode (in-memory rate limits reset on restart).");
  process.exit(0);
}

let redisUrl = process.env.UPSTASH_REDIS_REST_URL;
let redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  const envPath = path.join(ROOT_DIR, ".env");
  if (fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, "utf8");
    const urlMatch = envText.match(/UPSTASH_REDIS_REST_URL=["']?([^"'\r\n]+)/);
    const tokenMatch = envText.match(/UPSTASH_REDIS_REST_TOKEN=["']?([^"'\r\n]+)/);
    if (urlMatch) redisUrl = urlMatch[1].trim();
    if (tokenMatch) redisToken = tokenMatch[1].trim();
  }
}

if (!redisUrl || !redisToken) {
  console.error("❌ Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN.");
  process.exit(1);
}

try {
  const res = await fetch(`${redisUrl}/keys/rl:*`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  const data = await res.json();
  const keys = data.result || [];

  if (keys.length === 0) {
    console.log("✅ No active rate limit keys found in Redis.");
    process.exit(0);
  }

  for (const k of keys) {
    await fetch(`${redisUrl}/del/${encodeURIComponent(k)}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
  }

  console.log(`✅ Successfully cleared ${keys.length} rate limit key(s) from Redis.`);
} catch (err) {
  console.error("❌ Failed to clear rate limits:", err.message);
  process.exit(1);
}
