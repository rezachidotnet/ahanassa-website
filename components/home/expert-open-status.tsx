"use client";

import { useEffect, useState } from "react";
import { openState, openStateText, type OpenState, type OpenStateLabels, type OpeningSpec } from "@/lib/content/expert-open-state";
import { cn } from "@/lib/utils";

/**
 * W20.3 redesign — the expert section's live «open now» / «opens Saturday 8:00» line: the section's only client
 * JS. The visitor's clock decides, in Asia/Tehran time (lib/content/expert-open-state.ts), so a static page is never
 * stale. The server and the first client render emit the same empty box of fixed height, so there is no hydration
 * mismatch and no layout shift; the line fades in once known and is rechecked every minute. Without JS the box
 * stays empty and the static hours under it still say everything. Text carries the state — the dot only repeats it.
 */
export function ExpertOpenStatus({ locale, hours, labels, className }: { locale: "fa" | "en" | "ar"; hours: readonly OpeningSpec[]; labels: OpenStateLabels; className?: string }) {
  const [state, setState] = useState<OpenState | null>(null);

  useEffect(() => {
    const tick = () => setState(openState(new Date(), hours));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  return (
    <p data-expert-open-status className={cn("flex min-h-8 items-center", className)}>
      {state && (
        <span
          className={cn(
            "inline-flex min-h-8 items-center gap-2 rounded-[var(--aa-radius-pill)] px-3 text-sm font-semibold motion-safe:animate-[aa-reveal_200ms_var(--aa-ease-enter)]",
            state.open ? "bg-[var(--aa-color-success-50)] text-[var(--aa-color-success-700)]" : "bg-muted text-neutral-700",
          )}
        >
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", state.open ? "bg-[var(--aa-color-success-700)]" : "bg-[var(--aa-color-neutral-500)]")} />
          {openStateText(state, labels, locale)}
        </span>
      )}
    </p>
  );
}
