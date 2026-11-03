# TASK: Apply the OrderKoro brand kit. UI FREEZE applies.

UI FREEZE: do not change layout, spacing, colours, copy or behaviour of any existing page, except exactly what is listed below. If something below would require a layout change, stop and report it instead.

Verification rule: never claim something works unless you ran it and looked at the real output. Anything you did not run or see, write "NOT VERIFIED".

The kit folder is in the repo root as `orderkoro-brand-kit/` (files listed in its README.md).

## 1. Copy assets
- `logo/*` -> `public/brand/logo/`
- `icons/*` -> `public/brand/icons/`; also `icons/favicon.ico` -> `src/app/favicon.ico`
- `social/og-orderkoro-v1.jpg` -> `public/brand/og-orderkoro-v1.jpg`
- `brand-tokens.css` -> `src/styles/brand-tokens.css`, imported once in the root layout.
Do NOT copy facebook-profile, facebook-cover or telegram-avatar into the site.

## 2. Platform metadata (landing and platform pages only)
In the root layout metadata set:
- icons: `/favicon.ico`, `/brand/icons/icon.svg` (type image/svg+xml), apple `/brand/icons/apple-touch-icon.png`.
- manifest icons (if a manifest exists): icon-192.png, icon-512.png, and icon-maskable-512.png with `purpose: "maskable"`.
- openGraph + twitter: image `/brand/og-orderkoro-v1.jpg`, 1200x630, resolved to an ABSOLUTE URL via `metadataBase` (from `NEXT_PUBLIC_SITE_URL`, fallback https://orderkoro.vercel.app). Never relative.
- Title "OrderKoro", description in Bangla matching the existing landing copy. Do not invent new claims.

## 3. Landing header
In the existing landing header only: show `logo/logo-mark.svg` (height 32px, via `<img>` or next/image, alt "OrderKoro") followed by the text "OrderKoro" as live text (Anek Bangla, weight 800, colour var(--ok-green)). Keep the existing BN/EN toggle and everything else as is. No CSS filters or opacity on the mark. On a dark or green background use `logo-mark-on-dark.svg`.

## 4. Seller pages
- Keep each seller's own logo, colours and metadata. The OrderKoro mark must never replace a seller logo.
- Add a small footer line "Powered by OrderKoro" (Bangla: "OrderKoro দ্বারা চালিত") with the small mark (16px), linking to `https://orderkoro.vercel.app/?utm_source=seller_page&utm_medium=footer&utm_campaign=<client-slug>`, `rel="noopener"`. Keep it muted and small; add it to the footer only, no layout shift. Make it controllable by a config flag `showPoweredBy` (default true).
- Seller favicon/share image: use the seller's own if configured. If a seller has no logo, generate a letter tile (first letter of the brand name, seller primary colour background, white letter) rather than falling back to the OrderKoro favicon. Seller share images must NOT use the OrderKoro OG image.
- Draft/testOnly clients stay noindex as they are today.

## 5. Check (real, not assumed)
- `npm run build` and tests pass.
- Run the production build and open: `/`, a seller page, a legal page, the thank-you page. Take screenshots at 390px and 1280px. Confirm: header mark and wordmark render and are not distorted; favicon in the tab; no existing layout moved.
- `curl` the landing HTML and print the og:image, twitter:image and icon tags; confirm the og:image URL is absolute and returns 200 with image/jpeg.
- Do the same for one seller page and show that its og:image is NOT the OrderKoro image.
Report each item as VERIFIED (with evidence) or NOT VERIFIED.
