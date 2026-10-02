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
export function placeLocale404s(dir: string, locales: readonly string[], defaultLocale: string): void {
  for (const locale of locales) {
    const source = path.join(dir, locale, "static-404.html");
    if (!fs.existsSync(source)) throw new Error(`static-404 page missing for ${locale}`);
    const target = locale === defaultLocale ? path.join(dir, "404.html") : path.join(dir, locale, "404.html");
    fs.rmSync(target, { force: true });
    fs.renameSync(source, target);
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
