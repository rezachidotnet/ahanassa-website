import type { Locale } from "@/config/locales";
import { homepageCopy } from "./homepage.ts";

/**
 * Industries / Use Cases — publication gate for the frozen V1.0 component
 * (docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md).
 *
 * This module owns ONE decision: may the section be published at all? The
 * localized copy lives in `homepageCopy[locale].industries`; the component
 * (components/home/industries.tsx) owns markup and layout. Splitting the gate
 * out keeps it pure and directly testable — it imports no React, no JSX and
 * nothing from `cloudflare:workers`, so the invariants test can call it.
 *
 * §10 makes publication conditional on FOUR things simultaneously:
 *
 *   1. the approved scope — the exact three frozen sectors, in order;
 *   2. complete accurate copy in the active locale;
 *   3. REVIEWED IMAGERY;
 *   4. a server-side content enable state through existing conventions.
 *
 * and is explicit about the failure mode: "Without eligible content omit the
 * entire section cleanly. Do not display incomplete one-/two-item subsets in
 * V1.0". §8 adds the hard rule that closes the door on shipping early:
 *
 *   > "Do not ship the component with missing initial image assets; the
 *   >  fallback covers runtime failure."
 *
 * The image fallback in §8 is for a request that fails AT RUNTIME. It is NOT a
 * licence to publish with no assets selected. Those are different states and
 * this module keeps them apart.
 *
 * CURRENT STATE — 2026-09-09: NOT ELIGIBLE, blocked on requirement 3 only.
 *
 * Requirements 1 and 2 are satisfied: all three sectors are present, in the
 * frozen order, with complete FA/EN/AR copy pinned character-for-character
 * against the freeze document by
 * `lib/content/industries-frozen-spec-invariants.test.ts`.
 *
 * Requirement 3 is not. A full inventory of `public/images/` and of every
 * image in the operator's `~/Downloads` import area was carried out (see
 * docs/industries/INDUSTRIES_P1_V1_0_IMPLEMENTATION_REPORT.md, IMAGE
 * INVENTORY) and produced NO asset that depicts any of the three sectors:
 *
 *   - the eight existing repo photographs are steel stockholding, port and
 *     yard logistics, QC inspection and a steel mill exterior — Ahan Asa's own
 *     operational context, not a construction site, a petrochemical/oil/gas
 *     facility or a fabrication workshop. Mapping `ops/mill-exterior.png` onto
 *     "Petrochemical, oil and gas" would misdescribe a STEEL plant as a
 *     PETROCHEMICAL one, which is exactly the misleading-media case
 *     01-sources/MEDIA_GUIDELINES.md §4.4 forbids;
 *   - the product photographs are packshots, which §8 excludes outright ("Do
 *     not ... use product-packshot imagery in all three slots");
 *   - the Hero images are excluded by §8 by name;
 *   - none of the existing assets carries any recorded provenance, and
 *     MEDIA_GUIDELINES.md is unambiguous that "Unknown provenance defaults to
 *     `restricted`" and that `restricted` media "Must not be published".
 *
 * So the honest state is "component complete, assets outstanding". Everything
 * below and in the component is written and tested; the section renders
 * nothing until three reviewed, provenanced assets are added to
 * `INDUSTRY_SECTOR_IMAGES`. Fabricating provenance, hotlinking, substituting a
 * near-miss photograph or shipping a gradient placeholder were all rejected.
 *
 * ENABLE STATE — requirement 4 — is deliberately content-derived rather than a
 * new environment variable. `INDUSTRY_SECTOR_IMAGES` below IS the server-side
 * enable state: it is read on the server, it is the single switch, and filling
 * it in is the deliberate publication act §10 asks for. This follows the
 * Product Showcase convention (content/data-derived eligibility that fails
 * closed to complete omission) rather than the Price Strip convention
 * (`PRICE_STRIP_ENABLED`), because a flag would add deployment surface that
 * could not change the outcome while requirement 3 is unmet — the section
 * would still be correctly omitted with the flag ON. When assets are approved,
 * a future session may add a flag on top of this gate without reopening it.
 */

/** The frozen composition is exactly three sectors — §2, §10. */
export const INDUSTRIES_SECTOR_COUNT = 3;

/**
 * Stable sector keys in the frozen §2 order. These are internal identifiers
 * only: they are never rendered, never used as a route, and never localized.
 * They exist so an image can be bound to a sector by identity rather than by
 * array position alone.
 */
export const INDUSTRY_SECTORS = ["construction", "petrochemical-oil-gas", "manufacturing-fabrication"] as const;

export type IndustrySector = (typeof INDUSTRY_SECTORS)[number];

/**
 * One sector's reviewed image asset, or `null` while none has been approved.
 *
 * `src` MUST be a repository-relative public path (`/images/...`). An absolute
 * or protocol-relative URL is rejected by `resolveIndustrySectorImages` below:
 * §8 requires assets whose licence is retained internally, and the invariants
 * test additionally forbids any external URL appearing in the component source
 * at all. Hotlinking a third-party image is never an acceptable shortcut here.
 */
export interface IndustrySectorImage {
  readonly sector: IndustrySector;
  readonly src: string | null;
}

/** The same shape once every asset is present — what the component consumes. */
export interface ResolvedIndustrySectorImage {
  readonly sector: IndustrySector;
  readonly src: string;
}

/**
 * THE PUBLICATION SWITCH. Three `null`s means the section does not render.
 *
 * To publish Industries / Use Cases, a future session must supply three
 * reviewed assets meeting §8 — natural industrial photography, consistent
 * treatment, restrained saturation, comparable light/contrast, 4:3, with a
 * verified focal point and a retained internal licence record — depicting:
 *
 *   construction              a building site, structural steel erection or
 *                             reinforcement context;
 *   petrochemical-oil-gas     an industrial process facility / piping context
 *                             (NOT a steel mill);
 *   manufacturing-fabrication a workshop, steel fabrication or production line
 *                             context (NOT a storage warehouse).
 *
 * None may be a Hero image, a product packshot, a collage, an icon
 * illustration, or anything carrying a visible customer logo, and none may be
 * captioned or described as a real Ahan Asa project (§8, MEDIA_GUIDELINES.md
 * §4.4 and §29). Adding a path here is the deliberate publication act; it must
 * be accompanied by the licence/provenance record §8 requires.
 */
export const INDUSTRY_SECTOR_IMAGES: readonly IndustrySectorImage[] = [
  { sector: "construction", src: null },
  { sector: "petrochemical-oil-gas", src: null },
  { sector: "manufacturing-fabrication", src: null },
];

/**
 * Returns the three assets only when ALL THREE are present and local, and
 * `null` otherwise — the all-or-nothing gate §10 requires. There is no partial
 * return by design: a caller cannot accidentally render two sectors with
 * images and one without, because it never receives a partial list.
 */
export function resolveIndustrySectorImages(images: readonly IndustrySectorImage[] = INDUSTRY_SECTOR_IMAGES): readonly ResolvedIndustrySectorImage[] | null {
  if (images.length !== INDUSTRIES_SECTOR_COUNT) return null;

  const resolved: ResolvedIndustrySectorImage[] = [];
  for (let i = 0; i < images.length; i += 1) {
    const { sector, src } = images[i];
    // Identity AND position must both match the frozen order (§2), so a
    // reordered manifest disables the section rather than silently pairing the
    // petrochemical photograph with the construction heading.
    if (sector !== INDUSTRY_SECTORS[i]) return null;
    if (typeof src !== "string" || src.trim().length === 0) return null;
    // Local public asset only — never an external host (§8).
    if (!src.startsWith("/") || src.startsWith("//")) return null;
    resolved.push({ sector, src });
  }
  return resolved;
}

/**
 * True when the active locale's copy is complete: exactly three items, each
 * with a non-empty title and body, plus a non-empty H2. §10: "complete
 * accurate copy in the active locale" — a partially translated locale must
 * omit the section rather than fall back to another language.
 */
export function isIndustriesCopyComplete(locale: Locale): boolean {
  const copy = homepageCopy[locale].industries;
  if (typeof copy?.title !== "string" || copy.title.trim().length === 0) return false;
  if (!Array.isArray(copy.sectors) || copy.sectors.length !== INDUSTRIES_SECTOR_COUNT) return false;
  return copy.sectors.every((sector) => typeof sector.title === "string" && sector.title.trim().length > 0 && typeof sector.body === "string" && sector.body.trim().length > 0);
}
