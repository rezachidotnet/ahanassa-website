import * as React from "react";
import Link from "@/components/ui/link";

import { buttonVariants, type ButtonVariantProps } from "./button-variants";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  /**
   * Work in progress (e.g. the RFQ submit while sending): sets
   * `aria-busy="true"`, shows a 16px spinner before the label and blocks
   * pointer activation. The caller swaps the label ("در حال ارسال…") and
   * decides `disabled`; a busy button keeps its variant colours.
   */
  loading?: boolean;
}

function Spinner() {
  return <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-e-transparent" />;
}

function Button({ className, variant, size, type = "button", loading = false, children, ...props }: ButtonProps) {
  return (
    <button type={type} data-slot="button" aria-busy={loading || undefined} className={buttonVariants({ variant, size, className })} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends React.ComponentProps<typeof Link>, ButtonVariantProps {}

/**
 * Shared Button rendered as real navigation (Button V1.0 §3.1 — a link/anchor
 * when activation navigates to another route). Use for internal routes;
 * for a non-Link anchor (e.g. `tel:`), apply `buttonVariants(...)` directly.
 */
function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link data-slot="button-link" className={buttonVariants({ variant, size, className })} {...props} />;
}

export { Button, ButtonLink, buttonVariants };
