-- Odoo stub (staging only): what the stub remembers so replays, conflicts and
-- "no duplicate after a killed run" are deterministic across isolates.
CREATE TABLE IF NOT EXISTS stub_rfqs (
  idempotency_key   TEXT PRIMARY KEY,
  fingerprint       TEXT NOT NULL,
  reference         TEXT NOT NULL,
  received_at       TEXT,
  website_reference TEXT,
  created_at        TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stub_control (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  mode       TEXT NOT NULL CHECK (mode IN ('normal', '500', '503', '429', 'timeout')),
  remaining  INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stub_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL,
  key         TEXT,
  status      INTEGER NOT NULL,
  has_v11     INTEGER NOT NULL
);
