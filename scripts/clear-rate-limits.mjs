#!/usr/bin/env node
/**
 * Utility script to reset rate limit keys (IP & phone) in Redis during development/testing.
 * Usage:
 *   npm run clear-rate-limits
 */

import { loadScriptEnv, requireEnvVars } from "./lib/load-env.mjs";

loadScriptEnv();

if (process.env.MOCK_INTEGRATIONS === "1") {
  console.log("ℹ️  Running in MOCK_INTEGRATIONS=1 mode (in-memory rate limits reset on restart).");
  process.exit(0);
}

requireEnvVars(["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]);
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

try {
  const keysEndpoint = `${redisUrl}/keys/ratelimit:*`;
  const res = await fetch(keysEndpoint, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  const data = await res.json();
  const keys = data.result || [];

  if (keys.length === 0) {
    console.log("✅ No rate limit keys found in Redis.");
    process.exit(0);
  }

  console.log(`Found ${keys.length} rate limit key(s) to delete:`);
  for (const k of keys) {
    const delRes = await fetch(`${redisUrl}/del/${k}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    const delData = await delRes.json();
    console.log(` - Deleted ${k}: ${delData.result === 1 ? "OK" : "Already expired"}`);
  }

  console.log("✅ Successfully cleared all rate limits.");
  process.exit(0);
} catch (err) {
  console.error("❌ Failed to clear rate limits:", err.message);
  process.exit(1);
}
