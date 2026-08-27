import Image from "next/image";
import Link from "next/link";
import { localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { navLinks } from "@/lib/content/nav";
import { categories } from "@/lib/content/catalog-sample";

/**
 * Global footer — four-column composition matches
 * ahanassa-v0/components/site-footer.tsx (brand, product categories,
 * company nav, office/Incoterms). v0's contact column showed fabricated
 * phone/email/hours; those are omitted here — only the confirmed office
 * address is shown (PROJECT_OVERRIDES.md §10, DOCUMENT_AUDIT_REPORT.md
 * DAR-020). Incoterms are standard published trade terms, not a
 * company-specific claim, so the tag row is kept.
 */
const copy: Record<
  Locale,
  {
    role: string; productsNav: string; catalogueCta: string; companyNav: string; office: string; addressLines: string[];
    incoterms: string; rights: string;
  }
> = {
  fa: {
    role: "مدیریت خرید حرفه‌ای فولاد — بررسی، تأمین و هماهنگی خرید شما.",
    productsNav: "محصولات",
    catalogueCta: "کاتالوگ کامل",
    companyNav: "شرکت",
    office: "دفتر مرکزی",
    addressLines: ["اصفهان، خیابان هزارجریب", "کوی آزادگان"],
    incoterms: "اینکوترمز",
    rights: "کلیه حقوق این وب‌سایت متعلق به",
  },
  en: {
    role: "Professional steel procurement management — reviewing, sourcing, and coordinating your purchase.",
    productsNav: "Products",
    catalogueCta: "Full catalog",
    companyNav: "Company",
    office: "Head office",
    addressLines: ["Hezar Jarib Street, Kooy Azadegan", "Isfahan, Iran"],
    incoterms: "Incoterms",
    rights: "All rights reserved,",
  },
  ar: {
    role: "إدارة احترافية لشراء الصلب — مراجعة وتوريد وتنسيق عملية الشراء الخاصة بك.",
    productsNav: "المنتجات",
    catalogueCta: "الكتالوج الكامل",
    companyNav: "الشركة",
    office: "المكتب الرئيسي",
    addressLines: ["شارع هزار جريب، حي آزادگان", "أصفهان، إيران"],
    incoterms: "شروط التجارة الدولية",
    rights: "جميع الحقوق محفوظة لـ",
  },
};

const incotermCodes = ["FOB", "CFR", "CIF", "FCA", "DAP", "EXW"];

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const links = navLinks[locale];

  return (
    <footer className="bg-navy text-white">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/ahan-asa-mark.jpg" alt="" aria-hidden="true" width={32} height={32} className="rounded-[var(--aa-radius-xs)]" />
            <span className="text-[15px] font-extrabold tracking-[0.06em] text-white">{siteConfig.name}</span>
          </div>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/60">{t.role}</p>
          <p className="text-copper-400 mt-4 text-sm font-medium">{siteConfig.tagline}</p>
        </div>

        <nav className="lg:col-span-3" aria-label={t.productsNav}>
          <h2 className="eyebrow text-copper-400">{t.productsNav}</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`${localizedPath(locale, "/products")}?category=${c.id}`} className="text-white/65 transition-colors hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={localizedPath(locale, "/products")} className="text-white/65 transition-colors hover:text-white">
                {t.catalogueCta}
              </Link>
            </li>
          </ul>
        </nav>

        <nav className="lg:col-span-2" aria-label={t.companyNav}>
          <h2 className="eyebrow text-copper-400">{t.companyNav}</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {links.map((l) => (
              <li key={l.path}>
                <Link href={localizedPath(locale, l.path)} className="text-white/65 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h2 className="eyebrow text-copper-400">{t.office}</h2>
          <address className="mt-5 space-y-1 text-sm not-italic text-white/65">
            {t.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </address>

          <h2 className="eyebrow text-copper-400 mt-8">{t.incoterms}</h2>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {incotermCodes.map((code) => (
              <li key={code} className="border border-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white/70">
                {code}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {t.rights} {siteConfig.name} ({siteConfig.legalOwner})
          </p>
        </div>
      </div>
    </footer>
  );
}
