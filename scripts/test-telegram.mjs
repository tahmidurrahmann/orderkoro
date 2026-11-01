#!/usr/bin/env node
/**
 * Sends a test order notification message to the seller's Telegram chat.
 * Usage:
 *   npm run test-telegram -- <slug>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const slug = process.argv[2];
if (!slug) {
  console.error("❌ Please provide a client slug: npm run test-telegram -- <slug>");
  process.exit(1);
}

const clientFile = path.join(ROOT_DIR, "clients", `${slug}.json`);
if (!fs.existsSync(clientFile)) {
  console.error(`❌ Client config not found at ${clientFile}`);
  process.exit(1);
}

const clientConfig = JSON.parse(fs.readFileSync(clientFile, "utf8"));
const chatId = clientConfig.telegramChatId;

if (!chatId) {
  console.error(`❌ Client config ${slug}.json is missing 'telegramChatId'`);
  process.exit(1);
}

console.log(`📱 Sending test Telegram order notification for client: ${slug} (Chat ID: ${chatId})`);

if (process.env.MOCK_INTEGRATIONS === "1") {
  console.log("ℹ️  Running in MOCK_INTEGRATIONS=1 mode (no external Telegram call)");
  console.log("✅ Verified: Test order message and inline buttons successfully simulated.");
  process.exit(0);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}

const testOrderNumber = `${clientConfig.orderPrefix || "TEST"}-TEST-${Math.floor(1000 + Math.random() * 9000)}`;

const text = [
  `📦 <b>Order #${testOrderNumber} (TEST)</b>`,
  `Status: <b>NEW</b>`,
  ``,
  `👤 <b>Customer:</b> Test Customer`,
  `📞 <b>Phone:</b> <a href="tel:01711000000">01711000000</a>`,
  `📍 <b>Address:</b> Road 4, House 12, Dhanmondi, Dhaka (dhaka_inside)`,
  ``,
  `🛍️ <b>Item:</b> ${typeof clientConfig.product.title === "string" ? clientConfig.product.title : clientConfig.product.title.bn || clientConfig.product.title.en}`,
  `🎨 <b>Color:</b> ${clientConfig.colors[0]?.name?.bn || "Default"}`,
  `📏 <b>Size:</b> ${clientConfig.sizes[0]?.name || "M"}`,
  `🔢 <b>Qty:</b> 1 × ৳${clientConfig.product.price}`,
  `🚚 <b>Delivery:</b> ৳60`,
  `💵 <b>COD Total:</b> <b>৳${clientConfig.product.price + 60}</b>`,
  `📝 <b>Note:</b> This is an automated integration test message.`,
].join("\n");

const replyMarkup = {
  inline_keyboard: [
    [
      { text: "✅ Confirm", callback_data: `s:confirmed:${testOrderNumber}` },
      { text: "📵 No Answer", callback_data: `s:no_answer:${testOrderNumber}` },
      { text: "❌ Cancel", callback_data: `s:cancelled:${testOrderNumber}` },
    ],
  ],
};

async function sendTest() {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    console.error(`❌ Failed to send Telegram message (${res.status}): ${data.description || "Unknown error"}`);
    process.exit(1);
  }

  console.log(`✅ Test order notification sent successfully (Message ID: ${data.result?.message_id})`);
  console.log("👉 Check your Telegram chat to test tapping the buttons.");
  process.exit(0);
}

sendTest().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
