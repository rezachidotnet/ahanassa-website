import type { Locale } from "@/config/locales";
import { normalizeVariantDimensions, normalizeVariantNominalWeight, normalizeVariantSpecifications, NOMINAL_WEIGHT_DISCLAIMER } from "@/lib/catalog/specification-presenter";
import type { ProductVariant } from "@/lib/catalog/types";

const chrome: Record<Locale, { caption: string; size: string; sku: string; units: (u: string) => string }> = {
  fa: {
    caption: "جدول مشخصات فنی و اندازه‌های موجود",
    size: "اندازه بازرگانی",
    sku: "کد کالا",
    units: (u) => `واحدهای بازرگانی قابل سفارش: ${u}`,
  },
  en: {
    caption: "Technical specifications and available sizes",
    size: "Commercial size",
    sku: "SKU",
    units: (u) => `Orderable commercial units: ${u}`,
  },
  ar: {
    caption: "جدول المواصفات الفنية والمقاسات المتاحة",
    size: "المقاس التجاري",
    sku: "رمز المنتج",
    units: (u) => `وحدات الطلب التجارية: ${u}`,
  },
};

/**
 * Commercial Variant / specification selector inside a Product/Template
 * page (docs/CATALOG_PUBLIC_ROUTES.md §Variant presentation). Reads only
 * through `normalizeVariantSpecifications` — never a raw `dimensions`/
 * `nominalWeight` JSON key. Shows SKU (customer-facing commercial code) so a
 * future RFQ picker can resolve back to `product_variant_xid` server-side;
 * the internal `xid` itself is never rendered.
 */
export function VariantSpecTable({ locale, variants }: { locale: Locale; variants: ProductVariant[] }) {
  if (variants.length === 0) return null;
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

  const commonUnits = variants.every((v) => v.allowedCommercialUnits === variants[0].allowedCommercialUnits) ? variants[0].allowedCommercialUnits : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-start text-sm">
          <caption className="sr-only">{t.caption}</caption>
          <thead>
            <tr className="border-border border-b">
              <th scope="col" className="text-navy px-3 py-2.5 text-start text-xs font-bold tracking-wide">
                {t.size}
              </th>
              {dimensionColumns.map((c) => (
                <th key={c.key} scope="col" className="text-navy px-3 py-2.5 text-start text-xs font-bold tracking-wide">
                  {c.label}
                </th>
              ))}
              {weightColumns.map((c) => (
                <th key={c.key} scope="col" className="text-navy px-3 py-2.5 text-start text-xs font-bold tracking-wide">
                  {c.label}
                </th>
              ))}
              <th scope="col" className="text-navy px-3 py-2.5 text-start text-xs font-bold tracking-wide">
                {t.sku}
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {variants.map((variant) => {
              const spec = normalizeVariantSpecifications(variant, locale);
              const dimByKey = new Map(spec.dimensions.map((r) => [r.key, r.value]));
              const weightByKey = new Map(spec.nominalWeight.map((r) => [r.key, r.value]));
              return (
                <tr key={variant.id}>
                  <th scope="row" className="text-navy px-3 py-2.5 text-start font-semibold">
                    <span dir="ltr">{variant.commercialSize ?? variant.sectionSize ?? "—"}</span>
                  </th>
                  {dimensionColumns.map((c) => (
                    <td key={c.key} className="text-muted-foreground px-3 py-2.5">
                      <span dir="ltr">{dimByKey.get(c.key) ?? "—"}</span>
                    </td>
                  ))}
                  {weightColumns.map((c) => (
                    <td key={c.key} className="text-muted-foreground px-3 py-2.5">
                      <span dir="ltr">{weightByKey.get(c.key) ?? "—"}</span>
                    </td>
                  ))}
                  <td className="text-muted-foreground px-3 py-2.5">
                    <span dir="ltr">{variant.sku}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {weightColumns.length > 0 && <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{NOMINAL_WEIGHT_DISCLAIMER[locale]}</p>}
      {commonUnits && <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t.units(commonUnits)}</p>}
    </div>
  );
}
