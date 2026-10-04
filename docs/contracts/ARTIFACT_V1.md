# artifact.v1 — the static-site build output

Built once, tested on staging, the **same bytes** promoted to production (architecture V1.1 §2.7, §7.1
step 6). Code twin: `lib/contracts/artifact-v1.ts`; gate: `lib/static/artifact-gate.ts`.

## Layout

```text
<artifact>/
  manifest.json              PRIVATE — every file of both parts, code_sha, snapshot_version, counts
  public-assets/             the ONLY directory deployed (assets-only Worker, no script)
    index.html, about.html, …, en.html, en/…, ar.html, ar/…   fa at the root, en/ar prefixed
    products/category/<segment>.html                          one per public category and locale
    404.html, en/404.html, ar/404.html                         per-locale not-found pages
    data/rfq-catalog.{fa,en,ar}.json                          rfq-catalog.v1 (no categoryLabel)
    manifest.public.json                                      artifact.public.v1
    robots.txt, sitemap.xml                                   from app/robots.ts, app/sitemap.ts
    _headers, _redirects, .assetsignore
    _next/static/…, images/…, brand/…, icon.jpg
  private-snapshot/          CI only — never served
    snapshot.json            the snapshot.v1 the build used
    rfq-variant-index.json   rfq_variant_index rows
    rfq-variant-index.sql    INSERTs for DB_PUBLIC
```

The artifact is not committed (`.artifact*/` is ignored).

## `manifest.json` (private)

| Field | Rule |
|---|---|
| `schema_version` | `"artifact.v1"` |
| `code_sha` | 40-hex commit the artifact was built from |
| `snapshot_version` | the snapshot's version |
| `environment` | `staging` \| `production` — build flags only (robots, `X-Robots-Tag`, Turnstile site key) |
| `generated_at` | ISO time of the build |
| `counts` | snapshot table counts, `rfq_catalog_<locale>`, `sitemap_urls`, `rfq_variant_index_rows`; pipeline builds add the gated source counts (`variants_active`, `templates_active`, `categories_<locale>`, `processing_groups_<locale>`, `published_templates_<locale>`, …) |
| `pipeline` | optional (W4, content-pipeline builds only): `content_sha256`, source kind, `fetched_at`, Odoo request count/duration, `previous_active_version`, `decrease_threshold`, **`allow_decrease`** and the `overridden_decreases`, GitHub run id/url/ref/event |
| `public_assets[]`, `private_snapshot[]` | `{path, bytes, sha256}` for **every** file, relative to its part |

## `manifest.public.json` (public)

`{"schema_version": "artifact.public.v1", "snapshot_version", "generated_at", "locales"}` — strict; no
commit SHA, counts or file list. `generated_at` is the snapshot's own `created_at` (W4), so the same snapshot
always yields the same bytes.

## `data/rfq-catalog.<locale>.json` (public)

`{"schema_version": "rfq-catalog.v1", "snapshot_version", "locale", "items": [{variantXid, templateXid, sku, variantSpecLabel, productLabel, templateSlug, categoryCode, groupCode, publicCategoryCode, publicCategoryLabel}]}`
— strict; `categoryLabel` (Persian Product Master family) is server-only and forbidden (A6).

## Checksum rules

SHA-256 of the raw bytes. The manifest must list exactly the files on disk (nothing missing, nothing
extra), with matching `bytes` and `sha256`. Production deploys only an artifact whose
`manifest.json` checksums match the staging-tested one (promotion, not rebuild).

## Gate (`runArtifactGate`) — a deploy is refused unless it returns no failures

1. `public-assets/`, `private-snapshot/`, `manifest.json` exist; the manifest validates and matches disk.
2. **No private-snapshot file and no `.sql` in `public-assets/`** — also no `.rsc`, no `.vite/`, no
   `manifest.json`, no file byte-identical to a private file.
3. Required public files present; `manifest.public.json` and every `rfq-catalog` JSON validate and carry
   the manifest's `snapshot_version`.
4. Every `canonical`/`alternate` link points at `https://www.ahanassa.com` (staging never self-canonical);
   the **indexing gate** (W5, owner decision D6, `docs/INDEXING_POLICY.md`): staging `_headers` sends
   `X-Robots-Tag: noindex, nofollow` on `/*` and `robots.txt` is disallow-all; production sends `noindex` only on
   the data paths, its `robots.txt` is exactly the policy's, every page but the 404s is `index, follow` with a
   self canonical and hreflang, and the sitemap lists exactly those pages with lastmod and reciprocal alternates.
5. Leak scan (`lib/static/leak-scan.ts`): no forbidden commercial field (cost, supplier, margin, stock,
   purchase price, …) as a JSON key; no server-only field in public JSON; no e-mail/phone other than the
   company's; no Persian on en/ar pages or en/ar JSON outside the explicit allowlist (brand name,
   tagline, language labels, address, trilingual 404 line — each tied to its source file by a test).
6. Publication gate (`lib/static/publication-gate.ts`, W4): only the known public JSON files exist and
   every key in them is on that file's allowlist (from the strict contracts); JSON-LD uses only the
   allowed types/properties (Organization, WebSite, BreadcrumbList, `Product` **without** offers/price);
   no DB_PUBLIC row id (from `private-snapshot/snapshot.json`) and no legacy Odoo XID anywhere in public
   text; no rendered `null`/`undefined`/`NaN`/`[object Object]` (empty Odoo fields are not rendered, §8.2).

`.assetsignore` additionally excludes `.vite/`, `*.rsc`, `*.sql`, `private-snapshot/`, `manifest.json`
at upload time (defence in depth).

## Build

```bash
npm run build:static -- --snapshot <snapshot.v1.json> --target staging|production [--out .artifact]
npm run static:gate -- <artifactDir>
npm run static:hydration -- <artifactDir>/public-assets [--all]
```

**Determinism (W4).** The vinext build id and deployment id are pinned to `static-<code sha 12>`
(`scripts/static/next.config.static.ts`); vinext's default is a random UUID per build, which changed every
chunk name and therefore every HTML file. With the pin, the same code + the same snapshot content give
byte-identical `public-assets/` except the version stamp in `manifest.public.json` and
`data/rfq-catalog.<locale>.json` (`scripts/content/compare-artifacts.ts`).
