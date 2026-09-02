import type { Locale } from "../../config/locales.ts";
import { normalizeDigits } from "./quantity.ts";

/**
 * Customer-facing RFQ unit-of-measure options for the multi-item form.
 *
 * The backend wire contract (`RfqItemInput.quantityText`) is still a single
 * freeform string — this task does not change that (docs/CATALOG_RFQ_INTEGRATION.md
 * §7's documented gap: DB_PUBLIC has no structured per-Variant allowed-unit
 * set, so this module does not claim per-product unit authority). What this
 * module DOES do is give the customer a real, structured quantity-number +
 * unit-select UI, then compose both into one `quantityText` string that the
 * EXISTING server-side parsing already understands without any backend
 * change:
 *
 * - `lib/rfq/quantity.ts#parseLeadingQuantity` extracts the leading number.
 * - `lib/odoo/rfq-payload-mapper.ts#inferOdooUomCode` keyword-matches the
 *   unit word inside the same string.
 *
 * The 8 codes and every label below are deliberately the exact keyword
 * strings `inferOdooUomCode`'s `UOM_KEYWORDS` dictionary already matches
 * (verified against that file directly) — composing `"5000 کیلوگرم"` is
 * guaranteed to parse to quantity=5000 and infer uom="kg" server-side, with
 * zero coordination needed beyond keeping this list in sync if that
 * dictionary ever changes.
 *
 * All 8 codes remain the full set the Odoo RFQ API schema itself
 * recognizes (`lib/odoo/rfq-api-types.ts#RFQ_API_UOM_CODES`, unchanged) —
 * `coil`/`bundle`/`piece` are NOT removed from this module, since they may
 * still need to be understood for historical/internal representation. What
 * changed (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md) is that the normal Website RFQ
 * UI and server-side validation no longer OFFER or ACCEPT them from a new
 * submission — see `lib/rfq/uom-policy.ts` for the product/Custom-aware
 * Launch policy that actually governs what a given row may select.
 */

export const RFQ_UOM_CODES = ["kg", "ton", "branch", "sheet", "meter", "coil", "bundle", "piece"] as const;
export type RfqUomCode = (typeof RFQ_UOM_CODES)[number];

export const RFQ_UOM_LABELS: Record<Locale, Record<RfqUomCode, string>> = {
  fa: { kg: "کیلوگرم", ton: "تن", branch: "شاخه", sheet: "ورق", meter: "متر", coil: "کلاف", bundle: "بسته", piece: "عدد" },
  en: { kg: "kg", ton: "ton", branch: "branch", sheet: "sheet", meter: "meter", coil: "coil", bundle: "bundle", piece: "piece" },
  ar: { kg: "كجم", ton: "طن", branch: "فرع", sheet: "لوح", meter: "متر", coil: "لفة", bundle: "حزمة", piece: "قطعة" },
};

/** "kg" — the one unit every current Launch policy allows (every Catalog group and Custom items alike), so it is always a safe, non-fabricated default regardless of which row/product it's applied to. Never "piece" — piece is Launch-deferred (lib/rfq/uom-policy.ts). */
export const DEFAULT_RFQ_UOM: RfqUomCode = "kg";

/**
 * Composes a structured quantity number + unit into the single freeform
 * string the current `quantityText` wire field expects. Returns `null`
 * (never a fabricated/zero value) when `quantityValue` is not a real,
 * positive, finite number — the caller must treat that as "not entered
 * yet," matching the existing server-side "never guess a quantity" rule.
 */
export function composeQuantityText(quantityValue: string, unit: RfqUomCode, locale: Locale): string | null {
  const normalized = normalizeDigits(quantityValue).trim().replace(/,/g, "");
  if (!normalized) return null;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return `${normalized} ${RFQ_UOM_LABELS[locale][unit]}`;
}

/** Client-side numeric sanity check only — the same finite/positive rule `lib/rfq/quantity.ts#parseLeadingQuantity` already enforces server-side, never a stricter/looser rule. Accepts Persian/Arabic-Indic digits, same as the server. */
export function isValidQuantityValue(quantityValue: string): boolean {
  const normalized = normalizeDigits(quantityValue).trim().replace(/,/g, "");
  if (!normalized) return false;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric > 0;
}
