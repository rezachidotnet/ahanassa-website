# SEO QA Checklist — Ahan Asa

> **Project:** Ahan Asa | آهن آسا  
> **Canonical origin:** `https://www.ahanassa.com`  
> **Application:** Next.js App Router on Cloudflare Workers + Static Assets  
> **Platform:** Cloudflare Workers, D1, R2, Queues/DLQ, Cron, Turnstile, Edge Cache  
> **ERP integration:** `https://odoo.ahanassa.com`  
> **Launch scope:** Persian (`fa`), RTL  
> **Document status:** Implementation-ready / Release Gate  
> **Document version:** 2.0  
> **Owner:** SEO + Engineering + Content  
> **Last updated:** 2026-08-26

---

## 1. Purpose

This document defines the required SEO quality-assurance checks for development, staging, pre-deployment, and production validation of the Ahan Asa website.

Claude Code must not mark SEO QA as passed merely because the application builds successfully. Every applicable **P0** and **P1** item must be tested against rendered output or the production-like URL, and evidence must be recorded.

---

## 2. Binding project rules

1. The only canonical production origin is `https://www.ahanassa.com`.
2. The launch version is Persian-first, fully RTL, and must not advertise unsupported languages.
3. `AHAN_ASA_SITE_COPY_FA_FINAL.md` is the sole approved source of page copy.
4. Approved copy must not be invented, paraphrased, shortened, or rewritten without explicit approval.
5. SEO scope is B2B steel procurement management—not retail, a marketplace, live-price publishing, public inventory, or unsupported delivery guarantees.
6. Each keyword cluster must have one canonical owner page. Thin, duplicate, doorway, or mass-generated pages are prohibited.
7. Structured data must describe visible, truthful content only.
8. No `SearchAction` may be used unless a real, accessible site search exists.
9. Unsupported or unpublished routes must not appear in the sitemap, navigation, canonical tags, structured data, or alternate-language annotations.
10. SEO fixes must not silently change approved page copy or business claims.
11. Odoo is the commercial system of record. Public SEO rendering must not synchronously depend on Odoo availability.
12. Public catalog, price, and availability output must come from the approved website read model/cache populated by Odoo synchronization.
13. An RFQ must be durably persisted in D1 before the user receives a success response; delivery to Odoo is asynchronous and idempotent.
14. Product, variant, size, unit, quantity, price, and RFQ relationships must match `PRODUCT_CATALOG_SPEC.md`, `DATABASE_SCHEMA.md`, and `ERP_DATA_MAPPING.md`.
15. Price structured data and visible price claims are allowed only when the value is synchronized, timestamped, and actually visible on the page.
16. Faceted and query URLs are either explicitly approved SEO landing pages or controlled as filter-only URLs; they must never create uncontrolled indexable combinations.
17. Cloudflare edge caching may serve stale public content only within the approved freshness window; RFQ submission and authenticated/admin responses must not be publicly cached.
18. Administrative, synchronization, queue, and diagnostic endpoints are private application surfaces and must not be discoverable or indexable.
19. Any conflict between SEO documents and the approved system-of-record or route policy is a release blocker until resolved.

---

## 3. Severity and release policy

| Severity | Meaning | Release rule |
|---|---|---|
| **P0 — Blocker** | Can prevent crawling/indexing, create a wrong canonical, expose staging, or materially misrepresent the business | Deployment is blocked |
| **P1 — Critical** | Strong risk to rankings, SERP appearance, duplication, or organic conversion | Must be fixed before production |
| **P2 — Major** | Quality, relevance, accessibility, performance, or monitoring issue | Fix before release when practical; otherwise create an owner and deadline |
| **P3 — Improvement** | Non-blocking optimization | Add to backlog with evidence |

### Pass conditions

- [ ] All applicable P0 items pass.
- [ ] All applicable P1 items pass.
- [ ] Every deferred P2/P3 item has an owner, reason, and target date.
- [ ] No open issue can change the canonical host, indexing directives, sitemap validity, or approved business claims.
- [ ] Public pages still render correctly when Odoo is slow or unavailable.
- [ ] Price/catalog freshness and RFQ durability checks pass for the release.
- [ ] QA evidence is attached to the release record.

---

## 4. Required QA evidence

For each failed or high-risk check, record:

| Field | Required value |
|---|---|
| Check ID | Example: `CAN-XX` |
| Tested URL | Exact absolute URL |
| Environment | Local / Preview / Staging / Production |
| Result | Pass / Fail / N/A |
| Evidence | Screenshot, HTML excerpt, command output, or report link |
| Severity | P0 / P1 / P2 / P3 |
| Owner | Named person or team |
| Fix reference | Commit, PR, or task ID |
| Retest | Date and final result |

Do not include secrets, tokens, private form submissions, or personal data in QA evidence.

---

## 5. Environment and hostname checks

- [ ] **ENV-01 — P0:** `https://www.ahanassa.com` returns `200` for the homepage.
- [ ] **ENV-02 — P0:** `http://ahanassa.com`, `https://ahanassa.com`, and `http://www.ahanassa.com` reach the matching `https://www.ahanassa.com` URL through permanent redirects.
- [ ] **ENV-03 — P0:** Redirects preserve path and query string where required.
- [ ] **ENV-04 — P0:** No redirect loop or multi-hop chain exists for canonical production URLs.
- [ ] **ENV-05 — P0:** Preview, staging, deployment-provider, and temporary domains are not indexable.
- [ ] **ENV-06 — P0:** Preview or staging HTML does not emit canonical URLs pointing to the preview hostname.
- [ ] **ENV-07 — P1:** Production responses use HTTPS without mixed active content.
- [ ] **ENV-08 — P1:** Each public URL has one stable preferred form for hostname, protocol, path, and trailing-slash convention.
- [ ] **ENV-09 — P1:** URL normalization does not create duplicate variants through casing, repeated slashes, empty parameters, or default documents.
- [ ] **ENV-10 — P1:** Production environment variables generate `https://www.ahanassa.com` as the absolute SEO origin.

Example verification:

```bash
curl -I https://www.ahanassa.com/
curl -I https://ahanassa.com/
curl -I http://www.ahanassa.com/
curl -I https://www.ahanassa.com/robots.txt
curl -I https://www.ahanassa.com/sitemap.xml
```

## 6A. SEO-first rendering and runtime independence

- [ ] **REN-01 — P0:** The initial HTML response contains the page title, meta description, canonical, language, H1, primary content, crawlable links, and applicable JSON-LD without requiring client-side JavaScript.
- [ ] **REN-02 — P0:** Homepage, category, product, price, article, and other approved SEO pages do not synchronously call `odoo.ahanassa.com` during the visitor request.
- [ ] **REN-03 — P0:** A controlled Odoo outage or timeout does not turn public pages into `5xx`, empty HTML, soft errors, or uncrawlable shells.
- [ ] **REN-04 — P1:** Server Components and static/cached rendering are used by default; client JavaScript is limited to approved interactive features such as filters, search, price calculators, and RFQ builders.
- [ ] **REN-05 — P1:** Rendered HTML remains meaningful when JavaScript is disabled or delayed.
- [ ] **REN-06 — P1:** The page type uses the rendering mode defined by the architecture: static/cached for SEO pages, cached dynamic for approved price data, interactive/dynamic for RFQ and admin surfaces.
- [ ] **REN-07 — P1:** No server action, route handler, or client component exposes Odoo credentials or private ERP response data.
- [ ] **REN-08 — P1:** Dynamic metadata is generated from stable website data and does not change unpredictably between requests.
- [ ] **REN-09 — P2:** Streaming, prefetching, and hydration do not delay or replace critical SEO content.

Required evidence for REN-02 and REN-03:

```text
1. Request trace or server log showing the public route reads static/cache/D1 data.
2. Controlled Odoo failure test.
3. Initial HTML capture proving title, H1, content, canonical, and links remain present.
```

---

## 6. Crawlability and indexability

- [ ] **CRW-01 — P0:** Public production pages intended for search return `200`.
- [ ] **CRW-02 — P0:** Indexable pages do not emit `noindex`, `nofollow`, or conflicting `X-Robots-Tag` headers.
- [ ] **CRW-03 — P0:** Non-public, utility, success, error, preview, and internal-search pages are excluded from indexing as defined by the route specification.
- [ ] **CRW-04 — P0:** `robots.txt` does not block required HTML, CSS, JavaScript, images, fonts, or rendering assets.
- [ ] **CRW-05 — P0:** No production-wide `Disallow: /` exists.
- [ ] **CRW-06 — P1:** Internal links to indexable pages are crawlable `<a href>` links, not JavaScript-only actions.
- [ ] **CRW-07 — P1:** Important pages are reachable through internal links and are not orphaned.
- [ ] **CRW-08 — P1:** Parameterized, filtered, tracking, or duplicate URL variants cannot create an uncontrolled crawl space.
- [ ] **CRW-09 — P1:** Pages that require client-side JavaScript still expose meaningful server-rendered HTML to crawlers.
- [ ] **CRW-10 — P1:** Authentication, firewall, bot protection, CDN rules, or rate limits do not block legitimate search-engine crawlers.
- [ ] **CRW-11 — P2:** Crawl depth for primary commercial pages is appropriate and consistent with `INTERNAL_LINKING.md`.
- [ ] **CRW-12 — P2:** No important content is loaded only after user interaction with no crawlable alternative.

---

## 7. HTTP status and error handling

- [ ] **STS-01 — P0:** Valid pages return their real status and do not masquerade as errors.
- [ ] **STS-02 — P0:** Missing pages return a genuine `404`, not `200` with a “not found” message.
- [ ] **STS-03 — P0:** Removed URLs use the approved `301`/`308`, `404`, or `410` behavior.
- [ ] **STS-04 — P1:** The custom 404 page is useful, branded, and links to valid recovery destinations.
- [ ] **STS-05 — P1:** Server errors return `5xx`; they are not hidden behind a `200` response.
- [ ] **STS-06 — P1:** Redirect targets return the intended final response and do not redirect again unnecessarily.
- [ ] **STS-07 — P1:** No internal link points to `3xx`, `4xx`, or `5xx` URLs.
- [ ] **STS-08 — P2:** Response behavior is consistent for `GET` and `HEAD` where applicable.

---

## 8. Canonical URLs

- [ ] **CAN-01 — P0:** Every indexable page has exactly one canonical URL.
- [ ] **CAN-02 — P0:** Canonicals are absolute HTTPS URLs on `www.ahanassa.com`.
- [ ] **CAN-03 — P0:** Each unique indexable page uses a self-referencing canonical unless an approved consolidation rule states otherwise.
- [ ] **CAN-04 — P0:** Canonical targets return `200` and are themselves indexable.
- [ ] **CAN-05 — P0:** No canonical points to staging, preview, deployment-provider, localhost, apex, HTTP, 404, or redirected URLs.
- [ ] **CAN-06 — P1:** Canonical path formatting matches the site’s route and trailing-slash policy.
- [ ] **CAN-07 — P1:** Query-string variants resolve to the approved clean canonical where appropriate.
- [ ] **CAN-08 — P1:** Pagination or future filtered content is not incorrectly canonicalized to page one or a parent page.
- [ ] **CAN-09 — P1:** HTML canonical, sitemap URL, Open Graph URL, and structured-data URL agree.
- [ ] **CAN-10 — P1:** Canonical decisions match `HREFLANG_CANONICAL.md`, `ROUTES.md`, and `SEO_PAGE_MAP.md`.

---

## 9. Language, locale, and directionality

- [ ] **LOC-01 — P0:** Launch pages declare the correct approved locale and direction: Persian `lang="fa" dir="rtl"`, English `lang="en" dir="ltr"`, Arabic `lang="ar" dir="rtl"`.
- [ ] **LOC-02 — P0:** Published Persian, English, and Arabic routes are represented in sitemap and hreflang output only when approved localized content exists.
- [ ] **LOC-03 — P0:** No alternate-language URL is emitted unless that page exists, returns `200`, is indexable, and contains approved localized content.
- [ ] **LOC-04 — P1:** Persian content is not mislabeled as another language.
- [ ] **LOC-05 — P1:** Each published localized page has a self-reference plus complete reciprocal hreflang annotations.
- [ ] **LOC-06 — P1:** `x-default` behavior follows `HREFLANG_CANONICAL.md` and points to the real, indexable unprefixed Persian page.
- [ ] **LOC-07 — P1:** Localized pages do not silently fall back to Persian while claiming another language.
- [ ] **LOC-08 — P2:** Numerals, punctuation, directionality, and mixed Persian/Latin strings render correctly without corrupting metadata or URLs.

For the approved `fa`/`en`/`ar` launch architecture, hreflang must be emitted for approved published localized pages. Fake, placeholder, machine-translated, or unpublished alternates are a release blocker.

---

## 10. XML sitemap

- [ ] **SMP-01 — P0:** `/sitemap.xml` returns `200` with valid XML and the correct content type.
- [ ] **SMP-02 — P0:** The sitemap contains only canonical, indexable, production URLs that return `200`.
- [ ] **SMP-03 — P0:** Every sitemap URL uses `https://www.ahanassa.com`.
- [ ] **SMP-04 — P0:** Preview, staging, provider, localhost, query, 404, redirect, `noindex`, and unpublished-language URLs are absent.
- [ ] **SMP-05 — P1:** All approved indexable routes from `SEO_PAGE_MAP.md` are included.
- [ ] **SMP-06 — P1:** Sitemap URLs and canonical tags match exactly.
- [ ] **SMP-07 — P1:** `lastmod` is present only when accurate and changes when substantial page content changes.
- [ ] **SMP-08 — P1:** Sitemap generation is deterministic and does not create duplicates.
- [ ] **SMP-09 — P1:** `robots.txt` references the absolute production sitemap URL.
- [ ] **SMP-10 — P2:** Large future sitemaps are split correctly and referenced by a valid sitemap index.

---

## 11. Robots directives

- [ ] **ROB-01 — P0:** Production `robots.txt` is reachable and syntactically valid.
- [ ] **ROB-02 — P0:** Production and non-production robots policies are intentionally different.
- [ ] **ROB-03 — P0:** `robots.txt`, meta robots, and `X-Robots-Tag` do not conflict.
- [ ] **ROB-04 — P0:** Indexable pages are not blocked in `robots.txt`; blocked URLs cannot rely on meta `noindex` being seen by crawlers.
- [ ] **ROB-05 — P1:** Sensitive routes are protected through access control, not through `robots.txt` alone.
- [ ] **ROB-06 — P1:** PDFs or downloadable assets follow an explicit indexability policy.
- [ ] **ROB-07 — P1:** Form confirmation and internal utility pages use the approved indexing directive.

---

## 12. Page metadata

- [ ] **MET-01 — P0:** Every indexable page has a unique, descriptive `<title>`.
- [ ] **MET-02 — P1:** Titles follow `METADATA_SPEC.md` and accurately match the page’s search intent.
- [ ] **MET-03 — P1:** Each indexable page has a unique, useful meta description.
- [ ] **MET-04 — P1:** Metadata is Persian on Persian pages and contains no accidental fallback or placeholder English.
- [ ] **MET-05 — P1:** No title or description uses unapproved claims such as live pricing, guaranteed delivery, public inventory, or marketplace language.
- [ ] **MET-06 — P1:** Metadata is generated from approved page data and does not rewrite `AHAN_ASA_SITE_COPY_FA_FINAL.md`.
- [ ] **MET-07 — P1:** Dynamic pages have stable, deterministic metadata.
- [ ] **MET-08 — P1:** Open Graph title, description, URL, image, site name, type, and locale are valid.
- [ ] **MET-09 — P1:** X/Twitter card metadata is complete where required.
- [ ] **MET-10 — P1:** Social images use absolute production URLs, return `200`, and have appropriate dimensions and file size.
- [ ] **MET-11 — P2:** Titles and descriptions avoid avoidable truncation, duplication, stuffing, and boilerplate dominance.
- [ ] **MET-12 — P2:** Favicon, web app icons, and branding assets resolve without errors.

Recommended automated duplicate tests:

- duplicate or missing titles;
- duplicate or missing descriptions;
- missing canonicals;
- metadata containing `localhost`, preview hostnames, `undefined`, placeholder text, or unsupported locale codes.

---

## 13. Headings and content semantics

- [ ] **CNT-01 — P1:** Each primary page has one clear, visible H1 representing the page topic.
- [ ] **CNT-02 — P1:** H1 and major headings match the approved copy source.
- [ ] **CNT-03 — P1:** Heading levels form a logical hierarchy and are not selected only for styling.
- [ ] **CNT-04 — P1:** The primary content is present in rendered HTML and is not hidden behind tabs, sliders, or client-only loading.
- [ ] **CNT-05 — P1:** Each page satisfies its assigned search intent and keyword owner defined in `SEO_PAGE_MAP.md` and `SEO_KEYWORD_MAP.md`.
- [ ] **CNT-06 — P1:** No two indexable pages compete as near-duplicates for the same primary keyword cluster.
- [ ] **CNT-07 — P1:** No thin, doorway, placeholder, empty-category, or automatically spun page is indexable.
- [ ] **CNT-08 — P1:** Business claims are accurate and consistent with the approved B2B procurement-manager positioning.
- [ ] **CNT-09 — P1:** Primary conversion paths support submitting an invoice, BOQ/material list, or procurement request without inventing unsupported services.
- [ ] **CNT-10 — P2:** Abbreviations and technical terms are understandable to the intended B2B audience.
- [ ] **CNT-11 — P2:** Visible publication or update dates are accurate when shown.
- [ ] **CNT-12 — P2:** Author, reviewer, company, and contact signals are truthful and visible where relevant.

---

## 14. Images and media SEO

- [ ] **IMG-01 — P1:** Meaningful images have concise, contextual Persian alternative text.
- [ ] **IMG-02 — P1:** Decorative images use empty alt text and do not create keyword noise.
- [ ] **IMG-03 — P1:** Image filenames are stable, descriptive, and safe for URLs where practical.
- [ ] **IMG-04 — P1:** Image URLs return `200`; there are no broken media references.
- [ ] **IMG-05 — P1:** Hero and key content images have explicit dimensions or reserved aspect ratios to prevent layout shifts.
- [ ] **IMG-06 — P1:** The LCP image is not incorrectly lazy-loaded and is prioritized appropriately.
- [ ] **IMG-07 — P2:** Below-the-fold media uses lazy loading without hiding content from crawlers.
- [ ] **IMG-08 — P2:** Modern formats, responsive sizes, and compression follow `IMAGE_OPTIMIZATION.md`.
- [ ] **IMG-09 — P2:** Important information is not embedded only as text inside an image.
- [ ] **IMG-10 — P2:** Video pages provide meaningful visible context, poster images, and accessible controls.

---

## 15. Internal linking and navigation

- [ ] **LNK-01 — P0:** Logo, primary navigation, footer, breadcrumbs, and CTAs link to valid production routes.
- [ ] **LNK-02 — P1:** Primary commercial pages receive contextual internal links from relevant pages.
- [ ] **LNK-03 — P1:** Anchor text describes the destination and avoids generic repetition where better context is available.
- [ ] **LNK-04 — P1:** No orphan page exists among approved indexable routes.
- [ ] **LNK-05 — P1:** Internal links use the canonical route, not redirects or duplicate variants.
- [ ] **LNK-06 — P1:** Mobile and desktop navigation expose the same essential crawlable destinations.
- [ ] **LNK-07 — P1:** Broken links are zero in the release crawl.
- [ ] **LNK-08 — P1:** Breadcrumbs match the visible hierarchy and structured data.
- [ ] **LNK-09 — P2:** External links are relevant, safe, and do not use `nofollow` or `sponsored` incorrectly.
- [ ] **LNK-10 — P2:** Links opening new tabs include appropriate security attributes.

---

## 16. Structured data

- [ ] **SCH-01 — P0:** JSON-LD is valid JSON and parses without runtime or escaping errors.
- [ ] **SCH-02 — P0:** Structured data uses only accurate, visible, and approved information.
- [ ] **SCH-03 — P1:** The implementation follows `STRUCTURED_DATA.md`.
- [ ] **SCH-04 — P1:** `Organization`, `WebSite`, and `WebPage` entities use stable `@id` values and consistent production URLs.
- [ ] **SCH-05 — P1:** `WebPage` includes correct `url`, `name`, `inLanguage`, `isPartOf`, and `about` where specified.
- [ ] **SCH-06 — P1:** Organization name, URL, logo, contact details, and social profiles match visible site information.
- [ ] **SCH-07 — P1:** Breadcrumb structured data matches the visible breadcrumb and canonical route.
- [ ] **SCH-08 — P1:** No `SearchAction` exists without a real and accessible search feature.
- [ ] **SCH-09 — P1:** No fake ratings, reviews, prices, stock, offers, FAQs, or unsupported business properties are marked up.
- [ ] **SCH-10 — P1:** Page-specific schema is not duplicated by multiple components.
- [ ] **SCH-11 — P2:** Structured data passes Schema.org validation and applicable Google rich-result tests.
- [ ] **SCH-12 — P2:** JSON-LD contains no preview hostname, relative canonical URL, `undefined`, or empty required value.

## 16A. Catalog, product, and price SEO integrity

- [ ] **CAT-01 — P0:** Every indexable category, product, variant, and approved price page has a stable canonical slug and a corresponding website read-model record.
- [ ] **CAT-02 — P0:** Product/category pages do not render commercial fields from a live visitor-time Odoo request.
- [ ] **CAT-03 — P0:** Product, variant, size, unit, and category relationships match the approved D1 schema and contain no orphaned indexable records.
- [ ] **CAT-04 — P0:** A product or price page is not published to the sitemap until its required content, canonical, status, and SEO fields are complete.
- [ ] **CAT-05 — P1:** Visible product specifications, unit labels, and variant names match the synchronized commercial data.
- [ ] **CAT-06 — P1:** Each visible public price has `source`, `updated_at`, unit, currency, and freshness status according to `PRICING_SYSTEM.md`.
- [ ] **CAT-07 — P1:** Stale, missing, withdrawn, or failed-sync prices are handled by the approved display and indexability rule; no stale value is presented as current.
- [ ] **CAT-08 — P1:** Product and price pages contain useful non-price information and are not thin auto-generated pages.
- [ ] **CAT-09 — P1:** Product/Offer structured data exists only when the product/price data is visible and truthful on the rendered page.
- [ ] **CAT-10 — P1:** `priceCurrency`, `price`, availability, unit, and update text agree across visible UI, metadata, JSON-LD, and the D1 read model.
- [ ] **CAT-11 — P1:** Price changes invalidate only the required product/category/price cache tags and update affected sitemap `lastmod` values.
- [ ] **CAT-12 — P2:** Price history or charts expose only approved public data and do not leak internal margins, supplier data, or private customer pricing.
- [ ] **CAT-13 — P2:** Bulk price updates are atomic from the website perspective: no page exposes a partially updated variant set.

Required catalog evidence:

```text
- Odoo source record or approved sync fixture
- D1 read-model record
- Rendered HTML and visible price timestamp
- Canonical/sitemap output
- Cache invalidation or revalidation log
```

## 16B. Odoo synchronization and RFQ SEO/conversion integrity

- [ ] **ERP-01 — P0:** Odoo credentials are stored only as Cloudflare secrets and are never present in browser JavaScript, HTML, logs, or repository files.
- [ ] **ERP-02 — P0:** Public routes remain available when Odoo is unavailable; the latest valid website read model or approved fallback is used.
- [ ] **ERP-03 — P0:** Odoo-to-website synchronization records status, version, source ID, and last-sync time for products, variants, units, and prices.
- [ ] **ERP-04 — P0:** Website-to-Odoo RFQ delivery is asynchronous through Queues and cannot create duplicate CRM leads or orders on retry.
- [ ] **ERP-05 — P0:** An RFQ is written to D1 before acknowledgement and receives a stable idempotency key/reference.
- [ ] **ERP-06 — P1:** Queue retry, exponential backoff, maximum attempts, and dead-letter handling are configured and observable.
- [ ] **ERP-07 — P1:** Failed synchronization is visible to authorized operators without exposing internal error details to visitors or crawlers.
- [ ] **ERP-08 — P1:** Customer identity, RFQ, RFQ items, attachments, UTM/source, consent, and Odoo IDs follow `ERP_DATA_MAPPING.md`.
- [ ] **ERP-09 — P1:** RFQ item fields support category, product, variant/size, unit, and quantity; free-text items follow the approved fallback rule.
- [ ] **ERP-10 — P1:** R2 attachments are access-controlled, virus/file-type validated where required, and referenced safely in the Odoo record.
- [ ] **ERP-11 — P1:** Queue consumers and sync endpoints are authenticated, rate-limited, and protected from replay or unauthorized writes.
- [ ] **ERP-12 — P1:** A failed Odoo sync does not alter public canonical, robots, sitemap, or structured-data output incorrectly.
- [ ] **ERP-13 — P2:** Sync reconciliation can identify missing, duplicated, stale, or conflicting records and supports safe reprocessing.

RFQ acceptance sequence:

```text
Visitor
  → validate Turnstile and input
  → persist RFQ + items in D1
  → enqueue idempotent delivery message
  → acknowledge with reference number
  → deliver to Odoo with retry/DLQ
```

The release evidence must prove that the acknowledgement step does not wait for a successful Odoo response.

## 16C. Cloudflare platform and edge-boundary checks

- [ ] **CF-01 — P0:** The production hostname is routed to the intended Cloudflare Worker and static assets; no legacy hosting target can serve conflicting HTML.
- [ ] **CF-02 — P0:** Worker bindings point to the intended production D1 database, R2 bucket, Queues, and environment secrets.
- [ ] **CF-03 — P0:** D1 foreign keys, unique constraints, and required indexes are enabled and match `DATABASE_SCHEMA.md`.
- [ ] **CF-04 — P0:** R2 object delivery does not expose bucket internals, private attachments, signed URLs, or sensitive metadata in public SEO output.
- [ ] **CF-05 — P1:** Turnstile and rate limits protect RFQ endpoints without blocking normal page rendering, legitimate form submissions, or approved crawlers.
- [ ] **CF-06 — P1:** Queue consumers, Cron sync jobs, and dead-letter handling run in the intended production environment and are observable.
- [ ] **CF-07 — P1:** Worker response headers, cache behavior, compression, and content types are correct for HTML, XML, JSON, images, fonts, and downloads.
- [ ] **CF-08 — P1:** Error handling does not leak Worker exception text, D1 SQL details, Odoo responses, or internal binding names.
- [ ] **CF-09 — P2:** Edge logs and traces include a correlation/reference ID for public errors, RFQs, sync jobs, and cache invalidation without logging personal data.

---

## 17. Redirects and migrations

- [ ] **RED-01 — P0:** Every approved legacy URL has one documented target or an intentional `404`/`410` decision.
- [ ] **RED-02 — P0:** Permanent moves use `301` or `308`, not temporary redirects.
- [ ] **RED-03 — P0:** Redirects never point to a less relevant destination merely to avoid a 404.
- [ ] **RED-04 — P1:** No redirect chain exceeds one hop under normal conditions.
- [ ] **RED-05 — P1:** No redirect loop exists.
- [ ] **RED-06 — P1:** Redirect targets are canonical, indexable, and return `200`.
- [ ] **RED-07 — P1:** Query strings are preserved or removed according to an explicit rule.
- [ ] **RED-08 — P1:** Internal links and sitemap entries are updated to final URLs rather than relying on redirects.
- [ ] **RED-09 — P2:** Redirect behavior is tested for encoded Persian paths and case variations where relevant.
- [ ] **RED-10 — P2:** The redirect map and test evidence are synchronized with `REDIRECTS.md`.

---

## 18. Core Web Vitals and performance

- [ ] **PER-01 — P1:** No critical production page has a severe rendering or interaction regression.
- [ ] **PER-02 — P1:** LCP, INP, and CLS meet the targets in `PERFORMANCE_GUIDELINES.md` on representative mobile conditions.
- [ ] **PER-03 — P1:** Fonts do not cause invisible text, excessive layout shift, or unnecessary blocking.
- [ ] **PER-04 — P1:** Critical images and fonts are prioritized without excessive preloading.
- [ ] **PER-05 — P1:** Third-party scripts do not block initial rendering or break consent requirements.
- [ ] **PER-06 — P2:** JavaScript and CSS payloads are reviewed for avoidable route-level bloat.
- [ ] **PER-07 — P2:** Server response, caching, and CDN behavior match `CACHING_STRATEGY.md`.
- [ ] **PER-08 — P2:** Performance is tested on the homepage, one primary commercial page, one content-heavy page, and the main lead form route.
- [ ] **PER-09 — P2:** Lab results are interpreted alongside production field data when sufficient field data exists.

Record device profile, network profile, test date, URL, and report version with every performance result.

## 18A. Edge cache, freshness, and invalidation

- [ ] **CACHE-01 — P0:** Public HTML, robots, and sitemap responses use only the approved production origin and do not cache preview or staging output.
- [ ] **CACHE-02 — P0:** RFQ submission, admin, authenticated, sync, queue, and diagnostic responses are not publicly cached.
- [ ] **CACHE-03 — P0:** Cache keys vary correctly by canonical host, path, locale, and any approved content dimension; unrelated query parameters do not create uncontrolled cache variants.
- [ ] **CACHE-04 — P1:** Cache-Control, `stale-while-revalidate`, and edge TTL values match `CACHING_STRATEGY.md` and the freshness policy.
- [ ] **CACHE-05 — P1:** Article publication invalidates the article, listing, category, sitemap, and relevant navigation caches.
- [ ] **CACHE-06 — P1:** Product or price synchronization invalidates the smallest required set of product, category, price, structured-data, and sitemap caches.
- [ ] **CACHE-07 — P1:** Cache invalidation is idempotent and safe when a sync message is retried.
- [ ] **CACHE-08 — P1:** A stale cache cannot preserve an old canonical, robots directive, locale, price, or removed route beyond the approved window.
- [ ] **CACHE-09 — P1:** Cache HIT/MISS behavior and age headers can be verified in production-like QA.
- [ ] **CACHE-10 — P2:** Cache performance is measured separately for HTML, images, static assets, D1 reads, and Odoo integration workers.

Required evidence includes response headers before and after a content/price update, cache tag or purge event, and the first fresh response.

---

## 19. Mobile, accessibility, and UX signals

- [ ] **UX-01 — P1:** Pages are usable at mobile widths without horizontal scrolling or obscured content.
- [ ] **UX-02 — P1:** Main content and primary CTA are not blocked by overlays, chat widgets, cookie banners, or sticky elements.
- [ ] **UX-03 — P1:** Keyboard users can reach and operate navigation, forms, accordions, and dialogs.
- [ ] **UX-04 — P1:** Focus is visible and logical.
- [ ] **UX-05 — P1:** Form labels, errors, required states, and success messages are programmatically understandable.
- [ ] **UX-06 — P1:** Tap targets and text sizes are usable on mobile.
- [ ] **UX-07 — P1:** Color contrast and semantic landmarks follow `ACCESSIBILITY.md`.
- [ ] **UX-08 — P2:** Motion respects reduced-motion preferences.
- [ ] **UX-09 — P2:** RTL layout does not reverse technical values, phone numbers, URLs, emails, or file extensions incorrectly.
- [ ] **UX-10 — P2:** The user can recover from form errors without losing entered data or uploaded-file context where technically possible.

---

## 20. Lead forms and organic conversion

- [ ] **FRM-01 — P0:** The primary lead form submits successfully in production.
- [ ] **FRM-02 — P1:** The form clearly explains required and optional inputs.
- [ ] **FRM-03 — P1:** Accepted file types and size limits are visible before upload.
- [ ] **FRM-04 — P1:** The user is told what happens after submission.
- [ ] **FRM-05 — P1:** Data-handling notice and required consent behavior are present where applicable.
- [ ] **FRM-06 — P1:** A valid fallback contact path is available when upload or submission fails.
- [ ] **FRM-07 — P1:** Form success or confirmation pages follow the approved indexability rule.
- [ ] **FRM-08 — P1:** Validation errors do not expose internal system details.
- [ ] **FRM-09 — P2:** Organic landing pages have relevant, non-deceptive CTAs tied to the page intent.
- [ ] **FRM-10 — P2:** Lead-source attribution survives navigation and submission where defined by analytics requirements.
- [ ] **FRM-11 — P0:** The RFQ builder persists a valid request and every line item before showing success.
- [ ] **FRM-12 — P0:** RFQ items support category, product, variant/size, unit, and quantity with server-side validation.
- [ ] **FRM-13 — P1:** Duplicate submission, refresh, retry, and network interruption do not create duplicate RFQs.
- [ ] **FRM-14 — P1:** The RFQ reference number is stable, non-sensitive, and traceable to the D1 record and Odoo synchronization record.
- [ ] **FRM-15 — P1:** Attachment upload failure does not silently discard the RFQ or falsely report complete submission.
- [ ] **FRM-16 — P1:** The form does not expose Odoo availability, internal IDs, queue errors, or stack traces to users or crawlers.

---

## 21. Analytics and Search Console readiness

- [ ] **ANA-01 — P1:** The production site uses the approved analytics container or property only.
- [ ] **ANA-02 — P1:** Page views are not duplicated by App Router navigation.
- [ ] **ANA-03 — P1:** Organic conversion events use the names and parameters in `ANALYTICS_TRACKING.md`.
- [ ] **ANA-04 — P1:** Form start, successful submission, upload success/failure, and fallback contact actions are tracked where approved.
- [ ] **ANA-05 — P1:** Analytics does not send raw personal data, uploaded filenames containing personal data, or form content.
- [ ] **ANA-06 — P1:** Consent behavior matches applicable requirements and does not break essential site functions.
- [ ] **ANA-07 — P1:** Search Console property ownership is verified for the canonical domain.
- [ ] **ANA-08 — P1:** The production sitemap is submitted to the correct Search Console property.
- [ ] **ANA-09 — P2:** Branded and non-branded organic performance can be segmented.
- [ ] **ANA-10 — P2:** Annotations or release records make SEO deployments traceable against performance changes.

---

## 22. Security issues that affect SEO

- [ ] **SEC-01 — P0:** No hacked, injected, spam, gambling, pharmaceutical, or unrelated content exists in source, rendered HTML, sitemap, or indexed URLs.
- [ ] **SEC-02 — P0:** No secret, internal endpoint, stack trace, or private storage URL appears in public markup.
- [ ] **SEC-03 — P0:** Public pages do not redirect users or crawlers differently based on deceptive rules.
- [ ] **SEC-04 — P1:** Security headers do not block required rendering, images, fonts, or structured data.
- [ ] **SEC-05 — P1:** User-generated filenames or content cannot inject metadata, links, or scripts.
- [ ] **SEC-06 — P1:** Dependency and application vulnerabilities with an SEO or availability impact are resolved before release.
- [ ] **SEC-07 — P2:** Uptime and error monitoring cover indexable routes and sitemap endpoints.

---

## 23. Automated checks in CI

The following checks should run before merging SEO-relevant changes:

- [ ] **AUT-01 — P0:** Lint and type checks pass.
- [ ] **AUT-02 — P0:** Production build completes successfully.
- [ ] **AUT-03 — P0:** Generated routes contain no production-breaking metadata errors.
- [ ] **AUT-04 — P1:** A route crawl reports zero broken internal links.
- [ ] **AUT-05 — P1:** Indexable routes have one title, one canonical, and a valid robots policy.
- [ ] **AUT-06 — P1:** Sitemap URLs return `200`, are canonical, and are not `noindex`.
- [ ] **AUT-07 — P1:** No metadata or JSON-LD contains forbidden hosts or placeholders.
- [ ] **AUT-08 — P1:** Structured data parses as valid JSON.
- [ ] **AUT-09 — P1:** Duplicate title, description, H1, and canonical reports are reviewed.
- [ ] **AUT-10 — P2:** Representative Lighthouse or equivalent performance budgets pass.

Minimum forbidden-string scan:

```text
localhost
127.0.0.1
vercel.app
staging
preview
example.com
undefined
[object Object]
TODO
lorem ipsum
```

Exceptions must be explicitly scoped; tests or documentation may legitimately contain some of these strings.

---

## 24. Manual pre-deployment crawl

Run a production-mode crawl of all internal HTML routes and export at minimum:

- all URLs and status codes;
- indexability and robots directives;
- canonical URL and canonical status;
- title, description, H1, and language;
- content length and near-duplicate groups;
- internal inlinks and outlinks;
- crawl depth and orphan candidates;
- Open Graph and social-image URLs;
- structured-data types and validation errors;
- image URLs, status, alt text, size, and lazy-loading state;
- redirect chains and loops;
- sitemap inclusion versus crawl discovery.

Release crawl acceptance criteria:

- [ ] Zero broken internal links.
- [ ] Zero indexable `4xx` or `5xx` pages.
- [ ] Zero canonical targets that redirect or fail.
- [ ] Zero accidental `noindex` pages.
- [ ] Zero staging or provider hostnames in production SEO output.
- [ ] Zero unsupported-language URLs in sitemap or hreflang.
- [ ] Zero unexplained duplicate canonical owners.
- [ ] All approved indexable pages are discoverable and included in the sitemap.

---

## 25. Production smoke test

Perform immediately after deployment:

- [ ] **PRD-01 — P0:** Homepage and representative primary pages return `200`.
- [ ] **PRD-02 — P0:** Canonical origin and page canonicals are correct in live rendered HTML.
- [ ] **PRD-03 — P0:** Production robots policy and sitemap are live and correct.
- [ ] **PRD-04 — P0:** Staging and preview environments remain non-indexable.
- [ ] **PRD-05 — P0:** Main form submission and file upload work end-to-end.
- [ ] **PRD-06 — P1:** Metadata, OG images, JSON-LD, internal links, and redirects work on live URLs.
- [ ] **PRD-07 — P1:** Analytics and approved conversion events fire once.
- [ ] **PRD-08 — P1:** Cache/CDN does not serve stale canonicals, metadata, sitemap, or robots files.
- [ ] **PRD-09 — P1:** Mobile rendering and primary CTA remain usable.
- [ ] **PRD-10 — P1:** No console, network, hydration, or server error affects discoverability or conversion.
- [ ] **PRD-11 — P0:** With Odoo temporarily unavailable, homepage, category, product, article, and approved price pages still return valid SEO HTML.
- [ ] **PRD-12 — P0:** A test RFQ is persisted in D1 and acknowledged before Odoo processing completes.
- [ ] **PRD-13 — P1:** The test RFQ reaches Odoo exactly once after queue processing, or appears in the dead-letter/recovery workflow with an operator-visible failure.
- [ ] **PRD-14 — P1:** A controlled price/catalog update reaches the website read model and invalidates the expected cache entries.
- [ ] **PRD-15 — P1:** Public responses do not expose Odoo host internals, queue payloads, D1 identifiers, or private R2 URLs.

---

## 26. Post-launch monitoring

### Within 24 hours

- [ ] Verify production sitemap fetch succeeds.
- [ ] Inspect representative URLs with Search Console URL Inspection.
- [ ] Check server, CDN, form, and JavaScript error logs.
- [ ] Confirm analytics page views and conversions are not missing or duplicated.
- [ ] Verify no emergency rollback changed canonical or robots behavior.

### Within 7 days

- [ ] Review indexing status and discovered/crawled URL patterns.
- [ ] Review excluded URLs for unexpected `noindex`, redirects, duplicates, or soft 404s.
- [ ] Check branded queries and initial organic landing-page traffic.
- [ ] Review Core Web Vitals field-data availability and origin-level signals.
- [ ] Re-crawl production and compare against the release baseline.

### Monthly

- [ ] Review coverage/indexing changes, manual actions, security issues, and sitemap status.
- [ ] Review organic clicks, impressions, CTR, average position, and conversions by landing page.
- [ ] Review new broken links, redirect chains, orphan pages, metadata duplication, and crawl anomalies.
- [ ] Review keyword cannibalization against the one-owner-per-cluster rule.
- [ ] Validate that new content still uses approved copy and accurate business claims.
- [ ] Review performance regressions and third-party script growth.
- [ ] Review Odoo-to-D1 sync freshness, failed messages, dead-letter items, and reconciliation results.
- [ ] Review public price freshness, stale-price incidents, cache invalidation failures, and catalog orphan records.
- [ ] Review RFQ delivery success rate, duplicate prevention, acknowledgement latency, and operator recovery time.

---

## 27. Page-level QA template

Duplicate this section for every indexable page:

```md
### Page: [Page name]

- URL:
- SEO owner page / keyword cluster:
- Search intent:
- QA environment:

- [ ] Returns 200
- [ ] Indexable
- [ ] Self-canonical on https://www.ahanassa.com
- [ ] Included in sitemap
- [ ] Unique title
- [ ] Unique meta description
- [ ] One visible H1
- [ ] Approved Persian copy preserved
- [ ] Correct lang="fa" and RTL direction
- [ ] Valid OG/X metadata
- [ ] Valid structured data
- [ ] Relevant internal inlinks
- [ ] No broken links or media
- [ ] Mobile UX passed
- [ ] Performance target passed
- [ ] CTA and form path passed
- [ ] Analytics events passed
- [ ] Public page renders with Odoo unavailable
- [ ] Catalog/price freshness passed where applicable
- [ ] RFQ persistence and asynchronous Odoo handoff passed where applicable

Evidence:
Issues:
Owner:
Retest result:
```

---

## 28. Release sign-off

| Area | Owner | Result | Evidence / reference | Date |
|---|---|---|---|---|
| Technical SEO |  | Pass / Fail |  |  |
| Content SEO |  | Pass / Fail |  |  |
| Canonical / redirects |  | Pass / Fail |  |  |
| Sitemap / robots |  | Pass / Fail |  |  |
| Structured data |  | Pass / Fail |  |  |
| Performance |  | Pass / Fail |  |  |
| Accessibility / mobile |  | Pass / Fail |  |  |
| Forms / conversion |  | Pass / Fail |  |  |
| Analytics / monitoring |  | Pass / Fail |  |  |
| Production smoke test |  | Pass / Fail |  |  |

### Final decision

- [ ] **GO:** All P0/P1 checks pass and deferred items are documented.
- [ ] **NO-GO:** One or more P0/P1 checks failed.
- [ ] **ROLLBACK:** Production deployment created an indexing, canonical, security, or conversion-critical regression.

**Approved by:**  
**Release / commit:**  
**Deployment date:**  
**Notes:**

---

## 29. Related project documents

Claude Code must consult the current versions of these documents when performing SEO QA:

- `PROJECT_BRIEF.md`
- `AHAN_ASA_SITE_COPY_FA_FINAL.md`
- `SEO_STRATEGY.md`
- `SEO_KEYWORD_MAP.md`
- `SEO_PAGE_MAP.md`
- `METADATA_SPEC.md`
- `STRUCTURED_DATA.md`
- `INTERNAL_LINKING.md`
- `REDIRECTS.md`
- `SITEMAP_ROBOTS_SPEC.md`
- `HREFLANG_CANONICAL.md`
- `ROUTES.md`
- `LOCALIZATION.md`
- `ANALYTICS_TRACKING.md`
- `PERFORMANCE_GUIDELINES.md`
- `IMAGE_OPTIMIZATION.md`
- `ACCESSIBILITY.md`
- `FORM_ARCHITECTURE.md`
- `SECURITY_GUIDELINES.md`
- `PRE_DEPLOY_CHECKLIST.md`
- `POST_DEPLOY_CHECKLIST.md`
- `STACK.md`
- `TECHNICAL_ARCHITECTURE.md`
- `DEPLOYMENT_ARCHITECTURE.md`
- `SYSTEM_OF_RECORD.md`
- `ODOO_INTEGRATION.md`
- `ERP_DATA_MAPPING.md`
- `SYNC_STRATEGY.md`
- `FAILURE_RECOVERY.md`
- `DATABASE_SCHEMA.md`
- `PRODUCT_CATALOG_SPEC.md`
- `PRICING_SYSTEM.md`
- `RFQ_SYSTEM.md`
- `ADMIN_PANEL_SPEC.md`
- `AUTHORIZATION_ROLES.md`
- `CACHING_STRATEGY.md`
- `PERFORMANCE_BUDGET.md`

If documents conflict, stop and report the exact conflict. Do not silently choose a rule, modify approved copy, or create a new SEO policy.

---

## 30. Definition of Done

SEO QA is complete only when:

1. every approved indexable page has been tested;
2. every applicable P0 and P1 check passes;
3. production host, canonical, sitemap, robots, and status behavior agree;
4. Persian launch content is correctly labeled, rendered RTL, and no unsupported locale is exposed;
5. approved Ahan Asa copy and business positioning remain unchanged;
6. structured data is truthful and valid;
7. lead capture works without leaking personal data into analytics or QA evidence;
8. crawl, performance, mobile, and live smoke-test evidence is recorded;
9. Odoo outage, catalog/price freshness, queue retry, idempotency, and RFQ persistence evidence is recorded;
10. all deferred issues have accountable owners and dates; and
11. the final release decision is signed off.
