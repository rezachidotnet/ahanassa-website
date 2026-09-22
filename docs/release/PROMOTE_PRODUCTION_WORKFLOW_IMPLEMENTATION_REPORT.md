# Promote Production Workflow — Implementation Report

Designs, implements, tests, and registers `.github/workflows/promote-production.yml` — the dedicated workflow that promotes an already-verified production canary Worker Version from its current split to 100% without uploading a new Worker Version. Per `docs/release/RELEASE_POLICY.md` §11 (the contract this implements) and this task's explicit scope: **no production mutation occurs in this task.**

---

## Precondition re-verification (fresh, this task)

```
PR8_MERGED: YES (merge commit a29fec0)
POLICY_COPIES_BYTE_IDENTICAL: YES (main <-> feat/header-hero-integrated, re-diffed post-merge)
POLICY_LIFECYCLE: BOOTSTRAP_MERGED
R3_CLOSED_AND_REGISTERED: YES (all three workflow files present on origin/main, R3 sync commits in main's history)
PRODUCTION_TRAFFIC: 10/90 (live-verified — canary 10%, stable 90%, same deployment record as before, unchanged)
OFFICIAL_VERIFICATION: PASSED (23/23) — re-confirmed by re-downloading its own evidence artifact this task
NEW_WORKER_VERSION_SINCE_VERIFICATION: NO (same deployment event, same Worker Version list)
```

All seven preconditions passed; implementation proceeded.

---

## Result

```
RESULT: PASS
WORKFLOW: .github/workflows/promote-production.yml
WORKFLOW_DISPATCH_ONLY: YES
PRODUCTION_ENVIRONMENT_REQUIRED: YES
UPLOADS_NEW_WORKER_VERSION: NO
USES_EXISTING_CANARY_VERSION: YES
POSITIONAL_VERSION_SELECTION: NO
EVIDENCE_BINDING: PASS
OBSERVATION_GATE_IMPLEMENTED: YES
OWNER_PROMOTION_APPROVAL_REQUIRED: YES
DETERMINISTIC_ROLLBACK_TARGET: YES
POST_PROMOTION_SMOKE_BLOCKING: YES
LEDGER_STABLE_100_EVIDENCE_EMITTED: YES
PROMOTION_POLICY_ENFORCEMENT_ACTIVE: YES
GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: NO
```

---

## Design summary

Eleven required inputs (`confirm`, `release_sha`, `canary_version_id`, `stable_version_id`, `expected_canary_percent`, `expected_stable_percent`, `verification_run_id`, `observation_started_at`, `observation_ended_at`, `observation_owner`, `observation_attestation`) — none with a default that would let promotion proceed silently. `expected_canary_percent`/`expected_stable_percent` are free integer inputs (validated to sum to 100), not hardcoded to `10`/`90` — the same workflow can promote a future 50/50 HIGH-release canary without modification.

**Zero build, zero upload.** No `npm ci`, no `npm run build`, no `wrangler versions upload`, no `vinext-cloudflare deploy`. The workflow checks out only its own commit (`github.sha`, never `release_sha` — mirroring `verify-production.yml`'s discipline exactly) for `wrangler.jsonc`, `migrations/`, and `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`. The one Cloudflare-mutating command in the entire file is `wrangler versions deploy "$CANARY_INPUT@100" --config wrangler.jsonc --env production` — a single version-spec, no upload, matching `deploy-production.yml`'s own established `rollout_percentage=100` shape (one spec, complementary version implicitly drops to 0%). This command shape was verified against **real production state** via `wrangler versions deploy ... --dry-run` this task (§"Phase 15" below) — genuinely read-only, confirmed by the dry-run's own "exiting" without executing.

**Fail-closed evidence binding chain** (`RELEASE_POLICY.md` §11, this task's Phase 4), five independent bindings before any live Cloudflare read:
1. `release_sha` is a real commit (`gh api .../commits/$SHA`).
2. `canary_version_id` matches a real `production-release-evidence-*` artifact's `new_version_id`.
3. That artifact's `deployed_sha` matches `release_sha`.
4. That artifact's `previous_version_id` matches `stable_version_id`.
5. That artifact's `staging_provenance_run` is a real run id, never `"SKIPPED"`.
6. `verification_run_id` is a real, successful `Verify Production` run (workflow id `363097410`, a permanent structural identifier — not a per-release one, same category as `deploy-production.yml`'s existing hardcoded `Deploy Staging` workflow id `361701517`).
7. That run's own `production-verification-evidence-<run_id>` artifact names the SAME `release_sha`/`canary_version_id`/`stable_version_id`/traffic split and a `smoke_result` starting with `PASSED`.
8. The release ledger (`docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`, parsed by the real, tested `lib/ci/release-ledger.ts#parseLedgerTable` — imported directly at runtime via `node --experimental-strip-types`, never reimplemented in bash) has exactly one row for `release_sha`, in a promotable `RELEASE_STATE` (`LEGACY_IN_FLIGHT_RELEASE` or `CANARY_ACTIVE` — never `ROLLED_BACK`/`SUPERSEDED`/already-`STABLE_100`), whose `ROLLBACK_VERSION_ID` matches `stable_version_id`.

**Legacy exception, not a classifier retrofit** (Phase 5): the workflow never invokes `lib/ci/release-risk-classifier.ts`. The ledger-state check above recognizes exactly two `RELEASE_STATE` values as promotable — `LEGACY_IN_FLIGHT_RELEASE` (today's one-time exception) and `CANARY_ACTIVE` (a future HIGH release's canary, once the classifier's own release path produces one) — there is no separate, permanent bypass; both states are the same two the workflow has always recognized.

**Live topology, position-independent** (Phase 7): matches `verify-production.yml`'s proven V3 technique exactly — `.[-1]` picks the newest deployment EVENT (an ordering guarantee), then every role is matched by explicit `version_id` equality, never `.versions[0]`/`.versions[1]`/first/last/latest/oldest. Grep-verified: neither literal appears anywhere in the file.

**Observation gate** (Phase 6): `observation_started_at`/`observation_ended_at` parsed and compared (`ended >= started`), `observation_owner` required non-empty, `observation_attestation` must equal exactly `"OBSERVATION_CONFIRMED_SAFE_TO_PROMOTE"` — no other value accepted, no default. No numeric minimum duration is asserted (`RELEASE_POLICY.md` §12, `MINIMUM_OBSERVATION_DURATION = TBE`), but the explicit attestation is unconditionally required.

**No break-glass, no bypass, no skip flag** (Phase 3): unlike `deploy-production.yml`'s `skip_staging_provenance`, this workflow has zero inputs that relax any assertion.

**Post-promotion verification independent of the promoting command's own exit code**: re-reads live deployments/versions/secrets/D1/Environment state and asserts canary@100, stable not traffic-bearing, no third version, the Worker Version *list* unchanged (zero-upload proof at the live-state level, not just a static text check), D1 migration parity unchanged, secret list unchanged, GitHub Environment protection unchanged.

**Smoke gate**: the exact `deploy-production.yml`/`verify-production.yml` S1–S10 suite, spliced in byte-for-byte (not retyped — extracted and re-inserted programmatically to guarantee identity, then verified by a new three-way `lib/ci/production-smoke-harness.test.ts` test). On failure, prints the exact rollback command and fails the run — **no automatic rollback**, matching `RELEASE_POLICY.md`'s current silence on mandating one (Phase 11's explicit instruction).

**Ledger evidence, no `contents: write`**: the workflow never commits. It emits a `STABLE_100` row (`RELEASE_SHA`, `WORKER_VERSION_ID`, `RELEASE_STATE=STABLE_100`, `FINAL_TRAFFIC_PERCENT=100`, `STAGING_RUN_ID`, `PRODUCTION_RUN_ID`, `PROMOTION_RUN_ID=github.run_id`, `ROLLBACK_VERSION_ID=stable_version_id`, `FINAL_RISK=LEGACY_IN_FLIGHT_RELEASE`, `RESULT=PASS`, `TIMESTAMP`) as a job-summary table and a `production-promotion-evidence-<run_id>` artifact — appending it to the ledger remains a separate, human-reviewed documentation commit, exactly like every other production workflow's evidence in this repository.

---

## Phase 13 — release-time policy enforcement, precisely scoped

```
PROMOTION_POLICY_ENFORCEMENT_ACTIVE: YES
GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: NO
```

`promote-production.yml` enforces its OWN promotion contract at release time — every check in the "fail-closed evidence binding chain" above genuinely runs and genuinely blocks a real dispatch. That is real, active enforcement, scoped to this one workflow's own narrow decision ("is this specific promotion allowed to proceed").

**This is not the same claim as `RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE` in `RELEASE_POLICY.md` §0.1**, which asks whether the general-purpose LOW/MEDIUM/HIGH classifier (`lib/ci/release-risk-classifier.ts`) is consulted by `deploy-staging.yml`/`deploy-production.yml` to gate an ARBITRARY future release's path. It is not — this task did not touch either of those workflows, and `promote-production.yml` itself never invokes the classifier either (Phase 5). `docs/release/RELEASE_POLICY.md` §0.1 is **not** updated to claim global enforcement is active; only this report's own, narrower `PROMOTION_POLICY_ENFORCEMENT_ACTIVE` field claims what this workflow specifically does.

---

## Tests

```
TEST_RESULTS: 1499/1499 passing, 0 failing (36 new: 34 in lib/ci/promote-production-workflow.test.ts, 2 in lib/ci/production-smoke-harness.test.ts; lib/ci/workflow-invariants.test.ts modified in place — 38/38 still passing, 0 removed; 1463 pre-existing tests elsewhere unaffected)
TYPECHECK: PASS (npx tsc --noEmit — clean)
```

Coverage against the 35 required scenarios (`lib/ci/promote-production-workflow.test.ts` unless noted):
- 1–14: static shape checks (`validatePromoteProductionWorkflowShape`) against the real file, each also proven by a targeted mutation test for the highest-risk subset (confirm literal, SHA format, observation ordering, attestation literal, verification-workflow-id binding).
- 15–21: `TOPOLOGY CHECK` block extracted verbatim and executed under real `bash -e` with synthetic fixture JSON (`SYN_CANARY`/`SYN_STABLE`/`SYN_THIRD` — never a real identifier), including reversed-array-order and exactly-one-live-version edge cases.
- 22: static — `.versions[0]`/`.versions[1]` absent anywhere in the file, plus a mutation test proving reintroduction is caught.
- 23–24: static — no `wrangler versions upload`/`vinext-cloudflare deploy`/bare `wrangler deploy`/`npm ci`/`npm run build`/`vinext build`, each with a mutation test.
- 25–26: static — the single-spec `canary@100` deploy command; `rollback_version_id` exposed as `stable_version_id` in both job outputs and the evidence payload.
- 27–28: `POST-PROMOTION CHECK` block extracted and executed the same way, covering the accepted 100/0 state and three distinct rejected states (wrong canary percent, stable still traffic-bearing, unexpected third version).
- 29–32: static — no `d1 migrations apply`/`d1 execute`, no `wrangler secret put/bulk/delete` (with a mutation test proving a reintroduced `secret put` is caught; `workflow-invariants.test.ts`'s shared `PRODUCTION_MUTATING_COMMANDS` list was narrowed from a bare `wrangler secret` match to `wrangler secret (put|bulk|delete)` specifically to allow the legitimate read-only `wrangler secret list` this workflow needs — verified this narrowing does not affect `deploy-production.yml`/`verify-production.yml`, neither of which uses `wrangler secret` at all), no `-X PATCH/PUT/DELETE` against the Environment endpoint.
- 33: static — no skip/bypass/break-glass-named input; the smoke gate's actual failure→exit-1 branch is present (a mutation test proves a weakened branch is caught, distinguishing it from the unrelated `SMOKE_RESULT`-computation `if` block that shares the same condition text).
- 34: static — evidence payload and job-summary table both carry `RELEASE_STATE=STABLE_100`/`FINAL_TRAFFIC_PERCENT=100`.
- 35: static — the workflow file (excluding the byte-identical smoke-script block, which legitimately carries one accepted historical reference already present in `deploy-production.yml`'s own comments — see the test's own annotation) and the test file itself (excluding the blocklist's own declaration) are both scanned against a blocklist of every real identifier from the current release; zero hits in either.

`lib/ci/workflow-invariants.test.ts` was extended (not replaced) with a third named exception, `promote-production.yml`, in the existing "only deploy-production.yml may deploy to production" test — narrower than `deploy-production.yml`'s own exception: it may reference production only while its sole mutating command remains `wrangler versions deploy`.

`lib/ci/production-smoke-harness.test.ts` was extended with a three-way byte-identity assertion (`deploy-production.yml` ⇔ `promote-production.yml`, alongside the pre-existing `deploy-production.yml` ⇔ `verify-production.yml` check) and an env-binding check (`NEW_VERSION_ID: inputs.canary_version_id`, `PREVIOUS_VERSION_ID: inputs.stable_version_id`).

All existing R3 (`lib/ci/production-version-role-discovery.test.ts`) and release-policy (`lib/ci/release-risk-classifier.test.ts`, `lib/ci/release-ledger.test.ts`, `lib/ci/emergency-rollback.test.ts`, `lib/ci/policy-bootstrap.test.ts`) test files were not modified and remain fully passing within the 1499 total.

---

## Phase 15 — read-only real-state dry evaluation

Performed against live, real production state and real GitHub evidence this task, using only read commands (`gh api` GETs, artifact downloads, `wrangler ... list`, and `wrangler versions deploy --dry-run`, which Cloudflare's own CLI confirms exits without deploying). No traffic changed, no version created.

| Step | Real result |
| --- | --- |
| Release evidence artifact (`production-release-evidence-10612087790`) | `new_version_id=4a32c5f9-…`, `deployed_sha=f2202ab5…`, `previous_version_id=b07d8697-…`, `staging_provenance_run=35532624537` (real, not `SKIPPED`), `workflow_run_id=35533626395` |
| Verify Production run (`35567845828`) | `workflow_id=363097410` ✅ matches the hardcoded structural constant; `conclusion=success` |
| Verification evidence artifact (`production-verification-evidence-35567845828`) | `release_sha=f2202ab5…`, `canary_version_id=4a32c5f9-…`, `stable_version_id=b07d8697-…`, `traffic_split="10/90"`, `verification_only=true`, `mutating_commands_issued="none"`, `smoke_result="PASSED (23/23)"` |
| Ledger evidence (`lib/ci/release-ledger.ts#parseLedgerTable` run directly via `node --experimental-strip-types` against the real `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`) | one row for `f2202ab5…`, `RELEASE_STATE=LEGACY_IN_FLIGHT_RELEASE` (promotable), `ROLLBACK_VERSION_ID=b07d8697-…` — matches the claimed stable version exactly |
| Live topology (`wrangler deployments list --env production --json`) | latest deployment unchanged since before this task: `4a32c5f9-…@10%` / `b07d8697-…@90%`, total 100%, no third version |
| `wrangler versions deploy "4a32c5f9-…@100" --config wrangler.jsonc --env production --dry-run --yes` | Cloudflare/wrangler resolved the exact intended target deterministically: "1 Worker Version(s) selected… 100% of traffic" for the canary, confirming `--config wrangler.jsonc --env production` (no build, no `dist/server/wrangler.json`) is sufficient for this command — then exited without deploying (`--dry-run: exiting`) |

```
REAL_STATE_DRY_EVALUATION: PASS
```

Every binding resolves deterministically, with zero ambiguity, against real evidence. The promotion target would be canary `4a32c5f9-…` at 100%; the rollback target would remain the current stable version, `b07d8697-…`. **Promotion was not executed.**

---

## Phase 16 — registration

```
APPLICATION_PR: https://github.com/rezachidotnet/ahanassa-website/pull/9 — chore/promote-production-workflow -> feat/header-hero-integrated, OPEN, NOT MERGED
REGISTRATION_PR: https://github.com/rezachidotnet/ahanassa-website/pull/10 — chore/register-promote-production-workflow -> main, OPEN, NOT MERGED
```

Implemented on `chore/promote-production-workflow`, branched from `feat/header-hero-integrated` (this repository's real application branch). Files: `.github/workflows/promote-production.yml`, `lib/ci/promote-production-workflow.test.ts` (new), `lib/ci/workflow-invariants.test.ts` and `lib/ci/production-smoke-harness.test.ts` (extended in place).

**Unlike the release-policy governance PRs (#6/#7/#8), this task DOES require a `main`-registration sync** — `promote-production.yml` is a new `workflow_dispatch`-only file, and GitHub Actions only lists a `workflow_dispatch` workflow in its dispatch UI/API if a copy exists on the repository's default branch (`main`), exactly the same reason R1–R3's workflow-file syncs existed. This is registration for GitHub Actions discovery, a different concern from the earlier `CLAUDE.md`/`RELEASE_POLICY.md` governance-discovery sync (PR #7), which existed for a Claude-Code-reads-`main` reason instead.

**Only the workflow file itself is synced to `main` — nothing else.** `lib/ci/release-ledger.ts`, `lib/ci/emergency-rollback.ts`, `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`, and every other helper this workflow consumes at runtime are **not** copied to `main`. This is correct, not an oversight: the production Environment's deployment branch policy restricts every real `promote-production.yml` dispatch to `feat/header-hero-integrated` (the same restriction already governing `deploy-production.yml`/`verify-production.yml`, `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`), so the workflow's OWN LOGIC that actually executes is always `feat/header-hero-integrated`'s copy, and its own checkout step (`github.sha`, no `ref:` override) always checks out that same branch's tree — which already has every helper file it needs. `main`'s copy of `promote-production.yml` exists purely so the dispatch UI/API can find and select it; it is never itself the copy that runs.

Registration branch `chore/register-promote-production-workflow`, created directly from `origin/main` (never from `feat/header-hero-integrated` — no unrelated-history merge), containing byte-for-byte only `.github/workflows/promote-production.yml`. Byte-identity verified before commit.

---

## Production mutation

```
PRODUCTION_WORKFLOW_DISPATCHED: NO
NEW_WORKER_VERSION_CREATED: NO
PRODUCTION_TRAFFIC_CHANGED: NO
D1_CHANGED: NO
```

No secret was read or modified beyond listing names (never values). No GitHub Environment protection was changed. The only Cloudflare command with mutation potential that ran this task was `wrangler versions deploy ... --dry-run`, which Cloudflare's own CLI proves never executes (confirmed: it printed the exact intended target state, then exited on its own `--dry-run: exiting` line without ever calling the mutating API).

---

## Readiness

```
READY_TO_MERGE_PROMOTION_WORKFLOW: YES — tests/typecheck clean, dry evaluation resolves with zero ambiguity against real evidence, no unresolved defect. Merge itself still requires explicit owner authorization, not granted by this task.
READY_FOR_REAL_100_PERCENT_PROMOTION: NO — the implementation/registration PRs are not yet reviewed or merged; this workflow does not exist in any dispatchable form yet.
```

---

## What was NOT done (explicit scope boundaries honored)

- `Deploy Production` was not dispatched.
- `Verify Production` was not dispatched.
- `promote-production.yml` was not dispatched (it does not yet exist on any branch GitHub can dispatch from).
- No Worker version was uploaded or deployed; production traffic remains exactly 10/90.
- No D1 migration was applied; no D1 mutation.
- No secret was modified.
- No GitHub Environment protection was changed.
- The current canary was not promoted to 100%; no rollback was executed.
- Neither the application PR nor the registration PR was opened or merged by the end of this report — see "Remaining actions."
- `01-sources/`, `logo/`, `design-reference/` untouched.
- The pre-existing uncommitted working-tree state from before this task (`PUSH_MANIFEST.md`, `docs/audit/`, `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`, `docs/review/`, modified `REPORT_BUNDLE_MANIFEST.txt`) remains deliberately uncommitted and out of every commit in this task.

---

## Remaining actions

1. ~~Open the application PR~~ — done: [PR #9](https://github.com/rezachidotnet/ahanassa-website/pull/9), `chore/promote-production-workflow` → `feat/header-hero-integrated`, `OPEN`/`MERGEABLE`, not merged.
2. ~~Open the registration PR~~ — done: [PR #10](https://github.com/rezachidotnet/ahanassa-website/pull/10), `chore/register-promote-production-workflow` → `main`, `OPEN`/`MERGEABLE`, not merged.
3. Review and merge both — **not performed by this task**.
4. Once merged, `promote-production.yml` becomes dispatchable. A real dispatch remains its own separate, explicitly-authorized future action — this task does not authorize it.
5. Wiring `RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE` to `YES` globally (the LOW/MEDIUM/HIGH classifier consulted by `deploy-staging.yml`/`deploy-production.yml` for an arbitrary future release) remains unbuilt and out of this task's scope.
6. After a real, separately-authorized promotion, append the emitted `STABLE_100` row to `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` as the usual human-reviewed documentation commit — that row becomes `BASE_PRODUCTION_SHA` for the next release (`RELEASE_POLICY.md` §2/§4), closing DAR-058.

---

## Post-registration addendum — 2026-09-22: first real dispatch failed closed (WORKFLOW_DEFECT)

PR #9 and PR #10 were subsequently merged (2026-09-22T07:43:36Z / 07:44:12Z), registering `Promote Production` as workflow `364025513`. The first real dispatch, run `35703109593`, **failed closed during evidence binding with zero production mutation**. Full incident analysis: `docs/release/FIRST_PRODUCTION_PROMOTION_ATTEMPT_FAILURE_REPORT.md`.

```
FAILED_STEP:                 Bind verification_run_id to a successful Verify Production run and its evidence
ROOT_CAUSE_CLASS:            WORKFLOW_DEFECT
PRODUCTION_MUTATION_OCCURRED: NO
TRAFFIC:                     10 / 90 (unchanged)
SECURITY_CHECK_WEAKENED:     NO
```

**Root cause.** The verification-evidence artifact lookup passed jq's `--arg` flag to `gh api`. `gh api` accepts exactly one positional (the endpoint) and has no `--arg` of its own, so `--jq` consumed the literal `"--arg"` as its query and the remaining tokens became extra positionals — the CLI aborted on argument count (`accepts 1 arg(s), received 4`) before issuing any HTTP request. A secondary consequence: under `set -euo pipefail` the failure propagated out of the `ARTIFACT_ID="$( … )"` assignment and aborted the step, making the step's own `if [ -z "$ARTIFACT_ID" ]` error branch unreachable for every failure of the lookup itself.

**Correction.** The `--arg` now goes to a real `jq` reading the API response from a file, and the `gh api` call is status-checked explicitly. The name is still passed as a jq `--arg` (never interpolated into the jq program), `select(.name == $n and .expired == false)` is byte-for-byte unchanged, and every downstream assertion is untouched — no evidence check was weakened, removed, or replaced with trust in operator input.

**Correction to this report's own claims.** The "Tests" and design sections above described the artifact-lookup step as covered; that coverage was **static only** — every shape assertion passed on the defective file because the defect was CLI argument syntax, not assertion logic. Eight new tests (36a–36h) close that gap, including `36d`, which reproduces `accepts 1 arg(s)` in-suite, and a class-level guard (`36a`) forbidding `--arg` on any `gh api` invocation anywhere in the workflow. `npm test`: 1507/1507. `npx tsc --noEmit`: exit 0. The corrected lookup was dry-evaluated read-only against the real verification run `35567845828` and its real evidence artifact — every assertion resolves PASS.

The fix ships as two further un-merged PRs — [#11](https://github.com/rezachidotnet/ahanassa-website/pull/11) (`fix/promote-production-verification-artifact-lookup` → `feat/header-hero-integrated`) and [#12](https://github.com/rezachidotnet/ahanassa-website/pull/12) (`fix/register-promote-production-artifact-lookup` → `main`). Until both merge, a re-dispatch runs the defective file. `READY_TO_RERUN_PROMOTION: NO`.

---

**End of `PROMOTE_PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md`. STOP — PR #9/#10 merged and the workflow registered, but its first dispatch failed closed on a workflow defect; the fix PRs are open and un-merged, promotion not re-run, production traffic unchanged at 10/90.**
