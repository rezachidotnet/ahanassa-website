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

## Production infrastructure readiness (DAR-031/DAR-032, 2026-08-29)

**Production data jurisdiction is decided: `eu`.** DAR-031 audited the account (nothing production existed), laid out the jurisdiction options, and returned the decision to the owner. The owner approved `eu` for production D1 and, in policy (not yet in a created bucket), for the future customer-upload R2 bucket. Recorded in `PROJECT_OVERRIDES.md` §14. Staging's D1 database landed in `WEUR` only because that's Cloudflare's automatic default placement at creation time — it was never, and still isn't, production policy.

**Production backend data infrastructure now exists (DAR-032) — the production Worker/website does not.** `ahanassa-ops-production` (D1, `jurisdiction: eu`, `running_in_region: EEUR`), `ahanassa-odoo-sync-production` (Queue), and `ahanassa-odoo-sync-production-dlq` (DLQ) are real, and migrations are applied — see the table below. No production Worker has been deployed, no production secret has been set, no Turnstile widget exists for production, and no R2 bucket has been created.

### Production environment (real Cloudflare infrastructure, no Worker deployed)

| Resource | Name | Notes |
|---|---|---|
| D1 database | `ahanassa-ops-production` | Binding `DB_OPS`. UUID `7240a6a7-c293-4e6e-baf3-95838a3c2944`. `jurisdiction: eu` (owner-approved, `PROJECT_OVERRIDES.md` §14), `running_in_region: EEUR`. Migrations applied (`0001_rfq_ops_schema.sql`); all 8 operational tables present with 0 rows — schema-only. |
| Queue | `ahanassa-odoo-sync-production` | Binding `ODOO_SYNC_QUEUE`, `max_retries: 5`. 0 producers/0 consumers — no Worker attached yet. |
| DLQ | `ahanassa-odoo-sync-production-dlq` | Created before the main queue, matching staging's own ordering. 0 producers/0 consumers. |
| Rate limiter | `RFQ_RATE_LIMITER`, namespace `2001` | Configured in `wrangler.jsonc` `env.production`; distinct from local (`1001`) and staging (`1002`) — counters never shared across environments. |
| Worker | `ahanassa-production` | **Not deployed.** `wrangler.jsonc env.production` is fully configured (D1/Queue/DLQ/rate-limiter/non-secret vars); `npm run cf-typegen` resolves a correct `ProductionEnv` binding surface. Confirmed via `wrangler deployments list --name ahanassa-production` → `10007: This Worker does not exist`. |
| Secrets | — | **None set.** `ODOO_API_KEY`/`TURNSTILE_SECRET_KEY` are not provisioned for `env.production` and must never be copied from staging's values — a distinct production Odoo API key (same dedicated integration identity) and a distinct Turnstile secret are required, both as a later, explicit step (`wrangler secret put <NAME> --env production`). |

Manage/inspect (read-only unless noted):

```bash
npx wrangler d1 execute DB_OPS --env production --remote --command "SELECT ..."   # inspect real production D1
npx wrangler d1 migrations apply DB_OPS --env production --remote                 # apply future migrations
```

**The legacy site is still live and unaffected.** `ahanassa.com`/`www.ahanassa.com` currently resolve through Cloudflare DNS (DNS-only, not proxied) to a live, actively-served Vercel/Next.js deployment (verified via `dig`/`curl -I`, both read-only). This repository's Cloudflare Worker has no route/custom domain attached to that zone, and this pass did not change that.

An unrelated R2 bucket, `ahanassa-odoo-backups`, exists in this Cloudflare account but is not referenced anywhere in this repository — it appears to be Odoo-server-side backup infrastructure provisioned independently of this codebase. Not touched, not adopted as a website bucket.

**Before production traffic:** a distinct production Odoo API key; a production Turnstile widget + site/secret key pair; production secrets provisioned as Cloudflare Secrets; `wrangler deploy --env production` to its `*.workers.dev` URL first (never straight to a custom domain); a temporary smoke test; the controlled `ahanassa.com`/`www.ahanassa.com` DNS cutover (separate, explicit, owner-approved Deployment phase); post-cutover validation. Full runbook: `DOCUMENT_AUDIT_REPORT.md` DAR-031/DAR-032.

## Product catalog: Odoo Public Catalog API v1 integration (DAR-033/034/035, 2026-08-30)

**The Odoo Product Master is populated; a dedicated, read-only Public Catalog API is live; `DB_PUBLIC` is physically provisioned in both staging and production; and a real, complete, idempotent sync has been run against both.** `docs/integrations/odoo/catalog-v1/` holds the authoritative contract. **This API — never Odoo PostgreSQL, never generic Odoo ORM access — is the sole integration boundary for catalog data.** `GET /api/v1/catalog/{products,products/<xid>,meta}`, `auth=public` (no credential needed), all other methods rejected with 405.

### Catalog environment (real Cloudflare infrastructure, no Worker deployed)

| Resource | Name | UUID | Jurisdiction |
|---|---|---|---|
| D1 (staging) | `ahanassa-public-staging` | `35cef70f-3ad3-4049-add4-ddcac6cac45b` | none (automatic, matches `ahanassa-ops-staging`) |
| D1 (production) | `ahanassa-public-production` | `73ba6b50-ef57-4d89-baa9-617a0b0af127` | `eu` (matches `ahanassa-ops-production` — `PROJECT_OVERRIDES.md` §14 is a project-wide policy, not DB_OPS-specific) |

Both hold **237 real synchronized product variants, 13 templates, zero duplicates, `is_public = 0` on every row** (publication is a deliberate future editorial step — nothing is publicly visible). Proven against real remote infrastructure: idempotent replay (zero writes on an unchanged re-sync), incremental sync with an empty result safely leaves existing data untouched, and a live forced-update test confirmed website-owned `name_fa`/`slug_fa` survive a real commercial-field UPDATE. Full results: `DOCUMENT_AUDIT_REPORT.md` DAR-035.

```bash
npx wrangler d1 execute DB_PUBLIC --env staging --remote --command "SELECT ..."      # inspect real staging catalog data
npx wrangler d1 execute DB_PUBLIC --env production --remote --command "SELECT ..."   # inspect real production catalog data
```

**A migration safety guardrail was added** to `migrations_public/0002_catalog_v1_contract.sql`: it was safe to `DROP TABLE`/recreate at the time it ran (verified empty everywhere), but now that both databases hold real synced data, **no future migration may ever reuse that pattern** — see the warning block at the end of that file for the required additive alternative.

**Local dev** still works against a placeholder `DB_PUBLIC` (same bootstrap pattern `DB_OPS` used before staging existed):

```bash
npx wrangler d1 migrations apply DB_PUBLIC --local        # apply the catalog schema to local D1 simulation
echo "ODOO_BASE_URL=https://odoo.ahanassa.com" >> .env.local   # point local dev at the real, public, read-only catalog API — delete this file when done, it is not meant to be left around
```

**`app/[locale]/products/**` is now real and DB_PUBLIC-backed** (DAR-037, see the dedicated section below) — it no longer reads `lib/content/catalog-sample.ts`. The RFQ form's product dropdown (`lib/rfq/validation.ts`) still uses the sample dataset, unchanged — RFQ Catalog wiring is a separate, later phase (DAR-037's own explicit boundary).

**Before this can serve real, populated public pages (the UI is real; the content is not yet):** a scheduled sync trigger (Worker cron or an authenticated internal action — deliberately not wired up, see DAR-035 for a proposed cadence); the catalog editorial workflow (DAR-036) actually being used to approve and publish specific templates/variants — today `/products` correctly renders its real empty state, because zero templates are published yet. **Two Odoo-side API documentation gaps remain open** (undocumented `schedule`/`template_name` fields; `nominal_weight.kg_branch` in the docs vs. the live `per_branch`) — see DAR-034/035; the Product Detail UI does not depend on either field's exact documented shape (both flow through the typed specification presenter, DAR-037).

## Catalog editorial / publication workflow (DAR-036, 2026-08-30)

**The Website-owned editorial layer between DB_PUBLIC's real 237-variant commercial data and any future public catalog page is now designed, implemented, and proven end-to-end against real staging D1 — with zero admin UI, zero authentication system, and zero public write endpoint.** Canonical doc: `docs/CATALOG_EDITORIAL_PUBLICATION.md`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-036.

No new migration was needed — the existing `product_seo_contents` table (migration `0001`) already covers every editorial field (title, slug, descriptions, SEO, indexability, review state, publish state), combined with the pre-existing `product_variants.is_public` master switch. A single reusable predicate, `lib/catalog/editorial.ts#evaluatePublicationEligibility`, is the **only** place "is this variant publicly visible/indexable" is decided — separating `visible` from `indexable` (a product can be live but deliberately `noindex`). `lib/catalog/editorial-repository.ts` provides the only SQL path into public catalog data, structurally unable to return anything without an approved, published `product_seo_contents` row for that exact locale — commercial `is_active`/`is_public` alone is never sufficient (a real gap in the pre-existing, never-called "public" repository functions from earlier tasks, found and closed by this pass).

FA/EN/AR publish independently per `(entity, locale)` row — publishing FA never requires EN/AR, and a locale's row simply not existing yet is never presented as completed translation. Odoo commercial sync (`lib/catalog/sync.ts`) still cannot write to `product_seo_contents` at all, and its commercial patch object is now proven (by a dedicated test) to never contain `isPublic` — so an Odoo-side archive/reactivate cycle can never silently take a page offline or bring one back.

The editorial lifecycle (`upsertEditorialDraft` → `submitForReview` → `approveContent` → `publishContent`, or `unpublishContent`/`sendBackToDraft`/`reopenForEdits`) is exposed as plain async functions in `lib/catalog/editorial-repository.ts` — no HTTP route calls them yet.

**Current state, both staging and production DB_PUBLIC (unchanged by this task — nothing was published):** 237/237 active variants, 0 `is_public`, 0 `product_seo_contents` rows, 0 publicly visible, 0 indexable. This is the expected, safe result for this phase, not an incomplete one.

**Deliberately not built (this phase):** any admin/editorial UI, any Website authentication system, any public write endpoint — `lib/catalog/editorial-repository.ts` is a tested service layer ready for whichever of those a future task selects. The variant-vs-template SEO granularity question this phase deliberately left open was decided in the next phase — see DAR-037 directly below.

## Public Catalog routes (DAR-037, 2026-08-30)

**`/{locale}/products` and `/{locale}/products/{slug}` are now real, server-rendered, DB_PUBLIC-backed pages** — a hybrid, template-primary SEO model (13 real product-family pages as the primary indexable entity; the 237 real commercial variants are shown as a specification/selector table inside their template's page, never as 237 independent SEO pages). Canonical doc: `docs/CATALOG_PUBLIC_ROUTES.md`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-037.

Both routes are structurally unable to bypass the DAR-036 publication boundary — `lib/catalog/editorial-repository.ts#listPublishedCatalogTemplates`/`getPublishedCatalogTemplateBySlug` reuse the exact same eligibility gate as the variant-level reads, applied to `catalog_products` (which carries its own `is_active`/`is_public` columns, unused until now). A template page requires its **own** approved+published `product_seo_contents` row (`entity_type='product'`) — never merely because one of its variants exists. Filters (`?family=&group=&form=&grade=&standard=`) are plain server-rendered `<Link>` toggles — zero client JS added. `lib/catalog/specification-presenter.ts` is the only path from raw polymorphic `dimensions_json`/`nominal_weight_json` to the UI, with an explicit "nominal/theoretical, not actual delivered weight" disclaimer always attached.

**State at the time this route architecture shipped (DAR-037, since superseded on staging only by the real launch pilot — see DAR-038 below):** both staging and production genuinely empty (0 published templates, 0 published variants, `sitemap.xml` empty). Confirmed via a local dev-server smoke test (`/products` correctly renders its real empty state in all three locales, `/products/<invalid-slug>` correctly 404s) and a controlled, fully-reverted live staging test that published one real template with only 2 of its 11 variants marked public, proved the listing/detail/facets/sitemap queries all behaved exactly as designed, then restored the exact original baseline.

`app/[locale]/products/**` no longer touches `lib/content/catalog-sample.ts` in any form; the two components that rendered it there (`components/products/catalogue.tsx`, `components/products/sample-data-notice.tsx`) were deleted. The sample dataset remains in use elsewhere (homepage showcase, footer category links, contact-form product dropdown) — unrelated, pre-existing, out of this phase's scope. Known accepted side effect: the homepage showcase's sample-slug links now correctly 404 under the real detail route — see DAR-037/`docs/CATALOG_PUBLIC_ROUTES.md` §14 for the recommended follow-up.

## Catalog editorial operator CLI & staging launch pilot (DAR-038, 2026-08-30)

**A real, internal, repo-local operator tool now exists to prepare and publish Catalog content — `node scripts/catalog-editorial.ts <command>` — and it has been used to publish a genuine 3-template FA pilot to staging.** Canonical doc: `docs/CATALOG_EDITORIAL_OPERATIONS.md`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-038. No public admin UI, no Website authentication system, and no public write endpoint were built — every write reaches D1 via `wrangler d1 execute` (the same mechanism every prior controlled-verification pass in this project has used), and every editorial-state decision is delegated to the existing, tested `lib/catalog/editorial.ts` — nothing is reimplemented.

```bash
node scripts/catalog-editorial.ts list --env staging                                    # inspect what needs editorial setup
node scripts/catalog-editorial.ts show <template-xid> --env staging                     # full editorial + eligibility detail
node scripts/catalog-editorial.ts batch scripts/pilot/staging-launch-pilot.fa.json --env staging --dry-run   # preview a content batch
node scripts/catalog-editorial.ts publish <template-xid> --locale fa --env staging      # --env is mandatory; production also requires --confirm-production
```

**Staging now has 3 real, published, indexable product pages** (production remains untouched, exactly as before — 237/237 variants, 0 published, 0 indexable): Ribbed Rebar Aj340 (A2), Hot Rolled Plate S355JR, and Square Hollow Section (SHS) — chosen for materially different real specification shapes. FA-only, written from real DB_PUBLIC data (`scripts/pilot/staging-launch-pilot.fa.json`, committed and reviewable) — no price, stock, or fabricated claim anywhere. 4 representative real variants per template were also marked publicly visible (12 of 237 total), proving the spec table shows only deliberately-selected variants, not a template's entire variant set.

Live-verified end-to-end: environment/production write safeguards refuse an unsafe command before touching anything; the actual `/products` and `/products/{slug}` routes render the 3 pilot pages correctly (title, metadata, canonical, spec table, RFQ CTA, zero price/availability) against a local D1 mirror of the same real data; a real commercial sync against the live Odoo API updated one already-published pilot variant's commercial fields while leaving its publication state and editorial content byte-for-byte unchanged.

