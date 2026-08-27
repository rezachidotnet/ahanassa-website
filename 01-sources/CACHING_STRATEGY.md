# Caching Strategy — Ahan Asa

> Cache, CDN, revalidation, invalidation, and verification rules for the Ahan Asa website.

| Field | Value |
| --- | --- |
| Project | Ahan Asa (`ahanassa.com`) |
| Application | Next.js App Router |
| Hosting/runtime | Cloudflare Workers + Static Assets via vinext |
| DNS / edge security | Cloudflare |
| Document owner | Engineering |
| Status | Implementation specification |
| Last updated | 2026-08-27 — AUD-034 documentation drift cleanup |

## 1. Purpose

This document defines how the website caches pages, data, media, fonts, API responses, and user-specific requests. Its objectives are to:

- deliver fast pages from locations close to users;
- improve Core Web Vitals without serving materially stale content;
- reduce origin and CMS traffic;
- make content updates predictable;
- prevent RFQ, preview, authentication, or personalized data from entering a shared cache;
- avoid conflicts between Cloudflare edge cache, framework cache/revalidation, and application data freshness.

This file is normative. Claude Code must follow it when adding a route, data source, CMS integration, API endpoint, asset type, redirect, or deployment rule.

## 2. Architecture Decision

```text
Visitor
  -> Cloudflare: DNS, TLS, WAF, bot protection, Workers runtime, static assets, edge cache
  -> Next.js via vinext: route, data, request memoization, and client router caches
  -> D1 / R2 / Queues / server-only Odoo adapter
```

### Primary rule

Cloudflare Workers/vinext and Next.js own HTML, React Server Component, revalidation, and application-data caching. Cloudflare cache rules must not apply a broad **Cache Everything** rule to HTML.

Cloudflare may cache only explicitly approved, public, non-personalized asset classes and responses. This prevents edge cache from continuing to serve old HTML after framework revalidation has occurred.

### Why this rule exists

With framework revalidation and edge cache both present, every cacheable response can have multiple freshness controls and purge mechanisms. If Cloudflare caches HTML longer than the application intends, a successful Next.js revalidation can remain invisible to users. Limiting HTML caching to explicitly tested rules keeps content invalidation deterministic.

## 3. Non-negotiable Rules

1. Never cache `POST`, `PUT`, `PATCH`, or `DELETE` responses.
2. Never publicly cache RFQ, contact, authentication, admin, preview, draft, payment, or webhook routes.
3. Never cache a response containing personal, session, pricing-contract, or organization-specific data.
4. Never use `public` or `s-maxage` on a response that depends on `Cookie`, `Authorization`, user identity, or preview state.
5. Never apply Cloudflare **Cache Everything** to all routes.
6. Never set an immutable TTL on a URL whose bytes can change without the URL changing.
7. Never purge the entire Cloudflare zone for a normal CMS update.
8. Cache keys must not vary by marketing parameters such as `utm_source` unless the response truly changes.
9. A content mutation is not complete until the relevant Next.js cache tag or path is revalidated.
10. Claude Code must inspect `package.json` and `next.config.*` before choosing a Next.js caching API. It must not mix incompatible caching models.

## 4. Cache Layers and Ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| Browser | Fingerprinted JS/CSS, versioned fonts and media | HTML that must update instantly; private responses |
| Cloudflare | Approved static assets, WAF, compression, transport optimizations | HTML/RSC, RFQ/API mutations, preview, personalized content |
| Cloudflare Workers/vinext | Static pages, route output, explicitly cacheable route responses | Secrets or user-specific data in shared caches |
| Next.js server/runtime | Cached data, route output, request memoization | Secrets or user-specific data in shared caches |
| Client router | Navigation payloads during a session | Long-term source of truth after content mutation |

## 5. Cache Policy Matrix

TTL values are defaults. A route may use a shorter value when business freshness requires it, but any longer value requires an Architecture Decision Record.

| Resource class | Example | Browser policy | Next.js / vinext policy | Cloudflare policy | Invalidation |
| --- | --- | --- | --- | --- | --- |
| Fingerprinted build assets | `/_next/static/*` | 1 year, `immutable` | 1 year, `immutable` | Eligible; respect origin | New deployment creates new URLs |
| Versioned fonts | `/fonts/iranyekan.v3.woff2` | 1 year, `immutable` | 1 year, `immutable` | Eligible; respect origin | Change filename/version |
| Versioned brand/media assets | `/assets/logo.v2.svg` | 1 year, `immutable` | 1 year, `immutable` | Eligible; respect origin | Change filename/version |
| Next.js optimized images | `/_next/image?...` | Follow framework response | Use Next.js image cache; minimum target 30 days | Eligible only after verifying correct `Accept` variation | Change source URL/version or purge exact asset |
| Public uploaded images | `/media/products/...` | 1 day | 30 days at CDN | Eligible; respect explicit origin header | Change URL/version; exact purge only if unavoidable |
| Marketing HTML | `/`, `/about`, `/services/*` | Revalidate on navigation | Static/ISR; default 24 hours | Bypass HTML cache | Next.js tag/path revalidation |
| Frequently edited content | `/insights/*`, `/resources/*` | Revalidate on navigation | ISR; default 1 hour | Bypass HTML cache | CMS webhook + tag/path revalidation |
| Project/case-study pages | `/projects/*` | Revalidate on navigation | ISR; default 6 hours | Bypass HTML cache | `project:{slug}` and `projects` tags |
| Product/service data | shared page data | Not directly applicable | Cache 6 hours | Not independently cached | `service:{slug}` / `services` tags |
| Navigation/footer/settings | sitewide content | Revalidate on navigation | Cache 24 hours | Not independently cached | `site-settings` tag plus affected paths |
| `sitemap.xml` | `/sitemap.xml` | 1 hour | Revalidate every 1 hour | Bypass unless explicitly tested | `seo` tag or deployment |
| `robots.txt` | `/robots.txt` | 1 hour | Static or 24 hours | Eligible; respect origin | Deployment |
| Public read-only API | `/api/public/*` | 0–60 seconds | 60 seconds by default | Bypass unless explicitly approved | API-specific tag |
| Search/autocomplete | `/api/search` | `no-store` initially | `no-store` initially | Bypass | None |
| RFQ/contact submission | `/api/rfq`, `/api/contact` | `no-store` | `no-store` | Bypass | None |
| Preview/draft/admin/auth | `/api/preview/*`, `/admin/*` | `private, no-store` | No shared cache | Bypass | None |
| Redirect responses | canonical/domain redirects | Short browser TTL during rollout | Platform configuration | Respect origin | Deployment/config update |
| 404 response | missing route/asset | No long browser cache | Maximum 60 seconds if cached | Maximum 60 seconds | Deployment/content creation |
| 5xx response | server failure | `no-store` | Do not cache | Do not cache | None |

## 6. Recommended Response Headers

### 6.1 Immutable fingerprinted assets

```http
Cache-Control: public, max-age=31536000, immutable
```

Use this only when the filename or query contains a content hash or explicit version and any byte change creates a new URL.

### 6.2 Public HTML controlled by Next.js/vinext

Do not manually overwrite framework-generated page cache headers unless a verified requirement exists. Control page freshness with Next.js static generation, revalidation, and tags.

If a custom route must define the layers independently, use provider-specific headers deliberately:

```http
Cache-Control: public, max-age=0, must-revalidate
CDN-Cache-Control: public, max-age=3600, stale-while-revalidate=86400
Cloudflare-CDN-Cache-Control: no-store
```

This is an advanced exception, not the default. Verify the final headers at the public domain because intermediary CDNs may consume or transform cache directives.

### 6.3 Sensitive or personalized responses

```http
Cache-Control: private, no-store, max-age=0
```

Also set appropriate authentication, CSRF, and content-type protections. `no-store` is a defense-in-depth control, not a substitute for authorization.

### 6.4 Public read-only API response

```http
Cache-Control: public, max-age=0, must-revalidate
CDN-Cache-Control: public, max-age=60, stale-while-revalidate=300
Cloudflare-CDN-Cache-Control: no-store
```

Only use this for anonymous data that is identical for all users.

## 7. Next.js Implementation Rules

### 7.1 Version gate

Before implementation, Claude Code must determine:

- installed Next.js version;
- whether Cache Components are enabled;
- whether a route is static, ISR, or dynamic;
- whether its data source supports event-driven invalidation;
- whether the response depends on cookies, headers, authentication, or draft mode.

Use one of the following models, never a mixture copied blindly from another project.

### 7.2 Standard App Router model

Use this pattern when the project uses the standard `fetch` cache/revalidation model:

```ts
const response = await fetch(`${CMS_URL}/api/projects`, {
  next: {
    revalidate: 21_600, // 6 hours
    tags: ['projects'],
  },
});
```

For content that must be fresh on every request:

```ts
const response = await fetch(`${API_URL}/account`, {
  cache: 'no-store',
});
```

Use `unstable_cache` only when required for non-`fetch` data access and only when supported by the installed Next.js version. Do not place cookies, headers, sessions, or user identifiers inside a shared cached function.

### 7.3 Cache Components model

If Cache Components are explicitly enabled and supported by the installed version, prefer the stable APIs documented for that exact version:

```ts
import { cacheLife, cacheTag } from 'next/cache';

export async function getProjects() {
  'use cache';
  cacheLife('hours');
  cacheTag('projects');

  return db.project.findMany({
    where: { published: true },
  });
}
```

Do not enable Cache Components only to implement this document. Treat that as a separate architecture change with build, behavior, and migration testing.

### 7.4 Dynamic route rules

A route that uses cookies, authorization, draft mode, request-specific headers, or uncached user data is dynamic. It must not be forced into static rendering to improve a synthetic score.

For every dynamic route, answer these questions in code review:

1. Is the output identical for all visitors?
2. Does it contain or imply user-specific data?
3. Can it safely be served after the underlying data changes?
4. Which event invalidates it?
5. What is the worst acceptable stale period?

If any answer is unknown, default to `no-store` until the behavior is defined.

## 8. Cache Tags and Invalidation Taxonomy

Use stable, lowercase tags. Tags are part of the application contract and must not be generated from untrusted input without validation.

| Content | Collection tag | Item tag | Paths normally affected |
| --- | --- | --- | --- |
| Site settings | `site-settings` | — | All layouts/pages |
| Header/navigation | `navigation` | — | All layouts/pages |
| Homepage | `homepage` | — | `/` |
| Services | `services` | `service:{slug}` | `/`, `/services`, `/services/{slug}` |
| Projects | `projects` | `project:{slug}` | `/`, `/projects`, `/projects/{slug}` |
| Insights | `insights` | `insight:{slug}` | `/insights`, `/insights/{slug}` |
| Resources | `resources` | `resource:{slug}` | `/resources`, `/resources/{slug}` |
| SEO outputs | `seo` | — | Sitemap and metadata-dependent pages |

### Rules

- Revalidate the item tag for an item edit.
- Revalidate both the item and collection tags when an edit changes a listing card, sort order, filter, or count.
- Revalidate `homepage` when the edited item appears on the homepage.
- Revalidate `navigation` or `site-settings` only for global changes.
- Use `revalidatePath` for route output that cannot be mapped cleanly to a data tag.
- Do not call `revalidatePath('/')` as a substitute for understanding dependencies.

## 9. CMS Webhook Contract

The CMS must call a server-side revalidation endpoint after publish, update, unpublish, or delete events.

```text
POST /api/revalidate
Content-Type: application/json
X-Revalidation-Signature: <HMAC signature>

{
  "type": "project",
  "slug": "project-slug",
  "event": "update"
}
```

The endpoint must:

1. verify an HMAC signature or equivalent secret;
2. reject stale/replayed requests when the CMS supports timestamps;
3. validate `type`, `slug`, and `event` against allowlists;
4. map the event to server-defined tags and paths;
5. never accept an arbitrary tag or arbitrary path from the caller;
6. rate-limit requests;
7. record timestamp, content type, content identifier, action, and result without logging secrets;
8. return `Cache-Control: private, no-store`;
9. fail closed on invalid input;
10. be idempotent.

Cloudflare must bypass `/api/revalidate` and all webhook routes.

## 10. Cloudflare Configuration

Rules are evaluated from most specific to least specific. Keep the configuration intentionally small.

### Rule 1 — Bypass sensitive and dynamic paths

Bypass cache for:

```text
/api/*
/admin/*
/account/*
/auth/*
/preview/*
```

Also bypass when the request contains authentication/session cookies used by the application. Do not create a broad cookie bypass rule until the actual cookie names are known.

### Rule 2 — Cache immutable Next.js assets

Match:

```text
/_next/static/*
```

Settings:

- cache eligibility: eligible;
- edge TTL: respect origin;
- browser TTL: respect origin;
- cache key: default;
- do not override `immutable` headers.

### Rule 3 — Cache approved public assets

Match only approved asset locations such as:

```text
/assets/*
/fonts/*
/media/*
```

Settings:

- cache eligibility: eligible;
- edge TTL: respect origin headers;
- browser TTL: respect origin headers;
- serve stale on eligible static assets when safe;
- never strip `Content-Type`, `Content-Length`, `ETag`, or CORS headers without a documented reason.

### Rule 4 — Bypass application documents

Bypass Cloudflare cache for document requests, including HTML and React Server Component responses. Do not identify these only by file extension; Next.js routes often have no extension. Use request/response characteristics verified in Cloudflare Trace.

### Cloudflare features

| Feature | Decision |
| --- | --- |
| Brotli / modern compression | Enable |
| HTTP/2 and HTTP/3 | Enable |
| Early Hints | Test before enabling globally |
| Tiered Cache | Optional for heavy public media traffic |
| Cache Reserve | Not required initially |
| Query String Sort | Do not enable globally; test image and signed URLs first |
| Development Mode | Temporary debugging only |
| Always Online | Do not rely on it for application correctness |

## 11. Asset Versioning

Long cache lifetimes require immutable URLs.

### Required patterns

- Next.js build assets: framework-generated hashed filenames.
- Fonts: version in filename, for example `peyda-v2-regular.woff2`.
- Logos: version or content hash when replaced, for example `ahan-asa-logo.v3.svg`.
- CMS media: CMS-generated immutable asset ID or a version query managed by the CMS.
- PDFs/catalogues: versioned filename and human-readable revision date.

### Forbidden pattern

Replacing `/assets/catalog.pdf` while it has a one-year immutable cache is forbidden. Publish `/assets/ahan-asa-catalog-2026-08.pdf` and update links instead.

## 12. Image Cache Rules

1. Prefer `next/image` for responsive raster images.
2. Use a stable, versioned source URL.
3. Configure `images.remotePatterns`; do not allow arbitrary remote hosts.
4. Set a minimum optimized-image cache TTL target of 30 days when source URLs are immutable.
5. Verify that format negotiation varies correctly by the `Accept` header before Cloudflare caches `/_next/image`.
6. Do not pass signed/private image URLs through a public shared image cache.
7. If an image must be replaced at the same origin URL, purge the exact URL and related optimized variants; the preferred fix is still a new URL.

Example configuration, subject to the installed Next.js version:

```ts
const nextConfig = {
  images: {
    minimumCacheTTL: 2_592_000, // 30 days
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.ahanassa.com',
        pathname: '/media/**',
      },
    ],
  },
};

export default nextConfig;
```

## 13. Font Cache Rules

- Prefer self-hosted fonts or `next/font`.
- Preload only fonts used above the fold.
- Use WOFF2.
- Version font filenames.
- Serve versioned fonts with `public, max-age=31536000, immutable`.
- Set correct `Content-Type: font/woff2`.
- Keep CORS consistent if fonts are served from a dedicated asset hostname.
- A font upgrade must create a new URL.

## 14. API and Form Rules

### Public `GET` APIs

Caching is opt-in. A public API may be cached only when:

- output is identical for all users;
- no cookie or authorization state is used;
- rate-limit state does not change the representation;
- errors are not cached;
- an invalidation event or acceptable TTL is defined.

### RFQ and contact routes

All RFQ and contact routes must:

- accept mutation methods only;
- return `Cache-Control: private, no-store`;
- avoid redirects that expose submitted fields in a query string;
- never log sensitive payloads in CDN logs;
- apply rate limiting and bot protection;
- not echo complete user input in the response.

### Error responses

- Do not cache `401`, `403`, `429`, or `5xx` responses.
- Cache a public `404` for no more than 60 seconds unless the route space is fully immutable.
- Ensure stale-if-error behavior cannot expose private content.

## 15. Locale and Cache-Key Rules

If Ahan Asa adds multiple locales:

- prefer locale-specific paths such as `/en/...` and `/ar/...`;
- do not serve different locales from the same cache key based only on a cookie;
- redirect locale negotiation once, then cache the destination path normally;
- keep Persian default routes and prefixed international routes canonical according to `HREFLANG_CANONICAL.md`;
- verify each locale invalidation separately when content records are not shared.

Do not vary HTML by device type or user agent. Use responsive CSS and responsive images instead.

## 16. Query Parameters and Cache Keys

### Marketing parameters

`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, and similar parameters must not create distinct application content.

Because Cloudflare does not cache HTML, marketing query normalization is not required at that layer. Analytics may read these parameters client-side or server-side without changing the rendered public page.

### Functional parameters

Search, filters, pagination, image width/quality, signed tokens, and preview parameters can change output. Do not remove them from cache keys unless the route contract proves that they are irrelevant.

Never ignore all query strings globally.

## 17. Deployment and Purge Strategy

### Normal code deployment

- Cloudflare Workers/vinext deployment creates new immutable build assets.
- Static/ISR output follows the deployed application version.
- Do not purge Cloudflare globally.
- If a versioned asset URL changes, no purge is required.

### CMS content update

- CMS sends the signed webhook.
- Application revalidates item and collection tags/paths.
- Cloudflare purge is not required because HTML is bypassed.
- Versioned media changes use a new URL.

### Emergency correction

Use this order:

1. fix and deploy or correct the CMS record;
2. revalidate the exact Next.js tag/path;
3. purge only the exact Cloudflare asset URL if that asset is cached there;
4. use prefix purge only when the precise affected set is known;
5. use purge-everything only for a confirmed, sitewide cache incident.

Document emergency purges in the incident log with reason, scope, operator, and timestamp.

## 18. Observability

For representative public requests, record:

- response status;
- `Cache-Control`;
- provider-specific CDN cache-control headers when visible;
- `Age`;
- `CF-Cache-Status`;
- current framework/runtime cache-status header when visible;
- `Vary`;
- `ETag` / `Last-Modified` when present;
- response time from at least two regions when practical.

Example diagnostic commands:

```bash
curl -sS -D - -o /dev/null https://www.ahanassa.com/
curl -sS -D - -o /dev/null https://www.ahanassa.com/_next/static/<hashed-file>
curl -sS -D - -o /dev/null https://www.ahanassa.com/api/rfq
```

Run a cacheable request at least twice. The first and second response should demonstrate the expected miss/hit or revalidation behavior. A `HIT` is not automatically correct; verify age, representation, locale, content type, and privacy.

## 19. QA Scenarios

The caching implementation is incomplete until these scenarios pass.

| Test | Expected result |
| --- | --- |
| First request for fingerprinted asset | Valid asset, long immutable header; edge may report MISS |
| Second request for same asset | CDN HIT or equivalent; identical bytes/content type |
| New deployment | HTML references new hashed assets; old assets remain harmless |
| CMS item update | Item page updates after targeted revalidation |
| CMS listing-card update | Collection/listing page also updates |
| Homepage-featured item update | Homepage and item page both update |
| RFQ submission | No cacheable response; request reaches application once |
| Authenticated/draft request | No shared-cache HIT; private/no-store response |
| `404` followed by content creation | New content becomes available within 60 seconds or after revalidation |
| Origin `5xx` | Dynamic/private response is not cached |
| Image format negotiation | AVIF/WebP/fallback returns correctly without format mix-up |
| Marketing query parameters | Same page content; no cache fragmentation at application layer |
| Arabic/English locale, if enabled | Correct language, direction, canonical, and isolated cache identity |
| CMS webhook replay | Rejected or safely idempotent |
| Invalid webhook tag/path | Rejected; no arbitrary purge occurs |

## 20. Performance Budget and Targets

Caching must support—not disguise—the performance budget.

| Metric | Target |
| --- | --- |
| CDN hit ratio for immutable static assets | ≥ 95% after warm-up |
| HTML freshness after CMS webhook | ≤ 60 seconds; target near-immediate |
| RFQ/contact shared-cache hit ratio | 0% |
| Unexpected cache variation by tracking query | 0 |
| Sitewide purges during normal operation | 0 |
| Stale-content incidents caused by double-CDN caching | 0 |

Core Web Vitals targets are defined in `PERFORMANCE_GUIDELINES.md`.

## 21. Implementation Checklist

### Application

- [ ] Inspect the installed Next.js version and active caching model.
- [ ] Classify every route as static, ISR, dynamic, or mutation-only.
- [ ] Define an acceptable stale period for every cached data source.
- [ ] Add stable cache tags to CMS-backed queries.
- [ ] Implement signed, allowlisted CMS revalidation.
- [ ] Set `no-store` on RFQ, contact, preview, auth, and webhook responses.
- [ ] Version fonts, logos, media replacements, and downloadable documents.
- [ ] Configure remote image hosts narrowly.
- [ ] Prevent user/session data from entering shared cached functions.

### Cloudflare

- [ ] Confirm that no global Cache Everything rule applies to HTML.
- [ ] Add bypass rules before asset cache rules.
- [ ] Cache `/_next/static/*` while respecting origin headers.
- [ ] Cache only approved public asset directories.
- [ ] Confirm `/api/*`, preview, admin, account, and auth routes bypass cache.
- [ ] Keep Browser TTL and Edge TTL set to respect origin unless documented.
- [ ] Test the final rule order with Cloudflare Trace.

### Verification

- [ ] Capture headers for representative HTML, asset, image, API, and RFQ routes.
- [ ] Test cold, warm, stale, and post-revalidation requests.
- [ ] Test invalidation for item, collection, homepage, and global settings.
- [ ] Confirm 4xx/5xx behavior.
- [ ] Test mobile and desktop without device-specific HTML caching.
- [ ] Test all locales if localization is enabled.
- [ ] Record cache decisions in deployment QA.

## 22. Claude Code Acceptance Criteria

Claude Code may mark caching work complete only when:

1. every affected route is classified;
2. response headers are verified on the deployed domain, not only locally;
3. Cloudflare edge-cache and framework revalidation responsibilities remain separated;
4. sensitive routes demonstrably bypass shared caches;
5. CMS invalidation updates both detail and dependent listing pages;
6. immutable assets use versioned URLs;
7. cache behavior has automated tests where feasible and a manual header record where not;
8. no undocumented cache override or sitewide purge dependency remains.

## 23. Related Project Documents

- `TECHNICAL_ARCHITECTURE.md`
- `STACK.md`
- `DATA_ARCHITECTURE.md`
- `CMS_ARCHITECTURE.md`
- `API_INTEGRATIONS.md`
- `FORM_ARCHITECTURE.md`
- `SECURITY_GUIDELINES.md`
- `PERFORMANCE_GUIDELINES.md`
- `IMAGE_OPTIMIZATION.md`
- `FONT_STRATEGY.md`
- `DEPLOYMENT_ARCHITECTURE.md`
- `ENVIRONMENT_VARIABLES.md`
- `QA_CHECKLIST.md`
- `POST_DEPLOY_CHECKLIST.md`

## 24. Official References

- [Next.js caching](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js revalidation](https://nextjs.org/docs/app/getting-started/revalidating)
- [Next.js `revalidatePath`](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- [Next.js `revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Cloudflare Origin Cache Control](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [Cloudflare CDN-Cache-Control](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)
- [Cloudflare Cache Rules settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)
- [Cloudflare revalidation](https://developers.cloudflare.com/cache/concepts/revalidation/)

---

**Default decision:** cache immutable assets aggressively, cache public content deliberately, invalidate CMS-backed content by tag/path, and never place private or transactional responses in a shared cache.
