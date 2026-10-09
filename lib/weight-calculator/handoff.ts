import { localizedPath, type Locale } from "../../config/locales.ts";
import { buildRfqRowPrefillQuery } from "../rfq/rfq-prefill.ts";
import { isLengthMmSupportedForGroup } from "../rfq/length-policy.ts";
import { getAllowedUomsForCatalogGroup } from "../rfq/uom-policy.ts";
import type { RfqUomCode } from "../rfq/uom.ts";
import { roundHalfAwayFromZero } from "./format.ts";
import type { QuantityMode, WeightResult } from "./model.ts";

/**
 * «استعلام برای همین مقدار» (W10.1): the /contact link that opens the RFQ
 * form with this variant and quantity in its first row
 * (lib/rfq/rfq-prefill.ts — the existing row model, no new API field).
 *
 * Which unit travels:
 * - a piece count, when the variant's group may be ordered by the piece
 *   (REBAR → «شاخه», SHEET_PLATE → «ورق», lib/rfq/uom-policy.ts);
 * - the tonnes the visitor typed, when they typed tonnes;
 * - otherwise the total in kg, to one decimal (every group allows kg).
 * ANGLE/CHANNEL rows also carry the bar length, the only groups whose RFQ
 * row has a length input (lib/rfq/length-policy.ts).
 */
const PIECE_UNITS: readonly RfqUomCode[] = ["branch", "sheet"];

export function rfqHandoffHref(locale: Locale, input: { variantXid: string; groupCode: string | null; mode: QuantityMode; quantity: number; result: WeightResult; lengthM: number | null }): string {
  const allowed = getAllowedUomsForCatalogGroup(input.groupCode);
  const pieceUnit = PIECE_UNITS.find((u) => allowed.includes(u));
  let quantity: number;
  let unit: RfqUomCode;
  if (input.mode === "pieces" && pieceUnit) {
    quantity = input.result.piecesWhole;
    unit = pieceUnit;
  } else if (input.mode === "ton") {
    quantity = roundHalfAwayFromZero(input.quantity, 3);
    unit = "ton";
  } else {
    quantity = roundHalfAwayFromZero(input.result.totalKg, 1);
    unit = "kg";
  }
  const lengthMm = input.lengthM && isLengthMmSupportedForGroup(input.groupCode) ? Math.round(input.lengthM * 1000) : null;
  return `${localizedPath(locale, "/contact")}?${buildRfqRowPrefillQuery(input.variantXid, { quantity, unit, lengthMm })}`;
}
