import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { CatalogEmptyState } from "@/components/products/catalog-empty-state";
import { homepageCopy } from "@/lib/content/homepage";
import { localizedPath, type Locale } from "@/config/locales";
import type { HomepageProductCandidate } from "@/lib/catalog/types";

/**
 * Product Showcase — this task's Homepage Product Architecture Hardening.
 * Deliberately takes NO data-fetching responsibility of its own: `items` is
 * fetched server-side in `app/[locale]/page.tsx` via
 * `lib/catalog/editorial-repository.ts#listHomepageProductCandidates` (same
 * prop-driven pattern already established by `components/home/price-strip.tsx`)
 * and is always real, publication-eligible DB_PUBLIC data — never
 * `lib/content/catalog-sample.ts` (CLAUDE.md §11 / DOCUMENT_AUDIT_REPORT.md
 * DAR-020, this task's root defect). Every card's `href` is built from the
 * candidate's own `slug` field, which is the exact same field
 * `/products/[slug]` resolves against — never guessed, never sample data.
 *
 * Visual language (grid of cards, image, hover-arrow, `Reveal` stagger)
 * unchanged from before — only the data source and the per-card field set
 * changed (no `code`/`grades` fields exist on a real published template
 * summary; the fabricated "sample" corner tag is gone now that this is real
 * data). Fewer than `HOMEPAGE_PRODUCT_DISPLAY_COUNT` real candidates render
 * as fewer cards, never padded with fabricated ones (this task's §26); zero
 * candidates render the same `CatalogEmptyState` the /products listing uses
 * for the identical "real data, nothing published yet" case — never hidden
 * silently and never a fake populated grid.
 */
export function ProductShowcase({ locale, items }: { locale: Locale; items: HomepageProductCandidate[] }) {
  const t = homepageCopy[locale].productShowcase;

  return (
    <section className="border-border bg-background border-b py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} body={t.body} />
          <Link href={localizedPath(locale, "/products")} className="group text-navy inline-flex items-center gap-2 border-b-2 border-navy pb-1.5 text-sm font-semibold">
            {t.cta}
            <ArrowUpRight className="size-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>

        {items.length === 0 ? (
          <CatalogEmptyState locale={locale} variant="catalog-preparing" />
        ) : (
          <ul className="border-border mt-14 grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <Reveal as="li" key={p.templateXid} delay={i * 70}>
                <Link
                  href={localizedPath(locale, `/products/${p.slug}`)}
                  className="group border-border bg-background hover:bg-surface flex h-full flex-col border-e border-b transition-colors"
                >
                  <div className="bg-surface-2 relative aspect-16/11 overflow-hidden">
                    <Image
                      src={p.image.src}
                      alt={p.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
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
        )}
      </div>
    </section>
  );
}
