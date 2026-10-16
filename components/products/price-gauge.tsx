import { formatTomanAmount } from "@/lib/pricing/product-page-price";
import { PRICE_DECISION_COPY } from "@/lib/pricing/price-charts";
import type { WindowStats } from "@/lib/pricing/price-position";

/**
 * W18.2 — the price-position gauge: per window (30, 90 days) where today's published price sits between the
 * window's lowest and highest, with its word (ارزان / متوسط / گران) and the lowest / average / highest. Neutral colours
 * (a position is a signal about the past, not advice). The bar runs from the lowest (inline start) to the highest; the
 * marker sits at today's price. Server-rendered, fixed height (no layout shift).
 */
export function PriceGauge({ windows }: { windows: readonly WindowStats[] }) {
  const t = PRICE_DECISION_COPY;
  const amount = (n: number) => formatTomanAmount("fa", n);
  return (
    <div className="grid gap-5">
      {windows.map((w) => {
        const label = `${t.window(w.window)}: ${t.position[w.position]} — ${t.today} ${amount(w.today)}، ${t.min} ${amount(w.min)}، ${t.avg} ${amount(w.avg)}، ${t.max} ${amount(w.max)} ${t.unit}`;
        return (
          <div key={w.window} className="grid gap-2">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-neutral-700">{t.window(w.window)}</span>
              <span className="text-navy font-extrabold">{t.position[w.position]}</span>
            </p>
            <div role="img" aria-label={label} className="relative h-3">
              <div className="absolute inset-x-0 top-1 grid h-1.5 grid-cols-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                <span className="bg-[var(--aa-color-neutral-100)]" />
                <span className="bg-[var(--aa-color-neutral-200)]" />
                <span className="bg-[var(--aa-color-neutral-300)]" />
              </div>
              <span aria-hidden="true" className="bg-navy ring-background absolute top-0 size-3 rounded-full ring-2" style={{ insetInlineStart: `calc(${(w.fraction * 100).toFixed(1)}% - 6px)` }} />
            </div>
            <dl className="text-muted-foreground grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt>{t.min}</dt>
                <dd className="text-neutral-700 font-semibold">{amount(w.min)}</dd>
              </div>
              <div className="text-center">
                <dt>{t.avg}</dt>
                <dd className="text-neutral-700 font-semibold">{amount(w.avg)}</dd>
              </div>
              <div className="text-end">
                <dt>{t.max}</dt>
                <dd className="text-neutral-700 font-semibold">{amount(w.max)}</dd>
              </div>
            </dl>
          </div>
        );
      })}
      <p className="text-tertiary text-xs">
        {t.today}: <span className="text-neutral-700 font-semibold">{amount(windows[0].today)}</span> {t.unit}
      </p>
    </div>
  );
}
