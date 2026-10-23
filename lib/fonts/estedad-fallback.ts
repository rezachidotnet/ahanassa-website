/**
 * W25.3 (owner decision D-W253-FONT, 2026-10-21): Estedad stays preloaded with `font-display: swap`, so on a
 * slow network text first paints in a fallback font and Estedad swaps in later. These are the fallback faces
 * that keep that swap small: one family per platform, each face a local system font scaled (`size-adjust`) to Estedad's
 * measured width, with Estedad's own ascent/descent, so line boxes and line breaks barely move when it swaps.
 *
 * Each face's `unicode-range` is limited to characters Estedad itself has, so once Estedad has loaded every
 * character it covers renders in Estedad exactly as before, and the ones it lacks still fall through to the
 * same generic `sans-serif` as before — the final look is unchanged.
 *
 * Values are measured, never guessed (01-sources/FONT_STRATEGY.md §9.2): `scripts/fonts/estedad-fallback-metrics.ts`
 * renders the site's own fa/ar/en text in Chrome with Estedad and with each fallback font and writes
 * `lib/fonts/estedad-fallback-metrics.json` (the evidence) and `styles/estedad-fallback.css` (rendered by
 * `renderFallbackCss` below; a test keeps the two in sync).
 */

export type FallbackScript = "arabic" | "latin";
export type FallbackWeight = "regular" | "bold";

export interface FallbackFace {
  script: FallbackScript;
  weight: FallbackWeight;
  /** `local()` names, full name first, then PostScript name. */
  local: string[];
}

export interface FallbackFamily {
  family: string;
  /** Where it is the system font — documentation only. */
  platform: string;
  faces: FallbackFace[];
}

/** In font-family order: the first family whose local font exists for a character renders it. */
export const ESTEDAD_FALLBACK_FAMILIES: FallbackFamily[] = [
  {
    family: "Estedad Fallback Tahoma",
    platform: "Windows, macOS (Tahoma); Windows, macOS, iOS (Arial)",
    faces: [
      { script: "arabic", weight: "regular", local: ["Tahoma"] },
      { script: "arabic", weight: "bold", local: ["Tahoma Bold", "Tahoma-Bold"] },
      { script: "latin", weight: "regular", local: ["Arial", "ArialMT"] },
      { script: "latin", weight: "bold", local: ["Arial Bold", "Arial-BoldMT"] },
    ],
  },
  {
    family: "Estedad Fallback Apple",
    platform: "iOS, macOS (Geeza Pro, Helvetica)",
    faces: [
      { script: "arabic", weight: "regular", local: ["Geeza Pro Regular", "GeezaPro"] },
      { script: "arabic", weight: "bold", local: ["Geeza Pro Bold", "GeezaPro-Bold"] },
      { script: "latin", weight: "regular", local: ["Helvetica"] },
      { script: "latin", weight: "bold", local: ["Helvetica Bold", "Helvetica-Bold"] },
    ],
  },
  {
    family: "Estedad Fallback Android",
    platform: "Android (Noto Naskh Arabic UI, Roboto)",
    faces: [
      { script: "arabic", weight: "regular", local: ["Noto Naskh Arabic UI", "NotoNaskhArabicUI-Regular"] },
      { script: "arabic", weight: "bold", local: ["Noto Naskh Arabic UI Bold", "NotoNaskhArabicUI-Bold"] },
      { script: "latin", weight: "regular", local: ["Roboto", "Roboto-Regular"] },
      { script: "latin", weight: "bold", local: ["Roboto Bold", "Roboto-Bold"] },
    ],
  },
];

/** The font-family list after Estedad: the fallback families, then the generic family Estedad always fell back to. */
export const ESTEDAD_FALLBACK_STACK = [...ESTEDAD_FALLBACK_FAMILIES.map((f) => f.family), "sans-serif"];

/** Weight ranges of the two faces: the site uses 400–800; the fallback fonts have a regular and a bold. */
export const FALLBACK_WEIGHT_RANGE: Record<FallbackWeight, string> = { regular: "100 549", bold: "550 900" };
/** The weight each face is measured at. */
export const FALLBACK_MEASURE_WEIGHT: Record<FallbackWeight, number> = { regular: 400, bold: 700 };

const ARABIC_BLOCKS: [number, number][] = [
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0x0870, 0x08ff],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];
export const isArabicScript = (cp: number) => ARABIC_BLOCKS.some(([a, b]) => cp >= a && cp <= b);

/** `U+0600-06FF, U+200C`-style ranges for a set of code points. */
export function unicodeRanges(codePoints: number[]): string {
  const cps = [...new Set(codePoints)].sort((a, b) => a - b);
  const out: string[] = [];
  const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");
  for (let i = 0; i < cps.length; ) {
    let j = i;
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++;
    out.push(i === j ? `U+${hex(cps[i])}` : `U+${hex(cps[i])}-${hex(cps[j])}`);
    i = j + 1;
  }
  return out.join(", ");
}

export interface EstedadFallbackMetrics {
  schema: "estedad-fallback-metrics.v1";
  /** The exact active font file the values were measured against, and its SHA-256. */
  font: { file: string; sha256: string; unitsPerEm: number; ascent: number; descent: number; lineGap: number };
  /** Estedad's cmap split into the two scripts (unicode-range syntax). */
  ranges: Record<FallbackScript, string>;
  measured: { date: string; browser: string; pages: string[]; words: Record<FallbackScript, number> };
  /** size-adjust per family / script / weight, as a ratio (Estedad width ÷ fallback width). */
  sizeAdjust: Record<string, Record<FallbackScript, Record<FallbackWeight, number>>>;
}

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

/** The @font-face rules for `styles/estedad-fallback.css`. */
export function renderFallbackCss(m: EstedadFallbackMetrics): string {
  const lines = [
    "/* GENERATED by scripts/fonts/estedad-fallback-metrics.ts from lib/fonts/estedad-fallback-metrics.json — do not edit. */",
    "/* W25.3: metric-matched local fallbacks for Estedad (lib/fonts/estedad-fallback.ts). */",
  ];
  for (const fam of ESTEDAD_FALLBACK_FAMILIES) {
    for (const face of fam.faces) {
      const s = m.sizeAdjust[fam.family][face.script][face.weight];
      lines.push(
        "@font-face {",
        `  font-family: "${fam.family}";`,
        `  src: ${face.local.filter((n, i, a) => a.indexOf(n) === i).map((n) => `local("${n}")`).join(", ")};`,
        `  font-weight: ${FALLBACK_WEIGHT_RANGE[face.weight]};`,
        "  font-style: normal;",
        `  size-adjust: ${pct(s)};`,
        `  ascent-override: ${pct(m.font.ascent / m.font.unitsPerEm / s)};`,
        `  descent-override: ${pct(Math.abs(m.font.descent) / m.font.unitsPerEm / s)};`,
        `  line-gap-override: ${pct(m.font.lineGap / m.font.unitsPerEm / s)};`,
        `  unicode-range: ${m.ranges[face.script]};`,
        "}",
      );
    }
  }
  return lines.join("\n") + "\n";
}
