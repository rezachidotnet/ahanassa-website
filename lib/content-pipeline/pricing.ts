import { publishedFactoryPriceRow, publishedImportedPriceRow, publishedPriceRow, type PublishedFactoryPriceRow, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";

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
 * W20.7 — `factory_prices` (Odoo W20.6, additive): every factory's current price of the variant, kept for the
 * fa price page (snapshot table `published_factory_prices`). It never decides the run: when it is absent (an
 * Odoo before W20.6) or any of it is invalid or inconsistent with the v1 lowest fields, ALL factory rows are
 * dropped with a warning and the lowest prices publish exactly as before — the fa page then shows the lowest
 * per size, as it did before W20.7. Never half a set: one bad row drops every factory row.
 *
 * W34 — imported prices (Odoo W9.14, owner decision 2026-10-21: domestic and imported are never compared or mixed).
 * Additive, and optional both ways — the same code reads an Odoo before and after W9.14:
 * - `factory.is_imported` (boolean) on every factory object. Absent = an Odoo before W9.14 = domestic. The v1 factory
 *   of a priced row must be domestic; `imported_lowest.factory` must be imported.
 * - `imported_lowest`: the variant's lowest IMPORTED price (price, time, factory = the origin «وارداتی (چین)», location,
 *   previous), or null. It is read BEFORE the "price on request" return: an imported-only variant has the v1 "no price"
 *   shape. It becomes a `published_imported_prices` row (the v1 fields stay the domestic lowest, `published_prices`).
 * - `factory_prices` lists both origins: each origin is checked against its own lowest (one `is_lowest` per origin,
 *   none below it). Only the domestic ones are stored (`published_factory_prices`); the imported ones are read only.
 * A problem in the imported data drops EVERY imported row with a warning (never half a set) and never touches the
 * domestic prices — except when the live site already shows imported prices (`previousImportedPublished` > 0): then
 * the run is blocked, as for the domestic set, so a bad response never silently wipes what the site shows.
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
  "factory_prices",
  "imported_lowest",
]);
/** W20.7: one `factory_prices` row. `factory.code`, the en/ar names and `change_pct` are read, never stored. */
export const PRICING_FACTORY_PRICE_KEYS = new Set(["factory", "location", "price_irr_per_kg", "published_at_utc", "previous", "change_pct", "is_lowest"]);
/** W20.7: `factory_prices[].previous` — that factory's superseded price. */
export const PRICING_FACTORY_PREVIOUS_KEYS = new Set(["price_irr_per_kg", "published_at_utc"]);
/** `previous`: a superseded price point. Only its numeric price and time are stored. */
export const PRICING_POINT_KEYS = new Set(["price_irr_per_kg", "price_on_request", "published_at_utc", "factory", "location"]);
/** `factory`: only `name.fa` is stored; `code`, the en/ar names and `is_imported` (W34) are read, never stored. */
export const PRICING_FACTORY_KEYS = new Set(["code", "name", "is_imported"]);
/** W34: `imported_lowest` — the variant's lowest imported price (an imported price is never "on request"). */
export const PRICING_IMPORTED_KEYS = new Set(["price_irr_per_kg", "published_at_utc", "factory", "location", "previous"]);
/** W34: `imported_lowest.previous` — the imported lowest of an earlier day. Only its price and time are stored. */
export const PRICING_IMPORTED_PREVIOUS_KEYS = new Set(["price_irr_per_kg", "published_at_utc", "factory", "location"]);
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
  /** W20.7: every factory's price (only when the set is valid AND every `factory_prices` is valid; otherwise empty). */
  factoryRows: PublishedFactoryPriceRow[];
  /** W34: the lowest imported price per variant (only when the set is valid AND all imported data is valid; otherwise empty). */
  importedRows: PublishedPriceRow[];
  /** Ignored unknown fields, as generic paths (e.g. `row.source`, `factory.url`). */
  ignored: string[];
  outcome: PricingOutcome;
  /** One clear line for the run summary. */
  summary: string;
  counts: { prices_published: number; prices_on_request: number; prices_imported: number };
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

/** W34: `factory.is_imported` — true/false, or null when the key is absent (an Odoo before W9.14: domestic). */
function factoryIsImported(where: string, value: unknown, errors: string[]): boolean | null {
  if (!isObject(value) || !Object.hasOwn(value, "is_imported")) return null;
  if (typeof value.is_imported !== "boolean") {
    errors.push(`pricing: ${where}.is_imported: not true or false`);
    return null;
  }
  return value.is_imported;
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
export function validatePricing(source: PricingSource | undefined, catalog: readonly CatalogIdentity[], fetchedAt: string, previousPricesPublished: number | null = null, previousImportedPublished: number | null = null): PricingValidation {
  const problems: string[] = [];
  const ignored = new Set<string>();
  // W34: the live site shows prices when it shows a domestic OR an imported one.
  const liveCount = (previousPricesPublished ?? 0) + (previousImportedPublished ?? 0);
  const live = liveCount > 0;
  /**
   * The set cannot be used: fail the run only when the live site shows prices; otherwise build with
   * an empty price set and report it as a warning (owner decision 2026-10-09).
   */
  const unusable = (outcome: "empty_not_deployed" | "empty_fetch_failed" | "empty_invalid", why: string, details: string[] = []): PricingValidation => {
    const ignoredList = [...ignored].sort();
    if (live) {
      const summary = `BLOCKED: ${why}, and the live site shows ${liveCount} price(s); refusing to publish without them`;
      return { errors: [`pricing: ${summary}`, ...details], warnings: [], rows: [], factoryRows: [], importedRows: [], ignored: ignoredList, counts: { prices_published: 0, prices_on_request: 0, prices_imported: 0 }, outcome: "blocked", summary };
    }
    const summary = `EMPTY PRICE SET: ${why}; no price is shown (the live site shows none either), the catalog publishes normally`;
    return { errors: [], warnings: [`pricing: ${summary}`, ...details, ...ignoredWarnings(ignoredList)], rows: [], factoryRows: [], importedRows: [], ignored: ignoredList, counts: { prices_published: 0, prices_on_request: 0, prices_imported: 0 }, outcome, summary };
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
  const factoryRows: PublishedFactoryPriceRow[] = [];
  /** W20.7: problems of `factory_prices` only — they drop the factory rows, never the set. */
  const factoryProblems: string[] = [];
  /** W34: the imported prices, and problems of the imported data only — they drop every imported row, never the set. */
  const importedRows: PublishedPriceRow[] = [];
  const importedProblems: string[] = [];
  let withFactoryPrices = 0;
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
    // W34: the v1 price is the DOMESTIC lowest; an imported factory there would mix the two.
    if (factoryIsImported(`${where}.factory`, raw.factory, errors) === true) errors.push(`pricing: ${where}: the v1 price's factory is imported (the v1 fields are the domestic lowest)`);

    const hasFactoryPrices = Object.hasOwn(raw, "factory_prices");
    if (hasFactoryPrices) withFactoryPrices++;
    // W34: each origin's factory rows are checked against that origin's lowest (Odoo W9.14 lists both origins).
    const split = splitFactoryPrices(where, raw.factory_prices, importedProblems);
    // W34: read BEFORE the "price on request" return — an imported-only variant has the v1 "no price" shape.
    const imported = Object.hasOwn(raw, "imported_lowest") ? checkImportedLowest(where, raw.imported_lowest, fetchedAt, importedProblems, ignored) : null;
    if (imported) {
      importedRows.push(imported);
      if (newest === null || imported.published_at > newest) newest = imported.published_at;
      if (split.imported.length) checkFactoryPrices(`${where} (imported)`, split.imported, imported, fetchedAt, importedProblems, ignored);
    } else if (split.imported.length) importedProblems.push(`${where}: imported factory_prices without an imported_lowest`);
    if (raw.price_on_request === true) {
      onRequest++;
      if (split.domestic.length || (hasFactoryPrices && !Array.isArray(raw.factory_prices))) factoryProblems.push(`${where}: a price_on_request row has factory_prices`);
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
    else {
      rows.push(row.data);
      if (hasFactoryPrices) factoryRows.push(...checkFactoryPrices(where, Array.isArray(raw.factory_prices) ? split.domestic : raw.factory_prices, row.data, fetchedAt, factoryProblems, ignored));
    }
  });
  if (withFactoryPrices > 0 && withFactoryPrices < body.data.length) factoryProblems.push(`factory_prices is on ${withFactoryPrices} of ${body.data.length} rows`);

  if (newest && metaUpdated && metaUpdated < newest) errors.push(`pricing: meta.updated_at_utc ${metaUpdated} is older than the newest published_at_utc ${newest}`);
  if (errors.length) return unusable("empty_invalid", `the pricing response is invalid (${errors.length} problem(s), first: ${errors[0].replace(/^pricing: /, "")})`, errors.slice(0, 20));
  rows.sort((a, b) => (a.canonical_variant_id < b.canonical_variant_id ? -1 : 1));
  const ignoredList = [...ignored].sort();
  const warnings = ignoredWarnings(ignoredList);
  let factoryNote: string;
  let keptFactoryRows: PublishedFactoryPriceRow[] = [];
  if (withFactoryPrices === 0) factoryNote = "no factory_prices (the fa page shows the lowest per size)";
  else if (factoryProblems.length) {
    factoryNote = `factory_prices DROPPED (${factoryProblems.length} problem(s)); the fa page shows the lowest per size`;
    warnings.push(`pricing: factory_prices dropped, the lowest prices publish as before (${factoryProblems.length} problem(s), first: ${factoryProblems[0]})`, ...factoryProblems.slice(0, 20).map((p) => `pricing: factory_prices: ${p}`));
  } else {
    keptFactoryRows = factoryRows.sort((a, b) => (a.canonical_variant_id < b.canonical_variant_id ? -1 : a.canonical_variant_id > b.canonical_variant_id ? 1 : a.factory_name_fa < b.factory_name_fa ? -1 : 1));
    factoryNote = `${keptFactoryRows.length} factory price(s)`;
  }
  // W34: never half an imported set. A bad imported set while the live site shows imported prices blocks the run.
  let importedNote: string;
  let keptImportedRows: PublishedPriceRow[] = [];
  if (importedProblems.length) {
    const first = importedProblems[0].replace(/^pricing: /, "");
    if (previousImportedPublished !== null && previousImportedPublished > 0) {
      const summary = `BLOCKED: the imported prices are invalid (${importedProblems.length} problem(s), first: ${first}), and the live site shows ${previousImportedPublished} imported price(s); refusing to publish without them`;
      return { errors: [`pricing: ${summary}`, ...importedProblems.slice(0, 20).map((p) => `pricing: imported: ${p.replace(/^pricing: /, "")}`)], warnings: [], rows: [], factoryRows: [], importedRows: [], ignored: ignoredList, counts: { prices_published: 0, prices_on_request: 0, prices_imported: 0 }, outcome: "blocked", summary };
    }
    importedNote = `imported prices DROPPED (${importedProblems.length} problem(s))`;
    warnings.push(`pricing: imported prices dropped, the domestic prices publish as before (${importedProblems.length} problem(s), first: ${first})`, ...importedProblems.slice(0, 20).map((p) => `pricing: imported: ${p.replace(/^pricing: /, "")}`));
  } else {
    keptImportedRows = importedRows.sort((a, b) => (a.canonical_variant_id < b.canonical_variant_id ? -1 : 1));
    // Said only when there are some: a response without imported prices (an Odoo before W9.14) reads as before.
    importedNote = keptImportedRows.length ? `${keptImportedRows.length} imported price(s)` : "";
  }
  const summary = `${rows.length} price(s) published, ${onRequest} on request; ${importedNote ? `${importedNote}; ` : ""}${factoryNote}${ignoredList.length ? `; ${ignoredList.length} unknown field(s) ignored` : ""}`;
  return { errors: [], warnings, rows, factoryRows: keptFactoryRows, importedRows: keptImportedRows, ignored: ignoredList, counts: { prices_published: rows.length, prices_on_request: onRequest, prices_imported: keptImportedRows.length }, outcome: "published", summary };
}

/**
 * W34: `factory_prices` by origin (`factory.is_imported`; absent = domestic, an Odoo before W9.14). A non-list or a
 * malformed entry stays domestic, where the W20.7 checks report it.
 */
function splitFactoryPrices(where: string, value: unknown, problems: string[]): { domestic: unknown[]; imported: unknown[] } {
  const out = { domestic: [] as unknown[], imported: [] as unknown[] };
  if (!Array.isArray(value)) return out;
  value.forEach((raw, i) => {
    const errors: string[] = [];
    const imported = isObject(raw) ? factoryIsImported(`${where}.factory_prices[${i}].factory`, raw.factory, errors) : null;
    problems.push(...errors);
    (imported === true ? out.imported : out.domestic).push(raw);
  });
  return out;
}

/**
 * W34: `imported_lowest` → a `published_imported_prices` row, or null (null/absent, or a problem — reported in
 * `problems`). Same rules as a v1 price: sane amount and time, fa factory and location; the factory must be imported.
 */
function checkImportedLowest(where: string, value: unknown, fetchedAt: string, problems: string[], ignored: Set<string>): PublishedPriceRow | null {
  if (value === null) return null;
  const at = `${where}.imported_lowest`;
  if (!isObject(value)) {
    problems.push(`${at}: not an object or null`);
    return null;
  }
  unknownKeys(at, value, PRICING_IMPORTED_KEYS, ignored);
  const errors: string[] = [];
  const factory = checkFactory(`${at}.factory`, value.factory ?? null, errors, ignored);
  const location = checkI18n(`${at}.location`, value.location ?? null, errors, ignored);
  if (factoryIsImported(`${at}.factory`, value.factory, errors) !== true) errors.push(`${at}.factory: is_imported must be true`);
  const price = checkPrice(`${at}.price_irr_per_kg`, value.price_irr_per_kg, errors);
  const publishedAt = checkTime(`${at}.published_at_utc`, value.published_at_utc, fetchedAt, errors);
  const factoryFa = factory?.fa;
  const locationFa = location?.fa;
  if (!nonBlank(factoryFa)) errors.push(`${at}: factory.name.fa is missing`);
  if (!nonBlank(locationFa)) errors.push(`${at}: location.fa is missing`);
  let previousPrice: number | null = null;
  let previousAt: string | null = null;
  if (value.previous !== null && value.previous !== undefined) {
    const p = value.previous;
    if (!isObject(p)) errors.push(`${at}.previous: not an object or null`);
    else {
      unknownKeys(`${at}.previous`, p, PRICING_IMPORTED_PREVIOUS_KEYS, ignored);
      checkFactory(`${at}.previous.factory`, p.factory ?? null, errors, ignored);
      checkI18n(`${at}.previous.location`, p.location ?? null, errors, ignored);
      previousPrice = checkPrice(`${at}.previous.price_irr_per_kg`, p.price_irr_per_kg, errors);
      previousAt = checkTime(`${at}.previous.published_at_utc`, p.published_at_utc, fetchedAt, errors);
      if (previousAt && publishedAt && previousAt >= publishedAt) errors.push(`${at}: previous.published_at_utc ${previousAt} is not before published_at_utc ${publishedAt}`);
    }
  }
  if (errors.length || price === null || publishedAt === null || !nonBlank(factoryFa) || !nonBlank(locationFa)) {
    problems.push(...errors);
    return null;
  }
  const row = publishedImportedPriceRow.safeParse({
    canonical_variant_id: where,
    price_irr_per_kg: price,
    vat_included: 1,
    factory_name_fa: factoryFa.trim(),
    location_fa: locationFa.trim(),
    published_at: publishedAt,
    previous_price_irr_per_kg: previousPrice !== null && previousAt !== null ? previousPrice : null,
    previous_published_at: previousPrice !== null && previousAt !== null ? previousAt : null,
  });
  if (!row.success) {
    problems.push(`${at}: ${row.error.issues.map((x) => x.message).join("; ")}`);
    return null;
  }
  return row.data;
}

/**
 * W20.7: one variant's `factory_prices` → snapshot rows. Problems go to `problems` (they drop every factory row,
 * never the lowest prices). Consistency with the v1 fields the row already passed: exactly one `is_lowest`, and it is
 * the v1 price (same amount, factory and location); no factory below the lowest; one row per factory.
 */
function checkFactoryPrices(where: string, value: unknown, lowest: PublishedPriceRow, fetchedAt: string, problems: string[], ignored: Set<string>): PublishedFactoryPriceRow[] {
  if (!Array.isArray(value) || value.length === 0) {
    problems.push(`${where}: a priced row needs a non-empty factory_prices list`);
    return [];
  }
  const out: PublishedFactoryPriceRow[] = [];
  const names = new Set<string>();
  let lowestCount = 0;
  value.forEach((raw, i) => {
    const at = `${where}.factory_prices[${i}]`;
    if (!isObject(raw)) {
      problems.push(`${at}: not an object`);
      return;
    }
    unknownKeys(`${where}.factory_prices`, raw, PRICING_FACTORY_PRICE_KEYS, ignored);
    const errors: string[] = [];
    const factory = checkFactory(`${at}.factory`, raw.factory ?? null, errors, ignored);
    const location = checkI18n(`${at}.location`, raw.location ?? null, errors, ignored);
    const price = checkPrice(`${at}.price_irr_per_kg`, raw.price_irr_per_kg, errors);
    const publishedAt = checkTime(`${at}.published_at_utc`, raw.published_at_utc, fetchedAt, errors);
    if (raw.change_pct !== null && typeof raw.change_pct !== "number") errors.push(`${at}.change_pct: not a number or null`);
    if (typeof raw.is_lowest !== "boolean") errors.push(`${at}.is_lowest: not true or false`);
    const factoryFa = factory?.fa;
    const locationFa = location?.fa;
    if (!nonBlank(factoryFa)) errors.push(`${at}: factory.name.fa is missing`);
    if (!nonBlank(locationFa)) errors.push(`${at}: location.fa is missing`);
    let previousPrice: number | null = null;
    let previousAt: string | null = null;
    if (raw.previous !== null) {
      if (!isObject(raw.previous)) errors.push(`${at}.previous: not an object or null`);
      else {
        unknownKeys(`${where}.factory_prices.previous`, raw.previous, PRICING_FACTORY_PREVIOUS_KEYS, ignored);
        previousPrice = checkPrice(`${at}.previous.price_irr_per_kg`, raw.previous.price_irr_per_kg, errors);
        previousAt = checkTime(`${at}.previous.published_at_utc`, raw.previous.published_at_utc, fetchedAt, errors);
      }
    }
    if (errors.length) {
      problems.push(...errors.map((e) => e.replace(/^pricing: /, "")));
      return;
    }
    const name = (factoryFa as string).trim();
    if (names.has(name)) problems.push(`${at}: a second row for the same factory`);
    names.add(name);
    if (raw.is_lowest === true) {
      lowestCount++;
      if (price !== lowest.price_irr_per_kg || name !== lowest.factory_name_fa || (locationFa as string).trim() !== lowest.location_fa) problems.push(`${at}: is_lowest, but differs from the row's lowest price, factory or location`);
    }
    if (price! < lowest.price_irr_per_kg) problems.push(`${at}: below the row's lowest price`);
    const row = publishedFactoryPriceRow.safeParse({
      canonical_variant_id: lowest.canonical_variant_id,
      factory_name_fa: name,
      location_fa: (locationFa as string).trim(),
      price_irr_per_kg: price,
      published_at: publishedAt,
      previous_price_irr_per_kg: previousPrice,
      previous_published_at: previousAt,
      is_lowest: raw.is_lowest === true ? 1 : 0,
    });
    if (!row.success) problems.push(`${at}: ${row.error.issues.map((x) => x.message).join("; ")}`);
    else out.push(row.data);
  });
  if (lowestCount !== 1) problems.push(`${where}: ${lowestCount} factory_prices rows are is_lowest (exactly one expected)`);
  return out;
}

function ignoredWarnings(ignored: readonly string[]): string[] {
  return ignored.length ? [`pricing: ignored ${ignored.length} field(s) the website does not know (never stored or rendered): ${ignored.join(", ")}`] : [];
}

