-- Migration 0008 — website-side PII retention (architecture V1.1 §13.4;
-- owner decision 2026-10-04, docs/OWNER_DECISIONS.md "PII"; W5).
--
-- Odoo is the system of record and keeps customer data without a time limit.
-- DB_OPS is only a delivery buffer: once an RFQ is delivered (Odoo reference
-- present) for [30] days, the CI reconciler clears its personal fields and
-- keeps the non-personal record (docs/RFQ_PII_RETENTION.md,
-- lib/rfq/pii-retention.ts).
--
-- * rfqs.pii_purged_at — when the personal fields were cleared (NULL = not yet).
--   rfqs.retention_until (0001) is the purge due time, written by the same job.
-- * idx_rfqs_retention — the purge's due-row lookup.
--
-- Additive only (ALTER TABLE ADD COLUMN, CREATE INDEX IF NOT EXISTS): safe on
-- the existing staging/production DB_OPS; nothing reads or writes the new
-- column except the retention job.

ALTER TABLE rfqs ADD COLUMN pii_purged_at TEXT;

CREATE INDEX IF NOT EXISTS idx_rfqs_retention ON rfqs (sync_status, pii_purged_at, retention_until);
