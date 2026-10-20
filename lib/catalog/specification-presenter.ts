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
  // W20.5: the full section geometry Odoo serves since ahanassa_marketplace 19.0.54 (EN 10365 / 10056-1 / 10219-2).
  web_thickness_mm: { fa: "ضخامت جان", en: "Web thickness", ar: "سماكة الجذع" },
  flange_thickness_mm: { fa: "ضخامت بال", en: "Flange thickness", ar: "سماكة الشفة" },
  root_radius_mm: { fa: "شعاع ریشه", en: "Root radius", ar: "نصف قطر الجذر" },
  toe_radius_mm: { fa: "شعاع لبه", en: "Toe radius", ar: "نصف قطر الحافة" },
  outer_radius_mm: { fa: "شعاع خارجی گوشه", en: "Outer corner radius", ar: "نصف القطر الخارجي للزاوية" },
  inner_radius_mm: { fa: "شعاع داخلی گوشه", en: "Inner corner radius", ar: "نصف القطر الداخلي للزاوية" },
  flange_slope_pct: { fa: "شیب بال", en: "Flange slope", ar: "ميل الشفة" },
};

/** Preferred display order for known dimension keys; anything else is appended, alphabetically, after these. */
const DIMENSION_KEY_ORDER = [
  "outside_diameter_mm",
  "diameter_mm",
  "width_mm",
  "height_mm",
  "thickness_mm",
  "wall_thickness_mm",
  "web_thickness_mm",
  "flange_thickness_mm",
  "root_radius_mm",
  "toe_radius_mm",
  "outer_radius_mm",
  "inner_radius_mm",
  "flange_slope_pct",
  "length_mm",
];

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
    // Every known dimension key is a *_mm value except the flange slope (*_pct, W20.5); an unrecognized
    // key degrades to a bare number rather than guessing a unit.
    value: key.endsWith("_pct") ? `${value} %` : key.endsWith("_mm") || DIMENSION_LABELS[key] ? formatMillimeters(value) : String(value),
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

/** Splits a commercial size into text and number runs: "IPE 80" -> ["ipe", 80]; "114.3×6.02 SCH40" -> [114.3, "×", 6.02, "sch", 40]. */
function sizeSortKey(size: string): (string | number)[] {
  const parts: (string | number)[] = [];
  for (const match of size.toLowerCase().matchAll(/(\d+(?:\.\d+)?)|([^\d\s.]+)/g)) {
    parts.push(match[1] !== undefined ? Number(match[1]) : match[2]);
  }
  return parts;
}

/**
 * Natural order for commercial sizes (W10.0 P0-1): numbers compare as
 * numbers, so "IPE 80" < "IPE 100" < "IPE 600" and "Ø8" < "Ø10" — a plain
 * string sort (D1's `ORDER BY commercial_size`) put "IPE 80" after
 * "IPE 600". Text runs compare as text; a number sorts before text at the
 * same position. Ties fall back to the SKU so the order is total and stable.
 */
export function compareCommercialSize(a: string, b: string): number {
  const ka = sizeSortKey(a);
  const kb = sizeSortKey(b);
  for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
    const x = ka[i];
    const y = kb[i];
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    if (typeof x === "number") return -1;
    if (typeof y === "number") return 1;
    return x < y ? -1 : 1;
  }
  return ka.length - kb.length;
}

/** The display order of a template's variants: by commercial size (natural), then SKU. Returns a new array. */
export function sortVariantsBySize<T extends Pick<ProductVariant, "commercialSize" | "sectionSize" | "sku">>(variants: readonly T[]): T[] {
  const label = (v: T) => v.commercialSize ?? v.sectionSize ?? v.sku;
  return [...variants].sort((a, b) => compareCommercialSize(label(a), label(b)) || (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0));
}

/** W17.2 (download center PDFs): a dimension key's column label with its unit, e.g. "Width (mm)". */
export function dimensionColumnLabel(key: string, locale: Locale): string {
  return `${DIMENSION_LABELS[key]?.[locale] ?? humanizeUnknownKey(key)}${key.endsWith("_mm") ? " (mm)" : key.endsWith("_pct") ? " (%)" : ""}`;
}

/** W17.2: a nominal-weight key's column label with its unit, e.g. "Nominal weight (kg/m)". */
export function weightColumnLabel(key: string, locale: Locale): string {
  const label = WEIGHT_LABELS[key]?.[locale] ?? humanizeUnknownKey(key);
  return label.includes("(") ? label : `${label} (kg)`;
}

/** W17.2: the keys of several variants' dimension/weight records, in display order. */
export function orderedSpecKeys(records: ReadonlyArray<Record<string, number> | null>, kind: "dimensions" | "weight"): string[] {
  const merged: Record<string, number> = {};
  for (const r of records) Object.assign(merged, r ?? {});
  return orderedEntries(merged, kind === "dimensions" ? DIMENSION_KEY_ORDER : WEIGHT_KEY_ORDER).map(([k]) => k);
}
