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
    brandLine: string;
    secondaryCta: string;
    /** Replaces v0's fabricated stat rail with the four protection controls, unitless. */
    rail: { title: string; body: string }[];
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
    heading: string;
    /** "Updated <relative time>" label prefix — components/home/price-strip.tsx appends the formatted value. */
    updatedPrefix: string;
    staleLabel: string;
  };
}

export const homepageCopy: Record<Locale, HomepageCopy> = {
  fa: {
    hero: {
      eyebrow: "مدیریت تأمین و خرید پروژه‌ای فولاد",
      title: "خرید آهن را به یک تصمیم مطمئن تبدیل کنید.",
      body: "فاکتور یا لیست خریدتان را بفرستید؛ آهن آسا نیاز پروژه، گزینه‌های تأمین و مسیر خرید را با نگاه فنی و تجاری بررسی و هماهنگ می‌کند.",
      brandLine: "ما مراقب سرمایه شما هستیم.",
      secondaryCta: "درخواست قیمت تلفنی",
      rail: [
        { title: "شفافیت در نیاز", body: "مشخصات و زمان‌بندی پیش از تعهد نهایی روشن می‌شود" },
        { title: "کنترل تأمین", body: "گزینه‌های تأمین مقایسه و ارزیابی می‌شوند" },
        { title: "حفاظت تجاری", body: "نه فقط قیمت واحد — مستندات، زمان‌بندی و شرایط پرداخت هم بررسی می‌شود" },
        { title: "هماهنگی تحویل", body: "مراحل خرید تا تحویل پیگیری می‌شود" },
      ],
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
      heading: "آخرین قیمت‌ها",
      updatedPrefix: "به‌روزرسانی:",
      staleLabel: "قیمت قدیمی",
    },
  },
  en: {
    hero: {
      eyebrow: "Project steel procurement management",
      title: "Turn buying steel into a confident decision.",
      body: "Send your invoice or purchase list — Ahan Asa reviews the project requirement, sourcing options, and purchasing path with both technical and commercial judgment.",
      brandLine: "We protect your capital.",
      secondaryCta: "Request a quote on WhatsApp",
      rail: [
        { title: "Requirement clarity", body: "Specification and timing clarified before commitment" },
        { title: "Sourcing control", body: "Sourcing options compared and evaluated" },
        { title: "Commercial protection", body: "Not unit price alone — documentation, timing, and payment terms too" },
        { title: "Delivery coordination", body: "Purchasing steps tracked through to delivery" },
      ],
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
      heading: "Latest prices",
      updatedPrefix: "Updated:",
      staleLabel: "Older price",
    },
  },
  ar: {
    hero: {
      eyebrow: "إدارة توريد وشراء الصلب للمشاريع",
      title: "حوّل شراء الحديد إلى قرار مطمئن.",
      body: "أرسل فاتورتك أو قائمة الشراء الخاصة بك؛ يقوم آهن آسا بمراجعة احتياج المشروع وخيارات التوريد ومسار الشراء بنظرة فنية وتجارية.",
      brandLine: "نحن نحرص على رأس مالك.",
      secondaryCta: "طلب سعر عبر واتساب",
      rail: [
        { title: "وضوح الاحتياج", body: "توضيح المواصفات والتوقيت قبل الالتزام" },
        { title: "التحكم في التوريد", body: "مقارنة وتقييم خيارات التوريد" },
        { title: "الحماية التجارية", body: "ليس السعر فقط — المستندات والتوقيت وشروط الدفع أيضًا" },
        { title: "تنسيق التسليم", body: "متابعة خطوات الشراء حتى التسليم" },
      ],
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
      heading: "أحدث الأسعار",
      updatedPrefix: "آخر تحديث:",
      staleLabel: "سعر قديم",
    },
  },
};
