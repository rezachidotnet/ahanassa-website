import { normText } from "./normalize.ts";

/**
 * Quantities and units as customers write them (W13.3). Ported from the
 * Odoo W13.2 file intake (`lib/units.py`), so both sides read a list alike:
 * «۲۰ تن», «20t», «1,250 kg», «۵۰ شاخه».
 *
 * The unit codes are the RFQ form's own (lib/rfq/uom.ts). piece/coil/bundle
 * are recognised so the customer sees what was read, but the form never
 * offers them (Launch UoM policy, lib/rfq/uom-policy.ts).
 */
export type ExtractUnit = "kg" | "ton" | "branch" | "sheet" | "meter" | "piece" | "coil" | "bundle";

// Order matters: the first pattern that matches wins («کیلوگرم» before «گرم», «تن» only as a whole word).
const UNIT_PATTERNS: [ExtractUnit, string][] = [
  ["ton", "تن|تناژ|طن|اطنان|ton|tons|tonne|tonnes|mt"],
  ["kg", "کیلوگرم|کیلو گرم|کیلو|کیلوگرام|کغ|کجم|kg|kgs|kilo|kilos|kilogram|kilograms"],
  ["branch", "شاخه|شاخ|قضیب|قضبان|فرع|branch|branches|bar|bars|length|lengths"],
  ["sheet", "ورق|برگ|صفحه|لوح|الواح|sheet|sheets|plate|plates"],
  ["meter", "متر طول|مترطول|متر|m|meter|meters|metre|metres"],
  ["piece", "عدد|قطعه|دستگاه|حبه|قطعه|pcs|pc|piece|pieces|ea|nos|no"],
  ["coil", "رول|کلاف|لفه|coil|coils"],
  ["bundle", "بسته|بندل|حزمه|bundle|bundles"],
];
const UNIT_WORD = UNIT_PATTERNS.map(([, p]) => `(?:${p})`).join("|");
const NUMBER = String.raw`\d+(?:[.,]\d+)*`;
/** A number then a unit word, not glued to a following letter («۲۰ تن», «20t», «1,250 kg»). */
const QUANTITY_UNIT = new RegExp(String.raw`(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹_.])(${NUMBER})\s*(${UNIT_WORD}|t)(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])`, "gu");
const UNIT_EXACT = UNIT_PATTERNS.map(([code, p]) => [code, new RegExp(`^(?:${p})$`, "u")] as const);
const UNIT_INSIDE = UNIT_PATTERNS.map(([code, p]) => [code, new RegExp(String.raw`(?<![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])(?:${p})(?![A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹])`, "u")] as const);

/** The unit code a unit text names («تن» → ton, «Kg» → kg, «وزن (کیلوگرم)» → kg), else null. */
export function unitCode(text: string | null | undefined): ExtractUnit | null {
  const value = normText(text).replace(/^[\s.:()[\]\-_/]+|[\s.:()[\]\-_/]+$/g, "");
  if (!value) return null;
  if (value === "t") return "ton";
  for (const [code, re] of UNIT_EXACT) if (re.test(value)) return code;
  for (const [code, re] of UNIT_INSIDE) if (re.test(value)) return code;
  return null;
}

/**
 * The first number of `text`, or null. «۱۲٫۵» → 12.5; «1,250» / «۱٬۲۵۰» → 1250
 * (a comma before exactly three digits is a thousands separator); «2,5» → 2.5;
 * a dot is always a decimal point. Zero or less is null.
 */
export function parseQuantity(text: string | number | null | undefined): number | null {
  if (typeof text === "number") return Number.isFinite(text) && text > 0 && text <= 1e12 ? text : null;
  const match = new RegExp(NUMBER).exec(normText(text));
  if (!match) return null;
  let raw = match[0];
  if (raw.includes(",")) raw = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(raw) ? raw.replace(/,/g, "") : raw.replace(",", ".");
  if ((raw.match(/\./g) ?? []).length > 1 || raw.includes(",")) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= 1e12 ? value : null;
}

/** The LAST «number unit» pair of `text` («میلگرد ۱۶ … ۲۰ تن» → 20, ton, "20 تن"), else nulls. */
export function quantityWithUnit(text: string | null | undefined): { quantity: number | null; unit: ExtractUnit | null; matched: string } {
  const found = [...normText(text).matchAll(QUANTITY_UNIT)];
  const last = found.at(-1);
  if (!last) return { quantity: null, unit: null, matched: "" };
  return { quantity: parseQuantity(last[1]), unit: unitCode(last[2]), matched: last[0] };
}

/** A quantity for a form input: plain ASCII digits, no thousands separator, at most 3 decimals («1250», «2.5»). */
export function formatQuantity(value: number | null): string {
  if (value === null) return "";
  return String(Math.round(value * 1000) / 1000);
}
