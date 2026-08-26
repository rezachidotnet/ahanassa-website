# Ahan Asa Website — Sitemap and Robots Specification

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `SITEMAP_ROBOTS_SPEC.md`  
> **Status:** Draft v1.0 — Implementation contract for approval  
> **Last updated:** 2026-08-25  
> **Launch locale:** Persian (`fa`), fully RTL  
> **Target stack:** Next.js App Router + TypeScript  
> **Primary outputs:** `/sitemap.xml` and `/robots.txt`

---

## 1. Purpose

This document defines how the Ahan Asa website must generate, serve, validate, and maintain its XML sitemap and `robots.txt` file.

It is an implementation contract for the project owner, SEO team, content team, developers, QA, and Claude Code. It answers:

- which URLs may appear in the XML sitemap;
- which URLs must be excluded;
- how published CMS records enter or leave the sitemap;
- how locale, canonical, redirect, status, and indexability rules interact;
- how `lastmod` must be calculated;
- how production, staging, preview, and development environments differ;
- which crawler paths may be disallowed in `robots.txt`;
- how the two files must be implemented in Next.js App Router;
- which automated and manual checks are required before deployment.

The sitemap is a discovery and canonicalization signal. It is not a guarantee of crawling, indexing, or ranking. `robots.txt` controls crawler access; it is not an authentication system and must not be used to protect confidential content.

---

## 2. Authority and Dependency Rules

### 2.1 Source-of-truth order

The implementation must use the following authority order:

1. explicit owner decisions recorded in `DECISIONS.md`;
2. approved `PROJECT_BRIEF.md`;
3. approved `SITEMAP.md` for page existence, hierarchy, publication status, and indexation intent;
4. approved `ROUTES.md` for exact paths, locale prefixes, aliases, redirects, parameters, and route behavior;
5. approved `HREFLANG_CANONICAL.md` for canonical and alternate-language mappings;
6. approved `REDIRECTS.md` for legacy and renamed URL behavior;
7. `SEO_PAGE_MAP.md`, `METADATA_SPEC.md`, and content records for page-level SEO state;
8. this document for sitemap and crawler implementation;
9. framework code.

### 2.2 Conflict handling

Claude Code must not guess when these documents conflict.

If two documents disagree about a path, locale, canonical, indexation state, or publication status:

1. stop sitemap generation for the affected URL;
2. report the exact conflicting records;
3. keep the URL out of the production sitemap;
4. record the decision in `DECISIONS.md`;
5. synchronize the affected documents before deployment.

The generator must never create a URL merely because an application folder exists. Likewise, removing a route from navigation does not automatically authorize removing or redirecting its URL.

### 2.3 Current route assumption

The current `ROUTES.md` contract defines:

- Persian as the active Phase 1 locale;
- Persian canonical URLs without a locale prefix;
- `/en/**` and `/ar/**` as reserved until their complete locale releases are approved;
- `/fa/**`, if reachable as an alias, as a permanent redirect to the unprefixed Persian equivalent;
- `/request` as the canonical primary conversion route and `noindex, follow`;
- `ahanassa.com` as the business domain;
- the final choice between apex and `www` as unresolved.

This document does not hardcode the locale model independently. If an approved revision of `ROUTES.md` changes the locale contract, the sitemap and robots generators must consume that revision through the centralized route manifest.

### 2.4 Launch blocker

The production canonical origin must be approved before launch:

```text
https://ahanassa.com
```

or:

```text
https://www.ahanassa.com
```

Only one may be canonical. Until the choice is recorded, production deployment is blocked. Sitemap, robots, canonical tags, hreflang, Open Graph URLs, structured data, redirects, and internal absolute URLs must all use the same origin.

---

## 3. Required Public Outputs

| Output | Required route | Format | Production status | Purpose |
|---|---|---|---|---|
| XML sitemap | `/sitemap.xml` | UTF-8 XML | `200` | Discover canonical indexable URLs |
| Robots file | `/robots.txt` | UTF-8 plain text | `200` | Declare crawler access policy and sitemap location |

Optional future outputs are allowed only when scale or content type justifies them:

| Optional output | Activation condition |
|---|---|
| Sitemap index | More than one sitemap file is required for scale, ownership, or Search Console segmentation |
| Image sitemap | Important indexable images cannot be reliably discovered from crawlable page markup |
| Video sitemap | Ahan Asa publishes eligible primary video content with approved metadata |
| News sitemap | Ahan Asa becomes an eligible news publisher; not part of Phase 1 |

Do not create empty specialist sitemaps for appearance. Phase 1 should use one reliable `/sitemap.xml` unless a measured need requires segmentation.

---

## 4. Core Definitions

| Term | Definition |
|---|---|
| Canonical URL | The single approved absolute URL intended to represent a page in search |
| Indexable | A substantive public document eligible for `index, follow` |
| Crawlable | Accessible to a crawler and not blocked by `robots.txt` or authentication |
| Published | Approved content exposed in the production environment |
| Active locale | A locale whose required pages, translations, metadata, legal content, and QA are approved |
| Significant update | A material change to primary content, structured data, page relationships, or other search-relevant information |
| Route manifest | The centralized typed record of public URL identity, path, locale, status, indexability, and sitemap eligibility |
| Content manifest | The approved CMS or repository record of publication state, slug, locale, dates, and SEO status |

Indexability and crawlability are separate controls. A page may need to remain crawlable so that a search engine can read its `noindex` directive.

---

## 5. Single URL Eligibility Rule

A URL may appear in the XML sitemap only when every condition below is true.

```text
eligibleForSitemap =
  environment === "production"
  AND route.status is launch or activated-conditional
  AND route.public === true
  AND route.indexable === true
  AND route.sitemap === true
  AND locale.status === active
  AND content.status === published
  AND content.approved === true
  AND finalResponse.status === 200
  AND robotsMeta allows index
  AND canonical is absolute and self-referencing
  AND canonical origin equals configured production origin
  AND URL is not a redirect, alias, duplicate, error, preview, or parameter variant
```

If one condition is false or unknown, exclude the URL.

### 5.1 Required preconditions

Each sitemap URL must:

- use HTTPS;
- use the approved canonical host;
- be fully qualified and absolute;
- use the exact normalized path from `ROUTES.md`;
- have no trailing slash except the root URL;
- contain no fragment;
- contain no tracking or filter query string;
- return a direct `200` response without a redirect hop;
- be self-canonical;
- use `index, follow` or its equivalent default behavior;
- contain substantive approved content;
- belong to an active locale;
- be internally reachable through a normal crawlable `<a href>` path;
- have no conflicting `X-Robots-Tag` header.

### 5.2 Exclude by default

Unknown, ambiguous, conditional, draft, scheduled, expired, archived-with-noindex, or operationally unverified content must remain outside the sitemap until explicitly eligible.

---

## 6. URL-Class Indexing Matrix

| URL class | Example | Page robots | `robots.txt` access | XML sitemap |
|---|---|---|---|---|
| Approved public core page | `/about` | `index, follow` | Allow | Include |
| Approved substantive hub | `/insights` | `index, follow` | Allow | Include |
| Published material category | `/steel-products/[category-slug]` | `index, follow` | Allow | Include |
| Published industry page | `/industries/[industry-slug]` | `index, follow` | Allow | Include |
| Verified project detail | `/projects/[project-slug]` | `index, follow` | Allow | Include |
| Published article | `/insights/[article-slug]` | `index, follow` | Allow | Include |
| Published resource landing page | `/resources/[resource-slug]` | `index, follow` | Allow | Include |
| Primary request form | `/request` | `noindex, follow` | Allow | Exclude |
| Request confirmation | `/request/confirmation` | `noindex, nofollow` | Allow unless protected | Exclude |
| Redirect or alias | `/fa/about` | Not a document | Allow redirect | Exclude |
| Draft or preview | implementation-defined | `noindex, nofollow, noarchive` plus authentication | Disallow as secondary control | Exclude |
| API route | `/api/**` | Not a document | Disallow | Exclude |
| Admin interface | `/admin/**` | Authentication required | Disallow | Exclude |
| Reserved route | `/request-status/**` | Absent or protected | Disallow if deployed | Exclude |
| Search/filter state | `/projects?industry=x` | Canonical to approved base or noindex per SEO decision | Allow unless crawl trap | Exclude |
| Campaign URL | `/?utm_source=x` | Canonical to clean URL | Allow | Exclude parameter version |
| Genuine 404 | unknown path | `noindex` | Allow | Exclude |
| Maintenance/status | `/maintenance`, `/status` | `noindex` | Environment-dependent | Exclude |
| Static application asset | `/_next/**` | Not applicable | Allow | Exclude |
| Private uploaded file | implementation-defined | Authentication required | Disallow as secondary control | Exclude |

Never add a `noindex` URL to the sitemap. Never block `/request` in `robots.txt` merely because it is `noindex`; crawlers must be able to fetch the page to see that directive.

---

## 7. Phase 1 Sitemap Inputs

### 7.1 Static route candidates

The sitemap generator must read static candidates from the approved route manifest. Under the current `ROUTES.md`, the candidate set includes:

```text
/
/about
/procurement
/procurement-process
/steel-products
/industries
/projects
/insights
/resources
/faq
/contact
/privacy
/terms
```

This is a candidate list, not an unconditional output list.

- `/projects` must be excluded until it contains substantive verified evidence.
- `/terms` must be excluded until the route is activated and its legal content is approved.
- `/resources`, `/insights`, `/steel-products`, and `/industries` must not launch as thin or empty shells.
- `/request` is intentionally absent because it is `noindex, follow`.
- Any route removed or renamed by a later approved route decision must follow the new manifest and `REDIRECTS.md`.

### 7.2 Dynamic route candidates

The generator may query only approved published records for these families:

```text
/steel-products/[category-slug]
/industries/[industry-slug]
/projects/[project-slug]
/insights/[article-slug]
/resources/[resource-slug]
```

Each record must expose at least:

```ts
type SitemapContentRecord = {
  id: string;
  type: 'steelProduct' | 'industry' | 'project' | 'insight' | 'resource';
  slug: string;
  locale: 'fa' | 'en' | 'ar';
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  approved: boolean;
  indexable: boolean;
  canonicalPath: string;
  publishedAt: string | null;
  significantlyUpdatedAt: string | null;
};
```

The schema may be extended but must not omit equivalent control fields.

### 7.3 Dynamic record release gates

Before a dynamic URL enters the sitemap:

- the slug must pass the validation rules in `ROUTES.md`;
- the content must be published in the active locale;
- project facts and media must be verified and approved;
- the page must not expose confidential buyer, supplier, quotation, invoice, or project information;
- the page must have unique primary content and metadata;
- the route must resolve directly to `200`;
- the canonical path must match the generated path;
- an internal crawlable link must exist;
- the record must not be superseded by another canonical record.

### 7.4 Removed and archived records

When a published page is removed:

1. remove it from the sitemap in the same release;
2. apply the approved `301`/`308`, `404`, or `410` behavior from `REDIRECTS.md`;
3. update internal links;
4. update canonical and hreflang mappings;
5. never keep the old URL in the sitemap to encourage recrawling.

---

## 8. XML Sitemap Format

### 8.1 Phase 1 format

Serve a standards-compliant UTF-8 XML document at `/sitemap.xml`.

Minimum structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://CANONICAL_HOST/</loc>
    <lastmod>2026-08-25T07:00:00.000Z</lastmod>
  </url>
</urlset>
```

`CANONICAL_HOST` is illustrative and must be replaced from validated runtime configuration.

### 8.2 Required XML rules

- Encode the document as UTF-8.
- Use fully qualified absolute URLs.
- XML-escape all values.
- Include only URLs belonging to the approved canonical site.
- Use one `<url>` element per canonical URL.
- Include a required `<loc>` for each entry.
- Include `<lastmod>` only when its value is truthful and maintained.
- Use W3C date or datetime format.
- Do not include duplicate `<loc>` values.
- Do not include relative paths.
- Do not include redirect targets under a non-canonical host.
- Do not include query-string variants, fragments, or locale aliases.

### 8.3 Omitted tags

Do not emit:

```xml
<priority>
<changefreq>
```

They add maintenance noise and Google ignores them. URL order also has no ranking meaning; use deterministic ordering only for reliable testing and readable diffs.

### 8.4 Deterministic ordering

Recommended order:

1. homepage;
2. static core routes sorted by stable manifest order;
3. dynamic families in this order: steel products, industries, projects, insights, resources;
4. records sorted by locale, then canonical path.

Ordering must remain stable when the content set has not changed.

---

## 9. `lastmod` Policy

### 9.1 Meaning

`lastmod` must represent the last significant change to the canonical page, not the time the sitemap was generated or the application was deployed.

A significant change includes:

- primary visible content;
- meaningful specification or procurement guidance;
- verified project facts or outcomes;
- indexable media that materially changes the page;
- structured data;
- canonical or hreflang mapping;
- important internal links or page relationships;
- material legal content.

The following alone do not justify updating `lastmod`:

- copyright year changes;
- analytics code changes;
- CSS-only adjustments;
- non-material component refactoring;
- build time;
- cache refresh;
- sitemap generation time.

### 9.2 Static pages

Static pages must receive `lastmod` from a maintained content manifest, CMS record, or explicit page metadata field. Do not use `new Date()` during every request or build.

### 9.3 Dynamic pages

Use `significantlyUpdatedAt` when present; otherwise use the approved `publishedAt` timestamp.

```ts
const lastModified = record.significantlyUpdatedAt ?? record.publishedAt;
```

If neither timestamp is trustworthy, omit `<lastmod>` for that URL rather than fabricate one.

### 9.4 Validation

The sitemap test suite must fail when:

- `lastmod` is in the future beyond reasonable clock tolerance;
- a date cannot be parsed;
- every URL receives the build timestamp;
- `lastmod` changes while source content did not materially change;
- the timestamp precedes the record's initial publication in an impossible way.

---

## 10. Locale and Hreflang Rules

### 10.1 Phase 1

Only active, complete, indexable Persian URLs may appear. Do not output `/en/**` or `/ar/**` entries while those locales are reserved. Do not include `/fa/**` aliases when Persian canonical routes are unprefixed.

Do not output hreflang references to nonexistent, redirected, `noindex`, draft, or untranslated pages.

### 10.2 Future locale activation

When another locale is approved:

- every alternate must be a real canonical `200` page;
- each page must list itself and every valid counterpart;
- mappings must be reciprocal;
- alternate URLs must be absolute;
- locale relationships must use a stable page identity, not inferred slug similarity;
- unrelated or partially translated pages must not be grouped;
- `x-default` must follow `HREFLANG_CANONICAL.md` and must not be invented by the sitemap generator.

### 10.3 One hreflang delivery method

The project should choose one primary hreflang delivery method to reduce synchronization risk. HTML metadata is recommended for Phase 1 expansion because it is easier to inspect per page. If XML sitemap hreflang is later approved, it must be generated from the same translation relationship data as page metadata.

Do not independently maintain two manually authored mapping systems.

### 10.4 XML alternates example

Only after locales are active:

```xml
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://CANONICAL_HOST/about</loc>
    <xhtml:link rel="alternate" hreflang="fa" href="https://CANONICAL_HOST/about" />
    <xhtml:link rel="alternate" hreflang="en" href="https://CANONICAL_HOST/en/about" />
    <xhtml:link rel="alternate" hreflang="ar" href="https://CANONICAL_HOST/ar/about" />
  </url>
</urlset>
```

This example is not authorization to publish the reserved locales.

---

## 11. Sitemap Scaling and Segmentation

### 11.1 Protocol limit

A single sitemap must not exceed:

- 50,000 URLs; or
- 50 MB uncompressed.

Split before either limit is reached. Use a sitemap index to reference the child sitemaps.

### 11.2 Project threshold

For operational safety, begin segmentation before the protocol ceiling:

- review segmentation at 40,000 URLs or 40 MB;
- split by stable content family, not arbitrary changing page numbers;
- keep each child sitemap under the official limits after XML expansion;
- ensure all child sitemaps use the same canonical origin.

### 11.3 Recommended future structure

```text
/sitemap.xml                  # sitemap index
/sitemaps/static.xml
/sitemaps/steel-products.xml
/sitemaps/industries.xml
/sitemaps/projects.xml
/sitemaps/insights-1.xml
/sitemaps/resources.xml
```

Do not implement this structure during Phase 1 unless required. If activated, `/robots.txt` should reference only the sitemap index unless a deliberate monitoring decision requires multiple declarations.

---

## 12. `robots.txt` Principles

### 12.1 Responsibilities

Use `robots.txt` to:

- allow crawling of public indexable content;
- reduce crawling of technical or non-public namespaces;
- declare the absolute sitemap URL;
- express environment-specific crawler policy.

Do not use `robots.txt` to:

- keep secrets private;
- replace authentication or authorization;
- remove a public page from search results;
- fix duplicate content;
- replace canonical or redirect rules;
- block CSS, JavaScript, fonts, or image assets required to render public pages;
- block a public `noindex` page before crawlers can read its directive.

### 12.2 Production default

Production should be broadly crawlable. Disallow only approved technical, private, or crawl-waste namespaces.

### 12.3 No crawler-specific favoritism

The default production policy should use `User-agent: *`. Add crawler-specific groups only for a documented operational, legal, security, or performance reason approved in `DECISIONS.md`.

Do not introduce unsupported directives such as `noindex` inside `robots.txt`.

---

## 13. Production `robots.txt` Contract

### 13.1 Required output

After the canonical host is approved, production must render the equivalent of:

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /preview
Disallow: /draft
Disallow: /request-status

Sitemap: https://CANONICAL_HOST/sitemap.xml
```

Rules whose routes do not exist may be omitted. The file must be generated from an explicit allow/disallow configuration; do not scan application folders and automatically expose internal names.

### 13.2 Paths that must remain crawlable

Do not disallow these simply because they are excluded from the sitemap:

```text
/request
/request/confirmation
/_next/
/images/
/fonts/
```

- `/request` needs its page-level `noindex, follow` directive to be visible.
- `/request/confirmation` needs its `noindex, nofollow` directive to be visible if publicly reachable.
- framework and visual assets may be required for search engines to render and understand public pages.

If the confirmation page becomes authenticated or tokenized, access control—not `robots.txt`—is the primary protection.

### 13.3 Query parameters

Do not add broad query-string rules without evidence of a crawl trap. Canonicalization, internal-link hygiene, and controlled filter generation are the primary controls.

If a measured crawl problem later requires parameter blocking, record:

- the exact pattern;
- affected search engines;
- canonical behavior;
- indexation risk;
- test evidence;
- owner and review date.

---

## 14. Non-Production Environment Policy

### 14.1 Staging and preview

Staging and preview deployments must not be publicly indexable.

Use defense in depth:

1. authentication or platform access control;
2. site-wide `X-Robots-Tag: noindex, nofollow, noarchive`;
3. page metadata equivalent to `noindex, nofollow` where HTML is rendered;
4. a restrictive `robots.txt` as a secondary crawl-control layer;
5. no production sitemap submission;
6. no production canonical origin accidentally pointing from unfinished public content.

Recommended secondary `robots.txt`:

```text
User-agent: *
Disallow: /
```

Do not include a `Sitemap:` line in non-production environments.

### 14.2 Development and test

Local development and automated test environments do not need to emulate search-engine submission. They must still test generation logic using a safe example origin such as `https://example.test`.

### 14.3 Environment detection

Crawler policy must be based on an explicit validated environment value, not solely on a hostname substring.

Recommended conceptual values:

```text
APP_ENV=development | test | preview | staging | production
NEXT_PUBLIC_SITE_URL=https://<approved-origin>
```

Fail closed for unknown environments: noindex globally and do not expose a production sitemap.

---

## 15. Page-Level Robots Directives

`robots.txt` and page-level robots metadata must be coordinated.

| Page state | Required directive |
|---|---|
| Approved public indexable page | `index, follow` |
| Request form | `noindex, follow` |
| Confirmation/success | `noindex, nofollow, noarchive` |
| Draft/preview | `noindex, nofollow, noarchive` plus authentication |
| 404/error | `noindex` and correct HTTP status |
| Maintenance | `noindex, nofollow`; use appropriate temporary HTTP behavior |
| Private document | Authentication; use `X-Robots-Tag: noindex, nofollow, noarchive` as secondary control |

For non-HTML indexable files such as approved public PDFs, indexing rules must use HTTP headers because HTML metadata is unavailable. Public PDF indexation requires a separate content and SEO decision; a resource landing page is preferred as the canonical search destination unless the PDF has a distinct approved intent.

---

## 16. Next.js App Router Implementation Contract

### 16.1 Required conventions

Use Next.js metadata route conventions:

```text
app/sitemap.ts
app/robots.ts
```

Equivalent route handlers may be used only when the metadata API cannot satisfy an approved requirement. Do not maintain both a static public file and a dynamic route for the same path.

### 16.2 Shared data sources

Both generators must import:

- validated canonical-origin configuration;
- the centralized route manifest;
- the locale registry;
- the published content repository or CMS adapter;
- canonical-path normalization helpers.

They must not contain independent duplicated route arrays after the route manifest exists.

### 16.3 Sitemap implementation shape

Conceptual example:

```ts
import type { MetadataRoute } from 'next';

import { getSiteConfig } from '@/lib/config/site';
import { getSitemapStaticRoutes } from '@/lib/routes/manifest';
import { getPublishedSitemapRecords } from '@/lib/content/sitemap';
import { buildCanonicalUrl } from '@/lib/seo/url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { canonicalOrigin, environment } = getSiteConfig();

  if (environment !== 'production') return [];

  const staticRoutes = getSitemapStaticRoutes();
  const dynamicRecords = await getPublishedSitemapRecords();

  return [...staticRoutes, ...dynamicRecords]
    .filter((item) => item.indexable && item.sitemapEligible)
    .map((item) => ({
      url: buildCanonicalUrl(canonicalOrigin, item.canonicalPath),
      ...(item.lastSignificantModification
        ? { lastModified: item.lastSignificantModification }
        : {}),
    }));
}
```

The final code must deduplicate entries and validate the origin, status, locale, canonical path, and dates before returning data.

### 16.4 Robots implementation shape

Conceptual example:

```ts
import type { MetadataRoute } from 'next';

import { getSiteConfig } from '@/lib/config/site';

export default function robots(): MetadataRoute.Robots {
  const { canonicalOrigin, environment } = getSiteConfig();

  if (environment !== 'production') {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/preview',
          '/draft',
          '/request-status',
        ],
      },
    ],
    sitemap: `${canonicalOrigin}/sitemap.xml`,
  };
}
```

This is a behavioral example, not a mandatory internal folder structure. Omit unused rules and ensure the final output matches the deployed Next.js version.

### 16.5 Rendering and cache behavior

- The production outputs must be reliably available after deployment.
- Sitemap data may be statically generated when all sources are build-time stable.
- If CMS content changes independently, use an approved revalidation strategy.
- A content publish, unpublish, slug change, indexability change, or significant update must invalidate the sitemap within the approved freshness window.
- Robots changes should deploy only through reviewed configuration changes.
- Generation failure must not silently serve a malformed partial XML file.

### 16.6 Failure behavior

If the CMS or content source is unavailable:

- prefer the last known valid generated sitemap when the deployment architecture safely supports it;
- otherwise fail the build or regeneration visibly;
- never replace the sitemap with an empty successful response without an alert;
- never add draft or unknown records as a fallback.

The exact fallback mechanism belongs in `CACHING_STRATEGY.md` and `DEPLOYMENT_ARCHITECTURE.md`.

---

## 17. Canonical-Origin Validation

At application startup or build time, validate that the production origin:

- uses `https:`;
- has no path, query, or fragment;
- has no trailing slash;
- matches the approved host exactly;
- is not localhost, a preview host, a deployment-provider subdomain, or an example domain;
- is the same origin used by metadata and structured data.

Conceptual validation:

```ts
function validateCanonicalOrigin(value: string): URL {
  const origin = new URL(value);

  if (origin.protocol !== 'https:') throw new Error('Canonical origin must use HTTPS');
  if (origin.pathname !== '/') throw new Error('Canonical origin must not include a path');
  if (origin.search || origin.hash) throw new Error('Canonical origin must be clean');

  return origin;
}
```

Production builds must fail when the canonical origin is missing or invalid.

---

## 18. HTTP Response Requirements

### 18.1 `/sitemap.xml`

- status: `200`;
- content type: XML-compatible, normally `application/xml` or `text/xml`;
- encoding: UTF-8;
- no redirect;
- no authentication in production;
- no `noindex` requirement because this is a sitemap resource;
- valid XML with all URLs entity-escaped.

### 18.2 `/robots.txt`

- status: `200`;
- content type: `text/plain`;
- encoding: UTF-8;
- served at the root of each relevant host;
- no redirect on the canonical host;
- absolute `Sitemap:` URL in production;
- environment-appropriate rules.

### 18.3 Non-canonical hosts

The non-canonical production host should redirect page requests to the canonical host in one hop. Its root `robots.txt` behavior must not contradict the migration strategy. The canonical host's robots file is authoritative, and all submitted sitemaps must use the canonical origin.

---

## 19. Security and Privacy Rules

- Never list invoice files, purchase lists, quotations, user uploads, private PDFs, lead records, secure tokens, internal IDs, webhook URLs, or admin routes in a sitemap.
- Do not include personal data in URLs, sitemap values, logs, monitoring labels, or Search Console annotations.
- Protect private content with authentication and authorization.
- Treat `robots.txt` as public information; never reveal sensitive infrastructure names through unnecessary disallow rules.
- Do not enumerate hidden provider endpoints.
- Preview tokens must not appear in URLs discoverable through sitemap or public links.
- Upload URLs must be private, time-limited where appropriate, and outside public static assets.

---

## 20. Build-Time Validation

The build or CI pipeline must validate the generated sitemap data before production deployment.

### 20.1 Required automated checks

- no duplicate URLs;
- no non-HTTPS URL;
- one approved origin only;
- no relative URL;
- no query string or fragment;
- no trailing slash except root;
- no redirect source or locale alias;
- no `noindex` route;
- no draft, scheduled, reserved, prohibited, internal, or unpublished record;
- no unsupported locale;
- no invalid or future `lastmod`;
- no `<priority>` or `<changefreq>`;
- no URL count or file-size limit violation;
- no private route or personal data pattern;
- every static sitemap route exists in the approved route manifest;
- every dynamic URL maps to one approved published content record;
- deterministic output for unchanged inputs;
- valid `robots.txt` sitemap reference;
- non-production output contains no production sitemap URL.

### 20.2 Cross-document checks

CI should compare:

```text
SITEMAP.md
ROUTES.md
route manifest
content publication records
page robots metadata
canonical URL output
sitemap output
REDIRECTS.md
```

The build must fail for contradictory states such as:

- indexable in the sitemap but `noindex` on the page;
- sitemap URL redirects;
- published locale missing from the locale registry;
- canonical points to a different URL;
- redirect source remains in the sitemap;
- dynamic record published without an approved page family;
- active route missing from both the sitemap and an explicit exclusion list.

---

## 21. Pre-Launch QA Procedure

### 21.1 File checks

- Fetch `/robots.txt` directly.
- Fetch `/sitemap.xml` directly.
- Confirm both return `200` on the canonical host.
- Confirm MIME types and UTF-8 encoding.
- Parse the sitemap as XML.
- Verify the sitemap declared in `robots.txt` is reachable.
- Confirm no preview or staging hostname appears.

### 21.2 URL sampling

For every static URL and a representative sample from each dynamic family:

- follow zero redirects from the sitemap URL;
- confirm final status `200`;
- inspect rendered canonical;
- inspect page robots metadata and `X-Robots-Tag`;
- confirm locale and language metadata;
- verify page identity and internal links;
- verify `lastmod` against its source record.

### 21.3 Exclusion sampling

Explicitly confirm these are absent:

```text
/request
/request/confirmation
/api/**
/admin/**
/preview/**
/request-status/**
/fa/** aliases
/en/** and /ar/** while reserved
404 and error routes
redirect sources
tracking URLs
filter combinations
draft records
private files
```

### 21.4 Crawl simulation

Run an approved crawl from the homepage and compare discovered indexable canonical URLs with the sitemap. Investigate both differences:

- sitemap URLs not found through internal links may be orphaned;
- indexable discovered URLs absent from the sitemap may be missing or accidentally generated.

The expected result is a deliberate, documented relationship—not necessarily identical raw URL counts when excluded utility pages exist.

---

## 22. Search Engine Submission and Monitoring

After production launch:

1. verify ownership of the final canonical domain property in Google Search Console;
2. submit the absolute `/sitemap.xml` URL;
3. confirm the sitemap is also declared in `/robots.txt`;
4. monitor fetch status, parsing errors, submitted URLs, indexed URLs, and canonical mismatches;
5. inspect representative core and dynamic URLs;
6. record material sitemap issues in `CHANGELOG.md` or the project issue tracker.

Submitting a sitemap is a hint, not proof of indexing. Do not repeatedly resubmit an unchanged sitemap as a substitute for resolving content quality, canonical, crawlability, internal-linking, or HTTP-status problems.

### 22.1 Monitoring alerts

Create an alert or release check for:

- `/sitemap.xml` or `/robots.txt` returning non-`200`;
- malformed XML;
- sudden URL-count drop or spike beyond an approved threshold;
- production origin changing unexpectedly;
- staging host appearing in production output;
- sitemap containing redirects, `404`, or `5xx` URLs;
- all `lastmod` values changing at the same build;
- robots changing to `Disallow: /` in production;
- sitemap becoming empty.

---

## 23. Change Management

The following changes require review of this document and synchronized implementation:

- canonical host selection or domain migration;
- default-locale or prefix strategy change;
- activation of English, Arabic, or another locale;
- new public route family;
- new CMS or content source;
- page indexation-policy change;
- new filter, search, pagination, or faceted-navigation system;
- public PDF indexation;
- sitemap segmentation;
- crawler-specific robots rules;
- private portal, account, supplier, admin, or request-tracking functionality;
- major redirect migration.

Every published slug change must update, in the same release:

1. route record;
2. redirect map;
3. sitemap;
4. canonical;
5. hreflang mapping when applicable;
6. structured data;
7. internal links.

---

## 24. Claude Code Execution Rules

Claude Code must:

- inspect the existing repository before implementation;
- read `SITEMAP.md`, `ROUTES.md`, `REDIRECTS.md`, `HREFLANG_CANONICAL.md`, `METADATA_SPEC.md`, and the technical architecture documents when available;
- identify the actual Next.js version before using metadata APIs;
- reuse the centralized route and content manifests;
- avoid hardcoded duplicate route inventories;
- fail safely on unknown environment, canonical origin, locale, status, or content state;
- generate only production-approved canonical URLs;
- add automated tests for all acceptance criteria;
- report document conflicts instead of silently resolving them;
- avoid publishing unsupported languages, product categories, projects, evidence, prices, supplier data, claims, or private files;
- preserve unrelated code and user changes;
- record material design or architecture decisions.

Claude Code must not:

- infer sitemap eligibility from the filesystem alone;
- use the build time as every page's `lastmod`;
- place every route in the sitemap;
- use `robots.txt` as a privacy mechanism;
- block crawlable assets required for rendering;
- publish `/en`, `/ar`, or `/fa` duplicates without approved route changes;
- submit or modify Search Console without explicit authorization;
- deploy while the canonical-host decision remains unresolved.

---

## 25. Definition of Done

`SITEMAP_ROBOTS_SPEC.md` is implemented when:

- `/sitemap.xml` and `/robots.txt` are generated by one coherent source-of-truth system;
- the canonical origin is approved, validated, and used consistently;
- all sitemap entries are canonical, indexable, published, approved, `200` URLs;
- all required exclusions are absent;
- production and non-production crawler policies are different and tested;
- `/request` is crawlable but excluded and marked `noindex, follow`;
- preview, draft, private, admin, API, confirmation, error, redirect, alias, and parameter URLs are excluded;
- `lastmod` is accurate or omitted;
- locales appear only after full activation;
- XML and robots formats validate;
- route, canonical, robots-meta, redirect, and sitemap states have no conflicts;
- automated checks pass in CI;
- manual production QA passes;
- the production sitemap is submitted to the verified canonical-domain Search Console property;
- monitoring is in place for critical regressions.

---

## 26. Open Decisions

| Decision | Current state | Owner | Launch impact |
|---|---|---|---|
| Canonical host: apex or `www` | TBD | Project Owner + Technical | Blocks production absolute URLs |
| Final route alignment between all sitemap-related documents | Pending review | Project Owner + SEO | Blocks affected URLs |
| Exact public material categories | TBD | Business + Content | Dynamic sitemap records |
| Exact published industry pages | TBD | Business + Content | Dynamic sitemap records |
| Verified project inventory | TBD | Project Owner | `/projects` and detail pages |
| Launch insight/resource inventory | TBD | Content + SEO | Hub and detail eligibility |
| Legal approval for `/privacy` and `/terms` | TBD | Legal/Project Owner | Page publication and indexation |
| CMS and revalidation strategy | TBD | Technical | Sitemap freshness |
| Public PDF indexation policy | TBD | SEO + Content | Header and sitemap behavior |
| Future locale activation and hreflang method | Reserved | Project Owner + Localization + SEO | Multilingual sitemap behavior |
| Sitemap freshness SLA after content publication | TBD | Technical + Content | Cache/revalidation behavior |

Unresolved decisions must not be filled with assumptions in production.

---

## 27. Approval Checklist

The project owner and relevant reviewers must confirm:

- [ ] The canonical host is selected.
- [ ] Persian is currently unprefixed, or an approved revised locale rule is recorded.
- [ ] `/request` remains `noindex, follow` and excluded from the sitemap.
- [ ] Static and dynamic eligibility rules are accepted.
- [ ] Production `robots.txt` disallow rules match real deployed namespaces.
- [ ] Non-production environments use authentication and global noindex controls.
- [ ] `lastmod` fields have a reliable source.
- [ ] Locale activation gates are accepted.
- [ ] Private files and inquiry data can never enter public sitemap sources.
- [ ] CI cross-checks and production monitoring have owners.
- [ ] Search Console submission responsibility is assigned.

---

## 28. Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| SEO Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |
| Content/CMS Approval | TBD | Pending | — |
| Legal/Privacy Approval | TBD | Pending | — |

---

## 29. Official References

- [Google Search Central — Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search Central — Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Google Search Central — Localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Sitemaps.org — Sitemap protocol](https://www.sitemaps.org/protocol.html)
- [Next.js — `sitemap.xml` metadata convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js — `robots.txt` metadata convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
