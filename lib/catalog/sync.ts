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
 *
 * IDENTITY RESOLUTION (DAR-056, PRE-P3F-D1, 2026-09-18): the resolved
 * identity fed into `xid`/`templateXid` is always `row.canonical_id`/
 * `row.canonical_template_id` — never the legacy `row.id`/`row.template_id`
 * (per docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md
 * "WEBSITE MIGRATION GUIDANCE": canonical_id is unconditionally populated,
 * so preferring it is always at least as correct, and the website's
 * existing `xid`/`template_xid` columns are kept — only the value that
 * populates them changes).
 *
 * MIGRATION SAFETY — the critical compatibility checkpoint (task's own §5):
 * every already-synced production row currently has `xid` populated from
 * the OLD identity field (the legacy `id`), since that is what the
 * ingestion boundary wrote before this change. Blindly matching existing
 * rows by `row.canonical_id` alone would therefore treat every one of
 * those rows as unseen and re-`toCreate` them — silent duplication. To
 * avoid that, matching against `existing` tries the resolved canonical
 * identity FIRST (covers rows already migrated, or genuinely new rows),
 * then falls back to the legacy `row.id`/`row.template_id` (covers a
 * not-yet-migrated legacy row). A fallback match produces a `toUpdate`
 * whose patch also migrates `xid`/`templateXid` in place to the canonical
 * value — a one-time, idempotent, self-healing reconciliation: once
 * migrated, subsequent runs match directly on `canonical_id` and never
 * touch the identity columns again. No new storage/columns are added —
 * `xid`/`templateXid` are re-populated, not renamed (per the handoff's own
 * "Website may keep its internal columns named xid/template_xid" guidance).
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
  /** Only present when this row's stored `xid` still holds the legacy identity and must be migrated to `canonical_id` in place — see file header "MIGRATION SAFETY". Absent (never touched) once a row is already canonical. */
  xid?: string;
}

/** One distinct template's resolved identity, deduped across all variant rows under it, for the apply-time reconciliation pass (`lib/catalog/sync-runner.ts`) — see file header "MIGRATION SAFETY". */
export interface TemplateIdentityInput {
  canonicalTemplateXid: string;
  /** The legacy template XID from this pull, if any — used only to find and migrate an already-synced row keyed by the old value; never written as the resolved identity itself. */
  legacyTemplateXid: string | null;
  commercialTemplateName: string;
}

export interface CatalogV1SyncPlan {
  toCreate: VariantCreateInput[];
  toUpdate: Array<{ id: string; patch: VariantCommercialPatch }>;
  /** Only ever populated when `isFullPull` is true — see file header. */
  toDeactivate: string[];
  unchanged: string[];
  /** Deduped by `canonicalTemplateXid` — every distinct template observed in this pull, regardless of whether its variants were created/updated/unchanged. */
  templateIdentity: TemplateIdentityInput[];
}

export function planCatalogV1Sync(apiProducts: CatalogApiProduct[], existing: ProductVariant[], isFullPull: boolean): CatalogV1SyncPlan {
  const byXid = new Map(existing.map((v) => [v.xid, v]));
  const seenXids = new Set<string>();
  const templateIdentityByCanonical = new Map<string, TemplateIdentityInput>();

  const toCreate: VariantCreateInput[] = [];
  const toUpdate: CatalogV1SyncPlan["toUpdate"] = [];
  const unchanged: string[] = [];

  for (const row of apiProducts) {
    const resolvedXid = row.canonical_id;
    const resolvedTemplateXid = row.canonical_template_id;

    seenXids.add(resolvedXid);
    if (row.id) seenXids.add(row.id);

    if (!templateIdentityByCanonical.has(resolvedTemplateXid)) {
      templateIdentityByCanonical.set(resolvedTemplateXid, {
        canonicalTemplateXid: resolvedTemplateXid,
        legacyTemplateXid: row.template_id,
        commercialTemplateName: row.template_name,
      });
    }

    const catalogUpdatedAt = normalizeCatalogTimestamp(row.updated_at);
    const current = byXid.get(resolvedXid) ?? (row.id ? byXid.get(row.id) : undefined);

    if (!current) {
      toCreate.push({
        xid: resolvedXid,
        templateXid: resolvedTemplateXid,
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

    const needsIdentityMigration = current.xid !== resolvedXid;
    const changed = needsIdentityMigration || current.catalogUpdatedAt !== catalogUpdatedAt || !current.isActive;
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
        ...(needsIdentityMigration ? { xid: resolvedXid } : {}),
      },
    });
  }

  const toDeactivate = isFullPull ? existing.filter((v) => v.isActive && !seenXids.has(v.xid)).map((v) => v.id) : [];

  return { toCreate, toUpdate, toDeactivate, unchanged, templateIdentity: [...templateIdentityByCanonical.values()] };
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
