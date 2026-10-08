import * as React from "react";
import { badgeVariants, type BadgeVariantProps } from "./surface-variants";

/** Status badge (pill) or technical tag (4px) — components/ui/surface-variants.ts. Never interactive. */
export function Badge({ as: Tag = "span", tone, className, ...props }: React.HTMLAttributes<HTMLElement> & BadgeVariantProps & { as?: "span" | "li" }) {
  return <Tag className={badgeVariants({ tone, className })} {...props} />;
}
