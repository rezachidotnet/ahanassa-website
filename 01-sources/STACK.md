# Ahan Asa Website — Technology Stack

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Canonical production origin:** `https://www.ahanassa.com`  
> **Document:** `STACK.md`  
> **Status:** Draft v1.0 — Implementation baseline  
> **Last updated:** 2026-08-25  
> **Primary website language:** Persian (`fa-IR`), fully RTL  
> **Launch model:** Static-first public website with secure server-side inquiry handling

---

## 1. Purpose

This document defines the approved technology stack for the Phase 1 Ahan Asa website. It is an implementation contract for Claude Code and human developers: which technologies are required, which are conditional, which are intentionally excluded, and how versions must be controlled.

The stack is optimized for:

- a premium Persian-first B2B website;
- server-rendered and statically generated indexable content;
- correct RTL behavior and future RTL/LTR coexistence;
- strong Core Web Vitals;
- secure qualified-inquiry capture;
- low operational complexity;
- accessibility to WCAG 2.2 AA;
- clean migration to a future CMS, CRM, or regional architecture without rebuilding the public interface.

`STACK.md` selects tools. `TECHNICAL_ARCHITECTURE.md` defines how the system is assembled. `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`, `DATA_ARCHITECTURE.md`, `FORM_ARCHITECTURE.md`, and `DEPLOYMENT_ARCHITECTURE.md` define the detailed implementation.

---

## 2. Decision Keywords

- **MUST** — mandatory for Phase 1 unless an approved decision supersedes it.
- **MUST NOT** — prohibited unless an approved architectural decision supersedes it.
- **SHOULD** — default choice; deviations require a documented reason.
- **MAY** — optional and must be justified by a real requirement.
- **DEFERRED** — deliberately not selected in this document.

Claude Code MUST NOT silently replace a locked technology, add an overlapping library, or introduce a deferred provider. Any material deviation must be recorded in `DECISIONS.md` before implementation.

---

## 3. Stack Principles

1. **Server first** — use React Server Components and static generation by default.
2. **Minimal client JavaScript** — add a Client Component only for real browser state, events, focus, measurement, media, or progressive enhancement.
3. **Static public content** — core copy, navigation, metadata, and structured data must be available without client-side fetching.
4. **Secure boundaries** — inquiries, uploads, credentials, and integrations remain server-side.
5. **Progressive enhancement** — essential reading and inquiry paths must remain understandable if nonessential JavaScript fails.
6. **Project-owned design system** — the approved brand system controls appearance; a generic UI kit does not.
7. **Dependency restraint** — native platform and framework capabilities are preferred to overlapping packages.
8. **Portable content** — content identities and schemas must not become coupled to one CMS vendor.
9. **Reproducible builds** — runtime, package manager, dependencies, and lockfile are pinned and verified in CI.
10. **Measured performance** — packages and effects are accepted only after bundle and runtime impact are understood.

---

## 4. Stack at a Glance

| Layer | Approved selection | Phase 1 status |
|---|---|---|
| Runtime | Node.js `24.x` LTS | Locked |
| Package manager | pnpm `11.x` through Corepack | Locked |
| Framework | Next.js App Router `16.3.x`, latest security-patched release | Locked |
| UI runtime | React `19.2.x`, security-patched version compatible with Next.js | Locked |
| Language | TypeScript `6.0.x`, strict mode | Locked baseline |
| Styling | Tailwind CSS `4.3.x` + CSS custom properties + limited component CSS | Locked |
| Rendering | Static generation first; server rendering only where required | Locked |
| Content | Repository-managed structured TypeScript data + controlled MDX for long-form content | Locked for Phase 1 |
| Schema validation | Zod, shared by content and server input boundaries | Locked |
| Forms | Native form semantics + Server Actions/Route Handlers + progressive enhancement | Locked |
| CMS | None at launch; adapter-ready content model | Deferred |
| Public database | None at launch | Locked exclusion |
| CRM/ERP | Provider-neutral server adapter | Provider deferred |
| File uploads | Private object storage through a server adapter | Conditional |
| Localization | Locale-aware route/content architecture; only Persian published in Phase 1 | Locked |
| Icons | Curated `lucide-react` subset, subject to visual approval | Approved with limits |
| Motion | CSS/WAAPI first; Motion package only for approved complex sequences | Conditional |
| Hosting | Vercel | Locked direction |
| DNS/security edge | Cloudflare | Locked direction |
| Repository | GitHub, private during development unless approved otherwise | Locked direction |
| CI | GitHub Actions + Vercel preview deployments | Locked direction |
| Unit tests | Vitest | Locked |
| Component tests | React Testing Library | Locked |
| End-to-end tests | Playwright | Locked |
| Accessibility automation | axe-core integrated with Playwright | Locked |
| Performance checks | Lighthouse CI + field Web Vitals | Locked |
| Analytics | Typed first-party event layer; vendor implementation deferred | Interface locked |
| Error monitoring | Provider adapter; Sentry or equivalent only after approval | Deferred |

---

## 5. Version Baseline and Security Notice

### 5.1 Baseline date

This stack was evaluated on **2026-08-25**. Package versions MUST be rechecked at project initialization and before production release.

### 5.2 Next.js release rule

Use the newest security-patched release in the approved Next.js `16.3` line. A scheduled Next.js security release is announced for **2026-08-26**, including a critical-severity fix. Therefore:

- production MUST NOT launch on an unpatched `16.3` release;
- use `16.3.3` or a later patched `16.3.x` release once published;
- if the approved active-LTS line changes before implementation, record the migration in `DECISIONS.md` and run the complete test suite;
- never use `canary`, beta, release-candidate, or experimental framework packages in production.

### 5.3 Runtime rule

Use Node.js `24.x` LTS, not Node.js `26.x` Current. Production workloads MUST remain on an Active LTS or Maintenance LTS Node.js line.

### 5.4 TypeScript rule

TypeScript `6.0.x` is the conservative Phase 1 baseline. TypeScript `7.x` may be adopted only when:

1. the selected Next.js patch officially supports it or the repository proves compatibility;
2. `pnpm typecheck`, `pnpm build`, tests, editor tooling, and CI all pass;
3. required plugins do not rely on an incompatible compiler API;
4. the change is recorded in `DECISIONS.md`.

### 5.5 Pinning rule

- `packageManager` MUST pin an exact pnpm release.
- the Node major/minor policy MUST be declared in `engines` and a repository runtime file.
- `pnpm-lock.yaml` MUST be committed.
- CI MUST use `pnpm install --frozen-lockfile`.
- dependency ranges MUST NOT use `*` or unbounded `latest` in committed production manifests.
- security patches must be applied promptly without silently changing major versions.

---

## 6. Runtime and Package Management

### 6.1 Required runtime

```text
Node.js: 24.x LTS
pnpm: 11.x
Module system: ESM
Package lock: pnpm-lock.yaml
```

### 6.2 Required repository declarations

The root `package.json` SHOULD include a compatible form of:

```json
{
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24 <25"
  },
  "packageManager": "pnpm@11.x.x"
}
```

Replace `11.x.x` with the exact approved pnpm patch during project initialization.

### 6.3 Package policy

- Use one package manager only.
- Do not commit npm or Yarn lockfiles.
- Package installation scripts are denied by default and explicitly approved only when required and reviewed.
- Every new runtime dependency requires a real use case, maintenance review, license review, bundle-impact review, and security check.
- Claude Code MUST search the existing dependency graph before adding a package that duplicates an existing capability.

---

## 7. Application Framework

### 7.1 Next.js App Router

The application MUST use the Next.js App Router.

Required framework capabilities:

- nested layouts;
- React Server Components;
- static generation;
- Server Actions and/or Route Handlers for secure mutations;
- Metadata API;
- `next/image`;
- `next/font/local`;
- generated `sitemap.xml` and `robots.txt`;
- route-level error, loading, and not-found handling;
- typed routes when stable in the selected release.

The Pages Router MUST NOT be introduced.

### 7.2 Rendering policy

| Page/function | Default rendering |
|---|---|
| Homepage and corporate pages | Static generation |
| Capability and material pages | Static generation |
| Projects/case studies | Static generation |
| Insights/resources | Static generation |
| Legal pages | Static generation |
| Search/filter state | Server-rendered route/search params where possible |
| Inquiry submission | Server Action or Route Handler |
| Preview-only unpublished content | Authenticated dynamic rendering, only if later approved |
| Personalized/customer data | Out of Phase 1 scope |

Dynamic rendering MUST NOT be used merely because it is convenient. Each dynamic route must have a documented reason.

### 7.3 React component policy

- Components are Server Components by default.
- `'use client'` must appear at the smallest practical boundary.
- A page or layout MUST NOT become a Client Component only to support one interactive child.
- Context providers must be narrowly scoped.
- Avoid global client state.
- Prefer URL state, server data, native disclosure/dialog behavior, and local component state.
- Redux, MobX, and Zustand are not approved for Phase 1.

### 7.4 Experimental features

Experimental Next.js or React features MUST NOT be enabled unless the feature is essential, isolated, tested, and approved in `DECISIONS.md`.

---

## 8. TypeScript and Code Quality

### 8.1 TypeScript configuration

TypeScript MUST run in strict mode. The final `tsconfig.json` SHOULD enable or preserve:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

Any option incompatible with the selected Next.js version may be adjusted only with a recorded reason.

### 8.2 Type rules

- Avoid `any`; use `unknown` plus narrowing at external boundaries.
- Do not use non-null assertions to conceal missing data.
- Shared domain types must be derived from schemas where practical.
- Exhaustive unions SHOULD protect content status, locale, CTA type, media role, and form result states.
- Browser-safe and server-only modules MUST be separated.
- Secrets or confidential entity types MUST NOT be imported into Client Components.

### 8.3 Linting and formatting

Use:

- ESLint with flat configuration;
- the compatible Next.js rules;
- `typescript-eslint` rules requiring type-aware checks where valuable;
- `eslint-plugin-jsx-a11y`;
- Prettier for deterministic formatting;
- `prettier-plugin-tailwindcss` only if compatible with the selected Tailwind release.

Formatting and linting MUST NOT fight each other. CI is authoritative.

---

## 9. Styling and Design-System Implementation

### 9.1 Tailwind CSS

Use Tailwind CSS `4.3.x` with CSS-first configuration.

Tailwind is an implementation tool, not the design authority. All public classes must resolve to the approved tokens and rules in `DESIGN_SYSTEM.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`, `RESPONSIVE_RULES.md`, and `MOTION_GUIDELINES.md`.

### 9.2 Token layers

Use this hierarchy:

1. primitive brand values;
2. semantic CSS custom properties;
3. Tailwind theme mappings;
4. component recipes;
5. page composition.

Example semantic direction:

```css
:root {
  --color-brand-primary: #0b2545;
  --color-brand-accent: #b04a2f;
  --color-surface-canvas: #ffffff;
}
```

The full token inventory belongs in `DESIGN_SYSTEM.md`; this file does not redefine it.

### 9.3 RTL implementation

- Set `lang="fa"` and `dir="rtl"` at the document root for Phase 1.
- Prefer CSS logical properties and Tailwind logical utilities.
- Use `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, `inline-size`, and `block-size` concepts.
- Do not mechanically mirror the entire interface.
- Directional icons may mirror semantically; logos, media controls, phone, search, upload/download, real photography, and documented evidence normally do not.
- Wrap URLs, emails, phone numbers, standards, grades, measurements, and codes with direction isolation.
- No component may assume that `left` means “start” or `right` means “end.”

### 9.4 Component CSS

Plain CSS or CSS Modules MAY be used for:

- highly specific animations;
- complex pseudo-elements;
- print styling;
- browser normalization;
- third-party integration containment;
- rules that become less readable as utility strings.

Do not introduce styled-components, Emotion, Sass, Less, or another CSS-in-JS/compiler layer in Phase 1.

### 9.5 UI library policy

- Do not install a monolithic component library.
- Do not use a generic theme as the visual foundation.
- Project-owned components are required.
- Native HTML is preferred for buttons, links, forms, details/disclosure, dialog, and media controls where it provides robust behavior.
- A headless primitive package MAY be added for a genuinely complex widget only after keyboard, screen-reader, RTL, bundle, and styling review.
- Copying a large prebuilt component collection into the repository without need is prohibited.

---

## 10. Typography and Fonts

- Use `next/font/local` for approved self-hosted Persian fonts.
- Do not load production fonts from Google Fonts or another remote font CDN.
- Use WOFF2 variable fonts when the approved license and source permit.
- Limit families, weights, and subsets to the approved typography system.
- Apply `font-display` behavior through Next.js font handling and verify no unacceptable layout shift.
- Latin fallbacks must work inside Persian UI for domains, standards, grades, and measurements.
- The official Persian brand wordmark must remain a separate approved vector asset; Claude Code MUST NOT fabricate it from live text.

The final family, weight map, preload rules, and fallback metrics belong in `FONT_STRATEGY.md`.

---

## 11. Icons, SVG, and Visual Assets

### 11.1 Icons

Use a curated, tree-shaken subset of `lucide-react` only after confirming visual compatibility with the approved icon direction.

- Import icons individually.
- Do not ship the entire icon library.
- Do not use icon fonts.
- Icon-only controls require accessible Persian names.
- Decorative icons use `aria-hidden="true"`.
- The Ahan Asa master mark must never be repurposed as a generic UI icon.

If Lucide fails visual approval, replace it with a small project-owned SVG set; do not mix families.

### 11.2 Images

- Use `next/image` for responsive raster delivery.
- Prefer AVIF, then WebP, with a justified fallback.
- Every image must declare intrinsic dimensions or a stable aspect ratio.
- Only the real LCP candidate may receive priority loading.
- Remote image domains must be allowlisted explicitly.
- Authentic evidence media must not be mirrored or misrepresented.
- Decorative AI-generated imagery must not imply real inventory, facilities, clients, or project evidence.

### 11.3 SVG

- Keep authoritative logo masters separate from web exports.
- Sanitize third-party SVG files.
- Use SVG components only when style/state control is needed; otherwise use stable asset files.
- Never inject untrusted SVG or HTML.

---

## 12. Motion

### 12.1 Default

Use CSS transitions, CSS keyframes, and the Web Animations API before adding a runtime animation library.

### 12.2 Optional Motion package

The `motion` package MAY be installed only when an approved interaction cannot be implemented clearly and accessibly with CSS/WAAPI. If installed:

- import only in affected Client Components;
- lazy-load noncritical sequences;
- animate `transform` and `opacity` by default;
- support `prefers-reduced-motion`;
- do not block content, navigation, or CTA access;
- measure bundle and main-thread impact.

GSAP, Three.js, WebGL hero scenes, scroll hijacking, and page-wide parallax are not approved for Phase 1.

---

## 13. Content Stack

### 13.1 Phase 1 source

Public content is repository-managed at launch.

Use:

- typed TypeScript records for structured entities;
- Zod schemas for build-time validation;
- controlled MDX for long-form article/resource bodies;
- static asset references for approved media;
- stable opaque IDs and locale-independent slugs/keys for entity relationships.

### 13.2 MDX restrictions

- MDX is limited to trusted repository content.
- Arbitrary script, raw HTML, and unreviewed component imports are prohibited.
- The allowed MDX component map must be explicit and small.
- Structured facts, SEO fields, claims, evidence status, relationships, and CTAs must remain in validated frontmatter or typed records—not buried in prose.
- A malformed or incomplete content record must fail the production build.

### 13.3 Content validation

Validation MUST check, where applicable:

- unique IDs and slugs;
- supported locale;
- publication status and dates;
- required SEO fields;
- canonical relationships;
- valid internal references;
- media dimensions, alt text, and evidence status;
- approved claims and source records;
- no draft or confidential records in production output;
- valid CTA destinations;
- sitemap/indexability rules.

### 13.4 CMS position

No external CMS is approved for Phase 1. The content repository and schemas must nevertheless be designed so that a future CMS adapter can supply the same domain entities.

A CMS MUST NOT be selected until `CMS_ARCHITECTURE.md` defines:

- editorial roles and workflow;
- preview requirements;
- locale behavior;
- asset governance;
- schema portability;
- backup/export guarantees;
- cost and operational ownership;
- security and access control.

---

## 14. Data and Persistence

### 14.1 Public application data

No production database is required for public content in Phase 1.

The following are explicitly excluded:

- public product inventory;
- live prices;
- marketplace data;
- shopping cart and checkout;
- customer accounts;
- supplier accounts;
- public quotation tracking;
- client-side storage of confidential inquiry data.

### 14.2 Database and ORM

PostgreSQL, Prisma, Drizzle, Supabase, Firebase, and similar platforms are not approved by default. Add a database only after a defined server-side feature requires persistence and `DATA_ARCHITECTURE.md` approves the model, retention, backup, access, and deletion policy.

### 14.3 Browser storage

- Do not store inquiries, uploaded documents, personal data, quotations, or sensitive project details in `localStorage`, `sessionStorage`, IndexedDB, cookies readable by JavaScript, or page source.
- Consent or low-risk UI preferences may use minimal storage only after privacy review.
- Essential functionality must not depend on durable browser storage.

---

## 15. Forms and Lead Capture

### 15.1 Form foundation

Use semantic native forms enhanced by React only where useful.

Approved baseline:

- HTML form semantics;
- Next.js Server Action or Route Handler;
- shared Zod schema;
- native input constraints as a first client-side layer;
- server-side validation as authoritative;
- accessible field-level and form-level error summaries;
- pending, success, recoverable-error, and retry states;
- server-generated inquiry/reference ID;
- progressive enhancement.

React Hook Form is not required and MUST NOT be added unless form complexity proves that it materially improves maintainability without weakening progressive enhancement.

### 15.2 Abuse controls

Use layered controls:

- server-side validation and normalization;
- a honeypot field;
- timing and duplicate-submission checks;
- origin and content-type verification;
- rate limiting at the edge/server boundary;
- Cloudflare Turnstile when abuse risk or live traffic justifies it;
- generic public errors that do not expose integration details.

CAPTCHA or challenge scripts must not load on every page.

### 15.3 CRM/ERP integration

The production provider is **DEFERRED**. Implement a server-only adapter contract such as:

```ts
interface LeadSink {
  submit(input: ValidatedInquiry): Promise<LeadSubmissionResult>;
}
```

Rules:

- no provider SDK in Client Components;
- no credentials in browser bundles;
- retries must be idempotent;
- integration failures must be logged safely;
- the user must receive an honest fallback path;
- an inquiry must never be reported as received unless the defined durable handoff succeeds.

Email-only delivery, Odoo, a CRM, or another provider is not approved by this file. `FORM_ARCHITECTURE.md` and `API_INTEGRATIONS.md` must select the production destination.

### 15.4 Document upload

Uploads are conditional and disabled until operationally approved. If enabled:

- upload through a server-authorized flow to private object storage;
- use random server-generated object keys;
- validate extension, MIME type, signature, size, and file count;
- scan files before downstream use;
- never store uploads under `/public`;
- use time-limited access;
- define retention and deletion;
- strip or treat metadata as untrusted;
- never place private file URLs in analytics.

The storage provider remains deferred.

---

## 16. Localization and Directionality

### 16.1 Phase 1

- Publish Persian only.
- Default locale: `fa` / `fa-IR`.
- Root document: `lang="fa"`, `dir="rtl"`.
- Canonical Persian URLs must not require an unnecessary `/fa` prefix unless `ROUTES.md` explicitly decides otherwise.

### 16.2 Future readiness

The application structure must allow future English, Arabic, and regional content without publishing empty locales.

Requirements:

- locale-independent entity IDs;
- locale-aware metadata and content access;
- route generation isolated from display text;
- direction derived from locale;
- no hardcoded Persian strings inside reusable UI primitives;
- no hreflang for an unpublished or incomplete locale;
- no automatic translation in production.

### 16.3 Localization library

Do not add `next-intl` or another i18n runtime in Phase 1 merely for one published locale. Keep a small typed dictionary/content interface. Adopt `next-intl` when the second locale is approved, complete, and requires runtime locale routing and messages.

If the implementation team chooses to install it earlier for proven migration-risk reduction, the reason and bundle/architecture impact must be recorded in `DECISIONS.md`.

---

## 17. SEO Stack

Use native Next.js capabilities and typed project utilities:

- Metadata API for title, description, canonical, Open Graph, and social metadata;
- generated `sitemap.ts`;
- generated `robots.ts`;
- server-rendered JSON-LD helpers;
- static canonical route registry;
- build-time validation for indexability, canonical, metadata, and internal links;
- HTML content visible without client-side fetching.

Do not add a generic SEO plugin. JSON-LD must be derived from verified visible content and must not claim unsupported products, prices, ratings, inventory, locations, or services.

The canonical production origin is `https://www.ahanassa.com`. Environment-specific preview domains must be `noindex` and must never become canonical.

---

## 18. Analytics and Consent

### 18.1 Locked interface

Implement a typed first-party event layer independent of analytics vendors.

Example event families:

- `cta_click`;
- `contact_method_click`;
- `rfq_start`;
- `rfq_validation_error`;
- `rfq_submit_success`;
- `rfq_submit_failure`;
- `resource_view`;
- `resource_download`;
- `case_study_view`.

Events must use allowlisted fields. They must not include names, phone numbers, emails, free text, document names, document URLs, quotation content, or other personal/confidential data.

### 18.2 Provider decision

GA4, Google Tag Manager, Vercel Web Analytics, or another vendor may be selected only in `ANALYTICS_TRACKING.md` after defining:

- data ownership;
- consent/legal basis;
- measurement ID ownership;
- environments;
- event dictionary;
- retention;
- internal traffic handling;
- cross-domain needs;
- QA and debugging process.

No analytics script may be hardcoded directly in page components.

### 18.3 Search monitoring

Google Search Console and Bing Webmaster Tools do not require a runtime JavaScript dependency. Verification must use the approved DNS or metadata method and be documented outside component code.

---

## 19. Security Stack

### 19.1 Platform controls

- Cloudflare for DNS, TLS edge policy, redirects, WAF/rate controls where configured, and optional Turnstile.
- Vercel for isolated builds, preview deployments, server execution, and environment-secret management.
- GitHub protected branch and required checks.
- Dependabot or Renovate for controlled dependency updates; use one, not both.
- GitHub code scanning and secret scanning where available.

### 19.2 Application controls

- Zod validation at all external input boundaries.
- `server-only` guards for modules containing secrets or confidential integrations.
- security headers configured centrally.
- strict allowlists for remote images, redirects, CORS, and upload types.
- no raw HTML rendering from untrusted input.
- no use of `dangerouslySetInnerHTML` except a reviewed structured-data helper with safe serialization.
- no credentials, tokens, private endpoints, or internal stack traces in client code.
- no production secrets in `.env.example`, logs, screenshots, or test fixtures.

### 19.3 Dependency security

- `pnpm audit` is advisory; findings must be triaged, not blindly ignored or blindly force-fixed.
- production deployment is blocked by an applicable unmitigated critical vulnerability.
- dependency upgrades require build, type, unit, integration, accessibility, and end-to-end checks according to risk.
- security patches take precedence over convenience freezes.

Detailed headers, CSP, upload scanning, logging, incident response, and privacy controls belong in `SECURITY_GUIDELINES.md`.

---

## 20. Hosting and Delivery

### 20.1 Production topology

```text
Visitor
  → Cloudflare DNS / edge controls
  → Vercel deployment
  → Next.js static output and server functions
  → approved server-side lead/media integrations only
```

### 20.2 Domain policy

- Canonical host: `www.ahanassa.com`.
- Apex `ahanassa.com` redirects permanently to the canonical `www` host while preserving path and query.
- HTTP redirects permanently to HTTPS.
- Only one redirect hop is acceptable under normal conditions.
- Vercel preview URLs are not indexable.
- Cloudflare and Vercel redirect rules must not create loops or contradictory canonical hosts.

### 20.3 Environments

Use:

- local development;
- preview per pull request;
- production from the protected main branch.

Add a separate staging environment only if persistent integration testing requires it. Do not create environment complexity without an owner.

### 20.4 Cache strategy

- Static pages and hashed assets receive long-lived caching.
- HTML revalidation is explicit and content-driven.
- Inquiry responses and private data use `no-store`.
- Preview and draft content use `no-store` and `noindex`.
- Do not cache personalized errors or confidential integration responses.
- Cloudflare cache rules must respect Vercel/Next.js behavior and must not override sensitive response headers.

Detailed cache keys, TTLs, invalidation, and CDN behavior belong in `CACHING_STRATEGY.md`.

---

## 21. Testing Stack

### 21.1 Required tools

| Test level | Tool | Required scope |
|---|---|---|
| Schema/unit | Vitest | validators, utilities, route helpers, metadata, event payloads |
| Components | React Testing Library | interactive and accessibility-critical components |
| End-to-end | Playwright | navigation, RFQ, errors, downloads, responsive behavior |
| Accessibility | axe-core + Playwright | representative pages and component states |
| Visual regression | Playwright screenshots | header, menu, hero, forms, tables, key layouts |
| Performance | Lighthouse CI | representative production builds |
| Type safety | `tsc --noEmit` | complete repository |
| Static analysis | ESLint | complete repository |

### 21.2 Required browser coverage

Playwright CI SHOULD cover:

- Chromium;
- WebKit;
- Firefox;
- representative mobile viewport;
- representative desktop viewport.

Manual QA must still cover real mobile Safari and Chrome before launch.

### 21.3 Required RTL cases

Tests must include:

- Persian navigation and mobile menu;
- focus order matching DOM and reading order;
- mixed Persian/Latin strings;
- phone, email, URL, grade, dimensions, and standards;
- directional icon behavior;
- form error summaries and field association;
- zoom and reflow;
- reduced motion;
- long Persian headings and content expansion.

### 21.4 No snapshot-only assurance

Snapshots may detect visual change, but they do not replace semantic assertions, keyboard tests, screen-reader review, content validation, or manual inspection.

---

## 22. Performance and Observability

### 22.1 Performance tooling

Use:

- Next.js build output and bundle analysis when needed;
- Lighthouse CI;
- field Core Web Vitals through the approved analytics/observability adapter;
- browser Performance tools for interaction analysis;
- Vercel Speed Insights only if approved in the analytics/privacy decision.

### 22.2 Performance rules

- No global third-party script without a site-wide requirement.
- No animation library in the root layout by default.
- No client-side data-fetching library for static content.
- No carousel library for a simple list or scroll-snap layout.
- No oversized hero video at launch.
- No below-the-fold image priority loading.
- No unbounded icon or utility imports.
- No hydration for content that can remain static HTML.
- Route-specific dependencies must remain route-specific.

### 22.3 Error monitoring

The application must expose a server-side logging interface and user-safe error states. A hosted provider such as Sentry is deferred until ownership, retention, privacy, alerting, and cost are approved.

Logs MUST redact personal and confidential content.

---

## 23. Development and CI Commands

The repository SHOULD expose these stable commands:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test --grep @a11y",
    "content:validate": "tsx scripts/validate-content.ts",
    "links:validate": "tsx scripts/validate-links.ts",
    "ci": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm content:validate && pnpm test && pnpm build && pnpm test:e2e"
  }
}
```

Exact command composition may evolve, but equivalent checks must remain available and CI-enforced.

### 23.1 Pull-request gate

Before merge:

1. frozen dependency installation succeeds;
2. format check passes;
3. lint passes;
4. typecheck passes;
5. content validation passes;
6. unit/component tests pass;
7. production build succeeds;
8. critical Playwright tests pass against the preview;
9. automated accessibility checks pass;
10. preview deployment receives visual and content review.

---

## 24. Core Package Set

### 24.1 Expected production dependencies

| Package | Purpose | Policy |
|---|---|---|
| `next` | application framework | Required; approved patched line only |
| `react` | UI runtime | Required; version controlled by Next compatibility |
| `react-dom` | server/client renderer | Required; version aligned with React |
| `zod` | content and input validation | Required |
| `lucide-react` | approved icon subset | Limited and replaceable |

Conditional production dependencies:

| Package/category | When allowed |
|---|---|
| `@next/mdx` | Controlled long-form MDX is included |
| `remark-gfm` | Approved Markdown tables/lists require it |
| `motion` | Approved complex interaction needs runtime motion |
| analytics SDK | `ANALYTICS_TRACKING.md` approves provider |
| error-monitoring SDK | monitoring decision approves provider |
| CRM/email SDK | server adapter provider is approved |
| object-storage SDK | secure uploads are approved |
| `next-intl` | second complete locale is approved or early adoption is justified |

### 24.2 Expected development dependencies

- `typescript`;
- `tailwindcss` and the compatible Next.js integration package;
- `eslint` and compatible plugins;
- `prettier`;
- `vitest`;
- `@testing-library/react`;
- `@testing-library/jest-dom`;
- `@testing-library/user-event`;
- `@playwright/test`;
- `@axe-core/playwright`;
- `tsx` for repository validation scripts;
- Lighthouse CI tooling;
- optional bundle analyzer compatible with the selected Next.js release.

Do not install every conditional package during scaffolding.

---

## 25. Explicitly Rejected or Deferred Technologies

Unless a later approved decision changes scope, Phase 1 MUST NOT include:

- WordPress or a coupled page-builder backend;
- a public e-commerce engine;
- Shopify, WooCommerce, or Magento;
- a public product/price feed;
- a client-side SPA-only architecture;
- Create React App;
- the Next.js Pages Router;
- a second JavaScript package manager;
- Redux, MobX, or a global state framework;
- Apollo Client or another GraphQL client without an approved GraphQL service;
- React Query/SWR for static public content;
- Prisma/Drizzle or a database without a persistence requirement;
- styled-components, Emotion, Sass, or Less;
- a generic full UI theme;
- icon fonts;
- GSAP, Three.js, or WebGL effects at launch;
- uncontrolled third-party chat widgets;
- client-visible CRM/ERP credentials;
- public storage for inquiry documents;
- automatic machine-translated production pages;
- analytics scripts added outside the approved event/consent architecture.

“Popular” or “already familiar” is not sufficient justification for adding a technology.

---

## 26. Claude Code Operating Rules

Before adding or changing technology, Claude Code MUST:

1. read `PROJECT_BRIEF.md`, `TECHNICAL_ARCHITECTURE.md`, `STACK.md`, `DESIGN_SYSTEM.md`, `CONTENT_MODEL.md`, `ACCESSIBILITY.md`, and relevant specialist documents;
2. inspect the current repository and lockfile;
3. confirm that the needed capability is not already available;
4. check compatibility with the pinned Node, Next.js, React, TypeScript, and Tailwind versions;
5. evaluate server/client boundary, RTL, accessibility, performance, security, and SEO impact;
6. avoid modifying unrelated dependencies;
7. update tests and documentation;
8. record material decisions in `DECISIONS.md`;
9. run the required verification commands;
10. report exactly what changed and any unresolved risk.

Claude Code MUST NOT upgrade a major version, introduce a provider, enable an experimental flag, or weaken a release gate silently.

---

## 27. Open Decisions

The following are intentionally unresolved and must be completed in their authoritative documents:

| Decision | Authority |
|---|---|
| Final CRM/ERP or lead destination | `FORM_ARCHITECTURE.md`, `API_INTEGRATIONS.md` |
| Durable lead fallback and retry queue | `FORM_ARCHITECTURE.md` |
| Secure upload provider and scanning | `FORM_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md` |
| Analytics/consent provider | `ANALYTICS_TRACKING.md` |
| Error monitoring provider | `SECURITY_GUIDELINES.md` / observability decision |
| Final CMS, if later needed | `CMS_ARCHITECTURE.md` |
| Database/ORM, if later needed | `DATA_ARCHITECTURE.md` |
| Final font files and license | `FONT_STRATEGY.md`, `BRAND_GUIDELINES.md` |
| Final canonical route policy | `ROUTES.md`, `HREFLANG_CANONICAL.md` |
| Exact security headers and CSP | `SECURITY_GUIDELINES.md` |
| Exact cache TTL and invalidation | `CACHING_STRATEGY.md` |
| Package update automation | `DEVELOPMENT_RULES.md` |

Until resolved, use the safest reversible implementation and do not fabricate production configuration.

---

## 28. Launch Acceptance Checklist

The stack is correctly implemented only when:

- [ ] Node.js and pnpm are pinned and CI uses the frozen lockfile.
- [ ] Next.js uses the approved security-patched `16.3.x` release or a formally approved successor.
- [ ] React and React Server Components are on patched compatible versions.
- [ ] TypeScript strict checks pass with no hidden `any` escape layer.
- [ ] Server Components are the default and client boundaries are minimal.
- [ ] Core Persian content and metadata render without client-side fetching.
- [ ] Tailwind tokens match the approved design system.
- [ ] RTL and mixed-direction behavior pass automated and manual QA.
- [ ] Fonts are local, licensed, optimized, and stable.
- [ ] Content schemas fail builds on invalid or confidential publication data.
- [ ] Inquiry validation is authoritative on the server.
- [ ] No lead, document, or secret is exposed to the client.
- [ ] CRM/upload providers are either approved and tested or their features remain disabled.
- [ ] Canonical, robots, sitemap, metadata, and JSON-LD are generated correctly.
- [ ] Preview deployments are `noindex`.
- [ ] Analytics contains no personal or confidential data.
- [ ] Unit, component, Playwright, accessibility, and build gates pass.
- [ ] Representative pages meet approved Core Web Vitals and performance budgets.
- [ ] Cloudflare and Vercel redirects produce one canonical HTTPS host without loops.
- [ ] All technology deviations are recorded in `DECISIONS.md`.

---

## 29. Official Technical References

Version and security decisions should be checked against primary sources:

- Next.js releases and security notices: `https://nextjs.org/blog`
- Node.js release status: `https://nodejs.org/en/about/previous-releases`
- React releases and security notices: `https://react.dev/blog`
- TypeScript releases: `https://devblogs.microsoft.com/typescript/`
- Tailwind CSS releases: `https://tailwindcss.com/blog`
- pnpm releases: `https://pnpm.io/blog`
- Vercel documentation: `https://vercel.com/docs`
- Cloudflare documentation: `https://developers.cloudflare.com/`
- Playwright documentation: `https://playwright.dev/docs/intro`
- Vitest documentation: `https://vitest.dev/guide/`
- WCAG 2.2: `https://www.w3.org/TR/WCAG22/`

Third-party tutorials are not authoritative for version, security, or deployment decisions.

---

## 30. Related Documents and Authority

Read this document with:

- `PROJECT_BRIEF.md`
- `TECHNICAL_ARCHITECTURE.md`
- `FOLDER_STRUCTURE.md`
- `COMPONENT_ARCHITECTURE.md`
- `DATA_ARCHITECTURE.md`
- `CMS_ARCHITECTURE.md`
- `FORM_ARCHITECTURE.md`
- `API_INTEGRATIONS.md`
- `ANALYTICS_TRACKING.md`
- `SECURITY_GUIDELINES.md`
- `PERFORMANCE_GUIDELINES.md`
- `CACHING_STRATEGY.md`
- `DEPLOYMENT_ARCHITECTURE.md`
- `ENVIRONMENT_VARIABLES.md`
- `LOCALIZATION.md`
- `FONT_STRATEGY.md`
- `TESTING_STRATEGY.md`
- `CLAUDE.md`
- `DECISIONS.md`

If documents conflict, the latest explicitly approved record in `DECISIONS.md` takes precedence, followed by `PROJECT_BRIEF.md`. The affected documents must then be updated so the repository returns to one consistent source of truth.

---

**End of `STACK.md`**
