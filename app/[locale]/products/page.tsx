import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { categories, type ProductCategory } from "@/lib/content/catalog-sample";
import { PageHero } from "@/components/ui/page-hero";
import { Catalogue } from "@/components/products/catalogue";
import { SampleDataNotice } from "@/components/products/sample-data-notice";
import { CtaBand } from "@/components/ui/cta-band";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}

const heroCopy: Record<Locale, { eyebrow: string; title: string; body: string }> = {
  fa: { eyebrow: "محصولات", title: "گروه‌های کالایی فولاد و آلیاژ.", body: "هر گروه کالایی زیر بخشی از خدمت مدیریت خرید آهن آساست، نه یک فروشگاه آنلاین." },
  en: { eyebrow: "Products", title: "Steel and alloy product categories.", body: "Each category below is part of Ahan Asa's purchasing-management service, not an online store." },
  ar: { eyebrow: "المنتجات", title: "فئات منتجات الصلب والسبائك.", body: "كل فئة أدناه جزء من خدمة إدارة الشراء لدى آهن آسا، وليست متجرًا إلكترونيًا." },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = heroCopy[locale];
  return buildPageMetadata({ locale, path: "/products", title: t.title, description: t.body, indexable: false });
}

const valid = new Set<string>(categories.map((c) => c.id));

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const { category } = await searchParams;
  const initial = category && valid.has(category) ? (category as ProductCategory) : "all";
  const t = heroCopy[locale];

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t.eyebrow}
        title={t.title}
        body={t.body}
        image="/images/ops/mill-exterior.png"
        breadcrumb={[{ path: "/products", label: t.eyebrow }]}
      />
      <SampleDataNotice locale={locale} />
      <Catalogue locale={locale} initial={initial} />
      <CtaBand locale={locale} />
    </>
  );
}
