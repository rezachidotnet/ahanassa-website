-- Migration: 0004_rfq_contacts_phone_iso2
-- Database: DB_OPS
--
-- RFQ Phone Field hardening (country-aware, server-authoritative E.164 —
-- lib/rfq/phone-server.ts). `rfq_contacts` already had phone_country_code
-- (ITU calling code)/phone_national/phone_e164 from 0001, previously
-- unpopulated. This migration adds the one missing piece the owner wants
-- persisted alongside them: the ISO-3166-1 alpha-2 country the customer
-- actually selected (e.g. "IR") — distinct from the calling code, since
-- several countries share a calling code (e.g. +1). Purely additive
-- (ALTER TABLE ... ADD COLUMN only) — no existing column/data touched.

ALTER TABLE rfq_contacts ADD COLUMN phone_iso2 TEXT;
