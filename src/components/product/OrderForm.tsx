"use client";

import React from "react";
import type { SupportedLocale } from "@/lib/format";
import { formatNumber, formatPrice, localizeDigits } from "@/lib/format";
import type { CopyDictionary } from "@/lib/i18n";
import type { OrderTotals, DhakaAreaChoice } from "@/lib/delivery";
import type { District } from "@/lib/districts";
import type { PublicClientConfig } from "@/lib/config-schema";

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

        {/* Live Order Summary Card */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            <span>{copy.summaryHeading}</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              {copy.codBadgeText}
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
          🔒 {lang === "bn" ? "পণ্য হাতে পেয়ে চেক করে মূল্য পরিশোধ করবেন। কোনো অগ্রিম পেমেন্ট নেই।" : "Pay Cash on Delivery after inspecting your parcel. No advance payment required."}
        </p>
      </form>
    </div>
  );
}
