/**
 * W43 (W39 §3.5, D-ALLOY-6) — nominal weight of alloy and tool steel bars, plates and cut pieces at the GRADE's
 * density ρ (kg/dm³). Pure; every function returns NaN for a non-positive input, never a guessed number.
 * Dimensions in mm (plate sheet sides in m); results in kg/m, kg/m² or kg.
 *
 *   round Ø d          kg/m  = ρ · π/4 · d² / 1000
 *   square a           kg/m  = ρ · a² / 1000
 *   flat / block b × t kg/m  = ρ · b · t / 1000
 *   hexagon s (A/F)    kg/m  = ρ · (√3/2) · s² / 1000
 *   plate t            kg/m² = ρ · t
 *   block L × W × H    kg    = ρ · L · W · H / 10⁶
 *   disc Ø d × h       kg    = ρ · π/4 · d² · h / 10⁶
 */
export type AlloyForm = "round" | "square" | "flat" | "hex" | "plate" | "block" | "disc";

export const ALLOY_FORMS: readonly AlloyForm[] = ["round", "square", "flat", "hex", "plate", "block", "disc"];

/** Bars are weighed per metre and counted per length; a plate per m² and per sheet; a block or disc per piece. */
export const isBarForm = (form: AlloyForm) => form === "round" || form === "square" || form === "flat" || form === "hex";

const positive = (...values: number[]) => values.every((v) => Number.isFinite(v) && v > 0);

export function roundKgPerMetre(density: number, d: number): number {
  return positive(density, d) ? (density * Math.PI * d * d) / 4000 : NaN;
}

export function squareKgPerMetre(density: number, a: number): number {
  return positive(density, a) ? (density * a * a) / 1000 : NaN;
}

export function flatKgPerMetre(density: number, b: number, t: number): number {
  return positive(density, b, t) ? (density * b * t) / 1000 : NaN;
}

export function hexKgPerMetre(density: number, s: number): number {
  return positive(density, s) ? (density * (Math.sqrt(3) / 2) * s * s) / 1000 : NaN;
}

export function plateKgPerSquareMetre(density: number, t: number): number {
  return positive(density, t) ? density * t : NaN;
}

/** One plate sheet: t in mm, width and length in m. */
export function plateSheetKg(density: number, t: number, widthM: number, lengthM: number): number {
  return positive(density, t, widthM, lengthM) ? density * t * widthM * lengthM : NaN;
}

export function blockKg(density: number, l: number, w: number, h: number): number {
  return positive(density, l, w, h) ? (density * l * w * h) / 1e6 : NaN;
}

export function discKg(density: number, d: number, h: number): number {
  return positive(density, d, h) ? (density * Math.PI * d * d * h) / 4e6 : NaN;
}

/** The dimension inputs each form takes, in order (all mm, except a plate's sheet sides in m). */
export const ALLOY_FORM_FIELDS: Readonly<Record<AlloyForm, readonly string[]>> = {
  round: ["d"],
  square: ["a"],
  flat: ["b", "t"],
  hex: ["s"],
  plate: ["t", "w", "l"],
  block: ["l", "w", "h"],
  disc: ["d", "h"],
};

export interface AlloyWeight {
  /** kg/m for a bar, kg/m² for a plate, NaN for a block or disc. */
  perUnit: number;
  /** kg of one piece: a bar of `lengthM`, one sheet, one block or disc. */
  pieceKg: number;
}

/** The weight of one piece of `form` at `density`; `dims` keyed as ALLOY_FORM_FIELDS, `lengthM` for bars. */
export function alloyWeight(form: AlloyForm, density: number, dims: Readonly<Record<string, number>>, lengthM: number): AlloyWeight {
  switch (form) {
    case "round":
    case "square":
    case "flat":
    case "hex": {
      const perUnit = form === "round" ? roundKgPerMetre(density, dims.d) : form === "square" ? squareKgPerMetre(density, dims.a) : form === "flat" ? flatKgPerMetre(density, dims.b, dims.t) : hexKgPerMetre(density, dims.s);
      return { perUnit, pieceKg: positive(lengthM) ? perUnit * lengthM : NaN };
    }
    case "plate":
      return { perUnit: plateKgPerSquareMetre(density, dims.t), pieceKg: plateSheetKg(density, dims.t, dims.w, dims.l) };
    case "block":
      return { perUnit: NaN, pieceKg: blockKg(density, dims.l, dims.w, dims.h) };
    case "disc":
      return { perUnit: NaN, pieceKg: discKg(density, dims.d, dims.h) };
  }
}
