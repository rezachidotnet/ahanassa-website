# Ahan Asa Website — URL and Route Architecture

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `ROUTES.md`  
> **Status:** Draft v1.0 — Route contract for approval  
> **Last updated:** 2026-08-25  
> **Launch locale:** Persian (`fa`), fully RTL  
> **Preferred application architecture:** Next.js App Router, static-first where practical

---

## 1. Purpose

This document defines the public URL system, application routes, dynamic route families, redirect behavior, locale strategy, indexing rules, and implementation constraints for the Ahan Asa website.

It is a route contract for product owners, SEO specialists, content teams, designers, developers, and Claude Code. It answers:

- Which routes exist in Phase 1?
- Which routes are public, conditional, reserved, or prohibited?
- How should Persian and future locales be represented?
- Which URL is canonical when multiple paths could reach the same content?
- How should route parameters, redirects, forms, errors, and API endpoints behave?
- Which routes may be indexed?
- What must remain unresolved until an explicit business decision is recorded?

This file defines **URL behavior**, not page copy or final visual layout. Page content belongs in `PAGE_SPECIFICATIONS.md`; hierarchy and navigation intent belong in `SITEMAP.md` and `INFORMATION_ARCHITECTURE.md`; metadata and keyword targeting belong in the SEO documentation set.

---

## 2. Source-of-Truth and Conflict Rules

Route decisions must follow this order:

1. Explicit owner decisions recorded in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. Approved `SITEMAP.md`
4. Approved `INFORMATION_ARCHITECTURE.md`
5. `ROUTES.md`
6. SEO, page, content, and technical specifications
7. Implementation details

If `SITEMAP.md` or `INFORMATION_ARCHITECTURE.md` is created after this document and materially changes the approved page inventory, update all three documents together. Claude Code must not silently add, remove, rename, merge, or split public routes when the change affects SEO, navigation, scope, localization, or conversion behavior.

### 2.1 Current dependency note

At the time of this version, the exact launch material categories, service boundaries, operational coverage, evidence inventory, future language priority, legal identity, and canonical host preference remain unresolved in `PROJECT_BRIEF.md`. This route contract therefore:

- defines stable route families;
- activates only routes supported by confirmed Phase 1 scope;
- marks data-dependent child routes as conditional;
- does not invent product categories, services, markets, projects, prices, or claims.

---

## 3. Route Status Vocabulary

Every route must have one of the following statuses in the route manifest:

| Status | Meaning | Production behavior |
|---|---|---|
| `launch` | Required and approved for Phase 1 | Build, test, link, include in sitemap when indexable |
| `conditional` | Valid route family but dependent on approved content, evidence, or operations | Build only after its release condition is satisfied |
| `reserved` | Namespace protected for future use | Do not publish, link, index, or return placeholder content |
| `internal` | Technical or application-only endpoint | Exclude from navigation and XML sitemap |
| `redirect` | Alias or legacy URL with one canonical destination | Return the specified permanent or temporary redirect |
| `prohibited` | Explicitly outside Phase 1 scope | Do not implement without a recorded scope decision |

No `conditional` or `reserved` route may be filled with fabricated placeholder production content. Until activated, it should either not exist or return a genuine `404`, according to the implementation stage.

---

## 4. Global URL Principles

### 4.1 URL format

All public paths must:

- use lowercase Latin ASCII characters;
- use kebab-case for multiword slugs;
- begin with `/`;
- omit file extensions;
- omit a trailing slash except for the root `/`;
- avoid dates unless the date is essential to the content identity;
- avoid opaque database IDs, UUIDs, timestamps, or internal record numbers;
- remain readable, stable, and descriptive;
- represent one clear search and user intent per canonical page.

Approved pattern:

```text
/parent-page/child-page
```

Rejected patterns:

```text
/Parent_Page
/صفحه-محصول
/page?id=4839
/steel-products/12345
/articles/2026/08/25/title
/services.html
```

Persian content is served from Latin slugs to reduce encoding, sharing, analytics, migration, and mixed-direction issues. Persian navigation labels and page headings remain fully Persian.

### 4.2 URL depth

- Prefer one or two path segments after an optional locale prefix.
- Use a third segment only when it expresses a necessary parent-child relationship.
- Do not mirror every visual section as a URL.
- Do not create empty hub pages merely to support nesting.
- Do not place important pages more than three meaningful clicks from the homepage.

### 4.3 Stable nouns over campaign language

Use stable nouns and user-recognizable concepts. Avoid slogans, temporary campaign phrases, years, or promotional claims in canonical paths.

Examples:

- Prefer `/procurement-process` over `/buy-steel-smarter-now`.
- Prefer `/request` over `/summer-steel-offer`.
- Prefer `/insights` over `/blog-2026`.

### 4.4 One intent, one canonical route

The same page must not be published under several indexable paths. Navigation labels may change without changing the canonical URL. If a path must be replaced, use a direct one-hop permanent redirect to the new canonical path.

### 4.5 No price-led URL architecture in Phase 1

The route system must not imply a live price engine, guaranteed pricing, product checkout, or commodity marketplace. The following path patterns are prohibited unless the project scope changes explicitly:

```text
/prices
/daily-prices
/live-prices
/shop
/cart
/checkout
/account
/supplier-portal
/marketplace
```

Educational content about price validity, quotation comparison, or procurement cost may exist as an approved insight article, but it must not impersonate a live market feed.

---

## 5. Canonical Origin and Host Policy

The approved business domain is `ahanassa.com`. The choice between apex and `www` as the canonical host is still a governance decision and must be recorded before production launch.

Until that decision is recorded:

- all route tables in this document use paths only;
- application code must read the canonical origin from a single validated configuration value;
- metadata, sitemap, robots, Open Graph, structured data, email links, and redirects must use that same origin;
- developers must not hardcode mixed apex and `www` origins across components.

At launch:

1. select exactly one HTTPS canonical host;
2. redirect HTTP to HTTPS;
3. redirect the non-canonical host to the canonical host;
4. preserve path and safe query parameters;
5. avoid redirect chains.

Recommended configuration key:

```text
NEXT_PUBLIC_SITE_URL=https://<approved-canonical-host>
```

This line is a configuration contract, not authorization to commit real secrets or environment-specific values.

---

## 6. Locale and Language Routing

### 6.1 Phase 1

Persian is the only active public locale in Phase 1. It is served without a locale prefix:

```text
/
/about
/procurement
```

The Persian site must not use `/fa` as its canonical prefix.

### 6.2 Future locale pattern

When a language is formally approved and its required content is complete, use a locale prefix for every non-default language:

```text
/en
/en/about
/ar
/ar/about
```

The planned locale model is:

| Locale | Direction | Canonical path pattern | Current status |
|---|---:|---|---|
| Persian `fa` | RTL | `/{path}` | `launch` |
| English `en` | LTR | `/en/{path}` | `reserved` |
| Arabic `ar` | RTL | `/ar/{path}` | `reserved` |

No future locale may be activated merely by machine-translating navigation or duplicating Persian content. A locale becomes public only after its page inventory, translation quality, metadata, legal content, contact scope, hreflang mapping, and QA are approved.

### 6.3 Default-locale alias

If `/fa` or `/fa/{path}` is ever reachable through legacy links, it must permanently redirect to the unprefixed Persian equivalent:

```text
/fa              → /
/fa/about        → /about
/fa/request      → /request
```

Do not render duplicate Persian pages under both prefixed and unprefixed paths.

### 6.4 Unsupported or incomplete locales

- `/en`, `/ar`, and their descendants must return `404` until approved and deployed.
- Do not redirect an unavailable language path to Persian; that hides missing content and creates misleading search behavior.
- Do not show a language switcher option that leads to an unavailable locale.
- If a localized counterpart is missing after a locale launches, omit that alternate hreflang and provide a clear language-switch behavior defined in `LOCALIZATION.md`.

### 6.5 Localized slugs

Future non-default locales should use natural English ASCII slugs unless a later localization decision establishes another system. Do not assume that every locale must share the Persian route slug.

Example mapping:

| Page identity | Persian | English, when approved | Arabic, when approved |
|---|---|---|---|
| About | `/about` | `/en/about` | `/ar/about` |
| Procurement process | `/procurement-process` | `/en/procurement-process` | `/ar/procurement-process` |
| Request | `/request` | `/en/request` | `/ar/request` |

The content layer must relate translated pages by a stable page key, not by guessing from the URL string.

---

## 7. Phase 1 Public Route Inventory

### 7.1 Core routes

| Route | Persian page label | Purpose | Status | Indexing | Primary navigation |
|---|---|---|---|---|---|
| `/` | صفحه اصلی | Positioning, trust, process orientation, and primary request entry | `launch` | Index, follow | Brand/home |
| `/about` | درباره آهن آسا | Brand role, principles, operating approach, and approved identity | `launch` | Index, follow | Header/footer |
| `/procurement` | مدیریت خرید آهن | Explain managed procurement and confirmed capability scope | `launch` | Index, follow | Header |
| `/procurement-process` | فرآیند همکاری | Explain the request-to-proposal and approved procurement workflow | `launch` | Index, follow | Header |
| `/steel-products` | گروه‌های کالایی | Orient users to approved steel material categories without acting as a live catalog | `launch` | Index, follow | Header or secondary nav |
| `/industries` | صنایع و کاربردها | Explain approved customer/application fit without unsupported sector claims | `launch` | Index, follow | Secondary nav/footer |
| `/projects` | تجربه‌ها و شواهد | Hub for verified cases, approved evidence, and methodology | `launch` | Index only with substantive content | Header or secondary nav |
| `/insights` | دانش خرید آهن | Educational procurement and commercial guidance hub | `launch` | Index, follow | Header or footer |
| `/resources` | منابع | Approved downloadable guides, checklists, and technical resources | `launch` | Index, follow | Footer/secondary nav |
| `/faq` | پرسش‌های متداول | Practical scope, process, quotation, document, and delivery questions | `launch` | Index, follow | Footer/contextual |
| `/contact` | تماس با ما | Approved contact channels and company contact context | `launch` | Index, follow | Header/footer |
| `/request` | ارسال فاکتور یا درخواست خرید | Primary qualified inquiry and document-submission experience | `launch` | Noindex, follow | Persistent primary CTA |
| `/privacy` | حریم خصوصی | Privacy, consent, and document-handling notice after legal approval | `launch` | Index, follow | Footer/form |
| `/terms` | شرایط استفاده | Website and inquiry terms after legal approval | `conditional` | Index when substantive | Footer/form |

### 7.2 Why `/request` is the primary conversion route

`/request` is deliberately broader and more stable than `/quote`, `/upload-invoice`, or a product-specific quote path. The page may support:

- sending an invoice;
- sending a material list;
- describing a project purchasing need;
- requesting an initial procurement consultation.

The page must not promise an instant automated quotation. The Persian CTA label may be refined by `CTA_STRATEGY.md`, but all primary request actions should resolve to the same canonical route unless a later funnel decision creates genuinely distinct workflows.

### 7.3 Launch-content safeguard

A required hub route may be temporarily excluded from the production build when it lacks enough approved content to satisfy its purpose. It must not launch as an empty shell, a grid of “coming soon” cards, or a fabricated evidence page. This safeguard applies especially to `/projects`, `/resources`, and data-dependent sections of `/steel-products` and `/industries`.

---

## 8. Dynamic Public Route Families

Dynamic routes must be generated only from approved, published content records. A valid URL pattern does not authorize publication of unverified content.

| Route pattern | Content type | Status | Release condition | Indexing |
|---|---|---|---|---|
| `/steel-products/[category-slug]` | Material category page | `conditional` | Exact launch categories and commercial scope approved | Index, follow |
| `/industries/[industry-slug]` | Industry/application page | `conditional` | Industry fit and claims approved | Index, follow |
| `/projects/[project-slug]` | Verified case or evidence page | `conditional` | Evidence, permissions, facts, and media approved | Index, follow |
| `/insights/[article-slug]` | Insight/article page | `launch` as a template | Final article passes editorial and SEO approval | Index, follow |
| `/resources/[resource-slug]` | Resource landing page | `launch` as a template | Resource exists; summary, owner, version, and access rule approved | Index, follow |

### 8.1 Material category rule

The namespace `/steel-products/[category-slug]` is approved, but the category list is intentionally not defined here because the exact launch material scope is a recorded TBD. Claude Code must not invent pages for beams, rebar, sheets, profiles, pipes, stainless steel, galvanized steel, or any other category without an approved source record.

When categories are approved:

- create one canonical page per distinct procurement intent;
- avoid thin variants based only on size, grade, brand, or city;
- use structured filters or page sections for non-distinct variants;
- create separate routes only when search intent, content depth, and business scope justify them;
- do not publish prices unless the pricing system, update ownership, validity rules, and legal/commercial review are approved.

### 8.2 Industry route rule

Industry pages must describe verified procurement fit. Do not create location or industry landing pages solely to capture keywords. Each page must contain unique scope, decision factors, material context, process, evidence, and a relevant request path.

### 8.3 Project and evidence rule

Project routes may use a descriptive project slug, but must not expose confidential client information. If a project cannot be named publicly, use an honest generic descriptor approved by the project owner rather than an invented client or title.

Approved style:

```text
/projects/industrial-plant-steel-procurement
```

Do not use internal job numbers in public paths.

### 8.4 Insight and resource slugs

- Slugs must describe the lasting topic, not a headline that may change.
- Changing the visible title does not require changing the URL.
- If a slug changes, create a direct permanent redirect from the old path.
- Do not reuse an old slug for unrelated content.
- Every published record requires a unique slug within its route family.

---

## 9. Request and Lead-Capture Routes

### 9.1 Public flow

| Route | Method | Role | Status | Indexing |
|---|---|---|---|---|
| `/request` | `GET` | Render the qualified inquiry and optional file-upload experience | `launch` | Noindex, follow |
| `/request/confirmation` | `GET` | Confirm successful receipt without exposing sensitive details | `internal` | Noindex, nofollow |

The request form should remain on one stable route. Multi-step form state should normally be internal application state, not a set of indexable pages such as `/request/step-1` and `/request/step-2`.

### 9.2 Submission behavior

- A successful submission may navigate to `/request/confirmation` or render an accessible inline success state.
- Refreshing the confirmation page must not resubmit the request.
- Do not place a customer's name, phone, email, project title, document name, quotation value, or internal request ID in the URL.
- A non-sensitive short reference may be shown in the page body only if the backend explicitly creates it for customer use.
- Failed submission must preserve safe form state and provide an approved fallback contact path.
- Uploaded documents must not be served from public static URLs.

### 9.3 Request tracking

A customer request-tracking interface appeared in earlier product exploration, while the authoritative Phase 1 brief excludes customer accounts and portals. Therefore:

| Route pattern | Status | Rule |
|---|---|---|
| `/request-status` | `reserved` | Do not publish until tracking scope, authentication, privacy, data retention, and operations are approved |
| `/request-status/[secure-token]` | `reserved` | Never use a sequential or guessable identifier; always noindex |

This reservation protects the namespace without expanding Phase 1 scope.

---

## 10. Application and API Routes

API routes are implementation contracts, not public content pages. Their final payload schemas, authentication, storage, rate limits, consent behavior, integrations, and observability belong in `API_INTEGRATIONS.md`, `FORM_ARCHITECTURE.md`, and `SECURITY_GUIDELINES.md`.

| Route | Method | Purpose | Status |
|---|---|---|---|
| `/api/inquiries` | `POST` | Validate and submit the primary inquiry | `launch` |
| `/api/uploads` | `POST` or approved presigned flow | Securely receive approved document types | `conditional` |
| `/api/health` | `GET` | Minimal deployment health signal without sensitive diagnostics | `internal` |
| `/api/revalidate` | `POST` | Controlled content revalidation if a CMS is approved | `reserved` |
| `/api/webhooks/[provider]` | Provider-defined | Receive verified events from an approved integration | `reserved` |

### 10.1 API rules

- Never expose secrets, stack traces, environment values, supplier data, or internal system topology.
- Validate on the server even when client validation exists.
- Apply rate limiting, bot protection, upload restrictions, and logging appropriate to risk.
- Use generic public error messages and retain diagnostic detail only in protected logs.
- API endpoints must not be added to the XML sitemap.
- `GET` must not create or mutate an inquiry.
- Do not create provider-named routes before the integration is approved.
- If document upload is not operationally and legally approved, omit `/api/uploads` and provide a non-upload inquiry flow.

---

## 11. Technical, Error, and System Routes

| Route or state | Implementation | Indexing | Notes |
|---|---|---|---|
| Not found | App Router `not-found` state | Noindex | Helpful Persian recovery links; return genuine `404` |
| Unhandled error | App Router error boundary | Noindex | Do not expose stack traces or sensitive data |
| Global fatal error | Global error boundary | Noindex | Minimal branded fallback |
| Maintenance | `/maintenance` only when deliberately enabled | Noindex, nofollow | Return appropriate temporary status behavior |
| Service status | `/status` | `reserved` | Publish only if there is a real maintained status process |
| Robots | `/robots.txt` | Not applicable | Generated from approved environment policy |
| XML sitemap | `/sitemap.xml` | Not applicable | Include canonical, indexable public URLs only |
| Web app manifest | `/manifest.webmanifest` | Not applicable | Add only if the site behavior justifies it |

Do not create a normal indexable `/404` or `/500` marketing page. Error states must return correct HTTP status codes.

---

## 12. Prohibited and Deferred Route Families

The following are outside Phase 1 unless an explicit owner decision changes the project scope:

| Route family | Status | Reason |
|---|---|---|
| `/shop/**` | `prohibited` | No public e-commerce checkout |
| `/cart/**` | `prohibited` | No shopping cart |
| `/checkout/**` | `prohibited` | No online payment flow |
| `/prices/**` | `prohibited` | No live price engine or unverified feed |
| `/account/**` | `prohibited` | No customer account or portal |
| `/suppliers/**` | `prohibited` | No public supplier marketplace or supplier account area |
| `/inventory/**` | `prohibited` | No public inventory or warehouse ERP representation |
| `/contracts/**` | `prohibited` | No automated public contract generation |
| `/dashboard/**` | `prohibited` | No public trading or customer dashboard |
| `/admin/**` | `reserved` | Internal operations require a separately approved secured architecture |

These paths must not be built as decorative mockups in production. A visual prototype must be clearly isolated from the live public route tree.

---

## 13. Navigation-to-Route Mapping

The header should remain short and task-oriented. The exact label order belongs in `HEADER_NAVIGATION_SPEC.md`, but the route architecture supports the following model:

| Navigation role | Suggested Persian label | Destination |
|---|---|---|
| Brand/home | آهن آسا | `/` |
| Primary | مدیریت خرید آهن | `/procurement` |
| Primary | فرآیند همکاری | `/procurement-process` |
| Primary | گروه‌های کالایی | `/steel-products` |
| Primary or secondary | تجربه‌ها و شواهد | `/projects` |
| Primary or secondary | دانش خرید آهن | `/insights` |
| Utility | درباره ما | `/about` |
| Utility | تماس | `/contact` |
| Persistent CTA | ارسال فاکتور یا لیست خرید | `/request` |

### 13.1 Navigation constraints

- Do not require a product-category choice before the user can understand the service or submit a request.
- Do not use a deep mega-menu in Phase 1 unless the approved category inventory genuinely requires it.
- Hide empty dynamic sections rather than displaying disabled links.
- Keep the primary request CTA visible in desktop and mobile navigation without turning the header into an advertisement.
- Footer navigation may include `/industries`, `/resources`, `/faq`, `/privacy`, and `/terms`.

---

## 14. Breadcrumb Rules

Breadcrumbs should reflect content hierarchy, not browser history.

Examples:

```text
خانه ← گروه‌های کالایی ← [نام گروه]
خانه ← تجربه‌ها و شواهد ← [نام پروژه]
خانه ← دانش خرید آهن ← [عنوان مقاله]
خانه ← منابع ← [عنوان منبع]
```

Rules:

- Do not render a breadcrumb on the homepage.
- The current page is the last item and is not a link.
- Use visible Persian labels while keeping URL paths Latin.
- Include `BreadcrumbList` structured data only when it matches the visible hierarchy.
- Locale-specific breadcrumbs must link only within the current locale.

---

## 15. Query Parameters

### 15.1 Allowed campaign parameters

The site may accept recognized attribution parameters such as:

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

Rules:

- Preserve them long enough for approved analytics and inquiry attribution.
- Exclude them from canonical URLs.
- Do not generate internal links containing campaign parameters.
- Never place personal or confidential information in query parameters.

### 15.2 Filters and pagination

If filters or pagination are later required:

- use query parameters for non-unique view state;
- keep canonical behavior consistent with the SEO strategy;
- prevent infinite crawl combinations;
- do not create indexable thin pages for every filter combination;
- preserve accessible navigation without requiring client-only rendering.

Examples:

```text
/insights?page=2
/projects?industry=<approved-value>
```

Filter URLs must not replace stable category or article pages when those pages have distinct, approved intent.

---

## 16. Canonical, Hreflang, and Indexing Rules

### 16.1 Canonical rules

- Every indexable page must output one absolute self-referencing canonical URL.
- Canonicals must use the approved HTTPS host, normalized path, and no tracking parameters.
- Redirecting, error, noindex, confirmation, API, and preview routes must not be included as canonical content pages.
- A canonical tag is not a substitute for fixing duplicate routes or redirects.

### 16.2 Hreflang rules

In Phase 1, do not output hreflang entries for nonexistent languages.

When localized versions launch:

- every language alternate must be a real `200` indexable page;
- mappings must be reciprocal;
- Persian uses `fa-IR` only if the localization strategy approves regional codes;
- future English and Arabic regional codes must reflect actual target scope, not assumptions;
- `x-default` should normally resolve to the approved default-language homepage or locale selector strategy;
- do not map unrelated pages merely because they share a route position.

### 16.3 Indexing matrix

| Route class | Robots directive | XML sitemap |
|---|---|---|
| Substantive public page | `index, follow` | Include |
| Published article/resource/project/category | `index, follow` | Include |
| Request form | `noindex, follow` | Exclude |
| Confirmation/success state | `noindex, nofollow` | Exclude |
| API or webhook | Not a document page | Exclude |
| Error, maintenance, status | `noindex` | Exclude |
| Preview, draft, staging | Block from indexing at environment level | Exclude |
| Reserved/conditional unpublished route | Genuine `404` or absent | Exclude |

---

## 17. Redirect Policy

### 17.1 Mandatory normalization redirects

At production launch, use direct redirects for:

- HTTP to HTTPS;
- non-canonical host to canonical host;
- `/fa` paths to unprefixed Persian equivalents if such aliases exist;
- trailing-slash variants to the no-trailing-slash canonical form;
- approved legacy or renamed paths.

### 17.2 Redirect status

- Use `308` or `301` for permanent URL replacement while preserving intended method behavior.
- Use `307` or `302` only for genuine temporary behavior.
- Never use a temporary redirect for a permanent migration merely to avoid making a decision.

### 17.3 Redirect quality rules

- One source must resolve to one closest relevant destination.
- Avoid chains and loops.
- Do not redirect every missing URL to the homepage.
- A removed page without a relevant replacement should return `404` or `410` according to the SEO migration decision.
- Preserve safe campaign parameters only when needed.
- Update internal links, sitemap entries, canonical tags, and hreflang references to the final destination rather than relying on redirects.

### 17.4 Alias policy

Do not create speculative aliases such as `/rfq`, `/quote`, `/upload-invoice`, `/services`, or Persian-script versions unless they are known legacy URLs, approved campaign routes, or actively used external links. If one is introduced, record it in `REDIRECTS.md` with source, destination, status code, reason, and approval date.

---

## 18. Slug Governance

### 18.1 Slug validation

A publishable slug must match:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Additional rules:

- Maximum recommended length: 70 characters.
- No consecutive hyphens.
- No leading or trailing hyphen.
- No reserved system word.
- Unique within its route family and locale.
- Do not include private identifiers or mutable business data.

### 18.2 Reserved words

The content system must prevent dynamic records from using top-level or technical route names, including:

```text
api
admin
about
contact
request
privacy
terms
faq
projects
resources
insights
steel-products
industries
procurement
procurement-process
robots.txt
sitemap.xml
```

### 18.3 Slug changes

Changing a published slug requires:

1. a redirect from the old canonical URL;
2. updated internal links;
3. updated sitemap and hreflang mappings;
4. updated structured data and canonical tags;
5. a recorded reason in `CHANGELOG.md` or `DECISIONS.md` when material.

---

## 19. Route Manifest Contract

Public routes should be defined through a typed, centralized route manifest rather than duplicated string literals across components.

Conceptual model:

```ts
type RouteStatus =
  | 'launch'
  | 'conditional'
  | 'reserved'
  | 'internal'
  | 'redirect'
  | 'prohibited';

type RouteRecord = {
  key: string;
  path: string;
  status: RouteStatus;
  indexable: boolean;
  sitemap: boolean;
  navigation?: 'primary' | 'secondary' | 'footer' | 'cta' | 'none';
  locale: 'fa' | 'en' | 'ar';
};
```

The exact TypeScript location and API belong in `TECHNICAL_ARCHITECTURE.md` and `FOLDER_STRUCTURE.md`. This model establishes the required data behavior, not a mandatory filename.

### 19.1 Stable page identity

Translated and renamed pages must use a stable internal key, for example:

```text
home
about
procurement
procurementProcess
steelProducts
request
```

Do not infer page identity by stripping a locale prefix or comparing translated slugs.

---

## 20. Next.js App Router Implementation Rules

- Render indexable core content on the server or at build time; do not hide it behind client-side fetching.
- Use static generation for stable public pages and published content where practical.
- Generate dynamic routes only for records whose status is `published` and whose locale is approved.
- Return `notFound()` for unknown, draft, removed, or unavailable-locale records.
- Do not silently fall back from a missing translated page to Persian content under a non-Persian URL.
- Centralize redirect, locale, and canonical path rules.
- Ensure route handlers do not collide with page namespaces.
- Keep preview routes authenticated, noindex, and outside the public sitemap.
- Do not embed production contact details, project evidence, product categories, or integrations as fabricated placeholders.

The physical `app/` folder structure is intentionally deferred to `FOLDER_STRUCTURE.md`. It must implement this public URL contract without letting internal folder preferences dictate user-facing paths.

---

## 21. Route-Level Analytics Contract

Analytics naming must use stable page and event keys rather than Persian labels or mutable titles.

Recommended route-related event context:

```text
page_key
route_family
locale
content_id
content_type
cta_origin
request_entry_path
```

Privacy rules:

- Never send names, phone numbers, email addresses, document names, message text, or project-sensitive data to analytics.
- Do not treat the confirmation page view alone as proof of a valid lead unless it is tied to the approved server-side submission outcome.
- Preserve attribution across the request flow only within the approved consent and privacy model.

Detailed events belong in `ANALYTICS_TRACKING.md`.

---

## 22. Route QA Checklist

Before launch, verify every active route against the following:

### 22.1 Functional

- Returns the intended HTTP status.
- Loads directly, not only through client navigation.
- Works after refresh and deep linking.
- Has no broken internal links.
- Has correct active-navigation and breadcrumb state.
- Handles mobile, desktop, keyboard, and RTL behavior.
- Has an intentional empty, error, and loading behavior where relevant.

### 22.2 SEO

- Uses the approved canonical host and normalized path.
- Outputs a unique title and description.
- Has correct index/noindex behavior.
- Is included or excluded from the XML sitemap correctly.
- Does not produce duplicate content through aliases, filters, or locale fallbacks.
- Uses valid breadcrumb and page structured data where applicable.
- Returns genuine `404` for unavailable dynamic records.

### 22.3 Localization

- Persian routes are unprefixed and fully RTL.
- Mixed-direction content is handled correctly.
- Unsupported locales do not render placeholder content.
- Locale links, when activated, point to genuine counterparts.
- Canonical and hreflang values match the current locale.

### 22.4 Conversion and privacy

- Every major page has a relevant path to `/request` without excessive repetition.
- The request route explains what happens next.
- Submission does not expose personal or project data in the URL.
- Uploads, if enabled, are private and validated.
- Confirmation cannot be mistaken for a public indexable landing page.
- Approved fallback behavior works when an integration is unavailable.

### 22.5 Redirects

- HTTP and host normalization work in one hop where possible.
- `/fa` aliases do not create duplicate Persian pages.
- No redirect loop or chain exists.
- Removed pages do not redirect indiscriminately to `/`.
- Internal links point directly to canonical destinations.

---

## 23. Open Route Decisions

The following decisions must be recorded before they affect production:

| Decision | Current state | Route impact |
|---|---|---|
| Canonical host: apex or `www` | TBD | All absolute URLs and redirects |
| Final approved sitemap and information architecture | TBD | Route inventory and navigation |
| Exact material categories | TBD | `/steel-products/[category-slug]` |
| Exact service boundaries | TBD | `/procurement` content and any future service child routes |
| Approved industries/applications | TBD | `/industries/[industry-slug]` |
| Verified project/evidence inventory | TBD | `/projects/[project-slug]` |
| Public resource inventory and access policy | TBD | `/resources/[resource-slug]` and download handling |
| Official legal identity and notices | TBD | `/privacy`, `/terms`, footer, and forms |
| Secure document-upload policy | TBD | `/request` and `/api/uploads` |
| Lead destination and integrations | TBD | `/api/inquiries` and failure handling |
| Request tracking scope | Deferred | `/request-status/**` |
| Future locale priority and regional codes | TBD | `/en/**`, `/ar/**`, hreflang |
| CMS decision | TBD | Dynamic generation, preview, and `/api/revalidate` |

Until resolved, Claude Code may scaffold internal types or tests but must not publish claims, content, languages, products, integrations, or functionality based on assumptions.

---

## 24. Approval Checklist

This document becomes **Approved** when the project owner confirms:

- Persian is the unprefixed default locale.
- The Phase 1 public route inventory is correct.
- `/request` is the canonical primary conversion route.
- Product, industry, project, insight, and resource dynamic patterns are accepted.
- Deferred portals, pricing, marketplace, and e-commerce routes remain outside Phase 1.
- The canonical host decision has an owner and launch deadline.
- Legal, upload, tracking, and integration dependencies have explicit owners or deferrals.
- `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, and SEO documents will be synchronized with this route contract.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Information Architecture | TBD | Pending | — |
| SEO Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |
| Legal/Privacy Approval | TBD | Pending | — |

