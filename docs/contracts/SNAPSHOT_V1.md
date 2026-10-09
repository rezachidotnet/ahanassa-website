# snapshot.v1 — build-time public data

One immutable JSON file per publication (architecture V1.1 §5.1, §7.1). It feeds the static export,
the DB_PUBLIC load and the RFQ Worker's `rfq_variant_index`. Code twin: `lib/contracts/snapshot-v1.ts`
(zod, strict); I/O and versioning: `lib/static/snapshot-io.ts`.

## Document

```json
{
  "schema_version": "snapshot.v1",
  "snapshot_version": "snap-e55d81c754270c1f",
  "created_at": "2026-10-01T22:13:01.000Z",
  "source": { "kind": "odoo_full_fetch | d1_export", "description": "…", "fetched_at": "…" },
  "tables": {
    "catalog_public_categories": [ … ],
    "catalog_products": [ … ],
    "product_variants": [ … ],
    "product_seo_contents": [ … ],
    "public_processing_groups": [ … ],
    "route_redirects": [ … ],
    "homepage_product_rank": [ … ],
    "catalog_group_labels": [ … ],
    "published_prices": [ … ]
  }
}
```

- **Rows mirror DB_PUBLIC column for column** (migrations_public 0001–0011), so the build loads them
  into the real schema and the unchanged repository SQL renders the pages. Strict: an unknown column
  (e.g. `cost_price`) fails validation.
- **Required tables:** categories (fa/en/ar), products (templates), variants, SEO rows, processing groups.
  Optional (default `[]`): route redirects, homepage rank, group labels. Sync-state/lease tables are
  internal and never in a snapshot.
- **Integrity:** every variant's `product_id` and every product SEO row's `entity_id` must exist.
- **Content hash** = SHA-256 over the canonical tables JSON (tables in the order above, keys sorted, rows
  sorted by their JSON text).
- **`snapshot_version`**, two forms (both match `snap-<16 hex>`, so `rfq_submit.v1`, the RFQ Worker and the
  `publication_state` CHECK are unchanged):
  - **pipeline (W4)**: assigned and **monotonic**, `snap-YYYYMMDDHHMMSSnn` (UTC publish time + sequence,
    decimal digits only; `lib/content-pipeline/version.ts`), always newer than every pipeline version in
    `publication_state`; the document carries `content_sha256` (the full content hash) and is rejected if
    it does not match its content. `created_at` = the time the version encodes.
  - **legacy (W1 fixture)**: no `content_sha256`; the version is `snap-` + the first 16 hex of the content
    hash and must match it.
- **Counts** (`snapshotCounts`) go into the artifact manifest; the abnormal-drop gate (§7.1 step 2,
  > 20 % [parameter]) compares them with the previous active snapshot (pipeline task, not W1).
- No PII; only Odoo-published public data. A snapshot lives in `private-snapshot/` (CI only), never in
  Static Assets.

Row types (abridged; full in code):

| Table | Key columns |
|---|---|
| `catalog_public_categories` | `code` (`[A-Z0-9_]`), `locale`, `name`, `position`, `sequence`, `group_codes_json`, `template_count`, `variant_count`, `synced_at` |
| `catalog_products` | `id`, `template_xid` (CTMPL), `commercial_template_name`, `name_fa`, `slug_fa`, `is_active`, `is_public`, … |
| `product_variants` | `id`, `product_id`, `xid` (CVAR), `sku`, sizes, family/group/form/grade/standard codes and names, `dimensions_json`, `nominal_weight_json`, `allowed_commercial_units`, flags, … |
| `product_seo_contents` | `entity_type`, `entity_id`, `locale`, `slug`, `h1`, `intro`, `seo_title`, `seo_description`, `index_status`, `content_quality_status`, `published_at`, … |
| `public_processing_groups` | `code`, `locale`, `name`, `sequence`, `is_active`, … |
| `published_articles` (W11.1) | exactly: `locale`, `slug`, `title`, `description`, `date`, `updated`, `category`, `tags_json`, `related_products_json`, `faq_json`, `sources_json`, `author`, `translations_json`, `body_md`, `cover_svg` — see below |
| `published_price_history` (W9.6) | exactly: `canonical_variant_id`, `day`, `price_irr_per_kg`, `published_at` — see below |
| `published_prices` (W9.4) | exactly: `canonical_variant_id`, `price_irr_per_kg`, `vat_included`, `factory_name_fa`, `location_fa`, `published_at`, `previous_price_irr_per_kg`, `previous_published_at` — see below |

## `published_prices` (W9.4, extension)

Owner decisions D-PRICE-DISPLAY / D-PRICE-AGE (`docs/OWNER_DECISIONS.md`, 2026-10-07/08). Code:
`lib/contracts/snapshot-prices.ts` (row), `lib/content-pipeline/pricing.ts` (allow-list + validation).

- **Source:** Odoo `GET /api/v1/pricing/current` in the same CI fetch as the catalog (GET only, the
  guarded fetch's allowed prefix `/api/v1/pricing/`). W9.6: `/api/v1/pricing/history?days=30` is now fetched
  too, into `published_price_history` (below).
- **Allow-list:** a row holds **only the fields the Persian product page renders** — one row per variant
  with a numeric price. Every other documented API field (factory code, en/ar names, `basis_note`,
  `unit`, `currency`, `sku`, …) is read for validation and dropped. **Any undocumented field anywhere in
  the response is ignored** (owner decision 2026-10-09): never stored, never rendered, listed as a warning
  in the run summary; it never stops a publish. The pricing API never exposes where a price came from,
  and the snapshot has no field that could hold it.
- **Validation of the known fields:** positive integer IRR/kg within sanity bounds (10 000 – 100 000 000
  [parameter]); the variant is an active catalog variant of the same fetch, with matching template id and
  SKU; no duplicates; `factory.name.fa` and `location.fa` present; `vat_included` true, kg, IRR;
  `published_at_utc` ISO UTC, not before 2026 and not in the future (10 min skew); a previous price is
  older than the current one; `meta.total` and `meta.updated_at_utc` consistent. Price-on-request rows
  are counted (`prices_on_request`), not stored.
- **When the set cannot be used** (any known field missing or invalid, HTTP 404, any other fetch failure,
  a non-JSON body): the run **fails only when the live site already shows prices** (the active
  publication's `prices_published` > 0), so prices never silently vanish. Otherwise it builds with an
  **empty price set** and the catalog publishes normally. Either way the validate step writes one
  **Prices:** line in the run summary (`published` / `EMPTY PRICE SET: <why>` / `BLOCKED: <why>`) and a
  run annotation for an empty set or ignored fields (owner decision 2026-10-09).
- **Build-only:** loaded into the static build's in-memory DB_PUBLIC only. It is **not** a
  `migrations_public` table, the pipeline never mirrors it, and `scripts/static/snapshot-load-sql.ts`
  skips it. Prices are rendered into the static HTML at build time; no `/data` file carries them.
- **Hash compatibility:** an empty `published_prices` is left out of the canonical tables JSON, so
  every snapshot made before W9.4 keeps its content hash and version.
- **Rendering and gates** (owner decision change 2026-10-09, D-W94-4): **fa** — PriceBlock + «قیمت روز»
  column (amount, factory, location, date); **ar** — price only: «سعر اليوم» column (amount + date label +
  VAT note), no factory/location/timestamp; **en** — nothing. The column follows the size column and is
  hidden when none of the page's variants has a price (the fa PriceBlock then shows «استعلام قیمت» + the
  RFQ CTA). The weight calculator gets a build-time price map (fa `{tomanPerKg, datetime, dateLabel, factory}` — `factory` since W9.6, for the RFQ prefill —, ar
  `{tomanPerKg, dateLabel}`, en none) for its cost estimate. The
  artifact gate's price gate (`lib/static/price-gate.ts`) checks that the rendered price text is exactly
  these fields per locale, that ar files carry none of the fa-only fields, that en files carry no price, and
  that every calculator price-map entry equals the snapshot; the leak scan refuses pricing-API field names,
  source-like keys and factory codes in every public file (`tomanPerKg` is allowed only on the fa/ar
  calculator page). No JSON-LD `offers`.

## `published_price_history` (W9.6, extension)

Owner-approved 2026-10-09 (W9.6: price page, ▲/▼, 30-day chart). Code: `lib/contracts/snapshot-prices.ts` (row),
`lib/content-pipeline/pricing-history.ts` (allow-list + validation), `lib/pricing/price-history.ts` (chart rules).

- **Source:** Odoo `GET /api/v1/pricing/history?days=30`, in the same CI fetch as `/current` (GET only).
- **Rows:** one per (priced variant, Tehran calendar day): the day's last numeric point = the price in effect
  at the end of that day, including `price_at_window_start`. Only variants with a `published_prices` row; a
  variant's newest point must be its current price (else that variant gets no history). Factory, location
  and every other field are read for validation only; unknown keys are ignored and reported.
- **Never blocks a publish:** a failed fetch, a 404 or an invalid body gives an empty history and one warning
  (the run summary line **Price history (30-day chart)**); the chart is then not drawn.
- **Rendering:** the fa product page draws a chart only with ≥ 7 daily points in the 30 days ending on the
  current price's day; the publication gate re-counts them (`lib/static/price-gate.ts`). ▲/▼ uses
  `published_prices.previous_*` only when it is from an earlier Tehran day.
- **Build-only**, exactly like `published_prices`: no `migrations_public` table, never mirrored or loaded into D1.

## `published_articles` (W11.1, extension)

Owner-approved 2026-10-09 (W11.1: articles section). Code: `lib/contracts/snapshot-articles.ts` (row),
`lib/content-pipeline/articles-source.ts` (fetch), `lib/articles/validate.ts` + `lib/content-pipeline/articles.ts`
(checks, fail-safe). Full description: `docs/ARTICLES.md`.

- **Source:** the PRIVATE content repository's `main` (`articles/**.md`, `assets/articles/**.svg` only; sparse,
  blob-filtered clone — no other file of that repository is ever downloaded).
- **Rows:** one per (locale, slug) article that passed the website's checks. Only rendered fields; the
  content repository's `topic_reason` and `reviewed_by` are dropped. `category` is the code
  (`buying-guide`, `standards`, `market-analysis`, `application`, `construction-technology`), not the Persian
  label the source stores. `translations_json` keeps only pairs that both publish and point at each other
  (the snapshot schema re-checks that).
- **Fail-safe:** an unconfigured or failed fetch builds without articles (warning) unless the active
  publication shows articles (`articles_fa/ar/en` counts) — then the run is blocked. A refused article is
  left out (warning); the article decrease gate (threshold 0) blocks if that removes a live article.
- **Build-only**, exactly like `published_prices`: no `migrations_public` table, never mirrored or loaded into
  D1. `cover_svg` is rasterized to PNG/WebP at build time; the SVG itself is never published.

## `rfq_variant_index` row (architecture §5.1, A8)

| Column | Type |
|---|---|
| `snapshot_version` | `snap-<16 hex>` |
| `locale` | `fa` \| `en` \| `ar` |
| `canonical_variant_id` | CVAR id |
| `template_id` | CTMPL id |
| `group_code` | nullable |
| `allowed_units` | launch UoM codes for the group (`lib/rfq/uom-policy.ts`) |
| `selection_json` | the server-side `RfqCatalogSelection` in that locale (includes `categoryLabel`; never public) |

Primary key `(snapshot_version, locale, canonical_variant_id)`. The RFQ Worker reads it with **one**
query per submission (DB_PUBLIC, read-only binding). The static build writes the rows to
`private-snapshot/rfq-variant-index.{json,sql}`.

## Sources

- Production: Odoo full fetch in CI (`/api/v1/catalog/{meta,categories,products}`, `/api/v1/processing/groups`)
  merged with the Website-owned editorial layer read from DB_PUBLIC — `scripts/content/*`,
  `docs/CONTENT_PUBLICATION_PIPELINE.md` (W4).
- Fixture/dev: `node scripts/static/snapshot-from-d1-export.ts <export.sql> <out.json> "<description>"`
  from a read-only `wrangler d1 export`. Committed fixture:
  `fixtures/snapshot/staging-2026-10-01.snapshot.json` (`snap-e55d81c754270c1f`; staging DB_PUBLIC
  export 2026-10-01T22:13Z; 21 category rows, 16 products, 256 variants, 48 SEO rows, 9 processing groups).
