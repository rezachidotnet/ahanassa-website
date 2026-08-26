# Ahan Asa Website — Testing Strategy

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `TESTING_STRATEGY.md`  
> **Version:** 2.0  
> **Status:** Implementation Baseline  
> **Last updated:** 2026-08-26  
> **Document owner:** Engineering / QA  
> **Launch locale:** Persian (`fa-IR`), fully RTL  
> **Runtime:** Next.js App Router on Cloudflare Workers  
> **Business integration:** Odoo ERP at `odoo.ahanassa.com`

---

## 1. Purpose

This document defines the mandatory testing strategy for the Ahan Asa public website, operator/admin application, catalog and public-price projection, RFQ intake, Cloudflare services, and asynchronous Odoo integration.

It is a release contract for developers, Claude Code, reviewers, QA, operators, and release owners. A successful build is not sufficient. A change is acceptable only when the required automated tests, targeted manual checks, deployed-environment checks, and evidence have passed.

The strategy must prove that:

1. public SEO pages return useful HTML without depending on browser JavaScript or live Odoo responses;
2. operators can manage approved articles, SEO content, catalog projections, and permitted settings safely;
3. customers can submit any number of structured or free-form steel items and approved attachments;
4. an RFQ is acknowledged only after durable local persistence succeeds;
5. Odoo downtime, timeouts, retries, and duplicate queue delivery cannot lose or duplicate a lead;
6. products, units, variants, and public prices follow the approved system-of-record and sync rules;
7. private data, RFQ files, credentials, and ERP details never leak through public pages, caches, logs, analytics, or client bundles;
8. the site meets the approved performance, SEO, accessibility, RTL, security, and reliability gates;
9. deployments can be observed, verified, and rolled back safely.

---

## 2. Normative Language

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

- **MUST / MUST NOT:** release-blocking requirement unless a formal, time-bounded exception is approved.
- **SHOULD / SHOULD NOT:** expected behavior; deviation requires documented reasoning.
- **MAY:** optional behavior that must still follow security, privacy, and architecture constraints.

Tests MUST assert observable outcomes: HTTP behavior, accessible UI state, persisted records, emitted events, cache headers, generated metadata, and approved external effects. Tests MUST NOT primarily assert private React state, incidental DOM shape, or implementation-specific call counts unless those calls are themselves a contract.

---

## 3. Governing Documents and Conflict Rules

Testing verifies approved behavior; it does not invent product or architecture decisions.

Use this order when documents conflict:

1. `CLAUDE.md` and `PROJECT_BRIEF.md`;
2. `DECISIONS.md` and accepted ADRs;
3. `TECHNICAL_ARCHITECTURE.md`;
4. the specialist document that owns the behavior;
5. this `TESTING_STRATEGY.md`;
6. `DEVELOPMENT_RULES.md`, `CODING_STANDARDS.md`, and task acceptance criteria.

Relevant specialist documents include:

| Concern | Governing documents |
|---|---|
| Data ownership and schema | `SYSTEM_OF_RECORD.md`, `DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md` |
| Odoo and synchronization | `ODOO_INTEGRATION.md`, `ERP_DATA_MAPPING.md`, `SYNC_STRATEGY.md`, `API_INTEGRATIONS.md` |
| Failure handling | `FAILURE_RECOVERY.md`, `OBSERVABILITY.md` |
| RFQ and attachments | `RFQ_SYSTEM.md`, `FORM_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md` |
| Catalog and price | `PRODUCT_CATALOG_SPEC.md`, `PRICING_SYSTEM.md` |
| Admin authorization | `ADMIN_PANEL_SPEC.md`, `AUTHORIZATION_ROLES.md` |
| Rendering and cache | `TECHNICAL_ARCHITECTURE.md`, `CACHING_STRATEGY.md`, `docs/seo/rendering-matrix.md` |
| SEO | `SEO_STRATEGY.md`, `METADATA_SPEC.md`, `STRUCTURED_DATA.md`, `SITEMAP_ROBOTS_SPEC.md`, `HREFLANG_CANONICAL.md` |
| Performance | `PERFORMANCE_BUDGET.md`, `PERFORMANCE_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md` |
| Deployment | `DEPLOYMENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md` |

If a requirement is unresolved, the implementation and test MUST retain it as a decision gate. Claude Code MUST NOT weaken a test to match accidental current behavior. Architectural deviations require an ADR.

---

## 4. Architecture Under Test

The approved test target is:

```text
Visitor / Operator
        │
        ▼
Cloudflare Edge
        │
        ▼
Next.js on Cloudflare Workers
        │
        ├── D1: operational records + public/SEO read model
        ├── R2: public media + private RFQ attachments
        ├── Queues: asynchronous integration delivery
        ├── Turnstile and rate controls
        └── Odoo adapter (server-only)
                    │
                    ▼
          odoo.ahanassa.com
```

The following architecture invariants are P0 test requirements:

1. Public rendering MUST NOT synchronously call Odoo.
2. Browser code MUST NOT call Odoo directly or contain Odoo credentials.
3. Public catalog and price pages MUST read from the website read model/cache, not live ERP responses.
4. RFQ success MUST mean that the RFQ, items, consent evidence, attachment metadata, and an outbox/integration intent are durably persisted.
5. Odoo synchronization MUST be asynchronous, idempotent, retryable, and observable.
6. Queue delivery MUST be treated as at-least-once; duplicates are expected inputs.
7. Private attachments MUST remain non-public and non-listable.
8. Admin, RFQ, personalized, preview, and private responses MUST NOT enter shared public caches.
9. Stable marketing pages default to SSG; publishable content uses ISR/on-demand revalidation; dynamic rendering is limited to approved application behavior; SSR deviations require an ADR.
10. Preview deployments MUST be non-indexable.

---

## 5. Testing Objectives

### 5.1 Business continuity

- No qualified RFQ is lost because Odoo is slow, unavailable, restarting, or upgrading.
- No retry creates a duplicate contact, lead, opportunity, or RFQ in Odoo.
- A customer receives a stable public RFQ reference after durable acceptance.
- Operators can identify pending, failed, retried, dead-lettered, and synchronized records.
- Price or catalog synchronization cannot silently publish corrupt or structurally invalid data.

### 5.2 User trust

- The UI never reports false success.
- Stale public prices display the approved freshness state and timestamp.
- Unavailable capabilities are hidden or clearly unavailable; they are never simulated.
- Sensitive data never appears in URLs, page HTML, analytics, logs, traces, screenshots, caches, or error responses.

### 5.3 Discoverability and speed

- Indexable pages include meaningful content and SEO signals in the initial HTML response.
- Canonicals, hreflang, robots, sitemap, redirects, status codes, internal links, and structured data remain consistent.
- Performance budgets are enforced before deployment and monitored after deployment.
- Optional scripts and integrations cannot block primary content or RFQ submission.

### 5.4 Inclusive Persian experience

- Core journeys work with keyboard, touch, pointer, zoom, reduced motion, forced colors, and representative assistive technology.
- Persian reading order, mixed-direction values, technical sizes, units, phone numbers, email addresses, and product codes remain understandable.
- Components use logical direction-aware behavior and do not block future LTR locales.

---

## 6. Risk Model and Release Priority

| Priority | Area | Typical failure | Required evidence |
|---|---|---|---|
| P0 | RFQ durable acceptance | Lost or falsely acknowledged request | Unit, Worker integration, D1/R2, queue, E2E, failure injection |
| P0 | Odoo idempotency | Duplicate contact/lead/RFQ on retry | Contract, integration, replay, concurrency tests |
| P0 | Private data and files | Data exposure or public attachment | Security, cache, R2, logging, authorization tests |
| P0 | Authentication/RBAC | Unauthorized admin access or mutation | Unit, integration, E2E, audit tests |
| P0 | Production domain/route integrity | Traffic or indexing loss | Redirect, status, canonical, deployed smoke tests |
| P1 | Catalog/public price projection | Wrong, stale, or mismatched commercial data | Mapping, schema, sync, cache invalidation tests |
| P1 | SEO output | Missing or contradictory crawl signals | Build, crawl, deployed HTML tests |
| P1 | Performance budgets | Slow pages or excessive client JavaScript | Bundle, Lighthouse, Web Vitals, cache tests |
| P1 | Accessibility/RTL | Excluded or confused users | Automated and manual accessibility/RTL checks |
| P1 | CMS publishing | Draft leak or stale page | Authorization, lifecycle, revalidation, SEO tests |
| P2 | Analytics | Privacy breach or corrupt measurement | Consent, payload, duplicate-event tests |
| P2 | Visual behavior | Layout or brand regression | Component, responsive, visual tests |
| P3 | Low-risk polish | Minor presentation inconsistency | Focused component/manual review |

P0 failures block merge and release. P1 failures block release unless the governing owner approves a documented exception with owner, mitigation, expiration, and rollback criteria.

---

## 7. Test Portfolio

| Layer | Purpose | Examples | Default execution |
|---|---|---|---|
| Static checks | Prevent invalid code/configuration | Lint, TypeScript, schemas, forbidden imports, migrations | Every pull request |
| Unit | Verify pure rules | Validation, normalization, mapping, cache keys, retry classification | Every pull request |
| Component | Verify semantics and interaction | RFQ builder, admin forms, navigation, feedback | Every pull request |
| Worker integration | Verify Cloudflare runtime boundaries | D1, R2, Cache API, route handlers, bindings | Relevant pull requests |
| Contract | Verify external/interface assumptions | Odoo JSON-2/adapter, Turnstile, analytics payloads | Relevant changes + scheduled |
| E2E | Verify critical journeys in browsers | RFQ, publishing, price update, RBAC | Preview/release |
| Non-functional | Verify quality characteristics | SEO, accessibility, performance, security, visual | Preview/release |
| Resilience | Verify degraded behavior | Odoo outage, queue replay, cache/D1/R2 failure | Release candidate/scheduled |
| Production smoke | Verify deployed essentials | Domain, HTML, headers, queues/metrics | After deployment |

Use the smallest test layer that proves the outcome. Do not reproduce every unit permutation in Playwright.

---

## 8. Approved Tooling Direction

Exact versions are owned by `STACK.md` and the lockfile. This strategy defines capabilities, not permission to install duplicates.

| Need | Baseline |
|---|---|
| Pure TypeScript and component tests | Vitest + Testing Library + `user-event` |
| Cloudflare runtime tests | Vitest with the current Cloudflare Workers integration |
| Browser E2E | Playwright |
| Automated accessibility | axe integration with component/browser tests |
| HTTP simulation | Adapter fakes or MSW at owned external boundaries |
| Schema validation | Project-approved runtime schemas |
| Performance | Lighthouse CI, bundle budgets, and field Web Vitals monitoring |
| Security | Secret scanning, dependency audit, static analysis, header/API checks |

Cloudflare runtime tests SHOULD execute against the actual Workers runtime simulation and bindings, including D1 and R2. They MUST apply real D1 migrations to isolated test storage.

Do not introduce Jest beside Vitest, or Cypress beside Playwright, without an approved migration ADR. Do not call live Odoo from ordinary pull-request tests.

Coverage configuration MUST reflect the selected Workers test integration. If native V8 coverage is unsupported for that runtime integration, use the supported instrumented coverage method rather than publishing misleading numbers.

---

## 9. Test Environments

| Environment | Purpose | Cloudflare resources | Odoo | Data |
|---|---|---|---|---|
| Local pure | Fast logic/UI development | Fakes | Fake adapter | Synthetic |
| Local Worker | Runtime integration | Local isolated D1/R2/Queue/Cache | Stub HTTP server | Synthetic |
| CI | Deterministic merge gate | Isolated ephemeral bindings | Recorded contracts/stub | Synthetic |
| Preview | Deployed E2E, SEO, a11y, performance | Preview-only resources | Sandbox or adapter stub | Synthetic |
| Staging, if approved | Release rehearsal | Isolated non-production resources | Odoo test database | Synthetic |
| Production | Read-only smoke and monitoring | Production | Production | No writes by default |

Environment requirements:

- production and non-production secrets MUST be separate;
- CI MUST NOT receive production Odoo, R2, D1, Turnstile, or admin credentials;
- test bypasses MUST be absent or impossible in production;
- preview responses MUST be `noindex` and MUST NOT emit production canonicals incorrectly;
- environment parsing MUST fail closed for enabled critical capabilities;
- optional integration absence MUST NOT break static public pages;
- local/CI resources MUST never point to production IDs.

Production synthetic RFQ submission requires an approved runbook, explicit synthetic tagging, notification ownership, cleanup behavior, and a rate limit. Otherwise production smoke tests remain read-only.

---

## 10. Test Data and Fixture Policy

All fixtures MUST be synthetic, minimal, and reviewable.

Never use:

- real customer, supplier, employee, quotation, invoice, or opportunity data;
- exported production databases or production Odoo responses containing identifiers;
- real RFQ documents or bills of quantities;
- production secrets, cookies, bearer tokens, signed URLs, or API keys;
- confidential product pricing not approved for public display.

Maintain builders for:

- minimal and full valid customers;
- valid multi-line structured RFQs;
- mixed structured and free-form items;
- zero, one, and maximum permitted attachments;
- catalog categories, products, variants, attributes, units, and public prices;
- Odoo success, validation failure, authorization failure, conflict, rate limit, timeout, and server-error responses;
- queue messages for first delivery, duplicate delivery, retry, malformed payload, and obsolete schema version;
- CMS draft, scheduled, published, updated, archived, and deleted records;
- representative Persian SEO content and mixed-direction technical values.

Use unique correlation and idempotency markers per test. Freeze or inject time for price freshness, publishing, retry schedules, and sitemap `lastmod`. Builders with explicit overrides are preferred over duplicated large JSON snapshots.

---

## 11. Static, Schema, and Build-Time Gates

Every pull request MUST run, as applicable:

1. locked dependency installation;
2. formatting verification;
3. linting with zero unapproved errors;
4. strict TypeScript checking;
5. unit and component tests;
6. Worker integration tests for affected boundaries;
7. production Cloudflare-targeted build;
8. content and configuration schema validation;
9. D1 migration validation on a clean database and an upgrade fixture;
10. route, sitemap, metadata, robots, and structured-data validation;
11. forbidden client import/server-secret checks;
12. secret and high-confidence dependency/security scanning;
13. route bundle and public JavaScript budget checks.

The build MUST fail when:

- a server-only Odoo, database, signing, or secret module enters a client bundle;
- an indexable route lacks required server-rendered content or metadata;
- a draft/unapproved locale enters the sitemap;
- canonical routes collide or produce inconsistent normalized URLs;
- D1 migrations cannot create a clean schema or upgrade the supported prior schema;
- a queue event schema is invalid or unsupported without a migration strategy;
- a required enabled binding or environment value is missing;
- a public route accidentally becomes dynamic or client-heavy contrary to the rendering matrix;
- public JavaScript exceeds the approved budget without an ADR/exception;
- structured data cannot be safely serialized or contradicts visible content.

---

## 12. Unit Testing

Unit tests MUST cover deterministic rules, including:

- Persian/Latin digit and Persian/Arabic character normalization;
- phone, email, name, company, unit, quantity, decimal, size, and description validation;
- RFQ item limits, attachment limits, and payload size rules;
- structured versus free-form item validation;
- public RFQ reference and internal idempotency key generation;
- canonical, alternate, robots, sitemap, metadata, Open Graph, and JSON-LD builders;
- Odoo field mapping and external-ID construction;
- retryable/permanent Odoo error classification;
- queue event version parsing and unknown-version rejection;
- price normalization, currency/unit mapping, freshness state, and safe rounding;
- catalog slugging, filtering, sorting, attribute mapping, and indexability decisions;
- cache keys, tags, allowlists, bypass rules, and invalidation plans;
- RBAC policy evaluation and permission composition;
- audit-event construction and PII-safe log redaction;
- environment configuration parsing;
- rate-limit decisions and safe public error mapping;
- upload filename, extension, MIME, signature, size, and storage-key rules.

For each boundary rule, include valid, invalid, minimum, maximum, empty, Unicode, bidi-sensitive, and unexpectedly long inputs where relevant.

Prohibited patterns:

- mocking the function under test;
- snapshots as the primary assertion for large HTML/JSON objects;
- silent acceptance of unknown fields at external trust boundaries;
- tests coupled only to private helper structure;
- using production current time, randomness, or record counts as assertions.

---

## 13. Component Testing

Component tests MUST use accessible role/name queries first, then labels, then visible contract text, and stable test IDs only when semantic queries are impossible.

Required state coverage, as applicable:

- default, loading/pending, empty, error, success, disabled, and unavailable;
- keyboard, pointer, and touch-equivalent interaction;
- focus-visible, focus movement, focus restoration, and escape behavior;
- reduced-motion behavior;
- RTL and a representative LTR harness for direction-sensitive primitives;
- long Persian content, mixed Latin product codes, decimal quantities, and technical units;
- 320px layout and 200% zoom for high-risk components.

Priority components:

- header, skip link, navigation, mobile menu, breadcrumbs, and footer;
- product/category/price cards and filters;
- RFQ item table/builder with unlimited UI row addition subject to server safety limits;
- category → product → variant → unit dependent controls;
- free-form product row;
- attachment picker/progress/error state;
- customer/contact and consent fields;
- admin login, protected navigation, data tables, bulk price controls, publishing controls, and confirmations;
- alerts, status regions, dialogs, drawers, pagination, and empty states;
- image/media wrappers and freshness indicators.

The RFQ builder MUST prove that adding, editing, reordering if approved, and removing rows preserves other valid rows and produces deterministic accessible labels for every row.

---

## 14. Cloudflare Worker Integration Testing

Worker integration tests MUST run in a compatible Workers runtime, not only Node.js emulation.

Test:

- route handlers through realistic `Request`/`Response` boundaries;
- D1 queries after applying actual migrations;
- R2 put/get/head/delete behavior using isolated bindings;
- Cache API keys, headers, tags/versions, and bypass rules;
- Queue producer payloads and consumer outcomes;
- scheduled reconciliation/retry handlers where used;
- Turnstile verification adapter responses;
- environment bindings and server-only module boundaries;
- Workers-compatible APIs used by the Next.js deployment output.

Every Worker test file MUST have isolated state or explicit cleanup. Parallel tests MUST NOT share mutable IDs. If a platform simulator has timing limitations, tests MUST inject a clock at the domain layer and retain at least one deployed-environment check for real expiry behavior.

---

## 15. D1 Database Testing

### 15.1 Migration tests

Every migration set MUST prove:

1. clean database creation succeeds;
2. supported previous schema upgrades without data loss;
3. foreign keys are enabled and enforced;
4. required unique constraints and indexes exist;
5. migration is deterministic and does not depend on production data;
6. rollback/forward-fix behavior follows `DATABASE_SCHEMA.md` and deployment policy.

Migration tests MUST include representative legacy rows for the immediately supported upgrade path.

### 15.2 Integrity tests

Verify:

- an RFQ owns N items and N attachment metadata records;
- deleting or archiving parent records follows the approved cascade/restrict policy;
- catalog/category/product/variant/unit references cannot point to missing records;
- free-form items remain valid without catalog foreign keys but contain required textual fields;
- external Odoo IDs and website idempotency keys are unique where required;
- price history is append-only or corrected only through the approved audit path;
- sync state transitions reject invalid jumps;
- timestamps use the approved format and source;
- audit records cannot be silently overwritten by ordinary admin operations.

### 15.3 Query and performance tests

Representative catalog, price, RFQ admin, article, and sync queries MUST be tested with realistic data volume. Tests SHOULD inspect query plans for critical queries and fail when required indexes are not used or row reads exceed the ratified threshold.

---

## 16. R2 and Attachment Testing

Public media and private RFQ files MUST use distinct access policies or equivalent enforced isolation.

Test:

- approved extension, MIME type, and file-signature agreement;
- maximum individual size, total RFQ size, file count, zero-byte, truncated, corrupted, and renamed disallowed files;
- filename normalization and path traversal characters;
- generated opaque object keys, not user-controlled public paths;
- private bucket/object access denial without authorized server flow;
- short-lived access authorization and expiry when downloads are approved;
- upload cancellation, interruption, retry, duplicate upload, and orphan cleanup;
- D1 attachment metadata and R2 object relationship;
- checksum/size mismatch handling;
- quarantine/scanning states if specified;
- no public R2 URL or signed URL in HTML, analytics, logs, audit text, or client-persisted state;
- authorized admin download and denied cross-role/cross-record access.

Use harmless, purpose-built fixtures. Do not commit malware. Security test strings may be used only in an isolated authorized environment.

---

## 17. RFQ Acceptance Contract

The critical acceptance transaction is:

```text
Validate request
      ↓
Persist customer/contact snapshot
      ↓
Persist RFQ + items + consent + attachment metadata
      ↓
Persist outbox/integration intent
      ↓
Commit durable transaction
      ↓
Return public RFQ reference
```

If any mandatory operation before commit fails, the API MUST NOT return success.

### 17.1 API cases

Test:

- accepted method and content type;
- malformed JSON/form-data and payload-size overflow;
- missing, unknown, and invalid fields;
- client/server validation parity with server authority;
- structured item, free-form item, and mixed RFQ;
- zero items, one item, many items, and configured maximum;
- dependent category/product/variant/unit mismatch;
- Persian and Latin digits and decimal quantities;
- consent presence, version, timestamp, and source;
- valid/invalid Turnstile response;
- rate-limit allow, warn, and reject behavior;
- duplicate clicks, browser retries, and repeated idempotency keys;
- D1 failure before commit;
- R2 metadata/object inconsistency;
- queue publish failure after durable outbox commit;
- safe correlation/reference response;
- logs and analytics without RFQ content or PII;
- approved status codes and stable public error categories.

### 17.2 Durable success assertions

On success, tests MUST verify:

- one RFQ record exists;
- every accepted item exists exactly once;
- consent evidence and source metadata exist;
- every accepted attachment has approved metadata and object state;
- one idempotent outbox/integration intent exists;
- the public reference is stable and contains no sequential database or Odoo identifier unless explicitly approved;
- the response does not wait for Odoo;
- replaying the same request returns the approved idempotent result and creates no duplicates.

### 17.3 Browser journeys

Mandatory E2E journeys:

1. submit a valid structured multi-line RFQ;
2. submit a mixed catalog/free-form RFQ;
3. attach an approved file and verify accessible progress;
4. correct validation errors without losing valid rows/files;
5. double-click/retry without duplicate creation;
6. submit while Odoo is unavailable and still receive durable website acceptance;
7. experience D1/durable-write failure and receive truthful recoverable failure;
8. resume after a network interruption according to the approved policy;
9. complete the journey at 320px, keyboard-only, and representative mobile touch.

---

## 18. Queue, Outbox, Retry, and DLQ Testing

Queue delivery is at-least-once. The consumer MUST be designed and tested as if every message may be delivered more than once, out of immediate timing expectations, or after a deployment.

Test producer behavior:

- outbox record and domain transaction commit atomically where specified;
- event contains schema version, event ID, aggregate ID, idempotency key, correlation ID, type, and occurred-at timestamp;
- event excludes secrets and unnecessary PII;
- queue publication updates state without deleting recovery evidence;
- scheduled outbox recovery publishes records missed by transient publication failure.

Test consumer behavior:

- first delivery creates/maps the intended Odoo records once;
- identical redelivery is a no-op or returns the same external mapping;
- concurrent duplicate deliveries cannot create duplicates;
- partial Odoo success followed by timeout is reconciled before retrying creation;
- retryable failures use bounded retry/backoff policy;
- permanent validation/mapping failures do not retry forever;
- exhausted failures reach the DLQ with safe diagnostic metadata;
- malformed/unsupported event versions are quarantined safely;
- successful processing records `odoo_id`, `external_id`, sync version, and timestamps;
- acknowledgements occur only after the approved durable success condition;
- batch processing isolates individual message outcomes as configured.

Test recovery operations:

- DLQ inspection uses authorized admin/operator access;
- replay requires audit evidence and preserves the original event identity;
- repeated replay remains idempotent;
- a fixed mapping can recover a failed event without editing historical payloads invisibly;
- queue backlog, age, retry count, failure rate, and DLQ count trigger the approved alerts;
- pausing/resuming delivery does not lose accepted messages.

---

## 19. Odoo Adapter and Contract Testing

The website MUST access Odoo only through the server-side adapter. The adapter protocol and model mapping depend on the confirmed Odoo version and installed modules.

### 19.1 Required adapter contract

Test:

- base URL, database/context requirements, authentication, timeout, and TLS behavior;
- no password/API key appears in URL, logs, traces, errors, or client output;
- dedicated bot user has only the required access rights;
- request/response schemas reject unknown or missing critical fields;
- website customer maps to the approved `res.partner` representation;
- RFQ maps to the approved CRM/opportunity/custom model representation;
- products, variants, units, and prices map according to `ERP_DATA_MAPPING.md`;
- attachments are referenced according to policy rather than made publicly accessible;
- Odoo validation, access, conflict, rate-limit, timeout, and 5xx responses map to stable domain outcomes;
- retry classification matches `SYNC_STRATEGY.md`;
- adapter compatibility tests exist for every supported Odoo version/API mode.

If Odoo 19 JSON-2 is the confirmed production interface, its Bearer API authentication and JSON-2 request/response contract MUST be verified. Legacy RPC assumptions MUST NOT be mixed silently with JSON-2 behavior.

### 19.2 Sandbox and production rules

- Pull-request tests use stubs/recorded sanitized contracts.
- Scheduled or release tests MAY use a dedicated Odoo test database.
- Test records MUST have a unique source marker and cleanup policy.
- Production credentials MUST never enter CI.
- Production writes are prohibited unless the synthetic-operation runbook is approved.

### 19.3 Failure-injection scenarios

Simulate:

- DNS/connectivity failure;
- TLS or authentication failure;
- timeout before Odoo receives the request;
- timeout after Odoo commits but before response reaches the Worker;
- 429/rate limit;
- 4xx mapping/permission failure;
- 5xx/restart/maintenance;
- malformed or backward-incompatible response;
- product/UOM mapping missing;
- duplicate external ID;
- partial contact creation followed by RFQ failure.

For every scenario, verify no lead loss, no false website failure after durable acceptance, no duplicate ERP record, correct sync state, safe retry/reconciliation, and observable operator action.

---

## 20. Catalog and Public-Price Synchronization

Odoo owns commercial product, variant, UOM, and price facts. The website owns SEO content and the public read model.

### 20.1 Inbound sync tests

Verify:

- full initial import and incremental updates;
- create, update, archive/deactivate, and restore behavior;
- deterministic external-ID mapping;
- product template versus variant mapping;
- category, attribute, size, standard, brand/origin if approved, and UOM mapping;
- decimal precision, currency, tax-display policy, and unit conversions;
- same-version duplicate event is idempotent;
- older/out-of-order version cannot overwrite newer data;
- invalid records are quarantined without corrupting the last valid public projection;
- sync writes and cache invalidation follow the approved order;
- price history receives the approved immutable entry and timestamp;
- public `last updated` reflects source update semantics, not merely page render time.

### 20.2 Public page tests

Verify:

- page renders from D1/cache with Odoo blocked;
- current public price, unit, freshness, and update timestamp agree;
- unavailable/private prices use the approved CTA/state and do not invent values;
- stale threshold displays the approved stale state and alerting occurs;
- related sizes/products and internal links remain valid;
- structured data contains only visible, eligible price/offer facts;
- thin or incomplete variants are not automatically indexable;
- filter parameters do not generate uncontrolled indexable URL combinations.

### 20.3 Bulk/admin operations

If an admin price operation writes to Odoo or triggers a synchronization workflow, test authorization, preview/dry-run if specified, validation, partial failure, concurrency, audit logs, cache invalidation, and recovery. The UI MUST identify the system of record and MUST NOT create an independent conflicting price source.

---

## 21. CMS, Publishing, and Revalidation Testing

Test the complete content lifecycle:

- create draft, edit, preview, publish, update, schedule if approved, unpublish, archive, and restore;
- operator/editor/publisher permission differences;
- slug uniqueness and protected-route conflicts;
- server-side content validation and sanitization;
- media authorization and alt-text requirements;
- draft content absent from public output, sitemap, feeds, search, and structured data;
- preview content protected and `noindex`;
- publish event triggers selective path/tag revalidation;
- unchanged pages remain cached;
- failed revalidation is observable and retryable;
- article update changes meaningful `lastmod` only when approved public content changes;
- concurrent edits follow the approved version/conflict policy;
- audit log records actor, action, target, time, and safe change metadata.

CMS failure MUST NOT remove the last valid published public page unless the approved operation explicitly unpublishes it.

---

## 22. Admin Authentication, Authorization, and Audit Testing

Test:

- unauthenticated access redirects or returns the approved unauthorized response;
- expired, revoked, malformed, and replayed sessions;
- CSRF protection for state-changing requests;
- session cookies use approved security attributes;
- each role can see and execute only permitted actions;
- direct API calls cannot bypass hidden/disabled UI controls;
- object-level authorization prevents cross-record access;
- dangerous operations require the approved confirmation/re-authentication;
- rate limits and lockout/recovery rules do not create account-enumeration leaks;
- admin responses use `no-store` and are excluded from public caches/indexing;
- audit events are created for login/security events and all material mutations;
- audit logs exclude secrets and excessive PII and cannot be edited by ordinary operators.

Maintain a permission test table generated from `AUTHORIZATION_ROLES.md`: every role × resource × action combination MUST have an allow/deny assertion at the policy layer, plus E2E coverage for high-risk combinations.

---

## 23. Cache and Revalidation Testing

### 23.1 Cache classification

Representative routes MUST verify the approved classification:

| Route/data class | Shared edge cache |
|---|---|
| Stable public marketing/category/product/article HTML | Allowed per policy |
| Public price projection | Allowed with approved freshness/revalidation |
| Public images/assets | Allowed |
| RFQ form HTML | Only if it contains no personalized/security token state |
| RFQ submission/API response | Never |
| Admin/auth/account/personalized data | Never |
| Private attachments/signed responses | Never |
| Preview/draft content | Never public-shared |

Test:

- `Cache-Control` and edge-specific directives;
- cache hit, miss, stale-while-revalidate, and revalidated response behavior;
- cache keys do not vary on irrelevant or attacker-controlled values;
- cookies/authorization force bypass where required;
- no PII or private response is served across users;
- cache tags/versions invalidate only affected product, category, price, or article surfaces;
- purge/revalidation failure retains safe last-known content and triggers observability;
- query filters follow canonical and cache policies;
- stale data never crosses the maximum approved business-freshness ceiling silently;
- cache stampede/concurrent regeneration is bounded where relevant.

An automated test MUST fetch a private/admin/RFQ API response as two different synthetic users and prove there is no shared-cache leakage.

---

## 24. SEO Testing

SEO checks MUST inspect both generated/deployed initial HTML and HTTP behavior.

### 24.1 Per-page assertions

- successful indexable status;
- unique, approved title and description;
- exactly one canonical matching the normalized public URL;
- correct `lang`, direction, and hreflang/x-default set for published locales only;
- approved robots directive;
- server-rendered H1, primary content, breadcrumbs, and crawlable links;
- Open Graph/social metadata using the public host;
- valid page-type structured data that matches visible content;
- no localhost, preview, Worker, internal R2, D1, or Odoo URL leakage;
- no indexable thin filter, empty catalog, draft, admin, account, or RFQ-success URL.

### 24.2 Site-wide assertions

- sitemap index and child sitemaps contain only canonical, indexable `200` URLs;
- `lastmod` changes from real public-content/product/price updates only;
- robots rules do not expose private paths or block required public assets;
- internal links do not target redirects, 404s, drafts, or unapproved locales;
- redirect chains contain at most the approved hop count;
- removed URLs follow `REDIRECTS.md` or return the approved `404/410`;
- faceted/filter URLs follow the canonical/indexability matrix;
- structured-data entities use stable IDs and consistent organization/product relationships;
- price/offer structured data is absent when public values are unavailable, stale beyond policy, or not visibly displayed.

### 24.3 HTML-first regression

For representative home, category, product, price, and article pages, disable browser JavaScript and verify that essential content, navigation, canonical metadata, structured data, and internal links remain available. Interactive filters/calculators MAY enhance the page but MUST NOT own the only copy of indexable content.

---

## 25. Accessibility, RTL, and Localization Testing

Target compliance is owned by `ACCESSIBILITY.md`. No unapproved serious or critical automated accessibility violation may ship.

Automated axe checks MUST cover:

- home;
- category/product/price page;
- article page;
- RFQ default, error, pending, file-upload, failure, and success states;
- admin login and representative protected data/form page;
- open navigation/dialog/drawer states.

Manual release checks MUST cover:

- keyboard-only completion of primary public and admin journeys;
- visible focus, logical order, skip link, focus trapping/restoration;
- 200% zoom and 320 CSS-pixel reflow;
- reduced motion and forced colors/high contrast where supported;
- representative screen reader/browser combinations;
- error summary, inline errors, pending status, upload progress, and success announcements;
- touch target size and virtual-keyboard usability;
- heading hierarchy, meaningful links, labels, instructions, and alternative text.

RTL-specific assertions:

- `<html lang="fa" dir="rtl">` for Persian pages;
- logical CSS properties for direction-sensitive layout;
- correct order/readability of phone numbers, URLs, email, `IPE`, `A3`, `10 mm`, quantities, dates, and currency;
- icons mirror only when their meaning is directional;
- tables and row controls remain understandable in RTL;
- no horizontal page overflow at supported widths or 200% zoom;
- future LTR primitives pass a targeted harness without publishing an incomplete locale.

Motion MUST follow the approved “calm control” direction: content access cannot be delayed by animation, effects remain limited, and `prefers-reduced-motion` is respected.

---

## 26. Responsive, Browser, and Visual Testing

Browser automation baseline:

- Chromium: complete critical suite;
- WebKit: critical public/RFQ/admin subset;
- Firefox: critical public/RFQ/admin subset;
- representative mobile Chromium and mobile WebKit viewports.

Exact versions come from the Playwright lockfile/CI image.

Viewport coverage MUST include 320px, a common mobile width, tablet/intermediate breakpoints, standard desktop, and wide desktop. Test around actual component breakpoints rather than device names only.

Verify:

- no unintended horizontal overflow;
- no clipped content, CTA, focus ring, menu, dialog, table control, or toast;
- sticky/fixed UI does not cover anchors or focused controls;
- technical tables use the approved overflow/responsive pattern;
- long Persian titles and product attributes wrap predictably;
- images reserve space and use correct crop/responsive source;
- mobile navigation and RFQ row controls are touch and keyboard operable.

Visual baselines SHOULD focus on stable, high-value surfaces: header/navigation, home above fold, category/product/price templates, RFQ states, admin table/form states, and footer at 320px and desktop.

Freeze animations, time, fonts, and fixture content. Baseline changes require human review tied to an approved design change. Missing fonts/assets are defects, not regions to mask.

---

## 27. Performance Testing and Gates

`PERFORMANCE_BUDGET.md` owns final budgets. Until superseded there, use these internal release targets:

| Metric | Target | Release ceiling / rule |
|---|---:|---|
| LCP p75 | ≤ 2.0 s | Regression beyond approved field/lab tolerance blocks release |
| INP p75 | ≤ 150 ms | Same |
| CLS p75 | ≤ 0.05 | Same |
| Cached public HTML TTFB | ≤ 500 ms | 800 ms hard ceiling in controlled test |
| Public-route first-load JS | ≤ 120 KB compressed | Exceeding requires budget approval |
| RFQ route first-load JS | ≤ 200 KB compressed | Exceeding requires budget approval |
| Lighthouse Performance | ≥ 95 | Representative controlled runs |
| Lighthouse SEO | 100 | No waived structural SEO error |
| Lighthouse Accessibility | ≥ 95 | Automated score does not replace manual checks |
| Lighthouse Best Practices | ≥ 95 | Security/runtime issues still reviewed separately |

Run controlled Lighthouse/budget checks for home, representative category, product, price, article, and RFQ routes.

Test:

- RSC/server-first boundaries and accidental client-component expansion;
- route bundle growth and duplicate dependencies;
- responsive AVIF/WebP delivery and correct intrinsic dimensions;
- critical font subset/preload and limited weights;
- no avoidable layout shift/hydration error;
- lazy loading of below-fold nonessential modules;
- no third-party script before approved consent/timing;
- edge cache-hit behavior and TTFB;
- D1 query latency/row-read regression for cache misses;
- RFQ interaction responsiveness with the configured maximum row count;
- Odoo blocked/unavailable with no public page performance impact.

Use repeat runs and controlled conditions for marginal lab differences. Field Real User Monitoring at p75 is the authority for sustained production experience; lab tests are pre-release regression evidence.

---

## 28. Security and Privacy Testing

Security testing follows `SECURITY_GUIDELINES.md` and the approved OWASP baseline.

Automated coverage MUST include:

- secret/credential scanning;
- dependency vulnerability and runtime/framework security review;
- static analysis for high-confidence issues;
- server-only value inspection in built client assets/source maps;
- authentication, session, CSRF, RBAC, and object authorization;
- injection, content-type confusion, schema bypass, mass assignment, and oversized payloads;
- rate-limit and bot-protection behavior;
- security headers, CSP, cookies, CORS, referrer, and cache policy;
- upload validation and private object access;
- open redirects and unsafe URL handling;
- HTML/JSON-LD/script serialization of operator/customer content;
- log, trace, metric, analytics, and error-response data minimization;
- Odoo bot-user least privilege and adapter-only network path.

No known exploitable critical/high vulnerability in shipped code/runtime may release without a formal security exception, mitigation, owner, and expiration. A framework critical security advisory blocks production deployment until the project-approved patched version is used and the regression suite passes.

Authorized preview scanning MUST remain safe and non-destructive. Do not fuzz production or attempt to circumvent access controls without explicit scope authorization.

---

## 29. Observability and Operational Tests

Tests MUST verify that failures are detectable without exposing private data.

Required signals include:

- Worker request count, latency, exceptions, and 5xx rate;
- RFQ accepted/rejected/failure counts by safe reason category;
- D1 error/latency and relevant query cost indicators;
- R2 upload/read errors and orphan-cleanup failures;
- queue produced/consumed/retried/backlog/oldest-age/DLQ metrics;
- Odoo adapter latency, outcome category, authentication/mapping failures, and circuit/backoff state if used;
- catalog/price sync lag, last success, rejected record count, and stale public-price count;
- cache hit ratio, revalidation/purge failures, and stale ceiling breach;
- 404/5xx, Core Web Vitals, and release-correlated regressions.

Observability tests MUST assert:

- correlation IDs connect RFQ request, outbox event, queue attempt, and Odoo result;
- logs exclude names, phone, email, addresses, item descriptions, attachment names/URLs, tokens, and raw request bodies unless a separately approved protected audit requirement exists;
- alerts fire in a non-production test path or are validated through configuration-as-code checks;
- operator runbooks link to each P0/P1 alert;
- successful recovery clears or resolves the alert according to policy.

---

## 30. Resilience and Chaos Scenarios

The release-candidate suite MUST exercise controlled dependency failures:

| Failure | Expected public behavior | Expected internal behavior |
|---|---|---|
| Odoo offline | Public pages and RFQ acceptance remain available | Queue retries; sync pending; alert if threshold exceeded |
| Odoo committed then timed out | No duplicate on retry | Reconcile by external/idempotency ID |
| Queue publish transient failure | RFQ success allowed only if durable outbox committed | Recovery publisher retries |
| Queue duplicate | No duplicate ERP record | Idempotent no-op/reconciliation |
| DLQ exhaustion | No customer-data loss | Alert, audited inspection/replay |
| D1 write failure | No RFQ success | Safe recoverable error; no partial accepted state |
| R2 upload failure | Follow approved partial/whole RFQ policy truthfully | No dangling accepted metadata |
| Cache purge failure | Last valid public content remains | Retry/alert; freshness ceiling enforced |
| Invalid product sync | Last valid projection remains | Quarantine and alert |
| Analytics/tag manager blocked | No user-visible impact | Optional telemetry absent only |
| Turnstile provider slow | Approved fail/retry path | No bypass through client manipulation |

Failure tests MUST prove bounded retry, no retry storm, no false success, no secret leakage, and an operator recovery path.

---

## 31. Analytics and Consent Testing

If analytics is enabled, verify:

- consent state controls loading and event dispatch according to policy;
- denied/unknown consent sends no prohibited storage or event;
- events occur once for approved visible actions;
- SPA/navigation behavior does not duplicate page views;
- RFQ events contain only safe outcome category, route, source/UTM fields approved for analytics, and synthetic reference class if allowed;
- no name, phone, email, address, item list/description, attachment details, Odoo ID, or raw error enters analytics;
- analytics/tag failure cannot block navigation, rendering, or RFQ submission;
- preview/test traffic is separated or suppressed according to policy.

---

## 32. End-to-End Journey Matrix

The E2E suite MUST remain small and business-focused.

### Public discovery

1. Open the canonical Persian home page.
2. Confirm `lang="fa"`, `dir="rtl"`, initial HTML content, canonical, and primary navigation.
3. Navigate by keyboard through a category, product/price page, and RFQ CTA.
4. Confirm no hydration, console, or failed first-party request errors.

### RFQ

Cover the journeys in Section 17 across desktop and critical mobile/browser subsets.

### Content publishing

1. Log in as an authorized publisher in preview/staging.
2. Create/edit and publish synthetic content.
3. Verify selective revalidation and public HTML/metadata/sitemap behavior.
4. Unpublish/archive and verify approved route behavior.

### Catalog/price synchronization

1. Inject a versioned synthetic Odoo product/price event or sandbox update.
2. Process it through the real non-production integration boundary.
3. Verify D1 projection, history, public HTML, freshness, cache invalidation, and idempotent replay.

### Authorization

1. Verify unauthenticated denial.
2. Verify representative viewer/operator/editor/publisher/admin permissions.
3. Attempt direct forbidden APIs and cross-record access.
4. Verify audit evidence for allowed/denied material operations.

E2E rules:

- use web-first assertions, never arbitrary sleeps;
- generate isolated unique records;
- control third-party services unless explicitly under contract test;
- capture traces/screenshots/network diagnostics on failure only;
- fail on unexpected page errors, hydration errors, unhandled rejections, and failed critical first-party requests;
- clean up sandbox data where supported without deleting evidence required for the test.

---

## 33. CI/CD Pipeline

### 33.1 Pull request fast gate

1. locked install;
2. format/lint/typecheck;
3. unit/component tests and meaningful coverage;
4. affected Worker integration tests;
5. clean/upgrade D1 migration tests;
6. content/schema/route/SEO generation checks;
7. Cloudflare-targeted production build;
8. secret/dependency/static security checks;
9. bundle budget checks;
10. changed-scope browser smoke where available.

### 33.2 Preview gate

After preview health:

- critical Chromium E2E;
- critical WebKit/Firefox subset;
- automated accessibility states;
- HTML-first SEO/canonical/robots/structured-data checks;
- sitemap/internal-link crawl;
- Lighthouse/bundle budgets;
- cache/security-header assertions;
- console/hydration/first-party network failure detection;
- preview `noindex` verification.

### 33.3 Main/release-candidate gate

- complete critical supported-engine suite;
- visual regression review;
- full contract and Worker integration suite;
- Odoo sandbox compatibility test when integration changed;
- queue duplicate/retry/DLQ/replay scenarios;
- full route/sitemap crawl;
- manual accessibility/RTL/responsive evidence;
- resilience scenarios appropriate to changed architecture;
- performance baseline/field review;
- `PRE_DEPLOY_CHECKLIST.md` and rollback readiness.

### 33.4 Post-production gate

Run read-only checks for:

- canonical domain, HTTPS, redirect chain, and representative statuses;
- initial HTML title/canonical/robots/content/structured data;
- sitemap/robots reachability and consistency;
- security/cache headers;
- static asset/image/font delivery;
- admin/private/API non-cache/noindex behavior where safely observable;
- release-correlated Worker, queue, Odoo sync, error, cache, and Web Vitals regressions;
- no preview/Worker/R2/Odoo hostname leakage.

Complete `POST_DEPLOY_CHECKLIST.md` after the observation window defined by deployment policy.

---

## 34. Change-Based Test Selection

| Changed area | Minimum mandatory scope |
|---|---|
| Content only | Schema, affected HTML/links/metadata, visual/manual review |
| Global CSS/design tokens | Component, RTL, responsive, visual, accessibility, performance |
| Shared component | Unit/component + every critical journey consuming it |
| Route/layout/middleware | Build, statuses, redirects, locale, SEO, cache, E2E |
| RFQ schema/UI/API | Unit, component, Worker, D1/R2, queue, E2E, a11y, security |
| D1 schema/migration | Clean/upgrade migration, integrity, query, rollback/forward-fix rehearsal |
| R2/upload | File validation, privacy, authorization, cleanup, E2E failure matrix |
| Queue/outbox/consumer | Producer, duplicate, retry, batch, DLQ, replay, observability |
| Odoo adapter/mapping | Unit, contract, sandbox, idempotency, partial-failure/reconciliation |
| Catalog/price sync | Mapping, versions, history, cache invalidation, HTML/SEO, stale behavior |
| CMS/admin/RBAC | Policy matrix, API, E2E, audit, cache/noindex |
| Metadata/SEO generator | Unit, generated output, crawl, structured data, deployed HTML |
| Cache policy | Worker integration, cross-user leakage, hit/miss/stale/invalidation |
| Analytics | Consent, privacy, duplicate event, blocked-provider behavior |
| Framework/runtime dependency | Full build, Worker suite, critical E2E, bundles, performance, security review |
| Cloudflare config | Bindings, preview deployment, headers, cache, queues, smoke/rollback plan |

Claude Code MUST select the broadest scope implied by a changed shared boundary, not only tests adjacent to the edited file.

---

## 35. Coverage Policy

Coverage is a diagnostic, not proof of quality.

Initial repository-wide targets:

| Measure | Minimum |
|---|---:|
| Statements | 80% |
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |

Critical RFQ, validation, Odoo mapping/idempotency, queue consumer, RBAC, cache policy, metadata, and security-domain modules SHOULD reach at least 90% lines/statements and 85% branches, with all material failure paths explicitly asserted.

Rules:

- new logic MUST not reduce meaningful coverage;
- generated/runtime glue exclusions require an explanation;
- tests written only to hit lines are prohibited;
- E2E coverage does not excuse missing pure-rule tests;
- Workers-runtime coverage MUST use a supported accurate method;
- coverage thresholds may be lowered only through a documented decision.

---

## 36. Test Organization and Command Interface

Recommended organization:

```text
tests/
  unit/
  component/
  workers/
  integration/
  contract/
  e2e/
  accessibility/
  visual/
  performance/
  resilience/
  fixtures/
  helpers/
```

Colocation is allowed when `FOLDER_STRUCTURE.md` permits it. Names MUST describe behavior, for example:

```text
rfq-schema.test.ts
rfq-builder.test.tsx
rfq-submit.worker.test.ts
rfq-outbox.integration.test.ts
odoo-rfq.contract.test.ts
queue-idempotency.test.ts
public-price-sync.test.ts
rfq-flow.spec.ts
canonical-routing.spec.ts
```

The repository SHOULD expose a predictable command interface equivalent to:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit tests/component",
    "test:workers": "vitest run --project workers",
    "test:integration": "vitest run tests/integration tests/contract",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:smoke": "playwright test --grep @smoke",
    "test:a11y": "playwright test --grep @a11y",
    "test:visual": "playwright test --grep @visual",
    "test:performance": "<project-approved Lighthouse command>",
    "test:ci": "pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm test:workers && pnpm build"
  }
}
```

This is an interface target, not permission to overwrite compatible existing scripts or invent unapproved dependencies.

---

## 37. Failure Diagnostics and Artifact Safety

On failure, retain the minimum useful evidence:

- concise assertion and requirement reference;
- failed/retried browser trace and screenshot;
- sanitized console/network summary;
- sanitized Worker/queue correlation trail;
- Lighthouse/bundle report;
- coverage/migration/query report where relevant.

Artifacts MUST NOT contain production secrets/cookies, authorization headers, real customer data, RFQ content, private file content/names, signed URLs, raw Odoo payloads, or uncontrolled database dumps.

Retention follows CI/privacy policy. Debug logging MUST be opt-in, time-bounded, and sanitized.

---

## 38. Flaky Test Policy

A flaky test is a delivery defect.

When a test fails intermittently:

1. preserve first-failure evidence;
2. identify product, environment, platform-simulator, or test nondeterminism;
3. fix the root cause;
4. quarantine only when necessary to restore signal;
5. assign owner and deadline;
6. retain equivalent risk coverage.

Retries collect evidence; they do not redefine instability as success. Do not add sleeps, weaken assertions, or broadly update snapshots. No P0 test may remain quarantined for release.

---

## 39. Defect Severity and Exceptions

| Severity | Definition | Default action |
|---|---|---|
| S0 | Active data exposure, destructive behavior, or critical compromise | Stop release/traffic; incident response |
| S1 | Lost/false RFQ, duplicate commercial record, broken canonical site, inaccessible core journey, major security defect | Block merge/release |
| S2 | Major degradation, stale/wrong public prices, significant SEO/performance/compatibility regression | Block release unless formally excepted |
| S3 | Localized functional/visual defect with limited impact | Fix or document before next release |
| S4 | Minor polish/test maintenance | Backlog with owner |

An exception MUST record requirement, affected users/data, evidence, security/privacy/SEO impact, mitigation, monitoring, rollback, owner, expiration, and follow-up issue. S0/S1 defects cannot receive ordinary release exceptions.

---

## 40. Definition of Done

A change is done only when:

- acceptance criteria and governing documents are identified;
- correct-layer tests cover success and material failure paths;
- lint, typecheck, relevant tests, and Cloudflare-targeted build pass;
- affected SEO, accessibility, RTL, responsive, performance, security, cache, and observability checks pass;
- D1 migrations and binding changes are validated where relevant;
- Odoo/queue changes prove idempotency and recovery;
- fixtures/artifacts contain no real or confidential data;
- no unrelated test is disabled, skipped, weakened, or broadly re-baselined;
- preview verification is complete for user-visible/runtime changes;
- `CHANGELOG.md`, `DECISIONS.md`, ADRs, runbooks, and specialist documents are updated where required;
- rollback/forward-fix remains possible;
- the implementation report names exactly which commands/scopes passed, failed, or could not run.

“Works locally,” “build passed,” or “snapshot updated” is not Definition of Done.

---

## 41. Release Acceptance Checklist

Before production:

- [ ] All P0/P1 automated suites pass.
- [ ] No unresolved S0/S1 defect exists.
- [ ] S2 exceptions, if any, are approved and time-bounded.
- [ ] Clean and upgrade D1 migration tests pass.
- [ ] RFQ durable acceptance and truthful failure paths pass.
- [ ] Odoo outage, committed-timeout reconciliation, duplicate queue delivery, retry, DLQ, and replay tests pass.
- [ ] R2 private attachment authorization and leakage tests pass.
- [ ] Catalog/public-price mapping, freshness, version ordering, and invalidation tests pass.
- [ ] Admin RBAC matrix and audit tests pass.
- [ ] Canonical, redirects, sitemap, robots, metadata, HTML-first content, and structured data pass.
- [ ] Automated and manual accessibility/RTL evidence is recorded.
- [ ] Supported-engine/responsive/visual checks pass.
- [ ] Performance and bundle budgets pass.
- [ ] Security, dependency, secret, header, cache-isolation, and privacy checks pass.
- [ ] Monitoring alerts/runbooks, release owner, and rollback target are ready.
- [ ] Preview is non-indexable and no internal hostname/secret leaks.
- [ ] `PRE_DEPLOY_CHECKLIST.md` is complete.

After production:

- [ ] Read-only canonical/status/HTML smoke tests pass.
- [ ] Edge cache and security headers match policy.
- [ ] Sitemap/robots/assets are reachable.
- [ ] No release-correlated Worker, queue, Odoo sync, 5xx, cache, or Web Vitals regression appears.
- [ ] `POST_DEPLOY_CHECKLIST.md` is complete.

---

## 42. Claude Code Operating Rules

Before code/test changes, Claude Code MUST:

1. read `CLAUDE.md`, task specification, and governing specialist documents;
2. inspect existing tools, scripts, tests, fixtures, migrations, bindings, and CI;
3. identify risk priority and affected layers;
4. preserve unrelated user changes;
5. avoid inventing Odoo models, fields, routes, thresholds, roles, or environment variables;
6. surface conflicts and decision gates instead of guessing.

During implementation:

- add the smallest sufficient tests at the correct layer;
- assert observable business/security outcomes;
- include negative, duplicate, timeout, and partial-failure paths for P0 boundaries;
- keep fixtures synthetic and logs/artifacts sanitized;
- never add a production security bypass for test convenience;
- never weaken existing tests to accept a regression.

Before completion:

- run focused tests and the broader scope required by the shared boundary;
- run typecheck and production build when relevant;
- report exact commands/scopes and results;
- distinguish product failure from environment/tool failure;
- list remaining risks and unrun checks explicitly;
- never claim “all tests pass” after running only a subset.

---

## 43. Initial Implementation Backlog

### Phase A — Foundation

- [ ] Confirm lockfile-pinned Vitest, Workers test integration, Testing Library, Playwright, and axe setup.
- [ ] Add coverage using the supported method for each test project.
- [ ] Add synthetic builders and shared clock/ID utilities.
- [ ] Add lint/type/build/schema/secret/bundle gates.
- [ ] Add route, canonical, metadata, robots, sitemap, and JSON-LD tests.

### Phase B — Cloudflare data boundaries

- [ ] Apply real D1 migrations in isolated Worker tests.
- [ ] Add D1 clean/upgrade/integrity/query suites.
- [ ] Add R2 public/private isolation and upload suites.
- [ ] Add Cache API allowlist/bypass/cross-user leakage tests.
- [ ] Add queue producer/consumer/outbox/idempotency suites.

### Phase C — RFQ and Odoo

- [ ] Add RFQ schema, component, Worker, transaction, and browser suites.
- [ ] Add Odoo adapter contract fixtures for confirmed API/version.
- [ ] Add duplicate, committed-timeout reconciliation, retry, DLQ, and replay cases.
- [ ] Add correlation/logging/alert assertions.

### Phase D — Admin, catalog, and price

- [ ] Add role × resource × action policy matrix.
- [ ] Add CMS lifecycle/revalidation tests.
- [ ] Add product/variant/UOM/public-price mapping and version tests.
- [ ] Add price history, freshness, stale-state, invalidation, and HTML/SEO tests.

### Phase E — Release quality

- [ ] Configure critical Playwright browser projects.
- [ ] Add accessibility, RTL, responsive, and visual suites.
- [ ] Add Lighthouse/bundle budgets and field monitoring.
- [ ] Add safe preview security checks and production read-only smoke tests.
- [ ] Rehearse rollback and failure-recovery runbooks.

---

## 44. Decision Gates Before Production

The following values MUST be confirmed in governing documents/configuration; tests MUST NOT guess them:

- exact production Odoo version, installed modules, API mode, and field/model mapping;
- final canonical host and locale publication plan;
- maximum RFQ items, attachment count, types, per-file and total size;
- upload scanning/quarantine and orphan-retention policy;
- final roles, permissions, authentication/session provider, and recovery policy;
- exact queue retry/backoff/batch/concurrency/DLQ thresholds;
- sync conflict/version and stale-public-price thresholds;
- production synthetic RFQ policy;
- supported browser and screen-reader matrix;
- alert thresholds, on-call owners, and observation windows;
- CI artifact retention and vulnerability exception SLA;
- final bundle budgets if `PERFORMANCE_BUDGET.md` supersedes the defaults here;
- whether a dedicated staging/Odoo test database is mandatory.

Until resolved, use deterministic fakes, isolated preview resources, non-destructive verification, and the stricter privacy/reliability behavior.

---

## 45. Requirement Traceability Summary

| Requirement | Primary automated evidence | Manual/operational evidence |
|---|---|---|
| Public pages independent of live Odoo | Worker/E2E with Odoo blocked | Production monitoring |
| Durable RFQ before success | D1/R2/outbox integration + E2E | Synthetic runbook if approved |
| No duplicate ERP records | Queue concurrency/replay + Odoo contract | DLQ/reconciliation rehearsal |
| Private attachments | R2 authorization/cache/security tests | Access review |
| Correct catalog/public price | Mapping/version/history/cache/HTML tests | Operator sampling |
| HTML-first SEO | JS-disabled crawl + metadata/status tests | Search validation sampling |
| Fast site | Bundle/Lighthouse/cache/query tests | Field p75 Web Vitals |
| Accessible Persian RTL | Component/axe/browser tests | Keyboard/zoom/screen reader review |
| Safe admin | RBAC/API/E2E/audit tests | Permission review |
| Recoverable operations | Fault injection/alerts/replay tests | Runbook/rollback rehearsal |

---

## 46. Reference Baseline

Implementation SHOULD consult current primary documentation rather than copying outdated setup snippets:

- Cloudflare Workers testing and current Vitest integration: <https://developers.cloudflare.com/workers/testing/>
- Cloudflare Workers Vitest integration: <https://developers.cloudflare.com/workers/testing/vitest-integration/>
- Cloudflare Queues delivery/retry/DLQ documentation: <https://developers.cloudflare.com/queues/>
- Next.js App Router testing guides: <https://nextjs.org/docs/app/guides/testing>
- Odoo 19 External JSON-2 API, if confirmed for production: <https://www.odoo.com/documentation/19.0/developer/reference/external_api.html>

Exact repository configuration and lockfile-pinned versions remain authoritative for implementation.

---

## 47. Final Acceptance Criteria for This Strategy

This strategy is implemented correctly when:

1. every P0/P1 requirement maps to explicit automated and, where necessary, manual evidence;
2. RFQ success proves durable website persistence rather than live Odoo availability;
3. duplicate delivery, partial ERP success, retry, DLQ, and replay are verified as idempotent and recoverable;
4. D1, R2, Queue, Cache, Turnstile, and Workers behavior is tested at real runtime boundaries;
5. public catalog/price pages remain fast, HTML-first, accurate, freshness-aware, and independent of live ERP;
6. admin permissions and every material mutation are enforceable and auditable;
7. SEO, performance, accessibility, RTL, security, privacy, and cache isolation are release gates;
8. production checks are safe and monitoring can detect release regressions;
9. test evidence contains no real customer data, secrets, private files, or ERP payloads;
10. Claude Code reports exactly what it tested and never converts unresolved decisions into invented behavior.

The suite must protect the Ahan Asa promise, **«ما مراقب سرمایه شما هستیم.»**, by preventing lost requests, duplicate commercial records, misleading prices, private-data exposure, broken search discovery, and slow or inaccessible user journeys.
