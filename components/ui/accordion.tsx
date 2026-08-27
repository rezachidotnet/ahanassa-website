"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible accordion — semantic button triggers, programmatically exposed
 * expanded state, no disruptive page jump on open (HOMEPAGE_SPEC.md §18.4).
 */
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="border-border divide-border divide-y border-y">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `faq-panel-${i}`;
        const triggerId = `faq-trigger-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={triggerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="text-navy flex w-full items-center justify-between gap-4 py-5 text-start text-sm font-bold"
              >
                {item.q}
                <ChevronDown className={cn("size-4 shrink-0 text-copper transition-transform", open && "rotate-180")} aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!open} className="pb-5">
              <p className="text-muted-foreground text-sm leading-relaxed">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
