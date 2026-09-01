import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { siteConfig } from "@/lib/metadata/site";
import { homepageCopy } from "@/lib/content/homepage";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { FaqSection } from "@/components/contact/faq-section";
import { getTurnstileSiteKey } from "@/lib/env";
import { listRfqSelectableCatalogItems, resolveRfqCatalogVariant } from "@/lib/catalog/editorial-repository";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ variant?: string }>;
}

const copy: Record<
  Locale,
  { eyebrow: string; title: string; body: string; formEyebrow: string; formTitle: string; formBody: string; officeTitle: string; addressLines: string[]; nextTitle: string }
> = {
  fa: {
    eyebrow: "تماس با ما",
    title: "فاکتور یا لیست خریدتان را برای ما بفرستید.",
    body: "مشخصات، مقدار و زمان‌بندی مورد نیاز را وارد کنید. اگر جزئیاتی را ندارید، همان چیزی که دارید کافی است.",
    formEyebrow: "درخواست خرید",
    formTitle: "فرم درخواست",
    formBody: "اطلاعات زیر برای شروع بررسی نیاز پروژه شما استفاده می‌شود.",
    officeTitle: "دفتر مرکزی",
    addressLines: ["اصفهان، خیابان هزارجریب", "کوی آزادگان"],
    nextTitle: "مراحل بعدی",
  },
  en: {
    eyebrow: "Contact us",
    title: "Send us your invoice or purchase list.",
    body: "Enter the specification, quantity, and timing you need. If you don't have every detail, what you have is enough to start.",
    formEyebrow: "Purchase request",
    formTitle: "Request form",
    formBody: "The information below is used to begin reviewing your project requirement.",
    officeTitle: "Head office",
    addressLines: ["Hezar Jarib Street, Kooy Azadegan", "Isfahan, Iran"],
    nextTitle: "Next steps",
  },
  ar: {
    eyebrow: "تواصل معنا",
    title: "أرسل لنا فاتورتك أو قائمة الشراء الخاصة بك.",
    body: "أدخل المواصفات والكمية والتوقيت المطلوب. إذا لم تكن لديك كل التفاصيل، فما لديك يكفي للبدء.",
    formEyebrow: "طلب شراء",
    formTitle: "نموذج الطلب",
    formBody: "تُستخدم المعلومات أدناه لبدء مراجعة احتياج مشروعك.",
    officeTitle: "المكتب الرئيسي",
    addressLines: ["شارع هزار جريب، حي آزادگان", "أصفهان، إيران"],
    nextTitle: "الخطوات التالية",
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = copy[locale];
  return buildPageMetadata({ locale, path: "/contact", title: t.title, description: t.body, indexable: false });
}

export default async function ContactPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const { variant: variantXid } = await searchParams;
  const t = copy[locale];
  const process = homepageCopy[locale].process;

  // Server-side Catalog -> RFQ Variant Preselection resolution
  // (docs/CATALOG_RFQ_INTEGRATION.md). A browser-supplied product_variant_xid
  // is never trusted directly — it is only "which row to look up" in
  // DB_PUBLIC; every displayed label/SKU/spec comes from this resolution,
  // never from the URL itself. An unknown/archived/unpublished/wrong-locale
  // xid resolves to `null` here and the form falls back to its normal
  // custom-item flow with a non-sensitive notice — never fabricated data.
  const catalogPreselection = variantXid ? await resolveRfqCatalogVariant(variantXid, locale) : null;
  const catalogPreselectionInvalid = Boolean(variantXid) && catalogPreselection === null;

  // Fetched exactly once per page render and shared client-side across
  // every Catalog row's cascading selects in the multi-item form — never
  // re-fetched per row (docs/RFQ_MULTI_ITEM_FORM.md "Performance"). Same
  // publication-eligibility predicate as `resolveRfqCatalogVariant` above.
  const catalogItems = await listRfqSelectableCatalogItems(locale);

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} breadcrumb={[{ path: "/contact", label: t.eyebrow }]} />

      <section className="border-border bg-background border-b py-20 lg:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/*
            min-w-0: without this, a CSS Grid item's default min-width is its
            content's intrinsic minimum (`min-width: auto`) — the RFQ form's
            wide desktop item table (docs/RFQ_MULTI_ITEM_FORM.md) can then
            force this column wider than its allotted 7/12 fraction instead
            of scrolling within its own `overflow-x-auto` wrapper, visually
            squeezing/overlapping the "Next steps" aside in the 5/12 column
            beside it. Go-Live Readiness RFQ-layout-collision fix.
          */}
          <div className="lg:col-span-7 min-w-0">
            <SectionHeading eyebrow={t.formEyebrow} title={t.formTitle} body={t.formBody} />
            <div className="mt-12">
              <EnquiryForm
                locale={locale}
                turnstileSiteKey={getTurnstileSiteKey()}
                catalogPreselection={catalogPreselection}
                catalogPreselectionInvalid={catalogPreselectionInvalid}
                catalogItems={catalogItems}
              />
            </div>
          </div>

          <aside className="lg:col-span-5">
            <h2 className="eyebrow text-navy">{t.officeTitle}</h2>
            <address className="border-border bg-surface text-muted-foreground mt-5 border p-6 text-sm leading-relaxed not-italic">
              <span className="text-navy block font-bold">{siteConfig.name}</span>
              {t.addressLines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </address>

            <h2 className="eyebrow text-navy mt-12">{t.nextTitle}</h2>
            <ol className="divide-border border-border mt-5 divide-y border-y">
              {process.steps.slice(0, 3).map((step, i) => (
                <li key={step.title} className="flex gap-4 py-5">
                  <span className="text-copper text-lg font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-navy text-sm font-bold">{step.title}</h3>
                    <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{step.activity}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <FaqSection locale={locale} />
    </>
  );
}
