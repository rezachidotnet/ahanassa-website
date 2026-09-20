# Production Canary Smoke-Gate Fix — S5 Empty-Catalog Defect

**Report date (UTC):** 2026-09-20
**Scope:** fix the smoke-harness defect that aborted the official gate on the first real production release, and determine the safest way to complete the official 10% canary verification **without disturbing the live 10/90 split**.
**Related:** `docs/release/FIRST_PRODUCTION_10_PERCENT_CANARY_REPORT.md` (the release this fixes the gate for), `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §9 (frozen release architecture), `docs/CATALOG_EDITORIAL_PUBLICATION.md` §6 (per-locale publication rules).

---

## 1. Result summary

```text
RESULT:
PASS

ROOT_CAUSE_CONFIRMED:
YES

FIX:
.github/workflows/deploy-production.yml — S5 slug discovery no longer lets
grep's "no match" exit status terminate the step. grep's status is captured
explicitly; only status 1 (no match) is tolerated, any other status still
fails the gate closed. The `| head -n1` pipeline is also removed (a latent
SIGPIPE-under-pipefail abort on a POPULATED catalog); the first match is now
selected with shell parameter expansion. One hunk, one workflow step. No
assertion removed, relaxed, or made conditional.

REGRESSION_TEST_ADDED:
YES  — lib/ci/production-smoke-harness.test.ts (10 tests)

TEST_RESULTS:
npm test                      1377/1377 pass  (1367 pre-existing + 10 new)
npx tsc --noEmit              clean, exit 0
new test vs. PRE-FIX workflow 7 of 10 fail   (proves it catches the defect)
new test vs. FIXED workflow   10 of 10 pass

PRODUCTION_SMOKE_READ_ONLY:
23 / 23   (the workflow's own corrected script, extracted verbatim and run
           against live production under the same `bash -e` wrapper; its own
           verdict logic recorded `smoke_result=PASSED (23/23)`. No RFQ submitted.)

CURRENT_CANARY_VERSION:
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed

CURRENT_STABLE_VERSION:
b07d8697-620c-485c-8fed-21b893ab602c

CURRENT_TRAFFIC:
10 / 90

PRODUCTION_TRAFFIC_CHANGED:
NO

NEW_WORKER_VERSION_CREATED:
NO

RERUN_FULL_DEPLOY_SAFE:
NO

RECOMMENDED_GATE_COMPLETION_METHOD:
Option C, minimally scoped — a verification-only, dispatch-only workflow that
runs the smoke suite against the EXISTING deployment and nothing else (no
upload, no versions deploy, no D1, no Cloudflare secrets). See §6. Requires
separate owner authorization; NOT implemented here.

READY_TO_COMPLETE_OFFICIAL_10_PERCENT_GATE:
YES  — the corrected gate is proven to pass against the current canary
       (23/23). What remains is running it as an officially recorded
       GitHub Actions run, which needs the §6 method to be authorized.

READY_FOR_100_PERCENT:
NO

REMAINING_ACTION:
R1 — Authorize and add the §6 verification-only workflow, then run it to
     produce an official, recorded 23/23 gate result against the existing
     canary. Do NOT re-dispatch Deploy Production to achieve this (§5).
R2 — Merge PR #3 (main registration-copy sync) when authorized. Open,
     unmerged, one file, byte-identical to the feature branch.
R3 — Separately decide on the PREVIOUS_VERSION_ID design gap found in §5.4.
     It is not the S5 defect and was out of scope to change here, but it
     makes any re-dispatch during an active canary unsafe.
R4 — Only after R1: seek separate authorization for a 100% promotion.
```

---

## 2. Phase 1 — root cause, verified not assumed

### 2.1 The failing code (pre-fix, `deploy-production.yml` line 917)

```bash
SLUG="$(grep -o "href=\"$PREFIX/products/[a-zA-Z0-9_-]\+\"" "$PRODUCTS_BODY_FILE" | head -n1 | sed -E "...")"
```

### 2.2 Errexit is inherited — confirmed from the runner, not inferred

The smoke step declares no `shell:` key, and **no step in the workflow does** (`grep -n "shell:" deploy-production.yml` → no matches). GitHub therefore applies its default wrapper, which run 35533626395's own log states for every step:

```text
Production smoke checks (S1-S10, fa/en/ar locale coverage) => shell: /usr/bin/bash -e {0}
```

The step's first line is `set -uo pipefail`. That **adds** `nounset` and `pipefail`; it does not clear the inherited `errexit`. So `-e`, `-u` and `-o pipefail` are all active.

Consequence: `grep` exits `1` on no match → `pipefail` propagates it → the assignment returns non-zero → `errexit` terminates the step immediately, before line 923's `elif grep -q "${LOCALE_EMPTY_STATE[$LOC]}"` branch — the branch written for exactly this case — can run.

Reproduced in isolation:

```console
$ bash -e repro.sh
before
exit=1          # the empty-state branch is never reached
```

And matching the live failure exactly — the step ended immediately after the fa pass line, with no `SMOKE CHECK FAILED`, no `smoke_result`, and no rollback command printed:

```text
== S5: catalog index (fa/en/ar) ==
  OK — /products [fa] -> 200, discovered a published catalog slug
##[error]Process completed with exit code 1.
```

### 2.3 An empty locale catalog is a legitimate, documented state

Verified from the application, not assumed:

- `components/products/catalog-empty-state.tsx` implements a first-class `"catalog-preparing"` variant with dedicated fa/en/ar copy — the exact strings the workflow's `LOCALE_EMPTY_STATE` map matches on. Its own comment states real products are synced and awaiting editorial review, and that the state is **never** to be replaced with fake products to "look populated."
- `docs/CATALOG_EDITORIAL_PUBLICATION.md` §6 (Locale publication rules) is decisive:

  > FA, EN, AR are independent per `(entity, locale)` rows — publishing FA never requires EN/AR to exist, and vice versa (**live-verified: a published FA row while no EN row existed at all correctly returned zero EN-locale results**).

- Live production matches that shape exactly: fa publishes `hot-rolled-plate-s355jr`; en and ar each render their localized empty-state string.

So production was in a documented, supported, editorially-intended state, and the gate treated it as a fatal shell error. **The subsequent empty-catalog branch was written precisely to handle it and was unreachable.**

### 2.4 Scope of the defect — exactly one site

Every other `grep` in the smoke step sits inside an `if` or `&&` condition, where errexit does not fire. Line 917 was the only assignment taking its value directly from an unguarded `grep`. Confirmed by scanning the file; the fix therefore touches one location.

---

## 3. Phase 2 — the fix

```bash
SLUG=""
SLUG_HREF=""
GREP_STATUS=0
SLUG_HREF="$(grep -o "href=\"$PREFIX/products/[a-zA-Z0-9_-]\+\"" "$PRODUCTS_BODY_FILE")" || GREP_STATUS=$?
if [ "$GREP_STATUS" -gt 1 ]; then
  echo "::error::SMOKE HARNESS ERROR — scanning ... failed with grep status $GREP_STATUS, which is not a 'no match'. Failing closed rather than reporting an unverified catalog as empty."
  exit 1
fi
SLUG_HREF="${SLUG_HREF%%$'\n'*}"
if [ -n "$SLUG_HREF" ]; then
  SLUG="$(printf '%s' "$SLUG_HREF" | sed -E "s#href=\"$PREFIX/products/([a-zA-Z0-9_-]+)\"#\1#")"
fi
```

What it preserves, deliberately:

| Requirement | How |
| --- | --- |
| `set -u` | every variable is initialized before use |
| `pipefail` | untouched; the step-level `set -uo pipefail` is unchanged |
| Fail-closed on real errors | only grep status **1** (no match) is tolerated. Status ≥2 is a genuine grep error and exits the step non-zero — it is never silently read as "empty catalog" |
| All existing assertions | the three S5 outcome branches, and S1–S10, are byte-unchanged |
| No weakening | nothing was made conditional, skipped, or downgraded to a warning |

### 3.1 A second, latent instance of the same bug — also fixed

The old `grep ... | head -n1` carried an independent hazard: under `pipefail`, when the match list is large enough that `head` exits while `grep` is still writing, `grep` takes SIGPIPE and the pipeline reports **141**, which errexit then acts on. That would abort the gate on a **populated** catalog once fa outgrows the pipe buffer — a time bomb that would have fired as the catalog is progressively published.

This is not theoretical: the regression test builds a 20 000-link catalog page and **fails against the pre-fix workflow**.

### 3.2 A wrong first attempt, caught before it shipped

The first version of this fix used `grep -o -m1`. That is **not** a substitute for `head -n1`: `-m1` stops after the first matching *line*, and a page that puts every product link on one line still emits every match — so `SLUG` became a multi-line value and was spliced straight into S6's URL:

```text
+ URL=$'https://www.ahanassa.com/products/hot-rolled-plate-s355jr\nrebar-aj340\nsquare-hollow-section-shs'
+ STATUS=000
```

Caught by running the corrected harness against real production before committing, not by reasoning about it. The final fix selects the first match with parameter expansion (`${SLUG_HREF%%$'\n'*}`) — no pipeline, so no SIGPIPE, and no `-m1` semantics to get wrong. The regression test was then strengthened to make a multi-line slug visible (an earlier revision of the test had masked it by capturing only the first line of output) and now asserts every discovered slug is a single bare token.

---

## 4. Phases 3 & 4 — regression test and verification

### 4.1 `lib/ci/production-smoke-harness.test.ts`

A sibling of the existing `lib/ci/workflow-invariants.test.ts`, but **executing rather than inspecting**. It extracts the real preamble and the real S5 block out of the real workflow file and runs them under the real `bash -e` wrapper, stubbing only the two network-touching helpers (`http_status`, `body_to_file`). `fail()`, `pass()`, the counters, the locale maps and S5 itself are the genuine article, so a reshuffled reintroduction of the bug cannot slip past.

| # | Test | Proves |
| --- | --- | --- |
| 1 | populated catalog, all locales | slug discovery succeeds; slugs are single bare tokens |
| 2 | **fa published, en/ar empty — the exact production shape** | the step does **not** terminate; the empty-catalog branch executes for en and ar; 3 passes, 0 failures |
| 3 | all locales empty | runs to completion |
| 4 | 20 000-link catalog | no SIGPIPE abort; slug is still a single first match |
| 5 | 200 with neither product link nor empty-state | counted as a failure **and** the end-of-suite verdict exits 1 |
| 6 | non-200 catalog index | 3 failures; gate exits 1 |
| 7 | static: no unguarded `grep` command substitution in S5 | guards reintroduction |
| 8 | static: `GREP_STATUS` guard present; no `\| head -n1` | guards both hazards |
| 9 | static: smoke step keeps the default `bash -e` wrapper | the tests keep modelling reality |
| 10 | static: S1–S10 and all three S5 branches still present | no coverage was dropped by the fix |

Tests 5 and 6 are the "does not weaken the gate" half, and they exercise the workflow's real end-of-suite verdict block, not a paraphrase of it.

### 4.2 The test genuinely catches the defect

Re-pointed at the pre-fix workflow:

```text
pre-fix : 10 tests, 3 pass, 7 FAIL
fixed   : 10 tests, 10 pass, 0 fail
```

Test 1 passes against both, correctly — the populated path always worked. Removing just the first-match selection also fails test 4, so that half of the fix is independently protected.

### 4.3 Full local verification

| Command | Result |
| --- | --- |
| `npm test` | **1377 / 1377 pass**, 0 fail |
| `npx tsc --noEmit` | clean, exit 0 |
| `node --test lib/ci/workflow-invariants.test.ts` | 38 / 38 pass (existing CI invariants unaffected) |

### 4.4 The corrected gate against live production — 23/23

The smoke script was extracted **verbatim** from the fixed `deploy-production.yml` and run under `bash -e`, read-only GETs only, **no RFQ submitted**:

```text
== S1 / S1b / S2 / S3 / S4 ...
== S5: catalog index (fa/en/ar) ==
  OK — /products [fa] -> 200, discovered a published catalog slug
  OK — /en/products [en] -> 200, legitimate empty-catalog state
  OK — /ar/products [ar] -> 200, legitimate empty-catalog state
== S6: catalog detail (fa/en/ar) ==
  OK — /products/hot-rolled-plate-s355jr [fa] -> 200, <h1> present
  OK — no published catalog slug for [en]; /en/products/<nonexistent> correctly 404s
  OK — no published catalog slug for [ar]; /ar/products/<nonexistent> correctly 404s
...
== S10: apex redirect ==
  OK — apex -> 308 -> https://www.ahanassa.com/

All production smoke checks passed.
```

The workflow's own verdict logic recorded:

```text
smoke_result=PASSED (23/23)
```

S5's en/ar iterations — the exact ones that killed the official run — now take the intended empty-catalog branch and pass.

---

## 5. Phase 5 — re-run safety audit (**analysis only; nothing was dispatched**)

Production is currently `4a32c5f9@10` / `b07d8697@90`. The question: what would a second dispatch of the same SHA at `rollout_percentage=10` actually do?

The decisive line is the rollback-target capture (line 610):

```bash
PREVIOUS_VERSION_ID="$(npx wrangler deployments list --config dist/server/wrangler.json --json | jq -r '.[-1].versions[0].version_id // empty')"
```

`.[-1]` is the most recent deployment. Before the canary, that deployment contained exactly **one** version at 100%, so `.versions[0]` was unambiguous and correctly returned `b07d8697`. **After the canary it contains two** — `4a32c5f9@10` and `b07d8697@90` — and the expression picks one by array position. The workflow does not sort by percentage, and does not assert which version it got.

### 5.1 Answers

| Question | Answer |
| --- | --- |
| What would `PREVIOUS_VERSION_ID` resolve to? | One of the two versions in the canary deployment, selected purely by array position. If the array preserves the order the specs were passed (`4a32c5f9@10 b07d8697@90`), it resolves to **`4a32c5f9` — the canary itself**, not the stable version. **This is not determinable from the repository**: the array comes straight from the Cloudflare API response, unwrapped by wrangler, and confirming the ordering would require a Cloudflare read this session has no credentials for. Non-determinism is itself the finding. |
| Would another Worker version be uploaded? | **YES.** `wrangler versions upload` mints a new version on every invocation, even for byte-identical code. A re-dispatch creates a third version. |
| Would the existing canary version be replaced? | Not deleted — but it loses its role. It is either promoted to 90% or dropped to 0%, depending on which branch above holds. |
| Could a third version receive traffic? | The deploy call sets exactly the two specs it is given, so at most two versions serve at any instant. But the **identity** of those two changes: the newly uploaded version takes 10%, and one of today's two versions is evicted to 0%. In that sense yes — a third, brand-new version starts taking production traffic. |
| Could the workflow treat the current canary as the previous stable version? | **YES — this is the central hazard.** It would hand `4a32c5f9` — deployed minutes earlier, still under evaluation, and never certified by the official smoke gate — **90% of production traffic**, from a run invoked with `rollout_percentage=10`. Simultaneously `b07d8697`, the genuinely proven stable build, drops to 0% and stops being the rollback target. The release would silently lose its safety net while appearing to perform a conservative 10% canary. |
| Would the resulting split still be deterministic and safe? | The **arithmetic** stays deterministic and is asserted to total 100. The **version identities** are not, and are not asserted anywhere. Not safe. |
| Is re-dispatching appropriate while a 10/90 rollout already exists? | **No.** |

### 5.2 Classification

```text
RERUN_FULL_DEPLOY_SAFE: NO
```

### 5.3 Secondary objection, independent of the above

Even in the benign branch, a re-dispatch would rebuild and upload a **new version for the same SHA**, so the release evidence would no longer describe the artifact that was actually smoke-tested. The 10% canary this task set out to certify would be gone, replaced by an untested one. That alone disqualifies option A.

### 5.4 Design gap recorded (out of scope to change here)

The step's own comment describes capturing "the currently-serving Worker Version ID" — singular. That assumption holds only while a single version serves 100%, and silently breaks in exactly the state a canary creates. A correct implementation would select the **highest-percentage** version (or fail closed when the last deployment has more than one), rather than trusting array order. This is **not** the S5 defect and changing it was outside this task's authorization — logged as remaining action **R3**.

---

## 6. Phase 6 — safest way to complete the official gate (**evaluated, not executed**)

| Option | Preserves 10/90 | No new version | No traffic change | Proves the official gate | Evidence integrity | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **A.** Re-dispatch full Deploy Production at 10% | ✗ | ✗ | ✗ | ✓ | ✗ (certifies a different artifact) | **Rejected** — §5 |
| **B.** Run only the corrected smoke gate against the existing deployment | ✓ | ✓ | ✓ | ✓ (same script) | ~ (locally produced, not an Actions run) | **Already done** — §4.4; good interim proof, weaker as release evidence |
| **C.** Dedicated verification-only / resume-smoke workflow | ✓ | ✓ | ✓ | ✓ | ✓ (official run ID, environment record) | **RECOMMENDED** |
| **D.** Extract the smoke suite to a checked-in script both workflows invoke | ✓ | ✓ | ✓ | ✓ | ✓ | Cleanest long-term; larger change to frozen architecture |

### Recommendation — Option C, minimally scoped

A `workflow_dispatch`-only workflow whose **only** job is the smoke suite, run against the existing deployment:

- contains **no** `versions upload`, **no** `versions deploy`, **no** D1 command, and needs **no** Cloudflare secrets — the suite is entirely unauthenticated HTTPS GETs against `www.ahanassa.com`;
- therefore cannot alter traffic, create a version, or touch data even if it fails;
- produces an official, recorded GitHub Actions run ID for the release evidence, which is the one thing §4.4's local run cannot provide;
- is reusable for every future canary, and for re-verifying a canary that has been soaking.

The one real objection is duplicating the smoke script across two workflow files, which invites drift. That is precisely mitigable with the technique this fix's regression test already uses: a test asserting the two extracted scripts are byte-identical. If the owner would rather avoid duplication entirely, **option D** is the better shape — lift the suite into `scripts/production-smoke.sh` invoked by both workflows, single source of truth — at the cost of a larger edit to `deploy-production.yml`, which `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` treats as frozen architecture.

**Neither C nor D was implemented.** Phase 6 is analysis, and both need separate authorization.

### What is explicitly *not* recommended

Re-dispatching Deploy Production (§5), manually invoking `wrangler versions deploy` to "re-pin" the split, and promoting to 100% to make the gate moot — all rejected.

---

## 7. Phase 7 — workflow registration sync

`deploy-production.yml` changed, so `main`'s registration copy was synchronized using the established minimal pattern (PR #1 `chore/register-production-workflow`, PR #2 `chore/sync-production-workflow-hardening`): a branch cut from `origin/main`, one commit touching one file, no unrelated history.

| Item | Value |
| --- | --- |
| Fix commit (feature branch) | `e2333ea` on `feat/header-hero-integrated`, pushed |
| Sync branch | `chore/sync-production-smoke-gate-fix`, cut from `origin/main` (`3bc0eb4`) |
| Sync commit | `307aaa4` — 1 file changed |
| PR | **#3**, `chore/sync-production-smoke-gate-fix` → `main`, **OPEN, NOT MERGED**, 1 file |

**Blob verification — byte-identical:**

```text
feat/header-hero-integrated : beb3017cd0fba48544200a929b577931fec7d32a
chore/sync-... (PR #3 head) : beb3017cd0fba48544200a929b577931fec7d32a
origin/main (until merged)  : 536905da348986989b6e0e9293b584a65bdad78f
```

PR #3 is deliberately left unmerged pending explicit authorization (**R2**).

---

## 8. Production state — untouched throughout

| Assertion | Result | Evidence |
| --- | --- | --- |
| Traffic split unchanged | **10 / 90** | no `versions deploy` was run; no production dispatch occurred |
| No new Worker version | **NO** | no `versions upload` was run |
| Canary still present | YES | `4a32c5f9` preview URL → 200 |
| No production dispatch | CONFIRMED | Deploy Production still shows **5** runs, newest still `35533626395` (2026-09-20T19:50:45Z) |
| No rollback | CONFIRMED | no rollback command executed |
| D1 / migrations / secrets | UNTOUCHED | nothing in this task invoked wrangler against Cloudflare at all |
| Environment protection | UNTOUCHED | not modified |
| Production health | HEALTHY | 30/30 sampled requests 200, zero 5xx; corrected suite 23/23 |
| Unrelated working-tree drift | UNTOUCHED | left uncommitted, as found |

---

## 9. Bottom line

The gate defect is fixed, the fix is proven against live production at 23/23, and a regression test that genuinely fails on the old code now guards both the reported failure mode and the latent SIGPIPE variant of it.

The canary is still exactly where it was — `4a32c5f9@10` / `b07d8697@90` — and the only thing standing between here and an officially recorded 10% gate result is authorization for the §6 verification-only path. **Re-dispatching Deploy Production must not be used to get there** (§5): it would create an untested version and could hand the current, uncertified canary 90% of production traffic.

Promotion to 100% remains **not** authorized and **not** recommended until the official gate has been recorded.

---

**End of report.**
