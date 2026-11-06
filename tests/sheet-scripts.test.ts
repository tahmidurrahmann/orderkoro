import crypto from "node:crypto";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkSheet } from "../scripts/check-sheet.mjs";
import { checkHeaderMatch, SHEET_HEADERS } from "../scripts/init-sheet.mjs";
import { parseRowNumberFromRowRef, widenSheetColumns } from "../src/lib/server/sheets";

const { privateKey: testPrivateKey } = (
  crypto.generateKeyPairSync as unknown as (
    type: string,
    options: Record<string, unknown>
  ) => { privateKey: string }
)("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const TEST_SA_EMAIL = "orderkoro-sa@example.iam.gserviceaccount.com";

describe("Google Sheet Verification & Hardening Scripts", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MOCK_INTEGRATIONS", "1");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("1. rowRef parsing across varied real tab names", () => {
    it("parses row numbers from required test cases", () => {
      expect(parseRowNumberFromRowRef("Sheet1!A15:AC15")).toBe(15);
      expect(parseRowNumberFromRowRef("'Orders'!A15:AC15")).toBe(15);
      expect(parseRowNumberFromRowRef("'শীট১'!A15:AC15")).toBe(15);
      expect(parseRowNumberFromRowRef("'My Orders'!A15:AC15")).toBe(15);
    });

    it("parses single-cell references, colons in tab titles, and un-prefixed ranges", () => {
      expect(parseRowNumberFromRowRef("'2026:Q1'!A42:AC42")).toBe(42);
      expect(parseRowNumberFromRowRef("A99:AC99")).toBe(99);
      expect(parseRowNumberFromRowRef("'Orders'!A105")).toBe(105);
      expect(parseRowNumberFromRowRef("")).toBeNull();
      expect(parseRowNumberFromRowRef(null as unknown as string)).toBeNull();
    });
  });

  describe("2. checkHeaderMatch and non-header order data detection", () => {
    it("identifies empty rows", () => {
      expect(checkHeaderMatch([])).toEqual({ status: "empty" });
      expect(checkHeaderMatch(["", "   ", ""])).toEqual({ status: "empty" });
      expect(checkHeaderMatch(null as unknown as string[])).toEqual({ status: "empty" });
    });

    it("identifies complete 29-column canonical headers", () => {
      expect(checkHeaderMatch([...SHEET_HEADERS])).toEqual({ status: "complete" });
    });

    it("identifies legacy 25-column headers needing extension", () => {
      expect(checkHeaderMatch(SHEET_HEADERS.slice(0, 25))).toEqual({ status: "needs_extension" });
    });

    it("detects non-header order data in row 1 to prevent overwrite", () => {
      const orderRowInRow1 = [
        "BNN-0001",
        "2026-11-06T10:00:00+06:00",
        "new",
        "Rahim Uddin",
        "01711223344",
        "Dhanmondi, Dhaka",
      ];
      const result = checkHeaderMatch(orderRowInRow1);
      expect(result.status).toBe("mismatched");
      expect(result.isNonHeaderData).toBe(true);
      expect(result.errors?.[0]).toContain("expected 'Order No', found 'BNN-0001'");
    });

    it("detects corrupted/mismatched column layout", () => {
      const corrupted = [...SHEET_HEADERS] as string[];
      corrupted[2] = "SomethingElse";
      const result = checkHeaderMatch(corrupted);
      expect(result.status).toBe("mismatched");
      expect(result.isNonHeaderData).toBe(false);
      expect(result.errors?.[0]).toContain("expected 'Status', found 'SomethingElse'");
    });
  });

  describe("3. checkSheet read-only checker (basic)", () => {
    it("reports READY in mock mode for properly configured store", async () => {
      const res = await checkSheet("demo-brand");
      expect(res.ok).toBe(true);
      expect(res.accessOk).toBe(true);
      expect(res.verdict).toBe("READY");
      expect(res.firstVisibleTab).toBe("Sheet1");
      expect(res.totalTabs).toBe(1);
      expect(res.hasHiddenTabBefore).toBe(false);
      expect(res.row1State).toBe("matches_29");
    });

    it("fails fast on nonexistent store slug", async () => {
      const res = await checkSheet("nonexistent-slug-xyz");
      expect(res.ok).toBe(false);
      expect(res.verdict).toBe("UNSAFE");
      expect(res.reason).toContain("Client config file does not exist");
    });
  });

  describe("4. checkSheet verdict logic with stubbed global fetch (not MOCK_INTEGRATIONS)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("MOCK_INTEGRATIONS", "0");
      vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", TEST_SA_EMAIL);
      vi.stubEnv("GOOGLE_PRIVATE_KEY", testPrivateKey);
    });

    function mockSheetsFetch(options: {
      metaStatus?: number;
      sheets?: Array<{
        properties?: {
          sheetId?: number;
          title?: string;
          hidden?: boolean;
          gridProperties?: { rowCount?: number; columnCount?: number };
        };
      }>;
      row1Values?: string[][];
      colAValues?: string[][];
    }) {
      const metaStatus = options.metaStatus ?? 200;
      const sheets = options.sheets ?? [
        {
          properties: {
            sheetId: 0,
            title: "Sheet1",
            hidden: false,
            gridProperties: { rowCount: 1000, columnCount: 30 },
          },
        },
      ];
      const row1Values = options.row1Values ?? [[...SHEET_HEADERS]];
      const colAValues = options.colAValues ?? [["Order No"], ["BNN-0001"]];

      return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("oauth2.googleapis.com/token")) {
          return new Response(JSON.stringify({ access_token: "mock-token" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("fields=sheets.properties")) {
          if (metaStatus !== 200) {
            return new Response(metaStatus === 403 ? "Forbidden" : "Not Found", {
              status: metaStatus,
            });
          }
          return new Response(JSON.stringify({ sheets }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("!A1:AC1")) {
          return new Response(JSON.stringify({ values: row1Values }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("!A:A")) {
          return new Response(JSON.stringify({ values: colAValues }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not Found", { status: 404 });
      });
    }

    it("verdict READY when 29 headers match and grid has >= 29 columns", async () => {
      mockSheetsFetch({});
      const res = await checkSheet("demo-brand");
      expect(res.accessOk).toBe(true);
      expect(res.verdict).toBe("READY");
      expect(res.reason).toContain("ready for orders");
    });

    describe("NEEDS INIT verdicts", () => {
      it("reports NEEDS INIT when row 1 is empty", async () => {
        mockSheetsFetch({ row1Values: [] });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(true);
        expect(res.verdict).toBe("NEEDS INIT");
        expect(res.reason).toContain("Row 1 is empty");
      });

      it("reports NEEDS INIT when row 1 contains 25 legacy headers", async () => {
        mockSheetsFetch({ row1Values: [SHEET_HEADERS.slice(0, 25)] });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(true);
        expect(res.verdict).toBe("NEEDS INIT");
        expect(res.reason).toContain("Row 1 has legacy 25 headers");
      });

      it("reports NEEDS INIT when grid has under 29 columns", async () => {
        mockSheetsFetch({
          sheets: [
            {
              properties: {
                sheetId: 0,
                title: "Sheet1",
                hidden: false,
                gridProperties: { rowCount: 1000, columnCount: 26 },
              },
            },
          ],
        });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(true);
        expect(res.verdict).toBe("NEEDS INIT");
        expect(res.reason).toContain("Sheet grid has only 26 columns");
      });
    });

    describe("UNSAFE verdicts", () => {
      it("reports UNSAFE when hidden tab exists before the first visible one", async () => {
        mockSheetsFetch({
          sheets: [
            {
              properties: {
                sheetId: 100,
                title: "HiddenArchived",
                hidden: true,
              },
            },
            {
              properties: {
                sheetId: 200,
                title: "Sheet1",
                hidden: false,
                gridProperties: { rowCount: 1000, columnCount: 30 },
              },
            },
          ],
        });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(true);
        expect(res.verdict).toBe("UNSAFE");
        expect(res.reason).toContain("hidden tab(s) before it");
      });

      it("reports UNSAFE when order data lands in row 1", async () => {
        mockSheetsFetch({
          row1Values: [
            [
              "BNN-0001",
              "2026-11-06T10:00:00+06:00",
              "new",
              "Rahim Uddin",
              "01711223344",
            ],
          ],
        });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(true);
        expect(res.verdict).toBe("UNSAFE");
        expect(res.reason).toContain("Row 1 contains non-header order data");
      });

      it("reports UNSAFE when row 1 has mismatched headers", async () => {
        mockSheetsFetch({
          row1Values: [["Order No", "CorruptedHeader", "Status"]],
        });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(true);
        expect(res.verdict).toBe("UNSAFE");
        expect(res.reason).toContain("Row 1 headers do not match canonical layout");
      });

      it("reports UNSAFE when there are no visible tabs", async () => {
        mockSheetsFetch({
          sheets: [
            {
              properties: {
                sheetId: 10,
                title: "HiddenOnly",
                hidden: true,
              },
            },
          ],
        });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(true);
        expect(res.firstVisibleTab).toBeNull();
        expect(res.verdict).toBe("UNSAFE");
        expect(res.reason).toContain("Spreadsheet has no visible sheet tabs");
      });
    });

    describe("HTTP error responses", () => {
      it("reports 403 error and names service account email in action/reason", async () => {
        mockSheetsFetch({ metaStatus: 403 });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(false);
        expect(res.verdict).toBe("UNSAFE");
        expect(res.actionRequired).toContain(TEST_SA_EMAIL);
        expect(res.reason).toContain(TEST_SA_EMAIL);
      });

      it("reports 404 error with 'Wrong sheetId'", async () => {
        mockSheetsFetch({ metaStatus: 404 });
        const res = await checkSheet("demo-brand");
        expect(res.accessOk).toBe(false);
        expect(res.verdict).toBe("UNSAFE");
        expect(res.reason).toContain("Wrong sheetId");
      });
    });
  });

  describe("5. widenSheetColumns resizes first visible tab", () => {
    it("targets the first visible tab rather than sheets[0] if sheets[0] is hidden", async () => {
      vi.stubEnv("MOCK_INTEGRATIONS", "0");
      let batchBody: {
        requests?: Array<{
          updateSheetProperties?: {
            properties?: {
              sheetId?: number;
              gridProperties?: { columnCount?: number };
            };
          };
        }>;
      } | null = null;

      vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("oauth2.googleapis.com/token")) {
          return new Response(JSON.stringify({ access_token: "mock-token" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("fields=sheets.properties")) {
          return new Response(
            JSON.stringify({
              sheets: [
                {
                  properties: {
                    sheetId: 999, // Hidden tab
                    title: "OldArchive",
                    hidden: true,
                    gridProperties: { columnCount: 20 },
                  },
                },
                {
                  properties: {
                    sheetId: 777, // First visible tab
                    title: "OrdersVisible",
                    hidden: false,
                    gridProperties: { columnCount: 26 },
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (url.includes(":batchUpdate")) {
          batchBody = JSON.parse(String(init?.body || "{}"));
          return new Response(JSON.stringify({ replies: [{}] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      });

      await widenSheetColumns("test-sheet-id", 30, "mock-token");
      expect(batchBody).not.toBeNull();
      const capturedBody = batchBody as {
        requests?: Array<{
          updateSheetProperties?: {
            properties?: {
              sheetId?: number;
              gridProperties?: { columnCount?: number };
            };
          };
        }>;
      } | null;
      const updatedSheetId = capturedBody?.requests?.[0]?.updateSheetProperties?.properties?.sheetId;
      expect(updatedSheetId).toBe(777);
      expect(updatedSheetId).not.toBe(999);
    });
  });
});
