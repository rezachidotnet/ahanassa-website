import { sparklineGeometry, type DailyPoint } from "@/lib/pricing/price-history";
import { PRICE_SPARKLINE_ATTRIBUTE, PRICE_TREND_COPY } from "@/lib/pricing/product-page-price";

/**
 * W9.6 — the product page's 30-day price trend: an inline SVG, no chart dependency. Server-rendered,
 * no JavaScript. `series` must already have passed `sparklineSeries` (≥ 7 daily points); the caller
 * renders nothing otherwise. fa only (ar shows the price only). No amounts or dates as text: the
 * current price and its change are in the block above; the line only shows the shape of 30 days.
 * Neutral colours (the brand is a procurement partner, not a price board).
 */
export function PriceSparkline({ series, currentDay }: { series: readonly DailyPoint[]; currentDay: string }) {
  const g = sparklineGeometry(series, currentDay);
  return (
    <figure {...{ [PRICE_SPARKLINE_ATTRIBUTE]: String(series.length) }} className="grid gap-1.5">
      <figcaption className="text-tertiary text-xs font-semibold">{PRICE_TREND_COPY.fa}</figcaption>
      {/* SVG x always runs left to right (old → new), whatever the page direction. */}
      <svg viewBox={`0 0 ${g.width} ${g.height}`} width="100%" height={g.height} preserveAspectRatio="none" role="img" aria-label={PRICE_TREND_COPY.fa} className="text-navy block overflow-visible">
        <line x1="0" x2={g.width} y1={g.height - 0.5} y2={g.height - 0.5} stroke="var(--aa-color-neutral-100)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={g.path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {/* End marker = the current price: a zero-length round-capped stroke stays a circle under preserveAspectRatio="none". */}
        <path d={`M${g.end.x} ${g.end.y} L${g.end.x} ${g.end.y}`} stroke="currentColor" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );
}
