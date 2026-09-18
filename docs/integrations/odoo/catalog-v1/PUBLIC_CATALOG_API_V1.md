# Ahan Asa Public Catalog API v1

Phase 5B implements a read-only Odoo HTTP API; website integration is not included.

## Base and routes

Base path: `/api/v1/catalog`

* `GET /api/v1/catalog/products` — active, variant-centric paginated list.
* `GET /api/v1/catalog/products/<product_variant_xid>` — active detail lookup by immutable XID.
* `GET /api/v1/catalog/meta` — active-only family/group/form/grade/standard filter metadata.

All routes use `auth=public`, `save_session=False`, and `methods=[GET]`. POST/PUT/PATCH/DELETE are rejected with 405. No generic model, fields, domain, or integer-ID proxy exists.

## List parameters

`locale=fa|en|ar` (default `fa`), `page` (default 1), `page_size` (default 50, maximum 100), `q`, `sku`, `commercial_size`, `family`, `group`, `form`, `grade`, `standard`, `section_size`, numeric `diameter_min/max`, `width_min/max`, `height_min/max`, and `thickness_min/max`. `updated_since` accepts UTC ISO-8601 and filters by Public Catalog `catalog_updated_at`. Invalid values return 400.

## Response and identity

**Superseded 2026-09-18 (DAR-056/PRE-P3F-D1) — see below.** This section originally documented `id`/`template_id` (the legacy `product_variant_xid`/`product_template_xid`) as the non-null identity. That is no longer accurate: per the Odoo-side authoritative handoff (`docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md`, Phase PRODUCT-MASTER-UI-P1, production since 2026-09-15), the payload now also carries `canonical_id`/`canonical_template_id` (`CVAR-…`/`CTMPL-…`), which are the real, always-populated (`required=True`, unique-constrained) primary identity going forward. `id`/`template_id` are retained only as legacy, nullable, backward-compatibility fields — they are `null` for any product created through the Product Master UI that never received a legacy XID (first realized by the Angle/Channel pilot). Not rewritten in place per this repo's "do not rewrite historical reports" convention — corrected identity contract below.

Responses use `{"data": ..., "meta": ...}`; errors use `{"error":{"code":"...","message":"..."}}`. **Current identity contract:**

- `canonical_id` (string, **never null**) — the resolved variant identity, `CVAR-######`. Always use this.
- `canonical_template_id` (string, **never null**) — the resolved template identity, `CTMPL-######`. Always use this.
- `id` (string or `null`) — legacy `product_variant_xid`. Compat-only; never the resolved identity.
- `template_id` (string or `null`) — legacy `product_template_xid`. Compat-only; never the resolved identity.
- `sku` — advisory display/snapshot only, never relational identity.

No PostgreSQL IDs are returned, on either identity form. The detail route (`GET /api/v1/catalog/products/<identifier>`) accepts either a legacy XID or a `canonical_id` — both resolve to the same product for a legacy row; only `canonical_id` exists for a canonical-only row. The RFQ API's `product_variant_xid` field likewise accepts a `CVAR-…` value directly — no translation layer needed. Names use deterministic locale fallback (`requested → Persian → English → Arabic → neutral`). Technical codes, sizes and numbers are language-neutral.

Example detail shape (legacy product — both identity forms populated):

```json
{"data":{"id":"ahanassa_marketplace.product_pf_rhs_s80x40x3_l6","template_id":"ahanassa_marketplace.product_tmpl_pf_rhs","canonical_id":"CVAR-000105","canonical_template_id":"CTMPL-000042","sku":"AA-PF-RHS-S80X40X3-L6","name":"RHS 80×40×3","commercial_size":"80×40×3","classification":{"family":{"code":"HOLLOW_SECTIONS_PROFILES","name":"..."},"group":{"code":"RHS","name":"..."},"form":{"code":"...","name":"..."}},"grade":{"code":null,"name":null},"standard":{"code":null,"name":null},"dimensions":{"width_mm":40,"height_mm":80,"thickness_mm":3,"length_mm":6000},"nominal_weight":{"kg_m":5.3,"kg_branch":31.8},"allowed_commercial_units":"kg, ton, branch, meter","inventory_uom":"kg","active":true,"updated_at":"..."},"meta":{}}
```

Example detail shape (Product-Master-UI-era product — no legacy XID; e.g. the Angle/Channel pilot, `docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md` "CANONICAL PRODUCTS"):

```json
{"data":{"id":null,"template_id":null,"canonical_id":"CVAR-000242","canonical_template_id":"CTMPL-000017","sku":"AA-AN-EQ-S50X50X5","name":"...","commercial_size":"50X50X5","section_size":null,"classification":{"family":{"code":"LONG_PRODUCTS","name":"..."},"group":{"code":"ANGLE","name":"..."},"form":{"code":"EQUAL_ANGLE","name":"..."}},"grade":{"code":null,"name":null},"standard":{"code":"EN10056-1","name":"..."},"dimensions":{"width_mm":50,"height_mm":50,"thickness_mm":5},"nominal_weight":{"kg_m":3.77},"allowed_commercial_units":"kg, ton, meter","inventory_uom":"kg","active":true,"updated_at":"..."},"meta":{}}
```

`section_size` is `null` for Angle/Channel by design — that form carries geometry as fixed template-level fields, not a "Section Size" variant attribute; `commercial_size` is the primary size display for these rows (never a fixed-shape assumption — see `formatCompactVariantSpecification`, `lib/catalog/specification-presenter.ts`). Angle and Channel's `allowed_commercial_units` is `"kg, ton, meter"` for every pilot row (no `branch`) — encoded Website-side in `lib/rfq/uom-policy.ts#LAUNCH_GROUP_UOM_POLICY` (`ANGLE`/`CHANNEL` keys).

## Caching

Responses set `Content-Type: application/json; charset=utf-8`, `Cache-Control: public, max-age=60, s-maxage=300`, deterministic SHA-256 `ETag`, and `Last-Modified` from Public Catalog timestamps. Matching `If-None-Match` returns 304. Cloudflare/edge rate limiting and caching are the expected production protection layer.

## Privacy and later integration

The controller reads only `ahanassa.public.catalog.variant` and calls its explicit serializer. Supplier, supplier site, offers, purchase prices/currency/payment, private MOQ/availability, margins, private addresses/notes, stock, and accounting data are structurally unavailable. Future RFQ selection should send XID, SKU snapshot, original requested quantity/UoM and customer notes. SEO slugs remain website-owned.
