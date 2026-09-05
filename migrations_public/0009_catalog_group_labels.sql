-- Migration: 0009_catalog_group_labels
-- Database: DB_PUBLIC
--
-- NAV-P1 (docs/navigation/NAV_P1_PRODUCT_GROUP_LOCALIZATION_REPORT.md).
-- Purely additive: one new table, no existing table/column touched.
--
-- Root cause (NAV-P0 finding, confirmed in NAV-P1): the Odoo Public
-- Catalog API v1 genuinely supports `locale=fa|en|ar` on its list/detail
-- endpoints and resolves classification names accordingly
-- (docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md: "Responses
-- ... Names use deterministic locale fallback"; verified PASS in
-- AHANASSA_MARKETPLACE_PHASE5B_PUBLIC_CATALOG_API_REPORT.md: "Requested
-- -> Persian -> English -> Arabic -> neutral fallback passed") — but
-- lib/catalog/sync-runner.ts's existing full/incremental sync only ever
-- fetches with locale="fa" (hardcoded), and product_variants.group_name is
-- a single, non-per-locale column. The Header's Products dropdown
-- therefore shows a raw English/Persian-only string regardless of the
-- requested site locale.
--
-- This table stores ONLY the small (group_code, locale) -> localized name
-- mapping, sourced from the SAME authoritative upstream API this repo
-- already uses for all other catalog data — never a Header-owned or
-- frontend-hardcoded translation map (this task's own explicit
-- prohibition). `group_code` remains the sole stable identity everywhere
-- else in the schema; only its DISPLAY name varies by locale here.
--
-- No `show_in_navigation`/`sequence` field exists for Catalog groups
-- anywhere in the real, currently-fed v1 contract schema (verified:
-- `sort_order` only exists on `catalog_categories`/`attribute_definitions`/
-- `attribute_values`, all explicitly documented elsewhere as NOT fed by
-- this integration) — so no such field is invented here either. Navigation
-- ORDER continues to come from `product_variants.group_code` (a stable,
-- locale-invariant key), never from this table's translated `name`.
CREATE TABLE catalog_group_labels (
  group_code   TEXT NOT NULL,
  locale       TEXT NOT NULL CHECK (locale IN ('fa', 'en', 'ar')),
  name         TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (group_code, locale)
);

-- No seed rows — same "no fake/seeded data" discipline as every other
-- table in this schema. Populated only by a real sync against the live
-- Odoo Public Catalog API (lib/catalog/group-label-sync-runner.ts).
