"use client";

import { useEffect } from "react";
import { legacyCategoryQueryTarget } from "@/lib/catalog/public-categories";

/**
 * Architecture V1.1 §4.2 (A2): `/products?category=CODE` links that exist
 * outside the site (bookmarks, old Odoo references) are forwarded in the
 * browser to the static category route. Static-asset redirect rules cannot
 * see a query string, and no Worker runs for public pages. Only a value
 * shaped like a category code is forwarded; an unknown code lands on the
 * static 404 of that route.
 */
export function LegacyCategoryRedirect({ localePrefix }: { localePrefix: string }) {
  useEffect(() => {
    const target = legacyCategoryQueryTarget(window.location.search);
    if (target) window.location.replace(`${localePrefix}${target}`);
  }, [localePrefix]);
  return null;
}
