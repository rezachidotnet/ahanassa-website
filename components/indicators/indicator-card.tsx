import type { Locale } from "@/config/locales";
import { badgeVariants, cardVariants } from "@/components/ui/surface-variants";
import { INDICATOR_ATTRIBUTE, INDICATOR_COPY, presentIndicator, type Indicator } from "@/lib/indicators/presentation";
import { cn } from "@/lib/utils";

/**
 * W18.2 — one market indicator as a card: name, the «شاخص مرجع — نه قیمت فروش آهن آسا» label, the last value and
 * unit, the change against the previous value, the date (data month for a monthly series) and the linked source.
 * Server-rendered, no JavaScript, neutral colours (never green/red). The `data-aa-indicator` mark lets the gate check
 * the label, the source and the date are there (lib/static/indicator-gate.ts).
 */
export function IndicatorCard({ locale, indicator, className }: { locale: Locale; indicator: Indicator; className?: string }) {
  const t = INDICATOR_COPY[locale];
  const v = presentIndicator(locale, indicator);
  return (
    <div {...{ [INDICATOR_ATTRIBUTE]: v.code }} className={cn(cardVariants(), "flex h-full flex-col p-4", className)}>
      <p className="text-navy text-sm leading-snug font-bold">{v.name}</p>
      <p className="mt-2">
        <span className={badgeVariants({ tone: "tag", className: "text-[11px]" })}>{t.reference}</span>
      </p>
      <p className="text-navy mt-3 flex flex-wrap items-baseline gap-x-1.5 text-[21px] font-semibold">
        <bdi>{v.value}</bdi>
        <span className="text-muted-foreground text-[13px] font-medium">{v.unit.known ? v.unit.text : <bdi dir="ltr">{v.unit.text}</bdi>}</span>
      </p>
      {v.change && (
        <p className="text-neutral-700 mt-1 text-xs font-semibold">
          {v.change.glyph && <span aria-hidden="true">{v.change.glyph} </span>}
          {v.change.word && <span className="sr-only">{v.change.word} </span>}
          <bdi>{v.change.text}</bdi> <span className="text-muted-foreground font-normal">{t.vsPrevious}</span>
        </p>
      )}
      <p className="text-muted-foreground mt-2 text-[11px]">
        <time dateTime={v.dateTime}>{v.stamp}</time>
        {v.preliminary && <> · {t.preliminary}</>}
        {v.fallback && <> · {t.fallback}</>}
      </p>
      <p className="text-muted-foreground mt-auto pt-2 text-[11px] leading-relaxed">
        <a href={v.sourceHref} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-navy underline underline-offset-2">
          {v.source}
        </a>
      </p>
    </div>
  );
}
