-- Migration: 0001_catalog_schema
-- Database: DB_PUBLIC (see wrangler.jsonc) — public catalog projection only,
-- never RFQ/contact/integration data (01-sources/DATABASE_SCHEMA.md §2.1).
-- Scope: the "Catalog" table group only (§4.1) — catalog_categories,
-- catalog_products, product_variants, units, attribute_definitions,
-- attribute_values, variant_attribute_values, product_seo_contents.
--
-- Deliberately NOT included in this migration (out of scope for the
-- catalog-foundation task — DOCUMENT_AUDIT_REPORT.md DAR-033):
--   article_categories/articles/public_media  — editorial CMS, separate task
--   public_prices/price_history               — pricing is explicitly out of
--                                                scope; catalog and pricing
--                                                are separate sync pipelines
--                                                (01-sources/TECHNICAL_ARCHITECTURE.md §11)
--   sync_checkpoints/cache_invalidation_events — scheduled-sync operational
--                                                tables, added when a real
--                                                sync Worker is scheduled
--
-- Conventions (01-sources/DATABASE_SCHEMA.md §3): TEXT ULIDs for internal
-- IDs, ISO 8601 UTC TEXT timestamps, INTEGER 0/1 booleans with CHECK,
-- explicit CHECK-constrained enums (only where the valid domain is actually
-- verified — an unconstrained TEXT column is used where it is not, per
-- CLAUDE.md "do not invent mappings"), snake_case plural table names,
-- idx_<table>_<columns> / uq_<table>_<columns> index naming. Odoo integer
-- IDs are mappings, never local primary keys (§3.3) — every table below
-- carries its own odoo_id/external_id/odoo_write_date columns rather than a
-- separate join table, matching DATABASE_SCHEMA.md §5.2's own documented
-- design for DB_PUBLIC (unlike DB_OPS's integration_mappings, which cannot
-- be reused here: D1 has no cross-database foreign keys, and a public,
-- read-heavy catalog would pay a join on every request for no benefit).
--
-- No seed/product data is included — DAR-033 verified the live `ahanassa`
-- Odoo database currently has zero product.template/product.product rows;
-- this migration is schema-only, matching migrations/0001_rfq_ops_schema.sql's
-- own precedent of shipping structure ahead of data.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- catalog_categories: hierarchical website taxonomy (rebar, beam, sheet, ...)
-- ---------------------------------------------------------------------------
CREATE TABLE catalog_categories (
  id                 TEXT PRIMARY KEY,                 -- ULID
  odoo_id            INTEGER,                           -- product.category.id; NULL until mapped/if website-only
  external_id        TEXT,                              -- Odoo XML/external ID where available
  parent_id          TEXT REFERENCES catalog_categories (id),
  stable_key         TEXT NOT NULL,                     -- immutable machine key, independent of slug/name
  name_fa            TEXT NOT NULL,
  slug_fa            TEXT NOT NULL,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),   -- commercial state
  is_public          INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),   -- separate publication flag (§2.5: unpublished may be stored)
  sync_status        TEXT NOT NULL DEFAULT 'not_applicable'
                       CHECK (sync_status IN ('not_applicable', 'pending', 'synced', 'odoo_missing')),
  source_updated_at  TEXT,                              -- Odoo write_date snapshot at last sync
  last_synced_at     TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_catalog_categories_stable_key ON catalog_categories (stable_key);
CREATE UNIQUE INDEX uq_catalog_categories_slug_fa ON catalog_categories (slug_fa);
CREATE UNIQUE INDEX uq_catalog_categories_odoo_id ON catalog_categories (odoo_id) WHERE odoo_id IS NOT NULL;
CREATE INDEX idx_catalog_categories_parent_id ON catalog_categories (parent_id);

-- ---------------------------------------------------------------------------
-- catalog_products: projection of Odoo product.template (product family)
-- ---------------------------------------------------------------------------
CREATE TABLE catalog_products (
  id                 TEXT PRIMARY KEY,                 -- ULID
  category_id        TEXT REFERENCES catalog_categories (id),
  odoo_id            INTEGER,                           -- product.template.id
  external_id        TEXT,
  odoo_write_date    TEXT,                              -- change-detection high-water mark (TECHNICAL_ARCHITECTURE.md §11.3)
  internal_code      TEXT,                              -- product.template.default_code, never shown as a public SKU by itself
  sku                TEXT,                              -- optional distinct public-facing SKU
  name_fa            TEXT NOT NULL,
  short_name_fa       TEXT,
  slug_fa             TEXT NOT NULL,
  product_type         TEXT,                            -- free-form: no verified Odoo enum to constrain against yet (see DAR-033)
  default_unit_id       TEXT REFERENCES units (id),
  is_active               INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_public                INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  is_price_public            INTEGER NOT NULL DEFAULT 0 CHECK (is_price_public IN (0, 1)),  -- flag only; no price column here (pricing out of scope)
  sync_status                  TEXT NOT NULL DEFAULT 'not_applicable'
                       CHECK (sync_status IN ('not_applicable', 'pending', 'synced', 'odoo_missing')),
  sync_version                    INTEGER NOT NULL DEFAULT 0,
  last_synced_at                   TEXT,
  created_at                         TEXT NOT NULL,
  updated_at                           TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_catalog_products_slug_fa ON catalog_products (slug_fa);
CREATE UNIQUE INDEX uq_catalog_products_odoo_id ON catalog_products (odoo_id) WHERE odoo_id IS NOT NULL;
CREATE INDEX idx_catalog_products_category_id ON catalog_products (category_id);

-- ---------------------------------------------------------------------------
-- product_variants: projection of Odoo product.product (sellable variant)
-- ---------------------------------------------------------------------------
CREATE TABLE product_variants (
  id                 TEXT PRIMARY KEY,                 -- ULID
  product_id         TEXT NOT NULL REFERENCES catalog_products (id) ON DELETE CASCADE,
  odoo_id            INTEGER,                           -- product.product.id
  external_id        TEXT,
  odoo_write_date    TEXT,
  variant_code       TEXT,                              -- product.product.default_code (may differ per variant from the template's)
  sku                TEXT,
  name_fa            TEXT NOT NULL,
  slug_fa            TEXT,                              -- optional: not every variant needs its own indexable page (SEO §)
  default_unit_id    TEXT REFERENCES units (id),
  is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_public          INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  is_price_public    INTEGER NOT NULL DEFAULT 0 CHECK (is_price_public IN (0, 1)),
  sync_status        TEXT NOT NULL DEFAULT 'not_applicable'
                       CHECK (sync_status IN ('not_applicable', 'pending', 'synced', 'odoo_missing')),
  sync_version       INTEGER NOT NULL DEFAULT 0,
  last_synced_at     TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_product_variants_odoo_id ON product_variants (odoo_id) WHERE odoo_id IS NOT NULL;
CREATE UNIQUE INDEX uq_product_variants_slug_fa ON product_variants (slug_fa) WHERE slug_fa IS NOT NULL;
CREATE INDEX idx_product_variants_product_id ON product_variants (product_id);

-- ---------------------------------------------------------------------------
-- units: public projection of Odoo uom.uom
-- ---------------------------------------------------------------------------
CREATE TABLE units (
  id                 TEXT PRIMARY KEY,                 -- ULID
  odoo_id            INTEGER,                           -- uom.uom.id
  external_id        TEXT,
  code               TEXT NOT NULL,                     -- stable machine code, e.g. "kg", "ton", "m" — independent of any display label
  name_fa            TEXT NOT NULL,
  symbol_fa          TEXT,
  unit_group         TEXT,                              -- free-form: this Odoo install has no uom.category table (verified, DAR-033) to map against
  precision_digits   INTEGER,
  is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_public          INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  last_synced_at     TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_units_code ON units (code);
CREATE UNIQUE INDEX uq_units_odoo_id ON units (odoo_id) WHERE odoo_id IS NOT NULL;

-- No conversion is inferred from name/code (DATABASE_SCHEMA.md §5.2 "units"):
-- kg/ton/m/piece/sheet/branch/bundle are never assumed interchangeable here.

-- ---------------------------------------------------------------------------
-- attribute_definitions / attribute_values: controlled specification model
-- (grade, standard, size, thickness, ...) — explicit structured fields for
-- known steel dimensions are preferred where they exist; this table group
-- is the extensibility mechanism for the rest, not a universal EAV system.
-- ---------------------------------------------------------------------------
CREATE TABLE attribute_definitions (
  id                 TEXT PRIMARY KEY,                 -- ULID
  odoo_id            INTEGER,                           -- product.attribute.id
  code               TEXT NOT NULL,                     -- stable machine code, e.g. "grade", "standard", "diameter"
  name_fa            TEXT NOT NULL,
  value_type         TEXT NOT NULL DEFAULT 'text' CHECK (value_type IN ('text', 'numeric')),
  sort_order         INTEGER NOT NULL DEFAULT 0,
  is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_attribute_definitions_code ON attribute_definitions (code);
CREATE UNIQUE INDEX uq_attribute_definitions_odoo_id ON attribute_definitions (odoo_id) WHERE odoo_id IS NOT NULL;

CREATE TABLE attribute_values (
  id                 TEXT PRIMARY KEY,                 -- ULID
  attribute_id       TEXT NOT NULL REFERENCES attribute_definitions (id) ON DELETE CASCADE,
  odoo_id            INTEGER,                           -- product.attribute.value.id
  value_fa           TEXT NOT NULL,                     -- normalized Persian display label, e.g. "A3"
  numeric_value       INTEGER,                          -- value x 10^-scale (DATABASE_SCHEMA.md §3.5); NULL when not a numeric attribute
  numeric_scale         INTEGER CHECK (numeric_scale IS NULL OR numeric_scale BETWEEN 0 AND 6),
  sort_order              INTEGER NOT NULL DEFAULT 0,
  is_active                 INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at                 TEXT NOT NULL,
  updated_at                   TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_attribute_values_attribute_id_value_fa ON attribute_values (attribute_id, value_fa);
CREATE UNIQUE INDEX uq_attribute_values_odoo_id ON attribute_values (odoo_id) WHERE odoo_id IS NOT NULL;
CREATE INDEX idx_attribute_values_attribute_id ON attribute_values (attribute_id);

CREATE TABLE variant_attribute_values (
  id                    TEXT PRIMARY KEY,              -- ULID
  variant_id            TEXT NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  attribute_value_id    TEXT NOT NULL REFERENCES attribute_values (id) ON DELETE CASCADE,
  created_at            TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_variant_attribute_values_variant_attr ON variant_attribute_values (variant_id, attribute_value_id);
CREATE INDEX idx_variant_attribute_values_variant_id ON variant_attribute_values (variant_id);

-- ---------------------------------------------------------------------------
-- product_seo_contents: website-owned editorial/SEO overlay, never Odoo data
-- ---------------------------------------------------------------------------
CREATE TABLE product_seo_contents (
  id                     TEXT PRIMARY KEY,             -- ULID
  entity_type            TEXT NOT NULL CHECK (entity_type IN ('category', 'product', 'variant', 'price_page')),
  entity_id              TEXT NOT NULL,                 -- catalog_categories.id / catalog_products.id / product_variants.id
  locale                 TEXT NOT NULL CHECK (locale IN ('fa', 'en', 'ar')),
  slug                   TEXT NOT NULL,
  h1                     TEXT,
  intro                  TEXT,
  body_json              TEXT,
  seo_title              TEXT,
  seo_description        TEXT,
  faq_json               TEXT,
  index_status           TEXT NOT NULL DEFAULT 'draft' CHECK (index_status IN ('index', 'noindex', 'draft')),
  content_quality_status TEXT NOT NULL DEFAULT 'incomplete' CHECK (content_quality_status IN ('incomplete', 'review', 'approved')),
  published_at           TEXT,
  updated_at             TEXT NOT NULL
);

-- A row becomes indexable only when the related catalog record is public AND
-- content_quality_status = 'approved' (application-enforced, DATABASE_SCHEMA.md
-- §5.2) — this schema does not by itself make anything indexable.
CREATE UNIQUE INDEX uq_product_seo_contents_entity_locale ON product_seo_contents (entity_type, entity_id, locale);
CREATE UNIQUE INDEX uq_product_seo_contents_slug_locale ON product_seo_contents (slug, locale);
CREATE INDEX idx_product_seo_contents_entity ON product_seo_contents (entity_type, entity_id);
