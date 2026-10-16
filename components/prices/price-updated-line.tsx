import { priceDateLabel, priceTimeLabel, type PriceLocale } from "@/lib/pricing/product-page-price";

/**
 * «آخرین به‌روزرسانی: ۲۴ مهر ۱۴۰۵ · ۱۳:۰۰» / «آخر تحديث: ٢٤ أكتوبر ٢٠٢٦ · ١٣:٠٠» — the update line over a price table
 * (/prices and the family hubs). W20.7 add-on (owner 2026-10-16): prices publish twice a day, so the time shows
 * next to the date. fa wraps it in `<time>`; ar carries no machine (ISO) timestamp (owner 2026-10-09).
 */
export function PriceUpdatedLine({ locale, label, at }: { locale: PriceLocale; label: string; at: string }) {
  const text = `${priceDateLabel(locale, at)} · ${priceTimeLabel(locale, at)}`;
  return (
    <p className="text-neutral-700 text-sm font-semibold">
      {label} {locale === "fa" ? <time dateTime={new Date(at).toISOString()}>{text}</time> : text}
    </p>
  );
}
