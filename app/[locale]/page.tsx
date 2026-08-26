import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { organizationSchema, websiteSchema, jsonLdGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";

interface PageProps {
  params: Promise<{ locale: string }>;
}

const copy: Record<Locale, { title: string; description: string; body: string }> = {
  fa: {
    title: "آهن آسا",
    description: "شریک تخصصی تأمین و خرید فولاد.",
    body: "زیرساخت فنی وب‌سایت آهن آسا در حال آماده‌سازی است. طراحی نهایی صفحه اصلی در فاز بعدی پیاده‌سازی می‌شود.",
  },
  en: {
    title: "Ahan Asa",
    description: "Steel procurement and sourcing partner.",
    body: "The Ahan Asa website foundation is under construction. The final homepage design ships in a later phase.",
  },
  ar: {
    title: "آهن آسا",
    description: "شريك متخصص في توريد وشراء الصلب.",
    body: "أساس موقع آهن آسا الإلكتروني قيد الإعداد. سيتم تنفيذ التصميم النهائي للصفحة الرئيسية في مرحلة لاحقة.",
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const text = copy[locale];

  return buildPageMetadata({
    locale,
    path: "/",
    title: text.title,
    description: text.description,
    // Structural placeholder, not the approved homepage — keep unindexed
    // until the Phase 2 homepage (design-reference/homepage-desktop-v1.png)
    // replaces this page.
    indexable: false,
  });
}

export default async function HomePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const text = copy[locale];

  return (
    <div className="mx-auto max-w-[var(--aa-container-max)] px-[var(--aa-page-gutter)] py-16">
      <h1
        className="text-[length:var(--aa-text-display-md)] leading-[var(--aa-leading-display-md)] font-[var(--aa-font-weight-bold)] text-[var(--aa-color-text-brand)]"
      >
        {text.title}
      </h1>
      <p className="mt-4 max-w-[var(--aa-reading-max)] text-[length:var(--aa-text-body-lg)] leading-[var(--aa-leading-body-lg)] text-[var(--aa-color-text-secondary)]">
        {text.body}
      </p>

      <JsonLd data={jsonLdGraph([organizationSchema(), websiteSchema()])} />
    </div>
  );
}
