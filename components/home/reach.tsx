import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { homepageCopy } from "@/lib/content/homepage";
import { marketsCopy } from "@/lib/content/pages";
import { localizedPath, type Locale } from "@/config/locales";

/**
 * Reach ("markets") — visual pattern matches
 * ahanassa-v0/components/home/reach.tsx (heading + list on one side, large
 * image + card grid on the other). v0's card grid listed fabricated
 * country/region coverage; this uses the same confirmed industries list
 * shown on /markets instead of inventing geographic reach.
 * DOCUMENT_AUDIT_REPORT.md DAR-020.
 */
export function Reach({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].reach;
  const m = marketsCopy[locale];

  return (
    <section className="border-border bg-background border-b py-20 lg:py-28">
      <div className="container-x">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading eyebrow={t.eyebrow} title={t.title} body={t.body} />

            <Link href={localizedPath(locale, "/markets")} className="group text-navy mt-10 inline-flex items-center gap-2 border-b-2 border-navy pb-1.5 text-sm font-semibold">
              {t.cta}
              <ArrowUpRight className="size-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div className="relative aspect-16/9 overflow-hidden">
              <Image src="/images/ops/port-loading.png" alt="" aria-hidden="true" fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
            </div>
            <ul className="border-border mt-px grid gap-px border-s sm:grid-cols-2">
              {m.industries.map((industry, i) => (
                <Reveal as="li" key={industry} delay={i * 50}>
                  <div className="border-border h-full border-e border-b p-6">
                    <h3 className="text-navy text-sm font-bold tracking-wide">{industry}</h3>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
