# Production Deployment Manifest

**Purpose:** a single, append-only, running ledger of every real `deploy-production.yml` release — the "lookup, not archaeology" record `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §10 calls for, since this repository has zero git tags today.

**Formalized by `docs/release/RELEASE_POLICY.md` §3/§4** (`POLICY_BOOTSTRAP`, see `docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md`). This file remains the one authoritative ledger — it is not replaced. Two tables now exist here, deliberately kept separate rather than merged, per the append-only rule ("do not silently rewrite historical rows"):

- **§Ledger (legacy format)** — the original table, byte-for-byte unchanged since it was first written. Left exactly as-is.
- **§Ledger (RELEASE_POLICY.md schema)**, below — the same underlying facts, re-presented in the column shape `lib/ci/release-ledger.ts#parseLedgerTable` and `RELEASE_POLICY.md` §3 require. Every future row is appended **only** to this table; the legacy table is frozen and gains no further rows.

## Bootstrap status (`RELEASE_POLICY.md` §4)

`BASE_PRODUCTION_SHA` resolution requires a ledger row marked `STABLE_100` with a proven `RELEASE_SHA`. Bootstrap searched every existing release report for the release SHA of `b07d8697-620c-485c-8fed-21b893ab602c` — the Worker Version serving 100% of production immediately before the current canary began (created `2026-09-03T19:00:45.838Z`, confirmed a "pure code upload" per `docs/release/PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`).

**No document in this repository states the exact commit SHA deployed as `b07d8697-…`.** Every reference to it (`docs/release/PRODUCTION_CLOUDFLARE_DEPLOYMENT_READINESS_AUDIT.md`, `docs/release/PRODUCTION_RELEASE_PIPELINE_READINESS_AUDIT.md`, `docs/CICD_STAGING_FIRST_GITHUB_ACTIONS_DEPLOY_REPORT.md`, and others) cites only its Worker Version ID and creation timestamp, never a `commit <sha>` pairing — unlike the earlier version `878a1e82-…`, which `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §24 explicitly ties to commit `6926aaa`. The Cloudflare Version itself carries neither a Tag nor a Message. `docs/release/PRODUCTION_CLOUDFLARE_DEPLOYMENT_READINESS_AUDIT.md`'s "Gaps" table claims this SHA is "recorded only in prose, in a Stage-1 report" — re-checked directly this task (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` in full, plus every other doc matching `b07d8697`) and that claim does not hold: no such prose exists anywhere in this repository. Matching it to a commit by timestamp proximity alone would be exactly the kind of guess `RELEASE_POLICY.md` §4 forbids.

Per `RELEASE_POLICY.md` §4, this fails closed:

```
BOOTSTRAP_STABLE_SHA_UNRESOLVED
```

**No `STABLE_100` row exists in the ledger today.** `BASE_PRODUCTION_SHA` for a hypothetical next release is therefore also unresolved (`BASE_PRODUCTION_SHA_UNRESOLVED`, `lib/ci/release-ledger.ts#resolveBaseProductionSha`) — deterministic and correct given the evidence, not a defect in the resolver. The currently live 10/90 split is recorded below as `LEGACY_IN_FLIGHT_RELEASE` (`RELEASE_POLICY.md` §17), not `STABLE_100` — an in-flight canary must never substitute for a proven stable baseline. **This resolves itself the first time the future `promote-production.yml` (`RELEASE_POLICY.md` §11) promotes the current canary (deployed SHA `f2202ab5…`, a SHA this repository DOES have deterministic evidence for — captured live by `deploy-production.yml`'s own `DEPLOYED_SHA` step) to 100%: that promotion appends the first real `STABLE_100` row, and `f2202ab5…` becomes `BASE_PRODUCTION_SHA` for every release after it.** Until then, any release classification that needs `BASE_PRODUCTION_SHA` must fail closed rather than substitute a guess — this is a known, documented, self-resolving gap, not a blocker to be worked around.

What resolving this the "hard way" would require: an owner-confirmed statement of the exact commit that was built and uploaded as `b07d8697-…`, or new durable evidence this task did not find. Recorded as `DOCUMENT_AUDIT_REPORT.md` DAR-058.

## Ledger (RELEASE_POLICY.md schema)

| RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT | STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID | FINAL_RISK | RESULT | TIMESTAMP | NOTES |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` | `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` | LEGACY_IN_FLIGHT_RELEASE | 10 | `35532624537` | `35533626395` | - | `b07d8697-620c-485c-8fed-21b893ab602c` | - | PASS | 2026-09-20T19:53:09Z | Not yet promoted (10% in flight). FINAL_TRAFFIC_PERCENT/RESULT reflect the official verification-only gate (`PRODUCTION_10_PERCENT_OFFICIAL_VERIFICATION_REPORT.md`), not `deploy-production.yml`'s own inline smoke gate, which FAILED on a documented harness defect unrelated to the release (see legacy table below). FINAL_RISK is `-`: this release predates `RELEASE_POLICY.md` and was never machine-classified. |

No `STABLE_100` row exists yet — see "Bootstrap status" above. The next row appended to this table must be the future promotion workflow's `STABLE_100` record for this same release, once it exists.

## Ledger (legacy format)

**Frozen — no further rows are appended here.** Preserved verbatim as the original record this table was seeded from.

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
