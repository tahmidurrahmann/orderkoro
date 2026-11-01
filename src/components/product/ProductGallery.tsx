"use client";

import Image from "next/image";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type { SupportedLocale } from "@/lib/format";
import { formatNumber } from "@/lib/format";
import type { CopyDictionary } from "@/lib/i18n";

export interface ProductGalleryProps {
  galleryImages: string[];
  activeSlide: number;
  setActiveSlide: React.Dispatch<React.SetStateAction<number>>;
  productTitleText: string;
  activeColorName: string;
  activeColorHex: string;
  soldOut: boolean;
  copy: CopyDictionary;
  lang: SupportedLocale;
}

const emptySubscribe = () => () => {};

export default function ProductGallery({
  galleryImages,
  activeSlide,
  setActiveSlide,
  productTitleText,
  activeColorName,
  activeColorHex,
  soldOut,
  copy,
  lang,
}: ProductGalleryProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const lightboxFrameRef = useRef<HTMLDivElement | null>(null);

  // Lightbox & Zoom state
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchDistRef = useRef<number>(0);
  const initialPinchScaleRef = useRef<number>(1.0);

  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.25;

  // Strict mathematical clamping to prevent exposing empty background
  const clampPan = useCallback((x: number, y: number, scale: number) => {
    if (scale <= 1.02) {
      return { x: 0, y: 0 };
    }
    const frame = lightboxFrameRef.current;
    if (!frame) {
      return { x: 0, y: 0 };
    }
    const rect = frame.getBoundingClientRect();
    const maxPanX = Math.max(0, (rect.width * (scale - 1)) / 2);
    const maxPanY = Math.max(0, (rect.height * (scale - 1)) / 2);

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  }, []);

  const resetZoom = useCallback(() => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
    pinchDistRef.current = 0;
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomScale((prev) => {
      const next = Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2)));
      setPanOffset((currentPan) => clampPan(currentPan.x, currentPan.y, next));
      return next;
    });
  }, [MAX_ZOOM, ZOOM_STEP, clampPan]);

  const handleZoomOut = useCallback(() => {
    setZoomScale((prev) => {
      const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2)));
      if (next <= 1.02) {
        setPanOffset({ x: 0, y: 0 });
        return MIN_ZOOM;
      }
      setPanOffset((currentPan) => clampPan(currentPan.x, currentPan.y, next));
      return next;
    });
  }, [MIN_ZOOM, ZOOM_STEP, clampPan]);

  const handleToggleTargetZoom = useCallback(() => {
    setZoomScale((prev) => {
      if (prev > 1.05) {
        setPanOffset({ x: 0, y: 0 });
        return MIN_ZOOM;
      }
      setPanOffset({ x: 0, y: 0 });
      return 1.5;
    });
  }, [MIN_ZOOM]);

  const setZoomClamped = useCallback(
    (newScale: number) => {
      const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
      if (clampedScale <= 1.05) {
        setPanOffset({ x: 0, y: 0 });
        setZoomScale(1.0);
      } else {
        const rounded = Number(clampedScale.toFixed(2));
        setPanOffset((currentPan) =>
          clampPan(currentPan.x, currentPan.y, rounded),
        );
        setZoomScale(rounded);
      }
    },
    [MAX_ZOOM, MIN_ZOOM, clampPan],
  );

  function scrollToSlide(index: number) {
    const bounded = Math.max(0, Math.min(galleryImages.length - 1, index));
    setActiveSlide(bounded);
    if (carouselRef.current) {
      const slideWidth = carouselRef.current.clientWidth;
      carouselRef.current.scrollTo({
        left: slideWidth * bounded,
        behavior: "smooth",
      });
    }
  }

  function handleCarouselScroll() {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      if (idx !== activeSlide && idx >= 0 && idx < galleryImages.length) {
        setActiveSlide(idx);
      }
    }
  }

  // Keyboard navigation for Lightbox
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
        resetZoom();
      } else if (isLightboxOpen) {
        if (
          [
            " ",
            "Space",
            "PageUp",
            "PageDown",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(e.key)
        ) {
          e.preventDefault();
        }
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          resetZoom();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setActiveSlide((s) => Math.max(0, s - 1));
          resetZoom();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setActiveSlide((s) => Math.min(galleryImages.length - 1, s + 1));
          resetZoom();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isLightboxOpen,
    galleryImages.length,
    handleZoomIn,
    handleZoomOut,
    resetZoom,
    setActiveSlide,
  ]);

  // Lock body scroll and prevent background scrolling while Lightbox is open
  useEffect(() => {
    if (!isLightboxOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalBodyPaddingRight = document.body.style.paddingRight;
    const originalDocOverflow = document.documentElement.style.overflow;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    // Zoom always centered via mouse wheel
    function handleWheelOnLightbox(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();

      const isZoomIn = e.deltaY < 0;

      setZoomScale((prevScale) => {
        const nextScale = isZoomIn
          ? Math.min(MAX_ZOOM, Number((prevScale + ZOOM_STEP).toFixed(2)))
          : Math.max(MIN_ZOOM, Number((prevScale - ZOOM_STEP).toFixed(2)));

        if (nextScale <= 1.02) {
          setPanOffset({ x: 0, y: 0 });
          return MIN_ZOOM;
        }

        // Always zoom directly from center, clamping to frame boundaries
        setPanOffset((currentPan) =>
          clampPan(currentPan.x, currentPan.y, nextScale),
        );
        return nextScale;
      });
    }

    window.addEventListener("wheel", handleWheelOnLightbox, { passive: false });

    return () => {
      document.documentElement.style.overflow = originalDocOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.body.style.paddingRight = originalBodyPaddingRight;
      window.removeEventListener("wheel", handleWheelOnLightbox);
    };
  }, [isLightboxOpen, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, clampPan]);

  // Global mousemove and mouseup listeners for seamless drag panning anywhere on screen
  useEffect(() => {
    if (!isDragging) return;

    function onWindowMouseMove(e: MouseEvent) {
      const rawX = e.clientX - dragStartRef.current.x;
      const rawY = e.clientY - dragStartRef.current.y;
      const clamped = clampPan(rawX, rawY, zoomScale);

      // Keep drag origin in sync so there is zero boundary dead zone when reversing direction
      dragStartRef.current = {
        x: e.clientX - clamped.x,
        y: e.clientY - clamped.y,
      };

      setPanOffset(clamped);
    }

    function onWindowMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [isDragging, zoomScale, clampPan]);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchDistRef.current = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY,
      );
      initialPinchScaleRef.current = zoomScale;
    } else if (e.touches.length === 1 && zoomScale > 1.05) {
      const t = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: t.clientX - panOffset.x,
        y: t.clientY - panOffset.y,
      };
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2 && pinchDistRef.current > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY,
      );
      const factor = currentDist / pinchDistRef.current;
      const computed = initialPinchScaleRef.current * factor;
      setZoomClamped(computed);
    } else if (e.touches.length === 1 && isDragging && zoomScale > 1.05) {
      const t = e.touches[0];
      const rawX = t.clientX - dragStartRef.current.x;
      const rawY = t.clientY - dragStartRef.current.y;
      const clamped = clampPan(rawX, rawY, zoomScale);

      // Keep drag origin in sync so there is zero boundary dead zone when reversing direction
      dragStartRef.current = {
        x: t.clientX - clamped.x,
        y: t.clientY - clamped.y,
      };

      setPanOffset(clamped);
    }
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length < 2) {
      pinchDistRef.current = 0;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (zoomScale > 1.05) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
    }
  }

  return (
    <>
      {/* Storefront Carousel Gallery */}
      <section
        aria-label={lang === "bn" ? "পণ্যের ছবিসমূহ" : "Product image gallery"}
        className="relative overflow-hidden bg-[var(--bg-subtle)] sm:rounded-2xl border border-[var(--border-subtle)]"
      >
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {galleryImages.map((imgSrc, idx) => (
            <div
              key={`${activeColorHex}-${imgSrc}-${idx}`}
              className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-[var(--bg-subtle)]"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveSlide(idx);
                  resetZoom();
                  setIsLightboxOpen(true);
                }}
                aria-label={`${productTitleText} (${activeColorName}) (${idx + 1}/${galleryImages.length}). ${copy.galleryTapToZoom}`}
                className="group relative block h-full w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[var(--brand-primary)]"
              >
                <Image
                  src={imgSrc}
                  alt={`${productTitleText} (${activeColorName}) (${idx + 1}/${galleryImages.length})`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 680px"
                  priority={idx === 0}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  loading={idx === 0 ? "eager" : "lazy"}
                  className="object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                />
                <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-xs">
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                  </svg>
                  <span>
                    {formatNumber(idx + 1, lang)}/
                    {formatNumber(galleryImages.length, lang)}
                  </span>
                </span>
              </button>
            </div>
          ))}
        </div>

        {soldOut && (
          <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-[#B91C1C] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
            {copy.soldOutBadge}
          </div>
        )}

        {/* Clickable Thumbnail Strip */}
        {galleryImages.length > 1 && (
          <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] overflow-x-auto no-scrollbar">
            {galleryImages.map((thumbSrc, idx) => {
              const isCurrent = idx === activeSlide;
              return (
                <button
                  key={`gallery-thumb-${thumbSrc}-${idx}`}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`${copy.galleryImageCount} ${idx + 1}`}
                  className={`relative h-16 w-14 min-[360px]:h-18 min-[360px]:w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 cursor-pointer transition ${
                    isCurrent
                      ? "border-[var(--brand-primary)] shadow-sm ring-2 ring-[var(--brand-primary)]/20 scale-[1.02]"
                      : "border-[var(--border-subtle)] opacity-70 hover:opacity-100 hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Image
                    src={thumbSrc}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Fullscreen Lightbox Modal (Exact Fabrilife Style rendered directly to document.body via Portal) */}
      {mounted &&
        isLightboxOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              lang === "bn"
                ? "পূর্ণাঙ্গ ছবি ও জুম প্রিভিউ"
                : "Fullscreen image preview and zoom"
            }
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none overflow-hidden touch-none"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              minWidth: "100vw",
              minHeight: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.95)",
              zIndex: 99999,
            }}
          >
            {/* Backdrop dismiss on tap outside */}
            <div
              className="absolute inset-0 top-0 left-0 w-full h-full -z-10 cursor-pointer"
              onClick={() => {
                setIsLightboxOpen(false);
                resetZoom();
              }}
              aria-hidden="true"
            />

            {/* Top-Right Close Button (thin outlined circle with X, matching production) */}
            <button
              type="button"
              onClick={() => {
                setIsLightboxOpen(false);
                resetZoom();
              }}
              aria-label={copy.galleryCloseZoom}
              className="absolute top-4 right-4 sm:top-5 sm:right-6 z-[100002] flex h-11 w-11 items-center justify-center rounded-full text-white transition-all duration-200 cursor-pointer active:scale-95"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)";
              }}
            >
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Unified Vertical Column: Image Card + Caption + Thumbnails + Zoom Badge + Zoom Controls Pill */}
            <div className="relative flex flex-col items-center justify-center w-full max-w-full px-2 sm:px-4 z-20 pointer-events-none">
              {/* White Card Container: Image + Caption bar (matches production) */}
              <div
                className="flex flex-col overflow-hidden pointer-events-auto"
                style={{
                  width: "min(600px, calc(100vh - 210px), calc(100vw - 32px))",
                  maxWidth: "600px",
                  backgroundColor: "#f5f0eb",
                  borderRadius: "12px",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                }}
              >
                {/* The Image Viewport Frame */}
                <div
                  ref={lightboxFrameRef}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleMouseDown}
                  onDoubleClick={handleToggleTargetZoom}
                  className="relative overflow-hidden aspect-square flex items-center justify-center touch-none select-none"
                  style={{
                    cursor:
                      zoomScale > 1.02
                        ? isDragging
                          ? "grabbing"
                          : "grab"
                        : "zoom-in",
                    backgroundColor: "#f5f0eb",
                  }}
                >
                  <div
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                      transformOrigin: "center center",
                      transition: isDragging
                        ? "none"
                        : "transform 0.15s ease-out",
                    }}
                    className="relative h-full w-full flex items-center justify-center will-change-transform 
                    bg-white select-none"
                  >
                    <Image
                      src={galleryImages[activeSlide]}
                      alt={`${productTitleText} (${activeColorName}) (${activeSlide + 1})`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 740px, 800px"
                      className="object-contain pointer-events-none select-none rounded-none"
                      priority
                    />
                  </div>
                </div>

                {/* Caption bar at bottom of card */}
                <div
                  className="flex items-center gap-2.5 pointer-events-none select-none"
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "#f5f0eb",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span
                    className="shrink-0"
                    style={{
                      display: "inline-block",
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      backgroundColor: activeColorHex || "#333",
                      border: "2px solid rgba(0,0,0,0.12)",
                    }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate"
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1a1a1a",
                        lineHeight: 1.3,
                      }}
                    >
                      {productTitleText}
                    </p>
                    <p
                      className="truncate"
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        fontWeight: 400,
                        color: "#666",
                        lineHeight: 1.3,
                      }}
                    >
                      {activeColorName} ({activeSlide + 1}/
                      {galleryImages.length})
                    </p>
                  </div>
                </div>
              </div>

              {/* Thumbnails Directly Under Image Card */}
              {galleryImages.length > 1 && (
                <div className="mt-3 sm:mt-3.5 flex items-center justify-center gap-2 max-w-[min(600px,calc(100vw-24px))] overflow-x-auto no-scrollbar touch-pan-x z-30 pointer-events-auto">
                  {galleryImages.map((thumbSrc, thumbIdx) => {
                    const isCurrent = thumbIdx === activeSlide;
                    return (
                      <button
                        key={`lightbox-thumb-${thumbSrc}-${thumbIdx}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSlide(thumbIdx);
                          resetZoom();
                        }}
                        aria-label={`${copy.galleryImageCount} ${thumbIdx + 1}`}
                        className={`relative h-12 w-12 sm:h-[50px] sm:w-[50px] shrink-0 overflow-hidden rounded transition cursor-pointer select-none border-2 ${
                          isCurrent
                            ? "border-white opacity-100 shadow-sm"
                            : "border-transparent opacity-60 hover:opacity-90"
                        }`}
                      >
                        <Image
                          src={thumbSrc}
                          alt={`Thumbnail ${thumbIdx + 1}`}
                          fill
                          sizes="60px"
                          className="object-cover bg-white pointer-events-none select-none"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Zoom Level Indicator: Always preserves its exact vertical space so controls do not jump */}
              <div className="mt-2 sm:mt-2.5 h-7 sm:h-8 flex items-center justify-center z-30 pointer-events-none select-none">
                <div
                  className={`px-3 py-0.5 rounded-full bg-black/85 text-white text-xs sm:text-[13px] font-semibold tracking-wide border border-white/15 shadow-xl transition-all duration-200 ${
                    zoomScale > 1.02
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-95 pointer-events-none invisible"
                  }`}
                  aria-hidden={zoomScale <= 1.02}
                >
                  <span>
                    {formatNumber(Math.round(zoomScale * 100), lang)}%
                  </span>
                </div>
              </div>

              {/* Zoom Controls Pill: Fixed pill matching Fabrilife style */}
              <div className="mt-1 sm:mt-1.5 flex items-center justify-center z-30 pointer-events-auto">
                <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-[#1e1e1e]/90 sm:bg-[#222222]/90 backdrop-blur-md border border-white/10 shadow-2xl">
                  {/* Minus Button */}
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoomScale <= MIN_ZOOM + 0.01}
                    aria-label={lang === "bn" ? "জুম কমান" : "Zoom out"}
                    title={lang === "bn" ? "জুম কমান" : "Zoom out"}
                    className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/35 active:scale-95 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/20 cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4 sm:h-4.5 sm:w-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>

                  {/* Reset Button (↻) */}
                  <button
                    type="button"
                    onClick={resetZoom}
                    aria-label={
                      lang === "bn"
                        ? "১০০% জুম রিসেট করুন"
                        : "Reset zoom to 100%"
                    }
                    title={lang === "bn" ? "১০০% রিসেট" : "Reset to 100%"}
                    className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/35 active:scale-95 text-white transition-all cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4 sm:h-4.5 sm:w-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                  </button>

                  {/* Plus Button */}
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoomScale >= MAX_ZOOM - 0.01}
                    aria-label={lang === "bn" ? "জুম বাড়ান" : "Zoom in"}
                    title={lang === "bn" ? "জুম বাড়ান" : "Zoom in"}
                    className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/35 active:scale-95 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/20 cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4 sm:h-4.5 sm:w-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
