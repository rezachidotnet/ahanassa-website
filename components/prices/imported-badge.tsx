/**
 * W34 — the label of a price-table row that shows the lowest IMPORTED price («کمترین قیمت وارداتی» / «أدنى سعر
 * مستورد»), so it is never read as one of the domestic mills' prices. Same size as the «کمترین قیمت» mark, neutral
 * tone (it ranks nothing). On ar it is the row's only origin cue: ar never names a factory.
 */
export function ImportedBadge({ label }: { label: string }) {
  return <span className="border-border bg-surface text-navy mt-1 inline-block rounded border px-1.5 py-0.5 text-[11px] font-bold">{label}</span>;
}
