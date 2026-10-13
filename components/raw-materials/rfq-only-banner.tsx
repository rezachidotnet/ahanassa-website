import { localizedPath, type Locale } from "@/config/locales";
import { ButtonLink } from "@/components/ui/button";
import { RAW_MATERIALS_UI } from "@/lib/content/raw-materials";

/**
 * W16.3 — the RFQ-only banner every raw-material page carries (owner D-COMPANY-INFO: raw materials are
 * RFQ-only, per ton, never priced): no price, only the request path.
 */
export function RfqOnlyBanner({ locale }: { locale: Locale }) {
  const t = RAW_MATERIALS_UI[locale];
  return (
    <aside aria-label={t.bannerTitle} data-aa-rfq-only="" className="border-copper bg-background rounded-[var(--aa-radius-card)] border-s-4 p-5 shadow-[var(--aa-shadow-sm)]">
      <p className="text-navy font-bold">{t.bannerTitle}</p>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t.bannerBody}</p>
      <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" size="md" className="mt-4 h-auto min-h-12 py-3">
        {t.cta}
      </ButtonLink>
    </aside>
  );
}
