# Ahan Asa Website — Metadata Specification

> **Brand:** Ahan Asa | آهن آسا  
> **Canonical origin:** `https://www.ahanassa.com`  
> **ERP:** `https://odoo.ahanassa.com`  
> **Document:** `METADATA_SPEC.md`  
> **Status:** Approved architecture baseline — v2.0  
> **Last updated:** 2026-08-26  
> **Launch locale:** Persian (`fa-IR`), fully RTL, unprefixed URLs  
> **Future locale reservations:** English (`/en`), Arabic (`/ar`)  
> **Primary scope:** HTML and social metadata for public, catalog, price, article, RFQ, account, admin, and system routes

---

## 1. Purpose

This document is the implementation contract for creating, storing, generating, rendering, caching, validating, and maintaining metadata across the Ahan Asa website.

It covers:

- HTML title and meta description;
- canonical URLs;
- robots directives;
- Open Graph metadata;
- X/Twitter card metadata;
- locale and hreflang metadata;
- product, variant, category, price, and article templates;
- fallback and inheritance rules;
- metadata ownership across Website CMS, D1, R2, and Odoo;
- Next.js App Router implementation;
- cache invalidation after CMS or ERP synchronization;
- build, deployment, and production QA.

It does not replace:

- `HREFLANG_CANONICAL.md` for locale equivalence and canonical policy;
- `SITEMAP_ROBOTS_SPEC.md` for crawl discovery and sitemap membership;
- `STRUCTURED_DATA.md` for JSON-LD;
- `PRODUCT_CATALOG_SPEC.md` for catalog entities and route eligibility;
- `PRICING_SYSTEM.md` for public price eligibility and freshness;
- `SYSTEM_OF_RECORD.md` for field ownership;
- `SYNC_STRATEGY.md` for Odoo synchronization;
- `SEO_KEYWORD_MAP.md` and `SEO_PAGE_MAP.md` for intent ownership;
- `ROUTES.md` for the final route manifest.

When two documents conflict, metadata must follow the approved route manifest and system-of-record decision. A conflict must be fixed in the documentation set before release; it must not be silently resolved in code.

---

## 2. Non-Negotiable Decisions

| Decision | Required implementation |
|---|---|
| Canonical origin | `https://www.ahanassa.com` |
| Apex behavior | `https://ahanassa.com/**` permanently redirects to the matching `www` URL |
| Persian locale | Unprefixed, e.g. `/steel`, not `/fa/steel` |
| English and Arabic | No public metadata or hreflang until each locale is complete and approved |
| Commercial source of truth | Odoo owns product, variant, UOM, public-price source, and commercial availability |
| SEO source of truth | Website CMS owns slug, title, description, H1, editorial copy, robots, OG fields, and index eligibility |
| Public read path | Metadata reads D1/cache; it never waits for Odoo during a visitor request |
| Rendering | Critical metadata is present in the initial server-rendered HTML |
| Product positioning | B2B procurement-management service, not an online shop or marketplace |
| Price language | Never claim “live”, guaranteed, lowest, or in-stock unless the approved visible data supports it |
| Facets | Filter/sort/search states are not indexable landing pages by default |
| Missing entity | Return a genuine `404`; do not canonicalize it to a parent or homepage |

---

## 3. Brand and Search Positioning

All metadata must present Ahan Asa as a professional B2B steel procurement-management partner that protects the customer's commercial and project interests.

Approved identity:

| Field | Value |
|---|---|
| Persian brand | `آهن آسا` |
| Latin brand | `Ahan Asa` |
| Brand promise | `ما مراقب سرمایه شما هستیم.` |
| Primary action | Submit a steel requirement, BOM, invoice, or material list for review |
| Primary audience | Project owners, purchasing teams, contractors, factories, and professional buyers |

Metadata tone must be precise, calm, commercially intelligent, technically credible, and restrained.

Do not use unsupported equivalents of:

- lowest or best market price;
- guaranteed price or delivery;
- risk-free purchase;
- confirmed stock or immediate dispatch;
- live or moment-by-moment price;
- direct factory sales;
- authorized agency or exclusive supplier;
- active geographic coverage not yet approved;
- unverified standards, origin, manufacturer, inventory, customer, or project claims.

---

## 4. Metadata Data Flow and Ownership

### 4.1 Runtime flow

```text
Odoo commercial data
        ↓ asynchronous sync
Cloudflare Queue / Integration Worker
        ↓ validated public projection
D1 SEO read model
        +
Website CMS editorial metadata
        ↓
Next.js generateMetadata / page render
        ↓
Cloudflare edge cache
        ↓
Crawler or visitor
```

`generateMetadata()` must not call `odoo.ahanassa.com` directly. Odoo outages, upgrades, authentication failures, or slow responses must not delay public HTML or remove existing valid metadata.

### 4.2 Field ownership

| Field group | Authoritative system | Public rendering source |
|---|---|---|
| Product name, internal commercial identity | Odoo | Validated D1 projection |
| Variant, attributes, UOM | Odoo | Validated D1 projection |
| Public price source and commercial availability | Odoo | D1 public-price snapshot |
| Slug and redirect history | Website | D1 route/SEO record |
| SEO title and description | Website CMS | D1/CMS read model |
| H1, intro, buying guide, FAQ | Website CMS | D1/CMS read model |
| Canonical and robots state | Website route/SEO manifest | Application metadata resolver |
| Article metadata and dates | Website CMS | D1/CMS read model |
| Social images and media | Website media registry / R2 | Cloudflare image delivery |
| RFQ/customer/quotation status | Website receipt + Odoo workflow | Never exposed in public metadata |

### 4.3 Conflict rules

- Odoo wins for commercial values.
- Website CMS wins for editorial and SEO values.
- An ERP sync must not overwrite `seo_title`, `meta_description`, `slug`, `robots`, `canonical`, or OG overrides.
- A content edit must not overwrite commercial price, UOM, stock, or Odoo identifiers.
- A failed or partial sync must retain the last complete public snapshot and must not publish mixed-entity metadata.
- Mapping conflicts require operator review.

---

## 5. Metadata Output Contract

Every rendered HTML route must resolve one explicit metadata state.

| Field | Indexable public page | Noindex utility | Dynamic catalog/price page |
|---|---:|---:|---:|
| `<title>` | Required | Required | Required |
| Meta description | Required | Required | Required |
| Absolute canonical | Required | Normally required | Required |
| Robots decision | Required in content model | Required in HTML | Required |
| `og:title` | Required | Optional | Required |
| `og:description` | Required | Optional | Required |
| `og:url` | Required; equals canonical | Optional | Required; equals canonical |
| `og:type` | Required | Optional | Required |
| `og:site_name` | Required | Optional | Required |
| `og:locale` | Required | Optional | Required |
| `og:image` + dimensions + alt | Required or approved fallback | Optional | Required or approved fallback |
| X/Twitter large card | Required or inherited | Optional | Required or inherited |
| Hreflang | Only for complete approved equivalents | No | Only for complete approved equivalents |

Global technical metadata must also include:

- UTF-8 charset;
- responsive viewport;
- approved icons and web manifest where applicable;
- search-engine verification tokens only from secure deployment configuration;
- no deprecated `meta keywords` field.

---

## 6. Title Rules

### 6.1 Standard formats

```text
Homepage: آهن آسا | [primary positioning]
Inner page: [page subject] | آهن آسا
Article: [article title] | آهن آسا
Category: [category subject] | آهن آسا
Product: [product subject] | آهن آسا
Variant: [product + differentiating attributes] | آهن آسا
Price: قیمت [entity] | تاریخ و مشخصات به‌روزرسانی | آهن آسا
```

Use `|` as the standard separator. A title passed into the root title template must not already contain the brand suffix.

### 6.2 Editorial budget

- Working range: approximately 35–65 Persian characters including spaces.
- This is an editorial warning threshold, not a search-engine guarantee.
- Never cut a stored title with ellipsis.
- Prefer the decisive subject near the beginning.
- The homepage may place the brand first.

### 6.3 Requirements

Every indexable title must:

- uniquely identify the page;
- match the page's primary search intent and visible H1;
- use natural Persian rather than a keyword list;
- distinguish a category, product, variant, and price page from one another;
- use the approved brand spelling `آهن آسا`;
- remain meaningful outside navigation context;
- avoid volatile values unless that value is central, visible, valid, and intentionally included.

### 6.4 Rejected patterns

```text
خانه | آهن آسا
محصولات | آهن آسا
قیمت لحظه‌ای آهن با تضمین کمترین قیمت
خرید آهن قیمت آهن فروش آهن بازار آهن | آهن آسا
میلگرد ۱۶ | آهن آسا                 # insufficient when several grades/standards exist
آهن آسا | آهن آسا | مدیریت خرید آهن
```

---

## 7. Meta Description Rules

### 7.1 Working range

- Preferred: approximately 110–170 Persian characters including spaces.
- A shorter or longer description is acceptable when it is clearer.
- Search engines may generate another snippet from visible page content.
- CI warns on unusual length; it does not rewrite approved Persian copy.

### 7.2 Required structure

A description should state:

1. what the page contains;
2. what practical decision it helps the visitor make;
3. an optional low-pressure next step.

### 7.3 Prohibitions

Do not:

- copy the title word for word;
- repeat a site-wide generic description;
- inject a raw price table, phone number, or temporary campaign;
- claim a current price without a visible timestamp and eligible snapshot;
- promise availability, delivery, supplier status, or geography not shown on the page;
- concatenate optional dynamic fields into broken Persian;
- expose internal codes, Odoo IDs, RFQ IDs, or customer data.

Example pattern:

```text
[نام محصول] را از نظر مشخصات، واحدهای رایج، گزینه‌های موجود و ملاحظات خرید پروژه‌ای بررسی کنید و درخواست تأمین خود را برای ارزیابی ارسال کنید.
```

---

## 8. Canonical URL Specification

### 8.1 Fixed origin

```text
https://www.ahanassa.com
```

Production code must derive all absolute metadata URLs from a server-side validated configuration value:

```text
SITE_URL=https://www.ahanassa.com
```

The client-exposed environment is not the authority for security-sensitive routing decisions.

### 8.2 Canonical normalization

Canonical URLs must use:

- HTTPS;
- `www.ahanassa.com`;
- lowercase ASCII slugs;
- hyphen-separated words;
- no trailing slash except `/`;
- no fragments;
- no tracking, sort, filter, search, preview, session, or campaign parameters;
- no database IDs, Odoo IDs, or mutable prices in the path.

### 8.3 Required consistency

For an indexable page, these must identify the same URL:

- server-side redirect destination;
- `<link rel="canonical">`;
- `og:url`;
- hreflang self-reference;
- internal links;
- XML sitemap entry;
- breadcrumb URLs;
- structured-data `url`/`@id` where defined.

### 8.4 Duplicate and missing states

- Apex, HTTP, uppercase, and trailing-slash variants permanently redirect to the normalized URL.
- `/fa/...` must permanently redirect to its unprefixed Persian equivalent; it must not be a second canonical site.
- Tracking parameters self-canonicalize to the clean route when the underlying content is identical.
- A missing product, variant, price record, or article returns `404`.
- Never canonicalize a missing page to the homepage, category, or search page.
- Canonical is not a substitute for a redirect when one URL has been replaced.

---

## 9. Robots and Indexation Rules

Robots state is owned by the route/SEO manifest, not inferred from URL strings at runtime.

| Page or state | Directive | Sitemap |
|---|---|---:|
| Complete canonical public page | `index, follow` | Yes |
| Curated category/product/price landing page | `index, follow` | Yes |
| Variant with explicit SEO approval | `index, follow` | Yes |
| Variant without standalone value | `noindex, follow` or no route | No |
| Filter, sort, comparison, or internal search state | `noindex, follow` | No |
| RFQ builder/request form | `noindex, follow` | No |
| RFQ confirmation/failure | `noindex, nofollow` | No |
| Login/account/admin | `noindex, nofollow, noarchive` | No |
| Preview/draft | `noindex, nofollow, noarchive` | No |
| Error or maintenance UI | `noindex, nofollow` | No |
| Missing/unpublished slug | HTTP `404`/`410` as applicable | No |

Rules:

- Do not use `robots.txt` to implement `noindex`; crawlers must be able to fetch the page to see the directive.
- Authenticated and administrative routes require access control in addition to `noindex`.
- Non-HTML resources such as private or non-indexable PDFs use an appropriate `X-Robots-Tag` response header.
- `index, follow` may be omitted from markup, but the decision must remain explicit in the application model and QA output.
- Do not output `<meta name="keywords">`.

---

## 10. Page-Family Metadata Rules

### 10.1 Homepage

```text
Title: آهن آسا | مدیریت تأمین و خرید پروژه‌ای فولاد
Description: آهن آسا نیاز فنی و تجاری پروژه را بررسی و مسیر تأمین و خرید فولاد را هماهنگ می‌کند تا تصمیم خرید با کنترل بیشتری انجام شود.
Canonical: https://www.ahanassa.com/
Robots: index, follow
OG type: website
```

The homepage owns brand/entity discovery. It must not act as the canonical target for unrelated pages.

### 10.2 Static service and trust pages

```text
Title: [موضوع مشخص صفحه] | آهن آسا
Description: [خلاصه منحصربه‌فرد از محتوای واقعی و ارزش همان صفحه]
Robots: route manifest
OG type: website
```

Generic navigation labels such as `درباره ما`, `تماس`, or `خدمات` are not sufficient on their own when a more descriptive title is available.

### 10.3 Catalog hub

Current catalog route contract:

```text
/steel
/steel/{category-slug}
/steel/{category-slug}/{product-slug}
/steel/{category-slug}/{product-slug}/{variant-slug}   # only when approved
```

Hub example:

```text
Title: آهن و فولاد موردنیاز پروژه‌ها | راهنمای انتخاب و تأمین | آهن آسا
Description: گروه‌های کالایی فولاد، مشخصات انتخاب و مسیر ثبت درخواست خرید پروژه‌ای را بررسی کنید؛ قیمت و موجودی فقط با وضعیت و زمان به‌روزرسانی معتبر نمایش داده می‌شود.
```

### 10.4 Category page

```text
Title: [نام گروه کالا]؛ مشخصات و راهنمای خرید | آهن آسا
Description: انواع [نام گروه کالا]، مشخصات انتخاب، واحدهای رایج و ملاحظات خرید پروژه‌ای را بررسی کنید و درخواست تأمین خود را ثبت کنید.
OG title: راهنمای انتخاب و خرید پروژه‌ای [نام گروه کالا]
OG type: website
```

Index eligibility requires:

- approved category and stable slug;
- unique introduction and buying guidance;
- real child products or useful category content;
- unique title and description;
- no unsupported stock, price, manufacturer, or delivery claims.

### 10.5 Product page

```text
Title: [نام کامل محصول]؛ مشخصات و راهنمای خرید | آهن آسا
Description: مشخصات، سایزها، واحدها و نکات خرید پروژه‌ای [نام کامل محصول] را بررسی کنید و در صورت نیاز، لیست خرید خود را برای ارزیابی ارسال کنید.
OG title: مشخصات و خرید پروژه‌ای [نام کامل محصول]
OG type: website
```

The metadata identity must be based on the approved public product name, not a raw Odoo display name. Internal SKU, database ID, supplier reference, and customer-specific name must never appear.

### 10.6 Variant page

A standalone variant page is permitted only after explicit SEO approval.

```text
Title: [محصول] [ویژگی‌های متمایزکننده]؛ مشخصات و خرید | آهن آسا
Description: مشخصات فنی، واحد قابل سفارش و اطلاعات خرید پروژه‌ای [نام و ویژگی دقیق Variant] را بررسی کنید و درخواست خود را ثبت کنید.
```

The title must include only attributes needed to distinguish the variant. If the page is merely substituted values with no unique content, it remains selectable on the product page and is not independently indexable.

### 10.7 Price hub and price pages

Current price route contract:

```text
/price
/price/{category-slug}
/price/{product-slug}
/price/{product-slug}/{variant-slug}   # only when approved
```

Templates:

```text
Price hub title:
قیمت آهن و فولاد | تاریخ به‌روزرسانی و راهنمای خرید | آهن آسا

Category price title:
قیمت [نام گروه کالا] | آخرین به‌روزرسانی و مشخصات | آهن آسا

Product price title:
قیمت [نام محصول] | مشخصات، واحد و زمان به‌روزرسانی | آهن آسا

Variant price title:
قیمت [محصول + ویژگی متمایز] | آخرین به‌روزرسانی | آهن آسا
```

Descriptions may state that a price is displayed only when the page visibly contains:

- eligible public price;
- currency;
- UOM;
- tax mode where relevant;
- source update timestamp;
- freshness status or approved disclaimer.

Do not insert a volatile numeric price into title or description by default. It creates stale snippets, cache churn, and misleading search results. A numeric price in metadata requires a separately approved experiment and strict freshness controls.

### 10.8 Article page

```text
Title: [عنوان مقاله] | آهن آسا
Description: [خلاصه مستقل و دقیق از پرسش، دامنه پاسخ و فایده عملی مقاله]
OG type: article
```

Required fields:

- approved title and description;
- stable canonical;
- publication date;
- substantive modification date when changed;
- real public author or organization attribution;
- approved image and alt text;
- visible page content consistent with every claim.

### 10.9 Resource/download page

```text
Title: [نام منبع یا چک‌لیست] | منابع آهن آسا
Description: [نوع منبع] برای [مخاطب یا کاربرد]؛ شامل [محتوای واقعی] و اطلاعات نسخه یا تاریخ به‌روزرسانی.
```

Do not promise a download unless the file exists, is authorized for public access, and the download flow works.

### 10.10 RFQ and operational pages

| State | Title | Robots |
|---|---|---|
| RFQ builder | `ارسال لیست خرید آهن و فولاد | آهن آسا` | `noindex, follow` |
| Confirmation | `درخواست شما دریافت شد | آهن آسا` | `noindex, nofollow` |
| Submission failure | `ارسال درخواست کامل نشد | آهن آسا` | `noindex, nofollow` |
| Customer account | Context-specific, no private detail | `noindex, nofollow, noarchive` |
| Admin | `مدیریت آهن آسا` | `noindex, nofollow, noarchive` |
| 404 | `صفحه پیدا نشد | آهن آسا` | `noindex, nofollow` |
| 500 | `خطایی رخ داد | آهن آسا` | `noindex, nofollow` |

No customer name, company, phone, file name, material list, quantity, RFQ number, quotation value, or workflow status may appear in metadata.

---

## 11. Price Freshness and Metadata Safety

Metadata must use a price-state classifier from the D1 public read model:

```ts
type PublicPriceState =
  | 'current'
  | 'stale-allowed'
  | 'request-quote'
  | 'restricted'
  | 'unavailable';
```

| State | Visible page behavior | Metadata behavior |
|---|---|---|
| `current` | Show eligible price and timestamp | May use “price” wording; do not claim “live” |
| `stale-allowed` | Show last verified value with clear timestamp/status | Describe last update; do not imply current validity |
| `request-quote` | Show RFQ action | Use “استعلام” or “درخواست بررسی”, not a numeric price claim |
| `restricted` | Hide non-public commercial data | Do not expose price, stock, or restriction reason |
| `unavailable` | Show approved fallback | Do not generate price claims from older cache or Odoo errors |

Rules:

- Last valid public metadata remains stable during a temporary Odoo outage.
- A sync failure does not change an indexable page to `noindex` automatically.
- A withdrawn or invalid entity follows an explicit unpublish/redirect decision.
- Customer-specific pricing, discounts, supplier quotations, cost, margin, and internal pricelists are prohibited in metadata.
- Price changes invalidate only affected page/cache tags; they must not purge the whole site.

---

## 12. Facets, Search, Pagination, and Thin Pages

### 12.1 Faceted navigation

Parameters such as these are application state by default:

```text
?size=16
?grade=a3
?brand=...
?unit=ton
?origin=...
?sort=price
?availability=...
```

They must:

- remain out of XML sitemaps;
- use `noindex, follow` where a fetchable route exists;
- canonicalize to the clean approved landing page when content is not materially distinct;
- not generate hreflang sets;
- not create unique OG images;
- not become indexable merely because results exist.

A filter combination becomes indexable only through a curated landing-page record with unique content, stable route, mapped intent, internal links, and explicit approval.

### 12.2 Internal search

Internal search result pages are `noindex, follow`, excluded from sitemaps, and must not appear as canonical category/product substitutes.

### 12.3 Pagination

Each indexable paginated page is self-canonical. Page 2+ must not canonicalize to page 1 when its item set differs. Pagination titles may use a concise page indicator, but every page must preserve the same subject and avoid duplicate metadata ambiguity.

---

## 13. Open Graph Specification

Required properties for each public shareable page:

```text
og:title
og:description
og:type
og:url
og:site_name = آهن آسا
og:locale = fa_IR
og:image
og:image:secure_url
og:image:width = 1200
og:image:height = 630
og:image:alt
```

Rules:

- `og:url` equals the canonical URL.
- `og:title` may omit the brand suffix because `og:site_name` supplies the entity.
- `og:description` may be slightly more editorial than the search description but cannot add new claims.
- Use `website` for homepage, hubs, catalog, product, price, service, legal, and utility pages.
- Use `article` for substantive editorial articles and approved case studies.
- When `article` is used, publish only real `published_time`, `modified_time`, `section`, and author values.
- Do not use commerce-specific OG fields as a substitute for valid visible price information.

---

## 14. X/Twitter Card Specification

Default:

```text
twitter:card = summary_large_image
```

Required for public shareable pages:

- `twitter:title`;
- `twitter:description`;
- `twitter:image`;
- `twitter:image:alt`.

Reuse the approved Open Graph values unless a platform-specific override is justified. Do not publish a placeholder `twitter:site` handle.

---

## 15. Social Image System

| Property | Standard |
|---|---|
| Canvas | `1200 × 630 px` |
| Ratio | `1.91:1` |
| Color space | sRGB |
| Delivery | Absolute HTTPS URL through approved image delivery |
| Primary colors | Steel Navy `#0B2545`, Forge Copper `#B04A2F`, White `#FFFFFF` |

Asset order:

1. approved page-specific image;
2. approved page-family generated card;
3. default Ahan Asa card.

The image must:

- keep critical content inside a conservative central safe area;
- use approved Persian typography/assets;
- preserve Persian joining and RTL layout;
- use no confidential BOM, invoice, supplier, price, or customer data;
- use no unlicensed or misleading factory, inventory, truck, or project image;
- have descriptive image alt text that is not a mechanical title duplicate.

Generated cards must be deterministic for the same content version. A price value must not be rendered into a share image.

---

## 16. Locale and Hreflang Rules

### 16.1 Launch state

```text
HTML lang: fa-IR
HTML direction: rtl
Public Persian prefix: none
Open Graph locale: fa_IR
Canonical language route: unprefixed Persian URL
```

### 16.2 Future locales

Reserved URL spaces:

```text
/en/...
/ar/...
```

Do not publish `hreflang="en"`, `hreflang="ar"`, `og:locale:alternate`, or localized sitemap entries until the relevant page is fully translated, reviewed, indexable, and canonically available.

After activation:

- each locale self-canonicalizes;
- alternates are reciprocal;
- titles and descriptions are human-authored for local search intent;
- missing translations are omitted from the hreflang cluster;
- Persian content is never placed under `/en` or `/ar` as a fallback;
- `x-default` follows `HREFLANG_CANONICAL.md`.

---

## 17. Metadata Content Model

```ts
type Locale = 'fa-IR' | 'en' | 'ar';

type Indexation =
  | 'index-follow'
  | 'noindex-follow'
  | 'noindex-nofollow';

type PageFamily =
  | 'home'
  | 'static'
  | 'category'
  | 'product'
  | 'variant'
  | 'price-hub'
  | 'price-category'
  | 'price-product'
  | 'price-variant'
  | 'article'
  | 'resource'
  | 'rfq'
  | 'account'
  | 'admin'
  | 'system';

type SeoRecord = {
  pageKey: string;
  entityType: PageFamily;
  entityId?: string;
  locale: Locale;
  canonicalPath: '/' | `/${string}`;
  slug: string | null;
  title: string;
  description: string;
  h1: string;
  indexation: Indexation;
  contentStatus: 'draft' | 'review' | 'published' | 'withdrawn';
  seoApprovedAt: string | null;
  openGraph: {
    title?: string;
    description?: string;
    type: 'website' | 'article';
    imageId?: string;
    imageAlt?: string;
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
  alternates?: Array<{
    locale: Locale;
    canonicalPath: string;
  }>;
  sourceVersion: number;
  updatedAt: string;
};
```

Dynamic catalog resolution also needs a public projection:

```ts
type CatalogSeoProjection = {
  entityId: string;
  entityType: 'category' | 'product' | 'variant';
  publicNameFa: string;
  differentiatingAttributes: string[];
  unitLabels: string[];
  publicPriceState: PublicPriceState;
  publicPriceUpdatedAt: string | null;
  isActiveInOdoo: boolean;
  syncStatus: 'synced' | 'pending' | 'failed' | 'disabled';
  lastCompleteSyncAt: string | null;
};
```

Metadata publication requires a valid `SeoRecord` and a complete compatible catalog projection. Raw Odoo fields are not safe metadata fallbacks.

---

## 18. Fallback and Inheritance

### 18.1 Allowed inheritance

- `metadataBase`;
- application/site name;
- default OG locale;
- default OG image;
- X/Twitter card type;
- icons and manifest;
- approved verification fields.

### 18.2 Forbidden inheritance

Published pages must not silently inherit:

- homepage title or description;
- homepage canonical;
- an indexable robots state for a utility route;
- product metadata from a category;
- a product title for a distinct approved variant;
- article dates or author from another record;
- locale alternates that do not exist;
- a page image that makes a false product, price, inventory, or project claim.

If required metadata is missing:

- a draft stays unpublished;
- an invalid dynamic record returns `404` or an approved service-unavailable state;
- production must not publish placeholder copy such as `Untitled`, `Coming Soon`, or unresolved template tokens.

---

## 19. Next.js App Router Implementation

### 19.1 Root metadata

```ts
import type { Metadata } from 'next';

const siteUrl = process.env.SITE_URL;

if (siteUrl !== 'https://www.ahanassa.com') {
  throw new Error('Invalid production SITE_URL');
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'آهن آسا | مدیریت تأمین و خرید پروژه‌ای فولاد',
    template: '%s | آهن آسا',
  },
  description:
    'آهن آسا نیاز فنی و تجاری پروژه را بررسی و مسیر تأمین و خرید فولاد را هماهنگ می‌کند.',
  applicationName: 'آهن آسا',
  openGraph: {
    siteName: 'آهن آسا',
    locale: 'fa_IR',
    type: 'website',
    images: [{
      url: '/og/default-1200x630.jpg',
      width: 1200,
      height: 630,
      alt: 'هویت آهن آسا و مدیریت خرید پروژه‌ای فولاد',
    }],
  },
  twitter: {
    card: 'summary_large_image',
  },
};
```

The homepage uses an absolute title override if needed so the root template does not append the brand twice.

### 19.2 Central resolver

All routes must use one typed metadata resolver:

```ts
type ResolveMetadataInput = {
  pageKey: string;
  locale: Locale;
  params?: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function resolveMetadata(
  input: ResolveMetadataInput,
): Promise<Metadata> {
  const record = await getPublishedSeoReadModel(input);

  if (!record) notFound();

  return toNextMetadata(record);
}
```

The resolver must:

- read D1/cache and website-owned content only;
- validate publication, locale, and route state;
- normalize the canonical path;
- derive robots from the route manifest;
- apply safe page-family templates;
- exclude raw Odoo/internal fields;
- return metadata that matches the page record used for rendering;
- emit no incomplete alternate locale.

### 19.3 Dynamic catalog example

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { categorySlug, productSlug } = await params;

  return resolveMetadata({
    pageKey: 'steel-product',
    locale: 'fa-IR',
    params: { categorySlug, productSlug },
  });
}
```

Do not perform one query for metadata and another unrelated query that can resolve a different data version for the visible page. Cache or memoize the content read within the request where supported.

### 19.4 HTML-first requirement

Title, description, canonical, robots, Open Graph, X/Twitter, and hreflang must be available in the initial HTML response. Do not depend on browser hydration or a client-side fetch to create or correct critical metadata.

### 19.5 File-based metadata

Next.js metadata file conventions may be used for:

- favicon and icons;
- manifest;
- static default Open Graph and X/Twitter images;
- generated route images;
- `robots.txt` and sitemap endpoints where delegated by their own specifications.

Generated images must use approved local font assets, correct RTL rendering, deterministic inputs, and safe fallbacks.

---

## 20. Cache and Invalidation Contract

Metadata and page content for the same canonical entity must share compatible cache tags.

Recommended tags:

```text
page:{pageKey}
locale:{locale}
category:{categoryId}
product:{productId}
variant:{variantId}
price:{priceEntityId}
article:{articleId}
seo:{seoRecordId}
```

Invalidation events:

| Event | Purge/revalidate |
|---|---|
| SEO title/description edit | Exact page + SEO record tag |
| Slug change | Old redirect + new canonical + affected sitemap entry |
| Product public name change | Product, eligible variants, related price pages |
| Category name change | Category, breadcrumbs, child page references |
| Public price change | Affected price/product/category tags only |
| Article publish/update | Article, article hub, sitemap partition |
| Locale activation | Exact locale pages, alternates, hreflang, locale sitemap |
| Entity withdrawal | Route, redirect/410 policy, sitemap, related links |

Do not purge the whole public site for a single price or product update. Metadata cache lifetime must not exceed the freshness policy of the data it claims.

---

## 21. CMS and Admin Requirements

Each indexable record must expose:

- page key and page family;
- locale;
- canonical slug/path;
- SEO title;
- meta description;
- H1;
- primary intent/keyword owner;
- robots/index eligibility;
- OG title and description overrides;
- OG image selection and alt text;
- publication and modification dates when relevant;
- approval status and reviewer;
- preview URL;
- last editor and audit timestamp.

Editor preview must show:

- approximate desktop/mobile search-result preview;
- explicit warning that Google may rewrite titles/snippets;
- canonical URL;
- robots state;
- social card preview;
- source/freshness state for dynamic catalog and price pages;
- unresolved validation errors;
- active locale alternates.

Operators may edit website-owned SEO fields. They must not directly edit Odoo-owned commercial fields through the website CMS.

---

## 22. Automated Validation

### 22.1 Build failures

Production build or content publication must fail for:

- missing title or description on an indexable page;
- duplicate canonical URL;
- canonical host other than `www.ahanassa.com`;
- non-HTTPS canonical or OG URL;
- canonical with fragment, unapproved query, uppercase slug, or invalid trailing slash;
- unresolved template token;
- duplicate `pageKey` or locale/canonical pair;
- indexable draft, preview, account, admin, confirmation, or filter state;
- published alternate locale that does not exist or is not reciprocal;
- raw Odoo ID, database ID, internal SKU, or confidential pattern in metadata;
- missing or invalid article dates when `og:type=article`;
- page metadata and route manifest disagreement;
- missing dynamic record or incomplete commercial/SEO projection;
- title or description containing a prohibited claim;
- numeric public-price claim without an eligible visible price state.

### 22.2 Warnings

CI should warn for:

- title outside the working range;
- description outside the working range;
- duplicate or near-duplicate titles/descriptions;
- title/H1 intent mismatch;
- default OG image on a high-value product/article page;
- missing social-image alt text;
- stale article modification date after substantive edit;
- price-page copy that does not mention update context;
- selected variant page with weak differentiation;
- homepage description inherited by an inner page;
- newly active route absent from the metadata registry.

CI must never auto-rewrite approved Persian metadata.

---

## 23. Security and Privacy

Metadata, head markup, URLs, social cards, structured data, analytics labels, and response headers must never expose:

- customer identity or contact details;
- company tax data;
- RFQ, quotation, invoice, lead, or sale-order identifiers;
- uploaded file names or object keys;
- requested quantities tied to a customer;
- supplier quotations, cost, margin, discount, or customer-specific price;
- Odoo IDs, API endpoints beyond public origin, API keys, or sync diagnostics;
- internal project, supplier, or product codes;
- preview tokens or authenticated state.

`noindex` is not a security control. Private pages must require authentication and authorization.

---

## 24. Manual QA Checklist

For representative pages in every family, verify:

- [ ] Initial HTML contains one correct title.
- [ ] Description is unique and matches visible content.
- [ ] Canonical is absolute, HTTPS, normalized, and on `www.ahanassa.com`.
- [ ] Apex, HTTP, `/fa`, case, and trailing-slash aliases redirect correctly.
- [ ] Canonical, `og:url`, sitemap, breadcrumb, hreflang, and internal links agree.
- [ ] Robots state matches the route manifest.
- [ ] Indexable pages return `200` and are crawlable.
- [ ] Missing dynamic slugs return a genuine `404`.
- [ ] Filter/search/RFQ/account/admin/preview states are not indexable.
- [ ] Product metadata uses approved public names, not raw Odoo labels.
- [ ] Variant metadata is unique only when the page is approved for indexation.
- [ ] Price wording matches visible price state and timestamp.
- [ ] Odoo downtime does not break or delay page metadata.
- [ ] OG title, description, URL, image, dimensions, and alt are valid.
- [ ] Persian social-image text is correctly shaped and ordered.
- [ ] X/Twitter card uses the intended large image.
- [ ] Article dates and attribution are real and visible.
- [ ] No incomplete locale alternate is emitted.
- [ ] No confidential or customer-specific information appears in head markup.
- [ ] A CMS edit invalidates only the intended cached pages.
- [ ] A price sync invalidates the affected product/category/price pages.
- [ ] Google Rich Results Test is used only for schemas eligible under `STRUCTURED_DATA.md`.
- [ ] URL Inspection confirms the rendered metadata after release.

---

## 25. Monitoring and Change Control

Monitor:

- missing and duplicate titles/descriptions;
- Google-selected canonical disagreements;
- unexpected `noindex` or crawl exclusions;
- metadata rendering errors;
- 404/5xx rates for dynamic pages;
- D1 read failures and stale projections;
- Odoo sync failures and queue backlog;
- cache invalidation failures;
- price freshness states;
- social image failures;
- Search Console query/page CTR after meaningful metadata changes.

Every material metadata change should record:

```text
date
pageKey
locale
old value
new value
reason
approver
expected effect
observed result
```

Search-engine title or snippet rewrites are not automatically defects. First inspect consistency among title, H1, visible introduction, anchors, page subject, and structured data.

---

## 26. Implementation Rules for Coding Agents

The coding agent must:

1. Read the approved route, canonical, SEO, catalog, pricing, and system-of-record documents before implementation.
2. Use a typed centralized metadata resolver.
3. Use the single fixed canonical origin.
4. Preserve Persian as the unprefixed launch locale.
5. Read public metadata from D1/cache, never synchronously from Odoo.
6. Keep page content and metadata on the same entity/version.
7. Return `404` for missing or unpublished dynamic records.
8. Apply explicit indexation rules to variants, prices, filters, RFQ, account, admin, and previews.
9. Invalidate only affected cache tags after CMS or ERP changes.
10. Validate unique metadata during build and publication.
11. Use only approved claims, images, authors, dates, and public data.
12. Update route, redirect, sitemap, hreflang, and metadata records together after a slug change.

The coding agent must not:

- generate indexable pages from every Odoo record or filter combination;
- call Odoo from `generateMetadata()`;
- invent price, stock, delivery, supplier, standard, or geographic claims;
- include a numeric price in metadata by default;
- use raw ERP names or IDs as public SEO copy;
- duplicate homepage metadata across routes;
- canonicalize missing pages to a parent or homepage;
- create `/fa` duplicates;
- emit hreflang for incomplete locales;
- use `meta keywords`;
- expose RFQ/customer data;
- silently publish placeholder metadata;
- use canonical tags as a substitute for redirects or correct HTTP status codes.

---

## 27. Acceptance Criteria

This document is satisfied when:

- [ ] `https://www.ahanassa.com` is used consistently as the only canonical origin.
- [ ] Apex and all normalization redirects are deployed and tested.
- [ ] Every launch route has a page key, page family, locale, title, description, canonical, robots state, and social metadata source.
- [ ] Catalog and price routes follow the approved `/steel` and `/price` contracts or a documented superseding route decision.
- [ ] Dynamic metadata uses the D1 public read model and is independent of live Odoo response.
- [ ] Product, variant, UOM, and price fields respect system-of-record ownership.
- [ ] Variant and faceted pages require explicit index approval.
- [ ] Price metadata follows the freshness-state policy and contains no default numeric prices.
- [ ] Persian is unprefixed and future locales remain disabled until complete.
- [ ] CMS validation, CI gates, cache invalidation, and manual QA pass.
- [ ] No metadata contains unsupported claims or sensitive data.
- [ ] External validators and Search Console inspection pass on representative production URLs.

---

## 28. Official Reference Basis

- [Next.js `generateMetadata`](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js metadata and Open Graph images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js metadata file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- [Google title-link guidance](https://developers.google.com/search/docs/appearance/title-link)
- [Google snippets and meta descriptions](https://developers.google.com/search/docs/appearance/snippet)
- [Google canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google robots meta rules](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google localized-version guidance](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Product structured-data overview](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Open Graph protocol](https://ogp.me/)

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Content/SEO Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |
| Odoo/ERP Approval | TBD | Pending | — |
| Legal/Privacy Approval | TBD | Pending | — |

---

**End of `METADATA_SPEC.md`**
