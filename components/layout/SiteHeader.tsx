import Image from "next/image";
import { locales, localeConfig, localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";

interface SiteHeaderProps {
  locale: Locale;
}

/**
 * Structural header shell only — brand mark and a minimal locale switcher.
 * Full navigation (HEADER_NAVIGATION_SPEC.md) is implemented alongside the
 * approved homepage visual reference in Phase 2, not here.
 */
export function SiteHeader({ locale }: SiteHeaderProps) {
  return (
    <header className="border-b border-[var(--aa-color-border-subtle)] bg-[var(--aa-color-bg-canvas)]">
      <div className="mx-auto flex max-w-[var(--aa-container-max)] items-center justify-between gap-4 px-[var(--aa-page-gutter)] py-4">
        <a
          href={localizedPath(locale, "/")}
          className="flex items-center gap-3 font-semibold text-[var(--aa-color-text-brand)]"
        >
          <Image
            src="/brand/ahan-asa-mark.jpg"
            alt={siteConfig.name}
            width={36}
            height={36}
            className="rounded-[var(--aa-radius-xs)]"
            priority
          />
          <span>{siteConfig.name}</span>
        </a>

        <nav aria-label="Language" className="flex items-center gap-3 text-sm">
          {locales.map((code) => (
            <a
              key={code}
              href={localizedPath(code, "/")}
              aria-current={code === locale ? "true" : undefined}
              className="text-[var(--aa-color-text-secondary)] aria-[current=true]:font-semibold aria-[current=true]:text-[var(--aa-color-text-brand)]"
            >
              {localeConfig[code].label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
