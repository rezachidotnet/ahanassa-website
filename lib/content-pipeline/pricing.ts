import { publishedPriceRow, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";

/**
 * W9.4 — Odoo public pricing API v1 (`GET /api/v1/pricing/current`) for the content pipeline.
 * Owner decisions D-PRICE-DISPLAY / D-PRICE-AGE (docs/OWNER_DECISIONS.md 2026-10-07/08),
 * contract docs/contracts/SNAPSHOT_V1.md §published_prices.
 *
 * The website ALLOW-LISTS the response: every key the documented v1 contract has is listed below,
 * either as RENDERED (it reaches the snapshot) or READ (only checked here, then dropped).
 *
 * Owner decisions on W9.4 (2026-10-09, docs/OWNER_DECISIONS.md):
 * - Any OTHER key, anywhere in the response, is IGNORED: never stored, never rendered, reported as a
 *   warning in the run summary. It never stops a publish.
 * - A missing or invalid KNOWN field makes the price set invalid.
 * - An invalid set, or a failed fetch, fails the run ONLY when the live site already shows prices
 *   (the active publication's `prices_published` > 0). Otherwise the run builds with an EMPTY price set
 *   and says so clearly in the summary — a pricing problem never blocks a catalog update, and never
 *   silently wipes prices the site shows.
 *
 * Pure: no I/O, no clock (the caller passes the fetch time).
 */

/** Row keys of `data[]`. `basis_note`, `unit`, `currency`, `id`, `sku`, `canonical_template_id` are read, never stored. */
export const PRICING_ROW_KEYS = new Set([
  "id",
  "canonical_id",
  "canonical_template_id",
  "sku",
  "unit",
  "currency",
  "vat_included",
  "price_irr_per_kg",
  "price_on_request",
  "published_at_utc",
  "factory",
  "location",
  "previous",
  "basis_note",
]);
/** `previous`: a superseded price point. Only its numeric price and time are stored. */
export const PRICING_POINT_KEYS = new Set(["price_irr_per_kg", "price_on_request", "published_at_utc", "factory", "location"]);
/** `factory`: only `name.fa` is stored; `code` and the en/ar names are read, never stored. */
export const PRICING_FACTORY_KEYS = new Set(["code", "name"]);
export const PRICING_I18N_KEYS = new Set(["fa", "en", "ar"]);
export const PRICING_META_KEYS = new Set(["total", "updated_at_utc", "unit", "currency", "vat_included"]);
export const PRICING_ENVELOPE_KEYS = new Set(["data", "meta"]);

export const PRICING_CURRENT_PATH = "/api/v1/pricing/current";

/** Sanity bounds for one kilogram of steel, in IRR (catches a per-ton or Toman/Rial mix-up). Parameter. */
export const PRICE_IRR_PER_KG_BOUNDS = { min: 10_000, max: 100_000_000 } as const;
/** A published_at_utc later than the fetch time by more than this is "in the future". */
export const PRICE_CLOCK_SKEW_MS = 10 * 60_000;
/** The pricing API did not exist before this; an older timestamp is not sane. */
export const PRICE_EARLIEST_UTC = "2026-01-01T00:00:00Z";

const API_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/**
 * What the fetch step keeps (lib/content-pipeline/odoo-source.ts): the raw JSON body is checked
 * by `validatePricing`. The fetch never throws for pricing; `status` records what happened.
 * - "ok": HTTP 200 with a JSON body.
 * - "not_deployed": HTTP 404 — the API is not live.
 * - "failed": any other status, a timeout, a network error or a non-JSON body (`error` says which).
 */
export interface PricingSource {
  status: "ok" | "not_deployed" | "failed";
  http_status: number | null;
  etag: string | null;
  body: unknown;
  error?: string;
}

/** What the run summary says about prices (one line). */
export type PricingOutcome = "published" | "empty_not_deployed" | "empty_fetch_failed" | "empty_invalid" | "blocked";

export interface PricingValidation {
  errors: string[];
  warnings: string[];
  /** Snapshot rows (only when the set is valid; otherwise empty). */
  rows: PublishedPriceRow[];
  /** Ignored unknown fields, as generic paths (e.g. `row.source`, `factory.url`). */
  ignored: string[];
  outcome: PricingOutcome;
  /** One clear line for the run summary. */
  summary: string;
  counts: { prices_published: number; prices_on_request: number };
}

interface CatalogIdentity {
  canonical_id: string;
  canonical_template_id: string;
  sku: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nonBlank = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** Unknown keys are collected (deduplicated by their generic path) and ignored — never an error (owner 2026-10-09). */
function unknownKeys(where: string, value: Record<string, unknown>, allowed: ReadonlySet<string>, ignored: Set<string>): void {
  const generic = where.replace(/^(CVAR-[^.]*|data\[\d+\])/, "row");
  for (const k of Object.keys(value)) if (!allowed.has(k)) ignored.add(`${generic}.${k}`);
}

function checkI18n(where: string, value: unknown, errors: string[], ignored: Set<string>): Record<string, unknown> | null {
  if (value === null) return null;
  if (!isObject(value)) {
    errors.push(`pricing: ${where}: not an object`);
    return null;
  }
  unknownKeys(where, value, PRICING_I18N_KEYS, ignored);
  for (const [k, v] of Object.entries(value)) if (v !== null && typeof v !== "string") errors.push(`pricing: ${where}.${k}: not a string or null`);
  return value;
}

function checkFactory(where: string, value: unknown, errors: string[], ignored: Set<string>): Record<string, unknown> | null {
  if (value === null) return null;
  if (!isObject(value)) {
    errors.push(`pricing: ${where}: not an object`);
    return null;
  }
  unknownKeys(where, value, PRICING_FACTORY_KEYS, ignored);
  return checkI18n(`${where}.name`, value.name ?? null, errors, ignored);
}

function checkTime(where: string, value: unknown, fetchedAt: string, errors: string[]): string | null {
  if (typeof value !== "string" || !API_UTC.test(value) || Number.isNaN(Date.parse(value))) {
    errors.push(`pricing: ${where}: "${String(value)}" is not an ISO 8601 UTC timestamp (YYYY-MM-DDTHH:MM:SSZ)`);
    return null;
  }
  if (value < PRICE_EARLIEST_UTC) errors.push(`pricing: ${where}: ${value} is before ${PRICE_EARLIEST_UTC}`);
  if (Date.parse(value) > Date.parse(fetchedAt) + PRICE_CLOCK_SKEW_MS) errors.push(`pricing: ${where}: ${value} is in the future (fetched ${fetchedAt})`);
  return value;
}

function checkPrice(where: string, value: unknown, errors: string[]): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    errors.push(`pricing: ${where}: ${JSON.stringify(value)} is not a positive integer`);
    return null;
  }
  if (value < PRICE_IRR_PER_KG_BOUNDS.min || value > PRICE_IRR_PER_KG_BOUNDS.max) {
    errors.push(`pricing: ${where}: ${value} IRR/kg is outside the sanity bounds ${PRICE_IRR_PER_KG_BOUNDS.min}–${PRICE_IRR_PER_KG_BOUNDS.max}`);
    return null;
  }
  return value;
}

/**
 * Validates the pricing source against the catalog fetched in the same run and returns the snapshot
 * rows. `catalog` = the active variants of `GET /api/v1/catalog/products`; `previousPricesPublished` =
 * the active publication's `prices_published` count (null when unknown).
 */
export function validatePricing(source: PricingSource | undefined, catalog: readonly CatalogIdentity[], fetchedAt: string, previousPricesPublished: number | null = null): PricingValidation {
  const problems: string[] = [];
  const ignored = new Set<string>();
  const live = previousPricesPublished !== null && previousPricesPublished > 0;
  /**
   * The set cannot be used: fail the run only when the live site shows prices; otherwise build with
   * an empty price set and report it as a warning (owner decision 2026-10-09).
   */
  const unusable = (outcome: "empty_not_deployed" | "empty_fetch_failed" | "empty_invalid", why: string, details: string[] = []): PricingValidation => {
    const ignoredList = [...ignored].sort();
    if (live) {
      const summary = `BLOCKED: ${why}, and the live site shows ${previousPricesPublished} price(s); refusing to publish without them`;
      return { errors: [`pricing: ${summary}`, ...details], warnings: [], rows: [], ignored: ignoredList, counts: { prices_published: 0, prices_on_request: 0 }, outcome: "blocked", summary };
    }
    const summary = `EMPTY PRICE SET: ${why}; no price is shown (the live site shows none either), the catalog publishes normally`;
    return { errors: [], warnings: [`pricing: ${summary}`, ...details, ...ignoredWarnings(ignoredList)], rows: [], ignored: ignoredList, counts: { prices_published: 0, prices_on_request: 0 }, outcome, summary };
  };

  if (!source || source.status === "not_deployed") return unusable("empty_not_deployed", `${PRICING_CURRENT_PATH} is not deployed (HTTP ${source?.http_status ?? "not fetched"})`);
  if (source.status === "failed") return unusable("empty_fetch_failed", `GET ${PRICING_CURRENT_PATH} failed (${source.error ?? `HTTP ${source.http_status ?? "?"}`})`);

  const errors = problems;
  const body = source.body;
  if (!isObject(body) || !Array.isArray(body.data) || !isObject(body.meta)) return unusable("empty_invalid", "the pricing response is not {data: [...], meta: {...}}");
  unknownKeys("response", body, PRICING_ENVELOPE_KEYS, ignored);
  const meta = body.meta;
  unknownKeys("meta", meta, PRICING_META_KEYS, ignored);
  if (meta.unit !== "kg" || meta.currency !== "IRR" || meta.vat_included !== true) errors.push(`pricing: meta: unit/currency/vat_included must be kg/IRR/true (got ${JSON.stringify([meta.unit, meta.currency, meta.vat_included])})`);
  if (meta.total !== body.data.length) errors.push(`pricing: meta.total ${JSON.stringify(meta.total)} differs from ${body.data.length} rows`);
  const metaUpdated = meta.updated_at_utc === null ? null : checkTime("meta.updated_at_utc", meta.updated_at_utc, fetchedAt, errors);

  const byId = new Map(catalog.map((c) => [c.canonical_id, c]));
  const seen = new Set<string>();
  const rows: PublishedPriceRow[] = [];
  let onRequest = 0;
  // Assigned inside the forEach callback (TS cannot see that), hence the widened initializer.
  let newest = null as string | null;

  body.data.forEach((raw, i) => {
    if (!isObject(raw)) {
      errors.push(`pricing: data[${i}]: not an object`);
      return;
    }
    const id = typeof raw.canonical_id === "string" ? raw.canonical_id : `data[${i}]`;
    const where = `${id}`;
    unknownKeys(where, raw, PRICING_ROW_KEYS, ignored);
    const variant = byId.get(id);
    if (!variant) errors.push(`pricing: ${where}: not an active variant of the catalog fetched in this run`);
    else {
      if (raw.canonical_template_id !== variant.canonical_template_id) errors.push(`pricing: ${where}: canonical_template_id ${JSON.stringify(raw.canonical_template_id)} differs from the catalog (${variant.canonical_template_id})`);
      if (raw.sku !== variant.sku) errors.push(`pricing: ${where}: sku ${JSON.stringify(raw.sku)} differs from the catalog (${variant.sku})`);
    }
    if (seen.has(id)) errors.push(`pricing: ${where}: duplicate row`);
    seen.add(id);
    if (raw.unit !== "kg" || raw.currency !== "IRR" || raw.vat_included !== true) errors.push(`pricing: ${where}: unit/currency/vat_included must be kg/IRR/true`);
    checkI18n(`${where}.basis_note`, raw.basis_note ?? null, errors, ignored);
    const factory = checkFactory(`${where}.factory`, raw.factory ?? null, errors, ignored);
    const location = checkI18n(`${where}.location`, raw.location ?? null, errors, ignored);

    if (raw.price_on_request === true) {
      onRequest++;
      if (raw.price_irr_per_kg !== null || raw.published_at_utc !== null || raw.factory !== null || raw.location !== null || raw.previous !== null) errors.push(`pricing: ${where}: price_on_request row carries a price, time, factory, location or previous`);
      return;
    }
    if (raw.price_on_request !== false) {
      errors.push(`pricing: ${where}: price_on_request must be true or false`);
      return;
    }
    const price = checkPrice(`${where}.price_irr_per_kg`, raw.price_irr_per_kg, errors);
    const publishedAt = checkTime(`${where}.published_at_utc`, raw.published_at_utc, fetchedAt, errors);
    const factoryFa = factory?.fa;
    const locationFa = location?.fa;
    if (!nonBlank(factoryFa)) errors.push(`pricing: ${where}: factory.name.fa is missing`);
    if (!nonBlank(locationFa)) errors.push(`pricing: ${where}: location.fa is missing`);

    let previousPrice: number | null = null;
    let previousAt: string | null = null;
    if (raw.previous !== null && raw.previous !== undefined) {
      const p = raw.previous;
      if (!isObject(p)) errors.push(`pricing: ${where}.previous: not an object`);
      else {
        unknownKeys(`${where}.previous`, p, PRICING_POINT_KEYS, ignored);
        checkFactory(`${where}.previous.factory`, p.factory ?? null, errors, ignored);
        checkI18n(`${where}.previous.location`, p.location ?? null, errors, ignored);
        // "If either side is on request, there is no % change" (API v1): an on-request previous is not stored.
        if (p.price_on_request === false) {
          previousPrice = checkPrice(`${where}.previous.price_irr_per_kg`, p.price_irr_per_kg, errors);
          previousAt = checkTime(`${where}.previous.published_at_utc`, p.published_at_utc, fetchedAt, errors);
          if (previousAt && publishedAt && previousAt >= publishedAt) errors.push(`pricing: ${where}: previous.published_at_utc ${previousAt} is not before published_at_utc ${publishedAt}`);
        } else if (p.price_on_request !== true) errors.push(`pricing: ${where}.previous.price_on_request must be true or false`);
      }
    }
    if (publishedAt && (newest === null || publishedAt > newest)) newest = publishedAt;
    if (price === null || publishedAt === null || !nonBlank(factoryFa) || !nonBlank(locationFa)) return;
    const row = publishedPriceRow.safeParse({
      canonical_variant_id: id,
      price_irr_per_kg: price,
      vat_included: 1,
      factory_name_fa: factoryFa.trim(),
      location_fa: locationFa.trim(),
      published_at: publishedAt,
      previous_price_irr_per_kg: previousPrice !== null && previousAt !== null ? previousPrice : null,
      previous_published_at: previousPrice !== null && previousAt !== null ? previousAt : null,
    });
    if (!row.success) errors.push(`pricing: ${where}: ${row.error.issues.map((x) => x.message).join("; ")}`);
    else rows.push(row.data);
  });

  if (newest && metaUpdated && metaUpdated < newest) errors.push(`pricing: meta.updated_at_utc ${metaUpdated} is older than the newest published_at_utc ${newest}`);
  if (errors.length) return unusable("empty_invalid", `the pricing response is invalid (${errors.length} problem(s), first: ${errors[0].replace(/^pricing: /, "")})`, errors.slice(0, 20));
  rows.sort((a, b) => (a.canonical_variant_id < b.canonical_variant_id ? -1 : 1));
  const ignoredList = [...ignored].sort();
  const summary = `${rows.length} price(s) published, ${onRequest} on request${ignoredList.length ? `; ${ignoredList.length} unknown field(s) ignored` : ""}`;
  return { errors: [], warnings: ignoredWarnings(ignoredList), rows, ignored: ignoredList, counts: { prices_published: rows.length, prices_on_request: onRequest }, outcome: "published", summary };
}

function ignoredWarnings(ignored: readonly string[]): string[] {
  return ignored.length ? [`pricing: ignored ${ignored.length} field(s) the website does not know (never stored or rendered): ${ignored.join(", ")}`] : [];
}

