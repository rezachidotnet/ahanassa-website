"use client";

import { useEffect } from "react";

/**
 * Scrolls the highlighted Variant row (set server-side via `?variant=`,
 * see variant-spec-table.tsx) into view on load — the highlight itself
 * (background + "selected" label) is already fully server-rendered and
 * visible without JS; this is a pure progressive-enhancement convenience,
 * never required for the highlight to be understandable.
 */
export function ScrollToAnchor({ anchorId }: { anchorId: string }) {
  useEffect(() => {
    document.getElementById(anchorId)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [anchorId]);
  return null;
}
