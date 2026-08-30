-- Migration: 0002_catalog_v1_contract
-- Database: DB_PUBLIC
--
-- Corrects catalog_products/product_variants to match the REAL, now-verified
-- Odoo Public Catalog API v1 contract (docs/integrations/odoo/catalog-v1/,
-- DOCUMENT_AUDIT_REPORT.md DAR-034), superseding the preliminary shape from
-- 0001_catalog_schema.sql that was written before the API existed (DAR-033)
-- and guessed a generic-ORM/integer-ID/EAV-attribute model that the real,
-- deliberately denormalized public projection does not actually have.
--
-- SAFE TO DROP AND RECREATE (not an in-place ALTER dance): both tables have
-- zero rows in every environment — no production/staging DB_PUBLIC has ever
-- been provisioned (DAR-032/033), and local dev is schema-only. Confirmed
-- via `wrangler d1 execute DB_PUBLIC --local` immediately before writing
-- this migration. This is the only reason a destructive DROP TABLE is used
-- instead of an additive-only change — SQLite/D1 cannot cleanly add a NOT
-- NULL/UNIQUE constraint to an existing column without a full table rebuild
-- anyway, so recreating an already-empty table is strictly simpler and
-- equally safe.
--
-- What changed and why (Stage B comparison):
--   - Identity: the API returns no PostgreSQL/Odoo integer IDs at all
--     ("Identity is product_variant_xid exposed as id ... no PostgreSQL IDs
--     are returned" — PUBLIC_CATALOG_API_V1.md). `odoo_id INTEGER` could
--     never be populated by this integration and is dropped. `external_id`
--     is repurposed (not duplicated) as the durable XID identity, per
--     CLAUDE.md "Stable Identity": product_variant_xid on product_variants,
--     template xid on catalog_products. Both are now NOT NULL UNIQUE — the
--     primary sync key, matching this task's explicit instruction not to
--     match by name/slug/SKU alone.
--   - odoo_write_date -> catalog_updated_at: the API's real change-detection
--     field is `updated_at` (Odoo-local "YYYY-MM-DD HH:MM:SS" — normalize to
--     UTC ISO-8601 before storing, in the sync layer, not in SQL).
--   - category_id / default_unit_id (FKs to catalog_categories/units): the
--     API exposes no separate category or UOM master with independent
--     identity — `family`/`group`/`form` are flat string codes attached
--     directly to each variant (no category endpoint, no category ID), and
--     UOM is two free-text strings (`allowed_commercial_units`,
--     `inventory_uom`), not a referenceable uom.uom projection. Dropped;
--     catalog_categories/units remain in the schema, structurally
--     available, but are NOT fed by this integration (documented gap, not
--     silently abandoned — see DAR-034).
--   - product_type, internal_code/variant_code (separate from sku): the API
--     gives exactly one canonical, always-present `sku` per variant, no
--     separate internal code and no product_type enum. Consolidated to a
--     single required `sku` column.
--   - New columns added, one-to-one with verified API response fields:
--     commercial_size, section_size, schedule (present on every live
--     response but NOT documented in the API's own markdown/report —
--     DAR-034 discrepancy, kept because it is genuinely present data, not
--     invented), family/group/form/grade/standard code+name pairs,
--     allowed_commercial_units, inventory_uom, commercial_name (from the
--     API's `name`), commercial_template_name (from the API's
--     `template_name`, also undocumented in prose but present live).
--   - dimensions / nominal_weight: stored as `json_valid()`-guarded TEXT,
--     NOT decomposed columns — live verification across REBAR (diameter_mm/
--     length_mm, kg_m/per_branch), SHEET_PLATE (width_mm/thickness_mm/
--     length_mm, kg_m2/per_sheet), SEAMLESS_PIPE (outside_diameter_mm/
--     wall_thickness_mm/length_mm), SHS/RHS (width_mm/height_mm/
--     thickness_mm/length_mm, kg_m/per_branch) proved these are genuinely
--     polymorphic per product form (01-sources/DATABASE_SCHEMA.md §3.1:
--     "JSON: only for genuinely variable payloads"). The documentation's
--     own worked example uses a `kg_branch` key that the live API never
--     actually returns (`per_branch` is the real key, verified across three
--     groups) — exactly the kind of drift a fixed-column design would have
--     silently gotten wrong; storing the raw object avoids that entirely.
--   - name_fa / slug_fa (website-owned, unchanged intent, still NOT NULL):
--     now bootstrapped from real Odoo-sourced data at first-sync time
--     (commercial_name / a slug derived from the always-present, ASCII,
--     stable `sku`) rather than blocked entirely as in 0001's design (which
--     predated any real commercial name existing to bootstrap from). Never
--     touched again on subsequent syncs — see lib/catalog/sync.ts.
--
-- Still NOT populated by this integration, unchanged from 0001: is_public
-- always defaults to 0 (publication remains a deliberate editorial
-- decision, never automatic); no price column exists anywhere (pricing
-- remains out of scope).

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS catalog_products;

-- ---------------------------------------------------------------------------
-- catalog_products: lightweight template-level grouping row. Not separately
-- fetched from Odoo (the API has no template endpoint) — derived from the
-- first-seen variant referencing a given template_xid.
-- ---------------------------------------------------------------------------
CREATE TABLE catalog_products (
  id                        TEXT PRIMARY KEY,             -- ULID
  template_xid               TEXT NOT NULL,                -- Odoo template external ID, e.g. "ahanassa_marketplace.product_tmpl_pf_shs" — durable identity
  commercial_template_name    TEXT NOT NULL,               -- Odoo-sourced operational label (API `template_name`) — never the website's SEO name
  name_fa                      TEXT NOT NULL,               -- website-owned; bootstrapped from commercial_template_name at create, never overwritten by sync after that
  slug_fa                       TEXT NOT NULL,              -- website-owned; bootstrapped from a slugified representative SKU at create, never overwritten by sync after that
  is_active                      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),  -- true while at least one variant under it is active
  is_public                       INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)), -- publication is always a deliberate editorial action, never automatic
  sync_status                      TEXT NOT NULL DEFAULT 'synced'
                       CHECK (sync_status IN ('synced', 'odoo_missing')),
  last_synced_at                    TEXT,
  created_at                         TEXT NOT NULL,
  updated_at                          TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_catalog_products_template_xid ON catalog_products (template_xid);
CREATE UNIQUE INDEX uq_catalog_products_slug_fa ON catalog_products (slug_fa);

-- ---------------------------------------------------------------------------
-- product_variants: the primary sync target — the Public Catalog API is
-- variant-centric (PUBLIC_CATALOG_API_V1.md: "active, variant-centric
-- paginated list"), so nearly every commercial/classification/dimension
-- field the API exposes lives here, one row per product_variant_xid.
-- ---------------------------------------------------------------------------
CREATE TABLE product_variants (
  id                     TEXT PRIMARY KEY,                 -- ULID
  product_id             TEXT NOT NULL REFERENCES catalog_products (id) ON DELETE CASCADE,
  xid                    TEXT NOT NULL,                     -- product_variant_xid, exposed by the API as "id" — the durable commercial identity (CLAUDE.md "Stable Identity")
  sku                    TEXT NOT NULL,                      -- always present per the API contract
  commercial_name        TEXT NOT NULL,                       -- Odoo-sourced operational label (API `name`) — never the website's SEO name
  name_fa                TEXT NOT NULL,                        -- website-owned; bootstrapped from commercial_name at create, never overwritten by sync after that
  slug_fa                TEXT,                                  -- website-owned, optional (not every variant needs its own indexable page); bootstrapped from a slugified sku at create, never overwritten after
  commercial_size        TEXT,
  section_size           TEXT,
  schedule                TEXT,                                  -- present on every live response; undocumented in the API's own prose (DAR-034)
  family_code            TEXT,
  family_name             TEXT,
  group_code               TEXT,
  group_name                TEXT,
  form_code                  TEXT,
  form_name                   TEXT,
  grade_code                   TEXT,
  grade_name                    TEXT,
  standard_code                  TEXT,
  standard_name                   TEXT,
  dimensions_json                  TEXT CHECK (dimensions_json IS NULL OR json_valid(dimensions_json)),      -- genuinely polymorphic per product form — see file header
  nominal_weight_json                TEXT CHECK (nominal_weight_json IS NULL OR json_valid(nominal_weight_json)),
  allowed_commercial_units             TEXT,                    -- free-text display string, e.g. "kg, ton, branch, meter"
  inventory_uom                         TEXT,                   -- free-text, e.g. "kg"
  catalog_updated_at                     TEXT,                  -- normalized UTC ISO-8601 copy of the API's `updated_at` — change-detection high-water mark
  is_active                               INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_public                                INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  is_price_public                           INTEGER NOT NULL DEFAULT 0 CHECK (is_price_public IN (0, 1)),   -- flag only; no price column here (pricing out of scope)
  sync_status                                TEXT NOT NULL DEFAULT 'synced'
                       CHECK (sync_status IN ('synced', 'odoo_missing')),
  sync_version                                 INTEGER NOT NULL DEFAULT 0,
  last_synced_at                                TEXT,
  created_at                                     TEXT NOT NULL,
  updated_at                                      TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_product_variants_xid ON product_variants (xid);
CREATE UNIQUE INDEX uq_product_variants_sku ON product_variants (sku);
CREATE UNIQUE INDEX uq_product_variants_slug_fa ON product_variants (slug_fa) WHERE slug_fa IS NOT NULL;
CREATE INDEX idx_product_variants_product_id ON product_variants (product_id);
CREATE INDEX idx_product_variants_family_group_form ON product_variants (family_code, group_code, form_code);
