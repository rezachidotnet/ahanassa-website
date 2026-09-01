# Unit / Inventory / Procurement Architecture Gate (Odoo-side)

**Status:** OPEN — required Odoo-side validation gate, introduced 2026-09-01 as an explicit owner-directed Go-Live blocker category. **Not implemented in this repository.** No Website code, schema, or UI is added or changed by this document.
**Scope:** This document exists to name and describe a real, unresolved commercial/operational architecture gap that lives entirely on the Odoo/ERP side of the system. It does not authorize, specify, or begin implementation of any Odoo module, workflow, or field. It exists so this gate is not silently forgotten between the Website's own Go-Live readiness and a real `ahanassa.com` cutover.
**Owner:** This gate must be resolved (or explicitly waived) by the project owner in coordination with the Odoo/ERP implementation track — not by the Website repository or by Claude Code acting on the Website alone.

---

## 1. Why this gate exists

The Website's RFQ flow already has a **documented, deliberate, non-fabricating gap**: it collects only a single freeform quantity string per line (`quantity_text`, e.g. `"200 تن"`) and, on the Odoo-sync path, does a best-effort keyword match against one of 8 controlled UOM codes (`kg`/`ton`/`branch`/`sheet`/`meter`/`coil`/`bundle`/`piece`) — see `docs/CATALOG_RFQ_INTEGRATION.md` §7 and `docs/ODOO_RFQ_API_INTEGRATION.md` "UOM". When no keyword matches, the Website correctly refuses to guess (`UNRESOLVED_UOM`, a hard sync blocker) rather than fabricating a unit.

That gap was previously scoped narrowly, as a Website-side "no structured unit selector yet" issue. It is broader than that: **the customer-facing request unit and Odoo's own internal inventory/costing/procurement UOM chain are two different systems that have never been reconciled**, and the Website cannot resolve that reconciliation from its side — it is Odoo/ERP business logic, supplier-contract logic, and warehouse/accounting practice, none of which the Website owns or can see.

This document exists to make that reconciliation an explicit, named, trackable gate — not to close it.

---

## 2. What this gate must cover (minimum scope)

Every item below is a real open question about how a customer-stated request quantity/unit becomes a correct, auditable chain of Odoo-side commercial and financial records. None of these are answered by the current Website RFQ implementation, and none should be guessed at here:

1. **Customer requested UOM vs. Odoo inventory UOM** — the mapping (if any) between what a customer types (a free-text quantity + a best-effort-inferred unit) and the UOM Odoo actually tracks stock/cost in for a given product.
2. **kg / ton** — whether these are simple linear conversions for every product family, or whether some families price/track by piece-equivalent weight instead.
3. **branch → nominal kg** — for long products (rebar, beams, pipe) sold by branch/length: the conversion policy from "N branches of size X" to a weight figure, and which weight (nominal per `docs/CATALOG_PUBLIC_ROUTES.md` §7's own disclaimer, or another) is authoritative for costing/invoicing.
4. **sheet → nominal kg** — the equivalent conversion for flat products (plate/sheet) sold by sheet count.
5. **meter → nominal kg** — the equivalent conversion for products that may be requested by running length.
6. **piece semantics** — what "piece" means per product family (a single branch/sheet/coil/bundle vs. a generic countable unit), and whether that meaning is consistent across the catalog or must be resolved per template/group.
7. **coil conversion policy** — coil products' weight/length relationship and how a customer's coil-count request becomes a costable quantity.
8. **bundle conversion policy** — the same question for bundled products (e.g. small-diameter rebar bundles) — bundle composition, nominal weight per bundle, and whether bundle size is fixed or product-specific.
9. **Nominal vs. actual weight** — the already-documented Website disclaimer (`docs/CATALOG_PUBLIC_ROUTES.md` §7, "nominal/theoretical, not actual delivered or weighbridge-settlement weight") establishes that a difference exists; this gate must define *where in the Odoo chain* the switch from nominal to actual weight happens, and how that reconciliation is recorded.
10. **Supplier Offer UOM** — whether a Supplier's own quoted/offered UOM matches the customer-facing UOM, and if not, the conversion/reconciliation step between them.
11. **MOQ UOM** — whether a Supplier or product Minimum Order Quantity is expressed in the same UOM the customer requests in, and how a mismatch is surfaced/handled.
12. **Sourcing allocation** — when a single RFQ line's requested quantity is fulfilled from more than one sourcing decision (see item 18), how quantity/UOM is allocated and tracked per source.
13. **Purchase Order snapshot** — what UOM/quantity value is actually written onto a real Purchase Order once a sourcing decision is made, and whether/how it's traceable back to the original customer-facing request line.
14. **Actual receipt weight** — how a real warehouse/weighbridge receipt (which will differ from nominal weight, per item 9) is captured and reconciled against the Purchase Order quantity.
15. **Partial receipt** — the policy for a Purchase Order/goods receipt that arrives in more than one delivery, and how quantity/UOM is tracked across partial receipts.
16. **Vendor Bill** — how the eventual Vendor Bill's quantity/UOM/amount reconciles against the actual receipt (item 14) versus the original Purchase Order snapshot (item 13).
17. **Customer Invoice** — the equivalent question on the sales side: what quantity/UOM/amount is actually invoiced to the customer, and how it reconciles against the original RFQ request, any quotation, and actual fulfillment.
18. **Returns / cancellation** — the quantity/UOM handling when a partial or full return or cancellation occurs at any point in this chain (RFQ → sourcing → PO → receipt → bill → invoice).
19. **Multi-supplier allocation** — when a single customer request is fulfilled by sourcing the same product from more than one Supplier (different lots, different weights, potentially different actual UOM granularity), how the aggregate customer-facing quantity is reconciled against multiple supplier-side records.

---

## 3. What this gate explicitly does not do

- It does not implement any Odoo module, workflow, custom field, or UI.
- It does not change the Website's own RFQ payload, validation, or UOM-inference logic (`lib/rfq/quantity.ts`, `lib/odoo/rfq-payload-mapper.ts#inferOdooUomCode`) — those remain exactly as documented in `docs/CATALOG_RFQ_INTEGRATION.md` §7 and `docs/ODOO_RFQ_API_INTEGRATION.md`, including their existing non-fabrication guarantee (`UNCONVERTIBLE_QUANTITY`/`UNRESOLVED_UOM` fail the whole RFQ rather than guessing).
- It does not invent a resolution to any of the 19 questions in §2 — every one of them requires an actual Odoo/ERP business decision, made by people with visibility into supplier contracts, warehouse practice, and accounting policy that this repository has no access to.
- It does not block Website Catalog/RFQ functionality that already works correctly today (structured RFQ intake, Catalog browsing, Catalog→RFQ preselection) — those are Website-side concerns, already implemented, tested, and now (per this same Go-Live Readiness task) publishing real content in production.

## 4. What this gate does block

Per explicit owner instruction (2026-09-01): **`GO-LIVE READY` may not be declared for the Ahan Asa Website until this gate is either marked PASS (the 19 items in §2 have been resolved, documented, and implemented on the Odoo side to the owner's satisfaction) or the project owner explicitly determines, as an owner-level decision, that this gate is not a launch blocker** (e.g., because Phase 1 launch scope is deliberately limited to RFQ intake and does not yet reach the Purchase Order/receipt/Vendor Bill/Customer Invoice stages this gate covers).

This is a **process gate on the go-live decision**, not a code gate — it does not fail any test, build, or deployment check in this repository. See `docs/GO_LIVE_READINESS.md` §"Go-Live Readiness Gate" for how this gate's open status is reflected in the overall verdict.

## 5. Current disposition

**OPEN. No item in §2 has been resolved.** This document's own existence is the entirety of the progress made on this gate as of 2026-09-01 — it converts a previously narrow, Website-scoped "no structured UOM selector" note into an explicit, complete, named list of the real Odoo-side questions a production procurement business needs answered before the RFQ→Purchase→Fulfillment→Invoice chain can be considered commercially sound end-to-end. Resolving it is Odoo/ERP implementation work, tracked separately from this Website repository.
