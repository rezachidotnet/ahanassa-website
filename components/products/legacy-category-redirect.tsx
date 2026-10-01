"use client";

import { useEffect } from "react";

/**
 * Spike S1: static replacement for the old `/products?category=CODE` URL
 * scheme. Static asset routing cannot match on a query string, so the
 * legacy form is forwarded in the browser to the static category route
 * (`/products/category/<segment>`). Codes are only reformatted, never
 * trusted: an unknown code lands on the static 404.
 */
export function LegacyCategoryRedirect({ prefix }: { prefix: string }) {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("category");
    if (!code || !/^[A-Za-z0-9_]{1,64}$/.test(code)) return;
    window.location.replace(`${prefix}/products/category/${code.toLowerCase().replace(/_/g, "-")}`);
  }, [prefix]);
  return null;
}
