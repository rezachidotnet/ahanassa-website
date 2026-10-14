import type { CatalogApiCategory } from "./odoo-api-client.ts";
import type { CatalogFilterInput } from "./catalog-filters.ts";
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

/**
 * The legacy /products query key (`/products?category=CODE`). Architecture
 * V1.1 §4.2 (A2): no internal link, sitemap entry or canonical uses it any
 * more; it is only read in the browser to forward an old link to
 * `categoryListingPath` (components/products/legacy-category-redirect.tsx).
 */
export const LEGACY_CATEGORY_QUERY_KEY = "category";

/** Odoo public category code shape — the only values the legacy forward accepts. */
export const CATEGORY_CODE_PATTERN = /^[A-Z0-9_]{1,64}$/;

/** Maps one API row to the domain shape. Order is the caller's — never re-sorted here. */
export function toPublicCatalogCategory(row: CatalogApiCategory): PublicCatalogCategory {
  return {
    code: row.code,
    name: row.name,
    sequence: row.sequence,
    groupCodes: [...row.group_codes],
    formCodes: [...(row.form_codes ?? [])],
    templateCount: row.template_count,
    variantCount: row.variant_count,
  };
}

export interface CategoryRow {
  code: string;
  name: string;
  sequence: number;
  group_codes_json: string;
  /** W9.8 build-only snapshot column (lib/contracts/snapshot-v1.ts); absent on a pre-W9.8 row = no form mappings. */
  form_codes_json?: string | null;
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
  let formCodes: unknown;
  try {
    groupCodes = JSON.parse(row.group_codes_json);
    formCodes = JSON.parse(row.form_codes_json ?? "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(groupCodes) || groupCodes.length === 0 || !groupCodes.every((g) => typeof g === "string" && g.length > 0)) return null;
  // An unreadable form set would widen a form-level category to its whole groups — drop the row instead.
  if (!Array.isArray(formCodes) || !formCodes.every((f) => typeof f === "string" && f.length > 0)) return null;
  return {
    code: row.code,
    name: row.name,
    sequence: Number(row.sequence),
    groupCodes: groupCodes as string[],
    formCodes: formCodes as string[],
    templateCount: Number(row.template_count),
    variantCount: Number(row.variant_count),
  };
}

export function findCategoryByCode(categories: PublicCatalogCategory[], code: string | undefined): PublicCatalogCategory | undefined {
  if (!code) return undefined;
  return categories.find((c) => c.code === code);
}

/**
 * URL segment for a category code (architecture V1.1 §4.1): lower case,
 * `_` -> `-` (BOX_SECTION -> box-section). Only ever resolved back
 * against the snapshot (`findCategoryByPathSegment`), never parsed.
 */
export function categoryPathSegment(code: string): string {
  return code.toLowerCase().replace(/_/g, "-");
}

export function findCategoryByPathSegment(categories: PublicCatalogCategory[], segment: string): PublicCatalogCategory | undefined {
  return categories.find((c) => categoryPathSegment(c.code) === segment);
}

/** Unprefixed static listing path for a category — callers apply `localizedPath` where they already do for other links. */
export function categoryListingPath(code: string): string {
  return `/products/category/${categoryPathSegment(code)}`;
}

/** Legacy `?category=` value -> static listing path, or null for anything that is not a category code (no reformatting of arbitrary input). */
export function legacyCategoryQueryTarget(search: string): string | null {
  const code = new URLSearchParams(search).get(LEGACY_CATEGORY_QUERY_KEY);
  if (!code || !CATEGORY_CODE_PATTERN.test(code)) return null;
  return categoryListingPath(code);
}

/**
 * W9.8 — Odoo's `steel.public.category._catalog_domain`, applied to one
 * variant: the most specific mapping wins. A category with `formCodes`
 * takes only those Forms of its groups; a group-level category takes its
 * groups' rows except the Forms some category claims (so «ورق» SHEET_PLATE
 * keeps black sheet and plate once GALVANIZED_SHEET claims GALVANIZED).
 * The API reports a category's groups and forms as two flat lists, so a
 * category mixing a group-level and a form-level mapping is read as
 * form-level only (Odoo has none: every W9.8 flat category is form-level) —
 * a product can then be missing from a listing, never listed under the
 * wrong category.
 */
export function claimedFormCodes(categories: PublicCatalogCategory[]): Set<string> {
  return new Set(categories.flatMap((c) => c.formCodes));
}

export function categoryContainsVariant(category: PublicCatalogCategory, claimed: ReadonlySet<string>, groupCode: string | null | undefined, formCode: string | null | undefined): boolean {
  if (!groupCode || !category.groupCodes.includes(groupCode)) return false;
  if (category.formCodes.length > 0) return !!formCode && category.formCodes.includes(formCode);
  return !formCode || !claimed.has(formCode);
}

/** The first category (snapshot order) a variant belongs to — product page breadcrumb, related links, price-page family. */
export function findCategoryForVariant(categories: PublicCatalogCategory[], groupCode: string | null | undefined, formCode: string | null | undefined): PublicCatalogCategory | undefined {
  const claimed = claimedFormCodes(categories);
  return categories.find((c) => categoryContainsVariant(c, claimed, groupCode, formCode));
}

/**
 * The variant set a selected category filters on, as the listing SQL's
 * input (`lib/catalog/catalog-filters.ts#categorySetClause`).
 * `undefined` = no category requested (no restriction). An unknown code
 * resolves to an empty group set, which the repository turns into "matches
 * nothing" — a stale/removed category link shows the honest no-match
 * state, never the unfiltered catalog.
 */
export function resolveCategoryFilter(categories: PublicCatalogCategory[], code: string | undefined): Required<Pick<CatalogFilterInput, "groupCodes" | "formCodes" | "excludedFormCodes">> | undefined {
  if (!code) return undefined;
  const category = findCategoryByCode(categories, code);
  if (!category) return { groupCodes: [], formCodes: [], excludedFormCodes: [] };
  if (category.formCodes.length > 0) return { groupCodes: [...category.groupCodes], formCodes: [...category.formCodes], excludedFormCodes: [] };
  return { groupCodes: [...category.groupCodes], formCodes: [], excludedFormCodes: [...claimedFormCodes(categories)].sort() };
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

/** The locale's categories with the claimed-Form set, built once per list (W9.8 membership, `categoryContainsVariant`). */
export interface PublicCategoryGroupIndex {
  categories: PublicCatalogCategory[];
  claimed: ReadonlySet<string>;
}

export function indexPublicCategoriesByGroupCode(categories: PublicCatalogCategory[]): PublicCategoryGroupIndex {
  return { categories, claimed: claimedFormCodes(categories) };
}

/** (category, snapshot position) of a variant: the first category in snapshot order that contains it. */
function lookupCategory(index: PublicCategoryGroupIndex, groupCode: string | null, formCode: string | null): { category: PublicCatalogCategory; position: number } | undefined {
  const position = index.categories.findIndex((c) => categoryContainsVariant(c, index.claimed, groupCode, formCode));
  return position < 0 ? undefined : { category: index.categories[position], position };
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
  formCode: string | null = null,
): RfqPublicCategory {
  const hit = groupCode ? lookupCategory(index, groupCode, formCode) : undefined;
  if (hit) return { code: hit.category.code, label: hit.category.name, position: hit.position, resolved: true };
  const label = locale === "fa" ? (familyName ?? groupCode) : groupCode;
  return { code: groupCode ? `group:${groupCode}` : null, label, position: Number.MAX_SAFE_INTEGER, resolved: false };
}
