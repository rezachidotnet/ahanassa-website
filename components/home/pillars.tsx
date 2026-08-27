import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { homepageCopy } from "@/lib/content/homepage";
import type { Locale } from "@/config/locales";

/**
 * Protection Pillars — HOMEPAGE_SPEC.md §13. Structured DefinitionList
 * treatment rather than four equal icon cards (§13.3); claims stay scoped
 * to operating intent, no absolute guarantees (§13.4).
 */
export function Pillars({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].pillars;

  return (
    <section className="bg-navy relative isolate overflow-hidden py-20 lg:py-28">
      <div className="hairline-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-x relative">
        <SectionHeading invert eyebrow={t.eyebrow} title={t.title} align="center" className="mx-auto" />

        <dl className="mt-14 grid gap-px border-t border-s border-white/10 sm:grid-cols-2">
          {t.items.map((item, i) => (
            <Reveal as="div" key={item.title} delay={i * 70}>
              <div className="h-full border-e border-b border-white/10 p-8">
                <dt className="text-lg font-bold text-white">{item.title}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-white/60">{item.body}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
