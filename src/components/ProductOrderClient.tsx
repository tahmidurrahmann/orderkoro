"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ClientConfig } from "@/lib/config-schema";
import { darkenHex } from "@/lib/contrast";
import {
  calculateOrderTotals,
  hasDhakaSuburbZone,
  type DhakaAreaChoice,
} from "@/lib/delivery";
import { filterDistricts, findDistrictById } from "@/lib/districts";
import {
  calculateSavings,
  formatNumber,
  formatPrice,
  localizeDigits,
  type SupportedLocale,
} from "@/lib/format";
import { getClientCopy, resolveLocalizedText } from "@/lib/i18n";
import { getSavedLocale, saveLocalePreference } from "@/lib/locale-preference";
import { saveOrderSummaryToSession } from "@/lib/order-session";
import { normalizeBdPhone, validateBdPhone } from "@/lib/phone";

interface ProductOrderClientProps {
  config: ClientConfig;
}

interface FormErrors {
  size?: string;
  name?: string;
  phone?: string;
  district?: string;
  address?: string;
}

export default function ProductOrderClient({ config }: ProductOrderClientProps) {
  const router = useRouter();
  const uid = useId();

  // 1. Language state (Bangla first, switchable if config.language.allowSwitch)
  const [lang, setLang] = useState<SupportedLocale>(config.language.default);

  // Restore user's selected language on reload
  useEffect(() => {
    if (config.language.allowSwitch) {
      const saved = getSavedLocale(config.language.default);
      if (saved && (saved === "bn" || saved === "en")) {
        setLang(saved);
      }
    }
  }, [config.language.allowSwitch, config.language.default]);

  function handleLanguageChange(newLang: SupportedLocale) {
    setLang(newLang);
    saveLocalePreference(newLang);
  }

  const copy = useMemo(
    () => getClientCopy(lang, config.copy),
    [lang, config.copy]
  );

  // 2. Product variant & gallery state
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(0);
  const firstAvailableSize = useMemo(
    () => config.sizes.find((s) => s.available)?.name ?? "",
    [config.sizes]
  );
  const [selectedSize, setSelectedSize] = useState<string>(firstAvailableSize);
  const [quantity, setQuantity] = useState<number>(1);

  const activeColor = config.colors[selectedColorIdx] ?? config.colors[0];
  const galleryImages = useMemo(() => {
    if (activeColor && activeColor.images.length > 0) {
      return activeColor.images;
    }
    return config.product.images;
  }, [activeColor, config.product.images]);

  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchDistRef = useRef<number>(0);
  const initialPinchScaleRef = useRef<number>(1.0);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 2.0;
  const ZOOM_STEP = 0.25;

  const resetZoom = useCallback(() => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
    pinchDistRef.current = 0;
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomScale((prev) => {
      const next = Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2)));
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomScale((prev) => {
      const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2)));
      if (next <= 1.02) {
        setPanOffset({ x: 0, y: 0 });
        return MIN_ZOOM;
      }
      return next;
    });
  }, []);

  const handleToggleTargetZoom = useCallback(() => {
    setZoomScale((prev) => {
      if (prev > 1.05) {
        setPanOffset({ x: 0, y: 0 });
        return MIN_ZOOM;
      }
      setPanOffset({ x: 0, y: 0 });
      return MAX_ZOOM;
    });
  }, []);

  const setZoomClamped = useCallback((newScale: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    if (clamped <= 1.05) {
      setPanOffset({ x: 0, y: 0 });
      setZoomScale(1.0);
    } else {
      setZoomScale(Number(clamped.toFixed(2)));
    }
  }, []);

  // 3. Order Form state
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [dhakaArea, setDhakaArea] = useState<DhakaAreaChoice>("city");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");

  // District combobox state: track which form ("m" mobile or "d" desktop) has dropdown open
  const [openDropdownFormId, setOpenDropdownFormId] = useState<"m" | "d" | null>(null);
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>("");

  // Validation & submission state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [showErrorSummary, setShowErrorSummary] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Share state (initialized with consistent fallback to prevent SSR hydration mismatch)
  const [shareUrl, setShareUrl] = useState<string>(`https://orderpage.example/${config.slug}`);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [canNativeShare, setCanNativeShare] = useState<boolean>(false);

  // Field refs for smooth scroll and focus management
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const [isFormInView, setIsFormInView] = useState<boolean>(false);

  // Field refs for smooth scroll and focus management
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const districtTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addressInputRef = useRef<HTMLTextAreaElement | null>(null);
  const sizeGroupRef = useRef<HTMLDivElement | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  // Observe order form visibility to hide sticky bottom bar on mobile
  useEffect(() => {
    const el = formSectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIsFormInView(entry.isIntersecting);
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lightbox & dropdown keyboard shortcuts (Esc to close, + / - to zoom, arrow keys to navigate)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
        resetZoom();
        setIsSizeChartOpen(false);
        setOpenDropdownFormId(null);
      } else if (isLightboxOpen) {
        if ([" ", "Space", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
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
  }, [isLightboxOpen, galleryImages.length, handleZoomIn, handleZoomOut, resetZoom]);

  // Prevent background page from scrolling when Lightbox is open and handle mouse wheel zooming with non-passive listener
  useEffect(() => {
    if (!isLightboxOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalOverscrollBehavior = document.body.style.overscrollBehavior;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift from scrollbar disappearing on desktop
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    function handleWheelOnLightbox(e: WheelEvent) {
      // 100% cancel browser scrolling of the underlying page
      e.preventDefault();
      e.stopPropagation();

      if (e.deltaY < 0) {
        // Wheel up -> zoom in smoothly
        setZoomScale((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
      } else if (e.deltaY > 0) {
        // Wheel down -> zoom out smoothly
        setZoomScale((prev) => {
          const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2)));
          if (next <= 1.02) {
            setPanOffset({ x: 0, y: 0 });
            return MIN_ZOOM;
          }
          return next;
        });
      }
    }

    function handleWindowMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("wheel", handleWheelOnLightbox, { passive: false });
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.overscrollBehavior = originalOverscrollBehavior;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener("wheel", handleWheelOnLightbox);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isLightboxOpen, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP]);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      // Two fingers: pinch-to-zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialPinchScaleRef.current = zoomScale;
    } else if (e.touches.length === 1 && zoomScale > 1.05) {
      // Single finger drag to pan
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
      // Pinch gesture
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = currentDist / pinchDistRef.current;
      const computed = initialPinchScaleRef.current * factor;
      setZoomClamped(computed);
    } else if (e.touches.length === 1 && isDragging && zoomScale > 1.05) {
      // Drag/pan with 1 finger
      const t = e.touches[0];
      setPanOffset({
        x: t.clientX - dragStartRef.current.x,
        y: t.clientY - dragStartRef.current.y,
      });
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

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isDragging && zoomScale > 1.05) {
      setPanOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleSelectColor(index: number) {
    setSelectedColorIdx(index);
    setActiveSlide(0);
    resetZoom();
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }

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

  const savings = useMemo(
    () => calculateSavings(config.product.price, config.product.oldPrice),
    [config.product.price, config.product.oldPrice]
  );

  const suburbZoneId = useMemo(() => hasDhakaSuburbZone(config), [config]);
  const showDhakaSuburbSelector =
    selectedDistrict === "Dhaka" && Boolean(suburbZoneId);

  const orderTotals = useMemo(
    () =>
      calculateOrderTotals(
        config,
        quantity,
        selectedDistrict,
        showDhakaSuburbSelector ? dhakaArea : "city"
      ),
    [config, quantity, selectedDistrict, showDhakaSuburbSelector, dhakaArea]
  );

  const filteredDistricts = useMemo(
    () => filterDistricts(districtSearchQuery),
    [districtSearchQuery]
  );

  const selectedDistrictObj = useMemo(
    () => (selectedDistrict ? findDistrictById(selectedDistrict) : undefined),
    [selectedDistrict]
  );

  function validateSingleField(
    field: keyof FormErrors,
    values?: {
      size?: string;
      name?: string;
      phone?: string;
      district?: string;
      address?: string;
    }
  ): string | undefined {
    const vSize = values?.size ?? selectedSize;
    const vName = (values?.name ?? customerName).trim();
    const vPhone = values?.phone ?? customerPhone;
    const vDistrict = values?.district ?? selectedDistrict;
    const vAddress = (values?.address ?? customerAddress).trim();

    switch (field) {
      case "size": {
        const sizeObj = config.sizes.find((s) => s.name === vSize);
        if (!sizeObj || !sizeObj.available) {
          return copy.fieldSizeError;
        }
        return undefined;
      }
      case "name": {
        if (vName.length < 2 || vName.length > 80) {
          return copy.fieldNameError;
        }
        return undefined;
      }
      case "phone": {
        const check = validateBdPhone(vPhone);
        if (!check.valid) {
          return copy.fieldPhoneError;
        }
        return undefined;
      }
      case "district": {
        if (!vDistrict) {
          return copy.fieldDistrictError;
        }
        return undefined;
      }
      case "address": {
        if (vAddress.length < 10 || vAddress.length > 300) {
          return copy.fieldAddressError;
        }
        return undefined;
      }
    }
  }

  function handleBlur(field: keyof FormErrors) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let overridePhone: string | undefined;
    if (field === "phone" && customerPhone.trim()) {
      const norm = normalizeBdPhone(customerPhone);
      setCustomerPhone(norm);
      overridePhone = norm;
    }
    const err = validateSingleField(field, { phone: overridePhone });
    setErrors((prev) => ({ ...prev, [field]: err }));
  }

  function handleStickyOrderClick() {
    if (config.soldOut) return;
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(() => {
      if (!customerName.trim()) {
        nameInputRef.current?.focus({ preventScroll: true });
      } else if (!validateBdPhone(customerPhone).valid) {
        phoneInputRef.current?.focus({ preventScroll: true });
      } else if (!selectedDistrict) {
        districtTriggerRef.current?.focus({ preventScroll: true });
      } else if (customerAddress.trim().length < 10) {
        addressInputRef.current?.focus({ preventScroll: true });
      } else {
        nameInputRef.current?.focus({ preventScroll: true });
      }
    }, 320);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (config.soldOut || isSubmitting) return;

    const normalizedPhone = normalizeBdPhone(customerPhone);
    if (normalizedPhone !== customerPhone) {
      setCustomerPhone(normalizedPhone);
    }

    const nextErrors: FormErrors = {
      size: validateSingleField("size"),
      name: validateSingleField("name"),
      phone: validateSingleField("phone", { phone: normalizedPhone }),
      district: validateSingleField("district"),
      address: validateSingleField("address"),
    };

    const activeErrorKeys = (Object.keys(nextErrors) as (keyof FormErrors)[]).filter(
      (k) => Boolean(nextErrors[k])
    );

    setTouched({
      size: true,
      name: true,
      phone: true,
      district: true,
      address: true,
    });
    setErrors(nextErrors);

    if (activeErrorKeys.length > 0) {
      setShowErrorSummary(true);
      const firstInvalid = activeErrorKeys[0];
      if (firstInvalid === "size") {
        sizeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (firstInvalid === "name") {
        nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        nameInputRef.current?.focus();
      } else if (firstInvalid === "phone") {
        phoneInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        phoneInputRef.current?.focus();
      } else if (firstInvalid === "district") {
        districtTriggerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        districtTriggerRef.current?.focus();
      } else if (firstInvalid === "address") {
        addressInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        addressInputRef.current?.focus();
      }
      return;
    }

    setShowErrorSummary(false);
    setIsSubmitting(true);
    setServerError(null);

    try {
      const searchParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      );
      const utm_source = searchParams.get("utm_source") || undefined;
      const utm_medium = searchParams.get("utm_medium") || undefined;
      const utm_campaign = searchParams.get("utm_campaign") || undefined;
      const utm_content = searchParams.get("utm_content") || undefined;
      const fbclid = searchParams.get("fbclid") || undefined;

      const eventId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `evt_${Date.now()}`;

      const deliveryQuote =
        orderTotals.delivery ??
        calculateOrderTotals(
          config,
          quantity,
          selectedDistrict,
          showDhakaSuburbSelector ? dhakaArea : "city"
        ).delivery;

      const activeColorName = resolveLocalizedText(activeColor.name, lang);

      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: config.slug,
          name: customerName.trim(),
          phone: normalizedPhone,
          district: selectedDistrict,
          zoneId: deliveryQuote?.zoneId || config.delivery.defaultZoneId,
          dhakaArea: showDhakaSuburbSelector ? dhakaArea : "city",
          address: customerAddress.trim(),
          size: selectedSize,
          color: activeColorName,
          quantity: orderTotals.quantity,
          note: customerNote.trim() || undefined,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          fbclid,
          eventId,
          website: honeypot,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setIsSubmitting(false);
        setServerError(
          data.error || "অর্ডার প্রক্রিয়াকরণে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
        );
        if (data.field) {
          setErrors((prev) => ({ ...prev, [data.field]: data.error }));
          setShowErrorSummary(true);
        }
        return;
      }

      saveOrderSummaryToSession({
        orderNumber: data.orderNumber || data.summary.orderNumber,
        slug: config.slug,
        productTitle: config.product.title,
        colorName: activeColor.name,
        sizeName: selectedSize,
        quantity: orderTotals.quantity,
        unitPrice: orderTotals.unitPrice,
        subtotal: data.summary.subtotal,
        deliveryCharge: data.summary.deliveryCharge,
        deliveryZoneLabel: deliveryQuote ? deliveryQuote.label : config.delivery.zones[0].label,
        daysMin: deliveryQuote ? deliveryQuote.daysMin : 2,
        daysMax: deliveryQuote ? deliveryQuote.daysMax : 4,
        total: data.summary.total,
        confirmationMode: config.confirmationMode,
        language: lang,
        eventId: data.summary.eventId || eventId,
        createdAtIso: new Date().toISOString(),
      });

      router.push(`/${config.slug}/thanks`);
    } catch (err) {
      console.error("[Order Form] Network error:", err);
      setIsSubmitting(false);
      setServerError(
        "ইন্টারনেট সংযোগে ত্রুটি দেখা দিয়েছে। আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।"
      );
    }
  }

  const productTitleText = resolveLocalizedText(config.product.title, lang);
  const brandNameText = resolveLocalizedText(config.brand.name, lang);
  const activeColorName = resolveLocalizedText(activeColor.name, lang);

  async function handleCopyLink() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const temp = document.createElement("textarea");
        temp.value = shareUrl;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${productTitleText} | ${brandNameText}`,
          text: `${productTitleText} (${formatPrice(config.product.price, lang)})`,
          url: shareUrl,
        });
      } catch {
        // Dismissed share sheet
      }
    }
  }

  const activeLogoUrl =
    typeof config.brand.logoUrl === "string"
      ? config.brand.logoUrl
      : config.brand.logoUrl[lang] ||
        config.brand.logoUrl.bn ||
        config.brand.logoUrl.en;

  const primaryColor = config.brand.primaryColor;
  const primaryHover = darkenHex(primaryColor, 0.84);
  const accentColor = config.brand.accentColor || "#B45309";

  // Reusable sub-sections
  const renderHeader = () => (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-3 min-[360px]:px-4 sm:px-6 lg:px-8 py-2.5 backdrop-blur-md">
      <div className="mx-auto flex min-h-12 max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {activeLogoUrl ? (
            <Image
              src={activeLogoUrl}
              alt={brandNameText}
              width={156}
              height={34}
              priority
              className="h-7 w-auto max-w-[125px] min-[360px]:h-8 min-[360px]:max-w-[165px] object-contain"
            />
          ) : (
            <span className="truncate text-lg font-bold tracking-tight text-[var(--text-primary)]">
              {brandNameText}
            </span>
          )}
        </div>

        {/* Desktop trust badges in header */}
        <div className="hidden lg:flex items-center gap-5 text-xs font-medium text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            {copy.codBadgeText}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
            <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{copy.trustReturnBadge}</span>
          </span>
          {config.contact.phone && (
            <a href={`tel:${config.contact.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-primary)] cursor-pointer hover:underline">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {config.contact.phone}
            </a>
          )}
        </div>

        {config.language.allowSwitch && (
          <div
            role="group"
            aria-label="Language switch / ভাষা পরিবর্তন"
            className="inline-flex items-center rounded-lg bg-neutral-100 p-1 border border-neutral-200/80 shadow-2xs"
          >
            <button
              type="button"
              onClick={() => handleLanguageChange("bn")}
              aria-pressed={lang === "bn"}
              className={`min-h-8 min-w-9 sm:min-w-10 rounded-md sm:rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                lang === "bn"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {copy.langToggleBn}
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              aria-pressed={lang === "en"}
              className={`min-h-8 min-w-9 sm:min-w-10 rounded-md sm:rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                lang === "en"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {copy.langToggleEn}
            </button>
          </div>
        )}
      </div>
    </header>
  );

  const renderGallery = (isDesktopView = false) => (
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
            key={`${activeColor.hex}-${imgSrc}-${idx}`}
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
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                </svg>
                <span>
                  {formatNumber(idx + 1, lang)}/{formatNumber(galleryImages.length, lang)}
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>

      {config.soldOut && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-[#B91C1C] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
          {copy.soldOutBadge}
        </div>
      )}

      {/* Clickable Thumbnail Strip (Mobile & Desktop) */}
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
  );

  const renderPricing = () => (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--status-success-text)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success-text)]" />
          {copy.codBadgeText}
        </span>
        {config.soldOut && (
          <span className="inline-flex items-center rounded-full bg-[var(--status-error-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--status-error-text)]">
            {copy.soldOutBadge}
          </span>
        )}
      </div>

      <h1 className="text-xl min-[360px]:text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
        {productTitleText}
      </h1>

      <div className="flex flex-wrap items-baseline gap-2.5 pt-1">
        <span className="text-2xl min-[360px]:text-3xl font-black text-[var(--brand-primary)]">
          {formatPrice(config.product.price, lang)}
        </span>
        {savings && typeof config.product.oldPrice === "number" && (
          <>
            <span className="text-base min-[360px]:text-lg text-[var(--text-muted)] line-through">
              {formatPrice(config.product.oldPrice, lang)}
            </span>
            <span className="inline-flex items-center rounded-lg bg-[var(--status-success-bg)] px-2.5 py-1 text-xs font-bold text-[var(--status-success-text)]">
              {copy.saveAmountLabel
                .replace("{amount}", formatPrice(savings.amount, lang))
                .replace("{percent}", formatNumber(savings.percent, lang))}
            </span>
          </>
        )}
      </div>
    </div>
  );

  const renderSelectors = () => (
    <div className="space-y-5">
      {/* Color Swatches */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {copy.colorLabel}:{" "}
            <span className="font-normal text-[var(--text-secondary)]">
              {activeColorName}
            </span>
          </span>
        </div>
        {config.colors.length > 1 && (
          <div role="radiogroup" aria-label={copy.colorLabel} className="mt-2.5 flex flex-wrap gap-2">
            {config.colors.map((colorItem, idx) => {
              const isSelected = idx === selectedColorIdx;
              const cName = resolveLocalizedText(colorItem.name, lang);
              return (
                <button
                  key={colorItem.hex + idx}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={config.soldOut}
                  onClick={() => handleSelectColor(idx)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs min-[360px]:text-sm font-medium transition ${
                    isSelected
                      ? "border-[var(--brand-primary)] bg-[var(--bg-subtle)] font-bold text-[var(--text-primary)] ring-2 ring-[var(--brand-primary)] ring-offset-1"
                      : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]"
                  } ${config.soldOut ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full border border-black/20"
                    style={{ backgroundColor: colorItem.hex }}
                  />
                  <span>{cName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Size Pills + Size Chart Link */}
      <div ref={sizeGroupRef}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {copy.sizeLabel}:{" "}
            {selectedSize && (
              <span className="font-normal text-[var(--text-secondary)]">
                {localizeDigits(selectedSize, lang)}
              </span>
            )}
          </span>

          {config.product.sizeChartImage && (
            <button
              type="button"
              onClick={() => setIsSizeChartOpen(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs min-[360px]:text-sm font-semibold text-[var(--brand-primary)] underline underline-offset-4 hover:opacity-85 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]"
            >
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                <path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
              </svg>
              <span>{copy.sizeChartTrigger}</span>
            </button>
          )}
        </div>

        <div role="radiogroup" aria-label={copy.sizeLabel} className="mt-2.5 flex flex-wrap gap-1.5 min-[360px]:gap-2">
          {config.sizes.map((sizeObj) => {
            const isSelected = sizeObj.available && selectedSize === sizeObj.name;
            const localizedSizeName = localizeDigits(sizeObj.name, lang);

            if (!sizeObj.available) {
              return (
                <button
                  key={sizeObj.name}
                  type="button"
                  role="radio"
                  aria-checked={false}
                  aria-disabled="true"
                  disabled
                  aria-label={`${localizedSizeName} ${copy.sizeUnavailableSuffix}`}
                  className="diagonal-strike inline-flex min-h-11 min-w-[50px] min-[360px]:min-w-[56px] cursor-not-allowed items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 min-[360px]:px-3.5 py-1.5 text-xs min-[360px]:text-sm font-medium text-[var(--text-muted)] opacity-60"
                >
                  <span>{localizedSizeName}</span>
                </button>
              );
            }

            return (
              <button
                key={sizeObj.name}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={config.soldOut}
                onClick={() => {
                  setSelectedSize(sizeObj.name);
                  setErrors((prev) => ({ ...prev, size: undefined }));
                }}
                className={`inline-flex min-h-11 min-w-[50px] min-[360px]:min-w-[56px] items-center justify-center gap-1.5 rounded-xl border px-2.5 min-[360px]:px-3.5 py-1.5 text-xs min-[360px]:text-sm font-semibold transition ${
                  isSelected
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-xs ring-2 ring-[var(--brand-primary)] ring-offset-1"
                    : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--text-primary)]"
                } ${config.soldOut ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                {isSelected && (
                  <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
                <span>{localizedSizeName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity Stepper */}
      <div>
        <span className="block text-sm font-semibold text-[var(--text-primary)]">
          {copy.quantityLabel}:
        </span>
        <div className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)]">
          <button
            type="button"
            disabled={quantity <= 1 || config.soldOut}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label={copy.quantityDecreaseAria}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-l-xl text-lg font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            −
          </button>
          <span className="min-w-10 text-center font-bold text-base text-[var(--text-primary)]">
            {formatNumber(quantity, lang)}
          </span>
          <button
            type="button"
            disabled={quantity >= (config.maxQuantity ?? 5) || config.soldOut}
            onClick={() => setQuantity((q) => Math.min(config.maxQuantity ?? 5, q + 1))}
            aria-label={copy.quantityIncreaseAria}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-r-xl text-lg font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

  const renderDeliveryBlock = () => (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 min-[360px]:p-4 text-sm space-y-1.5">
      <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
        <svg aria-hidden="true" className="h-5 w-5 text-[var(--brand-primary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5h-7V8zM5.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        </svg>
        <span>
          {orderTotals.delivery
            ? copy.deliveryEstimateTemplate
                .replace("{charge}", formatPrice(orderTotals.delivery.effectiveCharge, lang))
                .replace("{daysMin}", formatNumber(orderTotals.delivery.daysMin, lang))
                .replace("{daysMax}", formatNumber(orderTotals.delivery.daysMax, lang))
            : copy.deliveryPromptSelectDistrict}
        </span>
      </div>

      {typeof config.delivery.freeDeliveryAbove === "number" && (
        <p className="text-xs text-[var(--text-secondary)] pl-7">
          {orderTotals.delivery?.isFreeDelivery
            ? "🎉 আপনি ফ্রি ডেলিভারি পেয়েছেন!"
            : `৳${formatNumber(config.delivery.freeDeliveryAbove, lang)} বা তার বেশি অর্ডারে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!`}
        </p>
      )}
    </div>
  );

  const renderDescription = () => (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 space-y-3">
      <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
        পণ্যের বিবরণ
      </h2>
      <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
        {resolveLocalizedText(config.product.shortDescription, lang)}
      </p>

      {config.product.details && config.product.details.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3 text-sm text-[var(--text-secondary)]">
          {config.product.details.map((detail, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-[var(--brand-primary)] font-bold">✓</span>
              <span>{resolveLocalizedText(detail, lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderTrustAndContact = () => (
    <div className="space-y-4">
      {/* 3 Trust Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pillar 1: Cash on Delivery */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-center space-y-2 hover:border-[var(--brand-primary)]/40 transition">
          <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <circle cx="12" cy="15" r="2" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-snug">
              {copy.trustPillar1Title}
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
              {copy.trustPillar1Body}
            </p>
          </div>
        </div>

        {/* Pillar 2: 7-Day Easy Return */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-center space-y-2 hover:border-[var(--brand-primary)]/40 transition">
          <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-snug">
              {copy.trustPillar2Title}
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
              {copy.trustPillar2Body}
            </p>
          </div>
        </div>

        {/* Pillar 3: 100% Quality Guaranteed */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-center space-y-2 hover:border-[var(--brand-primary)]/40 transition">
          <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-snug">
              {copy.trustPillar3Title}
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
              {copy.trustPillar3Body}
            </p>
          </div>
        </div>
      </div>

      {/* Return policy note */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 sm:p-4 text-xs sm:text-sm text-[var(--text-secondary)]">
        <p className="font-bold text-[var(--text-primary)] mb-1">
          {copy.trustPolicyHeading}
        </p>
        <p>{resolveLocalizedText(config.returnPolicyText, lang)}</p>
      </div>

      {/* Helpline Buttons */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {copy.trustContactHeading}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {config.contact.phone && (
            <a
              href={`tel:${config.contact.phone}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{copy.trustCallButton}: {config.contact.phone}</span>
            </a>
          )}
          {config.contact.messengerPageUsername && (
            <a
              href={`https://m.me/${config.contact.messengerPageUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.49 5.43 3.82 7.04v3.52c0 .41.44.66.79.46l3.19-1.78c.71.2 1.45.31 2.2.31 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1.09 12.14-2.61-2.79-5.1 2.79 5.61-5.96 2.67 2.79 5.04-2.79-5.61 5.96z" />
              </svg>
              <span>{copy.trustMessengerButton}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );

  const renderShareRow = () => (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--text-primary)] cursor-pointer transition"
      >
        <span>{copiedLink ? `✓ ${copy.shareCopiedFeedback}` : `🔗 ${copy.shareCopyLink}`}</span>
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--text-primary)] cursor-pointer transition"
        >
          <span>📤 {copy.shareNative}</span>
        </button>
      )}

      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${productTitleText}: ${shareUrl}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        suppressHydrationWarning
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition"
      >
        <span>💬 WhatsApp</span>
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        suppressHydrationWarning
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 cursor-pointer transition"
      >
        <span>Facebook</span>
      </a>
    </div>
  );

  // The Order Form Section (with unique prefix for accessibility)
  const renderOrderForm = (idPrefix: "m" | "d") => (
    <div className="space-y-4">
      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-semibold text-red-800"
        >
          ⚠️ {serverError}
        </div>
      )}

      {showErrorSummary && Object.values(errors).some((msg) => Boolean(msg)) && (
        <div
          ref={errorSummaryRef}
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-800"
        >
          <p className="font-bold">{copy.errorSummaryHeading}</p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs font-medium">
            {Object.entries(errors).map(([key, msg]) => (msg ? <li key={key}>{msg}</li> : null))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Anti-bot honeypot */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor={`${uid}-${idPrefix}-website`}>Website</label>
          <input
            id={`${uid}-${idPrefix}-website`}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* Customer Name */}
        <div>
          <label htmlFor={`${uid}-${idPrefix}-name`} className="block text-sm font-semibold text-[var(--text-primary)]">
            {copy.fieldNameLabel} <span className="text-red-600">*</span>
          </label>
          <input
            ref={idPrefix === "m" ? nameInputRef : undefined}
            id={`${uid}-${idPrefix}-name`}
            name="name"
            type="text"
            required
            disabled={config.soldOut || isSubmitting}
            autoComplete="name"
            placeholder={copy.fieldNamePlaceholder}
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            onBlur={() => handleBlur("name")}
            className={`mt-1.5 block w-full rounded-xl border p-3 text-base text-[var(--text-primary)] bg-[var(--bg-surface)] transition focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
              touched.name && errors.name ? "border-red-500 bg-red-50/30" : "border-[var(--border-strong)]"
            }`}
          />
          {touched.name && errors.name && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Customer Phone */}
        <div>
          <label htmlFor={`${uid}-${idPrefix}-phone`} className="block text-sm font-semibold text-[var(--text-primary)]">
            {copy.fieldPhoneLabel} <span className="text-red-600">*</span>
          </label>
          <input
            ref={idPrefix === "m" ? phoneInputRef : undefined}
            id={`${uid}-${idPrefix}-phone`}
            name="phone"
            type="tel"
            inputMode="numeric"
            required
            disabled={config.soldOut || isSubmitting}
            autoComplete="tel"
            placeholder={copy.fieldPhonePlaceholder}
            value={customerPhone}
            onChange={(e) => {
              setCustomerPhone(e.target.value);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            onBlur={() => handleBlur("phone")}
            className={`mt-1.5 block w-full rounded-xl border p-3 text-base text-[var(--text-primary)] bg-[var(--bg-surface)] transition focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
              touched.phone && errors.phone ? "border-red-500 bg-red-50/30" : "border-[var(--border-strong)]"
            }`}
          />
          {touched.phone && errors.phone && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.phone}</p>
          )}
        </div>

        {/* District Selector */}
        {(() => {
          const isDropdownOpen = openDropdownFormId === idPrefix;
          return (
            <div className="relative">
              <label
                htmlFor={`${uid}-${idPrefix}-district-btn`}
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                {copy.fieldDistrictLabel} <span className="text-red-600">*</span>
              </label>

              <button
                ref={idPrefix === "m" ? districtTriggerRef : undefined}
                id={`${uid}-${idPrefix}-district-btn`}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                disabled={config.soldOut || isSubmitting}
                onClick={() => {
                  if (isDropdownOpen) {
                    setOpenDropdownFormId(null);
                  } else {
                    setOpenDropdownFormId(idPrefix);
                    setDistrictSearchQuery("");
                    window.setTimeout(() => {
                      const el = document.getElementById(`${uid}-${idPrefix}-district-search`);
                      if (el instanceof HTMLInputElement) el.focus();
                    }, 50);
                  }
                }}
                className={`mt-1.5 flex min-h-[52px] w-full items-center justify-between gap-2.5 rounded-xl border p-2.5 sm:p-3 text-left text-base bg-[var(--bg-surface)] cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
                  touched.district && errors.district
                    ? "border-red-500 bg-red-50/30"
                    : isDropdownOpen
                    ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20"
                    : "border-[var(--border-strong)] hover:border-[var(--border-strong)]"
                } disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shrink-0">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </span>
                  <div className="flex flex-col min-w-0">
                    {selectedDistrictObj ? (
                      <>
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                          {lang === "bn" ? selectedDistrictObj.bn : selectedDistrictObj.en}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] truncate leading-tight mt-0.5">
                          {lang === "bn" ? `${selectedDistrictObj.division} বিভাগ` : `${selectedDistrictObj.division} Division`}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-[var(--text-muted)] truncate">
                        {copy.fieldDistrictPlaceholder}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedDistrict && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={lang === "bn" ? "জেলা নির্বাচন মুছুন" : "Clear selected district"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDistrict("");
                        setOpenDropdownFormId(null);
                        setDistrictSearchQuery("");
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition cursor-pointer text-xs"
                    >
                      ✕
                    </span>
                  )}
                  <svg
                    className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180 text-[var(--brand-primary)]" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              {/* Backdrop to close dropdown on outside click without listener collisions */}
              {isDropdownOpen && (
                <div
                  className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[0.5px]"
                  onClick={() => {
                    setOpenDropdownFormId(null);
                    setDistrictSearchQuery("");
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Popover Dropdown Card */}
              {isDropdownOpen && (
                <div
                  role="listbox"
                  aria-label={copy.fieldDistrictLabel}
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-72 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="p-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                    <div className="relative flex items-center">
                      <svg
                        className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--text-muted)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                      <input
                        id={`${uid}-${idPrefix}-district-search`}
                        type="text"
                        autoComplete="off"
                        placeholder={copy.fieldDistrictSearchPlaceholder}
                        value={districtSearchQuery}
                        onChange={(e) => setDistrictSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] py-2 pl-9 pr-8 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                      />
                      {districtSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDistrictSearchQuery("")}
                          className="absolute right-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
                          title={lang === "bn" ? "সার্চ মুছুন" : "Clear search"}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <ul className="overflow-y-auto p-1.5 text-sm divide-y divide-[var(--border-subtle)] max-h-56">
                    {filteredDistricts.length === 0 ? (
                      <li className="p-4 text-center text-xs text-[var(--text-muted)]">
                        {copy.fieldDistrictNoMatch}
                      </li>
                    ) : (
                      filteredDistricts.map((d) => {
                        const isSelected = selectedDistrict === d.id;
                        const primaryName = lang === "bn" ? d.bn : d.en;
                        const divisionName = lang === "bn" ? `${d.division} বিভাগ` : `${d.division} Division`;
                        return (
                          <li key={d.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setSelectedDistrict(d.id);
                                setOpenDropdownFormId(null);
                                setDistrictSearchQuery("");
                                setErrors((prev) => ({ ...prev, district: undefined }));
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl cursor-pointer transition flex items-center justify-between ${
                                isSelected
                                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold"
                                  : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                              }`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold truncate">
                                  {primaryName}
                                </span>
                                <span className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                                  {divisionName}
                                </span>
                              </div>
                              {isSelected && (
                                <span className="inline-flex items-center gap-1 text-[var(--brand-primary)] font-bold text-xs shrink-0 pl-2">
                                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>{lang === "bn" ? "নির্বাচিত" : "Selected"}</span>
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}

              {touched.district && errors.district && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.district}</p>
              )}
            </div>
          );
        })()}

        {/* Dhaka City vs Suburb Split */}
        {showDhakaSuburbSelector && (
          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] p-3.5 space-y-2">
            <span className="block text-sm font-semibold text-[var(--text-primary)]">
              {copy.fieldDhakaAreaQuestion}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDhakaArea("city")}
                className={`min-h-11 rounded-lg border p-2 text-xs sm:text-sm font-semibold cursor-pointer transition ${
                  dhakaArea === "city"
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                    : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                }`}
              >
                {copy.fieldDhakaCityOption}
              </button>
              <button
                type="button"
                onClick={() => setDhakaArea("suburb")}
                className={`min-h-11 rounded-lg border p-2 text-xs sm:text-sm font-semibold cursor-pointer transition ${
                  dhakaArea === "suburb"
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                    : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                }`}
              >
                {copy.fieldDhakaSuburbOption}
              </button>
            </div>
          </div>
        )}

        {/* Full Delivery Address */}
        <div>
          <label htmlFor={`${uid}-${idPrefix}-address`} className="block text-sm font-semibold text-[var(--text-primary)]">
            {copy.fieldAddressLabel} <span className="text-red-600">*</span>
          </label>
          <textarea
            ref={idPrefix === "m" ? addressInputRef : undefined}
            id={`${uid}-${idPrefix}-address`}
            name="address"
            rows={3}
            required
            disabled={config.soldOut || isSubmitting}
            autoComplete="street-address"
            placeholder={copy.fieldAddressPlaceholder}
            value={customerAddress}
            onChange={(e) => {
              setCustomerAddress(e.target.value);
              if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
            }}
            onBlur={() => handleBlur("address")}
            className={`mt-1.5 block w-full rounded-xl border p-3 text-base text-[var(--text-primary)] bg-[var(--bg-surface)] transition focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
              touched.address && errors.address ? "border-red-500 bg-red-50/30" : "border-[var(--border-strong)]"
            }`}
          />
          {touched.address && errors.address && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.address}</p>
          )}
        </div>

        {/* Optional Note */}
        <div>
          <label htmlFor={`${uid}-${idPrefix}-note`} className="block text-sm font-semibold text-[var(--text-primary)]">
            {copy.fieldNoteLabel}
          </label>
          <input
            id={`${uid}-${idPrefix}-note`}
            name="note"
            type="text"
            disabled={config.soldOut || isSubmitting}
            placeholder={copy.fieldNotePlaceholder}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 text-base text-[var(--text-primary)] transition focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </div>

        {/* Live Order Summary Card */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            <span>{copy.summaryHeading}</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">ক্যাশ অন ডেলিভারি</span>
          </div>

          <div className="flex justify-between text-xs sm:text-sm text-[var(--text-secondary)]">
            <span>{productTitleText} × {formatNumber(orderTotals.quantity, lang)}</span>
            <span>{formatPrice(orderTotals.subtotal, lang)}</span>
          </div>

          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>
              রঙ: {activeColorName} | সাইজ:{" "}
              {selectedSize
                ? localizeDigits(selectedSize, lang)
                : lang === "bn"
                ? "(নির্বাচন করুন)"
                : "(Select)"}
            </span>
          </div>

          <div className="flex justify-between text-xs sm:text-sm text-[var(--text-secondary)]">
            <span>ডেলিভারি চার্জ</span>
            <span>
              {orderTotals.delivery
                ? orderTotals.delivery.isFreeDelivery
                ? "ফ্রি"
                : formatPrice(orderTotals.delivery.effectiveCharge, lang)
                : "জেলা নির্বাচন করুন"}
            </span>
          </div>

          <div className="flex justify-between text-base font-extrabold text-[var(--text-primary)] border-t border-[var(--border-subtle)] pt-2">
            <span>{copy.summaryTotalRow}</span>
            <span className="text-lg text-[var(--brand-primary)]">{formatPrice(orderTotals.total, lang)}</span>
          </div>
        </div>

        {/* Submit Order Button */}
        <button
          type="submit"
          disabled={config.soldOut || isSubmitting}
          className={`min-h-12 min-[360px]:min-h-14 w-full rounded-xl bg-[var(--brand-primary)] py-3 px-4 text-base min-[360px]:text-lg font-bold text-white shadow-md transition hover:bg-[var(--brand-primary-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
            config.soldOut || isSubmitting ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {copy.submitButtonLoading}
            </span>
          ) : config.soldOut ? (
            copy.soldOutNotice
          ) : (
            `${copy.submitButtonText} (${formatPrice(orderTotals.total, lang)})`
          )}
        </button>

        <p className="text-center text-xs text-[var(--text-muted)] pt-1">
          🔒 পণ্য হাতে পেয়ে চেক করে মূল্য পরিশোধ করবেন। কোনো অগ্রিম পেমেন্ট নেই।
        </p>
      </form>
    </div>
  );

  return (
    <div
      data-lang={lang}
      style={
        {
          "--brand-primary": primaryColor,
          "--brand-primary-hover": primaryHover,
          "--brand-accent": accentColor,
        } as React.CSSProperties
      }
      className="min-h-screen-safe flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]"
    >
      {renderHeader()}

      {/* =========================================================
          DESKTOP 2-COLUMN VIEW (Screens >= lg: 1024px)
         ========================================================= */}
      <div className="hidden lg:block mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8 xl:gap-12 items-start">
          {/* Left Column: Gallery, Description, Trust, Support, Share */}
          <div className="col-span-7 space-y-6">
            {renderGallery(true)}
            {renderDescription()}
            {renderTrustAndContact()}
            {renderShareRow()}
          </div>

          {/* Right Column: Sticky Checkout Panel with Title, Selectors, Form */}
          <div className="col-span-5 space-y-6 sticky top-20">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm space-y-6">
              {renderPricing()}
              {renderSelectors()}
              {renderDeliveryBlock()}
              <div ref={formSectionRef}>
                {renderOrderForm("d")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          MOBILE 1-COLUMN VIEW (Screens < lg: 320px to 1023px)
         ========================================================= */}
      <main className="lg:hidden mx-auto w-full max-w-xl bg-[var(--bg-surface)] shadow-[var(--shadow-card)] min-h-screen-safe">
        {/* 2. Gallery */}
        {renderGallery(false)}

        {/* 3. Title & Price */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 pt-4 pb-3">
          {renderPricing()}
        </div>

        {/* 4. Selectors & 6. Size Chart Link */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-4">
          {renderSelectors()}
        </div>

        {/* 5. Short Description */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-4">
          {renderDescription()}
        </div>

        {/* 7. Delivery Block */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-4">
          {renderDeliveryBlock()}
        </div>

        {/* 8. Inline Order Form */}
        <section
          ref={formSectionRef}
          id="order-form"
          className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-5"
        >
          <div className="border-b border-[var(--border-subtle)] pb-3 mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              অর্ডার তথ্য দিন (ক্যাশ অন ডেলিভারি)
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              নিচের ফর্মটি পূরণ করে অর্ডারটি নিশ্চিত করুন
            </p>
          </div>
          {renderOrderForm("m")}
        </section>

        {/* 9. Trust Block */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-5">
          {renderTrustAndContact()}
        </div>

        {/* 10. Share Row */}
        <div className="px-3 min-[360px]:px-4 py-4">
          {renderShareRow()}
        </div>

        {/* 11. Footer */}
        <footer
          className={`border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 pt-4 text-center text-xs text-[var(--text-muted)] ${
            !config.soldOut && !isFormInView ? "pb-20" : "pb-4"
          }`}
        >
          <p>© {new Date().getFullYear()} {brandNameText}. {copy.footerRightsReserved}</p>
          {config.showPoweredBy && (
            <p className="mt-1 text-[11px] opacity-75">{copy.poweredByText}</p>
          )}
        </footer>
      </main>

      {/* Desktop Footer */}
      <footer className="hidden lg:block border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] mt-8 py-5 text-center text-xs text-[var(--text-muted)]">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
          <p>© {new Date().getFullYear()} {brandNameText}. {copy.footerRightsReserved}</p>
          {config.showPoweredBy && (
            <p className="text-[11px] opacity-75">{copy.poweredByText}</p>
          )}
        </div>
      </footer>

      {/* =========================================================
          STICKY BOTTOM BAR (Mobile only, hidden on lg desktop)
         ========================================================= */}
      {!config.soldOut && !isFormInView && (
        <aside
          aria-label="Quick order bar"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 min-[360px]:px-4 py-2 min-[360px]:py-2.5 shadow-lg pb-safe-bar"
        >
          <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="block text-xs text-[var(--text-muted)] truncate">
                {copy.summaryTotalRow}
              </span>
              <p className="text-base min-[360px]:text-lg font-bold text-[var(--brand-primary)] leading-tight">
                {formatPrice(config.product.price, lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleStickyOrderClick}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-primary)] px-3.5 min-[360px]:px-5 text-sm min-[360px]:text-base font-bold text-white shadow-xs transition hover:bg-[var(--brand-primary-hover)] active:scale-[0.98] whitespace-nowrap cursor-pointer"
            >
              <span>{copy.stickyBarOrderNow} ↓</span>
            </button>
          </div>
        </aside>
      )}

      {/* =========================================================
          SIZE CHART MODAL / BOTTOM SHEET
         ========================================================= */}
      {isSizeChartOpen && config.product.sizeChartImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.sizeChartTitle}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-t-3xl sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-2xl max-h-[88vh] sm:max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {copy.sizeChartTitle}
              </h2>
              <button
                type="button"
                onClick={() => setIsSizeChartOpen(false)}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--bg-subtle)]">
              <Image
                src={config.product.sizeChartImage}
                alt="Size chart"
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSizeChartOpen(false)}
                className="w-full min-h-11 rounded-xl bg-[var(--bg-subtle)] text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--border-subtle)] cursor-pointer"
              >
                {copy.sizeChartClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          FULLSCREEN LIGHTBOX MODAL WITH ZOOM & PAN (EXACT FABRILIFE STYLE)
         ========================================================= */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === "bn" ? "পূর্ণাঙ্গ ছবি ও জুম প্রিভিউ" : "Fullscreen image preview and zoom"}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm select-none overflow-hidden touch-none"
        >
          {/* Backdrop dismiss on tap outside */}
          <div
            className="absolute inset-0 -z-10 cursor-pointer"
            onClick={() => {
              setIsLightboxOpen(false);
              resetZoom();
            }}
            aria-hidden="true"
          />

          {/* Top-Right Round Close Button (Fabrilife Exact Style) */}
          <button
            type="button"
            onClick={() => {
              setIsLightboxOpen(false);
              resetZoom();
            }}
            aria-label={copy.galleryCloseZoom}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-neutral-900/95 hover:bg-black text-white shadow-2xl transition-all duration-150 cursor-pointer active:scale-90 border border-white/10 hover:border-white/30"
          >
            <svg
              className="h-5 w-5 sm:h-5.5 sm:w-5.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Center Card: Image Canvas + Directly Attached Thumbnails */}
          <div className="relative flex flex-col items-center justify-center w-full max-w-2xl px-2 sm:px-4 z-20">
            {/* The Image Viewport Frame */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleToggleTargetZoom}
              className="relative overflow-hidden w-[88vw] max-w-[280px] sm:max-w-md lg:max-w-xl aspect-[4/5] max-h-[50vh] sm:max-h-[58vh] lg:max-h-[66vh] bg-neutral-900 rounded-lg sm:rounded-xl shadow-2xl flex items-center justify-center touch-none cursor-default"
            >
              <div
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                  transformOrigin: "center center",
                  cursor: zoomScale > 1.05 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
                  transition: isDragging ? "none" : "transform 0.12s ease-out",
                }}
                className="relative h-full w-full flex items-center justify-center will-change-transform"
              >
                <Image
                  src={galleryImages[activeSlide]}
                  alt={`${productTitleText} (${activeColorName}) (${activeSlide + 1})`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 800px"
                  className="object-contain pointer-events-none select-none"
                  priority
                />
              </div>
            </div>

            {/* Thumbnails Directly Under Image Card */}
            {galleryImages.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2 overflow-x-auto max-w-full px-2 py-1 no-scrollbar z-30">
                {galleryImages.map((thumbSrc, thumbIdx) => {
                  const isCurrent = thumbIdx === activeSlide;
                  return (
                    <button
                      key={`lightbox-thumb-${thumbSrc}-${thumbIdx}`}
                      type="button"
                      onClick={() => {
                        setActiveSlide(thumbIdx);
                        resetZoom();
                      }}
                      aria-label={`${copy.galleryImageCount} ${thumbIdx + 1}`}
                      className={`relative h-11 w-11 sm:h-13 sm:w-13 shrink-0 overflow-hidden rounded-md sm:rounded-lg border-2 cursor-pointer transition ${
                        isCurrent
                          ? "border-white ring-2 ring-white/70 shadow-lg scale-105"
                          : "border-white/30 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={thumbSrc}
                        alt={`Thumbnail ${thumbIdx + 1}`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating Bottom Center Zoom Controls (Live Percentage Badge + 3 Circular Buttons) */}
          <div className="fixed bottom-3.5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 sm:gap-2.5">
            {/* Live Zoom Percentage Badge */}
            <div className="flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/15 text-white shadow-xl">
              <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider">
                {formatNumber(Math.round(zoomScale * 100), lang)}%
              </span>
              {zoomScale > 1.05 && (
                <span className="text-[10px] sm:text-[11px] text-white/70">
                  • {lang === "bn" ? "টেনে দেখুন" : "Drag to pan"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Minus Button [ - ] */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomScale <= MIN_ZOOM + 0.01}
                aria-label={lang === "bn" ? "জুম কমান" : "Zoom out"}
                title={lang === "bn" ? "জুম কমান" : "Zoom out"}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 text-white shadow-2xl transition-all duration-150 cursor-pointer active:scale-90 border border-white/10 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-neutral-800"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
              </button>

              {/* Middle Button [ 🔄 ] for Reverting to 100% */}
              <button
                type="button"
                onClick={resetZoom}
                aria-label={lang === "bn" ? "১০০% জুম রিসেট করুন" : "Reset zoom to 100%"}
                title={lang === "bn" ? "১০০% রিসেট" : "Reset to 100%"}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 text-white shadow-2xl transition-all duration-150 cursor-pointer active:scale-90 border border-white/10"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>

              {/* Plus Button [ + ] */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= MAX_ZOOM - 0.01}
                aria-label={lang === "bn" ? "জুম বাড়ান" : "Zoom in"}
                title={lang === "bn" ? "জুম বাড়ান" : "Zoom in"}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white hover:bg-neutral-100 text-neutral-900 shadow-2xl transition-all duration-150 cursor-pointer active:scale-90 border border-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-white"
              >
                <svg className="h-5 w-5 text-neutral-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="6" x2="12" y2="18" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
