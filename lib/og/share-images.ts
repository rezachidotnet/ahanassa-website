import type { PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { irrToToman } from "../contracts/snapshot-prices.ts";
import { addDays, lineGeometry, type LinePoint } from "../charts/line-geometry.ts";
import { PRICE_BLOCK_COPY } from "../pricing/price-block-presentation.ts";
import { formatTomanAmount } from "../pricing/product-page-price.ts";
import { chartDayLabel, chartWindowStart, PRICE_CHART_COPY, PRICE_CHART_WINDOW_DAYS, PRICE_DECISION_COPY } from "../pricing/price-charts.ts";
import { tehranDay, type DailyPoint } from "../pricing/price-history.ts";
import { allowedIndicatorTexts, INDICATOR_COPY, presentIndicator, type Indicator } from "../indicators/presentation.ts";
import { MARKET_INDICATORS_COPY, type MarketIndicatorsLocale } from "../indicators/page.ts";
import { residue } from "../static/price-gate.ts";
import { scanPublicFile } from "../static/leak-scan.ts";
import { scanSourceNames } from "../static/source-name-scan.ts";
import { SHARE_IMAGE_SIZE } from "./share-image-paths.ts";

/**
 * W18.3 — the share images (og:image / twitter:image, 1200×630) of the fa chart pages and the en/ar market
 * indicators page, drawn as SVG at build time and rasterized by scripts/static/build.ts (lib/articles/cover-raster.ts
 * rasterizeSvg: resvg + the committed Estedad fonts, PNG + WebP). Pure: no clock, no network, so the same snapshot
 * always gives byte-identical images (and the staging and production twins match, lib/static/target-diff-gate.ts).
 *
 * What an image may show follows the page it belongs to:
 * - fa chart page: the product, its reference size, the price the page shows (the lowest of that size, Toman/kg,
 *   VAT included) with its Tehran day, and the 90-day line of Ahan Asa's own published prices. No factory, no
 *   delivery place.
 * - en/ar market indicators: the indicators only — no Ahan Asa price on either (en never shows one; the ar page
 *   carries no inline price, owner 2026-10-16). Each indicator row shows its value, change, date (data month for a
 *   monthly series) and source, under the locale's «reference index — not an Ahan Asa selling price» banner; the
 *   line is the last 90 days (daily) or 12 months (monthly).
 *
 * A raster cannot be scanned by the artifact gate, so every drawn text is returned with the SVG and checked by
 * `checkShareImage` before anything is written: the price-source name list, the locale's script rule (leak scan),
 * and an allow-list recomputed from the snapshot — the fa amount and day must equal the snapshot's row for the
 * variant, and the en/ar rows may hold nothing but their indicator's own texts.
 */

export interface ShareImageText {
  text: string;
  /** The indicator a row text belongs to (en/ar); null for the image's own copy. */
  indicator: string | null;
}

export interface ShareImage {
  kind: "price_chart" | "market_indicators";
  locale: "fa" | MarketIndicatorsLocale;
  svg: string;
  texts: ShareImageText[];
}

/** Copy that exists only on the share images. */
export const SHARE_IMAGE_COPY = {
  brand: { fa: "آهن آسا", en: "Ahan Asa", ar: "آهن آسا" },
  domain: "www.ahanassa.com",
  window: {
    en: { daily: "Last 90 days", monthly: "Last 12 months" },
    ar: { daily: "آخر ٩٠ يومًا", monthly: "آخر ١٢ شهرًا" },
  },
} as const;

const W = SHARE_IMAGE_SIZE.width;
const H = SHARE_IMAGE_SIZE.height;
const M = 64;
const NAVY = "#0b2545";
const COPPER = "#b04a2f";
const MUTED = "#475467";
const LINE_BG = "#f2f4f7";
const FOOTER_H = 72;
const RLM = "\u200F";
const LRI = "\u2066";
const PDI = "\u2069";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A rough advance width (Estedad), only to shrink a long line until it fits; errs wide. */
export function estimateWidth(text: string, size: number): number {
  let em = 0;
  for (const ch of text) {
    if (/\s/.test(ch)) em += 0.3;
    else if (/[0-9۰-۹٠-٩]/.test(ch)) em += 0.6;
    else if (/[A-Z]/.test(ch)) em += 0.68;
    else if (/[a-z]/.test(ch)) em += 0.55;
    else if (/[؀-ۿ]/.test(ch)) em += 0.55;
    else em += 0.45;
  }
  return em * size;
}

/** The font size (≤ `size`, ≥ `min`) at which `text` fits `maxWidth`. */
export function fitSize(text: string, size: number, maxWidth: number, min = Math.round(size * 0.6)): number {
  let s = size;
  while (s > min && estimateWidth(text, s) > maxWidth) s--;
  return s;
}

interface TextOpts {
  x: number;
  y: number;
  size: number;
  weight?: 400 | 600 | 700 | 800;
  fill?: string;
  rtl: boolean;
  /** "end" = the reading-direction end (left on RTL); default the start edge. */
  anchor?: "start" | "end";
}

/**
 * One line of text, laid out for resvg (which ignores `direction`): an RTL line starts with U+200F so its bidi base
 * direction is RTL (rtlText), and anchors at its right edge (`text-anchor="end"`) unless `anchor` is "end".
 */
function line(text: string, o: TextOpts): string {
  const anchor = o.rtl ? (o.anchor === "end" ? "start" : "end") : o.anchor === "end" ? "end" : "start";
  return `<text x="${o.x}" y="${o.y}" font-family="Estedad" font-size="${o.size}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? NAVY}" text-anchor="${anchor}">${o.rtl ? rtlText(text) : esc(text)}</text>`;
}

/** A Latin run inside an RTL line («(dmtu)», «Pink Sheet», «CC BY 4.0», «Ø10»). */
const LATIN_RUN = /[A-Za-z0-9Ø](?:[A-Za-z0-9Ø.,/ -]*[A-Za-z0-9Ø])?/g;

/**
 * An RTL line as resvg orders it like a browser: U+200F at both ends, and every Latin run isolated (U+2066…U+2069).
 * Without the isolates resvg moves a Latin run to the wrong end of the line; without the closing mark, a closing «٪».
 */
export function rtlText(text: string): string {
  return `${RLM}${esc(text.replace(LATIN_RUN, (run) => `${LRI}${run}${PDI}`))}${RLM}`;
}

/** A line with an area under it and the newest value marked, inside the box (x, y, w, h). */
function sparkline(points: readonly LinePoint[], from: string, to: string, box: { x: number; y: number; w: number; h: number }, stroke = NAVY): string {
  const g = lineGeometry(points, from, to, box.w, box.h, 6);
  const end = g.end;
  const area = `${g.path} L${end.x} ${box.h} L${g.start.x} ${box.h} Z`;
  return `<g transform="translate(${box.x} ${box.y})"><rect width="${box.w}" height="${box.h}" rx="10" fill="${LINE_BG}"/><line x1="0" x2="${box.w}" y1="${g.max}" y2="${g.max}" stroke="#d0d5dd" stroke-width="1"/><line x1="0" x2="${box.w}" y1="${g.min}" y2="${g.min}" stroke="#d0d5dd" stroke-width="1"/><path d="${area}" fill="${stroke}" fill-opacity="0.08"/><path d="${g.path}" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${end.x}" cy="${end.y}" r="8" fill="${COPPER}" stroke="#ffffff" stroke-width="3"/></g>`;
}

/** The navy footer band: the Ahan Asa mark and name at the start edge, the domain at the end edge. */
function footer(locale: "fa" | "en" | "ar", logoDataUri: string): string {
  const rtl = locale !== "en";
  const y0 = H - FOOTER_H;
  const logo = 48;
  const logoX = rtl ? W - M - logo : M;
  const nameX = rtl ? logoX - 16 : logoX + logo + 16;
  return [
    `<rect x="0" y="${y0}" width="${W}" height="${FOOTER_H}" fill="${NAVY}"/>`,
    `<rect x="${logoX - 4}" y="${y0 + 12}" width="${logo + 8}" height="${logo + 8}" rx="8" fill="#ffffff"/>`,
    `<image x="${logoX}" y="${y0 + 16}" width="${logo}" height="${logo}" href="${logoDataUri}" preserveAspectRatio="xMidYMid meet"/>`,
    line(SHARE_IMAGE_COPY.brand[locale], { x: nameX, y: y0 + 47, size: 28, weight: 800, fill: "#ffffff", rtl }),
    // The domain is Latin on every locale: an LTR line at the other edge.
    `<text x="${rtl ? M : W - M}" y="${y0 + 45}" font-family="Estedad" font-size="22" font-weight="600" fill="#ffffff" text-anchor="${rtl ? "start" : "end"}">${SHARE_IMAGE_COPY.domain}</text>`,
  ].join("");
}

const frame = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/><rect width="${W}" height="8" fill="${COPPER}"/>${body}</svg>`;

export interface PriceChartShareInput {
  productName: string;
  size: string;
  /** The chart page's price: the lowest of the reference size, integer Toman/kg (VAT included). */
  tomanPerKg: number;
  /** That price's Tehran day (YYYY-MM-DD) — the chart's last day. */
  day: string;
  /** The chart page's 90-day series (lib/pricing/price-charts.ts chartSeries). */
  series: readonly DailyPoint[];
  logoDataUri: string;
}

/** A fa chart page's share image. */
export function priceChartShareImage(input: PriceChartShareInput): ShareImage {
  const texts: ShareImageText[] = [];
  const t = PRICE_CHART_COPY;
  const draw = (text: string, o: Omit<TextOpts, "rtl">) => {
    texts.push({ text, indicator: null });
    return line(text, { ...o, rtl: true });
  };
  const right = W - M;
  const title = t.title(input.productName);
  const priceColumn = 420;
  const chartBox = { x: M, y: 262, w: W - 2 * M - priceColumn - 40, h: 250 };
  const body = [
    draw(t.eyebrow, { x: right, y: 82, size: 26, weight: 700, fill: COPPER }),
    draw(title, { x: right, y: 150, size: fitSize(title, 54, W - 2 * M), weight: 800 }),
    draw(`${t.referenceSize}: ${input.size}`, { x: right, y: 204, size: 28, weight: 600, fill: MUTED }),
    draw(PRICE_BLOCK_COPY.title, { x: right, y: 292, size: 28, weight: 600, fill: MUTED }),
    draw(formatTomanAmount("fa", input.tomanPerKg), { x: right, y: 380, size: 84, weight: 800 }),
    draw(PRICE_BLOCK_COPY.unit, { x: right, y: 428, size: 28, weight: 600 }),
    draw(PRICE_BLOCK_COPY.vat, { x: right, y: 466, size: 22, fill: MUTED }),
    draw(chartDayLabel(input.day), { x: right, y: 510, size: 28, weight: 700, fill: COPPER }),
    draw(PRICE_DECISION_COPY.trend(PRICE_CHART_WINDOW_DAYS), { x: chartBox.x + chartBox.w, y: 244, size: 24, weight: 600, fill: MUTED }),
    sparkline(
      input.series.map((p) => ({ date: p.day, value: p.price })),
      chartWindowStart(input.day, PRICE_CHART_WINDOW_DAYS),
      input.day,
      chartBox,
    ),
    footer("fa", input.logoDataUri),
  ].join("");
  return { kind: "price_chart", locale: "fa", svg: frame(body), texts: [...texts, { text: SHARE_IMAGE_COPY.brand.fa, indicator: null }, { text: SHARE_IMAGE_COPY.domain, indicator: null }] };
}

/** The points a row's line draws: the last 90 days of a daily series, the last 12 values of a monthly one. */
export function indicatorSharePoints(indicator: Indicator): { points: LinePoint[]; from: string; to: string } {
  const last = indicator.points[indicator.points.length - 1].date;
  if (indicator.frequency === "daily") {
    const from = addDays(last, -(PRICE_CHART_WINDOW_DAYS - 1));
    return { points: indicator.points.filter((p) => p.date >= from).map((p) => ({ date: p.date, value: p.value })), from, to: last };
  }
  const points = indicator.points.slice(-12).map((p) => ({ date: p.date, value: p.value }));
  return { points, from: points[0].date, to: last };
}

/** The en/ar market indicators page's share image (indicators only, never an Ahan Asa price). */
export function indicatorsShareImage(locale: MarketIndicatorsLocale, indicators: readonly Indicator[], logoDataUri: string): ShareImage {
  const rtl = locale === "ar";
  const texts: ShareImageText[] = [];
  const page = MARKET_INDICATORS_COPY[locale];
  const copy = INDICATOR_COPY[locale];
  const start = rtl ? W - M : M;
  const draw = (text: string, o: Omit<TextOpts, "rtl">, indicator: string | null = null) => {
    texts.push({ text, indicator });
    return line(text, { ...o, rtl });
  };
  const parts = [
    draw(page.eyebrow, { x: start, y: 70, size: 24, weight: 700, fill: COPPER }),
    draw(page.title, { x: start, y: 122, size: 46, weight: 800 }),
    draw(copy.reference, { x: start, y: 166, size: fitSize(copy.reference, 26, W - 2 * M), weight: 700, fill: COPPER }),
  ];
  const rows = indicators.slice(0, 3);
  const rowH = 120;
  const lineW = 300;
  const textW = W - 2 * M - lineW - 40;
  rows.forEach((indicator, i) => {
    const y0 = 186 + i * rowH;
    const v = presentIndicator(locale, indicator);
    // Estedad has no ▲/▼: fa/ar draw the word a screen reader hears instead («انخفاض ٠٫٧٪»); en writes +/−.
    // Its own text element at the far edge of the name line: inside one line after a Latin run (ar «(dmtu)»), resvg's
    // bidi puts the word on the wrong side of the number.
    const change = v.change ? `${v.change.word ? `${v.change.word} ` : ""}${v.change.text}` : null;
    const valueLine = `${v.value} ${v.unit.text}`;
    const meta = `${v.stamp}${v.preliminary ? `${rtl ? "، " : " · "}${copy.preliminary}` : ""}`;
    parts.push(`<line x1="${M}" x2="${W - M}" y1="${y0}" y2="${y0}" stroke="#e4e7ec" stroke-width="2"/>`);
    parts.push(draw(v.shortName, { x: start, y: y0 + 32, size: fitSize(v.shortName, 26, textW - 190), weight: 700 }, indicator.code));
    if (change) parts.push(draw(change, { x: rtl ? W - M - textW : M + textW, y: y0 + 32, size: 24, weight: 700, fill: MUTED, anchor: "end" }, indicator.code));
    parts.push(draw(valueLine, { x: start, y: y0 + 69, size: fitSize(valueLine, 30, textW), weight: 800 }, indicator.code));
    parts.push(draw(meta, { x: start, y: y0 + 95, size: fitSize(meta, 18, textW), weight: 600, fill: COPPER }, indicator.code));
    parts.push(draw(v.source, { x: start, y: y0 + 114, size: fitSize(v.source, 16, textW, 11), fill: MUTED }, indicator.code));
    const { points, from, to } = indicatorSharePoints(indicator);
    const box = { x: rtl ? M : W - M - lineW, y: y0 + 14, w: lineW, h: 76 };
    parts.push(sparkline(points, from, to, box));
    const caption = SHARE_IMAGE_COPY.window[locale][indicator.frequency];
    parts.push(draw(caption, { x: rtl ? M + lineW : W - M, y: y0 + 110, size: 15, fill: MUTED, anchor: "end" }));
  });
  parts.push(footer(locale, logoDataUri));
  return { kind: "market_indicators", locale, svg: frame(parts.join("")), texts: [...texts, { text: SHARE_IMAGE_COPY.brand[locale], indicator: null }, { text: SHARE_IMAGE_COPY.domain, indicator: null }] };
}

export interface ShareImageCheck {
  /** fa chart image: the variant it shows and the snapshot's price rows (published_prices). */
  price?: { xid: string; rows: readonly PublishedPriceRow[]; productName: string; size: string };
  /** en/ar image: the snapshot's indicators. */
  indicators?: readonly Indicator[];
  sourceNames: readonly string[] | null;
}

/**
 * The share image's text gate (a raster is not scannable later): every failure is a line; empty = the image may be
 * written. Never names a price source (only its index in the private list).
 */
export function checkShareImage(image: ShareImage, label: string, check: ShareImageCheck): string[] {
  const failures: string[] = [];
  const all = image.texts.map((t) => t.text);
  if (check.sourceNames?.length) for (const f of scanSourceNames([{ path: "share-image", content: all.join("\n") }], check.sourceNames)) failures.push(`${label}: price source name in a share image (name #${f.index} of the private list)`);
  // The locale's script rule, on a text mirror (en: no Arabic script; ar: no Persian-only letters).
  const mirror = `<html><body>${all.map((t) => `<p>${esc(t)}</p>`).join("")}</body></html>`;
  const mirrorPath = image.locale === "fa" ? "share-image.html" : `${image.locale}/share-image.html`;
  for (const f of scanPublicFile(mirrorPath, mirror)) failures.push(`${label}: leak ${f.kind}: ${f.match}`);

  if (image.kind === "price_chart") {
    const p = check.price;
    const row = p ? check.price!.rows.find((r) => r.canonical_variant_id === p.xid) : undefined;
    if (!p || !row) return [...failures, `${label}: no snapshot price row for the chart's variant`];
    const day = tehranDay(row.published_at);
    const amount = formatTomanAmount("fa", irrToToman(row.price_irr_per_kg));
    if (!all.includes(amount)) failures.push(`${label}: the drawn price is not the snapshot's (${amount})`);
    if (!day || !all.includes(chartDayLabel(day))) failures.push(`${label}: the drawn date is not the snapshot price's day`);
    const t = PRICE_CHART_COPY;
    const allowed = [t.eyebrow, t.title(p.productName), `${t.referenceSize}: ${p.size}`, PRICE_BLOCK_COPY.title, PRICE_BLOCK_COPY.unit, PRICE_BLOCK_COPY.vat, PRICE_DECISION_COPY.trend(PRICE_CHART_WINDOW_DAYS), amount, ...(day ? [chartDayLabel(day)] : []), SHARE_IMAGE_COPY.brand.fa, SHARE_IMAGE_COPY.domain];
    for (const text of all) if (!allowed.includes(text)) failures.push(`${label}: text not allowed: ${text.slice(0, 80)}`);
    return failures;
  }

  const locale = image.locale as MarketIndicatorsLocale;
  const byCode = new Map((check.indicators ?? []).map((i) => [i.code as string, i]));
  const own = [MARKET_INDICATORS_COPY[locale].eyebrow, MARKET_INDICATORS_COPY[locale].title, INDICATOR_COPY[locale].reference, ...Object.values(SHARE_IMAGE_COPY.window[locale]), SHARE_IMAGE_COPY.brand[locale], SHARE_IMAGE_COPY.domain];
  if (!all.includes(INDICATOR_COPY[locale].reference)) failures.push(`${label}: no «reference index — not an Ahan Asa selling price» label`);
  for (const t of image.texts.filter((x) => x.indicator === null)) if (!own.includes(t.text)) failures.push(`${label}: text not allowed: ${t.text.slice(0, 80)}`);
  const codes = new Set(image.texts.flatMap((t) => (t.indicator ? [t.indicator] : [])));
  for (const code of codes) {
    const indicator = byCode.get(code);
    if (!indicator) {
      failures.push(`${label}: indicator ${code} is not in the snapshot`);
      continue;
    }
    const v = presentIndicator(locale, indicator);
    const rowTexts = image.texts.filter((t) => t.indicator === code).map((t) => t.text);
    if (!rowTexts.some((t) => t.includes(v.stamp))) failures.push(`${label}: ${code} has no date`);
    if (!rowTexts.includes(v.source)) failures.push(`${label}: ${code} has no source`);
    const left = residue(rowTexts.join(" "), allowedIndicatorTexts(locale, indicator));
    if (left) failures.push(`${label}: ${code}: text not allowed: ${left.slice(0, 80)}`);
  }
  return failures;
}
