import type { Locale } from "@/config/locales";

/**
 * Website Catalog domain types — DB_PUBLIC projection of Odoo's commercial
 * product data (01-sources/DATABASE_SCHEMA.md §5.2, migrations_public/0001_catalog_schema.sql).
 *
 * Ownership split (CLAUDE.md §11 / DOCUMENT_AUDIT_REPORT.md DAR-033):
 *   Odoo owns   — commercial identity, category, variant/attribute
 *                 structure, UOM identity (never edited independently here).
 *   Website owns — SEO slug, FA/EN/AR presentation, editorial content
 *                 (`ProductSeoContent`), publication/index policy.
 *
 * No price field exists anywhere in this module — pricing is an explicitly
 * separate concern/sync pipeline (01-sources/TECHNICAL_ARCHITECTURE.md §11).
 */

export type CatalogSyncStatus = "not_applicable" | "pending" | "synced" | "odoo_missing";

export interface CatalogCategory {
  id: string;
  odooId: number | null;
  externalId: string | null;
  parentId: string | null;
  stableKey: string;
  nameFa: string;
  slugFa: string;
  sortOrder: number;
  isActive: boolean;
  isPublic: boolean;
  syncStatus: CatalogSyncStatus;
  sourceUpdatedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Projection of an Odoo `product.template` — a product family, not a sellable unit by itself. */
export interface CatalogProduct {
  id: string;
  categoryId: string | null;
  odooId: number | null;
  externalId: string | null;
  odooWriteDate: string | null;
  internalCode: string | null;
  sku: string | null;
  nameFa: string;
  shortNameFa: string | null;
  slugFa: string;
  /** Free-form: no verified Odoo enum exists to constrain against (DAR-033). */
  productType: string | null;
  defaultUnitId: string | null;
  isActive: boolean;
  isPublic: boolean;
  /** Publication flag only — no price value lives on this type. */
  isPricePublic: boolean;
  syncStatus: CatalogSyncStatus;
  syncVersion: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Projection of an Odoo `product.product` — the actual sellable/quotable variant. */
export interface ProductVariant {
  id: string;
  productId: string;
  odooId: number | null;
  externalId: string | null;
  odooWriteDate: string | null;
  variantCode: string | null;
  sku: string | null;
  nameFa: string;
  slugFa: string | null;
  defaultUnitId: string | null;
  isActive: boolean;
  isPublic: boolean;
  isPricePublic: boolean;
  syncStatus: CatalogSyncStatus;
  syncVersion: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Projection of an Odoo `uom.uom` record. */
export interface Unit {
  id: string;
  odooId: number | null;
  externalId: string | null;
  code: string;
  nameFa: string;
  symbolFa: string | null;
  /** Free-form: this Odoo install has no `uom.category` table to map against (verified, DAR-033). */
  unitGroup: string | null;
  precisionDigits: number | null;
  isActive: boolean;
  isPublic: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AttributeValueType = "text" | "numeric";

export interface AttributeDefinition {
  id: string;
  odooId: number | null;
  code: string;
  nameFa: string;
  valueType: AttributeValueType;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeValue {
  id: string;
  attributeId: string;
  odooId: number | null;
  valueFa: string;
  /** value x 10^-scale (DATABASE_SCHEMA.md §3.5) — null when not a numeric attribute. */
  numericValue: number | null;
  numericScale: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VariantAttributeValue {
  id: string;
  variantId: string;
  attributeValueId: string;
  createdAt: string;
}

export type SeoEntityType = "category" | "product" | "variant" | "price_page";
export type IndexStatus = "index" | "noindex" | "draft";
export type ContentQualityStatus = "incomplete" | "review" | "approved";

/** Website-owned editorial/SEO overlay — never sourced from or written back to Odoo. */
export interface ProductSeoContent {
  id: string;
  entityType: SeoEntityType;
  entityId: string;
  locale: Locale;
  slug: string;
  h1: string | null;
  intro: string | null;
  bodyJson: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  faqJson: string | null;
  indexStatus: IndexStatus;
  contentQualityStatus: ContentQualityStatus;
  publishedAt: string | null;
  updatedAt: string;
}
