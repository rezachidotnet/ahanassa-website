# DOCS_INDEX.md

## Ahan Asa Website — Documentation Control Index

**Project:** Ahan Asa | آهن آسا  
**Domain:** `https://www.ahanassa.com`  
**ERP:** `https://odoo.ahanassa.com`  
**Document role:** Canonical navigation and document-control index  
**Status:** Active — pre-implementation control baseline  
**Version:** 1.0.0  
**Last updated:** 2026-08-26  
**Indexed project documents:** 77 existing project documents  
**Control documents after this addition:** 79 total including `DOCS_INDEX.md` and `DOCUMENT_AUDIT_REPORT.md`

---

## 1. Purpose

This file is the navigation layer for Ahan Asa project documentation. It exists to prevent coding agents and contributors from reading all documents mechanically, using stale specifications accidentally, or choosing between conflicting documents without an explicit rule.

This file does **not** replace specialist specifications. It tells Claude Code and human contributors:

- what documents exist or are expected in the controlled documentation set;
- which documents govern each task area;
- what must always be read before implementation;
- how document precedence works;
- which documents are affected by current project-wide overrides;
- which documents require audit or refresh before implementation handoff.

---

## 2. Effective Document Authority

Use the following control order when requirements conflict:

1. the project owner's latest explicit instruction;
2. legal, security, privacy, and safety requirements;
3. `PROJECT_OVERRIDES.md` **for the decisions explicitly covered by that file**;
4. `CLAUDE.md` for repository-wide implementation behavior;
5. approved entries in `DECISIONS.md` that explicitly identify what they supersede;
6. `PROJECT_BRIEF.md` for product scope and business intent;
7. the specialist specification that owns the affected behavior;
8. `TECHNICAL_ARCHITECTURE.md`, `STACK.md`, and other cross-cutting architecture documents;
9. development, testing, and repository conventions;
10. implementation patterns in the codebase.

### Conflict rule

A conflict must never be resolved silently in code.

If an older document conflicts with a decision explicitly listed in `PROJECT_OVERRIDES.md`, apply the override and record the stale document in `DOCUMENT_AUDIT_REPORT.md`. For conflicts not covered by an approved override or decision, stop only the affected implementation area and record a decision gate.

---

## 3. Mandatory Reading Protocol

### 3.1 Always read before any implementation task

1. `PROJECT_OVERRIDES.md`
2. `CLAUDE.md`
3. `DOCS_INDEX.md`
4. `PROJECT_BRIEF.md`
5. `DEVELOPMENT_RULES.md`
6. `DO_NOT_CHANGE.md`
7. `TASKS.md`
8. `DECISIONS.md`
9. `DOCUMENT_AUDIT_REPORT.md`
10. `README.md`

The purpose of this list is not to create unnecessary context. These are the governance documents that can change how all other documents must be interpreted.

### 3.2 Then read only the specialist documents that materially govern the task

Claude Code must read every applicable specialist document completely, but must not load the full documentation set when the task is narrow.

---

## 4. Current Binding Project-Wide Overrides

`PROJECT_OVERRIDES.md` currently controls at least the following decisions:

- supported public languages: Persian (`fa`), English (`en`), Arabic (`ar`);
- Persian is the default and unprefixed locale;
- English uses `/en/` and Arabic uses `/ar/`;
- `fa` and `ar` are RTL; `en` is LTR;
- localized SEO, canonical, hreflang and `x-default` behavior is mandatory;
- Google Search Console is a launch requirement;
- Google Tag Manager is a launch requirement;
- approved current company address and phone are centrally defined;
- approved board information is centrally defined;
- final logo assets are pending and placeholders must remain replaceable;
- AI-generated and properly licensed media may be used subject to the media policy;
- the Cloudflare-first architecture remains valid;
- the Odoo system-of-record architecture remains valid;
- performance-first and SEO-first constraints remain valid.

Any document that still describes Persian-only launch behavior, Vercel production hosting, or another superseded rule must be interpreted through these overrides until refreshed.

---

## 5. Controlled Documentation Inventory

### Status legend

- **CONTROL** — repository/project governance document.
- **FOUNDATIONAL** — major product or architecture source.
- **SPECIALIST** — owns one defined implementation concern.
- **QA/GATE** — validates implementation or release readiness.
- **OVERRIDE-AFFECTED** — known to require interpretation through `PROJECT_OVERRIDES.md` or refresh before final handoff.
- **AUDIT-PENDING** — listed in the controlled set but not yet fully content-audited in the current audit cycle.

### 5.1 Governance and control — 9 documents

| # | Document | Role | Current control state |
|---:|---|---|---|
| 1 | `PROJECT_OVERRIDES.md` | Latest cross-project overrides | CONTROL / ACTIVE |
| 2 | `CLAUDE.md` | Claude Code repository operating contract | CONTROL / OVERRIDE-AFFECTED |
| 3 | `README.md` | Repository entry point and quick-start | CONTROL / OVERRIDE-AFFECTED |
| 4 | `DEVELOPMENT_RULES.md` | Development workflow and guardrails | CONTROL / precedence review required |
| 5 | `CODING_STANDARDS.md` | Implementation standards | CONTROL / AUDIT-PENDING |
| 6 | `DO_NOT_CHANGE.md` | Protected files, assets, and decisions | CONTROL / AUDIT-PENDING |
| 7 | `TASKS.md` | Backlog, dependencies, delivery status | CONTROL / AUDIT-PENDING |
| 8 | `DECISIONS.md` | Architecture/product decision record | CONTROL / required before handoff |
| 9 | `CHANGELOG.md` | Material project change history | CONTROL / AUDIT-PENDING |

### 5.2 Product, brand, and design — 10 documents

| # | Document | Governing concern | State |
|---:|---|---|---|
| 10 | `PROJECT_BRIEF.md` | Product/business source of truth | FOUNDATIONAL / OVERRIDE-AFFECTED |
| 11 | `BRAND_GUIDELINES.md` | Brand identity and usage | SPECIALIST / AUDIT-PENDING |
| 12 | `DESIGN_DIRECTION.md` | Visual direction | SPECIALIST / AUDIT-PENDING |
| 13 | `DESIGN_SYSTEM.md` | Design tokens and system rules | SPECIALIST / AUDIT-PENDING |
| 14 | `COLOR_SYSTEM.md` | Color tokens and usage | SPECIALIST / AUDIT-PENDING |
| 15 | `TYPOGRAPHY_SYSTEM.md` | Typography rules | SPECIALIST / AUDIT-PENDING |
| 16 | `UI_COMPONENTS.md` | Reusable UI behavior | SPECIALIST / AUDIT-PENDING |
| 17 | `MOTION_GUIDELINES.md` | Motion and reduced-motion rules | SPECIALIST / AUDIT-PENDING |
| 18 | `RESPONSIVE_RULES.md` | Responsive behavior | SPECIALIST / AUDIT-PENDING |
| 19 | `ACCESSIBILITY.md` | Accessibility requirements | SPECIALIST / AUDIT-PENDING |

### 5.3 Information architecture and pages — 7 documents

| # | Document | Governing concern | State |
|---:|---|---|---|
| 20 | `SITEMAP.md` | Page hierarchy | SPECIALIST / multilingual audit required |
| 21 | `INFORMATION_ARCHITECTURE.md` | Content/page architecture | SPECIALIST / multilingual audit required |
| 22 | `ROUTES.md` | Route contracts | SPECIALIST / OVERRIDE-AFFECTED |
| 23 | `PAGE_SPECIFICATIONS.md` | Shared page requirements | SPECIALIST / multilingual audit required |
| 24 | `HOMEPAGE_SPEC.md` | Homepage implementation contract | SPECIALIST / multilingual audit required |
| 25 | `HEADER_NAVIGATION_SPEC.md` | Header/navigation behavior | SPECIALIST / multilingual audit required |
| 26 | `FOOTER_SPEC.md` | Footer behavior/content | SPECIALIST / contact/localization audit required |

### 5.4 Content and media — 5 documents

| # | Document | Governing concern | State |
|---:|---|---|---|
| 27 | `CONTENT_STRATEGY.md` | Content strategy | SPECIALIST / multilingual audit required |
| 28 | `CONTENT_MODEL.md` | Structured content model | SPECIALIST / multilingual audit required |
| 29 | `COPY_GUIDELINES.md` | Copy and tone | SPECIALIST / multilingual audit required |
| 30 | `CTA_STRATEGY.md` | Conversion and CTA rules | SPECIALIST / analytics audit required |
| 31 | `MEDIA_GUIDELINES.md` | Media sourcing, truthfulness, optimization | SPECIALIST / OVERRIDE-AFFECTED |

### 5.5 Commercial platform, catalog, admin, and RFQ — 6 documents

| # | Document | Governing concern | State |
|---:|---|---|---|
| 32 | `DATABASE_SCHEMA.md` | D1 schema and migrations | SPECIALIST / audit required |
| 33 | `ADMIN_PANEL_SPEC.md` | Admin surface | SPECIALIST / localization and RBAC audit required |
| 34 | `AUTHORIZATION_ROLES.md` | Roles and permissions | SPECIALIST / audit required |
| 35 | `PRODUCT_CATALOG_SPEC.md` | Catalog and product projection | SPECIALIST / multilingual audit required |
| 36 | `PRICING_SYSTEM.md` | Public/commercial pricing rules | SPECIALIST / audit required |
| 37 | `RFQ_SYSTEM.md` | Structured RFQ workflow | SPECIALIST / locale capture audit required |

### 5.6 SEO — 8 documents

| # | Document | Governing concern | State |
|---:|---|---|---|
| 38 | `SEO_STRATEGY.md` | SEO architecture and policy | FOUNDATIONAL / multilingual audit required |
| 39 | `SEO_KEYWORD_MAP.md` | Keyword ownership by page/locale | SPECIALIST / OVERRIDE-AFFECTED |
| 40 | `SEO_PAGE_MAP.md` | SEO landing-page map | SPECIALIST / OVERRIDE-AFFECTED |
| 41 | `METADATA_SPEC.md` | Metadata generation | SPECIALIST / OVERRIDE-AFFECTED |
| 42 | `STRUCTURED_DATA.md` | JSON-LD/schema rules | SPECIALIST / multilingual audit required |
| 43 | `INTERNAL_LINKING.md` | Internal-link architecture | SPECIALIST / multilingual audit required |
| 44 | `REDIRECTS.md` | Redirect and legacy URL policy | SPECIALIST / locale-routing audit required |
| 45 | `SITEMAP_ROBOTS_SPEC.md` | Sitemap and robots behavior | SPECIALIST / OVERRIDE-AFFECTED |

### 5.7 Engineering, data, and integrations — 16 documents

| # | Document | Governing concern | State |
|---:|---|---|---|
| 46 | `TECHNICAL_ARCHITECTURE.md` | Cross-system architecture | FOUNDATIONAL / multilingual acceptance update required |
| 47 | `STACK.md` | Approved technology/runtime stack | FOUNDATIONAL / verify repository versions at implementation |
| 48 | `FOLDER_STRUCTURE.md` | Repository organization | SPECIALIST / documentation-tree refresh required |
| 49 | `COMPONENT_ARCHITECTURE.md` | Component boundaries | SPECIALIST / AUDIT-PENDING |
| 50 | `DATA_ARCHITECTURE.md` | Data boundaries/read-write model | FOUNDATIONAL / filename verification required |
| 51 | `CMS_ARCHITECTURE.md` | Website CMS | SPECIALIST / multilingual CMS audit required |
| 52 | `API_INTEGRATIONS.md` | External/internal API contracts | SPECIALIST / GTM/Odoo audit required |
| 53 | `FORM_ARCHITECTURE.md` | Form behavior and validation | SPECIALIST / locale/privacy audit required |
| 54 | `ANALYTICS_TRACKING.md` | Analytics event architecture | SPECIALIST / GTM override integration required |
| 55 | `SECURITY_GUIDELINES.md` | Security/privacy boundaries | SPECIALIST / AUDIT-PENDING |
| 56 | `ENVIRONMENT_VARIABLES.md` | Environment configuration | SPECIALIST / GTM and Cloudflare bindings audit required |
| 57 | `ODOO_INTEGRATION.md` | Website ↔ Odoo integration contract | SPECIALIST / critical handoff document |
| 58 | `SYSTEM_OF_RECORD.md` | Authoritative data ownership | FOUNDATIONAL / critical handoff document |
| 59 | `SYNC_STRATEGY.md` | Sync, retries, reconciliation, invalidation | SPECIALIST / critical handoff document |
| 60 | `ERP_DATA_MAPPING.md` | Website/Odoo field and model mapping | SPECIALIST / Odoo discovery gate remains |
| 61 | `FAILURE_RECOVERY.md` | Outage, retry, DLQ, recovery behavior | SPECIALIST / critical handoff document |

### 5.8 Performance, localization, QA, and release — 16 documents

| # | Document | Governing concern | State |
|---:|---|---|---|
| 62 | `PERFORMANCE_BUDGET.md` | Numeric budgets and CI gates | QA/GATE / critical handoff document |
| 63 | `PERFORMANCE_GUIDELINES.md` | Performance implementation rules | SPECIALIST / AUDIT-PENDING |
| 64 | `IMAGE_OPTIMIZATION.md` | Image pipeline and budgets | SPECIALIST / media override audit required |
| 65 | `FONT_STRATEGY.md` | Font loading/subsetting | SPECIALIST / multilingual glyph audit required |
| 66 | `CACHING_STRATEGY.md` | Edge/app/data cache policy | FOUNDATIONAL / Cloudflare-aligned |
| 67 | `LOCALIZATION.md` | Locale behavior | SPECIALIST / P0 multilingual refresh required |
| 68 | `LOCALE_CONTENT_STRUCTURE.md` | Localized content storage | SPECIALIST / P0 multilingual refresh required |
| 69 | `HREFLANG_CANONICAL.md` | Locale canonical/hreflang rules | SPECIALIST / P0 multilingual refresh required |
| 70 | `TESTING_STRATEGY.md` | Test strategy and architecture validation | QA/GATE / multilingual test refresh required |
| 71 | `QA_CHECKLIST.md` | Release QA | QA/GATE / multilingual QA refresh required |
| 72 | `SEO_QA_CHECKLIST.md` | SEO release gate | QA/GATE / P0 multilingual refresh required |
| 73 | `RESPONSIVE_QA.md` | Responsive QA | QA/GATE / AUDIT-PENDING |
| 74 | `ACCESSIBILITY_QA.md` | Accessibility QA | QA/GATE / multilingual direction audit required |
| 75 | `PRE_DEPLOY_CHECKLIST.md` | Pre-production release gate | QA/GATE / Cloudflare + locale audit required |
| 76 | `POST_DEPLOY_CHECKLIST.md` | Live release verification | QA/GATE / GSC/GTM/locale verification required |
| 77 | `DEPLOYMENT_ARCHITECTURE.md` | Environments, deployment, rollback | FOUNDATIONAL / Cloudflare handoff verification required |

---

## 6. Task-to-Document Reading Map

| Task area | Required specialist documents after the mandatory control set |
|---|---|
| Architecture or dependencies | `STACK.md`, `TECHNICAL_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`, `DATA_ARCHITECTURE.md`, `CODING_STANDARDS.md` |
| Database or migrations | `DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `FAILURE_RECOVERY.md`, `SECURITY_GUIDELINES.md` |
| Odoo or commercial data | `ODOO_INTEGRATION.md`, `ERP_DATA_MAPPING.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `API_INTEGRATIONS.md`, `FAILURE_RECOVERY.md` |
| Catalog | `PRODUCT_CATALOG_SPEC.md`, `DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SYSTEM_OF_RECORD.md`, `ERP_DATA_MAPPING.md`, `SEO_STRATEGY.md` |
| Prices | `PRICING_SYSTEM.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `CACHING_STRATEGY.md`, `SEO_STRATEGY.md`, `PERFORMANCE_BUDGET.md` |
| RFQ or uploads | `RFQ_SYSTEM.md`, `FORM_ARCHITECTURE.md`, `API_INTEGRATIONS.md`, `DATABASE_SCHEMA.md`, `FAILURE_RECOVERY.md`, `SECURITY_GUIDELINES.md`, `ODOO_INTEGRATION.md` |
| Admin / CMS / authorization | `ADMIN_PANEL_SPEC.md`, `AUTHORIZATION_ROLES.md`, `CMS_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md`, `DATA_ARCHITECTURE.md` |
| Brand or visual design | `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`, `UI_COMPONENTS.md`, `MOTION_GUIDELINES.md` |
| Pages or navigation | `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, `ROUTES.md`, `PAGE_SPECIFICATIONS.md`, relevant page spec, `INTERNAL_LINKING.md` |
| Homepage | `HOMEPAGE_SPEC.md`, `HEADER_NAVIGATION_SPEC.md`, `FOOTER_SPEC.md`, `CONTENT_STRATEGY.md`, `CTA_STRATEGY.md`, `SEO_STRATEGY.md`, `METADATA_SPEC.md`, `PERFORMANCE_BUDGET.md` |
| Content | `CONTENT_STRATEGY.md`, `CONTENT_MODEL.md`, `COPY_GUIDELINES.md`, `CTA_STRATEGY.md`, `MEDIA_GUIDELINES.md`, `LOCALIZATION.md` |
| SEO | `SEO_STRATEGY.md`, `SEO_KEYWORD_MAP.md`, `SEO_PAGE_MAP.md`, `METADATA_SPEC.md`, `STRUCTURED_DATA.md`, `INTERNAL_LINKING.md`, `SITEMAP_ROBOTS_SPEC.md`, `REDIRECTS.md`, `HREFLANG_CANONICAL.md` |
| Localization | `LOCALIZATION.md`, `LOCALE_CONTENT_STRUCTURE.md`, `HREFLANG_CANONICAL.md`, `ROUTES.md`, `METADATA_SPEC.md`, `CONTENT_MODEL.md` |
| Analytics / GTM | `ANALYTICS_TRACKING.md`, `CTA_STRATEGY.md`, `FORM_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md`, `ENVIRONMENT_VARIABLES.md` |
| Performance / cache | `PERFORMANCE_BUDGET.md`, `PERFORMANCE_GUIDELINES.md`, `CACHING_STRATEGY.md`, `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md` |
| Deployment | `DEPLOYMENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`, `SECURITY_GUIDELINES.md`, `FAILURE_RECOVERY.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md` |
| Testing / release | `TESTING_STRATEGY.md`, `QA_CHECKLIST.md`, `RESPONSIVE_QA.md`, `ACCESSIBILITY_QA.md`, `SEO_QA_CHECKLIST.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md` |

---

## 7. Implementation Handoff Gate

Claude Code implementation must not begin as a full-project build until all **P0 documentation issues** in `DOCUMENT_AUDIT_REPORT.md` are closed or explicitly accepted by the owner.

A narrow task may proceed only when:

- its governing documents have no unresolved P0 contradiction;
- `PROJECT_OVERRIDES.md` is read first;
- unresolved Odoo facts are treated as discovery gates rather than guessed values;
- no stale Persian-only, Vercel-only, or old architecture rule is allowed to override the approved current direction.

---

## 8. Audit Workflow

The controlled audit order is:

1. Governance and precedence
2. Product / brand / design
3. Information architecture / pages / content
4. Commercial platform / data / Odoo / RFQ
5. SEO / localization / analytics
6. Performance / caching / security
7. Testing / deployment / QA
8. Cross-document consistency review
9. Final Claude Code handoff review

Each document receives one of:

- `PASS`
- `PASS WITH OVERRIDE`
- `MINOR UPDATE`
- `MAJOR UPDATE`
- `BLOCKED BY DECISION`
- `MISSING / UNVERIFIED`

Detailed findings belong only in `DOCUMENT_AUDIT_REPORT.md`; this index remains the navigation layer.

---

## 9. Repository Naming Rule

Each controlled specification must have one canonical filename. Copies such as `DATA_ARCHITECTURE(1).md`, `file copy.md`, or date-suffixed duplicates must not become competing sources of truth.

Before Claude Code handoff, verify that the repository contains the canonical filename referenced by this index and archive or remove accidental duplicates outside the authoritative documentation path.

---

## 10. Maintenance Rule

Update this file when:

- a controlled document is added, renamed, merged, split, deprecated, or removed;
- a specialist document changes ownership of a concern;
- `PROJECT_OVERRIDES.md` adds a cross-project decision;
- the mandatory reading protocol changes;
- the handoff gate changes.

Do not turn this index into a second copy of specialist requirements. Keep detailed requirements in their owning documents.

---

**End of `DOCS_INDEX.md`**
