/**
 * Homepage/catalog product image resolution — CLAUDE.md §5a "protected
 * assets", this task's Media Registry requirement.
 *
 * Pure, D1-free (no `cloudflare:workers` import) — same split convention as
 * `lib/catalog/catalog-filters.ts`/`lib/catalog/sync.ts`. Resolution never
 * depends on a localized SEO slug (`product_seo_contents.slug` is
 * website-owned and can change on rename — see `route-redirects.ts`); it
 * depends only on stable Odoo-owned commercial identity
 * (`templateXid`) and classification (`groupCode`/`familyCode`).
 *
 * Resolution hierarchy (this task's own §8-10):
 *   1. product/template-specific override (`TEMPLATE_XID_IMAGE_OVERRIDES`)
 *   2. group default, then family default (`CLASSIFICATION_DEFAULT_IMAGES`)
 *   3. generic fallback (a NEW, deliberately generic asset — none of the 13
 *      existing product photos under public/images/products/ is a neutral
 *      placeholder, and CLAUDE.md forbids reusing/altering one of those as
 *      a stand-in for an unrelated product)
 *
 * All 13 existing files under public/images/products/ remain completely
 * untouched by this module — it only reads their paths as string constants.
 *
 * Mapping verified live against actual synced DB_PUBLIC classification
 * codes (2026-09-03, local D1, `SELECT DISTINCT family_code, group_code,
 * form_code FROM product_variants`) — never invented. Confirmed live
 * group codes today: FLAT_PRODUCTS/SHEET_PLATE, HOLLOW_SECTIONS_PROFILES/RHS,
 * HOLLOW_SECTIONS_PROFILES/SHS, LONG_PRODUCTS/BEAMS, LONG_PRODUCTS/REBAR,
 * PIPES_TUBES/SEAMLESS_PIPE. Only groups with an existing, genuinely
 * representative photo among the 13 protected assets are mapped below;
 * RHS/SHS (hollow sections) have no dedicated photo today and intentionally
 * fall through to the generic fallback rather than borrowing an unrelated
 * product's image — add a group entry here only once a real, reviewed photo
 * for that group exists under public/images/products/, never speculatively.
 */

export interface CatalogMediaSubject {
  templateXid: string;
  groupCode: string | null;
  familyCode: string | null;
}

export type MediaResolutionSource = "override" | "group_default" | "family_default" | "generic_fallback";

export interface ResolvedCatalogMedia {
  src: string;
  source: MediaResolutionSource;
}

const PRODUCTS_DIR = "/images/products";

/**
 * Per-template overrides — none configured yet (no editor tooling exists to
 * set one). Structure is here so a future specific photo for one exact
 * template can be wired with a single map entry, without touching any
 * caller.
 */
const TEMPLATE_XID_IMAGE_OVERRIDES: Record<string, string> = {};

/** Verified-live group codes only — see file header. */
const GROUP_DEFAULT_IMAGES: Record<string, string> = {
  REBAR: `${PRODUCTS_DIR}/rebar.png`,
  SHEET_PLATE: `${PRODUCTS_DIR}/sheet-plate.png`,
  BEAMS: `${PRODUCTS_DIR}/beams.png`,
  SEAMLESS_PIPE: `${PRODUCTS_DIR}/pipe.png`,
};

/** No family-level default is verified/needed yet — every currently-live family maps cleanly at the group tier above. Left empty rather than guessed. */
const FAMILY_DEFAULT_IMAGES: Record<string, string> = {};

/**
 * A deliberately generic, non-product-specific illustration — not a photo of
 * any real Ahan Asa product, so it can never misrepresent one product as
 * another. New asset, additive only; does not touch any of the 13 protected
 * photos.
 */
const GENERIC_FALLBACK_IMAGE = `${PRODUCTS_DIR}/steel-placeholder.svg`;

/**
 * Never returns a broken reference — always resolves to *some* src, per this
 * task's "no broken images allowed; missing mapping must still render
 * safely" requirement.
 */
export function resolveCatalogMedia(subject: CatalogMediaSubject): ResolvedCatalogMedia {
  const override = TEMPLATE_XID_IMAGE_OVERRIDES[subject.templateXid];
  if (override) return { src: override, source: "override" };

  if (subject.groupCode && GROUP_DEFAULT_IMAGES[subject.groupCode]) {
    return { src: GROUP_DEFAULT_IMAGES[subject.groupCode], source: "group_default" };
  }

  if (subject.familyCode && FAMILY_DEFAULT_IMAGES[subject.familyCode]) {
    return { src: FAMILY_DEFAULT_IMAGES[subject.familyCode], source: "family_default" };
  }

  return { src: GENERIC_FALLBACK_IMAGE, source: "generic_fallback" };
}
