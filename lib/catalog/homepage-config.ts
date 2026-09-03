/**
 * Centralized homepage-display configuration — this task's §23-26 "no
 * scattered magic numbers". Pure constant, no D1/env dependency.
 */

/** Preserves the current visual behavior (6 cards) — this task's explicit "unless architecture requires otherwise". Changing the card count later is a one-line change here, not a component/query rewrite. */
export const HOMEPAGE_PRODUCT_DISPLAY_COUNT = 6;
