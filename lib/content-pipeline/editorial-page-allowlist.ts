import type { SnapshotV1 } from "../contracts/snapshot-v1.ts";
import { canPublish, isValidSlug } from "../catalog/editorial.ts";

/**
 * Product pages that are APPROVED AND PUBLISHED FROM THEIR TEMPLATE'S FIRST PUBLISH — the template-level twin of
 * lib/content-pipeline/variant-publication-allowlist.ts. Normally a template Odoo introduces is not public and has
 * no page until an operator writes, approves and publishes its fa/en/ar rows with scripts/catalog-editorial.ts.
 * For a template listed here that review happened in code review: the owner approves the page text by merging the
 * PR that adds it (each entry names its decision).
 *
 * The template's Odoo id is unknown before Odoo creates it, so an entry names its SKU family: a NEW template
 * (no catalog_products row yet) whose every SKU matches gets `is_public = 1` and one approved, published
 * `product_seo_contents` row per locale on the run that first sees it. The D1 mirror inserts those rows whole
 * (lib/content-pipeline/publication-sql.ts#mirrorStatements, insert-only); from then on DB_PUBLIC owns them as any
 * other editorial row (the CLI can edit, unpublish or hide the template), and this list never touches an EXISTING
 * template. A slug already used in a locale skips the whole entry (validate reports it), never a partial page.
 */
type Lang = "fa" | "en" | "ar";
type Tables = SnapshotV1["tables"];
type SeoRow = Tables["product_seo_contents"][number];

export interface AllowlistedPage {
  key: string;
  /** Every SKU of the template matches this. */
  skuPattern: RegExp;
  decision: string;
  slug: string;
  /** Per locale: the page H1 (also the SEO title) and intro (also, shortened, the meta description). */
  pages: Record<Lang, { h1: string; intro: string }>;
}

/**
 * W9.13 (owner decisions 2026-10-21; ahanassa-odoo w9-13/catalog-phase2): the three non-standard templates Odoo
 * creates in draft. Facts only from the owner's notes and Odoo's template (sizes, standards); en has no Persian
 * text and no price word. The pages' table notes are lib/catalog/specification-presenter.ts#variantPageNotes.
 */
const W913 = "W9.13 catalog phase 2, owner 2026-10-21 (ahanassa-odoo w9-13/catalog-phase2)";

export const PAGES_ON_FIRST_PUBLISH: readonly AllowlistedPage[] = [
  {
    key: "domestic-channel",
    skuPattern: /^AA-CH-DOM-/,
    decision: W913,
    slug: "domestic-channel",
    pages: {
      fa: {
        h1: "ناودانی داخلی",
        intro:
          "ناودانی داخلی، غیر استاندارد: مقطع نورد کارخانه‌های ایرانی و سبک‌تر از ناودانی اروپایی؛ ناودانی UPN نیست. نقشه و وزن استاندارد ندارد؛ قیمت بر حسب کیلوگرم و فروش بر اساس وزن واقعی. ارتفاع مقطع ۴۰ تا ۲۲۰ میلی‌متر، در شاخه‌های ۶ و ۱۲ متری.",
      },
      en: {
        h1: "Domestic channel",
        intro:
          "Domestic channel, non-standard: an Iranian mill section, lighter than the European channel; it is not a UPN channel. It has no standard drawing or standard weight; sold per kg by actual weight. Section heights 40 to 220 mm, in 6 m and 12 m bars.",
      },
      ar: {
        h1: "مجرى محلي",
        intro:
          "مجرى محلي، غير قياسي: مقطع من إنتاج مصانع إيرانية وأخف من المجرى الأوروبي، وليس مجرى UPN. لا يوجد رسم أو وزن قياسي؛ السعر بالكيلوغرام والبيع حسب الوزن الفعلي. ارتفاع المقطع من 40 إلى 220 مم، بأطوال 6 و12 متراً.",
      },
    },
  },
  {
    key: "seamless-pipe-mill-wall",
    skuPattern: /^AA-PP-SMLS-MW-/,
    decision: W913,
    slug: "seamless-pipe-mill-wall",
    pages: {
      fa: {
        h1: "لوله بدون درز، ضخامت کارخانه (غیر ASME)",
        intro:
          "لوله بدون درز با ضخامت دیواره کارخانه: در بازار «رده ۲۰» نامیده می‌شود ولی رده‌ای از ASME B36.10M نیست. قطر خارجی مطابق سایز اسمی (½ تا ۱½ اینچ، ۲۱٫۳ تا ۴۸٫۳ میلی‌متر) و ضخامت دیواره طبق اعلام فروشندگان است؛ وزن اسمی، وزن فولاد همان ضخامت است. شاخه ۶ متری.",
      },
      en: {
        h1: "Seamless Pipe, Mill Wall (non-ASME)",
        intro:
          "Seamless pipe in a mill's own wall series: sold in the Iranian market as 'Schedule 20', but it is not an ASME B36.10M schedule. Outside diameter of the nominal size (½ to 1½ inch, 21.3 to 48.3 mm); the wall thickness is as the sellers state it, and the nominal weight is the steel mass of that wall. 6 m lengths.",
      },
      ar: {
        h1: "أنبوب غير ملحوم، سماكة المصنع (غير ASME)",
        intro:
          "أنبوب غير ملحوم بسماكة جدار المصنع: يُباع في السوق باسم «رده 20» لكنه ليس جدولاً من ASME B36.10M. القطر الخارجي حسب المقاس الاسمي (من ½ إلى 1½ بوصة، 21.3 إلى 48.3 مم)؛ سماكة الجدار كما يذكرها البائعون، والوزن الاسمي هو كتلة الصلب لهذه السماكة. أطوال 6 أمتار.",
      },
    },
  },
  {
    key: "galvanized-steel-coil-thin-gauge",
    skuPattern: /^AA-CL-GI-S\d/,
    decision: W913,
    slug: "galvanized-steel-coil-thin-gauge",
    pages: {
      fa: {
        h1: "ورق گالوانیزه رول، ضخامت نازک",
        intro:
          "ورق گالوانیزه گرم رول با ضخامت ۰٫۳۰ یا ۰٫۳۵ میلی‌متر و عرض ۱۰۰۰ یا ۱۲۵۰ میلی‌متر. تلرانس ابعادی طبق EN 10143:2006 (فقط استاندارد تلرانس ابعادی). گرید فولاد و پوشش طبق اعلام فروشنده؛ ادعای استاندارد گرید ندارد. فروش بر اساس وزن واقعی.",
      },
      en: {
        h1: "Galvanized Steel Coil, Thin Gauge",
        intro:
          "Hot-dip galvanized steel coil, 0.30 or 0.35 mm thick, 1000 or 1250 mm wide. Dimensional tolerances to EN 10143:2006 (a tolerance standard only). Steel grade and coating as stated by the seller; no grade standard is claimed. Sold by actual weight.",
      },
      ar: {
        h1: "لفائف صلب مجلفن، سماكة رقيقة",
        intro:
          "لفائف صلب مجلفن بالغمس الساخن، بسماكة 0.30 أو 0.35 مم وعرض 1000 أو 1250 مم. تفاوتات الأبعاد وفق EN 10143:2006 (معيار تفاوتات الأبعاد فقط). درجة الصلب والطلاء كما يذكرها البائع؛ لا يُدّعى معيار للدرجة. يباع حسب الوزن الفعلي.",
      },
    },
  },
];

/** Id prefix of a seeded row: the D1 mirror inserts exactly these product_seo_contents rows (insert-only). */
export const SEEDED_PAGE_ID_PREFIX = "ps-first-";

const LOCALES: readonly Lang[] = ["fa", "en", "ar"];

/** Meta description: the intro, cut at a word to ≤ 160 characters (as the W17.4 pages). */
export function seoDescription(text: string): string {
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** The entry whose SKU family is exactly this template's SKUs (all match; at least one). */
export function pageForTemplateSkus(skus: readonly string[]): AllowlistedPage | undefined {
  if (!skus.length) return undefined;
  return PAGES_ON_FIRST_PUBLISH.find((p) => skus.every((sku) => p.skuPattern.test(sku)));
}

/** The approved, published fa/en/ar rows of an entry for one new template (deterministic: ids and times from the template). */
export function seededPageRows(page: AllowlistedPage, productId: string, templateXid: string, stamp: string): SeoRow[] {
  return LOCALES.map((locale) => ({
    id: `${SEEDED_PAGE_ID_PREFIX}${templateXid}-${locale}`,
    entity_type: "product",
    entity_id: productId,
    locale,
    slug: page.slug,
    h1: page.pages[locale].h1,
    intro: page.pages[locale].intro,
    body_json: null,
    seo_title: page.pages[locale].h1,
    seo_description: seoDescription(page.pages[locale].intro),
    faq_json: null,
    index_status: "index",
    content_quality_status: "approved",
    published_at: stamp,
    updated_at: stamp,
  }));
}

/** True when every row is publishable by the editorial rules (approved, h1, valid slug) — the CLI's own gate. */
export function seededRowsPublishable(rows: readonly SeoRow[]): boolean {
  return rows.every((r) => isValidSlug(r.slug) && canPublish({ h1: r.h1, slug: r.slug, contentQualityStatus: "approved" }));
}

/**
 * Warnings (never errors): a listed SKU family whose template is active but has no published page in some locale
 * (switched off by an editor, or skipped for a slug conflict), or whose template is not public.
 */
export function validatePageAllowlist(tables: Pick<Tables, "catalog_products" | "product_variants" | "product_seo_contents">): string[] {
  const warnings: string[] = [];
  const skusByProduct = new Map<string, string[]>();
  for (const v of tables.product_variants) skusByProduct.set(v.product_id, [...(skusByProduct.get(v.product_id) ?? []), v.sku]);
  for (const p of tables.catalog_products) {
    if (p.is_active !== 1) continue;
    const page = pageForTemplateSkus(skusByProduct.get(p.id) ?? []);
    if (!page) continue;
    const published = new Set(tables.product_seo_contents.filter((s) => s.entity_type === "product" && s.entity_id === p.id && s.content_quality_status === "approved" && s.published_at !== null).map((s) => s.locale));
    const missing = LOCALES.filter((l) => !published.has(l));
    if (p.is_public !== 1 || missing.length) warnings.push(`${p.template_xid} (${page.key}) is on the page-on-first-publish list (${page.decision}) but ${p.is_public !== 1 ? "is not public" : `has no published page in ${missing.join(", ")}`} — set it with the editorial CLI if that is not deliberate`);
  }
  return warnings;
}
