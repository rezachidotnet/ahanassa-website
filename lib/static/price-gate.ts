import { irrToToman, PUBLISHED_PRICE_COLUMNS, PUBLISHED_PRICE_HISTORY_COLUMNS, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { PRICE_BLOCK_COPY } from "../pricing/price-block-presentation.ts";
import { allowedPriceTexts, AR_PRICE_COPY, PRICE_BLOCK_ATTRIBUTE, PRICE_BLOCK_ON_REQUEST, PRICE_CELL_ATTRIBUTE, PRICE_CHANGE_COPY, PRICE_CHANGE_WORDS, PRICE_COLUMN_COPY, PRICE_DISCLAIMER, PRICE_SPARKLINE_ATTRIBUTE, PRICE_TREND_COPY, priceDateLabel, renderedAmount, type PriceLocale } from "../pricing/product-page-price.ts";
import { PRICE_RFQ_COPY, RFQ_FACTORY_PARAM } from "../pricing/price-rfq.ts";
import { isDailyPriceEligible } from "../pricing/daily-price-eligibility.ts";
import { sparklineSeries, tehranDay, type DailyPoint } from "../pricing/price-history.ts";
import { CALCULATOR_PRICE_PAGES, fileLocale } from "./leak-scan.ts";

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
 * 3. ar pages: price cells only (no PriceBlock); their text is the amount + date label + the ar copy, and
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
 * The pricing-API field names, source-like keys and factory codes are refused in every public file by the
 * leak scan (lib/static/leak-scan.ts, kind `pricing_field`); JSON-LD offers/price by the publication gate.
 */
export interface PriceFinding {
  file: string;
  kind: "price_field_not_allowed" | "price_text_not_allowed" | "price_unknown_variant" | "price_outside_markup" | "price_on_en_page" | "price_fa_field_on_ar_page" | "calculator_price_not_allowed" | "price_excluded_variant" | "price_sparkline_not_allowed";
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
  return { rows, variants, history, findings };
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
  const out: PriceElement[] = [];
  const opener = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\s(${PRICE_CELL_ATTRIBUTE}|${PRICE_BLOCK_ATTRIBUTE})="([^"]*)"[^>]*>`, "gi");
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
const FA_ONLY_MARKERS = [PRICE_SPARKLINE_ATTRIBUTE, PRICE_TREND_COPY.fa, `&amp;${RFQ_FACTORY_PARAM}=`, `&${RFQ_FACTORY_PARAM}=`, `?${RFQ_FACTORY_PARAM}=`];
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
  const amounts = { fa: [...new Set(input.rows.map((r) => renderedAmount(r, "fa")))], ar: [...new Set(input.rows.map((r) => renderedAmount(r, "ar")))] };
  const names = [...new Set(input.rows.flatMap((r) => [r.factory_name_fa, r.location_fa]))];
  const times = [...new Set(input.rows.flatMap((r) => [r.published_at, new Date(r.published_at).toISOString()]))];

  for (const { path, content } of files) {
    const locale = fileLocale(path);
    if (locale === "en") {
      // 4. No price on en — in the HTML, the RSC payload and any locale JSON.
      const forbidden = ["data-aa-price", "tomanPerKg", ...FA_PRICE_COPY, ...FA_ONLY_MARKERS, ...CHANGE_MARKERS, ...AR_COPY, ...amounts.fa, ...amounts.ar, ...names];
      for (const s of forbidden) if (content.includes(s)) findings.push({ file: path, kind: "price_on_en_page", match: s.trim() });
      continue;
    }
    if (locale === "ar") {
      // 3. ar is price only: none of the fa-only fields, anywhere in the file (HTML and payload).
      const forbidden = [PRICE_BLOCK_ATTRIBUTE, ...FA_PRICE_COPY, ...FA_ONLY_MARKERS, ...amounts.fa, ...names, ...times];
      for (const s of forbidden) if (content.includes(s)) findings.push({ file: path, kind: "price_fa_field_on_ar_page", match: s.trim() });
    }
    if (locale !== "fa" && locale !== "ar") continue;
    // 5. The calculator's price map (fa/ar calculator pages only; elsewhere the leak scan refuses it).
    if (CALCULATOR_PRICE_PAGES.includes(path)) findings.push(...scanCalculatorPrices(path, content, locale, byVariant, input.variants));
    if (!path.endsWith(".html")) continue;
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
      const row = variant ? (byVariant.get(variant.xid) ?? null) : null;
      findings.push(...scanSparklines(path, el, row, input.history));
      if (el.attribute === PRICE_BLOCK_ATTRIBUTE && variant && !row) findings.push({ file: path, kind: "price_unknown_variant", match: `${el.attribute}="${el.value}" has no published price` });
      const productName = locale === "fa" && el.attribute === PRICE_BLOCK_ATTRIBUTE ? (variant ? `${h1} ${variant.size}` : h1) : undefined;
      const left = residue(visibleText(el.html), allowedPriceTexts(row, locale, productName));
      if (left) findings.push({ file: path, kind: "price_text_not_allowed", match: `${el.attribute}="${el.value}": ${left.slice(0, 120)}` });
    }
    outside += content.slice(cursor);
    const outsideText = visibleText(outside);
    for (const a of amounts[locale]) if (outsideText.includes(a)) findings.push({ file: path, kind: "price_outside_markup", match: a });
  }
  return findings;
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
