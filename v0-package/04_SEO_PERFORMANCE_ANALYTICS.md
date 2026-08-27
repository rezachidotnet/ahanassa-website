# 04 — SEO, Performance & Analytics

> Ahan Asa | آهن آسا — v0 canonical package
> Consolidated from: `SEO_STRATEGY.md`, `SEO_KEYWORD_MAP.md`, `SEO_PAGE_MAP.md`, `METADATA_SPEC.md`, `STRUCTURED_DATA.md`, `INTERNAL_LINKING.md`, `SITEMAP_ROBOTS_SPEC.md`, `HREFLANG_CANONICAL.md`, `PERFORMANCE_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md`, `CACHING_STRATEGY.md`, `ANALYTICS_TRACKING.md`, `SEO_QA_CHECKLIST.md` — reconciled against `PROJECT_OVERRIDES.md` and `CLAUDE.md`.
> Runtime: **Cloudflare Workers + vinext + Vite + TypeScript**. Canonical production origin: `https://www.ahanassa.com`.
> Locales at launch: **fa (default, unprefixed, RTL), en (`/en`, LTR), ar (`/ar`, RTL)** — all three required at launch, not future-reserved. This supersedes every source document that frames `en`/`ar` as "reserved," "Phase 2," or "not yet active" — those documents were written before the owner's 2026-08-26 multilingual sign-off (`PROJECT_OVERRIDES.md` §1) and their locale-scope framing is superseded on that point only; their technical mechanics (hreflang shape, sitemap structure, redirect rules, cache rules) remain valid and are restated below with fa/en/ar as the launch set.
> Public product catalog and public pricing are **owner-confirmed in scope** (`PROJECT_OVERRIDES.md` §4) — this reverses the older SEO documents' prohibition on `/price`-style routes and live-price keyword territory. Price must never be rendered from a synchronous live Odoo call — only from the synchronized Cloudflare D1 read model (full data/Odoo architecture: `06_PRODUCTS_CMS_ODOO_RFQ.md`).

---

## 1. SEO architecture and strategy

### 1.1 Brand position in search

Ahan Asa must not read in search results as a generic iron shop or a live price board. The intended search-entity position is:

> A professional steel procurement-management partner that protects the buyer's capital by controlling specification, price comparison, supplier evaluation, documentation, and delivery — for project-based and organizational buyers in Iran (fa), and English/Arabic-speaking buyers (en/ar) once those locales publish.

Content must differentiate Ahan Asa from: a generic retail iron shop, a classifieds/marketplace board, an unaccountable middleman, an unverified live-price page, and a market-news outlet with no procurement service.

### 1.2 Core indexability principle

Every indexable page must render its primary content, headings, canonical metadata, and crawlable internal links in the **initial server-rendered HTML response**. Nothing SEO-critical may depend on client-side hydration, a live Odoo call, or post-load JavaScript. This is a hosting-agnostic principle carried forward from the source docs' Next.js framing — it applies identically to the Cloudflare Workers + vinext runtime with no architectural change required.

### 1.3 Topical structure

Site content follows a **Hub → Category → Product/Service → Guide/Tool → Case Study** model with these clusters:

- **Procurement management** — the managed-purchasing service itself (requirement review, sourcing/supplier evaluation, quotation comparison, documentation/quality control, logistics/delivery).
- **Steel products/materials** — category and product pages (final product scope is a content/business decision, not invented here).
- **Industries/use cases** — construction, industrial/manufacturing, EPC/infrastructure, steel fabrication (publish only with genuinely distinct content per audience).
- **Knowledge/tools** — buying guides, weight calculators, technical tables, glossary, checklists.
- **Evidence/trust** — process explanation, verified case studies, supplier-evaluation methodology.
- **Regional/export** (future) — content for expansion markets; not part of the fa/en/ar Phase 1 scope defined here.

**Page-necessity rule:** a new indexable URL is justified only when it has an independent search intent, independent value/data/tooling, or genuinely localized content for a locale — never merely because a city/size/brand keyword combination exists. Combinatorial thin pages (product × size × brand × city) are prohibited by default.

### 1.4 Keyword ownership

- Every indexable page owns exactly one primary intent/keyword cluster; overlapping clusters must be merged, retargeted, or explicitly disambiguated in a page-ownership map before both pages ship.
- Prioritize by business relevance and qualified-conversion potential — not raw search volume alone.
- Do not target: live/"امروز" daily price pages, "ارزان‌ترین" claims, unverified stock/inventory queries, unverified manufacturer/factory claims, unsupported city pages, or supplier-directory positioning.
- The public catalog/price scope confirmed in `PROJECT_OVERRIDES.md` §4 permits price-intent pages (see §5.6), but they must still follow the qualification rules below — this does not reopen "قیمت لحظه‌ای" or unqualified live-price positioning, which remains excluded.

### 1.5 Canonical route conflicts — OPEN DECISION

Two route-naming conflicts exist in the source corpus and are **not resolved by this package**:
- `/steel-products/[category-slug]` (older `ROUTES.md` pattern) vs. `/steel/{category}/{product}/{variant}` (catalog-architecture pattern). **OPEN DECISION — DO NOT INVENT.**
- RFQ/request route: `/request` (`FORM_ARCHITECTURE.md`, canonical) vs. `/request-consultation` (older SEO/sitemap docs). Guidance across the corpus converges on **`/request` as canonical**, with `/request-consultation` permanently redirected to it — treat this as resolved guidance, not an open item, and implement one canonical RFQ route accordingly (full RFQ UX: `02_RFQ_CONVERSION_UX.md`).

All examples in this file use symbolic route keys (`catalogHub`, `categoryDetail`, `productDetail`, `priceHub`, `priceDetail`, `request`) resolved through one central typed route registry — never hardcoded literal strings duplicated across components.

---

## 2. Metadata contract

### 2.1 Canonical origin

Single production origin: `https://www.ahanassa.com`. Store it once in validated server configuration (`SITE_URL`/`SITE_ORIGIN`); never derive it from the request `Host` header. Production builds must fail if this value is absent, non-HTTPS, or mismatched. The non-`www` apex permanently redirects (one hop) to the canonical host.

### 2.2 Locale-aware routing

```text
fa → /                (unprefixed, default, RTL, x-default target)
en → /en/{path}        (LTR)
ar → /ar/{path}        (RTL)
```

`/fa/**` must not exist as a second canonical surface — if reachable, it redirects (one hop) to the unprefixed equivalent. Because fa/en/ar are all launch locales (not gated future activation), the hreflang activation gate in §2.4 below applies per-page, not per-locale: a given page's cluster includes only the locale versions of *that page* which are actually complete, translated, reviewed, and published — omit any locale still pending for that specific page, exactly as the source docs specify for partial clusters, but do not treat en/ar as blocked wholesale.

### 2.3 Title, description, canonical — pattern rules

- One unique, intent-matching `<title>` and meta description per indexable page, generated from structured content, never duplicated site-wide.
- Standard title pattern: `[page subject] | آهن آسا` (brand suffix omitted only on the homepage/brand pages, where the brand may lead).
- Meta description states: what the page contains, what decision it helps the visitor make, and an honest next step — no invented urgency, price, or availability claims.
- Every indexable page emits exactly one **self-canonical**, absolute, HTTPS, normalized (lowercase ASCII slug, no trailing slash except `/`, no fragment, no tracking/session/sort/filter query parameters) URL matching its own canonical route.
- A missing dynamic record (unknown product/article slug) returns a genuine `404` — never canonicalizes to a parent hub or the homepage.
- Redirects go directly to their final destination in one hop; redirect chains are prohibited.

### 2.4 hreflang and x-default

- Only pages with at least two complete, published, indexable, reciprocally-linked locale counterparts emit hreflang. A single-locale page emits only its self-canonical.
- Use `fa`, `en`, `ar`, `x-default` as hreflang values (no region subtags such as `fa-IR`/`en-US` unless a documented region-specific variant decision exists).
- `x-default` always points to the unprefixed Persian URL (Persian is default, not geo/IP-redirected).
- Missing counterparts are **omitted** from the cluster — never substituted with Persian content, never machine-translated to fill the gap, and the language switcher must not silently redirect to an unrelated homepage when a translation is missing.
- Deliver hreflang via HTML `<head>` metadata generated server-side from one stable page-identity record (not inferred from slug matching); if XML sitemap alternates are also used, they must be generated from the same source data — never a second, independently maintained map.

### 2.5 Open Graph and social

Standard fields (`og:title`, `og:description`, `og:type`, `og:url = canonical`, `og:site_name = آهن آسا`, `og:locale`, `og:image` at `1200×630` with alt text) on every public shareable page. Social images must not depict unverified inventory, facilities, or claims; a numeric price must never be rendered into a share image.

### 2.6 Robots and non-indexable routes

| Route class | Directive |
|---|---|
| Published public page | `index, follow` |
| RFQ builder (`request`) | `noindex, follow` (stays crawlable so `noindex` can be read; not blocked in `robots.txt`) |
| RFQ confirmation | `noindex, nofollow, noarchive` |
| Account/admin/preview/draft | `noindex, nofollow, noarchive` + authentication |
| Filter/sort/search query states | `noindex, follow` or non-indexable application state; never in sitemap |
| Error/maintenance | Correct `404`/`410`/`5xx` status; no styled `200` error page |

`robots.txt` must never be the mechanism for hiding a page from the index (crawlers must be able to fetch a page to see its `noindex`); it exists to control crawl budget and known parameter/crawl-trap patterns only. Non-production environments (preview/staging) return `Disallow: /` with no `Sitemap:` line, plus `X-Robots-Tag: noindex, nofollow, noarchive` site-wide as defense in depth.

---

## 3. Structured data (JSON-LD)

- Serialize from the **same resolved page snapshot** as the visible HTML — never generate JSON-LD from a different data version than what's on screen.
- Server-rendered only, present in initial HTML, safely escaped (no raw user input or CMS HTML interpolated into a `<script type="application/ld+json">` block).
- Phase 1 required types: `Organization` and `WebSite` (homepage), `WebPage`/subtypes (every indexable page), `BreadcrumbList` (non-home pages with a visible hierarchy), `Article`/`BlogPosting` (qualifying editorial content).
- Conditional: `Product` (a specific published product or approved indexable variant, only with verified visible facts), `Offer` (strictly opt-in — see gate below), `CollectionPage`/`ItemList` (hubs, matching only visibly listed items), `Service`, `DigitalDocument` (real public resources only).
- Prohibited by default: `AggregateOffer` used as a variant-price range, `AggregateRating`/`Review` (no approved first-party rating system), `HowTo` for the procurement workflow, `LocalBusiness` (no verified public location yet), `OnlineStore` (the site is not a checkout store).

**Offer eligibility gate** — emit `Offer` only when *all* are true: the price is published, approved, a genuine firm offer (not indicative/historical/"call for price"/customer-specific), fresh under the pricing freshness policy, complete with amount + ISO-4217 currency + unit, and the page visibly shows the exact same commercial terms. Toman-denominated Iranian prices must convert to `IRR` at `1 toman = 10 IRR` in the machine-readable value while the visible toman figure remains the human-facing display — never label a toman amount as `IRR` without the ×10 conversion. When the numeric price is hidden from users, it must also be absent from JSON-LD. Full pricing-freshness policy and data model: `06_PRODUCTS_CMS_ODOO_RFQ.md`.

- Never serialize: customer/lead identity, RFQ contents, uploaded filenames, private Odoo IDs, supplier records, internal cost/margin/stock data, signed R2 URLs, or placeholder/example hostnames in production output.
- A category page is not a `Product` — do not attach fabricated SKU, price, or availability to a category hub.

---

## 4. Internal linking architecture

### 4.1 Principles

- Every SEO-relevant link is a real crawlable `<a href>` present in server-rendered HTML — never a `div`/`onClick`-only navigation, never assembled only after user interaction.
- One canonical owner page per dominant topic/intent; converging anchor phrasing across the site must point to that one owner.
- A link exists because it clarifies the current topic, exposes a parent/child relationship, supports a buying decision, or advances toward the RFQ flow — not because a keyword happens to appear in body text. The CMS must not auto-link every occurrence of a term.

### 4.2 Required relationships

- Every hub links to **all** its published direct children; every detail page links back to its true parent and forward to a relevant next decision (adjacent capability, guide, or the RFQ action).
- Product/category/price pages reciprocally link to their exact commercial counterpart when both are indexable (product ↔ its price-owner page), using the **same canonical entity mapping** on both sides.
- Articles link to one–three canonical commercial topic owners; commercial pages may link out to guidance but must not display an unfiltered "latest articles" feed.
- No important indexable page may rely only on the footer, the XML sitemap, or internal search for discovery (an "orphan" or "near-orphan" is a release blocker).
- Breadcrumbs express the real hierarchy, use real anchors for ancestors, and must match `BreadcrumbList` JSON-LD exactly.

### 4.3 Price-anchor honesty rule

Anchor text may promise a visible current price (e.g. `قیمت میلگرد ۱۶`) only when the destination page will actually show that price, its unit, and its update timestamp. When a price is stale, withheld, or unapproved, use neutral anchors (`بررسی وضعیت قیمت و شرایط خرید`, `ارسال درخواست قیمت`) and route the user toward the RFQ action instead.

### 4.4 Faceted navigation / non-indexable states

Filter, sort, search, and pagination query states are application UI, not crawlable links, unless a specific combination has been separately approved as a curated SEO landing page with its own content, metadata, and inbound links. Ordinary facet combinations must never enter the sitemap or the internal crawl graph.

### 4.5 RFQ context passing

CTA/link context may pass non-sensitive identifiers (category ID, product ID, source page key) into the RFQ flow's query context — never customer name, phone, quantity, filenames, or Odoo record IDs. The RFQ item basket (if a multi-item builder exists) must not create crawlable per-item-state URLs.

---

## 5. Sitemap and robots

### 5.1 Structure

Use a sitemap **index** from launch (`/sitemap.xml`) referencing per-family child sitemaps — pages, categories, products, prices, articles, and (if activated) projects/industries/resources — each present only when non-empty. This lets product/price freshness be monitored and invalidated independently of static content.

### 5.2 Eligibility gate

A URL enters a sitemap only when it is: production environment, published, editorially approved, indexable, sitemap-enabled, in an active locale, in a valid sync state, self-canonical on the approved origin, `200` without a redirect hop, reachable via at least one crawlable internal link, and carrying substantive unique content. Unknown/unverifiable state fails closed (excluded).

Sitemaps are never built by enumerating Odoo records directly — an Odoo product becomes sitemap-eligible only after it has a separate, approved website SEO record (see `06_PRODUCTS_CMS_ODOO_RFQ.md`).

### 5.3 `lastmod` honesty

`lastmod` reflects a real, significant public content change (main content, public price/spec, canonical/hreflang, structured data tied to visible content) — never build/deploy time, cache-refresh time, or every sync attempt. If no trustworthy timestamp exists, omit `lastmod` rather than fabricate it.

### 5.4 robots.txt shape (illustrative)

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /account/
Disallow: /preview/
Disallow: /*?*q=
Disallow: /*?*sort=
Disallow: /*?*grade=
Disallow: /*?*brand=

Sitemap: https://www.ahanassa.com/sitemap.xml
```

Only block parameters actually deployed. Never block `/`, rendering assets, `/request`, or `/request/confirmation` (RFQ pages stay crawlable so their `noindex` meta tag is discoverable). The `odoo.ahanassa.com` subdomain requires its own separate robots policy (typically `Disallow: /` once no ERP route needs public indexing) — the main site's robots file does not govern it.

### 5.5 Locale sitemap behavior

Phase 1 XML sitemaps may contain fa/en/ar canonical URLs as each locale's pages actually publish — there is no requirement to withhold en/ar from the sitemap pending some later "activation," since all three are launch locales. What gates a specific URL's sitemap inclusion is *that page's own* completeness/publication state per §5.2, identical logic to any other page family.

### 5.6 Public price pages

An indexable price page must visibly show: current price or an explicit "request quote" state, unit and currency, a genuine last-update timestamp, product/category identity, and the scope/conditions of the price. Never create sitemap entries for: every raw pricelist row, customer-specific/negotiated prices, draft or failed-sync records, or price-history dates as standalone URLs. Price-page `lastmod` uses the time the price became effective in the D1 read model, not the crawl time.

---

## 6. Performance guidelines and Core Web Vitals

### 6.1 Field targets (75th percentile, mobile and desktop measured separately)

| Metric | Good (Google) | Internal target |
|---|---:|---:|
| LCP | ≤ 2.5 s | ≤ 2.0 s |
| INP | ≤ 200 ms | ≤ 150 ms |
| CLS | ≤ 0.10 | ≤ 0.05 |

These are Core Web Vitals thresholds, framework-agnostic — they apply identically on Cloudflare Workers + vinext as on any other rendering target. Lighthouse lab scores (mobile ≥ 90, desktop ≥ 95 performance) are useful regression signals but do not replace field data once real traffic exists.

### 6.2 Rendering strategy

- Prefer the least-expensive rendering path available for each route: static generation → incremental/edge revalidation → server-rendered → client-rendered only for genuinely interactive leaf components.
- Minimize client-side JavaScript; keep interactive boundaries small and near the leaves of the component tree — do not make an entire page client-rendered because one section needs interaction.
- SEO-critical content must never move behind client-only rendering to simplify implementation.

### 6.3 JavaScript, dependencies, and third-party scripts

- Every new dependency requires a stated functional justification; avoid large libraries for trivial UI (sliders, accordions, modals, date formatting).
- Dynamically import genuinely heavy, non-critical interactive modules (maps, rich editors, complex calculators) — never the above-the-fold critical path.
- Third-party scripts (GTM, chat widgets, heatmaps) load via a non-blocking strategy (`afterInteractive`/`lazyOnload`-equivalent); none may sit in the critical rendering path. GTM is the single client-side tag-management gateway — do not install `gtag.js` in parallel (see §9).
- Avoid request waterfalls; fetch independent data in parallel.

### 6.4 Image performance

- Use the platform's optimized image delivery by default; every image declares intrinsic dimensions or a stable `aspect-ratio` wrapper before load — no layout-shift-causing late-known dimensions.
- Format preference: AVIF → WebP → optimized JPEG/PNG only when necessary; SVG for vector/logo assets (never processed through a lossy raster pipeline).
- Exactly one confirmed LCP image per route receives eager loading + high fetch priority; every other image is lazy below the fold. Hidden carousel slides, hover images, and desktop-only art must never compete with the actual LCP candidate.
- Transfer-size budgets by role: LCP hero ≤ 200 KB (300 KB hard limit), large editorial ≤ 140 KB, card ≤ 80 KB, thumbnail ≤ 40 KB, Open Graph ≤ 250 KB target. A budget exception requires measured before/after evidence and a recorded decision — visual preference alone is not sufficient.
- `sizes` must be written from actual layout behavior (not a generic copied string) for every responsive/`fill` image; missing `sizes` on a fill image is a release defect.
- Strip unnecessary EXIF/GPS/thumbnail metadata from public derivatives; never publish camera-original formats (RAW/HEIC/TIFF/PSD) or embed base64 images in HTML/CSS/JSON.
- Real photographs are never mirrored to suit RTL layout — logos, marks, documents, and human handedness stay authentic; use layout/mobile art-direction, not image flipping, to create RTL copy space.

### 6.5 Font strategy

Locked production rules carried forward:

- Self-hosted font files only, loaded via the framework's local-font mechanism — no remote font provider (Google Fonts, a font CDN) may be requested at runtime, and no `preconnect`/`dns-prefetch` to a font origin is needed because delivery is same-origin.
- One active font request on the initial route; `font-display: swap`; font synthesis (`font-synthesis: none`) disabled so a missing weight fails review rather than rendering faux-bold.
- Required weight role map: `400` (body), `500` (nav/labels), `600` (buttons/emphasis), `700` (headings), `800` (hero/display only) — do not load `100/200/300/900` merely because a variable font supports them.
- Persian family decision order: preferred commercial family (**OPEN DECISION — DO NOT INVENT** which family, pending license/asset approval) → guaranteed self-hosted OFL baseline (Estedad Variable) → emergency OFL fallback (Vazirmatn Variable) → system stack (`Tahoma, Arial, sans-serif`). No font may ship without documented provenance, license, and checksum in a font manifest.
- The official Ahan Asa wordmark (Persian or Latin) is fixed vector artwork and must never be reconstructed with any live web font.

**OPEN DECISION — DO NOT INVENT — multi-locale font budget.** The source `FONT_STRATEGY.md` was written against a single-locale (Persian-only) byte budget (~140 KB target / 180 KB hard limit, one active family, one initial font request) and explicitly states "Only Persian is published in Phase 1," treating English/Arabic font loading as a future, separately-gated decision. This directly conflicts with the fa/en/ar-at-launch requirement in `PROJECT_OVERRIDES.md` §1 and is a genuine architecture gap, not a reading-time override: the font-loading strategy needs a real redesign for 2–3 concurrent locale budgets before en/ar pages can ship correctly, and **no Arabic type family has been selected yet**. Do not invent an Arabic family, a combined multi-locale byte budget, or assume the Persian family's Latin coverage substitutes for a proper Latin family on `/en` pages. Carry forward the *principles* (self-host, `swap`, one active-locale font per route boundary, no remote provider, license-gated) to each locale independently until the redesign lands.

### 6.6 Layout stability (CLS)

Reserve space for every image, video, embed, form, banner, and dynamically loaded component before content arrives; skeletons must match final frame dimensions; never insert content above existing visible content after load; prefer animating `transform`/`opacity` over `width`/`height`/`top`/`left`/`margin`/`padding`.

### 6.7 Caching strategy

**Architecture principle (Cloudflare edge model — supersedes any Vercel/Next.js-cache-era framing in the source docs' literal API references):**

```text
Visitor → Cloudflare (DNS/TLS/WAF/edge cache) → Workers/vinext app (route + data cache) → D1/R2/Queues/server-only Odoo adapter
```

Cloudflare and the application-level cache both exist; the primary rule is that **Cloudflare must not blanket-cache HTML** ("Cache Everything" applied to document responses is prohibited) — HTML/RSC-equivalent output and revalidation stay owned by the application layer so that a content update has one deterministic invalidation path, not two independently-purged layers racing each other.

| Rule | Requirement |
|---|---|
| Mutating routes | Never cache `POST`/`PUT`/`PATCH`/`DELETE` responses |
| Private/personalized | Never cache RFQ, contact, auth, admin, preview, or any response keyed by cookie/session/authorization in a shared cache |
| Immutable assets | Fingerprinted build assets, versioned fonts, versioned media/logo files → `public, max-age=31536000, immutable`, content-hashed URLs (a byte change must produce a new URL, never an overwrite at the same URL) |
| Marketing/public pages | Application-owned revalidation (default ~24h for static marketing pages, ~1h for frequently-edited content, per-tag for structured content) — Cloudflare bypasses document caching for these |
| Public catalog/price pages | Cache at the edge only through the synchronized D1 read model with tag-based invalidation; the response must never depend on a live Odoo round-trip per request |
| Sitemap/robots | Short edge TTL (~5 min), revalidated on child-set or `lastmod` change |
| Sensitive/API mutation routes | `Cache-Control: private, no-store, max-age=0` |

- Cache invalidation is **tag- or path-scoped** (e.g. `product:{id}`, `price:{id}`, `article:{id}`, `sitemap:products`) — never a full-zone purge for a routine content or price update. A full purge is reserved for a confirmed sitewide incident and must be logged with reason/operator/timestamp.
- A CMS/Odoo-sync webhook that triggers revalidation must verify a signature, validate its payload against an allowlist, never accept an arbitrary caller-supplied tag/path, rate-limit, and fail closed on invalid input.
- If the site later adds multiple locales at the cache-key level (already true here — fa/en/ar), each locale uses distinct canonical paths and is invalidated independently; never vary cached HTML by a cookie-based locale switch, and never vary cached HTML by device/user-agent (use responsive CSS/images instead).
- Marketing UTM parameters must not fragment the cache key (they don't change rendered content); functional parameters (search, filters, pagination, signed tokens) must not be blindly stripped from the cache key without proving they're irrelevant to output.

---

## 7. Analytics (GTM/GSC)

### 7.1 Architecture requirement

GTM and GSC are **owner-confirmed required launch architecture** (`PROJECT_OVERRIDES.md` §5) — the implementation must support Google Tag Manager as the single client-side tag gateway and Google Search Console readiness (verification, sitemap submission, indexing/Core Web Vitals monitoring) from the start.

**OPEN DECISION — DO NOT INVENT — specific configuration values.** The GTM container ID, GA4 Measurement ID, and Search Console verification value are not supplied and must never be hardcoded, guessed, or filled with a placeholder that could be mistaken for a real value in production. Treat them as environment variables populated when the owner provides them; the `.env.example` file stores only placeholder tokens, never a real ID.

### 7.2 Measurement principles

- **Conversion is server-confirmed, not client-implied.** The primary conversion event (`generate_lead` or equivalent) fires only after the backend confirms durable receipt of an RFQ submission — a CTA click, an opened form, or a client-side "success" render is never sufficient. See `02_RFQ_CONVERSION_UX.md` for the full RFQ event taxonomy and funnel.
- **Minimalism.** Implement only events that support a specific business decision; vague names (`button_click`, `engagement`, `interaction`) are prohibited. One behavior has exactly one recording source — GTM's automatic Enhanced Measurement and a manual `dataLayer` push must never double-fire the same event.
- **Deduplication.** Every custom event carries a stable `event_id`; a page refresh, back/forward navigation, or retry must never create a duplicate lead record.
- **Naming.** `lower_snake_case`, verb-led, stable across releases (`generate_lead`, `cta_click`, `form_start`, `rfq_file_attach`, `click_phone`). Visible UI copy (which may change) is never the sole identifier for a tracked element — every meaningful CTA carries a stable semantic ID (e.g. `home_hero_primary_submit_documents`), not a positional or color-based label.

### 7.3 PII exclusion — absolute rule

The following must never reach GTM, GA4, the `dataLayer`, or any analytics payload, under any circumstance:

- name, phone, email, company name, job title;
- free-text message/description content or purchase-list/BOM contents;
- uploaded filenames or file contents;
- exact delivery address;
- any query string containing user-entered data;
- a CRM/Odoo identifier that could re-identify a person when combined with other data.

Where a signal is analytically useful, send only a classified, non-identifying value (`lead_type=purchase_list`, `file_count=2`, `total_size_bucket=5_10mb`) — never the raw value.

### 7.4 Consent

Default to **denied** for `analytics_storage` and `ad_storage` (Consent Mode v2 basic implementation) until the user opts in; no analytics or advertising tag fires before that consent signal. Consent state itself must never carry a personal identifier, and a consent change is never logged as a marketing/conversion event.

### 7.5 Core event taxonomy (site-wide; RFQ-specific events are owned in `02_RFQ_CONVERSION_UX.md`)

| Event | Fires on | Key conversion? |
|---|---|---|
| `page_view` | Page load or genuine route change (exactly once — SPA route changes must not double-fire) | No |
| `cta_click` | Activation of a CTA carrying a stable analytics ID | No |
| `click_phone` / `click_email` / `click_whatsapp` | Verified direct-contact channel activation | No (assisted) |
| `generate_lead` | Server-confirmed durable RFQ receipt; may be mapped from `request_submit_success` | **Yes — primary Key Event from day one** |
| `file_download` | Click on a public asset download link | No |

A page's raw pageview is never itself elevated to "Lead" in reporting; assisted-contact clicks are reported separately from `generate_lead` so headline lead counts are never inflated.

### 7.6 Reporting

At minimum, maintain: acquisition overview, organic landing pages, RFQ funnel (`page_view → cta_click → request_form_start → request_submit_success/generate_lead`), CTA performance by stable ID, form-error rate by field, and (once fa/en/ar all publish) a language/market comparison view. Search Console monitoring covers indexing status, canonical selection agreement, Core Web Vitals field data, and multilingual index coverage across all three launch locales.

---

## 8. Consistency notes for this package

- **Public catalog/pricing** is in scope everywhere in this file (structured data §3, sitemap §5.6, internal linking §4.3) — consistent with `06_PRODUCTS_CMS_ODOO_RFQ.md`'s Odoo/D1 pricing architecture and the "never a synchronous Odoo call" rule repeated in every section that touches price.
- **fa/en/ar** are treated as co-equal launch locales throughout — metadata (§2), sitemap (§5.5), and analytics (§7.6) all assume all three exist from day one, with per-page (not per-locale) completeness gating what actually publishes.
- **Primary conversion event** (`generate_lead`) is defined here only at the site-wide analytics level; the RFQ lifecycle taxonomy (`request_form_view`, `request_form_start`, upload, manual-entry, item, step, submit, and retry events) is owned by `02_RFQ_CONVERSION_UX.md` and must use the same PII-free, server-confirmed conversion rules.
- **RFQ route** is resolved to `/request` (with `/request-consultation` permanently redirected if needed), consistent with `03_CONTENT_ROUTES_LOCALIZATION.md` §2.5 and the current `ROUTES.md` / `FORM_ARCHITECTURE.md` contract. Use the symbolic route key `request` in code so localized paths and redirects still resolve through the central route registry.

## 9. Open decisions summary

| Item | Status |
|---|---|
| `/steel-products` vs `/steel` catalog route pattern | OPEN DECISION — DO NOT INVENT |
| Preferred production Persian font family (commercial candidate) | OPEN DECISION — DO NOT INVENT |
| Arabic type family | OPEN DECISION — DO NOT INVENT |
| Multi-locale (fa+en+ar concurrent) font byte budget | OPEN DECISION — DO NOT INVENT |
| GTM container ID / GA4 Measurement ID / GSC verification value | OPEN DECISION — DO NOT INVENT |
| Final numeric performance/CWV budgets beyond the Good/Internal targets in §6.1 | Provisional only — treat `PERFORMANCE_BUDGET.md`-level exact gates as pending |
| Public price freshness window per category | OPEN DECISION — DO NOT INVENT (owned by pricing policy, see `06_PRODUCTS_CMS_ODOO_RFQ.md`) |
