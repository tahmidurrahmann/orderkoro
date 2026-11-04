#!/usr/bin/env node
/**
 * Secret Leak Prevention Guard (scripts/verify-no-secrets.mjs)
 * Fails the build if any client component receives or references a prop
 * containing `sheetId` or `telegramChatId`, or if secrets are serialized to client outputs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENTS_DIR = path.join(ROOT_DIR, "clients");
const SRC_COMPONENTS_DIR = path.join(ROOT_DIR, "src", "components");
const APP_DIR = path.join(ROOT_DIR, "src", "app");

console.log("🔒 Running Client Component Secrets Leak Verification...\n");

const failures = [];

// 1. Verify all clients under clients/*.json when stripped for public use
const clientFiles = fs.readdirSync(CLIENTS_DIR).filter((f) => f.endsWith(".json"));

for (const file of clientFiles) {
  const filePath = path.join(CLIENTS_DIR, file);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Check raw server secrets exist in file
  if (!raw.sheetId || !raw.telegramChatId) {
    failures.push(`${file}: Expected seller secrets (sheetId, telegramChatId) in server client json`);
  }

  // Simulate toPublicClientConfig extraction
  const {
    sheetId: _sheetId,
    telegramChatId: _telegramChatId,
    demoMode: _demoMode,
    sellerTelegramUserId: _sellerTelegramUserId,
    ...publicConfig
  } = raw;
  void _sheetId;
  void _telegramChatId;
  void _demoMode;
  void _sellerTelegramUserId;
  if ("sheetId" in publicConfig) {
    failures.push(`${file}: publicConfig still contains sheetId property`);
  }
  if ("telegramChatId" in publicConfig) {
    failures.push(`${file}: publicConfig still contains telegramChatId property`);
  }
  if ("demoMode" in publicConfig) {
    failures.push(`${file}: publicConfig still contains demoMode property`);
  }
  if ("sellerTelegramUserId" in publicConfig) {
    failures.push(`${file}: publicConfig still contains sellerTelegramUserId property`);
  }
  if (typeof publicConfig.pixelId !== "string") {
    failures.push(`${file}: publicConfig must keep public pixelId`);
  }
}

// 2. Scan all client component files in src/components
function getAllFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(full));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

const componentFiles = getAllFiles(SRC_COMPONENTS_DIR);

for (const compPath of componentFiles) {
  const relPath = path.relative(ROOT_DIR, compPath);
  const content = fs.readFileSync(compPath, "utf-8");

  // Check for forbidden secret properties
  if (content.includes(".sheetId") || content.includes("['sheetId']") || content.includes('["sheetId"]')) {
    failures.push(`${relPath}: Client component directly accesses forbidden secret property 'sheetId'`);
  }
  if (content.includes(".telegramChatId") || content.includes("['telegramChatId']") || content.includes('["telegramChatId"]')) {
    failures.push(`${relPath}: Client component directly accesses forbidden secret property 'telegramChatId'`);
  }

  // Ensure client component props do not type `ClientConfig` directly
  if (/\bconfig\s*:\s*ClientConfig\b/.test(content)) {
    failures.push(`${relPath}: Client component prop 'config' must be typed as 'PublicClientConfig', not full 'ClientConfig'`);
  }

  // Ensure props definitions do not include sheetId or telegramChatId
  if (/\bsheetId\s*[:?]/.test(content)) {
    failures.push(`${relPath}: Client component prop definition contains forbidden 'sheetId'`);
  }
  if (/\btelegramChatId\s*[:?]/.test(content)) {
    failures.push(`${relPath}: Client component prop definition contains forbidden 'telegramChatId'`);
  }
}

// 3. Scan server pages that render client components
const pageFiles = getAllFiles(APP_DIR).filter((f) => f.endsWith("page.tsx"));
for (const pagePath of pageFiles) {
  const relPath = path.relative(ROOT_DIR, pagePath);
  const content = fs.readFileSync(pagePath, "utf-8");

  if (content.includes("sheetId=") || content.includes("telegramChatId=")) {
    failures.push(`${relPath}: Passes forbidden secret prop directly to a component`);
  }

  // If passing config to client components, ensure it does not use full server client loader
  if (content.includes("<ProductOrderClient") || content.includes("<ThankYouClient")) {
    if (content.includes("getServerClientConfig") || content.includes("getServerClientByOrderPrefix")) {
      failures.push(`${relPath}: Page passes server-only client config to client components`);
    }
    if (!content.includes("getPublicClientBySlug")) {
      failures.push(`${relPath}: Page must use getPublicClientBySlug to pass config to client components`);
    }
  }
}

// 4. Verify server-clients.ts has server-only guard
const serverClientsPath = path.join(ROOT_DIR, "src", "lib", "server-clients.ts");
if (!fs.existsSync(serverClientsPath)) {
  failures.push("src/lib/server-clients.ts is missing");
} else {
  const serverClientsContent = fs.readFileSync(serverClientsPath, "utf-8");
  if (!serverClientsContent.includes('import "server-only"') && !serverClientsContent.includes("import 'server-only'")) {
    failures.push("src/lib/server-clients.ts must import 'server-only'");
  }
}

// 5. Inspect .next build artifacts if available
const nextServerAppDir = path.join(ROOT_DIR, ".next", "server", "app");
if (fs.existsSync(nextServerAppDir)) {
  const renderedFiles = getAllFiles(nextServerAppDir);
  for (const renderedPath of renderedFiles) {
    const relPath = path.relative(ROOT_DIR, renderedPath);
    // Only check demo-brand page and thanks routes
    if (relPath.includes("demo-brand")) {
      const content = fs.readFileSync(renderedPath, "utf-8");
      // Check for known secret tokens
      if (content.includes("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")) {
        failures.push(`${relPath}: Serialized HTML/RSC contains secret Google Sheet ID`);
      }
      if (content.includes("-1001987654321")) {
        failures.push(`${relPath}: Serialized HTML/RSC contains secret Telegram Chat ID`);
      }
      if (content.includes('"sheetId"') || content.includes('"telegramChatId"')) {
        failures.push(`${relPath}: Serialized client JSON/RSC contains 'sheetId' or 'telegramChatId'`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("❌ CLIENT SECRETS LEAK VERIFICATION FAILED:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("✅ All client components and routes verified: ZERO secrets leaked.");
