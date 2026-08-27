# Ahan Asa Website — Architecture and Design Decisions

> **Brand:** Ahan Asa | آهن آسا
> **Domain:** `ahanassa.com`
> **Canonical production origin:** `https://www.ahanassa.com`
> **Document:** `DECISIONS.md`
> **Version:** 1.0
> **Status:** Active baseline — project-owner approval required for material changes
> **Last updated:** 2026-08-25
> **Launch locale:** Persian (`fa-IR`), fully RTL
> **Document language:** English, with approved Persian interface expressions where relevant

---

## 1. Purpose

This file is the decision register for the Ahan Asa website. It records the architecture, product, content, and design decisions that materially constrain implementation. It exists to prevent contradictory specifications, silent technology changes, design drift, and plausible-looking assumptions from becoming production behavior.

This file answers four questions for every material choice:

1. What was decided?
2. Why was it decided?
3. What consequences and constraints follow from it?
4. What must happen before the decision may change?

This is not a general project diary. Routine code changes belong in `CHANGELOG.md`; incomplete work belongs in `TASKS.md`; detailed implementation rules belong in the relevant specialist specification.

---

## 2. Decision Authority and Conflict Resolution

### 2.1 Authority model

- `DECISIONS.md` is the authoritative register of accepted architecture and design outcomes.
- `CLAUDE.md` governs how Claude Code operates, verifies work, and applies project documents.
- `PROJECT_BRIEF.md` governs business scope, positioning, objectives, audiences, and non-goals.
- Specialist documents govern implementation detail within their approved scope.
- Code and configuration must implement the approved documents; existing code is not automatically authoritative merely because it already exists.

`CLAUDE.md` and `DECISIONS.md` have different authority domains. Neither may silently override the other. If an operating instruction conflicts with an accepted project decision, Claude Code must stop, identify the conflict, and request resolution.

### 2.2 Specialist-document hierarchy

After the authority model above, use this order for substantive decisions:

1. `PROJECT_BRIEF.md`
2. Accepted records in `DECISIONS.md`
3. `BRAND_GUIDELINES.md` for brand assets and identity
4. `TECHNICAL_ARCHITECTURE.md` for system boundaries and runtime behavior
5. `DESIGN_DIRECTION.md` for experience and visual intent
6. Specialist specifications such as `ROUTES.md`, `FORM_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md`, `DESIGN_SYSTEM.md`, and SEO documents
7. `DEVELOPMENT_RULES.md` and `CODING_STANDARDS.md`
8. Page, component, content, motion, and task-level specifications

An accepted decision record may intentionally supersede an older statement in another document. When this happens, the affected document must be updated in the same change set or explicitly listed as pending synchronization.

### 2.3 Safety rule

Legal, security, privacy, accessibility, and verified production constraints are hard gates. No lower-level decision may weaken them for convenience, speed, aesthetics, or test completion.

### 2.4 Conflict protocol

When two approved sources conflict:

1. Do not implement either interpretation silently.
2. Preserve the safer existing production behavior.
3. Identify both sources and the exact contradiction.
4. Create a proposed decision record or amend the relevant accepted record.
5. Obtain the required approval.
6. Update every affected specification, test, and implementation.

---

## 3. Decision Status and Record Format

### 3.1 Status values

| Status | Meaning |
| --- | --- |
| `Accepted` | Approved baseline and mandatory until superseded |
| `Proposed` | Ready for review but not authorized for production |
| `Deferred` | Deliberately unresolved; dependent capability must remain disabled or provider-neutral |
| `Rejected` | Considered and intentionally not selected |
| `Superseded` | Replaced by a newer decision; retained for history |
| `Deprecated` | Still present temporarily but scheduled for removal |

### 3.2 Decision ID format

- Architecture and cross-project decisions: `ADR-###`
- Design and experience decisions: `DDR-###`
- A record ID is never reused.
- A changed decision receives either an explicit amendment or a new record that names the superseded ID.

### 3.3 Required fields for new records

Every new record must include:

- ID and title
- Status
- Date
- Owner or approver
- Scope
- Context
- Decision
- Rationale
- Consequences
- Implementation constraints
- Alternatives rejected or deferred
- Review or supersession trigger
- Affected documents

---

## 4. Current Decision Index

| ID | Decision | Status |
| --- | --- | --- |
| `ADR-001` | Position Ahan Asa as a procurement manager, not a steel marketplace | Accepted |
| `ADR-002` | Keep Phase 1 focused and exclude commerce, price-board, portal, and marketplace features | Accepted |
| `ADR-003` | Publish Persian first with true RTL and unprefixed canonical routes | SUPERSEDED IN PART — fa remains default/unprefixed; en/ar now launch locales |
| `ADR-004` | Use “send invoice or material list” as the primary conversion model | Accepted |
| `ADR-005` | Use a static-first Next.js App Router architecture | Accepted |
| `ADR-006` | Use Server Components by default and minimize client JavaScript | Accepted |
| `ADR-007` | Use repository-managed typed content at launch; defer CMS selection | Accepted |
| `ADR-008` | Use a single application with adapter boundaries; no Phase 1 microservices | Accepted |
| `ADR-009` | Keep inquiry handling behind a secure Ahan Asa server boundary | Accepted |
| `ADR-010` | Disable document upload until the full private-file workflow is approved | Accepted |
| `ADR-011` | Use no public application database at launch | Accepted |
| `ADR-012` | Use Cloudflare in front of Vercel with `www` as canonical host | SUPERSEDED — production runtime is Cloudflare Workers + vinext |
| `ADR-013` | Use native Next.js SEO features and a central canonical route registry | Accepted |
| `ADR-014` | Use a provider-neutral analytics event layer and prohibit PII in events | Accepted |
| `ADR-015` | Enforce security, privacy, accessibility, performance, and QA as release gates | Accepted |
| `ADR-016` | Pin the runtime, framework, package manager, and dependency graph | Accepted |
| `DDR-001` | Use “calm control for high-value procurement” as the experience thesis | Accepted |
| `DDR-002` | Use Steel Navy, restrained Forge Copper, and White as the core palette | Accepted |
| `DDR-003` | Preserve approved logo masters; never reconstruct the mark in code | Accepted |
| `DDR-004` | Use Persian-native editorial typography with approved local font assets | Accepted |
| `DDR-005` | Use spacious editorial composition, not card-grid or marketplace composition | Accepted |
| `DDR-006` | Use project-owned components and centralized design tokens | Accepted |
| `DDR-007` | Use verified documentary imagery; prohibit misleading operational imagery | Accepted |
| `DDR-008` | Use quiet, purposeful motion with reduced-motion support | Accepted |
| `DDR-009` | Treat mobile, RTL, and bidirectional content as structural design requirements | Accepted |
| `DDR-010` | Build trust through evidence, process, scope, and transparent next steps | Accepted |

---

## 5. Accepted Architecture Decisions

### ADR-001 — Procurement-Management Positioning

**Status:** Accepted
**Date:** 2026-08-25
**Owner:** Ahan Asa project owner
**Scope:** Business architecture, information architecture, content, UI, SEO, and conversion

### Context

The Iranian steel market contains many sellers, product catalogs, daily-price boards, and commodity marketplaces. Ahan Asa intends to occupy a higher-value position based on disciplined purchasing management, technical awareness, supplier evaluation, commercial control, and delivery coordination.

### Decision

Ahan Asa will be presented as a **premium B2B steel procurement-management partner that protects the client's capital throughout the purchasing decision and coordination process**.

The public experience must not position the brand as:

- a traditional iron shop;
- a public steel marketplace;
- a supplier directory;
- a daily-price publisher;
- a consumer e-commerce store;
- an owner of unverified inventory, factories, warehouses, or fleets.

The approved brand promise is:

> **ما مراقب سرمایه شما هستیم.**

The English meaning-aligned expression is “We protect your capital,” but Persian remains primary on the launch website.

### Rationale

This position differentiates Ahan Asa through decision quality, control, and accountability rather than unit-price competition. It also aligns the website with high-value B2B buyers and complex project procurement.

### Consequences

- Navigation leads with service, process, evidence, and buyer decisions rather than a product catalog.
- Product or material pages explain procurement considerations rather than presenting unverified inventory.
- Copy must distinguish advisory, management, supply, logistics, and contractual responsibilities accurately.
- SEO may target commercial procurement intent, but landing pages must preserve the service model.
- “Lowest price,” “zero risk,” and “guaranteed delivery” claims are prohibited unless contractually true and approved.

### Change trigger

A formal business-model change approved by the project owner, followed by updates to `PROJECT_BRIEF.md`, the full information architecture, legal scope, conversion model, and technical architecture.

### Affected documents

`PROJECT_BRIEF.md`, `INFORMATION_ARCHITECTURE.md`, `CONTENT_STRATEGY.md`, `COPY_GUIDELINES.md`, `SEO_STRATEGY.md`, `SITEMAP.md`, `PAGE_SPECIFICATIONS.md`

---

### ADR-002 — Phase 1 Scope and Explicit Non-Goals

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Product scope and technical boundaries

### Decision

Phase 1 is a Persian corporate, trust, content, and qualified-lead website. Unless separately approved, it will not include:

- shopping cart, checkout, or online payment;
- live price feeds, trading dashboards, or automatic quotation promises;
- customer or supplier accounts;
- supplier marketplace or directory functionality;
- public inventory, ERP, warehouse, or stock-management functions;
- automated contract generation;
- uncontrolled chat widgets;
- unsupported regional service claims;
- incomplete or machine-translated language versions.

### Rationale

These features create business, legal, data, security, and operational obligations that are not required to validate the initial positioning and inquiry model.

### Consequences

- Code must not scaffold excluded domain models “for later” unless a current requirement needs them.
- UI must not imply automation, stock availability, or transaction capabilities that do not exist.
- A future commerce or portal initiative requires its own architecture decision and threat, data, legal, and operational review.

---

### ADR-003 — Persian-First Localization and URL Policy

**Status:** SUPERSEDED IN PART by `PROJECT_OVERRIDES.md` §1 (2026-08-26 owner-confirmed)
**Date:** 2026-08-25
**Scope:** Localization, routing, SEO, design, and content

**HISTORICAL / SUPERSEDED NOTE:** the Persian default and unprefixed route policy remains active. The Persian-only launch assumption and "future locale" framing are superseded; the current launch architecture is `fa`/`en`/`ar`, with Persian primary/default.

### Decision

- Phase 1 publishes Persian (`fa-IR`), English (`en`), and Arabic (`ar`) where approved localized content exists.
- The document root uses `lang="fa"` and `dir="rtl"`.
- Persian canonical routes are unprefixed; the homepage is `/`, not `/fa`.
- Any `/fa/...` equivalent permanently redirects to the unprefixed Persian route.
- English and Arabic use stable prefixes `/en/...` and `/ar/...`.
- Unsupported or incomplete locales return a real `404`; they do not silently fall back to Persian.
- Hreflang is emitted only for published pages with approved localized content.
- Locale/runtime implementation must support `fa`/`en`/`ar` from the start. Do not fabricate translations to satisfy this.

### Rationale

The policy gives the initial Persian market the cleanest canonical URLs while preserving an explicit path for future multilingual expansion.

### Consequences

- Shared UI primitives must not embed unstructured Persian strings.
- Locale owns direction; components use logical CSS properties.
- Phone, email, URLs, file names, standards, dimensions, and codes require explicit bidirectional isolation.
- Translation completeness, metadata, navigation, validation messages, legal copy, and fallbacks are publication gates.

### Rejected alternatives

- Publishing empty `/en` or `/ar` structures for “future SEO.”
- Machine-translated production pages.
- Prefixing Persian with `/fa` without a demonstrated need.

---

### ADR-004 — Primary Conversion Model

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Conversion, forms, navigation, content, and analytics

### Decision

The dominant conversion is:

> **ارسال فاکتور یا لیست خرید**

The user may begin with an invoice, bill of quantities, material list, or written procurement requirement. The website promises a professional first review and a clear next step; it does not promise an instant quotation, the lowest price, guaranteed savings, or guaranteed delivery.

### Consequences

- Major pages must expose a clear route to the same canonical inquiry flow.
- Each major section should have no more than one visually dominant action.
- The form asks only for information needed for a useful first response.
- Optional project detail uses progressive disclosure.
- Post-submission messaging explains what was received, what is reviewed next, and how follow-up occurs.
- A success state is shown only after the approved durable lead destination confirms persistence.

### Deferred dependency

Production submission remains gated by approval of the lead system of record, retention, privacy, notification, failure recovery, and operational ownership.

---

### ADR-005 — Static-First Next.js App Router

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Application framework and rendering

### Decision

Use a single Next.js App Router application with TypeScript strict mode. Public content pages are statically generated when content is known at build time. Dynamic server execution is reserved for genuine mutations, secure integrations, protected previews, and other approved runtime needs.

The approved stack baseline is controlled by `STACK.md` and the lockfile. At the date of this decision it targets:

- Node.js `24.x` LTS;
- pnpm `11.x` through Corepack;
- a security-patched Next.js `16.3.x` release;
- compatible security-patched React `19.2.x`;
- TypeScript `6.0.x` strict baseline;
- Tailwind CSS `4.3.x` plus semantic CSS custom properties.

Exact patches must be rechecked and pinned at initialization and before production release. Security patches do not require abandoning the accepted architecture, but a major-line change requires an explicit decision.

### Rationale

This architecture supports indexable Persian content, strong performance, secure server-side mutations, preview deployments, and future localization without introducing unnecessary infrastructure.

### Rejected alternatives

- Pages Router;
- client-side SPA-only rendering;
- Create React App;
- WordPress or a coupled page builder at launch;
- a monorepo or microservices without a proven requirement.

---

### ADR-006 — Server Components and Minimal Client Boundaries

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Component architecture and performance

### Decision

React Server Components are the default. A Client Component is permitted only at the smallest practical boundary when browser state, browser APIs, user events, focus management, measurement, or a client-only dependency is genuinely required.

### Consequences

- Pages and layouts must not become Client Components to support one interactive descendant.
- Core copy, navigation, metadata, structured data, and primary links exist in server-rendered HTML.
- Static content does not use React Query, SWR, or another client-fetching layer.
- State remains local unless multiple distant consumers demonstrably need shared state.
- Global state frameworks are not approved for Phase 1.
- Every client boundary must justify its bundle, hydration, accessibility, and failure cost.

---

### ADR-007 — Git-Managed Typed Content; CMS Deferred

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Content architecture and publication

### Decision

Phase 1 public content is maintained in the repository using:

- typed TypeScript records or validated structured data for entities;
- controlled Markdown/MDX for approved long-form content;
- Zod validation at build time;
- stable IDs and explicit relationships;
- asset manifests containing dimensions, rights, alt-text status, and approval state where applicable.

No external CMS is required at launch. Components consume domain records through repository interfaces so a future CMS can implement the same contract without rewriting the presentation layer.

### Consequences

- Invalid slugs, references, metadata, publication states, or confidential records must fail the production build.
- Draft content must not enter routes, sitemap, JSON payloads, or structured data.
- MDX is trusted repository content only; arbitrary scripts, raw unreviewed HTML, and unrestricted component imports are prohibited.
- A CMS may be selected only after workflow, roles, preview, localization, portability, backup, security, cost, and ownership are approved.

---

### ADR-008 — Single Application with Adapter Boundaries

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** System decomposition

### Decision

Use one Next.js application for Phase 1. External providers sit behind narrow server-only interfaces for content, leads, notifications, uploads, analytics, and monitoring. Domain models do not depend on React route files, provider-specific request objects, or provider SDKs.

### Consequences

- Page files compose data and sections; they do not contain large inline systems.
- Provider SDKs remain inside adapters.
- A provider change should not alter public component contracts.
- No microservice is introduced without an independent scaling, security, ownership, or lifecycle requirement.

---

### ADR-009 — Secure Inquiry Boundary

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Forms, integrations, security, and privacy

### Decision

The browser submits inquiries only to an Ahan Asa-controlled server boundary implemented with a Server Action or Route Handler. The browser never calls a CRM, ERP, email provider, database, or privileged storage service directly.

The baseline uses:

- semantic native form controls;
- progressive enhancement;
- native constraints for immediate guidance;
- shared Zod-compatible schemas where safe;
- authoritative server-side validation and normalization;
- honeypot, timing, duplicate, origin/content-type, and rate controls;
- server-generated reference and idempotency handling;
- calm, localized, stable public error codes;
- a provider-neutral lead adapter.

React Hook Form is not a baseline dependency. It may be added only if demonstrated form complexity materially improves maintainability without weakening progressive enhancement.

### Consequences

- No credentials or provider response details reach the browser.
- Unexpected fields are rejected or explicitly ignored by policy; they are never blindly persisted.
- A notification is not proof of durable lead storage unless the approved architecture names it as the system of record.
- Provider failure must produce an honest recoverable state and approved fallback.

---

### ADR-010 — Private Document Upload Is Gated

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** File uploads and confidential documents

### Decision

Invoice, quotation, BOQ, and material-list upload remains disabled in production until all of the following are approved and implemented:

- private object-storage provider and ownership;
- short-lived server-authorized upload flow;
- allowed types, signature verification, size and count limits;
- malware scanning and quarantine behavior;
- randomized object keys;
- retention, deletion, access roles, and auditability;
- time-limited download access;
- privacy notice and operational handling;
- failure, retry, and support fallback;
- tests for validation, authorization, abuse, and deletion.

### Consequences

- Uploaded documents are never placed under `/public`.
- File names, signed URLs, document metadata, and document content never enter analytics.
- UI must not display a functional upload promise until the back-end workflow passes its gate.
- Until enabled, the inquiry flow must provide an honest alternative for describing the requirement or using an approved contact channel.

---

### ADR-011 — No Public Application Database at Launch

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Data architecture

### Decision

Public content does not require a production database in Phase 1. Do not add Prisma, Drizzle, or another ORM without an approved persistence requirement.

Confidential inquiries may be persisted only through the approved lead-system adapter or an explicitly approved managed data store with retention, backup, access, deletion, and incident responsibilities.

### Consequences

- Public content remains build-time and repository-managed.
- Inquiry data, uploaded documents, quotations, or personal data must not be stored in `localStorage`, `sessionStorage`, IndexedDB, browser-readable cookies, page source, or public JSON.
- A future database decision requires a data model, classification, residency, retention, backup, migration, access-control, deletion, and ownership review.

---

### ADR-012 — Cloudflare, Vercel, and Canonical Host

**Status:** SUPERSEDED by `PROJECT_OVERRIDES.md` §2 (Cloudflare Workers + vinext)
**Date:** 2026-08-25
**Scope:** Hosting, domain, deployment, and edge security

**HISTORICAL / SUPERSEDED NOTE:** this ADR is retained as change history. Its Vercel production-hosting decision is no longer active. The canonical host policy remains active unless a future owner-approved domain decision changes it.

### Decision

- Deploy the Next.js application on Cloudflare Workers + Static Assets via vinext.
- Use Cloudflare for DNS, TLS edge policy, canonical redirects, WAF/rate controls where configured, and optional Turnstile.
- The canonical production origin is `https://www.ahanassa.com`.
- `ahanassa.com` permanently redirects to `www.ahanassa.com`, preserving path and query.
- HTTP permanently redirects to HTTPS.
- Normal requests should resolve through no more than one redirect hop.
- Preview deployments are protected from indexing and isolated from production integrations.

### Environment model

- Local development
- Per-pull-request preview
- Production from the protected main branch

A separate staging environment is added only if a persistent integration-testing need and owner exist.

### Consequences

- Cloudflare and application redirect/cache rules must be tested together to prevent loops and conflicting cache behavior.
- Production, preview, and local secrets and destinations remain separated.
- Rollback uses a known healthy deployment.

---

### ADR-013 — Native Next.js SEO Architecture

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Technical SEO and discoverability

### Decision

Use native Next.js capabilities and typed project utilities for:

- Metadata API output;
- canonical URLs;
- Open Graph and social metadata;
- `sitemap.ts` and `robots.ts`;
- server-rendered JSON-LD;
- central route and indexability registries;
- build-time internal-link, canonical, metadata, and structured-data validation.

Do not install a generic SEO plugin.

### Consequences

- Core page meaning must be visible without client-side fetching.
- Preview origins never become canonical.
- JSON-LD derives from verified visible content and cannot claim unsupported prices, ratings, inventory, locations, or services.
- Route, canonical, sitemap, internal links, and structured data must agree.

---

### ADR-014 — Provider-Neutral Analytics and PII Exclusion

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Analytics, consent, privacy, and measurement

### Decision

Implement a typed first-party event interface before selecting an analytics provider. Stable event IDs and allowlisted parameters are used instead of visible Persian labels.

Analytics must never contain:

- names, phone numbers, email addresses, or free-text messages;
- uploaded file names, URLs, or document metadata;
- quotation contents or confidential project details;
- raw provider errors, tokens, or identifiers that expose a person or confidential inquiry.

GA4, GTM, Cloudflare analytics tooling, Speed Insights-equivalent tooling, or another provider remains deferred until consent/legal basis, ownership, environments, event dictionary, retention, internal traffic, and QA are approved.

### Consequences

- Vendor calls are not scattered through components.
- Success events fire only after server-confirmed success.
- Development and preview traffic are disabled or isolated.
- Missing optional analytics configuration must not break the public site.

---

### ADR-015 — Quality Attributes Are Release Gates

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Accessibility, performance, security, SEO, responsive behavior, and QA

### Decision

Accessibility, performance, security, SEO, responsive behavior, and privacy are acceptance conditions for every relevant feature. They are not post-launch cleanup work.

Minimum launch direction includes:

- WCAG 2.2 Level AA target;
- keyboard-complete navigation and inquiry flow;
- correct semantic structure, labels, errors, focus, and reduced motion;
- real-device mobile QA;
- Core Web Vitals targets at the 75th percentile: LCP `≤ 2.5 s`, INP `≤ 200 ms`, CLS `≤ 0.10`;
- validated status codes, canonical behavior, robots, sitemap, and JSON-LD;
- server-side validation, safe errors, secrets isolation, and abuse controls;
- automated and manual verification before production.

### Consequences

- A visually attractive implementation is not complete if it fails these gates.
- Automated accessibility tests supplement manual keyboard and screen-reader review.
- Performance exceptions require measured evidence and approval.
- Security controls may not be weakened merely to make a test pass.

---

### ADR-016 — Version Pinning and Dependency Restraint

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Toolchain, dependencies, CI, and maintenance

### Decision

- Use pnpm only and commit `pnpm-lock.yaml`.
- Pin the exact pnpm patch through `packageManager` and declare the Node policy in repository runtime files.
- CI installs with a frozen lockfile.
- Do not use unbounded `latest` or `*` ranges in production manifests.
- Do not enable canary, beta, release-candidate, or experimental production features without an accepted decision.
- Every runtime dependency requires a real use case, compatibility review, maintenance and license review, security review, and bundle/runtime impact check.
- Major framework, runtime, TypeScript, styling, provider, or architecture changes require a new decision record.

### Consequences

- Security patches take priority and must be validated promptly.
- Do not install overlapping state, form, SEO, animation, data-fetching, or component libraries.
- Dependabot or Renovate may be selected, but not both, and the selection must be documented.

---

## 6. Accepted Design Decisions

### DDR-001 — Experience Thesis: Calm Control

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** UI/UX, brand expression, and content presentation

### Decision

The experience thesis is:

> **Calm control for high-value steel procurement.**

The website should feel like a composed executive procurement desk that receives the request clearly, organizes complexity, explains decisions, shows evidence, and keeps the next step visible.

The intended emotional progression is:

> Uncertainty → Recognition → Clarity → Trust → Confident action

### Consequences

- Premium quality comes from restraint, typography, composition, evidence, interaction quality, and implementation precision.
- The interface must not resemble a bazaar, trading terminal, warehouse catalog, generic construction template, or decorative luxury campaign.
- Complexity is progressively disclosed instead of displayed as a dense system.

---

### DDR-002 — Core Color Palette

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Brand and UI color

### Decision

The core palette is:

- Steel Navy `#0B2545` — primary authority, trust, typography, and structural color;
- Forge Copper `#B04A2F` — restrained accent for meaningful emphasis and action;
- White `#FFFFFF` — primary spatial surface.

Additional neutrals and semantic status colors must be defined centrally in `COLOR_SYSTEM.md` and mapped through semantic tokens.

### Consequences

- Copper is not the default background and must not appear on every control.
- The site is not a continuous dark-navy experience.
- Success, warning, error, and information colors remain semantically distinct from copper.
- Color is never the sole carrier of meaning.
- Gradients are not a default visual language and require explicit approval.

---

### DDR-003 — Approved Logo Masters Are Immutable Inputs

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Brand assets and implementation

### Decision

Use only approved master logo and icon assets. Preserve geometry, proportions, clear space, aspect ratio, and approved color variants.

Claude Code must not:

- redraw the mark in CSS, HTML, canvas, or an icon library;
- generate or approximate the mark with AI;
- alter its geometry or proportions;
- invent an unapproved Persian wordmark;
- recolor it outside approved variants;
- repurpose it as a generic UI icon.

### Consequences

- Authoritative masters remain separate from optimized web exports.
- A geometry, lockup, color, or wordmark change requires an accepted design decision and asset replacement record.
- Missing final assets remain explicitly `TBD`; they are not approximated.

---

### DDR-004 — Persian-Native Typography

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Typography, localization, performance, and brand

### Decision

Typography must feel modern, geometric, corporate, highly legible, and native to Persian. Estedad defines the preferred visual direction, but the production family, weights, files, and license must be approved in `FONT_STRATEGY.md` and the font manifest before release.

Production fonts are self-hosted through `next/font/local` using approved WOFF2 assets. Remote production font CDNs are not approved.

### Consequences

- Persian punctuation, نیم‌فاصله, line rhythm, numerals, and bidirectional technical data receive explicit QA.
- No artificial letter spacing is applied to Persian text.
- Only required families, weights, and subsets are shipped.
- The font fallback must preserve readability and limit layout shift.
- The Persian wordmark remains an asset, not styled live text.

---

### DDR-005 — Editorial Composition Instead of Marketplace Grids

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Layout, page composition, and responsive design

### Decision

Use a precise responsive grid, generous whitespace, strong editorial hierarchy, controlled asymmetry on large screens, and a clear linear reading sequence on mobile.

Prefer:

- editorial bands;
- split narrative/evidence layouts;
- document-like panels;
- bordered rows and structured lists;
- process and responsibility models;
- exact tables where comparison improves a decision.

Do not wrap every paragraph, metric, icon, or CTA in a card. Cards are reserved for genuinely independent content objects.

### Consequences

- The homepage tells one coherent decision journey rather than a sequence of disconnected modules.
- Shape language remains architectural: subtly softened corners, restrained shadows, and meaningful frames.
- Pills are reserved for tags, filters, or statuses.
- Glassmorphism, metallic textures, glow, bevel, heavy gradients, and decorative industrial effects are not baseline patterns.

---

### DDR-006 — Project-Owned Component and Token System

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Design system and component architecture

### Decision

Use a project-owned design system implemented through this hierarchy:

1. approved primitive brand values;
2. semantic CSS custom properties;
3. Tailwind theme mappings;
4. component recipes and variants;
5. page composition.

Do not install a monolithic UI library or generic theme. Native HTML is preferred for controls and disclosures when it provides robust accessible behavior. A headless primitive may be added only for a genuinely complex widget after accessibility, RTL, styling, maintenance, and bundle review.

### Consequences

- Components do not invent colors, spacing, radii, shadows, or typography values.
- Primitives, composed patterns, and page sections remain separate.
- Every interactive component defines focus, keyboard, disabled, loading, error, reduced-motion, and narrow-screen behavior as applicable.
- `styled-components`, Emotion, Sass, Less, and copied bulk component collections are not approved for Phase 1.

---

### DDR-007 — Documentary and Verifiable Imagery

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Photography, media, evidence, and trust

### Decision

Images must explain procurement context, materials, documentation, inspection, logistics, delivery, scale, or professional service. Real evidence must be verified and approved.

AI-generated imagery may be used only as clearly non-evidentiary conceptual artwork. It must never represent a real client, project, warehouse, factory, fleet, stock level, supplier, delivery, or operational capability.

### Prohibited imagery

- unverified facilities or inventory;
- generic handshakes and staged business teams;
- decorative sparks, molten metal, flames, or orange-blue industrial clichés;
- fake project or client evidence;
- anonymous warehouse panoramas without informational purpose.

### Consequences

- Asset records include rights and approval state.
- `next/image` handles responsive raster delivery with intrinsic dimensions.
- Authentic evidence photography is not mirrored or misleadingly cropped.
- Only the actual LCP image receives priority loading.

---

### DDR-008 — Quiet, Purposeful Motion

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Motion and interaction

### Decision

Motion must be controlled, precise, quiet, responsive, and purposeful. Use CSS transitions, CSS keyframes, or the Web Animations API first. Add the `motion` package only when an approved interaction cannot be implemented clearly and accessibly with CSS/WAAPI.

### Consequences

- Motion never delays content, navigation, or conversion.
- Core meaning remains available when motion is disabled.
- `prefers-reduced-motion` is mandatory.
- Page-wide parallax, scroll hijacking, cursor effects, continuous decorative loops, GSAP, Three.js, WebGL hero scenes, and unnecessary loading screens are rejected for Phase 1.

---

### DDR-009 — Mobile, RTL, and Bidirectional Design Are Structural

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Responsive design, localization, accessibility, and forms

### Decision

The mobile experience is a primary procurement entry point, not a compressed desktop layout. RTL governs reading, grid, navigation, breadcrumb, process, form, icon, and focus behavior from the beginning.

### Consequences

- DOM order matches reading and keyboard order.
- Logical CSS properties are the default.
- Split layouts become an intentional single-column sequence.
- Process diagrams reflow vertically.
- Tables use an accessible responsive strategy or controlled horizontal access.
- Mobile navigation and document/inquiry entry are easy to operate with touch and keyboard.
- Directional icons mirror only when meaning requires it; logos, photographs, and non-directional symbols do not.

---

### DDR-010 — Trust Through Evidence and Transparency

**Status:** Accepted
**Date:** 2026-08-25
**Scope:** Content design, claims, evidence, and conversion

### Decision

Trust is built through clear role definition, process stages, responsibilities, required inputs, verified cases, redacted documentation, approved credentials, privacy handling, and explicit next steps.

The following are prohibited unless verified and approved:

- fake testimonials;
- unverified client or partner logos;
- invented years of experience, counters, awards, certifications, prices, savings, or delivery rates;
- false scarcity or fake real-time activity;
- unsupported “best,” “lowest,” “guaranteed,” or “zero-risk” claims.

### Consequences

- When evidence is limited, use honest process-based credibility rather than fabricated proof.
- Every quantified claim needs a source, owner, approval state, and scope.
- Forms and confirmation states explain what will happen next.
- Legal and operational boundaries remain visible rather than hidden in vague copy.

---

## 7. Deferred Decisions and Safe Defaults

Deferred means intentionally unresolved. Claude Code must not substitute a familiar provider or plausible production value.

| ID | Decision required | Current safe default | Approval gate / authority |
| --- | --- | --- | --- |
| `OPEN-001` | Final CRM/ERP or lead system of record | Provider-neutral adapter; production submission disabled until durable handoff is proven | `FORM_ARCHITECTURE.md`, `API_INTEGRATIONS.md` |
| `OPEN-002` | Durable retry queue and operational fallback | Honest service-unavailable state plus approved manual contact path | `FORM_ARCHITECTURE.md` |
| `OPEN-003` | Notification channel and recipients | No production notification integration | `API_INTEGRATIONS.md`, recipient/operations approval |
| `OPEN-004` | Private upload storage, scanner, file limits, and retention | Upload disabled | `FORM_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md`, privacy approval |
| `OPEN-005` | Analytics provider, consent, IDs, and retention | Typed event interface only; no production vendor tag | `ANALYTICS_TRACKING.md` |
| `OPEN-006` | Error-monitoring provider | Structured redacted server logging interface only | `SECURITY_GUIDELINES.md` / observability decision |
| `OPEN-007` | CMS provider and editorial workflow | Git-managed typed content | `CMS_ARCHITECTURE.md` |
| `OPEN-008` | Database/ORM for new persistence needs | No public application database or ORM | `DATA_ARCHITECTURE.md` |
| `OPEN-009` | Final Persian font family, production files, weights, and license | Preserve approved fallback and design direction; do not ship unlicensed assets | `FONT_STRATEGY.md`, `BRAND_GUIDELINES.md` |
| `OPEN-010` | Final Persian logo lockups/wordmark assets | Use only approved available masters; missing variants remain `TBD` | `BRAND_GUIDELINES.md` and owner approval |
| `OPEN-011` | Exact CSP, security headers, CORS, and upload allowlists | Use the safest framework/platform baseline; do not weaken protections | `SECURITY_GUIDELINES.md` |
| `OPEN-012` | Exact public cache TTL, tags, and invalidation | Immutable per deployment for static content; `no-store` for private writes | `CACHING_STRATEGY.md` |
| `OPEN-013` | Locale runtime and localized-content readiness | `fa`/`en`/`ar` architecture confirmed; final content readiness and runtime details still gated | `LOCALIZATION.md`, approved complete content set |
| `OPEN-014` | Verified case studies, client marks, metrics, and photography | Do not publish unsupported evidence | Content owner and `MEDIA_GUIDELINES.md` |
| `OPEN-015` | Public legal entity details and approved contact channels | Do not invent or expose unverified contact information | Project owner / legal approval |
| `OPEN-016` | Dependency-update automation | Manual controlled updates; do not install both competing bots | `DEVELOPMENT_RULES.md` |

---

## 8. Rejected Directions

The following directions have been considered incompatible with the accepted Phase 1 product unless a new decision explicitly changes scope:

### Product and content

- Commodity marketplace positioning
- Public daily-price board
- E-commerce checkout and payment
- Supplier/customer portal
- Unverified automatic quotation
- Machine-translated production locales
- Fake scarcity, counters, testimonials, facilities, inventory, partners, or projects

### Architecture and stack

- WordPress or coupled page-builder architecture
- Client-side SPA-only rendering
- Next.js Pages Router
- Multiple package managers
- Global state framework without a proven requirement
- Public database or ORM without a persistence requirement
- Direct browser-to-CRM/ERP access
- Public storage of confidential documents
- Generic SEO plugin or full UI theme
- Global client fetching for static content

### Design

- Traditional آهن‌فروشی or steel-bazaar aesthetic
- Dense catalog grids and price tables as the homepage foundation
- Excessive cards and pill-shaped controls
- Dominant copper backgrounds
- Heavy gradients, glow, bevel, metallic texture, carbon fiber, rust, sparks, or flames
- Default glassmorphism
- Decorative autoplay hero video
- Page-wide parallax, scroll hijacking, cursor effects, or WebGL hero scenes

---

## 9. Change-Control Procedure

### 9.1 Changes that require a new or amended decision

A decision record is required before implementing any of the following:

- change to business positioning, primary audience, primary conversion, or Phase 1 non-goals;
- new locale publication or canonical URL strategy;
- major runtime, framework, React, TypeScript, Tailwind, or package-manager change;
- CMS, CRM/ERP, database, storage, analytics, monitoring, search, or messaging provider selection;
- enabling document uploads or collecting a new category of personal/confidential data;
- new authentication, account, commerce, portal, live-price, or marketplace capability;
- canonical host, hosting platform, CDN/edge, or environment-model change;
- material logo, palette, typography, layout, component-system, or motion-direction change;
- reduction of an accessibility, security, privacy, performance, SEO, or testing gate;
- introduction of a substantial runtime dependency or experimental platform feature;
- any implementation that contradicts an accepted record.

### 9.2 Approval workflow

1. Create the proposed decision with context, options, consequences, risks, rollback, and affected documents.
2. Mark it `Proposed`; do not implement production behavior yet.
3. Obtain approval from the project owner and the relevant technical, design, legal, privacy, or operational owner.
4. Change status to `Accepted` and record the effective date.
5. Update all affected project documents in the same change set.
6. Implement the smallest coherent change.
7. Run relevant build, test, accessibility, security, performance, SEO, and visual checks.
8. Update `CHANGELOG.md` and link the implementation commit or pull request.

### 9.3 Emergency security changes

An urgent security patch may be applied before normal documentation completion when delay creates material exposure. The change must:

- preserve or strengthen security;
- avoid unnecessary scope changes;
- pass the safest available verification;
- be documented in `DECISIONS.md` and `CHANGELOG.md` immediately after stabilization;
- include rollback or compatibility notes.

### 9.4 Supersession rules

- Never delete an accepted historical record merely because the decision changed.
- Mark the old record `Superseded` and link the replacement ID.
- State which implementation and document versions are affected.
- Remove obsolete code only after migration and rollback considerations are complete.

---

## 10. Claude Code Enforcement Rules

Before material implementation, Claude Code must:

1. Read this file, `CLAUDE.md`, `PROJECT_BRIEF.md`, and all task-relevant specifications.
2. Inspect the repository, lockfile, existing code, and current user changes.
3. Map the requested change to the decision index and open-decision table.
4. Stop if the request depends on a deferred provider, missing approval, or conflicting source.
5. Never convert a `Deferred` item into a production default through assumption.
6. Implement accepted decisions through centralized tokens, schemas, routes, and adapters.
7. Avoid unrelated dependency, formatting, content, and architecture changes.
8. Add or update tests that prove the accepted behavior.
9. Run the relevant verification commands and report exact results.
10. Update this file only when a material decision changes—not for routine implementation detail.

Claude Code must not claim that a decision is approved merely because it appears plausible, exists in a mockup, is common in another project, or is already partially present in code.

---

## 11. Decision Review Checklist

Before accepting a proposed decision, confirm:

- [ ] The business problem and affected user journey are clear.
- [ ] The decision is consistent with Ahan Asa's procurement-management positioning.
- [ ] Scope, owner, and approval authority are identified.
- [ ] At least one credible alternative was considered.
- [ ] Security, privacy, legal, accessibility, SEO, performance, and RTL impact were reviewed.
- [ ] Data classification, retention, and provider ownership are defined where relevant.
- [ ] Mobile and bidirectional-content behavior are understood.
- [ ] Operational failure, fallback, monitoring, and rollback are defined.
- [ ] New dependencies and recurring costs are justified.
- [ ] Claims and evidence remain verifiable.
- [ ] Affected documents, tests, and implementation locations are listed.
- [ ] The decision is specific enough for Claude Code to implement without guessing.

---

## 12. Baseline Acceptance Checklist

The implementation conforms to this decision register only when:

- [ ] The website clearly presents Ahan Asa as a procurement manager rather than a commodity seller.
- [ ] Phase 1 contains no unapproved commerce, price-board, marketplace, portal, or account scope.
- [ ] Persian is unprefixed, fully RTL, and implemented with correct bidirectional behavior.
- [ ] The invoice/material-list inquiry is the dominant conversion path.
- [ ] Public content is static-first, server-rendered, typed, and build-validated.
- [ ] Server Components remain the default and client boundaries are minimal.
- [ ] No deferred provider has been introduced without approval.
- [ ] Inquiry submission crosses only the approved server boundary.
- [ ] Upload is either fully approved and secured or disabled.
- [ ] No confidential data, PII, file metadata, or secrets enter browser bundles, logs, analytics, or public assets.
- [ ] `www.ahanassa.com` is canonical and redirect behavior is verified without loops.
- [ ] Brand colors, approved logo assets, Persian typography, and editorial composition follow the accepted direction.
- [ ] UI uses centralized semantic tokens and project-owned components.
- [ ] Imagery and claims are verified, licensed/approved, and non-misleading.
- [ ] Mobile, accessibility, reduced motion, performance, SEO, security, and QA gates pass.
- [ ] Runtime and dependencies are pinned and CI uses the frozen lockfile.
- [ ] Every material deviation has an accepted decision record.

---

## 13. Related Documents

This register must be read with:

- `CLAUDE.md`
- `PROJECT_BRIEF.md`
- `BRAND_GUIDELINES.md`
- `DESIGN_DIRECTION.md`
- `DESIGN_SYSTEM.md`
- `COLOR_SYSTEM.md`
- `TYPOGRAPHY_SYSTEM.md`
- `UI_COMPONENTS.md`
- `MOTION_GUIDELINES.md`
- `RESPONSIVE_RULES.md`
- `ACCESSIBILITY.md`
- `SITEMAP.md`
- `INFORMATION_ARCHITECTURE.md`
- `ROUTES.md`
- `CONTENT_STRATEGY.md`
- `CONTENT_MODEL.md`
- `COPY_GUIDELINES.md`
- `CTA_STRATEGY.md`
- `TECHNICAL_ARCHITECTURE.md`
- `STACK.md`
- `FOLDER_STRUCTURE.md`
- `COMPONENT_ARCHITECTURE.md`
- `DATA_ARCHITECTURE.md`
- `CMS_ARCHITECTURE.md`
- `API_INTEGRATIONS.md`
- `FORM_ARCHITECTURE.md`
- `ANALYTICS_TRACKING.md`
- `SECURITY_GUIDELINES.md`
- `PERFORMANCE_GUIDELINES.md`
- `DEPLOYMENT_ARCHITECTURE.md`
- `ENVIRONMENT_VARIABLES.md`
- `LOCALIZATION.md`
- `HREFLANG_CANONICAL.md`
- `TESTING_STRATEGY.md`
- `QA_CHECKLIST.md`
- `PRE_DEPLOY_CHECKLIST.md`
- `POST_DEPLOY_CHECKLIST.md`
- `DEVELOPMENT_RULES.md`
- `CODING_STANDARDS.md`
- `DO_NOT_CHANGE.md`
- `TASKS.md`
- `CHANGELOG.md`

If a referenced document does not yet exist, the accepted decisions in this file remain the controlling baseline for their subjects.

---

## 14. Approval Record

| Field | Value |
| --- | --- |
| Document owner | Ahan Asa project owner |
| Architecture owner | TBD |
| Design owner | TBD |
| Version | 1.0 |
| Status | Active baseline; material changes require approval |
| Effective date | Upon project-owner approval |
| Review cadence | At each phase boundary and before production launch |
| Review triggers | Scope, provider, data, localization, security, deployment, identity, or design-system change |
