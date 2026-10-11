import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import sharpModule from "sharp";
import { ARTICLE_COVER_SIZE } from "./routes.ts";

/**
 * W11.1 — article covers: the content repository's vector cover (1200×630 SVG) rasterized at build time
 * to PNG (og:image — social networks do not accept SVG) and WebP (cards and the article page). The SVG
 * itself is never published. Build tooling only (scripts/static/build.ts); never bundled into a page.
 *
 * Rendering is deterministic: resvg (WASM) with ONLY the Estedad static fonts committed under
 * lib/fonts/cover/ (OFL-1.1; system fonts are never loaded), then sharp's WebP encoder.
 *
 * resvg ignores the SVG `direction` property, which the cover template relies on for fa/ar
 * (`direction="rtl"` on the root: text-anchor "start" = the right edge, bidi base direction RTL), so an
 * RTL cover is normalized first, to what a browser draws: start↔end anchors swapped, every multi-line
 * title split into one <text> per line, and each text run prefixed with U+200F so its bidi base
 * direction is RTL (dates like «۱۷ مهر ۱۴۰۵» keep their order).
 */
// sharp 0.35's ESM typings resolve to `unknown` under this tsconfig; the one call used here, typed.
const sharp = sharpModule as unknown as (input: Buffer) => { webp(options: { quality: number; effort: number }): { toBuffer(): Promise<Buffer> } };
const FONT_DIR = path.resolve(import.meta.dirname, "../fonts/cover");
export const COVER_FONT_FILES = ["Estedad-Regular.ttf", "Estedad-SemiBold.ttf", "Estedad-Bold.ttf", "Estedad-ExtraBold.ttf"] as const;

export function normalizeRtlCover(svg: string): string {
  if (!/<svg\b[^>]*\bdirection="rtl"/.test(svg)) return svg;
  let s = svg.replace(/text-anchor="(start|end)"/g, (_, a: string) => `text-anchor="${a === "start" ? "end" : "start"}"`);
  s = s.replace(/<text([^>]*)>\s*((?:<tspan[\s\S]*?<\/tspan>\s*)+)<\/text>/g, (_m, attrs: string, body: string) => {
    let y = Number(/\by="([\d.]+)"/.exec(attrs)?.[1] ?? 0);
    const lines: string[] = [];
    for (const t of body.matchAll(/<tspan([^>]*)>([\s\S]*?)<\/tspan>/g)) {
      const abs = /\by="([\d.]+)"/.exec(t[1]);
      const dy = /\bdy="([\d.]+)"/.exec(t[1]);
      if (abs) y = Number(abs[1]);
      else if (dy) y += Number(dy[1]);
      const x = /\bx="([\d.]+)"/.exec(t[1]);
      let a = /\by="[\d.]+"/.test(attrs) ? attrs.replace(/\by="[\d.]+"/, `y="${y}"`) : `${attrs} y="${y}"`;
      if (x) a = /\bx="[\d.]+"/.test(a) ? a.replace(/\bx="[\d.]+"/, `x="${x[1]}"`) : `${a} x="${x[1]}"`;
      lines.push(`<text${a}>‏${t[2]}</text>`);
    }
    return lines.join("\n");
  });
  return s.replace(/(<text\b[^>]*>)(?!‏)/g, "$1‏");
}

let ready: Promise<Uint8Array[]> | null = null;
function init(): Promise<Uint8Array[]> {
  ready ??= (async () => {
    const require = createRequire(import.meta.url);
    await initWasm(fs.readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
    return COVER_FONT_FILES.map((f) => new Uint8Array(fs.readFileSync(path.join(FONT_DIR, f))));
  })();
  return ready;
}

export async function rasterizeCover(svg: string): Promise<{ png: Buffer; webp: Buffer }> {
  const fontBuffers = await init();
  const resvg = new Resvg(normalizeRtlCover(svg), {
    fitTo: { mode: "width", value: ARTICLE_COVER_SIZE.width },
    font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Estedad" },
  });
  const rendered = resvg.render();
  if (rendered.width !== ARTICLE_COVER_SIZE.width || rendered.height !== ARTICLE_COVER_SIZE.height) throw new Error(`cover renders at ${rendered.width}×${rendered.height}, expected ${ARTICLE_COVER_SIZE.width}×${ARTICLE_COVER_SIZE.height}`);
  const png = Buffer.from(rendered.asPng());
  rendered.free();
  resvg.free();
  const webp = await sharp(png).webp({ quality: 82, effort: 6 }).toBuffer();
  return { png, webp };
}
