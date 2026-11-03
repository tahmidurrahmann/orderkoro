import fs from "fs";
import path from "path";

const manifestPath = path.resolve(".next/server/app/[slug]/thanks/page_client-reference-manifest.js");
const content = fs.readFileSync(manifestPath, "utf8");
const lines = content.split("\n");
const line2 = lines.find(l => l.includes("__RSC_MANIFEST[\"/[slug]/thanks/page\"]"));
const eqIdx = line2.indexOf("=");
const jsonStr = line2.slice(eqIdx + 1).trim().replace(/;$/, "");
const data = JSON.parse(jsonStr);

const entryFiles = data.entryJSFiles["[project]/src/app/[slug]/thanks/page"] || [];
let totalBytes = 0;
console.log("Thanks Page Entry JS Chunks:");
for (const file of entryFiles) {
  const p = path.resolve(".next", file);
  if (fs.existsSync(p)) {
    const size = fs.statSync(p).size;
    totalBytes += size;
    console.log(`- ${file}: ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
  }
}
console.log(`\nTotal Baseline First-Load JS: ${totalBytes} bytes (${(totalBytes / 1024).toFixed(2)} KB)`);
