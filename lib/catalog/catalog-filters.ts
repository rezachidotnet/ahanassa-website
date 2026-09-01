import type { ClassificationRef } from "./types";

/**
 * Pure, D1-free catalog filter/grouping helpers — deliberately split from
 * `lib/catalog/editorial-repository.ts` (which imports `getPublicDb` ->
 * `cloudflare:workers`, unresolvable under plain `node --test`) the same
 * way `lib/catalog/sync.ts` is split from `lib/catalog/repository.ts`.
 * DOCUMENT_AUDIT_REPORT.md DAR-037.
 */

export interface CatalogFilterInput {
  familyCode?: string;
  groupCode?: string;
  formCode?: string;
  gradeCode?: string;
  standardCode?: string;
}

export interface TemplateFilterCondition {
  /** The `product_variants` column this filter targets. */
  column: "family_code" | "group_code" | "form_code" | "grade_code" | "standard_code";
  value: string;
}

const FILTER_COLUMN_MAP: [keyof CatalogFilterInput, TemplateFilterCondition["column"]][] = [
  ["familyCode", "family_code"],
  ["groupCode", "group_code"],
  ["formCode", "form_code"],
  ["gradeCode", "grade_code"],
  ["standardCode", "standard_code"],
];

/**
 * Converts a caller-supplied filter object (e.g. from URL query params) into
 * an ordered list of `(column, value)` conditions a repository query can
 * turn into parameterized `EXISTS` clauses. Never trusts an arbitrary
 * column name from the caller — only the fixed, known set above.
 */
export function buildTemplateFilterConditions(filters: CatalogFilterInput): TemplateFilterCondition[] {
  const conditions: TemplateFilterCondition[] = [];
  for (const [key, column] of FILTER_COLUMN_MAP) {
    const value = filters[key];
    if (value) conditions.push({ column, value });
  }
  return conditions;
}

/**
 * Deduplicates a list of `{code, name}` pairs by `code`, drops entries with
 * no code (nothing to filter on), and returns them in stable, deterministic
 * `code` order — never in insertion/row order, which would depend on
 * arbitrary D1 scan order.
 */
export function dedupeClassificationRefs(refs: ClassificationRef[]): ClassificationRef[] {
  const seen = new Map<string, ClassificationRef>();
  for (const ref of refs) {
    if (ref.code && !seen.has(ref.code)) seen.set(ref.code, ref);
  }
  return [...seen.values()].sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
}

/**
 * A URL-safe query-param object (`?family=...&group=...`) parsed into
 * `CatalogFilterInput` — only recognized param names are read; anything
 * else (e.g. the legacy sample-catalog `?category=`) is silently ignored,
 * never crashes.
 */
export function parseCatalogFilterParams(searchParams: Record<string, string | string[] | undefined>): CatalogFilterInput {
  const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
  return {
    familyCode: first(searchParams.family),
    groupCode: first(searchParams.group),
    formCode: first(searchParams.form),
    gradeCode: first(searchParams.grade),
    standardCode: first(searchParams.standard),
  };
}

export const CATALOG_FILTER_QUERY_KEYS = ["family", "group", "form", "grade", "standard"] as const;
export type CatalogFilterQueryKey = (typeof CATALOG_FILTER_QUERY_KEYS)[number];

/**
 * Server-rendered filter links are plain toggles: clicking an already-active
 * value clears it, clicking any other value replaces it (one active value
 * per dimension). Pure so the toggle behavior is unit-testable without a
 * browser — the actual `<Link href>` is built by the caller from this
 * result via `buildQueryString`.
 */
export function toggleFilterQueryValue(current: Partial<Record<CatalogFilterQueryKey, string>>, key: CatalogFilterQueryKey, value: string): Partial<Record<CatalogFilterQueryKey, string>> {
  const next: Partial<Record<CatalogFilterQueryKey, string>> = { ...current };
  if (next[key] === value) delete next[key];
  else next[key] = value;
  return next;
}

/** Deterministic `?a=1&b=2` serialization (fixed key order) — never depends on object insertion order. */
export function buildQueryString(params: Partial<Record<CatalogFilterQueryKey, string>>): string {
  const pairs = CATALOG_FILTER_QUERY_KEYS.filter((k) => params[k]).map((k) => `${k}=${encodeURIComponent(params[k]!)}`);
  return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}

// --- Conditional ("faceted") narrowing — Go-Live Readiness catalog-filter audit ---
//
// A per-dimension DISTINCT over every published template's variants (the
// original design) is a set of independently-true marginal values — it does
// NOT guarantee any given combination across dimensions corresponds to a
// real published template. Two published templates from different families
// (e.g. Ribbed Rebar Aj340 = REBAR/RIBBED_REBAR/AJ340, Hot Rolled Plate
// S355JR = SHEET_PLATE/HOT_ROLLED_PLATE/S355JR) each contribute real,
// individually-valid facet values, but a visitor toggling one value from
// each ends up at `?group=REBAR&grade=S355JR` — a combination that matches
// zero real templates and dead-ends at the empty state. This was found live
// in production during Go-Live Readiness manual verification.
//
// Fix: every dimension's *own* option list is computed from only the rows
// that already match every *other* currently-active dimension (its own
// current value is deliberately excluded from its own filter, or the
// currently-selected option itself would vanish from its own list). This is
// standard "faceted search" narrowing — it guarantees every rendered link
// leads to at least one real published template, because it was derived
// from real co-occurring rows, never independently per column.

export interface ClassificationRow {
  familyCode: string | null;
  familyName: string | null;
  groupCode: string | null;
  groupName: string | null;
  formCode: string | null;
  formName: string | null;
  gradeCode: string | null;
  gradeName: string | null;
  standardCode: string | null;
  standardName: string | null;
}

export interface CatalogFilterFacets {
  family: import("./types.ts").ClassificationRef[];
  group: import("./types.ts").ClassificationRef[];
  form: import("./types.ts").ClassificationRef[];
  grade: import("./types.ts").ClassificationRef[];
  standard: import("./types.ts").ClassificationRef[];
}

const DIMENSION_ACTIVE_KEYS: (keyof CatalogFilterInput)[] = ["familyCode", "groupCode", "formCode", "gradeCode", "standardCode"];
const DIMENSION_ROW_KEY: Record<keyof CatalogFilterInput, keyof ClassificationRow> = {
  familyCode: "familyCode",
  groupCode: "groupCode",
  formCode: "formCode",
  gradeCode: "gradeCode",
  standardCode: "standardCode",
};

function rowMatchesActiveExcept(row: ClassificationRow, active: CatalogFilterInput, excludeKey: keyof CatalogFilterInput): boolean {
  for (const key of DIMENSION_ACTIVE_KEYS) {
    if (key === excludeKey) continue;
    const activeValue = active[key];
    if (!activeValue) continue;
    if (row[DIMENSION_ROW_KEY[key]] !== activeValue) return false;
  }
  return true;
}

/**
 * Computes each dimension's option list conditioned on every *other*
 * currently-active dimension — never a flat per-column DISTINCT over the
 * full published-template row set. Pure, D1-free; `rows` is the full,
 * already-published-eligible classification row set (one row per real
 * commercial variant belonging to a published template), fetched once by
 * the repository layer.
 */
export function computeConditionalFacets(rows: ClassificationRow[], active: CatalogFilterInput = {}): CatalogFilterFacets {
  const family = dedupeClassificationRefs(
    rows.filter((r) => rowMatchesActiveExcept(r, active, "familyCode")).map((r) => ({ code: r.familyCode, name: r.familyName })),
  );
  const group = dedupeClassificationRefs(
    rows.filter((r) => rowMatchesActiveExcept(r, active, "groupCode")).map((r) => ({ code: r.groupCode, name: r.groupName })),
  );
  const form = dedupeClassificationRefs(
    rows.filter((r) => rowMatchesActiveExcept(r, active, "formCode")).map((r) => ({ code: r.formCode, name: r.formName })),
  );
  const grade = dedupeClassificationRefs(
    rows.filter((r) => rowMatchesActiveExcept(r, active, "gradeCode")).map((r) => ({ code: r.gradeCode, name: r.gradeName })),
  );
  const standard = dedupeClassificationRefs(
    rows.filter((r) => rowMatchesActiveExcept(r, active, "standardCode")).map((r) => ({ code: r.standardCode, name: r.standardName })),
  );
  return { family, group, form, grade, standard };
}
