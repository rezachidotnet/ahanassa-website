"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { countRfqBasketItems, readRfqBasket, RFQ_BASKET_EVENT } from "@/lib/rfq/rfq-basket";
import { cn } from "@/lib/utils";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** «سبد استعلام (n)» — n in Persian digits on fa, like the rest of the fa UI copy. */
export const RFQ_BASKET_BADGE_LABEL: Record<Locale, (n: number) => string> = {
  fa: (n) => `سبد استعلام (${String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])})`,
  ar: (n) => `سلة الاستعلام (${n})`,
  en: (n) => `Inquiry basket (${n})`,
};

/**
 * W10.5 — the header's RFQ-basket link (owner, 2026-10-11; listed in the
 * W10.5 report for veto). It renders NOTHING until the browser has read this
 * tab's basket (lib/rfq/rfq-basket.ts), nothing while the basket is empty,
 * and nothing on the form page itself — so the prerendered header is the
 * same with or without a basket (no hydration or r4 difference) and an
 * empty basket costs no header space. Re-reads on the basket event (same page) and on `pageshow`
 * (back/forward cache).
 *
 * `variant="bar"`: an inline pill in the mobile top bar (< lg).
 * `variant="tab"`: ≥ lg, a small tab hanging under the header's end edge —
 * absolutely positioned, so it takes no width from the desktop bar (the ar
 * bar at 1024px has no spare width, W10.4).
 */
export function RfqBasketBadge({ locale, variant, className }: { locale: Locale; variant: "bar" | "tab"; className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Not on the form itself: it would link to the page the visitor is on, and the form has its own row counter.
    const onForm = window.location.pathname.replace(/(\.html|\/)$/, "") === localizedPath(locale, "/contact");
    const update = () => setCount(onForm ? 0 : countRfqBasketItems(readRfqBasket(locale)));
    update();
    window.addEventListener(RFQ_BASKET_EVENT, update);
    window.addEventListener("pageshow", update);
    return () => {
      window.removeEventListener(RFQ_BASKET_EVENT, update);
      window.removeEventListener("pageshow", update);
    };
  }, [locale]);

  if (count === 0) return null;

  return (
    <a
      href={localizedPath(locale, "/contact")}
      data-rfq-basket-badge={variant}
      className={cn(
        "text-navy hover:border-navy border-copper inline-flex items-center gap-1.5 font-bold whitespace-nowrap transition-colors",
        variant === "bar" ? "bg-background h-9 rounded-[var(--aa-radius-badge)] border px-3 text-xs" : "bg-background rounded-b-[var(--aa-radius-control)] border border-t-0 px-3.5 py-1.5 text-xs shadow-[0_2px_8px_-4px_rgba(11,37,69,0.18)]",
        className,
      )}
    >
      <ClipboardList className="text-copper size-4 shrink-0" aria-hidden="true" />
      {RFQ_BASKET_BADGE_LABEL[locale](count)}
    </a>
  );
}
