# Production Deployment Manifest

**Purpose:** a single, append-only, running ledger of every real `deploy-production.yml` release — the "lookup, not archaeology" record `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §10 calls for, since this repository has zero git tags today.

**Append-only.** Add one new row per real production release, oldest first, at the bottom of the table below. Never edit or remove an existing row. This file is never written to by the workflow itself (`deploy-production.yml` is never granted `contents: write` — see `docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md`); a row is appended as a separate, human-reviewed documentation commit after the run completes, using the exact values the run's own job summary and uploaded evidence artifact (`production-release-evidence-<run_id>.json`) already recorded.

## How to append a row

After a real `deploy-production.yml` run completes (success or failure past Phase 2), copy the values from that run's job summary / evidence artifact into a new row:

| Column | Source |
| --- | --- |
| Date (UTC) | `deployed_at` |
| Deployed SHA | `deployed_sha` |
| New Worker Version ID | `new_version_id` |
| Previous Worker Version ID (rollback target) | `previous_version_id` |
| Rollout % | `rollout_percentage` |
| Staging provenance run | `staging_provenance_run` (a Deploy Staging run ID, or `SKIPPED` if `skip_staging_provenance` was used — which must also be justified in the Notes column whenever it appears) |
| Workflow run | the `deploy-production.yml` run ID/URL |
| Smoke result | `PASSED (10/10)` or `FAILED (n check(s))` from the run's own smoke-gate step |
| Notes | anything not captured above — e.g. a `skip_staging_provenance` justification, a post-release rollback, a known pre-existing catalog/empty-state condition |

## Ledger

| Date (UTC) | Deployed SHA | New Worker Version ID | Previous Worker Version ID | Rollout % | Staging provenance run | Workflow run | Smoke result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-20T19:53:09Z | `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` | `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` | `b07d8697-620c-485c-8fed-21b893ab602c` | 10 | `35532624537` | [`35533626395`](https://github.com/rezachidotnet/ahanassa-website/actions/runs/35533626395) | FAILED (gate aborted mid-suite at S5; 9/23 assertions executed, 0 failed) | **First real production release.** Canary held at 10%; NOT promoted to 100%. The smoke-gate failure is a harness defect, not an application regression: under GitHub's default `bash -e`, S5's `SLUG=$(grep ... )` aborts the step when a locale's catalog is legitimately empty (production `en`/`ar`), before the empty-catalog branch can run. Independent re-execution of the identical suite against production passed 23/23. A1/A2/A3 all PASS; staging provenance verified; no rollback performed; no migration applied; no secret or Environment-protection change. Full detail: `docs/release/FIRST_PRODUCTION_10_PERCENT_CANARY_REPORT.md`. |
