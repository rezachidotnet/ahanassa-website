# Catalog Odoo → D1 Provenance Audit (CAT-PROV-P0)

Date: 2026-09-14
Task type: strictly read-only provenance audit. No website code change, no Odoo write, no D1 write, no deploy, no migration.

---

# RESULT

**A — PROVENANCE VERIFIED — ODOO AND DB_PUBLIC MATCH.**

Live, direct, read-only queries against the real Odoo Public Catalog API v1 (`https://odoo.ahanassa.com/api/v1/catalog/products`, `auth=public`, no credential used or required) were compared field-by-field against live staging `DB_PUBLIC`. For all 3 audited products: **identity counts match exactly (29/11/22), zero missing rows, zero extra rows, and zero field-level mismatches across every checked field on every one of the 62 matched variants** (348 field comparisons per product-set, 744 total). Every numeric range independently reconstructed from live Odoo matches both DB_PUBLIC and the FA editorial content exactly. No seed/fixture/manual-entry mechanism was found for `catalog_products`/`product_variants` data — the only committed fixture files found (`scripts/pilot/*.json`) are editorial **content** batches (h1/slug/intro/SEO text for `product_seo_contents`), not catalog/variant data, and the repository's own documentation records that even that content's numbers were read directly from already-synced DB_PUBLIC, not invented.

---

# ODOO READ METHOD

**ODOO DIRECTLY QUERIED: YES.** Read-only HTTP `GET` requests against the Odoo Public Catalog API v1, the project's existing, documented, already-approved integration boundary (`lib/catalog/odoo-api-client.ts`, `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`) — **`auth=public`**, no credential sent or required, verified directly:

```
GET https://odoo.ahanassa.com/api/v1/catalog/meta                                         → HTTP 200
GET https://odoo.ahanassa.com/api/v1/catalog/products?group=SHS&pageSize=100&locale=fa      → HTTP 200 (29 rows, 1 page)
GET https://odoo.ahanassa.com/api/v1/catalog/products?group=REBAR&pageSize=100&locale=fa     → HTTP 200 (45 rows, 1 page, 4 templates)
GET https://odoo.ahanassa.com/api/v1/catalog/products?group=SHEET_PLATE&pageSize=100&page=1&locale=fa → HTTP 200 (50 rows, page 1 of 2)
GET https://odoo.ahanassa.com/api/v1/catalog/products?group=SHEET_PLATE&pageSize=100&page=2&locale=fa → HTTP 200 (24 rows, page 2 of 2)
```

No `create`/`write`/`unlink` call was ever made. No generic Odoo ORM/RPC transport (`lib/odoo/client.ts`, the RFQ path's JSON-2 transport) was touched — this audit used only the same dedicated, documented, read-only Catalog API the website's own sync code uses.

**Aside, not a provenance concern:** the API rejected a `?grade=` query parameter (`HTTP 400 invalid_parameter — Invalid field ...grade in condition`) even though the client's own TypeScript interface (`CatalogListParams.grade`) declares it as supported. This is a pre-existing, minor client/live-API contract gap (the client also silently caps `pageSize` at 50 regardless of the requested value) — worked around here by filtering client-side on `group` + `template_id`, and by paging. Neither affects the completeness of the data retrieved (every row was still enumerated across the required pages).

---

# SYNC IMPLEMENTATION CONTRACT

Read from implementation, not comments alone:

| Field | Odoo API source | DB_PUBLIC target | Transformation |
|---|---|---|---|
| `template_xid` | `template_id` | `catalog_products.template_xid` | Direct copy (`lib/catalog/sync-sql.ts`) |
| `variant_xid` | `id` | `product_variants.xid` | Direct copy |
| `sku` | `sku` | `product_variants.sku` | Direct copy |
| `commercial_size` | `commercial_size` | `product_variants.commercial_size` | Direct copy |
| `dimensions_json` | `dimensions` (object) | `product_variants.dimensions_json` | `JSON.stringify(dimensions)` — no key renaming, no unit conversion |
| `standard_code`/`standard_name` | `standard.code`/`standard.name` | same-named columns | Direct copy via `classificationLiterals()` |
| `grade_code`/`grade_name` | `grade.code`/`grade.name` | same-named columns | Direct copy via `classificationLiterals()` |
| `group_code`/`group_name` | `classification.group.code`/`.name` | same-named columns | Direct copy |
| `family_code`/`family_name` | `classification.family.code`/`.name` | same-named columns | Direct copy |
| `is_active` | `active` (boolean) | `product_variants.is_active` | **Not a literal copy** — every variant returned by a sync pull is written `isActive: true`; a previously-known variant no longer present in a full pull is separately deactivated (`lib/catalog/sync.ts` — presence-based, not a field passthrough). In every row observed in this audit, Odoo's own `active` was `true` for 100% of returned rows (the API itself only returns active variants), so this transformation produced an identical result to a literal copy in every case checked — a real, explicitly-implemented mechanism, not a discrepancy. |

Sync entry point: `lib/catalog/sync-runner.ts` → `lib/catalog/odoo-api-client.ts#fetchCatalogProductsPage` (pages through the full catalog, 100/page requested) → groups by `template_id` client-side (the list endpoint has no per-template filter) → `lib/catalog/repository.ts#createVariant`/`ensureCatalogProduct` (Worker cron path) or `lib/catalog/sync-sql.ts` (the operator CLI's raw-SQL mirror of the identical mapping, used by `scripts/catalog-editorial.ts`/`catalog-sync.ts` outside the Workers runtime). Both write paths implement the identical field mapping — confirmed by reading both files.

---

# PRODUCT 1 — SHS

**Identity:** `ahanassa_marketplace.product_tmpl_pf_shs`. Verdict: **A — PROVEN ODOO PROJECTION.**

- Odoo (`group=SHS`): 29 variants, all `template_id = ...product_tmpl_pf_shs` (no other template shares this group).
- DB_PUBLIC: 29 rows for `product_id = 01M19CWBRW88XJTEKC3S6M2J57`.
- 29/29 matched by `xid`. 0 missing, 0 extra.
- Field comparison (`sku`, `commercial_size`, `dimensions_json`, `standard_code`/`name`, `grade_code`/`name`, `group_code`/`name`, `family_code`/`name`, `is_active`): **0 mismatches** across all 29 variants.
- `grade_code`/`grade_name` = `null`/`null` on both sides for every row — SHS genuinely has no grade in the Product Master (confirmed on both the Odoo response and D1, and independently corroborated by `docs/CATALOG_EDITORIAL_OPERATIONS.md` §12's own note: "no grade in the Product Master (`grade_code = null`)").
- `standard_code`/`standard_name` = `EN10219-2` / "EN 10219-2 — Cold formed welded structural hollow sections; tolerances, dimensions and sectional properties" — identical on both sides, every row.
- Sample live record (`ahanassa_marketplace.product_pf_shs_s100x100x4_l6`): `sku="AA-PF-SHS-S100X100X4-L6"`, `dimensions={width_mm:100,height_mm:100,thickness_mm:4,length_mm:6000}`, `updated_at="2026-09-13 10:11:20"` (i.e. updated in Odoo the day before this audit — genuinely live, not a frozen historical fixture).

---

# PRODUCT 2 — AJ340

**Identity:** `ahanassa_marketplace.product_tmpl_rb_aj340`. Verdict: **A — PROVEN ODOO PROJECTION.**

- Odoo (`group=REBAR`, 45 total across 4 templates — `rb_aj340`, `rb_aj400`, `rb_aj500`, `rb_s240`): 11 variants for `product_tmpl_rb_aj340`.
- DB_PUBLIC: 11 rows for `product_id = 01M19CWBRWP4V1FAGPPWNKKFCR`.
- 11/11 matched by `xid`. 0 missing, 0 extra.
- Field comparison: **0 mismatches** across all 11 variants.
- `grade_code`/`grade_name` = `AJ340` / "Aj340 (market A2)" on both sides, every row — this is the **direct Odoo source** of the "market equivalent A2" phrasing already used in the FA/EN/AR editorial drafts; not an invented equivalence.
- `standard_code`/`standard_name` = `INSO3132` / "INSO 3132 — Hot-rolled steel bars for reinforcement of concrete" on both sides, every row.
- All 11 variants: `dimensions.length_mm = 12000` (12 m) on both sides, no exception.

---

# PRODUCT 3 — S355JR

**Identity:** `ahanassa_marketplace.product_tmpl_sh_hr_s355jr_plate`. Verdict: **A — PROVEN ODOO PROJECTION.**

- Odoo (`group=SHEET_PLATE`, 74 total across 4 templates, 2 pages — `sh_hr_s235jr_plate`, `sh_hr_s235jr_sheet`, `sh_hr_s355jr_plate`, `sh_hr_s355jr_sheet`): 22 variants for `product_tmpl_sh_hr_s355jr_plate` (10 on page 1 + 12 on page 2).
- DB_PUBLIC: 22 rows for `product_id = 01M19CWBRWVJZCCBD5SA22VDCM`.
- 22/22 matched by `xid`. 0 missing, 0 extra.
- Field comparison: **0 mismatches** across all 22 variants.
- `grade_code`/`grade_name` = `S355JR` / "S355JR" on both sides, every row.
- `standard_code`/`standard_name` = `EN10029` / "EN 10029 — Hot-rolled steel plates 3 mm thick or above; tolerances on dimensions and shape" on both sides, every row.

---

# IDENTITY COUNTS

| Product | Odoo variants | D1 variants | Matched | Missing in D1 | Extra in D1 |
|---|---|---|---|---|---|
| SHS | 29 | 29 | 29 | 0 | 0 |
| AJ340 | 11 | 11 | 11 | 0 | 0 |
| S355JR | 22 | 22 | 22 | 0 | 0 |
| **Total** | **62** | **62** | **62** | **0** | **0** |

---

# FIELD LEVEL COMPARISON

Checked per matched variant, all 3 products, 62 variants total: `sku`, `commercial_size`, `dimensions_json` (full object, serialized), `standard_code`, `standard_name`, `grade_code`, `grade_name`, `group_code`, `group_name`, `family_code`, `family_name`, `is_active` (accounting for the presence-based transformation documented above) — **12 checks × 62 variants = 744 field comparisons, 0 mismatches.**

No mismatch was dismissed as "looks equivalent" — every comparison was an exact string/value equality check (or, for `dimensions_json`, an exact serialized-JSON equality check against `JSON.stringify` of the live Odoo `dimensions` object), computed programmatically, not eyeballed.

---

# ODOO RANGE (independently reconstructed from live Odoo, not from D1)

| Product | Dimension | Odoo min | Odoo max | Standard | Grade |
|---|---|---|---|---|---|
| SHS | width/height (mm) | 40 | 200 | EN10219-2 | (none) |
| SHS | thickness (mm) | 2.5 | 12 | | |
| AJ340 | diameter (mm) | 8 | 32 | INSO3132 | AJ340 (Aj340, market A2) |
| AJ340 | length (mm) | 12000 (single value, all 11 rows) | | | |
| S355JR | thickness (mm) | 8 | 60 | EN10029 | S355JR |
| S355JR | width (mm) | 1500 / 2000 (exactly 2 distinct values) | | | |

---

# DB_PUBLIC RANGE (independently reconstructed from staging D1)

Identical to the Odoo range above in every figure — re-derived separately from the D1 query result set (not copy-pasted from the Odoo table):

| Product | Dimension | D1 min | D1 max |
|---|---|---|---|
| SHS | width/height (mm) | 40 | 200 |
| SHS | thickness (mm) | 2.5 | 12 |
| AJ340 | diameter (mm) | 8 | 32 |
| AJ340 | length (mm) | 12000 | 12000 |
| S355JR | thickness (mm) | 8 | 60 |
| S355JR | width (mm) | 1500 / 2000 |

**Every range matches exactly** — and every range matches the FA editorial content's stated figures exactly, and the earlier `PS-L10N-P0.1` reconciliation's own findings, now confirmed against live Odoo directly rather than only against D1.

---

# SYNC METADATA

Read from `catalog_sync_state` (the one row, `id='catalog'`) and `catalog_products`, both live staging D1:

```text
last_attempted_at:          2026-08-31T04:42:13.573Z  (incremental)
last_success_at:            2026-08-31T04:42:15.679Z  (incremental)
last_incremental_watermark: 2026-08-30T10:04:12.000Z
last_full_reconciliation_at: 2026-08-31T04:41:28.036Z
last_full_upstream_count:    237
consecutive_failure_count:   0
```

`last_full_upstream_count = 237` matches this project's own previously-documented total live catalog size (13 templates / 237 variants, `docs/CATALOG_EDITORIAL_OPERATIONS.md` §11) — a real, plausible, non-placeholder figure, not an invented one.

`catalog_products` rows for all 3 audited templates: `last_synced_at = 2026-08-30T13:13:59.321Z` (identical across all 3 — consistent with a single real sync batch touching all three in one run) and `sync_status = 'synced'` on every row. `updated_at` differs slightly per template (17:43–17:44 the same day) — attributable to the later editorial-publication actions (`set-public`, etc.), not a second sync.

**No fabricated provenance metadata was found or invented** — these are the only provenance-relevant fields this schema actually stores (no separate hash/fingerprint field exists), and every one of them is populated with a specific, real, internally-consistent timestamp/count, not a placeholder (`NULL`, `0`, or a suspiciously round number).

---

# SEED / FIXTURE HISTORY

Searched the full repository (`.ts`/`.sql`, all commits reachable from current history) for the exact 3 template identities and for any raw `INSERT INTO catalog_products`/`INSERT INTO product_variants` outside the sync path:

- **`INSERT INTO catalog_products` / `INSERT INTO product_variants`** appear in exactly two files: `lib/catalog/repository.ts` (`createVariant`/`ensureCatalogProduct`, called only by `lib/catalog/sync-runner.ts` — the Worker's own cron sync path) and `lib/catalog/sync-sql.ts` (the operator CLI's raw-SQL mirror of the identical mapping, called only by `scripts/catalog-editorial.ts`/`catalog-sync.ts`). **No third, independent write path exists.**
- **`scripts/pilot/staging-launch-pilot.fa.json` and `production-launch.fa.json`** reference all 3 template identities — but these are **editorial content batches** (`{templateXid, locale, h1, slug, intro, seoTitle, seoDescription, bodyJson}`), applied via `node scripts/catalog-editorial.ts batch ... --env staging` against `product_seo_contents` only. This is a legitimate, documented, validated operation (the `batch` command resolves every `templateXid` against the real, already-synced database before applying anything — an unknown XID aborts the whole batch with zero writes, per `docs/CATALOG_EDITORIAL_OPERATIONS.md` §9). It never touches `catalog_products`/`product_variants`.
- **`docs/CATALOG_EDITORIAL_OPERATIONS.md` §12 states directly, in the repository's own words:** *"Content basis: every number/standard/grade in the pilot copy... was read directly from live DB_PUBLIC (`json_extract` min/max over `dimensions_json` for each template..."* — i.e., even the editorial content's authors sourced their numbers from the already-synced catalog data, not from an independently-invented figure.
- **`lib/content/catalog-sample.ts`** (this repository's one known, explicitly-flagged historical sample/fixture file, per `docs/CATALOG_PUBLIC_ROUTES.md`) was checked directly — **contains none of the 3 audited template/variant identities.** It remains used only by the Footer's category links and the RFQ form's free-text dropdown, unrelated to this catalog data.

**Conclusion: no evidence of manual seeding, pilot fixtures, or historical synthetic data in `catalog_products`/`product_variants` for any of the 3 audited products** — every technical row is attributable to the real sync path, and independently confirmed live against Odoo in this task.

---

# EXTRA D1 ROWS

**None.** 0 extra rows in DB_PUBLIC for any of the 3 products (see IDENTITY COUNTS).

---

# MISSING D1 ROWS

**None.** 0 Odoo variants absent from DB_PUBLIC for any of the 3 products.

---

# MISMATCHES

**None.** 0 field-level mismatches across 744 checked field comparisons (62 variants × 12 fields).

---

# PROVENANCE VERDICT

| Product | Verdict |
|---|---|
| SHS | **A — PROVEN ODOO PROJECTION** |
| AJ340 | **A — PROVEN ODOO PROJECTION** |
| S355JR | **A — PROVEN ODOO PROJECTION** |

---

# EDITORIAL PUBLICATION GATE

**Verdict A for all 3 products → technical facts may safely serve as authority for FA `product_seo_contents`, and for the EN/AR drafts prepared in `PS-L10N-P0`.** Every dimension, standard, and grade figure in the existing FA content and the EN/AR drafts is now proven, independently, directly against live Odoo — not merely against a D1 projection that could itself have been stale or hand-entered.

**Still recommended (carried forward from `PS-L10N-P0.1`, not re-litigated here):** replace the availability-flavored wording before publication, in all three locales — this is a wording-precision matter, not a factual one, and applies regardless of this audit's result:

- FA: `در فهرست کالایی آهن آسا قرار دارد` (replacing `...موجود است`)
- EN: `is listed in Ahan Asa's product catalog` (replacing `...is available in...`)
- AR: `مدرج ضمن قائمة منتجات آهن آسا` (replacing `...متوفر في...`)

**Nothing was published in this task.** Publication remains a separate, later, owner-approved action via the existing editorial CLI.

---

# WRITES PERFORMED

**NONE.** Every Odoo interaction was a plain `GET` against the public, unauthenticated Catalog API v1 (no `create`/`write`/`unlink`, no cron trigger, no sync run). Every D1 interaction was a plain read-only `SELECT` via `wrangler d1 execute DB_PUBLIC --env staging --remote` (no `--local` write-simulation, no INSERT/UPDATE/DELETE, no editorial CLI command run, `is_public` untouched).

---

# PRODUCTION SAFETY

No production resource (Odoo or Cloudflare) was read, written, or touched. No secret was requested, read, or revealed — the Catalog API used is `auth=public` by design, confirmed live, requiring no credential at all. No Worker was deployed. No migration was run. `main` was not touched.
