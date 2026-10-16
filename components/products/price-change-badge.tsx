import type { CompactPriceChange } from "@/lib/pricing/product-page-price";
import { priceChangeToneClass } from "@/lib/pricing/price-change-tone";
import { cn } from "@/lib/utils";

/**
 * W9.6 — ▲/▼ + % next to a price (fa; only when a previous-day price exists — `presentCompactChange`
 * returns null otherwise and nothing is rendered). W20.1: up green, down red, unchanged neutral
 * (lib/pricing/price-change-tone.ts) — the glyph and the % stay, so colour is never the only cue. The glyph is
 * hidden from screen readers, which hear
 * «افزایش ۱٫۲٪» / «کاهش ۱٫۲٪» instead.
 */
export function PriceChangeBadge({ change, className }: { change: CompactPriceChange; className?: string }) {
  return (
    <span className={cn(priceChangeToneClass(change.direction), "ms-1.5 inline-flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap", className)}>
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
