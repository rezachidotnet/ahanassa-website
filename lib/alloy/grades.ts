/**
 * W43 (owner, 2026-10-24: W39 §9 D-ALLOY-1/-6/-7 approved as recommended) — the wave-1 alloy and tool steel
 * grades: identity and density only, language-neutral. Small on purpose: the weight calculator (a client
 * component) and the RFQ form read it, so the guide copy (lib/content/alloy-steel.ts) stays out of their bundles.
 *
 * Source: the private W39 study §3.1 (standards EN ISO 683-1/-2/-3 and EN ISO 4957 and the mill/distributor
 * datasheets it cites). Density is the datasheet value in kg/dm³ (= g/cm³), used for nominal weight only:
 * alloy and tool steel is settled on weighed weight.
 */
/** The hub route; a guide is `${ALLOY_STEEL_ROUTE}/<slug>` (lib/content/alloy-steel.ts). */
export const ALLOY_STEEL_ROUTE = "/alloy-steel";

export const ALLOY_GRADE_SLUGS = ["ck45", "mo40-42crmo4", "vcn150-34crnimo6", "semante-16mncr5", "1-2312", "1-2344-h13", "spk-1-2080", "1-2510-amutit"] as const;
export type AlloyGradeSlug = (typeof ALLOY_GRADE_SLUGS)[number];

export const isAlloyGradeSlug = (value: string): value is AlloyGradeSlug => (ALLOY_GRADE_SLUGS as readonly string[]).includes(value);

/** Engineering (heat-treatable / case-hardening) steels and tool steels: the hub groups the guides by it. */
export type AlloyGradeGroup = "engineering" | "tool";

export interface AlloyGrade {
  slug: AlloyGradeSlug;
  /** DIN / Werkstoff number. */
  wnr: string;
  /** EN steel name. */
  enName: string;
  /** The EN standard the grade is defined in. */
  standard: string;
  /** AISI/SAE equivalent (approximate). */
  aisi: string;
  /** kg/dm³ (W39 §3.1). */
  density: number;
  group: AlloyGradeGroup;
}

export const ALLOY_GRADES: Readonly<Record<AlloyGradeSlug, AlloyGrade>> = {
  ck45: { slug: "ck45", wnr: "1.1191", enName: "C45E", standard: "EN ISO 683-1", aisi: "1045", density: 7.85, group: "engineering" },
  "mo40-42crmo4": { slug: "mo40-42crmo4", wnr: "1.7225", enName: "42CrMo4", standard: "EN ISO 683-2", aisi: "4140", density: 7.85, group: "engineering" },
  "vcn150-34crnimo6": { slug: "vcn150-34crnimo6", wnr: "1.6582", enName: "34CrNiMo6", standard: "EN ISO 683-2", aisi: "4340", density: 7.85, group: "engineering" },
  "semante-16mncr5": { slug: "semante-16mncr5", wnr: "1.7131", enName: "16MnCr5", standard: "EN ISO 683-3", aisi: "5115", density: 7.85, group: "engineering" },
  "1-2312": { slug: "1-2312", wnr: "1.2312", enName: "40CrMnMoS8-6", standard: "EN ISO 4957", aisi: "P20+S", density: 7.85, group: "tool" },
  "1-2344-h13": { slug: "1-2344-h13", wnr: "1.2344", enName: "X40CrMoV5-1", standard: "EN ISO 4957", aisi: "H13", density: 7.8, group: "tool" },
  "spk-1-2080": { slug: "spk-1-2080", wnr: "1.2080", enName: "X210Cr12", standard: "EN ISO 4957", aisi: "D3", density: 7.7, group: "tool" },
  "1-2510-amutit": { slug: "1-2510-amutit", wnr: "1.2510", enName: "100MnCrW4", standard: "EN ISO 4957", aisi: "O1", density: 7.85, group: "tool" },
};

/** The density every other steel on the site is computed with (lib/weight-calculator/standards.ts). */
export const DEFAULT_STEEL_DENSITY = 7.85;

/**
 * The weight calculator's alloy section (components/tools/alloy-weight-calculator.tsx): its anchor, and the
 * query parameter that preselects a grade (`/tools/weight-calculator?grade=<slug>#alloy-weight`).
 */
export const ALLOY_CALCULATOR_ANCHOR = "alloy-weight";
export const ALLOY_CALCULATOR_PARAM = "grade";
