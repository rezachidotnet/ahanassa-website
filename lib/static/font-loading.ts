import { ESTEDAD_FALLBACK_FAMILIES } from "../fonts/estedad-fallback.ts";
import { hasFontPreload } from "./postprocess.ts";

/**
 * Gate (W25.3, owner decision D-W253-FONT — supersedes FONT_STRATEGY §8.2 "preload exactly one WOFF2"):
 * - no page preloads a font;
 * - every page's Estedad font stack names the metric-matched fallback families;
 * - the stylesheet declares every fallback face with size-adjust and ascent/descent/line-gap overrides.
 */
export function checkFontLoading(htmlPaths: string[], cssPaths: string[], read: (p: string) => string): string[] {
  const failures: string[] = [];
  for (const p of htmlPaths) {
    const html = read(p);
    if (hasFontPreload(html)) failures.push(`${p}: preloads a font (W25.3: Estedad loads after the page's own resources)`);
    const stack = /--font-ahan-asa:\s*([^;}]+)/.exec(html)?.[1];
    if (stack) {
      const missing = ESTEDAD_FALLBACK_FAMILIES.filter((f) => !stack.includes(f.family)).map((f) => f.family);
      if (missing.length) failures.push(`${p}: font stack lacks the fallback famil${missing.length > 1 ? "ies" : "y"} ${missing.join(", ")}`);
    }
  }
  const faces = cssPaths.flatMap((p) => [...read(p).matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]));
  for (const fam of ESTEDAD_FALLBACK_FAMILIES) {
    const own = faces.filter((f) => /font-family:\s*["']?([^;"']+)/.exec(f)?.[1]?.trim() === fam.family);
    const complete = own.filter((f) => ["size-adjust", "ascent-override", "descent-override", "line-gap-override", "unicode-range", "local("].every((k) => f.includes(k)));
    if (complete.length !== fam.faces.length) failures.push(`stylesheet: ${complete.length}/${fam.faces.length} complete @font-face rules for "${fam.family}" (size-adjust, ascent/descent/line-gap overrides, unicode-range, local())`);
  }
  return failures;
}
