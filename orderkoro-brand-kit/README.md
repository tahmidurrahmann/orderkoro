# OrderKoro brand kit

```
logo/    logo-mark.svg, logo-mark-on-dark.svg, logo-mark-mono-white.svg, icon-tile.svg   (SVG masters)
icons/   icon.svg, favicon.ico, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
social/  og-orderkoro-v1.jpg (1200x630), facebook-cover-1640x856.png,
         facebook-profile-1080.png, telegram-avatar-640.png
brand-tokens.css, BRAND.md, ANTIGRAVITY-PROMPT.md
```

## Put into the project (Antigravity does this from the prompt)
- `logo/*`   -> `public/brand/logo/`
- `icons/*`  -> `public/brand/icons/` (copy `favicon.ico` also to `src/app/favicon.ico`)
- `social/og-orderkoro-v1.jpg` -> `public/brand/og-orderkoro-v1.jpg`
- `brand-tokens.css` -> `src/styles/brand-tokens.css`

## You upload by hand (not part of the site)
- `facebook-profile-1080.png` -> Facebook Page profile picture
- `facebook-cover-1640x856.png` -> Page cover
- `telegram-avatar-640.png` -> Telegram bot/channel photo

## Facebook share image
Facebook caches the first image it sees. The file is named `-v1`; if you change the image, rename it `-v2`, update metadata, then re-scrape at https://developers.facebook.com/tools/debug/ . Messenger shows the card small, so the headline is deliberately large.

## Known limits
- At 16 px the orange dot is only a couple of pixels. Normal for this mark.
- The mark was traced from a raster logo (match ~99%). For print, ask a designer for a vector original.
