/**
 * Text normalization for reading a customer's item list (W13.3, instant
 * extraction). Ported from the Odoo side's `norm_text`
 * (ahanassa_public_pricing normalize.py, used by the W13.2 file intake), so
 * the website and Odoo read «۱۲٫۵ تن», «12.5 طن» and «12.5 ton» the same way.
 *
 * Pure and isomorphic: the RFQ form runs it in the browser, the RFQ Worker
 * on the AI answer, the tests in Node.
 */

const DIGITS: Record<string, string> = {};
"۰۱۲۳۴۵۶۷۸۹".split("").forEach((d, i) => (DIGITS[d] = String(i)));
"٠١٢٣٤٥٦٧٨٩".split("").forEach((d, i) => (DIGITS[d] = String(i)));

/** Letter and punctuation variants that mean the same thing in a list (Arabic ي/ك vs Persian ی/ک, Arabic decimal mark, ×). */
const LETTERS: Record<string, string> = {
  "ي": "ی",
  "ى": "ی",
  "ئ": "ی",
  "ك": "ک",
  "ة": "ه",
  "ۀ": "ه",
  "أ": "ا",
  "إ": "ا",
  "ٱ": "ا",
  "ـ": "",
  "‌": " ",
  "‍": "",
  "‎": "",
  "‏": "",
  " ": " ",
  "٫": ".",
  "٬": ",",
  "،": ",",
  "×": "x",
  "*": "x",
  "✕": "x",
  "＊": "x",
};
const ARABIC_DIACRITICS = /[ً-ٰٟ]/g;

/** Lower-case text with ASCII digits, unified Persian letters, ZWNJ as a space and single spaces. */
export function normText(value: string | null | undefined): string {
  if (!value) return "";
  let out = "";
  for (const ch of value) out += DIGITS[ch] ?? LETTERS[ch] ?? ch;
  return out.replace(ARABIC_DIACRITICS, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * A looser key for comparing product words: normText plus آ → ا and no
 * spaces («تیر آهن», «تیرآهن» and «تیراهن» are one key).
 */
export function matchKey(value: string | null | undefined): string {
  return normText(value).replace(/آ/g, "ا").replace(/\s+/g, "");
}

/** All numbers of `text`, in order («100x50x5» → [100, 50, 5]; «۱۲٫۵» → [12.5]). */
export function numbersIn(text: string | null | undefined): number[] {
  return [...normText(text).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", ".")));
}

/** Levenshtein distance, capped: returns cap+1 as soon as the distance is known to exceed `cap`. */
export function editDistance(a: string, b: string, cap = 2): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}
