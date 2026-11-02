import sharp from "sharp";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Generating landing assets...");

  // 1. Generate src/app/icon.png (Favicon 48x48)
  const iconSvg = `
  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#1E3A5F" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" letter-spacing="-0.5">OK</text>
    <circle cx="36" cy="12" r="4" fill="#10B981" />
  </svg>
  `;

  const iconBuffer = await sharp(Buffer.from(iconSvg))
    .png()
    .toBuffer();

  fs.writeFileSync("src/app/icon.png", iconBuffer);
  console.log("✅ Generated src/app/icon.png (48x48 PNG)");

  // 2. Generate public/og/orderkoro.jpg (1200x630 JPEG under 300 KB)
  fs.mkdirSync("public/og", { recursive: true });

  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F172A" />
        <stop offset="100%" stop-color="#1E3A5F" />
      </linearGradient>
      <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="100%" stop-color="#34D399" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)" />
    
    <!-- Subtle Grid / Border Decoration -->
    <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="2" />
    
    <!-- Pill Eyebrow -->
    <rect x="80" y="90" width="450" height="46" rx="23" fill="#FFFFFF" fill-opacity="0.08" />
    <circle cx="106" cy="113" r="7" fill="#10B981" />
    <text x="126" y="119" fill="#E2E8F0" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="19" font-weight="600">OrderKoro • Facebook &amp; F-Commerce</text>
    
    <!-- Main Wordmark -->
    <text x="80" y="240" fill="#FFFFFF" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="76" font-weight="900" letter-spacing="-1">Order<tspan fill="url(#brandGrad)">Koro</tspan></text>
    
    <!-- Bangla Headline -->
    <text x="80" y="340" fill="#F8FAFC" font-family="'Hind Siliguri', 'Anek Bangla', system-ui, sans-serif" font-size="46" font-weight="800">ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ</text>
    
    <!-- English Subline -->
    <text x="80" y="415" fill="#94A3B8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="28" font-weight="500">Single-product order pages for Facebook sellers</text>
    
    <!-- Feature Badges -->
    <g transform="translate(80, 485)">
      <rect x="0" y="0" width="280" height="46" rx="12" fill="#FFFFFF" fill-opacity="0.06" stroke="#FFFFFF" stroke-opacity="0.1" />
      <text x="24" y="29" fill="#E2E8F0" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="18" font-weight="600">⚡ Cash on Delivery</text>
      
      <rect x="300" y="0" width="280" height="46" rx="12" fill="#FFFFFF" fill-opacity="0.06" stroke="#FFFFFF" stroke-opacity="0.1" />
      <text x="324" y="29" fill="#E2E8F0" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="18" font-weight="600">📱 Telegram Alerts</text>
      
      <rect x="600" y="0" width="280" height="46" rx="12" fill="#FFFFFF" fill-opacity="0.06" stroke="#FFFFFF" stroke-opacity="0.1" />
      <text x="624" y="29" fill="#E2E8F0" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="18" font-weight="600">📊 Google Sheets Sync</text>
    </g>
  </svg>
  `;

  const ogBuffer = await sharp(Buffer.from(ogSvg))
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();

  const ogPath = path.join("public", "og", "orderkoro.jpg");
  fs.writeFileSync(ogPath, ogBuffer);
  const ogKb = Math.round(ogBuffer.length / 1024);
  console.log(`✅ Generated public/og/orderkoro.jpg (${ogKb} KB - ${ogKb < 300 ? "PASS: under 300 KB" : "WARN: over 300 KB"})`);
}

main().catch(console.error);
