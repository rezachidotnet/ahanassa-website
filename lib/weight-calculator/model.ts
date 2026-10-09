import type { ProductVariant } from "../catalog/types.ts";
import { sortVariantsBySize } from "../catalog/specification-presenter.ts";
import { channelKgPerMetre, equalAngleKgPerMetre, hollowSectionKgPerMetre, pipeKgPerMetre, plateKg, plateKgPerSquareMetre, rebarKgPerMetre } from "./formulas.ts";
import { EN10365_IPE_KG_M, EN10365_IPN_KG_M, type StandardId } from "./standards.ts";

/**
 * Weight calculator model (W10.1) — pure, D1-free and React-free, so the
 * page (server), the calculator (client) and node --test share it.
 *
 * The page builds `CalculatorProduct[]` at build time from the same
 * published-template read the product pages use
 * (lib/catalog/editorial-repository.ts#getPublishedCatalogTemplateBySlug),
 * so every size offered here is a size the site publishes. The payload is
 * deliberately small and language-neutral apart from the template title of
 * the page's own locale: no Persian catalog name reaches an en/ar page
 * (leak scan, lib/static/leak-scan.ts).
 */

/** Shape families: the product forms present in the catalog snapshot. */
export type ShapeKind = "rebar" | "plate" | "shs" | "rhs" | "pipe" | "angle" | "channel" | "ipe" | "ipn";

/** Odoo `form_code` → shape: exactly the forms in the catalog snapshot (W10.1 scope). A template of any other form is left out of the calculator until it gets a shape, a cited basis and copy. */
export const FORM_SHAPES: Readonly<Record<string, ShapeKind>> = {
  RIBBED_REBAR: "rebar",
  PLAIN_REBAR: "rebar",
  HOT_ROLLED_PLATE: "plate",
  HOT_ROLLED_SHEET: "plate",
  SHS_FORM: "shs",
  RHS_FORM: "rhs",
  SEAMLESS_PIPE_FORM: "pipe",
  EQUAL_ANGLE: "angle",
  UPN: "channel",
  UPE: "channel",
  IPE: "ipe",
  INP: "ipn",
};

/** The standard each shape's formula or table comes from (standards.ts). */
export const SHAPE_STANDARD: Readonly<Record<ShapeKind, Exclude<StandardId, "catalog">>> = {
  rebar: "ISO6935-2",
  plate: "EN10029",
  shs: "EN10219-2",
  rhs: "EN10219-2",
  pipe: "ASMEB36.10M",
  angle: "EN10056-1",
  channel: "EN10365",
  ipe: "EN10365",
  ipn: "EN10365",
};

/** Display order of the shape families in the product select. */
const SHAPE_ORDER: readonly ShapeKind[] = ["rebar", "ipe", "ipn", "channel", "angle", "shs", "rhs", "pipe", "plate"];

/** Plates/sheets are counted per sheet; every other family per length (bar). */
export const isLinearShape = (shape: ShapeKind) => shape !== "plate";

/** Beams take their mass from a table, never from dimensions. */
export const isTableShape = (shape: ShapeKind) => shape === "ipe" || shape === "ipn";

/** Default length of one bar when the catalog gives none: 12 m, the standard commercial bar length (owner brief). */
export const DEFAULT_BAR_LENGTH_M = 12;

/** One published size. `kgPerMetre` / `kgPerSquareMetre` / `pieceKg` are already resolved (see `resolveVariantBasis`). */
export interface CalculatorVariant {
  /** Public canonical id (CVAR) — the RFQ hand-off and the product-page link use it. */
  xid: string;
  size: string;
  source: "catalog" | "table" | "formula";
  /** kg/m for bars; NaN for plates. */
  kgPerMetre: number;
  /** kg/m² for plates; NaN for bars. */
  kgPerSquareMetre: number;
  /** kg per sheet (plates only), else null. */
  pieceKg: number | null;
  /** The catalog's commercial length (mm), when it has one. */
  lengthMm: number | null;
  /** Catalog dimensions (mm), used only to prefill the custom-size fields. */
  dimensions: Record<string, number>;
}

export interface CalculatorProduct {
  templateXid: string;
  /** The published template title in the page's locale. */
  label: string;
  shape: ShapeKind;
  /** Odoo group_code — the RFQ unit policy key (lib/rfq/uom-policy.ts). */
  groupCode: string | null;
  variants: CalculatorVariant[];
}

type CatalogVariantInput = Pick<ProductVariant, "xid" | "sku" | "commercialSize" | "sectionSize" | "dimensions" | "nominalWeight" | "group" | "form">;

const num = (record: Record<string, number> | null | undefined, key: string): number | null => {
  const v = record?.[key];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
};

/** The leading number of a beam size ("IPE 180" → 180), or the catalog height. */
function beamHeight(variant: CatalogVariantInput): number | null {
  const fromDims = num(variant.dimensions, "height_mm");
  if (fromDims) return fromDims;
  const m = /(\d+)/.exec(variant.commercialSize ?? variant.sectionSize ?? "");
  return m ? Number(m[1]) : null;
}

/** kg/m from a variant's catalog dimensions with its shape's formula (NaN when a dimension is missing). */
export function formulaKgPerMetreFromDimensions(shape: ShapeKind, d: Record<string, number> | null | undefined): number {
  const g = (k: string) => num(d, k) ?? NaN;
  switch (shape) {
    case "rebar":
      return rebarKgPerMetre(g("diameter_mm"));
    case "shs":
    case "rhs":
      return hollowSectionKgPerMetre(g("height_mm"), g("width_mm"), g("thickness_mm"));
    case "pipe":
      return pipeKgPerMetre(g("outside_diameter_mm"), g("wall_thickness_mm"));
    case "angle":
      return equalAngleKgPerMetre(g("width_mm"), g("thickness_mm"));
    case "channel":
      return channelKgPerMetre(g("height_mm"), g("width_mm"), g("web_thickness_mm"), g("flange_thickness_mm"), num(d, "root_radius_mm") ?? 0);
    default:
      return NaN;
  }
}

/**
 * The weight basis of one catalog variant, in the W10.1 precedence order:
 * the catalog's own nominal weight («مقدار کاتالوگ»), then (beams only) the
 * EN 10365 table, then the shape's formula on the catalog dimensions. Null
 * when none applies — the size is then not offered, never shown with a
 * guessed weight.
 */
export function resolveVariantBasis(shape: ShapeKind | null, variant: CatalogVariantInput): Omit<CalculatorVariant, "xid" | "size" | "dimensions"> | null {
  const nw = variant.nominalWeight;
  const lengthMm = num(variant.dimensions, "length_mm");
  const none = { kgPerMetre: NaN, kgPerSquareMetre: NaN, pieceKg: null, lengthMm };

  if (shape === "plate") {
    const t = num(variant.dimensions, "thickness_mm");
    const w = num(variant.dimensions, "width_mm");
    const l = num(variant.dimensions, "length_mm");
    const perSheet = num(nw, "per_sheet");
    const perM2 = num(nw, "kg_m2");
    if (perSheet || perM2) {
      const area = w && l ? (w / 1000) * (l / 1000) : null;
      const pieceKg = perSheet ?? (perM2 && area ? perM2 * area : null);
      const kgPerSquareMetre = perM2 ?? (perSheet && area ? perSheet / area : NaN);
      return { ...none, source: "catalog", kgPerSquareMetre, pieceKg };
    }
    if (t && w && l) return { ...none, source: "formula", kgPerSquareMetre: plateKgPerSquareMetre(t), pieceKg: plateKg(t, w / 1000, l / 1000) };
    return null;
  }

  const kgM = num(nw, "kg_m") ?? (num(nw, "per_branch") && lengthMm ? num(nw, "per_branch")! / (lengthMm / 1000) : null);
  if (kgM) return { ...none, source: "catalog", kgPerMetre: kgM };
  if (shape === null) return null;
  if (isTableShape(shape)) {
    const h = beamHeight(variant);
    const table = shape === "ipe" ? EN10365_IPE_KG_M : EN10365_IPN_KG_M;
    const kg = h ? table[h] : undefined;
    return kg ? { ...none, source: "table", kgPerMetre: kg } : null;
  }
  const formula = formulaKgPerMetreFromDimensions(shape, variant.dimensions);
  return Number.isFinite(formula) ? { ...none, source: "formula", kgPerMetre: formula } : null;
}

/** Builds the calculator's product list from published templates (title in the page locale + public variants). */
export function buildCalculatorProducts(templates: { templateXid: string; label: string; variants: CatalogVariantInput[] }[]): CalculatorProduct[] {
  const products: CalculatorProduct[] = [];
  for (const template of templates) {
    if (template.variants.length === 0) continue;
    const formCode = template.variants[0].form.code ?? "";
    const shape = FORM_SHAPES[formCode] ?? null;
    const variants: CalculatorVariant[] = [];
    for (const v of sortVariantsBySize(template.variants)) {
      const basis = resolveVariantBasis(shape, v);
      if (basis) variants.push({ xid: v.xid, size: v.commercialSize ?? v.sectionSize ?? v.sku, dimensions: { ...(v.dimensions ?? {}) }, ...basis });
    }
    if (variants.length === 0 || shape === null) continue;
    products.push({ templateXid: template.templateXid, label: template.label, shape, groupCode: template.variants[0].group.code, variants });
  }
  const rank = (p: CalculatorProduct) => SHAPE_ORDER.indexOf(p.shape);
  return products.sort((a, b) => rank(a) - rank(b) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

// --- custom sizes -------------------------------------------------------------

/** Fields of the custom-size form per shape (all mm). `optional` fields may stay empty. */
export const CUSTOM_FIELDS: Readonly<Record<ShapeKind, readonly { key: string; dimensionKey: string; optional?: boolean }[]>> = {
  rebar: [{ key: "d", dimensionKey: "diameter_mm" }],
  plate: [
    { key: "t", dimensionKey: "thickness_mm" },
    { key: "w", dimensionKey: "width_mm" },
    { key: "l", dimensionKey: "length_mm" },
  ],
  shs: [
    { key: "a", dimensionKey: "width_mm" },
    { key: "t", dimensionKey: "thickness_mm" },
  ],
  rhs: [
    { key: "h", dimensionKey: "height_mm" },
    { key: "b", dimensionKey: "width_mm" },
    { key: "t", dimensionKey: "thickness_mm" },
  ],
  pipe: [
    { key: "D", dimensionKey: "outside_diameter_mm" },
    { key: "t", dimensionKey: "wall_thickness_mm" },
  ],
  angle: [
    { key: "b", dimensionKey: "width_mm" },
    { key: "t", dimensionKey: "thickness_mm" },
  ],
  channel: [
    { key: "h", dimensionKey: "height_mm" },
    { key: "b", dimensionKey: "width_mm" },
    { key: "tw", dimensionKey: "web_thickness_mm" },
    { key: "tf", dimensionKey: "flange_thickness_mm" },
    { key: "r", dimensionKey: "root_radius_mm", optional: true },
  ],
  // Beams: mass only from the EN 10365 table, so there is no custom-dimension form.
  ipe: [],
  ipn: [],
};

export const supportsCustomSize = (shape: ShapeKind) => CUSTOM_FIELDS[shape].length > 0;

/** Standard EN 10365 sizes the product does not already list from the catalog (offered as «جدول استاندارد» rows). */
export function tableOnlySizes(product: CalculatorProduct): number[] {
  if (!isTableShape(product.shape)) return [];
  const table = product.shape === "ipe" ? EN10365_IPE_KG_M : EN10365_IPN_KG_M;
  const listed = new Set(product.variants.map((v) => /(\d+)/.exec(v.size)?.[1]).filter(Boolean).map(Number));
  return Object.keys(table).map(Number).filter((h) => !listed.has(h)).sort((a, b) => a - b);
}

export const beamTableKgPerMetre = (shape: ShapeKind, height: number): number => (shape === "ipe" ? EN10365_IPE_KG_M[height] : shape === "ipn" ? EN10365_IPN_KG_M[height] : undefined) ?? NaN;

/** The basis of a custom size from typed dimensions (mm); NaN fields when invalid. */
export function customBasis(shape: ShapeKind, values: Record<string, number>): { kgPerMetre: number; kgPerSquareMetre: number; pieceKg: number | null } {
  const v = (k: string) => values[k] ?? NaN;
  switch (shape) {
    case "plate":
      return { kgPerMetre: NaN, kgPerSquareMetre: plateKgPerSquareMetre(v("t")), pieceKg: plateKg(v("t"), v("w") / 1000, v("l") / 1000) };
    case "rebar":
      return { kgPerMetre: rebarKgPerMetre(v("d")), kgPerSquareMetre: NaN, pieceKg: null };
    case "shs":
      return { kgPerMetre: hollowSectionKgPerMetre(v("a"), v("a"), v("t")), kgPerSquareMetre: NaN, pieceKg: null };
    case "rhs":
      return { kgPerMetre: hollowSectionKgPerMetre(v("h"), v("b"), v("t")), kgPerSquareMetre: NaN, pieceKg: null };
    case "pipe":
      return { kgPerMetre: pipeKgPerMetre(v("D"), v("t")), kgPerSquareMetre: NaN, pieceKg: null };
    case "angle":
      return { kgPerMetre: equalAngleKgPerMetre(v("b"), v("t")), kgPerSquareMetre: NaN, pieceKg: null };
    case "channel":
      return { kgPerMetre: channelKgPerMetre(v("h"), v("b"), v("tw"), v("tf"), Number.isFinite(v("r")) ? v("r") : 0), kgPerSquareMetre: NaN, pieceKg: null };
    default:
      return { kgPerMetre: NaN, kgPerSquareMetre: NaN, pieceKg: null };
  }
}

/** The default bar length (m) for a product: the catalog length most of its sizes share, else 12 m. */
export function defaultLengthM(product: CalculatorProduct, variant?: CalculatorVariant | null): number {
  if (variant?.lengthMm) return variant.lengthMm / 1000;
  const counts = new Map<number, number>();
  for (const v of product.variants) if (v.lengthMm) counts.set(v.lengthMm, (counts.get(v.lengthMm) ?? 0) + 1);
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  return common ? common / 1000 : DEFAULT_BAR_LENGTH_M;
}

// --- conversions --------------------------------------------------------------

export type QuantityMode = "pieces" | "kg" | "ton";

export interface WeightResult {
  /** kg/m (bars) or kg/m² (plates). */
  perUnit: number;
  perPiece: number;
  /** Exact piece count (fractional when the quantity was a weight). */
  pieces: number;
  /** Whole pieces needed to reach the quantity (rounded up). */
  piecesWhole: number;
  totalKg: number;
  totalTon: number;
}

/** Upper bounds that keep a typo from producing an absurd figure (a 100 m bar, a million tonnes). */
export const LIMITS = { lengthM: 100, pieces: 1_000_000, kg: 1_000_000_000 } as const;

/**
 * pieces ↔ kg ↔ ton for one size. Bars: per piece = kg/m × length; plates:
 * per piece = kg per sheet (length ignored). A weight quantity gives the
 * exact piece count and the whole number of pieces needed (rounded up — a
 * bar is not sold in fractions). Null for any invalid input.
 */
export function computeWeight(input: { linear: boolean; kgPerMetre: number; kgPerSquareMetre: number; pieceKg: number | null; lengthM: number; mode: QuantityMode; quantity: number }): WeightResult | null {
  const { linear, mode, quantity } = input;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  let perPiece: number;
  let perUnit: number;
  if (linear) {
    if (!(input.kgPerMetre > 0) || !(input.lengthM > 0) || input.lengthM > LIMITS.lengthM) return null;
    perUnit = input.kgPerMetre;
    perPiece = input.kgPerMetre * input.lengthM;
  } else {
    if (!(input.pieceKg && input.pieceKg > 0)) return null;
    perUnit = input.kgPerSquareMetre;
    perPiece = input.pieceKg;
  }
  let totalKg: number;
  let pieces: number;
  if (mode === "pieces") {
    if (!Number.isInteger(quantity) || quantity > LIMITS.pieces) return null;
    pieces = quantity;
    totalKg = quantity * perPiece;
  } else {
    totalKg = mode === "ton" ? quantity * 1000 : quantity;
    if (totalKg > LIMITS.kg) return null;
    pieces = totalKg / perPiece;
  }
  // 1e-9 absorbs float noise so exactly 10 bars' weight never asks for 11.
  const piecesWhole = mode === "pieces" ? quantity : Math.ceil(pieces - 1e-9);
  return { perUnit, perPiece, pieces, piecesWhole, totalKg, totalTon: totalKg / 1000 };
}
