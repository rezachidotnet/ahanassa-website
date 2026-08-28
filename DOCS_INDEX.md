# DOCS_INDEX.md

## Ahan Asa Website — Complete Source Document Inventory

**Document role:** Maps the active `01-sources/` specialist corpus, plus registered root-level reference assets, to subject, status, overriding document, and implementation relevance.
**Status:** Active — full-inventory pass complete; owner sign-off applied 2026-08-26 (see `PROJECT_OVERRIDES.md` v2.1.0 and `DOCUMENT_AUDIT_REPORT.md` §0); homepage visual reference registered 2026-08-26 (§3a); customer account/portal future-phase architecture registered 2026-08-28 (§6, `DECISIONS.md` ADR-017)
**Version:** 1.3.0
**Last updated:** 2026-08-28
**Files inventoried:** active consolidated `01-sources/` corpus (now including `CUSTOMER_ACCOUNT_ARCHITECTURE.md` and `CUSTOMER_PORTAL.md`) + 1 registered visual control reference (`design-reference/homepage-desktop-v1.png`)

Read `PROJECT_OVERRIDES.md` and `CLAUDE.md` before using this index. As of 2026-08-26, the owner has confirmed the multilingual (fa/en/ar), public catalog/pricing, Cloudflare Workers + vinext runtime, and several other decisions that this index's caveats refer to. `02-sources/` and `03-sources/` are not active source layers anymore; any remaining mention of them here is **HISTORICAL / SUPERSEDED** audit context only.

---

## 1. Status legend

- **ACTIVE** — uncontested; this document currently governs its subject.
- **PARTIALLY OVERRIDDEN** — most content still governs; specific parts (usually locale scope, hosting platform, or adapter selection) are superseded — read through `PROJECT_OVERRIDES.md`.
- **SUPERSEDED** — root-level decisions or current consolidated documents replace this document for its subject.
- **DUPLICATE** — byte-identical copy of another file; ignore, do not treat as independent.
- **HISTORICAL** — not a specification (a generation prompt, a reference artifact, or a prior audit draft that fed into the root control layer but is not itself authoritative).
- **MISSING** — referenced by name across the corpus but does not exist in any layer.

---

## 2. Governance and control

| Document | Layer | Status | Governs / relevance |
|---|---|---|---|
| `PROJECT_OVERRIDES.md` | root | ACTIVE | Highest-authority cross-project decisions |
| `CLAUDE.md` (root) | root | ACTIVE | Repository operating contract, reading order |
| `DOCS_INDEX.md` (root) | root | ACTIVE | This file |
| `DOCUMENT_AUDIT_REPORT.md` (root) | root | ACTIVE | Findings, conflicts, blockers |
| `01-sources/CLAUDE.md` | 01 | SUPERSEDED | By root `CLAUDE.md`; retained as source-corpus context only |
| Historical `02-sources/CLAUDE.md` / `03-sources/CLAUDE(1).md` references | historical | HISTORICAL / SUPERSEDED | Not active source documents; older audit trail only |
| `01-sources/README.md` | 01 | ACTIVE | Repo quick-start; updated by AUD-034 for Cloudflare Workers + vinext and `fa`/`en`/`ar` launch scope |
| `01-sources/DEVELOPMENT_RULES.md` | 01 | ACTIVE | Development workflow and guardrails (Persian-language document) |
| `01-sources/CODING_STANDARDS.md` | 01 | ACTIVE | Implementation standards |
| `01-sources/DO_NOT_CHANGE.md` | 01 | ACTIVE | Protected files/assets/decisions; updated by AUD-034 so §16 names Cloudflare Workers + vinext rather than Vercel. Every other protection in this document (brand name, logo, palette, slogan, secrets handling, dependency/lockfile discipline) remains fully active. |
| `01-sources/TASKS.md` | 01 | ACTIVE | Current backlog and delivery plan; any Vercel-era acceptance language is superseded by `PROJECT_OVERRIDES.md` §2 |
| `01-sources/DECISIONS.md` | 01 | PARTIALLY OVERRIDDEN | ADR-003 (Persian-only), ADR-011 (no DB), ADR-012 (Vercel) superseded per `PROJECT_OVERRIDES.md`; ADR-001/002/004–010/013–016 and all DDR-* remain accepted and active. **Process gap:** no decision record in the active corpus documents *when or why* these three pivots happened — see `DOCUMENT_AUDIT_REPORT.md` DAR-015 |
| `01-sources/CHANGELOG.md` | 01 | ACTIVE | Change-log convention and instructions |
| `01-sources/all_in_one.md` | 01 | HISTORICAL | 63,000-line concatenation of the other `01-sources` files; not independently read — treat individual files as canonical, this as a bundled reference copy only |
| `/logo/` (`AhanAsa logo-13.jpg`, `AhanAsa logo-14.jpg`) | root | ACTIVE — owner-confirmed authoritative source assets | Official brand/logo source files. Immutable, same as `01-sources/`: never modify, redraw, recreate, or substitute. Production derivatives (favicon, OG image, optimized sizes) may be generated later under `/public/brand/` — not yet done. See `PROJECT_OVERRIDES.md` §6.1. |

---

## 3. Product, brand, and design — 10 documents (all `01-sources`, uncontested)

| Document | Status | Governs |
|---|---|---|
| `01-sources/PROJECT_BRIEF.md` | PARTIALLY OVERRIDDEN | Procurement-platform brief; any Persian-only Phase-1-scope language is superseded by `PROJECT_OVERRIDES.md` §1 |
| `01-sources/BRAND_GUIDELINES.md` | ACTIVE | Brand identity and usage |
| `01-sources/DESIGN_DIRECTION.md` | ACTIVE | Visual direction ("calm control") |
| `01-sources/DESIGN_SYSTEM.md` | ACTIVE | Design tokens, system rules |
| `01-sources/UI_COMPONENTS.md` | ACTIVE | Reusable UI behavior |
| `01-sources/MOTION_GUIDELINES.md` | ACTIVE | Motion, reduced-motion rules |
| `01-sources/RESPONSIVE_RULES.md` | ACTIVE | Responsive behavior |
| `01-sources/ACCESSIBILITY.md` | ACTIVE | WCAG 2.2 AA requirements |
| *(referenced but absent: `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`)* | MISSING | Palette/typography detail currently lives inline in `DESIGN_SYSTEM.md`/`BRAND_GUIDELINES.md`; core tokens (Steel Navy/Forge Copper/White) are confirmed in `PROJECT_OVERRIDES.md` §6 |

---

## 3a. Homepage visual control reference — registered 2026-08-26

| Field | Value |
|---|---|
| **Document** | `design-reference/homepage-desktop-v1.png` |
| **Type** | Visual Control Reference |
| **Status** | ACTIVE |
| **Authority** | OWNER APPROVED |
| **Scope** | Homepage visual implementation (desktop) |
| **Override level** | Canonical visual authority for homepage — supersedes older textual design descriptions (`01-sources/DESIGN_DIRECTION.md`, `01-sources/HOMEPAGE_SPEC.md`, `01-sources/DESIGN_SYSTEM.md`) specifically where they conflict on homepage visual appearance (composition, section order/hierarchy, layout proportions, spacing, typography scale, color relationships, CTA placement, visual density). Does **not** override those documents' non-visual content (functional/content/routing/SEO/accessibility/localization requirements). |
| **Governs** | Desktop homepage visual appearance. Tablet/mobile require responsive adaptation; adaptations must preserve, not replace, the approved direction. |
| **Immutability** | Immutable — same rule as `01-sources/` and `logo/`. Never modify, replace, or regenerate this file directly; a new approved version is a new file plus a new owner decision. |
| **Full detail** | `PROJECT_OVERRIDES.md` §8a, `CLAUDE.md` §5a |

**Read-before-implementing requirement:** Claude Code must inspect this image before implementing or materially modifying the homepage — see `CLAUDE.md` §5a. It is consulted alongside, not instead of, `01-sources/HOMEPAGE_SPEC.md` (row below).

---

## 4. Information architecture and pages — 7 documents (all `01-sources`, uncontested except locale scope)

| Document | Status | Governs |
|---|---|---|
| `01-sources/SITEMAP.md` | PARTIALLY OVERRIDDEN | Page hierarchy — content structure active, locale scope read through override |
| `01-sources/INFORMATION_ARCHITECTURE.md` | PARTIALLY OVERRIDDEN | IA — same caveat |
| `01-sources/ROUTES.md` | PARTIALLY OVERRIDDEN | Route contracts — `/fa` non-prefix rule stable, en/ar prefixes now required rather than future. **Unresolved route-naming conflicts, not locale-related:** `ROUTES.md`/`REDIRECTS.md` use `/request` as the canonical RFQ route while `SITEMAP.md`/`SEO_PAGE_MAP.md` use `/request-consultation`; `01-sources/INTERNAL_LINKING.md` §3.1 explicitly names this conflict and recommends `/request` as canonical with `/request-consultation` redirected — treat that as the resolution. A second, still-open naming conflict: `ROUTES.md` uses `/steel-products/[category-slug]` while catalog docs use `/steel/{category}/{product}`; no document has explicitly reconciled these. See `DOCUMENT_AUDIT_REPORT.md` DAR-016. |
| `01-sources/PAGE_SPECIFICATIONS.md` | ACTIVE | Shared page requirements |
| `01-sources/HOMEPAGE_SPEC.md` | ACTIVE | Homepage contract — content/functional requirements. **Visual appearance is governed by `design-reference/homepage-desktop-v1.png` where they conflict** — see §3a. |
| `01-sources/HEADER_NAVIGATION_SPEC.md` | ACTIVE | Header/nav behavior |
| `01-sources/FOOTER_SPEC.md` | ACTIVE | Footer behavior/content |

---

## 5. Content and media — 7 documents (all `01-sources`, uncontested)

| Document | Status | Governs |
|---|---|---|
| `01-sources/CONTENT_STRATEGY.md` | ACTIVE | Content strategy |
| `01-sources/CONTENT_MODEL.md` | ACTIVE | Structured content model — schema is already multilingual-ready (`LocalizedText` = `{fa: required, en?: string, ar?: string}`, `type Locale = "fa" \| "en" \| "ar"` in its TS contract, §15.2); only the *publication policy* text ("Phase 1 is Persian," en/ar optional-future) needs updating to match the override's required-at-launch requirement — this is not a structural rewrite |
| `01-sources/COPY_GUIDELINES.md` | ACTIVE | Copy and tone |
| `01-sources/CTA_STRATEGY.md` | ACTIVE | Conversion/CTA rules |
| `01-sources/MEDIA_GUIDELINES.md` | ACTIVE | Media sourcing, truthfulness |
| `01-sources/IMAGE_OPTIMIZATION.md` | ACTIVE | Image pipeline |
| `01-sources/FONT_STRATEGY.md` | PARTIALLY OVERRIDDEN | Font loading — AUD-034 corrected the active Persian-only launch row to `fa`/`en`/`ar`. Final family/licensing choices and exact multi-locale font budgets remain unresolved owner/implementation decisions; do not invent them. See `DOCUMENT_AUDIT_REPORT.md` DAR-010. |

---

## 6. Commercial platform, catalog, data, and Odoo — the largest scope delta between layers

| Document | Layer | Status | Governs |
|---|---|---|---|
| `01-sources/DATA_ARCHITECTURE.md` | 01 | SUPERSEDED | Static, database-free content model retained only as superseded context |
| `01-sources/DATA_ARCHITECTURE(1).md` | 01 | ACTIVE | Full Odoo-integrated data architecture, D1/R2 ownership matrix. **Filename note:** the file is physically named `DATA_ARCHITECTURE(1).md` but its own content declares itself `DATA_ARCHITECTURE.md` — treat this as the canonical current data-architecture content; rename only during a future canonical docs rewrite |
| `01-sources/DATABASE_SCHEMA.md` | 01 | ACTIVE | D1 physical schema (`DB_PUBLIC`/`DB_OPS`) |
| `01-sources/CMS_ARCHITECTURE.md` | 01 | ACTIVE | Website CMS built into D1 (articles, SEO overlays); older deferred-CMS statements are superseded |
| `01-sources/CMS_ARCHITECTURE (1).md` | 01 | DUPLICATE | Byte-identical to `01-sources/CMS_ARCHITECTURE.md` — confirmed via diff |
| *(referenced but absent: `ODOO_INTEGRATION.md`)* | — | MISSING | Its intended contract is substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §14 and `01-sources/DATA_ARCHITECTURE(1).md` §20–§27, but no dedicated document exists — Odoo protocol/version remains a genuine discovery gate regardless |
| *(referenced but absent: `SYSTEM_OF_RECORD.md`)* | — | MISSING | Substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §5 and `01-sources/DATA_ARCHITECTURE(1).md` §5 |
| *(referenced but absent: `SYNC_STRATEGY.md`)* | — | MISSING | Partially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §14.5/§16 and `01-sources/DATA_ARCHITECTURE(1).md` §24–§27; retry cadence/backoff specifics not fully specified anywhere |
| *(referenced but absent: `ERP_DATA_MAPPING.md`)* | — | MISSING | Provisional mapping table exists in `01-sources/TECHNICAL_ARCHITECTURE.md` §14.3 and `01-sources/DATA_ARCHITECTURE(1).md` §21, explicitly marked provisional pending Odoo module inspection |
| *(referenced but absent: `FAILURE_RECOVERY.md`)* | — | MISSING | Partially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §14.5/§23 and `01-sources/DATA_ARCHITECTURE(1).md` §27; no dedicated runbook document exists |
| *(referenced but absent: `PRICING_SYSTEM.md`)* | — | MISSING | Substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §11.2–§11.4 and `01-sources/DATA_ARCHITECTURE(1).md` §14 |
| *(referenced but absent: `RFQ_SYSTEM.md`)* | — | MISSING | Substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §12 and `01-sources/DATA_ARCHITECTURE(1).md` §15–§19; response codes and state machine already defined there |
| *(referenced but absent: `PRODUCT_CATALOG_SPEC.md`)* | — | MISSING | Substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §11 and `01-sources/DATA_ARCHITECTURE(1).md` §10–§13 |
| *(referenced but absent: `ADMIN_PANEL_SPEC.md`)* | — | MISSING | Scope outline exists in `01-sources/PROJECT_BRIEF.md` §15 and `01-sources/TECHNICAL_ARCHITECTURE.md` §17; no detailed UI spec exists |
| *(referenced but absent: `AUTHORIZATION_ROLES.md`)* | — | MISSING | Role list exists in `01-sources/PROJECT_BRIEF.md` §15.3, `01-sources/TECHNICAL_ARCHITECTURE.md` §17, `01-sources/DATABASE_SCHEMA.md` §6.2; permission matrix not fully specified |
| `01-sources/CUSTOMER_ACCOUNT_ARCHITECTURE.md` | 01 | ACTIVE — future-phase architecture, registered 2026-08-28 | Identity/account/customer/Odoo-partner conceptual model, guest-RFQ-to-account linking, authentication requirements, IDOR-prevention authorization rule. Not an implementation authorization — see `DECISIONS.md` ADR-017. |
| `01-sources/CUSTOMER_PORTAL.md` | 01 | ACTIVE — future-phase architecture, registered 2026-08-28 | Customer Portal MVP vs. future-capability boundary, no-live-Odoo-read requirement, public price read-model/edge-caching/invalidation, logical data-domain separation, production-jurisdiction gate. Not an implementation authorization — see `DECISIONS.md` ADR-017. |

---

## 7. SEO — 8 subjects, mixed layers

| Document | Layer | Status | Governs |
|---|---|---|---|
| `01-sources/SEO_STRATEGY.md` | 01 | ACTIVE | SEO architecture/policy — locale scope read through override |
| `01-sources/SEO_KEYWORD_MAP.md` | 01 | ACTIVE | Keyword ownership |
| `01-sources/SEO_PAGE_MAP.md` | 01 | ACTIVE | SEO landing-page map |
| `01-sources/METADATA_SPEC.md` | 01 | PARTIALLY OVERRIDDEN | Metadata contract; any future-locale framing is superseded by `PROJECT_OVERRIDES.md` §1 |
| `01-sources/STRUCTURED_DATA.md` | 01 | PARTIALLY OVERRIDDEN | JSON-LD contract; same locale caveat |
| `01-sources/INTERNAL_LINKING.md` | 01 | PARTIALLY OVERRIDDEN | Linking architecture; same locale caveat |
| `01-sources/REDIRECTS.md` | 01 | ACTIVE | Redirect/legacy URL policy |
| `01-sources/SITEMAP_ROBOTS_SPEC.md` | 01 | PARTIALLY OVERRIDDEN | Sitemap/robots contract; any exclusion of approved `/en/**` or `/ar/**` launch routes is superseded by `PROJECT_OVERRIDES.md` §1 |
| `01-sources/HREFLANG_CANONICAL.md` | 01 | PARTIALLY OVERRIDDEN | Canonical-host rules active; "no hreflang, Persian-only" position superseded |
| `01-sources/LOCALIZATION.md` | 01 | PARTIALLY OVERRIDDEN | Route/direction architecture reusable; "Persian only" launch claim superseded |
| `01-sources/LOCALE_CONTENT_STRUCTURE.md` | 01 | PARTIALLY OVERRIDDEN | Structure reusable; same caveat |

---

## 8. Engineering, deployment, environments

| Document | Layer | Status | Governs |
|---|---|---|---|
| `01-sources/TECHNICAL_ARCHITECTURE.md` | 01 | ACTIVE | Cloudflare/Odoo architecture — adapter fallback language is superseded by the confirmed `vinext` scaffold, see `PROJECT_OVERRIDES.md` §2; everything else active |
| `01-sources/STACK.md` | 01 | PARTIALLY OVERRIDDEN | Stack detail active except §7.2 adapter lock (`@opennextjs/cloudflare`), which is superseded by the confirmed `vinext` scaffold — see `PROJECT_OVERRIDES.md` §2 |
| `01-sources/FOLDER_STRUCTURE.md` | 01 | ACTIVE | Repo organization — predates D1/R2/Odoo modules named in `01-sources/TECHNICAL_ARCHITECTURE.md` §7; usable as a base, needs the `lib/odoo`, `lib/outbox`, `workers/` additions layered in |
| `01-sources/COMPONENT_ARCHITECTURE.md` | 01 | ACTIVE | Component boundaries |
| `01-sources/API_INTEGRATIONS.md` | 01 | PARTIALLY OVERRIDDEN | General API-contract principles active; specific integration targets superseded by the Odoo adapter model |
| `01-sources/FORM_ARCHITECTURE.md` | 01 | PARTIALLY OVERRIDDEN | Form-handling principles active; lead-destination model superseded by durable D1 + outbox RFQ flow |
| `01-sources/ANALYTICS_TRACKING.md` | 01 | ACTIVE | Event taxonomy/PII-exclusion rules active; provider remains deferred (`OPEN-005`) even though `PROJECT_OVERRIDES.md` §5 now requires GTM/GSC (owner-confirmed) in principle |
| `01-sources/SECURITY_GUIDELINES.md` | 01 | PARTIALLY OVERRIDDEN | Control content (OWASP ASVS, input validation, upload rules) active; "Vercel behind Cloudflare" architecture line superseded |
| `01-sources/ENVIRONMENT_VARIABLES.md` | 01 | ACTIVE | Cloudflare bindings and secrets registry |
| `01-sources/ENVIRONMENT_VARIABLES.md` | 01 | ACTIVE | Cloudflare bindings + secrets registry |
| `01-sources/DEPLOYMENT_ARCHITECTURE.md` | 01 | ACTIVE | Cloudflare Workers deployment; explicitly states it replaces the Vercel baseline |
| `01-sources/DEPLOYMENT_ARCHITECTURE (2).md` | 01 | DUPLICATE | Byte-identical to `01-sources/DEPLOYMENT_ARCHITECTURE.md` — confirmed via diff |
| `01-sources/ahan-asa-homepage-control.html` | 01 | HISTORICAL | Static internal reference render of the homepage with fa/en/ar hreflang already modeled — useful as a visual/markup reference, not a spec |
| `01-sources/prompt technical architecture.txt` | 01 | HISTORICAL | Persian-language generation prompt used to produce the technical-architecture source; not itself a specification |

---

## 9. Performance, caching, testing, QA, release

| Document | Layer | Status | Governs |
|---|---|---|---|
| `01-sources/PERFORMANCE_GUIDELINES.md` | 01 | ACTIVE | Implementation rules — Cloudflare-specific budget numbers live in `01-sources/TECHNICAL_ARCHITECTURE.md` §20 |
| `01-sources/CACHING_STRATEGY.md` | 01 | PARTIALLY OVERRIDDEN | General cache-safety principles active; Vercel/Next.js cache mechanics superseded by Cloudflare edge-cache model in `01-sources/TECHNICAL_ARCHITECTURE.md` §18 |
| `01-sources/TESTING_STRATEGY.md` | 01 | PARTIALLY OVERRIDDEN | Testing strategy; any locale-testing scope that frames LTR-readiness as future rather than required is superseded by `PROJECT_OVERRIDES.md` §1 |
| `01-sources/QA_CHECKLIST.md` | 01 | ACTIVE | Cloudflare/Odoo release checklist |
| `01-sources/SEO_QA_CHECKLIST.md` | 01 | ACTIVE | SEO gate; updated by AUD-034 for `fa`/`en`/`ar` hreflang and direction checks |
| `01-sources/RESPONSIVE_QA.md` | 01 | ACTIVE | Responsive QA scenarios |
| `01-sources/ACCESSIBILITY_QA.md` | 01 | ACTIVE | Accessibility QA checklist |
| `01-sources/PRE_DEPLOY_CHECKLIST.md` | 01 | ACTIVE | Checklist content active; updated by AUD-034 for Cloudflare Workers + vinext deployment target |
| `01-sources/POST_DEPLOY_CHECKLIST.md` | 01 | PARTIALLY OVERRIDDEN | Same caveat |
| *(referenced but absent: `PERFORMANCE_BUDGET.md`)* | — | MISSING | Referenced as authoritative for numeric budgets/CI gates; only provisional numbers exist inline in `01-sources/TECHNICAL_ARCHITECTURE.md` §20.2 |
| *(referenced but absent: `AHAN_ASA_SITE_COPY_FA_FINAL.md`)* | — | MISSING | `01-sources/SEO_QA_CHECKLIST.md` declares this "the sole approved source of page copy" — a hard dependency for the SEO QA gate that does not exist anywhere in the inspected corpus. Do not fabricate its contents; treat final page copy as a genuine content-authoring gap, not a documentation-reconciliation one. |

---

## 10. Task-to-document quick reference

See `CLAUDE.md` §6 for the condensed version used during implementation. This index is the detailed, per-file version; `CLAUDE.md` is the one to consult first for a narrow task.

---

## 11. Repository naming rule

Two duplicate filenames exist in `01-sources/` (confirmed byte-identical via `diff`): `CMS_ARCHITECTURE (1).md` and `DEPLOYMENT_ARCHITECTURE (2).md`. These are accidental export duplicates of `CMS_ARCHITECTURE.md` and `DEPLOYMENT_ARCHITECTURE.md` respectively. Per `CLAUDE.md` §2, `01-sources/` is immutable during implementation work — do not delete these duplicates from the source folder. If a future canonical `/docs` rewrite is undertaken, do not carry the duplicates forward.

One near-duplicate is a *naming* mismatch, not a content duplicate: `01-sources/DATA_ARCHITECTURE(1).md` is the sole current file for that subject, just misnamed.

---

## 12. Maintenance rule

Update this file when a document is added, its layer status changes (e.g., a missing document above gets authored), or a new duplicate/naming issue is discovered. Keep detail in the owning specialist document — this index stays a navigation and status layer only.

---

**End of `DOCS_INDEX.md`**
