import type { Locale } from "../../config/locales.ts";
import { RAW_MATERIAL_TEMPLATES } from "./raw-materials-data.ts";
import type { RawMaterialSlug } from "../content/raw-materials.ts";

/**
 * W17.2 — the raw materials of the "Raw materials" catalog PDF. They are not public catalog templates yet
 * (W9.8: draft, RFQ only), so they come from a generated, public-fields-only extract of the Odoo catalog data
 * (raw-materials-data.ts; scripts/downloads/extract-raw-materials.ts). No variant specification is shown:
 * Odoo's specification classes are defaults still to be confirmed by sourcing, so every product reads
 * "specifications on request" (RAW_SPEC_ON_REQUEST); `missingRawMaterialData` lists what the catalog lacks.
 */
export interface RawMaterialTemplate {
  key: string;
  /** Odoo product line: BILLET (billet and bloom), DRI (DRI and HBI), IRON_ORE. */
  line: string;
  formCode: string;
  grade: string | null;
  /** Standard as printed (Latin), e.g. "GOST 380"; null when the template has none. */
  standard: string | null;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
}

/** Catalog chapters, in order, each the site's own raw-material page (lib/content/raw-materials.ts) it links to. */
export const RAW_MATERIAL_CHAPTERS: ReadonlyArray<{ slug: RawMaterialSlug; forms: readonly string[] }> = [
  { slug: "billet", forms: ["BILLET", "BLOOM"] },
  { slug: "dri", forms: ["SPONGE_IRON"] },
  { slug: "briquette", forms: ["HOT_BRIQUETTED_IRON"] },
  { slug: "iron-ore", forms: ["IRON_ORE_CONCENTRATE", "IRON_ORE_PELLET", "LUMP_ORE", "IRON_ORE_FINES"] },
];

export function rawMaterialChapters(templates: readonly RawMaterialTemplate[] = RAW_MATERIAL_TEMPLATES): Array<{ slug: RawMaterialSlug; templates: RawMaterialTemplate[] }> {
  return RAW_MATERIAL_CHAPTERS.map((c) => ({ slug: c.slug, templates: templates.filter((t) => c.forms.includes(t.formCode)) })).filter((c) => c.templates.length > 0);
}

/** For the PR body / build log: per raw material, the specification data the catalog does not have. */
export function missingRawMaterialData(templates: readonly RawMaterialTemplate[] = RAW_MATERIAL_TEMPLATES): Array<{ key: string; missing: string[] }> {
  return templates.map((t) => ({
    key: t.key,
    missing: [
      "confirmed specification classes (Odoo variants are defaults to be confirmed by sourcing)",
      ...(t.standard ? [] : ["standard"]),
      ...(t.grade ? [] : ["grade"]),
      "chemical composition / analysis limits",
      ...(t.formCode === "BILLET" || t.formCode === "BLOOM" ? ["dimensional tolerances"] : ["size distribution / physical properties"]),
    ],
  }));
}
