import { getOdooCatalogApiBaseUrl } from "../env.ts";

/**
 * Client for the Odoo Public Catalog API v1 — the sole, dedicated,
 * documented integration boundary for catalog data
 * (docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md,
 * public_catalog_api_v1.openapi.yaml). DOCUMENT_AUDIT_REPORT.md DAR-034.
 *
 * Deliberately does NOT use `lib/odoo/client.ts` (the generic JSON-2
 * `search_read`/`create` RPC transport the RFQ path uses) — that would be
 * exactly the "generic Odoo ORM access" this task's architecture invariant
 * forbids for catalog. This client only ever calls the three documented
 * `GET /api/v1/catalog/*` routes and nothing else.
 *
 * The endpoints are `auth=public` (verified live and in the docs) — no
 * credential is sent or required. Server-side sync into DB_PUBLIC still
 * happens here rather than the browser calling Odoo directly, because
 * public rendering must not depend on Odoo's live availability
 * (CLAUDE.md, TECHNICAL_ARCHITECTURE.md §11).
 *
 * Field shapes below were verified 2026-08-30 by live read-only requests
 * against every product `group` (REBAR, SHS, SEAMLESS_PIPE, BEAMS,
 * SHEET_PLATE, RHS) in addition to the documentation — `dimensions` and
 * `nominal_weight` are genuinely polymorphic per product form (e.g. rebar:
 * `{diameter_mm, length_mm}` / `{kg_m, per_branch}`; sheet: `{width_mm,
 * thickness_mm, length_mm}` / `{kg_m2, per_sheet}`; pipe: `{outside_diameter_mm,
 * wall_thickness_mm, length_mm}`), so they are typed and stored as opaque,
 * `json_valid()`-guarded JSON rather than a fixed column/field set that
 * would silently drop values for product forms not yet observed.
 *
 * DOCUMENTATION DISCREPANCIES found during live verification (DAR-034 —
 * "if implementation and OpenAPI conflict, stop and report"): the API
 * report's/markdown doc's single worked example is not fully
 * representative of the live payload —
 *   - `schedule` and `template_name` fields appear on every live response
 *     but are not mentioned in either doc's prose or its one JSON example.
 *   - The doc's example shows a `nominal_weight.kg_branch` key; the live
 *     API actually returns `per_branch` (confirmed across REBAR, SHS, and
 *     SEAMLESS_PIPE groups) — never `kg_branch`. Not treated as a blocker
 *     here specifically because `nominal_weight` is stored as opaque JSON,
 *     not a hardcoded field name, but flagged because relying on the
 *     documented example key would have been silently wrong.
 *
 * IDENTITY MODEL UPDATE (DAR-056, PRE-P3F-D1, 2026-09-18) — superseding the
 * `id`/`template_id`-are-always-non-null assumption this file previously
 * encoded. Per the Odoo-side authoritative handoff
 * (docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md,
 * verified against live Odoo code/production DB by the Odoo team, Phase
 * PRODUCT-MASTER-UI-P1, production since 2026-09-15):
 *   - `id`/`template_id` are the LEGACY `ir.model.data` XIDs, retained only
 *     for backward compatibility. They are `null` for any product created
 *     through the Product Master UI that never received one (first
 *     realized by the Angle/Channel pilot, `CVAR-000242`.. — still `draft`
 *     in production at handoff time).
 *   - `canonical_id`/`canonical_template_id` (`CVAR-…`/`CTMPL-…`) are the
 *     real, always-populated (`required=True` + unique-constrained on the
 *     Odoo side), preferred stable identity going forward — present and
 *     non-null on every row, legacy or canonical-only, past and future.
 * Website's resolved identity is therefore always `canonical_id`/
 * `canonical_template_id` — `id`/`template_id` are read only for
 * migration/reconciliation of already-synced legacy rows (lib/catalog/sync.ts)
 * and are never the primary key.
 */

const DEFAULT_TIMEOUT_MS = 8_000;

export interface CatalogClassificationEntry {
  code: string;
  name: string;
}

/** A single product-variant row — identical shape in both list and detail responses (verified live). */
export interface CatalogApiProduct {
  /** Legacy `ir.model.data` XID — nullable (null for Product-Master-UI-era products that never had one). Retained for backward-compat/reconciliation only — never the resolved identity. See file header, DAR-056. */
  id: string | null;
  /** Legacy template XID — same nullable, compat-only status as `id`. */
  template_id: string | null;
  /** `CVAR-…` — the real, always-populated stable variant identity. Required, never null, on any row past or future. */
  canonical_id: string;
  /** `CTMPL-…` — the real, always-populated stable template identity. Required, never null, on any row past or future. */
  canonical_template_id: string;
  sku: string;
  name: string;
  template_name: string; // undocumented in the MD/report prose; present on every live response
  commercial_size: string | null;
  section_size: string | null;
  schedule: string | null; // undocumented in the MD/report prose; present (often "") on every live response
  classification: {
    family: CatalogClassificationEntry | { code: null; name: null };
    group: CatalogClassificationEntry | { code: null; name: null };
    form: CatalogClassificationEntry | { code: null; name: null };
  };
  grade: CatalogClassificationEntry | { code: null; name: null };
  standard: CatalogClassificationEntry | { code: null; name: null };
  /** Polymorphic per product form — see file header. Never assume a fixed key set. */
  dimensions: Record<string, number>;
  /** Polymorphic per product form — see file header (documented example's `kg_branch` does not match live `per_branch`). */
  nominal_weight: Record<string, number>;
  allowed_commercial_units: string | null;
  inventory_uom: string | null;
  active: boolean;
  updated_at: string; // Odoo-local "YYYY-MM-DD HH:MM:SS", NOT strict ISO-8601 — normalize before storing/comparing
}

export interface CatalogListMeta {
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export interface CatalogMetaPayload {
  families: CatalogClassificationEntry[];
  groups: CatalogClassificationEntry[];
  forms: CatalogClassificationEntry[];
  grades: CatalogClassificationEntry[];
  standards: CatalogClassificationEntry[];
}

export type CatalogLocale = "fa" | "en" | "ar";

export interface CatalogListParams {
  locale?: CatalogLocale;
  page?: number;
  pageSize?: number;
  q?: string;
  sku?: string;
  family?: string;
  group?: string;
  form?: string;
  grade?: string;
  standard?: string;
  commercialSize?: string;
  sectionSize?: string;
  diameterMin?: number;
  diameterMax?: number;
  widthMin?: number;
  widthMax?: number;
  heightMin?: number;
  heightMax?: number;
  thicknessMin?: number;
  thicknessMax?: number;
  /** UTC ISO-8601 — filters by the API's `catalog_updated_at` high-water mark. */
  updatedSince?: string;
}

export type CatalogApiStatus = "ok" | "not_modified" | "not_found" | "invalid_request" | "not_configured" | "failed";

export interface CatalogApiResult<T, M = unknown> {
  status: CatalogApiStatus;
  data?: T;
  /** The response envelope's sibling `meta` field (e.g. pagination on the list endpoint) — distinct from `CatalogApiStatus`. */
  meta?: M;
  etag?: string;
  lastModified?: string;
  /** Safe operational reason code only — never a raw provider error body. */
  reasonCode?: string;
}

export interface ConditionalRequestOptions {
  ifNoneMatch?: string;
  timeoutMs?: number;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T, M = unknown>(path: string, query: Record<string, string | number | undefined>, options: ConditionalRequestOptions): Promise<CatalogApiResult<T, M>> {
  const baseUrl = getOdooCatalogApiBaseUrl();
  if (!baseUrl) {
    return { status: "not_configured", reasonCode: "ODOO_CATALOG_API_BASE_URL_NOT_SET" };
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const url = `${baseUrl.replace(/\/+$/, "")}${path}${buildQuery(query)}`;
    const headers: Record<string, string> = {};
    if (options.ifNoneMatch) headers["If-None-Match"] = options.ifNoneMatch;

    const response = await fetchFn(url, { method: "GET", headers, signal: controller.signal });

    if (response.status === 304) {
      return { status: "not_modified", etag: options.ifNoneMatch };
    }
    if (response.status === 404) {
      return { status: "not_found" };
    }
    if (response.status === 400) {
      return { status: "invalid_request", reasonCode: "CATALOG_API_INVALID_PARAMETER" };
    }
    if (!response.ok) {
      return { status: "failed", reasonCode: response.status >= 500 ? "CATALOG_API_SERVER_ERROR" : "CATALOG_API_REQUEST_REJECTED" };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { status: "failed", reasonCode: "CATALOG_API_MALFORMED_RESPONSE" };
    }

    if (typeof body !== "object" || body === null || !("data" in body)) {
      return { status: "failed", reasonCode: "CATALOG_API_UNEXPECTED_SHAPE" };
    }

    return {
      status: "ok",
      data: (body as { data: T }).data,
      meta: (body as { meta?: M }).meta,
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
    };
  } catch {
    return { status: "failed", reasonCode: "CATALOG_API_NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCatalogMeta(options: ConditionalRequestOptions = {}): Promise<CatalogApiResult<CatalogMetaPayload>> {
  const result = await request<CatalogMetaPayload>("/api/v1/catalog/meta", {}, options);
  if (result.status === "ok" && !isValidMetaPayload(result.data)) {
    return { status: "failed", reasonCode: "CATALOG_API_UNEXPECTED_SHAPE" };
  }
  return result;
}

export async function fetchCatalogProductsPage(
  params: CatalogListParams = {},
  options: ConditionalRequestOptions = {},
): Promise<CatalogApiResult<{ items: CatalogApiProduct[]; meta: CatalogListMeta }>> {
  const query: Record<string, string | number | undefined> = {
    locale: params.locale,
    page: params.page,
    page_size: params.pageSize,
    q: params.q,
    sku: params.sku,
    family: params.family,
    group: params.group,
    form: params.form,
    grade: params.grade,
    standard: params.standard,
    commercial_size: params.commercialSize,
    section_size: params.sectionSize,
    diameter_min: params.diameterMin,
    diameter_max: params.diameterMax,
    width_min: params.widthMin,
    width_max: params.widthMax,
    height_min: params.heightMin,
    height_max: params.heightMax,
    thickness_min: params.thicknessMin,
    thickness_max: params.thicknessMax,
    updated_since: params.updatedSince,
  };

  const result = await request<CatalogApiProduct[], CatalogListMeta>("/api/v1/catalog/products", query, options);
  if (result.status !== "ok") {
    return { status: result.status, reasonCode: result.reasonCode, etag: result.etag, lastModified: result.lastModified };
  }

  const rawItems = result.data;
  if (!Array.isArray(rawItems)) {
    return { status: "failed", reasonCode: "CATALOG_API_UNEXPECTED_SHAPE" };
  }
  const items = rawItems.filter(isValidProduct);
  if (items.length !== rawItems.length || !isValidListMeta(result.meta)) {
    return { status: "failed", reasonCode: "CATALOG_API_UNEXPECTED_SHAPE" };
  }

  return {
    status: "ok",
    data: { items, meta: result.meta },
    etag: result.etag,
    lastModified: result.lastModified,
  };
}

export async function fetchCatalogProductByXid(
  xid: string,
  locale: CatalogLocale = "fa",
  options: ConditionalRequestOptions = {},
): Promise<CatalogApiResult<CatalogApiProduct>> {
  const result = await request<CatalogApiProduct>(`/api/v1/catalog/products/${encodeURIComponent(xid)}`, { locale }, options);
  if (result.status === "ok" && !isValidProduct(result.data)) {
    return { status: "failed", reasonCode: "CATALOG_API_UNEXPECTED_SHAPE" };
  }
  return result;
}

// --- Minimal structural validation (no schema-validation dependency — matches lib/rfq/validation.ts's own precedent of hand-rolled validation for a small, stable shape). ---

function isValidProduct(value: unknown): value is CatalogApiProduct {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    (p.id === null || typeof p.id === "string") &&
    (p.template_id === null || typeof p.template_id === "string") &&
    typeof p.canonical_id === "string" &&
    p.canonical_id.length > 0 &&
    typeof p.canonical_template_id === "string" &&
    p.canonical_template_id.length > 0 &&
    typeof p.sku === "string" &&
    typeof p.name === "string" &&
    typeof p.active === "boolean" &&
    typeof p.updated_at === "string" &&
    typeof p.classification === "object" &&
    p.classification !== null &&
    typeof p.dimensions === "object" &&
    p.dimensions !== null &&
    typeof p.nominal_weight === "object" &&
    p.nominal_weight !== null
  );
}

function isValidMetaPayload(value: unknown): value is CatalogMetaPayload {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return Array.isArray(m.families) && Array.isArray(m.groups) && Array.isArray(m.forms) && Array.isArray(m.grades) && Array.isArray(m.standards);
}

function isValidListMeta(value: unknown): value is CatalogListMeta {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return typeof m.page === "number" && typeof m.page_size === "number" && typeof m.total === "number" && typeof m.pages === "number";
}
