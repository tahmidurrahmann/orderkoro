import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function measurePage(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    console.error(`File not found: ${htmlPath}`);
    return;
  }
  const html = fs.readFileSync(htmlPath, "utf-8");
  const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
  const uniqueScripts = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    if (!uniqueScripts.includes(match[1])) {
      uniqueScripts.push(match[1]);
    }
  }

  let totalRaw = 0;
  let totalGzip = 0;
  console.log(`\n======================================================`);
  console.log(`Page: ${htmlPath}`);
  console.log(`Scripts loaded: ${uniqueScripts.length}`);
  console.log(`======================================================`);

  for (const src of uniqueScripts) {
    const localPath = path.join(process.cwd(), ".next", src.replace("/_next/", ""));
    if (fs.existsSync(localPath)) {
      const raw = fs.readFileSync(localPath);
      const gz = zlib.gzipSync(raw);
      totalRaw += raw.length;
      totalGzip += gz.length;
      console.log(
        `  - ${path.basename(localPath).padEnd(35)} ${(raw.length / 1024).toFixed(1).padStart(7)} KB raw  ${(gz.length / 1024).toFixed(1).padStart(7)} KB gzip`
      );
    } else {
      console.log(`  - [NOT FOUND] ${src}`);
    }
  }

  console.log(`------------------------------------------------------`);
  console.log(`Total First Load Raw:  ${(totalRaw / 1024).toFixed(2)} KB`);
  console.log(`Total First Load Gzip: ${(totalGzip / 1024).toFixed(2)} KB`);
  console.log(`======================================================\n`);
}

measurePage(".next/server/app/demo-brand.html");
measurePage(".next/server/app/demo-brand/thanks.html");
