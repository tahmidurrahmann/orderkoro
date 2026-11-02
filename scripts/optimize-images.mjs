import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const TARGET_WIDTHS = [360, 640, 960];
const MAX_LONG_SIDE = 1080;
const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tiff"]);

function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTS.has(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function sanitizeName(str) {
  return str.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
}

async function generateOgImage(slug, clientConfig, outputDir) {
  const ogPath = path.join(outputDir, "og.jpg");
  console.log(`\nGenerating public/${slug}/og.jpg (1200x630 JPEG under 300 KB)...`);

  let sourcePath = null;
  const firstConfigImg = clientConfig?.product?.images?.[0];

  if (firstConfigImg) {
    const candidatePath = path.join(process.cwd(), "public", firstConfigImg.replace(/^\//, ""));
    if (fs.existsSync(candidatePath)) {
      sourcePath = candidatePath;
    }
  }

  // Fallback to any image in public/<slug>/
  if (!sourcePath) {
    const pubFiles = fs.readdirSync(outputDir).filter(f => !f.startsWith("og."));
    const img = pubFiles.find(f => f.endsWith(".svg") || f.endsWith(".webp") || f.endsWith(".jpg") || f.endsWith(".png"));
    if (img) sourcePath = path.join(outputDir, img);
  }

  if (!sourcePath) {
    console.warn(`[og:image] No source image found for ${slug}, skipping og.jpg generation.`);
    return;
  }

  const isSvg = sourcePath.toLowerCase().endsWith(".svg");
  const brandPrimary = clientConfig?.brand?.primaryColor || "#1E3A5F";
  const bgCanvas = "#F4F1EA";

  let pipeline = isSvg
    ? sharp(sourcePath, { density: 150 })
    : sharp(sourcePath).rotate();

  const ogBuffer = await pipeline
    .resize(1200, 630, {
      fit: "contain",
      background: isSvg ? bgCanvas : brandPrimary,
    })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();

  fs.writeFileSync(ogPath, ogBuffer);
  const sizeKb = Math.round(ogBuffer.length / 1024);
  console.log(`✅ Generated public/${slug}/og.jpg (${sizeKb} KB - ${sizeKb < 300 ? "PASS: under 300 KB" : "WARN: over 300 KB"})`);
}

async function main() {
  const slug = process.argv[2]?.trim();
  if (!slug) {
    console.error("Usage: npm run optimize-images -- <slug>");
    console.error("Example: npm run optimize-images -- demo-brand");
    process.exit(1);
  }

  const clientConfigPath = path.join(process.cwd(), "clients", `${slug}.json`);
  let clientConfig = null;
  if (fs.existsSync(clientConfigPath)) {
    clientConfig = JSON.parse(fs.readFileSync(clientConfigPath, "utf-8"));
  }

  const inputDir = path.join(process.cwd(), "incoming", slug);
  const outputDir = path.join(process.cwd(), "public", slug);
  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`=== Image Optimizer for [${slug}] ===`);
  console.log(`Input:  incoming/${slug}/`);
  console.log(`Output: public/${slug}/`);

  const manifestPath = path.join(outputDir, "manifest.json");
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
      manifest = {};
    }
  }

  const incomingFiles = getFilesRecursively(inputDir);
  console.log(`Found ${incomingFiles.length} file(s) in incoming/${slug}/`);

  for (const file of incomingFiles) {
    const relToInput = path.relative(inputDir, file);
    const parsed = path.parse(relToInput);
    const subfolder = parsed.dir ? sanitizeName(parsed.dir) : "";
    const cleanBase = sanitizeName(parsed.name);
    const baseName = subfolder ? `${subfolder}-${cleanBase}` : cleanBase;

    console.log(`\nProcessing: ${relToInput} -> baseName: ${baseName}`);

    const fileBuf = fs.readFileSync(file);
    const hash = crypto.createHash("sha256").update(fileBuf).digest("hex").slice(0, 8);

    const meta = await sharp(fileBuf).rotate().metadata();
    const origW = meta.width || 800;
    const origH = meta.height || 1000;

    // Calculate long side limit (max 1080)
    let scale = 1;
    if (origW > origH && origW > MAX_LONG_SIDE) {
      scale = MAX_LONG_SIDE / origW;
    } else if (origH >= origW && origH > MAX_LONG_SIDE) {
      scale = MAX_LONG_SIDE / origH;
    }
    const maxAllowedW = Math.round(origW * scale);

    const generatedVariants = [];

    for (const targetW of TARGET_WIDTHS) {
      // Never upscale
      const w = Math.min(targetW, maxAllowedW);
      const h = Math.round(w * (origH / origW));

      const outFilename = `${baseName}.${hash}.${targetW}w.webp`;
      const outPath = path.join(outputDir, outFilename);

      // WebP at target quality (aiming for 60-90 KB at 960w)
      const webpBuf = await sharp(fileBuf)
        .rotate()
        .resize(w, h, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: targetW >= 960 ? 82 : 80, effort: 6 })
        .toBuffer();

      fs.writeFileSync(outPath, webpBuf);
      const kb = Math.round(webpBuf.length / 1024);
      console.log(`  - ${outFilename}: ${w}x${h} (${kb} KB)`);
      generatedVariants.push({ width: targetW, filename: outFilename, actualW: w, actualH: h });
    }

    // Generate ~20px base64 blur placeholder
    const blurW = 20;
    const blurH = Math.max(1, Math.round(blurW * (origH / origW)));
    const blurBuf = await sharp(fileBuf)
      .rotate()
      .resize(blurW, blurH, { fit: "inside" })
      .webp({ quality: 20 })
      .toBuffer();
    const blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;

    const defaultVariant = generatedVariants[generatedVariants.length - 1];
    const srcSetEntries = generatedVariants.map(v => `/${slug}/${v.filename} ${v.width}w`).join(", ");

    const entry = {
      src: `/${slug}/${defaultVariant.filename}`,
      srcSet: srcSetEntries,
      width: origW,
      height: origH,
      aspectRatio: Number((origW / origH).toFixed(4)),
      blurDataURL,
    };

    // Store under multiple convenient lookup keys:
    // 1. /slug/baseName.webp
    manifest[`/${slug}/${baseName}.webp`] = entry;
    // 2. /slug/baseName.hash.webp
    manifest[`/${slug}/${baseName}.${hash}.webp`] = entry;
    // 3. /slug/original_relative_name
    manifest[`/${slug}/${parsed.name}.webp`] = entry;
    // 4. plain baseName
    manifest[baseName] = entry;
  }

  // Write manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Manifest written to public/${slug}/manifest.json (${Object.keys(manifest).length} entries)`);

  // Always generate og.jpg
  await generateOgImage(slug, clientConfig, outputDir);

  console.log("\nImage optimization complete!");
}

main().catch(err => {
  console.error("Optimization failed:", err);
  process.exit(1);
});
