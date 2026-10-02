-- Migration 0012 — architecture V1.1 (frozen r2) §5.1: versioned public
-- snapshots, the active pointer, and the RFQ variant index.
--
-- * publication_state: one row per snapshot.v1 publication
--   (docs/contracts/SNAPSHOT_V1.md); status staged|active|superseded|failed.
-- * publication_pointer: the single active_version row, switched only after a
--   successful smoke (§7.1 steps 7–8). The RFQ Worker reads it read-only.
-- * rfq_variant_index: one row per (snapshot_version, locale, canonical
--   variant) — the RFQ Worker resolves every submitted variant with ONE query
--   (§6.1, A8). Rows come from artifact private-snapshot/rfq-variant-index.sql.
--   selection_json is the server-side RfqCatalogSelection; never public.
--
-- Additive only; existing catalog tables are unchanged (they remain build
-- inputs, §5.1).

CREATE TABLE IF NOT EXISTS publication_state (
  version          TEXT PRIMARY KEY CHECK (version GLOB 'snap-[0-9a-f]*' AND length(version) = 21),
  manifest_sha256  TEXT,
  created_at       TEXT NOT NULL,
  source_counts    TEXT NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL CHECK (status IN ('staged', 'active', 'superseded', 'failed')),
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publication_pointer (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  active_version  TEXT NOT NULL REFERENCES publication_state (version),
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rfq_variant_index (
  snapshot_version      TEXT NOT NULL,
  locale                TEXT NOT NULL CHECK (locale IN ('fa', 'en', 'ar')),
  canonical_variant_id  TEXT NOT NULL,
  template_id           TEXT NOT NULL,
  group_code            TEXT,
  allowed_units         TEXT NOT NULL,
  selection_json        TEXT NOT NULL,
  PRIMARY KEY (snapshot_version, locale, canonical_variant_id)
) WITHOUT ROWID;
