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
