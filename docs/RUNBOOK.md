# OrderPage V1: Operations Runbook (`docs/RUNBOOK.md`)

This runbook describes standard operating procedures for incident response, order delivery troubleshooting, credential rotation, and seller pause management.

---

## 1. "Seller Says Order Did Not Arrive"

When a seller reports that a customer placed an order but it is missing from their Google Sheet or Telegram group:

### Step 1: Check Dead Letter Queue in Redis
Failed orders are stored with a 14-day retention in the Redis list `failed:<slug>`.
Inspect failed records using `node` or the Upstash Web Console:
```bash
node --env-file=.env -e "
  import { Redis } from '@upstash/redis';
  const r = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
  const failed = await r.lrange('failed:demo-brand', 0, -1);
  console.log('Failed count:', failed.length, failed);
"
```

### Step 2: Replay Failed Orders
Run the built-in replay utility to resend any failed orders to Google Sheets and Telegram:
```bash
node --env-file=.env scripts/replay-failed.mjs demo-brand
```

### Step 3: Verify Google Sheet Permissions & Column A
1. Open the seller's Google Sheet (`https://docs.google.com/spreadsheets/d/<sheetId>/edit`).
2. Verify that `GOOGLE_SERVICE_ACCOUNT_EMAIL` is listed as an **Editor** in the Sheet's Share settings.
3. Check the bottom rows for any manual edits that may have deleted headers or broken row references.

### Step 4: Verify Telegram Group
1. Confirm the bot is still a member of the seller's Telegram group.
2. Confirm the bot has permission to post messages.
3. If the seller changed groups, send `/start` to the bot in the new group to retrieve the updated Chat ID and update `clients/<slug>.json`.

---

## 2. Leaked Key Emergency Rotation Procedure

If any secret credential is leaked or exposed:

### A. Google Service Account Key Leaked
1. Go to **Google Cloud Console** > **IAM & Admin** > **Service Accounts**.
2. Select your service account > **Keys**.
3. Locate the compromised Key ID and click **Delete**.
4. Click **Add Key** > **Create new key** > **JSON**.
5. Copy the `private_key` value from the newly downloaded JSON.
6. Update `GOOGLE_PRIVATE_KEY` in Vercel Environment Variables.
7. Redeploy the application.

### B. Telegram Bot Token Leaked
1. Open Telegram and message `@BotFather`.
2. Send `/revoke` and select the compromised bot.
3. BotFather will invalidate the old token and issue a new one immediately.
4. Update `TELEGRAM_BOT_TOKEN` in Vercel Environment Variables.
5. Generate a new webhook secret:
   ```bash
   openssl rand -hex 32
   ```
6. Update `TELEGRAM_WEBHOOK_SECRET` in Vercel Environment Variables.
7. Re-register the webhook with Telegram using the new token and secret:
   ```bash
   curl -F "url=https://<your-domain>/api/telegram/webhook" \
        -F "secret_token=<NEW_SECRET>" \
        https://api.telegram.org/bot<NEW_TOKEN>/setWebhook
   ```
8. Redeploy the application.

### C. Upstash Redis Token Leaked
1. In the Upstash Console, select your database > **Details**.
2. Under **REST API**, click **Rotate Token**.
3. Update `UPSTASH_REDIS_REST_TOKEN` in Vercel Environment Variables.
4. Redeploy the application.

---

## 3. Redis Outage Behavior

### What the API Does:
- **Order Number Generation:** If Redis fails, orders fail safely rather than emitting duplicate order IDs.
- **Idempotency & Rate Limiting:** If Redis is unreachable, rate limits fail open to avoid rejecting genuine customer orders during intermittent cache hiccups.
- **Background Persistence:** Google Sheets and Telegram notifications execute independently. If Sheets succeeds but Redis fails, the customer receives confirmation and the seller receives the order row.

### What the Customer Sees:
- If a complete backend failure occurs, the customer sees a friendly error notification:
  *"অর্ডার প্রক্রিয়াকরণে অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"*
- Customer details remain preserved in form state so they do not have to retype their address.

---

## 4. Seller Store Pause Procedure

When a seller requests to temporarily pause orders (e.g. inventory restocking, Eid holiday, courier closure):

1. Open `clients/<slug>.json`.
2. Set `"status": "paused"`.
3. Deploy to production (`git push` or Vercel deploy).

### Result:
- The product page (`/<slug>`) displays a friendly banner informing customers that orders are temporarily paused, with direct one-tap buttons to chat on Messenger or call the seller.
- The order form and mobile sticky button are completely hidden.
- The product page automatically sets `robots: { index: false, follow: false }` to avoid indexing paused campaigns.
- Any direct POST request to `/api/order` for that slug is rejected with HTTP 403 (`code: "STORE_PAUSED"`).

### To Resume Orders:
1. Set `"status": "active"` in `clients/<slug>.json`.
2. Deploy to production.

---

## 5. Uptime Monitoring with UptimeRobot

To monitor store availability 24/7 without creating artificial orders:

1. Log in to [UptimeRobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**.
3. Configure the following monitors:

### Monitor 1: Storefront Page
- **Monitor Type:** `HTTP(s)`
- **Friendly Name:** `OrderPage - Product Storefront`
- **URL:** `https://<your-domain>/demo-brand`
- **Monitoring Interval:** 5 minutes
- **Keyword Monitoring:** `বুনন` (verifies SSR HTML rendering)

### Monitor 2: API Health Check
- **Monitor Type:** `HTTP(s)`
- **Friendly Name:** `OrderPage - API Health Endpoint`
- **URL:** `https://<your-domain>/api/health`
- **Monitoring Interval:** 1 minute
- **Expected Status:** HTTP 200 (returns `{"ok": true, "version": "1.0.0"}`)
