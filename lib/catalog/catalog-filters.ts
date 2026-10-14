/**
 * Pure, D1-free catalog listing filter helpers — deliberately split from
 * `lib/catalog/editorial-repository.ts` (which imports `getPublicDb` ->
 * `cloudflare:workers`, unresolvable under plain `node --test`) the same
 * way `lib/catalog/sync.ts` is split from `lib/catalog/repository.ts`.
 * DOCUMENT_AUDIT_REPORT.md DAR-037.
 *
 * Architecture V1.1 §4.2 (A3): the public listing filters by Odoo public
 * category only — one static route per category
 * (`/products/category/<segment>`). The query-string facets
 * (family/group/form/grade/standard) were removed in the first static
 * release; if they return, it is as a browser-side filter over the page's
 * static JSON, with per-locale labels.
 */

export interface CatalogFilterInput {
  /** Website public category code (Odoo `/api/v1/catalog/categories`) — resolved to `groupCodes` by the caller from the synced Odoo category list. */
  categoryCode?: string;
  /**
   * The Odoo-supplied technical group set of the selected category
   * (e.g. BOX_SECTION -> ["RHS","SHS"]). `undefined` = no restriction;
   * an empty array = the requested category is unknown, so nothing matches.
   */
  groupCodes?: string[];
  /** W9.8: a form-level category (e.g. GALVANIZED_SHEET) — only these Forms of `groupCodes`. Empty/absent = no form restriction. */
  formCodes?: string[];
  /** W9.8: a group-level category (e.g. SHEET_PLATE) — its groups minus the Forms another category claims. */
  excludedFormCodes?: string[];
}

/**
 * The `group_code IN (...)` restriction for a selected category, as a
 * parameterized SQL fragment over `pv` — `null` when no category is
 * selected. An empty set yields a never-true clause so an unknown category
 * shows the honest no-match state rather than silently widening to all
 * products. Only placeholders are interpolated, never a value.
 */
export function groupCodeSetClause(groupCodes: string[] | undefined): { sql: string; params: string[] } | null {
  if (groupCodes === undefined) return null;
  if (groupCodes.length === 0) return { sql: "0 = 1", params: [] };
  return { sql: `pv.group_code IN (${groupCodes.map(() => "?").join(", ")})`, params: [...groupCodes] };
}

/**
 * W9.8 — the full category restriction (`lib/catalog/public-categories.ts#resolveCategoryFilter`):
 * the group set, narrowed to the category's own Forms (form-level) or
 * minus the Forms other categories claim (group-level). Same SQL shape and
 * same never-widen rule as `groupCodeSetClause`; a variant without a
 * `form_code` is never in a form-level category and always stays in its
 * group-level one (`categoryContainsVariant`).
 */
export function categorySetClause(filters: CatalogFilterInput): { sql: string; params: string[] } | null {
  const groups = groupCodeSetClause(filters.groupCodes);
  if (!groups || groups.params.length === 0) return groups;
  const marks = (codes: string[]) => codes.map(() => "?").join(", ");
  const forms = filters.formCodes ?? [];
  if (forms.length > 0) return { sql: `${groups.sql} AND pv.form_code IN (${marks(forms)})`, params: [...groups.params, ...forms] };
  const excluded = filters.excludedFormCodes ?? [];
  if (excluded.length > 0) return { sql: `${groups.sql} AND (pv.form_code IS NULL OR pv.form_code NOT IN (${marks(excluded)}))`, params: [...groups.params, ...excluded] };
  return groups;
}
