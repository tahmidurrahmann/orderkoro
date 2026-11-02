import cp from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const mode = process.argv[2] || "baseline"; // "baseline" or "after"
const OUTPUT_DIR = path.resolve(`screenshots/landing-${mode}`);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const USER_DATA_DIR = path.join(os.tmpdir(), "chrome-landing-" + Date.now());
const PORT = 9225;

async function run() {
  console.log(`Starting Chrome for landing ${mode} capture on port ${PORT}...`);
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

    async function capture(filename) {
      const res = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(res.result.data, "base64"));
      console.log(`Saved screenshot: ${filePath}`);
    }

    const widths = [360, 390, 768, 1280];

    for (const w of widths) {
      const h = w > 640 ? 900 : 800;
      console.log(`Configuring viewport: ${w}x${h}`);
      await send("Emulation.setDeviceMetricsOverride", {
        width: w,
        height: h,
        deviceScaleFactor: 2,
        mobile: w <= 768,
      });

      await send("Page.navigate", { url: "http://localhost:3000/" });
      await new Promise((r) => setTimeout(r, 1500));

      await capture(`landing-${w}px.png`);
    }

    ws.close();
    console.log(`Finished landing ${mode} capture successfully.`);
  } catch (err) {
    console.error("Capture error:", err);
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
