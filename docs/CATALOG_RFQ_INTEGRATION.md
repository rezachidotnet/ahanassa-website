# Catalog → RFQ Variant Preselection

**Status:** Active — canonical for how a real, publication-eligible Catalog commercial Variant is preselected into the existing RFQ/request flow.
**Established:** 2026-08-30 (DOCUMENT_AUDIT_REPORT.md DAR-039), extending the existing RFQ backend (DAR-026/027/030) and the Catalog stack (DAR-034 through DAR-038).
**Scope:** `lib/rfq/`, `lib/catalog/editorial-repository.ts` (the `resolveRfqCatalogVariant` addition), `components/contact/enquiry-form.tsx`, `app/[locale]/contact/page.tsx`, `components/products/variant-spec-table.tsx`, `migrations/0002_rfq_catalog_snapshot.sql`. Does not implement Pricing, a Customer Portal, or full multi-line "add to RFQ" UI.

---

## 1. Architecture

```text
Published Website Product Page (docs/CATALOG_PUBLIC_ROUTES.md)
  -> "Request this item" link per eligible Variant row (plain <Link>, zero client JS)
  -> /{locale}/contact?variant=<product_variant_xid>
  -> app/[locale]/contact/page.tsx resolves the xid against DB_PUBLIC, server-side
  -> components/contact/enquiry-form.tsx shows the resolved item (title/SKU/spec), editable quantity+notes
  -> POST /api/rfqs — lib/rfq/service.ts RE-resolves the xid against DB_PUBLIC (never trusts the browser)
  -> lib/rfq/catalog-preselection.ts builds the final, self-contained snapshot record
  -> lib/rfq/repository.ts persists it into the existing rfq_items row (one D1 batch, unchanged atomicity)
  -> existing async Odoo sync (lib/queue/consumer.ts -> lib/odoo/adapter.ts) — unchanged integration boundary
```

This is **the existing RFQ implementation, extended** — no second RFQ path was created. `app/api/rfqs/route.ts`, `lib/rfq/service.ts`'s Turnstile/timing/honeypot ordering, `lib/rfq/repository.ts`'s atomic D1 batch, and `lib/odoo/adapter.ts`/`lib/odoo/mapping.ts` are structurally unchanged.

---

## 2. Stage A — Existing RFQ field audit

| Current RFQ field | Purpose | Needs change? | Why |
|---|---|---|---|
| `rfq_items.source` (`'selected'` already a valid `CHECK` value) | Distinguishes a catalog-linked line from a custom one | No | Already correctly modeled — the schema anticipated this; `'selected'` was simply never actually produced by any code path before this task. |
| `rfq_items.category_ref` / `product_ref` / `variant_ref` | Cross-database (DB_PUBLIC) identity references, no FK by design | No (already existed) | Were hardcoded `NULL` in every INSERT before this task. Now populated: `variant_ref = product_variant_xid` (the canonical identity), `product_ref = template_xid`, `category_ref = family_code`. |
| `rfq_items.category_label` / `product_label` / `variant_label` | Immutable human-readable snapshots | No (already existed) | `product_label`/`variant_label`/`category_label` now populated for catalog items (template title, variant spec, family name); previously always `NULL`/unused for a real catalog reference. |
| `rfq_items.unit_ref` / `unit_label` | Cross-DB UOM reference + label | No (already existed) | Deliberately left `NULL` — see §7 (Stage G gap). |
| `rfq_items.freeform_title` | Custom-item subject | No | Unchanged; a catalog-selected item never sets it (§4). |
| `rfq_items.size_text` | Free spec text (previously held `gradeOrStandard` for freeform items) | No | Left `NULL` for catalog items — `variant_label` already carries the spec; unchanged for freeform items. |
| `rfq_items.quantity_text` / `quantity_value` / `quantity_scale` | The existing single-freeform-string quantity representation | No | Reused exactly as-is (§8) — this task does not redesign quantity into a structured number+unit pair. |
| `rfq_items.description` | Per-item customer notes | No | Already supported by the schema/validator; the current single-item form still does not collect it (pre-existing gap, unrelated to this task). |
| `rfq_items.odoo_product_id` / `odoo_uom_id` | Odoo-side resolved IDs, populated by a future Odoo-side resolution step | No | Out of this task's Odoo boundary (Stage T) — left `NULL`, exactly as before. |
| `rfq_items.resolution_status` (default `'not_applicable'`) | Odoo-side product-resolution status | No | Left `'not_applicable'` for catalog items too — its real semantics belong to a future Odoo-sync decision this task is not authorized to make. |
| **`rfq_items.sku_snapshot`** | Canonical SKU at submission time | **Yes — did not exist** | The one genuinely missing field. Added via `migrations/0002_rfq_catalog_snapshot.sql` (`ALTER TABLE ... ADD COLUMN`, nullable, purely additive — DB_OPS already holds real rows in staging, verified before writing the migration). |
| `RfqItemInput` (wire payload) | What the client may send per item | Yes — new optional field | `catalogVariantXid?: string` added. Nothing else about the payload shape changed; existing `productSlug`/`freeformTitle` submissions remain fully valid and unaffected. |
| `MAX_ITEMS = 20` | Existing multi-item cap | No | Already sufficient; already exercised in this task's own multi-catalog-item test. |
| `OdooRfqItemInput` (`{label, quantityText, description}`) | Plaintext line handed to the Odoo adapter | No (type unchanged) | Only `lib/queue/consumer.ts`'s label-building query/logic was extended to incorporate `variant_label`/`sku_snapshot` when present — see §11. `lib/odoo/adapter.ts`/`lib/odoo/mapping.ts`/`lib/odoo/types.ts` were not touched at all. |

**Conclusion: no new concept was needed.** The RFQ schema already anticipated exactly this integration (`source='selected'`, `*_ref`/`*_label` triples); this task's job was almost entirely "populate what already exists," plus one narrow additive column.

---

## 3. Stable identity

The client sends **only** `catalogVariantXid` (`product_variant_xid`) for a catalog-linked item — no name, grade, dimensions, SKU, or UOM. Every displayed and persisted field is resolved server-side from DB_PUBLIC, twice: once for display (`app/[locale]/contact/page.tsx`, at page render) and once, independently, for validation at submission time (`lib/rfq/service.ts`, never trusting the first resolution or anything the browser echoes back). Neither an Odoo `product.product`/`product.template` integer ID nor a localized title/slug is ever used as identity anywhere in this flow.

`product_ref` holds the **stable** `template_xid` — never the mutable slug — for the same reason `variant_ref` holds the xid and not a display name: identity must survive a future slug/title change untouched (§9).

---

## 4. Catalog → RFQ handoff

`/{locale}/contact?variant=<product_variant_xid>` — reusing the site's actual existing RFQ route (`/contact`; there is no separate `/request` route in this repository) and its existing query-string convention. The URL carries only the stable identity, never a serialized product object. `app/[locale]/contact/page.tsx` resolves it server-side via `lib/catalog/editorial-repository.ts#resolveRfqCatalogVariant` before the page ever renders, and passes the **resolved result** (or `null`) to `EnquiryForm` — the client component never sees the raw query string.

---

## 5. Variant eligibility for RFQ selection

`resolveRfqCatalogVariant(variantXid, locale)` uses the **exact same eligibility shape** as a published template's public specification table (`docs/CATALOG_PUBLIC_ROUTES.md` §5) — commercially active, explicitly `is_public`, **and** belonging to a template that is itself currently published+approved for the requested locale:

```sql
WHERE v.xid = ? AND v.is_active = 1 AND v.is_public = 1
  AND cp.is_active = 1 AND cp.is_public = 1
  AND s.locale = ? AND s.content_quality_status = 'approved'
  AND s.published_at IS NOT NULL AND s.h1 IS NOT NULL
```

A Variant never needs its own dedicated SEO page to be RFQ-selectable — this is the identical rule that already governs whether it appears in its template's spec table, so **every variant a visitor can already see on a real product page is exactly the set that can be requested**, no more, no less. Live-verified: a real but currently non-public variant (`is_public=0`, one of the 7 sizes deliberately not marked public in the DAR-038 pilot) correctly fails resolution and is treated identically to an unknown xid.

---

## 6. Invalid / stale XID handling

**At page load** (`?variant=` present but unresolvable — unknown, malformed, archived, inactive, unpublished, or resolved against the wrong locale): the page renders its normal custom-item form with a non-sensitive, localized notice ("The selected catalog item is no longer available for selection. You can still describe your requirement manually.") — never a fabricated product, never a silent redirect to a "similar" item.

**At submission** (a `catalogVariantXid` that was well-formed but does not resolve — including a race where it became invalid between page load and submit): the entire submission is rejected with the same `VALIDATION_ERROR` shape the existing validator already uses for an unknown sample-catalog `productSlug` (`items[i].catalogVariantXid: ["unavailable"]`) — never silently downgraded into a freeform item with fabricated content, and never partially persisted.

---

## 7. UOM behavior — a genuine, documented gap (Stage G)

DB_PUBLIC exposes `allowed_commercial_units` as a **free-text display string** (e.g. `"kg, ton, branch, bundle"`), not a structured, enumerable list of customer-selectable RFQ units — and the current, approved RFQ form has never had a structured unit selector at all (`quantity_text` has always been one freeform string, e.g. `"200 تن"`). This task does **not** invent a `kg`/`ton`/`branch`/`sheet`/`meter` enumeration to plug into `unit_ref`/`unit_label` — doing so would be guessing at customer-facing units the Catalog data does not actually authorize per-Variant. `unit_ref`/`unit_label` are therefore left `NULL` for every item, catalog-linked or not, and the existing freeform `quantity_text` behavior is fully preserved unchanged. This is a real, open gap for a future phase (a structured customer-facing RFQ unit model would need to be designed on the Catalog side first), not a blocker for this integration.

---

## 8. Quantity

Unchanged. `lib/rfq/quantity.ts#parseLeadingQuantity` (existing, untouched) still does the same best-effort parse for both catalog and freeform items; `quantity_text` remains required and is the full-fidelity source of truth. No Supplier MOQ, stock availability, or pricing threshold is applied anywhere in this flow.

---

## 9. SKU / label / specification snapshots — historical safety

`lib/rfq/catalog-preselection.ts#buildCatalogItemRecord` produces a **plain, self-contained** record — every field is a resolved string/number, never a live reference back to DB_PUBLIC. Nothing in the RFQ read/display/Odoo-sync path ever re-queries DB_PUBLIC using a persisted `variant_ref` to "refresh" a label — a persisted RFQ line remains fully human-readable even after the source product's title changes, its slug changes, its SKU changes, its editorial content changes, or it is later deactivated entirely. Proven directly: a unit test builds a record, then mutates the *source* selection object afterward and asserts the already-built record is unaffected.

The canonical SKU is always the **current, server-resolved** value at submission time — the client never sends a SKU at all (§3), so there is no "client SKU vs. current SKU" reconciliation to perform; `sku_snapshot` is simply always correct by construction.

---

## 10. Multiple items / custom-item fallback

Structurally already supported (`MAX_ITEMS = 20`, D1 already stores N `rfq_items` rows per RFQ) and now **live-verified** with two real catalog items in one submission, and separately with one catalog item + one freeform item in the same submission. Custom/free-text items are completely unaffected — `productSlug`/`freeformTitle` submissions validate and persist exactly as before this task.

**The approved single-item RFQ form UI was deliberately not redesigned into a multi-line "add another item" cart.** The current, frozen-visual-baseline `EnquiryForm` collects exactly one item per submission (unchanged from before this task); a real Catalog Variant now occupies that one slot when selected, replacing the sample-catalog dropdown with a locked-identity block (removable, falling back to the normal dropdown). The backend/data contract is fully ready for a richer multi-line form (nothing here needs to change) — building that UI is explicitly out of this task's scope (see the Recommended Next Step in the DAR-039 entry).

---

## 11. DB_PUBLIC / DB_OPS boundary

`resolveRfqCatalogVariant` is the **only** place RFQ code reads DB_PUBLIC, and it is a read-only `SELECT` — no Catalog master data is ever copied into DB_OPS. What lands in `rfq_items` is a historical **evidence snapshot** (plain TEXT columns), not a live Product Master mirror. `lib/rfq/repository.ts#createRfq` still writes exclusively to DB_OPS in one atomic `db.batch()` call, unchanged.

`lib/queue/consumer.ts` (the async Odoo-sync consumer) was extended to also read `variant_label`/`sku_snapshot` when building the plaintext line summary handed to the Odoo adapter — without this, a catalog-selected item (which never sets `freeform_title`) would have produced a **blank** summary line in the synced `crm.lead.description`. This is the only other file this task changed outside `lib/rfq/`/`lib/catalog/`/the two UI components — `lib/odoo/adapter.ts`, `lib/odoo/mapping.ts`, and `lib/odoo/types.ts` (the actual Odoo integration boundary) were not touched at all. `RFQ_LINE_MAPPING`'s existing, already-documented status (`REQUIRES_CUSTOM_MODEL — not built; documented fallback in use`, `lib/odoo/mapping.ts`) is unchanged: D1 `rfq_items` remains the sole authoritative structured line-item store; Odoo still only ever receives one human-readable plaintext summary per line, never a structured product/variant reference.

---

## 12. Atomicity / idempotency

Catalog resolution happens **before** the atomic DB_OPS write assembly (mirroring the existing Turnstile-before-D1-write ordering) — a failed catalog resolution never reaches `createRfq` at all, so it can never produce a partial write. `lib/rfq/repository.ts#createRfq`'s single `db.batch()` call (RFQ header + contact + N items + status history + outbox event) is unchanged. Idempotency is unchanged and live-verified: resubmitting the identical `idempotencyKey` with a catalog-linked item returns the same reference number with zero additional rows created.

---

## 13. Abuse protection

Unchanged and live-verified still fully active for catalog-linked submissions: the honeypot field still rejects a filled value; a missing/invalid Turnstile token still returns `VERIFICATION_FAILED`; the existing same-origin/content-type/content-length/rate-limit/body-size/`MAX_ITEMS` checks all still run before catalog resolution is ever reached (catalog resolution sits in the same position content validation already occupied — after the cheap checks, alongside Turnstile, before any D1 write). No bypass endpoint was created; catalog-linked and custom submissions share the exact same `POST /api/rfqs` path and the exact same ordered check sequence.

---

## 14. Localization

`fa`/`en`/`ar` — the resolved Catalog labels shown on the request page/form follow the visitor's current locale (a Variant published only in `fa` simply does not resolve for an `en`/`ar` request, live-verified). The **persisted** identity (`variant_ref`, `product_ref`, `category_ref`) is locale-independent (a plain xid/code); only the **labels** are locale-specific snapshots. No machine translation is performed anywhere in this flow.

---

## 15. Pricing / availability boundary

Zero price, stock, availability, MOQ, or Supplier Offer data anywhere in this integration — verified by inspection of every new/changed file. The Variant spec table's new "Request this item" control is a plain text link, not a "Buy"/"Add to cart"/"Checkout" control.

---

## 16. Deliberately not built in this phase

- A structured, multi-line "add several Catalog items before submitting" UI (data contract ready; see §10).
- A structured customer-facing RFQ unit selector (Catalog-side gap; see §7).
- Any Odoo-side structured line-item model (unchanged, pre-existing, documented `REQUIRES_CUSTOM_MODEL` status).
- Any customer-resolution/matching UI, OTP, or exposure of Odoo-side match/verification/qualification state to the Website (Phase 6C boundary — untouched, not even read).
