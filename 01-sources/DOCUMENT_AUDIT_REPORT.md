# DOCUMENT_AUDIT_REPORT.md

## Ahan Asa Website — Documentation Audit & Claude Code Handoff Report

**Project:** Ahan Asa | آهن آسا  
**Domain:** `https://www.ahanassa.com`  
**ERP:** `https://odoo.ahanassa.com`  
**Audit role:** Cross-document consistency, readiness, and implementation handoff control  
**Status:** OPEN — baseline audit started; not final sign-off  
**Version:** 1.0.0  
**Audit date:** 2026-08-26  
**Controlled inventory:** 77 existing project documents + `DOCS_INDEX.md` + this report  
**Final implementation readiness:** **NO-GO until P0 findings are closed**

---

## 1. Purpose

This report records contradictions, stale assumptions, missing decisions, incomplete propagation of approved decisions, duplicate-source risks, and other documentation issues that could cause Claude Code to implement the wrong system.

The audit has two goals:

1. make the 70+ document set internally consistent enough for implementation;
2. reduce Claude Code context use by making conflicts and required reading explicit before coding begins.

This report is evidence-driven. A document is not marked `PASS` merely because it exists or is referenced elsewhere.

---

## 2. Severity Model

| Severity | Meaning | Handoff effect |
|---|---|---|
| **P0 — Critical** | Can cause wrong product scope, deployment architecture, localization architecture, data ownership, security/privacy behavior, or destructive implementation | Blocks affected implementation and full handoff |
| **P1 — Major** | Can produce material inconsistency, broken SEO/QA, incomplete integration, or repeated rework | Must be fixed before final implementation handoff unless explicitly accepted |
| **P2 — Minor** | Naming, indexing, wording, stale cross-reference, or maintainability issue with low immediate execution risk | Fix during documentation freeze |
| **P3 — Note** | Open input, verification, or future decision intentionally left unresolved | Does not block unrelated work |

---

## 3. Audit Status Labels

- `OPEN` — issue is active.
- `RESOLVED` — documents have been aligned and verified.
- `ACCEPTED OVERRIDE` — stale text remains, but an explicit approved override safely controls it and Claude Code is guaranteed to read the override first.
- `DECISION REQUIRED` — owner or operational discovery is required.
- `VERIFY IN REPOSITORY` — file/reference must be checked against the actual Git repository.

---

## 4. Current Executive Summary

### 4.1 Confirmed architectural direction

The currently controlled direction is:

```text
Public user / search engine
        ↓
Cloudflare Edge
        ↓
Next.js App Router on Cloudflare Workers
        ├── D1 website data + public read models
        ├── R2 media + private RFQ attachments
        ├── Queues / retry / DLQ
        ├── Turnstile / security controls
        └── server-only Odoo adapter
                 ↓
        odoo.ahanassa.com
```

Core business boundary:

```text
Website = Presentation + SEO + RFQ UX + durable first capture
Odoo    = Commercial / ERP system of record
```

Current localization override:

```text
fa → /      → RTL → default
 en → /en/   → LTR
 ar → /ar/   → RTL
```

GSC and GTM are required from initial implementation. Public rendering must not synchronously depend on Odoo.

### 4.2 Current readiness

| Area | Current state |
|---|---|
| Cloudflare/Odoo target architecture | Strong and substantially aligned in newer architecture documents |
| Data ownership | Strong direction; specialist docs must remain aligned |
| RFQ resilience | Strong direction; durable D1 capture + async Odoo is established |
| Multilingual architecture | **Not consistently propagated through older documents** |
| Deployment documentation | **Contains stale Vercel material in repository entry documentation** |
| Claude Code reading order | **Does not yet reliably force `PROJECT_OVERRIDES.md` first** |
| SEO/QA localization | **Contains Persian-only acceptance language that conflicts with current override** |
| Full 77-document content audit | Not complete |

**Overall:** documentation is structurally strong but not ready for unrestricted Claude Code implementation until the P0 control conflicts below are fixed.

---

## 5. Confirmed Findings

### AUD-001 — README production hosting conflicts with approved Cloudflare architecture

- **Severity:** P0 — Critical
- **Status:** OPEN
- **Affected documents:** `README.md`, `CLAUDE.md`, `TECHNICAL_ARCHITECTURE.md`, `DEPLOYMENT_ARCHITECTURE.md`, `PROJECT_OVERRIDES.md`
- **Observed conflict:** `README.md` still describes Vercel as production hosting and Vercel-based preview/production deployment, while the newer implementation contract defines Cloudflare Workers as the approved hosting/backend platform.
- **Risk:** Claude Code can scaffold, configure, cache, deploy, or choose adapters for the wrong runtime.
- **Controlled decision:** Cloudflare-first production architecture is authoritative.
- **Required action:** Refresh `README.md` deployment and technology-baseline sections. Verify `DEPLOYMENT_ARCHITECTURE.md` is fully Cloudflare-aligned. Remove Vercel production instructions unless retained only as an explicitly approved non-production tool.
- **Closure evidence:** README, deployment spec, stack, and Claude contract all name the same production runtime and deployment path.

### AUD-002 — README still describes a Persian-only Phase 1

- **Severity:** P0 — Critical
- **Status:** OPEN
- **Affected documents:** `README.md`, `PROJECT_OVERRIDES.md`, `LOCALIZATION.md`, `ROUTES.md`, `HREFLANG_CANONICAL.md`
- **Observed conflict:** README states Phase 1 is Persian-only and that English/Arabic are future reserved locales. The current override requires exactly Persian, English, and Arabic.
- **Risk:** English/Arabic routes, content models, metadata, QA, and navigation may be omitted from the initial implementation.
- **Controlled decision:** `fa`, `en`, and `ar` are required; Persian is default and unprefixed.
- **Required action:** Update README launch scope or explicitly mark its Phase-1 locale text as superseded. Refresh localization/route specifications as part of the same documentation batch.
- **Closure evidence:** no active implementation-facing document describes English/Arabic as postponed unless a newer owner decision changes the override.

### AUD-003 — CLAUDE.md product truths still state Persian launch / RTL public interface

- **Severity:** P0 — Critical
- **Status:** OPEN
- **Affected documents:** `CLAUDE.md`, `PROJECT_OVERRIDES.md`
- **Observed conflict:** `CLAUDE.md` describes the launch language as Persian and the public interface as RTL. This is incomplete/incorrect for required English (`LTR`) and Arabic (`RTL`) public routes.
- **Risk:** This is especially dangerous because several older precedence chains place `CLAUDE.md` above ordinary specifications.
- **Controlled decision:** multilingual override controls the affected language/direction decisions.
- **Required action:** Update `CLAUDE.md` product truths and localization language. It must state `fa/en/ar`, default Persian, and per-locale direction.
- **Closure evidence:** CLAUDE product truths and required reading map match `PROJECT_OVERRIDES.md`.

### AUD-004 — CLAUDE.md does not include PROJECT_OVERRIDES.md in Always Read

- **Severity:** P0 — Critical
- **Status:** OPEN
- **Affected documents:** `CLAUDE.md`, `PROJECT_OVERRIDES.md`, `README.md`, `DOCS_INDEX.md`
- **Observed conflict:** the override file says Claude Code must consult it for affected project decisions, but the current mandatory `Always read` list does not include it.
- **Risk:** the agent can follow stale but otherwise valid older specifications without ever seeing the overrides.
- **Required action:** add `PROJECT_OVERRIDES.md` and `DOCS_INDEX.md` to the top of the mandatory reading protocol; add `DOCUMENT_AUDIT_REPORT.md` while the project is in pre-implementation audit state.
- **Closure evidence:** the repository-wide Claude contract visibly requires the override before specialist documents.

### AUD-005 — Source-of-truth precedence is not yet normalized around PROJECT_OVERRIDES.md

- **Severity:** P0 — Critical
- **Status:** OPEN
- **Affected documents:** `README.md`, `CLAUDE.md`, `DEVELOPMENT_RULES.md`, `PROJECT_BRIEF.md`, `STACK.md`, `PROJECT_OVERRIDES.md`
- **Observed conflict:** older documents define slightly different precedence orders, and several do not recognize `PROJECT_OVERRIDES.md` explicitly. The override file itself states it takes precedence for its listed decisions.
- **Risk:** two coding runs can make different choices from the same document set.
- **Required action:** normalize the precedence language in governance documents. The override must be scoped: it controls only decisions it explicitly lists; it must not silently replace unrelated specialist requirements.
- **Closure evidence:** README, CLAUDE, DEVELOPMENT_RULES, PROJECT_BRIEF, STACK, and DOCS_INDEX describe compatible precedence semantics.

### AUD-006 — README architecture says no public database/CMS while current architecture uses D1 CMS/read models

- **Severity:** P0 — Critical
- **Status:** OPEN
- **Affected documents:** `README.md`, `PROJECT_BRIEF.md`, `DATA_ARCHITECTURE.md`, `CMS_ARCHITECTURE.md`, `TECHNICAL_ARCHITECTURE.md`
- **Observed conflict:** an older README principle says not to introduce a public database or CMS in Phase 1 without a decision; newer approved architecture explicitly uses D1 for website data/read models and an internal CMS using D1/R2.
- **Risk:** Claude Code may omit required CMS/D1 infrastructure or attempt a repository-only content model inconsistent with the approved platform.
- **Required action:** update README architecture summary to the approved Cloudflare D1/R2/CMS model.
- **Closure evidence:** README no longer contradicts `CMS_ARCHITECTURE.md` and `DATA_ARCHITECTURE.md`.

### AUD-007 — PROJECT_BRIEF language/open-decision sections are stale relative to PROJECT_OVERRIDES.md

- **Severity:** P1 — Major
- **Status:** OPEN
- **Affected documents:** `PROJECT_BRIEF.md`, `PROJECT_OVERRIDES.md`
- **Observed conflict:** Project Brief still presents Persian as launch language and English/Arabic as future readiness/open language decisions, while the current override has already decided the three-language architecture.
- **Additional stale inputs:** contact channels and analytics are still listed as broad open decisions even though the override now supplies a phone/address and requires GTM/GSC; remaining unknowns still need to be separated from resolved items.
- **Required action:** either refresh the relevant Project Brief sections or annotate them as superseded by specific override changes. Close only what is actually decided; do not invent missing email, WhatsApp, legal or analytics IDs.

### AUD-008 — SEO_QA_CHECKLIST still contains Persian-only launch acceptance language

- **Severity:** P1 — Major
- **Status:** OPEN
- **Affected documents:** `SEO_QA_CHECKLIST.md`, `PROJECT_OVERRIDES.md`, `HREFLANG_CANONICAL.md`, `LOCALIZATION.md`
- **Observed conflict:** current SEO QA completion language refers to a Persian launch and absence of unsupported locales.
- **Risk:** English/Arabic may be treated as an SEO defect even though they are required.
- **Required action:** replace Persian-only release assumptions with three-locale checks, including direction, localized canonical, hreflang reciprocity, x-default, localized metadata, sitemap membership and non-indexing of missing/unapproved translations.

### AUD-009 — TECHNICAL_ARCHITECTURE definition of done is not yet multilingual-complete

- **Severity:** P1 — Major
- **Status:** OPEN
- **Affected documents:** `TECHNICAL_ARCHITECTURE.md`, `PROJECT_OVERRIDES.md`, `LOCALIZATION.md`
- **Observed issue:** current Definition of Done explicitly mentions Persian public routes but does not express equivalent acceptance requirements for English and Arabic.
- **Risk:** architecture can be declared complete with only Persian verified.
- **Required action:** generalize DoD to all approved locales and explicitly verify RTL/LTR behavior.

### AUD-010 — FOLDER_STRUCTURE documentation tree is stale

- **Severity:** P1 — Major
- **Status:** OPEN
- **Affected documents:** `FOLDER_STRUCTURE.md`, `DOCS_INDEX.md`
- **Observed issue:** the documented tree predates the new ERP/system-of-record/recovery/performance-budget documents and does not include the override/audit control layer.
- **Risk:** files may be scattered at root or placed inconsistently, making Claude Code discovery unreliable.
- **Required action:** define final canonical documentation placement and update the structure once, before repository handoff.

### AUD-011 — README documentation index is incomplete for the current 77-document set

- **Severity:** P1 — Major
- **Status:** OPEN
- **Affected documents:** `README.md`, `DOCS_INDEX.md`
- **Observed issue:** README's historical index does not represent the full later commercial-platform/Odoo control set.
- **Required action:** make `DOCS_INDEX.md` the canonical detailed index. README should link to it instead of duplicating a long list that will become stale again.

### AUD-012 — DATA_ARCHITECTURE duplicate filename risk

- **Severity:** P2 — Minor
- **Status:** VERIFY IN REPOSITORY
- **Affected files:** `DATA_ARCHITECTURE.md`, observed library copy `DATA_ARCHITECTURE(1).md`
- **Observed issue:** a retrieved copy is named `DATA_ARCHITECTURE(1).md` while its content declares itself `DATA_ARCHITECTURE.md`.
- **Risk:** Claude Code may read or edit the wrong copy if both exist in the Git repository.
- **Required action:** verify repository filesystem. Keep one canonical file at the path referenced by all other documents.

### AUD-013 — Odoo version/API/mapping remains an intentional discovery gate

- **Severity:** P3 — Note / Decision Gate
- **Status:** DECISION REQUIRED
- **Affected documents:** `ODOO_INTEGRATION.md`, `ERP_DATA_MAPPING.md`, `STACK.md`, `PRODUCT_CATALOG_SPEC.md`, `PROJECT_BRIEF.md`
- **Observed state:** architecture correctly avoids hard-coding the final Odoo mapping before deployed version, edition, modules, custom fields, pricelists, and RFQ model are confirmed.
- **Required action:** preserve this as an implementation discovery gate. Do **not** convert Odoo 19 reference documentation into an assumption that the deployed server is Odoo 19.
- **Handoff rule:** Cloudflare and domain architecture may proceed; provider-specific field mapping must wait for Odoo discovery.

### AUD-014 — GTM/GSC override must be propagated to analytics, environment and release docs

- **Severity:** P1 — Major
- **Status:** OPEN
- **Affected documents:** `ANALYTICS_TRACKING.md`, `ENVIRONMENT_VARIABLES.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md`, `SEO_QA_CHECKLIST.md`, `PROJECT_OVERRIDES.md`
- **Observed decision:** GTM and GSC are required from the initial implementation, while actual identifiers may be provided later.
- **Required action:** verify that GTM configuration is environment-driven, consent/privacy-safe, performance-conscious, and that post-deploy checks include live GTM events and GSC/sitemap setup where credentials/ownership permit.
- **Do not invent:** GTM container ID, GA4 property ID, Search Console ownership credentials, consent policy, or production account names.

### AUD-015 — Multilingual requirements must propagate into CMS, RFQ, forms and content status

- **Severity:** P1 — Major
- **Status:** OPEN
- **Affected documents:** `CMS_ARCHITECTURE.md`, `CONTENT_MODEL.md`, `FORM_ARCHITECTURE.md`, `RFQ_SYSTEM.md`, `DATABASE_SCHEMA.md`, `LOCALIZATION.md`, `PROJECT_OVERRIDES.md`
- **Observed decision:** editors must manage `fa/en/ar`; missing translations must not silently create low-quality indexable pages; RFQ must preserve visitor locale.
- **Required action:** confirm translation state, publication/index rules, locale field persistence, localized validation/confirmation messages, and safe fallback behavior across these documents.

---

## 6. Cross-Document Audit Matrix

The following matrix defines the remaining audit work. `PENDING` does not mean defective; it means the current cycle has not yet fully verified that document against all of its dependencies.

| Audit group | Core documents | Current result |
|---|---|---|
| Governance / precedence | `PROJECT_OVERRIDES.md`, `CLAUDE.md`, `README.md`, `DEVELOPMENT_RULES.md`, `DECISIONS.md`, `TASKS.md` | **FAIL — P0 conflicts open** |
| Product / scope | `PROJECT_BRIEF.md`, brand/design docs | **PARTIAL — major override propagation pending** |
| Pages / routing | `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, `ROUTES.md`, page specs | PENDING |
| Content / media | content model, copy, CTA, media | PENDING |
| Catalog / pricing / RFQ | catalog, pricing, RFQ, database, admin, roles | PARTIAL |
| Odoo / system of record | Odoo, mapping, sync, failure, APIs | PARTIAL — architecture strong, discovery gates remain |
| SEO | strategy, keyword/page map, metadata, schema, links, redirects, sitemap/robots | PARTIAL — multilingual refresh required |
| Localization | localization, locale content, hreflang/canonical | **PENDING — P0/P1 priority** |
| Analytics | analytics, GTM, forms, privacy | PENDING — GTM override must propagate |
| Performance / cache | budget, guidelines, images, fonts, caching | PARTIAL — architecture direction strong |
| Security | security, auth, private files, secrets | PENDING |
| Testing / QA | testing, QA, SEO QA, responsive, accessibility | PARTIAL — multilingual criteria stale |
| Deployment / release | deployment, env vars, pre/post deploy | PARTIAL — README deployment conflict open |

---

## 7. Required Documentation-Fix Order

To minimize token use and rework, resolve documents in this order rather than rewriting all 77 files at once:

### Batch A — P0 control layer

1. `CLAUDE.md`
2. `README.md`
3. `DEVELOPMENT_RULES.md`
4. `PROJECT_BRIEF.md`
5. `DECISIONS.md`
6. `DOCS_INDEX.md`

Goal: one unambiguous precedence model, Cloudflare production baseline, and multilingual launch scope.

### Batch B — Localization / SEO propagation

1. `LOCALIZATION.md`
2. `LOCALE_CONTENT_STRUCTURE.md`
3. `HREFLANG_CANONICAL.md`
4. `ROUTES.md`
5. `METADATA_SPEC.md`
6. `SITEMAP_ROBOTS_SPEC.md`
7. `SEO_STRATEGY.md`
8. `SEO_PAGE_MAP.md`
9. `SEO_KEYWORD_MAP.md`
10. `SEO_QA_CHECKLIST.md`

Goal: consistent `fa/en/ar` routing, content, canonicalization, hreflang and indexing rules.

### Batch C — CMS / RFQ / analytics propagation

1. `CMS_ARCHITECTURE.md`
2. `CONTENT_MODEL.md`
3. `DATABASE_SCHEMA.md`
4. `RFQ_SYSTEM.md`
5. `FORM_ARCHITECTURE.md`
6. `ANALYTICS_TRACKING.md`
7. `ENVIRONMENT_VARIABLES.md`

Goal: translation status, visitor locale persistence, GTM configuration, localized form behavior and no accidental machine-generated index pages.

### Batch D — Acceptance / release layer

1. `TECHNICAL_ARCHITECTURE.md`
2. `TESTING_STRATEGY.md`
3. `QA_CHECKLIST.md`
4. `ACCESSIBILITY_QA.md`
5. `RESPONSIVE_QA.md`
6. `PRE_DEPLOY_CHECKLIST.md`
7. `POST_DEPLOY_CHECKLIST.md`
8. `DEPLOYMENT_ARCHITECTURE.md`

Goal: release gates verify the same architecture and locales that the implementation is required to build.

### Batch E — Final cross-check

Audit all remaining specialist documents for contradictions, broken references and stale assumptions. Do not rewrite documents that are already consistent.

---

## 8. Claude Code Handoff Checklist

- [ ] All P0 findings are `RESOLVED` or explicitly accepted by the owner.
- [ ] `PROJECT_OVERRIDES.md` is first in Claude Code's mandatory reading order.
- [ ] `CLAUDE.md` states the current `fa/en/ar` language and direction model.
- [ ] README no longer tells contributors to deploy production to Vercel.
- [ ] README no longer describes English/Arabic as future-only.
- [ ] README no longer contradicts the approved D1/R2/CMS architecture.
- [ ] `DOCS_INDEX.md` is present and referenced by README/CLAUDE.
- [ ] `DECISIONS.md` contains or references all material final architecture choices.
- [ ] One canonical copy exists for every controlled specification.
- [ ] `LOCALIZATION.md`, `ROUTES.md`, and `HREFLANG_CANONICAL.md` agree.
- [ ] SEO metadata/sitemap/robots/schema rules cover all approved locales.
- [ ] CMS and content models support localized publication status.
- [ ] RFQ persists the visitor locale and supports localized validation/confirmation.
- [ ] GTM configuration exists without inventing the final container ID.
- [ ] GSC is included in launch/post-deploy operations without inventing credentials.
- [ ] Cloudflare Workers, D1, R2, Queues, caching and deployment documents agree.
- [ ] Public rendering has no synchronous Odoo dependency.
- [ ] RFQ success occurs after durable website persistence, not Odoo response.
- [ ] Odoo model/API specifics remain gated by real environment discovery.
- [ ] Security, privacy, attachment and secret-management rules are consistent.
- [ ] Performance budget is enforced by relevant testing/release gates.
- [ ] Testing and QA verify `fa` RTL, `ar` RTL and `en` LTR behavior.
- [ ] Final cross-document audit has no unresolved critical contradiction.

---

## 9. Final Sign-Off Table

Complete this section only after the full controlled documentation set has been audited.

| Result | Count |
|---|---:|
| PASS | |
| PASS WITH OVERRIDE | |
| MINOR UPDATE | |
| MAJOR UPDATE | |
| BLOCKED BY DECISION | |
| MISSING / UNVERIFIED | |

### Open P0 findings

| ID | Area | Owner | Status | Required before handoff? |
|---|---|---|---|---|
| AUD-001 | Hosting/deployment | Documentation/Engineering | OPEN | Yes |
| AUD-002 | Launch locales | Product/Documentation | OPEN | Yes |
| AUD-003 | Claude product truths | Documentation | OPEN | Yes |
| AUD-004 | Mandatory reading | Documentation | OPEN | Yes |
| AUD-005 | Precedence | Product/Engineering | OPEN | Yes |
| AUD-006 | README architecture | Documentation/Engineering | OPEN | Yes |

### Approval

| Role | Decision | Date | Notes |
|---|---|---|---|
| Project owner | Pending | | |
| Documentation audit | No-Go | 2026-08-26 | P0 findings open |
| Architecture | Pending | | |
| SEO / localization | Pending | | |
| Claude Code handoff | No-Go | 2026-08-26 | Resolve P0 first |

---

## 10. Audit Maintenance Rule

When a finding is fixed:

1. update the affected source document(s);
2. change the finding status to `RESOLVED`;
3. record the verification evidence or commit/reference;
4. update the cross-document matrix;
5. update the sign-off counts only after the affected documents have been re-read;
6. do not delete historical P0/P1 findings — keep them as an audit trail.

New project-wide decisions should normally be recorded in `PROJECT_OVERRIDES.md` or `DECISIONS.md` first, then propagated in a controlled documentation refresh.

---

**Current audit decision:** **NO-GO for unrestricted full-site Claude Code implementation.**  
**Allowed next action:** resolve the P0 governance/architecture/localization control layer, then continue group-by-group audit.

---

**End of `DOCUMENT_AUDIT_REPORT.md`**
