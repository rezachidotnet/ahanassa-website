import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

/**
 * The one Button style source for the whole site (W10.2; W10.0 report §5.1).
 * Every button and button-like link goes through this — there is no second,
 * hand-rolled button style anywhere in `app/` or `components/`.
 *
 * Variants:
 * - primary: navy fill — the RFQ action, one per view. On a navy surface
 *   (inside `.on-inverse`) it turns cream with navy text.
 * - secondary: transparent with a navy/60 border — the alternative action.
 *   White text and a white/70 border inside `.on-inverse`.
 * - ghost: low emphasis (clear form, utility actions).
 * - link: inline navigation styled as a copper underlined link, with a 44px
 *   hit area ("back to products", "request this item").
 *
 * The copper-filled `default`, the `inverse` and the `outline` variants were
 * retired by owner decision D-W10-2 (navy primary everywhere; copper stays
 * the accent for eyebrows, icons and links).
 *
 * Sizes: sm 40px (44px hit area via ::after), md 48px (= Button V1.0, the
 * default), lg 56px, icon 44x44. `button` is the frozen Button V1.0 name for
 * md (docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md) —
 * Header V2.2, Hero V2.4, the drawer and Final CTA consume it by that name,
 * so it stays, with the exact same 48px / 28px / 16px geometry.
 *
 * Every variant carries `.aa-button` (styles/theme-extensions.css): the
 * 2px / 3px-offset focus-visible ring and the forced-colors boundary. The
 * old Tailwind `outline-none focus-visible:outline-*` utilities resolved to
 * `outline-style: none` (measured live, W10.0 §3.4), so they are gone.
 *
 * Disabled is a neutral fill, never opacity (white on 50% copper was
 * 2.17:1). A loading button (`aria-busy="true"`) keeps its variant colours
 * even while disabled, so "sending…" never looks like "unavailable".
 *
 * Kept in its own file, separate from button.tsx's React components, so it
 * has no `next/*`/React dependency and is directly unit-testable under plain
 * `node --test` (components/ui/button.test.ts).
 */
const base = [
  "aa-button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--aa-radius-sm)] font-semibold tracking-wide select-none",
  "transition-[color,background-color,border-color,box-shadow,transform] duration-[160ms] active:scale-[0.98] motion-reduce:active:scale-100",
  // Disabled: neutral fill, no opacity; skipped while loading (aria-busy).
  "disabled:pointer-events-none [&:disabled:not([aria-busy=true])]:bg-[var(--aa-color-neutral-100)] [&:disabled:not([aria-busy=true])]:text-[var(--aa-color-neutral-500)] [&:disabled:not([aria-busy=true])]:shadow-[inset_0_0_0_1px_var(--aa-color-neutral-200)] [&:disabled:not([aria-busy=true])]:border-transparent",
  "aria-busy:cursor-progress aria-busy:pointer-events-none",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
].join(" ");

const variants = cva(base, {
  variants: {
    variant: {
      primary:
        "bg-navy text-white shadow-[var(--aa-shadow-sm)] hover:bg-[var(--aa-color-action-primary-bg-hover)] active:bg-[var(--aa-color-action-primary-bg-active)] in-[.on-inverse]:bg-cream in-[.on-inverse]:text-navy in-[.on-inverse]:shadow-none in-[.on-inverse]:hover:bg-white in-[.on-inverse]:active:bg-white",
      secondary:
        "border border-navy/60 bg-transparent text-navy hover:border-navy hover:bg-navy/5 in-[.on-inverse]:border-white/70 in-[.on-inverse]:text-white in-[.on-inverse]:hover:border-white in-[.on-inverse]:hover:bg-white/10",
      ghost: "bg-transparent text-navy hover:bg-muted in-[.on-inverse]:text-white in-[.on-inverse]:hover:bg-white/10",
      link: "aa-button-link text-copper underline decoration-1 underline-offset-4 hover:decoration-2 in-[.on-inverse]:text-accent-on-inverse",
    },
    size: {
      sm: "h-10 px-4 text-sm after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
      md: "h-12 px-7 text-base",
      lg: "h-14 px-8 text-[1.0625rem]",
      icon: "size-11 p-0",
      /** Shared Button V1.0 exact geometry: 48px height / 28px padding / 16px font — not a range. Same as md. */
      button: "h-12 px-7 text-base",
    },
  },
  compoundVariants: [
    // A link-styled button has no box: text-sized, no padding, 44px hit area.
    { variant: "link", class: "h-auto min-h-11 px-0 text-sm" },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export type ButtonVariantProps = VariantProps<typeof variants>;

/** Class string for a shared Button. Conflicts (e.g. a caller's `w-full`, the link variant's `px-0`) resolve through tailwind-merge. */
export function buttonVariants(props?: Parameters<typeof variants>[0]): string {
  return twMerge(variants(props));
}
