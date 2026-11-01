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

    function injectPixel() {
      if (typeof window === "undefined") return;

      // Initialize fbq stub if not already present
      if (!window.fbq) {
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

      // Inject fbevents.js script tag
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

      if (typeof window.fbq === "function") {
        window.fbq("init", cleanId);
        window.fbq("track", "PageView");
      }
    }

    // Lazy load: inject after page load and requestIdleCallback so it never blocks LCP
    if (document.readyState === "complete") {
      if ("requestIdleCallback" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).requestIdleCallback(injectPixel);
      } else {
        setTimeout(injectPixel, 200);
      }
    } else {
      const handleLoad = () => {
        if ("requestIdleCallback" in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).requestIdleCallback(injectPixel);
        } else {
          setTimeout(injectPixel, 200);
        }
      };
      window.addEventListener("load", handleLoad, { once: true });
      return () => window.removeEventListener("load", handleLoad);
    }
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
