import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { organizationSchema, websiteSchema, jsonLdGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Hero } from "@/components/home/hero";
import { PriceStrip } from "@/components/home/price-strip";
import { ProductShowcase } from "@/components/home/product-showcase";
import { Capabilities } from "@/components/home/capabilities";
import { Assurance } from "@/components/home/assurance";
import { Process } from "@/components/home/process";
import { Reach } from "@/components/home/reach";
import { CtaBand } from "@/components/ui/cta-band";
import type { PublicPriceStripItem } from "@/lib/pricing/types";

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
    // Content is adapted from HOMEPAGE_SPEC.md's "working copy direction";
    // section composition follows the approved v0 implementation
    // (PROJECT_OVERRIDES.md §8b). Classified `draft` per HOMEPAGE_SPEC.md
    // §20.5 until the content owner reviews it — keep unindexed until then.
    // See DOCUMENT_AUDIT_REPORT.md DAR-020/DAR-021.
    indexable: false,
  });
}

export default async function HomePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";

  // Checked here, before getHomepagePriceStrip is even called (defense in
  // depth — the function itself re-checks the same flag) — when off, zero
  // DB-related code path executes for the price strip at all
  // (docs/pricing/PRICE_PROVIDER_CONTRACT.md "Safe rollout order").
  let priceStripItems: PublicPriceStripItem[] = [];
  const priceStripEnabled: string | undefined = env.PRICE_STRIP_ENABLED;
  if (priceStripEnabled === "true") {
    const { getHomepagePriceStrip } = await import("@/lib/pricing/repository");
    priceStripItems = await getHomepagePriceStrip(env as CloudflareEnv, locale);
  }

  return (
    <>
      <Hero locale={locale} />
      <PriceStrip locale={locale} items={priceStripItems} />
      <ProductShowcase locale={locale} />
      <Capabilities locale={locale} />
      <Assurance locale={locale} />
      <Process locale={locale} />
      <Reach locale={locale} />
      <CtaBand locale={locale} />

      <JsonLd data={jsonLdGraph([organizationSchema(), websiteSchema()])} />
    </>
  );
}
