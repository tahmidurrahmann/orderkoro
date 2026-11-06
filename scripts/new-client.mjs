#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline/promises";
import crypto from "crypto";
import { validateSingleClientConfig } from "./validate-clients.mjs";

const CLIENTS_DIR = path.resolve("clients");

function parseFlags(argv) {
  const flags = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          flags[arg.slice(2)] = next;
          i++;
        } else {
          flags[arg.slice(2)] = true;
        }
      }
    }
  }
  return flags;
}

async function main() {
  const flags = parseFlags(process.argv);
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
  let status = flags.status === "paused" ? "paused" : flags.status === "draft" ? "draft" : "active";
  let previewToken = flags.previewToken || (status === "draft" ? crypto.randomUUID().replace(/-/g, "") : undefined);

  let returnEnabled = flags.returnEnabled !== "false";
  let returnDays = Number(flags.returnDays ?? 0);
  let exchangeEnabled = flags.exchangeEnabled !== "false";
  let exchangeDays = Number(flags.exchangeDays ?? 3);
  let returnShippingPaidBy = flags.returnShippingPaidBy || "customer";
  let conditionsText = flags.conditions || undefined;
  let refundDays = flags.refundDays ? Number(flags.refundDays) : undefined;
  let addressBn = flags.addressBn || "ঢাকা, বাংলাদেশ";
  let addressEn = flags.addressEn || "Dhaka, Bangladesh";
  let tradeLicense = flags.tradeLicense || undefined;
  let qualityBadge = null;

  let codEnabled = true;
  let bkashConfig = null;
  let nagadConfig = null;
  let rocketConfig = null;

  if (!isNonInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    console.log("=== OrderKoro New Client Scaffolder ===");
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

    console.log("--- Payment Methods ---");
    const codAnswer = (await rl.question("Enable Cash on Delivery (y/n) [y]: ")).trim().toLowerCase();
    codEnabled = codAnswer !== "n";

    const bkashAnswer = (await rl.question("Enable bKash (y/n) [n]: ")).trim().toLowerCase();
    if (bkashAnswer === "y") {
      const bNum = (await rl.question("  bKash 11-digit mobile number: ")).trim();
      const bType = (await rl.question("  bKash account type (personal/agent/merchant) [personal]: ")).trim().toLowerCase() || "personal";
      bkashConfig = { enabled: true, number: bNum, type: bType };
    }

    const nagadAnswer = (await rl.question("Enable Nagad (y/n) [n]: ")).trim().toLowerCase();
    if (nagadAnswer === "y") {
      const nNum = (await rl.question("  Nagad 11-digit mobile number: ")).trim();
      const nType = (await rl.question("  Nagad account type (personal/agent/merchant) [personal]: ")).trim().toLowerCase() || "personal";
      nagadConfig = { enabled: true, number: nNum, type: nType };
    }

    const rocketAnswer = (await rl.question("Enable Rocket (y/n) [n]: ")).trim().toLowerCase();
    if (rocketAnswer === "y") {
      const rNum = (await rl.question("  Rocket 11-digit mobile number: ")).trim();
      const rType = (await rl.question("  Rocket account type (personal/agent/merchant) [personal]: ")).trim().toLowerCase() || "personal";
      rocketConfig = { enabled: true, number: rNum, type: rType };
    }

    console.log("--- Return & Exchange Policy ---");
    const retAnswer = (await rl.question("Enable returns? (y/n) [y]: ")).trim().toLowerCase();
    returnEnabled = retAnswer !== "n";
    if (returnEnabled) {
      const d = (await rl.question("  Return window in days (0 for delivery rider only, 1-30) [0]: ")).trim();
      returnDays = d ? Number(d) : 0;
    }

    const excAnswer = (await rl.question("Enable exchanges? (y/n) [y]: ")).trim().toLowerCase();
    exchangeEnabled = excAnswer !== "n";
    if (exchangeEnabled) {
      const d = (await rl.question("  Exchange window in days (1-30) [3]: ")).trim();
      exchangeDays = d ? Number(d) : 3;
    }

    const cond = (await rl.question("  Extra policy conditions (optional, press Enter to skip): ")).trim();
    if (cond) conditionsText = cond;

    const shipPaid = (await rl.question("  Who pays return shipping? (customer/seller/shared) [customer]: ")).trim().toLowerCase();
    if (["customer", "seller", "shared"].includes(shipPaid)) {
      returnShippingPaidBy = shipPaid;
    }

    const refD = (await rl.question("  Refund processing days for mobile payments (optional, e.g. 5) [skip]: ")).trim();
    if (refD) refundDays = Number(refD);

    console.log("--- Business Information ---");
    addressBn = (await rl.question("  Business Address (Bangla) [ঢাকা, বাংলাদেশ]: ")).trim() || addressBn;
    addressEn = (await rl.question("  Business Address (English) [Dhaka, Bangladesh]: ")).trim() || addressEn;
    const tl = (await rl.question("  Trade license number (optional, press Enter to skip): ")).trim();
    if (tl) tradeLicense = tl;

    const qbAnswer = (await rl.question("Include quality guarantee badge? (y/n) [n]: ")).trim().toLowerCase();
    if (qbAnswer === "y") {
      const qTitleBn = (await rl.question("  Quality badge title (Bangla) [১০০% অরিজিনাল পণ্য]: ")).trim() || "১০০% অরিজিনাল পণ্য";
      const qTitleEn = (await rl.question("  Quality badge title (English) [100% Authentic Product]: ")).trim() || "100% Authentic Product";
      const qSubBn = (await rl.question("  Quality badge subtitle (Bangla) [খাঁটি কোয়ালিটি নিশ্চিত]: ")).trim() || "খাঁটি কোয়ালিটি নিশ্চিত";
      const qSubEn = (await rl.question("  Quality badge subtitle (English) [Quality Guaranteed]: ")).trim() || "Quality Guaranteed";
      qualityBadge = {
        title: { bn: qTitleBn, en: qTitleEn },
        subtitle: { bn: qSubBn, en: qSubEn },
      };
    }

    rl.close();
  }

  let payments = {
    cod: { enabled: flags.cod !== "false" && codEnabled },
  };
  if (flags.bkashNumber) {
    payments.bkash = { enabled: true, number: flags.bkashNumber, type: flags.bkashType || "personal" };
  } else if (bkashConfig) {
    payments.bkash = bkashConfig;
  }
  if (flags.nagadNumber) {
    payments.nagad = { enabled: true, number: flags.nagadNumber, type: flags.nagadType || "personal" };
  } else if (nagadConfig) {
    payments.nagad = nagadConfig;
  }
  if (flags.rocketNumber) {
    payments.rocket = { enabled: true, number: flags.rocketNumber, type: flags.rocketType || "personal" };
  } else if (rocketConfig) {
    payments.rocket = rocketConfig;
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
          id: "dhaka-suburb",
          label: { bn: "ঢাকার আশেপাশে (সাভার, গাজীপুর, নারায়ণগঞ্জ)", en: "Dhaka Suburbs" },
          charge: 100,
          daysMin: 2,
          daysMax: 3,
        },
        {
          id: "outside-dhaka",
          label: { bn: "ঢাকার বাইরে সারাদেশ", en: "Outside Dhaka" },
          charge: 130,
          daysMin: 3,
          daysMax: 5,
        },
      ],
      districtZoneMap: {
        Dhaka: "dhaka-city",
        Gazipur: "dhaka-suburb",
        Narayanganj: "dhaka-suburb",
      },
      suburbZoneId: "dhaka-suburb",
      defaultZoneId: "outside-dhaka",
    },
    returnPolicy: {
      return: {
        enabled: returnEnabled,
        ...(returnEnabled ? { days: returnDays } : {}),
      },
      exchange: {
        enabled: exchangeEnabled,
        ...(exchangeEnabled ? { days: exchangeDays } : {}),
      },
      ...(conditionsText ? { conditions: { bn: conditionsText, en: conditionsText } } : {}),
      returnShippingPaidBy,
    },
    ...(qualityBadge ? { qualityBadge } : {}),
    ...(refundDays ? { refundDays } : {}),
    contact: {
      phone,
      messengerPageUsername: messenger,
      businessAddress: {
        bn: addressBn,
        en: addressEn,
      },
      ...(tradeLicense ? { tradeLicenseNumber: tradeLicense } : {}),
    },
    payments,
    sheetId,
    telegramChatId,
    ...(pixelId ? { pixelId } : {}),
    confirmationMode: "call",
    customerConfirm: "off",
    status,
    ...(previewToken ? { previewToken } : {}),
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
  if (fs.existsSync(targetPath)) {
    console.error(`❌ Client config already exists at ${targetPath}`);
    process.exit(1);
  }

  fs.writeFileSync(targetPath, JSON.stringify(newConfig, null, 2), "utf8");
  console.log(`✅ Created new client config: ${targetPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
