import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { sampleProducts } from "@/lib/content/catalog-sample";
import { homepageCopy } from "@/lib/content/homepage";
import { localizedPath, type Locale } from "@/config/locales";

const featured = ["deformed-rebar", "steel-billet", "hot-rolled-coil", "structural-beams", "sponge-iron", "wire-rod"];

const sampleTag: Record<Locale, string> = { fa: "نمونه", en: "Sample", ar: "نموذجي" };

/**
 * Product Showcase — visual pattern matches
 * ahanassa-v0/components/home/product-showcase.tsx (grid of cards, code
 * badge, grade chips). Catalog is the same disclosed sample dataset used on
 * /products (CLAUDE.md §11 / DOCUMENT_AUDIT_REPORT.md DAR-020) — each card
 * carries a visible "sample" tag rather than presenting it as the real
 * catalog.
 */
export function ProductShowcase({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].productShowcase;
  const items = featured.map((slug) => sampleProducts.find((p) => p.slug === slug)).filter((p): p is NonNullable<typeof p> => Boolean(p));

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

        <ul className="border-border mt-14 grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <Reveal as="li" key={p.slug} delay={i * 70}>
              <Link
                href={localizedPath(locale, `/products/${p.slug}`)}
                className="group border-border bg-background hover:bg-surface flex h-full flex-col border-e border-b transition-colors"
              >
                <div className="bg-surface-2 relative aspect-16/11 overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span className="bg-navy absolute top-0 left-0 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.14em] text-white">{p.code}</span>
                  <span className="bg-copper absolute top-0 right-0 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.14em] text-white">{sampleTag[locale]}</span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-navy flex items-start justify-between gap-3 text-lg font-bold">
                    {p.name}
                    <ArrowUpRight className="text-copper mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                  </h3>
                  <p className="text-muted-foreground mt-3 flex-1 text-sm leading-relaxed">{p.summary}</p>
                  <ul className="mt-5 flex flex-wrap gap-1.5">
                    {p.grades.slice(0, 3).map((g) => (
                      <li key={g} className="border-border text-navy-600 border px-2 py-1 text-[11px] font-medium">
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
