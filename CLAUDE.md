# CLAUDE.md — `main` (Ahan Asa Website default branch)

**Read this before doing anything else on this branch.**

## What `main` is — and is not

`main` is this repository's default branch, but it is **not** where the live Ahan Asa Website application lives. The real application (Cloudflare Workers + `vinext` + Vite + TypeScript, D1, the RFQ/Odoo integration, the full project `CLAUDE.md`, and the `01-sources/` specialist documentation corpus) lives on `feat/header-hero-integrated`, which has an **unrelated git history** from `main` (`git merge-base origin/main origin/feat/header-hero-integrated` returns no common ancestor — verified, see `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md` on that branch). `main`'s own tree is a small, older, Vercel-era holding-page skeleton kept around only so GitHub Actions can discover `workflow_dispatch` workflow files here (`.github/workflows/deploy-production.yml`, `deploy-staging.yml`, `verify-production.yml` — GitHub only lists a `workflow_dispatch` workflow in its dispatch UI/API if a copy exists on the default branch).

**For any application work — features, content, bug fixes, UI, RFQ, catalog, anything under `app/`, `components/`, `lib/` (beyond `lib/site.ts`) — check out `feat/header-hero-integrated` and read its `CLAUDE.md` first.** Do not attempt application work against `main`'s tree; it is not the application.

## Mandatory: release governance

`main`'s deployment-branch environment policy restricts every real `deploy-production.yml`/`deploy-staging.yml`/`verify-production.yml` dispatch to `feat/header-hero-integrated` — `main` is never itself a deploy source. But release *governance* — the policy that decides how risky a change is and what release path it must take — is kept discoverable here too, specifically so a session starting cold on this default branch cannot miss it:

**Before planning, reasoning about, or executing any staging/production release, deployment, promotion, or emergency rollback of the website — regardless of which branch you end up operating from — read `docs/release/RELEASE_POLICY.md` in this directory, in full.**

That file is a synchronized copy of the authoritative policy maintained on `feat/header-hero-integrated` (kept byte-identical by a dedicated registration sync, the same pattern already used for the three workflow files above — see that document's own header for its current lifecycle state). The release ledger (`docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`) and the policy engine (`lib/ci/release-risk-classifier.ts` and siblings) are **not** duplicated here — they live only on `feat/header-hero-integrated`, since real release classification always needs the actual application diff, which does not exist on this branch. Check out `feat/header-hero-integrated` for those.

Do not:
- perform release-risk classification "from memory" without reading `docs/release/RELEASE_POLICY.md`
- treat `main`'s presence as evidence that its skeleton tree is safe to deploy, or that it is equivalent to the real application
- assume a copy of `RELEASE_POLICY.md` existing here means the release policy is `ACTIVE` — check its own stated lifecycle state (`RELEASE_POLICY.md` §0); as of this file's creation it is `BOOTSTRAP_REGISTERED`, not yet merged into the application branch and not yet wired into any release-time workflow
