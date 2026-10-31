import assert from "node:assert/strict";

console.log("🧪 Running Stage 2 Test Suite...\n");

// 1. Test Phone Normalization
import { normalizeBdPhone, validateBdPhone } from "../src/lib/phone.ts";

console.log("1. Testing Phone Normalization & Validation...");
assert.equal(normalizeBdPhone("01711223344"), "01711223344");
assert.equal(normalizeBdPhone("+8801711223344"), "01711223344");
assert.equal(normalizeBdPhone("8801711223344"), "01711223344");
assert.equal(normalizeBdPhone("  01711-223344 "), "01711223344");
assert.equal(normalizeBdPhone("০১৭১১২২৩৩৪৪"), "01711223344"); // Bangla digits
assert.equal(normalizeBdPhone("+৮৮০১৭11২২3344"), "01711223344");

assert.equal(validateBdPhone("01711223344").valid, true);
assert.equal(validateBdPhone("০১৭১১২২৩৩৪৪").valid, true);
assert.equal(validateBdPhone("01234567890").valid, false); // invalid operator 012
assert.equal(validateBdPhone("0171122").valid, false); // too short
console.log("   ✅ Phone normalization & validation passed.\n");

// 2. Test Formula Injection Protection
import { sanitizeSheetCell } from "../src/lib/google-sheets.ts";

console.log("2. Testing Google Sheets Formula Injection Protection...");
assert.equal(sanitizeSheetCell("Normal Name"), "Normal Name");
assert.equal(sanitizeSheetCell(1490), 1490);
assert.equal(sanitizeSheetCell("=SUM(A1:A10)"), "'=SUM(A1:A10)");
assert.equal(sanitizeSheetCell("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
assert.equal(sanitizeSheetCell("-10+20"), "'-10+20");
assert.equal(sanitizeSheetCell("@IMPORTXML(...)"), "'@IMPORTXML(...)");
console.log("   ✅ Formula injection protection passed.\n");

// 3. Test Order Number Generation and Dhaka Time
import { generateOrderNumber, getDhakaDateTime } from "../src/lib/redis.ts";

console.log("3. Testing Order Number Generation & Dhaka Time Format...");
const { yymmdd, dhakaFormatted } = getDhakaDateTime();
assert.match(yymmdd, /^\d{6}$/, "yymmdd must be 6 digits");
console.log(`   Dhaka Time: ${dhakaFormatted}, YYMMDD: ${yymmdd}`);

const orderNum1 = await generateOrderNumber("BNN");
const orderNum2 = await generateOrderNumber("BNN");
console.log(`   Generated orders: ${orderNum1}, ${orderNum2}`);
assert.match(orderNum1, /^BNN-\d{6}-0001$/, "Order 1 format mismatch");
assert.match(orderNum2, /^BNN-\d{6}-0002$/, "Order 2 format mismatch");
console.log("   ✅ Order number sequence passed.\n");

// 4. Test Redis Rate Limiting (IP & Phone)
import { checkIpRateLimit, checkPhoneRateLimit } from "../src/lib/redis.ts";

console.log("4. Testing Rate Limiting (IP & Phone)...");
const testIp = `192.168.1.${Math.floor(Math.random() * 10000)}`;
for (let i = 1; i <= 5; i++) {
  const res = await checkIpRateLimit(testIp, 5, 600);
  assert.equal(res.allowed, true, `IP order ${i} should be allowed`);
}
const sixthIpOrder = await checkIpRateLimit(testIp, 5, 600);
assert.equal(sixthIpOrder.allowed, false, "6th order from same IP should be blocked");
console.log("   ✅ IP rate limiter blocked 6th request correctly.");

const testPhone = "01811998877";
const p1 = await checkPhoneRateLimit(testPhone, 3, 86400);
assert.equal(p1.allowed, true);
assert.equal(p1.isRepeat, false);

const p2 = await checkPhoneRateLimit(testPhone, 3, 86400);
assert.equal(p2.allowed, true);
assert.equal(p2.isRepeat, true); // Repeat order flagged

const p3 = await checkPhoneRateLimit(testPhone, 3, 86400);
assert.equal(p3.allowed, true);

const p4 = await checkPhoneRateLimit(testPhone, 3, 86400);
assert.equal(p4.allowed, false, "4th order from same phone should be blocked");
console.log("   ✅ Phone rate limiter allowed 3 orders and blocked 4th correctly.\n");

// 5. Test Telegram escaping & button markup
import {
  escapeHtml,
  getStatusInlineButtons,
  formatTelegramOrderMessage,
} from "../src/lib/telegram.ts";

console.log("5. Testing Telegram HTML Escaping & Buttons...");
assert.equal(
  escapeHtml(`<script>alert("hack & win")</script>`),
  "&lt;script&gt;alert(&quot;hack &amp; win&quot;)&lt;/script&gt;"
);

const newButtons = getStatusInlineButtons("new", "BNN-261101-0001");
assert.equal(newButtons[0][0].callback_data, "s:confirm:BNN-261101-0001");
assert.equal(newButtons[0][1].callback_data, "s:cancel:BNN-261101-0001");

const confirmedButtons = getStatusInlineButtons("confirmed", "BNN-261101-0001");
assert.equal(confirmedButtons[0][0].callback_data, "s:shipped:BNN-261101-0001");
assert.equal(confirmedButtons[0][1].callback_data, "s:cancel:BNN-261101-0001");

const shippedButtons = getStatusInlineButtons("shipped", "BNN-261101-0001");
assert.equal(shippedButtons[0][0].callback_data, "s:delivered:BNN-261101-0001");
assert.equal(shippedButtons[0][1].callback_data, "s:returned:BNN-261101-0001");

const terminalButtons = getStatusInlineButtons("delivered", "BNN-261101-0001");
assert.equal(terminalButtons.length, 0);

console.log("   ✅ Telegram inline keyboard transitions match spec.\n");

// 6. Test Delivery & Pricing Recalculation
import { calculateOrderTotals } from "../src/lib/delivery.ts";
import demoBrand from "../clients/demo-brand.json" with { type: "json" };
import { ClientConfigSchema } from "../src/lib/config-schema.ts";

console.log("6. Testing Server-side Pricing & Delivery Calculations...");
const config = ClientConfigSchema.parse(demoBrand);

// 1 quantity to Dhaka city (price: 1490, delivery: 70 -> total 1560)
const order1 = calculateOrderTotals(config, 1, "Dhaka", "city");
assert.equal(order1.subtotal, 1490);
assert.equal(order1.delivery?.effectiveCharge, 70);
assert.equal(order1.total, 1560);

// 1 quantity to Dhaka suburb (price: 1490, delivery: 100 -> total 1590)
const orderSuburb = calculateOrderTotals(config, 1, "Dhaka", "suburb");
assert.equal(orderSuburb.subtotal, 1490);
assert.equal(orderSuburb.delivery?.effectiveCharge, 100);
assert.equal(orderSuburb.total, 1590);

// 1 quantity Outside Dhaka (Chittagong) (delivery: 130 -> total 1620)
const orderCtg = calculateOrderTotals(config, 1, "Chittagong", "city");
assert.equal(orderCtg.subtotal, 1490);
assert.equal(orderCtg.delivery?.effectiveCharge, 130);
assert.equal(orderCtg.total, 1620);

// Free delivery test (freeDeliveryAbove: 2800) -> 2 quantity = 2980 -> delivery 0
const orderFree = calculateOrderTotals(config, 2, "Chittagong", "city");
assert.equal(orderFree.subtotal, 2980);
assert.equal(orderFree.delivery?.effectiveCharge, 0);
assert.equal(orderFree.delivery?.isFreeDelivery, true);
assert.equal(orderFree.total, 2980);
console.log("   ✅ Server-side delivery & free delivery calculations verified.\n");

console.log("🎉 ALL STAGE 2 UNIT & LOGIC TESTS PASSED SUCCESSFULLY!\n");
