/**
 * W20.8 — the Download Center's size search. Pure (no DOM, no node:*), so the server writes each row's
 * search keys with the same normalisation the browser applies to what the visitor types.
 *
 * Accepted input: Persian/Arabic-Indic or Latin digits, «/» or «٫» as a decimal point, × * x as a separator,
 * a form ("IPE 200", "ipe۲۰۰", "UPN"), a family word in fa/en/ar («نبشی ۱۰», "angle", «زاوية»), or both. The
 * numbers match a size from its first dimension on: every number but the last exactly, the last as a prefix —
 * so «نبشی ۱۰» (the market's name for a 100 mm angle) finds 100×100×10, "200" finds IPE 200, "100x50" every
 * 100×50 box section. Any other word must appear in the row's own text (e.g. "sch40").
 */

const DIGITS: Record<string, string> = {};
"۰۱۲۳۴۵۶۷۸۹".split("").forEach((d, i) => (DIGITS[d] = String(i)));
"٠١٢٣٤٥٦٧٨٩".split("").forEach((d, i) => (DIGITS[d] = String(i)));

/** Lower case, Latin digits, one Persian spelling of Arabic letters, no diacritics/tatweel/ZWNJ, one separator form. */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d] ?? d)
    .toLowerCase()
    .replace(/[ً-ٰٟـ‌‍‎‏]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/(\d)\s*[٫/,]\s*(?=\d)/g, "$1.")
    .replace(/(\d)\s*[×x*✕]\s*(?=\d)/g, "$1x")
    .replace(/\s+/g, " ")
    .trim();
}

/** The numbers of a size string, in order: "IPN 100" → ["100"]; "114.3×6.02 SCH40" → ["114.3", "6.02", "40"]. */
export function sizeParts(size: string): string[] {
  return (normalizeSearchText(size).match(/\d+(?:\.\d+)?/g) ?? []).map(canonicalNumber);
}

const canonicalNumber = (n: string) => (n.includes(".") ? n.replace(/0+$/, "").replace(/\.$/, "") : n.replace(/^0+(?=\d)/, ""));

/** Family words → public category code; form words → Odoo form_code (lib/downloads/sections.ts SECTION_SHAPES). */
const FAMILY_WORDS: Readonly<Record<string, readonly string[]>> = {
  BEAM: ["تیرآهن", "تیراهن", "تیر", "beam", "beams", "جسر", "جسور", "کمره", "عارضه"],
  CHANNEL: ["ناودانی", "ناودونی", "channel", "channels", "مجری", "قناه"],
  ANGLE: ["نبشی", "angle", "angles", "زاویه", "زوایا"],
  BOX_SECTION: ["قوطی", "پروفیل", "box", "hollow", "مجوف", "صندوقی"],
  PIPE: ["لوله", "pipe", "pipes", "tube", "انبوب", "ماسوره"],
};
const FORM_WORDS: Readonly<Record<string, readonly string[]>> = {
  IPE: ["ipe"],
  INP: ["ipn", "inp"],
  UPE: ["upe"],
  UPN: ["upn", "unp"],
  HEA: ["hea"],
  HEB: ["heb"],
  SHS_FORM: ["shs"],
  RHS_FORM: ["rhs"],
  EQUAL_ANGLE: [],
  SEAMLESS_PIPE_FORM: [],
};

const index = (table: Readonly<Record<string, readonly string[]>>) => {
  const m = new Map<string, string>();
  for (const [code, words] of Object.entries(table)) for (const w of words) m.set(normalizeSearchText(w), code);
  return m;
};
const FAMILY_INDEX = index(FAMILY_WORDS);
const FORM_INDEX = index(FORM_WORDS);

export interface SizeQuery {
  families: string[];
  forms: string[];
  parts: string[];
  words: string[];
}

export function parseSizeQuery(input: string): SizeQuery {
  const q: SizeQuery = { families: [], forms: [], parts: [], words: [] };
  for (const raw of normalizeSearchText(input).split(" ")) {
    if (!raw) continue;
    // "ipe200" / «نبشی۱۰»: a known word glued to a number.
    const glued = /^(\D+?)(\d[\d.x]*)$/.exec(raw);
    const tokens = glued && (FAMILY_INDEX.has(glued[1]) || FORM_INDEX.has(glued[1])) ? [glued[1], glued[2]] : [raw];
    for (const token of tokens) {
      const family = FAMILY_INDEX.get(token);
      const form = FORM_INDEX.get(token);
      if (family) q.families.push(family);
      else if (form) q.forms.push(form);
      else if (/^\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)*x?$/.test(token)) q.parts.push(...token.split("x").filter(Boolean).map(canonicalNumber));
      else q.words.push(token);
    }
  }
  return q;
}

export function isEmptyQuery(q: SizeQuery): boolean {
  return !q.families.length && !q.forms.length && !q.parts.length && !q.words.length;
}

/** What one row offers to the search (written into its data-* attributes by the server). */
export interface SearchableRow {
  family: string;
  form: string;
  /** sizeParts joined by "x". */
  size: string;
  /** normalizeSearchText of the row's visible text. */
  text: string;
}

export function matchesSizeQuery(row: SearchableRow, q: SizeQuery): boolean {
  if (q.families.length && !q.families.includes(row.family)) return false;
  if (q.forms.length && !q.forms.includes(row.form)) return false;
  if (q.parts.length) {
    const parts = row.size ? row.size.split("x") : [];
    if (parts.length < q.parts.length) return false;
    for (let i = 0; i < q.parts.length; i++) {
      const last = i === q.parts.length - 1;
      if (last ? !parts[i].startsWith(q.parts[i]) : parts[i] !== q.parts[i]) return false;
    }
  }
  return q.words.every((w) => row.text.includes(w));
}
