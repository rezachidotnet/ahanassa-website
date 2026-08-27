import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { marketsCopy } from "@/lib/content/pages";
import { PageHero } from "@/components/ui/page-hero";
import { CtaBand } from "@/components/ui/cta-band";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = marketsCopy[locale];
  return buildPageMetadata({ locale, path: "/markets", title: t.hero.title, description: t.hero.body, indexable: false });
}

export default async function MarketsPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = marketsCopy[locale];

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t.hero.eyebrow}
        title={t.hero.title}
        body={t.hero.body}
        image="/images/ops/port-loading.png"
        breadcrumb={[{ path: "/markets", label: t.hero.eyebrow }]}
      />

      <section className="border-border bg-background border-b py-20 lg:py-28">
        <div className="container-x max-w-2xl">
          <h2 className="text-navy text-2xl font-bold">{t.scopeTitle}</h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">{t.scopeBody}</p>
        </div>
      </section>

      <section className="border-border bg-surface border-b py-20 lg:py-28">
        <div className="container-x">
          <h2 className="text-navy text-lg font-bold">{t.industriesTitle}</h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {t.industries.map((s) => (
              <li key={s} className="border-border bg-background text-navy-600 border px-3 py-1.5 text-xs font-medium">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand locale={locale} />
    </>
  );
}
