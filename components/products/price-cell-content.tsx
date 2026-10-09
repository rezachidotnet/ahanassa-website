import Link from "@/components/ui/link";
import { buttonVariants } from "@/components/ui/button";
import type { PriceCellPresentation } from "@/lib/pricing/product-page-price";
import { PriceChangeBadge } from "./price-change-badge";

/**
 * The inside of one price cell (W9.4, W9.6) — shared by the product page's variant table and the price
 * page, so both render exactly what the publication gate allow-lists for the cell's variant: fa amount +
 * ▲/▼ + factory/location + date + «استعلام قیمت نهایی»; ar amount + date + «طلب السعر النهائي»; or the
 * missing label. The caller renders the `<td data-aa-price-cell=…>` around it.
 */
export function PriceCellContent({ view }: { view: PriceCellPresentation }) {
  if (view.kind === "missing") return <span className="text-muted-foreground">{view.label}</span>;
  return (
    <>
      <span className="text-navy font-bold">{view.amount}</span>
      {view.change && <PriceChangeBadge change={view.change} />}
      {view.place && <span className="text-tertiary block text-xs">{view.place}</span>}
      {/* ar carries no timestamp (owner 2026-10-09: ar payload = variant id, amount, date label). */}
      {view.datetime ? (
        <time dateTime={view.datetime} className="text-tertiary block text-xs">
          {view.dateLabel}
        </time>
      ) : (
        <span className="text-tertiary block text-xs">{view.dateLabel}</span>
      )}
      {view.rfq && (
        // Plain <a> (components/ui/link.tsx): no prefetch.
        <Link href={view.rfq.href} className={buttonVariants({ variant: "link", className: "mt-1 h-auto min-h-6 text-xs font-semibold whitespace-nowrap" })}>
          {view.rfq.label}
        </Link>
      )}
    </>
  );
}
