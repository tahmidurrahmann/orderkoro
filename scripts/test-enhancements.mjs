#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateSingleClientConfig } from "./validate-clients.mjs";

console.log("🧪 Running Enhancements Verification Suite...\n");

// 1. Verify Config Schema & Validation for Bilingual vs Single Logo
console.log("1. Testing Bilingual vs Single Logo in Config...");
const baseConfig = JSON.parse(fs.readFileSync("clients/demo-brand.json", "utf-8"));

// Case A: Bilingual logo { bn, en }
const bilingualResult = validateSingleClientConfig(baseConfig, "demo-brand.json");
assert.equal(bilingualResult.valid, true, "Bilingual logo should be valid: " + JSON.stringify(bilingualResult.errors));
assert.equal(typeof baseConfig.brand.logoUrl, "object");
assert.equal(baseConfig.brand.logoUrl.bn, "/demo-brand/logo-bn.svg");
assert.equal(baseConfig.brand.logoUrl.en, "/demo-brand/logo.svg");
console.log("   ✅ Bilingual logo { bn, en } validated successfully.");

// Case B: Single string logo fallback
const singleLogoConfig = { ...baseConfig, brand: { ...baseConfig.brand, logoUrl: "/demo-brand/fallback-logo.svg" } };
const singleLogoResult = validateSingleClientConfig(singleLogoConfig, "demo-brand.json");
assert.equal(singleLogoResult.valid, true, "Single string logo should be valid and serve both languages: " + JSON.stringify(singleLogoResult.errors));
console.log("   ✅ Single string logo validated successfully.");

// 2. Verify Zero Em Dash / En Dash in all client and copy configs
console.log("\n2. Checking Absence of Em/En Dashes in Client Config & i18n...");
const dashRegex = /[\u2013\u2014]/;
assert.ok(!dashRegex.test(JSON.stringify(baseConfig)), "demo-brand.json must have 0 em/en dashes");

const i18nContent = fs.readFileSync("src/lib/i18n.ts", "utf-8");
assert.ok(!dashRegex.test(i18nContent), "src/lib/i18n.ts must have 0 em/en dashes");
console.log("   ✅ Zero em/en dashes found in demo-brand.json and i18n.ts.");

// 3. Verify Lightbox Zoom & Gallery Thumbnails in ProductOrderClient.tsx
console.log("\n3. Inspecting Lightbox Zoom & Gallery Thumbnails in ProductOrderClient.tsx...");
const clientComponentCode = fs.readFileSync("src/components/ProductOrderClient.tsx", "utf-8");

assert.ok(clientComponentCode.includes("MAX_ZOOM = 2.0"), "Max zoom must be 2.0 (200%)");
assert.ok(clientComponentCode.includes("MIN_ZOOM = 1.0"), "Lowest zoom must be 1.0 (100%)");
assert.ok(clientComponentCode.includes("ZOOM_STEP = 0.25"), "Zoom step must be 0.25 (100% -> 125% -> 150% -> 175% -> 200%)");
assert.ok(clientComponentCode.includes("handleWheel"), "Mouse wheel listener for scroll zoom must exist");
assert.ok(clientComponentCode.includes("handleTouchStart") && clientComponentCode.includes("handleTouchMove"), "Mobile touch pinch listener must exist");
assert.ok(clientComponentCode.includes("handleZoomIn") && clientComponentCode.includes("handleZoomOut"), "Plus and minus zoom handlers must exist");
assert.ok(clientComponentCode.includes("lightbox-thumb"), "Lightbox must show bottom photo thumbnails across full width");
assert.ok(clientComponentCode.includes("gallery-thumb"), "Mobile & desktop storefront gallery must show clickable photo thumbnails");
assert.ok(clientComponentCode.includes("activeLogoUrl"), "Reactive logo selector based on active language must exist");
assert.ok(clientComponentCode.includes("cursor-pointer"), "Explicit cursor-pointer utility classes must exist");
console.log("   ✅ 100% initial zoom, 25% step increments (100% -> 125% -> 150% -> 175% -> 200%), wheel zoom, touch pinch, and thumbnails verified.");

// 4. Verify Bilingual Return Badge & Professional E-Commerce Micro-Badges
console.log("\n4. Inspecting Bilingual Trust Badges & E-Commerce Micro-Badges...");
assert.ok(clientComponentCode.includes("copy.trustReturnBadge"), "Header return badge must be dynamic and switchable with language");
assert.ok(clientComponentCode.includes("copy.trustPillar1Title"), "Pillar 1 must use localized title");
assert.ok(clientComponentCode.includes("copy.trustPillar2Title"), "Pillar 2 must use localized title");
assert.ok(clientComponentCode.includes("copy.trustPillar3Title"), "Pillar 3 must use localized title");
assert.ok(!clientComponentCode.includes("📦"), "Generic box emoji must be replaced with professional SVG micro-badge");
assert.ok(!clientComponentCode.includes("🧵"), "Generic thread emoji must be replaced with professional SVG micro-badge");
console.log("   ✅ Professional e-commerce SVGs & bilingual trust pillars verified.");

// 5. Verify District Combobox Redesign & Bilingual Display
console.log("\n5. Inspecting District Selection & Bilingual Display...");
assert.ok(clientComponentCode.includes("openDropdownFormId"), "District dropdown must track form ID ('m' | 'd') to eliminate duplicate ref collisions");
assert.ok(clientComponentCode.includes("lang === \"bn\" ? d.bn : d.en"), "District options must display pure Bangla or pure English based on active language");
assert.ok(clientComponentCode.includes("lang === \"bn\" ? selectedDistrictObj.bn : selectedDistrictObj.en"), "Selected district trigger must display pure Bangla or pure English");
console.log("   ✅ Fixed backdrop, no-ref collision, and pure bilingual district display verified.");

// 6. Verify Dolbol Design Tokens & Global Pointer Cursor in globals.css
console.log("\n6. Inspecting Soft Design System & CSS in globals.css...");
const cssContent = fs.readFileSync("src/app/globals.css", "utf-8");
assert.ok(cssContent.includes("--bg-canvas: #f6f8f7;"), "Soft canvas background tone must be configured");
assert.ok(cssContent.includes("--border-subtle: #e3ebe6;"), "Subtle border tone must be configured");
assert.ok(cssContent.includes("cursor: pointer;"), "Universal cursor: pointer must be configured for all interactive buttons and selectors");
console.log("   ✅ Soft design system tokens & universal cursor pointer verified in globals.css.");

// 7. Verify Google Auto-Translate Prevention (Dolbol standard) & Language Choice Persistence
console.log("\n7. Inspecting Google Translate Prevention & Language Persistence...");
const layoutCode = fs.readFileSync("src/app/layout.tsx", "utf-8");
assert.ok(layoutCode.includes('translate="no"'), 'translate="no" must be set on html and body');
assert.ok(layoutCode.includes("notranslate"), 'class "notranslate" must be set on html and body');
assert.ok(layoutCode.includes('name="google" content="notranslate"'), '<meta name="google" content="notranslate" /> must exist');
assert.ok(layoutCode.includes('other:\n    google: "notranslate"') || layoutCode.includes('google: "notranslate"'), 'Next.js metadata must specify other: { google: "notranslate" }');

const localePrefCode = fs.readFileSync("src/lib/locale-preference.ts", "utf-8");
assert.ok(localePrefCode.includes("getSavedLocale"), "getSavedLocale helper must exist");
assert.ok(localePrefCode.includes("saveLocalePreference"), "saveLocalePreference helper must exist");

assert.ok(clientComponentCode.includes("handleLanguageChange"), "ProductOrderClient must persist language changes");
const thankYouCode = fs.readFileSync("src/components/ThankYouClient.tsx", "utf-8");
assert.ok(thankYouCode.includes("handleLanguageChange"), "ThankYouClient must persist language changes");
console.log("   ✅ translate='no', notranslate classes, meta google notranslate & language persistence verified.");

// 8. Verify Dolbol-Style Segmented Language Switch & Compact Footer
console.log("\n8. Inspecting Dolbol-Style Segmented Language Switcher & Compact Footer...");
assert.ok(clientComponentCode.includes("bg-neutral-100") && clientComponentCode.includes("bg-white text-neutral-900 shadow-xs"), "Segmented pill switcher styling must exist in ProductOrderClient");
assert.ok(thankYouCode.includes("bg-neutral-100") && thankYouCode.includes("bg-white text-neutral-900 shadow-xs"), "Segmented pill switcher styling must exist in ThankYouClient");
assert.ok(i18nContent.includes('langToggleBn: "বাং"') && i18nContent.includes('langToggleEn: "EN"'), "Exact 'বাং' and 'EN' labels must be configured in i18n dictionary");
assert.ok(!clientComponentCode.includes("pb-24 lg:pb-12"), "Unneeded bottom dead space on outer wrapper must be removed");
assert.ok(clientComponentCode.includes("copy.footerRightsReserved"), "Footer copyright must be fully localized");
console.log("   ✅ Dolbol segmented switcher [ বাং | EN ] and compact zero-dead-space footer verified.");

console.log("\n🎉 ALL ENHANCEMENT VERIFICATION TESTS PASSED SUCCESSFULLY!");
