import { getPublicDb } from "@/lib/db/public";
import type { Locale } from "@/config/locales";
import type { CatalogCategory, CatalogProduct, ProductSeoContent, ProductVariant } from "./types";

/**
 * DB_PUBLIC-backed catalog read repository — the boundary future public
 * pages/API routes should call, never `cloudflare:workers`/D1 directly
 * (mirrors lib/rfq/repository.ts's role for DB_OPS).
 *
 * Not wired into any page yet (DOCUMENT_AUDIT_REPORT.md DAR-033): no
 * production DB_PUBLIC exists, and no row here can be `is_public = 1` today
 * since nothing has gone through the (not-yet-built, out-of-scope) catalog
 * editorial step. These functions are real and correctly typed so that
 * wiring a page to them later is a one-line change, not a rewrite — every
 * query already filters to `is_public = 1` so a page built on this
 * repository can never show an unpublished or Odoo-only-mapped row.
 */

interface CategoryRow {
  id: string;
  odoo_id: number | null;
  external_id: string | null;
  parent_id: string | null;
  stable_key: string;
  name_fa: string;
  slug_fa: string;
  sort_order: number;
  is_active: number;
  is_public: number;
  sync_status: CatalogCategory["syncStatus"];
  source_updated_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: CategoryRow): CatalogCategory {
  return {
    id: row.id,
    odooId: row.odoo_id,
    externalId: row.external_id,
    parentId: row.parent_id,
    stableKey: row.stable_key,
    nameFa: row.name_fa,
    slugFa: row.slug_fa,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
    isPublic: row.is_public === 1,
    syncStatus: row.sync_status,
    sourceUpdatedAt: row.source_updated_at,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublicCategories(): Promise<CatalogCategory[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(`SELECT * FROM catalog_categories WHERE is_public = 1 AND is_active = 1 ORDER BY sort_order ASC, name_fa ASC`)
    .all<CategoryRow>();
  return (result.results ?? []).map(mapCategory);
}

export async function getPublicCategoryBySlug(slugFa: string): Promise<CatalogCategory | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(`SELECT * FROM catalog_categories WHERE slug_fa = ? AND is_public = 1 AND is_active = 1`)
    .bind(slugFa)
    .first<CategoryRow>();
  return row ? mapCategory(row) : null;
}

interface ProductRow {
  id: string;
  category_id: string | null;
  odoo_id: number | null;
  external_id: string | null;
  odoo_write_date: string | null;
  internal_code: string | null;
  sku: string | null;
  name_fa: string;
  short_name_fa: string | null;
  slug_fa: string;
  product_type: string | null;
  default_unit_id: string | null;
  is_active: number;
  is_public: number;
  is_price_public: number;
  sync_status: CatalogProduct["syncStatus"];
  sync_version: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapProduct(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    categoryId: row.category_id,
    odooId: row.odoo_id,
    externalId: row.external_id,
    odooWriteDate: row.odoo_write_date,
    internalCode: row.internal_code,
    sku: row.sku,
    nameFa: row.name_fa,
    shortNameFa: row.short_name_fa,
    slugFa: row.slug_fa,
    productType: row.product_type,
    defaultUnitId: row.default_unit_id,
    isActive: row.is_active === 1,
    isPublic: row.is_public === 1,
    isPricePublic: row.is_price_public === 1,
    syncStatus: row.sync_status,
    syncVersion: row.sync_version,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublicProductsByCategory(categoryId: string): Promise<CatalogProduct[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(`SELECT * FROM catalog_products WHERE category_id = ? AND is_public = 1 AND is_active = 1 ORDER BY name_fa ASC`)
    .bind(categoryId)
    .all<ProductRow>();
  return (result.results ?? []).map(mapProduct);
}

export async function getPublicProductBySlug(slugFa: string): Promise<CatalogProduct | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(`SELECT * FROM catalog_products WHERE slug_fa = ? AND is_public = 1 AND is_active = 1`)
    .bind(slugFa)
    .first<ProductRow>();
  return row ? mapProduct(row) : null;
}

interface VariantRow {
  id: string;
  product_id: string;
  odoo_id: number | null;
  external_id: string | null;
  odoo_write_date: string | null;
  variant_code: string | null;
  sku: string | null;
  name_fa: string;
  slug_fa: string | null;
  default_unit_id: string | null;
  is_active: number;
  is_public: number;
  is_price_public: number;
  sync_status: ProductVariant["syncStatus"];
  sync_version: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    odooId: row.odoo_id,
    externalId: row.external_id,
    odooWriteDate: row.odoo_write_date,
    variantCode: row.variant_code,
    sku: row.sku,
    nameFa: row.name_fa,
    slugFa: row.slug_fa,
    defaultUnitId: row.default_unit_id,
    isActive: row.is_active === 1,
    isPublic: row.is_public === 1,
    isPricePublic: row.is_price_public === 1,
    syncStatus: row.sync_status,
    syncVersion: row.sync_version,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublicVariantsByProduct(productId: string): Promise<ProductVariant[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(`SELECT * FROM product_variants WHERE product_id = ? AND is_public = 1 AND is_active = 1 ORDER BY name_fa ASC`)
    .bind(productId)
    .all<VariantRow>();
  return (result.results ?? []).map(mapVariant);
}

interface SeoContentRow {
  id: string;
  entity_type: ProductSeoContent["entityType"];
  entity_id: string;
  locale: Locale;
  slug: string;
  h1: string | null;
  intro: string | null;
  body_json: string | null;
  seo_title: string | null;
  seo_description: string | null;
  faq_json: string | null;
  index_status: ProductSeoContent["indexStatus"];
  content_quality_status: ProductSeoContent["contentQualityStatus"];
  published_at: string | null;
  updated_at: string;
}

function mapSeoContent(row: SeoContentRow): ProductSeoContent {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    locale: row.locale,
    slug: row.slug,
    h1: row.h1,
    intro: row.intro,
    bodyJson: row.body_json,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    faqJson: row.faq_json,
    indexStatus: row.index_status,
    contentQualityStatus: row.content_quality_status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

/** Only ever returns `approved` content — `incomplete`/`review` rows are never surfaced to a public page. */
export async function getApprovedSeoContent(
  entityType: ProductSeoContent["entityType"],
  entityId: string,
  locale: Locale,
): Promise<ProductSeoContent | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(`SELECT * FROM product_seo_contents WHERE entity_type = ? AND entity_id = ? AND locale = ? AND content_quality_status = 'approved'`)
    .bind(entityType, entityId, locale)
    .first<SeoContentRow>();
  return row ? mapSeoContent(row) : null;
}
