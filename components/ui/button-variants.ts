import { cva } from "class-variance-authority";

/**
 * Button variants per DESIGN_SYSTEM.md §16.6:
 * - default: Copper conversion accent — the primary RFQ action, used selectively.
 * - inverse: White-on-Navy — the preferred primary control on a Navy surface.
 * - outline: Navy border/label, transparent surface — secondary action.
 * - ghost: Local, low-emphasis action.
 *
 * - primary/secondary (size="button"): the Shared Button Component contract
 *   (docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md) —
 *   the single authoritative Primary/Secondary implementation for Header
 *   (V2.2), Hero (V2.4), and the mobile drawer. Deliberately new variant/size
 *   names, not a redefinition of `default`/`lg`, so the pre-existing
 *   copper/inverse/outline/ghost consumers (cta-band.tsx,
 *   catalog-empty-state.tsx, enquiry-form.tsx) are entirely unaffected.
 *
 * Kept in its own file, separate from button.tsx's React components, so it
 * has no `next/*`/React dependency and is directly unit-testable under
 * plain `node --test` (component/button.test.ts) — the same pure/impure
 * split convention used elsewhere in this repo (e.g. lib/pricing's
 * D1-free pure modules).
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-semibold tracking-wide transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aa-color-focus-ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-copper text-white hover:bg-copper-400",
        inverse: "bg-white text-navy hover:bg-white/90",
        outline: "border border-border bg-transparent text-navy hover:border-navy",
        ghost: "text-navy hover:bg-muted",
        primary: "bg-navy text-white shadow-[var(--aa-shadow-sm)] hover:bg-[var(--aa-color-action-primary-bg-hover)] active:bg-[var(--aa-color-action-primary-bg-active)]",
        secondary: "border border-navy/60 bg-transparent text-navy hover:border-navy hover:bg-navy/5",
      },
      size: {
        default: "px-7 py-4 text-sm",
        sm: "px-5 py-3 text-[13px]",
        lg: "px-8 py-4 text-base",
        /** Shared Button V1.0 exact geometry: 48px height / 28px padding / 16px font — not a range. */
        button: "h-12 px-7 text-base",
      },
    },
    compoundVariants: [
      {
        variant: ["primary", "secondary"],
        size: "button",
        // "aa-button" carries what Tailwind utility classes can't express
        // reliably (styles/theme-extensions.css): forced-colors boundary,
        // and the exact focus-visible ring (2px/3px-offset). The base cva
        // string's own `focus-visible:outline-2 focus-visible:outline-offset-2
        // focus-visible:outline-[...]` relies on Tailwind's split
        // outline-style/-width/-color custom-property mechanism, which was
        // measured live (real keyboard Tab focus, getComputedStyle) to
        // resolve outline-style to "none" for this compound variant —
        // `.aa-button`'s plain `outline: 2px solid ...` shorthand sidesteps
        // that entirely and was verified working. Everything else here is
        // plain Tailwind, deliberately not custom CSS.
        class: "aa-button rounded-[var(--aa-radius-sm)] duration-[160ms] active:scale-[0.98] motion-reduce:active:scale-100",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
