import { SectionHeading } from "@/components/ui/section-heading";
import { Accordion } from "@/components/ui/accordion";
import { homepageCopy } from "@/lib/content/homepage";
import type { Locale } from "@/config/locales";

/** FAQ — HOMEPAGE_SPEC.md §18. No guaranteed price/delivery/response-time claims. */
export function Faq({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].faq;

  return (
    <section className="border-border bg-background border-b py-20 lg:py-28">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} />
        </div>
        <div className="lg:col-span-8">
          <Accordion items={t.items} />
        </div>
      </div>
    </section>
  );
}
