# POST-P3F Phase 4 — Staging RFQ Credential Provisioning

# RESULT

**BLOCKED — `CREDENTIAL_SOURCE_MISSING`.** No staging-scoped Odoo RFQ API
credential exists, and none can be created from this side. Provisioning was
therefore deliberately **not** performed: the task's own §1 stop condition
("If no valid staging credential exists yet: STOP and report
`CREDENTIAL_SOURCE_MISSING`") fires before §3, and §2's scope verification
fails outright — the only value that would authenticate against
`POST /api/v1/rfq` is provably the **production** credential, not a
staging/test-scoped one.

This is not a discovery gap that more searching would close. It is a
documented property of the Odoo-side authentication architecture, confirmed
independently three ways in this task (canonical Odoo contract, Odoo backend
Phase 6B report, and the live staging/production `wrangler.jsonc` `vars`):

1. **The Odoo RFQ API has exactly one global runtime Bearer secret.** The
   canonical contract (`docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md`,
   "Authentication and headers") defines the credential as a single runtime
   configuration key — `ahanassa_rfq_api_secret`, or the environment variable
   `AHANASSA_RFQ_API_SECRET`. There is no per-caller token record, no token
   issuance or management route (`POST /api/v1/rfq` is the *only* route in
   the contract and in `rfq_api_v1.openapi.yaml` — "No status, catalog, CRM,
   order, or mutation routes are included"), and no environment or scope
   concept anywhere in the contract. A second, independently revocable
   staging token is not something the Odoo side currently supports.
2. **There is only one Odoo instance and one database.** Staging and
   production `vars` in `wrangler.jsonc` are identical on both fields:
   `ODOO_BASE_URL = https://odoo.ahanassa.com`, `ODOO_DATABASE = ahanassa`.
   There is no staging Odoo host and no staging Odoo database to be scoped
   to.
3. **The project has already ruled on exactly this.**
   `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §5 ("Odoo credential constraint —
   explicit"): *"The live Odoo RFQ API supports exactly one runtime Bearer
   secret; it does not support independently revocable staging/production
   tokens… `ODOO_RFQ_API_TOKEN` provisioned here is therefore, unavoidably,
   the production credential — any real `POST /api/v1/rfq` call from this
   deployment creates a real `ahanassa.rfq` record in the live Odoo database.
   There is no separate 'staging Odoo' to test safely against."*
   `docs/ODOO_RFQ_API_INTEGRATION.md` §10 states the same conclusion from the
   other direction: *"no live Odoo write test (no valid non-production
   credential is available outside Git — the Phase 6B report's own verdict
   settles this)"*.

Consequently, the only action that would have "unblocked" Phase 4 is copying
the **production** Odoo RFQ write credential onto the staging Worker. That
would grant `ahanassa-bootstrap-staging` real write access to the live
`ahanassa` business database — every staging RFQ submission thereafter
creating a real `ahanassa.rfq` record. That is a materially different
decision from the one this task authorizes ("Safely provision the correct
**staging-scoped** Odoo RFQ API credential"), it is an owner decision rather
than an engineering one, and it was not taken. No token was invented,
guessed, minted, or substituted; `ODOO_API_KEY` was not reused.

# PRE-FLIGHT

All checks read-only. No secret value was retrieved, printed, or written at
any point in this task.

| Check | Value |
|---|---|
| Branch | `feat/header-hero-integrated` (confirmed via `git branch --show-current`) |
| HEAD at task start | `1cc70b986ad0209b4c9a6fd08397b4a8d79aba82` (Phase 4 blocked-report commit) |
| Working tree at task start | Clean except `tsconfig.tsbuildinfo` (pre-existing, untouched by this task) |
| Staging Worker name | `ahanassa-bootstrap-staging` (`wrangler.jsonc` → `env.staging.name`) |
| Expected secret name in code | `ODOO_RFQ_API_TOKEN` — read by `lib/env.ts#getOdooRfqApiConfig()` (`process.env.ODOO_RFQ_API_TOKEN`), the only function `lib/odoo/rfq-api-client.ts` uses to build the authenticated request. Returns `null` when either half is missing — never a partial config. |
| Staging Odoo RFQ endpoint | `https://odoo.ahanassa.com/api/v1/rfq` (`env.staging.vars.ODOO_BASE_URL` + the contract's single route) |
| Staging Odoo database | `ahanassa` (`env.staging.vars.ODOO_DATABASE`) |
| Production Odoo endpoint / database | `https://odoo.ahanassa.com` / `ahanassa` — **identical to staging** |
| Production target involved? | **No.** No production Worker, D1, queue, or secret was read, listed, modified, or deployed. |

Documents read: `docs/POST_P3F_PHASE4_LIVE_STAGING_RFQ_CONTRACT_VERIFICATION_REPORT.md`
(the blocked Phase 4 report this task responds to),
`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §4–§5,
`docs/ODOO_RFQ_API_INTEGRATION.md` §8/§10,
`docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md`,
`docs/integrations/odoo/rfq-v1/AHANASSA_MARKETPLACE_PHASE6B_RFQ_API_REPORT.md`,
`docs/integrations/odoo/rfq-v1/rfq_api_v1.openapi.yaml`,
`docs/integrations/odoo/rfq-v1/RFQ_BACKEND_ARCHITECTURE.md`,
`lib/env.ts`, `wrangler.jsonc` (staging + production blocks), `README.md`
(DAR-041/DAR-042 updates), `DOCUMENT_AUDIT_REPORT.md` (DAR-041/DAR-042
credential entries).

# CREDENTIAL AUTHORITY

Each candidate source named by the task was checked and eliminated.

**1. Existing Odoo staging API-token management — does not exist.**
The Odoo backend's own Phase 6B report
(`AHANASSA_MARKETPLACE_PHASE6B_RFQ_API_REPORT.md`) states: *"Runtime secret
name is `ahanassa_rfq_api_secret` (Odoo config) or `AHANASSA_RFQ_API_SECRET`
(environment)"* — one process-level secret, compared with
`hmac.compare_digest`, not a row in a token table. The same report's closing
section confirms the injection path is an operations action on the Odoo
runtime (*"until operations inject `ahanassa_rfq_api_secret` … through the
protected runtime secret mechanism"*), with no notion of issuing an
additional caller-scoped or environment-scoped token. `RFQ_BACKEND_ARCHITECTURE.md`
adds no token-management surface either — its only token concept is the
per-RFQ opaque `verification_session`, which is an RFQ-record artifact, not
an API credential. There is no Odoo-side mechanism to create a second RFQ API
credential, so the task's §1 escape hatch ("unless the Odoo-side
authentication architecture explicitly supports creating one") is closed.

**2. Deployment documentation — documents only the production credential.**
`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §4 records `ODOO_RFQ_API_TOKEN` as
provisioned for `ahanassa-production` only, and §5 explicitly states why no
staging equivalent exists (quoted in full under RESULT above). Nothing in the
repository documents a staging provisioning step, a staging credential, or a
procedure for obtaining one.

**3. Secure operator secret store — holds the production credential, and is
deliberately out of reach of this session.** Per `DOCUMENT_AUDIT_REPORT.md`
DAR-042, the production token *"was provisioned by the project owner
directly, piped from a root-owned Odoo env file through `stdin` into
`wrangler versions secret put`, run in the owner's own terminal — the value
never entered this session at any point."* That root-owned file is the live
production secret, not a staging one; and the established, correct handling
rule for it is that it never passes through an AI session. This task did not
attempt to read it.

**4. Existing infrastructure docs — no additional source.**
`docs/ODOO_RFQ_API_INTEGRATION.md` §8: *"No value has been minted or
committed anywhere in this repository"*; §10 records the settled verdict that
no valid non-production credential is available. `.env.example` sanctions
only `wrangler secret put ODOO_RFQ_API_TOKEN --env <env>` as the delivery
mechanism — it names the *channel*, never a value or a source.

**Conclusion: `CREDENTIAL_SOURCE_MISSING`.** No staging-scoped credential
exists, and creating one is not supported by the Odoo-side authentication
architecture. No token was invented.

# TARGET ENVIRONMENT

Staging only — `ahanassa-bootstrap-staging` (`env.staging`). No write,
deploy, or secret operation of any kind was performed against it; the
blocking condition fired before the provisioning step. Production
(`ahanassa-production`) was never a target and was never touched.

Bindings confirmed from `wrangler.jsonc` for the record (read-only, no
change made): `DB_OPS` = `ahanassa-ops-staging`
(`49bd0aff-e289-4fff-b7b9-0f4b517e6b14`), `DB_PUBLIC` =
`ahanassa-public-staging` (`35cef70f-3ad3-4049-add4-ddcac6cac45b`),
`ODOO_SYNC_QUEUE` = `ahanassa-odoo-sync-staging` (+ DLQ), `env.staging`
crons deliberately empty (DAR-053).

# SECRET NAME

`ODOO_RFQ_API_TOKEN`

Verified as the exact name the code reads — `lib/env.ts` line 107,
`process.env.ODOO_RFQ_API_TOKEN`, inside `getOdooRfqApiConfig()`. Its doc
comment restates the boundary this task also honored: *"Deliberately its own
credential, `ODOO_RFQ_API_TOKEN` — never the legacy `ODOO_API_KEY` (that key
authenticates the old generic JSON-2 transport … scoped to a different Odoo
permission model and no longer the RFQ delivery path)."* The contract
documentation does **not** prove `ODOO_API_KEY` is the same credential — it
proves the opposite — so the task's explicit reuse precondition was not met
and reuse was not attempted.

# PROVISIONING METHOD

**None performed.** `wrangler secret put ODOO_RFQ_API_TOKEN --env staging`
was **not** run. No secret value was entered, typed, piped, echoed, or
generated in this session by any mechanism.

The stop occurred at §1 (credential authority), strictly before §3. Running
the provisioning command would have required either (a) a value that does not
exist (a staging-scoped token), or (b) the production credential — which is
outside this task's authorization and which, by established project rule,
does not pass through an AI session at all.

# SECRET PRESENCE VERIFICATION

Executed once, read-only, names and types only — `wrangler secret list`
returns no values by design:

```
npx wrangler secret list --env staging
```

```json
[
  {
    "name": "ODOO_API_KEY",
    "type": "secret_text"
  }
]
```

`ODOO_RFQ_API_TOKEN` is **absent** from staging — unchanged from the state
Phase 4 recorded, exactly as expected given no provisioning occurred. The
only staging secret is the unrelated legacy `ODOO_API_KEY`, which the live
RFQ path never reads (`lib/queue/consumer.ts` → `lib/odoo/rfq-api-client.ts`
→ `getOdooRfqApiConfig()` only; DAR-041 retired `ODOO_API_KEY` from the
active RFQ path). No value was retrieved or displayed.

# DEPLOYMENT

**Not performed, and not applicable.** A redeploy question only arises once a
secret has actually been set; nothing was set.

For the record, so the next attempt does not have to re-derive it: this
project's documented mechanism is `wrangler versions secret put` followed by
promoting the resulting version (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`
§3/§17, DAR-042) — i.e. a new Worker version is produced and must be
promoted for the secret to serve traffic, and the build must be produced with
the matching `CLOUDFLARE_ENV` because of the documented env-flattening
gotcha. No staging or production deployment was executed by this task.

# CONFIGURATION SMOKE CHECK

**Not run.** The check's only purpose is to observe the RFQ integration state
change from `not_configured` to `configured`/`ready`. Since no secret was
provisioned, that transition cannot have occurred, and the state is known
from code without a network call: `getOdooRfqApiConfig()` returns `null`
whenever `ODOO_RFQ_API_TOKEN` is missing, so the queue consumer's
reconciliation reason code remains `not_configured` and RFQ rows remain
`sync_status = 'pending'`.

This is the designed fail-safe, not a defect —
`docs/ODOO_RFQ_API_INTEGRATION.md`'s own reason-code table lists
*"credential not configured → `not_configured` → `pending`"* as the
*"expected, stable state until Deployment Stage 1 provisions
`ODOO_RFQ_API_TOKEN`."* Browser-facing RFQ submission is unaffected: an
accepted RFQ is durably persisted in D1 before any Odoo sync is attempted, so
the missing credential delays delivery to Odoo but never loses a lead.

```
STAGING_CONFIG_STATE: NOT_CONFIGURED
```

No RFQ was submitted. No token information was exposed.

# PRODUCTION SAFETY

- **`PRODUCTION_TOUCHED: NO`.** Exactly one credential-adjacent command ran
  in this entire task — `wrangler secret list --env staging` — explicitly
  scoped to staging and returning names/types only.
- No production Worker was listed, deployed, modified, or read.
- No production D1 database was read or written.
- No production secret was listed, read, created, modified, or deleted.
- No secret value of any environment was retrieved, printed, logged, written
  to a file, or committed.
- No `Authorization` header, bearer token, password, cookie, or credential
  value appears anywhere in this report.
- No Odoo write of any kind occurred; no `ahanassa.rfq` record was created;
  the live `ahanassa` database was not contacted by this task at all.
- No application code was changed (`CODE_CHANGED: NO`).

# NEXT STEP

Phase 4 remains **BLOCKED**, and the blocker is now more precisely
characterized than it was in the previous report: it is not merely "a secret
has not been set on staging" but "**no staging-scoped credential exists to
set, and the Odoo architecture does not currently support creating one.**"

This requires an **owner/architecture decision**, not an engineering action.
The three viable paths, in descending order of safety — all requiring
explicit owner authorization, none actionable from this session:

1. **Add environment-scoped credentials on the Odoo side** (safest, and the
   only option that makes "staging RFQ verification" genuinely
   non-production). Requires Odoo-side work to support more than one runtime
   Bearer secret, or a separate staging Odoo instance/database. Today neither
   exists.
2. **Authorize staging to use the single production credential**, accepting
   explicitly that staging RFQ submissions will create real `ahanassa.rfq`
   records in the live business database. If the owner chooses this, the
   provisioning must be run by the owner in their own terminal (piping the
   value through `stdin`, never a shell argument), exactly as the production
   token was provisioned per DAR-042 — the value must not enter an AI
   session. Verification should then use exactly one unmistakably synthetic
   RFQ, following the precedent set by `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`
   §14, and the created record should be cleaned up Odoo-side afterwards.
3. **Re-scope Phase 4 verification to production** with a single synthetic
   RFQ, since the credential there already exists and already targets the
   same Odoo host and database that staging would have targeted anyway. This
   is not more dangerous than option 2 — it is the same blast radius with one
   fewer credential copy — but it is a scope change requiring explicit owner
   approval.

Until one of these is authorized, no Website code change is needed or
warranted: every layer this credential would exercise is implemented, tested,
and proven correct up to the boundary (Phase 3), and neither this task nor
the previous one found any code defect.

Recommended immediate action: put options 1–3 to the project owner for a
decision.

# GIT STATE

- HEAD at task start: `1cc70b986ad0209b4c9a6fd08397b4a8d79aba82`
- Branch: `feat/header-hero-integrated` (no branch change, no push)
- `CODE_CHANGED: NO` — zero files under `app/`, `components/`, `lib/`,
  `migrations/`, or `wrangler.jsonc` differ from `PRE_HEAD`.
- Files added by this task: this report only.
- Files modified by this task: `REPORT_BUNDLE_MANIFEST.txt` (one appended
  entry).
- `tsconfig.tsbuildinfo` remains modified — pre-existing before this task,
  not touched by it, not committed.
- No `01-sources/`, `logo/`, or `design-reference/` file touched. No Odoo
  repository file touched. No secret committed. No push performed.
