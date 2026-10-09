import { PUBLISHED_PRICE_COLUMNS, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { PRICE_BLOCK_COPY } from "../pricing/price-block-presentation.ts";
import { allowedPriceTexts, PRICE_BLOCK_ATTRIBUTE, PRICE_BLOCK_ON_REQUEST, PRICE_CELL_ATTRIBUTE, PRICE_COLUMN_COPY, renderedAmount } from "../pricing/product-page-price.ts";
import { fileLocale } from "./leak-scan.ts";

/**
 * W9.4 price gate — the price half of the publication gate, run by the artifact gate on every
 * artifact (lib/static/artifact-gate.ts). Pure. Owner decisions D-PRICE-DISPLAY / D-PRICE-AGE / D-W10-4.
 *
 * 1. Private snapshot: `published_prices` rows carry exactly PUBLISHED_PRICE_COLUMNS (the rendered
 *    fields) — any other field fails, even though the snapshot schema already refuses it.
 * 2. Persian pages: the text inside every price element (`data-aa-price-cell` / `data-aa-price-block`)
 *    is exactly the allow-listed, rendered fields of THAT variant's snapshot row (amount in Toman,
 *    factory, delivery location, date, change) plus the fixed copy — anything else fails. An element
 *    for a variant without a price may show only the fixed copy («استعلام قیمت», the CTA). A rendered
 *    amount outside a price element fails.
 * 3. en/ar pages and every other public file of those locales: no price at all — no price element,
 *    no price copy, no amount, no factory or delivery-location name.
 *
 * The pricing-API field names and factory codes are refused in every public file by the leak scan
 * (lib/static/leak-scan.ts, kind `pricing_field`); JSON-LD offers/price by the publication gate.
 */
export interface PriceFinding {
  file: string;
  kind: "price_field_not_allowed" | "price_text_not_allowed" | "price_unknown_variant" | "price_outside_markup" | "price_on_non_persian_page";
  match: string;
}

interface VariantInfo {
  xid: string;
  size: string;
}

export interface PriceGateInput {
  rows: PublishedPriceRow[];
  variants: Map<string, VariantInfo>;
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
  const variants = new Map<string, VariantInfo>();
  for (const v of (tables.product_variants ?? []) as Record<string, unknown>[]) {
    if (typeof v?.xid !== "string") continue;
    variants.set(v.xid, { xid: v.xid, size: String(v.commercial_size ?? v.section_size ?? v.sku ?? "") });
  }
  return { rows, variants, findings };
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

/** Copy that only a price element shows; on en/ar it must never appear. */
const PRICE_ONLY_COPY = [PRICE_BLOCK_COPY.unit, PRICE_BLOCK_COPY.vat, PRICE_BLOCK_COPY.askToday, PRICE_BLOCK_COPY.missing, PRICE_COLUMN_COPY.note, `${PRICE_BLOCK_COPY.title} `];

export function scanPrices(files: ReadonlyArray<{ path: string; content: string }>, input: PriceGateInput): PriceFinding[] {
  const findings: PriceFinding[] = [...input.findings];
  const byVariant = new Map(input.rows.map((r) => [r.canonical_variant_id, r]));
  const amounts = [...new Set(input.rows.map(renderedAmount))];
  const names = [...new Set(input.rows.flatMap((r) => [r.factory_name_fa, r.location_fa]))];

  for (const { path, content } of files) {
    const locale = fileLocale(path);
    if (locale === "en" || locale === "ar") {
      // 3. No price on en/ar — in the HTML, the RSC payload and any locale JSON.
      if (content.includes("data-aa-price")) findings.push({ file: path, kind: "price_on_non_persian_page", match: "data-aa-price" });
      for (const s of [...PRICE_ONLY_COPY, ...amounts, ...names]) if (content.includes(s)) findings.push({ file: path, kind: "price_on_non_persian_page", match: s.trim() });
      continue;
    }
    if (!path.endsWith(".html")) continue;
    // 2. Persian pages: allow-listed text inside every price element, no amount outside one.
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
      const row = variant ? (byVariant.get(variant.xid) ?? null) : null;
      if (el.attribute === PRICE_BLOCK_ATTRIBUTE && variant && !row) findings.push({ file: path, kind: "price_unknown_variant", match: `${el.attribute}="${el.value}" has no published price` });
      const productName = el.attribute === PRICE_BLOCK_ATTRIBUTE ? (variant ? `${h1} ${variant.size}` : h1) : undefined;
      const left = residue(visibleText(el.html), allowedPriceTexts(row, productName));
      if (left) findings.push({ file: path, kind: "price_text_not_allowed", match: `${el.attribute}="${el.value}": ${left.slice(0, 120)}` });
    }
    outside += content.slice(cursor);
    const outsideText = visibleText(outside);
    for (const a of amounts) if (outsideText.includes(a)) findings.push({ file: path, kind: "price_outside_markup", match: a });
  }
  return findings;
}
