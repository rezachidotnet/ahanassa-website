import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { industriesCopy } from "@/lib/content/pages";
import { PageHero } from "@/components/ui/page-hero";
import { CtaBand } from "@/components/ui/cta-band";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = industriesCopy[locale];
  return buildPageMetadata({ locale, path: "/industries", title: t.hero.title, description: t.hero.body, indexable: false });
}

/**
 * Industries — supersedes `/markets` as the canonical primary-nav
 * destination (AHANASSA_HEADER_FINAL_FROZEN_V2.0.md §32). `/markets` itself
 * is untouched and still reachable; this page reuses its real industries
 * list content, promoted to a properly separated, conceptually distinct
 * route rather than left duplicated only inside the geographic Markets page.
 */
export default async function IndustriesPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = industriesCopy[locale];

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t.hero.eyebrow}
        title={t.hero.title}
        body={t.hero.body}
        image="/images/ops/warehouse.png"
        breadcrumb={[{ path: "/industries", label: t.hero.eyebrow }]}
      />

      <section className="border-border bg-surface border-b py-20 lg:py-28">
        <div className="container-x">
          <h2 className="text-navy text-lg font-bold">{t.listTitle}</h2>
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
