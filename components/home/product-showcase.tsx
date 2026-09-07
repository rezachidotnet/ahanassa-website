import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { homepageCopy } from "@/lib/content/homepage";
import { showcaseCountAttribute } from "@/lib/catalog/homepage-showcase-layout";
import { localizedPath, type Locale } from "@/config/locales";
import type { HomepageProductCandidate } from "@/lib/catalog/types";

const HEADING_ID = "home-product-showcase-heading";

/**
 * Product Showcase — aligned with the frozen Product Showcase V2.0
 * (docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md).
 *
 * Deliberately takes NO data-fetching responsibility of its own: `items` is
 * fetched server-side in `app/[locale]/page.tsx` via
 * `lib/catalog/editorial-repository.ts#listHomepageProductCandidates` (same
 * prop-driven pattern already established by `components/home/price-strip.tsx`)
 * and is always real, publication-eligible DB_PUBLIC data — never
 * `lib/content/catalog-sample.ts` (CLAUDE.md §11 / DOCUMENT_AUDIT_REPORT.md
 * DAR-020). Every card's `href` is built from the candidate's own `slug`
 * field, which is the exact same field `/products/[slug]` resolves against —
 * never guessed, never sample data.
 *
 * Zero candidates render NOTHING — the whole <section> is omitted, per §35
 * ("Product Showcase omitted") and the §82 acceptance row "0 cards | Section
 * hidden". This replaced the previous `CatalogEmptyState` fallback, which
 * kept a heading and a "catalog is being prepared" message on screen.
 * `CatalogEmptyState` itself is untouched and still used by the /products
 * listing, where an explanatory empty state IS the right answer.
 *
 * Fewer than `HOMEPAGE_PRODUCT_DISPLAY_COUNT` real candidates render as
 * fewer cards, composed per the frozen 0–8 matrix (§25/§73.1) via
 * `data-count` + `.aa-showcase-grid` in `styles/theme-extensions.css` —
 * never padded with fabricated ones (§8), never a carousel (§32).
 */
export function ProductShowcase({ locale, items }: { locale: Locale; items: HomepageProductCandidate[] }) {
  const t = homepageCopy[locale].productShowcase;

  // §35 / §82 "0 cards -> Section hidden". Nothing renders: no heading, no
  // placeholder, no skeleton, no fabricated card.
  if (items.length === 0) return null;

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

        <ul className="aa-showcase-grid border-border mt-14" data-count={showcaseCountAttribute(items.length)}>
          {/* 30ms micro-stagger per §64.4 ("Card 1: 0ms, Card 2: ~30ms, Card 3: ~60ms"),
              keeping the whole visible sequence inside §64.4's ~180–220ms budget. */}
          {items.map((p, i) => (
            <Reveal as="li" key={p.templateXid} delay={i * 30}>
              <Link
                href={localizedPath(locale, `/products/${p.slug}`)}
                className="group border-border bg-background hover:bg-surface flex h-full flex-col border transition-colors"
              >
                <div className="bg-surface-2 relative aspect-16/11 overflow-hidden">
                  {/*
                    alt="" — the image is a representative Product Family
                    visual carrying no information the adjacent <h3>{p.title}
                    </h3> does not already state, so V2.0 §56/§78 prefer an
                    empty alt to avoid duplicate screen-reader announcement.
                    If a future image ever conveys something extra, it needs
                    real alt text instead.

                    Hover: scale 1.015 over 160ms (§64.7 "approximately
                    1.015 ... ~150–180ms"), and fully removed under
                    prefers-reduced-motion (§64.10 "image scaling/motion is
                    removed") — the previous 1.05 scale over 700ms had no
                    reduced-motion guard at all. Values are written out in
                    prose rather than as utility names on purpose: Tailwind
                    scans comments too, and naming the old classes here
                    would emit dead CSS for utilities nothing renders.
                  */}
                  <Image
                    src={p.image.src}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 400px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[160ms] ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-navy flex items-start justify-between gap-3 text-lg font-bold">
                    {p.title}
                    <ArrowUpRight className="text-copper mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                  </h3>
                  {p.summary ? <p className="text-muted-foreground mt-3 flex-1 text-sm leading-relaxed">{p.summary}</p> : null}
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
