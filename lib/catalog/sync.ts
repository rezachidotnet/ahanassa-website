import type {
  OdooCatalogCategoryRow,
  OdooCatalogProductRow,
  OdooProductVariantRow,
  OdooUomRow,
} from "@/lib/odoo/types";
import type { CatalogCategory, CatalogProduct, ProductVariant, Unit } from "./types";

/**
 * Odoo → Website Catalog sync planning — pure functions only (no D1, no
 * live Odoo call). A future scheduled sync Worker feeds these the result of
 * `OdooGateway.pullCatalog()` plus the current DB_PUBLIC rows and applies
 * the returned plan; this module never touches either directly, so it is
 * fully unit-testable with fixtures (DOCUMENT_AUDIT_REPORT.md DAR-033).
 *
 * Commercial vs. presentation field separation (CLAUDE.md §11): a brand-new
 * Odoo record (no existing D1 mapping) is never auto-created with a guessed
 * `name_fa`/`slug_fa` — those are website-owned, human-authored fields, and
 * `name_fa`/`slug_fa` are `NOT NULL` in the schema precisely so a row can't
 * exist without them. Such records surface as `needsEditorialSetup`
 * instead — a to-do list for the (not-yet-built, explicitly out-of-scope)
 * catalog CMS, never a fabricated catalog entry. Once a D1 row exists
 * (created through that future editorial step), subsequent syncs only ever
 * touch Odoo-owned commercial fields on `toUpdate` — `name_fa`/`slug_fa`
 * are never overwritten just because Odoo's `name` changed.
 *
 * Change detection uses Odoo's own `write_date` as a high-water mark
 * (01-sources/TECHNICAL_ARCHITECTURE.md §11.3) — a row is `unchanged` when
 * the stored `odooWriteDate` still matches, `toUpdate` otherwise. A
 * previously-mapped record that no longer appears (or now has `active:
 * false`) is planned for deactivation, never deletion — preserves any
 * `product_variants`/`product_seo_contents` history that references it.
 */

export interface CatalogSyncPlan<TCandidate, TUpdate> {
  /** Odoo has this record; no D1 row is mapped to it yet — cannot auto-create (missing required editorial fields). */
  needsEditorialSetup: TCandidate[];
  /** Existing D1 row; Odoo's write_date advanced — commercial fields only. */
  toUpdate: Array<{ id: string; patch: TUpdate }>;
  /** Existing D1 rows whose Odoo record is now archived or no longer returned by the pull. */
  toDeactivate: string[];
  /** Existing D1 rows already in sync — no-op, present for observability/tests. */
  unchanged: string[];
}

export interface CategoryCandidate {
  odooId: number;
  name: string;
  parentOdooId: number | null;
}

export interface CategoryCommercialPatch {
  odooWriteDate: null;
  isActive: boolean;
}

/** `product.category` has no `write_date` in the fields this project reads — change detection here is active-state only. */
export function planCategorySync(odooRows: OdooCatalogCategoryRow[], existing: CatalogCategory[]): CatalogSyncPlan<CategoryCandidate, CategoryCommercialPatch> {
  const byOdooId = new Map(existing.filter((c) => c.odooId !== null).map((c) => [c.odooId as number, c]));
  const seenOdooIds = new Set<number>();

  const needsEditorialSetup: CategoryCandidate[] = [];
  const toUpdate: CatalogSyncPlan<CategoryCandidate, CategoryCommercialPatch>["toUpdate"] = [];
  const unchanged: string[] = [];

  for (const row of odooRows) {
    if (!row.active) continue; // archived in Odoo — handled by the deactivate pass below, never "seen" as active
    seenOdooIds.add(row.id);
    const current = byOdooId.get(row.id);
    if (!current) {
      needsEditorialSetup.push({ odooId: row.id, name: row.name, parentOdooId: row.parent_id ? row.parent_id[0] : null });
      continue;
    }
    if (!current.isActive) {
      toUpdate.push({ id: current.id, patch: { odooWriteDate: null, isActive: true } });
    } else {
      unchanged.push(current.id);
    }
  }

  const toDeactivate = existing.filter((c) => c.odooId !== null && c.isActive && !seenOdooIds.has(c.odooId as number)).map((c) => c.id);

  return { needsEditorialSetup, toUpdate, toDeactivate, unchanged };
}

export interface ProductCandidate {
  odooId: number;
  name: string;
  internalCode: string | null;
  categoryOdooId: number | null;
  saleOk: boolean;
}

export interface ProductCommercialPatch {
  odooWriteDate: string;
  internalCode: string | null;
  categoryOdooId: number | null;
  isActive: boolean;
}

export function planProductSync(odooRows: OdooCatalogProductRow[], existing: CatalogProduct[]): CatalogSyncPlan<ProductCandidate, ProductCommercialPatch> {
  const byOdooId = new Map(existing.filter((p) => p.odooId !== null).map((p) => [p.odooId as number, p]));
  const seenOdooIds = new Set<number>();

  const needsEditorialSetup: ProductCandidate[] = [];
  const toUpdate: CatalogSyncPlan<ProductCandidate, ProductCommercialPatch>["toUpdate"] = [];
  const unchanged: string[] = [];

  for (const row of odooRows) {
    if (!row.active) continue;
    seenOdooIds.add(row.id);
    const current = byOdooId.get(row.id);
    const internalCode = row.default_code || null;
    const categoryOdooId = row.categ_id ? row.categ_id[0] : null;

    if (!current) {
      needsEditorialSetup.push({ odooId: row.id, name: row.name, internalCode, categoryOdooId, saleOk: row.sale_ok });
      continue;
    }

    const changed = current.odooWriteDate !== row.write_date || !current.isActive;
    if (changed) {
      toUpdate.push({ id: current.id, patch: { odooWriteDate: row.write_date, internalCode, categoryOdooId, isActive: true } });
    } else {
      unchanged.push(current.id);
    }
  }

  const toDeactivate = existing.filter((p) => p.odooId !== null && p.isActive && !seenOdooIds.has(p.odooId as number)).map((p) => p.id);

  return { needsEditorialSetup, toUpdate, toDeactivate, unchanged };
}

export interface VariantCandidate {
  odooId: number;
  productTemplateOdooId: number;
  internalCode: string | null;
}

export interface VariantCommercialPatch {
  odooWriteDate: string;
  variantCode: string | null;
  isActive: boolean;
}

export function planVariantSync(odooRows: OdooProductVariantRow[], existing: ProductVariant[]): CatalogSyncPlan<VariantCandidate, VariantCommercialPatch> {
  const byOdooId = new Map(existing.filter((v) => v.odooId !== null).map((v) => [v.odooId as number, v]));
  const seenOdooIds = new Set<number>();

  const needsEditorialSetup: VariantCandidate[] = [];
  const toUpdate: CatalogSyncPlan<VariantCandidate, VariantCommercialPatch>["toUpdate"] = [];
  const unchanged: string[] = [];

  for (const row of odooRows) {
    if (!row.active) continue;
    seenOdooIds.add(row.id);
    const current = byOdooId.get(row.id);
    const variantCode = row.default_code || null;

    if (!current) {
      needsEditorialSetup.push({ odooId: row.id, productTemplateOdooId: row.product_tmpl_id[0], internalCode: variantCode });
      continue;
    }

    const changed = current.odooWriteDate !== row.write_date || !current.isActive;
    if (changed) {
      toUpdate.push({ id: current.id, patch: { odooWriteDate: row.write_date, variantCode, isActive: true } });
    } else {
      unchanged.push(current.id);
    }
  }

  const toDeactivate = existing.filter((v) => v.odooId !== null && v.isActive && !seenOdooIds.has(v.odooId as number)).map((v) => v.id);

  return { needsEditorialSetup, toUpdate, toDeactivate, unchanged };
}

/**
 * Units are the one candidate type that's safe to auto-populate: a UOM
 * label ("kg", "کیلوگرم") is a short, generic technical term with no
 * marketing/editorial judgment involved, unlike a full product name — so
 * `planUnitSync` returns directly-creatable rows, not an editorial to-do
 * list, using Odoo's own translated name as the source of truth.
 */
export interface UnitUpsert {
  odooId: number;
  code: string;
  nameFa: string;
  isActive: boolean;
}

export interface UnitSyncPlan {
  toUpsert: UnitUpsert[];
  toDeactivate: string[];
}

export function planUnitSync(odooRows: OdooUomRow[], existing: Unit[]): UnitSyncPlan {
  const byOdooId = new Map(existing.filter((u) => u.odooId !== null).map((u) => [u.odooId as number, u]));
  const seenOdooIds = new Set<number>();
  const toUpsert: UnitUpsert[] = [];

  for (const row of odooRows) {
    if (!row.active) continue;
    seenOdooIds.add(row.id);
    const label = odooUomDisplayName(row.name);
    const current = byOdooId.get(row.id);
    if (!current || current.nameFa !== label || !current.isActive) {
      toUpsert.push({ odooId: row.id, code: odooUomStableCode(row), nameFa: label, isActive: true });
    }
  }

  const toDeactivate = existing.filter((u) => u.odooId !== null && u.isActive && !seenOdooIds.has(u.odooId as number)).map((u) => u.id);

  return { toUpsert, toDeactivate };
}

/** Prefers Persian, falls back to English, then Arabic — never fabricates a translation (CLAUDE.md §12). */
function odooUomDisplayName(name: OdooUomRow["name"]): string {
  if (typeof name === "string") return name;
  return name.fa_IR ?? name.en_US ?? name.ar_001 ?? "";
}

/** A stable machine code independent of the display label — falls back to a namespaced Odoo ID when no English label exists to derive one from. */
function odooUomStableCode(row: OdooUomRow): string {
  const english = typeof row.name === "string" ? row.name : row.name.en_US;
  if (!english) return `odoo-uom-${row.id}`;
  return english
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
