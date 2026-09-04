-- Migration: 0007_processing_groups
-- Database: DB_PUBLIC (see wrangler.jsonc)
--
-- P5 — Website DB_PUBLIC Processing read model + background sync. Purely
-- additive (CREATE TABLE only) — no existing table (product_variants,
-- catalog_products, product_seo_contents, catalog_sync_state, etc.) is
-- touched, per the standing guardrail against ever repeating migration
-- 0002's DROP-and-recreate pattern now that real data exists in this
-- database (0003_catalog_sync_state.sql's own precedent).
--
-- Scope: the Processing Group public projection ONLY — a small,
-- deliberately minimal read model feeding a future Header dropdown (P6,
-- not this phase). Conceptually the Processing-domain analogue of
-- `catalog_products`/`product_variants` + `catalog_sync_state`, but at a
-- radically smaller scale (a handful of groups, not hundreds of variants) —
-- see lib/processing/sync-runner.ts for why catalog's ratio-based
-- "implausible drop" safety guard is NOT reused unchanged at this scale.
--
-- Stable identity: `code` is the Processing Group's stable string identity
-- as returned by the upstream API's `id` field (e.g. "SHEET_PROCESSING")
-- (task §3: "Do NOT use Odoo integer IDs. Do NOT invent another identity.").
-- No `odoo_id`/`external_id` integer-mapping column exists here (unlike
-- catalog_categories/catalog_products/product_variants in
-- 0001_catalog_schema.sql) — there is deliberately nothing to map, the
-- string code itself IS the durable cross-system key end to end.
--
-- Security (task §6/§28): only an explicit allow-list of public-safe fields
-- is ever stored — code, per-locale name, sequence, active flag, and sync
-- bookkeeping. No supplier/subcontractor, pricing, capacity, margin,
-- availability, payment-term, internal-note, or Odoo-DB-ID field exists on
-- this table, and none is ever written by `lib/processing/repository.ts`
-- (its INSERT/UPDATE statements name every column explicitly — an
-- unexpected upstream JSON key can never silently reach a column that does
-- not exist).
--
-- Conventions (01-sources/DATABASE_SCHEMA.md §3, matching 0001/0003 in this
-- same directory): TEXT ULID internal id, ISO 8601 UTC TEXT timestamps,
-- INTEGER 0/1 booleans with CHECK, snake_case plural table name,
-- idx_<table>_<columns> / uq_<table>_<columns> index naming.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- public_processing_groups: Header Services shortcut data source (P6) —
-- Odoo Processing Domain -> Public Processing Projection -> here (task §26/
-- §58.3 of AHANASSA_HEADER_FINAL_FROZEN_V2.0.md).
--
-- Localization strategy (task §7): one row per (code, locale) — Option B,
-- matching this database's own existing convention for per-locale content
-- (`product_seo_contents`'s `entity_id + locale` design, 0001_catalog_schema.sql)
-- rather than inventing a separate `name_fa`/`name_en`/`name_ar` columnar
-- pattern (Option A). `sequence`/`is_active`/`source_updated_at` are
-- duplicated per locale row rather than split into a second
-- locale-independent metadata table — deliberately, since the upstream API
-- itself returns them per-locale-scoped response and this keeps sync
-- writes/reads to one table for a 3-groups x 3-locales = 9-row dataset
-- (task §14/§27: do not over-build for three rows).
--
-- Fallback-translation distinction (task §7, "preserve the distinction
-- between actual translated source and fallback display value"): NOT
-- implemented — the upstream contract as given to this task (see
-- `lib/processing/odoo-api-client.ts` file header) exposes no field that
-- would let a caller distinguish a genuine `ar` translation from Odoo
-- falling back to another locale's text. This is a disclosed, known
-- limitation (task §7's own escape hatch: "If the API contract cannot
-- expose that distinction, document the limitation rather than inventing
-- certainty") — a `name_is_fallback` column was deliberately NOT added,
-- since there is no real signal to populate it with; adding the column
-- would only manufacture false certainty. Revisit once a real, documented
-- Processing API contract confirms whether such a signal exists.
CREATE TABLE public_processing_groups (
  id                 TEXT PRIMARY KEY,                              -- ULID
  code               TEXT NOT NULL,                                 -- stable Processing Group identity, e.g. "SHEET_PROCESSING" — never an Odoo integer ID
  locale             TEXT NOT NULL CHECK (locale IN ('fa', 'en', 'ar')),
  name               TEXT NOT NULL,
  sequence           INTEGER NOT NULL DEFAULT 0,
  is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),  -- soft withdrawal only (task §11) — never DELETEd, mirrors product_variants.is_active
  source_updated_at  TEXT,                                          -- upstream `updated_at`, normalized (lib/processing/sync.ts#normalizeProcessingTimestamp)
  synced_at          TEXT NOT NULL,                                 -- this row's last successful sync timestamp
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

-- Stable identity is unique per locale (task §20 "Stable identity should
-- have an appropriate uniqueness constraint") — the same code legitimately
-- has one row per supported locale, never two rows for the same
-- (code, locale) pair.
CREATE UNIQUE INDEX uq_public_processing_groups_code_locale ON public_processing_groups (code, locale);

-- The read model's actual query shape (lib/processing/public-repository.ts):
-- WHERE locale = ? AND is_active = 1 ORDER BY sequence, code.
CREATE INDEX idx_public_processing_groups_locale_sequence ON public_processing_groups (locale, sequence);

-- ---------------------------------------------------------------------------
-- processing_sync_state: durable Processing sync coordination state —
-- Processing's analogue of `catalog_sync_state` (0003_catalog_sync_state.sql),
-- reusing that table's lease-based mutual-exclusion design exactly (single
-- conditional UPDATE, atomic per-statement in D1/SQLite; a TTL'd lease so a
-- crashed run can never block Processing sync forever). Deliberately
-- simpler than catalog_sync_state in two ways:
--
--   1. No `last_attempted_type`/`last_success_type` ('incremental'/'full')
--      distinction — the Processing API contract given to this task has no
--      pagination/`updated_since` filter at all (task §3's example has none),
--      so every sync IS a full pull of the (tiny) complete set; there is no
--      separate incremental sync type to track.
--   2. No `last_incremental_watermark` — ETag/If-None-Match (task §12) is
--      the freshness mechanism here instead of a timestamp watermark, since
--      the upstream contract documents ETag/304 support and offers no
--      `updated_since` filter to build a watermark from. One ETag column
--      per locale (`etag_fa`/`etag_en`/`etag_ar`) rather than a single
--      shared column, since each locale is fetched as an independent
--      request/response and nothing in the given contract states the ETag
--      is locale-invariant.
--
-- Single coordinator, single lease, one row per environment (id = 'processing')
-- — all three locales are fetched/reconciled together under one lease
-- acquisition per scheduled run (task §14/§27), not three independent
-- lease-guarded processes; per-locale failure isolation is still preserved
-- at the application level (lib/processing/sync-runner.ts): one locale's
-- fetch failing never blocks or rolls back another locale's successful
-- reconciliation within the same run.
CREATE TABLE processing_sync_state (
  id                         TEXT PRIMARY KEY,            -- fixed singleton value: 'processing'
  last_attempted_at         TEXT,
  last_success_at           TEXT,
  consecutive_failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at           TEXT,
  last_failure_reason_code  TEXT,
  -- Stored ETag per locale, sent as If-None-Match on the next run (task
  -- §12). NULL until the first successful 200 response for that locale.
  etag_fa                   TEXT,
  etag_en                   TEXT,
  etag_ar                   TEXT,
  -- Lease: NULL/expired = free. lease_owner is an opaque run identifier (a
  -- ULID), never a secret, safe to log — identical convention to
  -- catalog_sync_state.lease_owner.
  lease_owner                TEXT,
  lease_expires_at           TEXT,
  created_at                 TEXT NOT NULL,
  updated_at                 TEXT NOT NULL
);

INSERT INTO processing_sync_state (id, consecutive_failure_count, created_at, updated_at)
VALUES ('processing', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
