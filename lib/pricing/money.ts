/**
 * Exact money representation — docs/pricing/PRICE_PROVIDER_CONTRACT.md.
 * `price_amount_irr` is always true, exact Rial, stored as an integer
 * (never SQLite REAL / floating point). A Toman-quoting provider's value
 * is converted by exact integer multiplication (x10) at normalization
 * time (lib/pricing/normalize.ts) — Rial and Toman are never silently
 * mixed. The public website always DISPLAYS Toman, consistently across
 * fa/en/ar; the conversion back is integer division with a documented,
 * deterministic truncation rule for the (data-quality-signal) case of a
 * Rial amount that isn't an exact multiple of 10.
 */

export function tomanToExactRial(amountToman: number): number {
  return Math.trunc(amountToman) * 10;
}

export interface TomanDisplayResult {
  toman: number;
  /** True when `priceAmountIrr` was not an exact multiple of 10 — a real data-quality signal for a Rial-native source, since a genuine Toman-origin value is always exact x10. The remainder is discarded (truncated), never rounded unpredictably. */
  hadRemainder: boolean;
}

export function rialToTomanForDisplay(priceAmountIrr: number): TomanDisplayResult {
  const toman = Math.trunc(priceAmountIrr / 10);
  const hadRemainder = priceAmountIrr % 10 !== 0;
  return { toman, hadRemainder };
}
