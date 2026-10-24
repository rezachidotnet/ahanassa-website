import type { Metadata } from "next";
import Image from "@/components/ui/image";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { ABOUT_COPY, ABOUT_PHOTOS } from "@/lib/content/about";
import { ABOUT_GROUP_ANCHOR, companyPhoneDisplay, GROUP_CARD_COPY, GROUP_COMPANIES, OFFICES, PARENT_ORGANIZATION, sinceLabel, WORKING_HOURS_TEXT } from "@/lib/content/company";
import { ABOUT_EVENTS_ANCHOR, ABOUT_EVENTS_COPY, EXPO_1405, EXPO_1405_MEDIA, EXPO_MILESTONE, GROUP_STATEMENT_COPY } from "@/lib/content/about-events";
import { OFFICE_COORDINATES } from "@/lib/content/office-locations";
import { variantPath } from "@/lib/media/image-sources";
import { siteConfig } from "@/lib/metadata/site";
import { eventSchema, jsonLdGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { AboutTimeline } from "@/components/about/about-timeline";
import { ExpoEvent } from "@/components/about/expo-event";
import { OfficeMap } from "@/components/about/office-map";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { RAW_MATERIALS_ROUTE } from "@/lib/content/raw-materials";
import { EXPORT_ROUTE, isExportPublished } from "@/lib/content/export";
import { isWeightCalculatorPublished, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { cardVariants } from "@/components/ui/surface-variants";
import { CtaBand } from "@/components/ui/cta-band";
import { cn } from "@/lib/utils";

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

/** Logo: grey until the card is hovered or focused (no transition under reduced motion); Ahan Assa's own card stays in colour. */
// mix-blend-multiply drops the logos' own off-white backgrounds onto the white card; max-w keeps wide wordmarks in scale.
const LOGO = "h-auto max-h-14 w-auto max-w-44 object-contain mix-blend-multiply";
const LOGO_MUTED = "grayscale opacity-80 transition-[filter,opacity] duration-200 group-hover:grayscale-0 group-hover:opacity-100 group-focus-visible:grayscale-0 group-focus-visible:opacity-100 motion-reduce:transition-none";

/**
 * W17.1 — one group company: logo (lib/content/company.ts, WebP with a PNG fallback, explicit width/height), name,
 * field and founding year. A sister company is one whole-card link (new tab, rel="noopener"); Ahan Assa is not a link.
 */
function GroupCompanyCard({ locale, company }: { locale: Locale; company: (typeof GROUP_COMPANIES)[number] }) {
  const name = company.name[locale];
  const copy = GROUP_CARD_COPY[locale];
  const statement = GROUP_STATEMENT_COPY[locale];
  // W20.2: the parent company and this site carry a small badge; the founding year moves to a chip at the top.
  const badge = company.url === PARENT_ORGANIZATION.url ? statement.parentBadge : company.url ? null : statement.currentBadge;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="bg-surface text-navy rounded-full px-3 py-1 text-xs font-bold">{sinceLabel(locale, company.sinceSolar)}</span>
        {badge && <span className="text-copper text-xs font-bold">{badge}</span>}
      </div>
      <div className="mt-4 flex h-16 items-center">
        {company.logo ? (
          <picture>
            <source srcSet={company.logo.webp} type="image/webp" />
            <img src={company.logo.png} alt={copy.logoAlt(name)} width={company.logo.width} height={company.logo.height} loading="lazy" decoding="async" className={cn(LOGO, company.url && LOGO_MUTED)} />
          </picture>
        ) : (
          <span aria-hidden="true" className="text-navy text-2xl font-extrabold">
            {name}
          </span>
        )}
      </div>
      {/* No logo: the name in the logo frame is the wordmark, so the heading is for assistive tech only. */}
      <h3 className={company.logo ? "text-navy mt-5 text-base font-extrabold" : "sr-only"}>{name}</h3>
      <p className={cn("text-muted-foreground flex-1 text-sm leading-relaxed", company.logo ? "mt-2" : "mt-5")}>{company.field[locale]}</p>
      <p className="text-tertiary mt-4 flex items-center justify-end gap-3 text-xs font-semibold">
        <span dir="ltr" className={cn(company.url && "group-hover:text-copper underline underline-offset-4")}>
          {company.domain}
        </span>
      </p>
    </>
  );
  if (!company.url) return <div className={cn(cardVariants(), "border-copper flex h-full flex-col p-6 shadow-[var(--aa-shadow-sm)]")}>{body}</div>;
  return (
    <a href={company.url} target="_blank" rel="noopener" className={cn(cardVariants({ variant: "interactive" }), "group h-full p-6")}>
      {body}
      <span className="sr-only"> {copy.newTab}</span>
    </a>
  );
}

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
  const events = ABOUT_EVENTS_COPY[locale];
  const statement = GROUP_STATEMENT_COPY[locale];
  const groupSince = Math.min(...GROUP_COMPANIES.map((c) => c.sinceSolar));
  const milestones = [...t.timeline, { ...EXPO_MILESTONE[locale], href: `#${ABOUT_EVENTS_ANCHOR}`, linkLabel: events.title }];
  const pageUrl = `${siteConfig.baseUrl}${localizedPath(locale, "/about")}`;
  const officeList = [
    { key: "head", ...offices.head, coordinates: OFFICE_COORDINATES.head },
    { key: "tehran", ...offices.tehran, coordinates: OFFICE_COORDINATES.tehran },
  ] as const;

  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          eventSchema({
            id: `${pageUrl}#${EXPO_1405.id}`,
            name: EXPO_1405.name[locale],
            description: events.description,
            startDate: EXPO_1405.startDate,
            endDate: EXPO_1405.endDate,
            venue: EXPO_1405.venue[locale],
            locality: EXPO_1405.locality[locale],
            image: `${siteConfig.baseUrl}${variantPath(EXPO_1405_MEDIA.poster.src, EXPO_1405_MEDIA.poster.width, "webp")}`,
          }),
        ])}
      />
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.h1} image="/images/ops/mill-exterior.png" breadcrumb={[{ path: "/about", label: t.eyebrow }]} />

      <section aria-labelledby="about-intro" className="border-border bg-background border-b section-y">
        <div className="container-x max-w-3xl space-y-5 text-base leading-relaxed text-muted-foreground">
          <h2 id="about-intro" className={H2}>
            {t.introTitle}
          </h2>
          {/* W17.1 (owner): the intro is justified, last line at the reading start (styles/theme-extensions.css). */}
          {t.intro.map((p) => (
            <p key={p} className="text-justified">
              {p}
            </p>
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
        <div className="container-x max-w-5xl">
          <h2 id="about-timeline" className={H2}>
            {t.timelineTitle}
          </h2>
          <AboutTimeline milestones={milestones} labelledBy="about-timeline" />
        </div>
      </section>

      <ExpoEvent locale={locale} />

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

      <section id={ABOUT_GROUP_ANCHOR} aria-labelledby="about-group" className="border-border bg-background border-b section-y">
        <div className="container-x">
          <div className="max-w-3xl">
            <h2 id="about-group" className={H2}>
              {t.groupTitle}
            </h2>
            <p className="text-navy mt-4 text-lg leading-snug font-extrabold">{statement.statement}</p>
            <p className="text-muted-foreground mt-3 leading-relaxed">{t.groupIntro}</p>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
              <li className="border-border text-navy rounded-full border px-4 py-1.5">{statement.companies(GROUP_COMPANIES.length)}</li>
              <li className="border-border text-navy rounded-full border px-4 py-1.5">{statement.since(groupSince)}</li>
            </ul>
          </div>
          {/* W17.1: one equal-height card per company (auto-rows-fr), logo in a fixed 64px frame; sister sites open in a new tab. */}
          <ul className="mt-8 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GROUP_COMPANIES.map((c) => (
              <li key={c.id} className={cn("h-full", c.url === PARENT_ORGANIZATION.url && "sm:col-span-2")}>
                <GroupCompanyCard locale={locale} company={c} />
              </li>
            ))}
          </ul>
          <div className="mt-12 max-w-3xl">
            <h2 className={H2}>{t.leadershipTitle}</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed">
              {t.leadership.map((person) => (
                <li key={person.role} className="text-muted-foreground">
                  <strong className="text-navy font-bold">{person.role}:</strong> {person.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="about-contact" className="border-border bg-surface border-b section-y">
        <div className="container-x max-w-5xl">
          <h2 id="about-contact" className={H2}>
            {t.contactTitle}
          </h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {officeList.map((office) => (
              <div key={office.key} className={cardVariants({ variant: "panel" })}>
                <address className="text-muted-foreground text-sm leading-relaxed not-italic">
                  <strong className="text-navy block text-base font-extrabold">{office.label}</strong>
                  <span className="mt-1 block">{office.address}</span>
                </address>
                {office.coordinates && <OfficeMap locale={locale} office={office.label} coordinates={office.coordinates} />}
              </div>
            ))}
          </div>
          <address className="text-muted-foreground mt-6 space-y-2 text-sm leading-relaxed not-italic">
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
