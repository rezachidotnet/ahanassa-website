import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, Download, FileArchive, FileSpreadsheet, FileText } from "lucide-react";
import { isLocale, locales, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { DOWNLOADS_ROUTE, rawMaterialsCatalogPath, sectionsCatalogPath } from "@/lib/downloads/paths";
import { downloadsCopy } from "@/lib/downloads/copy";
import { loadDownloadCatalog } from "@/lib/downloads/source";
import { buildDownloadCenter, formatFileSize, type CenterFamily, type CenterRow, type DownloadFile } from "@/lib/downloads/center";
import { loadDownloadSizes } from "@/lib/downloads/file-sizes";
import { listAllPublishedPrices } from "@/lib/pricing/product-page-price-repository";
import { isPricePagePublished } from "@/lib/pricing/price-page";
import { variantRowAnchorId } from "@/components/products/variant-spec-table";
import { ITEM_LIST_TEMPLATE_PATH } from "@/lib/rfq/attachment-policy";
import { PageHero } from "@/components/ui/page-hero";
import { buttonVariants } from "@/components/ui/button-variants";
import { cardVariants } from "@/components/ui/surface-variants";
import { DownloadCenterFilter } from "@/components/downloads/download-center-filter";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export { generateLocaleStaticParams as generateStaticParams } from "@/lib/static/locale-params";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = downloadsCopy(locale);
  return buildPageMetadata({ locale, path: DOWNLOADS_ROUTE, title: t.title, description: t.description, indexable: publicPageIndexable() });
}

const RESULTS_ID = "dl-results";
const DIGITS: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };
const TEXT_LINK = "text-navy hover:text-copper inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline decoration-1 underline-offset-4 hover:decoration-2";
/**
 * A file button (the secondary button's look) and a row's text link, as component classes
 * (styles/theme-extensions.css, .dl-file / .dl-link): a family table repeats them on every size, and the page's
 * HTML and its RSC payload carry each copy.
 */
const FILE_BUTTON = "aa-button dl-file";

/** "100X100X10" → "100×100×10"; Latin digits, read left to right. */
const displaySize = (size: string) => size.replace(/(\d)\s*[xX×*]\s*(?=\d)/g, "$1×");

function SizeNote({ locale, file }: { locale: Locale; file: DownloadFile }) {
  if (file.bytes === null) return null;
  return <small>{formatFileSize(locale, file.bytes)}</small>;
}

/**
 * W17.2 — Download Center (fa/en/ar). W20.8 — one page built to find a file fast: quick access to the two
 * catalogs, a sticky filter bar (size search, file type, family; components/downloads/download-center-filter.tsx)
 * and one collapsible group per section family, each size with its outline preview (same geometry as the DXF),
 * DXF + PDF drawing, the fa price link when the size has a published price, and the RFQ hand-off. Every file is
 * written by the static build before this page renders (lib/downloads/generate.ts, lib/downloads/file-sizes.ts);
 * the page lists exactly those files. No price, no gating, no e-mail capture. Without JavaScript every family is
 * open and the filter bar is replaced by a plain list of family anchors.
 */
export default async function DownloadsPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const t = downloadsCopy(locale);
  const c = t.center;
  const catalog = await loadDownloadCatalog(locale);
  // fa only: which sizes have a published price (a link to the product page, never an amount here).
  const prices = locale === "fa" && isPricePagePublished(locale) ? await listAllPublishedPrices() : null;
  const center = buildDownloadCenter(catalog, { sizes: loadDownloadSizes(), pricedXids: prices ? new Set(prices.keys()) : undefined });
  const others = locales.filter((l) => l !== locale);
  const number = new Intl.NumberFormat(DIGITS[locale], { maximumFractionDigits: 2 });
  const monthYear = new Intl.DateTimeFormat(DIGITS[locale], { year: "numeric", month: "long", timeZone: "Asia/Tehran" });

  const quick = [
    { key: "sections", icon: BookOpen, title: t.catalogs.sections, body: t.catalogs.sectionsBody, file: center.catalogs.sections, href: sectionsCatalogPath, type: "catalog" },
    { key: "raw", icon: BookOpen, title: t.catalogs.raw, body: t.catalogs.rawBody, file: center.catalogs.raw, href: rawMaterialsCatalogPath, type: "catalog" },
  ] as const;

  return (
    <>
      <PageHero locale={locale} eyebrow={t.h1} title={t.h1} body={t.intro} breadcrumb={[{ path: DOWNLOADS_ROUTE, label: t.h1 }]} />

      {/* No JavaScript: the filter controls cannot work, so they are hidden and the family anchors shown instead. */}
      <noscript>
        <style>{"[data-dl-js]{display:none!important}[data-dl-nojs]{display:flex!important}"}</style>
      </noscript>

      <section aria-labelledby="dl-quick-title" className="bg-background border-border border-b py-10 lg:py-12">
        <div className="container-x">
          <h2 id="dl-quick-title" className="eyebrow text-copper">
            {c.quickTitle}
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {quick.map((q) => (
              <li key={q.key} className={cn(cardVariants({ variant: "card" }), "flex gap-4 p-5")}>
                <q.icon aria-hidden="true" className="text-copper mt-1 size-6 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-navy text-lg font-bold">{q.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{q.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <a href={q.file.href} data-dl-file={q.type} className={buttonVariants({ variant: "primary", size: "sm" })}>
                      <Download aria-hidden="true" />
                      PDF · {t.languageNames[locale]}
                      {q.file.bytes !== null && <span className="text-xs font-normal opacity-80">{formatFileSize(locale, q.file.bytes)}</span>}
                    </a>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-sm">
                      {t.catalogs.otherLanguages}
                      {others.map((l) => (
                        <a key={l} href={q.href(l)} hrefLang={l} lang={l} data-dl-file={q.type} className={TEXT_LINK}>
                          {t.languageNames[l]}
                        </a>
                      ))}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="dl-results-title" className="bg-muted/40 pb-16 lg:pb-24">
        <div role="search" aria-label={c.filterLabel} className="border-border bg-background sticky top-[72px] z-30 border-b py-3 lg:top-[68px]">
          <div className="container-x">
            <DownloadCenterFilter
              resultsId={RESULTS_ID}
              digitsLocale={DIGITS[locale]}
              families={center.families.map((f) => ({ code: f.code, segment: f.segment, label: f.forms ? `${f.name} ${f.forms}` : f.name, count: f.rows.length }))}
              copy={{
                filterLabel: c.filterLabel,
                search: c.search,
                searchPlaceholder: c.searchPlaceholder,
                searchHint: c.searchHint,
                typeLegend: c.typeLegend,
                types: c.types,
                familyLegend: c.familyLegend,
                allFamilies: c.allFamilies,
                count: c.count,
                noMatch: c.noMatch,
                clear: c.clear,
                openFilters: c.openFilters,
                closeFilters: c.closeFilters,
                showResults: c.showResults,
              }}
            />
            <nav aria-label={c.familyLegend}>
              <ul data-dl-nojs className="hidden flex-wrap gap-x-5">
                {center.families.map((f) => (
                  <li key={f.segment}>
                    <a href={`#family-${f.segment}`} className={TEXT_LINK}>
                      {f.name}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#catalogs" className={TEXT_LINK}>
                    {c.catalogsTitle}
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div id={RESULTS_ID} className="container-x pt-8">
          <h2 id="dl-results-title" className="text-navy text-2xl font-extrabold">
            {c.resultsTitle}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">{t.drawings.body}</p>

          {center.families.length === 0 && <p className="text-muted-foreground mt-6 text-sm">{t.drawings.empty}</p>}
          <div className="mt-6 grid gap-4">
            {center.families.map((f) => (
              <FamilyGroup key={f.code} locale={locale} family={f} number={number} updated={monthYear.format(new Date(f.updatedAt))} />
            ))}
          </div>

          {center.otherSheets.length > 0 && (
            <section data-dl-section="sheets" aria-labelledby="dl-sheets-title" className="mt-12">
              <h2 id="dl-sheets-title" className="text-navy flex items-center gap-3 text-xl font-extrabold">
                <FileText aria-hidden="true" className="text-copper size-5 shrink-0" />
                {c.otherSheetsTitle}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">{c.otherSheetsBody}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {center.otherSheets.map((s) => (
                  <li key={s.code} className={cn(cardVariants({ variant: "card" }), "flex items-center justify-between gap-3 px-4 py-2")}>
                    <span className="text-navy text-sm font-semibold">{s.name}</span>
                    <a href={s.file.href} data-dl-file="spec_sheet" data-dl-family={s.code} className={FILE_BUTTON}>
                      <FileText aria-hidden="true" />
                      PDF <SizeNote locale={locale} file={s.file} />
                      <span className="sr-only"> {s.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="catalogs" data-dl-section="catalogs" aria-labelledby="dl-catalogs-title" className="mt-12 scroll-mt-48">
            <h2 id="dl-catalogs-title" className="text-navy flex items-center gap-3 text-xl font-extrabold">
              <BookOpen aria-hidden="true" className="text-copper size-5 shrink-0" />
              {c.catalogsTitle}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: t.catalogs.sections, href: sectionsCatalogPath },
                { title: t.catalogs.raw, href: rawMaterialsCatalogPath },
              ].flatMap((cat) =>
                locales.map((l) => (
                  <li key={`${cat.title}-${l}`} className={cn(cardVariants({ variant: "card" }), "flex items-center justify-between gap-3 px-4 py-2")}>
                    <span className="text-navy text-sm font-semibold">
                      {cat.title}{" "}
                      <span className="text-muted-foreground font-normal" lang={l}>
                        · {t.languageNames[l]}
                      </span>
                    </span>
                    <a href={cat.href(l)} hrefLang={l} data-dl-file="catalog" className={FILE_BUTTON}>
                      <Download aria-hidden="true" />
                      PDF
                      <span className="sr-only">
                        {" "}
                        {cat.title}, {t.languageNames[l]}
                      </span>
                    </a>
                  </li>
                )),
              )}
              <li className={cn(cardVariants({ variant: "card" }), "flex items-center justify-between gap-3 px-4 py-2")}>
                <span className="text-navy text-sm font-semibold">{t.templates.itemList}</span>
                <a href={ITEM_LIST_TEMPLATE_PATH(locale)} download data-dl-file="template" className={FILE_BUTTON}>
                  <FileSpreadsheet aria-hidden="true" />
                  XLSX
                  <span className="sr-only"> {t.templates.itemList}</span>
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground mt-4 max-w-3xl text-sm leading-relaxed">
              {t.templates.itemListBody}{" "}
              <a href={localizedPath(locale, "/contact")} className={TEXT_LINK}>
                {t.pdf.request}
              </a>
            </p>
          </section>
        </div>
      </section>
    </>
  );
}

function FamilyGroup({ locale, family: f, number, updated }: { locale: Locale; family: CenterFamily; number: Intl.NumberFormat; updated: string }) {
  const t = downloadsCopy(locale);
  const c = t.center;
  return (
    <details open id={`family-${f.segment}`} data-dl-family-group={f.code} data-product-family={f.code} className={cn(cardVariants({ variant: "card" }), "group/fam scroll-mt-48 overflow-hidden")}>
      <summary className="hover:bg-muted/50 grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <h3 className="text-navy col-start-1 text-lg font-bold">
          {f.name}{" "}
          {f.forms && (
            <span dir="ltr" className="text-muted-foreground text-base font-semibold">
              {f.forms}
            </span>
          )}
        </h3>
        <span className="text-muted-foreground col-start-1 mt-0.5 text-xs">
          {c.sizesCount.replace("{n}", number.format(f.rows.length))}
          {f.standards.length > 0 && (
            <>
              {" · "}
              {c.standard}: <span dir="ltr">{f.standards.map((s) => s.split(" — ")[0]).join(", ")}</span>
            </>
          )}
          {" · "}
          {c.updated}: {updated}
        </span>
        <span
          aria-hidden="true"
          className="col-start-2 row-span-2 row-start-1 border-border-control text-navy inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-transform duration-[160ms] group-open/fam:rotate-180 motion-reduce:transition-none"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </summary>

      <div className="border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3 sm:px-6">
        <a href={f.zip.href} download data-dl-zip data-dl-kind="zip" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "gap-1.5")} title={c.zipBody}>
          <FileArchive aria-hidden="true" />
          {c.zip}
          {f.zip.bytes !== null && <span className="text-xs font-normal opacity-80">{formatFileSize(locale, f.zip.bytes)}</span>}
        </a>
        <a href={f.specSheet.href} data-dl-file="spec_sheet" data-dl-kind="pdf" className={TEXT_LINK}>
          <FileText aria-hidden="true" className="text-copper size-4" />
          {c.familySheet} (PDF) <SizeNote locale={locale} file={f.specSheet} />
        </a>
      </div>

      <ul className="border-border divide-border divide-y border-t">
        {f.rows.map((row) => (
          <SizeRow key={row.slug} locale={locale} familyCode={f.code} row={row} number={number} />
        ))}
      </ul>
    </details>
  );
}

function SizeRow({ locale, familyCode, row, number }: { locale: Locale; familyCode: string; row: CenterRow; number: Intl.NumberFormat }) {
  const c = downloadsCopy(locale).center;
  const size = displaySize(row.size);
  return (
    <li
      id={`size-${row.slug}`}
      data-dl-row
      data-dl-family={familyCode}
      data-dl-form={row.formCode}
      data-dl-size={row.sizeKey}
      data-dl-q={row.searchText}
      data-dl-product={row.templateSlug}
      className="dl-row"
    >
      <svg viewBox={row.preview.viewBox} width="48" height="48" aria-hidden="true">
        <path d={row.preview.d} />
      </svg>
      <div>
        <p>
          <span dir="ltr">{size}</span>
        </p>
        {row.kgPerM !== null && (
          <p>
            <span className="sr-only">{c.weight}: </span>
            {number.format(row.kgPerM)} <span dir="ltr">kg/m</span>
          </p>
        )}
      </div>
      <div>
        <a href={row.dxf.href} download data-dl-file="dxf" data-dl-kind="dxf" className={FILE_BUTTON}>
          DXF <SizeNote locale={locale} file={row.dxf} />
          <span className="sr-only"> {size}</span>
        </a>
        <a href={row.pdf.href} data-dl-file="pdf" data-dl-kind="pdf" className={FILE_BUTTON}>
          PDF <SizeNote locale={locale} file={row.pdf} />
          <span className="sr-only"> {size}</span>
        </a>
        {row.priced && (
          <a href={`${localizedPath(locale, `/products/${row.templateSlug}`)}#${variantRowAnchorId(row.sku)}`} className="dl-link">
            {c.price}
            <span className="sr-only"> {size}</span>
          </a>
        )}
        <a href={`${localizedPath(locale, "/contact")}?variant=${encodeURIComponent(row.xid)}`} data-dl-rfq className="dl-link dl-rfq">
          {c.rfq}
          <span className="sr-only"> {size}</span>
        </a>
      </div>
    </li>
  );
}
