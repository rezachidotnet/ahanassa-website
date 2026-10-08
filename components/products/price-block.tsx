import { ArrowDown, ArrowUp, Info, Minus } from "lucide-react";
import type { Locale } from "@/config/locales";
import { ButtonLink } from "@/components/ui/button";
import { badgeVariants, cardVariants } from "@/components/ui/surface-variants";
import { presentPriceBlock, PRICE_BLOCK_COPY, type PriceBlockData } from "@/lib/pricing/price-block-presentation";
import { PriceAge } from "./price-age";

/**
 * Product-page Price block (owner decision D-W10-4; W10.0 report §5.6) —
 * built in W10.2 but NOT rendered on any page yet: the pricing data arrives
 * in a later task, which passes a typed `PriceBlockData` (or `null`).
 *
 * Persian pages only (renders nothing for en/ar). `price` missing or
 * incomplete -> the "missing price" variant: «استعلام قیمت» + the RFQ CTA,
 * never an empty value. No source website, no JSON-LD `offers` — the data
 * type carries neither. Change since the previous price is neutral n-700,
 * not red/green.
 */
export function PriceBlock({ locale, price, rfqHref, productName }: { locale: Locale; price: PriceBlockData | null | undefined; rfqHref: string; productName?: string }) {
  const view = presentPriceBlock(locale, price);
  if (!view) return null;
  const t = PRICE_BLOCK_COPY;
  const title = productName ? `${t.title} ${productName}` : t.title;

  return (
    <section aria-label={title} className={cardVariants({ className: "overflow-hidden shadow-[var(--aa-shadow-sm)]" })}>
      <div className="border-border bg-cream border-b px-5 py-4">
        <h2 className="text-navy text-sm font-bold">{title}</h2>
      </div>

      <div className="grid gap-3 p-5">
        {view.kind === "missing" ? (
          <p className="text-navy text-2xl font-extrabold">{t.missing}</p>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-navy text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.1] font-extrabold">{view.amount}</span>
              <span className="text-muted-foreground text-sm font-semibold">{view.unit}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={badgeVariants({ tone: "info" })}>{view.vat}</span>
              {view.change && (
                <span className="text-neutral-700 inline-flex items-center gap-1 text-sm font-semibold">
                  {view.change.direction === "up" ? <ArrowUp className="size-3.5" aria-hidden="true" /> : view.change.direction === "down" ? <ArrowDown className="size-3.5" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
                  {view.change.percent ?? t.unchanged} {view.change.since}
                </span>
              )}
            </div>
            <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-tertiary">{t.factory}</dt>
              <dd className="text-neutral-700 font-semibold">{view.factoryName}</dd>
              <dt className="text-tertiary">{t.delivery}</dt>
              <dd className="text-neutral-700 font-semibold">{view.deliveryLocation}</dd>
              <dt className="text-tertiary">{t.updated}</dt>
              <dd>
                <time dateTime={view.datetime}>{view.dateLabel}</time>
                <PriceAge datetime={view.datetime} />
              </dd>
            </dl>
            <p className="bg-surface text-neutral-700 flex items-start gap-2.5 rounded-[var(--aa-radius-control)] px-4 py-3 text-sm">
              <Info className="text-copper mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t.askToday}
            </p>
          </>
        )}
        <ButtonLink href={rfqHref} variant="primary" className="w-full">
          {t.cta}
        </ButtonLink>
      </div>
    </section>
  );
}
