"use client";

import { useEffect } from "react";

/**
 * Spike S1: static replacement for the SSR `?variant=` row highlight on a
 * product detail page. The page is prerendered without any query string;
 * this reads `?variant=` in the browser and highlights the row only when
 * the value is one of THIS template's own public variants (the `rows` map
 * is built at build time from the snapshot) — anything else is ignored,
 * exactly like the SSR page.
 */
export function VariantHighlightFromQuery({ rows, selectedLabel }: { rows: Record<string, string>; selectedLabel: string }) {
  useEffect(() => {
    const xid = new URLSearchParams(window.location.search).get("variant");
    const anchorId = xid ? rows[xid] : undefined;
    const row = anchorId ? document.getElementById(anchorId) : null;
    if (!row) return;
    row.classList.add("bg-copper/10", "outline-copper", "-outline-offset-2", "outline-2");
    const th = row.querySelector("th");
    if (th && !th.querySelector("[data-selected-label]")) {
      const label = document.createElement("span");
      label.dataset.selectedLabel = "";
      label.className = "text-copper ms-2 align-middle text-[11px] font-semibold";
      label.textContent = `(${selectedLabel})`;
      th.appendChild(label);
    }
    row.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [rows, selectedLabel]);
  return null;
}
