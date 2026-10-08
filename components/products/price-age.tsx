"use client";

import { useEffect, useState } from "react";
import { formatPriceAge } from "@/lib/pricing/price-block-presentation";

/**
 * The price's age («۳ ساعت پیش»), computed in the browser: the page is a
 * static file rebuilt daily, so an age rendered at build time would be
 * wrong. Renders nothing on the server and until mounted (no hydration
 * mismatch, no empty parentheses in the static HTML).
 */
export function PriceAge({ datetime }: { datetime: string }) {
  const [age, setAge] = useState<string | null>(null);
  useEffect(() => {
    setAge(formatPriceAge(datetime, new Date()));
  }, [datetime]);
  return age ? <span className="text-tertiary"> ({age})</span> : null;
}
