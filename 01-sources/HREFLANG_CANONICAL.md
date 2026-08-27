# Ahan Asa Website — Canonical and Hreflang Specification

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Canonical production origin:** `https://www.ahanassa.com`  
> **Document:** `HREFLANG_CANONICAL.md`  
> **Status:** v1.0 — Normative implementation contract  
> **Last updated:** 2026-08-25  
> **Launch locale:** Persian (`fa-IR`), fully RTL, unprefixed  
> **Future reserved locales:** English (`en`), Arabic (`ar`)

---

## 1. Purpose

This document defines the single canonical URL policy and the alternate-language relationship policy for the Ahan Asa website. It is the source of truth for:

- canonical origin, host, protocol, path, and query normalization;
- page-level `rel="canonical"` output;
- `hreflang` activation, values, reciprocity, and completeness;
- `x-default` behavior;
- locale-equivalence data and localized slug mapping;
- canonical behavior for indexable, non-indexable, redirected, missing, and parameterized URLs;
- Next.js App Router implementation;
- sitemap, redirect, metadata, structured-data, and internal-link consistency;
- automated validation and launch acceptance.

The goal is to ensure that each public document has one authoritative URL and that search engines receive alternate-language relationships only when genuinely equivalent localized pages exist.

This specification does not authorize publication of a language, page, product category, project, service, market, claim, or translation that is not otherwise approved.

---

## 2. Normative Language

The words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

- **Canonical URL:** the preferred authoritative URL for a document.
- **Self-canonical:** a canonical URL that points to the current page's normalized URL.
- **Alternate:** a real localized version of the same page identity.
- **Locale cluster:** all approved localized versions of one page identity.
- **Page identity:** a stable locale-independent key that relates translations.
- **Active locale:** a locale approved for production and supported by complete public content.
- **Reserved locale:** a planned locale that must not yet be rendered, indexed, linked, or advertised.

---

## 3. Authority and Conflict Resolution

Use the following authority order for canonical and hreflang decisions:

1. Explicit owner decisions recorded in `DECISIONS.md`
2. This `HREFLANG_CANONICAL.md`
3. `ROUTES.md`
4. `REDIRECTS.md`
5. `SITEMAP_ROBOTS_SPEC.md`
6. `METADATA_SPEC.md`
7. `STRUCTURED_DATA.md`
8. `STACK.md` and `TECHNICAL_ARCHITECTURE.md`
9. Framework code and deployment configuration

### 3.1 Canonical-host decision

This specification adopts the canonical production origin already stated in `STACK.md`:

```text
https://www.ahanassa.com
```

This resolves the earlier `www` versus apex placeholder recorded in `ROUTES.md`, `REDIRECTS.md`, and `SITEMAP_ROBOTS_SPEC.md`.

Required synchronization change:

- mark `https://www.ahanassa.com` as the approved canonical origin in those documents;
- replace `<canonical-host>` with `www.ahanassa.com`;
- define `https://ahanassa.com/**` as non-canonical and permanently redirected;
- remove launch-blocking language that says the host is still undecided.

If the business owner later changes the canonical host, the change must be recorded in `DECISIONS.md` and released atomically across redirects, metadata, sitemap, robots, JSON-LD, Open Graph, internal absolute links, analytics configuration, and search-engine properties.

---

## 4. Locked Canonical URL Shape

Every production canonical HTML URL MUST follow this shape:

```text
https://www.ahanassa.com/<normalized-path>
```

| Component | Required value |
|---|---|
| Scheme | `https` |
| Host | `www.ahanassa.com` |
| Port | Omitted |
| Persian locale prefix | Omitted |
| Non-default locale prefix | Required after activation: `/en`, `/ar` |
| Path alphabet | Lowercase Latin ASCII |
| Multiword separator | Hyphen (`-`) |
| Trailing slash | Omitted except root `/` |
| File extension | Omitted for HTML routes |
| Fragment | Never included in canonical or hreflang URLs |
| Query string | Omitted unless a future approved page identity explicitly requires it |

Examples:

```text
https://www.ahanassa.com/
https://www.ahanassa.com/about
https://www.ahanassa.com/procurement-process
https://www.ahanassa.com/insights/how-to-compare-steel-quotations
```

Future examples, only after locale activation:

```text
https://www.ahanassa.com/en/about
https://www.ahanassa.com/ar/about
```

Invalid canonical forms:

```text
http://www.ahanassa.com/about
https://ahanassa.com/about
https://www.ahanassa.com/fa/about
https://www.ahanassa.com/About
https://www.ahanassa.com/about/
https://www.ahanassa.com/about?utm_source=campaign
https://preview-deployment.vercel.app/about
```

---

## 5. Locale Policy

### 5.1 Locale registry

| Locale key | Language tag | Direction | URL pattern | Status | Search output |
|---|---|---:|---|---|---|
| `fa` | `fa-IR` for document/OG context; `fa` for hreflang | RTL | `/{path}` | Active at launch | Canonical only in Phase 1 |
| `en` | `en` | LTR | `/en/{path}` | Reserved | No route, canonical, hreflang, or sitemap entry |
| `ar` | `ar` | RTL | `/ar/{path}` | Reserved | No route, canonical, hreflang, or sitemap entry |

The HTML document language for launch pages is:

```html
<html lang="fa" dir="rtl">
```

`fa-IR` MAY be used in content records and Open Graph locale output (`fa_IR`), but hreflang uses `fa` because the current Persian content is language-targeted rather than a distinct multi-region Persian variant.

### 5.2 Phase 1 rule: canonical only

Persian is the only active locale in Phase 1. Therefore every eligible page MUST emit a self-canonical, and the site MUST NOT emit:

- `hreflang="fa"` as a single-language cluster;
- `hreflang="en"`;
- `hreflang="ar"`;
- `hreflang="x-default"`;
- `/fa/**` alternate URLs;
- alternate-language entries in XML sitemaps.

Hreflang becomes useful and is activated only when at least two complete, indexable, equivalent locale versions of a page are published.

### 5.3 Default-locale routing

Persian canonical URLs are unprefixed:

```text
/               # Persian homepage
/about          # Persian About page
/procurement    # Persian Procurement page
```

`/fa` and `/fa/**` MUST NOT render duplicate content. If reachable, they MUST return a one-hop permanent redirect to the equivalent unprefixed path:

```text
/fa                         → /
/fa/about                   → /about
/fa/procurement-process     → /procurement-process
```

### 5.4 Reserved-locale behavior

Until formally activated:

- `/en`, `/en/**`, `/ar`, and `/ar/**` MUST return genuine `404` responses;
- they MUST NOT redirect to Persian;
- they MUST NOT render Persian content inside a prefixed route;
- they MUST NOT appear in navigation, a language switcher, canonical tags, hreflang, XML sitemap, internal links, Open Graph alternate locales, or JSON-LD;
- they MUST NOT be created as placeholder or machine-translated pages.

---

## 6. Canonical Tag Rules

### 6.1 Indexable HTML pages

Every indexable `200` HTML page MUST:

- emit exactly one canonical link;
- self-canonicalize to its normalized absolute production URL;
- return `200` at the canonical destination;
- be allowed for indexing;
- use the same URL in Open Graph `url`, structured-data `url`/`@id`, sitemap, breadcrumbs, and internal links where applicable.

Example:

```html
<link rel="canonical" href="https://www.ahanassa.com/about" />
```

### 6.2 Non-indexable but public utility pages

The canonical policy depends on page identity:

| Route/state | Robots | Canonical policy |
|---|---|---|
| `/request` | `noindex, follow` | Self-canonical to `/request` |
| `/request/confirmation` | `noindex, nofollow` | Omit canonical unless a documented indexing reason is approved |
| Search results, internal tools, preview pages | `noindex` | Omit canonical; do not canonicalize to an unrelated page |
| Draft or preview content | `noindex` | Omit production canonical unless the preview system is explicitly designed to show the future canonical for review only and cannot be indexed |

A canonical tag MUST NOT be used to disguise a thin, private, unavailable, or unrelated page.

### 6.3 Redirects

A redirecting URL does not need an HTML canonical because it must not render an indexable HTML document.

Required behavior:

- aliases and replaced URLs return `301` or `308` to the canonical destination;
- destination URLs self-canonicalize;
- redirects go directly to the final normalized URL;
- redirect chains and loops are prohibited;
- `/fa/**`, apex-host, HTTP, uppercase, and approved trailing-slash variants resolve in one hop where edge configuration allows.

### 6.4 Error responses

`404`, `410`, `401`, `403`, and `5xx` responses MUST NOT:

- emit a canonical to the homepage;
- emit hreflang;
- appear in the XML sitemap;
- return `200` with a visually styled error message.

The custom `not-found` UI must preserve the correct `404` status.

### 6.5 Cross-domain canonical

Cross-domain canonical tags are prohibited unless a separately approved syndication or migration decision identifies:

- the external owner;
- exact source and destination URLs;
- content rights;
- reciprocal migration/redirect behavior;
- monitoring and rollback.

No partner, supplier, marketplace, CDN, preview, document host, or social URL may become the canonical for an Ahan Asa HTML page by default.

---

## 7. Query Parameters and Duplicate URL Handling

### 7.1 Tracking parameters

Tracking parameters never form part of the canonical URL.

Examples include:

```text
utm_source
utm_medium
utm_campaign
utm_term
utm_content
gclid
fbclid
msclkid
ref
```

Example request and canonical:

```text
Requested: https://www.ahanassa.com/procurement?utm_source=linkedin
Canonical: https://www.ahanassa.com/procurement
```

The page MAY remain accessible with approved tracking parameters for attribution, but metadata and internal links MUST omit them. Redirect behavior must follow the privacy-safe query whitelist in `REDIRECTS.md`.

### 7.2 Filters, sorting, and search

Phase 1 does not authorize indexable parameter-driven landing pages.

| Parameter class | Default indexation | Canonical |
|---|---|---|
| UI filter/sort/view state | `noindex, follow` when separately rendered | Clean parent route if content is substantially the same |
| Internal search query | `noindex, follow` | Omit canonical unless the implementation explicitly defines a clean search route policy |
| Pagination | Indexable only after a dedicated decision | Each page self-canonicalizes; never canonicalize all pages to page 1 |
| Form state or step | `noindex` | Stable parent form route where the response is not a distinct document |
| Sensitive token or customer reference | `noindex, nofollow` | Omit canonical; never expose sensitive values in the URL |

If a filter combination later becomes a genuine SEO landing page, it MUST receive a clean static route and its own approved content, metadata, internal links, sitemap entry, and self-canonical.

### 7.3 URL fragments

Fragments such as `#faq` identify a position inside a document and MUST be removed from canonical and hreflang URLs.

---

## 8. Hreflang Activation Gate

A new locale may participate in hreflang only when all of these conditions are true:

- the locale is approved in `DECISIONS.md`;
- routing is deployed and stable;
- the page returns canonical `200` HTML;
- the page is indexable;
- the translation is complete and human-reviewed;
- title, description, Open Graph, structured data, headings, navigation, legal content, forms, and contact scope are localized;
- the page represents the same primary purpose as its counterparts;
- localized links and media are valid;
- the canonical points to the current-language URL, not another language;
- reciprocal hreflang output is complete;
- the page is present in the correct locale sitemap if XML alternates are later enabled;
- locale-specific QA passes.

Failing any gate means that alternate is omitted from the cluster.

The site MUST NOT wait for every page in a locale to be translated before launching any locale pages, but each published cluster must be internally complete and valid. A missing translation is omitted; it is never substituted with Persian content.

---

## 9. Hreflang Cluster Rules

When at least two valid locale counterparts exist, each page in the cluster MUST list:

1. itself;
2. every other valid counterpart;
3. the same `x-default` destination.

Relationships MUST be reciprocal. If Persian references English, English must reference Persian in the same release.

### 9.1 Value policy

Use these hreflang values:

```text
fa
en
ar
x-default
```

Do not use `fa-IR`, `en-US`, `en-GB`, `ar-IQ`, or another region code until the site contains intentionally region-specific variants and that targeting decision is documented.

Language and region subtags use the standard form when later required: lowercase language plus uppercase region, such as `en-GB`.

### 9.2 Absolute URLs

Every hreflang `href` MUST:

- be an absolute HTTPS URL;
- use `www.ahanassa.com`;
- contain the correct locale path;
- contain no tracking parameter or fragment;
- resolve directly with `200`;
- self-canonicalize;
- be indexable.

### 9.3 Page equivalence

Pages belong in one cluster only when they have the same page identity and substantially the same purpose.

Valid examples:

- Persian About ↔ English About ↔ Arabic About;
- Persian procurement process ↔ localized versions of the same process;
- one Persian insight article ↔ actual translations of that article.

Invalid examples:

- Persian homepage ↔ English contact page;
- a product-category page ↔ a generic category hub;
- a published project page ↔ a locale homepage because the translation is missing;
- a short summary ↔ a materially different market-specific sales page;
- a `noindex` request confirmation ↔ an indexable request page.

### 9.4 Missing localized counterpart

If one page is not translated, omit only that locale from that cluster.

Example: if `/about` and `/en/about` exist but Arabic does not, both pages output `fa`, `en`, and `x-default`; neither outputs `ar`.

The language switcher must also omit or disable the missing Arabic counterpart according to `LOCALIZATION.md`; it must not send the user to the Arabic homepage as an automatic substitute.

---

## 10. `x-default` Policy

### 10.1 Phase 1

Do not output `x-default` while Persian is the only active locale.

### 10.2 Multilingual phase

Once a page has a valid multilingual cluster, `x-default` MUST point to the unprefixed Persian version because Persian is the default-language experience and the root routing does not perform automatic geo/language redirection.

Example:

```html
<link rel="alternate" hreflang="x-default" href="https://www.ahanassa.com/about" />
```

If a locale-neutral language-selector page is created later, the owner may change `x-default` to that page only when:

- the selector is useful, indexable, and not a forced interstitial;
- all clusters and delivery methods are updated together;
- the decision is recorded in `DECISIONS.md`;
- the unprefixed Persian routing strategy is reconsidered explicitly.

`x-default` is not a substitute for `fa`; a multilingual cluster containing Persian must output both `fa` and `x-default`, even when both point to the same URL.

---

## 11. Example Output

### 11.1 Phase 1 Persian About page

URL:

```text
https://www.ahanassa.com/about
```

Required head output:

```html
<link rel="canonical" href="https://www.ahanassa.com/about" />
```

No hreflang links are emitted.

### 11.2 Future Persian, English, and Arabic About cluster

Persian `/about`, English `/en/about`, and Arabic `/ar/about` each output the same cluster:

```html
<link rel="canonical" href="CURRENT_PAGE_ABSOLUTE_URL" />
<link rel="alternate" hreflang="fa" href="https://www.ahanassa.com/about" />
<link rel="alternate" hreflang="en" href="https://www.ahanassa.com/en/about" />
<link rel="alternate" hreflang="ar" href="https://www.ahanassa.com/ar/about" />
<link rel="alternate" hreflang="x-default" href="https://www.ahanassa.com/about" />
```

Only the canonical line changes between the three pages.

### 11.3 Partial future cluster

If only Persian and English versions exist:

```html
<link rel="alternate" hreflang="fa" href="https://www.ahanassa.com/procurement" />
<link rel="alternate" hreflang="en" href="https://www.ahanassa.com/en/procurement" />
<link rel="alternate" hreflang="x-default" href="https://www.ahanassa.com/procurement" />
```

Arabic is omitted everywhere in the cluster.

---

## 12. Stable Page-Identity Model

Localized relationships MUST be stored by stable page identity, not inferred by comparing slugs.

Recommended record:

```ts
type Locale = 'fa' | 'en' | 'ar'

type LocalizedRoute = {
  locale: Locale
  path: string
  status: 'draft' | 'review' | 'published' | 'archived'
  indexable: boolean
  translationComplete: boolean
}

type PageRouteRecord = {
  pageId: string
  type:
    | 'page'
    | 'steelProductCategory'
    | 'industry'
    | 'project'
    | 'insight'
    | 'resource'
  routes: Partial<Record<Locale, LocalizedRoute>>
}
```

Example:

```ts
const aboutRoute: PageRouteRecord = {
  pageId: 'page.about',
  type: 'page',
  routes: {
    fa: {
      locale: 'fa',
      path: '/about',
      status: 'published',
      indexable: true,
      translationComplete: true,
    },
    en: {
      locale: 'en',
      path: '/en/about',
      status: 'draft',
      indexable: false,
      translationComplete: false,
    },
  },
}
```

In this state, the Persian page emits only its canonical. The English draft emits neither a production alternate nor a sitemap entry.

### 12.1 Eligible alternate predicate

A route is hreflang-eligible only when all conditions are true:

```ts
const isAlternateEligible = (route: LocalizedRoute) =>
  route.status === 'published' &&
  route.indexable === true &&
  route.translationComplete === true
```

Production validation must also confirm `200`, self-canonical, origin, normalization, and reciprocity.

---

## 13. Localized Slugs

Localized slugs MAY differ when that produces clearer language-specific URLs. Never construct an alternate by replacing only the locale prefix or translating a slug at request time.

Example mapping:

| Page ID | Persian | English | Arabic |
|---|---|---|---|
| `page.home` | `/` | `/en` | `/ar` |
| `page.about` | `/about` | `/en/about` | `/ar/about` |
| `page.procurement` | `/procurement` | `/en/procurement` | `/ar/procurement` |
| `page.process` | `/procurement-process` | `/en/procurement-process` | `/ar/procurement-process` |
| `page.request` | `/request` | `/en/request` | `/ar/request` |

This table is an architecture example, not authorization to launch `en` or `ar`.

When a localized slug changes:

- add a one-hop permanent redirect from the old localized path;
- update the page-identity record;
- update canonical and every hreflang cluster member;
- update sitemap and internal links;
- do not reuse the old slug for unrelated content.

---

## 14. Next.js App Router Implementation

### 14.1 Single origin source

Validate one production origin at startup/build time:

```ts
// lib/seo/site-url.ts
const productionOrigin = 'https://www.ahanassa.com'

export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL

  if (!raw) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required')
  }

  const url = new URL(raw)

  if (process.env.NODE_ENV === 'production' && url.origin !== productionOrigin) {
    throw new Error(`Invalid production site origin: ${url.origin}`)
  }

  return url
}
```

Do not derive the canonical origin from the request `Host` header. A manipulated, preview, or alternate host must never enter metadata.

### 14.2 Root metadata base

```ts
// app/layout.tsx
import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/seo/site-url'

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
}
```

### 14.3 Metadata builder

Use one typed helper for canonical and language alternates:

```ts
// lib/seo/build-alternates.ts
import type { Metadata } from 'next'

type Locale = 'fa' | 'en' | 'ar'

type AlternateInput = {
  currentPath: string
  currentLocale: Locale
  cluster: Partial<Record<Locale, string>>
}

const localeOrder: Locale[] = ['fa', 'en', 'ar']

export function buildAlternates({
  currentPath,
  cluster,
}: AlternateInput): NonNullable<Metadata['alternates']> {
  const published = localeOrder.flatMap((locale) => {
    const path = cluster[locale]
    return path ? [[locale, path] as const] : []
  })

  // Phase 1 or a page with no valid localized counterpart:
  if (published.length < 2) {
    return { canonical: currentPath }
  }

  const faPath = cluster.fa

  if (!faPath) {
    throw new Error('A multilingual Ahan Asa cluster requires a Persian default')
  }

  return {
    canonical: currentPath,
    languages: {
      ...Object.fromEntries(published),
      'x-default': faPath,
    },
  }
}
```

The helper must receive only alternates already validated as published, indexable, complete, and equivalent. It must not query drafts or guess route relationships.

### 14.4 Static page example

```ts
// app/about/page.tsx
import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'

export const metadata: Metadata = {
  alternates: buildAlternates({
    currentLocale: 'fa',
    currentPath: '/about',
    cluster: { fa: '/about' },
  }),
}
```

### 14.5 Dynamic page example

`generateMetadata` must load the published record by stable ID/slug, validate it, and return `notFound()` for unavailable records. It must not canonicalize an unknown slug to the route hub.

```ts
export async function generateMetadata(
  props: PageProps<'/insights/[slug]'>,
): Promise<Metadata> {
  const { slug } = await props.params
  const article = await getPublishedInsightBySlug('fa', slug)

  if (!article) notFound()

  return {
    title: article.seoTitle,
    description: article.metaDescription,
    alternates: buildAlternates({
      currentLocale: 'fa',
      currentPath: article.path,
      cluster: article.publishedLocalePaths,
    }),
  }
}
```

### 14.6 Metadata merging warning

Next.js metadata objects are merged by route segment, and nested fields may be replaced. Page metadata must not accidentally remove `alternates`, `openGraph`, or robots values inherited from another segment. Prefer shared builders that return the complete relevant nested object.

### 14.7 Server-rendered output

Canonical and hreflang links MUST be present in the initial server-rendered document metadata. Do not inject them after hydration with a Client Component, effect, tag manager, or browser-only library.

---

## 15. Delivery Method

### 15.1 Primary method

HTML `<head>` metadata generated by the Next.js Metadata API is the primary hreflang delivery method.

Reasons:

- it is colocated with page metadata;
- it is easy to inspect per route;
- it supports route-specific partial translation clusters;
- it reduces divergence from page canonical state.

### 15.2 XML sitemap alternates

Phase 1 XML sitemaps contain canonical Persian URLs only and no alternate-language extensions.

XML hreflang MAY be added after multilingual activation, but only when generated from the same page-identity records as HTML metadata. It must never be a separately maintained manual map.

If both HTML and XML methods are used, they MUST produce identical clusters. A mismatch blocks release.

### 15.3 HTTP headers

Use an HTTP `Link` header for non-HTML resources only when such a resource has approved localized equivalents and must be indexed independently. This is not required for Phase 1.

Do not output three independently maintained implementations for HTML, XML, and HTTP headers.

---

## 16. Sitemap Consistency

Every URL in `sitemap.xml` MUST:

- be absolute;
- use `https://www.ahanassa.com`;
- be normalized;
- return `200`;
- be indexable;
- self-canonicalize;
- represent published content;
- exclude `/fa/**`, redirected aliases, preview URLs, query variants, error URLs, form confirmations, and reserved locales.

Phase 1 sitemap examples:

```text
https://www.ahanassa.com/
https://www.ahanassa.com/about
https://www.ahanassa.com/procurement
```

When locale alternates are activated, sitemap generation must use the same `pageId → locale → path` source as metadata generation.

---

## 17. Redirect Consistency

The edge/application redirect system MUST enforce:

| Input | Final destination | Status |
|---|---|---:|
| `http://ahanassa.com/about` | `https://www.ahanassa.com/about` | `308` |
| `http://www.ahanassa.com/about` | `https://www.ahanassa.com/about` | `308` |
| `https://ahanassa.com/about` | `https://www.ahanassa.com/about` | `308` |
| `https://www.ahanassa.com/fa/about` | `https://www.ahanassa.com/about` | `308` |
| Approved trailing slash `/about/` | `https://www.ahanassa.com/about` | `308` or platform-normalized equivalent |

Normal protocol, host, locale-prefix, and slash corrections should collapse into one external hop. Cloudflare and application redirect rules must be tested together to prevent double redirects and loops.

Unsupported `/en/**` or `/ar/**` paths are not aliases. They return `404` until those locales are active.

---

## 18. Internal Links, Open Graph, and Structured Data

### 18.1 Internal links

Internal navigation MUST link directly to canonical paths. Do not rely on redirects for routine navigation.

- Persian links use unprefixed paths.
- Future localized navigation uses the locale's stored path.
- tracking parameters are added only by an approved campaign/analytics boundary, not hardcoded into ordinary internal links.
- alternate locale links come from the same page-identity cluster as hreflang.

### 18.2 Open Graph

For each page:

- `og:url` equals the page canonical;
- Persian uses `og:locale = fa_IR`;
- future English uses the approved underscore form, normally `en_US` only if that regional convention is explicitly chosen, otherwise the metadata policy must define the appropriate value;
- `og:locale:alternate` includes only active localized counterparts;
- preview or non-canonical hosts never appear.

### 18.3 Structured data

JSON-LD URLs and identifiers MUST use the canonical production origin. A locale page's schema graph must point to its own canonical localized page, with language properties matching visible content.

Do not use hreflang to repair incorrect JSON-LD URLs or use JSON-LD to replace canonical/hreflang links.

---

## 19. Language Switcher Contract

The switcher is a user-navigation feature; hreflang is a search annotation. Both must use the same locale cluster data.

When only Persian is active:

- do not show an inactive language control that leads to `404`, Persian duplicates, or placeholder pages.

When additional locales are active:

- selecting a language navigates to the exact page counterpart when it exists;
- do not infer counterparts from path strings;
- do not redirect users automatically based only on IP or browser language;
- do not force a locale with a cookie before the user can access the requested canonical URL;
- if a counterpart is unavailable, follow the explicit missing-translation UX in `LOCALIZATION.md` and never misrepresent the locale homepage as the page's hreflang alternate.

Crawler requests must receive the same canonical content and metadata as users; cloaking is prohibited.

---

## 20. Special Content Cases

### 20.1 Projects and confidential cases

Only approved public project pages receive canonicals or hreflang. Private case data, client portals, secure documents, and unapproved project names must never appear in canonical URLs or alternate mappings.

### 20.2 Resources and PDFs

The resource landing page is normally the indexable canonical HTML document. Download files should be handled according to `SITEMAP_ROBOTS_SPEC.md` and the approved resource policy.

Do not automatically canonicalize every PDF to its landing page. If a PDF is independently indexable and materially equivalent to an HTML page, choose either:

- an HTTP `Link: <...>; rel="canonical"` policy; or
- a deliberate independently indexed PDF policy.

The decision must be explicit per resource type.

### 20.3 Archived or merged content

When content is merged:

- redirect the retired URL to the closest genuine replacement only when intent is substantially equivalent;
- remove the retired URL from canonical clusters and sitemap;
- update all locale counterparts in the same release;
- use `410` or `404` when no honest replacement exists;
- never canonicalize many unrelated retired pages to the homepage.

### 20.4 Syndicated articles

If Ahan Asa republishes or syndicates content, canonical ownership must be agreed before publication. No external canonical is inferred from author, source, or partner attribution alone.

---

## 21. Environment Policy

| Environment | Indexation | Canonical behavior |
|---|---|---|
| Production | Per route policy | `https://www.ahanassa.com/**` |
| Preview/staging deployment | `noindex, nofollow` | Must not self-canonicalize the preview host; production canonical may be shown only for explicit review and must never make preview indexable |
| Local development | Not public | Local URLs allowed for developer inspection only |
| Staging, if later approved | Authentication and/or `noindex` | Never enters sitemap or hreflang clusters |

Production builds MUST fail if `NEXT_PUBLIC_SITE_URL` does not exactly equal the approved production origin.

Preview hosts MUST NOT be added as domain properties, sitemap hosts, Open Graph URLs, schema identifiers, or hreflang alternates.

---

## 22. Validation Rules

### 22.1 Build-time validation

The content/route validation command MUST fail when:

- a published page has no canonical path;
- two page identities claim the same locale path;
- a canonical is relative after final metadata resolution;
- a canonical contains the wrong scheme, host, port, query, fragment, locale prefix, case, or trailing slash;
- a locale alternate is draft, incomplete, non-indexable, redirected, or missing;
- a multilingual cluster lacks self-reference;
- reciprocity differs across cluster members;
- `x-default` does not resolve to the Persian route;
- reserved locales enter production output;
- a sitemap URL differs from the page's canonical;
- a canonicalized page returns an error or redirect in the built route manifest;
- an unknown dynamic slug silently canonicalizes to a hub or homepage.

### 22.2 Production crawl validation

For every public route, verify:

- final HTTP status;
- redirect hop count;
- canonical count and resolved URL;
- robots meta and `X-Robots-Tag`;
- hreflang count and values;
- alternate response status;
- alternate self-canonical;
- reciprocity;
- sitemap membership;
- internal-link target;
- Open Graph URL;
- structured-data URL/IDs;
- HTML `lang` and `dir`.

### 22.3 Search Console monitoring

After launch or migration, monitor:

- duplicate without user-selected canonical;
- alternate page with proper canonical;
- Google chose different canonical;
- redirected URLs still submitted in sitemap;
- soft `404`;
- crawled/discovered but not indexed;
- hreflang return-tag or invalid-language errors when multilingual output begins.

Search-engine selection may differ temporarily during recrawling. Fix technical inconsistency first; do not add contradictory signals or repeated redirects to force selection.

---

## 23. Required Automated Tests

### 23.1 Unit tests

Test URL helpers for:

- root and nested paths;
- host and HTTPS enforcement;
- removal of query and fragment;
- no trailing slash;
- unprefixed Persian;
- prefixed future locales;
- locale-order determinism;
- `x-default` behavior;
- rejection of missing Persian default in multilingual clusters;
- exclusion of draft/incomplete/noindex routes.

### 23.2 Metadata integration tests

At minimum, test:

| Case | Canonical | Hreflang |
|---|---|---|
| Phase 1 homepage | Self | None |
| Phase 1 static page | Self | None |
| Phase 1 dynamic article | Self | None |
| `/request` | Self | None |
| Confirmation page | Omitted | None |
| Unknown dynamic slug | None; `404` | None |
| Reserved `/en/about` | None; `404` | None |
| Future `fa + en` cluster | Current page self | `fa`, `en`, `x-default` |
| Future `fa + en + ar` cluster | Current page self | `fa`, `en`, `ar`, `x-default` |
| Missing Arabic counterpart | Current page self | No `ar` |

### 23.3 End-to-end redirect tests

Run against the production-like edge topology:

- apex HTTP → canonical HTTPS `www` in one hop;
- apex HTTPS → canonical HTTPS `www` in one hop;
- `/fa/**` → unprefixed Persian in one hop;
- final destination returns `200` and self-canonical;
- reserved locale returns `404` without redirect;
- no Cloudflare/application redirect loop;
- safe query behavior matches `REDIRECTS.md`.

---

## 24. Release Procedure for a New Locale

1. Record locale approval, ownership, scope, and launch date in `DECISIONS.md`.
2. Complete route and content inventory in `LOCALE_CONTENT_STRUCTURE.md`.
3. Complete human translation, editorial review, market review, and legal review.
4. Publish locale-aware routes without exposing drafts.
5. Validate localized slugs, metadata, schema, forms, navigation, and direction.
6. Build page-identity clusters from published records.
7. Enable HTML hreflang only for valid clusters.
8. Enable `x-default` to the unprefixed Persian counterpart.
9. Update XML sitemap locale entries from the same data source.
10. Enable the language switcher only for real counterparts.
11. Run full canonical, redirect, reciprocity, accessibility, and crawl tests.
12. Deploy atomically and monitor logs and Search Console.

Never launch a locale by enabling route middleware before its complete content and metadata are ready.

---

## 25. Migration or Domain Change Procedure

If the canonical domain or host changes:

1. approve and record the migration;
2. inventory every existing canonical URL;
3. prepare a one-to-one redirect map;
4. change the validated canonical origin once;
5. regenerate canonical, hreflang, sitemap, Open Graph, JSON-LD, and internal absolute links;
6. update Cloudflare, Search Console, analytics, email templates, and external profiles;
7. verify one-hop redirects for every protocol/host variant;
8. keep redirects for the required migration period;
9. monitor canonical selection and crawl errors;
10. do not combine the migration with unnecessary slug or information-architecture changes.

---

## 26. Prohibited Patterns

Claude Code and contributors MUST NOT:

- use the request host to build canonicals;
- hardcode mixed apex and `www` URLs;
- output `/fa` as a canonical Persian prefix;
- render reserved locales with Persian fallback content;
- emit hreflang for one active language in Phase 1;
- emit `x-default` before multilingual activation;
- point all canonicals to the homepage or a hub;
- canonicalize paginated pages to page 1;
- include tracking parameters or fragments in canonical/hreflang URLs;
- reference redirected, `404`, `noindex`, draft, or private URLs as alternates;
- infer translations from matching slugs;
- maintain independent manual hreflang maps in components and sitemaps;
- inject canonical/hreflang client-side;
- use canonical tags instead of required redirects;
- use hreflang instead of correct language routing;
- auto-redirect crawlers or users by IP in a way that prevents access to a requested locale;
- silently resolve content or locale conflicts in code;
- publish automatic machine translations as production alternates.

---

## 27. Claude Code Execution Rules

Before implementing or changing canonical/hreflang behavior, Claude Code MUST:

1. read `DECISIONS.md`, this document, `ROUTES.md`, `REDIRECTS.md`, `METADATA_SPEC.md`, `SITEMAP_ROBOTS_SPEC.md`, `STRUCTURED_DATA.md`, `LOCALIZATION.md`, and `LOCALE_CONTENT_STRUCTURE.md` when present;
2. inspect the actual Next.js version and current route tree;
3. locate all existing canonical, metadata, sitemap, JSON-LD, and redirect generators;
4. confirm the current published locale registry;
5. use one validated production-origin helper;
6. use one page-identity source for metadata, switcher, and sitemap relationships;
7. preserve unrelated routes and user changes;
8. add or update unit, integration, and end-to-end tests;
9. run build, typecheck, lint, content validation, route validation, and Playwright checks;
10. report document conflicts and blocked locale records instead of fabricating values.

No implementation is complete until rendered production-like HTML and edge redirects have been verified.

---

## 28. Acceptance Checklist

### Canonical origin

- [ ] Production origin is exactly `https://www.ahanassa.com`.
- [ ] HTTP and apex hosts redirect permanently to canonical HTTPS `www`.
- [ ] Normal host/protocol normalization takes one hop.
- [ ] Preview and staging hosts are not indexable or canonical.
- [ ] All absolute SEO signals use the same origin.

### Persian launch

- [ ] Persian canonical routes are unprefixed.
- [ ] `/fa` aliases redirect to unprefixed equivalents.
- [ ] `/en/**` and `/ar/**` return genuine `404` until activation.
- [ ] Each eligible Persian page emits exactly one self-canonical.
- [ ] Phase 1 emits no hreflang and no `x-default`.
- [ ] HTML uses `lang="fa"` and `dir="rtl"`.

### Multilingual readiness

- [ ] Stable page IDs relate translations.
- [ ] Draft and incomplete translations cannot enter alternate clusters.
- [ ] Every multilingual cluster is self-referential and reciprocal.
- [ ] Every alternate is absolute, canonical, indexable, and `200`.
- [ ] `x-default` points to the unprefixed Persian counterpart.
- [ ] Missing translations are omitted, not redirected or replaced.
- [ ] Language-switcher data and hreflang data cannot diverge.

### Consistency and QA

- [ ] Canonical, sitemap, redirects, Open Graph, JSON-LD, and internal links agree.
- [ ] No query parameter or fragment enters canonical/hreflang output.
- [ ] `404`, `410`, redirect, preview, confirmation, and private pages do not emit alternates.
- [ ] Dynamic missing records return `404` rather than canonicalizing to a hub.
- [ ] Automated unit, metadata, crawl, and redirect tests pass.
- [ ] `ROUTES.md`, `REDIRECTS.md`, and `SITEMAP_ROBOTS_SPEC.md` are synchronized with the locked `www` host.

---

## 29. Decision Register

| ID | Decision | Status | Effective date |
|---|---|---|---|
| `HC-001` | Canonical production origin is `https://www.ahanassa.com` | Adopted | 2026-08-25 |
| `HC-002` | Persian is unprefixed and is the only Phase 1 locale | Adopted | 2026-08-25 |
| `HC-003` | Phase 1 emits canonical links but no hreflang or `x-default` | Adopted | 2026-08-25 |
| `HC-004` | English `/en/**` and Arabic `/ar/**` remain reserved and return `404` | Adopted | 2026-08-25 |
| `HC-005` | HTML metadata is the primary future hreflang delivery method | Adopted | 2026-08-25 |
| `HC-006` | Future `x-default` points to the unprefixed Persian counterpart | Adopted | 2026-08-25 |
| `HC-007` | Hreflang relationships are generated from stable page identity, never slug inference | Adopted | 2026-08-25 |
| `HC-008` | XML alternates, if enabled, use the same cluster data as HTML | Adopted | 2026-08-25 |

---

## 30. References

- Google Search Central — Localized versions and hreflang: `https://developers.google.com/search/docs/specialty/international/localized-versions`
- Google Search Central — Canonical URL consolidation: `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Google Search Central — Multilingual and multi-regional sites: `https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites`
- Next.js — `generateMetadata` and Metadata fields: `https://nextjs.org/docs/app/api-reference/functions/generate-metadata`
- Next.js — Metadata files and conventions: `https://nextjs.org/docs/app/api-reference/file-conventions/metadata`

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | TBD | Pending confirmation | — |
| SEO Owner | TBD | Pending confirmation | — |
| Technical Owner | TBD | Pending confirmation | — |
| Localization Owner | TBD | Pending before second locale | — |
