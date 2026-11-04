#!/usr/bin/env node
/**
 * Scans .next/static bundle chunks to verify zero secrets reached the client.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const STATIC_DIR = path.join(ROOT_DIR, ".next", "static");
const CLIENTS_DIR = path.join(ROOT_DIR, "clients");

console.log("🔒 Scanning client bundle (.next/static) for forbidden secrets...\n");

if (!fs.existsSync(STATIC_DIR)) {
  console.log("⚠️  .next/static directory not found. Please run next build first.");
  process.exit(0);
}

// Collect secret values to verify
const secretsToCheck = new Map();

// 1. Collect secrets from client json files
if (fs.existsSync(CLIENTS_DIR)) {
  const files = fs.readdirSync(CLIENTS_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(path.join(CLIENTS_DIR, file), "utf8"));
    if (json.sheetId && String(json.sheetId).length > 5) {
      secretsToCheck.set(`client:${file}:sheetId`, String(json.sheetId));
    }
    if (json.telegramChatId && String(json.telegramChatId).length > 3) {
      secretsToCheck.set(`client:${file}:telegramChatId`, String(json.telegramChatId));
    }
  }
}

// 2. Collect environment secrets if defined
const envVars = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "ADMIN_TELEGRAM_CHAT_ID",
];

for (const envKey of envVars) {
  const val = process.env[envKey];
  if (val && val.trim().length > 6) {
    secretsToCheck.set(`env:${envKey}`, val.trim());
  }
}

// 3. Ensure server-only property keys never appear in client bundles
secretsToCheck.set("server-only-prop:demoMode", '"demoMode"');
secretsToCheck.set("server-only-prop:sellerTelegramUserId", '"sellerTelegramUserId"');

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(full));
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".json") || entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

const bundleFiles = scanDir(STATIC_DIR);
let leakFound = false;

for (const file of bundleFiles) {
  const content = fs.readFileSync(file, "utf8");
  const relPath = path.relative(ROOT_DIR, file);

  for (const [name, secret] of secretsToCheck.entries()) {
    if (content.includes(secret)) {
      console.error(`❌ CRITICAL LEAK: ${name} found in client bundle chunk ${relPath}!`);
      leakFound = true;
    }
  }
}

if (leakFound) {
  console.error("\n❌ Build failed: Secrets detected in client output bundles.\n");
  process.exit(1);
}

console.log(`✅ Passed: Scanned ${bundleFiles.length} client chunks against ${secretsToCheck.size} secrets. Zero leaks detected.\n`);
process.exit(0);
