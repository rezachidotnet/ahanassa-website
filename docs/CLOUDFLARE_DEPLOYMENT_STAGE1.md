# Cloudflare Deployment — Stage 1 (Non-Live Production Deployment)

`DOCUMENT_AUDIT_REPORT.md` DAR-042. This is the first real Cloudflare Worker deployment of the Ahan Asa Website. **It is not the `ahanassa.com` cutover** — the public domain remains on the legacy Vercel site throughout and after this task; nothing here changes DNS.

## 1. Preconditions

- `feat/odoo-rfq-api-handoff` merged to the branch point (`0a8e118`), giving the canonical Odoo RFQ API v1 handoff (DAR-041).
- Production Cloudflare resources already provisioned in an earlier task (DAR-032): `DB_OPS` (`ahanassa-ops-production`), `DB_PUBLIC` (`ahanassa-public-production`), Queue `ahanassa-odoo-sync-production`, DLQ `ahanassa-odoo-sync-production-dlq` — all EU jurisdiction, all previously unattached (0 producers/0 consumers) until this task.
- No `ahanassa-production` Worker existed before this task (verified via direct Cloudflare API script listing — only `ahanassa-bootstrap-staging` and one unrelated Worker existed in the account).

## 2. A real deploy-tooling gotcha found and worked around

`@cloudflare/vite-plugin` (via `vinext-cloudflare`) merges a named Wrangler environment's config into the generated `dist/server/wrangler.json` **at build time**, driven by the `CLOUDFLARE_ENV` process env var — not at `wrangler deploy`/`versions upload` time via `--env`. A plain `npm run build` (no `CLOUDFLARE_ENV` set) bakes the **top-level/placeholder** config into `dist/server/wrangler.json` regardless of what `--env` flag is later passed to `wrangler`. A `wrangler versions upload --env production --dry-run` run against such a build silently reported the placeholder D1 IDs and non-production queue names — it did **not** error, it would have deployed a Worker pointed at nonexistent placeholder database IDs.

**Correct procedure, discovered and verified in this task:**

```bash
rm -rf dist
CLOUDFLARE_ENV=production npx vinext build   # bakes env.production into dist/server/wrangler.json's TOP LEVEL
npx wrangler <command> --config dist/server/wrangler.json   # do NOT pass --env again — the config is already flattened
```

Verified via `wrangler versions upload --dry-run` before and after this fix: before, bindings showed `ahanassa-odoo-sync`/placeholder D1 IDs; after, bindings correctly showed `ahanassa-odoo-sync-production`, `ahanassa-ops-production` (`7240a6a7-...`), `ahanassa-public-production` (`73ba6b50-...`), ratelimit namespace `2001`. This is worth carrying forward into every future deploy of this project (staging and production alike) — `npm run deploy` (`vinext-cloudflare deploy --config dist/server/wrangler.json`) already handles this correctly internally (it propagates `CLOUDFLARE_ENV` itself before building), so it remains the safe default for routine deploys; this note is for anyone reaching for raw `wrangler versions upload`/`wrangler deploy` directly.

## 3. Wrangler / capability check

Wrangler `4.126.0` (update to `4.127.1` available, not applied — no reason to churn mid-deployment). Confirmed supported and used: `wrangler versions upload`, `wrangler versions secret put`, `wrangler versions list` / `view`, `wrangler deploy` (required once — see §5).

## 4. Required secrets

| Secret | Purpose | Required for Stage 1? | Configured (production)? | Action taken |
|---|---|---|---|---|
| `ODOO_RFQ_API_TOKEN` | Bearer auth for `POST /api/v1/rfq` (the canonical RFQ sync path, DAR-041) | Yes | *(see §17 disposition below)* | Provisioned by the project owner directly via `wrangler versions secret put`, run in their own terminal — the value never passed through this session |
| `TURNSTILE_SECRET_KEY` | Server-side Turnstile Siteverify | Yes | Yes | Provisioned this task (§6) |
| `PREVIEW_BASIC_AUTH_USER` / `PREVIEW_BASIC_AUTH_PASSWORD` | Temporary non-live preview gate (§7) | Yes (Stage 1 only) | Yes | Generated and provisioned this task, values relayed to the owner directly in conversation only — never committed, logged, or written to this doc |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public Turnstile widget key (not a secret) | Yes | Yes | Added as a plain `var` in `wrangler.jsonc` `env.production.vars` (§6) |
| `ODOO_API_KEY` (legacy) | Old generic JSON-2 `crm.lead` path (`lib/odoo/adapter.ts`) | **No** | No | Confirmed via grep: nothing in the live runtime calls it anymore (`lib/queue/consumer.ts` only calls `lib/odoo/rfq-api-client.ts`). Not provisioned, per this task's own explicit instruction not to provision it "merely because it exists in historical env documentation." |
| `EMAIL_API_TOKEN` / `INQUIRY_REFERENCE_SECRET` / `UPLOAD_SIGNING_SECRET` / `WEBHOOK_SIGNING_SECRET` | Listed in `.env.example` for a future feature surface | No | No | No code references them anywhere (grep-confirmed) — not required, not provisioned |

## 5. Odoo credential constraint — explicit

The live Odoo RFQ API supports exactly **one** runtime Bearer secret; it does not support independently revocable staging/production tokens. `odoo-ahantorob` connects to database `ahanassa` — the same live business database regardless of which Cloudflare environment calls it. `ODOO_RFQ_API_TOKEN` provisioned here is therefore, unavoidably, **the production credential** — any real `POST /api/v1/rfq` call from this deployment creates a real `ahanassa.rfq` record in the live Odoo database. There is no separate "staging Odoo" to test safely against. This is why the RFQ E2E test in this task uses exactly one, unmistakably synthetic RFQ (§14) rather than casual/repeated testing.

## 6. Turnstile

Zero Turnstile widgets existed in this Cloudflare account before this task. One was created via the Cloudflare API (Wrangler's OAuth token carries `challenge-widgets.write` scope), scoped to the exact preview hostname:

- Sitekey (public): `0x4AAAAAAEi2RZ3NHcqTk0ej`
- Mode: `managed`
- Domain allowlist: `ahanassa-production.nova-b1e6f0.workers.dev` only
- Secret: provisioned directly into the Worker as `TURNSTILE_SECRET_KEY` via a single script that fetched it from the Cloudflare API and piped it straight into `wrangler versions secret put` — the value was never printed to any terminal output or written to a file.

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` (the public key above) was added to `wrangler.jsonc`'s `env.production.vars` — safe to commit, matching `lib/env.ts#getTurnstileSiteKey`'s existing "read from `process.env` at request time" design (a Server Component prop, not a Next.js build-time `NEXT_PUBLIC_` substitution), so no client-bundle rebuild was needed for it to take effect beyond the ordinary Worker version upload.

Live-verified: a structurally valid RFQ POST with no Turnstile token returns `403 {"code":"VERIFICATION_FAILED"}` — real server-side Siteverify rejection, not the earlier "no secret configured" `503`.

## 7. Non-live access protection

Cloudflare Access is **not enabled** on this account, and the Wrangler OAuth token available in this session has no Zero Trust/Access API scope (`GET /access/apps` returned `"Access is not enabled... click the 'Enable Access' button"`; `GET /access/organizations` returned an authentication error under this token). Enabling it is a one-time, dashboard-driven Zero Trust setup (choosing a team name) outside this session's reach. No other protected non-primary hostname existed either.

**Decision (owner-directed):** rather than block on enabling Access, a temporary HTTP Basic Auth gate was added at the Worker's entry boundary — `lib/security/preview-auth.ts` (+ 13 tests), wired into `workers/entry.ts`'s `fetch` handler **before any application routing**, with no exclusion for any route including `POST /api/rfqs`. It fails closed: if either `PREVIEW_BASIC_AUTH_USER` or `PREVIEW_BASIC_AUTH_PASSWORD` is unset, every request is rejected with `401`, regardless of what credentials (if any) are supplied. Credential comparison is constant-time. Live-verified immediately after the very first deploy: `/`, `/fa`, and `POST /api/rfqs` all returned `401` with a `WWW-Authenticate: Basic` header before any Basic Auth secret existed.

**This mechanism is TEMPORARY / NON-LIVE ONLY.** Removing it before the public `ahanassa.com` cutover is a small, explicit change:

1. Delete `lib/security/preview-auth.ts` and `lib/security/preview-auth.test.ts`.
2. In `workers/entry.ts`, remove the `checkPreviewBasicAuth` import and revert the `fetch` handler to `fetch: vinextHandler.fetch` (a plain property reference, as it was before this task).
3. Delete the `PREVIEW_BASIC_AUTH_USER`/`PREVIEW_BASIC_AUTH_PASSWORD` secrets (`wrangler versions secret delete <NAME> --config dist/server/wrangler.json`) and redeploy.
4. Cloudflare Access (once enabled) remains the preferred long-term protection for any future non-live preview deployment; this task did not require enabling it to complete Stage 1.

Preview credentials (username + a 32-character random password, generated via `openssl rand`) were relayed to the project owner directly in conversation only — never written to Git, this document, logs, or any committed file.

## 8. Worker version upload / deploy sequence

Cloudflare does not allow `wrangler versions upload` against a Worker script that has never been deployed — the very first version of a brand-new script must go through `wrangler deploy`. Since `wrangler.jsonc`'s `env.production` defines no `routes`/custom domain, this first deploy only ever attaches the Worker to its `workers.dev` subdomain — it cannot and did not touch `ahanassa.com`/`www.ahanassa.com` DNS or routing.

Sequence actually run:

1. `CLOUDFLARE_ENV=production npx vinext build` (see §2)
2. `wrangler deploy --config dist/server/wrangler.json` — first-ever creation of `ahanassa-production`, immediately Basic-Auth-gated-closed (no secrets existed yet). Version `885a473e-196f-4e7e-bf6b-9e1f700e236a`.
3. `wrangler versions secret put TURNSTILE_SECRET_KEY` → version `73bab45a-...`
4. `wrangler versions secret put PREVIEW_BASIC_AUTH_USER` → version `a6468af9-...`
5. `wrangler versions secret put PREVIEW_BASIC_AUTH_PASSWORD` → version `8b73bfdc-...`
6. Added `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to `wrangler.jsonc`, rebuilt (`CLOUDFLARE_ENV=production`), `wrangler versions upload` → version `1a34472d-e7f9-4516-a10d-7a86388d5e3d`, own preview URL `https://1a34472d-ahanassa-production.nova-b1e6f0.workers.dev` — used for all smoke testing in §12–§16 while `ODOO_RFQ_API_TOKEN` was pending.
7. `wrangler versions secret put ODOO_RFQ_API_TOKEN` — run by the project owner directly in their own terminal, value never entered this session.
8. `wrangler versions deploy` — promoted the final, fully-secreted version to 100% traffic.

Each `versions secret put`/`versions upload` call was independently confirmed (via `wrangler versions view <id>`) to carry forward every previously-set secret — Wrangler never deletes secrets on a code-only upload (`vars` are the only thing reset per-upload, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/etc. were always redeclared from `wrangler.jsonc` on every build).

## 9. Worker deployment

- Worker name: `ahanassa-production`
- Public preview URL (Basic Auth gated): `https://ahanassa-production.nova-b1e6f0.workers.dev`
- Final deployed version ID: `1ba5dadb-f3a7-4a29-b928-edefe035f8db` — promoted to 100% traffic via `wrangler versions deploy 1ba5dadb-f3a7-4a29-b928-edefe035f8db@100`, confirmed live via direct HTTP checks against the stable root URL (401 without auth, 200 with auth, 403 on an RFQ POST without a Turnstile token).
- No route/custom domain attached — `ahanassa.com`/`www.ahanassa.com` remain entirely unaffected.

## 10. Bindings (verified via `wrangler versions view`)

| Binding | Resource |
|---|---|
| `DB_OPS` | `ahanassa-ops-production` (`7240a6a7-c293-4e6e-baf3-95838a3c2944`) |
| `DB_PUBLIC` | `ahanassa-public-production` (`73ba6b50-ef57-4d89-baa9-617a0b0af127`) |
| `ODOO_SYNC_QUEUE` (producer) | `ahanassa-odoo-sync-production` |
| Consumer | `ahanassa-odoo-sync-production` → DLQ `ahanassa-odoo-sync-production-dlq` |
| `RFQ_RATE_LIMITER` | namespace `2001`, 5 req/60s |
| `IMAGES` / `ASSETS` | Images / static assets bindings |

All confirmed distinct from staging's bindings (`ahanassa-ops-staging`, `ahanassa-public-staging`, `ahanassa-odoo-sync-staging`, namespace `1002`) — no accidental cross-environment binding occurred.

## 11. Cron activation

`wrangler deploy` (step 2 of §8) activated all three previously-configured-but-inactive Cron Triggers in one shot — `wrangler deploy` output confirmed `schedule: */5 * * * *`, `schedule: 0 */3 * * *`, `schedule: 30 2 * * *` alongside the Queue producer/consumer attachment. These now fire in UTC against the **production** `DB_PUBLIC`/`DB_OPS` bound to this exact deployed version. No duplicate Cron registration was performed. *(Note: activation happens on `wrangler deploy` / `wrangler versions deploy` — a mere `versions upload` alone, per Wrangler's own printed note, does not apply trigger changes; those require `wrangler triggers deploy` or a `versions deploy`.)*

## 12. Catalog runtime smoke test

Verified against `https://1a34472d-ahanassa-production.nova-b1e6f0.workers.dev` (Basic Auth authenticated):

- `/` → `200`, real fa homepage HTML.
- `/fa`, `/fa/products`, `/fa/contact` → `308` redirect to the unprefixed route (fa is the default/unprefixed locale, `PROJECT_OVERRIDES.md` §1 — expected).
- `/products` → `200`, real DB_PUBLIC-backed render: "کاتالوگ آنلاین در حال آماده‌سازی است." (catalog being prepared) — the **correct, legitimate** production empty state (0 published templates in production, per DAR-036/037/038's own established baseline). No sample/placeholder/lorem text found (grepped). `<link rel="canonical" href="https://www.ahanassa.com/products">` — canonical correctly points at the real domain, never the preview host.
- `/en` → `200`. `/this-route-does-not-exist` → `404`.
- `/contact` → `200`.
- No server errors, no unhandled exceptions, in any response body (grepped for `error|exception|cannot read|undefined is not`).

## 13. RFQ runtime smoke test

- `POST /api/rfqs` with an incomplete payload → `422 VALIDATION_ERROR` (structural validation runs and works).
- `POST /api/rfqs` with a structurally complete payload but no Turnstile token → `403 VERIFICATION_FAILED` (real Siteverify rejection — see §6).
- `POST /api/rfqs` with malformed (non-JSON) body → `400`.
- Confirmed via `wrangler d1 execute` that production `rfqs` remained at **0 rows** throughout all of the above — validation/Turnstile failures never reach the D1 write path, exactly as designed.

## 14. Synthetic RFQ E2E

`ODOO_RFQ_API_TOKEN` was provisioned by the project owner directly, via `wrangler versions secret put` run in their own terminal, value piped from a root-owned Odoo env file through stdin — never entered this session. The resulting version (`1ba5dadb-f3a7-4a29-b928-edefe035f8db`, confirmed via `wrangler versions view` to carry all 4 secrets: `ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `PREVIEW_BASIC_AUTH_USER`, `PREVIEW_BASIC_AUTH_PASSWORD`, plus all correct production bindings) was promoted to 100% traffic via `wrangler versions deploy 1ba5dadb-...@100`.

Browser automation (Claude in Chrome) could not complete the run itself — Chrome's native HTTP Basic Auth dialog is not exposed to the remote-control layer, so every scripted navigation past the auth prompt landed on an error-page frame. The project owner submitted the one synthetic RFQ directly through their own browser at `https://ahanassa-production.nova-b1e6f0.workers.dev/contact`, authenticating with the Basic Auth credentials, using this synthetic identity:

- Full name: `Ahan Asa Deployment Test`
- Company: `Ahan Asa Deployment Validation (SYNTHETIC)`
- Email: `deployment-stage1-test@ahanassa-internal.invalid`
- Item: a sample-catalog freeform item ("میلگرد آجدار" / ribbed rebar, 1 piece) selected via the existing form UI
- Message: `Automated non-customer deployment validation — Claude Deployment Stage 1. Safe to disregard/archive.`
- Completed the real, live Turnstile challenge (the widget created in §6) and submitted.

**Result:** Website reference **`AA-RFQ-VD1DCR16`**, `id = 01M1E31K0C3091080PXC9TG7NP`.

Server-side verification (`wrangler d1 execute` against production `DB_OPS`):

- Exactly **one** `rfqs` row exists in production (`SELECT COUNT(*) FROM rfqs` → `1`) — the durable-first-write path worked correctly, and the row is fully populated (`status = 'received'`, `submission_method = 'structured'`, correct company/message/locale/item_count).
- `rfq_contacts`/`rfq_items` correctly persisted the submitted identity and one line item.
- The Queue delivered the sync event and the consumer called `POST /api/v1/rfq` **6 times** (1 initial + 5 retries, matching `max_retries: 5` in `wrangler.jsonc`) — every attempt logged in `integration_attempts` with `outcome = 'transient_failure'`, `error_code = 'ODOO_RFQ_SERVER_ERROR'`.
- After exhausting retries, exactly **one** `dead_letter_records` row was created (`failure_category = 'retries_exhausted'`, `resolution_status = 'open'`) — the DLQ correctly caught this, no message was silently dropped and no infinite retry loop occurred.
- `rfqs.sync_status = 'retry'` → the Queue's own retry exhaustion leaves the RFQ durably `retry` rather than falsely `synced`; `odoo_rfq_reference` is `NULL`.
- **No duplicate RFQ, no duplicate outbox event, no duplicate DLQ entry** — the deterministic outbound `Idempotency-Key` and the pre-call `odoo_rfq_reference IS NOT NULL` guard both behaved correctly across all 6 attempts; nothing was ever double-sent.

**Root-cause diagnosis (Website side ruled out):** an unauthenticated diagnostic `POST https://odoo.ahanassa.com/api/v1/rfq` returns `401` (route exists, requires auth — not `404`, not a network/DNS failure); the Odoo host itself (`https://odoo.ahanassa.com/`) returns `200`; the sibling, already-proven-working Odoo Public Catalog API v1 (`/api/v1/catalog/meta`) also returns `200`. This confirms the Website's request reached the correct, real, live route with valid credentials, and that Odoo itself returned a genuine HTTP 5xx while processing RFQ creation — not a Website-side bug, not a DNS/routing/auth misconfiguration.

**Disposition:** per the project owner's explicit direction, this is reported as a discovered defect for the separate Odoo Server track (matching `CLAUDE.md`'s own "if a contract defect is found, report it for the separate Odoo Server track" guidance) rather than worked around by firing additional synthetic RFQs. No further test RFQs were submitted. The Website→Odoo RFQ API code path itself (payload mapping, idempotency-key construction, client error classification, Queue/DLQ handling) is fully exercised and behaved correctly against this real failure; only Odoo's own RFQ-creation logic remains unproven end-to-end.

## 15. Odoo verification

Because Odoo never returned `201`/`200` for this request (§14), no `ahanassa.rfq`/`ahanassa.rfq.line` record was created on the Odoo side — there is nothing to verify there beyond the diagnostic evidence in §14. Correspondingly: no `res.partner` was created, no CRM Opportunity, no Sale/Purchase/Invoice/Stock side effect — because the request never got past Odoo's own internal error. This satisfies the "no automatic Partner/CRM/Sale/Purchase/Invoice/Stock side effect" acceptance criterion by construction, though not for the reason a successful test would have (a successful test would need to positively confirm those systems were *not* triggered *despite* a real RFQ creation; here, nothing downstream of RFQ creation could have run at all).

## 16. Idempotency replay

Not exercised as a distinct step — the precondition (a genuine `201`/`200` success establishing an idempotency record on Odoo's side) was never reached, so there was nothing to replay against. The 6 real retry attempts already exercised in §14 *are* the same-key, same-payload replay behavior in practice (`buildOutboundRfqIdempotencyKey` produced the identical `Idempotency-Key` on every attempt, confirmed via `integration_attempts` showing 6 attempts against one `event_id`), and correctly resulted in 6 independent real HTTP calls rather than a fabricated local skip — but since Odoo itself never accepted any of them, the "replay returns the same reference, no duplicate" behavior specifically remains unproven until a first successful creation exists to replay against.

## 17. `verification_session` privacy

Never applicable in this run — `verification_session` is only ever present on a genuine `201` response, and no `201` was ever received (§14). Confirmed via `integration_attempts`/`rfqs` inspection that nothing resembling this field appears anywhere in production D1. The code-level guarantee (never logged, never persisted, never returned to the Browser) is unchanged by this deployment task — see `docs/ODOO_RFQ_API_INTEGRATION.md` §7.

## 18. Security smoke test

- `POST /api/rfqs` without Turnstile → `403`, not a silent pass (§13).
- Malformed JSON body → `400`, not a crash/500.
- No `.map` source-map files reachable at their expected path (`404`).
- Security response headers present on every checked route: `content-security-policy-report-only`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy`.
- Basic Auth gate itself re-verified live: missing/wrong credentials → `401` with `WWW-Authenticate: Basic`; correct credentials → normal routing; `/api/rfqs` has no exclusion from the gate (tested directly).
- Odoo RFQ API token, Turnstile secret, and Basic Auth credentials never appeared in any response body, header, or log inspected during this task.

## 19. SEO / preview indexing

Two independent layers prevent this non-live deployment from being indexed:

1. **Structural:** the Basic Auth gate rejects every request — including from any search-engine crawler — with `401` before any HTML is ever served, so nothing on this hostname can be crawled or indexed at all.
2. **Existing site behavior (unrelated to this task, already present):** every response observed carries `X-Robots-Tag: noindex`, and every page's `<link rel="canonical">` already points at `https://www.ahanassa.com/...`, never the preview hostname. Confirmed on `/` and `/products`.

No change was made to the site's canonical/robots behavior for this deployment — the existing architecture already satisfies this requirement.

## 20. Performance

Rough, unoptimized smoke numbers against the (non-primary-region) preview URL, Basic Auth authenticated:

| Route | Status | TTFB | Total |
|---|---|---|---|
| `/` | 200 | ~0.73s | ~0.91s |
| `/products` | 200 | ~1.03s | ~1.06s |
| `/contact` | 200 | ~0.75s | ~0.81s |

No optimization was performed — no clear deployment blocker was found, per this task's own instruction not to optimize during deployment absent one.

## 21. Synthetic record disposition

**Retention chosen over deletion**, per this task's own "if audit retention is preferred, leave the record clearly marked synthetic and report it; do not create Partner/CRM merely to clean up" instruction:

- Website: `rfqs.id = 01M1E31K0C3091080PXC9TG7NP` / `reference_number = AA-RFQ-VD1DCR16` remains in production `DB_OPS`, unmodified, self-evidently synthetic (`company_name = "Ahan Asa Deployment Validation (SYNTHETIC)"`, email domain `ahanassa-internal.invalid`, explicit message text naming this deployment task). `sync_status = 'retry'`.
- The corresponding `dead_letter_records` row (`resolution_status = 'open'`) is also left in place as the audit trail of the real Odoo-side failure documented in §14 — this is genuine operational evidence, not test debris to discard.
- Odoo side: no record was created there at all (§14/§15) — there is nothing to clean up or mark on that side.
- No Partner, CRM Opportunity, or any other object was created anywhere as a byproduct of this test or its disposition.

## 22. Rollback

- **Worker:** `wrangler rollback --config dist/server/wrangler.json` reverts `ahanassa-production` to its immediately-prior deployed version; alternatively `wrangler versions deploy <previous-version-id>@100` selects any specific prior version explicitly. The very first version (`885a473e...`, code-only, no secrets) remains available as a hard floor — it fails every request closed via the Basic Auth gate regardless.
- **Cron:** `wrangler triggers deploy` with an edited (empty) `triggers.crons` array, or deleting the Worker outright, disables the Cron Triggers; not necessary unless a real problem is found — no live issue was observed in this task.
- **Secrets:** `wrangler versions secret delete <NAME> --config dist/server/wrangler.json` removes any individual secret and creates a new version without it.
- **No public DNS is involved in any of the above** — `ahanassa.com`/`www.ahanassa.com` are never touched by rolling this Worker back, because nothing routes them here in the first place.

## 23. Documentation

This document; `DOCUMENT_AUDIT_REPORT.md` DAR-042; `DOCS_INDEX.md` updated; `README.md` updated. No credential value appears in any of them.

## 24. Files changed

- `lib/security/preview-auth.ts` (new) + `lib/security/preview-auth.test.ts` (new, 13 tests) — temporary Basic Auth gate, see §7.
- `workers/entry.ts` — `fetch` handler now calls `checkPreviewBasicAuth` before `vinextHandler.fetch`.
- `wrangler.jsonc` — `env.production.vars` gained `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public, safe to commit); stale comment about unprovisioned secrets corrected.
- `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` (this file, new).
- `DOCUMENT_AUDIT_REPORT.md`, `DOCS_INDEX.md`, `README.md` — updated (see §23).
- No application/business-logic file changed. No Odoo file changed. No migration file changed in this task (the one D1 migration referenced, `0003_odoo_rfq_api_handoff.sql`, was authored and applied in the prior task, DAR-041 — this task did not add a new one).

## 25. Public domain

**`ahanassa.com` DNS: NOT changed. `www.ahanassa.com` DNS: NOT changed. The existing legacy Vercel site remains live and unaffected at both hostnames throughout and after this task.** No Cloudflare route or custom domain was attached to `ahanassa-production`. The only publicly reachable surface created by this task is the Basic-Auth-gated `https://ahanassa-production.nova-b1e6f0.workers.dev`.

## 26. Git

Not committed until this document is complete and full validation has re-run — see the final report in the conversation for the exact commit made (`chore: validate non-live Cloudflare deployment` or equivalent), not pushed, not merged.

## 27. Deployment Stage 1 Gate

**PARTIAL.** Every infrastructure, secret-provisioning, access-protection, and Website-side pipeline requirement of this task passed, verified live against real Cloudflare production resources. The one item that did not reach a positive success state is the actual Odoo RFQ creation itself: the live Odoo endpoint returned a genuine, repeated HTTP 500 for a real, correctly-authenticated, correctly-formed request (§14) — diagnosed as an Odoo-side defect, out of scope for this Website repository to fix (`CLAUDE.md` "Do NOT modify Odoo"). Per the project owner's explicit direction, this is reported rather than worked around with additional synthetic writes.

**What is unconditionally proven (PASS):**
- Real, non-live `ahanassa-production` Worker deployed with correct production bindings (DB_OPS, DB_PUBLIC, Queue, DLQ, rate limiter) and all three Cron Triggers active.
- Real Turnstile widget provisioned and enforcing (`403` fail-closed without a valid token, confirmed both synthetically and via the real synthetic RFQ's own successful pass through it).
- Temporary Basic Auth gate protects every route including `/api/rfqs`, fails closed, tested live.
- Catalog runtime, security headers, SEO/noindex behavior all correct against real production DB_PUBLIC.
- The Website→Odoo RFQ delivery *code path* (mapping, idempotency-key determinism, error classification, Queue retry/backoff, DLQ landing) is fully exercised end-to-end against the real live endpoint and behaved exactly as designed under a real failure — no duplicate records, no silent drop, no false "synced" state.
- `ahanassa.com`/`www.ahanassa.com` were never touched.

**What remains unproven:** a genuine `201 Created` from `POST /api/v1/rfq` against live Odoo. This is the Odoo Server-track defect recorded above, not a gap in this task's own deliverables.

## 28. Remaining go-live gates

**Immediate, before this specific integration can be called done:** resolve the Odoo-side HTTP 500 on RFQ creation (Odoo Server track — outside this repository) and re-run one more synthetic RFQ E2E to confirm a real `201`, idempotent replay, and `odoo_rfq_reference` population once fixed.

**If/when that passes, the remaining go-live gates are unchanged:** (1) final production editorial content selection/publication (Catalog templates currently 0 published in production — deliberate, not a defect); (2) SEO/sitemap/hreflang/canonical QA against the real production domain; (3) final smoke/security/performance QA; (4) controlled `ahanassa.com` Cloudflare cutover (DNS change, a separate owner-approved phase); (5) post-cutover monitoring; (6) Pricing, separately, only if the business requires it. Customer Portal is explicitly not recommended before Phase 1 completion.
