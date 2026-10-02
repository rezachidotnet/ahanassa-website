import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { siteConfig } from "@/lib/metadata/site";
import { homepageCopy } from "@/lib/content/homepage";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { StaticEnquiryForm } from "@/components/contact/static-enquiry-form";
import { FaqSection } from "@/components/contact/faq-section";
import { getTurnstileSiteKey } from "@/lib/env";

export { generateLocaleStaticParams as generateStaticParams } from "@/lib/static/locale-params";

interface PageProps {
  params: Promise<{ locale: string }>;
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
    addressLines: ["اصفهان، خیابان هزارجریب، کوی آزادگان، پلاک 6"],
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
    addressLines: ["Hezar Jarib Street, Kooy Azadegan, No. 6, Isfahan, Iran"],
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
    addressLines: ["شارع هزار جريب، حي آزادگان، رقم 6، أصفهان، إيران"],
    nextTitle: "الخطوات التالية",
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = copy[locale];
  return buildPageMetadata({ locale, path: "/contact", title: t.title, description: t.body, indexable: false });
}

export default async function ContactPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = copy[locale];
  const process = homepageCopy[locale].process;

  // Static page (architecture V1.1 §4.2): no catalog read and no ?variant=
  // handling at render. StaticEnquiryForm loads the locale's static catalog
  // JSON and resolves ?variant= in the browser (docs/CATALOG_RFQ_INTEGRATION.md).

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} breadcrumb={[{ path: "/contact", label: t.eyebrow }]} />

      {/*
        Vertical component order (owner instruction): 1) Purchase Request /
        RFQ, full desktop width — 2) Next Steps — 3) Head Office. Previously
        a 12-col grid with the RFQ in a 7/12 column and Head
        Office+Next Steps sharing a 5/12 aside beside it; that grid (and its
        min-w-0 collision fix, no longer needed once there is no competing
        sibling column) is removed. `container-x` still bounds every
        section to the approved content max-width/page gutters — "full
        width" means full width of that container, not the raw viewport.
      */}
      <section className="border-border bg-background border-b py-20 lg:py-28">
        <div className="container-x">
          <SectionHeading eyebrow={t.formEyebrow} title={t.formTitle} body={t.formBody} />
          <div className="mt-12">
            <StaticEnquiryForm locale={locale} turnstileSiteKey={getTurnstileSiteKey()} />
          </div>
        </div>
      </section>

      <section className="border-border bg-background border-b py-16 lg:py-20">
        <div className="container-x">
          <h2 className="eyebrow text-navy">{t.nextTitle}</h2>
          <ol className="divide-border border-border mt-5 max-w-2xl divide-y border-y">
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
        </div>
      </section>

      <section className="border-border bg-background border-b py-16 lg:py-20">
        <div className="container-x">
          <h2 className="eyebrow text-navy">{t.officeTitle}</h2>
          <address className="border-border bg-surface text-muted-foreground mt-5 max-w-md border p-6 text-sm leading-relaxed not-italic">
            <span className="text-navy block font-bold">{siteConfig.name}</span>
            {t.addressLines.map((line) => (
              <span key={line} className="block">{line}</span>
            ))}
          </address>
        </div>
      </section>

      <FaqSection locale={locale} />
    </>
  );
}
