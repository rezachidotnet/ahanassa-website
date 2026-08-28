-- Migration: 0001_rfq_ops_schema
-- Database: DB_OPS (see wrangler.jsonc) — operational data only, never public
-- page bodies. Scope: RFQ intake + durable outbox + Odoo-sync reliability
-- tables, per 01-sources/DATABASE_SCHEMA.md §6.1/§6.3 (physical-schema
-- authority — see DOCUMENT_AUDIT_REPORT.md for the naming reconciliation
-- against 01-sources/DATA_ARCHITECTURE(1).md §15/§28, which uses different
-- field/table names for the same concepts).
--
-- Deliberately NOT included in this migration (out of scope for the RFQ
-- backend foundation task):
--   rfq_attachments        — attachment upload stays disabled (PROJECT_OVERRIDES.md §8)
--   consent_records        — no consent UI exists on the approved RFQ form yet
--   staff_users/roles/...  — no admin UI in this task
--   audit_logs             — admin/governance scope, not RFQ intake
--   integration_inbox      — no inbound Odoo webhook consumer in this task
--   data_erasure_requests  — privacy tooling, separate task
--
-- Conventions (01-sources/DATABASE_SCHEMA.md §3): TEXT ULIDs for internal
-- IDs, ISO 8601 UTC TEXT timestamps, INTEGER 0/1 booleans with CHECK,
-- explicit CHECK-constrained enums, snake_case plural table names,
-- idx_<table>_<columns> / uq_<table>_<columns> index naming.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- rfqs: durable website intake record (the RFQ header)
-- ---------------------------------------------------------------------------
CREATE TABLE rfqs (
  id                     TEXT PRIMARY KEY,                 -- ULID
  reference_number       TEXT NOT NULL,                    -- customer-safe public reference, e.g. AA-RFQ-XXXXXXXX
  idempotency_key_hash   TEXT NOT NULL,                     -- SHA-256 of the client-supplied idempotency key; raw key not stored
  status                 TEXT NOT NULL DEFAULT 'received'
                           CHECK (status IN (
                             'received','viewed','in_progress','quoted','won','lost','cancelled','spam'
                           )),
  locale                 TEXT NOT NULL CHECK (locale IN ('fa','en','ar')),
  submission_method      TEXT NOT NULL DEFAULT 'structured'
                           CHECK (submission_method IN ('structured','attachment','mixed')),
  company_name           TEXT,
  project_name           TEXT,
  project_city           TEXT,
  message                TEXT,
  item_count             INTEGER NOT NULL DEFAULT 0,
  attachment_count       INTEGER NOT NULL DEFAULT 0,        -- always 0 in this task; attachment upload stays disabled (PROJECT_OVERRIDES.md §8)
  source_channel         TEXT NOT NULL DEFAULT 'website',
  odoo_lead_id           INTEGER,
  odoo_partner_id        INTEGER,
  sync_status            TEXT NOT NULL DEFAULT 'pending'
                           CHECK (sync_status IN (
                             'pending','queued','syncing','synced','retry','failed','manual_review'
                           )),
  sync_version           INTEGER NOT NULL DEFAULT 0,
  last_synced_at         TEXT,
  last_sync_error_code   TEXT,
  submitted_at           TEXT NOT NULL,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  retention_until        TEXT,
  deleted_at             TEXT
);

CREATE UNIQUE INDEX uq_rfqs_reference_number ON rfqs (reference_number);
CREATE UNIQUE INDEX uq_rfqs_idempotency_key_hash ON rfqs (idempotency_key_hash);
CREATE INDEX idx_rfqs_status ON rfqs (status);
CREATE INDEX idx_rfqs_sync_status ON rfqs (sync_status);
CREATE INDEX idx_rfqs_created_at ON rfqs (created_at);

-- ---------------------------------------------------------------------------
-- rfq_contacts: one-to-one contact snapshot required to respond
-- ---------------------------------------------------------------------------
CREATE TABLE rfq_contacts (
  rfq_id                 TEXT PRIMARY KEY REFERENCES rfqs (id) ON DELETE CASCADE,
  full_name              TEXT NOT NULL,
  job_title              TEXT,
  phone_country_code     TEXT,
  phone_national         TEXT,
  phone_e164             TEXT,
  email_normalized       TEXT,
  country_code           TEXT,
  city                   TEXT,
  preferred_contact_method TEXT,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- rfq_items: one or more product lines per RFQ
-- ---------------------------------------------------------------------------
CREATE TABLE rfq_items (
  id                     TEXT PRIMARY KEY,                 -- ULID
  rfq_id                 TEXT NOT NULL REFERENCES rfqs (id) ON DELETE CASCADE,
  line_number             INTEGER NOT NULL,
  source                 TEXT NOT NULL
                           CHECK (source IN ('selected','freeform','document_review','staff_added')),
  category_ref           TEXT,                              -- cross-database reference; no FK (DB_PUBLIC is a separate database)
  product_ref            TEXT,
  variant_ref            TEXT,
  unit_ref               TEXT,
  category_label         TEXT,                              -- immutable submission-time snapshot
  product_label           TEXT,
  variant_label           TEXT,
  unit_label              TEXT,
  freeform_title          TEXT,                              -- required when no catalog product is selected
  size_text               TEXT,
  quantity_text            TEXT NOT NULL,                    -- raw customer-entered value, e.g. "200 تن" — see note below
  quantity_value           INTEGER,                           -- best-effort parsed decimal (value x 10^-scale); NULL when not cleanly parseable
  quantity_scale            INTEGER CHECK (quantity_scale IS NULL OR quantity_scale BETWEEN 0 AND 6),
  description              TEXT,
  odoo_product_id           INTEGER,
  odoo_uom_id               INTEGER,
  resolution_status         TEXT NOT NULL DEFAULT 'not_applicable'
                           CHECK (resolution_status IN ('resolved','unresolved','manual_review','not_applicable')),
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL,
  CHECK (
    (variant_ref IS NOT NULL) OR (product_ref IS NOT NULL) OR (freeform_title IS NOT NULL)
  ),
  CHECK (quantity_value IS NULL OR quantity_value > 0)
);

-- NOTE on quantity_text/quantity_value split: 01-sources/DATABASE_SCHEMA.md
-- §6.1 requires quantity_value/quantity_scale as the authoritative decimal
-- representation. The current approved RFQ UI (components/contact/enquiry-form.tsx,
-- frozen visual baseline per design-reference/v0-approved/) collects
-- quantity as a single freeform string (e.g. "200 تن" or "500 عدد"), not a
-- separate number+unit pair, and redesigning that field is out of this
-- task's scope. quantity_text is therefore always populated from the raw
-- submission (full fidelity, never silently discarded); quantity_value/
-- quantity_scale are populated only when the server can unambiguously parse
-- a leading decimal number, and left NULL otherwise rather than guessing.
-- See DOCUMENT_AUDIT_REPORT.md for this reconciliation.

CREATE UNIQUE INDEX uq_rfq_items_rfq_id_line_number ON rfq_items (rfq_id, line_number);
CREATE INDEX idx_rfq_items_rfq_id ON rfq_items (rfq_id);

-- ---------------------------------------------------------------------------
-- rfq_status_history: append-only workflow status changes
-- ---------------------------------------------------------------------------
CREATE TABLE rfq_status_history (
  id                     TEXT PRIMARY KEY,                 -- ULID
  rfq_id                 TEXT NOT NULL REFERENCES rfqs (id) ON DELETE CASCADE,
  previous_status         TEXT,
  new_status              TEXT NOT NULL,
  actor_type               TEXT NOT NULL CHECK (actor_type IN ('system','staff','integration')),
  actor_ref                TEXT,
  reason_code               TEXT,
  note                      TEXT,
  correlation_id             TEXT,
  created_at                TEXT NOT NULL
);

CREATE INDEX idx_rfq_status_history_rfq_id ON rfq_status_history (rfq_id);

-- ---------------------------------------------------------------------------
-- integration_outbox: transactional outbox — written in the same D1 batch
-- as the rfqs/rfq_items/rfq_contacts insert it describes
-- ---------------------------------------------------------------------------
CREATE TABLE integration_outbox (
  event_id                TEXT PRIMARY KEY,                 -- ULID; also the idempotency unit for the queue message
  aggregate_type            TEXT NOT NULL,
  aggregate_id              TEXT NOT NULL,
  aggregate_version          INTEGER NOT NULL DEFAULT 1,
  event_type                 TEXT NOT NULL,
  schema_version              INTEGER NOT NULL DEFAULT 1,
  correlation_id               TEXT NOT NULL,
  payload_json                TEXT NOT NULL,                -- minimal identifiers only — consumer re-reads authoritative data from D1
  status                       TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','dispatching','published','retry','dead')),
  attempt_count                INTEGER NOT NULL DEFAULT 0,
  available_at                  TEXT NOT NULL,
  locked_until                   TEXT,
  created_at                     TEXT NOT NULL,
  published_at                    TEXT,
  last_error_code                  TEXT
);

CREATE INDEX idx_integration_outbox_status_available_at ON integration_outbox (status, available_at);
CREATE INDEX idx_integration_outbox_aggregate ON integration_outbox (aggregate_type, aggregate_id);

-- ---------------------------------------------------------------------------
-- integration_attempts: append-only diagnostic record per delivery attempt
-- ---------------------------------------------------------------------------
CREATE TABLE integration_attempts (
  id                       TEXT PRIMARY KEY,                 -- ULID
  event_id                  TEXT NOT NULL REFERENCES integration_outbox (event_id) ON DELETE CASCADE,
  provider                    TEXT NOT NULL DEFAULT 'odoo',
  attempt_number                INTEGER NOT NULL,
  started_at                     TEXT NOT NULL,
  finished_at                     TEXT,
  http_status_category              TEXT,                    -- e.g. "2xx" / "4xx" / "5xx" / "network_error" — never a raw provider body
  outcome                            TEXT NOT NULL CHECK (outcome IN ('success','transient_failure','permanent_failure')),
  error_code                          TEXT,
  correlation_id                       TEXT NOT NULL
);

CREATE INDEX idx_integration_attempts_event_id ON integration_attempts (event_id);

-- ---------------------------------------------------------------------------
-- integration_mappings: local <-> Odoo identity map, keeps repeated queue
-- delivery idempotent (upsert, never re-create)
-- ---------------------------------------------------------------------------
CREATE TABLE integration_mappings (
  id                       TEXT PRIMARY KEY,                 -- ULID
  provider                   TEXT NOT NULL DEFAULT 'odoo',
  local_entity_type            TEXT NOT NULL,                -- e.g. "rfq", "contact"
  local_entity_id                TEXT NOT NULL,
  remote_model                     TEXT NOT NULL,             -- e.g. "crm.lead"
  remote_id                         INTEGER NOT NULL,
  external_id                        TEXT,
  remote_write_date                    TEXT,
  sync_version                          INTEGER NOT NULL DEFAULT 1,
  last_success_at                        TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_integration_mappings_local ON integration_mappings (provider, local_entity_type, local_entity_id);
CREATE UNIQUE INDEX uq_integration_mappings_remote ON integration_mappings (provider, remote_model, remote_id);

-- ---------------------------------------------------------------------------
-- dead_letter_records: durable, searchable incident projection — Cloudflare
-- Queue DLQ retention is transport-level, not a permanent incident archive
-- ---------------------------------------------------------------------------
CREATE TABLE dead_letter_records (
  id                       TEXT PRIMARY KEY,                 -- ULID
  event_id                  TEXT,                             -- best-effort link back to integration_outbox.event_id
  aggregate_type              TEXT,
  aggregate_id                  TEXT,
  failure_category                TEXT NOT NULL,
  retry_count                       INTEGER NOT NULL DEFAULT 0,
  first_failed_at                    TEXT NOT NULL,
  last_failed_at                      TEXT NOT NULL,
  resolution_status                     TEXT NOT NULL DEFAULT 'open'
                           CHECK (resolution_status IN ('open','investigating','resolved','ignored')),
  assigned_to                             TEXT,
  resolution_note                           TEXT,
  raw_message_json                           TEXT              -- sanitized copy of the DLQ message body for replay; never contains secrets
);

CREATE INDEX idx_dead_letter_records_resolution_status ON dead_letter_records (resolution_status);
CREATE INDEX idx_dead_letter_records_event_id ON dead_letter_records (event_id);
