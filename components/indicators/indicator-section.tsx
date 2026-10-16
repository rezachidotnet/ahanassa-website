import type { Locale } from "@/config/locales";
import { badgeVariants, cardVariants } from "@/components/ui/surface-variants";
import { PriceLineSvg } from "@/components/prices/price-line-svg";
import { formatIndicatorValue, INDICATOR_ATTRIBUTE, INDICATOR_COPY, indicatorDateLabel, presentIndicator, type Indicator, type IndicatorPoint } from "@/lib/indicators/presentation";


/** The table rows: every value of a monthly series; the last value of each month (and the newest) of a daily one. Newest first. */
export function indicatorTablePoints(indicator: Indicator): IndicatorPoint[] {
  if (indicator.frequency === "monthly") return [...indicator.points].reverse();
  const byMonth = new Map<string, IndicatorPoint>();
  for (const p of indicator.points) byMonth.set(p.date.slice(0, 7), p);
  return [...byMonth.values()].reverse();
}

/**
 * W18.2 — one indicator on the en/ar "Steel market indicators" page: name, the reference label, last value, change,
 * date (data month), a 12-month line (inline SVG, no JavaScript), its values table and the linked source. The
 * `data-aa-indicator` mark: the gate checks the label, the source and the date are in it (lib/static/indicator-gate.ts).
 */
export function IndicatorSection({ locale, indicator }: { locale: Locale; indicator: Indicator }) {
  const t = INDICATOR_COPY[locale];
  const v = presentIndicator(locale, indicator);
  const id = `indicator-${indicator.code.replace(/_/g, "-")}`;
  const points = indicator.points;
  const rows = indicatorTablePoints(indicator);
  return (
    <section aria-labelledby={id} {...{ [INDICATOR_ATTRIBUTE]: v.code }} className={cardVariants({ variant: "panel", className: "grid grid-cols-[minmax(0,1fr)] gap-4" })}>
      <div className="grid gap-2">
        <h2 id={id} className="text-navy text-xl font-extrabold">
          {v.name}
        </h2>
        <p>
          <span className={badgeVariants({ tone: "tag", className: "text-[11px]" })}>{t.reference}</span>
        </p>
      </div>
      <p className="text-navy flex flex-wrap items-baseline gap-x-2 text-[clamp(1.5rem,3vw,2rem)] leading-tight font-extrabold">
        <bdi>{v.value}</bdi>
        <span className="text-muted-foreground text-sm font-semibold">{v.unit.known ? v.unit.text : <bdi dir="ltr">{v.unit.text}</bdi>}</span>
      </p>
      <p className="text-neutral-700 text-sm">
        {v.change && (
          <>
            {v.change.glyph && <span aria-hidden="true">{v.change.glyph} </span>}
          {v.change.word && <span className="sr-only">{v.change.word} </span>}
            <bdi className="font-semibold">{v.change.text}</bdi> {t.vsPrevious} ·{" "}
          </>
        )}
        <time dateTime={v.dateTime}>{v.stamp}</time>
        {v.preliminary && <> · {t.preliminary}</>}
        {v.fallback && <> · {t.fallback}</>}
      </p>
      {points.length >= 2 && (
        <figure className="grid gap-1.5">
          <PriceLineSvg points={points.map((p) => ({ date: p.date, value: p.value }))} from={points[0].date} to={points[points.length - 1].date} label={t.chartLabel(v.name)} mark={false} />
          {/* Same direction as the line: oldest at the left, newest at the right. */}
          <figcaption dir="ltr" className="text-muted-foreground flex justify-between text-xs">
            <span dir={locale === "en" ? "ltr" : "rtl"}>{indicatorDateLabel(locale, indicator.frequency, points[0].date)}</span>
            <span dir={locale === "en" ? "ltr" : "rtl"}>{indicatorDateLabel(locale, indicator.frequency, points[points.length - 1].date)}</span>
          </figcaption>
        </figure>
      )}
      <p className="text-muted-foreground text-xs">{v.monthly ? t.monthlyNote : t.dailyNote}</p>
      <details className="border-border rounded-[var(--aa-radius-control)] border">
        <summary className="text-navy cursor-pointer px-4 py-2.5 text-sm font-bold">
          {t.valuesTitle}
          {!v.monthly && <span className="text-muted-foreground ms-2 text-xs font-normal">({t.monthEnd})</span>}
        </summary>
        <table className="text-ui w-full border-separate border-spacing-0 text-start text-sm">
          <caption className="sr-only">{v.name}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-border text-muted-foreground border-y bg-surface px-4 py-2 text-start text-xs font-bold">
                {v.monthly ? t.dataMonth : t.tableDate}
              </th>
              <th scope="col" className="border-border text-muted-foreground border-y bg-surface px-4 py-2 text-start text-xs font-bold">
                {t.tableValue}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.date}>
                <th scope="row" className="border-b border-[var(--aa-color-neutral-100)] px-4 py-2 text-start font-semibold text-neutral-700">
                  <time dateTime={v.monthly ? p.date.slice(0, 7) : p.date}>{indicatorDateLabel(locale, indicator.frequency, p.date)}</time>
                  {p.preliminary && <span className="text-muted-foreground ms-1 text-xs font-normal">({t.preliminary})</span>}
                </th>
                <td className="border-b border-[var(--aa-color-neutral-100)] px-4 py-2">
                  <bdi>{formatIndicatorValue(locale, indicator.code, p.value)}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="text-muted-foreground text-xs leading-relaxed">
        <a href={v.sourceHref} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-navy underline underline-offset-2">
          {v.source}
        </a>
      </p>
    </section>
  );
}
