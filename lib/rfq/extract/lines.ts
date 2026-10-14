import { normText } from "./normalize.ts";
import { parseQuantity, quantityWithUnit, unitCode, type ExtractUnit } from "./units.ts";

/**
 * Rows and text lines of a customer's list → draft item lines (W13.3),
 * deterministic, no AI. Ported from the Odoo W13.2 file intake
 * (`lib/lines.py`) so the website pre-fills the form the way Odoo later
 * reads the same file.
 *
 * `rawText` is always the customer's own text of the row (the cells joined
 * with " | " in their order, or the text line), minus anything that reads as
 * a price — the form and Odoo never get a price from a customer file either
 * (`stripPrices`). Price columns are never read at all.
 */
export interface ExtractedLine {
  rawText: string;
  product: string | null;
  size: string | null;
  thickness: string | null;
  grade: string | null;
  standard: string | null;
  length: string | null;
  quantity: number | null;
  unit: ExtractUnit | null;
  unitText: string | null;
}

export const MAX_EXTRACT_LINES = 200;
export const MAX_RAW_TEXT = 300;
const HEADER_SCAN_ROWS = 20;

type Field = "row" | "product" | "size" | "thickness" | "grade" | "standard" | "length" | "quantity" | "unit" | "notes";

// Column names, compared after normText (so Arabic ي/ك and Persian ی/ک are the same).
const HEADER_WORDS: Record<Field, string[]> = {
  row: ["ردیف", "row", "#", "no", "no.", "ش", "شماره", "م", "تسلسل", "item no"],
  product: ["شرح کالا", "شرح", "نام کالا", "کالا", "محصول", "نوع کالا", "عنوان", "مشخصات", "شرح اقلام", "اقلام", "description", "item", "items", "product", "material", "goods", "البند", "الوصف", "المنتج", "الصنف", "اسم المنتج", "الماده"],
  size: ["سایز", "ابعاد", "اندازه", "نمره", "size", "dimension", "dimensions", "dim", "المقاس", "القیاس", "الابعاد"],
  thickness: ["ضخامت", "thickness", "thk", "سماکه", "السماکه", "ضخامه"],
  grade: ["گرید", "آنالیز", "جنس", "آلیاژ", "grade", "steel grade", "الدرجه", "الرتبه", "گرید / استاندارد", "grade / standard", "الدرجه / المعیار"],
  standard: ["استاندارد", "standard", "std", "المعیار", "المواصفه"],
  length: ["طول", "length", "الطول"],
  quantity: ["مقدار", "تعداد", "وزن", "تناژ", "میزان", "quantity", "qty", "amount", "weight", "الکمیه", "العدد", "الوزن"],
  unit: ["واحد", "unit", "uom", "الوحده"],
  notes: ["توضیحات", "ملاحظات", "توضیح", "notes", "note", "remarks", "remark", "comment", "comments"],
};
// Built on first use, not at module load: the RFQ Worker imports this file, and a Worker's start-up time counts.
let headerPatterns: { exact: (readonly [Field, Set<string>])[]; inside: (readonly [Field, RegExp[]])[] } | null = null;
function patterns() {
  headerPatterns ??= {
    exact: Object.entries(HEADER_WORDS).map(([f, words]) => [f as Field, new Set(words.map(normText))] as const),
    inside: Object.entries(HEADER_WORDS)
      .filter(([f]) => f !== "row")
      .map(([f, words]) => [f as Field, words.map(normText).filter((w) => w.length >= 3).map((w) => new RegExp(String.raw`(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])${w.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])`, "u"))] as const),
  };
  return headerPatterns;
}

/** A column or a phrase about money: never read as a quantity, a unit or a product. */
const PRICE_WORD = String.raw`قیمت|مبلغ|فی|بها|ریال|تومان|تومن|price|prices|cost|amount\s+due|total\s+price|unit\s+price|usd|eur|aed|irr|السعر|الاسعار|المبلغ|الثمن|درهم|دینار|دولار|\$|€`;
const PRICE_HEADER = new RegExp(String.raw`(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:${PRICE_WORD})(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])`, "u");
const TOTAL_ROW = /^(?:جمع|جمع کل|مجموع|total|sum|subtotal|الاجمالی|المجموع)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])/u;
const GRADE_TOKEN = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(st\s?\d{2}(?:-\d)?|s\d{3}(?:jr|j0|j2)?|aj?\d{3}|a[1-4]|a\d{3}(?:\s?gr\.?\s?[ab])?|aiii|aii|ck\d{2}|[35]sp)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])/u;
const STANDARD_TOKEN = /(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])((?:din|en|astm|asme|api|jis|gost|iso|bs|isiri)\s?[a-z]?\s?\d[\w./-]*)/u;
const THICKNESS = /ضخامت\s*(\d+(?:[.,]\d+)?)|(?:thk|thickness|السماکه|سماکه)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/u;
const LENGTH = /(\d+(?:[.,]\d+)?)\s*متری|طول\s*(\d+(?:[.,]\d+)?)/u;
const LETTER = /[A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u;
/** A row number glued to the product («۱ میلگرد آجدار» when the «ردیف» and «شرح کالا» cells were read as one). */
const LEADING_ROW_NUMBER = /^[\d۰-۹٠-٩]{1,3}\s*[-.)]?\s+(?=[A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/u;

/**
 * Removes money from a customer's text: a price word with the number next to
 * it («فی ۳۵۰۰۰», «قیمت: 1,200,000 ریال», «$450», «1200 USD»). What is left
 * is still the customer's wording.
 */
export function stripPrices(text: string): string {
  const num = String.raw`[\d۰-۹٠-٩][\d۰-۹٠-٩.,٫٬]*`;
  const word = `(?:${PRICE_WORD})`;
  const out = text
    .replace(new RegExp(String.raw`${word}\s*[:=]?\s*${num}(?:\s*(?:ریال|تومان|تومن|درهم|دینار|دولار|usd|eur|aed|irr))?`, "giu"), " ")
    .replace(new RegExp(String.raw`${num}\s*(?:ریال|تومان|تومن|درهم|دینار|دولار|usd|eur|aed|irr|\$|€)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])`, "giu"), " ")
    .replace(/[$€]\s*[\d۰-۹٠-٩][\d۰-۹٠-٩.,]*/g, " ");
  return out.replace(/\s*\|\s*(?=\||$)/g, "").replace(/\s+/g, " ").replace(/^[\s|,:-]+|[\s|,:-]+$/g, "").trim();
}

const clip = (s: string, max = MAX_RAW_TEXT) => ([...s].length > max ? `${[...s].slice(0, max - 1).join("")}…` : s);

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Math.round(value * 1e6) / 1e6);
  return String(value).replace(/\s+/g, " ").trim();
}

function emptyLine(rawText: string): ExtractedLine {
  return { rawText, product: null, size: null, thickness: null, grade: null, standard: null, length: null, quantity: null, unit: null, unitText: null };
}

/** The field a header cell names, or null. A price column («قیمت واحد», «مبلغ کل») is never a field. */
export function headerField(cell: string): Field | null {
  const text = normText(cell).replace(/^[\s.:()[\]\-_*]+|[\s.:()[\]\-_*]+$/g, "");
  if (!text || PRICE_HEADER.test(text)) return null;
  const { exact, inside } = patterns();
  for (const [field, words] of exact) if (words.has(text)) return field;
  for (const [field, regexes] of inside) if (regexes.some((p) => p.test(text))) return field;
  return null;
}

/** The likeliest header row among the first rows: it names ≥ 2 fields, one of them product or quantity. */
export function findHeader(rows: string[][]): { index: number; columns: Map<number, Field> } | null {
  let best: { index: number; columns: Map<number, Field> } | null = null;
  let bestCount = 0;
  rows.slice(0, HEADER_SCAN_ROWS).forEach((row, index) => {
    const columns = new Map<number, Field>();
    row.forEach((cell, column) => {
      const field = headerField(cell);
      if (field) columns.set(column, field);
    });
    const fields = new Set([...columns.values()].filter((f) => f !== "row" && f !== "notes"));
    if (fields.size >= 2 && (fields.has("product") || fields.has("quantity")) && fields.size > bestCount) {
      best = { index, columns };
      bestCount = fields.size;
    }
  });
  return best;
}

/** Columns whose header is a price: their cells never reach rawText. */
function priceColumns(header: string[]): Set<number> {
  const out = new Set<number>();
  header.forEach((cell, i) => {
    if (PRICE_HEADER.test(normText(cell))) out.add(i);
  });
  return out;
}

function fieldValue(row: string[], columns: Map<number, Field>, field: Field): string | null {
  const cells = [...columns.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([c, f]) => f === field && c < row.length && row[c])
    .map(([c]) => row[c]);
  if (!cells.length) return null;
  if (field === "product") return cells.find((c) => LETTER.test(c)) ?? null;
  if (field === "size" && cells.length > 1) return cells.join("x");
  return cells[0];
}

function headerUnit(cell: string | undefined): ExtractUnit | null {
  const match = /[([]([^)\]]+)[)\]]/.exec(cell ?? "");
  return match ? unitCode(match[1]) : null;
}

function fillFromText(line: ExtractedLine, text: string): void {
  const norm = normText(text);
  if (!line.grade) line.grade = GRADE_TOKEN.exec(norm)?.[1] ?? null;
  if (!line.standard) line.standard = STANDARD_TOKEN.exec(norm)?.[1] ?? null;
  if (!line.thickness) {
    const m = THICKNESS.exec(norm);
    line.thickness = m ? (m[1] ?? m[2]) : null;
  }
  if (!line.length) {
    const m = LENGTH.exec(norm);
    line.length = m ? (m[1] ?? m[2]) : null;
  }
}

/** Draft lines of a table (rows of cell values, merged cells already filled by the reader). */
export function rowsToLines(table: unknown[][]): ExtractedLine[] {
  const rows = table.map((row) => row.map(cellText)).filter((row) => row.some(Boolean));
  const header = findHeader(rows);
  if (!header) return textToLines(rows.map((row) => row.filter(Boolean).join(" | ")).join("\n"));
  const headerRow = rows[header.index];
  const skip = priceColumns(headerRow);
  const quantityColumn = [...header.columns.entries()].sort(([a], [b]) => a - b).find(([, f]) => f === "quantity")?.[0];
  const defaultUnit = quantityColumn !== undefined ? headerUnit(headerRow[quantityColumn]) : null;
  const lines: ExtractedLine[] = [];
  for (const row of rows.slice(header.index + 1)) {
    if (row.join("\u0001") === headerRow.join("\u0001")) continue; // a header repeated on every printed page
    const kept = row.map((cell, i) => (skip.has(i) ? "" : cell));
    // rawText leaves out the price columns and the row-number column («ردیف»).
    const shown = kept.map((cell, i) => (header.columns.get(i) === "row" ? "" : cell));
    const values = new Map<Field, string>();
    for (const field of new Set(header.columns.values())) {
      const value = fieldValue(kept, header.columns, field);
      if (value) values.set(field, value);
    }
    const raw = stripPrices(shown.filter(Boolean).join(" | "));
    if (!raw || !(values.get("product") || values.get("size") || values.get("quantity"))) continue;
    if (TOTAL_ROW.test(normText(values.get("product") ?? raw)) && !values.get("size")) continue;
    const line = emptyLine(clip(raw));
    line.product = values.get("product")?.replace(LEADING_ROW_NUMBER, "") ?? null;
    line.size = values.get("size") ?? null;
    line.thickness = values.get("thickness") ?? null;
    line.grade = values.get("grade") ?? null;
    line.standard = values.get("standard") ?? null;
    line.length = values.get("length") ?? null;
    if (!line.product) {
      // No product column (or an empty cell): the row's own words, without the other columns' numbers.
      line.product =
        kept
          .filter((cell, c) => cell && LETTER.test(cell) && !["quantity", "unit", "row", "notes"].includes(header.columns.get(c) ?? ""))
          .join(" ") || null;
    }
    const quantityText = values.get("quantity") ?? "";
    line.quantity = parseQuantity(quantityText);
    const unitText = values.get("unit") ?? "";
    let unit = unitText ? unitCode(unitText) : null;
    if (!unit && quantityText) unit = quantityWithUnit(quantityText).unit;
    if (!unit && quantityColumn !== undefined) unit = defaultUnit;
    line.unit = unit;
    line.unitText = unitText || null;
    fillFromText(line, [line.product, line.size, line.grade, line.standard].filter(Boolean).join(" "));
    lines.push(line);
    if (lines.length >= MAX_EXTRACT_LINES) break;
  }
  return lines;
}

const BULLET = /^\s*(?:[-*•▪◦·]|\(?\d{1,3}[).-]|\d{1,3}\s*[-–]\s)\s*/u;

/** Draft lines of free text: one per line with letters and a number (a greeting or a heading is skipped). */
export function textToLines(text: string): ExtractedLine[] {
  const lines: ExtractedLine[] = [];
  for (const source of (text ?? "").split(/\r?\n/)) {
    const raw = stripPrices(source.replace(/\s+/g, " ").trim());
    if (!raw || !LETTER.test(raw)) continue;
    const body = raw.replace(BULLET, "");
    const { quantity: q, unit, matched } = quantityWithUnit(body);
    const norm = normText(body);
    if (q === null && !/\d/.test(norm)) continue; // «باسلام», «لیست مورد نیاز:»
    if (TOTAL_ROW.test(norm)) continue;
    const line = emptyLine(clip(raw));
    let product = matched ? norm.replace(matched, " ") : norm;
    product = product.trim().replace(/^[\s\-:|,]+|[\s\-:|,]+$/g, "").replace(/(?:تعداد|مقدار|وزن|qty|quantity|الکمیه)\s*[:=]?\s*$/u, "");
    line.product = product.replace(/\s+/g, " ").trim() || null;
    let quantity = q;
    if (quantity === null) {
      const m = /(?:تعداد|مقدار|وزن|qty|quantity|الکمیه)\s*[:=]?\s*(\d+(?:[.,]\d+)*)/u.exec(norm);
      quantity = m ? parseQuantity(m[1]) : null;
    }
    line.quantity = quantity;
    line.unit = unit;
    line.unitText = matched && matched.includes(" ") ? matched.split(" ").at(-1)! : null;
    fillFromText(line, norm);
    lines.push(line);
    if (lines.length >= MAX_EXTRACT_LINES) break;
  }
  return lines;
}

/**
 * Draft lines of a vision model's transcription (W13.3): it writes one table row per line with " | "
 * between cells, so a table goes through the same header guessing as a spreadsheet; anything else is
 * read as free text. Deterministic — no second model call (docs/RFQ_INSTANT_EXTRACT.md).
 */
export function transcriptToLines(text: string): ExtractedLine[] {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^\|+|\|+$/g, ""))
    .filter((l) => l.trim() && !/^[-|\s:=_]+$/.test(l))
    .map((l) => l.split("|").map((c) => c.trim()));
  if (rows.filter((r) => r.length >= 2).length >= 2) {
    const lines = rowsToLines(rows);
    if (lines.length) return lines;
  }
  return textToLines(text);
}
