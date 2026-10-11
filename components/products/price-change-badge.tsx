import type { CompactPriceChange } from "@/lib/pricing/product-page-price";
import { cn } from "@/lib/utils";

/**
 * W9.6 — ▲/▼ + % next to a price (fa; only when a previous-day price exists — `presentCompactChange`
 * returns null otherwise and nothing is rendered). Neutral colour, like the PriceBlock's change: the
 * brand is a procurement partner, not a price board. The glyph is hidden from screen readers, which hear
 * «افزایش ۱٫۲٪» / «کاهش ۱٫۲٪» instead.
 */
export function PriceChangeBadge({ change, className }: { change: CompactPriceChange; className?: string }) {
  return (
    <span className={cn("text-neutral-700 ms-1.5 inline-flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap", className)}>
      {change.glyph && (
        <span aria-hidden="true" className="text-[10px]">
          {change.glyph}
        </span>
      )}
      {change.word && <span className="sr-only">{change.word} </span>}
      {change.label}
    </span>
  );
}
