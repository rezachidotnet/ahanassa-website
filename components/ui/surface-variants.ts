import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

/**
 * Card, panel, badge and tag styles (W10.2; W10.0 report §5.3/§5.4). Pure
 * cva like button-variants.ts, so it is unit-testable under `node --test`.
 *
 * Inner-page surfaces move from the square hairline "spec-sheet" grid to
 * rounded cards and panels — owner decision D-W10-1 (docs/OWNER_DECISIONS.md).
 * Full-bleed sections (page hero, CTA band, footer) stay square.
 */
const card = cva("bg-background border border-border", {
  variants: {
    variant: {
      /** 12px radius, hairline, shadow-xs. */
      card: "rounded-[var(--aa-radius-card)] shadow-[var(--aa-shadow-xs)]",
      /** A whole-card link: hover = stronger border, shadow-md and a 2px lift (no lift under reduced motion). */
      interactive:
        "flex flex-col overflow-hidden rounded-[var(--aa-radius-card)] shadow-[var(--aa-shadow-xs)] transition-[border-color,box-shadow,transform] duration-[160ms] hover:-translate-y-0.5 hover:border-[var(--aa-color-neutral-300)] hover:shadow-[var(--aa-shadow-md)] motion-reduce:hover:translate-y-0",
      /** 16px radius, generous padding: form sections and side boxes. */
      panel: "rounded-[var(--aa-radius-panel)] p-6 lg:p-8",
    },
    tone: {
      default: "",
      subtle: "bg-surface",
    },
  },
  defaultVariants: { variant: "card", tone: "default" },
});

export function cardVariants(props?: Parameters<typeof card>[0]): string {
  return twMerge(card(props));
}
export type CardVariantProps = VariantProps<typeof card>;

const badge = cva("inline-flex items-center gap-1.5 text-xs font-semibold", {
  variants: {
    tone: {
      neutral: "bg-muted text-neutral-700",
      info: "bg-[var(--aa-color-info-50)] text-[var(--aa-color-info-700)]",
      success: "bg-[var(--aa-color-success-50)] text-[var(--aa-color-success-700)]",
      warning: "bg-[var(--aa-color-warning-50)] text-[var(--aa-color-warning-800)]",
      /** Technical code (incoterm, standard): 4px radius, n-300 border — never a pill. */
      tag: "border border-[var(--aa-color-neutral-300)] bg-background text-neutral-700",
    },
  },
  defaultVariants: { tone: "neutral" },
});

/** Status badge = pill, 24px tall (counters too). Tag = 4px radius, 28px tall. Pills are never buttons. */
export function badgeVariants({ className, ...props }: BadgeVariantProps & { className?: string } = {}): string {
  const shape = props.tone === "tag" ? "min-h-7 rounded-[var(--aa-radius-tag)] px-2.5 py-0.5" : "min-h-6 rounded-[var(--aa-radius-badge)] px-2.5 py-0.5";
  return twMerge(badge(props), shape, className);
}
export type BadgeVariantProps = VariantProps<typeof badge>;
