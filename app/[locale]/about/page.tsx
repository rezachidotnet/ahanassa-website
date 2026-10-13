import type { Metadata } from "next";
import Image from "next/image";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { ABOUT_COPY, ABOUT_PHOTOS } from "@/lib/content/about";
import { companyPhoneDisplay, GROUP_COMPANIES, OFFICES, sinceLabel, WORKING_HOURS_TEXT } from "@/lib/content/company";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { RAW_MATERIALS_ROUTE } from "@/lib/content/raw-materials";
import { EXPORT_ROUTE, isExportPublished } from "@/lib/content/export";
import { isWeightCalculatorPublished, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { cardVariants } from "@/components/ui/surface-variants";
import { CtaBand } from "@/components/ui/cta-band";

export { generateLocaleStaticParams as generateStaticParams } from "@/lib/static/locale-params";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = ABOUT_COPY[locale];
  // W16.3: keyword map §7.1 title/meta; absolute, since the title already names the brand.
  return buildPageMetadata({ locale, path: "/about", title: t.metaTitle, titleAbsolute: true, description: t.metaDescription, indexable: publicPageIndexable() });
}

const H2 = "text-navy text-2xl font-extrabold";
const LINK = "text-navy hover:text-copper underline underline-offset-4";

/**
 * W16.3 — the About page: the owner-approved text (lib/content/about.ts) and the shared company facts
 * (lib/content/company.ts: group, offices, phone, working hours). No price amount on any locale. Photos render
 * only when ABOUT_PHOTOS has entries (none supplied yet).
 */
export default async function AboutPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = ABOUT_COPY[locale];
  const offices = OFFICES[locale];
  const hours = WORKING_HOURS_TEXT[locale];
  const sep = locale === "en" ? ", " : "، ";

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.h1} image="/images/ops/mill-exterior.png" breadcrumb={[{ path: "/about", label: t.eyebrow }]} />

      <section aria-labelledby="about-intro" className="border-border bg-background border-b section-y">
        <div className="container-x max-w-3xl space-y-5 text-base leading-relaxed text-muted-foreground">
          <h2 id="about-intro" className={H2}>
            {t.introTitle}
          </h2>
          {t.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {ABOUT_PHOTOS.length > 0 && (
          <div className="container-x mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ABOUT_PHOTOS.map((photo) => (
              <Image key={photo.src} src={photo.src} width={photo.width} height={photo.height} alt={photo.alt[locale]} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="h-auto w-full rounded-[var(--aa-radius-card)] object-cover" />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="about-timeline" className="border-border bg-surface border-b section-y">
        <div className="container-x max-w-3xl">
          <h2 id="about-timeline" className={H2}>
            {t.timelineTitle}
          </h2>
          <div className="border-border bg-background mt-6 overflow-x-auto rounded-[var(--aa-radius-card)] border">
            <table className="w-full border-separate border-spacing-0 text-start text-sm">
              <thead>
                <tr>
                  <th scope="col" className="border-border text-muted-foreground border-b px-4 py-3 text-start text-xs font-bold whitespace-nowrap">
                    {t.timelineYear}
                  </th>
                  <th scope="col" className="border-border text-muted-foreground border-b px-4 py-3 text-start text-xs font-bold">
                    {t.timelineEvent}
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.timeline.map((row) => (
                  <tr key={row.year} className="group">
                    <th scope="row" className="text-navy border-b border-[var(--aa-color-neutral-100)] px-4 py-3 text-start align-top font-bold whitespace-nowrap group-last:border-b-0">
                      {row.year}
                    </th>
                    <td className="text-muted-foreground border-b border-[var(--aa-color-neutral-100)] px-4 py-3 leading-relaxed group-last:border-b-0">{row.event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-border bg-background border-b section-y">
        <div className="container-x grid gap-6 lg:grid-cols-2">
          {[
            { id: "about-supply", title: t.supplyTitle, items: t.supply },
            { id: "about-why", title: t.whyTitle, items: t.why },
          ].map((block) => (
            <div key={block.id} className={cardVariants({ variant: "panel" })}>
              <h2 id={block.id} className="text-navy text-xl font-extrabold">
                {block.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {block.items.map((item) => (
                  <li key={item.label} className="text-muted-foreground border-border border-t pt-3 text-sm leading-relaxed first:border-t-0 first:pt-0">
                    <strong className="text-navy font-bold">{item.label}:</strong> {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-platform" className="border-border bg-surface border-b section-y">
        <div className="container-x max-w-3xl space-y-5">
          <h2 id="about-platform" className={H2}>
            {t.platformTitle}
          </h2>
          <p className="text-muted-foreground leading-relaxed">{t.platform}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            {isWeightCalculatorPublished(locale) && (
              <li>
                <Link href={localizedPath(locale, WEIGHT_CALCULATOR_ROUTE)} className={LINK}>
                  {t.links.calculator}
                </Link>
              </li>
            )}
            <li>
              <Link href={localizedPath(locale, RAW_MATERIALS_ROUTE)} className={LINK}>
                {t.links.rawMaterials}
              </Link>
            </li>
            {t.links.export && isExportPublished(locale) && (
              <li>
                <Link href={localizedPath(locale, EXPORT_ROUTE)} className={LINK}>
                  {t.links.export}
                </Link>
              </li>
            )}
          </ul>
        </div>
      </section>

      <section aria-labelledby="about-group" className="border-border bg-background border-b section-y">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="about-group" className={H2}>
              {t.groupTitle}
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">{t.groupIntro}</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed">
              {GROUP_COMPANIES.map((c) => (
                <li key={c.id} className="text-muted-foreground">
                  <strong className="text-navy font-bold">{c.name[locale]}</strong>{" "}
                  (
                  {c.url ? (
                    <a href={c.url} className={LINK} dir="ltr">
                      {c.domain}
                    </a>
                  ) : (
                    <span dir="ltr">{c.domain}</span>
                  )}
                  ): {c.field[locale]}
                  {sep}
                  {sinceLabel(locale, c.sinceSolar)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={H2}>{t.leadershipTitle}</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed">
              {t.leadership.map((person) => (
                <li key={person.role} className="text-muted-foreground">
                  <strong className="text-navy font-bold">{person.role}:</strong> {person.name}
                  {person.note ? `${sep}${person.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="about-contact" className="border-border bg-surface border-b section-y">
        <div className="container-x max-w-3xl">
          <h2 id="about-contact" className={H2}>
            {t.contactTitle}
          </h2>
          <address className="text-muted-foreground mt-5 space-y-2 text-sm leading-relaxed not-italic">
            <p>
              <strong className="text-navy font-bold">{offices.head.label}:</strong> {offices.head.address}
            </p>
            <p>
              <strong className="text-navy font-bold">{offices.tehran.label}:</strong> {offices.tehran.address}
            </p>
            <p>
              <strong className="text-navy font-bold">{t.phoneLabel}:</strong>{" "}
              <a href={`tel:${CONTACT_PHONE_E164}`} dir="ltr" className="text-navy font-medium hover:underline">
                {companyPhoneDisplay()}
              </a>
            </p>
            <p>
              <strong className="text-navy font-bold">{hours.label}:</strong> {hours.lines.join(" — ")}
            </p>
          </address>
          <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" size="md" className="mt-8 h-auto min-h-12 py-3">
            {t.cta}
          </ButtonLink>
        </div>
      </section>

      <CtaBand locale={locale} />
    </>
  );
}
