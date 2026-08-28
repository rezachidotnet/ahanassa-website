/**
 * Freeform-quantity parsing, split out from validation.ts so it has zero
 * `@/`-aliased imports and can be unit-tested with the plain Node test
 * runner (no path-alias resolution needed at test time).
 */

export function normalizeDigits(value: string): string {
  // Persian/Arabic-Indic digits -> ASCII (FORM_ARCHITECTURE.md §8.3).
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = persian.indexOf(ch);
    if (p !== -1) return String(p);
    const a = arabic.indexOf(ch);
    if (a !== -1) return String(a);
    return ch;
  });
}

/**
 * Best-effort leading-decimal extraction from a freeform quantity string
 * ("200 تن" -> value 200, scale 0). Returns null when it cannot be
 * unambiguously parsed rather than guessing — CLAUDE.md/task instructions:
 * "Do not silently coerce dangerous or nonsensical values."
 */
export function parseLeadingQuantity(raw: string): { value: number; scale: number } | null {
  const normalized = normalizeDigits(raw).trim();
  const match = normalized.match(/^(\d{1,12})(?:[.,](\d{1,6}))?/);
  if (!match) return null;
  const [, intPart, fracPart = ""] = match;
  const scale = fracPart.length;
  const value = Number(intPart + fracPart);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (scale > 6) return null;
  return { value, scale };
}
