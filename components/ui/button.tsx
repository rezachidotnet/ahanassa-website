import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button variants per DESIGN_SYSTEM.md §16.6:
 * - default: Copper conversion accent — the primary RFQ action, used selectively.
 * - inverse: White-on-Navy — the preferred primary control on a Navy surface.
 * - outline: Navy border/label, transparent surface — secondary action.
 * - ghost: Local, low-emphasis action.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold tracking-wide transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aa-color-focus-ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-copper text-white hover:bg-copper-400",
        inverse: "bg-white text-navy hover:bg-white/90",
        outline: "border border-border bg-transparent text-navy hover:border-navy",
        ghost: "text-navy hover:bg-muted",
      },
      size: {
        default: "px-7 py-4",
        sm: "px-5 py-3 text-[13px]",
        lg: "px-8 py-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
