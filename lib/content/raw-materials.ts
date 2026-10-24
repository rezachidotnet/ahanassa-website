import type { Locale } from "../../config/locales.ts";

/**
 * W16.3 (D-SEO, docs/seo/keyword-map.md §5.6, §6 P2-1; owner D-COMPANY-INFO 2026-10-13: the raw materials
 * Ahan Assa sources are billet, DRI, iron ore and briquette, RFQ-only, per ton, never priced; export to Iraq
 * and other countries is approved).
 *
 * `/raw-materials` and one page per material, in fa, en and ar. Hard rules, checked by
 * lib/content/raw-materials.test.ts and, on the built pages, by the price gate:
 * - never a price, an amount, a currency or «قیمت» in a title or meta, and no price element anywhere;
 * - every page carries the RFQ-only banner and links to the request form;
 * - only general, standard-level facts about each material (what it is, what a buyer specifies, which
 *   documents to ask for); no supply volume, origin mill, stock, delivery time or partner claim.
 */
export const RAW_MATERIALS_ROUTE = "/raw-materials";
export const RAW_MATERIAL_SLUGS = ["billet", "dri", "iron-ore", "briquette"] as const;
export type RawMaterialSlug = (typeof RAW_MATERIAL_SLUGS)[number];
export const RAW_MATERIAL_LOCALES: readonly Locale[] = ["fa", "en", "ar"];

export const rawMaterialPath = (slug: RawMaterialSlug) => `${RAW_MATERIALS_ROUTE}/${slug}`;
export const isRawMaterialSlug = (value: string): value is RawMaterialSlug => (RAW_MATERIAL_SLUGS as readonly string[]).includes(value);

export interface RawMaterialCopy {
  /** Card and breadcrumb label. */
  name: string;
  title: string;
  h1: string;
  description: string;
  /** One line on the hub card. */
  summary: string;
  what: string[];
  specify: string[];
  documents: string[];
}

interface RawMaterialsUiCopy {
  eyebrow: string;
  hubTitle: string;
  hubH1: string;
  hubDescription: string;
  hubIntro: string;
  bannerTitle: string;
  bannerBody: string;
  whatTitle: string;
  specifyTitle: string;
  documentsTitle: string;
  cta: string;
  more: string;
  others: string;
  exportLink: string;
}

export const RAW_MATERIALS_UI: Record<Locale, RawMaterialsUiCopy> = {
  fa: {
    eyebrow: "مواد اولیه فولاد",
    hubTitle: "مواد اولیه فولاد: شمش، آهن اسفنجی، سنگ آهن و بریکت",
    hubH1: "مواد اولیه فولاد",
    hubDescription: "تأمین شمش فولادی، آهن اسفنجی (DRI)، سنگ آهن و بریکت (HBI) برای واحدهای ذوب و نورد و خریداران صادراتی؛ فقط از طریق ارسال درخواست.",
    hubIntro:
      "آهن آسا علاوه بر محصولات نوردی، مواد اولیه زنجیره فولاد را برای واحدهای ذوب و نورد و خریداران صادراتی تأمین می‌کند: شمش فولادی، آهن اسفنجی، سنگ آهن و بریکت آهن اسفنجی. این اقلام به تن معامله می‌شوند و قیمت روز عمومی ندارند؛ مشخصات، مقدار و شرایط تحویل را بفرستید تا درخواست شما بررسی و پیشنهاد تأمین ارسال شود.",
    bannerTitle: "فقط از طریق درخواست",
    bannerBody: "برای مواد اولیه قیمت روز منتشر نمی‌شود. پیشنهاد پس از بررسی درخواست شما و بر اساس مشخصات، مقدار به تن، زمان و شرایط تحویل اعلام می‌شود.",
    whatTitle: "این محصول چیست؟",
    specifyTitle: "در درخواست چه بنویسید؟",
    documentsTitle: "مدارک قابل درخواست",
    cta: "ارسال درخواست",
    more: "مشخصات و ارسال درخواست",
    others: "مواد اولیه دیگر",
    exportLink: "",
  },
  en: {
    eyebrow: "Steel raw materials",
    hubTitle: "Iranian Steel Raw Materials — Billet, DRI, Iron Ore, HBI",
    hubH1: "Steel raw materials",
    hubDescription: "Ahan Assa sources steel billet, direct reduced iron (DRI), iron ore and hot briquetted iron (HBI) in Iran for melt shops, rolling mills and export buyers. On request only.",
    hubIntro:
      "Besides finished long and flat products, Ahan Assa sources the raw materials of the steel chain for melt shops, rolling mills and export buyers: steel billet, direct reduced iron, iron ore and hot briquetted iron. These materials are traded by the tonne and are offered on request only: send the specification, quantity and delivery terms, and we review your request and reply with a sourcing proposal.",
    bannerTitle: "On request only",
    bannerBody: "Raw materials are offered on request only. The offer follows our review of your request: specification, tonnage, timing and delivery terms.",
    whatTitle: "What it is",
    specifyTitle: "What to include in your request",
    documentsTitle: "Documents you can ask for",
    cta: "Send a request",
    more: "Specifications and request",
    others: "Other raw materials",
    exportLink: "Export from Iran: how to request",
  },
  ar: {
    eyebrow: "المواد الخام للصلب",
    hubTitle: "المواد الخام للصلب من إيران: البليت والحديد الإسفنجي وخام الحديد",
    hubH1: "المواد الخام للصلب",
    hubDescription: "يوفّر آهن آسا البليت والحديد الإسفنجي (DRI) وخام الحديد والحديد المقولب على الساخن (HBI) من إيران لمصانع الصهر والدرفلة والمشترين من الخارج. عبر الطلب فقط.",
    hubIntro:
      "إلى جانب منتجات الحديد الجاهزة، يوفّر آهن آسا المواد الخام لسلسلة الصلب لمصانع الصهر والدرفلة وللمشترين من العراق ودول أخرى: البليت (كتل الصلب) والحديد الإسفنجي وخام الحديد والحديد المقولب على الساخن. تُباع هذه المواد بالطن وتُعرض عبر الطلب فقط: أرسل المواصفات والكمية وشروط التسليم، ونراجع طلبك ونرسل عرض التوريد.",
    bannerTitle: "عبر الطلب فقط",
    bannerBody: "لا تُنشر أسعار يومية للمواد الخام. يُرسل العرض بعد مراجعة طلبك حسب المواصفات والكمية بالطن والتوقيت وشروط التسليم.",
    whatTitle: "ما هذا المنتج؟",
    specifyTitle: "ماذا تكتب في طلبك؟",
    documentsTitle: "مستندات يمكن طلبها",
    cta: "إرسال طلب",
    more: "المواصفات وإرسال الطلب",
    others: "مواد خام أخرى",
    exportLink: "التصدير من إيران: كيف تطلب",
  },
};

export const RAW_MATERIALS: Record<RawMaterialSlug, Record<Locale, RawMaterialCopy>> = {
  billet: {
    fa: {
      name: "شمش فولادی",
      title: "شمش فولادی 3SP و 5SP؛ مشخصات و تأمین",
      h1: "شمش فولادی (بیلت)",
      description: "تأمین شمش فولادی (بیلت) گرید 3SP و 5SP برای نورد و صادرات: گرید، ابعاد مقطع، طول و مقدار را بفرستید. فقط از طریق ارسال درخواست.",
      summary: "محصول نیمه‌تمام ریخته‌گری پیوسته و خوراک نورد میلگرد و مقاطع؛ گریدهای رایج 3SP و 5SP.",
      what: [
        "شمش فولادی یا بیلت محصول نیمه‌تمام ریخته‌گری پیوسته با مقطع مربع است و ماده اولیه نورد میلگرد، نبشی، ناودانی و مقاطع سبک به شمار می‌رود.",
        "گریدهای رایج آن 3SP و 5SP طبق استاندارد GOST 380 است. گرید 5SP کربن بیشتری دارد و معمولاً برای نورد میلگرد با استحکام بالاتر به کار می‌رود؛ 3SP برای مقاطع و مصارف عمومی‌تر.",
      ],
      specify: [
        "گرید (3SP، 5SP یا ترکیب شیمیایی مورد نیاز شما)",
        "ابعاد مقطع (مثلاً ۱۲۵×۱۲۵ یا ۱۵۰×۱۵۰ میلی‌متر) و طول شمش",
        "مقدار به تن و برنامه تحویل",
        "محل تحویل یا مقصد صادراتی و شرایط تحویل مورد نظر",
      ],
      documents: ["گواهی آنالیز کارخانه (Mill Test Certificate) با ترکیب شیمیایی ذوب", "گزارش بازرسی بار، در صورت نیاز", "مدارک صادراتی، برای خریداران خارج از ایران"],
    },
    en: {
      name: "Steel billet",
      title: "Iranian Steel Billet 3SP / 5SP — Specs and Sourcing",
      h1: "Steel billet",
      description: "Steel billet in grades 3SP and 5SP sourced in Iran for rolling mills and export buyers: send grade, section size, length and tonnage. On request only.",
      summary: "Continuously cast semi-finished square section, the feed of rebar and section rolling; common grades 3SP and 5SP.",
      what: [
        "Steel billet is a semi-finished, continuously cast product with a square cross-section. It is the feed material for rolling rebar, angles, channels and light sections.",
        "The common grades are 3SP and 5SP to GOST 380. Grade 5SP has a higher carbon content and is typically rolled into higher-strength rebar; 3SP is used for sections and more general purposes.",
      ],
      specify: [
        "Grade (3SP, 5SP or the chemical composition you need)",
        "Section size (for example 125×125 or 150×150 mm) and billet length",
        "Quantity in tonnes and the delivery schedule",
        "Destination and the delivery terms you prefer",
      ],
      documents: ["Mill test certificate with the heat's chemical composition", "Pre-shipment inspection report, if required", "Export documents for buyers outside Iran"],
    },
    ar: {
      name: "البليت",
      title: "بليت الحديد الإيراني 3SP و5SP: المواصفات والتوريد",
      h1: "البليت (كتل الصلب)",
      description: "توريد البليت الإيراني بدرجتي 3SP و5SP لمصانع الدرفلة وللتصدير: أرسل الدرجة ومقاس المقطع والطول والكمية بالطن. عبر الطلب فقط.",
      summary: "منتج نصف مصنَّع بالصب المستمر، مادة درفلة حديد التسليح والمقاطع؛ الدرجات الشائعة 3SP و5SP.",
      what: [
        "البليت (كتل الصلب) منتج نصف مصنَّع يُنتَج بالصب المستمر بمقطع مربع، وهو المادة الأولية لدرفلة حديد التسليح والزوايا والمجاري والمقاطع الخفيفة.",
        "الدرجات الشائعة هي 3SP و5SP وفق المعيار GOST 380. تحتوي درجة 5SP على نسبة كربون أعلى وتُستخدم عادةً لدرفلة حديد تسليح أعلى مقاومة، بينما تُستخدم 3SP للمقاطع والاستخدامات العامة.",
      ],
      specify: [
        "الدرجة (3SP أو 5SP أو التركيب الكيميائي المطلوب)",
        "مقاس المقطع (مثل 125×125 أو 150×150 مم) وطول البليت",
        "الكمية بالطن وجدول التسليم",
        "بلد الوجهة وشروط التسليم المفضلة",
      ],
      documents: ["شهادة تحليل المصنع (Mill Test Certificate) بالتركيب الكيميائي للصبة", "تقرير فحص الشحنة عند الحاجة", "مستندات التصدير للمشترين خارج إيران"],
    },
  },
  dri: {
    fa: {
      name: "آهن اسفنجی",
      title: "آهن اسفنجی (DRI)؛ مشخصات و تأمین",
      h1: "آهن اسفنجی (DRI)",
      description: "تأمین آهن اسفنجی (DRI) برای کوره‌های قوس و القایی: درصد آهن، متالیزاسیون، کربن و مقدار مورد نیاز را بفرستید. فقط از طریق ارسال درخواست.",
      summary: "آهن احیای مستقیم، خوراک کوره قوس الکتریکی و القایی همراه یا به‌جای قراضه.",
      what: [
        "آهن اسفنجی یا آهن احیای مستقیم (DRI) از احیای گندله یا سنگ آهن با گاز، بدون ذوب، به دست می‌آید و در کوره‌های قوس الکتریکی و القایی همراه یا به‌جای قراضه مصرف می‌شود.",
        "کیفیت آن با درصد آهن کل، درجه فلزی شدن (متالیزاسیون)، کربن و ناخالصی‌هایی مثل گوگرد و فسفر سنجیده می‌شود. آهن اسفنجی در برابر رطوبت واکنش‌پذیر است و حمل و انبارش آن شرایط خاص دارد.",
      ],
      specify: [
        "درصد آهن کل (Fe) و درجه متالیزاسیون مورد نیاز",
        "محدوده کربن و حداکثر گوگرد، فسفر و مواد باطله",
        "دانه‌بندی و نوع بار (فله یا بسته‌بندی)",
        "مقدار به تن، برنامه تحویل، محل تحویل یا مقصد صادراتی",
      ],
      documents: ["گواهی آنالیز تولیدکننده", "گزارش بازرسی و نمونه‌برداری، در صورت نیاز", "مدارک صادراتی، برای خریداران خارج از ایران"],
    },
    en: {
      name: "Direct reduced iron (DRI)",
      title: "Iranian DRI (Direct Reduced Iron) — Specs and Sourcing",
      h1: "Direct reduced iron (DRI)",
      description: "Direct reduced iron sourced in Iran for electric arc and induction furnaces: send total Fe, metallisation, carbon and tonnage. On request only.",
      summary: "Iron reduced in the solid state, charged in electric arc and induction furnaces with or instead of scrap.",
      what: [
        "Direct reduced iron (DRI), also called sponge iron, is made by reducing iron ore pellets or lump ore with gas in the solid state, without melting. It is charged in electric arc and induction furnaces together with, or instead of, scrap.",
        "Its quality is measured by total iron, degree of metallisation, carbon and impurities such as sulphur and phosphorus. DRI reacts with moisture, so its transport and storage need specific conditions.",
      ],
      specify: [
        "Total iron (Fe) and the degree of metallisation you need",
        "Carbon range and the maximum sulphur, phosphorus and gangue",
        "Size range, and bulk or bagged",
        "Quantity in tonnes, delivery schedule and destination",
      ],
      documents: ["Producer's certificate of analysis", "Inspection and sampling report, if required", "Export documents for buyers outside Iran"],
    },
    ar: {
      name: "الحديد الإسفنجي",
      title: "الحديد الإسفنجي الإيراني (DRI): المواصفات والتوريد",
      h1: "الحديد الإسفنجي (DRI)",
      description: "توريد الحديد الإسفنجي (DRI) من إيران لأفران القوس الكهربائي والحث: أرسل نسبة الحديد والتمعدن والكربون والكمية. عبر الطلب فقط.",
      summary: "حديد مختزَل اختزالًا مباشرًا، يُشحن في أفران القوس الكهربائي والحث مع الخردة أو بدلًا منها.",
      what: [
        "الحديد الإسفنجي أو الحديد المختزَل مباشرةً (DRI) يُنتَج باختزال كريات خام الحديد أو الخام بالغاز في الحالة الصلبة دون صهر، ويُستخدم في أفران القوس الكهربائي وأفران الحث مع الخردة أو بدلًا منها.",
        "تُقاس جودته بنسبة الحديد الكلي ودرجة التمعدن والكربون والشوائب مثل الكبريت والفوسفور. يتفاعل الحديد الإسفنجي مع الرطوبة، لذا يحتاج نقله وتخزينه إلى شروط خاصة.",
      ],
      specify: [
        "نسبة الحديد الكلي (Fe) ودرجة التمعدن المطلوبة",
        "مدى الكربون والحد الأقصى للكبريت والفوسفور والشوائب",
        "التدرج الحجمي، وسائب أو معبأ",
        "الكمية بالطن وجدول التسليم وبلد الوجهة",
      ],
      documents: ["شهادة تحليل المنتِج", "تقرير الفحص وأخذ العينات عند الحاجة", "مستندات التصدير للمشترين خارج إيران"],
    },
  },
  "iron-ore": {
    fa: {
      name: "سنگ آهن",
      title: "سنگ آهن، کنسانتره و گندله؛ مشخصات و تأمین",
      h1: "سنگ آهن",
      description: "تأمین سنگ آهن دانه‌بندی‌شده، کنسانتره و گندله: نوع محصول، عیار آهن، ناخالصی‌ها و مقدار را بفرستید. فقط از طریق ارسال درخواست.",
      summary: "ماده اولیه زنجیره فولاد: سنگ دانه‌بندی‌شده، کنسانتره و گندله.",
      what: [
        "سنگ آهن ماده اولیه زنجیره فولاد است و به شکل سنگ دانه‌بندی‌شده (کلوخه و نرمه)، کنسانتره و گندله عرضه می‌شود.",
        "کنسانتره پس از خردایش و جدایش، عیار آهن بالاتری از سنگ خام دارد؛ گندله از کنسانتره ساخته می‌شود و خوراک واحدهای احیای مستقیم و کوره بلند است.",
      ],
      specify: [
        "نوع محصول: کلوخه، نرمه، کنسانتره یا گندله",
        "عیار آهن (Fe) و حداکثر گوگرد، فسفر، سیلیس و رطوبت",
        "دانه‌بندی",
        "مقدار به تن، برنامه تحویل، محل تحویل یا مقصد صادراتی",
      ],
      documents: ["گواهی آنالیز محموله", "گزارش بازرسی، نمونه‌برداری و تعیین رطوبت، در صورت نیاز", "مدارک صادراتی، برای خریداران خارج از ایران"],
    },
    en: {
      name: "Iron ore",
      title: "Iranian Iron Ore — Lump, Fines, Concentrate, Pellets",
      h1: "Iron ore",
      description: "Iron ore sourced in Iran as lump, fines, concentrate or pellets: send the product type, Fe grade, impurity limits and tonnage. On request only.",
      summary: "The raw material of the steel chain: sized ore, concentrate and pellets.",
      what: [
        "Iron ore is the raw material of the steel chain. It is supplied as sized ore (lump and fines), concentrate and pellets.",
        "Concentrate has a higher iron grade than the run-of-mine ore after crushing and separation; pellets are made from concentrate and feed direct-reduction plants and blast furnaces.",
      ],
      specify: ["Product: lump, fines, concentrate or pellets", "Iron grade (Fe) and the maximum sulphur, phosphorus, silica and moisture", "Size range", "Quantity in tonnes, delivery schedule and destination"],
      documents: ["Certificate of analysis of the shipment", "Inspection, sampling and moisture report, if required", "Export documents for buyers outside Iran"],
    },
    ar: {
      name: "خام الحديد",
      title: "خام الحديد الإيراني: الكتل والناعم والمركّز والكريات",
      h1: "خام الحديد",
      description: "توريد خام الحديد من إيران على شكل كتل أو ناعم أو مركّز أو كريات: أرسل نوع المنتج ونسبة الحديد وحدود الشوائب والكمية. عبر الطلب فقط.",
      summary: "المادة الأولية لسلسلة الصلب: خام مصنَّف ومركّز وكريات.",
      what: [
        "خام الحديد هو المادة الأولية لسلسلة الصلب، ويُورَّد على شكل خام مصنَّف (كتل وناعم) ومركّز وكريات.",
        "المركّز أعلى في نسبة الحديد من الخام بعد التكسير والفصل، والكريات تُصنع من المركّز وتغذي وحدات الاختزال المباشر والأفران العالية.",
      ],
      specify: ["نوع المنتج: كتل أو ناعم أو مركّز أو كريات", "نسبة الحديد (Fe) والحد الأقصى للكبريت والفوسفور والسيليكا والرطوبة", "التدرج الحجمي", "الكمية بالطن وجدول التسليم وبلد الوجهة"],
      documents: ["شهادة تحليل الشحنة", "تقرير الفحص وأخذ العينات وتحديد الرطوبة عند الحاجة", "مستندات التصدير للمشترين خارج إيران"],
    },
  },
  briquette: {
    fa: {
      name: "بریکت آهن اسفنجی",
      title: "بریکت آهن اسفنجی (HBI)؛ مشخصات و تأمین",
      h1: "بریکت آهن اسفنجی (HBI)",
      description: "تأمین بریکت آهن اسفنجی (HBI) برای ذوب و صادرات: درصد آهن، متالیزاسیون، کربن و مقدار مورد نیاز را بفرستید. فقط از طریق ارسال درخواست.",
      summary: "آهن اسفنجی فشرده در دمای بالا؛ پایدارتر از DRI در حمل و انبارش.",
      what: [
        "بریکت آهن اسفنجی (HBI) آهن اسفنجی‌ای است که در دمای بالا فشرده و به قالب‌های متراکم تبدیل شده است.",
        "چگالی بیشتر و سطح تماس کمتر، بریکت را در برابر اکسید شدن دوباره پایدارتر از آهن اسفنجی معمولی می‌کند و حمل و انبارش آن را، به‌ویژه در مسیرهای طولانی و صادراتی، ساده‌تر می‌سازد.",
      ],
      specify: ["درصد آهن کل (Fe) و درجه متالیزاسیون", "محدوده کربن و حداکثر گوگرد و فسفر", "ابعاد و چگالی بریکت", "مقدار به تن، برنامه تحویل، محل تحویل یا مقصد صادراتی"],
      documents: ["گواهی آنالیز تولیدکننده", "گزارش بازرسی و نمونه‌برداری، در صورت نیاز", "مدارک صادراتی، برای خریداران خارج از ایران"],
    },
    en: {
      name: "Hot briquetted iron (HBI)",
      title: "Hot Briquetted Iron (HBI) from Iran — Specs and Sourcing",
      h1: "Hot briquetted iron (HBI)",
      description: "Hot briquetted iron sourced in Iran for melt shops and export: send total Fe, metallisation, carbon and tonnage. On request only.",
      summary: "DRI compacted at high temperature; more stable than DRI in transport and storage.",
      what: [
        "Hot briquetted iron (HBI) is direct reduced iron compacted at high temperature into dense briquettes.",
        "Its higher density and smaller surface area make it more resistant to re-oxidation than ordinary DRI, which makes transport and storage easier, especially over long and export routes.",
      ],
      specify: ["Total iron (Fe) and degree of metallisation", "Carbon range and the maximum sulphur and phosphorus", "Briquette size and density", "Quantity in tonnes, delivery schedule and destination"],
      documents: ["Producer's certificate of analysis", "Inspection and sampling report, if required", "Export documents for buyers outside Iran"],
    },
    ar: {
      name: "الحديد المقولب على الساخن",
      title: "الحديد المقولب على الساخن (HBI) من إيران: المواصفات والتوريد",
      h1: "الحديد المقولب على الساخن (HBI)",
      description: "توريد الحديد المقولب على الساخن (HBI) من إيران لمصانع الصهر والتصدير: أرسل نسبة الحديد والتمعدن والكربون والكمية. عبر الطلب فقط.",
      summary: "حديد إسفنجي مضغوط في درجة حرارة عالية؛ أكثر ثباتًا من DRI في النقل والتخزين.",
      what: [
        "الحديد المقولب على الساخن (HBI) هو حديد إسفنجي يُضغط في درجة حرارة عالية إلى قوالب كثيفة.",
        "كثافته الأعلى ومساحة سطحه الأصغر تجعلانه أكثر مقاومة لإعادة الأكسدة من الحديد الإسفنجي العادي، فيسهل نقله وتخزينه، خاصةً في المسافات الطويلة ومسارات التصدير.",
      ],
      specify: ["نسبة الحديد الكلي (Fe) ودرجة التمعدن", "مدى الكربون والحد الأقصى للكبريت والفوسفور", "مقاس القوالب وكثافتها", "الكمية بالطن وجدول التسليم وبلد الوجهة"],
      documents: ["شهادة تحليل المنتِج", "تقرير الفحص وأخذ العينات عند الحاجة", "مستندات التصدير للمشترين خارج إيران"],
    },
  },
};
