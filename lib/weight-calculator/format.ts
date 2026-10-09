import type { Locale } from "../../config/locales.ts";
import { normalizeDigits } from "../rfq/quantity.ts";

/**
 * Number formatting and parsing for the weight calculator (W10.1).
 *
 * Deterministic, never `Intl`: the calculator is a client component whose
 * first render is also prerendered into the static HTML, and the build
 * runtime's ICU data is not the browser's (architecture V1.1 §4.2, A7 — the
 * same reason as lib/content/locale-digits.ts). The output matches
 * `Intl.NumberFormat("fa-IR" | "en-US" | "ar-EG")`: Persian (fa) and
 * Arabic-Indic (ar) digits, «٬» as the group separator and «٫» as the
 * decimal separator on fa/ar, "," and "." on en.
 *
 * ROUNDING (documented on the page, «مبنای محاسبه»): every calculation runs
 * at full precision; only the displayed value is rounded, half away from
 * zero, to the number of decimals each figure allows (DISPLAY_DECIMALS),
 * with trailing zeros dropped.
 */

const DIGIT_ZERO: Record<Locale, number> = { fa: 0x06f0, en: 0x30, ar: 0x0660 };
const GROUP: Record<Locale, string> = { fa: "٬", en: ",", ar: "٬" };
const DECIMAL: Record<Locale, string> = { fa: "٫", en: ".", ar: "٫" };

/** Decimals shown for each figure. */
export const DISPLAY_DECIMALS = {
  /** kg/m and kg/m² (rebar Ø8 is 0.395 kg/m). */
  perMetre: 3,
  /** kg per piece / per sheet. */
  perPiece: 2,
  /** total kg. */
  totalKg: 1,
  /** total tonnes (= kg precision). */
  totalTon: 3,
  /** exact (fractional) piece count. */
  pieces: 2,
} as const;

/** Half away from zero at `decimals` places; the epsilon keeps 1.005 → 1.01 despite binary floating point. */
export function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = Math.abs(value) * factor;
  return (Math.sign(value) * Math.round(scaled + scaled * Number.EPSILON)) / factor;
}

/** Cost estimates: to the nearest 1,000 Toman (an estimate, not an invoice figure). */
export function roundToThousand(value: number): number {
  return roundHalfAwayFromZero(value / 1000, 0) * 1000;
}

function localizeDigits(locale: Locale, ascii: string): string {
  const zero = DIGIT_ZERO[locale];
  return ascii.replace(/[0-9]/g, (d) => String.fromCharCode(zero + (d.charCodeAt(0) - 0x30)));
}

/** `value` rounded to at most `maxDecimals` places, grouped and in the locale's digits. Non-finite → "—". */
export function formatNumber(locale: Locale, value: number, maxDecimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = roundHalfAwayFromZero(value, maxDecimals);
  const [intPart, fracPart = ""] = Math.abs(rounded).toFixed(maxDecimals).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u0000");
  const fraction = fracPart.replace(/0+$/, "");
  const ascii = `${rounded < 0 ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
  return localizeDigits(locale, ascii).replace(/\u0000/g, GROUP[locale]).replace(".", DECIMAL[locale]);
}

/** A plain value for an input field (no grouping): "12" → «۱۲» on fa. */
export function formatInputValue(locale: Locale, value: number): string {
  if (!Number.isFinite(value)) return "";
  const ascii = String(roundHalfAwayFromZero(value, 3));
  return localizeDigits(locale, ascii).replace(".", DECIMAL[locale]);
}

/**
 * Parses what a visitor typed: Persian/Arabic-Indic or ASCII digits, «٫» / "."
 * / "/" as the decimal point, «٬» / "," as grouping. Returns NaN for anything
 * else (never a guessed number).
 */
export function parseDecimalInput(raw: string): number {
  const normalized = normalizeDigits(raw).trim().replace(/[٬,\s]/g, "").replace(/[٫/]/g, ".");
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(normalized)) return NaN;
  return Number(normalized);
}
