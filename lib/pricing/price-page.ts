import type { Locale } from "../../config/locales.ts";
import type { PriceBlockData } from "./price-block-presentation.ts";
import { PRICE_LOCALES, type PriceLocale } from "./price-locale.ts";

/**
 * W9.6 — the daily price page (owner-approved 2026-10-09): ONE table of every priced variant of every
 * published product, filterable by product family (the public catalog category) and, on fa, by factory;
 * the date of the latest update; each row links to its product page (`?variant=` highlights the row).
 *
 * Published in fa (`/prices`, fa is unprefixed) and ar (`/ar/prices`) only — en has no price data at
 * all, so there is no /en/prices (it 302s to /en, like an unpublished calculator locale). Same display
 * rules as the product page: fa price + factory + delivery location + VAT included + date; ar price +
 * date + VAT included only. Build-time snapshot data only; never D1, never a live Odoo call.
 */
export const PRICE_PAGE_ROUTE = "/prices";

/**
 * Row attributes the client filter (components/prices/price-table-filter.tsx) reads. Defined here, not in
 * the "use client" module: a server component importing a value from a client module gets a client
 * reference, not the string.
 */
export const PRICE_ROW_FAMILY_ATTRIBUTE = "data-aa-family";
export const PRICE_ROW_FACTORY_ATTRIBUTE = "data-aa-factory";
export const PRICE_PAGE_LOCALES: readonly PriceLocale[] = PRICE_LOCALES;

export function isPricePagePublished(locale: Locale): locale is PriceLocale {
  return (PRICE_PAGE_LOCALES as readonly string[]).includes(locale);
}

/**
 * Header/footer label of the page (fa «قیمت روز» — owner wording; ar «أسعار اليوم»; both approved on PR #35, 2026-10-09).
 */
export const PRICE_NAV_LABEL: Record<PriceLocale, string> = { fa: "قیمت روز", ar: "أسعار اليوم" };

/** Page copy (ar approved on PR #35, 2026-10-09). Arabic letters only on ar (ي ك). */
export const PRICE_PAGE_COPY: Record<
  PriceLocale,
  {
    eyebrow: string;
    title: string;
    body: string;
    metaTitle: string;
    metaDescription: string;
    updated: string;
    caption: string;
    product: string;
    size: string;
    family: string;
    factory: string;
    all: string;
    count: (n: string) => string;
    noMatch: string;
    empty: string;
    emptyCta: string;
    swipe: string;
    /** W16.3 (keyword map §7.2): the dated title/H1/meta of a day with prices; `families` = the hub names that day. */
    metaTitleDated: (date: string, families: string[]) => string;
    metaDescriptionDated: (families: string[]) => string;
    titleDated: (date: string) => string;
    /** W16.3: the H2 sections (§8 item 1): one per family hub, then the full table. */
    familiesTitle: string;
    familyLink: (name: string) => string;
    familyProducts: string;
    tableTitle: string;
    calculator: string;
  }
> = {
  fa: {
    eyebrow: "قیمت روز",
    title: "قیمت روز آهن‌آلات",
    body: "قیمت روز محصولات به تومان برای هر کیلوگرم، همراه با کارخانه و محل تحویل. برای قیمت نهایی سفارش خود استعلام بگیرید.",
    metaTitle: "قیمت روز آهن‌آلات",
    metaDescription: "قیمت روز میلگرد، تیرآهن و دیگر محصولات فولادی به تومان برای هر کیلوگرم، با کارخانه، محل تحویل و تاریخ به‌روزرسانی.",
    updated: "آخرین به‌روزرسانی:",
    caption: "جدول قیمت روز محصولات",
    product: "محصول",
    size: "اندازه",
    family: "خانواده محصول",
    factory: "کارخانه",
    all: "همه",
    count: (n) => `${n} قلم`,
    noMatch: "قلمی با این فیلترها پیدا نشد.",
    empty: "در حال حاضر قیمتی منتشر نشده است. برای قیمت روز استعلام بگیرید.",
    emptyCta: "ارسال درخواست استعلام",
    swipe: "جدول را افقی بکشید",
    metaTitleDated: (d, f) => `قیمت آهن‌آلات امروز ${d}؛ ${f.slice(0, 3).join("، ")}`,
    metaDescriptionDated: (f) => `قیمت امروز ${listFa(f)} به تومان برای هر کیلوگرم، با کارخانه، محل تحویل و ارزش افزوده. برای قیمت نهایی سفارش استعلام بگیرید.`,
    titleDated: (d) => `قیمت روز آهن‌آلات — ${d}`,
    familiesTitle: "قیمت روز به تفکیک گروه کالایی",
    familyLink: (n) => `قیمت روز ${n}`,
    familyProducts: "محصولات این گروه:",
    tableTitle: "جدول قیمت روز همه محصولات",
    calculator: "محاسبه وزن آهن‌آلات",
  },
  ar: {
    eyebrow: "أسعار اليوم",
    title: "أسعار الحديد اليوم",
    body: "أسعار المنتجات اليوم بالتومان لكل كيلوغرام. للحصول على السعر النهائي لطلبك أرسل طلب تسعير.",
    metaTitle: "أسعار الحديد اليوم",
    metaDescription: "أسعار حديد التسليح والجسور وغيرها من منتجات الصلب اليوم بالتومان لكل كيلوغرام، مع تاريخ التحديث.",
    updated: "آخر تحديث:",
    caption: "جدول أسعار المنتجات اليوم",
    product: "المنتج",
    size: "المقاس",
    family: "فئة المنتج",
    factory: "",
    all: "الكل",
    count: (n) => `${n} صنف`,
    noMatch: "لا توجد أصناف بهذه الفلاتر.",
    empty: "لا توجد أسعار منشورة حاليًا. أرسل طلب تسعير للحصول على سعر اليوم.",
    emptyCta: "إرسال طلب تسعير",
    swipe: "اسحب الجدول أفقيًا",
    metaTitleDated: (d) => `أسعار الحديد الإيراني اليوم ${d}`,
    metaDescriptionDated: (f) => `أسعار ${listAr(f)} الإيرانية اليوم بالتومان لكل كيلوغرام، شاملة ضريبة القيمة المضافة. اطلب السعر النهائي لطلبك.`,
    titleDated: (d) => `أسعار الحديد اليوم — ${d}`,
    familiesTitle: "أسعار اليوم حسب فئة المنتج",
    familyLink: (n) => `سعر ${n} اليوم`,
    familyProducts: "منتجات هذه الفئة:",
    tableTitle: "جدول أسعار جميع المنتجات اليوم",
    calculator: "حاسبة وزن الحديد",
  },
};

/** «الف، ب و ج» */
function listFa(items: string[]): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join("، ")} و ${items[items.length - 1]}`;
}
/** «أ وب وج» — Arabic joins every item with و. */
function listAr(items: string[]): string {
  return items.join(" و");
}

export interface PriceTableRow {
  xid: string;
  /** The product page's h1 (the row's link text). */
  productName: string;
  /** `/products/<slug>?variant=<xid>`, locale-less (the page localizes it). */
  productPath: string;
  /** W16.3: the clean `/products/<slug>` (crawlable; robots.txt disallows `/*?`), locale-less. */
  productPagePath: string;
  size: string;
  familyCode: string;
  familyLabel: string;
  /** fa only (the factory filter); null on ar — ar never carries the factory. */
  factory: string | null;
  price: PriceBlockData;
  /** W16.3: the variant's nominal weight per piece (or per metre), already formatted; null when the catalog has none. */
  weight: { label: string; value: string } | null;
}

export interface PriceTableTemplateInput {
  slug: string;
  productName: string;
  /** Variants in display order (sortVariantsBySize). */
  variants: ReadonlyArray<{ xid: string; size: string; groupCode: string | null; /** W9.8: a Form-level category (GALVANIZED_SHEET) claims its Forms out of a shared group. */ formCode?: string | null; familyName: string | null; weight?: { label: string; value: string } | null }>;
}

export interface FamilyResolver {
  (groupCode: string | null, familyName: string | null, formCode?: string | null): { code: string; label: string; position: number };
}

/**
 * Rows of the price table: every variant of `templates` that has an (eligible) price, grouped by family
 * in catalog order, then the template order, then size order. Pure.
 */
export function buildPriceTableRows(locale: PriceLocale, templates: readonly PriceTableTemplateInput[], prices: ReadonlyMap<string, PriceBlockData>, family: FamilyResolver): PriceTableRow[] {
  const rows: Array<PriceTableRow & { position: number; order: number }> = [];
  let order = 0;
  for (const t of templates) {
    for (const v of t.variants) {
      const price = prices.get(v.xid);
      if (!price) continue;
      const f = family(v.groupCode, v.familyName, v.formCode ?? null);
      rows.push({
        xid: v.xid,
        productName: t.productName,
        productPath: `/products/${t.slug}?variant=${encodeURIComponent(v.xid)}`,
        productPagePath: `/products/${t.slug}`,
        size: v.size,
        familyCode: f.code,
        familyLabel: f.label,
        factory: locale === "fa" ? price.factoryName : null,
        price,
        weight: v.weight ?? null,
        position: f.position,
        order: order++,
      });
    }
  }
  rows.sort((a, b) => a.position - b.position || a.order - b.order);
  return rows.map(({ position: _p, order: _o, ...row }) => row);
}

/** Options of the price page filter. `factoriesByFamily`: per family, the factories with rows of it (table order). */
export interface PriceFilterOptions {
  families: { value: string; label: string }[];
  factories: string[];
  factoriesByFamily: Record<string, string[]>;
}

/** Filter options, in first-seen (table) order, without duplicates. */
export function filterOptions(rows: readonly PriceTableRow[]): PriceFilterOptions {
  const families = new Map<string, string>();
  const factories = new Set<string>();
  const byFamily = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!families.has(r.familyCode)) families.set(r.familyCode, r.familyLabel);
    const familyFactories = byFamily.get(r.familyCode) ?? byFamily.set(r.familyCode, new Set()).get(r.familyCode)!;
    if (r.factory) {
      factories.add(r.factory);
      familyFactories.add(r.factory);
    }
  }
  return {
    families: [...families].map(([value, label]) => ({ value, label })),
    factories: [...factories],
    factoriesByFamily: Object.fromEntries([...byFamily].map(([code, set]) => [code, [...set]])),
  };
}

/** The price page filter's state; "" = همه / all. */
export interface PriceFilterState {
  family: string;
  factory: string;
}

/** W17.1 — the factories the factory select offers: all of them for no family, else only those with rows of that family. */
export function factoriesForFamily(options: PriceFilterOptions, family: string): string[] {
  return family ? (options.factoriesByFamily[family] ?? []) : options.factories;
}

/** A valid state: an unknown family becomes all, and a factory with no rows of the chosen family is reset to all. */
export function reconcilePriceFilter(options: PriceFilterOptions, state: PriceFilterState): PriceFilterState {
  const family = options.families.some((f) => f.value === state.family) ? state.family : "";
  const factory = factoriesForFamily(options, family).includes(state.factory) ? state.factory : "";
  return { family, factory };
}

/** Query keys of the filter (`/prices?family=REBAR&factory=…`). robots.txt disallows `/*?`, so these never index. */
export const PRICE_FILTER_QUERY = { family: "family", factory: "factory" } as const;

/** The filter state a `location.search` asks for, reconciled (a stale or hand-edited link falls back to all). */
export function parsePriceFilterQuery(search: string, options: PriceFilterOptions): PriceFilterState {
  const q = new URLSearchParams(search);
  return reconcilePriceFilter(options, { family: q.get(PRICE_FILTER_QUERY.family) ?? "", factory: q.get(PRICE_FILTER_QUERY.factory) ?? "" });
}

/** `search` with the filter keys written from `state` (all = key removed), other keys kept; "" or "?…". */
export function priceFilterSearch(search: string, state: PriceFilterState): string {
  const q = new URLSearchParams(search);
  for (const key of ["family", "factory"] as const) {
    if (state[key]) q.set(PRICE_FILTER_QUERY[key], state[key]);
    else q.delete(PRICE_FILTER_QUERY[key]);
  }
  const out = q.toString();
  return out ? `?${out}` : "";
}

/** The newest price time of the table (the page's «آخرین به‌روزرسانی»), or null when empty. */
export function latestPricedAt(rows: readonly PriceTableRow[]): string | null {
  return rows.reduce<string | null>((max, r) => (max === null || r.price.pricedAt > max ? r.price.pricedAt : max), null);
}
