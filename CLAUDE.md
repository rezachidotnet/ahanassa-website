# CLAUDE.md — Ahan Asa Repository Operating Contract

> This is the repository-wide operating contract for Claude Code and other coding agents working on the Ahan Asa website. Read it completely before changing the repository.

---

## 1. Document Control

- **Project:** Ahan Asa | آهن آسا
- **Canonical production origin:** `https://www.ahanassa.com`
- **ERP origin:** `https://odoo.ahanassa.com`
- **Owner:** Cyan Sanat Iranian Co. LTD
- **Document role:** Root-level implementation entry point
- **Status:** Active — canonical control layer, project pre-implementation; homepage visual reference registered
- **Version:** 1.1.0
- **Last updated:** 2026-08-26

---

## 2. Documentation Precedence System

This repository's documentation exists in two layers:

```text
Repository root                    ← the canonical control layer (this file and 3 others)
  PROJECT_OVERRIDES.md
  CLAUDE.md                        (this file)
  DOCS_INDEX.md
  DOCUMENT_AUDIT_REPORT.md

01-sources/, 02-sources/,          ← immutable historical/project source material
03-sources/, logo/,                  (never edit these directories)
design-reference/
```

`01-sources/`, `02-sources/`, and `03-sources/` represent three chronological layers of project specification, each superseding matching content in the layers before it:

```text
03-sources  (newest overrides)
    ↓ overrides
02-sources  (newer overrides)
    ↓ overrides
01-sources  (original baseline)
```

**03 > 02 > 01.** When the same subject is covered in more than one layer, the newest layer's requirement wins — reconcile by *subject*, not filename (`DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, and `CMS_ARCHITECTURE.md` overlap in subject despite different names). Conflicting old and new requirements are never merged into a hybrid; the newest applicable requirement wins outright.

**These directories are immutable.** Do not edit, move, or delete anything inside `01-sources/`, `02-sources/`, `03-sources/`, `logo/`, or `design-reference/`. They are historical/reference record, not a place to "fix." When a document in one of these directories is stale, the fix is: apply the override at the root layer and record the conflict in `DOCUMENT_AUDIT_REPORT.md` — never edit the source file itself.

**The four root files are the compact control layer.** They exist so Claude Code does not have to re-read and re-reconcile ~87 historical documents on every task. `DOCS_INDEX.md` tells you which specialist document actually governs a given task and what layer/status it has; go read that document directly. Do not treat the existence of this control layer as permission to skip reading the specialist source document a task actually needs.

---

## 3. Mandatory Reading Order

1. `PROJECT_OVERRIDES.md` — the highest-authority cross-project decisions; read first, always.
2. `CLAUDE.md` — this file.
3. `DOCS_INDEX.md` — identifies which specialist source document(s), and which layer, govern the task at hand.
4. `01-sources/DO_NOT_CHANGE.md` — protected assets/decisions. **Read §9 and §16 through `PROJECT_OVERRIDES.md` §1–§3 first** — those two sections predate the multilingual and Cloudflare/D1/CMS overrides and will misfire as blockers if read in isolation; see `DOCUMENT_AUDIT_REPORT.md` DAR-014. Every other protection in the document is fully active.
5. `DOCUMENT_AUDIT_REPORT.md` — check for an unresolved finding affecting the task before proceeding.
6. The specialist document(s) `DOCS_INDEX.md` points to, applying `03 > 02 > 01` if more than one layer covers the subject.

Do not read the full `01/02/03-sources` tree mechanically for a narrow task. Do not treat a document found only in `01-sources` as stale by default — most of it is uncontested and remains the active specification for its subject (brand, design, UI, content, most page/SEO detail). Staleness is a property of specific subjects that a newer layer actually addressed, not of the folder a document happens to live in.

---

## 4. Core Directive

Act as the project's senior product engineer, Cloudflare architect, Odoo integration engineer, UI implementer, technical SEO owner, accessibility reviewer, security reviewer, and quality owner.

For every task:

1. Understand the requested outcome and its boundaries.
2. Read the mandatory control documents in the order above.
3. Use `DOCS_INDEX.md` to identify only the specialist source documents that materially govern the task, and at which layer.
4. Inspect the current repository, working tree, configuration, code, and existing patterns.
5. Identify affected contracts, data ownership, security boundaries, SEO surfaces, localization behavior, and failure modes.
6. Write a concise implementation plan for non-trivial work.
7. Make the smallest complete change that satisfies the applicable specification(s).
8. Add or update tests when behavior changes.
9. Run the strongest relevant validation available.
10. Report what changed, what was validated, and any genuine remaining risk.

Do not code from memory when a source document can answer the question. Do not invent business facts, contact data, credentials, Odoo fields, prices, or statistics — see `PROJECT_OVERRIDES.md` §10 for a list of facts that remain genuinely unconfirmed even after the 2026-08-26 owner sign-off. See `PROJECT_OVERRIDES.md` §11 for what is and isn't a blocker for Phase 1 foundation work.

---

## 5. Confirmed Current Architecture

This is what actually exists in the repository right now, verified directly against `package.json` and `wrangler.jsonc` — not aspirational:

```text
Visitor / Search engine
        ↓
   Cloudflare Edge
        ↓
Next.js App Router via vinext, on Cloudflare Workers + Static Assets
        ↓
  (scaffolded, not yet implemented: D1, R2, Queues, Odoo adapter)
```

- **Framework/adapter:** `vinext` + `@vinext/cloudflare`, driven by Vite (`@cloudflare/vite-plugin`, `@vitejs/plugin-rsc`). This is confirmed by the live scaffold, not merely preferred — see `PROJECT_OVERRIDES.md` §2 for why this overrides `02-sources/STACK.md`'s `@opennextjs/cloudflare` guidance.
- **Deployment:** `wrangler` (`^4.126.0`), `wrangler.jsonc` already declares `assets`, `images`, and `cache` bindings; D1/R2/Queues bindings are not yet added.
- **Do not** introduce Vercel, `@opennextjs/cloudflare`, or `@cloudflare/next-on-pages` — all three are explicitly superseded (`PROJECT_OVERRIDES.md` §2).
- **Target architecture** (not yet built): D1 (two databases — `DB_PUBLIC`, `DB_OPS`), R2 (public media + private RFQ attachments), Queues + DLQ, server-only Odoo adapter. Full detail: `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/DATABASE_SCHEMA.md`.

**System of record:** Odoo owns commercial truth (customers, CRM, products/variants/UOM, prices, quotations, sales). The website owns presentation, SEO, and RFQ intake. Public rendering must never synchronously depend on Odoo. An accepted RFQ must be durably persisted in D1 before Odoo sync — Odoo downtime must never lose a lead. Full detail: `PROJECT_OVERRIDES.md` §3, `02-sources/TECHNICAL_ARCHITECTURE.md` §5–§14.

---

## 5a. Homepage Visual Reference — mandatory before homepage work

**Before implementing or materially modifying the homepage, Claude Code must inspect `/design-reference/homepage-desktop-v1.png`.**

This image is the owner-approved visual source of truth for the desktop homepage — overall composition, section order/hierarchy, layout proportions, spacing rhythm, typography scale, color relationships, CTA placement, and visual density. It has higher authority than older textual design descriptions (`01-sources/DESIGN_DIRECTION.md`, `01-sources/HOMEPAGE_SPEC.md`, etc.) specifically where they conflict on homepage visual appearance. Full detail and precedence rule: `PROJECT_OVERRIDES.md` §8a.

Homepage implementation must be governed by **both**:

1. the approved visual reference (`/design-reference/homepage-desktop-v1.png`) — for visual appearance; and
2. the canonical functional/content specifications (`01-sources/HOMEPAGE_SPEC.md`, `01-sources/CONTENT_STRATEGY.md`, `01-sources/CTA_STRATEGY.md`, SEO/localization/accessibility/performance/data specs per `DOCS_INDEX.md`) — for content, routing, SEO, accessibility, semantics, localization, performance, functionality, data architecture, RFQ behavior, and Odoo integration.

The image never overrides the functional specifications, and the functional specifications never override the approved visual direction, within their respective domains.

Responsive adaptation (tablet, mobile, other viewports) and technical adaptations required for accessibility, Core Web Vitals, semantic markup, SEO, browser compatibility, or fa/en/ar content-length differences are expected and must preserve — not replace — the approved visual direction. Redesigning the homepage, inventing a different visual concept, changing section hierarchy without a documented functional reason, substituting a generic template, or reinterpreting the brand direction all require explicit owner approval first.

`/design-reference/` is immutable, same as `01-sources/`, `02-sources/`, `03-sources/`, and `/logo/` — never modify the reference image itself.

---

## 6. Task-to-Document Reading Map

Use `DOCS_INDEX.md` for the authoritative, per-document version of this table (it also lists layer and status). Quick reference:

| Task area | Consult |
| --- | --- |
| Architecture / stack / dependencies | `PROJECT_OVERRIDES.md` §2, `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/STACK.md` (adapter section superseded), `01-sources/FOLDER_STRUCTURE.md`, `01-sources/COMPONENT_ARCHITECTURE.md`, `01-sources/CODING_STANDARDS.md` |
| Database / schema | `02-sources/DATABASE_SCHEMA.md`, `02-sources/DATA_ARCHITECTURE(1).md` |
| Odoo / RFQ / commercial | `02-sources/TECHNICAL_ARCHITECTURE.md` §12–§14, `02-sources/DATABASE_SCHEMA.md` §6.1, `02-sources/PROJECT_BRIEF.md` §11–§14 (dedicated `ODOO_INTEGRATION.md`/`RFQ_SYSTEM.md`/`SYSTEM_OF_RECORD.md` are referenced but do not exist yet — treat as a discovery/authoring gap, see `DOCUMENT_AUDIT_REPORT.md`). Odoo's role is owner-confirmed; version/modules/protocol/mapping are not — `PROJECT_OVERRIDES.md` §3. |
| Public catalog / pricing | **Owner-confirmed in scope**, `PROJECT_OVERRIDES.md` §4 — `02-sources/TECHNICAL_ARCHITECTURE.md` §11, `02-sources/DATABASE_SCHEMA.md` catalog/price tables, `02-sources/METADATA_SPEC.md`/`STRUCTURED_DATA.md` (catalog/price metadata). Route-naming (`/steel-products` vs `/steel`) still open — `DOCUMENT_AUDIT_REPORT.md` DAR-016. Never fetch price data synchronously from Odoo for public rendering. |
| Brand / visual design | `01-sources/BRAND_GUIDELINES.md`, `01-sources/DESIGN_DIRECTION.md`, `01-sources/DESIGN_SYSTEM.md`, `01-sources/UI_COMPONENTS.md`, `01-sources/MOTION_GUIDELINES.md` — all uncontested, still active |
| Pages / navigation / IA | `01-sources/SITEMAP.md`, `01-sources/INFORMATION_ARCHITECTURE.md`, `01-sources/ROUTES.md`, `01-sources/PAGE_SPECIFICATIONS.md`, `01-sources/HOMEPAGE_SPEC.md`, `01-sources/HEADER_NAVIGATION_SPEC.md`, `01-sources/FOOTER_SPEC.md` — active, but locale scope must be read through `PROJECT_OVERRIDES.md` §1 |
| Homepage (visual implementation) | **Mandatory:** `/design-reference/homepage-desktop-v1.png` (visual composition/layout/typography/color/CTA placement — owner-approved authority) **plus** `01-sources/HOMEPAGE_SPEC.md` (content/functional contract). See `CLAUDE.md` §5a and `PROJECT_OVERRIDES.md` §8a. Do not implement from the textual spec's visual description alone where it conflicts with the image. |
| Content / copy / media | `01-sources/CONTENT_STRATEGY.md`, `01-sources/CONTENT_MODEL.md`, `01-sources/COPY_GUIDELINES.md`, `01-sources/CTA_STRATEGY.md`, `01-sources/MEDIA_GUIDELINES.md` — active |
| SEO / metadata / structured data | `02-sources/METADATA_SPEC.md`, `02-sources/STRUCTURED_DATA.md`, `02-sources/INTERNAL_LINKING.md`, `02-sources/SITEMAP_ROBOTS_SPEC.md` (locale scope superseded by `PROJECT_OVERRIDES.md` §1 — these still say Persian-only); `01-sources/SEO_STRATEGY.md`, `01-sources/SEO_KEYWORD_MAP.md`, `01-sources/SEO_PAGE_MAP.md`, `01-sources/REDIRECTS.md`, `01-sources/HREFLANG_CANONICAL.md` (uncontested) |
| Localization | `01-sources/LOCALIZATION.md`, `01-sources/LOCALE_CONTENT_STRUCTURE.md` read through `PROJECT_OVERRIDES.md` §1 — these predate the fa/en/ar override and describe Persian-only |
| Performance / caching | `01-sources/PERFORMANCE_GUIDELINES.md`, `01-sources/IMAGE_OPTIMIZATION.md`, `01-sources/FONT_STRATEGY.md`, `01-sources/CACHING_STRATEGY.md` — architecture-level detail superseded by Cloudflare/D1 model in `02-sources/TECHNICAL_ARCHITECTURE.md` §18/§20 |
| Security | `01-sources/SECURITY_GUIDELINES.md` (Vercel-era hosting references superseded, control content otherwise active) |
| Deployment / environments | `02-sources/DEPLOYMENT_ARCHITECTURE.md`, `02-sources/ENVIRONMENT_VARIABLES.md` — fully supersede the `01-sources` Vercel-era versions |
| Testing / QA / release gates | `02-sources/TESTING_STRATEGY.md`, `02-sources/QA_CHECKLIST.md`, `02-sources/SEO_QA_CHECKLIST.md` (locale-scope language still Persian-only, read through the override); `01-sources/RESPONSIVE_QA.md`, `01-sources/ACCESSIBILITY_QA.md`, `01-sources/PRE_DEPLOY_CHECKLIST.md`, `01-sources/POST_DEPLOY_CHECKLIST.md` — uncontested |
| Analytics | `01-sources/ANALYTICS_TRACKING.md` (provider still deferred per `01-sources/DECISIONS.md` OPEN-005); GTM/GSC requirement owner-confirmed in `PROJECT_OVERRIDES.md` §5 |

---

## 7. Product Truths (stable across every layer)

- Ahan Asa is a **premium B2B steel procurement and sourcing partner** — a professional purchasing manager, not a commodity marketplace, discount retailer, price board, or cart-first e-commerce store.
- Approved brand promise: **«ما مراقب سرمایه شما هستیم.»**
- Primary conversion: **ارسال فاکتور / لیست خرید** — invoice/BOM/material-list submission for professional review, not instant checkout.
- Flow: request submission → review/qualification → purchasing proposal → sourcing/delivery coordination.
- Never invent live prices, stock, supplier relationships, testimonials, case studies, certifications, or statistics without approved evidence.
- **Owner-confirmed, 2026-08-26 (`PROJECT_OVERRIDES.md` §4):** the site will include a public product catalog and public pricing. This does not reverse the "not a price board" positioning above — prices must be qualified, timestamped, sourced from the synchronized Cloudflare data layer (never a live Odoo call), and presented as part of the procurement-manager experience, not as a commodity-trading ticker or cart-first storefront.

---

## 8. Instruction Precedence

1. The project owner's latest explicit instruction.
2. Legal, security, privacy, and safety requirements.
3. `PROJECT_OVERRIDES.md`, for the decisions it explicitly covers.
4. This `CLAUDE.md`.
5. The applicable source document(s) per `DOCS_INDEX.md`, applying `03 > 02 > 01`.
6. Development/coding conventions (`01-sources/DEVELOPMENT_RULES.md`, `01-sources/CODING_STANDARDS.md`).
7. Existing implementation patterns where they don't conflict with the above.

Never silently resolve a conflict in code. If a task hits a genuine unresolved conflict not already listed in `DOCUMENT_AUDIT_REPORT.md`, stop the affected work, record the finding there, and continue only with unaffected work.

---

## 9. Scope Discipline

- Stay within the requested scope; prefer the smallest coherent change.
- Do not opportunistically redesign, refactor, or migrate dependencies.
- Do not treat this documentation-reconciliation pass as license to start building website features or application code — it establishes the control layer only. See `DOCUMENT_AUDIT_REPORT.md` for the recommended next phase.
- Never edit `01-sources/`, `02-sources/`, `03-sources/`, `logo/`, or `design-reference/`.
- Update `PROJECT_OVERRIDES.md` only when the owner confirms a new cross-project decision. Update `DOCS_INDEX.md` when a document's status genuinely changes. Update `DOCUMENT_AUDIT_REPORT.md` when a finding is resolved or a new one is discovered.

---

## 10. Governing Principle

```text
PROJECT_OVERRIDES.md controls confirmed cross-project decisions.
CLAUDE.md controls how Claude Code operates in this repository.
DOCS_INDEX.md controls which source document governs a task, and at what layer.
DOCUMENT_AUDIT_REPORT.md controls known-conflict visibility.
01-sources / 02-sources / 03-sources are immutable historical record — never edited, always the ultimate source of specialist detail.
Odoo controls commercial truth. Cloudflare (via vinext) controls the public application layer.
```

---

**End of `CLAUDE.md`**
