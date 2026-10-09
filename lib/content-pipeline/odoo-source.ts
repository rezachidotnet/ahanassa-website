import { fetchCatalogCategories, fetchCatalogMeta, fetchCatalogProductsPage, type CatalogApiCategory, type CatalogApiProduct, type CatalogLocale, type CatalogMetaPayload } from "../catalog/odoo-api-client.ts";
import { fetchProcessingGroups, type ProcessingGroupApiItem } from "../processing/odoo-api-client.ts";
import { PIPELINE_CONFIG } from "./config.ts";
import { PRICING_CURRENT_PATH, type PricingSource } from "./pricing.ts";

/**
 * Architecture V1.1 §7.1 step 1 — the FULL fetch from Odoo (no delta, so
 * deletions are visible by comparison). Uses the existing documented
 * clients (lib/catalog/odoo-api-client.ts, lib/processing/odoo-api-client.ts)
 * through a guarded fetch: GET only, the configured host only, the allowed
 * path prefixes only, and at most one request start per
 * `minRequestIntervalMs` (≤ 2 requests/second).
 *
 * The result is written to a temp directory outside the repository and is
 * never committed.
 */
export const ODOO_SOURCE_SCHEMA = "odoo-source.v1" as const;

export interface OdooRequestRecord {
  method: "GET";
  path: string;
  status: number | "network_error";
  ms: number;
}

export interface OdooSource {
  schema: typeof ODOO_SOURCE_SCHEMA;
  base_url: string;
  fetched_at: string;
  finished_at: string;
  requests: OdooRequestRecord[];
  meta: CatalogMetaPayload;
  categories: Record<CatalogLocale, CatalogApiCategory[]>;
  /** `Last-Modified` of each locale's category response (ISO), the categories' source watermark. */
  categories_last_modified: Record<CatalogLocale, string | null>;
  /** Every active variant, `locale=fa` (the website stores fa commercial labels; §8.2). */
  products: CatalogApiProduct[];
  products_reported_total: number;
  processing_groups: Record<CatalogLocale, ProcessingGroupApiItem[]>;
  /**
   * W9.4: `GET /api/v1/pricing/current`, unvalidated (lib/content-pipeline/pricing.ts allow-lists and
   * validates it; only the allow-listed fields reach the snapshot). Absent in sources fetched before W9.4.
   */
  prices?: PricingSource;
}

export class OdooFetchError extends Error {}

export interface GuardedFetchState {
  requests: OdooRequestRecord[];
  lastModified: Map<string, string>;
}

export function createGuardedFetch(
  baseUrl: string,
  state: GuardedFetchState,
  options: { minIntervalMs?: number; fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; now?: () => number } = {},
): typeof fetch {
  const allowedHost = new URL(baseUrl).host;
  const minInterval = options.minIntervalMs ?? PIPELINE_CONFIG.odoo.minRequestIntervalMs;
  const inner = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = options.now ?? (() => performance.now());
  let lastStart = -Infinity;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    if (method !== "GET") throw new OdooFetchError(`refused: ${method} ${url.pathname} (GET only)`);
    if (url.host !== allowedHost) throw new OdooFetchError(`refused: host ${url.host} (only ${allowedHost})`);
    if (!PIPELINE_CONFIG.odoo.allowedPathPrefixes.some((p) => url.pathname.startsWith(p))) throw new OdooFetchError(`refused: path ${url.pathname} is not an allowed catalog endpoint`);
    if (init?.body !== undefined && init.body !== null) throw new OdooFetchError("refused: request body");
    const wait = lastStart + minInterval - now();
    if (wait > 0) await sleep(wait);
    lastStart = now();
    const started = now();
    const record: OdooRequestRecord = { method: "GET", path: `${url.pathname}${url.search}`, status: "network_error", ms: 0 };
    state.requests.push(record);
    try {
      const response = await inner(url.href, { ...init, method: "GET" });
      record.status = response.status;
      const lm = response.headers.get("last-modified");
      if (lm) state.lastModified.set(record.path, lm);
      return response;
    } finally {
      record.ms = Math.round(now() - started);
    }
  }) as typeof fetch;
}

function httpDateToIso(value: string | undefined): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export async function fetchOdooSource(options: { baseUrl?: string; fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; minIntervalMs?: number } = {}): Promise<OdooSource> {
  const baseUrl = options.baseUrl ?? PIPELINE_CONFIG.odoo.baseUrl;
  // The documented clients read the base URL from ODOO_BASE_URL; pin it to the pipeline's source.
  process.env.ODOO_BASE_URL = baseUrl;
  const state: GuardedFetchState = { requests: [], lastModified: new Map() };
  const guarded = createGuardedFetch(baseUrl, state, { fetchImpl: options.fetchImpl, sleep: options.sleep, minIntervalMs: options.minIntervalMs });
  const req = { fetchImpl: guarded, timeoutMs: PIPELINE_CONFIG.odoo.timeoutMs };
  const fetchedAt = new Date().toISOString();
  const fail = (what: string, reason?: string): never => {
    throw new OdooFetchError(`Odoo fetch failed: ${what}${reason ? ` (${reason})` : ""}`);
  };

  const meta = await fetchCatalogMeta(req);
  if (meta.status !== "ok" || !meta.data) fail("GET /api/v1/catalog/meta", meta.reasonCode ?? meta.status);

  const categories = {} as OdooSource["categories"];
  const categoriesLastModified = {} as OdooSource["categories_last_modified"];
  for (const locale of PIPELINE_CONFIG.odoo.locales) {
    const r = await fetchCatalogCategories(locale, req);
    if (r.status !== "ok" || !r.data) fail(`GET /api/v1/catalog/categories?locale=${locale}`, r.reasonCode ?? r.status);
    categories[locale] = r.data!;
    categoriesLastModified[locale] = httpDateToIso(state.lastModified.get(`/api/v1/catalog/categories?locale=${locale}`));
  }

  const products: CatalogApiProduct[] = [];
  let reportedTotal = -1;
  for (let page = 1; page <= PIPELINE_CONFIG.odoo.maxPages; page++) {
    const r = await fetchCatalogProductsPage({ page, pageSize: PIPELINE_CONFIG.odoo.pageSize, locale: "fa" }, req);
    if (r.status !== "ok" || !r.data) fail(`GET /api/v1/catalog/products page ${page}`, r.reasonCode ?? r.status);
    const { items, meta: pageMeta } = r.data!;
    if (reportedTotal === -1) reportedTotal = pageMeta.total;
    else if (pageMeta.total !== reportedTotal) fail("catalog changed during pagination", `total ${reportedTotal} -> ${pageMeta.total}`);
    products.push(...items);
    if (page >= pageMeta.pages) break;
    if (page === PIPELINE_CONFIG.odoo.maxPages) fail("pagination exceeded maxPages", String(pageMeta.pages));
  }

  const processingGroups = {} as OdooSource["processing_groups"];
  for (const locale of PIPELINE_CONFIG.odoo.locales) {
    const r = await fetchProcessingGroups({ locale, fetchImpl: guarded, timeoutMs: PIPELINE_CONFIG.odoo.timeoutMs });
    if (r.status !== "ok" || !r.items) fail(`GET /api/v1/processing/groups?locale=${locale}`, r.reasonCode ?? r.status);
    processingGroups[locale] = r.items!;
  }

  const prices = await fetchPricingCurrent(baseUrl, guarded);

  return {
    schema: ODOO_SOURCE_SCHEMA,
    base_url: baseUrl,
    fetched_at: fetchedAt,
    finished_at: new Date().toISOString(),
    requests: state.requests,
    meta: meta.data!,
    categories,
    categories_last_modified: categoriesLastModified,
    products,
    products_reported_total: reportedTotal,
    processing_groups: processingGroups,
    prices,
  };
}

/**
 * W9.4: the current published prices. HTTP 404 = the API is not deployed yet (the site builds with an
 * empty price set; validation refuses that once a publication already shows prices). Any other non-200
 * status, a timeout or a non-JSON body fails the fetch, like the catalog endpoints.
 */
export async function fetchPricingCurrent(baseUrl: string, guarded: typeof fetch, timeoutMs: number = PIPELINE_CONFIG.odoo.timeoutMs): Promise<PricingSource> {
  let response: Response;
  try {
    response = await guarded(new URL(PRICING_CURRENT_PATH, baseUrl).href, { method: "GET", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new OdooFetchError(`Odoo fetch failed: GET ${PRICING_CURRENT_PATH} (${error instanceof Error ? error.name : "network error"})`);
  }
  if (response.status === 404) {
    await response.arrayBuffer().catch(() => undefined);
    return { status: "not_deployed", http_status: 404, etag: null, body: null };
  }
  if (response.status !== 200) throw new OdooFetchError(`Odoo fetch failed: GET ${PRICING_CURRENT_PATH} (HTTP ${response.status})`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new OdooFetchError(`Odoo fetch failed: GET ${PRICING_CURRENT_PATH} (body is not JSON)`);
  }
  return { status: "ok", http_status: 200, etag: response.headers.get("etag"), body };
}
