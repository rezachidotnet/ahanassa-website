import Link from "@/components/ui/link";
import { localizedPath, type Locale } from "@/config/locales";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { normalizeVariantDimensions, normalizeVariantNominalWeight, normalizeVariantSpecifications, sortVariantsBySize, NOMINAL_WEIGHT_DISCLAIMER } from "@/lib/catalog/specification-presenter";
import type { ProductVariant } from "@/lib/catalog/types";
import type { PriceBlockData } from "@/lib/pricing/price-block-presentation";
import { presentPriceCell, PRICE_CELL_ATTRIBUTE, PRICE_COLUMN_COPY } from "@/lib/pricing/product-page-price";
import { FORM_SHAPES, resolveVariantBasis } from "@/lib/weight-calculator/model";
import { isWeightCalculatorPublished, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";

const chrome: Record<
  Locale,
  { caption: string; size: string; sku: string; units: (u: string) => string; request: string; requestAria: (size: string) => string; calculate: string; calculateAria: (size: string) => string; selected: string; swipe: string }
> = {
  fa: {
    caption: "جدول مشخصات فنی و اندازه‌های موجود",
    size: "اندازه بازرگانی",
    sku: "کد کالا",
    units: (u) => `واحدهای بازرگانی قابل سفارش: ${u}`,
    request: "درخواست این قلم",
    requestAria: (size) => `درخواست این قلم — سایز ${size}`,
    calculate: "محاسبه وزن",
    calculateAria: (size) => `محاسبه وزن — سایز ${size}`,
    selected: "قلم انتخاب‌شده",
    swipe: "جدول را افقی بکشید",
  },
  en: {
    caption: "Technical specifications and available sizes",
    size: "Commercial size",
    sku: "SKU",
    units: (u) => `Orderable commercial units: ${u}`,
    request: "Request this item",
    requestAria: (size) => `Request this item — size ${size}`,
    calculate: "Calculate weight",
    calculateAria: (size) => `Calculate weight — size ${size}`,
    selected: "Selected item",
    swipe: "Swipe the table sideways",
  },
  ar: {
    caption: "جدول المواصفات الفنية والمقاسات المتاحة",
    size: "المقاس التجاري",
    sku: "رمز المنتج",
    units: (u) => `وحدات الطلب التجارية: ${u}`,
    request: "طلب هذا الصنف",
    requestAria: (size) => `طلب هذا الصنف — مقاس ${size}`,
    calculate: "حساب الوزن",
    calculateAria: (size) => `حساب الوزن — مقاس ${size}`,
    selected: "الصنف المحدد",
    swipe: "اسحب الجدول أفقيًا",
  },
};

const HEAD = "border-border text-muted-foreground border-b bg-surface px-4 py-3 text-start text-xs font-bold whitespace-nowrap";
// Row separators on every cell (border-separate tables do not paint <tr> borders); the last row has none.
const CELL = "border-b border-[var(--aa-color-neutral-100)] px-4 py-3 whitespace-nowrap group-last:border-b-0";

/** A stable, URL/HTML-id-safe anchor derived from the variant's own SKU — never the internal xid (kept out of the DOM/URL per the existing "xid is never rendered" rule). Lets a link elsewhere (query param today, a future `#anchor` deep link) point at one specific row. */
export function variantRowAnchorId(sku: string): string {
  return `v-${sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

/**
 * Commercial Variant / specification selector inside a Product/Template
 * page (docs/CATALOG_PUBLIC_ROUTES.md §Variant presentation;
 * Catalog -> RFQ Variant Preselection, docs/CATALOG_RFQ_INTEGRATION.md).
 * Reads only through `normalizeVariantSpecifications` — never a raw
 * `dimensions`/`nominalWeight` JSON key. Shows SKU (customer-facing
 * commercial code); the internal `xid` itself is never rendered, only used
 * server-side to build each row's "Request this item" link
 * (`/{locale}/contact?variant=<xid>`) — a plain server-rendered `<Link>`,
 * never constructed or resolved client-side, and never an ecommerce
 * "Buy"/"Add to cart" control.
 *
 * Every row carries an `id` anchor (`variantRowAnchorId`). A Variant-scoped
 * link (`/products/<slug>?variant=<xid>`) is highlighted in the browser by
 * `VariantHighlightFromQuery` — the page is static and takes no searchParams
 * (architecture V1.1 §4.2) — without ever creating a Variant SEO page.
 *
 * W9.4: with `prices` (Persian pages, static build only) a «قیمت روز» column,
 * right after the size column, shows each variant's published price — amount
 * in Toman/kg + compact factory/location + date — or «استعلام قیمت». The
 * column is hidden when none of the page's variants has a price (owner
 * decision 2026-10-09; the page's PriceBlock still says «استعلام قیمت»).
 * en/ar never get it (`presentPriceCell` presents nothing for them). Each
 * cell carries `data-aa-price-cell` for the publication gate's allow-list check.
 */
export function VariantSpecTable({ locale, variants: unsorted, prices }: { locale: Locale; variants: ProductVariant[]; prices?: ReadonlyMap<string, PriceBlockData> | null }) {
  if (unsorted.length === 0) return null;
  // Natural size order (IPE 80 before IPE 600) — the presenter owns it, W10.0 P0-1.
  const variants = sortVariantsBySize(unsorted);
  const t = chrome[locale];

  const dimensionColumns: { key: string; label: string }[] = [];
  const seenDim = new Set<string>();
  const weightColumns: { key: string; label: string }[] = [];
  const seenWeight = new Set<string>();

  for (const variant of variants) {
    for (const row of normalizeVariantDimensions(variant, locale)) {
      if (!seenDim.has(row.key)) {
        seenDim.add(row.key);
        dimensionColumns.push({ key: row.key, label: row.label });
      }
    }
    for (const row of normalizeVariantNominalWeight(variant, locale)) {
      if (!seenWeight.has(row.key)) {
        seenWeight.add(row.key);
        weightColumns.push({ key: row.key, label: row.label });
      }
    }
  }

  const showPrices = locale === "fa" && Boolean(prices) && variants.some((v) => prices!.has(v.xid));

  // «محاسبه وزن» only where the calculator is published and offers this exact size (same rule it builds its list with).
  const calculable = (variant: ProductVariant) => {
    const shape = FORM_SHAPES[variant.form.code ?? ""];
    return isWeightCalculatorPublished(locale) && shape !== undefined && resolveVariantBasis(shape, variant) !== null;
  };

  const commonUnits = variants.every((v) => v.allowedCommercialUnits === variants[0].allowedCommercialUnits) ? variants[0].allowedCommercialUnits : null;

  return (
    <div>
      {/* Mobile: the table scrolls inside this region, never the page. */}
      <p className="text-tertiary mb-2 text-xs md:hidden" aria-hidden="true">
        {t.swipe}
      </p>
      {/*
        The scroll region (W10.0 P0-1). `relative` is load-bearing: it makes
        this box the containing block of the absolutely-positioned sr-only
        header/caption text, which otherwise escaped the overflow clip and
        scrolled the whole page sideways (346/468/385 px at 390 px, fa/en/ar).
        Focusable + named so keyboard users can scroll it (WCAG 2.1.1).
      */}
      <div role="region" aria-label={t.caption} tabIndex={0} className="border-border bg-background relative overflow-x-auto rounded-[var(--aa-radius-card)] border">
        <table className="text-ui w-full min-w-max border-separate border-spacing-0 text-start">
          <caption className="sr-only">{t.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(HEAD, "bg-surface sticky start-0 z-[2]")}>
                {t.size}
              </th>
              {showPrices && (
                <th scope="col" className={HEAD}>
                  {PRICE_COLUMN_COPY.header}
                  <span className="text-tertiary block text-[11px] font-semibold">{PRICE_COLUMN_COPY.unit}</span>
                </th>
              )}
              {dimensionColumns.map((c) => (
                <th key={c.key} scope="col" className={HEAD}>
                  {c.label}
                </th>
              ))}
              {weightColumns.map((c) => (
                <th key={c.key} scope="col" className={HEAD}>
                  {c.label}
                </th>
              ))}
              <th scope="col" className={HEAD}>
                {t.sku}
              </th>
              <th scope="col" className={HEAD}>
                <span className="sr-only">{t.request}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => {
              const spec = normalizeVariantSpecifications(variant, locale);
              const dimByKey = new Map(spec.dimensions.map((r) => [r.key, r.value]));
              const weightByKey = new Map(spec.nominalWeight.map((r) => [r.key, r.value]));
              return (
                <tr
                  // Public canonical id (CVAR): React keys are serialized into the static HTML, internal row ids must not be (W4 publication gate).
                  key={variant.xid}
                  id={variantRowAnchorId(variant.sku)}
                  className="group scroll-mt-24"
                >
                  <th scope="row" className={cn(CELL, "text-navy bg-background group-hover:bg-surface sticky start-0 z-[1] text-start font-bold")}>
                    <span dir="ltr">{variant.commercialSize ?? variant.sectionSize ?? "—"}</span>
                  </th>
                  {showPrices && <PriceCell locale={locale} xid={variant.xid} price={prices?.get(variant.xid)} />}
                  {dimensionColumns.map((c) => (
                    <td key={c.key} className={cn(CELL, "text-muted-foreground group-hover:bg-surface")}>
                      <span dir="ltr">{dimByKey.get(c.key) ?? "—"}</span>
                    </td>
                  ))}
                  {weightColumns.map((c) => (
                    <td key={c.key} className={cn(CELL, "text-muted-foreground group-hover:bg-surface")}>
                      <span dir="ltr">{weightByKey.get(c.key) ?? "—"}</span>
                    </td>
                  ))}
                  <td className={cn(CELL, "text-muted-foreground group-hover:bg-surface")}>
                    <span dir="ltr">{variant.sku}</span>
                  </td>
                  <td className={cn(CELL, "group-hover:bg-surface py-0")}>
                    <div className="flex items-center gap-5">
                      {/* Plain <a> (components/ui/link.tsx): no prefetch of any kind, so 38 per-variant links cost nothing until clicked. */}
                      <Link
                        href={`${localizedPath(locale, "/contact")}?variant=${encodeURIComponent(variant.xid)}`}
                        aria-label={t.requestAria(variant.commercialSize ?? variant.sectionSize ?? variant.sku)}
                        className={buttonVariants({ variant: "link", className: "font-semibold whitespace-nowrap" })}
                      >
                        {t.request}
                      </Link>
                      {calculable(variant) && (
                        // W10.1: opens the weight calculator with this size preselected (?variant= is read in the browser).
                        <Link
                          href={`${localizedPath(locale, WEIGHT_CALCULATOR_ROUTE)}?variant=${encodeURIComponent(variant.xid)}`}
                          aria-label={t.calculateAria(variant.commercialSize ?? variant.sectionSize ?? variant.sku)}
                          className={buttonVariants({ variant: "link", className: "whitespace-nowrap" })}
                        >
                          {t.calculate}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPrices && <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{PRICE_COLUMN_COPY.note}</p>}
      {weightColumns.length > 0 && <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{NOMINAL_WEIGHT_DISCLAIMER[locale]}</p>}
      {commonUnits && <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t.units(commonUnits)}</p>}
    </div>
  );
}

function PriceCell({ locale, xid, price }: { locale: Locale; xid: string; price: PriceBlockData | undefined }) {
  const view = presentPriceCell(locale, price);
  if (!view) return null;
  return (
    <td {...{ [PRICE_CELL_ATTRIBUTE]: xid }} className={cn(CELL, "group-hover:bg-surface")}>
      {view.kind === "missing" ? (
        <span className="text-muted-foreground">{view.label}</span>
      ) : (
        <>
          <span className="text-navy font-bold">{view.amount}</span>
          <span className="text-tertiary block text-xs">{view.place}</span>
          <time dateTime={view.datetime} className="text-tertiary block text-xs">
            {view.dateLabel}
          </time>
        </>
      )}
    </td>
  );
}

/** The "selected item" label the browser-side `?variant=` highlight appends to the row header. */
export function variantSelectedLabel(locale: Locale): string {
  return chrome[locale].selected;
}
