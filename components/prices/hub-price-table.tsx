import type { ReactNode } from "react";
import { localizedPath, type Locale } from "@/config/locales";
import Link from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { presentPriceCell, PRICE_CELL_ATTRIBUTE } from "@/lib/pricing/product-page-price";
import type { PriceTableRow } from "@/lib/pricing/price-page";
import { PriceCellContent } from "@/components/products/price-cell-content";

const HEAD = "border-border text-muted-foreground border-b bg-surface px-4 py-3 text-start text-xs font-bold whitespace-nowrap";
const CELL = "border-b border-[var(--aa-color-neutral-100)] px-4 py-3 align-top group-last:border-b-0";

/**
 * One table of a family price hub (W16.3, app/[locale]/prices/[family]/page.tsx): the rows of one size
 * (columns product · price · weight) or of one fa mill (product · size · price). Same cell, markup and
 * scroll region as the `/prices` table, so the price gate checks every cell the same way; the product link
 * is the clean page URL (no `?variant=`, which robots.txt keeps out of the crawl).
 */
export function HubPriceTable({
  locale,
  rows,
  caption,
  showSize,
  copy,
}: {
  locale: Locale;
  rows: readonly PriceTableRow[];
  caption: string;
  showSize: boolean;
  copy: { product: string; size: string; price: ReactNode; unit: string; weight: string };
}) {
  const showWeight = !showSize && rows.some((r) => r.weight);
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="border-border bg-background relative overflow-x-auto rounded-[var(--aa-radius-card)] border">
      <table className="text-ui w-full border-separate border-spacing-0 text-start">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              {copy.product}
            </th>
            <th scope="col" className={HEAD}>
              {copy.price}
              <span className="text-tertiary block text-[11px] font-semibold">{copy.unit}</span>
            </th>
            {showSize && (
              <th scope="col" className={HEAD}>
                {copy.size}
              </th>
            )}
            {showWeight && (
              <th scope="col" className={HEAD}>
                {copy.weight}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const view = presentPriceCell(locale, row.price, row.xid);
            return (
              <tr key={row.xid} className="group">
                <th scope="row" className={cn(CELL, "bg-background group-hover:bg-surface min-w-32 text-start font-bold")}>
                  <Link href={localizedPath(locale, row.productPagePath)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                    {row.productName}
                  </Link>
                </th>
                {view && (
                  <td {...{ [PRICE_CELL_ATTRIBUTE]: row.xid }} className={cn(CELL, "group-hover:bg-surface whitespace-nowrap")}>
                    <PriceCellContent view={view} />
                  </td>
                )}
                {showSize && (
                  <td className={cn(CELL, "text-muted-foreground group-hover:bg-surface whitespace-nowrap")}>
                    <span dir="ltr">{row.size}</span>
                  </td>
                )}
                {showWeight && (
                  <td className={cn(CELL, "text-muted-foreground group-hover:bg-surface whitespace-nowrap")}>
                    {row.weight ? (
                      <>
                        <span dir="ltr">{row.weight.value}</span>
                        <span className="text-tertiary block text-xs">{row.weight.label}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
