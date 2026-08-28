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

The Odoo sync path is intentionally inert in every environment right now — see `lib/odoo/adapter.ts` and `DOCUMENT_AUDIT_REPORT.md` DAR-013/DAR-023 for why.

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

- Local (`npm run dev`, no `--env`) uses `wrangler.jsonc`'s top-level config, whose `database_id`/queue names are still **placeholders** — local D1/Queue simulation only uses them as storage keys, no real resource required.
- Staging (`--env staging`) uses the `env.staging` block in `wrangler.jsonc`, which holds the real resource names/IDs above and deploys to real Cloudflare Workers/D1/Queues.
- Neither environment has real Odoo credentials — `lib/odoo/adapter.ts` always returns `not_configured` regardless of environment (DAR-013).

**Before production:** provision a separate production D1/Queue/DLQ/Worker under the `env.production` pattern once (a) an owner-approved data-location/jurisdiction policy exists and (b) the Odoo model mapping is resolved enough to matter. Do not reuse the staging resources for production.

