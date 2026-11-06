# OrderKoro (অর্ডারকরো)

> High-conversion, ultra-fast single-product Cash on Delivery (COD) storefront engine for Bangladeshi Facebook & f-commerce sellers.

OrderKoro replaces fragile messenger order taking with a dedicated, mobile-optimized landing page. Customers enter their name, phone number, address, color, size, and quantity directly. Orders instantly sync to the seller's Google Sheet and trigger interactive Telegram alerts with one-tap fulfillment buttons.

---

## Key Features

- **Mobile-First UX (Senior E-Commerce Standard):**
  - Edge-to-edge 4:5 portrait gallery with fullscreen pinch-to-zoom Lightbox.
  - Sleek 36px circular color swatches with active selection rings.
  - Responsive single-row size chips (`S`, `M`, `L`, `XL`, `XXL`) without awkward line wraps.
  - Inline quantity stepper with real-time total price calculation.
  - Dynamic delivery charge calculator (Dhaka City, Suburbs, Outside Dhaka).
  - Floating sticky bottom bar (`Total Payable ৳1,490` + `[Order now ↓]`).

- **Automated Order Pipeline:**
  - **Google Sheets Real-time Sync:** Writes directly to the seller's own Google Sheet (29 canonical columns A..AC) with freeze, bold, column notes, and edit warnings.
  - **Telegram Bot Webhook:** Sends instant order alerts with interactive inline buttons (`Confirm`, `Shipped`, `Delivered`, `Returned`, `Cancel`, `Verify Payment`).

- **Payment Flexibility:**
  - Standard Cash on Delivery (COD).
  - Manual mobile advance payments (bKash, Nagad, Rocket) with TrxID validation, reservation, and duplicate prevention via Redis.

- **Speed & Web Performance:**
  - Next.js 16 App Router with Turbopack.
  - Automated image optimizer converting raw uploads into 360w/640w/960w WebP images (under 80 KB).
  - Instant base64 blur placeholders for zero layout shifts.

- **Config-Driven Multi-Tenancy:**
  - Every brand/product lives in a clean, isolated config: `clients/<slug>.json`.
  - Adding a new seller requires zero code changes.

---

## Seller Onboarding & CLI Runbook

Follow these exact steps whenever onboarding a new seller or launching a new product:

```bash
# -------------------------------------------------------------
# STEP 1: CREATE CLIENT CONFIG
# -------------------------------------------------------------
# Interactive wizard:
npm run new-client

# Or with one-line flags:
npm run new-client -- --slug=<slug> --prefix=<prefix> --brand="Brand Name" --title="Product Title" --price=1490

# -------------------------------------------------------------
# STEP 2: OPTIMIZE SELLER PHOTOS
# -------------------------------------------------------------
# Place seller's raw photos (JPG, PNG, HEIC) in: incoming/<slug>/
# Then run the optimizer:
npm run optimize-images -- <slug>

# -------------------------------------------------------------
# STEP 3: SETUP & VERIFY GOOGLE SHEET
# (Ensure seller shared their blank Sheet with the service account as Editor)
# -------------------------------------------------------------
# Read-only check (reports NEEDS INIT):
npm run check-sheet -- <slug>

# Format row 1 headers, freeze, protection, and notes:
npm run init-sheet -- <slug>

# Confirm verdict is now READY:
npm run check-sheet -- <slug>

# -------------------------------------------------------------
# STEP 4: VERIFY TELEGRAM ALERTS
# (Seller sends /start or /id to @OrderKoro_Bot to get their Chat ID)
# -------------------------------------------------------------
npm run test-telegram -- <slug>

# -------------------------------------------------------------
# STEP 5: PRE-FLIGHT VERIFICATION
# -------------------------------------------------------------
npm run validate:clients
npm run typecheck
npm test

# -------------------------------------------------------------
# STEP 6: DEPLOY LIVE
# -------------------------------------------------------------
git add .
git commit -m "feat: add seller <slug>"
git push
```

Once pushed, Vercel automatically deploys, and the store goes live at:  
`https://<your-domain>/<slug>`

---

## Repository Structure

```
├── clients/              # Seller JSON configurations (e.g. demo-brand.json)
├── incoming/             # Raw product images waiting for optimization
├── public/               # Public assets and optimized client WebP images
│   └── <slug>/           # Auto-generated responsive images + manifest.json + og.jpg
├── scripts/              # Automation and maintenance CLI scripts
│   ├── check-sheet.mjs   # Read-only Google Sheet health checker
│   ├── init-sheet.mjs    # Google Sheet 29-column initializer
│   ├── optimize-images.mjs # Sharp-powered WebP & social card generator
│   ├── test-telegram.mjs # Live Telegram test order sender
│   ├── new-client.mjs    # Interactive seller onboarding generator
│   └── validate-clients.mjs # Pre-build config schema validator
├── src/
│   ├── app/              # Next.js App Router ([slug] storefront & API routes)
│   ├── components/       # UI components (Gallery, Selectors, OrderForm, etc.)
│   └── lib/              # Core business logic (Sheets, Telegram, Payments, Redis)
├── tests/                # Automated Vitest test suites (214 tests passing)
├── docs/                 # Documentation & Seller Guide (SELLER_GUIDE.md)
└── SELLER_ONBOARDING_FORM.md # Seller intake checklist (Bangla)
```

---

## Local Development & Testing

```bash
# Start local dev server with Turbopack:
npm run dev

# Run TypeScript type check:
npm run typecheck

# Run ESLint:
npm run lint

# Run all 214 unit & integration tests:
npm test

# Pre-build client config verification:
npm run validate:clients
```

---

## Documentation Links

- [Seller Onboarding Form (Bangla)](SELLER_ONBOARDING_FORM.md)
- [Seller Guide (docs/SELLER_GUIDE.md)](docs/SELLER_GUIDE.md)
- [Design Specifications](DESIGN.md)
