"use client";

import { useId } from "react";
import { trackEvent } from "@/lib/analytics/events";

/**
 * W18.2 — the 30/90-day switch of a chart page. Plain radio inputs: the visible window is chosen by CSS
 * (styles/theme-extensions.css, `[data-chart-range-root]:has(…:checked)`), so the switch works without JavaScript and
 * never re-renders or shifts the chart; the only script is the chart_range_change report.
 */
export function ChartRangeToggle({ legend, options, defaultDays, productSlug }: { legend: string; options: { days: 30 | 90; label: string }[]; defaultDays: 30 | 90; productSlug: string }) {
  const name = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="text-tertiary me-2 inline text-xs font-semibold float-start leading-8">{legend}</legend>
      {options.map((o) => (
        <label key={o.days} className="border-border text-neutral-700 has-[:checked]:border-navy has-[:checked]:bg-navy has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--aa-color-focus-ring)] inline-flex h-8 cursor-pointer items-center rounded-[var(--aa-radius-control)] border px-3 text-sm font-semibold has-[:checked]:text-white">
          <input
            type="radio"
            name={name}
            value={o.days}
            data-chart-range={o.days}
            defaultChecked={o.days === defaultDays}
            className="sr-only"
            onChange={(e) => {
              if (e.currentTarget.checked) trackEvent("chart_range_change", { chart_range: String(o.days), product_slug: productSlug });
            }}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
