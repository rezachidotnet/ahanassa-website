"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Phone } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { navLinks, primaryCta, headerPhoneLabel, dropdownViewAllLabel, dropdownDisclosureAccessibleName } from "@/lib/content/nav";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { HeaderNavDisclosure } from "@/components/layout/header-nav-disclosure";
import { HeaderLanguageSelector } from "@/components/layout/header-language-selector";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import type { HeaderProductFamilyShortcut } from "@/lib/catalog/editorial-repository";
import type { PublicProcessingGroup } from "@/lib/processing/public-repository";
import { cn } from "@/lib/utils";

/**
 * `nav` is reused for BOTH the desktop `<nav>` and the mobile drawer's
 * `<nav>` (accessibility addendum §4: "Do not label navigation solely by
 * device class such as 'Desktop navigation' or 'Mobile navigation'") — they
 * represent the same conceptual primary site navigation, presented
 * differently, and (per CSS `hidden`/`inert` state) are never both exposed
 * to the accessibility tree at the same time regardless.
 */
const menuLabel: Record<Locale, { open: string; close: string; nav: string; drawer: string; language: string }> = {
  // `nav` and `drawer` are deliberately distinct (addendum §4: when both
  // are simultaneously exposed to the accessibility tree — the drawer
  // open, containing the nav — their purposes must remain distinguishable,
  // not identically-labeled) — `drawer` names the modal panel itself,
  // `nav` names the navigation landmark inside it (the same landmark name
  // the desktop <nav> also uses, since they're never both exposed at once).
  fa: { open: "باز کردن منو", close: "بستن منو", nav: "ناوبری اصلی", drawer: "منوی ناوبری سایت", language: "زبان" },
  en: { open: "Open menu", close: "Close menu", nav: "Main navigation", drawer: "Site navigation menu", language: "Language" },
  ar: { open: "فتح القائمة", close: "إغلاق القائمة", nav: "التنقل الرئيسي", drawer: "قائمة تنقل الموقع", language: "اللغة" },
};

/**
 * Global site Header — implements docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md
 * (Version 2.1, fully frozen). One shared implementation for fa/ar (RTL)
 * and en (LTR), §43.9/§58.7 — no locale-specific Header variants.
 *
 * `productFamilies`/`serviceGroups` are both fetched server-side
 * (`app/[locale]/layout.tsx` — Public Product Projection §4.3/§58.2 and
 * Public Processing Projection §26/§52.6/§58.3 respectively) and passed in
 * as props — this component never fetches Products/Services data itself,
 * on mount or on dropdown open (§52.8/§58.4/§58.23).
 */
export function SiteHeader({
  locale,
  productFamilies,
  serviceGroups,
}: {
  locale: Locale;
  productFamilies: HeaderProductFamilyShortcut[];
  serviceGroups: PublicProcessingGroup[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const t = menuLabel[locale];
  const links = navLinks[locale];
  const viewAllLabels = dropdownViewAllLabel[locale];
  const disclosureNames = dropdownDisclosureAccessibleName[locale];

  useEffect(() => {
    // A modest scroll threshold before the compact state activates (§49.2:
    // "after a modest amount of scroll rather than immediately at the first
    // pixel") — 24px, not the previous implementation's 8px.
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Accessibility addendum §7: while the modal drawer is open, everything
  // OUTSIDE it must stop being reachable — not just visually covered by the
  // overlay. Tab-key focus is already contained inside the drawer
  // (mobile-nav-drawer.tsx's own trap), but a screen reader's browse-mode
  // virtual cursor does not go through Tab at all, so the rest of the page
  // (<main>, <footer>) is marked `inert` directly here too — this
  // component doesn't render either of those (they live in
  // app/[locale]/layout.tsx), so they're reached via a stable DOM query
  // rather than a prop. The Header's own nav/utility content is handled
  // below via `inert={mobileOpen}` directly on <header>.
  useEffect(() => {
    const main = document.getElementById("main-content");
    const footer = document.querySelector("footer");
    if (mobileOpen) {
      main?.setAttribute("inert", "");
      footer?.setAttribute("inert", "");
    } else {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
    }
    return () => {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
    };
  }, [mobileOpen]);

  // `?group=` — HeaderProductFamilyShortcut.code is a product_variants.group_code
  // value (e.g. "REBAR"), which lib/catalog/catalog-filters.ts#parseCatalogFilterParams
  // maps from the `group` query key, NOT `family` (a distinct, broader
  // classification level, e.g. "LONG_PRODUCTS") — using the wrong key here
  // would silently filter the real /products listing down to zero results.
  const productItems = productFamilies.map((f) => ({ code: f.code, name: f.name, path: `/products?group=${f.code}` }));
  // No `/services/<slug>` route exists yet (P6 §8, deliberately deferred —
  // do not fabricate one here); every group links to the same real,
  // existing `/services` destination, matching `productItems`'s own
  // unprefixed-path convention immediately above exactly (this component
  // does not `localizedPath()`-wrap dropdown item hrefs for either
  // Products or Services — an existing, pre-P6 convention, left unchanged
  // rather than introduced net-new here).
  const serviceItems = serviceGroups.map((g) => ({ code: g.id, name: g.name, path: "/services" }));

  return (
    <>
      <header
        // Addendum §7: while the modal drawer is open, the rest of the
        // Header (including its own trigger button) becomes non-
        // interactive/non-exposed to AT, matching how <main>/<footer> are
        // handled above. This also correctly inerts the trigger button
        // itself while open — harmless, since the drawer has its own close
        // button, and React removes this `inert` attribute (on close,
        // before MobileNavDrawer's own effect runs `triggerRef.current?.focus()`)
        // in the same commit that closes the drawer, so focus restoration
        // still lands on a focusable trigger.
        inert={mobileOpen}
        className={cn(
          "bg-background sticky top-0 z-50 border-b transition-[height,box-shadow] duration-[180ms] motion-reduce:transition-none",
          scrolled ? "border-border shadow-[0_2px_8px_-4px_rgba(11,37,69,0.12)]" : "border-border/60",
        )}
      >
        {/* Header shell height: 80px default / ~68px compact scrolled (desktop, §46.1/§46.3/§58.5); 72px fixed on mobile (§46.2, below `lg`). */}
        <div className={cn("container-x flex items-center justify-between gap-4 transition-[height] duration-[180ms] motion-reduce:transition-none", "h-[72px] lg:h-20", scrolled && "lg:h-[68px]")}>
          <Link href={localizedPath(locale, "/")} aria-label={siteConfig.name} className="flex shrink-0 items-center gap-2.5">
            {/* No official horizontal lockup asset exists in this repository yet
                (verified: only a square mark, public/brand/ahan-asa-mark.jpg —
                identical files under logo/ confirm no separate wordmark
                lockup exists either) — the frozen spec's §46.4/§58.5 exact
                horizontal-lockup width targets (~140px/~128px) could not be
                met as specified; this is a documented, reported gap (see
                the implementation report), not a silent substitution. The
                existing mark+name combination (already live in production)
                is preserved at a size appropriate to the frozen 80px/68px
                header height, in place of the unavailable asset. */}
            <Image
              src="/brand/ahan-asa-mark.jpg"
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              priority
              className={cn("rounded-[var(--aa-radius-xs)] transition-[width,height] duration-[180ms] motion-reduce:transition-none", scrolled ? "lg:size-9" : "lg:size-10")}
            />
            <span className="text-navy hidden text-[15px] font-extrabold tracking-[0.06em] sm:inline">{siteConfig.name}</span>
          </Link>

          <nav aria-label={t.nav} className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const href = localizedPath(locale, link.path);
              // Addendum §8: `aria-current="page"` is reserved for the
              // EXACT current page only — visiting a child route (e.g. a
              // real product detail page under /products/[slug]) must not
              // mark the /products nav item as aria-current, even though
              // it correctly still gets a visual active-section treatment.
              // Two separate booleans, deliberately not conflated.
              const isCurrentPage = pathname === href;
              const isActiveSection = isCurrentPage || pathname.startsWith(`${href}/`);
              if (link.hasDropdown) {
                const items = link.path === "/products" ? productItems : serviceItems;
                const viewAllLabel = link.path === "/products" ? viewAllLabels.products : viewAllLabels.services;
                const disclosureLabel = link.path === "/products" ? disclosureNames.products : disclosureNames.services;
                return (
                  <HeaderNavDisclosure
                    key={link.path}
                    href={href}
                    label={link.label}
                    disclosureLabel={disclosureLabel}
                    isCurrentPage={isCurrentPage}
                    isActiveSection={isActiveSection}
                    items={items}
                    viewAllLabel={viewAllLabel}
                  />
                );
              }
              return (
                <Link
                  key={link.path}
                  href={href}
                  aria-current={isCurrentPage ? "page" : undefined}
                  className={cn("relative px-3.5 py-2 text-sm font-medium transition-colors", isActiveSection ? "text-navy" : "text-muted-foreground hover:text-navy")}
                >
                  {link.label}
                  {isActiveSection && <span className="bg-copper absolute inset-x-3.5 -bottom-px h-0.5" aria-hidden="true" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 lg:gap-4">
            {/* Verified phone utility (§37.3-37.4/§46.13/§58.21) — one
                source (lib/content/contact-channels.ts), uniform across
                fa/en/ar; low-weight, never a second CTA. WhatsApp is
                deliberately NOT a Header utility (§37.5) — untouched
                elsewhere (e.g. the homepage hero CTA). A single breakpoint
                (`lg`) switches the whole shell between the mobile top bar
                (Logo/Phone-icon/Menu, §46.15/§58.16) and the desktop shell
                (Nav/Phone-text/Language/CTA) — using a different breakpoint
                for phone/language than for nav/CTA/hamburger would leave a
                broken overlapping state in the tablet range. */}
            <a href={`tel:${CONTACT_PHONE_E164}`} aria-label={headerPhoneLabel[locale].srLabel} className="text-navy inline-flex size-11 items-center justify-center lg:hidden">
              <Phone className="size-5" aria-hidden="true" />
            </a>
            <a
              href={`tel:${CONTACT_PHONE_E164}`}
              aria-label={headerPhoneLabel[locale].srLabel}
              className="text-muted-foreground hover:text-navy hidden items-center gap-1.5 text-sm font-medium transition-colors lg:inline-flex"
              dir="ltr"
            >
              <Phone className="size-4" aria-hidden="true" />
              {CONTACT_PHONE_E164}
            </a>

            <div className="hidden lg:block">
              <HeaderLanguageSelector locale={locale} srLabel={t.language} />
            </div>

            {/* Addendum §2 (contrast gate): the codebase's own established
                hover:bg-copper-400 (a LIGHTER tint, ~3.2:1 white-text
                contrast) fails WCAG 2.2 AA's 4.5:1 normal-text requirement
                — verified by computing the actual color-mix result, not
                assumed. That pattern predates this task (components/ui/button.tsx's
                own "default" variant, and several pre-existing site
                components) and is out of this Header-scoped task's blast
                radius to fix globally; see the implementation report for
                that as a separate sitewide follow-up. Locally, within the
                3 spots this task authored (this CTA, the mobile drawer's
                CTA, and the dropdown "view all" link), a DARKER hover
                value is used instead — the same
                --aa-color-action-accent-bg-hover token already defined in
                styles/tokens.css (7:1 vs white, comfortably passes) — which
                also happens to increase, not decrease, contrast on hover,
                unlike the lighter tint. */}
            <Link
              href={localizedPath(locale, "/request")}
              className="bg-copper hover:bg-[var(--aa-color-action-accent-bg-hover)] hidden h-12 items-center px-5 text-[13px] font-semibold tracking-wide text-white transition-colors lg:inline-flex"
            >
              {primaryCta[locale].full}
            </Link>

            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={t.open}
              className="border-border text-navy hover:border-navy inline-flex size-11 items-center justify-center border transition-colors lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MobileNavDrawer
        locale={locale}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        triggerRef={menuTriggerRef}
        links={links}
        productFamilies={productFamilies}
        serviceGroups={serviceGroups}
        viewAllProductsLabel={viewAllLabels.products}
        viewAllServicesLabel={viewAllLabels.services}
        disclosureAccessibleName={disclosureNames}
        phoneSrLabel={headerPhoneLabel[locale].srLabel}
        languageSrLabel={t.language}
        ctaLabel={primaryCta[locale].full}
        closeLabel={t.close}
        navLabel={t.nav}
        drawerLabel={t.drawer}
      />
    </>
  );
}
