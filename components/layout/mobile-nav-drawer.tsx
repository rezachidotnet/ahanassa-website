"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Phone, X } from "lucide-react";
import { locales, localeConfig, localizedPath, type Locale } from "@/config/locales";
import type { NavLink } from "@/lib/content/nav";
import type { HeaderProductFamilyShortcut } from "@/lib/catalog/editorial-repository";
import type { PublicProcessingGroup } from "@/lib/processing/public-repository";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { stripLocalePrefix } from "@/components/layout/header-language-selector";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobile navigation drawer — docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md §55
 * (unchanged by V2.2 — the drawer's own Primary CTA now consumes the
 * Shared Button Component per docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.2.md
 * §85.2, everything else below is still V2.1).
 * Direction-aware (RTL opens from the right, LTR from the left, §55.1),
 * `min(88vw, 360px)` target width (§55.2), frozen content order (Logo/Close
 * → Primary Navigation → Phone → Language → Primary CTA, §55.3), single-open
 * Products/Services accordion (§55.6), one child navigation level only
 * (§55.5), scroll lock + focus containment + Escape/overlay/route-change
 * close + focus restoration to the trigger (§55.11-55.13, §58.17).
 */
export function MobileNavDrawer({
  locale,
  open,
  onClose,
  triggerRef,
  links,
  productFamilies,
  serviceGroups,
  viewAllProductsLabel,
  viewAllServicesLabel,
  disclosureAccessibleName,
  phoneSrLabel,
  languageSrLabel,
  ctaLabel,
  closeLabel,
  navLabel,
  drawerLabel,
}: {
  locale: Locale;
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  links: NavLink[];
  productFamilies: HeaderProductFamilyShortcut[];
  serviceGroups: PublicProcessingGroup[];
  viewAllProductsLabel: string;
  viewAllServicesLabel: string;
  /** NAV-P1.1 (V2.1 §63.4) — the accordion toggle's own accessible name, distinct from the adjacent link's visible text. */
  disclosureAccessibleName: { products: string; services: string };
  phoneSrLabel: string;
  languageSrLabel: string;
  ctaLabel: string;
  closeLabel: string;
  /** The <nav> landmark's own name — deliberately the SAME name the desktop <nav> uses (never both exposed at once). */
  navLabel: string;
  /** The modal dialog panel's own name — deliberately DIFFERENT from `navLabel` (addendum §4: both are simultaneously exposed while open, so their purposes must be distinguishable). */
  drawerLabel: string;
}) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [openAccordion, setOpenAccordion] = useState<"products" | "services" | null>(null);

  // Route change closes the drawer (§55.13).
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Background scroll lock while open (§55.11).
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Focus the close button on open; restore focus to the trigger on close (§55.12, §58.17).
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes; Tab is contained within the drawer (a lightweight manual
  // focus trap — no new dependency, matching this Header's "no heavy
  // animation/dependency framework" direction, §58.23).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const unprefixedPath = stripLocalePrefix(pathname, locale);
  const direction = localeConfig[locale].direction;
  const sideClass = direction === "rtl" ? "right-0" : "left-0";
  const translateClosed = direction === "rtl" ? "translate-x-full" : "-translate-x-full";

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn("fixed inset-0 z-40 bg-black/40 transition-opacity motion-reduce:transition-none lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={drawerLabel}
        inert={!open}
        className={cn(
          "bg-background fixed inset-y-0 z-50 flex w-[min(88vw,360px)] flex-col shadow-[0_0_32px_rgba(11,37,69,0.2)] transition-transform duration-200 motion-reduce:transition-none lg:hidden",
          sideClass,
          open ? "translate-x-0" : translateClosed,
        )}
      >
        <div className="border-border flex h-18 shrink-0 items-center justify-between border-b px-4">
          <span className="text-navy text-sm font-extrabold tracking-[0.06em]">{localeConfig[locale].label}</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="border-border text-navy hover:border-navy inline-flex size-11 items-center justify-center border transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={navLabel} className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="divide-border divide-y">
            {links.map((link) => {
              const href = localizedPath(locale, link.path);
              // Addendum §8: exact-route match only — a child route (e.g.
              // a product detail page) must never mark /products as
              // aria-current here either, matching the same precision the
              // desktop nav applies.
              const isCurrentPage = pathname === href;
              if (link.hasDropdown) {
                const key = link.path === "/products" ? "products" : "services";
                // Normalized to a single {code, name, href} shape here — the
                // two source types (HeaderProductFamilyShortcut / PublicProcessingGroup)
                // are never mixed generically in the JSX below. Services has
                // no per-group route yet (P6 §8) — every group links to the
                // same real `href` (this item's own `/services` link),
                // matching SiteHeader.tsx's identical desktop-dropdown choice.
                const items: { code: string; name: string; href: string }[] =
                  key === "products"
                    ? productFamilies.map((f) => ({ code: f.code, name: f.name, href: `${href}?group=${f.code}` })) // see SiteHeader.tsx's comment on the same query-key choice
                    : serviceGroups.map((g) => ({ code: g.id, name: g.name, href }));
                const isOpen = openAccordion === key;
                return (
                  <li key={link.path}>
                    <div className="flex items-stretch">
                      <Link href={href} aria-current={isCurrentPage ? "page" : undefined} className="text-navy flex-1 py-4 text-base font-semibold">
                        {link.label}
                      </Link>
                      {items.length > 0 && (
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={key === "products" ? disclosureAccessibleName.products : disclosureAccessibleName.services}
                          onClick={() => setOpenAccordion(isOpen ? null : key)}
                          className="text-muted-foreground flex min-w-11 items-center justify-center"
                        >
                          <ChevronDown className={cn("size-5 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {items.length > 0 && (
                      <div hidden={!isOpen} className="pb-3 ps-4">
                        <ul className="space-y-1">
                          {items.map((item) => (
                            <li key={item.code}>
                              <Link href={item.href} className="text-muted-foreground hover:text-navy block py-2 text-sm">
                                {item.name}
                              </Link>
                            </li>
                          ))}
                          <li>
                            <Link href={href} className="text-copper block py-2 text-sm font-semibold">
                              {key === "products" ? viewAllProductsLabel : viewAllServicesLabel}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </li>
                );
              }
              return (
                <li key={link.path}>
                  <Link href={href} aria-current={isCurrentPage ? "page" : undefined} className="text-navy block py-4 text-base font-semibold">
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <a href={`tel:${CONTACT_PHONE_E164}`} aria-label={phoneSrLabel} className="text-navy border-border mt-4 flex min-h-11 items-center gap-2 border-t py-4 text-sm font-medium">
            <Phone className="text-copper size-4" aria-hidden="true" />
            {CONTACT_PHONE_E164}
          </a>

          {/* role="group" is required here — aria-label on a plain <div> with
              no ARIA role has no accessibility effect (it isn't exposed as a
              name to assistive tech without a naming-capable role). */}
          <div role="group" className="border-border mt-2 flex items-center gap-4 border-t py-4 text-sm" aria-label={languageSrLabel}>
            {locales.map((code) => (
              <Link
                key={code}
                href={localizedPath(code, unprefixedPath)}
                aria-current={code === locale ? "true" : undefined}
                className={cn("flex min-h-11 items-center", code === locale ? "text-navy font-semibold" : "text-muted-foreground hover:text-navy")}
              >
                {localeConfig[code].label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-border shrink-0 border-t p-4">
          {/* Header V2.2 §85.2: the drawer Primary CTA uses the same Shared
              Button primitive as the desktop CTA — width:100% is the only
              composition difference allowed. */}
          <ButtonLink href={localizedPath(locale, "/request")} variant="primary" size="button" className="w-full">
            {ctaLabel}
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
