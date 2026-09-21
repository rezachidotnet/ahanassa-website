# Verification-Only Production Workflow — Implementation Report

**Report date (UTC):** 2026-09-21
**Scope:** implement a minimal, verification-only workflow that can run the corrected production smoke gate against the **existing** 10% canary, without changing traffic or creating a Worker version.
**Related:** `docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md` (the S5 fix and the §5 re-run safety audit this implements the recommendation of), `docs/release/FIRST_PRODUCTION_10_PERCENT_CANARY_REPORT.md` (the release awaiting an official gate result), `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` (frozen release architecture).

---

## 1. Result summary

```text
RESULT:
PASS

WORKFLOW:
.github/workflows/verify-production.yml

MUTATING_COMMANDS_PRESENT:
NO

PRODUCTION_ENVIRONMENT_REQUIRED:
YES

EXPECTED_CANARY_VERSION:
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed

EXPECTED_STABLE_VERSION:
b07d8697-620c-485c-8fed-21b893ab602c

EXPECTED_TRAFFIC:
10 / 90

SMOKE_ASSERTIONS:
23   (byte-identical to deploy-production.yml's suite, enforced by test)

TEST_RESULTS:
npm test           1392 / 1392 pass   (1377 prior + 13 new verification invariants + 2 new harness tests)
npx tsc --noEmit   clean, exit 0
V1 executed against the real wrangler.jsonc                     PASS
V3 exercised against 4 deployment fixtures                      PASS (1 valid, 3 fail closed)
Confirmation step exercised against 5 input shapes              PASS (1 valid, 4 rejected)
Smoke failure path under the copied block                       PASS (correct rollback hint, no `set -u` abort)
Loophole check: inject `versions deploy` into the workflow      4 tests FAIL, as required

REGISTRATION_PR:
#4 — chore/register-verify-production-workflow -> main
     OPEN, NOT MERGED, 1 file, byte-identical to the feature branch
     (PR #3, the deploy-production.yml S5 fix sync, also remains open)

SAFE_TO_DISPATCH_VERIFICATION_ONLY:
YES by design — but NOT dispatchable yet. GitHub indexes workflow_dispatch
workflows from the default branch, and `gh workflow list` confirms
verify-production is still unregistered. Dispatch requires PR #4 to be
merged, which this task was not authorized to do, so the "after
registration" precondition is not met and nothing was dispatched.

FULL_DEPLOY_RERUN_SAFE:
NO

READY_FOR_100_PERCENT:
NO

REMAINING_BLOCKERS:
- official verification-only run (merge PR #4, then dispatch once)
- R3 deterministic previous/stable version selection in deploy-production.yml
- separate 100% promotion decision
```

---

## 2. Why this workflow exists rather than a re-dispatch

The first real production release left a **healthy 10% canary with no official smoke-gate result** — the gate aborted on the S5 harness defect, since fixed (PR #3).

Obtaining that result by re-dispatching `deploy-production.yml` is unsafe while a 10/90 split is live. Its rollback target comes from:

```bash
PREVIOUS_VERSION_ID="$(npx wrangler deployments list ... --json | jq -r '.[-1].versions[0].version_id // empty')"
```

`.[-1]` is genuinely the newest deployment (wrangler sorts ascending by `created_on` before printing — verified in `versionsDeploymentsListHandler`). But `.versions[0]` is a **positional** read of an array whose order comes straight from the Cloudflare API. That was unambiguous only while one version served 100%. The canary deployment holds two, so a re-dispatch could take the **canary itself** as "previous" and give an uncertified version 90% of production traffic from a run invoked at `rollout_percentage=10`, while the proven stable build drops to 0% and stops being the rollback target. It would also upload a new Worker version for the same SHA, so the evidence would no longer describe the artifact actually tested.

This workflow does the one thing that was actually needed — run the corrected gate against what is already deployed — and is constructed so it *cannot* do anything else.

---

## 3. Design

`workflow_dispatch` only. `environment: production`. `permissions: contents: read, actions: read`.

### 3.1 Inputs — minimal and explicit

| Input | Purpose |
| --- | --- |
| `confirm` | must equal `verify-production` — deliberately different from `deploy-production` so operator muscle memory cannot cross a verification into a deployment |
| `expected_release_sha` | 40-hex; asserted against recorded release evidence, not merely echoed |
| `expected_canary_version` | Worker Version UUID; asserted to be live at exactly 10% |
| `expected_stable_version` | Worker Version UUID; asserted to be live at exactly 90% |

There is **no** `deploy_ref`, no rollout percentage, no environment selector, and **no skip/bypass input of any kind** — there is deliberately nothing an operator can type that relaxes an assertion.

### 3.2 Steps

| Step | What it does |
| --- | --- |
| Confirmation | validates all four inputs, including that canary ≠ stable |
| Checkout | **no `ref:`** — the workflow's own commit (`github.sha`), `persist-credentials: false` |
| **V1** | production target: `env.production.name == ahanassa-production` and both production D1 `database_id`s, parsed from `wrangler.jsonc` |
| **V2** | binds `expected_release_sha` to the immutable release-evidence artifact of the deploy run that produced the canary |
| **V3** | live baseline: exactly two versions, canary at 10, stable at 90, total 100, no third version |
| **V4** | D1 migration parity — `d1 migrations list` only, both databases |
| **Smoke** | the 23-assertion suite, byte-identical to `deploy-production.yml`'s |
| **V5** | post-verify: re-reads both Cloudflare listings and requires them unchanged |
| Evidence | writes and uploads `production-verification-evidence-<run_id>.json` (365-day retention) |

### 3.3 On the checkout

The task asked to avoid checking out arbitrary untrusted release code. This workflow has **no `deploy_ref` input at all**, and its checkout passes **no `ref:`** — it checks out the commit the runner already trusted to execute this workflow. It exists solely to provide `wrangler.jsonc` (V1) and `migrations/` (V4); the smoke suite is embedded in the workflow file, not read from the checkout.

### 3.4 V2 — why the inputs cannot just assert what they claim

An operator could otherwise type any SHA beside any version id. V2 scans the repository's `production-release-evidence-*` artifacts for the one whose `new_version_id` equals `expected_canary_version`, then asserts that record's `deployed_sha`, `previous_version_id` and `rollout_percentage` match the inputs. The claimed release is therefore bound to what the deploy run actually recorded. If no such evidence exists, it fails closed.

### 3.5 V3/V5 — position-independent, unlike the code that caused R3

Every version lookup matches by `version_id` and checks its `percentage` explicitly:

```bash
CANARY_PCT="$(jq -r --arg v "$CANARY_INPUT" '[.versions[] | select(.version_id == $v) | .percentage] | first // empty' ...)"
```

`.versions[0]` never appears — and a test asserts it never will. V5 additionally compares sorted fingerprints of both `deployments list` and `versions list` from before and after the smoke suite, so a new Worker version, a new deployment, or any traffic movement fails the run even though this workflow issues no command that could cause one.

---

## 4. Why the smoke suite is duplicated rather than extracted

The obvious refactor — lift the suite into `scripts/production-smoke.sh` and have both workflows call it — is **wrong here**, and the reason is worth recording.

`deploy-production.yml` checks out `deploy_ref`. A repo-script smoke suite would therefore run whatever version of that script existed **at the deployed SHA** — which for `f2202ab` is the pre-fix, broken one. The gate logic would become versioned with the release under test instead of with the workflow doing the testing, which inverts the property that matters: a release must be judged by the *current* gate, not by the gate it shipped with.

So the suite stays inside each workflow file, and the cost of that choice — a second copy — is paid by a test:

```text
✔ the smoke suite is byte-identical in deploy-production.yml and verify-production.yml
```

It extracts both `run:` blocks and compares them, reporting the first differing line if they diverge. A fix to one can never silently miss the other.

One deliberate, non-script difference: the copied block's failure branch echoes `$NEW_VERSION_ID`/`$PREVIOUS_VERSION_ID`, which `deploy-production.yml` sets in `GITHUB_ENV` and this workflow does not. They are bound via the step's `env:` key (canary and stable respectively), so the `run:` script stays byte-identical while a smoke failure prints a correct, actionable rollback hint instead of dying on `set -u`. Verified by forcing a failure — 19 checks failed and the correct rollback command was printed, referencing the stable version.

---

## 5. Enforced invariants (Phase 5)

`lib/ci/verify-production-workflow.test.ts` — 13 tests:

| Requirement | Test |
| --- | --- |
| cannot call `wrangler versions upload` | ✔ |
| cannot call `wrangler versions deploy` | ✔ |
| cannot change traffic by any known command | ✔ (10 mutating patterns) |
| cannot apply D1 migrations | ✔ (and the *only* permitted D1 command is `migrations list`) |
| cannot use a skip/bypass input | ✔ (`skip_`, `bypass`, `force`, `override`, `allow_`) |
| requires production Environment approval | ✔ |
| is `workflow_dispatch`-only | ✔ (6 automatic triggers forbidden) |
| uses the corrected smoke harness | ✔ (byte-identity, in the harness test) |
| remains verification-only | ✔ (compact end-to-end restatement) |
| never requests write permissions | ✔ |
| baseline before smoke, post-verify after | ✔ (ordering asserted) |
| never reads `.versions[0]` | ✔ (guards against repeating R3) |
| no `deploy_ref`, no `ref:` on checkout | ✔ |

### 5.1 The command scan distinguishes execution from text

A naive substring scan would false-positive on the smoke suite's echoed rollback hint — the very safety feature worth keeping. Both this file and `workflow-invariants.test.ts` therefore filter out lines beginning `echo ` before scanning, and use word-boundary regexes so `wrangler deployments list` (read-only) is never mistaken for `wrangler deploy`.

### 5.2 The workflow-invariants exception is narrow and self-guarding

`workflow-invariants.test.ts` forbids every workflow except `deploy-production.yml` from naming production resources. A workflow that *reads* production must name it, so a second exception was needed — but it is **earned, not granted**: in the same test, `verify-production.yml` is skipped only after being asserted free of every mutating command. The skip cannot quietly become a loophole.

Demonstrated by injecting a `wrangler versions deploy` line into the workflow:

```text
✖ verify-production.yml cannot call `wrangler versions deploy`
✖ verify-production.yml cannot change traffic by any known command
✖ verify-production.yml remains verification-only end to end
✖ only deploy-production.yml may deploy to production — every other workflow, present or future, fails if it does
```

A blanket "no workflow but `deploy-production.yml` may run a mutating command" rule was **deliberately not added**: `deploy-staging.yml` legitimately runs `vinext-cloudflare deploy` against staging, and the existing marker scan already forbids it from naming production. The guarantee is complete without it.

---

## 6. Local verification

| Check | Result |
| --- | --- |
| `npm test` | **1392 / 1392 pass** |
| `npx tsc --noEmit` | clean, exit 0 |
| V1 extracted and executed against the real `wrangler.jsonc` | `Production target confirmed: ahanassa-production, production DB_OPS/DB_PUBLIC bindings correct.` |
| V3 vs. a correct 10/90 fixture (two deployments, newest last) | exit 0, baseline confirmed |
| V3 vs. a three-version fixture | exit 1 — "has 3 version(s) receiving traffic, expected exactly 2" |
| V3 vs. a 50/50 fixture | exit 1 — "canary … is at 50%, expected 10%" |
| V3 vs. a fixture missing the canary | exit 1 — "expected canary … is not receiving traffic" |
| Confirmation step vs. 5 input shapes | valid accepted; wrong confirm word, short SHA, malformed UUID, and canary==stable each rejected |
| Smoke block failure path | correct rollback hint printed, no `set -u` abort |

The V1/V3/confirmation checks matter because they exercise the actual embedded scripts — including that the YAML block scalar dedents heredoc terminators to column 0 — rather than reasoning about them.

---

## 7. Registration (Phase 6)

Established minimal pattern (PRs #1, #2, #3): a branch cut from `origin/main`, one commit, one file, no unrelated history.

| Item | Value |
| --- | --- |
| Implementation commit | `4b0b43e` on `feat/header-hero-integrated`, pushed |
| Registration branch | `chore/register-verify-production-workflow`, cut from `origin/main` (`3bc0eb4`) |
| Registration commit | `5157fed` — 1 file changed |
| PR | **#4**, → `main`, **OPEN, NOT MERGED**, 1 file |

**Blob verification — byte-identical:**

```text
feat/header-hero-integrated            : 256f6174f62dda79b3e346cbcb0dacc3ba2d424c
chore/register-verify-production-workflow : 256f6174f62dda79b3e346cbcb0dacc3ba2d424c
```

---

## 8. Dispatch status — not dispatched, and why

Authorization permitted dispatching the workflow **once after registration, if explicitly safe**. That precondition is not met:

```console
$ gh workflow list --all
CI                 active  357303552
Deploy Production  active  362738255
Deploy Staging     active  361701517
```

`verify-production` does not appear. GitHub indexes `workflow_dispatch` workflows from the **default branch**, and PR #4 is deliberately unmerged (merging it was not authorized). The workflow is therefore not dispatchable at all, so **nothing was dispatched**.

The workflow is safe to dispatch by design — it issues no mutating command, is proven so by CI, and re-asserts the untouched state afterwards. The sequence once authorized:

1. Merge PR #4 (registration) — and PR #3, the S5 fix, if not already merged.
2. Dispatch `Verify Production` on `feat/header-hero-integrated` with:
   ```text
   confirm                  = verify-production
   expected_release_sha     = f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9
   expected_canary_version  = 4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed
   expected_stable_version  = b07d8697-620c-485c-8fed-21b893ab602c
   ```
3. Approve the pending `production` environment deployment.
4. Expect `PASSED (23/23)` and an official run id for the release evidence.

**Note on PR #3 ordering.** `verify-production.yml` embeds the *fixed* smoke suite. Merging PR #4 without PR #3 leaves `main` carrying a corrected verification workflow beside an uncorrected deploy workflow. That is not dangerous — the byte-identity test runs against the feature branch where both are fixed, and CI on `main` would flag the divergence — but merging #3 first keeps the two in step.

---

## 9. Production state — untouched

| Assertion | Result | Evidence |
| --- | --- | --- |
| Traffic split | **10 / 90**, unchanged | no `versions deploy` run anywhere in this task |
| New Worker version created | **NO** | no `versions upload` run |
| Deploy Production dispatched | **NO** | still 5 runs, newest still `35533626395` |
| Verify Production dispatched | **NO** | not registered; see §8 |
| D1 / migrations / secrets | untouched | no Cloudflare command was executed in this task at all |
| Environment protection | untouched | not modified |
| Production health | healthy | `/`, `/en`, `/ar`, `/products`, `/contact` all 200 |
| Unrelated working-tree drift | untouched | left uncommitted, as found |

---

## 10. Bottom line

The verification path now exists and is provably incapable of changing production: no mutating command, read-only permissions, dispatch-only, still behind the production reviewer, no bypass input, and a post-run assertion that everything is exactly as it was. It closes the gap left by the first release without the risk that a re-dispatch would carry.

Two merges stand between here and an officially recorded 10% gate result — PR #3 and PR #4 — both deliberately left for the owner. Promotion to 100% remains out of scope and not recommended until that result exists, and finding **R3** (the positional `.versions[0]` read in `deploy-production.yml`) still needs its own fix before any future canary-time deployment.

---

**End of report.**
