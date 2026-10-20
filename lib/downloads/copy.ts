import type { Locale } from "../../config/locales.ts";

/**
 * W17.2 — Download Center copy: the /downloads page and the labels of the generated PDFs. Labels and short
 * instructions only; product names, descriptions, standards and grades come from the catalog data, company
 * facts from lib/content/company.ts and lib/content/contact-channels.ts. No price, amount or currency
 * anywhere; drawings are always called DXF (never DWG).
 */
export interface DownloadsCopy {
  nav: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  drawings: { title: string; body: string; dxf: string; svg: string; pending: string; empty: string; previewAlt: (title: string) => string };
  specSheets: { title: string; body: string; pdf: string };
  catalogs: { title: string; body: string; sections: string; sectionsBody: string; raw: string; rawBody: string; otherLanguages: string };
  templates: { title: string; itemList: string; itemListBody: string };
  languageNames: Record<Locale, string>;
  /** W20.8 — the one-page Download Center: quick access, filter bar, results. */
  center: {
    quickTitle: string;
    filterLabel: string;
    search: string;
    searchPlaceholder: string;
    searchHint: string;
    typeLegend: string;
    types: Record<"all" | "dxf" | "pdf" | "catalog", string>;
    familyLegend: string;
    allFamilies: string;
    /** «{n}» = formatted number. */
    count: string;
    noMatch: string;
    clear: string;
    openFilters: string;
    closeFilters: string;
    showResults: string;
    resultsTitle: string;
    size: string;
    weight: string;
    preview: string;
    files: string;
    sizesCount: string;
    standard: string;
    updated: string;
    zip: string;
    zipBody: string;
    familySheet: string;
    price: string;
    rfq: string;
    otherSheetsTitle: string;
    otherSheetsBody: string;
    catalogsTitle: string;
  };
  pdf: {
    sectionsTitle: string;
    rawTitle: string;
    specSheet: string;
    contents: string;
    edition: string;
    standard: string;
    grade: string;
    marketName: string;
    size: string;
    noPrices: string;
    specOnRequest: string;
    rawIntro: string;
    contactTitle: string;
    phone: string;
    website: string;
    request: string;
  };
}

export const DOWNLOADS_COPY: Record<Locale, DownloadsCopy> = {
  fa: {
    nav: "مرکز دانلود",
    title: "مرکز دانلود: نقشه DXF مقاطع، برگه مشخصات و کاتالوگ فولاد",
    description: "نقشه DXF مقاطع فولادی (قابل باز شدن در AutoCAD)، برگه مشخصات هر خانوادهٔ محصول، کاتالوگ محصولات و مواد اولیه و فرم لیست اقلام آهن آسا را دانلود کنید.",
    h1: "مرکز دانلود",
    intro: "فایل‌های فنی آهن آسا از همان داده‌های کاتالوگ سایت ساخته می‌شوند و با هر به‌روزرسانی کاتالوگ دوباره تولید می‌شوند. هیچ‌کدام قیمت ندارند؛ برای قیمت و پیشنهاد تأمین، لیست خرید خود را بفرستید.",
    drawings: {
      title: "نقشه مقاطع (DXF)",
      body: "فایل DXF (در AutoCAD و دیگر نرم‌افزارهای CAD باز می‌شود)، با واحد میلی‌متر و لایه‌های OUTLINE، DIM و TEXT. نقشهٔ هر سایز فقط وقتی منتشر می‌شود که همهٔ ابعاد مقطع، از جمله شعاع‌ها، در کاتالوگ ثبت شده باشد.",
      dxf: "دانلود DXF",
      svg: "پیش‌نمایش SVG",
      pending: "نقشهٔ این مقاطع پس از ثبت ابعاد کامل مقطع در کاتالوگ اضافه می‌شود:",
      empty: "هنوز نقشه‌ای منتشر نشده است.",
      previewAlt: (title) => `پیش‌نمایش نقشهٔ مقطع ${title}`,
    },
    specSheets: { title: "برگه مشخصات (PDF)", body: "برای هر خانوادهٔ محصول: ابعاد، وزن اسمی، استاندارد، گرید و نام بازار.", pdf: "PDF" },
    catalogs: {
      title: "کاتالوگ‌ها (PDF)",
      body: "کاتالوگ آهن آسا به فارسی، انگلیسی و عربی؛ بدون قیمت.",
      sections: "کاتالوگ مقاطع و محصولات فولادی",
      sectionsBody: "همهٔ خانواده‌های محصول کاتالوگ سایت با جدول ابعاد و وزن اسمی.",
      raw: "کاتالوگ مواد اولیه",
      rawBody: "شمش و بلوم، آهن اسفنجی، بریکت و سنگ آهن؛ فقط با استعلام.",
      otherLanguages: "زبان‌های دیگر:",
    },
    templates: { title: "فرم‌ها", itemList: "فرم لیست اقلام (Excel)", itemListBody: "اقلام مورد نیاز را در این فایل بنویسید و در فرم درخواست پیوست کنید." },
    languageNames: { fa: "فارسی", en: "English", ar: "العربية" },
    center: {
      quickTitle: "دسترسی سریع",
      filterLabel: "فیلتر فایل‌ها",
      search: "جستجوی سایز",
      searchPlaceholder: "مثلاً IPE 200، ۲۰۰ یا نبشی ۱۰",
      searchHint: "عدد فارسی یا لاتین، با نام مقطع یا بدون آن.",
      typeLegend: "نوع فایل",
      types: { all: "همه", dxf: "نقشه DXF", pdf: "برگه مشخصات PDF", catalog: "کاتالوگ" },
      familyLegend: "خانواده",
      allFamilies: "همه",
      count: "{n} سایز",
      noMatch: "سایزی با این جستجو پیدا نشد. عدد را کوتاه‌تر بنویسید یا فیلترها را پاک کنید.",
      clear: "پاک کردن فیلترها",
      openFilters: "فیلترها",
      closeFilters: "بستن",
      showResults: "نمایش نتایج",
      resultsTitle: "نقشه‌ها و برگه‌های مشخصات",
      size: "سایز",
      weight: "وزن (kg/m)",
      preview: "مقطع",
      files: "فایل‌ها",
      sizesCount: "{n} سایز",
      standard: "استاندارد",
      updated: "به‌روزرسانی",
      zip: "دانلود همه (ZIP)",
      zipBody: "همهٔ نقشه‌های DXF و PDF این خانواده",
      familySheet: "برگه مشخصات خانواده",
      price: "قیمت امروز",
      rfq: "استعلام این سایز",
      otherSheetsTitle: "برگه مشخصات سایر محصولات",
      otherSheetsBody: "این محصولات نقشهٔ مقطع ندارند؛ برگهٔ مشخصات هر خانواده ابعاد، وزن اسمی، استاندارد و گرید را دارد.",
      catalogsTitle: "کاتالوگ‌ها و فرم‌ها",
    },
    pdf: {
      sectionsTitle: "کاتالوگ مقاطع و محصولات فولادی",
      rawTitle: "کاتالوگ مواد اولیه فولاد",
      specSheet: "برگه مشخصات",
      contents: "فهرست",
      edition: "ویرایش",
      standard: "استاندارد",
      grade: "گرید",
      marketName: "نام در بازار",
      size: "سایز",
      noPrices: "این سند قیمت ندارد. برای قیمت و پیشنهاد تأمین، لیست خرید خود را از طریق www.ahanassa.com/contact بفرستید.",
      specOnRequest: "مشخصات: با استعلام",
      rawIntro: "مواد اولیه فقط با استعلام تأمین می‌شوند و قیمت روزانه ندارند. مشخصات، مقدار، محل تحویل و مبدأ مورد نظر را در درخواست بنویسید.",
      contactTitle: "تماس با آهن آسا",
      phone: "تلفن",
      website: "وب‌سایت",
      request: "ارسال لیست خرید",
    },
  },
  en: {
    nav: "Download Center",
    title: "Download Center: section DXF drawings, spec sheets and steel catalogs",
    description: "Download Ahan Asa's steel section drawings as DXF (opens in AutoCAD), a spec sheet for each product family, the steel products and raw materials catalogs, and the item-list template.",
    h1: "Download Center",
    intro: "Ahan Asa's technical files are built from the same catalog data as this site and regenerated with every catalog update. None of them carries a price; for prices and a supply proposal, send your purchase list.",
    drawings: {
      title: "Section drawings (DXF)",
      body: "DXF files (open in AutoCAD and other CAD programs), in millimetres, with OUTLINE, DIM and TEXT layers. A size's drawing is published only when its full cross-section, radii included, is in the catalog.",
      dxf: "Download DXF",
      svg: "SVG preview",
      pending: "Drawings of these sections are added once their full cross-section dimensions are in the catalog:",
      empty: "No drawings are published yet.",
      previewAlt: (title) => `Section drawing preview: ${title}`,
    },
    specSheets: { title: "Spec sheets (PDF)", body: "One per product family: dimensions, nominal weights, standard, grade and market names.", pdf: "PDF" },
    catalogs: {
      title: "Catalogs (PDF)",
      body: "Ahan Asa catalogs in Persian, English and Arabic, without prices.",
      sections: "Sections & steel products catalog",
      sectionsBody: "Every product family of the site's catalog, with dimension and nominal weight tables.",
      raw: "Raw materials catalog",
      rawBody: "Billet and bloom, DRI, HBI and iron ore; request for quotation only.",
      otherLanguages: "Other languages:",
    },
    templates: { title: "Templates", itemList: "Item-list template (Excel)", itemListBody: "List the items you need in this file and attach it to the request form." },
    languageNames: { fa: "فارسی", en: "English", ar: "العربية" },
    center: {
      quickTitle: "Quick access",
      filterLabel: "Filter files",
      search: "Search a size",
      searchPlaceholder: "e.g. IPE 200, 200 or angle 100",
      searchHint: "Latin, Persian or Arabic digits, with or without the section name.",
      typeLegend: "File type",
      types: { all: "All", dxf: "DXF drawing", pdf: "Spec sheet PDF", catalog: "Catalog" },
      familyLegend: "Family",
      allFamilies: "All",
      count: "{n} sizes",
      noMatch: "No size matches this search. Try fewer digits or clear the filters.",
      clear: "Clear filters",
      openFilters: "Filters",
      closeFilters: "Close",
      showResults: "Show results",
      resultsTitle: "Drawings and spec sheets",
      size: "Size",
      weight: "Weight (kg/m)",
      preview: "Section",
      files: "Files",
      sizesCount: "{n} sizes",
      standard: "Standard",
      updated: "Updated",
      zip: "Download all (ZIP)",
      zipBody: "Every DXF and PDF drawing of this family",
      familySheet: "Family spec sheet",
      price: "Today's price",
      rfq: "Request this size",
      otherSheetsTitle: "Spec sheets of other products",
      otherSheetsBody: "These products have no section drawing; each family's spec sheet lists dimensions, nominal weights, standard and grade.",
      catalogsTitle: "Catalogs and templates",
    },
    pdf: {
      sectionsTitle: "Sections & Steel Products Catalog",
      rawTitle: "Steel Raw Materials Catalog",
      specSheet: "Spec sheet",
      contents: "Contents",
      edition: "Edition",
      standard: "Standard",
      grade: "Grade",
      marketName: "Name in the Iranian market",
      size: "Size",
      noPrices: "This document contains no prices. For prices and a supply proposal, send your purchase list at www.ahanassa.com/en/contact.",
      specOnRequest: "Specifications: on request",
      rawIntro: "Raw materials are supplied on request for quotation only; no daily price is published. State the specification, quantity, delivery point and preferred origin in your request.",
      contactTitle: "Contact Ahan Asa",
      phone: "Phone",
      website: "Website",
      request: "Send a purchase list",
    },
  },
  ar: {
    nav: "مركز التنزيل",
    title: "مركز التنزيل: رسومات DXF للمقاطع وأوراق المواصفات وكتالوجات الصلب",
    description: "نزّل رسومات مقاطع الصلب بصيغة DXF (تُفتح في AutoCAD)، وورقة مواصفات لكل عائلة منتجات، وكتالوج منتجات الصلب وكتالوج المواد الأولية، ونموذج قائمة البنود من آهن آسا.",
    h1: "مركز التنزيل",
    intro: "تُنشأ ملفات آهن آسا الفنية من بيانات الكتالوج نفسها في هذا الموقع، وتُعاد مع كل تحديث للكتالوج. لا يتضمن أيٌّ منها سعرًا؛ للحصول على السعر وعرض التوريد، أرسل قائمة الشراء.",
    drawings: {
      title: "رسومات المقاطع (DXF)",
      body: "ملفات DXF (تُفتح في AutoCAD وبرامج CAD الأخرى)، بالمليمتر، مع الطبقات OUTLINE وDIM وTEXT. يُنشر رسم المقاس فقط عندما يكون مقطعه الكامل، بما في ذلك أنصاف الأقطار، مسجلًا في الكتالوج.",
      dxf: "تنزيل DXF",
      svg: "معاينة SVG",
      pending: "تُضاف رسومات هذه المقاطع بعد تسجيل أبعاد مقطعها الكاملة في الكتالوج:",
      empty: "لم تُنشر أي رسومات بعد.",
      previewAlt: (title) => `معاينة رسم المقطع ${title}`,
    },
    specSheets: { title: "أوراق المواصفات (PDF)", body: "ورقة لكل عائلة منتجات: الأبعاد والوزن الاسمي والمعيار والدرجة والأسماء في السوق.", pdf: "PDF" },
    catalogs: {
      title: "الكتالوجات (PDF)",
      body: "كتالوجات آهن آسا بالفارسية والإنجليزية والعربية، من دون أسعار.",
      sections: "كتالوج المقاطع ومنتجات الصلب",
      sectionsBody: "جميع عائلات المنتجات في كتالوج الموقع، مع جداول الأبعاد والوزن الاسمي.",
      raw: "كتالوج المواد الأولية",
      rawBody: "البليت والبلوم، والحديد المختزل مباشرة، والحديد المقولب على الساخن، وخام الحديد؛ بطلب عرض سعر فقط.",
      otherLanguages: "لغات أخرى:",
    },
    templates: { title: "النماذج", itemList: "نموذج قائمة البنود (Excel)", itemListBody: "اكتب البنود التي تحتاجها في هذا الملف وأرفقه بنموذج الطلب." },
    languageNames: { fa: "فارسی", en: "English", ar: "العربية" },
    center: {
      quickTitle: "وصول سريع",
      filterLabel: "تصفية الملفات",
      search: "ابحث عن مقاس",
      searchPlaceholder: "مثلًا IPE 200 أو 200 أو زاوية 100",
      searchHint: "أرقام عربية أو لاتينية أو فارسية، مع اسم المقطع أو من دونه.",
      typeLegend: "نوع الملف",
      types: { all: "الكل", dxf: "رسم DXF", pdf: "ورقة مواصفات PDF", catalog: "كتالوج" },
      familyLegend: "العائلة",
      allFamilies: "الكل",
      count: "{n} مقاس",
      noMatch: "لا يوجد مقاس يطابق هذا البحث. اكتب أرقامًا أقل أو امسح عوامل التصفية.",
      clear: "مسح عوامل التصفية",
      openFilters: "التصفية",
      closeFilters: "إغلاق",
      showResults: "عرض النتائج",
      resultsTitle: "الرسومات وأوراق المواصفات",
      size: "المقاس",
      weight: "الوزن (kg/m)",
      preview: "المقطع",
      files: "الملفات",
      sizesCount: "{n} مقاس",
      standard: "المعيار",
      updated: "آخر تحديث",
      zip: "تنزيل الكل (ZIP)",
      zipBody: "جميع رسومات DXF وPDF لهذه العائلة",
      familySheet: "ورقة مواصفات العائلة",
      price: "سعر اليوم",
      rfq: "اطلب هذا المقاس",
      otherSheetsTitle: "أوراق مواصفات المنتجات الأخرى",
      otherSheetsBody: "لا توجد رسومات مقاطع لهذه المنتجات؛ تتضمن ورقة مواصفات كل عائلة الأبعاد والوزن الاسمي والمعيار والدرجة.",
      catalogsTitle: "الكتالوجات والنماذج",
    },
    pdf: {
      sectionsTitle: "كتالوج المقاطع ومنتجات الصلب",
      rawTitle: "كتالوج المواد الأولية للصلب",
      specSheet: "ورقة المواصفات",
      contents: "المحتويات",
      edition: "الإصدار",
      standard: "المعيار",
      grade: "الدرجة",
      marketName: "الاسم في السوق الإيرانية",
      size: "المقاس",
      noPrices: "لا يتضمن هذا المستند أسعارًا. للحصول على السعر وعرض التوريد، أرسل قائمة الشراء عبر www.ahanassa.com/ar/contact.",
      specOnRequest: "المواصفات: عند الطلب",
      rawIntro: "تُورَّد المواد الأولية بطلب عرض سعر فقط، ولا يُنشر لها سعر يومي. اذكر المواصفات والكمية ومكان التسليم والمنشأ المفضل في طلبك.",
      contactTitle: "تواصل مع آهن آسا",
      phone: "الهاتف",
      website: "الموقع الإلكتروني",
      request: "إرسال قائمة الشراء",
    },
  },
};

export const downloadsCopy = (locale: Locale): DownloadsCopy => DOWNLOADS_COPY[locale];
