import type { PublicRfqCatalogItem } from "../catalog-selector.ts";
import { editDistance, matchKey, normText, numbersIn } from "./normalize.ts";
import type { ExtractedLine } from "./lines.ts";

/**
 * Maps an extracted line to the published catalog (W13.3) — the SAME list
 * the form's product picker uses (`/data/rfq-catalog.<locale>.json`), so a
 * match is always a variant the visitor can see and the RFQ Worker accepts.
 * Nothing is priced and nothing is invented.
 *
 * The ideas come from the Odoo W13.2 matcher and the price collector:
 *   1. the product family from the customer's words, with Persian/Arabic
 *      letter variants unified (ی/ي, ک/ك, آ/ا, ZWNJ, no spaces) and one-letter
 *      slips tolerated in longer words («مبلگرد», «ناودانى»);
 *   2. a grade/type stated in the line narrows the products (A3 → Aj400,
 *      ST37 → S235, IPE vs IPN, UPE vs UPN);
 *   3. the sizes stated must ALL exist in a variant's own size label, with a
 *      small tolerance (pipe inch/DN sizes become outside diameters).
 * One variant → `matched`; several, or no size stated → `partial` (the row
 * gets as far as it can be sure of: category, maybe product); a family the
 * catalog does not carry, or a size it does not have → `not_in_catalog`.
 */

export type MatchStatus = "matched" | "partial" | "not_in_catalog";

export interface LineMatch {
  status: MatchStatus;
  /** `matched`: the variant. */
  variant: PublicRfqCatalogItem | null;
  /** `partial`: the public category and, when only one product fits, its template. */
  categoryCode: string | null;
  templateXid: string | null;
  /** The sizes read from the line (mm), kept so the form can pick the variant once the visitor picks the product. */
  dims: number[];
  candidates: number;
  /** 0..1 — how sure the match is (not how well the file was read). */
  confidence: number;
}

interface Family {
  code: string;
  groups: string[];
  words: string[];
  /** W17.4: a family read from qualifier words, pooled by public category (its rows share SHEET_PLATE with black plate, so the group cannot tell them apart). */
  categories?: string[];
}

// Word keys are compared after matchKey (no spaces, unified letters, آ → ا).
const FAMILIES: Family[] = [
  { code: "REBAR", groups: ["REBAR"], words: ["میلگرد", "میلگردآجدار", "میلگردساده", "rebar", "rebars", "deformedbar", "reinforcingbar", "حدیدتسلیح", "تسلیح", "قضبانتسلیح"] },
  { code: "BEAMS", groups: ["BEAMS"], words: ["تیراهن", "تیرآهن", "ipe", "ipn", "inp", "beam", "beams", "جسر", "جسور", "کمره", "عارضه"] },
  { code: "CHANNEL", groups: ["CHANNEL"], words: ["ناودانی", "upn", "upe", "unp", "channel", "channels", "مجری", "قناه"] },
  { code: "ANGLE", groups: ["ANGLE"], words: ["نبشی", "angle", "angles", "زاویه", "حدیدزاویه"] },
  { code: "HOLLOW", groups: ["SHS", "RHS"], words: ["قوطی", "پروفیل", "shs", "rhs", "hollowsection", "squaretube", "rectangulartube", "مقطعمجوف", "مجوف"] },
  { code: "SHEET_PLATE", groups: ["SHEET_PLATE"], words: ["ورق", "پلیت", "plate", "plates", "sheet", "sheets", "صاج", "لوح", "الواح", "صفیحه", "صفائح"] },
  { code: "PIPE", groups: ["SEAMLESS_PIPE"], words: ["لوله", "pipe", "pipes", "tube", "ماسوره", "انبوب", "انابیب"] },
];

/** Steel the catalog does not carry, whatever the family word says. */
const NOT_CARRIED_KEY = /(?:استیل|الومینیوم|الومنیوم|مسی|برنجی|پلیاتیلن|اسیدشویی|هاش|بالپهن|کاروگیت|عرشه|ضدزنگ|ضدسایش)/u;
const NOT_CARRIED_WORD = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:stainless|inox|ss\d{3}|alumin(?:i)?um|copper|brass|pvc|hdpe|hea|heb|hem|wide[\s-]?flange|corrugated)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u;

/**
 * W17.4 — the W9.8 flat lines (Odoo ahanassa_catalog_flat_raw), read from their qualifier words before the
 * family word («ورق گالوانیزه» is galvanized, not black sheet). Order matters: pre-painted sheet is
 * galvanized too. A qualifier on any other family («لوله گالوانیزه», «پروفیل رنگی») is still steel the
 * catalog does not carry. A line of a flat category Odoo has not published finds an empty pool and stays
 * `not_in_catalog`.
 */
const FLAT_FAMILIES: { family: Family; key: RegExp; word: RegExp }[] = [
  { family: { code: "PREPAINTED_SHEET", groups: [], words: [], categories: ["PREPAINTED_SHEET"] }, key: /(?:رنگی|پیشرنگ|مطلی)/u, word: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:ppgi|pre-?painted|colou?r[\s-]?coated)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u },
  { family: { code: "GALVANIZED_SHEET", groups: [], words: [], categories: ["GALVANIZED_SHEET"] }, key: /(?:گالوانیزه|گالوانیز|مجلفن)/u, word: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:galvani[sz]ed|galv|gi|dx51d(?:\+z)?)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u },
  { family: { code: "COLD_ROLLED", groups: [], words: [], categories: ["COLD_ROLLED"] }, key: /(?:روغنی|سردنورد|نوردسرد|کلافسرد|علیالبارد)/u, word: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:cold[\s-]?rolled|crc|dc01|st\s?-?12)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u },
];
const HOT_ROLLED_COIL: Family = { code: "HOT_ROLLED_COIL", groups: [], words: [], categories: ["HOT_ROLLED_COIL"] };
const COIL_KEY = /(?:کلاف|رول|لفائف|لفه)/u;
const COIL_WORD = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:coils?|hrc)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u;
const HOT_KEY = /(?:گرم|سیاه|ساخن)/u;
const HOT_WORD = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:hot[\s-]?rolled|hrc)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u;
const CUT_SHEET_KEY = /(?:شیت|برشخورده|الواحمقطوعه)/u;
const CUT_SHEET_WORD = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:sheets?|cut[\s-]?to[\s-]?length)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u;
/** The same qualifiers on a family that is not a flat line: coated or cold-rolled goods the catalog does not carry. */
const COATED_OR_COLD_KEY = /(?:گالوانیزه|گالوانیز|رنگی|روغنی|سردنورد)/u;
const COATED_OR_COLD_WORD = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:galvani[sz]ed|galv|gi|ppgi|pre-?painted|cold[\s-]?rolled|crc)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u;

/** The flat line a sheet/coil line names, or null. Only a sheet line, or a line with no family word, can be one. */
function flatFamilyOf(everything: string, base: Family | null): Family | null {
  if (base && base.code !== "SHEET_PLATE") return null;
  const key = matchKey(everything);
  for (const f of FLAT_FAMILIES) if (f.key.test(key) || f.word.test(everything)) return f.family;
  const coil = COIL_KEY.test(key) || COIL_WORD.test(everything);
  // «ورق سیاه رول», «کلاف گرم», "HRC": a sheet line with a coil word, or a coil word with a hot-rolled word.
  if (coil && (base !== null || HOT_KEY.test(key) || HOT_WORD.test(everything))) return HOT_ROLLED_COIL;
  return null;
}
const SEAMLESS = /(?:مانیسمان|مانسمان|بدوندرز|seamless|smls|a106|sch\d|api5l)/u;

/** Grade/type words → a token of the product's template slug (stable across locales). */
const SUBTYPES: { family: string; token: string; pattern: RegExp }[] = [
  { family: "REBAR", token: "s240", pattern: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:a1|s240|a240|ساده|plain|smooth)(?![0-9٠-٩۰-۹])/u },
  { family: "REBAR", token: "aj340", pattern: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:a2|aj340|a340|aii)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])/u },
  { family: "REBAR", token: "aj400", pattern: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:a3|aj400|a400|aiii)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])/u },
  { family: "REBAR", token: "aj500", pattern: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:a4|aj500|a500|aiv)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])/u },
  { family: "BEAMS", token: "ipe", pattern: /ipe/u },
  { family: "BEAMS", token: "ipn", pattern: /ipn|inp/u },
  { family: "CHANNEL", token: "upe", pattern: /upe/u },
  { family: "CHANNEL", token: "upn", pattern: /upn|unp/u },
  { family: "SHEET_PLATE", token: "s235", pattern: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:s235(?:jr|j0|j2)?|st\s?-?37(?:-2)?)(?![0-9٠-٩۰-۹])/u },
  { family: "SHEET_PLATE", token: "s355", pattern: /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:s355(?:jr|j0|j2)?|st\s?-?52(?:-3)?)(?![0-9٠-٩۰-۹])/u },
];

/** Grade/standard/schedule tokens whose digits are not sizes («A3», «ST37», «SCH40», «A106», W17.4 «DX51D+Z», «DC01»). */
const NON_SIZE_TOKENS = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:aj?\d{1,3}|aiii|aii|aiv|st\s?-?\d{2}(?:-\d)?|s\d{3}(?:jr|j0|j2)?|sch\s?\d{2,3}|a\d{3}(?:\s?gr\.?\s?[ab])?|api\s?5l|din\s?\d+|en\s?\d+|dx\d{2}d(?:\+z)?|dc0\d|astm|grade\s?[ab]|گرید\s?[ab])(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])/gu;

/** Nominal pipe size (inch) → outside diameter, mm (ASME B36.10). */
const NPS_OD: Record<string, number> = { "0.5": 21.3, "0.75": 26.7, "1": 33.4, "1.25": 42.2, "1.5": 48.3, "2": 60.3, "2.5": 73.0, "3": 88.9, "3.5": 101.6, "4": 114.3, "5": 141.3, "6": 168.3, "8": 219.1, "10": 273.1, "12": 323.9 };
const DN_OD: Record<string, number> = { "15": 21.3, "20": 26.7, "25": 33.4, "32": 42.2, "40": 48.3, "50": 60.3, "65": 73.0, "80": 88.9, "90": 101.6, "100": 114.3, "125": 141.3, "150": 168.3, "200": 219.1, "250": 273.1, "300": 323.9 };

function familyOf(text: string): Family | null {
  const key = matchKey(text);
  let best: { family: Family; at: number } | null = null;
  for (const family of FAMILIES) {
    for (const word of family.words) {
      const at = key.indexOf(matchKey(word));
      if (at !== -1 && (!best || at < best.at)) best = { family, at };
    }
  }
  if (best) return best.family;
  // One-letter slips (OCR, handwriting) in words of five letters or more: «مبلگرد», «ناودانى».
  for (const token of normText(text).replace(/آ/g, "ا").split(/[\s\d|,:;()\-x/]+/)) {
    if ([...token].length < 5) continue;
    for (const family of FAMILIES) if (family.words.some((w) => [...w].length >= 5 && editDistance(token, matchKey(w), 1) <= 1)) return family;
  }
  return null;
}

/** "1/2" → 0.5, "1 1/4" → 1.25, "2½" → 2.5, "1.5" → 1.5. */
function inchValue(text: string): number | null {
  const t = text.replace("½", " 1/2").replace("¼", " 1/4").replace("¾", " 3/4").trim();
  const m = /^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (m) return Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]);
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Outside diameter from an inch («۲ اینچ», «1 1/4"», «2½ in») or DN («DN50») size, else null. */
function pipeOd(text: string): number | null {
  const norm = normText(text).replace(/["”″]|''/g, " inch ");
  const dn = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])dn\s?(\d{2,3})(?!\d)/u.exec(norm);
  if (dn && DN_OD[dn[1]]) return DN_OD[dn[1]];
  const inch = /((?:\d+\s+)?\d+(?:\s*\/\s*\d+|[.]\d+)?[½¼¾]?)\s*(?:اینچ|انچ|inch|inches|in|بوصه|انش)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u.exec(norm);
  if (!inch) return null;
  const value = inchValue(inch[1]);
  if (value === null) return null;
  const key = String(Math.round(value * 100) / 100);
  return NPS_OD[key] ?? null;
}

/** The sizes (mm) a line states for its family. */
export function lineDims(line: ExtractedLine, familyCode: string): number[] {
  const sizeText = [line.size, line.thickness].filter(Boolean).join(" x ");
  // No size column: the sizes are in the product words («نبشی ۵۰×۵۰ ضخامت ۵»); a thickness read apart is added if they lack it.
  const words = line.product ?? line.rawText;
  const source = line.size ? sizeText : line.thickness && !numbersIn(words).includes(numbersIn(line.thickness)[0]) ? `${words} x ${line.thickness}` : words;
  if (familyCode === "PIPE") {
    const od = pipeOd(`${sizeText} ${line.product ?? ""} ${line.rawText}`);
    if (od !== null) {
      const rest = numbersIn(normText(sizeText).replace(NON_SIZE_TOKENS, " ")).filter((n) => n < 30 && n !== od);
      // A wall thickness written next to the inch size is kept («2 اینچ ضخامت 3.9»); the inch number itself is not a wall.
      return line.thickness ? [od, ...numbersIn(line.thickness)] : rest.length && /ضخامت|wall|thk|سماکه/u.test(normText(sizeText)) ? [od, rest.at(-1)!] : [od];
    }
  }
  let nums = numbersIn(normText(source).replace(NON_SIZE_TOKENS, " "));
  nums = nums.filter((n) => n > 0);
  switch (familyCode) {
    case "REBAR": {
      const d = nums.find((n) => n >= 6 && n <= 50);
      return d === undefined ? [] : [d];
    }
    case "BEAMS":
    case "CHANNEL": {
      const n = nums[0];
      if (n === undefined) return [];
      // «تیرآهن ۱۴», «ناودانی ۱۶»: a two-digit number is the height in cm.
      return [n <= 40 ? n * 10 : n];
    }
    case "ANGLE": {
      // Legs first, thickness last, whatever order the customer (or the reading) gave: «۸×۸۰×۸۰» is 80×80×8.
      const sorted = nums.slice(0, 3).sort((a, b) => b - a);
      if (sorted.length === 2 && sorted[1] <= sorted[0] / 4) return [sorted[0], sorted[0], sorted[1]];
      return sorted;
    }
    case "HOLLOW":
      return nums.slice(0, 3).sort((a, b) => b - a);
    default:
      return nums.slice(0, 3);
  }
}

const SIZE_CACHE = new WeakMap<PublicRfqCatalogItem, number[]>();
function variantDims(item: PublicRfqCatalogItem): number[] {
  let dims = SIZE_CACHE.get(item);
  if (!dims) {
    dims = numbersIn(normText(item.variantSpecLabel).replace(/sch\s?\d+/g, " "));
    SIZE_CACHE.set(item, dims);
  }
  return dims;
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.15, 0.012 * Math.max(a, b));

/** Every stated size is one of the variant's own sizes (each used once). */
function hasAll(variant: number[], stated: number[]): boolean {
  const free = [...variant];
  for (const s of stated) {
    const i = free.findIndex((v) => close(v, s));
    if (i === -1) return false;
    free.splice(i, 1);
  }
  return true;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function matchLine(line: ExtractedLine, catalog: readonly PublicRfqCatalogItem[]): LineMatch {
  const words = [line.product, line.size, line.grade, line.standard].filter(Boolean).join(" ") || line.rawText;
  const everything = normText(`${words} ${line.rawText}`);
  const none = (confidence: number, dims: number[] = []): LineMatch => ({ status: "not_in_catalog", variant: null, categoryCode: null, templateXid: null, dims, candidates: 0, confidence });
  const base = familyOf(line.product ?? "") ?? familyOf(words) ?? familyOf(line.rawText);
  const flat = flatFamilyOf(everything, base);
  const family = flat ?? base;
  if (!family) return none(0.6);
  if (NOT_CARRIED_KEY.test(matchKey(everything)) || NOT_CARRIED_WORD.test(everything)) return none(0.9);
  if (!flat && (COATED_OR_COLD_KEY.test(matchKey(everything)) || COATED_OR_COLD_WORD.test(everything))) return none(0.9);
  if (family.code === "PIPE" && !SEAMLESS.test(matchKey(everything))) return none(0.8); // the catalog carries seamless pipe only

  let pool = family.categories
    ? catalog.filter((item) => item.publicCategoryCode !== null && family.categories!.includes(item.publicCategoryCode))
    : catalog.filter((item) => item.groupCode !== null && family.groups.includes(item.groupCode));
  if (!pool.length) return none(0.9);
  const subtypes = SUBTYPES.filter((s) => s.family === family.code && s.pattern.test(everything));
  const subtypeStated = subtypes.length === 1;
  if (subtypeStated) {
    pool = pool.filter((item) => item.templateSlug.toLowerCase().includes(subtypes[0].token));
    if (!pool.length) return none(0.85);
  }
  const dims = lineDims(line, family.code);
  if (flat) {
    // W17.4: «رول/کلاف/coil» keeps the coils (FLAT_COILS), «شیت/sheet/برش» the cut sheets — when the category has both.
    const key = matchKey(everything);
    const want = COIL_KEY.test(key) || COIL_WORD.test(everything) ? "FLAT_COILS" : CUT_SHEET_KEY.test(key) || CUT_SHEET_WORD.test(everything) ? "SHEET_PLATE" : null;
    const narrowed = want ? pool.filter((item) => item.groupCode === want) : [];
    if (narrowed.length) pool = narrowed;
  }
  if (family.code === "HOLLOW" && dims.length >= 2) {
    // «قوطی ۴۰×۴۰» is square (SHS), «قوطی ۶۰×۴۰» rectangular (RHS).
    const group = close(dims[0], dims[1]) ? "SHS" : "RHS";
    pool = pool.filter((item) => item.groupCode === group);
  }
  const templates = unique(pool.map((p) => p.templateXid));
  const partial = (candidates: PublicRfqCatalogItem[], confidence: number): LineMatch => {
    const t = unique(candidates.map((c) => c.templateXid));
    const c = unique(candidates.map((x) => x.publicCategoryCode));
    return { status: "partial", variant: null, categoryCode: c.length === 1 ? c[0] : null, templateXid: t.length === 1 ? t[0] : null, dims, candidates: candidates.length, confidence };
  };
  if (!dims.length) return partial(pool, 0.4);
  const found = pool.filter((item) => hasAll(variantDims(item), dims));
  if (!found.length) return none(0.85, dims);
  if (found.length > 1) return partial(found, 0.5);
  const variant = found[0];
  // Sure only when every size of the variant was stated and no other product was possible.
  const full = dims.length >= variantDims(variant).length || (family.code === "PIPE" && dims.length >= 1);
  const sure = full && (subtypeStated || templates.length === 1);
  return { status: "matched", variant, categoryCode: variant.publicCategoryCode, templateXid: variant.templateXid, dims, candidates: 1, confidence: sure ? 0.95 : 0.75 };
}

/** The variant of `templateXid` whose sizes are `dims` — for a `partial` row once the visitor picks the product. */
export function variantForDims(catalog: readonly PublicRfqCatalogItem[], templateXid: string, dims: readonly number[]): PublicRfqCatalogItem | null {
  if (!dims.length) return null;
  const found = catalog.filter((item) => item.templateXid === templateXid && hasAll(variantDims(item), [...dims]));
  return found.length === 1 ? found[0] : null;
}
