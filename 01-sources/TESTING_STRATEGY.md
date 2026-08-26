# Ahan Asa Website — Testing Strategy

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `TESTING_STRATEGY.md`  
> **Status:** Draft v1.0 — implementation and release contract  
> **Last updated:** 2026-08-25  
> **Launch locale:** Persian (`fa-IR`), fully RTL  
> **Application model:** Next.js App Router, TypeScript, static-first, server-first  
> **Delivery model:** Vercel behind Cloudflare

---

## 1. Purpose

This document defines how the Ahan Asa website must be tested before code is merged, before a release is promoted, and after production deployment. It is an implementation contract for Claude Code, human developers, reviewers, and release owners.

The testing strategy must provide evidence that the website:

1. renders approved Persian content accurately and accessibly;
2. preserves the canonical, unprefixed Persian URL model;
3. converts qualified visitors through the `/request` inquiry journey;
4. validates and stores inquiry data securely and truthfully;
5. remains usable across supported browsers, viewport sizes, input methods, and assistive technologies;
6. meets the approved SEO, performance, privacy, analytics, and security requirements;
7. fails safely when integrations or third-party services are unavailable;
8. can be deployed and rolled back without silently changing public behavior.

Passing a build is not sufficient evidence of quality. A release is acceptable only when the relevant automated checks, targeted manual checks, and production smoke checks have passed.

---

## 2. Product and Architecture Context

Ahan Asa is a premium B2B steel procurement website. Phase 1 is not an e-commerce store, supplier marketplace, customer portal, public inventory system, or live price board.

The approved architecture is:

| Concern | Phase 1 baseline |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript in strict mode |
| Rendering | Static generation and React Server Components by default |
| Client behavior | Small, justified interactive islands |
| Primary locale | Persian (`fa-IR`), fully RTL |
| Persian URLs | Canonical and unprefixed |
| Future locales | English and Arabic structurally supported but unpublished until complete |
| Primary conversion route | `/request` |
| Inquiry endpoint | `/api/inquiries` |
| Upload endpoint | Conditional `/api/uploads`, disabled until the complete secure workflow is approved |
| Hosting | Vercel behind Cloudflare |
| Analytics | Consent-aware GTM/GA4 after approved configuration |
| Abuse protection | Server validation, rate limiting, and approved bot protection |

Tests must enforce this scope. They must not normalize or legitimize unapproved features such as carts, checkout, public prices, customer accounts, or fake lead integrations.

---

## 3. Source of Truth and Conflict Rules

Testing verifies the implementation against approved project documents; it does not redefine them.

Use this hierarchy:

1. `CLAUDE.md` and `PROJECT_BRIEF.md`;
2. `TECHNICAL_ARCHITECTURE.md`;
3. the specialized document that owns the behavior being tested;
4. this `TESTING_STRATEGY.md`;
5. `DEVELOPMENT_RULES.md` and `CODING_STANDARDS.md`;
6. task-specific acceptance criteria.

Examples of governing documents:

| Test concern | Governing documents |
|---|---|
| Routes, redirects, status codes | `ROUTES.md`, `SITEMAP_ROBOTS_SPEC.md`, `REDIRECTS.md` |
| Canonical and locale behavior | `LOCALIZATION.md`, `HREFLANG_CANONICAL.md` |
| Metadata and structured data | `METADATA_SPEC.md`, `STRUCTURED_DATA.md` |
| Inquiry and upload behavior | `FORM_ARCHITECTURE.md`, `API_INTEGRATIONS.md`, `DATA_ARCHITECTURE.md` |
| Security and privacy | `SECURITY_GUIDELINES.md`, `ENVIRONMENT_VARIABLES.md` |
| Accessibility | `ACCESSIBILITY.md` |
| Responsive behavior | `RESPONSIVE_RULES.md` |
| Components | `COMPONENT_ARCHITECTURE.md`, `UI_COMPONENTS.md` |
| Performance | `PERFORMANCE_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md`, `CACHING_STRATEGY.md` |
| Analytics | `ANALYTICS_TRACKING.md` |
| Deployment | `DEPLOYMENT_ARCHITECTURE.md` |

If documents conflict, Claude Code must not alter a test merely to make the current implementation pass. It must identify the conflict, preserve the safer working behavior, and record or request a decision. A `TBD` must remain a `TBD`; tests must not convert it into an assumed production rule.

---

## 4. Testing Objectives

### 4.1 Correctness

- Approved routes render the correct page and content model.
- Components honor their documented variants, states, and boundaries.
- Inquiry validation produces deterministic, user-understandable results.
- Server behavior is authoritative at every trust boundary.
- A successful response is returned only after the approved durable lead operation succeeds.

### 4.2 User trust

- The site never reports a false inquiry success.
- Contact details, claims, evidence, and calls to action are approved and consistent.
- Personal and project data are not exposed through URLs, client bundles, analytics, or logs.
- Unavailable capabilities are not presented as operational.

### 4.3 Discoverability

- Canonicals, hreflang, metadata, sitemap, robots directives, redirects, and structured data match the approved route model.
- Primary content and navigation are present in server-rendered HTML.
- Preview, Vercel, API, and private routes do not leak into indexable surfaces.

### 4.4 Inclusive usability

- Core journeys work with keyboard, touch, pointer, zoom, reduced motion, forced colors, and representative screen readers.
- Persian reading order, bidi behavior, form labels, errors, and numbers remain understandable.
- Future LTR support is not blocked by direction-specific component assumptions.

### 4.5 Operational confidence

- Pull requests receive fast, deterministic feedback.
- High-risk paths receive deeper integration and end-to-end coverage.
- Deployments receive read-only production verification.
- Failures identify the affected requirement rather than producing opaque snapshots.

---

## 5. Risk-Based Test Priorities

Testing effort must follow risk, not raw file count.

| Priority | Area | Failure impact | Required evidence |
|---|---|---|---|
| P0 | Inquiry submission and durable persistence | Lost or falsely acknowledged lead | Unit, integration, contract, E2E, failure-path tests |
| P0 | Personal data and document handling | Confidentiality or legal breach | Security, integration, negative, logging/privacy tests |
| P0 | Production routing and canonical domain | Traffic/indexing loss | Route, redirect, SEO, deployment smoke tests |
| P1 | Navigation and primary CTAs | Broken discovery or conversion | Component and E2E tests |
| P1 | Metadata, sitemap, robots, JSON-LD | Search visibility or eligibility loss | Build-time and deployed-page tests |
| P1 | Accessibility of core journeys | Excluded users and compliance failure | Automated plus manual accessibility tests |
| P1 | Persian RTL and responsive layouts | Major usability failure | Component, visual, browser, and manual tests |
| P1 | Security controls and abuse resistance | Service or data compromise | Static, dependency, API, header, and abuse tests |
| P2 | Analytics events and consent | Corrupted measurement or privacy risk | Typed event, consent, and browser tests |
| P2 | Media and motion | Performance or comprehension degradation | Visual, accessibility, and performance tests |
| P2 | Integration degradation | Misleading state or operational disruption | Fault-injection and fallback tests |
| P3 | Low-risk presentational refinements | Minor visual inconsistency | Focused component or visual checks |

P0 failures block merge and release. P1 failures block release unless the governing owner approves a documented, time-bounded exception. P2 and P3 exceptions require documented impact and follow-up ownership.

---

## 6. Core Principles

### 6.1 Test observable behavior

Prefer assertions on accessible roles, names, visible states, generated metadata, HTTP behavior, persisted outcomes, and approved side effects. Avoid tests coupled to private component state, internal React implementation details, or incidental DOM structure.

### 6.2 Use the smallest effective test level

Pure rules belong in unit tests. Component interaction belongs in component tests. Trust boundaries and adapters belong in integration or contract tests. Only complete user journeys belong in E2E tests.

### 6.3 Server validation is authoritative

Client validation improves usability but never replaces API validation. Every client validation rule with security or data-integrity impact must also be verified at the server boundary.

### 6.4 Test failure paths deliberately

For forms, uploads, storage, CRM, analytics, and network-dependent behavior, the unhappy paths are release requirements. Timeouts, malformed responses, duplicate submissions, provider rejection, and partial dependency failure must not create false success.

### 6.5 Keep tests deterministic

Freeze time where time matters. Control randomness. Do not rely on shared production records, external network availability, arbitrary sleeps, or execution order.

### 6.6 Accessibility is not snapshot coverage

Automated accessibility scanning is necessary but incomplete. Keyboard, focus, zoom, reading order, screen-reader announcements, reduced motion, and content clarity require manual verification.

### 6.7 Production smoke tests are non-destructive

Production checks must be read-only by default. A real inquiry may be submitted only through an explicitly approved synthetic-lead procedure with tagging, ownership, notification expectations, and cleanup rules.

### 6.8 No sensitive test data

Tests must use synthetic names, phone numbers, emails, company names, inquiry descriptions, and files. Never copy real customer, supplier, employee, quotation, invoice, or project data into fixtures, snapshots, logs, screenshots, or CI artifacts.

---

## 7. Test Portfolio

The project uses a layered portfolio rather than a rigid numeric pyramid.

| Level | Purpose | Typical scope | Execution |
|---|---|---|---|
| Static checks | Prevent invalid code and content | TypeScript, lint, schemas, forbidden imports | Every change |
| Unit tests | Verify pure rules and transforms | Validators, builders, selectors, normalization | Every change |
| Component tests | Verify UI semantics and interaction | Forms, navigation, accordions, dialogs, feedback | Every change |
| Integration tests | Verify internal boundaries | Route Handlers, repositories, adapters, content loaders | Every relevant change |
| Contract tests | Verify external interface assumptions | CRM, storage, Turnstile, analytics payloads | Every relevant change |
| E2E tests | Verify critical user journeys | Route discovery, inquiry flow, navigation | Preview/main |
| Non-functional tests | Verify quality characteristics | Accessibility, SEO, performance, security, visual | Preview/release |
| Production smoke tests | Verify deployed essentials | Domain, redirects, headers, primary pages | After deployment |

The suite should contain many fast tests and a small, high-value E2E layer. Do not reproduce every unit permutation in a browser test.

---

## 8. Recommended Test Tooling

Use the exact project-approved and lockfile-pinned versions. If `STACK.md` selects an equivalent tool, follow `STACK.md`.

| Need | Recommended baseline |
|---|---|
| Test runner and coverage | Vitest with V8 coverage |
| DOM and component behavior | Testing Library with `@testing-library/jest-dom` |
| User interaction | `@testing-library/user-event` |
| Browser E2E | Playwright |
| Automated accessibility | `axe-core` through an approved Playwright or component integration |
| HTTP dependency simulation | MSW or adapter-level fakes |
| Schema validation | Project-approved Zod-compatible schemas |
| Performance regression | Lighthouse CI plus Web Vitals monitoring |
| Security checks | Secret scanning, dependency audit, static analysis, and safe preview scanning |

Rules:

- Do not introduce both Vitest and Jest without an approved migration reason.
- Do not install a second browser automation framework for convenience.
- Do not call live third-party services from pull-request tests.
- Do not use snapshot testing as the primary assertion strategy.
- Do not update snapshots automatically in CI.
- Any new testing dependency must have a clear owner, locked version, and justified maintenance cost.

---

## 9. Static and Build-Time Checks

Every pull request must run:

1. dependency installation from the committed `pnpm` lockfile;
2. formatting verification where configured;
3. linting with zero unapproved errors;
4. TypeScript strict checking;
5. unit and component tests;
6. production build;
7. content/schema validation;
8. route, metadata, and structured-data validation where generated at build time;
9. forbidden import and server/client boundary checks where configured;
10. secret and high-confidence credential scanning.

The build must fail when:

- required public content is missing;
- a route record violates its schema;
- two canonical pages claim the same route unexpectedly;
- a server-only module enters a client bundle;
- an unpublished locale is emitted as an indexable route;
- structured data cannot be serialized safely;
- a required environment variable is missing from an environment that actually uses the capability;
- an optional, disabled integration incorrectly becomes required for static public pages.

---

## 10. Unit Testing

Unit tests must cover deterministic functions without rendering the full application.

### 10.1 Required targets

- inquiry schemas and field-level constraints;
- Persian and Latin digit normalization where approved;
- whitespace, phone, email, and text normalization;
- locale, direction, route, canonical, and alternate-link builders;
- metadata, Open Graph, robots, and JSON-LD builders;
- sitemap inclusion and exclusion rules;
- content selectors, filters, sorting, and related-content logic;
- safe analytics payload construction;
- rate-limit decision helpers when separable from infrastructure;
- upload allowlist, size, extension, and MIME validation rules;
- correlation ID and safe error mapping;
- cache key and revalidation policy helpers;
- adapter result mapping and retry classification;
- environment configuration parsing.

### 10.2 Boundary cases

Each validation rule must include valid, invalid, minimum, maximum, empty, null-like, Unicode, and normalization cases as relevant. Test mixed Persian/Latin digits, Persian/Arabic character variants, bidi-sensitive input, leading/trailing whitespace, and unexpectedly long strings.

### 10.3 Prohibited patterns

- Testing a private helper solely to match its current implementation.
- Large snapshots of page HTML, JSON-LD, or configuration without semantic assertions.
- Mocking the function under test.
- Silently accepting unknown fields at external trust boundaries.

---

## 11. Component Testing

Component tests must verify semantics, interaction, state transitions, and direction behavior.

### 11.1 Query strategy

Use queries in this order:

1. accessible role and accessible name;
2. associated label text;
3. visible text when it is the intended contract;
4. approved stable test ID only when no meaningful semantic query exists.

CSS class names, generated IDs, and DOM depth are not stable public contracts.

### 11.2 Required states

Interactive components must be tested, as applicable, for:

- initial/default;
- hover-independent keyboard operation;
- focus and focus-visible behavior;
- expanded/collapsed or open/closed;
- loading and pending;
- empty;
- validation error;
- dependency error;
- success;
- disabled and unavailable;
- reduced-motion behavior;
- RTL and future LTR direction.

### 11.3 Priority components

- header, mobile navigation, skip link, breadcrumbs, and footer;
- primary and secondary CTAs;
- inquiry form fields, grouped controls, consent, errors, and submission feedback;
- accordions, tabs, dialogs, drawers, menus, and carousels if approved;
- cards and links whose accessible name includes Persian text;
- responsive image and media wrappers;
- alert, status, toast, and inline feedback patterns;
- any component that switches behavior between server and client boundaries.

Component tests must confirm that accessible names and descriptions remain meaningful in Persian, not merely that an element exists.

---

## 12. Integration Testing

Integration tests verify boundaries between application modules without depending on real external services.

### 12.1 Inquiry Route Handler

`/api/inquiries` tests must cover:

- accepted method and content type;
- malformed JSON or body data;
- missing and invalid required fields;
- normalization followed by authoritative validation;
- unexpected fields and payload size limits;
- server-side bot-verification results;
- rate-limit allowed and denied outcomes;
- repository/lead-adapter success;
- provider validation error;
- provider authentication/configuration error;
- timeout and temporary provider failure;
- durable fallback/outbox behavior if approved;
- duplicate/replayed submission behavior;
- correlation ID generation and propagation;
- safe public error response;
- safe structured logs without personal data;
- success only after the approved durable operation succeeds.

### 12.2 Repository and Adapter Boundaries

Each adapter must pass the same behavior contract:

- normalized inquiry input maps correctly;
- required business fields are preserved;
- provider-specific errors map to stable domain errors;
- secrets are never included in returned errors;
- retryable and permanent failures are distinguishable;
- idempotency behavior matches the approved integration;
- optional providers do not break public page rendering.

### 12.3 Content and Build Integration

Tests must load representative real content records and verify:

- schema validity;
- unique slugs and IDs;
- valid internal references;
- approved media paths and required alternative text;
- no draft content in production output;
- no future-locale route without complete approved content;
- deterministic sitemap and metadata generation.

---

## 13. External Contract Testing

External services must be hidden behind adapters. Contract tests verify the adapter's assumption about each provider without making ordinary CI dependent on that provider.

Potential contracts include:

- approved CRM or lead sink;
- private object storage;
- Cloudflare Turnstile verification;
- notification service;
- GTM/GA4 event payloads;
- CMS, only if later approved.

For each contract, maintain:

1. a sanitized success fixture;
2. documented permanent-error fixtures;
3. documented transient-error fixtures;
4. a schema or explicit response validator;
5. a controlled sandbox verification procedure where the provider supports it.

Provider sandbox tests may run on a schedule or before integration releases. They must use dedicated test credentials, synthetic data, explicit timeouts, and safe cleanup. Production credentials must never be available to pull-request jobs.

---

## 14. End-to-End Testing

E2E tests should cover a small number of business-critical journeys across real browser rendering.

### 14.1 Mandatory journeys

#### Journey A — Discover the procurement offer

1. Open the canonical Persian home page.
2. Confirm `lang="fa"` and `dir="rtl"`.
3. Use primary navigation by keyboard.
4. Visit a core service/capability page.
5. Reach `/request` through the intended CTA.

#### Journey B — Submit a valid inquiry

1. Open `/request`.
2. Complete all required fields with synthetic data.
3. Verify client feedback and accessible pending state.
4. Submit to a controlled test lead adapter.
5. Confirm the success message and stable completion behavior.
6. Confirm that the outbound record contains only approved normalized fields.

#### Journey C — Correct an invalid inquiry

1. Submit empty and invalid fields.
2. Confirm focus moves or is guided to the error summary/first invalid control as specified.
3. Confirm each error is associated with its field.
4. Correct the data without losing valid entries.
5. Submit successfully.

#### Journey D — Handle dependency failure truthfully

1. Simulate a lead sink timeout or failure.
2. Confirm that no success message appears.
3. Confirm the user receives the approved recoverable error state.
4. Confirm no duplicate is created when retrying under the approved policy.

#### Journey E — Navigate on a small screen

1. Use a 320 CSS-pixel viewport.
2. Open and close mobile navigation by keyboard and touch-equivalent input.
3. Verify focus containment/restoration where applicable.
4. Reach primary content and `/request` without horizontal page scrolling.

#### Journey F — Verify canonical discovery

1. Visit representative canonical routes.
2. Verify title, description, canonical, robots, Open Graph, and structured data.
3. Verify internal links use the canonical host and route form.
4. Verify `/request` uses `noindex, follow` as specified.

### 14.2 Browser projects

The automated baseline should include:

- Chromium desktop for the full critical suite;
- WebKit desktop or mobile for the critical journey subset;
- Firefox desktop for the critical journey subset;
- a representative mobile Chromium viewport;
- a representative mobile WebKit viewport.

Exact browser versions are owned by the Playwright lockfile and CI image. Avoid hard-coding consumer version numbers in this document.

### 14.3 E2E rules

- Use web-first assertions; do not use arbitrary sleeps.
- Wait for observable state, not implementation events.
- Isolate records per test and generate unique synthetic identifiers.
- Capture trace, screenshot, console, and network diagnostics only on failure or retry.
- Treat unexpected page errors, unhandled rejections, failed first-party requests, and hydration errors as failures.
- Block or control nonessential third-party scripts unless the test specifically verifies them.

---

## 15. Form and Lead-Capture Test Matrix

| Area | Required cases |
|---|---|
| Required fields | Empty, whitespace-only, missing key, valid value |
| Phone | Approved Iranian/international forms, Persian digits if supported, invalid length, letters, separators |
| Email | Empty when optional, valid, malformed, excessive length |
| Text fields | Minimum/maximum, multiline, Unicode, bidi input, HTML-like text, unexpected control characters |
| Consent | Unchecked, checked, clear label and link behavior |
| Client/server parity | Client rejection, direct API rejection, normalized accepted input |
| Pending state | Repeat click, Enter submission, disabled behavior, announced status |
| Success | Durable write, approved message, no sensitive data in URL |
| Failure | Validation, rate limit, bot rejection, timeout, provider failure, safe retry |
| Duplicate control | Double click, browser retry, repeated idempotency key if approved |
| Logging | Correlation ID present; personal fields absent or redacted |
| Analytics | Approved outcome category only; no form content or personal data |

Error messages must be tested for meaning and association, not exact punctuation unless approved copy is itself the contract.

---

## 16. Upload Testing

The upload UI and `/api/uploads` must remain unavailable until the complete approved workflow is implemented. Tests must verify that an incomplete capability is not exposed.

When uploads are approved, test:

- allowlisted extension, MIME type, and file signature;
- maximum individual and total size;
- zero-byte, truncated, corrupted, and polyglot-like files;
- renamed executable or disallowed content;
- filename normalization and unsafe path characters;
- short-lived signed authorization and expiry;
- inquiry-to-document relationship;
- private storage and denied anonymous retrieval;
- malware-scanning/quarantine state if required;
- timeout, interrupted upload, cancellation, and retry;
- cleanup of abandoned or rejected objects;
- no public object URL in page source, analytics, logs, or success UI;
- accessible progress and failure feedback.

Use harmless purpose-built fixtures. Do not introduce actual malware into the repository. Use the approved industry test string only in an isolated security test environment when explicitly authorized.

---

## 17. Route, Localization, and Direction Testing

### 17.1 Phase 1 route rules

Tests must verify:

- Persian canonical pages are unprefixed;
- `/fa` and `/fa/**` follow the approved permanent redirect policy;
- `/en/**` and `/ar/**` are not published or indexable before complete approval;
- canonical URLs use `https://www.ahanassa.com` if that remains the deployment specification;
- the apex domain redirects permanently to the canonical `www` host;
- query parameters do not create alternate canonical pages unless explicitly approved;
- trailing-slash and case behavior are consistent;
- removed routes follow `REDIRECTS.md` or return the approved status;
- preview and Vercel hostnames never appear in canonical, Open Graph, sitemap, JSON-LD, or internal links.

### 17.2 Document direction

For Persian pages, verify:

- `<html lang="fa" dir="rtl">`;
- logical CSS properties are used where direction can change;
- icons with directional meaning mirror only when appropriate;
- phone numbers, emails, URLs, Latin product codes, and quantities remain readable;
- field labels, helper text, errors, and units have correct visual and reading order;
- horizontal overflow does not appear at 320 px or 200% zoom.

### 17.3 Future locale readiness

Direction-sensitive primitives should receive targeted tests under both `dir="rtl"` and `dir="ltr"`. This does not authorize publishing incomplete English or Arabic pages.

---

## 18. SEO Testing

SEO checks must run against generated output and representative deployed pages.

### 18.1 Per-page checks

- exactly one approved title and meta description;
- one canonical URL matching the public route;
- correct robots directive;
- approved Open Graph and social metadata;
- a meaningful, unique H1 aligned with the page specification;
- crawlable primary navigation and internal links;
- server-rendered main content;
- valid structured data using only visible, approved claims;
- no placeholder, staging, localhost, preview, or Vercel origin URL;
- no accidental locale alternate for unpublished content.

### 18.2 Site-wide checks

- sitemap contains only canonical, indexable, successful public routes;
- `/request`, API routes, private assets, preview routes, and redirected URLs are excluded as specified;
- robots rules do not block required public assets or accidentally allow private endpoints;
- internal links do not target redirects, 404s, or unpublished locales;
- canonical pages return `200`, intentional redirects return the approved permanent code, and missing routes return the approved `404` behavior;
- structured data parses and matches the approved schema contract.

Automated checks must validate shape and internal consistency. Search-engine eligibility tools may be used as supplementary manual evidence, not as the sole release test.

---

## 19. Accessibility Testing

The target is the standard defined by `ACCESSIBILITY.md`; automated tools do not replace that document.

### 19.1 Automated checks

Run axe-based checks on at least:

- home page;
- one representative content-heavy page;
- navigation open state;
- `/request` default state;
- `/request` validation-error state;
- `/request` pending, failure, and success states;
- any approved dialog, drawer, accordion, tabs, or carousel.

No unapproved serious or critical automated accessibility violation may ship.

### 19.2 Manual checks

For every release candidate, verify core journeys with:

- keyboard only;
- visible focus and logical focus order;
- skip link;
- 200% browser zoom;
- 320 CSS-pixel width/reflow;
- reduced-motion preference;
- forced-colors/high-contrast mode where supported;
- representative screen reader and browser combinations;
- touch target usability on mobile;
- Persian reading order and status/error announcements.

### 19.3 Content checks

- alternative text communicates the approved purpose of informative images;
- decorative images are ignored by assistive technology;
- link text is meaningful out of context where practical;
- headings form a useful hierarchy;
- instructions do not rely only on color, position, shape, or motion;
- error messages explain how to recover;
- no auto-playing media or motion violates the approved policy.

Record manual accessibility evidence in the release checklist or pull request when the change affects a core journey.

---

## 20. Responsive and Cross-Browser Testing

Test behavior at content-driven boundaries, not only device labels.

### 20.1 Required viewport coverage

- 320 px minimum supported width;
- a common narrow mobile width;
- a wider mobile/small tablet width;
- tablet portrait/landscape as relevant;
- standard desktop;
- wide desktop with controlled line lengths and layout bounds.

Responsive tests must inspect intermediate widths around navigation, grid, typography, table, and form transitions.

### 20.2 Required assertions

- no unintended horizontal page overflow;
- no clipped focus ring, content, or CTA;
- navigation remains operable;
- text does not overlap or truncate essential meaning;
- tables and long technical content follow the approved overflow pattern;
- fixed/sticky elements do not obscure focused controls or anchors;
- responsive media reserves space and preserves intended crop;
- form input zoom and virtual-keyboard behavior remain usable;
- touch interactions have a keyboard-accessible equivalent.

Browser support is defined by `STACK.md` or the approved browser-support policy. Tests should focus on rendering engines and capabilities rather than an expanding list of devices.

---

## 21. Visual Regression Testing

Visual regression is appropriate for stable, high-value surfaces. It must not replace semantic assertions.

Recommended visual baselines:

- site header and navigation states;
- home page above the fold;
- representative page section composition;
- core card/grid patterns;
- inquiry form default, error, pending, and success states;
- footer;
- representative RTL and LTR component harnesses;
- 320 px and standard desktop compositions.

Baseline rules:

- freeze animation, time, random content, and remote media;
- use approved local fixtures and deterministic fonts;
- mask only genuinely unstable, non-contract content;
- review diffs at the same viewport, browser, device scale, and font environment;
- require a human reviewer to approve intentional baseline changes;
- do not accept a broad baseline update without linking it to approved design changes.

Pixel differences caused by a missing font or failed asset are defects, not noise to be masked.

---

## 22. Performance Testing

`PERFORMANCE_GUIDELINES.md` owns budgets and remediation rules. Testing must enforce them.

### 22.1 Field targets

At the 75th percentile for representative real-user traffic, the public site should meet the accepted Core Web Vitals thresholds:

- LCP: at or below 2.5 seconds;
- INP: at or below 200 milliseconds;
- CLS: at or below 0.1.

Field data requires sufficient samples and is not available for every new route. Lab checks provide pre-release regression evidence but do not prove field performance.

### 22.2 Lab checks

Run Lighthouse or equivalent checks on:

- home page;
- a representative content-heavy page;
- a media-heavy page if approved;
- `/request`;
- any route affected by a performance-sensitive change.

Enforce the approved budgets for JavaScript, CSS, images, fonts, requests, and layout shift. Until exact budgets are ratified in `PERFORMANCE_GUIDELINES.md`, compare against the accepted baseline and block material unexplained regression rather than inventing a new budget.

### 22.3 Component and build performance checks

- prevent accidental client conversion of server-rendered sections;
- detect unexpected growth in route bundles;
- verify below-fold heavy modules are lazy-loaded where specified;
- verify image dimensions and responsive sources;
- verify font loading and fallback behavior;
- verify no hydration error or avoidable layout shift;
- verify third-party tags do not load before approved consent and timing rules.

Performance tests should run in a controlled environment and be repeated before treating a marginal change as a regression.

---

## 23. Security Testing

Security testing follows `SECURITY_GUIDELINES.md` and the OWASP ASVS 5.0 Level 1 baseline, with selected Level 2 controls for inquiries, integrations, personal data, and documents.

### 23.1 Automated security checks

- secret and credential scanning;
- dependency vulnerability audit;
- static analysis for supported high-confidence rules;
- production-build inspection for server-only values in client assets;
- security-header assertions on preview and production;
- API validation and content-type tests;
- rate-limit and bot-verification integration tests;
- safe passive/baseline scanning against an authorized preview environment.

No known critical or high-severity exploitable vulnerability in shipped production code or runtime dependencies may be released without an approved security exception and mitigation. Severity alone does not replace exploitability review, but uncertainty must not be treated as safety.

### 23.2 Manual security scenarios

- direct API calls bypassing client validation;
- oversized and malformed bodies;
- HTML/script-like and injection-like input handled as data;
- request smuggling or proxy-specific tests only in an authorized controlled environment;
- missing/invalid bot token;
- rate-limit evasion cases relevant to trusted proxy configuration;
- sensitive data absence from URL, HTML, analytics, logs, and client errors;
- cache behavior for API and personalized/error responses;
- denied access to private uploads;
- preview-deployment protection and environment separation.

Never run destructive, high-volume, or aggressive security tests against production without explicit authorization and an operational plan.

### 23.3 Header checks

Verify the approved values and environment differences for:

- HTTPS redirect and HSTS;
- Content Security Policy;
- frame-ancestor protection;
- content-type sniffing protection;
- referrer policy;
- permissions policy;
- caching rules for public pages and APIs;
- removal of unnecessary technology disclosure where controllable.

Header tests must account for the combined Cloudflare and Vercel response, not only local development.

---

## 24. Analytics and Consent Testing

Analytics tests must prove both event correctness and data minimization.

Test that:

- no analytics or advertising behavior starts before the approved consent condition;
- denial or withdrawal is respected;
- page-view behavior matches App Router navigation;
- approved CTA events fire once with the approved event name and parameters;
- inquiry attempt, validation outcome, success, and failure use approved categories only;
- no name, phone, email, free-text inquiry, filename, document URL, full query string, or other personal/confidential data is sent;
- preview and automated-test traffic are excluded or clearly identified according to the analytics specification;
- duplicate events are not produced by hydration, route transitions, retries, or repeated listeners;
- a blocked analytics provider never blocks content, navigation, or inquiry submission.

Tests should intercept and inspect outbound payloads. A visible `dataLayer` push is not sufficient if the final transmitted payload differs.

---

## 25. Reliability and Degraded-Service Testing

Public content must remain available when optional services fail.

Simulate:

- CRM/lead sink timeout;
- notification provider failure after a durable lead write;
- analytics/tag manager blocked;
- bot-protection script blocked or slow;
- private storage unavailable;
- remote media unavailable;
- malformed CMS data if a CMS is later approved;
- stale cache or origin error in a controlled environment.

Expected principles:

- public pages and navigation remain usable;
- failure of analytics never affects conversion;
- failure of notification does not erase a durable lead;
- failure before durable lead persistence never displays success;
- unavailable upload capability is hidden or clearly disabled as specified;
- errors expose no provider secrets or internal topology;
- retry behavior does not amplify duplicates or load.

---

## 26. Test Data and Fixtures

### 26.1 Data policy

All committed fixtures must be synthetic, minimal, and reviewable. Use obviously non-real example domains and reserved documentation values where practical.

Do not include:

- real customer or supplier information;
- production lead exports;
- real quotations, invoices, bills of quantities, or contracts;
- production access tokens, signed URLs, cookies, or provider responses containing identifiers;
- copyrighted or confidential documents used without approval.

### 26.2 Fixture design

Maintain builders for:

- valid minimal inquiry;
- valid full inquiry;
- each invalid boundary case;
- provider success, validation failure, timeout, and transient failure;
- representative Persian content records;
- representative metadata and structured data;
- safe upload samples after upload approval.

Prefer builders with explicit overrides over large duplicated JSON fixtures. Keep provider fixtures sanitized and versioned with the adapter contract.

### 26.3 Time and identity

- freeze or inject time for date-dependent content;
- generate a unique test correlation/idempotency marker;
- avoid globally shared mutable records;
- clean up sandbox records where the provider supports cleanup;
- never assert against a production sequence number or current record count.

---

## 27. Mocking and Simulation Policy

Mock only at owned boundaries.

Preferred order:

1. pure fake implementing the domain adapter;
2. HTTP interception at the external-provider boundary;
3. provider sandbox for scheduled or release contract verification;
4. production service only for an explicitly approved read-only or synthetic check.

Do not mock:

- the primary function being tested;
- browser navigation in an E2E journey;
- framework behavior when the test is intended to verify framework integration;
- server validation in a form E2E test;
- persistence success when the requirement is specifically durable persistence.

Mocks must model failure as well as success. A success-only mock suite is incomplete for every P0 integration.

---

## 28. Test Environments

| Environment | Purpose | External services | Data |
|---|---|---|---|
| Local | Development and focused tests | Fakes by default | Synthetic |
| CI unit/integration | Deterministic merge gates | No live third parties | Synthetic, isolated |
| Preview | Deployed E2E, accessibility, SEO, performance, safe security checks | Sandbox/fakes as approved | Synthetic |
| Staging, if approved | Release rehearsal and provider contracts | Sandbox or isolated non-production integrations | Synthetic |
| Production | Read-only deployment smoke and monitoring | Real configured services | No form write unless synthetic procedure is approved |

Environment requirements:

- preview and production secrets are separate;
- preview deployments remain access-controlled as specified;
- production-only integrations cannot be accidentally selected in pull-request CI;
- environment configuration is parsed and validated centrally;
- missing optional integration configuration disables that capability safely;
- test bypasses are impossible or unavailable in production.

---

## 29. CI/CD Test Pipeline

### 29.1 Pull request — fast gate

Run on every relevant change:

1. locked dependency install;
2. format/lint/type checks;
3. unit and component tests with coverage;
4. integration tests using controlled adapters;
5. content and schema validation;
6. production build;
7. secret scan and dependency/static security checks;
8. changed-scope E2E smoke where infrastructure permits.

### 29.2 Preview deployment — deployed behavior

After the preview becomes healthy:

- critical Chromium E2E journeys;
- representative WebKit/Firefox subset;
- automated accessibility scans;
- metadata, canonical, robots, JSON-LD, and internal-link checks;
- Lighthouse/budget checks on representative routes;
- safe response-header and passive security checks;
- console, hydration, and failed-first-party-request checks.

### 29.3 Main branch or release candidate — full gate

Run:

- complete supported-browser critical suite;
- full accessibility automation plus recorded manual checks;
- visual regression suite;
- integration contract suite appropriate to the release;
- full route and sitemap crawl;
- performance comparison against the accepted baseline;
- deployment configuration review;
- `PRE_DEPLOY_CHECKLIST.md`.

### 29.4 After production deployment

Run read-only checks for:

- `https://www.ahanassa.com/` returns a successful canonical page;
- `https://ahanassa.com/` permanently redirects to the canonical host;
- representative public routes return expected statuses;
- `/fa/**` redirect behavior is correct;
- title, canonical, robots, and structured data are correct;
- sitemap and robots are reachable and consistent;
- primary navigation and static assets load;
- `/request` renders and remains `noindex, follow`;
- security and cache headers match production policy;
- no preview/Vercel origin leaks into public output;
- monitoring shows no release-correlated error spike.

Then complete `POST_DEPLOY_CHECKLIST.md`.

---

## 30. Change-Based Test Selection

At minimum, apply this mapping:

| Changed area | Mandatory test impact |
|---|---|
| Content only | Schema, affected page, links, metadata, visual review |
| Design tokens/global CSS | Component, responsive, visual, accessibility, performance |
| Shared component | Unit/component plus every critical journey using it |
| Route/layout/middleware | Build, route, redirect, locale, SEO, E2E |
| Inquiry schema/form | Unit, component, integration, E2E, accessibility, analytics/privacy |
| API/adapter | Unit, integration, contract, security, failure-path E2E |
| Upload flow | Full upload, security, privacy, storage, accessibility, failure matrix |
| Metadata/SEO generator | Unit, site crawl, structured data, deployed-page validation |
| Analytics | Consent, payload, duplicate-event, privacy, blocked-provider tests |
| Dependency/framework update | Full build, unit/integration, critical E2E, bundle/performance, security review |
| Cloudflare/Vercel config | Preview/staging verification, headers, redirects, cache, production smoke plan |

Claude Code must run the broadest test scope implied by the affected shared boundary, not only the file directly edited.

---

## 31. Coverage Policy

Coverage is a diagnostic signal, not a quality score.

Initial repository-wide thresholds:

| Measure | Minimum |
|---|---:|
| Statements | 80% |
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |

Critical inquiry, validation, route, metadata, security, and adapter domain modules should target at least 90% lines/statements and 85% branches, with all material failure paths explicitly tested.

Rules:

- New or materially changed logic must not reduce meaningful coverage.
- Exclusions require a code comment or configuration note explaining why execution is unreachable, generated, or unsuitable for unit coverage.
- Do not write low-value assertions solely to reach a percentage.
- E2E coverage does not excuse missing unit coverage for pure business rules.
- A covered line without an outcome assertion is not proof of correctness.

Thresholds may be raised after the baseline suite stabilizes. Lowering them requires a documented decision.

---

## 32. Test Organization and Naming

Recommended structure:

```text
tests/
  unit/
  component/
  integration/
  contract/
  e2e/
  accessibility/
  visual/
  performance/
  fixtures/
  helpers/
```

Colocation is allowed for focused unit/component tests if `FOLDER_STRUCTURE.md` approves it. Keep browser tests and cross-feature fixtures in the shared `tests/` hierarchy.

Naming conventions:

- `*.test.ts` for non-browser logic;
- `*.test.tsx` for rendered components;
- `*.spec.ts` for Playwright/browser flows;
- test titles describe the behavior and expected outcome;
- tags such as `@smoke`, `@critical`, `@a11y`, or `@visual` may be used only when CI selection consumes them consistently.

Examples:

```text
inquiry-schema.test.ts
request-form.test.tsx
inquiries-route.integration.test.ts
lead-adapter.contract.test.ts
request-flow.spec.ts
canonical-routing.spec.ts
```

Avoid generic names such as `works`, `renders correctly`, or `test 1`.

---

## 33. Recommended Package Scripts

Exact scripts must match the approved repository tools, but the interface should be predictable:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit tests/component",
    "test:integration": "vitest run tests/integration tests/contract",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:smoke": "playwright test --grep @smoke",
    "test:a11y": "playwright test --grep @a11y",
    "test:visual": "playwright test --grep @visual",
    "test:ci": "pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build"
  }
}
```

This is a target command interface, not permission to overwrite existing scripts or duplicate checks. Claude Code must inspect the repository and preserve compatible existing commands.

---

## 34. Failure Diagnostics and CI Artifacts

On failure, retain only the minimum useful artifacts:

- concise assertion output;
- Playwright trace for failed/retried browser tests;
- screenshot for visual/browser failure;
- sanitized console and network failure summary;
- Lighthouse report for performance regression;
- coverage report for coverage failure.

Artifacts must not contain:

- production secrets or cookies;
- authorization headers;
- real form submissions;
- personal data;
- private document content or signed storage URLs.

Retention should follow the approved CI and privacy policy. Debug logging must be opt-in and sanitized.

---

## 35. Flaky Test Policy

A flaky test is a defect in the delivery system.

When a test fails intermittently:

1. preserve its first-failure evidence;
2. determine whether the product, environment, or test is nondeterministic;
3. fix the root cause;
4. use quarantine only when necessary to restore pipeline signal;
5. assign an owner and deadline;
6. keep equivalent risk coverage active where possible.

Rules:

- Retries may collect diagnostics but must not redefine repeated failure as passing quality.
- Do not add sleeps to hide synchronization errors.
- Do not weaken assertions to reduce noise.
- No P0 test may remain quarantined for release.
- Quarantine must be visible in CI and release reporting.

Track flaky-test rate and time-to-repair. A growing quarantine list blocks confidence and must trigger maintenance work.

---

## 36. Defect Severity and Release Decisions

| Severity | Definition | Default action |
|---|---|---|
| S0 | Active data exposure, destructive behavior, or critical compromise | Stop release/traffic; incident process |
| S1 | Lost/false inquiry, broken canonical site, inaccessible core journey, major security issue | Block merge and release |
| S2 | Major function degraded with a workaround; significant SEO/performance/compatibility regression | Block release unless formally excepted |
| S3 | Localized functional or visual defect with limited impact | Fix or document before next planned release |
| S4 | Minor polish or test-maintenance issue | Backlog with owner |

A test failure is triaged by user/business impact, not by which suite reported it. An S1 discovered manually remains an S1 even if automation missed it.

Release exceptions must include:

- affected requirement and user group;
- evidence and reproducibility;
- security/privacy/SEO impact;
- mitigation or rollback plan;
- accountable owner;
- expiration date;
- follow-up issue.

---

## 37. Definition of Done for a Change

A change is done only when:

- acceptance criteria are explicit and satisfied;
- the implementation follows the governing documents;
- relevant tests were added or updated at the correct level;
- success and material failure paths are covered;
- lint, type checks, tests, and production build pass;
- affected E2E, accessibility, SEO, responsive, performance, and security checks pass;
- no real personal or confidential data appears in fixtures or artifacts;
- no unrelated tests were disabled, skipped, or weakened;
- documentation and `CHANGELOG.md`/`DECISIONS.md` are updated when required;
- review confirms that public content and claims remain approved;
- preview verification is complete for user-visible changes;
- rollback remains possible.

“Works on my machine,” a successful local render, or an updated snapshot is not Definition of Done.

---

## 38. Release Acceptance Gate

Before production promotion, confirm:

- [ ] All P0 and P1 automated suites pass.
- [ ] No unresolved S0 or S1 defect exists.
- [ ] Any S2 exception is documented, owned, and time-bounded.
- [ ] Production build uses the committed lockfile.
- [ ] Critical inquiry journeys pass against the approved non-production lead sink.
- [ ] Failure-path inquiry behavior shows no false success.
- [ ] Canonical, redirects, sitemap, robots, metadata, and structured data pass.
- [ ] Core pages pass automated accessibility checks.
- [ ] Manual keyboard, zoom, reflow, reduced-motion, and screen-reader checks are recorded.
- [ ] Responsive and supported-engine critical journeys pass.
- [ ] Visual diffs are reviewed and approved.
- [ ] Performance budgets and baseline comparisons pass.
- [ ] Security, dependency, secret, and header checks pass.
- [ ] Analytics consent and data-minimization checks pass.
- [ ] Environment variables and integration targets are verified without exposing values.
- [ ] Preview and origin hosts do not leak into public output.
- [ ] Monitoring, rollback target, and release owner are ready.
- [ ] `PRE_DEPLOY_CHECKLIST.md` is complete.

After promotion:

- [ ] Read-only production smoke tests pass.
- [ ] Canonical host and redirect chain are correct.
- [ ] Representative pages, assets, sitemap, and robots are reachable.
- [ ] Security and cache headers are correct at the public edge.
- [ ] No new error-rate or performance regression is observed.
- [ ] `POST_DEPLOY_CHECKLIST.md` is complete.

---

## 39. Claude Code Operating Rules

Before changing code or tests, Claude Code must:

1. read `CLAUDE.md`, the task specification, and the governing documents for the affected behavior;
2. inspect existing test tools, scripts, patterns, fixtures, and CI configuration;
3. identify the risk tier and affected test layers;
4. preserve unrelated user changes;
5. avoid inventing provider behavior, content, routes, thresholds, or environment variables;
6. state unresolved conflicts or `TBD` items instead of guessing.

While implementing:

- add the smallest sufficient tests at the correct layer;
- verify observable behavior and meaningful outcomes;
- include material negative paths;
- keep fixtures synthetic;
- avoid broad snapshot updates;
- do not weaken existing tests to accommodate a regression;
- do not bypass security controls in production code for test convenience.

Before completing the task:

- run the relevant focused suite;
- run the broader suite required by the changed shared boundary;
- run type checking and the production build when relevant;
- report exactly what passed, failed, or could not run;
- distinguish implementation failure from environment/tooling failure;
- provide a concise list of changed test coverage and remaining risks.

Claude Code must never claim “all tests pass” if it ran only a subset. It must name the executed commands or test scopes.

---

## 40. Initial Implementation Backlog

If the repository does not yet contain the complete testing foundation, implement it in this order:

### Phase A — Fast foundation

- [ ] Confirm one approved unit/component runner.
- [ ] Add DOM matchers and user-interaction helpers.
- [ ] Add coverage reporting and baseline thresholds.
- [ ] Add shared synthetic inquiry builders.
- [ ] Test route, canonical, metadata, and inquiry schemas.
- [ ] Test high-use navigation and form components.
- [ ] Add lint/type/build gates to CI.

### Phase B — Trust boundaries

- [ ] Add `/api/inquiries` integration suite.
- [ ] Add lead-repository and adapter contract suite.
- [ ] Add rate-limit, bot-verification, timeout, duplicate, and logging/privacy cases.
- [ ] Add deterministic content/schema and sitemap checks.

### Phase C — Browser confidence

- [ ] Configure Playwright projects and preview base URL.
- [ ] Add critical navigation and inquiry journeys.
- [ ] Add canonical/SEO and console/hydration assertions.
- [ ] Add automated accessibility checks.
- [ ] Add 320 px and representative mobile journeys.

### Phase D — Release quality

- [ ] Add controlled visual baselines.
- [ ] Add Lighthouse CI and approved budgets.
- [ ] Add header and safe preview security checks.
- [ ] Add analytics consent/payload tests after analytics approval.
- [ ] Add post-deployment read-only smoke checks.
- [ ] Document manual accessibility and cross-browser evidence.

Upload-specific tests belong in a separate approved phase and must not expose upload UI before the secure workflow is complete.

---

## 41. Required Decisions Before Finalizing v1.0

The following values must be confirmed in their governing documents or repository configuration. Claude Code must not guess them:

- exact supported browser policy;
- exact pinned testing package versions;
- final lead sink and provider sandbox behavior;
- final bot-protection configuration and CI strategy;
- exact performance asset/bundle budgets;
- visual regression hosting and review workflow, if any;
- final screen-reader/browser pairs for release checks;
- production synthetic-inquiry policy;
- CI artifact retention;
- vulnerability exception ownership and response time;
- whether a dedicated staging environment is required;
- upload security workflow and test environment.

Until resolved, use safe deterministic fakes, preview-based verification, the current approved public architecture, and the stricter non-destructive behavior.

---

## 42. Final Acceptance Criteria for This Strategy

This strategy is correctly implemented when:

1. every critical requirement maps to at least one explicit test layer;
2. P0 inquiry, data, and routing risks have success and failure-path coverage;
3. pull requests receive deterministic static, unit, component, integration, and build feedback;
4. preview deployments receive browser, accessibility, SEO, performance, and safe security checks;
5. releases require targeted manual accessibility and responsive verification;
6. production deployments receive read-only smoke checks and monitoring review;
7. test data and artifacts contain no real personal or confidential information;
8. failures are traceable to requirements and cannot be hidden by automatic snapshot updates, retries, or disabled tests;
9. Claude Code reports the exact scope it tested and never invents unresolved project decisions;
10. the suite protects the Ahan Asa promise, **«ما مراقب سرمایه شما هستیم.»**, by preventing false lead success, data exposure, broken discovery, and inaccessible core journeys.

