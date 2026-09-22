# First Production Promotion Attempt — Safe-Fail Incident Report

**Report date (UTC):** 2026-09-22
**Scope:** the first real dispatch of `.github/workflows/promote-production.yml`, intended to promote the existing, already-verified 10% production canary to 100%. The run failed closed during evidence binding. **No production mutation occurred.**
**Related:** `docs/release/RELEASE_POLICY.md` §11/§12/§17 (the promotion contract), `docs/release/PROMOTE_PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md` (the workflow this exercised), `docs/release/PRODUCTION_10_PERCENT_OFFICIAL_VERIFICATION_REPORT.md` (the verification evidence being bound), `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` (the ledger — unchanged, still carries no `STABLE_100` row).

---

## 1. Result summary

```text
RESULT:
SAFE_FAIL

FAILED_RUN_ID:
35703109593

FAILED_JOB_ID:
106665542501

FAILED_STEP:
Bind verification_run_id to a successful Verify Production run and its evidence

PRODUCTION_MUTATION_OCCURRED:
NO

ROOT_CAUSE_CLASS:
WORKFLOW_DEFECT

ROOT_CAUSE:
The verification-evidence artifact lookup passed jq's `--arg` flag to
`gh api`. `gh api` accepts exactly one positional argument (the endpoint)
and has no `--arg` flag of its own, so `--jq` consumed the literal string
"--arg" as its query and the remaining three tokens became extra
positionals. The GitHub CLI aborted on argument count with
`accepts 1 arg(s), received 4` before issuing any HTTP request.

FIX_REQUIRED:
YES

SECURITY_CHECK_WEAKENED:
NO

TRAFFIC:
10 / 90

READY_TO_RERUN_PROMOTION:
NO
until the root cause is corrected and separately reviewed.
```

---

## 2. Timeline (UTC)

| Time | Event |
| --- | --- |
| 2026-09-22T08:03:31Z → 08:06:33Z | Observation window (`RELEASE_POLICY.md` §12), owner `rezachidotnet`, attested. |
| 2026-09-22T08:07:33Z | `Promote Production` dispatched against `feat/header-hero-integrated` (workflow `364025513`, head SHA `66c5f93c3a23d329d9a9686310afec14b19058ad`). Run created in `waiting`. |
| 2026-09-22T08:07:4x Z | Run parked at the `production` GitHub Environment required-reviewer gate (`current_user_can_approve: true`, reviewer `rezachidotnet`). |
| 2026-09-22T08:47:14Z | Owner approval granted through the normal Environment review flow. Job started. |
| 2026-09-22T08:47:20Z | Step 7 (`Bind verification_run_id ...`) emitted `accepts 1 arg(s), received 4` and exited 1. |
| 2026-09-22T08:47:23Z | Job and run concluded `failure`, 9 seconds of execution. Steps 8–16 skipped. |

---

## 3. Step-level outcome — where the run stopped

Job `106665542501`, as reported by the GitHub API:

| # | Step | Result |
| --- | --- | --- |
| 1 | Set up job | success |
| 2 | Require explicit confirmation and well-formed inputs | success |
| 3 | Verify release_sha commit exists (pre-checkout, fail closed) | success |
| 4 | Checkout this workflow's own commit | success |
| 5 | A1: assert production target (read-only, fail closed) | success |
| 6 | Bind release_sha/canary/stable to recorded production-release-evidence | success |
| **7** | **Bind verification_run_id to a successful Verify Production run and its evidence** | **failure** |
| 8 | Bind release to ledger evidence | skipped |
| 9 | Assert live production topology matches expected pre-state | skipped |
| 10 | D1 migration parity (read-only, captured pre-promotion) | skipped |
| 11 | Capture GitHub Environment protection (read-only) | skipped |
| **12** | **Phase: shift traffic to 100%** | **skipped — never executed** |
| 13 | Post-promotion verification | skipped |
| 14 | Production smoke checks | skipped |
| 15 | Capture promotion evidence (STABLE_100 ledger row) | skipped |
| 16 | Upload production promotion evidence | skipped |

The only Cloudflare-mutating command in the entire workflow lives in step 12. It was never reached. Steps 1–6 are all read-only assertions and a checkout.

---

## 4. Root cause

### 4.1 The defective line

`.github/workflows/promote-production.yml`, in the `Bind verification_run_id ...` step:

```bash
ARTIFACT_ID="$(gh api "repos/${{ github.repository }}/actions/runs/$VERIFY_RUN_INPUT/artifacts" --jq --arg n "production-verification-evidence-$VERIFY_RUN_INPUT" '.artifacts[] | select(.name == $n and .expired == false) | .id' | head -n1)"
```

### 4.2 Why it fails

`--arg` is a **jq** flag. `gh api` has no `--arg` of its own — its only jq-related flag is `-q, --jq string`, which takes exactly one value, and the subcommand accepts exactly one positional argument (the endpoint). The tokens therefore parse as:

| Token | How `gh api` reads it |
| --- | --- |
| `repos/…/actions/runs/…/artifacts` | positional #1 — the endpoint |
| `--jq` | flag, consumes the next token as its value |
| `--arg` | **the value of `--jq`** (the jq query becomes the literal string `--arg`) |
| `n` | positional #2 |
| `production-verification-evidence-…` | positional #3 |
| `.artifacts[] \| select(…) \| .id` | positional #4 |

Four positionals where one is allowed, so the CLI aborts with its argument-count usage error **before any HTTP request is made**:

```text
accepts 1 arg(s), received 4
```

Reproduced verbatim outside CI, read-only, against the same real endpoint:

```text
$ gh api "repos/rezachidotnet/ahanassa-website/actions/runs/35567845828/artifacts" \
    --jq --arg n "production-verification-evidence-35567845828" \
    '.artifacts[] | select(.name == $n and .expired == false) | .id'
accepts 1 arg(s), received 4
REPRO_EXIT=1
```

### 4.3 The secondary defect — an unreachable error branch

Because the command sat inside `ARTIFACT_ID="$( … | head -n1 )"` under `set -euo pipefail`, the CLI's non-zero exit propagated through the pipeline into the assignment, and `set -e` aborted the step immediately. The step's own purpose-built error branch —

```bash
if [ -z "$ARTIFACT_ID" ]; then
  echo "::error::VERIFICATION RUN ASSERTION FAILED — run … has no production-verification-evidence-… artifact (missing or expired)."
```

— was therefore **unreachable for every failure of the lookup itself**. A pure CLI-usage defect surfaced as nine characters of untagged output with no `::error::` annotation and no indication of which assertion had failed. The behaviour was fail-closed and correct; the *diagnosis* was opaque.

### 4.4 Scope of the defect

This was the **only** misuse in the repository. Every other `--arg` across all four workflow files is a genuine `jq` invocation reading a local file, which is correct:

```text
promote-production.yml : 6 correct jq --arg uses (topology + post-promotion checks)
verify-production.yml  : 4 correct jq --arg uses
deploy-production.yml  : 4 correct jq --arg uses
```

`promote-production.yml` step 6 (the release-evidence binding) passed precisely because it uses a different technique — it iterates artifacts and compares with `jq -r` on a downloaded file, never passing `--arg` to `gh`.

### 4.5 Why the existing test suite did not catch it

`lib/ci/promote-production-workflow.test.ts` already carried 35 checks, including executed-under-real-`bash` tests of the topology and post-promotion logic. But the artifact-lookup line was covered only by **static shape assertions** (does the step reference `RUN_CONCLUSION`, `EV_SHA`, `PASSED*`, and so on) — all of which passed on the defective file, because the defect was in CLI argument syntax, not in the assertion logic. No test executed that line, and no test asserted anything about how `gh` itself is invoked.

---

## 5. Classification

```text
WORKFLOW_DEFECT     ← THIS INCIDENT
EVIDENCE_DEFECT     NO
INPUT_DEFECT        NO
EXTERNAL/API_DEFECT NO
```

Each alternative was checked and ruled out against live evidence rather than assumed:

| Candidate cause | Ruled out by |
| --- | --- |
| Wrong run/workflow identity | Run `35567845828` reports `workflow_id: 363097410` (Verify Production) and `conclusion: success`. The step's workflow-id and conclusion checks both passed — they run *before* the artifact lookup. |
| Artifact name mismatch | The artifact `production-verification-evidence-35567845828` (id `10624946203`) exists, `expired: false`. The expected name is exactly right. |
| Wrong artifact lookup (endpoint) | The endpoint `repos/{owner}/{repo}/actions/runs/{id}/artifacts` is correct and returns the artifact. |
| Evidence schema mismatch | The evidence JSON carries every field the step reads: `release_sha`, `canary_version_id`, `stable_version_id`, `traffic_split`, `smoke_result`, `verification_only`, `mutating_commands_issued`. |
| JSON parsing issue | No JSON was ever fetched or parsed — the CLI aborted on argument count first. |
| GitHub API assumption | No HTTP request was issued. The failure is in local CLI argument parsing. |
| Permissions | `permissions: actions: read` is declared and sufficient; steps 3 and 6 made successful `gh api` calls with the same token in the same job. |
| SHA / version comparison mismatch | Independently dry-evaluated post-fix (§7.4): every comparison resolves PASS against the real evidence. |
| Operator input error | All eleven inputs were correct and are re-confirmed against durable evidence in §6. |

The inputs were right, the evidence was right, the API was right, the permissions were right. The workflow's own command was wrong.

---

## 6. Inputs supplied — all re-confirmed correct

| Input | Value | Bound to |
| --- | --- | --- |
| `confirm` | `promote-production` | the workflow's exact literal |
| `release_sha` | `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` | release-evidence artifact `10612087790` → `deployed_sha` |
| `canary_version_id` | `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` | same artifact → `new_version_id` |
| `stable_version_id` | `b07d8697-620c-485c-8fed-21b893ab602c` | same artifact → `previous_version_id`; ledger `ROLLBACK_VERSION_ID` |
| `expected_canary_percent` | `10` | live deployment `c0f3a66b` |
| `expected_stable_percent` | `90` | live deployment `c0f3a66b` |
| `verification_run_id` | `35567845828` | `conclusion: success`, `workflow_id: 363097410` |
| `observation_started_at` | `2026-09-22T08:03:31Z` | real observation window |
| `observation_ended_at` | `2026-09-22T08:06:33Z` | real observation window |
| `observation_owner` | `rezachidotnet` | the account that performed the checks and holds the reviewer gate |
| `observation_attestation` | `OBSERVATION_CONFIRMED_SAFE_TO_PROMOTE` | the workflow's exact literal |

Steps 2, 3 and 6 independently validated the first six of these and passed. **No input needs to change for the re-run.**

---

## 7. The fix

### 7.1 What changed

One step, in `.github/workflows/promote-production.yml`. The `--arg` is routed to the tool that actually has it, and the API call is status-checked explicitly so a lookup failure can report itself:

```bash
# --- VERIFY ARTIFACT LOOKUP START ---
ARTIFACTS_JSON="$RUNNER_TEMP/verify-run-artifacts.json"
ARTIFACTS_ERR="$RUNNER_TEMP/verify-run-artifacts.err"
if ! gh api "repos/${{ github.repository }}/actions/runs/$VERIFY_RUN_INPUT/artifacts" > "$ARTIFACTS_JSON" 2> "$ARTIFACTS_ERR"; then
  echo "::error::VERIFICATION RUN ASSERTION FAILED — could not list the artifacts of run $VERIFY_RUN_INPUT via the GitHub API. Details: $(cat "$ARTIFACTS_ERR")"
  exit 1
fi
ARTIFACT_ID="$(jq -r --arg n "production-verification-evidence-$VERIFY_RUN_INPUT" '.artifacts[] | select(.name == $n and .expired == false) | .id' "$ARTIFACTS_JSON" | head -n1)"
# --- VERIFY ARTIFACT LOOKUP END ---
```

### 7.2 What did NOT change — no evidence check weakened

```text
SECURITY_CHECK_WEAKENED: NO
```

- The artifact name is **still** passed as a jq `--arg`, never interpolated into the jq program — the same injection-resistant form, addressed to the correct tool.
- `select(.name == $n and .expired == false)` is byte-for-byte unchanged: exact-name equality, expired artifacts still rejected, no prefix or fuzzy matching introduced.
- The `if [ -z "$ARTIFACT_ID" ]` fail-closed branch is unchanged — and is now actually *reachable*, which it was not before.
- Every downstream assertion (`EV_SHA`, `EV_CANARY`, `EV_STABLE`, `EV_SPLIT`, `EV_ONLY`, `EV_MUTATING`, `EV_SMOKE` → `PASSED*`) is untouched.
- No step was removed, no assertion relaxed, no input newly trusted at face value, no bypass or skip flag introduced.
- No other step in the workflow was modified. The smoke suite remains byte-identical to `deploy-production.yml`'s and `verify-production.yml`'s (enforced by `lib/ci/production-smoke-harness.test.ts`).

Net effect on strictness: **unchanged plus one failure path that previously could not report itself now does.**

### 7.3 Regression tests

Eight new tests in `lib/ci/promote-production-workflow.test.ts` (36a–36h), in the file's established two-part style — a static guard with a mutation test proving it bites, plus executed tests under real `bash -e` with real `jq` against a stub `gh` that models the real CLI's argument contract (one positional; `--jq` takes one value; no `--arg`):

| Test | Asserts |
| --- | --- |
| 36a | No `gh api` invocation anywhere in the workflow carries `--arg` — a class guard, not a one-line patch |
| 36b | Mutation: reintroducing `gh api … --jq --arg` is caught by 36a |
| 36c | The lookup block is marker-extractable and still passes the name as a jq `--arg`, still rejects expired artifacts |
| **36d** | **REPRO: the defective form fails with `accepts 1 arg(s)` — the exact observed root cause, reproduced in-suite** |
| 36e | FIXED: the shipped lookup resolves the correct artifact id, ignoring other artifacts on the same run |
| 36f | FIXED: an expired artifact resolves to empty, so the existing fail-closed branch fires |
| 36g | FIXED: a differently-named artifact resolves to empty — no loose matching |
| 36h | FIXED: a failing artifacts API call now fails closed with a legible `VERIFICATION RUN ASSERTION FAILED` error rather than an opaque abort |

All fixtures are synthetic (`RELEASE_POLICY.md` §14); tests 35/35b, which forbid real release identifiers in both the workflow and the test file, still pass. The workflow comment documenting this incident references this report by filename and carries no real run id.

### 7.4 Validation performed

```text
npm test          1507 / 1507 pass, 0 fail  (42 / 42 in promote-production-workflow.test.ts)
npx tsc --noEmit  exit 0
```

Read-only dry evaluation of the corrected lookup against the **real** verification run and its **real** evidence artifact — no workflow dispatched, no mutation:

```text
ARTIFACT_ID            10624946203          (resolved — previously unreachable)
sha_match              PASS
canary_match           PASS
stable_match           PASS
split_match            PASS                 (10/90 vs 10/90)
verification_only      true
mutating_commands      none
smoke_result           PASSED (23/23)
smoke_gate             PASS
```

Every assertion in the previously-failing step now resolves PASS against real evidence.

---

## 8. Production state — independently re-verified, read-only

Confirmed after the failed run, by direct read-only Cloudflare and HTTP reads:

| Check | Value | Status |
| --- | --- | --- |
| Canary traffic | `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` @ **10%** | Unchanged |
| Stable traffic | `b07d8697-620c-485c-8fed-21b893ab602c` @ **90%** | Unchanged |
| Traffic total | 100% across exactly 2 versions | Unchanged |
| Third traffic-bearing version | none | Unchanged |
| Latest deployment | `c0f3a66b-314b-4131-af53-eb86ee38d92d`, `created_on: 2026-09-20T19:53:08Z` | Unchanged — no new deployment event |
| Deployment count | 10 | Unchanged |
| Worker version count | 10; newest is still the canary itself | Unchanged — nothing uploaded |
| D1 `DB_OPS` / `DB_PUBLIC` | "No migrations to apply" on both | Unchanged |
| Secrets | not read or written by any executed step | Unchanged |
| GitHub Environment protection | `required_reviewers: [rezachidotnet]` + branch policy, allow-list still exactly `["feat/header-hero-integrated"]` | Unchanged |
| Release ledger | still one `LEGACY_IN_FLIGHT_RELEASE` row, no `STABLE_100` row | Unchanged |
| `https://www.ahanassa.com/` | 200 | Healthy |

```text
PRODUCTION_MUTATION_OCCURRED: NO
NEW_WORKER_VERSION_CREATED:   NO
D1_CHANGED:                   NO
SECRETS_CHANGED:              NO
ENVIRONMENT_PROTECTION_CHANGED: NO
ROLLBACK_PERFORMED:           NO (none needed — nothing shifted)
```

The failure was genuinely fail-closed: the workflow's evidence-binding phase did exactly what it is designed to do — refuse to proceed when it cannot positively establish a fact — and the defect happened to be in the check itself rather than in the evidence.

---

## 9. Registration status of the fix

The corrected workflow is **not yet registered**. Per `RELEASE_POLICY.md` §7, `.github/workflows/**` and `lib/ci/**` are `HIGH_RELEASE_PATHS`; both changes ship as reviewable PRs and neither is merged by this task.

| PR | Branch | Target | State |
| --- | --- | --- | --- |
| [#11](https://github.com/rezachidotnet/ahanassa-website/pull/11) — application | `fix/promote-production-verification-artifact-lookup` | `feat/header-hero-integrated` | OPEN — not merged |
| [#12](https://github.com/rezachidotnet/ahanassa-website/pull/12) — registration | `fix/register-promote-production-artifact-lookup` | `main` | OPEN — not merged |

Both carry a byte-identical `promote-production.yml` (`sha256 3a880a5b96f48daeec7f8c5d56a2e21b57a18fa82c2359d8ee733aafa1fee189`). #11 additionally carries the regression tests, this report, and the implementation-report addendum; `main` carries no `lib/ci/` or ledger, per its own `CLAUDE.md`.

`workflow_dispatch` availability is resolved from the **default branch**, so the registration PR to `main` is what makes the corrected file dispatchable. Until both merge, a re-dispatch would run the **defective** file and fail at the same step again.

---

## 10. What was NOT done

- The promotion was **not** re-run. `READY_TO_RERUN_PROMOTION: NO`.
- Production traffic was **not** changed — still 10/90.
- No Worker version was uploaded, built, or deployed.
- No D1 schema or data change; no migration applied.
- No secret read, written, or rotated.
- No GitHub Environment protection or deployment branch policy change.
- No evidence check was removed, relaxed, or replaced with trust in operator input.
- No rollback was performed (none was warranted — traffic never moved).
- No ledger row was appended. `BASE_PRODUCTION_SHA` remains `UNRESOLVED`, exactly as before the attempt.
- Neither PR (#11, #12) was merged.

---

## 11. Required next actions, in order

1. **Review and merge PR #11** into `feat/header-hero-integrated` — requires separate authorization.
2. **Review and merge PR #12** into `main`, so the corrected workflow is what `workflow_dispatch` resolves.
3. Re-confirm byte-identity of `promote-production.yml` across `main` and `feat/header-hero-integrated` after both merges.
4. Re-run the read-only preflight (all 15 items) and a **fresh** observation window — the previous window's timestamps describe checks performed on 2026-09-22T08:03–08:06Z and must not be reused for a later dispatch.
5. Re-dispatch `Promote Production` from `feat/header-hero-integrated` with the **same eleven input values** except the two observation timestamps, which must describe the new window.
6. Resume the original plan from Phase 8 — monitor, verify 100/0, smoke, `STABLE_100` evidence, ledger append, `BASE_PRODUCTION_SHA` resolution.

```text
READY_TO_RERUN_PROMOTION:
NO
until the root cause is corrected and separately reviewed.
```

---

**End of `FIRST_PRODUCTION_PROMOTION_ATTEMPT_FAILURE_REPORT.md`. STOP — fix not merged, promotion not re-run, production traffic unchanged at 10/90.**
