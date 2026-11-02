#!/usr/bin/env node
/**
 * Dead-letter queue replay tool for failed order writes.
 * Usage:
 *   npm run replay-failed -- <slug>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadScriptEnv, requireEnvVars } from "./lib/load-env.mjs";

loadScriptEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const slug = process.argv[2];
if (!slug) {
  console.error("❌ Please provide a client slug: npm run replay-failed -- <slug>");
  process.exit(1);
}

const clientFile = path.join(ROOT_DIR, "clients", `${slug}.json`);
if (!fs.existsSync(clientFile)) {
  console.error(`❌ Client config not found at ${clientFile}`);
  process.exit(1);
}

console.log(`🔄 Replaying dead-letter queue orders for: ${slug}`);

if (process.env.MOCK_INTEGRATIONS === "1") {
  console.log("ℹ️  Running in MOCK_INTEGRATIONS=1 mode");
  console.log("✅ Dead-letter queue for failed:" + slug + " is empty (0 orders).");
  process.exit(0);
}

requireEnvVars(["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]);
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

async function run() {
  const listKey = `failed:${slug}`;
  // Read all items from list
  const lrangeUrl = `${redisUrl}/lrange/${listKey}/0/-1`;
  const res = await fetch(lrangeUrl, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });

  if (!res.ok) {
    console.error(`❌ Redis lrange failed (${res.status})`);
    process.exit(1);
  }

  const data = await res.json();
  const items = data.result || [];

  if (items.length === 0) {
    console.log(`✅ Dead-letter queue for ${listKey} is empty (0 failed orders).`);
    process.exit(0);
  }

  console.log(`📋 Found ${items.length} failed order(s) in ${listKey}:`);
  for (let i = 0; i < items.length; i++) {
    try {
      const parsed = typeof items[i] === "string" ? JSON.parse(items[i]) : items[i];
      console.log(`  [${i + 1}] Order: ${parsed.orderNumber || "unknown"} | Reason: ${parsed.reason || "unknown"} | Failed channels: ${JSON.stringify(parsed.failedChannels || [])}`);
    } catch {
      console.log(`  [${i + 1}] Raw entry: ${items[i]}`);
    }
  }

  console.log("\n⚠️  To safely re-dispatch these orders, fix the underlying external credentials (Sheets/Telegram) and execute the replay worker.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
