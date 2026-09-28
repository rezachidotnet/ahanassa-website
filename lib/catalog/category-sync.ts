import { fetchCatalogCategories, type CatalogLocale, type ConditionalRequestOptions } from "./odoo-api-client.ts";
import { toPublicCatalogCategory } from "./public-categories.ts";
import type { PublicCatalogCategory } from "./types.ts";

/**
 * Fetches one locale's public category list from the Odoo Public Catalog
 * API (`/api/v1/catalog/categories`) — D1-free, so it is unit-testable via
 * the client's `fetchImpl` injection point, mirroring
 * `group-label-sync.ts`. Persisting is `category-sync-runner.ts`'s job.
 *
 * An `ok` response with zero categories is refused as implausible
 * (`CATALOG_CATEGORIES_EMPTY_UPSTREAM`), the same guard the full catalog
 * sync applies to an empty product pull (lib/catalog/sync-safety.ts): an
 * upstream glitch must never blank the Header and Homepage by replacing a
 * good snapshot with nothing.
 */

export interface CategoryFetchResult {
  status: "ok" | "not_configured" | "failed";
  categories: PublicCatalogCategory[];
  reasonCode?: string;
}

export async function fetchPublicCategoriesForLocale(locale: CatalogLocale, options: ConditionalRequestOptions = {}): Promise<CategoryFetchResult> {
  const result = await fetchCatalogCategories(locale, options);
  if (result.status === "not_configured") return { status: "not_configured", categories: [] };
  if (result.status !== "ok" || !result.data) {
    return { status: "failed", categories: [], reasonCode: result.reasonCode ?? "CATALOG_CATEGORIES_FETCH_FAILED" };
  }
  if (result.data.length === 0) {
    return { status: "failed", categories: [], reasonCode: "CATALOG_CATEGORIES_EMPTY_UPSTREAM" };
  }
  return { status: "ok", categories: result.data.map(toPublicCatalogCategory) };
}
