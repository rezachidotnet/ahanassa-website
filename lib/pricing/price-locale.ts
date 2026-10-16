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

/**
 * W20.7 add-on (owner 2026-10-16): prices publish twice a day (≈11:30 and ≈13:30 Tehran), so the time of a price
 * shows next to its date: fa «به‌روزرسانی ۱۳:۰۰», ar «تحديث ١٣:٠٠» (ar wording owner-approved 2026-10-16; Arabic
 * letters only). Tehran time, 24 h. ar still never carries a machine (ISO) timestamp.
 */
export const PRICE_TIME_COPY: Record<PriceLocale, (time: string) => string> = {
  fa: (time) => `به‌روزرسانی ${time}`,
  ar: (time) => `تحديث ${time}`,
};

/** «۱۳:۰۰» (fa) / «١٣:٠٠» (ar): the Tehran time of a price, 24 h. Build time only. */
export function priceTimeLabel(locale: PriceLocale, iso: string): string {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "ar-EG", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TEHRAN }).format(new Date(iso));
}

/** The date and update time of a price in a price cell: «۲۴ مهر ۱۴۰۵ · به‌روزرسانی ۱۳:۰۰» / «٢٤ أكتوبر ٢٠٢٦ · تحديث ١٣:٠٠». */
export function priceStampLabel(locale: PriceLocale, iso: string): string {
  return `${priceDateLabel(locale, iso)} · ${PRICE_TIME_COPY[locale](priceTimeLabel(locale, iso))}`;
}

/**
 * W9.6 — the disclaimer line under every price table and price block, and under the calculator estimate
 * (fa/ar; en never). Owner-approved text (PR #35, 2026-10-09); once on a product page (under the variant table). Arabic letters only on ar
 * (ي ك; ١٠ in Arabic-Indic digits).
 */
export const PRICE_DISCLAIMER: Record<PriceLocale, string> = {
  fa: "قیمت‌ها به تومان برای هر کیلوگرم و شامل ۱۰٪ ارزش افزوده است. قیمت نهایی بر اساس تناژ، زمان سفارش و محل تحویل اعلام می‌شود.",
  ar: "الأسعار بالتومان لكل كيلوغرام وتشمل ضريبة القيمة المضافة ١٠٪. يُحدَّد السعر النهائي حسب الكمية ووقت الطلب ومكان التسليم.",
};
