import type { Locale } from "../../config/locales.ts";
import { getPublishedCatalogTemplateBySlug, listPublicCatalogCategories, listPublishedCatalogTemplates } from "../catalog/editorial-repository.ts";
import { indexPublicCategoriesByGroupCode, resolveRfqPublicCategory } from "../catalog/public-categories.ts";
import { normalizeVariantNominalWeight, sortVariantsBySize } from "../catalog/specification-presenter.ts";
import type { ProductVariant } from "../catalog/types.ts";
import { listAllFactoryPrices, listAllImportedPrices, listAllPublishedPrices } from "./product-page-price-repository.ts";
import { buildPriceTableRows, type PriceTableRow } from "./price-page.ts";
import { publishedHubFamilies, type PriceHubCategoryCode } from "./price-hubs.ts";
import { isPriceLocale, type PriceLocale } from "./price-locale.ts";
import { priceDay, type PriceDay } from "./price-titles.ts";

/**
 * The build-time read behind every price-table surface (W9.6 `/prices`, W16.3 `/prices/<family>`) and the
 * "is this family priced today" checks of the category, product and price pages. Snapshot only: outside the
 * static export build `listAllPublishedPrices` is null, so there are no rows and no hub is published.
 */

/** Weight shown next to a price: per piece (bar/sheet) when the catalog has it, else per metre / m². */
const WEIGHT_PREFERENCE = ["per_branch", "per_sheet", "kg_m", "kg_m2"];

export function preferredNominalWeight(variant: Pick<ProductVariant, "nominalWeight">, locale: Locale): { label: string; value: string } | null {
  const rows = normalizeVariantNominalWeight(variant, locale);
  for (const key of WEIGHT_PREFERENCE) {
    const row = rows.find((r) => r.key === key);
    if (row) return { label: row.label, value: row.value };
  }
  return null;
}

/**
 * Every published template of the locale with its priced variants, as table rows, in catalog order. One read
 * per locale per build process (the snapshot is fixed for a build; many pages ask).
 */
const rowsByLocale = new Map<PriceLocale, Promise<PriceTableRow[]>>();
export function loadPriceTableRows(locale: PriceLocale): Promise<PriceTableRow[]> {
  let rows = rowsByLocale.get(locale);
  if (!rows) rowsByLocale.set(locale, (rows = readPriceTableRows(locale)));
  return rows;
}

async function readPriceTableRows(locale: PriceLocale): Promise<PriceTableRow[]> {
  const prices = await listAllPublishedPrices();
  // W34: the lowest imported prices, apart (an imported-only variant has a row too).
  const imported = await listAllImportedPrices();
  if (!prices || (prices.size === 0 && !imported?.size)) return [];
  const templates = await listPublishedCatalogTemplates(locale);
  const details = await Promise.all(templates.map((t) => getPublishedCatalogTemplateBySlug(locale, t.seo.slug)));
  const categoryIndex = indexPublicCategoriesByGroupCode(await listPublicCatalogCategories(locale));
  const family = (groupCode: string | null, familyName: string | null, formCode: string | null = null) => {
    const c = resolveRfqPublicCategory(categoryIndex, locale, groupCode, familyName, formCode);
    return { code: c.code ?? "other", label: c.label ?? groupCode ?? "—", position: c.position };
  };
  return buildPriceTableRows(
    locale,
    details.flatMap((d) =>
      d
        ? [
            {
              slug: d.seo.slug,
              productName: d.seo.h1 ?? d.product.commercialTemplateName,
              variants: sortVariantsBySize(d.variants).map((v) => ({
                xid: v.xid,
                size: v.commercialSize ?? v.sectionSize ?? v.sku,
                groupCode: v.group.code,
                formCode: v.form.code,
                familyName: v.family.name,
                weight: preferredNominalWeight(v, locale),
              })),
            },
          ]
        : [],
    ),
    prices,
    family,
    // W20.7: every factory's price, fa only (ar shows the lowest + date, en no price).
    locale === "fa" ? await listAllFactoryPrices() : null,
    imported,
  );
}

/** The hub families published in `locale` today (none on en). */
export async function listPublishedHubFamilies(locale: Locale): Promise<PriceHubCategoryCode[]> {
  if (!isPriceLocale(locale)) return [];
  return publishedHubFamilies(await loadPriceTableRows(locale));
}

/**
 * W16.8 — the snapshot's fetch time (`source.fetched_at`, set by scripts/static/build.ts): the reference day of
 * «امروز» in the price titles. Data, never the build clock; null outside the static build.
 */
export function snapshotFetchedAt(): string | null {
  return process.env.AHANASSA_SNAPSHOT_FETCHED_AT || null;
}

/** W16.8: the dated day of a price time for the titles, H1s and meta of the price pages. */
export function loadPriceDay(locale: PriceLocale, pricedAt: string): PriceDay {
  return priceDay(locale, pricedAt, snapshotFetchedAt());
}
