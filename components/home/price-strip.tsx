import Link from "next/link";
import { homepageCopy } from "@/lib/content/homepage";
import { localizedPath, type Locale } from "@/config/locales";
import type { PublicPriceStripItem } from "@/lib/pricing/types";

const localeNumeralsFor: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };

function formatToman(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeNumeralsFor[locale]).format(value);
}

function formatUpdatedAt(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(localeNumeralsFor[locale], { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Homepage "latest prices" strip (Item 6, docs/pricing/PRICE_PROVIDER_CONTRACT.md).
 * Receives already-resolved `items` from `app/[locale]/page.tsx`
 * (`getHomepagePriceStrip`, itself gated on `PRICE_STRIP_ENABLED` and
 * returning `[]` for both "flag off" and "no real provider data yet" —
 * this component cannot distinguish the two, by design, and doesn't need
 * to). Renders nothing at all when `items` is empty — no "coming soon"
 * placeholder, per the owner's explicit instruction; never fabricated
 * data.
 *
 * Deliberately no JS marquee/auto-scroll — plain `overflow-x-auto` +
 * CSS scroll-snap is the safer accessible default (satisfies "no
 * aggressive animation" and makes "pause on hover" moot).
 */
export function PriceStrip({ locale, items }: { locale: Locale; items: PublicPriceStripItem[] }) {
  if (items.length === 0) return null;

  const t = homepageCopy[locale].priceStrip;

  return (
    <section className="border-border bg-surface border-b py-10">
      <div className="container-x">
        <h2 className="text-navy text-base font-bold">{t.heading}</h2>
        <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {items.map((item) => {
            const card = (
              <div className="border-border bg-background min-w-52 shrink-0 snap-start rounded-[var(--aa-radius-md)] border p-4 shadow-[var(--aa-shadow-xs)] transition-colors hover:border-copper">
                <p className="text-navy text-sm font-bold">{item.title}</p>
                <p className="mt-2 text-lg font-extrabold text-navy" dir="ltr">
                  {formatToman(item.priceToman, locale)}
                  <span className="text-muted-foreground ms-1 text-xs font-medium">/{item.unit}</span>
                </p>
                <p className="text-muted-foreground mt-2 text-[11px]">
                  {item.isStale && <span className="text-[var(--aa-color-warning-800)] font-semibold">{t.staleLabel} · </span>}
                  {t.updatedPrefix} {formatUpdatedAt(item.effectiveTimestamp, locale)}
                </p>
              </div>
            );
            return item.href ? (
              <Link key={item.displayPriceId} href={localizedPath(locale, item.href)} className="contents">
                {card}
              </Link>
            ) : (
              <div key={item.displayPriceId} className="contents">
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
