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

/**
 * W9.13 (owner decisions 2026-10-21; ahanassa-odoo w9-13/catalog-phase2, `ahanassa_marketplace` 19.0.56.0.0):
 * groups 1–5 and 7–9 of the catalog phase 2 (group 6 is mapping only, no new SKU). Groups 7–9 sit on three new
 * templates Odoo creates in draft: their SKUs reach the site only after the owner publishes the template in Odoo
 * (their pages: lib/content-pipeline/editorial-page-allowlist.ts). Until then they are simply absent.
 */
const W913 = "W9.13 catalog phase 2, owner 2026-10-21 (ahanassa-odoo w9-13/catalog-phase2)";
const W913_SKUS = [
  // 1. equal angles, EN 10056-1:2017 (29)
  "AA-AN-EQ-S25X25X3",
  "AA-AN-EQ-S30X30X3",
  "AA-AN-EQ-S30X30X4",
  "AA-AN-EQ-S35X35X3",
  "AA-AN-EQ-S35X35X3P5",
  "AA-AN-EQ-S40X40X3",
  "AA-AN-EQ-S40X40X4",
  "AA-AN-EQ-S45X45X3",
  "AA-AN-EQ-S45X45X4",
  "AA-AN-EQ-S45X45X5",
  "AA-AN-EQ-S50X50X3",
  "AA-AN-EQ-S50X50X4",
  "AA-AN-EQ-S60X60X4",
  "AA-AN-EQ-S60X60X5",
  "AA-AN-EQ-S63X63X6",
  "AA-AN-EQ-S70X70X5",
  "AA-AN-EQ-S70X70X6",
  "AA-AN-EQ-S70X70X7",
  "AA-AN-EQ-S75X75X5",
  "AA-AN-EQ-S75X75X6",
  "AA-AN-EQ-S80X80X6",
  "AA-AN-EQ-S80X80X7",
  "AA-AN-EQ-S90X90X8",
  "AA-AN-EQ-S100X100X7",
  "AA-AN-EQ-S100X100X8",
  "AA-AN-EQ-S100X100X9",
  "AA-AN-EQ-S120X120X12",
  "AA-AN-EQ-S140X140X14",
  "AA-AN-EQ-S150X150X15",
  // 2. UPN 220–300, EN 10365:2017 (5)
  "AA-CH-UPN-S220",
  "AA-CH-UPN-S240",
  "AA-CH-UPN-S260",
  "AA-CH-UPN-S280",
  "AA-CH-UPN-S300",
  // 3. seamless pipe ASTM A106 Gr. B, ASME B36.10M, 6 m (SCH80 NPS ½–8, SCH40 NPS 10/12) (14)
  "AA-PP-SMLS-A106B-S21P3X3P73-L6",
  "AA-PP-SMLS-A106B-S26P7X3P91-L6",
  "AA-PP-SMLS-A106B-S33P4X4P55-L6",
  "AA-PP-SMLS-A106B-S42P2X4P85-L6",
  "AA-PP-SMLS-A106B-S48P3X5P08-L6",
  "AA-PP-SMLS-A106B-S60P3X5P54-L6",
  "AA-PP-SMLS-A106B-S73X7P01-L6",
  "AA-PP-SMLS-A106B-S88P9X7P62-L6",
  "AA-PP-SMLS-A106B-S114P3X8P56-L6",
  "AA-PP-SMLS-A106B-S141P3X9P53-L6",
  "AA-PP-SMLS-A106B-S168P3X10P97-L6",
  "AA-PP-SMLS-A106B-S219P1X12P7-L6",
  "AA-PP-SMLS-A106B-S273X9P27-L6",
  "AA-PP-SMLS-A106B-S323P8X10P31-L6",
  // 4. hot-rolled plate, EN 10029 (S235JR 1250×6000 and 2000×12000; S355JR 2000×12000) (19)
  "AA-SH-HR-S235JR-S8X1250X6000",
  "AA-SH-HR-S235JR-S10X1250X6000",
  "AA-SH-HR-S235JR-S12X1250X6000",
  "AA-SH-HR-S235JR-S15X1250X6000",
  "AA-SH-HR-S235JR-S20X1250X6000",
  "AA-SH-HR-S235JR-S25X1250X6000",
  "AA-SH-HR-S235JR-S30X1250X6000",
  "AA-SH-HR-S235JR-S35X1250X6000",
  "AA-SH-HR-S235JR-S40X1250X6000",
  "AA-SH-HR-S235JR-S12X2000X12000",
  "AA-SH-HR-S235JR-S15X2000X12000",
  "AA-SH-HR-S235JR-S20X2000X12000",
  "AA-SH-HR-S235JR-S25X2000X12000",
  "AA-SH-HR-S235JR-S30X2000X12000",
  "AA-SH-HR-S235JR-S35X2000X12000",
  "AA-SH-HR-S235JR-S40X2000X12000",
  "AA-SH-HR-S355JR-S12X2000X12000",
  "AA-SH-HR-S355JR-S25X2000X12000",
  "AA-SH-HR-S355JR-S40X2000X12000",
  // 5. ribbed rebar A3 (AJ400) Ø36/Ø40, 12 m (2)
  "AA-RB-AJ400-D36-L12",
  "AA-RB-AJ400-D40-L12",
  // 7. domestic channel (own template and form DOMESTIC_CHANNEL; template in draft in Odoo) (18)
  "AA-CH-DOM-S40-L6",
  "AA-CH-DOM-S50-L6",
  "AA-CH-DOM-S60-L6",
  "AA-CH-DOM-S60-L12",
  "AA-CH-DOM-S80-L6",
  "AA-CH-DOM-S80-L12",
  "AA-CH-DOM-S100-L6",
  "AA-CH-DOM-S100-L12",
  "AA-CH-DOM-S120-L6",
  "AA-CH-DOM-S120-L12",
  "AA-CH-DOM-S140-L6",
  "AA-CH-DOM-S140-L12",
  "AA-CH-DOM-S160-L6",
  "AA-CH-DOM-S160-L12",
  "AA-CH-DOM-S180-L6",
  "AA-CH-DOM-S180-L12",
  "AA-CH-DOM-S200-L12",
  "AA-CH-DOM-S220-L12",
  // 8. seamless pipe «رده 20», mill wall, non-ASME (template in draft in Odoo) (4)
  "AA-PP-SMLS-MW-S21P3X2P5-L6",
  "AA-PP-SMLS-MW-S26P7X2P5-L6",
  "AA-PP-SMLS-MW-S33P4X2P6-L6",
  "AA-PP-SMLS-MW-S48P3X2P8-L6",
  // 9. galvanized coil 0.30/0.35 mm, EN 10143 tolerances only (template in draft in Odoo) (4)
  "AA-CL-GI-S0P3X1000",
  "AA-CL-GI-S0P3X1250",
  "AA-CL-GI-S0P35X1000",
  "AA-CL-GI-S0P35X1250",
] as const;

export const PUBLIC_ON_FIRST_PUBLISH: readonly AllowlistedVariant[] = [
  ...W912_SKUS.map((sku) => ({ sku, decision: W912 })),
  ...W913_SKUS.map((sku) => ({ sku, decision: W913 })),
];

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
