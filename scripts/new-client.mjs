#!/usr/bin/env node
/**
 * Scaffolds a new client configuration in clients/<slug>.json from CLI flags or interactive prompts,
 * prints field guidance, and validates the generated config against all schema and collision rules.
 *
 * Usage with flags:
 *   node scripts/new-client.mjs --slug=arong-loom --prefix=ARL --brand="আড়ং লুম" --price=1350 --phone=01700112233 --messenger=arongloom.bd
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  validateClientsDirectory,
  validateSingleClientConfig,
} from "./validate-clients.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENTS_DIR = path.resolve(__dirname, "..", "clients");

function parseArgs(argv) {
  const out = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [k, ...rest] = arg.slice(2).split("=");
      out[k] = rest.length > 0 ? rest.join("=") : "true";
    }
  }
  return out;
}

async function main() {
  const flags = parseArgs(process.argv);
  const isNonInteractive = Boolean(flags.slug && flags.prefix);

  let slug = flags.slug;
  let orderPrefix = flags.prefix;
  let brandNameBn = flags.brandBn || flags.brand || "নতুন ব্র্যান্ড";
  let brandNameEn = flags.brandEn || flags.brand || "New Brand";
  let primaryColor = flags.color || "#1E3A5F";
  let productTitleBn = flags.titleBn || "প্রিমিয়াম সুতি পোশাক";
  let productTitleEn = flags.titleEn || "Premium Cotton Apparel";
  let price = Number(flags.price || 1290);
  let phone = flags.phone || "01700000000";
  let messenger = flags.messenger || "examplepage";
  let sheetId = flags.sheetId || "REPLACE_WITH_GOOGLE_SHEET_ID";
  let telegramChatId = flags.chatId || "-1000000000000";
  let pixelId = flags.pixelId || undefined;
  let status = flags.status === "paused" ? "paused" : "active";
  let returnPolicyBn = flags.returnPolicyBn || "পণ্য হাতে পাওয়ার সময় ডেলিভারি ম্যানের সামনে চেক করে নিন। ত্রুটি থাকলে তাৎক্ষণিক রিটার্ন সুবিধা।";
  let returnPolicyEn = flags.returnPolicyEn || "Check your parcel in front of the delivery rider. Instant return if defective.";
  let addressBn = flags.addressBn || "ঢাকা, বাংলাদেশ";
  let addressEn = flags.addressEn || "Dhaka, Bangladesh";

  if (!isNonInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    console.log("=== OrderPage New Client Scaffolder ===");
    slug = (await rl.question("Client slug (e.g. jamdani-house): ")).trim();
    orderPrefix = (
      await rl.question("Unique 2-4 letter orderPrefix (e.g. JMD): ")
    )
      .trim()
      .toUpperCase();
    brandNameBn =
      (await rl.question("Brand name (Bangla) [নতুন ব্র্যান্ড]: ")).trim() ||
      brandNameBn;
    brandNameEn =
      (await rl.question("Brand name (English) [New Brand]: ")).trim() ||
      brandNameEn;
    primaryColor =
      (await rl.question("Brand primary hex color [#1E3A5F]: ")).trim() ||
      primaryColor;
    productTitleBn =
      (await rl.question("Product title (Bangla): ")).trim() || productTitleBn;
    price = Number((await rl.question("Product price in BDT [1290]: ")).trim() || 1290);
    phone = (await rl.question("Seller support phone (11 digits): ")).trim() || phone;
    messenger =
      (await rl.question("Facebook Page username for m.me/<username>: ")).trim() ||
      messenger;
    pixelId = (await rl.question("Meta Pixel ID (optional, press Enter to skip): ")).trim() || undefined;
    const statusAnswer = (await rl.question("Initial store status (active/paused) [active]: ")).trim().toLowerCase();
    status = statusAnswer === "paused" ? "paused" : "active";
    rl.close();
  }

  const newConfig = {
    slug,
    orderPrefix: String(orderPrefix).toUpperCase(),
    brand: {
      name: { bn: brandNameBn, en: brandNameEn },
      logoUrl: `/${slug}/logo.svg`,
      primaryColor,
    },
    language: {
      default: "bn",
      allowSwitch: true,
    },
    product: {
      title: { bn: productTitleBn, en: productTitleEn },
      price,
      shortDescription: {
        bn: "১০০% আরামদায়ক ফেব্রিক এবং নিখুঁত ফিনিশিং। ডেলিভারি ম্যানের সামনে দেখে নেওয়ার সুবিধা।",
        en: "100% comfortable breathable fabric with tailored finishing. Inspect on delivery before paying.",
      },
      details: [
        { bn: "ফেব্রিক: ১০০% সুতি", en: "Fabric: 100% Cotton" },
        { bn: "ফিট: রেগুলার কমফোর্ট ফিট", en: "Fit: Regular Comfort Fit" },
      ],
      images: [
        `/${slug}/image-1.svg`,
        `/${slug}/image-2.svg`,
        `/${slug}/image-3.svg`,
      ],
    },
    colors: [
      {
        name: { bn: "ডিফল্ট রঙ", en: "Default Color" },
        hex: primaryColor,
        images: [
          `/${slug}/image-1.svg`,
          `/${slug}/image-2.svg`,
          `/${slug}/image-3.svg`,
        ],
      },
    ],
    sizes: [
      { name: "M", available: true },
      { name: "L", available: true },
      { name: "XL", available: true },
    ],
    maxQuantity: 5,
    soldOut: false,
    delivery: {
      zones: [
        {
          id: "dhaka-city",
          label: { bn: "ঢাকা সিটি", en: "Dhaka City" },
          charge: 70,
          daysMin: 1,
          daysMax: 2,
        },
        {
          id: "outside-dhaka",
          label: { bn: "ঢাকার বাইরে", en: "Outside Dhaka" },
          charge: 130,
          daysMin: 3,
          daysMax: 5,
        },
      ],
      districtZoneMap: {
        Dhaka: "dhaka-city",
      },
      defaultZoneId: "outside-dhaka",
    },
    returnPolicyText: {
      bn: returnPolicyBn,
      en: returnPolicyEn,
    },
    contact: {
      phone,
      messengerPageUsername: messenger,
      businessAddress: {
        bn: addressBn,
        en: addressEn,
      },
    },
    sheetId,
    telegramChatId,
    ...(pixelId ? { pixelId } : {}),
    confirmationMode: "call",
    status,
    seo: {
      index: true,
    },
    showPoweredBy: true,
  };

  const singleCheck = validateSingleClientConfig(newConfig, `${slug}.json`);
  for (const w of singleCheck.warnings) {
    console.warn(`⚠️  ${w}`);
  }
  if (!singleCheck.valid) {
    console.error("❌ Generated config failed validation:");
    for (const e of singleCheck.errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }

  const targetPath = path.join(CLIENTS_DIR, `${slug}.json`);
  if (fs.existsSync(targetPath) && !flags.force) {
    console.error(`❌ File already exists: clients/${slug}.json (use --force to overwrite)`);
    process.exit(1);
  }

  fs.writeFileSync(targetPath, JSON.stringify(newConfig, null, 2) + "\n", "utf-8");

  const dirCheck = validateClientsDirectory(CLIENTS_DIR);
  if (!dirCheck.ok) {
    fs.unlinkSync(targetPath);
    console.error("❌ Client collection validation failed (rolled back):");
    for (const e of dirCheck.errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }

  console.log(`✅ Scaffolded and validated clients/${slug}.json`);
  console.log("   Next steps:");
  console.log(`   1. Place at least 3 product images in public/${slug}/`);
  console.log(`   2. Import clients/${slug}.json in src/lib/clients.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
