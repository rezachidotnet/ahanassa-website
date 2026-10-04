# Indexing policy (owner decision D6, 2026-10-04)

**All public pages are indexable by Google in production.** Only the **production build target** changes;
staging stays noindex (`X-Robots-Tag: noindex, nofollow`, disallow-all `robots.txt`) and its build output is
byte-for-byte what it was before D6. Code: `lib/seo/indexing-policy.ts` (the policy),
`app/robots.ts`, `app/sitemap.ts`, `lib/static/static-rules.ts` (`_headers`, sitemap XML),
`lib/static/indexing-gate.ts` (the gate). Decision record: `docs/OWNER_DECISIONS.md`.

## Indexable — `index, follow`, fa (root) / en / ar

Every page carries a self canonical on `https://www.ahanassa.com` and reciprocal hreflang (fa, en, ar,
x-default → fa). Product pages advertise only the locales that have a published page, each with its own slug.

| Page | URL (fa; en/ar under `/en`, `/ar`) |
|---|---|
| Home | `/` |
| Products | `/products` |
| Category listing (each public Odoo category) | `/products/category/<segment>` |
| Product detail (each published template) | `/products/<slug>` |
| Services (processing) | `/services` |
| About | `/about` |
| Industries | `/industries` |
| Markets | `/markets` |
| Contact (RFQ form) | `/contact` |
| Articles | once they exist (architecture §11; behind a flag today) — add them to `STATIC_PUBLIC_PATHS`/the sitemap then |

## Not indexable — technical reasons only

| What | How | Why |
|---|---|---|
| 404 pages (`/404.html`, `/en/404.html`, `/ar/404.html`) | HTTP 404 + `<meta name="robots" content="noindex, nofollow">` | an error response is not content |
| Thank-you / confirmation pages | none exist: the RFQ confirmation is in-page state on `/contact`, with no URL | a confirmation is per-visitor state; it would be a thin duplicate of `/contact` |
| URLs with query parameters (`?variant=`, legacy `?category=`, filters, sort, `utm_*`) | `robots.txt` `Disallow: /*?`; every page's canonical is the clean URL | parameters only select state on an existing page (`docs/discoverability/FACETED_NAVIGATION_URL_POLICY.md`); crawling them wastes crawl budget and creates duplicates |
| Preview / build-only routes (`/static-404`) | removed from the artifact by the build; `Disallow: /static-404` | never served; disallowed in case one is ever linked |
| Data files (`/data/*.json`, `/manifest.public.json`) | `X-Robots-Tag: noindex` header — **not** robots-disallowed | machine data for the `/contact` form, not pages; Google must still fetch them to render `/contact` |
| `/api/` | `Disallow: /api/` | the RFQ API is on `api.ahanassa.com`; kept from the previous production robots policy |

## Production files

`robots.txt`:

```text
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /static-404
Disallow: /*?

Sitemap: https://www.ahanassa.com/sitemap.xml
```

`sitemap.xml`: every indexable URL of all three locales, each `<url>` with `<lastmod>` and one
`<xhtml:link rel="alternate" hreflang=…>` per alternate (the same set the page itself declares).
`lastmod` comes from the snapshot: a product page's own Odoo/editorial `updated_at`; every other page the
newest of those (the snapshot's content date) — the same snapshot always yields the same sitemap.

`_headers`: no `X-Robots-Tag` on `/*`; `X-Robots-Tag: noindex` only on `/data/*` and `/manifest.public.json`.

With the 2026-10-01 fixture snapshot the production build has **90 indexable pages** (30 per locale: 7 static
pages + 7 categories + 16 products), 3 noindex 404 pages, and 90 sitemap URLs with 360 hreflang links.

## Gate

`runArtifactGate` (every build, and again before every deploy) runs `checkIndexingPolicy`:

- **staging** — `/*` must send `X-Robots-Tag: noindex, nofollow`; `robots.txt` must be exactly disallow-all.
  A staging artifact can never be indexable.
- **production** — no `X-Robots-Tag` outside the data paths, which must carry it; `robots.txt` exactly as
  above; every page except the 404s `index, follow` with a self canonical and hreflang incl. x-default;
  404s noindex; the sitemap lists exactly the indexable pages, no query URLs, each with a valid lastmod and
  the page's own alternates, reciprocal.

Tests: `lib/static/indexing-gate.test.ts`, `lib/static/static-site.test.ts`.

## Thin-content report (report only)

`lib/content-pipeline/thin-content.ts`, run in the pipeline's checks step (job summary) and by
`node scripts/content/thin-content.ts --snapshot <file>`: the published product templates whose Odoo data
lacks grade or standard, or whose page has no description. It never blocks a publication; it shows the owner
what Google will index (input for Odoo O-5). The Odoo Public Catalog API v1 has no description field, so the
Odoo description is missing for every product until Odoo adds one.
