/**
 * W16.5 — responsive image variants for the site's raster photos.
 *
 * The static export serves `<Image>` sources as-is (`images.unoptimized`,
 * scripts/static/next.config.static.ts — there is no image optimizer on a
 * static site), so the 1–2.7 MB PNG originals were what every visitor
 * downloaded (mobile LCP 8–14 s, W16.2). The originals now live under
 * `public/_originals/` (same relative path as their public URL), which no
 * build publishes (see ORIGINALS_DIR); `scripts/images/build-variants.ts` encodes each one listed here to AVIF +
 * WebP at the role's widths into `public/`, and records the result in
 * `image-variants.generated.ts`. `components/ui/image.tsx` renders them as a
 * `<picture>` with `srcset`/`sizes`.
 *
 * A source keeps its original public path (`/images/products/rebar.png`) as
 * its identity: the provenance registry, the category/industry media maps and
 * the frozen-spec tests all name assets by that path, and this module maps it
 * to the derived files. No pixel content changes — only resize + re-encode.
 */

export type ImageRole = "hero" | "card" | "gallery" | "mark";

/**
 * Candidate widths per role. `hero`: above-the-fold and full-bleed images
 * (page heroes, the homepage hero, the CTA band and Reach backgrounds), at the
 * original's aspect. `card`: grid cards, every one rendered in a 4:3
 * `object-cover` frame (Product Showcase, Industries) — encoded already
 * centre-cropped to 4:3, which is exactly the region `object-cover` showed,
 * so a portrait photo no longer ships the rows the frame cut off. At most 960
 * wide: a 100vw card on a ~412 px phone at DPR 2.6 wants ~1080.
 * `gallery`: in-flow photos at their own aspect (the About gallery, ABOUT_PHOTOS).
 * `mark`: the brand mark at icon size — 32 CSS px (footer) at DPR 1, 2 and 3.
 */
export const IMAGE_LADDERS: Record<ImageRole, readonly number[]> = {
  hero: [480, 640, 960, 1280, 1600, 1920],
  card: [320, 480, 640, 800, 960],
  gallery: [480, 640, 960, 1280, 1600],
  mark: [32, 64, 96],
};

/**
 * JPEG fallbacks a role also publishes, by width. Only the brand mark has them: the smallest is the
 * `<img src>` for a browser without AVIF/WebP, the 512 is the Organization JSON-LD logo
 * (lib/seo/schema.ts) — a raster at least 112 px wide in a format every consumer reads.
 */
export const IMAGE_JPEG_WIDTHS: Partial<Record<ImageRole, readonly number[]>> = { mark: [96, 512] };

/** Aspect ratio (width / height) a role is cropped to; absent = the original's. */
export const IMAGE_ROLE_ASPECT: Partial<Record<ImageRole, number>> = { card: 4 / 3 };

export const IMAGE_FORMATS = ["avif", "webp"] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];
/** Every file format the pipeline writes: the two `<source>` formats plus the JPEG fallback. */
export type VariantFormat = ImageFormat | "jpg";

/**
 * Byte budget per variant (W16.5 targets: < 200 KB per hero, < 80 KB per card
 * image). The targets bind the AVIF set — what every current Chrome, Edge,
 * Firefox and Safari (16+) downloads. The WebP set is the fallback for older
 * browsers only; at a quality with no visible loss the detailed steel photos
 * do not fit 80 KB in WebP, so its card ceiling is 160 KB.
 */
export const IMAGE_BUDGET_BYTES: Record<ImageRole, Record<VariantFormat, number>> = {
  hero: { avif: 200_000, webp: 200_000, jpg: 0 },
  card: { avif: 80_000, webp: 160_000, jpg: 0 },
  gallery: { avif: 200_000, webp: 200_000, jpg: 0 },
  // The mark replaced a 453 KB 4500×4500 JPEG drawn at 32 px; the 512 JPEG is the JSON-LD logo.
  mark: { avif: 8_000, webp: 8_000, jpg: 40_000 },
};

/** Encoder settings (sharp) per role — see docs/performance/IMAGE_PIPELINE.md for the visual check. */
export const IMAGE_ENCODE: Record<ImageRole, { avif: object; webp: object; jpg?: object }> = {
  hero: { avif: { quality: 58, effort: 6 }, webp: { quality: 74, effort: 6, smartSubsample: true } },
  card: { avif: { quality: 46, effort: 6 }, webp: { quality: 64, effort: 6, smartSubsample: true } },
  gallery: { avif: { quality: 58, effort: 6 }, webp: { quality: 74, effort: 6, smartSubsample: true } },
  // Flat colours and hard edges: higher quality, no chroma subsampling, so the copper/navy edges stay clean at 32 px.
  mark: { avif: { quality: 70, effort: 6, chromaSubsampling: "4:4:4" }, webp: { quality: 85, effort: 6 }, jpg: { quality: 85, mozjpeg: true } },
};

/** The brand mark's identity path (its original is public/_originals/brand/ahan-asa-mark.jpg). */
export const BRAND_MARK_SRC = "/brand/ahan-asa-mark.jpg";
/** The JPEG published for the Organization JSON-LD logo. */
export const BRAND_MARK_LOGO_PATH = variantPath(BRAND_MARK_SRC, 512, "jpg");

/**
 * Directory (repo-relative) holding the originals, mirroring their public path. It sits under public/
 * because that is the release policy's approved binary-asset location (lib/ci/release-risk-classifier.ts
 * LOW_STATIC_ASSET_DIRS; a new top-level directory classifies AMBIGUOUS). The static artifact never contains
 * it: scripts/static/build.ts does not copy it, and its .assetsignore and the artifact gate reject it.
 */
export const ORIGINALS_DIR = "public/_originals";
/** The same directory as a path inside a build's asset root. */
export const ORIGINALS_ASSET_PREFIX = "_originals/";

/**
 * Every raster image the site references, by original public path. Any
 * `/images/…` or `/brand/…` .png/.jpg path in app/, components/ or lib/ must
 * be listed here, and so must every ABOUT_PHOTOS src (role `gallery`) —
 * lib/media/image-variants.test.ts enforces both.
 */
export const OPTIMIZED_IMAGE_SOURCES: Readonly<Record<string, ImageRole>> = {
  "/images/hero-steel-procurement.jpg": "hero",
  "/images/ops/containers.png": "hero",
  "/images/ops/mill-exterior.png": "hero",
  "/images/ops/port-loading.png": "hero",
  "/images/ops/truck-loading.png": "hero",
  "/images/ops/warehouse.png": "hero",
  "/images/industries/construction-site.png": "card",
  "/images/industries/fabrication-workshop.png": "card",
  "/images/industries/petrochemical-facility.png": "card",
  "/images/products/IPE.jpg": "card",
  "/images/products/angle inventory.jpg": "card",
  "/images/products/angle-bar.png": "card",
  "/images/products/beams.png": "card",
  "/images/products/billet.png": "card",
  "/images/products/box-shs.jpg": "card",
  "/images/products/ferro-silicon.png": "card",
  "/images/products/flat-bar.png": "card",
  "/images/products/hrc.png": "card",
  "/images/products/ingot.png": "card",
  "/images/products/pipe.png": "card",
  "/images/products/rebar.png": "card",
  "/images/products/sheet-plate.jpg": "card",
  "/images/products/sponge-iron.png": "card",
  "/images/products/steel-pipe.jpg": "card",
  "/images/products/u channel.jpg": "card",
  "/images/products/u-channel.png": "card",
  "/images/products/wire-rod.png": "card",
  [BRAND_MARK_SRC]: "mark",
};

/** The role's widths below the source's, plus the source width itself when the ladder reaches it (never upscaled). */
export function variantWidths(role: ImageRole, sourceWidth: number): number[] {
  const ladder = IMAGE_LADDERS[role];
  const widths = ladder.filter((w) => w < sourceWidth);
  if (ladder[ladder.length - 1] >= sourceWidth) widths.push(sourceWidth);
  return widths;
}

/** The region a role publishes from an original: the full frame, or the largest centred crop at the role's aspect. */
export function publishedFrame(role: ImageRole, width: number, height: number): { width: number; height: number } {
  const aspect = IMAGE_ROLE_ASPECT[role];
  if (!aspect) return { width, height };
  return width / height > aspect ? { width: Math.round(height * aspect), height } : { width, height: Math.round(width / aspect) };
}

/**
 * `/images/products/angle inventory.jpg`, 640, avif -> `/images/products/angle-inventory-jpg-640w.avif`.
 * The original extension stays in the name (`u channel.jpg` and `u-channel.png` are different photos), and
 * spaces are removed so the URL is safe inside `srcset` without escaping.
 */
export function variantPath(src: string, width: number, format: VariantFormat): string {
  const slash = src.lastIndexOf("/");
  const slug = src
    .slice(slash + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${src.slice(0, slash + 1)}${slug}-${width}w.${format}`;
}
