"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { categories, sampleProducts, type ProductCategory } from "@/lib/content/catalog-sample";
import { localizedPath, type Locale } from "@/config/locales";
import { cn } from "@/lib/utils";

type Filter = ProductCategory | "all";

const chrome: Record<Locale, { all: string; resultCount: (n: number) => string }> = {
  fa: { all: "همه محصولات", resultCount: (n) => `${n} محصول نمایش داده شد` },
  en: { all: "All products", resultCount: (n) => `${n} products shown` },
  ar: { all: "كل المنتجات", resultCount: (n) => `${n} منتج معروض` },
};

export function Catalogue({ locale, initial = "all" }: { locale: Locale; initial?: Filter }) {
  const [filter, setFilter] = useState<Filter>(initial);
  const t = chrome[locale];

  const visible = useMemo(
    () => (filter === "all" ? sampleProducts : sampleProducts.filter((p) => p.category === filter)),
    [filter],
  );

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: t.all, count: sampleProducts.length },
    ...categories.map((c) => ({ id: c.id as Filter, label: c.label, count: sampleProducts.filter((p) => p.category === c.id).length })),
  ];

  return (
    <section className="border-border bg-background border-b py-14 lg:py-20">
      <div className="container-x">
        <div role="tablist" className="border-border flex flex-wrap gap-2 border-b pb-6">
          {tabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 border px-4 py-2.5 text-[13px] font-semibold transition-colors",
                  active ? "border-navy bg-navy text-white" : "border-border text-navy-600 hover:border-navy hover:text-navy",
                )}
              >
                {tab.label}
                <span className={cn("text-[11px] font-bold", active ? "text-copper-400" : "text-muted-foreground")}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="sr-only">
          {t.resultCount(visible.length)}
        </p>

        <ul className="border-border mt-10 grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <li key={p.slug}>
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
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="text-navy flex items-start justify-between gap-3 text-lg font-bold">
                    {p.name}
                    <ArrowUpRight className="text-copper mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                  </h2>
                  <p className="text-muted-foreground mt-3 flex-1 text-sm leading-relaxed">{p.summary}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
