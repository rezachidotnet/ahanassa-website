import type { Locale } from "@/config/locales";

/**
 * Purchase Process decorative step numbers — frozen V2.0 §16 / §32
 * (docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md).
 *
 *   FA -> ۰۱ ۰۲ ۰۳ ۰۴
 *   AR -> ٠١ ٠٢ ٠٣ ٠٤
 *   EN -> 01 02 03 04
 *
 * Unlike Evaluation / Assurance's axis indexes — which §16 explicitly
 * contrasts against ("Unlike Evaluation / Assurance, these numbers represent
 * real order") — this sequence IS chronological. That does NOT make the
 * glyphs semantic, though: §16 freezes the model as
 *
 *     <ol> = sequence semantics
 *     custom 01/02/03/04 = visual scanning only
 *
 * so these are still rendered `aria-hidden="true"` and assistive technology
 * relies on the ordered-list structure alone. They live here as presentation
 * derivation rather than as literal digits in `homepageCopy` for the same
 * reason the axis indexes do: storing them per locale would invite a future
 * edit that changes the visible order without changing DOM order (§32: "The
 * underlying semantic order remains the `<ol>` order, independent of visible
 * digit shaping").
 *
 * DELIBERATELY NOT SHARED with `lib/content/evaluation-assurance.ts#evaluationAxisIndex`
 * or `lib/pricing/price-strip-presentation.ts`, even though all three derive
 * locale digits from `Intl.NumberFormat`. This follows the convention this
 * repository already set and documented in `evaluation-assurance.ts` itself:
 * "the Price Strip is a frozen component and is deliberately NOT refactored to
 * share this one — a second small pure constant is cheaper than reopening a
 * frozen file." Evaluation / Assurance V2.1 is likewise frozen, and its helper
 * carries a doc-comment asserting the exact opposite semantics to this one
 * ("They do not imply chronological order"), so a single shared function would
 * have to document both meanings at once and would couple two components whose
 * specs (§3, §16) go out of their way to keep separate. The cost of the
 * duplication is bounded and pinned: `purchase-process-frozen-spec-invariants.test.ts`
 * asserts this function and `evaluationAxisIndex` agree digit-for-digit, so the
 * two copies cannot silently drift.
 */
const LOCALE_NUMERALS_FOR: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };

/**
 * Exactly four public customer-facing steps — V2.0 §6 ("The Homepage uses
 * exactly four customer-facing steps"), re-frozen by both acceptance matrices
 * (§37, §39: "Step count | Exactly 4"). Exported so the content module's shape
 * can be asserted against a single named constant rather than a magic number.
 *
 * This is the count of PUBLIC steps, not of internal operational states — §35:
 * "Public Process = customer-understandable abstraction, NOT exposed ERP state
 * machine."
 */
export const PURCHASE_STEP_COUNT = 4;

/**
 * Formats the zero-based step position as its decorative, locale-scripted,
 * zero-padded index. `index` is the array position, so step 0 renders as "01"
 * in the active locale's digit script.
 *
 * `useGrouping: false` matters: without it a future 4+ digit index would gain a
 * locale separator. `minimumIntegerDigits: 2` produces the frozen zero-padded
 * two-digit form in each locale's own digit script (verified: fa-IR -> "۰۱",
 * ar-EG -> "٠١", en-US -> "01").
 */
export function purchaseStepIndex(locale: Locale, index: number): string {
  return new Intl.NumberFormat(LOCALE_NUMERALS_FOR[locale], {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(index + 1);
}
