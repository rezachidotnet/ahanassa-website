import type { Locale } from "@/config/locales";
import type { ProductVariant } from "./types";

/**
 * Typed presenter between DB_PUBLIC's polymorphic `dimensions_json`/
 * `nominal_weight_json` (opaque `Record<string, number>`, genuinely
 * different key sets per product family — verified live across REBAR/SHS/
 * SEAMLESS_PIPE/BEAMS/SHEET_PLATE/RHS, DAR-034/DAR-037) and the UI.
 *
 * The UI must never read a raw dimension/weight key directly — see
 * docs/CATALOG_PUBLIC_ROUTES.md §Variant presentation. This module is the
 * single place that knows what a key means; an unrecognized key (a future
 * product form not in the label dictionary below) degrades to a humanized
 * version of its own name rather than throwing or being silently dropped.
 */

export interface SpecificationRow {
  /** The raw DB_PUBLIC key, e.g. "diameter_mm" — stable React list key, not shown to the user. */
  key: string;
  label: string;
  value: string;
}

type LocalizedLabel = Record<Locale, string>;

/** Real, verified dimension keys only (DAR-037 live inspection of all 6 groups currently in DB_PUBLIC). */
const DIMENSION_LABELS: Record<string, LocalizedLabel> = {
  diameter_mm: { fa: "قطر", en: "Diameter", ar: "القطر" },
  outside_diameter_mm: { fa: "قطر خارجی", en: "Outside diameter", ar: "القطر الخارجي" },
  wall_thickness_mm: { fa: "ضخامت جداره", en: "Wall thickness", ar: "سماكة الجدار" },
  width_mm: { fa: "عرض", en: "Width", ar: "العرض" },
  height_mm: { fa: "ارتفاع", en: "Height", ar: "الارتفاع" },
  thickness_mm: { fa: "ضخامت", en: "Thickness", ar: "السماكة" },
  length_mm: { fa: "طول", en: "Length", ar: "الطول" },
};

/** Preferred display order for known dimension keys; anything else is appended, alphabetically, after these. */
const DIMENSION_KEY_ORDER = ["outside_diameter_mm", "diameter_mm", "width_mm", "height_mm", "thickness_mm", "wall_thickness_mm", "length_mm"];

const WEIGHT_LABELS: Record<string, LocalizedLabel> = {
  kg_m: { fa: "وزن اسمی (kg/m)", en: "Nominal weight (kg/m)", ar: "الوزن الاسمي (kg/m)" },
  kg_m2: { fa: "وزن اسمی (kg/m²)", en: "Nominal weight (kg/m²)", ar: "الوزن الاسمي (kg/m²)" },
  per_branch: { fa: "وزن اسمی هر شاخه", en: "Nominal weight per length", ar: "الوزن الاسمي لكل قطعة" },
  per_sheet: { fa: "وزن اسمی هر ورق", en: "Nominal weight per sheet", ar: "الوزن الاسمي لكل لوح" },
};

const WEIGHT_KEY_ORDER = ["kg_m", "kg_m2", "per_branch", "per_sheet"];

/**
 * Never claim actual delivered/invoice/weighbridge weight — CLAUDE.md and
 * this task's own "Nominal Weight" boundary. Every weight row rendered from
 * this module's output must be shown alongside this disclaimer.
 */
export const NOMINAL_WEIGHT_DISCLAIMER: LocalizedLabel = {
  fa: "وزن اسمی/نظری است؛ معادل وزن تحویلی یا وزن باسکول (وزن‌کشی نهایی) نیست.",
  en: "Nominal / theoretical weight — not the actual delivered weight or weighbridge settlement weight.",
  ar: "وزن اسمي/نظري وليس الوزن الفعلي المسلَّم أو وزن الميزان النهائي.",
};

function humanizeUnknownKey(key: string): string {
  return key
    .replace(/_mm$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function orderedEntries(record: Record<string, number>, preferredOrder: string[]): [string, number][] {
  const keys = Object.keys(record);
  const ordered = preferredOrder.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !preferredOrder.includes(k)).sort();
  return [...ordered, ...rest].map((k) => [k, record[k]]);
}

function formatMillimeters(value: number): string {
  return `${value} mm`;
}

function formatKilograms(value: number): string {
  return `${value} kg`;
}

/** `dimensions_json` → typed, display-safe rows. Never dumps raw JSON keys to the UI. */
export function normalizeVariantDimensions(variant: Pick<ProductVariant, "dimensions">, locale: Locale): SpecificationRow[] {
  if (!variant.dimensions) return [];
  return orderedEntries(variant.dimensions, DIMENSION_KEY_ORDER).map(([key, value]) => ({
    key,
    label: DIMENSION_LABELS[key]?.[locale] ?? humanizeUnknownKey(key),
    // Every currently-known dimension key is a *_mm value; an unrecognized
    // key degrades to a bare number rather than guessing a unit.
    value: key.endsWith("_mm") || DIMENSION_LABELS[key] ? formatMillimeters(value) : String(value),
  }));
}

/** `nominal_weight_json` → typed, display-safe rows. Always pair with `NOMINAL_WEIGHT_DISCLAIMER`. */
export function normalizeVariantNominalWeight(variant: Pick<ProductVariant, "nominalWeight">, locale: Locale): SpecificationRow[] {
  if (!variant.nominalWeight) return [];
  return orderedEntries(variant.nominalWeight, WEIGHT_KEY_ORDER).map(([key, value]) => ({
    key,
    label: WEIGHT_LABELS[key]?.[locale] ?? humanizeUnknownKey(key),
    value: formatKilograms(value),
  }));
}

export interface VariantSpecification {
  dimensions: SpecificationRow[];
  nominalWeight: SpecificationRow[];
}

/** Combined entry point — the only function UI code should call. */
export function normalizeVariantSpecifications(variant: Pick<ProductVariant, "dimensions" | "nominalWeight">, locale: Locale): VariantSpecification {
  return {
    dimensions: normalizeVariantDimensions(variant, locale),
    nominalWeight: normalizeVariantNominalWeight(variant, locale),
  };
}
