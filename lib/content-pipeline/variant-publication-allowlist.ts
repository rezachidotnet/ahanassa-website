/**
 * Variants that are PUBLIC FROM THEIR FIRST PUBLISH (the editorial `is_public` switch, decided in code review
 * instead of a manual `setVariantPublicationFlag` run). A variant Odoo introduces is not public by default
 * (lib/content-pipeline/assemble.ts); an SKU listed here gets `is_public = 1` on the run that first sees it, and
 * the D1 mirror inserts that row whole (lib/content-pipeline/publication-sql.ts#mirrorStatements). From then
 * on DB_PUBLIC owns the flag as for any other row: an editor can still switch it off, and this list never
 * switches an EXISTING row on or off.
 *
 * Never "all new variants": each entry names one SKU and the owner decision behind it. An SKU Odoo does not
 * serve yet is simply absent (no error, no placeholder).
 *
 * Consequence of "first publish only": if a listed SKU reaches DB_PUBLIC before this list ships (Odoo deployed
 * first), its row is already `is_public = 0`; validateVariantAllowlist reports it, and the editorial CLI sets it.
 */
export interface AllowlistedVariant {
  sku: string;
  /** The decision that published it. */
  decision: string;
}

/**
 * W9.12 (owner decision 2026-10-20; ahanassa-odoo PR #33, `ahanassa_marketplace` 19.0.55.0.0): the 24
 * EN 10219-2 hollow-section sizes, each verified in an official EN 10219-2 manufacturer catalogue.
 */
const W912 = "W9.12 hollow sections, owner 2026-10-20 (ahanassa-odoo #33)";
const W912_SKUS = [
  // SHS (15)
  "AA-PF-SHS-S20X20X2-L6",
  "AA-PF-SHS-S25X25X2-L6",
  "AA-PF-SHS-S30X30X2-L6",
  "AA-PF-SHS-S30X30X2P5-L6",
  "AA-PF-SHS-S40X40X2-L6",
  "AA-PF-SHS-S50X50X2-L6",
  "AA-PF-SHS-S60X60X2-L6",
  "AA-PF-SHS-S60X60X2P5-L6",
  "AA-PF-SHS-S70X70X2-L6",
  "AA-PF-SHS-S70X70X2P5-L6",
  "AA-PF-SHS-S80X80X2-L6",
  "AA-PF-SHS-S90X90X3-L6",
  "AA-PF-SHS-S100X100X3-L6",
  "AA-PF-SHS-S140X140X6-L6",
  "AA-PF-SHS-S200X200X6-L6",
  // RHS (9)
  "AA-PF-RHS-S40X20X2-L6",
  "AA-PF-RHS-S40X20X2P5-L6",
  "AA-PF-RHS-S50X30X2-L6",
  "AA-PF-RHS-S50X30X2P5-L6",
  "AA-PF-RHS-S60X30X2-L6",
  "AA-PF-RHS-S60X40X2-L6",
  "AA-PF-RHS-S80X40X2-L6",
  "AA-PF-RHS-S80X40X2P5-L6",
  "AA-PF-RHS-S100X40X2-L6",
] as const;

export const PUBLIC_ON_FIRST_PUBLISH: readonly AllowlistedVariant[] = W912_SKUS.map((sku) => ({ sku, decision: W912 }));

const BY_SKU = new Map(PUBLIC_ON_FIRST_PUBLISH.map((v) => [v.sku, v]));

/** True when a variant Odoo introduces with this SKU starts public. */
export function isPublicOnFirstPublish(sku: string): boolean {
  return BY_SKU.has(sku);
}

/**
 * Warnings (never errors) for a listed SKU that the snapshot has as an ACTIVE but NOT public variant: switched
 * off by an editor, or published before this list shipped. Absent SKUs give nothing.
 */
export function validateVariantAllowlist(variants: readonly { sku: string; is_active: number; is_public: number }[]): string[] {
  return variants.filter((v) => v.is_active === 1 && v.is_public !== 1 && BY_SKU.has(v.sku)).map((v) => `${v.sku} is on the public-on-first-publish list (${BY_SKU.get(v.sku)!.decision}) but is not public in DB_PUBLIC — set it with the editorial CLI if that is not deliberate`);
}
