import cp from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(os.tmpdir(), "chrome-brandkit-" + Date.now());
const OUTPUT_DIR = path.resolve("screenshots/brandkit-verification");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function run() {
  console.log("Starting Chrome for brandkit verification capture...");
  const chrome = cp.spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9230",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${USER_DATA_DIR}`,
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const tabsRes = await fetch("http://127.0.0.1:9230/json/list");
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

    async function setViewport(width, height) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: width <= 500,
      });
      await send("Emulation.setVisibleSize", { width, height });
    }

    async function navigate(url) {
      await send("Page.navigate", { url });
      await new Promise((r) => setTimeout(r, 1500));
    }

    async function capture(filename) {
      const res = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(res.result.data, "base64"));
      console.log(`Saved screenshot: ${filename}`);
    }

    // 1. Landing Page (/)
    for (const width of [390, 1280]) {
      const height = width === 390 ? 844 : 800;
      await setViewport(width, height);
      await navigate("http://localhost:3000/");
      await capture(`landing-${width}px.png`);

      if (width === 1280) {
        const logoMetrics = await evaluate(`(() => {
          const img = document.querySelector("header a img");
          const text = document.querySelector("header a span");
          if (!img || !text) return null;
          const imgRect = img.getBoundingClientRect();
          const textRect = text.getBoundingClientRect();
          const style = window.getComputedStyle(text);
          return {
            img: { src: img.src, w: imgRect.width, h: imgRect.height },
            text: {
              content: text.textContent,
              fontFamily: style.fontFamily,
              fontWeight: style.fontWeight,
              color: style.color,
              w: textRect.width,
              h: textRect.height
            }
          };
        })()`);
        console.log("Landing Wordmark Metrics (1280px):", JSON.stringify(logoMetrics, null, 2));
      }
    }

    // 2. Seller Page (/demo-brand)
    for (const width of [390, 1280]) {
      const height = width === 390 ? 844 : 800;
      await setViewport(width, height);
      await navigate("http://localhost:3000/demo-brand");
      await capture(`seller-demobrand-${width}px.png`);

      // Scroll to bottom to capture footer
      await evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await new Promise((r) => setTimeout(r, 600));
      await capture(`seller-demobrand-footer-${width}px.png`);

      if (width === 1280) {
        const sellerMetrics = await evaluate(`(() => {
          const sellerLogo = document.querySelector("header img");
          const poweredBy = document.querySelector("footer a[href*='orderkoro']");
          const poweredImg = poweredBy?.querySelector("img");
          const favicons = Array.from(document.querySelectorAll("link[rel*='icon']")).map(l => ({ rel: l.rel, href: l.href }));
          return {
            sellerLogo: sellerLogo ? { src: sellerLogo.src, w: sellerLogo.width, h: sellerLogo.height } : null,
            poweredBy: poweredBy ? {
              text: poweredBy.textContent.trim(),
              href: poweredBy.href,
              img: poweredImg ? { src: poweredImg.src, w: poweredImg.getBoundingClientRect().width, h: poweredImg.getBoundingClientRect().height } : null
            } : null,
            favicons
          };
        })()`);
        console.log("Seller Storefront Metrics (1280px):", JSON.stringify(sellerMetrics, null, 2));
      }
    }

    // 3. Legal Page (/demo-brand/terms)
    for (const width of [390, 1280]) {
      const height = width === 390 ? 844 : 800;
      await setViewport(width, height);
      await navigate("http://localhost:3000/demo-brand/terms");
      await capture(`seller-terms-${width}px.png`);
    }

    // 4. Thank You Page (/demo-brand/thanks)
    for (const width of [390, 1280]) {
      const height = width === 390 ? 844 : 800;
      await setViewport(width, height);
      await navigate("http://localhost:3000/demo-brand/thanks");
      await capture(`seller-thanks-${width}px.png`);
    }

    console.log("Verification captures complete!");
    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
