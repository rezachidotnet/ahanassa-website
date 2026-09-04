"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavDisclosureItem {
  code: string;
  name: string;
  path: string;
}

/**
 * Desktop hybrid Products/Services control — AHANASSA_HEADER_FINAL_FROZEN_V2.0.md
 * §49.7/§58.9: the label is always a real `<Link>` to its landing page; the
 * adjacent chevron `<button>` independently opens/closes a compact floating
 * panel (never a full-width mega menu, §52.1). If the label ever became
 * only a button with no direct navigation, that would be a spec FAIL
 * (§58.9) — this component structurally cannot do that, since `href` is
 * always rendered as a real anchor regardless of `items`.
 *
 * Opens on hover (with a short pointer-exit tolerance, §49.10), click/tap
 * on the chevron, and keyboard (Enter/Space on the chevron); closes on
 * Escape (restoring focus to the chevron, §49.9), outside click, and route
 * change. No live fetch on open (§52.8/§58.4) — `items` is always
 * server-fetched data already present as a prop; this component never
 * calls Odoo/an API itself.
 *
 * Accessibility hardening addendum (post-freeze):
 * - Disclosure Navigation semantics only — `nav`/`ul`/`li`/`a`/`button`,
 *   never `role="menu"`/`"menubar"`/`"menuitem"`, and `aria-haspopup` is
 *   deliberately NOT added (this is not that widget pattern). The
 *   dropdown panel itself is a plain `<div>` (no extra landmark role) —
 *   it's a subset of the SAME primary navigation the outer `<nav>` already
 *   landmarks, not a second independent landmark.
 * - `isCurrentPage` drives `aria-current="page"` (exact route match only);
 *   `isActiveSection` drives the visual active-section treatment
 *   (copper underline) and may be true for a child route (e.g. a real
 *   product detail page under /products/[slug]) without misrepresenting
 *   `aria-current` — these are deliberately separate booleans.
 */
export function HeaderNavDisclosure({
  href,
  label,
  isCurrentPage,
  isActiveSection,
  items,
  viewAllLabel,
  className,
}: {
  href: string;
  label: string;
  isCurrentPage: boolean;
  isActiveSection: boolean;
  items: NavDisclosureItem[];
  viewAllLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      chevronRef.current?.focus();
    }
  }

  // No valid child navigation data — the disclosure control is omitted
  // entirely (never an empty broken panel, §52.10/§58.11); the label
  // remains a plain, fully functional link.
  if (items.length === 0) {
    return (
      <Link
        href={href}
        aria-current={isCurrentPage ? "page" : undefined}
        className={cn("relative px-3.5 py-2 text-sm font-medium transition-colors", isActiveSection ? "text-navy" : "text-muted-foreground hover:text-navy", className)}
      >
        {label}
        {isActiveSection && <span className="bg-copper absolute inset-x-3.5 -bottom-px h-0.5" aria-hidden="true" />}
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative" onMouseEnter={() => { cancelClose(); setOpen(true); }} onMouseLeave={scheduleClose} onKeyDown={onKeyDown}>
      <div className={cn("flex items-center gap-0.5", className)}>
        <Link
          href={href}
          aria-current={isCurrentPage ? "page" : undefined}
          className={cn("relative py-2 ps-3.5 text-sm font-medium transition-colors", isActiveSection ? "text-navy" : "text-muted-foreground hover:text-navy")}
        >
          {label}
          {isActiveSection && <span className="bg-copper absolute inset-x-3.5 -bottom-px h-0.5" aria-hidden="true" />}
        </Link>
        <button
          ref={chevronRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={label}
          onClick={() => setOpen((v) => !v)}
          className="text-muted-foreground hover:text-navy flex size-8 shrink-0 items-center justify-center transition-colors"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>

      <div id={panelId} hidden={!open} className="border-border bg-background absolute start-0 top-full z-20 mt-1 w-64 border shadow-[0_8px_24px_-8px_rgba(11,37,69,0.18)]">
        <ul className="py-2">
          {items.map((item) => (
            <li key={item.code}>
              {/* No outline-none here (a prior version removed the global
                  copper focus-visible outline and replaced it with only a
                  near-invisible background tint, ~1.05:1 contrast against
                  this panel's own white background — a real WCAG 2.2 AA
                  failure). The site-wide `:focus-visible` baseline
                  (styles/base.css, 2px solid copper, ~5.4:1) applies here
                  unmodified; the background tint below is a supplementary
                  hover/focus cue, never the sole indicator. */}
              <Link href={item.path} className="text-navy hover:bg-surface focus-visible:bg-surface block px-4 py-2.5 text-sm transition-colors">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-border border-t px-4 py-2.5">
          {/* See SiteHeader.tsx's own comment on this same hover-contrast
              fix — the lighter hover:text-copper-400 tint fails 4.5:1
              normal-text contrast (~3.2:1, computed); a darker existing
              token is used instead, which increases contrast on hover. */}
          <Link href={href} className="text-copper hover:text-[var(--aa-color-action-accent-bg-hover)] text-[13px] font-semibold transition-colors">
            {viewAllLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
