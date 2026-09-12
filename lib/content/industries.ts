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
 * CURRENT STATE — 2026-09-12: ELIGIBLE. All four requirements are now met.
 *
 * Requirements 1 and 2 were already satisfied: all three sectors are present,
 * in the frozen order, with complete FA/EN/AR copy pinned character-for-
 * character against the freeze document by
 * `lib/content/industries-frozen-spec-invariants.test.ts`.
 *
 * Requirement 3 — REVIEWED IMAGERY — was the sole blocker through IND-P1 and is
 * now satisfied. The owner supplied and approved three sector images on
 * 2026-09-12. They were visually inspected, imported under
 * `public/images/industries/`, and — the part that actually matters — given
 * real provenance records in `lib/media/provenance-registry.ts`, this
 * repository's implementation of 01-sources/MEDIA_GUIDELINES.md §27.
 *
 * That registry is what unblocked publication. IND-P1 was not blocked by a
 * shortage of pictures; it was blocked because NO asset in this repository
 * carried recorded provenance, and §5 is unambiguous that "Unknown provenance
 * defaults to `restricted`" and `restricted` media "Must not be published".
 * Three owner-provided assets with recorded provenance, rights basis, approval
 * date and truth class are therefore publishable where a borrowed near-miss
 * photograph still would not be.
 *
 * The IND-P1 rejections still stand and must not be revisited: the existing
 * repo photographs are steel stockholding, port/yard logistics, QC inspection
 * and a steel mill exterior — mapping `ops/mill-exterior.png` onto
 * "Petrochemical, oil and gas" would misdescribe a STEEL plant as a
 * PETROCHEMICAL one (the misleading-media case §4.4 forbids); the product
 * photographs are packshots, which §8 excludes outright; and the Hero images
 * are excluded by §8 by name. Fabricating provenance, hotlinking and shipping a
 * gradient placeholder were all rejected then and remain rejected now.
 *
 * The three assets are generic SECTOR illustrations. They are not, and must
 * never be described as, evidence of a real Ahan Asa project, facility,
 * customer or capability — Industries V1.0 §8, §10 and MEDIA_GUIDELINES.md
 * §4.4/§29. Each registry record carries that as an explicit flag.
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
 * THE PUBLICATION SWITCH — now closed, i.e. the section renders.
 *
 * Each entry below is an owner-provided, owner-approved sector illustration
 * with a full provenance record in `lib/media/provenance-registry.ts`
 * (MEDIA_GUIDELINES.md §27). The registry is the authority on WHY each may be
 * published; this manifest only binds one approved asset to one frozen sector
 * slot, in the frozen §2 order.
 *
 * Each satisfies its §8 subject requirement:
 *
 *   construction              a building site, structural steel erection or
 *                             reinforcement context;
 *   petrochemical-oil-gas     an industrial process facility / piping context
 *                             (NOT a steel mill);
 *   manufacturing-fabrication a workshop, steel fabrication or production line
 *                             context (NOT a storage warehouse).
 *
 * None is a Hero image, a product packshot, a collage, an icon illustration, or
 * carries a visible customer logo, and none may be captioned or described as a
 * real Ahan Asa project (§8, MEDIA_GUIDELINES.md §4.4 and §29).
 *
 * BEFORE CHANGING A PATH HERE: add the new asset to the provenance registry
 * first. An asset with no provenance record is `restricted` by §5 default and
 * must not be published, no matter how suitable the picture looks. The
 * invariants test enforces that every path below resolves to a publishable
 * registry record bound to the same sector.
 */
export const INDUSTRY_SECTOR_IMAGES: readonly IndustrySectorImage[] = [
  { sector: "construction", src: "/images/industries/construction-site.png" },
  { sector: "petrochemical-oil-gas", src: "/images/industries/petrochemical-facility.png" },
  { sector: "manufacturing-fabrication", src: "/images/industries/fabrication-workshop.png" },
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
