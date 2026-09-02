import localFont from "next/font/local";

/**
 * Self-hosted Estedad Variable (OFL-1.1) — the Typography implementation's
 * chosen family for all three locales (fa/en/ar), per
 * docs/TYPOGRAPHY_ESTEDAD_IMPLEMENTATION.md. Single variable WOFF2
 * (lib/fonts/assets/Estedad-Variable.woff2, 125,304 bytes, confirmed
 * OFL-1.1 — see lib/fonts/assets/OFL.txt — confirmed Persian/Arabic/Latin
 * glyph coverage via fontTools). Deliberately kept OUTSIDE `public/` —
 * `next/font/local` copies/hashes it into the build's own static-asset
 * pipeline itself; a source copy under `public/` would additionally be
 * served verbatim at its literal path, shipping the ~125KB file twice.
 *
 * `weight: "100 900"` exposes the full variable range so individual
 * component `font-weight` values (400/500/600/700/800 already used
 * throughout the design system, styles/tokens.css) resolve to real
 * variable-font instances rather than a synthesized bold.
 */
export const estedad = localFont({
  src: "./assets/Estedad-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-ahan-asa",
});
