"use client";

import React, { useMemo, useState } from "react";
import type { SupportedLocale } from "@/lib/format";
import { formatNumber, formatPrice, localizeDigits } from "@/lib/format";
import type { CopyDictionary } from "@/lib/i18n";
import type { OrderTotals, DhakaAreaChoice } from "@/lib/delivery";
import type { District } from "@/lib/districts";
import type { PublicClientConfig } from "@/lib/config-schema";
import { getEnabledPaymentMethods, getPaymentTypeInfo } from "@/lib/payments";

export type FormErrors = {
  size?: string;
  name?: string;
  phone?: string;
  district?: string;
  address?: string;
};

export interface OrderFormProps {
  idPrefix: "m" | "d";
  uid: string;
  config: PublicClientConfig;
  copy: CopyDictionary;
  lang: SupportedLocale;
  productTitleText: string;
  activeColorName: string;
  selectedSize: string;
  orderTotals: OrderTotals;
  serverError: string | null;
  showErrorSummary: boolean;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (v: string) => void;
  selectedDistrictObj?: District;
  openDropdownFormId: "m" | "d" | null;
  setOpenDropdownFormId: (v: "m" | "d" | null) => void;
  districtSearchQuery: string;
  setDistrictSearchQuery: (v: string) => void;
  filteredDistricts: District[];
  showDhakaSuburbSelector: boolean;
  dhakaArea: DhakaAreaChoice;
  setDhakaArea: (v: DhakaAreaChoice) => void;
  customerAddress: string;
  setCustomerAddress: (v: string) => void;
  customerNote: string;
  setCustomerNote: (v: string) => void;
  honeypot: string;
  setHoneypot: (v: string) => void;
  paymentMethod?: "cod" | "bkash" | "nagad" | "rocket";
  setPaymentMethod?: (method: "cod" | "bkash" | "nagad" | "rocket") => void;
  transactionId?: string;
  setTransactionId?: (trxId: string) => void;
  errorSummaryRef: React.RefObject<HTMLDivElement | null>;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  phoneInputRef: React.RefObject<HTMLInputElement | null>;
  districtTriggerRef: React.RefObject<HTMLButtonElement | null>;
  addressInputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleBlur: (field: keyof FormErrors) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
}

export default function OrderForm({
  idPrefix,
  uid,
  config,
  copy,
  lang,
  productTitleText,
  activeColorName,
  selectedSize,
  orderTotals,
  serverError,
  showErrorSummary,
  errors,
  touched,
  isSubmitting,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  selectedDistrict,
  setSelectedDistrict,
  selectedDistrictObj,
  openDropdownFormId,
  setOpenDropdownFormId,
  districtSearchQuery,
  setDistrictSearchQuery,
  filteredDistricts,
  showDhakaSuburbSelector,
  dhakaArea,
  setDhakaArea,
  customerAddress,
  setCustomerAddress,
  customerNote,
  setCustomerNote,
  honeypot,
  setHoneypot,
  paymentMethod = "cod",
  setPaymentMethod,
  transactionId = "",
  setTransactionId,
  errorSummaryRef,
  nameInputRef,
  phoneInputRef,
  districtTriggerRef,
  addressInputRef,
  handleBlur,
  handleSubmit,
  setErrors,
}: OrderFormProps) {
  const isDropdownOpen = openDropdownFormId === idPrefix;
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);

  const enabledMethods = useMemo(() => getEnabledPaymentMethods(config), [config]);
  const currentMethodConfig =
    enabledMethods.find((m) => m.id === paymentMethod) || enabledMethods[0];
  const sellerNumber =
    currentMethodConfig?.number || config.contact?.phone || "";

  const currentPaymentTypeInfo = useMemo(() => {
    if (paymentMethod === "cod") return null;
    return getPaymentTypeInfo(paymentMethod, currentMethodConfig?.type);
  }, [paymentMethod, currentMethodConfig?.type]);

  const handleCopySellerNumber = async () => {
    if (!sellerNumber) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sellerNumber);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = sellerNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    }
  };

  return (
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

        {/* District Selector Combobox */}
        <div className="relative">
          <label
            htmlFor={`${uid}-${idPrefix}-district-btn`}
            className="block text-sm font-semibold text-[var(--text-primary)]"
          >
            {copy.fieldDistrictLabel} <span className="text-red-600">*</span>
          </label>

          <button
            suppressHydrationWarning
            ref={idPrefix === "m" ? districtTriggerRef : undefined}
            id={`${uid}-${idPrefix}-district-btn`}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            aria-controls={`${uid}-${idPrefix}-district-listbox`}
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
            <div suppressHydrationWarning className="flex items-center gap-2.5 min-w-0 flex-1">
              <span suppressHydrationWarning className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shrink-0">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </span>
              <div suppressHydrationWarning className="flex flex-col min-w-0">
                {selectedDistrictObj ? (
                  <>
                    <span suppressHydrationWarning className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                      {lang === "bn" ? selectedDistrictObj.bn : selectedDistrictObj.en}
                    </span>
                    <span suppressHydrationWarning className="text-[11px] text-[var(--text-muted)] truncate leading-tight mt-0.5">
                      {lang === "bn" ? `${selectedDistrictObj.division} বিভাগ` : `${selectedDistrictObj.division} Division`}
                    </span>
                  </>
                ) : (
                  <span suppressHydrationWarning className="text-sm text-[var(--text-muted)] truncate">
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

          {/* Backdrop to close dropdown on outside click */}
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
              id={`${uid}-${idPrefix}-district-listbox`}
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

        {/* Payment Method Selector (Directly after Order Note) */}
        <div className="space-y-2.5">
          <label className="block text-sm font-semibold text-[var(--text-primary)]">
            {copy.fieldPaymentMethodLabel}
          </label>

          {/* When only 1 method is configured by the seller */}
          {enabledMethods.length === 1 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-600 bg-emerald-50/40 p-2.5 min-[360px]:p-3 text-emerald-950 shadow-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-xs min-[360px]:text-sm font-bold truncate">
                  {enabledMethods[0].id === "cod"
                    ? (lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery")
                    : enabledMethods[0].id === "bkash"
                    ? (lang === "bn" ? "বিকাশ" : "bKash")
                    : enabledMethods[0].id === "nagad"
                    ? (lang === "bn" ? "নগদ" : "Nagad")
                    : (lang === "bn" ? "রকেট" : "Rocket")}
                </span>
                <span className="block text-[10px] min-[360px]:text-[11px] text-emerald-700 font-medium truncate">
                  {enabledMethods[0].id === "cod"
                    ? (lang === "bn" ? "পণ্য হাতে পেয়ে চেক করে সম্পূর্ণ মূল্য পরিশোধ" : "Pay Cash on Delivery upon inspecting your parcel")
                    : (lang === "bn" ? "মোবাইল ওয়ালেটের মাধ্যমে সরাসরি পেমেন্ট" : "Direct mobile wallet payment")}
                </span>
              </div>
            </div>
          ) : (
            /* Responsive Grid for multiple seller-enabled methods (fits >= 320px) */
            <div
              role="radiogroup"
              aria-label={copy.fieldPaymentMethodLabel}
              className={`grid gap-2 min-[360px]:gap-2.5 ${
                enabledMethods.length === 2
                  ? "grid-cols-2"
                  : enabledMethods.length === 3
                  ? "grid-cols-1 min-[360px]:grid-cols-3"
                  : "grid-cols-2"
              }`}
            >
              {enabledMethods.map((m) => {
                const isSelected = paymentMethod === m.id;
                if (m.id === "cod") {
                  return (
                    <button
                      key="pay-method-cod"
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setPaymentMethod?.("cod")}
                      className={`flex items-center gap-2 min-[360px]:gap-2.5 rounded-xl border p-2 min-[360px]:p-2.5 sm:p-3 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-emerald-600 ring-2 ring-emerald-500/25 bg-emerald-50/40 text-emerald-950 shadow-xs"
                          : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] text-[var(--text-primary)]"
                      }`}
                    >
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${isSelected ? "border-emerald-600 bg-emerald-600" : "border-gray-400 bg-white"}`}>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs min-[360px]:text-sm font-bold truncate">
                          {lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery"}
                        </span>
                        <span className="block text-[10px] min-[360px]:text-[11px] text-emerald-700 font-medium truncate">
                          {lang === "bn" ? "হাতে পেয়ে পরিশোধ" : "Pay on delivery"}
                        </span>
                      </div>
                    </button>
                  );
                }

                if (m.id === "bkash") {
                  return (
                    <button
                      key="pay-method-bkash"
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setPaymentMethod?.("bkash")}
                      style={
                        isSelected
                          ? { borderColor: "#D12053", backgroundColor: "#fdf2f5" }
                          : undefined
                      }
                      className={`flex items-center gap-2 min-[360px]:gap-2.5 rounded-xl border p-2 min-[360px]:p-2.5 sm:p-3 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-[#D12053] ring-2 ring-[#D12053]/25 bg-pink-50/40 text-pink-950 shadow-xs"
                          : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] text-[var(--text-primary)]"
                      }`}
                    >
                      <div
                        style={
                          isSelected
                            ? { borderColor: "#D12053", backgroundColor: "#D12053" }
                            : undefined
                        }
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${isSelected ? "border-[#D12053] bg-[#D12053]" : "border-gray-400 bg-white"}`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          style={isSelected ? { color: "#D12053" } : undefined}
                          className="block text-xs min-[360px]:text-sm font-bold truncate text-[#D12053]"
                        >
                          {lang === "bn" ? "বিকাশ" : "bKash"}
                        </span>
                        <span className="block text-[10px] min-[360px]:text-[11px] text-[var(--text-muted)] font-medium truncate">
                          {lang === "bn" ? "বিকাশ পেমেন্ট" : "bKash MFS"}
                        </span>
                      </div>
                    </button>
                  );
                }

                if (m.id === "nagad") {
                  return (
                    <button
                      key="pay-method-nagad"
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setPaymentMethod?.("nagad")}
                      style={
                        isSelected
                          ? { borderColor: "#F7941D", backgroundColor: "#fff8f0" }
                          : undefined
                      }
                      className={`flex items-center gap-2 min-[360px]:gap-2.5 rounded-xl border p-2 min-[360px]:p-2.5 sm:p-3 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-[#F7941D] ring-2 ring-[#F7941D]/25 bg-orange-50/40 text-orange-950 shadow-xs"
                          : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] text-[var(--text-primary)]"
                      }`}
                    >
                      <div
                        style={
                          isSelected
                            ? { borderColor: "#F7941D", backgroundColor: "#F7941D" }
                            : undefined
                        }
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${isSelected ? "border-[#F7941D] bg-[#F7941D]" : "border-gray-400 bg-white"}`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          style={isSelected ? { color: "#F7941D" } : undefined}
                          className="block text-xs min-[360px]:text-sm font-bold truncate text-[#F7941D]"
                        >
                          {lang === "bn" ? "নগদ" : "Nagad"}
                        </span>
                        <span className="block text-[10px] min-[360px]:text-[11px] text-[var(--text-muted)] font-medium truncate">
                          {lang === "bn" ? "নগদ ওয়ালেট" : "Nagad Wallet"}
                        </span>
                      </div>
                    </button>
                  );
                }

                if (m.id === "rocket") {
                  return (
                    <button
                      key="pay-method-rocket"
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setPaymentMethod?.("rocket")}
                      style={
                        isSelected
                          ? { borderColor: "#8C3494", backgroundColor: "#faf4fb" }
                          : undefined
                      }
                      className={`flex items-center gap-2 min-[360px]:gap-2.5 rounded-xl border p-2 min-[360px]:p-2.5 sm:p-3 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-[#8C3494] ring-2 ring-[#8C3494]/25 bg-purple-50/40 text-purple-950 shadow-xs"
                          : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] text-[var(--text-primary)]"
                      }`}
                    >
                      <div
                        style={
                          isSelected
                            ? { borderColor: "#8C3494", backgroundColor: "#8C3494" }
                            : undefined
                        }
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${isSelected ? "border-[#8C3494] bg-[#8C3494]" : "border-gray-400 bg-white"}`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          style={isSelected ? { color: "#8C3494" } : undefined}
                          className="block text-xs min-[360px]:text-sm font-bold truncate text-[#8C3494]"
                        >
                          {lang === "bn" ? "রকেট" : "Rocket"}
                        </span>
                        <span className="block text-[10px] min-[360px]:text-[11px] text-[var(--text-muted)] font-medium truncate">
                          {lang === "bn" ? "ডিবিবিএল রকেট" : "DBBL Rocket"}
                        </span>
                      </div>
                    </button>
                  );
                }

                return null;
              })}
            </div>
          )}

          {/* Reassurance note when Cash on Delivery is active */}
          {paymentMethod === "cod" && enabledMethods.length > 1 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-emerald-950 text-xs shadow-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0 mt-0.5 text-[11px] font-bold">
                ✓
              </span>
              <div className="min-w-0 flex-1 leading-relaxed">
                <span className="font-bold block text-emerald-950 text-xs sm:text-sm">
                  {lang === "bn" ? "ক্যাশ অন ডেলিভারি (হাতে পেয়ে চেক করে পরিশোধ)" : "Cash on Delivery Selected"}
                </span>
                <span className="text-[11px] sm:text-xs text-emerald-800 mt-0.5 block">
                  {lang === "bn"
                    ? "কোনো অগ্রিম পেমেন্টের প্রয়োজন নেই। পার্সেল ডেলিভারি পাওয়ার পর চেক করে মূল্য পরিশোধ করবেন। (বিকাশ, নগদ বা রকেটে অগ্রিম দিতে চাইলে উপরের বাটনে ক্লিক করুন)"
                    : "No advance payment required. Inspect parcel and pay cash upon delivery. (To pay in advance via bKash, Nagad or Rocket, select an option above)"}
                </span>
              </div>
            </div>
          )}

          {/* Dynamic Seller Number, Copy Button & TrxID Field (Shown for bKash, Nagad, Rocket) */}
          {paymentMethod !== "cod" && (
            <div
              style={
                paymentMethod === "bkash"
                  ? { borderColor: "#fbcfe8", backgroundColor: "rgba(253, 242, 245, 0.7)" }
                  : paymentMethod === "nagad"
                  ? { borderColor: "#fed7aa", backgroundColor: "rgba(255, 248, 240, 0.7)" }
                  : { borderColor: "#e9d5ff", backgroundColor: "rgba(250, 244, 251, 0.7)" }
              }
              className={`rounded-2xl border p-4 sm:p-5 py-4.5 sm:py-5 space-y-4 transition-all shadow-xs ${
                paymentMethod === "bkash"
                  ? "border-pink-200 bg-pink-50/40 text-pink-950"
                  : paymentMethod === "nagad"
                  ? "border-orange-200 bg-orange-50/40 text-orange-950"
                  : "border-purple-200 bg-purple-50/40 text-purple-950"
              }`}
            >
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pt-1 sm:pt-1.5 pb-3 sm:pb-3.5">
                <span className="font-extrabold text-xs min-[360px]:text-sm flex items-center gap-2 py-0.5">
                  <span
                    style={{
                      backgroundColor:
                        paymentMethod === "bkash"
                          ? "#D12053"
                          : paymentMethod === "nagad"
                          ? "#F7941D"
                          : "#8C3494",
                    }}
                    className="inline-block h-2.5 w-2.5 rounded-full animate-pulse"
                  />
                  {paymentMethod === "bkash"
                    ? (lang === "bn" ? "বিকাশ পেমেন্ট তথ্য" : "bKash Payment Details")
                    : paymentMethod === "nagad"
                    ? (lang === "bn" ? "নগদ পেমেন্ট তথ্য" : "Nagad Payment Details")
                    : (lang === "bn" ? "রকেট পেমেন্ট তথ্য" : "Rocket Payment Details")}
                </span>
                <span
                  style={
                    paymentMethod === "bkash"
                      ? { backgroundColor: "#fce7f3", color: "#D12053", borderColor: "#f472b6" }
                      : paymentMethod === "nagad"
                      ? { backgroundColor: "#ffedd5", color: "#ea580c", borderColor: "#fb923c" }
                      : { backgroundColor: "#f3e8ff", color: "#8C3494", borderColor: "#c084fc" }
                  }
                  className="text-[11px] sm:text-xs font-bold px-3 py-1 sm:py-1.5 rounded-full border shadow-xs tracking-tight"
                >
                  {currentPaymentTypeInfo
                    ? (lang === "bn" ? currentPaymentTypeInfo.badgeBn : currentPaymentTypeInfo.badgeEn)
                    : (lang === "bn" ? "পার্সোনাল (Send Money)" : "Personal (Send Money)")}
                </span>
              </div>

              {/* Seller Account Number with High-Contrast One-Tap Copy Button */}
              <div className="rounded-xl bg-[var(--bg-surface)] p-3 border border-[var(--border-strong)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] sm:text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                    {lang === "bn" ? "সেলার পেমেন্ট নম্বর:" : "Seller Payment Number:"}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    {lang === "bn" ? "ক্লিক করে কপি করুন" : "Click to copy"}
                  </span>
                </div>

                <div
                  onClick={handleCopySellerNumber}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[var(--bg-subtle)] p-2 pl-3 border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--brand-primary)]/50 transition select-all"
                  title={lang === "bn" ? "নম্বরটি কপি করতে ক্লিক করুন" : "Click to copy number"}
                >
                  <span className="font-mono text-base min-[360px]:text-lg sm:text-xl font-extrabold tracking-wider text-[var(--text-primary)] select-all truncate">
                    {sellerNumber}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopySellerNumber();
                    }}
                    style={
                      copiedNumber
                        ? { backgroundColor: "#059669", color: "#ffffff" }
                        : paymentMethod === "bkash"
                        ? { backgroundColor: "#D12053", color: "#ffffff" }
                        : paymentMethod === "nagad"
                        ? { backgroundColor: "#F7941D", color: "#ffffff" }
                        : { backgroundColor: "#8C3494", color: "#ffffff" }
                    }
                    aria-label={lang === "bn" ? "সেলার নম্বর কপি করুন" : "Copy seller number"}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                      copiedNumber
                        ? "bg-emerald-600 text-white"
                        : paymentMethod === "bkash"
                        ? "mfs-btn-bkash text-white hover:bg-[#b01742]"
                        : paymentMethod === "nagad"
                        ? "mfs-btn-nagad text-white hover:bg-[#d87c12]"
                        : "mfs-btn-rocket text-white hover:bg-[#722778]"
                    }`}
                  >
                    {copiedNumber ? (
                      <>
                        <svg className="h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span style={{ color: "#ffffff" }} className="text-white font-bold whitespace-nowrap">
                          {copy.copiedNumberFeedback}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span style={{ color: "#ffffff" }} className="text-white font-bold whitespace-nowrap">
                          {copy.copyNumberButtonText}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Action & Step Notice (Send Money vs Cash Out vs Payment) */}
              <div className="rounded-xl bg-black/3 p-2.5 border border-black/5">
                <p className="text-[11px] sm:text-xs leading-relaxed text-[var(--text-secondary)] font-medium">
                  {currentPaymentTypeInfo
                    ? (lang === "bn" ? currentPaymentTypeInfo.instructionBn : currentPaymentTypeInfo.instructionEn)
                    : (lang === "bn" ? "💡 উপরের নম্বরে পেমেন্ট সম্পন্ন করার পর ট্রানজেকশন আইডি (TrxID) নিচে লিখুন।" : "💡 Complete payment to the number above and enter your TrxID below.")}
                </p>
              </div>

              {/* Transaction ID Input */}
              <div>
                <label htmlFor={`${uid}-${idPrefix}-trx-id`} className="block text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  {copy.fieldTrxIdLabel}
                </label>
                <input
                  id={`${uid}-${idPrefix}-trx-id`}
                  name="transactionId"
                  type="text"
                  autoComplete="off"
                  disabled={config.soldOut || isSubmitting}
                  placeholder={copy.fieldTrxIdPlaceholder}
                  value={transactionId}
                  onChange={(e) => setTransactionId?.(e.target.value.toUpperCase().trim())}
                  className="mt-1 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2.5 sm:p-3 text-sm min-[360px]:text-base font-mono tracking-wider text-[var(--text-primary)] uppercase transition focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
                <p className="mt-1 text-[10px] min-[360px]:text-[11px] text-[var(--text-muted)]">
                  {copy.fieldTrxIdHint}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live Order Summary Card */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            <span>{copy.summaryHeading}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              paymentMethod === "bkash"
                ? "bg-pink-100 text-[#D12053]"
                : paymentMethod === "nagad"
                ? "bg-orange-100 text-[#F7941D]"
                : paymentMethod === "rocket"
                ? "bg-purple-100 text-[#8C3494]"
                : "bg-emerald-100 text-emerald-800"
            }`}>
              {paymentMethod === "bkash"
                ? copy.paymentMethodBkash
                : paymentMethod === "nagad"
                ? copy.paymentMethodNagad
                : paymentMethod === "rocket"
                ? copy.paymentMethodRocket
                : copy.paymentMethodCod}
            </span>
          </div>

          <div className="flex justify-between text-xs sm:text-sm text-[var(--text-secondary)]">
            <span>{productTitleText} × {formatNumber(orderTotals.quantity, lang)}</span>
            <span>{formatPrice(orderTotals.subtotal, lang)}</span>
          </div>

          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>
              {copy.colorLabel}: {activeColorName} | {copy.sizeLabel}:{" "}
              {selectedSize
                ? localizeDigits(selectedSize, lang)
                : lang === "bn"
                ? "(নির্বাচন করুন)"
                : "(Select)"}
            </span>
          </div>

          <div className="flex justify-between text-xs sm:text-sm text-[var(--text-secondary)]">
            <span>{copy.summaryDeliveryRow}</span>
            <span>
              {orderTotals.delivery
                ? orderTotals.delivery.isFreeDelivery
                ? (lang === "bn" ? "ফ্রি" : "Free")
                : formatPrice(orderTotals.delivery.effectiveCharge, lang)
                : copy.summaryDeliveryPending}
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
          {paymentMethod === "cod"
            ? (lang === "bn" ? "🔒 পণ্য হাতে পেয়ে চেক করে মূল্য পরিশোধ করবেন। কোনো অগ্রিম পেমেন্ট নেই।" : "🔒 Pay Cash on Delivery after inspecting your parcel. No advance payment required.")
            : paymentMethod === "bkash"
            ? (lang === "bn" ? "🔒 বিকাশ পেমেন্ট: অর্ডার প্লেসের পর আমাদের প্রতিনিধি যোগাযোগ করবেন অথবা পার্সেল রিসিভ করার সময় বিকাশ করতে পারবেন।" : "🔒 bKash: Pay safely via bKash upon delivery or after representative verification.")
            : paymentMethod === "nagad"
            ? (lang === "bn" ? "🔒 নগদ পেমেন্ট: অর্ডার প্লেসের পর আমাদের প্রতিনিধি যোগাযোগ করবেন অথবা পার্সেল রিসিভ করার সময় নগদ করতে পারবেন।" : "🔒 Nagad: Pay safely via Nagad upon delivery or after representative verification.")
            : (lang === "bn" ? "🔒 রকেট পেমেন্ট: অর্ডার প্লেসের পর আমাদের প্রতিনিধি যোগাযোগ করবেন অথবা পার্সেল রিসিভ করার সময় রকেট করতে পারবেন।" : "🔒 Rocket: Pay safely via DBBL Rocket upon delivery or after verification.")}
        </p>
      </form>
    </div>
  );
}
