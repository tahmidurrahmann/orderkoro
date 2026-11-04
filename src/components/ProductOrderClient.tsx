"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useEffect,
} from "react";
import type { PublicClientConfig } from "@/lib/config-schema";
import { isEffectivelySoldOut } from "@/lib/sold-out";
import { darkenHex } from "@/lib/contrast";
import {
  calculateOrderTotals,
  hasDhakaSuburbZone,
  type DhakaAreaChoice,
} from "@/lib/delivery";
import { filterDistricts, findDistrictById } from "@/lib/districts";
import { calculateSavings, type SupportedLocale } from "@/lib/format";
import {
  getClientCopy,
  resolveLocalizedText,
  type LocalizedText,
  type CopyDictionary,
} from "@/lib/i18n";
import { getSavedLocale, saveLocalePreference } from "@/lib/locale-preference";
import { saveOrderSummaryToSession } from "@/lib/order-session";
import { saveReceiptToStorage } from "@/lib/receipt";
import { normalizeBdPhone, validateBdPhone } from "@/lib/phone";
import { trackInitiateCheckout, trackViewContent } from "@/lib/tracking";
import { getEnabledPaymentMethods, type PaymentMethodId } from "@/lib/payments";

import ProductGallery from "./product/ProductGallery";
import ProductSelectors from "./product/ProductSelectors";
import PoweredByOrderKoro from "./PoweredByOrderKoro";
import { clampGalleryIndex, resolveGalleryImages } from "@/lib/gallery-selection";
import DeliveryBlock from "./product/DeliveryBlock";
import OrderForm, { type FormErrors } from "./product/OrderForm";
import StickyOrderBar from "./product/StickyOrderBar";
import ShareRow from "./product/ShareRow";
import TrustBlock from "./product/TrustBlock";
import { getHeaderPaymentChip, getHeaderReturnChip } from "@/lib/policy-text";
import type { ImagesManifest } from "./ui/StorefrontImage";

const emptySubscribe = () => () => {};

export interface ProductOrderClientProps {
  config: PublicClientConfig;
  imagesManifest?: ImagesManifest;
}

export default function ProductOrderClient({
  config,
  imagesManifest,
}: ProductOrderClientProps) {
  const router = useRouter();
  const uid = useId();

  // 1. Language state (useSyncExternalStore eliminates setState in useEffect)
  const initialLang = useSyncExternalStore(
    emptySubscribe,
    () =>
      config.language.allowSwitch
        ? getSavedLocale(config.language.default)
        : config.language.default,
    () => config.language.default,
  );
  const [selectedLang, setSelectedLang] = useState<SupportedLocale | null>(
    null,
  );
  const lang = selectedLang ?? initialLang;

  // Synchronize document language dynamically for accessibility and translation prevention
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute("data-lang", lang);
    }
  }, [lang]);

  function handleLanguageChange(newLang: SupportedLocale) {
    setSelectedLang(newLang);
    saveLocalePreference(newLang);
  }

  const copy = useMemo(
    () => getClientCopy(lang, config.copy),
    [lang, config.copy],
  );

  // 2. Product variant & gallery state (Single source of truth)
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(0);
  const firstAvailableSize = useMemo(
    () => config.sizes.find((s) => s.available)?.name ?? "",
    [config.sizes],
  );
  const [selectedSize, setSelectedSize] = useState<string>(firstAvailableSize);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState<boolean>(false);

  const activeColor = config.colors?.[selectedColorIdx] ?? config.colors?.[0];
  const galleryImages = useMemo(() => {
    return resolveGalleryImages(activeColor?.images, config.product.images);
  }, [activeColor?.images, config.product.images]);

  // Ensure selectedIndex is always strictly clamped within current galleryImages
  const safeSelectedIndex = clampGalleryIndex(selectedIndex, galleryImages.length);

  // 3. Order Form state
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [dhakaArea, setDhakaArea] = useState<DhakaAreaChoice>("city");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(() => {
    const list = getEnabledPaymentMethods(config);
    return list[0]?.id || "cod";
  });
  const [transactionId, setTransactionId] = useState<string>("");
  const [paidFrom, setPaidFrom] = useState<string>("");

  const [openDropdownFormId, setOpenDropdownFormId] = useState<
    "m" | "d" | null
  >(null);
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [showErrorSummary, setShowErrorSummary] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Idempotency key (UUID) & form mounted timestamp (initialized in effect for React 19 purity)
  const isSubmittingRef = useRef<boolean>(false);
  const idempotencyKeyRef = useRef<string>("");
  const formStartedAtRef = useRef<number>(0);
  const lastOrderContentSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `idem_${Date.now()}`;
    }
    if (!formStartedAtRef.current) {
      formStartedAtRef.current = Date.now();
    }
  }, []);

  // Meta Pixel ViewContent event
  useEffect(() => {
    trackViewContent(config.slug, config.product.price);
  }, [config.slug, config.product.price]);

  // Meta Pixel InitiateCheckout event (fired once per page view on first form interaction)
  const hasInitiatedCheckoutRef = useRef<boolean>(false);
  const handleFormInteraction = () => {
    if (!hasInitiatedCheckoutRef.current) {
      hasInitiatedCheckoutRef.current = true;
      trackInitiateCheckout();
    }
  };

  const isPaused = config.status === "paused";
  const isSoldOut = isEffectivelySoldOut(config);

  // 4. Share state (useSyncExternalStore eliminates hydration mismatch and setState in effect)
  const shareUrl = useSyncExternalStore(
    emptySubscribe,
    () => window.location.href,
    () => `https://orderkoro.example/${config.slug}`,
  );
  const canNativeShare = useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  // Field refs for smooth scroll and focus management
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const [isFormInView, setIsFormInView] = useState<boolean>(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const districtTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addressInputRef = useRef<HTMLTextAreaElement | null>(null);
  const sizeGroupRef = useRef<HTMLDivElement | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = formSectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIsFormInView(entry.isIntersecting);
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleSelectColor(index: number) {
    setSelectedColorIdx(index);
    setSelectedIndex(0);
  }

  const savings = useMemo(
    () => calculateSavings(config.product.price, config.product.oldPrice),
    [config.product.price, config.product.oldPrice],
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
        showDhakaSuburbSelector ? dhakaArea : "city",
      ),
    [config, quantity, selectedDistrict, showDhakaSuburbSelector, dhakaArea],
  );

  const filteredDistricts = useMemo(
    () => filterDistricts(districtSearchQuery),
    [districtSearchQuery],
  );

  const selectedDistrictObj = useMemo(
    () => (selectedDistrict ? findDistrictById(selectedDistrict) : undefined),
    [selectedDistrict],
  );

  function validateSingleField(
    field: keyof FormErrors,
    values?: {
      size?: string;
      name?: string;
      phone?: string;
      district?: string;
      address?: string;
      transactionId?: string;
      paidFrom?: string;
    },
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
      case "transactionId": {
        if (paymentMethod !== "cod") {
          const trx = (values?.transactionId ?? transactionId)
            .trim()
            .toUpperCase();
          if (!trx || !/^[A-Z0-9]{6,20}$/.test(trx)) {
            return lang === "bn"
              ? "সঠিক ট্রানজেকশন আইডি (TrxID) লিখুন (৬-২০ অক্ষর বা সংখ্যা)"
              : "Please enter a valid TrxID (6-20 alphanumeric characters)";
          }
        }
        return undefined;
      }
      case "paidFrom": {
        if (paymentMethod !== "cod") {
          const pf = values?.paidFrom ?? paidFrom;
          const check = validateBdPhone(pf);
          if (!check.valid) {
            return lang === "bn"
              ? "সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)"
              : "Please enter a valid 11-digit mobile number";
          }
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
    if (field === "paidFrom" && paidFrom.trim()) {
      const norm = normalizeBdPhone(paidFrom);
      setPaidFrom(norm);
    }
    const err = validateSingleField(field, { phone: overridePhone });
    setErrors((prev) => ({ ...prev, [field]: err }));
  }

  function handleStickyOrderClick() {
    if (config.soldOut) return;
    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

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
    if (isSubmittingRef.current || config.soldOut) return;

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
      paidFrom: validateSingleField("paidFrom"),
      transactionId: validateSingleField("transactionId"),
    };

    const activeErrorKeys = (
      Object.keys(nextErrors) as (keyof FormErrors)[]
    ).filter((k) => Boolean(nextErrors[k]));

    setTouched({
      size: true,
      name: true,
      phone: true,
      district: true,
      address: true,
      paidFrom: true,
      transactionId: true,
    });
    setErrors(nextErrors);

    if (activeErrorKeys.length > 0) {
      setShowErrorSummary(true);
      const firstInvalid = activeErrorKeys[0];
      if (firstInvalid === "size") {
        sizeGroupRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else if (firstInvalid === "name") {
        nameInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        nameInputRef.current?.focus();
      } else if (firstInvalid === "phone") {
        phoneInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        phoneInputRef.current?.focus();
      } else if (firstInvalid === "district") {
        districtTriggerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        districtTriggerRef.current?.focus();
      } else if (firstInvalid === "address") {
        addressInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        addressInputRef.current?.focus();
      }
      return;
    }

    // Reuse the same idempotencyKey when retrying the same order contents;
    // create a new key only after a successful order or when the user changes order contents.
    const currentOrderSignature = [
      config.slug,
      customerName.trim(),
      normalizedPhone,
      customerAddress.trim(),
      selectedDistrict,
      showDhakaSuburbSelector ? dhakaArea : "city",
      activeColor.id || "",
      selectedSize,
      orderTotals.quantity,
      paymentMethod,
      paymentMethod !== "cod" ? transactionId.trim().toUpperCase() : "",
      paymentMethod !== "cod" ? normalizeBdPhone(paidFrom) : "",
      customerNote.trim(),
    ].join("|");

    if (
      lastOrderContentSignatureRef.current &&
      lastOrderContentSignatureRef.current !== currentOrderSignature
    ) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    lastOrderContentSignatureRef.current = currentOrderSignature;

    // Synchronous ref-based lock set on click before async operations
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowErrorSummary(false);
    setServerError(null);

    try {
      const searchParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      const utm_source = searchParams.get("utm_source") || undefined;
      const utm_medium = searchParams.get("utm_medium") || undefined;
      const utm_campaign = searchParams.get("utm_campaign") || undefined;
      const utm_content = searchParams.get("utm_content") || undefined;
      const utm_term = searchParams.get("utm_term") || undefined;
      const fbclid = searchParams.get("fbclid") || undefined;
      const _fbp = searchParams.get("_fbp") || undefined;
      const _fbc = searchParams.get("_fbc") || undefined;

      const deliveryQuote =
        orderTotals.delivery ??
        calculateOrderTotals(
          config,
          quantity,
          selectedDistrict,
          showDhakaSuburbSelector ? dhakaArea : "city",
        ).delivery;

      const activeColorName = resolveLocalizedText(activeColor.name, lang);
      const zoneId =
        showDhakaSuburbSelector && dhakaArea === "suburb"
          ? suburbZoneId || "dhaka_suburb"
          : deliveryQuote?.zoneId || config.delivery.defaultZoneId;

      const orderPayload = {
        slug: config.slug,
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
        district: selectedDistrict,
        zone: zoneId,
        color: activeColor.id || activeColorName,
        size: selectedSize,
        quantity: orderTotals.quantity,
        paymentMethod,
        transactionId:
          paymentMethod !== "cod"
            ? transactionId.trim().toUpperCase()
            : undefined,
        paidFrom:
          paymentMethod !== "cod" ? normalizeBdPhone(paidFrom) : undefined,
        note: customerNote.trim() || undefined,
        honeypot: honeypot || undefined,
        website: honeypot || undefined,
        formStartedAt: formStartedAtRef.current,
        idempotencyKey: idempotencyKeyRef.current,
        lang: lang,
        attribution: {
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          fbclid,
          _fbp,
          _fbc,
        },
      };

      let response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      let data = await response.json();

      // Handle concurrent order processing: wait 2s and retry once with the same key
      if (response.status === 409 && data.retryable) {
        setServerError(
          lang === "bn"
            ? "অর্ডারটি প্রসেস হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন..."
            : "Your order is processing, please wait...",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        response = await fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });
        data = await response.json();
      }

      if (!response.ok || !data.ok) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);

        if (response.status === 400 && data.field) {
          setErrors((prev) => ({ ...prev, [data.field]: data.error }));
          setShowErrorSummary(true);
          setServerError(data.error);
        } else if (response.status === 429) {
          setServerError(
            lang === "bn"
              ? "অতিরিক্ত চেষ্টার কারণে সাময়িকভাবে অর্ডার গ্রহণ স্থগিত আছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
              : "Too many attempts. Please wait a few minutes before trying again.",
          );
        } else if (response.status === 502) {
          setServerError(
            lang === "bn"
              ? "অর্ডার প্রক্রিয়া সাময়িকভাবে বিলম্বিত হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
              : "Order service temporarily unavailable. Please retry shortly.",
          );
        } else {
          setServerError(
            data.error ||
              (lang === "bn"
                ? "অর্ডার প্রক্রিয়াকরণে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
                : "Failed to place order. Please check your information and retry."),
          );
        }
        return;
      }

      // Successful order: reset content tracker and assign fresh key for subsequent orders
      lastOrderContentSignatureRef.current = "";
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      saveOrderSummaryToSession({
        orderNumber: data.orderNumber || data.summary?.orderNumber,
        slug: config.slug,
        productTitle: config.product.title,
        colorName: activeColor.name,
        sizeName: selectedSize,
        quantity: orderTotals.quantity,
        unitPrice: orderTotals.unitPrice,
        subtotal: orderTotals.unitPrice * orderTotals.quantity,
        deliveryCharge:
          data.summary?.deliveryFee ??
          orderTotals.delivery?.effectiveCharge ??
          0,
        deliveryZoneLabel: deliveryQuote
          ? deliveryQuote.label
          : config.delivery.zones[0].label,
        daysMin: deliveryQuote ? deliveryQuote.daysMin : 2,
        daysMax: deliveryQuote ? deliveryQuote.daysMax : 4,
        total: data.summary?.total ?? orderTotals.total,
        confirmationMode: config.confirmationMode || "call",
        language: lang,
        paymentMethod: paymentMethod,
        eventId: data.eventId || data.orderNumber,
        createdAtIso: data.summary?.createdAtIso || new Date().toISOString(),
      });

      saveReceiptToStorage({
        orderNumber: data.orderNumber || data.summary?.orderNumber,
        token: data.token || (data.summary as Record<string, unknown> | undefined)?.token as string | undefined,
        slug: config.slug,
        productTitle: config.product.title,
        colorName: activeColor.name,
        sizeName: selectedSize,
        quantity: orderTotals.quantity,
        unitPrice: orderTotals.unitPrice,
        subtotal: orderTotals.unitPrice * orderTotals.quantity,
        deliveryCharge:
          data.summary?.deliveryFee ??
          orderTotals.delivery?.effectiveCharge ??
          0,
        deliveryZoneLabel: deliveryQuote
          ? deliveryQuote.label
          : config.delivery.zones[0].label,
        daysMin: deliveryQuote ? deliveryQuote.daysMin : 2,
        daysMax: deliveryQuote ? deliveryQuote.daysMax : 4,
        total: data.summary?.total ?? orderTotals.total,
        deliveryAddress: customerAddress.trim(),
        confirmationMode: config.confirmationMode || "call",
        language: lang,
        paymentMethod: paymentMethod,
        transactionId: transactionId.trim() || undefined,
        createdAtIso: data.summary?.createdAtIso || new Date().toISOString(),
      });

      router.push(`/${config.slug}/thanks`);
    } catch (err) {
      console.error("[Order Form] Network error:", err);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setServerError(
        lang === "bn"
          ? "ইন্টারনেট সংযোগে সমস্যা দেখা দিয়েছে। আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।"
          : "Network connection error. Please verify your connection and retry.",
      );
    }
  }

  const productTitleText = resolveLocalizedText(config.product.title, lang);
  const brandNameText = resolveLocalizedText(config.brand.name, lang);
  const activeColorName = resolveLocalizedText(activeColor.name, lang);

  const activeLogoUrl =
    typeof config.brand.logoUrl === "string"
      ? config.brand.logoUrl
      : config.brand.logoUrl[lang] ||
        config.brand.logoUrl.bn ||
        config.brand.logoUrl.en;

  const primaryColor = config.brand.primaryColor;
  const primaryHover = darkenHex(primaryColor, 0.84);
  const accentColor = config.brand.accentColor || "#B45309";

  const paymentChipText = getHeaderPaymentChip(config.payments, lang);
  const returnChipText = getHeaderReturnChip(config.returnPolicy, lang);

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
      {/* 1. Header */}
      <header
        suppressHydrationWarning
        className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-3 min-[360px]:px-4 sm:px-6 lg:px-8 py-2.5 backdrop-blur-md"
      >
        <div
          suppressHydrationWarning
          className="mx-auto flex min-h-12 max-w-6xl items-center justify-between"
        >
          <div
            suppressHydrationWarning
            className="flex items-center gap-2.5 min-w-0"
          >
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
            {config.slug === "demo-brand" && (
              <span className="shrink-0 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 shadow-2xs">
                Demo
              </span>
            )}
          </div>

          {/* Desktop trust badges in header */}
          <div className="hidden lg:flex items-center gap-5 text-xs font-medium text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {paymentChipText}
            </span>
            {returnChipText && (
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                <svg
                  className="h-4 w-4 text-emerald-600 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>{returnChipText}</span>
              </span>
            )}
            {config.contact.phone && (
              <a
                href={`tel:${config.contact.phone}`}
                className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-primary)] cursor-pointer hover:underline"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {config.contact.phone}
              </a>
            )}
          </div>

          {/* Dolbol-Style Segmented Language Switcher [ বাং | EN ] */}
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

      {/* =========================================================
          DESKTOP 2-COLUMN VIEW (Screens >= lg: 1024px)
         ========================================================= */}
      <div className="hidden lg:block mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="grid grid-cols-12 gap-8 xl:gap-12 items-start">
          {/* Left Column: Gallery, Description, Trust, Support, Share */}
          <div className="col-span-7 space-y-6">
            <ProductGallery
              galleryImages={galleryImages}
              selectedIndex={safeSelectedIndex}
              onIndexChange={setSelectedIndex}
              activeSlide={safeSelectedIndex}
              setActiveSlide={setSelectedIndex}
              productTitleText={productTitleText}
              activeColorName={activeColorName}
              activeColorHex={activeColor?.hex ?? "#000000"}
              soldOut={isSoldOut}
              copy={copy}
              lang={lang}
              manifest={imagesManifest}
            />

            <ProductDescription
              shortDescription={config.product.shortDescription}
              details={config.product.details}
              lang={lang}
              copy={copy}
            />

            <TrustBlock
              phone={config.contact.phone}
              messengerPageUsername={config.contact.messengerPageUsername}
              returnPolicy={config.returnPolicy}
              payments={config.payments}
              qualityBadge={config.qualityBadge}
              copy={copy}
              lang={lang}
            />

            <ShareRow
              shareUrl={shareUrl}
              canNativeShare={canNativeShare}
              productTitleText={productTitleText}
              copy={copy}
            />
          </div>

          {/* Right Column: Sticky Checkout Panel with Title, Selectors, Delivery, Form */}
          <div className="col-span-5 space-y-6 sticky top-20">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm space-y-6">
              <ProductSelectors
                config={{ ...config, soldOut: isSoldOut }}
                selectedColorIdx={selectedColorIdx}
                onSelectColor={handleSelectColor}
                selectedSize={selectedSize}
                onSelectSize={(size) => {
                  setSelectedSize(size);
                  setErrors((prev) => ({ ...prev, size: undefined }));
                }}
                quantity={quantity}
                setQuantity={setQuantity}
                savings={savings}
                sizeGroupRef={sizeGroupRef}
                isSizeChartOpen={isSizeChartOpen}
                setIsSizeChartOpen={setIsSizeChartOpen}
                copy={copy}
                lang={lang}
                activeColorName={activeColorName}
                productTitleText={productTitleText}
              />

              <DeliveryBlock
                orderTotals={orderTotals}
                freeDeliveryAbove={config.delivery.freeDeliveryAbove}
                copy={copy}
                lang={lang}
              />

              <div
                ref={formSectionRef}
                onFocusCapture={handleFormInteraction}
                onClickCapture={handleFormInteraction}
              >
                {isPaused ? (
                  <SellerPausedBanner config={config} lang={lang} />
                ) : (
                  <OrderForm
                    idPrefix="d"
                    uid={uid}
                    config={config}
                    copy={copy}
                    lang={lang}
                    productTitleText={productTitleText}
                    activeColorName={activeColorName}
                    selectedSize={selectedSize}
                    orderTotals={orderTotals}
                    serverError={serverError}
                    showErrorSummary={showErrorSummary}
                    errors={errors}
                    touched={touched}
                    isSubmitting={isSubmitting}
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    customerPhone={customerPhone}
                    setCustomerPhone={setCustomerPhone}
                    selectedDistrict={selectedDistrict}
                    setSelectedDistrict={setSelectedDistrict}
                    selectedDistrictObj={selectedDistrictObj}
                    openDropdownFormId={openDropdownFormId}
                    setOpenDropdownFormId={setOpenDropdownFormId}
                    districtSearchQuery={districtSearchQuery}
                    setDistrictSearchQuery={setDistrictSearchQuery}
                    filteredDistricts={filteredDistricts}
                    showDhakaSuburbSelector={showDhakaSuburbSelector}
                    dhakaArea={dhakaArea}
                    setDhakaArea={setDhakaArea}
                    customerAddress={customerAddress}
                    setCustomerAddress={setCustomerAddress}
                    customerNote={customerNote}
                    setCustomerNote={setCustomerNote}
                    honeypot={honeypot}
                    setHoneypot={setHoneypot}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    transactionId={transactionId}
                    setTransactionId={setTransactionId}
                    paidFrom={paidFrom}
                    setPaidFrom={setPaidFrom}
                    errorSummaryRef={errorSummaryRef}
                    nameInputRef={nameInputRef}
                    phoneInputRef={phoneInputRef}
                    districtTriggerRef={districtTriggerRef}
                    addressInputRef={addressInputRef}
                    handleBlur={handleBlur}
                    handleSubmit={handleSubmit}
                    setErrors={setErrors}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          MOBILE 1-COLUMN VIEW (Screens < lg: 320px to 1023px)
         ========================================================= */}
      <main className="lg:hidden mx-auto w-full max-w-xl bg-[var(--bg-surface)] shadow-[var(--shadow-card)] min-h-screen-safe flex-1 flex flex-col">
        {/* 2. Gallery */}
        <ProductGallery
          galleryImages={galleryImages}
          selectedIndex={safeSelectedIndex}
          onIndexChange={setSelectedIndex}
          activeSlide={safeSelectedIndex}
          setActiveSlide={setSelectedIndex}
          productTitleText={productTitleText}
          activeColorName={activeColorName}
          activeColorHex={activeColor?.hex ?? "#000000"}
          soldOut={isSoldOut}
          copy={copy}
          lang={lang}
          manifest={imagesManifest}
        />

        {/* 3. Title, Selectors, Pricing */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 pt-4 pb-5">
          <ProductSelectors
            config={{ ...config, soldOut: isSoldOut }}
            selectedColorIdx={selectedColorIdx}
            onSelectColor={handleSelectColor}
            selectedSize={selectedSize}
            onSelectSize={(size) => {
              setSelectedSize(size);
              setErrors((prev) => ({ ...prev, size: undefined }));
            }}
            quantity={quantity}
            setQuantity={setQuantity}
            savings={savings}
            sizeGroupRef={sizeGroupRef}
            isSizeChartOpen={isSizeChartOpen}
            setIsSizeChartOpen={setIsSizeChartOpen}
            copy={copy}
            lang={lang}
            activeColorName={activeColorName}
            productTitleText={productTitleText}
          />
        </div>

        {/* 4. Delivery Estimation Block */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-4">
          <DeliveryBlock
            orderTotals={orderTotals}
            freeDeliveryAbove={config.delivery.freeDeliveryAbove}
            copy={copy}
            lang={lang}
          />
        </div>

        {/* 5. Product Description */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-4">
          <ProductDescription
            shortDescription={config.product.shortDescription}
            details={config.product.details}
            lang={lang}
            copy={copy}
          />
        </div>

        {/* 6. Checkout Order Form */}
        <section
          ref={formSectionRef}
          aria-labelledby={`${uid}-m-order-heading`}
          className="px-3 min-[360px]:px-4 py-5 scroll-mt-16"
          onFocusCapture={handleFormInteraction}
          onClickCapture={handleFormInteraction}
        >
          {isPaused ? (
            <SellerPausedBanner config={config} lang={lang} />
          ) : (
            <>
              <div className="mb-4">
                <h2
                  id={`${uid}-m-order-heading`}
                  className="text-lg min-[360px]:text-xl font-bold tracking-tight text-[var(--text-primary)]"
                >
                  {copy.formHeading}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {copy.formSubheading}
                </p>
              </div>
              <OrderForm
                idPrefix="m"
                uid={uid}
                config={config}
                copy={copy}
                lang={lang}
                productTitleText={productTitleText}
                activeColorName={activeColorName}
                selectedSize={selectedSize}
                orderTotals={orderTotals}
                serverError={serverError}
                showErrorSummary={showErrorSummary}
                errors={errors}
                touched={touched}
                isSubmitting={isSubmitting}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                selectedDistrictObj={selectedDistrictObj}
                openDropdownFormId={openDropdownFormId}
                setOpenDropdownFormId={setOpenDropdownFormId}
                districtSearchQuery={districtSearchQuery}
                setDistrictSearchQuery={setDistrictSearchQuery}
                filteredDistricts={filteredDistricts}
                showDhakaSuburbSelector={showDhakaSuburbSelector}
                dhakaArea={dhakaArea}
                setDhakaArea={setDhakaArea}
                customerAddress={customerAddress}
                setCustomerAddress={setCustomerAddress}
                customerNote={customerNote}
                setCustomerNote={setCustomerNote}
                honeypot={honeypot}
                setHoneypot={setHoneypot}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                transactionId={transactionId}
                setTransactionId={setTransactionId}
                paidFrom={paidFrom}
                setPaidFrom={setPaidFrom}
                errorSummaryRef={errorSummaryRef}
                nameInputRef={nameInputRef}
                phoneInputRef={phoneInputRef}
                districtTriggerRef={districtTriggerRef}
                addressInputRef={addressInputRef}
                handleBlur={handleBlur}
                handleSubmit={handleSubmit}
                setErrors={setErrors}
              />
            </>
          )}
        </section>

        {/* 7. Trust Block */}
        <div className="border-b border-[var(--border-subtle)] px-3 min-[360px]:px-4 py-5">
          <TrustBlock
            phone={config.contact.phone}
            messengerPageUsername={config.contact.messengerPageUsername}
            returnPolicy={config.returnPolicy}
            payments={config.payments}
            qualityBadge={config.qualityBadge}
            copy={copy}
            lang={lang}
          />
        </div>

        {/* 8. Share Row */}
        <div className="px-3 min-[360px]:px-4 py-4">
          <ShareRow
            shareUrl={shareUrl}
            canNativeShare={canNativeShare}
            productTitleText={productTitleText}
            copy={copy}
          />
        </div>

        {/* 9. Mobile Footer */}
        <footer
          className={`border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 pt-4 text-center text-xs text-[var(--text-muted)] ${
            !isPaused && !isSoldOut
              ? "pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]"
              : "pb-4"
          }`}
        >
          <div className="mb-2 flex items-center justify-center gap-4 text-xs">
            <Link
              href={`/${config.slug}/privacy`}
              className="text-[var(--text-secondary)] hover:underline hover:text-[var(--text-primary)]"
            >
              {lang === "bn" ? "প্রাইভেসি পলিসি" : "Privacy Policy"}
            </Link>
            <span aria-hidden="true">•</span>
            <Link
              href={`/${config.slug}/terms`}
              className="text-[var(--text-secondary)] hover:underline hover:text-[var(--text-primary)]"
            >
              {lang === "bn" ? "শর্তাবলী ও রিটার্ন পলিসি" : "Terms & Returns"}
            </Link>
          </div>
          <p>
            © {new Date().getFullYear()} {brandNameText}.{" "}
            {copy.footerRightsReserved}
          </p>
          {config.showPoweredBy !== false && (
            <div className="mt-1">
              <PoweredByOrderKoro slug={config.slug} lang={lang} />
            </div>
          )}
        </footer>
      </main>

      {/* Desktop Footer */}
      <footer className="hidden lg:block border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] mt-8 py-5 text-center text-xs text-[var(--text-muted)]">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <Link
              href={`/${config.slug}/privacy`}
              className="text-[var(--text-secondary)] hover:underline hover:text-[var(--text-primary)]"
            >
              {lang === "bn" ? "প্রাইভেসি পলিসি" : "Privacy Policy"}
            </Link>
            <span aria-hidden="true">•</span>
            <Link
              href={`/${config.slug}/terms`}
              className="text-[var(--text-secondary)] hover:underline hover:text-[var(--text-primary)]"
            >
              {lang === "bn" ? "শর্তাবলী ও রিটার্ন পলিসি" : "Terms & Returns"}
            </Link>
          </div>
          <p>
            © {new Date().getFullYear()} {brandNameText}.{" "}
            {copy.footerRightsReserved}
          </p>
          {config.showPoweredBy !== false && (
            <PoweredByOrderKoro slug={config.slug} lang={lang} />
          )}
        </div>
      </footer>

      {/* Sticky Bottom Bar (Mobile only, hidden when paused) */}
      {!isPaused && (
        <StickyOrderBar
          soldOut={isSoldOut}
          isFormInView={isFormInView}
          price={orderTotals.total}
          quantity={quantity}
          lang={lang}
          copy={copy}
          onOrderClick={handleStickyOrderClick}
        />
      )}
    </div>
  );
}

function SellerPausedBanner({
  config,
  lang,
}: {
  config: PublicClientConfig;
  lang: SupportedLocale;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6 text-center space-y-3.5 shadow-2xs">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-amber-900">
          {lang === "bn"
            ? "অর্ডার গ্রহণ সাময়িকভাবে স্থগিত রয়েছে"
            : "Orders Temporarily Paused"}
        </h3>
        <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
          {lang === "bn"
            ? "এই স্টোরের অর্ডার গ্রহণ সাময়িকভাবে স্থগিত রয়েছে। যেকোনো তথ্য বা অনুসন্ধানের জন্য অনুগ্রহ করে মেসেঞ্জারে অথবা সরাসরি ফোনে যোগাযোগ করুন।"
            : "Orders for this store are currently paused. For inquiries or questions, please contact us on Messenger or phone."}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
        <a
          href={`https://m.me/${encodeURIComponent(config.contact.messengerPageUsername)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-[#0073e6] cursor-pointer"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.78c.04.57.61.94 1.13.71l1.98-.87c.17-.08.36-.1.55-.06.91.25 1.87.38 2.88.38 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm6 7.46-2.93 4.67c-.47.73-1.47.92-2.17.4l-2.33-1.75a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.69-.63l2.93-4.67c.47-.73 1.47-.92 2.17-.4l2.33 1.75a.6.6 0 0 0 .72 0l3.15-2.39c.42-.32.97.18.69.63z" />
          </svg>
          <span>
            {lang === "bn" ? "মেসেঞ্জারে নক করুন" : "Chat on Messenger"}
          </span>
        </a>
        {config.contact.phone && (
          <a
            href={`tel:${config.contact.phone}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-900 hover:bg-amber-100/50 cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>{config.contact.phone}</span>
          </a>
        )}
      </div>
    </div>
  );
}

function ProductDescription({
  shortDescription,
  details,
  lang,
  copy,
}: {
  shortDescription: LocalizedText;
  details?: LocalizedText[];
  lang: SupportedLocale;
  copy: CopyDictionary;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 space-y-3">
      <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
        {copy.detailsHeading}
      </h2>
      <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
        {resolveLocalizedText(shortDescription, lang)}
      </p>

      {details && details.length > 0 && (
        <ul className="mt-3 space-y-2.5 border-t border-[var(--border-subtle)] pt-3 text-sm text-[var(--text-secondary)]">
          {details.map((detail, idx) => {
            const rawText = resolveLocalizedText(detail, lang);
            const colonIndex = rawText.indexOf(":");
            const hasColon = colonIndex > 0;
            const label = hasColon ? rawText.slice(0, colonIndex).trim() : null;
            const value = hasColon
              ? rawText.slice(colonIndex + 1).trim()
              : rawText;

            return (
              <li key={idx} className="flex items-start gap-2.5">
                <span
                  className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  aria-hidden="true"
                >
                  <svg
                    className="h-2.5 w-2.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                </span>
                <span className="leading-snug">
                  {label ? (
                    <>
                      <strong className="font-semibold text-[var(--text-primary)]">
                        {label}:
                      </strong>{" "}
                      <span>{value}</span>
                    </>
                  ) : (
                    <span>{rawText}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
