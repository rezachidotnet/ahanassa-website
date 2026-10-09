"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { labelClass, selectClass } from "@/components/ui/form-control";
import { PRICE_ROW_FACTORY_ATTRIBUTE, PRICE_ROW_FAMILY_ATTRIBUTE } from "@/lib/pricing/price-page";

/**
 * W9.6 — the price page's filter (family; fa also factory). The table itself is server-rendered static
 * HTML; this component only shows/hides its rows by their `data-aa-family` / `data-aa-factory`
 * attributes, so NO price data travels in the client props (only the option labels). Without
 * JavaScript every row stays visible. The visible-row count is announced only after a change (the
 * initial render has none, so server and browser markup are identical).
 */

interface Copy {
  family: string;
  factory: string;
  all: string;
  /** e.g. «۱۲ قلم» — `n` already formatted. */
  countTemplate: string;
  noMatch: string;
}

export function PriceTableFilter({ tableId, families, factories, copy, digitsLocale }: { tableId: string; families: { value: string; label: string }[]; factories: string[]; copy: Copy; digitsLocale: string }) {
  const id = useId();
  const [family, setFamily] = useState("");
  const [factory, setFactory] = useState("");
  const [status, setStatus] = useState<{ count: number } | null>(null);

  useEffect(() => {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>(`tbody tr[${PRICE_ROW_FAMILY_ATTRIBUTE}]`));
    let visible = 0;
    for (const row of rows) {
      const show = (!family || row.getAttribute(PRICE_ROW_FAMILY_ATTRIBUTE) === family) && (!factory || row.getAttribute(PRICE_ROW_FACTORY_ATTRIBUTE) === factory);
      row.hidden = !show;
      if (show) visible++;
    }
    if (family || factory || status) setStatus({ count: visible });
    // `status` is deliberately not a dependency: it only records that a filter has been used.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, family, factory]);

  const label = (field: string) => `${id}-${field}`;
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="grid gap-1.5">
        <label htmlFor={label("family")} className={labelClass}>
          {copy.family}
        </label>
        <div className="relative min-w-52">
          <select id={label("family")} value={family} onChange={(e) => setFamily(e.target.value)} className={selectClass}>
          <option value="">{copy.all}</option>
          {families.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
          <ChevronDown aria-hidden="true" className="text-tertiary pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" />
        </div>
      </div>
      {factories.length > 1 && (
        <div className="grid gap-1.5">
          <label htmlFor={label("factory")} className={labelClass}>
            {copy.factory}
          </label>
          <div className="relative min-w-52">
          <select id={label("factory")} value={factory} onChange={(e) => setFactory(e.target.value)} className={selectClass}>
            <option value="">{copy.all}</option>
            {factories.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="text-tertiary pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" />
        </div>
        </div>
      )}
      <p role="status" className="text-muted-foreground min-h-11 content-center text-sm">
        {status ? (status.count === 0 ? copy.noMatch : copy.countTemplate.replace("{n}", new Intl.NumberFormat(digitsLocale).format(status.count))) : null}
      </p>
    </div>
  );
}
