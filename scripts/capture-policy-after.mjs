import cp from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9228;
const BASE_DIR = "screenshots/policy-after";
fs.mkdirSync(BASE_DIR, { recursive: true });

const chrome = cp.spawn(CHROME_PATH, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--disable-gpu",
]);

await new Promise((r) => setTimeout(r, 1500));
const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const pageTab = tabs.find((t) => t.type === "page") || tabs[0];
const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

let id = 1;
const send = (method, params = {}) =>
  new Promise((res) => {
    const curId = id++;
    const handler = (msg) => {
      const d = JSON.parse(msg.data);
      if (d.id === curId) {
        ws.removeEventListener("message", handler);
        res(d.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

await new Promise((r) => (ws.onopen = r));
await send("Page.enable");

async function captureElement(url, selector, filename, width = 1280, height = 900, isMobile = false) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: isMobile,
  });
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 1200));

  let clip;
  if (selector) {
    const res = await send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector("${selector}");
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, scale: 1 };
      })()`,
      returnByValue: true,
    });
    if (res.result?.value) {
      clip = res.result.value;
      if (clip.y < 0 || clip.y > height) {
        await send("Runtime.evaluate", {
          expression: `document.querySelector("${selector}").scrollIntoView({ block: "center" })`,
        });
        await new Promise((r) => setTimeout(r, 400));
        const res2 = await send("Runtime.evaluate", {
          expression: `(() => {
            const el = document.querySelector("${selector}");
            const rect = el.getBoundingClientRect();
            return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, scale: 1 };
          })()`,
          returnByValue: true,
        });
        if (res2.result?.value) clip = res2.result.value;
      }
    }
  }

  const captureParams = { format: "png" };
  if (clip && clip.width > 0 && clip.height > 0) {
    captureParams.clip = clip;
  }
  const shot = await send("Page.captureScreenshot", captureParams);
  fs.writeFileSync(path.join(BASE_DIR, filename), Buffer.from(shot.data, "base64"));
  console.log(`Captured after: ${filename}`);
}

async function run() {
  for (const lang of ["bn", "en"]) {
    const base = `http://localhost:3000/demo-brand?lang=${lang}`;

    // 1. Header at 360px and 1280px
    await captureElement(base, "header", `demo-header-360-${lang}.png`, 360, 640, true);
    await captureElement(base, "header", `demo-header-1280-${lang}.png`, 1280, 900, false);

    // 2. Trust badge block
    await captureElement(base, ".space-y-4 > .grid", `demo-trust-badges-${lang}.png`, 1280, 900, false);

    // 3. Policy box
    await captureElement(base, ".rounded-2xl.border.border-\\[var\\(--border-subtle\\)\\].bg-\\[var\\(--bg-subtle\\)\\]", `demo-policy-box-${lang}.png`, 1280, 900, false);

    // 4. Form
    await captureElement(base, "#order-form", `demo-form-${lang}.png`, 1280, 1200, false);

    // 5. Privacy page
    await captureElement(`http://localhost:3000/demo-brand/privacy?lang=${lang}`, "main", `privacy-${lang}.png`, 1280, 900, false);

    // 6. Terms page
    await captureElement(`http://localhost:3000/demo-brand/terms?lang=${lang}`, "main", `terms-${lang}.png`, 1280, 900, false);

    // 7. Thank you page
    await captureElement(`http://localhost:3000/demo-brand/thanks?lang=${lang}`, "main", `thanks-${lang}.png`, 1280, 900, false);
  }

  console.log("All after screenshots captured!");
  chrome.kill();
}

run().catch((e) => {
  console.error(e);
  chrome.kill();
});
