#!/usr/bin/env node
/**
 * Verifies or initializes the 25-column Google Sheet header row for a seller.
 * Usage:
 *   npm run init-sheet -- <slug>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as jose from "jose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const SHEET_HEADERS = [
  "Order No",
  "Created At",
  "Status",
  "Name",
  "Phone",
  "Address",
  "District",
  "Zone",
  "Product",
  "Color",
  "Size",
  "Qty",
  "Unit Price",
  "Delivery Fee",
  "COD Total",
  "Note",
  "Confirmation Mode",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Content",
  "UTM Term",
  "fbclid",
  "_fbp",
  "_fbc",
];

const slug = process.argv[2];
if (!slug) {
  console.error("❌ Please provide a client slug: npm run init-sheet -- <slug>");
  process.exit(1);
}

const clientFile = path.join(ROOT_DIR, "clients", `${slug}.json`);
if (!fs.existsSync(clientFile)) {
  console.error(`❌ Client config not found at ${clientFile}`);
  process.exit(1);
}

const clientConfig = JSON.parse(fs.readFileSync(clientFile, "utf8"));
const sheetId = clientConfig.sheetId;

if (!sheetId) {
  console.error(`❌ Client config ${slug}.json is missing 'sheetId'`);
  process.exit(1);
}

console.log(`📊 Initializing / Verifying Google Sheet for client: ${slug} (${sheetId})`);

if (process.env.MOCK_INTEGRATIONS === "1") {
  console.log("ℹ️  Running in MOCK_INTEGRATIONS=1 mode (no external Google call)");
  console.log("✅ Verified: Google Sheet headers match 25 canonical columns.");
  process.exit(0);
}

const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const saKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

if (!saEmail || !saKeyRaw) {
  console.error("❌ Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY environment variables.");
  process.exit(1);
}

async function getGoogleAccessToken() {
  const formattedKey = saKeyRaw.replace(/\\n/g, "\n");
  const privateKey = await jose.importPKCS8(formattedKey, "RS256");

  return await new jose.SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(saEmail)
    .setSubject(saEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

async function run() {
  const jwt = await getGoogleAccessToken();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error(`❌ Google OAuth token exchange failed (${tokenRes.status}): ${err}`);
    process.exit(1);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Read Row 1
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Y1`;
  const readRes = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!readRes.ok) {
    const err = await readRes.text();
    console.error(`❌ Google Sheets read failed (${readRes.status}): ${err}`);
    process.exit(1);
  }

  const readData = await readRes.json();
  const existingHeaders = readData.values?.[0] || [];

  if (existingHeaders.length === 0) {
    console.log("📝 Sheet is empty. Writing 25 standard header columns...");
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Y1?valueInputOption=RAW`;
    const writeRes = await fetch(writeUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [SHEET_HEADERS],
      }),
    });

    if (!writeRes.ok) {
      const err = await writeRes.text();
      console.error(`❌ Failed to write headers to Google Sheet (${writeRes.status}): ${err}`);
      process.exit(1);
    }

    console.log(`✅ Successfully initialized Google Sheet with 25 canonical columns for ${slug}`);
    process.exit(0);
  }

  // Compare existing headers
  const mismatches = [];
  for (let i = 0; i < SHEET_HEADERS.length; i++) {
    const expected = SHEET_HEADERS[i];
    const actual = existingHeaders[i] || "";
    if (expected !== actual) {
      mismatches.push(`Column ${i + 1}: expected '${expected}', found '${actual}'`);
    }
  }

  if (mismatches.length > 0) {
    console.error(`❌ Google Sheet header mismatch (${mismatches.length} differences):`);
    mismatches.forEach((m) => console.error(`  - ${m}`));
    process.exit(1);
  }

  console.log(`✅ Google Sheet headers match perfectly (all 25 columns) for ${slug}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
