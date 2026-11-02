import "server-only";

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
] as const;

export interface OrderAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  _fbp?: string;
  _fbc?: string;
}

export interface OrderRecordForSheet {
  orderNumber: string;
  createdAtDhakaIso: string;
  status: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  zone: string;
  productTitle: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  deliveryFee: number;
  codTotal: number;
  note?: string;
  confirmationMode: string;
  attribution?: OrderAttribution;
  paymentMethod?: string;
  paymentStatus?: "COD" | "Unverified" | "Verified" | "Not received";
  trxId?: string;
  paidFrom?: string;
}

/**
 * Formula Injection Protection:
 * Prefixes any string starting with =, +, -, @, \t, \r (including any leading whitespace before them) with an apostrophe.
 */
export function sanitizeSpreadsheetCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // Match =, +, -, @, \t, \r even after leading whitespace
  if (/^\s*[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function buildSheetRow(record: OrderRecordForSheet): unknown[] {
  const attr = record.attribution || {};

  return [
    record.orderNumber, // 0: Order No
    record.createdAtDhakaIso, // 1: Created At
    record.status, // 2: Status
    sanitizeSpreadsheetCell(record.name), // 3: Name
    String(record.phone || ""), // 4: Phone (string with leading 0 preserved)
    sanitizeSpreadsheetCell(record.address), // 5: Address
    sanitizeSpreadsheetCell(record.district), // 6: District
    sanitizeSpreadsheetCell(record.zone), // 7: Zone
    sanitizeSpreadsheetCell(record.productTitle), // 8: Product
    sanitizeSpreadsheetCell(record.color), // 9: Color
    sanitizeSpreadsheetCell(record.size), // 10: Size
    Number(record.quantity), // 11: Qty (number)
    Number(record.unitPrice), // 12: Unit Price (number)
    Number(record.deliveryFee), // 13: Delivery Fee (number)
    Number(record.codTotal), // 14: COD Total (number)
    sanitizeSpreadsheetCell(record.note || ""), // 15: Note
    sanitizeSpreadsheetCell(record.confirmationMode || ""), // 16: Confirmation Mode
    sanitizeSpreadsheetCell(attr.utm_source || ""), // 17: UTM Source
    sanitizeSpreadsheetCell(attr.utm_medium || ""), // 18: UTM Medium
    sanitizeSpreadsheetCell(attr.utm_campaign || ""), // 19: UTM Campaign
    sanitizeSpreadsheetCell(attr.utm_content || ""), // 20: UTM Content
    sanitizeSpreadsheetCell(attr.utm_term || ""), // 21: UTM Term
    sanitizeSpreadsheetCell(attr.fbclid || ""), // 22: fbclid
    sanitizeSpreadsheetCell(attr._fbp || ""), // 23: _fbp
    sanitizeSpreadsheetCell(attr._fbc || ""), // 24: _fbc
    sanitizeSpreadsheetCell(record.paymentMethod || "cod"), // 25: Payment Method
    sanitizeSpreadsheetCell(
      record.paymentStatus || (record.paymentMethod === "cod" || !record.paymentMethod ? "COD" : "Unverified")
    ), // 26: Payment Status
    sanitizeSpreadsheetCell(record.trxId || ""), // 27: TrxID
    String(record.paidFrom || ""), // 28: Paid From Number (string with leading 0 preserved)
  ];
}
