import type { Locale } from "@/config/locales";
import type { ClassificationRef, ProductVariant } from "./types";

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

export interface CompactVariantSpecInput {
  grade: ClassificationRef;
  commercialSize: string | null;
  sectionSize: string | null;
  sku: string;
}

/**
 * A single-line, deterministic commercial spec label for contexts that need
 * one compact string rather than the full dimension/weight table above
 * (PRICE-P3, Homepage Price Strip benchmark cards). Deliberately generic —
 * no per-family/per-group branching — built only from the same two
 * always-Odoo-sourced fields `lib/catalog/editorial-repository.ts`'s
 * `RfqCatalogSelection.variantSpecLabel` already treats as the canonical
 * compact size descriptor (`commercialSize`, falling back to `sectionSize`,
 * falling back to `sku` — verified live: `commercial_size` is populated for
 * all 237 current DB_PUBLIC variants across every product group, so the
 * fallbacks are defense-in-depth, not the common case), prefixed with the
 * grade code only when the variant actually has one (grade is null for
 * ungraded forms like SHS/RHS/BEAMS — verified live). Never reads
 * `dimensions_json` directly and never invents a unit suffix — a family's
 * `commercial_size` string is already Odoo's own authoritative, correctly
 * unit-formatted commercial descriptor (e.g. "Ø10", "IPN 100", "100×100×4",
 * "114.3×6.02 SCH40"); appending a guessed "mm" here would be wrong for the
 * SCH-suffixed pipe case. Locale-invariant by construction (no translation
 * attempted) — `grade_code`/`commercial_size` are single Odoo-sourced
 * strings, not per-locale, same known limitation `variantSpecLabel`/
 * `group_name` already document; technical tokens are therefore preserved
 * verbatim across fa/en/ar automatically, satisfying the "never invent a
 * fa/ar translation for a technical code" rule by simply never attempting one.
 */
export function formatCompactVariantSpecification(variant: CompactVariantSpecInput): string {
  const sizeLabel = variant.commercialSize ?? variant.sectionSize ?? variant.sku;
  return variant.grade.code ? `${variant.grade.code} · ${sizeLabel}` : sizeLabel;
}
