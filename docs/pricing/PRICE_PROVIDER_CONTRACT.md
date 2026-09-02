# Homepage Price Strip — Provider Contract

**Status:** Architecture implemented, 2026-09-02. **No real provider is configured or enabled.** `PRICE_STRIP_ENABLED` is `"false"` in every environment (`wrangler.jsonc`) — the homepage strip renders nothing, by design, until this document's own "Safe rollout order" (§7) is followed end to end. No price data anywhere in this system is fabricated or seeded.

Governing decisions this contract implements: `PROJECT_OVERRIDES.md` §4 (public pricing owner-confirmed, price rendering must be from the D1 read model, never a synchronous live Odoo call); `CLAUDE.md`'s "never fabricate price, stock, supplier, availability, or update timestamps."

## 1. Data flow

```
Provider payload
  → provider adapter (IncomingPriceQuote[], via PriceProviderFetchResult)
  → central validation + normalization (NormalizedPriceQuote — lib/pricing/normalize.ts)
  → product mapping (product_key resolved; unmapped rejected — lib/pricing/product-mapping.ts)
  → normalized + mapped quote
  → exact D1 persistence (public_price_quotes, atomic upsert, provider-namespaced quote_key — lib/pricing/sync-orchestrator.ts)
  → configured public read model (price_display_products-driven, exact-basis + freshness + priority selection — lib/pricing/repository.ts)
  → homepage strip (PRICE_STRIP_ENABLED-gated — components/home/price-strip.tsx)
```

## 2. Normalized field definitions

`IncomingPriceQuote` (provider-flavored, `lib/pricing/types.ts`) → `NormalizedPriceQuote` (canonical) via `normalizePriceQuote()`:

| Field | Canonical meaning |
| --- | --- |
| `providerProductRef` | The provider's own identifier for the product this quote is about. |
| `providerQuoteRef` | The provider's own stable identifier for this specific quote line, if it supplies one — used for the quote-key (§3). |
| `providerTitle` | Source/audit metadata only. **Never surfaced as the public title** (§5). |
| `priceAmountIrr` | Exact integer Rial. Never a float (§4). |
| `currency` | Always `"IRR"` in Phase 1 — the only supported currency. |
| `unit` | One of the Phase-1 normalized price-unit allow-list (below). |
| `marketOrLocation`, `deliveryBasis` | Part of the quote's basis identity (§3) — a product can have multiple quotes across these dimensions; never conflated. |
| `sourceTimestamp` | The provider's own effective/as-of time. Rejected if unparseable or materially in the future (small clock-skew allowance only). |

**Phase-1 normalized price-unit allow-list** (`lib/pricing/normalize.ts#KNOWN_UNITS`): `kg`, `ton`, `branch`, `sheet`, `meter`, `piece`. A quote in any other unit is rejected at normalization.

This is a **deliberately narrower** list than the RFQ intake form's own 8-code UoM vocabulary (`lib/rfq/uom.ts#RFQ_UOM_CODES`) — `coil` and `bundle` are intentionally **not** included here. This is not an oversight: `coil`/`bundle` are the RFQ Launch policy's own explicitly *deferred* UoMs (`lib/rfq/uom-policy.ts#LAUNCH_DEFERRED_UOMS`, "never offered" for the current launch catalog) and no real price provider exists yet to actually need them. Adding either to `KNOWN_UNITS` is a one-line change — but it must not happen speculatively; it should happen only once a real provider's commercial semantics (what a "coil" or "bundle" quote basis actually means for pricing) and the intended public display basis for it are explicitly approved, matching the same discipline already applied to their RFQ deferral.

## 3. Quote-key uniqueness rule

`(provider_id, provider_product_ref)` alone is **not** a unique quote identity — a provider may publish multiple quotes for one product across unit/currency/market/delivery-basis. `quote_key` is:

- `${providerId}:${providerQuoteRef}` when the provider supplies its own stable per-quote reference, or
- `${providerId}:${sha256Hex(JSON.stringify([providerProductRef, unit, currency, marketOrLocation, deliveryBasis]))}` otherwise.

Always **provider-namespaced** — two different providers using the same external reference (`"123"`) never collide (`lib/pricing/quote-key.ts`, tested).

## 4. Money — exact Rial, display in Toman

`public_price_quotes.price_amount_irr` is an `INTEGER`, always exact Rial — **never `REAL`**. A Toman-quoting provider's declared convention (`ProviderCurrencyConvention`, per-provider, `lib/pricing/provider-config.ts`) triggers an exact `× 10` integer multiplication at normalization time (`lib/pricing/money.ts#tomanToExactRial`). The public website always **displays Toman**, consistently across fa/en/ar: `rialToTomanForDisplay()` divides by 10 with integer truncation; a Rial amount that isn't an exact multiple of 10 (a genuine data-quality signal — real Toman-origin values are always exact ×10) truncates deterministically and is never rounded unpredictably.

## 5. Title/link authority

A provider's `provider_title` is **source/audit metadata only** — it is never shown to a visitor. `price_display_products.product_key` is expected to correspond to a real internal catalog identity (a `template_xid`); `lib/pricing/repository.ts` resolves the actual public title/link through `lib/catalog/editorial-repository.ts#getPublishedCatalogTemplateTitleByXid` — the same publication-gated read every other public catalog page uses. `title_override_fa/en/ar` + `link_override_category_slug` exist **only** for a price line with no exact catalog-product equivalent (e.g. a market-reference figure not tied to one of the current 3 launch templates) — this is a documented exception, never the default path.

## 6. Product mapping

`price_product_mappings (provider_id, provider_product_ref) → product_key`, manually curated. An unmapped quote is **rejected** before it is ever persisted — never guessed from a provider-supplied name/title.

## 7. Safe rollout order

1. Ship the migration (`migrations_public/0004_public_price_quotes.sql`) — additive, safe with the flag off.
2. Deploy this code with `PRICE_STRIP_ENABLED` unset/`"false"` (current state).
3. Implement a real `PriceProvider` (replacing the throwing `odoo-price-provider.ts` stub, or adding a new one) and add it to `PROVIDER_REGISTRY` (`lib/pricing/provider-registry.ts`).
4. Populate `price_product_mappings` and `price_display_products` for the products that should actually appear on the strip.
5. Declare the new provider's `ReconciliationPolicy` in `lib/pricing/provider-config.ts` (`allowSnapshotReconciliation`, `allowAuthoritativeEmptySnapshot`, optionally `maxReconciliationDeactivationFraction`, `currencyConvention`) — see §8.
6. Set `ENABLED_PRICE_PROVIDERS` (comma-separated, order = priority) via `wrangler.jsonc`/a deployment secret update.
7. Add the cron wiring (one case in `workers/entry.ts`'s `scheduled()` switch, one `triggers.crons` entry in `wrangler.jsonc`) — **deliberately not done in this pass**, since no real provider exists yet.
8. Run/verify a real sync manually (e.g. by invoking `runScheduledPriceSync` once through a temporary admin path or the Cron itself) — confirm `price_sync_state` shows a clean success, `public_price_quotes` has the expected rows.
9. Only then set `PRICE_STRIP_ENABLED="true"`.

## 8. Registry vs. enabled list — explicit-failure contract

`PROVIDER_REGISTRY` (`lib/pricing/provider-registry.ts`) is every **known** implementation — being listed there means "this code exists," never "this is live." `ENABLED_PRICE_PROVIDERS` (env var, comma-separated, **order = priority**) is the actual activation switch, validated against the registry at read time (`lib/pricing/provider-config.ts#getEnabledProviderIds` — an unknown enabled ID is logged as `PRICE_PROVIDER_CONFIG_ERROR` and skipped, never silently ignored or crashing the whole sync run). A provider that cannot actually run (e.g. `odoo-price-provider.ts` today) **throws** `ProviderNotConfiguredError` from `fetchPrices()` rather than resolving an empty/successful result — this must surface as an explicit failure if it's ever accidentally enabled, never a silent successful empty sync.

## 9. Staleness

Computed at **read time**, never stored. Authority is `source_timestamp`; `synced_at` is used **only** as a documented fallback when a given provider supplies no `source_timestamp` at all — re-syncing an old provider value must never make it look fresh merely because `synced_at` advanced. Threshold: 24 hours (`STALE_THRESHOLD_MS`, `lib/pricing/quote-selection.ts` / `lib/pricing/repository.ts`) — a single named constant, not hidden inside a query.

## 10. Selection policy (definitive)

For a given `price_display_products` row's exact configured basis (unit/currency/market/delivery-basis):

1. Only quotes matching that **exact** basis are considered at all — never a different unit/currency/market/delivery-basis, even when nothing else matches.
2. Fresh (non-stale) quotes are preferred over stale quotes, **regardless of provider priority**.
3. Among fresh compatible quotes, pick by `ENABLED_PRICE_PROVIDERS`' own declared order (no separate static priority list — reprioritizing is a config/deployment change, never a homepage/repository code edit).
4. Only when **no** fresh compatible quote exists at all, fall back to the highest-priority **stale** compatible quote, visibly marked stale.
5. Never average. Provenance (`provider_id`, timestamps) always flows into the returned shape.

Pure, fully unit-tested: `lib/pricing/quote-selection.ts`.

## 11. Safe reconciliation (deactivation)

A quote_key that was previously `active` for a provider may be soft-deactivated (`status = 'inactive'`) only when **all** of the following hold for that sync run:

- `mode === "full_snapshot"` (an `"incremental"`-mode provider's response never deactivates by absence — a delta saying nothing about a product says nothing about whether it's still on offer).
- `complete === true` (a partial/paginated/timed-out fetch never triggers deactivation).
- The provider's `ReconciliationPolicy.allowSnapshotReconciliation === true` (opt-in, default `false`).
- Zero records were rejected by normalization/mapping this run (even one rejection means the incoming key set can't be trusted as a complete, faithful picture — a "missing" key might just be our own rejection, not the provider's real absence).
- **Empty-snapshot case** (incoming set is exactly empty): additionally requires `allowAuthoritativeEmptySnapshot === true`. This is a single unambiguous rule — all four flags together are the sole, sufficient authorization; this case is never additionally gated by `maxReconciliationDeactivationFraction` (that's the separate, non-empty case below).
- **Non-empty, some-missing case**: permitted only up to the provider's own declared `maxReconciliationDeactivationFraction`. **No universal percentage is hardcoded** — when a provider has declared no such fraction, any non-zero deactivation is blocked by default.

Pure decision logic (`lib/pricing/sync-safety.ts#evaluateReconciliationGate`) is exhaustively unit-tested; the D1 query shapes themselves have been verified directly against local D1 (`wrangler d1 execute --local`) during implementation — see §15 for how the surrounding orchestration/failure-isolation logic is tested.

Valid upserts always happen regardless of the reconciliation decision — a record rejection or a blocked reconciliation never prevents the *valid* records around it from being saved; only the deactivation-of-missing-keys step is gated. Both the upserts and any authorized deactivations for a given run are applied together in one atomic D1 `.batch()` — a write failure can never leave the two partially applied.

## 12. Provider-level failure isolation

The **complete** per-provider operation — registry lookup, config resolution, `getPublicDb()`, lease acquisition, provider fetch, normalization, mapping, quote-key generation, upsert/reconciliation, sync-state update — is protected by a single failure boundary per provider (`lib/pricing/sync-orchestrator.ts#syncOneProvider`). A failure for one enabled provider **never** prevents a later enabled provider from running — `runScheduledPriceSync` iterates providers sequentially (not `Promise.all`, so one provider's D1 operations never race another's) and always continues to the next provider regardless of how the previous one failed.

**If `getPublicDb()` itself fails**, recording the failure in `price_sync_state` is impossible by definition — there is no database connection to write through. That case emits a structured `PRICE_SYNC_FAILED` error log (`reasonCode: "database_unavailable"`, `persisted: false`) and returns — it never falsely claims the failure was persisted. If the database IS reachable but the specific write that records a failure also fails (a `price_sync_state` write error on top of the original failure), both are logged, still without claiming persistence that didn't happen.

No price row is ever mutated (no upsert, no deactivation) unless a run reaches the "persistence" stage, which is only reachable after a successful lease acquisition — a failure during registry lookup, config resolution, `getPublicDb()`, or lease acquisition structurally cannot touch `public_price_quotes` at all.

Structured logs (`console.log("PRICE_SYNC", ...)` for normal/concern outcomes, `console.error("PRICE_SYNC_FAILED", ...)` for failures) only ever include scalar-safe fields the orchestrator explicitly picks — `providerId`, `stage`, `reasonCode`, `persisted`, and a length-capped error message string (`lib/pricing/failure-reason.ts#safeErrorMessage`, max 300 chars). The raw error object, a provider's fetched payload, and any credential are never logged.

Tested with a dependency-injected fake D1 (`lib/pricing/sync-orchestrator.test.ts`, §15) — this is a deliberate, narrow exception to the "D1-touching code is validated live, not mocked" convention used everywhere else in this module, because failure-ISOLATION is orchestration-flow logic, not query correctness, and benefits directly from fault injection a live D1 instance can't easily provide.

## 13. Canonical failure reason codes

`price_sync_state.last_failure_reason_code` is **always** one of the following fixed, documented values (`lib/pricing/failure-reason.ts#PriceSyncFailureReasonCode`) — **never** a raw `Error.constructor.name`, `Error.message`, or any other free-form string. `lib/pricing/failure-reason.ts#reasonCodeForStage(stage, error)` is the single, pure, unit-tested function that maps `(the stage that threw, the caught error)` to exactly one of these:

| Code | Meaning |
| --- | --- |
| `provider_not_configured` | The provider adapter threw `ProviderNotConfiguredError` (e.g. `odoo-price-provider.ts` today — the upstream API doesn't support this yet). |
| `provider_unavailable` | The provider's `fetchPrices()` threw for any other reason (network error, non-2xx, malformed payload, etc.). |
| `provider_timeout` | The provider's `fetchPrices()` threw a `TimeoutError`/`AbortError` (the standard DOM exception `.name` values — never inferred from a free-text message match). |
| `provider_configuration_error` | Resolving the provider's `ReconciliationPolicy` failed. |
| `database_unavailable` | `getPublicDb()` itself threw — no DB connection exists; nothing can be persisted for this outcome (§12). |
| `lease_acquisition_failed` | The D1 lease-acquisition `UPDATE`/its preceding `ensureSyncStateRow` `INSERT` threw. |
| `incomplete_fetch` | The reconciliation gate (`sync-safety.ts`) blocked deactivation because `complete !== true`. |
| `critical_normalization_failure` | An error was thrown during the normalize/map stage itself (distinct from an individual record being *rejected*, which doesn't throw — see §11's zero-rejection requirement). |
| `partial_validation_or_mapping_failure` | The reconciliation gate blocked deactivation because one or more records were rejected this run. |
| `suspicious_empty_snapshot` | The reconciliation gate blocked deactivation because the incoming set was empty without `allowAuthoritativeEmptySnapshot`. |
| `suspicious_count_collapse` | The reconciliation gate blocked deactivation because the missing-key fraction exceeded (or had no declared) `maxReconciliationDeactivationFraction`. |
| `persistence_failed` | The D1 `.batch()` upsert/deactivate, or the final `price_sync_state` outcome write, threw. |
| `unknown_provider_failure` | The `providerId` wasn't found in the provider registry. |

## 14. Activating the Odoo provider (not done in this task)

`docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md` confirms the current Public Catalog API v1 serializer structurally excludes price: *"Supplier, supplier site, offers, purchase prices/currency/payment, private MOQ/availability, margins... are structurally unavailable."* To make `lib/pricing/providers/odoo-price-provider.ts` real, an Odoo-side API change is required, exposing (per product variant, at minimum):

- A stable external reference matching `product_variants.xid` (so `provider_product_ref` can map 1:1 to the existing catalog identity).
- A price value and its currency/quoting-unit convention.
- An effective/as-of timestamp for that price.
- Whether the payload represents a full snapshot or an incremental delta (`PriceProviderFetchResult.mode`), and enough pagination/completeness signal for the adapter to set `complete` accurately.

No such endpoint exists today, and this task does not invent one — this document exists so activation is a scoped, well-defined future task rather than a rediscovery effort.

## 15. Tests

- `lib/pricing/normalize.test.ts`, `lib/pricing/money.test.ts`, `lib/pricing/quote-key.test.ts`, `lib/pricing/quote-selection.test.ts`, `lib/pricing/sync-safety.test.ts`, `lib/pricing/failure-reason.test.ts` — pure logic, fully unit-tested, D1-free.
- `lib/pricing/repository.test.ts` — the `PRICE_STRIP_ENABLED` gate (verified to never even import a `cloudflare:workers`-touching module when off) and the error-vs-empty logging distinction.
- `lib/pricing/sync-orchestrator.test.ts` — the failure-isolation contract (§12) with a dependency-injected fake D1: `getPublicDb()` failure caught/logged without falsely claiming persistence; lease-acquisition failure caught, logged, and recorded; an unknown provider ID handled defensively; a first provider's failure never blocking a second enabled provider; no price row mutated on any initialization/lease failure.
- The exact D1 query shapes themselves (schema, upsert/deactivate statements, lease UPDATE, read-model SELECTs): validated live against a real local D1 instance (`wrangler d1 migrations apply DB_PUBLIC --local`, then `wrangler d1 execute --local` against every exact statement the code issues) during implementation — this codebase's own established convention for this class of code, not a mock-based unit test. The failure-isolation *flow* around those queries (§12) is the one deliberate, narrow exception, tested with a fake D1 instead.
