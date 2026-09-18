# POST-P3F Phase 4 — Live Staging RFQ Contract Verification

# RESULT

**BLOCKED — `BLOCKED_BY_CREDENTIAL_BINDING`.** The real, dedicated credential
this phase needs to cross the authenticated Website → Odoo RFQ API boundary
(`ODOO_RFQ_API_TOKEN`) is not provisioned on the staging Worker today — only
the unrelated, legacy `ODOO_API_KEY` exists there. This was checked directly
and safely (secret **names** only, via `wrangler secret list --env staging`
— no value was ever retrieved, printed, or would have been usable if it had
been). Per this task's own explicit instruction ("If no safe staging
credential path exists: STOP with `BLOCKED_BY_CREDENTIAL_BINDING`"), the
live-Odoo-submission portion of this task stops here. No workaround, no
fabricated token, no reuse of the wrong credential, and no production access
was attempted.

Everything that *can* be safely verified without that credential (Website
code health, migration state, regression baseline) was verified and is
healthy — this is a genuine infrastructure/provisioning gap, not a code
defect, and no evidence of a code-level defect was found.

# PRE-FLIGHT

- Branch: `feat/header-hero-integrated` (confirmed)
- HEAD at task start: `78ce722eb2d97e39fa98af877886960b6ffb17ce` (Phase 3's report commit) — unchanged throughout this task (no code was written)
- Working tree: clean except `tsconfig.tsbuildinfo`
- Phase 3 implementation confirmed present: `migrations/0005_rfq_length_mm.sql` exists; `lib/rfq/length-policy.ts`, the `length_mm` plumbing across `lib/rfq/types.ts`/`validation.ts`/`catalog-preselection.ts`/`repository.ts`/`lib/queue/consumer.ts`/`lib/odoo/rfq-payload-mapper.ts`/`rfq-api-types.ts`, and the CVAR-format regex fix are all present (all part of commit `681aa61`, unchanged).
- Staging D1 migration state: `wrangler d1 migrations list DB_OPS --env staging --remote` → **"No migrations to apply!"** — `0005_rfq_length_mm.sql` already applied (confirmed in Phase 3, reconfirmed here).
- Test baseline: **1330/1330 passing**, matches the expected Phase 3 baseline exactly.
- Read: `docs/POST_P3F_RFQ_LENGTH_MM_FULL_STACK_REPORT.md` (Phase 3's own report — it already anticipated exactly this gap, see "Next Phase" in that report), `app/api/rfqs/route.ts`, `lib/rfq/service.ts`, `lib/odoo/rfq-api-client.ts`, `lib/env.ts` (`getOdooRfqApiConfig`), `wrangler.jsonc` (staging block), `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`, `docs/ODOO_RFQ_API_INTEGRATION.md`, `docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md`, `.env.example`.

# SAFE CREDENTIAL PATH

**Discovery method (read-only, no value ever retrieved):**

```
wrangler secret list --env staging
```

Result: exactly one secret is provisioned on staging —

```json
[{ "name": "ODOO_API_KEY", "type": "secret_text" }]
```

`lib/env.ts#getOdooRfqApiConfig()` — the function `lib/odoo/rfq-api-client.ts` actually calls to build the authenticated request — reads `ODOO_RFQ_API_TOKEN` specifically, **never** `ODOO_API_KEY` (its own doc comment: *"Deliberately its own credential, `ODOO_RFQ_API_TOKEN` — never the legacy `ODOO_API_KEY` (that key authenticates the old generic JSON-2 transport ... scoped to a different Odoo permission model and no longer the RFQ delivery path)"*). `getOdooRfqApiConfig()` returns `null` whenever either half is missing — confirmed this is the exact, already-documented, expected state: `docs/ODOO_RFQ_API_INTEGRATION.md`'s own reconciliation-reason-code table lists `credential not configured → not_configured → pending` as *"expected, stable state until Deployment Stage 1 provisions `ODOO_RFQ_API_TOKEN`"* — for staging, that provisioning step has evidently not yet happened (Stage 1's own report, `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`, documents provisioning this token for **production**; nothing documents an equivalent staging provisioning step, and the live secret list above confirms it directly).

**No other credential path exists.** `.env.example` confirms the only sanctioned way to provide this value is `wrangler secret put ODOO_RFQ_API_TOKEN --env <env>` (never a committed file, never a plaintext local override for this particular secret — unlike Turnstile, Cloudflare publishes no public "always passes" test credential for the Odoo RFQ API, so the Phase 3 precedent of using an official dummy key pair has no equivalent here). Fabricating, guessing, or substituting `ODOO_API_KEY` for `ODOO_RFQ_API_TOKEN` would both fail (wrong permission model, per the doc comment above) and constitute exactly the "bypass authentication" this task explicitly forbids — not attempted.

```
STAGING_RFQ_CREDENTIAL: UNAVAILABLE
EXECUTION_PATH: none available — ODOO_RFQ_API_TOKEN is not provisioned on the staging Worker (`ahanassa-bootstrap-staging`); only the unrelated legacy ODOO_API_KEY exists there. A staging Worker HAS been deployed before (deployment history confirms several versions, including one triggered by a prior "Secret Change" event on 2026-08-29 — almost certainly the ODOO_API_KEY provisioning itself, not ODOO_RFQ_API_TOKEN), so the deployed-Worker execution path this task prefers structurally exists — it is only the specific credential that is missing, not the infrastructure.
```

# TARGET ENVIRONMENT

Not reached — blocked before any submission was attempted. For the record, had the credential existed, the intended targets were already confirmed non-production:

- Website target: staging Worker (`ahanassa-bootstrap-staging`, `env.staging` in `wrangler.jsonc`).
- D1 target: `ahanassa-ops-staging` (`49bd0aff-e289-4fff-b7b9-0f4b517e6b14`).
- Odoo target: `ODOO_BASE_URL=https://odoo.ahanassa.com` — the same single Odoo host every environment (including production) points at; there is no separate "staging Odoo" host in this architecture. This was already true and accepted in Phase 1–3 (the live Catalog API reads, the RFQ API's own design) — the safety boundary here is not a separate Odoo instance, it's that no *write* credential exists for the Website's staging Worker to use against it. This task's own §2 anticipates exactly this shape of risk ("If the existing API points to production Odoo business data: STOP") — but the correct, narrower stop condition that actually applies is §1's credential check, which fires first and makes the §2 question moot: there is no way to reach Odoo's RFQ endpoint from staging at all right now, safe or otherwise.

# TEST PAYLOAD

Prepared, never sent (no credential to send it with):

```json
{
  "product_variant_xid": "CVAR-000242",
  "quantity": 100,
  "uom": "kg",
  "length_mm": 8000
}
```

Matches the task's preferred case exactly. `CVAR-000242` (Equal Angle, `commercial_size: "50X50X5"`) was independently reconfirmed reachable and public on staging DB_PUBLIC moments before this check (unrelated to the RFQ credential — `DB_PUBLIC` publication state is unaffected by this blocker).

# WEBSITE HTTP SUBMISSION

**NOT_RUN.** This task's own instructions are explicit that the *primary proof* must be a real HTTP request to the **deployed staging** Website endpoint, not a local-dev-server substitute (*"Do NOT call internal helper functions directly for the primary proof"* — and by the same reasoning, a local `vinext dev` run bound to local D1, while legitimate for Phase 3's own local-only proof, is not "the deployed staging Website" this task asks for). Since the request would only reach the "Website validation → staging D1 persistence" steps and then permanently stall at `not_configured`/`pending` before ever reaching Odoo (see "Safe Credential Path"), running it now would not produce the actual proof this task exists to get, and Phase 3 already produced the maximum local-only proof available today (see that report's "Local Migration" section: real local HTTP submissions, real D1 persistence, real outbound-payload construction for the same `CVAR-000242`/`8000mm` case). Repeating that here under a different label would not be new evidence.

# OUTBOUND CONTRACT

**NOT_RUN against a live boundary.** The *shape* of the outbound contract was already fully verified in Phase 3 (`docs/POST_P3F_RFQ_LENGTH_MM_FULL_STACK_REPORT.md` "Odoo Payload"/"Local Migration") using the real, unmodified `mapRfqToApiPayload` against real persisted D1 rows: `product_variant_xid: "CVAR-000242"`, `quantity: 100`-shaped, `uom: "kg"`, `length_mm: 8000` when supplied and **entirely absent** (not `null`) when omitted — confirmed never to include a legacy XID, a `product.product` integer id, or any Supplier Offer/supplier field (structurally impossible — those fields do not exist anywhere in `RfqApiCatalogItem`/`RfqApiFreeTextItem`). Re-inspected the current code in this task and confirmed nothing has changed since Phase 3's verification (HEAD unchanged at `78ce722` throughout).

# ODOO API ACCEPTANCE

**NOT_RUN.** No authenticated call to `POST /api/v1/rfq` was made — there is no credential to authenticate it with. No HTTP status, Odoo result code, or Odoo-side identifier exists to record.

# RFQ LINE VERIFICATION

**NOT_RUN** (depends on Odoo API Acceptance above).

# NO-LENGTH COMPATIBILITY

**NOT_RUN against the live Odoo boundary** (same reason). The Website-side half of this — that an omitted `length_mm` is accepted and produces a payload with no `length_mm` key at all — was already proven in Phase 3 (both by unit test and by a real local HTTP submission for the UPE/CVAR-000260/meter/omitted case) and reconfirmed unchanged here by re-reading the current code (no diff since `78ce722`).

# INVALID-LENGTH VALIDATION

**Verified — reconfirmed from the existing, passing test suite rather than re-executed against a live boundary**, since this is purely a Website-side check with no Odoo dependency at all, and per this task's own §9 instruction ("Do not deliberately send invalid payloads to Odoo if Website validation already proves rejection"):

- `lib/rfq/validation.test.ts` — `"validateRfqSubmission: lengthMm = 0 is invalid"` and `"validateRfqSubmission: negative lengthMm is invalid"` both pass today (part of the 1330 green tests), proving both `length_mm = 0` and `length_mm < 0` are rejected with `fieldErrors["items[0].lengthMm"]: ["invalid"]` **before** any Odoo call could occur (`lib/rfq/service.ts#submitRfq` returns its `422` immediately on a `validateRfqSubmission` failure, strictly before the Turnstile check, the catalog resolution, and the D1 write — let alone the outbound Odoo call).

```
ZERO_LENGTH_REJECTED_WEBSITE_SIDE: YES
NEGATIVE_LENGTH_REJECTED_WEBSITE_SIDE: YES
```

# IDEMPOTENCY

No submission was made, so there is nothing to test for duplicate-submission behavior in this task. Re-confirmed from code (unchanged since Phase 3, `lib/rfq/idempotency.ts` / `lib/odoo/rfq-payload-mapper.ts#buildOutboundRfqIdempotencyKey`) that the durable, opaque client-submitted token remains the sole idempotency mechanism — no content-based deduplication exists or was introduced. No redesign was made or considered.

# DATA INTEGRITY

No new RFQ or RFQ line was created in this task (no submission occurred), so there is nothing new to read-verify. Staging DB_OPS was read once, read-only, to confirm `CVAR-000242`'s continued public/RFQ-eligible status on `DB_PUBLIC` (unrelated table, unrelated credential) — no `rfq_items`/`rfqs` row was touched, inserted, or modified by this task.

# CLEANUP

Not applicable — no test data was created in this task.

# SECURITY

- No secret value was printed, logged, displayed, or committed at any point — `wrangler secret list` returns names/types only by design; this was the only credential-adjacent command run.
- No `Authorization` header, token, password, or cookie appears anywhere in this report or in any file touched by this task.
- No production system was read from or written to.
- No Supplier/Supplier Offer data was involved (none was reachable — no Odoo call occurred).
- No Product Master mutation occurred (no Odoo write of any kind occurred).

# TESTS

**1330/1330 passing** — identical to the Phase 3 baseline; no test file was changed in this task.

# BUILD

- `npx tsc --noEmit`: clean (exit 0).
- `npm run build` (`vinext build`): clean (exit 0), identical route list to Phase 3.

# DEFECTS

**None found.** This is a provisioning gap (a credential was never set on the staging environment), not a code defect — `getOdooRfqApiConfig()`'s `null`-when-missing behavior and the consumer's `not_configured → pending` handling are exactly the designed, correct, already-documented response to this exact situation, not a bug. No `ROOT_CAUSE`/`FAILED_LAYER`/`MINIMAL_FIX_SCOPE` applies because nothing failed — the system behaved exactly as designed when asked to do something it was never given the credential to do.

**Minimal remediation to unblock a future Phase 4 attempt** (informational only, not implemented or scoped as a fix in this task, since it requires provisioning a secret, not writing code — an operator/owner action, not an engineering one):

```
wrangler secret put ODOO_RFQ_API_TOKEN --env staging
```

using the real staging-scoped RFQ API credential (however the Odoo side issues one for a non-production caller) — the same mechanism `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` already used for production.

# FINAL GATE

`PHASE4_GATE = BLOCKED` (`BLOCKED_BY_CREDENTIAL_BINDING`)

# NEXT PHASE

**Provision `ODOO_RFQ_API_TOKEN` on the staging Worker** (owner/operator action — obtaining a real, appropriately-scoped non-production Odoo RFQ credential and running `wrangler secret put ODOO_RFQ_API_TOKEN --env staging`), then re-run this exact Phase 4 verification. No Website code change is needed first — every layer this credential would exercise is already implemented, tested, and proven correct up to the boundary (Phase 3), and this task found nothing to fix.

# GIT STATE

- HEAD: `78ce722eb2d97e39fa98af877886960b6ffb17ce` (unchanged throughout — no code was written or changed in this task, exactly as expected: *"This task is NOT an implementation phase"*).
- `CODE_CHANGED: NO` — confirmed via `git status`/`git diff --stat` immediately before writing this report: zero files under `app/`, `components/`, `lib/`, `migrations/` differ from `PRE_HEAD`.
- Files added by this task: this report only (plus its `REPORT_BUNDLE_MANIFEST.txt` entry).
- No `01-sources/`, `logo/`, `design-reference/`, or Odoo-repository file touched. No production system touched. No secret committed. No push performed.
