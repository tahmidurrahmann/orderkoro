#!/usr/bin/env node
/**
 * Read-only health check and verification tool for a seller's Google Sheet.
 * Reads metadata, tab visibility, row 1 headers, and row count without modifying data.
 *
 * Usage:
 *   npm run check-sheet -- <slug>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadScriptEnv } from "./lib/load-env.mjs";
import { getGoogleAccessToken, checkHeaderMatch } from "./init-sheet.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

export async function checkSheet(slug) {
  loadScriptEnv();

  if (!slug) {
    return {
      ok: false,
      error: "Please provide a client slug: npm run check-sheet -- <slug>",
      verdict: "UNSAFE",
      reason: "Missing client slug argument",
    };
  }

  const clientFile = path.join(ROOT_DIR, "clients", `${slug}.json`);
  if (!fs.existsSync(clientFile)) {
    return {
      ok: false,
      error: `Client config not found at ${clientFile}`,
      verdict: "UNSAFE",
      reason: `Client config file does not exist for slug "${slug}"`,
    };
  }

  let clientConfig;
  try {
    clientConfig = JSON.parse(fs.readFileSync(clientFile, "utf8"));
  } catch (err) {
    return {
      ok: false,
      error: `Failed to parse client config: ${err.message}`,
      verdict: "UNSAFE",
      reason: "Invalid JSON in client config",
    };
  }

  const sheetId = clientConfig.sheetId;
  if (!sheetId) {
    return {
      ok: false,
      error: `Client config ${slug}.json is missing 'sheetId'`,
      verdict: "UNSAFE",
      reason: "Client config missing sheetId property",
    };
  }

  // Handle mock mode
  if (process.env.MOCK_INTEGRATIONS === "1") {
    return {
      ok: true,
      sheetId,
      accessOk: true,
      serviceAccountEmail: "mock@example.com",
      firstVisibleTab: "Sheet1",
      firstVisibleTabIndex: 0,
      totalTabs: 1,
      hasHiddenTabBefore: false,
      row1State: "matches_29",
      row1Description: "Matches all 29 canonical headers",
      rowCount: 1,
      gridRowCount: 1000,
      gridColumnCount: 30,
      verdict: "READY",
      reason: "Sheet is properly configured with 29 canonical columns and ready for orders.",
    };
  }

  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  if (!saEmail || !saKeyRaw) {
    return {
      ok: false,
      sheetId,
      accessOk: false,
      error: "Missing required environment variables: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY",
      verdict: "UNSAFE",
      reason: "Missing Google Service Account credentials in environment",
    };
  }

  let accessToken;
  try {
    accessToken = await getGoogleAccessToken(saEmail, saKeyRaw);
  } catch (authErr) {
    return {
      ok: false,
      sheetId,
      accessOk: false,
      serviceAccountEmail: saEmail,
      error: `Google OAuth authentication failed: ${authErr.message}`,
      verdict: "UNSAFE",
      reason: "Failed to authenticate service account with Google OAuth",
    };
  }

  // 1. Fetch spreadsheet metadata (read-only)
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
  let metaRes;
  try {
    metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (netErr) {
    return {
      ok: false,
      sheetId,
      accessOk: false,
      serviceAccountEmail: saEmail,
      error: `Network error connecting to Google Sheets API: ${netErr.message}`,
      verdict: "UNSAFE",
      reason: "Network connection failure to Google Sheets API",
    };
  }

  if (!metaRes.ok) {
    if (metaRes.status === 403) {
      return {
        ok: false,
        sheetId,
        accessOk: false,
        status: 403,
        serviceAccountEmail: saEmail,
        actionRequired: `Share the Sheet with ${saEmail} as Editor`,
        verdict: "UNSAFE",
        reason: `Google Service Account does not have Editor access. Share the Sheet with ${saEmail} as Editor.`,
      };
    }
    if (metaRes.status === 404) {
      return {
        ok: false,
        sheetId,
        accessOk: false,
        status: 404,
        serviceAccountEmail: saEmail,
        actionRequired: "Check clients/*.json sheetId value",
        verdict: "UNSAFE",
        reason: `Wrong sheetId or not a Google Sheet (${sheetId})`,
      };
    }
    const errText = await metaRes.text();
    return {
      ok: false,
      sheetId,
      accessOk: false,
      status: metaRes.status,
      serviceAccountEmail: saEmail,
      error: `Google Sheets API returned error HTTP ${metaRes.status}: ${errText}`,
      verdict: "UNSAFE",
      reason: `Google Sheets API returned HTTP ${metaRes.status}`,
    };
  }

  const metaData = await metaRes.json();
  const sheets = metaData.sheets || [];
  const totalTabs = sheets.length;

  // 2. Identify first visible tab and preceding hidden tabs
  let firstVisibleTab = null;
  let firstVisibleTabIndex = -1;
  for (let i = 0; i < sheets.length; i++) {
    if (!sheets[i].properties?.hidden) {
      firstVisibleTab = sheets[i].properties;
      firstVisibleTabIndex = i;
      break;
    }
  }

  if (!firstVisibleTab) {
    return {
      ok: true,
      sheetId,
      accessOk: true,
      serviceAccountEmail: saEmail,
      firstVisibleTab: null,
      firstVisibleTabIndex: -1,
      totalTabs,
      hasHiddenTabBefore: false,
      row1State: "no_visible_tabs",
      row1Description: "No visible tabs found",
      rowCount: 0,
      gridRowCount: 0,
      gridColumnCount: 0,
      verdict: "UNSAFE",
      reason: "Spreadsheet has no visible sheet tabs",
    };
  }

  const hasHiddenTabBefore = firstVisibleTabIndex > 0;
  const tabTitle = firstVisibleTab.title;
  const gridRowCount = firstVisibleTab.gridProperties?.rowCount || 0;
  const gridColumnCount = firstVisibleTab.gridProperties?.columnCount || 0;

  // 3. Read Row 1 and column A data count (read-only)
  const row1Url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    tabTitle
  )}!A1:AC1`;
  const colAUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    tabTitle
  )}!A:A`;

  const [row1Res, colARes] = await Promise.all([
    fetch(row1Url, { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(colAUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
  ]);

  if (!row1Res.ok || !colARes.ok) {
    const errText = !row1Res.ok ? await row1Res.text() : await colARes.text();
    return {
      ok: false,
      sheetId,
      accessOk: true,
      serviceAccountEmail: saEmail,
      firstVisibleTab: tabTitle,
      firstVisibleTabIndex,
      totalTabs,
      hasHiddenTabBefore,
      error: `Failed to read cell values: ${errText}`,
      verdict: "UNSAFE",
      reason: "Failed to read tab values from Google Sheets API",
    };
  }

  const row1Data = await row1Res.json();
  const colAData = await colARes.json();

  const existingHeaders = row1Data.values?.[0] || [];
  const populatedRowCount = colAData.values ? colAData.values.length : 0;

  // 4. Evaluate row 1 content
  const check = checkHeaderMatch(existingHeaders);
  const firstCell = String(existingHeaders[0] || "").trim();

  let row1State = "empty";
  let row1Description = "Row 1 is empty";

  if (check.status === "complete") {
    row1State = "matches_29";
    row1Description = "Matches all 29 canonical headers";
  } else if (check.status === "needs_extension") {
    row1State = "partially_matches";
    row1Description = "Partially matches (first 25 headers present, missing 4 payment columns)";
  } else if (check.status === "empty") {
    row1State = "empty";
    row1Description = "Row 1 is empty";
  } else {
    // Check if it's non-header order data or corrupted layout
    if (check.isNonHeaderData || firstCell !== "Order No") {
      row1State = "non_header_data";
      row1Description = `Contains non-header / order data (Col A contains "${firstCell}")`;
    } else {
      row1State = "mismatched";
      row1Description = `Header mismatch (${check.errors.length} mismatched column(s))`;
    }
  }

  // 5. Determine Verdict
  let verdict = "READY";
  let reason = "Sheet is properly configured with 29 canonical columns and ready for orders.";

  if (hasHiddenTabBefore) {
    verdict = "UNSAFE";
    reason = `First visible tab "${tabTitle}" has ${firstVisibleTabIndex} hidden tab(s) before it. OrderKoro's unqualified API writes will target the hidden sheet.`;
  } else if (row1State === "non_header_data") {
    verdict = "UNSAFE";
    reason = `Row 1 contains non-header order data (found "${firstCell}"). Running init-sheet or taking orders would overwrite/corrupt existing data.`;
  } else if (row1State === "mismatched") {
    verdict = "UNSAFE";
    reason = `Row 1 headers do not match canonical layout. (${check.errors?.[0] || "columns mismatched"})`;
  } else if (row1State === "empty") {
    verdict = "NEEDS INIT";
    reason = `Row 1 is empty. Run "npm run init-sheet -- ${slug}" to write the 29 canonical headers.`;
  } else if (row1State === "partially_matches") {
    verdict = "NEEDS INIT";
    reason = `Row 1 has legacy 25 headers. Run "npm run init-sheet -- ${slug}" to append 4 payment columns (Z1:AC1).`;
  } else if (gridColumnCount < 29) {
    verdict = "NEEDS INIT";
    reason = `Sheet grid has only ${gridColumnCount} columns. Run "npm run init-sheet -- ${slug}" to widen to 30 columns.`;
  }

  return {
    ok: true,
    sheetId,
    accessOk: true,
    serviceAccountEmail: saEmail,
    firstVisibleTab: tabTitle,
    firstVisibleTabIndex,
    totalTabs,
    hasHiddenTabBefore,
    row1State,
    row1Description,
    rowCount: populatedRowCount,
    gridRowCount,
    gridColumnCount,
    verdict,
    reason,
  };
}

async function run() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Please provide a client slug: npm run check-sheet -- <slug>");
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`  OrderKoro Google Sheet Read-Only Check: ${slug}`);
  console.log(`======================================================\n`);

  const res = await checkSheet(slug);

  if (!res.accessOk) {
    console.log(`Access: FAILED`);
    if (res.serviceAccountEmail) {
      console.log(`Service Account: ${res.serviceAccountEmail}`);
    }
    if (res.actionRequired) {
      console.log(`Action Required: ${res.actionRequired}`);
    }
    if (res.error) {
      console.log(`Details: ${res.error}`);
    }
    console.log(`\nFinal Verdict: ${res.verdict}`);
    console.log(`Reason: ${res.reason}\n`);
    process.exit(1);
  }

  console.log(`Access: OK (Connected via ${res.serviceAccountEmail})`);
  console.log(`Spreadsheet ID: ${res.sheetId}`);
  if (!res.firstVisibleTab) {
    console.log(`Tabs: ${res.totalTabs} total tab(s) | First visible: None (All tabs are hidden)`);
  } else {
    console.log(
      `Tabs: ${res.totalTabs} total tab(s) | First visible: "${res.firstVisibleTab}" (Index: ${res.firstVisibleTabIndex})`
    );
    console.log(
      `Preceding Hidden Tabs: ${res.hasHiddenTabBefore ? "YES (UNSAFE)" : "None (Safe)"}`
    );
    console.log(
      `Grid Dimensions: ${res.gridRowCount} rows x ${res.gridColumnCount} columns`
    );
    console.log(`Row 1 State: ${res.row1Description}`);
    console.log(`Populated Rows (Col A): ${res.rowCount}`);
  }
  console.log(`\n------------------------------------------------------`);
  console.log(`Final Verdict: ${res.verdict}`);
  console.log(`Reason: ${res.reason}`);
  console.log(`------------------------------------------------------\n`);

  if (res.verdict === "UNSAFE") {
    process.exit(1);
  }
  process.exit(0);
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  run().catch((err) => {
    console.error("Unexpected error during check-sheet:", err.message || err);
    process.exit(1);
  });
}
