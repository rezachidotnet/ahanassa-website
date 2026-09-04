import Link from "next/link";
import { cn } from "@/lib/utils";
import { homepageCopy } from "@/lib/content/homepage";
import { localizedPath, type Locale } from "@/config/locales";
import { shouldRenderPriceStrip, formatToman, formatEffectiveTimestamp, buildCommercialContextLine, buildFreshnessLine } from "@/lib/pricing/price-strip-presentation";
import type { PublicPriceStripItem } from "@/lib/pricing/types";

const CARD_CLASSNAME = "border-border bg-background flex h-full min-w-[185px] w-full shrink-0 flex-col rounded-[var(--aa-radius-md)] border p-4 shadow-[var(--aa-shadow-xs)] transition-colors sm:min-w-0 sm:shrink";

/**
 * Homepage "selected prices" strip (Frozen V2.1, docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md).
 * PRICE-P4 — final presentation over the already-verified PRICE-P1/P2/P3/P3.1
 * exact-variant read model. Receives already-resolved `items` from
 * `app/[locale]/page.tsx` (`getHomepagePriceStrip`, itself gated on
 * `PRICE_STRIP_ENABLED`) — this component takes NO data-fetching
 * responsibility of its own and cannot distinguish "flag off" from "no
 * eligible benchmark yet," by design (§7 "Real Data Only": never a
 * "coming soon" placeholder).
 *
 * Frozen render threshold: fewer than 2 eligible items renders nothing at
 * all (`shouldRenderPriceStrip`, lib/pricing/price-strip-presentation.ts) —
 * a single benchmark is never shown in visual isolation. The read model's
 * own `MAX_HOMEPAGE_PRICE_STRIP_ITEMS` (lib/pricing/price-strip-config.ts)
 * already caps the upper bound at 6; this is the separate lower-bound gate.
 *
 * Server-rendered only — no `"use client"`, no client fetch, no JS
 * carousel/autoplay/marquee. Mobile uses native `overflow-x-auto` + CSS
 * scroll-snap (frozen §32.7: user-controlled swipe only); tablet/desktop
 * reflows into a real CSS grid (frozen §32.6: 2 columns at `sm`, 3 at `md`
 * — the "3×2" medium-desktop direction — up to all 6 in one row at `xl`
 * wide desktop, where the ~1216px inner container / 6 columns / 12px gaps
 * lands each card at ~192px, inside the frozen ~180–195px target — see
 * docs/pricing/PRICE_P4_FINAL_UI_VERIFICATION_REPORT.md for the full
 * measured breakpoint math and real-browser evidence).
 *
 * Wording/threshold/formatting decisions live in the pure, independently
 * unit-tested `lib/pricing/price-strip-presentation.ts` — this file is
 * markup only, pinned by the static source-text checks in
 * `lib/pricing/price-strip-static.test.ts` (this component imports
 * `next/link`, which has no real resolvable package outside the Vite/vinext
 * build, so it cannot itself be rendered under plain `node --test`).
 */
export function PriceStrip({ locale, items }: { locale: Locale; items: PublicPriceStripItem[] }) {
  if (!shouldRenderPriceStrip(items.length)) return null;

  const t = homepageCopy[locale].priceStrip;

  return (
    <section aria-labelledby="selected-prices-heading" className="border-border bg-[var(--aa-color-bg-warm)] border-b py-14 lg:py-20">
      <div className="container-x">
        <div className="max-w-2xl">
          <h2 id="selected-prices-heading" className="text-navy text-[19px] leading-snug font-bold">
            {t.heading}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t.guidance}</p>
        </div>

        <ul className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:snap-none sm:overflow-visible sm:pb-0 md:grid-cols-3 xl:grid-cols-6">
          {items.map((item) => {
            const commercialContext = buildCommercialContextLine(item.marketOrLocation, item.deliveryBasis);
            const timestampLabel = formatEffectiveTimestamp(item.effectiveTimestamp, locale);
            const freshnessLine = buildFreshnessLine(item.freshnessState, timestampLabel, t);

            const cardBody = (
              <>
                <p className="text-navy text-sm leading-snug font-bold break-words">{item.title}</p>
                <p className="text-muted-foreground mt-1 text-xs break-words">
                  <bdi dir="ltr">{item.specification}</bdi>
                </p>
                <p className="text-navy mt-3 text-[21px] font-semibold break-words" dir="ltr">
                  {formatToman(item.priceToman, locale)}
                  <span className="text-muted-foreground ms-1 text-[13px] font-medium">/{item.unit}</span>
                </p>
                {commercialContext && <p className="text-muted-foreground mt-2 text-xs break-words">{commercialContext}</p>}
                <p className="text-muted-foreground mt-1 text-[11px] break-words">{freshnessLine}</p>
              </>
            );

            return (
              <li key={item.displayPriceId} className="flex min-w-[185px] shrink-0 snap-start sm:min-w-0">
                {item.href ? (
                  <Link
                    href={localizedPath(locale, item.href)}
                    className={cn(CARD_CLASSNAME, "hover:border-copper hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aa-color-focus-ring)]")}
                  >
                    {cardBody}
                  </Link>
                ) : (
                  <div className={CARD_CLASSNAME}>{cardBody}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
