-- Migration: 0007_rfq_admin_actions
-- Architecture V1.1 §15 (W3): the MANUAL_REVIEW tool — view, retry, close
-- with a reason — and the manual reconcile trigger log every action. This
-- table is that log: append-only, one row per mutating admin action, written
-- in the same D1 batch as the change it records.
--
-- `actor` is the free-text name the operator sends (x-admin-actor), never a
-- credential. No customer data is copied here — only the RFQ id and the
-- sync states before/after.
--
-- Closing an RFQ reuses existing enums (no table rebuild):
--   rfqs.sync_status = 'failed', last_sync_error_code = 'CLOSED_BY_ADMIN'
--   integration_outbox.status = 'dead'
-- Neither the reconciler nor the Queue consumer picks a 'failed' RFQ.

CREATE TABLE rfq_admin_actions (
  id                  TEXT PRIMARY KEY,                 -- ULID
  action              TEXT NOT NULL CHECK (action IN ('retry','close','reconcile')),
  rfq_id              TEXT,                             -- NULL for 'reconcile' when nothing was due
  reason              TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  actor               TEXT NOT NULL,
  previous_sync_status TEXT,
  new_sync_status     TEXT,
  result              TEXT NOT NULL,
  created_at          TEXT NOT NULL
);

CREATE INDEX idx_rfq_admin_actions_rfq_id ON rfq_admin_actions (rfq_id);
CREATE INDEX idx_rfq_admin_actions_created_at ON rfq_admin_actions (created_at);
