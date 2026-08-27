import { SectionHeading } from "@/components/ui/section-heading";
import { homepageCopy } from "@/lib/content/homepage";
import type { Locale } from "@/config/locales";

/**
 * Ahan Asa's Role — HOMEPAGE_SPEC.md §11. Paired-row comparison that stays
 * legible on narrow screens (not a raw <table>, per §11.3); the left column
 * is educational, never labeled "wrong" (§11.2).
 */
export function RoleClarification({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].role;

  return (
    <section className="border-border bg-background border-b py-20 lg:py-28">
      <div className="container-x">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} align="center" className="mx-auto" />

        <div className="border-border mt-14 grid overflow-hidden border sm:grid-cols-2">
          <div className="border-border bg-surface border-b px-6 py-4 text-sm font-bold text-navy-600 sm:border-e sm:border-b-0">
            {t.columnLeftTitle}
          </div>
          <div className="bg-navy px-6 py-4 text-sm font-bold text-white">{t.columnRightTitle}</div>

          {t.rows.map((row, i) => (
            <div key={i} className="contents">
              <div className="border-border text-muted-foreground border-t border-e-0 px-6 py-5 text-sm leading-relaxed sm:border-e">
                {row.left}
              </div>
              <div className="border-border bg-surface/40 text-navy border-t px-6 py-5 text-sm leading-relaxed font-medium">
                {row.right}
              </div>
            </div>
          ))}
        </div>

        <a href="#process" className="group text-navy mt-8 inline-flex items-center gap-2 border-b-2 border-navy pb-1.5 text-sm font-semibold">
          {t.cta}
        </a>
      </div>
    </section>
  );
}
