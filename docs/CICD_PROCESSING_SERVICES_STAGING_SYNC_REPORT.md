# CI/CD — Staging Processing Services Synchronization Cron

**Date:** 2026-09-19 (Asia/Tehran). All timestamps below are UTC.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`
**Scope:** enable the already-implemented Odoo Processing → Website staging synchronization by registering the one cron trigger it needs.
**Reference:** `docs/CICD_STAGING_FIRST_GITHUB_ACTIONS_DEPLOY_REPORT.md`

---

# RESULT

**PASS.**

The single blocker — `env.staging.triggers.crons: []` — is removed. The cron fired on its own natural schedule at **09:00:46Z**, the Processing sync succeeded at **09:00:50Z**, `public_processing_groups` went from 0 to **9 rows (3 per locale × fa/en/ar)**, and the Header Services entry is now a real dropdown carrying the three live Processing groups in all three locales. Production is untouched.

No sync was forced, no test data was inserted, no sync logic or Odoo code was changed, no new cron expression was invented, and the deployment went through GitHub Actions rather than a manual `wrangler deploy`.

---

# ARCHITECTURE INSPECTED (no redesign)

Verified read-only before changing anything:

| Component | Location | Finding |
| --- | --- | --- |
| Scheduled handler | `workers/entry.ts#scheduled()` | routes on `event.cron`; the `0 */3 * * *` branch calls `runScheduledCatalogSync("incremental")` **and** `runScheduledProcessingSync()` via two independent `ctx.waitUntil` calls |
| Sync runner entry | `lib/processing/scheduled-sync.ts#runScheduledProcessingSync()` | lease-guarded; loops `LOCALES = ["fa","en","ar"]` sequentially through `runProcessingLocaleSync()` |
| Per-locale runner | `lib/processing/sync-runner.ts#runProcessingLocaleSync()` | fetch → validate → plan → create/update/withdraw; DB never touched on a malformed batch |
| Odoo API client | `lib/processing/odoo-api-client.ts` | `GET {ODOO_BASE_URL}/api/v1/processing/groups?locale=<l>`, ETag/304-aware, fails closed when unconfigured |
| D1 projection | `public_processing_groups` | `PRIMARY KEY id`, columns `code`, `locale CHECK IN ('fa','en','ar')`, `name`, `sequence`, `is_active` — **one row per (code, locale)** |
| Header consumer | `app/[locale]/layout.tsx:77` → `SiteHeader.tsx:122` → `header-nav-disclosure.tsx:108` | `listPublicProcessingGroups(locale)` filters `WHERE locale = ? AND is_active = 1`; the disclosure renders a **plain link** when `items.length === 0`, a dropdown otherwise |

That last row is exactly why the pre-change site showed a bare "Services" link: the projection was empty, so the disclosure took its documented empty-state fallback. Nothing was broken — nothing had ever populated it.

**Row-count expectation corrected up front.** The task brief anticipated "3 rows". Because the table is keyed per `(code, locale)` and the runner syncs three locales, the correct expectation is **9 rows total, 3 per locale** — and the header, reading one locale at a time, sees 3. This was predicted before the sync ran and is exactly what landed.

---

# CHANGE MADE

One block in `wrangler.jsonc`, inside `env.staging` only:

```diff
-"crons": []
+"crons": ["0 */3 * * *"]
```

No new cron expression was created — this is the existing production expression that `workers/entry.ts` already routes to Processing sync. The surrounding comment was rewritten to record why the list is no longer empty, the trigger-cap arithmetic, and the catalog side effect. `git diff -U0` confirms every changed hunk lies between lines 274–305; the `env.production` block (lines 166–271) is untouched.

## Cron configuration — before / after

| | Before | After |
| --- | --- | --- |
| `env.staging` | `[]` | `["0 */3 * * *"]` |
| `env.production` | `["*/5 * * * *", "0 */3 * * *", "30 2 * * *"]` | **unchanged** |

Verified on the live Workers via the Cloudflare API (not merely in the file):

```
ahanassa-bootstrap-staging  before: []                                    after: ["0 */3 * * *"]
ahanassa-production         before: ["0 */3 * * *","30 2 * * *","*/5 * * * *"]   after: identical
```

---

# TRIGGER CAPACITY VERIFICATION

| | Schedules |
| --- | --- |
| `ahanassa-production` | 3 |
| `ahanassa-bootstrap-staging` | 1 (was 0) |
| **Total** | **4 of the 5-trigger cap — headroom 1** |

Both counts were read from the Cloudflare API before and after the change, not assumed from the config file. This is the same cap whose breach on 2026-09-03 (DAR-053) emptied staging's cron list in the first place; adding the other two production crons here would reach or exceed it.

---

# VALIDATION

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | **1340 passed, 0 failed** (1334 before, +6 new) |
| `npm run build` | build complete; working tree unchanged afterwards |
| Deploy workflow's own inline staging assertion | PASS against the modified config |

## Tests added — `lib/ci/wrangler-config-invariants.test.ts`

Six static checks over `wrangler.jsonc`, following the existing `lib/ci/workflow-invariants.test.ts` pattern:

1. `env.staging.triggers.crons` is exactly `["0 */3 * * *"]` — never empty (sync would never run), never production's full list.
2. That string is byte-identical to `CATALOG_INCREMENTAL_CRON` in `workers/entry.ts`, and the handler still calls `runScheduledProcessingSync()`. **A drifted string is the dangerous failure here:** Cloudflare would fire a cron that falls through the `switch` to the `default` branch (RFQ outbox sweep) and Processing sync would silently never run, with no error anywhere.
3. `env.production.triggers.crons` still holds its three original expressions.
4. Total declared triggers across all environments stay ≤ 5.
5. Staging and production share no Worker name, D1 `database_name`, D1 `database_id`, or queue name.
6. No value or key under `env.staging` names the live environment, and `vars.APP_ENV === "staging"`.

**Mutation-tested** — each of these turns the suite red: reverting the staging cron to `[]` (2 failures), re-inheriting production's full cron list (3 failures), and repointing staging `DB_OPS` at the production database id (1 failure).

---

# COMMIT

`c9c641ce5f8e8653ba1396417687823916db01fb` — `ci(staging): enable the Processing Groups sync cron`

Contents: `wrangler.jsonc` and `lib/ci/wrangler-config-invariants.test.ts` only. The three pre-existing pending working-tree items (`REPORT_BUNDLE_MANIFEST.txt`, `tsconfig.tsbuildinfo`, untracked `docs/AHANASSA_CICD_SERVICES_CURRENT_STATE_RECOVERY_AUDIT.md`) were not absorbed. Pushed fast-forward `6ee36c7..c9c641c`, no force.

**Variance from the brief:** the specified subject line was `ci(staging): enable processing sync cron`. The commit was authored, pushed and deployed before that wording arrived. Changing it now would require rewriting a pushed commit — a force-push, forbidden throughout this task series — so it stands. The content is exactly the specified change.

---

# DEPLOYMENT

Through the existing workflow; no manual `wrangler deploy`.

| Field | Value |
| --- | --- |
| Workflow | `Deploy Staging`, ID `361701517` |
| Run ID | **`35428823679`** — https://github.com/rezachidotnet/ahanassa-website/actions/runs/35428823679 |
| Dispatch ref | `feat/header-hero-integrated` (the only branch the `staging` environment policy permits) |
| `deploy_ref` | `c9c641ce5f8e8653ba1396417687823916db01fb` |
| Conclusion | success |

Exact-SHA model confirmed in the run log:

```
Checkout deploy_ref : HEAD is now at c9c641c ci(staging): enable the Processing Groups sync cron
Resolve deployed SHA: Deploying exact commit: c9c641ce5f8e8653ba1396417687823916db01fb
Deploy step         : Deployed ahanassa-bootstrap-staging triggers (1.36 sec)
                      schedule: 0 */3 * * *
                      Current Version ID: 6e79335c-1add-438b-8301-fa048feb3367
```

The `schedule: 0 */3 * * *` line is the trigger actually being registered — note `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md:111`: trigger changes apply on `wrangler deploy` / `versions deploy`, never on `versions upload` alone.

## Staging Worker version — before / after

| | Version | Created |
| --- | --- | --- |
| Before | `9817456d-690d-4e46-a008-3817a130f41c` | 2026-09-19T06:21:12Z |
| After | **`6e79335c-1add-438b-8301-fa048feb3367`** | 2026-09-19T07:16:17Z |

Post-deploy smoke, all 200: `/`, `/en`, `/ar`, `/services`, `/en/services`, `/products`, `/contact`, `/api/hello`.

---

# SCHEDULED EXECUTION

**Not forced.** No manual invocation, no `wrangler dev --test-scheduled`, no inserted rows. A watcher polled staging `DB_PUBLIC` every 4 minutes from 07:17Z, reading `rows: 0` and a null `last_attempted_at` on every poll through 08:43Z — then the cron fired on its own at the next natural window.

(The watcher process was killed by the OS for memory pressure around 08:45Z, before the firing. That affected only the observer; the result was read directly from D1 afterwards. The cron itself runs on Cloudflare and was never dependent on it.)

## `processing_sync_state` evidence

```json
{
  "id": "processing",
  "last_attempted_at": "2026-09-19T09:00:46.977Z",
  "last_success_at":   "2026-09-19T09:00:50.087Z",
  "consecutive_failure_count": 0,
  "last_failure_at": null,
  "last_failure_reason_code": null,
  "etag_fa": "\"3ba086121eba386950e245b331883a7e6cff0e82104c1e59cfebb78bd7a28e07\"",
  "etag_en": "\"c69c5cb781bf7556c60d39af8aa622ab955963cce272d02eacd2ea256166875d\"",
  "etag_ar": "\"3ba086121eba386950e245b331883a7e6cff0e82104c1e59cfebb78bd7a28e07\"",
  "lease_owner": null,
  "updated_at": "2026-09-19T09:00:50.187Z"
}
```

Attempted 46.977s past the hour, succeeded 3.1s later, zero failures, lease correctly released, all three per-locale ETags stored for 304-based cheapness on subsequent runs. Both fields were `null` before this run.

---

# D1 ROWS — BEFORE / AFTER

`public_processing_groups`, staging `DB_PUBLIC` (`ahanassa-public-staging`):

| | Before | After |
| --- | --- | --- |
| Total rows | **0** | **9** |
| `fa` | 0 | 3 (all active) |
| `en` | 0 | 3 (all active) |
| `ar` | 0 | 3 (all active) |

| locale | code | name | seq | active |
| --- | --- | --- | --- | --- |
| fa | `SHEET_PROCESSING` | فرآوری ورق | 10 | 1 |
| fa | `LONG_PRODUCTS_PROCESSING` | فرآوری میلگرد، مقاطع و لوله | 20 | 1 |
| fa | `FABRICATION_TO_DRAWING` | ساخت قطعات طبق نقشه | 30 | 1 |
| en | `SHEET_PROCESSING` | Sheet Processing | 10 | 1 |
| en | `LONG_PRODUCTS_PROCESSING` | Rebar, Sections & Pipe Processing | 20 | 1 |
| en | `FABRICATION_TO_DRAWING` | Fabrication to Drawing | 30 | 1 |
| ar | `SHEET_PROCESSING` | فرآوری ورق | 10 | 1 |
| ar | `LONG_PRODUCTS_PROCESSING` | فرآوری میلگرد، مقاطع و لوله | 20 | 1 |
| ar | `FABRICATION_TO_DRAWING` | ساخت قطعات طبق نقشه | 30 | 1 |

All `source_updated_at` = `2026-09-18T20:31:28.000Z`, matching the upstream `updated_at`. Stable string codes stored as identity — no Odoo integer IDs, as the schema requires.

**Finding — the Arabic locale is serving Persian text.** The `ar` rows carry Persian strings identical to `fa`. This is **upstream**, not a sync defect: `GET /api/v1/processing/groups?locale=ar` returns those Persian names directly from Odoo, and the identical `etag_fa`/`etag_ar` content hashes confirm the two responses are byte-identical. The website faithfully stored what the API returned. **Arabic translations are missing in Odoo and need to be authored there**; no website-side change can fix it, and none was attempted.

---

# HEADER VERIFICATION

Live against `https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev`, post-sync. The Services entry is now a genuine disclosure, not the empty-state plain link:

```html
<button type="button" aria-expanded="false" aria-controls="_R_aai_"
        aria-label="More service navigation" …>
<li><a href="/services" …>Sheet Processing</a></li>
```

Desktop dropdown items rendered server-side, per locale:

| Locale | Count | Items |
| --- | --- | --- |
| `/` (fa) | **3** | فرآوری ورق · فرآوری میلگرد، مقاطع و لوله · ساخت قطعات طبق نقشه |
| `/en` | **3** | Sheet Processing · Rebar, Sections & Pipe Processing · Fabrication to Drawing |
| `/ar` | **3** | فرآوری ورق · فرآوری میلگرد، مقاطع و لوله · ساخت قطعات طبق نقشه (upstream gap above) |

The mobile drawer renders the same three per locale with locale-prefixed hrefs (`/en/services`). Ordering follows `sequence` (10/20/30) as the repository query specifies. Every item links to `/services` — no `/services/<slug>` route exists yet (deliberately deferred, `SiteHeader.tsx:115`); none was fabricated.

*Measurement note:* an earlier pre-sync check reported "1" for `grep -c 'href="/services"'`. That counted **lines**, and the page is a single line — the conclusion (empty state) was right, but the metric was not. Counts above are per-element.

---

# CATALOG SIDE EFFECT (accepted, recorded)

Enabling this cron necessarily also starts incremental Catalog sync on staging: the `0 */3 * * *` branch runs both jobs, by design — Processing sync piggybacks on the already-registered trigger rather than claiming its own, to stay under the 5-trigger cap. Separating them would mean changing sync logic, which was out of scope.

Observed, as expected and harmless:

| | Before | After |
| --- | --- | --- |
| `catalog_products` | 16 | **16** |
| `product_variants` | 256 | **256** |
| `catalog_sync_state.last_success_at` | 2026-09-18T10:43:06.126Z | 2026-09-19T09:00:51.309Z |
| `catalog_sync_state.consecutive_failure_count` | 0 | 0 |

The catalog job ran and succeeded 1.2s after the Processing job, changing no catalog data — staging was already in sync with upstream. Both write only to this environment's own bound `DB_PUBLIC`.

---

# PRODUCTION NON-IMPACT VERIFICATION

| Check | Result |
| --- | --- |
| Production Worker version | `b07d8697-620c-485c-8fed-21b893ab602c` — **unchanged** (still 2026-09-03T19:00:48Z) |
| Production cron triggers | `["0 */3 * * *","30 2 * * *","*/5 * * * *"]` — **unchanged** |
| Production `DB_PUBLIC` | 6 migrations, latest `0006_route_redirects_308.sql`, last applied 2026-09-03 18:59:03 — **unchanged** |
| Production `DB_OPS` | 4 migrations, latest `0004_rfq_contacts_phone_iso2.sql` — **unchanged** |
| `public_processing_groups` in production | **does not exist** — production stops at migration 0006; the table was never created there |
| Production config in `wrangler.jsonc` | not modified — diff confined to lines 274–305 |
| Production deployment | none |
| `https://www.ahanassa.com/` | `200`, unchanged |
| Odoo | read-only `GET` on the public Processing endpoint; no write, no code change |

Production cannot be reached by this work: it is a physically separate Worker with its own D1 bindings, and it does not even carry the Processing schema.

---

# NEXT STEP

Author the **Arabic translations for the three Processing Groups in Odoo**, so `GET /api/v1/processing/groups?locale=ar` stops returning Persian text. The next staging cron run (11:00Z, or any run after the upstream text changes — the stored ETag makes unchanged runs a cheap 304) will pick them up automatically with no website change.

Separately, and requiring its own authorization: production still lacks migrations `0007`–`0010` and the Processing code, so enabling Processing Services on production is a distinct future task, not a follow-on from this one.
