import type { Locale } from "@/config/locales";

/**
 * Website Catalog domain types — DB_PUBLIC projection of the Odoo Public
 * Catalog API v1 (docs/integrations/odoo/catalog-v1/, DOCUMENT_AUDIT_REPORT.md
 * DAR-034, migrations_public/0002_catalog_v1_contract.sql).
 *
 * Ownership split (CLAUDE.md §11):
 *   Odoo owns   — commercial identity (`xid`/`templateXid`/`sku`), the
 *                 fixed classification (family/group/form/grade/standard),
 *                 dimensions/nominal weight, UOM display strings,
 *                 active/archive state (never edited independently here).
 *   Website owns — SEO slug, FA/EN/AR presentation, editorial content
 *                 (`ProductSeoContent`), publication/index policy.
 *   `nameFa`/`slugFa` on `CatalogProduct`/`ProductVariant` are bootstrapped
 *   from Odoo's own operational label at first sync (`commercialTemplateName`/
 *   `commercialName`, a slugified `sku`) but are then website-owned — a
 *   later sync never overwrites them, only the Odoo-sourced commercial
 *   fields (lib/catalog/sync.ts).
 *
 * No price field exists anywhere in this module — pricing is an explicitly
 * separate concern/sync pipeline (01-sources/TECHNICAL_ARCHITECTURE.md §11).
 *
 * `CatalogCategory`/`Unit`/`AttributeDefinition`/`AttributeValue`/
 * `VariantAttributeValue` below (migrations_public/0001) are NOT fed by this
 * integration — the real API has no separate category/UOM/attribute master
 * with independent identity (family/group/form are flat codes on each
 * variant; UOM is two free-text strings). Left in the schema, structurally
 * available, not deleted (DAR-034) — a documented gap, not a silent one.
 */

export type CatalogSyncStatus = "not_applicable" | "pending" | "synced" | "odoo_missing";
/** `catalog_products`/`product_variants` only ever have these two states — the API never returns partial/pending data. */
export type CatalogV1SyncStatus = "synced" | "odoo_missing";

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

/** A code/name pair as returned by the Public Catalog API's classification/grade/standard fields — either may be null (verified live: grade/standard are null for e.g. structural beams). */
export interface ClassificationRef {
  code: string | null;
  name: string | null;
}

/**
 * Template-level grouping row — NOT separately fetched from Odoo (the API
 * has no template endpoint); derived from the first variant seen under a
 * given `templateXid`.
 */
export interface CatalogProduct {
  id: string;
  templateXid: string;
  /** Odoo-sourced operational label (API `template_name`) — never the website's SEO name. */
  commercialTemplateName: string;
  nameFa: string;
  slugFa: string;
  isActive: boolean;
  isPublic: boolean;
  syncStatus: CatalogV1SyncStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Projection of one Public Catalog API product row — the API is
 * variant-centric, so this is the primary synced entity (PUBLIC_CATALOG_API_V1.md:
 * "active, variant-centric paginated list").
 */
export interface ProductVariant {
  id: string;
  productId: string;
  /** `product_variant_xid`, exposed by the API as `id` — the durable commercial identity (CLAUDE.md "Stable Identity"). */
  xid: string;
  sku: string;
  /** Odoo-sourced operational label (API `name`) — never the website's SEO name. */
  commercialName: string;
  nameFa: string;
  slugFa: string | null;
  commercialSize: string | null;
  sectionSize: string | null;
  /** Present on every live response; undocumented in the API's own markdown/report (DAR-034). */
  schedule: string | null;
  family: ClassificationRef;
  group: ClassificationRef;
  form: ClassificationRef;
  grade: ClassificationRef;
  standard: ClassificationRef;
  /**
   * Raw pass-through of the API's `dimensions` object — genuinely
   * polymorphic per product form (rebar: diameter_mm/length_mm; sheet:
   * width_mm/thickness_mm/length_mm; pipe: outside_diameter_mm/
   * wall_thickness_mm/length_mm; hollow sections: width_mm/height_mm/
   * thickness_mm/length_mm — all verified live). Never assume a fixed key.
   */
  dimensions: Record<string, number> | null;
  /** Raw pass-through of the API's `nominal_weight` object — equally polymorphic (kg_m/per_branch, kg_m2/per_sheet, ...). */
  nominalWeight: Record<string, number> | null;
  /** Free-text display string, e.g. "kg, ton, branch, meter" — no structured UOM master exists to reference (DAR-034). */
  allowedCommercialUnits: string | null;
  inventoryUom: string | null;
  /** Normalized UTC ISO-8601 copy of the API's `updated_at` — the change-detection high-water mark. */
  catalogUpdatedAt: string | null;
  isActive: boolean;
  isPublic: boolean;
  isPricePublic: boolean;
  syncStatus: CatalogV1SyncStatus;
  syncVersion: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Projection of an Odoo `uom.uom` record — NOT fed by this integration (DAR-034); see file header. */
export interface Unit {
  id: string;
  odooId: number | null;
  externalId: string | null;
  code: string;
  nameFa: string;
  symbolFa: string | null;
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
