# Owner decisions — website (architecture V1.1)

Decisions the owner made about the website built on `AHANASSA-CF-FREE-ODOO-ARCH-V1.1` (frozen 2026-10-02),
with their date and their effect in this repository. The architecture's own list of owner decisions is its
§19; the table at the end tracks every item of that list.

## Decisions of 2026-10-04

| # | Decision (as given) | Effect |
|---|---|---|
| **D4** | **CONTENT_REBUILD: YES.** Content-only publications run without manual approval when the gates pass. | `docs/release/RELEASE_POLICY.md` §19 defines `CONTENT_REBUILD` exactly as architecture §7.3: only when the artifact's `code_sha` is the latest `STABLE_100` production release in the ledger; only static assets + snapshot change; the §7.1 gates + automatic smoke + automatic rollback replace the manual approval; approval only when the decrease gate is overridden (`allow_decrease`) or a gate fails. Executable check: `lib/ci/content-rebuild.ts` / `content-rebuild-cli.ts`; the W8 production job in `content-publish.yml` must run it. Code releases keep the existing path (exact SHA, staging provenance, HIGH canary). |
| **D6** | **Indexing: ALL public pages must be indexable by Google in production.** | Production build target: home, products, categories, product detail, services, about, industries, markets, contact (and articles once they exist) are `index, follow` in fa/en/ar with canonical and reciprocal hreflang; the sitemap lists all of them with hreflang alternates and lastmod from the snapshot; robots.txt allows all and disallows only technical paths. Not indexable, for technical reasons: 404 pages, (non-existent) confirmation pages, URLs with query parameters, build-only routes, data files. Staging is unchanged (noindex, disallow-all) — byte-identical output. `docs/INDEXING_POLICY.md`, `lib/seo/indexing-policy.ts`, indexing gate `lib/static/indexing-gate.ts`. Supersedes the per-page `indexable: false` pre-launch posture (`docs/GO_LIVE_READINESS.md` §28 item 3) and the architecture default "contact: noindex". |
| **D9** | **Test Odoo: NO** separate test Odoo will be built. Staging keeps the contract stub. | Staging RFQ delivery stays on the contract stub (`ahanassa-v11-odoo-stub-staging`), never production Odoo (architecture §6.7, §17.2). **W7 is replaced by:** the staging end-to-end runs against the stub already done in W2–W6, plus the **W8 production canary**, which sends **one owner-approved synthetic RFQ** to production Odoo; the owner cancels it afterwards in Odoo with "Cancel RFQ". The §4.3/§17.2 "test Odoo" CPU measurement is therefore done with production Odoo's 401 path (unauthenticated, creates nothing) and that one synthetic RFQ. |
| **PII** | Customer data is kept in **Odoo without a time limit** (Odoo is the system of record). | The website's `DB_OPS` copy is only a delivery buffer: 30 days [parameter] after an RFQ is delivered (Odoo reference present), its personal fields are cleared and the non-personal record kept; an undelivered RFQ is never cleared. Runs as a step of the CI reconciler job (not a Worker cron — the account is at 5/5), one bounded batch per run, dry-run mode; sets `rfqs.retention_until`. `docs/RFQ_PII_RETENTION.md`, `lib/rfq/pii-retention.ts`, migration `0008_rfq_pii_retention.sql`. Replaces the architecture §13.4 default "90 days, after legal confirmation". |

## Decisions of 2026-10-04 (evening)

| §19 | Decision | Effect |
|---|---|---|
| **5** | Drawings / files channel = **WhatsApp**. No upload on the website for now. | "Send drawings via WhatsApp" link on `/contact` (fa/en/ar, plain link — works without JavaScript) and in the in-page RFQ confirmation, whose prefilled text carries the tracking number (AA-RFQ-…) in the page language. `https://wa.me/<number>?text=…`, `rel="noopener noreferrer"`, no third-party script, no tracking. The number is the build-time config value `WHATSAPP_BUSINESS_NUMBER` (`lib/content/whatsapp.ts`, international format, digits only; identical on both build targets). Without a valid number the link is not rendered anywhere (never a placeholder). **Number provided 2026-10-05 (W8.1): `989134222795`.** |
| **7** | Odoo `/web/login` stays on `odoo.ahanassa.com`, protected by origin lockdown + Cloudflare rate limit; staff 2FA recommended. | No website change. Odoo-side hardening stays with the Odoo track. |
| **1** | Alerts go to the **owner only**, no deputy (accepted single point of contact). | Unchanged delivery (`docs/OPS_ALERTS.md`): failed-run e-mails + healthchecks.io to the owner. The single point of contact is an accepted risk. |

Architecture amendment **r4** (owner-approved 2026-10-04): every build makes a staging and a production artifact from one code_sha + one snapshot; the production artifact may differ only in the allowlisted places (`lib/static/target-diff-gate.ts`). "Same bytes" in §2.7 / §7.1 step 8 now means "same code_sha, same snapshot, difference only in the r4 allowlist".

## Decisions of 2026-10-06

D-DAR-063 and D-SCHEDULE are implemented now (W9.1). D-PRICE and D-ARTICLES are recorded now and implemented later.

| # | Decision (as given) | Effect |
|---|---|---|
| **D-DAR-063** | **v11 release path:** staging publish + smoke → production-prep publish (environment approval) → observation → `STABLE_100`. **`MINIMUM_OBSERVATION_DURATION` (v11) = 24 h** with ops-health production showing no alert. **`PROMOTION_RUN_ID` substitute for v11** = the `content-publish.yml` production job run id. The 10% canary does not apply to a custom-domain static Worker. Scheduled production builds use the ledger's `STABLE_100` SHA, not the branch tip. | `docs/release/RELEASE_POLICY.md` §20 (path, §20.2 observation, §20.3 field mapping, §20.4 ledger branch `feat/v11-static-site`, §20.5 scheduled build) and §12. Closes `DOCUMENT_AUDIT_REPORT.md` DAR-063 (policy). **Follow-up the same day (W9.1 finding):** the cutover release `d4f57f6` predates the post-cutover config `785b532`, so it is recorded as **history only** (`SUPERSEDED`). The first v11 `STABLE_100` is a post-cutover SHA released through §20, dispatched with the owner present after a pre-check that the www custom-domain binding stays unchanged and `workers_dev` stays false. |
| **D-SCHEDULE** | Production content publish **daily at 10:30 Asia/Tehran (07:00 UTC)**. The staging cron is unchanged. | `content-publish.yml` on `main`: second schedule `0 7 * * *`. That run builds `BASE_PRODUCTION_SHA` and publishes production only on CONTENT_REBUILD `AUTO` (`RELEASE_POLICY.md` §20.5). The 22:47 UTC staging run is unchanged. |
| **D-PRICE** | Indicative Ahan Asa **ex-warehouse** price, **per kg, Toman, VAT included**, **product page only**, **selected products** (others "price on request"), **no JSON-LD offers**. **One manager** enters and publishes; **entry cut-off 10:00**. Prices **do not expire**: show the date and age, plus a fixed "ask for today's price" line. **Internal stale-price alert after 5 days.** | **Recorded now, implemented later (W9.2).** Supersedes architecture V1.1's "hide after `valid_until`" for prices. The 10:00 cut-off fits the 10:30 production publish (D-SCHEDULE). Nothing is built yet: no price field exists in Odoo's export, the snapshot or the site (`AHANASSA_W9_0_DISCOVERY_RESULT_*.md` §1a). The publication gate and leak scan keep refusing price keys until W9.2 changes them as a code release (§20). |
| **D-ARTICLES** | Articles are **not in Odoo**. An agent drafts them; the owner approves via PR in a **separate content source** (not the app branch), which the pipeline reads as data. **fa may publish alone**; no machine-made final en/ar translations; **no invented prices or stock**; technical claims **cite a source**. | **Recorded now, implemented later.** Supersedes architecture V1.1 §11 "off until an Odoo article model exists" (no Odoo article model will be built). Content approval is the owner's PR merge in the content source. Article pages remain a code release (§20); a new article after that is content. Language rule as `PROJECT_OVERRIDES.md` §1 (no machine-made final translations; each locale published only with real approved text). |

## Architecture §19 — status of every owner decision

| # | Decision | Architecture default | Status (2026-10-04) |
|---|---|---|---|
| 1 | Alert channel and owner | one operations owner + a deputy | **Decided 2026-10-04 (evening): owner only, no deputy** (accepted single point of contact). Built in W6/W6.1 (`docs/OPS_ALERTS.md`). |
| 2 | Daily publication hour | 03:00 Tehran | **Implemented** (W4): 22:47 UTC = 02:17 Tehran + manual dispatch (staging). **Production decided 2026-10-06 (D-SCHEDULE): 10:30 Tehran = 07:00 UTC**, unattended on CONTENT_REBUILD `AUTO`. |
| 3 | PII retention period | 90 days, after legal confirmation | **Decided 2026-10-04** (PII above): Odoo unlimited; website `DB_OPS` 30 days after delivery. |
| 4 | CONTENT_REBUILD in the release policy | yes | **Decided 2026-10-04: YES** (D4). |
| 5 | Official channel for drawings until attachments exist | the company's e-mail | **Decided 2026-10-04 (evening): WhatsApp**, no upload; link built (W8.0), rendered once the number is configured. |
| 6 | Indexing of the main pages and the catalog pages | home, products, categories, detail: index; contact: noindex | **Decided 2026-10-04: all public pages index** (D6), contact included. |
| 7 | Odoo public pages and `/web/login` | redirect pages; restrict login | **Decided 2026-10-04 (evening):** `/web/login` stays on `odoo.ahanassa.com` (origin lockdown + Cloudflare rate limit; staff 2FA recommended). |
| 8 | Separate Cloudflare account for staging | not required | Default applies; **not re-decided**. |
| 9 | Test Odoo for staging and Odoo tests | needed | **Decided 2026-10-04: NO** (D9); W7 replaced as above. |
| 10 | RFQ host | `api.ahanassa.com` | **Chosen**; proven on staging as `api-staging.ahanassa.com` (W2). Production host is W8. |
| 11 | Family/form/grade/standard filters in the first release | removed; later browser-side | **Implemented** as the default (A3). |
