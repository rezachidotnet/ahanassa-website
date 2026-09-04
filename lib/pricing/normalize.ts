import { tomanToExactRial } from "./money.ts";
import type { IncomingPriceQuote, NormalizedPriceQuote } from "./types.ts";

/**
 * The single normalization boundary (docs/pricing/PRICE_PROVIDER_CONTRACT.md)
 * — currency/unit canonicalization, the Toman->Rial exact conversion, and
 * timestamp validation all happen HERE, once, immediately after a
 * provider's `fetchPrices()` call (lib/pricing/sync-orchestrator.ts) and
 * before the product-mapping/upsert code ever sees a record. Nothing
 * downstream of this function ever sees an `IncomingPriceQuote` or a
 * provider-specific convention.
 */

/** Each provider's own quoting-currency convention, declared once per provider — never inferred from the payload. */
export type ProviderCurrencyConvention = "IRR" | "IRT";

/**
 * Phase-1 normalized price-unit allow-list (docs/pricing/PRICE_PROVIDER_CONTRACT.md §2).
 * Deliberately narrower than the RFQ form's own 8-code UoM vocabulary
 * (lib/rfq/uom.ts#RFQ_UOM_CODES) — `coil`/`bundle` are intentionally
 * excluded, matching their RFQ Launch-policy deferral
 * (lib/rfq/uom-policy.ts#LAUNCH_DEFERRED_UOMS). Do not add them
 * speculatively; only once a real provider's commercial semantics for
 * that unit and its intended public display basis are explicitly
 * approved.
 */
const KNOWN_UNITS = new Set(["kg", "ton", "branch", "sheet", "meter", "piece"]);

/** A clock-skew allowance so a source timestamp that's only slightly ahead of server time (clock drift) isn't wrongly rejected — a timestamp materially in the future is still rejected. Exported (PRICE-P2) so `lib/pricing/freshness.ts#classifyQuoteFreshness` can apply the identical tolerance defensively, rather than duplicating the magic number — a quote that has already passed this module's own validation should never reach the classifier with a materially-future timestamp at all, but the classifier fails closed on that case too rather than assuming its input was always pre-validated. */
export const FUTURE_TIMESTAMP_SKEW_ALLOWANCE_MS = 5 * 60 * 1000;

export type NormalizeResult = { ok: true; quote: NormalizedPriceQuote } | { ok: false; rejectedReason: string };

export function normalizePriceQuote(incoming: IncomingPriceQuote, providerId: string, currencyConvention: ProviderCurrencyConvention): NormalizeResult {
  if (!incoming.providerProductRef || !incoming.providerProductRef.trim()) {
    return { ok: false, rejectedReason: "missing_provider_product_ref" };
  }

  if (!Number.isFinite(incoming.amount) || incoming.amount <= 0) {
    return { ok: false, rejectedReason: "invalid_amount" };
  }

  if (!incoming.unit || !KNOWN_UNITS.has(incoming.unit)) {
    return { ok: false, rejectedReason: "unknown_unit" };
  }

  let sourceTimestamp: string | undefined;
  if (incoming.sourceTimestamp) {
    const parsed = Date.parse(incoming.sourceTimestamp);
    if (Number.isNaN(parsed)) {
      return { ok: false, rejectedReason: "invalid_source_timestamp" };
    }
    if (parsed > Date.now() + FUTURE_TIMESTAMP_SKEW_ALLOWANCE_MS) {
      return { ok: false, rejectedReason: "future_source_timestamp" };
    }
    sourceTimestamp = new Date(parsed).toISOString();
  }

  const priceAmountIrr = currencyConvention === "IRT" ? tomanToExactRial(incoming.amount) : Math.trunc(incoming.amount);

  return {
    ok: true,
    quote: {
      providerId,
      providerProductRef: incoming.providerProductRef.trim(),
      providerQuoteRef: incoming.providerQuoteRef,
      providerTitle: incoming.providerTitle,
      priceAmountIrr,
      currency: "IRR",
      unit: incoming.unit,
      marketOrLocation: incoming.marketOrLocation,
      deliveryBasis: incoming.deliveryBasis,
      sourceTimestamp,
      sourceUrl: incoming.sourceUrl,
    },
  };
}
