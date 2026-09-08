import type { Locale } from "@/config/locales";

/**
 * Buyer Value / Service Promise decorative index numbers — frozen V1.0 §7
 * (docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md).
 *
 *   FA -> ۰۱ ۰۲ ۰۳ ۰۴
 *   AR -> ٠١ ٠٢ ٠٣ ٠٤
 *   EN -> 01 02 03 04
 *
 * Identical derivation to `lib/content/evaluation-assurance.ts`, and for the
 * identical reason: §7 says "The numbers communicate grouping and scanability,
 * not a chronological process", so they are presentation, not content, and are
 * always rendered `aria-hidden="true"` (§8: "Decorative visible numbers MUST
 * NOT cause duplicated or misleading screen-reader announcements").
 *
 * This is deliberately a SECOND small pure module rather than a shared
 * "sectionIndex" helper refactored out of the two existing ones
 * (`evaluation-assurance.ts`, `purchase-process.ts`). Those two belong to
 * frozen components; reaching into them to extract a common helper would
 * reopen frozen files for a four-line function. The repo already made this
 * exact call once — see the note in `lib/content/evaluation-assurance.ts`
 * about not refactoring `lib/pricing/price-strip-presentation.ts`.
 *
 * The semantic distinction from `purchaseStepIndex` is load-bearing and must
 * not be collapsed: Purchase Process renders an `<ol>` because its numbers ARE
 * chronology; this component renders a `<ul>` because its numbers are not.
 */
const LOCALE_NUMERALS_FOR: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };

/**
 * Exactly four service promises — V1.0 §22.2 ("It contains four service
 * promises in the frozen order") and §19.3. Exported so the content module's
 * shape is asserted against a named constant rather than a magic number.
 */
export const BUYER_VALUE_PROMISE_COUNT = 4;

/**
 * Formats the zero-based promise position as its decorative, locale-scripted,
 * zero-padded index. Promise 0 renders as "01" in the active locale's digits.
 */
export function buyerValuePromiseIndex(locale: Locale, index: number): string {
  return new Intl.NumberFormat(LOCALE_NUMERALS_FOR[locale], {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(index + 1);
}
