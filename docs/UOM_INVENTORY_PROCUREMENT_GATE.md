# Unit / Inventory / Procurement Architecture Gate (Odoo-side)

**Status:** PARTIALLY RESOLVED for current Launch scope (updated 2026-09-02) — required Odoo-side validation gate, introduced 2026-09-01 as an explicit owner-directed Go-Live blocker category. **Not implemented in this repository.** No Website code, schema, or UI is added or changed by this document. See §6 for the 2026-09-02 update — read it before relying on the "OPEN" framing that follows, which is preserved as the original 2026-09-01 record.
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

## 5. Current disposition (2026-09-01 original record — superseded in part by §6)

**OPEN. No item in §2 has been resolved.** This document's own existence is the entirety of the progress made on this gate as of 2026-09-01 — it converts a previously narrow, Website-scoped "no structured UOM selector" note into an explicit, complete, named list of the real Odoo-side questions a production procurement business needs answered before the RFQ→Purchase→Fulfillment→Invoice chain can be considered commercially sound end-to-end. Resolving it is Odoo/ERP implementation work, tracked separately from this Website repository.

---

## 6. Update — 2026-09-02, Final Go-Live Readiness: items 1–9 addressed for current Launch scope; items 10–19 remain open but non-blocking

**New Odoo production state, confirmed by the project owner (not independently verified from this repository, which has no Odoo database access):** Marketplace module `19.0.27.0.0`; production gates `Phase 6J.1.2: PASS`, `Launch UOM Hardening: LIVE PASS`, `Dynamic Pricing Unit Basis: LIVE PASS`, `Settlement Dual-Sided Billing: LIVE PASS`; Launch products/policies use `actual_weight`.

**Reassessment against the 19 items in §2, applying this task's own explicit instruction ("these are NOT Launch blockers unless current Launch flows actually depend on them"):**

- **Items 1–8** (customer UOM vs. Odoo inventory UOM; kg/ton; branch/sheet/meter→nominal-kg conversion; piece semantics; coil/bundle conversion) — **substantively addressed for the current Launch product set.** `Launch UOM Hardening: LIVE PASS` together with `Dynamic Pricing Unit Basis: LIVE PASS` confirms Odoo now has a live, production-confirmed unit-basis system specifically for the units the Website's own now-aligned Launch policy offers (kg/ton/branch for Rebar, kg/ton/sheet for Plate, kg/ton/meter for SHS — `docs/RFQ_LAUNCH_UOM_ALIGNMENT.md`). Coil/bundle/piece remain explicitly deferred/non-Launch (per this task's own "known deferred scope" list) — their conversion policy (items 6–8) is correctly still unresolved, but non-blocking because the Website never offers them for a new Launch submission.
- **Item 9** (nominal vs. actual weight — where in the Odoo chain the switch happens) — **resolved for Launch.** `Settlement Dual-Sided Billing: LIVE PASS` combined with "Launch products/policies use `actual_weight`" is a direct, explicit answer: settlement for current Launch products is on actual (not nominal) weight, with a confirmed live billing mechanism. The Website's own nominal-weight disclaimer (`docs/CATALOG_PUBLIC_ROUTES.md` §7) remains correct and unchanged — nominal weight is a Website-displayed estimate only; actual settlement now has a confirmed live Odoo-side answer.
- **Items 10–19** (Supplier Offer UOM, MOQ UOM, sourcing allocation, Purchase Order snapshot, actual receipt weight, partial receipt, Vendor Bill, Customer Invoice, returns/cancellation, multi-supplier allocation) — **remain genuinely open, undocumented on the Odoo side, and are NOT reclassified as resolved by this update.** They are correctly classified as **non-blocking for the current Launch flow**, because the Website's own responsibility structurally ends at durable RFQ capture (`request submission → review and qualification → purchasing proposal → sourcing and delivery coordination`, `CLAUDE.md` §7) — every one of items 10–19 concerns a downstream, human-mediated procurement/fulfillment/accounting step the Website does not automate, encode, or depend on today. They become relevant only if/when a future phase automates PO issuance, receipt reconciliation, billing, or multi-supplier sourcing directly from Website data — none of which is in scope for this or any prior task.

**Revised disposition:** the RFQ-intake-scoped portion of this gate (items 1–9) is no longer a genuine current-launch blocker — the Website's UoM policy is aligned with and validated against real, confirmed, live Odoo production gates covering exactly this scope. The downstream-procurement portion (items 10–19) remains open Odoo/ERP documentation work, tracked here for future reference, but does not block declaring the Website ready for the RFQ-intake-only Launch scope this project has consistently defined. This is **not** a claim that all 19 items are resolved, and does not substitute for the project owner's own explicit sign-off on any future phase that would depend on items 10–19.
