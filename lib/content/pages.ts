import type { Locale } from "@/config/locales";

/**
 * Interior-page copy (about/services/markets). Grounded only in confirmed
 * product truth (CLAUDE.md §7, PROJECT_OVERRIDES.md §4/§7) and the same
 * approved process/pillar content used on the homepage — no company
 * statistics, named certifications, client counts, or country/port lists,
 * all of which were fabricated in the v0 source and were removed; see
 * DOCUMENT_AUDIT_REPORT.md "v0 integration".
 */

export interface AboutCopy {
  hero: { eyebrow: string; title: string; body: string };
  roleTitle: string;
  roleBody: string[];
  notTitle: string;
  notItems: string[];
  isTitle: string;
  isItems: string[];
}

export const aboutCopy: Record<Locale, AboutCopy> = {
  fa: {
    hero: {
      eyebrow: "درباره ما",
      title: "مدیر خرید فولاد شما — نه فروشنده، نه بازارگاه.",
      body: "آهن آسا فرآیند خرید فولاد را از سمت خریدار مدیریت می‌کند: از بررسی نیاز تا هماهنگی تأمین و تحویل.",
    },
    roleTitle: "چرا «مدیریت خرید»؟",
    roleBody: [
      "در یک معامله معمولی، مسئولیت ارزیابی مشخصات، تأمین‌کننده، مستندات و زمان‌بندی عمدتاً بر عهده خریدار است.",
      "آهن آسا این بار ارزیابی را بر عهده می‌گیرد: نیاز پروژه شما را بررسی می‌کند، گزینه‌های تأمین را بر اساس معیارهای مرتبط مقایسه می‌کند و مسیر خرید را تا تحویل هماهنگ می‌کند.",
      "این رویکرد از فروش یک قلم کالا با کمترین قیمت متفاوت است؛ روی تصمیم درست برای پروژه شما تمرکز دارد.",
    ],
    notTitle: "این خدمت برای چه نیازهایی مناسب نیست",
    notItems: ["خریدهای جزئی و لحظه‌ای بدون بررسی فنی", "انتظار خرید فوری و آنی بدون فرآیند بررسی", "درخواست‌های نامشخص و ناقص که نیاز به پیگیری ندارند"],
    isTitle: "این خدمت برای چه نیازهایی مناسب است",
    isItems: ["تأمین پروژه‌ای که نیاز به مقایسه منظم تأمین‌کنندگان دارد", "سفارش‌های عمده و کنترل‌شده", "خریدارانی که پیگیری کامل تا تحویل نیاز دارند"],
  },
  en: {
    hero: {
      eyebrow: "About us",
      title: "Your steel purchasing manager — not a seller, not a marketplace.",
      body: "Ahan Asa manages the steel purchasing process from the buyer's side: from requirement review to sourcing and delivery coordination.",
    },
    roleTitle: "Why \"purchasing management\"?",
    roleBody: [
      "In a regular transaction, the burden of evaluating specification, supplier, documentation, and timing sits mostly with the buyer.",
      "Ahan Asa takes on that evaluation burden: reviewing your project requirement, comparing sourcing options against relevant criteria, and coordinating the purchasing path through to delivery.",
      "This is different from selling a single item at the lowest price; it focuses on the right decision for your project.",
    ],
    notTitle: "Who this service isn't for",
    notItems: ["Small, impulsive purchases without technical review", "Expectations of instant, on-demand buying with no review process", "Vague, incomplete requests that don't need follow-through"],
    isTitle: "Who this service is for",
    isItems: ["Project sourcing that needs regular supplier comparison", "Bulk, controlled orders", "Buyers who need full follow-through to delivery"],
  },
  ar: {
    hero: {
      eyebrow: "من نحن",
      title: "مدير شراء الصلب الخاص بك — لسنا بائعًا ولا سوقًا إلكترونيًا.",
      body: "يدير آهن آسا عملية شراء الصلب من جانب المشتري: من مراجعة الاحتياج إلى تنسيق التوريد والتسليم.",
    },
    roleTitle: "لماذا «إدارة الشراء»؟",
    roleBody: [
      "في المعاملة العادية، يقع عبء تقييم المواصفات والمورد والمستندات والتوقيت غالبًا على عاتق المشتري.",
      "يتحمل آهن آسا هذا العبء: يراجع احتياج مشروعك، ويقارن خيارات التوريد وفق المعايير ذات الصلة، وينسّق مسار الشراء حتى التسليم.",
      "هذا يختلف عن بيع صنف واحد بأقل سعر؛ فهو يركز على القرار الصحيح لمشروعك.",
    ],
    notTitle: "لمن لا تناسب هذه الخدمة",
    notItems: ["المشتريات الصغيرة والعفوية دون مراجعة فنية", "توقع الشراء الفوري دون عملية مراجعة", "الطلبات غامضة وغير مكتملة لا تحتاج متابعة"],
    isTitle: "لمن تناسب هذه الخدمة",
    isItems: ["توريد المشاريع التي تحتاج مقارنة منتظمة للموردين", "الطلبات الكبيرة والمُدارة", "المشترون الذين يحتاجون متابعة كاملة حتى التسليم"],
  },
};

export interface ServicesCopy {
  hero: { eyebrow: string; title: string; body: string };
  functions: { title: string; body: string }[];
}

export const servicesCopy: Record<Locale, ServicesCopy> = {
  fa: {
    hero: {
      eyebrow: "خدمات",
      title: "آنچه در مسیر بررسی، تأمین و تحویل انجام می‌دهیم.",
      body: "هر خدمت زیر بخشی از یک فرآیند واحد است، نه یک بسته جداگانه برای خرید.",
    },
    functions: [
      { title: "بررسی نیاز و مشخصات", body: "فاکتور، لیست خرید یا شرح نیاز پروژه شما بررسی و مشخصات، مقدار و زمان‌بندی مورد نیاز مستند می‌شود." },
      { title: "ارزیابی و مقایسه تأمین", body: "گزینه‌های تأمین مرتبط بر اساس معیارهای فنی، تجاری و زمان‌بندی پروژه شما شناسایی و مقایسه می‌شوند." },
      { title: "پیشنهاد و تصمیم", body: "خلاصه پیشنهاد یا تصمیم به‌صورت شفاف در چارچوب توافق‌شده ارائه می‌شود." },
      { title: "هماهنگی مستندات و تحویل", body: "پس از تأیید خرید، مستندات، ارتباط با تأمین‌کننده و نقاط عطف تحویل پیگیری می‌شود." },
    ],
  },
  en: {
    hero: {
      eyebrow: "Services",
      title: "What we do through review, sourcing, and delivery.",
      body: "Each service below is part of one continuous process, not a separate package to buy.",
    },
    functions: [
      { title: "Requirement & specification review", body: "Your invoice, purchase list, or project description is reviewed and the required specification, quantity, and timing are documented." },
      { title: "Sourcing evaluation & comparison", body: "Relevant sourcing options are identified and compared against your project's technical, commercial, and timing criteria." },
      { title: "Proposal & decision", body: "A clear proposal or decision summary is presented within the agreed scope." },
      { title: "Documentation & delivery coordination", body: "After purchase confirmation, documentation, supplier communication, and delivery milestones are tracked." },
    ],
  },
  ar: {
    hero: {
      eyebrow: "الخدمات",
      title: "ما نقوم به عبر المراجعة والتوريد والتسليم.",
      body: "كل خدمة أدناه جزء من عملية واحدة متصلة، وليست باقة منفصلة للشراء.",
    },
    functions: [
      { title: "مراجعة الاحتياج والمواصفات", body: "تُراجَع فاتورتك أو قائمة الشراء أو وصف المشروع، وتُوثَّق المواصفات والكمية والتوقيت المطلوب." },
      { title: "تقييم ومقارنة التوريد", body: "تُحدَّد خيارات التوريد ذات الصلة وتُقارَن وفق المعايير الفنية والتجارية وتوقيت مشروعك." },
      { title: "العرض والقرار", body: "يُقدَّم ملخص عرض أو قرار واضح ضمن النطاق المتفق عليه." },
      { title: "تنسيق المستندات والتسليم", body: "بعد تأكيد الشراء، تُتابَع المستندات والتواصل مع المورد ومحطات التسليم." },
    ],
  },
};

export interface MarketsCopy {
  hero: { eyebrow: string; title: string; body: string };
  scopeTitle: string;
  scopeBody: string;
  industries: string[];
  industriesTitle: string;
}

export const marketsCopy: Record<Locale, MarketsCopy> = {
  fa: {
    hero: {
      eyebrow: "بازارها",
      title: "دامنه فعالیت، بر اساس هر درخواست.",
      body: "پوشش جغرافیایی و صنعتی بر اساس نیاز هر پروژه بررسی می‌شود؛ فهرست دقیق کشورها و مناطق به‌زودی منتشر می‌شود.",
    },
    scopeTitle: "دامنه فعالیت",
    scopeBody:
      "آهن آسا درخواست‌های خرید را برای پروژه‌ها و تیم‌های خرید در صنایع مختلف بررسی می‌کند. اطلاعات کامل درباره مناطق و مقاصد تحت پوشش، هم‌زمان با تکمیل مستندات رسمی منتشر خواهد شد.",
    industriesTitle: "صنایعی که درخواست‌های آن‌ها بررسی می‌شود",
    industries: ["ساخت‌وساز و زیرساخت", "کارخانه‌های نورد مجدد", "ریخته‌گری و کارگاه‌های ذوب", "ساخت‌وساز و سازه‌های فلزی", "خودروسازی و ماشین‌آلات"],
  },
  en: {
    hero: {
      eyebrow: "Markets",
      title: "Coverage, reviewed request by request.",
      body: "Geographic and industry coverage is reviewed per project requirement; a detailed list of countries and regions will be published soon.",
    },
    scopeTitle: "Scope of activity",
    scopeBody:
      "Ahan Asa reviews purchase requests for projects and purchasing teams across a range of industries. Full details on covered regions and destinations will be published once the formal documentation is complete.",
    industriesTitle: "Industries whose requests are reviewed",
    industries: ["Construction & infrastructure", "Re-rolling mills", "Foundries & melt shops", "Steel & metal fabrication", "Automotive & machinery"],
  },
  ar: {
    hero: {
      eyebrow: "الأسواق",
      title: "النطاق، يُراجَع مع كل طلب.",
      body: "تُراجَع التغطية الجغرافية والصناعية بحسب احتياج كل مشروع؛ ستُنشَر قائمة تفصيلية بالدول والمناطق قريبًا.",
    },
    scopeTitle: "نطاق النشاط",
    scopeBody:
      "يراجع آهن آسا طلبات الشراء للمشاريع وفرق الشراء في مجموعة من الصناعات. سيتم نشر التفاصيل الكاملة حول المناطق والوجهات المشمولة عند اكتمال التوثيق الرسمي.",
    industriesTitle: "الصناعات التي تُراجَع طلباتها",
    industries: ["البناء والبنية التحتية", "مصانع إعادة الدرفلة", "المسابك وورش الصهر", "التصنيع الفولاذي والمعدني", "صناعة السيارات والآلات"],
  },
};
