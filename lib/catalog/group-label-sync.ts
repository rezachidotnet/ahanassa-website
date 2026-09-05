import { fetchCatalogProductsPage, type CatalogLocale, type ConditionalRequestOptions } from "./odoo-api-client.ts";

/**
 * Fetches every distinct, currently-active Product group's locale-resolved
 * display name directly from the Odoo Public Catalog API v1 — the ONLY
 * documented, locale-aware source for this label (NAV-P1, root cause B:
 * the upstream API already supports `locale=fa|en|ar` and resolves
 * classification names accordingly — docs/integrations/odoo/catalog-v1/
 * PUBLIC_CATALOG_API_V1.md: "Responses ... Names use deterministic locale
 * fallback"; verified PASS in
 * AHANASSA_MARKETPLACE_PHASE5B_PUBLIC_CATALOG_API_REPORT.md — but the
 * existing full/incremental sync (lib/catalog/sync-runner.ts) only ever
 * fetches with `locale: "fa"`, hardcoded).
 *
 * Deliberately walks the paginated `/api/v1/catalog/products` list
 * endpoint (matching `lib/catalog/sync-runner.ts#fetchAllPages`'s own
 * pagination shape) rather than `/api/v1/catalog/meta` — `/meta`'s own
 * OpenAPI definition accepts no `locale` parameter at all, so its name
 * set's locale is undocumented and unverified; this module only trusts
 * the one endpoint whose locale-awareness is actually documented and
 * PASS-tested.
 *
 * No D1 dependency at all — kept fully independent of
 * `cloudflare:workers` so it is directly unit-testable under plain
 * `node --test` via the client's existing `fetchImpl` injection point
 * (same convention `lib/catalog/odoo-api-client.test.ts` already uses).
 */

const MAX_PAGES = 200; // mirrors sync-runner.ts's own ceiling — 237 records / page_size 100 = 3 pages today, generous against a misbehaving upstream
const PAGE_SIZE = 100;

export interface GroupLabel {
  code: string;
  name: string;
}

export interface GroupLabelFetchResult {
  status: "ok" | "not_configured" | "failed";
  labels: GroupLabel[];
  reasonCode?: string;
}

export async function fetchGroupLabelsForLocale(locale: CatalogLocale, options: ConditionalRequestOptions = {}): Promise<GroupLabelFetchResult> {
  // A Map, not an array — later pages/items for the same group_code simply
  // overwrite with an identical name (the API is expected to be internally
  // consistent within one locale/one run); never produces a duplicate row.
  const seen = new Map<string, string>();
  let page = 1;

  for (; page <= MAX_PAGES; page++) {
    const result = await fetchCatalogProductsPage({ page, pageSize: PAGE_SIZE, locale }, options);
    if (result.status === "not_configured") return { status: "not_configured", labels: [] };
    if (result.status !== "ok" || !result.data) {
      return { status: "failed", labels: [], reasonCode: result.reasonCode ?? "CATALOG_GROUP_LABEL_LIST_FAILED" };
    }

    for (const item of result.data.items) {
      const { code, name } = item.classification.group;
      if (code && name) seen.set(code, name);
    }

    if (page >= result.data.meta.pages) break;
  }

  return { status: "ok", labels: [...seen.entries()].map(([code, name]) => ({ code, name })) };
}
