# Ahan Asa website

Built with [vinext](https://vinext.dev) on Cloudflare Workers. This repository is governed by `CLAUDE.md` / `PROJECT_OVERRIDES.md` — read those first.

## Scripts

- `npm run dev` starts the vinext dev server.
- `npm run build` builds the Cloudflare Worker output.
- `npm run start` starts the built Worker locally with Wrangler.
- `npm run deploy` deploys the Cloudflare Worker.
- `npm test` runs the lightweight `node --test` unit suite (pure-logic tests only — see below for integration-level verification).
- `npm run cf-typegen` regenerates `worker-configuration.d.ts` after changing `wrangler.jsonc` bindings.

## Local RFQ backend development

`wrangler.jsonc` configures a `DB_OPS` D1 database and an `ODOO_SYNC_QUEUE` producer/consumer/DLQ (see `01-sources/DATABASE_SCHEMA.md`, `01-sources/TECHNICAL_ARCHITECTURE.md` §12/§14). The `database_id` in `wrangler.jsonc` is a placeholder — no remote D1 database or Queue has been provisioned. Local development works against that placeholder because Wrangler/`@cloudflare/vite-plugin`'s local simulation only uses it as a storage key.

To develop locally:

```bash
npm install
npx wrangler d1 migrations apply DB_OPS --local   # applies migrations/*.sql to a local sqlite file under .wrangler/state/
npm run dev                                       # vinext dev — also simulates the Queue producer, consumer, and scheduled() cron locally
```

Inspect local state directly with `npx wrangler d1 execute DB_OPS --local --command "SELECT ..."`. Delete `.wrangler/state` to reset local D1/Queue state entirely (never committed — see `.gitignore`).

**Limitation:** local Queue simulation is close to but not identical to deployed Cloudflare Queues behavior (e.g. exact retry backoff timing and DLQ delivery timing may differ) — treat local testing as a strong functional signal, not a substitute for staging verification before production use.

The Odoo sync path is intentionally inert locally (`npm run dev`, no `--env`) — no local Odoo credentials exist. The **staging** environment has real, minimum-permission Odoo credentials configured (see below) and has completed a real, controlled RFQ write test end-to-end — see `lib/odoo/adapter.ts` and `DOCUMENT_AUDIT_REPORT.md` DAR-013/DAR-023/DAR-027/DAR-028.

## Staging environment (real Cloudflare infrastructure)

A real staging environment is provisioned and validated (`DOCUMENT_AUDIT_REPORT.md` DAR-024) — this is genuine Cloudflare infrastructure, not a local simulation, but still isolated from production.

| Resource | Name | Notes |
|---|---|---|
| D1 database | `ahanassa-ops-staging` | Binding `DB_OPS`. Created with Cloudflare's automatic default location (region `WEUR`) — **not** a deliberately chosen data-residency jurisdiction. `01-sources/DATABASE_SCHEMA.md` §18 lists "Data location" as a formally unresolved policy gate; this placement is appropriate for staging (synthetic test data only) but a production database must be (re-)provisioned under an owner-approved jurisdiction policy before go-live — D1 jurisdiction cannot be changed after creation. |
| Queue | `ahanassa-odoo-sync-staging` | Binding `ODOO_SYNC_QUEUE`, `max_retries: 5` |
| DLQ | `ahanassa-odoo-sync-staging-dlq` | Has its own consumer (same Worker, `workers/entry.ts` `queue()` — routed by `batch.queue`), which records into `dead_letter_records`. Never leave a DLQ unconsumed. |
| Worker | `ahanassa-bootstrap-staging` | `https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev` |

Deploy/manage staging:

```bash
npx wrangler d1 migrations apply DB_OPS --env staging --remote   # apply migrations to the real staging D1
npx vinext-cloudflare deploy --env staging                       # build + deploy the staging Worker
npx wrangler d1 execute DB_OPS --env staging --remote --command "SELECT ..."   # inspect real staging D1
npx wrangler tail --env staging                                  # live logs from the real staging Worker
```

Staging vs. local:

- Local (`npm run dev`, no `--env`) uses `wrangler.jsonc`'s top-level config, whose `database_id`/queue names are still **placeholders** — local D1/Queue simulation only uses them as storage keys, no real resource required. No Odoo credentials — `getOdooConfig()` returns `null`, `lib/odoo/adapter.ts` always returns `not_configured`.
- Staging (`--env staging`) uses the `env.staging` block in `wrangler.jsonc`, which holds the real resource names/IDs above and deploys to real Cloudflare Workers/D1/Queues. **Real, minimum-permission Odoo credentials are now configured** (below) — the adapter will attempt real Odoo calls for any RFQ that reaches the queue in this environment.

### Odoo staging connectivity (DAR-027, 2026-08-29)

A dedicated, non-human Odoo integration user exists on the live `ahanassa` database (`odoo.ahanassa.com`) — login `website-rfq-integration@ahanassa.com`, no password set (cannot log in interactively), groups: `base.group_user` + `sales_team.group_sale_salesman` ("Sales / User: Own Documents Only") only. No `base.group_erp_manager`, no `base.group_system` — see `odoo-modules/ahanassa_website_rfq/README.md` and `lib/odoo/mapping.ts` `RFQ_REFERENCE_MAPPING` for why the RFQ-path idempotency design was changed specifically to avoid needing that broader group.

Cloudflare staging configuration (`ahanassa-bootstrap-staging`):

| Variable | Kind | Value |
|---|---|---|
| `ODOO_BASE_URL` | `vars` (`wrangler.jsonc`) | `https://odoo.ahanassa.com` |
| `ODOO_DATABASE` | `vars` (`wrangler.jsonc`) | `ahanassa` |
| `ODOO_CRM_TEAM_ID` | `vars` (`wrangler.jsonc`) | `1` (verified active `crm.team` "Sales"; "Website" team, id 2, is inactive and was not reactivated) |
| `ODOO_API_KEY` | Cloudflare **secret** (`wrangler secret put ODOO_API_KEY --env staging`) | never in git, never logged |

Read-only JSON-2 connectivity was verified end-to-end (real HTTPS, real bearer auth, real database) using a separate short-lived key for the same user, immediately revoked after the test — see the provisioning session transcript for the full log. Confirmed: `res.partner`/`crm.lead` reads succeed; `ir.model.data` access correctly returns `403` (proves the narrower group is actually enforced, not just configured).

**RFQ Odoo E2E write test completed (DAR-028, 2026-08-29).** One controlled synthetic RFQ (`AA-RFQ-8QQ0N69K`, company "Ahan Asa Integration Test", email `rfq-e2e-test@example.invalid`) was submitted through the real pipeline (`POST /api/rfqs` → D1 → outbox → the real staging Queue → the real Odoo adapter → the real `ahanassa` database). Verified live via read-only Postgres: exactly one `res.partner` (id 14) and one `crm.lead` (id 7, `x_website_rfq_reference = 'AA-RFQ-8QQ0N69K'`) created; both same-event redelivery (D1 mapping present) and a simulated crash-window redelivery (D1 mapping deliberately deleted, forcing the adapter's own `x_website_rfq_reference` lookup) produced zero duplicates. No quotation/sale order/outbound email/activity was created. One real defect was found and fixed during this pass: the reference lookup didn't pass `context: { active_test: false }`, so archiving the lead would have made future redelivery lookups silently miss it (the Postgres UNIQUE constraint would still have prevented an actual duplicate row, but the RFQ would incorrectly retry/DLQ instead of resolving) — fixed in `lib/odoo/client.ts`/`lib/odoo/adapter.ts`, regression test added. The 5 pre-existing synthetic staging RFQs from before this test remain untouched, still `sync_status = 'manual_review'`.

**Before production:** provision a separate production D1/Queue/DLQ/Worker under the `env.production` pattern once (a) an owner-approved data-location/jurisdiction policy exists and (b) production Odoo credentials/permissions are provisioned the same way as staging. Do not reuse the staging resources, credentials, or Odoo integration user for production.

## RFQ abuse protection (DAR-030, 2026-08-29)

`POST /api/rfqs` is protected by three layered, defense-in-depth checks, all running before any D1 write — see `app/api/rfqs/route.ts`'s header comment for the exact request order:

1. **Honeypot + minimum-completion timing** (pre-existing) — `lib/rfq/validation.ts`/`lib/rfq/service.ts`.
2. **Workers Rate Limiting binding** (`RFQ_RATE_LIMITER`, `wrangler.jsonc` `ratelimits`) — 5 requests / 60s per SHA-256-hashed client-IP-derived key (`lib/security/rate-limit.ts`/`lib/security/rate-limit-binding.ts`). Runs first, before the request body is even read. **Fails open** if the binding is absent (e.g. an environment that hasn't wired it up yet) — this is an abuse-*reduction* signal, intentionally permissive/eventually-consistent per Cloudflare location, never an exact ledger. It is not the authoritative gate; Turnstile is.
3. **Cloudflare Turnstile**, mandatory server-side Siteverify (`lib/security/turnstile.ts`, `components/contact/enquiry-form.tsx`). **Fails closed**: any outcome other than a verified `success:true` for the `rfq_submit` action blocks persistence — `403 VERIFICATION_FAILED` for a visitor-side failure, `503 SERVICE_UNAVAILABLE` for an operational one (Siteverify unreachable/timed out/misconfigured, including no secret provisioned at all).

**No Turnstile widget/site key has been created for any hostname yet** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` are unset everywhere, including staging — see `.env.example`). Practical consequence: today, in every environment including the deployed staging Worker, **every RFQ submission fails closed with `503`** until a real key pair is provisioned and `TURNSTILE_SECRET_KEY` is set as a Cloudflare Secret (`wrangler secret put TURNSTILE_SECRET_KEY --env <env>`). This is deliberate — CLAUDE.md explicitly prohibits deploying a public staging configuration that would let a universally-valid test secret protect a Worker that can write into the real Odoo database. Provisioning a real widget for the actual protected hostname is a future deployment-gate action, not something this codebase does on its own.

For local manual testing of the full widget flow, put Cloudflare's official always-passing Turnstile test site key in your own untracked `.env.local` (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) and the matching test secret (`TURNSTILE_SECRET_KEY`) — see [Cloudflare's Turnstile testing docs](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). Never commit either value.

