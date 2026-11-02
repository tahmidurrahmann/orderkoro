import {
  buildMobilePaymentInlineKeyboard,
  buildStatusInlineKeyboard,
  buildCallbackData,
  canTransitionStatus,
} from "./src/lib/server/status-machine.ts";

console.log("=== 1. KEYBOARD FOR NEW MOBILE ORDER (Unverified) ===");
const kbMobileNew = buildMobilePaymentInlineKeyboard("Unverified", "TST-0001");
console.log(JSON.stringify(kbMobileNew, null, 2));

console.log("\n=== 2. KEYBOARD AFTER PAYMENT VERIFIED (transitions to new status actions) ===");
const kbVerified = buildStatusInlineKeyboard("new", "TST-0001");
console.log(JSON.stringify(kbVerified, null, 2));

console.log("\n=== 3. KEYBOARD AFTER PAYMENT NOT RECEIVED (late verify allowed) ===");
const kbNotReceived = buildMobilePaymentInlineKeyboard("Not received", "TST-0001");
console.log(JSON.stringify(kbNotReceived, null, 2));

console.log("\n=== 4. KEYBOARD FOR COD ORDER (standard new order) ===");
const kbCod = buildStatusInlineKeyboard("new", "BNN-0001");
console.log(JSON.stringify(kbCod, null, 2));

console.log("\n=== 5. INVALID TRANSITIONS REJECTION ===");
const testTransitions = [
  { from: "new", to: "confirmed", expected: true },
  { from: "new", to: "delivered", expected: false },
  { from: "cancelled", to: "confirmed", expected: false },
  { from: "delivered", to: "shipped", expected: false },
  { from: "returned", to: "new", expected: false },
  { from: "confirmed", to: "new", expected: false },
];
testTransitions.forEach((t) => {
  const allowed = canTransitionStatus(t.from, t.to);
  console.log(`Transition ${t.from} -> ${t.to}: ${allowed ? "ALLOWED" : "REJECTED"} (Expected ${t.expected ? "ALLOWED" : "REJECTED"})`);
});

console.log("\n=== 6. CALLBACK DATA LENGTHS (Limit: 64 bytes) ===");
const sampleCallbacks = [
  `pay:v:TST-0001`,
  `pay:nr:TST-0001`,
  buildCallbackData("confirmed", "TST-0001"),
  buildCallbackData("no_answer", "TST-0001"),
  buildCallbackData("cancelled", "TST-0001"),
  buildCallbackData("shipped", "TST-0001"),
  buildCallbackData("delivered", "TST-0001"),
  buildCallbackData("returned", "TST-0001"),
];
sampleCallbacks.forEach((cb) => {
  const byteLen = Buffer.byteLength(cb, "utf8");
  console.log(`  "${cb}" -> ${byteLen} bytes (${byteLen <= 64 ? "PASS < 64" : "FAIL > 64"})`);
});
