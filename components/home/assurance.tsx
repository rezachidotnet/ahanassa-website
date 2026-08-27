import Image from "next/image";
import { SectionHeading } from "@/components/ui/section-heading";
import { homepageCopy } from "@/lib/content/homepage";
import type { Locale } from "@/config/locales";

/**
 * Assurance / evaluation method — visual pattern matches
 * ahanassa-v0/components/home/assurance.tsx (image with an overlay badge,
 * definition list of checks on the other side). v0's badge showed a
 * fabricated "99.4%" figure and its checklist named specific third-party
 * inspection agencies Ahan Asa has no confirmed relationship with; both are
 * replaced with the same honest, non-numeric evaluation-method content used
 * previously (no verified project evidence exists yet — HOMEPAGE_SPEC.md
 * §14.4 — so this stays a transparent process explanation, not fabricated
 * proof). DOCUMENT_AUDIT_REPORT.md DAR-020.
 */
export function Assurance({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].assurance;

  return (
    <section className="border-border bg-surface border-b py-20 lg:py-28">
      <div className="container-x grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div className="relative aspect-4/5 overflow-hidden lg:aspect-4/3">
          <Image src="/images/ops/warehouse.png" alt="" aria-hidden="true" fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" />
          <div className="bg-navy absolute bottom-0 left-0 px-7 py-6">
            <p className="text-lg leading-snug font-bold text-white">{t.badge}</p>
          </div>
        </div>

        <div>
          <SectionHeading eyebrow={t.eyebrow} title={t.title} body={t.body} />
          <dl className="divide-border border-border mt-10 divide-y border-y">
            {t.points.map((point, i) => (
              <div key={point} className="grid gap-1 py-4 sm:grid-cols-5 sm:gap-6">
                <dt className="text-navy text-sm font-semibold sm:col-span-1">{String(i + 1).padStart(2, "0")}</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed sm:col-span-4">{point}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
