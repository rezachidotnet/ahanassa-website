# Ahan Asa Website — Internal Linking Specification

> **Brand:** Ahan Asa | آهن آسا  
> **Canonical origin:** `https://www.ahanassa.com`  
> **Document:** `INTERNAL_LINKING.md`  
> **Version:** 2.0  
> **Status:** Implementation specification  
> **Last updated:** 2026-08-26  
> **Phase 1 locale:** Persian (`fa-IR`), RTL, unprefixed URLs  
> **Document language:** English, with Persian link-copy examples

---

## 1. Purpose

This document defines how Ahan Asa pages connect to one another through global navigation, breadcrumbs, contextual links, related-content modules, catalog relationships, price relationships, and RFQ calls to action.

The link system MUST help users and search engines understand Ahan Asa as a professional steel procurement manager—not an online checkout store, public stock exchange, supplier directory, or marketplace.

Internal linking MUST:

- expose every approved indexable page through crawlable HTML links;
- make category, product, selected variant, price, article, procurement, and RFQ relationships explicit;
- move buyers from discovery to evaluation and then to a structured purchase request;
- distribute authority from hubs to important detail pages without link stuffing;
- reinforce one canonical topic owner for each search intent;
- prevent orphan pages, dead ends, redirect links, filter traps, and duplicate URLs;
- remain available in the initial server-rendered HTML;
- remain functional when Odoo is slow, unavailable, or being upgraded;
- support future English and Arabic locales without publishing placeholders in Phase 1.

Internal links are part of the information architecture, SEO system, content model, conversion design, and publishing workflow. They MUST NOT be generated merely because a keyword appears in text.

---

## 2. Normative Language

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

- **MUST / MUST NOT:** required for release.
- **SHOULD / SHOULD NOT:** expected unless a documented exception exists.
- **MAY:** optional and context-dependent.

Material deviations, route conflicts, or exceptions MUST be recorded in `DECISIONS.md` before implementation.

---

## 3. Related Sources and Precedence

Internal-link decisions MUST follow this order:

1. approved decisions in `DECISIONS.md`;
2. `PROJECT_BRIEF.md`;
3. `ROUTES.md` and `SITEMAP.md`;
4. `INFORMATION_ARCHITECTURE.md`;
5. `SEO_KEYWORD_MAP.md` and `SEO_PAGE_MAP.md`;
6. `PRODUCT_CATALOG_SPEC.md` and `PRICING_SYSTEM.md`;
7. `RFQ_SYSTEM.md` and `FORM_ARCHITECTURE.md`;
8. `CMS_ARCHITECTURE.md` and `CONTENT_MODEL.md`;
9. `METADATA_SPEC.md`, `STRUCTURED_DATA.md`, and `SITEMAP_ROBOTS_SPEC.md`;
10. this document.

If a path in an example below conflicts with the approved route registry, the approved registry wins. A page that is not approved in the sitemap MUST NOT be published or internally linked merely because a CMS record or Odoo product exists.

### 3.1 Blocking route normalization decision

Existing documents currently expose two candidate paths for the same primary acquisition flow:

- `/request` in `FORM_ARCHITECTURE.md`;
- `/request-consultation` in earlier SEO and information-architecture documents.

The site MUST have exactly one canonical RFQ/request route. It MUST NOT publish both as indexable forms.

Recommended resolution:

1. use `/request` for the structured RFQ builder;
2. permanently redirect `/request-consultation` to `/request` if the older path has already been exposed;
3. update `ROUTES.md`, `SITEMAP.md`, `FORM_ARCHITECTURE.md`, `SEO_PAGE_MAP.md`, `CTA_STRATEGY.md`, and `DECISIONS.md` together;
4. generate all internal links from the canonical route key, never from scattered literal strings.

Until that decision is recorded, implementation MUST use the symbolic route key `request` and MUST NOT hardcode either candidate in reusable components.

### 3.2 Unresolved catalog route patterns

`/steel` is the approved catalog-style example, but exact public URL patterns for product, variant, price, and article pages are not yet confirmed by the source set.

This document therefore uses route keys such as:

```text
catalogHub
categoryDetail
productDetail
variantDetail
priceHub
priceDetail
articleHub
articleDetail
request
```

`ROUTES.md` MUST map every key to one canonical path before implementation. Developers MUST NOT infer route patterns from examples in this document.

---

## 4. Architecture Boundary

The internal-link graph belongs to the website SEO read model, not to Odoo.

```text
Odoo commercial data
        ↓ background sync
D1 public read model + website SEO/CMS data
        ↓ publication and relationship rules
Server-rendered internal links
        ↓
Cloudflare cache
        ↓
Visitor and crawler
```

### 4.1 Odoo responsibilities

Odoo is the source of truth for commercial products, variants, units, prices, customers, CRM opportunities, quotations, inventory, and sales operations.

### 4.2 Website responsibilities

The website is the source of truth for:

- canonical public routes and slugs;
- indexability and publication state;
- SEO titles and descriptions;
- editorial descriptions and buying guidance;
- page relationships and internal-link labels;
- articles and other CMS content;
- breadcrumbs and related-content selections;
- the public RFQ experience.

### 4.3 No live Odoo dependency

Public page rendering MUST NOT call Odoo synchronously to decide:

- whether a link exists;
- which URL a product uses;
- what anchor text is displayed;
- whether a page is indexable;
- which related products or price pages appear.

Only published D1/CMS records may participate in the public link graph. An Odoo outage MUST NOT remove stable internal links from cached pages or prevent navigation.

---

## 5. Strategic Link Model

The primary buyer journey is:

```text
Discover
   ↓
Understand category or procurement need
   ↓
Evaluate product, variant, specification, and public price status
   ↓
Read guidance and verify buying requirements
   ↓
Build and submit a structured RFQ
   ↓
Continue commercially in Odoo
```

The website link graph ends at durable RFQ acceptance. CRM, quotation, negotiation, and sale-order work continue in Odoo and MUST NOT be presented as public checkout steps.

### 5.1 Authority flow

```text
Homepage
├── Procurement and process hubs
├── Catalog hub
│   ├── Category pages
│   │   ├── Product pages
│   │   │   ├── Approved variant pages
│   │   │   └── Related price pages
│   │   └── Category price page
│   └── Buying guides
├── Price hub
│   ├── Category price pages
│   └── Approved product/variant price pages
├── Articles hub
│   └── Articles linked to canonical commercial owners
└── Structured RFQ builder
```

The homepage distributes authority to core hubs. Hubs link to all approved direct children. Detail pages link back to their parent, across to genuinely related decisions, and forward to the RFQ flow.

---

## 6. Route and Locale Rules

### 6.1 Phase 1 URLs

- Persian Phase 1 routes MUST be unprefixed.
- `/fa/...` MUST NOT be generated or internally linked.
- Paths MUST use lowercase ASCII, hyphenated slugs.
- All indexable URLs MUST use `https://www.ahanassa.com` as canonical origin.
- Internal application links SHOULD be root-relative.
- Internal links MUST follow the trailing-slash policy in `ROUTES.md` consistently.
- Links MUST point directly to canonical destinations and MUST NOT pass through redirects.

### 6.2 Future locales

The system MAY later support `/en` and `/ar`, but unpublished locales MUST return `404` and MUST NOT appear in navigation, sitemaps, `hreflang`, or internal links.

When a locale is released:

- ordinary internal links MUST remain inside the active locale;
- the language switcher MUST target a real equivalent page, not an unrelated homepage;
- translated anchors MUST reflect local user terminology;
- route generation MUST come from the centralized locale-aware registry;
- Persian content MUST remain unprefixed unless `DECISIONS.md` changes the locale policy.

---

## 7. Internal-Link Layers

| Layer | Purpose | Typical component | Sitewide |
|---|---|---|---|
| Primary navigation | Expose major live hubs and RFQ | Header, mobile menu | Yes |
| Support navigation | Company, contact, legal, selected hubs | Footer, utility area | Yes |
| Hierarchical | Express parent–child structure | Hub cards, breadcrumbs | By family |
| Contextual | Explain a relevant next decision | Inline link, callout | Page-specific |
| Catalog relationship | Connect category, product, variant, unit | Product lists, specification modules | Page-specific |
| Price relationship | Connect a product to its valid public price context | Price card, price table, status module | Page-specific |
| Editorial | Connect guidance to canonical commercial owners | Article body, related guide block | Page-specific |
| Conversion | Add an item or context to the structured RFQ | CTA, RFQ action | Decision pages |
| Operational | Support confirmation and recovery | Thank-you/error pages | System-only |

No important indexable page may rely only on the footer, internal search, an XML sitemap, or a client-side filter for discovery.

---

## 8. Global Link Requirements

### 8.1 Crawlable HTML

Every SEO-relevant link MUST render as an HTML `<a>` element with a valid `href` in the initial response.

The implementation MUST NOT use:

- `div`, `span`, or button elements as substitutes for navigation links;
- `onClick`-only navigation;
- empty anchors;
- client-fetched critical links absent from initial HTML;
- URLs assembled only after user interaction;
- icon-only links without localized accessible names.

Next.js navigation MAY use the approved `Link` abstraction, provided it renders normal `<a href>` semantics.

### 8.2 Canonical live destinations only

Public internal links MUST target records that are:

- published;
- publicly accessible;
- assigned a canonical route;
- allowed to appear in the link graph;
- compatible with the current locale;
- not expired, deleted, preview-only, or placeholder content.

Internal links MUST NOT target `3xx`, `4xx`, `5xx`, soft-404, preview, staging, or unpublished URLs.

### 8.3 Normal links remain followable

Normal internal links MUST NOT use `rel="nofollow"`. Authority sculpting through internal `nofollow` is prohibited.

### 8.4 One canonical owner per intent

Each dominant topic MUST have one canonical owner page. Similar anchor phrases expressing the same intent MUST converge on that owner.

Examples of intents requiring one owner:

- a steel category;
- a commercial product;
- an approved variant or size landing page;
- a price topic;
- a buying guide topic;
- procurement management;
- the structured RFQ flow.

### 8.5 Relevance before quantity

Every contextual link MUST do at least one of the following:

- clarify the current topic;
- expose a parent or child relationship;
- help compare products or variants;
- explain price context or freshness;
- support a visible buying decision;
- connect guidance to the commercial topic owner;
- help the user prepare or submit an RFQ.

If none applies, the link SHOULD be removed.

---

## 9. Page-Family Link Matrix

The following matrix defines required relationships. A requirement applies only when the destination is approved and published.

| Source family | Required outgoing links | Preferred contextual links | Required inbound sources |
|---|---|---|---|
| Homepage | Procurement hub, Process, Catalog hub, Price hub when live, request flow | Selected categories, guides, About | Logo, recovery pages, brand references |
| Procurement hub | Approved capability children, Process, request flow | Catalog, relevant guides | Header, Homepage, Footer, child pages |
| Procurement capability | Parent hub, Process or adjacent capability, request flow | Relevant categories, guides, price explanation | Parent hub and related commercial/editorial pages |
| Catalog hub | Every published category, request flow | Procurement, price hub, selected guides | Header, Homepage, Footer, category pages, articles |
| Category page | Catalog hub, published products, category price page if valid, request flow | Buying guide, related category, procurement capability | Catalog hub, product pages, price pages, relevant articles |
| Product page | Category parent, approved variants, exact price owner if valid, request flow | Specifications guide, complementary product, related article | Category, variant, price, article, RFQ context recovery |
| Variant page | Product parent, category parent through breadcrumb, exact price owner if valid, request flow | Closely related variants, specification guide | Product, price page, relevant article |
| Price hub | Published category price pages, request flow | Price methodology/freshness guide, catalog hub | Header when approved, Homepage, category and product pages |
| Category price page | Price hub, category page, priced products/variants, request flow | Price methodology, buying guide | Price hub, category, products, articles |
| Product/variant price page | Price parent, exact product/variant, request flow | Alternatives, specification guide | Price hub/category price page, product/variant, article |
| Articles hub | Published articles, main commercial hubs | Selected guides and request flow with low weight | Header/Footer after release, Homepage selection |
| Article detail | Article hub, one to three canonical topic owners | Relevant price page, related article, request flow when intent is commercial | Articles hub, relevant commercial owner, curated related articles |
| Process | Procurement hub, relevant capability, request flow | Catalog and preparation guide | Header, Homepage, commercial pages |
| About | Procurement, Process, Contact, request flow | Verified evidence when available | Header/Footer, Homepage, trust sections |
| Request/RFQ | Process, privacy, support contact | Preparation guide, catalog return | Header CTA, Homepage, all major commercial pages |
| Thank-you | Process, Catalog hub or Homepage, Contact when needed | None | Valid submission flow only |

---

## 10. Homepage Rules

The homepage MUST link to:

1. the procurement-management hub;
2. the process page;
3. the catalog hub;
4. the canonical RFQ/request flow;
5. About or an equivalent trust destination;
6. the price hub when it is released and useful.

The homepage SHOULD feature a curated subset of high-value categories, but MUST NOT list every product or variant merely to reduce crawl depth.

Rules:

- Featured cards MUST have one canonical destination.
- A card MUST NOT contain nested links competing with the main card link.
- Conditional sections MUST disappear cleanly when empty.
- The primary RFQ CTA MAY appear at more than one decision point, but each instance MUST have a distinct UX role.
- The homepage MUST NOT become a complete sitemap or price ticker.

---

## 11. Hub-and-Child Rules

### 11.1 Hub obligations

Every hub MUST:

- introduce its family and user value;
- link to every published direct child;
- use unique child summaries;
- explain how children differ or relate;
- provide a relevant path to the next hub or RFQ;
- exclude drafts and records without complete public content.

### 11.2 Child obligations

Every detail page MUST:

- link back to its true parent;
- include a visible breadcrumb;
- link to the next relevant decision;
- avoid a generic list of every sibling;
- provide a proportionate path to the RFQ flow;
- avoid self-links and duplicate destinations in the same component.

### 11.3 Sibling links

Sibling links SHOULD appear only when the relationship is useful—for example, common comparison, substitution, compatibility, adjacent size, or shared buying decision. Sharing a parent alone is not sufficient.

---

## 12. Catalog Linking Rules

### 12.1 Catalog hub

The catalog hub MUST link to all published steel categories and MAY also link to procurement guidance, the price hub, and the RFQ builder.

It MUST NOT expose:

- unpublished Odoo products;
- internal product codes without user value;
- supplier or inventory records;
- thin pages generated only from attribute combinations;
- query-string filter states as indexable landing pages.

### 12.2 Category pages

Each category page MUST link to:

- the catalog hub;
- all approved direct product children, through crawlable server-rendered links;
- the category price page when a distinct approved price intent exists;
- the structured RFQ flow;
- at least one relevant guide or procurement page when available.

Category pages SHOULD surface the most important specifications and buying distinctions before presenting long child lists.

### 12.3 Product pages

Each product page MUST link to:

- its category parent;
- approved variant pages or a non-indexable variant selector;
- its canonical price owner, when a valid public price page exists;
- the RFQ builder with a non-sensitive product context key;
- one relevant buying/specification guide when available.

Product pages MAY link to complementary or substitute products when the relationship is curated and explained.

### 12.4 Variant pages

A variant page may be indexable only when it has approved search intent, unique useful content, stable identity, and sufficient inbound links. An Odoo variant alone does not justify a public page.

Every published variant page MUST link to:

- its product parent;
- its canonical price page when one exists;
- the RFQ builder;
- one or two closely related variants only when useful;
- an appropriate specification or buying guide.

### 12.5 Free-text RFQ items

The “item not found” option belongs in the RFQ experience. It MUST NOT generate a public page, indexable URL, or crawlable pseudo-product link.

---

## 13. Price Linking Rules

### 13.1 Price pages are not isolated feeds

Every public price page MUST connect price information to the correct category, product, or variant page and to the RFQ flow.

Price pages MUST NOT be published as thin pages containing only a number and timestamp.

### 13.2 Price eligibility

A numeric-price link or anchor that implies a current price may render only when the price is:

- approved for public display;
- complete with unit and currency;
- fresh under `PRICING_SYSTEM.md` policy;
- mapped to a published public entity;
- consistent with visible structured data.

### 13.3 Fresh price state

When a current public price is valid, descriptive anchors MAY include price intent, for example:

- `قیمت میلگرد ۱۶`;
- `مشاهده قیمت روز تیرآهن IPE 18`;
- `قیمت و مشخصات ورق سیاه ۱۰ میلی‌متر`.

The destination MUST visibly show the price, unit, update time, and relevant limitations.

### 13.4 Stale, hidden, or unavailable price state

When the price is stale, withheld, incomplete, or unapproved:

- the site MUST NOT use anchor text that promises a visible current price;
- numeric price structured data MUST be absent;
- the user MAY be linked to a useful status or buying page using neutral text;
- the RFQ action SHOULD become the primary commercial continuation.

Acceptable examples:

- `بررسی وضعیت قیمت و شرایط خرید`;
- `ارسال درخواست قیمت`;
- `ارسال لیست خرید برای بررسی`.

### 13.5 Price-to-product reciprocity

When both pages are indexable:

- the price page MUST link to the exact product or variant page;
- the product or variant page SHOULD link to the exact price owner;
- both MUST use the same canonical entity mapping;
- neither may generate query-string duplicates of the other.

---

## 14. Article and Guide Linking Rules

### 14.1 Editorial to commercial

Every article SHOULD link to one to three canonical topic owners where the reader needs the next explanation. The links MUST be editorially selected, not inserted through automatic keyword replacement.

Typical relationships:

- buying guide → category page;
- specification article → product or selected variant page;
- market/price explanation → canonical price hub or category price page;
- procurement article → relevant procurement capability;
- RFQ preparation guide → request flow.

### 14.2 Commercial to editorial

Commercial pages SHOULD link to guides that reduce uncertainty. They MUST NOT display an unfiltered “latest articles” feed when topical relevance is unknown.

### 14.3 Related articles

A related-content block SHOULD normally contain two to four curated items. Relevance takes priority over recency.

### 14.4 Taxonomy and archives

Tag, author, date, search-result, and filter URLs MUST NOT become indexable internal-link targets in Phase 1 unless separately approved in the sitemap and SEO map.

---

## 15. Procurement and Process Links

The established procurement family includes:

- `/procurement`;
- `/process`;
- `/procurement/quotation-comparison`;
- `/procurement/sourcing-and-supplier-evaluation`;
- `/procurement/documentation-and-quality-control`;
- `/procurement/logistics-and-delivery`.

Each procurement capability page MUST link to:

- `/procurement`;
- `/process` or the most relevant adjacent capability;
- the canonical RFQ route key;
- relevant catalog, price, or guide pages where the relationship is real.

These pages explain Ahan Asa’s controlled procurement role. They MUST NOT imply that the site itself performs checkout, inventory reservation, payment, or final quotation.

---

## 16. RFQ Conversion Linking

The structured RFQ builder is the primary conversion destination.

Approved primary labels include:

- `ارسال لیست خرید`;
- `ارسال لیست آهن‌آلات`;
- `ثبت درخواست قیمت`;
- `افزودن به لیست استعلام`;
- `درخواست بررسی خرید`.

Generic `تماس با ما` links MUST NOT replace the RFQ action on product, variant, category, or price pages.

### 16.1 Context passing

Links MAY pass approved non-sensitive context such as:

- category public ID;
- product public ID;
- variant public ID;
- source page key;
- intended action.

They MUST NOT place the following in the URL:

- customer name, phone, email, or company;
- quantity or confidential buying data;
- uploaded filenames or attachment metadata;
- Odoo record IDs;
- quotation, price-list, supplier, or inventory identifiers;
- internal UTM parameters.

All RFQ fields MUST remain editable. Query variants MUST canonicalize to the single RFQ route and MUST NOT enter sitemaps or become indexable.

### 16.2 “Add to RFQ” behavior

An “Add to RFQ” control is an application action, not a substitute for the product’s canonical detail link.

- Product names MUST remain normal crawlable links to product pages.
- Add-to-RFQ controls SHOULD be buttons when they mutate client state.
- The final “Review/Submit RFQ” navigation MUST link to the canonical request route.
- A client-side RFQ basket MUST NOT create crawlable item-state URLs.

### 16.3 Confirmation page

The thank-you page MUST:

- remain `noindex` and outside navigation and XML sitemaps;
- be reachable only after valid acceptance or an approved recovery state;
- link to Process, the Catalog hub, Homepage, or Contact as useful continuations;
- avoid exposing submitted item or customer data in its URL or HTML source.

---

## 17. Anchor Text System

### 17.1 Principles

Anchor text MUST be:

- descriptive in Persian;
- accurate for the destination’s visible content;
- natural in its sentence;
- aligned with the page’s approved topic ownership;
- free from unsupported price, inventory, or superiority claims;
- concise enough to scan on mobile.

### 17.2 Examples

| Avoid | Prefer | Destination purpose |
|---|---|---|
| `اینجا کلیک کنید` | `مشاهده راهنمای خرید میلگرد` | Guide |
| `بیشتر` | `مشاهده مشخصات تیرآهن IPE` | Product |
| `محصولات` | `دسته‌بندی آهن‌آلات` | Catalog hub |
| `قیمت` | `قیمت و شرایط خرید ورق سیاه` | Price owner |
| `خرید فوری` | `ارسال لیست خرید برای بررسی` | RFQ |
| `ارزان‌ترین میلگرد` | `بررسی قیمت و مشخصات میلگرد` | Neutral commercial page |
| `خدمات` | `مدیریت تأمین فولاد` | Procurement hub |

### 17.3 Repetition

Repeated links to the same destination within one component SHOULD be consolidated. Repetition across header, breadcrumb, body, and CTA is acceptable when each instance serves a different interface role.

### 17.4 Automatic keyword linking

The CMS MUST NOT automatically link every occurrence of terms such as `میلگرد`, `تیرآهن`, `ورق`, `پروفیل`, `لوله`, grades, sizes, factories, or cities.

---

## 18. Breadcrumbs

Breadcrumbs MUST express the actual public hierarchy.

Conceptual examples:

```text
خانه ← کاتالوگ آهن‌آلات ← میلگرد ← میلگرد A3
خانه ← قیمت آهن‌آلات ← قیمت میلگرد ← قیمت میلگرد ۱۶
خانه ← مقالات ← راهنمای خرید میلگرد
```

Requirements:

- ancestors MUST be real canonical anchors;
- the current page MUST be plain text or use `aria-current="page"` without linking to itself;
- filters, sort states, sessions, and RFQ state MUST NOT appear in breadcrumbs;
- visible breadcrumbs and `BreadcrumbList` JSON-LD MUST match;
- labels MUST follow the approved Persian navigation terminology;
- mobile layouts MUST preserve meaningful ancestors and accessible navigation semantics.

---

## 19. Faceted Navigation, Search, and Pagination

### 19.1 Filter states

Filters such as size, grade, brand, standard, unit, origin, availability, or sort order MUST NOT generate crawlable links unless the combination has been approved as a unique SEO landing page.

For non-indexable filters:

- use buttons, form controls, or application state—not crawlable `<a href>` links;
- exclude URLs from XML sitemaps;
- prevent filter state from entering related-content components;
- apply the canonical and robots policy defined in `SITEMAP_ROBOTS_SPEC.md`;
- do not rely on canonical tags alone to control an unlimited crawl space.

### 19.2 Approved SEO landing pages

An attribute combination may become a landing page only when it has:

- approved query ownership;
- stable canonical route;
- unique useful content;
- meaningful product availability or decision value;
- parent and contextual inbound links;
- complete metadata and indexability approval.

### 19.3 Internal search

Search-result URLs MUST NOT be relied on for discovery of indexable pages. Search forms and results MAY help users, but indexable catalog pages require structural crawlable links elsewhere.

### 19.4 Pagination

If category or article collections require pagination:

- each pagination URL MUST be crawlable and stable;
- internal links and canonical tags MUST use the same normalized URL form;
- first-page URLs MUST be consistent about including or omitting a page parameter;
- infinite scroll MUST provide equivalent paginated links in HTML;
- empty or out-of-range pages MUST return the correct status.

---

## 20. Header, Footer, and Utility Navigation

### 20.1 Header

The header SHOULD expose a small set of primary destinations:

- procurement or process;
- catalog;
- price hub when released;
- articles/guides when released;
- About/Contact as approved;
- one primary RFQ action.

Header links MUST be server-rendered, keyboard-accessible, canonical, and locale-aware.

### 20.2 Footer

The footer SHOULD expose compact groups for:

- procurement and process;
- primary catalog categories;
- price and knowledge hubs when released;
- company and contact;
- RFQ;
- privacy and terms.

The footer MUST NOT duplicate the complete catalog or become a keyword-stuffed sitemap. An important page whose only inbound link is the footer is a near-orphan.

### 20.3 Logo and active states

- The logo MUST link to `/`.
- Active navigation items SHOULD use `aria-current="page"` or the appropriate descendant state.
- Body components, related blocks, and breadcrumb-current items MUST suppress unnecessary self-links.

---

## 21. Publication and Link Eligibility

A record may appear in the internal-link graph only when all required fields are valid.

Conceptual eligibility fields:

```ts
type PublicNode = {
  id: string;
  type: 'page' | 'category' | 'product' | 'variant' | 'price' | 'article';
  routeKey: string;
  canonicalPath: string;
  locale: 'fa-IR';
  status: 'draft' | 'review' | 'published' | 'archived';
  indexable: boolean;
  linkable: boolean;
  parentId?: string;
  odooExternalId?: string;
  publishedAt?: string;
  updatedAt: string;
};
```

Rules:

- `published` and `linkable` are required for public links.
- `indexable=false` does not automatically mean `linkable=false`; legal or operational pages may need user-facing links.
- Draft, review, archived, deleted, expired, or sync-invalid records MUST NOT appear in public related-content blocks.
- Odoo `active=true` is not a public publication decision.
- A sync failure MUST preserve the last known valid public link graph unless content is explicitly withdrawn for safety or accuracy.

---

## 22. Relationship Data Model

Relationships SHOULD be stored as controlled IDs, not arbitrary URL strings.

```ts
type InternalRelation = {
  sourceId: string;
  destinationId: string;
  relationType:
    | 'parent'
    | 'child'
    | 'related'
    | 'alternative'
    | 'complementary'
    | 'price-owner'
    | 'commercial-owner'
    | 'guide'
    | 'procurement'
    | 'rfq';
  anchorOverrideFa?: string;
  position?: number;
  editorial: boolean;
  enabled: boolean;
};
```

Validation MUST:

- resolve the destination through the canonical route registry;
- reject self-relations and duplicates;
- reject unpublished destinations;
- reject locale mismatches;
- preserve explicit editorial ordering;
- prevent arbitrary external URLs in internal-link fields;
- validate reciprocal parent/child and product/price mappings where required.

---

## 23. Central Route Registry

All reusable links MUST resolve from a typed registry.

```ts
type RouteKey =
  | 'home'
  | 'procurement'
  | 'process'
  | 'catalogHub'
  | 'categoryDetail'
  | 'productDetail'
  | 'variantDetail'
  | 'priceHub'
  | 'priceDetail'
  | 'articleHub'
  | 'articleDetail'
  | 'about'
  | 'contact'
  | 'request'
  | 'requestThankYou';

type RouteRecord = {
  key: RouteKey;
  buildPath: (params?: Record<string, string>) => string;
  status: 'launch' | 'conditional' | 'reserved' | 'system';
  indexable: boolean;
  localePolicy: 'unprefixed-fa' | 'localized';
};
```

Route strings MUST NOT be duplicated across header, footer, cards, breadcrumbs, articles, catalog templates, price templates, and RFQ components.

---

## 24. Rendering, Performance, and Cache Rules

- Critical internal links MUST exist in server-rendered HTML.
- Link eligibility MUST be resolved before response rendering or from the cached read model.
- Critical links MUST NOT wait for intersection observers or client-side API calls.
- Prefetching MUST NOT be enabled blindly for every product, footer, filter, or related-content link.
- Product grids SHOULD limit eager prefetch based on framework behavior and performance budgets.
- Relationship changes MUST invalidate affected source-page caches as well as the changed destination page.
- Cache invalidation SHOULD use targeted tags such as `page:<id>`, `category:<id>`, `product:<id>`, `price:<id>`, and `article:<id>`.
- A stale cache MUST never expose a link to a withdrawn unsafe destination beyond the emergency-purge window defined in `CACHING_STRATEGY.md`.

---

## 25. Link Placement and Component Limits

Recommended order of value:

1. contextual body link at the relevant decision point;
2. parent/child link in a clear structural module;
3. price/product relationship link;
4. curated related-content link;
5. footer link.

Default component capacities:

| Component | Default visible links | Rule |
|---|---:|---|
| Related products | 3–6 | Curated or relevance-ranked from approved relations |
| Related variants | 2–5 | Only useful alternatives or adjacent decisions |
| Related guides/articles | 2–4 | Topic relevance before recency |
| Related price pages | 1–4 | Exact or parent price relationships only |
| Procurement continuation | 1–2 | Most relevant capability/process pages |
| RFQ CTA | 1 primary per decision block | Repetition only at distinct journey stages |

These are defaults, not SEO quotas. A page MAY use fewer links when fewer relationships are useful.

---

## 26. Crawl Depth and Inbound-Link Requirements

Preferred maximum depth from the homepage:

| Page family | Preferred depth |
|---|---:|
| Core hubs, Process, RFQ | 1 click |
| Categories and procurement capabilities | 2 clicks |
| Products and category price pages | 2–3 clicks |
| Approved variants and product price pages | 3 clicks |
| Articles and guides | 2–3 clicks |
| Legal pages | 1 click through footer |

Every indexable page MUST have:

- at least one structural inbound link from a hub or parent;
- at least one contextual or relationship-based inbound link where a natural relationship exists;
- at least one relevant outgoing continuation;
- discovery independent of search, filters, JavaScript state, or XML sitemaps.

An XML sitemap does not cure an orphan page.

---

## 27. Orphan, Near-Orphan, and Dead-End Definitions

### 27.1 Orphan

An indexable page with no crawlable internal inbound link from another live page.

### 27.2 Near-orphan

A page whose only discovery path is one of the following:

- footer;
- XML sitemap;
- internal search;
- filter or tag archive;
- JavaScript-only interface;
- unrelated article;
- low-value system page.

### 27.3 Dead end

A substantive page with no useful continuation beyond global navigation. Each page SHOULD provide a parent, adjacent decision, guide, price/product relationship, process step, or RFQ action.

---

## 28. Accessibility

- Link purpose MUST be understandable from its text or accessible context.
- Body links MUST be distinguishable without relying on color alone.
- Focus states MUST be visible.
- Touch targets MUST meet the project accessibility target.
- Links and buttons MUST look and behave according to their actual function.
- Card links MUST avoid nested interactive elements.
- Icon links require localized accessible names.
- Breadcrumbs require a labeled navigation landmark.
- RTL visual order MUST preserve logical DOM, keyboard, and screen-reader order.
- Fragment destinations MUST account for sticky-header offset.
- Motion effects MUST respect reduced-motion preferences.

---

## 29. Analytics

Recommended event:

```text
internal_link_click
```

Allowed non-sensitive parameters:

- `source_path`;
- `destination_path`;
- `link_role`;
- `component_id`;
- `content_family`;
- `position_group`;
- `locale`;
- `relation_type`.

Analytics MUST NOT collect customer-entered RFQ data, quantities, company details, contact details, attachment names, private price data, Odoo IDs, or full query strings.

Analytics MUST never delay navigation.

---

## 30. Content and Admin Workflow

Before publishing a page, the operator MUST define:

1. canonical route key and slug;
2. parent/hub relationship;
3. dominant topic owner;
4. structural inbound link;
5. contextual inbound opportunity;
6. required outgoing relationships;
7. price relationship, if applicable;
8. RFQ context key;
9. breadcrumb path;
10. indexability and publication state.

The admin interface SHOULD provide controlled selectors for related products, variants, price pages, articles, and procurement pages. It SHOULD NOT require operators to paste arbitrary internal URLs.

### 30.1 New-page release checklist

- [ ] Page exists in `SITEMAP.md`.
- [ ] Canonical path exists in `ROUTES.md`.
- [ ] Topic ownership is approved.
- [ ] Public content is complete and useful.
- [ ] Parent/hub links to the page.
- [ ] Contextual inbound link is identified where appropriate.
- [ ] Breadcrumb is correct.
- [ ] Outgoing links are useful and live.
- [ ] Price link copy matches price freshness and visibility.
- [ ] RFQ action uses an approved non-sensitive context key.
- [ ] XML sitemap, canonical, robots, and internal links agree.
- [ ] RTL, responsive, keyboard, and screen-reader QA pass.

### 30.2 Retirement or merge

When a page is removed or merged:

- update or remove all internal links before release;
- point links to the most relevant surviving destination, not automatically to `/`;
- create a permanent redirect when approved;
- remove the old URL from navigation, relationship records, breadcrumbs, and XML sitemaps;
- invalidate cached source pages containing the old link;
- record the change in `REDIRECTS.md`, `CHANGELOG.md`, and `DECISIONS.md` when material.

---

## 31. Automated Validation

The build and release pipeline MUST validate:

- every internal `href` resolves to an approved canonical route;
- no public link targets a redirect, error, draft, preview, or missing page;
- critical links exist in rendered HTML;
- no indexable page is orphaned;
- no important page is a near-orphan;
- no breadcrumb points to a missing ancestor;
- no component contains self-links or duplicate destinations;
- no internal UTM parameters exist;
- no filter, search, session, preview, or RFQ-state URLs leak into the crawlable graph;
- visible breadcrumb and `BreadcrumbList` data agree;
- product/variant and price mappings agree;
- stale-price states do not use current-price anchors;
- unpublished locales and `/fa` URLs are absent;
- the thank-you page is absent from navigation and XML sitemaps;
- route, canonical, redirect, sitemap, and internal-link forms are identical.

Recommended crawl report fields:

```text
url
canonical_url
route_key
entity_type
publication_status
indexable
crawl_depth
inbound_count_by_role
outbound_count_by_role
source_urls
anchor_texts
response_status
redirect_chain
orphan_flag
near_orphan_flag
dead_end_flag
price_state
locale
```

---

## 32. Manual QA Checklist

### Architecture

- [ ] Every hub links to all and only published direct children.
- [ ] Every child links to its true parent.
- [ ] Category, product, variant, and price relationships are correct.
- [ ] Articles link to canonical topic owners.
- [ ] Important pages do not rely only on footer or sitemap links.
- [ ] RFQ is the primary commercial continuation.

### Copy and trust

- [ ] Persian anchors accurately describe destinations.
- [ ] Anchors do not imply checkout, guaranteed inventory, or guaranteed price.
- [ ] Current-price anchors appear only when a valid current price is visible.
- [ ] Automatic keyword stuffing is absent.
- [ ] Related links are curated by relevance.

### Technical SEO

- [ ] Links are real server-rendered anchors.
- [ ] Links point directly to canonical URLs.
- [ ] Normal internal links do not use `nofollow`.
- [ ] No unapproved filter or query URLs are crawlable.
- [ ] No broken, redirected, self, or duplicate links remain.
- [ ] Internal links, canonicals, redirects, sitemaps, and structured data agree.

### Accessibility and performance

- [ ] Link purpose and focus state are clear.
- [ ] Card components contain no nested interactive controls.
- [ ] RTL reading and focus order are correct.
- [ ] Links work at 320 px width and 200% zoom.
- [ ] Critical links exist without client JavaScript.
- [ ] Link components remain within the performance budget.

---

## 33. Minimum Phase 1 Link Graph

The exact catalog, price, article, and RFQ paths come from `ROUTES.md`; keys are used here deliberately.

| Source | MUST link to |
|---|---|
| Home | Procurement, Process, Catalog hub, About, request; Price hub when live |
| Procurement hub | All approved procurement children, Process, request |
| Procurement child | Procurement parent, relevant adjacent capability or Process, relevant catalog/guide page, request |
| Process | Procurement, relevant capability, RFQ preparation guidance, request |
| Catalog hub | Every published category, selected buying guides, request |
| Category | Catalog parent, every published direct product, valid category price owner, request |
| Product | Category parent, approved variants/selector, exact valid price owner, guide, request |
| Variant | Product parent, exact valid price owner, relevant variants/guide, request |
| Price hub | Every published category price page, methodology/freshness guidance, request |
| Price detail | Exact commercial entity, price parent, guide when relevant, request |
| Articles hub | Every published article and main topic hubs |
| Article | Article parent, canonical commercial owner(s), related guide, request when appropriate |
| About | Procurement, Process, Contact, request |
| Request | Process, Privacy, support contact, preparation guide |
| Thank-you | Process, Catalog or Homepage, Contact when needed |

---

## 34. Prohibited Patterns

The following are prohibited:

- links to unpublished, placeholder, or Odoo-only records;
- links that pass through redirects;
- automatic keyword linking across every occurrence;
- sitewide exact-match keyword blocks;
- footer link stuffing;
- hidden or visually obscured SEO links;
- links whose anchor promises price content that is not visible;
- internal `nofollow` used for authority sculpting;
- identical anchors pointing to unrelated destinations;
- multiple indexable pages owning the same intent without an approved distinction;
- filter, sort, tag, search, preview, session, or RFQ-state URLs in the crawlable graph;
- internal UTM parameters;
- linking to the thank-you page before submission;
- self-links in breadcrumbs, related blocks, or body content;
- opening ordinary internal links in a new tab;
- city, factory, brand, grade, size, or price doorway pages without unique approved value;
- creating a public variant page solely because Odoo contains a variant;
- using live Odoo responses to generate public navigation;
- using the RFQ CTA label for a destination other than the canonical RFQ flow.

---

## 35. Acceptance Criteria

The internal-link system is complete only when:

- one canonical route is selected for the structured RFQ flow;
- exact catalog, product, variant, price, and article routes are approved in `ROUTES.md`;
- every indexable page has structural discovery and a useful continuation;
- catalog, price, article, procurement, and RFQ clusters form a coherent graph;
- Odoo commercial identity maps to—but does not control—public link publication;
- public navigation never depends on a live Odoo call;
- price-related anchors respect approval, completeness, freshness, and visible content;
- non-indexable filter states do not create crawl traps;
- links are server-rendered, canonical, accessible, and locale-correct;
- automated crawling reports no broken links, redirect links, orphans, unintended dead ends, invalid fragments, or route inconsistencies;
- related-content and route data are centrally controlled rather than scattered as arbitrary URLs;
- the link graph supports the path from research to structured RFQ without presenting a false checkout experience.

---

## 36. Implementation Handoff

Before implementation, the coding agent MUST read:

1. `PROJECT_BRIEF.md`;
2. `DECISIONS.md`;
3. `ROUTES.md`;
4. `SITEMAP.md`;
5. `INFORMATION_ARCHITECTURE.md`;
6. `SEO_KEYWORD_MAP.md`;
7. `SEO_PAGE_MAP.md`;
8. `PRODUCT_CATALOG_SPEC.md`;
9. `PRICING_SYSTEM.md`;
10. `RFQ_SYSTEM.md`;
11. `FORM_ARCHITECTURE.md`;
12. `CMS_ARCHITECTURE.md`;
13. `METADATA_SPEC.md`;
14. `STRUCTURED_DATA.md`;
15. `SITEMAP_ROBOTS_SPEC.md`;
16. `CACHING_STRATEGY.md`;
17. this document.

Implementation MUST begin with:

1. resolution of the canonical RFQ route conflict;
2. approval of exact catalog, product, variant, price, and article patterns;
3. a typed route registry;
4. controlled content-relationship records;
5. server-rendered link components;
6. an automated internal crawl and graph report.

The coding agent MUST NOT invent missing routes, product relationships, price eligibility, claims, suppliers, variants, articles, or keyword targets. Missing or conflicting inputs MUST be recorded for approval.

---

## 37. Authoritative References

- [Google Search Central — Link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Google Search Central — SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google Search Central — URL structure best practices](https://developers.google.com/search/docs/crawling-indexing/url-structure)
- [Google Search Central — Canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
- [Google Search Central — Ecommerce URL structure](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites)
- [Google Search Central — Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)

---

**End of `INTERNAL_LINKING.md`**
