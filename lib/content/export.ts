import type { Locale } from "../../config/locales.ts";

/**
 * W16.3 (D-SEO; owner D-COMPANY-INFO 2026-10-13: export to Iraq and other countries is approved) — the export
 * page, en and ar only. What Ahan Asa exports (the catalog families and the four raw materials), how to
 * request, and the RFQ link. No price on either locale (en never has one; the ar page links to `/ar/prices`
 * but shows none), no logistics, payment, partner or delivery-time claim: terms are agreed per order.
 *
 * ar uses the Iraqi trade words of docs/seo/keyword-map.md §3.5 (الشيش، الشيلمان، الصاج، الحديد المربع /
 * العلب، الزاوية، البليت) next to the formal term. Arabic letters only (ي ك).
 */
export const EXPORT_ROUTE = "/export";
export const EXPORT_LOCALES: readonly Locale[] = ["en", "ar"];
export const isExportPublished = (locale: Locale) => EXPORT_LOCALES.includes(locale);

type ExportLocale = "en" | "ar";

interface ExportCopy {
  eyebrow: string;
  title: string;
  h1: string;
  description: string;
  intro: string[];
  productsTitle: string;
  finishedTitle: string;
  rawTitle: string;
  /** Category code → the export label (ar: Iraqi word first). Only categories the catalog publishes are listed. */
  categories: Record<string, string>;
  stepsTitle: string;
  steps: { title: string; body: string }[];
  includeTitle: string;
  include: string[];
  pricesNote: string | null;
  pricesLink: string | null;
  cta: string;
  rawLink: string;
}

export const EXPORT_COPY: Record<ExportLocale, ExportCopy> = {
  en: {
    eyebrow: "Export",
    title: "Iranian Steel Export — Rebar, Beams, Billet, DRI",
    h1: "Steel export from Iran",
    description: "Ahan Asa sources Iranian rebar, IPE beams, sheet and plate, hollow sections, billet, DRI, iron ore and HBI for buyers in Iraq and other countries. Send your list to request a quote.",
    intro: [
      "Ahan Asa manages steel purchasing in Iran for buyers outside the country, including Iraq. We start from your specification: you send the list, we review it against the standard products of Iranian mills, compare the sourcing options and come back with a proposal.",
      "Every export enquiry is reviewed and quoted individually; sending a list creates no obligation.",
    ],
    productsTitle: "What we export",
    finishedTitle: "Finished steel products",
    rawTitle: "Steel raw materials",
    categories: {
      REBAR: "Rebar (A1 to A4, INSO 3132)",
      BEAM: "IPE and IPN beams",
      ANGLE: "Equal angles",
      CHANNEL: "UPN and UPE channels",
      BOX_SECTION: "Square and rectangular hollow sections",
      SHEET_PLATE: "Hot-rolled sheet and plate",
      PIPE: "Seamless pipe ASTM A106",
      // W17.4: the W9.8 flat categories (listed only once Odoo publishes them).
      GALVANIZED_SHEET: "Galvanized steel coil and sheet DX51D+Z",
      PREPAINTED_SHEET: "Pre-painted galvanized coil (PPGI)",
      HOT_ROLLED_COIL: "Hot-rolled coil S235JR",
      COLD_ROLLED: "Cold-rolled coil and sheet DC01",
    },
    stepsTitle: "How to request",
    steps: [
      { title: "Send your list", body: "Product, grade or standard, sizes and quantity in tonnes — a BOM, an invoice or a simple table is fine." },
      { title: "Tell us the destination", body: "The destination country and city and the delivery terms you prefer (for example FCA, CPT or DAP under Incoterms® 2020)." },
      { title: "List the documents you need", body: "For example mill test certificates, a pre-shipment inspection or a certificate of origin." },
      { title: "Receive a proposal", body: "We review the request and send a sourcing proposal for your decision." },
    ],
    includeTitle: "Useful to include",
    include: ["Required delivery window", "Packing or bundling requirements", "Your company name and a contact person"],
    pricesNote: null,
    pricesLink: null,
    cta: "Send your purchase list",
    rawLink: "Steel raw materials",
  },
  ar: {
    eyebrow: "التصدير",
    title: "تصدير الحديد الإيراني إلى العراق: الشيش والشيلمان والصاج والبليت",
    h1: "تصدير الحديد من إيران إلى العراق",
    description: "يوفّر آهن آسا الحديد الإيراني للمشترين في العراق ودول أخرى: الشيش (حديد التسليح) والشيلمان والصاج والحديد المربع والبليت والحديد الإسفنجي. أرسل قائمتك لطلب عرض.",
    intro: [
      "يدير آهن آسا شراء الحديد في إيران للمشترين من خارجها، ومنهم المشترون في العراق. نبدأ من مواصفاتك: ترسل القائمة، فنراجعها مقابل المنتجات القياسية للمصانع الإيرانية، ونقارن خيارات التوريد، ثم نرسل لك عرضًا.",
      "كل طلب تصدير يُراجَع ويُسعَّر على حدة، وإرسال القائمة لا يُلزمك بشيء.",
    ],
    productsTitle: "ماذا نصدّر",
    finishedTitle: "منتجات الحديد الجاهزة",
    rawTitle: "المواد الخام للصلب",
    categories: {
      REBAR: "الشيش (حديد التسليح A1 إلى A4)",
      BEAM: "الشيلمان (كمرات IPE وIPN)",
      ANGLE: "الزاوية (زوايا متساوية الأضلاع)",
      CHANNEL: "المجاري UPN وUPE",
      BOX_SECTION: "الحديد المربع والمستطيل (العلب)",
      SHEET_PLATE: "الصاج والألواح المدرفلة على الساخن",
      PIPE: "الأنابيب غير الملحومة ASTM A106",
      GALVANIZED_SHEET: "الصاج المجلفن (لفائف وألواح DX51D+Z)",
      PREPAINTED_SHEET: "الصاج المطلي مسبقاً (PPGI)",
      HOT_ROLLED_COIL: "لفائف الصاج الأسود المدرفلة على الساخن S235JR",
      COLD_ROLLED: "الصاج المدرفل على البارد (لفائف وألواح DC01)",
    },
    stepsTitle: "كيف تطلب",
    steps: [
      { title: "أرسل قائمتك", body: "المنتج والدرجة أو المعيار والمقاسات والكمية بالطن؛ تكفي قائمة مواد أو فاتورة أو جدول بسيط." },
      { title: "حدّد الوجهة", body: "بلد ومدينة الوجهة وشروط التسليم المفضلة (مثل FCA أو CPT أو DAP وفق Incoterms® 2020)." },
      { title: "اذكر المستندات المطلوبة", body: "مثل شهادات تحليل المصنع أو فحص ما قبل الشحن أو شهادة المنشأ." },
      { title: "استلم العرض", body: "نراجع الطلب ونرسل عرض التوريد لتقرر." },
    ],
    includeTitle: "يفيد أن تذكر",
    include: ["موعد التسليم المطلوب", "متطلبات التحزيم أو التعبئة", "اسم شركتك والشخص المسؤول عن التواصل"],
    pricesNote: "للاطلاع على أسعار اليوم في السوق الإيراني بالتومان:",
    pricesLink: "أسعار الحديد اليوم",
    cta: "إرسال قائمة الشراء",
    rawLink: "المواد الخام للصلب",
  },
};

export function exportCopy(locale: Locale): ExportCopy | null {
  return locale === "en" || locale === "ar" ? EXPORT_COPY[locale] : null;
}
