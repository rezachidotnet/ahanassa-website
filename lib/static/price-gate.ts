import { factoryRowAsPriceRow, irrToToman, orderFactoryRows, PUBLISHED_FACTORY_PRICE_COLUMNS, PUBLISHED_PRICE_COLUMNS, PUBLISHED_PRICE_HISTORY_COLUMNS, type PublishedFactoryPriceRow, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { PRICE_BLOCK_COPY } from "../pricing/price-block-presentation.ts";
import { allowedPriceTexts, AR_PRICE_COPY, PRICE_BLOCK_ATTRIBUTE, PRICE_BLOCK_ON_REQUEST, PRICE_CELL_ATTRIBUTE, PRICE_CHANGE_COPY, PRICE_CHANGE_WORDS, PRICE_COLUMN_COPY, PRICE_DISCLAIMER, PRICE_RANK_ATTRIBUTE, PRICE_SPARKLINE_ATTRIBUTE, PRICE_TREND_COPY, priceDateLabel, renderedAmount, type PriceLocale } from "../pricing/product-page-price.ts";
import { PRICE_RFQ_COPY, RFQ_FACTORY_PARAM } from "../pricing/price-rfq.ts";
import { isDailyPriceEligible } from "../pricing/daily-price-eligibility.ts";
import { sparklineSeries, tehranDay, type DailyPoint } from "../pricing/price-history.ts";
import { CALCULATOR_PRICE_PAGES, fileLocale } from "./leak-scan.ts";
import { ARTICLE_TEXT_ATTRIBUTE } from "../articles/routes.ts";
import { jsonLdBlocks } from "./publication-gate.ts";
import { allowedChartTexts, allowedGaugeTexts, chartHeadingProduct, PRICE_CHART_ATTRIBUTE, PRICE_CHART_WINDOW_DAYS, PRICE_DECISION_COPY, PRICE_GAUGE_ATTRIBUTE, PRICE_LINE_ATTRIBUTE } from "../pricing/price-charts.ts";
import { priceWindows, windowPoints } from "../pricing/price-position.ts";
import { pathPointCount } from "../charts/line-geometry.ts";
import { INDICATOR_ATTRIBUTE, INDICATOR_LINE_ATTRIBUTE } from "../indicators/presentation.ts";

/** fa/ar article pages and listings (W11.1): `articles/…`, `ar/articles/…` (and the `articles.html` listing). */
const ARTICLE_PAGE = /^(ar\/)?articles(\.html$|\/)/;

/**
 * W9.4 price gate — the price half of the publication gate, run by the artifact gate on every
 * artifact (lib/static/artifact-gate.ts). Pure. Owner decisions D-PRICE-DISPLAY / D-PRICE-AGE / D-W10-4,
 * and the decision change of 2026-10-09 (fa full, ar price only, en nothing).
 *
 * 1. Private snapshot: `published_prices` rows carry exactly PUBLISHED_PRICE_COLUMNS (the rendered
 *    fields) — any other field fails, even though the snapshot schema already refuses it.
 * 2. fa pages: the text inside every price element (`data-aa-price-cell` / `data-aa-price-block`) is
 *    exactly the allow-listed, rendered fields of THAT variant's snapshot row (amount in Toman, factory,
 *    delivery location, date, change) plus the fixed copy. A rendered amount outside a price element fails.
 * 3. ar pages: price cells only (no PriceBlock); their text is the amount + date and update-time label + the ar copy, and
 *    nothing of the fa-only fields appears anywhere in an ar file: no factory, no delivery location, no
 *    price timestamp, no Persian price copy or Persian-digit amount.
 * 4. en files: no price at all — no price element, no price copy, no amount, no factory/location, no
 *    calculator price map (`tomanPerKg`).
 * 5. The weight calculator's client price map (fa/ar calculator pages only; the leak scan refuses
 *    `tomanPerKg` everywhere else): every entry is a known priced variant, with exactly the allowed keys
 *    for its locale (fa: tomanPerKg, datetime, dateLabel; ar: tomanPerKg, dateLabel) and values equal to
 *    the snapshot row's.
 *
 * 6. W9.6: `published_price_history` rows carry exactly PUBLISHED_PRICE_HISTORY_COLUMNS; a 30-day chart
 *    (`data-aa-price-sparkline="<n>"`) sits only inside a fa price block whose variant has ≥ 7 daily points in
 *    the snapshot, and draws exactly that many; ar/en never carry a chart, the RFQ copy of the other
 *    locale or a `factory=` RFQ prefill; en never ▲/▼ (fa and ar show it, owner decision on PR #35). A per-ton raw/semi-finished material never has a price element or
 *    calculator entry (lib/pricing/daily-price-eligibility.ts).
 *
 * W11.1: on fa/ar ARTICLE pages only, the article's own text (elements marked ARTICLE_TEXT_ATTRIBUTE: title,
 * description, body, FAQ) may quote a rendered amount — editorial text governed by the content repository's
 * rules and the owner's merge — so rule 2's "no amount outside a price element" skips those regions there.
 * Rules 3 and 4 still apply to the whole file (ar never names a factory/location, en never has a price).
 *
 * W20.7 (owner, 2026-10-16; Odoo W20.6 one price per (variant, factory)):
 * 7. `published_factory_prices` rows carry exactly PUBLISHED_FACTORY_PRICE_COLUMNS. A fa price cell with
 *    `data-aa-price-rank="<k>"` is checked against the k-th factory row of its variant (orderFactoryRows), not the
 *    lowest; a rank the snapshot does not have fails. ar/en never carry a rank, and the factory rows' amounts,
 *    factory and location names count like the lowest's in rules 2–4 (ar shows the lowest only, en nothing).
 * 8. JSON-LD offers: only on fa/ar product pages (`products/<slug>.html`), only the variant's LOWEST
 *    (published_prices) — one `Offer` per priced variant, `@id` `…#offer-<CVAR>`, `price` = the IRR/kg integer,
 *    `priceCurrency` IRR, a per-kg `UnitPriceSpecification` with VAT included, nothing else (no factory, seller,
 *    date or availability). Never on en, never another page, never a factory's non-lowest price.
 *
 * W18.2 (price intelligence):
 * 9. A price-position gauge (`data-aa-price-gauge="<CVAR>"`, the fa product page's decision block and the chart
 *    pages) and a chart page's chart (`data-aa-price-chart="<CVAR>"`) exist on fa pages only, for a priced variant
 *    whose snapshot history gives the gauge at least one window; every text in them is the fixed copy or a number
 *    recomputed here from the snapshot (lib/pricing/price-position.ts, lib/pricing/price-charts.ts) — the lowest,
 *    average, highest, today and, on a chart, each day's price and date; every price line
 *    (`data-aa-price-line="<n>"`) sits in one of them and draws exactly a window's number of daily points. The fa
 *    drivers line nested in a gauge is the indicator gate's (lib/static/indicator-gate.ts). Gauge, chart and
 *    indicator elements are left out of rule 2's "no amount outside a price element" (their numbers are checked
 *    here, or are not prices at all).
 *
 * The pricing-API field names, source-like keys and factory codes are refused in every public file by the
 * leak scan (lib/static/leak-scan.ts, kind `pricing_field`); JSON-LD types/keys by the publication gate.
 */
export interface PriceFinding {
  file: string;
  kind: "price_field_not_allowed" | "price_text_not_allowed" | "price_unknown_variant" | "price_outside_markup" | "price_on_en_page" | "price_fa_field_on_ar_page" | "calculator_price_not_allowed" | "price_excluded_variant" | "price_sparkline_not_allowed" | "price_jsonld_not_allowed" | "price_gauge_not_allowed";
  match: string;
}

interface VariantInfo {
  xid: string;
  size: string;
  /** W9.6: false for a per-ton raw/semi-finished material (never a daily price). */
  eligible: boolean;
}

export interface PriceGateInput {
  rows: PublishedPriceRow[];
  variants: Map<string, VariantInfo>;
  /** W9.6: daily points (Toman) per variant, oldest first. */
  history: Map<string, DailyPoint[]>;
  /** W20.7: every factory's price per variant, in display order (orderFactoryRows), as price rows. */
  factoryRows: Map<string, PublishedPriceRow[]>;
  findings: PriceFinding[];
}

/** The snapshot's price rows and variant labels, tolerating a partial/empty document (the artifact gate reports a missing snapshot itself). */
export function priceGateInput(snapshot: unknown): PriceGateInput {
  const tables = (snapshot as { tables?: Record<string, unknown[]> } | null)?.tables ?? {};
  const findings: PriceFinding[] = [];
  const rows: PublishedPriceRow[] = [];
  for (const raw of (tables.published_prices ?? []) as Record<string, unknown>[]) {
    for (const key of Object.keys(raw ?? {})) if (!(PUBLISHED_PRICE_COLUMNS as readonly string[]).includes(key)) findings.push({ file: "private-snapshot/snapshot.json", kind: "price_field_not_allowed", match: key });
    rows.push(raw as unknown as PublishedPriceRow);
  }
  const byFactory = new Map<string, PublishedFactoryPriceRow[]>();
  for (const raw of (tables.published_factory_prices ?? []) as Record<string, unknown>[]) {
    for (const key of Object.keys(raw ?? {})) if (!(PUBLISHED_FACTORY_PRICE_COLUMNS as readonly string[]).includes(key)) findings.push({ file: "private-snapshot/snapshot.json", kind: "price_field_not_allowed", match: `published_factory_prices.${key}` });
    const row = raw as unknown as PublishedFactoryPriceRow;
    byFactory.set(row.canonical_variant_id, [...(byFactory.get(row.canonical_variant_id) ?? []), row]);
  }
  const factoryRows = new Map([...byFactory].map(([xid, list]) => [xid, orderFactoryRows(list).map(factoryRowAsPriceRow)]));
  const history = new Map<string, DailyPoint[]>();
  for (const raw of (tables.published_price_history ?? []) as Record<string, unknown>[]) {
    for (const key of Object.keys(raw ?? {})) if (!(PUBLISHED_PRICE_HISTORY_COLUMNS as readonly string[]).includes(key)) findings.push({ file: "private-snapshot/snapshot.json", kind: "price_field_not_allowed", match: `published_price_history.${key}` });
    const xid = String(raw?.canonical_variant_id);
    history.set(xid, [...(history.get(xid) ?? []), { day: String(raw?.day), price: irrToToman(Number(raw?.price_irr_per_kg)) }]);
  }
  for (const points of history.values()) points.sort((a, b) => (a.day < b.day ? -1 : 1));
  const variants = new Map<string, VariantInfo>();
  for (const v of (tables.product_variants ?? []) as Record<string, unknown>[]) {
    if (typeof v?.xid !== "string") continue;
    const code = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : null);
    variants.set(v.xid, { xid: v.xid, size: String(v.commercial_size ?? v.section_size ?? v.sku ?? ""), eligible: isDailyPriceEligible({ familyCode: code("family_code"), groupCode: code("group_code"), formCode: code("form_code") }) });
  }
  return { rows, variants, history, factoryRows, findings };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'" };
function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e in ENTITIES) return ENTITIES[e];
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return m;
  });
}

/** Visible text: scripts/styles/comments and tags removed, entities decoded, whitespace collapsed. */
export function visibleText(html: string): string {
  return decode(html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export interface PriceElement {
  attribute: string;
  value: string;
  start: number;
  end: number;
  html: string;
}

/** Every price element (outer HTML, nesting-aware) of a page. */
export function priceElements(html: string): PriceElement[] {
  return elementsWithAttribute(html, [PRICE_CELL_ATTRIBUTE, PRICE_BLOCK_ATTRIBUTE]);
}

/** Every element carrying one of `attributes` (outer HTML, nesting-aware). */
export function elementsWithAttribute(html: string, attributes: readonly string[]): PriceElement[] {
  const out: PriceElement[] = [];
  const opener = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\s(${attributes.join("|")})="([^"]*)"[^>]*>`, "gi");
  for (const m of html.matchAll(opener)) {
    const tag = m[1].toLowerCase();
    const start = m.index ?? 0;
    const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    tags.lastIndex = start + m[0].length;
    let depth = 1;
    let end = html.length;
    for (let t = tags.exec(html); t; t = tags.exec(html)) {
      depth += t[1] === "/" ? -1 : 1;
      if (depth === 0) {
        end = t.index + t[0].length;
        break;
      }
    }
    out.push({ attribute: m[2], value: m[3], start, end, html: html.slice(start, end) });
  }
  return out;
}

/** `html` without the given elements (overlapping or nested ones merged). */
export function withoutElements(html: string, elements: readonly { start: number; end: number }[]): string {
  let out = "";
  let cursor = 0;
  for (const el of [...elements].sort((a, b) => a.start - b.start)) {
    if (el.start >= cursor) out += html.slice(cursor, el.start);
    cursor = Math.max(cursor, el.end);
  }
  return out + html.slice(cursor);
}

/** What is left of `text` after removing every allowed string (longest first). */
export function residue(text: string, allowed: readonly string[]): string {
  let out = ` ${text} `;
  for (const a of [...new Set(allowed.filter(Boolean))].sort((x, y) => y.length - x.length)) out = out.split(a).join(" ");
  return out.replace(/[\s،,.:؛·()\-–—/٪%]+/g, " ").trim();
}

const PAGE_H1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i;

/** Persian copy that only a fa price element shows; never on ar or en. */
const FA_PRICE_COPY = [PRICE_BLOCK_COPY.unit, PRICE_BLOCK_COPY.vat, PRICE_BLOCK_COPY.askToday, PRICE_BLOCK_COPY.missing, PRICE_COLUMN_COPY.fa.note, `${PRICE_BLOCK_COPY.title} `, PRICE_DISCLAIMER.fa, PRICE_RFQ_COPY.fa, PRICE_TREND_COPY.fa];
/** W9.6: fa-only price markers — the chart and the factory RFQ prefill; never on ar or en. (▲/▼ is fa + ar, never en.) */
const FA_ONLY_MARKERS = [PRICE_SPARKLINE_ATTRIBUTE, PRICE_TREND_COPY.fa, `&amp;${RFQ_FACTORY_PARAM}=`, `&${RFQ_FACTORY_PARAM}=`, `?${RFQ_FACTORY_PARAM}=`,
  // W18.2: the gauge, the chart pages and their CTA are fa only.
  PRICE_GAUGE_ATTRIBUTE, PRICE_CHART_ATTRIBUTE, PRICE_LINE_ATTRIBUTE, PRICE_DECISION_COPY.cta, PRICE_DECISION_COPY.title];
const CHANGE_MARKERS = [PRICE_CHANGE_COPY.up, PRICE_CHANGE_COPY.down, ...Object.values(PRICE_CHANGE_WORDS.ar)];
/** Arabic copy of the ar price cells; never on en. */
const AR_COPY = [...Object.values(AR_PRICE_COPY), PRICE_DISCLAIMER.ar, PRICE_RFQ_COPY.ar];

/** Calculator price-map entries (`"CVAR-…":{…tomanPerKg…}`), plain or escaped inside the RSC payload string. */
const CALCULATOR_ENTRY = /\\?"(CVAR-[A-Za-z0-9-]+)\\?":(\{[^{}]*?tomanPerKg[^{}]*\})/g;
const CALCULATOR_KEYS: Record<PriceLocale, string[]> = { fa: ["dateLabel", "datetime", "factory", "tomanPerKg"], ar: ["dateLabel", "tomanPerKg"] };

function parseEntry(raw: string): Record<string, unknown> | null {
  for (const text of [raw, raw.replace(/\\"/g, '"')]) {
    try {
      const v = JSON.parse(text);
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch {}
  }
  return null;
}

export function scanCalculatorPrices(path: string, content: string, locale: PriceLocale, byVariant: ReadonlyMap<string, PublishedPriceRow>, variants?: ReadonlyMap<string, VariantInfo>): PriceFinding[] {
  const findings: PriceFinding[] = [];
  const entries = [...content.matchAll(CALCULATOR_ENTRY)];
  const total = content.split("tomanPerKg").length - 1;
  if (total !== entries.length) findings.push({ file: path, kind: "calculator_price_not_allowed", match: `${total} tomanPerKg, only ${entries.length} in the allowed {variant: price} shape` });
  for (const m of entries) {
    const xid = m[1];
    const entry = parseEntry(m[2]);
    const row = byVariant.get(xid);
    if (!entry || !row) {
      findings.push({ file: path, kind: "calculator_price_not_allowed", match: `${xid}: ${row ? "unparseable entry" : "no published price"}` });
      continue;
    }
    if (variants?.get(xid)?.eligible === false) findings.push({ file: path, kind: "price_excluded_variant", match: `${xid}: a per-ton material has a calculator price` });
    const keys = Object.keys(entry).sort();
    if (keys.join(",") !== CALCULATOR_KEYS[locale].join(",")) findings.push({ file: path, kind: "calculator_price_not_allowed", match: `${xid}: keys ${keys.join(",")}` });
    const expected: Record<string, unknown> = { tomanPerKg: irrToToman(row.price_irr_per_kg), dateLabel: priceDateLabel(locale, row.published_at) };
    if (locale === "fa") {
      expected.datetime = new Date(row.published_at).toISOString();
      expected.factory = row.factory_name_fa;
    }
    for (const [k, v] of Object.entries(entry)) if (k in expected && expected[k] !== v) findings.push({ file: path, kind: "calculator_price_not_allowed", match: `${xid}.${k}=${JSON.stringify(v)} (snapshot: ${JSON.stringify(expected[k])})` });
  }
  return findings;
}

export function scanPrices(files: ReadonlyArray<{ path: string; content: string }>, input: PriceGateInput): PriceFinding[] {
  const findings: PriceFinding[] = [...input.findings];
  const byVariant = new Map(input.rows.map((r) => [r.canonical_variant_id, r]));
  // W20.7: the factory rows count like the lowest (their amounts, names and times are fa-only too).
  const every = [...input.rows, ...[...input.factoryRows.values()].flat()];
  const amounts = { fa: [...new Set(every.map((r) => renderedAmount(r, "fa")))], ar: [...new Set(every.map((r) => renderedAmount(r, "ar")))] };
  const names = [...new Set(every.flatMap((r) => [r.factory_name_fa, r.location_fa]))];
  const times = [...new Set(every.flatMap((r) => [r.published_at, new Date(r.published_at).toISOString()]))];

  for (const { path, content } of files) {
    const locale = fileLocale(path);
    if (locale === "en") {
      // 4. No price on en — in the HTML, the RSC payload and any locale JSON.
      const forbidden = ["data-aa-price", "tomanPerKg", ...FA_PRICE_COPY, ...FA_ONLY_MARKERS, ...CHANGE_MARKERS, ...AR_COPY, ...amounts.fa, ...amounts.ar, ...names];
      for (const s of forbidden) if (content.includes(s)) findings.push({ file: path, kind: "price_on_en_page", match: s.trim() });
      // 8. Never a JSON-LD offer on en.
      if (path.endsWith(".html")) findings.push(...scanOfferJsonLd(path, content, byVariant));
      continue;
    }
    if (locale === "ar") {
      // 3. ar is price only: none of the fa-only fields, anywhere in the file (HTML and payload).
      const forbidden = [PRICE_BLOCK_ATTRIBUTE, PRICE_RANK_ATTRIBUTE, ...FA_PRICE_COPY, ...FA_ONLY_MARKERS, ...amounts.fa, ...names, ...times];
      for (const s of forbidden) if (content.includes(s)) findings.push({ file: path, kind: "price_fa_field_on_ar_page", match: s.trim() });
    }
    if (locale !== "fa" && locale !== "ar") {
      if (path.endsWith(".html")) findings.push(...scanOfferJsonLd(path, content, byVariant));
      continue;
    }
    // 5. The calculator's price map (fa/ar calculator pages only; elsewhere the leak scan refuses it).
    if (CALCULATOR_PRICE_PAGES.includes(path)) findings.push(...scanCalculatorPrices(path, content, locale, byVariant, input.variants));
    if (!path.endsWith(".html")) continue;
    // 8. JSON-LD offers: the lowest only, on fa/ar product pages only.
    findings.push(...scanOfferJsonLd(path, content, byVariant));
    // 2./3. Allow-listed text inside every price element, no amount outside one.
    const elements = priceElements(content);
    const h1 = visibleText(PAGE_H1.exec(content)?.[1] ?? "");
    let outside = "";
    let cursor = 0;
    for (const el of elements) {
      if (el.start < cursor) continue; // nested inside the previous element
      outside += content.slice(cursor, el.start);
      cursor = el.end;
      const onRequest = el.attribute === PRICE_BLOCK_ATTRIBUTE && el.value === PRICE_BLOCK_ON_REQUEST;
      const variant = onRequest ? null : input.variants.get(el.value);
      if (!onRequest && !variant) {
        findings.push({ file: path, kind: "price_unknown_variant", match: `${el.attribute}="${el.value}"` });
        continue;
      }
      if (variant && !variant.eligible) findings.push({ file: path, kind: "price_excluded_variant", match: `${el.attribute}="${el.value}": a per-ton material has a daily price element` });
      // 7. A factory cell (fa /prices): its rank's factory row, never the lowest by default.
      const rank = new RegExp(`\\s${PRICE_RANK_ATTRIBUTE}="([^"]*)"`).exec(/^<[^>]*>/.exec(el.html)?.[0] ?? "")?.[1];
      let row = variant ? (byVariant.get(variant.xid) ?? null) : null;
      if (rank !== undefined) {
        const factoryRow = variant && locale === "fa" && /^\d+$/.test(rank) ? input.factoryRows.get(variant.xid)?.[Number(rank)] : undefined;
        if (!factoryRow) {
          findings.push({ file: path, kind: "price_unknown_variant", match: `${el.attribute}="${el.value}" ${PRICE_RANK_ATTRIBUTE}="${rank}": no such factory price` });
          continue;
        }
        row = factoryRow;
      }
      findings.push(...scanSparklines(path, el, row, input.history));
      if (el.attribute === PRICE_BLOCK_ATTRIBUTE && variant && !row) findings.push({ file: path, kind: "price_unknown_variant", match: `${el.attribute}="${el.value}" has no published price` });
      const productName = locale === "fa" && el.attribute === PRICE_BLOCK_ATTRIBUTE ? (variant ? `${h1} ${variant.size}` : h1) : undefined;
      const left = residue(visibleText(el.html), allowedPriceTexts(row, locale, productName));
      if (left) findings.push({ file: path, kind: "price_text_not_allowed", match: `${el.attribute}="${el.value}": ${left.slice(0, 120)}` });
    }
    outside += content.slice(cursor);
    // W11.1: on a fa/ar article page, the article's own text (title, description, body, FAQ — ARTICLE_TEXT_ATTRIBUTE)
    // may quote a price: editorial text under the content repository's rules and the owner's review. Only there,
    // only on fa/ar; en article pages stay fully covered by rule 4 above.
    if (ARTICLE_PAGE.test(path)) outside = withoutElements(outside, elementsWithAttribute(outside, [ARTICLE_TEXT_ATTRIBUTE]));
    // 9. (W18.2) Gauges and charts (fa): every number recomputed from the snapshot; then they leave rule 2's scan, as do
    // the indicator elements (an index value is not a price; the indicator gate checks them).
    if (locale === "fa") findings.push(...scanGaugesAndCharts(path, outside, h1, byVariant, input));
    outside = withoutElements(outside, elementsWithAttribute(outside, [PRICE_GAUGE_ATTRIBUTE, PRICE_CHART_ATTRIBUTE, INDICATOR_ATTRIBUTE, INDICATOR_LINE_ATTRIBUTE]));
    const outsideText = visibleText(outside);
    for (const a of amounts[locale]) if (outsideText.includes(a)) findings.push({ file: path, kind: "price_outside_markup", match: a });
  }
  return findings;
}

/**
 * 9. (W18.2) The fa gauges and chart pages: see the rule list above. `html` is the page without its price
 * elements (a gauge never sits inside one); `h1` the page's H1 (a chart page's product name follows its prefix).
 */
export function scanGaugesAndCharts(path: string, html: string, h1: string, byVariant: ReadonlyMap<string, PublishedPriceRow>, input: PriceGateInput): PriceFinding[] {
  const out: PriceFinding[] = [];
  const fail = (match: string) => out.push({ file: path, kind: "price_gauge_not_allowed", match });
  const elements = elementsWithAttribute(html, [PRICE_GAUGE_ATTRIBUTE, PRICE_CHART_ATTRIBUTE]);
  let linesInside = 0;
  for (const el of elements) {
    const where = `${el.attribute}="${el.value}"`;
    const row = byVariant.get(el.value);
    const day = row ? tehranDay(row.published_at) : null;
    if (!row || !day || input.variants.get(el.value)?.eligible === false) {
      fail(`${where}: no eligible published price`);
      continue;
    }
    const history = input.history.get(el.value) ?? [];
    const windows = priceWindows(history, day);
    if (windows.length === 0) {
      fail(`${where}: the snapshot history gives no window`);
      continue;
    }
    // Lines: each draws a window's points (a gauge: the 90-day trend; a chart: its 30- or 90-day view).
    const counts = el.attribute === PRICE_GAUGE_ATTRIBUTE ? [windowPoints(history, day, PRICE_CHART_WINDOW_DAYS).length] : [30, 90].map((d) => windowPoints(history, day, d).length);
    for (const m of el.html.matchAll(new RegExp(`<svg\\b[^>]*\\s${PRICE_LINE_ATTRIBUTE}="(\\d+)"[^>]*>([\\s\\S]*?)</svg>`, "g"))) {
      linesInside++;
      const line = /<path\b[^>]*\bd="([^"]*)"[^>]*stroke-linejoin/.exec(m[2])?.[1] ?? "";
      if (!counts.includes(Number(m[1])) || pathPointCount(line) !== Number(m[1])) fail(`${where}: a line draws ${m[1]}/${pathPointCount(line)} point(s), the snapshot has ${counts.join(" or ")}`);
    }
    // Text: the drivers line (indicator gate) out, the rest is copy + recomputed numbers.
    const text = visibleText(withoutElements(el.html, elementsWithAttribute(el.html, [INDICATOR_LINE_ATTRIBUTE, INDICATOR_ATTRIBUTE])));
    const allowed =
      el.attribute === PRICE_GAUGE_ATTRIBUTE
        ? allowedGaugeTexts(windows, PRICE_CHART_WINDOW_DAYS, true)
        : allowedChartTexts(chartHeadingProduct(h1), windowPoints(history, day, PRICE_CHART_WINDOW_DAYS), day);
    const left = residue(text, allowed);
    if (left) fail(`${where}: ${left.slice(0, 120)}`);
  }
  const allLines = (html.match(new RegExp(`\\s${PRICE_LINE_ATTRIBUTE}="`, "g")) ?? []).length;
  if (allLines !== linesInside) fail(`${allLines - linesInside} price line(s) outside a gauge or a chart`);
  return out;
}

const SPARKLINE = new RegExp(`${PRICE_SPARKLINE_ATTRIBUTE}="([^"]*)"`, "g");
const SPARKLINE_POINT = /[ML]-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?/g;

/**
 * W9.6: a chart only inside a fa price BLOCK, only when the snapshot gives its variant ≥ 7 daily points in
 * the 30 days ending on the current price's day, and drawing exactly that many points (its attribute and its
 * line path). Anything else — a chart in a cell, for an unpriced variant, or a count that disagrees — fails.
 */
export function scanSparklines(path: string, el: PriceElement, row: PublishedPriceRow | null, history: ReadonlyMap<string, DailyPoint[]>): PriceFinding[] {
  const out: PriceFinding[] = [];
  const charts = [...el.html.matchAll(SPARKLINE)];
  if (charts.length === 0) return out;
  const where = `${el.attribute}="${el.value}"`;
  if (el.attribute !== PRICE_BLOCK_ATTRIBUTE || charts.length > 1 || !row) return [{ file: path, kind: "price_sparkline_not_allowed", match: `${where}: ${charts.length} chart(s) outside a priced block` }];
  const day = tehranDay(row.published_at);
  const series = day ? sparklineSeries(history.get(row.canonical_variant_id) ?? [], day) : null;
  const drawn = Number(charts[0][1]);
  // The line is the path with stroke-linejoin (the end marker is a separate one-point path).
  const line = /<path\b[^>]*\bd="([^"]*)"[^>]*stroke-linejoin/.exec(el.html)?.[1] ?? "";
  const linePoints = (line.match(SPARKLINE_POINT) ?? []).length;
  if (!series) out.push({ file: path, kind: "price_sparkline_not_allowed", match: `${where}: the snapshot has fewer than the minimum daily points` });
  else if (drawn !== series.length || linePoints !== series.length) out.push({ file: path, kind: "price_sparkline_not_allowed", match: `${where}: draws ${drawn}/${linePoints} point(s), the snapshot has ${series.length}` });
  return out;
}

/** Product pages: `products/<slug>.html` and `ar/products/<slug>.html` (en never; the lists/categories never). */
const OFFER_PAGE = /^(ar\/)?products\/(?!category\/)[^/]+\.html$/;
const OFFER_ID = /#offer-(CVAR-[A-Za-z0-9-]+)$/;
const OFFER_KEYS = ["@id", "@type", "price", "priceCurrency", "priceSpecification"];
const SPEC_KEYS = ["@type", "price", "priceCurrency", "referenceQuantity", "valueAddedTaxIncluded"];
const QUANTITY_KEYS = ["@type", "unitCode", "value"];

/**
 * 8. (W20.7) Every JSON-LD `offers` / `Offer` / price key in a page: allowed only on a fa/ar product page, and
 * each Offer is exactly the lowest published price of its variant, per kg, IRR, VAT included.
 */
export function scanOfferJsonLd(path: string, html: string, byVariant: ReadonlyMap<string, PublishedPriceRow>): PriceFinding[] {
  const out: PriceFinding[] = [];
  const fail = (match: string) => out.push({ file: path, kind: "price_jsonld_not_allowed", match });
  const allowedPage = OFFER_PAGE.test(path) && fileLocale(path) !== "en";
  for (const block of jsonLdBlocks(html)) {
    let doc: unknown;
    try {
      doc = JSON.parse(block);
    } catch {
      continue; // the publication gate reports unparseable JSON-LD
    }
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      const o = node as Record<string, unknown>;
      if ("offers" in o) {
        if (!allowedPage) fail("offers outside a fa/ar product page");
        else if (o["@type"] !== "Product" || !Array.isArray(o.offers) || o.offers.length === 0) fail("offers must be a non-empty list on a Product");
        else for (const offer of o.offers) checkOffer(offer);
        for (const [k, v] of Object.entries(o)) if (k !== "offers") visit(v);
        return;
      }
      if (o["@type"] === "Offer" || o["@type"] === "UnitPriceSpecification" || "price" in o || "priceCurrency" in o) fail(`${String(o["@type"] ?? "a node")} with a price outside Product.offers`);
      Object.values(o).forEach(visit);
    };
    const checkOffer = (offer: unknown): void => {
      const o = (offer ?? {}) as Record<string, unknown>;
      const xid = OFFER_ID.exec(String(o["@id"] ?? ""))?.[1];
      const row = xid ? byVariant.get(xid) : undefined;
      const where = xid ?? String(o["@id"] ?? "?");
      if (!row) return void fail(`${where}: an offer without a published price`);
      const spec = (o.priceSpecification ?? {}) as Record<string, unknown>;
      const qty = (spec.referenceQuantity ?? {}) as Record<string, unknown>;
      const same = (obj: Record<string, unknown>, keys: string[]) => Object.keys(obj).sort().join(",") === [...keys].sort().join(",");
      if (o["@type"] !== "Offer" || !same(o, OFFER_KEYS)) fail(`${where}: offer keys ${Object.keys(o).sort().join(",")}`);
      if (spec["@type"] !== "UnitPriceSpecification" || !same(spec, SPEC_KEYS)) fail(`${where}: priceSpecification keys ${Object.keys(spec).sort().join(",")}`);
      if (qty["@type"] !== "QuantitativeValue" || !same(qty, QUANTITY_KEYS) || qty.value !== 1 || qty.unitCode !== "KGM") fail(`${where}: referenceQuantity must be 1 KGM`);
      if (o.price !== row.price_irr_per_kg || spec.price !== row.price_irr_per_kg) fail(`${where}: price ${JSON.stringify(o.price)}/${JSON.stringify(spec.price)} is not the lowest published price (${row.price_irr_per_kg})`);
      if (o.priceCurrency !== "IRR" || spec.priceCurrency !== "IRR" || spec.valueAddedTaxIncluded !== true) fail(`${where}: must be IRR, VAT included`);
    };
    visit(doc);
  }
  return out;
}
