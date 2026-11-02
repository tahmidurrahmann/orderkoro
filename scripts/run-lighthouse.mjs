import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const REPORT_DIR = path.resolve("lighthouse-reports/before");
fs.mkdirSync(REPORT_DIR, { recursive: true });

const targets = [
  { name: "home", url: "http://localhost:3000/" },
  { name: "demo-brand", url: "http://localhost:3000/demo-brand" },
];

const results = {};

for (const target of targets) {
  results[target.name] = [];
  console.log(`\n========================================`);
  console.log(`Running 3 Lighthouse mobile runs for: ${target.name} (${target.url})`);
  console.log(`========================================`);

  for (let run = 1; run <= 3; run++) {
    const reportPath = path.join(REPORT_DIR, `${target.name}-run${run}.json`);
    console.log(`\nStarting Run #${run}...`);
    try {
      // Standard mobile emulation flags with chrome headless
      const cmd = `npx lighthouse ${target.url} --output=json --output-path="${reportPath}" --chrome-flags="--headless=new --no-sandbox --disable-gpu" --form-factor=mobile --quiet`;
      execSync(cmd, { stdio: "inherit", timeout: 120000 });

      const raw = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
      const categories = raw.categories;
      const audits = raw.audits;

      const summary = {
        run,
        perf: Math.round((categories.performance?.score || 0) * 100),
        a11y: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
        lcp: audits["largest-contentful-paint"]?.displayValue || "",
        lcpNumeric: Math.round(audits["largest-contentful-paint"]?.numericValue || 0),
        fcp: audits["first-contentful-paint"]?.displayValue || "",
        tbt: audits["total-blocking-time"]?.displayValue || "",
        cls: audits["cumulative-layout-shift"]?.displayValue || "",
        clsNumeric: Number((audits["cumulative-layout-shift"]?.numericValue || 0).toFixed(4)),
        speedIndex: audits["speed-index"]?.displayValue || "",
        lcpElement: audits["largest-contentful-paint-element"]?.details?.items?.[0]?.node?.snippet || "N/A",
      };

      results[target.name].push(summary);
      console.log(`Run #${run} Result:`, summary);
    } catch (err) {
      console.error(`Run #${run} failed:`, err.message);
    }
  }
}

const summaryPath = path.join(REPORT_DIR, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
console.log("\nAll Lighthouse runs completed! Summary saved to:", summaryPath);
