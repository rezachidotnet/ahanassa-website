/**
 * W44 (owner D-W44-BRAND, 2026-10-24; PROJECT_OVERRIDES.md §18): the Latin brand is «Ahan Assa». The legacy
 * spelling «Ahan Asa» (and «AhanAsa», «Ahan-Asa», upper case) may appear in the build only as a JSON-LD
 * `alternateName` — never in visible copy, titles, meta, manifests, agent texts or drawings. PDFs (compressed
 * streams, glyph-encoded text) are covered by the source scan in lib/static/brand-name-w44.test.ts instead.
 *
 * File names and identifiers (`ahan-asa-mark.jpg`, `--font-ahan-asa`) are lower case and hyphenated, so they
 * are not the brand and do not match.
 */

/** The legacy Latin brand: capitalised words, optional space or hyphen, not followed by the second «s». */
export const LEGACY_LATIN_BRAND = /\b(?:Ahan[ -]?Asa(?!s)|AHAN[ -]?ASA(?!S))\b/g;

/** Public files whose text is shown to a person or an agent. */
export const BRAND_SCANNED_FILE = /\.(html|md|txt|json|webmanifest|xml|svg|dxf)$/;

/**
 * A JSON-LD `alternateName` (a string or an array of strings), plain or escaped once more inside the RSC
 * payload (`\"alternateName\":[\"…\"]`). Removed before the scan: the one place the legacy spelling belongs.
 */
const ALTERNATE_NAME = /\\*"alternateName\\*"\s*:\s*(?:\[[^\]]*\]|\\*"(?:[^"\\]|\\(?!"))*\\*")/g;

export interface BrandNameFinding {
  file: string;
  match: string;
}

export function scanBrandName(files: readonly { path: string; content: string }[]): BrandNameFinding[] {
  const out: BrandNameFinding[] = [];
  for (const f of files) {
    if (!BRAND_SCANNED_FILE.test(f.path)) continue;
    const text = f.content.replace(ALTERNATE_NAME, "");
    for (const m of text.matchAll(LEGACY_LATIN_BRAND)) {
      const at = m.index ?? 0;
      out.push({ file: f.path, match: text.slice(Math.max(0, at - 40), at + m[0].length + 40).replace(/\s+/g, " ") });
    }
  }
  return out;
}

export function checkBrandName(files: readonly { path: string; content: string }[]): string[] {
  return scanBrandName(files).map((f) => `brand: legacy Latin name «Ahan Asa» in ${f.file} (only a JSON-LD alternateName may carry it; PROJECT_OVERRIDES.md §18): …${f.match}…`);
}
