# Odoo → Website: Current Public Catalog & RFQ Identity Contract Handoff

Read-only contract extraction. No code changed, no data changed, no products published, no
deploy, no module upgrade. Sources: live code at HEAD `ed5ba8d` (`controllers/public_catalog_api.py`,
`models/public_catalog.py`, `models/product.py`, `controllers/rfq_api.py`, `models/rfq.py`),
production read-only `psql` queries against database `ahanassa`, and the disposable-DB P3E dry-run
evidence in `docs/architecture/anglechannel_p3e/` (`p3e_phase1.json`, `p3e_http.json`,
`docs/product_master/ANGLE_CHANNEL_P3E_PUBLICATION_READINESS_GATE_REPORT.md`).

# RESULT

PASS. The current backend contract is fully determined from code and confirmed against both
production (legacy rows) and a disposable prod-lineage database (canonical-only rows, via the P3E
dry run). No ambiguity was found that blocks Website integration.

# CURRENT BACKEND VERSION

- Module: `ahanassa_marketplace`, `__manifest__.py` version `19.0.40.0.0`.
- Production `ir_module_module.latest_version` for `ahanassa_marketplace`: `19.0.40.0.0`, state
  `installed` — repo and production are in sync.
- Git HEAD: `ed5ba8d` (branch `main`), working tree clean except this report and the manifest
  update (see PRODUCTION SAFETY).
- Production, right now: 19 `product.template` rows (13 `published`, 6 `draft`), 237 active public
  catalog rows, **all 237 with a non-null legacy `product_variant_xid`/`product_template_xid`**
  (`SELECT count(*) FILTER (product_variant_xid IS NULL OR = '') ... = 0`). The 3 Angle/Channel
  templates (`CTMPL-000017/18/19`, prod template ids 18/19/20) are still `draft` in production —
  **the null-`id` case does not exist in production data yet.** It is proven only on the disposable
  P3E dry-run database, which published those same templates and got 19 new rows with `id: null`.

# PUBLIC CATALOG PAYLOAD

Route: `GET /api/v1/catalog/products` (list, paginated) and
`GET /api/v1/catalog/products/<identifier>` (detail). Both are `auth="public"`, backed exclusively
by `ahanassa.public.catalog.variant`, a denormalized allow-list projection with no relation to
`product.product`, suppliers, offers, or stock (`models/public_catalog.py:6-12`).

Payload keys, built by `PublicCatalogAPI._record_payload` (`controllers/public_catalog_api.py:48-87`):

| Key | Type | Nullable | Source |
|---|---|---|---|
| `id` | string or `null` | **YES** | `product_variant_xid` (legacy `ir.model.data` XID), else `null` |
| `template_id` | string or `null` | **YES** | `product_template_xid` (legacy), else `null` |
| `canonical_id` | string | **NO** — always populated | `product_variant_canonical_key` (`CVAR-…`), `required=True` on the model |
| `canonical_template_id` | string | **NO** — always populated | `product_template_canonical_key` (`CTMPL-…`), `required=True` |
| `sku` | string | not null (`required=True` on the projection; publication itself requires a non-blank SKU per variant) | `product.product.default_code` |
| `commercial_size` | string | may be `""` | `product.product.composite_size` |
| `section_size` | string or `null` | YES | variant's "Section Size" attribute value; `false`→`null` for non-attribute forms (e.g. Angle/Channel, which carry geometry as template-level fixed fields, not a variant attribute) |
| `allowed_commercial_units` | string | may be `""` | `product.product.allowed_commercial_units`, comma-joined free text, e.g. `"kg, ton, meter"` |
| `dimensions` | object | keys present only when non-zero/non-false | sparse map over `diameter_mm, width_mm, height_mm, thickness_mm, outside_diameter_mm, wall_thickness_mm, length_mm` |
| `nominal_weight` | object | keys present only when non-zero/non-false | sparse map over `kg_m, kg_m2, per_branch, per_sheet, per_commercial_unit` (prefix `nominal_weight_` stripped) |
| `classification` | object `{family,group,form}`, each `{code,name}` | codes/names individually nullable | steel classification hierarchy walk |
| `grade` | object `{code,name}` | both nullable | `steel_grade_id` |
| `standard` | object `{code,name}` | both nullable | `steel_standard_id` |

Also present, not requested above but part of the contract: `template_name`, `name` (locale-resolved
display strings), `inventory_uom`, `active`, `updated_at`, `schedule`. There is no `web_thickness_mm`
/ `flange_thickness_mm` in the payload (open item D2 from the P3E gate — deferred, not part of this
task).

`all_keys` observed on a live HTTP call in the P3E dry run (`p3e_http.json`) matches this table
exactly: `active, allowed_commercial_units, canonical_id, canonical_template_id, classification,
commercial_size, dimensions, grade, id, inventory_uom, name, nominal_weight, schedule,
section_size, sku, standard, template_id, template_name, updated_at`.

# IDENTITY SEMANTICS

**`id` today** = the legacy, module-owned `ir.model.data` XID for the Product Variant
(`ahanassa_marketplace.<name>`), populated only for products that already had one before Phase
PRODUCT-MASTER-UI-P1. It is `null` for any product created through the newer Product Master UI that
never received one. It is **not** an application-assigned identity and is explicitly documented in
code as retained only for backward compatibility (`controllers/public_catalog_api.py:56-62`,
`models/public_catalog.py:29-34,122-126`).

**`canonical_id`** = `product.product.canonical_variant_key`, prefix `CVAR-` from a dedicated Odoo
sequence (`ahanassa.canonical.variant`, `data/canonical_identity_sequence.xml:16-17`). Assigned
automatically on `create()`, rejected if caller-supplied, immutable once set except via a genuine
superuser/`env.su` call (`models/product.py:440-464`). This is the field the code calls "what the
Public Catalog projection and RFQs reference going forward" (`models/product.py:397-408`).

**`template_id` today** = the legacy `ir.model.data` XID for the Product Template, same
retained-for-compatibility status as `id`.

**`canonical_template_id`** = `product.template.canonical_template_key`, prefix `CTMPL-`
(`ahanassa.canonical.template` sequence), same automatic/immutable/rejected-on-supply semantics as
`canonical_id` (`models/product.py:178-289`).

**A. Legacy products** (all 237 currently live/published in production): have both forms — a
non-null legacy `id`/`template_id` **and** a non-null `canonical_id`/`canonical_template_id`. Every
production row today carries all four.

**B. New products with CVAR/CTMPL but no legacy XID** (proven only on the P3E disposable dry run,
not yet in production): `id: null`, `template_id: null`, `canonical_id`/`canonical_template_id`
populated as normal. This is the Angle/Channel pilot (19 variants across 3 templates) once
published.

**`canonical_id` is always the preferred stable product identity — YES, unconditionally.** It is
`required=True` at the model level (`ahanassa.public.catalog.variant`), unique-constrained
(`_identity_unique`, `models/public_catalog.py:74-77`), and is what `resolve_product_variant_xid`
(used by the RFQ path) and the detail route both accept alongside the legacy XID. `id`/`template_id`
are the ones that "may legitimately be null" — confirmed **YES**, by design, for any
Product-Master-UI-era product, and this is intentional/documented, not a defect.

# LEGACY PRODUCTS

All 237 currently-published production variants expose non-null `id` and `template_id`
(production-verified: 0 of 237 active catalog rows have a null/blank `product_variant_xid` or
`product_template_xid`). They also expose non-null `canonical_id`/`canonical_template_id` — the
projection backfilled canonical keys for every pre-existing product during Phase
PRODUCT-MASTER-UI-P1 (`product_variant_canonical_key`/`product_template_canonical_key` are
`required=True`, and `_source_variants()` defensively excludes any variant still missing one,
`models/public_catalog.py:139-144`). So for legacy products, both identity systems are populated and
**agree on the same underlying product** — a Website client can use either without special-casing.

# CANONICAL PRODUCTS

Angle/Channel pilot (3 templates, 19 variants; not yet published in production, proven only on the
disposable P3E dry run) is the first cohort with `id: null, template_id: null`. Sample record
(`CVAR-000242`, from `p3e_http.json`):

```json
{
  "id": null, "template_id": null,
  "canonical_id": "CVAR-000242", "canonical_template_id": "CTMPL-000017",
  "sku": "AA-AN-EQ-S50X50X5", "commercial_size": "50X50X5", "section_size": null,
  "allowed_commercial_units": "kg, ton, meter",
  "classification": {"family": {"code": "LONG_PRODUCTS", ...}, "group": {"code": "ANGLE", ...},
                      "form": {"code": "EQUAL_ANGLE", ...}},
  "grade": {"code": null, "name": null},
  "standard": {"code": "EN10056-1", "name": "EN 10056-1 — Structural steel equal and unequal leg angles; dimensions"},
  "dimensions": {"width_mm": 50.0, "height_mm": 50.0, "thickness_mm": 5.0},
  "nominal_weight": {"kg_m": 3.77}
}
```

No canonical (or legacy) row anywhere in the current catalog has `id`/`canonical_id` both null —
`canonical_id`/`canonical_template_id` are unconditionally populated for every row, past or future.

# DETAIL ROUTE

`GET /api/v1/catalog/products/<string:product_xid>` (`controllers/public_catalog_api.py:142-154`)
resolves against:

```python
["|", ("product_variant_xid", "=", product_xid),
      ("product_variant_canonical_key", "=", product_xid),
 ("active", "=", True)]
```

- **Accepts a legacy XID: YES.**
- **Accepts a CVAR: YES.**
- **Precedence:** there is no explicit precedence rule (no `ORDER BY` favoring one form) — it is a
  plain OR with `limit=1`. This is safe in practice because the two value spaces never collide by
  construction: legacy XIDs are dotted `ahanassa_marketplace.<name>` strings assigned by
  `ir.model.data`, while canonical keys are `CVAR-######` from a dedicated sequence: no XID can ever
  equal a CVAR string. Confirmed live on the P3E dry run: `detail_CVAR-000242` returned 200 with the
  full payload above.
- **Error behavior:** unknown/inactive identifier (either form) → `404` with
  `{"error": {"code": "not_found", "message": "Catalog product not found"}}`. Invalid `locale`
  query param → `400 invalid_parameter`.

# RFQ CONTRACT

`POST /api/v1/rfq` (`controllers/rfq_api.py`), HMAC-bearer-authenticated, allow-list-validated. Item
schema (`_ITEM_KEYS`, line 31): exactly
`{product_variant_xid, sku, quantity, uom, notes, description, length_mm}` — **any other key is
rejected outright** (`set(item) - _ITEM_KEYS` check, line 98), which is itself proof that no
supplier-offer ID or `product.product` integer field is an accepted or required input.

- `product_variant_xid` (optional, string, max 256 chars): if present, resolved via
  `ahanassa.rfq.line.resolve_product_variant_xid()` (`models/rfq.py:462-487`), which — like the
  detail route — matches **either** `product_variant_xid = identifier` **or**
  `product_variant_canonical_key = identifier` against the *active* public catalog, then loads the
  underlying `product.product` by `canonical_variant_key`. **CVAR is accepted: YES** (confirmed live
  in the P3E dry run: `resolve_product_variant_xid("CVAR-000242")` resolves before publication is
  withdrawn, and correctly rejects with `ValidationError` once withdrawn — `dryrun3.py` /
  `p3e_phase3.json`). If omitted, a free-text line is allowed instead, but then `description` is
  required (line 112).
- `sku` (optional, max 128 chars): advisory only — if it disagrees with the resolved product's SKU,
  the XID is authoritative and a mismatch note is appended (`models/product.py:502-503`); `sku`
  alone with no `product_variant_xid` does **not** resolve a product.
- `quantity` (required): finite, positive, ≤ 1e12 float.
- `uom` (required): one of `kg, ton, branch, sheet, meter` (`_UOMS`, line 23) — `coil`/`bundle`/
  `piece` are explicitly rejected at the API boundary (Launch UoM hardening).
- `length_mm` (optional, since Phase ANGLE-CHANNEL-P3D-B2): finite, positive, ≤ 1e6 mm float;
  omission is fully backward-compatible (byte-identical canonical JSON / idempotency fingerprint for
  clients that never send it).

**No supplier offer ID or ORM `product.product` integer is required or even accepted** — confirmed
structurally by the `_ITEM_KEYS` allow-list (an extra field like `supplierinfo_id` or `product_id`
would be rejected with `invalid_payload`), and confirmed functionally: `resolve_product_variant_xid`
only ever takes the public-catalog-facing string identifier.

# ANGLE CHANNEL CONTRACT

Confirmed from the P3E dry-run payload for all 19 pilot variants (5 Equal Angle sizes under
`CTMPL-000017`, 7 UPN sizes under `CTMPL-000018`, 7 UPE sizes under `CTMPL-000019`):

| Field | Value (all 19 rows) |
|---|---|
| `id` | `null` |
| `template_id` | `null` |
| `canonical_id` | `CVAR-000242` … `CVAR-000262` (19 distinct values) |
| `canonical_template_id` | `CTMPL-000017` (Equal Angle ×5), `CTMPL-000018` (UPN ×7), `CTMPL-000019` (UPE ×7) |
| `commercial_size` | e.g. `50X50X5`, `S100` — populated, non-blank |
| `section_size` | `null` for every row (Angle/Channel carry geometry as fixed template-level fields, not a "Section Size" variant attribute — this is expected, not a gap) |
| `allowed_commercial_units` | `"kg, ton, meter"` for every one of the 19 rows, both ANGLE and CHANNEL groups |

**ANGLE = kg, ton, meter — CONFIRMED** (5/5 rows). **CHANNEL = kg, ton, meter — CONFIRMED** (14/14
rows, UPN + UPE forms both). Verified programmatically against `p3e_phase1.json`'s `ac_payload`
(19 rows, one `allowed_commercial_units` value set: `{"kg, ton, meter"}`), not just asserted.

Production status: these 3 templates are still `draft` in production (`publication_state`); this
contract is proven on the disposable dry-run DB only and has not yet been exercised against live
production data. Publishing them is a separate, owner-gated action (Phase P3F), out of scope for
this read-only task.

# BACKWARD COMPATIBILITY

All 237 currently-published production products continue to expose non-null legacy `id` and
`template_id` — production-verified (see LEGACY PRODUCTS). Nothing in this contract removes or
nulls out a legacy field that used to be populated; `id`/`template_id` only start appearing as
`null` for products that never had a legacy XID to begin with (Product-Master-UI-era creations,
first realized by Angle/Channel).

**Website's proposed fallback rule:**

```
variant_identity  = canonical_id if present else id
template_identity = canonical_template_id if present else template_id
```

**This is safe — YES — but should be simplified.** Because `canonical_id`/`canonical_template_id`
are *unconditionally* populated on every row (past, present, and future — enforced by
`required=True` + a unique DB constraint + defensive exclusion of any row missing one), the
`else id` branch is dead code from day one: `canonical_id` is never absent, so the fallback never
actually falls back. The rule is safe precisely because it degenerates to "always use
`canonical_id`/`canonical_template_id`." Website does not need `id`/`template_id` for identity
resolution at all going forward; they are retained in the payload purely for any legacy client code
that has not migrated yet.

The one case worth calling out explicitly: `id`/`template_id` must never be used as a *fallback
key when canonical_id is present* for correlating historical local records, because for legacy
products both values point at the same product — there is no scenario where preferring `id` over an
available `canonical_id` produces a different (let alone more correct) product resolution. Preferring
`canonical_id` is always at least as correct.

# DOCUMENTATION DRIFT

Repo-internal docs (this repository only — the Website repo's stale doc is out of scope for this
read-only Odoo-side task and could not be inspected from here):

| Doc | Classification | Why |
|---|---|---|
| `docs/product_master/PRODUCT_MASTER_UI_P1_IMPLEMENTATION_REPORT.md` | CURRENT | Introduces the canonical-key model that is still authoritative today |
| `docs/product_master/PRODUCT_MASTER_UI_P11_HARDENING_REPORT.md` | CURRENT | Publication lifecycle still in force |
| `docs/deployments/PRODUCT_MASTER_UI_P2_PRODUCTION_RELEASE_REPORT.md` | CURRENT | Records the production deployment of the identity model described here |
| `docs/product_master/ANGLE_CHANNEL_P2D_IDENTITY_CATALOG_HARDENING_REPORT.md` | CURRENT | Blank-SKU/placeholder-CVAR gates still in force |
| `docs/product_master/ANGLE_CHANNEL_P3DB0_COMMERCIAL_LENGTH_ARCHITECTURE_GATE_REPORT.md` | CURRENT | `length_mm` RFQ contract described here still in force |
| `docs/product_master/ANGLE_CHANNEL_P3E_PUBLICATION_READINESS_GATE_REPORT.md` | CURRENT | Direct source for this handoff's Angle/Channel section |
| `docs/product_master/ANGLE_CHANNEL_P3DB2_COMMERCIAL_LENGTH_ARCHITECTURE_REPORT.md` | SUPERSEDED | References `product_variant_xid` without the canonical-identity framing added by later phases; describes a real historical decision, not a contract to integrate against — **not rewritten**, per instruction |
| `docs/architecture/processing_domain/AHANASSA_PUBLIC_PROCESSING_PROJECTION_PHASE2_REPORT.md` | SUPERSEDED | Same — point-in-time architecture report, predates full canonical-identity framing in its own text |
| `docs/architecture/pricing/AHANASSA_PUBLIC_PRICING_P0_ARCHITECTURE_GATE.md` | SUPERSEDED | Same |

No document in this repository currently asserts, as *live current contract*, that `id`/
`template_id` are the only identity fields or are guaranteed non-null. The stale "`id` = XID,
`template_id` = template XID, both non-null" contract exists only in the **Website repository**,
which is not on this host and was not inspected — the owner must confirm and update it there; this
report is the authoritative source to update it from. None of the SUPERSEDED reports above were
rewritten, per instruction.

# WEBSITE MIGRATION GUIDANCE

Minimal backward-compatible ingestion rule (no Website code written, guidance only):

1. Read `canonical_id` / `canonical_template_id` unconditionally as the primary key for every row —
   they are never null, on any row, past or future.
2. Stop keying off `id` / `template_id` for identity resolution. Continue reading them only if
   Website wants to display/log the legacy XID for its own historical-data reconciliation purposes.
3. **Website may keep its internal columns named `xid`/`template_xid` — YES** — provided their
   *stored values* become the resolved canonical identity (`canonical_id`/`canonical_template_id`),
   not the raw `id`/`template_id` payload fields. A rename is not required; a re-mapping of what
   value populates those columns is. (If Website's schema treats those columns as nullable-legacy
   pass-throughs rather than a resolved primary key, that distinction should be preserved instead —
   the important point is that whichever column Website treats as *the* product identity must be
   fed from `canonical_id`, not `id`.)
4. For the RFQ submission path, always send back whatever value the catalog gave as `canonical_id`
   in `product_variant_xid` — the RFQ API already accepts CVAR there natively; no dual-write or
   translation layer is needed.
5. **No backend API breaking change is required — YES, none.** `canonical_id`/`canonical_template_id`
   are additive fields that have existed in the payload since Phase PRODUCT-MASTER-UI-P1 (production
   since 2026-09-15); nothing is being removed, renamed, or restructured for this migration. The
   only change is which field Website reads.

# PUBLIC PRIVATE BOUNDARY

`ahanassa.public.catalog.variant` is a denormalized, allow-list-only projection with **no
relational field** to `product.product`, `product.supplierinfo`, suppliers, sites, offers, or stock
(`models/public_catalog.py:6-12`) — a public caller cannot traverse from a catalog row into any
private procurement record. All catalog/detail routes are `auth="public"`, read `.sudo()` only
through this projection, and never `read()` arbitrary fields — `serialize_public()` restricts to
`public_field_allowlist()` explicitly (`models/public_catalog.py:79-118`). The RFQ submission route
is `auth="public"` but requires a bearer-token HMAC secret (`_authorized()`,
`controllers/rfq_api.py:41-46`) and only ever resolves identifiers *through* the same public
projection, never against `product.product` directly by database id — so an RFQ submission cannot
target a product outside the published/public set, nor read/leak supplier, offer, or pricing data.
Publication is the sole gate controlling catalog membership (`publication_state == 'published'`,
`models/public_catalog.py:146-165`), independent of `active`, SKU presence, or canonical identity by
design.

# PRODUCTION SAFETY

- **No code changed.** Verified: no files under `controllers/`, `models/`, `data/`, or any Python
  source were modified — only this new documentation file and the manifest below were added.
- **No data changed.** All database access was `SELECT`-only, executed under
  `PGOPTIONS='-c default_transaction_read_only=on'` against production; the Angle/Channel evidence
  used here comes from a disposable prod-lineage database created for the prior P3E gate (not
  production) and was not re-executed by this task.
- **No products published.** The 3 Angle/Channel templates remain `draft` in production
  (verified: `publication_state` counts = 6 draft / 13 published, unchanged).
- **No API modified, no deploy, no module upgrade.** Production module version confirmed unchanged
  at `19.0.40.0.0`, `state = installed`.
