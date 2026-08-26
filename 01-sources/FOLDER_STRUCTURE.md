# Ahan Asa Website — Folder Structure

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `FOLDER_STRUCTURE.md`  
> **Status:** Draft v1.0 — Repository organization contract  
> **Last updated:** 2026-08-25  
> **Launch experience:** Persian (`fa`), fully RTL  
> **Application model:** Next.js App Router, TypeScript, server-first, static-first where practical

---

## 1. Purpose

This document defines the official repository and source-code folder structure for the Ahan Asa website. It converts the approved route, content, component, media, SEO, security, and operational requirements into a predictable physical organization that Claude Code and human developers can follow.

The structure is designed to:

- keep public pages, reusable UI, business features, content, and server-only operations separate;
- preserve the public URL contract in `ROUTES.md` without coupling it to arbitrary implementation details;
- make Persian RTL the complete Phase 1 experience while remaining ready for approved future locales;
- keep indexable content compatible with static generation or server rendering;
- prevent confidential inquiries, customer information, supplier information, and uploaded documents from entering client bundles or public assets;
- support reusable, accessible, testable components without creating a generic or over-engineered component framework;
- make SEO, structured data, analytics, routes, and media metadata centralized and auditable;
- give Claude Code explicit placement and dependency rules;
- allow future CMS, CRM, storage, and localization integrations without creating inactive production features now.

This document defines **where code and assets belong**. It does not choose unresolved vendors, invent product categories, activate future languages, approve uploads, or authorize new public routes.

---

## 2. Source-of-Truth Order

Folder decisions must respect the following hierarchy:

1. Explicit owner decisions recorded in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `TECHNICAL_ARCHITECTURE.md`
4. `STACK.md`
5. `ROUTES.md`
6. `CONTENT_MODEL.md`
7. `UI_COMPONENTS.md`
8. `MEDIA_GUIDELINES.md`
9. This `FOLDER_STRUCTURE.md`
10. Feature-specific specifications and implementation details

If an existing approved repository already contains production code, this structure is a target contract—not permission for an uncontrolled repository-wide move. A material migration must be planned, tested, and recorded before paths are changed.

Claude Code must stop and report a conflict when moving a file would change:

- a public URL;
- canonical or hreflang behavior;
- server/client boundaries;
- content ownership;
- confidential-data handling;
- import direction;
- a stable component API;
- a deployment or integration contract.

---

## 3. Architectural Principles

### 3.1 Route files stay thin

Files inside `src/app/` coordinate Next.js routing, metadata, rendering mode, error states, and page composition. They must not become repositories for business logic, large content objects, raw queries, or repeated visual markup.

### 3.2 Server-first by default

Components and feature modules are server-compatible by default. Add `"use client"` only at the smallest boundary that genuinely requires browser state, event handling, focus management, measurement, or a browser-only API.

### 3.3 Static-first public content

Approved public content must remain compatible with static generation or server rendering. Core Persian copy, metadata, breadcrumbs, structured data, and internal links must not depend on client-side JavaScript to appear.

### 3.4 Confidential data is server-only

Inquiries, contact details, invoices, bills of quantities, purchase lists, supplier offers, quotations, uploaded documents, consent records, and internal status data belong only in server-side systems and private storage.

### 3.5 Business features do not leak into primitives

Generic primitives such as `Button`, `Input`, and `Container` must not import procurement content, route pages, inquiry services, or Ahan Asa-specific records. Business-aware patterns compose primitives, never the reverse.

### 3.6 One source for repeated facts

Routes, contact channels, organization details, locale configuration, media records, content entities, and schema facts must be defined centrally. Do not duplicate them as literals across pages.

### 3.7 Public assets are publication outputs

Only approved, optimized, non-confidential derivatives belong in `public/`. Working files, source photography, unredacted documents, licenses, and confidential originals do not.

### 3.8 Phase 1 stays honest

Reserved folders may be documented, but Claude Code must not publish empty languages, fake projects, assumed material categories, request tracking, a CMS integration, provider webhooks, or an upload flow before approval.

---

## 4. Approved Repository Tree

The following is the target structure. Entries marked **conditional** are created only when their corresponding capability is approved.

```text
ahan-asa-website/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── pull_request_template.md
│   └── workflows/
│       ├── ci.yml
│       └── quality.yml
│
├── docs/
│   ├── 00-governance/
│   ├── 10-brand-design/
│   ├── 20-content-pages/
│   ├── 30-seo/
│   ├── 40-architecture/
│   ├── 50-quality-release/
│   └── archive/
│
├── public/
│   ├── media/
│   │   ├── brand/
│   │   │   ├── logos/
│   │   │   └── favicons/
│   │   ├── images/
│   │   │   ├── home/
│   │   │   ├── process/
│   │   │   ├── procurement/
│   │   │   ├── products/
│   │   │   ├── industries/
│   │   │   ├── cases/
│   │   │   ├── team/
│   │   │   ├── insights/
│   │   │   └── shared/
│   │   ├── video/
│   │   │   ├── files/
│   │   │   ├── posters/
│   │   │   └── captions/
│   │   ├── diagrams/
│   │   ├── social/
│   │   └── downloads/
│   └── fonts/
│
├── scripts/
│   ├── validate-content.ts
│   ├── validate-media.ts
│   ├── validate-routes.ts
│   ├── validate-structured-data.ts
│   ├── check-internal-links.ts
│   └── generate-content-index.ts
│
├── src/
│   ├── app/
│   │   ├── (site)/
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   ├── procurement/
│   │   │   │   └── page.tsx
│   │   │   ├── procurement-process/
│   │   │   │   └── page.tsx
│   │   │   ├── steel-products/
│   │   │   │   ├── [categorySlug]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── industries/
│   │   │   │   ├── [industrySlug]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── [projectSlug]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── insights/
│   │   │   │   ├── [articleSlug]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── resources/
│   │   │   │   ├── [resourceSlug]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── faq/
│   │   │   │   └── page.tsx
│   │   │   ├── contact/
│   │   │   │   └── page.tsx
│   │   │   ├── privacy/
│   │   │   │   └── page.tsx
│   │   │   ├── terms/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── request/
│   │   │   ├── confirmation/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   └── route.ts
│   │   │   ├── inquiries/
│   │   │   │   └── route.ts
│   │   │   ├── uploads/                 # conditional
│   │   │   │   └── route.ts             # conditional
│   │   │   ├── revalidate/              # reserved; do not create before CMS approval
│   │   │   └── webhooks/                # reserved; provider routes need approval
│   │   │
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── global.css
│   │   ├── icon.tsx
│   │   ├── layout.tsx
│   │   ├── manifest.ts
│   │   ├── not-found.tsx
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── navigation/
│   │   ├── patterns/
│   │   ├── media/
│   │   └── providers/
│   │
│   ├── config/
│   │   ├── analytics.ts
│   │   ├── env.client.ts
│   │   ├── env.server.ts
│   │   ├── locales.ts
│   │   ├── navigation.ts
│   │   ├── routes.ts
│   │   ├── site.ts
│   │   └── social.ts
│   │
│   ├── content/
│   │   ├── fa/
│   │   │   ├── pages/
│   │   │   ├── capabilities/
│   │   │   ├── process/
│   │   │   ├── materials/
│   │   │   ├── industries/
│   │   │   ├── projects/
│   │   │   ├── insights/
│   │   │   ├── resources/
│   │   │   ├── faq/
│   │   │   └── legal/
│   │   ├── registry/
│   │   │   ├── content-registry.ts
│   │   │   ├── media-registry.ts
│   │   │   └── taxonomy-registry.ts
│   │   ├── loaders/
│   │   └── types/
│   │
│   ├── features/
│   │   ├── inquiry/
│   │   ├── procurement/
│   │   ├── materials/
│   │   ├── industries/
│   │   ├── projects/
│   │   ├── insights/
│   │   ├── resources/
│   │   └── search/                       # conditional
│   │
│   ├── i18n/
│   │   ├── direction.ts
│   │   ├── formatters.ts
│   │   ├── locale-registry.ts
│   │   └── messages/
│   │       └── fa.json
│   │
│   ├── lib/
│   │   ├── analytics/
│   │   ├── accessibility/
│   │   ├── metadata/
│   │   ├── routing/
│   │   ├── schema/
│   │   ├── validation/
│   │   └── utils/
│   │
│   ├── server/
│   │   ├── analytics/
│   │   ├── anti-abuse/
│   │   ├── audit/
│   │   ├── inquiries/
│   │   ├── integrations/
│   │   │   ├── crm/                      # adapter only after provider approval
│   │   │   ├── notifications/
│   │   │   └── storage/
│   │   ├── observability/
│   │   ├── privacy/
│   │   └── uploads/                      # conditional
│   │
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── reset.css
│   │   ├── base.css
│   │   ├── utilities.css
│   │   └── print.css
│   │
│   ├── types/
│   │   ├── analytics.ts
│   │   ├── content.ts
│   │   ├── forms.ts
│   │   ├── media.ts
│   │   ├── routes.ts
│   │   └── seo.ts
│   │
│   └── test/
│       ├── factories/
│       ├── fixtures/
│       ├── mocks/
│       └── setup.ts
│
├── tests/
│   ├── accessibility/
│   ├── e2e/
│   ├── integration/
│   ├── seo/
│   └── visual/
│
├── assets-source/                        # non-public; preferably external/private
│   ├── brand/
│   ├── photography/
│   ├── video/
│   ├── diagrams/
│   └── documents/
│
├── .editorconfig
├── .env.example
├── .gitignore
├── CLAUDE.md
├── CHANGELOG.md
├── DECISIONS.md
├── DEVELOPMENT_RULES.md
├── README.md
├── next.config.ts
├── package.json
├── tsconfig.json
└── package-lock.json / pnpm-lock.yaml       # exactly one approved lockfile
```

### 4.1 Tree interpretation

- A directory shown in the tree is not automatically authorized for production use.
- Conditional and reserved directories must remain absent until their release conditions are satisfied.
- Empty directories must not be committed only to mirror this document.
- The selected package manager owns exactly one lockfile.
- Build output, dependency directories, local environment files, and test artifacts are never committed.

---

## 5. Root-Level Files

Root files exist only when they affect the entire repository or must be immediately visible to contributors and Claude Code.

| File | Purpose | Rule |
|---|---|---|
| `CLAUDE.md` | Primary Claude Code operating instructions | Must point to authoritative documents and protected areas |
| `README.md` | Setup, commands, architecture summary, and contribution entry point | Must not contain production secrets |
| `DEVELOPMENT_RULES.md` | Development behavior and code-change policy | Applies to all contributors |
| `DECISIONS.md` | Approved architectural and business decisions | Must record material choices and unresolved decisions |
| `CHANGELOG.md` | User-visible or architecture-relevant changes | Do not use as a raw commit dump |
| `.env.example` | Names and descriptions of required variables | Placeholder values only |
| `.gitignore` | Excludes secrets, builds, dependencies, local files, and private source assets | Must include `.env*` except `.env.example` |
| `next.config.ts` | Framework-wide settings | Keep redirects and headers centralized or generated from approved config |
| `tsconfig.json` | TypeScript and path alias rules | Strict mode required; avoid overly broad aliases |
| `package.json` | Scripts and approved dependencies | Dependencies require a real project need |

Project specifications belong under `docs/`, not scattered through application folders.

---

## 6. Documentation Structure

Recommended document placement:

```text
docs/
  00-governance/
    PROJECT_BRIEF.md
    TASKS.md
    DO_NOT_CHANGE.md
    CODING_STANDARDS.md
  10-brand-design/
    BRAND_GUIDELINES.md
    DESIGN_DIRECTION.md
    DESIGN_SYSTEM.md
    UI_COMPONENTS.md
    MOTION_GUIDELINES.md
    RESPONSIVE_RULES.md
    ACCESSIBILITY.md
    MEDIA_GUIDELINES.md
  20-content-pages/
    SITEMAP.md
    INFORMATION_ARCHITECTURE.md
    PAGE_SPECIFICATIONS.md
    HOMEPAGE_SPEC.md
    HEADER_NAVIGATION_SPEC.md
    FOOTER_SPEC.md
    CONTENT_STRATEGY.md
    CONTENT_MODEL.md
    COPY_GUIDELINES.md
    CTA_STRATEGY.md
  30-seo/
    SEO_STRATEGY.md
    SEO_KEYWORD_MAP.md
    SEO_PAGE_MAP.md
    METADATA_SPEC.md
    STRUCTURED_DATA.md
    INTERNAL_LINKING.md
    REDIRECTS.md
    SITEMAP_ROBOTS_SPEC.md
  40-architecture/
    TECHNICAL_ARCHITECTURE.md
    STACK.md
    FOLDER_STRUCTURE.md
    COMPONENT_ARCHITECTURE.md
    DATA_ARCHITECTURE.md
    CMS_ARCHITECTURE.md
    API_INTEGRATIONS.md
    FORM_ARCHITECTURE.md
    ANALYTICS_TRACKING.md
    SECURITY_GUIDELINES.md
    PERFORMANCE_GUIDELINES.md
    IMAGE_OPTIMIZATION.md
    FONT_STRATEGY.md
    CACHING_STRATEGY.md
    DEPLOYMENT_ARCHITECTURE.md
    ENVIRONMENT_VARIABLES.md
    LOCALIZATION.md
    LOCALE_CONTENT_STRUCTURE.md
    HREFLANG_CANONICAL.md
  50-quality-release/
    TESTING_STRATEGY.md
    QA_CHECKLIST.md
    SEO_QA_CHECKLIST.md
    RESPONSIVE_QA.md
    ACCESSIBILITY_QA.md
    PRE_DEPLOY_CHECKLIST.md
    POST_DEPLOY_CHECKLIST.md
```

Rules:

- The numeric prefixes establish reading order without renaming the approved document files.
- Root `CLAUDE.md`, `README.md`, `DECISIONS.md`, `CHANGELOG.md`, and `DEVELOPMENT_RULES.md` remain at root because they govern everyday work.
- Superseded documents move to `docs/archive/` with a date and replacement reference; they are not silently overwritten or left beside active copies.
- Code must not import Markdown specifications at runtime.
- Moving existing documents into this structure requires one recorded documentation migration, with all links updated in the same change.

---

## 7. App Router Structure

### 7.1 Route group policy

`src/app/(site)/` is a route group. Parentheses organize the code without appearing in the public URL. It owns the public marketing and editorial shell.

`src/app/request/` sits outside `(site)` so the conversion experience may use a more focused layout, error handling, and noindex policy without weakening the public shell.

API route handlers live only under `src/app/api/`.

### 7.2 Public route mapping

| Public URL | App Router file | Status |
|---|---|---|
| `/` | `src/app/(site)/page.tsx` | Launch |
| `/about` | `src/app/(site)/about/page.tsx` | Launch |
| `/procurement` | `src/app/(site)/procurement/page.tsx` | Launch |
| `/procurement-process` | `src/app/(site)/procurement-process/page.tsx` | Launch |
| `/steel-products` | `src/app/(site)/steel-products/page.tsx` | Launch |
| `/steel-products/[category-slug]` | `src/app/(site)/steel-products/[categorySlug]/page.tsx` | Conditional records only |
| `/industries` | `src/app/(site)/industries/page.tsx` | Launch when substantive |
| `/industries/[industry-slug]` | `src/app/(site)/industries/[industrySlug]/page.tsx` | Conditional records only |
| `/projects` | `src/app/(site)/projects/page.tsx` | Launch only with substantive evidence or methodology |
| `/projects/[project-slug]` | `src/app/(site)/projects/[projectSlug]/page.tsx` | Verified records only |
| `/insights` | `src/app/(site)/insights/page.tsx` | Launch |
| `/insights/[article-slug]` | `src/app/(site)/insights/[articleSlug]/page.tsx` | Published records only |
| `/resources` | `src/app/(site)/resources/page.tsx` | Launch |
| `/resources/[resource-slug]` | `src/app/(site)/resources/[resourceSlug]/page.tsx` | Approved resources only |
| `/faq` | `src/app/(site)/faq/page.tsx` | Launch |
| `/contact` | `src/app/(site)/contact/page.tsx` | Launch |
| `/privacy` | `src/app/(site)/privacy/page.tsx` | Launch after legal approval |
| `/terms` | `src/app/(site)/terms/page.tsx` | Conditional |
| `/request` | `src/app/request/page.tsx` | Launch, noindex-follow |
| `/request/confirmation` | `src/app/request/confirmation/page.tsx` | Internal, noindex-nofollow |

The route parameter uses idiomatic TypeScript camelCase inside code while the generated public slug remains kebab-case.

### 7.3 Route file contract

A public `page.tsx` may:

- resolve an approved content record;
- call `generateMetadata` through centralized metadata helpers;
- declare static parameters for published dynamic records;
- return `notFound()` for missing, draft, restricted, or unavailable content;
- compose an approved page template or feature view;
- emit page-specific structured data through the approved schema layer.

A public `page.tsx` must not:

- contain a full page's production copy inline;
- call confidential integrations directly;
- query private records for public rendering;
- recreate navigation, breadcrumbs, or metadata rules;
- use client fetching for indexable core content;
- add a public route not present in `ROUTES.md`;
- publish placeholders for conditional records.

### 7.4 Special files

| File | Responsibility |
|---|---|
| `src/app/layout.tsx` | Root HTML, `lang="fa"`, `dir="rtl"`, global providers, fonts, and site-wide metadata defaults |
| `src/app/(site)/layout.tsx` | Header, main landmark, footer, persistent approved CTA, and public shell |
| `src/app/not-found.tsx` | Genuine Persian 404 recovery page |
| `src/app/error.tsx` | Recoverable segment error boundary; client boundary kept minimal |
| `src/app/global-error.tsx` | Minimal fatal fallback without sensitive diagnostics |
| `src/app/robots.ts` | Robots output derived from environment and route policy |
| `src/app/sitemap.ts` | Published, canonical, indexable records only |
| `src/app/manifest.ts` | Approved web app metadata; not an authorization for PWA complexity |
| `src/app/icon.tsx` | Approved brand favicon/app icon generation |

---

## 8. Component Structure

The approved component groups are:

```text
src/components/
  ui/          # reusable primitives
  layout/      # direction-safe layout foundations
  forms/       # shared form controls and states
  navigation/  # global and contextual navigation
  patterns/    # reusable Ahan Asa experience patterns
  media/       # approved media presentation
  providers/   # minimal top-level client contexts
```

### 8.1 `components/ui/`

Examples: `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Alert`, `Spinner`, `VisuallyHidden`.

Rules:

- no business-specific copy;
- no imports from `features/`, `content/`, `server/`, or `app/`;
- use semantic tokens, logical properties, and native semantics;
- public APIs are typed and intentionally small.

### 8.2 `components/layout/`

Examples: `Container`, `Section`, `Stack`, `Cluster`, `Grid`, `Divider`.

Layout components express reusable spatial relationships, not Ahan Asa business sections.

### 8.3 `components/forms/`

Examples: `FormField`, `PhoneField`, `FileUpload`, `ErrorSummary`, `ConsentField`, `SubmitButton`.

The business-specific inquiry orchestration belongs in `features/inquiry/`, while accessible shared form behavior stays here.

### 8.4 `components/navigation/`

Examples: `SiteHeader`, `PrimaryNavigation`, `MobileNavigation`, `Breadcrumb`, `FooterNavigation`, `SkipLink`.

Navigation values come from `src/config/navigation.ts` and the route manifest. Components must not define independent path literals.

### 8.5 `components/patterns/`

Examples: `PageHero`, `ProcurementProcess`, `EvidenceCard`, `RiskControlPanel`, `CtaBand`, `RelatedContent`, `FAQSection`.

Patterns may understand approved Ahan Asa content shapes but must not contain unverified production facts.

### 8.6 `components/media/`

Examples: `ResponsiveImage`, `Figure`, `VideoEmbed`, `DocumentLink`, `MediaCaption`, `DirectionalValue`.

Media components resolve approved records and preserve alt text, dimensions, captions, truth classification, performance, and reduced-motion behavior.

### 8.7 Component colocation

Use a component folder when the component owns multiple related files:

```text
Button/
  Button.tsx
  Button.module.css
  Button.test.tsx
  Button.types.ts
  index.ts
```

For a simple component, a single `Button.tsx` plus a local test is acceptable. Do not create a folder merely to hold one trivial file.

One canonical export path must exist for every public shared component. Avoid a repository-wide barrel that hides circular imports or includes server-only modules in client bundles.

---

## 9. Feature Structure

`src/features/` owns cohesive business capabilities. A feature may combine components, public data selectors, validation, view models, and actions that belong to one user task.

Recommended internal feature shape:

```text
src/features/inquiry/
  components/
    InquiryForm.tsx
    InquirySuccess.tsx
  actions/
    submitInquiry.ts
  schemas/
    inquiryInput.ts
  mappers/
    mapInquiryInput.ts
  analytics/
    inquiryEvents.ts
  types.ts
  index.ts
```

Rules:

- feature client code may call an approved route handler or server action, but may not import databases, credentials, private storage, or provider SDKs;
- provider-specific implementation stays under `src/server/integrations/`;
- feature code may import `components/`, `config/`, `lib/`, `types/`, and approved public content;
- one feature must not import another feature's private internal files;
- shared behavior used by several features moves downward only after the reuse is real.

Do not create a `common/`, `misc/`, or `helpers/` dumping ground.

---

## 10. Content Structure

### 10.1 Phase 1 public content

Persian public content lives under `src/content/fa/`. This does not imply that every entity is automatically published.

```text
src/content/fa/
  pages/
    home.ts
    about.ts
    procurement.ts
    procurement-process.ts
    contact.ts
  capabilities/
  process/
  materials/
  industries/
  projects/
  insights/
  resources/
  faq/
  legal/
```

The exact source format—TypeScript, JSON, MDX, or an approved CMS adapter—must be selected in the content and CMS architecture. The logical grouping remains the same.

### 10.2 Content registry

`src/content/registry/` provides the stable lookup layer between route keys and content records.

- `content-registry.ts` resolves published entities by stable ID, locale, type, and slug.
- `media-registry.ts` resolves approved public media metadata.
- `taxonomy-registry.ts` resolves controlled tags and relationships.

Route code must resolve records through the registry or an approved repository interface, not by directly scanning arbitrary files.

### 10.3 Publication rules

Only records that pass publication, approval, evidence, privacy, route, metadata, and media validation may enter a production build.

Content folders must never contain:

- customer contact records;
- inquiry submissions;
- unredacted invoices or bills of quantities;
- supplier offers or quotations;
- private project documents;
- secrets or integration values;
- fabricated placeholder records.

### 10.4 Future CMS boundary

If a CMS is approved, keep the public content interface stable:

```text
src/content/loaders/
  static-content-loader.ts
  cms-content-loader.ts     # only after approval
```

Page and component code must consume typed domain records, not provider-specific CMS response objects.

---

## 11. Localization and Direction

### 11.1 Phase 1

- Persian is the only active locale.
- The canonical Persian site is unprefixed.
- Root HTML uses `lang="fa"` and `dir="rtl"`.
- UI messages live in `src/i18n/messages/fa.json` only when they are interface strings rather than editorial content.
- Editorial and SEO content lives in `src/content/fa/`.

### 11.2 Future locales

Do not create empty `en/` or `ar/` content trees, locale navigation, hreflang entries, or placeholder pages.

When another locale is approved:

1. record the localization decision;
2. choose the approved App Router locale strategy;
3. add complete locale content and UI messages;
4. add locale-aware route resolution;
5. verify direction, canonical, reciprocal hreflang, sitemap, analytics, and fallbacks;
6. keep Persian unprefixed and redirect `/fa/**` to its canonical unprefixed equivalent.

`src/i18n/locale-registry.ts` may define the supported-locale type, but it must not mark an incomplete locale as active.

---

## 12. Configuration Structure

`src/config/` contains validated, application-wide public contracts.

| File | Responsibility |
|---|---|
| `site.ts` | Canonical origin, verified organization basics, default locale, brand identifiers |
| `routes.ts` | Typed route manifest and stable page keys |
| `navigation.ts` | Header, mobile, footer, contextual, and CTA navigation derived from approved routes |
| `locales.ts` | Active and reserved locale configuration |
| `social.ts` | Approved social profiles only |
| `analytics.ts` | Non-secret event names and consent-aware public settings |
| `env.client.ts` | Validated allowlist of browser-safe variables |
| `env.server.ts` | Validated server-only variables; must import `server-only` |

Configuration must not become a substitute for structured content. Long Persian copy does not belong in `config/`.

### 12.1 Route manifest placement

The typed route manifest belongs in `src/config/routes.ts` and must contain stable values such as:

- route key;
- path or path builder;
- status;
- indexability;
- sitemap eligibility;
- navigation role;
- locale support;
- canonical behavior.

Pages, navigation, breadcrumbs, sitemap generation, metadata, and internal links must consume this contract.

---

## 13. Shared Library Structure

`src/lib/` contains low-level, reusable, business-neutral application capabilities.

```text
src/lib/
  accessibility/   # focus, announcements, direction helpers
  analytics/       # privacy-safe event utilities
  metadata/        # canonical, OG, robots, alternates
  routing/         # slug and path utilities
  schema/          # JSON-LD builders and sanitization
  validation/      # reusable validation primitives
  utils/           # narrow pure utilities only
```

Rules:

- `lib/` must not import `app/` or feature-private modules;
- provider SDK wrappers do not belong in `lib/`;
- generic names are acceptable only when the module has a narrow documented responsibility;
- a utility must be pure unless its side effects are explicit in its name and contract;
- structured-data builders accept verified typed inputs and must not invent missing facts.

---

## 14. Server-Only Structure

`src/server/` is the protected boundary for confidential operations and approved external systems.

```text
src/server/
  anti-abuse/
  audit/
  inquiries/
    create-inquiry.ts
    inquiry-repository.ts
    inquiry-service.ts
  integrations/
    crm/
    notifications/
    storage/
  observability/
  privacy/
  uploads/
```

### 14.1 Mandatory server rules

- Every public entry module under `src/server/` must enforce a server-only import boundary.
- Client components must never import from `src/server/` directly or indirectly.
- Secrets are read only through `src/config/env.server.ts`.
- Provider payloads are mapped to internal types at the adapter boundary.
- Logs must exclude PII, document contents, supplier-sensitive data, raw tokens, and secrets.
- Public errors remain generic; protected diagnostics retain only the minimum necessary detail.
- No provider folder is created until the provider is approved.
- No upload code is created until file types, limits, scanning, storage, retention, consent, and access policies are approved.

### 14.2 Inquiry flow boundary

The intended dependency flow is:

```text
request page
  → inquiry feature
    → validated server action or /api/inquiries
      → inquiry service
        → anti-abuse and consent checks
          → approved repository/integration adapters
```

Route handlers validate the transport request. The service layer applies business rules. Integration adapters translate to external systems. No layer skips the one below it to call a provider directly.

---

## 15. API Route Structure

| Endpoint | Folder | Creation rule |
|---|---|---|
| `POST /api/inquiries` | `src/app/api/inquiries/route.ts` | Required for the approved inquiry flow unless an approved server-action architecture replaces it |
| `POST /api/uploads` | `src/app/api/uploads/route.ts` | Conditional; omit until upload governance is approved |
| `GET /api/health` | `src/app/api/health/route.ts` | Minimal status only; no sensitive diagnostics |
| `POST /api/revalidate` | `src/app/api/revalidate/route.ts` | Reserved; create only with an approved CMS and authentication design |
| Provider webhook | `src/app/api/webhooks/[provider]/route.ts` | Reserved; provider name and verification require approval |

An API route handler should normally contain only:

1. method and content-type checks;
2. input parsing and schema validation;
3. authentication, authorization, or anti-abuse checks where relevant;
4. a call to a server service;
5. a minimized public response;
6. safe error translation.

---

## 16. Media and Public Asset Structure

### 16.1 Public derivatives

`public/media/` contains only files safe for unrestricted browser access.

```text
public/media/
  brand/logos/
  brand/favicons/
  images/home/
  images/process/
  images/procurement/
  images/products/
  images/industries/
  images/cases/
  images/team/
  images/insights/
  images/shared/
  video/files/
  video/posters/
  video/captions/
  diagrams/
  social/
  downloads/
```

### 16.2 Source assets

`assets-source/` is non-public. It may be stored outside the code repository when originals are large, licensed, sensitive, or difficult to reproduce.

Never place the following in `public/`:

- editable master logo files not intended for public download;
- unredacted documents;
- original customer or supplier files;
- unapproved project photography;
- license documents;
- rejected or restricted media;
- full-resolution masters retained only for production;
- a file whose public-disclosure status is unknown.

### 16.3 Asset naming

Use lowercase ASCII kebab-case with a stable subject and role:

```text
ahan-asa-logo-horizontal-navy.svg
procurement-document-review-hero-1600.webp
steel-marking-inspection-detail-01.webp
procurement-process-overview-fa.svg
```

Do not use opaque camera names, spaces, Persian filenames, final-final suffixes, timestamps, or confidential project identifiers in public paths.

### 16.4 No duplication

A shared binary belongs in `images/shared/` or an appropriate global folder and is referenced through the media registry. Do not copy the same asset into several route folders to simplify imports.

---

## 17. Styling Structure

Global foundations live in `src/styles/`:

| File | Purpose |
|---|---|
| `tokens.css` | Approved `--aa-*` primitive and semantic tokens |
| `reset.css` | Minimal predictable browser normalization |
| `base.css` | Global document typography, surfaces, links, and RTL defaults |
| `utilities.css` | Small approved utilities only |
| `print.css` | Useful print behavior for guides and documents |

`src/app/global.css` imports these files in the approved order and contains no feature-specific styling.

Component-specific styles stay next to the component when CSS Modules or another approved scoped strategy is used.

Rules:

- no page-specific rules in global styles;
- no raw brand values repeated across components;
- no physical directional properties where logical properties work;
- no arbitrary token creation inside feature files;
- no global selectors that reach into a component's private DOM structure;
- no inline style objects for routine design-system styling.

---

## 18. Types and Validation

### 18.1 Type placement

- component-private types stay with the component;
- feature-private types stay with the feature;
- public cross-feature types live in `src/types/`;
- content contracts live in `src/content/types/` when specific to the content repository;
- input validation schemas stay close to the boundary that uses them;
- provider DTOs stay inside the provider adapter.

### 18.2 Type rules

- no production `any` for content, inquiry, route, metadata, media, or integration data;
- do not duplicate an existing domain type under another name;
- do not expose provider response types beyond the adapter;
- derive types from validation schemas only when the result remains readable and stable;
- public and confidential models must remain distinct even when they share some fields.

---

## 19. Tests

### 19.1 Colocated tests

Unit tests for a component or pure module should normally stay beside the source:

```text
Button.tsx
Button.test.tsx
```

### 19.2 Repository-level tests

```text
tests/
  accessibility/   # automated and scripted accessibility checks
  e2e/             # critical browser journeys
  integration/     # route, server service, and adapter contracts
  seo/             # metadata, canonical, sitemap, robots, schema
  visual/          # approved responsive visual baselines
```

### 19.3 Fixture safety

Fixtures must be synthetic and unmistakably fictional. Never copy real customer names, phone numbers, invoices, documents, supplier offers, tokens, or production payloads into the repository.

At minimum, tests must cover:

- typed route manifest integrity;
- unknown dynamic records returning `404`;
- draft and restricted content not publishing;
- Persian `lang` and RTL direction;
- canonical and robots policy;
- sitemap exclusions;
- inquiry validation and safe failures;
- client bundles not importing server-only modules;
- media registry integrity;
- accessibility of navigation and forms.

---

## 20. Scripts

Scripts automate repeatable checks; they must not silently rewrite approved production content.

| Script | Responsibility |
|---|---|
| `validate-content.ts` | Required fields, publication state, privacy class, references, and placeholders |
| `validate-media.ts` | Registry entries, dimensions, alt text, approval status, and file existence |
| `validate-routes.ts` | Duplicate paths, route status, dynamic record coverage, and path format |
| `validate-structured-data.ts` | Allowed schema types and required verified fields |
| `check-internal-links.ts` | Broken, redirected, prohibited, or unpublished internal targets |
| `generate-content-index.ts` | Deterministic public index generation when required |

Scripts that mutate files must support a dry-run mode and clearly report changed paths.

---

## 21. Import Direction

Allowed dependency direction:

```text
app
  → features
    → components
      → styles / low-level lib / shared types

app and route handlers
  → server services
    → server integrations

app / features
  → content registry
    → content loaders
```

Forbidden directions:

```text
components/ui       → features
components          → app
content             → app
lib                 → app
client component    → server
server integration  → page component
provider adapter    → public UI
```

### 21.1 Path aliases

Use a small, predictable alias set:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

One root alias is preferable to many overlapping aliases. Relative imports are acceptable within a local component or feature folder; use `@/` when crossing architectural areas.

---

## 22. File Naming Rules

| Item | Convention | Example |
|---|---|---|
| React component | PascalCase | `EvidenceCard.tsx` |
| Hook | camelCase with `use` | `useInquiryProgress.ts` |
| Utility/module | kebab-case or established lowercase convention | `normalize-phone.ts` |
| Type-only module | descriptive lowercase | `routes.ts` |
| App Router segment | kebab-case | `procurement-process/` |
| Dynamic segment | camelCase in brackets | `[articleSlug]/` |
| Test | source name + `.test` | `Button.test.tsx` |
| E2E specification | journey + `.spec` | `submit-inquiry.spec.ts` |
| CSS Module | component name + `.module.css` | `Button.module.css` |
| Public asset | lowercase kebab-case | `steel-inspection-detail.webp` |
| Content slug | lowercase Latin kebab-case | `purchase-list-review` |

Avoid:

- `index.tsx` as the primary component implementation;
- generic files such as `utils2.ts`, `data.ts`, `helpers.ts`, or `temp.ts`;
- numbered components such as `Section3.tsx`;
- appearance-only names such as `BlueBox.tsx`;
- abbreviations that obscure business meaning;
- Persian or mixed-direction source filenames.

---

## 23. Environment and Secret Files

Allowed committed file:

```text
.env.example
```

Never commit:

```text
.env
.env.local
.env.production
.env.preview
*.pem
*.key
credentials*.json
```

`env.client.ts` exposes only an explicit allowlist of browser-safe values. A `NEXT_PUBLIC_*` prefix is not sufficient evidence that a value is safe.

`env.server.ts` validates required server variables and must never be imported by a client component. Real phone numbers, emails, legal identifiers, canonical hosts, and public profiles should be sourced through verified site configuration or content—not duplicated across environment files without reason.

---

## 24. Generated and Ignored Directories

The following are generated or local and must not be treated as source:

```text
.next/
node_modules/
coverage/
playwright-report/
test-results/
storybook-static/        # only if Storybook is approved
dist/
out/
.vercel/
*.tsbuildinfo
```

Do not edit generated output to fix a source problem. Do not ask Claude Code to inspect or refactor dependency or build directories unless diagnosing a specific failure.

---

## 25. Reserved and Prohibited Structures

### 25.1 Reserved until approval

- `src/app/[locale]/` or another locale route tree;
- `src/content/en/` and `src/content/ar/`;
- `src/app/api/uploads/`;
- `src/server/uploads/`;
- `src/app/api/revalidate/`;
- `src/app/api/webhooks/[provider]/`;
- provider-specific CMS, CRM, storage, notification, or analytics adapters;
- request-status or tracking routes;
- authenticated account, supplier, or customer portal areas.

### 25.2 Prohibited in Phase 1

```text
src/app/shop/
src/app/cart/
src/app/checkout/
src/app/prices/
src/app/daily-prices/
src/app/marketplace/
src/app/account/
src/app/supplier-portal/
```

These structures would incorrectly position Ahan Asa as a retailer, live price board, or marketplace and require a recorded scope change.

---

## 26. Claude Code Placement Rules

Before creating or moving a file, Claude Code must answer:

1. Is this file part of routing, UI, a business feature, public content, shared infrastructure, or a server-only operation?
2. Does an approved folder already own that responsibility?
3. Will the import direction remain valid?
4. Could the file expose confidential data or secrets to the browser?
5. Does the change create or alter a public URL?
6. Is the capability launch, conditional, reserved, or prohibited?
7. Is the content verified and approved for publication?
8. Does a canonical reusable implementation already exist?

Claude Code must:

- inspect the nearest existing structure before creating a parallel folder;
- preserve route paths defined in `ROUTES.md`;
- keep route files thin;
- keep `"use client"` boundaries narrow;
- place provider code behind server adapters;
- colocate component tests and styles where practical;
- update imports, tests, documentation, and ownership references in the same change when moving files;
- record material architecture changes in `DECISIONS.md` and user-visible changes in `CHANGELOG.md`;
- leave unrelated user changes untouched.

Claude Code must not:

- create `common/`, `shared2/`, `new-components/`, or duplicate architecture trees;
- move many files solely for aesthetic consistency;
- invent future locale folders or translated content;
- add a CMS or external provider folder before approval;
- store production content inside JSX when a content record should own it;
- import `src/server/` into a client graph;
- put confidential or unapproved documents in `public/`;
- convert a conditional route into a published placeholder;
- hardcode navigation paths outside the route manifest;
- create a new public page because a component or folder name suggests one.

---

## 27. Change and Migration Policy

A structural move is material when it changes more than local file placement or affects a public contract.

For a material migration:

1. document the reason and target structure;
2. list affected routes, imports, tests, build scripts, content loaders, and deployment behavior;
3. move one coherent architectural area at a time;
4. preserve public URLs and content identity;
5. run type, lint, unit, integration, route, SEO, and production-build checks;
6. verify no server-only module entered the client bundle;
7. update `README.md`, `CLAUDE.md`, and architecture documents;
8. record the decision and migration result.

Do not combine a large structural migration with unrelated design, copy, or feature changes.

---

## 28. Release Validation

The structure passes release review only when:

- every public route maps to `ROUTES.md`;
- Persian remains the unprefixed default experience;
- the root document outputs `lang="fa"` and `dir="rtl"`;
- dynamic routes generate only approved published records;
- missing, draft, or restricted records return genuine `404` behavior;
- route files contain composition rather than large content or business logic;
- client components do not import server-only modules;
- public assets are optimized and approved;
- confidential records and uploads are absent from public/static folders;
- the route manifest drives navigation, canonicals, sitemap, and internal links;
- API endpoints follow their launch, conditional, internal, or reserved status;
- tests use synthetic data only;
- exactly one lockfile exists;
- no secret or local environment file is tracked;
- documentation links resolve after any move;
- the production build, type check, lint, and required tests pass.

---

## 29. Phase 1 Creation Order

Claude Code should create the implementation in this order:

1. Root configuration, strict TypeScript, linting, and environment validation
2. `src/styles/`, fonts, root layout, Persian language, and RTL direction
3. `src/config/site.ts`, `routes.ts`, `navigation.ts`, and locale registry
4. Core `components/ui/` and `components/layout/`
5. Header, navigation, footer, breadcrumbs, and public site shell
6. Public content types, Persian content repository, registries, and validators
7. Public route pages and page templates
8. Metadata, canonical, robots, sitemap, and structured-data infrastructure
9. Inquiry form UI and validation
10. Approved server-side inquiry service and `/api/inquiries`
11. Media registry, optimized production assets, and page media
12. Accessibility, SEO, integration, visual, and E2E tests
13. Conditional content routes only when their verified records exist
14. Uploads, CMS, webhooks, providers, and future locales only after separate approval

This sequence creates a usable, honest website foundation without allowing unresolved integrations or content to dictate the architecture.

---

## 30. Approval Checklist

This document becomes **Approved** when the project owner confirms:

- the repository uses a `src/` layout;
- the App Router route mapping matches the approved public route inventory;
- Persian is unprefixed in Phase 1;
- `(site)` and `request` use the intended shell separation;
- the component groups are approved;
- public content is organized under `src/content/fa/` until a CMS decision is made;
- route, navigation, site, environment, and locale configuration are centralized;
- confidential operations are isolated under `src/server/`;
- the `public/media/` and non-public `assets-source/` separation is accepted;
- conditional upload, CMS, webhook, provider, tracking, and locale folders remain absent until approved;
- documentation will be organized under `docs/` using the stated groups;
- the selected package manager and lockfile are recorded.

---

## 31. Open Decisions

The following decisions remain outside this document and must be resolved in their governing specifications:

| Decision | Owner document | Structural effect |
|---|---|---|
| Exact dependency and package versions | `STACK.md` | Config and package files |
| Final component file convention and styling implementation | `COMPONENT_ARCHITECTURE.md` | Colocation and component exports |
| Static files vs CMS | `CMS_ARCHITECTURE.md` | `content/loaders/` and revalidation |
| Inquiry persistence and CRM destination | `FORM_ARCHITECTURE.md`, `API_INTEGRATIONS.md` | `server/inquiries/` and adapters |
| Secure document-upload policy | `SECURITY_GUIDELINES.md`, `FORM_ARCHITECTURE.md` | Upload route, service, and private storage |
| Canonical apex vs `www` host | `HREFLANG_CANONICAL.md`, deployment decision | `config/site.ts` and redirects |
| Future locale priority and routing implementation | `LOCALIZATION.md` | Locale route and content trees |
| Approved material categories and industries | Content and owner decisions | Dynamic content records, not new route families |
| Verified project inventory | Content approval workflow | `content/fa/projects/` records |
| Hosting, CDN, and runtime details | `DEPLOYMENT_ARCHITECTURE.md` | Deployment config and workflows |
| Analytics provider and consent model | `ANALYTICS_TRACKING.md` | Providers and public configuration |

Until these decisions are approved, the structure must preserve clean extension points without creating inactive production functionality.

---

## 32. Final Contract

The Ahan Asa repository must communicate the same qualities as the brand: controlled, precise, calm, transparent, and protective.

The practical contract is:

- `app/` owns URLs and rendering coordination;
- `components/` owns reusable interface building blocks;
- `features/` owns cohesive user and business capabilities;
- `content/` owns approved public meaning;
- `config/` owns centralized application contracts;
- `lib/` owns low-level reusable infrastructure;
- `server/` owns confidential operations and provider adapters;
- `public/` owns approved publication-ready assets only;
- `tests/` and `scripts/` enforce the contract;
- `docs/` explains why the contract exists.

No folder name authorizes a capability, claim, route, integration, language, or publication that the business has not approved.
