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
 * payload, `provider_id`, `quote_key`, `provider_title`, or any other
 * internal provenance field (PRICE-P3 §15/§25 — see
 * `lib/pricing/price-strip-item.test.ts`'s explicit field-allowlist
 * contract test).
 *
 * PRICE-P2: the legacy boolean `isStale` is retired from this type.
 * PRICE-P3: every item is now anchored to an EXACT Product Variant
 * (`templateXid`/`variantXid`, frozen spec V2.1) rather than a
 * template-only match — a curated `price_display_products` row with no
 * `variant_key` is simply excluded before this type is ever produced
 * (lib/pricing/repository.ts). `freshnessState` is narrowed here to just
 * `"fresh" | "aging"` (rather than the full domain `FreshnessState`) since
 * `lib/pricing/quote-selection.ts#selectWinningQuote` structurally never
 * returns a `"stale"`/`"unavailable"` winner — `lib/pricing/price-strip-item.ts`
 * asserts this invariant at the boundary where the domain type is narrowed
 * into this public one, rather than merely hoping it holds.
 */
export interface PublicPriceStripItem {
  displayPriceId: string;
  /** `catalog_products.template_xid` — the Product Template this benchmark's exact variant belongs to. */
  templateXid: string;
  /** `product_variants.xid` — the exact Product Variant this benchmark is commercially anchored to (PRICE-P1/P3; never a template-only match). */
  variantXid: string;
  /** The published template's editorial title for `locale` — never `provider_title`. */
  title: string;
  /** Compact, deterministic commercial spec label (grade + size), derived only from catalog data — never a provider's free text (lib/catalog/specification-presenter.ts#formatCompactVariantSpecification). */
  specification: string;
  /** Exact Toman integer for display — already truncated from `price_amount_irr` (lib/pricing/money.ts). */
  priceToman: number;
  unit: string;
  /** Carried through from the winning quote's configured basis when materially set — never silently dropped (PRICE-P3 §10). */
  marketOrLocation?: string;
  deliveryBasis?: string;
  /** Always `"fresh"` or `"aging"` — a STALE/UNAVAILABLE winner can never reach this type (PRICE-P2/P3). */
  freshnessState: "fresh" | "aging";
  /** The winning quote's effective timestamp (source_timestamp, falling back to synced_at only when the provider supplied no source_timestamp) — for the "last updated" label. */
  effectiveTimestamp: string;
  /** `/products/{template-slug}?variant={variant-xid}` — the same `?variant=` convention `app/[locale]/products/[slug]/page.tsx` already consumes for variant highlighting (never a new route). `undefined` only if no valid destination exists — never fabricated (PRICE-P3 §9). */
  href?: string;
}
