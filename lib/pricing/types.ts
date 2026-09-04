/**
 * Provider-agnostic price domain model (docs/pricing/PRICE_PROVIDER_CONTRACT.md).
 *
 * Two distinct types, not one — the normalization boundary:
 *   - `IncomingPriceQuote`: what a provider adapter's `fetchPrices()`
 *     returns — still provider-flavored (may be in Toman, may carry the
 *     provider's own timestamp string format, has no mapped `productKey`
 *     yet).
 *   - `NormalizedPriceQuote`: what `lib/pricing/normalize.ts`'s
 *     `normalizePriceQuote()` produces from one — canonical currency
 *     (`"IRR"` only, Phase 1), canonical exact-integer amount, canonical
 *     unit vocabulary, validated timestamp. This is the ONLY shape that
 *     may reach the product-mapping/upsert code or be persisted —
 *     provider-specific conventions never leak past this boundary.
 */

export interface IncomingPriceQuote {
  providerProductRef: string;
  /** A provider's own stable per-quote reference, when it supplies one — used for the provider-namespaced `quote_key` instead of a hashed composite. */
  providerQuoteRef?: string;
  /** Source metadata only — never shown as the public title (docs/pricing/PRICE_PROVIDER_CONTRACT.md). */
  providerTitle?: string;
  /** Raw numeric amount, in whatever currency/denomination the provider actually quotes (see `PROVIDER_CURRENCY_CONVENTION`, lib/pricing/normalize.ts). */
  amount: number;
  unit: string;
  marketOrLocation?: string;
  deliveryBasis?: string;
  /** Effective/source timestamp as the provider reports it (ISO 8601), if it supplies one at all. */
  sourceTimestamp?: string;
  sourceUrl?: string;
}

/** The provider fetch call's own completeness/mode contract (Item 6 v4 — see lib/pricing/provider.ts). */
export interface PriceProviderFetchResult {
  quotes: IncomingPriceQuote[];
  /** "full_snapshot": this response is claimed to represent the provider's entire current offering. "incremental": a delta only — absence from it must never imply removal. */
  mode: "full_snapshot" | "incremental";
  /** True only once every required page/check for this fetch has completed successfully — a provider adapter is responsible for setting this accurately; the orchestrator never guesses completeness from the data alone. */
  complete: boolean;
  fetchedAt: string;
}

export type NormalizedPriceQuoteStatus = "active";

export interface NormalizedPriceQuote {
  providerId: string;
  providerProductRef: string;
  providerQuoteRef?: string;
  providerTitle?: string;
  /** Exact integer Rial — never a float. */
  priceAmountIrr: number;
  currency: "IRR";
  unit: string;
  marketOrLocation?: string;
  deliveryBasis?: string;
  /** Validated (non-future, parseable) ISO 8601 timestamp, or undefined if the provider supplied none at all. */
  sourceTimestamp?: string;
  sourceUrl?: string;
}

/**
 * The definitive PRICE-P2 freshness classification
 * (lib/pricing/freshness.ts#classifyQuoteFreshness). Defined here — the
 * existing central domain-types module — rather than in `freshness.ts`
 * itself, so `freshness.ts` (which depends on `normalize.ts`, which
 * already imports its own types from this file) can import this type
 * without creating a circular module dependency.
 */
export type FreshnessState = "fresh" | "aging" | "stale" | "unavailable";

/**
 * The homepage price strip's own read-model output shape — the only thing
 * `components/home/price-strip.tsx` ever sees. Never a raw provider
 * payload or `provider_title`.
 *
 * PRICE-P2: the legacy boolean `isStale` is retired from this type — a
 * winning quote's freshness is now always exactly `"fresh"` or `"aging"`
 * (`lib/pricing/freshness.ts#FreshnessState`), since
 * `lib/pricing/quote-selection.ts#selectWinningQuote` never returns a
 * STALE or UNAVAILABLE candidate as a Homepage winner at all — there is
 * structurally nothing else for this field to hold once an item reaches
 * this shape.
 */
export interface PublicPriceStripItem {
  displayPriceId: string;
  title: string;
  /** Exact Toman integer for display — already truncated from `price_amount_irr` (lib/pricing/money.ts). */
  priceToman: number;
  unit: string;
  /** Always `"fresh"` or `"aging"` in practice — the winning-quote selection never returns a `"stale"`/`"unavailable"` candidate (PRICE-P2). Typed as the full `FreshnessState` union rather than a narrower `"fresh" | "aging"` alias so the UI's exhaustiveness checking stays honest about the domain type, without asserting an invariant this file can't itself enforce. */
  freshnessState: FreshnessState;
  /** The winning quote's effective timestamp (source_timestamp, falling back to synced_at only when the provider supplied no source_timestamp) — for the "last updated" label. */
  effectiveTimestamp: string;
  /** `/products/{slug}` when a catalog match exists, else a category-slug fallback, else undefined (not linked). */
  href?: string;
}
