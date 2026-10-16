import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface Milestone {
  year: string;
  event: string;
  /** In-page anchor of the section this milestone continues in (the exhibition → «رویدادها»). */
  href?: string;
  linkLabel?: string;
}

/**
 * W20.2 — «مسیر ما» as a milestone timeline: an ordered list on one line, vertical on phones (line at the reading
 * start) and alternating either side of a centre line from lg. On lg each item spans two auto rows, offset by one
 * from its neighbour (gridRow "i+1 / span 2"), so the two sides interleave without fixed heights. The last item
 * (the newest) is highlighted. No animation, so nothing to reduce; no image, so no layout shift.
 */
export function AboutTimeline({ milestones, labelledBy }: { milestones: readonly Milestone[]; labelledBy: string }) {
  const last = milestones.length - 1;
  return (
    <ol
      aria-labelledby={labelledBy}
      className="relative mt-8 grid gap-4 before:absolute before:inset-y-2 before:start-[6px] before:w-0.5 before:bg-[var(--aa-color-neutral-200)] lg:grid-cols-2 lg:gap-x-0 lg:gap-y-3 lg:before:start-[calc(50%-1px)]"
    >
      {milestones.map((m, i) => {
        const latest = i === last;
        const startSide = i % 2 === 0;
        return (
          <li
            key={m.year}
            style={{ "--tl-row": `${i + 1} / span 2` } as CSSProperties}
            className={cn("relative ps-8 lg:[grid-row:var(--tl-row)]", startSide ? "lg:col-start-1 lg:ps-0 lg:pe-10" : "lg:col-start-2 lg:ps-10")}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute start-0 top-5 size-3.5 rounded-full border-2",
                startSide ? "lg:start-auto lg:-end-[7px]" : "lg:-start-[7px]",
                latest ? "border-copper bg-copper ring-4 ring-[color-mix(in_srgb,var(--color-copper)_20%,transparent)]" : "border-navy bg-background",
              )}
            />
            <div className={cn("bg-background rounded-[var(--aa-radius-card)] border p-4 shadow-[var(--aa-shadow-xs)]", startSide && "lg:text-end", latest ? "border-copper" : "border-border")}>
              <p className={cn("text-lg font-extrabold", latest ? "text-copper" : "text-navy")}>{m.year}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{m.event}</p>
              {m.href && m.linkLabel && (
                <a href={m.href} className="text-navy hover:text-copper mt-2 inline-block text-sm font-semibold underline underline-offset-4">
                  {m.linkLabel}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
