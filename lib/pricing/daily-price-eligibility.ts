/**
 * W9.6 (owner, 2026-10-09): raw materials and semi-finished steel are traded per TON (iron ore, billet,
 * briquette/HBI…) and never get a daily per-kg price — not on the price page, not on a product page, not
 * in the calculator, whatever the pricing API serves. Codes are Odoo's classification taxonomy (R2), at
 * every level a variant carries (family / group / form); one match excludes the variant. Dependency-free.
 */
export const PER_TON_CLASSIFICATION_CODES: ReadonlySet<string> = new Set([
  // families
  "RAW_MATERIALS",
  "SEMI_FINISHED",
  // groups
  "IRON_ORE",
  "DIRECT_REDUCED_IRON",
  "PIG_IRON",
  "FERROUS_SCRAP",
  "LONG_SEMIS",
  "FLAT_SEMIS",
  "INGOTS",
  // forms
  "IRON_ORE_CONCENTRATE",
  "IRON_ORE_FINES",
  "IRON_ORE_PELLET",
  "LUMP_ORE",
  "HOT_BRIQUETTED_IRON",
  "SPONGE_IRON",
  "BILLET",
  "BLOOM",
  "BEAM_BLANK",
  "SLAB",
]);

export interface ClassificationCodes {
  familyCode: string | null | undefined;
  groupCode: string | null | undefined;
  formCode: string | null | undefined;
}

/** True when a variant may show a daily price (it is not a per-ton raw or semi-finished material). */
export function isDailyPriceEligible(codes: ClassificationCodes): boolean {
  return ![codes.familyCode, codes.groupCode, codes.formCode].some((c) => typeof c === "string" && PER_TON_CLASSIFICATION_CODES.has(c.trim().toUpperCase()));
}
