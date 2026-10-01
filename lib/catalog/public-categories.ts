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
  // Spike S1: one static route per category instead of `/products?category=`
  // (a query string cannot select a static file). The legacy query form is
  // redirected client-side by /products (components/products/legacy-category-redirect.tsx).
  return `/products/category/${categoryPathSegment(code)}`;
}

/** Spike S1: URL segment for a category code — BOX_SECTION -> box-section. Resolved back only against the snapshot (findCategoryByPathSegment). */
export function categoryPathSegment(code: string): string {
  return code.toLowerCase().replace(/_/g, "-");
}

export function findCategoryByPathSegment(categories: PublicCatalogCategory[], segment: string): PublicCatalogCategory | undefined {
  return categories.find((c) => categoryPathSegment(c.code) === segment);
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

/**
 * The public category a variant's technical `group_code` belongs to, taken
 * from the SAME per-locale snapshot and the SAME `group_codes` membership
 * `/products?category=` filters on (`resolveCategoryGroupCodes`) — so the
 * RFQ selector's category and the category listing can never disagree
 * (e.g. RHS and SHS both land in BOX_SECTION because Odoo lists them in its
 * `group_codes`, not because the Website maps them).
 */
export interface RfqPublicCategory {
  /** Selector grouping key: the public category code, or `group:<group_code>` for an unresolved group (never collides with a real code), or null when the variant has no group_code at all. */
  code: string | null;
  /** Display label; null only when nothing safe exists, and the selector then shows its own localized "other" bucket. */
  label: string | null;
  /** The category's snapshot position (home/header order); unresolved groups sort after every real category. */
  position: number;
  resolved: boolean;
}

export type PublicCategoryGroupIndex = Map<string, { category: PublicCatalogCategory; position: number }>;

/** group_code -> (category, snapshot position). The first category listing a group wins, matching snapshot order. */
export function indexPublicCategoriesByGroupCode(categories: PublicCatalogCategory[]): PublicCategoryGroupIndex {
  const index: PublicCategoryGroupIndex = new Map();
  categories.forEach((category, position) => {
    for (const groupCode of category.groupCodes) {
      if (!index.has(groupCode)) index.set(groupCode, { category, position });
    }
  });
  return index;
}

/**
 * Resolves one variant's RFQ category. Unresolved (the group is in no public
 * category for this locale — e.g. the snapshot has not synced yet): fa falls
 * back to the variant's own Persian `family_name`, en/ar to the neutral
 * technical `group_code`, so a Persian label can never reach an en/ar page.
 */
export function resolveRfqPublicCategory(
  index: PublicCategoryGroupIndex,
  locale: "fa" | "en" | "ar",
  groupCode: string | null,
  familyName: string | null,
): RfqPublicCategory {
  const hit = groupCode ? index.get(groupCode) : undefined;
  if (hit) return { code: hit.category.code, label: hit.category.name, position: hit.position, resolved: true };
  const label = locale === "fa" ? (familyName ?? groupCode) : groupCode;
  return { code: groupCode ? `group:${groupCode}` : null, label, position: Number.MAX_SAFE_INTEGER, resolved: false };
}
