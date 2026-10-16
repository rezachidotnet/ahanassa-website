import { ButtonLink } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/surface-variants";
import { TrackWhenVisible } from "@/components/analytics/track-when-visible";
import { DriversLine } from "@/components/indicators/drivers-line";
import { PriceLineSvg } from "@/components/prices/price-line-svg";
import { CHART_RFQ_ATTRIBUTE, CHART_SLUG_ATTRIBUTE, PRICE_DECISION_COPY, PRICE_GAUGE_ATTRIBUTE } from "@/lib/pricing/price-charts";
import type { WindowStats } from "@/lib/pricing/price-position";
import type { DailyPoint } from "@/lib/pricing/price-history";
import type { Indicator } from "@/lib/indicators/presentation";
import { PriceGauge } from "./price-gauge";

/**
 * W18.2 — the fa product page's decision block, under the price block: the price-position gauge (today vs the last
 * 30/90 days of Ahan Asa's own published prices), a mini 90-day trend (when the history reaches past 30 days; the
 * price block above already draws 30), ONE drivers line of the market indicators, and «قیمت قطعی برای حجم شما» →
 * the RFQ form prefilled (variant + factory). A link to the product's full chart page when it has one.
 *
 * `data-aa-price-gauge="<CVAR>"`: the publication gate recomputes every number in it from the snapshot (price gate
 * rule 9). Rendered only with ≥ 1 window (lib/pricing/price-position.ts); otherwise the page has no decision block.
 */
export function PriceDecision({ xid, slug, windows, trend, indicators, rfqHref, chartHref, ctaLocation = "gauge" }: { xid: string; slug: string; windows: readonly WindowStats[]; trend: { series: readonly DailyPoint[]; from: string; to: string; days: number } | null; indicators: readonly Indicator[]; rfqHref: string; chartHref: string | null; ctaLocation?: "gauge" | "chart_page" }) {
  if (windows.length === 0) return null;
  const t = PRICE_DECISION_COPY;
  const longest = windows[windows.length - 1];
  return (
    <section aria-labelledby="price-decision-title" {...{ [PRICE_GAUGE_ATTRIBUTE]: xid }} className={cardVariants({ className: "overflow-hidden shadow-[var(--aa-shadow-sm)]" })}>
      <div className="border-border bg-cream border-b px-5 py-4">
        <h2 id="price-decision-title" className="text-navy text-sm font-bold">
          {t.title}
        </h2>
      </div>
      <div className="grid gap-5 p-5">
        <PriceGauge windows={windows} />
        {trend && (
          <figure className="grid gap-1.5">
            <figcaption className="text-tertiary text-xs font-semibold">{t.trend(trend.days)}</figcaption>
            <PriceLineSvg points={trend.series.map((p) => ({ date: p.day, value: p.price }))} from={trend.from} to={trend.to} label={t.trend(trend.days)} width={240} height={48} />
          </figure>
        )}
        <p className="bg-surface text-neutral-700 rounded-[var(--aa-radius-control)] px-4 py-3 text-xs leading-relaxed">{t.note}</p>
        <DriversLine indicators={indicators} />
        <div {...{ [CHART_RFQ_ATTRIBUTE]: ctaLocation, [CHART_SLUG_ATTRIBUTE]: slug }} className="grid gap-2">
          <ButtonLink href={rfqHref} variant="primary" className="w-full">
            {t.cta}
          </ButtonLink>
          {chartHref && (
            <ButtonLink href={chartHref} variant="link" className="justify-self-center">
              {t.chartLink}
            </ButtonLink>
          )}
        </div>
        <TrackWhenVisible event="gauge_view" params={{ gauge_position: longest.position, gauge_window: String(longest.window), product_slug: slug }} />
      </div>
    </section>
  );
}
