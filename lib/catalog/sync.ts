import type { CatalogApiProduct, CatalogClassificationEntry } from "./odoo-api-client.ts";
import type { ClassificationRef, ProductVariant } from "./types.ts";

/**
 * Odoo Public Catalog API v1 → Website Catalog sync planning — pure
 * functions only (no D1, no live API call). DOCUMENT_AUDIT_REPORT.md
 * DAR-034. A future sync orchestrator feeds this the result of
 * `fetchCatalogProductsPage`/pagination plus the current DB_PUBLIC
 * `product_variants` rows and applies the returned plan.
 *
 * Commercial vs. presentation field separation (CLAUDE.md §11): a brand-new
 * variant (no existing D1 row for its `xid`) IS auto-created — unlike the
 * pre-API-existence design this supersedes (DAR-033), Odoo now provides a
 * real, always-present commercial name and a stable, ASCII, unique `sku`,
 * so `nameFa`/`slugFa` can be safely bootstrapped from
 * `commercialName`/a slugified `sku` rather than being blocked entirely.
 * This is explicitly an operational fallback label, not finished SEO copy
 * (CLAUDE.md "Odoo commercial names may be used as fallback operational
 * labels, not automatic SEO copy") — `toCreate` results should still be
 * reported as needing editorial review before publication (a
 * `product_seo_contents` concern, handled by the repository layer, not
 * here). Once a D1 row exists, an update NEVER touches `nameFa`/`slugFa`
 * again — only Odoo-owned commercial fields.
 *
 * Change detection uses the API's own `updated_at` (normalized to UTC
 * ISO-8601) as a high-water mark. The API is active-only by design (no way
 * to fetch archived/inactive records at all — 404 on an archived xid's
 * detail lookup, never returned by the list) — the only way to detect
 * deactivation is a previously-mapped `xid` no longer appearing in a
 * *full* pull. Callers must not pass an incremental (`updated_since`
 * filtered) result set to `detectDeactivations` — see `planCatalogV1Sync`'s
 * `isFullPull` parameter.
 */

export interface VariantCreateInput {
  xid: string;
  templateXid: string;
  sku: string;
  commercialName: string;
  commercialTemplateName: string;
  commercialSize: string | null;
  sectionSize: string | null;
  schedule: string | null;
  family: ClassificationRef;
  group: ClassificationRef;
  form: ClassificationRef;
  grade: ClassificationRef;
  standard: ClassificationRef;
  dimensions: Record<string, number> | null;
  nominalWeight: Record<string, number> | null;
  allowedCommercialUnits: string | null;
  inventoryUom: string | null;
  catalogUpdatedAt: string;
}

export interface VariantCommercialPatch {
  commercialName: string;
  commercialSize: string | null;
  sectionSize: string | null;
  schedule: string | null;
  family: ClassificationRef;
  group: ClassificationRef;
  form: ClassificationRef;
  grade: ClassificationRef;
  standard: ClassificationRef;
  dimensions: Record<string, number> | null;
  nominalWeight: Record<string, number> | null;
  allowedCommercialUnits: string | null;
  inventoryUom: string | null;
  catalogUpdatedAt: string;
  isActive: true;
}

export interface CatalogV1SyncPlan {
  toCreate: VariantCreateInput[];
  toUpdate: Array<{ id: string; patch: VariantCommercialPatch }>;
  /** Only ever populated when `isFullPull` is true — see file header. */
  toDeactivate: string[];
  unchanged: string[];
}

export function planCatalogV1Sync(apiProducts: CatalogApiProduct[], existing: ProductVariant[], isFullPull: boolean): CatalogV1SyncPlan {
  const byXid = new Map(existing.map((v) => [v.xid, v]));
  const seenXids = new Set<string>();

  const toCreate: VariantCreateInput[] = [];
  const toUpdate: CatalogV1SyncPlan["toUpdate"] = [];
  const unchanged: string[] = [];

  for (const row of apiProducts) {
    seenXids.add(row.id);
    const catalogUpdatedAt = normalizeCatalogTimestamp(row.updated_at);
    const current = byXid.get(row.id);

    if (!current) {
      toCreate.push({
        xid: row.id,
        templateXid: row.template_id,
        sku: row.sku,
        commercialName: row.name,
        commercialTemplateName: row.template_name,
        commercialSize: row.commercial_size,
        sectionSize: row.section_size,
        schedule: row.schedule || null,
        family: toClassificationRef(row.classification.family),
        group: toClassificationRef(row.classification.group),
        form: toClassificationRef(row.classification.form),
        grade: toClassificationRef(row.grade),
        standard: toClassificationRef(row.standard),
        dimensions: nullIfEmpty(row.dimensions),
        nominalWeight: nullIfEmpty(row.nominal_weight),
        allowedCommercialUnits: row.allowed_commercial_units,
        inventoryUom: row.inventory_uom,
        catalogUpdatedAt,
      });
      continue;
    }

    const changed = current.catalogUpdatedAt !== catalogUpdatedAt || !current.isActive;
    if (!changed) {
      unchanged.push(current.id);
      continue;
    }

    toUpdate.push({
      id: current.id,
      patch: {
        commercialName: row.name,
        commercialSize: row.commercial_size,
        sectionSize: row.section_size,
        schedule: row.schedule || null,
        family: toClassificationRef(row.classification.family),
        group: toClassificationRef(row.classification.group),
        form: toClassificationRef(row.classification.form),
        grade: toClassificationRef(row.grade),
        standard: toClassificationRef(row.standard),
        dimensions: nullIfEmpty(row.dimensions),
        nominalWeight: nullIfEmpty(row.nominal_weight),
        allowedCommercialUnits: row.allowed_commercial_units,
        inventoryUom: row.inventory_uom,
        catalogUpdatedAt,
        isActive: true,
      },
    });
  }

  const toDeactivate = isFullPull ? existing.filter((v) => v.isActive && !seenXids.has(v.xid)).map((v) => v.id) : [];

  return { toCreate, toUpdate, toDeactivate, unchanged };
}

function toClassificationRef(entry: CatalogClassificationEntry | { code: null; name: null }): ClassificationRef {
  return { code: entry.code, name: entry.name };
}

function nullIfEmpty(value: Record<string, number> | null | undefined): Record<string, number> | null {
  if (!value || Object.keys(value).length === 0) return null;
  return value;
}

/** Odoo returns naive-UTC "YYYY-MM-DD HH:MM:SS" (verified live, not strict ISO-8601) — normalize to the project's UTC ISO-8601 TEXT convention (01-sources/DATABASE_SCHEMA.md §3.4). */
export function normalizeCatalogTimestamp(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed; // already ISO-ish
  return `${trimmed.replace(" ", "T")}.000Z`;
}

/** Deterministic, ASCII, human-editable-later slug bootstrap from the always-present, stable `sku` — never derived from a Persian/localized name (CLAUDE.md "Localization": no guessed translations). */
export function slugifyFromSku(sku: string): string {
  return sku
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Extracts the last dot-separated segment of a template xid (e.g. "ahanassa_marketplace.product_tmpl_rb_aj340" -> "product_tmpl_rb_aj340") as slug material — never the Persian name. Used by both lib/catalog/sync-runner.ts and the D1-free scripts/catalog-sync.ts. */
export function slugifyTemplateXid(templateXid: string): string {
  const tail = templateXid.split(".").pop() ?? templateXid;
  return tail.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
