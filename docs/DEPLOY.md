# OrderPage: Deployment Checklist (`docs/DEPLOY.md`)

Use this checklist before launching a new deployment or onboarding a live seller campaign.

## 1. Environment Variables
Verify that all required secrets are configured in your hosting provider (Vercel / Cloudflare Pages / Docker) and **never** placed in `clients/*.json`:

- [ ] `TELEGRAM_BOT_TOKEN`: Shared bot token from `@BotFather`
- [ ] `TELEGRAM_WEBHOOK_SECRET`: 32+ character random alphanumeric string (`openssl rand -hex 32`)
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Service account email (`...@....iam.gserviceaccount.com`)
- [ ] `GOOGLE_PRIVATE_KEY`: PEM private key (escaped `\n` newlines supported)
- [ ] `UPSTASH_REDIS_REST_URL`: Upstash Redis HTTPS endpoint
- [ ] `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST token

## 2. Google Sheet Setup (Per Seller)
- [ ] Create a new Google Sheet for the seller and copy its Sheet ID from the URL (`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`).
- [ ] Share the Google Sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor**.
- [ ] Set `sheetId` in `clients/<slug>.json`. (The header row and `Status` dropdown validation are initialized automatically on first order.)

## 3. Telegram Bot Setup
- [ ] Register the webhook once for the shared bot:
  ```bash
  WEBHOOK_URL="https://<your-domain>/api/telegram/webhook" node scripts/set-telegram-webhook.mjs
  ```
- [ ] Add the shared Telegram bot to the seller's order group (or ask the seller to message `/start` to the bot) to obtain their `telegramChatId`.
- [ ] Set `telegramChatId` in `clients/<slug>.json`.

## 4. Build & End-to-End Test Order
- [ ] Run `npm run validate:clients` and `npm run build` to verify zero schema or `orderPrefix` collision errors.
- [ ] Submit a test order on `/<slug>` using a real test phone number.
- [ ] Confirm the order appears in the seller's Google Sheet and Telegram chat with working inline status buttons (`Confirm` / `Cancel`).
- [ ] Confirm the `/<slug>/thanks` page displays the order number and matches the seller's `confirmationMode` (`"call"` vs `"tap"`).

## 5. Meta Pixel & Sharing Verification
- [ ] Verify OpenGraph tags (`og:title`, `og:description`, `og:image`) in the Facebook Sharing Debugger and Messenger link preview.
- [ ] If `pixelId` is configured, verify `PageView`, `ViewContent`, `InitiateCheckout` (once on form interaction), and `Purchase` (once on `/<slug>/thanks`, not refiring on reload).

## 6. Mobile & Facebook In-App Browser Test
- [ ] Open `/<slug>` from a Facebook post or Messenger link on an Android phone (360px viewport).
- [ ] Verify the sticky bottom "Order now" bar scrolls smoothly to the form, hides while the form is visible, and does not collide with the in-app bottom toolbar.
