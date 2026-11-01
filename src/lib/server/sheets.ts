import "server-only";

import { SignJWT, importPKCS8 } from "jose";
import { SHEET_HEADERS } from "./sheet-row";

export function verifyHeaderRowMatch(rowValues: unknown[]): void {
  for (let i = 0; i < SHEET_HEADERS.length; i++) {
    const expected = SHEET_HEADERS[i];
    const found = rowValues[i];
    if (found !== expected) {
      throw new Error(`Column ${i + 1}: expected "${expected}", found "${found}"`);
    }
  }
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export async function getGoogleSheetsAccessToken(): Promise<string> {
  if (process.env.MOCK_INTEGRATIONS === "1") {
    return "mock-google-token";
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Missing Google Service Account credentials: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY."
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least 5 more minutes (cached for 50 min)
  if (cachedToken && cachedToken.expiresAt - nowSec > 300) {
    return cachedToken.accessToken;
  }

  const formattedKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  const privateKey = await importPKCS8(formattedKey, "RS256");

  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + 3600)
    .sign(privateKey);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth token exchange failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: tokenData.access_token,
    expiresAt: nowSec + 3000, // 50 minutes
  };

  return cachedToken.accessToken;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs = 8000
): Promise<Response> {
  const doFetch = () =>
    fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });

  let res = await doFetch();
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 600));
    res = await doFetch();
  }
  return res;
}

export interface AppendRowResult {
  updatedRange: string;
}

export async function findOrderRowInSheet(
  sheetId: string,
  orderNumber: string
): Promise<number | null> {
  if (process.env.MOCK_INTEGRATIONS === "1") {
    return null;
  }
  const token = await getGoogleSheetsAccessToken();
  const scanUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:A`;
  const scanRes = await fetchWithRetry(scanUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!scanRes.ok) {
    return null;
  }
  const scanData = (await scanRes.json()) as { values?: string[][] };
  const rows = scanData.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.[0] === orderNumber) {
      return i + 1; // 1-based row index in Google Sheets
    }
  }
  return null;
}

export async function appendOrderRow(
  sheetId: string,
  rowValues: unknown[]
): Promise<AppendRowResult> {
  if (process.env.MOCK_INTEGRATIONS === "1") {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
      throw new Error("MOCK_INTEGRATIONS=1 is forbidden when NODE_ENV=production or VERCEL_ENV=production");
    }
    return { updatedRange: "Sheet1!A2:Y2" };
  }

  const token = await getGoogleSheetsAccessToken();
  const range = "A:Y:append";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`;

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets append failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as {
    updates?: { updatedRange?: string };
  };

  return {
    updatedRange: data.updates?.updatedRange || "Sheet1!A2:Y2",
  };
}

export async function appendOrderRowWithRetry(
  sheetId: string,
  rowValues: unknown[],
  maxRetries = 2,
  checker: (sheetId: string, orderNumber: string) => Promise<number | null> = findOrderRowInSheet
): Promise<AppendRowResult> {
  const orderNumber = String(rowValues[0] || "").trim();
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Before any retry, check Column A for order number to ensure a timeout did not already append it
    if (attempt > 0 && orderNumber) {
      try {
        const existingRow = await checker(sheetId, orderNumber);
        if (existingRow) {
          return {
            updatedRange: `Sheet1!A${existingRow}:Y${existingRow}`,
          };
        }
      } catch {
        // Fall through to retry append if verification scan fails
      }
    }

    try {
      return await appendOrderRow(sheetId, rowValues);
    } catch (err) {
      lastErr = err as Error;
      if (attempt < maxRetries) {
        const delayMs = attempt === 0 ? 500 : 1200;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr || new Error("Failed to append order row after retries");
}

export async function updateSheetOrderStatus(
  sheetId: string,
  rowRef: string,
  orderNumber: string,
  newStatus: string
): Promise<void> {
  if (process.env.MOCK_INTEGRATIONS === "1") {
    return;
  }

  const token = await getGoogleSheetsAccessToken();

  // Extract row number from rowRef (e.g. "Sheet1!A15:Y15" -> 15)
  const match = rowRef.match(/(\d+):[A-Z]+(\d+)/) || rowRef.match(/[A-Z]+(\d+)/);
  let targetRow = match ? parseInt(match[1], 10) : null;

  // Verify Column A matches orderNumber
  if (targetRow) {
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A${targetRow}`;
    const checkRes = await fetchWithRetry(checkUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (checkRes.ok) {
      const checkData = (await checkRes.json()) as { values?: string[][] };
      const valA = checkData.values?.[0]?.[0];
      if (valA !== orderNumber) {
        targetRow = null; // Mismatch, trigger fallback scan
      }
    } else {
      targetRow = null;
    }
  }

  // Fallback: Scan column A to find matching orderNumber
  if (!targetRow) {
    const scanUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:A`;
    const scanRes = await fetchWithRetry(scanUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!scanRes.ok) {
      throw new Error(`Failed to scan Sheet column A (${scanRes.status})`);
    }
    const scanData = (await scanRes.json()) as { values?: string[][] };
    const rows = scanData.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.[0] === orderNumber) {
        targetRow = i + 1;
        break;
      }
    }
  }

  if (!targetRow) {
    throw new Error(`Order ${orderNumber} not found in Google Sheet`);
  }

  // Update Status in Column C (A=1, B=2, C=3)
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/C${targetRow}?valueInputOption=RAW`;
  const updateRes = await fetchWithRetry(updateUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [[newStatus]],
    }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Failed to update status in Google Sheet (${updateRes.status}): ${err}`);
  }
}

export async function updateSheetOrderStatusWithRetry(
  sheetId: string,
  rowRef: string,
  orderNumber: string,
  newStatus: string,
  maxRetries = 2
): Promise<void> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await updateSheetOrderStatus(sheetId, rowRef, orderNumber, newStatus);
    } catch (err) {
      lastErr = err as Error;
      if (attempt < maxRetries) {
        const delayMs = attempt === 0 ? 500 : 1200;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr || new Error(`Failed to update status in Google Sheet after retries: ${orderNumber}`);
}
