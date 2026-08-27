import Image from "next/image";
import Link from "next/link";
import { localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { navLinks } from "@/lib/content/nav";

/**
 * Global footer — HOMEPAGE_SPEC.md §8.5: brand role statement, essential
 * navigation, approved contact channels only, approved company identity.
 * Phone/email/hours are deliberately omitted — unconfirmed per
 * PROJECT_OVERRIDES.md §10; only the confirmed office address is shown.
 */
const copy: Record<
  Locale,
  { role: string; nav: string; office: string; addressLines: string[]; siteLang: string; rights: string }
> = {
  fa: {
    role: "مدیریت خرید حرفه‌ای فولاد — بررسی، تأمین و هماهنگی خرید شما.",
    nav: "دسترسی سریع",
    office: "دفتر مرکزی",
    addressLines: ["اصفهان، خیابان هزارجریب", "کوی آزادگان"],
    siteLang: "زبان سایت",
    rights: "کلیه حقوق این وب‌سایت متعلق به",
  },
  en: {
    role: "Professional steel procurement management — reviewing, sourcing, and coordinating your purchase.",
    nav: "Quick links",
    office: "Head office",
    addressLines: ["Hezar Jarib Street, Kooy Azadegan", "Isfahan, Iran"],
    siteLang: "Site language",
    rights: "All rights reserved,",
  },
  ar: {
    role: "إدارة احترافية لشراء الصلب — مراجعة وتوريد وتنسيق عملية الشراء الخاصة بك.",
    nav: "روابط سريعة",
    office: "المكتب الرئيسي",
    addressLines: ["شارع هزار جريب، حي آزادگان", "أصفهان، إيران"],
    siteLang: "لغة الموقع",
    rights: "جميع الحقوق محفوظة لـ",
  },
};

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const links = navLinks[locale];

  return (
    <footer className="bg-navy text-white">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/ahan-asa-mark.jpg" alt="" aria-hidden="true" width={32} height={32} className="rounded-[var(--aa-radius-xs)]" />
            <span className="text-[15px] font-extrabold tracking-[0.06em] text-white">{siteConfig.name}</span>
          </div>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/60">{t.role}</p>
          <p className="text-copper-400 mt-4 text-sm font-medium">{siteConfig.tagline}</p>
        </div>

        <nav className="lg:col-span-3" aria-label={t.nav}>
          <h2 className="eyebrow text-copper-400">{t.nav}</h2>
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

        <div className="lg:col-span-4">
          <h2 className="eyebrow text-copper-400">{t.office}</h2>
          <address className="mt-5 space-y-1 text-sm not-italic text-white/65">
            {t.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </address>
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
