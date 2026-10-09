/**
 * Steel weight calculator — the standards every number comes from (W10.1).
 *
 * Pure data, no imports: the formulas (formulas.ts) and the visible
 * «مبنای محاسبه» note (copy.ts) both read the citations from here, so the
 * page can never show a basis the code does not use.
 *
 * Precedence, per variant (model.ts#resolveWeightBasis):
 *   1. the catalog's own nominal weight (Odoo Product Master, `nominal_weight`)
 *      — labelled «مقدار کاتالوگ»;
 *   2. IPE / IPN beams without one: the EN 10365 mass table below — never
 *      computed from dimensions (a rolled I-section's root radii and flange
 *      taper are not in the catalog dimensions);
 *   3. every other family: the formula of its product standard at
 *      7850 kg/m³ (7.85 kg/dm³).
 *
 * The values in the two tables were transcribed from the standard's
 * mass-per-metre column; every row the catalog also carries is checked
 * against the catalog value in standards.test.ts. Verify against a licensed
 * copy of the standard before treating a table-only row as contractual.
 */

/** Steel density used by every formula here: 7850 kg/m³ = 7.85 kg/dm³ (the density EN 10029, EN 10051, EN 10219-2 Annex B, EN 10056-1 and ASME B36.10M compute their nominal masses with). */
export const STEEL_DENSITY_KG_M3 = 7850;

export type StandardId = "catalog" | "ISO6935-2" | "EN10029" | "EN10051" | "EN10219-2" | "ASMEB36.10M" | "EN10056-1" | "EN10365";

export interface StandardCitation {
  id: StandardId;
  /** Standard number and title, as printed on the standard (Latin script on every locale). */
  title: string;
}

export const STANDARDS: Readonly<Record<Exclude<StandardId, "catalog">, StandardCitation>> = {
  "ISO6935-2": { id: "ISO6935-2", title: "ISO 6935-2 / INSO 3132 — Steel for the reinforcement of concrete, ribbed bars" },
  EN10029: { id: "EN10029", title: "EN 10029 — Hot-rolled steel plates 3 mm thick or above" },
  EN10051: { id: "EN10051", title: "EN 10051 — Continuously hot-rolled strip and plate/sheet cut from wide strip" },
  "EN10219-2": { id: "EN10219-2", title: "EN 10219-2 — Cold formed welded structural hollow sections, Annex B" },
  "ASMEB36.10M": { id: "ASMEB36.10M", title: "ASME B36.10M — Welded and seamless wrought steel pipe" },
  "EN10056-1": { id: "EN10056-1", title: "EN 10056-1 — Structural steel equal and unequal leg angles" },
  EN10365: { id: "EN10365", title: "EN 10365 — Hot rolled steel channels, I and H sections; dimensions and masses" },
};

/**
 * EN 10365, IPE series: mass per metre (kg/m), keyed by nominal height h (mm).
 * IPE 80 … IPE 600 is the whole IPE range of the standard's I-section table.
 */
export const EN10365_IPE_KG_M: Readonly<Record<number, number>> = {
  80: 6.0,
  100: 8.1,
  120: 10.4,
  140: 12.9,
  160: 15.8,
  180: 18.8,
  200: 22.4,
  220: 26.2,
  240: 30.7,
  270: 36.1,
  300: 42.2,
  330: 49.1,
  360: 57.1,
  400: 66.3,
  450: 77.6,
  500: 90.7,
  550: 106,
  600: 122,
};

/**
 * EN 10365, IPN (INP, tapered-flange I) series: mass per metre (kg/m), keyed
 * by nominal height h (mm). IPN 80 … IPN 600.
 */
export const EN10365_IPN_KG_M: Readonly<Record<number, number>> = {
  80: 5.94,
  100: 8.34,
  120: 11.1,
  140: 14.3,
  160: 17.9,
  180: 21.9,
  200: 26.2,
  220: 31.1,
  240: 36.2,
  260: 41.9,
  280: 47.9,
  300: 54.2,
  320: 61.0,
  340: 68.0,
  360: 76.1,
  380: 84.0,
  400: 92.4,
  450: 115,
  500: 141,
  550: 166,
  600: 199,
};
