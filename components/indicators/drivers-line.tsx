import { bareAttribution, DRIVERS_COPY, driversItems, INDICATOR_COPY, INDICATOR_LINE_ATTRIBUTE, type Indicator } from "@/lib/indicators/presentation";

/**
 * W18.2 — the fa decision block's ONE drivers line: each market indicator's last move and date
 * («دلار (نرخ مرکز مبادله) ▲ ۰٫۴٪ (۱۵ مهر ۱۴۰۵) · سنگ آهن جهانی ▼ ۰٫۷٪ (اوت ۲۰۲۶) · …»), then the reference label
 * and the sources in small print. Facts only — what moved and when — never why it will move or what to do.
 */
export function DriversLine({ indicators }: { indicators: readonly Indicator[] }) {
  if (indicators.length === 0) return null;
  const items = driversItems("fa", indicators);
  return (
    <p {...{ [INDICATOR_LINE_ATTRIBUTE]: indicators.map((i) => i.code).join(" ") }} className="text-neutral-700 text-sm leading-relaxed">
      <span className="font-semibold">{DRIVERS_COPY.fa.lead}: </span>
      {items.map((item, i) => (
        <span key={item.code}>
          {i > 0 && " · "}
          <bdi>{item.text}</bdi>
        </span>
      ))}
      <span className="text-muted-foreground mt-1 block text-[11px]">
        {INDICATOR_COPY.fa.reference}. {DRIVERS_COPY.fa.sources}: {indicators.map((i) => bareAttribution("fa", i.attributions.fa)).join("؛ ")}
      </span>
    </p>
  );
}
