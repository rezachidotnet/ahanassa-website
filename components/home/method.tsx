import { SectionHeading } from "@/components/ui/section-heading";
import { homepageCopy } from "@/lib/content/homepage";
import type { Locale } from "@/config/locales";

/**
 * Evidence & Trust section (HOMEPAGE_SPEC.md §14), rendered as the
 * transparent-methodology fallback per §14.4: no verified project evidence
 * exists yet, so this renders an honest process explanation rather than
 * fabricated cases, testimonials, or a zero-value counter.
 */
export function Method({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].method;

  return (
    <section className="border-border bg-background border-b py-20 lg:py-28">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} body={t.body} />
        </div>
        <ul className="border-border divide-border divide-y border-y text-sm lg:col-span-7">
          {t.points.map((point) => (
            <li key={point} className="text-navy-600 py-5 leading-relaxed">
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
