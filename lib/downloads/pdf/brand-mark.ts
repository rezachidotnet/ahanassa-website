/**
 * The brand mark polygons for the PDFs: the same points as components/layout/brand-mark.tsx (traced from
 * logo/AhanAsa logo-13.jpg, W10.2/W10.4). That file is TSX (not loadable by the build's node tooling), so the
 * points are repeated here and lib/downloads/downloads-w172.test.ts fails if the two ever differ.
 */
export const BRAND_MARK_VIEWBOX = [5, 15, 90, 70] as const;
export const BRAND_MARK_NAVY_POINTS = "40.41,15 59.59,15 95,69.52 95,85 79,85 79,73.74 50,29.09 21,73.74 21,85 5,85 5,69.52";
export const BRAND_MARK_COPPER_POINTS = "50,53.69 63.49,73.63 50,84.93 36.51,73.63";
