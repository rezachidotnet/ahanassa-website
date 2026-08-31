-- Migration: 0003_odoo_rfq_api_handoff
-- Database: DB_OPS
--
-- Adds the durable Website RFQ <-> Odoo RFQ mapping the dedicated Odoo
-- Public RFQ API v1 (docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md,
-- POST /api/v1/rfq) needs (DOCUMENT_AUDIT_REPORT.md DAR-041,
-- docs/ODOO_RFQ_API_INTEGRATION.md). Purely additive (ALTER TABLE ADD
-- COLUMN, nullable) — DB_OPS already holds real rows in staging (6 rfqs,
-- verified via `wrangler d1 execute DB_OPS --env staging --remote`
-- immediately before writing this migration) and 0 in production; this
-- must never be a DROP/recreate, the same discipline already established
-- for DB_PUBLIC and reaffirmed for DB_OPS in migration 0002.
--
-- Why not the existing `integration_mappings` table: that table's
-- `remote_id` column is `INTEGER NOT NULL` — a real constraint from the
-- legacy JSON-2 `crm.lead` integration, where every mapped remote record
-- genuinely had an Odoo database integer ID. The new RFQ API's success
-- response (`{"data":{"reference":"RFQ-YYYY-######","status":"received"}}`)
-- never returns an integer ID at all — only a business reference string —
-- so forcing a row into `integration_mappings` would require fabricating a
-- sentinel integer, which this project's own "never fabricate data" rule
-- forbids. `rfqs` already models this exact 1:1 relationship directly (see
-- the pre-existing, legacy-path `odoo_lead_id` column below), so the
-- narrowest correct fix is one new nullable column on `rfqs` itself, not a
-- new table and not a forced-fit into the existing generic mapping table.
--
-- The legacy `odoo_lead_id` (INTEGER, from the direct crm.lead path this
-- migration's integration replaces) is left completely untouched — no
-- rename, no drop, no backfill. It remains meaningful for any historical
-- row synced through the old path before this change; new RFQs synced
-- through the dedicated RFQ API never populate it (see
-- docs/ODOO_RFQ_API_INTEGRATION.md "Legacy CRM path").

ALTER TABLE rfqs ADD COLUMN odoo_rfq_reference TEXT;

-- Enforced only when present — mirrors the real Postgres UNIQUE constraint
-- the legacy path already relied on (`crm_lead_uniq_x_website_rfq_reference`),
-- now expressed on the Website's own side: two different Website RFQs can
-- never end up mapped to the same Odoo RFQ reference.
CREATE UNIQUE INDEX uq_rfqs_odoo_rfq_reference ON rfqs (odoo_rfq_reference) WHERE odoo_rfq_reference IS NOT NULL;
