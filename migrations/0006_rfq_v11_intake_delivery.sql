-- Migration 0006 — architecture V1.1 (frozen r2) §5.2 / §6: standalone RFQ
-- Worker intake + delivery.
--
-- * rfqs.payload_fingerprint — SHA-256 of the normalized rfq_submit.v1 payload
--   (docs/contracts/RFQ_SUBMIT_V1.md); same idempotency key + different
--   fingerprint is answered 409.
-- * rfqs.catalog_snapshot_version — snapshot.v1 version the form was built from.
-- * received_at is NOT a new column: rfqs.submitted_at is already the acceptance
--   (D1 commit) time and is what the delivery sends as Odoo `received_at`
--   (docs/contracts/RFQ_INTAKE_V1_1.md §1).
-- * integration_outbox.last_attempt_at / last_error — delivery bookkeeping.
--   `available_at` (0001) stays "next attempt time". last_error holds a short
--   code-like text, never PII and never an Odoo `error.message`.
-- * rfq_items.unpublished_at_receipt — the variant was valid in the submitted
--   snapshot but no longer in the active one (accepted and flagged, §6.1).
-- * rfqs.retention_until already exists (0001); it is written by the PII
--   retention job (architecture §13.4), not by this migration.
--
-- Additive only (ALTER TABLE ADD COLUMN, CREATE INDEX IF NOT EXISTS): safe on
-- the existing staging/production DB_OPS when they are migrated later.

ALTER TABLE rfqs ADD COLUMN payload_fingerprint TEXT;
ALTER TABLE rfqs ADD COLUMN catalog_snapshot_version TEXT;

ALTER TABLE integration_outbox ADD COLUMN last_attempt_at TEXT;
ALTER TABLE integration_outbox ADD COLUMN last_error TEXT;

ALTER TABLE rfq_items ADD COLUMN unpublished_at_receipt INTEGER NOT NULL DEFAULT 0 CHECK (unpublished_at_receipt IN (0, 1));

-- Reconciler work source (architecture §6.4): undelivered RFQs by status/age.
CREATE INDEX IF NOT EXISTS idx_rfqs_sync_status_updated_at ON rfqs (sync_status, updated_at);
