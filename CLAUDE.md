# CLAUDE.md — Ahan Asa Repository Operating Contract

> This is the repository-wide operating contract for Claude Code and other coding agents working on the Ahan Asa website. Read it completely before changing the repository.

---

## 1. Document Control

- **Project:** Ahan Asa | آهن آسا
- **Canonical production origin:** `https://www.ahanassa.com`
- **ERP origin:** `https://odoo.ahanassa.com`
- **Owner:** Cyan Sanat Iranian Co. LTD
- **Document role:** Root-level implementation entry point
- **Status:** Active — canonical control layer, project pre-implementation; homepage visual reference registered; customer account/portal future-phase architecture registered; release governance registered (§5b)
- **Version:** 1.3.0
- **Last updated:** 2026-09-22

---

## 2. Documentation Precedence System

This repository's documentation exists in three active authority levels:

```text
PROJECT_OVERRIDES.md               ← highest authority for owner-confirmed decisions
CLAUDE.md                           ← current implementation/control instructions
01-sources/                         ← consolidated current specialist documentation corpus
verified implementation facts        ← package/config/code facts, used only to verify docs
```

`02-sources/` and `03-sources/` are not active source layers anymore. References to them in older audit/history text are **HISTORICAL / SUPERSEDED** and must not be used as current implementation authority.

Immutable reference assets:

```text
01-sources/
logo/
design-reference/homepage-desktop-v1.png   ← strictly immutable, historical only (§5a)
```

`design-reference/v0-approved/` is a **maintained visual baseline**, not a strictly immutable historical asset — see §5a. It may only be updated by recapturing screenshots after an owner-approved visual change, per `design-reference/v0-approved/README.md`; it must not be edited or deleted during unrelated implementation work.

The active reading order is:

```text
PROJECT_OVERRIDES.md
    ↓
CLAUDE.md
    ↓
01-sources/
    ↓
verified implementation facts
```

When a statement inside `01-sources/` conflicts with `PROJECT_OVERRIDES.md` or this file, the root control layer wins. When a statement inside `01-sources/` conflicts with verified implementation facts about the confirmed Cloudflare Workers + vinext + Vite + TypeScript runtime, treat the stale statement as superseded and record the documentation drift rather than implementing obsolete architecture.

**`01-sources/`, `logo/`, and `design-reference/homepage-desktop-v1.png` are immutable for implementation work.** Do not edit, move, or delete anything inside `01-sources/` or `logo/`, or the historical PNG itself, unless the task is explicitly a controlled documentation cleanup. `design-reference/v0-approved/` follows the maintained-baseline rule above instead. For normal implementation tasks, when a document in `01-sources/` is stale, apply the root override and record the conflict in `DOCUMENT_AUDIT_REPORT.md`.

**The four root files are the compact control layer.** They exist so Claude Code does not have to re-read and re-reconcile ~87 historical documents on every task. `DOCS_INDEX.md` tells you which specialist document actually governs a given task and what layer/status it has; go read that document directly. Do not treat the existence of this control layer as permission to skip reading the specialist source document a task actually needs.

---

## 3. Mandatory Reading Order

1. `PROJECT_OVERRIDES.md` — the highest-authority cross-project decisions; read first, always.
2. `CLAUDE.md` — this file.
3. `DOCS_INDEX.md` — identifies which specialist source document(s), and which layer, govern the task at hand.
4. `01-sources/DO_NOT_CHANGE.md` — protected assets/decisions. **Read §9 and §16 through `PROJECT_OVERRIDES.md` §1–§3 first** — those two sections predate the multilingual and Cloudflare/D1/CMS overrides and will misfire as blockers if read in isolation; see `DOCUMENT_AUDIT_REPORT.md` DAR-014. Every other protection in the document is fully active.
5. `DOCUMENT_AUDIT_REPORT.md` — check for an unresolved finding affecting the task before proceeding.
6. The specialist document(s) in `01-sources/` that `DOCS_INDEX.md` points to.

Do not read the full `01-sources/` tree mechanically for a narrow task. Do not treat a document as stale by default — most of the consolidated corpus is active. Staleness is a property of specific subjects that conflict with the root control layer or verified implementation facts.

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
  D1 (DB_OPS + DB_PUBLIC), Queues + DLQ, Odoo adapter — built, staging+production provisioned
  (not yet built: R2, scheduled catalog sync, public catalog pages)
```

- **Framework/adapter:** `vinext` + `@vinext/cloudflare`, driven by Vite (`@cloudflare/vite-plugin`, `@vitejs/plugin-rsc`). This is confirmed by the live scaffold, not merely preferred — see `PROJECT_OVERRIDES.md` §2 for why it supersedes older `@opennextjs/cloudflare` guidance.
- **Deployment:** `wrangler` (`^4.126.0`), `wrangler.jsonc` declares `assets`, `images`, `cache`, `d1_databases` (`DB_OPS`, `DB_PUBLIC`), `queues`, and `ratelimits` bindings for `env.staging`/`env.production`; R2 bindings are not yet added.
- **Do not** introduce Vercel, `@opennextjs/cloudflare`, or `@cloudflare/next-on-pages` — all three are explicitly superseded (`PROJECT_OVERRIDES.md` §2).
- **Current architecture, built and provisioned in both staging and production:** D1 (`DB_OPS` — RFQ/contacts/integration; `DB_PUBLIC` — Website Catalog read model, `DOCUMENT_AUDIT_REPORT.md` DAR-035), Queues + DLQ (RFQ→Odoo sync), a server-only Odoo adapter (RFQ path via JSON-2 RPC; catalog sync via the dedicated Odoo Public Catalog API v1, `docs/integrations/odoo/catalog-v1/` — never the same generic-ORM transport). **Not yet built:** R2 (public media + private RFQ attachments), a scheduled catalog sync trigger, public catalog pages/RFQ catalog-selector wiring. Full detail: `01-sources/TECHNICAL_ARCHITECTURE.md`, `01-sources/DATABASE_SCHEMA.md`.

**System of record:** Odoo owns commercial truth (customers, CRM, products/variants/UOM, prices, quotations, sales). The website owns presentation, SEO, and RFQ intake. Public rendering must never synchronously depend on Odoo. An accepted RFQ must be durably persisted in D1 before Odoo sync — Odoo downtime must never lose a lead. Full detail: `PROJECT_OVERRIDES.md` §3, `01-sources/TECHNICAL_ARCHITECTURE.md` §5–§14.

---

## 5a. Homepage/Site Visual Reference — mandatory before visual work

**Status update, 2026-08-28 (owner decision — see `PROJECT_OVERRIDES.md` §8b and `DOCUMENT_AUDIT_REPORT.md` DAR-021/DAR-022): the v0-derived visual direction is approved and now frozen inside this repository. The authoritative visual/UI reference is the current canonical implementation in this repository (`app/`, `components/`), together with the version-controlled screenshot baseline at `design-reference/v0-approved/`. This supersedes `/design-reference/homepage-desktop-v1.png` as the homepage's visual authority.**

**The external directory `ahanassa-v0` (historically at `/Users/reza/Developer/ahanassa-v0`) is no longer required to exist and must not be treated as a dependency by any future task.** It was the original design-input project the approved visual direction was migrated from (migration commits `0d07d0b` and `b1d0841`), then frozen as a portable baseline inside this repository — see `design-reference/v0-approved/README.md` for the exact freeze commit. Do not instruct a future Claude/Codex session to go read that external path; it may not exist in that environment. If a task needs to see what the approved direction looks like, read the current implementation in this repository and/or the screenshots in `design-reference/v0-approved/`.

**Before implementing or materially modifying any public-facing page, Claude Code must inspect:**

1. the current canonical implementation of the closest equivalent existing page (`app/[locale]/**/page.tsx` and the components it composes) — this is the live, authoritative visual source; and
2. `design-reference/v0-approved/` for the intended reference appearance when building something genuinely new that has no close existing equivalent, or when checking for visual regression.

`/design-reference/homepage-desktop-v1.png` is **historical/reference material only**. Do not use it as a visual target, do not force the site back toward its composition when it conflicts with the current implementation, and do not delete it — it stays as project history (immutability rule in §2 above still applies to that file).

Visual implementation must be governed by **both**:

1. the current canonical implementation / `design-reference/v0-approved/` — for visual appearance; and
2. the canonical functional/content specifications (`01-sources/HOMEPAGE_SPEC.md`, `01-sources/CONTENT_STRATEGY.md`, `01-sources/CTA_STRATEGY.md`, SEO/localization/accessibility/performance/data specs per `DOCS_INDEX.md`) — for content, routing, SEO, accessibility, semantics, localization, performance, functionality, data architecture, RFQ behavior, and Odoo integration.

Visual appearance never overrides the functional specifications, and the functional specifications never override the approved visual direction, within their respective domains. Concretely: the current implementation's layout, spacing, section rhythm, card/border/typography/color/button/interaction treatment is authoritative; company facts, statistics, contact details, product/catalog data, and business claims remain governed exclusively by canonical documentation — see `PROJECT_OVERRIDES.md` §10 and `DOCUMENT_AUDIT_REPORT.md` DAR-020 for what was already found fabricated in the original v0 source and must never be reintroduced regardless of what any future screenshot or external reference shows.

A screenshot in `design-reference/v0-approved/` differing from the live site because of a legitimate, approved content/data change (copy edits, real catalog data replacing sample data, translation updates) is **not** a visual regression by itself — see that directory's `README.md` for what does and does not count as one. Do not hardcode CSS to match screenshot pixel dimensions; the production implementation remains responsive.

Responsive adaptation, and technical adaptations required for accessibility, Core Web Vitals, semantic markup, SEO, browser compatibility, or fa/en/ar content-length/RTL differences, are expected and must preserve — not replace — the approved visual direction.

---

## 5b. Release Governance — mandatory before staging/production release work

**Lifecycle state: `BOOTSTRAP_REGISTERED`** (`docs/release/RELEASE_POLICY.md` §0) — registered by `POLICY_BOOTSTRAP` (2026-09-22), PR open, not yet merged, not yet wired into release-time workflows. `docs/release/RELEASE_POLICY.md` is the authoritative human policy; `lib/ci/release-risk-classifier.ts`, `lib/ci/release-ledger.ts`, `lib/ci/emergency-rollback.ts`, and `lib/ci/policy-bootstrap.ts` implement the classification/ledger/rollback **engine** (`POLICY_ENGINE_IMPLEMENTED: YES`) — this is not yet the same as **release-time enforcement** (`RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: NO`; no workflow invokes it yet — `RELEASE_POLICY.md` §0.1). This section governs planning or executing any staging or production release, promotion, or emergency rollback of the website — it does not govern Odoo server/module deployment (`docs/release/RELEASE_POLICY.md` §1/§18).

**Before planning or executing a staging/production release, Claude Code MUST:**

1. Read `docs/release/RELEASE_POLICY.md` in full.
2. Resolve `BASE_PRODUCTION_SHA` from the authoritative ledger (`docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`'s "Ledger (RELEASE_POLICY.md schema)" table) — never from `main`, branch `HEAD`, the latest staging SHA, the latest commit, or the active canary's SHA.
3. Compute the diff `BASE_PRODUCTION_SHA..CANDIDATE_SHA`.
4. Classify risk deterministically (LOW/MEDIUM/HIGH per `RELEASE_POLICY.md` §5–§10, or `AMBIGUOUS`/`CLASSIFICATION_REQUIRED`).
5. State the classification evidence (triggers, changed files, declared vs. computed risk).
6. Follow the release path for the resulting `FINAL_RISK` — canary is required for HIGH only, never for LOW or MEDIUM (`RELEASE_POLICY.md` §5).
7. **STOP on ambiguity.** `CLASSIFICATION_REQUIRED` is not resolved by picking a class that "seems reasonable" — it is resolved by the operator, or by amending `RELEASE_POLICY.md` itself (a `HIGH_RELEASE_PATHS` change).

**Claude Code MUST NOT:**

- classify release risk from memory or by reading the diff's content/commit-message wording — classification is path-based only (`RELEASE_POLICY.md` §18)
- treat `main` as a production baseline — `main` and the real application branch have unrelated histories (`docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`); it exists only so GitHub Actions can discover `workflow_dispatch` workflow files
- downgrade a machine-computed risk level — `FINAL_RISK = max(DECLARED_RISK, COMPUTED_MINIMUM_RISK)`, never less
- assume every release requires a canary — LOW and MEDIUM explicitly do not (`RELEASE_POLICY.md` §5); this is deliberate, not an oversight
- skip a required HIGH-release canary, or bypass staging provenance
- weaken GitHub Environment protection (reviewer gates, deployment branch policy) to work around a release-path requirement
- treat `CLAUDE.md`, `PROJECT_OVERRIDES.md`, `DOCS_INDEX.md`, `DOCUMENT_AUDIT_REPORT.md`, `01-sources/**`, `docs/release/RELEASE_POLICY.md`, or `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` as LOW-risk documentation — every one is an explicit HIGH trigger
- execute an emergency rollback to a target that is not already a recorded, validated Worker Version ID in the release ledger (`RELEASE_POLICY.md` §13)
- dispatch a production deploy, promotion, or rollback without the user's explicit, current-turn authorization — this section describes the governance process, it does not itself authorize a production mutation

---

## 6. Task-to-Document Reading Map

Use `DOCS_INDEX.md` for the authoritative, per-document version of this table (it also lists layer and status). Quick reference:

| Task area | Consult |
| --- | --- |
| Architecture / stack / dependencies | `PROJECT_OVERRIDES.md` §2, `01-sources/TECHNICAL_ARCHITECTURE.md`, `01-sources/STACK.md` (adapter section superseded), `01-sources/FOLDER_STRUCTURE.md`, `01-sources/COMPONENT_ARCHITECTURE.md`, `01-sources/CODING_STANDARDS.md` |
| Database / schema | `01-sources/DATABASE_SCHEMA.md`, `01-sources/DATA_ARCHITECTURE(1).md` |
| Odoo / RFQ / commercial | `01-sources/TECHNICAL_ARCHITECTURE.md` §12–§14, `01-sources/DATABASE_SCHEMA.md` §6.1, `01-sources/PROJECT_BRIEF.md` §11–§14 (dedicated `ODOO_INTEGRATION.md`/`RFQ_SYSTEM.md`/`SYSTEM_OF_RECORD.md` are referenced but do not exist yet — treat as a discovery/authoring gap, see `DOCUMENT_AUDIT_REPORT.md`). Odoo's role is owner-confirmed; version/modules/protocol/mapping are not — `PROJECT_OVERRIDES.md` §3. |
| Public catalog / pricing | **Owner-confirmed in scope**, `PROJECT_OVERRIDES.md` §4 — `01-sources/TECHNICAL_ARCHITECTURE.md` §11, `01-sources/DATABASE_SCHEMA.md` catalog/price tables, `01-sources/METADATA_SPEC.md`/`STRUCTURED_DATA.md` (catalog/price metadata). Catalog sync is now real — `docs/integrations/odoo/catalog-v1/` (the Odoo Public Catalog API v1 contract) is the sole authoritative catalog integration boundary; never read Odoo PostgreSQL or generic ORM models for catalog data — see `DOCUMENT_AUDIT_REPORT.md` DAR-034, `lib/catalog/`. Route-naming (`/steel-products` vs `/steel`) still open — `DOCUMENT_AUDIT_REPORT.md` DAR-016. Never fetch price data synchronously from Odoo for public rendering; pricing sync remains unimplemented. |
| Customer account / portal / auth (future-phase, not yet authorized to implement) | **Owner-confirmed future architecture only**, `PROJECT_OVERRIDES.md` §13 — `01-sources/CUSTOMER_ACCOUNT_ARCHITECTURE.md`, `01-sources/CUSTOMER_PORTAL.md`, `01-sources/DECISIONS.md` ADR-017. Guest RFQ requires no account, permanently. No authentication provider is selected. Building the portal or account UI/API still requires a separate future implementation approval — `01-sources/PROJECT_BRIEF.md` §25, ADR-002 remain the active Phase 1 scope. |
| Brand / visual design | `01-sources/BRAND_GUIDELINES.md`, `01-sources/DESIGN_DIRECTION.md`, `01-sources/DESIGN_SYSTEM.md`, `01-sources/UI_COMPONENTS.md`, `01-sources/MOTION_GUIDELINES.md` — all uncontested, still active |
| Pages / navigation / IA | `01-sources/SITEMAP.md`, `01-sources/INFORMATION_ARCHITECTURE.md`, `01-sources/ROUTES.md`, `01-sources/PAGE_SPECIFICATIONS.md`, `01-sources/HOMEPAGE_SPEC.md`, `01-sources/HEADER_NAVIGATION_SPEC.md`, `01-sources/FOOTER_SPEC.md` — active, but locale scope must be read through `PROJECT_OVERRIDES.md` §1 |
| Homepage/site (visual implementation) | **Mandatory:** the current canonical implementation (`app/`, `components/`) plus `design-reference/v0-approved/` (visual composition/layout/typography/color/CTA placement — owner-approved authority, frozen 2026-08-28) **plus** `01-sources/HOMEPAGE_SPEC.md` (content/functional contract). See `CLAUDE.md` §5a and `PROJECT_OVERRIDES.md` §8b. The external `ahanassa-v0` project is no longer required. `/design-reference/homepage-desktop-v1.png` is historical only — do not implement from it or from the textual spec's visual description where either conflicts with the approved implementation. |
| Content / copy / media | `01-sources/CONTENT_STRATEGY.md`, `01-sources/CONTENT_MODEL.md`, `01-sources/COPY_GUIDELINES.md`, `01-sources/CTA_STRATEGY.md`, `01-sources/MEDIA_GUIDELINES.md` — active |
| SEO / metadata / structured data | `01-sources/METADATA_SPEC.md`, `01-sources/STRUCTURED_DATA.md`, `01-sources/INTERNAL_LINKING.md`, `01-sources/SITEMAP_ROBOTS_SPEC.md`, `01-sources/SEO_STRATEGY.md`, `01-sources/SEO_KEYWORD_MAP.md`, `01-sources/SEO_PAGE_MAP.md`, `01-sources/REDIRECTS.md`, `01-sources/HREFLANG_CANONICAL.md` |
| Localization | `01-sources/LOCALIZATION.md`, `01-sources/LOCALE_CONTENT_STRUCTURE.md` read through `PROJECT_OVERRIDES.md` §1 — these predate the fa/en/ar override and describe Persian-only |
| Performance / caching | `01-sources/PERFORMANCE_GUIDELINES.md`, `01-sources/IMAGE_OPTIMIZATION.md`, `01-sources/FONT_STRATEGY.md`, `01-sources/CACHING_STRATEGY.md` — stale Vercel cache mechanics are superseded by the Cloudflare Workers/vinext model in `01-sources/TECHNICAL_ARCHITECTURE.md` §18/§20 |
| Security | `01-sources/SECURITY_GUIDELINES.md` (Vercel-era hosting references superseded, control content otherwise active) |
| Deployment / environments | `01-sources/DEPLOYMENT_ARCHITECTURE.md`, `01-sources/ENVIRONMENT_VARIABLES.md` |
| Release governance / risk classification / production promotion / emergency rollback / CI-CD workflow changes | **Mandatory, see `CLAUDE.md` §5b:** `docs/release/RELEASE_POLICY.md` (authoritative policy, lifecycle state `BOOTSTRAP_REGISTERED`), `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` (the ledger), `lib/ci/release-risk-classifier.ts`, `lib/ci/release-ledger.ts`, `lib/ci/emergency-rollback.ts`, `lib/ci/policy-bootstrap.ts` (the policy **engine** — `POLICY_ENGINE_IMPLEMENTED: YES`; release-time enforcement is not yet wired into any workflow, `RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: NO` — `RELEASE_POLICY.md` §0.1) — supersedes `docs/release/CI_CD_POLICY.md`'s pre-production-automation description for anything the newer policy covers |
| Testing / QA / release gates | `01-sources/TESTING_STRATEGY.md`, `01-sources/QA_CHECKLIST.md`, `01-sources/SEO_QA_CHECKLIST.md`, `01-sources/RESPONSIVE_QA.md`, `01-sources/ACCESSIBILITY_QA.md`, `01-sources/PRE_DEPLOY_CHECKLIST.md`, `01-sources/POST_DEPLOY_CHECKLIST.md` |
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
5. The applicable source document(s) per `DOCS_INDEX.md`.
6. Development/coding conventions (`01-sources/DEVELOPMENT_RULES.md`, `01-sources/CODING_STANDARDS.md`).
7. Existing implementation patterns where they don't conflict with the above.

Never silently resolve a conflict in code. If a task hits a genuine unresolved conflict not already listed in `DOCUMENT_AUDIT_REPORT.md`, stop the affected work, record the finding there, and continue only with unaffected work.

---

## 9. Scope Discipline

- Stay within the requested scope; prefer the smallest coherent change.
- Do not opportunistically redesign, refactor, or migrate dependencies.
- Do not treat this documentation-reconciliation pass as license to start building website features or application code — it establishes the control layer only. See `DOCUMENT_AUDIT_REPORT.md` for the recommended next phase.
- Never edit `01-sources/`, `logo/`, or `design-reference/` during implementation work. Controlled documentation-cleanup tasks may update `01-sources/` only within the explicit cleanup scope.
- Update `PROJECT_OVERRIDES.md` only when the owner confirms a new cross-project decision. Update `DOCS_INDEX.md` when a document's status genuinely changes. Update `DOCUMENT_AUDIT_REPORT.md` when a finding is resolved or a new one is discovered.

---

## 10. Governing Principle

```text
PROJECT_OVERRIDES.md controls confirmed cross-project decisions.
CLAUDE.md controls how Claude Code operates in this repository.
DOCS_INDEX.md controls which source document governs a task, and at what layer.
DOCUMENT_AUDIT_REPORT.md controls known-conflict visibility.
01-sources is the consolidated current specialist corpus; `02-sources` and `03-sources` are historical/superseded names only.
Odoo controls commercial truth. Cloudflare (via vinext) controls the public application layer.
```

---

**End of `CLAUDE.md`**
