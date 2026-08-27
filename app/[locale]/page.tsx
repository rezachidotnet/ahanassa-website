import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { organizationSchema, websiteSchema, jsonLdGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Hero } from "@/components/home/hero";
import { ProblemRecognition } from "@/components/home/problem-recognition";
import { RoleClarification } from "@/components/home/role-clarification";
import { Process } from "@/components/home/process";
import { Pillars } from "@/components/home/pillars";
import { Method } from "@/components/home/method";
import { Capabilities } from "@/components/home/capabilities";
import { Faq } from "@/components/home/faq";
import { CtaBand } from "@/components/ui/cta-band";

interface PageProps {
  params: Promise<{ locale: string }>;
}

const metaCopy: Record<Locale, { title: string; description: string }> = {
  fa: { title: "آهن آسا — مدیریت خرید فولاد", description: "فاکتور یا لیست خریدتان را بفرستید؛ آهن آسا نیاز پروژه، گزینه‌های تأمین و مسیر خرید را بررسی و هماهنگ می‌کند." },
  en: { title: "Ahan Asa — Steel purchasing management", description: "Send your invoice or purchase list — Ahan Asa reviews the requirement, sourcing options, and purchasing path." },
  ar: { title: "آهن آسا — إدارة شراء الصلب", description: "أرسل فاتورتك أو قائمة الشراء؛ يراجع آهن آسا الاحتياج وخيارات التوريد ومسار الشراء." },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const text = metaCopy[locale];

  return buildPageMetadata({
    locale,
    path: "/",
    title: text.title,
    description: text.description,
    // Content is adapted from HOMEPAGE_SPEC.md's "working copy direction" —
    // classified `draft` per §20.5 until the content owner reviews it.
    // Keep unindexed until that review; see DOCUMENT_AUDIT_REPORT.md
    // "v0 integration".
    indexable: false,
  });
}

export default async function HomePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";

  return (
    <>
      <Hero locale={locale} />
      <ProblemRecognition locale={locale} />
      <RoleClarification locale={locale} />
      <Process locale={locale} />
      <Pillars locale={locale} />
      <Method locale={locale} />
      <Capabilities locale={locale} />
      <Faq locale={locale} />
      <CtaBand locale={locale} />

      <JsonLd data={jsonLdGraph([organizationSchema(), websiteSchema()])} />
    </>
  );
}
