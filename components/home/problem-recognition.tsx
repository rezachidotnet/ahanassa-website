import { SectionHeading } from "@/components/ui/section-heading";
import { homepageCopy } from "@/lib/content/homepage";
import type { Locale } from "@/config/locales";

/**
 * Problem Recognition — HOMEPAGE_SPEC.md §10. Editorial statement plus a
 * document-like grouped list (not eight identical floating cards, per
 * §10.3).
 */
export function ProblemRecognition({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].problem;

  return (
    <section className="border-border bg-surface border-b py-20 lg:py-28">
      <div className="container-x">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} body={t.body} />

        <div className="border-border mt-14 grid gap-px border-t border-s sm:grid-cols-3">
          {t.groups.map((group) => (
            <div key={group.title} className="border-border bg-background border-e border-b p-7">
              <h3 className="text-navy text-sm font-bold tracking-wide">{group.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item} className="text-muted-foreground border-border border-t pt-2.5 text-sm leading-relaxed first:border-t-0 first:pt-0">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-navy mt-10 max-w-2xl text-base leading-relaxed font-medium">{t.transition}</p>
      </div>
    </section>
  );
}
