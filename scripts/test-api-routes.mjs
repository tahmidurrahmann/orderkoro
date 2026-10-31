import assert from "node:assert/strict";
import { NextRequest } from "next/server";

// Set environment variables for tests
process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret-xyz";
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token-123";

console.log("🧪 Running Next.js Route Handlers Test Suite...\n");

// Import Route Handlers
const { POST: orderHandler } = await import("../src/app/api/order/route.ts");
const { POST: webhookHandler } = await import("../src/app/api/telegram/webhook/route.ts");
const { getOrderBackup, getOrderStatus, getPhoneStats } = await import("../src/lib/redis.ts");

function createJsonPostRequest(url, body, headers = {}) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// -------------------------------------------------------------
// Test 1: POST /api/order - Successful Order
// -------------------------------------------------------------
console.log("1. Testing POST /api/order - Successful Order & Server Pricing...");
const validPayload = {
  slug: "demo-brand",
  name: "মুহাম্মদ আব্দুল্লাহ",
  phone: "+8801712345678",
  district: "Dhaka",
  zoneId: "dhaka-city",
  dhakaArea: "city",
  address: "বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা ১২০৯",
  size: "L (৪২)",
  color: "গভীর নীল (Deep Indigo)",
  quantity: 1,
  note: "সন্ধ্যায় ডেলিভারি দিলে ভালো হয়",
};

const req1 = createJsonPostRequest("/api/order", validPayload, {
  "x-forwarded-for": "10.0.0.1",
});
const res1 = await orderHandler(req1);
const data1 = await res1.json();
if (res1.status !== 200) console.error("res1 error:", data1);
assert.equal(res1.status, 200);
assert.equal(data1.ok, true);
assert.match(data1.orderNumber, /^BNN-\d{6}-\d{4}$/);
assert.equal(data1.summary.subtotal, 1490);
assert.equal(data1.summary.deliveryCharge, 70);
assert.equal(data1.summary.total, 1560);
console.log(`   ✅ Order created: ${data1.orderNumber}, Total: ৳${data1.summary.total}`);

// Verify Redis backup was saved
const savedBackup = await getOrderBackup(data1.orderNumber);
assert.ok(savedBackup);
assert.equal(savedBackup.phone, "01712345678");
assert.equal(savedBackup.status, "new");
console.log("   ✅ Order backup confirmed in Redis.\n");

// -------------------------------------------------------------
// Test 2: POST /api/order - Honeypot Trigger
// -------------------------------------------------------------
console.log("2. Testing POST /api/order - Honeypot Silent Interception...");
const honeypotPayload = {
  ...validPayload,
  website: "https://spam-bot.example",
};
const req2 = createJsonPostRequest("/api/order", honeypotPayload);
const res2 = await orderHandler(req2);
assert.equal(res2.status, 200);
const data2 = await res2.json();
assert.equal(data2.ok, true);
assert.match(data2.orderNumber, /^BOT-\d+/);
const fakeBackup = await getOrderBackup(data2.orderNumber);
assert.equal(fakeBackup, null, "Bot order must NOT be stored in Redis");
console.log("   ✅ Honeypot returned fake success without persisting data.\n");

// -------------------------------------------------------------
// Test 3: POST /api/order - Size Out of Stock
// -------------------------------------------------------------
console.log("3. Testing POST /api/order - Sold Out Size Rejection...");
const unavailableSizePayload = {
  ...validPayload,
  size: "XXL (৪৬)", // available: false in demo-brand.json
};
const req3 = createJsonPostRequest("/api/order", unavailableSizePayload, {
  "x-forwarded-for": "10.0.0.2",
});
const res3 = await orderHandler(req3);
assert.equal(res3.status, 400);
const data3 = await res3.json();
assert.equal(data3.ok, false);
assert.equal(data3.field, "size");
console.log(`   ✅ Unavailable size correctly rejected: ${data3.error}\n`);

// -------------------------------------------------------------
// Test 4: POST /api/order - Invalid Bangladesh Phone
// -------------------------------------------------------------
console.log("4. Testing POST /api/order - Invalid Phone Rejection...");
const invalidPhonePayload = {
  ...validPayload,
  phone: "01234567890", // invalid operator
};
const req4 = createJsonPostRequest("/api/order", invalidPhonePayload, {
  "x-forwarded-for": "10.0.0.3",
});
const res4 = await orderHandler(req4);
assert.equal(res4.status, 400);
const data4 = await res4.json();
assert.equal(data4.ok, false);
assert.equal(data4.field, "phone");
console.log(`   ✅ Invalid phone correctly rejected: ${data4.error}\n`);

// -------------------------------------------------------------
// Test 5: POST /api/telegram/webhook - Secret Token Header Check
// -------------------------------------------------------------
console.log("5. Testing POST /api/telegram/webhook - Secret Token Header Verification...");
const req5NoSecret = createJsonPostRequest("/api/telegram/webhook", {
  message: { text: "/start", chat: { id: "12345" } },
});
const res5NoSecret = await webhookHandler(req5NoSecret);
assert.equal(res5NoSecret.status, 401, "Missing secret header must return 401");

const req5WrongSecret = createJsonPostRequest(
  "/api/telegram/webhook",
  { message: { text: "/start", chat: { id: "12345" } } },
  { "x-telegram-bot-api-secret-token": "wrong-secret-token" }
);
const res5WrongSecret = await webhookHandler(req5WrongSecret);
assert.equal(res5WrongSecret.status, 401, "Wrong secret header must return 401");
console.log("   ✅ Unauthorized webhook attempts correctly blocked with 401.\n");

// -------------------------------------------------------------
// Test 6: POST /api/telegram/webhook - /start Command
// -------------------------------------------------------------
console.log("6. Testing POST /api/telegram/webhook - /start Command Handling...");
const req6Start = createJsonPostRequest(
  "/api/telegram/webhook",
  { message: { text: "/start", chat: { id: "987654321" } } },
  { "x-telegram-bot-api-secret-token": "test-webhook-secret-xyz" }
);
const res6Start = await webhookHandler(req6Start);
assert.equal(res6Start.status, 200);
const data6Start = await res6Start.json();
assert.equal(data6Start.handled, "start_command");
console.log("   ✅ /start successfully recognized and handled.\n");

// -------------------------------------------------------------
// Test 7: POST /api/telegram/webhook - Status Transitions & Idempotency
// -------------------------------------------------------------
console.log("7. Testing POST /api/telegram/webhook - Transitions, Chat Verification & Idempotency...");

// Chat ID mismatch check
const req7WrongChat = createJsonPostRequest(
  "/api/telegram/webhook",
  {
    callback_query: {
      id: "cb_1",
      data: `s:confirm:${data1.orderNumber}`,
      message: { chat: { id: "999999" }, message_id: 101 }, // demo-brand.json telegramChatId is "demo_chat_123"
    },
  },
  { "x-telegram-bot-api-secret-token": "test-webhook-secret-xyz" }
);
const res7WrongChat = await webhookHandler(req7WrongChat);
assert.equal(res7WrongChat.status, 200);
const data7WrongChat = await res7WrongChat.json();
assert.equal(data7WrongChat.error, "Chat ID mismatch");
console.log("   ✅ Chat ID mismatch successfully rejected without state changes.");

// Valid transition: new -> confirmed
const req7Confirm = createJsonPostRequest(
  "/api/telegram/webhook",
  {
    callback_query: {
      id: "cb_2",
      data: `s:confirm:${data1.orderNumber}`,
      message: { chat: { id: "-1001987654321" }, message_id: 101 },
    },
  },
  { "x-telegram-bot-api-secret-token": "test-webhook-secret-xyz" }
);
const res7Confirm = await webhookHandler(req7Confirm);
assert.equal(res7Confirm.status, 200);
const data7Confirm = await res7Confirm.json();
assert.equal(data7Confirm.newStatus, "confirmed");
const statusAfterConfirm = await getOrderStatus(data1.orderNumber);
assert.equal(statusAfterConfirm, "confirmed");
console.log("   ✅ Valid transition (new -> confirmed) applied.");

// Idempotency: double tap confirm
const req7DoubleTap = createJsonPostRequest(
  "/api/telegram/webhook",
  {
    callback_query: {
      id: "cb_2_retry",
      data: `s:confirm:${data1.orderNumber}`,
      message: { chat: { id: "-1001987654321" }, message_id: 101 },
    },
  },
  { "x-telegram-bot-api-secret-token": "test-webhook-secret-xyz" }
);
const res7DoubleTap = await webhookHandler(req7DoubleTap);
assert.equal(res7DoubleTap.status, 200);
const data7DoubleTap = await res7DoubleTap.json();
assert.equal(data7DoubleTap.idempotent, true);
console.log("   ✅ Double-tap callback query handled idempotently.");

// Valid transition: confirmed -> shipped
const req7Shipped = createJsonPostRequest(
  "/api/telegram/webhook",
  {
    callback_query: {
      id: "cb_3",
      data: `s:shipped:${data1.orderNumber}`,
      message: { chat: { id: "-1001987654321" }, message_id: 101 },
    },
  },
  { "x-telegram-bot-api-secret-token": "test-webhook-secret-xyz" }
);
const res7Shipped = await webhookHandler(req7Shipped);
assert.equal(res7Shipped.status, 200);
const data7Shipped = await res7Shipped.json();
assert.equal(data7Shipped.newStatus, "shipped");

// Valid transition: shipped -> delivered (increments customer delivered stats)
const req7Delivered = createJsonPostRequest(
  "/api/telegram/webhook",
  {
    callback_query: {
      id: "cb_4",
      data: `s:delivered:${data1.orderNumber}`,
      message: { chat: { id: "-1001987654321" }, message_id: 101 },
    },
  },
  { "x-telegram-bot-api-secret-token": "test-webhook-secret-xyz" }
);
const res7Delivered = await webhookHandler(req7Delivered);
assert.equal(res7Delivered.status, 200);
const data7Delivered = await res7Delivered.json();
assert.equal(data7Delivered.newStatus, "delivered");

const phoneStats = await getPhoneStats("01712345678");
assert.equal(phoneStats.delivered, 1, "Delivered counter for phone must be incremented to 1");
console.log(`   ✅ Status 'delivered' incremented customer lifetime delivery stat to ${phoneStats.delivered}.`);

// Invalid transition: delivered -> cancelled
const req7Invalid = createJsonPostRequest(
  "/api/telegram/webhook",
  {
    callback_query: {
      id: "cb_5",
      data: `s:cancel:${data1.orderNumber}`,
      message: { chat: { id: "-1001987654321" }, message_id: 101 },
    },
  },
  { "x-telegram-bot-api-secret-token": "test-webhook-secret-xyz" }
);
const res7Invalid = await webhookHandler(req7Invalid);
assert.equal(res7Invalid.status, 200);
const data7Invalid = await res7Invalid.json();
assert.ok(data7Invalid.error?.includes("Invalid status transition"));
console.log("   ✅ Invalid transition from delivered to cancelled prevented.");

console.log("\n🎉 ALL ROUTE HANDLER TESTS (ORDER API & WEBHOOK) PASSED SUCCESSFULLY!\n");
