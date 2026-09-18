# POST-P3F — RFQ Optional Commercial length_mm, Full Stack

# RESULT

**PASS.** Optional, structured `length_mm` support is implemented end-to-end
— UI → validation → D1 → repository → outbound Odoo payload — additive and
backward-compatible at every layer. Product/commercial identity (`CVAR-…`/
`CTMPL-…`) is completely untouched; `length_mm` lives only on `rfq_items`, a
per-submission request detail, never Catalog/Product Master data.

One real, independently-discovered defect was found and fixed in the same
pass (not a workaround): the RFQ catalog-identifier format regex rejected
every canonical `CVAR-…` XID (missing hyphen in its character class),
meaning catalog-linked RFQ submissions were broken for **any** variant since
the POST-P3F canonical identity migration. See "Repository"/"Test Matrix"
below for the fix and its regression tests.

# PRE-FLIGHT

- Branch: `feat/header-hero-integrated`
- `PRE_HEAD`: `4c5b670c6ae0dd7381ef827e67b93c6cfc87689c` (the Phase 2 UI-integration commit)
- Test baseline at start: 1286/1286 passing (unchanged from Phase 2)
- Read in full before implementing anything: `docs/POST_P3F_WEBSITE_UI_INTEGRATION_PHASE2_REPORT.md`, `docs/POST_P3F_WEBSITE_LIVE_CANONICAL_CATALOG_SYNC_REPORT.md`, `docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md` ("RFQ CONTRACT" section — the sole authoritative source for the backend's `length_mm` acceptance), `docs/ODOO_RFQ_API_INTEGRATION.md`, `docs/CATALOG_RFQ_INTEGRATION.md`, `docs/RFQ_LAUNCH_UOM_ALIGNMENT.md`, `docs/RFQ_MULTI_ITEM_FORM.md`, all 4 pre-existing `migrations/000*.sql` files, and every file in the current RFQ/Odoo-mapping code path (enumerated in "Current RFQ Architecture" below).
- **Process rule honored:** no fork/subagent was used for any implementation, migration, staging write, or commit in this task — every file edit, `wrangler d1` invocation, local/staging verification, and commit was done directly by the coordinating session.
- No staging/production write occurred until after implementation, all local tests, typecheck, and build passed, and a real local end-to-end submission was proven (per this task's own §0/§14 ordering).

# CURRENT RFQ ARCHITECTURE

Traced and confirmed directly from the live code (not assumed) before writing anything:

```
components/contact/rfq-item-row.tsx (UI: one row's fields)
  -> lib/rfq/item-row-validation.ts#buildRfqItemInput  (row fields -> RfqItemInput, the wire shape)
    -> POST /api/rfqs  (app/api/rfqs/route.ts — passes the raw body through unchanged)
      -> lib/rfq/service.ts#submitRfq
        -> lib/rfq/validation.ts#validateRfqSubmission  (format/range checks, D1-free)
        -> lib/catalog/editorial-repository.ts#resolveRfqCatalogVariant  (real DB_PUBLIC resolution for a "selected" item)
        -> lib/rfq/catalog-preselection.ts#buildCatalogItemRecord / buildFreeformItemRecord  (-> RfqItemRecord, the D1-persisted shape)
        -> lib/rfq/repository.ts#createRfq  (D1 INSERT into rfqs/rfq_contacts/rfq_items/rfq_status_history/integration_outbox, one batch)
          [DB_OPS: rfq_items table]
            -> lib/queue/consumer.ts  (reads rfq_items back for outbound sync)
              -> lib/odoo/rfq-payload-mapper.ts#mapRfqToApiPayload  (RfqSnapshotItem -> RfqApiItem)
                -> lib/odoo/rfq-api-client.ts  (POST /api/v1/rfq to Odoo)
```

Every layer that needed to carry `length_mm` was identified from this trace: `RfqItemInput`, `RfqItemRecord`, the `rfq_items` D1 column, `RfqSnapshotItem`, `RfqApiItem` — five type/schema touchpoints plus the UI row-state type, all listed explicitly in "Data Model" below.

# DATA MODEL

`length_mm`: **nullable/optional, integer, positive, whole millimetres, ≤ 1,000,000.**

- **Nullable/optional:** every layer treats "no length" as a first-class, always-valid state — never coerced to `0`.
- **Numeric, positive if supplied:** enforced identically server-side (`lib/rfq/validation.ts#parseLengthMm`) and as a client-side pre-check (`lib/rfq/item-row-validation.ts#isValidLengthMmValue`).
- **Millimetres at storage/API boundary:** the UI only ever collects millimetres directly (see "UI" below for why no metre/centimetre conversion was introduced) — there is no unit-conversion step anywhere in this stack, so "normalize to mm before persistence" was moot; the value entered is already the value stored and sent.
- **Precision — INTEGER, not REAL/float**, even though the Odoo backend's own type is a float (`docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md` "RFQ CONTRACT": *"length_mm ... finite, positive, <= 1e6 mm float"*). This was a deliberate choice, not a guess:
  - No realistic Website input path produces a non-whole-millimetre value — millimetres are already the finest unit any real steel commercial-length conversation uses.
  - This schema's own established convention already prefers exact integer storage over floating point for precision-sensitive numeric values (`migrations/0004_public_price_quotes.sql`: *"Exact integer Rial — never SQLite REAL/floating point"* for money; `migrations/0001_rfq_ops_schema.sql`'s `quantity_value`/`quantity_scale` scaled-integer pattern for quantities). `length_mm` follows the same discipline for a physical measurement instead of a currency amount.
  - Storing an integer is strictly *narrower* than the backend's float acceptance, never wider — a Website-stored integer can never produce a value Odoo would reject; it can only ever be a subset of what Odoo already accepts. This direction of mismatch is always safe.
- **Bound (`MAX_LENGTH_MM = 1_000_000`)** is the backend's own documented `<= 1e6 mm` bound, read directly from the backend handoff doc — never an invented business maximum, per this task's own explicit instruction.

**Touchpoints, by layer:**

| Layer | File | Field |
|---|---|---|
| UI row state | `lib/rfq/item-row-validation.ts` | `RfqCatalogRowFields.lengthMm: string` (raw input) |
| Wire payload (client → server) | `lib/rfq/types.ts` | `RfqItemInput.lengthMm?: number` |
| Server validation output | `lib/rfq/validation.ts` | `ValidationResult.value.items[].lengthMm: number \| null` |
| D1-persisted record | `lib/rfq/types.ts` | `RfqItemRecord.lengthMm: number \| null` |
| D1 schema | `migrations/0005_rfq_length_mm.sql` | `rfq_items.length_mm INTEGER` (nullable, CHECK) |
| Outbound read snapshot | `lib/odoo/rfq-payload-mapper.ts` | `RfqSnapshotItem.lengthMm: number \| null` |
| Odoo API payload | `lib/odoo/rfq-api-types.ts` | `RfqApiCatalogItem.length_mm?: number` / `RfqApiFreeTextItem.length_mm?: number` |

# D1 MIGRATION

`migrations/0005_rfq_length_mm.sql`:

```sql
ALTER TABLE rfq_items ADD COLUMN length_mm INTEGER
  CHECK (length_mm IS NULL OR (length_mm > 0 AND length_mm <= 1000000));
```

- **Purely additive** — `ALTER TABLE ADD COLUMN`, nullable, no `DROP`/recreate, matching migrations 0002/0003/0004's own established discipline exactly.
- **No backfill required** — every existing row correctly reads as `NULL` (verified, see "Staging Migration").
- **Idempotently deployable** under the existing migration system (`wrangler d1 migrations apply`) — applied cleanly on both local and staging (see below); Wrangler's own migration tracking prevents a double-apply.
- The `CHECK` constraint is self-referential only (references no other column), which SQLite/D1 supports directly on an `ALTER TABLE ADD COLUMN` — confirmed live (not assumed) on both local and real remote staging D1 before relying on it (see "Local Migration"/"Staging Migration").

# TYPES

`lengthMm?: number` (input) / `lengthMm: number | null` (persisted/resolved) threaded through every interface listed in the "Data Model" table above — `RfqItemInput`, `ValidationResult`'s item shape, `RfqItemRecord`, `RfqSnapshotItem`, `RfqApiCatalogItem`, `RfqApiFreeTextItem`. No `any` anywhere in the new code (confirmed: `npx tsc --noEmit` clean throughout, including strict-mode checks on every touched file). The field survives create (validation → record → D1 INSERT), read (queue consumer SELECT → snapshot), and submission (outbound mapper) — there is no edit/review path to verify separately (see "Repository" below for why).

# VALIDATION

`lib/rfq/validation.ts#parseLengthMm` (server, authoritative) and `lib/rfq/item-row-validation.ts#isValidLengthMmValue` (client, conservative pre-check subset):

- Omitted (`undefined`/`null`/empty string) → **always valid**, resolves to `null`.
- Present → must be finite, a whole number (`Number.isInteger`), `> 0`, and `<= MAX_LENGTH_MM` (1,000,000 — the backend's own documented bound, not invented).
- No arbitrary business maximum was added beyond that authoritative bound, per this task's explicit instruction.
- Errors surface through the existing error architecture unchanged: server returns `{ ok: false, code: "VALIDATION_ERROR", fieldErrors: { "items[N].lengthMm": ["invalid"] } }` (the same shape every other field already uses); client-side, a new `"length"` value was added to the existing `RfqRowFieldKey` union (`"product" | "quantity" | "length"`) and wired into the pre-existing error-summary/scroll-to-row UI — no new error-handling mechanism was introduced.

# UI

Optional input added to `components/contact/rfq-item-row.tsx`, inside the existing "Spec" cell (mirroring the pre-existing conditional SKU-note pattern immediately above it), for both the desktop table and mobile card layouts — **no new table column was added** (the existing 8-column fixed-width `<colgroup>` layout was deliberately left untouched, since a 9th always-visible column would have disrupted every row regardless of relevance, not just Angle/Channel rows).

- **Label (FA):** طول درخواستی — exactly as specified.
- **Placeholder/help copy** explicitly avoids implying availability: *"این مقدار فقط درخواست شماست؛ سایز و طول نهایی توسط کارشناسان آهن آسا بررسی می‌شود"* ("this is your request only; final size and length are reviewed by Ahan Asa's team") — never "available lengths," never a Supplier-Offer-derived option list (there is no Supplier data anywhere in this code path to begin with).
- **Unit: millimetres only**, entered directly (`inputMode="numeric"`, whole numbers). No metre/centimetre alternate input was added — the existing RFQ form has no precedent for a secondary-unit-with-conversion pattern anywhere (quantity itself is unit-selected via a separate `<select>`, never converted client-side), and introducing one exclusively for this field would be new UX complexity the task's own scope discipline ("do not broaden scope unnecessarily") argues against. mm is also the unit the backend contract itself uses natively.
- **Optional, clearly:** no `required`/`aria-required`, and empty is a fully valid, unblocked state — the "no length" test case is exercised explicitly (see "Test Matrix").
- A previously-typed value is **cleared automatically** if the customer changes to a product template whose group no longer supports the input (`handleTemplateChange`'s `withUnitResetIfInvalid`-style guard) — otherwise a stale, now-hidden value could have been silently submitted for an unrelated product. This is a real correctness fix within the UI change itself, not a separate defect.

# PRODUCT-AWARE VISIBILITY

**Chosen: option B — only relevant product groups** (the task's own menu), determined from real Product Master data, not guessed: `lib/rfq/length-policy.ts`.

ANGLE (`dimensions_json: {width_mm, height_mm, thickness_mm}`) and CHANNEL (`{width_mm, height_mm}`) are the only currently-synced groups whose own catalog commercial dimensions do **not** already include a `length_mm` key (verified live, `docs/POST_P3F_WEBSITE_LIVE_CANONICAL_CATALOG_SYNC_REPORT.md`). Every other currently-published group — REBAR, BEAMS, RHS, SHS, SEAMLESS_PIPE, SHEET_PLATE — already carries `length_mm` as part of its own commercial `dimensions_json` (`docs/CATALOG_PUBLIC_ROUTES.md` §2's dimension table): for those, length is already fixed, published product identity, and a second, RFQ-time "requested length" input would duplicate/conflict with already-fixed catalog data rather than fill a real gap. This is exactly the "size vs. requested length" distinction this task's own architecture rule draws, applied using real data rather than asserted.

No group beyond ANGLE/CHANNEL was added — per "do not broaden scope unnecessarily," and because no other currently-published group's real data supports the same "length genuinely absent from identity" case.

A Custom/freeform row (no resolved product group at all) never shows this input — there is no group to evaluate the policy against, and broadening it to freeform text items was out of scope (the structural plumbing — `FreeformItemInput.lengthMm?`/`RfqApiFreeTextItem.length_mm?` — already exists end-to-end for a future task to wire a UI to, without any further schema/type change).

# CATALOG PRESELECTION

`lib/rfq/catalog-preselection.ts#buildCatalogItemRecord` now accepts an optional `lengthMm` parameter (5th, defaulted to `null`) and threads it straight into `RfqItemRecord.lengthMm` — the function's existing signature/behavior for every other field is completely unchanged. `product_variant_xid`/`sku` continue to come exclusively from the server-resolved `CatalogSelectionForRecord` (never client input) — `lengthMm` is the one genuinely customer-supplied value in this function, and it was already server-validated (`parseLengthMm`) before ever reaching here. The selected `CVAR-…` identity is never altered, derived from, or made conditional on the presence of a length — confirmed by direct inspection: `selection.variantXid` is written identically regardless of `lengthMm`'s value.

# REPOSITORY

**Insert:** `lib/rfq/repository.ts#createRfq`'s `rfq_items` INSERT statement now includes `length_mm` (column list + bind parameter), inserted inside the same single D1 `.batch()` call as every other row — no separate write, no new failure mode, transactional guarantee unchanged.

**Read:** `lib/queue/consumer.ts`'s `rfq_items` SELECT now includes `length_mm`, mapped into `RfqSnapshotItem.lengthMm`. `null` here is deliberately not distinguished between "historical row predating the column" and "a new row that simply omitted a length" — both correctly produce no `length_mm` key in the outbound payload, so no distinction was needed (confirmed: existing-row backward compatibility and new-row omission share one code path, not two).

**Update/edit:** **no repository update path exists to modify — RFQs are immutable once created**, confirmed by inspecting the full `lib/rfq/` and `lib/queue/` trees: there is no "edit RFQ" repository function anywhere in this codebase (the only reads of `rfq_items` are this queue consumer and an unrelated, narrowly-scoped homepage-ranking demand-aggregation query that reads only `product_ref`, unaffected). This matches the codebase's own stated design intent (`lib/odoo/rfq-payload-mapper.ts`'s header comment: *"A later Product name/SKU/title change can never alter what this function produces for an already-accepted RFQ"* — historical immutability by design). The task's own "edits preserve length" requirement is therefore vacuously satisfied: there is no edit operation that could fail to preserve it.

**Verified directly** (not assumed): old rows load correctly with `NULL` (local + real staging, both before and after migration); new rows persist and read back the exact integer supplied (local, real end-to-end HTTP submission — see "Local Migration"); no column-order mismatch (`PRAGMA table_info` inspected on both local and staging before relying on the INSERT's column list).

**Repository tests:** none were added as a `node --test` file, matching this codebase's own established convention — `lib/rfq/repository.ts` (like `lib/catalog/repository.ts`) touches `cloudflare:workers` via `getOpsDb()` and has never had a direct unit-test file; verification instead happens against real D1 (local and staging), exactly as this task's own "Local Migration Test"/"Staging Migration" sections require. The D1-free logic this repository call depends on (`buildCatalogItemRecord`/`buildFreeformItemRecord`, the validation layer) is fully unit-tested.

# ODOO PAYLOAD

`lib/odoo/rfq-payload-mapper.ts#mapItem`: `length_mm: item.lengthMm ?? undefined` — an `undefined` object property is dropped entirely by `JSON.stringify` (never serialized as `"length_mm":null`), matching the backend contract's own *"omission is fully backward-compatible (byte-identical canonical JSON ... for clients that never send it)"* guarantee exactly. Verified two ways:

1. Unit tests (`lib/odoo/rfq-payload-mapper.test.ts`): the serialized JSON for an item with no length contains no `length_mm` substring at all, and is confirmed distinct from an otherwise-identical item that does carry one.
2. Real local end-to-end (see "Local Migration"): the actual outbound payload for the UPE/length-omitted test case was inspected directly — `length_mm` key genuinely absent, not `null`.

Never `0`/empty string/`NaN`/a fabricated default — `parseLengthMm` already refuses to produce any of those at the validation boundary, and the mapper adds no further transformation beyond the nullish-coalesce.

# FINGERPRINT / IDEMPOTENCY

Inspected both idempotency mechanisms that actually exist in this codebase (there is no third, "semantic content fingerprint" mechanism — this was verified by direct code search, not assumed):

1. **Browser-submitted idempotency key** (`lib/rfq/idempotency.ts`): an **opaque, client-generated token**, hashed (SHA-256) and deduplicated at the whole-RFQ level via `rfqs.idempotency_key_hash`'s unique index. It is never derived from item content — its entire purpose is "detect the same physical submission retried" (e.g. a network-timeout retry or double-click), not "detect two different submissions with identical content."
2. **Outbound-to-Odoo idempotency key** (`lib/odoo/rfq-payload-mapper.ts#buildOutboundRfqIdempotencyKey`): `rfq-${rfqId}` — a pure function of the durable D1 `rfqs.id` ULID alone, reconstructable identically across Queue/outbox retries. Also never derived from item content.

**Conclusion:** there is no per-item content fingerprint to "include `length_mm` in" — both existing mechanisms are already correctly scoped to *one durable RFQ record*, not to item content equality. Two submissions with the same CVAR/qty/UoM but a different requested length were **already** distinguishable before this task (different `rfqs.id`, different browser idempotency key) — exactly as two submissions differing in, say, a notes field always have been. This is not a gap this task introduced or needed to close; it is documented and pinned with tests rather than "fixed," because there was nothing broken.

**Tests added** (`lib/odoo/rfq-payload-mapper.test.ts`) prove the concrete, checkable version of this: two items identical except `lengthMm` produce different serialized outbound JSON (never silently conflated into an identical payload); two items with the same `lengthMm` produce identical JSON; `buildOutboundRfqIdempotencyKey` is pinned as depending only on `rfqId`, never on item content.

# LOCALES

Labels/placeholder/help/error text added through the exact existing per-component `Record<Locale, RowCopy>`/`Record<Locale, ...>` dictionaries already used for every other string in `rfq-item-row.tsx` and `enquiry-form.tsx` — **no new localization mechanism, no hardcoded language-specific conditional in component logic** (confirmed: the new `lengthLabel`/`lengthPlaceholder`/`lengthHelp`/`lengthInvalid`/`errorLength` keys are plain object properties, selected via the same `copy[locale]`/`t.xxx` pattern every pre-existing string already uses).

- **FA:** required, done — طول درخواستی / help text / error text, real Persian copy.
- **EN/AR:** the existing RFQ form is already fully translated (fa/en/ar copy objects exist for every other field) — so per the task's own "required if current RFQ form is translated" condition, EN and AR copy was written too: "Requested length" / "الطول المطلوب", with matching help/error text in each locale (see "UI" section's file diff for exact strings).

# TEST MATRIX

**Required matrix — all present, all passing** (`lib/rfq/validation.test.ts`, server layer; mirrored client-side in `lib/rfq/item-row-validation.test.ts` and outbound in `lib/odoo/rfq-payload-mapper.test.ts`):

| Case | Result |
|---|---|
| No length | existing behavior unchanged — `item.lengthMm === null`, outbound payload has no `length_mm` key |
| ANGLE — `CVAR-000242`, kg, `length_mm=8000` | valid, persisted, mapped to outbound `length_mm: 8000` |
| CHANNEL/UPN — `CVAR-000252`, ton, `length_mm=12000` | valid, persisted, mapped to outbound `length_mm: 12000` |
| CHANNEL/UPE — `CVAR-000260`, meter, length omitted | valid, `lengthMm: null`, outbound payload has no `length_mm` key |
| `lengthMm = 0` | rejected, `invalid` |
| negative | rejected, `invalid` |
| non-numeric | rejected, `invalid` |
| empty-string normalization | normalizes to omitted/`null` — never treated as an invalid numeric value |
| fractional (e.g. `8000.5`) | rejected, `invalid` — whole millimetres only |
| exactly at the 1,000,000 mm bound | valid |
| over the bound (1,000,001) | rejected, `invalid` |
| `branch` UoM never becomes valid because of `lengthMm` | confirmed — `lengthMm`'s presence changes nothing about UoM validation; the ANGLE/CHANNEL-specific branch rejection remains `lib/rfq/service.ts`'s job, unaffected |

**Regression found and fixed, with its own tests:** canonical `CVAR-…` format was previously rejected by `CATALOG_XID_PATTERN` (missing hyphen) — added a passing-case test (`CVAR-000242` now accepted) and a still-rejects-genuinely-invalid-input test (a space inside the XID still fails) to prove the fix is exactly as narrow as intended.

**Totals:** 1330/1330 passing (was 1286 at task start) — **44 new tests**: 8 in `lib/odoo/rfq-payload-mapper.test.ts`, 12 in `lib/rfq/item-row-validation.test.ts`, 10 in `lib/rfq/length-policy.test.ts` (new file), 14 in `lib/rfq/validation.test.ts`. Zero pre-existing tests were weakened or deleted to make this pass.

# LOCAL MIGRATION

1. `wrangler d1 migrations apply DB_OPS --local` — both the previously-unapplied `0004_rfq_contacts_phone_iso2.sql` and the new `0005_rfq_length_mm.sql` applied cleanly.
2. `PRAGMA table_info(rfq_items)` confirmed the new column: `length_mm INTEGER`, `notnull: 0`.
3. **CHECK constraint tested directly against real local D1** (not assumed from the migration file's syntax alone): `UPDATE ... SET length_mm = 0/-5/1000001` each failed with `SQLITE_CONSTRAINT_CHECK`; `= 8000` succeeded; existing rows read back `NULL` throughout.
4. **Real RFQ created via a genuine local `vinext dev` server** (the actual Next.js/Workers-runtime application code, not a synthetic script) — `POST /api/rfqs` with a real Turnstile verification round-trip (Cloudflare's official always-passing test site/secret key pair, in a temporary, non-committed `.env.local`, deleted immediately after this pass — matching the exact precedent already established in `docs/RFQ_MULTI_ITEM_FORM.md`). Three real submissions, one per required matrix case (ANGLE/8000mm/kg, UPN/12000mm/ton, UPE/omitted/meter), each returned a real `201` and a real `AA-RFQ-…` reference.
5. **Read back**: the persisted `rfq_items` rows were queried directly — `variant_ref`, `sku_snapshot`, `unit_ref`, `length_mm` all exactly as submitted (e.g. `CVAR-000242` / `AA-AN-EQ-S50X50X5` / `kg` / `8000`).
6. **Outbound payload built from the real persisted rows**, through the real, unmodified `mapRfqToApiPayload` — exact JSON captured for all three cases (see "Odoo Payload" and the report's evidence directory); `length_mm` present and correct for the two length-bearing cases, genuinely absent (not `null`) for the omitted case.
7. Two invalid submissions (`lengthMm: 0`, `lengthMm: -100`) sent through the same real HTTP endpoint both returned real `422 VALIDATION_ERROR` responses with `items[0].lengthMm: ["invalid"]`.

# STAGING MIGRATION

- **Recovery evidence captured before any staging write**: full `rfqs`/`rfq_items` row dump + `rfq_items` schema, `docs/evidence/post_p3f_rfq_length_mm/POST_P3F_RFQ_LENGTH_MM_STAGING_PRE_MIGRATION_SNAPSHOT_2026-09-18.json` (SHA256 in `REPORT_BUNDLE_MANIFEST.txt`).
- `wrangler d1 migrations apply DB_OPS --env staging --remote` — `0005_rfq_length_mm.sql` applied, ✅.
- **Verified programmatically, not by eye**: `rfqs` table byte-identical before/after (`JSON.stringify` equality); `rfq_items` byte-identical before/after **excluding only the new `length_mm` column**, which is `NULL` on all 7 pre-existing rows.
- **CHECK constraint re-verified live against real remote staging D1** (not just local): `UPDATE ... length_mm = 0` failed with the same `SQLITE_CONSTRAINT_CHECK`; `= 8000` succeeded; the test write was reverted to `NULL` immediately after, restoring staging to its exact pre-migration state (confirmed: `0` rows with non-null `length_mm` after cleanup).
- Post-migration snapshot also captured: `docs/evidence/post_p3f_rfq_length_mm/POST_P3F_RFQ_LENGTH_MM_STAGING_POST_MIGRATION_SNAPSHOT_2026-09-18.json`.
- **Production `DB_OPS` was never touched** — no `--env production` command was issued anywhere in this task.

# STAGING END-TO-END

Per this task's own explicit escape hatch (*"If actual Odoo staging submission is unavailable: stop at the real outbound payload boundary and verify exact JSON"*): a real Odoo staging submission requires `ODOO_RFQ_API_TOKEN`, a production-grade secret this session has no access to and must not fabricate — so this task stops at that boundary, exactly as anticipated.

What *was* verified against real remote staging infrastructure: the migration itself (schema + CHECK constraint, both live-tested on real staging D1, see "Staging Migration" above) — the one staging-specific risk this task actually introduces (an additive schema change to a real, shared, already-populated database). The application code path (validation → service → repository → mapper) is identical Worker-compatible code regardless of which D1 instance it's bound to (local vs. remote) — already proven real and correct end-to-end against local D1 in "Local Migration" (the same real `vinext dev` runtime, the same unmodified source files that will run in the actual staging Worker once deployed) — and no deploy of a new Worker version occurred in this task (out of scope; the current staging Worker predates this change and was not touched).

No production RFQ business data was created anywhere in this task.

# SECURITY / PRIVACY

Confirmed by direct inspection of every changed file:

- **No supplier/Supplier Offer data** is read, referenced, or derived anywhere in this change — `length_mm` is a plain customer-typed number, format-validated, nothing more. `grep`-confirmed: no new reference to any `supplier`/`offer` identifier anywhere in the diff.
- **No price/availability/MOQ/private-terms** field was touched or newly exposed — this change adds exactly one new customer-input field and nothing else to the RFQ payload.
- `length_mm` is never derived from or written back into any Catalog/Product Master/Supplier Offer table — it exists only on `rfq_items` (a request), never on `product_variants`/`catalog_products`.
- The `.env.local` file used for local Turnstile testing contained only Cloudflare's own publicly-documented, non-secret "always passes" test key pair — never a real secret — and was deleted immediately after use, per the established `docs/RFQ_MULTI_ITEM_FORM.md` precedent; confirmed absent from the working tree before any commit (`git status` shows it untracked/nonexistent).

# TESTS

**1330/1330 passing** (baseline 1286; +44 new, 0 removed/weakened). `npm test`.

# BUILD

- `npx tsc --noEmit`: clean (exit 0), including every new/changed file.
- `npm run build` (`vinext build`): clean (exit 0) — identical route list to Phase 1/2 (no new route; `/api/rfqs` is the same pre-existing dynamic API route).

# REMAINING DEFERRED ITEMS

- **EN/AR editorial/product content** for the underlying Equal Angle/UPN/UPE templates themselves remains FA-only, unchanged from Phase 2 — unrelated to this task's own scope (RFQ form plumbing, not catalog editorial content) and already tracked as Phase 2's own next-phase item.
- **Freeform/Custom RFQ rows** never show the length input (see "Product-Aware Visibility") — the structural plumbing (`FreeformItemInput.lengthMm?`, `RfqApiFreeTextItem.length_mm?`) already exists end-to-end for a future task to wire a UI to, without any further schema or type change.
- **Group/form Persian taxonomy labels** (نبشی/ناودانی, etc.) — unrelated pre-existing gap already documented in Phase 2's own report, not touched or affected by this task.
- **A live Odoo staging RFQ submission** was not performed (no production-grade `ODOO_RFQ_API_TOKEN` available to this session) — the real outbound JSON payload boundary was verified instead, per this task's own explicit allowance.

# NEXT PHASE

**Odoo-side live staging RFQ submission verification** (requires the real `ODOO_RFQ_API_TOKEN`, out of this session's access) to close the one remaining gap this task's own scope explicitly anticipated and allowed for — everything on the Website side of that boundary is now implemented, tested, and verified real end-to-end.

# GIT STATE

- `PRE_HEAD`: `4c5b670c6ae0dd7381ef827e67b93c6cfc87689c`
- `IMPLEMENTATION_COMMIT`: `681aa61` — `feat(rfq): add optional structured requested length (length_mm), full stack`
- `REPORT_COMMIT`: recorded in `REPORT_BUNDLE_MANIFEST.txt` after this report is committed (separate commit, per this task's own instruction)
- `tsconfig.tsbuildinfo` excluded from both commits, per standing instruction.
- No `01-sources/`, `logo/`, `design-reference/`, or any Odoo-repository file touched. No Product Master, canonical-identity, or Supplier-Offer code touched.
- **Real, durable state change:** `ahanassa-ops-staging` D1 now has a `length_mm` column on `rfq_items` (additive; all 7 pre-existing rows `NULL`) — a real, shared, persistent staging environment change, and the intended, in-scope outcome of this task's migration step.
