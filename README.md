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

Before any remote/staging/production deploy: run `wrangler d1 create ahanassa-ops` and `wrangler queues create ahanassa-odoo-sync` / `ahanassa-odoo-sync-dlq`, then replace the placeholder `database_id` in `wrangler.jsonc` with the real value `d1 create` returns — do not deploy with the placeholder.

**Limitation:** local Queue simulation is close to but not identical to deployed Cloudflare Queues behavior (e.g. exact retry backoff timing and DLQ delivery timing may differ) — treat local testing as a strong functional signal, not a substitute for staging verification before production use.

The Odoo sync path is intentionally inert in every environment right now — see `lib/odoo/adapter.ts` and `DOCUMENT_AUDIT_REPORT.md` DAR-013/DAR-023 for why.

