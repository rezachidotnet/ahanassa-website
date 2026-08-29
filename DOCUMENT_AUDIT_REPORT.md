# DOCUMENT_AUDIT_REPORT.md

## Ahan Asa Website — Documentation Reconciliation Audit

**Audit role:** Records conflicts discovered while building and maintaining the root canonical control layer, including historical source-layer conflicts, genuine unresolved ambiguities, missing referenced documents, and blockers.
**Status:** OPEN, narrowed — owner sign-off received 2026-08-26 on the P0/P1 findings that were blocking Phase 1 foundation work; DAR-013 (Odoo mapping) closed for the RFQ sync path 2026-08-28 by live-environment audit; remaining open items are either non-blocking integration/production gates or content-authoring gaps
**Version:** 2.3.0
**Audit date:** 2026-08-26 (v1.0.0), owner sign-off applied 2026-08-26 (v2.0.0), customer account/portal future-phase architecture registered 2026-08-28 (v2.2.0, DAR-025), Odoo RFQ mapping verified against the live environment 2026-08-28 (v2.3.0, DAR-026)
**Scope:** Historical reconciliation of an earlier three-layer source export; current active documentation cleanup scope is the root control layer plus the consolidated `01-sources/` corpus.

**AUD-034 update, 2026-08-27:** the active authority model is now `PROJECT_OVERRIDES.md` → `CLAUDE.md` → `01-sources/` → verified implementation facts. `02-sources/` and `03-sources/` are no longer active source layers. Remaining mentions of the old three-layer model in this report are **HISTORICAL / SUPERSEDED** audit trail only.

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

**HISTORICAL / SUPERSEDED METHOD NOTE:** the original audit inspected files from an earlier `01-sources/`, `02-sources/`, and `03-sources/` export and used the old `03 > 02 > 01` precedence rule. That method explains this report's historical findings, but does not define the current implementation reading order. Current implementation agents must use `PROJECT_OVERRIDES.md` → `CLAUDE.md` → `01-sources/` → verified implementation facts.

Findings below preserve the original historical grouping. References to `02-sources/`, `03-sources/`, and old source precedence are retained only to explain how earlier conflicts were discovered.

Per the project owner's instruction: an issue is **not** left `OPEN` merely because a superseded historical document conflicts with the current root control layer.

---

## 2. Conflicts resolved by precedence

### DAR-002 — Hosting platform: Vercel → Cloudflare Workers

**Status:** RESOLVED BY PRECEDENCE
**Affected:** all 63 `01-sources` documents that mention Vercel (essentially the entire baseline — `README.md`, `STACK.md`, `TECHNICAL_ARCHITECTURE.md`, `DEPLOYMENT_ARCHITECTURE.md`, `CACHING_STRATEGY.md`, `SECURITY_GUIDELINES.md`, `ENVIRONMENT_VARIABLES.md`, `TESTING_STRATEGY.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md`, `HREFLANG_CANONICAL.md`, `REDIRECTS.md`, `PERFORMANCE_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`, `API_INTEGRATIONS.md`, `SEO_QA_CHECKLIST.md`, `DO_NOT_CHANGE.md`, `DEVELOPMENT_RULES.md`, `TASKS.md`, `DECISIONS.md` ADR-012)
**Resolved by:** current `01-sources/DEPLOYMENT_ARCHITECTURE.md` explicitly states it replaces the former Vercel deployment baseline and lists Vercel hosting as no longer approved. Confirmed independently by the live repository scaffold (`package.json`, `wrangler.jsonc` — Cloudflare Workers + vinext, no Vercel config present).
**Action:** none required in the source folders (immutable). Recorded in `PROJECT_OVERRIDES.md` §2 and `DOCS_INDEX.md`.

### DAR-003 — Public database: none → Cloudflare D1 (two databases)

**Status:** RESOLVED BY PRECEDENCE
**Affected:** `01-sources/DECISIONS.md` ADR-011 ("No Public Application Database at Launch"), `01-sources/DATA_ARCHITECTURE.md`, `01-sources/STACK.md` §14.2 ("Prisma/Drizzle/Supabase not approved by default"), `01-sources/PROJECT_BRIEF.md` (no ERP concept anywhere)
**Resolved by:** current `01-sources/DATABASE_SCHEMA.md`, corroborated by `01-sources/TECHNICAL_ARCHITECTURE.md` and `01-sources/DATA_ARCHITECTURE(1).md`.
**Note:** this is not a documentation staleness fix, it is a genuine **product scope expansion** — from a static lead-generation brochure site to a full commercial procurement platform with catalog, pricing, and ERP integration. This was flagged for owner visibility rather than silently absorbed.
**Owner sign-off, 2026-08-26:** **CONFIRMED.** The owner explicitly approved the public product catalog and public pricing architecture as in-scope for the website, superseding the 01-layer prohibition on public price pages. Recorded in `PROJECT_OVERRIDES.md` §4. The `/steel-products` vs `/steel` route-naming question (DAR-016) is a separate, still-open matter.

### DAR-004 — CMS: deferred → built into D1

**Status:** RESOLVED BY PRECEDENCE
**Affected:** `01-sources/DECISIONS.md` ADR-007 ("Git-Managed Typed Content; CMS Deferred"), `01-sources/CMS_ARCHITECTURE.md` (a "proposed" doc, never accepted)
**Resolved by:** `01-sources/CMS_ARCHITECTURE.md`, `01-sources/DATABASE_SCHEMA.md` §5.1 (article tables), `01-sources/TECHNICAL_ARCHITECTURE.md` §10.

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
**Status:** RESOLVED BY AUD-034 DOCUMENTATION CLEANUP, 2026-08-27
**Affected:** `01-sources/PRE_DEPLOY_CHECKLIST.md`, `01-sources/POST_DEPLOY_CHECKLIST.md`. Their reusable checklist content remains active, but Vercel promotion/rollback wording is superseded by the current Cloudflare Workers + vinext release flow in `01-sources/DEPLOYMENT_ARCHITECTURE.md`.

### DAR-012 — `01-sources/FOLDER_STRUCTURE.md` predates the commercial/Odoo module set

**Severity:** P2 — Minor
**Status:** RESOLVED BY AUD-034 DOCUMENTATION CLEANUP, 2026-08-27
**Detail:** `02-sources/TECHNICAL_ARCHITECTURE.md` §7 defines `lib/odoo/`, `lib/outbox/`, `lib/rfq/`, `lib/pricing/`, `workers/`, `db/migrations/` — none of which exist in `01-sources/FOLDER_STRUCTURE.md`'s tree. Needs a refresh before implementation begins in earnest, but is not a conflict — purely additive.

### DAR-013 — Odoo version, modules, and field mapping remain a genuine external discovery gap

**Severity:** P3 — Note / decision gate, not a documentation defect
**Status:** RESOLVED FOR THE RFQ SYNC PATH, 2026-08-28 — see DAR-026 for the full evidence trail. Owner confirmed Odoo's role on 2026-08-26 (ERP integration endpoint, intended to own customers/CRM/quotations/sales/commercial product-price data where appropriate); the version/modules/protocol/mapping values themselves were then genuinely verified against the live `ahanassa` database on 2026-08-28 (Odoo 19.0-20260528, confirmed installed modules, the real `/json/2/<model>/<method>` API contract, and a verified model/field mapping — `lib/odoo/mapping.ts`). Catalog/product/price sync mapping remains unverified and out of this pass's scope (RFQ-only). The Odoo 19 JSON-2 API assumption in older documentation was directionally correct but its exact route shape was wrong (`/api/v2/call` was assumed; the real route is `/json/2/<model>/<method>`) — corrected in DAR-026, not left uncorrected.

### DAR-014 — `DO_NOT_CHANGE.md` §9 and §16 will misfire as blocking protections against now-approved work

**Severity:** P1 — Major (real risk of blocking correct implementation, not just a stale-reference cosmetic issue)
**Status:** OPEN
**Affected:** `01-sources/DO_NOT_CHANGE.md` §9 ("P0 — Localization and Direction") and §16 ("P1 — Technical Architecture")
**Finding:** §9 states Claude "MUST NOT... Change locale routing... without authorization" and frames adding a locale as requiring approval — `PROJECT_OVERRIDES.md` §1 *is* that authorization, but §9 itself gives no hint that it has been granted. §16 locks "Vercel deployment behind Cloudflare" as the approved baseline and explicitly forbids "Add a CMS, database" without "explicit architecture approval" — both are directly superseded by the confirmed Cloudflare Workers + D1 + built-in-CMS architecture (`PROJECT_OVERRIDES.md` §2–§3), but nothing in `DO_NOT_CHANGE.md` itself says so.
**Risk:** an agent reading `DO_NOT_CHANGE.md` literally, in isolation, could stop and refuse legitimate multilingual or CMS/database work that the rest of the control layer has already approved.
**Action:** `DOCS_INDEX.md` §2 and `01-sources/DO_NOT_CHANGE.md` now carry explicit caveats. Every other protection in the document (brand identity, palette, slogan, secrets handling, dependency discipline) remains fully active and is not affected by this finding.

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

### DAR-020 — v0 visual/UI implementation integrated; fabricated business content stripped (new, 2026-08-28)

**Severity:** P1 — informational for future maintainers, but records a content-integrity decision that must not be silently reversed
**Status:** RESOLVED FOR THIS PASS — follow-up content work remains open. **Point 1 below (homepage visual authority) is superseded by DAR-021 (2026-08-28, same day): the owner subsequently approved the current v0 implementation itself as the site's visual authority, overriding the PNG this finding relied on. The fabricated-content findings in point 2 and below are unaffected and remain fully in force.**
**Finding:** the `ahanassa-v0` project supplied a complete visual/frontend implementation (components, page structure, Tailwind theme) that was integrated into this repository's canonical `app/[locale]/` architecture on `feat/integrate-v0-design`. Two governing conflicts were found and resolved:

1. **v0's homepage did not match the approved visual reference.** `ahanassa-v0/app/page.tsx` implemented a steel-export marketing homepage (hero stat rail, 13-product showcase, quality-assurance badges) that is a materially different visual concept from the owner-approved `/design-reference/homepage-desktop-v1.png` (a risk/control-focused procurement-manager page — risk grid, buyer-vs-manager comparison, numbered process cards, FAQ accordion). Per `CLAUDE.md` §5a / `PROJECT_OVERRIDES.md` §8a, the PNG governs regardless of what v0 built. The homepage (`app/[locale]/page.tsx` and `components/home/*`) was rebuilt from the PNG's actual section composition plus the approved copy directions in `01-sources/HOMEPAGE_SPEC.md` §9–§20 and the approved library in `01-sources/CTA_STRATEGY.md` §5. v0's original homepage sections were not reused. v0's *interior*-page structural patterns (hero, section grid, card layout, hairline borders, reveal-on-scroll) were not homepage-gated and were reused for `/about`, `/services`, `/markets`, `/products`, `/contact`.
2. **v0's content layer (`ahanassa-v0/lib/site.ts`) fabricated business facts** the project's own control layer marks `OPEN DECISION — DO NOT INVENT` (`PROJECT_OVERRIDES.md` §10, `v0-package/00_V0_MASTER.md` §8): a phone number, two email addresses, business hours, and a legal-entity name that conflicted with the one already wired into `lib/metadata/site.ts` (`Cyan Sanat Iranian Co. LTD`). It also presented invented statistics as fact ("1.2M tons/year," "38 countries," "16 years," "99.4% delivery-to-spec") and a 14-item product catalog with specific technical specs, none of which are sourced from any approved system. None of this was carried into the integration. Only already-confirmed facts were used (company name, brand promise, primary CTA copy, the confirmed office address from `PROJECT_OVERRIDES.md` §7 item 6). The product catalog was kept as clearly-labeled **sample data** (`components/products/sample-data-notice.tsx`, visible on every catalog route) rather than removed outright, since it demonstrates the catalog page's intended layout; every catalog route is `indexable: false` for this reason. Real catalog content must come from the synchronized D1 layer per `CLAUDE.md` §11, not this sample set.

**Additional decisions made in the same pass, recorded here rather than left implicit:**

- The RFQ intake form (`components/contact/enquiry-form.tsx`) has no file upload, consistent with DAR-019 (scanning pipeline not yet selected), and does **not** show a fake "request received" success state on submit — no D1-backed durable capture pipeline exists yet (`CLAUDE.md` §10), so v0's `setTimeout`-simulated success screen was replaced with an honest "not yet connected to the production backend" message. Wiring the actual durable RFQ pipeline is a separate, not-yet-scoped task.
- Route slugs `/products`, `/services`, `/markets`, `/about`, `/contact` were carried over from v0/this task's explicit scope as a working set; DAR-016's route-naming question remains open and unresolved by this pass.
- New dependencies added to support the integrated UI: `lucide-react` (icons), `class-variance-authority` + `clsx` + `tailwind-merge` (variant/class utilities). v0's `@base-ui/react` (Button primitive), `shadcn` CLI, `tw-animate-css`, and `@vercel/analytics` were deliberately **not** added — the first two were replaced with a lighter first-party `Button`, the third had no actual usage in the migrated components, and the fourth is a Vercel-specific package incompatible with this project's Cloudflare/GTM analytics architecture (`PROJECT_OVERRIDES.md` §5).
- All new/rebuilt pages remain `indexable: false`, matching the existing convention for `app/[locale]/page.tsx` — the homepage and interior-page copy is adapted/translated by Claude Code from approved-direction source material, not owner-reviewed final copy, and per `HOMEPAGE_SPEC.md` §20.5 counts as `draft` content until reviewed.

**Follow-up (not done in this pass, listed so it isn't silently dropped):** owner-supplied phone/email/hours; final English/Arabic copy review (current en/ar text is Claude Code's direct translation of the approved Persian source, not independently authored or reviewed); real product catalog wired to D1; durable RFQ capture backend; route-naming decision (DAR-016).

### DAR-021 — Visual authority superseded: approved v0 implementation replaces homepage-desktop-v1.png (new, 2026-08-28)

**Severity:** N/A — informational, records an explicit owner decision that changes future visual-implementation behavior
**Status:** RESOLVED BY OWNER DECISION
**Finding:** the owner explicitly approved the current implementation at `/Users/reza/Developer/ahanassa-v0` as the authoritative visual/UI reference for the entire public Ahan Asa website — homepage included — superseding `/design-reference/homepage-desktop-v1.png` as the homepage's visual authority (previously established in `CLAUDE.md` §5a / `PROJECT_OVERRIDES.md` §8a, applied in DAR-020). This is a pure visual-authority change, not a reversal of DAR-020's content findings.

**What changed:**

- `CLAUDE.md` §5a rewritten: the approved v0 implementation now governs visual composition/layout/typography/color/CTA-placement for the whole site; the PNG is now historical/reference-only, kept but not deleted.
- `CLAUDE.md` §6 task-map row "Homepage (visual implementation)" updated to point at the v0 implementation instead of the PNG.
- `PROJECT_OVERRIDES.md` new §8b records the supersession explicitly (§8a kept intact as the historical record of the 2026-08-26 decision, annotated as superseded rather than rewritten).
- The homepage (`app/[locale]/page.tsx`, `components/home/*`) was rebuilt again to follow v0's actual homepage section composition (hero, product showcase, capabilities, quality/assurance, process, reach, final CTA) instead of the PNG's risk/control-page composition. Interior pages were reviewed for visual drift introduced by the old PNG-first pass and brought back toward the v0 visual language where they had diverged.

**What did not change:** every fabricated-content finding in DAR-020 remains fully in force. v0's `lib/site.ts` business content (phone/email/hours, a conflicting legal name, invented statistics, an invented product catalog) is still not authoritative and was not reintroduced — only v0's visual/structural patterns were adopted, filled with canonical or clearly-labeled-sample content exactly as before. Cloudflare/vinext/Workers/Vite/wrangler, `app/[locale]/` localized routing, and the canonical SEO infrastructure are unaffected by this decision and remain governed by the canonical repository, not by v0's own Vercel/Next.js/flat-routing setup.

**Do not silently revert this decision.** A future task that wants to move the visual direction away from the approved v0 implementation again requires a new explicit owner decision, recorded the same way.

### DAR-022 — Approved v0 visual baseline frozen into the repository; external `ahanassa-v0` dependency removed (new, 2026-08-28)

**Severity:** N/A — informational, records a portability decision that changes what future tasks may depend on
**Status:** RESOLVED
**Finding:** DAR-021 established that the approved v0 implementation (external directory `/Users/reza/Developer/ahanassa-v0`) governs visual authority. That directory is local-only and not guaranteed to exist in every future environment (a fresh clone, CI, a different machine, a different agent session). This finding records that the approved visual direction — now fully integrated and validated in this repository across commits `0d07d0b` and `b1d0841` — has been frozen as a **portable, version-controlled baseline** so no future task depends on that external path.

**What was added:**

- `design-reference/v0-approved/` — six browser screenshots captured from the canonical repository's own running implementation (not from the external `ahanassa-v0` folder, not from the historical PNG): Persian homepage desktop (1440×1200, full-page), Persian homepage mobile (390×844, full-page), Persian mobile-nav-open state (390×844, viewport), Persian products/services/contact desktop (1440×1200, full-page each). Full capture methodology, viewport documentation, and — critically — what counts vs. does not count as a visual regression is documented in `design-reference/v0-approved/README.md`.
- `PROJECT_OVERRIDES.md` §8c records the same decision at the overrides layer, explicitly stating §8b's rules are unchanged in substance — only *where the visual authority lives* changed (external folder → this repository + the new baseline directory).
- `CLAUDE.md` §5a and §2 (immutable-assets list) rewritten to point at the current implementation and `design-reference/v0-approved/` instead of the external path, and to classify `design-reference/v0-approved/` as a *maintained baseline* (updatable only by recapturing after an approved visual change) rather than a strictly immutable historical asset like `homepage-desktop-v1.png`.

**What did not change:** the visual direction itself, its scope, or its precedence relative to business/content/technical/SEO/localization/RFQ/Odoo documentation (all unchanged from DAR-021/§8b). The fabricated-content findings in DAR-020 remain fully in force — nothing about this freeze reintroduces or re-authorizes any of that content, and a screenshot in the new baseline showing sample/placeholder content is explicitly documented (in its `README.md`) as not a license to treat that content as real.

**Practical effect:** a future Claude/Codex/CI session with no access to `/Users/reza/Developer/ahanassa-v0` can now fully understand and verify the approved visual direction from this repository alone. `ahanassa-v0` remains named throughout the audit trail as the historical origin of the design — that history is preserved, not erased — but is no longer a live dependency for any task.

### DAR-023 — RFQ intake backend implemented; DATABASE_SCHEMA.md vs DATA_ARCHITECTURE(1).md naming/format conflicts resolved by treating the former as authoritative (new, 2026-08-28)

**Severity:** P2 — informational; documents concrete implementation decisions and one genuine cross-document naming conflict
**Status:** RESOLVED FOR THIS PASS
**Finding:** implementing the durable RFQ intake backend (`feat/rfq-backend`, D1 + transactional outbox + Cloudflare Queue + Odoo adapter boundary, per `01-sources/TECHNICAL_ARCHITECTURE.md` §12/§14 and `01-sources/DATABASE_SCHEMA.md` §6) surfaced a genuine naming/format conflict between two documents DOCS_INDEX.md marks equally ACTIVE:

1. **Table/column naming.** `01-sources/DATABASE_SCHEMA.md` §6.1/§6.3 (the designated physical-schema document) specifies `rfqs.reference_number`, `rfqs.idempotency_key_hash`, a separate `rfq_contacts` table, and `integration_outbox`/`integration_attempts`/`integration_mappings`/`dead_letter_records`. `01-sources/DATA_ARCHITECTURE(1).md` §15/§28 independently describes the same concepts with different names (`public_reference`, `idempotency_key` stored raw, contact fields inline on `rfqs`, `integration_jobs`/`integration_events`). **Resolution:** `DATABASE_SCHEMA.md` was treated as authoritative for the literal physical schema — it is the document DOCS_INDEX.md explicitly designates "D1 physical schema," is more implementation-grade (explicit constraints, relationship rules, delete behavior), and its own stated rule ("Public IDs must not reveal RFQ counts or business volume," §3.3) is directly consistent with the non-sequential reference format implemented, whereas `DATA_ARCHITECTURE(1).md`'s own example reference (`AA-RFQ-2026-000123`) is sequential-looking and would violate that rule. `DATA_ARCHITECTURE(1).md`'s complementary behavioral guidance (idempotency mechanics, queue message model, failure-recovery flow, sync conflict strategy) was still used — only its literal table/column names were superseded.
2. **`rfq_items.quantity_value`/`quantity_scale` required-ness.** `DATABASE_SCHEMA.md` marks these `Yes` (required). The currently approved, frozen RFQ UI (`components/contact/enquiry-form.tsx`, `design-reference/v0-approved/`) collects quantity as a single freeform string (e.g. "200 تن"), not a structured number+unit pair, and redesigning that field was out of scope for the backend task. **Resolution:** added `rfq_items.quantity_text` (always populated, full fidelity) and made `quantity_value`/`quantity_scale` nullable, populated only via best-effort parsing (`lib/rfq/quantity.ts`) and left `NULL` — never guessed — when the leading value can't be unambiguously extracted. See `migrations/0001_rfq_ops_schema.sql` for the inline rationale.

**What was implemented:** `rfqs`/`rfq_contacts`/`rfq_items`/`rfq_status_history`/`integration_outbox`/`integration_attempts`/`integration_mappings`/`dead_letter_records` (DB_OPS, `migrations/0001_rfq_ops_schema.sql`); `POST /api/rfqs` with server-side validation, idempotent creation, and an atomic D1 batch write; a Cloudflare Queue producer/consumer/DLQ wired through a custom Worker entry (`workers/entry.ts`, delegating to `vinext/server/fetch-handler` per that module's own documented extension pattern, since vinext's binding-access convenience (`cloudflare:workers`) covers producer sends but not a top-level `queue()` consumer export); a scheduled outbox-reconciliation sweep; and an `OdooGateway` adapter boundary (`lib/odoo/`) that is real and exercised end-to-end but always returns `not_configured` — consistent with DAR-013, Odoo version/modules/field mapping remain a genuine, non-blocking discovery gate, and guessing a model to write to would risk corrupting a real Odoo instance once credentials are eventually supplied.

**Deliberately out of scope, per the task's own boundaries:** `rfq_attachments`/upload endpoint (attachment scanning pipeline still unresolved, PROJECT_OVERRIDES.md §8), `consent_records` (no consent UI exists on the approved form), staff/RBAC/`audit_logs`/`integration_inbox`/`data_erasure_requests` (admin surfaces, no admin UI in this task), real Turnstile/rate-limiting (no site key/KV/DO provisioned — passive controls only: honeypot field + minimum-completion-timing signal, per `01-sources/FORM_ARCHITECTURE.md` §18.3 "use passive controls first").

**Do not silently guess Odoo model names to close this out.** Resolving DAR-013 (the actual Odoo version/module inspection) is a prerequisite for `lib/odoo/adapter.ts` to do real work — this finding does not change that gate.

### DAR-024 — RFQ backend provisioned and validated against real Cloudflare staging infrastructure; D1 jurisdiction remains an explicit open gate (new, 2026-08-28)

**Severity:** P2 — informational; records real infrastructure now exists and one deliberately-not-resolved policy gate
**Status:** RESOLVED FOR THIS PASS (staging); production provisioning remains blocked on the items below
**Finding:** the RFQ backend from DAR-023 was provisioned against real (not local-simulated) Cloudflare resources and validated end to end. See `README.md` "Staging environment" for resource names/commands.

**D1 jurisdiction — deliberately not decided here.** `01-sources/DATABASE_SCHEMA.md` §18 lists "Data location: Required D1/R2 jurisdiction/location policy" as an explicit, unresolved Implementation Gate ("Unknown values remain disabled or explicit configuration. Claude Code must not invent them."). No jurisdiction/data-residency policy has been formally decided by the owner. Consistent with that instruction, the staging D1 database (`ahanassa-ops-staging`) was created **without** a `--location` flag — Cloudflare placed it in its automatic default region (`WEUR`) based on request origin, which is a platform default, not a chosen compliance jurisdiction. This is appropriate for staging (synthetic test data only) but is explicitly **not** a stand-in for a real decision: a production D1 database must be provisioned separately, under an owner-approved jurisdiction policy, before go-live — D1 jurisdiction cannot be changed on an existing database after creation, so production cannot simply reuse or relocate the staging one.

**Customer-account forward-compatibility (owner directive reviewed, no migration made).** The task instructions introduced future customer-account/portal architecture decisions and asked the RFQ schema to be checked for compatibility before staging provisioning. Reviewed `migrations/0001_rfq_ops_schema.sql`: `rfqs.id` (ULID primary key) is the only real key, there is no `NOT NULL` guest-identity constraint anywhere, and SQLite/D1 supports adding a nullable `account_id TEXT` column later via a plain additive migration at zero cost to existing rows. **Conclusion: the schema is already safely extensible for a future optional customer-account link — no migration was made in this pass**, per the instruction to leave implementation for the Customer Account phase when nothing is structurally blocking. Guest RFQ submission remains fully supported and unauthenticated, as required.

**Real validation performed (not inferred from local behavior):** RFQ + contact + items persisted on real remote D1 (`wrangler d1 execute --env staging --remote`); idempotent duplicate-key resubmission confirmed (same reference, still 1 row) against real D1; the real deployed Queue producer/consumer processed a real message end to end, with `lib/odoo/adapter.ts`'s honest `not_configured` result correctly leaving `rfqs.sync_status = 'pending'` (never falsely `synced`); the real deployed `scheduled()` cron (`*/5 * * * *`) recovered a deliberately-simulated "stuck" outbox row and republished it without creating a duplicate RFQ, and the consumer safely reprocessed the redelivered event; a temporary, reverted-immediately-after test hook in `lib/odoo/adapter.ts` (never committed — confirmed via `git diff`/`git status` before the dedicated commit) forced one marked test submission to fail, which correctly retried 5 times (Cloudflare's configured `max_retries`) and then landed in the real DLQ (`ahanassa-odoo-sync-staging-dlq`), which has its own consumer that recorded it into `dead_letter_records` — confirming the DLQ is not left unconsumed. Live `wrangler tail --env staging` output was inspected directly and contains no PII (names/emails/phones never appear in logs, only method/URL/status/timestamp and queue-batch summaries).

**What remains before production:** the D1/R2 jurisdiction decision (above); the Odoo model mapping (DAR-013, unchanged); real Turnstile/rate-limiting (DAR-023, unchanged); a separate `env.production` Cloudflare resource set (never reuse staging).

### DAR-025 — Customer account, portal, and pricing/domain-separation architecture formalized as future-phase; documentation consistency audit found no genuine conflicts (new, 2026-08-28)

**Severity:** N/A — informational; records a new approved future-phase architecture and the results of a targeted conflict search
**Status:** RESOLVED
**Finding:** the project owner approved future-phase architecture for customer identity/accounts, guest-RFQ-to-account linking, Odoo customer mapping, a Customer Portal, public pricing read-model/edge-caching, and logical data-domain separation — recorded in two new specialist documents (`01-sources/CUSTOMER_ACCOUNT_ARCHITECTURE.md`, `01-sources/CUSTOMER_PORTAL.md`) and `01-sources/DECISIONS.md` ADR-017, cross-referenced from `PROJECT_OVERRIDES.md` §13. This is architecture only — it does not move customer accounts/portal into Phase 1 (`01-sources/PROJECT_BRIEF.md` §25, `01-sources/DECISIONS.md` ADR-002 unchanged), and no code, schema migration, dependency, or Cloudflare resource was added or changed.

**Documentation consistency audit performed (per the task's own instruction to search for specific conflict patterns):**

1. **"Every RFQ requires a registered account."** No document states this. `01-sources/FORM_ARCHITECTURE.md` §18.1 ("The website must not require a visitor to create an account... before submitting"), `01-sources/INFORMATION_ARCHITECTURE.md` ("Do not require: ... creating an account"), and `01-sources/API_INTEGRATIONS.md` already require guest submission. No conflict; `CUSTOMER_ACCOUNT_ARCHITECTURE.md` §2 reaffirms this as a permanent rule, not a temporary Phase 1 accommodation.
2. **"Browser reads Odoo directly."** No document states this as the actual architecture. Multiple documents already explicitly prohibit it (`CLAUDE.md` §9/§33, `TECHNICAL_ARCHITECTURE.md` §3.2/§8, `DATABASE_SCHEMA.md` line 99, `DEPLOYMENT_ARCHITECTURE.md`). No conflict; `CUSTOMER_PORTAL.md` §3 extends the same prohibition explicitly to the future authenticated portal surface, which no prior document had stated.
3. **"Odoo required synchronously for portal rendering."** No prior document addressed portal rendering directly (the portal itself was out of scope). `CUSTOMER_PORTAL.md` §3 closes this gap proactively, applying the existing "public rendering never synchronously depends on Odoo" principle (`PROJECT_OVERRIDES.md` §3) to the portal before any portal code exists.
4. **"Website admin owns pricing."** No document states this. `TECHNICAL_ARCHITECTURE.md` §11.2 and `CLAUDE.md` §11 already require Odoo-only price editing. No conflict; `CUSTOMER_PORTAL.md` §5 reaffirms this and extends it explicitly to future portal-visible quotations/orders.
5. **"DB_OPS contains all future application data."** No document states this. `DATABASE_SCHEMA.md` §4.1/§4.2 already separates `DB_PUBLIC` (catalog/pricing/content) from `DB_OPS` (RFQ/integration/authorization). No conflict; `CUSTOMER_PORTAL.md` §8 restates the existing boundary explicitly as a durable rule so a future portal implementation does not default everything into `DB_OPS` merely because RFQs already live there.

**Statements annotated (not reversed) because they could otherwise be misread as prohibiting this new future-phase architecture:**

- `01-sources/TECHNICAL_ARCHITECTURE.md` §1 and §17 ("customer self-service portal remain[s] out of scope" / "does not imply a customer portal; that remains out of initial scope") — both correctly describe the *current* implementation phase and are unchanged in substance; both now point to the new specialist documents so a future reader does not conclude a portal is permanently prohibited.
- `01-sources/PROJECT_BRIEF.md` §25 ("customer account or self-service RFQ portal" as a Phase 1 non-goal) and `01-sources/DECISIONS.md` ADR-002 — both remain accurate for Phase 1 scope; both now note that approved future-phase architecture exists without reversing the Phase 1 exclusion.
- `01-sources/DATABASE_SCHEMA.md` §6.2 (`staff_users`: "no customer accounts are created in this phase") — remains accurate; annotated to clarify a future customer account is a conceptually distinct principal type from staff, not a `staff_users` extension.

**No disruptive RFQ redesign performed**, consistent with the task's explicit boundary: `migrations/0001_rfq_ops_schema.sql` is unchanged; no `account_id`/`customer_id` column was added; no migration was created. `DOCUMENT_AUDIT_REPORT.md` DAR-024's prior forward-compatibility review is reaffirmed, not repeated with new work.

**What remains open, unaffected by this entry:** DAR-013 (Odoo version/modules/protocol/mapping, now also covering the future Customer↔`res.partner` mapping specifically — `CUSTOMER_ACCOUNT_ARCHITECTURE.md` §5); authentication provider selection (`CUSTOMER_ACCOUNT_ARCHITECTURE.md` §7); production D1/R2 jurisdiction (`DOCUMENT_AUDIT_REPORT.md` DAR-024, reaffirmed by `CUSTOMER_PORTAL.md` §11); the account-implementation phase itself, which requires its own future approval before any code is written.

### DAR-026 — DAR-013 closed for the RFQ path: live Odoo environment audited read-only; real adapter implemented against verified mapping; no production writes performed (new, 2026-08-28)

**Severity:** N/A — informational; records the resolution of the project's last standing RFQ-integration discovery gate
**Status:** RESOLVED FOR THE RFQ SYNC PATH. Catalog/pricing sync mapping (`pullCatalog`/`pullPublicPrices`) is explicitly out of this pass's scope and remains a separate future gate.
**Finding:** connected read-only to the real infrastructure named in this task (`ssh ubuntu@194.5.206.76`) and verified, directly against the live environment (never assumed from generic Odoo documentation or the prior provisional mapping table), every fact DAR-013 had left open. No Odoo configuration, module, schema, or business record was created, modified, or deleted at any point — every command run was a read-only inspection (`docker ps`/`inspect`/`exec cat`, nginx config reads, read-only PostgreSQL `SELECT`s, and read-only Odoo source-file greps). See the task's own final report (this session's transcript) for the complete verification log; the durable facts are recorded below and in `lib/odoo/mapping.ts`, which is now the single source of truth for this mapping in the codebase.

**Runtime (verified):**
- Host runs 5 containers: 4 separate Odoo tenants (`odoo-shahbazi`, `odoo-ahantorob`, `odoo-sipanel`, `odoo-avizsazeh`) sharing one `postgres:15` container (`odoo-db`, actual version `15.18`).
- `odoo.ahanassa.com` is NOT self-evidently named — it is reverse-proxied (`/etc/nginx/sites-available/odoo.sipanelco.ir`, confirmed via `server_name odoo.ahanassa.com` block) to `127.0.0.1:8085`/`8086`, which `docker ps` confirms belongs to container **`odoo-ahantorob`** (image `odoo-custom:19-linkpreview-r2`). The container's own name is misleading — this was the single most important fact to verify before touching anything, and it was verified via the actual routing chain, not assumed from a name.
- Exact version: `Odoo Server 19.0-20260528` (`odoo --version` inside the container).
- Config (`/opt/odoo/odoo-ahantorob.conf`, password redacted before it ever left the remote host): `db_host=db`, `db_user=odoo_ahantorob_app`, `db_name=ahanassa`, `dbfilter=^ahanassa$` (hard-locked — confirms `ahanassa` is the only reachable database through this container, resolving "Database Identification" definitively).
- `addons_path` is a host-shared bind mount (`/opt/odoo/addons` → `/mnt/extra-addons`) visible to all four tenant containers — confirmed several modules present on disk belong to a *different* tenant (`crm_lead_contacts`, author "SiPanel") and are correctly **not installed** in `ahanassa`. This is the exact disk-presence-vs-installed-state trap the task warned about, and it was real, not hypothetical.

**Installed modules relevant to this integration (verified via `SELECT name, state FROM ir_module_module` against the live `ahanassa` database, not disk presence):** `base`, `contacts`, `crm`, `sale`, `sale_management`, `sale_crm`, `product`, `uom`, `mail`, `portal`, `website`, `website_crm`, `rpc`, `api_doc`, and three installed custom modules — `cyan_crm_reference`, `cyan_crm_reference_account`, `cyan_crm_reference_sale`. Confirmed **not installed** despite disk presence: `crm_lead_contacts`, `cyan_crm_reference_project`, `dms`, `enhanced_document_management`, `message_center`, `odoo_sms_batch`, `sms_gateway`, `contact_whatsapp`, `product_percentage_price`.

**API mechanism — corrected, not merely confirmed:** the prior provisional documentation's assumption of an `/api/v2/call` REST envelope was WRONG. The real, source-verified route (module `rpc`, confirmed installed) is `POST /json/2/<model>/<method>`, `auth='bearer'`, request body = plain JSON kwargs matching the target Python method's own parameter names (not a `{model,method,args,kwargs}` envelope, not JSON-RPC 2.0), response body = the plain JSON return value on success or an HTTP-status-coded error body on failure. Read directly from `odoo/addons/rpc/controllers/json2.py` and the `Json2Dispatcher` class in `odoo/http.py` inside the container — not guessed, not inferred from Odoo's general reputation for a "JSON-2 API." Auth uses Odoo's native `res.users.apikeys` (table confirmed to exist; confirmed **empty** — 0 keys currently minted, consistent with "no dedicated integration user exists yet"). `lib/odoo/client.ts` was rewritten to this verified contract.

**Model/field mapping — see `lib/odoo/mapping.ts` for the complete, evidence-annotated matrix. Summary:**

| Website concept | Odoo target | Status | Evidence |
|---|---|---|---|
| Customer/company | `res.partner` | **VERIFIED** | Fields confirmed via `ir_model_fields`: `name`, `email`, `phone` (no `mobile` field exists in this install — a real, verified departure from the generic Odoo assumption), `email_normalized`/`phone_sanitized` (computed dedup keys), `ref` (indexed, available for a future external customer ID), `parent_id`/`commercial_partner_id`/`is_company` (company hierarchy), `vat`/`company_registry` (unused this phase) |
| RFQ header | `crm.lead` | **VERIFIED**, with 2 open staff-workflow micro-decisions (not blockers) | `type` required; only `"opportunity"` in active use (1 existing record). `crm.team` "Website" exists but is **inactive**; only "Sales" is active — `ODOO_CRM_TEAM_ID` left unconfigured rather than guessed. `opportunity_no` (custom, from `cyan_crm_reference`, prefix `AHT-OPP-%(year)s-`) is Odoo's own permanent auto-numbered reference and is never written by the adapter. |
| RFQ lines | none | **UNRESOLVED as a structured Odoo store — documented, not built** | Direct `ir_model` search for any model with "rfq"/"request"/"inquiry"/"enquiry" in its technical name found none relevant. Per `01-sources/TECHNICAL_ARCHITECTURE.md` §14.3's own pre-approved fallback, the adapter sends a human-readable plaintext summary in `crm.lead.description`; D1 `rfq_items` remains the sole authoritative structured store. A future `ahanassa_website_rfq` custom module is documented as a proposal, not built. |
| Public RFQ reference / idempotency key | `ir.model.data` (native external-ID system) | **RESOLVED** via a verified native mechanism, not a custom field | Zero `x_...` custom fields exist on `crm.lead`/`res.partner` (confirmed empty result set). `ir_model_data_module_name_uniq_index`, a real `UNIQUE` index on `(module, name)`, was confirmed via `pg_indexes` — this is Odoo's own idempotent-upsert mechanism (module=`ahanassa_website`, name=`rfq_<localRfqId>`). Limitation, documented rather than hidden: this is not staff-visible without Developer Mode; the adapter also embeds the reference in `crm.lead.name`/`description` as a human-readable (not uniquely constrained) copy. A future `x_website_rfq_reference` field is documented as the clean fix for staff-facing search, not built now. |
| Integration user | none exists | **REQUIRES CREATION — not created** | `res_users_apikeys` confirmed empty; no login matching `%api%`/`%bot%`/`%integration%`/`%website%`/`%rfq%` exists among the 3 active internal users. Per the task's explicit rule, no user or API key was created. |

**Customer deduplication strategy (documented, deliberately conservative):** match only on a lowercase+trimmed `email` against Odoo's `email_normalized`; a `phone`-based match was deliberately NOT implemented, because reproducing Odoo's real `phone_sanitized` algorithm (E.164 + partner-country context) client-side without re-deriving it from source would itself be a guess — and a wrong guess risks a false match (silently merging two different customers), which is worse than the safe fallback of creating a new partner. Ambiguous (>1) email matches never auto-merge. This is recorded as a known Phase-1 limitation, not presented as complete.

**What was implemented (Stage B, code only — no real Odoo write performed or attempted):** `lib/odoo/client.ts` (transport, rewritten to the verified `/json/2/<model>/<method>` contract), `lib/odoo/mapping.ts` (the evidence-annotated mapping above), `lib/odoo/adapter.ts` (real `upsertContact`/`upsertRfq`/`getHealth` logic — dedup-then-create partner, idempotency-guarded lead creation via `ir.model.data`, safe HTTP-status-only error classification), `.env.example` (documented `ODOO_CRM_TEAM_ID`, annotated the existing Odoo vars with verified expected values), `lib/odoo/adapter.test.ts` (11 new mock-HTTP unit tests: not-configured behavior, idempotent reuse, partner reuse/create/ambiguous-match handling, `opportunity_no` never written, external-ID registration, 5xx/401/network error classification, `getHealth`). The adapter still cannot perform a real write in any deployed environment today: `getOdooConfig()` returns `null` until `ODOO_BASE_URL`/`ODOO_DATABASE`/`ODOO_API_KEY` are provisioned as Cloudflare Secrets, and per this task's explicit safety rules, no API key was minted and none should be without the owner's separate go-ahead (see "Integration User" row above). This is an honest boundary, not a fake success path — consistent with DAR-023's existing adapter philosophy.

**Why this is safe to consider RESOLVED despite two open items (`ODOO_CRM_TEAM_ID`, the future custom field):** neither blocks correctness. Idempotency and customer-dedup-before-create are both fully implemented using verified, already-existing mechanisms (`ir.model.data`, `email_normalized`); the two open items are a staff-workflow configuration choice (which sales team) and a UX enhancement (staff-visible search field), not architectural unknowns. Both are called out explicitly in `lib/odoo/mapping.ts` so a future task does not have to re-derive them.

**Deliberately NOT done, per the task's explicit boundaries:** no Odoo module installed/upgraded, no configuration changed, no PostgreSQL row inserted/updated/deleted, no customer/lead/opportunity created, no service restarted, no API key minted, no `crm.team` reactivated, no real write-path test performed against the only Odoo database Ahan Asa has (it is genuinely the only environment — no separate Odoo staging/test database exists for `ahanassa`). Catalog/product/price sync mapping was not investigated beyond confirming `product`/`uom` are installed (out of this task's RFQ-only scope, matching `PROJECT_OVERRIDES.md` §3/§13's existing pricing-is-separate-phase boundary).

**Remaining genuine gaps, carried forward (not closed by this entry):** (1) no Odoo integration user/API key exists — creating one is an infrastructure step requiring the owner's/Odoo admin's action, out of Stage A's read-only scope and Stage B's no-new-credentials rule; (2) `ODOO_CRM_TEAM_ID` is unset pending an owner/admin decision on the inactive "Website" team vs. the active "Sales" team; (3) the `ahanassa_website_rfq` custom-field proposal (staff-facing exact search for the website reference) is documented but not built or approved; (4) real write-path validation against Odoo has not been performed and cannot be, safely, without either a dedicated Odoo test database (none exists) or an owner-approved, clearly-labeled test-record policy for the production `ahanassa` database (not established in this pass, per the task's explicit "do not choose silently" instruction).

### DAR-027 — Odoo staging connectivity provisioned: dedicated minimum-permission integration user, real API key, read-only JSON-2 connectivity verified; RFQ-path idempotency redesigned to avoid `base.group_erp_manager` (new, 2026-08-29)

**Severity:** N/A — informational; records real production-infrastructure provisioning and a security-motivated design change to the RFQ→Odoo mapping DAR-026 verified
**Status:** RESOLVED for staging connectivity. No RFQ write test performed — reserved for the next phase.
**Finding:** following DAR-026's read-only mapping verification, this task provisioned the actual integration identity DAR-026 explicitly left uncreated, and proved read-only JSON-2 connectivity end-to-end from both a local client and (via bound secret/vars) the real staging Cloudflare Worker.

**Design change from DAR-026, made mid-task after explicit review:** DAR-026's `ir.model.data`-based idempotency mechanism was not implemented as originally verified. Live ACL inspection (`ir.model.access` read-only query against `ahanassa`) showed that in this install, the *only* group with any access to `ir.model.data` is `base.group_erp_manager` ("Access Rights"), and that group also grants full CRUD — including unlink — on 28 other technical/admin models: `res.groups`, `ir.model.access`, `ir.model`, `ir.model.fields`, `ir.rule`, `res.users`, `res.company`, `auth_passkey`, and more. Granting a website-integration API key that group was rejected as a disproportionate blast radius for one narrow "does this RFQ already exist?" check. Four alternatives were compared (keep `ir.model.data`+broad group; drop Odoo-side idempotency entirely; a dynamic `x_` field with no DB constraint; a small dedicated module with a real constraint) — full comparison preserved in this session's transcript. The chosen design: a small custom module, `odoo-modules/ahanassa_website_rfq/` (versioned in this repository, deployed and installed live on `ahanassa`), adds `crm.lead.x_website_rfq_reference` (Char, readonly, indexed) with a real Postgres `UNIQUE` constraint (`crm_lead_uniq_x_website_rfq_reference`, verified via `pg_constraint` post-install). This gives the same DB-enforced idempotency guarantee strength as the `ir.model.data` design, but the integration user only needs ordinary `sales_team.group_sale_salesman`-level access — no elevated technical group. `lib/odoo/mapping.ts` (`RFQ_REFERENCE_MAPPING`) and `lib/odoo/adapter.ts` were updated accordingly, with `lib/odoo/adapter.test.ts` covering the new lookup-by-field / set-on-create behavior (all 34 repo tests pass).

**Odoo 19 pitfall caught live:** the module's first install used the old `_sql_constraints` model attribute, which Odoo 19 silently ignores (logs a deprecation warning, creates no constraint) in favor of a new `models.Constraint` table-object API. Caught by inspecting the install log, not assumed; fixed and re-verified before any credential was minted against it.

**Integration user (verified live):** login `website-rfq-integration@ahanassa.com` (non-human technical login, no password set — cannot log in interactively, no invitation/reset email sent), groups `base.group_user` + `sales_team.group_sale_salesman` only. Confirmed via a real HTTP call under this user's own key that `ir.model.data` access correctly returns `403` — the least-privilege boundary is enforced, not just configured on paper.

**API key:** generated via Odoo's native `res.users.apikeys._generate()` (impersonating the integration user, `scope=None`/global as required by the `rpc` route, 1-year expiration), captured only in a shell pipeline and piped directly into `wrangler secret put ODOO_API_KEY --env staging` — the raw value was never written to a file, logged, or displayed at any point in this session. A separate, short-lived (1-hour) temporary key was minted for the same user to perform the actual read-only HTTP verification (so the persisted Cloudflare-bound key itself was never separately exercised/exposed for testing purposes); that temporary key was revoked immediately after the test — confirmed via `res.users.apikeys` search afterward that only the one persistent key remains.

**CRM team:** `crm.team` "Sales" (id **1**, verified active) configured as `ODOO_CRM_TEAM_ID` for staging. "Website" (id 2) remains inactive and was not reactivated, per this task's explicit instruction — matches DAR-026's finding.

**Cloudflare staging configuration (`ahanassa-bootstrap-staging`), confirmed via `wrangler secret list --env staging` (names only) and the deploy output's binding table (values shown only for genuinely non-secret vars):** `ODOO_BASE_URL`/`ODOO_DATABASE`/`ODOO_CRM_TEAM_ID` as `env.staging.vars` in `wrangler.jsonc`; `ODOO_API_KEY` as a Cloudflare secret. The staging Worker was rebuilt and redeployed so these vars are live (not just committed to the config file).

**Staging outbox safety (hard requirement, verified before any credential was attached):** all 5 pre-existing synthetic staging RFQs (from earlier `not_configured`-era testing, DAR-024) had `integration_outbox.status = 'published'` already — none were `pending`/`retry`, so the reconciliation cron (`dispatchPendingOutboxEvents`, which only selects `pending`/`retry`) cannot resend them; all 5 queue-message deliveries were already terminal (4 acked as `permanent_failure`, 1 exhausted retries and is recorded in `dead_letter_records` with `resolution_status = 'resolved'`). No code path in the repository resends based on `rfqs.sync_status`. As an explicit extra safeguard (not strictly required given the above, but requested as a hard acceptance criterion), all 5 RFQs' `sync_status` was additionally set to `manual_review` (a pre-existing, valid schema state) with `last_sync_error_code = 'STAGING_SYNTHETIC_TEST_DO_NOT_SYNC'`.

**Read-only JSON-2 connectivity — verified, real HTTP round trip, real bearer auth, real database:** `res.partner.search_count` (8), `crm.lead.search_count` (0, this fresh user owns no leads yet), `res.users.search_read` on its own record (identity confirmed), `ir.model.data.search_count` correctly `403`. No customer PII was printed — only counts, ids, and booleans.

**Production writes performed:** none. No RFQ, opportunity, quotation, sale order, or customer record was created. The only Odoo-side writes in this task were infrastructure/security provisioning explicitly permitted by the task: the module install (schema-level, adds one field + one constraint), the dedicated integration user, and its API key.

**Deliberately not done, reserved for the next phase:** submitting a real RFQ through the actual website→D1→Queue→Odoo pipeline. The staging Worker is now correctly configured to attempt a real sync the moment such an event reaches the queue — this is why the outbox-safety verification above was a hard prerequisite, not optional hygiene.

**Security follow-up recorded, not actioned (per explicit task instruction):** a PostgreSQL password for the shared `odoo-db` container was incidentally visible during a prior session's manual inspection (DAR-026 predecessor work). It was not reproduced, used, or rotated here — `odoo-db` is shared across multiple unrelated Odoo tenants, and an uncoordinated rotation could break other tenants' services. Rotating it requires a separate, coordinated maintenance task across all affected instances.

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
| Findings still open | 8 — DAR-001 phone only (OPEN, candidate unconfirmed), DAR-010 locale-extension authoring/font-family decisions, DAR-012 folder-structure refresh, DAR-015 missing `DECISIONS.md` pivot records, DAR-016 catalog/`/terms` route-naming, DAR-017 `FONT_STRATEGY.md` redesign, Odoo version/modules/protocol/mapping values themselves (non-blocking per DAR-013), attachment-scanning provider selection (non-blocking per DAR-019) |
| Missing referenced documents | 14 (§5) — none block Phase 1 foundation; several block later Odoo/RFQ/pricing/admin implementation specifically |
| **Phase 1 foundation status** | **UNBLOCKED.** Per `PROJECT_OVERRIDES.md` §11, none of the previously-open P0/P1 findings block foundation work (locale/routing architecture, design system, content model, D1/R2/Queues scaffolding, catalog/pricing UI, RFQ intake UI, CMS structure). Remaining open items are either configuration values pending later, integration-phase gates (Odoo protocol/mapping), pre-production gates (attachment scanning, phone publication), or documentation-authoring/cleanup work that does not block writing foundation code. |
| Recommended next implementation phase | 1) Proceed with Phase 1 foundation implementation — routing/locale architecture for fa/en/ar, design system, content model, D1/R2/Queues scaffolding, public catalog/pricing UI against synchronized/cached data, RFQ intake UI, CMS structure. 2) In parallel (documentation, non-blocking): resolve the `/steel-products` vs `/steel` and `/terms` route-naming conflicts (DAR-016), add the missing `DECISIONS.md` pivot records (DAR-015), annotate `DO_NOT_CHANGE.md` §9/§16 (DAR-014), redesign `FONT_STRATEGY.md` for multi-locale budgets and select an Arabic type family (DAR-017). 3) Before Odoo integration work specifically: verify Odoo version/modules/protocol against the live instance and author the missing `ODOO_INTEGRATION.md`/`SYSTEM_OF_RECORD.md`/`SYNC_STRATEGY.md`/`ERP_DATA_MAPPING.md`. 4) Before production RFQ uploads: select and implement an attachment-scanning provider (DAR-019). 5) Before production phone publication: obtain the complete number from the owner (DAR-001). |

---

## 7. Maintenance rule

When a finding above is resolved: update the finding's status, cite the resolving evidence, and update `PROJECT_OVERRIDES.md`/`DOCS_INDEX.md` accordingly. Do not delete resolved findings — keep them as an audit trail. New conflicts discovered during future work should be added here following the same DAR-### numbering, continuing from DAR-027.

---

**End of `DOCUMENT_AUDIT_REPORT.md`**
