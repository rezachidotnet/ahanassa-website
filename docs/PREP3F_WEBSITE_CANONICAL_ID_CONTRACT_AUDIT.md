# Pre-P3F — Public Catalog Canonical ID Contract Audit

**Task type:** Read-only Website contract audit. No code, config, migration, or dependency changes were made.
**Scope:** Confirm whether the Website (this repository) is safe to consume the first Public Catalog products (19 upcoming Angle/Channel variants) whose Odoo payload is asserted to carry `id: null`, `template_id: null`, `canonical_id: "CVAR-..."`, `canonical_template_id: "CTMPL-..."`.
**Date:** 2026-09-18
**Branch at audit time:** `feat/header-hero-integrated` (working tree clean before and after this audit; only this new file was added)

---

## 0. Governing-document check and a premise discrepancy that must be resolved first

Per `CLAUDE.md` §3–§4, the mandatory reading order was followed: `PROJECT_OVERRIDES.md`, `CLAUDE.md`, `DOCS_INDEX.md`, `DOCUMENT_AUDIT_REPORT.md` (DAR-034/035/036/037/039), then the specialist documents the catalog/pricing row of `DOCS_INDEX.md` points to: `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`, `docs/integrations/odoo/catalog-v1/public_catalog_api_v1.openapi.yaml`, `docs/CATALOG_RFQ_INTEGRATION.md`, `docs/pricing/PRICE_P0_IDENTITY_FRESHNESS_GATE.md`, and the live implementation (`lib/catalog/*`, `migrations_public/0002_catalog_v1_contract.sql`, `migrations_public/0008_price_variant_identity_and_provider_policy.sql`).

**Finding (blocking to treat as fact, not blocking to the audit itself):** the `canonical_id` / `canonical_template_id` / `CVAR-…` / `CTMPL-…` naming scheme named in the task prompt does not appear anywhere in this repository's documentation, OpenAPI contract, database migrations, or code — not in `01-sources/`, not in `docs/`, not in `PROJECT_OVERRIDES.md`, not in `DOCUMENT_AUDIT_REPORT.md`, not in the Odoo Public Catalog API v1 markdown/OpenAPI/report artifacts, not in `lib/catalog/`, not in any migration. A repo-wide search for `canonical_id`, `CVAR-`, `CTMPL-`, `canonical_template_id`, and `P3F` returned zero matches outside stale `.claude/worktrees/*` copies of unrelated historical docs (none of which mention it either).

The one and only currently-documented, owner-frozen identity contract (`docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md` line 21, DAR-034, verified live 2026-08-30) states:

> "Identity is `product_variant_xid` exposed as `id`, with `template_id` and `sku`; no PostgreSQL IDs are returned."

I.e., in the **existing, live contract**, `id` already **is** the durable canonical string identity (e.g. `ahanassa_marketplace.product_pf_rhs_s80x40x3_l6`) — never a nullable legacy integer. There is no currently-documented reason `id`/`template_id` would ever legitimately be `null` under the existing contract; a variant that has no stable identity is not supposed to be exposed by this API at all.

**This must be read as an unresolved, unconfirmed premise, per `CLAUDE.md` §4 ("Do not invent business facts... Do not code from memory when a source document can answer the question") and §8 ("Never silently resolve a conflict in code... record the finding" in `DOCUMENT_AUDIT_REPORT.md`).** This audit does **not** treat "the backend will send `id:null`/`canonical_id:CVAR-...`" as verified ground truth — it treats it as a **hypothetical contract change** and answers two separate questions:

1. **As documented today**, is the Website's Catalog ingestion/consumption path safe? (Yes, because the documented contract never produces null identity.)
2. **If the hypothetical new payload shape actually ships** (as literally described in the task), what breaks, and what would need to change? (Answered in full below — this is where the real risk is.)

**Recommendation before any implementation work:** get the Odoo/backend team to either (a) confirm this is a real, imminent contract change and hand over an updated `PUBLIC_CATALOG_API_V1.md`/OpenAPI diff naming `canonical_id`/`canonical_template_id` explicitly, or (b) confirm `id`/`template_id` will in fact continue to be populated (i.e., "canonical" is just new vocabulary for the existing `xid` values, not a new nullable-legacy/non-nullable-canonical split). Until one of those is confirmed, this is a genuine unresolved conflict per `DOCUMENT_AUDIT_REPORT.md`'s convention and should be logged there before P3F proceeds.

---

## 1. Product identity usage — traced, not assumed

| Usage site | Field actually used | File |
|---|---|---|
| Odoo API client wire type | `id`, `template_id` (both `string`, non-null in the TS type) | `lib/catalog/odoo-api-client.ts` (`CatalogApiProduct`, lines 53–77) |
| Odoo API client runtime validator | `typeof p.id === "string" && typeof p.template_id === "string"` — **hard requirement** | `lib/catalog/odoo-api-client.ts` `isValidProduct` (lines 277–294) |
| Sync planning | `row.id` → `xid`, `row.template_id` → `templateXid`, keyed by `Map(existing.map(v => [v.xid, v]))` | `lib/catalog/sync.ts` (`planCatalogV1Sync`, lines 82–150) |
| D1 schema (DB_PUBLIC) | `product_variants.xid TEXT NOT NULL`, unique index; `catalog_products.template_xid TEXT NOT NULL`, unique index | `migrations_public/0002_catalog_v1_contract.sql` lines 112, 125, 137, 171 |
| DB_PUBLIC internal row id (**not** Odoo's `id`) | `catalog_products.id` / `product_variants.id` — a Website-generated primary key, distinct from Odoo's `xid`/`template_xid`, assigned at insert time (`lib/catalog/repository.ts`, `lib/catalog/sync-sql.ts`) | `lib/catalog/types.ts` (`CatalogProduct.id`, `ProductVariant.id` vs `.xid`) |
| Product listing / React key | `key={product.id}` — the **Website-internal** `catalog_products.id` (template-level row), never Odoo's raw `id`/`template_id` | `components/products/catalog-template-grid.tsx` line 30 |
| Product listing / link | `href={localizedPath(locale, "/products/" + seo.slug)}` — the **website-owned SEO slug** (`product_seo_contents.slug`), never an Odoo id | `components/products/catalog-template-grid.tsx` line 32 |
| Product detail route | Resolves by `slug` param via `getPublishedCatalogTemplateBySlug(locale, slug)` — never an Odoo id/xid in the URL at all | `app/[locale]/products/[slug]/page.tsx` lines 28–70 |
| RFQ preselection URL | `/{locale}/contact?variant=<product_variant_xid>` — the DB_PUBLIC `xid` column (equal to the API's current `id`) | `docs/CATALOG_RFQ_INTEGRATION.md`, `lib/rfq/catalog-preselection.ts` |
| RFQ persisted record | `variantRef: selection.variantXid`, `productRef: selection.templateXid` — both DB_PUBLIC-resolved server-side, never client-trusted | `lib/rfq/catalog-preselection.ts` lines 45–61, `lib/rfq/service.ts` |
| RFQ multi-item form wire field | Only `catalogVariantXid` (`product_variant_xid`) is transmitted for a Catalog row; category/product/variant selects are UI-only filter state | `docs/RFQ_MULTI_ITEM_FORM.md` §"only field actually sent" |
| Odoo RFQ intake wire payload | `product_variant_xid` (nullable only for genuine free-text lines), never a Supplier Offer ID or `product.product` integer | `docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md`, `RFQ_BACKEND_ARCHITECTURE.md` |
| Variant spec table display | `sku` shown as read-only "کد کالا" snapshot — **never used as relational identity** | `components/products/variant-spec-table.tsx` |
| Slug generation fallback | `slugifyFromSku(sku)` / `slugifyTemplateXid(templateXid)` — bootstrap-only, ASCII, never Odoo integer IDs, never ships as final SEO copy without review | `lib/catalog/sync.ts` lines 168–181 |
| Cache keys | HTTP `ETag`/`Last-Modified` conditional caching keyed by response body hash and Odoo's `catalog_updated_at`, not by `id` | `lib/catalog/odoo-api-client.ts` (`request()`), `PUBLIC_CATALOG_API_V1.md` §Caching |
| localStorage/sessionStorage | **None found** — no product identity is ever persisted client-side | repo-wide grep, `app/`, `components/`, `lib/` |
| Favorites / recently-viewed | **Not implemented** — no such feature exists in this codebase | repo-wide grep |
| Analytics/event payloads | **No product-identity analytics events found** in `app/`/`components/`/`lib/` | repo-wide grep |
| Category pages | Family/group/form are flat classification codes on each variant (no separate category master with its own Odoo id in this integration — `01-sources`/DAR-034 note) | `lib/catalog/types.ts` file header, `docs/catalog/PUBLIC_WEBSITE_CATEGORY_ARCHITECTURE_V1.md` |
| Canonical URLs | Built exclusively from `product_seo_contents.slug` per `(slug, locale)`, DB-unique-constrained; no `product_variant_xid`/integer ID ever appears in a slug | `docs/CATALOG_PUBLIC_ROUTES.md` line 77, DAR verified live |

**Conclusion for §1:** the Website's own public-facing surfaces (routes, React keys, links, RFQ persisted refs, canonical URLs) are already decoupled from any Odoo-issued identity string's *literal value* — they use either a Website-generated internal primary key or a Website-owned SEO slug. The one place that is **not** decoupled, and is the actual point of failure, is the **ingestion boundary** — the Odoo API client and sync planner, which read `row.id`/`row.template_id` directly and require them to be non-null strings before a variant is even allowed to exist in DB_PUBLIC at all.

---

## 2. API types

File: `lib/catalog/odoo-api-client.ts`

```ts
export interface CatalogApiProduct {
  id: string;            // product_variant_xid — required, non-null in the type
  template_id: string;   // template xid — required, non-null in the type
  sku: string;
  ...
}
```

- **Is `id` required?** Yes — typed as `string` (not `string | null`), and enforced at runtime by `isValidProduct` (`typeof p.id === "string"`).
- **Is `id` typed as string/non-null?** Yes, both statically (TS) and at runtime (structural validator).
- **Is `canonical_id` present?** No. `CatalogApiProduct` has no `canonical_id` field, and no code anywhere in the repository reads or writes a field by that name.
- **Is `canonical_id` required?** N/A — the field does not exist in this codebase.
- **Is `template_id` assumed non-null?** Yes — same treatment as `id` (`typeof p.template_id === "string"`).
- **Is `canonical_template_id` present?** No — same as `canonical_id`, does not exist anywhere in the repo.

Downstream, `lib/catalog/types.ts` mirrors the same non-null assumption: `ProductVariant.xid: string`, `ProductVariant.productId: string`, `CatalogProduct.templateXid: string` — none are nullable. `migrations_public/0002_catalog_v1_contract.sql` enforces the same at the D1 schema level (`xid TEXT NOT NULL`, `template_xid TEXT NOT NULL`, both with `UNIQUE` indexes).

**Exact files:** `lib/catalog/odoo-api-client.ts` (lines 53–77, 277–294), `lib/catalog/types.ts` (lines 66–128), `migrations_public/0002_catalog_v1_contract.sql` (lines 112, 125, 137, 171).

---

## 3. Product card

Component: `components/products/catalog-template-grid.tsx` (the real, live catalog listing grid — template granularity, per the hybrid SEO model in `docs/CATALOG_PUBLIC_ROUTES.md`).

```tsx
{templates.map(({ product, seo, eligibleVariantCount }) => (
  <li key={product.id}>
    <Link href={localizedPath(locale, `/products/${seo.slug}`)}>
```

- **React list key:** `product.id` — this is `CatalogProduct.id`, the **Website-generated DB_PUBLIC primary key** (assigned by the Website at first-sync insert time, per `lib/catalog/repository.ts`/`lib/catalog/sync-sql.ts`), **not** Odoo's raw `id`/`template_id`/any future `canonical_id`. It is always a real, non-null, unique string once a row exists.
- **Product link:** `seo.slug` (website-owned SEO slug from `product_seo_contents`), never an Odoo identifier.
- **Product identifier passed to child components:** the detail page receives only the URL `slug`; identity resolution happens server-side via `getPublishedCatalogTemplateBySlug`.

**No instance of `key={product.id}` (Odoo id), `href` built from a raw Odoo id, or a null-collidable fallback was found on the product card path.** `CANONICAL_ID_PRIMARY` in the sense the task means it ("is the stable identity used to build the card safe from null-collision") is **YES for the card's own rendering** — but only because the card operates one layer downstream of the actual risk. The card can never render a variant that never made it into DB_PUBLIC in the first place, and getting into DB_PUBLIC is exactly where the ingestion boundary (§1, §2, §6) currently hard-fails on a null Odoo `id`/`template_id`.

---

## 4. Product detail route

`app/[locale]/products/[slug]/page.tsx` resolves a product exclusively by the `slug` route param, via `getPublishedCatalogTemplateBySlug(locale, slug)` (`lib/catalog/editorial-repository.ts`). It never depends on an Odoo `id`/`template_id`/`canonical_id`/`canonical_template_id`/XID appearing in the URL at all — the backend's `GET /api/v1/catalog/products/<canonical_id>` (or, as currently documented, `<product_variant_xid>`) is a **server-to-server** lookup used only by `lib/catalog/odoo-api-client.ts#fetchCatalogProductByXid`, not a public Website route.

**Website can use CVAR identifiers directly?** — Yes, trivially, *at the point where the server-side client calls Odoo* (`fetchCatalogProductByXid(xid, ...)` just interpolates whatever string it is given into the URL path — it has no format assumption on the identifier itself, CVAR-prefixed or otherwise). The only real gate is the `isValidProduct` structural check (§2/§6), not the route/URL mechanism.

**Does the current route depend on the legacy XID?** No — public routing depends only on the Website's own `slug`, which is independent of whatever the Odoo XID scheme is at any given time.

**DETAIL_ROUTE_CVAR_SAFE: YES**, with the caveat noted in §1/§6: a product can only reach a publishable detail page if it first survives the ingestion boundary.

---

## 5. RFQ contract

Traced end-to-end:

1. **Selection payload the browser sends:** only `catalogVariantXid` (a `product_variant_xid`/`xid` string) for a Catalog-linked row — `docs/RFQ_MULTI_ITEM_FORM.md` §Performance: "The **only** field actually sent to the server for a Catalog row is `catalogVariantXid`... the Category/Product/Variant selects are UI-only filtering state... never transmitted."
2. **Server-side resolution:** `lib/rfq/service.ts` never trusts the client-submitted xid as display data — it re-resolves the selection against DB_PUBLIC via `resolveRfqCatalogVariant` before persisting (`lib/catalog/editorial-repository.ts`).
3. **Persisted record:** `lib/rfq/catalog-preselection.ts#buildCatalogItemRecord` builds `variantRef: selection.variantXid`, `productRef: selection.templateXid` — both are the **server-resolved** DB_PUBLIC `xid`/`template_xid` values, never client input, never an Odoo `product.product` integer, never a Supplier Offer ID.
4. **Outbound Odoo RFQ intake wire contract** (`docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md`): sends `product_variant_xid` (nullable only for a genuine free-text/uncatalogued line, in which case it is validly `null` by design, not by accident) plus `sku`, `quantity`, `uom`, `notes`. No Supplier Offer ID field exists in this contract at all.
5. `docs/integrations/odoo/rfq-v1/RFQ_BACKEND_ARCHITECTURE.md`: "Unknown products are supported only when the client explicitly sends a free-text line (`product_variant_xid=null`...). Invalid XIDs are validation errors and are not silently converted to free text."

**Confirmed:**
- **`SUPPLIER_OFFER_ID_REQUIRED: NO`** — no such field/concept exists anywhere in `lib/rfq/`.
- **ORM `product.product` id, legacy catalog id:** never required — RFQ identity is `product_variant_xid` end to end.
- **`product_variant_xid` populated from canonical identity?** Yes, in spirit — it is populated exclusively from the DB_PUBLIC `xid` column, which today *is* the value the Odoo API exposes as `id`. If the backend renames/splits this into `canonical_id`, the RFQ layer itself needs **no changes** — it only ever consumes whatever string DB_PUBLIC calls `xid`. The change, if any, is entirely upstream at the sync/ingestion boundary (§6), which is what actually decides what value lands in that `xid` column.

---

## 6. Null-safety simulation

Simulated fixture, exactly as specified in the task:

```json
{
  "id": null,
  "template_id": null,
  "canonical_id": "CVAR-000242",
  "canonical_template_id": "CTMPL-000017",
  "sku": "AA-AN-EQ-S50X50X5"
}
```

Traced through the real code path (`fetchCatalogProductsPage` → `isValidProduct` → `planCatalogV1Sync` → D1 insert):

1. `lib/catalog/odoo-api-client.ts#isValidProduct(value)`:
   ```ts
   typeof p.id === "string" && typeof p.template_id === "string" && ...
   ```
   With `id: null` and `template_id: null`, `typeof null === "object"` — **both checks fail** → `isValidProduct` returns `false` for this row.

2. `fetchCatalogProductsPage`:
   ```ts
   const items = rawItems.filter(isValidProduct);
   if (items.length !== rawItems.length || !isValidListMeta(result.meta)) {
     return { status: "failed", reasonCode: "CATALOG_API_UNEXPECTED_SHAPE" };
   }
   ```
   Because at least one item on the page fails validation, `items.length !== rawItems.length` is `true`, so **the entire page's fetch is discarded and reported as `status: "failed"`** — not just the one bad row. This is a page-level all-or-nothing check, not a per-row skip.

3. `lib/catalog/sync-runner.ts#fetchAllPages` / `scripts/catalog-sync.ts#fetchAllPages`:
   ```ts
   if (result.status !== "ok" || !result.data) return { status: "failed", items: [], reasonCode: ... };
   ```
   A `"failed"` page result aborts the **entire multi-page pagination loop** and returns `items: []`, discarding every item collected so far — i.e. the failure of a single page (containing the new Angle/Channel rows anywhere in it) fails the **whole sync run**, not just those 19 products.

4. `lib/catalog/scheduled-sync.ts` (the operational cron-driven incremental/full sync) treats this the same way — a `fetchAllPages` failure surfaces as `status: "failed"` for the run.

**Net effect if the hypothetical payload ships as described:** this is **not** "the 19 new products fail to render, everything else is fine." It is **"the moment any list or full-pull page contains one of these 19 rows, the entire Catalog sync run for that page — and by extension the whole paginated pull — fails, and the existing, already-synced 3 launch templates / catalog stop receiving updates from that point on until the underlying API payload or the Website's validator changes."** No route error/duplicate React key/invalid cache entry occurs, because the row never reaches D1, the product card, or the detail route — the failure is contained entirely to the sync layer, but it is total for the run, not partial.

- **Rendering errors:** No (row never reaches rendering).
- **Route errors:** No (row never reaches a route; routes key on slug, not Odoo id).
- **Duplicate React keys:** No (the card key is the Website's own internal `catalog_products.id`, assigned only after a row is successfully created — this row is never created).
- **Invalid cache entries:** No (ETag/Last-Modified caching is response-hash-based, not id-based).
- **TypeScript failures:** N/A at runtime — the TS types (`id: string`) describe the *expected* shape; a real `null` from the wire is caught by the runtime `isValidProduct` guard before it can violate the static type anywhere downstream. (If the JSON parse result were cast without going through `isValidProduct`, only then would a `null` silently satisfy `string` at compile time and crash later at first `.split`/string use — this does **not** happen today because every caller goes through the validated `CatalogApiResult`.)
- **RFQ submission errors:** No new failure mode — RFQ can never select a variant that was never synced into DB_PUBLIC in the first place; existing RFQ code is unaffected either way.

**`NULL_ID_SAFE: NO`** — not because anything crashes or renders incorrectly, but because the sync layer's current all-or-nothing page validation converts "19 products have a different identity shape" into "the whole Catalog sync silently stops working," which is a worse and much higher-blast-radius failure than a per-row skip would be.

---

## 7. Deferred field handling

- **`section_size = null`:** Already fully nullable end-to-end — `ProductVariant.sectionSize: string | null` (`lib/catalog/types.ts`), D1 column nullable, and rendered with an explicit fallback: `variant.commercialSize ?? variant.sectionSize ?? "—"` (`components/products/variant-spec-table.tsx` lines 131, 150). Grade/standard are already documented as legitimately null for other live product groups (structural beams), so this path is exercised today, not hypothetical. **`SECTION_SIZE_NULL_SAFE: YES`.**
- **`length_mm` absent / `per_branch` absent:** `dimensions` and `nominal_weight` are stored and consumed as **opaque, genuinely polymorphic key/value maps** (`Record<string, number>`), never as objects with a fixed, assumed key. `variant-spec-table.tsx` builds a `Map` from `spec.dimensions`/`spec.nominalWeight` row lists and looks values up by key — a missing key simply does not appear, with no fixed-shape assumption anywhere in the render path. This is explicitly called out in `lib/catalog/odoo-api-client.ts`'s file header as a deliberate design choice ("never assume a fixed key"). **`MISSING_LENGTH_SAFE: YES`.**
- **`commercial_size` for Angle/Channel:** Already the primary display field (`variant.commercialSize ?? variant.sectionSize ?? "—"`), so a `commercial_size`-only Angle/Channel product (no `section_size`) renders correctly with no code change needed.
- **Unit selector must restrict to `allowed_commercial_units` (kg, ton, meter for Angle/Channel), and must never expose `branch` unless it's in that set:**

  This is the one area where the Website's actual mechanism **does not match** the task's framing. `allowed_commercial_units` (the free-text field from the API, e.g. `"kg, ton, branch, meter"`) is synced into DB_PUBLIC (`ProductVariant.allowedCommercialUnits`) but is **not read anywhere** to drive the RFQ unit selector. Instead, `lib/rfq/uom-policy.ts` hardcodes a **Website-side, Odoo-Launch-confirmed allowlist keyed by `group_code`**:

  ```ts
  export const LAUNCH_GROUP_UOM_POLICY: Readonly<Record<string, readonly RfqUomCode[]>> = {
    REBAR: ["kg", "ton", "branch"],
    SHEET_PLATE: ["kg", "ton", "sheet"],
    SHS: ["kg", "ton", "meter"],
  };
  const DEFAULT_CATALOG_GROUP_UOM_POLICY: readonly RfqUomCode[] = ["kg", "ton"];
  ```

  Any `group_code` not explicitly listed (which, absent confirmation otherwise, includes whatever group code Angle/Channel products will actually carry — neither `ANGLE` nor `CHANNEL` appears in this map today) falls back to `["kg", "ton"]` only.

  - **Safe consequence:** `branch` is never offered for an unmapped group (satisfies "do not expose branch if not allowed" — but by blanket omission, not by reading the field).
  - **Gap:** `meter`, which the task says Angle/Channel should allow, is **also not offered** by the current default — the selector under-restricts relative to spec (safe, not incorrect, but incomplete) rather than reading `allowed_commercial_units` to know that `meter` should be added.
  - This is a manually-maintained allowlist by design (`lib/rfq/uom-policy.ts`'s own header: "encodes... confirmed policy — it does not invent, guess, or extend it"), deliberately conservative pending an explicit Odoo Launch-policy confirmation per group. Angle/Channel simply has not been added yet, because production has never had them before.

  **`UNIT_SELECTOR_USES_ALLOWED_COMMERCIAL_UNITS: NO`** — the mechanism is a hardcoded, group-keyed allowlist, not a live read of the `allowed_commercial_units` field. It is safe (never over-permissive) but will silently withhold `meter` for Angle/Channel until `lib/rfq/uom-policy.ts` is explicitly updated with their real `group_code` values and confirmed unit set. This is a **non-blocking, pre-launch content/config update**, not a null-safety defect.

---

## 8. Result

```
WEBSITE_D1_GATE: BLOCKED

CANONICAL_ID_PRIMARY: NO
  (no `canonical_id`/`canonical_template_id` concept exists anywhere in this
  repository's types, validators, schema, or docs today; the ingestion
  boundary hard-requires the legacy `id`/`template_id` field names to be
  non-null strings)

LEGACY_ID_REQUIRED_ANYWHERE: YES
  (lib/catalog/odoo-api-client.ts#isValidProduct requires `typeof id ===
  "string" && typeof template_id === "string"`; migrations_public/
  0002_catalog_v1_contract.sql requires `xid`/`template_xid` NOT NULL UNIQUE
  at the D1 schema level, fed directly from those same two API fields)

NULL_ID_SAFE: NO
  (not a crash/render-safety failure — a page-level sync failure: any page
  containing a null-id/null-template_id row causes the ENTIRE paginated
  sync run to abort and discard all items, per §6)

DETAIL_ROUTE_CVAR_SAFE: YES
  (public routing keys exclusively on the Website-owned SEO `slug`; the
  server-to-server Odoo lookup client has no format assumption on the
  identifier string it is given)

RFQ_USES_CANONICAL_ID: YES
  (RFQ identity is, and has only ever been, the DB_PUBLIC `xid` column —
  never a legacy ORM id or Supplier Offer ID; no RFQ code change is implied
  by a backend rename, only a change to what value the sync layer writes
  into that column)

SUPPLIER_OFFER_ID_REQUIRED: NO

SECTION_SIZE_NULL_SAFE: YES

MISSING_LENGTH_SAFE: YES

UNIT_SELECTOR_USES_ALLOWED_COMMERCIAL_UNITS: NO
  (hardcoded per-group allowlist in lib/rfq/uom-policy.ts, not driven by the
  `allowed_commercial_units` field; safe by omission today, but Angle/Channel
  group codes are not yet present in that allowlist, so `meter` will not be
  offered until it is added — see §7)

BLOCKING_FILES:
  - lib/catalog/odoo-api-client.ts  (isValidProduct hard-requires
    non-null id/template_id; a single invalid row fails the whole page)
  - lib/catalog/sync-runner.ts and scripts/catalog-sync.ts (fetchAllPages
    aborts and discards the entire pull on any single page failure)
  - lib/catalog/sync.ts  (VariantCreateInput.xid/templateXid sourced only
    from row.id/row.template_id, both typed non-null string)
  - migrations_public/0002_catalog_v1_contract.sql  (xid/template_xid
    NOT NULL UNIQUE — correct by design, but means the ingestion layer must
    resolve a non-null identity BEFORE any insert is attempted)

NON_BLOCKING_FIXES (once the premise in §0 is actually confirmed by Odoo):
  - Add `canonical_id`/`canonical_template_id` as optional fields on
    `CatalogApiProduct` (lib/catalog/odoo-api-client.ts)
  - Relax isValidProduct to accept a row when EITHER `id` is a non-empty
    string OR `canonical_id` is one (same for template_id/
    canonical_template_id), and prefer canonical_id/canonical_template_id
    as the resolved identity fed into VariantCreateInput.xid/templateXid
    in lib/catalog/sync.ts, so a page is never rejected wholesale
  - Add the real Angle/Channel `group_code` value(s) to
    LAUNCH_GROUP_UOM_POLICY in lib/rfq/uom-policy.ts with the Odoo-confirmed
    unit set (task states kg/ton/meter) once that group code and policy are
    actually confirmed by Odoo — do not guess the code or the unit set
  - Add unit-test coverage in lib/catalog/odoo-api-client.test.ts for a row
    with null id/template_id + populated canonical_id/canonical_template_id
    (currently zero test coverage of this shape exists anywhere)
  - Log this premise discrepancy (§0) in DOCUMENT_AUDIT_REPORT.md as a new,
    numbered, unresolved finding before any implementation task proceeds,
    per CLAUDE.md §8's "never silently resolve a conflict" rule

RECOMMENDATION: FIX_REQUIRED_BEFORE_P3F
```

**Why `FIX_REQUIRED_BEFORE_P3F` rather than `SAFE_FOR_P3F`:** even setting aside the unconfirmed premise in §0, the current ingestion boundary's behavior — one malformed row silently failing an entire sync page, which in turn aborts the entire multi-page pull — is exactly the failure mode that would turn "19 new products can't be shown yet" into "the whole Catalog stops updating." That is real, present-day code behavior, verifiable independent of whether `canonical_id` ever ships. It should be fixed (or the premise formally withdrawn) before these 19 products are published from the Odoo side, regardless of which specific field names the backend ultimately settles on.

---

## 9. What was and wasn't checked

Not modified: no code, config, `01-sources/`, `design-reference/`, `logo/`, migrations, or dependencies were touched. Only this new file was created. No Odoo products were published, no API contract was changed, no migration was created.

Read directly: `PROJECT_OVERRIDES.md`, `CLAUDE.md`, `DOCS_INDEX.md` (catalog/pricing rows), `DOCUMENT_AUDIT_REPORT.md` (DAR-034/036/037/039 sections), `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`, `docs/integrations/odoo/catalog-v1/public_catalog_api_v1.openapi.yaml`, `docs/CATALOG_RFQ_INTEGRATION.md`, `docs/RFQ_MULTI_ITEM_FORM.md`, `docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md`, `docs/integrations/odoo/rfq-v1/RFQ_BACKEND_ARCHITECTURE.md`, `docs/pricing/PRICE_P0_IDENTITY_FRESHNESS_GATE.md`, `lib/catalog/odoo-api-client.ts`, `lib/catalog/sync.ts`, `lib/catalog/sync-sql.ts`, `lib/catalog/types.ts`, `lib/catalog/repository.ts`, `lib/rfq/catalog-preselection.ts`, `lib/rfq/uom.ts`, `lib/rfq/uom-policy.ts`, `components/products/catalog-template-grid.tsx`, `components/products/variant-spec-table.tsx`, `app/[locale]/products/page.tsx`, `app/[locale]/products/[slug]/page.tsx`, `migrations_public/0002_catalog_v1_contract.sql`, `migrations_public/0008_price_variant_identity_and_provider_policy.sql`.
