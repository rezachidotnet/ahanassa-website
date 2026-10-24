import { localizedPath, type Locale } from "../../config/locales.ts";
import { isAlloyGradeSlug, type AlloyGradeSlug } from "./grades.ts";
import { isUomAllowedForCustomItem } from "../rfq/uom-policy.ts";
import { ltrParentheses } from "../content/locale-digits.ts";
import { isValidQuantityValue, RFQ_UOM_CODES, type RfqUomCode } from "../rfq/uom.ts";

/**
 * W43 — «استعلام قیمت» from an alloy/tool steel guide or the calculator's alloy mode: opens /contact with a
 * CUSTOM (free-text) RFQ row naming the grade, because the wave-1 alloy SKUs are not in the catalog yet
 * (Odoo W42; lib/content-pipeline/variant-publication-allowlist.ts). The existing row model and wire shape only:
 *
 *   /contact?alloy=<slug>[&spec=<size text>][&qty=<number>&unit=<kg|ton|…>]
 *
 * - `alloy` must be a wave-1 slug; the row's product title is then the fixed title below in the page's locale
 *   (the visitor never injects a title).
 * - `spec` fills the row's size/grade field when it is short plain text (digits, letters, × Ø . , - / ( ) and
 *   spaces, ≤ 100 characters — RFQ `gradeOrStandard` max).
 * - `qty` + `unit` only together, and only a unit a custom row may use.
 * Anything else is dropped; the server validates the submitted row as before.
 */
export const ALLOY_RFQ_PARAMS = { grade: "alloy", spec: "spec" } as const;

/** The custom row's product title per grade and locale (≤ 160 characters, RFQ `freeformTitle` max). */
const TITLES: Readonly<Record<AlloyGradeSlug, Record<Locale, string>>> = {
  ck45: { fa: "فولاد CK45 (1.1191 / C45E)", en: "CK45 steel (1.1191 / C45E)", ar: "فولاذ CK45 (1.1191 / C45E)" },
  "mo40-42crmo4": { fa: "فولاد MO40 (1.7225 / 42CrMo4)", en: "MO40 steel (1.7225 / 42CrMo4)", ar: "فولاذ MO40 (1.7225 / 42CrMo4)" },
  "vcn150-34crnimo6": { fa: "فولاد VCN150 (1.6582 / 34CrNiMo6)", en: "VCN150 steel (1.6582 / 34CrNiMo6)", ar: "فولاذ VCN150 (1.6582 / 34CrNiMo6)" },
  "semante-16mncr5": { fa: "فولاد سمانته 7131 (1.7131 / 16MnCr5)", en: "Case-hardening steel 1.7131 (16MnCr5)", ar: "فولاذ التصليد السطحي 1.7131 (16MnCr5)" },
  "1-2312": { fa: "فولاد قالب پلاستیک 2312 (1.2312 / P20+S)", en: "Plastic mould steel 1.2312 (P20+S)", ar: "فولاذ قوالب البلاستيك 1.2312 (P20+S)" },
  "1-2344-h13": { fa: "فولاد گرمکار 2344 (1.2344 / H13)", en: "Hot-work tool steel 1.2344 (H13)", ar: "فولاذ العمل الساخن 1.2344 (H13)" },
  "spk-1-2080": { fa: "فولاد SPK (1.2080 / D3)", en: "Cold-work tool steel 1.2080 (D3, SPK)", ar: "فولاذ العمل البارد 1.2080 (D3)" },
  "1-2510-amutit": { fa: "فولاد آموتیت 2510 (1.2510 / O1)", en: "Oil-hardening tool steel 1.2510 (O1)", ar: "فولاذ العدد 1.2510 (O1)" },
};

/** The titles with ltrParentheses on fa/ar, so "(1.2344 / H13)" keeps its order in the RTL form row. */
export const ALLOY_RFQ_TITLES: Readonly<Record<AlloyGradeSlug, Record<Locale, string>>> = Object.fromEntries(
  Object.entries(TITLES).map(([slug, t]) => [slug, { fa: ltrParentheses(t.fa), en: t.en, ar: ltrParentheses(t.ar) }]),
) as Record<AlloyGradeSlug, Record<Locale, string>>;

const SPEC = /^[\p{L}\p{M}\p{N} ×xX*Ø.,\-/()]{1,100}$/u;

/** The /contact link with a custom row for `slug` (and, from the calculator, its size text and quantity). */
export function alloyRfqHref(locale: Locale, slug: AlloyGradeSlug, extra: { spec?: string; quantity?: number; unit?: RfqUomCode } = {}): string {
  const params = new URLSearchParams({ [ALLOY_RFQ_PARAMS.grade]: slug });
  if (extra.spec && SPEC.test(extra.spec)) params.set(ALLOY_RFQ_PARAMS.spec, extra.spec);
  if (extra.quantity && extra.unit && isUomAllowedForCustomItem(extra.unit)) {
    params.set("qty", String(extra.quantity));
    params.set("unit", extra.unit);
  }
  return `${localizedPath(locale, "/contact")}?${params.toString()}`;
}

export interface AlloyRfqPrefill {
  slug: AlloyGradeSlug;
  productTitle: string;
  sizeSpec: string;
  quantityValue?: string;
  unit?: RfqUomCode;
}

const isUomCode = (value: string): value is RfqUomCode => (RFQ_UOM_CODES as readonly string[]).includes(value);

/** Reads and validates the alloy pre-fill from a /contact query; null without a valid `alloy` slug. */
export function parseAlloyRfqPrefill(params: URLSearchParams, locale: Locale): AlloyRfqPrefill | null {
  const slug = params.get(ALLOY_RFQ_PARAMS.grade)?.trim() ?? "";
  if (!isAlloyGradeSlug(slug)) return null;
  const spec = params.get(ALLOY_RFQ_PARAMS.spec)?.trim().replace(/\s+/g, " ") ?? "";
  const prefill: AlloyRfqPrefill = { slug, productTitle: ALLOY_RFQ_TITLES[slug][locale], sizeSpec: spec && SPEC.test(spec) ? spec : "" };
  const unit = params.get("unit");
  const quantity = params.get("qty")?.trim();
  if (unit && isUomCode(unit) && isUomAllowedForCustomItem(unit) && quantity && /^\d+(\.\d+)?$/.test(quantity) && isValidQuantityValue(quantity)) {
    prefill.unit = unit;
    prefill.quantityValue = quantity;
  }
  return prefill;
}
