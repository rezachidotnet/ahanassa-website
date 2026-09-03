-- Migration: 0005_homepage_projection
-- Database: DB_PUBLIC
--
-- Homepage Product Architecture Hardening (this task). Purely additive
-- (CREATE TABLE only, no ALTER/DROP on any existing table) — `catalog_products`
-- (13 rows), `product_variants` (237 rows), and `product_seo_contents` (real
-- editorial content) are all left completely untouched, per the standing
-- guardrail against ever repeating migration 0002's DROP-and-recreate
-- pattern now that real data exists (same discipline as migration 0003/0004).
--
-- Two independent, generic tables:
--
--   homepage_product_rank — a presentation-only overlay keyed by
--   `catalog_products.id`, deliberately NOT a new source of truth for
--   product identity/name/slug (this task's own §34 "must not become
--   another source of truth") — it holds only ranking inputs. A template
--   with no row here is a normal, expected state (not yet prioritized/never
--   received demand), read as base_priority=0/manual_boost=0/demand_score=0
--   by the repository layer (lib/catalog/editorial-repository.ts), not an
--   error.
--
--   route_redirects — generic across entity types (products/categories/
--   articles/price-pages — this task's own §11 "not product-specific"),
--   never product-specific in its own schema. `old_path`/`target_path` are
--   full site-relative paths (e.g. "/products/old-slug"), not bare slugs,
--   so the same table can serve any future entity kind without a locale-
--   prefix or route-shape assumption baked into the columns.

CREATE TABLE homepage_product_rank (
  id                    TEXT PRIMARY KEY,                 -- ULID
  catalog_product_id    TEXT NOT NULL REFERENCES catalog_products (id),
  -- Deterministic, editorially-set base ordering (this task's §18) — no
  -- existing approved ordering exists anywhere in the current schema
  -- (verified: no sort_order/priority/rank column on catalog_products or
  -- product_variants), so this starts at a neutral 0 for every template
  -- rather than a fabricated initial ranking.
  base_priority         INTEGER NOT NULL DEFAULT 0,
  -- Independently editable/resettable editorial override (this task's
  -- §20) — never written by the demand-aggregation orchestrator, never
  -- derived from Odoo data.
  manual_boost          INTEGER NOT NULL DEFAULT 0,
  -- The ONLY column the demand-aggregation orchestrator
  -- (lib/ranking/aggregation-orchestrator.ts) ever writes — a precomputed,
  -- already-decayed, already-privacy-safe aggregate (product/template-level
  -- RFQ frequency, this task's §21-22). Never raw RFQ rows, never PII.
  demand_score          REAL NOT NULL DEFAULT 0,
  demand_computed_at    TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_homepage_product_rank_catalog_product_id ON homepage_product_rank (catalog_product_id);

CREATE TABLE route_redirects (
  id            TEXT PRIMARY KEY,                                     -- ULID
  locale        TEXT NOT NULL CHECK (locale IN ('fa', 'en', 'ar')),
  old_path      TEXT NOT NULL,                                        -- full site-relative path, e.g. "/products/old-slug"
  target_path   TEXT,                                                 -- NULL only for a terminal (410) disposition
  status_code   INTEGER NOT NULL CHECK (status_code IN (301, 302, 410)),
  entity_type   TEXT NOT NULL,                                        -- e.g. "catalog_template" — never constrained to a fixed enum, so a future entity kind needs no migration
  entity_id     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  CHECK (target_path IS NULL OR target_path <> old_path),             -- never a self-redirect
  CHECK ((status_code = 410 AND target_path IS NULL) OR (status_code <> 410 AND target_path IS NOT NULL))
);

-- One canonical redirect source per (locale, path) — a path can redirect to
-- exactly one place, never ambiguously to two.
CREATE UNIQUE INDEX uq_route_redirects_locale_old_path ON route_redirects (locale, old_path);
-- Supports the chain-collapse lookup in lib/catalog/route-redirects-logic.ts#planSlugChangeRedirects
-- ("which existing rows point at the path that is now itself moving").
CREATE INDEX idx_route_redirects_locale_target_path ON route_redirects (locale, target_path);
