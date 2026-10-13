import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { IMAGE_BUDGET_BYTES, IMAGE_FORMATS, OPTIMIZED_IMAGE_SOURCES, ORIGINALS_ASSET_PREFIX, ORIGINALS_DIR, publishedFrame, variantPath, variantWidths } from "./image-sources.ts";
import { ASSETS_IGNORE_PATTERNS } from "../static/static-rules.ts";
import { forbiddenPublicPath } from "../static/artifact-gate.ts";
import { IMAGE_VARIANTS } from "./image-variants.generated.ts";

/** W16.5 — the responsive image pipeline (lib/media/image-sources.ts, scripts/images/build-variants.ts, components/ui/image.tsx). */

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), "utf8");

function walk(dir: string): string[] {
  return readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = `${dir}/${d.name}`;
    return d.isDirectory() ? walk(rel) : [rel];
  });
}

test("variant naming: slugged, original extension kept, no spaces (srcset-safe)", () => {
  assert.equal(variantPath("/images/products/angle inventory.jpg", 640, "avif"), "/images/products/angle-inventory-jpg-640w.avif");
  assert.equal(variantPath("/images/products/u channel.jpg", 320, "webp"), "/images/products/u-channel-jpg-320w.webp");
  assert.notEqual(variantPath("/images/products/u channel.jpg", 320, "webp"), variantPath("/images/products/u-channel.png", 320, "webp"));
  assert.equal(variantPath("/images/hero-steel-procurement.jpg", 1448, "avif"), "/images/hero-steel-procurement-jpg-1448w.avif");
});

test("widths never upscale and include the original width only when the ladder reaches it", () => {
  assert.deepEqual(variantWidths("hero", 1024), [480, 640, 960, 1024]);
  assert.deepEqual(variantWidths("hero", 1448), [480, 640, 960, 1280, 1448]);
  assert.deepEqual(variantWidths("card", 1024), [320, 480, 640, 800, 960]);
  assert.deepEqual(variantWidths("card", 811), [320, 480, 640, 800, 811]);
});

test("cards publish the centred 4:3 region their object-cover frame shows; heroes keep the original frame", () => {
  assert.deepEqual(publishedFrame("card", 1080, 1440), { width: 1080, height: 810 });
  assert.deepEqual(publishedFrame("card", 1024, 1024), { width: 1024, height: 768 });
  assert.deepEqual(publishedFrame("card", 1448, 1086), { width: 1448, height: 1086 });
  assert.deepEqual(publishedFrame("hero", 1024, 1024), { width: 1024, height: 1024 });
});

test("the generated manifest matches the source list and the originals", () => {
  assert.deepEqual(Object.keys(IMAGE_VARIANTS).sort(), Object.keys(OPTIMIZED_IMAGE_SOURCES).sort(), "re-run scripts/images/build-variants.ts");
  for (const [src, role] of Object.entries(OPTIMIZED_IMAGE_SOURCES)) {
    assert.ok(existsSync(path.join(REPO_ROOT, ORIGINALS_DIR, src)), `${src}: original must exist in ${ORIGINALS_DIR}/`);
    const entry = IMAGE_VARIANTS[src];
    assert.deepEqual(entry.widths, variantWidths(role, entry.width), `${src}: stale widths — re-run scripts/images/build-variants.ts`);
  }
});

test("every variant exists in public/ and is within its role's byte budget (AVIF: hero < 200 KB, card < 80 KB)", () => {
  for (const [src, role] of Object.entries(OPTIMIZED_IMAGE_SOURCES)) {
    for (const w of IMAGE_VARIANTS[src].widths) {
      for (const format of IMAGE_FORMATS) {
        const file = path.join(REPO_ROOT, "public", variantPath(src, w, format));
        assert.ok(existsSync(file), `${variantPath(src, w, format)} missing — re-run scripts/images/build-variants.ts`);
        const bytes = statSync(file).size;
        assert.ok(bytes > 0 && bytes <= IMAGE_BUDGET_BYTES[role][format], `${variantPath(src, w, format)}: ${bytes} B exceeds the ${role} ${format} budget`);
      }
    }
  }
});

test("originals stay out of the static artifact: the build does not copy them, its .assetsignore and the artifact gate reject them", () => {
  const rasters = walk("public/images").filter((f) => /\.(png|jpe?g)$/i.test(f));
  assert.deepEqual(rasters, [], `originals belong in ${ORIGINALS_DIR}/; run scripts/images/build-variants.ts`);
  assert.ok(read("scripts/static/build.ts").includes('"public/_originals"'), "the static build must not copy the originals");
  assert.ok(ASSETS_IGNORE_PATTERNS.includes(ORIGINALS_ASSET_PREFIX), "static artifact .assetsignore");
  assert.match(forbiddenPublicPath(`${ORIGINALS_ASSET_PREFIX}images/products/rebar.png`) ?? "", /image original/, "the artifact gate rejects a published original");
  assert.equal(forbiddenPublicPath("images/products/rebar-png-640w.avif"), null);
});

test("every raster /images/ path referenced in app/, components/ or lib/ has variants", () => {
  const sources = [...walk("app"), ...walk("components"), ...walk("lib")].filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.endsWith(".generated.ts"));
  const referenced = new Set<string>();
  for (const f of sources) {
    // Registries build paths from a directory constant; resolve those before scanning.
    const text = read(f).replaceAll("${PRODUCTS_DIR}", "/images/products").replaceAll("${INDUSTRIES_DIR}", "/images/industries");
    for (const m of text.matchAll(/["'`](\/images\/[^"'`$]+\.(?:png|jpe?g))["'`]/g)) referenced.add(m[1]);
  }
  assert.ok(referenced.size >= 20, `scan found only ${referenced.size} paths`);
  for (const src of referenced) assert.ok(OPTIMIZED_IMAGE_SOURCES[src], `${src} is referenced but has no variants — add it to OPTIMIZED_IMAGE_SOURCES`);
});

test("components render photos through components/ui/image.tsx; exactly one priority image per hero component", () => {
  for (const f of ["components/ui/page-hero.tsx", "components/ui/cta-band.tsx", "components/home/hero.tsx", "components/home/reach.tsx", "components/home/product-showcase.tsx", "components/home/industries.tsx"]) {
    const code = read(f);
    assert.match(code, /^import Image from "@\/components\/ui\/image";$/m, `${f}: use the variant-aware image component`);
    assert.ok(!code.includes('from "next/image"'), `${f}: next/image serves the original unchanged on the static export`);
  }
  // LCP candidates: the homepage hero and the inner-page hero. Everything else lazy-loads.
  for (const f of ["components/ui/page-hero.tsx", "components/home/hero.tsx"]) assert.equal((read(f).match(/\bpriority\b/g) ?? []).length, 1, `${f}: one priority image`);
  for (const f of ["components/ui/cta-band.tsx", "components/home/reach.tsx", "components/home/product-showcase.tsx", "components/home/industries.tsx"]) assert.ok(!/\bpriority\b/.test(read(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), `${f}: below the fold — no priority`);
});
