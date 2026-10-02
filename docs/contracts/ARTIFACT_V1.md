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
| `generated_at` | ISO time |
| `counts` | snapshot table counts, `rfq_catalog_<locale>`, `sitemap_urls`, `rfq_variant_index_rows` |
| `public_assets[]`, `private_snapshot[]` | `{path, bytes, sha256}` for **every** file, relative to its part |

## `manifest.public.json` (public)

`{"schema_version": "artifact.public.v1", "snapshot_version", "generated_at", "locales"}` — strict; no
commit SHA, counts or file list.

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
   staging `_headers` sends `X-Robots-Tag: noindex, nofollow`; production never sends `noindex`.
5. Leak scan (`lib/static/leak-scan.ts`): no forbidden commercial field (cost, supplier, margin, stock,
   purchase price, …) as a JSON key; no server-only field in public JSON; no e-mail/phone other than the
   company's; no Persian on en/ar pages or en/ar JSON outside the explicit allowlist (brand name,
   tagline, language labels, address, trilingual 404 line — each tied to its source file by a test).

`.assetsignore` additionally excludes `.vite/`, `*.rsc`, `*.sql`, `private-snapshot/`, `manifest.json`
at upload time (defence in depth).

## Build

```bash
npm run build:static -- --snapshot <snapshot.v1.json> --target staging|production [--out .artifact]
npm run static:gate -- <artifactDir>
npm run static:hydration -- <artifactDir>/public-assets [--all]
```
