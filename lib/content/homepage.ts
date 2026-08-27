import type { Locale } from "@/config/locales";

/**
 * Homepage copy — sourced directly from the approved "working Persian copy
 * direction" in HOMEPAGE_SPEC.md §9–§20 and the approved library in
 * CTA_STRATEGY.md §5. English/Arabic are direct translations of that same
 * approved source, not independently authored marketing copy; per
 * HOMEPAGE_SPEC.md §20.5 this content is classified `draft` (visible,
 * non-indexed — see app/[locale]/page.tsx) until reviewed by the content
 * owner. No statistic, certification, named partner, or unverified claim
 * appears anywhere below — see DOCUMENT_AUDIT_REPORT.md "v0 integration".
 */

export interface HomepageCopy {
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    brandLine: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    body: string;
    groups: { title: string; items: string[] }[];
    transition: string;
  };
  role: {
    eyebrow: string;
    title: string;
    columnLeftTitle: string;
    columnRightTitle: string;
    rows: { left: string; right: string }[];
    cta: string;
  };
  process: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    steps: { title: string; input: string; activity: string; output: string }[];
  };
  pillars: {
    eyebrow: string;
    title: string;
    items: { title: string; body: string }[];
  };
  method: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  };
  capabilities: {
    eyebrow: string;
    title: string;
    body: string;
    links: { path: string; title: string; body: string }[];
  };
  faq: {
    eyebrow: string;
    title: string;
    items: { q: string; a: string }[];
  };
}

export const homepageCopy: Record<Locale, HomepageCopy> = {
  fa: {
    hero: {
      eyebrow: "مدیریت تأمین و خرید پروژه‌ای فولاد",
      title: "خرید آهن را به یک تصمیم مطمئن تبدیل کنید.",
      body: "فاکتور یا لیست خریدتان را بفرستید؛ آهن آسا نیاز پروژه، گزینه‌های تأمین و مسیر خرید را با نگاه فنی و تجاری بررسی و هماهنگ می‌کند.",
      brandLine: "ما مراقب سرمایه شما هستیم.",
    },
    problem: {
      eyebrow: "چرا فقط قیمت کافی نیست",
      title: "قیمت واحد، تمام هزینه خرید نیست.",
      body: "یک انتخاب نامتناسب، تأخیر در تأمین یا نقص در مدارک می‌تواند هزینه‌ای بیشتر از اختلاف اولیه قیمت ایجاد کند.",
      groups: [
        {
          title: "مشخصات و دامنه",
          items: ["مشخصات فنی درست و منطبق با کاربرد", "مقدار و دامنه دقیق سفارش"],
        },
        {
          title: "تأمین و مستندات",
          items: ["تناسب تأمین‌کننده با نیاز پروژه", "مستندسازی و قابلیت ردیابی محموله", "زمان‌بندی و در دسترس بودن"],
        },
        {
          title: "تجاری و اجرا",
          items: ["شرایط پرداخت و تعهدات تجاری", "هماهنگی لجستیک و تحویل"],
        },
      ],
      transition: "این عوامل، هزینه واقعی خرید را می‌سازند — نه فقط رقمی که در ابتدا دیده می‌شود.",
    },
    role: {
      eyebrow: "نقش آهن آسا",
      title: "خرید معمولی، در برابر خرید مدیریت‌شده.",
      columnLeftTitle: "خرید معطوف به معامله",
      columnRightTitle: "خرید مدیریت‌شده با آهن آسا",
      rows: [
        {
          left: "عمدتاً از یک قلم درخواستی و قیمت پیشنهادی شروع می‌شود",
          right: "از نیاز پروژه، مشخصات فنی، زمان‌بندی و اولویت‌های خرید آغاز می‌شود",
        },
        {
          left: "پیشنهادهای تجاری کلی را مقایسه می‌کند",
          right: "شرایط فنی، تجاری، مستندات و تحویل مرتبط را بررسی می‌کند",
        },
        {
          left: "عمدتاً پس از ثبت سفارش پایان می‌یابد",
          right: "مسیر تأیید‌شده را تا نقاط عطف خرید و تحویل هماهنگ می‌کند",
        },
        {
          left: "بار ارزیابی بیشتر بر عهده خریدار باقی می‌ماند",
          right: "مسئولیت‌ها، تصمیمات و مراحل بعدی را شفاف‌تر می‌کند",
        },
      ],
      cta: "مدیریت خرید آهن آسا چگونه کار می‌کند؟",
    },
    process: {
      eyebrow: "روند خرید",
      title: "از ارسال درخواست تا هماهنگی تحویل، در شش مرحله.",
      body: "هر مرحله یک ورودی مشخص از شما و یک خروجی مشخص از ما دارد.",
      cta: "برای شروع چه اطلاعاتی لازم است؟",
      steps: [
        {
          title: "ارسال درخواست",
          input: "فاکتور، لیست خرید یا نیاز پروژه",
          activity: "دریافت و ثبت درخواست",
          output: "درخواست شما نزد واحد بررسی ثبت می‌شود",
        },
        {
          title: "بررسی نیاز",
          input: "مشخصات، مقدار، زمان‌بندی و اولویت‌ها",
          activity: "شفاف‌سازی جزئیات مورد نیاز",
          output: "نیاز پروژه به‌صورت دقیق مستند می‌شود",
        },
        {
          title: "ارزیابی تأمین",
          input: "معیارهای مورد نظر پروژه",
          activity: "شناسایی و مقایسه گزینه‌های تأمین مناسب",
          output: "گزینه‌های تأمین قابل‌اتکا مشخص می‌شوند",
        },
        {
          title: "پیشنهاد و تصمیم",
          input: "بازخورد شما بر گزینه‌های ارائه‌شده",
          activity: "ارائه خلاصه پیشنهاد یا تصمیم در چارچوب توافق‌شده",
          output: "یک پیشنهاد فنی و تجاری روشن دریافت می‌کنید",
        },
        {
          title: "تأیید خرید",
          input: "تأیید نهایی شما",
          activity: "نهایی‌سازی شرایط، مسئولیت‌ها و اقدامات خرید",
          output: "شرایط خرید به‌صورت مکتوب تأیید می‌شود",
        },
        {
          title: "هماهنگی تأمین و تحویل",
          input: "—",
          activity: "هماهنگی مستندات، ارتباط با تأمین‌کننده و نقاط عطف تحویل",
          output: "وضعیت تحویل در چارچوب توافق‌شده پیگیری می‌شود",
        },
      ],
    },
    pillars: {
      eyebrow: "ستون‌های حفاظت از خرید",
      title: "«ما مراقب سرمایه شما هستیم» یعنی این چهار کنترل.",
      items: [
        {
          title: "شفافیت در نیاز",
          body: "مشخصات فنی، مقدار، مستندات، زمان‌بندی، محل و انتظارات تحویل، پیش از تعهد نهایی روشن می‌شود.",
        },
        {
          title: "کنترل تأمین",
          body: "گزینه‌های تأمین مرتبط، بر اساس اولویت‌های پروژه و معیارهای ارزیابی توافق‌شده شناسایی و مقایسه می‌شوند.",
        },
        {
          title: "حفاظت تجاری",
          body: "انطباق با مشخصات، ریسک تأمین‌کننده، مستندات، زمان‌بندی، لجستیک و شرایط پرداخت بررسی می‌شود — نه فقط قیمت واحد.",
        },
        {
          title: "هماهنگی تحویل",
          body: "مراحل توافق‌شده خرید هماهنگ می‌شود و ارتباط شفاف تا نقاط عطف تحویل حفظ می‌شود.",
        },
      ],
    },
    method: {
      eyebrow: "روش ارزیابی",
      title: "هر بررسی، مستند و قابل پیگیری است.",
      body: "پیش از اینکه گزینه‌ای به شما پیشنهاد شود، در برابر معیارهای مشخصی سنجیده می‌شود؛ نتیجه هر بررسی برای شما قابل توضیح است.",
      points: [
        "مقایسه مکتوب گزینه‌های تأمین در برابر نیاز پروژه",
        "بررسی مستندات و قابلیت ردیابی پیش از تأیید",
        "ثبت و قابل‌پیگیری‌بودن هر درخواست از ارسال تا تحویل",
      ],
    },
    capabilities: {
      eyebrow: "حوزه‌های تأمین",
      title: "برای هر نوع نیاز، یک نقطه شروع.",
      body: "بسته به نوع نیاز پروژه، از یکی از حوزه‌های زیر شروع کنید.",
      links: [
        { path: "/products", title: "محصولات", body: "گروه‌های کالایی فولاد و آلیاژ که آهن آسا خرید آن را مدیریت می‌کند." },
        { path: "/services", title: "خدمات", body: "آنچه آهن آسا در مسیر بررسی، تأمین و هماهنگی خرید انجام می‌دهد." },
        { path: "/markets", title: "بازارها", body: "حوزه‌های جغرافیایی و صنایعی که درخواست‌های خرید از آن‌ها بررسی می‌شود." },
        { path: "/about", title: "درباره ما", body: "نقش آهن آسا به‌عنوان مدیر خرید فولاد، نه فروشنده یا بازارگاه." },
      ],
    },
    faq: {
      eyebrow: "سوالات متداول",
      title: "پرسش‌های رایج پیش از ارسال درخواست.",
      items: [
        {
          q: "برای بررسی اولیه چه اطلاعاتی لازم است؟",
          a: "فاکتور یا لیست خرید موجود، یا شرح مکتوب نیاز پروژه شامل نوع محصول، مشخصات، مقدار و زمان‌بندی مورد نظر کافی است.",
        },
        {
          q: "آیا می‌توانم فاکتور یک تأمین‌کننده دیگر را ارسال کنم؟",
          a: "بله. ارسال فاکتور یا لیست خرید موجود، از مسیرهای پذیرفته‌شده برای شروع بررسی است.",
        },
        {
          q: "آیا آهن آسا مستقیماً فولاد می‌فروشد یا خرید را مدیریت می‌کند؟",
          a: "آهن آسا نقش مدیر خرید را ایفا می‌کند: نیاز شما را بررسی، گزینه‌های تأمین را مقایسه و مسیر خرید را هماهنگ می‌کند.",
        },
        {
          q: "گزینه‌های تأمین و پیشنهادها چگونه ارزیابی می‌شوند؟",
          a: "بر اساس مشخصات فنی، مستندات، زمان‌بندی، لجستیک و شرایط تجاری مرتبط با نیاز پروژه — نه فقط قیمت واحد.",
        },
        {
          q: "آیا هماهنگی مستندات و تحویل هم بر عهده آهن آساست؟",
          a: "بله، در چارچوب توافق‌شده هر درخواست، هماهنگی مستندات و مراحل تحویل پیگیری می‌شود.",
        },
        {
          q: "این خدمت برای چه نوع پروژه‌هایی مناسب است؟",
          a: "برای تیم‌های خرید، پیمانکاران و پروژه‌هایی که نیاز به بررسی دقیق‌تر از یک استعلام ساده قیمت دارند.",
        },
        {
          q: "پس از ارسال درخواست چه اتفاقی می‌افتد؟",
          a: "درخواست شما توسط واحد بررسی مطالعه می‌شود و مراحل بعدی — روند شش‌مرحله‌ای بالا — آغاز می‌گردد.",
        },
      ],
    },
  },
  en: {
    hero: {
      eyebrow: "Project steel procurement management",
      title: "Turn buying steel into a confident decision.",
      body: "Send your invoice or purchase list — Ahan Asa reviews the project requirement, sourcing options, and purchasing path with both technical and commercial judgment.",
      brandLine: "We protect your capital.",
    },
    problem: {
      eyebrow: "Why price alone isn't enough",
      title: "The unit price is not the whole cost of a purchase.",
      body: "A mismatched choice, a sourcing delay, or incomplete documentation can cost more than the original price difference.",
      groups: [
        {
          title: "Specification & scope",
          items: ["Correct specification for the intended use", "Accurate order quantity and scope"],
        },
        {
          title: "Sourcing & documentation",
          items: ["Supplier suitability for the project", "Documentation and shipment traceability", "Timing and availability"],
        },
        {
          title: "Commercial & execution",
          items: ["Payment terms and commercial obligations", "Logistics and delivery coordination"],
        },
      ],
      transition: "These factors make up the real cost of a purchase — not just the number seen at first.",
    },
    role: {
      eyebrow: "Ahan Asa's role",
      title: "A regular purchase, versus a managed one.",
      columnLeftTitle: "Transaction-focused purchase",
      columnRightTitle: "Managed procurement with Ahan Asa",
      rows: [
        {
          left: "Starts mainly from a requested item and a quoted price",
          right: "Starts from the project requirement, specification, timing, and purchasing priorities",
        },
        {
          left: "Compares headline commercial offers",
          right: "Reviews relevant technical, commercial, documentation, and delivery conditions",
        },
        {
          left: "Ends mainly at order placement",
          right: "Coordinates the approved path through purchase and delivery milestones",
        },
        {
          left: "Leaves more evaluation burden with the buyer",
          right: "Makes responsibilities, decisions, and next steps more explicit",
        },
      ],
      cta: "How does Ahan Asa's procurement management work?",
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
    pillars: {
      eyebrow: "Purchase-protection pillars",
      title: "\"We protect your capital\" means these four controls.",
      items: [
        { title: "Requirement clarity", body: "Specifications, quantity, documentation, timing, location, and delivery expectations are clarified before commitment." },
        { title: "Sourcing control", body: "Relevant supply options are identified and compared against your project's priorities and agreed evaluation criteria." },
        { title: "Commercial protection", body: "Specification compliance, supplier risk, documentation, timing, logistics, and payment terms are reviewed — not unit price alone." },
        { title: "Delivery coordination", body: "Agreed purchasing steps are coordinated, with clear communication through delivery milestones." },
      ],
    },
    method: {
      eyebrow: "Evaluation method",
      title: "Every review is documented and traceable.",
      body: "Before an option is proposed to you, it is measured against defined criteria — and the outcome of every review is explainable to you.",
      points: [
        "A written comparison of sourcing options against the project requirement",
        "Documentation and traceability checked before confirmation",
        "Every request is logged and traceable from submission to delivery",
      ],
    },
    capabilities: {
      eyebrow: "Sourcing areas",
      title: "One starting point for every kind of requirement.",
      body: "Depending on your project's requirement, start from one of the areas below.",
      links: [
        { path: "/products", title: "Products", body: "The steel and alloy categories whose purchase Ahan Asa manages." },
        { path: "/services", title: "Services", body: "What Ahan Asa does during requirement review, sourcing, and purchase coordination." },
        { path: "/markets", title: "Markets", body: "The regions and industries whose purchase requests are reviewed." },
        { path: "/about", title: "About", body: "Ahan Asa's role as a steel purchasing manager — not a seller or marketplace." },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Common questions before you send a request.",
      items: [
        { q: "What information do you need for an initial review?", a: "An existing invoice or purchase list, or a written description of the project requirement — product type, specification, quantity, and desired timing — is enough." },
        { q: "Can I send an invoice from another supplier?", a: "Yes. Sending an existing invoice or purchase list is an accepted way to start a review." },
        { q: "Does Ahan Asa sell steel directly, or manage the purchase?", a: "Ahan Asa acts as a purchasing manager: reviewing your requirement, comparing sourcing options, and coordinating the purchasing path." },
        { q: "How are sourcing options and proposals evaluated?", a: "Based on specification, documentation, timing, logistics, and commercial terms relevant to the project requirement — not unit price alone." },
        { q: "Does Ahan Asa also coordinate documentation and delivery?", a: "Yes, within the agreed scope of each request, documentation and delivery milestones are tracked." },
        { q: "What kind of projects is this suited for?", a: "Purchasing teams, contractors, and projects that need a more thorough review than a simple price quote." },
        { q: "What happens after I submit a request?", a: "Your request is reviewed by the review team, and the six-stage process above begins." },
      ],
    },
  },
  ar: {
    hero: {
      eyebrow: "إدارة توريد وشراء الصلب للمشاريع",
      title: "حوّل شراء الحديد إلى قرار مطمئن.",
      body: "أرسل فاتورتك أو قائمة الشراء الخاصة بك؛ يقوم آهن آسا بمراجعة احتياج المشروع وخيارات التوريد ومسار الشراء بنظرة فنية وتجارية.",
      brandLine: "نحن نحرص على رأس مالك.",
    },
    problem: {
      eyebrow: "لماذا السعر وحده لا يكفي",
      title: "سعر الوحدة ليس كامل تكلفة الشراء.",
      body: "اختيار غير مناسب، أو تأخير في التوريد، أو نقص في المستندات قد يكلف أكثر من فارق السعر الأولي.",
      groups: [
        { title: "المواصفات والنطاق", items: ["مواصفات فنية صحيحة تناسب الاستخدام", "كمية ونطاق الطلب بدقة"] },
        { title: "التوريد والمستندات", items: ["ملاءمة المورد لاحتياج المشروع", "التوثيق وإمكانية تتبع الشحنة", "التوقيت والتوافر"] },
        { title: "الجوانب التجارية والتنفيذ", items: ["شروط الدفع والالتزامات التجارية", "تنسيق اللوجستيات والتسليم"] },
      ],
      transition: "هذه العوامل هي ما يشكل التكلفة الحقيقية للشراء — وليس فقط الرقم الظاهر في البداية.",
    },
    role: {
      eyebrow: "دور آهن آسا",
      title: "الشراء المعتاد، مقابل الشراء المُدار.",
      columnLeftTitle: "شراء يركز على الصفقة",
      columnRightTitle: "شراء مُدار مع آهن آسا",
      rows: [
        { left: "يبدأ غالبًا من صنف مطلوب وسعر معروض", right: "يبدأ من احتياج المشروع والمواصفات والتوقيت وأولويات الشراء" },
        { left: "يقارن العروض التجارية العامة", right: "يراجع الشروط الفنية والتجارية والمستندات وشروط التسليم ذات الصلة" },
        { left: "ينتهي غالبًا عند إتمام الطلب", right: "ينسّق المسار المعتمد حتى محطات الشراء والتسليم" },
        { left: "يترك عبء التقييم الأكبر على المشتري", right: "يوضح المسؤوليات والقرارات والخطوات التالية" },
      ],
      cta: "كيف تعمل إدارة الشراء لدى آهن آسا؟",
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
    pillars: {
      eyebrow: "ركائز حماية الشراء",
      title: "«نحن نحرص على رأس مالك» يعني هذه الضوابط الأربعة.",
      items: [
        { title: "وضوح الاحتياج", body: "تُوضَّح المواصفات والكمية والمستندات والتوقيت والموقع وتوقعات التسليم قبل الالتزام النهائي." },
        { title: "التحكم في التوريد", body: "تُحدَّد خيارات التوريد ذات الصلة وتُقارَن وفق أولويات المشروع ومعايير التقييم المتفق عليها." },
        { title: "الحماية التجارية", body: "تُراجَع مطابقة المواصفات ومخاطر المورد والمستندات والتوقيت واللوجستيات وشروط الدفع — وليس سعر الوحدة فقط." },
        { title: "تنسيق التسليم", body: "تُنسَّق خطوات الشراء المتفق عليها مع تواصل واضح حتى محطات التسليم." },
      ],
    },
    method: {
      eyebrow: "منهجية التقييم",
      title: "كل مراجعة موثقة وقابلة للتتبع.",
      body: "قبل اقتراح أي خيار عليك، يُقاس مقابل معايير محددة؛ ونتيجة كل مراجعة قابلة للتوضيح لك.",
      points: [
        "مقارنة مكتوبة لخيارات التوريد مقابل احتياج المشروع",
        "مراجعة المستندات وإمكانية التتبع قبل التأكيد",
        "تسجيل كل طلب وإمكانية تتبعه من الإرسال حتى التسليم",
      ],
    },
    capabilities: {
      eyebrow: "مجالات التوريد",
      title: "نقطة بداية واحدة لكل نوع احتياج.",
      body: "بحسب احتياج مشروعك، ابدأ من أحد المجالات التالية.",
      links: [
        { path: "/products", title: "المنتجات", body: "فئات الصلب والسبائك التي يدير آهن آسا عملية شرائها." },
        { path: "/services", title: "الخدمات", body: "ما يقوم به آهن آسا أثناء مراجعة الاحتياج والتوريد وتنسيق الشراء." },
        { path: "/markets", title: "الأسواق", body: "المناطق والصناعات التي تُراجَع طلبات الشراء الواردة منها." },
        { path: "/about", title: "من نحن", body: "دور آهن آسا كمدير شراء للصلب — وليس بائعًا أو سوقًا إلكترونيًا." },
      ],
    },
    faq: {
      eyebrow: "الأسئلة الشائعة",
      title: "أسئلة شائعة قبل إرسال الطلب.",
      items: [
        { q: "ما المعلومات اللازمة للمراجعة الأولية؟", a: "تكفي فاتورة أو قائمة شراء موجودة، أو وصف كتابي لاحتياج المشروع يشمل نوع المنتج والمواصفات والكمية والتوقيت المطلوب." },
        { q: "هل يمكنني إرسال فاتورة من مورد آخر؟", a: "نعم. إرسال فاتورة أو قائمة شراء موجودة هو أحد المسارات المقبولة لبدء المراجعة." },
        { q: "هل يبيع آهن آسا الصلب مباشرة أم يدير عملية الشراء؟", a: "يقوم آهن آسا بدور مدير الشراء: مراجعة احتياجك، ومقارنة خيارات التوريد، وتنسيق مسار الشراء." },
        { q: "كيف تُقيَّم خيارات التوريد والعروض؟", a: "بناءً على المواصفات والمستندات والتوقيت واللوجستيات والشروط التجارية ذات الصلة باحتياج المشروع — وليس سعر الوحدة فقط." },
        { q: "هل يتولى آهن آسا أيضًا تنسيق المستندات والتسليم؟", a: "نعم، ضمن النطاق المتفق عليه لكل طلب، تُتابَع المستندات ومحطات التسليم." },
        { q: "لأي نوع من المشاريع تناسب هذه الخدمة؟", a: "لفرق الشراء والمقاولين والمشاريع التي تحتاج مراجعة أدق من مجرد طلب سعر بسيط." },
        { q: "ماذا يحدث بعد إرسال الطلب؟", a: "تتم مراجعة طلبك من قبل فريق المراجعة، وتبدأ المراحل الست الموضحة أعلاه." },
      ],
    },
  },
};
