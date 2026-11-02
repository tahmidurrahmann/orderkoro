#!/usr/bin/env node
/**
 * Build-time Client Config Validator (scripts/validate-clients.mjs)
 * Validates every JSON file in clients/*.json before `next build`.
 * Fails the build with a clear, actionable message if any config is invalid
 * or if `orderPrefix` / `slug` collides across clients.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENTS_DIR = path.join(ROOT_DIR, "clients");

import { loadScriptEnv } from "./lib/load-env.mjs";

loadScriptEnv();

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(hex) {
  const clean = String(hex).trim();
  if (clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toUpperCase();
  }
  return clean.toUpperCase();
}

function getContrastWithWhite(hex) {
  const full = normalizeHex(hex);
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return (1.0 + 0.05) / (lum + 0.05);
}

function darkenUntilAccessible(hex, minContrast = 4.5) {
  const full = normalizeHex(hex);
  let r = parseInt(full.slice(1, 3), 16);
  let g = parseInt(full.slice(3, 5), 16);
  let b = parseInt(full.slice(5, 7), 16);
  let candidate = full;
  for (let i = 0; i < 100; i++) {
    r = Math.max(0, Math.floor(r * 0.92 - 2));
    g = Math.max(0, Math.floor(g * 0.92 - 2));
    b = Math.max(0, Math.floor(b * 0.92 - 2));
    candidate =
      "#" +
      [r, g, b]
        .map((c) => c.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    if (getContrastWithWhite(candidate) >= minContrast) {
      break;
    }
  }
  return candidate;
}

function isNonEmptyLocalized(val) {
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "object" && val !== null) {
    return (
      typeof val.bn === "string" &&
      val.bn.trim().length > 0 &&
      typeof val.en === "string" &&
      val.en.trim().length > 0
    );
  }
  return false;
}

export function validateSingleClientConfig(cfg, fileName = "config.json") {
  const errors = [];
  const warnings = [];

  if (!cfg || typeof cfg !== "object") {
    return { valid: false, errors: [`${fileName}: Root value must be a JSON object`], warnings };
  }

  if (typeof cfg.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cfg.slug)) {
    errors.push(`slug: must be lowercase alphanumeric with hyphens (got "${cfg.slug}")`);
  }

  if (typeof cfg.orderPrefix !== "string" || !/^[A-Z]{2,4}$/.test(cfg.orderPrefix)) {
    errors.push(`orderPrefix: must be 2 to 4 uppercase letters (got "${cfg.orderPrefix}")`);
  }

  // Brand validation + WCAG AA contrast check
  if (!cfg.brand || typeof cfg.brand !== "object") {
    errors.push(`brand: required object is missing`);
  } else {
    if (!isNonEmptyLocalized(cfg.brand.name)) {
      errors.push(`brand.name: must be a non-empty string or { bn, en } object`);
    }
    if (!isNonEmptyLocalized(cfg.brand.logoUrl)) {
      errors.push(`brand.logoUrl: must be a non-empty string or { bn, en } object`);
    }
    if (typeof cfg.brand.primaryColor !== "string" || !HEX_REGEX.test(cfg.brand.primaryColor)) {
      errors.push(`brand.primaryColor: must be a valid hex color (#RGB or #RRGGBB)`);
    } else {
      const ratio = getContrastWithWhite(cfg.brand.primaryColor);
      if (ratio < 4.5) {
        const fallback = darkenUntilAccessible(cfg.brand.primaryColor, 4.5);
        warnings.push(
          `${fileName}: brand.primaryColor "${cfg.brand.primaryColor}" has ${ratio.toFixed(
            2
          )}:1 contrast with white button text (< 4.5:1 WCAG AA). Auto-falling back to darker shade "${fallback}".`
        );
      }
    }
  }

  // Language
  if (
    !cfg.language ||
    (cfg.language.default !== "bn" && cfg.language.default !== "en") ||
    typeof cfg.language.allowSwitch !== "boolean"
  ) {
    errors.push(`language: must specify { default: "bn"|"en", allowSwitch: boolean }`);
  }

  // Product
  if (!cfg.product || typeof cfg.product !== "object") {
    errors.push(`product: required object is missing`);
  } else {
    if (!isNonEmptyLocalized(cfg.product.title)) {
      errors.push(`product.title: required non-empty string or { bn, en }`);
    }
    if (typeof cfg.product.price !== "number" || cfg.product.price <= 0) {
      errors.push(`product.price: must be a positive number`);
    }
    if (
      cfg.product.oldPrice !== undefined &&
      (typeof cfg.product.oldPrice !== "number" || cfg.product.oldPrice <= cfg.product.price)
    ) {
      errors.push(`product.oldPrice: must be greater than product.price when provided`);
    }
    if (!isNonEmptyLocalized(cfg.product.shortDescription)) {
      errors.push(`product.shortDescription: required non-empty string or { bn, en }`);
    }
    if (
      !Array.isArray(cfg.product.images) ||
      cfg.product.images.length < 3 ||
      cfg.product.images.length > 8
    ) {
      errors.push(
        `product.images: must contain between 3 and 8 images (found ${
          Array.isArray(cfg.product.images) ? cfg.product.images.length : 0
        })`
      );
    }
  }

  // Colors (1-6, each must have >= 1 image)
  if (!Array.isArray(cfg.colors) || cfg.colors.length < 1 || cfg.colors.length > 6) {
    errors.push(`colors: must contain between 1 and 6 color entries`);
  } else {
    cfg.colors.forEach((c, idx) => {
      if (!isNonEmptyLocalized(c?.name)) {
        errors.push(`colors[${idx}].name: required non-empty string or { bn, en }`);
      }
      if (typeof c?.hex !== "string" || !HEX_REGEX.test(c.hex)) {
        errors.push(`colors[${idx}].hex: must be a valid hex color`);
      }
      if (!Array.isArray(c?.images) || c.images.length < 1) {
        errors.push(`colors[${idx}].images: every color must have at least 1 image`);
      }
    });
  }

  // Sizes
  if (!Array.isArray(cfg.sizes) || cfg.sizes.length < 1) {
    errors.push(`sizes: must contain at least 1 size option`);
  }

  // maxQuantity
  if (
    cfg.maxQuantity !== undefined &&
    (typeof cfg.maxQuantity !== "number" || cfg.maxQuantity < 1 || cfg.maxQuantity > 5)
  ) {
    errors.push(`maxQuantity: must be an integer between 1 and 5`);
  }

  // Delivery zones
  if (!cfg.delivery || typeof cfg.delivery !== "object") {
    errors.push(`delivery: required object is missing`);
  } else {
    if (!Array.isArray(cfg.delivery.zones) || cfg.delivery.zones.length === 0) {
      errors.push(`delivery.zones: cannot be empty (must define at least 1 zone)`);
    } else {
      const zoneIds = new Set(cfg.delivery.zones.map((z) => z.id));
      if (!zoneIds.has(cfg.delivery.defaultZoneId)) {
        errors.push(
          `delivery.defaultZoneId "${cfg.delivery.defaultZoneId}" does not exist in delivery.zones`
        );
      }
    }
  }

  if ("returnPolicyText" in cfg) {
    errors.push(`returnPolicyText: legacy field is removed; use structured returnPolicy`);
  }

  if (!cfg.returnPolicy || typeof cfg.returnPolicy !== "object") {
    errors.push(`returnPolicy: required object with return and exchange fields`);
  } else {
    const ret = cfg.returnPolicy.return;
    const exc = cfg.returnPolicy.exchange;

    if (!ret || typeof ret.enabled !== "boolean") {
      errors.push(`returnPolicy.return.enabled: required boolean`);
    } else if (ret.enabled) {
      if (typeof ret.days !== "number" || !Number.isInteger(ret.days) || ret.days < 0 || ret.days > 30) {
        errors.push(`returnPolicy.return.days: required integer between 0 and 30 when return is enabled`);
      }
    }

    if (!exc || typeof exc.enabled !== "boolean") {
      errors.push(`returnPolicy.exchange.enabled: required boolean`);
    } else if (exc.enabled) {
      if (typeof exc.days !== "number" || !Number.isInteger(exc.days) || exc.days < 1 || exc.days > 30) {
        errors.push(`returnPolicy.exchange.days: required integer between 1 and 30 when exchange is enabled`);
      }
    }

    if (cfg.returnPolicy.returnShippingPaidBy && !["customer", "seller", "shared"].includes(cfg.returnPolicy.returnShippingPaidBy)) {
      errors.push(`returnPolicy.returnShippingPaidBy: must be 'customer', 'seller', or 'shared'`);
    }
  }

  if (
    !cfg.contact ||
    typeof cfg.contact.phone !== "string" ||
    !cfg.contact.phone.trim() ||
    typeof cfg.contact.messengerPageUsername !== "string" ||
    !cfg.contact.messengerPageUsername.trim()
  ) {
    errors.push(`contact: must include non-empty phone and messengerPageUsername`);
  }

  if (typeof cfg.sheetId !== "string" || !cfg.sheetId.trim()) {
    errors.push(`sheetId: required non-empty string`);
  }
  if (typeof cfg.telegramChatId !== "string" || !cfg.telegramChatId.trim()) {
    errors.push(`telegramChatId: required non-empty string`);
  }
  if (cfg.confirmationMode !== "call" && cfg.confirmationMode !== "tap") {
    errors.push(`confirmationMode: must be "call" or "tap"`);
  }

  // Payments validation (canonical shape only)
  if (cfg.paymentNumbers !== undefined) {
    errors.push(`payments: legacy paymentNumbers field is removed; use payments: { bkash: { enabled, number, type }, ... }`);
  }

  if (cfg.payments !== undefined) {
    if (typeof cfg.payments !== "object" || cfg.payments === null || Array.isArray(cfg.payments)) {
      errors.push(`payments: must be an object with payment methods`);
    } else {
      if (typeof cfg.payments.cod === "boolean") {
        errors.push(`payments.cod: legacy boolean form is removed; use { enabled: boolean }`);
      } else if (cfg.payments.cod !== undefined) {
        if (typeof cfg.payments.cod !== "object" || cfg.payments.cod === null) {
          errors.push(`payments.cod: must be an object { enabled: boolean }`);
        } else if (typeof cfg.payments.cod.enabled !== "boolean") {
          errors.push(`payments.cod.enabled: must be a boolean`);
        }
      }

      for (const mfs of ["bkash", "nagad", "rocket"]) {
        const val = cfg.payments[mfs];
        if (typeof val === "boolean" || typeof val === "string") {
          errors.push(`payments.${mfs}: legacy format is removed; use { enabled: boolean, number: string, type: "personal"|"agent"|"merchant" }`);
        } else if (val !== undefined) {
          if (typeof val !== "object" || val === null) {
            errors.push(`payments.${mfs}: must be an object`);
          } else {
            if (typeof val.enabled !== "boolean") {
              errors.push(`payments.${mfs}.enabled: must be a boolean`);
            }
            if (val.enabled === true) {
              if (typeof val.number !== "string" || !/^01[3-9]\d{8}$/.test(val.number.trim())) {
                errors.push(`payments.${mfs}.number: required valid 11-digit Bangladeshi mobile number (01[3-9]XXXXXXXX) when enabled`);
              }
              if (!["personal", "agent", "merchant"].includes(val.type)) {
                errors.push(`payments.${mfs}.type: must be "personal", "agent", or "merchant" (got "${val.type}")`);
              }
            }
          }
        }
      }
    }
  }

  // Status & previewToken validation
  if (cfg.status !== undefined && !["active", "paused", "draft"].includes(cfg.status)) {
    errors.push(`status: must be "active", "paused", or "draft"`);
  }
  if (cfg.status === "draft") {
    if (typeof cfg.previewToken !== "string" || cfg.previewToken.trim().length < 16) {
      errors.push(`previewToken: draft status requires a previewToken with at least 16 characters`);
    }
  } else if (cfg.previewToken !== undefined) {
    if (typeof cfg.previewToken !== "string" || cfg.previewToken.trim().length < 16) {
      errors.push(`previewToken: must be a string with at least 16 characters if specified`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateClientsDirectory(dirPath = CLIENTS_DIR) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Clients directory not found at ${dirPath}`);
  }

  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No client JSON files found in ${dirPath}`);
  }

  const seenSlugs = new Map();
  const seenPrefixes = new Map();
  const allErrors = [];
  const allWarnings = [];

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const rawText = fs.readFileSync(fullPath, "utf-8");
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      allErrors.push(`${file}: Invalid JSON syntax: ${err.message}`);
      continue;
    }

    const expectedSlug = path.basename(file, ".json");
    if (parsed.slug !== expectedSlug) {
      allErrors.push(
        `${file}: filename slug "${expectedSlug}" does not match config.slug "${parsed.slug}"`
      );
    }

    const result = validateSingleClientConfig(parsed, file);
    for (const w of result.warnings) {
      allWarnings.push(w);
    }

    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (isProduction && parsed.testOnly === true) {
      allWarnings.push(
        `${file}: testOnly client "${parsed.slug}" is excluded from production routing and order processing`
      );
    }

    if (!result.valid) {
      for (const e of result.errors) {
        allErrors.push(`${file} -> ${e}`);
      }
      continue;
    }

    if (seenSlugs.has(parsed.slug)) {
      allErrors.push(
        `${file}: duplicate slug "${parsed.slug}" (already defined in ${seenSlugs.get(
          parsed.slug
        )})`
      );
    } else {
      seenSlugs.set(parsed.slug, file);
    }

    if (seenPrefixes.has(parsed.orderPrefix)) {
      allErrors.push(
        `${file}: orderPrefix "${parsed.orderPrefix}" collides with ${seenPrefixes.get(
          parsed.orderPrefix
        )}`
      );
    } else {
      seenPrefixes.set(parsed.orderPrefix, file);
    }
  }

  // Prebuild validation: ADMIN_TELEGRAM_CHAT_ID must not be missing or collide with any client's telegramChatId
  try {
    validateAdminTelegramChatId(dirPath);
  } catch (err) {
    allErrors.push(err.message);
  }

  return {
    ok: allErrors.length === 0,
    checkedCount: files.length,
    errors: allErrors,
    warnings: allWarnings,
  };
}

export function validateAdminTelegramChatId(clientsDir = CLIENTS_DIR) {
  const adminChatId = (process.env.ADMIN_TELEGRAM_CHAT_ID || "").trim();
  if (!adminChatId) {
    throw new Error("Missing required environment variable: ADMIN_TELEGRAM_CHAT_ID");
  }

  if (!fs.existsSync(clientsDir)) return;
  const files = fs.readdirSync(clientsDir).filter((f) => f.endsWith(".json"));
  const normalizedAdmin = adminChatId.replace(/^-100/, "-");

  for (const f of files) {
    const slug = path.basename(f, ".json");
    const filePath = path.join(clientsDir, f);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const clientChat = String(parsed.telegramChatId || "").trim();
      if (clientChat) {
        const normalizedClient = clientChat.replace(/^-100/, "-");
        if (normalizedAdmin === normalizedClient) {
          throw new Error(
            `ADMIN_TELEGRAM_CHAT_ID (${adminChatId}) must not equal client "${slug}" telegramChatId (${clientChat}). Admin alerts must never be sent to a seller group.`
          );
        }
      }
    } catch (e) {
      if (e.message.includes("ADMIN_TELEGRAM_CHAT_ID")) {
        throw e;
      }
    }
  }
}

// Run when invoked directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    const res = validateClientsDirectory(CLIENTS_DIR);
    for (const w of res.warnings) {
      console.warn(`⚠️  ${w}`);
    }
    if (!res.ok) {
      console.error("\n❌ Client configuration validation failed:");
      for (const err of res.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
    console.log(`✅ Validated ${res.checkedCount} client config(s) in clients/*.json.`);
  } catch (err) {
    console.error(`❌ Build validation error: ${err.message}`);
    process.exit(1);
  }
}
