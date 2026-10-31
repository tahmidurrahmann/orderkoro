#!/usr/bin/env node
/**
 * Registers the Telegram Bot Webhook with a secret token header.
 * Never prints TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET to stdout/stderr.
 *
 * Usage:
 *   WEBHOOK_URL="https://your-domain.com/api/telegram/webhook" node scripts/set-telegram-webhook.mjs
 */

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const webhookUrl = process.env.WEBHOOK_URL || process.argv[2];

if (!botToken) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}

if (!webhookSecret) {
  console.error("❌ Missing TELEGRAM_WEBHOOK_SECRET environment variable.");
  process.exit(1);
}

if (!webhookUrl || !webhookUrl.startsWith("https://")) {
  console.error(
    "❌ Please provide a valid HTTPS WEBHOOK_URL (e.g. https://example.com/api/telegram/webhook)."
  );
  process.exit(1);
}

async function registerWebhook() {
  const endpoint = `https://api.telegram.org/bot${botToken}/setWebhook`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    console.error(
      `❌ Telegram setWebhook failed (HTTP ${response.status}): ${
        data.description || "Unknown error"
      }`
    );
    process.exit(1);
  }

  console.log(`✅ Telegram webhook registered for ${webhookUrl}`);
}

registerWebhook().catch((err) => {
  console.error(`❌ Failed to register Telegram webhook: ${err.message}`);
  process.exit(1);
});
