import { getAllowedUomsForCatalogGroup } from "./uom-policy.ts";
import { isLengthMmSupportedForGroup } from "./length-policy.ts";
import { isValidQuantityValue, RFQ_UOM_CODES, type RfqUomCode } from "./uom.ts";
import { isValidLengthMmValue } from "./item-row-validation.ts";

/**
 * Quantity pre-fill for a Catalog RFQ row opened from another page (W10.1:
 * the weight calculator's «استعلام برای همین مقدار»).
 *
 *   /contact?variant=<CVAR>&qty=<number>&unit=<kg|ton|branch|sheet|…>[&length=<mm>]
 *
 * It fills the EXISTING row model only (`RfqCatalogRowFields.quantityValue`,
 * `.unit`, `.lengthMm` — lib/rfq/item-row-validation.ts); the submitted wire
 * shape and the RFQ API are unchanged, and the server re-validates
 * everything as before. Each value is applied only when it passes the same
 * checks the row itself uses: the unit must be allowed for the variant's
 * group (lib/rfq/uom-policy.ts), the quantity must be a positive number, and
 * a length only for a group that offers the length input
 * (lib/rfq/length-policy.ts). Anything else is dropped silently — the row
 * then starts exactly as a plain `?variant=` preselection does.
 *
 * W9.6 («استعلام قیمت نهایی», lib/pricing/price-rfq.ts): `&factory=<name>` on
 * a fa page fills the row's existing notes with «کارخانه: <name>» — plain,
 * editable text the visitor sees and may change before sending; the RFQ
 * Worker is unchanged. Ignored on en/ar and when the value is not a short
 * plain name (letters, digits, spaces, a little punctuation, ≤ 80 chars).
 */

export const RFQ_PREFILL_PARAMS = { quantity: "qty", unit: "unit", lengthMm: "length", factory: "factory" } as const;

/** The notes line the fa factory pre-fill writes (W9.6). */
export const RFQ_FACTORY_NOTE_FA = (factory: string) => `کارخانه: ${factory}`;
const FACTORY_NAME = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} \u200c\-.,()،]{0,79}$/u;

export interface RfqRowPrefill {
  quantityValue?: string;
  unit?: RfqUomCode;
  lengthMm?: string;
  /** W9.6: the row's notes (fa factory pre-fill only). */
  notes?: string;
}

const isUomCode = (value: string): value is RfqUomCode => (RFQ_UOM_CODES as readonly string[]).includes(value);

/** Reads and validates the pre-fill for a row of `groupCode` from a URL query. */
export function parseRfqRowPrefill(params: URLSearchParams, groupCode: string | null | undefined, locale?: string): RfqRowPrefill {
  const prefill: RfqRowPrefill = {};
  const unit = params.get(RFQ_PREFILL_PARAMS.unit);
  const quantity = params.get(RFQ_PREFILL_PARAMS.quantity)?.trim();
  if (unit && isUomCode(unit) && getAllowedUomsForCatalogGroup(groupCode).includes(unit) && quantity && /^\d+(\.\d+)?$/.test(quantity) && isValidQuantityValue(quantity)) {
    prefill.unit = unit;
    prefill.quantityValue = quantity;
  }
  const length = params.get(RFQ_PREFILL_PARAMS.lengthMm)?.trim();
  if (length && isLengthMmSupportedForGroup(groupCode) && /^\d+$/.test(length) && isValidLengthMmValue(length)) prefill.lengthMm = length;
  const factory = params.get(RFQ_PREFILL_PARAMS.factory)?.trim().replace(/\s+/g, " ");
  if (locale === "fa" && factory && FACTORY_NAME.test(factory)) prefill.notes = RFQ_FACTORY_NOTE_FA(factory);
  return prefill;
}

/** The query string for a pre-filled row (without the leading "?"). Values are written as plain ASCII numbers. */
export function buildRfqRowPrefillQuery(variantXid: string, prefill: { quantity: number; unit: RfqUomCode; lengthMm?: number | null }): string {
  const params = new URLSearchParams({ variant: variantXid, [RFQ_PREFILL_PARAMS.quantity]: String(prefill.quantity), [RFQ_PREFILL_PARAMS.unit]: prefill.unit });
  if (prefill.lengthMm) params.set(RFQ_PREFILL_PARAMS.lengthMm, String(prefill.lengthMm));
  return params.toString();
}
