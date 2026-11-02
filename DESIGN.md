# OrderKoro: Design System & Architectural Decisions (`DESIGN.md`)

OrderKoro is designed for **360px-first mobile viewports** inside the Facebook Android in-app browser, scaling cleanly up to a centered **480px product column** on tablet and desktop screens against a quiet warm-neutral backdrop.

---

## 1. Design Tokens (CSS Custom Properties)

All visual tokens live in `src/app/globals.css` so you can adjust the look globally without touching component markup. Client-specific brand colors (`--brand-primary`, `--brand-primary-hover`, `--brand-primary-soft`, `--brand-accent`) are injected as inline CSS custom properties on the client page wrapper after WCAG AA contrast verification.

### Color Palette
| Token | Default Value | Purpose |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F5F4F0` | Outer page backdrop (visible on screens > 480px) |
| `--bg-surface` | `#FFFFFF` | Primary card and column background |
| `--bg-subtle` | `#F8F7F4` | Secondary callouts, summary cards, delivery block, input backgrounds |
| `--text-primary` | `#141413` | High-contrast headings, prices, and primary labels (17.4:1 on white) |
| `--text-secondary` | `#4B4A46` | Body copy, descriptions, secondary labels (8.7:1 on white) |
| `--text-muted` | `#71706B` | Helper text, struck-through old prices, metadata (4.8:1 on white) |
| `--border-subtle` | `#E6E4DD` | Hairline card borders and section dividers |
| `--border-strong` | `#C8C5BC` | Unfocused form control borders and inactive pills |
| `--brand-primary` | Client `primaryColor` | Primary CTA buttons, selected indicators, active focus rings (auto-darkened if WCAG contrast with `#FFFFFF` < 4.5:1) |
| `--brand-accent` | Client `accentColor` | Subtle badges and secondary highlights |
| `--status-success-bg` | `#ECFDF3` | Savings badge, Free Delivery pill, Thank-You confirmation banner |
| `--status-success-text` | `#065F46` | Accessible dark emerald text on success backgrounds (7.6:1 contrast) |
| `--status-error-bg` | `#FEF2F2` | Form error summary box and invalid field tint |
| `--status-error-text` | `#B91C1C` | Form validation error messages and required asterisks (6.4:1 contrast) |

### Typography & Bangla Line-Height Scale (Anek Bangla: dolbol standard)
Bangla script has tall ascenders (*i-kar*, *oi-kar*, *chandra-bindu*) and deep conjunct descenders (*u-kar*, *r-fola*). Standard Latin line-heights (`1.2 to 1.4`) clip or crowd Bangla baselines on Android WebView. OrderKoro uses **`Anek Bangla`** (the exact same font as `dolbol`), loaded via `next/font/google` (`display: "swap"`, weights `300` to `800`), applying crisp modern proportions and comfortable line-height:

| Scale Token | Font Size | Line Height (`bn` / `en`) | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--text-xs` | `0.8125rem` (`13px`) | `1.6` / `1.4` | `500` | Badges, helper captions, footer note |
| `--text-sm` | `0.9375rem` (`15px`) | `1.62` / `1.45` | `400 to 600` | Secondary body copy, trust policy text, summary rows |
| `--text-base` | `1rem` (`16px`) | `1.65` / `1.5` | `400 to 500` | **Minimum input & primary body size** (prevents iOS/Android auto-zoom) |
| `--text-lg` | `1.125rem` (`18px`) | `1.5` / `1.35` | `600` | Section titles, order summary total, button labels |
| `--text-xl` | `1.375rem` (`22px`) | `1.4` / `1.25` | `700` | Product title (`<h1>`) |
| `--text-2xl` | `1.625rem` (`26px`) | `1.3` / `1.2` | `700` | Hero price (`৳১,৪৯০`) |

### Responsive Multi-Device Architecture (320px to Desktop 1200px+)
- **Mobile & Tiny Screens (320px to 480px)**: Compact horizontal padding (`px-3 min-[360px]:px-4`), flexible wrapping for size pills and swatches, minimum 48px touch targets, full-width high-contrast submit button, and a mobile sticky bottom bar (`lg:hidden`).
- **Tablets (640px to 1023px)**: Elevated card presentation (`max-w-xl mx-auto`), comfortable typography spacing, and smooth responsive touch targets.
- **Desktops & Laptops (1024px to 1440px+)**: A responsive **2-Column Desktop Grid** (`max-w-6xl mx-auto px-6 lg:px-8 py-8`). The left column features a large featured hero gallery with an interactive thumbnail strip, product details, trust cards, and direct seller helpline. The right column features a sticky checkout card with live pricing, variant selectors, delivery calculator, and inline Cash on Delivery order form with live summary. The mobile sticky bar is automatically hidden on desktop (`lg:hidden`).
- **Hydration Resiliency**: Added `suppressHydrationWarning` on `<html suppressHydrationWarning>` and `<body suppressHydrationWarning>` to permanently prevent browser extensions (such as ColorZilla which injects `cz-shortcut-listen="true"`) from causing React hydration mismatch errors.

---

## 2. Framework & Architecture Decisions

1. **Tailwind CSS v4 CSS-First Configuration (`src/app/globals.css`)**:
   - Uses `@import "tailwindcss";` and `@theme` tokens directly in `src/app/globals.css` via `@tailwindcss/postcss@4.3.3` rather than legacy `tailwind.config.js`.
2. **Next.js 16 App Router Async Route Params**:
   - In Next.js 15/16, `params` in `page.tsx` and `generateMetadata` is a `Promise<{ slug: string }>`. All route components `await params` before resolving the client config.
3. **Font Loader Choice (`next/font/google`)**:
   - Uses `Hind_Siliguri` (`subsets: ["bengali", "latin"]`, weights `400, 500, 600, 700`, `display: "swap"`) and `Plus_Jakarta_Sans` (`subsets: ["latin"]`, weights `500, 600, 700`, `display: "swap"`), exposed as CSS variables `--font-bangla` and `--font-latin`.
4. **Image Optimization (`next/image`)**:
   - The first gallery slide sets `priority` and `fetchPriority="high"` for optimal LCP on 3G/4G Android phones; subsequent slides use `loading="lazy"`. Every image container reserves an explicit `4:5` aspect ratio (`aspect-[4/5]`) so Cumulative Layout Shift (CLS) is `0.00`.
5. **Facebook In-App Browser Safeguards**:
   - Fullscreen image viewer and size-chart bottom sheet use `max-h-[90vh] max-h-[90dvh]` with a standard `vh` fallback before `dvh`.
   - Sticky bottom bar uses `padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))` and hides automatically via `IntersectionObserver` when the inline `#order-form` enters the viewport.
   - Share buttons never rely on `window.open` popups (which Facebook's in-app WebView frequently blocks); they use native `navigator.share` where supported, direct `fb-messenger://` / `https://m.me/` / `https://wa.me/` / `https://www.facebook.com/sharer/sharer.php` links, and a reliable clipboard copy fallback.
6. **Portability Across Vercel & Cloudflare**:
   - Client configs are statically imported via a build-time/request-time registry (`src/lib/clients.ts`) so route handlers and server components never depend on runtime Node `fs` on Edge/Cloudflare Workers. Build-time CLI scripts (`scripts/validate-clients.mjs`, `scripts/new-client.mjs`) use `node:fs` only during build/scaffolding.
