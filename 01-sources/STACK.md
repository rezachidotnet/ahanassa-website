# Ahan Asa Website — Technology Stack

> **Brand:** Ahan Asa | آهن آسا
> **Domain:** `ahanassa.com`
> **Canonical production origin:** `https://www.ahanassa.com`
> **ERP:** `https://odoo.ahanassa.com`
> **Document:** `STACK.md`
> **Status:** Approved implementation baseline — v2.0
> **Last updated:** 2026-08-27 — AUD-034 documentation drift cleanup
> **Languages:** Persian (`fa-IR`) primary/default RTL; English LTR; Arabic RTL
> **Architecture:** Cloudflare-native public platform with asynchronous Odoo integration

---

## 1. Purpose

This document defines the approved technology stack for the Ahan Asa website, operator CMS, product and public-price read model, multi-item RFQ system, file intake, and Odoo ERP integration.

It is an implementation contract for Claude Code and human developers. It selects technologies and establishes their boundaries. Detailed schemas, mappings, retry rules, permissions, cache TTLs, and deployment procedures belong in the specialist documents listed at the end.

The stack is designed for:

- a fast, premium Persian-first B2B steel-procurement website;
- server-rendered, crawlable, semantically complete SEO pages;
- operator-managed articles and SEO content;
- public product categories, products, variants, units, and current-price views;
- structured RFQs containing any number of steel items;
- PDF, image, and spreadsheet attachments;
- durable lead capture even when Odoo is unavailable;
- asynchronous synchronization with `odoo.ahanassa.com`;
- low client-side JavaScript and strong Core Web Vitals;
- secure internal administration, auditability, and future regional growth.

---

## 2. Binding Decision Keywords

- **MUST** — mandatory unless superseded by an approved architectural decision.
- **MUST NOT** — prohibited unless superseded by an approved architectural decision.
- **SHOULD** — default; deviation requires a documented reason.
- **MAY** — optional when a real requirement and acceptance test exist.
- **CONDITIONAL** — allowed only after its stated gate is passed.
- **DEFERRED** — deliberately outside the current implementation baseline.

Material deviations MUST be recorded in `DECISIONS.md` before implementation. Claude Code MUST NOT silently replace a locked technology, introduce a second overlapping service, or move a system-of-record responsibility.

---

## 3. Non-Negotiable Architecture Principles

1. **Odoo is the commercial system of record.** Customers, CRM, products, variants, units of measure, commercial prices, quotations, sales, purchasing, suppliers, and inventory belong to Odoo.
2. **The website is the presentation, SEO, CMS, and RFQ experience.** It owns editorial content, SEO overlays, public pages, RFQ intake, and the edge read model.
3. **Public rendering MUST NOT depend on a live Odoo response.** Public pages read from static output, Cloudflare Cache, or D1.
4. **RFQ acceptance MUST survive Odoo downtime.** The request is first durably written to D1, then queued for Odoo delivery.
5. **Every cross-system mutation is idempotent.** Queue retries must never create duplicate customers, leads, RFQs, or attachments.
6. **HTML first.** Indexable copy, headings, links, metadata, canonical tags, and structured data are present in the initial server response.
7. **Server Components first.** Client Components are limited to actual interaction boundaries.
8. **Minimal dependencies.** Platform and framework capabilities are preferred over overlapping libraries.
9. **Private by default.** Attachments, secrets, ERP payloads, unpublished content, and personal data are never public assets.
10. **Performance and SEO are release gates.** They are architectural constraints, not post-launch cleanup tasks.

---

## 4. Approved Stack at a Glance

| Layer | Approved selection | Status |
|---|---|---|
| Local/CI runtime | Node.js `24.x` LTS | Locked |
| Production runtime | Cloudflare Workers (`workerd`) with reviewed `nodejs_compat` | Locked |
| Package manager | pnpm `11.x`, exact patch pinned through Corepack | Locked |
| Framework | Next.js App Router `16.3.3+` within the patched `16.3.x` line | Locked baseline |
| UI runtime | React `19.2.x`, aligned with Next.js | Locked |
| Language | TypeScript `6.0.x`, strict mode | Locked |
| Styling | Tailwind CSS `4.3.x` + semantic CSS custom properties | Locked |
| Cloudflare adapter | `vinext` + `@vinext/cloudflare` | Locked for first production release |
| Superseded adapter | `@opennextjs/cloudflare` / OpenNext | Historical fallback only; not selected for launch |
| Deployment CLI | Wrangler, exact compatible release pinned | Locked |
| Public hosting | Cloudflare Workers + Static Assets | Locked |
| Relational storage | Cloudflare D1 | Locked |
| Data access | D1 bindings + Drizzle ORM/Kit; prepared SQL where appropriate | Locked |
| Object storage | Cloudflare R2 | Locked |
| Background delivery | Cloudflare Queues + Dead Letter Queues | Locked |
| Scheduled reconciliation | Workers Cron Triggers | Locked |
| Bot protection | Cloudflare Turnstile with server-side Siteverify | Locked for public mutation forms |
| Edge response cache | Cloudflare Cache + framework cache/revalidation | Locked |
| Image pipeline | R2 originals + Cloudflare Images/Image Resizing | Locked |
| ERP | Odoo at `odoo.ahanassa.com` | Locked |
| ERP protocol | Adapter-selected; Odoo 19 JSON-2 preferred after version verification | Locked boundary |
| Admin authentication | Cloudflare Access + application RBAC | Locked |
| Content validation | Zod `4.x` | Locked |
| Article format | Stored Markdown + allowlisted server renderer; no database MDX | Locked |
| Unit/component tests | Vitest + React Testing Library | Locked |
| End-to-end tests | Playwright | Locked |
| Accessibility automation | axe-core with Playwright | Locked |
| Performance checks | Lighthouse CI + field Core Web Vitals | Locked |
| CI/CD | GitHub Actions + Wrangler deployments | Locked |
| Logs/metrics | Cloudflare Workers Observability | Locked baseline |
| Analytics | Typed first-party event layer; provider chosen separately | Interface locked |

---

## 5. Production Topology

```text
Visitor / Operator
        |
        v
Cloudflare DNS, TLS, WAF, Cache, Turnstile, Access
        |
        v
Next.js on Cloudflare Workers
        |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
       D1                  R2                Queues
  content/read model   media/attachments   async jobs + DLQ
        |                                       |
        |                                       v
        |                              Odoo Integration Worker
        |                                       |
        +-------------------sync----------------+
                                                |
                                                v
                                    odoo.ahanassa.com
```

The public request path MUST NOT contain a synchronous Odoo call.

---

## 6. Runtime, Versions, and Dependency Control

### 6.1 Runtime split

Node.js `24.x` LTS is the development, tooling, build, and CI runtime. Production server code runs in Cloudflare Workers, not on a persistent Node.js server.

Code MUST be tested with the production Workers runtime before deployment. A package working in local Node.js is not sufficient proof that it is compatible with Workers.

### 6.2 Version baseline

- Next.js MUST be at least `16.3.3`, the patched Active LTS release available on the baseline date.
- The latest security-patched compatible `16.3.x` release SHOULD be used.
- React and React DOM MUST stay on the versions required and tested by the selected Next.js release.
- TypeScript remains on the `6.0.x` line until the framework, adapter, ESLint, tests, and editor tooling prove compatibility with a successor.
- pnpm remains on stable `11.x`; pnpm 12 release candidates MUST NOT be used in production.
- Tailwind remains on a compatible patched `4.3.x` line.
- `compatibility_date` MUST be explicit and advanced only through a reviewed change.
- Experimental, beta, canary, and release-candidate packages MUST NOT enter production unless this document explicitly marks them conditional and their gate is passed.

### 6.3 Pinning rules

- `packageManager` MUST contain an exact pnpm version.
- `pnpm-lock.yaml` MUST be committed.
- CI MUST use `pnpm install --frozen-lockfile`.
- Direct dependencies MUST NOT use `*` or an unbounded `latest` range in committed manifests.
- Wrangler, the Cloudflare adapter, Drizzle Kit, and migration tooling MUST be pinned because they affect deploy output or schema state.
- Automated dependency pull requests MAY be used, but major upgrades require an explicit decision and full regression suite.

---

## 7. Next.js and Cloudflare Adapter Decision

### 7.1 Framework

The application MUST use the Next.js App Router with:

- React Server Components;
- static generation and cached server rendering;
- Route Handlers and Server Actions for mutations;
- Metadata API;
- route-level `loading`, `error`, and `not-found` states;
- server-generated sitemaps and robots rules;
- response streaming only where it improves real user experience;
- minimal and isolated Client Components.

The Pages Router and SPA-only rendering are prohibited.

### 7.2 Production adapter

The first production release MUST use `vinext` because the live scaffold and confirmed runtime are Cloudflare Workers + vinext + Vite + TypeScript.

**HISTORICAL / SUPERSEDED:** older copies of this document selected `@opennextjs/cloudflare` / OpenNext for first launch and treated `vinext` as a migration candidate. That adapter lock is superseded by `PROJECT_OVERRIDES.md` §2 and verified repository facts.

Continued use of `vinext` should retain equivalent compatibility evidence:

1. Cloudflare's compatibility check reports no blocking gap.
2. Production build, Worker preview, D1, R2, Queue, Cron, and Access bindings work.
3. Metadata, canonical, sitemap, robots, JSON-LD, RTL, and HTML-first rendering match the baseline.
4. RFQ submission, attachment upload, admin publishing, cache invalidation, and Odoo jobs pass end-to-end tests.
5. Bundle size, Worker CPU, TTFB, and Core Web Vitals are equal or better.
6. Rollback is documented and tested.
7. The migration is recorded in `DECISIONS.md`.

### 7.3 Cloudflare configuration

Use `wrangler.jsonc` as the canonical deploy configuration. It MUST define separate bindings for development/preview and production, including:

- D1 database;
- public-media and private-attachment R2 buckets;
- Queue producers and consumers;
- Dead Letter Queues;
- Cron triggers;
- environment variables and secrets;
- static assets;
- compatibility date and reviewed flags;
- observability.

Generated binding types MUST be committed or regenerated deterministically in CI.

---

## 8. Rendering Strategy

| Route/function | Default strategy |
|---|---|
| Homepage | Static/cached HTML |
| Corporate pages | Static/cached HTML |
| Steel category pages | Static/cached HTML with controlled revalidation |
| Product SEO pages | Static/cached HTML from D1 read model |
| Public price hubs/pages | Cached dynamic HTML with visible update time |
| Article listing/detail | Static/cached HTML, invalidated on publish |
| Search/filter results | Server-rendered; filter-only URLs controlled for indexing |
| RFQ builder | Server page + isolated client-side row builder |
| RFQ submit | Server mutation; `no-store` |
| Admin | Authenticated dynamic rendering; `no-store`, `noindex` |
| Odoo sync consumer | Queue Worker; no public route |
| Scheduled reconciliation | Cron-triggered Worker |

Rules:

- Indexable routes MUST return meaningful HTML before hydration.
- Prices shown publicly MUST come from D1 and display `last_synced_at`.
- A stale but explicitly timestamped price may be served according to `PRICING_SYSTEM.md`; a live request to Odoo is never the fallback.
- Private, personalized, admin, preview, and mutation responses MUST NOT be cached publicly.
- Client-side fetching MUST NOT be used to reveal primary SEO content after page load.

---

## 9. React and Client-State Policy

- Components are Server Components by default.
- `'use client'` MUST be applied at the smallest useful boundary.
- The RFQ item builder MAY use local reducer/state for add, remove, reorder, and field dependencies.
- URL search parameters SHOULD hold shareable filter state.
- No global state library is approved at launch.
- Redux, MobX, Zustand, Apollo Client, React Query, and SWR are prohibited unless a later requirement demonstrates a real need.
- Native form behavior, `useActionState`, progressive enhancement, and server validation are preferred.
- Admin-only complexity MUST remain in admin route bundles and must not affect public pages.

---

## 10. TypeScript and Validation

TypeScript MUST run in strict mode. The repository SHOULD enable:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  }
}
```

Zod schemas are authoritative at external boundaries:

- public and admin form inputs;
- RFQ items and attachments metadata;
- Odoo payloads and responses;
- Queue message envelopes;
- webhook payloads;
- environment configuration;
- article and SEO records;
- product and price sync records.

Use `unknown` and narrowing at boundaries. `any`, unchecked casts, non-null assertions used to conceal missing data, and client imports of server-only types are prohibited.

---

## 11. Styling, RTL, and UI Foundation

Use Tailwind CSS `4.3.x`, semantic CSS variables, and limited component CSS.

The visual authority remains the approved brand and design-system documents. Tailwind is an implementation mechanism, not a source of design decisions.

Requirements:

- `lang="fa"` and `dir="rtl"` on Persian pages;
- CSS logical properties and Tailwind logical utilities;
- direction isolation for URLs, email, phone numbers, grades, dimensions, standards, and product codes;
- accessible focus states and keyboard operation;
- no monolithic UI theme or generic page-builder design system;
- project-owned public components;
- headless primitives only for genuinely complex, tested widgets;
- no CSS-in-JS runtime;
- no Sass/Less layer at launch;
- motion implemented with CSS/WAAPI first and respecting `prefers-reduced-motion`.

`lucide-react` MAY be used as a curated, tree-shaken UI icon source. The brand mark remains a separate approved asset.

---

## 12. Data Architecture and D1

### 12.1 D1 role

D1 is the website's durable operational store and edge-friendly read model. It is not a replacement for Odoo.

D1 owns or stores copies of:

- articles, article categories, drafts, revisions, and publication state;
- website SEO overlays for categories, products, prices, and articles;
- public product/category/variant/unit projections synchronized from Odoo;
- public current prices and website price history projections;
- RFQs, RFQ items, attachment metadata, status, and sync state;
- operator role mappings and application permissions;
- integration outbox/idempotency records;
- audit logs and operational settings.

### 12.2 Data access

Use:

- Cloudflare D1 Worker bindings;
- Drizzle ORM for schema-safe common queries;
- Drizzle Kit and committed SQL migrations;
- prepared SQL for performance-critical queries or D1 features not represented cleanly by the ORM;
- explicit transactions/batches where supported and appropriate;
- database-enforced foreign keys, uniqueness, and indexes.

The application MUST NOT access D1 through public REST credentials.

### 12.3 Index baseline

Indexes MUST cover proven query patterns, including where applicable:

- slugs and locale;
- publication/status timestamps;
- category/product/variant relationships;
- `odoo_id` and `external_id`;
- RFQ reference and status;
- `sync_status`, `next_retry_at`, and `last_synced_at`;
- price entity and effective timestamp;
- audit actor and creation timestamp.

The exact schema and migrations belong in `DATABASE_SCHEMA.md`.

### 12.4 Read replication

D1 Global Read Replication MAY be enabled for international traffic. When enabled, reads MUST use the D1 Sessions API and the consistency strategy defined in `DATA_ARCHITECTURE.md`.

- Public catalog reads may begin unconstrained when slight replication delay is acceptable.
- Read-after-write admin and RFQ flows must use a bookmark or primary-constrained session as appropriate.
- Writes always target the primary database.

---

## 13. System of Record

| Entity/capability | Authoritative system | Website copy/use |
|---|---|---|
| Article and editorial workflow | D1 website CMS | Render public pages |
| SEO title, description, copy, FAQ, internal links | D1 website CMS | Render/index pages |
| Product commercial identity | Odoo | Projected to D1 |
| Product variant and attributes | Odoo | Projected to D1 |
| Unit of measure | Odoo | Projected to D1 |
| Commercial/current price | Odoo | Public projection in D1 |
| Website price history chart | D1 projection | Derived from approved Odoo sync snapshots |
| Customer/contact | Odoo | Website stores RFQ submission snapshot |
| RFQ intake | D1 first | Synchronized to Odoo |
| CRM lead/opportunity | Odoo | Sync reference/status in D1 |
| Quotation and sale order | Odoo | Not authored by website |
| Inventory, purchase, supplier, accounting | Odoo | Not duplicated in website |
| Public media originals | R2 | Delivered through image pipeline |
| RFQ attachments | Private R2 | Reference synchronized to Odoo |
| Audit trail for website actions | D1 | Internal administration |

`SYSTEM_OF_RECORD.md` is authoritative if this table is expanded. Any contradiction must be resolved before code is written.

---

## 14. Odoo Integration Stack

### 14.1 Boundary

All Odoo communication MUST pass through a server-only adapter. UI components, routes, and domain services MUST NOT construct Odoo RPC calls directly.

Recommended module boundary:

```text
services/odoo/
  client.ts
  auth.ts
  customers.ts
  products.ts
  prices.ts
  rfqs.ts
  attachments.ts
  mapping.ts
  errors.ts
```

### 14.2 Protocol selection

The deployed Odoo version and installed modules MUST be verified before integration code is finalized.

- If `odoo.ahanassa.com` runs Odoo 19, use the External JSON-2 API with bearer API-key authentication where the required models and methods are exposed.
- If the server runs an earlier supported Odoo version, prefer a small, versioned custom Odoo controller/module that exposes the exact integration contract.
- Legacy XML-RPC/JSON-RPC MAY be used only as a documented temporary compatibility path.
- The public website never receives the API key, database name, internal model permissions, or raw Odoo errors.

### 14.3 Integration identity

Create a dedicated Odoo integration user, for example `ahanassa_website_bot`, with minimum required access rights and record rules.

Secrets MUST be stored as Cloudflare secrets and accessed only in server/consumer code.

### 14.4 Data flow

Website to Odoo:

- customer/contact identity;
- company and communication fields;
- RFQ header and all RFQ items;
- attachment references or controlled uploads;
- source page, locale, consent, referrer, and approved UTM fields;
- idempotency key and website reference.

Odoo to website:

- products and variants;
- units of measure;
- public prices and effective/update times;
- public availability labels only when approved;
- Odoo identifiers and sync versions;
- optional customer-visible RFQ status if later approved.

### 14.5 Mapping

Expected model families include `res.partner`, `crm.lead`, `product.template`, `product.product`, `uom.uom`, and Odoo pricelist/sales models. Exact fields and custom RFQ-line handling MUST be defined in `ERP_DATA_MAPPING.md` after installed modules are inspected.

---

## 15. Queues, Idempotency, and Failure Recovery

Use Cloudflare Queues for:

- RFQ delivery to Odoo;
- product/variant/unit synchronization;
- price synchronization and cache invalidation;
- attachment handoff/processing;
- non-blocking notifications if later approved.

Each job envelope MUST contain:

```text
message_id
event_type
schema_version
aggregate_id
idempotency_key
occurred_at
attempt_context
payload
```

Because Queues provide at-least-once delivery, consumers MUST be idempotent. The idempotency key MUST be enforced by D1 and passed to Odoo/custom endpoints where possible.

Failed jobs MUST follow controlled retry rules and ultimately enter a Dead Letter Queue. An operator-visible recovery view MUST allow inspection and safe replay without exposing secrets or customer documents.

RFQ success flow:

```text
validate request
  -> verify Turnstile
  -> write RFQ + items + attachment metadata to D1
  -> enqueue Odoo job
  -> return website reference
```

The user receives success only after durable D1 acceptance. Odoo synchronization may complete later.

---

## 16. Scheduled Synchronization

Workers Cron Triggers MUST run reconciliation jobs at intervals defined in `SYNC_STRATEGY.md`.

The stack supports:

- webhook/event-driven updates from Odoo when a trusted custom endpoint is available;
- scheduled delta sync using `write_date`/version markers;
- periodic full reconciliation of identifiers and counts;
- price freshness monitoring;
- replay of recoverable failed records;
- cache-tag invalidation after successful projection updates.

Cron handlers SHOULD enqueue bounded jobs rather than perform large Odoo synchronizations in one invocation.

---

## 17. CMS and Admin Stack

### 17.1 Scope

The authenticated `/admin` application manages:

- dashboard and operational warnings;
- articles, categories, drafts, preview, publish, unpublish, and revisions;
- website SEO overlays;
- product/category public presentation fields;
- public-price sync visibility and history, not commercial price authorship;
- RFQ review and website sync state;
- media library;
- users/roles mapping and audit logs;
- integration failures and safe replay.

Commercial prices SHOULD be changed in Odoo. The website admin may offer a controlled Odoo-linked bulk workflow only if `PRICING_SYSTEM.md` approves it and Odoo remains the authoritative writer.

### 17.2 Admin authentication

Use Cloudflare Access to protect `/admin` and admin APIs. The application MUST then apply its own D1-backed RBAC and verify the Access identity.

Minimum roles:

- `super_admin`;
- `content_manager`;
- `price_viewer` or approved price operator role;
- `sales_operator`;
- `auditor`.

Cloudflare Access authentication does not replace application authorization.

### 17.3 Article storage

Store article bodies as Markdown, not executable MDX. Render on the server with an explicit allowlist and sanitization pipeline.

Approved packages when required:

- `react-markdown`;
- `remark-gfm`;
- `rehype-sanitize` with a project-owned schema.

Raw HTML, embedded scripts, arbitrary React components, and untrusted MDX execution are prohibited.

The initial editor SHOULD be a structured Markdown editor with preview. A rich-text framework such as Tiptap is conditional and must remain admin-only if adopted.

---

## 18. Product Catalog and Price Stack

The public catalog uses two linked layers:

1. **Odoo commercial layer:** product, variant, attributes, units, pricelists, internal codes, inventory, suppliers, purchasing, and sales.
2. **Website SEO layer:** slug, localized title, introduction, specifications, buying guide, FAQ, related pages, internal links, metadata, canonical, indexability, and approved media.

Rules:

- Odoo identifiers and website identifiers MUST be stored separately.
- Product sync MUST never overwrite website-authored SEO content.
- Public prices MUST show unit, currency, source/effective time, and last update time.
- Public price pages MUST state that final commercial terms are confirmed through quotation where legally/operationally required.
- Thin, automatically generated combinations MUST remain non-indexable.
- Filter query URLs are non-indexable unless explicitly promoted to a curated landing page.
- Search starts with indexed D1 queries; no external search service is approved at launch.

---

## 19. RFQ Stack

The RFQ builder MUST support any number of rows. Each row supports:

```text
category
product
variant / size
unit
quantity
description
```

It MUST also support a free-form item when the requested product is not present in the catalog.

Submission modes:

- structured items only;
- attachments only when minimum contact/request context is present;
- structured items plus attachments.

Approved attachment classes include PDF, image, CSV, and approved spreadsheet formats. Files are not automatically trusted or parsed merely because their extension is allowed.

Validation is shared conceptually but authoritative on the server. Client validation improves usability only.

No RFQ, item, personal data, or attachment metadata may enter analytics payloads.

---

## 20. R2 and File Security

Use separate R2 buckets or strict prefixes/policies for:

- approved public media originals;
- private RFQ uploads;
- quarantine/pending-scan uploads;
- processed/safe private files if scanning is enabled.

Requirements:

- random opaque object keys;
- no customer filename as an object key;
- size and file-count limits;
- extension, MIME type, and file-signature validation;
- private-by-default access;
- short-lived signed access for authorized operators;
- lifecycle/retention rules;
- malware-scanning or quarantine workflow defined before production attachment access;
- audit trail for upload, view, handoff, and deletion;
- no private R2 URL in HTML, logs, analytics, or Odoo chatter visible beyond intended roles.

Uploads MAY use a server-authorized direct-to-R2 flow to avoid proxying large bodies through application code, but authorization and final metadata commit remain server-controlled.

---

## 21. Images and Fonts

### 21.1 Images

Use R2 for originals and Cloudflare Images/Image Resizing for responsive delivery.

Requirements:

- AVIF/WebP negotiation with a safe fallback;
- width appropriate to layout and device;
- intrinsic dimensions or stable aspect ratios;
- one intentional LCP image priority per route at most;
- lazy loading below the fold;
- long-lived immutable caching for versioned media;
- accessible alt text for informative media;
- no public exposure of RFQ attachments through the image pipeline.

`next/image` MAY be used with a project-owned Cloudflare loader or the adapter-supported integration. Generated URLs and cache behavior MUST be verified in Workers preview.

### 21.2 Fonts

- self-host licensed WOFF2 fonts;
- use `next/font/local` when compatible with the deployed adapter output;
- subset Persian/Arabic/Latin glyphs only when licensing and QA permit;
- preload only the critical face;
- minimize families and weights;
- define metric-compatible fallbacks;
- verify no unacceptable layout shift.

---

## 22. Cache Strategy

Use layered caching:

1. versioned static assets at the Cloudflare edge;
2. framework route/data cache for public renderable content;
3. Cloudflare response cache for eligible public responses;
4. D1 as the durable read model;
5. Odoo only as an asynchronous upstream system.

Use selective tags/keys such as:

```text
article:{id}
category:{id}
product:{id}
price:{variant_id}
catalog
prices
```

After a successful publish or sync, invalidate only affected content. Whole-site purges require an operational incident or approved release action.

Public content SHOULD use stale-while-revalidate where the content policy allows it. Admin, RFQ, private media, preview, authentication, and mutation responses MUST use `no-store` and must never enter public cache.

---

## 23. Security Controls

Use:

- Cloudflare TLS, WAF, rate limiting, Access, and Turnstile;
- mandatory server-side Turnstile Siteverify for protected forms;
- Zod validation and normalization;
- origin and content-type checks for mutations;
- server-only modules for secrets and integrations;
- strict security headers and CSP;
- CSRF protection appropriate to Server Actions/Route Handlers and admin flows;
- least-privilege D1/R2/Queue bindings;
- least-privilege Odoo integration user;
- redacted structured logging;
- audit logs for privileged actions;
- dependency and secret scanning in CI.

Turnstile tokens MUST be validated server-side and treated as short-lived, single-use values. Turnstile is one layer; it does not replace validation, rate limiting, idempotency, or authorization.

No secret belongs in:

- browser JavaScript;
- `NEXT_PUBLIC_*` variables;
- Git history;
- `.env.example` values;
- analytics;
- screenshots, fixtures, or logs.

---

## 24. SEO Stack

Use native Next.js capabilities and small typed utilities:

- Metadata API;
- server-generated title, description, canonical, Open Graph, and robots directives;
- `sitemap.ts` with segmented sitemaps when scale requires it;
- `robots.ts`;
- server-rendered JSON-LD;
- `BreadcrumbList`, `Organization`, `WebSite`, `Article`, and appropriate `Product`/`Offer` schemas only when visible content supports them;
- crawlable `<a href>` internal links;
- stable status codes and redirects;
- localized metadata/content architecture;
- build/CI validation for canonical, indexability, sitemap membership, and broken internal links.

Rules:

- Persian canonical URLs SHOULD be unprefixed unless `ROUTES.md` decides otherwise.
- Unpublished locales MUST NOT receive hreflang or indexable placeholder pages.
- Preview and admin origins/routes MUST be `noindex`.
- Public price/product pages MUST not depend on client-side fetching for core content.
- Faceted/filter URLs are non-indexable by default.
- Product and price pages are indexable only when they provide unique, useful content beyond a data row.
- JSON-LD MUST match visible page content and current data freshness rules.

No generic SEO plugin is approved.

---

## 25. Performance Budget and Delivery Rules

Project targets at the 75th percentile on representative production traffic:

```text
LCP   < 2.0 s
INP   < 150 ms
CLS   < 0.05
TTFB  < 500 ms for uncached representative HTML
```

Lighthouse CI targets for representative public routes:

```text
Performance      >= 95
SEO              = 100
Accessibility    >= 95
Best Practices   >= 95
```

These are internal release targets, not promises for every device/network.

Rules:

- no site-wide third-party script without a site-wide requirement;
- no global animation runtime;
- no hydration for static content;
- no client data-fetching library for public SEO content;
- no oversized hero video at launch;
- no below-the-fold priority images;
- no unbounded icon imports;
- no synchronous Odoo request in page rendering or RFQ acceptance;
- route-specific dependencies remain route-specific;
- public and admin bundles are measured separately;
- database query plans and indexes are reviewed for frequent routes.

Detailed byte/CPU/query budgets and CI thresholds belong in `PERFORMANCE_BUDGET.md` and `PERFORMANCE_GUIDELINES.md`.

---

## 26. Localization

The launch locale is Persian (`fa-IR`) and RTL. The content and routing model MUST remain ready for English and Arabic without publishing incomplete locales.

Use locale-independent entity IDs and locale-specific content records.

`next-intl` is CONDITIONAL:

- it SHOULD be added when a second complete locale is approved;
- it MAY be introduced earlier if implementation testing proves that it reduces migration risk without harming public bundle size or routing clarity;
- the decision must be recorded in `DECISIONS.md`.

No automatic machine-translated production pages are allowed.

---

## 27. Analytics and Observability

### 27.1 Observability

Use Cloudflare Workers Observability as the baseline for:

- Worker exceptions and latency;
- D1 query errors/latency;
- Queue depth, retries, and DLQ growth;
- Odoo request latency and failure categories;
- sync freshness;
- RFQ acceptance failures;
- cache hit behavior;
- 404 and 5xx trends.

Logs MUST use structured fields and redact personal data, RFQ content, filenames, API keys, tokens, and confidential Odoo payloads.

External error monitoring is deferred until ownership, retention, privacy, alerts, and cost are approved.

### 27.2 Analytics

Implement a typed first-party event interface. GA4, GTM, Cloudflare Web Analytics, or another provider must be selected in `ANALYTICS_TRACKING.md`.

Public analytics MUST NOT include names, phones, emails, free text, RFQ items, quantities, attachment names/URLs, quotation values, or Odoo identifiers.

Search Console and Bing Webmaster Tools require no global runtime SDK.

---

## 28. Testing Stack

| Test level | Tool | Required coverage |
|---|---|---|
| Schema/unit | Vitest | validation, mapping, money/unit logic, idempotency, cache tags |
| Components | React Testing Library | RFQ rows, admin controls, filters, accessible states |
| Integration | Vitest + Workers test environment/mocks | D1, R2 metadata, Queue envelopes, Odoo adapter |
| End-to-end | Playwright | public navigation, SEO HTML, RFQ, uploads, admin publish, failure states |
| Accessibility | axe-core + Playwright | representative routes and dynamic states |
| Visual regression | Playwright screenshots | key RTL public/admin layouts |
| Performance | Lighthouse CI | home, category, product, price, article, RFQ |
| Type safety | `tsc --noEmit` | complete repository |
| Static analysis | ESLint | complete repository |
| Migration validation | Wrangler/Drizzle commands | preview database before production |

Mandatory integration scenarios:

- Odoo available;
- Odoo timeout/down;
- duplicate Queue delivery;
- malformed Odoo payload;
- partial product/price sync failure;
- DLQ and replay;
- RFQ with many rows;
- free-form item;
- attachment rejection and quarantine;
- Turnstile failure/expiry/replay;
- admin without role;
- stale public price;
- cache invalidation after article publish and price sync;
- D1 read-after-write consistency where required.

Turnstile test keys MUST be used in automated tests.

---

## 29. CI/CD and Environments

Use four logical environments:

- local;
- preview per pull request;
- staging/integration for Odoo tests;
- production.

Each non-production environment MUST have separate D1, R2, Queue, Access, Turnstile, and secret configuration. Preview code MUST NOT write to production Odoo or production storage.

GitHub Actions MUST run:

```text
frozen install
format check
lint
typecheck
unit/component tests
content/schema validation
database migration validation
production build
Workers runtime preview smoke tests
Playwright critical paths
accessibility checks
Lighthouse CI
```

Production deployment uses Wrangler from a protected branch/workflow. Database migrations MUST be forward-only, reviewed, backed up where appropriate, and applied before code that requires them.

Rollback MUST distinguish Worker code rollback from data/schema recovery; Cloudflare Worker versions do not roll back D1 or R2 state.

---

## 30. Expected Package Set

### 30.1 Production dependencies

| Package | Purpose | Policy |
|---|---|---|
| `next` | Framework | Required; patched line |
| `react`, `react-dom` | UI/runtime | Required; aligned |
| `zod` | Boundary validation | Required |
| `drizzle-orm` | Typed D1 access | Required |
| `vinext`, `@vinext/cloudflare` | Workers deployment adapter | Required for launch |
| `react-markdown` | Safe article rendering | Required when CMS launches |
| `remark-gfm` | Controlled Markdown features | Required when CMS launches |
| `rehype-sanitize` | Allowlisted sanitization | Required when CMS launches |
| `lucide-react` | Curated icons | Limited |
| `jose` | Access/JWT verification if required by implementation | Conditional |
| `next-intl` | Multi-locale routing/messages | Conditional |

### 30.2 Development dependencies

- `typescript`;
- `wrangler`;
- `drizzle-kit`;
- `tailwindcss` and compatible integration package;
- ESLint with compatible Next.js/TypeScript/accessibility rules;
- Prettier;
- Vitest;
- React Testing Library packages;
- Playwright;
- `@axe-core/playwright`;
- Lighthouse CI tooling;
- `tsx` for controlled repository scripts if needed.

Do not install conditional packages during scaffolding without implementing their approved use case.

---

## 31. Stable Repository Commands

The final scripts SHOULD expose equivalent commands:

```json
{
  "scripts": {
    "dev": "vinext dev",
    "build": "vinext build",
    "preview:cf": "vinext-cloudflare preview",
    "deploy:cf": "vinext-cloudflare deploy",
    "cf:typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test --grep @a11y",
    "content:validate": "tsx scripts/validate-content.ts",
    "links:validate": "tsx scripts/validate-links.ts"
  }
}
```

Exact commands may change with adapter releases, but equivalent gates must remain.

---

## 32. Explicitly Rejected or Deferred Technologies

The launch stack MUST NOT include:

- Vercel hosting or Vercel server functions;
- OpenNext / `@opennextjs/cloudflare` as the selected launch adapter unless a new owner-approved adapter reversal is recorded;
- Cloudflare Pages for the full-stack application;
- direct browser-to-Odoo calls;
- synchronous Odoo calls during public rendering or RFQ acceptance;
- Odoo as the public headless CMS;
- a second commercial product/price master outside Odoo;
- WordPress or a coupled page builder;
- Shopify, WooCommerce, Magento, or a public checkout engine;
- client-side SPA-only rendering;
- Next.js Pages Router;
- a second package manager or lockfile;
- an unreviewed beta/canary adapter in production;
- database-stored executable MDX;
- Prisma unless a future database decision requires it;
- a global state library at launch;
- a generic full UI theme;
- CSS-in-JS runtime;
- public RFQ attachment buckets;
- permanent signed attachment URLs;
- unbounded user uploads;
- client-visible ERP/API credentials;
- blanket cache purges as the normal invalidation strategy;
- automatically indexed faceted URLs;
- analytics containing personal or commercial RFQ data;
- Sentry or another monitoring vendor before approval;
- Algolia/Elastic/Meilisearch before D1 search is proven insufficient;
- customer portal/account functionality before a separate scope and security design is approved.

---

## 33. Open Decisions That Must Be Resolved Before Production

| Decision | Authority |
|---|---|
| Exact Odoo version and installed modules | `ODOO_INTEGRATION.md` |
| JSON-2 methods or custom Odoo controller | `ODOO_INTEGRATION.md` |
| Final Odoo field/model mapping | `ERP_DATA_MAPPING.md` |
| Sync frequency, conflicts, reconciliation | `SYNC_STRATEGY.md` |
| D1 schema and migration sequence | `DATABASE_SCHEMA.md` |
| RFQ status model and Odoo representation | `RFQ_SYSTEM.md` |
| Attachment limits, scanning, retention | `SECURITY_GUIDELINES.md`, `RFQ_SYSTEM.md` |
| Admin role permission matrix | `AUTHORIZATION_ROLES.md` |
| Public-price freshness and disclaimer rules | `PRICING_SYSTEM.md` |
| Exact cache TTL/tag invalidation | `CACHING_STRATEGY.md` |
| Analytics/consent provider | `ANALYTICS_TRACKING.md` |
| Alert destinations and on-call ownership | `FAILURE_RECOVERY.md` |
| Second locale and `next-intl` adoption | `LOCALIZATION.md`, `DECISIONS.md` |
| `vinext` migration timing | `DECISIONS.md` after compatibility gate |

An open decision does not permit a developer to fabricate production values.

---

## 34. Launch Acceptance Checklist

- [ ] Public hosting is Cloudflare Workers, not Vercel or Pages.
- [ ] Next.js is on `16.3.3` or a later approved patched `16.3.x` release.
- [ ] Node, pnpm, Wrangler, adapter, and lockfile are pinned.
- [ ] Workers preview passes with production-like bindings.
- [ ] D1 schema, foreign keys, uniqueness, indexes, and migrations are validated.
- [ ] Public rendering does not call Odoo.
- [ ] Odoo version, API contract, dedicated bot user, and permissions are verified.
- [ ] Products, variants, units, and prices synchronize without overwriting SEO fields.
- [ ] RFQs are durably accepted in D1 before Odoo delivery.
- [ ] Queue duplicates do not create duplicate Odoo records.
- [ ] Retry, DLQ, alert, and replay workflows pass.
- [ ] Attachments remain private and pass the approved validation/quarantine process.
- [ ] Cloudflare Access and application RBAC protect admin routes.
- [ ] Article draft, preview, publish, unpublish, revision, and cache invalidation pass.
- [ ] Current price and `last_synced_at` render from D1.
- [ ] Turnstile is verified server-side and tested for expiry/replay.
- [ ] Core SEO content and metadata are present in initial HTML.
- [ ] Canonical, robots, sitemap, JSON-LD, status codes, and internal links pass QA.
- [ ] Faceted URLs follow the approved index policy.
- [ ] Public Client Components and JavaScript remain within the performance budget.
- [ ] Images and fonts follow the optimized Cloudflare delivery strategy.
- [ ] No personal/RFQ/ERP data appears in analytics or unredacted logs.
- [ ] Unit, integration, Playwright, accessibility, Workers preview, and Lighthouse gates pass.
- [ ] Environment isolation prevents preview/staging writes to production systems.
- [ ] Code rollback and data recovery procedures are documented separately.
- [ ] All material deviations are recorded in `DECISIONS.md`.

---

## 35. Official Technical References

Version and capability claims MUST be rechecked against primary sources at implementation and release time:

- Cloudflare Next.js on Workers: `https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/`
- Cloudflare Workers framework documentation and vinext project documentation matching the installed adapter versions.
- Cloudflare Workers: `https://developers.cloudflare.com/workers/`
- Cloudflare D1: `https://developers.cloudflare.com/d1/`
- D1 read replication: `https://developers.cloudflare.com/d1/best-practices/read-replication/`
- Cloudflare R2: `https://developers.cloudflare.com/r2/`
- Cloudflare Queues delivery guarantees: `https://developers.cloudflare.com/queues/reference/delivery-guarantees/`
- Cloudflare Turnstile server validation: `https://developers.cloudflare.com/turnstile/get-started/server-side-validation/`
- Cloudflare Workers Observability: `https://developers.cloudflare.com/workers/observability/`
- Cloudflare Images: `https://developers.cloudflare.com/images/`
- Odoo 19 External JSON-2 API: `https://www.odoo.com/documentation/19.0/developer/reference/external_api.html`
- Next.js documentation and security news: `https://nextjs.org/docs` and `https://nextjs.org/blog`
- Node.js release status: `https://nodejs.org/en/about/previous-releases`
- pnpm releases: `https://pnpm.io/blog`
- TypeScript releases: `https://www.typescriptlang.org/docs/handbook/release-notes/overview.html`
- Tailwind CSS releases: `https://tailwindcss.com/blog`
- WCAG 2.2: `https://www.w3.org/TR/WCAG22/`

Third-party tutorials are not authoritative for security, version, deployment, or ERP decisions.

---

## 36. Related Documents and Authority

Read this document with:

- `PROJECT_BRIEF.md`
- `TECHNICAL_ARCHITECTURE.md`
- `SYSTEM_OF_RECORD.md`
- `DATA_ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `CMS_ARCHITECTURE.md`
- `ADMIN_PANEL_SPEC.md`
- `PRODUCT_CATALOG_SPEC.md`
- `PRICING_SYSTEM.md`
- `RFQ_SYSTEM.md`
- `AUTHORIZATION_ROLES.md`
- `ODOO_INTEGRATION.md`
- `ERP_DATA_MAPPING.md`
- `SYNC_STRATEGY.md`
- `FAILURE_RECOVERY.md`
- `API_INTEGRATIONS.md`
- `FORM_ARCHITECTURE.md`
- `CACHING_STRATEGY.md`
- `PERFORMANCE_GUIDELINES.md`
- `PERFORMANCE_BUDGET.md`
- `IMAGE_OPTIMIZATION.md`
- `FONT_STRATEGY.md`
- `SECURITY_GUIDELINES.md`
- `DEPLOYMENT_ARCHITECTURE.md`
- `ENVIRONMENT_VARIABLES.md`
- `TESTING_STRATEGY.md`
- `SEO_QA_CHECKLIST.md`
- `CLAUDE.md`
- `TASKS.md`
- `DECISIONS.md`

If documents conflict, the latest explicitly approved entry in `DECISIONS.md` takes precedence, followed by `PROJECT_BRIEF.md`, `SYSTEM_OF_RECORD.md`, and this document. All affected documents must then be updated so the project returns to a consistent source of truth.

---

**End of `STACK.md`**
