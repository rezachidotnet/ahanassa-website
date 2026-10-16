import type { Locale } from "../../config/locales.ts";

/**
 * W18.2 — the en/ar "Steel market indicators" page (`/en/market-indicators`, `/ar/market-indicators`): the global
 * reference indices and the USD/IRR Exchange Center rate, each with its source and date. No Ahan Asa price on en
 * (en never shows one); ar links to the ar daily price page (price + date). fa has no such page: the fa indicators
 * sit in the price strip, the decision block and the chart pages, and `/market-indicators` sends fa to `/prices`
 * (lib/static/static-rules.ts). Published only when the snapshot has at least one indicator. Linked (owner,
 * 2026-10-16) from the en/ar footer and the export page — never the main nav — and from /ar/prices.
 */
export const MARKET_INDICATORS_ROUTE = "/market-indicators";
export const MARKET_INDICATORS_LOCALES = ["en", "ar"] as const satisfies readonly Locale[];
export type MarketIndicatorsLocale = (typeof MARKET_INDICATORS_LOCALES)[number];
export const isMarketIndicatorsLocale = (locale: string): locale is MarketIndicatorsLocale => (MARKET_INDICATORS_LOCALES as readonly string[]).includes(locale);

export interface MarketIndicatorsCopy {
  eyebrow: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  body: string;
  /** What the figures are, and are not. */
  howToRead: { title: string; items: string[] };
  /** ar: the link to our own daily prices (price + date). */
  pricesLink?: string;
  pricesNote?: string;
  cta: string;
  /** Owner 2026-10-16: the en/ar footer link (never in the main nav). */
  footerLink: string;
  /** Owner 2026-10-16: the line on the export page that links here. */
  exportNote: string;
  datasetDescription: (name: string) => string;
}

export const MARKET_INDICATORS_COPY: Record<MarketIndicatorsLocale, MarketIndicatorsCopy> = {
  en: {
    eyebrow: "Market indicators",
    title: "Steel market indicators",
    metaTitle: "Steel market indicators: iron ore, US steel price index, USD/IRR",
    metaDescription: "Reference indices for the steel market — iron ore, the US hot-rolled steel producer price index and the US dollar Exchange Center rate in Iran — with their sources and dates. Not Ahan Asa selling prices.",
    body: "Global reference indices for steel and its raw materials, and the US dollar Exchange Center rate in Iran, with their sources and dates. They are reference indices, not Ahan Asa selling prices.",
    howToRead: {
      title: "How to read these figures",
      items: [
        "Each figure is a public reference index or rate, shown with its source and the date it refers to. None of them is an Ahan Asa selling price.",
        "Monthly series show their data month: they are published about four to six weeks after the month ends, and the latest US values are preliminary for four months.",
        "They show where the market has been, not where it will go. They are not a forecast or buying advice.",
        "For a price for your quantity, delivery point and timing, send your list and we reply with a quote.",
      ],
    },
    cta: "Request a quote for your list",
    footerLink: "Market indicators",
    exportNote: "Global steel reference indices and the US dollar rate, with sources and dates:",
    datasetDescription: (name) => `${name}: the values shown on this page, with the date each refers to.`,
  },
  ar: {
    eyebrow: "مؤشرات السوق",
    title: "مؤشرات سوق الصلب",
    metaTitle: "مؤشرات سوق الصلب: خام الحديد، مؤشر أسعار الصلب الأمريكي، سعر الدولار",
    metaDescription: "مؤشرات مرجعية لسوق الصلب — خام الحديد، ومؤشر أسعار المنتجين الأمريكي للصلب المدرفل على الساخن، وسعر الدولار في مركز التبادل في إيران — مع مصادرها وتواريخها. ليست أسعار بيع لدى آهن آسا.",
    body: "مؤشرات مرجعية عالمية للصلب وخاماته، وسعر الدولار في مركز التبادل في إيران، مع مصادرها وتواريخها. هي مؤشرات مرجعية، وليست أسعار بيع لدى آهن آسا.",
    howToRead: {
      title: "كيف تقرأ هذه الأرقام",
      items: [
        "كل رقم هو مؤشر أو سعر مرجعي عام، يظهر مع مصدره والتاريخ الذي يخصه. لا شيء منها سعر بيع لدى آهن آسا.",
        "تعرض السلاسل الشهرية شهر البيانات: تُنشر بعد نحو أربعة إلى ستة أسابيع من نهاية الشهر، وآخر القيم الأمريكية أولية لمدة أربعة أشهر.",
        "تبيّن أين كان السوق، لا أين سيتجه. ليست توقعًا ولا نصيحة بالشراء.",
        "للحصول على سعر لكميتك ومكان التسليم والتوقيت، أرسل قائمتك ونرد بعرض سعر.",
      ],
    },
    pricesLink: "أسعار آهن آسا اليوم",
    pricesNote: "أسعار آهن آسا اليومية (السعر والتاريخ) في صفحة مستقلة:",
    cta: "طلب عرض سعر لقائمتك",
    footerLink: "مؤشرات السوق",
    exportNote: "المؤشرات المرجعية العالمية للصلب وسعر الدولار، مع مصادرها وتواريخها:",
    datasetDescription: (name) => `${name}: القيم المعروضة في هذه الصفحة مع التاريخ الذي تخصه كل قيمة.`,
  },
};
