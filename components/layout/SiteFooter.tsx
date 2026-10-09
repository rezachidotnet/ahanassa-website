import Image from "next/image";
import Link from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { visibleNavLinks, headerPhoneLabel } from "@/lib/content/nav";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";

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
 * tag row is kept.
 */
const copy: Record<
  Locale,
  {
    footerTitle: string; role: string; productsNav: string; catalogueCta: string; companyNav: string; office: string; addressLines: string[];
    incoterms: string; rights: string;
  }
> = {
  fa: {
    footerTitle: "پاورقی وب‌سایت آهن آسا",
    role: "تامین فولاد پروژه شما",
    productsNav: "محصولات",
    catalogueCta: "کاتالوگ کامل",
    companyNav: "شرکت",
    office: "دفتر مرکزی",
    addressLines: ["اصفهان، خیابان هزارجریب، کوی آزادگان، پلاک 6"],
    incoterms: "اینکوترمز",
    rights: "کلیه حقوق این وب‌سایت متعلق به",
  },
  en: {
    footerTitle: "Ahan Asa website footer",
    role: "Steel supply for your project.",
    productsNav: "Products",
    catalogueCta: "Full catalog",
    companyNav: "Company",
    office: "Head office",
    addressLines: ["Hezar Jarib Street, Kooy Azadegan, No. 6, Isfahan, Iran"],
    incoterms: "Incoterms",
    rights: "All rights reserved,",
  },
  ar: {
    footerTitle: "تذييل موقع آهن آسا",
    role: "توريد الصلب لمشروعك.",
    productsNav: "المنتجات",
    catalogueCta: "الكتالوج الكامل",
    companyNav: "الشركة",
    office: "المكتب الرئيسي",
    addressLines: ["شارع هزار جريب، حي آزادگان، رقم 6، أصفهان، إيران"],
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

  return (
    <footer aria-labelledby="site-footer-title" className="bg-navy on-inverse text-white">
      <h2 id="site-footer-title" className="sr-only">
        {t.footerTitle}
      </h2>
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/ahan-asa-mark.jpg" alt="" aria-hidden="true" width={32} height={32} className="rounded-[var(--aa-radius-xs)]" />
            <span className="text-[15px] font-extrabold tracking-[0.06em] text-white">{siteConfig.name}</span>
          </div>
          <p className="mt-6 max-w-xs text-on-inverse-muted text-sm leading-relaxed">{t.role}</p>
          <p className="text-accent-on-inverse mt-4 text-sm font-medium">{siteConfig.tagline}</p>
        </div>

        <nav className="lg:col-span-3" aria-label={t.productsNav}>
          <h3 className="eyebrow text-accent-on-inverse">{t.productsNav}</h3>
          <ul className="mt-3 text-sm">
            <li>
              <Link href={localizedPath(locale, "/products")} className={FOOTER_LINK}>
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
          <h3 className="eyebrow text-accent-on-inverse">{t.office}</h3>
          <a
            href={`tel:${CONTACT_PHONE_E164}`}
            dir="ltr"
            aria-label={headerPhoneLabel[locale].srLabel}
            className={cn(FOOTER_LINK, "mt-3 text-sm")}
          >
            {CONTACT_PHONE_E164}
          </a>
          <address className="mt-3 space-y-1 text-on-inverse-muted text-sm not-italic">
            {t.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
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
        </div>
      </div>
    </footer>
  );
}
