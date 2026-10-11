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
 * (W10.3, 2026-10-09: the owner replaced sheet-plate.png with sheet-plate.jpg.)
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
  // sheet-plate.jpg replaced the deleted sheet-plate.png (owner, W10.3, 2026-10-09) — same photo as the SHEET_PLATE category card.
  SHEET_PLATE: `${PRODUCTS_DIR}/sheet-plate.jpg`,
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
 * Website public category images, keyed by the Odoo public category `code`
 * (`/api/v1/catalog/categories`) — owner-approved mapping, 2026-09-28. The
 * one place a category's picture is chosen; no component hardcodes a path.
 * Paths are stored exactly as the files are named on disk; `categoryImageSrc`
 * percent-encodes them (several contain spaces).
 */
const CATEGORY_IMAGES: Record<string, string> = {
  REBAR: `${PRODUCTS_DIR}/rebar.png`,
  BEAM: `${PRODUCTS_DIR}/IPE.jpg`,
  ANGLE: `${PRODUCTS_DIR}/angle inventory.jpg`,
  CHANNEL: `${PRODUCTS_DIR}/u channel.jpg`,
  BOX_SECTION: `${PRODUCTS_DIR}/box-shs.jpg`,
  // Owner-supplied photo, 2026-10-09 (W10.3): 1200×900 (4:3, centre crop) JPEG q80, like steel-pipe.jpg.
  SHEET_PLATE: `${PRODUCTS_DIR}/sheet-plate.jpg`,
  PIPE: `${PRODUCTS_DIR}/steel-pipe.jpg`,
};

export type CategoryMediaSource = "category" | "generic_fallback";

export interface ResolvedCategoryMedia {
  /** The on-disk public path (unencoded) — what tests and the asset check compare against. */
  path: string;
  /** URL-safe `src` for `<Image>`/`<img>`. */
  src: string;
  source: CategoryMediaSource;
}

/**
 * Image for a public category. A category Odoo adds later that has no
 * approved photo yet renders the neutral generic illustration — never
 * another category's photo, never a broken reference.
 */
export function resolveCategoryMedia(code: string): ResolvedCategoryMedia {
  const mapped = CATEGORY_IMAGES[code];
  const path = mapped ?? GENERIC_FALLBACK_IMAGE;
  return { path, src: encodeURI(path), source: mapped ? "category" : "generic_fallback" };
}

/** Every mapped category image path — for the asset-existence test only. */
export const CATEGORY_IMAGE_PATHS: readonly string[] = Object.values(CATEGORY_IMAGES);

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
