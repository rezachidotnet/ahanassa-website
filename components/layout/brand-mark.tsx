/**
 * The Ahan Asa logo mark as inline SVG — the same two polygons and colours
 * W10.2 traced from logo/AhanAsa logo-13.jpg for the favicon (pixel IoU
 * navy 0.994, copper 0.996), with the viewBox cropped to the mark itself
 * (90 × 70). The square JPEG (original: public/_originals/brand/ahan-asa-mark.jpg) carries the
 * mark at only 57% of its width inside white padding, so at the same box
 * size this SVG shows the mark ~1.75× larger (W10.4). Size it by width;
 * the height follows the 9:7 aspect ratio.
 */
export const BRAND_MARK_NAVY = "40.41,15 59.59,15 95,69.52 95,85 79,85 79,73.74 50,29.09 21,73.74 21,85 5,85 5,69.52";
export const BRAND_MARK_COPPER = "50,53.69 63.49,73.63 50,84.93 36.51,73.63";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="5 15 90 70" aria-hidden="true" focusable="false" className={className}>
      <polygon fill="#081A4A" points={BRAND_MARK_NAVY} />
      <polygon fill="#C0572A" points={BRAND_MARK_COPPER} />
    </svg>
  );
}
