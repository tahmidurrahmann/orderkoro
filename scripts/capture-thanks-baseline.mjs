import cp from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9240;
const BASE_DIR = "screenshots/thanks-baseline";
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

const codSummary = {
  orderNumber: "BNN-261103-0001",
  slug: "demo-brand",
  productTitle: { bn: "প্রিমিয়াম সুতি পাঞ্জাবি নকশী কলার", en: "Premium Cotton Panjabi Embroidered Collar" },
  colorName: { bn: "ইন্ডিগো ব্লু", en: "Indigo Blue" },
  sizeName: "L",
  quantity: 1,
  unitPrice: 1290,
  subtotal: 1290,
  deliveryCharge: 70,
  deliveryZoneLabel: { bn: "ঢাকা সিটি", en: "Dhaka City" },
  daysMin: 1,
  daysMax: 2,
  total: 1360,
  confirmationMode: "call",
  paymentMethod: "cod",
  eventId: "ev_12345",
  createdAtIso: "2026-11-03T05:30:00.000Z",
};

const mobileSummary = {
  orderNumber: "BNN-261103-0002",
  slug: "demo-brand",
  productTitle: { bn: "প্রিমিয়াম সুতি পাঞ্জাবি নকশী কলার", en: "Premium Cotton Panjabi Embroidered Collar" },
  colorName: { bn: "টেরাকোটা", en: "Terracotta" },
  sizeName: "XL",
  quantity: 2,
  unitPrice: 1290,
  subtotal: 2580,
  deliveryCharge: 130,
  deliveryZoneLabel: { bn: "ঢাকার বাইরে", en: "Outside Dhaka" },
  daysMin: 3,
  daysMax: 5,
  total: 2710,
  confirmationMode: "call",
  paymentMethod: "bkash",
  eventId: "ev_67890",
  createdAtIso: "2026-11-03T05:30:00.000Z",
};

async function capture(orderType, lang, width) {
  const isMobile = width <= 640;
  const filename = `thanks-${orderType}-${width}-${lang}.png`;
  const summary = orderType === "cod" ? { ...codSummary, language: lang } : { ...mobileSummary, language: lang };

  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: isMobile,
  });

  // Navigate to domain first to access sessionStorage
  await send("Page.navigate", { url: `http://localhost:3000/demo-brand/thanks` });
  await new Promise((r) => setTimeout(r, 600));

  // Set sessionStorage
  await send("Runtime.evaluate", {
    expression: `(() => {
      sessionStorage.setItem("orderpage_last_order_demo-brand", JSON.stringify(${JSON.stringify(summary)}));
    })()`,
  });

  // Reload or re-navigate to pick up sessionStorage and language
  await send("Page.navigate", { url: `http://localhost:3000/demo-brand/thanks` });
  await new Promise((r) => setTimeout(r, 1200));

  // If language needs toggle
  await send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.querySelector('button[aria-pressed="${lang === "bn"}"]');
      // If language button exists and not selected
      const bnBtn = document.querySelector('button[type="button"]:nth-child(1)');
      const enBtn = document.querySelector('button[type="button"]:nth-child(2)');
      if ("${lang}" === "en" && enBtn) enBtn.click();
      if ("${lang}" === "bn" && bnBtn) bnBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 500));

  // Capture full receipt container
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(BASE_DIR, filename), Buffer.from(shot.data, "base64"));
  console.log(`Captured baseline: ${filename}`);
}

async function run() {
  for (const orderType of ["cod", "mobile"]) {
    for (const lang of ["bn", "en"]) {
      for (const width of [360, 1280]) {
        await capture(orderType, lang, width);
      }
    }
  }
  console.log("All 8 baseline screenshots captured!");
  chrome.kill();
}

run().catch((e) => {
  console.error(e);
  chrome.kill();
});
