import { SignJWT, importPKCS8 } from "jose";

export const SHEET_COLUMNS = [
  "Order No",
  "Time (Dhaka)",
  "Name",
  "Phone",
  "District",
  "Zone",
  "Address",
  "Product",
  "Size",
  "Color",
  "Qty",
  "Subtotal",
  "Delivery",
  "Total",
  "Note",
  "Status",
  "Flags",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Content",
  "fbclid",
  "Event ID",
  "_fbp",
  "_fbc",
] as const;

export type SheetColumnName = (typeof SHEET_COLUMNS)[number];

export interface AppendOrderParams {
  sheetId: string;
  orderNumber: string;
  dhakaTime: string;
  name: string;
  phone: string;
  district: string;
  zone: string;
  address: string;
  product: string;
  size: string;
  color: string;
  qty: number;
  subtotal: number;
  delivery: number;
  total: number;
  note: string;
  status: string;
  flags: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  fbclid?: string;
  eventId?: string;
  fbp?: string;
  fbc?: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Formula injection sanitizer:
 * Prefixes cells beginning with =, +, -, or @ with an apostrophe (')
 * to prevent formula injection attacks in spreadsheets.
 */
export function sanitizeSheetCell(value: unknown): string | number {
  if (typeof value === "number") {
    return value;
  }
  const str = String(value ?? "");
  if (str.length > 0 && /^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Signs service account JWT and obtains Google OAuth2 access token for Sheets API.
 * Caches token in memory until 5 minutes before expiry.
 */
export async function getGoogleSheetsAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKeyRaw) {
    throw new Error(
      "Missing Google Service Account credentials: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY."
    );
  }

  // Reuse cached token if valid for at least 5 more minutes
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 300_000) {
    return cachedAccessToken;
  }

  // Handle escaped newlines in environment variable
  const privateKeyPem = privateKeyRaw.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(privateKeyPem, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setSubject(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Google OAuth2 token request failed (${tokenResponse.status}): ${errorBody}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string; expires_in?: number };
  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = Date.now() + (tokenData.expires_in ?? 3600) * 1000;

  return cachedAccessToken;
}

/**
 * Checks whether the header row exists on Sheet1, creating it if empty or missing.
 */
export async function ensureSheetHeader(sheetId: string, accessToken: string): Promise<void> {
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:Y1`;
  const res = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.ok) {
    const data = (await res.json()) as { values?: string[][] };
    if (data.values && data.values.length > 0 && data.values[0].length >= 20) {
      return; // Header already present
    }
  }

  // Write header row
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:Y1?valueInputOption=USER_ENTERED`;
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [SHEET_COLUMNS],
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    console.warn(`[Google Sheets] Warning: Failed to write header row (${putRes.status}): ${err}`);
  }
}

/**
 * Appends an order row to the seller's Google Sheet
 */
export async function appendOrderToGoogleSheet(params: AppendOrderParams): Promise<void> {
  const accessToken = await getGoogleSheetsAccessToken();

  await ensureSheetHeader(params.sheetId, accessToken);

  const row = [
    sanitizeSheetCell(params.orderNumber),
    sanitizeSheetCell(params.dhakaTime),
    sanitizeSheetCell(params.name),
    sanitizeSheetCell(params.phone),
    sanitizeSheetCell(params.district),
    sanitizeSheetCell(params.zone),
    sanitizeSheetCell(params.address),
    sanitizeSheetCell(params.product),
    sanitizeSheetCell(params.size),
    sanitizeSheetCell(params.color),
    params.qty,
    params.subtotal,
    params.delivery,
    params.total,
    sanitizeSheetCell(params.note),
    sanitizeSheetCell(params.status),
    sanitizeSheetCell(params.flags),
    sanitizeSheetCell(params.utmSource ?? ""),
    sanitizeSheetCell(params.utmMedium ?? ""),
    sanitizeSheetCell(params.utmCampaign ?? ""),
    sanitizeSheetCell(params.utmContent ?? ""),
    sanitizeSheetCell(params.fbclid ?? ""),
    sanitizeSheetCell(params.eventId ?? ""),
    sanitizeSheetCell(params.fbp ?? ""),
    sanitizeSheetCell(params.fbc ?? ""),
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${params.sheetId}/values/Sheet1!A:Y:append?valueInputOption=USER_ENTERED`;
  const appendRes = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!appendRes.ok) {
    const errorBody = await appendRes.text();
    throw new Error(`Google Sheets append failed (${appendRes.status}): ${errorBody}`);
  }
}

/**
 * Finds an order row by Order No (Column A) and updates its Status (Column P).
 */
export async function updateOrderStatusInGoogleSheet(
  sheetId: string,
  orderNumber: string,
  newStatus: string
): Promise<boolean> {
  const accessToken = await getGoogleSheetsAccessToken();

  // Fetch Column A to locate order row index
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:A`;
  const getRes = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!getRes.ok) {
    const err = await getRes.text();
    throw new Error(`Failed to read sheet column A (${getRes.status}): ${err}`);
  }

  const data = (await getRes.json()) as { values?: string[][] };
  if (!data.values || data.values.length === 0) {
    return false;
  }

  // 1-based row index in Google Sheets
  const rowIndex = data.values.findIndex((row) => row[0]?.trim() === orderNumber.trim()) + 1;
  if (rowIndex <= 0) {
    return false;
  }

  // Column P is the 16th column (Status)
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!P${rowIndex}?valueInputOption=USER_ENTERED`;
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [[sanitizeSheetCell(newStatus)]],
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Failed to update status in Google Sheet (${putRes.status}): ${err}`);
  }

  return true;
}
