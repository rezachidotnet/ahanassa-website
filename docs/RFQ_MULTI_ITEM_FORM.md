# Multi-Item RFQ / Purchase-List Form

**Status:** Active — canonical for the redesigned `/{locale}/contact` request form: a true 1..20-line procurement-list editor, mixing Catalog-linked and custom/free-text lines in one submission.
**Established:** 2026-09-02, extending the existing RFQ backend (DAR-026/030/039/041) and the single-item form it replaces. Visual direction reconstructed from `design-reference/rfq-multi-item-v1.png` (reference only — never rendered in the page) using the current Ahan Asa design system (navy/copper/cream tokens, existing header/footer, existing UI components).
**Scope:** `components/contact/enquiry-form.tsx`, `components/contact/rfq-item-row.tsx`, `lib/rfq/uom.ts`, `lib/rfq/catalog-selector.ts`, `lib/rfq/item-row-validation.ts`, `lib/catalog/editorial-repository.ts` (`listRfqSelectableCatalogItems` addition), `app/[locale]/contact/page.tsx`. Does not implement Pricing, Customer Authentication/Portal, checkout/cart semantics, or attachment upload.

---

## 1. UX architecture

```
components/contact/enquiry-form.tsx        (orchestrator: customer info, rows array state,
                                              submit/Turnstile/idempotency — all unchanged from
                                              the prior single-item form except items is now N)
  -> lib/rfq/item-row-validation.ts          (pure row-state model: RfqRow[], factories,
                                              per-row client pre-check, wire-payload builder)
  -> lib/rfq/uom.ts                          (8 canonical unit codes/labels, quantity+unit
                                              composition into the existing quantityText field)
  -> lib/rfq/catalog-selector.ts             (pure grouping of the shared Catalog list into
                                              Category -> Product -> Variant for the cascade)
  -> components/contact/rfq-item-row.tsx     (one row's UI — rendered twice, table + card,
                                              by CSS visibility only, one state source)
```

Rows are **data-driven** (`items: RfqRow[]`), never `item1`/`item2`/... discrete fields — the same row component and the same `validateRfqRow`/`buildRfqItemInput` functions handle row 1 and row 20 identically.

---

## 2. Maximum line count — one canonical limit

`MAX_ITEMS = 20` is defined exactly once, in `lib/rfq/validation.ts` (pre-existing, unchanged), and imported everywhere it's needed — the client form (`components/contact/enquiry-form.tsx`), and this document's own test suite (`lib/rfq/validation.test.ts`'s 20-line proof tests). **Nothing hardcodes the number `20` a second time.** The UI supports 1–20 rows; reaching 20 disables "Add row" with an explanatory message (`به حداکثر تعداد ردیف (۲۰) رسیده‌اید` / "You've reached the maximum of 20 rows") rather than silently failing. Live-verified: added rows up to exactly 20/20, confirmed the Add button visually disables and a 21st click produces no new row.

Removing the last remaining row is prevented (`canRemove={rows.length > 1}` on every row's Remove button) — the form always has at least 1 row, matching the backend's own `items.length === 0` rejection.

---

## 3. Catalog item UX — Category → Product → Variant cascade

Each Catalog-mode row has three selects sharing one publication-safe data source, fetched **once** per page render:

```
app/[locale]/contact/page.tsx
  -> lib/catalog/editorial-repository.ts#listRfqSelectableCatalogItems(locale)
     (new — same eligibility predicate as the existing resolveRfqCatalogVariant:
      commercially active + explicitly public Variant, belonging to a template
      that is itself currently published+approved for the locale)
  -> passed as one `catalogItems` prop to <EnquiryForm>
  -> lib/rfq/catalog-selector.ts#groupCatalogItemsForSelector (client-side, pure)
  -> shared across every row's Category/Product/Variant selects
```

No per-row network request — adding a 2nd, 10th, or 20th Catalog row never re-fetches or re-downloads anything (§9 Performance). The **only** field actually sent to the server for a Catalog row is `catalogVariantXid` (the real `product_variant_xid`) — the Category/Product/Variant selects are UI-only filtering state (`lib/rfq/item-row-validation.ts#RfqCatalogRowFields.categoryCode`/`templateXid`), never transmitted. SKU is shown as a small read-only snapshot line under the Variant select (`کد کالا: ...`) — display only, never an editable identity field, matching the existing "SKU is audit-only, never relational identity" rule.

**A genuine unpublished/archived/wrong-locale/nonexistent Variant is structurally unreachable from this selector** — every value in every dropdown comes from the same DB_PUBLIC query the existing publication-safety rules already govern (`docs/CATALOG_PUBLIC_ROUTES.md` §5). The server independently re-resolves `catalogVariantXid` against DB_PUBLIC at submission time regardless (`lib/rfq/service.ts`, unchanged) — this UI-level safety is defense-in-depth, not the authoritative gate.

Live-verified against real local DB_PUBLIC data (12 published Variants across 3 templates): Category select correctly lists real categories ("Flat Products", "Hollow Sections & Profiles", "Long Products"); selecting one correctly populates the Product (template) select; selecting a template correctly populates the Variant (size) select with real sizes; selecting a variant correctly shows its real SKU snapshot.

---

## 4. Custom item UX

The Category select's trailing option, `سایر / کالای سفارشی` ("Other / custom item"), switches that row from `mode: "catalog"` to `mode: "custom"` — Product/Spec become free-text inputs (`productTitle`, `sizeSpec`) instead of selects. Selecting a real category switches back. Quantity/Unit/Notes are preserved across the switch; only the identity fields reset — nothing is lost by exploring both paths on the same row.

A custom row never sends `catalogVariantXid`; it sends `freeformTitle` (+ `gradeOrStandard` from `sizeSpec` when provided) — the exact existing wire shape `lib/rfq/validation.ts`'s freeform branch already accepts, unchanged. No fabricated Catalog XID is ever produced for a custom item.

**Design decision — the legacy sample-catalog dropdown (`lib/content/catalog-sample.ts`) is not reused here.** The prior single-item form's "Category → sample product" dropdown drew from a static, disclosed-as-sample dataset (DAR-020: "not a published catalog"). Placing that dataset in a second dropdown alongside the now-real DB_PUBLIC categories in the same cascading control risked implying parity between real and sample data in a genuinely multi-line procurement context. Free-text entry for a custom row carries no such risk and is equally valid against the existing wire contract (`freeformTitle` alone, no `productSlug`, is a fully supported existing path). `lib/content/catalog-sample.ts` is untouched and not imported by the new form.

---

## 5. Catalog → RFQ Variant Preselection — still fully supported, no longer forces a single item

`/{locale}/contact?variant=<product_variant_xid>` (docs/CATALOG_RFQ_INTEGRATION.md, unchanged resolution logic) now seeds **row 1** of a full multi-row form instead of being the form's only possible line:

- `lib/rfq/item-row-validation.ts#createCatalogRowFromSelection` builds a Catalog row already carrying the resolved `categoryCode`/`templateXid`/`variantXid` — quantity/unit/notes are left blank for the customer, never guessed.
- The visitor can freely add up to 19 more rows (Catalog or custom, mixed), or remove the preselected row entirely (the same Remove control every row has — no special-cased UI).
- An invalid/stale `?variant=` (unknown, archived, unpublished, wrong locale) still degrades to the normal empty first row plus the existing non-sensitive notice — unchanged.

Live-verified against a real published local Variant: navigating to `/contact?variant=ahanassa_marketplace.product_sh_hr_s355jr_s10x1500x6000` correctly seeded row 1 with "ورق گرم‌نورد S355JR" / "10×1500×6000" / SKU `AA-SH-HR-S355JR-S10X1500X6000`, counter showed `1 / 20`, quantity was blank, Remove was available. Filling quantity and submitting produced a real `201` and a real D1 row with `source='selected'`, the correct `variant_ref`, and every label server-resolved — not client-echoed.

---

## 6. Quantity / UOM

The wire contract (`RfqItemInput.quantityText: string`) is **unchanged** — still one freeform string, matching `lib/rfq/quantity.ts#parseLeadingQuantity`'s existing server-side leading-number extraction and `lib/odoo/rfq-payload-mapper.ts#inferOdooUomCode`'s existing keyword-match UOM inference. This task does not touch either.

What changed is the **UI**: every row now has a real numeric Quantity input and a real Unit select (the 8 Odoo-contract codes — `kg`/`ton`/`branch`/`sheet`/`meter`/`coil`/`bundle`/`piece` — localized per `lib/rfq/uom.ts#RFQ_UOM_LABELS`). `lib/rfq/uom.ts#composeQuantityText` combines both into the exact string the existing parser/inference already understand (e.g. `"5000 کیلوگرم"` → `parseLeadingQuantity` → `{value: 5000, scale: 0}`; `inferOdooUomCode` → `"kg"`), using the **same literal keyword strings** `inferOdooUomCode`'s dictionary matches — verified by reading that file directly, not assumed. Persian/Arabic-Indic digits are normalized client-side via the same `normalizeDigits` function the server already uses, so `۵۰۰۰` composes identically to `5000`.

**No backend change was made or needed.** This is a purely additive UX improvement layered onto an unchanged contract — the structured quantity/unit gap documented in `docs/CATALOG_RFQ_INTEGRATION.md` §7 (no per-Variant authoritative allowed-unit set in DB_PUBLIC) is unchanged and not solved here; the Website still cannot claim a specific Variant only accepts certain units. `composeQuantityText` never fabricates a quantity — an empty, non-numeric, zero, or negative value returns `null`, and the row is treated as invalid (§7) rather than submitted with a guessed number.

---

## 7. Validation UX

Client-side, per-row pre-checks (`lib/rfq/item-row-validation.ts#validateRfqRow`) are a **conservative subset** of the server's own authoritative validation — never stricter, never contradictory (this task's own "UI validation must match backend policy"). They exist only to give actionable, row-specific feedback before a network round-trip; the server re-validates and re-resolves everything independently regardless (unchanged `lib/rfq/service.ts`/`lib/rfq/validation.ts`).

On submit attempt: every row is checked; the first invalid row's element is scrolled into view and its first invalid field is focused (`scrollToRow` — resolves whichever of the table-row/card-row DOM twin is actually visible via `offsetParent`, since both exist in the DOM simultaneously). An error summary lists every offending row by number and reason, e.g. `ردیف 7: مقدار را وارد کنید` (Row 7: enter a quantity) / `ردیف 12: محصول را انتخاب کنید` (Row 12: select a product) — matching this task's own literal phrasing examples. No raw backend error is ever surfaced to the customer.

Live-verified: submitting a 20-row form with only row 1 filled produced exactly the expected error summary (rows 2–20, both `product` and `quantity` flagged for the still-empty catalog rows), and focus/scroll correctly landed on row 2's first field.

**Customer Information field requirements match the actual current backend exactly, not the visual reference's own asterisk placement.** `lib/rfq/validation.ts` requires `fullName`/`companyName`/`email`; `phone` is optional (validated only if present) — this is the real, already-shipped policy, unchanged by this task. The visual reference marks both phone and email as required; the form implemented here follows the real backend instead, per this task's own explicit "UI validation must match backend policy — do not create conflicting validation rules" instruction.

---

## 8. Desktop / mobile layout

`components/contact/rfq-item-row.tsx` renders **once per row per breakpoint** — a real `<tr>` (`layout="table"`, `hidden lg:table-row`... implemented as the whole table wrapper being `hidden lg:block`) and a stacked `<div>` card (`layout="card"`, wrapped `lg:hidden`) — both from the same row state, same `onChange`/`onRemove` handlers, same validation, so there is exactly one source of truth and no duplicated field logic; only the two DOM shapes differ. Field `id`s are prefixed with the layout (`rfq-item-table-{i}-product` / `rfq-item-card-{i}-product`) since both exist in the DOM simultaneously (one CSS-hidden) and ids must stay unique.

The mobile card stacks: row number + Remove action, Category, Product, Spec, Unit+Quantity (2-column), Notes — comfortably usable at 10–20 rows (each card is self-contained; no horizontal scrolling, no 7-column squeeze). Live-verified: at a narrow viewport, the preselected row rendered correctly as a card with all fields present and the Remove control reachable.

---

## 9. Performance

- The Catalog selector data (`listRfqSelectableCatalogItems`) is fetched **exactly once**, server-side, per page render — never per row, never per Catalog-row-add. Confirmed by construction: `catalogItems` is a single prop passed once into `<EnquiryForm>`; `groupCatalogItemsForSelector` runs client-side over the already-fetched array.
- No unpublished/archived/private Catalog data is ever fetched — `listRfqSelectableCatalogItems` uses the identical `WHERE` predicate as the existing `resolveRfqCatalogVariant`/`listPublishedCatalogTemplates`.
- No heavy form-state dependency was added — plain React `useState`/array operations, matching the existing project convention (no `react-hook-form`/Formik in this codebase).
- A 20-row submission's JSON payload is small (well under the existing 20 KB `MAX_BODY_BYTES` limit for realistic field lengths) — unchanged, pre-existing server-side limit, not touched.

---

## 10. Backend payload — the existing contract, unchanged

`lib/rfq/item-row-validation.ts#buildRfqItemInput` is the single place a row becomes an `RfqItemInput` (`lib/rfq/types.ts`, unchanged) — never a parallel payload shape. Verified field-for-field:

| Row mode | Wire fields sent |
|---|---|
| Catalog | `catalogVariantXid`, `quantityText` (composed), `description` (from Notes, optional) |
| Custom | `freeformTitle`, `gradeOrStandard` (from Spec, optional), `quantityText` (composed), `description` (from Notes, optional) |

The form's `handleSubmit` builds `items: RfqItemInput[]` from every row and POSTs the exact same shape `POST /api/rfqs` already accepts (`app/api/rfqs/route.ts`, `lib/rfq/service.ts`, `lib/rfq/validation.ts` — none of these three files were touched). Server-side validation, Turnstile verification, honeypot/timing checks, idempotency, atomic DB_OPS persistence (`lib/rfq/repository.ts`), the outbox, the Queue, and the Odoo RFQ API handoff (DAR-041) are all **completely unmodified** by this task.

---

## 11. Attachment boundary — deliberately omitted

The visual reference includes an "Upload purchase-list file (optional)" section. **No secure RFQ attachment upload exists end-to-end in this repository** (confirmed by inspection — no upload endpoint, no R2 binding wired for it, `PROJECT_OVERRIDES.md` §8 attachment scanning remains an unresolved pre-production gate). Per this task's own explicit instruction, the section is **omitted entirely** rather than rendered as a disabled/future-state placeholder — no file input of any kind exists in the new form, so there is no control that could misleadingly appear to accept a file. Implementing attachment upload is out of this task's scope and is not scope-crept in here.

---

## 12. Turnstile — unchanged

The exact existing Turnstile flow is preserved: widget render/reset lifecycle, `TURNSTILE_RFQ_ACTION`, single-use token discipline (a rejected/consumed token is never reused — `resetTurnstile()` fetches a fresh one), submit disabled while `turnstileSiteKey` is configured and no token is present yet, server-side `verifyTurnstileToken` remains the sole authority (never bypassed client-side). Live-verified end-to-end using Cloudflare's official always-passing test key pair in a temporary, non-committed `.env.local` (deleted immediately after this pass, matching the established DAR-039 precedent) — both a pure-Catalog submission and a mixed Catalog+custom submission produced a real `201`, a real reference number, and a real D1 row with every field correctly persisted.

---

## 13. Pricing / availability / checkout boundary

No price, discount, availability, stock, MOQ, or Supplier data appears anywhere in the new form or its supporting modules (verified by inspection of every new/changed file). No "Add to cart"/"Checkout"/"Order now"/"Pay"/"Basket" language or semantics — every label uses "request"/"submit for review" framing (`ارسال برای بررسی`), matching the existing procurement-request (not e-commerce) product positioning (`CLAUDE.md` §7).

---

## 14. Login/Register — out of scope, untouched

The visual reference's login/register UI is not implemented — the existing, approved global `SiteHeader`/`SiteFooter` (`components/layout/`) are used exactly as before, unmodified. No authentication, account, or Customer Portal code was added anywhere in this task.

---

## 15. Accessibility

- Customer Information fields use a `<fieldset>`/`<legend>` grouping; the items table uses a real semantic `<table>` (desktop) with a proper `<thead>` for screen readers, and a plain stacked-card structure (mobile) — not a div-grid pretending to be a table.
- Every input/select has a real `<label>` or `aria-label`; the Remove button on every row has an `aria-label` including the row number.
- Invalid fields get `aria-invalid` and a visible red border; the error summary is a `role="alert"` region; the row counter badge is `aria-live="polite"` so screen-reader users hear it update as rows are added/removed.
- Add/Remove are plain `<button type="button">` elements — fully keyboard-operable, no custom widget semantics needed.
- RTL/LTR: unchanged existing locale-driven `dir` handling; SKU snapshots are explicitly `dir="ltr"` within an RTL row (matching the existing single-item form's own established pattern for the same field).

---

## 16. Deliberately not built in this phase

- Structured, per-Variant authoritative allowed-unit enforcement (Catalog-side gap, unchanged — see §6 and `docs/CATALOG_RFQ_INTEGRATION.md` §7).
- RFQ attachment upload (§11).
- Customer Authentication / Portal / login / register (Phase 2, untouched).
- Any Odoo-side structured line-item model beyond the existing RFQ API v1 handoff (DAR-041, unchanged).
