import cp from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9254;
const BASE_DIR = "screenshots/order-status";
fs.mkdirSync(BASE_DIR, { recursive: true });

// Place real order to seed server Redis and get cryptographic token
const orderRes = await fetch("http://localhost:3000/api/order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    slug: "demo-brand",
    idempotencyKey: `status-capture-${Date.now()}`,
    name: "Rahim Uddin",
    phone: "01712345678",
    address: "House 12, Road 4, Dhanmondi",
    district: "Dhaka",
    zone: "dhaka-city",
    color: "Deep Indigo",
    size: "M (40)",
    quantity: 1,
    paymentMethod: "cod",
    lang: "bn",
  }),
});

const orderData = await orderRes.json();
console.log("Seeded order result:", JSON.stringify(orderData, null, 2));
const token = orderData.token;
if (!token) {
  throw new Error("Failed to seed order or receive token");
}

const chrome = cp.spawn(CHROME_PATH, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--disable-gpu",
  "--disable-extensions",
]);

await new Promise((r) => setTimeout(r, 1500));
const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const pageTab = tabs.find((t) => t.type === "page" && !t.url.startsWith("chrome-extension://")) || tabs[0];
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

async function capture(lang, width) {
  const isMobile = width <= 640;
  const filename = `status-${width}-${lang}.png`;

  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: isMobile,
  });

  await send("Page.navigate", { url: `http://localhost:3000/demo-brand/order/${token}` });
  await new Promise((r) => setTimeout(r, 1600));

  // Toggle language if requested
  await send("Runtime.evaluate", {
    expression: `(() => {
      const bnBtn = document.querySelector('header button[type="button"]:nth-child(1)');
      const enBtn = document.querySelector('header button[type="button"]:nth-child(2)');
      if ("${lang}" === "en" && enBtn) enBtn.click();
      if ("${lang}" === "bn" && bnBtn) bnBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 600));

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });

  const outPath = path.join(BASE_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(screenshot.data, "base64"));
  console.log(`Captured ${outPath}`);
}

try {
  await capture("bn", 360);
  await capture("bn", 1280);
  await capture("en", 360);
  await capture("en", 1280);
  console.log("All order status screenshots captured successfully.");
} finally {
  ws.close();
  chrome.kill();
}
