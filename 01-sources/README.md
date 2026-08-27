# Ahan Asa Website

> Premium Persian-first B2B steel procurement website for **Ahan Asa | آهن آسا**
> Canonical production origin: `https://www.ahanassa.com`
> Locales: Persian (`fa-IR`) primary/default and unprefixed; English (`/en`, LTR); Arabic (`/ar`, RTL)
> Status: Documentation-first implementation baseline
> Last updated: 2026-08-27 — AUD-034 documentation drift cleanup

## Overview

Ahan Asa is a premium steel procurement management brand. The website presents the company as a disciplined commercial and technical procurement partner that helps project buyers make clearer, safer, and better-controlled steel purchasing decisions.

The product is deliberately **not** designed as:

- an online steel shop;
- a public price board;
- a commodity marketplace;
- a stock or supplier directory;
- a cart-first e-commerce experience.

The primary conversion is the submission of an invoice, bill of materials, steel list, or project procurement request for professional review.

**Approved Persian promise:** «ما مراقب سرمایه شما هستیم.»
**Meaning-aligned English version:** “We protect your capital.”

The promise must be used as brand positioning—not as an absolute financial, price, delivery, or risk guarantee.

## Product Goals

- Establish Ahan Asa as a credible, premium procurement-management brand.
- Explain the difference between managed procurement and ordinary steel selling.
- Generate qualified B2B inquiries from real projects and purchasing teams.
- Reduce price-only or low-context inquiries through clear qualification.
- Support sales conversations with transparent process, scope, and evidence.
- Deliver a fast, accessible, mobile-first, SEO-ready multilingual experience with Persian as the primary/default locale.
- Preserve a scalable foundation for approved content, integrations, and locales.

## Phase 1 Scope

Phase 1 launches with Persian (`fa`), English (`en`), and Arabic (`ar`) architecture. Persian is the primary/default unprefixed locale. Its expected page families include:

- homepage;
- procurement capabilities and methodology;
- steel material/category hub and detail pages;
- industries and customer applications;
- verified projects, evidence, or case studies when approved;
- insights and resources;
- about, FAQ, contact, privacy, and legal pages;
- consultation/RFQ flow with optional secure document upload;
- required confirmation, error, and system pages.

English (`/en/**`) and Arabic (`/ar/**`) are active launch locales. Do not fabricate English or Arabic final copy: pages or translations that lack approved localized content must remain unpublished or non-indexable according to the localization, CMS, and SEO specifications.

## Core User Journey

1. A visitor discovers Ahan Asa through search, referral, campaign, or direct navigation.
2. The visitor understands Ahan Asa's role as a procurement manager rather than a commodity seller.
3. The visitor evaluates the process, capabilities, evidence, FAQs, and relevant resources.
4. The visitor submits an invoice, BOM, material list, or project requirement.
5. The request is validated, reviewed, and qualified.
6. Ahan Asa prepares the appropriate purchasing proposal and coordinates approved sourcing and delivery steps.

## Technology Baseline

| Layer | Approved baseline |
| --- | --- |
| Runtime | Node.js `24.x` LTS |
| Package manager | pnpm `11.x` through Corepack |
| Framework | Next.js App Router `16.3.x`, latest security-patched compatible release |
| UI runtime | React `19.2.x`, patched and compatible with Next.js |
| Language | TypeScript `6.0.x` in strict mode |
| Styling | Tailwind CSS `4.3.x`, CSS custom properties, limited component CSS |
| Rendering | Static generation and Server Components by default |
| Content | Cloudflare D1-backed CMS/read models plus approved structured content |
| Validation | Zod at content, configuration, and server-input boundaries |
| Forms | Native semantics with Server Actions or Route Handlers and progressive enhancement |
| Unit/component tests | Vitest and React Testing Library |
| End-to-end tests | Playwright |
| Accessibility tests | axe-core through Playwright |
| Performance tests | Lighthouse CI plus field Web Vitals |
| Hosting/runtime | Cloudflare Workers + Static Assets via vinext |
| DNS/security edge | Cloudflare |
| Repository/CI | GitHub and GitHub Actions + Wrangler deployments |

The exact installed versions in `package.json`, `pnpm-lock.yaml`, and the repository runtime declaration are authoritative once implementation begins. Any material stack deviation requires an approved entry in `DECISIONS.md`.

## Architecture Principles

- Prefer React Server Components and static output for public content.
- Add Client Components only for genuine browser interaction or state.
- Keep core copy, metadata, navigation, and structured data available without client-side fetching.
- Keep inquiry handling, credentials, integrations, and uploads server-side.
- Use progressive enhancement for essential reading and conversion paths.
- Build from the project design system instead of adopting a generic UI kit.
- Separate content and business rules from presentation components.
- Keep CRM, email, storage, analytics, and monitoring behind replaceable adapters.
- Use the approved Cloudflare D1/R2-backed website data, CMS, and RFQ persistence architecture.
- Protect accessibility, privacy, security, SEO, and Core Web Vitals as release requirements.

See `TECHNICAL_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`, and `DATA_ARCHITECTURE.md` for the detailed contracts.

## Getting Started

### Prerequisites

- Node.js `24.x` LTS
- Corepack enabled
- the exact pnpm `11.x` patch declared by the repository
- Git

### Local setup

```bash
git clone <approved-private-repository-url>
cd <repository-directory>
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

Do not replace `<approved-private-repository-url>` or `<repository-directory>` in committed documentation until the actual repository URL and directory name are approved.

If the repository has not yet been initialized, create it according to `STACK.md`, `TECHNICAL_ARCHITECTURE.md`, and `FOLDER_STRUCTURE.md`; do not infer a different framework or package manager from this quick-start example.

## Environment Configuration

Local development must use test or disabled integrations. Never copy production credentials into `.env.local`.

Minimum core configuration:

```dotenv
APP_ENV=local
SITE_URL=http://localhost:3000
ALLOWED_HOSTS=localhost

NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_CONSENT_MODE=required

CRM_ENABLED=false
EMAIL_NOTIFICATIONS_ENABLED=false
UPLOADS_ENABLED=false
TURNSTILE_ENABLED=false
```

Production must use the canonical origin:

```dotenv
APP_ENV=production
SITE_URL=https://www.ahanassa.com
ALLOWED_HOSTS=ahanassa.com,www.ahanassa.com
```

Additional variables for CRM, email, uploads, anti-abuse, storage, webhooks, and monitoring are conditional. Use `ENVIRONMENT_VARIABLES.md` as the complete contract.

Security rules:

- Never commit `.env`, `.env.local`, tokens, secrets, private endpoints, customer data, or production recipients.
- Treat every `NEXT_PUBLIC_*` value as public browser data.
- Keep preview integrations isolated from production destinations.
- Fail configuration validation when a feature is enabled without its required dependent variables.
- Never log inquiry text, contact details, uploaded filenames, file contents, credentials, or tokens.

## Expected Commands

The repository should expose an equivalent command interface. Inspect `package.json` before running or changing scripts.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server |
| `pnpm build` | Create the production build |
| `pnpm start` | Run the production server locally |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run strict TypeScript checks |
| `pnpm format:check` | Verify formatting |
| `pnpm test` | Run unit and component tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm test:a11y` | Run automated accessibility scenarios |
| `pnpm content:validate` | Validate structured content contracts |
| `pnpm links:validate` | Validate internal links and route references |
| `pnpm ci` | Run the complete CI validation chain |

Command names may evolve, but equivalent checks must remain available and CI-enforced.

## Working With Claude Code

`CLAUDE.md` is the repository-wide operating contract for Claude Code. Before any change, Claude Code must:

1. read `CLAUDE.md` completely;
2. inspect the repository and preserve unrelated work;
3. read the specifications that govern the requested area;
4. check protected areas in `DO_NOT_CHANGE.md`;
5. review active work and dependencies in `TASKS.md`;
6. review approved and pending decisions in `DECISIONS.md`;
7. plan non-trivial work before implementation;
8. make the smallest complete change;
9. run the strongest relevant validation;
10. report changes, tests, assumptions, and unresolved risks.

If any mandatory governance file is missing, contradictory, or materially incomplete, Claude Code must not invent its content. It should stop only the affected work, identify the gap, and continue with unaffected work when safe.

### Task-specific reading map

| Task | Governing documents |
| --- | --- |
| Product scope and positioning | `PROJECT_BRIEF.md`, `BRAND_GUIDELINES.md` |
| Visual design | `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`, `UI_COMPONENTS.md`, `MOTION_GUIDELINES.md` |
| Pages and navigation | `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, `ROUTES.md`, `PAGE_SPECIFICATIONS.md`, `HOMEPAGE_SPEC.md`, `HEADER_NAVIGATION_SPEC.md`, `FOOTER_SPEC.md` |
| Content and conversion | `CONTENT_STRATEGY.md`, `CONTENT_MODEL.md`, `COPY_GUIDELINES.md`, `CTA_STRATEGY.md`, `MEDIA_GUIDELINES.md`, `FORM_ARCHITECTURE.md` |
| SEO | `SEO_STRATEGY.md`, `SEO_KEYWORD_MAP.md`, `SEO_PAGE_MAP.md`, `METADATA_SPEC.md`, `STRUCTURED_DATA.md`, `INTERNAL_LINKING.md`, `REDIRECTS.md`, `SITEMAP_ROBOTS_SPEC.md` |
| Engineering | `STACK.md`, `TECHNICAL_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`, `DATA_ARCHITECTURE.md`, `CODING_STANDARDS.md` |
| Integrations and security | `CMS_ARCHITECTURE.md`, `API_INTEGRATIONS.md`, `FORM_ARCHITECTURE.md`, `ANALYTICS_TRACKING.md`, `ENVIRONMENT_VARIABLES.md`, `SECURITY_GUIDELINES.md` |
| Performance | `PERFORMANCE_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md`, `CACHING_STRATEGY.md` |
| Localization | `LOCALIZATION.md`, `LOCALE_CONTENT_STRUCTURE.md`, `HREFLANG_CANONICAL.md` |
| Testing and release | `TESTING_STRATEGY.md`, `QA_CHECKLIST.md`, `SEO_QA_CHECKLIST.md`, `RESPONSIVE_QA.md`, `ACCESSIBILITY_QA.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md`, `DEPLOYMENT_ARCHITECTURE.md` |

## Brand and UI Guardrails

### Brand character

The experience should feel precise, trustworthy, calm, premium, technically aware, and industrial without becoming cold or noisy.

### Approved core palette

| Token | Value | Use |
| --- | --- | --- |
| Steel Navy | `#0B2545` | Primary brand color and typography |
| Forge Copper | `#B04A2F` | Restrained accent and selected actions |
| White | `#FFFFFF` | Primary clean surface |

Copper must not dominate large surfaces. Use project tokens rather than scattering arbitrary color, spacing, radius, shadow, or typography values.

### Persian and RTL requirements

- Set the document language to `fa` and direction to `rtl` at the correct root.
- Prefer logical CSS properties such as `margin-inline` and `padding-inline`.
- Preserve coherent keyboard, DOM, visual, and screen-reader order.
- Handle phone numbers, emails, URLs, filenames, units, and codes with intentional bidirectional text behavior.
- Mirror icons only when their meaning is directional; never mirror logos, media, charts, or universal symbols automatically.
- Prevent horizontal scrolling at every supported viewport.
- Respect `prefers-reduced-motion`; content must never depend on animation.

### Claims policy

Do not invent or imply:

- live prices, price guarantees, savings, or stock availability;
- supplier relationships, coverage, delivery capacity, or lead times;
- certifications, licenses, awards, project counts, or transaction volumes;
- testimonials, client logos, projects, case studies, team biographies, or contact details;
- warranties, legal assurances, or contractual commitments.

Use verified evidence, omit unsupported claims, and keep placeholders out of production.

## Forms and Confidential Data

The inquiry journey is upload-first and consultation-led.

- Ask only for information required to review and follow up on the request.
- Validate all server inputs; client validation is supplementary.
- Explain file types, size limits, consent, progress, success, failure, and retry behavior.
- Preserve user input after recoverable failures.
- Keep uploads private and inaccessible by public URL.
- Never announce success until the trusted backend confirms it.
- Keep sensitive values out of analytics, logs, URLs, client storage, and error reports.
- Provide a safe fallback when an optional CRM, email, or storage provider is unavailable.

## SEO and URL Rules

- Canonical production origin: `https://www.ahanassa.com`.
- The non-`www` host must permanently redirect to the canonical host while preserving valid paths.
- Persian Phase 1 routes are unprefixed; `/fa/**` must not become the primary route set.
- Canonical URLs use HTTPS, lowercase Latin route segments, no trailing slash, and no tracking parameters.
- Phase 1 emits self-canonical links but no `hreflang` or `x-default` because only Persian is published.
- Reserved locale routes must return the correct non-indexable response until the locale is approved and complete.
- Metadata, canonicals, sitemap, robots directives, structured data, internal links, redirects, and analytics must agree.
- Structured data must represent visible and verified content only.

`HREFLANG_CANONICAL.md` is the normative source for canonical-host and locale-link behavior.

## Testing and Quality Gates

Every pull request must run the checks relevant to its change. A production release normally requires:

- formatting, lint, and strict type checks;
- unit, component, integration, and critical end-to-end tests;
- successful production build;
- content, route, and internal-link validation;
- keyboard and WCAG 2.2 AA review;
- responsive QA on representative mobile, tablet, desktop, and wide screens;
- metadata, canonical, robots, sitemap, and structured-data validation;
- form validation, upload, failure, retry, privacy, and success-path testing;
- console, runtime, hydration, and broken-link checks;
- performance review for critical-rendering, font, image, script, or bundle changes.

A successful build alone does not prove visual, interaction, accessibility, SEO, performance, or form quality.

## Deployment

The approved direction is:

- GitHub for source control;
- GitHub Actions for CI;
- Cloudflare Workers preview/staging flow as defined in `DEPLOYMENT_ARCHITECTURE.md`;
- Cloudflare Workers + Static Assets production deployment from the protected production branch via Wrangler/vinext;
- Cloudflare for DNS, runtime hosting, and approved edge-security controls.

Deployment rules:

- Preview must use test or disabled integrations.
- Production secrets belong in protected deployment configuration, never Git.
- Deploy only from a reproducible frozen lockfile.
- Run `PRE_DEPLOY_CHECKLIST.md` before production promotion.
- Run `POST_DEPLOY_CHECKLIST.md` against the live canonical domain immediately after release.
- Roll back or disable the affected feature when a critical security, privacy, inquiry-delivery, indexing, or availability issue is detected.

See `DEPLOYMENT_ARCHITECTURE.md` for environments, ownership, rollback, and release controls.

## Change Management

- Keep commits focused and explain intent.
- Preserve unrelated user changes and repository history.
- Do not use destructive Git operations without explicit authorization.
- Record architectural and product decisions in `DECISIONS.md`.
- Track planned work and dependencies in `TASKS.md`.
- Update `CHANGELOG.md` for user-visible, operational, security, or architectural changes according to its policy.
- Update specifications and implementation together when an approved decision changes a contract.
- Never edit a specification merely to make non-compliant code appear compliant.

## Source-of-Truth Order

When instructions conflict, apply this precedence:

1. the user's latest explicit instruction;
2. legal, security, privacy, and safety requirements;
3. `CLAUDE.md`;
4. approved specifications and dated decisions;
5. executable tests and repository contracts;
6. established repository conventions;
7. general engineering conventions.

A newer approved entry in `DECISIONS.md` overrides an older specification only when it explicitly identifies the superseded decision or section.

## Documentation Index

### Governance

- `CLAUDE.md` — Claude Code operating instructions
- `README.md` — project entry point and quick-start guide
- `DEVELOPMENT_RULES.md` — development workflow and guardrails
- `CODING_STANDARDS.md` — implementation standards
- `DO_NOT_CHANGE.md` — protected files, assets, and decisions
- `TASKS.md` — backlog, dependencies, and delivery status
- `DECISIONS.md` — architecture and design decision log
- `CHANGELOG.md` — release and change history

### Product, brand, and design

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

### Information architecture and pages

- `SITEMAP.md`
- `INFORMATION_ARCHITECTURE.md`
- `ROUTES.md`
- `PAGE_SPECIFICATIONS.md`
- `HOMEPAGE_SPEC.md`
- `HEADER_NAVIGATION_SPEC.md`
- `FOOTER_SPEC.md`

### Content and media

- `CONTENT_STRATEGY.md`
- `CONTENT_MODEL.md`
- `COPY_GUIDELINES.md`
- `CTA_STRATEGY.md`
- `MEDIA_GUIDELINES.md`

### SEO

- `SEO_STRATEGY.md`
- `SEO_KEYWORD_MAP.md`
- `SEO_PAGE_MAP.md`
- `METADATA_SPEC.md`
- `STRUCTURED_DATA.md`
- `INTERNAL_LINKING.md`
- `REDIRECTS.md`
- `SITEMAP_ROBOTS_SPEC.md`

### Engineering, data, and integrations

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
- `ENVIRONMENT_VARIABLES.md`

### Performance, localization, QA, and release

- `PERFORMANCE_GUIDELINES.md`
- `IMAGE_OPTIMIZATION.md`
- `FONT_STRATEGY.md`
- `CACHING_STRATEGY.md`
- `LOCALIZATION.md`
- `LOCALE_CONTENT_STRUCTURE.md`
- `HREFLANG_CANONICAL.md`
- `TESTING_STRATEGY.md`
- `QA_CHECKLIST.md`
- `SEO_QA_CHECKLIST.md`
- `RESPONSIVE_QA.md`
- `ACCESSIBILITY_QA.md`
- `PRE_DEPLOY_CHECKLIST.md`
- `POST_DEPLOY_CHECKLIST.md`
- `DEPLOYMENT_ARCHITECTURE.md`

## Project Ownership

- **Brand:** Ahan Asa | آهن آسا
- **Owner:** Cyan Sanat Iranian Co. LTD
- **Domain:** `ahanassa.com`
- **Canonical origin:** `https://www.ahanassa.com`
- **Primary market:** Iran
- **Future market readiness:** Iraq, Oman, and selected GCC markets only after formal approval and operational verification

## License and Confidentiality

This is a proprietary project. Source code, brand assets, procurement workflows, inquiry data, commercial documents, credentials, and non-public specifications must not be copied, published, or shared without authorization from the project owner.

Uploaded invoices, BOMs, material lists, quotations, contact details, and project records are confidential business data and must be handled according to the project's privacy, security, retention, and access-control policies.

---

For implementation work, start with `CLAUDE.md`, then read only the specifications that materially govern the requested task. For product intent, begin with `PROJECT_BRIEF.md`; for the technical baseline, begin with `STACK.md` and `TECHNICAL_ARCHITECTURE.md`.
