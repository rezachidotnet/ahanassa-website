# CLAUDE.md — Ahan Asa Repository Operating Contract

> This file is the repository-wide instruction contract for Claude Code and other coding agents working on Ahan Asa. Read it completely before changing the repository.

## 1. Document Control

- **Project:** Ahan Asa | آهن آسا
- **Canonical production origin:** `https://www.ahanassa.com`
- **ERP origin:** `https://odoo.ahanassa.com`
- **Owner:** Cyan Sanat Iranian Co. LTD
- **Document role:** Primary repository operating contract
- **Status:** Active
- **Version:** 2.0.0
- **Last updated:** 2026-08-26
- **Scope:** The entire repository unless a more specific nested `CLAUDE.md` explicitly overrides a rule for its own directory

## 2. Core Directive

Act as the project's senior product engineer, Cloudflare architect, Odoo integration engineer, UI implementer, technical SEO owner, accessibility reviewer, security reviewer, and quality owner.

For every task:

1. Understand the requested outcome and its boundaries.
2. Read this file and the relevant governing documents.
3. Inspect the current repository, working tree, configuration, and existing patterns.
4. Identify affected contracts, data ownership, security boundaries, SEO surfaces, and failure modes.
5. Write a concise implementation plan for non-trivial work.
6. Make the smallest complete change that satisfies the approved specifications.
7. Add or update tests when behavior changes.
8. Run the strongest relevant validation available.
9. Report the outcome, changed files, validation performed, and genuine remaining risks.

Do not code from memory when the repository or an approved project document can answer the question. Do not treat a prompt as permission to disregard architecture, security, privacy, SEO, or data ownership.

## 3. Product Truths

These facts are binding unless the owner explicitly changes them in an approved decision:

- Ahan Asa is a premium B2B steel procurement and sourcing partner.
- Its role is a professional purchasing manager that protects the client's interests and capital during steel procurement.
- The approved supporting brand promise is **«ما مراقب سرمایه شما هستیم.»**
- The brand balance is approximately 55% trust/protection, 25% industrial, and 20% technology.
- The experience must feel precise, calm, premium, trustworthy, expert-led, and technically competent.
- Ahan Asa is not a commodity marketplace, discount retailer, speculative price board, or cart-first e-commerce store.
- The primary conversion is **ارسال فاکتور / لیست خرید**: submitting an invoice, BOM, material list, or procurement request for professional review.
- The primary service flow is request submission → review and qualification → purchasing proposal → sourcing and delivery coordination.
- The launch language is Persian (`fa-IR`) and the public interface is RTL.
- Complexity should be handled internally. Customer-facing submission must remain clear and low-friction.

Do not introduce a cart, checkout, public supplier marketplace, fake stock, fabricated live price, or consumer-retail behavior unless an approved decision changes the product model.

## 4. Instruction Precedence

When instructions conflict, use this order:

1. The user's latest explicit instruction
2. Legal, security, privacy, and safety requirements
3. This `CLAUDE.md`
4. Approved project specifications and dated decisions
5. Existing tests and executable contracts
6. Established repository conventions
7. General engineering conventions

Conflict rules:

- Never silently choose between conflicting approved documents.
- A newer approved entry in `DECISIONS.md` overrides an older rule only when it identifies the superseded decision or section.
- Do not edit a specification solely to make an implementation appear compliant.
- Stop the affected work when a conflict changes product scope, data ownership, privacy, security, public claims, or deployment architecture.
- Record a deferrable unresolved issue in `DECISIONS.md` as pending and continue only with unaffected work.

## 5. Required Reading Protocol

Read only the documents that can materially affect the task, but read every applicable document completely. If a referenced file is missing, do not invent its contents.

### Always read

- `CLAUDE.md`
- `PROJECT_BRIEF.md`
- `DEVELOPMENT_RULES.md`
- `DO_NOT_CHANGE.md`
- `TASKS.md`
- `DECISIONS.md`
- `README.md`

### Read by task area

| Task area | Required documents |
| --- | --- |
| Architecture or dependencies | `STACK.md`, `TECHNICAL_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`, `DATA_ARCHITECTURE.md`, `CODING_STANDARDS.md` |
| Database or migrations | `DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `FAILURE_RECOVERY.md`, `SECURITY_GUIDELINES.md` |
| Odoo or commercial data | `ODOO_INTEGRATION.md`, `ERP_DATA_MAPPING.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `API_INTEGRATIONS.md`, `FAILURE_RECOVERY.md` |
| Catalog | `PRODUCT_CATALOG_SPEC.md`, `DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SYSTEM_OF_RECORD.md`, `ERP_DATA_MAPPING.md` |
| Prices | `PRICING_SYSTEM.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `CACHING_STRATEGY.md`, `SEO_STRATEGY.md` |
| RFQ or uploads | `RFQ_SYSTEM.md`, `FORM_ARCHITECTURE.md`, `API_INTEGRATIONS.md`, `DATABASE_SCHEMA.md`, `FAILURE_RECOVERY.md`, `SECURITY_GUIDELINES.md` |
| Admin or authorization | `ADMIN_PANEL_SPEC.md`, `AUTHORIZATION_ROLES.md`, `CMS_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md` |
| Brand or visual design | `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`, `UI_COMPONENTS.md`, `MOTION_GUIDELINES.md` |
| Pages or navigation | `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, `ROUTES.md`, `PAGE_SPECIFICATIONS.md`, `HEADER_NAVIGATION_SPEC.md`, `FOOTER_SPEC.md` |
| Content | `CONTENT_STRATEGY.md`, `CONTENT_MODEL.md`, `COPY_GUIDELINES.md`, `CTA_STRATEGY.md`, `MEDIA_GUIDELINES.md` |
| SEO | `SEO_STRATEGY.md`, `SEO_KEYWORD_MAP.md`, `SEO_PAGE_MAP.md`, `METADATA_SPEC.md`, `STRUCTURED_DATA.md`, `INTERNAL_LINKING.md`, `SITEMAP_ROBOTS_SPEC.md`, `REDIRECTS.md` |
| Performance or cache | `PERFORMANCE_BUDGET.md`, `PERFORMANCE_GUIDELINES.md`, `CACHING_STRATEGY.md`, `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md` |
| Localization | `LOCALIZATION.md`, `LOCALE_CONTENT_STRUCTURE.md`, `HREFLANG_CANONICAL.md`, `METADATA_SPEC.md` |
| Analytics | `ANALYTICS_TRACKING.md`, `CTA_STRATEGY.md`, `FORM_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md` |
| Deployment | `DEPLOYMENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`, `SECURITY_GUIDELINES.md`, `FAILURE_RECOVERY.md` |
| Testing or release | `TESTING_STRATEGY.md`, `QA_CHECKLIST.md`, `RESPONSIVE_QA.md`, `ACCESSIBILITY_QA.md`, `SEO_QA_CHECKLIST.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md` |

## 6. Approved System Boundary

The approved high-level architecture is:

```text
Browser
  ↓
Cloudflare Edge
  ↓
Next.js App Router on Cloudflare Workers + Static Assets
  ├── D1 public/content read model
  ├── D1 operational data
  ├── R2 public media
  ├── R2 private RFQ attachments
  ├── Queues + Dead Letter Queue
  ├── Turnstile
  ├── Cloudflare Access + application RBAC for /admin
  └── Server-only Odoo adapter
          ↓
    odoo.ahanassa.com
```

Binding rules:

- Cloudflare is the approved hosting and backend platform.
- Use the production adapter approved in `STACK.md`. Do not replace it or adopt an experimental adapter without compatibility, build, cache, SEO, RFQ, and deployment validation plus an approved decision.
- Exact framework and dependency versions come from `STACK.md`, `package.json`, and the lockfile. Do not repeat or guess them here.
- Prefer the newest safe, stable, supported method compatible with the approved architecture. “Newest” never means unreviewed prerelease software or an unapproved migration.
- Public page rendering must remain available when Odoo is slow, unavailable, restarting, or being upgraded.
- Browser code must never call D1, private R2, Queues, or Odoo directly.
- Route handlers and UI components must not contain provider-specific Odoo calls. Use domain services and adapters.
- Keep domain modules provider-independent where practical.

## 7. System of Record

Data must have one authoritative owner. Do not create two independently editable sources of truth.

| Data or operation | Authoritative owner | Website responsibility |
| --- | --- | --- |
| Editorial articles | Website CMS | Author, preview, publish, render, index |
| Brand and SEO content | Website CMS | Own and render |
| Public media | R2/public | Store and deliver optimized derivatives |
| Customer/contact | Odoo | Capture safely, enqueue, sync, retain local operational reference |
| CRM lead/opportunity | Odoo | Create idempotently from RFQ |
| Commercial product | Odoo | Store a public projection in D1 |
| Product variant/attribute/UOM | Odoo | Store a public projection in D1 |
| Product SEO overlay | Website | Own slug, copy, metadata, FAQ, media, internal links, index policy |
| Commercial/current price | Odoo | Store a cacheable public projection and update time in D1 |
| Public price history | Approved synchronized projection | Render only verified records according to `PRICING_SYSTEM.md` |
| RFQ first capture | Website operational database | Persist durably before acknowledgment |
| RFQ commercial workflow | Odoo | Synchronize idempotently and expose only approved status projection |
| RFQ attachment bytes | Private R2 | Store private object reference; optionally expose an authorized Odoo reference |
| Quotation, sale order, inventory | Odoo | Never recreate as website-owned commercial truth |
| Purchasing, supplier, accounting | Odoo | No public ownership |

If ownership is unclear, stop and consult `SYSTEM_OF_RECORD.md`. Do not implement dual authoring as a shortcut.

## 8. Odoo Integration Contract

`odoo.ahanassa.com` is a downstream business system, not a synchronous rendering dependency.

### Mandatory adapter boundary

All Odoo access must pass through a server-only adapter, for example:

```text
src/integrations/odoo/
  client
  authentication
  partners
  products
  prices
  rfqs
  quotations
  mapping
  errors
```

The exact folder structure follows `FOLDER_STRUCTURE.md`.

Rules:

- Confirm the deployed Odoo version and enabled modules before selecting an API protocol or field mapping.
- Prefer Odoo JSON-2 when the deployed version supports it and the approved integration specification selects it.
- Keep protocol details inside the adapter so upgrades do not leak into domain or UI code.
- Use a dedicated least-privilege integration user.
- Store API keys and credentials only as Cloudflare secrets.
- Never expose Odoo credentials, internal model names, stack traces, or private identifiers to the browser.
- Define strict timeouts. Never wait indefinitely for Odoo.
- Map fields explicitly according to `ERP_DATA_MAPPING.md`; do not infer custom module fields from names.
- Preserve `external_id`, `odoo_id`, `sync_status`, `sync_version`, `last_synced_at`, and error metadata where the approved schema requires them.
- Redact secrets and personal/commercial data from logs.

### Integration direction

Website → Odoo may include approved customer/contact data, RFQs, RFQ items, safe attachment references, campaign attribution, consent, and source metadata.

Odoo → Website may include approved product projections, variants, attributes, units, public prices, availability labels, update time, and approved RFQ status projections.

Do not expand either direction without updating the system-of-record and mapping documents.

## 9. Durable RFQ Contract

An accepted RFQ must never depend on live Odoo availability.

Required submission behavior:

```text
validate request
  ↓
verify anti-abuse controls
  ↓
finalize private attachments
  ↓
D1 transaction:
  RFQ + items + attachment metadata + outbox event
  ↓
commit succeeds
  ↓
return request ID and acknowledgment
  ↓
dispatcher publishes outbox event
  ↓
Queue consumer syncs to Odoo idempotently
```

The D1 outbox record must be committed in the same transaction as the submitted RFQ. This avoids a failure gap between “database saved” and “queue message sent.” Queue delivery and Odoo processing are still idempotent.

Required properties:

- Generate an opaque, globally unique internal ID and a user-safe request reference.
- Use a stable idempotency key across retries.
- Treat queue delivery as at-least-once and make every consumer safe to repeat.
- Check for an existing Odoo record before creating a new one.
- Use bounded retries with exponential backoff and jitter according to `SYNC_STRATEGY.md`.
- Send exhausted messages to a Dead Letter Queue and expose an operational recovery path.
- Never tell the customer that the Odoo sync succeeded unless it actually succeeded.
- A valid locally committed RFQ may be acknowledged as received even while its Odoo sync is pending.
- Preserve customer input after recoverable validation or upload errors.
- Do not log full RFQs, attachment contents, personal details, tokens, or confidential procurement data.

The RFQ state machine must be explicit. Do not infer state from nullable timestamps. Use only states approved in `RFQ_SYSTEM.md` and `DATABASE_SCHEMA.md`.

## 10. RFQ Item and Upload Requirements

An RFQ supports any approved number of line items within documented safety limits.

Each structured item supports:

- category;
- product;
- size or variant;
- request unit;
- quantity;
- optional description;
- approved product/variant identifiers when selected from the catalog.

Also support:

- free-form items when the requested material is not in the catalog;
- Excel, PDF, and image attachments as allowed by `RFQ_SYSTEM.md`;
- structured items and attachments together;
- separate request unit and commercial price unit where they differ.

Upload rules:

- Private RFQ files belong in the private R2 bucket.
- Private objects are non-public, non-listable, non-indexable, and non-cacheable.
- Use generated object keys; never use raw customer names, phone numbers, or original paths as keys.
- Validate extension, MIME type, signature where applicable, file size, item count, and authorization server-side.
- Sanitize displayed filenames and prevent path traversal.
- Do not make attachment URLs permanent or public.
- Apply malware/security handling specified in `SECURITY_GUIDELINES.md` before operational use.
- Clean abandoned uploads according to the approved retention policy; never invent a retention period.

## 11. Catalog and Pricing Rules

### Catalog

- Odoo owns commercial products, variants, attributes, units, and internal codes.
- D1 contains a website-safe projection optimized for public reading and SEO relationships.
- Website SEO overlays may add slug, title, description, editorial copy, buying guidance, FAQ, imagery, canonical policy, and internal links.
- Link an SEO overlay to commercial data using stable external identifiers, not display names.
- Do not assume every Odoo product deserves an indexable page.
- Do not create thin pages from every product/attribute combination.

### Pricing

- Odoo is the primary commercial price owner.
- Public pages read the approved D1 projection, not Odoo synchronously.
- Do not create independent price editing in both Odoo and the website.
- If the admin offers price operations, they must follow `PRICING_SYSTEM.md`: either a controlled server-side Odoo operation or an explicitly approved override workflow with ownership, expiry, audit, and conflict rules.
- Never silently replace stale price data with fabricated, cached-forever, or guessed values.
- Render the last verified update time and any required price qualification.
- A price sync must invalidate only affected cache entities where possible.
- Keep immutable price history/audit records when required by the approved schema.
- Public `Product` or `Offer` structured data may contain price/availability only when identical verified information is visibly rendered.

## 12. Website CMS and Admin

The website CMS owns articles and SEO/editorial overlays. Odoo must not become the headless editorial CMS unless an approved decision changes the architecture.

The protected admin may include approved modules for:

- dashboard;
- articles and editorial workflow;
- catalog projections and SEO overlays;
- price sync/operations and history;
- RFQ visibility and recovery;
- media;
- users, roles, and settings.

Authorization rules:

- Protect `/admin` with Cloudflare Access and application-level RBAC.
- Use the roles defined in `AUTHORIZATION_ROLES.md`, including Admin, Editor, Price Operator, and Sales Operator where approved.
- Authentication does not replace authorization. Check permission on every server action and route.
- Use deny-by-default permissions.
- Record material admin actions in immutable audit logs.
- Do not trust role, user ID, status, price, or ownership fields supplied by the browser.
- Preview content must be authenticated and must not be indexable or publicly cacheable.

## 13. D1 Data Rules

- Browser code never accesses D1 directly.
- Use the database boundaries and bindings named in `DEPLOYMENT_ARCHITECTURE.md` and `ENVIRONMENT_VARIABLES.md`.
- Preserve the approved separation between public/content data and operational/private data.
- Enable and respect foreign-key enforcement.
- Use migrations for every schema change; never mutate production schema manually as an undocumented fix.
- Migrations must be ordered, reviewable, forward-safe, and tested against representative data.
- Destructive or lossy migrations require explicit approval, backup/recovery planning, and a documented rollback or forward-fix strategy.
- Add indexes for measured or clearly defined access paths, including approved lookups by slug, status, external ID, relationship key, and update time.
- Avoid unbounded scans, N+1 queries, oversized rows, and storing binary files in D1.
- Use UTC timestamps in storage unless a specification explicitly requires another representation.
- Do not rely on application defaults for critical integrity constraints.
- When read replication is enabled, follow the approved Sessions API consistency strategy; do not assume immediate global consistency.

## 14. Rendering Strategy

Choose rendering per route, not globally.

| Page type | Default strategy |
| --- | --- |
| Home and stable public pages | Static or edge-cached HTML |
| Category and indexable product pages | Static/HTML-first with targeted revalidation |
| Articles | Static/HTML-first with targeted revalidation |
| Public price pages | Cached dynamic or revalidated HTML using D1 projection |
| RFQ builder | HTML-first shell plus isolated interactive client components |
| Admin and account pages | Dynamic, authenticated, private, non-cacheable |

Rules:

- Prefer React Server Components and server/static rendering.
- Add client components only for real interaction such as RFQ rows, upload progress, filters, search, or mobile navigation.
- Do not turn an SEO page into a client-rendered application for developer convenience.
- Critical title, description, H1, body content, links, canonical, robots, and structured data must be present in the initial HTML for indexable pages.
- Public rendering must never make a synchronous Odoo request.
- Avoid hydration for content that can remain server-rendered.

## 15. Cache Contract

Follow `CACHING_STRATEGY.md` as the detailed source of truth.

- Application code owns cache semantics. Do not add unmanaged Cloudflare dashboard rules that independently cache all HTML.
- Public and anonymous content may use edge caching, explicit freshness, stale-while-revalidate, and targeted invalidation where approved.
- Authenticated pages, admin content, drafts, previews, RFQ responses, private files, and user-specific responses must be private/no-store and must never share cache entries.
- Never include secrets or personal data in cache keys, tags, headers, or logs.
- Use entity-level tags such as product, category, article, or price identifiers when supported by the approved implementation.
- Purge only affected entities where possible; avoid whole-site purges.
- Define safe behavior for stale or missing projections. Do not fall through to live Odoo during a public request.
- Test HIT, MISS, stale, revalidation, purge, authentication, and failure behavior before release.

## 16. SEO Contract

SEO and performance are architecture constraints from the first implementation, not cleanup tasks after design.

Every indexable page must have:

- a unique and accurate Persian title;
- a useful meta description;
- one canonical URL under `https://www.ahanassa.com`;
- consistent robots directives;
- a clear visible H1 and semantic heading structure;
- crawlable internal links;
- correct HTTP status;
- structured data that matches visible verified content;
- inclusion in the appropriate sitemap only when eligible.

Rules:

- Follow the approved page-to-keyword map and prevent accidental keyword cannibalization.
- Do not create doorway pages, thin programmatic pages, hidden text, or keyword-stuffed copy.
- Price pages must provide genuine utility beyond a number: update time, unit, specifications, available sizes, buying guidance, related products, and relevant internal links as approved.
- Query/filter URLs are non-indexable by default unless an explicit SEO landing-page specification approves them.
- Control faceted navigation, canonicalization, crawl paths, and sitemap inclusion deliberately.
- Generate sitemap indexes by content type when scale requires it and set `lastmod` from meaningful content changes.
- Preview, staging, admin, internal API, draft, search-result, and private routes must not be indexed.
- Route changes require redirect, canonical, internal-link, sitemap, analytics, and backlink-impact review.
- Do not add hreflang or locale routes before the localization plan approves them.

## 17. Structured Data

Use only schema types approved for the actual page and visible content, such as:

- `Organization`;
- `WebSite`;
- `BreadcrumbList`;
- `Article`;
- `Product`;
- `Offer` when verified public price/availability is visibly present.

Never fabricate ratings, reviews, inventory, prices, availability, people, addresses, certifications, or company facts. Validate generated JSON-LD syntactically and against visible page content.

## 18. Performance Contract

The initial project targets are:

```text
LCP   < 2.0 s
INP   < 150 ms
CLS   < 0.05
TTFB  < 500 ms

Lighthouse Performance      95+
Lighthouse SEO              100
Lighthouse Accessibility    95+
Lighthouse Best Practices   95+
```

These are engineering targets under the test conditions defined in `PERFORMANCE_BUDGET.md`, not guarantees for every device or network.

Rules:

- Enforce the route and asset budgets defined in `PERFORMANCE_BUDGET.md`.
- Keep client JavaScript minimal and measure material bundle changes.
- Avoid duplicate fetches, request waterfalls, unnecessary middleware, and uncontrolled third-party scripts.
- Reserve media and dynamic-content dimensions to prevent layout shifts.
- Optimize above-the-fold rendering and do not lazy-load critical content.
- Deliver responsive images from R2 through the approved Cloudflare image pipeline using modern formats when beneficial.
- Never send desktop-size source images to small screens without an approved responsive source strategy.
- Self-host approved fonts as WOFF2, load only required subsets/weights, and preload only truly critical files.
- Use `font-display` according to `FONT_STRATEGY.md` and prevent font-loading layout shifts.
- Measure before and after when claiming a performance improvement.
- A synthetic score must not be improved by hiding, delaying, or removing essential content or accessibility behavior.

## 19. Persian, RTL, and Responsive Requirements

- Set language and direction at the correct root: Persian and RTL.
- Use logical CSS properties where practical.
- Solve shared RTL problems in shared primitives, not duplicated page hacks.
- Numbers, prices, units, phone fields, email, URLs, and filenames must preserve correct local direction inside RTL text.
- Mirror only direction-sensitive icons. Do not mirror logos, media, charts, or universal symbols automatically.
- Keyboard order, visual order, and screen-reader order must remain coherent.
- Support the breakpoints and devices defined in `RESPONSIVE_QA.md`.
- Horizontal page scrolling is prohibited at supported viewport widths.
- Test short and long Persian copy, mixed Persian/Latin text, large quantities, error messages, and empty states.

## 20. Brand and UI Guardrails

Approved core palette:

- **Steel Navy:** `#0B2545`
- **Forge Copper:** `#B04A2F`
- **White:** `#FFFFFF`

Use supporting colors only as defined in approved design documents.

- Copper is a restrained accent, not a dominant large-surface color.
- Use design tokens; do not scatter arbitrary values.
- Preserve clear hierarchy, generous whitespace, and legible Persian typography.
- Reuse approved components before creating variants.
- Interactive components need relevant default, hover, focus, active, loading, success, error, disabled, and empty states.
- Motion must express calm control: restrained, purposeful, fast, and non-blocking.
- Respect `prefers-reduced-motion`.
- Avoid discount-retail visuals, trading dashboards, noisy product grids, fake urgency, industrial clichés, and decorative effects that compete with content.

## 21. Accessibility Baseline

Target WCAG 2.2 AA unless a stricter specification applies.

- Prefer semantic HTML over ARIA.
- Provide complete keyboard operation and visible focus.
- Associate labels, help, validation, errors, and status messages with controls.
- Maintain contrast in every state.
- Use meaningful alternative text; decorative images use empty alt text.
- Preserve heading hierarchy, landmarks, accessible names, and logical reading order.
- Do not communicate meaning through color, motion, position, or icon alone.
- Uploads, dialogs, menus, accordions, filters, and notifications must follow accessible interaction patterns.
- Announce asynchronous RFQ/upload status without stealing focus unexpectedly.

## 22. Security and Privacy Baseline

- Validate all untrusted input on the server with the approved schema library.
- Use Turnstile, rate limiting, payload limits, and abuse controls according to `SECURITY_GUIDELINES.md`.
- D1, private R2, Queues, Odoo, and admin services are server-only.
- Use environment variables and bindings exactly as documented.
- Never commit or print secrets, passwords, private endpoints, real customer data, or production payloads.
- Never place secrets in public environment variables, client bundles, source maps, analytics, cache keys, error pages, or test fixtures.
- Apply least privilege to Worker bindings, Odoo users, admin roles, and service credentials.
- Use safe response errors for users and structured redacted diagnostics for operators.
- Protect against CSRF where relevant, XSS, injection, unsafe redirects, IDOR, path traversal, content-type confusion, and mass assignment.
- Set security headers and CSP according to the approved policy; do not weaken them to make a feature work.
- Treat invoices, BOMs, contact details, pricing, and procurement information as confidential business data.
- Follow the approved consent, retention, deletion, audit, and incident rules. Never invent policy durations.

## 23. Observability and Recovery

Instrument only approved operational signals:

- Worker errors and latency;
- route and API failure rates;
- D1 latency and failed migrations;
- queue age, retries, backlog, and DLQ count;
- outbox backlog;
- Odoo sync latency and failure category;
- RFQ submission and attachment-finalization failure rates;
- cache HIT ratio and invalidation failures;
- 404 and 5xx trends;
- Core Web Vitals.

Rules:

- Use correlation IDs that do not expose customer data.
- Classify transient, permanent, validation, authorization, mapping, and downstream errors.
- Create actionable logs; do not log complete request bodies.
- Every DLQ flow needs an inspected, authorized, idempotent replay procedure.
- Public pages must degrade safely during Odoo or sync outages.
- Follow `FAILURE_RECOVERY.md`; do not invent a manual production workaround.

## 24. Analytics Rules

- Track only approved events and parameters.
- Never send contact fields, RFQ line descriptions, quantities tied to identity, file names, file contents, or attachment URLs to analytics.
- Keep consent behavior consistent with the approved privacy design.
- Centralize event names and schemas.
- Test that conversion events fire once at the correct confirmed milestone.
- An RFQ analytics success event must not imply Odoo sync success unless that is the event's explicit definition.

## 25. Engineering Rules

- Follow repository tooling, `STACK.md`, package scripts, and the lockfile.
- Do not introduce a second router, styling system, form system, validation library, ORM, state library, testing system, or data-fetching convention without approval.
- Keep routes thin. Put business rules in typed domain/application services.
- Keep providers behind ports/adapters.
- Centralize route definitions, schemas, metadata helpers, cache tags, permissions, event names, and error categories.
- Avoid duplicated business logic and provider-specific logic in UI components.
- Prefer explicit types and discriminated results over unsafe types and thrown strings.
- Do not suppress type, lint, hydration, accessibility, security, or build errors to obtain a pass.
- Do not silently swallow failures.
- Avoid environment-specific hardcoding.
- Preserve stable public APIs and data contracts unless a breaking change is explicitly approved.
- Do not add dependencies when the approved stack can solve the problem cleanly.

Before adding or upgrading a dependency:

1. Confirm the need.
2. Check Cloudflare Workers and framework compatibility.
3. Review bundle, security, maintenance, license, and lockfile impact.
4. Add or update compatibility tests.
5. Obtain approval when deployment, architecture, or long-term maintenance changes.

## 26. Repository Discovery and Change Safety

Before editing:

1. Inspect Git status and preserve unrelated work.
2. Discover the package manager, commands, framework, bindings, and versions from repository files.
3. Locate existing components, schemas, services, adapters, migrations, tests, tokens, and content models.
4. Search for every affected route, translation key, metadata entry, cache tag, schema, analytics event, and test.
5. Determine whether a file is generated before editing it.
6. Check `DO_NOT_CHANGE.md` before touching protected assets, infrastructure, or public contracts.

Never overwrite, revert, delete, or reformat unrelated user work. Never use destructive Git commands unless the user explicitly authorizes the exact operation.

## 27. Scope and Planning Rules

For non-trivial work, the plan must name:

- affected subsystems and likely files;
- governing documents;
- data owner and integration direction;
- implementation sequence;
- tests and release checks;
- risks, assumptions, and owner decisions.

Then:

- stay within the requested scope;
- prefer the smallest coherent solution;
- avoid opportunistic redesign, refactoring, upgrades, or cleanup;
- make reversible choices when a non-material assumption is necessary;
- ask before any decision that materially changes architecture, security, data ownership, public claims, retention, product behavior, or irreversible work.

## 28. Validation Requirements

Discover exact commands from repository scripts and documentation. Do not invent command names.

Run applicable checks for:

1. formatting;
2. linting;
3. static types;
4. unit tests;
5. component/integration tests;
6. D1 migration and constraint tests;
7. queue idempotency, retry, and DLQ behavior;
8. Odoo adapter contract tests with sanitized fixtures;
9. production build for the Cloudflare target;
10. local Worker/runtime compatibility;
11. end-to-end critical journeys;
12. responsive and RTL behavior;
13. keyboard and accessibility behavior;
14. metadata, canonical, robots, sitemap, and structured data;
15. cache HIT/MISS/revalidation/purge/privacy behavior;
16. RFQ validation, upload, duplicate, outage, retry, and acknowledgment states;
17. runtime, console, hydration, and broken-link errors;
18. performance budgets for changes affecting rendering or bundles.

Testing rules:

- Add or update tests when behavior changes.
- Test contracts and outcomes, not private implementation details.
- Never delete, skip, weaken, or rewrite a legitimate test merely to pass CI.
- Use sanitized deterministic fixtures; never copy production customer or Odoo data.
- Simulate Odoo timeout, duplicate queue delivery, partial mapping failure, and exhausted retry for integration changes.
- A successful build alone does not validate UI, accessibility, SEO, cache, RFQ, or failure behavior.
- If a check cannot run, state the exact reason and what remains unverified.

## 29. Visual QA Protocol

For user-facing changes:

- inspect the rendered result, not just source code;
- verify representative mobile, tablet, laptop, desktop, and wide layouts;
- test long/short Persian text, mixed-direction content, empty data, loading, validation, offline/retry, and failure states;
- verify no clipping, overlap, content jump, broken wrapping, or horizontal overflow;
- compare with approved design tokens and references;
- verify hover, focus, active, disabled, and reduced-motion states;
- confirm the primary RFQ CTA remains clear without making the site feel like a marketplace.

Do not mark visual work complete based only on compilation.

## 30. Documentation and Decision Hygiene

- Update specifications when an approved change alters their contract; do not let code become the only documentation.
- Update `TASKS.md` only when task status actually changes.
- Update `CHANGELOG.md` for user-visible or operationally meaningful completed work according to project convention.
- Add durable product, architecture, integration, data, security, or SEO decisions to `DECISIONS.md`.
- Do not record routine implementation details as architecture decisions.
- Keep `SYSTEM_OF_RECORD.md`, `ERP_DATA_MAPPING.md`, `DATABASE_SCHEMA.md`, `ENVIRONMENT_VARIABLES.md`, and integration tests aligned.
- If Odoo modules or field mappings are not confirmed, mark them unresolved; never present a guessed mapping as final.
- Do not duplicate full specifications in this file. Link to the authoritative document and keep this file focused on operating constraints.

## 31. Git and Delivery Rules

- Inspect Git status before and after work.
- Keep diffs focused and avoid unrelated formatting churn.
- Do not change branches, amend, force-push, rewrite history, merge, commit, tag, or deploy unless explicitly requested.
- Do not modify lockfiles unless dependency resolution genuinely changes.
- Do not deploy previews with indexable settings.
- Production deployment requires applicable pre-deploy checks, migrations, secrets/bindings verification, rollback readiness, and post-deploy verification.
- Never run destructive production data operations without explicit approval and a verified target.

## 32. Protected Actions and Stop Conditions

Stop and request direction before:

- changing brand identity, positioning, slogan, logo, palette, or primary conversion model;
- introducing marketplace, cart, checkout, public inventory, supplier listing, or speculative trading behavior;
- changing system-of-record ownership or creating dual authoring;
- making public rendering or RFQ acceptance depend synchronously on Odoo;
- changing the framework adapter, package manager, ORM, deployment architecture, authentication system, or primary database boundary;
- adding a locale, major public route family, external vendor, or analytics platform;
- changing consent, retention, deletion, upload privacy, legal language, or security posture;
- performing a destructive migration or deleting production/customer data;
- publishing, deploying, merging, pushing, or contacting external parties without authorization;
- resolving a material conflict between approved documents;
- making a public business claim without verified evidence.

Also obey every restriction in `DO_NOT_CHANGE.md`.

## 33. Definition of Done

A task is complete only when all applicable statements are true:

- The requested outcome is fully implemented within scope.
- Governing specifications and system-of-record rules are satisfied.
- Odoo downtime cannot break public rendering or durable RFQ acceptance.
- Relevant idempotency, retry, recovery, and privacy behavior is implemented and tested.
- Brand positioning and the consultation-led RFQ journey remain intact.
- Persian, RTL, responsive, accessibility, SEO, security, cache, and performance implications are checked.
- Relevant edge cases and states are handled.
- Relevant tests pass and the Cloudflare-target production build passes when affected.
- User-facing work is rendered and visually inspected.
- No unrelated changes, fabricated facts, unapproved dependencies, or duplicate sources of truth were introduced.
- Documentation, tasks, decisions, and changelog are updated when warranted.
- The handoff accurately states validation and remaining limitations.

## 34. Required Handoff Format

End completed implementation work with:

### Outcome

What now works or was delivered.

### Changed

The important files, contracts, and behavior changed.

### Validation

The commands and manual checks actually completed, with results.

### Remaining

Only genuine limitations, blocked checks, unresolved decisions, or safe next steps. Omit this section when nothing remains.

Never claim a test, build, browser check, deployment, sync, migration, or performance improvement that was not actually completed.

## 35. Task Start Checklist

- [ ] I understand the requested outcome and boundaries.
- [ ] I read this file and all relevant governing documents.
- [ ] I checked `DO_NOT_CHANGE.md`, `TASKS.md`, and `DECISIONS.md`.
- [ ] I inspected the working tree and existing implementation.
- [ ] I identified the system of record for every affected datum.
- [ ] I identified Odoo, queue, cache, security, privacy, SEO, and failure implications.
- [ ] I found reusable patterns and affected contracts.
- [ ] I have a validation plan proportional to the change.

## 36. Task Completion Checklist

- [ ] The result meets the request and approved specifications.
- [ ] No unsupported claims, prices, inventory, suppliers, or content were invented.
- [ ] No new synchronous dependency on Odoo was introduced.
- [ ] Durable persistence, idempotency, retry, and recovery were checked where relevant.
- [ ] RTL, responsive behavior, and accessibility were checked where relevant.
- [ ] SEO, analytics, cache, security, privacy, and performance were checked where relevant.
- [ ] Relevant automated checks and the production build pass, or blocked checks are disclosed.
- [ ] User-facing changes were rendered and visually verified.
- [ ] The diff is focused and unrelated work is preserved.
- [ ] Required project documentation is current.
- [ ] The final handoff is accurate and concise.

---

**Final operating principle:** Protect the client's trust, capital, data, and time. Odoo owns commercial truth; Cloudflare provides the fast and resilient web layer; the public site never depends on a live ERP response; SEO, performance, security, and failure recovery are designed from the first line of implementation.
