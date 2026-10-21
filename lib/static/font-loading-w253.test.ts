import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "@pdf-lib/fontkit";
import { ESTEDAD_FALLBACK_FAMILIES, ESTEDAD_FALLBACK_STACK, isArabicScript, renderFallbackCss, unicodeRanges, type EstedadFallbackMetrics } from "../fonts/estedad-fallback.ts";
import { checkFontLoading, fontPreloadHrefs } from "./font-loading.ts";

/**
 * W25.3 (owner decision D-W253-FONT, amended 2026-10-21): Estedad stays preloaded (FONT_STRATEGY §8.2 — dropping
 * the preload was measured slower), and metric-matched local fallback faces are added so the swap barely moves
 * the layout (CLS on /contact 0.075 → ~0.0005). PROJECT_OVERRIDES.md §17, DAR-067. The browser half is the W25_3
 * measurement; these are the rules that keep it.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const metrics = JSON.parse(read("lib/fonts/estedad-fallback-metrics.json")) as EstedadFallbackMetrics;

const FONT = "/_next/static/media/Estedad-Variable.CFvC3bjT.woff2";
const STACK = `'estedad', ${ESTEDAD_FALLBACK_STACK.slice(0, -1).map((f) => `'${f}'`).join(", ")}, sans-serif`;
const VINEXT_PRELOAD = `<link rel="preload" href="${FONT}" as="font" type="font/woff2" crossorigin />`;
const page = (head = VINEXT_PRELOAD) =>
  `<head><link rel="stylesheet" href="/_next/static/css/index.css"/>${head}<link rel="preload" href="/data/rfq-catalog.fa.0123456789abcdef.json" as="fetch" crossorigin=""/>` +
  `<style data-vinext-fonts>@font-face {\n  font-family: 'estedad';\n  src: url('${FONT}') format('woff2');\n  font-display: swap;\n}\n:root { --font-ahan-asa: ${STACK}; }</style></head><body></body>`;

test("font preloads are found in any attribute order", () => {
  assert.deepEqual(fontPreloadHrefs(page()), [FONT]);
  assert.deepEqual(fontPreloadHrefs(page(`<link as="font" crossorigin="" href="${FONT}" rel="preload">`)), [FONT]);
  assert.deepEqual(fontPreloadHrefs(page("")), [], "the catalog's as=fetch preload is not a font");
});

test("Estedad: swap, preloaded (vinext's default), fallback families ahead of sans-serif", () => {
  const src = read("lib/fonts/estedad.ts");
  assert.match(src, /display: "swap"/);
  assert.doesNotMatch(src, /preload: false/);
  assert.doesNotMatch(read("scripts/static/build.ts"), /FontPreload/i, "the build leaves vinext's font preload in place");
  const fallback = /fallback: (\[[^\]]*\])/.exec(src)?.[1];
  assert.deepEqual(JSON.parse(fallback ?? "null"), ESTEDAD_FALLBACK_STACK, "kept literal for vinext; equal to ESTEDAD_FALLBACK_STACK");
  assert.equal(ESTEDAD_FALLBACK_STACK.at(-1), "sans-serif", "characters Estedad lacks still reach the same generic family");
});

test("the fallback CSS is generated from the committed measurement, against the exact active font", () => {
  assert.equal(read("styles/estedad-fallback.css"), renderFallbackCss(metrics), "re-run scripts/fonts/estedad-fallback-metrics.ts");
  assert.match(read("app/globals.css"), /@import "\.\.\/styles\/estedad-fallback\.css";/);
  const bytes = fs.readFileSync(path.join(ROOT, metrics.font.file));
  assert.equal(metrics.font.sha256, crypto.createHash("sha256").update(bytes).digest("hex"), "measured against this Estedad file");
  const font = fontkit.create(bytes) as unknown as { unitsPerEm: number; characterSet: number[]; "OS/2": { typoAscender: number; typoDescender: number; typoLineGap: number } };
  assert.deepEqual(
    [metrics.font.unitsPerEm, metrics.font.ascent, metrics.font.descent, metrics.font.lineGap],
    [font.unitsPerEm, font["OS/2"].typoAscender, font["OS/2"].typoDescender, font["OS/2"].typoLineGap],
  );
  // unicode-range is exactly Estedad's own coverage, so after the swap every character renders as before.
  const cps = font.characterSet.filter((cp) => cp >= 0x20);
  assert.equal(metrics.ranges.arabic, unicodeRanges(cps.filter(isArabicScript)));
  assert.equal(metrics.ranges.latin, unicodeRanges(cps.filter((cp) => !isArabicScript(cp))));
  for (const fam of ESTEDAD_FALLBACK_FAMILIES)
    for (const face of fam.faces) {
      const s = metrics.sizeAdjust[fam.family]?.[face.script]?.[face.weight];
      assert.ok(typeof s === "number" && s > 0.7 && s < 1.4, `${fam.family} ${face.script} ${face.weight}: measured size-adjust ${s}`);
    }
});

test("unicodeRanges collapses runs", () => {
  assert.equal(unicodeRanges([0x41, 0x42, 0x43, 0x600, 0x45, 0x601]), "U+0041-0043, U+0045, U+0600-0601");
});

test("the artifact gate: exactly the site font preloaded, fallback stack on every page, every fallback face complete", () => {
  const css = renderFallbackCss(metrics);
  const files: Record<string, string> = { "contact.html": page(), "_next/static/css/index.css": css };
  const r = (p: string) => files[p];
  assert.deepEqual(checkFontLoading(["contact.html"], ["_next/static/css/index.css"], r), []);
  // minified like the production CSS bundle (quotes dropped)
  files["_next/static/css/index.css"] = css.replace(/"Estedad Fallback (\w+)"/g, "Estedad Fallback $1").replace(/\s*\n\s*/g, "");
  assert.deepEqual(checkFontLoading(["contact.html"], ["_next/static/css/index.css"], r), []);

  files["contact.html"] = page("");
  assert.match(checkFontLoading(["contact.html"], ["_next/static/css/index.css"], r).join(), /contact\.html: must preload exactly the site font .*found none/);
  files["contact.html"] = page(VINEXT_PRELOAD + VINEXT_PRELOAD.replace("Estedad-Variable", "Other"));
  assert.match(checkFontLoading(["contact.html"], ["_next/static/css/index.css"], r).join(), /must preload exactly the site font/);
  files["contact.html"] = page(VINEXT_PRELOAD.replace("CFvC3bjT", "stale000"));
  assert.match(checkFontLoading(["contact.html"], ["_next/static/css/index.css"], r).join(), /must preload exactly the site font/, "a preload of another file than the @font-face loads");
  files["404.html"] = "<html><body>404</body></html>";
  files["_next/static/css/index.css"] = css;
  assert.deepEqual(checkFontLoading(["404.html"], ["_next/static/css/index.css"], r), [], "a page without the font stack is not checked");
  files["contact.html"] = page().replace(", 'Estedad Fallback Android'", "");
  assert.match(checkFontLoading(["contact.html"], ["_next/static/css/index.css"], r).join(), /lacks the fallback family Estedad Fallback Android/);
  files["contact.html"] = page();
  files["_next/static/css/index.css"] = css.replace(/size-adjust: [^;]+;/, "");
  assert.match(checkFontLoading(["contact.html"], ["_next/static/css/index.css"], r).join(), /3\/4 complete @font-face rules for "Estedad Fallback Tahoma"/);
  assert.match(read("lib/static/artifact-gate.ts"), /failures\.push\(\.\.\.checkFontLoading\(/);
});
