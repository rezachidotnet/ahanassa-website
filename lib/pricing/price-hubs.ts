import { PRICE_PAGE_ROUTE, type PriceTableRow } from "./price-page.ts";
import type { PriceLocale } from "./price-locale.ts";
import { arPriceDescription, datedHeading, datedTitleBodies, faPriceDescription, fitTitle, type PriceDay } from "./price-titles.ts";
import { staleHeading } from "./price-staleness.ts";
import { compareCommercialSize } from "../catalog/specification-presenter.ts";

/**
 * W16.3 (D-SEO, docs/seo/keyword-map.md §6 P1-1, §7.2) — the family price hubs `/prices/<family>`: the rows
 * of ONE public catalog category from the same build-time snapshot as `/prices`, grouped by size (an H3 with
 * an `id` per size) and, on fa only, by mill (an H2 per factory that has rows that day). fa and ar only (en
 * has no price data); ar never names a factory or a delivery location, so it has no mill sections.
 *
 * A family with zero priced rows in a locale's snapshot is not published that day (no empty hub): the route's
 * generateStaticParams, the sitemap, `/prices` and every link to a hub use `publishedHubFamilies`. Pure.
 */

/** Hub path of a public catalog category code (`BOX_SECTION` → `/prices/box-section`), locale-less. */
export function priceHubPath(categoryCode: string): string {
  return `${PRICE_PAGE_ROUTE}/${priceHubSegment(categoryCode)}`;
}

/** Same rule as the category listing segment (lib/catalog/public-categories.ts#categoryPathSegment). */
export function priceHubSegment(categoryCode: string): string {
  return categoryCode.toLowerCase().replace(/_/g, "-");
}

/**
 * The categories a hub may exist for: the ones with hub copy below. A category Odoo adds later gets a hub
 * only once its copy is written here (no generated text on a public page).
 */
export const PRICE_HUB_CATEGORY_CODES = ["REBAR", "BEAM", "ANGLE", "CHANNEL", "BOX_SECTION", "SHEET_PLATE", "PIPE"] as const;
export type PriceHubCategoryCode = (typeof PRICE_HUB_CATEGORY_CODES)[number];
export const isPriceHubCategory = (code: string): code is PriceHubCategoryCode => (PRICE_HUB_CATEGORY_CODES as readonly string[]).includes(code);

/** The hub families of a locale's price rows, in table (catalog) order: every hub category that has ≥ 1 row. */
export function publishedHubFamilies(rows: readonly Pick<PriceTableRow, "familyCode">[]): PriceHubCategoryCode[] {
  const seen: PriceHubCategoryCode[] = [];
  for (const r of rows) if (isPriceHubCategory(r.familyCode) && !seen.includes(r.familyCode)) seen.push(r.familyCode);
  return seen;
}

/**
 * Order of the family names in the `/prices` title and meta (keyword map §3.1 demand: «قیمت میلگرد», «قیمت
 * تیرآهن», «قیمت ورق» lead), not the catalog order the page sections use.
 */
const TITLE_ORDER: readonly PriceHubCategoryCode[] = ["REBAR", "BEAM", "SHEET_PLATE", "BOX_SECTION", "ANGLE", "CHANNEL", "PIPE"];
export function byTitleDemand(families: readonly PriceHubCategoryCode[]): PriceHubCategoryCode[] {
  return [...families].sort((a, b) => TITLE_ORDER.indexOf(a) - TITLE_ORDER.indexOf(b));
}

/** Anchor id of a size section: «Ø16» → `size-16`, «IPE 140» → `size-ipe-140`, «10×1500×6000» → `size-10x1500x6000`. */
export function sizeAnchorId(size: string): string {
  const slug = size
    .toLowerCase()
    .replace(/ø/g, "")
    .replace(/[×*]/g, "x")
    .replace(/[^a-z0-9.x]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `size-${slug || "other"}`;
}

/** Anchor id of a fa mill section (the factory name; ids may hold any non-space character). */
export function millAnchorId(factory: string): string {
  return `mill-${factory.trim().replace(/\s+/g, "-")}`;
}

export interface HubGroup<T> {
  key: string;
  id: string;
  rows: T[];
}

/** Rows grouped by size, in natural size order (Ø8 < Ø10, IPE 80 < IPE 100); each group keeps the table order. */
export function groupBySize<T extends Pick<PriceTableRow, "size">>(rows: readonly T[]): HubGroup<T>[] {
  return groupBy(rows, (r) => r.size, sizeAnchorId).sort((a, b) => compareCommercialSize(a.key, b.key));
}

/** fa rows grouped by factory, in first-seen order; rows without a factory (ar) are left out. */
export function groupByMill<T extends Pick<PriceTableRow, "factory">>(rows: readonly T[]): HubGroup<T>[] {
  return groupBy(
    rows.filter((r) => r.factory),
    (r) => r.factory!,
    millAnchorId,
  );
}

function groupBy<T>(rows: readonly T[], keyOf: (row: T) => string, idOf: (key: string) => string): HubGroup<T>[] {
  const groups = new Map<string, HubGroup<T>>();
  const ids = new Set<string>();
  for (const row of rows) {
    const key = keyOf(row);
    let group = groups.get(key);
    if (!group) {
      // Two keys with the same slug (e.g. «IPE 140» and «ipe-140») get distinct ids.
      let id = idOf(key);
      for (let n = 2; ids.has(id); n++) id = `${idOf(key)}-${n}`;
      ids.add(id);
      groups.set(key, (group = { key, id, rows: [] }));
    }
    group.rows.push(row);
  }
  return [...groups.values()];
}

interface HubFamilyCopy {
  /** The family name inside headings and anchors («میلگرد», «حديد التسليح»). */
  name: string;
  /** W16.8: the `<title>` subject after «قیمت» / «سعر» («ورق سیاه», «حديد التسليح الإيراني»). */
  titleSubject: string;
  /** W16.8: fa title tail after «؛», dropped first when the title is too long; null = none. */
  titleTail: string | null;
  /** W16.8: the H1 subject («قیمت امروز {h1Subject} — {date}»). */
  h1Subject: string;
  /** W16.8: meta description subject; fa with how the prices are split («… به تفکیک سایز»). */
  metaWhat: string;
  /** W16.8: ar meta, how the prices are split («حسب المقاس»); "" on fa (inside metaWhat). */
  metaBy: string;
  /** W16.8: fa meta, the weight the table shows («وزن هر شاخه»); null on ar. */
  weight: string | null;
}

/**
 * Per-family copy (keyword map §7.2). ar: Arabic letters only (ي ك), the Iraqi trade words of §3.5
 * (الشيش، الشيلمان، الصاج) next to the formal term, and never a factory or a delivery location. The dated
 * title, H1 and meta are built by hubTitle / hubHeading / hubDescription (lib/pricing/price-titles.ts).
 */
export const PRICE_HUB_FAMILY_COPY: Record<PriceHubCategoryCode, Record<PriceLocale, HubFamilyCopy>> = {
  REBAR: {
    fa: { name: "میلگرد", titleSubject: "میلگرد", titleTail: "آجدار و ساده", h1Subject: "میلگرد", metaWhat: "میلگرد آجدار و ساده به تفکیک سایز", metaBy: "", weight: "وزن هر شاخه" },
    ar: { name: "حديد التسليح", titleSubject: "حديد التسليح الإيراني", titleTail: null, h1Subject: "حديد التسليح (الشيش)", metaWhat: "حديد التسليح (الشيش) الإيراني", metaBy: "حسب المقاس", weight: null },
  },
  BEAM: {
    fa: { name: "تیرآهن", titleSubject: "تیرآهن", titleTail: null, h1Subject: "تیرآهن", metaWhat: "تیرآهن به تفکیک سایز", metaBy: "", weight: "وزن هر شاخه" },
    ar: { name: "الشيلمان", titleSubject: "الشيلمان الإيراني", titleTail: null, h1Subject: "الشيلمان (الكمرات)", metaWhat: "الشيلمان (كمرات IPE) الإيراني", metaBy: "حسب المقاس", weight: null },
  },
  ANGLE: {
    fa: { name: "نبشی", titleSubject: "نبشی", titleTail: null, h1Subject: "نبشی", metaWhat: "نبشی مساوی به تفکیک سایز", metaBy: "", weight: "وزن هر شاخه" },
    ar: { name: "الزوايا", titleSubject: "الزاوية الحديد", titleTail: null, h1Subject: "الزوايا الحديد", metaWhat: "الزاوية الحديد الإيرانية", metaBy: "حسب المقاس", weight: null },
  },
  CHANNEL: {
    fa: { name: "ناودانی", titleSubject: "ناودانی", titleTail: null, h1Subject: "ناودانی", metaWhat: "ناودانی به تفکیک سایز", metaBy: "", weight: "وزن هر شاخه" },
    ar: { name: "المجاري", titleSubject: "المجاري الحديد", titleTail: null, h1Subject: "المجاري الحديد", metaWhat: "المجاري الحديد الإيرانية", metaBy: "حسب المقاس", weight: null },
  },
  BOX_SECTION: {
    fa: { name: "قوطی و پروفیل", titleSubject: "قوطی و پروفیل", titleTail: null, h1Subject: "قوطی و پروفیل", metaWhat: "قوطی مربع و مستطیل به تفکیک سایز و ضخامت", metaBy: "", weight: "وزن هر شاخه" },
    ar: { name: "الحديد المربع والمستطيل", titleSubject: "الحديد المربع الإيراني", titleTail: null, h1Subject: "الحديد المربع والمستطيل", metaWhat: "الحديد المربع والمستطيل الإيراني", metaBy: "حسب المقاس والسماكة", weight: null },
  },
  SHEET_PLATE: {
    fa: { name: "ورق", titleSubject: "ورق سیاه", titleTail: "ST37 و ST52", h1Subject: "ورق", metaWhat: "ورق سیاه و ورق ضخیم به تفکیک ضخامت", metaBy: "", weight: "وزن هر ورق" },
    ar: { name: "الصاج", titleSubject: "الصاج الإيراني", titleTail: null, h1Subject: "الصاج والألواح", metaWhat: "الصاج والألواح الفولاذية الإيرانية", metaBy: "حسب السماكة", weight: null },
  },
  PIPE: {
    fa: { name: "لوله مانیسمان", titleSubject: "لوله مانیسمان", titleTail: null, h1Subject: "لوله مانیسمان", metaWhat: "لوله بدون درز (مانیسمان) به تفکیک سایز", metaBy: "", weight: "وزن هر شاخه" },
    ar: { name: "الأنابيب غير الملحومة", titleSubject: "الأنابيب غير الملحومة", titleTail: null, h1Subject: "الأنابيب غير الملحومة", metaWhat: "الأنابيب غير الملحومة الإيرانية", metaBy: "حسب المقاس", weight: null },
  },
};

const PRICE_LEAD: Record<PriceLocale, string> = { fa: "قیمت", ar: "سعر" };

/** W16.8: a hub's full `<title>` (titleAbsolute): «قیمت میلگرد امروز ۲۸ مهر ۱۴۰۵؛ آجدار و ساده | آهن آسا», ≤ 60. */
export function hubTitle(locale: PriceLocale, family: PriceHubCategoryCode, day: PriceDay): string {
  const c = PRICE_HUB_FAMILY_COPY[family][locale];
  return fitTitle(locale, datedTitleBodies(locale, `${PRICE_LEAD[locale]} ${c.titleSubject}`, day, c.titleTail ? [c.titleTail] : []));
}

/** W16.8: a hub's H1: «قیمت امروز میلگرد — ۲۸ مهر ۱۴۰۵» / «قیمت میلگرد — به‌روزرسانی ۲۶ مهر ۱۴۰۵». */
export function hubHeading(locale: PriceLocale, family: PriceHubCategoryCode, day: PriceDay): string {
  return datedHeading(locale, PRICE_LEAD[locale], PRICE_HUB_FAMILY_COPY[family][locale].h1Subject, day);
}

/** W31: a hub H1 while the price data is stale: «آخرین قیمت ثبت‌شده میلگرد — …» / «آخر سعر مسجّل لحديد التسليح (الشيش) — …». */
export function hubStaleHeading(locale: PriceLocale, family: PriceHubCategoryCode, day: PriceDay): string {
  return staleHeading(locale, PRICE_HUB_FAMILY_COPY[family][locale].h1Subject, day.date);
}

/** W16.8: a hub's meta description (≤ 155, no amount): the date and what the page shows. */
export function hubDescription(locale: PriceLocale, family: PriceHubCategoryCode, day: PriceDay, rows: readonly { price: { previousPricedAt?: string | null }; weight: unknown }[]): string {
  const c = PRICE_HUB_FAMILY_COPY[family][locale];
  if (locale === "ar") return arPriceDescription(day, PRICE_LEAD.ar, c.metaWhat, c.metaBy);
  return faPriceDescription(day, { what: c.metaWhat, change: rows.some((r) => Boolean(r.price.previousPricedAt)), weight: rows.some((r) => r.weight) ? c.weight : null });
}

interface HubPageCopy {
  eyebrow: string;
  intro: (name: string) => string;
  bySize: (name: string) => string;
  sizeHeading: (name: string, size: string) => string;
  byMill: (name: string) => string;
  millHeading: (name: string, factory: string) => string;
  product: string;
  size: string;
  weight: string;
  links: string;
  allPrices: string;
  calculator: (name: string) => string;
  category: (name: string) => string;
  cta: string;
  faqTitle: string;
  faq: (name: string) => { q: string; a: string }[];
  swipe: string;
}

/**
 * The text around the table. Claims only what the page and the snapshot show: prices per kg with the
 * disclaimer's VAT note (PRICE_DISCLAIMER), the date of each price, and that the final price follows a
 * reviewed request. No forecast, no stock or delivery promise.
 */
export const PRICE_HUB_PAGE_COPY: Record<PriceLocale, HubPageCopy> = {
  fa: {
    eyebrow: "قیمت روز",
    intro: (n) =>
      `این صفحه قیمت امروز ${n} را به تومان برای هر کیلوگرم نشان می‌دهد: یک بار بر اساس سایز و یک بار بر اساس کارخانه، با محل تحویل و تاریخ هر قیمت. هر ردیف به صفحه محصول پیوند دارد که مشخصات فنی، استاندارد و وزن اسمی همه سایزها را نشان می‌دهد. قیمت جدول قیمت روز همان کارخانه و محل تحویل است؛ قیمت نهایی سفارش شما پس از بررسی لیست خرید، بر اساس مقدار، زمان سفارش و محل تحویل اعلام می‌شود.`,
    bySize: (n) => `قیمت ${n} بر اساس سایز`,
    sizeHeading: (n, s) => `قیمت ${n} ${s}`,
    byMill: (n) => `قیمت ${n} بر اساس کارخانه`,
    millHeading: (n, f) => `قیمت ${n} ${f}`,
    product: "محصول",
    size: "اندازه",
    weight: "وزن اسمی",
    links: "صفحه‌های مرتبط",
    allPrices: "قیمت روز همه آهن‌آلات",
    calculator: (n) => `محاسبه وزن ${n}`,
    category: (n) => `مشخصات و سایزهای ${n}`,
    cta: "ارسال لیست خرید",
    faqTitle: "پرسش‌های رایج",
    faq: (n) => [
      { q: `آیا قیمت این جدول، قیمت نهایی خرید ${n} است؟`, a: `خیر. هر قیمت، قیمت روز هر کیلوگرم برای همان کارخانه و محل تحویل است. قیمت نهایی سفارش به مقدار، سایزها، زمان سفارش و محل تحویل بستگی دارد و پس از بررسی لیست خرید شما اعلام می‌شود.` },
      { q: `قیمت ${n} چه زمانی به‌روز می‌شود؟`, a: "تاریخ هر قیمت کنار همان قیمت و تاریخ آخرین به‌روزرسانی بالای صفحه آمده است. صفحه با هر انتشار قیمت جدید دوباره ساخته می‌شود." },
      { q: `وزن هر شاخه ${n} را کجا ببینم؟`, a: "وزن اسمی هر سایز در جدول همین صفحه و جدول کامل وزن‌ها در صفحه هر محصول آمده است. وزن کل سفارش را با محاسبه‌گر وزن آهن‌آلات حساب کنید. وزن اسمی با وزن باسکول برابر نیست." },
      { q: `چطور ${n} بخرم؟`, a: "لیست خرید یا فاکتور خود را با سایز، مقدار و محل تحویل بفرستید. کارشناسان آهن آسا مشخصات و گزینه‌های تأمین را بررسی می‌کنند و پیشنهاد خرید می‌دهند." },
    ],
    swipe: "جدول را افقی بکشید",
  },
  ar: {
    eyebrow: "أسعار اليوم",
    intro: (n) =>
      `تعرض هذه الصفحة سعر ${n} اليوم بالتومان لكل كيلوغرام حسب المقاس، مع تاريخ كل سعر. كل صف مرتبط بصفحة المنتج التي تعرض المواصفات الفنية والمعيار والوزن الاسمي لجميع المقاسات. السعر النهائي لطلبك يُحدَّد بعد مراجعة قائمة الشراء حسب الكمية ووقت الطلب ومكان التسليم.`,
    bySize: (n) => `سعر ${n} حسب المقاس`,
    sizeHeading: (n, s) => `سعر ${n} ${s}`,
    byMill: () => "",
    millHeading: () => "",
    product: "المنتج",
    size: "المقاس",
    weight: "الوزن الاسمي",
    links: "صفحات ذات صلة",
    allPrices: "أسعار الحديد اليوم",
    calculator: (n) => `حساب وزن ${n}`,
    category: (n) => `مواصفات ومقاسات ${n}`,
    cta: "إرسال قائمة الشراء",
    faqTitle: "أسئلة شائعة",
    faq: (n) => [
      { q: `هل سعر هذا الجدول هو السعر النهائي لشراء ${n}؟`, a: "لا. السعر المعروض هو سعر اليوم لكل كيلوغرام. يعتمد السعر النهائي على الكمية والمقاسات ووقت الطلب ومكان التسليم، ويُرسَل بعد مراجعة قائمة الشراء." },
      { q: `متى يُحدَّث سعر ${n}؟`, a: "يظهر تاريخ كل سعر بجانبه وتاريخ آخر تحديث أعلى الصفحة. يُعاد بناء الصفحة مع كل نشر لأسعار جديدة." },
      { q: `أين أجد وزن ${n}؟`, a: "الوزن الاسمي لكل مقاس في جدول هذه الصفحة، والجدول الكامل في صفحة كل منتج. احسب وزن الطلب كاملًا بحاسبة وزن الحديد. الوزن الاسمي لا يساوي وزن الميزان." },
      { q: `كيف أشتري ${n}؟`, a: "أرسل قائمة الشراء أو الفاتورة مع المقاس والكمية ومكان التسليم، ويراجع فريق آهن آسا المواصفات وخيارات التوريد ويرسل عرض الشراء." },
    ],
    swipe: "اسحب الجدول أفقيًا",
  },
};
