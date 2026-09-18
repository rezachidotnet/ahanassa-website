# CI/CD Staging Workflow Indexing Safety Gate

Date: 2026-09-18 (UTC)
Repository: `rezachidotnet/ahanassa-website` (public)
Branch audited: `feat/header-hero-integrated` @ `cf15b0b`
Task type: read-only CI/CD architecture + release safety audit

# RESULT

**PASS.**

The audit answers the question it was asked — and **overturns the premise it was given.**

Two prior findings that this task was told to assume are **false as of today**:

1. **"Vercel Git integration is believed to treat `main` as production-related", so pushing even
   a workflow-only commit to `main` must not be assumed safe.**
   → **The Vercel Git integration is disconnected.** No push to any branch — `main` included —
   can trigger a Vercel build or deployment. Proven two independent ways (§ VERCEL MAIN COUPLING).

2. **"GitHub indexes `workflow_dispatch` workflows from the default branch", and that absence is
   the indexing blocker.**
   → The default-branch statement is directionally right but **not the whole mechanism, and the
   repository contains a counter-example**: `ci.yml` was successfully dispatched via
   `workflow_dispatch` against the **non-default** branch `feat/header-hero-integrated`, while
   `.github/` has **never existed on `main`** (§ GITHUB WORKFLOW INDEXING).

A third fact, not in the task's briefing, materially changes the plan:

3. **`feat/header-hero-integrated` and `origin/main` are unrelated Git histories** — different
   root commits, no merge base. `main` is a 3-commit legacy holding page. **Any plan involving
   "merge the workflow to main" is impossible without `--allow-unrelated-histories` and must not
   be attempted.** The correct operation is a single additive commit on `main`, not a merge.

Recommendation: **`SAFE_TO_INDEX_WORKFLOW_ON_MAIN`**.

Nothing was deployed, pushed, merged, or mutated. No Cloudflare or Vercel write call was made.

# CURRENT GIT STATE

| Item | Value |
|---|---|
| Current branch | `feat/header-hero-integrated` |
| HEAD | `cf15b0be4368b4d49da270dcf4621d46ec5f7811` |
| Default branch | `main` (`refs/remotes/origin/HEAD` → `origin/main`, confirmed via API) |
| `origin/main` HEAD | `d22d7529dd7dd521443699c963b8b95e6943be78` — "fix: align canonical URLs with www domain" (2026-08-18) |
| Remote | `git@github.com:rezachidotnet/ahanassa-website.git` |
| Repository visibility | **public** |
| Working tree | 2 modified (`REPORT_BUNDLE_MANIFEST.txt`, `tsconfig.tsbuildinfo`), 1 untracked (prior audit doc) — all pre-existing, none created by this task |

**Lineage — the critical, previously unrecorded finding:**

```
$ git merge-base HEAD origin/main
exit=1                                         # NO common ancestor

$ git rev-list --max-parents=0 HEAD
d108f01d02db15da4fbca0a48543bbcd319bd297       # feature-branch root

$ git rev-list --max-parents=0 origin/main
c2f6e13bd61dbce988a88220b0fcd311b824140c       # main root

$ git rev-list --left-right --count origin/main...HEAD
3	155                                        # 3 on main, 155 on the feature branch

$ git rev-list --count origin/main
3
```

`origin/main` is the **legacy Vercel holding page**, not an older state of this site. Its entire
tree is:

```
.env.example  .gitignore  README.md  app  eslint.config.mjs  lib
next-env.d.ts  next.config.ts  package-lock.json  package.json  tsconfig.json
```

Its `package.json` is a plain Next.js 16.3.1 app — **no `vinext`, no `wrangler`, no Cloudflare
tooling, no `test` script**. The real website (155 commits, Cloudflare Workers + vinext + D1)
shares no history with it.

Consequence: **`main` cannot receive the feature branch by merge, rebase or fast-forward.** It can
only receive an independent, additive commit.

# CURRENT CI

`.github/workflows/ci.yml` — **indexed and working.**

| Property | Value |
|---|---|
| Triggers | `push` (all branches), `pull_request`, `workflow_dispatch` |
| `concurrency` | `ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true` |
| `permissions` | `contents: read` |
| Environment | none |
| Secrets referenced | **none** |
| Steps | checkout@v4 → setup-node@v4 (Node 24, npm cache) → `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run build` |
| Cloudflare commands | **none** |
| Migration commands | **none** |
| Deploy | **none** |
| Workflow ID | `357303552`, state `active` |

Runs on record — **both green**:

| Created (UTC) | Event | Branch | SHA |
|---|---|---|---|
| 2026-09-13T19:58:06Z | **`workflow_dispatch`** | `feat/header-hero-integrated` | `7bb2c34` |
| 2026-09-13T19:36:40Z | `push` | `feat/header-hero-integrated` | `7bb2c34` |

# CURRENT STAGING DEPLOY WORKFLOW

`.github/workflows/deploy-staging.yml` — present on the feature branch, **never indexed, never run.**

| Property | Value |
|---|---|
| Triggers | `workflow_dispatch` **only**, with one required string input `confirm` |
| Guard | step 1 fails unless `confirm == "deploy-staging"`, **before** checkout and before any secret is used |
| `concurrency` | `deploy-staging`, `cancel-in-progress: false` (serialised; never cancels a deploy mid-flight) |
| `permissions` | `contents: read` |
| Environment | `staging` (GitHub Environment) |
| Secrets referenced | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — both from the `staging` environment only |
| Build steps | `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run build` |
| Deploy command | `npx vinext-cloudflare deploy --env staging` |
| Migration commands | **none** — deliberately excluded and documented in the file header |
| Rollback | **none** in-workflow (Cloudflare Worker version rollback is a separate manual action) |
| Checkout ref | `actions/checkout@v4` with **no `ref:`** → resolves to `github.sha` |
| Can it target production? | **No** — see below |

**Can `deploy-staging.yml` ever target production resources?** Not by its own inputs. `--env staging`
is a literal string with no interpolation, and `confirm` is the workflow's only input — there is no
input that can change the environment, worker name, or database. The one residual path is discussed
under STAGING ISOLATION.

**Deploy command is verified-correct, not merely plausible.** `package.json`'s `deploy` script is
`vinext-cloudflare deploy --config dist/server/wrangler.json`, which differs from the workflow's
`--env staging` form. This is **not** a defect: `docs/release/STG_P1_CONTROLLED_STAGING_EXECUTION_REPORT.md`
records that the one successful, owner-authorised staging deploy ran **exactly**
`npx vinext-cloudflare deploy --env staging` and produced live Worker version
`65df028c-b865-4b86-885f-ab64b8f2987c`. The workflow runs the proven command.

# GITHUB WORKFLOW INDEXING

**Confirmed: `deploy-staging.yml` is not indexed. Refuted: the stated reason for it.**

Evidence:

```
$ gh api repos/rezachidotnet/ahanassa-website/actions/workflows --jq .total_count
1
# the only indexed workflow:
{"id":357303552,"name":"CI","path":".github/workflows/ci.yml","state":"active"}
```

File presence, checked per-ref:

| File | on `main` | on `feat/header-hero-integrated` | indexed |
|---|---|---|---|
| `.github/workflows/ci.yml` | **404 — absent** | present (`faf1c9f`, 871 B) | **YES** (`357303552`) |
| `.github/workflows/deploy-staging.yml` | **404 — absent** | present (`00868c6`, 2265 B) | **NO** |
| `.github/` (directory) | **404 — absent** | present | — |

`main` has never had `.github` in **any** of its three commits:

```
$ for c in $(git rev-list origin/main); do git ls-tree -r $c --name-only | grep -c '^\.github'; done
0
0
0
```

**What this proves, and what it does not.**

*Proven:*

- Merely existing on a non-default branch does **not** index a workflow. `deploy-staging.yml` has
  been pushed on `feat/header-hero-integrated` since 2026-09-13 and is still unindexed six days later.
- A workflow that **has** been indexed **can** be dispatched against a non-default branch, even
  when the file is absent from the default branch — `ci.yml`'s successful 2026-09-13
  `workflow_dispatch` run on `feat/header-hero-integrated` is a direct counter-example to the
  blanket claim in the task briefing.
- The difference between the two files is their trigger set: `ci.yml` carries `on: push`, so a push
  to the feature branch produced a run, and **the run is what registered the workflow**.
  `deploy-staging.yml` is `workflow_dispatch`-only, so it has never produced a run — and it cannot
  be dispatched to produce one, because it is not registered. **That is the actual deadlock.**

*Not proven here (stated as such, not guessed):* that placing the file on `main` will register it.
This is GitHub's documented behaviour for `workflow_dispatch` and is consistent with every
observation above, but it cannot be verified without a write, which this audit does not perform.

`WORKFLOW_DISPATCH_AVAILABLE` for `deploy-staging.yml`: **NO**.

# VERCEL MAIN COUPLING

Vercel project: `ahanassa-website` / `prj_NoKwW7dH04S8sElswllEz5LMENLX`, team
`team_ona8DnGZjyJXL58icYi0GYaF` (from the gitignored `.vercel/project.json`). CLI authenticated
read-only as `rezachidotnet`. **No Vercel write call was made.** No token value was printed.

**Finding: the Git integration is disconnected. This is a change from the documented state.**

`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8 and `docs/release/CI_CD_POLICY.md` both record, from a
2026-09-02 audit (DAR-048), that Vercel auto-deployed *every* pushed branch and that Production was
tied to `main`. **That was true then. It is not true now.**

*Line of evidence 1 — project configuration.* The Git link object is absent, on three API versions:

```
GET /v9|v10|v13/projects/prj_NoKwW7dH04S8sElswllEz5LMENLX  → HTTP 200
link = nil          (on all three)
repoId / gitCredentialId keys: 0 occurrences in the response body
```

(The `github*` keys that do appear in the payload live inside historical *deployment* `meta`
objects, not a project-level link.)

*Line of evidence 2 — deployment history vs. push history.* Every git-sourced deployment stops dead
on 2026-09-02:

| Created (UTC) | Branch | Target | State | Source |
|---|---|---|---|---|
| 2026-09-02 15:04:18 | `chore/final-go-live-readiness` | preview | ERROR | git |
| 2026-09-02 14:42:26 | `chore/final-go-live-readiness` | preview | ERROR | git |
| 2026-09-02 14:16:55 | `fix/rfq-launch-uom-policy` | preview | ERROR | git |
| … 12 more, all `preview`, all `ERROR`, all `git`, 2026-08-30 → 2026-09-02 | | | | |

**Nothing after 2026-09-02T15:04:18Z** — yet pushes demonstrably continued:

- `feat/homepage-product-projection`, `chore/final-go-live-readiness` — pushed 2026-09-03
- `fix/contact-rfq-layout-direction` — pushed 2026-09-03
- `feat/header-hero-integrated` — repository `pushed_at` = **2026-09-13T19:36:30Z**, which triggered
  the GitHub Actions CI run at 19:36:40Z, ten seconds later

Several pushes across eleven days produced **zero** Vercel deployments. Before 2026-09-02, every
push produced one. The behavioural break and the missing `link` agree.

**Answers to the five required questions:**

| | Question | Answer | Basis |
|---|---|---|---|
| A | Is GitHub `main` currently configured as Vercel production branch? | **No longer configured — the integration is disconnected.** The *existing* production deployment was built from `main` @ `d22d752`. | `link = nil`; production target meta `githubCommitRef = "main"`, `sha = d22d7529dd` |
| B | Does ANY push to `main` trigger a Vercel build/deployment? | **NO** | Both lines of evidence above |
| C | Would a workflow-only commit under `.github/` trigger Vercel? | **NO** — no push triggers anything; the path is irrelevant | Same |
| D | Is there an ignore rule excluding docs/`.github`-only changes? | **No, and none is needed.** `commandForIgnoringBuildStep = nil`; no `vercel.json` on any branch | Project API; `git ls-tree` on both refs |
| E | Is automatic production deployment currently enabled or disabled? | **Disabled** — no git trigger path exists. `gitProviderOptions.createDeployments` is still `"enabled"`, but that setting is inert without a link | Project API |

**The existing production deployment is unaffected and remains the rollback target.** Disconnecting
Git does not undeploy anything: `dpl_AYQocUU3aHKmqSxYsb8qnDSVFtnH` (built 2026-08-18 from `main` @
`d22d752`) is still `READY`.

**Live public reality, verified this session** — and it differs from this task's briefing:

```
$ curl -I https://ahanassa.com/       → HTTP/2 308 → https://www.ahanassa.com/   server: Vercel
$ curl -I https://www.ahanassa.com/   → HTTP/2 200                                server: cloudflare
```

The briefing says "public ahanassa.com still points to legacy Vercel". **Half of that is now stale:**
the canonical, content-serving host `www.ahanassa.com` is **already served by Cloudflare**; only the
apex `ahanassa.com` → `www` **308 redirect** is still Vercel. This matches
`GO_LIVE_CUTOVER_RUNBOOK.md`'s record of the 2026-09-02 custom-domain attach.

Even in the worst hypothetical — someone reconnects the Git integration later — a `.github`-only
commit on `main` would rebuild the *legacy holding page from `main`'s own tree*, which is a valid
standalone Next.js app, and would reproduce the same apex redirect. The new Cloudflare codebase is
not on `main` and would not be built.

# STAGING ISOLATION

**Proven isolated — by distinct names *and* distinct resource IDs**, read from `wrangler.jsonc`:

| Resource | `env.staging` | `env.production` |
|---|---|---|
| Worker name | `ahanassa-bootstrap-staging` | `ahanassa-production` |
| `DB_OPS` | `ahanassa-ops-staging` / `49bd0aff-e289-4fff-b7b9-0f4b517e6b14` | `ahanassa-ops-production` / `7240a6a7-c293-4e6e-baf3-95838a3c2944` |
| `DB_PUBLIC` | `ahanassa-public-staging` / `35cef70f-3ad3-4049-add4-ddcac6cac45b` | `ahanassa-public-production` / `73ba6b50-ef57-4d89-baa9-617a0b0af127` |
| Queue | `ahanassa-odoo-sync-staging` (+ `-dlq`) | `ahanassa-odoo-sync-production` (+ `-dlq`) |
| Rate-limit namespace | `1002` | `2001` |
| Cron triggers | `[]` (none) | 3 crons |

No name, no ID, and no queue is shared. Cloudflare bindings do not inherit across `env` blocks, so
`--env staging` resolves the staging column in full.

**GitHub-side isolation:**

| Check | Value |
|---|---|
| Repository-level Actions secrets | **0** |
| `staging` environment secrets | exactly `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| `Preview` / `Production` environment secrets | **0** each (vestigial, auto-created by the old Vercel integration) |

Because there are **no repository-level secrets**, a workflow that does not declare
`environment: staging` has no Cloudflare credentials at all. This is a strong structural guarantee.

`STAGING_WORKER_ISOLATED: YES`. `STAGING_D1_ISOLATED: YES`.

**One residual risk, disclosed rather than glossed.** The `staging` environment has
`deployment_branch_policy: null` and `protection_rules: []` — **any branch may deploy to it, with no
reviewer**. Combined with the fact that `workflow_dispatch` executes the workflow *and reads
`wrangler.jsonc`* from the **dispatched ref**, someone could dispatch from a branch whose
`env.staging` block had been edited to carry production IDs, and `--env staging` would then resolve
to production resources. This is not reachable from the workflow's own inputs, and the Cloudflare API
token's scope is the real backstop, but it is the one path by which a "staging" dispatch could touch
production. Fixing it is one API call (a deployment branch policy) and is included in the plan below.

# EXACT SHA DEPLOYMENT

**`EXACT_SHA_PROMOTION: NO`.**

What the workflow does today:

- `actions/checkout@v4` is used with **no `ref:`**, so it checks out `github.sha`.
- For `workflow_dispatch`, `github.sha` is the **tip of the selected ref at dispatch time**.
- The GitHub dispatch UI and `gh workflow run --ref` accept a **branch or tag — not an arbitrary
  commit SHA**.
- The workflow **rebuilds from source**; it does not consume an artifact produced by `ci.yml`. CI and
  deploy are independent builds of (usually) the same tree.

So a run *is* pinned to one SHA once it starts, and is auditable after the fact — but the operator
cannot *choose* a commit, and a push landing between decision and dispatch silently changes what
ships. That is exactly the ambiguous "whatever is currently on the branch" promotion this audit was
asked to flag.

**Smallest improvement needed** (not a pipeline redesign — four lines):

```yaml
  # in on.workflow_dispatch.inputs
      ref:
        description: "Exact commit SHA to deploy (defaults to the tip of the selected branch)."
        required: false
        type: string
```

```yaml
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.ref || github.sha }}

      - name: Record deployed commit
        run: git rev-parse HEAD
```

This keeps today's behaviour as the default, allows exact-SHA promotion when wanted, and prints the
resolved commit into the run log for the deployment record. Artifact promotion from CI would be the
stronger design but is a larger change and is **not** required to close this gap.

# OPTIONS

| | Option | Indexes the workflow? | Vercel side effect | Staging reliability | Production risk | Maintainability | Exact-SHA | Rollback | Operator complexity |
|---|---|---|---|---|---|---|---|---|---|
| **A** | Add `deploy-staging.yml` to `main` as one additive commit | **Yes** (documented mechanism) | **None** — integration disconnected | High — dispatch against the feature branch runs the feature branch's file | **Very low** | Good — one small file on an inert branch | Unchanged (add the 4-line input) | `git revert` on `main` | **Lowest** |
| B | Minimal stub/dispatcher workflow on `main`, implementation stays on feature branch | Yes | None | High | Very low | Fair — two files that can drift; the stub is dead weight because `workflow_dispatch` already executes the dispatched ref's copy | Unchanged | Revert | Medium |
| C | Temporarily change GitHub's default branch | Yes | None | High | **Elevated** — default branch drives PR bases, protection, clones and the Vercel production branch **if the link is ever restored**; easy to leave in the wrong state | Poor — a global setting toggled for a local need | Unchanged | Restore setting | Medium |
| D | Decouple/disable Vercel Git production deploys first, then place the workflow on `main` | Yes | None | High | Very low | — | Unchanged | — | **Wasted** — the decoupling is **already done**; this option's prerequisite is satisfied, which collapses it into A |
| E | Reusable workflow: dispatcher on `main`, implementation called by exact SHA/ref | Yes | None | High | Very low | Heavier — two coupled files, pinned refs to bump on every change | **Best** — structurally SHA-pinned | Revert + re-pin | **Highest** |
| F | Add a benign registering trigger (e.g. `on: push` with a self-referencing `paths` filter) so the workflow registers without touching `main` | **Probably** — untested; relies on the `ci.yml` precedent | None | High | Low | Poor — every matching push creates a deliberately *failing* run (the `confirm` guard trips), which is permanent red noise; also requires **changing a workflow**, which this task forbids | Unchanged | Revert | Medium |

Note on **D**: it was the correct recommendation when written, on 2026-09-02 evidence. Today its
precondition is already met, so recommending it would be recommending a no-op.

Note on **F**: it is the only option that never touches `main`, which is why it is listed despite its
drawbacks. Its safety rests on the `confirm` guard tripping before checkout and before any secret is
read — which the file's structure does guarantee. It is the fallback if the documented default-branch
mechanism somehow does not hold.

# RECOMMENDATION

**`SAFE_TO_INDEX_WORKFLOW_ON_MAIN`**

Evidence basis, in order of weight:

1. **The blocker that made this unsafe no longer exists.** Vercel's Git integration is disconnected
   (`link = nil` across three API versions; zero git-sourced deployments across eleven days of
   pushes). No push to `main` can trigger a Vercel build. Questions B and C above are both **NO**.
2. **The blast radius is bounded even if that changes.** `main` is a self-contained 3-commit legacy
   holding page with unrelated history. A `.github`-only commit adds no code to it. If the Git link
   were ever restored, the rebuild would reproduce the same holding page.
3. **The live public surface is already off Vercel** for the canonical host — `www.ahanassa.com` is
   served by Cloudflare; only the apex 308 redirect remains on Vercel.
4. **Staging cannot reach production through the workflow's own inputs** — distinct worker, distinct
   D1 IDs, distinct queues, hardcoded `--env staging`, and zero repository-level secrets.
5. **Option A is the smallest change that resolves the deadlock**, and `workflow_dispatch` executes
   the workflow file from the *dispatched ref*, so the copy on `main` does not need to be kept in
   lockstep with the feature branch for correctness.

This recommendation is **conditional on one owner decision**: `main` must be touched by a direct
additive commit. If the owner's standing rule is that `main` is never touched under any
circumstance, the answer becomes option **F**, and this should be re-raised.

# IMPLEMENTATION PLAN

**Design only. Nothing below was executed.**

### Files to change

| File | Branch | Change |
|---|---|---|
| `.github/workflows/deploy-staging.yml` | `main` | **New.** Copy of the feature branch's file, plus the `ref` input and `ref:`/`git rev-parse` lines from EXACT SHA DEPLOYMENT, plus the branch guard below |
| `.github/workflows/deploy-staging.yml` | `feat/header-hero-integrated` | Same `ref` input + checkout change, so both copies agree |

### Must `main` change?

**Yes — one additive commit, never a merge.**

```bash
git fetch origin
git switch --detach origin/main
# create ONLY .github/workflows/deploy-staging.yml here
git switch -c chore/index-staging-workflow
git add .github/workflows/deploy-staging.yml
git commit -m "ci: index staging deploy workflow on main"
git push -u origin chore/index-staging-workflow
# then open a PR into main and merge it (or push straight to main if the owner prefers)
```

**Never** run `git merge feat/header-hero-integrated` into `main`, with or without
`--allow-unrelated-histories`. The histories are unrelated by design.

### Must Vercel change first?

**No.** The integration is already disconnected. Do **not** delete or unlink the Vercel project —
`GO_LIVE_CUTOVER_RUNBOOK.md` §8.2 keeps it intact as the rollback target, and it still serves the
apex redirect.

### Guard against dispatching against `main`

`main`'s own tree has no `vinext`, no `wrangler.jsonc`, and no `test` script, so a dispatch against
`main` would fail at `npm test` — safely, but by accident. Make it explicit, as the first step:

```yaml
      - name: Refuse to deploy from main
        if: github.ref_name == 'main'
        run: |
          echo "::error::main holds the legacy Vercel holding page, not the Cloudflare site. Dispatch against the application branch."
          exit 1
```

### Close the environment gap (one API call, no code)

```bash
gh api -X PUT repos/rezachidotnet/ahanassa-website/environments/staging \
  -f 'deployment_branch_policy[protected_branches]=false' \
  -f 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST repos/rezachidotnet/ahanassa-website/environments/staging/deployment-branch-policies \
  -f name='feat/*'
```

This is what removes the residual "dispatch from a branch with a doctored `wrangler.jsonc`" path.

### Verification (after the commit, before any deploy)

```bash
gh api repos/rezachidotnet/ahanassa-website/actions/workflows \
  --jq '.workflows[]|{name,path,state}'        # expect deploy-staging.yml listed
gh workflow list                                # expect "Deploy Staging" present
curl -sI https://www.ahanassa.com/ | head -1    # unchanged: 200, server: cloudflare
curl -sI https://ahanassa.com/     | head -1    # unchanged: 308 → www, server: Vercel
```

Then confirm Vercel did not react:

```
GET /v6/deployments?projectId=prj_NoKwW7dH04S8sElswllEz5LMENLX
# expect newest deployment still 2026-09-02T15:04:18Z
```

### First staging dispatch procedure

1. Confirm `ahanassa-production`'s active Worker version first, as the untouched baseline:
   `npx wrangler deployments list --name ahanassa-production`
   (expected `b07d8697-620c-485c-8fed-21b893ab602c`, per STG-P1).
2. Dispatch **against the application branch**, never `main`:
   `gh workflow run "Deploy Staging" --ref feat/header-hero-integrated -f confirm=deploy-staging`
   (add `-f ref=<sha>` once the exact-SHA input is in place).
3. Watch: `gh run watch`.
4. Verify the new staging version: `npx wrangler deployments list --name ahanassa-bootstrap-staging`
   — expect a version **different from** `65df028c-b865-4b86-885f-ab64b8f2987c`.
5. Re-confirm production is **unchanged** by repeating step 1.
6. Migrations remain a separate manual action. The workflow never runs them, by design.

### Rollback

| If | Then |
|---|---|
| The `main` commit is unwanted | `git revert` it on `main`. The workflow de-indexes; nothing else is affected |
| A staging deploy is bad | Cloudflare Worker version rollback to `65df028c-b865-4b86-885f-ab64b8f2987c` — outside this workflow, unchanged by this plan |
| Anything looks wrong on the public site | Nothing in this plan touches it; `www` is Cloudflare, apex is the untouched Vercel deployment |

# PRODUCTION SAFETY

`PRODUCTION_CHANGED: NO`. `WORKFLOWS_CHANGED: NO`.

| Constraint | Status |
|---|---|
| Deployment performed | NO |
| Push to `main` | NO |
| Merge to `main` | NO — and confirmed impossible without `--allow-unrelated-histories` |
| Production change | NO |
| Cloudflare mutation | NO — no `wrangler` write command was run; no Cloudflare API call at all |
| Vercel mutation | NO — read-only `GET` only (`/v9,v10,v13/projects`, `/v6/deployments`) |
| Workflow files changed | NO |
| App code / migrations changed | NO |
| Secret values exposed | NO — only secret **names** were listed; no token was printed |
| Anything dispatched | NO — no workflow was run, including `ci.yml` |

The only writes this task makes are this report and one appended manifest line, committed locally and
**not pushed**.

# NEXT STEP

**Owner decision: authorise one additive commit to `main` adding `.github/workflows/deploy-staging.yml`**
(Option A, as specified in IMPLEMENTATION PLAN). The Vercel precondition that previously blocked this
is already satisfied — verify that independently if desired via `link = nil` on
`GET /v9/projects/prj_NoKwW7dH04S8sElswllEz5LMENLX` and the deployment-history gap since
2026-09-02T15:04:18Z.

Two secondary items, neither blocking:

1. Add the `ref` input for exact-SHA promotion (four lines, EXACT SHA DEPLOYMENT).
2. Add a `deployment_branch_policy` to the `staging` environment, which currently accepts a deploy
   from any branch with no reviewer.

Also worth correcting in the record: `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8 and
`docs/release/CI_CD_POLICY.md` line 46 both still assert that Vercel auto-deploys every push and that
`main` is the live production branch. Both statements are now stale and, left uncorrected, will keep
blocking this exact decision in future audits.
