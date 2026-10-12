-- Migration 0009 — RFQ file upload (owner decision D-RFQ-FILE, 2026-10-12;
-- docs/RFQ_FILE_UPLOAD.md). Follows 01-sources/DATABASE_SCHEMA.md
-- `rfq_attachments`, plus the slot/extension/failure fields this flow needs.
--
-- * rfq_attachments — metadata of the files declared with an RFQ. The bytes
--   live in the PRIVATE R2 bucket (binding RFQ_FILES) under
--   `rfq/<reference_number>/<slot>.<extension>` (object_key); no public URL
--   is ever stored. One row per declared file, written in the same D1 batch
--   as the RFQ itself.
--     upload_status  pending  — declared, bytes not (yet) received
--                    uploaded — bytes passed the server checks and are in R2
--                    failed   — not received: rejected content, storage error,
--                               or still pending when the RFQ was handed to
--                               Odoo (failure_code says which)
--     scan_status    not_configured — no malware scanner exists yet
--                    (PROJECT_OVERRIDES.md §8); kept for the canonical schema.
-- * rfqs.attachments_frozen_at — set once, by the first delivery attempt:
--   from then on the file list sent to Odoo (in `notes`) cannot change, so
--   every retry sends the same payload under the same Idempotency-Key.
-- * rfq_attachment_access_log — every staff download through /__admin.
--
-- Additive only: safe on the existing staging/production DB_OPS.

CREATE TABLE rfq_attachments (
  id                 TEXT PRIMARY KEY CHECK (length(id) = 26),
  rfq_id             TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  slot               INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 5),
  object_key         TEXT NOT NULL UNIQUE,
  original_filename  TEXT NOT NULL,
  extension          TEXT NOT NULL,
  mime_declared      TEXT NOT NULL,
  mime_detected      TEXT,
  byte_size          INTEGER NOT NULL CHECK (byte_size > 0),
  checksum_sha256    TEXT,
  r2_etag            TEXT,
  upload_status      TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploaded', 'verified', 'failed', 'deleted')),
  scan_status        TEXT NOT NULL DEFAULT 'not_configured' CHECK (scan_status IN ('pending', 'clean', 'blocked', 'error', 'not_configured')),
  failure_code       TEXT,
  upload_attempts    INTEGER NOT NULL DEFAULT 0,
  uploaded_at        TEXT,
  odoo_attachment_id INTEGER,
  retention_until    TEXT,
  deleted_at         TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  UNIQUE (rfq_id, slot)
);

CREATE INDEX idx_rfq_attachments_status ON rfq_attachments (upload_status, created_at);

ALTER TABLE rfqs ADD COLUMN attachments_frozen_at TEXT;

CREATE TABLE rfq_attachment_access_log (
  id            TEXT PRIMARY KEY,                 -- ULID
  attachment_id TEXT NOT NULL,
  rfq_id        TEXT NOT NULL,
  actor         TEXT NOT NULL,
  result        TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE INDEX idx_rfq_attachment_access_log_rfq ON rfq_attachment_access_log (rfq_id, created_at);
