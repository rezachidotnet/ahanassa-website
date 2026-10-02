import Image from "next/image";
import Link from "@/components/ui/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { homepageCopy } from "@/lib/content/homepage";
import { HOMEPAGE_SHOWCASE_MAX_CARDS, showcaseCountAttribute } from "@/lib/catalog/homepage-showcase-layout";
import { resolveCategoryMedia } from "@/lib/catalog/media-registry";
import { categoryListingPath } from "@/lib/catalog/public-categories";
import { localizedPath, type Locale } from "@/config/locales";
import type { PublicCatalogCategory } from "@/lib/catalog/types";

const HEADING_ID = "home-product-showcase-heading";

/** Localized alt text for a category's representative photo — built from Odoo's own translated category name. */
const imageAlt: Record<Locale, (name: string) => string> = {
  fa: (name) => `تصویر نمونه ${name}`,
  en: (name) => `Representative photo of ${name}`,
  ar: (name) => `صورة تمثيلية: ${name}`,
};

/**
 * Product Showcase — aligned with the frozen Product Showcase V2.0
 * (docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md),
 * whose card unit is the "Product Family / Public Category" (§3, §17).
 *
 * Deliberately takes NO data-fetching responsibility of its own: `items` is
 * fetched server-side in `app/[locale]/page.tsx` via
 * `lib/catalog/editorial-repository.ts#listPublicCatalogCategories` — the
 * DB_PUBLIC snapshot of Odoo's `/api/v1/catalog/categories` for this locale
 * (same prop-driven pattern as `components/home/price-strip.tsx`), never
 * `lib/content/catalog-sample.ts` (CLAUDE.md §11 / DAR-020). One card per
 * public category, in Odoo's order, titled with Odoo's translated name; each
 * links to the /products listing with that category selected
 * (`categoryListingPath`, shared with the Header). Images come from the
 * category media map (`resolveCategoryMedia`), never per component.
 *
 * Zero categories render NOTHING — the whole <section> is omitted, per §35
 * ("Product Showcase omitted") and the §82 acceptance row "0 cards | Section
 * hidden". This replaced the previous `CatalogEmptyState` fallback, which
 * kept a heading and a "catalog is being prepared" message on screen.
 * `CatalogEmptyState` itself is untouched and still used by the /products
 * listing, where an explanatory empty state IS the right answer.
 *
 * Up to `HOMEPAGE_SHOWCASE_MAX_CARDS` (8) categories render, one card each, composed per the frozen 0–8 matrix (§25/§73.1) via
 * `data-count` + `.aa-showcase-grid` in `styles/theme-extensions.css` —
 * never padded with fabricated ones (§8), never a carousel (§32).
 */
export function ProductShowcase({ locale, items }: { locale: Locale; items: PublicCatalogCategory[] }) {
  const t = homepageCopy[locale].productShowcase;
  // §7/§24 hard cap — Odoo's order is kept, only the tail beyond 8 is dropped.
  const cards = items.slice(0, HOMEPAGE_SHOWCASE_MAX_CARDS);

  // §35 / §82 "0 cards -> Section hidden". Nothing renders: no heading, no
  // placeholder, no skeleton, no fabricated card.
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby={HEADING_ID} className="border-border bg-background border-b py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading headingId={HEADING_ID} eyebrow={t.eyebrow} title={t.title} body={t.body} />
          <Link href={localizedPath(locale, "/products")} className="group text-navy inline-flex items-center gap-2 border-b-2 border-navy pb-1.5 text-sm font-semibold">
            {t.cta}
            <ArrowUpRight className="size-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>

        <ul className="aa-showcase-grid border-border mt-14" data-count={showcaseCountAttribute(cards.length)}>
          {/* 30ms micro-stagger per §64.4 ("Card 1: 0ms, Card 2: ~30ms, Card 3: ~60ms"),
              keeping the whole visible sequence inside §64.4's ~180–220ms budget. */}
          {cards.map((category, i) => {
            const image = resolveCategoryMedia(category.code);
            const titleId = `home-product-showcase-${category.code}`;
            return (
              <Reveal as="li" key={category.code} delay={i * 30}>
                {/* aria-labelledby: the card link is named by its visible
                    title alone, so the image's alt (announced when images
                    are browsed) is not read twice as part of the link. */}
                <Link
                  href={localizedPath(locale, categoryListingPath(category.code))}
                  aria-labelledby={titleId}
                  className="group border-border bg-background hover:bg-surface flex h-full flex-col border transition-colors"
                >
                  {/* 4:3 frame with object-cover: every category photo, portrait
                      or landscape, fills the same reserved box, so there is no
                      layout shift while images load.

                      Hover: scale 1.015 over 160ms (§64.7 "approximately
                      1.015 ... ~150–180ms"), and fully removed under
                      prefers-reduced-motion (§64.10 "image scaling/motion is
                      removed"). Values are written out in prose rather than
                      as utility names on purpose: Tailwind scans comments
                      too. */}
                  <div className="bg-surface-2 relative aspect-4/3 overflow-hidden">
                    <Image
                      src={image.src}
                      alt={imageAlt[locale](category.name)}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 400px) 50vw, 100vw"
                      className="object-cover object-center transition-transform duration-[160ms] ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 id={titleId} className="text-navy flex items-start justify-between gap-3 text-lg font-bold">
                      {category.name}
                      <ArrowUpRight aria-hidden="true" className="text-copper mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                    </h3>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
