-- W32 (W29 P2): IR-only tables of the domestic RFQ buffer on iransrv. NEVER applied to D1 (wrangler reads only
-- migrations/); applied by lib/rfq-node/sqlite-d1.ts after the D1 migrations, into the same ops.sqlite file.
-- Nothing here holds personal data.

-- One row per received file the forwarder copies to the .ir R2 bucket (D-IR-4) before the RFQ goes to Odoo.
CREATE TABLE IF NOT EXISTS ir_file_remote (
  attachment_id     TEXT PRIMARY KEY REFERENCES rfq_attachments (id) ON DELETE CASCADE,
  remote_key        TEXT NOT NULL,                  -- = rfq_attachments.object_key (the contract v1.2 key)
  first_attempt_at  TEXT NOT NULL,
  last_attempt_at   TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  verified_at       TEXT,                           -- HEAD answered the stored size + sha256
  last_error        TEXT                            -- a class (r2_timeout, r2_http_403, size_mismatch …), never content
);

-- New-RFQ staff notices (Bale, D-IR-7): reference + counts only. One row per RFQ, so a notice is sent once.
CREATE TABLE IF NOT EXISTS ir_notices (
  rfq_id   TEXT PRIMARY KEY REFERENCES rfqs (id) ON DELETE CASCADE,
  sent_at  TEXT,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- Every look at the domestic admin view (D-IR-8): who, when, what — never the data shown.
CREATE TABLE IF NOT EXISTS ir_admin_access_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT NOT NULL,
  actor   TEXT NOT NULL,
  action  TEXT NOT NULL,
  rfq_id  TEXT
);

-- State-change alerting (lib/rfq-node/health.ts): one row per condition.
CREATE TABLE IF NOT EXISTS ir_alert_state (
  key          TEXT PRIMARY KEY,
  state        TEXT NOT NULL CHECK (state IN ('ok', 'alert')),
  since        TEXT NOT NULL,
  notified_at  TEXT
);
