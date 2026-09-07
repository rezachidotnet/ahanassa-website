import type { Locale } from "@/config/locales";

/**
 * Evaluation / Assurance decorative index numbers — frozen V2.1 §20 / §20.1
 * (docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md).
 *
 *   FA -> ۰۱ ۰۲ ۰۳ ۰۴
 *   AR -> ٠١ ٠٢ ٠٣ ٠٤
 *   EN -> 01 02 03 04
 *
 * These are scanning aids ONLY. §20: "They do not imply chronological order",
 * and they are always rendered `aria-hidden="true"`, so the semantic meaning
 * is carried entirely by the `<ul>`/`<li>` structure, the `<h3>` axis title,
 * and the explanatory copy. That is also why this lives here as presentation
 * derivation rather than as literal digits stored in `homepageCopy` — the
 * digits are not content, and storing them per locale would invite a future
 * edit that changes the visible order without changing the DOM order (§20.1:
 * "digit localization must not change semantic list order").
 *
 * Locale numbering systems come from the same `Intl` locale tags the pricing
 * layer already relies on for FA/AR/EN numerals. `lib/pricing/price-strip-presentation.ts`
 * has an equivalent private map, but the Price Strip is a frozen component and
 * is deliberately NOT refactored to share this one — a second small pure
 * constant is cheaper than reopening a frozen file.
 *
 * `useGrouping: false` matters: without it a future 4+ digit index would gain
 * a locale separator. `minimumIntegerDigits: 2` produces the frozen
 * zero-padded two-digit form in each locale's own digit script (verified:
 * fa-IR -> "۰۱", ar-EG -> "٠١", en-US -> "01").
 */
const LOCALE_NUMERALS_FOR: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };

/**
 * Exactly four top-level evaluation axes — V2.1 §6 ("A fifth top-level axis
 * must not be added merely to increase visual density"). Exported so the
 * content module's shape can be asserted against a single named constant
 * rather than a magic number scattered across tests.
 */
export const EVALUATION_AXIS_COUNT = 4;

/**
 * Formats the zero-based axis position as its decorative, locale-scripted,
 * zero-padded index. `index` is the array position, so axis 0 renders as
 * "01" in the active locale's digit script.
 */
export function evaluationAxisIndex(locale: Locale, index: number): string {
  return new Intl.NumberFormat(LOCALE_NUMERALS_FOR[locale], {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(index + 1);
}
