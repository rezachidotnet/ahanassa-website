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
| `01-sources/ROUTES.md` | PARTIALLY OVERRIDDEN | Route contracts — `/fa` non-prefix rule stable, en/ar prefixes now required rather than future. **Unresolved route-naming conflicts, not locale-related:** `ROUTES.md`/`REDIRECTS.md` use `/request` as the canonical RFQ route while `SITEMAP.md`/`SEO_PAGE_MAP.md` use `/request-consultation`; `01-sources/INTERNAL_LINKING.md` §3.1 explicitly names this conflict and recommends `/request` as canonical with `/request-consultation` redirected — treat that as the resolution. A second, still-open naming conflict: `ROUTES.md` uses `/steel-products/[category-slug]` while catalog docs use `/steel/{category}/{product}`; no document has explicitly reconciled these against each other. In practice, `/products` and `/products/{slug}` are the actual implemented, live route pattern (inherited from this repository's own pre-existing pages, now real and DB_PUBLIC-backed — `docs/CATALOG_PUBLIC_ROUTES.md`, DAR-037) — neither of the two documented alternatives above. See `DOCUMENT_AUDIT_REPORT.md` DAR-016. |
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
| *(referenced but absent: `ODOO_INTEGRATION.md`)* | — | MISSING, partially superseded | Its intended contract is substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §14 and `01-sources/DATA_ARCHITECTURE(1).md` §20–§27. The RFQ-path protocol/version/model-mapping discovery gate is CLOSED — as of 2026-08-31 (`DOCUMENT_AUDIT_REPORT.md` DAR-041) the live RFQ sync target is the dedicated Odoo Public RFQ Intake API v1 (`docs/integrations/odoo/rfq-v1/`, `POST /api/v1/rfq`, `ahanassa.rfq`/`ahanassa.rfq.line`) — see `docs/ODOO_RFQ_API_INTEGRATION.md` below; the earlier direct-`crm.lead`-via-JSON-2 mapping this row used to describe (`lib/odoo/mapping.ts`, DAR-026) is now deprecated-in-place, kept only for historical readability. The catalog-path discovery gate is ALSO CLOSED — 2026-08-30 (`DOCUMENT_AUDIT_REPORT.md` DAR-034): a dedicated, deliberate Odoo Public Catalog API v1 (`docs/integrations/odoo/catalog-v1/`) is the sole authoritative integration boundary for catalog sync — see `lib/catalog/odoo-api-client.ts`. Pricing sync mapping remains open (explicitly out of scope of the RFQ, catalog, and RFQ-API-handoff integration passes). A dedicated `ODOO_INTEGRATION.md` document is still not authored; `docs/ODOO_RFQ_API_INTEGRATION.md` (RFQ) and `docs/integrations/odoo/catalog-v1/` + `lib/catalog/odoo-api-client.ts` (catalog) are the current sources of truth pending that. |
| `docs/ODOO_RFQ_API_INTEGRATION.md` | root (new) | ACTIVE | Canonical for the Website → Odoo RFQ API v1 handoff: `POST /api/v1/rfq` request/response contract, request mapping (quantity/UOM non-fabrication rules, the consent/country/city omissions and why), outbound idempotency-key construction, response/replay handling, the `rfqs.odoo_rfq_reference` column vs. the legacy `odoo_lead_id`, the Stage F error-classification table, the `verification_session` security boundary (deliberately unresolved persistence lifecycle), the customer-resolution privacy boundary, and the deprecated-in-place legacy `crm.lead` path. Implementation: `lib/odoo/rfq-api-types.ts`, `lib/odoo/rfq-payload-mapper.ts`, `lib/odoo/rfq-api-client.ts`, `lib/queue/consumer.ts`. Canonical Odoo-owned contract artifacts: `docs/integrations/odoo/rfq-v1/`. `DOCUMENT_AUDIT_REPORT.md` DAR-041. |
| *(referenced but absent: `SYSTEM_OF_RECORD.md`)* | — | MISSING | Substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §5 and `01-sources/DATA_ARCHITECTURE(1).md` §5 |
| *(referenced but absent: `SYNC_STRATEGY.md`)* | — | MISSING | Partially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §14.5/§16 and `01-sources/DATA_ARCHITECTURE(1).md` §24–§27; retry cadence/backoff specifics not fully specified anywhere |
| *(referenced but absent: `ERP_DATA_MAPPING.md`)* | — | MISSING | Provisional mapping table exists in `01-sources/TECHNICAL_ARCHITECTURE.md` §14.3 and `01-sources/DATA_ARCHITECTURE(1).md` §21, explicitly marked provisional pending Odoo module inspection |
| *(referenced but absent: `FAILURE_RECOVERY.md`)* | — | MISSING | Partially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §14.5/§23 and `01-sources/DATA_ARCHITECTURE(1).md` §27; no dedicated runbook document exists |
| *(referenced but absent: `PRICING_SYSTEM.md`)* | — | MISSING | Substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §11.2–§11.4 and `01-sources/DATA_ARCHITECTURE(1).md` §14 |
| *(referenced but absent: `RFQ_SYSTEM.md`)* | — | MISSING | Substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §12 and `01-sources/DATA_ARCHITECTURE(1).md` §15–§19; response codes and state machine already defined there. The Catalog-linked-item extension specifically is covered by `docs/CATALOG_RFQ_INTEGRATION.md` below; the multi-line form UX specifically is covered by `docs/RFQ_MULTI_ITEM_FORM.md` below; the Odoo delivery mechanism specifically is covered by `docs/ODOO_RFQ_API_INTEGRATION.md` above. |
| `docs/CATALOG_RFQ_INTEGRATION.md` | root (new) | ACTIVE | Canonical for Catalog → RFQ Variant Preselection: `product_variant_xid` as canonical identity, the Catalog→RFQ handoff URL, server-side DB_PUBLIC validation at submission time, SKU/label/spec snapshot fields, the UOM gap (Stage G, documented not invented), multi-item/custom-item coexistence, the DB_PUBLIC/DB_OPS boundary, and the Odoo integration boundary (unchanged). Implementation: `lib/rfq/catalog-preselection.ts`, `lib/catalog/editorial-repository.ts#resolveRfqCatalogVariant`, `lib/rfq/service.ts`, `lib/rfq/repository.ts`, `components/contact/enquiry-form.tsx`, `components/products/variant-spec-table.tsx`. `DOCUMENT_AUDIT_REPORT.md` DAR-039. Its own §10 "deliberately not built in this phase — a structured multi-line form" is now superseded by `docs/RFQ_MULTI_ITEM_FORM.md` below. |
| `docs/RFQ_MULTI_ITEM_FORM.md` | root (new) | ACTIVE | Canonical for the multi-line (1–20 item) RFQ/purchase-list form: data-driven row architecture, the Category→Product→Variant Catalog cascade (fed by the new `listRfqSelectableCatalogItems`, fetched once and shared), custom/free-text rows, Catalog→RFQ preselection now seeding row 1 of a full form, quantity+unit UI composed into the unchanged `quantityText` wire field, per-row validation UX, desktop table / mobile card rendering, the omitted attachment-upload boundary, and the unchanged Turnstile/backend contract. Implementation: `components/contact/enquiry-form.tsx`, `components/contact/rfq-item-row.tsx`, `lib/rfq/uom.ts`, `lib/rfq/catalog-selector.ts`, `lib/rfq/item-row-validation.ts`, `lib/catalog/editorial-repository.ts#listRfqSelectableCatalogItems`. `DOCUMENT_AUDIT_REPORT.md` DAR-043. |
| `docs/CATALOG_SYNC_OPERATIONS.md` | root (new) | ACTIVE | Canonical for the operational scheduled Catalog synchronization/reconciliation layer: incremental cadence (every 3h) and full reconciliation cadence (daily), the durable DB_PUBLIC watermark/state table, the empty/implausible-upstream safety guard added to `runFullCatalogSync`, the DB-backed concurrency lease, the three-way `scheduled()` Cron router, and the manual operator CLI. Implementation: `lib/catalog/scheduled-sync.ts`, `lib/catalog/sync-state-repository.ts`, `lib/catalog/sync-safety.ts`, `workers/entry.ts`, `wrangler.jsonc` (`triggers.crons`), `scripts/catalog-sync.ts`. Cron triggers are prepared in configuration only — not active until a Worker is actually deployed (Claude Deployment Stage 1). `DOCUMENT_AUDIT_REPORT.md` DAR-040. |
| *(referenced but absent: `PRODUCT_CATALOG_SPEC.md`)* | — | MISSING | Substantially covered by `01-sources/TECHNICAL_ARCHITECTURE.md` §11 and `01-sources/DATA_ARCHITECTURE(1).md` §10–§13 |
| `docs/CATALOG_EDITORIAL_PUBLICATION.md` | root (new) | ACTIVE | Canonical for the Website-owned editorial/publication workflow sitting between Odoo's real synced commercial catalog data (`DB_PUBLIC`) and any future public catalog page: ownership split, editorial state machine, the single publication-eligibility predicate, per-locale publication, slug architecture. Implementation: `lib/catalog/editorial.ts`, `lib/catalog/editorial-repository.ts`. `DOCUMENT_AUDIT_REPORT.md` DAR-036. The variant-vs-template SEO granularity question this document leaves open is answered by `docs/CATALOG_PUBLIC_ROUTES.md` below. |
| `docs/CATALOG_PUBLIC_ROUTES.md` | root (new) | ACTIVE | Canonical for the public Catalog route/SEO architecture: the hybrid template-primary model (13 real product-family pages as the primary indexable entity, 237 real variants shown as a spec table inside them, never as 237 independent pages), route/slug design, filters, the typed specification presenter, sitemap boundary. Implementation: `app/[locale]/products/**`, `app/sitemap.ts`, `lib/catalog/editorial-repository.ts` (public reads), `lib/catalog/catalog-filters.ts`, `lib/catalog/specification-presenter.ts`. `DOCUMENT_AUDIT_REPORT.md` DAR-037. |
| `docs/CATALOG_EDITORIAL_OPERATIONS.md` | root (new) | ACTIVE | Canonical for the internal, repo-local Catalog editorial operator CLI (`scripts/catalog-editorial.ts`) — commands, environment/production write safeguards, dry-run, the staging launch pilot (3 real templates selected/published on staging only), production-safety verification, and the live sync-preservation proof. Implementation: `scripts/catalog-editorial.ts`, `lib/catalog/editorial-cli.ts`, `scripts/pilot/`. Not an admin UI or authentication system — see the `ADMIN_PANEL_SPEC.md` row below, still unresolved. `DOCUMENT_AUDIT_REPORT.md` DAR-038. **Superseded for production specifically** by `docs/GO_LIVE_READINESS.md` §7, which used this same CLI to publish the first 3 real production templates. |
| `docs/GO_LIVE_READINESS.md` | root (new) | ACTIVE | Canonical readiness record for the pre-`ahanassa.com`-cutover phase: production Catalog editorial inventory/selection/publication (3 launch templates, 12 representative variants), the hreflang/canonical-URL/robots/structured-data SEO audit, the Catalog-filter conditional-narrowing fix, the RFQ form UX fixes, RFQ Launch UoM Contract Alignment, security/performance/Cron/Queue/DLQ verification, a read-only Git/Vercel lineage audit (§30 — Vercel's Git integration auto-deploys every pushed branch; Production tied to the separate, untouched legacy `main` holding-page lineage), and the final Go-Live gate verdict. **Final verdict (§30): `GO-LIVE READY`** — supersedes the `GO-LIVE BLOCKED` verdict recorded earlier in the same document (§28), which is preserved as historical record, not rewritten. Implementation touches `lib/catalog/`, `lib/metadata/`, `lib/rfq/`, `app/[locale]/products/**`, `app/[locale]/contact/page.tsx`, `components/contact/`, `components/products/`. `DOCUMENT_AUDIT_REPORT.md` DAR-045/DAR-048. |
| `docs/GO_LIVE_CUTOVER_RUNBOOK.md` | root (new) | ACTIVE — documented plan only, NOT executed | Canonical Stage 2 cutover plan (final deploy, Basic Auth removal, Turnstile real-domain allowlist, Worker custom-domain attachment, DNS change, www policy — corroborated by the legacy lineage's own identical decision, §6 — Vercel transition — now including the required Vercel Git-integration disconnection step before `main` is ever touched, §8 — post-cutover smoke tests, rollback triggers/commands, monitoring). `docs/GO_LIVE_READINESS.md` now reads `GO-LIVE READY` (§30) and the UOM/Inventory/Procurement gate has been reassessed as non-blocking for current Launch scope (`docs/UOM_INVENTORY_PROCUREMENT_GATE.md` §6) — this runbook remains unexecuted pending explicit owner authorization to proceed with Stage 2. |
| `docs/UOM_INVENTORY_PROCUREMENT_GATE.md` | root (new) | ACTIVE — PARTIALLY RESOLVED for current Launch scope, not implementable from this repository | Names and describes the Odoo-side unit/inventory/procurement reconciliation gate. §6 (2026-09-02): items 1–9 (customer-facing UOM policy, conversion existence, nominal-vs-actual-weight settlement) reassessed as substantively addressed by newly-confirmed Odoo production gates (Launch UOM Hardening/Dynamic Pricing Unit Basis/Settlement Dual-Sided Billing all `LIVE PASS`); items 10–19 (downstream Supplier/PO/receipt/billing/multi-supplier reconciliation) remain open Odoo/ERP documentation work but are non-blocking for the current RFQ-intake-only Launch flow. No Website code implements or resolves any of this. |
| `docs/RFQ_LAUNCH_UOM_ALIGNMENT.md` | root (new) | ACTIVE | Canonical for the Website RFQ Launch unit-of-measure policy, aligned against Odoo production `19.0.27.0.0`'s confirmed Launch contract (Rebar kg/ton/branch, Plate kg/ton/sheet, SHS kg/ton/meter, Custom kg/ton only; coil/bundle/piece deferred). Implementation: `lib/rfq/uom-policy.ts` (the one canonical policy), `lib/rfq/validation.ts`/`lib/rfq/service.ts` (two-layer server enforcement), `lib/odoo/rfq-payload-mapper.ts` (deterministic serialization via `rfq_items.unit_ref`, `inferOdooUomCode` now a historical-row-only fallback), `components/contact/rfq-item-row.tsx` (product-aware Unit selector, reset-on-product-change). `DOCUMENT_AUDIT_REPORT.md` DAR-046. Narrower in scope than, and distinct from, `docs/UOM_INVENTORY_PROCUREMENT_GATE.md` immediately above — this document covers only what Launch UoM code the Website may submit per line; the inventory/procurement gate covers everything downstream (Odoo-side conversion, PO/receipt/billing reconciliation) that this document does not touch. |
| *(referenced but absent: `ADMIN_PANEL_SPEC.md`)* | — | MISSING (partially narrowed) | Scope outline exists in `01-sources/PROJECT_BRIEF.md` §15 and `01-sources/TECHNICAL_ARCHITECTURE.md` §17; no detailed UI spec exists. A narrow, non-UI, CLI-only internal editorial operator surface now exists (`docs/CATALOG_EDITORIAL_OPERATIONS.md`, DAR-038) — deliberately not a browser admin panel, does not resolve this gap, but removes urgency for Catalog-editorial purposes specifically. |
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
| `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` | root (new) | ACTIVE | Canonical for Claude Deployment Stage 1 — the first real Cloudflare Worker deployment (`ahanassa-production`, `workers.dev` only, no route/custom domain, `ahanassa.com` untouched): the `CLOUDFLARE_ENV`-at-build-time deploy-tooling gotcha, the temporary Basic Auth non-live-preview gate (TEMPORARY — see its own removal steps before cutover), Turnstile widget provisioning, secret provisioning sequence, bindings/Cron verification, Catalog/security/SEO runtime smoke tests, the one real synthetic RFQ E2E across two Odoo-side defects (both found, reported, and fixed on the Odoo side), and its successful recovery via the existing outbox mechanism (`odoo_rfq_reference = RFQ-2026-000005`, no duplicate, idempotency-replay proven). Implementation: `lib/security/preview-auth.ts`. `DOCUMENT_AUDIT_REPORT.md` DAR-042. Gate: PASS. |
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
