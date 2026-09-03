-- Migration: 0006_route_redirects_308
-- Database: DB_PUBLIC
--
-- Corrects `route_redirects.status_code`'s CHECK constraint from
-- `IN (301, 302, 410)` (migration 0005) to `IN (308, 302, 410)`.
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
-- SQLite cannot ALTER a CHECK constraint in place — the standard,
-- documented pattern is create-new/copy/drop-old/rename. This is normally
-- forbidden here for a populated table (see migration 0005's own header,
-- and the standing guardrail against repeating migration 0002's
-- DROP-and-recreate on real data) — it is safe ONLY because `route_redirects`
-- is verified EMPTY in every environment this schema has ever reached
-- (local D1 and the real staging D1, both checked immediately before
-- writing this migration: `SELECT COUNT(*) FROM route_redirects` = 0 in
-- both — no editor has ever changed a published template's slug yet, so no
-- real redirect row has ever been created). The `INSERT INTO ... SELECT`
-- step below is included anyway, as the always-correct form of this
-- pattern, even though it is a verified no-op today.
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

INSERT INTO route_redirects_new SELECT * FROM route_redirects;

DROP TABLE route_redirects;

ALTER TABLE route_redirects_new RENAME TO route_redirects;

CREATE UNIQUE INDEX uq_route_redirects_locale_old_path ON route_redirects (locale, old_path);
CREATE INDEX idx_route_redirects_locale_target_path ON route_redirects (locale, target_path);

PRAGMA foreign_keys = ON;
