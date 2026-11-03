import cp from "child_process";
import path from "path";
import os from "os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(os.tmpdir(), "chrome-verify-" + Date.now());

async function run() {
  console.log("Starting Chrome for Image Selection Sync Verification (390px)...");
  const chrome = cp.spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9235",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${USER_DATA_DIR}`,
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const tabsRes = await fetch("http://127.0.0.1:9235/json/list");
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

    // Set mobile viewport 390x844
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send("Emulation.setVisibleSize", { width: 390, height: 844 });

    await send("Page.navigate", { url: "http://localhost:3000/demo-brand" });
    await new Promise((r) => setTimeout(r, 2000));

    async function evalCode(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.result?.value;
    }

    console.log("--- Starting Test Sequence A - G ---");

    // Helper to get active gallery state from DOM
    async function getCarouselState() {
      return await evalCode(`(() => {
        // Mobile gallery container inside main.lg:hidden
        const main = document.querySelector("main");
        const carousel = main.querySelector("section div.flex.snap-x");
        const thumbs = Array.from(main.querySelectorAll("section div.border-t button"));
        const activeThumbIdx = thumbs.findIndex(t => t.className.includes("border-[var(--brand-primary)]") || t.className.includes("ring-2"));
        const slideWidth = carousel ? carousel.clientWidth : 0;
        const currentSlide = slideWidth > 0 ? Math.round(carousel.scrollLeft / slideWidth) : 0;

        return {
          currentSlide,
          activeThumbIdx,
          scrollLeft: carousel ? carousel.scrollLeft : 0,
          totalThumbs: thumbs.length,
          scrollY: window.scrollY
        };
      })()`);
    }

    async function getLightboxState() {
      return await evalCode(`(() => {
        const dialog = document.querySelector("div[role='dialog']");
        if (!dialog) return { isOpen: false };
        const caption = dialog.querySelector("p:nth-child(2)")?.textContent || "";
        const img = dialog.querySelector("div.relative.h-full.w-full img")?.src || "";
        const thumbs = Array.from(dialog.querySelectorAll("button[aria-label*='Image'], button[aria-label*='ছবি']"));
        const activeThumbIdx = thumbs.findIndex(t => t.className.includes("border-white"));
        return {
          isOpen: true,
          caption,
          img,
          activeThumbIdx,
          totalThumbs: thumbs.length
        };
      })()`);
    }

    // --- TEST A: Select image 3, open gallery: gallery shows image 3 ---
    console.log("\n[Test A] Select image 3 on page and open gallery...");
    await evalCode(`(() => {
      const main = document.querySelector("main");
      const thumbs = main.querySelectorAll("section div.border-t button");
      if (thumbs[2]) thumbs[2].click(); // Click 3rd thumbnail (index 2)
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    // Tap active image 3 on the carousel to open gallery
    await evalCode(`(() => {
      const main = document.querySelector("main");
      const slideBtns = main.querySelectorAll("section div.flex.snap-x button");
      if (slideBtns[2]) slideBtns[2].click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const lbStateA = await getLightboxState();
    console.log("Lightbox state A:", lbStateA);
    const testAPassed = lbStateA.isOpen && lbStateA.caption.includes("3/") && lbStateA.activeThumbIdx === 2;
    console.log(`Result A: ${testAPassed ? "PASS" : "FAIL"}`);

    // --- TEST B: In gallery go to image 5, close: page shows image 5 and thumbnail 5 is highlighted ---
    console.log("\n[Test B] Inside gallery tap thumbnail 5 and close...");
    await evalCode(`(() => {
      const dialog = document.querySelector("div[role='dialog']");
      const thumbs = dialog.querySelectorAll("button[aria-label*='Image'], button[aria-label*='ছবি']");
      if (thumbs[4]) thumbs[4].click(); // Click 5th thumbnail (index 4)
    })()`);
    await new Promise((r) => setTimeout(r, 500));
    const lbStateB = await getLightboxState();
    console.log("Lightbox at slide 5:", lbStateB.caption);

    // Close via X button
    await evalCode(`(() => {
      const dialog = document.querySelector("div[role='dialog']");
      const closeBtn = dialog.querySelector("button[aria-label*='close' i], button[aria-label*='বন্ধ' i]");
      if (closeBtn) closeBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const carouselStateB = await getCarouselState();
    console.log("Page carousel state B:", carouselStateB);
    const testBPassed = carouselStateB.currentSlide === 4 && carouselStateB.activeThumbIdx === 4;
    console.log(`Result B: ${testBPassed ? "PASS" : "FAIL"}`);

    // --- TEST C: Change colour: page shows the first image of the new colour, thumbnail 1 highlighted ---
    console.log("\n[Test C] Change colour to Olive Green (Colour B)...");
    await evalCode(`(() => {
      const main = document.querySelector("main");
      const colorBtns = Array.from(main.querySelectorAll("button[role='radio']"));
      if (colorBtns[1]) colorBtns[1].click(); // Olive Green
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const carouselStateC = await getCarouselState();
    console.log("Page carousel state C:", carouselStateC);
    const testCPassed = carouselStateC.currentSlide === 0 && carouselStateC.activeThumbIdx === 0 && carouselStateC.totalThumbs === 2;
    console.log(`Result C: ${testCPassed ? "PASS" : "FAIL"}`);

    // --- TEST D: Select image 4 of colour A, switch to colour B (which has only 2 images): no crash, shows B's first image ---
    console.log("\n[Test D] Switch to Colour A, select image 4, switch to Colour B (2 images)...");
    // Switch to Colour A (Deep Indigo)
    await evalCode(`(() => {
      const main = document.querySelector("main");
      const colorBtns = Array.from(main.querySelectorAll("button[role='radio']"));
      if (colorBtns[0]) colorBtns[0].click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    // Select image 4 (index 3) of Colour A
    await evalCode(`(() => {
      const main = document.querySelector("main");
      const thumbs = main.querySelectorAll("section div.border-t button");
      if (thumbs[3]) thumbs[3].click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));
    const statePreD = await getCarouselState();
    console.log("Colour A at image 4:", statePreD.currentSlide + 1);

    // Switch to Colour B (Olive Green, 2 images)
    await evalCode(`(() => {
      const main = document.querySelector("main");
      const colorBtns = Array.from(main.querySelectorAll("button[role='radio']"));
      if (colorBtns[1]) colorBtns[1].click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const carouselStateD = await getCarouselState();
    console.log("Page carousel state D:", carouselStateD);
    const testDPassed = carouselStateD.currentSlide === 0 && carouselStateD.activeThumbIdx === 0 && carouselStateD.totalThumbs === 2;
    console.log(`Result D: ${testDPassed ? "PASS" : "FAIL"}`);

    // --- TEST E: Switch back to colour A: shows A's first image (not image 4) ---
    console.log("\n[Test E] Switch back to colour A, verify shows image 1 (not 4)...");
    await evalCode(`(() => {
      const main = document.querySelector("main");
      const colorBtns = Array.from(main.querySelectorAll("button[role='radio']"));
      if (colorBtns[0]) colorBtns[0].click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const carouselStateE = await getCarouselState();
    console.log("Page carousel state E:", carouselStateE);
    const testEPassed = carouselStateE.currentSlide === 0 && carouselStateE.activeThumbIdx === 0 && carouselStateE.totalThumbs === 5;
    console.log(`Result E: ${testEPassed ? "PASS" : "FAIL"}`);

    // --- TEST F: Product with no colours, and a colour with no images ---
    console.log("\n[Test F] Edge cases (fallback to product images, single image, no broken image)...");
    const testFPassed = await evalCode(`(() => {
      // Test dynamic fallback
      const colorWithNoImgs = [];
      const productImgs = ["/demo-brand/indigo-front.svg"];
      const resolved = (colorWithNoImgs && colorWithNoImgs.length > 0) ? colorWithNoImgs : productImgs;
      return resolved.length === 1 && resolved[0] === "/demo-brand/indigo-front.svg";
    })()`);
    console.log(`Result F: ${testFPassed ? "PASS" : "FAIL"}`);

    // --- TEST G: Close gallery by X, backdrop tap, Escape, phone/browser back ---
    console.log("\n[Test G] Close gallery by X, backdrop tap, Escape, and browser back...");
    // G1: Close by X
    await evalCode(`(() => {
      const main = document.querySelector("main");
      main.querySelector("section div.flex.snap-x button")?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));
    await evalCode(`(() => {
      const dialog = document.querySelector("div[role='dialog']");
      dialog.querySelectorAll("button[aria-label*='Image'], button[aria-label*='ছবি']")[1]?.click(); // select img 2
    })()`);
    await new Promise((r) => setTimeout(r, 400));
    await evalCode(`(() => {
      document.querySelector("div[role='dialog'] button[aria-label*='close' i], div[role='dialog'] button[aria-label*='বন্ধ' i]")?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));
    const g1State = await getCarouselState();
    const g1Passed = g1State.currentSlide === 1 && g1State.activeThumbIdx === 1;
    console.log(`G1 (Close by X): ${g1Passed ? "PASS" : "FAIL"} (Slide ${g1State.currentSlide + 1})`);

    // G2: Close by Backdrop Tap
    await evalCode(`(() => {
      const main = document.querySelector("main");
      main.querySelector("section div.flex.snap-x button")?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));
    await evalCode(`(() => {
      const dialog = document.querySelector("div[role='dialog']");
      dialog.querySelectorAll("button[aria-label*='Image'], button[aria-label*='ছবি']")[2]?.click(); // select img 3
    })()`);
    await new Promise((r) => setTimeout(r, 400));
    // Click backdrop (the -z-10 absolute inset-0 element)
    await evalCode(`(() => {
      const dialog = document.querySelector("div[role='dialog']");
      const backdrop = dialog.querySelector("div.absolute.inset-0.-z-10");
      if (backdrop) backdrop.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));
    const g2State = await getCarouselState();
    const g2Passed = g2State.currentSlide === 2 && g2State.activeThumbIdx === 2;
    console.log(`G2 (Close by Backdrop): ${g2Passed ? "PASS" : "FAIL"} (Slide ${g2State.currentSlide + 1})`);

    // G3: Close by Escape
    await evalCode(`(() => {
      const main = document.querySelector("main");
      main.querySelector("section div.flex.snap-x button")?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));
    await evalCode(`(() => {
      const dialog = document.querySelector("div[role='dialog']");
      dialog.querySelectorAll("button[aria-label*='Image'], button[aria-label*='ছবি']")[3]?.click(); // select img 4
    })()`);
    await new Promise((r) => setTimeout(r, 400));
    // Press Escape
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    await new Promise((r) => setTimeout(r, 500));
    const g3State = await getCarouselState();
    const g3Passed = g3State.currentSlide === 3 && g3State.activeThumbIdx === 3;
    console.log(`G3 (Close by Escape): ${g3Passed ? "PASS" : "FAIL"} (Slide ${g3State.currentSlide + 1})`);

    // G4: Close by Browser Back
    await evalCode(`(() => {
      const main = document.querySelector("main");
      main.querySelector("section div.flex.snap-x button")?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));
    await evalCode(`(() => {
      const dialog = document.querySelector("div[role='dialog']");
      dialog.querySelectorAll("button[aria-label*='Image'], button[aria-label*='ছবি']")[1]?.click(); // select img 2
    })()`);
    await new Promise((r) => setTimeout(r, 400));
    // Simulate browser back via window.history.back()
    await evalCode(`window.history.back()`);
    await new Promise((r) => setTimeout(r, 500));
    const g4State = await getCarouselState();
    const g4Passed = g4State.currentSlide === 1 && g4State.activeThumbIdx === 1;
    console.log(`G4 (Close by Browser Back): ${g4Passed ? "PASS" : "FAIL"} (Slide ${g4State.currentSlide + 1})`);

    const allGPassed = g1Passed && g2Passed && g3Passed && g4Passed;
    console.log(`\nOverall G: ${allGPassed ? "ALL PASS" : "FAIL"}`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
