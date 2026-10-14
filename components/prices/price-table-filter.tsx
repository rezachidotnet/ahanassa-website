"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { labelClass, selectClass } from "@/components/ui/form-control";
import { factoriesForFamily, parsePriceFilterQuery, PRICE_ROW_FACTORY_ATTRIBUTE, PRICE_ROW_FAMILY_ATTRIBUTE, priceFilterSearch, reconcilePriceFilter, type PriceFilterOptions, type PriceFilterState } from "@/lib/pricing/price-page";

/**
 * W9.6 — the price page's filter (family; fa also factory). The table itself is server-rendered static
 * HTML; this component only shows/hides its rows by their `data-aa-family` / `data-aa-factory`
 * attributes, so NO price data travels in the client props (only the option labels). Without
 * JavaScript every row stays visible. The visible-row count is announced only after a change (the
 * initial render has none, so server and browser markup are identical).
 *
 * W17.1 — with a family chosen, the factory select lists only that family's factories (همه restores all);
 * a factory with no rows of the new family resets to همه. The state mirrors `?family=&factory=` (read after
 * mount, written with history.replaceState), always reconciled, so the URL never names an impossible pair.
 */

interface Copy {
  family: string;
  factory: string;
  all: string;
  /** e.g. «۱۲ قلم» — `n` already formatted. */
  countTemplate: string;
  noMatch: string;
}

const ALL: PriceFilterState = { family: "", factory: "" };

export function PriceTableFilter({ tableId, options, copy, digitsLocale }: { tableId: string; options: PriceFilterOptions; copy: Copy; digitsLocale: string }) {
  const id = useId();
  const [filter, setFilter] = useState<PriceFilterState>(ALL);
  const [status, setStatus] = useState<{ count: number } | null>(null);
  const { family, factory } = filter;

  // A shared or reloaded link: apply its query once, after hydration.
  useEffect(() => {
    const fromQuery = parsePriceFilterQuery(window.location.search, options);
    if (fromQuery.family || fromQuery.factory) setFilter(fromQuery);
    // A stale value (a factory gone from today's snapshot, an unknown family) is dropped from the URL too.
    const search = priceFilterSearch(window.location.search, fromQuery);
    if (search !== window.location.search) window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}${window.location.hash}`);
    // Options are fixed for the page's lifetime (static HTML).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!(family || factory || status)) return; // untouched: no count, and the URL (maybe carrying a query not yet applied) stays as it is
    setStatus({ count: visible });
    const search = priceFilterSearch(window.location.search, filter);
    if (search !== window.location.search) window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}${window.location.hash}`);
    // `status` is deliberately not a dependency: it only records that a filter has been used.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, family, factory]);

  const update = (next: Partial<PriceFilterState>) => setFilter((prev) => reconcilePriceFilter(options, { ...prev, ...next }));
  const factories = factoriesForFamily(options, family);
  const label = (field: string) => `${id}-${field}`;
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="grid gap-1.5">
        <label htmlFor={label("family")} className={labelClass}>
          {copy.family}
        </label>
        <div className="relative min-w-52">
          <select id={label("family")} value={family} onChange={(e) => update({ family: e.target.value })} className={selectClass}>
            <option value="">{copy.all}</option>
            {options.families.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="text-tertiary pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" />
        </div>
      </div>
      {options.factories.length > 1 && (
        <div className="grid gap-1.5">
          <label htmlFor={label("factory")} className={labelClass}>
            {copy.factory}
          </label>
          <div className="relative min-w-52">
            <select id={label("factory")} value={factory} onChange={(e) => update({ factory: e.target.value })} className={selectClass}>
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
