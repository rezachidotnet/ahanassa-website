# R3 — Deterministic Production Version-Role Selection

**Report date (UTC):** 2026-09-22
**Scope:** close finding R3 — remove all positional guessing from production rollback/stable-version discovery in `deploy-production.yml`, so a future dispatch is safe while production is already running a multi-version canary split.
**Related:** `docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md` §5 (R3's original discovery), `docs/release/PRODUCTION_10_PERCENT_OFFICIAL_VERIFICATION_REPORT.md` (the official gate result R3 work was waiting on — PASS, run `35567845828`), `docs/release/PRODUCTION_VERIFICATION_WORKFLOW_REGISTRATION_REPORT.md` (the PR #3/#4 registration pattern this task's PR #5 follows).

---

## 1. Result summary

```text
RESULT:
PASS

R3_ROOT_CAUSE_CONFIRMED:
YES

POSITIONAL_VERSION_SELECTION_REMAINING:
NO

CURRENT_CANARY_VERSION:
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed

CURRENT_STABLE_VERSION:
b07d8697-620c-485c-8fed-21b893ab602c

CURRENT_ROLLBACK_VERSION:
b07d8697-620c-485c-8fed-21b893ab602c

CURRENT_TRAFFIC:
10 / 90

ROLE_DISCOVERY:
DETERMINISTIC

ARRAY_ORDER_DEPENDENCY:
NO

PROMOTION_MODE:
SEPARATE_WORKFLOW_REQUIRED

100_PERCENT_PRESTATE_VALIDATION:
PASS

ROLLBACK_TARGET_DETERMINISTIC:
YES

TEST_RESULTS:
npm test           1411/1411 pass  (1392 prior + 19 new)
npx tsc --noEmit   clean, exit 0

WORKFLOW_INVARIANT_RESULTS:
lib/ci/production-version-role-discovery.test.ts   19/19 pass
(includes the R3-specific static invariant + mutation-detector tests;
 every prior workflow-invariants.test.ts / production-smoke-harness.test.ts /
 verify-production-workflow.test.ts / wrangler-config-invariants.test.ts
 test still passes unchanged, counted in the 1411 total above)

READ_ONLY_REAL_PRODUCTION_EVALUATION:
PASS

PRODUCTION_TRAFFIC_CHANGED:
NO

NEW_WORKER_VERSION_CREATED:
NO

DEPLOYMENT_DISPATCHED:
NO

REGISTRATION_PR:
#5 — https://github.com/rezachidotnet/ahanassa-website/pull/5
     chore/sync-r3-deterministic-version-selection -> main
     OPEN, NOT MERGED, 1 file (.github/workflows/deploy-production.yml),
     byte-identical to feat/header-hero-integrated

R3_CLOSED:
YES

READY_FOR_100_PERCENT_PROMOTION:
NO

REMAINING_BLOCKERS:
1) PR #5 is open but not merged — deploy-production.yml's fix is not yet
   live on main (not authorized to merge in this task).
2) A 100% promotion of the CURRENT canary should reuse the already-uploaded,
   already-verified version (PROMOTION_MODE: SEPARATE_WORKFLOW_REQUIRED,
   §5/§9 below) rather than dispatch deploy-production.yml again — that
   dedicated promotion-only workflow does not exist yet and was
   deliberately NOT built in this task (see §9 for why).
3) 100% promotion, whichever mechanism performs it, remains its own
   separate, explicitly-authorized action — not implied by R3 being closed.
```

---

## 2. Phase 1 — R3 root cause, confirmed

Inspected every place in `.github/workflows/deploy-production.yml` that derives `PREVIOUS_VERSION_ID`, a current-serving version, a rollback target, or traffic allocation.

**Found exactly one positional-selection defect**, in the "Capture PREVIOUS_VERSION_ID" step:

```bash
PREVIOUS_VERSION_ID="$(npx wrangler deployments list --config dist/server/wrangler.json --json | jq -r '.[-1].versions[0].version_id // empty')"
```

- `.[-1]` selects the newest deployment **event** — this part is a documented wrangler 4.x ordering guarantee (deployments are printed ascending by `created_on`), not the defect.
- `.versions[0]` selects the first entry of that event's `versions[]` array **by array position**. That is safe only while exactly one version is live (position 0 and "the one version" are the same thing). It is unsafe the moment two versions are live: Cloudflare's API does not guarantee, and does not document, that `versions[0]` is the stable (majority-traffic, older) leg rather than the canary.

**Concretely wrong today:** the live production deployment (fetched read-only during this task) is:

```json
{
  "versions": [
    { "version_id": "4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed", "percentage": 10 },
    { "version_id": "b07d8697-620c-485c-8fed-21b893ab602c", "percentage": 90 }
  ]
}
```

`.versions[0].version_id` resolves to `4a32c5f9-…` — **the canary**, not the proven-stable `b07d8697-…`. Verified directly:

```text
$ jq -r '.[-1].versions[0].version_id' <real production deployments list>
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed    # WRONG — this is the canary
```

A re-dispatch of the unfixed `deploy-production.yml` today would have captured `PREVIOUS_VERSION_ID = 4a32c5f9-…`, inverting the rollback target: a subsequent split deploy would treat the canary as the safe fallback and could push the real stable version's remaining traffic down, and the printed rollback command on a smoke failure would target the canary instead of the proven-stable build. This is R3, confirmed exactly as described.

**No other positional selection was found.** A `grep` of the full file for `versions\[`, `deployments list`, `.[-1]`, `.[0]`, `head -n1`, and sort-based ordering patterns found exactly one other array-index use (`--jq '.jobs[0].id'` in the A2 staging-provenance step) — that selects the single job of a specific, already-uniquely-identified workflow run (this repository's workflows have exactly one job each), an unrelated and unambiguous case, not a version-identity guess.

## 3. Phase 2 — Deterministic invariants, as implemented

Implemented exactly the required-invariant set:

| Invariant | Implementation |
| --- | --- |
| A. Read the currently active production deployment | `npx wrangler deployments list --config dist/server/wrangler.json --json`, take `.[-1]` (newest event — ordering guarantee, not identity guessing) |
| B. Parse every active version by id + percentage | `jq '.versions[]'` iterated, matched by `.version_id ==`, never by index |
| C. Validate total traffic = 100% | `TOTAL_PCT` computed via `[.versions[].percentage] | add`, must equal exactly `100` |
| D. Reject unexpected topology | `COUNT` branches on exactly `1` or `2`; anything else fails closed |
| D (single stable) | `COUNT == 1` → that version becomes `STABLE_VERSION_ID` automatically (unambiguous — nothing else it could be) |
| D (existing canary) | `COUNT == 2` → both `expected_current_stable_version_id` and `expected_current_canary_version_id` are REQUIRED inputs; each is matched by exact id against the live set; any live version matching neither fails closed |
| E. Fail closed on ambiguity | See §7 (test matrix) — every example the task lists (3+ versions, bad totals, missing/unmatched expected id, unknown live version, malformed percentage, topology mismatch) fails closed with an explicit `::error::` message, never a silent fallback |

## 4. Phase 3 — Promotion model audit

Audited `deploy-production.yml`'s actual semantics for `rollout_percentage ∈ {10, 50, 100}`:

- **Every dispatch, regardless of rollout_percentage, runs the full pipeline**: checkout → build → `wrangler versions upload` (Phase 1, always creates a brand-new Worker Version for whatever `deploy_ref` was given) → `wrangler versions deploy` (Phase 2, shifts traffic to `new@rollout_percentage` [+ `previous@remainder` if not 100]).
- This is architecturally a **"deploy a (possibly new) SHA" operation**, not a **"change the traffic percentage of an already-uploaded, already-verified version"** operation. A 100% dispatch today would build and upload yet another Worker Version for the same `deploy_ref`, even if that exact SHA's Version already exists and was already smoke-tested at 10% by the official gate (`docs/release/PRODUCTION_10_PERCENT_OFFICIAL_VERIFICATION_REPORT.md`).
- Uploading a second, distinct Version for the identical SHA/build breaks release-identity: `verify-production.yml`'s V2 step binds evidence to a specific `new_version_id`, and a second upload for the same SHA would be a **different** Version ID with its own separate, unverified evidence record — the already-obtained PASS result would not transfer to it.

**Production is currently at canary `4a32c5f9-…` @10% / stable `b07d8697-…` @90%.** The safe path to 100% for *this specific, already-verified* release is to change only the traffic percentage of the existing `4a32c5f9-…` Version — not to build and upload a new one.

## 5. Phase 4 — Implementation

Implemented in `.github/workflows/deploy-production.yml` (committed `f1c752b` on `feat/header-hero-integrated`; registration PR #5 to `main`, not merged):

**Two new optional `workflow_dispatch` inputs:**

```yaml
expected_current_stable_version_id:
  # Worker Version ID expected as PRODUCTION'S CURRENT STABLE version
  # (this deploy's rollback target). REQUIRED, together with
  # expected_current_canary_version_id, whenever production already has
  # 2 active versions.
  required: false
  type: string
  default: ""
expected_current_canary_version_id:
  # Worker Version ID expected as PRODUCTION'S CURRENT CANARY version.
  # REQUIRED together with expected_current_stable_version_id whenever
  # production has 2 active versions.
  required: false
  type: string
  default: ""
```

Format-validated (UUID shape, non-identical if both given) in the same early "Require explicit confirmation…" step that already validates `confirm`/`deploy_ref`/`rollout_percentage`, before Cloudflare credentials are ever used.

**The "Capture PREVIOUS_VERSION_ID" step, rewritten** with explicit role variables — `STABLE_VERSION_ID`, `CANARY_VERSION_ID`, and `PREVIOUS_VERSION_ID`/`ROLLBACK_VERSION_ID` (aliased to `STABLE_VERSION_ID`, keeping the existing variable name the rest of the file — Phase 2 traffic split, evidence capture, the printed rollback command — already threads through, so the fix's blast radius stays minimal):

```bash
npx wrangler deployments list --config dist/server/wrangler.json --json > "$RUNNER_TEMP/deployments.json"
jq '.[-1]' "$RUNNER_TEMP/deployments.json" > "$RUNNER_TEMP/latest-deployment.json"
# --- ROLE DISCOVERY START ---
COUNT="$(jq -r '.versions | length' "$RUNNER_TEMP/latest-deployment.json")"
# ... percentage well-formedness + total==100 checks ...
if [ "$COUNT" = "1" ]; then
  # single version, must be @100% — unambiguous, no positional read
  SOLE_ID="$(jq -r '.versions[] | .version_id' "$RUNNER_TEMP/latest-deployment.json")"
  ...
elif [ "$COUNT" = "2" ]; then
  # both expected ids REQUIRED; matched by exact version_id equality
  STABLE_PCT="$(jq -r --arg v "$EXPECTED_STABLE_INPUT" '[.versions[] | select(.version_id == $v) | .percentage] | first // empty' ...)"
  ...
else
  # 0, or 3+, versions — fail closed, this workflow does not guess
fi
```

No `.versions[0]` (or any `.versions[N]` positional index) appears anywhere in the file — verified both by a static regex scan and by a mutation test (§7). Note the `COUNT == 1` branch deliberately uses `.versions[] | .version_id` (iterate-all) rather than `.versions[0].version_id` even though there is only one candidate either way — the point is that nothing is EVER selected by array position, not merely that position 0 happens to be safe in that one case.

Job outputs extended additively: `stable_version_id` and `canary_version_id` alongside the existing `previous_version_id` (evidence JSON field name unchanged, for `verify-production.yml`'s V2 compatibility).

## 6. Phase 5 — Promotion safety (generic mechanism, exercised against the current 10/90 state)

The implementation does not hardcode "10/90" — it validates ANY declared topology against live reality, which is what makes it reusable for every future release, not just this one. Exercised directly against the current real state:

- `docs/release/…` test suite includes a dedicated test using the **exact real current production version ids** (`4a32c5f9-…` @10%, `b07d8697-…` @90%) and asserts `STABLE_VERSION_ID`, `CANARY_VERSION_ID`, `PREVIOUS_VERSION_ID`, and `ROLLBACK_VERSION_ID` all resolve correctly and are pairwise distinct (§7, test 9/10/12).
- The Phase 8 read-only dry evaluation (§8) independently re-confirms this against freshly-fetched real Cloudflare state, not a fixture.
- If the live pre-state ever differs from what an operator declares (wrong id, wrong topology, a stale assumption), the workflow fails closed before touching anything — proven by the "unknown version receiving traffic" and "expected id not found" tests.

## 7. Phase 6 — Rollback command safety

The rollback command emitted on a smoke failure (`Production smoke checks` step) and in the evidence job summary already read `$PREVIOUS_VERSION_ID` — unchanged by this fix, because `PREVIOUS_VERSION_ID` is now itself deterministic. For the current release, the dry evaluation (§8) confirms the rollback command that would be printed is:

```text
npx wrangler versions deploy "b07d8697-620c-485c-8fed-21b893ab602c@100" --config dist/server/wrangler.json --yes
```

— i.e. the real, proven stable version, never the canary and never a positional guess. (Not executed — rollback remains explicitly out of this task's authorization.)

## 8. Phase 7 — Tests

Added `lib/ci/production-version-role-discovery.test.ts` (19 tests), following this repo's established extract-and-execute pattern (`production-smoke-harness.test.ts`): the real "ROLE DISCOVERY" block is extracted verbatim out of the real workflow file and run under `bash -e` (GitHub's real wrapper) against fixture deployment JSON.

| # | Task requirement | Test(s) |
| --- | --- | --- |
| 1 | Single version @100% → stable identified correctly | `single version at 100% is classified as stable` |
| 2 | Two versions 10/90 → roles identified regardless of array order | `two versions at 10/90 (canary-first order) resolve by id, not position` |
| 3 | Same two versions, reversed JSON order → identical role assignment | `same two versions with REVERSED JSON order produce an IDENTICAL role assignment` |
| 4 | Three active versions → fail closed | `three active versions fails closed` |
| 5 | Traffic totals 95 or 105 → fail closed | `traffic totaling 95% fails closed`, `traffic totaling 105% fails closed` |
| 6 | Expected canary missing → fail closed | `2 live versions but expected_current_canary_version_id not provided fails closed` |
| 7 | Expected stable missing → fail closed | `2 live versions but expected_current_stable_version_id not provided fails closed` |
| 8 | Unknown version receiving traffic → fail closed | `an unknown live version matching neither declared id fails closed`, `single declared version with a mismatched single live version fails closed` |
| 9 | 100% promotion pre-state 10/90 → deterministic target state | `the CURRENT real production 10/90 topology resolves deterministically with no ambiguity between roles` |
| 10 | Rollback target remains the original stable version | (same test — asserts `PREVIOUS_VERSION_ID`/`ROLLBACK_VERSION_ID` == the real stable id) |
| 11 | Mutation: reintroducing `.versions[0]` must fail an invariant test | `deploy-production.yml contains no positional .versions[N] selection anywhere (R3 closed)`, `mutation: reintroducing .versions[0]… is caught by the positional-selection detector`, `mutation: the OLD .[-1].versions[0].version_id one-liner would have been caught by the detector` |
| 12 | Promotion of current release never conflates canary/stable/rollback | (same test as 9/10 — explicit `notEqual` assertions between all three) |
| extra | Duplicate/tied percentages don't break id-based matching | `a 50/50 split with EQUAL percentages still resolves correctly by id` |
| extra | Malformed percentages (zero, negative) fail closed | `a zero-percent 'active' version fails closed`, `a negative percentage fails closed` |
| extra | New inputs exist, optional, format-validated pre-checkout | 2 shape tests |

```text
$ node --test lib/ci/production-version-role-discovery.test.ts
ℹ tests 19
ℹ pass 19
ℹ fail 0
```

## 9. Phase 8 — Full verification

```text
$ npm test
ℹ tests 1411
ℹ pass 1411
ℹ fail 0

$ npx tsc --noEmit
(clean, exit 0)
```

**Read-only dry evaluation against the CURRENT real production state** (no state mutation — only `wrangler deployments list`, itself read-only, was called; the exact ROLE DISCOVERY block was extracted from the real workflow file and executed locally against the freshly-fetched real JSON):

```text
$ npx wrangler deployments list --config wrangler.jsonc --env production --json | jq '.[-1]'
{
  "versions": [
    { "version_id": "4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed", "percentage": 10 },
    { "version_id": "b07d8697-620c-485c-8fed-21b893ab602c", "percentage": 90 }
  ]
}

$ EXPECTED_STABLE_INPUT=b07d8697-620c-485c-8fed-21b893ab602c \
  EXPECTED_CANARY_INPUT=4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed \
  <run the extracted ROLE DISCOVERY block>

Topology: live 2-version canary split confirmed — stable b07d8697-620c-485c-8fed-21b893ab602c @ 90%,
canary 4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed @ 10%, matched by exact version id, never by array position.

DRY_RUN_STABLE_VERSION_ID=b07d8697-620c-485c-8fed-21b893ab602c
DRY_RUN_CANARY_VERSION_ID=4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed
DRY_RUN_PREVIOUS_VERSION_ID=b07d8697-620c-485c-8fed-21b893ab602c
DRY_RUN_ROLLBACK_VERSION_ID=b07d8697-620c-485c-8fed-21b893ab602c
EXIT_CODE=0
```

Matches every value Phase 8 required exactly. For contrast, the OLD positional construct run against the same real fixture:

```text
$ jq -r '.[-1].versions[0].version_id' <real production deployment>
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed    # the canary — WRONG, concrete proof of R3
```

## 10. Phase 9 — Does 100% promotion need a new Worker Version?

```text
PROMOTION_MODE:
SEPARATE_WORKFLOW_REQUIRED
```

**Verdict and reasoning:** the safer model for promoting *this exact, already-verified* canary to 100% is **A — reuse the already-uploaded canary Version (`4a32c5f9-…`) and change only its traffic percentage**, never uploading a duplicate Version for the same SHA (preserves release identity, preserves the rollback target, avoids an unnecessary Worker Version, keeps the already-obtained official gate result — `docs/release/PRODUCTION_10_PERCENT_OFFICIAL_VERIFICATION_REPORT.md` — attached to the Version it actually describes).

**But `deploy-production.yml`'s architecture cannot do that safely today**, and retrofitting it in this task was deliberately not attempted:

- Every path through `deploy-production.yml` unconditionally runs `npm ci` → `npm test` → `tsc` → `npm run build` → `wrangler versions upload`. There is no existing "skip build/upload, target an existing Version id" code path — adding one is a materially larger change than R3's narrow scope (a new input to name the existing Version, a conditional that skips five pipeline steps, new validation that the reused Version's SHA/secrets/bindings still match what A1/A2/A3 assert, evidence-capture changes so a promotion is recorded distinctly from a fresh deploy).
- That new path is itself **production-mutating** (it would still call `wrangler versions deploy … @100`) and this task is explicitly not authorized to dispatch anything, change traffic, or promote to 100% — so it could not be exercised against real state to gain confidence before merging it into the one workflow that already deploys.
- Building a second, structurally different code path inside the same file that only one of the two paths gets tested against a real release is worse for auditability than a small, dedicated workflow whose entire job is "move traffic for an existing Version, nothing else" — which can carry the exact same narrow verification-only discipline `verify-production.yml` already uses (read-only pre/post state assertions, `environment: production` gate, no upload capability at all).

**Recommendation (not implemented — proposed only, per the explicit "STOP and propose a separate promotion-only workflow instead" allowance):** a new `promote-production.yml`, narrowly scoped:

```text
name: Promote Production
on: workflow_dispatch:
  inputs:
    confirm: "promote-production"                (typed, distinct from the other two)
    existing_version_id:                          Worker Version ID to promote (must already be
                                                    live in some non-zero capacity — never an
                                                    arbitrary/unverified id)
    expected_current_stable_version_id:            required, validated against live state
    expected_current_canary_version_id:            required, validated against live state — must
                                                    equal existing_version_id
    target_percentage: choice [50, 100]            never 10 (that is deploy-production's job)
environment: production                            same reviewer gate
permissions: contents: read, actions: read          same as the other two — no contents: write

Steps: reuse this task's exact ROLE DISCOVERY logic to assert the live
topology matches expectations (fail closed otherwise) -> assert
existing_version_id has already passed a recorded Verify Production run
(same log-scan technique A2 already uses, pointed at verify-production.yml
instead of deploy-staging.yml) -> wrangler versions deploy
"$existing_version_id@$target_percentage" [+ complementary spec if not 100]
-> the SAME production smoke suite -> the SAME V5-style post-verify
immutable-state comparison -> evidence artifact.
```

No Phase 1 build, no `wrangler versions upload`, no new Worker Version — the smallest, most auditable increment that closes the promotion gap this task's §4 audit identified, kept deliberately separate from the deploy pipeline rather than forced into it. This workflow is **not created in this task** — it is a scoped, reviewable proposal for a future, separately-authorized task.

## 11. Phase 10 — Main registration sync

`deploy-production.yml` changed, so per the same two-step pattern used for PR #3/#4:

1. Implementation committed on `feat/header-hero-integrated` — commit `f1c752b`, pushed.
2. A minimal registration branch `chore/sync-r3-deterministic-version-selection` was created from `origin/main` (via a temporary worktree, removed after push) containing **only** `.github/workflows/deploy-production.yml`, copied byte-for-byte from `feat/header-hero-integrated`.
3. PR #5 opened to `main`: https://github.com/rezachidotnet/ahanassa-website/pull/5 — `OPEN`, `MERGEABLE`, 1 file changed (+192/-4).
4. Blob identity verified: `diff` between `origin/chore/sync-r3-deterministic-version-selection` and `feat/header-hero-integrated`'s copies of the file — no output, confirmed identical.
5. **Not merged** — per this task's explicit authorization boundary.

## 12. What was NOT done

Per explicit authorization scope, none of the following occurred:

- Deploy Production was not dispatched.
- Verify Production was not dispatched.
- No Worker version was uploaded or deployed.
- Cloudflare traffic was not changed — still 10/90 (re-confirmed read-only after all work).
- No rollback was executed.
- No promotion to 100%.
- D1 was not touched.
- No migration was applied.
- No secret was modified.
- GitHub Environment protection was not touched.
- PR #5 was created but not merged.

---

**End of report**
