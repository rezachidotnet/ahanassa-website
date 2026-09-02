# RFQ Launch UoM Contract Alignment

**Status:** Active — canonical for the Website-side RFQ Launch unit-of-measure (UoM) policy: what units a customer may select per product/Custom row, how it is enforced server-side, and how it is serialized deterministically to Odoo.
**Established:** 2026-09-02, branch `fix/rfq-launch-uom-policy`, on top of the existing multi-item RFQ form (`docs/RFQ_MULTI_ITEM_FORM.md`) and the Odoo RFQ API handoff (`docs/ODOO_RFQ_API_INTEGRATION.md`).
**Source:** Odoo Ahan Asa Marketplace production `19.0.27.0.0`. Confirmed production gates: `LAUNCH UOM HARDENING LIVE: PASS`, `DYNAMIC PRICING UNIT BASIS LIVE: PASS`, `SETTLEMENT DUAL-SIDED BILLING LIVE: PASS`. Odoo's public RFQ API no longer accepts `coil`/`bundle`/`piece` as normal Website request UoMs for Launch.
**Scope:** Website-side alignment only. Does not modify Odoo. Does not change DNS/Vercel/Basic Auth. Does not implement Pricing or Customer Portal. Does not add any new procurement unit.

---

## 1. Starting State

Branch `fix/rfq-launch-uom-policy`, clean working tree, HEAD at `1dbbbc1` ("chore: prepare website go-live readiness", the prior Go-Live Readiness commit) — verified via `git status`/`git branch --show-current`/`git log -5 --oneline`/`git diff --check` before any file was touched.

## 2. Previous Website UoM Behavior

Audited before changing anything:

- `lib/rfq/types.ts#RfqItemInput` had **no unit field at all** — only `quantityText: string`, a single freeform string (e.g. `"200 تن"`).
- `lib/rfq/item-row-validation.ts#RfqRowFields` already collected a **structured** `quantityValue: string` + `unit: RfqUomCode` per row client-side, but `buildRfqItemInput` **flattened both into the single `quantityText` string** (`lib/rfq/uom.ts#composeQuantityText`) before ever reaching the wire — the structure existed in UI state and was discarded before submission.
- `lib/rfq/validation.ts` never validated a unit at all — no field, nothing to check.
- `lib/odoo/rfq-payload-mapper.ts#inferOdooUomCode` re-derived a UoM code from `quantityText` via **best-effort keyword matching** (`UOM_KEYWORDS`), at Queue-consumption time — asynchronously, **after** the RFQ was already durably persisted to D1. This meant: (a) an invalid product/unit combination (e.g. a Rebar variant requested in "sheet") could be durably persisted with no rejection at submission time, and (b) the eventual Odoo-bound `uom` value depended on which keyword happened to match inside free text, not a structured, product-aware decision.
- `components/contact/rfq-item-row.tsx`'s Unit select unconditionally offered **all 8 codes** (`kg`/`ton`/`branch`/`sheet`/`meter`/`coil`/`bundle`/`piece`) on every row regardless of the selected product — a Rebar row and a Plate row offered an identical, unfiltered list.
- `lib/rfq/uom.ts#DEFAULT_RFQ_UOM` was `"piece"` — now a Launch-deferred unit.
- `docs/RFQ_MULTI_ITEM_FORM.md` §16 explicitly listed "structured, per-Variant authoritative allowed-unit enforcement" as **deliberately not built** — the correct call at the time (no confirmed Odoo policy existed), now superseded by this task.

## 3. Odoo Launch Contract

Confirmed by the project owner (task's own "AUTHORITATIVE ODOO STATE" section), Odoo `19.0.27.0.0`:

| Product group | Allowed Launch UoMs |
|---|---|
| Rebar | kg, ton, branch |
| Plate | kg, ton, sheet |
| SHS | kg, ton, meter |
| Custom/free-text | kg, ton |

`coil`/`bundle`/`piece` explicitly unsupported for Launch — Odoo's public RFQ API no longer accepts them as normal Website request UoMs. Not claimed removed from Odoo's internal schema entirely — only unsupported for normal Website Launch intake (`docs/ODOO_RFQ_API_INTEGRATION.md`'s own restated framing).

## 4. Canonical Website Policy

One new module, `lib/rfq/uom-policy.ts` — pure, D1-free, the single place this business rule is expressed:

```ts
LAUNCH_GROUP_UOM_POLICY = {
  REBAR:       ["kg", "ton", "branch"],
  SHEET_PLATE: ["kg", "ton", "sheet"],
  SHS:         ["kg", "ton", "meter"],
}
CUSTOM_ITEM_LAUNCH_UOMS = ["kg", "ton"]
LAUNCH_DEFERRED_UOMS    = ["coil", "bundle", "piece"]
```

Keyed by `product_variants.group_code` — the least brittle stable Product Master identifier that exactly matches Odoo's own Launch groupings (never a translated display name, never derived from slug text). "Group" was chosen over "family" (broader — `LONG_PRODUCTS` also covers Beams, which have no Launch policy) and over "form" (narrower than the policy needs — Rebar's policy applies uniformly across Plain/Ribbed forms). `SHEET_PLATE` covers both the published Hot Rolled Plate form and the unpublished Hot Rolled Sheet form — a physical "sheet count" is equally meaningful for both, and only Plate is live today.

An unconfirmed/unlisted group (Beams, RHS, Seamless Pipe — none currently published, none in the task's own policy table) falls back to the same conservative `[kg, ton]` set as Custom items — a defensive Website-side default, never a guessed product-specific unit, documented in the module's own comments as provisional pending a real Odoo-confirmed policy.

`getAllowedUomsForCatalogGroup`, `isUomAllowedForCatalogGroup`, `isUomAllowedForCustomItem`, `getDefaultUomForCatalogGroup` are the exported functions every other module (validation, service, row UI) imports from — nothing re-encodes the mapping a second time.

## 5. Catalog Product-Aware Units

`components/contact/rfq-item-row.tsx`'s Unit select now renders only `allowedUnits` — computed per row from the resolved Template's `groupCode` (added to `CatalogTemplateGroup`/`RfqCatalogSelection`/`lib/catalog/editorial-repository.ts`'s two Catalog reads: `resolveRfqCatalogVariant`, `listRfqSelectableCatalogItems`). No product chosen yet → the conservative `kg`/`ton` default (same rationale as Custom). Live-verified against real local DB_PUBLIC data: the default (no-product) row's rendered `<select>` contains exactly two `<option>`s, `kg` and `ton` — no branch/sheet/meter/coil/bundle/piece.

Display labels remain fully localized (`RFQ_UOM_LABELS`); serialized codes remain the fixed ASCII strings (`kg`/`ton`/`branch`/`sheet`/`meter`) — display and wire value are never conflated, matching the task's own explicit "do not serialize Persian text" requirement.

## 6. Custom Item Units

Custom/free-text rows are hard-restricted to `kg`/`ton` at three independent layers: the row UI only ever renders those two options for a `mode: "custom"` row; `lib/rfq/validation.ts` rejects any other unit for a `source: "freeform"` item (`unsupported_for_custom_item`) purely format-side, no DB access needed; and the UI never lets a stale wider selection survive switching a row from Catalog to Custom (`withUnitResetIfInvalid`, §9). Reason (per the task's own instruction): without a real Catalog Variant identity, there is no authoritative nominal conversion factor for branch/sheet/meter — never guessed.

## 7. Server-Side Enforcement

Not UI-only. Two layers, matching the existing format-vs-DB-resolution split already established in this codebase:

- **`lib/rfq/validation.ts`** (pure, D1-free): `unit` is now a required field on every item; must be one of the 8 known `RFQ_UOM_CODES` (format check); for a freeform/sample-catalog item (`source: "freeform"`), additionally checked against `isUomAllowedForCustomItem` — the Custom-only kg/ton restriction, which needs no DB access.
- **`lib/rfq/service.ts`** (after `resolveRfqCatalogVariant` resolves the real DB_PUBLIC variant): the resolved `selection.groupCode` is checked against `item.unit` via `isUomAllowedForCatalogGroup` — Rebar+sheet, Plate+meter, SHS+branch etc. are all rejected here, before any D1 write, in the same position/ordering the existing `catalogVariantXid`-unresolvable check already occupies (after Turnstile, before `createRfq`).

A handcrafted `POST /api/rfqs` cannot bypass either layer — both run unconditionally on every submission, independent of any client-side state. See §11 for live proof.

## 8. Catalog Classification Source

No second hard-coded product-family map was introduced. `group_code` already exists on `product_variants` (synced from Odoo's own Product Master, unchanged sync path) — the only new work was exposing it on the two existing RFQ-facing Catalog reads (`RfqCatalogSelection.groupCode`) and the client-side grouping shape (`CatalogTemplateGroup.groupCode`). No private Supplier data is exposed; no new Odoo synchronous lookup was added — the architecture remains Browser → Website → DB_PUBLIC validation → DB_OPS → Queue → Odoo, page-time-Odoo-free, unchanged.

## 9. Preselection

`/{locale}/contact?variant=<product_variant_xid>` unchanged in mechanism (`docs/CATALOG_RFQ_INTEGRATION.md`). The seeded row now correctly offers only its real product's allowed units (since `groupCode` flows through the same resolution). Each row's `allowedUnits` is computed independently per row from its own current selection — never shared/global state — so a 20-line mixed submission has each row correctly governed by its own product.

Changing a row's Category or Template (`handleCategoryChange`/`handleTemplateChange` in `rfq-item-row.tsx`) now runs `withUnitResetIfInvalid`: if the currently-selected unit is not in the new context's allowed set, it is reset to that context's first (default, `kg`) allowed unit — never left as a silently-invalid stale value. A still-valid unit (e.g. `kg`, valid everywhere) survives a product change unchanged, avoiding an unnecessary reset when none is needed.

## 10. Mixed RFQ

Unchanged multi-item architecture (`MAX_ITEMS = 20`, still the single canonical constant in `lib/rfq/validation.ts`, untouched). A single submission may freely mix Rebar+branch, Plate+sheet, SHS+meter, Rebar+ton, Custom+kg, etc. — each row/item independently resolved and policy-checked; no cross-row interference. Row add/remove, Catalog+Custom mode switching, preselection, Turnstile, and idempotency are all unmodified code paths.

## 11. Invalid Bypass Tests

Live, local, direct `POST /api/rfqs` against the real dev server and real local DB_PUBLIC (12 published Variants, real Rebar/Plate/SHS group_codes) — not merely a unit test, since the Catalog-group check requires real DB resolution:

| Attempt | Result |
|---|---|
| Catalog Rebar (`product_rb_aj340_d16_l12`) + `sheet` | `{"ok":false,"code":"VALIDATION_ERROR","fieldErrors":{"items[0].unit":["unsupported_for_product"]}}` |
| Catalog SHS (`product_pf_shs_s80x80x4_l6`) + `branch` | `{"ok":false,"code":"VALIDATION_ERROR","fieldErrors":{"items[0].unit":["unsupported_for_product"]}}` |
| Custom + `branch` | `{"ok":false,"code":"VALIDATION_ERROR","fieldErrors":{"items[0].unit":["unsupported_for_custom_item"]}}` |
| Custom + `coil` | `{"ok":false,"code":"VALIDATION_ERROR","fieldErrors":{"items[0].unit":["unsupported_for_custom_item"]}}` |

Verified before/after via direct D1 query: `rfqs` row count and `integration_outbox` row count both stayed at their baseline (5/5, local dev data) across all 4 attempts — **zero RFQ created, zero outbox event created, zero Queue publication** for any invalid request.

## 12. Serialization

Live proof, same local environment: a valid `Rebar (product_rb_aj340_d16_l12) + branch, quantity 100` submission succeeded (`{"ok":true,"reference":"AA-RFQ-SDWKHKKH","status":"received"}`) and persisted exactly:

```text
variant_ref:    ahanassa_marketplace.product_rb_aj340_d16_l12
unit_ref:       branch
unit_label:     شاخه
quantity_value: 100
quantity_scale: 0
quantity_text:  "100 شاخه"
```

`unit_ref`/`unit_label` (`rfq_items` columns that existed since the original schema but were always `NULL` — DAR-039 Stage G) are now genuinely populated. The Website still internally composes the human-readable `quantityText` (`"100 شاخه"`) exactly as before, for continuity/audit-trail display — but the boundary is now precise: `quantityText` is display-only; `unit_ref`/`quantity_value`/`quantity_scale` are the deterministic structured fields the Odoo mapping actually reads (`lib/odoo/rfq-payload-mapper.ts#mapItem` uses `item.unitCode` — sourced from `unit_ref` — directly, never re-parsing `quantityText`, for any row where `unit_ref` is present). `sheet`/`meter`/`kg`/`ton` all proven identically via the pure `rfq-payload-mapper.test.ts` matrix (§16). The legacy `inferOdooUomCode` keyword-match remains in the codebase **only** as the fallback for a historical row whose `unit_ref` is `NULL` (persisted before this field existed) — never consulted for a new submission, which always has `unit_ref` populated. No backend redesign beyond this precise boundary — Turnstile, idempotency, the outbox, the Queue, and the Odoo handoff mechanics are all unchanged.

## 13. Localization

`RFQ_UOM_LABELS` (`lib/rfq/uom.ts`, unchanged dictionary) already carried fa/en/ar labels for all 8 codes, including the 5 Launch-relevant ones: `kg`→کیلوگرم/kg/كجم, `ton`→تن/ton/طن, `branch`→شاخه/branch/فرع, `sheet`→ورق/sheet/لوح, `meter`→متر/meter/متر. No new locale architecture was needed — the existing per-locale label map already covers every unit this task touches; nothing is hard-coded Persian inside `lib/rfq/uom-policy.ts` (which only ever handles unit **codes**, ASCII, never display text).

## 14. Mobile/Desktop UX

No redesign performed, per the task's own instruction. The existing responsive mechanism (`hidden lg:block` table / `lg:hidden` card, both rendering the same shared `unitSelect`/`categorySelect`/`productCell`/`specCell` JSX values, per `docs/RFQ_MULTI_ITEM_FORM.md` §8) automatically carries the product-aware unit filtering to both layouts — there is exactly one `allowedUnits` computation per row, consumed identically by both DOM renders. Live-verified server-rendered HTML confirms the correct default (`kg`/`ton` only) option set on the table-layout render; the card-layout render shares the same `unitSelect` value, so it is structurally guaranteed to match (not independently re-implemented).

## 15. Documentation

- `docs/ODOO_RFQ_API_INTEGRATION.md` — "UOM" section rewritten: struck through the DAR-039-era gap description as historical, states the current structured/validated/deterministic contract.
- `docs/RFQ_MULTI_ITEM_FORM.md` — §6 (Quantity/UOM) and §16 (deliberately-not-built list) both updated to reflect the new product-aware policy and point to this document; §10's payload table now lists the `unit` wire field.
- `DOCUMENT_AUDIT_REPORT.md` — new DAR-046 entry (see below).
- `README.md`/`DOCS_INDEX.md` — updated with a pointer entry for this document.
- This document (`docs/RFQ_LAUNCH_UOM_ALIGNMENT.md`) is the new canonical source for the policy itself.

## 16. Regression Tests

- `npx tsc --noEmit` — clean.
- `npm test` — **449/449 passing** (up from 382 before this task: +7 `catalog-selector.test.ts`/`catalog-preselection.test.ts` group-code/unit-population tests, +25 `lib/rfq/validation.test.ts` Launch-policy tests plus existing-item fixture fixes, +36 `lib/rfq/uom-policy.test.ts` exhaustive Phase L matrix, +8 `lib/odoo/rfq-payload-mapper.test.ts` deterministic-serialization tests, +1 `item-row-validation.test.ts` wire-field test).
- `npm run build` — clean, unchanged route list.
- `git diff --check` — clean.
- Every pre-existing Catalog/Editorial/RFQ/Multi-item/Catalog-preselection/Turnstile/Queue/Odoo-RFQ/Scheduled-sync test remains green — none were weakened, skipped, or deleted; the 1–20-line RFQ cap tests are untouched.
- No project lint script exists beyond `tsc`/`node --test` (checked `package.json` — no separate `lint` script configured).

## 17. Files Changed

**New:** `lib/rfq/uom-policy.ts`, `lib/rfq/uom-policy.test.ts`, `docs/RFQ_LAUNCH_UOM_ALIGNMENT.md`.
**Changed:** `lib/catalog/editorial-repository.ts` (`RfqCatalogSelection.groupCode` + both SQL reads), `lib/rfq/catalog-selector.ts` (+test) (`CatalogTemplateGroup.groupCode`), `lib/rfq/types.ts` (`RfqItemInput.unit`), `lib/rfq/validation.ts` (+test) (unit format + Custom-item policy check, `unit` in output shape), `lib/rfq/service.ts` (Catalog-group policy check, unit passthrough to builders), `lib/rfq/catalog-preselection.ts` (+test) (`UnitInput` param, populates `unit_ref`/`unit_label`), `lib/rfq/item-row-validation.ts` (sends `unit` on the wire), `lib/rfq/uom.ts` (`DEFAULT_RFQ_UOM` "piece"→"kg", doc comments), `lib/queue/consumer.ts` (reads `unit_ref`, passes as `unitCode`), `lib/odoo/rfq-payload-mapper.ts` (+test) (`RfqSnapshotItem.unitCode`, deterministic `resolveUomCode`), `components/contact/rfq-item-row.tsx` (product-aware `allowedUnits`, reset-on-change), `docs/ODOO_RFQ_API_INTEGRATION.md`, `docs/RFQ_MULTI_ITEM_FORM.md`, `DOCUMENT_AUDIT_REPORT.md`, `README.md`, `DOCS_INDEX.md`.

## 18. Git

Committed on `fix/rfq-launch-uom-policy` after all validation passed; pushed (not merged) — see the commit SHA and push confirmation reported in the final chat summary for this task.

## 19. Deployment

**Explicitly none.** No `wrangler` deploy command was run in this task. No Cloudflare Worker was touched. No production RFQ was submitted (all live proof in §11/§12 ran against local dev + local D1 only). `ahanassa.com`/`www.ahanassa.com` DNS, Vercel, and the temporary Basic Auth gate on `ahanassa-production` are all completely unchanged.

## 20. Gate

**WEBSITE RFQ LAUNCH UOM ALIGNMENT: PASS**

---

## 21. Website RFQ Launch UoM Runtime Validation (2026-09-02, deployment + runtime QA)

Deploys §1–§20 above to the existing protected non-live `ahanassa-production` Cloudflare Worker and runtime-validates it live. Same Worker as every prior deployment — no new Worker created. `ahanassa.com`/`www.ahanassa.com` DNS, Vercel, and Basic Auth are all unchanged throughout.

### Source / deployment

- **Source commit:** `42ce8fe` (verified: `git status`/`git branch --show-current`/`git rev-parse HEAD` all matched before deployment; `npx tsc --noEmit`, `npm test` (449/449), `npm run build`, `git diff --check` all re-ran clean immediately before deploying).
- **Worker version ID:** `ac09d55c-c80c-455d-a827-c3730cba22c5` (message: "RFQ Launch UoM Contract Alignment (commit 42ce8fe)"), promoted to **100%** traffic via `wrangler versions deploy ac09d55c-...@100`.
- **Bindings/secrets preserved**, confirmed via `wrangler versions view` before promotion: `ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `PREVIEW_BASIC_AUTH_USER`, `PREVIEW_BASIC_AUTH_PASSWORD` all present; `DB_OPS`=`ahanassa-ops-production`, `DB_PUBLIC`=`ahanassa-public-production`, `ODOO_SYNC_QUEUE`=`ahanassa-odoo-sync-production` all correct.
- **Deployed-artifact identity check:** the exact `dist/` build just deployed contains the `unsupported_for_custom_item` string (from `lib/rfq/validation.ts`) in its bundled output, confirming the deployed bundle is genuinely built from this commit's source, not a stale artifact.

### Basic Auth / security gate

Unauthenticated `GET /` → `401`; unauthenticated `POST /api/rfqs` → `401`. Authenticated `GET /`, `/products`, `/contact` → `200`. Basic Auth remains fully active — unchanged.

### Live Catalog UoM UI — production, real published Variants

| Family | Variant XID used | Unit options rendered (live, production) |
|---|---|---|
| Rebar | `ahanassa_marketplace.product_rb_aj340_d16_l12` | exactly کیلوگرم(kg) / تن(ton) / شاخه(branch) |
| Plate | `ahanassa_marketplace.product_sh_hr_s355jr_s20x1500x6000` | exactly kg / ton / ورق(sheet) |
| SHS | `ahanassa_marketplace.product_pf_shs_s80x80x5_l6` | exactly kg / ton / متر(meter) |

Verified via `/fa/contact?variant=<xid>` preselection against the deployed Worker — no sheet/meter/coil/bundle/piece on Rebar; no branch/meter/coil/bundle/piece on Plate; no branch/sheet/coil/bundle/piece on SHS. No editorial/publication state was changed — production Catalog remains exactly 3 published templates / 12 public variants (re-confirmed via D1 query after deployment).

### Custom row, stale-UoM reset, mixed 12+-row multi-line — local dev, identical deployed commit

Basic Auth blocks browser-automation tooling from completing an interactive session against the live `workers.dev` host directly (Chrome's native Basic Auth prompt is not exposed to the remote-control layer — the same limitation already documented in `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §14). These phases were instead run interactively (real browser, real DOM events) against local dev serving the identical deployed commit (`42ce8fe`, same working tree, same synced Catalog data — the local D1 mirror holds the identical 3 published templates / 12 public variants as production, same real xids):

- **Custom row:** switching a row to "سایر / کالای سفارشی" (custom) live-confirmed unit options exactly `["kg","ton"]` — no branch/sheet/meter/coil/bundle/piece.
- **Stale-UoM reset, two cross-family transitions:** (1) Rebar+`branch` → switched category to Flat Products → unit correctly reset to `kg`, options narrowed to `[kg,ton]`; (2) Plate+`sheet` → switched category to Hollow Sections → unit correctly reset to `kg`, options narrowed to `[kg,ton]`. `branch`/`sheet` never survived their respective product-family change.
- **Mixed 12+-row multi-line** (grown to 20 rows total, the maximum): row 1 Rebar/`branch`, row 2 SHS/`meter`, row 3 Plate/`sheet`, row 4 Rebar/`ton`, row 5 Custom/`kg`, rows 6–20 default/`kg` — dumped every row's own unit-option list simultaneously and confirmed **zero cross-row leakage** (each row's options exactly match its own product's policy, independent of every other row's state). Add-button correctly disabled at exactly 20/20; removing row 5 correctly dropped the counter to 19/20 and re-indexed remaining rows with their data intact (rows 1–4's product/unit selections survived the entire grow-to-20 and remove-one sequence unchanged). No form was submitted.

### Server-side production runtime POST

Determined via code inspection (`lib/rfq/service.ts`) that format-level validation (`lib/rfq/validation.ts`, including the new required-`unit` + Custom-item kg/ton restriction) runs **before** Turnstile verification, but the Catalog-group-specific check (`isUomAllowedForCatalogGroup`) runs **after** Turnstile succeeds (it needs `resolveRfqCatalogVariant`'s DB_PUBLIC resolution first). This means:

- **`Custom + coil` and `Custom + branch` were safely POSTed directly to production** (`https://ahanassa-production.nova-b1e6f0.workers.dev/api/rfqs`, Basic-Auth-authenticated, no Turnstile token supplied) — both rejected with `422 {"code":"VALIDATION_ERROR","fieldErrors":{"items[0].unit":["unsupported_for_custom_item"]}}`, entirely at the format layer, before Turnstile is ever checked. Production `rfqs`/`integration_outbox` row counts confirmed unchanged (2/2) before and after both attempts — zero RFQ writes, zero outbox writes, zero Queue publication.
- **`Rebar + sheet` and `SHS + branch` were intentionally NOT repeated against production** — reaching the Catalog-group-specific check requires a genuinely valid Turnstile token, which would require either real interactive verification or weakening/bypassing Turnstile, both explicitly prohibited for this phase. Per the task's own instruction: *server-side production runtime POST intentionally not repeated for these two cases; the exact code path is covered by 449 local tests (`lib/rfq/uom-policy.test.ts`'s exhaustive matrix) and was additionally live-proven end-to-end against local dev + local D1 with real Turnstile test keys in the prior task (`docs/RFQ_LAUNCH_UOM_ALIGNMENT.md` §11) — production UI/runtime identity for these two combinations is verified from the deployed artifact instead (the live Catalog UoM UI table above, drawn from the same deployed commit).*

### Structured serialization identity

Read-only confirmed the deployed bundle (`dist/`) is built from `42ce8fe` (marker-string check above). The `100 branch → quantity_value=100, unit_ref=branch` serialization (and the equivalent `20 sheet`/`30 meter`/`2 ton`/`500 kg` cases) is unchanged code from §12/§16 of this document — proven there via the pure `rfq-payload-mapper.test.ts` matrix and a real local D1 write; not re-submitted to Odoo in this phase.

### Turnstile UX

Confirmed still intact and unchanged by this task: the widget auto-resolved with the local test key (`موفق بود!` / "Success!" shown by the widget itself), and the Submit button's `disabled` state correctly tracked `Boolean(turnstileToken)` — enabled only once Turnstile succeeded, with no explanatory-status regression observed (the "verifying…" message is present in the initial server-rendered HTML, as already proven in the prior Go-Live Readiness task; this task did not touch that code). No raw Turnstile error was ever surfaced. Fail-closed behavior unchanged. No real production RFQ was submitted.

### Responsive QA

Desktop (production, live screenshot-equivalent via authenticated page load) and local-dev interactive session both confirmed: product-aware unit selectors readable, FA RTL labels correct, `appearance-none`/`pe-9`/logical `end-3` chevron classes intact (no clipping regression from the prior task's fix), Custom row shows only kg/ton, 20-row form remains usable. **Mobile viewport:** the browser tool's `resize_window` call reported success but did not actually change `window.innerWidth` in this remote-controlled session (stayed at 1440px) — a tooling limitation, not a site defect. Verified mobile-card-layout equivalence instead by direct DOM inspection: the CSS-hidden (`lg:hidden`) mobile card markup for every row carries **byte-identical** unit-option lists and selections as the visible desktop table markup (both share one row-state source of truth, unchanged mechanism from the prior task) — confirming the mobile rendering is correct without a literal narrow-viewport screenshot. No redesign performed.

### Contract / security regression

Verified against the deployed Worker: no price/stock/supplier/MOQ/supplier-economics data anywhere on `/contact` (the only matches for a broad price-keyword grep were pre-existing FAQ positioning copy — "not just unit price" / "more than a simple price inquiry" — qualitative brand copy, no numeric price, unchanged by this task); zero matches for any of the 4 secret names in the rendered HTML; zero `value="coil"`/`value="bundle"`/`value="piece"` anywhere on the page. Catalog pages remain server-rendered from DB_PUBLIC with no synchronous Odoo dependency (unchanged architecture). RFQ architecture (Browser → DB_OPS → Outbox → Queue → Odoo) unchanged. Basic Auth and Turnstile both confirmed active (above).

### Catalog / SEO regression

All 3 published pages (`rebar-aj340`, `hot-rolled-plate-s355jr`, `square-hollow-section-shs`) still `200`; canonical still `https://www.ahanassa.com/products/rebar-aj340`; hreflang still exactly `fa` + `x-default` (the prior task's fix, unaffected by this task's changes); `sitemap.xml` still exactly 3 URLs, no 237-variant explosion; production Catalog publication state unchanged (3 templates / 12 variants, re-confirmed via direct D1 query post-deployment); Variant selection remains entirely within the Template-page hybrid architecture — no independent Variant SEO pages exist.

### Performance

| Route | TTFB (steady-state, 2nd request) | Total |
|---|---|---|
| `/products` | ~0.47s | ~0.52s |
| `/products/rebar-aj340` | ~0.50s | ~0.68s |
| `/contact` | ~0.48s | ~0.61s |

Qualitatively comparable to the ~0.43–0.55s TTFB baseline from the prior Go-Live Readiness task — no regression observed. No optimization performed, per this phase's own instruction.

### Production domain safety

`https://ahanassa.com/` → `308` (unchanged existing redirect behavior); `https://www.ahanassa.com/` → `server: Vercel`, real `x-vercel-id` present — confirmed still served entirely by the legacy Vercel deployment. No Cloudflare route or custom domain was attached to `ahanassa-production` at any point. The only publicly reachable surface for this Worker remains the same Basic-Auth-gated `https://ahanassa-production.nova-b1e6f0.workers.dev`.

### Runtime Gate

**WEBSITE RFQ LAUNCH UOM RUNTIME: PASS.** Same existing Worker updated (no new Worker); Basic Auth remains active; Rebar/Plate/SHS/Custom unit lists all exactly match the confirmed Odoo Launch policy live in production; coil/bundle/piece absent everywhere; stale invalid UoM resets safely across two independent cross-family transitions; 20-row mixed multi-line UI works with zero cross-row leakage; Turnstile intact; no production RFQ created (2 format-layer-only invalid POSTs safely proven against production with zero DB writes; the two Catalog-group-specific invalid combinations were intentionally not repeated against production since they would require a real Turnstile pass, and are instead covered by the 449 local tests plus the prior task's own local dev + local D1 live proof); current Catalog pages healthy; public DNS/Vercel unchanged throughout.
