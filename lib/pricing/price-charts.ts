import { addDays } from "../charts/line-geometry.ts";
import { formatPersianDate } from "./price-block-presentation.ts";
import { PRICE_BLOCK_COPY } from "./price-block-presentation.ts";
import { formatTomanAmount } from "./product-page-price.ts";
import { POSITION_MIN_POINTS, priceWindows, windowPoints, type PositionWindow, type PricePosition, type WindowStats } from "./price-position.ts";
import type { DailyPoint } from "./price-history.ts";
import { PRICE_HUB_CATEGORY_CODES } from "./price-hubs.ts";

/**
 * W18.2 — the fa decision block (product pages) and the fa chart pages «نمودار و روند قیمت <محصول>»
 * (`/prices/chart/<product slug>`). Pure: copy, which products get a chart page, and every string a gauge or a chart
 * may show (the publication gate's allow-list, lib/static/price-gate.ts rule 9).
 *
 * The data is Ahan Asa's OWN published daily prices (snapshot `published_price_history`, 90 days) — the lowest
 * price of the product's reference size, the same one the product page's price block shows. fa only: ar shows a
 * price + date only, en no price at all.
 */
export const PRICE_CHART_ROUTE = "/prices/chart";
export const priceChartPath = (slug: string) => `${PRICE_CHART_ROUTE}/${slug}`;
/** The chart pages exist in fa only. */
export const PRICE_CHART_LOCALES = ["fa"] as const;
/** The window a chart page draws (the price history the pipeline keeps). Parameter. */
export const PRICE_CHART_WINDOW_DAYS = 90;
/** How many products get a chart page, and at most how many per catalog family. Parameters. */
export const PRICE_CHART_MAX_PAGES = 12;
export const PRICE_CHART_PER_FAMILY = 2;

/** The decision block's gauge element: its value is the variant's canonical id (the gate recomputes it). */
export const PRICE_GAUGE_ATTRIBUTE = "data-aa-price-gauge";
/** A chart page's chart + table element: its value is the variant's canonical id. */
export const PRICE_CHART_ATTRIBUTE = "data-aa-price-chart";
/** Marks a price line (chart page, mini trend): its value is the number of daily points drawn (the gate re-counts them). */
export const PRICE_LINE_ATTRIBUTE = "data-aa-price-line";
/** The RFQ CTA marks of a gauge or a chart page (chart_to_rfq), defined with the events (client-safe). */
export { CHART_RFQ_ATTRIBUTE, CHART_SLUG_ATTRIBUTE } from "../analytics/events.ts";

const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);

export const PRICE_DECISION_COPY = {
  title: "جایگاه قیمت امروز",
  window: (days: PositionWindow) => `نسبت به ${fa(days)} روز گذشته`,
  position: { low: "ارزان", mid: "متوسط", high: "گران" } satisfies Record<PricePosition, string>,
  min: "کمترین",
  avg: "میانگین",
  max: "بیشترین",
  today: "امروز",
  unit: PRICE_BLOCK_COPY.unit,
  note: "مقایسه قیمت امروز با قیمت‌های منتشرشده آهن آسا در همین بازه است؛ پیش‌بینی یا توصیه خرید نیست.",
  cta: "قیمت قطعی برای حجم شما",
  chartLink: "نمودار و روند کامل قیمت",
  trend: (days: number) => `روند ${fa(days)} روز اخیر`,
} as const;

export const PRICE_CHART_COPY = {
  eyebrow: "نمودار قیمت",
  title: (product: string) => `نمودار و روند قیمت ${product}`,
  metaTitle: (product: string) => `نمودار و روند قیمت ${product} | ۹۰ روز اخیر`,
  description: (product: string, size: string) => `نمودار قیمت روزانه ${product} (${size}) در ۹۰ روز اخیر، از قیمت‌های منتشرشده آهن آسا، با جدول قیمت روزانه و جایگاه قیمت امروز.`,
  body: "قیمت روزانه منتشرشده آهن آسا (کمترین قیمت، تومان به ازای هر کیلوگرم با ارزش افزوده) برای اندازه مرجع این محصول. نمودار روند گذشته را نشان می‌دهد؛ پیش‌بینی قیمت نیست.",
  referenceSize: "اندازه مرجع",
  range: "بازه نمودار",
  rangeDays: (days: number) => `${fa(days)} روز`,
  chartLabel: (product: string, days: number) => `نمودار قیمت ${product} در ${fa(days)} روز اخیر`,
  tableTitle: "جدول قیمت روزانه",
  tableCaption: (product: string) => `قیمت روزانه ${product} (تومان/کیلوگرم)`,
  tableDate: "تاریخ",
  tableValue: "قیمت (تومان/کیلوگرم)",
  productPage: "مشخصات و قیمت همه اندازه‌ها",
  pricesPage: "قیمت روز همه محصولات",
  indicatorsTitle: "شاخص‌های مرجع بازار",
  sectionTitle: "نمودار و روند قیمت",
  sectionBody: "روند ۹۰ روز اخیر قیمت منتشرشده آهن آسا برای پرتقاضاترین محصولات.",
  datasetName: (product: string, size: string) => `قیمت روزانه ${product} (${size}) — آهن آسا`,
  datasetVariable: "قیمت روزانه (تومان به ازای هر کیلوگرم، با ارزش افزوده)",
  datasetUnit: "تومان/کیلوگرم",
  /** W18.3: the share links (components/prices/chart-share.tsx). */
  shareWhatsapp: "اشتراک در واتساپ",
  shareTelegram: "اشتراک در تلگرام",
  /** Bale publishes no web share URL (docs.bale.ai, bale.ai), so its button copies the title + link (components/prices/chart-copy-link.tsx). */
  shareBale: "اشتراک در بله",
  linkCopied: "لینک کپی شد",
} as const;

/** The shared text: the page title, then its URL — never a price (WhatsApp's share text, and what «اشتراک در بله» copies). */
export function chartShareText(url: string, title: string): string {
  return `${title}\n${url}`;
}

/**
 * W18.3 — a chart page's plain share URLs (no script, no SDK): WhatsApp's `wa.me/?text=` (no number: the visitor picks
 * the chat) and Telegram's `t.me/share/url`. The text is the page title and URL only — never a price. Strict RFC 3986
 * encoding: a product name like «میلگرد آجدار A3 (Aj400)» must not leave a bare «)» that ends the link in the page's
 * Markdown mirror (lib/static/markdown-mirror.ts).
 */
export function chartShareLinks(url: string, title: string): { whatsapp: string; telegram: string } {
  const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return {
    whatsapp: `https://wa.me/?text=${enc(chartShareText(url, title))}`,
    telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`,
  };
}

/** A chart day's label: «۱۵ مهر ۱۴۰۵» (Tehran day, Persian calendar). */
export function chartDayLabel(day: string): string {
  return formatPersianDate(new Date(`${day}T12:00:00Z`));
}

/** One price-table row as the selection needs it (lib/pricing/price-page.ts PriceTableRow). */
export interface ChartCandidateRow {
  xid: string;
  productName: string;
  productPagePath: string;
  size: string;
  familyCode: string;
}

export interface PriceChartProduct {
  slug: string;
  productName: string;
  xid: string;
  size: string;
  familyCode: string;
}

/**
 * The products that get a chart page: per template its reference size (its first priced row = the product page's
 * main variant), when the 90 days ending on that price's day hold ≥ POSITION_MIN_POINTS daily points. Ordered by
 * family demand (PRICE_HUB_CATEGORY_CODES order of the /prices title, then other families), then the table order;
 * at most PRICE_CHART_PER_FAMILY per family and PRICE_CHART_MAX_PAGES in all.
 */
export function selectChartProducts(rows: readonly ChartCandidateRow[], historyPoints: (xid: string) => number, familyOrder: readonly string[] = DEMAND_ORDER): PriceChartProduct[] {
  const seen = new Set<string>();
  const candidates: (PriceChartProduct & { order: number })[] = [];
  rows.forEach((r, order) => {
    if (seen.has(r.productPagePath)) return;
    seen.add(r.productPagePath);
    if (historyPoints(r.xid) < POSITION_MIN_POINTS) return;
    candidates.push({ slug: r.productPagePath.replace(/^\/products\//, ""), productName: r.productName, xid: r.xid, size: r.size, familyCode: r.familyCode, order });
  });
  const rank = (code: string) => (familyOrder.includes(code) ? familyOrder.indexOf(code) : familyOrder.length);
  candidates.sort((a, b) => rank(a.familyCode) - rank(b.familyCode) || a.order - b.order);
  const perFamily = new Map<string, number>();
  const out: PriceChartProduct[] = [];
  for (const c of candidates) {
    const n = perFamily.get(c.familyCode) ?? 0;
    if (n >= PRICE_CHART_PER_FAMILY || out.length >= PRICE_CHART_MAX_PAGES) continue;
    perFamily.set(c.familyCode, n + 1);
    const { order: _o, ...product } = c;
    out.push(product);
  }
  return out;
}

/** Family demand order (lib/pricing/price-hubs.ts title order; keyword map §3.1). */
const DEMAND_ORDER: readonly string[] = ["REBAR", "BEAM", "SHEET_PLATE", "BOX_SECTION", "ANGLE", "CHANNEL", "PIPE"].filter((c) => (PRICE_HUB_CATEGORY_CODES as readonly string[]).includes(c));

/** The chart page's series: the daily points of the PRICE_CHART_WINDOW_DAYS days ending on `currentDay`. */
export function chartSeries(points: readonly DailyPoint[], currentDay: string, days: number = PRICE_CHART_WINDOW_DAYS): DailyPoint[] {
  return windowPoints(points, currentDay, days);
}

/** The first day of a chart window ending on `currentDay`. */
export function chartWindowStart(currentDay: string, days: number): string {
  return addDays(currentDay, -(days - 1));
}

/** Every string a gauge element of this variant may show (gate rule 9). */
export function allowedGaugeTexts(windows: readonly WindowStats[], trendDays: number | null, withChartLink: boolean): string[] {
  const t = PRICE_DECISION_COPY;
  const out: string[] = [t.title, t.min, t.avg, t.max, t.today, t.unit, t.note, t.cta, ...Object.values(t.position)];
  if (withChartLink) out.push(t.chartLink);
  if (trendDays) out.push(t.trend(trendDays));
  for (const w of windows) out.push(t.window(w.window), formatTomanAmount("fa", w.min), formatTomanAmount("fa", w.max), formatTomanAmount("fa", w.avg), formatTomanAmount("fa", w.today));
  return out;
}

/** Every string a chart page's chart element may show (gate rule 9): the copy, its gauge, every point. */
export function allowedChartTexts(product: string, series: readonly DailyPoint[], currentDay: string): string[] {
  const t = PRICE_CHART_COPY;
  const out = [t.range, t.rangeDays(30), t.rangeDays(90), t.chartLabel(product, 30), t.chartLabel(product, 90), t.tableTitle, t.tableCaption(product), t.tableDate, t.tableValue, PRICE_DECISION_COPY.min, PRICE_DECISION_COPY.max, PRICE_DECISION_COPY.unit];
  for (const p of series) out.push(formatTomanAmount("fa", p.price), chartDayLabel(p.day));
  out.push(...allowedGaugeTexts(priceWindows(series, currentDay), null, false));
  return out;
}
