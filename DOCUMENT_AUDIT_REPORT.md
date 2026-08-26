# DOCUMENT_AUDIT_REPORT.md

## Ahan Asa Website — Documentation Reconciliation Audit

**Audit role:** Records conflicts discovered while building the root canonical control layer, how `03 > 02 > 01` precedence resolved them, genuine unresolved ambiguities, missing referenced documents, and blockers.
**Status:** OPEN, narrowed — owner sign-off received 2026-08-26 on the P0/P1 findings that were blocking Phase 1 foundation work; remaining open items are either non-blocking integration/production gates or content-authoring gaps
**Version:** 2.0.0
**Audit date:** 2026-08-26 (v1.0.0), owner sign-off applied 2026-08-26 (v2.0.0)
**Scope:** Complete reconciliation of `01-sources/` (63 files), `02-sources/` (21 files), `03-sources/` (3 files) — 87 files total

---

## 0. Owner sign-off round — 2026-08-26

The project owner reviewed this report's open P0/P1 findings and `PROJECT_OVERRIDES.md` v1.0.0 and issued explicit decisions, recorded in full in `PROJECT_OVERRIDES.md` v2.0.0 §1–§8. Summary of what changed:

| Finding | Disposition |
|---|---|
| DAR-008 (fa/en/ar weak evidence) | **RESOLVED BY OWNER SIGN-OFF** — multilingual launch confirmed |
| DAR-001 (contact facts) | **PARTIALLY RESOLVED** — address confirmed; phone remains genuinely open |
| DAR-003 (public DB/catalog scope expansion) | **CONFIRMED BY OWNER SIGN-OFF** — catalog + public pricing explicitly approved |
| DAR-009 (GTM/GSC weak evidence) | **RESOLVED BY OWNER SIGN-OFF** — architecture requirement confirmed; specific IDs remain pending configuration, not a documentation gap |
| DAR-013 (Odoo version/modules) | **CONFIRMED AS NON-BLOCKING INTEGRATION-PHASE GATE** — Odoo's role confirmed; version/modules/protocol/mapping remain genuinely unknown but explicitly do not block foundation work |
| Logo source assets | **NEW — CONFIRMED**: `/logo/` holds authoritative source assets, immutable, do not redraw/recreate |
| Attachment scanning | **NEW — CONFIRMED non-blocking for foundation**, remains a required gate before production RFQ uploads |

Findings not listed above (DAR-002/004/005/006/007/010/011/012/014/015/016/017) were not part of this sign-off round and retain their prior status.

---

## 1. Method

Every file in `01-sources/`, `02-sources/`, and `03-sources/` was inspected: document-control headers and stated scope were read for all 87 files; the 16 documents most load-bearing for the canonical control layer (both `CLAUDE.md` versions, both `PROJECT_BRIEF.md` versions, both `STACK.md` versions, `01-sources/DECISIONS.md`, `01-sources/README.md`, `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/DATA_ARCHITECTURE(1).md`, `02-sources/DATABASE_SCHEMA.md`, and all three `03-sources` files) were read in full; the remainder were verified with targeted greps for the specific conflict signals this audit was checking for — "Vercel", Persian-only/future-locale phrasing, and adapter naming — against their full text. `01-sources/all_in_one.md` (a 63,000-line concatenation of the other `01-sources` files) was inspected structurally only, not re-read in full, since its content duplicates the individually-audited files.

Findings below are grouped: conflicts the precedence rule genuinely resolves (§2), a claim in `03-sources` that could not be corroborated and must not be trusted (§3), documents referenced across the corpus that do not exist (§4), and genuine blockers that no amount of document reconciliation can resolve (§5).

Per the project owner's instruction: an issue is **not** left `OPEN` merely because an older document conflicts with a newer one when `03 > 02 > 01` already resolves it — those are marked `RESOLVED BY PRECEDENCE`.

---

## 2. Conflicts resolved by precedence

### DAR-002 — Hosting platform: Vercel → Cloudflare Workers

**Status:** RESOLVED BY PRECEDENCE
**Affected:** all 63 `01-sources` documents that mention Vercel (essentially the entire baseline — `README.md`, `STACK.md`, `TECHNICAL_ARCHITECTURE.md`, `DEPLOYMENT_ARCHITECTURE.md`, `CACHING_STRATEGY.md`, `SECURITY_GUIDELINES.md`, `ENVIRONMENT_VARIABLES.md`, `TESTING_STRATEGY.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md`, `HREFLANG_CANONICAL.md`, `REDIRECTS.md`, `PERFORMANCE_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`, `API_INTEGRATIONS.md`, `SEO_QA_CHECKLIST.md`, `DO_NOT_CHANGE.md`, `DEVELOPMENT_RULES.md`, `TASKS.md`, `DECISIONS.md` ADR-012)
**Resolved by:** `02-sources/DEPLOYMENT_ARCHITECTURE.md` explicitly: *"It replaces the former Vercel deployment baseline"* and lists Vercel hosting as *"no longer approved."* Confirmed independently by the live repository scaffold (`package.json`, `wrangler.jsonc` — Cloudflare Workers only, no Vercel config present).
**Action:** none required in the source folders (immutable). Recorded in `PROJECT_OVERRIDES.md` §2 and `DOCS_INDEX.md`.

### DAR-003 — Public database: none → Cloudflare D1 (two databases)

**Status:** RESOLVED BY PRECEDENCE
**Affected:** `01-sources/DECISIONS.md` ADR-011 ("No Public Application Database at Launch"), `01-sources/DATA_ARCHITECTURE.md`, `01-sources/STACK.md` §14.2 ("Prisma/Drizzle/Supabase not approved by default"), `01-sources/PROJECT_BRIEF.md` (no ERP concept anywhere)
**Resolved by:** `02-sources/DATABASE_SCHEMA.md` explicitly: *"If an older document says that the website has no database... that statement is superseded by the approved Cloudflare + Odoo architecture described here."* Corroborated by `02-sources/TECHNICAL_ARCHITECTURE.md` and `02-sources/DATA_ARCHITECTURE(1).md`.
**Note:** this is not a documentation staleness fix, it is a genuine **product scope expansion** — from a static lead-generation brochure site to a full commercial procurement platform with catalog, pricing, and ERP integration. This was flagged for owner visibility rather than silently absorbed.
**Owner sign-off, 2026-08-26:** **CONFIRMED.** The owner explicitly approved the public product catalog and public pricing architecture as in-scope for the website, superseding the 01-layer prohibition on public price pages. Recorded in `PROJECT_OVERRIDES.md` §4. The `/steel-products` vs `/steel` route-naming question (DAR-016) is a separate, still-open matter.

### DAR-004 — CMS: deferred → built into D1

**Status:** RESOLVED BY PRECEDENCE
**Affected:** `01-sources/DECISIONS.md` ADR-007 ("Git-Managed Typed Content; CMS Deferred"), `01-sources/CMS_ARCHITECTURE.md` (a "proposed" doc, never accepted)
**Resolved by:** `02-sources/CMS_ARCHITECTURE.md`, `02-sources/DATABASE_SCHEMA.md` §5.1 (article tables), `02-sources/TECHNICAL_ARCHITECTURE.md` §10.

### DAR-005 — Cloudflare adapter: `02-sources` self-contradiction, resolved by the live scaffold

**Status:** RESOLVED BY PRECEDENCE + external verification
**Affected:** `02-sources/STACK.md` §7.2 ("The first production release MUST use `@opennextjs/cloudflare`... `vinext`... is a migration candidate, not the launch baseline")
**Conflicts with (same layer, same date):** `02-sources/TECHNICAL_ARCHITECTURE.md` §6 ("Cloudflare currently recommends `vinext`... `vinext` SHOULD be selected when required features pass") and §27 ("Next.js adapter: Compatibility-gated; vinext preferred, OpenNext fallback")
**Resolved by:** the actual initialized repository already uses `vinext` (`package.json`, `wrangler.jsonc`; `npm run build` passes). This is a fact on the ground, not an open decision — `02-sources/STACK.md` §7.2's adapter lock is superseded by project reality, which happens to align with `02-sources/TECHNICAL_ARCHITECTURE.md`'s stated preference rather than `02-sources/STACK.md`'s.
**Action:** recorded in `PROJECT_OVERRIDES.md` §2. `02-sources/STACK.md`'s compatibility-gate checklist (7 points) was never formally run — worth confirming retroactively that the scaffold satisfies it, but this does not block continued use of `vinext`.

### DAR-006 — `02-sources`/`03-sources` two duplicate files (confirmed identical)

**Status:** RESOLVED — VERIFIED IN REPOSITORY
**Files:** `02-sources/CMS_ARCHITECTURE (1).md` vs `02-sources/CMS_ARCHITECTURE.md` (1037 lines each); `02-sources/DEPLOYMENT_ARCHITECTURE (2).md` vs `02-sources/DEPLOYMENT_ARCHITECTURE.md` (821 lines each)
**Verified by:** `diff` — zero output in both cases, byte-identical.
**Action:** none — these are accidental export duplicates. Recorded in `DOCS_INDEX.md` §11. Not deleted (source folders are immutable).

### DAR-007 — `DATA_ARCHITECTURE(1).md` filename mismatch

**Status:** RESOLVED — VERIFIED IN REPOSITORY
**Observed:** `02-sources/DATA_ARCHITECTURE(1).md` is the only file for its subject in `02-sources` (no sibling `DATA_ARCHITECTURE.md` exists there) — the `(1)` is a spurious download-collision suffix, not evidence of a second copy. Its own content declares itself `DATA_ARCHITECTURE.md`.
**Action:** treated as the canonical 02-layer `DATA_ARCHITECTURE.md` throughout `PROJECT_OVERRIDES.md` and `DOCS_INDEX.md`.

---

## 3. Claim that could not be corroborated — do not trust

### DAR-001 — `03-sources` claims company contact/address/board facts are "centrally defined"; only a weak mockup source actually exists

**Severity:** P0 — Critical (risk of fabricated or under-verified business facts entering implementation)
**Status:** PARTIALLY RESOLVED BY OWNER SIGN-OFF, 2026-08-26 — **address CONFIRMED**, phone remains **OPEN**. Owner-confirmed canonical address: `اصفهان، خیابان هزارجریب، کوی آزادگان` (Isfahan, Hezar Jarib Street, Kooy Azadegan) — Persian form is primary. The candidate phone `۰۳۱۳۵۱۳۴` was explicitly **not** confirmed as production-ready (owner flagged it as possibly incomplete); do not publish it. Board/leadership information remains entirely unconfirmed. Recorded in `PROJECT_OVERRIDES.md` §7.1–§7.2.
**Affected:** `03-sources/DOCS_INDEX.md` §4 states: *"approved current company address and phone are centrally defined; approved board information is centrally defined"* — as if these facts already exist in an (unwritten) `PROJECT_OVERRIDES.md`.
**Finding (corrected):** no formal decision record, `PROJECT_BRIEF.md`, or control document in any layer states a company address, phone, email, WhatsApp, business hours, or board/leadership information. However, `02-sources/ahan-asa-homepage-control.html` (a homepage HTML **mockup**, not a specification) does contain candidate values at lines 802–803 — an Isfahan address and an 8-digit phone number that appears truncated. An earlier pass of this audit stated flatly that "no such content exists anywhere," which was itself inaccurate — it exists, just in a non-authoritative, unverified, and probably-incomplete form. Both versions of `PROJECT_BRIEF.md` (`01-sources` §21, `02-sources` §29) still explicitly list contact information as unresolved `TBD` items requiring the project owner, which outranks a design mockup.
**Interpretation:** the `03-sources` audit pass that first claimed these facts were "centrally defined" was likely referring to this same mockup, or to information that was intended to arrive but never got formally recorded. Either way, treating the mockup values as settled fact would violate every layer's own rule against inventing/asserting unverified business or contact facts (`CLAUDE.md` §25/§33 in both `01` and `02` layers).
**Action:** `PROJECT_OVERRIDES.md` §7.1 records the address as owner-confirmed; §7.2 keeps the phone candidate explicitly flagged as unverified/likely incomplete. Do not publish the phone number in production until the owner supplies the complete value.

---

## 4. Genuine gaps that precedence cannot resolve

### DAR-008 — fa/en/ar multilingual override has weak, single-source evidence

**Severity:** P0 — Critical
**Status:** RESOLVED BY OWNER SIGN-OFF, 2026-08-26. The owner explicitly confirmed the Ahan Asa website will launch in Persian, English, and Arabic, with Persian as primary/default, and that this requirement is authoritative even where older SEO documentation (both `01-sources` and same-day `02-sources`) still describes Persian-only. Locale architecture must be designed for fa/en/ar from the beginning. The owner also explicitly directed: do not fabricate machine-translated "final" content to satisfy this — missing approved en/ar content remains an acknowledged content-production dependency, not grounds to publish placeholder copy as final. Recorded in `PROJECT_OVERRIDES.md` §1.
**Detail:** see `PROJECT_OVERRIDES.md` §1 in full. The requirement that English and Arabic ship at initial launch (not as future/reserved locales) comes only from `03-sources/CLAUDE(1).md`. It is **not** corroborated by any `02-sources` document — in fact `02-sources/METADATA_SPEC.md`, `02-sources/STRUCTURED_DATA.md`, `02-sources/INTERNAL_LINKING.md`, `02-sources/SITEMAP_ROBOTS_SPEC.md`, `02-sources/TESTING_STRATEGY.md`, and `02-sources/SEO_QA_CHECKLIST.md` — all dated 2026-08-26, one day *after* the Persian-only `01-sources` baseline — still explicitly describe Persian-only launch with en/ar "reserved for future."
**Why this matters:** `01-sources/DECISIONS.md` §9.1 requires "a new or amended decision record" before changing locale-publication scope (ADR-003). No such record exists anywhere. The `03-sources` override may reflect a genuine, more-recent owner decision that simply wasn't propagated into the 02-layer SEO documents yet — or it may be an error in the prior audit pass, the same class of problem identified in DAR-001.
**Recommended resolution:** confirm directly with the project owner before building English/Arabic routes, content models, or QA gates. Until confirmed, treat `PROJECT_OVERRIDES.md` §1 as provisionally controlling (per strict layer precedence) but do not consider it low-risk.

### DAR-009 — Analytics/GTM/GSC requirement has weak evidence

**Severity:** P2 — Minor
**Status:** RESOLVED BY OWNER SIGN-OFF, 2026-08-26. Owner confirmed GTM, GSC, and SEO measurement architecture as required from implementation. Specific GTM container ID, GA4 property ID, and Search Console verification value remain pending configuration values (not a documentation conflict) — treat as environment variables to populate later. Recorded in `PROJECT_OVERRIDES.md` §5.
**Original detail (pre-sign-off):** `PROJECT_OVERRIDES.md` §5 (GTM/GSC required) was originally sourced only from `03-sources/CLAUDE(1).md`. `01-sources/DECISIONS.md` OPEN-005 explicitly defers the analytics provider entirely, and no `02-sources` document commits to GTM specifically. This was not a hard contradiction — "GTM is required" and "the exact container ID is still pending" can both be true — and the owner has now confirmed the architectural requirement directly (see Status above).

### DAR-010 — Locale-scope propagation gap in `01-sources`-only specialist documents

**Severity:** P1 — Major
**Status:** OPEN
**Affected:** `01-sources/CONTENT_MODEL.md` (locale field modeled as `fa` only), `01-sources/FONT_STRATEGY.md` (no Arabic glyph/font guidance), `01-sources/LOCALIZATION.md`, `01-sources/LOCALE_CONTENT_STRUCTURE.md` (both describe Persian-only structure) — none of these have a `02-sources` or `03-sources` override, unlike the SEO documents. Applying `PROJECT_OVERRIDES.md` §1 to them is a reading-time override only; the documents themselves still need real authoring work (Arabic font/glyph selection, a genuine per-locale content model) before implementation, not just reinterpretation.
**Recommended action:** batch-author locale extensions to these four documents once DAR-008 is confirmed.

### DAR-011 — `01-sources` release-checklist documents still reference Vercel promotion steps

**Severity:** P1 — Major
**Status:** OPEN
**Affected:** `01-sources/PRE_DEPLOY_CHECKLIST.md`, `01-sources/POST_DEPLOY_CHECKLIST.md` — unlike `TESTING_STRATEGY.md`/`QA_CHECKLIST.md`/`SEO_QA_CHECKLIST.md`, these two have no `02-sources` replacement. Their checklist *content* (functional/QA items) is reusable, but references to Vercel promotion/rollback need rewriting against `02-sources/DEPLOYMENT_ARCHITECTURE.md`'s actual Cloudflare Workers release flow.

### DAR-012 — `01-sources/FOLDER_STRUCTURE.md` predates the commercial/Odoo module set

**Severity:** P2 — Minor
**Status:** OPEN
**Detail:** `02-sources/TECHNICAL_ARCHITECTURE.md` §7 defines `lib/odoo/`, `lib/outbox/`, `lib/rfq/`, `lib/pricing/`, `workers/`, `db/migrations/` — none of which exist in `01-sources/FOLDER_STRUCTURE.md`'s tree. Needs a refresh before implementation begins in earnest, but is not a conflict — purely additive.

### DAR-013 — Odoo version, modules, and field mapping remain a genuine external discovery gap

**Severity:** P3 — Note / decision gate, not a documentation defect
**Status:** CONFIRMED AS NON-BLOCKING INTEGRATION-PHASE GATE BY OWNER SIGN-OFF, 2026-08-26. Owner confirmed Odoo's role (ERP integration endpoint, intended to own customers/CRM/quotations/sales/commercial product-price data where appropriate) and explicitly confirmed that Odoo version, installed modules, exact protocol, and exact field mapping remain unconfirmed **and that this does not block Phase 1 foundation work** — it only blocks the specific work of wiring the real Odoo adapter. Do not convert the Odoo 19 JSON-2 API preference into an assumption that the deployed server is actually Odoo 19; verify against the live instance when that integration work begins. Recorded in `PROJECT_OVERRIDES.md` §3.

### DAR-014 — `DO_NOT_CHANGE.md` §9 and §16 will misfire as blocking protections against now-approved work

**Severity:** P1 — Major (real risk of blocking correct implementation, not just a stale-reference cosmetic issue)
**Status:** OPEN
**Affected:** `01-sources/DO_NOT_CHANGE.md` §9 ("P0 — Localization and Direction") and §16 ("P1 — Technical Architecture")
**Finding:** §9 states Claude "MUST NOT... Change locale routing... without authorization" and frames adding a locale as requiring approval — `PROJECT_OVERRIDES.md` §1 *is* that authorization, but §9 itself gives no hint that it has been granted. §16 locks "Vercel deployment behind Cloudflare" as the approved baseline and explicitly forbids "Add a CMS, database" without "explicit architecture approval" — both are directly superseded by the confirmed Cloudflare Workers + D1 + built-in-CMS architecture (`PROJECT_OVERRIDES.md` §2–§3), but nothing in `DO_NOT_CHANGE.md` itself says so.
**Risk:** an agent reading `DO_NOT_CHANGE.md` literally, in isolation, could stop and refuse legitimate multilingual or CMS/database work that the rest of the control layer has already approved.
**Action:** `DOCS_INDEX.md` §2 now carries an explicit caveat on the `DO_NOT_CHANGE.md` row. Every other protection in the document (brand identity, palette, slogan, secrets handling, dependency discipline) remains fully active and is not affected by this finding.

### DAR-015 — No decision record documents the Vercel→Cloudflare, Persian-only→trilingual, or STACK-mandated-adapter→actual-vinext pivots

**Severity:** P1 — Major (process/traceability gap, not a blocking contradiction — precedence already resolves the content)
**Status:** OPEN
**Affected:** `01-sources/DECISIONS.md` (the only ADR/DDR register that exists in any layer — no `02-sources` or `03-sources` equivalent was ever written)
**Finding:** three material pivots happened between `01-sources` and `02-sources`/`03-sources` — production hosting (Vercel → Cloudflare Workers), launch locale scope (Persian-only → fa/en/ar), and framework adapter (`02-sources/STACK.md`'s locked `@opennextjs/cloudflare` → the actually-scaffolded `vinext`) — but nothing in any layer records *when or why* these decisions were made. `01-sources/DECISIONS.md` §9.1 itself states that changing a decision like ADR-003 (Persian-only) requires "a new or amended decision record." No such record exists.
**Action:** recommend the project owner (or a future documentation pass) add fresh `DECISIONS.md` entries for these three pivots, explicitly naming the superseded ADRs (ADR-003, ADR-011, ADR-012, and `02-sources/STACK.md` §7.2's adapter lock). Not a blocker for continued work — `PROJECT_OVERRIDES.md` and this report already carry the resolved state — but a durable gap in the project's own audit trail.

### DAR-016 — Unresolved route-naming conflicts (not locale-related)

**Severity:** P1 — Major
**Status:** OPEN for the catalog-route conflict; RESOLVED BY GUIDANCE for the RFQ-route conflict
**Finding:**
- **RFQ route:** `01-sources/ROUTES.md` and `01-sources/REDIRECTS.md` use `/request` as the canonical RFQ route; `01-sources/SITEMAP.md` and `01-sources/SEO_PAGE_MAP.md` use `/request-consultation`. `02-sources/INTERNAL_LINKING.md` §3.1 explicitly identifies this conflict and recommends `/request` as canonical with `/request-consultation` redirected to it — being the newest document to address the subject, treat this as the controlling guidance.
- **Catalog route:** `01-sources/ROUTES.md` uses `/steel-products/[category-slug]`; the 02-layer catalog architecture (`02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/METADATA_SPEC.md`, `02-sources/STRUCTURED_DATA.md`) uses `/steel/{category}/{product}/{variant}`. No document explicitly reconciles these two patterns — this is a genuine open naming decision, not resolved by precedence alone since both route families are actively referenced by different newer documents.
- **Minor, same class:** `01-sources/REDIRECTS.md` also lists `/terms` vs `/terms-of-use` as an unresolved `blocked` conflict.
**Action:** adopt `/request` per `02-sources/INTERNAL_LINKING.md` §3.1. The `/steel-products` vs `/steel` catalog-route naming and the `/terms` naming remain open — resolve before implementing routing, sitemap, or redirect logic for those surfaces.

### DAR-017 — `FONT_STRATEGY.md` needs an architecture-level redesign for multi-locale font budgets, not a copy edit

**Severity:** P1 — Major
**Status:** OPEN
**Affected:** `01-sources/FONT_STRATEGY.md` (no `02-sources`/`03-sources` override exists)
**Finding:** the document locks a hard "one active font family, ≤180KB total font weight, one initial font request" budget and CLS/performance gate math, explicitly scoped to "Phase 1 locale: Persian only" (§3, §13). Unlike most other `01-sources`-only documents affected by the multilingual override, this one cannot simply be "read through" the override — its numeric budgets and loading architecture were built assuming a single locale's font weight, and §13 itself already flags that Arabic pages must not reuse the Persian family (Estedad Variable), meaning a real Arabic-script type family decision is still outstanding.
**Action:** treat as a genuine pre-implementation authoring gap: the font-loading strategy needs redesigning for 2–3 concurrent locale budgets, and an Arabic type family needs selecting, before English/Arabic pages can ship correctly. See `DOCS_INDEX.md` §3 for the corrected status.

### DAR-018 — Logo source assets confirmed (new, owner sign-off 2026-08-26)

**Severity:** N/A — informational, closes a prior "not confirmed" item
**Status:** RESOLVED BY OWNER SIGN-OFF
**Finding:** `/logo/` contains the official Ahan Asa brand/logo source assets (`AhanAsa logo-13.jpg`, `AhanAsa logo-14.jpg`), confirmed authoritative by the owner. `/logo/` is immutable — same rule as `01-sources/`, `02-sources/`, `03-sources/`: do not modify, redraw, recreate, or substitute the originals. Optimized/converted production derivatives (favicon, OG image, responsive sizes) may be generated later under `/public/brand/` when that implementation work is reached — recorded here as a known future step, not performed as part of this reconciliation pass. Recorded in `PROJECT_OVERRIDES.md` §6.1.

### DAR-019 — Attachment-scanning gate classification confirmed (new, owner sign-off 2026-08-26)

**Severity:** N/A — informational, clarifies an existing security requirement's phasing
**Status:** RESOLVED BY OWNER SIGN-OFF
**Finding:** the owner confirmed that attachment malware/content-scanning implementation is **not** a blocker for Phase 1 foundation work, but remains a required security decision that must be resolved (provider selected, pipeline implemented and approved) before production RFQ file uploads are enabled. Consistent with the existing rule in `CLAUDE.md`/security guidelines that if the attachment-security pipeline isn't approved when reached, attachments must stay disabled rather than ship insecurely. Recorded in `PROJECT_OVERRIDES.md` §8.

---

## 5. Missing referenced documents

The following are named repeatedly across `02-sources` "related documents" lists but do not exist as physical files in any of the three source layers. Each entry notes whether its intended content is substantially covered elsewhere.

| Missing document | Referenced by | Substantially covered elsewhere? |
|---|---|---|
| `ODOO_INTEGRATION.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/STACK.md`, `02-sources/PROJECT_BRIEF.md` | Partially — `02-sources/TECHNICAL_ARCHITECTURE.md` §14, `02-sources/DATA_ARCHITECTURE(1).md` §20–§27 |
| `SYSTEM_OF_RECORD.md` | nearly every `02-sources` document | Yes — full ownership matrix exists in `02-sources/TECHNICAL_ARCHITECTURE.md` §5 and `02-sources/DATA_ARCHITECTURE(1).md` §5 |
| `SYNC_STRATEGY.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/DATABASE_SCHEMA.md` | Partially — retry/backoff cadence not fully specified anywhere |
| `ERP_DATA_MAPPING.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/STACK.md` | Partially — provisional mapping table only, explicitly gated on Odoo module inspection |
| `FAILURE_RECOVERY.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/PROJECT_BRIEF.md` | Partially — no dedicated runbook exists |
| `PRICING_SYSTEM.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/STACK.md` | Yes — `02-sources/TECHNICAL_ARCHITECTURE.md` §11.2–§11.4 |
| `RFQ_SYSTEM.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/STACK.md` | Yes — `02-sources/TECHNICAL_ARCHITECTURE.md` §12, `02-sources/DATA_ARCHITECTURE(1).md` §15–§19 |
| `PRODUCT_CATALOG_SPEC.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/PROJECT_BRIEF.md` | Yes — `02-sources/TECHNICAL_ARCHITECTURE.md` §11 |
| `ADMIN_PANEL_SPEC.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/PROJECT_BRIEF.md` | Partially — scope outline only, no UI spec |
| `AUTHORIZATION_ROLES.md` | `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/DATABASE_SCHEMA.md` | Partially — role list only, no permission matrix |
| `PERFORMANCE_BUDGET.md` | `02-sources/TECHNICAL_ARCHITECTURE.md` §20, `02-sources/STACK.md` | Partially — provisional numbers only |
| `COLOR_SYSTEM.md` | `01-sources/CLAUDE.md`, `02-sources/CLAUDE.md` | Partially — core tokens inline in `PROJECT_OVERRIDES.md` §6 and `01-sources/DESIGN_SYSTEM.md` |
| `TYPOGRAPHY_SYSTEM.md` | `01-sources/CLAUDE.md`, `02-sources/CLAUDE.md`, `01-sources/RESPONSIVE_QA.md` | No — no dedicated content found anywhere |
| `AHAN_ASA_SITE_COPY_FA_FINAL.md` | `01-sources/SEO_QA_CHECKLIST.md`, `02-sources/SEO_QA_CHECKLIST.md` (both declare it "the sole approved source of page copy") | No — this is a content-authoring gap, not a specification gap; do not fabricate final page copy in its place |

None of these gaps block the documentation-reconciliation pass itself. They do block confident implementation of the Odoo integration, RFQ, pricing, and admin/authorization surfaces — see recommended next phase below.

---

## 6. Sign-off summary

| Metric | Value |
|---|---:|
| Total files inspected | 87 (63 in `01-sources/`, 21 in `02-sources/`, 3 in `03-sources/`) |
| Canonical root files created | 4 (`PROJECT_OVERRIDES.md`, `CLAUDE.md`, `DOCS_INDEX.md`, `DOCUMENT_AUDIT_REPORT.md`) |
| Conflicts resolved by precedence | 7 (DAR-002 – DAR-007), propagating across roughly 40 individual source documents |
| **Findings closed by owner sign-off, 2026-08-26** | **7** — DAR-003 catalog/pricing scope (CONFIRMED), DAR-008 fa/en/ar multilingual (CONFIRMED), DAR-009 GTM/GSC architecture (CONFIRMED), DAR-013 Odoo role/non-blocking status (CONFIRMED), DAR-018 logo source assets (CONFIRMED, new), DAR-019 attachment-scanning phasing (CONFIRMED, new), DAR-001 partially closed (address CONFIRMED) |
| Findings still open | 10 — DAR-001 phone only (OPEN, candidate unconfirmed), DAR-010 locale-extension authoring, DAR-011 Vercel references in deploy checklists, DAR-012 folder-structure refresh, DAR-014 `DO_NOT_CHANGE.md` §9/§16 annotation, DAR-015 missing `DECISIONS.md` pivot records, DAR-016 catalog/`/terms` route-naming, DAR-017 `FONT_STRATEGY.md` redesign, Odoo version/modules/protocol/mapping values themselves (non-blocking per DAR-013), attachment-scanning provider selection (non-blocking per DAR-019) |
| Missing referenced documents | 14 (§5) — none block Phase 1 foundation; several block later Odoo/RFQ/pricing/admin implementation specifically |
| **Phase 1 foundation status** | **UNBLOCKED.** Per `PROJECT_OVERRIDES.md` §11, none of the previously-open P0/P1 findings block foundation work (locale/routing architecture, design system, content model, D1/R2/Queues scaffolding, catalog/pricing UI, RFQ intake UI, CMS structure). Remaining open items are either configuration values pending later, integration-phase gates (Odoo protocol/mapping), pre-production gates (attachment scanning, phone publication), or documentation-authoring/cleanup work that does not block writing foundation code. |
| Recommended next implementation phase | 1) Proceed with Phase 1 foundation implementation — routing/locale architecture for fa/en/ar, design system, content model, D1/R2/Queues scaffolding, public catalog/pricing UI against synchronized/cached data, RFQ intake UI, CMS structure. 2) In parallel (documentation, non-blocking): resolve the `/steel-products` vs `/steel` and `/terms` route-naming conflicts (DAR-016), add the missing `DECISIONS.md` pivot records (DAR-015), annotate `DO_NOT_CHANGE.md` §9/§16 (DAR-014), redesign `FONT_STRATEGY.md` for multi-locale budgets and select an Arabic type family (DAR-017). 3) Before Odoo integration work specifically: verify Odoo version/modules/protocol against the live instance and author the missing `ODOO_INTEGRATION.md`/`SYSTEM_OF_RECORD.md`/`SYNC_STRATEGY.md`/`ERP_DATA_MAPPING.md`. 4) Before production RFQ uploads: select and implement an attachment-scanning provider (DAR-019). 5) Before production phone publication: obtain the complete number from the owner (DAR-001). |

---

## 7. Maintenance rule

When a finding above is resolved: update the finding's status, cite the resolving evidence, and update `PROJECT_OVERRIDES.md`/`DOCS_INDEX.md` accordingly. Do not delete resolved findings — keep them as an audit trail. New conflicts discovered during future work should be added here following the same DAR-### numbering, continuing from DAR-020.

---

**End of `DOCUMENT_AUDIT_REPORT.md`**
