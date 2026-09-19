# Vercel → Cloudflare Cutover Readiness Audit

**Scope:** Audit only. No DNS record, Cloudflare setting, workflow, deployment, application file, or Vercel resource was changed, created, or deleted.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch at audit time:** `feat/header-hero-integrated`, HEAD `b0c8722`
**Date:** 2026-09-19
**Method:** Live read-only verification — `dig` (authoritative DNS), `curl` (HTTP headers, redirect chains, cache behaviour, both hostnames, both serving platforms), `wrangler` (Worker deployment status, version bindings, D1 metadata), `vercel` (project, deployments, domains), plus direct inspection of `wrangler.jsonc`. Every figure below was observed in this session unless explicitly marked otherwise.

**Commands used were reads only.** No `wrangler deploy`, no `wrangler d1 execute`, no `wrangler d1 migrations list` (deliberately avoided on production — it can initialise the migrations table as a side effect), no `vercel remove`, no `vercel domains rm`, no DNS write.

---

# RESULT

**The target architecture is ALREADY LIVE for `www.ahanassa.com` and NOT YET LIVE for the apex `ahanassa.com`.**

`www` — the canonical hostname — runs the full target path end to end, verified this session: Cloudflare DNS (proxied, IPv4 + IPv6) → Cloudflare Worker `ahanassa-production` → vinext/Next.js → D1 production in the EU jurisdiction, with both D1 databases showing real 24-hour query traffic. That half of the cutover is genuinely complete, not merely configured.

The apex is the entire remaining gap. It resolves to **Vercel** anycast addresses on unproxied records and is served by the **Vercel Edge Network**, which issues the 308 to `www`. Cloudflare is authoritative for the zone but is not in the apex serving path at all.

**The audit's most consequential new finding is not the apex DNS — that was already known.** It is that **`www.ahanassa.com` is still attached to the Vercel project as a domain assignment.** `vercel domains inspect ahanassa.com` reports the `ahanassa-website` project holding *both* `www.ahanassa.com` and `ahanassa.com`. Prior documentation records that the owner "deleted the conflicting `www.ahanassa.com` Vercel CNAME" in 2026-09-02 — that removed the DNS **record**, but the **project domain assignment** was never removed and is still in place today. It is dormant only because DNS points `www` elsewhere. No existing document in this repository records this.

Two further live confirmations worth stating plainly: the Vercel Git integration is genuinely disconnected (`vercel project inspect` prints no Git Repository section; newest deployment of any kind is 17 days old and every recent one errored), and the production Worker is **16 days stale** — version `b07d8697-…`, created 2026-09-03, live-verified at 100% traffic.

---

# CURRENT_SERVING_PATH

```text
                          Internet
                             │
              ┌──────────────┴───────────────┐
              │                              │
      ahanassa.com (apex)            www.ahanassa.com
              │                              │
      Cloudflare DNS                  Cloudflare DNS
      (authoritative zone)            (authoritative zone)
              │                              │
      ❌ DNS-ONLY / UNPROXIED         ✅ PROXIED (orange cloud)
      A 64.29.17.65                   A    188.114.97.3 / 188.114.96.3
      A 216.198.79.65                 AAAA 2a06:98c1:3121::3
      (no AAAA)                            2a06:98c1:3120::3
              │                              │
      ❌ VERCEL EDGE NETWORK          ✅ Cloudflare Worker
      server: Vercel                     ahanassa-production
      x-vercel-id: fra1::…               (Custom Domain binding)
              │                              │
      308 → https://www.ahanassa.com   ✅ vinext / Next.js App Router
      (path + query preserved)              │
              │                         ✅ D1 production (EU / EEUR)
              └──────────────┐              ├── DB_PUBLIC  73ba6b50…  16 tables
                             └─────────────▶├── DB_OPS     7240a6a7…   9 tables
                                            ├── Queue ahanassa-odoo-sync-production
                                            ├── Rate limiter (5 req/60s)
                                            └── Images / Assets bindings
```

**Reading of the diagram:** every request to the canonical hostname already follows the frozen target architecture. Every request to the apex leaves the Cloudflare edge, is answered by Vercel, and is bounced back. The apex path works correctly for users — but it is not the target architecture, and it makes a decommissioned platform load-bearing.

---

# TARGET_PATH

```text
                          Internet
                             │
              ┌──────────────┴───────────────┐
              │                              │
      ahanassa.com (apex)            www.ahanassa.com
              │                              │
      Cloudflare DNS                  Cloudflare DNS
      PROXIED                         PROXIED  (already true)
              │                              │
      Cloudflare Zone                 Cloudflare Worker
      Redirect Rule                      ahanassa-production
      308 → www (path+query)                │
              │                         vinext / Next.js
              └─────────────────────────────┤
                                            │
                                       D1 production (EU)
                                       DB_PUBLIC + DB_OPS
```

Design decisions already frozen and unchanged by this audit:

- **`www.ahanassa.com` is canonical** — `lib/env.ts:11` `CANONICAL_ORIGIN = "https://www.ahanassa.com"`, corroborated by `PROJECT_OVERRIDES.md` and `01-sources/DO_NOT_CHANGE.md`.
- **The apex must NOT be attached to the Worker.** `wrangler.jsonc` deliberately lists only `www` in `env.production.routes`, with an explicit comment that apex "must remain non-canonical and instead gets a redirect rule … configured separately in Cloudflare (not via Worker route/custom_domain)." A zone-level Redirect Rule is the correct layer; routing the apex through the Worker would burn compute on a redirect and create a second hostname whose canonical behaviour must be maintained in application code.
- **Vercel leaves the serving path entirely**, becoming an inert rollback target until an explicit, separately-authorized decommission.

---

# DNS_STATUS

## Zone authority

| Item | Value |
| --- | --- |
| Nameservers | `coraline.ns.cloudflare.com`, `micah.ns.cloudflare.com` |
| SOA | `coraline.ns.cloudflare.com. dns.cloudflare.com. 2414343013 10000 2400 604800 1800` |
| DNS provider | **Cloudflare** — authoritative for the whole zone |

The zone is entirely on Cloudflare. The apex problem is a **record-level** configuration, not a registrar or nameserver problem — which makes it correspondingly cheap to fix once zone write access exists.

## Records

| Hostname | Type | Value | Proxy status | Resolution target |
| --- | --- | --- | --- | --- |
| `ahanassa.com` | A | `64.29.17.65`, `216.198.79.65` | **DNS-only (unproxied)** | **Vercel** anycast |
| `ahanassa.com` | AAAA | *(none)* | — | IPv4-only |
| `ahanassa.com` | CNAME | *(none)* | — | — |
| `www.ahanassa.com` | A | `188.114.97.3`, `188.114.96.3` | **Proxied** | **Cloudflare** anycast |
| `www.ahanassa.com` | AAAA | `2a06:98c1:3121::3`, `2a06:98c1:3120::3` | **Proxied** | **Cloudflare** anycast |
| `www.ahanassa.com` | CNAME | *(none — Custom Domain managed)* | — | — |

**How proxy status was determined without zone read access:** a Cloudflare-proxied record resolves to Cloudflare anycast space (`188.114.96.0/22`, `2a06:98c1::/29`). The apex resolving to Vercel's own anycast ranges (`64.29.17.0/24`, `216.198.79.0/24`) is only possible if those records are grey-clouded — a proxied record would return Cloudflare IPs regardless of origin. The absence of AAAA on the apex, versus its presence on `www`, corroborates this: Cloudflare's proxy adds IPv6 automatically.

**Note on apex IP variance.** An earlier check today returned `216.198.79.1` / `64.29.17.1`; this check returned `.65` of the same ranges. This is Vercel rotating within its anycast pool, not a configuration change. Any future verification should assert the **range and the `server:` header**, never a specific IP.

---

# HTTP SERVING AUDIT

## `https://ahanassa.com/` — Vercel

```http
HTTP/2 308
location: https://www.ahanassa.com/
refresh: 0;url=https://www.ahanassa.com/
cache-control: public, max-age=0, must-revalidate
content-type: text/plain
server: Vercel
strict-transport-security: max-age=63072000
x-vercel-id: fra1::82bjc-1789825573847-a9c387a1c918
```

- **No Cloudflare headers whatsoever** — no `cf-ray`, no `cf-cache-status`, no `server: cloudflare`, no `report-to`/`nel`. The Cloudflare edge is not in this path.
- `x-vercel-id: fra1::` — served from Vercel's Frankfurt region.
- Redirect behaviour is **correct**: verified `https://ahanassa.com/products?x=1` → `308` → `https://www.ahanassa.com/products?x=1`, preserving both path and query; `/en` → `/en`. Full chain to final target: one redirect, `200`.
- **No application security headers** on this response — no CSP, no `x-frame-options`, no `x-content-type-options`, no `referrer-policy`, no `permissions-policy`. The apex is a bare Vercel platform redirect, not an application response, so the Worker's header stack never applies to it.

## `https://www.ahanassa.com/` — Cloudflare Worker

```http
HTTP/2 200
server: cloudflare
cf-ray: a3d909100dfeb942-AMS
cf-cache-status: BYPASS
cache-control: no-store
content-type: text/html; charset=utf-8
vary: RSC, Next-Router-State-Tree, …, X-Vinext-Rsc-State-Fingerprint
content-security-policy-report-only: default-src 'self'; …
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
alt-svc: h3=":443"; ma=86400
```

- **No Vercel headers whatsoever** — no `server: Vercel`, no `x-vercel-id`. Vercel is fully out of this path.
- The `X-Vinext-*` entries in `vary` positively identify the vinext runtime — this is the repository's own application, not a placeholder.
- Full application security header stack present. CSP is **report-only**, which is a deliberate pre-existing posture, not a finding of this audit.
- HTTP/3 advertised via `alt-svc`.

## Functional and cache behaviour

| Probe | Result | Interpretation |
| --- | --- | --- |
| `GET /api/hello` | `{"message":"Hello from vinext on Cloudflare Workers"}` | Worker + application healthy |
| `GET /products` | `200`, `cf-cache-status: BYPASS`, `cache-control: no-store, must-revalidate` | SSR, never edge-cached |
| `GET /_next/static/css/index.CitlGWRD.css` | `200`, **`cf-cache-status: HIT`**, `cache-control: public, max-age=31536000, immutable`, `etag` present | Static assets correctly cached at the edge |
| `GET /sitemap.xml` | `200`, 3 product URLs, all on `https://www.ahanassa.com` | Canonical origin correct; reflects production's own catalog |
| `GET /robots.txt` | `Allow: /`, `Disallow: /api/`, sitemap on canonical origin | Production branch of robots logic is live |
| `<link rel="canonical">` on `/` | `https://www.ahanassa.com` | Correct |
| `<meta name="robots">` on `/` and `/products` | **`noindex, follow`** | Site is live but deliberately not indexable (draft content classification, DAR-020/021) |

**Cache observation, not a defect:** every HTML response is `no-store` / `BYPASS`, so no page HTML is cached at the edge and every page view executes the Worker. That is correct and expected for a dynamic SSR application with locale routing and D1 reads, and `wrangler.jsonc` does enable the `cache` binding for the framework's own use. Recorded so it is not later mistaken for a misconfiguration.

---

# WORKER_STATUS

All live-verified via `wrangler` in this session.

## Deployment

```
wrangler deployments status --env production
Created:     2026-09-03T19:00:48.218Z
Author:      cyansanatiranian@gmail.com
Version(s):  (100%) b07d8697-620c-485c-8fed-21b893ab602c
```

| Item | Value |
| --- | --- |
| Worker name | `ahanassa-production` |
| Active version | `b07d8697-620c-485c-8fed-21b893ab602c` at **100%** |
| Created | **2026-09-03T19:00:48Z — 16 days old** |
| Handlers | `fetch`, `queue`, `scheduled` |
| Compatibility date | `2026-08-26` (inherited from top-level config) |
| Prior versions available | Yes — full history present (`8b73bfdc`, `1a34472d`, `1ba5dadb`, `878a1e82`, `1e3d89fa`, `ac09d55c`, …), each with a descriptive message. Rollback targets exist. |

## Bindings on the live version (`wrangler versions view`)

```
Secrets:      ODOO_RFQ_API_TOKEN, TURNSTILE_SECRET_KEY
env.ODOO_SYNC_QUEUE (ahanassa-odoo-sync-production)   Queue
env.DB_OPS    (7240a6a7-c293-4e6e-baf3-95838a3c2944)  D1 Database
env.DB_PUBLIC (73ba6b50-ef57-4d89-baa9-617a0b0af127)  D1 Database
env.IMAGES                                            Images
env.RFQ_RATE_LIMITER (5 requests/60s)                 Rate Limit
env.ASSETS                                            Assets
env.APP_ENV ("production")                            Environment Variable
env.ENABLED_PRICE_PROVIDERS ("")                      Environment Variable
env.HOMEPAGE_RANKING_MODE ("base")                    Environment Variable
env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ("0x4AAAA…")       Environment Variable
env.ODOO_BASE_URL ("https://odoo.ahanassa.com")       Environment Variable
env.ODOO_CRM_TEAM_ID ("1")                            Environment Variable
env.ODOO_DATABASE ("ahanassa")                        Environment Variable
env.PRICE_STRIP_ENABLED ("false")                     Environment Variable
```

Every binding matches `wrangler.jsonc` `env.production` exactly. Both current secrets are attached. The deprecated `ODOO_API_KEY` is correctly **absent** (per DAR-041). Feature flags are in their intended default-off state.

## Routing and hostnames

| Item | State |
| --- | --- |
| Custom domain | `www.ahanassa.com` — proven live by the `server: cloudflare` + `cf-ray` + vinext response above |
| `env.production.routes` in config | exactly `[{ "pattern": "www.ahanassa.com", "custom_domain": true }]` |
| Apex route | **none, deliberately** — by design, to be handled by a zone Redirect Rule |
| `workers_dev` | `true` (explicit in config since the DAR-050 repair) |
| `*.workers.dev` reachability | **`https://ahanassa-production.nova-b1e6f0.workers.dev/` returns `200` publicly** — no Basic Auth (removed at Stage 2B) |

**The Worker is therefore publicly reachable at two hostnames.** Verified: the `workers.dev` hostname serves the same application, with `robots.txt` reading `Allow: /` and a `<link rel="canonical">` pointing at `https://www.ahanassa.com`. Today the duplicate-surface risk is contained by that canonical plus the site-wide `noindex, follow` — but the `noindex` is a *temporary* draft-content state, so this becomes a live SEO exposure the moment indexing is enabled. See RK4.

## D1 production — live and serving

`wrangler d1 info`, read-only:

| | `DB_PUBLIC` | `DB_OPS` |
| --- | --- | --- |
| ID | `73ba6b50-ef57-4d89-baa9-617a0b0af127` | `7240a6a7-c293-4e6e-baf3-95838a3c2944` |
| Jurisdiction / region | **`eu` / `EEUR`** | **`eu` / `EEUR`** |
| Tables | **16** | **9** |
| Size | 532 kB | 176 kB |
| Reads (24h) | **321** | 289 |
| Writes (24h) | **36** | **0** |
| Rows read (24h) | **22,053** | 1,442 |

This is the strongest single piece of evidence that the target architecture's data layer is genuinely live: 22,053 rows read from `DB_PUBLIC` in 24 hours is real page-serving traffic, and the 36 writes are the catalog sync cron doing its job. `DB_OPS` at 0 writes/24h simply means no RFQ was submitted in that window. EU jurisdiction is confirmed on both, matching the owner decision in `PROJECT_OVERRIDES.md` §14.

**Corroborating the migration gap without touching the migrations table:** `DB_PUBLIC` holds 16 tables. Migrations `0007`–`0010` would add `public_processing_groups`, `processing_sync_state`, `price_provider_policies` and `catalog_group_labels`. Their absence is consistent with production sitting at `0006`, as documented in the 2026-09-19 deploy baseline.

---

# VERCEL_STATUS

All live-verified via the `vercel` CLI, read-only.

| Question | Answer | Evidence |
| --- | --- | --- |
| Is Git integration connected? | **NO** | `vercel project inspect ahanassa-website` prints General and Framework Settings with **no Git Repository section** — the section is present when an integration exists |
| Are deployments still triggered? | **NO** | Newest deployment of any kind is **17 days old**. Every recent Preview is `● Error` (12–15 s) — the vinext/Cloudflare build is not Vercel-compatible. No deployment corresponds to any 2026-09-18/19 push |
| Newest Production deployment | **32 days old**, `● Ready` — the legacy holding page | `vercel ls ahanassa-website --prod` returns three Production deployments, all 32 d |
| Is the project still serving traffic? | **YES — the apex only** | `ahanassa.com` returns `server: Vercel` + `x-vercel-id`. This is real, live, user-facing traffic |
| Is Vercel only leftover infrastructure? | **NO — this is the key correction** | It is leftover *build* infrastructure but **load-bearing serving infrastructure for the apex** |

## Project and domain assignment

```
Project ID     prj_NoKwW7dH04S8sElswllEz5LMENLX
Name           ahanassa-website
Created        18 August 2026 (32d ago)
Framework      Next.js   (Build: `npm run build` / `next build`)
```

`vercel domains inspect ahanassa.com`:

```
Nameservers
  Intended: ns1.vercel-dns.com / ns2.vercel-dns.com
  Current:  coraline.ns.cloudflare.com / micah.ns.cloudflare.com   ✘

Projects
  ahanassa-website → www.ahanassa.com, ahanassa.com
```

Two findings here:

1. **`www.ahanassa.com` is still assigned to the Vercel project.** This contradicts the natural reading of the 2026-09-02 execution record, which states the owner "deleted the conflicting `www.ahanassa.com` Vercel CNAME". That action removed the **DNS record**; the **project domain assignment** persists. It is inert today purely because DNS sends `www` to Cloudflare. **No document in this repository records this**, and it is the concrete instance of "obsolete Vercel configuration" the cutover gap analysis asks for.
2. **Vercel itself flags the nameserver mismatch** (`✘`), correctly reporting that it is not authoritative for the zone. Cosmetic, but it confirms Vercel's own view: it holds the domains but not the DNS.

## What the apex would serve if the redirect were removed

The apex 308 is a **Vercel domain-level redirect**, not application output — `content-type: text/plain`, no framework headers. The project's newest Production deployment (32 days old, `Ready`) is the legacy holding page. So if the redirect configuration were removed while DNS still pointed at Vercel, the apex would serve **the old holding page**, not an error — a quieter and therefore more dangerous failure than an outage.

---

# WRANGLER CONFIGURATION

Inspected directly; no change made.

| Setting | Value | Assessment |
| --- | --- | --- |
| Top-level `name` | `ahanassa-bootstrap` | local/default only; named envs override |
| `compatibility_date` | `2026-08-26` | inherited by both environments; matches the live Worker version — **consistent** |
| `compatibility_flags` | none declared | acceptable; date-based compatibility only |
| `main` | `workers/entry.ts` | custom entry exporting `fetch`, `queue`, `scheduled` — matches live handlers |
| `assets` | `dist/client`, `not_found_handling: "none"`, binding `ASSETS` | matches live binding |
| `cache` | `enabled: true` | present |
| `observability` | `enabled: true` | present — supports post-cutover monitoring |
| `upload_source_maps` | `true` | present |
| `env.production.name` | `ahanassa-production` | **matches live Worker** |
| `env.production.routes` | `[{ "pattern": "www.ahanassa.com", "custom_domain": true }]` | **matches live serving**; apex correctly absent |
| `env.production.workers_dev` | `true` | matches live reachability |
| `env.production.triggers.crons` | `["*/5 * * * *", "0 */3 * * *", "30 2 * * *"]` | 3 triggers |
| `env.production.d1_databases` | `DB_OPS` `7240a6a7…`, `DB_PUBLIC` `73ba6b50…`, with per-binding `migrations_dir` | **both IDs match live `d1 info` exactly** |
| `env.production.queues` | producer + consumer + DLQ, `max_retries: 5` | matches live binding |
| `env.production.ratelimits` | ns `2001`, 5/60s | matches live binding |
| `env.production.vars` | `APP_ENV`, `ODOO_*`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `PRICE_STRIP_ENABLED`, `ENABLED_PRICE_PROVIDERS`, `HOMEPAGE_RANKING_MODE` | **all match the live version's bindings** |

**Configuration/reality alignment for `env.production` is exact.** Every name, ID, route, flag and variable in `wrangler.jsonc` matches what is actually deployed. That is a genuinely good result and worth recording, because it means the config file can be trusted as the source of truth for the cutover.

**Two stale comments in the same file**, both contradicted by the config beneath them:

1. The `env.production` header comment still asserts *"no production Worker has been deployed … `ahanassa.com`/`www.ahanassa.com` remain unchanged, still served by the legacy Vercel deployment."* False for `www` since 2026-09-02, and contradicted by the `routes` array eleven lines below it.
2. The top-level `triggers` comment states *"staging is explicitly `[]` (zero)"*. Staging has had `["0 */3 * * *"]` since 2026-09-19.

---

# CUTOVER_GAPS

Current state compared against the frozen target architecture.

| # | Gap | Category | Severity |
| --- | --- | --- | --- |
| **G1** | Apex `ahanassa.com` A records are DNS-only and point at Vercel anycast; no AAAA exists | Missing DNS change | **HIGH** |
| **G2** | No Cloudflare zone Redirect Rule exists for apex → `www` | Missing Cloudflare config | **HIGH** |
| **G3** | **`www.ahanassa.com` is still assigned to the Vercel project** — dormant, undocumented, latent conflict | Obsolete Vercel configuration | **HIGH** |
| **G4** | `ahanassa.com` is still assigned to the Vercel project and actively serves the redirect | Obsolete Vercel configuration (intentional for now) | MEDIUM |
| **G5** | Production Worker is 16 days stale (`b07d8697`, 2026-09-03) versus current staging | Deployment currency | MEDIUM |
| **G6** | Production `DB_PUBLIC` sits at migration `0006` (16 tables); `DB_OPS` at `0004` — five migrations behind staging | Data layer drift | MEDIUM |
| **G7** | Worker publicly reachable at `*.workers.dev` as a second hostname | Duplicate serving surface | MEDIUM |
| **G8** | Two stale comments in `wrangler.jsonc`; the 2026-09-18 recovery audit still asserts Vercel auto-deploys `main` | Documentation drift | LOW |
| **G9** | Vercel reports a nameserver mismatch (`✘`) for the domain it holds | Cosmetic inconsistency | LOW |

**Not gaps — verified already correct:** Worker name, route/custom-domain binding, `workers_dev`, all D1 bindings and IDs, EU jurisdiction, queue/DLQ, rate limiter, both secrets, all environment variables, compatibility date, canonical origin, sitemap origin, security header stack, static-asset edge caching, and apex redirect *semantics* (308, path and query preserved).

**The cutover is narrower than it looks.** Of nine gaps, only G1 and G2 stand between the current state and the target serving architecture, and G2 is a single zone-level rule. G3–G4 are cleanup with a strict ordering constraint. G5–G6 are release-pipeline concerns already covered by `PRODUCTION_RELEASE_ARCHITECTURE_V1.md`.

---

# RISKS

### RK1 — Apex availability depends on a platform the project treats as decommissioned — **HIGH**

Live apex traffic is served by Vercel. Any Vercel-side change — project deletion, domain removal, plan change, account issue — takes the apex down or, worse, silently reveals the 32-day-old holding page. `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8.3 plans to "formally remove the Vercel domain association" after a monitoring period; **executed before G2 is closed, that step breaks the apex.** The ordering in the recommended plan below exists specifically to prevent this.

### RK2 — The dormant `www` assignment on Vercel is an undocumented latent conflict — **HIGH**

Vercel still believes it owns `www.ahanassa.com`. It cannot act on that today because DNS points elsewhere — but it means the canonical hostname is claimed by two platforms simultaneously. Concrete failure modes: a future operator "cleaning up" Vercel domains removes the wrong one; someone re-adds a Vercel DNS record for `www` believing it is required; or a Vercel-side verification/reassignment produces confusing behaviour at the canonical hostname. Because it is recorded nowhere, the next person to look will rediscover it under time pressure.

### RK3 — Cloudflare zone write access is the real blocker, and it is not an engineering task — **HIGH**

G1 and G2 both require zone-level write access. Redirect Rules and DNS record edits are outside every `wrangler` subcommand and outside the API token scope available to prior sessions — the runbook has recorded this since 2026-09-02. Until the owner obtains or delegates that access, no amount of repository work advances the cutover.

### RK4 — `workers.dev` becomes a duplicate-content surface the moment indexing is enabled — **MEDIUM**

`ahanassa-production.nova-b1e6f0.workers.dev` serves the full application publicly with `robots.txt: Allow: /`. Today it is contained by the canonical tag and site-wide `noindex, follow` — but that `noindex` is a temporary draft-content state (DAR-020/021). When indexing is turned on, the Worker's own preview hostname becomes crawlable unless it is blocked first. Note the tension: `workers_dev: true` is deliberate and permanent (it was the DAR-050 fix), so the mitigation must be an application-level or Cloudflare-level block keyed on hostname, not disabling the subdomain.

### RK5 — A stale production Worker plus five pending migrations is a poor state to increase traffic into — **MEDIUM**

Closing the apex gap increases traffic to a Worker running 16-day-old code against a schema five migrations behind staging. The apex only redirects, so the incremental load is small and no *new* failure mode is introduced. But it means the cutover's post-change smoke test exercises a deployment nobody has validated recently. Sequencing the production release before the apex cutover would be cleaner, though the two are formally independent.

### RK6 — `wrangler.jsonc` comments contradict the configuration they annotate — **MEDIUM**

An operator reading the `env.production` comment would conclude production is undeployed and Vercel-served, and could act on that during a cutover or incident. The risk is not the comment itself but that it sits in the most safety-critical file in the repository, immediately above a `routes` array that proves it wrong.

### RK7 — Apex verification that asserts specific IPs will produce false alarms — **LOW**

Vercel rotates within its anycast ranges; two checks hours apart today returned `.1` and `.65`. Any smoke test or runbook step must assert the **range and the `server:` header**, never a literal address.

### RK8 — No IPv6 on the apex today — **LOW**

The apex is IPv4-only. Proxying it through Cloudflare (Step 4 below) adds IPv6 automatically, so this resolves itself as a side effect — recorded so the change in behaviour is expected rather than surprising.

---

# RECOMMENDED_NEXT_STEPS

**Do not execute.** Ordered so that no step can break a working surface, and so the highest-risk irreversible action comes last. The ordering constraint is strict: **Vercel must not be touched until Cloudflare is proven to serve the apex.**

### Step 1 — Record the rollback reference (read-only, do first)

Capture the exact current apex configuration before anything changes: record types, values and TTLs for `ahanassa.com`; the Vercel project's domain assignments (`ahanassa.com` **and** `www.ahanassa.com`); and the apex redirect configuration as Vercel holds it. Store it in the cutover report. **This is the rollback target for every later step.** No change is made here.

### Step 2 — Obtain Cloudflare zone write access

The actual blocker (RK3). An owner/permissions action, not engineering work. Needed for both Step 3 and Step 4. Everything after this is blocked until it lands.

### Step 3 — Create the Cloudflare zone Redirect Rule (before touching DNS)

Rule: `ahanassa.com/*` → `https://www.ahanassa.com/$1`, **308**, preserving path and query. Create it while the apex still resolves to Vercel — the rule is inert until Step 4 routes traffic through Cloudflare, so this step is safe and independently reversible (delete the rule).

Deliberately a zone Redirect Rule, **not** a Worker route: adding the apex to `env.production.routes` would contradict the frozen design, spend Worker compute on a redirect, and create a second hostname whose canonical behaviour must be maintained in code.

### Step 4 — Repoint apex DNS to Cloudflare

Replace the Vercel A records with a Cloudflare-**proxied** record so the Step 3 rule can act on the request. Keep the pre-change values from Step 1 to hand. Reversible by restoring those values.

### Step 5 — Verify the apex end to end

Mandatory checks, all against the real hostname:

- `curl -I https://ahanassa.com/` → `308`, **`server: cloudflare`**, `cf-ray` present, **no `x-vercel-id`**, `location: https://www.ahanassa.com/`
- Path and query preservation: `https://ahanassa.com/products?x=1` → `https://www.ahanassa.com/products?x=1`
- Locale paths: `/en`, `/ar` redirect to their `www` equivalents, not to the root
- Full chain resolves `200` with exactly one redirect
- TLS valid for the apex on Cloudflare; HSTS behaviour unchanged
- `dig ahanassa.com` returns Cloudflare anycast; AAAA now present (expected, RK8)
- **Regression check:** `www` is completely unaffected — re-run the `www` smoke matrix

### Step 6 — Observe

Hold for an owner-agreed window with `wrangler tail` / Cloudflare Observability. **Do not touch the Vercel project during this window** — it remains the rollback target (runbook §8.2/§8.3).

### Step 7 — Remove the dormant `www` assignment from the Vercel project (G3)

Only after Step 6. The lowest-risk Vercel cleanup available, because `www` has not resolved to Vercel since 2026-09-02 — removing it changes nothing observable and eliminates the dual-ownership conflict in RK2. Doing this *before* the apex work is also defensible; it is placed here only to keep all Vercel mutations behind the single "Cloudflare proven first" gate.

### Step 8 — Remove the apex assignment from the Vercel project (G4)

Only after Steps 5 and 6 confirm Cloudflare serves the apex. This is the step RK1 warns about: performed earlier, it breaks the apex. Requires separate owner authorization per runbook §8.3.

### Step 9 — Decide the Vercel project's fate (separate authorization)

With both domains detached, the project holds only failed Preview builds and a 32-day-old holding-page Production deployment. Retaining it as an inert rollback target is reasonable; deleting it is a one-way door. Either way it is an explicit owner decision, not cutover mechanics.

### Step 10 — Close the documentation and SEO gaps

- Correct the two stale `wrangler.jsonc` comments (G8/RK6) and mark the 2026-09-18 recovery audit's Vercel section superseded.
- Record the `www`-still-on-Vercel finding (G3) where the next operator will see it.
- Decide how `*.workers.dev` will be handled before indexing is enabled (RK4) — a hostname-keyed block, not disabling `workers_dev`.
- Write the cutover report per the evidence template in `PRODUCTION_RELEASE_ARCHITECTURE_V1.md`.

**Independent of this sequence:** the production Worker release and the five pending D1 migrations (G5/G6) are governed by `docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md` and must not be bundled into the domain cutover. Different change classes, different rollback mechanisms, different blast radii.

---

**NO CODE CHANGES.** This audit produced exactly one artifact — this report. No DNS record, Cloudflare setting, workflow, deployment, application file, or Vercel resource was created, modified, or deleted. Every command issued was a read.
