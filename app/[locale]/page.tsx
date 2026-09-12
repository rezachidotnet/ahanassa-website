import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { organizationSchema, websiteSchema, jsonLdGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Hero } from "@/components/home/hero";
import { PriceStrip } from "@/components/home/price-strip";
import { ProductShowcase } from "@/components/home/product-showcase";
import { BuyerValue } from "@/components/home/buyer-value";
import { Industries } from "@/components/home/industries";
import { CtaBand } from "@/components/ui/cta-band";
import type { PublicPriceStripItem } from "@/lib/pricing/types";
import type { HomepageProductCandidate } from "@/lib/catalog/types";
import { resolveHomepageRankingMode } from "@/lib/ranking/score";

/**
 * HOMEPAGE COMPOSITION — frozen by
 * docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md §4:
 *
 *   Header -> Hero -> Price Strip [conditional] -> Product Showcase ->
 *   Buyer Value -> Verified Evidence [conditional] ->
 *   Industries / Use Cases [conditional] -> Final CTA -> Footer
 *
 * Header and Footer are the global shell, rendered by app/[locale]/layout.tsx;
 * everything between them is rendered by `HomePage` below. Each section owns
 * exactly one buyer question, and §7's duplication gate forbids a later
 * section from restating an earlier one's job with different wording. The
 * order may not be changed without a versioned supersession of that freeze
 * (§18) — and §18 is explicit that "An implementation bug, missing local data,
 * or temporary deployment state MUST NOT be recorded as an architecture
 * change."
 *
 * CONDITIONAL SECTIONS fail independently (§9). Each decides its own
 * visibility and renders nothing at all when ineligible, so an omission drops
 * the ENTIRE semantic section — no empty heading, no skeleton, no blank band —
 * and can never suppress a sibling:
 *
 *   Price Strip        omitted unless PRICE_STRIP_ENABLED is on AND eligible,
 *                      attributable, current data exists. Read on its own code
 *                      path, ahead of and outside the Showcase's failure
 *                      boundary, so neither can take the other down.
 *   Verified Evidence  NOT RENDERED AT ALL in this phase, which is the correct
 *                      state rather than an oversight. §6.5 requires at least
 *                      100 ELIGIBLE operational records plus the data-quality
 *                      gates before any speed/evidence figure may be
 *                      published, and no evidence metric, calculation window,
 *                      freshness gate or publication contract exists anywhere
 *                      in this repository yet. §6.5 is explicit that "A
 *                      marketing substitute MUST NOT be rendered in its
 *                      place", so there is deliberately no component, no
 *                      placeholder, and no invented metric here.
 *   Industries         `Industries`, implementing the frozen V1.0 spec
 *                      (docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md).
 *                      NOT RENDERED TODAY, and that is the correct state
 *                      rather than an oversight. Its §10 publication gate
 *                      requires approved scope, complete localized copy,
 *                      REVIEWED IMAGERY and a server-side enable state; copy
 *                      and scope are complete and pinned by tests, but no
 *                      asset in this repository depicts a construction site, a
 *                      petrochemical/oil/gas facility or a fabrication
 *                      workshop, and none carries recorded provenance
 *                      (01-sources/MEDIA_GUIDELINES.md: "Unknown provenance
 *                      defaults to `restricted`"). §8 is explicit — "Do not
 *                      ship the component with missing initial image assets"
 *                      — so the component returns null before any markup and
 *                      Buyer Value meets the Final CTA directly, with no gap,
 *                      heading or placeholder. Supplying three approved assets
 *                      in lib/content/industries.ts publishes it with no
 *                      further code change.
 *
 * SUPERSEDED FOR THE HOMEPAGE (§8) — dropped from this render, NOT deleted:
 *
 *   EvaluationAssurance  components/home/evaluation-assurance.tsx, replaced
 *                        here by BuyerValue. Its component, content and frozen
 *                        V2.1 spec are all retained unchanged; §8 requires
 *                        historical specifications be marked superseded rather
 *                        than removed.
 *   Process              components/home/process.tsx, RETAINED OUTSIDE THE
 *                        HOMEPAGE and reserved for a future dedicated
 *                        /process page (§12). It is NOT globally superseded.
 *                        No /process route exists yet and §12 forbids linking
 *                        to one that does not, so nothing links to it.
 *   Reach                components/home/reach.tsx, which previously filled
 *                        the Industries slot with five generic industry names.
 *                        Replaced here by the frozen three-sector Industries
 *                        component. The file, its `homepageCopy.*.reach`
 *                        content and the `marketsCopy`/`industriesCopy` lists
 *                        it reads are ALL retained untouched, and /industries
 *                        and /markets still publish those lists — the Homepage
 *                        simply stopped importing it.
 *
 * The Hero is deliberately untouched: §6.1 makes it the SOLE owner of the
 * short four-step purchase path, and no later section — BuyerValue very much
 * included — may repeat that journey.
 */
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
      <BuyerValue locale={locale} />
      <Industries locale={locale} />
      <CtaBand locale={locale} />

      <JsonLd data={jsonLdGraph([organizationSchema(), websiteSchema()])} />
    </>
  );
}
