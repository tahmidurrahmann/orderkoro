import cp from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = "C:\\Users\\My PC\\.gemini\\antigravity\\brain\\27a8d89c-bde9-46a4-b574-8d0cc63c1d57\\chrome-profile-capture";
const OUTPUT_DIR = path.resolve("screenshots/baseline");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function run() {
  console.log("Starting Chrome for baseline capture...");
  const chrome = cp.spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${USER_DATA_DIR}`,
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const tabsRes = await fetch("http://127.0.0.1:9222/json/list");
    const tabs = await tabsRes.json();
    const pageTab = tabs.find((t) => t.type === "page") || tabs[0];
    if (!pageTab) throw new Error("No page tab found in Chrome");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
    };

    await new Promise((r) => (ws.onopen = r));

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.result?.value;
    }

    async function capture(filename) {
      const res = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(res.result.data, "base64"));
      console.log(`Saved: ${filename}`);
    }

    async function setLang(targetLang) {
      await evaluate(`
        localStorage.setItem("orderpage_selected_locale", "${targetLang}");
        document.cookie = "orderpage_locale=${targetLang}; path=/; max-age=31536000; SameSite=Lax";
        // Also click language button if available
        const btn = Array.from(document.querySelectorAll("button")).find(b => {
          const txt = b.textContent.trim().toLowerCase();
          return "${targetLang}" === "bn" ? (txt === "বাং" || txt.includes("বাং")) : (txt === "en" || txt.includes("en"));
        });
        if (btn) btn.click();
      `);
      await new Promise((r) => setTimeout(r, 400));
    }

    async function clickPaymentMethod(method) {
      await evaluate(`
        const radios = Array.from(document.querySelectorAll('[role="radio"]'));
        const target = radios.find(r => {
          const txt = r.textContent.toLowerCase();
          if ("${method}" === "cod") return txt.includes("cash") || txt.includes("ক্যাশ");
          if ("${method}" === "bkash") return txt.includes("bkash") || txt.includes("বিকাশ");
          if ("${method}" === "nagad") return txt.includes("nagad") || txt.includes("নগদ");
          if ("${method}" === "rocket") return txt.includes("rocket") || txt.includes("রকেট");
          return false;
        });
        if (target) {
          target.click();
          target.scrollIntoView({ behavior: "instant", block: "center" });
        }
      `);
      await new Promise((r) => setTimeout(r, 400));
    }

    const widths = [360, 390, 768, 1280];
    const langs = ["bn", "en"];

    for (const w of widths) {
      const h = w >= 1280 ? 900 : w >= 768 ? 1024 : 800;
      console.log(`\n=== Testing Viewport ${w}x${h} ===`);

      await send("Emulation.setDeviceMetricsOverride", {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile: w < 768,
      });

      for (const lang of langs) {
        console.log(`\n--- Language: ${lang.toUpperCase()} at ${w}px ---`);

        // 1. /demo-brand
        await send("Page.navigate", { url: "http://localhost:3000/demo-brand" });
        await new Promise((r) => setTimeout(r, 1500));
        await setLang(lang);
        await new Promise((r) => setTimeout(r, 500));

        // 1a. top
        await evaluate("window.scrollTo(0, 0)");
        await new Promise((r) => setTimeout(r, 300));
        await capture(`demo-brand_${w}px_${lang}_top.png`);

        // 1b. mid
        await evaluate("window.scrollTo(0, 500)");
        await new Promise((r) => setTimeout(r, 300));
        await capture(`demo-brand_${w}px_${lang}_mid.png`);

        // 1c. sticky bar
        await evaluate("window.scrollTo(0, 350)");
        await new Promise((r) => setTimeout(r, 300));
        await capture(`demo-brand_${w}px_${lang}_sticky-bar.png`);

        // 1d. form with COD selected
        await clickPaymentMethod("cod");
        await capture(`demo-brand_${w}px_${lang}_form-cod.png`);

        // 1e. form with bKash selected
        await clickPaymentMethod("bkash");
        await capture(`demo-brand_${w}px_${lang}_form-bkash.png`);

        // 1f. form with Nagad selected
        await clickPaymentMethod("nagad");
        await capture(`demo-brand_${w}px_${lang}_form-nagad.png`);

        // 1g. form with Rocket selected
        await clickPaymentMethod("rocket");
        await capture(`demo-brand_${w}px_${lang}_form-rocket.png`);

        // 2. Thank you page
        await send("Page.navigate", { url: "http://localhost:3000/demo-brand/thanks" });
        await new Promise((r) => setTimeout(r, 1200));
        await setLang(lang);
        await new Promise((r) => setTimeout(r, 400));
        await evaluate("window.scrollTo(0, 0)");
        await capture(`thanks_${w}px_${lang}.png`);

        // 3. Landing page
        await send("Page.navigate", { url: "http://localhost:3000/" });
        await new Promise((r) => setTimeout(r, 1200));
        await evaluate("window.scrollTo(0, 0)");
        await capture(`landing_${w}px_${lang}.png`);
      }
    }

    console.log("\nAll baseline screenshots captured successfully!");
    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("Error capturing baseline:", err);
  process.exit(1);
});
