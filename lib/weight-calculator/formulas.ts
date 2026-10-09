import { STEEL_DENSITY_KG_M3 } from "./standards.ts";

/**
 * Nominal-mass formulas (W10.1). Pure functions of millimetre/metre
 * dimensions; every one returns NaN for a non-positive or geometrically
 * impossible input, never a guessed number. The citation of each is in
 * standards.ts and in the visible «مبنای محاسبه» note.
 */

/** kg/m of a section with cross-section `areaMm2` at 7850 kg/m³ (1 mm² × 1 m = 1e-6 m³). */
export function kgPerMetreFromArea(areaMm2: number): number {
  return areaMm2 > 0 ? (areaMm2 * STEEL_DENSITY_KG_M3) / 1e6 : NaN;
}

const positive = (...values: number[]) => values.every((v) => Number.isFinite(v) && v > 0);

/**
 * Reinforcing bar, ISO 6935-2 / INSO 3132: nominal mass = nominal area × 7.85 kg/dm³,
 * i.e. π/4 · d² · 0.00785 = d² / 162.2; the owner-specified rounded form d² / 162 (d in mm).
 */
export function rebarKgPerMetre(diameterMm: number): number {
  return positive(diameterMm) ? (diameterMm * diameterMm) / 162 : NaN;
}

/**
 * Plate / sheet, EN 10029 / EN 10051: mass = t × w × l × 7.85 kg/dm³.
 * With t in mm and w, l in m the units cancel to kg: (t/100 dm)(10w dm)(10l dm) × 7.85.
 */
export function plateKg(thicknessMm: number, widthM: number, lengthM: number): number {
  return positive(thicknessMm, widthM, lengthM) ? thicknessMm * widthM * lengthM * 7.85 : NaN;
}

/** Plate / sheet, kg per square metre: t × 7.85 (t in mm). */
export function plateKgPerSquareMetre(thicknessMm: number): number {
  return positive(thicknessMm) ? thicknessMm * 7.85 : NaN;
}

/**
 * EN 10219-2 Annex B corner radii for calculating cold-formed hollow-section
 * properties: external ro / internal ri = 2t / 1t (t ≤ 6 mm),
 * 2.5t / 1.5t (6 < t ≤ 10 mm), 3t / 2t (t > 10 mm).
 */
export function en10219CornerRadii(t: number): { ro: number; ri: number } {
  if (t <= 6) return { ro: 2 * t, ri: t };
  if (t <= 10) return { ro: 2.5 * t, ri: 1.5 * t };
  return { ro: 3 * t, ri: 2 * t };
}

/**
 * Square / rectangular hollow section (SHS / RHS), EN 10219-2 Annex B:
 * A = 2t(B + H − 2t) − (4 − π)(ro² − ri²); mass = A × 7850 kg/m³.
 * H, B = outside height and width, t = wall thickness (mm).
 */
export function hollowSectionKgPerMetre(heightMm: number, widthMm: number, thicknessMm: number): number {
  if (!positive(heightMm, widthMm, thicknessMm) || 2 * thicknessMm >= Math.min(heightMm, widthMm)) return NaN;
  const t = thicknessMm;
  const { ro, ri } = en10219CornerRadii(t);
  const area = 2 * t * (widthMm + heightMm - 2 * t) - (4 - Math.PI) * (ro * ro - ri * ri);
  return kgPerMetreFromArea(area);
}

/**
 * Pipe / round tube, ASME B36.10M: w = 0.0246615 (D − t) t kg/m — exactly
 * π (D − t) t × 7850 kg/m³. D = outside diameter, t = wall thickness (mm).
 */
export function pipeKgPerMetre(outsideDiameterMm: number, wallMm: number): number {
  if (!positive(outsideDiameterMm, wallMm) || 2 * wallMm >= outsideDiameterMm) return NaN;
  return kgPerMetreFromArea(Math.PI * (outsideDiameterMm - wallMm) * wallMm);
}

/**
 * Equal-leg angle, EN 10056-1 dimensions: sharp-corner area A = t(2b − t),
 * mass = A × 7850 kg/m³. The root and toe radii are left out (they are not
 * catalog dimensions), so the result is ~1 % under the standard's table mass.
 */
export function equalAngleKgPerMetre(legMm: number, thicknessMm: number): number {
  if (!positive(legMm, thicknessMm) || thicknessMm >= legMm) return NaN;
  return kgPerMetreFromArea(thicknessMm * (2 * legMm - thicknessMm));
}

/**
 * Channel (UPN / UPE), EN 10365 dimensions: A = 2·b·tf + (h − 2tf)·tw
 * + 2(1 − π/4)r², mass = A × 7850 kg/m³. h height, b flange width, tw web,
 * tf flange thickness (mean thickness for tapered UPN), r root radius
 * (0 when unknown — then the result is a few % under the table mass).
 */
export function channelKgPerMetre(heightMm: number, widthMm: number, webMm: number, flangeMm: number, rootRadiusMm = 0): number {
  if (!positive(heightMm, widthMm, webMm, flangeMm) || !(rootRadiusMm >= 0) || 2 * flangeMm >= heightMm || webMm >= widthMm) return NaN;
  const area = 2 * widthMm * flangeMm + (heightMm - 2 * flangeMm) * webMm + 2 * (1 - Math.PI / 4) * rootRadiusMm * rootRadiusMm;
  return kgPerMetreFromArea(area);
}
