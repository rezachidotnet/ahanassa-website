import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { organizationSchema, websiteSchema, jsonLdGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Hero } from "@/components/home/hero";
import { PriceStrip } from "@/components/home/price-strip";
import { ProductShowcase } from "@/components/home/product-showcase";
import { EvaluationAssurance } from "@/components/home/evaluation-assurance";
import { Process } from "@/components/home/process";
import { Reach } from "@/components/home/reach";
import { CtaBand } from "@/components/ui/cta-band";
import type { PublicPriceStripItem } from "@/lib/pricing/types";
import type { HomepageProductCandidate } from "@/lib/catalog/types";
import { resolveHomepageRankingMode } from "@/lib/ranking/score";

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

  // Homepage Product Projection (this task's Homepage Product Architecture
  // Hardening) — always real, publication-eligible DB_PUBLIC data, never
  // lib/content/catalog-sample.ts. Ranking mode defaults safely to "base"
  // on a missing/invalid HOMEPAGE_RANKING_MODE (resolveHomepageRankingMode
  // never throws) — unlike the price strip, this section is never fully
  // disabled by a flag; the flag only controls whether demand ranking
  // layers on top of the deterministic base order.
  //
  // Failure isolation (Product Showcase V2.0 §80.2: "If Public Product
  // Family Projection cannot be safely read -> Product Showcase omitted,
  // Homepage remains healthy ... must not return 500 because of Product
  // Showcase failure"). The catch is scoped tightly to this ONE read: an
  // empty candidate list makes `ProductShowcase` omit its own section while
  // the Hero, Price Strip, and every other Homepage section render normally.
  // Nothing else on this page is inside the try, so an unrelated Homepage
  // error still propagates instead of being silently swallowed.
  //
  // Same logging convention as the Header's own projection reads in
  // app/[locale]/layout.tsx (HEADER_PRODUCT_FAMILIES_READ_ERROR /
  // HEADER_SERVICE_GROUPS_READ_ERROR): one greppable tag plus a JSON message,
  // no PII, no request/user data.
  let homepageProducts: HomepageProductCandidate[] = [];
  try {
    const { listHomepageProductCandidates } = await import("@/lib/catalog/editorial-repository");
    const homepageRankingMode = resolveHomepageRankingMode(env.HOMEPAGE_RANKING_MODE);
    homepageProducts = await listHomepageProductCandidates(locale, { mode: homepageRankingMode });
  } catch (error) {
    console.error("HOMEPAGE_PRODUCT_SHOWCASE_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
  }

  return (
    <>
      <Hero locale={locale} />
      <PriceStrip locale={locale} items={priceStripItems} />
      <ProductShowcase locale={locale} items={homepageProducts} />
      <EvaluationAssurance locale={locale} />
      <Process locale={locale} />
      <Reach locale={locale} />
      <CtaBand locale={locale} />

      <JsonLd data={jsonLdGraph([organizationSchema(), websiteSchema()])} />
    </>
  );
}
