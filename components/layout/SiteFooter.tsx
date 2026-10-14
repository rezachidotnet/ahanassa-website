import Image from "@/components/ui/image";
import { BRAND_MARK_SRC } from "@/lib/media/image-sources";
import Link from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { visibleNavLinks, headerPhoneLabel } from "@/lib/content/nav";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { ABOUT_GROUP_ANCHOR, GROUP_COMPANIES, GROUP_FOOTER_COPY, OFFICES, PARENT_ORGANIZATION } from "@/lib/content/company";
import { fullCatalogPath } from "@/lib/downloads/paths";

/**
 * Global footer — four-column composition matches
 * ahanassa-v0/components/site-footer.tsx (brand, products, company nav,
 * office/Incoterms). v0's contact column showed fabricated phone/email/
 * hours; email/WhatsApp/hours remain omitted here (PROJECT_OVERRIDES.md
 * §10, DOCUMENT_AUDIT_REPORT.md DAR-020). Phone reuses the single
 * owner-confirmed source (`lib/content/contact-channels.ts`,
 * `CONTACT_PHONE_E164`, confirmed 2026-09-02 — see
 * `docs/footer/FOOTER_P1_RECONCILIATION_IMPLEMENTATION_REPORT.md`), never
 * re-hardcoded. The "Products" group previously linked four sample
 * `?category=` values that the real catalog filter parser
 * (`parseCatalogFilterParams`) never recognized (dead no-op links, FOOTER-P0/
 * P1 finding) — no stable canonical facet mapping exists for static Footer
 * use, so those links were removed rather than rewired to a guessed
 * mapping; only the truthful "full catalog" destination remains. Incoterms
 * are standard published trade terms, not a company-specific claim, so the
 * tag row is kept. W16.6: one group line in the bottom bar (the parent group's site and /about#group, from
 * lib/content/company.ts). W17.1 (owner): the Tehran coordination office under the head office, and a short
 * «شرکت‌های گروه» list linking every sister company with a site — both from lib/content/company.ts (OFFICES,
 * GROUP_COMPANIES), the same names as /about; this supersedes W16.6's "no sister links site-wide".
 */
const copy: Record<
  Locale,
  {
    footerTitle: string; role: string; productsNav: string; catalogueCta: string; companyNav: string;
    incoterms: string; rights: string;
  }
> = {
  fa: {
    footerTitle: "پاورقی وب‌سایت آهن آسا",
    role: "تامین فولاد پروژه شما",
    productsNav: "محصولات",
    catalogueCta: "کاتالوگ کامل",
    companyNav: "شرکت",
    incoterms: "اینکوترمز",
    rights: "کلیه حقوق این وب‌سایت متعلق به",
  },
  en: {
    footerTitle: "Ahan Asa website footer",
    role: "Steel supply for your project.",
    productsNav: "Products",
    catalogueCta: "Full catalog",
    companyNav: "Company",
    incoterms: "Incoterms",
    rights: "All rights reserved,",
  },
  ar: {
    footerTitle: "تذييل موقع آهن آسا",
    role: "توريد الصلب لمشروعك.",
    productsNav: "المنتجات",
    catalogueCta: "الكتالوج الكامل",
    companyNav: "الشركة",
    incoterms: "شروط التجارة الدولية",
    rights: "جميع الحقوق محفوظة لـ",
  },
};

/** Footer links: 44px tap targets (W10.0 P1-4), white/72 muted text (>= 7:1; white/45-65 was down to 4.21:1). */
const FOOTER_LINK = "text-on-inverse-muted inline-flex min-h-11 items-center transition-colors hover:text-white";

const incotermCodes = ["FOB", "CFR", "CIF", "FCA", "DAP", "EXW"];

export function SiteFooter({ locale, hasArticles = false }: { locale: Locale; hasArticles?: boolean }) {
  const t = copy[locale];
  const links = visibleNavLinks(locale, hasArticles);
  const group = GROUP_FOOTER_COPY[locale];
  const offices = OFFICES[locale];
  const sisters = GROUP_COMPANIES.filter((c) => c.url !== null);

  return (
    <footer aria-labelledby="site-footer-title" className="bg-navy on-inverse text-white">
      <h2 id="site-footer-title" className="sr-only">
        {t.footerTitle}
      </h2>
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2.5">
            <Image src={BRAND_MARK_SRC} alt="" aria-hidden="true" width={32} height={32} className="rounded-[var(--aa-radius-xs)]" />
            <span className="text-[15px] font-extrabold tracking-[0.06em] text-white">{siteConfig.name}</span>
          </div>
          <p className="mt-6 max-w-xs text-on-inverse-muted text-sm leading-relaxed">{t.role}</p>
          <p className="text-accent-on-inverse mt-4 text-sm font-medium">{siteConfig.tagline}</p>
          <nav className="mt-8" aria-label={group.companies}>
            <h3 className="eyebrow text-accent-on-inverse">{group.companies}</h3>
            <ul className="mt-2 flex flex-wrap gap-x-5 text-sm">
              {sisters.map((c) => (
                <li key={c.id}>
                  <a href={c.url!} className={FOOTER_LINK}>
                    {c.name[locale]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <nav className="lg:col-span-3" aria-label={t.productsNav}>
          <h3 className="eyebrow text-accent-on-inverse">{t.productsNav}</h3>
          <ul className="mt-3 text-sm">
            <li>
              {/* W17.2: the catalog PDF of this page's locale (fa→fa, en→en, ar→ar), built from the catalog snapshot. */}
              <Link href={fullCatalogPath(locale)} hrefLang={locale} type="application/pdf" className={FOOTER_LINK}>
                {t.catalogueCta}
              </Link>
            </li>
          </ul>
        </nav>

        <nav className="lg:col-span-2" aria-label={t.companyNav}>
          <h3 className="eyebrow text-accent-on-inverse">{t.companyNav}</h3>
          <ul className="mt-3 text-sm">
            {links.map((l) => (
              <li key={l.path}>
                <Link href={localizedPath(locale, l.path)} className={FOOTER_LINK}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h3 className="eyebrow text-accent-on-inverse">{offices.head.label}</h3>
          <a
            href={`tel:${CONTACT_PHONE_E164}`}
            dir="ltr"
            aria-label={headerPhoneLabel[locale].srLabel}
            className={cn(FOOTER_LINK, "mt-3 text-sm")}
          >
            {CONTACT_PHONE_DISPLAY}
          </a>
          <address className="mt-3 text-on-inverse-muted text-sm leading-relaxed not-italic">
            <p>{offices.head.address}</p>
            <p className="mt-4 font-semibold text-white">{offices.tehran.label}</p>
            <p className="mt-1">{offices.tehran.address}</p>
          </address>

          <h3 className="eyebrow text-accent-on-inverse mt-8">{t.incoterms}</h3>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {incotermCodes.map((code) => (
              <li key={code} className="text-on-inverse-muted rounded-[var(--aa-radius-tag)] border border-white/30 px-2.5 py-1 text-[11px] font-semibold tracking-wider">
                {code}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-on-inverse-muted text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {t.rights} {siteConfig.name} ({siteConfig.legalOwner})
          </p>
          <p data-footer-group="">
            {group.before}
            <a href={PARENT_ORGANIZATION.url} className="hover:text-white underline underline-offset-4">
              {PARENT_ORGANIZATION.name[locale]}
            </a>
            {group.after}
            {" · "}
            <Link href={`${localizedPath(locale, "/about")}#${ABOUT_GROUP_ANCHOR}`} className="hover:text-white underline underline-offset-4">
              {group.companies}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
