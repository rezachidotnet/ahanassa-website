import type { NormalizedPriceQuote } from "./types.ts";

/**
 * The exact quote-key uniqueness rule (docs/pricing/PRICE_PROVIDER_CONTRACT.md).
 * ALWAYS provider-namespaced — a bare `providerQuoteRef` is not globally
 * unique (two different providers may both use `"123"`). When a provider
 * supplies its own stable per-quote reference, that's used directly
 * (still namespaced); otherwise a SHA-256 hex digest of a structured
 * `[providerProductRef, unit, currency, marketOrLocation, deliveryBasis]`
 * array is used — hashing an unambiguous array avoids any raw-delimiter-
 * collision/escaping risk that string concatenation would have.
 */
export async function computeQuoteKey(quote: NormalizedPriceQuote): Promise<string> {
  if (quote.providerQuoteRef) {
    return `${quote.providerId}:${quote.providerQuoteRef}`;
  }

  const canonical = JSON.stringify([quote.providerProductRef, quote.unit, quote.currency, quote.marketOrLocation ?? null, quote.deliveryBasis ?? null]);
  const digest = await sha256Hex(canonical);
  return `${quote.providerId}:${digest}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
