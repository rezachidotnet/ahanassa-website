import type { Locale } from "@/config/locales";

/**
 * Homepage copy. Section composition follows the approved v0 implementation
 * (hero → product showcase → capabilities → assurance → process → reach →
 * final CTA — PROJECT_OVERRIDES.md §8b / DOCUMENT_AUDIT_REPORT.md DAR-021),
 * not the older HOMEPAGE_SPEC-driven 9-section layout. Copy itself still
 * draws only from approved/confirmed sources (HOMEPAGE_SPEC.md's working
 * copy direction, CTA_STRATEGY.md §5, confirmed product truth) — v0's own
 * fabricated statistics, certifications, and named-partner claims are not
 * reused; see DOCUMENT_AUDIT_REPORT.md DAR-020. Classified `draft` per
 * HOMEPAGE_SPEC.md §20.5 until content-owner review (pages stay
 * `indexable: false`).
 */

export interface HomepageCopy {
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    /** Frozen Hero V2.3 §4 — low-risk reassurance shown after the CTA pair. */
    reassurance: string;
    /** Frozen Hero V2.3 §5 — exactly 3 short, text-first trust points (no badges/icons/counters). */
    trust: string[];
    brandLine: string;
    secondaryCta: string;
  };
  productShowcase: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  };
  capabilities: {
    eyebrow: string;
    title: string;
    body: string;
  };
  assurance: {
    eyebrow: string;
    title: string;
    body: string;
    /** Short label for the image-overlay badge — distinct from `title`, not a statistic. */
    badge: string;
    points: string[];
  };
  process: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    steps: { title: string; input: string; activity: string; output: string }[];
  };
  reach: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  };
  priceStrip: {
    /** Frozen V2.1 §6 preferred heading — "منتخب" (selected/curated) is intentional: the Homepage never exposes the full commercial catalog. */
    heading: string;
    /** Frozen V2.1 §48.1 buyer guidance — visible plain-language text, never hover/tooltip/icon-only (§48.2). */
    guidance: string;
    /** FRESH-state prefix, e.g. "به‌روزرسانی 10:42" (Frozen V2.1 §36.8) — components/home/price-strip.tsx appends the formatted timestamp. */
    updatedPrefix: string;
    /** AGING-state prefix, e.g. "آخرین قیمت ثبت‌شده · 12 شهریور، 14:10" (Frozen V2.1 §24.2/§36.8) — replaces the retired "قیمت قدیمی"/"stale" wording; never implies the price is invalid, only that it is the latest recorded one. */
    agingPrefix: string;
  };
}

export const homepageCopy: Record<Locale, HomepageCopy> = {
  fa: {
    hero: {
      eyebrow: "مدیریت تأمین فولاد پروژه",
      title: "تأمین فولاد پروژه، با بررسی فنی و تجاری پیش از خرید.",
      body: "لیست خرید یا نیاز پروژه را ارسال کنید؛ آهن آسا مشخصات، گزینه‌های تأمین و شرایط تجاری را بررسی می‌کند تا مسیر خرید شفاف‌تر و قابل‌کنترل‌تر باشد.",
      reassurance: "ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.",
      trust: ["بررسی فنی نیاز", "مقایسه گزینه‌های تأمین", "هماهنگی خرید"],
      brandLine: "ما مراقب سرمایه شما هستیم.",
      secondaryCta: "درخواست قیمت تلفنی",
    },
    productShowcase: {
      eyebrow: "محصولات",
      title: "گروه‌های کالایی فولاد و آلیاژ.",
      body: "هر گروه کالایی بخشی از خدمت مدیریت خرید آهن آساست — بررسی، مقایسه تأمین و هماهنگی تا تحویل.",
      cta: "همه محصولات",
    },
    capabilities: {
      eyebrow: "آنچه ما انجام می‌دهیم",
      title: "یک مدیر خرید، تنها زمانی ارزشمند است که مسئولیت را بپذیرد.",
      body: "بررسی نیاز، ارزیابی تأمین، تصمیم‌گیری و هماهنگی تحویل بر عهده ماست. شما یک نقطه تماس و یک مسیر شفاف تا نتیجه دارید.",
    },
    assurance: {
      eyebrow: "روش ارزیابی",
      title: "هر بررسی، مستند و قابل پیگیری است.",
      body: "پیش از اینکه گزینه‌ای به شما پیشنهاد شود، در برابر معیارهای مشخصی سنجیده می‌شود؛ نتیجه هر بررسی برای شما قابل توضیح است.",
      badge: "شفاف و مستند",
      points: [
        "مقایسه مکتوب گزینه‌های تأمین در برابر نیاز پروژه",
        "بررسی مستندات و قابلیت ردیابی پیش از تأیید",
        "ثبت و قابل‌پیگیری‌بودن هر درخواست از ارسال تا تحویل",
      ],
    },
    process: {
      eyebrow: "روند خرید",
      title: "از ارسال درخواست تا هماهنگی تحویل، در شش مرحله.",
      body: "هر مرحله یک ورودی مشخص از شما و یک خروجی مشخص از ما دارد.",
      cta: "برای شروع چه اطلاعاتی لازم است؟",
      steps: [
        { title: "ارسال درخواست", input: "فاکتور، لیست خرید یا نیاز پروژه", activity: "دریافت و ثبت درخواست", output: "درخواست شما نزد واحد بررسی ثبت می‌شود" },
        { title: "بررسی نیاز", input: "مشخصات، مقدار، زمان‌بندی و اولویت‌ها", activity: "شفاف‌سازی جزئیات مورد نیاز", output: "نیاز پروژه به‌صورت دقیق مستند می‌شود" },
        { title: "ارزیابی تأمین", input: "معیارهای مورد نظر پروژه", activity: "شناسایی و مقایسه گزینه‌های تأمین مناسب", output: "گزینه‌های تأمین قابل‌اتکا مشخص می‌شوند" },
        { title: "پیشنهاد و تصمیم", input: "بازخورد شما بر گزینه‌های ارائه‌شده", activity: "ارائه خلاصه پیشنهاد یا تصمیم در چارچوب توافق‌شده", output: "یک پیشنهاد فنی و تجاری روشن دریافت می‌کنید" },
        { title: "تأیید خرید", input: "تأیید نهایی شما", activity: "نهایی‌سازی شرایط، مسئولیت‌ها و اقدامات خرید", output: "شرایط خرید به‌صورت مکتوب تأیید می‌شود" },
        { title: "هماهنگی تأمین و تحویل", input: "—", activity: "هماهنگی مستندات، ارتباط با تأمین‌کننده و نقاط عطف تحویل", output: "وضعیت تحویل در چارچوب توافق‌شده پیگیری می‌شود" },
      ],
    },
    reach: {
      eyebrow: "دامنه فعالیت",
      title: "درخواست‌ها از صنایع مختلف بررسی می‌شود.",
      body: "پوشش جغرافیایی و صنعتی بر اساس نیاز هر پروژه بررسی می‌شود؛ جزئیات کامل به‌زودی منتشر می‌شود.",
      cta: "جزئیات دامنه فعالیت",
    },
    priceStrip: {
      heading: "آخرین قیمت‌های منتخب",
      guidance: "این قیمت‌ها راهنمای بازار هستند؛ قیمت نهایی به مشخصات، مقدار و شرایط تحویل بستگی دارد.",
      updatedPrefix: "به‌روزرسانی",
      agingPrefix: "آخرین قیمت ثبت‌شده",
    },
  },
  en: {
    hero: {
      eyebrow: "Project steel procurement management",
      title: "Project steel procurement, reviewed technically and commercially before purchase.",
      body: "Send your purchase list or project requirement — Ahan Asa reviews the specification, sourcing options, and commercial terms so your purchasing path is clearer and easier to control.",
      reassurance: "Sending your purchase list creates no commitment — your requirement is reviewed first.",
      trust: ["Technical requirement review", "Sourcing options compared", "Purchase coordination"],
      brandLine: "We protect your capital.",
      secondaryCta: "Request a phone quote",
    },
    productShowcase: {
      eyebrow: "Products",
      title: "Steel and alloy product categories.",
      body: "Every category is part of Ahan Asa's purchasing-management service — review, sourcing comparison, and coordination through to delivery.",
      cta: "All products",
    },
    capabilities: {
      eyebrow: "What we do",
      title: "A purchasing manager is only worth having if they take on the responsibility.",
      body: "Requirement review, sourcing evaluation, decision-making, and delivery coordination are on us. You get one point of contact and a clear path to the outcome.",
    },
    assurance: {
      eyebrow: "Evaluation method",
      title: "Every review is documented and traceable.",
      body: "Before an option is proposed to you, it is measured against defined criteria — and the outcome of every review is explainable to you.",
      badge: "Transparent & documented",
      points: [
        "A written comparison of sourcing options against the project requirement",
        "Documentation and traceability checked before confirmation",
        "Every request is logged and traceable from submission to delivery",
      ],
    },
    process: {
      eyebrow: "Purchasing process",
      title: "From request to delivery coordination, in six stages.",
      body: "Every stage has a clear input from you and a clear output from us.",
      cta: "What information do I need to get started?",
      steps: [
        { title: "Request submission", input: "Invoice, purchase list, or project requirement", activity: "Request received and logged", output: "Your request is registered with the review team" },
        { title: "Requirement review", input: "Specification, quantity, timing, priorities", activity: "Clarifying the required details", output: "The project requirement is documented precisely" },
        { title: "Sourcing evaluation", input: "Your project's evaluation criteria", activity: "Identifying and comparing suitable sourcing options", output: "Reliable sourcing options are identified" },
        { title: "Proposal & decision", input: "Your feedback on the options presented", activity: "Presenting a proposal or decision summary within the agreed scope", output: "You receive a clear technical/commercial proposal" },
        { title: "Purchase confirmation", input: "Your final approval", activity: "Finalizing terms, responsibilities, and purchasing actions", output: "Purchase terms are confirmed in writing" },
        { title: "Sourcing & delivery coordination", input: "—", activity: "Coordinating documentation, supplier communication, and delivery milestones", output: "Delivery status is tracked within the agreed scope" },
      ],
    },
    reach: {
      eyebrow: "Scope of activity",
      title: "Requests are reviewed across a range of industries.",
      body: "Geographic and industry coverage is reviewed per project requirement; full details will be published soon.",
      cta: "Scope of activity details",
    },
    priceStrip: {
      heading: "Latest selected prices",
      guidance: "These are market reference prices — the final price depends on specification, quantity, and delivery terms.",
      updatedPrefix: "Updated",
      agingPrefix: "Last recorded price",
    },
  },
  ar: {
    hero: {
      eyebrow: "إدارة توريد الصلب للمشاريع",
      title: "توريد صلب المشاريع، بعد مراجعة فنية وتجارية قبل الشراء.",
      body: "أرسل قائمة الشراء أو احتياج مشروعك؛ يراجع آهن آسا المواصفات وخيارات التوريد والشروط التجارية ليكون مسار الشراء أكثر وضوحًا وقابلية للتحكم.",
      reassurance: "إرسال قائمة الشراء لا يُنشئ أي التزام عليك؛ تتم مراجعة احتياجك أولاً.",
      trust: ["مراجعة الاحتياج الفني", "مقارنة خيارات التوريد", "تنسيق عملية الشراء"],
      brandLine: "نحن نحرص على رأس مالك.",
      secondaryCta: "طلب عرض سعر هاتفيًا",
    },
    productShowcase: {
      eyebrow: "المنتجات",
      title: "فئات منتجات الصلب والسبائك.",
      body: "كل فئة جزء من خدمة إدارة الشراء لدى آهن آسا — المراجعة ومقارنة التوريد والتنسيق حتى التسليم.",
      cta: "كل المنتجات",
    },
    capabilities: {
      eyebrow: "ما نقوم به",
      title: "مدير الشراء ذو قيمة فقط عندما يتحمل المسؤولية.",
      body: "مراجعة الاحتياج وتقييم التوريد واتخاذ القرار وتنسيق التسليم على عاتقنا. لديك نقطة تواصل واحدة ومسار واضح حتى النتيجة.",
    },
    assurance: {
      eyebrow: "منهجية التقييم",
      title: "كل مراجعة موثقة وقابلة للتتبع.",
      body: "قبل اقتراح أي خيار عليك، يُقاس مقابل معايير محددة؛ ونتيجة كل مراجعة قابلة للتوضيح لك.",
      badge: "شفاف وموثق",
      points: [
        "مقارنة مكتوبة لخيارات التوريد مقابل احتياج المشروع",
        "مراجعة المستندات وإمكانية التتبع قبل التأكيد",
        "تسجيل كل طلب وإمكانية تتبعه من الإرسال حتى التسليم",
      ],
    },
    process: {
      eyebrow: "مسار الشراء",
      title: "من إرسال الطلب إلى تنسيق التسليم، في ست مراحل.",
      body: "لكل مرحلة مُدخل واضح منك ومُخرج واضح منا.",
      cta: "ما المعلومات اللازمة للبدء؟",
      steps: [
        { title: "إرسال الطلب", input: "فاتورة أو قائمة شراء أو احتياج مشروع", activity: "استلام الطلب وتسجيله", output: "يُسجَّل طلبك لدى فريق المراجعة" },
        { title: "مراجعة الاحتياج", input: "المواصفات والكمية والتوقيت والأولويات", activity: "توضيح التفاصيل المطلوبة", output: "يُوثَّق احتياج المشروع بدقة" },
        { title: "تقييم التوريد", input: "معايير التقييم الخاصة بمشروعك", activity: "تحديد ومقارنة خيارات التوريد المناسبة", output: "تُحدَّد خيارات توريد موثوقة" },
        { title: "العرض والقرار", input: "ملاحظاتك على الخيارات المطروحة", activity: "تقديم ملخص عرض أو قرار ضمن النطاق المتفق عليه", output: "تحصل على عرض فني وتجاري واضح" },
        { title: "تأكيد الشراء", input: "موافقتك النهائية", activity: "إنهاء الشروط والمسؤوليات وإجراءات الشراء", output: "تُؤكَّد شروط الشراء كتابيًا" },
        { title: "تنسيق التوريد والتسليم", input: "—", activity: "تنسيق المستندات والتواصل مع المورد ومحطات التسليم", output: "تُتابَع حالة التسليم ضمن النطاق المتفق عليه" },
      ],
    },
    reach: {
      eyebrow: "نطاق النشاط",
      title: "تُراجَع الطلبات من مجموعة من الصناعات.",
      body: "تُراجَع التغطية الجغرافية والصناعية بحسب احتياج كل مشروع؛ ستُنشَر التفاصيل الكاملة قريبًا.",
      cta: "تفاصيل نطاق النشاط",
    },
    priceStrip: {
      heading: "أحدث الأسعار المختارة",
      guidance: "هذه أسعار إرشادية للسوق؛ يعتمد السعر النهائي على المواصفات والكمية وشروط التسليم.",
      updatedPrefix: "آخر تحديث",
      agingPrefix: "آخر سعر مسجل",
    },
  },
};
