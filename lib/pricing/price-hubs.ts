import { PRICE_PAGE_ROUTE, type PriceTableRow } from "./price-page.ts";
import type { PriceLocale } from "./price-locale.ts";
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
  /** `<title>` body, before the layout's brand suffix. */
  title: (date: string) => string;
  h1: (date: string) => string;
  metaDescription: string;
}

/**
 * Per-family copy (keyword map §7.2). ar: Arabic letters only (ي ك), the Iraqi trade words of §3.5
 * (الشيش، الشيلمان، الصاج) next to the formal term, and never a factory or a delivery location.
 */
export const PRICE_HUB_FAMILY_COPY: Record<PriceHubCategoryCode, Record<PriceLocale, HubFamilyCopy>> = {
  REBAR: {
    fa: {
      name: "میلگرد",
      title: (d) => `قیمت میلگرد امروز ${d}؛ آجدار و ساده`,
      h1: (d) => `قیمت روز میلگرد — ${d}`,
      metaDescription: "قیمت امروز میلگرد آجدار و ساده به تفکیک سایز و کارخانه، به تومان برای هر کیلوگرم، با محل تحویل، وزن هر شاخه و ارزش افزوده. استعلام قیمت نهایی.",
    },
    ar: {
      name: "حديد التسليح",
      title: (d) => `سعر حديد التسليح الإيراني اليوم ${d}`,
      h1: (d) => `سعر حديد التسليح (الشيش) اليوم — ${d}`,
      metaDescription: "سعر حديد التسليح (الشيش) الإيراني اليوم حسب المقاس، بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة، مع وزن كل قضيب. اطلب السعر النهائي لطلبك.",
    },
  },
  BEAM: {
    fa: {
      name: "تیرآهن",
      title: (d) => `قیمت تیرآهن امروز ${d}`,
      h1: (d) => `قیمت روز تیرآهن — ${d}`,
      metaDescription: "قیمت امروز تیرآهن به تفکیک سایز و کارخانه، به تومان برای هر کیلوگرم، با محل تحویل و وزن هر شاخه. استعلام قیمت نهایی تیرآهن.",
    },
    ar: {
      name: "الشيلمان",
      title: (d) => `سعر الشيلمان الإيراني اليوم ${d}`,
      h1: (d) => `سعر الشيلمان (الكمرات) اليوم — ${d}`,
      metaDescription: "سعر الشيلمان (كمرات IPE) الإيراني اليوم حسب المقاس، بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة، مع وزن كل قطعة. اطلب السعر النهائي.",
    },
  },
  ANGLE: {
    fa: {
      name: "نبشی",
      title: (d) => `قیمت نبشی امروز ${d}`,
      h1: (d) => `قیمت روز نبشی — ${d}`,
      metaDescription: "قیمت امروز نبشی مساوی به تفکیک سایز و کارخانه، به تومان برای هر کیلوگرم، با محل تحویل و وزن. استعلام قیمت نهایی نبشی.",
    },
    ar: {
      name: "الزوايا",
      title: (d) => `سعر الزاوية الحديد اليوم ${d}`,
      h1: (d) => `سعر الزوايا الحديد اليوم — ${d}`,
      metaDescription: "سعر الزاوية الحديد الإيرانية اليوم حسب المقاس، بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة. اطلب السعر النهائي لطلبك.",
    },
  },
  CHANNEL: {
    fa: {
      name: "ناودانی",
      title: (d) => `قیمت ناودانی امروز ${d}`,
      h1: (d) => `قیمت روز ناودانی — ${d}`,
      metaDescription: "قیمت امروز ناودانی به تفکیک سایز و کارخانه، به تومان برای هر کیلوگرم، با محل تحویل و وزن. استعلام قیمت نهایی ناودانی.",
    },
    ar: {
      name: "المجاري",
      title: (d) => `سعر المجاري الحديد اليوم ${d}`,
      h1: (d) => `سعر المجاري الحديد اليوم — ${d}`,
      metaDescription: "سعر المجاري الحديد الإيرانية اليوم حسب المقاس، بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة. اطلب السعر النهائي لطلبك.",
    },
  },
  BOX_SECTION: {
    fa: {
      name: "قوطی و پروفیل",
      title: (d) => `قیمت قوطی و پروفیل امروز ${d}`,
      h1: (d) => `قیمت روز قوطی و پروفیل — ${d}`,
      metaDescription: "قیمت امروز قوطی مربع و مستطیل (SHS و RHS) به تفکیک سایز، ضخامت و کارخانه، به تومان برای هر کیلوگرم، با وزن هر شاخه.",
    },
    ar: {
      name: "الحديد المربع والمستطيل",
      title: (d) => `سعر الحديد المربع الإيراني اليوم ${d}`,
      h1: (d) => `سعر الحديد المربع والمستطيل اليوم — ${d}`,
      metaDescription: "سعر الحديد المربع والمستطيل (العلب) الإيراني اليوم حسب المقاس والسماكة، بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة.",
    },
  },
  SHEET_PLATE: {
    fa: {
      name: "ورق",
      title: (d) => `قیمت ورق سیاه امروز ${d}؛ ST37 و ST52`,
      h1: (d) => `قیمت روز ورق — ${d}`,
      metaDescription: "قیمت امروز ورق سیاه گرم‌نورد و ورق ضخیم S235JR و S355JR به تفکیک ضخامت و کارخانه، به تومان برای هر کیلوگرم، با وزن هر ورق.",
    },
    ar: {
      name: "الصاج",
      title: (d) => `سعر الصاج الإيراني اليوم ${d}`,
      h1: (d) => `سعر الصاج والألواح اليوم — ${d}`,
      metaDescription: "سعر الصاج والألواح الفولاذية الإيرانية S235JR وS355JR اليوم حسب السماكة، بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة، مع وزن كل لوح.",
    },
  },
  PIPE: {
    fa: {
      name: "لوله مانیسمان",
      title: (d) => `قیمت لوله مانیسمان امروز ${d}`,
      h1: (d) => `قیمت روز لوله مانیسمان — ${d}`,
      metaDescription: "قیمت امروز لوله بدون درز (مانیسمان) به تفکیک سایز و کارخانه، به تومان برای هر کیلوگرم، با محل تحویل و وزن هر شاخه.",
    },
    ar: {
      name: "الأنابيب غير الملحومة",
      title: (d) => `سعر الأنابيب غير الملحومة اليوم ${d}`,
      h1: (d) => `سعر الأنابيب غير الملحومة اليوم — ${d}`,
      metaDescription: "سعر الأنابيب الفولاذية غير الملحومة الإيرانية اليوم حسب المقاس، بالتومان لكل كيلوغرام شاملًا ضريبة القيمة المضافة.",
    },
  },
};

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
