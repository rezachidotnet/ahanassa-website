# Ahan Asa Website — Structured Data and JSON-LD Specification

> **File:** `STRUCTURED_DATA.md`  
> **Project:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Status:** Normative implementation specification — v1.0  
> **Last updated:** 2026-08-25  
> **Primary locale:** Persian (`fa-IR`), fully RTL  
> **Preferred format:** JSON-LD using Schema.org vocabulary

---

## 1. Purpose

This document defines the structured-data architecture for the Ahan Asa website. It is the implementation contract for Schema.org entities, JSON-LD graphs, entity identifiers, page-to-schema mapping, data validation, release gates, and ongoing monitoring.

Structured data must help search engines understand the real website and the real business. It must never be used to manufacture eligibility, imply services that are not offered, invent a legal entity, present category pages as purchasable products, or convert marketing claims into machine-readable facts.

The website positions Ahan Asa as a premium B2B steel procurement management and project purchasing support brand—not as:

- an e-commerce store;
- a public steel marketplace;
- a live price board;
- a supplier directory;
- a warehouse or inventory platform;
- a product manufacturer unless that status is separately verified.

The approved public slogan is:

> **ما مراقب سرمایه شما هستیم.**

This slogan may appear in visible content. It must not be transformed into a guarantee, rating, award, financial promise, or machine-readable performance claim.

---

## 2. Document Authority and Dependencies

Claude Code must read this file together with:

- `PROJECT_BRIEF.md`
- `ROUTES.md`
- `SITEMAP.md`
- `INFORMATION_ARCHITECTURE.md`
- `PAGE_SPECIFICATIONS.md`
- `CONTENT_MODEL.md`
- `CONTENT_STRATEGY.md`
- `SEO_STRATEGY.md`
- `SEO_KEYWORD_MAP.md`
- `SEO_PAGE_MAP.md`
- `METADATA_SPEC.md`
- `MEDIA_GUIDELINES.md`
- `LOCALIZATION.md` when created
- `HREFLANG_CANONICAL.md` when created
- `TECHNICAL_ARCHITECTURE.md` when created
- `QA_CHECKLIST.md` and `SEO_QA_CHECKLIST.md` when created

### 2.1 Conflict order

When instructions conflict, apply this order:

1. Legal, privacy, security, accessibility, and verified business facts
2. Explicit owner decisions recorded in `DECISIONS.md`
3. `PROJECT_BRIEF.md` for business identity, scope, and claims
4. `ROUTES.md` for canonical URL behavior and indexing status
5. `METADATA_SPEC.md` and `HREFLANG_CANONICAL.md` for canonical and locale metadata
6. `CONTENT_MODEL.md` for approved entity fields and content relationships
7. This document for schema selection, graph construction, and validation
8. Other page, design, and implementation documents

Claude Code must not silently resolve a conflict involving:

- the legal organization name;
- canonical host or canonical path;
- active languages;
- office addresses or service areas;
- phone numbers or email addresses;
- products, services, prices, availability, ratings, clients, or projects;
- authorship or review responsibility;
- publication or modification dates.

Record unresolved values as data-layer `TBD` items. Do not emit `TBD`, empty strings, placeholder URLs, or fabricated fallbacks in production JSON-LD.

### 2.2 Current route-normalization warning

Earlier planning documents contain draft aliases such as `/materials`, `/process`, `/capabilities`, and `/request-consultation`. The current `ROUTES.md` contract uses canonical route families such as:

- `/procurement`
- `/procurement-process`
- `/steel-products`
- `/request`

Structured data must always use the final canonical URL returned by the central route registry and metadata system. It must not create duplicate entities for draft documentation paths.

Do not add redirects merely because a draft path appeared in a planning document. Add a redirect only if the path was actually published, indexed, shared publicly, or formally approved as an alias.

---

## 3. Strategic Principles

### 3.1 Truth before coverage

It is better to emit a small, accurate graph than a large graph containing guessed properties.

Every emitted property must be:

- true;
- current;
- visible or clearly supported by the page;
- approved for public disclosure;
- derived from a controlled data source;
- valid for the selected Schema.org type;
- consistent with the canonical metadata and page content.

### 3.2 Structured data is not hidden SEO copy

JSON-LD must describe the visible page and its primary entity. Do not insert keywords, claims, locations, services, or descriptions that are absent from or contradicted by visible content.

### 3.3 One real entity, one stable identifier

The same organization, website, page, article, service, or resource must use the same stable `@id` everywhere it is referenced.

### 3.4 Page-specific graphs

Each page must emit only the nodes relevant to that page. Do not inject every possible node into a global layout.

### 3.5 Rich-result eligibility is not guaranteed

Valid structured data may improve machine understanding and may create eligibility for supported search features. It does not guarantee a rich result, ranking improvement, knowledge panel, sitelink, or enhanced display.

### 3.6 JSON-LD is the required serialization

Use JSON-LD in a server-rendered `<script type="application/ld+json">` element. Do not mix JSON-LD, Microdata, and RDFa for the same entities unless a documented technical requirement demands it.

### 3.7 Visible content parity

The structured data and visible page must agree on:

- name and heading;
- description;
- dates;
- authors and reviewers;
- images;
- breadcrumb hierarchy;
- services and categories;
- contact details;
- project facts and metrics;
- downloads and file formats;
- language and URL.

---

## 4. Current Search-Feature Decisions

This specification reflects Google Search documentation reviewed on 2026-08-25.

| Schema or feature | Phase 1 decision | Reason |
|---|---|---|
| `Organization` | Use | Establish the verified Ahan Asa entity and logo |
| `WebSite` | Use on the canonical homepage | Support site identity and site name |
| `WebPage` and subtypes | Use | Describe page purpose and connect page entities |
| `BreadcrumbList` | Use on eligible non-home pages | Represent the real visible hierarchy |
| `Article` or `BlogPosting` | Use for qualifying insight pages | Supported article understanding and presentation |
| `Service` | Use for approved procurement services | Semantically describes real service scope |
| `CollectionPage` | Use for substantive hubs | Describes curated page collections |
| `ItemList` | Use selectively | Only when the visible page contains the same ordered or unordered items |
| `ContactPage` | Use for `/contact` | Correct `WebPage` subtype |
| `AboutPage` | Use for `/about` | Correct `WebPage` subtype |
| `DigitalDocument` | Use for approved resource detail pages | Describes a real public resource or file |
| `VideoObject` | Conditional | Only for a real primary video with complete metadata |
| `ImageObject` | Conditional | Use when ownership, URL, dimensions, and relevance are known |
| `FAQPage` | Do not use as a Phase 1 rich-result tactic | Google stopped showing FAQ rich results in May 2026 and removed the feature documentation in June 2026 |
| `HowTo` | Do not use for the procurement process | The page explains Ahan Asa's workflow; it is not necessarily a user-executable how-to, and no Google rich-result value is assumed |
| `Product` | Prohibited by default | Category pages are procurement guidance, not single purchasable product pages |
| `Offer` / `AggregateOffer` | Prohibited by default | No approved public offer, price, validity, or availability system exists |
| `OfferCatalog` | Deferred | Do not imply a current commercial catalog until business scope and content model approve it |
| `LocalBusiness` | Deferred | Use only after a real customer-facing location, business subtype, address, and operating details are approved |
| `OnlineStore` | Prohibited | Ahan Asa is not being launched as an online store |
| `AggregateRating` / `Review` | Prohibited by default | No verified, compliant first-party rating system is approved; self-serving organization ratings are not a shortcut |
| `SearchAction` | Omit | No approved internal site search exists; do not implement obsolete sitelinks-search-box tactics |
| `NewsArticle` | Prohibited by default | Insights are not news unless a genuine news publishing workflow is approved |
| `QAPage` | Prohibited for ordinary FAQs | A Q&A page requires a different user-generated answer model and is not an FAQ substitute |
| `JobPosting` | Conditional | Only for a real, current, public vacancy with complete employment data and expiry handling |
| `Event` | Conditional | Only for a real event page with approved dates, location or online attendance, and status |

The absence of a Google rich-result feature does not prevent using a valid Schema.org type for semantic purposes. However, every additional node increases maintenance and error risk. Phase 1 should remain intentionally conservative.

---

## 5. Canonical Origin and URL Rules

The approved domain is `ahanassa.com`. The apex-versus-`www` decision is unresolved until recorded in `DECISIONS.md` and deployed consistently.

### 5.1 Single source of truth

All absolute URLs must be built from one validated configuration value:

```text
NEXT_PUBLIC_SITE_URL=https://<approved-canonical-host>
```

The same origin must be used by:

- canonical metadata;
- Open Graph URLs;
- XML sitemap entries;
- robots and host policies where applicable;
- hreflang alternate URLs;
- JSON-LD `@id`, `url`, `mainEntityOfPage`, and image URLs;
- redirects and share links.

### 5.2 URL requirements

Every URL emitted in JSON-LD must:

- be absolute;
- use HTTPS in production;
- use the approved canonical host;
- use the canonical path;
- omit tracking parameters;
- omit fragments except for stable entity identifiers;
- follow the approved trailing-slash policy;
- resolve without an avoidable redirect;
- be publicly crawlable when the property requires a public asset.

### 5.3 Canonical parity rule

For every indexable page:

```text
metadata canonical URL
  = JSON-LD WebPage @id without its entity fragment
  = JSON-LD url
  = sitemap URL
  = Open Graph URL
```

Locale alternates are separate canonical pages. They must not share the same page `@id`.

---

## 6. Stable Entity Identifier System

Use fragments to distinguish a real entity from the document URL that describes it.

| Entity | Required `@id` pattern |
|---|---|
| Ahan Asa organization | `${origin}/#organization` |
| Ahan Asa website | `${origin}/#website` |
| Homepage web page | `${origin}/#webpage` |
| Any internal web page | `${canonicalUrl}#webpage` |
| Breadcrumb list | `${canonicalUrl}#breadcrumb` |
| Service | `${canonicalUrl}#service` |
| Collection list | `${canonicalUrl}#itemlist` |
| Article | `${canonicalUrl}#article` |
| Resource or document | `${canonicalUrl}#resource` |
| Primary image | `${canonicalUrl}#primaryimage` |
| Video | `${canonicalUrl}#video` |
| Approved person profile | `${profileCanonicalUrl}#person` |

### 6.1 Identifier rules

- Never use a random UUID for a public semantic entity.
- Never change an entity `@id` because its display name changes.
- Never create both `/#organization` and `/about#organization` for the same Ahan Asa organization.
- Never use an email address, phone number, CRM ID, inquiry ID, or private record ID as a public `@id`.
- References to an existing entity should use `{ "@id": "..." }` rather than duplicate a conflicting version of the entity.
- If an article changes URL through an approved migration, redirect the old URL and update the article `@id` to the new canonical URL. Preserve the content ID separately in the CMS.

---

## 7. Base Entity Graph

### 7.1 Organization

The root entity is initially the conservative Schema.org type `Organization`.

Do not change it to `Corporation`, `ProfessionalService`, `LocalBusiness`, `OnlineBusiness`, `OnlineStore`, `Store`, `Wholesaler`, or another subtype until the legal and operational facts support that selection.

#### Approved minimum properties

| Property | Phase 1 value or rule |
|---|---|
| `@type` | `Organization` |
| `@id` | `${origin}/#organization` |
| `name` | `آهن آسا` |
| `alternateName` | `Ahan Asa` and optionally `ahanassa.com` if approved for site-name fallback |
| `url` | canonical homepage URL |
| `logo` | Approved crawlable master logo asset, minimum 112×112 px |
| `description` | Only final approved public description visible on the site |
| `slogan` | `ما مراقب سرمایه شما هستیم.` if visible and approved in the same context |

#### Conditional properties

Emit only after verification and approval:

- `legalName`
- `email`
- `telephone`
- `contactPoint`
- `address`
- `foundingDate`
- `founder`
- `taxID`
- `vatID`
- `iso6523Code`
- `numberOfEmployees`
- `sameAs`
- `areaServed`
- `knowsAbout`
- `memberOf`
- `award`
- `hasCertification`

#### Organization property rules

- `legalName` must be the registered legal name, not a guessed English expansion of Ahan Asa.
- `sameAs` must link only to verified profiles representing the same organization.
- Do not place client, supplier, partner, marketplace, or directory URLs in `sameAs`.
- Do not emit an address unless it is real, public, approved, and visible on the website.
- A service region is not an office address.
- `areaServed` must reflect active operational coverage, not expansion ambition.
- Phone numbers must include country and area codes.
- Do not emit a private personal mobile number as the organization's general number without owner approval.
- Do not infer a founding date from domain registration or brand-design dates.
- The slogan does not prove service performance and must not be modeled as a guarantee.

### 7.2 Website

Use `WebSite` on the canonical homepage to establish site identity.

Required or recommended properties:

| Property | Rule |
|---|---|
| `@type` | `WebSite` |
| `@id` | `${origin}/#website` |
| `url` | canonical homepage |
| `name` | `آهن آسا` |
| `alternateName` | `Ahan Asa`; optionally `ahanassa.com` as a lowercase fallback |
| `inLanguage` | `fa-IR` for Phase 1 |
| `publisher` | Reference `${origin}/#organization` |

Do not add a `potentialAction` with `SearchAction` until a real, accessible internal search exists and there is a current, documented purpose for the markup.

### 7.3 Homepage

Use `WebPage` for the homepage and connect it to the website and organization.

Recommended properties:

- `@id`
- `url`
- `name`
- `description`
- `inLanguage`
- `isPartOf`
- `about`
- `primaryImageOfPage` when approved
- `dateModified` only if the date represents a meaningful visible content update

Do not use a synthetic `datePublished` for the homepage.

---

## 8. Minimum Homepage Graph Example

The following example intentionally omits unresolved legal identity, contact, address, social-profile, and service-area fields. `SITE_ORIGIN`, descriptions, and asset paths must come from approved production configuration and content.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.example.com/#organization",
      "name": "آهن آسا",
      "alternateName": "Ahan Asa",
      "url": "https://www.example.com/",
      "slogan": "ما مراقب سرمایه شما هستیم.",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://www.example.com/#logo",
        "url": "https://www.example.com/assets/brand/ahan-asa-logo.png",
        "contentUrl": "https://www.example.com/assets/brand/ahan-asa-logo.png",
        "width": 512,
        "height": 512,
        "caption": "آهن آسا"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://www.example.com/#website",
      "url": "https://www.example.com/",
      "name": "آهن آسا",
      "alternateName": ["Ahan Asa", "ahanassa.com"],
      "inLanguage": "fa-IR",
      "publisher": {
        "@id": "https://www.example.com/#organization"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://www.example.com/#webpage",
      "url": "https://www.example.com/",
      "name": "آهن آسا",
      "inLanguage": "fa-IR",
      "isPartOf": {
        "@id": "https://www.example.com/#website"
      },
      "about": {
        "@id": "https://www.example.com/#organization"
      }
    }
  ]
}
```

`https://www.example.com` is documentation-only. It must never reach production. The graph builder must replace it with the validated canonical origin.

---

## 9. Global Page Node Requirements

Every canonical, indexable page should have one primary `WebPage` node or a valid subtype.

### 9.1 Required page fields

| Field | Rule |
|---|---|
| `@type` | Most accurate `WebPage` subtype, or `WebPage` |
| `@id` | `${canonicalUrl}#webpage` |
| `url` | Exact canonical URL |
| `name` | Visible page title aligned with metadata |
| `description` | Approved summary aligned with visible content |
| `inLanguage` | `fa-IR` in Phase 1 |
| `isPartOf` | Reference website entity |
| `breadcrumb` | Reference page breadcrumb when applicable |
| `primaryImageOfPage` | Reference only when a genuine primary image exists |

### 9.2 Optional page fields

- `about`
- `mainEntity`
- `datePublished`
- `dateModified`
- `reviewedBy`
- `author`
- `publisher`
- `speakable`
- `significantLink`

Optional does not mean automatic. Emit a property only when it is accurate, useful, and maintained.

### 9.3 Dates

- Use ISO 8601.
- Use a timezone for `DateTime` values.
- `datePublished` must be the real first public publication date.
- `dateModified` must represent a meaningful content change, not every build, deploy, formatting edit, cache refresh, or dependency update.
- Visible dates and structured dates must agree.
- Never use the current build time as `dateModified` across the site.

---

## 10. BreadcrumbList Specification

Use `BreadcrumbList` on canonical, indexable non-home pages when a visible breadcrumb is present.

### 10.1 Required behavior

- The JSON-LD breadcrumb must match the visible breadcrumb.
- Each item must use the canonical absolute URL.
- Positions must begin at `1` and increment without gaps.
- Labels must be natural Persian on the Persian site.
- The last item must represent the current page.
- Do not include utility overlays, filters, tabs, query parameters, or form steps unless they are canonical pages in the approved hierarchy.
- Do not emit breadcrumbs on 404, error, confirmation, maintenance, API, or private status pages.

### 10.2 Example

```json
{
  "@type": "BreadcrumbList",
  "@id": "https://www.example.com/insights/example-article#breadcrumb",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "صفحه اصلی",
      "item": "https://www.example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "دانش خرید آهن",
      "item": "https://www.example.com/insights"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "عنوان مقاله",
      "item": "https://www.example.com/insights/example-article"
    }
  ]
}
```

---

## 11. Page-to-Schema Matrix

`ROUTES.md` remains authoritative for exact paths and publication status.

| Route or family | Primary page node | Main entity or supporting nodes | Breadcrumb | Notes |
|---|---|---|---|---|
| `/` | `WebPage` | `Organization`, `WebSite`, optional primary `ImageObject` | No | Define the root entity graph here |
| `/about` | `AboutPage` | Organization reference; full organization node only when it adds verified data | Yes | Do not create a second organization ID |
| `/procurement` | `CollectionPage` or `WebPage` | Approved `Service` nodes and optional visible `ItemList` | Yes | Use `CollectionPage` only if it is truly a hub |
| Future approved procurement detail | `WebPage` | One primary `Service` | Yes | One page, one dominant service intent |
| `/procurement-process` | `WebPage` | Organization or approved service reference | Yes | Do not label the business workflow as `HowTo` by default |
| `/steel-products` | `CollectionPage` | Optional visible `ItemList` of published procurement categories | Yes | Not a product listing or offer catalog |
| `/steel-products/[category-slug]` | `WebPage` | Optional related `Service`; category concept only when accurately modeled | Yes | No `Product`, price, SKU, stock, brand, GTIN, or offer by default |
| `/industries` | `CollectionPage` | Optional visible `ItemList` | Yes | Include only published, substantive children |
| `/industries/[industry-slug]` | `WebPage` | Approved service/application context | Yes | Avoid invented operational coverage |
| `/projects` | `CollectionPage` | Optional visible `ItemList` of verified published cases | Yes | Do not publish empty evidence graph |
| `/projects/[project-slug]` | `Article` or `WebPage` | Verified case facts, images, organization references | Yes | Use `Article` only for a true authored narrative |
| `/insights` | `CollectionPage` | Optional visible `ItemList` of published articles | Yes | The list must match the page |
| `/insights/[article-slug]` | `Article` or `BlogPosting` | Author, publisher, images, dates | Yes | Do not use `NewsArticle` by default |
| `/resources` | `CollectionPage` | Optional visible `ItemList` | Yes | Include only real public resources |
| `/resources/[resource-slug]` | `WebPage` | `DigitalDocument` or other accurate `CreativeWork` | Yes | Do not expose private download URLs |
| `/faq` | `WebPage` | No `FAQPage` rich-result implementation | Yes | Keep visible, useful FAQs in HTML |
| `/contact` | `ContactPage` | Organization reference; verified contact data | Yes | Details must match visible contact content |
| `/request` | None by default | None | No | Route is `noindex, follow`; keep schema minimal or omit |
| `/privacy` | `WebPage` | Optional organization reference | Yes | Legal text requires approval |
| `/terms` | `WebPage` | Optional organization reference | Yes | Only when published and substantive |
| Confirmation routes | None | None | No | `noindex, nofollow`; never expose inquiry data |
| 404, error, maintenance | None | None | No | Do not emit rich-result markup |
| API, webhook, health endpoints | None | None | No | Never emit page JSON-LD |
| Reserved locales | None | None | No | Return 404 until activated |

---

## 12. Service Schema

Use `Service` only when a page describes a real, approved procurement service that Ahan Asa provides.

### 12.1 Recommended properties

| Property | Rule |
|---|---|
| `@type` | `Service` |
| `@id` | `${canonicalUrl}#service` |
| `name` | Exact visible service name |
| `description` | Approved summary of actual scope |
| `url` | Canonical service page |
| `provider` | Reference Ahan Asa organization |
| `serviceType` | Clear, stable service category; not a keyword list |
| `areaServed` | Only approved active area |
| `audience` | Only when the target audience is explicitly defined and useful |
| `termsOfService` | Only if a relevant approved public terms page exists |

### 12.2 Service prohibitions

Do not add:

- a price without a real published commercial offer;
- an `Offer` merely because the page has a CTA;
- `areaServed` values for future Iraq, Oman, or GCC expansion until operationally approved;
- service-level ratings or reviews without a compliant evidence system;
- invented `availableChannel`, hours, response times, or delivery times;
- terms such as “guaranteed lowest price” or “zero risk.”

### 12.3 Example

```json
{
  "@type": "Service",
  "@id": "https://www.example.com/procurement#service",
  "name": "مدیریت خرید آهن پروژه",
  "url": "https://www.example.com/procurement",
  "provider": {
    "@id": "https://www.example.com/#organization"
  },
  "serviceType": "مدیریت خرید و تأمین آهن پروژه"
}
```

The final name and description must come from approved Persian page content.

---

## 13. Material and Category Pages

Material-category pages support procurement decisions. They are not automatically product pages.

### 13.1 Default model

Use:

- `CollectionPage` for the category hub;
- `ItemList` only for the real visible published category list;
- `WebPage` for a category guide;
- an optional `Service` reference when the page genuinely describes procurement support for that category.

### 13.2 Do not use Product schema unless all conditions pass

`Product` may be considered only if a future page:

1. focuses on one specific product or a valid variant family;
2. represents a product actually offered by the merchant;
3. shows accurate, visible product data;
4. contains a real purchase or approved transaction path;
5. maintains price, currency, availability, condition, identifiers, images, and commercial policies where required;
6. passes the relevant current Google Product documentation;
7. is approved as a scope change from the Phase 1 procurement-management model.

Until then, the following are prohibited on material pages:

- `Product`
- `ProductGroup`
- `Offer`
- `AggregateOffer`
- `price`
- `priceCurrency`
- `availability`
- `sku`
- `mpn`
- `gtin`
- `brand` that falsely implies Ahan Asa manufactures the material
- fake product reviews or ratings

### 13.3 ItemList rules

- Emit only published items that appear visibly on the page.
- Do not include reserved or conditional routes.
- Use canonical URLs.
- Preserve the visible order when order matters.
- Rebuild the list when an item is unpublished.
- Do not represent pagination results as one complete list unless the markup and visible experience genuinely support that model.

---

## 14. Article and Insight Schema

Use `Article` or `BlogPosting` for original insight content that has a genuine publication workflow.

### 14.1 Type selection

| Content | Type |
|---|---|
| Evergreen procurement guide | `Article` |
| Editorial blog-style insight | `BlogPosting` |
| Time-sensitive corporate or industry news | `NewsArticle` only after a real news workflow is approved |
| Short resource landing page | `WebPage`, not automatically `Article` |
| Verified authored case narrative | `Article` or `WebPage`, depending on editorial structure |

### 14.2 Recommended article properties

- `@id`
- `headline`
- `description`
- `url`
- `mainEntityOfPage`
- `inLanguage`
- `datePublished`
- `dateModified`
- `author`
- `publisher`
- `image`
- `articleSection`
- `keywords` only when derived from approved taxonomy, not stuffed search terms
- `isPartOf`

### 14.3 Author rules

- Every visible author must appear separately in JSON-LD.
- Use `Person` for a real named person and `Organization` for genuine organizational authorship.
- Do not merge several people into one author name string.
- A person author should have an approved profile or other stable identifying URL when available.
- Do not invent an author, editor, reviewer, credential, or profile.
- Job titles belong in `jobTitle`, not inside `author.name`.
- If no person is approved and Ahan Asa is editorially responsible, use the Ahan Asa organization only if visible authorship supports it.

### 14.4 Publisher rules

Publisher must reference:

```json
{
  "@id": "https://www.example.com/#organization"
}
```

Do not create a separate publisher organization node for the blog.

### 14.5 Article images

For article eligibility and presentation quality:

- images must represent the article;
- URLs must be absolute, crawlable, and indexable;
- provide high-resolution images;
- when available, provide approved 1:1, 4:3, and 16:9 derivatives;
- do not mark a decorative background as the article image;
- do not use a supplier, mill, project, or person image in a misleading context;
- image data must match `MEDIA_GUIDELINES.md`.

### 14.6 Article example

```json
{
  "@type": "Article",
  "@id": "https://www.example.com/insights/example-article#article",
  "headline": "عنوان واقعی مقاله",
  "description": "خلاصه تأییدشده و قابل مشاهده مقاله",
  "url": "https://www.example.com/insights/example-article",
  "mainEntityOfPage": {
    "@id": "https://www.example.com/insights/example-article#webpage"
  },
  "inLanguage": "fa-IR",
  "datePublished": "2026-08-25T09:00:00+03:30",
  "dateModified": "2026-08-25T09:00:00+03:30",
  "author": {
    "@type": "Organization",
    "@id": "https://www.example.com/#organization",
    "name": "آهن آسا",
    "url": "https://www.example.com/"
  },
  "publisher": {
    "@id": "https://www.example.com/#organization"
  },
  "image": [
    "https://www.example.com/media/example-article-1x1.jpg",
    "https://www.example.com/media/example-article-4x3.jpg",
    "https://www.example.com/media/example-article-16x9.jpg"
  ]
}
```

All example values except the brand identity are illustrative and must be replaced by approved content.

---

## 15. Projects and Case Studies

Structured data must not convert an unverified story into evidence.

### 15.1 Publication gate

Before a case-study graph is emitted, verify:

- client naming or anonymization permission;
- project or procurement context;
- Ahan Asa's exact scope;
- location disclosure approval;
- quantities, weights, values, dates, and units;
- images and document rights;
- outcome wording;
- limitations and dependencies;
- publication and review ownership.

### 15.2 Type selection

Use `WebPage` when the page primarily presents a business case. Use `Article` when it is a real authored editorial case narrative with publication dates and article structure.

Do not use an unsupported or ambiguous `Project` type merely because the page is called a project.

### 15.3 Evidence rules

- Do not expose confidential project files, signed URLs, invoice numbers, personal contacts, prices, or client identifiers in JSON-LD.
- Do not infer a client relationship from an image, quote, or internal note.
- Do not mark a testimonial or rating unless consent, source, scale, and current search policy are verified.
- If the visible page anonymizes the client, structured data must remain anonymized.
- Do not publish hidden metrics only in JSON-LD.

---

## 16. Resources and Digital Documents

Use `DigitalDocument` when the detail page describes a real downloadable or viewable resource.

### 16.1 Suitable properties

- `@id`
- `name`
- `description`
- `url`
- `inLanguage`
- `creator`
- `publisher`
- `datePublished`
- `dateModified`
- `version`
- `encodingFormat`
- `contentUrl` only for a stable public file URL
- `license` only when a real license page exists
- `isAccessibleForFree` when accurate

### 16.2 Resource security rules

- Never emit a temporary signed download URL.
- Never emit an internal storage path.
- Never emit a lead's uploaded file URL.
- Never emit a document containing confidential project or commercial data.
- If access is gated, describe the landing page and omit private `contentUrl` values.
- `encodingFormat` must use a real MIME type such as `application/pdf`.
- Version and date fields must match the visible resource metadata.

---

## 17. FAQ Policy After Google Deprecation

Google stopped showing FAQ rich results starting 2026-05-07 and removed the FAQ rich-result documentation in June 2026.

Phase 1 policy:

- keep FAQs visible, useful, indexable, and internally linked;
- use semantic HTML for questions and answers;
- use a normal `WebPage` node for `/faq`;
- do not add `FAQPage` solely for Google rich-result eligibility;
- do not substitute `QAPage` for ordinary business FAQs;
- do not duplicate hidden answers in JSON-LD;
- review this decision only when current search-engine documentation changes or another documented consumer creates real value.

This policy supersedes older planning language that treated FAQ structured data as a likely search enhancement.

---

## 18. Contact and Local Business Policy

### 18.1 ContactPage

The `/contact` route should use `ContactPage` and reference the Ahan Asa organization.

Contact details may be included only when they are:

- verified;
- approved for public use;
- visible on the page;
- formatted consistently;
- maintained by a named owner.

### 18.2 ContactPoint

Suitable fields may include:

- `telephone`
- `email`
- `contactType`
- `availableLanguage`
- `areaServed`

Rules:

- `availableLanguage` must describe languages actually supported through that contact channel.
- Persian Phase 1 content does not prove English or Arabic sales support.
- Do not publish service hours until approved and operationally maintained.
- Do not invent “customer service,” “sales,” or “technical support” distinctions when all channels reach the same person or inbox.

### 18.3 LocalBusiness gate

Do not emit `LocalBusiness` until all of the following are approved:

1. a real customer-facing physical location;
2. the most accurate business subtype;
3. public address;
4. primary phone;
5. opening hours if applicable;
6. geographic coordinates only when accurate and necessary;
7. consistency with the public website and Google Business Profile where applicable.

A national service area does not justify a fake local address.

---

## 19. Localization and Internationalization

### 19.1 Phase 1

- Active locale: Persian `fa-IR`
- Direction: RTL
- Canonical route prefix: none
- `inLanguage`: `fa-IR`
- Site and page names: natural Persian
- Technical URLs: canonical Latin-slug paths from `ROUTES.md`

### 19.2 Future locales

English `/en/**` and Arabic `/ar/**` remain reserved until fully approved.

When a locale launches:

- generate a separate localized page node with its localized canonical URL;
- use the correct BCP 47 language code;
- localize `name`, `headline`, `description`, breadcrumb labels, and visible text;
- reference the same real organization `@id` unless a genuinely separate regional legal entity exists;
- do not duplicate the Persian page `@id`;
- do not emit alternate-locale graphs for 404 or incomplete pages;
- keep hreflang in HTML metadata and sitemap policy; JSON-LD does not replace hreflang.

### 19.3 Organization naming

The organization may use:

- primary Persian `name`: `آهن آسا`
- English `alternateName`: `Ahan Asa`

Do not create a separate organization entity merely because a different script or language is used.

---

## 20. ImageObject Policy

### 20.1 Logo

The organization logo must:

- use the approved master brand mark;
- preserve core geometry;
- be at least 112×112 px;
- use a crawlable and indexable HTTPS URL;
- render clearly on a white background;
- use a supported image format;
- have accurate width and height;
- avoid text or padding that makes the mark unreadable at small sizes.

Use a stable asset URL. Do not point schema to a temporary build hash unless the deployment guarantees long-term asset persistence.

### 20.2 Primary page image

Use `primaryImageOfPage` only when the page has a genuine primary image. Do not force a logo, decorative texture, gradient, or background video poster into this role.

### 20.3 Rights and representation

Structured data must not claim ownership or creator status without proof. If image-rights metadata is implemented, it must align with current Google image-metadata requirements and real licensing data.

---

## 21. VideoObject Policy

Use `VideoObject` only when a real video is a substantial part of the page.

Required operational inputs include:

- visible video;
- `name`;
- accurate `description`;
- crawlable `thumbnailUrl`;
- `uploadDate`;
- `duration` in ISO 8601 when known;
- stable `contentUrl` or `embedUrl` as appropriate;
- correct page association;
- rights to publish the video.

Do not mark:

- ambient hero loops;
- decorative motion backgrounds;
- hidden videos;
- third-party videos without accurate attribution or embedding rights;
- placeholders that have no playable asset.

---

## 22. Noindex and Non-Public Routes

Structured data must not expose or enrich routes that are intentionally non-public.

### 22.1 Omit page schema from

- `/request/confirmation` or equivalent success route;
- future private request-status pages;
- error pages;
- 404 pages;
- maintenance pages;
- preview URLs;
- staging hosts;
- API and webhook endpoints;
- internal search or filter states with no canonical page;
- reserved locales;
- unpublished conditional routes.

### 22.2 Request page

`ROUTES.md` currently marks `/request` as `noindex, follow`. Do not add rich-result-focused schema to this page. The page may reference basic site identity only if the implementation architecture requires it, but it must not include:

- form values;
- uploaded filenames;
- inquiry details;
- lead identity;
- confirmation numbers;
- private contact preferences;
- hidden commercial data.

---

## 23. Prohibited and High-Risk Patterns

Claude Code must not implement any of the following without an approved specification change:

### 23.1 Fabricated business identity

- guessed legal name;
- guessed company registration number;
- fake address;
- fake founding date;
- fake number of employees;
- fake offices or service regions;
- fake certificates or memberships.

### 23.2 Misleading commerce markup

- product schema on generic steel category pages;
- offer schema without a real offer;
- price or availability copied from a temporary quotation;
- `InStock` based on supplier availability not owned or guaranteed by Ahan Asa;
- manufacturer or brand claims for third-party steel;
- fake SKU, GTIN, MPN, or catalog identifiers.

### 23.3 Review abuse

- self-authored five-star reviews;
- organization aggregate ratings taken from unrelated platforms;
- ratings without visible reviews;
- selected testimonials converted into an aggregate score;
- review markup for an entity type not eligible under current policy.

### 23.4 Hidden or mismatched content

- JSON-LD descriptions not visible or supported on the page;
- keyword lists disguised as `knowsAbout`, `serviceType`, or `keywords`;
- FAQ answers hidden from users;
- project metrics absent from visible evidence;
- authors not shown on the page;
- old dates shown as recently modified after every deployment.

### 23.5 Duplicate and conflicting graphs

- multiple organization nodes with different IDs;
- two page nodes with conflicting canonical URLs;
- plugins and custom code emitting overlapping schemas;
- client-side markup that changes after hydration;
- hardcoded apex URLs mixed with `www` URLs;
- Persian and future-locale pages sharing the same page `@id`.

### 23.6 Unsafe serialization

- direct interpolation of user input into a `<script>` tag;
- unescaped `<`, `</script>`, U+2028, or U+2029 sequences;
- JSON generated from raw form data;
- private content included in schema debug output.

---

## 24. Content-Model Requirements

The content layer should expose structured-data-safe fields explicitly. Do not build schema by scraping rendered HTML.

### 24.1 Global site settings

```ts
type SiteSchemaSettings = {
  canonicalOrigin: string;
  defaultLocale: "fa-IR";
  siteName: "آهن آسا";
  alternateSiteNames: string[];
  organizationName: "آهن آسا";
  organizationAlternateName: "Ahan Asa";
  organizationDescription?: string;
  slogan?: string;
  logo: {
    url: string;
    width: number;
    height: number;
  };
  legalName?: string;
  publicEmail?: string;
  publicTelephone?: string;
  publicAddress?: PostalAddressInput;
  sameAs?: string[];
  activeAreaServed?: string[];
};
```

### 24.2 Page schema input

```ts
type PageSchemaInput = {
  canonicalUrl: string;
  locale: string;
  title: string;
  description?: string;
  pageType:
    | "WebPage"
    | "AboutPage"
    | "ContactPage"
    | "CollectionPage";
  breadcrumbs?: BreadcrumbInput[];
  primaryImage?: ImageInput;
  datePublished?: string;
  dateModified?: string;
  noindex: boolean;
};
```

### 24.3 Article schema input

```ts
type ArticleSchemaInput = {
  canonicalUrl: string;
  articleType: "Article" | "BlogPosting";
  headline: string;
  description?: string;
  locale: string;
  datePublished: string;
  dateModified?: string;
  authors: AuthorInput[];
  images: ImageInput[];
  section?: string;
  approvedKeywords?: string[];
};
```

### 24.4 Service schema input

```ts
type ServiceSchemaInput = {
  canonicalUrl: string;
  name: string;
  description?: string;
  serviceType?: string;
  areaServed?: string[];
  audience?: string[];
  status: "approved" | "draft" | "archived";
};
```

### 24.5 Validation invariants

- `canonicalOrigin` must be a valid production HTTPS URL.
- Production must reject `localhost`, preview, and example domains.
- `noindex: true` must prevent rich-result page nodes from being emitted.
- Empty arrays and empty strings must be removed.
- Invalid dates must fail validation.
- Relative URLs must be normalized centrally or rejected.
- Unapproved services and content must not generate nodes.
- An unpublished child must not appear in an `ItemList`.

---

## 25. Recommended Next.js Architecture

Suggested file structure:

```text
lib/
  seo/
    schema/
      constants.ts
      ids.ts
      organization.ts
      website.ts
      webpage.ts
      breadcrumb.ts
      service.ts
      article.ts
      resource.ts
      graph.ts
      sanitize.ts
      validate.ts
      types.ts
components/
  seo/
    JsonLd.tsx
```

### 25.1 Architecture rules

- Schema builders must be pure functions.
- Page templates provide typed content inputs.
- URL creation must use the canonical route registry.
- Schema nodes must be composed into one `@graph` where practical.
- Avoid one independent `<script>` per minor entity.
- Do not fetch schema data separately from visible page data.
- Render schema on the server in the initial HTML.
- Do not use a client component unless a documented constraint requires it.
- Do not use runtime form or browser data to generate public JSON-LD.
- Production builds should fail on invalid mandatory schema inputs for indexable pages.

### 25.2 Safe JSON-LD component

```tsx
type JsonLdProps = {
  data: Record<string, unknown>;
};

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
```

The component may use `dangerouslySetInnerHTML` only with controlled, validated data passed through safe JSON serialization. Never pass raw HTML or raw user input.

### 25.3 Graph composer

```ts
type SchemaNode = Record<string, unknown> & {
  "@type": string | string[];
  "@id"?: string;
};

export function createSchemaGraph(nodes: SchemaNode[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}
```

Production code must also validate duplicate `@id` values and remove undefined properties recursively.

---

## 26. Page Graph Composition Rules

### 26.1 Homepage graph

Include:

1. `Organization`
2. `WebSite`
3. homepage `WebPage`
4. approved logo `ImageObject`
5. optional primary page image

### 26.2 About page graph

Include:

1. `AboutPage`
2. `BreadcrumbList`
3. organization reference

The full organization node may be included if the page contains approved organization details not present on the homepage, but the same `@id` must be used.

### 26.3 Service page graph

Include:

1. `WebPage`
2. `BreadcrumbList`
3. one primary `Service`
4. optional primary image

The WebPage `mainEntity` references the Service. The Service `mainEntityOfPage` references the WebPage.

### 26.4 Hub graph

Include:

1. `CollectionPage`
2. `BreadcrumbList`
3. optional `ItemList`

Only create an `ItemList` when the visible hub contains a meaningful list of published items.

### 26.5 Article graph

Include:

1. `WebPage`
2. `BreadcrumbList`
3. `Article` or `BlogPosting`
4. referenced publisher organization
5. approved authors
6. primary images

### 26.6 Resource graph

Include:

1. `WebPage`
2. `BreadcrumbList`
3. `DigitalDocument` when applicable
4. publisher or creator reference
5. approved resource image or preview

---

## 27. Environment and Deployment Rules

### 27.1 Development

- Local builds may generate schema for testing.
- Localhost URLs must never be accepted in production output.
- Test fixtures must use `https://www.example.com`, never real unapproved values.

### 27.2 Preview deployments

- Preview hosts must be `noindex`.
- Preview URLs must not appear in production structured data.
- A preview must not use the production canonical origin unless the page accurately simulates production metadata and is blocked from indexing.

### 27.3 Production

- Enforce one canonical HTTPS origin.
- Ensure schema is present in initial HTML.
- Ensure referenced assets return successful responses.
- Do not include draft nodes.
- Do not include routes absent from the production release manifest.
- Ensure Cloudflare, Vercel, and application redirects do not create mixed host IDs.

---

## 28. Automated Validation

### 28.1 Unit tests

Test each schema builder for:

- correct `@type`;
- stable `@id`;
- exact canonical URL;
- omission of empty fields;
- omission of unapproved fields;
- correct language;
- valid dates;
- safe serialization;
- correct references;
- duplicate ID detection.

### 28.2 Route-level integration tests

For representative routes, assert:

- exactly one canonical URL;
- exactly one primary WebPage node;
- one stable organization ID;
- breadcrumb parity;
- no example, localhost, preview, or staging domains;
- no JSON parsing errors;
- no schema on prohibited routes;
- no `Product`, `Offer`, `AggregateRating`, `FAQPage`, or `HowTo` unless a later approved exception exists;
- no draft or archived items in lists;
- no private data.

### 28.3 Build-time validation

The production build should fail when:

- the canonical origin is missing or invalid;
- an indexable page has an invalid canonical URL;
- JSON-LD cannot be serialized;
- required article dates or authors are missing;
- a duplicate conflicting `@id` exists;
- an absolute asset URL is invalid;
- a forbidden placeholder appears;
- a conditional entity is emitted without approved status.

### 28.4 Recommended forbidden-string scan

Scan rendered output for:

```text
example.com
localhost
127.0.0.1
vercel.app
TBD
TODO
lorem ipsum
undefined
null
```

`null` may occur in unrelated application data; the schema-specific scan should ensure no null property is emitted in JSON-LD.

---

## 29. Manual Validation and Release Workflow

For each new schema template:

1. Validate the data source and publication status.
2. Compare JSON-LD with visible page content.
3. Parse the JSON locally.
4. Validate vocabulary with Schema.org Validator.
5. Test Google-supported types with Rich Results Test.
6. Deploy a small representative set.
7. Inspect the live rendered HTML.
8. Use Google Search Console URL Inspection on live canonical URLs.
9. Confirm crawlability of images and referenced URLs.
10. Monitor enhancement and unparsable structured-data reports.
11. Expand to the full template only after errors are resolved.

Do not treat a green syntax test as proof of policy compliance. A graph may be syntactically valid and still be misleading, invisible, outdated, or ineligible.

---

## 30. QA Checklist

### 30.1 Identity

- [ ] `Organization` uses `${origin}/#organization` everywhere.
- [ ] `name` is `آهن آسا`.
- [ ] `alternateName` uses only approved alternatives.
- [ ] Legal identity fields are verified or omitted.
- [ ] Contact and address fields are verified and visible.
- [ ] `sameAs` contains only official same-entity profiles.
- [ ] Logo is approved, crawlable, indexable, and at least 112×112 px.

### 30.2 URLs

- [ ] All URLs are absolute HTTPS URLs.
- [ ] All URLs use the approved canonical host.
- [ ] JSON-LD URLs match metadata canonicals.
- [ ] No tracking parameters appear.
- [ ] No draft route aliases appear.
- [ ] No redirect chains are required to reach schema URLs.

### 30.3 Pages

- [ ] Each indexable page has one primary page node.
- [ ] Page `name` and `description` match visible content.
- [ ] `inLanguage` is correct.
- [ ] Breadcrumbs match visible hierarchy.
- [ ] Main entity matches the page's dominant purpose.
- [ ] No rich-result markup appears on noindex or system pages.

### 30.4 Content types

- [ ] Articles have real dates, authors, publisher, and images.
- [ ] Services describe approved operating scope.
- [ ] Category pages do not impersonate product pages.
- [ ] Item lists contain only visible published items.
- [ ] Case facts and metrics are verified.
- [ ] Resources use stable public URLs and correct MIME types.
- [ ] FAQ content is visible, but no obsolete FAQ rich-result tactic is used.

### 30.5 Safety and quality

- [ ] JSON parses successfully.
- [ ] Serialization escapes unsafe characters.
- [ ] No raw user or form data enters JSON-LD.
- [ ] No private URLs or records appear.
- [ ] No fabricated reviews, ratings, prices, stock, awards, or certificates appear.
- [ ] No placeholder or example domain appears in production.
- [ ] No duplicate conflicting `@id` exists.
- [ ] Structured data is present in initial HTML.

### 30.6 Search validation

- [ ] Schema.org validation passes for vocabulary and structure.
- [ ] Google Rich Results Test passes for supported types.
- [ ] Live URL Inspection confirms Google sees the markup.
- [ ] Search Console reports are monitored after release.
- [ ] Documentation changes are reviewed at least quarterly.

---

## 31. Monitoring and Maintenance

### 31.1 Ownership

Assign named owners for:

- business identity data;
- legal identity and contact information;
- canonical host and route registry;
- article authorship and dates;
- service scope;
- projects and evidence;
- resources and file metadata;
- technical schema implementation;
- Search Console monitoring.

### 31.2 Review cadence

| Trigger | Required action |
|---|---|
| New route or template | Review page-to-schema mapping before development |
| New locale | Review all IDs, URLs, names, breadcrumbs, and language codes |
| Domain or host change | Update the single origin source and verify every graph reference |
| Business identity change | Update organization data and visible content together |
| New office or contact channel | Verify before adding Organization or LocalBusiness fields |
| New service | Approve scope and content before emitting `Service` |
| New article workflow | Validate author, date, image, and publisher inputs |
| New product or price feature | Create a separate Product/Offer decision document |
| Google documentation change | Reassess supported types and deprecated features |
| Search Console error increase | Triage template, content source, and deployment changes |

### 31.3 Change discipline

Any material schema change must record:

- date;
- affected templates and routes;
- old and new behavior;
- reason;
- source or policy basis;
- migration or recrawl implications;
- validation evidence;
- responsible owner.

---

## 32. Pre-Launch Decisions Required

The following values remain unresolved and must not be invented:

| Decision | Required before | Current fallback |
|---|---|---|
| Canonical apex or `www` host | Any production JSON-LD | Build from one validated environment value; fail production if absent |
| Registered legal entity name | `legalName` or legal identifiers | Omit |
| Public business address | `address` or `LocalBusiness` | Omit |
| Verified public phone | `telephone` and `contactPoint` | Omit |
| Verified public email | `email` and `contactPoint` | Omit |
| Official social profiles | `sameAs` | Omit |
| Active geographic service coverage | `areaServed` | Omit |
| Exact approved service inventory | Individual `Service` nodes | Emit only approved current service pages |
| Exact steel category inventory | Category `ItemList` | Emit only published categories |
| Verified case-study inventory | Project graphs | Do not emit unpublished or unverified cases |
| Author and reviewer policy | Article graphs | Use only visible approved authorship |
| Final public resource inventory | `DigitalDocument` graphs | Emit only real public resources |
| Final logo asset URL and dimensions | Organization logo | Block full production organization graph until approved asset exists |
| Future locale activation | Localized graphs | Return 404 and emit no graph |

---

## 33. Acceptance Criteria

`STRUCTURED_DATA.md` is correctly implemented when:

1. The production homepage emits one coherent graph for Ahan Asa, the website, and the homepage.
2. The organization uses one stable `@id` across the entire site.
3. Every indexable page uses its exact canonical URL and language.
4. Breadcrumb schema matches visible breadcrumbs.
5. Article schema is generated only from approved editorial data.
6. Service schema reflects real service scope without prices, guarantees, or future markets.
7. Material pages are not falsely marked as purchasable products.
8. No obsolete FAQ rich-result tactic is used.
9. No schema is emitted for private, confirmation, error, preview, API, or reserved-locale routes.
10. No placeholder, fabricated, private, or contradictory data appears.
11. JSON-LD is server-rendered, safely serialized, parseable, and validated.
12. Automated tests prevent canonical-host, duplicate-ID, forbidden-type, and placeholder regressions.
13. Representative live URLs pass the relevant Google and Schema.org validation workflows.
14. Search Console monitoring and ownership are defined before launch.

---

## 34. Claude Code Implementation Directive

Claude Code must follow this sequence:

1. Read the required project documents.
2. Resolve the canonical route and metadata source.
3. Create the typed schema data model.
4. Implement stable identifier helpers.
5. Implement safe JSON-LD serialization.
6. Build the minimum homepage graph using verified values only.
7. Add page and breadcrumb builders.
8. Add Service, Article, Collection, and Resource builders only for approved templates.
9. Add automated validation and forbidden-pattern tests.
10. Inspect representative server-rendered HTML.
11. Validate deployed canonical pages.
12. Record unresolved inputs without publishing placeholders.

Claude Code must stop and request a decision instead of guessing when a task requires:

- legal identity;
- canonical host choice;
- contact details;
- active service area;
- product or price markup;
- reviews or ratings;
- client or project evidence;
- authorship;
- a new locale;
- a business subtype more specific than verified facts allow.

---

## 35. Authoritative References

Reviewed on 2026-08-25:

- Google Search Central — Structured data introduction:  
  `https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data`
- Google Search Central — Supported structured-data features:  
  `https://developers.google.com/search/docs/appearance/structured-data/search-gallery`
- Google Search Central — Organization structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/organization`
- Google Search Central — Site names:  
  `https://developers.google.com/search/docs/appearance/site-names`
- Google Search Central — Breadcrumb structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/breadcrumb`
- Google Search Central — Article structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/article`
- Google Search Central — Product structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/product`
- Google Search Central — Merchant listing structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/merchant-listing`
- Google Search Central — LocalBusiness structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/local-business`
- Google Search Central — Documentation updates and FAQ deprecation:  
  `https://developers.google.com/search/updates`
- Schema.org — Organization:  
  `https://schema.org/Organization`
- Schema.org — WebSite:  
  `https://schema.org/WebSite`
- Schema.org — WebPage:  
  `https://schema.org/WebPage`
- Schema.org — Service:  
  `https://schema.org/Service`
- Schema.org — BreadcrumbList:  
  `https://schema.org/BreadcrumbList`
- Schema.org — Article:  
  `https://schema.org/Article`
- Schema.org — DigitalDocument:  
  `https://schema.org/DigitalDocument`

Search-engine support changes over time. Recheck official documentation before adding a new schema type or relying on a rich-result feature.

---

## 36. Final Rule

> If a fact is not verified, omit it. If a page does not visibly support a claim, do not encode it. If a schema type changes what Ahan Asa appears to be, require explicit approval before implementation.

