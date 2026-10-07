# v11 release path — W9.1 report: prepared ledger rows and evidence

- **Date:** 2026-10-06.
- **Policy:** `RELEASE_POLICY.md` §20 (owner decision D-DAR-063, `docs/OWNER_DECISIONS.md`); closes `DOCUMENT_AUDIT_REPORT.md` DAR-063 (policy).
- **Nothing here is appended to the ledger.** This report prepares the rows. The owner appends them to `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` on `feat/v11-static-site` in one row-only commit, after the steps in §4.

## 1. What serves `www.ahanassa.com` (verified 2026-10-06)

The SHA comes from the artifact, not from a report.

| Evidence | Value |
|---|---|
| Static Worker deployments (`wrangler deployments list --name ahanassa-v11-static-production`) | Latest deployment `2026-10-05T19:22:27Z`, `22d0015a-91a8-40ce-b992-d6dab608b2ae` at 100%. No later deployment. |
| Run `37357572054`, `publish-state.production.json` (artifact `production-prep-evidence-37357572054`) | `deployed_worker_version_id` `22d0015a-91a8-40ce-b992-d6dab608b2ae`; `previous_worker_version_id` `1cdb8cd9-485e-41d4-933b-b468d64a0e1b`; `snap-2026100518400900`; steps up to `finalized` |
| Run `37357572054`, `artifact-production/manifest.json` | **`code_sha` `d4f57f6169735446e7e6d2284607ada8781f883e`**, `environment` production, `snapshot_version` `snap-2026100518400900` |
| `https://www.ahanassa.com/manifest.public.json` | `snap-2026100518400900`; sha256 identical to the run's `artifact-production/public-assets/manifest.public.json` (`de4f24a2…e886`) |
| CONTENT_REBUILD decision of that run | `REFUSED (CODE_SHA_MISMATCH)` against `f2202ab…`, i.e. a code release |

## 2. Why `d4f57f6` is history only

`d4f57f6` predates the post-cutover configuration commit `785b532`.

| | `d4f57f6` (serving www) | application branch tip (≥ `0989899`) |
|---|---|---|
| `workers/static/wrangler.jsonc` env `production` (resolved with `wrangler`'s config reader) | `workers_dev: true`, **no routes** | `workers_dev: false`, `routes: [{ pattern: "www.ahanassa.com", custom_domain: true }]` |
| `scripts/content/publish.ts` production smoke URL | `https://ahanassa-v11-static-production.….workers.dev` (disabled since W8.1) | `https://www.ahanassa.com` |
| RFQ health URL used by the smoke | workers.dev | `https://api.ahanassa.com/healthz` |

**What a scheduled `AUTO` build of `d4f57f6` would do:**
- deploy the pre-cutover configuration, re-enabling workers.dev (this reverses D-WORKERSDEV);
- smoke the wrong host.

**Decision (owner, 2026-10-06):** record `d4f57f6` as `SUPERSEDED` history. The first v11 `STABLE_100` is a post-cutover SHA released through §20.

## 3. Prepared rows

The column mapping is `RELEASE_POLICY.md` §20.3. The 12-cell format matches the strict validator `lib/ci/release-ledger.ts#resolveBaseProductionShaFromManifest`: full lowercase SHA, a known `RELEASE_STATE`, `FINAL_RISK` `HIGH`.

### 3a. `d4f57f6` — history (`SUPERSEDED`)

Append this row only after the post-cutover release (§3b) serves `www.ahanassa.com`. Put it in the same commit as §3b, directly above it.

```
| `d4f57f6169735446e7e6d2284607ada8781f883e` | `22d0015a-91a8-40ce-b992-d6dab608b2ae` | SUPERSEDED | 100 | `37357572054` | `37357572054` | - | `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` | HIGH | PASS | 2026-10-05T20:07:24Z | v11 static, W8.1 cutover release, history only (RELEASE_POLICY.md §20.3; owner decision 2026-10-06). Published by content-publish.yml run 37357572054 with production-v11 approval (snapshot snap-2026100518400900; previous static version 1cdb8cd9-485e-41d4-933b-b468d64a0e1b never served www). www.ahanassa.com custom domain moved from the legacy Worker ahanassa-production to ahanassa-v11-static-production at 2026-10-05T20:07:24Z by an owner-authorized manual switch, so there is no PROMOTION_RUN_ID. ROLLBACK_VERSION_ID is the legacy Worker version that served www before the switch. Not STABLE_100: predates the post-cutover config 785b532 (workers_dev true, no www route, workers.dev smoke). Observation: ops-health production no ALERT from 2026-10-05T20:19Z to 2026-10-06T09:50Z, gaps in V11_RELEASE_PATH_W9_1_REPORT.md. Superseded by the v11 STABLE_100 row below. |
```

### 3b. Post-cutover release — `STABLE_100` (template; values from the release run)

```
| `<RELEASE_SHA>` | `<WORKER_VERSION_ID>` | STABLE_100 | 100 | `<RUN_ID>` | `<RUN_ID>` | `<RUN_ID>` | `<ROLLBACK_VERSION_ID>` | HIGH | PASS | <TIMESTAMP> | v11 static release (RELEASE_POLICY.md §20). Published by content-publish.yml run <RUN_ID> (target=production-prep, production-v11 approval; snapshot <SNAPSHOT_VERSION>). PROMOTION_RUN_ID = that run (§20.3 substitute). Observation <OBSERVATION_STARTED_AT> to <OBSERVATION_ENDED_AT>: ops-health production <N> runs, no ALERT, gaps <none or list with coverage>. Owner attestation <OBSERVATION_OWNER>, <date>. |
```

| Placeholder | Source |
|---|---|
| `<RUN_ID>` | the `content-publish.yml` run id (staging, production and promotion are the same run) |
| `<RELEASE_SHA>` | `jq -r .code_sha artifact-production/manifest.json` from artifact `content-<snapshot>` of that run. **Never the branch HEAD.** |
| `<WORKER_VERSION_ID>`, `<ROLLBACK_VERSION_ID>` | `deployed_worker_version_id` / `previous_worker_version_id` in `publish-state.production.json` (artifact `production-prep-evidence-<RUN_ID>`). `<ROLLBACK_VERSION_ID>` is expected to be `22d0015a-91a8-40ce-b992-d6dab608b2ae` |
| `<TIMESTAMP>` | completion time of the production job's "Switch production active_version" step |
| `<SNAPSHOT_VERSION>` | the same manifest's `snapshot_version` |

**Check before the commit:**

```
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {resolveBaseProductionShaFromManifest as r} from './lib/ci/release-ledger.ts'; console.log(r(readFileSync('docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md','utf8')))"
```

It must print `ok: true` and `releaseSha` = `<RELEASE_SHA>`. Run `git diff` on the commit: it must show exactly two added lines in that file, at the bottom of the "Ledger (RELEASE_POLICY.md schema)" table, and no other change.

## 4. Order (owner)

1. **Merge** the W9.1 R1 PR (this report, §20, DAR-063, D-DAR-063/D-SCHEDULE/D-PRICE/D-ARTICLES).
2. **Pre-check (D-DAR-063 follow-up a)**, with the tip SHA to be released. Stop if any item fails:
   - **Resolved config:** run `node --input-type=module -e "import {unstable_readConfig as r} from 'wrangler'; const c=r({config:'workers/static/wrangler.jsonc',env:'production'}); console.log(c.name,c.workers_dev,JSON.stringify(c.routes))"` at the tip. It must print `ahanassa-v11-static-production false [{"pattern":"www.ahanassa.com","custom_domain":true}]`.
   - **Live binding before:** with a read-capable token, `GET /accounts/<id>/workers/domains?hostname=www.ahanassa.com` must show domain id `ba00a81a…` and service `ahanassa-v11-static-production`. `GET /accounts/<id>/workers/scripts/ahanassa-v11-static-production/subdomain` must show `enabled: false`.
   - **What the deploy will send:** in CI (no TTY) `wrangler deploy` sends `PUT /accounts/<id>/workers/scripts/ahanassa-v11-static-production/domains/records` with `override_scope: true` and exactly the one origin `www.ahanassa.com`. That is the same set as today.
   - **Token permissions:** before writing the custom domain, `wrangler deploy` reads `GET /zones?name=…` and `GET /zones/<zone>/workers/routes`. The token in `production-v11` (`V11_PRODUCTION_CLOUDFLARE_DEPLOY_TOKEN`) must therefore also have **Zone: Read** and **Workers Routes: Read** (or Edit) on `ahanassa.com`. If it does not, the deploy fails after the version upload and the job's automatic rollback redeploys `22d0015a`.
3. **Dispatch (D-DAR-063 follow-up b)** on **Wednesday 15 Mehr 1405 (2026-10-07) in the morning**, with the owner present:
   - Run `gh workflow run content-publish.yml --ref main -f target=production-prep` and approve the `production-v11` environment.
   - Keep the rollback ready: `npx wrangler versions deploy 22d0015a-91a8-40ce-b992-d6dab608b2ae@100 --name ahanassa-v11-static-production --yes`, plus the publication pointer back to `snap-2026100518400900` (`node scripts/content/publish.ts rollback --work <dir> --env production` with that run's `publish-state.production.json`).
   - After the run, repeat the live binding read: same domain id `ba00a81a…`, same service, workers.dev `enabled: false`.
4. **Observe 24 h** (§20.2). The window ends on Thursday 2026-10-08 in the morning, before Saturday.
5. **Append §3a + §3b** in one row-only commit on `feat/v11-static-site`.

## 5. Observation evidence for `d4f57f6` (history)

The window runs from the switch at 2026-10-05T20:07:24Z. Runs counted: `ops-health.yml` job `health (production-prep)`. The full list is in the W9.1 result evidence, `r1-ops-health-jobs.tsv` and `r1-ops-health-timeline.txt`.

- **56 production health jobs succeeded** from 2026-10-05T20:20:19Z to 2026-10-06T09:50:01Z, with **0 failed (0 ALERT)**. Sample run `37443875464`: "✅ no alert" (cron silent OK, 0 undelivered, 0 exceededCpu, intake 5xx 0, Odoo 200).
- **Gap 1:** 2026-10-05T20:04Z–21:05Z.
  - Runs `37367461384`, `37370615386` and `37372134419` were cancelled by the GitHub Actions incident.
  - The successful runs at 20:19Z and 21:04Z cover this period through their analytics windows (each window starts at the previous completed run).
  - The W8.1 local runs at 20:07–20:38Z (same code) reported no alert.
- **Gap 2: not covered.** No completed run since 2026-10-06T09:50Z.
  - Run `37445662823`'s `health (staging)` job has been `waiting` on environment `staging` since 09:49:57Z (no reviewers, wait timer 0).
  - The `ops-health-staging` concurrency group therefore holds every newer run, and each is cancelled when the next one arrives.
  - The first completed run after the stuck run is cancelled will cover the gap. Its window reaches back to its predecessor, capped at 24 h.
- **Scope note:** ops-health production does not measure the static Worker's own responses (www 5xx). The W8.1 watch did, for 31 minutes: 0 × 5xx. For the §3b attestation, the owner should also look at zone analytics for `www.ahanassa.com` 5xx over the window.
