import type { CatalogApiCategory } from "./odoo-api-client.ts";
import type { PublicCatalogCategory } from "./types.ts";

/**
 * Pure, D1-free helpers for website public categories — the Odoo
 * `/api/v1/catalog/categories` projection (migrations_public/0011). Split
 * from the D1 read/write code the same way `catalog-filters.ts` is split
 * from `editorial-repository.ts`, so every rule here is unit-testable under
 * plain `node --test`.
 *
 * This module is the ONLY place a category's listing URL is built — the
 * Homepage Product Showcase, the Header Products menu, the mobile drawer
 * and the /products filter bar all call `categoryListingPath`, so a
 * category link can never drift between surfaces.
 */

/** The /products query key a category selection travels under. */
export const CATEGORY_QUERY_KEY = "category";

/** Maps one API row to the domain shape. Order is the caller's — never re-sorted here. */
export function toPublicCatalogCategory(row: CatalogApiCategory): PublicCatalogCategory {
  return {
    code: row.code,
    name: row.name,
    sequence: row.sequence,
    groupCodes: [...row.group_codes],
    templateCount: row.template_count,
    variantCount: row.variant_count,
  };
}

export interface CategoryRow {
  code: string;
  name: string;
  sequence: number;
  group_codes_json: string;
  template_count: number;
  variant_count: number;
}

/**
 * Parses one DB_PUBLIC row. A row whose `group_codes_json` is unreadable or
 * empty is dropped (returns null) rather than rendered — a category that
 * cannot filter to anything must not be offered as a link.
 */
export function parseCategoryRow(row: CategoryRow): PublicCatalogCategory | null {
  let groupCodes: unknown;
  try {
    groupCodes = JSON.parse(row.group_codes_json);
  } catch {
    return null;
  }
  if (!Array.isArray(groupCodes) || groupCodes.length === 0 || !groupCodes.every((g) => typeof g === "string" && g.length > 0)) return null;
  return {
    code: row.code,
    name: row.name,
    sequence: Number(row.sequence),
    groupCodes: groupCodes as string[],
    templateCount: Number(row.template_count),
    variantCount: Number(row.variant_count),
  };
}

export function findCategoryByCode(categories: PublicCatalogCategory[], code: string | undefined): PublicCatalogCategory | undefined {
  if (!code) return undefined;
  return categories.find((c) => c.code === code);
}

/** Unprefixed listing path for a category — callers apply `localizedPath` where they already do for other links. */
export function categoryListingPath(code: string): string {
  return `/products?${CATEGORY_QUERY_KEY}=${encodeURIComponent(code)}`;
}

/**
 * Resolves the technical `group_code` set a `?category=` value filters on.
 * `undefined` = no category requested (no restriction). An unknown code
 * resolves to an empty set, which the repository turns into "matches
 * nothing" — a stale/removed category link shows the honest no-match
 * state, never the unfiltered catalog.
 */
export function resolveCategoryGroupCodes(categories: PublicCatalogCategory[], code: string | undefined): string[] | undefined {
  if (!code) return undefined;
  return findCategoryByCode(categories, code)?.groupCodes ?? [];
}
