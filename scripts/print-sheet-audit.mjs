import { checkHeaderMatch, SHEET_HEADERS } from "./init-sheet.mjs";

console.log("=== 29-COLUMN SHEET HEADERS ===");
console.log("Total Count:", SHEET_HEADERS.length);
SHEET_HEADERS.forEach((h, idx) => {
  const colLetter = idx < 26 ? String.fromCharCode(65 + idx) : "A" + String.fromCharCode(65 + idx - 26);
  console.log(`  Col ${colLetter} (${idx + 1}): ${h}`);
});

console.log("\n=== INIT-SHEET HEADER CHECKS ===");
console.log("1. Empty row check ([]):", checkHeaderMatch([]));
console.log("2. Legacy 25-col check (needs_extension):", checkHeaderMatch(SHEET_HEADERS.slice(0, 25)));
console.log("3. Complete 29-col check (complete):", checkHeaderMatch([...SHEET_HEADERS]));
console.log("4. Mismatched base header check:", checkHeaderMatch(["Wrong Order No", ...SHEET_HEADERS.slice(1)]));
console.log("5. Mismatched payment header check:", checkHeaderMatch([...SHEET_HEADERS.slice(0, 25), "Wrong Method", "Wrong Status", "Wrong Trx", "Wrong Phone"]));
