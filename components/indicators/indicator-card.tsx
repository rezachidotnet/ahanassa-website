import type { Locale } from "@/config/locales";
import { badgeVariants, cardVariants } from "@/components/ui/surface-variants";
import { INDICATOR_ATTRIBUTE, INDICATOR_COPY, presentIndicator, type Indicator } from "@/lib/indicators/presentation";
import { cn } from "@/lib/utils";
import Link from "@/components/ui/link";

/**
 * W18.2 — one market indicator as a card: name, the «شاخص مرجع — نه قیمت فروش آهن آسا» label, the last value and
 * unit, the change against the previous value, the date (data month for a monthly series) and the linked source.
 * Server-rendered, no JavaScript, neutral colours (never green/red). The `data-aa-indicator` mark lets the gate check
 * the label, the source and the date are there (lib/static/indicator-gate.ts).
 *
 * `href` (W18.3, en/ar): the whole card links there — the name is the link, stretched over the card, so no text is
 * added (the gate's allow-list stays the indicator's own texts); the source link sits above it and keeps its target.
 */
export function IndicatorCard({ locale, indicator, href, className }: { locale: Locale; indicator: Indicator; href?: string; className?: string }) {
  const t = INDICATOR_COPY[locale];
  const v = presentIndicator(locale, indicator);
  return (
    <div {...{ [INDICATOR_ATTRIBUTE]: v.code }} className={cn(cardVariants({ variant: href ? "interactive" : "card" }), "flex h-full flex-col p-4", href && "relative", className)}>
      <p className="text-navy text-sm leading-snug font-bold">
        {href ? (
          <Link href={href} className="hover:text-copper after:absolute after:inset-0 after:rounded-[var(--aa-radius-card)] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--aa-color-focus-ring)]">
            {v.name}
          </Link>
        ) : (
          v.name
        )}
      </p>
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
        <a href={v.sourceHref} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-navy relative z-10 underline underline-offset-2">
          {v.source}
        </a>
      </p>
    </div>
  );
}
