-- Migration: 0003_catalog_sync_state
-- Database: DB_PUBLIC
--
-- Durable Scheduled Catalog Synchronization state (DOCUMENT_AUDIT_REPORT.md
-- DAR-040, docs/CATALOG_SYNC_OPERATIONS.md). Purely additive (CREATE TABLE
-- only, no change to any existing table) — both `product_variants`/
-- `catalog_products` (real commercial data, 237 rows in staging+production)
-- and `product_seo_contents` (real editorial content) are left completely
-- untouched, per the standing guardrail against ever repeating migration
-- 0002's DROP-and-recreate pattern now that real data exists.
--
-- Single-row ("singleton") design, `id = 'catalog'` fixed — this table
-- tracks ONE global synchronization process's state, not a row per sync
-- run. A future append-only run-history table could be added later without
-- migrating this one; not built now (CLAUDE.md "smallest complete change" —
-- the current durable-state requirements (Stage B) are all satisfiable with
-- a single current-state row).
--
-- The lease columns implement a lightweight DB-backed mutual-exclusion
-- lease (docs/CATALOG_SYNC_OPERATIONS.md §Concurrency) — not a heavyweight
-- distributed-lock system. Acquisition is a single conditional UPDATE
-- (`WHERE lease_owner IS NULL OR lease_expires_at < now`), which SQLite/D1
-- executes atomically per-statement; `changes = 0` means someone else holds
-- a still-valid lease. `lease_expires_at` guarantees a crashed/hung
-- execution can never lock Catalog synchronization forever.

CREATE TABLE catalog_sync_state (
  id                            TEXT PRIMARY KEY,            -- fixed singleton value: 'catalog'
  last_attempted_at             TEXT,
  last_attempted_type           TEXT CHECK (last_attempted_type IS NULL OR last_attempted_type IN ('incremental', 'full')),
  last_success_at               TEXT,
  last_success_type             TEXT CHECK (last_success_type IS NULL OR last_success_type IN ('incremental', 'full')),
  -- The durable high-water mark for the NEXT incremental run's `updated_since`
  -- — only ever advanced after a full incremental application succeeds
  -- (never before, never on partial/failed application). A safe overlap
  -- margin is subtracted at read time (docs/CATALOG_SYNC_OPERATIONS.md
  -- §Watermark safety), not baked into the stored value itself, so the
  -- margin policy can change later without a migration.
  last_incremental_watermark    TEXT,
  last_full_reconciliation_at   TEXT,
  -- Most recent successful FULL reconciliation's total upstream item count —
  -- the baseline the empty/implausible-snapshot safety guard compares the
  -- next full run's result against (lib/catalog/sync-safety.ts). Null until
  -- the first successful full reconciliation ever runs.
  last_full_upstream_count      INTEGER,
  consecutive_failure_count     INTEGER NOT NULL DEFAULT 0,
  last_failure_at               TEXT,
  last_failure_type             TEXT CHECK (last_failure_type IS NULL OR last_failure_type IN ('incremental', 'full')),
  last_failure_reason_code      TEXT,
  -- Lease: NULL/expired = free. lease_owner is an opaque run identifier
  -- (a ULID), never a secret, safe to log.
  lease_owner                   TEXT,
  lease_expires_at              TEXT,
  created_at                    TEXT NOT NULL,
  updated_at                    TEXT NOT NULL
);

INSERT INTO catalog_sync_state (id, consecutive_failure_count, created_at, updated_at)
VALUES ('catalog', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
