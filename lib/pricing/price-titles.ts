import { titleBrand } from "../metadata/site.ts";
import { tehranDay } from "./price-history.ts";
import { priceDateLabel, type PriceLocale } from "./price-locale.ts";

/**
 * W16.8 (SEO/CTR, keyword map §7.2) — the dated `<title>`, og:title, meta description and H1 of the price
 * pages: fa/ar `/prices`, fa/ar `/prices/<family>`, the fa chart pages and fa product pages with a price.
 *
 * The date is always a PRICE's date (Tehran calendar; fa Persian calendar and digits, ar Gregorian with
 * Arabic-Indic digits), never the build time. «امروز» / «اليوم» is said only when that price is from the
 * snapshot's own day: the Tehran day the content pipeline fetched the data from Odoo (snapshot
 * `source.fetched_at`). A family whose newest price is older says «به‌روزرسانی {date}» / «تحديث {date}»
 * instead. No amount ever goes into a title or a description (owner rule: no «از … تومان»). Pure.
 */

/** Title budget, brand included (characters = code points, ZWNJ counted). */
export const TITLE_MAX = 60;
/** Meta description budget. */
export const DESCRIPTION_MAX = 155;

export const textLength = (s: string): number => [...s].length;

/** The first candidate within `max` characters; the shortest one when none fits. */
export function fitText(max: number, candidates: readonly string[]): string {
  const fit = candidates.find((c) => textLength(c) <= max);
  return fit ?? [...candidates].sort((a, b) => textLength(a) - textLength(b))[0];
}

/**
 * The full `<title>` (passed with `titleAbsolute`): the most complete body with « | <brand>», then that body
 * without the brand, then the next shorter body, and so on (owner: shorten the brand part first).
 */
export function fitTitle(locale: PriceLocale, bodies: readonly string[]): string {
  return fitText(
    TITLE_MAX,
    bodies.flatMap((b) => [`${b} | ${titleBrand(locale)}`, b]),
  );
}

export interface PriceDay {
  /** The price time (ISO), for the sitemap and machine dates. */
  at: string;
  /** «۲۸ مهر ۱۴۰۵» / «٢٠ أكتوبر ٢٠٢٦». */
  date: string;
  /** True when the price is from the snapshot's day: the copy may say «امروز» / «اليوم». */
  today: boolean;
}

/**
 * The date of a page's newest price and whether it is «today». `referenceAt` is the snapshot's fetch time;
 * null (a snapshot without one) counts every price as today, the pre-W16.8 behavior. A price newer than the
 * reference (only possible in synthetic fixtures) is today.
 */
export function priceDay(locale: PriceLocale, pricedAt: string, referenceAt: string | null): PriceDay {
  const day = tehranDay(pricedAt);
  const reference = referenceAt ? tehranDay(referenceAt) : null;
  return { at: pricedAt, date: priceDateLabel(locale, pricedAt), today: reference === null || day === null || day >= reference };
}

/** «الف، ب و ج» */
export function listFa(items: readonly string[]): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join("، ")} و ${items[items.length - 1]}`;
}
/** «أ وب وج» — Arabic joins every item with و. */
export function listAr(items: readonly string[]): string {
  return items.join(" و");
}

/**
 * A dated title body: fa «قیمت میلگرد امروز ۲۸ مهر ۱۴۰۵» (+ «؛ tail» when given) or «قیمت میلگرد — به‌روزرسانی
 * ۲۶ مهر ۱۴۰۵»; ar «سعر حديد التسليح الإيراني اليوم ٢٠ أكتوبر ٢٠٢٦» or «… — تحديث ١٨ أكتوبر ٢٠٢٦». Returns the
 * bodies longest first (with each tail, then none) for fitTitle.
 */
export function datedTitleBodies(locale: PriceLocale, subject: string, day: PriceDay, tails: readonly string[] = []): string[] {
  const base =
    locale === "fa" ? (day.today ? `${subject} امروز ${day.date}` : `${subject} — به‌روزرسانی ${day.date}`) : day.today ? `${subject} اليوم ${day.date}` : `${subject} — تحديث ${day.date}`;
  return [...tails.map((t) => `${base}؛ ${t}`), base];
}

/** The dated H1: fa «قیمت امروز میلگرد — ۲۸ مهر ۱۴۰۵» / «قیمت میلگرد — به‌روزرسانی …»; ar «سعر … اليوم — …» / «سعر … — تحديث …». */
export function datedHeading(locale: PriceLocale, lead: string, subject: string, day: PriceDay): string {
  if (locale === "fa") return day.today ? `${lead} امروز ${subject} — ${day.date}` : `${lead} ${subject} — به‌روزرسانی ${day.date}`;
  return day.today ? `${lead} ${subject} اليوم — ${day.date}` : `${lead} ${subject} — تحديث ${day.date}`;
}

/** What a fa price page shows besides the price, for its meta description. */
export interface FaPagePrices {
  /** «میلگرد آجدار و ساده به تفکیک سایز و کارخانه» — what the prices are of, and how they are split. */
  what: string;
  /** At least one price shows ▲/▼ against the previous day. */
  change: boolean;
  /** «وزن هر شاخه» when the page shows a weight, else null. */
  weight: string | null;
}

/**
 * fa meta description (≤ 155): date + what the page has + «استعلام». Fresh «قیمت امروز {what}، {date}، …»;
 * stale «آخرین قیمت {what}، به‌روزرسانی {date}، …». Optional clauses drop (weight, then the change) when long.
 */
export function faPriceDescription(day: PriceDay, page: FaPagePrices): string {
  const lead = day.today ? `قیمت امروز ${page.what}، ${day.date}` : `آخرین قیمت ${page.what}، به‌روزرسانی ${day.date}`;
  const variants = (features: string[]) => `${lead}، به تومان برای هر کیلوگرم؛ با ${listFa(features)}. استعلام قیمت نهایی.`;
  // Every fa price table names the factory and the delivery location of each price.
  const base = ["کارخانه‌ها", "محل تحویل"];
  const change = page.change ? ["تغییر نسبت به روز قبل"] : [];
  const weight = page.weight ? [page.weight] : [];
  return fitText(DESCRIPTION_MAX, [variants([...base, ...change, ...weight]), variants([...base, ...change]), variants(base)]);
}

/**
 * ar meta description (≤ 155; ar rules: price + date only — never a factory, a location or a change): fresh
 * «سعر {what} اليوم، {date}، {by} بالتومان …»; stale «… — آخر تحديث {date}، …».
 */
export function arPriceDescription(day: PriceDay, lead: string, what: string, by: string): string {
  const when = day.today ? `اليوم، ${day.date}،` : `— آخر تحديث ${day.date}،`;
  return fitText(DESCRIPTION_MAX, [
    `${lead} ${what} ${when} ${by} بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة. اطلب السعر النهائي لطلبك.`,
    `${lead} ${what} ${when} ${by} بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة. اطلب السعر النهائي.`,
    `${lead} ${what} ${when} ${by} بالتومان لكل كيلوغرام. اطلب السعر النهائي لطلبك.`,
  ]);
}

/**
 * fa product page title (W16.8): «{seo title} — قیمت امروز {date} | آهن آسا» when the product has a published
 * price, the brand dropped first and the plain «{seo title} | آهن آسا» kept when the date does not fit.
 * A stale price says «— قیمت {date}» (no «امروز»).
 */
export function faProductPriceTitle(base: string, day: PriceDay): string {
  const dated = day.today ? `${base} — قیمت امروز ${day.date}` : `${base} — قیمت ${day.date}`;
  const brand = titleBrand("fa");
  return fitText(TITLE_MAX, [`${dated} | ${brand}`, dated, `${base} | ${brand}`]);
}
