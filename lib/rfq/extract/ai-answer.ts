import { MAX_EXTRACT_LINES, MAX_RAW_TEXT, stripPrices, type ExtractedLine } from "./lines.ts";
import { parseQuantity, unitCode, type ExtractUnit } from "./units.ts";

/**
 * The strict JSON the text model must return (W13.3), and its validation —
 * the same shape as the Odoo W13.2 intake (`lib/ai_lines.py`), so a picture
 * reads the same on the website and in Odoo.
 *
 * The model is asked for this schema (JSON mode), but its answer is still
 * untrusted input: `validateAiAnswer` accepts only `{"lines": [...]}` with
 * the listed keys and types. Any structural error rejects the whole answer
 * (the form then says it could not read the file; the file stays attached);
 * it is never repaired by guessing. Every text is length-capped and
 * price-stripped; the result is plain text the form shows as text.
 */
const TEXT_KEYS = ["product", "size", "thickness", "grade", "standard", "unit"] as const;
const ITEM_KEYS = new Set<string>([...TEXT_KEYS, "quantity", "raw_text"]);
const NULLABLE_TEXT = { type: ["string", "null"] };
const MAX_FIELD = 120;

export const AI_LINES_SCHEMA = {
  type: "object",
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: { ...Object.fromEntries(TEXT_KEYS.map((k) => [k, NULLABLE_TEXT])), quantity: { type: ["number", "null"] }, raw_text: { type: "string" } },
        required: ["product", "size", "thickness", "grade", "standard", "quantity", "unit", "raw_text"],
      },
    },
  },
  required: ["lines"],
} as const;

export class AiAnswerInvalid extends Error {}

function text(item: Record<string, unknown>, key: string, max = MAX_FIELD): string | null {
  let value = item[key];
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string") throw new AiAnswerInvalid(`${key} is not text`);
  const clean = stripPrices(value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim());
  if ([...clean].length > max) throw new AiAnswerInvalid(`${key} is too long`);
  return clean || null;
}

/** Draft lines of a text-model answer (an object, or the JSON string some models return). Throws AiAnswerInvalid. */
export function validateAiAnswer(answer: unknown): ExtractedLine[] {
  if (typeof answer === "string") {
    try {
      answer = JSON.parse(answer.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      throw new AiAnswerInvalid("answer is not JSON");
    }
  }
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) throw new AiAnswerInvalid('the answer must be {"lines": [...]}');
  const keys = Object.keys(answer);
  const lines = (answer as { lines?: unknown }).lines;
  if (keys.length !== 1 || !Array.isArray(lines)) throw new AiAnswerInvalid('the answer must be {"lines": [...]}');
  if (lines.length > MAX_EXTRACT_LINES) throw new AiAnswerInvalid("too many lines");
  return lines.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AiAnswerInvalid(`line ${index + 1} is not an object`);
    const item = raw as Record<string, unknown>;
    if (Object.keys(item).some((k) => !ITEM_KEYS.has(k))) throw new AiAnswerInvalid(`line ${index + 1} has unexpected keys`);
    const rawText = text(item, "raw_text", 2000);
    if (!rawText) throw new AiAnswerInvalid(`line ${index + 1} has no raw_text`);
    const quantity = item.quantity;
    if (quantity !== null && quantity !== undefined && (typeof quantity === "boolean" || !["number", "string"].includes(typeof quantity))) {
      throw new AiAnswerInvalid(`line ${index + 1} quantity is not a number`);
    }
    const unitText = text(item, "unit");
    const line: ExtractedLine = {
      rawText: [...rawText].length > MAX_RAW_TEXT ? `${[...rawText].slice(0, MAX_RAW_TEXT - 1).join("")}…` : rawText,
      product: text(item, "product"),
      size: text(item, "size"),
      thickness: text(item, "thickness"),
      grade: text(item, "grade"),
      standard: text(item, "standard"),
      length: null,
      quantity: quantity === null || quantity === undefined ? null : parseQuantity(quantity as string | number),
      unit: unitText ? unitCode(unitText) : null,
      unitText,
    };
    if (!line.product && !line.size) line.product = line.rawText;
    return line;
  });
}

const UNITS = new Set<ExtractUnit>(["kg", "ton", "branch", "sheet", "meter", "piece", "coil", "bundle"]);
const LINE_TEXT_KEYS = ["product", "size", "thickness", "grade", "standard", "length", "unitText"] as const;

/**
 * The browser's check of the RFQ Worker's answer (POST /api/rfqs/extract):
 * the same caps again, so a broken or hostile response can never put
 * anything but short plain text into the form. Returns null when invalid.
 */
export function parseExtractedLines(value: unknown): ExtractedLine[] | null {
  if (!Array.isArray(value) || value.length > MAX_EXTRACT_LINES) return null;
  const out: ExtractedLine[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.rawText !== "string" || !r.rawText.trim() || [...r.rawText].length > MAX_RAW_TEXT) return null;
    const line: ExtractedLine = { rawText: r.rawText, product: null, size: null, thickness: null, grade: null, standard: null, length: null, quantity: null, unit: null, unitText: null };
    for (const key of LINE_TEXT_KEYS) {
      const v = r[key];
      if (v === null || v === undefined) continue;
      if (typeof v !== "string" || [...v].length > MAX_FIELD * 3) return null;
      line[key] = v;
    }
    if (r.quantity !== null && r.quantity !== undefined) {
      if (typeof r.quantity !== "number" || !Number.isFinite(r.quantity) || r.quantity <= 0) return null;
      line.quantity = r.quantity;
    }
    if (r.unit !== null && r.unit !== undefined) {
      if (typeof r.unit !== "string" || !UNITS.has(r.unit as ExtractUnit)) return null;
      line.unit = r.unit as ExtractUnit;
    }
    out.push(line);
  }
  return out;
}
