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

Responses use `{"data": ..., "meta": ...}`; errors use `{"error":{"code":"...","message":"..."}}`. Identity is `product_variant_xid` exposed as `id`, with `template_id` and `sku`; no PostgreSQL IDs are returned. Names use deterministic locale fallback (`requested → Persian → English → Arabic → neutral`). Technical codes, sizes and numbers are language-neutral.

Example detail shape:

```json
{"data":{"id":"ahanassa_marketplace.product_pf_rhs_s80x40x3_l6","template_id":"ahanassa_marketplace.product_tmpl_pf_rhs","sku":"AA-PF-RHS-S80X40X3-L6","name":"RHS 80×40×3","commercial_size":"80×40×3","classification":{"family":{"code":"HOLLOW_SECTIONS_PROFILES","name":"..."},"group":{"code":"RHS","name":"..."},"form":{"code":"...","name":"..."}},"grade":{"code":null,"name":null},"standard":{"code":null,"name":null},"dimensions":{"width_mm":40,"height_mm":80,"thickness_mm":3,"length_mm":6000},"nominal_weight":{"kg_m":5.3,"kg_branch":31.8},"allowed_commercial_units":"kg, ton, branch, meter","inventory_uom":"kg","active":true,"updated_at":"..."},"meta":{}}
```

## Caching

Responses set `Content-Type: application/json; charset=utf-8`, `Cache-Control: public, max-age=60, s-maxage=300`, deterministic SHA-256 `ETag`, and `Last-Modified` from Public Catalog timestamps. Matching `If-None-Match` returns 304. Cloudflare/edge rate limiting and caching are the expected production protection layer.

## Privacy and later integration

The controller reads only `ahanassa.public.catalog.variant` and calls its explicit serializer. Supplier, supplier site, offers, purchase prices/currency/payment, private MOQ/availability, margins, private addresses/notes, stock, and accounting data are structurally unavailable. Future RFQ selection should send XID, SKU snapshot, original requested quantity/UoM and customer notes. SEO slugs remain website-owned.
