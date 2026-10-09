import { formatPersianDate } from "./price-block-presentation.ts";

/**
 * W9.4 — which locales show a price, and their date label (owner decision change 2026-10-09:
 * fa full, ar price only, en nothing). Dependency-free on purpose: the client weight calculator
 * imports it through lib/weight-calculator/price.ts, so it must not pull zod or the snapshot
 * contract into the browser bundle.
 */
const TEHRAN = "Asia/Tehran";

/** Locales that show a price; en never does. */
export const PRICE_LOCALES = ["fa", "ar"] as const;
export type PriceLocale = (typeof PRICE_LOCALES)[number];
export const isPriceLocale = (locale: string): locale is PriceLocale => (PRICE_LOCALES as readonly string[]).includes(locale);

/** «٨ أكتوبر ٢٠٢٦» — Gregorian, Arabic-Indic digits, Tehran date. Build time only (travels as a string). */
export function formatArabicDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: TEHRAN }).format(date);
}

/** The date label of a price for a price locale (fa: Persian calendar; ar: Gregorian, Arabic-Indic digits). Build time only. */
export function priceDateLabel(locale: PriceLocale, iso: string): string {
  return locale === "fa" ? formatPersianDate(new Date(iso)) : formatArabicDate(new Date(iso));
}
