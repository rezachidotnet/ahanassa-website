-- Migration: 0011_catalog_public_categories
-- Database: DB_PUBLIC
--
-- Website public categories, projected from the Odoo Public Catalog API
-- `GET /api/v1/catalog/categories?locale=fa|en|ar` (live since 2026-09-27).
-- Purely additive: one new table, no existing table/column touched.
--
-- Odoo is the sole source of truth for which categories are public, their
-- order, their per-locale names, and which technical product groups each
-- one covers (`group_codes`, e.g. BOX_SECTION -> ["RHS","SHS"]). The
-- website stores a per-locale snapshot so public rendering never
-- synchronously depends on Odoo (CLAUDE.md §5) — same pattern as
-- catalog_group_labels (0009). Written only by
-- lib/catalog/category-sync-runner.ts / scripts/catalog-sync.ts
-- `categories`, which replace one locale's rows atomically per successful
-- fetch, so a category removed in Odoo disappears on the next sync.
--
-- Deliberately NOT the older `catalog_categories` table (0001): that one is
-- a Persian-only, parent/slug-shaped placeholder that no integration feeds
-- (lib/catalog/types.ts, DAR-034) and has no group mapping.
--
-- `position` is the 0-based index in Odoo's response — the website renders
-- in exactly that order and never re-sorts. `sequence` is kept as Odoo
-- reported it. `group_codes_json` is a JSON array of strings.
CREATE TABLE catalog_public_categories (
  code              TEXT NOT NULL,
  locale            TEXT NOT NULL CHECK (locale IN ('fa', 'en', 'ar')),
  name              TEXT NOT NULL,
  position          INTEGER NOT NULL,
  sequence          INTEGER NOT NULL,
  group_codes_json  TEXT NOT NULL CHECK (json_valid(group_codes_json) AND json_type(group_codes_json) = 'array'),
  template_count    INTEGER NOT NULL,
  variant_count     INTEGER NOT NULL,
  synced_at         TEXT NOT NULL,
  PRIMARY KEY (code, locale)
);

CREATE INDEX idx_catalog_public_categories_locale_position ON catalog_public_categories (locale, position);

-- No seed rows — populated only by a real sync against the live Odoo API.
