# PRICE-P3 — Public Read Model + Exact Variant Specification Contract — Verification Report

# RESULT

READY FOR PRICE-P4.

# PREFLIGHT

- `pwd`: `/Users/reza/Developer/ahanassa-website`
- `git branch --show-current`: `feat/header-frozen-v2`
- `git rev-parse HEAD` at task start: `49187137af34e1b6d1c17f38237ecec01ee4d497`
- `git status --short` at task start: empty.
- PRICE-P1 runtime commit verified present: `a219d23` ("feat: add exact price variant identity and freshness policy").
- PRICE-P2 runtime commit verified present: `fff3d1c` ("feat: add cadence-aware price freshness classification").
- PRICE-P2 report commit verified present: `4918713` ("docs: record Price Strip P2 verification report").
- Migration `migrations_public/0008_price_variant_identity_and_provider_policy.sql` verified present, unmodified.
- Frozen V2.1 spec (`docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`) verified present, unmodified.
- No unrelated drift found — proceeded.
- `PRICE_STRIP_ENABLED` not set/enabled anywhere in this change. Not touched.
- No push, no deploy, no staging/production D1 migration performed.
- No Odoo, Cloudflare secrets/DNS, or Cron Trigger changes. No Header/Processing/RFQ behavior changed.
- No fake/synthetic production data left behind — see LOCAL D1 RESULT.
- No prior migration rewritten. No visual/layout change to `components/home/price-strip.tsx` (it required zero edits — see LEGACY CONTRACT REMOVAL).

# BASE SHA

`49187137af34e1b6d1c17f38237ecec01ee4d497`

# PRICE-P3 RUNTIME COMMIT

`24b261c8c79020c7cdd8bd9fbffb2bf307f7d646`

# PRE-P3 READ MODEL

Before this phase, `lib/pricing/repository.ts#getHomepagePriceStrip` resolved a curated `price_display_products` row's title via `lib/catalog/editorial-repository.ts#getPublishedCatalogTemplateTitleByXid` (template-level title/slug only) with a fallback to `title_override_fa/en/ar`/`link_override_category_slug` when no catalog match existed. `variant_key` (added in PRICE-P1's migration 0008) was carried through the data model but not yet used to resolve a specific commercial spec, and information such as market/location, delivery basis, and an exact variant anchor was computed internally (for selection) but dropped before reaching `PublicPriceStripItem` — the public type carried only `displayPriceId`/`title`/`priceToman`/`unit`/`freshnessState`/`effectiveTimestamp`/`href`.

# FINAL PUBLIC READ MODEL CONTRACT

`lib/pricing/types.ts#PublicPriceStripItem`:

```ts
export interface PublicPriceStripItem {
  displayPriceId: string;
  templateXid: string;
  variantXid: string;
  title: string;
  specification: string;
  priceToman: number;
  unit: string;
  marketOrLocation?: string;
  deliveryBasis?: string;
  freshnessState: "fresh" | "aging";
  effectiveTimestamp: string;
  href?: string;
}
```

Derived from the existing repository architecture, not copied from the task's conceptual sketch verbatim: field names (`displayPriceId`, `templateXid`, `variantXid`) follow this codebase's own established naming (`HomepageProductCandidate.templateXid`, `RfqCatalogSelection.variantXid`) rather than the sketch's `id`/`templateId`/`variantId`. `freshnessState` is narrowed to the public two-state union (see FRESHNESS INTEGRATION).

# DUAL IDENTITY

Every item now carries both `templateXid` (`catalog_products.template_xid`, routing/grouping identity) and `variantXid` (`product_variants.xid`, the exact commercial anchor) — the PRICE-P1 dual-identity pattern, now surfaced (not just used internally) in the public contract.

# EXACT VARIANT ELIGIBILITY

`lib/pricing/repository.ts`'s curated-row query now reads:

```sql
SELECT display_price_id, product_key, variant_key, display_unit, display_currency, display_market_or_location, display_delivery_basis
FROM price_display_products
WHERE is_active = 1 AND variant_key IS NOT NULL
ORDER BY sort_order ASC, display_price_id ASC
```

A row with `variant_key IS NULL` (the legacy template-only path) is excluded at the source — never guessed a variant for. For each remaining row, `lib/catalog/editorial-repository.ts#resolvePublicPriceStripVariantAnchor(templateXid, variantXid, locale)` validates, in one query: the variant exists, is active, is public, genuinely belongs to `templateXid` (enforced structurally by the SQL JOIN + `WHERE cp.template_xid = ?`, not a separate post-hoc comparison), and its owning template is itself publication-eligible for `locale`. Any failure returns `null`, which `lib/pricing/price-strip-item.ts#buildPriceStripItem` treats as "this item is not eligible" — fails closed, per item.

# CATALOG PUBLICATION GATE

Reused, not reinvented: `resolvePublicPriceStripVariantAnchor` references the exact same exported `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` array that `listPublishedCatalogTemplates`, `getPublishedCatalogTemplateBySlug`, and `listHomepageProductCandidates` already use — literally the same array reference, not a parallel copy that could drift (task §5).

# TITLE OWNERSHIP

`title` comes from `product_seo_contents.h1` for the owning template, via the same publication gate every other public catalog read uses. `provider_title` is structurally unreachable — `QuoteCandidate` (the type that carries quote data through selection) has no `providerTitle` field at all, so there is no code path by which it could reach the public title. A catalog-title resolution failure (`variantAnchor === null`) fails the item closed (see EXACT VARIANT ELIGIBILITY) — never a fallback to `title_override_*`.

# SPECIFICATION OWNERSHIP

`lib/catalog/specification-presenter.ts#formatCompactVariantSpecification` — new, pure, generic (no per-family/per-group branching):

```
sizeLabel = commercialSize ?? sectionSize ?? sku
specification = grade.code ? `${grade.code} · ${sizeLabel}` : sizeLabel
```

Built only from DB_PUBLIC's own Odoo-sourced `grade_code`/`commercial_size`/`section_size`/`sku` — the same `commercialSize ?? sectionSize ?? sku` fallback chain `RfqCatalogSelection.variantSpecLabel` already established elsewhere in this codebase, reused rather than duplicated with different fallback semantics. Verified live against real DB_PUBLIC data (`commercial_size` is populated for all 237 current variants — 0 nulls) across every product group: `AJ340 · Ø16` (rebar), `40×40×3` (SHS, no grade), `IPN 100` (beams, no grade), `A106_GR_B · 114.3×6.02 SCH40` (seamless pipe — confirms no fabricated unit suffix is appended, which would have corrupted the SCH token).

# LOCALE BEHAVIOR

`formatCompactVariantSpecification` intentionally accepts no `locale` parameter — `grade_code`/`commercial_size` are single Odoo-sourced strings, not per-locale data (the same known limitation `variantSpecLabel`/`group_name` already document elsewhere in this codebase), so technical tokens (`A3`, `IPE`, `10 mm`, `S235JR`) are preserved verbatim across fa/en/ar by construction — no translation is ever attempted, which is how "never invent a mistranslation" is satisfied structurally rather than by a runtime check.

# ROUTING

`href: /products/{template-slug}?variant={variant-xid}` — reuses the `?variant=` query parameter `app/[locale]/products/[slug]/page.tsx` already consumes (verified by reading that file: `searchParams.variant` resolves a `highlightedVariant` for the existing variant-spec table). No new route invented. Locale-prefixing happens where it already did — `components/home/price-strip.tsx` calls `localizedPath(locale, item.href)`; the repository's `href` stays locale-agnostic, matching the pre-P3 convention.

# COMMERCIAL BASIS

`unit` (mandatory), `marketOrLocation`, and `deliveryBasis` are now all carried through to the public item from the winning quote's configured target basis when materially set (`?? undefined`, never silently dropped as the pre-P3 model did). Verified in `lib/pricing/price-strip-item.test.ts` ("marketOrLocation and deliveryBasis are carried through when materially configured" / "...are undefined (not null) when not configured").

# PRICE / CURRENCY / UNIT

Unchanged: `lib/pricing/money.ts#rialToTomanForDisplay` (exact integer truncation, no floating point) is reused as-is — no defect found, so no change made (task §11 "do not change commercial currency semantics unless a real defect is found"). Verified with an explicit exactness test (`500_000_000` IRR → `50_000_000` Toman, `Number.isInteger` asserted).

# FRESHNESS INTEGRATION

Unchanged selection/classification policy (PRICE-P2) — `lib/pricing/quote-selection.ts#selectWinningQuote` is called exactly once per display row, inside the pure `buildPriceStripItem`, and remains the sole place a winner is chosen. The public contract's `freshnessState` field is now narrowed from the full 4-state `FreshnessState` domain type to `"fresh" | "aging"` — `lib/pricing/price-strip-item.ts#toPublicFreshnessState` asserts this invariant explicitly at the narrowing boundary (throws — caught by the caller's per-item try/catch — on an unreachable state) rather than merely relying on it silently holding. No independent recomputation of freshness anywhere in this phase's new code; no new threshold introduced; `isStale` is not reintroduced (see LEGACY CONTRACT REMOVAL).

# QUOTE SELECTION

Unchanged from PRICE-P2 (`selectWinningQuote`). `lib/pricing/price-strip-item.ts#buildPriceStripItem` adds one defense-in-depth filter before selection: `hasValidPriceAmount` excludes any candidate whose `price_amount_irr` is not a positive safe integer (task §18 "malformed row"), so a single corrupted quote row cannot corrupt a benchmark or crash the strip — verified in `price-strip-item.test.ts` ("a malformed candidate does not suppress a separate valid candidate for the same display row").

# PROVIDER POLICY LOOKUP

Unchanged — `lib/pricing/provider-policy-repository.ts` (added in PRICE-P2) already existed and is reused as-is; no new policy-lookup code was needed for this phase (task §14).

# BENCHMARK CURATION

The read model's outer selection remains `price_display_products` (never a raw scan of `public_price_quotes`) — verified live: a `public_price_quotes` row inserted for a `product_key` with zero curated `price_display_products` rows can never be reached by the repository's per-row `WHERE product_key = ?` fetch, because that fetch only ever runs once per curated row already in hand. Stable order: `ORDER BY sort_order ASC, display_price_id ASC` — verified live with three synthetic-fixture rows (two eligible, one inactive, one null-`variant_key`) returning exactly the two eligible rows in `sort_order` order.

# DISPLAY LIMIT

`lib/pricing/price-strip-config.ts#MAX_HOMEPAGE_PRICE_STRIP_ITEMS = 6`, applied via `items.slice(0, MAX_HOMEPAGE_PRICE_STRIP_ITEMS)` in `lib/pricing/repository.ts` AFTER the full eligible set (freshness + exact-variant catalog resolution) is computed for every active curated row — never a pre-filter SQL `LIMIT`, so a later-`sort_order` row that turns out to be eligible is never dropped in favor of an earlier ineligible one. Chosen principle (task's own "preferred" option, adopted as-is): the repository owns the eligibility cap; 0/1/2+ section-rendering decisions remain the component's job, unchanged in this phase (`components/home/price-strip.tsx` was not touched).

# PROVENANCE / PRIVACY

Confirmed no supplier/cost/margin/private term or provenance field (`provider_id`, `quote_key`, `provider_title`, `source_url`, internal sync failure detail) reaches the public type — enforced by an explicit runtime field-allowlist test (`price-strip-item.test.ts` "output contains ONLY the allowed public fields") plus a structural guarantee (`QuoteCandidate`, the type selection operates on, has no `providerTitle`/`quoteKey`/`sourceUrl` field at all — verified by a dedicated test asserting their absence from that type's own shape).

# FAILURE ISOLATION

Two-tier, matching task §18 exactly:
- **Per-item** (task's "one bad benchmark must not poison every valid benchmark"): each display row's quote fetch and catalog-resolution+assembly step runs inside its own `try/catch` inside the `for` loop in `lib/pricing/repository.ts` — an exception in one iteration cannot affect any other iteration (a basic, language-level guarantee of `try/catch` scoped inside a loop body, not something requiring empirical proof). A failure is logged (`PRICE_STRIP_ITEM_QUOTE_FETCH_ERROR` / `PRICE_STRIP_ITEM_RESOLUTION_ERROR`) and that row is simply excluded from `items`.
- **Whole-strip** (task's "unless the DB itself is unavailable"): the outer `try/catch` around the initial curated-row query and the batched policy lookup returns `[]` on failure — these are the two calls that, if they fail, indicate DB_PUBLIC itself is unreachable, not a single bad row.
- **Malformed row**: `hasValidPriceAmount` (see QUOTE SELECTION) excludes a single corrupted quote candidate without excluding its sibling candidates for the same display row.
- **Catalog resolution failure**: `variantAnchor === null` (any reason — missing/inactive/non-public/unpublished) makes `buildPriceStripItem` return `null` for that one item only, proven directly by a pure unit test (`price-strip-item.test.ts` "catalog resolution failure (null anchor) fails this item closed").

# PERFORMANCE / QUERY COUNT

Exact pattern when `PRICE_STRIP_ENABLED=true`, for N active curated (`variant_key IS NOT NULL`) display rows:

1. `SELECT ... FROM price_display_products WHERE is_active = 1 AND variant_key IS NOT NULL ORDER BY ...` — 1 query.
2. `SELECT ... FROM public_price_quotes WHERE product_key = ? AND status = 'active'` — N queries (one per display row).
3. `getProviderPublicationPolicies` (batched across every distinct `provider_id` seen among all candidates) — 1 query.
4. `resolvePublicPriceStripVariantAnchor` — N queries (one per display row).

Total: **2N + 2**. This is the same query-count class the prior audit found ("roughly 1 + 2N") — one additional query versus that baseline is the already-existing PRICE-P2 batched-policy call, not new in this phase. Not batched further: `price_display_products` is a small, owner-curated table (never the full ~237-row public catalog), so N stays small by construction; introducing cross-row batching for `resolvePublicPriceStripVariantAnchor` (e.g. an `IN (...)` variant-list query) would add real query-construction complexity for a bound that is already tight in practice — deferred per task §19's own explicit "avoid premature optimization" allowance, documented here rather than silently skipped.

# NETWORK ISOLATION

Proven two ways:
- **Structural**: `lib/pricing/price-strip-item.ts` (the pure selection/assembly module) has no `cloudflare:workers` dependency and does not import `lib/db/public.ts` — it receives already-fetched data and a `D1Database`-free `Map` of policies as plain arguments.
- **Static test**: `lib/pricing/repository-network-isolation.test.ts` (new, 4 tests) asserts, by reading source text: neither `lib/pricing/repository.ts` nor `lib/pricing/price-strip-item.ts` calls `fetch()`; neither imports a provider adapter, the Odoo adapter, or the sync orchestrator; `repository.ts`'s only three dynamic imports are exactly the documented ones (`lib/db/public.ts`, `lib/catalog/editorial-repository.ts`, `lib/pricing/provider-policy-repository.ts`).

# LEGACY CONTRACT REMOVAL

`title_override_fa`/`title_override_en`/`title_override_ar`/`link_override_category_slug` are no longer read anywhere in `lib/pricing/repository.ts` — the V2.1 exact-variant path never uses them (a curated row without a `variant_key` is excluded before any title/link resolution is attempted at all, per task §4). The database columns themselves are untouched (additive-only discipline; no migration in this phase) — they simply become dead/unused for the current V2.1 path, documented here rather than silently dropped. The legacy boolean `isStale` (already retired from the domain in PRICE-P2) remains retired; no dual contract exists — `components/home/price-strip.tsx` required zero changes in this phase because every field it already used (`title`, `priceToman`, `unit`, `freshnessState`, `effectiveTimestamp`, `href`, `displayPriceId`) kept its exact name and (for `freshnessState`) a compatible narrower type.

# FILES CREATED

- `lib/pricing/price-strip-item.ts`
- `lib/pricing/price-strip-item.test.ts`
- `lib/pricing/price-strip-config.ts`
- `lib/pricing/price-strip-config.test.ts`
- `lib/pricing/repository-network-isolation.test.ts`

# FILES MODIFIED

- `lib/catalog/specification-presenter.ts` (added `formatCompactVariantSpecification`)
- `lib/catalog/specification-presenter.test.ts` (added 7 tests)
- `lib/catalog/editorial-repository.ts` (added `resolvePublicPriceStripVariantAnchor`)
- `lib/pricing/types.ts` (`PublicPriceStripItem` gains `templateXid`/`variantXid`/`specification`/`marketOrLocation`/`deliveryBasis`; `freshnessState` narrowed to `"fresh" | "aging"`)
- `lib/pricing/repository.ts` (rewritten: exact-variant-only curated query, per-row failure isolation, delegates all selection/assembly to `price-strip-item.ts`, applies the post-eligibility display cap)

`components/home/price-strip.tsx` — **not modified** (verified unnecessary; see LEGACY CONTRACT REMOVAL).

# PRICING TEST RESULTS

`npx tsx --test lib/pricing/*.test.ts` → **162 pass, 0 fail** (up from PRICE-P2's 143; +19: 12 in `price-strip-item.test.ts`, 3 in `price-strip-config.test.ts`, 4 in `repository-network-isolation.test.ts`). `lib/catalog/specification-presenter.test.ts` gained 7 more tests but lives under `lib/catalog/`, not `lib/pricing/` — see FULL TEST RESULTS/REGRESSION RESULT for that count.

# FULL TEST RESULTS

`npm test` (full repository suite) → **787 pass, 0 fail** (up from 784 before this phase).

# TYPESCRIPT RESULT

`npx tsc --noEmit` → clean, 0 errors.

# BUILD RESULT

`npm run build` (`vinext build`) → succeeded. All 11 routes built. `tsconfig.tsbuildinfo` restored via `git restore` after the build (generated artifact, never committed).

# LOCAL D1 RESULT

Used, local-only, no `--remote` flag at any point. All fixtures clearly test-only (`test-p3-*` ids) and deleted after verification; two real rows' flags (`product_pf_shs_s80x80x4_l6.is_active`, `product_tmpl_pf_shs.is_public`) were temporarily toggled and restored — confirmed restored by a final read-back. Final state confirmed: `price_display_products`/`public_price_quotes`/`price_provider_policies`/`price_product_mappings`/`price_sync_state` all at 0 rows (unchanged from before this phase); `product_variants` total unchanged at 237; both toggled flags back to `1`.

Verified live (exact SQL statements the code issues, real bound values, this repo's established convention):
1. Positive resolution (real data: `product_rb_aj340_d10_l12` under `product_tmpl_rb_aj340`, locale `fa`) → correct `grade_code`/`commercial_size`/`title`/`slug` returned.
2. A sibling variant (`..._d16_l12`) under the same template → distinct `commercial_size` (`Ø16` vs `Ø10`), same `title`/`slug`.
3. Variant/template mismatch (real variant, wrong `templateXid`) → 0 rows.
4. Non-public variant (real data: `product_sh_hr_s355jr_s35x2000x6000`, `is_public=0`) → 0 rows.
5. Inactive variant (temporary toggle, restored) → 0 rows.
6. Non-public template (temporary toggle, restored) → 0 rows.
7. `price_display_products` curated-row query: a NULL-`variant_key` fixture row and an inactive fixture row are both excluded; two eligible fixture rows return in the correct `sort_order`.
8. An uncurated `public_price_quotes` row (no matching `price_display_products` row) is structurally unreachable by the repository's per-curated-row-scoped quote fetch.

# REGRESSION RESULT

PASS, all named domains re-run individually with zero failures after this phase's changes:
- Header/content: `npx tsx --test lib/content/*.test.ts` → 38 pass.
- Processing: `npx tsx --test lib/processing/*.test.ts` → 42 pass.
- Catalog (includes Homepage — `lib/catalog/homepage-*.test.ts`): `npx tsx --test lib/catalog/*.test.ts` → 220 pass.
- RFQ/Contact: `npx tsx --test lib/rfq/*.test.ts` → 192 pass.
- Locales (hreflang/metadata): `npx tsx --test lib/metadata/*.test.ts` → 5 pass.
- Full suite (`npm test`, superset of all the above plus every other domain): 787 pass, 0 fail.

# GIT

- Commit A (runtime + tests only): `24b261c8c79020c7cdd8bd9fbffb2bf307f7d646` — "feat: complete exact-variant Price Strip read model".
- Commit B (this report; evidence only): recorded after this file is committed — see the final response for its SHA.
- No amendment of Commit A. No push. No force operations.

# PRODUCTION SAFETY

No staging/production D1 migration executed (no migration at all in this phase — purely additive query/logic changes against the existing PRICE-P1 schema). No `--remote` flag used at any point. `PRICE_STRIP_ENABLED` remains untouched (not set to `"true"` anywhere) — the new read-model code has never executed against a real "flag on" request in this phase; it has been verified via (a) pure unit tests of the selection/assembly logic and (b) live verification of the exact SQL statements it issues against local D1, per this repository's own established convention for D1-touching code (see docs/pricing/PRICE_PROVIDER_CONTRACT.md's own documented rationale for this split).

# REMAINING RISKS

- The new orchestration flow in `lib/pricing/repository.ts` (the loop, per-row try/catch, dynamic imports) has not been exercised end-to-end against a live Workers runtime with `PRICE_STRIP_ENABLED=true` — only its individual SQL statements (live) and its pure delegate `buildPriceStripItem` (extensively unit-tested) have been verified. A future phase that actually enables the flag should include a `wrangler dev`/real-request smoke test of the full path.
- `resolvePublicPriceStripVariantAnchor` runs once per active curated display row regardless of whether that row ends up having any eligible quote — a deliberate simplification (task §19's "avoid premature optimization") that trades a few possibly-unnecessary catalog queries for simpler code; acceptable while `price_display_products` stays small, called out here as a known scaling consideration if that table ever grows large.
- No production/staging price or curation data exists yet to exercise this read model against; all verification is against real (but currently unpublished-for-pricing) catalog data plus small, deleted synthetic fixtures, consistent with this phase's explicit "do not insert fake production data" constraint.
- `title_override_*`/`link_override_category_slug` columns remain in the schema but are now fully dead code paths for V2.1 — not removed (no migration in this phase, and DROP is disallowed by this repository's discipline regardless); a future documentation-cleanup or migration phase may want to formally deprecate them.

# NEXT PHASE

PRICE-P4 can build the final Homepage Price Strip UI (trust guidance copy, cream surface, desktop grid, mobile scroll, semantic markup, ARIA, focus styling, 0/1-hide behavior, the final 6-card visual layout) directly on top of this read-model contract (`title`, `specification`, `priceToman`, `unit`, `marketOrLocation`, `deliveryBasis`, `freshnessState`, `effectiveTimestamp`, `href`) without needing to revisit data-layer eligibility, freshness, or provenance again.
