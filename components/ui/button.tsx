import * as React from "react";
import Link from "next/link";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button-variants";

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

interface ButtonLinkProps
  extends React.ComponentProps<typeof Link>,
    VariantProps<typeof buttonVariants> {}

/**
 * Shared Button rendered as real navigation (Button V1.0 §3.1 — a link/anchor
 * when activation navigates to another route). Use for internal routes;
 * for a non-Link anchor (e.g. `tel:`), apply `buttonVariants(...)` directly.
 */
function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link data-slot="button-link" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, ButtonLink, buttonVariants };
