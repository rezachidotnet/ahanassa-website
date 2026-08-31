# Website → Odoo RFQ API v1 Handoff

`DOCUMENT_AUDIT_REPORT.md` DAR-041. Canonical Odoo-owned contract artifacts:
`docs/integrations/odoo/rfq-v1/` (`RFQ_API_CONTRACT_V1.md` >
`AHANASSA_MARKETPLACE_PHASE6B_RFQ_API_REPORT.md` > `rfq_api_v1.openapi.yaml`
> historical Website assumptions, in that precedence order). Those files are
Odoo-owned contract snapshots — version-controlled here unchanged; do not
hand-edit them to match Website behavior.

## 1. What changed

New Website RFQs now synchronize to Odoo via the dedicated **Odoo Public
RFQ Intake API v1** — `POST /api/v1/rfq` — creating `ahanassa.rfq` +
`ahanassa.rfq.line` records only. This replaces the legacy path that called
the generic JSON-2 ORM transport directly to create `res.partner` +
`crm.lead`. CRM opportunity creation is now a private, Odoo-side,
operator/qualification-gated workflow downstream of `ahanassa.rfq` — the
Website never creates a CRM opportunity directly, and never did in this new
path.

The legacy path (`lib/odoo/adapter.ts`, `lib/odoo/client.ts`,
`lib/odoo/mapping.ts`, `lib/odoo/types.ts`) is **not deleted** — it is
functionally intact and documented as deprecated-for-RFQ-delivery in each
file's own header. It fully synced 0 real RFQs in production use: no
credential was ever provisioned for it (the Phase 6B report's own verdict
was "NOT READY FOR CLOUDFLARE RFQ INTEGRATION"), so retiring it from the
live path loses no real integration history.

## 2. Architecture (unchanged upstream of Odoo)

```
Browser → POST /api/rfqs → DB_OPS atomic durable write (rfqs/rfq_contacts/rfq_items)
        → integration_outbox → Cloudflare Queue (ODOO_SYNC_QUEUE)
        → lib/queue/consumer.ts
        → lib/odoo/rfq-payload-mapper.ts (snapshot → Odoo RFQ API v1 request)
        → lib/odoo/rfq-api-client.ts → POST /api/v1/rfq
        → ahanassa.rfq + ahanassa.rfq.line
        → (Odoo-private, downstream) qualification workflow → CRM opportunity
```

Everything upstream of the Odoo API client — the durable-first-write
guarantee, the outbox/Queue architecture, Turnstile/rate-limit protection,
DB_PUBLIC catalog-XID validation at submission time (`lib/rfq/service.ts`,
DAR-039) — is unchanged by this task. Odoo availability has never affected,
and still does not affect, the original Website submission's success: the
Browser-facing `POST /api/rfqs` never synchronously calls Odoo.

## 3. Request mapping

`lib/odoo/rfq-payload-mapper.ts#mapRfqToApiPayload` is the one explicit
mapper, Website durable snapshot → Odoo RFQ API v1 request. It reads only
already-persisted, immutable `rfqs`/`rfq_contacts`/`rfq_items` fields —
never live/mutable Catalog data, never D1 IDs, internal sync state,
Cloudflare metadata, Turnstile tokens, rate-limit data, or any Odoo/CRM ID.

- **`locale`** — passed through; rejected (not defaulted) if outside
  `fa`/`en`/`ar`.
- **`customer`** — `name`, `company`, `phone`, `email` map directly.
  `country`/`city` are **never sent**: `rfq_contacts.country_code`/`city`
  are always `NULL` today (the Website never captures them), and
  `rfqs.project_city` is a delivery-location field with different
  semantics — it is never conflated with the customer's own city.
- **`items`** — a catalog-linked line (`rfq_items.variant_ref` set) sends
  `product_variant_xid` as the sole relational identity plus `sku` as an
  audit/display snapshot only; a free-text line
  (`rfq_items.freeform_title` set) sends `product_variant_xid: null` (or
  omitted) plus the required `description`. An item is never silently
  reclassified between the two — a Catalog item missing its XID is a
  mapping failure, not a silent fallback to free-text.
- **`notes`** — `rfqs.message`, passed through unchanged.
- **`consent`** — **never sent.** The Website form has no real
  consent-capture UI; the OpenAPI schema confirms `consent` is optional
  (`required: [customer, items]` only), so omitting it is honest. Sending
  a fabricated `{contact: true}` would misrepresent the customer.
- **`source`** — `{ utm_source: "website" }` only; no fabricated
  `utm_medium`/`utm_campaign`.

### Quantity

`rfq_items.quantity_value`/`quantity_scale` (`value × 10^-scale`,
`DATABASE_SCHEMA.md` §3.1) are reconstructed into a real finite positive
number by `computeNumericQuantity`. When the Website could never cleanly
parse a number from the customer's free-text `quantity_text`, this returns
`null` — treated as a **hard sync blocker** (`UNCONVERTIBLE_QUANTITY`),
never a fabricated/guessed quantity, and never Supplier MOQ-adjusted.

### UOM

The Website has no structured, customer-facing unit-of-measure selector —
a genuine, pre-existing gap (DAR-039 Stage G), **not solved by this task**
(this integration does not redesign the RFQ form). Odoo's contract requires
one of exactly 8 controlled UOM codes per line
(`kg`/`ton`/`branch`/`sheet`/`meter`/`coil`/`bundle`/`piece` — never an
Odoo integer `uom.uom` ID). `inferOdooUomCode` does a best-effort,
non-fabricating keyword match against the same free-text `quantity_text`
the customer already typed (fa/en/ar keyword dictionary). When no keyword
matches, it returns `null` — an equally hard sync blocker
(`UNRESOLVED_UOM`), never a guessed default unit.

Both blockers fail the **entire** RFQ (not just the offending line) and
report the exact failing `lineNumber` — see §6.

## 4. Outbound idempotency

`lib/odoo/rfq-payload-mapper.ts#buildOutboundRfqIdempotencyKey(rfqId)` →
`` `rfq-${rfqId}` ``. Derived from the RFQ's own durable D1 ULID
(`rfqs.id`, the same value as `event.aggregate_id`) — **never** a fresh
random value per attempt, and **never** the raw browser-supplied
`Idempotency-Key` header (the Website only ever stores that key's SHA-256
hash, `lib/rfq/idempotency.ts`; the raw value is never persisted).
Reconstructable identically on every Queue/outbox retry from the same
stable `aggregate_id`, so it is unchanged across timeout/network retry by
construction — satisfying Odoo's same-key-same-payload safe-replay
contract.

The outbound payload is built only from the immutable D1 snapshot
(`mapRfqToApiPayload` never touches live Catalog/editorial tables), so a
later Product name/SKU/title change can never alter what an already-queued
retry sends to Odoo for an already-accepted RFQ.

## 5. Response handling

- **201 Created** (`meta.idempotent_replay: false`) — genuine creation.
  `rfqs.odoo_rfq_reference` is set to `data.reference`
  (`RFQ-YYYY-######`), `sync_status → 'synced'`. Odoo's integer database
  IDs are never required or stored — only the business reference.
- **200 OK** (`meta.idempotent_replay: true`) — idempotent replay, treated
  identically to success. The `reference` returned is trusted and
  persisted the same way; there is no local prior value to compare it
  against at this point, because the pre-call check
  (`rfqs.odoo_rfq_reference IS NOT NULL`) means Odoo is only ever called
  while that column is still `NULL` locally. As defense in depth, the
  write to `rfqs.odoo_rfq_reference` goes through the table's own
  `UNIQUE INDEX uq_rfqs_odoo_rfq_reference`
  (`migrations/0003_odoo_rfq_api_handoff.sql`) — a genuine collision
  (structurally unreachable under normal operation, since each Website RFQ
  has its own deterministic key) fails the write closed into
  `sync_status = 'manual_review'` rather than silently overwriting or
  retrying.
- **`verification_session`** — see §7. Never read past the point the
  client returns it; never logged, persisted, or forwarded anywhere.

### `rfqs.odoo_rfq_reference` vs. the legacy `odoo_lead_id`

`integration_mappings.remote_id` is `INTEGER NOT NULL` — incompatible with
an API that returns a business reference string, not an integer ID.
Rather than force a fabricated sentinel integer through that column, or
add an unnecessary new generic mapping table, migration `0003` adds one
narrow, nullable `rfqs.odoo_rfq_reference TEXT` column directly on `rfqs`
(mirroring how `odoo_lead_id` already modeled this same 1:1 relationship
for the old path). `odoo_lead_id` is **not populated** by the new sync path
and is **not destructively removed** — it stays as a historical record of
what the legacy path (if it ever ran against real production data) would
have written. `integration_mappings` is likewise no longer written by the
RFQ consumer, but the table itself is untouched (other providers/entities
may still use it).

## 6. Error classification (Stage F)

| Odoo response | Outcome | `rfqs.sync_status` | Queue retry? |
| --- | --- | --- | --- |
| 400 invalid payload | `invalid_payload` | `manual_review` | No — terminal |
| 401 unauthorized | `unauthorized` | `failed` | No — credential/config failure, never blindly retried indefinitely |
| 409 idempotency conflict | `idempotency_conflict` | `manual_review` | No — terminal, high priority |
| 413 payload too large | `payload_too_large` | `manual_review` | No — terminal |
| 415 unsupported media type | `unsupported_media_type` | `manual_review` | No — terminal |
| 500 / 5xx | `server_error` | `retry` | Yes — existing Queue policy, same Idempotency-Key |
| network/timeout error | `network_error` | `retry` | Yes — same Idempotency-Key |
| malformed/unparseable success body | `malformed_response` | `retry` | Yes — same Idempotency-Key (a retry either gets a clean idempotent replay or a clean fresh creation) |
| credential not configured | `not_configured` | `pending` | No — expected, stable state until Deployment Stage 1 provisions `ODOO_RFQ_API_TOKEN` |
| mapping failure (`UNCONVERTIBLE_QUANTITY` / `UNRESOLVED_UOM` / `MISSING_FREEFORM_DESCRIPTION` / `UNSUPPORTED_LOCALE` / `NO_ITEMS`) | — (Odoo never called) | `manual_review` | No — a real data blocker; retrying without a fix reproduces it identically |

Every `integration_attempts` row is written before the message is acked or
retried, exactly as the legacy path did — no weakening of the existing
Queue/DLQ/`integration_attempts`/`dead_letter_records`/outbox recovery
architecture.

## 7. `verification_session` — sensitive, its persistence lifecycle is deliberately unresolved here

`RFQ_BACKEND_ARCHITECTURE.md`'s "Verification-session binding invariant"
section confirms Odoo returns an opaque `verification_session` token to
the trusted caller on genuine 201 creation ("Idempotent replay preserves
the original binding and does not issue a replacement session").
`RFQ_API_CONTRACT_V1.md`'s own abbreviated worked example does not show
this field, so `RfqApiSuccessBody.verification_session` is typed
**optional** — correct regardless of which artifact reflects current
deployed behavior.

This phase treats it as sensitive opaque server-side material only:

- Never exposed to the Browser (no Website route returns it).
- Never included in ordinary logs (`lib/odoo/rfq-api-client.ts` never logs
  response bodies; `lib/queue/consumer.ts` never reads the field past the
  point `postRfqToOdoo` returns it).
- Never sent to analytics, never placed in a URL.
- **Not persisted anywhere** — no D1 column, no KV, no log line. The
  contract does not define what a safe persistence requirement would even
  be (what it is later exchanged for, its expiry, its intended consumer),
  so none is invented. This is a deliberately **unresolved** lifecycle
  question, not a solved one: if a future task needs to act on
  `verification_session` (e.g. a contact-verification/OTP flow), it must
  define that persistence contract explicitly and separately — this task
  does not, per its own boundary ("Do NOT implement Customer Contact
  Verification / OTP").

## 8. Authentication

`ODOO_RFQ_API_TOKEN` (`lib/env.ts#getOdooRfqApiConfig`) — a new, dedicated
credential, deliberately never the legacy `ODOO_API_KEY` (a different Odoo
permission model and route, scoped to the retired JSON-2 transport). No
value has been minted or committed anywhere in this repository; see
`.env.example` and `wrangler.jsonc`'s staging/production `vars` comments.
Provisioning a real Cloudflare Secret for either environment is
**Deployment Stage 1**, explicitly out of scope here.

## 9. Customer-resolution privacy boundary (Stage J)

Nothing from Odoo's private customer-resolution/qualification pipeline is
ever surfaced to the Website: no `possible_match`, partner-candidate data,
resolution confidence, verification state, qualification state,
`crm_lead_id`, or `partner_id`. The Website's only durable record of the
Odoo side is the public `odoo_rfq_reference` string.

## 10. What this integration explicitly does not do

Matches this task's own boundaries — restated here so a future reader does
not need to re-derive them: no Pricing, no Customer Authentication/Portal,
no Customer Contact Verification/OTP, no Supplier Offer data exposure, no
Odoo server modification, no live Odoo write test (no valid non-production
credential is available outside Git — the Phase 6B report's own verdict
settles this), no Cloudflare Worker deployment, no DNS/Vercel change.

## 11. Testing

`lib/odoo/rfq-payload-mapper.test.ts` (31 tests) and
`lib/odoo/rfq-api-client.test.ts` (19 tests, mocked HTTP — mirrors
`lib/odoo/adapter.test.ts`'s established pattern) cover: catalog/free-text/
mixed items, locale handling, the stable outbound idempotency key,
retry-payload immutability (mutating the source snapshot after mapping
never changes an already-built payload), every response classification in
§6, and that neither the bearer token nor `verification_session` nor a raw
Odoo error message ever appears in a client result.

`lib/queue/consumer.ts` (the D1-touching orchestration layer) has no
dedicated unit test file, consistent with this codebase's existing
convention — no D1-mocking pattern exists anywhere in this test suite
(catalog sync's own D1-touching code is likewise untested at this layer);
D1-free logic is pulled out into pure, directly-testable modules instead
(`rfq-payload-mapper.ts`, `rfq-api-client.ts`), exactly as
`lib/catalog/sync-safety.ts`/`sync-sql.ts` already established for the
Catalog stack. Real end-to-end proof against a live Odoo `POST /api/v1/rfq`
call is deferred to Deployment Stage 1, per this task's own instruction.

## 12. Migration

`migrations/0003_odoo_rfq_api_handoff.sql` — additive only
(`ALTER TABLE rfqs ADD COLUMN odoo_rfq_reference TEXT`, plus a partial
unique index). Applied and verified (row count unchanged at each step) on
local, staging (6 `rfqs` rows before and after), and production (0 `rfqs`
rows before and after).
