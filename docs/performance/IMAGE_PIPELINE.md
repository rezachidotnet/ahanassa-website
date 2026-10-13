# Image pipeline (W16.5)

The static export serves `<Image>` sources unchanged (`images.unoptimized`, `scripts/static/next.config.static.ts`): there is no image optimizer on a static site. Before W16.5 every visitor downloaded the 1–2.7 MB PNG originals, and mobile LCP was 8–18 s. The fix is to encode the variants once, ahead of time, and commit them.

## Layout

| What | Where |
| --- | --- |
| Originals (byte-identical, moved by `git mv`) | `public/_originals/<public path>`, e.g. `public/_originals/images/products/rebar.png`. They sit under `public/` because that is the release policy's approved binary-asset location (`LOW_STATIC_ASSET_DIRS`); a new top-level directory classifies as AMBIGUOUS. The v11 static artifact never contains them: `scripts/static/build.ts` does not copy them, and the static `.assetsignore` and the artifact gate (`forbiddenPublicPath`) reject `_originals/`. The legacy Worker build (`npm run build`, `deploy-*.yml`) still copies all of `public/`, so it uploads them unlinked, as it uploaded the originals before W16.5. Excluding them there needs `vite.config.ts` (a HIGH release trigger) or a `public/.assetsignore` (AMBIGUOUS to the classifier), so that is left to the owner. |
| Source list, roles, widths, budgets, encoder settings | `lib/media/image-sources.ts` |
| Generator | `scripts/images/build-variants.ts` |
| Variants | `public/<dir>/<slug>-<ext>-<w>w.{avif,webp}`, e.g. `/images/products/angle-inventory-jpg-640w.avif` |
| Manifest (generated) | `lib/media/image-variants.generated.ts` |
| Component | `components/ui/image.tsx`. It takes the same props the code passed to `next/image` (`src`, `alt`, `fill`, `sizes`, `priority`). |
| Invariants | `lib/media/image-variants.test.ts` |

An asset keeps its original public path as its identity (`/images/products/rebar.png`). The provenance registry, the category and industry media maps, and the frozen-spec tests still name it that way. The component maps that identity to the variants.

## Roles

| Role | Used for | Frame | Widths | AVIF / WebP quality | Budget per variant |
| --- | --- | --- | --- | --- | --- |
| `hero` | Page heroes, homepage hero, CTA band, Reach | original aspect | 480, 640, 960, 1280, 1600, 1920 (≤ original) | 58 / 74 | AVIF ≤ 200 KB, WebP ≤ 200 KB |
| `card` | Product Showcase category cards, Industries | centred 4:3 crop | 320, 480, 640, 800, 960 (≤ original) | 46 / 64 | AVIF ≤ 80 KB, WebP ≤ 160 KB |
| `gallery` | About page photos (`ABOUT_PHOTOS`, none yet) | original aspect | 480, 640, 960, 1280, 1600 (≤ original) | 58 / 74 | AVIF ≤ 200 KB, WebP ≤ 200 KB |
| `mark` | Brand mark: footer (32 px) and the JSON-LD logo | original (square) | 32, 64, 96 + JPEG 96 and 512 | 70 (4:4:4) / 85, JPEG 85 | AVIF/WebP ≤ 8 KB, JPEG ≤ 40 KB |

- **The 4:3 card crop** is the region that `object-cover` already showed inside the 4:3 frames. Nothing visible changes. A portrait photo (IPE 1080×1440, box-shs 811×1080) just stops shipping the rows the frame cut off. If a new placement needs a different frame, add a role for it; do not reuse `card`.
- **The brand mark** was a 453 KB 4500×4500 JPEG drawn at 32 px. It now ships 348 B–892 B per AVIF/WebP variant. The 96 px JPEG is the `<img src>` for a browser with neither format. The 512 px JPEG (7.5 KB, `BRAND_MARK_LOGO_PATH`) is the Organization `logo` in `lib/seo/schema.ts`. Its URL changed from `/brand/ahan-asa-mark.jpg`, which is no longer published.
- **Budgets bind the AVIF set.** That is what current Chrome, Edge, Firefox and Safari 16+ download. WebP is the `<source>` fallback for older browsers. The detailed steel-stack photos do not fit 80 KB in WebP at a quality without visible loss, so the WebP card ceiling is 160 KB.
- **Visual check (2026-10-13).** Original vs AVIF, side by side at 1:1, at the variant width: hero 960w, box-shs 640w (densest texture) and construction-site 960w. No visible difference was found. The comparison images are in the W16.5 report folder.

## Loading rules

- `priority` gives `loading="eager"`, `fetchpriority="high"`, and one `<link rel="preload" as="image" type="image/avif" imagesrcset imagesizes>`. Only the LCP image may use it. Today that is `components/home/hero.tsx` and `components/ui/page-hero.tsx`, at most one per page, and the test enforces this.
- Everything else gets `loading="lazy"` and `decoding="async"`.
- `width`/`height` are always emitted (the published frame), and every current use is `fill` inside an aspect-ratio box, so the box is reserved before the image loads (CLS 0).

## Adding or replacing a photo

1. Put the original at `public/_originals/images/...`. For an About photo, use `public/_originals/images/about/`, role `gallery`, and then add it to `ABOUT_PHOTOS` with the generated width/height. If it is an Industries asset, add its provenance record first (`lib/media/provenance-registry.ts`).
2. Add its public path and role to `OPTIMIZED_IMAGE_SOURCES`.
3. Run `node scripts/images/build-variants.ts`. It fails if a variant goes over budget, and it removes stale variants.
4. Commit the original, the variants and `image-variants.generated.ts`. `npm test` fails if any `/images/….png|jpg` path referenced in `app/`, `components/` or `lib/` has no variants, or if a PNG/JPEG is left under `public/images/`.

## Not covered

The header logo is the inline SVG `components/layout/brand-mark.tsx` and needs no raster. Article covers are rasterized at build time (`lib/articles/cover-raster.ts`) and are not part of this pipeline.
