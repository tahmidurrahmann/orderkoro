# OrderKoro: New Seller Onboarding Checklist (`docs/ONBOARDING.md`)

Collect the following details from a Bangladeshi Facebook seller to create their `clients/<slug>.json` file:

## 1. Brand & Storefront Identity
- **Store Slug (`slug`)**: Short URL slug, e.g. `bunon-atelier` (becomes `https://.../bunon-atelier`).
- **Order Prefix (`orderPrefix`)**: 2 to 4 uppercase letters for order IDs (e.g. `BNN` -> `BNN-261031-0001`).
- **Brand Name**: Bangla name (and English name if bilingual switch is enabled).
- **Logo File**: SVG or transparent PNG/WebP wordmark (`public/<slug>/logo.svg` or `{ bn, en }` logos).
- **Primary Brand Color (`primaryColor`)**: Hex code (will be auto-checked for 4.5:1 WCAG AA contrast against white button text).
- **Language Preference**: Default Bangla (`bn`) or English (`en`), and whether customers can toggle languages (`allowSwitch`).

## 2. Product Details
- **Product Title**: Clear Bangla (and optional English) title.
- **Selling Price (`price`)**: Final price in BDT (`৳`).
- **Previous Price (`oldPrice`, optional)**: Only if offering a genuine discount (`oldPrice > price`).
- **Short Description & Bullet Points (`details`)**: Fabric, GSM, fit, pocket details, and wash care.
- **Product Photos (`images`)**: 3 to 8 high-resolution vertical (`4:5`) photos.
- **Color Options (`colors`)**: 1 to 6 colors, each with its name, hex code, and at least 1 photo per color.
- **Sizes (`sizes`)**: Available and out-of-stock sizes (e.g. `S`, `M`, `L`, `XL`, `XXL`) plus optional **Size Chart Image** (`sizeChartImage`).
- **Max Quantity per Order (`maxQuantity`)**: 1 to 5 (default `5`).

## 3. Delivery & Return Policy
- **Delivery Zones & Charges**:
  - Inside Dhaka City charge & delivery day range (e.g. `৳70`, `1 to 2 days`).
  - Dhaka Suburbs (Savar, Keraniganj, Tongi, Dohar, Nawabganj, Dhamrai) charge & day range (e.g. `৳100`, `2 to 3 days`) - optional.
  - Outside Dhaka charge & day range (e.g. `৳130`, `3 to 5 days`).
- **Free Delivery Threshold (`freeDeliveryAbove`, optional)**: Minimum order subtotal in BDT for free delivery.
- **Return & Exchange Policy (`returnPolicy`)**:
  - **Return (`return`)**: `{ "enabled": boolean, "days"?: number }` (0 to 30; 0 means at delivery only in front of the rider).
  - **Exchange (`exchange`)**: `{ "enabled": boolean, "days"?: number }` (1 to 30; required when exchange is enabled).
  - **Return Shipping Coverage (`returnShippingPaidBy`)**: `"customer"` | `"seller"` | `"shared"`.
  - **Optional Conditions (`conditions`)**: Localized text `{ "bn": "...", "en": "..." }` for additional stipulations.
- **Refund Policy for Mobile Payments (`refundDays`, `refundNote`)**:
  - `refundDays`: Days to issue mobile payment refunds (default `5`).
  - `refundNote`: Optional localized note on refund processing.
- **Policy Updated Date (`policyUpdatedAt`, optional)**: Date string (e.g. `2026-11-03`, default is storefront build date).
- **Quality Trust Badge (`qualityBadge`, optional)**: Localized title and subtitle `{ "title": { "bn": "...", "en": "..." }, "subtitle": { "bn": "...", "en": "..." } }`.

## 4. Contact, Operations & Tracking
- **Customer Support Phone (`contact.phone`)**: 11-digit helpline number for the `Call us` button.
- **Facebook Page Username (`contact.messengerPageUsername`)**: Username from `facebook.com/<username>` for `m.me/<username>` links.
- **Business Address (`contact.businessAddress`)**: Physical office/shop address string or `{ bn, en }` object for legal pages.
- **Trade License Number (`contact.tradeLicenseNumber`, optional)**: Official trade license number displayed on the terms page.
- **Order Confirmation Mode (`confirmationMode`)**:
  - `"call"`: Seller calls every customer to confirm before dispatch.
  - `"tap"`: Seller processes orders directly via Telegram tap without calling first.
- **High-Value Flag Threshold (`highValueThreshold`, optional)**: BDT total above which Telegram flags the order as high value.
- **Google Sheet ID (`sheetId`)** & **Telegram Chat ID (`telegramChatId`)** (send `/start` to the shared bot to get the chat ID).
- **Meta Pixel ID (`pixelId`, optional)**: Numeric Pixel ID if running Facebook conversion ads.

## 5. Payment Methods (`payments`)
- **Cash on Delivery (`cod`)**: `{ "enabled": true }` (canonical default).
- **Manual Mobile Payments (Optional)**:
  - **bKash (`bkash`)**: `{ "enabled": true, "number": "01711002233", "type": "personal" | "agent" | "merchant" }`
  - **Nagad (`nagad`)**: `{ "enabled": true, "number": "01811002233", "type": "personal" | "agent" | "merchant" }`
  - **Rocket (`rocket`)**: `{ "enabled": true, "number": "01911002233", "type": "personal" | "agent" | "merchant" }`
  - If a mobile method is enabled, its `number` is required and must be an 11-digit Bangladeshi mobile number (`01[3-9]XXXXXXXX`).
  - Account types: `personal` (Send Money), `agent` (Cash Out), or `merchant` (Payment).
  - Google Sheets uses 29 canonical columns (Columns A to AC) appending Payment Method, Payment Status, TrxID, and Paid From Number. Run `npm run init-sheet -- <slug>` to initialize or upgrade the seller's sheet.

## 6. Photo Optimization Workflow
Follow this 3-step workflow to prepare fast, responsive storefront images:
1. **Drop original photos**: Place raw seller images (JPG, PNG, HEIC, TIFF) into `incoming/<slug>/`. You can optionally organize into color subfolders (e.g. `incoming/<slug>/<color>/`).
2. **Run image optimizer**:
   ```bash
   npm run optimize-images -- <slug>
   ```
   This script:
   - EXIF-rotates images and strips metadata.
   - Generates content-hashed WebP variants at 360w, 640w, and 960w (max 1080px on long side, never upscaling).
   - Generates a lightweight (~20 px) base64 blur placeholder.
   - Generates `public/<slug>/og.jpg` (1200x630 JPEG under 300 KB for social sharing).
   - Writes the manifest to `public/<slug>/manifest.json`.
3. **Commit and deploy**: Commit the generated `public/<slug>/` assets and `clients/<slug>.json` to git. The incoming folder (`incoming/`) is gitignored.
