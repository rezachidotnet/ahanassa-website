"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "@/components/ui/link";
import { isPriceDataStale, STALE_PRICE_COPY } from "@/lib/pricing/price-staleness";
import type { PriceLocale } from "@/lib/pricing/price-locale";

/**
 * W31 — the stale-price rule in the browser (lib/pricing/price-staleness.ts). `day` is the Tehran calendar day
 * (YYYY-MM-DD) of the snapshot's newest published price — a day, never a time (ar pages carry no price timestamp).
 * The server render and the first client render are always the fresh state (identical markup, no hydration
 * mismatch); only after mount, against the visitor's own clock, can it turn stale.
 */
function useStalePrices(day: string): boolean {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    setStale(isPriceDataStale(day, new Date()));
  }, [day]);
  return stale;
}

/** A price heading: `fresh` as built, `stale` («آخرین قیمت ثبت‌شده …») once the data is found stale. */
export function StalePriceText({ day, fresh, stale }: { day: string; fresh: string; stale: string }) {
  return useStalePrices(day) ? stale : fresh;
}

/**
 * The yellow notice with the RFQ link. Renders nothing on the server and while fresh, so a fresh page reserves no
 * space for it.
 */
export function StalePriceNotice({ locale, day, href, className }: { locale: PriceLocale; day: string; href: string; className?: string }) {
  if (!useStalePrices(day)) return null;
  const t = STALE_PRICE_COPY[locale];
  return (
    <p data-aa-stale-price-notice="" className={`flex items-start gap-2.5 rounded-[var(--aa-radius-control)] border border-[var(--aa-color-warning-800)]/25 bg-[var(--aa-color-warning-50)] px-4 py-3 text-sm leading-relaxed font-semibold text-[var(--aa-color-warning-800)] ${className ?? ""}`}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        {t.notice}{" "}
        <Link href={href} className="whitespace-nowrap underline underline-offset-4 hover:no-underline">
          {t.cta}
        </Link>
      </span>
    </p>
  );
}
