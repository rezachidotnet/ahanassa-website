-- Spike S1 only — applied to the temporary D1 "ahanassa-spike-s1-ops" on top
-- of migrations/0001..0005. Mirrors architecture V1.1-RC1 §5.1/§5.2 additions.
ALTER TABLE rfqs ADD COLUMN payload_fingerprint TEXT;
ALTER TABLE rfqs ADD COLUMN catalog_snapshot_version TEXT;

CREATE TABLE IF NOT EXISTS rfq_variant_index (
  snapshot_version TEXT NOT NULL,
  locale TEXT NOT NULL,
  variant_xid TEXT NOT NULL,
  template_xid TEXT NOT NULL,
  group_code TEXT,
  selection_json TEXT NOT NULL,
  PRIMARY KEY (snapshot_version, locale, variant_xid)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS rfq_snapshot_pointer (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_version TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
