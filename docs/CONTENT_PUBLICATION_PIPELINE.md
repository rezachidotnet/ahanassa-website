# Content publication pipeline (W4, staging)

Architecture V1.1 r3 §5.1, §6.7, §7.1, §7.2, §7.4, §8, §12. Workflow: `.github/workflows/content-publish.yml`
(on `main`, checks out this application branch). Scripts: `scripts/content/*`, logic in
`lib/content-pipeline/*`, gates in `lib/static/*`. Every step runs identically locally and in CI.

## Sources

| Source | Access | What |
|---|---|---|
| Production Odoo `https://odoo.ahanassa.com` | **GET only**, ≤ 2 req/s, host + path allowlist (`lib/content-pipeline/odoo-source.ts`) | `/api/v1/catalog/meta`, `/api/v1/catalog/categories?locale=fa\|en\|ar`, `/api/v1/catalog/products?locale=fa` (all pages), `/api/v1/processing/groups?locale=fa\|en\|ar` (owner decision 2026-10-03: no `/catalog/*` twin exists) |
| DB_PUBLIC staging | read-only before the build | the Website-owned editorial layer (SEO/page rows, publish state, `is_public`, `name_fa`/`slug_fa`, redirects, homepage rank — `docs/CATALOG_EDITORIAL_PUBLICATION.md` §1; owner decision 2026-10-03) and the publication state (pointer, retained versions, their counts) |

Full fetch every run (no delta): a row Odoo no longer returns stays in the snapshot with `is_active = 0`;
editorial rows survive. New Odoo rows get the former sync's defaults (not public). The template name is
set once at creation, as before (public listings sort on it).

## Steps

```text
build job   fetch → validate (+ decrease gate) → snapshot → export (+ artifact gate) → tsc → tests → checks → upload
publish job download → load (staged) → deploy → smoke → switch → finalize        (rollback on failure)
```

| Step | Script | Notes |
|---|---|---|
| fetch | `fetch.ts --work <dir>` | `<dir>` must be outside the repo; `source/{odoo,d1,fetch-report}.json` |
| validate | `validate.ts [--allow-decrease]` | schema, relations (variant→template→category, category counts = fetched products, processing groups per locale), Persian in en/ar names; **decrease gate**: any gated count > 20 % below the active publication stops the run; `allow_decrease` overrides and is recorded |
| snapshot | `snapshot.ts` | monotonic `snap-YYYYMMDDHHMMSSnn` + `content_sha256` |
| export | `export.ts` | `scripts/static/build.ts` from the snapshot (fa/en/ar, canonical, reciprocal hreflang, sitemap of published indexable pages, JSON-LD incl. `Product` without price, robots, `_headers`); private manifest gets the `pipeline` block; decrease gate again on built counts |
| checks | `checks.ts` | artifact gate (separation, checksums, SEO, Persian leak scan, publication gate), links/images/hreflang reciprocity/sitemap, hydration + no-RSC on all pages, **zero console errors** on the interactive pages |
| load | `publish.ts load` | `publication_state` row `staged` + `rfq_variant_index` rows (atomic batches ≤ 90 KB); refuses a non-monotonic version or a moved pointer |
| deploy | `publish.ts deploy` | checksum-verified copy → assets-only Worker `ahanassa-v11-static-staging`; previous Worker version recorded |
| smoke | `publish.ts smoke` | 15 pages fa/en/ar (home, products, a category, a product with Product JSON-LD, contact), catalog JSON version, sitemap, robots, 404 ×3, `/contact` form in Chrome loads the new version, RFQ Worker `/healthz`, variant dry run on the new version (the Worker's own `resolveVariantsFromIndex`, no RFQ) |
| switch | `publish.ts switch` | guarded atomic pointer switch + dry run through the active path |
| finalize | `publish.ts finalize` | DB_PUBLIC catalog mirror (Odoo-owned columns only) + retention (keep 3 + active) |
| rollback | `publish.ts rollback` | before the switch: staged version `failed`, its index rows removed, pointer untouched; after the deploy: previous Worker version redeployed and verified by `manifest.public.json`; after the switch: pointer restored |

Local dry run (no Cloudflare write): `scripts/content/dry-run.sh <work-dir> [--allow-decrease]`.
Determinism: `node scripts/content/compare-artifacts.ts <artifactA> <artifactB>`.
Gate tests on local copies: `scripts/content/simulate.ts remove-family|inject-leak`.

## Parameters

`lib/content-pipeline/config.ts`: decrease threshold (0.2), retained versions (3), Odoo rate (600 ms between
requests), timeouts, page size, D1 batch size. Schedule: daily 22:47 UTC (02:17 Tehran) + manual dispatch.

## W5 additions

- **`CONTENT_REBUILD`** (owner decision D4, `docs/release/RELEASE_POLICY.md` §19): a production content
  publication runs without manual approval only when the artifact's `code_sha` is the latest `STABLE_100`
  production release, only static assets + snapshot change, and every gate passed; `allow_decrease` or a failed
  gate needs the approval; anything else is a code release. Check: `node lib/ci/content-rebuild-cli.ts
  --artifact <dir> --ledger-ref <trusted production branch>` (exit 0 AUTO, 3 APPROVAL_REQUIRED, 1 REFUSED).
  The W8 production job must run it before any production write.
- **Indexing** (owner decision D6, `docs/INDEXING_POLICY.md`): the artifact gate's indexing gate refuses a
  staging artifact that could be indexed and a production artifact that does not match the policy.
- **Thin-content report** (report only): the checks step adds it to the job summary.

## W8.0 additions (architecture r4)

- **Two targets per build.** `export.ts` builds `<work>/artifact` (staging) and `<work>/artifact-production` from
  the same code_sha + snapshot, then runs the **allowlisted-diff gate** (`lib/static/target-diff-gate.ts`,
  result in `<work>/target-diff.json`). Allowed: the whole files `robots.txt`, `sitemap.xml`, `_headers`; the
  `<meta name="robots">` value (HTML + its RSC copy); the Turnstile site key and RFQ API origin only as each
  target's registered pair (`lib/static/targets.ts`) — a value of the other target anywhere fails; the target
  label in the manifests (+ the derived `sitemap_urls` count). Any other byte fails. `checks.ts` runs the
  artifact gate, link check and hydration on both.
- **Production-prep publish** (`content-publish.yml` job `publish-production`, `workflow_dispatch` with
  `target=production-prep`, environment `production-v11`): after the staging publish of the same run,
  `publish.ts <step> --env production` publishes the production twin to `ahanassa-v11-static-production`
  (workers.dev) and the v11 production DB_PUBLIC (publication state + `rfq_variant_index` only; no catalog
  mirror). `load` re-checks that the staging twin is active on staging and the diff gate. The
  CONTENT_REBUILD classification is recorded (a code release until a v11 `STABLE_100` exists).

## W11.1 additions (articles)

- **fetch** also reads the merged articles of the private content repository (`AHANASSA_CONTENT_REPO_TOKEN`,
  `AHANASSA_CONTENT_DEPLOY_KEY_FILE` or `AHANASSA_CONTENT_DIR`; W9.7 wires the workflow) into
  `source/articles.json`. Never fails the step.
- **validate** checks every article (`lib/articles/validate.ts`), writes the accepted rows to `<work>/articles.json`
  and adds `articles_fa/ar/en` to the counts. Blocked only when the live site shows articles and the fetch is
  unavailable; any drop of a locale's article count is a gated decrease (threshold 0, `allow_decrease` overrides).
- **snapshot** adds them as the build-only `published_articles` table; **export** rasterizes the covers.
- **checks**: the artifact gate adds the article gate (`lib/static/article-gate.ts`); the link check, hydration
  and the source-name scan cover the article pages like every other page.
- Details: `docs/ARTICLES.md`.

## Not yet

Production job (W8: same artifact, checksum check, no refetch, no rebuild, the `CONTENT_REBUILD` check).
Alerting: W6 (`docs/OPS_ALERTS.md`).
