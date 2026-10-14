import type { PublicRfqCatalogItem } from "../catalog-selector.ts";
import { MAX_ITEMS, isRfqRowEmpty, nextRfqRowId, type RfqRow, type RfqRowFields } from "../item-row-validation.ts";
import { CUSTOM_ITEM_LAUNCH_UOMS, getAllowedUomsForCatalogGroup } from "../uom-policy.ts";
import { DEFAULT_RFQ_UOM, type RfqUomCode } from "../uom.ts";
import type { ExtractedLine } from "./lines.ts";
import { matchLine, variantForDims, type MatchStatus } from "./match.ts";
import { formatQuantity } from "./units.ts";

/**
 * Extracted lines → RFQ form rows (W13.3). Every line becomes a row — nothing
 * read from the file is dropped:
 *   - `matched`        → a catalog row with the variant selected;
 *   - `partial`        → a catalog row with the category (and product, when
 *                        only one fits) selected; the visitor picks the rest;
 *   - `not_in_catalog` → a free-text row (product + size as read).
 * The quantity is filled only with a unit the row may offer (Launch UoM
 * policy, lib/rfq/uom-policy.ts): «۱۲۰ شاخه» on a free-text row is never
 * turned into 120 kg — the quantity is left for the visitor and the row is
 * flagged. The row's `extract` keeps the customer's own text, shown under
 * the row and sent to Odoo in the item note (`composeItemNote`).
 */

export type ExtractSource = "spreadsheet" | "text" | "pdf_text" | "image";

export type ExtractReviewReason = "check_product" | "not_in_catalog" | "quantity_missing" | "unit_missing" | "unit_not_offered";

export interface RfqRowExtract {
  /** Which attached file the row came from (EnquiryForm's own key; never the file name). */
  fileKey: string;
  /** How it was read: a picture's numbers always need checking. */
  source: ExtractSource;
  rawText: string;
  status: MatchStatus;
  /** 0..1: the match's confidence × how reliable the reading is (a spreadsheet more than a photo). */
  confidence: number;
  /** «لطفاً بررسی کنید». */
  review: boolean;
  reasons: ExtractReviewReason[];
  /** Sizes read from the line: picks the variant once the visitor picks the product of a `partial` row. */
  dims: number[];
  /** The fields as filled, to tell later whether the customer changed them. */
  initial: RfqRowFields;
  /** A quantity read with a unit this row could not offer yet («۱۲۰ شاخه» before the product is picked): filled in once it can. */
  wanted: { quantityValue: string; unit: RfqUomCode } | null;
}

export type ExtractedRfqRow = RfqRow & { extract: RfqRowExtract };

/**
 * How reliable each reading path is. A row below REVIEW_BELOW is flagged. A picture is always below it:
 * the vision models measured for W13.3 misread Persian digits (the zero is a dot: ۴۰ → ۴, ۱۴ → ۱۲), so
 * every row read from a picture asks the visitor to check it (docs/RFQ_INSTANT_EXTRACT.md "Measurements").
 */
const SOURCE_FACTOR: Record<ExtractSource, number> = { spreadsheet: 1, text: 1, pdf_text: 0.95, image: 0.75 };
export const REVIEW_BELOW = 0.8;
const MAX_TITLE = 160;
const MAX_SPEC = 100;

const clip = (s: string, max: number) => ([...s].length > max ? [...s].slice(0, max).join("").trim() : s);

function quantityFor(line: ExtractedLine, allowed: readonly RfqUomCode[], reasons: ExtractReviewReason[]): { quantityValue: string; unit: RfqUomCode } {
  if (line.quantity === null) {
    reasons.push("quantity_missing");
    return { quantityValue: "", unit: line.unit && allowed.includes(line.unit as RfqUomCode) ? (line.unit as RfqUomCode) : allowed[0] ?? DEFAULT_RFQ_UOM };
  }
  if (!line.unit) {
    reasons.push("unit_missing");
    return { quantityValue: formatQuantity(line.quantity), unit: allowed[0] ?? DEFAULT_RFQ_UOM };
  }
  if (!allowed.includes(line.unit as RfqUomCode)) {
    reasons.push("unit_not_offered");
    return { quantityValue: "", unit: allowed[0] ?? DEFAULT_RFQ_UOM };
  }
  return { quantityValue: formatQuantity(line.quantity), unit: line.unit as RfqUomCode };
}

export function lineToRow(line: ExtractedLine, catalog: readonly PublicRfqCatalogItem[], source: ExtractSource, fileKey: string): ExtractedRfqRow {
  const match = matchLine(line, catalog);
  const reasons: ExtractReviewReason[] = [];
  let fields: RfqRowFields;
  if (match.status === "matched" && match.variant) {
    const allowed = getAllowedUomsForCatalogGroup(match.variant.groupCode);
    fields = { mode: "catalog", categoryCode: match.variant.publicCategoryCode, templateXid: match.variant.templateXid, variantXid: match.variant.variantXid, notes: "", lengthMm: "", ...quantityFor(line, allowed, reasons) };
  } else if (match.status === "partial" && match.categoryCode) {
    reasons.push("check_product");
    const group = match.templateXid ? (catalog.find((c) => c.templateXid === match.templateXid)?.groupCode ?? null) : null;
    const allowed = match.templateXid ? getAllowedUomsForCatalogGroup(group) : CUSTOM_ITEM_LAUNCH_UOMS;
    fields = { mode: "catalog", categoryCode: match.categoryCode, templateXid: match.templateXid, variantXid: null, notes: "", lengthMm: "", ...quantityFor(line, allowed, reasons) };
  } else {
    if (match.status === "partial") reasons.push("check_product");
    else reasons.push("not_in_catalog");
    const spec = [line.size, line.thickness && !(line.size ?? "").includes(line.thickness) ? line.thickness : null, line.grade, line.standard].filter(Boolean).join(" ");
    fields = { mode: "custom", productTitle: clip(line.product ?? line.rawText, MAX_TITLE), sizeSpec: clip(spec, MAX_SPEC), notes: "", ...quantityFor(line, CUSTOM_ITEM_LAUNCH_UOMS, reasons) };
  }
  const confidence = Math.round(match.confidence * SOURCE_FACTOR[source] * 100) / 100;
  // A free-text row is not "uncertain" for being outside the catalog; it is flagged only when something is missing.
  const review = reasons.some((r) => r !== "not_in_catalog") || source === "image" || (match.status !== "not_in_catalog" && confidence < REVIEW_BELOW);
  const wanted = reasons.includes("unit_not_offered") && line.quantity !== null && line.unit && (["kg", "ton", "branch", "sheet", "meter"] as string[]).includes(line.unit) ? { quantityValue: formatQuantity(line.quantity), unit: line.unit as RfqUomCode } : null;
  return { id: nextRfqRowId(), fields, extract: { fileKey, source, rawText: line.rawText, status: match.status, confidence, review, reasons, dims: match.dims, initial: fields, wanted } };
}

/**
 * After the visitor changes a row read from a file: once they pick the product of a `partial` row, the
 * size read from the file selects its variant, and a quantity held back for its unit («۱۲۰ شاخه») is
 * filled in if the product now offers that unit. Never overwrites anything the visitor typed or chose.
 */
export function completeExtractedRow(previous: RfqRowFields, next: RfqRowFields, extract: RfqRowExtract | undefined, catalog: readonly PublicRfqCatalogItem[]): RfqRowFields {
  if (!extract || next.mode !== "catalog" || !next.templateXid) return next;
  const productPicked = previous.mode !== "catalog" || previous.templateXid !== next.templateXid;
  if (!productPicked) return next;
  let out: RfqRowFields = next;
  if (!next.variantXid && extract.dims.length) {
    const variant = variantForDims(catalog, next.templateXid, extract.dims);
    if (variant) out = { ...out, variantXid: variant.variantXid };
  }
  if (extract.wanted && !out.quantityValue.trim()) {
    const group = catalog.find((c) => c.templateXid === next.templateXid)?.groupCode ?? null;
    if (getAllowedUomsForCatalogGroup(group).includes(extract.wanted.unit)) out = { ...out, quantityValue: extract.wanted.quantityValue, unit: extract.wanted.unit };
  }
  return out;
}

/**
 * Adds a file's rows to the form: the empty rows are replaced, the rows the
 * visitor already filled are kept first. Returns the new rows and how many
 * lines did not fit under MAX_ITEMS (they stay in the attached file).
 */
export function mergeExtractedRows(current: readonly RfqRow[], extracted: readonly ExtractedRfqRow[]): { rows: RfqRow[]; added: number; overflow: number } {
  const kept = current.filter((r) => !isRfqRowEmpty(r.fields));
  const room = Math.max(0, MAX_ITEMS - kept.length);
  const added = extracted.slice(0, room);
  const rows = [...kept, ...added];
  return { rows: rows.length ? rows : [...current], added: added.length, overflow: extracted.length - added.length };
}

/** True when the visitor changed what was read (product, size, quantity or unit — not their own notes). */
export function isEditedByCustomer(row: RfqRow & { extract?: RfqRowExtract }): boolean {
  const before = row.extract?.initial;
  if (!before) return false;
  const a = row.fields;
  if (a.mode !== before.mode || a.quantityValue !== before.quantityValue || a.unit !== before.unit) return true;
  if (a.mode === "catalog" && before.mode === "catalog") return a.variantXid !== before.variantXid || a.lengthMm !== before.lengthMm;
  if (a.mode === "custom" && before.mode === "custom") return a.productTitle !== before.productTitle || a.sizeSpec !== before.sizeSpec;
  return true;
}

/** Item description limit of rfq_submit.v1 (lib/rfq/validation.ts LIMITS.description). */
export const MAX_ITEM_DESCRIPTION = 1000;
/**
 * The provenance words for Odoo staff — always Persian, whatever the page
 * language. Contract with Odoo (`ahanassa_rfq_file_intake`
 * models/customer_lines.py; contract v1.2 "Rows pre-filled from the
 * customer's file"): the note of a row from the customer's file STARTS with
 * «از فایل:» and CONTAINS «ویرایش‌شده توسط مشتری» when the customer changed
 * the row; a hand-typed row's note never starts with «از فایل:». When the
 * note names one of the RFQ's files, Odoo compares the row only with that file.
 */
export const FROM_FILE_PREFIX = "از فایل:";
export const EDITED_MARK = "ویرایش‌شده توسط مشتری";
/** Put in front of a hand-typed note that itself starts with «از فایل:», so Odoo never takes it for a row from a file. */
export const HAND_NOTE_GUARD = "یادداشت: ";
/** What Odoo skips before looking for the prefix: spaces, ZWNJ, direction marks, BOM. */
const LEADING_MARKS = /^[\s‌‎‏‪-‮﻿]+/u;
/** The file text always keeps at least this much room next to a long note of the customer's own. */
const MIN_RAW_ROOM = 40;

/** Cut to `max` UTF-16 units (the API's own measure, validation.ts), never inside a character, «…» when cut. */
function cut(s: string, max: number): string {
  if (s.length <= max) return s;
  let out = "";
  for (const ch of s) {
    if (out.length + ch.length > max - 1) break;
    out += ch;
  }
  return `${out.trimEnd()}…`;
}

/**
 * The item note Odoo receives (the existing item `description`, sent to Odoo
 * as `notes`; no contract change). A row read from a file:
 *   «از فایل: <customer's text> — فایل «<file name>» — ویرایش‌شده توسط مشتری | <customer's own note>»
 * The file name is the one Odoo stores for the attachment (`sanitizeFilename`);
 * the edited mark only when the customer changed product, size, quantity or
 * unit; « | <own note>» only when they wrote one. At most
 * MAX_ITEM_DESCRIPTION: the file text and the customer's note are shortened,
 * never the prefix, the file name or the edited mark.
 * A hand-typed row: the customer's note as typed (see HAND_NOTE_GUARD).
 */
export function composeItemNote(notes: string, extract: RfqRowExtract | undefined, edited: boolean, fileName?: string): string {
  const own = notes.trim();
  if (!extract) {
    const typed = own.replace(LEADING_MARKS, "").startsWith(FROM_FILE_PREFIX) ? `${HAND_NOTE_GUARD}${own}` : own;
    return cut(typed, MAX_ITEM_DESCRIPTION);
  }
  const head = `${FROM_FILE_PREFIX} `;
  const tail = `${fileName ? ` — فایل «${fileName}»` : ""}${edited ? ` — ${EDITED_MARK}` : ""}`;
  const rawText = extract.rawText.replace(/\s+/g, " ").trim();
  const room = MAX_ITEM_DESCRIPTION - head.length - tail.length;
  const ownPart = own ? ` | ${cut(own, room - 3 - Math.min(rawText.length, MIN_RAW_ROOM))}` : "";
  return `${head}${cut(rawText, room - ownPart.length)}${tail}${ownPart}`;
}
