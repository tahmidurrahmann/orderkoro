# OrderPage V1: Deployment & Operations Guide (`docs/DEPLOY.md`)

This guide outlines deployment on Vercel, region selection, environment configuration, custom domains, and pre-launch checklists.

---

## 1. Environment Variables Table

| Variable | Required | Description | Example / Format |
|---|---|---|---|
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical public URL of your deployment (used for OG tags, CORS origin checks) | `https://orders.yourdomain.com` |
| `MOCK_INTEGRATIONS` | Optional | Set to `0` in production (enforces real integrations; `1` is strictly blocked in production) | `0` |
| `ADMIN_TELEGRAM_CHAT_ID` | Yes | Private Telegram Chat ID of the system admin for alerts (must never equal any seller's chat ID) | `6193279242` |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot API token from `@BotFather` | `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ` |
| `TELEGRAM_WEBHOOK_SECRET` | Yes | Random secret token sent in Telegram webhook header (`x-telegram-bot-api-secret-token`) | `openssl rand -hex 32` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Google Cloud Service Account email with Sheets API access | `orderpage-svc@my-project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Yes | Google Service Account private key in PEM format (escaped `\n` characters supported) | `"-----BEGIN PRIVATE KEY-----\nMIIEvgI...\n-----END PRIVATE KEY-----\n"` |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST HTTPS endpoint | `https://prompt-mammal-12345.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST authorization token | `AX7xASQg...` |

---

## 2. Vercel Singapore Region (`sin1`) Setup

To minimize latency for Bangladeshi buyers and sellers, all serverless function execution is pinned to Singapore (`sin1`):

### Option A: Via Repository Config (`vercel.json`)
The repository contains [`vercel.json`](file:///c:/passion/single-product/vercel.json):
```json
{
  "regions": ["sin1"],
  "functions": {
    "src/app/api/**/*": {
      "maxDuration": 15
    }
  }
}
```

### Option B: Via Vercel Web Dashboard
1. Open your project on [vercel.com](https://vercel.com).
2. Go to **Settings** > **Functions**.
3. Under **Function Region**, select **Singapore (sin1)**.
4. Click **Save**.

---

## 3. Custom Domain Setup
1. In Vercel Project Settings, navigate to **Domains**.
2. Add your custom domain or subdomain (e.g., `orders.yourbrand.com`).
3. Add the DNS CNAME record pointing to `cname.vercel-dns.com` in your DNS provider (e.g., Cloudflare, Namecheap).
4. Ensure SSL certificates are issued and HTTPS is enforced.
5. Set `NEXT_PUBLIC_SITE_URL=https://orders.yourbrand.com` in Vercel Environment Variables.

---

## 4. Telegram Webhook Registration

Register the webhook once with Telegram Bot API:
```bash
curl -F "url=https://orders.yourdomain.com/api/telegram/webhook" \
     -F "secret_token=YOUR_TELEGRAM_WEBHOOK_SECRET" \
     https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook
```
Or run the helper script:
```bash
node --env-file=.env scripts/set-telegram-webhook.mjs
```

---

## 5. Pre-Launch Checklist

- [ ] All environment variables set in Vercel (production environment).
- [ ] Vercel region verified as `sin1`.
- [ ] Custom domain DNS verified with valid SSL certificate.
- [ ] `ADMIN_TELEGRAM_CHAT_ID` verified distinct from seller group ID.
- [ ] Shared Google Sheet shared with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor**.
- [ ] Telegram bot added to seller group with admin permissions.
- [ ] Telegram webhook registered and returning `{"ok": true, "result": true}`.
- [ ] `npm run validate:clients` passes with zero errors.
- [ ] `npm run check:secrets` passes with zero leaked server keys.
- [ ] Test order placed on `/<slug>`: Google Sheet appends row, Telegram sends interactive alert, and button click updates status.
- [ ] `GET /api/health` returns `{"ok": true, "version": "1.0.0"}`.
