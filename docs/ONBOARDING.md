# OrderPage: New Seller Onboarding Checklist (`docs/ONBOARDING.md`)

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
  - Outside Dhaka (All 64 Districts) charge & day range (e.g. `৳130`, `3 to 5 days`).
- **Free Delivery Threshold (`freeDeliveryAbove`, optional)**: Minimum order subtotal in BDT for free delivery.
- **Courier Inspection Note & Return Policy (`returnPolicyText`)**: Exact wording for parcel inspection and exchange/return window.

## 4. Contact, Operations & Tracking
- **Customer Support Phone (`contact.phone`)**: 11-digit helpline number for the `Call us` button.
- **Facebook Page Username (`contact.messengerPageUsername`)**: Username from `facebook.com/<username>` for `m.me/<username>` links.
- **Order Confirmation Mode (`confirmationMode`)**:
  - `"call"`: Seller calls every customer to confirm before dispatch.
  - `"tap"`: Seller processes orders directly via Telegram tap without calling first.
- **High-Value Flag Threshold (`highValueThreshold`, optional)**: BDT total above which Telegram flags the order as high value.
- **Google Sheet ID (`sheetId`)** & **Telegram Chat ID (`telegramChatId`)** (send `/start` to the shared bot to get the chat ID).
- **Meta Pixel ID (`pixelId`, optional)**: Numeric Pixel ID if running Facebook conversion ads.
