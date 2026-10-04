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
| **5** | Drawings / files channel = **WhatsApp**. No upload on the website for now. | "Send drawings via WhatsApp" link on `/contact` (fa/en/ar, plain link — works without JavaScript) and in the in-page RFQ confirmation, whose prefilled text carries the tracking number (AA-RFQ-…) in the page language. `https://wa.me/<number>?text=…`, `rel="noopener noreferrer"`, no third-party script, no tracking. The number is the build-time config value `WHATSAPP_BUSINESS_NUMBER` (`lib/content/whatsapp.ts`, international format, digits only; identical on both build targets). **Not provided yet** → the link is not rendered anywhere (never a placeholder). |
| **7** | Odoo `/web/login` stays on `odoo.ahanassa.com`, protected by origin lockdown + Cloudflare rate limit; staff 2FA recommended. | No website change. Odoo-side hardening stays with the Odoo track. |
| **1** | Alerts go to the **owner only**, no deputy (accepted single point of contact). | Unchanged delivery (`docs/OPS_ALERTS.md`): failed-run e-mails + healthchecks.io to the owner. The single point of contact is an accepted risk. |

Architecture amendment **r4** (owner-approved 2026-10-04): every build makes a staging and a production artifact from one code_sha + one snapshot; the production artifact may differ only in the allowlisted places (`lib/static/target-diff-gate.ts`). "Same bytes" in §2.7 / §7.1 step 8 now means "same code_sha, same snapshot, difference only in the r4 allowlist".

## Architecture §19 — status of every owner decision

| # | Decision | Architecture default | Status (2026-10-04) |
|---|---|---|---|
| 1 | Alert channel and owner | one operations owner + a deputy | **Decided 2026-10-04 (evening): owner only, no deputy** (accepted single point of contact). Built in W6/W6.1 (`docs/OPS_ALERTS.md`). |
| 2 | Daily publication hour | 03:00 Tehran | **Implemented** (W4): 22:47 UTC = 02:17 Tehran + manual dispatch. |
| 3 | PII retention period | 90 days, after legal confirmation | **Decided 2026-10-04** (PII above): Odoo unlimited; website `DB_OPS` 30 days after delivery. |
| 4 | CONTENT_REBUILD in the release policy | yes | **Decided 2026-10-04: YES** (D4). |
| 5 | Official channel for drawings until attachments exist | the company's e-mail | **Decided 2026-10-04 (evening): WhatsApp**, no upload; link built (W8.0), rendered once the number is configured. |
| 6 | Indexing of the main pages and the catalog pages | home, products, categories, detail: index; contact: noindex | **Decided 2026-10-04: all public pages index** (D6), contact included. |
| 7 | Odoo public pages and `/web/login` | redirect pages; restrict login | **Decided 2026-10-04 (evening):** `/web/login` stays on `odoo.ahanassa.com` (origin lockdown + Cloudflare rate limit; staff 2FA recommended). |
| 8 | Separate Cloudflare account for staging | not required | Default applies; **not re-decided**. |
| 9 | Test Odoo for staging and Odoo tests | needed | **Decided 2026-10-04: NO** (D9); W7 replaced as above. |
| 10 | RFQ host | `api.ahanassa.com` | **Chosen**; proven on staging as `api-staging.ahanassa.com` (W2). Production host is W8. |
| 11 | Family/form/grade/standard filters in the first release | removed; later browser-side | **Implemented** as the default (A3). |
