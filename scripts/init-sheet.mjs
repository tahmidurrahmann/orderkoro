#!/usr/bin/env node
/**
 * Verifies or initializes the 29-column Google Sheet header row for a seller.
 * Extends an existing 25-column header without overwriting data.
 * Applies freeze, bold, note, and warning-only protection to row 1 idempotently.
 *
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

export async function getGoogleAccessToken(saEmail, saKeyRaw) {
  const formattedKey = saKeyRaw.replace(/\\n/g, "\n");
  const privateKey = await jose.importPKCS8(formattedKey, "RS256");

  const jwt = await new jose.SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(saEmail)
    .setSubject(saEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

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
    throw new Error(`Google OAuth token exchange failed (${tokenRes.status}): ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

export function isGridLimitsError(err) {
  const lower = String(err || "").toLowerCase();
  return (
    lower.includes("grid limit") ||
    lower.includes("exceeds grid") ||
    lower.includes("out of bounds") ||
    lower.includes("end of the sheet") ||
    lower.includes("sheet limits")
  );
}

export function checkHeaderMatch(existingHeaders) {
  if (
    !existingHeaders ||
    existingHeaders.length === 0 ||
    existingHeaders.every((c) => !c || String(c).trim() === "")
  ) {
    return { status: "empty" };
  }

  // Detect non-header data: if Column A has value that does not equal "Order No"
  const firstCell = String(existingHeaders[0] || "").trim();
  const isOrderOrNonHeader =
    firstCell !== "Order No" &&
    firstCell.length > 0 &&
    (firstCell.includes("-") || !firstCell.toLowerCase().includes("order"));

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
    return {
      status: "mismatched",
      isNonHeaderData: isOrderOrNonHeader,
      errors: baseMismatches,
    };
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
      return { status: "mismatched", isNonHeaderData: false, errors: extensionMismatches };
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
    console.log("Verified: Row 1 frozen, bolded, protected with warning, note on A1.");
    process.exit(0);
  }

  requireEnvVars(["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"]);
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  let accessToken;
  try {
    accessToken = await getGoogleAccessToken(saEmail, saKeyRaw);
  } catch (authErr) {
    console.error(`Authentication error: ${authErr.message}`);
    process.exit(1);
  }

  // 1. Fetch spreadsheet metadata (properties and protected ranges)
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties,sheets.protectedRanges`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    if (metaRes.status === 403) {
      console.error(
        `❌ Access Denied (HTTP 403): Share the Sheet with ${saEmail} as Editor`
      );
    } else if (metaRes.status === 404) {
      console.error(
        `❌ Not Found (HTTP 404): Wrong sheetId or not a Google Sheet (${sheetId})`
      );
    } else {
      console.error(`Google Sheets metadata read failed (${metaRes.status}): ${errText}`);
    }
    process.exit(1);
  }

  const metaData = await metaRes.json();
  const sheets = metaData.sheets || [];

  // Find the first visible tab
  let targetSheet = null;
  let targetSheetIndex = -1;
  for (let i = 0; i < sheets.length; i++) {
    if (!sheets[i].properties?.hidden) {
      targetSheet = sheets[i];
      targetSheetIndex = i;
      break;
    }
  }

  if (!targetSheet) {
    console.error("❌ No visible sheet tabs found in this spreadsheet.");
    process.exit(1);
  }

  const targetSheetId = targetSheet.properties.sheetId;
  const targetTitle = targetSheet.properties.title;
  const currentColumnCount = targetSheet.properties.gridProperties?.columnCount || 26;

  if (targetSheetIndex > 0) {
    console.warn(
      `⚠️ Warning: First visible tab "${targetTitle}" is at tab index ${targetSheetIndex} with hidden tab(s) preceding it.`
    );
  }

  // 2. Read Row 1 up to AC (29 columns)
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    targetTitle
  )}!A1:AC1`;
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

  // 3. Evaluate and handle header states
  if (check.status === "empty") {
    console.log(`Sheet "${targetTitle}" is empty. Writing 29 standard header columns...`);
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
      targetTitle
    )}!A1:AC1?valueInputOption=RAW`;

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
      console.error(`Failed to write headers to Google Sheet (${writeRes.status}): ${err}`);
      process.exit(1);
    }
    console.log(`✅ Written 29 canonical headers to "${targetTitle}".`);
  } else if (check.status === "needs_extension") {
    console.log(`Existing 25 columns match canonical headers. Appending 4 payment columns (Z1:AC1)...`);
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
      targetTitle
    )}!Z1:AC1?valueInputOption=RAW`;
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
      console.error(`Failed to extend headers in Google Sheet (${appendRes.status}): ${err}`);
      process.exit(1);
    }
    console.log(`✅ Extended headers with 4 payment columns in "${targetTitle}".`);
  } else if (check.status === "complete") {
    console.log(`✅ Google Sheet headers already match all 29 canonical columns in "${targetTitle}".`);
  } else {
    // Mismatched or non-header data
    const firstCell = String(existingHeaders[0] || "").trim();
    if (check.isNonHeaderData || firstCell !== "Order No") {
      console.error(`\n❌ ABORT: Row 1 contains non-header data (found in Col A: "${firstCell}").`);
      console.error(
        `An order or other customer data has already landed in row 1. To prevent data corruption, init-sheet will NEVER overwrite existing row data.`
      );
      console.error(
        `Action required: Inspect the sheet manually, insert an empty row at row 1, and re-run.\n`
      );
    } else {
      console.error(`\n❌ Google Sheet header mismatch (${check.errors.length} differences):`);
      check.errors.forEach((m) => console.error(`  - ${m}`));
    }
    process.exit(1);
  }

  // 4. Apply formatting, freeze, note, and warning-only protection (Idempotent)
  console.log(`Applying row 1 formatting, freeze, note, and protection...`);

  const existingProtected = targetSheet.protectedRanges || [];
  const alreadyProtected = existingProtected.some((p) => {
    const r = p.range;
    const rangeSheetId = r?.sheetId ?? 0;
    return (
      r &&
      rangeSheetId === targetSheetId &&
      r.startRowIndex === 0 &&
      r.endRowIndex === 1 &&
      p.warningOnly === true
    );
  });

  const batchRequests = [
    // Ensure at least 30 columns and freeze row 1
    {
      updateSheetProperties: {
        properties: {
          sheetId: targetSheetId,
          gridProperties: {
            columnCount: Math.max(currentColumnCount, 30),
            frozenRowCount: 1,
          },
        },
        fields: "gridProperties.columnCount,gridProperties.frozenRowCount",
      },
    },
    // Bold row 1 (columns A through AC: indices 0..29)
    {
      repeatCell: {
        range: {
          sheetId: targetSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 29,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
            },
          },
        },
        fields: "userEnteredFormat.textFormat.bold",
      },
    },
    // Add protective explanatory note on cell A1
    {
      repeatCell: {
        range: {
          sheetId: targetSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        cell: {
          note: "OrderKoro writes by column position. Do not insert, delete, move or rename columns, and do not add or hide tabs before this one.",
        },
        fields: "note",
      },
    },
  ];

  // Protect row 1 with warningOnly if not already protected
  if (!alreadyProtected) {
    batchRequests.push({
      addProtectedRange: {
        protectedRange: {
          range: {
            sheetId: targetSheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 29,
          },
          description: "OrderKoro Header Protection",
          warningOnly: true,
        },
      },
    });
  }

  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
  const batchRes = await fetch(batchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: batchRequests,
    }),
  });

  if (!batchRes.ok) {
    const errText = await batchRes.text();
    console.warn(`Notice during batch formatting (${batchRes.status}): ${errText}`);
  } else {
    console.log(`✅ Row 1 frozen and bolded.`);
    console.log(`✅ Explanatory note added to cell A1.`);
    if (!alreadyProtected) {
      console.log(`✅ Row 1 protected with edit warning (warning-only).`);
    } else {
      console.log(`ℹ️ Row 1 edit warning protection already in place.`);
    }
  }

  console.log(`\n🎉 Google Sheet initialization complete for client "${slug}". Ready for production.`);
  process.exit(0);
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  run().catch((err) => {
    console.error("Unexpected error:", err.message || err);
    process.exit(1);
  });
}
