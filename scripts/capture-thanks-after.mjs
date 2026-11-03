import cp from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9248;
const BASE_DIR = "screenshots/thanks-after";
fs.mkdirSync(BASE_DIR, { recursive: true });

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

const codReceipt = {
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
  deliveryAddress: "House 12, Road 4, Dhanmondi, Dhaka",
  confirmationMode: "call",
  paymentMethod: "cod",
  createdAtIso: "2026-11-03T05:30:00.000Z",
  savedAt: Date.now(),
};

const mobileReceipt = {
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
  deliveryAddress: "GEC Circle, Nasirabad, Chittagong",
  confirmationMode: "call",
  paymentMethod: "bkash",
  transactionId: "BK9X77A12",
  createdAtIso: "2026-11-03T05:30:00.000Z",
  savedAt: Date.now(),
};

async function capture(orderType, lang, width) {
  const isMobile = width <= 640;
  const filename = `thanks-${orderType}-${width}-${lang}.png`;
  const receipt = orderType === "cod" ? { ...codReceipt, language: lang } : { ...mobileReceipt, language: lang };

  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: isMobile,
  });

  // Navigate to domain first to set storage
  await send("Page.navigate", { url: `http://localhost:3000/demo-brand/thanks` });
  await new Promise((r) => setTimeout(r, 800));

  // Set storage: both sessionStorage and localStorage with receipt
  await send("Runtime.evaluate", {
    expression: `(() => {
      const payload = JSON.stringify(${JSON.stringify(receipt)});
      sessionStorage.setItem("orderpage_receipt_demo-brand", payload);
      sessionStorage.setItem("orderpage_last_order_demo-brand", payload);
      localStorage.setItem("orderpage_receipt_demo-brand", payload);
    })()`,
  });

  // Reload to pick up stored receipt
  await send("Page.navigate", { url: `http://localhost:3000/demo-brand/thanks` });
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

  // Capture full screenshot
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  fs.writeFileSync(path.join(BASE_DIR, filename), Buffer.from(shot.data, "base64"));
  console.log(`Captured after: ${filename}`);
}

async function run() {
  for (const orderType of ["cod", "mobile"]) {
    for (const lang of ["bn", "en"]) {
      for (const width of [360, 1280]) {
        await capture(orderType, lang, width);
      }
    }
  }
  console.log("All 8 post-edit screenshots captured!");
  chrome.kill();
}

run().catch((e) => {
  console.error(e);
  chrome.kill();
});
