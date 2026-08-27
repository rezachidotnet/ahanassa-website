# Ahan Asa Website — Tasks, Backlog, and Delivery Plan

> Operational source of truth for implementing `ahanassa.com`. Claude Code must read this file together with `CLAUDE.md`, `DO_NOT_CHANGE.md`, and the specification files referenced by each task before changing the repository.

## 1. Document control

| Field | Value |
|---|---|
| Project | Ahan Asa Website |
| Brand | Ahan Asa / آهن آسا |
| Primary domain | `https://www.ahanassa.com` |
| ERP | `https://odoo.ahanassa.com` |
| Status | Architecture-ready; implementation backlog |
| Last updated | 2026-08-26 |
| Runtime target | Next.js App Router on Cloudflare Workers/Static Assets |
| Website data | Cloudflare D1 (`DB_PUBLIC`, `DB_OPS`) |
| Media and private files | Cloudflare R2 |
| Async integration | Cloudflare Queues, retries, and DLQ |

## 2. Product and architecture principles

- Position Ahan Asa as a trusted professional steel procurement manager, not a generic online shop or marketplace.
- Primary conversion is a complete purchase list or RFQ. Browsing the catalog supports confidence; it is not a prerequisite for submitting a lead.
- Persian and RTL are first-class requirements. The domain, canonical URLs, metadata, and public content must be production-ready for Persian search.
- The public website must render from a local read model and cache. A visitor must never wait for a live Odoo request to render an SEO page.
- Odoo is the commercial system of record. The website owns presentation, SEO content, editorial articles, RFQ UX, and public read projections.
- Every RFQ is durably saved before acknowledgement. Odoo synchronization is asynchronous, idempotent, retryable, observable, and recoverable.
- Keep Release 1 focused: no full marketplace, checkout, supplier marketplace, or unapproved customer-account scope.
- Performance, accessibility, security, privacy, and indexability are build constraints, not post-launch polish.
- Never invent unresolved commercial, legal, pricing, upload, authentication, or Odoo-module decisions. Track them as explicit decision gates.

## 3. System ownership

| Capability or data | System of record | Website responsibility |
|---|---|---|
| Customers / contacts | Odoo `res.partner` | Capture, consent, source/UTM, local sync state |
| Leads / opportunities | Odoo CRM | Persist RFQ, enqueue delivery, show receipt/status where approved |
| Commercial products and variants | Odoo | Project safe public catalog fields into D1 |
| Units of measure | Odoo | Project display labels and allowed RFQ units |
| Commercial prices and pricelists | Odoo | Cache public price projection and freshness metadata in D1 |
| Quotations, sales, inventory, purchasing, accounting | Odoo | Link to receipt/status only; no duplicate business ledger |
| Articles and SEO copy | Website CMS in D1 | Author, review, publish, version, preview, indexability |
| SEO overlays for products/categories | Website D1 | Slugs, titles, descriptions, buying guidance, internal links, schema inputs |
| Public media | R2 | Transform, resize, cache, and reference from content |
| Private RFQ attachments | R2 private bucket | Signed upload/download only; reference in Odoo when approved |
| Integration jobs and audit trails | D1 ops / Queue | Idempotency, retries, DLQ, reconciliation, alerts |

## 4. Status and task conventions

| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Completed and verified |
| `[!]` | Blocked |
| `[-]` | Cancelled or intentionally excluded |

| Priority | Meaning |
|---|---|
| `P0` | Release blocker or material data/security/integration risk |
| `P1` | Required for the first production release |
| `P2` | Important post-release improvement |
| `P3` | Optional future experiment |

```md
- [ ] TASK-ID — Task title `[P0]`
  - Depends on: TASK-ID or None
  - References: specification files
  - Acceptance: objective completion criteria
```

## 5. Release scope

### Release 1 — production foundation

- Premium Persian-first public website with approved responsive design.
- Cloudflare-hosted application/API boundary and production domain policy.
- Public pages rendered static-first or cached from D1 read models.
- Internal `/admin` for articles, SEO content, media, catalog projections, price freshness, RFQs, users, and audit history as approved.
- Customer RFQ builder with catalog items, category/size/unit/quantity, free-form “other item,” notes, and optional attachments.
- Durable RFQ receipt followed by asynchronous Odoo CRM/customer synchronization.
- Odoo-to-D1 catalog, unit, and public-price projection with sync status and freshness visibility.
- Technical SEO, structured data, sitemap/robots, analytics/consent, accessibility, security, and performance gates.

### Explicitly deferred unless approved

- Full e-commerce cart, checkout, online payment, or automated marketplace behavior.
- Customer accounts, password reset, or portal authentication.
- Real-time inventory promises or public supplier comparison.
- Direct browser-to-Odoo API calls.
- Unreviewed additional locales or country-specific pricing rules.
- Automated quotation calculation beyond the Odoo workflow.

## 6. Delivery gates

| Gate | Required outcome |
|---|---|
| G0 — Product approved | Audience, promise, conversion, scope, exclusions, and KPIs approved |
| G1 — Architecture approved | Ownership, boundaries, routes, schema, integrations, cache, and failure behavior approved |
| G2 — Design approved | Tokens, RTL behavior, components, key pages, forms, and states approved |
| G3 — Foundation complete | Cloudflare bindings, migrations, repositories, CI, and deployment path pass |
| G4 — Feature complete | CMS, catalog, pricing, RFQ, Odoo sync, and public pages pass acceptance |
| G5 — Release candidate | SEO, accessibility, privacy, security, performance, and content QA pass |
| G6 — Production verified | DNS, live forms, queues, sync, monitoring, indexing controls, and rollback verified |

---

## 7. Phase 0 — Governance and decisions

- [ ] GOV-001 — Approve project brief, audience, promise, and KPIs `[P0]`
  - Depends on: None
  - References: `PROJECT_BRIEF.md`, `CONTENT_STRATEGY.md`
  - Acceptance: primary audiences, buyer problems, “protect customer capital” promise, conversion events, and measurable launch KPIs are signed off.

- [ ] GOV-002 — Confirm brand source of truth `[P0]`
  - Depends on: GOV-001
  - References: `BRAND_GUIDELINES.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`
  - Acceptance: approved logo, current palette, typography, imagery, RTL rules, and prohibited visual patterns are documented in one authoritative location.

- [ ] GOV-003 — Establish repository and change-control rules `[P0]`
  - Depends on: GOV-001
  - References: `CLAUDE.md`, `DEVELOPMENT_RULES.md`, `CODING_STANDARDS.md`, `DO_NOT_CHANGE.md`
  - Acceptance: branch strategy, protected files, validation commands, review rules, and completion reporting are explicit.

- [ ] GOV-004 — Maintain decisions and changelog `[P1]`
  - Depends on: GOV-003
  - References: `DECISIONS.md`, `CHANGELOG.md`
  - Acceptance: architecture, Odoo, legal, pricing, auth, and scope decisions have owner, date, status, and rationale.

- [ ] GOV-005 — Confirm the Odoo integration contract `[P0]`
  - Depends on: GOV-004
  - References: `ODOO_INTEGRATION.md`, `ERP_DATA_MAPPING.md`, `SYSTEM_OF_RECORD.md`
  - Acceptance: Odoo version, enabled modules, API method, bot user, permitted models/fields, authentication, rate limits, and sandbox/production endpoints are confirmed. Unconfirmed items remain blocked.

### Phase 0 exit criteria

- [ ] G0 approved by the Project Owner.
- [ ] No unresolved P0 decision is hidden inside implementation tasks.

## 8. Phase 1 — Information architecture, content, and routes

- [ ] IA-001 — Approve sitemap and navigation hierarchy `[P0]`
  - Depends on: GOV-001
  - References: `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`
  - Acceptance: every Release 1 page has purpose, owner, audience, CTA, indexability, and content status.

- [ ] IA-002 — Define canonical route and URL policy `[P0]`
  - Depends on: IA-001
  - References: `ROUTES.md`, `REDIRECTS.md`, `HREFLANG_CANONICAL.md`
  - Acceptance: canonical host is `https://www.ahanassa.com`; apex/www, HTTP/HTTPS, slash, case, legacy, locale, and error behavior are specified.

- [ ] IA-003 — Define catalog, price, and article URL families `[P0]`
  - Depends on: IA-001
  - References: `PRODUCT_CATALOG_SPEC.md`, `PRICING_SYSTEM.md`, `SEO_PAGE_MAP.md`
  - Acceptance: category, product, size/variant, price, article, and filter URL rules distinguish indexable landing pages from filter-only URLs.

- [ ] IA-004 — Complete page specifications and content inventory `[P0]`
  - Depends on: IA-001
  - References: `PAGE_SPECIFICATIONS.md`, `HOMEPAGE_SPEC.md`, `CONTENT_MODEL.md`, `CONTENT_STRATEGY.md`
  - Acceptance: copy, media, proof, FAQ, legal text, metadata, schema inputs, and owner are tracked for each required page.

- [ ] IA-005 — Resolve locale scope and translation ownership `[P0]`
  - Depends on: IA-001
  - References: `LOCALIZATION.md`, `LOCALE_CONTENT_STRUCTURE.md`, `HREFLANG_CANONICAL.md`
  - Acceptance: Release 1 language(s), Persian default, RTL/LTR behavior, fallback, translation review, and localized metadata rules are approved.

- [ ] IA-006 — Define content lifecycle and editorial states `[P1]`
  - Depends on: IA-004
  - References: `CMS_ARCHITECTURE.md`, `ADMIN_PANEL_SPEC.md`
  - Acceptance: draft, review, scheduled, published, archived, preview, author, editor, and audit behavior are specified.

### Phase 1 exit criteria

- [ ] Sitemap, routes, content model, catalog URL policy, and locale scope are approved.
- [ ] All launch content gaps have an owner and due status.

## 9. Phase 2 — Technical architecture and Cloudflare foundation

- [ ] ARC-001 — Freeze system boundaries and source ownership `[P0]`
  - Depends on: GOV-005, IA-001
  - References: `TECHNICAL_ARCHITECTURE.md`, `SYSTEM_OF_RECORD.md`, `DATA_ARCHITECTURE.md`
  - Acceptance: Odoo commercial ownership, website editorial ownership, D1 read/ops separation, R2 bucket boundaries, and no-live-Odoo-rendering rule are documented.

- [ ] ARC-002 — Confirm Cloudflare runtime and deployment model `[P0]`
  - Depends on: ARC-001
  - References: `STACK.md`, `DEPLOYMENT_ARCHITECTURE.md`
  - Acceptance: Workers/Static Assets or Pages choice, build adapter, bindings, environments, custom domain, preview policy, rollback, and observability are verified. No Vercel dependency remains unless explicitly approved.

- [ ] ARC-003 — Define environment variables and secret ownership `[P0]`
  - Depends on: ARC-002
  - References: `ENVIRONMENT_VARIABLES.md`, `SECURITY_GUIDELINES.md`
  - Acceptance: production/preview variable names, bindings, owners, rotation, and safe defaults are documented; Odoo credentials never enter browser bundles or Git.

- [ ] ARC-004 — Define folder, module, and component boundaries `[P0]`
  - Depends on: ARC-002
  - References: `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`
  - Acceptance: public routes, admin routes, API handlers, repositories, Odoo adapter, queue consumers, content, tests, and shared UI locations are explicit.

- [ ] ARC-005 — Define rendering, caching, and invalidation policy `[P0]`
  - Depends on: ARC-001
  - References: `CACHING_STRATEGY.md`, `PERFORMANCE_GUIDELINES.md`
  - Acceptance: static/cached/dynamic behavior is assigned per route; public responses may cache; admin, RFQ, private, and authenticated responses never share public cache; product/price/article invalidation is defined.

- [ ] ARC-006 — Define failure, retry, and recovery behavior `[P0]`
  - Depends on: ARC-001
  - References: `SYNC_STRATEGY.md`, `FAILURE_RECOVERY.md`
  - Acceptance: timeout, retry/backoff, idempotency, DLQ, reconciliation, alerting, manual replay, and customer-facing fallback are specified.

- [ ] ARC-007 — Configure repository, CI, and frozen-lockfile checks `[P0]`
  - Depends on: ARC-002, ARC-003
  - References: `TESTING_STRATEGY.md`, `DEVELOPMENT_RULES.md`
  - Acceptance: install, lint, type-check, unit/integration tests, build, migrations, and deployment checks run in CI with reproducible dependencies.

## 10. Phase 3 — Data platform and persistence

- [ ] DATA-001 — Finalize D1 schema and migrations `[P0]`
  - Depends on: ARC-001
  - References: `DATABASE_SCHEMA.md`, `DATA_ARCHITECTURE.md`
  - Acceptance: tables, foreign keys, check constraints, indexes, timestamps, soft-delete/archive policy, migration order, and rollback notes are implemented.

- [ ] DATA-002 — Create `DB_PUBLIC` and `DB_OPS` bindings `[P0]`
  - Depends on: DATA-001, ARC-002
  - References: `DEPLOYMENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`
  - Acceptance: public read projections cannot mutate operational records; ops data and audit records are isolated; preview and production bindings are distinct.

- [ ] DATA-003 — Implement typed repositories and validation `[P0]`
  - Depends on: DATA-001
  - References: `DATA_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md`
  - Acceptance: all writes validate at the server boundary, use parameterized queries, return typed results, and expose no raw database details to clients.

- [ ] DATA-004 — Implement outbox, idempotency, and audit primitives `[P0]`
  - Depends on: DATA-001, DATA-003
  - References: `SYNC_STRATEGY.md`, `FAILURE_RECOVERY.md`, `SECURITY_GUIDELINES.md`
  - Acceptance: unique external event/RFQ keys, delivery status, attempts, next retry, error class, audit actor, and immutable event history are queryable.

- [ ] DATA-005 — Configure R2 public and private buckets `[P1]`
  - Depends on: ARC-002, DATA-001
  - References: `IMAGE_OPTIMIZATION.md`, `SECURITY_GUIDELINES.md`
  - Acceptance: public media and private RFQ attachments have separate keys, lifecycle rules, content-type/size validation, signed access, and retention policy.

## 11. Phase 4 — Admin, CMS, identity, and permissions

- [ ] ADM-001 — Implement `/admin` shell and route protection `[P0]`
  - Depends on: ARC-004, DATA-002
  - References: `ADMIN_PANEL_SPEC.md`, `AUTHORIZATION_ROLES.md`, `SECURITY_GUIDELINES.md`
  - Acceptance: Cloudflare Access or approved identity layer gates the area; server-side authorization is enforced on every mutation; unauthorized users receive safe responses.

- [ ] ADM-002 — Implement application roles and permission matrix `[P0]`
  - Depends on: GOV-005, ADM-001
  - References: `AUTHORIZATION_ROLES.md`
  - Acceptance: owner/admin/editor/operator/read-only capabilities are explicit; least privilege, role changes, session expiry, and audit events are tested.

- [ ] ADM-003 — Implement articles and SEO content workflow `[P0]`
  - Depends on: DATA-003, ADM-001, IA-006
  - References: `CMS_ARCHITECTURE.md`, `ADMIN_PANEL_SPEC.md`, `METADATA_SPEC.md`
  - Acceptance: create/edit/preview/review/publish/archive, slug uniqueness, author attribution, revision history, scheduled publication if approved, and cache invalidation work.

- [ ] ADM-004 — Implement media library and safe transformations `[P1]`
  - Depends on: DATA-005, ADM-001
  - References: `MEDIA_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`
  - Acceptance: upload validation, alt-text intent, focal metadata, responsive derivatives, replacement behavior, and public/private access rules pass.

- [ ] ADM-005 — Implement admin dashboard and operational health views `[P1]`
  - Depends on: DATA-004, ADM-002
  - References: `ADMIN_PANEL_SPEC.md`, `OBSERVABILITY.md`
  - Acceptance: recent RFQs, pending Odoo jobs, failed/DLQ jobs, stale prices, unpublished articles, and key errors are visible without exposing secrets.

## 12. Phase 5 — Product catalog and pricing projections

- [ ] CAT-001 — Confirm Odoo catalog mapping `[P0]`
  - Depends on: GOV-005, DATA-001
  - References: `PRODUCT_CATALOG_SPEC.md`, `ERP_DATA_MAPPING.md`
  - Acceptance: product template, variant, attributes, size, unit, category, SKU/external ID, active/public flags, and supported UoM mapping are confirmed against installed Odoo modules.

- [ ] CAT-002 — Implement Odoo catalog/UoM pull adapter `[P0]`
  - Depends on: CAT-001, ARC-006
  - References: `ODOO_INTEGRATION.md`, `SYNC_STRATEGY.md`
  - Acceptance: adapter uses server-side secrets, bounded queries, pagination, timeout, structured errors, and versioned mapping; browser never calls Odoo.

- [ ] CAT-003 — Implement D1 public catalog projection `[P0]`
  - Depends on: CAT-002, DATA-003
  - References: `DATABASE_SCHEMA.md`, `PRODUCT_CATALOG_SPEC.md`
  - Acceptance: categories, products, variants, size, unit, availability/public flags, sync timestamps, and external IDs are projected idempotently with indexes for public queries.

- [ ] CAT-004 — Implement website SEO overlay for catalog entities `[P1]`
  - Depends on: CAT-003, ADM-003
  - References: `PRODUCT_CATALOG_SPEC.md`, `SEO_PAGE_MAP.md`, `INTERNAL_LINKING.md`
  - Acceptance: commercial fields remain Odoo-owned while slugs, copy, buying guidance, FAQs, media, canonical, and schema inputs remain editable in website CMS.

- [ ] CAT-005 — Implement RFQ catalog picker and “other item” path `[P0]`
  - Depends on: CAT-003
  - References: `RFQ_SYSTEM.md`, `FORM_ARCHITECTURE.md`
  - Acceptance: customer can select category/product/variant/size/unit/quantity; missing catalog items can be added with title, size, unit, quantity, and notes; no lead is blocked by catalog gaps.

- [ ] PRICE-001 — Confirm public-price policy and freshness SLA `[P0]`
  - Depends on: GOV-005, CAT-001
  - References: `PRICING_SYSTEM.md`, `DECISIONS.md`
  - Acceptance: public vs quotation-only prices, currency/unit display, rounding, customer-specific pricing policy, stale-data behavior, and “last updated” language are approved.

- [ ] PRICE-002 — Implement Odoo-to-D1 price projection and history `[P0]`
  - Depends on: PRICE-001, CAT-003
  - References: `PRICING_SYSTEM.md`, `DATABASE_SCHEMA.md`
  - Acceptance: current public price, effective time, source, freshness, previous values, and sync status are stored idempotently; no duplicate commercial ledger is created.

- [ ] PRICE-003 — Implement bulk update/reconciliation tools `[P1]`
  - Depends on: PRICE-002, ADM-005
  - References: `ADMIN_PANEL_SPEC.md`, `FAILURE_RECOVERY.md`
  - Acceptance: operators can inspect stale/failed records, trigger safe re-sync/replay, and see audit history; any write-back to Odoo requires explicit approval and permissions.

- [ ] PRICE-004 — Implement price-page SEO controls `[P1]`
  - Depends on: PRICE-002, CAT-004
  - References: `SEO_STRATEGY.md`, `SEO_PAGE_MAP.md`, `SITEMAP_ROBOTS_SPEC.md`
  - Acceptance: only pages with meaningful content are indexable; thin/facet URLs are controlled; price freshness and structured data match visible content.

## 13. Phase 6 — RFQ, customer capture, and Odoo integration

- [ ] RFQ-001 — Finalize RFQ form and consent contract `[P0]`
  - Depends on: IA-004, GOV-005
  - References: `RFQ_SYSTEM.md`, `FORM_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md`
  - Acceptance: required/optional customer fields, company/contact, phone/email, country code, item lines, notes, attachments, consent, privacy copy, and retention are approved.

- [ ] RFQ-002 — Implement server-side RFQ validation and persistence `[P0]`
  - Depends on: DATA-003, RFQ-001
  - References: `RFQ_SYSTEM.md`, `DATABASE_SCHEMA.md`
  - Acceptance: normalized fields, item cardinality, quantity/unit validation, file constraints, rate limiting, honeypot/Turnstile if approved, and safe error handling pass.

- [ ] RFQ-003 — Implement durable receipt and duplicate prevention `[P0]`
  - Depends on: RFQ-002, DATA-004
  - References: `RFQ_SYSTEM.md`, `FAILURE_RECOVERY.md`
  - Acceptance: RFQ is committed before acknowledgement, receives a unique public reference, retries do not create duplicates, and the customer sees a useful receipt even if Odoo is unavailable.

- [ ] RFQ-004 — Implement attachment upload and private access `[P1]`
  - Depends on: DATA-005, RFQ-002
  - References: `RFQ_SYSTEM.md`, `SECURITY_GUIDELINES.md`
  - Acceptance: private R2 keys are unguessable, MIME/size/content checks run server-side, signed access expires, and attachment references are auditable.

- [ ] ODOO-001 — Implement Odoo adapter layer `[P0]`
  - Depends on: GOV-005, ARC-003
  - References: `ODOO_INTEGRATION.md`, `ERP_DATA_MAPPING.md`
  - Acceptance: `services/odoo` isolates authentication, request signing/headers, model calls, pagination, timeout, error normalization, and version-specific behavior.

- [ ] ODOO-002 — Implement Queue producer and consumer `[P0]`
  - Depends on: RFQ-003, ODOO-001, ARC-006
  - References: `SYNC_STRATEGY.md`, `FAILURE_RECOVERY.md`, `DEPLOYMENT_ARCHITECTURE.md`
  - Acceptance: RFQ/customer events enqueue once, consumer claims idempotency key, retries with backoff, records outcome, and routes exhausted messages to DLQ.

- [ ] ODOO-003 — Map customer, lead, RFQ items, and attachments `[P0]`
  - Depends on: ODOO-001, RFQ-003
  - References: `ERP_DATA_MAPPING.md`, `RFQ_SYSTEM.md`
  - Acceptance: mapping to approved Odoo models/fields is tested in sandbox; external IDs, source/UTM, consent, item lines, and attachment references are traceable.

- [ ] ODOO-004 — Implement catalog/price sync jobs `[P0]`
  - Depends on: CAT-002, PRICE-002, ODOO-001
  - References: `SYNC_STRATEGY.md`, `PRICING_SYSTEM.md`
  - Acceptance: scheduled/manual sync, pagination, checkpoints, idempotent upsert, stale detection, failure visibility, and safe replay work.

- [ ] ODOO-005 — Implement reconciliation and operational recovery `[P1]`
  - Depends on: ODOO-002, ODOO-004, ADM-005
  - References: `FAILURE_RECOVERY.md`, `ADMIN_PANEL_SPEC.md`
  - Acceptance: operators can locate unsynced RFQs/products/prices, replay safe jobs, inspect error classes, and confirm final Odoo IDs without duplicate records.

## 14. Phase 7 — Public website implementation

- [ ] WEB-001 — Implement app shell, direction, fonts, and metadata base `[P0]`
  - Depends on: G2, ARC-004, IA-005
  - References: `DESIGN_SYSTEM.md`, `FONT_STRATEGY.md`, `LOCALIZATION.md`, `ACCESSIBILITY.md`
  - Acceptance: document language/direction, landmarks, skip link, self-hosted WOFF2 strategy, viewport, base metadata, and no layout shift are verified.

- [ ] WEB-002 — Implement header, navigation, footer, and mobile behavior `[P0]`
  - Depends on: WEB-001
  - References: `HEADER_NAVIGATION_SPEC.md`, `FOOTER_SPEC.md`, `RESPONSIVE_RULES.md`
  - Acceptance: keyboard/focus behavior, RTL alignment, active states, touch targets, escape/close, and responsive reflow pass.

- [ ] WEB-003 — Build homepage and trust/conversion sections `[P0]`
  - Depends on: WEB-002, IA-004
  - References: `HOMEPAGE_SPEC.md`, `PAGE_SPECIFICATIONS.md`
  - Acceptance: approved positioning, process, proof, risk-control messaging, CTA hierarchy, and responsive states are implemented.

- [ ] WEB-004 — Build service, about, contact, and legal pages `[P0]`
  - Depends on: WEB-002, IA-004
  - References: `PAGE_SPECIFICATIONS.md`, `CONTENT_MODEL.md`
  - Acceptance: content, forms, contact data, privacy/terms/cookie links, metadata, and error/empty states match approved specifications.

- [ ] WEB-005 — Build catalog/category/product and price pages `[P1]`
  - Depends on: CAT-003, CAT-004, PRICE-002, WEB-001
  - References: `PRODUCT_CATALOG_SPEC.md`, `PRICING_SYSTEM.md`, `SEO_PAGE_MAP.md`
  - Acceptance: pages are HTML-first, use D1 projections, show freshness/availability policy, link to RFQ, and never fetch Odoo synchronously.

- [ ] WEB-006 — Build article hub and article pages `[P1]`
  - Depends on: ADM-003, WEB-001
  - References: `CMS_ARCHITECTURE.md`, `PAGE_SPECIFICATIONS.md`
  - Acceptance: published content renders server-side, previews are noindex/private, revisions and related links work, and cache invalidation is correct.

- [ ] WEB-007 — Build RFQ journey and receipt/status surface `[P0]`
  - Depends on: RFQ-002, RFQ-003, CAT-005, WEB-002
  - References: `RFQ_SYSTEM.md`, `FORM_ARCHITECTURE.md`
  - Acceptance: catalog selection, “other item,” validation, consent, optional attachment, submit, retry-safe receipt, analytics, and approved status behavior work on mobile and desktop.

- [ ] WEB-008 — Implement 404, 500, loading, empty, and degraded states `[P1]`
  - Depends on: WEB-001
  - References: `ACCESSIBILITY.md`, `FAILURE_RECOVERY.md`
  - Acceptance: states are branded, accessible, helpful, non-indexable where required, and do not leak implementation or Odoo details.

## 15. Phase 8 — SEO, performance, accessibility, analytics, and security

- [ ] SEO-001 — Implement metadata and canonical URL generation `[P0]`
  - Depends on: WEB-003 through WEB-006
  - References: `METADATA_SPEC.md`, `HREFLANG_CANONICAL.md`
  - Acceptance: every indexable page has unique title/description, canonical `www` URL, correct language, OG fields, and no accidental preview metadata.

- [ ] SEO-002 — Implement structured data `[P0]`
  - Depends on: SEO-001
  - References: `STRUCTURED_DATA.md`
  - Acceptance: Organization/WebSite/Breadcrumb/Article/Product/Offer schemas are used only when visible content supports them and validate without unsupported claims.

- [ ] SEO-003 — Implement sitemap, robots, redirects, and facet controls `[P0]`
  - Depends on: IA-002, IA-003, SEO-001
  - References: `SITEMAP_ROBOTS_SPEC.md`, `REDIRECTS.md`
  - Acceptance: only canonical indexable URLs are included; admin/API/previews/private/filter variants are controlled; redirect chains and HTTP statuses pass.

- [ ] SEO-004 — Implement internal links and breadcrumbs `[P1]`
  - Depends on: WEB-003 through WEB-006
  - References: `INTERNAL_LINKING.md`
  - Acceptance: category/product/article relationships, descriptive anchors, breadcrumbs, related content, and orphan-page checks pass.

- [ ] PERF-001 — Enforce performance budgets `[P0]`
  - Depends on: ARC-005, WEB-003
  - References: `PERFORMANCE_BUDGET.md`, `PERFORMANCE_GUIDELINES.md`
  - Acceptance: representative mobile targets are LCP < 2.0s, INP < 150ms, CLS < 0.05, and TTFB < 500ms in production-equivalent tests; deviations are documented.

- [ ] PERF-002 — Implement image, font, JavaScript, and cache optimization `[P0]`
  - Depends on: DEV-008 equivalent foundation, PERF-001
  - References: `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md`, `CACHING_STRATEGY.md`
  - Acceptance: responsive AVIF/WebP, minimal WOFF2 subsets/weights, server components by default, route cache policy, stale-while-revalidate where appropriate, and no unbounded client bundle pass.

- [ ] A11Y-001 — Implement accessibility baseline `[P0]`
  - Depends on: WEB-001, WEB-002, WEB-007
  - References: `ACCESSIBILITY.md`, `ACCESSIBILITY_QA.md`
  - Acceptance: semantic landmarks, keyboard/focus, contrast, labels, error association, zoom, RTL reading order, reduced motion, and screen-reader smoke tests pass.

- [ ] SYS-001 — Implement analytics and consent `[P0]`
  - Depends on: WEB-003, WEB-004, WEB-007
  - References: `ANALYTICS_TRACKING.md`, `PRIVACY_SECURITY.md`
  - Acceptance: page views, CTA, RFQ start, validation failure, submission, receipt, and campaign parameters are observable without duplicate firing; non-essential tracking respects consent.

- [ ] SEC-001 — Complete security hardening `[P0]`
  - Depends on: ARC-003, RFQ-002, ADM-001, ODOO-002
  - References: `SECURITY_GUIDELINES.md`
  - Acceptance: server validation, rate limiting, Turnstile/spam control if approved, CSRF/origin checks where applicable, secure headers, dependency checks, secret isolation, safe logs, and private-file controls pass.

## 16. Phase 9 — Testing and release candidate

- [ ] QA-001 — Unit and repository tests `[P0]`
  - Depends on: DATA-003, CAT-003, PRICE-002, RFQ-002, ODOO-001
  - References: `TESTING_STRATEGY.md`
  - Acceptance: validation, repository, projection, price freshness, idempotency, mapping, and authorization tests pass.

- [ ] QA-002 — Integration tests for D1/R2/Queues/Odoo adapter `[P0]`
  - Depends on: ODOO-002, RFQ-004, DATA-005
  - References: `TESTING_STRATEGY.md`, `FAILURE_RECOVERY.md`
  - Acceptance: durable-before-ack, retry/backoff, duplicate delivery, DLQ, replay, attachment access, timeout, and Odoo outage scenarios pass in a safe environment.

- [ ] QA-003 — End-to-end public and admin tests `[P0]`
  - Depends on: WEB-007, ADM-003, ADM-005
  - References: `QA_CHECKLIST.md`
  - Acceptance: navigation, article publication, catalog picker, other-item path, RFQ receipt, admin permissions, and operational recovery pass.

- [ ] QA-004 — SEO and metadata QA `[P0]`
  - Depends on: SEO-001 through SEO-004
  - References: `SEO_QA_CHECKLIST.md`
  - Acceptance: HTML-first content, canonical, hreflang if approved, schema, status codes, sitemap, robots, noindex previews/admin, links, and facet controls pass.

- [ ] QA-005 — Performance and Core Web Vitals QA `[P0]`
  - Depends on: PERF-001, PERF-002
  - Acceptance: production-equivalent mobile/desktop runs meet budgets on homepage, category, product/price, article, contact, and RFQ entry routes.

- [ ] QA-006 — Accessibility, responsive, and browser QA `[P0]`
  - Depends on: A11Y-001
  - References: `ACCESSIBILITY_QA.md`, `RESPONSIVE_QA.md`
  - Acceptance: approved device/browser matrix passes with no overflow, clipping, focus loss, RTL defect, or unusable control.

- [ ] QA-007 — Privacy, security, and content sign-off `[P0]`
  - Depends on: SEC-001, SYS-001, QA-003
  - Acceptance: no exposed secret, unapproved tracker, unsafe log, unresolved critical/high dependency issue, inaccurate price/legal claim, or missing launch content remains.

- [ ] QA-008 — Freeze release candidate and rollback point `[P0]`
  - Depends on: QA-001 through QA-007
  - References: `PRE_DEPLOY_CHECKLIST.md`, `DEPLOYMENT_ARCHITECTURE.md`
  - Acceptance: commit, migration set, environment manifest, test report, known limitations, last-known-good rollback, and release approval are recorded.

## 17. Phase 10 — Deployment and production verification

- [ ] REL-001 — Provision production Cloudflare resources `[P0]`
  - Depends on: QA-008
  - References: `DEPLOYMENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`
  - Acceptance: Worker/Assets, D1 databases, R2 buckets, Queues/DLQ, Cron, secrets, logs, and alert destinations exist with least privilege.

- [ ] REL-002 — Configure domain and canonical host `[P0]`
  - Depends on: REL-001
  - Acceptance: apex/`www`, HTTP/HTTPS, SSL, DNS, redirects, cache, and canonical policy converge without loops or unnecessary chains.

- [ ] REL-003 — Apply migrations and deploy approved commit `[P0]`
  - Depends on: REL-002
  - Acceptance: migrations are ordered and logged, deployment matches the approved commit, bindings resolve, and build completes with frozen dependencies.

- [ ] REL-004 — Run production smoke and integration checks `[P0]`
  - Depends on: REL-003
  - Acceptance: public routes, admin gate, article publish, catalog/price read, RFQ receipt, queue delivery, Odoo sync, DLQ visibility, attachments, analytics, metadata, sitemap, robots, and status codes work live.

- [ ] REL-005 — Verify observability and incident recovery `[P0]`
  - Depends on: REL-004
  - Acceptance: Worker errors, latency, queue backlog, Odoo sync failures, D1/R2 failures, cache ratio, RFQ errors, 404/5xx, and Core Web Vitals have dashboards/alerts and a tested response owner.

- [ ] REL-006 — Verify search platform setup `[P1]`
  - Depends on: REL-004
  - Acceptance: ownership is verified, canonical sitemap submitted, representative URLs inspected, and initial crawl/indexation baseline recorded.

- [ ] REL-007 — Approve production and rollback `[P0]`
  - Depends on: REL-004, REL-005
  - Acceptance: Project Owner approves release; last-known-good deployment, migration recovery, queue replay, and escalation contacts are confirmed.

## 18. Phase 11 — Post-launch operations

- [ ] OPS-001 — Review first 72 hours `[P1]`
  - Depends on: G6
  - Acceptance: uptime, errors, RFQ delivery, Odoo sync, queue/DLQ, cache, performance, analytics, and crawl health are reviewed with owners for actions.

- [ ] OPS-002 — Review first 30 days of conversion and search data `[P2]`
  - Depends on: OPS-001
  - Acceptance: RFQ funnel, lead quality, landing pages, query baseline, indexing exclusions, price freshness, and content opportunities are summarized without premature ranking conclusions.

- [ ] OPS-003 — Establish maintenance cadence `[P1]`
  - Depends on: G6
  - Acceptance: dependency updates, secret rotation, Odoo API review, migration review, backup/export policy, accessibility regression, and performance checks have owners and cadence.

---

## 19. Active sprint

> Keep only currently committed work here. Every committed item must also exist in the main backlog.

### Sprint goal

`TBD — Define one measurable implementation outcome after G1 approval.`

### Committed tasks

- [ ] `TBD`

### Current blockers

- [ ] Confirm Odoo version, enabled modules, API method, and bot-user permissions.
- [ ] Confirm Release 1 locale scope and public-price policy.
- [ ] Confirm legal/consent copy owner and RFQ attachment policy.

## 20. Open decision register

| ID | Decision needed | Owner | Blocks |
|---|---|---|---|
| OD-001 | Odoo version, modules, API method, and sandbox access | Project Owner / Technical Lead | GOV-005, CAT-001, ODOO-001 |
| OD-002 | Exact Odoo model/field mapping for customer, lead, RFQ lines, products, UoM, and prices | Technical Lead / Odoo owner | ODOO-003 |
| OD-003 | Release 1 locale scope and translation ownership | Project Owner | IA-005 |
| OD-004 | Public prices vs quotation-only display and freshness SLA | Project Owner / Sales | PRICE-001 |
| OD-005 | RFQ attachment types, limits, retention, and Odoo reference behavior | Project Owner / Technical Lead | RFQ-001, RFQ-004 |
| OD-006 | Identity provider and admin role provisioning process | Project Owner / Technical Lead | ADM-001, ADM-002 |
| OD-007 | Analytics platform, container IDs, and consent categories | Project Owner | SYS-001 |
| OD-008 | Legal privacy, terms, cookies, and marketing-consent copy | Legal owner | RFQ-001, PAGE-004 |

## 21. Risk register

| ID | Risk | Probability | Impact | Mitigation | Owner |
|---|---|---:|---:|---|---|
| R-001 | Odoo API/version/module assumptions are wrong | Medium | High | Resolve OD-001/002 before adapter code; test in sandbox; isolate adapter | Technical Lead |
| R-002 | Odoo outage or slow response loses a lead | Medium | Critical | Save RFQ before acknowledgement; Queue, retry, DLQ, idempotency, reconciliation | Technical Lead |
| R-003 | Catalog is incomplete and blocks customer submission | Medium | High | Always provide free-form “other item” line with title/size/unit/quantity/notes | Product / UX |
| R-004 | Duplicate Queue delivery creates duplicate CRM records | Medium | High | Stable external RFQ/event key and Odoo-side idempotency mapping | Technical Lead |
| R-005 | Public pages become dependent on live Odoo | Medium | High | D1 read projections, cache, stale policy, integration contract tests | Technical Lead |
| R-006 | Price data becomes stale or misleading | Medium | High | Freshness timestamp, stale threshold, visibility policy, sync monitoring, audit history | Sales / Technical Lead |
| R-007 | Admin or private attachments are publicly cached | Low | Critical | Separate bindings/keys, cache headers, signed access, security tests | Technical Lead |
| R-008 | Heavy media or client JavaScript harms Core Web Vitals | Medium | High | Budgets, responsive derivatives, server components, bundle checks, CI gate | Technical Lead |
| R-009 | Scope expansion delays launch | High | High | Keep deferred list, decision register, and release-impact approval | Project Owner |
| R-010 | RTL, canonical, or facet rules conflict across documents | Medium | High | Single source of truth, SEO QA gate, automated metadata/status tests | SEO / Technical Lead |

## 22. Backlog intake

| ID | Problem/request | Source | Value | Effort | Priority | Target release |
|---|---|---|---|---|---|---|
| BL-001 | TBD | TBD | TBD | TBD | TBD | TBD |

Rules:

- Give every request a unique ID and state the user/business problem.
- Add objective acceptance criteria before scheduling.
- Record dependency, privacy/security, SEO, analytics, performance, and Odoo impact.
- Split work that cannot be implemented and verified in one delivery cycle.
- Do not treat a verbal request as implementation-ready when a decision gate remains open.

## 23. Bug triage

| Severity | Definition | Target response |
|---|---|---|
| Critical | Site unavailable, data loss, privacy/security incident, or all RFQs fail | Immediate incident and rollback decision |
| High | Core journey broken, duplicate CRM/lead creation, severe indexing fault, or common-device failure | Fix before release; expedite after launch |
| Medium | Important defect with a reasonable workaround | Nearest appropriate sprint |
| Low | Cosmetic or minor usability defect | Optimization backlog |

Every bug includes environment, URL, reproduction steps, expected/actual behavior, evidence, severity, owner, regression-test requirement, and related task ID.

## 24. Definition of ready

A task is ready only when its purpose, scope, exclusions, dependencies, required content/assets, relevant approved specifications, objective acceptance criteria, and security/privacy/accessibility/localization/SEO/analytics/performance impacts are known. Odoo tasks additionally require the approved API/model mapping or an explicit test double.

## 25. Definition of done

A task is done only when:

- Implementation matches the approved specification and ownership boundary.
- No protected area or unrelated user change was overwritten.
- Lint, type-check, relevant tests, migration checks, and production build pass.
- Public HTML, RTL/LTR, responsive, keyboard, focus, reduced-motion, loading, empty, success, and error behavior are verified where applicable.
- Metadata, canonical, schema, analytics, consent, security, cache headers, and performance impacts are validated.
- Odoo/Queue work proves idempotency, retry, observability, and recovery behavior.
- No secret, debug output, unsafe log, thin placeholder, or unapproved claim remains.
- `CHANGELOG.md`, `DECISIONS.md`, and task status are updated when required.
- Completion report lists files changed, commands/checks run, results, known limitations, and next task.

## 26. Claude Code execution protocol

Before implementation:

1. Read `CLAUDE.md` and `DO_NOT_CHANGE.md`.
2. Read all references named by the selected task.
3. Inspect repository state and existing implementation.
4. Confirm dependencies and decision gates are resolved.
5. State intended files, migration impact, and validation plan.

During implementation:

1. Keep the change limited to the selected task.
2. Reuse approved tokens, repositories, adapters, components, and patterns.
3. Keep secrets server-side and keep browser code independent of Odoo credentials.
4. Add/update tests for changed behavior, including failure paths where relevant.
5. Add newly discovered work to the backlog instead of hiding it in the current task.
6. Preserve unrelated changes and never use destructive Git operations without explicit approval.

After implementation:

1. Run task-relevant checks and record exact results.
2. Review the diff and generated SQL/migration/deployment changes.
3. Verify every acceptance criterion.
4. Update task status and supporting documentation.
5. Report changed files, checks, risks, limitations, rollback/replay implications, and the recommended next task.

## 27. Release approval record

| Gate | Status | Approved by | Date | Notes |
|---|---|---|---|---|
| G0 — Product approved | Pending | — | — | — |
| G1 — Architecture approved | Pending | — | — | — |
| G2 — Design approved | Pending | — | — | — |
| G3 — Foundation complete | Pending | — | — | — |
| G4 — Feature complete | Pending | — | — | — |
| G5 — Release candidate | Pending | — | — | — |
| G6 — Production verified | Pending | — | — | — |
