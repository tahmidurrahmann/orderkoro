#!/usr/bin/env node
/**
 * Verifies or initializes the 29-column Google Sheet header row for a seller.
 * Extends an existing 25-column header without overwriting data.
 * Usage:
 *   npm run init-sheet -- <slug>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as jose from "jose";
import { loadScriptEnv, requireEnvVars } from "./lib/load-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

export const SHEET_HEADERS = [
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
  "Payment Method",
  "Payment Status",
  "TrxID",
  "Paid From Number",
];

async function getGoogleAccessToken(saEmail, saKeyRaw) {
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

async function widenSheetColumns(sheetId, accessToken, minColumns = 30) {
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
  const res = await fetch(batchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              gridProperties: {
                columnCount: Math.max(minColumns, 30),
              },
            },
            fields: "gridProperties.columnCount",
          },
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`Widen columns notice: ${err}`);
  }
}

function isGridLimitsError(err) {
  const lower = String(err || "").toLowerCase();
  return lower.includes("grid limit") || lower.includes("exceeds grid") || lower.includes("out of bounds");
}

export function checkHeaderMatch(existingHeaders) {
  if (!existingHeaders || existingHeaders.length === 0) {
    return { status: "empty" };
  }

  // 1. Verify first 25 columns match exactly
  const baseMismatches = [];
  for (let i = 0; i < 25; i++) {
    const expected = SHEET_HEADERS[i];
    const actual = existingHeaders[i] || "";
    if (expected !== actual) {
      baseMismatches.push(`Column ${i + 1}: expected '${expected}', found '${actual}'`);
    }
  }

  if (baseMismatches.length > 0) {
    return { status: "mismatched", errors: baseMismatches };
  }

  // 2. Check if all 29 columns already match
  if (existingHeaders.length >= 29) {
    const extensionMismatches = [];
    for (let i = 25; i < 29; i++) {
      const expected = SHEET_HEADERS[i];
      const actual = existingHeaders[i] || "";
      if (expected !== actual) {
        extensionMismatches.push(`Column ${i + 1}: expected '${expected}', found '${actual}'`);
      }
    }
    if (extensionMismatches.length > 0) {
      return { status: "mismatched", errors: extensionMismatches };
    }
    return { status: "complete" };
  }

  // First 25 match, but missing the 4 payment columns
  return { status: "needs_extension" };
}

async function run() {
  loadScriptEnv();

  const slug = process.argv[2];
  if (!slug) {
    console.error("Please provide a client slug: npm run init-sheet -- <slug>");
    process.exit(1);
  }

  const clientFile = path.join(ROOT_DIR, "clients", `${slug}.json`);
  if (!fs.existsSync(clientFile)) {
    console.error(`Client config not found at ${clientFile}`);
    process.exit(1);
  }

  const clientConfig = JSON.parse(fs.readFileSync(clientFile, "utf8"));
  const sheetId = clientConfig.sheetId;

  if (!sheetId) {
    console.error(`Client config ${slug}.json is missing 'sheetId'`);
    process.exit(1);
  }

  console.log(`Initializing / Verifying Google Sheet for client: ${slug} (${sheetId})`);

  if (process.env.MOCK_INTEGRATIONS === "1") {
    console.log("Running in MOCK_INTEGRATIONS=1 mode (no external Google call)");
    console.log("Verified: Google Sheet headers match 29 canonical columns.");
    process.exit(0);
  }

  requireEnvVars(["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"]);
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  const jwt = await getGoogleAccessToken(saEmail, saKeyRaw);
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
    console.error(`Google OAuth token exchange failed (${tokenRes.status}): ${err}`);
    process.exit(1);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Read Row 1 up to AC (29 columns)
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:AC1`;
  const readRes = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!readRes.ok) {
    const err = await readRes.text();
    console.error(`Google Sheets read failed (${readRes.status}): ${err}`);
    process.exit(1);
  }

  const readData = await readRes.json();
  const existingHeaders = readData.values?.[0] || [];

  const check = checkHeaderMatch(existingHeaders);

  if (check.status === "empty") {
    console.log("Sheet is empty. Writing 29 standard header columns...");
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:AC1?valueInputOption=RAW`;
    let writeRes = await fetch(writeUrl, {
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
      if (isGridLimitsError(err)) {
        console.log("Sheet grid too narrow. Widening to 30 columns...");
        await widenSheetColumns(sheetId, accessToken, 30);
        writeRes = await fetch(writeUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [SHEET_HEADERS],
          }),
        });
      }
      if (!writeRes.ok) {
        const retryErr = await writeRes.text();
        console.error(`Failed to write headers to Google Sheet (${writeRes.status}): ${retryErr}`);
        process.exit(1);
      }
    }

    console.log(`Successfully initialized Google Sheet with 29 canonical columns for ${slug}`);
    process.exit(0);
  }

  if (check.status === "mismatched") {
    console.error(`Google Sheet header mismatch (${check.errors.length} differences):`);
    check.errors.forEach((m) => console.error(`  - ${m}`));
    process.exit(1);
  }

  if (check.status === "needs_extension") {
    console.log("Existing 25 columns match canonical headers. Appending 4 payment columns (Z1:AC1)...");
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Z1:AC1?valueInputOption=RAW`;
    const appendHeaders = SHEET_HEADERS.slice(25);
    let appendRes = await fetch(appendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [appendHeaders],
      }),
    });

    if (!appendRes.ok) {
      const err = await appendRes.text();
      if (isGridLimitsError(err)) {
        console.log("Sheet grid too narrow. Widening to 30 columns...");
        await widenSheetColumns(sheetId, accessToken, 30);
        appendRes = await fetch(appendUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [appendHeaders],
          }),
        });
      }
      if (!appendRes.ok) {
        const retryErr = await appendRes.text();
        console.error(`Failed to extend headers in Google Sheet (${appendRes.status}): ${retryErr}`);
        process.exit(1);
      }
    }

    console.log(`Successfully extended Google Sheet to 29 canonical columns for ${slug}`);
    process.exit(0);
  }

  console.log(`Google Sheet headers match perfectly (all 29 columns) for ${slug}`);
  process.exit(0);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  run().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
}
