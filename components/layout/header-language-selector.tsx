"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { locales, localeConfig, localizedPath, type Locale } from "@/config/locales";
import { cn } from "@/lib/utils";

/**
 * Desktop compact language selector — AHANASSA_HEADER_FINAL_FROZEN_V2.0.md
 * §43.2/§46.14/§58.8: a text utility ("فارسی ▾"), never a pill/button
 * competing with the primary CTA, no country flags. Preserves the current
 * page across languages via `localizedPath` + the pathname stripped of its
 * current locale prefix (§43.5) — never forces the user back to the
 * homepage. Keyboard/focus/Escape per §43.11.
 */
export function HeaderLanguageSelector({ locale, srLabel }: { locale: Locale; srLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && open) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const unprefixedPath = stripLocalePrefix(pathname, locale);

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={srLabel}
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-navy inline-flex items-center gap-1 text-sm font-medium transition-colors"
      >
        {localeConfig[locale].label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      <div id={panelId} hidden={!open} className="border-border bg-background absolute end-0 top-full z-20 mt-1 w-36 border py-1 shadow-[0_8px_24px_-8px_rgba(11,37,69,0.18)]">
        {locales.map((code) => (
          <Link
            key={code}
            href={localizedPath(code, unprefixedPath)}
            aria-current={code === locale ? "true" : undefined}
            className={cn("block px-3.5 py-2 text-sm transition-colors", code === locale ? "text-navy font-semibold" : "text-muted-foreground hover:text-navy hover:bg-surface")}
          >
            {localeConfig[code].label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Strips the current locale's URL prefix so the target locale's own prefix can be applied. */
export function stripLocalePrefix(pathname: string, locale: Locale): string {
  const prefix = localeConfig[locale].urlPrefix;
  if (prefix && pathname.startsWith(prefix)) {
    const rest = pathname.slice(prefix.length);
    return rest || "/";
  }
  return pathname || "/";
}
