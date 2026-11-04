import cp from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = path.resolve("screenshots/landing-upgrade");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const USER_DATA_DIR = path.join(os.tmpdir(), "chrome-landing-upgrade-" + Date.now());
const PORT = 9227;

async function run() {
  console.log(`Starting Chrome on port ${PORT}...`);
  const chrome = cp.spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${USER_DATA_DIR}`,
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const tabsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
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
      return res.result?.result?.value;
    }

    async function capture(filename) {
      const res = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      const filePath = path.join(SCREENSHOT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(res.result.data, "base64"));
      console.log(`Saved screenshot: ${filePath} (${fs.statSync(filePath).size} bytes)`);
    }

    // -------------------------------------------------------------
    // Test Viewports and Languages
    // -------------------------------------------------------------
    const configurations = [
      { lang: "bn", width: 390, height: 844 },
      { lang: "bn", width: 1280, height: 800 },
      { lang: "en", width: 390, height: 844 },
      { lang: "en", width: 1280, height: 800 },
    ];

    for (const config of configurations) {
      console.log(`\nTesting ${config.lang.toUpperCase()} at ${config.width}px...`);

      await send("Emulation.setDeviceMetricsOverride", {
        width: config.width,
        height: config.height,
        deviceScaleFactor: 2,
        mobile: config.width < 768,
      });

      await send("Page.navigate", { url: `http://localhost:3000/?lang=${config.lang}` });
      await new Promise((r) => setTimeout(r, 1500));

      // 1. Check Horizontal Scroll
      if (config.width === 390) {
        const scrollWidth = await evaluate(`document.documentElement.scrollWidth`);
        const clientWidth = await evaluate(`document.documentElement.clientWidth`);
        console.log(`Horizontal scroll check (${config.lang} 390px): scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
        if (scrollWidth > clientWidth) {
          console.error(`FAIL: Horizontal scroll detected! ${scrollWidth} > ${clientWidth}`);
        } else {
          console.log(`PASS: No horizontal scroll at 390px.`);
        }

        // 2. Sticky Bar Footer Overlap Check (when scrolled to bottom)
        await evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
        await new Promise((r) => setTimeout(r, 500));

        const overlapCheck = await evaluate(`
          (() => {
            const footer = document.querySelector("footer");
            const stickyBar = document.querySelector('[role="region"][aria-label="Quick Actions"]');
            if (!footer || !stickyBar) return { footerFound: !!footer, stickyBarFound: !!stickyBar, overlaps: false };
            const fRect = footer.getBoundingClientRect();
            const sRect = stickyBar.getBoundingClientRect();
            return {
              footerFound: true,
              stickyBarFound: true,
              footerBottom: Math.round(fRect.bottom),
              stickyTop: Math.round(sRect.top),
              clearsSticky: fRect.bottom <= sRect.top,
            };
          })()
        `);
        console.log("Sticky bar footer overlap check:", overlapCheck);
      }

      // Check language strings on the page
      const h1Text = await evaluate(`document.querySelector("h1")?.innerText`);
      console.log(`H1 text (${config.lang}):`, h1Text);

      // Capture full screenshot
      await capture(`landing-${config.width}px-${config.lang}.png`);
    }

    // -------------------------------------------------------------
    // Additional Content Checks
    // -------------------------------------------------------------
    console.log("\n--- Checking Content Claims & Visibility ---");
    const contentAudit = await evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          hasH1: !!document.querySelector("h1"),
          h1Text: document.querySelector("h1")?.innerText,
          hasMonthlyMention: text.includes("মাসিক") || text.includes("Monthly"),
          hasPixelCard: !!document.querySelector("#benefit-pixel"),
          hasEarlyOfferCard: text.includes("First 5 sellers") || text.includes("প্রথম 5 জন সেলার"),
          faqPixelText: text.includes("Coming soon") || text.includes("শিগগিরই"),
        };
      })()
    `);
    console.log("Content audit:", contentAudit);

    // Test Language switch button click
    console.log("\n--- Testing Language Toggle Click ---");
    const beforeToggle = await evaluate(`document.querySelector("h1")?.innerText`);
    console.log("Before toggle click:", beforeToggle);
    await evaluate(`
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("বাং"));
      if (btn) btn.click();
    `);
    await new Promise((r) => setTimeout(r, 500));
    const afterToggle = await evaluate(`document.querySelector("h1")?.innerText`);
    console.log("After clicking বাং button:", afterToggle);

    ws.close();
    console.log("\nFinished landing verification successfully.");
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    try {
      chrome.kill();
    } catch {}
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run();
