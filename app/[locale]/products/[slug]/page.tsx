import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { categoryLabel, getSampleProduct, sampleProducts } from "@/lib/content/catalog-sample";
import { PageHero } from "@/components/ui/page-hero";
import { SampleDataNotice } from "@/components/products/sample-data-notice";
import { CtaBand } from "@/components/ui/cta-band";
import { primaryCta } from "@/lib/content/nav";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return sampleProducts.map((p) => ({ slug: p.slug }));
}

const chrome: Record<Locale, { specs: string; grades: string; standards: string; applications: string; related: string }> = {
  fa: { specs: "مشخصات کلیدی", grades: "گریدها", standards: "استانداردها", applications: "کاربردها", related: "سایر محصولات" },
  en: { specs: "Key specifications", grades: "Grades", standards: "Standards", applications: "Applications", related: "Other products" },
  ar: { specs: "المواصفات الرئيسية", grades: "الدرجات", standards: "المعايير", applications: "التطبيقات", related: "منتجات أخرى" },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const product = getSampleProduct(slug);
  if (!product) return { title: locale === "fa" ? "محصول یافت نشد" : locale === "ar" ? "المنتج غير موجود" : "Product not found" };
  return buildPageMetadata({ locale, path: `/products/${slug}`, title: product.name, description: product.summary, indexable: false });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const product = getSampleProduct(slug);
  if (!product) notFound();
  const t = chrome[locale];

  const related = sampleProducts.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 3);

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={`${product.code} · ${categoryLabel(product.category)}`}
        title={product.name}
        body={product.summary}
        breadcrumb={[
          { path: "/products", label: locale === "fa" ? "محصولات" : locale === "ar" ? "المنتجات" : "Products" },
          { path: `/products/${product.slug}`, label: product.name },
        ]}
      />
      <SampleDataNotice locale={locale} />

      <section className="border-border bg-background border-b py-16 lg:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="bg-surface-2 relative aspect-4/3 overflow-hidden">
              <Image src={product.image} alt={product.name} fill priority sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" />
            </div>
            <div className="border-border bg-surface mt-px border p-7">
              <h2 className="eyebrow text-copper">{t.specs}</h2>
              <dl className="divide-border mt-5 divide-y">
                {product.specs.map((s) => (
                  <div key={s.label} className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-muted-foreground text-sm">{s.label}</dt>
                    <dd className="text-navy text-end text-sm font-semibold">
                      <span dir="ltr">{s.value}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-muted-foreground text-base leading-relaxed">{product.description}</p>

            <div className="border-border mt-10 grid gap-px border-t border-s sm:grid-cols-2">
              <div className="border-border border-e border-b p-6">
                <h3 className="eyebrow text-copper">{t.grades}</h3>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {product.grades.map((g) => (
                    <li key={g} className="border-border bg-surface text-navy border px-2.5 py-1.5 text-xs font-semibold">
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-border border-e border-b p-6">
                <h3 className="eyebrow text-copper">{t.standards}</h3>
                <ul className="mt-4 space-y-2">
                  {product.standards.map((s) => (
                    <li key={s} className="text-navy-600 text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <h3 className="text-navy mt-10 text-lg font-bold">{t.applications}</h3>
            <ul className="mt-5 space-y-3">
              {product.applications.map((a) => (
                <li key={a} className="text-muted-foreground flex gap-3 text-sm">
                  <Check className="text-copper mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {a}
                </li>
              ))}
            </ul>

            <Link
              href={localizedPath(locale, "/contact")}
              className="bg-navy hover:bg-navy-700 mt-10 inline-flex items-center gap-2.5 px-7 py-4 text-sm font-semibold tracking-wide text-white transition-colors"
            >
              {primaryCta[locale].full}
            </Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-border bg-surface border-b py-16 lg:py-20">
          <div className="container-x">
            <h2 className="text-navy text-2xl font-bold">{t.related}</h2>
            <ul className="border-border mt-8 grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={localizedPath(locale, `/products/${p.slug}`)}
                    className="group border-border bg-background hover:bg-surface flex h-full items-start justify-between gap-4 border-e border-b p-6 transition-colors"
                  >
                    <div>
                      <span className="eyebrow text-muted-foreground">{p.code}</span>
                      <h3 className="text-navy mt-2.5 text-base font-bold">{p.name}</h3>
                      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{p.summary}</p>
                    </div>
                    <ArrowUpRight className="text-copper mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBand locale={locale} />
    </>
  );
}
