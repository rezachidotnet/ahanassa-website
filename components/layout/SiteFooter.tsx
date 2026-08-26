import { siteConfig } from "@/lib/metadata/site";

/**
 * Structural footer shell only. Full footer content/links
 * (FOOTER_SPEC.md) — contact details, legal links, sitemap — is
 * implemented in a later phase; nothing here is fabricated content.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--aa-color-border-subtle)] bg-[var(--aa-color-bg-subtle)]">
      <div className="mx-auto max-w-[var(--aa-container-max)] px-[var(--aa-page-gutter)] py-8 text-sm text-[var(--aa-color-text-secondary)]">
        <p className="text-[var(--aa-color-text-brand)]">{siteConfig.tagline}</p>
        <p className="mt-2">
          © {year} {siteConfig.name} — {siteConfig.legalOwner}
        </p>
      </div>
    </footer>
  );
}
