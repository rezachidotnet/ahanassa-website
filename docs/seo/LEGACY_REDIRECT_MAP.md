# Legacy URL → v11 redirect map (W16.2, decision D-SEO)

**Purpose:** every URL www.ahanassa.com served before the v11 static site must land on the right v11 page, with no temporary hops. This must hold **before** the legacy cleanup (after 27 Mehr 1405 = 2026-10-19), which retires the SSR Worker `ahanassa-production` and its code.

**Result (2026-10-13):** there are **120 legacy URLs**.
- 0 of them need a new redirect.
- 69 of them are legacy page paths that still exist in v11 unchanged (68 SSR-era paths plus `/`).
- The rest reach their page through permanent rules that are already live: `/fa/...`, `/request`, the apex and http hosts.
- The query-string category URLs are replaced in the browser.

`node scripts/seo/check-legacy-urls.ts --base https://www.ahanassa.com` → **120/120 pass**, both live and on the W16.2 build artifact.

## 1. Where the inventory comes from

The legacy URL inventory is in `lib/seo/legacy-urls.ts` (`legacyUrlInventory()`).

| Era | Dates | What it served | Evidence |
|---|---|---|---|
| Holding page (Vercel) | until 2026-09-02 | `/` only | commit `d22d752`; its sitemap listed only `/` (DAR-048) |
| SSR Worker `ahanassa-production` | 2026-09-02 → 2026-10-05 | fa (unprefixed) / `/en` / `/ar`, plus the pages listed below the table | `app/[locale]/**` at the last STABLE_100 `f2202ab` |
| Hosts | — | apex `ahanassa.com`, `http://` | live `curl` |

SSR-era pages: `/`, `/about`, `/contact`, `/industries`, `/markets`, `/services`, `/request`, `/products` and `/products/[slug]`. The same paths were also reachable as `/fa/...`, and the category filter was `/products?category=CODE`.

**Product slugs:** the SSR Worker and v11 both read `product_seo_contents.slug`. Three sources list the same 16 slugs:
- the 2026-10-06 production artifact sitemap (`ahanassa-w9_1/.../sitemap.xml`, 90 URLs);
- the live sitemap on 2026-10-13 (93 URLs, plus `/prices`, `/ar/prices` and `/tools/weight-calculator`);
- the docs that name slugs.

No URL was removed between them.

**No older site was found:**
- There is no "legacy" export, WordPress dump or old sitemap in the repository or in `~/Developer/*`.
- The Wayback Machine has **no capture** of `ahanassa.com` (CDX API, 2026-10-13).
- `01-sources/REDIRECTS.md` §9.4 forbids speculative aliases. Common WordPress paths such as `/?p=`, `/product/`, `/shop/` and `.php` were therefore **not** added.

If Search Console or a backlink tool later shows other old URLs, add them to `legacyUrlInventory()` with their evidence, and add the rule (§3).

## 2. The map

| Legacy URL (all 3 locales unless noted) | v11 target | How | Status |
|---|---|---|---|
| `/`, `/en`, `/ar` | same | same path | 200 |
| `/about`, `/contact`, `/industries`, `/markets`, `/services`, `/products` (+ `/en`, `/ar`) | same | same path | 200 |
| `/products/{16 slugs}` (+ `/en`, `/ar`) | same | same path | 200 |
| `/fa` | `/` | `_redirects` `/fa / 308` | 308 → 200 |
| `/fa/<anything>` (all 23 SSR fa paths) | `/<anything>` | `_redirects` `/fa/* /:splat 308` | 308 → 200 |
| `/request`, `/en/request`, `/ar/request` | `/contact`, `/en/contact`, `/ar/contact` | `_redirects` | 308 → 200 |
| `/fa/request` | `/contact` | two `_redirects` rules | 308 → 308 → 200 |
| `/products?category=REBAR` (and BEAM, ANGLE, CHANNEL, BOX_SECTION, SHEET_PLATE, PIPE; all locales) | `/products/category/rebar` (lower case, `_` becomes `-`) | the `/products` page replaces the URL in the browser (`legacy-category-redirect.tsx`) | 200 + JS |
| `https://ahanassa.com/` | `https://www.ahanassa.com/` | Cloudflare zone (apex, `server: cloudflare`) | 308 |
| `http://ahanassa.com/`, `http://www.ahanassa.com/` | `https://www.ahanassa.com/` | Cloudflare Always Use HTTPS + apex rule | 301 (→ 308) → 200 |

### Why 308 and not 301

The rules already live use 308. `01-sources/REDIRECTS.md` prefers 308 for permanent redirects, and Google treats 301 and 308 the same way (permanent, ranking signals pass). The checker accepts both. Changing working permanent redirects to 301 would gain nothing, so they are not changed.

### Why `?category=` has no server redirect

Workers Static Assets `_redirects` cannot match a query string. robots.txt already has `Disallow: /*?`, so Googlebot does not crawl those URLs at all. A server 301 would never be seen, and the browser replace is enough for bookmarks.

A Cloudflare Single Redirect rule could do it if ever wanted. The values are mixed-case codes, so it needs `lower()` + `regex_replace()`, which is a paid-plan feature.

## 3. New this PR: the catalog's slug-change register is now served

- **Before:** the snapshot's `route_redirects` table was not used by the static build. That is the table a product slug change writes a 308 into (`docs/CATALOG_PUBLIC_ROUTES.md` §18). The SSR Worker resolved it per request. On the static site, a renamed product's old URL would have answered **404** as soon as the old page left the build.
- **Now:** `lib/static/static-rules.ts#routeRedirectRules` writes every 308/302 row into `_redirects`, in the row's locale (`scripts/static/build.ts`). 410 rows have no static form, so the 404 page answers, as §18 documents. Unsafe or self-referencing rows are skipped.
- **Limits:** the table is empty today. Cloudflare allows 2,000 static rules, far above any realistic count.

## 4. Before and after the legacy cleanup

1. **Before** retiring `ahanassa-production` or deleting legacy code, run:
   ```
   node scripts/seo/check-legacy-urls.ts --base https://www.ahanassa.com
   ```
   It must print `120/120`. It exits 1 on any failure.
2. **What the cleanup must NOT remove:**
   - the zone's apex → www rule and Always Use HTTPS;
   - the `_redirects` rules in `lib/static/static-rules.ts` (`LEGACY_PERMANENT_RULES`);
   - `components/products/legacy-category-redirect.tsx`.

   The SSR Worker itself serves no URL any more: www has been on the static Worker since 2026-10-05.
3. **After** the cleanup, run the same command again.
4. After a release, the offline form checks a built artifact:
   ```
   node scripts/seo/check-legacy-urls.ts --artifact .artifact/public-assets
   ```
