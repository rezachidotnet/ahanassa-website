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

The Odoo sync path is intentionally inert locally (`npm run dev`, no `--env`) — no local Odoo credentials exist.

**Update, 2026-08-31 (DAR-041):** the live RFQ sync target changed. `lib/queue/consumer.ts` now calls the dedicated Odoo Public RFQ Intake API v1 (`lib/odoo/rfq-api-client.ts`, `POST /api/v1/rfq`, credential `ODOO_RFQ_API_TOKEN`) — never `lib/odoo/adapter.ts` (the direct `crm.lead`-via-JSON-2 path described in the rest of this section, now deprecated in place and kept only for historical readability). `ODOO_RFQ_API_TOKEN` has not been provisioned anywhere yet (Deployment Stage 1); every RFQ reaching the queue today lands in `sync_status = 'pending'` (`not_configured`), same fail-safe behavior the legacy adapter had. See `docs/ODOO_RFQ_API_INTEGRATION.md` for the current contract. The rest of this section (§"Odoo staging connectivity") is preserved as-is below as the historical record of the legacy path's real staging write test — it does not describe current live behavior.

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

## Catalog → RFQ Variant Preselection (DAR-039, 2026-08-30)

**A visitor on a real published Catalog page can now select a real commercial Variant and continue into the existing RFQ form with it safely preselected — `product_variant_xid` is the canonical identity throughout, resolved against DB_PUBLIC both when the request page renders and again, independently, at submission time.** This extends the existing RFQ backend; it is not a second implementation. Canonical doc: `docs/CATALOG_RFQ_INTEGRATION.md`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-039.

The `rfq_items` schema already had `source`/`*_ref`/`*_label` columns for exactly this (previously always `NULL`) — only one column was genuinely missing, added via a narrow additive migration:

```bash
npx wrangler d1 migrations apply DB_OPS --env staging --remote     # migrations/0002_rfq_catalog_snapshot.sql — adds rfq_items.sku_snapshot
npx wrangler d1 migrations apply DB_OPS --env production --remote  # applied to both; 6/7 staging rows and 0/0 production rows preserved
```

Flow: Product page → a plain, server-rendered "Request this item" link per eligible Variant row (`components/products/variant-spec-table.tsx`, zero client JS) → `/{locale}/contact?variant=<xid>` → `app/[locale]/contact/page.tsx` resolves the xid server-side → `EnquiryForm` shows a locked-identity card (title/SKU/spec, removable, falls back to the normal custom-item fields) → on submit, `lib/rfq/service.ts` **re-resolves the xid against DB_PUBLIC independently** (never trusts the browser) before any D1 write, using the identical eligibility rule the public Catalog routes already use — a Variant never needs its own SEO page to be RFQ-selectable, but it does need to belong to a real, currently-published product page. An unknown/archived/unpublished/wrong-locale xid rejects the whole submission with a normal validation error — never a fabricated fallback.

Real, live, local end-to-end proof (no deployment): using Cloudflare's own publicly documented Turnstile testing keys in a temporary, non-committed `.env.local` (deleted immediately after), a real `POST /api/rfqs` against the actual dev server correctly created a real RFQ with the canonical Catalog snapshot persisted (`variant_ref`, `product_ref`, `sku_snapshot`, labels), preserved idempotency on retry, rejected an unknown/non-public/wrong-locale xid, correctly persisted a mixed catalog+custom submission and a 2-catalog-item submission, and left the honeypot/Turnstile checks fully intact. Custom/free-text RFQ items are completely unaffected.

## Scheduled Catalog Synchronization (DAR-040, 2026-08-31)

**The operational layer that keeps DB_PUBLIC current without any manual step now exists — incremental sync every 3 hours, full reconciliation once daily — safe against Odoo being temporarily unavailable and safe against a catastrophic/implausible upstream response.** Canonical doc: `docs/CATALOG_SYNC_OPERATIONS.md`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-040. No fetch/plan/apply logic was duplicated — `lib/catalog/scheduled-sync.ts` orchestrates the exact same `lib/catalog/sync-runner.ts` primitives proven since DAR-034/035.

```bash
npx wrangler d1 migrations apply DB_PUBLIC --env staging --remote     # migrations_public/0003_catalog_sync_state.sql — new catalog_sync_state table
npx wrangler d1 migrations apply DB_PUBLIC --env production --remote  # applied to both; all real Catalog + editorial rows preserved

node scripts/catalog-sync.ts status --env staging          # durable watermark / lease / failure state
node scripts/catalog-sync.ts incremental --env staging --dry-run
node scripts/catalog-sync.ts full --env production --confirm-production --dry-run   # --env is mandatory; production writes also require --confirm-production
```

Two real bugs were found and fixed while building this, before either ever reached staging: (1) a technically-successful full pull returning **zero items** would previously have caused the existing planner to deactivate the entire catalog — `lib/catalog/sync-safety.ts#evaluateFullSyncPlausibility` now refuses to apply a full reconciliation whose upstream count is implausible relative to the currently-known active count (never a hardcoded `237` — the catalog may legitimately grow or shrink); (2) the watermark could never be established for the very first incremental run — a successful full reconciliation now also advances it, since a full pull re-observes everything.

Concurrency is a lightweight DB-backed lease (`catalog_sync_state.lease_owner`/`lease_expires_at`, a single atomic conditional `UPDATE`, 10-minute TTL, no distributed-lock system) shared by scheduled runs and the manual CLI alike. `workers/entry.ts#scheduled()` now routes three Cron expressions by their literal string (the pre-existing RFQ outbox sweep, Catalog incremental, Catalog full reconciliation) — `wrangler.jsonc`'s `triggers.crons` lists all three, but **this is configuration only**: no Worker has ever been deployed in this project, so Cloudflare has not registered/activated any of these triggers yet. Activation is Claude Deployment Stage 1, not this phase.

Real, live validation against both environments (no destructive experiment, no Odoo write, production validated only after staging passed in full): a real full reconciliation and a real incremental sync were run against staging (baseline 237 variants / 12 public / 3 published templates / 3 SEO rows) and then production (baseline 237 variants / 0 public / 0 published) — both left every commercial and editorial row exactly as they were (spot-checked byte-identical), applied 0 changes (matching real, unchanged upstream data), and left DB_OPS completely untouched on both.

## Website → Odoo RFQ API handoff (DAR-041, 2026-08-31)

**New Website RFQs now synchronize to Odoo via the dedicated Odoo Public RFQ Intake API v1 (`POST /api/v1/rfq`), creating `ahanassa.rfq`/`ahanassa.rfq.line` only — never `crm.lead` directly.** CRM opportunity creation is a private, Odoo-side, operator/qualification-gated workflow downstream of `ahanassa.rfq`; the Website never triggers it. Canonical doc: `docs/ODOO_RFQ_API_INTEGRATION.md`. Canonical Odoo-owned contract artifacts: `docs/integrations/odoo/rfq-v1/`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-041.

Everything upstream of Odoo is unchanged: `POST /api/rfqs` → durable D1 write → outbox → Queue → `lib/queue/consumer.ts`. The consumer now maps the persisted, immutable D1 snapshot to the Odoo request (`lib/odoo/rfq-payload-mapper.ts`) and posts it via a narrow, typed client (`lib/odoo/rfq-api-client.ts`) — never generic Odoo ORM/model access. The outbound `Idempotency-Key` is deterministic (`` `rfq-${rfqs.id}` ``, never per-attempt-random), so every retry of the same RFQ sends byte-identical payload and header, satisfying Odoo's same-key-same-payload safe-replay contract. A genuine, non-fabricating blocker (an unparseable quantity, or a unit that cannot be inferred from the customer's own free text — the Website still has no structured UOM selector, a documented pre-existing gap) fails the whole RFQ into `sync_status = 'manual_review'` with the exact line reported, rather than guessing a number or a unit.

```bash
npx wrangler d1 migrations apply DB_OPS --env staging --remote      # migrations/0003_odoo_rfq_api_handoff.sql — new nullable rfqs.odoo_rfq_reference column + partial unique index
npx wrangler d1 migrations apply DB_OPS --env production --remote   # applied to both; row counts verified unchanged at each step (staging 6, production 0)
```

**Update, 2026-09-01 (DAR-042, Claude Deployment Stage 1):** `ODOO_RFQ_API_TOKEN` is now provisioned for `ahanassa-production` — deliberately a new, separate credential, never the legacy `ODOO_API_KEY`. See "Claude Deployment Stage 1" below: real end-to-end RFQ delivery to live Odoo is now proven — after two sequential Odoo-side defects were found and fixed on the Odoo side, the existing synthetic RFQ was successfully recovered via the project's own outbox mechanism, `odoo_rfq_reference = RFQ-2026-000005`. Odoo availability/correctness has never affected, and still does not affect, the original Browser-facing submission's success — that guarantee held throughout both failure cycles.

The legacy direct-`crm.lead` path (`lib/odoo/adapter.ts`/`client.ts`/`mapping.ts`/`types.ts`) is deprecated in place, not deleted — each file's header now says so. It never actually synced a real production RFQ (no credential was ever provisioned for it), so no historical data migration was needed; `odoo_lead_id`/`integration_mappings` remain in the schema, untouched, as a historical record.

## Claude Deployment Stage 1 (DAR-042, 2026-09-01)

**The first real Cloudflare Worker deployment of this Website is live — `ahanassa-production`, non-live, `workers.dev` only.** `ahanassa.com`/`www.ahanassa.com` DNS is **unchanged**; the legacy Vercel site remains the live public production site throughout and after this deployment. Canonical doc: `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-042. **Gate: PASS.**

```bash
CLOUDFLARE_ENV=production npx vinext build                       # REQUIRED before any wrangler command below — see the gotcha noted in DAR-042
npx wrangler versions upload --config dist/server/wrangler.json  # never pass --env again; the config is already flattened
npx wrangler versions deploy <version-id>@100 --config dist/server/wrangler.json
```

Real production D1/Queue/DLQ/Cron (provisioned earlier, DAR-032) are now attached to a real deployed Worker for the first time — all 4 secrets provisioned (`TURNSTILE_SECRET_KEY` via a real, hostname-scoped Turnstile widget created for this task; `ODOO_RFQ_API_TOKEN` provisioned directly by the project owner, value never entering any AI session; `PREVIEW_BASIC_AUTH_USER`/`PASSWORD` for the temporary gate below). Catalog/security/SEO runtime smoke tests all passed against real production `DB_PUBLIC`.

**Temporary non-live protection — Cloudflare Access is not enabled on this account.** A Basic Auth gate (`lib/security/preview-auth.ts`) protects every route on this deployment, including `/api/rfqs`, with no exclusions — this deployment carries the real, live-writing Odoo RFQ credential. **This is TEMPORARY / NON-LIVE ONLY** and must be removed before the real `ahanassa.com` cutover — see `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §7 for the exact removal steps.

**One real synthetic RFQ E2E, live against production, proven end-to-end — after two sequential Odoo-side defects were found, reported, and fixed on the Odoo side.** Website reference `AA-RFQ-VD1DCR16` was durably captured exactly once. Two initial delivery cycles (12 attempts total) each hit a genuine Odoo-side `fulfillment_method` NOT NULL violation — first the underlying bug itself, then (after the Odoo team's first fix) a stale-worker-registry recurrence of the same symptom until Odoo's container was restarted to load the corrected code. Both cycles were diagnosed as Odoo-side (route requires auth, correctly `401` unauthenticated; sibling Catalog API healthy) and correctly landed in the DLQ. **The existing durable record was then recovered — twice — using the project's own outbox recovery mechanism (`dispatchPendingOutboxEvents`): same `event_id`, same `aggregate_id`, same deterministic Idempotency-Key, byte-identical payload, no new Website RFQ ever created.** The second recovery succeeded on its very first attempt: `odoo_rfq_reference = RFQ-2026-000005`, `sync_status = 'synced'`. A follow-up controlled idempotency-replay redelivery (after success) completed in 165ms — proof the Website's own guard never even reaches the network for an already-synced RFQ. `rfqs` row count stayed at exactly 1 throughout every attempt across the entire process. Both DLQ records were marked `resolved` with an audit note; nothing was deleted.

## Multi-Item RFQ / Purchase-List Form (DAR-043, 2026-09-02)

**The approved single-item RFQ form at `/{locale}/contact` is now a true 1–20-line procurement-list editor.** Rows are data-driven (`items: RfqRow[]`), mix Catalog-linked and free-text lines in one submission, and show a live `X / 20` counter. Canonical doc: `docs/RFQ_MULTI_ITEM_FORM.md`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-043. **Gate: PASS.**

**The existing RFQ backend is completely unchanged** — `lib/rfq/service.ts`, `lib/rfq/repository.ts`, `lib/rfq/validation.ts`, `app/api/rfqs/route.ts`, Turnstile, rate limiting, honeypot, idempotency, the outbox, the Queue, and the Odoo RFQ API handoff (DAR-041) were not touched. This was a pure UX redesign: the form now sends `items: RfqItemInput[]` for every row instead of exactly one, using the identical existing wire shape.

A new, narrow, publication-safe read — `lib/catalog/editorial-repository.ts#listRfqSelectableCatalogItems` — feeds a shared Category → Product → Variant cascade for Catalog rows, fetched once per page render (never per row). Quantity/Unit are now real structured inputs, composed client-side into the same freeform `quantityText` string the server has always parsed — zero backend change, verified against `lib/odoo/rfq-payload-mapper.ts`'s own UOM keyword dictionary directly.

**A real local-dev regression from the prior Deployment Stage 1 task was found and fixed while validating this one:** the temporary Basic Auth preview gate (`workers/entry.ts`) was unconditional and silently `401`'d every local `npm run dev` request. Fixed by scoping it to `env.APP_ENV === "production"` — the already-deployed non-live Worker's fail-closed behavior is unchanged; only local dev's accidental blockage is fixed. No redeployment performed.

Real, live, local end-to-end proof (twice) using Cloudflare's official always-passing Turnstile test keys in a temporary, non-committed `.env.local` (deleted immediately after) against 12 real published Variants (the DAR-038 pilot data): a `?variant=` preselection correctly seeded row 1 and, after adding a quantity, produced a real `201` and a real D1 row (`AA-RFQ-6V6D5SHD`); a second submission mixed one real Catalog line with one custom line in a single RFQ (`AA-RFQ-K25XQRKC`), both persisted correctly in one atomic write. Also verified: 20/20 row cap with the Add button correctly disabling past it, and the per-row validation error summary with correct scroll-to-first-invalid-field behavior.

## Multi-Item RFQ deployed to production Worker (DAR-044, 2026-09-02)

**The Multi-Item RFQ form is now live on the existing protected non-live `ahanassa-production` Worker** — no second Worker created, `ahanassa.com`/`www.ahanassa.com` DNS unchanged, the temporary Basic Auth gate left fully intact. Canonical doc: `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §29. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-044. **Gate: PASS.**

Real 1/10/11/15/20-row UI validation passed live on the deployed Worker (Add correctly disabled at 20, 21st blocked, no data loss on add/remove). Production `DB_PUBLIC` currently has zero publication-eligible Catalog Variants (unchanged, deliberate baseline) — Catalog preselection's graceful-degradation path was verified live instead of a successful resolution, per this task's own "do not alter Catalog publication merely for this test" instruction.

**One real 12-line synthetic RFQ, using the real (non-test-key) Turnstile path, succeeded on the first attempt:** Website reference `AA-RFQ-C3SZCRT7`, Odoo reference `RFQ-2026-000006` — exactly 12 `rfq_items` rows (all custom/free-text, since no Catalog data exists in production to select), exactly one outbox event, exactly one successful `integration_attempts` row, zero new DLQ entries. Basic Auth and Turnstile re-confirmed intact after the E2E; no secret in HTML; performance unchanged from baseline.

## Go-Live Readiness and Cutover Gate (DAR-045, 2026-09-02)

**The first real production Catalog content is now live: 3 published product pages (Ribbed Rebar Aj340, Hot Rolled Plate S355JR, Square Hollow Section), 12 representative public variants** — published via the existing `scripts/catalog-editorial.ts` operator CLI, real content re-verified against live production `DB_PUBLIC`, owner-reviewed and owner-corrected before publication. Canonical docs: `docs/GO_LIVE_READINESS.md` (full readiness record), `docs/GO_LIVE_CUTOVER_RUNBOOK.md` (Stage 2 plan, **not executed**), `docs/UOM_INVENTORY_PROCUREMENT_GATE.md` (new, open, owner-mandated non-Website blocker). Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-045. **Gate: GO-LIVE BLOCKED.**

Two real defects were found and fixed during this readiness pass, both deployed and live-verified on the same protected non-live `ahanassa-production` Worker (version `1e3d89fa-f635-4701-8ae0-cc290a7643b2`): a hreflang defect (the Product page previously advertised `en`/`ar` alternate links to slugs that don't exist yet) and a Catalog-filter dead-end defect (independently-real filter values from different published templates could be combined into a URL matching zero real templates). The same deployment also shipped several RFQ-form UX fixes found during the owner's own manual production verification — an RFQ layout collision (CSS Grid `min-w-0` fix), RTL `<select>` text clipping under the dropdown arrow, visible required-field markers, phone now required both client- and server-side (owner decision — Email/Company requirement unchanged), and an explanatory status message while Cloudflare Turnstile is still verifying/needs interaction/has failed.

**`GO-LIVE BLOCKED`**, primarily on a new, explicit, owner-mandated blocker unrelated to Website code: the `UNIT / INVENTORY / PROCUREMENT ARCHITECTURE GATE` (`docs/UOM_INVENTORY_PROCUREMENT_GATE.md`) — a 19-item list of Odoo/ERP-side unit-of-measure and inventory/procurement reconciliation questions that must be resolved (or explicitly owner-waived) on the Odoo side before Go-Live, independent of how ready the Website itself is. `ahanassa.com`/`www.ahanassa.com` DNS and the legacy Vercel site remain completely unchanged.

## RFQ Launch UoM Contract Alignment (DAR-046, 2026-09-02)

**The Website's RFQ unit-of-measure policy is now aligned with Odoo Ahan Asa Marketplace production `19.0.27.0.0`'s confirmed Launch contract** — Rebar accepts kg/ton/branch, Plate accepts kg/ton/sheet, SHS accepts kg/ton/meter, Custom/free-text lines accept kg/ton only; `coil`/`bundle`/`piece` are no longer offered or accepted for a new Website Launch submission (Odoo's schema still recognizes them internally — they are simply no longer a normal Website request UoM). Canonical doc: `docs/RFQ_LAUNCH_UOM_ALIGNMENT.md`. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-046. **Gate: WEBSITE RFQ LAUNCH UOM ALIGNMENT: PASS.**

The RFQ wire contract now carries an explicit, required `unit` code (`lib/rfq/uom-policy.ts` is the one canonical policy, keyed by the stable `product_variants.group_code`) enforced server-side in two layers — a handcrafted `POST /api/rfqs` cannot bypass it (live-proven locally: Rebar+sheet, SHS+branch, Custom+branch, and Custom+coil were all rejected before any D1 write, with `rfqs`/`integration_outbox` row counts unchanged). The previously-always-`NULL` `rfq_items.unit_ref`/`unit_label` columns are now populated with the real, validated code, and the Odoo payload mapper uses it directly and deterministically rather than re-inferring a unit from free text — proven live (`unit_ref: "branch"`, `quantity_value: 100` for a real "100 branch" submission). No Cloudflare deployment, DNS/Vercel/Basic Auth change, or production RFQ was part of this task.

## RFQ Launch UoM Runtime Validation (DAR-047, 2026-09-02)

**Commit `42ce8fe` (the RFQ Launch UoM Contract Alignment above) is now live on the existing protected non-live `ahanassa-production` Worker** — version `ac09d55c-c80c-455d-a827-c3730cba22c5`, 100% traffic, no new Worker, all secrets/bindings preserved, Basic Auth and Turnstile both re-confirmed active. Canonical doc: `docs/RFQ_LAUNCH_UOM_ALIGNMENT.md` §21. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-047. **Gate: WEBSITE RFQ LAUNCH UOM RUNTIME: PASS.**

Live-verified against real production Catalog data: Rebar/Plate/SHS unit selectors expose exactly kg/ton/branch, kg/ton/sheet, and kg/ton/meter respectively — no unsupported unit anywhere. Two invalid payloads (Custom+coil, Custom+branch) were safely POSTed directly to production and rejected at the format layer before Turnstile is ever checked, with zero DB writes; the two Catalog-group-specific invalid combinations were intentionally not repeated against production (would require a real Turnstile pass) and remain covered by the 449 local tests instead. Stale-UoM reset and a 20-row mixed multi-line submission (zero cross-row leakage) were verified interactively against local dev running the identical deployed commit and identical synced Catalog data. No production RFQ was created; `ahanassa.com`/`www.ahanassa.com` DNS and the legacy Vercel deployment remain completely unchanged.

