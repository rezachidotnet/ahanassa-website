import * as React from "react";
import { cardVariants, type CardVariantProps } from "./surface-variants";

/** Card / interactive card / panel (components/ui/surface-variants.ts). Renders a <div> unless `as` names another element. */
export function Card({ as: Tag = "div", variant, tone, className, ...props }: React.HTMLAttributes<HTMLElement> & CardVariantProps & { as?: "div" | "article" | "li" | "section" | "address" }) {
  return <Tag className={cardVariants({ variant, tone, className })} {...props} />;
}
