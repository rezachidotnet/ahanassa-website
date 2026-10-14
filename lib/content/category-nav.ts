import type { Locale } from "../../config/locales.ts";
import type { PublicCatalogCategory } from "../catalog/types.ts";

/**
 * W17.4 (owner instruction 2026-10-14) — website presentation of the W9.8 flat categories
 * (Odoo ahanassa_catalog_flat_raw: GALVANIZED_SHEET, PREPAINTED_SHEET, HOT_ROLLED_COIL, COLD_ROLLED).
 * Odoo still owns which categories exist, their order and their en/ar names; this module only
 *
 * 1. replaces the fa name of those four with the market name the owner approved, at the single category
 *    read (`listPublicCatalogCategories`), so the Header, drawer, filter bar, Homepage, RFQ picker and
 *    price page all show the same word. Two of Odoo's fa.po names differ today («ورق رنگی (پیش‌رنگ‌شده)»,
 *    «ورق روغنی (کلاف سرد)»); once Odoo carries these names the map changes nothing.
 * 2. groups the sheet categories under one «ورق» entry in the Header and the mobile drawer, so sheet
 *    products stay together and the Products menu stays inside its frozen cap of 8 entries.
 *
 * Codes are Odoo public category codes, verified against ahanassa_catalog_flat_raw/data/public_category.xml.
 */
export const CATEGORY_MARKET_NAMES: Readonly<Record<string, Partial<Record<Locale, string>>>> = {
  GALVANIZED_SHEET: { fa: "ورق گالوانیزه" },
  PREPAINTED_SHEET: { fa: "ورق رنگی (PPGI)" },
  HOT_ROLLED_COIL: { fa: "ورق سیاه رول (کلاف گرم)" },
  COLD_ROLLED: { fa: "ورق روغنی (نورد سرد)" },
};

/** The category with its approved market name for `locale`, or unchanged. */
export function withMarketName(category: PublicCatalogCategory, locale: Locale): PublicCatalogCategory {
  const name = CATEGORY_MARKET_NAMES[category.code]?.[locale];
  return name ? { ...category, name } : category;
}

/**
 * The «ورق» menu entry: its member categories in Odoo's order, the entry label, and the label SHEET_PLATE
 * takes inside it (its own Odoo name «ورق» would repeat the heading; the category holds hot-rolled sheet
 * and plate, `lib/content/category-seo.ts`).
 */
export const SHEET_NAV_FAMILY = {
  key: "SHEET",
  members: ["SHEET_PLATE", "GALVANIZED_SHEET", "PREPAINTED_SHEET", "HOT_ROLLED_COIL", "COLD_ROLLED"],
  label: { fa: "ورق", en: "Sheet & coil", ar: "الصاج واللفائف" } as Record<Locale, string>,
  memberLabel: { SHEET_PLATE: { fa: "ورق سیاه و پلیت", en: "Hot-rolled sheet & plate", ar: "الصاج والألواح المدرفلة على الساخن" } } as Record<string, Record<Locale, string>>,
} as const;

export interface NavFamilyEntry<T extends { code: string; name: string }> {
  code: string;
  name: string;
  /** Present only on a family entry: its member categories, each still linking to its own listing. */
  children?: T[];
}

/**
 * Header/drawer entries: every category in Odoo's order, except that the sheet categories become one
 * «ورق» entry at the place of the first one present. With fewer than two members present (today: only
 * SHEET_PLATE) nothing is grouped, so the menu is exactly as before. Never re-sorts.
 */
export function groupProductFamilies<T extends { code: string; name: string }>(items: readonly T[], locale: Locale): Array<T | NavFamilyEntry<T>> {
  const members = items.filter((i) => (SHEET_NAV_FAMILY.members as readonly string[]).includes(i.code));
  if (members.length < 2) return [...items];
  const children = members.map((m) => {
    const label = SHEET_NAV_FAMILY.memberLabel[m.code]?.[locale];
    return label ? { ...m, name: label } : m;
  });
  const out: Array<T | NavFamilyEntry<T>> = [];
  for (const item of items) {
    if (item === members[0]) out.push({ code: `family:${SHEET_NAV_FAMILY.key}`, name: SHEET_NAV_FAMILY.label[locale], children });
    else if (!members.includes(item)) out.push(item);
  }
  return out;
}

/**
 * W17.5 (owner decision 2026-10-14) — Homepage Product Showcase cards: the Header's grouping above, so the sheet
 * categories take ONE card («ورق» / "Sheet & coil" / «الصاج واللفائف») and Pipe and the rest stay inside the frozen
 * 8-card cap (the cap is applied to these cards, never raised). A Showcase card is one whole-card link (Product
 * Showcase V2.0 §72.1) and the Header's family has no listing of its own, so the family card keeps its first
 * member's code: it opens that listing (SHEET_PLATE, Odoo's «ورق») and shows that member's photo; the listing's
 * filter bar reaches the other sheet categories.
 */
export function groupShowcaseCategories<T extends { code: string; name: string }>(items: readonly T[], locale: Locale): Array<{ code: string; name: string }> {
  return groupProductFamilies(items, locale).map((entry) => ("children" in entry && entry.children ? { code: entry.children[0].code, name: entry.name } : { code: entry.code, name: entry.name }));
}
