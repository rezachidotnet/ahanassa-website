import { ESTEDAD_FALLBACK_FAMILIES } from "../fonts/estedad-fallback.ts";

/** The `href`s of every `<link rel="preload" as="font">` of a page, in any attribute order. */
export function fontPreloadHrefs(html: string): string[] {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => /\brel="preload"/i.test(tag) && /\bas="?font\b/i.test(tag))
    .map((tag) => /\bhref="([^"]*)"/i.exec(tag)?.[1] ?? "");
}

/**
 * Gate (W25.3, owner decision D-W253-FONT as amended 2026-10-21): the font preload of FONT_STRATEGY §8.2 stays,
 * and the metric-matched fallback faces are added.
 * - every page that uses the Estedad stack preloads exactly one font: the WOFF2 its own @font-face loads;
 * - that stack names the fallback families;
 * - the stylesheet declares every fallback face with size-adjust and ascent/descent/line-gap overrides.
 */
export function checkFontLoading(htmlPaths: string[], cssPaths: string[], read: (p: string) => string): string[] {
  const failures: string[] = [];
  for (const p of htmlPaths) {
    const html = read(p);
    const stack = /--font-ahan-asa:\s*([^;}]+)/.exec(html)?.[1];
    if (!stack) continue;
    const missing = ESTEDAD_FALLBACK_FAMILIES.filter((f) => !stack.includes(f.family)).map((f) => f.family);
    if (missing.length) failures.push(`${p}: font stack lacks the fallback famil${missing.length > 1 ? "ies" : "y"} ${missing.join(", ")}`);
    const fontUrl = /@font-face\s*\{[^}]*src:\s*url\(['"]?([^'")]+\.woff2)/.exec(html)?.[1];
    const preloads = fontPreloadHrefs(html);
    if (preloads.length !== 1 || preloads[0] !== fontUrl) failures.push(`${p}: must preload exactly the site font ${fontUrl ?? "(no @font-face found)"} (FONT_STRATEGY §8.2), found ${preloads.length ? preloads.join(", ") : "none"}`);
  }
  const faces = cssPaths.flatMap((p) => [...read(p).matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]));
  for (const fam of ESTEDAD_FALLBACK_FAMILIES) {
    const own = faces.filter((f) => /font-family:\s*["']?([^;"']+)/.exec(f)?.[1]?.trim() === fam.family);
    const complete = own.filter((f) => ["size-adjust", "ascent-override", "descent-override", "line-gap-override", "unicode-range", "local("].every((k) => f.includes(k)));
    if (complete.length !== fam.faces.length) failures.push(`stylesheet: ${complete.length}/${fam.faces.length} complete @font-face rules for "${fam.family}" (size-adjust, ascent/descent/line-gap overrides, unicode-range, local())`);
  }
  return failures;
}
