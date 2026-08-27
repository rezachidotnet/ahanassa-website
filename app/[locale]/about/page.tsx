import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { aboutCopy } from "@/lib/content/pages";
import { PageHero } from "@/components/ui/page-hero";
import { CtaBand } from "@/components/ui/cta-band";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = aboutCopy[locale];
  return buildPageMetadata({ locale, path: "/about", title: t.hero.title, description: t.hero.body, indexable: false });
}

export default async function AboutPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = aboutCopy[locale];

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t.hero.eyebrow}
        title={t.hero.title}
        body={t.hero.body}
        image="/images/ops/mill-exterior.png"
        breadcrumb={[{ path: "/about", label: t.hero.eyebrow }]}
      />

      <section className="border-border bg-background border-b py-20 lg:py-28">
        <div className="container-x max-w-3xl space-y-5 text-base leading-relaxed text-muted-foreground">
          <h2 className="text-navy text-2xl font-bold">{t.roleTitle}</h2>
          {t.roleBody.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      <section className="border-border bg-surface border-b py-20 lg:py-28">
        <div className="container-x grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="text-navy text-lg font-bold">{t.isTitle}</h2>
            <ul className="mt-5 space-y-3">
              {t.isItems.map((item) => (
                <li key={item} className="text-muted-foreground border-border border-t pt-3 text-sm leading-relaxed first:border-t-0 first:pt-0">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-navy text-lg font-bold">{t.notTitle}</h2>
            <ul className="mt-5 space-y-3">
              {t.notItems.map((item) => (
                <li key={item} className="text-muted-foreground border-border border-t pt-3 text-sm leading-relaxed first:border-t-0 first:pt-0">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CtaBand locale={locale} />
    </>
  );
}
