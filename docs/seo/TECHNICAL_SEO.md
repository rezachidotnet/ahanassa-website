# Technical SEO (W16.2, decision D-SEO)

This page lists what the static site emits for search engines, where each part comes from, and the owner's Search Console steps (W16.4 item 4). Measurement (GTM/GA4) is documented in `docs/analytics/GTM_SETUP.md`, and legacy URLs in `docs/seo/LEGACY_REDIRECT_MAP.md`.

## 1. What every page has

| Item | Status | Source |
|---|---|---|
| `sitemap.xml` | All indexable URLs of fa/en/ar, each with reciprocal `xhtml:link` hreflang + `x-default` | `app/sitemap.ts` → `lib/static/static-rules.ts#renderSitemapXml` |
| `<lastmod>` | Product page: its own editorial/Odoo date. Pages that **show prices** (fa/ar: `/prices`, the calculator, product pages): also the newest price date they show (**new in W16.2**). Articles: the article's `updated`; a listing: the newest article in it. Other pages: the snapshot's content date. | `app/sitemap.ts` |
| `robots.txt` | Production: allow all, disallow `/api/`, `/static-404`, `/*?` (D6), with a `Sitemap:` line. Staging: disallow all. | `app/robots.ts`, `lib/seo/indexing-policy.ts` |
| canonical | Every page, absolute, on `https://www.ahanassa.com` | `lib/metadata/resolve.ts#buildPageMetadata` |
| hreflang in `<head>` | Every page: only the locales where that page really exists, + `x-default` (fa) | same |
| robots meta | `index, follow` in production; `noindex` in staging (+ `X-Robots-Tag`) | same, `_headers` |
| OpenGraph | title, description, url, site_name, locale, type, **image on every page** (new: the brand mark at 1200×1200; articles keep their 1200×630 cover) | same |
| Twitter card | **Every page** (new): `summary` with the brand mark; articles `summary_large_image` with the cover | same |
| 404 | Real HTTP 404 with a trilingual page per locale (`/404.html`, `/en/404.html`, `/ar/404.html`), `noindex` | `app/[locale]/static-404`, `lib/static/postprocess.ts#placeLocale404s`, `workers/static/wrangler.jsonc` `not_found_handling: "404-page"` |
| Images | Every `<img>` has `alt` (decorative = `""`), dimensions (`width`/`height` or `fill` in a sized box), and is lazy except above-the-fold images: the hero/page-hero image (`priority` → eager + `fetchpriority="high"`) and an article's cover | `next/image` (vinext shim), `components/**` |

## 2. JSON-LD

The builders are in `lib/seo/schema.ts`. The build gate allowlist is in `lib/static/publication-gate.ts`, and the article-page allowlist in `lib/static/article-gate.ts`.

| Page | Nodes |
|---|---|
| Home | `Organization`, **`LocalBusiness`** (new), `WebSite` |
| `/contact` | **`BreadcrumbList`**, **`LocalBusiness`**, **`FAQPage`** (the visible FAQ) — all new |
| Inner pages with a visible breadcrumb (about, services, industries, markets, products, category pages, prices, calculator, article listings) | **`BreadcrumbList`** (new; Home first, the same trail as the page) |
| Product page | `BreadcrumbList`, `Product` **without** offers/price |
| Article | **`BreadcrumbList`** and **`FAQPage`** when the article has a FAQ (new) |

Rules:

- **No price in JSON-LD anywhere** (an open owner decision). The gate refuses `offers`, `price`, `priceRange` and `Offer`. An FAQ question or answer that mentions a currency (تومان, ریال, Toman, …) is kept on the page but left out of the `FAQPage`, so a price can never reach structured data through FAQ text.
- **`LocalBusiness`** contains only confirmed facts:
  - the Isfahan office address (`PROJECT_OVERRIDES.md` §7.1), which is the official address;
  - the phone `+983135134` (shown as `031-35134`);
  - `areaServed` `IR` and `IQ`, because export to Iraq is an approved line (§7.3);
  - the brand mark as the image.

  On `/contact` only, which is the page that renders it, the Tehran coordination office is added as a `department`. It has its own address and postal code `1454954166`, and no phone (D-COMPANY-INFO, 2026-10-13). There are no hours, geo or ratings, because none of these is confirmed.

## 3. Core Web Vitals

- The before/after Lighthouse numbers are in the W16.2 report.
- W16.2 adds no render-blocking resource and no layout shift. GTM loads after `load`.
- **The main remaining cost is image weight.** The product, industry and ops photos are 1.4–2.7 MB PNGs, and the 40 px header logo is a 454 KB 4500×4500 JPEG. These assets are covered by the media provenance rules, and the logo is changing in PR #43, so converting them (WebP/AVIF, sized copies) is a separate task for owner approval.

## 4. Search Console (owner steps, after this PR is merged and live)

1. Go to search.google.com/search-console → **Add property**. Choose a **Domain** property: `ahanassa.com`. It covers www, the apex and http/https.
2. Verify it:
   - Copy the TXT record Google shows (`google-site-verification=…`).
   - In the Cloudflare dashboard, open the zone `ahanassa.com` → DNS → Records → Add record: type `TXT`, name `@`, content = the copied value, TTL Auto. Save.
   - Back in Search Console, click **Verify**. DNS can take a few minutes.
   - No site code is needed. If you prefer a URL-prefix property with an HTML tag instead, send me the tag value.
3. Open **Sitemaps** (left menu). Enter `https://www.ahanassa.com/sitemap.xml` → **Submit**. The status should become "Success", with the discovered URL count (about 93 today, plus articles once they are published).
4. Open **URL Inspection**. Inspect `https://www.ahanassa.com/` → **Request indexing**. Repeat for `/prices`, `/en` and `/ar`.
5. Open **Settings → Crawl stats** after a few days. robots.txt should show "fetched" with no errors.
6. Link GA4: GA4 → Admin → Product links → Search Console links → Link → choose the property.
7. Recheck weekly for the first month:
   - **Pages:** "Indexed" grows, and "Not found (404)" lists no legacy URL. If one appears, add it to `lib/seo/legacy-urls.ts`, per `LEGACY_REDIRECT_MAP.md`.
   - **Enhancements:** Breadcrumbs and FAQ are detected. Merchant listings and Product snippets will show no offers, which is intended.
