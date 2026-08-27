import { SectionHeading } from "@/components/ui/section-heading";
import { Accordion } from "@/components/ui/accordion";
import { contactFaq } from "@/lib/content/pages";
import type { Locale } from "@/config/locales";

/**
 * FAQ — moved from the homepage to the contact page (DAR-021: homepage
 * composition now follows the approved v0 implementation, which has no FAQ
 * section). No guaranteed price/delivery/response-time claims.
 */
export function FaqSection({ locale }: { locale: Locale }) {
  const t = contactFaq[locale];

  return (
    <section className="border-border bg-surface border-b py-20 lg:py-28">
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
