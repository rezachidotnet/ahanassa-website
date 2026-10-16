import { lineGeometry, type LinePoint } from "@/lib/charts/line-geometry";
import { PRICE_LINE_ATTRIBUTE } from "@/lib/pricing/price-charts";

/**
 * W18.2 — an inline-SVG line over a date domain (lib/charts/line-geometry.ts): the chart pages, the decision block's
 * mini trend and the indicator charts. Server-rendered, no chart dependency, fixed aspect ratio (no layout shift). x
 * always runs old → new, left to right, whatever the page direction. No text inside the SVG: values and dates are
 * HTML around it (and in the data table).
 */
export function PriceLineSvg({ points, from, to, label, width = 640, height = 200, mark = true, className }: { points: readonly LinePoint[]; from: string; to: string; label: string; width?: number; height?: number; mark?: boolean; className?: string }) {
  const g = lineGeometry(points, from, to, width, height);
  return (
    <svg {...(mark ? { [PRICE_LINE_ATTRIBUTE]: String(points.length) } : {})} viewBox={`0 0 ${g.width} ${g.height}`} width="100%" preserveAspectRatio="none" role="img" aria-label={label} className={className ?? "text-navy block h-auto w-full overflow-visible"} style={{ aspectRatio: `${g.width} / ${g.height}` }}>
      <line x1="0" x2={g.width} y1={g.min} y2={g.min} stroke="var(--aa-color-neutral-100)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2={g.width} y1={g.max} y2={g.max} stroke="var(--aa-color-neutral-100)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={g.path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* End marker = the newest value: a zero-length round-capped stroke stays a circle under preserveAspectRatio="none". */}
      <path d={`M${g.end.x} ${g.end.y} L${g.end.x} ${g.end.y}`} stroke="currentColor" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
