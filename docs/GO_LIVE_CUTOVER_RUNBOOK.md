# Go-Live Cutover Runbook — `ahanassa.com` (Stage 2B — `www` LIVE, apex pending)

**Status:** `www.ahanassa.com` cutover **executed and verified live** on 2026-09-02 — see "Execution record" below for what actually happened (including one regression found and fixed) versus the plan as originally written in the rest of this document. The apex `ahanassa.com` → `www.ahanassa.com` redirect (§7 below) remains **not executed** — blocked on Cloudflare zone write access, not a defect; see the execution record. Sections 1–12 below are the original pre-cutover plan, left as reference — where they describe a step that has now actually happened, the execution record is authoritative for what occurred.

---

## Execution record (2026-09-02, `DOCUMENT_AUDIT_REPORT.md` DAR-050)

Full detail lives in DAR-050 — this is a pointer, not a duplicate. Summary: source commit `39db058` (Basic Auth removed) deployed as Worker version `cbbf0344-2e08-4e82-b7dc-b453b635de6e` at 100% traffic; `PREVIEW_BASIC_AUTH_USER`/`PASSWORD` secrets deleted; Turnstile reconfirmed unchanged (`workers.dev`/`www.ahanassa.com`/`ahanassa.com`, all via `wrangler turnstile widget list --json`, never `get`); the project owner deleted the conflicting `www.ahanassa.com` Vercel CNAME directly (the executing agent has no Cloudflare zone write access); `www.ahanassa.com` was then attached as a Worker Custom Domain to the existing `ahanassa-production` Worker at `2026-09-02T16:01:56Z`, TLS valid immediately, full smoke/SEO/Catalog/RFQ-UoM/Turnstile-fail-closed/Queue/Cron/DLQ/Odoo-read-only gate passed. **A regression was found and fixed along the way:** the first (failed) Custom Domain attach attempt silently disabled `workers.dev` as a side effect (root cause: `workers_dev` was never explicit in `wrangler.jsonc`) — execution stopped immediately per this task's own explicit instruction, was reported to the owner rather than worked around, then repaired (owner-authorized continuation) by adding `"workers_dev": true` permanently and redeploying triggers without the still-blocked `routes` block present, before retrying the Custom Domain attach once DNS was actually clear. Apex `ahanassa.com` was not modified — still Vercel, unchanged — the redirect step is open pending zone write access (Cloudflare Redirect Rules, like the DNS deletion, are outside every `wrangler` subcommand and this agent's token scope).

---

## 1. Final source commit / version

- The cutover deploys whatever commit is `main`'s tip at the moment the owner authorizes cutover — not necessarily the commit that produced this document. Before running §4, confirm: `git log -1 --oneline main` and cross-check against the most recent `DOCUMENT_AUDIT_REPORT.md` entry to ensure no unmerged readiness work is missing.
- Tag the exact commit that gets deployed (e.g. `git tag cutover-2026-XX-XX <sha>`) so the rollback commands in §11 have an unambiguous target — not done automatically by this runbook; a human step at cutover time.

## 2. Final Worker deployment

```bash
rm -rf dist
CLOUDFLARE_ENV=production npx vinext build     # see docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md §2 for why this env var matters
npx wrangler versions upload --config dist/server/wrangler.json --message "Cutover: <commit sha>"
# Review the printed version ID and bindings, then:
npx wrangler versions deploy <version-id>@100 --config dist/server/wrangler.json
```

This is the same `ahanassa-production` Worker already live at `workers.dev` — no new Worker is created for cutover. Confirm via `wrangler versions view <version-id>` that all 4 secrets (`ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `PREVIEW_BASIC_AUTH_USER`, `PREVIEW_BASIC_AUTH_PASSWORD`) are present **before** proceeding to §3 (Basic Auth removal) — §3 removes 2 of these 4; do not skip straight to §3 without confirming this deploy succeeded and is serving correctly at its `workers.dev` URL first.

## Corrected operational order (2026-09-02, `DOCUMENT_AUDIT_REPORT.md` DAR-049)

**Turnstile hostname readiness (§4) must be confirmed before Basic Auth removal (§3), not after** — the numbered sections below are individually-accurate action descriptions, not a strict execution sequence; use this order instead:

1. Freeze cutover window.
2. Capture final DNS/Vercel/Cloudflare snapshots.
3. Verify final source/runtime SHA.
4. ~~Disconnect Vercel's Git integration (§8) — before `main` is ever touched again.~~ **DONE as of 2026-09-19** — the integration is disconnected and re-verified; no longer a blocking cutover step (see §8's status update).
5. **Confirm the Turnstile widget's domain allowlist already contains `www.ahanassa.com` and `ahanassa.com`** — see §4: this step is **already done** as of 2026-09-02, ahead of the rest of cutover, precisely so it never blocks or races the domain-activation steps below.
6. Remove Preview Basic Auth (§3), in an isolated commit.
7. Run full tests.
8. Deploy the public-mode Worker version.
9. Verify workers.dev public-mode security (no Basic Auth, all other protections intact).
10. Attach `www.ahanassa.com` to the Worker (§5).
11. Configure `ahanassa.com` → `www.ahanassa.com` (§6/§7).
12. Verify TLS and redirects.
13. Verify Turnstile on the real `www` hostname (already allowlisted per step 5 — this step is a live confirmation, not a configuration change).
14. Website/Catalog/Product/RFQ/SEO smoke (§9).
15. Queue/Cron/Odoo health.
16. Monitor (§12).
17. Roll back if required (§10/§11).

## 3. Basic Auth removal

Only after §2's deploy is confirmed healthy at its `workers.dev` URL, **and after §4's Turnstile hostname readiness is confirmed** (see "Corrected operational order" above — Turnstile allowlist readiness precedes Basic Auth removal, not the reverse). Exact steps (unchanged from `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §7, restated here for cutover-time convenience):

1. Delete `lib/security/preview-auth.ts` and `lib/security/preview-auth.test.ts`.
2. In `workers/entry.ts`, remove the `checkPreviewBasicAuth` import and the `if (env.APP_ENV === "production") { ... }` block — revert the `fetch` handler to the plain `fetch: vinextHandler.fetch` property reference.
3. `npm test` — confirm the 10 `preview-auth.test.ts` tests are gone (not skipped, removed with the file) and nothing else regresses.
4. Commit this as its own small, isolated commit (e.g. `chore: remove temporary preview Basic Auth gate before cutover`) — never bundled with an unrelated change, so it's trivially revertable on its own if needed.
5. Redeploy (§2's build+upload+deploy sequence again) with this commit.
6. `wrangler versions secret delete PREVIEW_BASIC_AUTH_USER --config dist/server/wrangler.json` and the same for `PREVIEW_BASIC_AUTH_PASSWORD` — remove the now-unused secrets from the Worker. Do this **after** confirming the redeployed code no longer references them (step 5 already deployed code that doesn't check them, so removing the secret values is safe and non-breaking).
7. Verify: `curl -I https://ahanassa-production.nova-b1e6f0.workers.dev/` now returns `200` (or a normal redirect) without any `Authorization` header, not `401`.

**This step must happen before §7 (DNS cutover)** — the public domain must never be pointed at a Worker still gated behind Basic Auth.

## 4. Turnstile real-domain validation

**Hostname allowlist step already completed, 2026-09-02 (`DOCUMENT_AUDIT_REPORT.md` DAR-049) — ahead of the rest of cutover, on purpose, so it can never block or race the domain-activation steps.** Via `wrangler turnstile widget update 0x4AAAAAAEi2RZ3NHcqTk0ej --domain ahanassa-production.nova-b1e6f0.workers.dev --domain www.ahanassa.com --domain ahanassa.com`, read back and confirmed via `wrangler turnstile widget get`: the existing widget (same sitekey `0x4AAAAAAEi2RZ3NHcqTk0ej`, same `managed` mode, same secret — nothing rotated or replaced) now allows exactly three hostnames: `ahanassa-production.nova-b1e6f0.workers.dev`, `www.ahanassa.com`, `ahanassa.com` — no wildcard, no unrelated domain. The `workers.dev` entry was deliberately preserved (not removed) — it remains the pre-cutover validation endpoint while Basic Auth is still active; remove it only after §9's post-cutover monitoring window has passed, as a separate, later, explicit step (not part of this runbook's execution).

Remaining, not yet performed:

1. After §7 (DNS live), submit one real (or the owner's own) RFQ against `https://ahanassa.com/contact` using the real Turnstile widget on the now-real hostname and confirm a `200`/success — this is covered by §9.

## 5. Worker custom-domain/route attachment

```bash
# Via wrangler.jsonc env.production, add a routes/custom_domains block, e.g.:
#   "routes": [{ "pattern": "ahanassa.com/*", "custom_domain": true }, { "pattern": "www.ahanassa.com/*", "custom_domain": true }]
# then:
npx wrangler versions deploy <version-id>@100 --config dist/server/wrangler.json   # a versions deploy (not just upload) is required to apply route changes — see docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md §11's own note
# or, per Wrangler's own guidance for trigger-only changes:
npx wrangler triggers deploy --config dist/server/wrangler.json
```

Cloudflare requires the zone (`ahanassa.com`) to already be on the same Cloudflare account before a custom domain can be attached to a Worker — confirm this is already true (the zone's DNS is already Cloudflare-managed today, per `README.md`'s own note that `ahanassa.com`/`www.ahanassa.com` currently resolve via Cloudflare DNS, DNS-only/not proxied, to the legacy Vercel deployment) before attempting this step.

## 6. www policy

**`www.ahanassa.com` is canonical** (`lib/env.ts#CANONICAL_ORIGIN`, `PROJECT_OVERRIDES.md`'s own document header, `01-sources/DO_NOT_CHANGE.md`'s registered domain) — already decided, not a cutover-time decision. **Independently corroborated** by the legacy holding-page Git lineage (`origin/main`, read-only-audited 2026-09-02 — `DOCUMENT_AUDIT_REPORT.md` DAR-048): commit `d22d752` ("fix: align canonical URLs with www domain") made the identical decision — apex `ahanassa.com` redirects, `www.ahanassa.com` is canonical — and this is exactly what is live today (`curl -I https://ahanassa.com/` → `308` → `https://www.ahanassa.com/`; the redirect is enforced by Vercel's own domain configuration, `server: Vercel` in the response headers, not by application code). This decision does **not conflict with or need to be superseded by** the new Website's policy — both independently arrived at, and today both actively enforce, the same canonical host. Attach the Worker to both `ahanassa.com` and `www.ahanassa.com` (§5), and replicate the same apex→www redirect behavior at the Cloudflare layer (Page Rule, Bulk Redirect, or a redirect rule) so this behavior carries over exactly, rather than assuming it survives the DNS change automatically — verify explicitly in §9's smoke test.

## 7. DNS changes

**Not performed by this runbook — requires explicit, separate, owner-approved execution at cutover time.** The change: point `ahanassa.com`/`www.ahanassa.com`'s DNS (currently DNS-only/not proxied, resolving to the legacy Vercel deployment) at the newly-attached Cloudflare Worker custom domain from §5 instead. Concretely, once §5's custom domain attachment succeeds, Cloudflare typically manages the necessary DNS record(s) for a Worker custom domain automatically (proxied) — the manual action is enabling/confirming that record replaces whatever previously pointed at Vercel (an A/CNAME record, or Vercel's own DNS target). **Record the exact prior DNS configuration (§8) before making this change.**

## 8. Vercel transition

**STATUS UPDATE — 2026-09-19: Vercel's Git integration is DISCONNECTED. Everything below that depends on it being connected is HISTORICAL and no longer describes the live configuration.**

Cloudflare Workers is the active deployment target for this site; GitHub Actions' staging deployment (`.github/workflows/deploy-staging.yml`) deploys to Cloudflare. **A push to this GitHub repository — including to `origin/main` — does not deploy through Vercel.**

Re-verified read-only on 2026-09-19 (no deploy triggered by the verification): `vercel project inspect ahanassa-website` reports no connected Git repository; the newest Preview deployment is 16 days old and the newest Production deployment is 31 days old (the legacy holding page, commit `d22d752`). An additive commit was pushed to `origin/main` on 2026-09-19 (registering the staging workflow) and produced **no** Vercel deployment of any kind, Preview or Production — independent empirical confirmation of the disconnection. `https://www.ahanassa.com/` is served by the Cloudflare Worker and apex `ahanassa.com` still returns `308` to `www`.

What this changes below:

- The **"Critical finding (2026-09-02 …)"** paragraph and the **"Consequence for Stage 2"** steps 1–3 are retained as history. Their premise ("because Vercel auto-deploys `main` on push") no longer holds.
- **Step 2** (disconnect the Git integration / reassign the Production Branch) is **DONE** — it is no longer a prerequisite for touching `origin/main`.
- **Step 4** under "Before touching DNS" is likewise **DONE**.
- **"Corrected operational order" step 4** ("Disconnect Vercel's Git integration (§8) — before `main` is ever touched again") is **DONE** and is no longer a blocking cutover step.
- Still **unchanged and still in force:** do not delete or unlink the Vercel project (§8.2/§8.3) — it remains the intact rollback target, and the rollback path in §11 still depends on it. Git-level consolidation of the two unrelated histories remains out of scope here and still requires separate owner sign-off; it is simply no longer gated on Vercel.

**Critical finding (2026-09-02, Final Go-Live Readiness read-only audit — see `DOCUMENT_AUDIT_REPORT.md` DAR-048): Vercel's Git integration is connected to this exact GitHub repository (`rezachidotnet/ahanassa-website`) and auto-deploys on every push to every branch, not only `main`.** Confirmed via `vercel ls`/`vercel inspect` (read-only, no deploy triggered by the inspection itself): every branch this project has pushed during the Website workstream (e.g. `fix/rfq-launch-uom-policy`) produced a corresponding Vercel **Preview** deployment (alias pattern `https://ahanassa-website-git-<branch>-rezachidotnets-projects.vercel.app`), which fails quickly (~11–15s) because this repository's build (`vinext build` / Cloudflare Workers + D1 bindings) is not a Vercel-compatible Next.js build. These failures are harmless in isolation (Preview target only, not Production, and Preview URLs are not linked from anywhere public) — but they are **new, unplanned surface area** that were not previously identified as a risk.

**The Production target is confirmed tied to the `main` branch** (`vercel inspect` on the current live production deployment shows an `https://ahanassa-website-git-main-...` alias, and the deployment's timestamp exactly matches the legacy holding page's last commit, `d22d752`, on `origin/main`). Production has not redeployed since that commit (15 days old at audit time) — none of this project's many feature-branch pushes have touched `main`, so `www.ahanassa.com`/`ahanassa.com` remain completely unaffected by any of this work to date.

**Consequence for Stage 2 — this changes the Git-side execution order.** Because Vercel auto-deploys `main` on push:

1. **Never** merge, rebase, or fast-forward the new Website's history onto `origin/main` while Vercel's Git integration remains connected and `main` remains the Production Branch — doing so would immediately trigger a real Vercel **Production** build attempt of the new (Cloudflare-only) codebase, which would almost certainly fail the same way the Preview builds have (§ above) — and even a successful-but-wrong build could serve broken content at the live domain before the Cloudflare cutover is otherwise ready.
2. Before any Git-level consolidation of the two lineages is even considered (a decision explicitly out of scope for this runbook — see `PROJECT_OVERRIDES.md`/owner sign-off requirements), the Vercel project's Git integration must either be **disconnected** (Project Settings → Git → Disconnect) or its **Production Branch reassigned away from `main`**, so that a future Git operation on this repository cannot silently trigger an unwanted Vercel deployment. This is a Vercel dashboard action, not a Git action — it does not touch `origin/main`'s history and is fully reversible.
3. The actual DNS/domain cutover (§7 above) does **not** require touching Git or Vercel's Git integration at all — it is a pure DNS change (this repo's `main` branch and the Vercel project can be left exactly as they are, serving as an inert rollback target, per §8.2 below). Only a *future* decision to formally retire the Vercel project (not part of this runbook) would need the Git-integration disconnection in step 2.

Before touching DNS (§7):

1. Record the current Vercel project's exact production domain configuration (screenshot or export from the Vercel dashboard) — which domains are attached, and Vercel's own DNS target values — as the rollback reference for §11. (Read-only `vercel` CLI commands, e.g. `vercel project inspect ahanassa-website`, `vercel ls ahanassa-website --prod`, can capture this without any risk of triggering a deployment.)
2. Do **not** delete or unlink the Vercel project at cutover time — keep it fully intact and deployable as the rollback target until the new Cloudflare deployment has been stable in production for an owner-agreed monitoring period (§9).
3. Only after that monitoring period is the Vercel project's domain association safe to formally remove (a separate, later, explicit step — not part of this cutover runbook).
4. **New step, per the finding above:** before or during that same later, explicit removal step, also disconnect Vercel's Git integration (or reassign its Production Branch away from `main`) — not required for the DNS cutover itself, but required before this repository's `main` branch is ever touched again by any future Git operation.

## 9. Smoke tests immediately after cutover

Run within minutes of the DNS change (§7) taking effect (DNS propagation may take a few minutes to a few hours depending on prior TTL — do not assume instant global effect):

```bash
curl -I https://ahanassa.com/
curl -I https://www.ahanassa.com/
dig ahanassa.com
dig www.ahanassa.com
```

Then, in a browser (or via `curl` against the real hostname once resolving to the new Worker):

- `https://www.ahanassa.com/` → `200`, no Basic Auth prompt, no `401`.
- `https://www.ahanassa.com/products` → `200`, the 3 published templates render.
- `https://www.ahanassa.com/products/rebar-aj340` (and the other 2 published slugs) → `200`, correct title/canonical/hreflang, spec table shows exactly the 4 marked-public variants each.
- `<link rel="canonical">` on every checked page → `https://www.ahanassa.com/...` (already guaranteed by the existing hardcoded `CANONICAL_ORIGIN` fallback, §11/§12 of `docs/GO_LIVE_READINESS.md` — but confirm live against the real domain, not just the preview hostname, since this is the first time it's ever been requested from that real hostname).
- `https://www.ahanassa.com/contact` → real Turnstile widget loads and resolves against the real domain (confirms §4's allowlist change took effect).
- `https://www.ahanassa.com/robots.txt` → `allow: /`, references `https://www.ahanassa.com/sitemap.xml` (per the `APP_ENV === "production"` branch already documented in `docs/GO_LIVE_READINESS.md` §14 — verify live, since this is the first real-domain request ever made against it).
- `https://www.ahanassa.com/sitemap.xml` → exactly the expected indexable URLs (3, per the current Catalog baseline), all `https://www.ahanassa.com/...`.
- Security headers present (same set as `docs/GO_LIVE_READINESS.md` §19).
- **Do not submit a real customer-identity RFQ as part of this smoke test** — if an end-to-end RFQ proof is wanted at cutover, use the same clearly-synthetic-identity convention already established in `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §14 (a `(SYNTHETIC)`-labeled company name and `.invalid` email domain), and only if the owner explicitly requests it — the code path is already proven multiple times (DAR-042/044) and does not need re-proving merely because the domain changed.

## 10. Rollback trigger criteria

Roll back (§11) if, within the post-cutover monitoring window, any of the following occurs:

- `https://www.ahanassa.com/` (or `/products`, `/contact`) returns a `5xx`, hangs, or renders a broken/incomplete page.
- Security headers are missing or CSP/Turnstile fails in a way that blocks legitimate RFQ submission.
- A real customer-submitted RFQ fails to durably persist (a D1 write failure), fails Turnstile unexpectedly, or the outbox/Queue/DLQ shows unexpected failures at a rate inconsistent with normal operation.
- DNS propagation produces inconsistent results across resolvers/regions beyond the expected propagation window.
- Any secret value is found exposed in a response body, header, or log.
- The Odoo RFQ sync path shows a new class of failure not already documented/understood (distinct from the two already-diagnosed-and-fixed Odoo-side defects in `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §14a/§14b).

## 11. Rollback commands

**DNS/Vercel (the primary rollback path — reverts the public-facing effect immediately):**

1. Revert `ahanassa.com`/`www.ahanassa.com`'s DNS record(s) to the exact prior configuration recorded in §8.1 (pointing back at the legacy Vercel deployment). This is the fastest, safest rollback — it does not require touching the Worker at all.
2. Confirm via `dig`/`curl -I` that the domain resolves back to Vercel (`server: Vercel` header, per the same check already used throughout this project's own verification pattern).

**Worker (if a Worker-specific rollback is separately needed, independent of DNS):**

```bash
npx wrangler rollback --config dist/server/wrangler.json   # reverts to the immediately-prior deployed Worker version
# or, to select a specific prior version explicitly:
npx wrangler versions deploy <previous-version-id>@100 --config dist/server/wrangler.json
```

**Detaching the Worker custom domain/route** (if the domain attachment itself is the problem, independent of DNS):

- Remove the `routes`/custom-domain block added in §5 from `wrangler.jsonc`'s `env.production`, then `wrangler versions deploy`/`wrangler triggers deploy` to apply the removal.

**Re-enabling Basic Auth** (only if a genuine security incident requires immediately locking the Worker back down while investigating — not a routine rollback step):

- Revert the §3 commit (`git revert <sha>`), redeploy, and re-provision `PREVIEW_BASIC_AUTH_USER`/`PASSWORD` as new secrets (the old values should be treated as no longer trustworthy if this path is ever needed — generate fresh credentials, never reuse the ones removed in §3).

**Preventing RFQ loss during rollback:** the durable-first-write architecture (`POST /api/rfqs` → D1 → outbox → Queue → Odoo, unchanged throughout this entire project) means a rollback of DNS or the Worker version **never loses an already-accepted RFQ** — any RFQ durably written to `DB_OPS` before rollback remains there, and the outbox/Queue continues attempting Odoo sync independently of which Worker version or domain is currently receiving new traffic (the Cron-driven outbox sweep and the Queue consumer are tied to the deployed Worker, not to DNS). If DNS is rolled back to Vercel, the Cloudflare Worker (still deployed, just not receiving public traffic) continues running its Cron triggers and Queue consumer normally, so any already-durably-captured RFQ still syncs to Odoo. Only *new* RFQ submissions during the rollback window are affected (they go to whichever system DNS currently points at) — this is the expected, correct behavior, not a data-loss risk.

## 12. Post-cutover monitoring

- Watch `wrangler tail --config dist/server/wrangler.json` (or Cloudflare Logs/Observability, already enabled per `wrangler.jsonc`) for the first hour after cutover for unexpected errors.
- Check `catalog_sync_state` (`docs/CATALOG_SYNC_OPERATIONS.md`) after the next scheduled incremental (`0 */3 * * *`) and full (`30 2 * * *`) Cron firing to confirm they still run correctly against the same production `DB_PUBLIC` (unaffected by DNS/domain changes, but worth a positive confirmation).
- Check `dead_letter_records` daily for the first week for any new (non-historical) entry.
- Monitor Google Search Console (once verified for the real domain — a separate, GTM/GSC-configuration-phase action per `PROJECT_OVERRIDES.md` §5, not part of this runbook) for crawl/index errors once the site is genuinely live and indexable.
- Confirm no regression in the existing security/Turnstile/rate-limit protections over the following days of real traffic (distinct from the synthetic pre-cutover smoke tests).

---

## Explicitly out of scope for this runbook

Pricing, Customer Authentication/Portal implementation, attachment upload enablement, GTM/GSC container-ID configuration, R2 bucket provisioning, and the `UNIT / INVENTORY / PROCUREMENT ARCHITECTURE GATE` (`docs/UOM_INVENTORY_PROCUREMENT_GATE.md`) — none of these are cutover mechanics; each remains its own separate, later, explicitly-approved phase.
