import type { Locale } from "../../config/locales.ts";
import { composeQuantityText, DEFAULT_RFQ_UOM, isValidQuantityValue, type RfqUomCode } from "./uom.ts";
import type { RfqItemInput } from "./types.ts";

/**
 * Moved here from lib/rfq/validation.ts so `"use client"` components can
 * depend on it without ever importing validation.ts — validation.ts pulls
 * in the server-only `lib/rfq/phone-server.ts` (libphonenumber-js), which
 * must never reach the browser bundle.
 */
export const MAX_ITEMS = 20;

/**
 * Pure, D1-free row-state model for the multi-item RFQ form
 * (docs/RFQ_MULTI_ITEM_FORM.md). Deliberately a plain data-driven array —
 * `items: RfqRow[]`, never `item1`/`item2`/... discrete fields — so the UI
 * scales to 1..MAX_ITEMS rows without per-row component wiring.
 *
 * A row is one of two mutually exclusive modes:
 * - "catalog": identity is a real DB_PUBLIC `product_variant_xid`
 *   (`variantXid`), resolved server-side again at submission time
 *   (`lib/rfq/service.ts`, unchanged) — this module never trusts its own
 *   `variantXid` as final; it is only ever a wire value.
 * - "custom": a free-text description — first-class, never a fallback for
 *   a Catalog lookup failure.
 *
 * `buildRfqItemInput` is the single place a row turns into the exact
 * existing wire shape (`RfqItemInput`, lib/rfq/types.ts) — never a parallel
 * payload shape (this task's own "do not invent a parallel POST body").
 */

export interface RfqCatalogRowFields {
  mode: "catalog";
  /** Transient UI cascade filter — not sent to the server. `null` = "no category chosen yet." */
  categoryCode: string | null;
  /** Transient UI cascade filter — not sent to the server. */
  templateXid: string | null;
  /** The only Catalog field actually sent — the real canonical identity. */
  variantXid: string | null;
  quantityValue: string;
  unit: RfqUomCode;
  notes: string;
  /**
   * Optional requested commercial length, raw string as typed (whole
   * millimetres) — empty string means "not specified." Only ever rendered
   * for a product group where `lib/rfq/length-policy.ts#isLengthMmSupportedForGroup`
   * is true (docs/POST_P3F_RFQ_LENGTH_MM_FULL_STACK_REPORT.md
   * "Product-Aware Visibility"); a "custom"/freeform row has no group at
   * all and never shows this input, so it has no counterpart field on
   * `RfqCustomRowFields`. Never product identity — see `lib/rfq/types.ts#RfqItemInput.lengthMm`.
   */
  lengthMm: string;
}

export interface RfqCustomRowFields {
  mode: "custom";
  productTitle: string;
  sizeSpec: string;
  quantityValue: string;
  unit: RfqUomCode;
  notes: string;
}

export type RfqRowFields = RfqCatalogRowFields | RfqCustomRowFields;

export interface RfqRow {
  id: string;
  fields: RfqRowFields;
}

let rowIdCounter = 0;
/** Monotonic, collision-free within one form session — only ever used as a React list key and an error-lookup key, never persisted or sent to the server. */
export function nextRfqRowId(): string {
  rowIdCounter += 1;
  return `row-${rowIdCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyCatalogRow(): RfqRow {
  return { id: nextRfqRowId(), fields: { mode: "catalog", categoryCode: null, templateXid: null, variantXid: null, quantityValue: "", unit: DEFAULT_RFQ_UOM, notes: "", lengthMm: "" } };
}

export function createEmptyCustomRow(): RfqRow {
  return { id: nextRfqRowId(), fields: { mode: "custom", productTitle: "", sizeSpec: "", quantityValue: "", unit: DEFAULT_RFQ_UOM, notes: "" } };
}

/** Builds a Catalog row already carrying a resolved identity — used to seed the first row from a `?variant=` preselection. */
export function createCatalogRowFromSelection(selection: { categoryCode: string | null; templateXid: string; variantXid: string }): RfqRow {
  return {
    id: nextRfqRowId(),
    fields: { mode: "catalog", categoryCode: selection.categoryCode, templateXid: selection.templateXid, variantXid: selection.variantXid, quantityValue: "", unit: DEFAULT_RFQ_UOM, notes: "", lengthMm: "" },
  };
}

export type RfqRowFieldKey = "product" | "quantity" | "length";

/**
 * Format check for a raw, user-typed `lengthMm` string — empty is always
 * valid (the field is optional); a non-empty value must be a positive whole
 * number, mirroring the server's own `parseLengthMm`
 * (`lib/rfq/validation.ts`) closely enough to catch an obviously-invalid
 * value before submission, without re-deriving its exact upper bound here
 * (the server remains the sole authority on `MAX_LENGTH_MM`; this is a
 * conservative pre-check only, never a stricter/contradictory rule).
 */
export function isValidLengthMmValue(value: string): boolean {
  const trimmedValue = value.trim();
  if (!trimmedValue) return true;
  if (!/^\d+$/.test(trimmedValue)) return false;
  const parsed = Number(trimmedValue);
  return Number.isFinite(parsed) && parsed > 0;
}

/**
 * Client-side, per-row pre-check — deliberately a conservative SUBSET of
 * the server's own authoritative validation (`lib/rfq/validation.ts`),
 * never a stricter or contradictory rule (this task's own "UI validation
 * must match backend policy"). Used only to decide which rows to flag/
 * scroll to before submitting; the server re-validates and re-resolves
 * everything independently regardless.
 */
export function validateRfqRow(fields: RfqRowFields): RfqRowFieldKey[] {
  const errors: RfqRowFieldKey[] = [];

  if (fields.mode === "catalog") {
    if (!fields.variantXid) errors.push("product");
    if (!isValidLengthMmValue(fields.lengthMm)) errors.push("length");
  } else {
    if (!fields.productTitle.trim()) errors.push("product");
  }

  if (!isValidQuantityValue(fields.quantityValue)) errors.push("quantity");

  return errors;
}

export function isRfqRowEmpty(fields: RfqRowFields): boolean {
  if (fields.mode === "catalog") {
    return !fields.variantXid && !fields.quantityValue.trim() && !fields.notes.trim() && !fields.lengthMm.trim();
  }
  return !fields.productTitle.trim() && !fields.sizeSpec.trim() && !fields.quantityValue.trim() && !fields.notes.trim();
}

/**
 * Builds the exact existing wire shape for one row — the sole place a row's
 * client-side fields become an `RfqItemInput`. Returns `null` when the row
 * cannot yet produce a valid item (mirrors `validateRfqRow`'s own checks);
 * the caller must never fall back to a fabricated placeholder value.
 */
export function buildRfqItemInput(fields: RfqRowFields, locale: Locale): RfqItemInput | null {
  const quantityText = composeQuantityText(fields.quantityValue, fields.unit, locale);
  if (!quantityText) return null;

  if (fields.mode === "catalog") {
    if (!fields.variantXid) return null;
    if (!isValidLengthMmValue(fields.lengthMm)) return null;
    const trimmedLengthMm = fields.lengthMm.trim();
    return {
      catalogVariantXid: fields.variantXid,
      quantityText,
      unit: fields.unit,
      description: fields.notes.trim() || undefined,
      lengthMm: trimmedLengthMm ? Number(trimmedLengthMm) : undefined,
    };
  }

  const productTitle = fields.productTitle.trim();
  if (!productTitle) return null;
  return {
    freeformTitle: productTitle,
    gradeOrStandard: fields.sizeSpec.trim() || undefined,
    quantityText,
    unit: fields.unit,
    description: fields.notes.trim() || undefined,
  };
}
