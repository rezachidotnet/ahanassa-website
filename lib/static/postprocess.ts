import fs from "node:fs";
import path from "node:path";

/**
 * File-layout steps of the static export (architecture V1.1 appendix D).
 * Pure filesystem operations on the vinext export output, unit-tested with
 * temporary directories.
 */

/** Build metadata vinext writes next to the export that no page references. */
export const UNREFERENCED_BUILD_FILES = ["vinext-client-entry-manifest.json"] as const;

/** V8 / A1: no .rsc payloads, no .vite metadata, no unreferenced build metadata in the published output. */
export function removeUnpublishedOutputs(dir: string): string[] {
  const removed: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && e.name === ".vite") {
        fs.rmSync(p, { recursive: true, force: true });
        removed.push(path.relative(dir, p));
      } else if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".rsc") || (d === dir && (UNREFERENCED_BUILD_FILES as readonly string[]).includes(e.name))) {
        fs.rmSync(p);
        removed.push(path.relative(dir, p));
      }
    }
  };
  walk(dir);
  return removed;
}

/** V4: the build-only `static-404` page of each locale becomes that locale's 404.html (fa at the root). */
/**
 * The build-only `/<locale>/static-404` route is never served, but the 404 page's language switcher
 * links to "the same page" in each locale, i.e. that route (W4 link check). Point those links (also in
 * the inline RSC payload) at each locale's home page instead.
 */
export function rewriteStatic404Links(html: string, locales: readonly string[], defaultLocale: string): string {
  // Only quoted URL values (attributes, and \"…\" inside the inline RSC payload).
  return html.replace(/(["'])(\/[a-z]{2})?\/static-404(?=\\?["'])/g, (match, quote: string, prefix: string | undefined) => {
    const locale = prefix?.slice(1) ?? defaultLocale;
    if (!locales.includes(locale)) return match;
    return `${quote}${locale === defaultLocale ? "/" : `/${locale}`}`;
  });
}

export function placeLocale404s(dir: string, locales: readonly string[], defaultLocale: string): void {
  for (const locale of locales) {
    const source = path.join(dir, locale, "static-404.html");
    if (!fs.existsSync(source)) throw new Error(`static-404 page missing for ${locale}`);
    const target = locale === defaultLocale ? path.join(dir, "404.html") : path.join(dir, locale, "404.html");
    fs.rmSync(target, { force: true });
    fs.writeFileSync(target, rewriteStatic404Links(fs.readFileSync(source, "utf8"), locales, defaultLocale));
    fs.rmSync(source);
    fs.rmSync(path.join(dir, locale, "static-404"), { recursive: true, force: true });
  }
}

/** fa has no visible prefix: `<dir>/fa.html` -> `index.html`, `<dir>/fa/*` -> `<dir>/*`. */
export function moveDefaultLocaleToRoot(dir: string, defaultLocale: string): void {
  const home = path.join(dir, `${defaultLocale}.html`);
  if (fs.existsSync(home)) fs.renameSync(home, path.join(dir, "index.html"));
  const localeDir = path.join(dir, defaultLocale);
  if (!fs.existsSync(localeDir)) return;
  for (const entry of fs.readdirSync(localeDir)) {
    const target = path.join(dir, entry);
    if (fs.existsSync(target)) {
      if (fs.statSync(target).isDirectory() && fs.statSync(path.join(localeDir, entry)).isDirectory()) {
        // merge directories (e.g. fa/products into an existing products/ is not expected, but never overwrite silently)
        throw new Error(`refusing to merge ${entry}: target already exists`);
      }
      throw new Error(`refusing to overwrite ${entry} while moving ${defaultLocale} to the root`);
    }
    fs.renameSync(path.join(localeDir, entry), target);
  }
  fs.rmdirSync(localeDir);
}

/**
 * W25.2: React emits the page's bootstrap module (vinext's client entry, `<script type="module" … id="_R_">`)
 * as `<link rel="modulepreload" fetchPriority="low">` so it never competes with an LCP image. On this site that
 * module is what hydrates the page, and on a saturated 3G link it was fetched LAST — behind the font and every
 * other chunk — so the /contact form became usable ~2 s later than its bytes allowed (W25.2 report). The
 * attribute is dropped, giving the entry the same (default, high) priority as the other modulepreloads.
 * Only the bootstrap's own preload changes; every other tag is left exactly as rendered.
 */
export function raiseBootstrapModulePriority(html: string): string {
  const entry = /<script type="module" src="([^"]+)" id="_R_" async="">/.exec(html)?.[1];
  if (!entry) return html;
  return html.replace(`<link rel="modulepreload" fetchPriority="low" href="${entry}"/>`, `<link rel="modulepreload" href="${entry}"/>`);
}

/** Applies `raiseBootstrapModulePriority` to every HTML file of the export; returns how many changed. */
export function raiseBootstrapModulePriorityInDir(dir: string): number {
  let changed = 0;
  for (const rel of fs.readdirSync(dir, { recursive: true, encoding: "utf8" })) {
    if (!rel.endsWith(".html")) continue;
    const file = path.join(dir, rel);
    const html = fs.readFileSync(file, "utf8");
    const next = raiseBootstrapModulePriority(html);
    if (next !== html) {
      fs.writeFileSync(file, next);
      changed++;
    }
  }
  return changed;
}

/** Gate (W25.2): true when the page's bootstrap module is still preloaded at low priority — also when React/vinext change the tag and the rewrite above stops matching. */
export function bootstrapModuleIsLowPriority(html: string): boolean {
  const entry = /<script\b[^>]*\bsrc="([^"]+)"[^>]*\bid="_R_"/.exec(html)?.[1] ?? /<script\b[^>]*\bid="_R_"[^>]*\bsrc="([^"]+)"/.exec(html)?.[1];
  if (!entry) return false;
  return [...html.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*>/gi)].some((m) => m[0].includes(`href="${entry}"`) && /fetchpriority="low"/i.test(m[0]));
}
