# Ahan Asa Website — Structured Data and JSON-LD Specification

> **File:** `STRUCTURED_DATA.md`  
> **Project:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Status:** Normative implementation specification — v2.0  
> **Last updated:** 2026-08-26  
> **Primary locale:** Persian (`fa-IR`), RTL  
> **Serialization:** JSON-LD with Schema.org vocabulary

---

## 1. Purpose

This document defines how Ahan Asa generates, validates, publishes, caches, and maintains structured data.

It covers:

- business identity;
- website and page entities;
- breadcrumbs;
- articles;
- steel categories, products, and selected variants;
- selected public price pages;
- conditional `Offer` markup;
- source-of-truth boundaries between the Website, D1, and Odoo;
- server-rendering, cache consistency, security, QA, and monitoring.

Structured data exists to describe verified, visible facts. It must not be used to create hidden SEO copy, imply stock or purchase terms that Ahan Asa cannot honor, expose private ERP/RFQ data, or manufacture rich-result eligibility.

---

## 2. Business and Platform Context

Ahan Asa is a premium B2B steel procurement management and project-purchasing platform. Its approved public slogan is:

> **ما مراقب سرمایه شما هستیم.**

The website supports:

- indexable corporate and editorial pages;
- steel category and product discovery;
- selected public price snapshots;
- structured RFQ submission;
- file-assisted RFQ submission;
- customer, CRM, quotation, and sales workflows in Odoo.

The website is not assumed to be:

- a checkout-based online store;
- a marketplace containing independent merchant offers;
- a guaranteed real-time stock board;
- a manufacturer of third-party steel products;
- a source of binding commercial terms unless a page explicitly publishes an approved offer.

### 2.1 System-of-record rule

```text
Odoo = commercial source of truth
Website CMS = editorial and SEO source of truth
D1 = published public read model
Cloudflare cache = delivery layer
```

Odoo owns commercial products, variants, units, current prices, customers, CRM records, quotations, sales, inventory, purchasing, and accounting.

The Website CMS owns slugs, SEO titles, descriptions, editorial copy, article content, page indexability, canonical policy, structured-data overrides, and public publishing approval.

D1 contains only the published projection needed by the public website. Public page rendering and JSON-LD generation must never synchronously call `odoo.ahanassa.com`.

---

## 3. Authority and Dependencies

Implement this specification together with:

- `PROJECT_BRIEF.md`
- `DECISIONS.md`
- `ROUTES.md`
- `CONTENT_MODEL.md`
- `TECHNICAL_ARCHITECTURE.md`
- `SYSTEM_OF_RECORD.md`
- `ODOO_INTEGRATION.md`
- `SYNC_STRATEGY.md`
- `PRODUCT_CATALOG_SPEC.md`
- `PRICING_SYSTEM.md`
- `CMS_ARCHITECTURE.md`
- `SEO_STRATEGY.md`
- `METADATA_SPEC.md`
- `HREFLANG_CANONICAL.md`
- `SITEMAP_ROBOTS_SPEC.md`
- `IMAGE_OPTIMIZATION.md`
- `SECURITY_GUIDELINES.md`
- `TESTING_STRATEGY.md`
- `SEO_QA_CHECKLIST.md`

### 3.1 Conflict order

When documents conflict, apply this order:

1. law, privacy, security, accessibility, and verified business facts;
2. explicit decisions in `DECISIONS.md`;
3. `SYSTEM_OF_RECORD.md` and Odoo commercial truth;
4. `ROUTES.md`, `METADATA_SPEC.md`, and `HREFLANG_CANONICAL.md`;
5. `PRODUCT_CATALOG_SPEC.md` and `PRICING_SYSTEM.md`;
6. this document;
7. other implementation notes.

Do not guess unresolved legal identity, canonical host, contact details, active markets, product identity, price validity, currency, unit, availability, manufacturer, brand, author, rating, or publication date.

Never emit `TBD`, `TODO`, empty strings, placeholder domains, preview URLs, or fabricated fallbacks in production JSON-LD.

---

## 4. Core Rules

### 4.1 Truth before coverage

Emit a smaller accurate graph instead of a larger speculative graph.

Every property must be:

- verified;
- current enough for its use;
- approved for public disclosure;
- supported by visible page content;
- obtained from a controlled data source;
- consistent with canonical metadata;
- valid for its Schema.org type.

### 4.2 One visible snapshot

Visible HTML and JSON-LD must be generated from the same resolved page snapshot.

For a price page, the following must share one `snapshotVersion`:

```text
visible product name
visible variant and unit
visible numeric price
visible currency
visible update/validity state
Product node
Offer node, when eligible
```

Do not render the HTML from one D1 row and the JSON-LD from a later Odoo or API response.

### 4.3 One real entity, one stable ID

Use stable canonical `@id` values. Do not create different IDs for the same organization or the same product merely because it appears on several pages.

### 4.4 Page-specific graphs

Do not inject the entire catalog graph through the root layout. Each route emits only the entities needed to describe that page.

### 4.5 Server-rendered JSON-LD

JSON-LD must be present in initial HTML for public indexable pages. It must not depend on hydration, browser API calls, Odoo availability, user interaction, or client-side state.

### 4.6 No private data

Never serialize:

- customer or lead identity;
- RFQ contents;
- uploaded filenames or attachment URLs;
- quotation or sale-order data;
- private Odoo IDs;
- supplier records;
- internal cost, margin, or stock data;
- API keys, queue messages, sync errors, or audit-log details.

---

## 5. Phase 1 Schema Policy

| Type | Decision | Primary use |
|---|---|---|
| `Organization` | Required | Verified Ahan Asa identity on homepage |
| `WebSite` | Required | Canonical site identity on homepage |
| `WebPage` and valid subtypes | Required on indexable pages | Page identity and graph relationships |
| `BreadcrumbList` | Required where visible | Non-home canonical hierarchy |
| `Article` / `BlogPosting` | Required for qualifying articles | Editorial content |
| `Product` | Conditional | A specific published steel product or indexable variant |
| `Offer` | Strictly conditional | A real, visible, approved, fresh public commercial offer |
| `CollectionPage` | Supported | Category, article, resource, and product hubs |
| `ItemList` | Conditional | A visible list of published items |
| `ImageObject` | Conditional | Logo or genuine primary image |
| `Service` | Conditional | A real approved procurement service |
| `ContactPage` / `AboutPage` | Supported | Matching public pages |
| `DigitalDocument` | Conditional | A real public resource |
| `ProductGroup` | Deferred by default | Enable only after variant URL and product-family policy is approved |
| `AggregateOffer` | Prohibited by default | Ahan Asa does not aggregate independent merchant offers |
| `AggregateRating` / `Review` | Prohibited by default | No approved compliant first-party rating system |
| `FAQPage` | Do not use as an SEO tactic | Keep FAQs visible in HTML; reassess only after a policy review |
| `HowTo` | Prohibited for procurement workflow | The business process is not a user-executable how-to |
| `LocalBusiness` | Deferred | Requires verified public location and operating details |
| `OnlineStore` | Prohibited | The approved experience is not a checkout store |
| `SearchAction` | Omit | Add only if a real maintained site search and current use case exist |

Structured-data validity creates eligibility, not a guarantee of enhanced search appearance.

---

## 6. Canonical URLs and Entity IDs

All URLs must come from one validated server-side configuration value:

```text
SITE_URL=https://<approved-canonical-host>
```

Do not depend on an unvalidated public environment variable inside schema builders.

Every emitted URL must:

- be absolute HTTPS;
- use the approved canonical host and path;
- exclude UTM and other tracking parameters;
- exclude filter/query states unless they are approved canonical pages;
- follow the global trailing-slash policy;
- avoid unnecessary redirects;
- be crawlable when public crawlability is required.

### 6.1 Required ID patterns

| Entity | Pattern |
|---|---|
| Organization | `${origin}/#organization` |
| Website | `${origin}/#website` |
| Homepage | `${origin}/#webpage` |
| Internal page | `${canonicalUrl}#webpage` |
| Breadcrumb | `${canonicalUrl}#breadcrumb` |
| Article | `${canonicalUrl}#article` |
| Product family | `${productCanonicalUrl}#product` |
| Product variant | `${variantCanonicalUrl}#product` |
| Offer | `${canonicalUrl}#offer` |
| Service | `${canonicalUrl}#service` |
| Resource | `${canonicalUrl}#resource` |
| Primary image | `${canonicalUrl}#primaryimage` |
| Logo | `${origin}/#logo` |

Public `@id` values must never contain Odoo record IDs, D1 row IDs, RFQ IDs, UUIDs, emails, phone numbers, or mutable price values.

### 6.2 Canonical parity invariant

For every indexable page:

```text
metadata canonical
= Open Graph URL
= sitemap URL
= WebPage.url
= WebPage @id before #webpage
```

Localized pages receive distinct localized page IDs. They may reference the same real organization ID.

---

## 7. Data Provenance and Publication Gates

### 7.1 Field ownership

| Structured-data field | Source | Gate |
|---|---|---|
| Organization identity | approved site settings | verified and public |
| Canonical URL | route registry | indexable canonical route |
| Page title/description | Website CMS | published locale version |
| Breadcrumbs | route hierarchy | visible and canonical |
| Article content/dates/authors | Website CMS | published and approved |
| Product commercial name/code | Odoo projection in D1 | synchronized and published |
| Product SEO name/description/slug | Website CMS/D1 | published locale version |
| Variant attributes and UOM | Odoo projection in D1 | synchronized and mapped |
| Public price | Odoo projection in D1 | approved, complete, and fresh |
| Price validity | pricing policy/D1 | not expired |
| Availability | Odoo projection in D1 | explicit and safe to promise |
| Images | R2/approved media model | public, relevant, crawlable |

### 7.2 Generic emission gate

An entity may be emitted only if:

```ts
published === true
&& indexable === true
&& localeStatus === "published"
&& canonicalUrlIsValid === true
&& visibleContentParity === true
&& validationErrors.length === 0
```

### 7.3 Product gate

Emit `Product` only when the page is primarily about one identifiable product or approved indexable variant and includes visible product facts.

Minimum internal gate:

```ts
schemaEligibility.product === "eligible"
&& catalogStatus === "published"
&& commercialIdentityStatus === "verified"
&& seoContentStatus === "published"
```

Category hubs, search results, filters, comparison tables, RFQ rows, and generic price lists are not automatically `Product` pages.

### 7.4 Offer gate

`Offer` is opt-in, never inferred merely because a numeric price exists.

Emit it only when all conditions pass:

```ts
publicPrice.status === "published"
&& publicPrice.kind === "firm_offer"
&& publicPrice.approvalStatus === "approved"
&& publicPrice.isFresh === true
&& publicPrice.isExpired === false
&& publicPrice.amount !== null
&& publicPrice.currencyIso4217 !== null
&& publicPrice.unit !== null
&& pageShowsExactSameCommercialTerms === true
&& productCanActuallyBeRequestedOrPurchased === true
```

Omit `Offer` when the price is:

- indicative;
- historical;
- “call for price”;
- a range without a real aggregate-offer model;
- stale or expired;
- pending approval;
- based on an incomplete sync;
- customer-specific;
- dependent on hidden minimum order, tax, freight, destination, or payment terms;
- shown in a non-ISO currency presentation without an approved exact machine-readable conversion.

When the numeric value is hidden from users, it must also be absent from JSON-LD.

### 7.5 Availability gate

Do not infer `InStock` from:

- the existence of a product in Odoo;
- supplier availability;
- a recent price;
- the ability to request a quotation;
- a nonzero quantity not approved for public disclosure.

Omit `availability` unless a specific public state is maintained and Ahan Asa can operationally support the claim.

---

## 8. Currency and Unit Rules

Google product markup uses ISO 4217 currency codes. “Toman” is not an ISO 4217 code.

For Iranian pricing:

- use `IRR` in `priceCurrency`;
- encode the price amount in Iranian rials;
- if the UI displays tomans, make the exact rial equivalent visible or programmatically accessible in the same price block;
- use the exact approved conversion rule of `1 toman = 10 IRR`;
- never label a toman amount as `IRR` without multiplying by ten;
- do not use invented values such as `IRT` or `TOM` in `priceCurrency`.

Example:

```text
Visible: 67,850 تومان / کیلوگرم
Visible equivalence: 678,500 ریال / کیلوگرم
JSON-LD price: 678500
JSON-LD priceCurrency: IRR
```

If the product is priced per kilogram, ton, sheet, branch, meter, or another unit, the visible page must state the unit. Do not encode a per-kilogram amount as if it were the price of one complete product item.

For nontrivial unit pricing, use `UnitPriceSpecification` only after current Google and Schema.org validation confirms the chosen unit-code representation. Until then, prefer omitting `Offer` over publishing ambiguous unit pricing.

---

## 9. Organization, WebSite, and Homepage

### 9.1 Organization

Use one conservative `Organization` node.

Approved minimum:

- `@type`: `Organization`;
- `@id`: `${origin}/#organization`;
- `name`: `آهن آسا`;
- `alternateName`: `Ahan Asa`;
- `url`: canonical homepage;
- approved logo;
- approved public description;
- slogan only when visible and approved.

Conditional, verified fields include:

- `legalName`;
- `email`;
- `telephone`;
- `contactPoint`;
- `address`;
- `sameAs`;
- `taxID` or other legal identifiers;
- `foundingDate`;
- `areaServed`.

Do not model expansion goals as active service coverage. Do not use a private mobile number, guessed legal name, guessed address, or unverified social profile.

### 9.2 WebSite

Use `WebSite` on the canonical homepage with:

- stable website ID;
- canonical URL;
- Persian and approved alternate site names;
- `inLanguage: fa-IR` for Phase 1;
- `publisher` referencing the organization.

### 9.3 Homepage graph example

Documentation examples use `example.com`. Production validation must reject it.

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
        "url": "https://www.example.com/media/ahan-asa-logo.png",
        "contentUrl": "https://www.example.com/media/ahan-asa-logo.png",
        "width": 512,
        "height": 512
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://www.example.com/#website",
      "url": "https://www.example.com/",
      "name": "آهن آسا",
      "alternateName": "Ahan Asa",
      "inLanguage": "fa-IR",
      "publisher": { "@id": "https://www.example.com/#organization" }
    },
    {
      "@type": "WebPage",
      "@id": "https://www.example.com/#webpage",
      "url": "https://www.example.com/",
      "name": "آهن آسا",
      "inLanguage": "fa-IR",
      "isPartOf": { "@id": "https://www.example.com/#website" },
      "about": { "@id": "https://www.example.com/#organization" }
    }
  ]
}
```

---

## 10. WebPage and Breadcrumb Rules

Every canonical indexable page must have exactly one primary `WebPage` node or correct subtype.

Recommended fields:

- `@id`;
- `url`;
- `name`;
- `description` when approved;
- `inLanguage`;
- `isPartOf`;
- `breadcrumb` when a visible breadcrumb exists;
- `primaryImageOfPage` when a genuine primary image exists;
- `mainEntity` when the page has one dominant entity.

`dateModified` must represent a meaningful public content change. Do not set it to build time, deploy time, cache purge time, or price-sync time unless the visible page content actually changed accordingly.

### 10.1 BreadcrumbList

- must match the visible breadcrumb;
- must use canonical absolute URLs;
- positions start at `1` and have no gaps;
- Persian pages use natural Persian labels;
- the last item represents the current page;
- filter states, tabs, overlays, and form steps are excluded unless they are canonical pages;
- do not emit on homepage, noindex utilities, confirmations, errors, previews, admin, or APIs.

```json
{
  "@type": "BreadcrumbList",
  "@id": "https://www.example.com/steel/rebar/a3/16#breadcrumb",
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
      "name": "محصولات فولادی",
      "item": "https://www.example.com/steel"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "میلگرد",
      "item": "https://www.example.com/steel/rebar"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "میلگرد A3 سایز 16",
      "item": "https://www.example.com/steel/rebar/a3/16"
    }
  ]
}
```

Paths are illustrative; `ROUTES.md` remains authoritative.

---

## 11. Page-to-Schema Matrix

| Page family | Primary page node | Main/supporting entities | Price markup |
|---|---|---|---|
| Homepage | `WebPage` | `Organization`, `WebSite`, logo | None |
| About | `AboutPage` | Organization reference | None |
| Contact | `ContactPage` | Verified organization/contact data | None |
| Procurement/service page | `WebPage` | Conditional `Service` | None |
| Steel catalog hub | `CollectionPage` | Optional visible `ItemList` | None |
| Steel category | `CollectionPage` or `WebPage` | Optional visible `ItemList` | No `Offer` |
| Specific product family | `WebPage` | Conditional `Product` | Only if the offer gate passes |
| Indexable product variant | `WebPage` | `Product` | Only if the offer gate passes |
| Price hub/list | `CollectionPage` | Optional `ItemList`; no bulk hidden products | No offer unless each visible item independently qualifies |
| Dedicated product-price page | `WebPage` | `Product`, conditional `Offer` | Strict freshness and parity gate |
| Article hub | `CollectionPage` | Optional visible `ItemList` | None |
| Article detail | `WebPage` | `Article` or `BlogPosting` | None |
| Resource detail | `WebPage` | Conditional `DigitalDocument` | None |
| RFQ form | none or minimal `WebPage` | No RFQ or customer entity | None |
| RFQ confirmation/status | None | None | None |
| Admin/account/API/webhook | None | None | None |
| Search/filter/query state | None by default | None | None |
| 404/error/maintenance/preview | None | None | None |

---

## 12. Product Modeling

### 12.1 Category is not Product

A category such as “میلگرد” or “تیرآهن” is not a single purchasable product. Category pages must not receive a fabricated SKU, price, availability, brand, or `Product` node.

### 12.2 Product identity

Use `Product` for one specific commercial product or approved variant page. Recommended properties when visible and verified:

- `@id`;
- `name`;
- `description`;
- `url`;
- `image`;
- public `sku` or commercial code;
- `brand` only for the true manufacturer/brand;
- `manufacturer` only when verified;
- `material` when meaningful;
- `size` when the page is variant-specific;
- `additionalProperty` for visible technical attributes;
- conditional `offers`.

Never set Ahan Asa as `brand` or `manufacturer` merely because it procures or sells the item.

Internal Odoo product IDs may support joins but must not appear as public `sku`, `mpn`, `gtin`, or `@id`.

### 12.3 Variant policy

Phase 1 may model each indexable business-relevant variant as a standalone `Product`. Do not automatically expose every combinatorial Odoo variant as an indexable page.

Enable `ProductGroup`, `variesBy`, `hasVariant`, and `isVariantOf` only after:

- canonical single-page versus multi-page variant behavior is fixed;
- product-family identifiers are public and stable;
- all listed variants are visible and published;
- the output passes current variant validation;
- `PRODUCT_CATALOG_SPEC.md` approves the model.

### 12.4 Product without Offer

A valid Schema.org `Product` node may be emitted without `Offer` for semantic understanding when the page is genuinely product-focused. It will not satisfy Google product-snippet eligibility through an offer unless another supported required property exists.

Do not add fake reviews or ratings merely to satisfy rich-result requirements.

---

## 13. Offer Modeling

### 13.1 Meaning

An `Offer` represents a real commercial offer, not merely a recorded market number, price chart point, internal Odoo price, estimate, or invitation to contact sales.

### 13.2 Recommended properties

When eligible:

- `@type: Offer`;
- stable `@id`;
- `url` matching the product/price canonical URL;
- `price` or approved `priceSpecification.price`;
- `priceCurrency` using ISO 4217;
- `priceValidUntil` when a real expiry exists;
- `itemCondition` when true and useful;
- `seller` referencing the organization only when Ahan Asa is the actual seller;
- `availability` only when explicitly maintained and defensible.

### 13.3 Price freshness

`PRICING_SYSTEM.md` defines the exact freshness duration per category. This document must not invent a universal number.

At render time:

```ts
isFresh = now <= effectiveAt + freshnessWindow
isExpired = validUntil !== null && now > validUntil
```

If the page is served from cache after the eligibility state changes, the cache must be invalidated or expire before the markup becomes misleading.

### 13.4 Offer example

The example is valid only for a firm public offer whose exact visible terms match.

```json
{
  "@type": "Product",
  "@id": "https://www.example.com/steel/rebar/a3/16#product",
  "name": "میلگرد A3 سایز 16",
  "description": "مشخصات و شرایط خرید قابل مشاهده میلگرد A3 سایز 16",
  "url": "https://www.example.com/steel/rebar/a3/16",
  "size": "16 mm",
  "offers": {
    "@type": "Offer",
    "@id": "https://www.example.com/steel/rebar/a3/16#offer",
    "url": "https://www.example.com/steel/rebar/a3/16",
    "price": "678500",
    "priceCurrency": "IRR",
    "priceValidUntil": "2026-08-27",
    "itemCondition": "https://schema.org/NewCondition",
    "seller": {
      "@id": "https://www.example.com/#organization"
    }
  }
}
```

The visible page must state the same product, unit basis, 67,850 toman value, 678,500 rial equivalent, validity, and any conditions that materially affect the price.

### 13.5 No AggregateOffer for variants

Do not use `AggregateOffer` to summarize different sizes, grades, brands, mills, or units. It is not a shortcut for a product-variant price range.

---

## 14. Article and BlogPosting

Use `Article` or `BlogPosting` only for original published editorial content.

Recommended fields:

- stable article ID;
- `headline` matching the visible title;
- visible description;
- canonical URL;
- `mainEntityOfPage` reference;
- `inLanguage`;
- real `datePublished`;
- meaningful `dateModified`;
- visible author or authors;
- publisher organization reference;
- relevant crawlable images;
- approved section/taxonomy.

Use `Person` for a real named author and `Organization` for genuine organizational authorship. Do not invent authors, credentials, reviewers, or profile URLs.

```json
{
  "@type": "Article",
  "@id": "https://www.example.com/insights/example#article",
  "headline": "عنوان واقعی مقاله",
  "description": "خلاصه تأییدشده و قابل مشاهده مقاله",
  "url": "https://www.example.com/insights/example",
  "mainEntityOfPage": {
    "@id": "https://www.example.com/insights/example#webpage"
  },
  "inLanguage": "fa-IR",
  "datePublished": "2026-08-26T09:00:00+03:30",
  "dateModified": "2026-08-26T09:00:00+03:30",
  "author": {
    "@id": "https://www.example.com/#organization"
  },
  "publisher": {
    "@id": "https://www.example.com/#organization"
  },
  "image": [
    "https://www.example.com/media/example-1x1.jpg",
    "https://www.example.com/media/example-4x3.jpg",
    "https://www.example.com/media/example-16x9.jpg"
  ]
}
```

---

## 15. Collections, Services, Resources, and Media

### 15.1 CollectionPage and ItemList

Use `ItemList` only when the same items are visible on the page.

- include published canonical items only;
- preserve visible order where order matters;
- remove unpublished children;
- do not claim one complete list across pagination unless the visible page supports it;
- do not treat generic steel lists as merchant-offer carousels.

### 15.2 Service

Use `Service` only for a real approved procurement service. Do not attach a price, guarantee, future service area, response time, or rating without verified visible support.

### 15.3 DigitalDocument

Use only for a real public resource. Never emit signed R2 URLs, private storage paths, RFQ attachments, or confidential files. `contentUrl` must be stable and publicly crawlable if present.

### 15.4 Images

- relevant to the marked entity;
- public, crawlable, and indexable;
- absolute HTTPS URL;
- correct width and height where declared;
- not a temporary signed URL;
- not a decorative background masquerading as the primary image.

Organization logos must meet current Google size and crawlability guidance. Article images should include suitable high-resolution aspect-ratio derivatives when available.

---

## 16. Localization

Phase 1:

- locale: `fa-IR`;
- direction: RTL;
- Persian page/entity names;
- canonical locale routing from `ROUTES.md`;
- one real organization entity.

When a future locale is activated:

- generate a separate localized page ID and canonical URL;
- localize names, descriptions, headlines, and breadcrumbs;
- use the correct BCP 47 code;
- emit only after the locale page is complete and indexable;
- reference the same organization ID unless a distinct legal entity exists;
- keep hreflang in metadata/sitemaps; JSON-LD does not replace hreflang.

Reserved, partial, or 404 locale routes emit no structured data.

---

## 17. Noindex and Non-Public Routes

Do not emit rich-result-focused JSON-LD on:

- RFQ confirmation pages;
- private RFQ status pages;
- admin and account pages;
- preview and staging hosts;
- APIs, webhooks, queue consumers, and health endpoints;
- internal search/filter states without canonical landing pages;
- 404, error, or maintenance pages;
- reserved locales;
- draft or archived content.

The public RFQ form may have minimal page identity only if it is indexable under `ROUTES.md`. It must never include user-entered items, contact data, uploaded file details, or the generated RFQ number.

---

## 18. D1 Read Model Requirements

The exact database design belongs in `DATABASE_SCHEMA.md`. The structured-data projection needs fields equivalent to:

```ts
type PublishedEntityState = {
  status: "draft" | "published" | "archived";
  indexable: boolean;
  locale: string;
  canonicalUrl: string;
  snapshotVersion: string;
  publishedAt: string;
  updatedAt: string;
};

type ProductSchemaProjection = PublishedEntityState & {
  productPublicId: string;
  productName: string;
  description?: string;
  publicSku?: string;
  brandName?: string;
  manufacturerName?: string;
  size?: string;
  unitCode?: string;
  images: ImageInput[];
  attributes: Array<{ name: string; value: string }>;
  productEligibility: "eligible" | "ineligible" | "review";
};

type PublicPriceProjection = {
  pricePublicId: string;
  productPublicId: string;
  kind: "firm_offer" | "reference_price" | "historical";
  amount: string | null;
  currencyIso4217: string | null;
  displayAmount: string | null;
  displayCurrency: "toman" | "rial" | null;
  unitCode: string | null;
  effectiveAt: string;
  validUntil: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  availabilityPublic: string | null;
  isPublic: boolean;
  sourceVersion: string;
};
```

Odoo identifiers may be stored for sync but must be excluded from public schema builders unless separately mapped to an approved public commercial identifier.

### 18.1 Atomic publish requirement

When product, price, or eligibility changes, update the public projection atomically enough that HTML and JSON-LD cannot publish contradictory states.

Preferred flow:

```text
Odoo change
  -> sync validation
  -> D1 projection transaction/version update
  -> cache-tag purge
  -> next request renders HTML + JSON-LD from same version
```

If synchronization is incomplete, keep the last valid public snapshot only while it remains inside its approved freshness and validity window. Otherwise hide the numeric price and omit `Offer`.

---

## 19. Next.js / Cloudflare Implementation

Recommended structure:

```text
lib/
  seo/
    schema/
      constants.ts
      ids.ts
      types.ts
      sanitize.ts
      validate.ts
      graph.ts
      organization.ts
      website.ts
      webpage.ts
      breadcrumb.ts
      article.ts
      product.ts
      offer.ts
      collection.ts
components/
  seo/
    JsonLd.tsx
```

### 19.1 Rules

- builders are typed pure functions;
- URL construction uses the central route registry;
- builders consume the same resolved view model as the page;
- no builder fetches Odoo;
- no client component generates public JSON-LD;
- compose one `@graph` per page where practical;
- recursively remove undefined values and empty optional arrays;
- reject duplicate conflicting IDs;
- fail production builds for invalid mandatory fields;
- schema generation must not add measurable client JavaScript.

### 19.2 Safe serializer

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

Never interpolate raw user input or raw HTML into a JSON-LD script.

### 19.3 Graph composer

```ts
type SchemaNode = Record<string, unknown> & {
  "@type": string | string[];
  "@id"?: string;
};

export function createSchemaGraph(nodes: Array<SchemaNode | null>) {
  const activeNodes = nodes.filter((node): node is SchemaNode => node !== null);
  assertUniqueSchemaIds(activeNodes);

  return {
    "@context": "https://schema.org",
    "@graph": activeNodes,
  };
}
```

### 19.4 Conditional Offer builder

```ts
export function buildOffer(input: OfferInput): SchemaNode | null {
  if (!isOfferEligible(input)) return null;

  return {
    "@type": "Offer",
    "@id": `${input.canonicalUrl}#offer`,
    url: input.canonicalUrl,
    price: input.priceInIsoCurrency,
    priceCurrency: input.currencyIso4217,
    ...(input.validUntil ? { priceValidUntil: input.validUntil } : {}),
    ...(input.availability ? { availability: input.availability } : {}),
    seller: { "@id": `${input.origin}/#organization` },
  };
}
```

`isOfferEligible` must enforce `PRICING_SYSTEM.md`; it must not be a UI toggle that bypasses validation.

---

## 20. Cache and Freshness Consistency

Structured data must use the same cache policy as the visible page.

Suggested tags:

```text
product:<public-product-id>
variant:<public-variant-id>
price:<public-price-id>
article:<public-article-id>
schema:<canonical-path>
```

On a qualifying product-price update, purge all tags that can serve the old visible price or old `Offer`.

The cache TTL must never extend beyond:

- the public price freshness deadline;
- `priceValidUntil`;
- product publication expiry;
- the maximum safe stale window defined by `CACHING_STRATEGY.md`.

Do not serve stale-while-revalidate markup that continues to claim a firm offer after its validity ends.

---

## 21. Prohibited Patterns

The implementation must reject:

- `Product` on generic category pages;
- `Offer` generated from every numeric price automatically;
- `InStock` inferred from supplier or ERP presence;
- Ahan Asa named as manufacturer of third-party steel;
- invented SKU, MPN, GTIN, brand, rating, review, award, certification, or office;
- `AggregateOffer` used as a variant-price range;
- toman amount mislabeled as IRR;
- hidden customer-specific prices;
- stale, expired, rejected, or partially synced prices;
- hardcoded production hostnames spread across builders;
- mixed apex and `www` IDs;
- duplicate organization/product IDs;
- schema generated after hydration;
- raw CMS HTML or user input in JSON-LD;
- signed R2 URLs;
- Odoo IDs or private URLs;
- deploy timestamps used as content modification dates;
- JSON-LD on noindex/private/system routes;
- placeholder domains or unresolved values in production.

---

## 22. Automated Tests

### 22.1 Unit tests

Test:

- stable IDs;
- canonical URL normalization;
- correct page/entity type;
- omission of empty and unapproved fields;
- safe serialization;
- valid ISO dates and language codes;
- D1 snapshot version consistency;
- product eligibility rules;
- offer freshness, validity, currency, and unit gates;
- toman-to-IRR conversion;
- availability omission by default;
- duplicate-ID detection;
- private-field exclusion.

### 22.2 Required Offer test cases

| Case | Visible numeric price | `Product` | `Offer` |
|---|---:|---:|---:|
| Approved fresh firm offer | Yes | Yes | Yes |
| Approved reference price | Yes | Yes | No |
| Historical price | Yes | Conditional | No |
| Stale price | No or marked unavailable | Yes | No |
| Expired offer | No or marked expired | Yes | No |
| Pending/rejected price | No | Yes | No |
| “Call for price” | No | Yes | No |
| Customer-specific quotation | Never public | No public quote node | No |
| Category price table | Possibly | No per-row Product by default | No by default |
| Supplier-only stock | Possibly hidden | Yes | No availability claim |

### 22.3 Route integration tests

For representative routes assert:

- exactly one canonical;
- exactly one page node;
- stable organization ID;
- breadcrumb parity;
- server-rendered JSON-LD in initial HTML;
- HTML/schema snapshot equality;
- no example, preview, localhost, or staging host;
- no private fields;
- no prohibited schema on system routes;
- valid JSON parsing;
- no duplicate conflicting IDs.

### 22.4 Build gates

Fail a production build or route-generation job when:

- canonical origin is invalid;
- an indexable page has no canonical URL;
- JSON-LD serialization fails;
- a mandatory article field is absent;
- a product is marked eligible without verified identity;
- an offer is emitted without amount, ISO currency, unit/parity, approval, or freshness;
- a toman/IRR consistency test fails;
- a duplicate ID exists;
- a private or placeholder pattern is detected.

Scan schema output for:

```text
example.com
localhost
127.0.0.1
workers.dev
pages.dev
vercel.app
TBD
TODO
lorem ipsum
undefined
odoo_id
api_key
```

---

## 23. Manual QA and Release Workflow

For each new or changed schema template:

1. confirm source ownership and publication state;
2. compare structured data against visible content;
3. parse the JSON locally;
4. validate vocabulary with Schema.org Validator;
5. validate Google-supported features with Rich Results Test;
6. verify the initial server-rendered HTML;
7. test a small live route sample;
8. inspect the canonical live URL in Search Console;
9. verify crawlability of images and entity URLs;
10. monitor enhancement and unparsable-data reports;
11. expand rollout only after errors and policy mismatches are resolved.

A green validator result does not prove that an offer is current, visible, or commercially true.

---

## 24. Monitoring and Ownership

Assign named owners for:

- organization/legal data;
- canonical routes and locales;
- article authorship and dates;
- product identity and taxonomy;
- public price approval and freshness policy;
- Odoo-to-D1 synchronization;
- cache invalidation;
- schema implementation;
- Search Console monitoring.

Monitor:

- unparsable structured-data errors;
- Product snippet errors and warnings;
- merchant-listing reports only if merchant eligibility is intentionally enabled;
- Offer count changes;
- stale Offer suppression;
- HTML/schema mismatch rate;
- duplicate IDs;
- price-sync and cache-purge failures;
- indexed URLs emitting unexpected schema types.

Review this document when:

- a route/template changes;
- a locale launches;
- price policy changes;
- checkout or merchant functionality is introduced;
- inventory promises become public;
- product-variant URL strategy changes;
- a legal entity or contact point changes;
- Google or Schema.org guidance changes.

---

## 25. Pre-Launch Decisions

| Decision | Required before | Fallback |
|---|---|---|
| Canonical apex or `www` host | Production graph | Fail production when origin is absent |
| Registered legal name | `legalName` | Omit |
| Public address/phone/email | Contact fields | Omit |
| Official social profiles | `sameAs` | Omit |
| Active service area | `areaServed` | Omit |
| Final logo URL/dimensions | Organization logo | Block full organization release |
| Product public identifier policy | Product nodes | Omit identifiers not approved |
| Variant canonical policy | `ProductGroup` | Keep deferred |
| Public price classifications | Offer eligibility | Treat as reference price; omit `Offer` |
| Freshness window per category | Offer validity | Omit `Offer` |
| Toman/IRR visible-equivalence design | Iranian Offer markup | Omit `Offer` |
| Public availability ownership | `availability` | Omit |
| Seller-of-record confirmation | `seller` | Omit `Offer` |
| Review system | Ratings/reviews | Prohibited |
| Future locale activation | Localized graphs | 404/no graph |

---

## 26. Acceptance Criteria

Implementation is complete when:

1. One stable Ahan Asa organization ID is used sitewide.
2. Homepage emits a coherent Organization/WebSite/WebPage graph.
3. Every indexable page uses exact canonical and locale values.
4. Breadcrumb schema matches the visible hierarchy.
5. Article schema uses approved CMS data and meaningful dates.
6. Category pages do not impersonate specific products.
7. Product nodes use verified Odoo/D1 commercial identity plus published Website SEO data.
8. `Offer` is emitted only for a visible, firm, fresh, approved commercial offer.
9. Reference, stale, expired, hidden, and customer-specific prices never become `Offer` markup.
10. Iranian prices use correct IRR machine values and visible toman/rial parity.
11. Availability is omitted unless explicitly supportable.
12. Public rendering never calls Odoo at request time.
13. HTML and JSON-LD share one D1 snapshot version.
14. JSON-LD is server-rendered, safely serialized, and cache-consistent.
15. No private, placeholder, fabricated, or contradictory data is emitted.
16. Automated and live validation gates pass before broad rollout.
17. Search Console ownership and monitoring are assigned.

---

## 27. Implementation Sequence

1. Resolve canonical origin, routes, locales, and site identity.
2. Finalize product/variant and public-price projection fields in D1.
3. Implement shared page view models used by HTML and JSON-LD.
4. Add stable ID and URL helpers.
5. Add safe serializer and graph composer.
6. Implement Organization, WebSite, WebPage, and BreadcrumbList.
7. Implement Article/BlogPosting.
8. Implement Product without automatically enabling Offer.
9. Implement the strict Offer eligibility function from `PRICING_SYSTEM.md`.
10. Add cache tags and expiry rules tied to offer validity.
11. Add automated tests and forbidden-pattern scans.
12. Validate representative live routes.
13. Enable Product/Offer template rollout gradually.
14. Monitor Search Console and synchronization failures.

Stop and request a recorded decision instead of guessing whenever implementation requires legal identity, seller identity, currency treatment, product identifiers, price type, validity, availability, reviews, author identity, canonical host, or a new locale.

---

## 28. Authoritative References

Reviewed on 2026-08-26:

- Google Search Central — Structured data introduction:  
  `https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data`
- Google Search Central — General structured-data guidelines:  
  `https://developers.google.com/search/docs/appearance/structured-data/sd-policies`
- Google Search Central — Organization structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/organization`
- Google Search Central — Breadcrumb structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/breadcrumb`
- Google Search Central — Article structured data:  
  `https://developers.google.com/search/docs/appearance/structured-data/article`
- Google Search Central — Product structured data overview:  
  `https://developers.google.com/search/docs/appearance/structured-data/product`
- Google Search Central — Product snippets:  
  `https://developers.google.com/search/docs/appearance/structured-data/product-snippet`
- Google Search Central — Merchant listings:  
  `https://developers.google.com/search/docs/appearance/structured-data/merchant-listing`
- Google Search Central — Product variants:  
  `https://developers.google.com/search/docs/appearance/structured-data/product-variants`
- Schema.org — Organization: `https://schema.org/Organization`
- Schema.org — WebSite: `https://schema.org/WebSite`
- Schema.org — BreadcrumbList: `https://schema.org/BreadcrumbList`
- Schema.org — Article: `https://schema.org/Article`
- Schema.org — Product: `https://schema.org/Product`
- Schema.org — Offer: `https://schema.org/Offer`
- Schema.org — UnitPriceSpecification: `https://schema.org/UnitPriceSpecification`

Recheck official guidance before introducing a new schema type or changing rich-result behavior.

---

## 29. Final Rule

> If a fact is not verified, omit it. If users cannot see the same fact, do not encode it. If a price is not a real fresh public offer, do not publish it as `Offer`. If a schema type changes what Ahan Asa appears to be, require explicit approval before implementation.
