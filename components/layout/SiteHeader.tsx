"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { locales, localeConfig, localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { navLinks, primaryCta } from "@/lib/content/nav";
import { cn } from "@/lib/utils";

const menuLabel: Record<Locale, { open: string; close: string; nav: string; mobileNav: string; language: string }> = {
  fa: { open: "باز کردن منو", close: "بستن منو", nav: "منوی اصلی", mobileNav: "منوی موبایل", language: "زبان" },
  en: { open: "Open menu", close: "Close menu", nav: "Main menu", mobileNav: "Mobile menu", language: "Language" },
  ar: { open: "فتح القائمة", close: "إغلاق القائمة", nav: "القائمة الرئيسية", mobileNav: "قائمة الجوال", language: "اللغة" },
};

/**
 * Global site header — two-tier composition matches
 * ahanassa-v0/components/site-header.tsx (a dark utility strip above a
 * sticky main header with logo/nav/CTA). v0's utility strip carried
 * fabricated phone/email; this uses the confirmed brand tagline and the
 * locale switcher instead (PROJECT_OVERRIDES.md §8b / DOCUMENT_AUDIT_REPORT.md
 * DAR-020/DAR-021). Full disclosure sub-navigation is deferred — no
 * approved sub-nav content exists yet (HEADER_NAVIGATION_SPEC.md).
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = menuLabel[locale];
  const links = navLinks[locale];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="bg-navy hidden text-white/70 lg:block">
        <div className="container-x flex h-9 items-center justify-between text-[11px] tracking-wide">
          <p>{siteConfig.tagline}</p>
          <nav aria-label={t.language} className="flex items-center gap-5">
            {locales.map((code) => (
              <Link
                key={code}
                href={localizedPath(code, pathname_stripLocale(pathname, locale))}
                aria-current={code === locale ? "true" : undefined}
                className={cn("transition-colors hover:text-white", code === locale && "font-semibold text-white")}
              >
                {localeConfig[code].label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <header
        className={cn(
          "bg-background/95 sticky top-0 z-50 border-b backdrop-blur transition-shadow",
          scrolled ? "border-border shadow-sm" : "border-transparent",
        )}
      >
        <div className="container-x flex h-18 items-center justify-between gap-4">
          <Link href={localizedPath(locale, "/")} aria-label={siteConfig.name} className="flex shrink-0 items-center gap-2.5">
            <Image src="/brand/ahan-asa-mark.jpg" alt="" aria-hidden="true" width={36} height={36} className="rounded-[var(--aa-radius-xs)]" priority />
            <span className="text-navy hidden text-[15px] font-extrabold tracking-[0.06em] sm:inline">{siteConfig.name}</span>
          </Link>

          <nav aria-label={t.nav} className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const href = localizedPath(locale, link.path);
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={link.path}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "text-navy" : "text-muted-foreground hover:text-navy",
                  )}
                >
                  {link.label}
                  {active && <span className="bg-copper absolute inset-x-3.5 -bottom-px h-0.5" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={localizedPath(locale, "/contact")}
              className="bg-copper hover:bg-copper-400 hidden items-center gap-2 px-5 py-3 text-[13px] font-semibold tracking-wide text-white transition-colors sm:inline-flex"
            >
              <span className="lg:hidden">{primaryCta[locale].compact}</span>
              <span className="hidden lg:inline">{primaryCta[locale].full}</span>
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t.close : t.open}
              className="border-border text-navy hover:border-navy inline-flex size-11 items-center justify-center border transition-colors lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/*
       * Deliberately a sibling of <header>, not a descendant: <header> has
       * backdrop-blur (backdrop-filter), which per spec creates a new
       * containing block for `position: fixed` descendants — nesting this
       * drawer inside <header> would confine its fixed positioning to the
       * header's own ~72px box instead of the full viewport.
       */}
      <div id="mobile-nav" hidden={!open} className="bg-navy fixed inset-x-0 top-18 bottom-0 z-40 lg:hidden">
        <nav aria-label={t.mobileNav} className="container-x flex flex-col pt-6">
          {links.map((link, i) => (
            <Link
              key={link.path}
              href={localizedPath(locale, link.path)}
              className="flex items-baseline justify-between border-b border-white/10 py-5 text-2xl font-bold text-white"
            >
              {link.label}
              <span className="eyebrow text-copper-400">{String(i + 1).padStart(2, "0")}</span>
            </Link>
          ))}
          <Link href={localizedPath(locale, "/contact")} className="bg-copper mt-8 px-6 py-4 text-center text-sm font-semibold tracking-wide text-white">
            {primaryCta[locale].full}
          </Link>
          <div className="mt-8 flex items-center gap-4 text-sm text-white/60">
            {locales.map((code) => (
              <Link key={code} href={localizedPath(code, pathname_stripLocale(pathname, locale))} className="hover:text-white">
                {localeConfig[code].label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}

/** Strips the current locale's URL prefix so the locale switcher can rebuild the path for another locale. */
function pathname_stripLocale(pathname: string, locale: Locale): string {
  const prefix = localeConfig[locale].urlPrefix;
  if (prefix && pathname.startsWith(prefix)) {
    const rest = pathname.slice(prefix.length);
    return rest || "/";
  }
  return pathname || "/";
}
