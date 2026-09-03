-- Migration: 0006_route_redirects_308
-- Database: DB_PUBLIC
--
-- Corrects `route_redirects.status_code`'s CHECK constraint from
-- `IN (301, 302, 410)` (migration 0005) to `IN (308, 302, 410)`, converting
-- any existing `status_code = 301` row to `308` in place.
--
-- This is a DATA-PRESERVING SCHEMA REBUILD, not an additive (CREATE-only)
-- migration — it is the standard SQLite pattern for changing a CHECK
-- constraint (SQLite cannot ALTER a CHECK constraint in place):
-- create-new-table / copy-and-convert-existing-rows / drop-old-table /
-- rename-new-to-old. It is normally forbidden here for a populated table
-- (see migration 0005's own header, and the standing guardrail against
-- repeating migration 0002's DROP-and-recreate on real data) — it remains
-- safe to run at any point, including after real rows exist, specifically
-- BECAUSE the copy step below explicitly converts every historical
-- `status_code = 301` value to `308` rather than assuming none exist. Both
-- local D1 and the real staging D1 were independently verified EMPTY
-- (`SELECT COUNT(*) FROM route_redirects` = 0 in both) immediately before
-- this migration was first written — but that fact is not what makes this
-- migration correct; a bare `SELECT *` copy would have silently rejected
-- any real `301` row against the new CHECK constraint the moment one
-- existed. The explicit column list + `CASE` conversion below makes this
-- migration robust regardless of when or against which environment it is
-- actually applied.
--
-- Root cause (code-review hardening pass, DAR-054): `route_redirects` rows
-- for a canonical slug change were stored as `status_code = 301`, but
-- `app/[locale]/products/[slug]/page.tsx` called `next/navigation`'s plain
-- `redirect()`, which under this stack's Next.js App Router actually emits
-- a TEMPORARY 307/303 — the database claimed a permanent redirect while the
-- real HTTP response was temporary. The fix switches the page to
-- `permanentRedirect()` (real HTTP 308) and this migration makes the stored
-- contract match that real behavior exactly, rather than leaving the
-- database and the actual HTTP response semantics different.
--
-- Conversion rule (explicit column list, never `SELECT *`):
--   301 (the old, incorrect "permanent" value) -> 308 (the correct one)
--   302 (temporary — unrelated to this fix)    -> 302, unchanged
--   410 (terminal/gone — unrelated to this fix) -> 410, unchanged
-- Every other column is copied through byte-for-byte.
--
-- `homepage_product_rank` (also created by migration 0005) is NOT touched
-- by this migration — its schema is unaffected by this fix.

PRAGMA foreign_keys = OFF;

CREATE TABLE route_redirects_new (
  id            TEXT PRIMARY KEY,
  locale        TEXT NOT NULL CHECK (locale IN ('fa', 'en', 'ar')),
  old_path      TEXT NOT NULL,
  target_path   TEXT,
  status_code   INTEGER NOT NULL CHECK (status_code IN (308, 302, 410)),
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  CHECK (target_path IS NULL OR target_path <> old_path),
  CHECK ((status_code = 410 AND target_path IS NULL) OR (status_code <> 410 AND target_path IS NOT NULL))
);

INSERT INTO route_redirects_new (id, locale, old_path, target_path, status_code, entity_type, entity_id, created_at, updated_at)
SELECT
  id,
  locale,
  old_path,
  target_path,
  CASE status_code
    WHEN 301 THEN 308
    ELSE status_code
  END,
  entity_type,
  entity_id,
  created_at,
  updated_at
FROM route_redirects;

DROP TABLE route_redirects;

ALTER TABLE route_redirects_new RENAME TO route_redirects;

CREATE UNIQUE INDEX uq_route_redirects_locale_old_path ON route_redirects (locale, old_path);
CREATE INDEX idx_route_redirects_locale_target_path ON route_redirects (locale, target_path);

PRAGMA foreign_keys = ON;
