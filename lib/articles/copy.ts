import type { ArticleLocale } from "../contracts/snapshot-articles.ts";
import { formatPersianDate } from "../pricing/price-block-presentation.ts";
import { formatArabicDate } from "../pricing/price-locale.ts";

/**
 * W11.1 — fixed copy of the article pages. ar uses Arabic letters only (ي ك, never the Persian-only
 * letters the leak scan refuses on ar); en has no word about prices.
 */
export const ARTICLE_COPY: Record<
  ArticleLocale,
  {
    nav: string;
    title: string;
    body: string;
    metaDescription: string;
    all: string;
    filterLabel: string;
    published: string;
    updated: string;
    minutes: (n: number) => string;
    readingTime: string;
    toc: string;
    faq: string;
    sources: string;
    relatedProducts: string;
    relatedArticles: string;
    rfq: string;
    rfqBody: string;
    author: string;
    pagination: string;
    previous: string;
    next: string;
    pageOf: (page: number, pages: number) => string;
    categoryTitle: (label: string) => string;
    categoryMeta: (label: string) => string;
  }
> = {
  fa: {
    nav: "مقالات",
    title: "مقالات",
    body: "راهنمای خرید، استانداردها، اجرا و تحلیل بازار آهن‌آلات از تحریریهٔ آهن آسا.",
    metaDescription: "مقالات آهن آسا: راهنمای خرید آهن‌آلات، جدول‌ها و استانداردهای فولاد، روش‌های اجرا و تحلیل بازار آهن برای خریداران و مهندسان.",
    all: "همه",
    filterLabel: "دسته‌بندی مقالات",
    published: "انتشار",
    updated: "به‌روزرسانی",
    minutes: (n) => `${n.toLocaleString("fa-IR")} دقیقه مطالعه`,
    readingTime: "زمان مطالعه",
    toc: "فهرست مطالب",
    faq: "پرسش‌های متداول",
    sources: "منابع",
    relatedProducts: "محصولات مرتبط",
    relatedArticles: "مقالات مرتبط",
    rfq: "استعلام قیمت",
    rfqBody: "فهرست خرید یا مشخصات مورد نیاز خود را بفرستید؛ کارشناسان آهن آسا قیمت و شرایط تحویل را اعلام می‌کنند.",
    author: "نویسنده:",
    pagination: "صفحه‌بندی مقالات",
    previous: "صفحهٔ قبل",
    next: "صفحهٔ بعد",
    pageOf: (p, n) => `صفحهٔ ${p.toLocaleString("fa-IR")} از ${n.toLocaleString("fa-IR")}`,
    categoryTitle: (label) => `مقالات ${label}`,
    categoryMeta: (label) => `مقالات ${label} در آهن آسا: راهنماها و تحلیل‌های تحریریهٔ آهن آسا برای خریداران آهن‌آلات و مهندسان.`,
  },
  ar: {
    nav: "المقالات",
    title: "المقالات",
    body: "أدلة الشراء والمعايير والتطبيق وتحليل سوق الحديد من فريق تحرير آهن آسا.",
    metaDescription: "مقالات آهن آسا: أدلة شراء الحديد والصلب، الجداول والمعايير، أساليب التنفيذ وتحليل سوق الحديد في إيران للمستوردين والمهندسين.",
    all: "الكل",
    filterLabel: "تصنيفات المقالات",
    published: "النشر",
    updated: "آخر تحديث",
    // Arabic number agreement: 1 دقيقة واحدة, 2 دقيقتان, 3–10 دقائق, 11+ دقيقة.
    minutes: (n) => `${n === 1 ? "دقيقة واحدة" : n === 2 ? "دقيقتان" : n <= 10 ? `${n.toLocaleString("ar-EG")} دقائق` : `${n.toLocaleString("ar-EG")} دقيقة`} قراءة`,
    readingTime: "مدة القراءة",
    toc: "محتويات المقال",
    faq: "الأسئلة الشائعة",
    sources: "المصادر",
    relatedProducts: "منتجات ذات صلة",
    relatedArticles: "مقالات ذات صلة",
    rfq: "طلب تسعير",
    rfqBody: "أرسل قائمة الشراء أو المواصفات المطلوبة، وسيرد عليك فريق آهن آسا بالسعر وشروط التسليم.",
    author: "الكاتب:",
    pagination: "صفحات المقالات",
    previous: "الصفحة السابقة",
    next: "الصفحة التالية",
    pageOf: (p, n) => `الصفحة ${p.toLocaleString("ar-EG")} من ${n.toLocaleString("ar-EG")}`,
    categoryTitle: (label) => `مقالات ${label}`,
    categoryMeta: (label) => `مقالات ${label} من آهن آسا: أدلة وتحليلات فريق التحرير لمستوردي الحديد والمهندسين.`,
  },
  en: {
    nav: "Articles",
    title: "Articles",
    body: "Buying guides, standards, installation and market analysis for steel buyers, from the Ahan Asa editorial team.",
    metaDescription: "Ahan Asa articles: steel buying guides, weight tables and standards, installation methods and Iran steel market analysis for importers and engineers.",
    all: "All",
    filterLabel: "Article categories",
    published: "Published",
    updated: "Updated",
    minutes: (n) => `${n} min read`,
    readingTime: "Reading time",
    toc: "Contents",
    faq: "Frequently asked questions",
    sources: "Sources",
    relatedProducts: "Related products",
    relatedArticles: "Related articles",
    rfq: "Request a quote",
    rfqBody: "Send your purchase list or the specifications you need; the Ahan Asa team replies with an offer and delivery terms.",
    author: "By",
    pagination: "Article pages",
    previous: "Previous page",
    next: "Next page",
    pageOf: (p, n) => `Page ${p} of ${n}`,
    categoryTitle: (label) => `${label} articles`,
    categoryMeta: (label) => `${label} articles from Ahan Asa: guides and analysis by the editorial team for steel importers and engineers.`,
  },
};

/** A Tehran calendar day (YYYY-MM-DD) in the page's language: fa Persian calendar, ar/en Gregorian. */
export function formatArticleDate(day: string, locale: ArticleLocale): string {
  const date = new Date(`${day}T08:00:00Z`); // midday in Tehran: the same calendar day in every formatter
  if (locale === "fa") return formatPersianDate(date);
  if (locale === "ar") return formatArabicDate(date);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tehran" }).format(date);
}
