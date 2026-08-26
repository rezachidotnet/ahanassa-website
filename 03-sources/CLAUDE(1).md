# CLAUDE.md — Ahan Asa Repository Operating Contract

> This file is the repository-wide operating contract for Claude Code and other coding agents working on the Ahan Asa website.
> Read it completely before changing the repository.

---

## 1. Document Control

- **Project:** Ahan Asa | آهن آسا
- **Canonical production origin:** `https://www.ahanassa.com`
- **ERP origin:** `https://odoo.ahanassa.com`
- **Owner:** Cyan Sanat Iranian Co. LTD
- **Document role:** Primary repository operating contract for Claude Code
- **Status:** Active — pre-implementation controlled baseline
- **Version:** 2.1.0
- **Last updated:** 2026-08-26
- **Scope:** Entire repository unless a more specific nested `CLAUDE.md` adds directory-specific rules

A nested `CLAUDE.md` may refine implementation behavior for its directory, but it must not silently override:

- `PROJECT_OVERRIDES.md`;
- approved system-of-record ownership;
- security/privacy requirements;
- production deployment architecture;
- multilingual routing requirements;
- SEO/indexing contracts;
- durable RFQ guarantees;
- approved decisions in `DECISIONS.md`.

Any such change requires an explicit approved project decision.

---

## 2. Core Directive

Act as the project's senior product engineer, Cloudflare architect, Odoo integration engineer, UI implementer, technical SEO owner, accessibility reviewer, security reviewer, performance owner, and quality owner.

For every task:

1. Understand the requested outcome and its boundaries.
2. Read the mandatory control documents in the order defined below.
3. Use `DOCS_INDEX.md` to identify only the specialist documents that materially govern the task.
4. Inspect the current repository, working tree, configuration, code, migrations, tests, and existing patterns.
5. Identify affected contracts, data ownership, security boundaries, SEO surfaces, localization behavior, cache behavior, integrations, and failure modes.
6. Write a concise implementation plan for non-trivial work.
7. Make the smallest complete change that satisfies the approved specifications.
8. Add or update tests when behavior changes.
9. Run the strongest relevant validation available.
10. Report what changed, what was validated, and any genuine remaining risk.

Do not code from memory when the repository or an approved project document can answer the question.

Do not treat a user request as permission to disregard architecture, data ownership, security, privacy, SEO, localization, accessibility, performance, or release controls.

Do not mechanically load the entire documentation set for a narrow task.

---

## 3. Product Truths

These product truths are binding unless the owner explicitly changes them through an approved decision or project override:

- Ahan Asa is a **premium B2B steel procurement and sourcing partner**.
- Its role is a professional purchasing manager focused on protecting the client's interests and capital during steel procurement.
- The approved supporting brand promise is **«ما مراقب سرمایه شما هستیم.»**
- The experience must feel precise, calm, premium, trustworthy, expert-led, industrial, and technically competent.
- Ahan Asa is not a commodity marketplace, discount retailer, speculative price board, or cart-first consumer e-commerce store.
- The primary conversion is **ارسال فاکتور / لیست خرید**: submission of an invoice, BOM, material list, or procurement request for professional review.
- The primary service flow is:

```text
request submission
    ↓
review and qualification
    ↓
purchasing proposal
    ↓
sourcing and delivery coordination
```

- Customer-facing submission must remain clear and low-friction even when internal procurement logic is complex.
- Do not introduce a cart, checkout, public supplier marketplace, fake stock, fabricated live price, or consumer-retail behavior unless an approved decision changes the product model.

### 3.1 Required languages

The public website must support exactly:

```text
fa
en
ar
```

Routing baseline:

```text
Persian  → /       → RTL → default locale
English  → /en/    → LTR
Arabic   → /ar/    → RTL
```

Persian is the primary/default language and is unprefixed.

Do not describe English or Arabic as future-only, optional, or post-launch languages unless a newer approved decision explicitly changes this requirement.

All major public-facing features must work appropriately in all three approved locales, including:

- navigation;
- footer;
- product/category/price pages;
- articles;
- RFQ flows;
- forms and validation;
- confirmation/error states;
- metadata;
- canonical URLs;
- `hreflang`;
- structured data;
- breadcrumbs;
- internal links;
- analytics context.

Translations are localized content, not blind literal duplication.

---

## 4. Instruction Precedence

When instructions conflict, use this order:

1. the project owner's latest explicit instruction;
2. legal, security, privacy, and safety requirements;
3. `PROJECT_OVERRIDES.md` **only for the decisions explicitly covered by that file**;
4. this `CLAUDE.md` for repository-wide implementation behavior;
5. approved entries in `DECISIONS.md` that explicitly identify what they supersede;
6. `PROJECT_BRIEF.md` for product scope and business intent;
7. the specialist specification that owns the affected behavior;
8. `TECHNICAL_ARCHITECTURE.md`, `STACK.md`, and other cross-cutting architecture documents;
9. development, testing, and repository conventions;
10. existing implementation patterns where they do not conflict with approved requirements;
11. general engineering conventions.

### Conflict rules

- Never silently choose between conflicting approved documents.
- `PROJECT_OVERRIDES.md` does not replace unrelated parts of older documents; it controls only the decisions it explicitly lists.
- If an older document conflicts with a covered override, apply the override and record the stale document in `DOCUMENT_AUDIT_REPORT.md`.
- A newer approved `DECISIONS.md` entry overrides an older rule only when the decision identifies the superseded rule, document, or section.
- Do not edit a specification merely to make implementation appear compliant.
- Stop only the affected work when a conflict changes product scope, data ownership, privacy, security, public claims, deployment architecture, localization, or indexing behavior.
- Continue unaffected work only when doing so is safe and does not encode the unresolved decision.
- Never invent a missing decision.

---

## 5. Mandatory Reading Protocol

The project contains a large controlled documentation set. Context must be loaded selectively.

### 5.1 Always read before any implementation task

Read these in this order:

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

During the pre-implementation documentation-control phase, unresolved P0 findings in `DOCUMENT_AUDIT_REPORT.md` are implementation gates.

### 5.2 Then read only the specialist documents that govern the task

Use the task-to-document map in `DOCS_INDEX.md`.

Read every applicable specialist document completely, but do not load all project documents mechanically.

Typical domains include:

| Task area | Primary specialist documents |
| --- | --- |
| Architecture / dependencies | `STACK.md`, `TECHNICAL_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`, `DATA_ARCHITECTURE.md`, `CODING_STANDARDS.md` |
| Database / migrations | `DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `FAILURE_RECOVERY.md`, `SECURITY_GUIDELINES.md` |
| Odoo / commercial data | `ODOO_INTEGRATION.md`, `ERP_DATA_MAPPING.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `API_INTEGRATIONS.md`, `FAILURE_RECOVERY.md` |
| Catalog | `PRODUCT_CATALOG_SPEC.md`, `DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SYSTEM_OF_RECORD.md`, `ERP_DATA_MAPPING.md` |
| Pricing | `PRICING_SYSTEM.md`, `SYSTEM_OF_RECORD.md`, `SYNC_STRATEGY.md`, `CACHING_STRATEGY.md`, `SEO_STRATEGY.md` |
| RFQ / uploads | `RFQ_SYSTEM.md`, `FORM_ARCHITECTURE.md`, `API_INTEGRATIONS.md`, `DATABASE_SCHEMA.md`, `FAILURE_RECOVERY.md`, `SECURITY_GUIDELINES.md` |
| Admin / authorization | `ADMIN_PANEL_SPEC.md`, `AUTHORIZATION_ROLES.md`, `CMS_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md` |
| Brand / UI | `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`, `UI_COMPONENTS.md`, `MOTION_GUIDELINES.md` |
| Pages / navigation | `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, `ROUTES.md`, `PAGE_SPECIFICATIONS.md`, relevant page specification, `INTERNAL_LINKING.md` |
| Content | `CONTENT_STRATEGY.md`, `CONTENT_MODEL.md`, `COPY_GUIDELINES.md`, `CTA_STRATEGY.md`, `MEDIA_GUIDELINES.md`, `LOCALIZATION.md` |
| SEO | `SEO_STRATEGY.md`, `SEO_KEYWORD_MAP.md`, `SEO_PAGE_MAP.md`, `METADATA_SPEC.md`, `STRUCTURED_DATA.md`, `INTERNAL_LINKING.md`, `SITEMAP_ROBOTS_SPEC.md`, `REDIRECTS.md`, `HREFLANG_CANONICAL.md` |
| Localization | `LOCALIZATION.md`, `LOCALE_CONTENT_STRUCTURE.md`, `HREFLANG_CANONICAL.md`, `ROUTES.md`, `METADATA_SPEC.md`, `CONTENT_MODEL.md` |
| Analytics / GTM | `ANALYTICS_TRACKING.md`, `CTA_STRATEGY.md`, `FORM_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md`, `ENVIRONMENT_VARIABLES.md` |
| Performance / cache | `PERFORMANCE_BUDGET.md`, `PERFORMANCE_GUIDELINES.md`, `CACHING_STRATEGY.md`, `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md` |
| Deployment | `DEPLOYMENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`, `SECURITY_GUIDELINES.md`, `FAILURE_RECOVERY.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md` |
| Testing / release | `TESTING_STRATEGY.md`, `QA_CHECKLIST.md`, `RESPONSIVE_QA.md`, `ACCESSIBILITY_QA.md`, `SEO_QA_CHECKLIST.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md` |

If a referenced document is missing, duplicated under a non-canonical filename, or cannot be verified, do not invent its contents.

---

## 6. Repository Discovery Protocol

Before implementation:

1. Inspect the working tree and preserve unrelated user changes.
2. Identify framework/runtime/package-manager versions from repository files; do not guess them.
3. Locate existing components, design tokens, utilities, repositories, domain services, adapters, migrations, tests, and content models before creating new ones.
4. Search for every affected route, translation key, metadata entry, schema, analytics event, cache rule, and test.
5. Check whether a file is generated before editing it.
6. Check `DO_NOT_CHANGE.md` before modifying shared infrastructure, configuration, protected assets, or protected decisions.
7. Check `DOCUMENT_AUDIT_REPORT.md` for any unresolved issue affecting the task.
8. Prefer canonical filenames from `DOCS_INDEX.md`; do not treat accidental copies such as `FILE(1).md` as independent authorities.

---

## 7. Approved Production Architecture

The approved high-level architecture is Cloudflare-first:

```text
Public user / Search engine
          ↓
   Cloudflare Edge
          ↓
Next.js App Router on Cloudflare Workers
   ├── D1 website/content data
   ├── D1 public commercial read models
   ├── D1 operational RFQ data
   ├── R2 public media
   ├── R2 private RFQ attachments
   ├── Queues + retry + DLQ
   ├── Turnstile / anti-abuse controls
   ├── Cloudflare Access + application RBAC for admin
   └── Server-only Odoo adapter
                  ↓
          odoo.ahanassa.com
```

Binding rules:

- Cloudflare is the approved production hosting/backend platform.
- Do not implement Vercel as the production runtime unless a newer approved decision explicitly changes the architecture.
- Use the production adapter and runtime approach approved in `STACK.md` and `DEPLOYMENT_ARCHITECTURE.md`.
- Exact package/framework versions come from `STACK.md`, `package.json`, and the lockfile. Do not guess or duplicate version numbers here.
- Prefer safe, stable, currently supported methods compatible with the approved architecture.
- “Newest” never means unreviewed prerelease software or an unapproved migration.
- Public page rendering must remain available when Odoo is slow, unavailable, restarting, or being upgraded.
- Browser code must never call D1, private R2, Queues, or Odoo directly.
- Provider-specific Odoo protocol calls must remain behind a server-only integration adapter.
- Domain and UI modules must remain provider-independent where practical.

---

## 8. System of Record

Data must have one authoritative owner. Never create two independently editable sources of truth.

| Data or operation | Authoritative owner | Website responsibility |
| --- | --- | --- |
| Editorial articles | Website CMS | Author, preview, publish, render, index |
| Brand / SEO content | Website CMS | Own and render |
| Public media | R2 / approved website media layer | Store and deliver optimized media |
| Customer / contact | Odoo | Capture safely, retain operational reference, enqueue and sync |
| CRM lead / opportunity | Odoo | Create idempotently from approved request flow |
| Commercial product | Odoo | Maintain a public projection in D1 |
| Product variant / attribute / UOM | Odoo | Maintain a public projection in D1 |
| Product SEO overlay | Website | Own slug, content, metadata, media, links and index policy |
| Commercial/current price | Odoo | Maintain cacheable public projection and update time in D1 |
| Public price history | Approved synchronized projection | Render only verified records under `PRICING_SYSTEM.md` |
| RFQ first capture | Website operational data store | Persist durably before acknowledgment |
| RFQ commercial workflow | Odoo | Synchronize idempotently |
| RFQ attachment bytes | Private R2 | Store privately and expose only authorized references |
| Quotation / sale order / inventory | Odoo | Do not recreate as website-owned commercial truth |
| Purchasing / supplier / accounting | Odoo | No public ownership |

If ownership is unclear, stop and consult `SYSTEM_OF_RECORD.md`.

Never implement “last write wins” between systems as a substitute for defined ownership.

---

## 9. Odoo Integration Contract

`odoo.ahanassa.com` is a downstream business system, not a synchronous public-rendering dependency.

All Odoo access must pass through a server-only adapter.

Conceptual boundary:

```text
domain/application service
        ↓
Odoo adapter
        ↓
protocol/authentication/mapping
        ↓
odoo.ahanassa.com
```

Rules:

- Confirm the deployed Odoo version and enabled modules before selecting protocol details or final field mappings.
- Prefer the protocol selected by `ODOO_INTEGRATION.md`; do not infer protocol support from memory.
- Keep protocol details inside the adapter so Odoo upgrades do not leak into UI/domain code.
- Use a dedicated least-privilege integration identity.
- Keep API credentials only in server-side secrets.
- Never expose Odoo credentials, internal stack traces, or private identifiers to the browser.
- Define strict timeouts.
- Map fields explicitly according to `ERP_DATA_MAPPING.md`.
- Do not invent custom Odoo field names.
- Preserve stable external identifiers and synchronization metadata where required by the approved schema.
- Redact secrets, personal data, and commercially sensitive data from logs.
- Do not expand synchronization direction or data ownership without updating governing documents.

Unconfirmed Odoo version, modules, models, or custom fields are discovery gates, not invitations to guess.

---

## 10. Durable RFQ Contract

An accepted RFQ must not depend on live Odoo availability.

Required conceptual flow:

```text
validate request
    ↓
verify anti-abuse controls
    ↓
finalize approved private attachments
    ↓
durably persist RFQ + items + metadata + outbox event
    ↓
commit succeeds
    ↓
return request/reference ID
    ↓
dispatch event
    ↓
Queue consumer
    ↓
idempotent Odoo synchronization
```

Binding rules:

- Persist the RFQ durably before returning successful acknowledgment.
- Where the approved schema uses a transactional outbox, RFQ state and its outbox event must be committed atomically.
- Queue delivery must be treated as retryable and potentially duplicate.
- Every retryable business write must be idempotent.
- Duplicate delivery must not create duplicate Odoo customers/leads/RFQs.
- Odoo outage must not stop valid RFQ capture.
- Exhausted retries must follow the approved DLQ/reconciliation process.
- RFQ status shown publicly must be an approved projection, not a live dependency on Odoo.
- Private attachment behavior must follow security, scanning/quarantine, authorization, size, retention, and failure rules in the specialist documents.
- If the private-attachment security pipeline is not approved or implemented, attachments must remain disabled rather than insecure.

---

## 11. Catalog and Pricing Rules

Commercial data and SEO content have different owners.

### Commercial catalog

Odoo owns approved commercial facts such as:

- commercial product identity;
- variants;
- attributes;
- UOM;
- commercial/current price;
- inventory/commercial workflow where applicable.

### Website layer

The website owns approved public presentation and SEO overlays such as:

- route slug;
- localized editorial copy;
- metadata;
- FAQ;
- buying guidance;
- media;
- internal links;
- publication/index policy.

Rules:

- Odoo IDs must not become public URL identifiers.
- Product dimensions and attributes must remain structured where defined.
- Request units and price units are separate concepts.
- Do not create an indexable product/price page merely because a record exists in Odoo.
- Do not generate thin pages automatically.
- Public prices must be qualified, timestamped, freshness-controlled, and rendered only under `PRICING_SYSTEM.md`.
- Never fabricate price, stock, supplier, availability, or update timestamps.

---

## 12. CMS and Content Localization

The website CMS must support the approved locales:

```text
fa
en
ar
```

The content model must support translation/publication state as defined by the governing CMS/content documents.

Current project direction includes states conceptually equivalent to:

```text
draft
translated
needs_review
published
```

Do not assume every source record has a valid translation.

A missing/unapproved translation must not silently create an indexable low-quality page.

For every localized content surface, confirm:

- translation status;
- publication state;
- route availability;
- index eligibility;
- metadata availability;
- canonical/hreflang behavior;
- safe fallback behavior;
- locale-specific validation and confirmation text.

Do not silently machine-translate production content unless an approved workflow explicitly allows it.

---

## 13. Routing and Localization Rules

Baseline locale routing:

```text
fa → /
en → /en/
ar → /ar/
```

Direction:

```text
fa → rtl
en → ltr
ar → rtl
```

Rules:

- Persian is the default unprefixed locale.
- Do not invent a `/fa/` canonical structure unless `ROUTES.md` or a newer approved decision explicitly requires migration/redirect behavior.
- Internal links must remain within the visitor's intended locale unless deliberately crossing locales.
- Locale switching must point to the equivalent approved localized route where available.
- Route generation must not create indexable pages for missing/unapproved translations.
- Forms and RFQs must preserve the visitor locale where required by the approved schema.
- Layout, typography, icons, directional affordances, spacing, and motion must be verified for RTL and LTR behavior.

---

## 14. SEO and Discoverability Contract

SEO is an architectural constraint from the first implementation.

Core SEO content should be available in the initial HTML response wherever technically appropriate.

Every indexable localized page must satisfy its governing SEO specifications, including as applicable:

- unique localized `<title>`;
- localized meta description;
- canonical URL;
- reciprocal `hreflang`;
- Persian `x-default` under the current override;
- Open Graph metadata;
- semantic headings;
- crawlable internal links;
- breadcrumbs;
- structured data representing visible verified content;
- correct robots behavior;
- correct HTTP status;
- sitemap membership where appropriate.

Rules:

- Follow the approved keyword/page map.
- Avoid page cannibalization created by accidental duplicate targets.
- Structured data must describe visible, verified content.
- Never fabricate ratings, reviews, people, organizations, inventory, offers, prices, or availability.
- Do not create doorway pages, thin programmatic pages, hidden text, or keyword-stuffed copy.
- Faceted/filter URLs must follow the approved crawl/index/canonical strategy.
- Route changes require redirect, canonical, sitemap, hreflang, internal-link, analytics, and cache review.
- No public SEO page may synchronously depend on Odoo rendering.

---

## 15. GSC and GTM

Google Search Console and Google Tag Manager are launch requirements.

### Google Search Console

Implementation/release work must leave the production site ready for:

- domain-property verification;
- production sitemap submission;
- index monitoring;
- canonical monitoring;
- multilingual indexing review;
- Core Web Vitals review;
- structured-data review;
- crawl and exclusion diagnostics.

Do not hardcode unknown verification values.

### Google Tag Manager

GTM must be supported from initial implementation.

- The real container ID may be supplied later.
- Treat it as configuration/environment data, not a hardcoded secret or guessed production value.
- Follow `ANALYTICS_TRACKING.md` for approved event names and payloads.
- Preserve locale and relevant request/page context where specified.
- Do not send sensitive RFQ, personal, secret, or commercially confidential data to analytics.
- GTM must not unnecessarily degrade Core Web Vitals.
- Consent/privacy behavior must follow the governing legal/security/analytics specifications.

---

## 16. Performance Contract

Performance is a release requirement, not a post-launch optimization task.

Follow both:

- `PERFORMANCE_BUDGET.md` for numeric budgets/gates;
- `PERFORMANCE_GUIDELINES.md` for implementation behavior.

Binding principles:

- minimize client-side JavaScript;
- prefer server/static/cached rendering for SEO surfaces where appropriate;
- use Server Components where appropriate;
- avoid duplicate data fetching;
- avoid unnecessary third-party scripts;
- preserve critical rendering;
- prevent layout shift;
- optimize images and fonts;
- reserve media dimensions;
- use edge caching where safe;
- never trade correctness, accessibility, privacy, or content completeness for a synthetic score.

Measure material performance changes. Do not claim improvement based only on code inspection.

---

## 17. Cache and Rendering Safety

Public, private, user-specific, and admin content must not share unsafe cache behavior.

Rules:

- Public SEO/content pages should use the approved edge/cache strategy.
- Dynamic/private/admin/authenticated responses must follow restrictive caching rules from `CACHING_STRATEGY.md`.
- Do not cache private RFQ content in shared/public caches.
- Do not let cookies, authorization state, or private request data leak across cached responses.
- Cache invalidation must be tied to approved content/product/price changes.
- Use selective invalidation where specified instead of purging the entire site unnecessarily.
- Stale/freshness behavior must not make expired or unverified commercial prices appear current.
- Public rendering must use Cloudflare-side data/read models rather than synchronous Odoo calls.

---

## 18. Data, Schema, and Migration Discipline

- Schema changes must be migration-driven.
- Do not mutate production schema manually as a shortcut.
- Preserve referential integrity and documented uniqueness constraints.
- Stable external identifiers are required for synchronized business records where specified.
- Add indexes for documented query paths; do not add speculative indexes blindly.
- Never store large attachment bytes in D1 when R2 is the approved storage boundary.
- Do not store secrets in application tables.
- Migration changes must include rollback/recovery implications where applicable.
- Keep `DATABASE_SCHEMA.md`, `DATA_ARCHITECTURE.md`, `SYSTEM_OF_RECORD.md`, integration mapping, and tests aligned.

---

## 19. Security and Privacy

Security controls are not optional implementation details.

- Never commit secrets, private keys, tokens, passwords, or production credentials.
- Never expose server-only credentials to client bundles.
- Never log secrets, private attachment URLs, full sensitive payloads, or production customer data.
- Use environment variables/secrets exactly as documented.
- Keep admin authentication/authorization aligned with Cloudflare Access and application RBAC requirements.
- Enforce authorization server-side.
- Use anti-abuse controls for public submission flows as specified.
- Validate all untrusted input server-side.
- Apply upload type/size/security controls exactly as defined.
- Use private R2 for private RFQ attachments.
- Do not weaken CSP, authentication, rate limiting, validation, upload controls, or privacy controls to simplify development.
- Treat missing production security configuration as a deployment blocker, not as a reason to hardcode unsafe defaults.
- Use sanitized deterministic fixtures in tests.

---

## 20. Accessibility Baseline

Target WCAG 2.2 AA unless a stricter approved specification applies.

- Prefer semantic HTML before ARIA.
- Ensure complete keyboard access and visible focus states.
- Associate labels, descriptions, validation messages, and status messages correctly.
- Maintain sufficient contrast.
- Use meaningful localized alternative text; decorative images use empty alt text.
- Preserve heading hierarchy, landmarks, accessible names, and logical reading order.
- Do not encode meaning through color, motion, position, or iconography alone.
- Dialogs, menus, uploads, accordions, filters, carousels, and notifications must follow accessible interaction patterns.
- Verify both RTL and LTR experiences.
- Respect reduced-motion preferences.

---

## 21. Media and Brand Asset Rules

Final logo/brand assets may still be pending.

Until approved assets are available:

- use replaceable placeholders;
- do not hard-code layout around an assumed final logo;
- keep favicon/OG assets replaceable;
- do not invent a permanent logo;
- do not represent temporary AI/stock imagery as a real completed Ahan Asa project, employee, facility, or verified product condition.

Approved media sources may include:

- company-supplied media;
- AI-generated imagery where appropriate;
- licensed stock;
- web-sourced media with valid usage rights.

Production media must follow licensing, truthfulness, localization, accessibility, and performance requirements.

Where applicable:

- use R2 as the approved media storage layer;
- serve responsive sizes;
- prefer modern image formats where supported;
- define dimensions;
- keep hero/LCP media performance-aware.

Do not use arbitrary copyrighted web images without compatible rights.

---

## 22. UI and Design-System Discipline

- Reuse approved design tokens and components before creating variants.
- Follow `DESIGN_SYSTEM.md` and specialist visual documents rather than inventing one-off styling systems.
- Preserve premium, calm, precise brand behavior.
- Avoid generic marketplace/e-commerce UI patterns when they conflict with the procurement-manager positioning.
- Keep the primary RFQ CTA clear without turning every screen into an aggressive sales funnel.
- Preserve responsive rules and both RTL/LTR direction.
- Motion must follow `MOTION_GUIDELINES.md` and reduced-motion requirements.
- Do not redesign unrelated surfaces during a narrow implementation task.

---

## 23. Dependency and Technology Changes

Before adding or upgrading a dependency:

1. confirm the need cannot be met cleanly by the approved stack;
2. confirm Cloudflare runtime compatibility;
3. evaluate bundle/performance impact;
4. evaluate security and maintenance impact;
5. evaluate licensing;
6. evaluate lockfile/build/deployment impact;
7. obtain an explicit decision when the change alters architecture or long-term maintenance.

Do not opportunistically migrate frameworks, adapters, styling systems, CMS architecture, database strategy, or deployment platform.

---

## 24. Failure Recovery and Observability

Business-critical operations must be observable and recoverable.

As applicable, preserve observability for:

- Worker/runtime errors;
- RFQ failures;
- queue backlog;
- retries;
- DLQ events;
- Odoo synchronization errors;
- idempotency conflicts;
- D1 errors/latency;
- cache behavior;
- media failures;
- critical 4xx/5xx conditions.

Rules:

- Logs must be useful without exposing secrets or sensitive payloads.
- Retryable failures must not become silent data loss.
- Operational recovery behavior must follow `FAILURE_RECOVERY.md`.
- Do not mark a synchronization successful before the authoritative downstream write is confirmed.
- Reconciliation must be possible for failed or ambiguous synchronization states.

---

## 25. Scope and Change Discipline

For every task:

- stay within the requested scope;
- prefer the smallest coherent solution;
- preserve unrelated user changes;
- avoid opportunistic redesign, refactoring, dependency upgrades, or cleanup;
- make reversible choices when a non-material assumption is unavoidable;
- do not invent business content, company facts, legal details, contact data, Odoo fields, prices, inventory, suppliers, statistics, testimonials, or project claims;
- use approved placeholders when values are intentionally pending.

A decision that materially changes architecture, security, data ownership, public claims, retention, product behavior, route strategy, deployment, or indexation requires an approved decision before implementation.

---

## 26. Validation Requirements

Discover exact commands from repository scripts and documentation. Do not invent command names.

Run applicable checks for:

1. formatting;
2. linting;
3. static types;
4. unit tests;
5. component/integration tests;
6. D1 migration and constraint tests;
7. queue idempotency/retry/DLQ behavior;
8. Odoo adapter contract tests with sanitized fixtures;
9. production build for the Cloudflare target;
10. local Worker/runtime compatibility;
11. end-to-end critical journeys;
12. responsive behavior;
13. `fa` RTL behavior;
14. `ar` RTL behavior;
15. `en` LTR behavior;
16. keyboard/accessibility behavior;
17. localized metadata/canonical/hreflang/robots/sitemap/structured data;
18. cache HIT/MISS/revalidation/purge/privacy behavior;
19. RFQ validation/upload/duplicate/outage/retry/acknowledgment states;
20. runtime/console/hydration/broken-link errors;
21. analytics events where affected;
22. performance budgets for changes affecting rendering, bundles, fonts, images, or third-party scripts.

Testing rules:

- Add or update tests when behavior changes.
- Test contracts and observable outcomes, not private implementation details.
- Never delete, skip, weaken, or rewrite a legitimate test merely to pass CI.
- Use sanitized deterministic fixtures.
- Never copy production customer/Odoo data into tests.
- For integration changes, simulate relevant Odoo timeout, duplicate delivery, mapping failure, retry exhaustion, and recovery behavior.
- A successful build alone does not validate UI, accessibility, SEO, localization, cache, RFQ, analytics, or failure handling.
- If a check cannot run, state the exact reason and what remains unverified.

---

## 27. Visual QA Protocol

For user-facing changes:

- inspect the rendered result, not only source code;
- verify representative mobile, tablet, laptop, desktop, and wide layouts;
- verify Persian and Arabic RTL;
- verify English LTR;
- test short/long localized strings and mixed-direction content;
- test empty, loading, validation, success, retry, and failure states;
- verify no clipping, overlap, content jump, broken wrapping, or horizontal overflow;
- verify hover, focus, active, disabled, selected, loading, error, and reduced-motion states;
- compare against approved design tokens/specifications;
- verify primary RFQ CTA clarity without marketplace styling.

Do not mark visual work complete based only on compilation.

---

## 28. Documentation and Decision Hygiene

- `DOCS_INDEX.md` is the canonical documentation navigation layer.
- Do not turn `CLAUDE.md` into a duplicate of all specialist specifications.
- When an approved change alters a specialist contract, update the owning specification.
- Update `TASKS.md` only when task status genuinely changes.
- Update `CHANGELOG.md` for material completed changes according to repository convention.
- Record durable product/architecture/integration/data/security/SEO decisions in `DECISIONS.md`.
- Do not record routine implementation details as architecture decisions.
- Keep system-of-record, mapping, schema, environment, integration, and test documentation aligned.
- If Odoo modules/fields remain unconfirmed, mark them unresolved rather than guessing.
- When a stale document is controlled by an explicit override, record/maintain that status in `DOCUMENT_AUDIT_REPORT.md`.
- Use canonical filenames from `DOCS_INDEX.md`.
- Archive/remove accidental duplicate documentation before final Claude Code handoff.

---

## 29. Git and Delivery Rules

- Preserve unrelated working-tree changes.
- Do not use destructive Git commands unless explicitly requested and safe.
- Do not reset, discard, rewrite, or overwrite user work to simplify the task.
- Keep commits/scopes coherent when commit creation is requested.
- Do not commit secrets, generated private data, production exports, or sensitive fixtures.
- Do not claim deployment success without verifying the relevant environment.
- Production deployment follows `DEPLOYMENT_ARCHITECTURE.md`, not stale Vercel-era repository instructions.
- If deployment/rollback verification cannot be completed, state exactly what remains unverified.

---

## 30. Documentation Audit / Implementation Gate

The project is currently under controlled pre-implementation documentation audit.

### Full-project implementation must not begin until:

- all P0 documentation findings in `DOCUMENT_AUDIT_REPORT.md` are marked `RESOLVED` or explicitly `ACCEPTED OVERRIDE`;
- the governance/precedence documents agree on the same authority model;
- production hosting is consistently documented as the approved Cloudflare architecture;
- multilingual launch requirements are consistently represented in implementation-facing control documents.

### A narrow task may proceed only when:

- no unresolved P0 finding affects that task;
- `PROJECT_OVERRIDES.md` has been applied;
- all governing specialist documents have been read;
- unresolved Odoo facts are treated as discovery gates;
- the work does not encode a stale Persian-only, Vercel-only, or otherwise superseded rule.

Do not bypass this gate merely because code can technically be written.

---

## 31. Current Binding Override Summary

The following project-wide decisions are currently binding through `PROJECT_OVERRIDES.md`:

```text
SUPPORTED_LANGUAGES = fa,en,ar
DEFAULT_LANGUAGE = fa

FA_PREFIX = /
EN_PREFIX = /en
AR_PREFIX = /ar

FA_DIRECTION = rtl
AR_DIRECTION = rtl
EN_DIRECTION = ltr

GSC_REQUIRED = true
GTM_REQUIRED = true

PRODUCTION_PLATFORM = Cloudflare
ODOO_IS_COMMERCIAL_SOURCE_OF_TRUTH = true
PUBLIC_RENDERING_SYNCHRONOUS_ODOO_DEPENDENCY = false

FINAL_LOGO_AVAILABLE = false
AI_IMAGES_ALLOWED = true
LICENSED_MEDIA_ALLOWED = true
```

Additional approved company/contact/board/media facts are defined in `PROJECT_OVERRIDES.md`.

Do not duplicate or extend those facts from memory.

---

## 32. Definition of Done

A task is complete only when, where applicable:

- behavior matches the approved specialist specifications;
- no unresolved governing contradiction was silently bypassed;
- `fa`, `en`, and `ar` behavior is correct for the affected surface;
- RTL/LTR direction is correct;
- public rendering does not require synchronous Odoo;
- commercial truth remains owned by Odoo;
- website public projections remain validated and cache-safe;
- accepted RFQs are durably captured;
- retryable writes are idempotent;
- failed integration work is recoverable;
- private data remains private;
- admin/authenticated routes are not publicly indexed or shared-cached;
- localized SEO output is correct;
- accessibility requirements are satisfied;
- performance budgets remain within approved gates;
- tests/checks relevant to the change pass;
- production-target build/runtime compatibility is verified where affected;
- documentation is updated if an approved contract changed;
- no fabricated business/public claim was introduced.

A task is not complete merely because the code compiles.

---

## 33. Prohibited Shortcuts

Never:

- deploy production using an unapproved platform because an older README mentions it;
- treat Persian-only content as the final multilingual implementation;
- generate English/Arabic indexable pages from missing/unreviewed translations;
- render public pages by synchronously fetching Odoo;
- expose Odoo credentials or provider-specific calls to the browser;
- create duplicate commercial sources of truth;
- acknowledge an RFQ before required durable persistence succeeds;
- assume queue delivery happens exactly once;
- invent Odoo fields/modules;
- fabricate price/stock/supplier/project/statistical claims;
- place private RFQ files in public storage;
- use shared caching for confidential/authenticated responses;
- disable security/accessibility/tests to make implementation easier;
- create thin SEO pages solely from database records;
- hardcode missing GTM/GSC/contact/brand values;
- silently resolve documentation conflicts in code;
- read all controlled documents mechanically when `DOCS_INDEX.md` identifies a smaller governing set.

---

## 34. Final Execution Checklist

Before starting work:

- [ ] Read `PROJECT_OVERRIDES.md`.
- [ ] Read `CLAUDE.md`.
- [ ] Read `DOCS_INDEX.md`.
- [ ] Read the remaining mandatory control documents.
- [ ] Check `DOCUMENT_AUDIT_REPORT.md`.
- [ ] Identify applicable specialist documents.
- [ ] Inspect repository state and existing implementation.
- [ ] Confirm no P0 documentation issue blocks the task.

Before finishing:

- [ ] Verify the requested behavior.
- [ ] Run relevant tests/checks.
- [ ] Verify all affected locales.
- [ ] Verify SEO/accessibility/performance/cache/security implications where applicable.
- [ ] Verify RFQ/Odoo failure behavior where applicable.
- [ ] Update documentation only where the approved contract actually changed.
- [ ] Report remaining risks or unverified checks accurately.

---

## 35. Governing Principle

```text
PROJECT_OVERRIDES.md controls current explicit cross-project changes.
CLAUDE.md controls how Claude Code works.
DOCS_INDEX.md controls what documentation Claude Code must read.
Specialist documents control their own implementation domains.
DOCUMENT_AUDIT_REPORT.md controls known documentation-risk visibility.
Odoo controls commercial truth.
Cloudflare controls the fast/resilient public application layer.
SEO, localization, security, accessibility, and performance are architecture constraints from day one.
```

If a task cannot be completed without violating those boundaries, stop the affected part and surface the exact decision required.

---

**End of `CLAUDE.md`**
