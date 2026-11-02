"use client";

import { useEffect, useRef } from "react";

interface MetaPixelProps {
  pixelId?: string;
}

export default function MetaPixel({ pixelId }: MetaPixelProps) {
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    const cleanId = (pixelId || "").trim();
    if (!cleanId || initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    // Initialize fbq stub immediately so calls queue safely
    if (typeof window !== "undefined" && !window.fbq) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f: any = function (...args: unknown[]) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        f.callMethod ? f.callMethod(...args) : f.queue.push(args);
      };
      if (!window._fbq) window._fbq = f;
      f.push = f;
      f.loaded = true;
      f.version = "2.0";
      f.queue = [];
      window.fbq = f;
    }

    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("init", cleanId);
      window.fbq("track", "PageView");
    }

    let scriptLoaded = false;
    function injectScript() {
      if (scriptLoaded || typeof window === "undefined") return;
      scriptLoaded = true;

      const existingScript = document.querySelector(
        'script[src="https://connect.facebook.net/en_US/fbevents.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        const firstScript = document.getElementsByTagName("script")[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(script, firstScript);
        } else {
          document.head.appendChild(script);
        }
      }

      cleanupListeners();
    }

    const events = ["scroll", "pointerdown", "touchstart", "keydown"] as const;
    function cleanupListeners() {
      events.forEach((evt) => {
        window.removeEventListener(evt, injectScript);
      });
    }

    // Lazy-load fbevents.js: load on first interaction or when idle after 3.5s
    events.forEach((evt) => {
      window.addEventListener(evt, injectScript, { once: true, passive: true });
    });

    const timer = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).requestIdleCallback(injectScript);
      } else {
        injectScript();
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      cleanupListeners();
    };
  }, [pixelId]);

  if (!pixelId || !pixelId.trim()) {
    return null;
  }

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(
          pixelId.trim()
        )}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
