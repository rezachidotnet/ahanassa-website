/**
 * W20.1 (owner instruction 2026-10-16): the colour of a price change, everywhere a change is shown (the /prices
 * tables, the product page's variant table and PriceBlock). Up = green, down = red, unchanged = neutral. The colour
 * only repeats what ▲/▼ and the % already say — callers always render the arrow and the value too (never colour
 * alone, WCAG 1.4.1). The tokens and their contrast ratios: styles/tokens.css `--aa-color-price-up/down`. This
 * supersedes W9.6/W10.2's "neutral colours, not red/green".
 */
export type PriceChangeDirection = "up" | "down" | "none";

export const PRICE_CHANGE_TONE_CLASS: Record<PriceChangeDirection, string> = {
  up: "text-price-up",
  down: "text-price-down",
  none: "text-neutral-700",
};

export function priceChangeToneClass(direction: PriceChangeDirection): string {
  return PRICE_CHANGE_TONE_CLASS[direction];
}
