import type { Locale } from "../../config/locales.ts";

/**
 * Deterministic locale digits for static HTML (architecture V1.1 §4.2, A7):
 * the same characters `Intl.NumberFormat("fa-IR" | "en-US" | "ar-EG")`
 * produces for a small non-negative integer, without depending on the ICU
 * data of the build runtime or the browser.
 */
const DIGIT_ZERO: Record<Locale, number> = { fa: 0x06f0, en: 0x30, ar: 0x0660 };

export function formatLocaleDigits(locale: Locale, value: number, minimumIntegerDigits = 1): string {
  if (!Number.isInteger(value) || value < 0) throw new Error("formatLocaleDigits expects a non-negative integer");
  const ascii = String(value).padStart(minimumIntegerDigits, "0");
  const zero = DIGIT_ZERO[locale];
  return [...ascii].map((d) => String.fromCharCode(zero + (d.charCodeAt(0) - 0x30))).join("");
}

const DECIMAL_SEPARATOR: Record<Locale, string> = { fa: "٫", en: ".", ar: "٫" };

/**
 * W43: the ASCII digits of a text (and a decimal point between two digits) in the locale's digits, everything else
 * unchanged — for fixed technical strings such as "Ø 8–630 mm" or "7.70" (trailing zeros kept, unlike formatNumber).
 */
export function localizeNumbers(locale: Locale, text: string): string {
  if (locale === "en") return text;
  const zero = DIGIT_ZERO[locale];
  return text.replace(/(\d)\.(\d)/g, `$1${DECIMAL_SEPARATOR[locale]}$2`).replace(/[0-9]/g, (d) => String.fromCharCode(zero + d.charCodeAt(0) - 0x30));
}

/**
 * W43: in an RTL (fa/ar) string, a parenthetical that starts with a digit and holds more than one Latin token —
 * «فولاد گرمکار 2344 (1.2344 / H13)» — is shown reversed («(H13 / 1.2344)»): after Persian/Arabic letters the
 * digits stay right-to-left and the parentheses land on the wrong side. The parenthetical, brackets included, is
 * wrapped in a left-to-right isolate (U+2066 … U+2069), as lib/weight-calculator/copy.ts does for formulas.
 */
export function ltrParentheses(text: string): string {
  return text.replace(/\(\d[^)]*[\s/،][^)]*\)/g, (m) => `\u2066${m}\u2069`);
}
