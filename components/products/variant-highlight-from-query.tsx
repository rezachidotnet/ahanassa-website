"use client";

import { useEffect } from "react";

/** Highlight classes — the same ones VariantSpecTable used for its server-rendered `highlightXid` row. */
export const HIGHLIGHT_ROW_CLASSES = ["bg-copper/10", "outline-copper", "-outline-offset-2", "outline-2"] as const;
/** The sticky size cell is opaque (it covers columns scrolled under it, W10.2), so it gets the same tint as an opaque colour; `!` beats its own bg-background. */
export const HIGHLIGHT_HEADER_CLASSES = ["bg-[color-mix(in_srgb,var(--aa-color-brand-copper-600)_10%,white)]!"] as const;

/**
 * `?variant=` row highlight on a product page, applied in the browser
 * (architecture V1.1 §4.2: `/products/<slug>` takes no searchParams). Only a
 * value that is one of THIS template's own public variants — the `rows`
 * map built from the snapshot — is honored; anything else is ignored, never
 * shown as a fabricated match.
 */
export function VariantHighlightFromQuery({ rows, selectedLabel }: { rows: Record<string, string>; selectedLabel: string }) {
  useEffect(() => {
    const xid = new URLSearchParams(window.location.search).get("variant");
    const anchorId = xid && Object.hasOwn(rows, xid) ? rows[xid] : undefined;
    const row = anchorId ? document.getElementById(anchorId) : null;
    if (!row) return;
    row.classList.add(...HIGHLIGHT_ROW_CLASSES);
    const header = row.querySelector("th");
    header?.classList.add(...HIGHLIGHT_HEADER_CLASSES);
    if (header && !header.querySelector("[data-selected-label]")) {
      const label = document.createElement("span");
      label.dataset.selectedLabel = "";
      label.className = "text-copper ms-2 align-middle text-[11px] font-semibold";
      label.textContent = `(${selectedLabel})`;
      header.appendChild(label);
    }
    row.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [rows, selectedLabel]);
  return null;
}
