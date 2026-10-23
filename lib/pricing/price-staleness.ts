import { addDays, dayKind, tehranDate, weekday } from "../price-channel/calendar.ts";
import type { PriceLocale } from "./price-locale.ts";

/**
 * W31 — the stale-price display rule (owner decision 2026-10-22, option B). Prices never disappear and keep their
 * date (D-PRICE-AGE unchanged), but when the NEWEST published price of the snapshot is older than
 * STALE_AFTER_WORKING_DAYS Iranian working days, every price surface (fa/ar) swaps its «today» heading for
 * «آخرین قیمت ثبت‌شده …» / «آخر سعر مسجّل …» and shows a yellow notice linking to the RFQ form.
 *
 * The check runs in the browser at view time (components/prices/stale-price.tsx), against the visitor's current
 * Tehran day: a static copy served unchanged during an internet cutoff turns stale on its own, without a new
 * build. The static HTML always carries the fresh wording and no notice. Pure; `now` is always passed in.
 *
 * Working days: Saturday–Wednesday count 1, Thursday ½, Friday and the official holidays (config/iran-holidays.ts,
 * shared with the price bulletin) 0. The age of a price day is the sum over the days after it, up to and
 * including today — a Saturday price is 2 working days old on Monday (still shown as current) and 3 on Tuesday.
 * Only the Tehran calendar day of the price is used (never its time): ar pages may carry no price timestamp.
 */
export const STALE_AFTER_WORKING_DAYS = 2;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A Tehran day's weight as working time: 1, ½ (Thursday) or 0 (Friday, holiday). */
export function workingDayWeight(day: string): number {
  if (dayKind(day) !== "price-day") return 0;
  return weekday(day) === "Thu" ? 0.5 : 1;
}

/** Working days from `priceDay` to `today` (both Tehran YYYY-MM-DD): the days after the price day up to today. */
export function workingDaysBetween(priceDay: string, today: string): number {
  let total = 0;
  // Bounded: a price day years in the past still ends the loop as soon as the threshold is passed.
  for (let day = addDays(priceDay, 1); day <= today && total <= STALE_AFTER_WORKING_DAYS; day = addDays(day, 1)) total += workingDayWeight(day);
  return total;
}

/** True when the newest price day is more than STALE_AFTER_WORKING_DAYS working days before `now`'s Tehran day. A malformed day is never stale. */
export function isPriceDataStale(latestPriceDay: string, now: Date): boolean {
  if (!DAY.test(latestPriceDay) || Number.isNaN(now.getTime())) return false;
  return workingDaysBetween(latestPriceDay, tehranDate(now)) > STALE_AFTER_WORKING_DAYS;
}

/** The notice (owner wording, fa; ar the equivalent) and its RFQ link label. */
export const STALE_PRICE_COPY: Record<PriceLocale, { notice: string; cta: string; lead: string; column: string }> = {
  fa: {
    notice: "به‌روزرسانی قیمت‌ها موقتاً متوقف است؛ برای قیمت قطعی استعلام بگیرید",
    cta: "ارسال درخواست استعلام",
    lead: "آخرین قیمت ثبت‌شده",
    column: "آخرین قیمت ثبت‌شده",
  },
  ar: {
    notice: "تحديث الأسعار متوقف مؤقتًا؛ للحصول على السعر النهائي أرسل طلب تسعير",
    cta: "إرسال طلب تسعير",
    lead: "آخر سعر مسجّل",
    column: "آخر سعر مسجّل",
  },
};

/** ar «لـ» before a subject: «للحديد» (ال + ل → لل), «لحديد التسليح». */
function arFor(subject: string): string {
  return subject.startsWith("ال") ? `لل${subject.slice(2)}` : `ل${subject}`;
}

/** The stale H1 of a price page: fa «آخرین قیمت ثبت‌شده میلگرد — ۲۸ مهر ۱۴۰۵»; ar «آخر سعر مسجّل لحديد التسليح — ٢٠ أكتوبر ٢٠٢٦». */
export function staleHeading(locale: PriceLocale, subject: string, date: string): string {
  return locale === "fa" ? `${STALE_PRICE_COPY.fa.lead} ${subject} — ${date}` : `${STALE_PRICE_COPY.ar.lead} ${arFor(subject)} — ${date}`;
}

/** The stale H2 over the full table of `/prices`. */
export const STALE_TABLE_TITLE: Record<PriceLocale, string> = {
  fa: "جدول آخرین قیمت ثبت‌شده همه محصولات",
  ar: "جدول آخر سعر مسجّل لجميع المنتجات",
};
