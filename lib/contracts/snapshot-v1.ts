import { z } from "zod";
import { SNAPSHOT_VERSION_PATTERN } from "./snapshot-version.ts";

/**
 * snapshot.v1 — the build-time public data snapshot (docs/contracts/SNAPSHOT_V1.md,
 * architecture V1.1 §5.1/§7.1). One file feeds the static export, the
 * DB_PUBLIC load and the RFQ Worker's `rfq_variant_index`.
 *
 * Row shapes mirror the DB_PUBLIC tables (migrations_public/0001..0011)
 * column for column, so the build can load them into the real schema and
 * run the unchanged repository SQL. Only tables public rendering reads are
 * included; sync-state/lease tables are internal and never part of a snapshot.
 */

const isoText = z.string().min(1);
const flag = z.union([z.literal(0), z.literal(1)]);
const nullableText = z.string().nullable();

export const SNAPSHOT_SCHEMA_VERSION = "snapshot.v1" as const;
export const SNAPSHOT_LOCALES = ["fa", "en", "ar"] as const;
export { SNAPSHOT_VERSION_PATTERN };

export const catalogPublicCategoryRow = z
  .object({
    code: z.string().regex(/^[A-Z0-9_]{1,64}$/),
    locale: z.enum(SNAPSHOT_LOCALES),
    name: z.string().min(1),
    position: z.number().int(),
    sequence: z.number().int(),
    group_codes_json: z.string(),
    template_count: z.number().int().nonnegative(),
    variant_count: z.number().int().nonnegative(),
    synced_at: isoText,
  })
  .strict();

export const catalogProductRow = z
  .object({
    id: z.string().min(1),
    template_xid: z.string().min(1),
    commercial_template_name: z.string(),
    name_fa: z.string(),
    slug_fa: z.string(),
    is_active: flag,
    is_public: flag,
    sync_status: z.string(),
    last_synced_at: nullableText,
    created_at: isoText,
    updated_at: isoText,
  })
  .strict();

export const productVariantRow = z
  .object({
    id: z.string().min(1),
    product_id: z.string().min(1),
    xid: z.string().min(1),
    sku: z.string().min(1),
    commercial_name: z.string(),
    name_fa: z.string(),
    slug_fa: z.string(),
    commercial_size: nullableText,
    section_size: nullableText,
    schedule: nullableText,
    family_code: nullableText,
    family_name: nullableText,
    group_code: nullableText,
    group_name: nullableText,
    form_code: nullableText,
    form_name: nullableText,
    grade_code: nullableText,
    grade_name: nullableText,
    standard_code: nullableText,
    standard_name: nullableText,
    dimensions_json: nullableText,
    nominal_weight_json: nullableText,
    allowed_commercial_units: nullableText,
    inventory_uom: nullableText,
    catalog_updated_at: nullableText,
    is_active: flag,
    is_public: flag,
    is_price_public: flag,
    sync_status: z.string(),
    sync_version: z.number().int(),
    last_synced_at: nullableText,
    created_at: isoText,
    updated_at: isoText,
  })
  .strict();

export const productSeoContentRow = z
  .object({
    id: z.string().min(1),
    entity_type: z.enum(["category", "product", "variant", "price_page"]),
    entity_id: z.string().min(1),
    locale: z.enum(SNAPSHOT_LOCALES),
    slug: z.string().min(1),
    h1: nullableText,
    intro: nullableText,
    body_json: nullableText,
    seo_title: nullableText,
    seo_description: nullableText,
    faq_json: nullableText,
    index_status: z.string(),
    content_quality_status: z.string(),
    published_at: nullableText,
    updated_at: isoText,
  })
  .strict();

export const publicProcessingGroupRow = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    locale: z.enum(SNAPSHOT_LOCALES),
    name: z.string().min(1),
    sequence: z.number().int(),
    is_active: flag,
    source_updated_at: nullableText,
    synced_at: isoText,
    created_at: isoText,
    updated_at: isoText,
  })
  .strict();

export const routeRedirectRow = z
  .object({
    id: z.string().min(1),
    locale: z.enum(SNAPSHOT_LOCALES),
    old_path: z.string().startsWith("/"),
    target_path: nullableText,
    status_code: z.union([z.literal(308), z.literal(302), z.literal(410)]),
    entity_type: z.string().min(1),
    entity_id: nullableText,
    created_at: isoText,
    updated_at: isoText,
  })
  .strict();

export const homepageProductRankRow = z
  .object({
    id: z.string().min(1),
    catalog_product_id: z.string().min(1),
    base_priority: z.number(),
    manual_boost: z.number(),
    demand_score: z.number(),
    demand_computed_at: nullableText,
    created_at: isoText,
    updated_at: isoText,
    show_on_homepage: flag,
  })
  .strict();

export const catalogGroupLabelRow = z
  .object({ group_code: z.string().min(1), locale: z.enum(SNAPSHOT_LOCALES), name: z.string().min(1), updated_at: isoText })
  .strict();

/** Table name -> row schema. Order = load order (parents before children). */
export const SNAPSHOT_TABLES = {
  catalog_public_categories: catalogPublicCategoryRow,
  catalog_products: catalogProductRow,
  product_variants: productVariantRow,
  product_seo_contents: productSeoContentRow,
  public_processing_groups: publicProcessingGroupRow,
  route_redirects: routeRedirectRow,
  homepage_product_rank: homepageProductRankRow,
  catalog_group_labels: catalogGroupLabelRow,
} as const;
export type SnapshotTableName = keyof typeof SNAPSHOT_TABLES;
export const REQUIRED_SNAPSHOT_TABLES: SnapshotTableName[] = ["catalog_public_categories", "catalog_products", "product_variants", "product_seo_contents", "public_processing_groups"];

export const snapshotV1 = z
  .object({
    schema_version: z.literal(SNAPSHOT_SCHEMA_VERSION),
    snapshot_version: z.string().regex(SNAPSHOT_VERSION_PATTERN),
    created_at: isoText,
    source: z
      .object({
        kind: z.enum(["odoo_full_fetch", "d1_export"]),
        description: z.string().min(1),
        fetched_at: isoText,
      })
      .strict(),
    tables: z
      .object({
        catalog_public_categories: z.array(catalogPublicCategoryRow),
        catalog_products: z.array(catalogProductRow),
        product_variants: z.array(productVariantRow),
        product_seo_contents: z.array(productSeoContentRow),
        public_processing_groups: z.array(publicProcessingGroupRow),
        route_redirects: z.array(routeRedirectRow).default([]),
        homepage_product_rank: z.array(homepageProductRankRow).default([]),
        catalog_group_labels: z.array(catalogGroupLabelRow).default([]),
      })
      .strict(),
  })
  .strict()
  .superRefine((s, ctx) => {
    // Referential integrity: every variant/SEO row points at a known product.
    const productIds = new Set(s.tables.catalog_products.map((p) => p.id));
    s.tables.product_variants.forEach((v, i) => {
      if (!productIds.has(v.product_id)) ctx.addIssue({ code: "custom", path: ["tables", "product_variants", i, "product_id"], message: "unknown product_id" });
    });
    s.tables.product_seo_contents.forEach((r, i) => {
      if (r.entity_type === "product" && !productIds.has(r.entity_id)) ctx.addIssue({ code: "custom", path: ["tables", "product_seo_contents", i, "entity_id"], message: "unknown product entity_id" });
    });
  });

export type SnapshotV1 = z.infer<typeof snapshotV1>;

/** Counts recorded in manifests and checked by the abnormal-drop gate (architecture §7.1 step 2). */
export function snapshotCounts(s: SnapshotV1): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(s.tables)) counts[name] = rows.length;
  return counts;
}

/**
 * rfq_variant_index row (architecture §5.1, A8). One row per
 * (snapshot_version, locale, canonical variant) — the RFQ Worker resolves
 * every submitted variant with ONE query against it. `selection_json` is
 * the server-side RfqCatalogSelection (labels in that locale); it never
 * reaches a browser.
 */
export const rfqVariantIndexRow = z
  .object({
    snapshot_version: z.string().regex(SNAPSHOT_VERSION_PATTERN),
    locale: z.enum(SNAPSHOT_LOCALES),
    canonical_variant_id: z.string().min(1),
    template_id: z.string().min(1),
    group_code: nullableText,
    allowed_units: z.array(z.string()),
    selection_json: z.string().min(2),
  })
  .strict();
export type RfqVariantIndexRow = z.infer<typeof rfqVariantIndexRow>;
