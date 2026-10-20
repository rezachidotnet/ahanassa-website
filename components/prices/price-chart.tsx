import { formatTomanAmount } from "@/lib/pricing/product-page-price";
import { chartDayLabel, chartWindowStart, PRICE_CHART_ATTRIBUTE, PRICE_CHART_COPY, PRICE_DECISION_COPY } from "@/lib/pricing/price-charts";
import { windowPoints } from "@/lib/pricing/price-position";
import type { DailyPoint } from "@/lib/pricing/price-history";
import { TrackOnView } from "@/components/analytics/track-on-view";
import { ChartRangeToggle } from "./chart-range-toggle";
import { PriceLineSvg } from "./price-line-svg";

const WINDOWS = [30, 90] as const;
const HEAD = "border-border text-muted-foreground border-b bg-surface px-4 py-3 text-start text-xs font-bold whitespace-nowrap";
const CELL = "border-b border-[var(--aa-color-neutral-100)] px-4 py-2.5";

/**
 * W18.2 — a fa chart page's chart and data table: Ahan Asa's published daily price of the product's reference size,
 * 30 or 90 days (both server-rendered; the radio switch picks one with CSS, so the chart works without JavaScript and
 * never shifts), the lowest/highest of the shown window, and every day's price in a table (newest first).
 *
 * `data-aa-price-chart="<CVAR>"`: the publication gate checks every amount, date and line against the snapshot
 * (price gate rule 9). chart_view on load; chart_range_change on a switch.
 */
export function PriceChart({ xid, slug, product, series, currentDay }: { xid: string; slug: string; product: string; series: readonly DailyPoint[]; currentDay: string }) {
  const t = PRICE_CHART_COPY;
  const amount = (n: number) => formatTomanAmount("fa", n);
  const windows = WINDOWS.map((days) => ({ days, points: windowPoints(series, currentDay, days) })).filter((w) => w.points.length >= 2);
  // The 30-day view only when it differs from the 90-day one (older days exist).
  const shown = windows.length === 2 && windows[0].points.length === windows[1].points.length ? [windows[1]] : windows;
  const toggle = shown.length === 2;
  const table = [...(windows[windows.length - 1]?.points ?? series)].reverse();
  return (
    <div {...{ [PRICE_CHART_ATTRIBUTE]: xid }} {...(toggle ? { "data-chart-range-root": "" } : {})} className="grid gap-6">
      <TrackOnView event="chart_view" params={{ chart_type: "product_price", product_slug: slug }} />
      {toggle && <ChartRangeToggle legend={t.range} options={shown.map((w) => ({ days: w.days, label: t.rangeDays(w.days) }))} defaultDays={90} productSlug={slug} />}
      {shown.map((w) => {
        const prices = w.points.map((p) => p.price);
        return (
          <figure key={w.days} {...(toggle ? { "data-chart-window": String(w.days) } : {})} className="border-border bg-background grid gap-2 rounded-[var(--aa-radius-card)] border p-4">
            <figcaption className="text-tertiary text-xs font-semibold">{t.chartLabel(product, w.days)}</figcaption>
            <p className="text-muted-foreground flex justify-between text-xs">
              <span>
                {PRICE_DECISION_COPY.max}: <span className="text-neutral-700 font-semibold">{amount(Math.max(...prices))}</span>
              </span>
              <span>{PRICE_DECISION_COPY.unit}</span>
            </p>
            <PriceLineSvg points={w.points.map((p) => ({ date: p.day, value: p.price }))} from={chartWindowStart(currentDay, w.days)} to={currentDay} label={t.chartLabel(product, w.days)} />
            <p className="text-muted-foreground text-xs">
              {PRICE_DECISION_COPY.min}: <span className="text-neutral-700 font-semibold">{amount(Math.min(...prices))}</span>
            </p>
            {/* Same direction as the line: oldest at the left, newest at the right. */}
            <p dir="ltr" className="text-muted-foreground flex justify-between text-xs">
              <span dir="rtl">{chartDayLabel(w.points[0].day)}</span>
              <span dir="rtl">{chartDayLabel(w.points[w.points.length - 1].day)}</span>
            </p>
          </figure>
        );
      })}
      <div className="grid gap-3">
        <h2 id="price-table-title" className="text-navy text-lg font-bold">
          {t.tableTitle}
        </h2>
        <div role="region" aria-labelledby="price-table-title" tabIndex={0} className="border-border bg-background relative max-h-[28rem] overflow-y-auto rounded-[var(--aa-radius-card)] border">
          <table className="text-ui w-full border-separate border-spacing-0 text-start">
            <caption className="sr-only">{t.tableCaption(product)}</caption>
            <thead className="sticky top-0">
              <tr>
                <th scope="col" className={HEAD}>
                  {t.tableDate}
                </th>
                <th scope="col" className={HEAD}>
                  {t.tableValue}
                </th>
              </tr>
            </thead>
            <tbody>
              {table.map((p) => (
                <tr key={p.day}>
                  <th scope="row" className={`${CELL} text-neutral-700 text-start font-semibold`}>
                    <time dateTime={p.day}>{chartDayLabel(p.day)}</time>
                  </th>
                  <td className={`${CELL} text-navy font-bold`}>{amount(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
