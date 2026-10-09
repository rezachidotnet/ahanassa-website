import type { CatalogApiProduct } from "../catalog/odoo-api-client.ts";
import { normalizeCatalogTimestamp, slugifyFromSku, slugifyTemplateXid } from "../catalog/sync.ts";
import type { SnapshotV1 } from "../contracts/snapshot-v1.ts";
import type { D1Source } from "./d1-source.ts";
import type { OdooSource } from "./odoo-source.ts";
import { validatePricing } from "./pricing.ts";
import { validatePricingHistory } from "./pricing-history.ts";

/**
 * Builds the snapshot.v1 tables from one full Odoo fetch plus the
 * Website-owned editorial layer read from DB_PUBLIC. PURE and DETERMINISTIC:
 * the same inputs give byte-identical rows — every timestamp comes from Odoo
 * (`updated_at`, `Last-Modified`) or from the carried DB_PUBLIC row, never
 * from the clock (`deactivatedAt` is used only on the run where a row first
 * leaves Odoo).
 *
 * Ownership (docs/CATALOG_EDITORIAL_PUBLICATION.md §1), same split as the
 * former Worker sync (lib/catalog/sync.ts):
 * - Odoo-owned columns are always taken from the fetch (template name: on
 *   creation only, as before).
 * - Website-owned columns (`id`, `name_fa`, `slug_fa`, `is_public`,
 *   `is_price_public`, editorial tables) are carried from DB_PUBLIC; a row
 *   Odoo introduces gets the same defaults the sync used (not public).
 * - A row DB_PUBLIC has but the full fetch no longer returns stays in the
 *   snapshot with `is_active = 0` (soft deactivation; editorial rows survive).
 */

type Tables = SnapshotV1["tables"];
type VariantRow = Tables["product_variants"][number];
type ProductRow = Tables["catalog_products"][number];
type ProcessingRow = Tables["public_processing_groups"][number];

export function maxIso(...values: (string | null | undefined)[]): string {
  return values.filter((v): v is string => Boolean(v)).sort().at(-1) ?? "";
}

function nullIfEmptyJson(value: Record<string, number> | null | undefined): string | null {
  if (!value || Object.keys(value).length === 0) return null;
  return JSON.stringify(value);
}

function emptyToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value.trim() === "" ? null : value;
}

/** The Odoo-owned columns of one variant, exactly as they are stored. */
export function odooVariantColumns(p: CatalogApiProduct) {
  return {
    xid: p.canonical_id,
    sku: p.sku,
    commercial_name: p.name,
    commercial_size: emptyToNull(p.commercial_size),
    section_size: emptyToNull(p.section_size),
    schedule: emptyToNull(p.schedule),
    family_code: p.classification.family.code ?? null,
    family_name: p.classification.family.name ?? null,
    group_code: p.classification.group.code ?? null,
    group_name: p.classification.group.name ?? null,
    form_code: p.classification.form.code ?? null,
    form_name: p.classification.form.name ?? null,
    grade_code: p.grade.code ?? null,
    grade_name: p.grade.name ?? null,
    standard_code: p.standard.code ?? null,
    standard_name: p.standard.name ?? null,
    dimensions_json: nullIfEmptyJson(p.dimensions),
    nominal_weight_json: nullIfEmptyJson(p.nominal_weight),
    allowed_commercial_units: emptyToNull(p.allowed_commercial_units),
    inventory_uom: emptyToNull(p.inventory_uom),
    catalog_updated_at: normalizeCatalogTimestamp(p.updated_at),
    is_active: 1 as const,
  };
}

const ODOO_VARIANT_KEYS = Object.keys(odooVariantColumns({ classification: { family: {}, group: {}, form: {} }, grade: {}, standard: {}, updated_at: "2026-01-01 00:00:00" } as unknown as CatalogApiProduct));

function sameColumns(a: Record<string, unknown>, b: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((k) => a[k] === b[k]);
}

const byKey = <T>(key: (row: T) => string) => (a: T, b: T) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);

export function assembleSnapshotTables(odoo: OdooSource, d1: D1Source, deactivatedAt: string): Tables {
  // --- templates + variants ---------------------------------------------------
  const existingProducts = d1.tables.catalog_products;
  const productByTemplate = new Map(existingProducts.map((p) => [p.template_xid, p]));
  const existingVariants = d1.tables.product_variants;
  const variantByXid = new Map(existingVariants.map((v) => [v.xid, v]));

  const templates = new Map<string, { name: string; legacy: string | null; rows: CatalogApiProduct[] }>();
  for (const p of [...odoo.products].sort(byKey((x) => x.sku))) {
    const t = templates.get(p.canonical_template_id) ?? { name: p.template_name, legacy: p.template_id, rows: [] };
    t.rows.push(p);
    templates.set(p.canonical_template_id, t);
  }

  const products: ProductRow[] = [];
  const productIdByTemplate = new Map<string, string>();
  for (const [templateXid, t] of [...templates.entries()].sort(byKey(([k]) => k))) {
    const stamp = maxIso(...t.rows.map((r) => normalizeCatalogTimestamp(r.updated_at)));
    const existing = productByTemplate.get(templateXid) ?? (t.legacy ? productByTemplate.get(t.legacy) : undefined);
    let row: ProductRow;
    if (existing) {
      // `commercial_template_name` is set once at creation and never updated, exactly as the former sync
      // (lib/catalog/repository.ts#ensureCatalogProduct) did; public listings sort on it.
      const changed = existing.template_xid !== templateXid || existing.is_active !== 1;
      row = {
        ...existing,
        template_xid: templateXid,
        is_active: 1,
        sync_status: "synced",
        last_synced_at: changed ? stamp : existing.last_synced_at,
        updated_at: changed ? maxIso(existing.updated_at, stamp) : existing.updated_at,
      };
    } else {
      row = {
        id: `cp-${templateXid}`,
        template_xid: templateXid,
        commercial_template_name: t.name,
        name_fa: t.name,
        slug_fa: slugifyTemplateXid(templateXid),
        is_active: 1,
        is_public: 0,
        sync_status: "synced",
        last_synced_at: stamp,
        created_at: stamp,
        updated_at: stamp,
      };
    }
    products.push(row);
    productIdByTemplate.set(templateXid, row.id);
  }
  const fetchedTemplateIds = new Set(products.map((p) => p.id));
  for (const p of existingProducts) {
    if (fetchedTemplateIds.has(p.id)) continue;
    products.push(p.is_active === 0 ? p : { ...p, is_active: 0, updated_at: maxIso(p.updated_at, deactivatedAt) });
  }

  const variants: VariantRow[] = [];
  const seenVariantIds = new Set<string>();
  for (const [templateXid, t] of templates) {
    for (const p of t.rows) {
      const cols = odooVariantColumns(p);
      const productId = productIdByTemplate.get(templateXid)!;
      const existing = variantByXid.get(p.canonical_id) ?? (p.id ? variantByXid.get(p.id) : undefined);
      let row: VariantRow;
      if (existing) {
        const changed = existing.product_id !== productId || !sameColumns(existing, cols, ODOO_VARIANT_KEYS);
        row = {
          ...existing,
          ...cols,
          product_id: productId,
          sync_status: "synced",
          sync_version: changed ? existing.sync_version + 1 : existing.sync_version,
          last_synced_at: changed ? cols.catalog_updated_at : existing.last_synced_at,
          updated_at: changed ? maxIso(existing.updated_at, cols.catalog_updated_at) : existing.updated_at,
        };
      } else {
        row = {
          id: `pv-${p.canonical_id}`,
          product_id: productId,
          ...cols,
          name_fa: p.name,
          slug_fa: slugifyFromSku(p.sku),
          is_public: 0,
          is_price_public: 0,
          sync_status: "synced",
          sync_version: 1,
          last_synced_at: cols.catalog_updated_at,
          created_at: cols.catalog_updated_at,
          updated_at: cols.catalog_updated_at,
        };
      }
      variants.push(row);
      seenVariantIds.add(row.id);
    }
  }
  for (const v of existingVariants) {
    if (seenVariantIds.has(v.id)) continue;
    variants.push(v.is_active === 0 ? v : { ...v, is_active: 0, updated_at: maxIso(v.updated_at, deactivatedAt) });
  }

  // --- public categories (Odoo, per locale, in Odoo's order) -------------------
  const productStamp = maxIso(...odoo.products.map((p) => normalizeCatalogTimestamp(p.updated_at)));
  const categories: Tables["catalog_public_categories"] = [];
  for (const locale of ["fa", "en", "ar"] as const) {
    const syncedAt = odoo.categories_last_modified[locale] ?? productStamp;
    odoo.categories[locale].forEach((c, position) =>
      categories.push({
        code: c.code,
        locale,
        name: c.name,
        position,
        sequence: c.sequence,
        group_codes_json: JSON.stringify(c.group_codes),
        template_count: c.template_count,
        variant_count: c.variant_count,
        synced_at: syncedAt,
      }),
    );
  }

  // --- processing groups (Odoo, per locale; soft withdrawal) -------------------
  const existingGroups = d1.tables.public_processing_groups;
  const groupByKey = new Map(existingGroups.map((g) => [`${g.code}|${g.locale}`, g]));
  const groups: ProcessingRow[] = [];
  const seenGroupIds = new Set<string>();
  for (const locale of ["fa", "en", "ar"] as const) {
    for (const item of odoo.processing_groups[locale]) {
      const sourceUpdatedAt = normalizeCatalogTimestamp(item.updated_at);
      const cols = { code: item.id, locale, name: item.name, sequence: item.sequence, is_active: (item.active ? 1 : 0) as 0 | 1, source_updated_at: sourceUpdatedAt };
      const existing = groupByKey.get(`${item.id}|${locale}`);
      let row: ProcessingRow;
      if (existing) {
        const changed = !sameColumns(existing, cols, Object.keys(cols));
        row = changed ? { ...existing, ...cols, synced_at: sourceUpdatedAt, updated_at: maxIso(existing.updated_at, sourceUpdatedAt) } : existing;
      } else {
        row = { id: `ppg-${item.id}-${locale}`, ...cols, synced_at: sourceUpdatedAt, created_at: sourceUpdatedAt, updated_at: sourceUpdatedAt };
      }
      groups.push(row);
      seenGroupIds.add(row.id);
    }
  }
  for (const g of existingGroups) {
    if (seenGroupIds.has(g.id)) continue;
    groups.push(g.is_active === 0 ? g : { ...g, is_active: 0, updated_at: maxIso(g.updated_at, deactivatedAt) });
  }

  // W9.4/W9.6: prices and their daily history, Odoo-owned and build-only.
  const prices = validatePricing(odoo.prices, odoo.products, odoo.fetched_at).rows;

  // --- editorial layer: carried verbatim from DB_PUBLIC -------------------------
  return {
    catalog_public_categories: categories.sort(byKey((c) => `${c.locale}|${String(c.position).padStart(4, "0")}`)),
    catalog_products: products.sort(byKey((p) => p.id)),
    product_variants: variants.sort(byKey((v) => v.id)),
    product_seo_contents: [...d1.tables.product_seo_contents].sort(byKey((r) => r.id)),
    public_processing_groups: groups.sort(byKey((g) => g.id)),
    route_redirects: [...d1.tables.route_redirects].sort(byKey((r) => r.id)),
    homepage_product_rank: [...d1.tables.homepage_product_rank].sort(byKey((r) => r.id)),
    catalog_group_labels: [...d1.tables.catalog_group_labels].sort(byKey((r) => `${r.group_code}|${r.locale}`)),
    // W9.4: Odoo-owned, build-only; only the allow-listed fields (empty when the pricing source has any error,
    // which validateSource reports and which stops the run).
    published_prices: prices,
    // W9.6: the daily points of the 30-day chart (empty, never an error, when the history is unusable).
    published_price_history: validatePricingHistory(odoo.price_history, prices, odoo.fetched_at).rows,
  };
}
