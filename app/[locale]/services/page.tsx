import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { servicesCopy } from "@/lib/content/pages";
import { homepageCopy } from "@/lib/content/homepage";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { CtaBand } from "@/components/ui/cta-band";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = servicesCopy[locale];
  return buildPageMetadata({ locale, path: "/services", title: t.hero.title, description: t.hero.body, indexable: false });
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = servicesCopy[locale];
  const process = homepageCopy[locale].process;

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t.hero.eyebrow}
        title={t.hero.title}
        body={t.hero.body}
        image="/images/ops/truck-loading.png"
        breadcrumb={[{ path: "/services", label: t.hero.eyebrow }]}
      />

      <section className="border-border bg-background border-b py-20 lg:py-28">
        <div className="container-x">
          <ul className="border-border mt-2 grid gap-px border-t border-s sm:grid-cols-2">
            {t.functions.map((f, i) => (
              <Reveal as="li" key={f.title} delay={i * 60}>
                <div className="border-border bg-background hover:bg-surface h-full border-e border-b p-7 transition-colors">
                  <span className="text-surface-2 text-3xl font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-navy mt-4 text-lg font-bold">{f.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-navy border-border border-b py-20 lg:py-28">
        <div className="container-x">
          <SectionHeading invert eyebrow={process.eyebrow} title={process.title} body={process.body} />
          <ol className="mt-14 grid gap-px border-t border-s border-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {process.steps.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 60}>
                <div className="h-full border-e border-b border-white/10 p-7">
                  <div className="flex items-baseline gap-4">
                    <span className="text-3xl font-bold text-white/15">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">{step.activity}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand locale={locale} />
    </>
  );
}
