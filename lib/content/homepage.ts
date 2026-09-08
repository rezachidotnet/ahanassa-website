import type { Locale } from "@/config/locales";

/**
 * Homepage copy. Section composition follows the approved v0 implementation
 * as hardened by the frozen component specs (hero → price strip → product
 * showcase → evaluation/assurance → process → reach → final CTA —
 * PROJECT_OVERRIDES.md §8b / DOCUMENT_AUDIT_REPORT.md DAR-021, sequence per
 * Evaluation/Assurance V2.1 §2), not the older HOMEPAGE_SPEC-driven
 * 9-section layout. The v0-era `capabilities` and `assurance` sections that
 * used to sit between Product Showcase and Process are retired; see the
 * `evaluationAssurance` field below. Copy itself still
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
    /**
     * 4-step procurement process rail, rendered between H1 and the
     * supporting copy: submit request list → technical review →
     * commercial review → purchase. Replaces the previous static 3-point
     * trust micro-layer (owner-directed content change) — that field is
     * intentionally removed, not merely unused, to avoid duplicating the
     * same "what we check" information in two places on the same Hero.
     */
    process: string[];
    /** Low-risk reassurance shown after the CTA pair. */
    reassurance: string;
    brandLine: string;
    secondaryCta: string;
  };
  productShowcase: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  };
  /**
   * Evaluation / Assurance — the frozen V2.1 component
   * (docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md).
   *
   * Replaces BOTH v0-baseline sections that previously occupied this slot:
   * `capabilities` ("آنچه ما انجام می‌دهیم" / "What we do") and `assurance`
   * ("روش ارزیابی" / "Evaluation method"). Neither one's copy was migrated —
   * §15 forbids reintroducing a "what we do" list inside this component, and
   * §4.1 names "روش ارزیابی" first among the six generic headings it must not
   * use. This is a clean replacement, not a repurposing.
   *
   * There is deliberately NO `eyebrow` field. §29's frozen semantic structure
   * is `<h2>` + `<p>` + `<ul>` with no eyebrow, and every natural Persian
   * eyebrow for this concept sits on §4.1's forbidden list — so inventing one
   * would mean inventing exactly the copy the spec bans. The component
   * therefore renders a bare `<h2 id>` (the shape components/home/price-strip.tsx
   * already uses on this same page) rather than SectionHeading, whose
   * `eyebrow` prop is required.
   *
   * `axes` is exactly four entries in every locale (§6: "A fifth top-level
   * axis must not be added"), in the frozen order Technical Conformity →
   * Sourcing Feasibility → Commercial Conditions → Delivery. The visible
   * 01–04 indexes are decorative and derived per locale at render time
   * (lib/content/evaluation-assurance.ts), never stored as content here.
   */
  evaluationAssurance: {
    /** Frozen FA H2 (§4.1); EN/AR are the approved transcreations (§33). */
    title: string;
    /** Frozen FA supporting copy (§5). */
    body: string;
    axes: { title: string; body: string }[];
  };
  /**
   * Buyer Value / Service Promise — the frozen V1.0 component
   * (docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md),
   * placed on the Homepage by
   * docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md §4.
   *
   * Answers exactly one buyer question (§1): "Why should I place my steel
   * request with Ahan Asa?" — supplier selection. It owns human
   * accountability, coordinated handling of diverse requested items, equal
   * seriousness for small and bulk requests, and follow-up through agreed
   * delivery obligations (§2).
   *
   * For the HOMEPAGE it supersedes `evaluationAssurance` below (§21). That
   * field, its component, and its spec are all deliberately RETAINED — the
   * Homepage simply no longer renders them. Nothing was deleted.
   *
   * Unlike `evaluationAssurance` and `purchaseProcess`, this component DOES
   * have an approved `eyebrow` (§3.1/§4/§5) and an approved supporting
   * statement (§3.3/§4/§5), so both are stored here. There is deliberately NO
   * `cta` field: §14 "no component-level primary CTA", §22.4 "It does not
   * contain a CTA" — conversion stays owned by Header, Hero and Final CTA.
   *
   * Every string below is the freeze's canonical copy character-for-character
   * (§3 Persian, §4 English, §5 Arabic). It must never be re-translated,
   * paraphrased, or "improved": §6's claim-safety rules are carried by exact
   * wording — `تعهدات توافق‌شده` rather than an unlimited "all commitments"
   * claim, `در صورت نیاز و توافق` for loading/transport, and equal QUALITY OF
   * ATTENTION (never identical commercial terms) for small versus bulk
   * requests. lib/content/buyer-value-frozen-spec-invariants.test.ts pins each
   * string against the imported freeze document itself.
   *
   * The visible 01–04 markers are decorative and derived per locale at render
   * time (lib/content/buyer-value.ts), never stored as content here (§7).
   */
  buyerValue: {
    /** Frozen FA eyebrow (§3.1); EN §4, AR §5. Secondary to the H2 (§7). */
    eyebrow: string;
    /** Frozen FA H2 (§3.2/§22.1); EN §4, AR §5. */
    title: string;
    /** Frozen FA supporting statement (§3.3); EN §4, AR §5. Exactly one. */
    body: string;
    /** Exactly four promises in the frozen order (§3.4–§3.7 / §19.3). */
    promises: { title: string; body: string }[];
  };
  /**
   * Purchase Process — the frozen V2.0 component
   * (docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md).
   *
   * Exactly four customer-facing steps in every locale (§6), in the frozen
   * order ارسال درخواست -> بررسی درخواست -> دریافت پیشنهاد -> تأیید و پیگیری
   * سفارش. It answers "چه اتفاقی می‌افتد و به چه ترتیب؟" (§3) — what happens
   * and in what sequence — while `evaluationAssurance` above answers "چه
   * چیزهایی بررسی می‌شود؟". §3 requires those two responsibilities to stay
   * separate, which is why no grade/standard/sourcing-feasibility/payment-term
   * /Incoterm/delivery-criteria detail appears here (§8.3).
   *
   * There is deliberately NO `eyebrow`, NO `body`, and NO `cta` field:
   *
   * - `body`: §5 freezes the structure as `H2 -> 4-step process`, explicitly
   *   NOT `H2 -> generic explanatory paragraph -> 4-step process`, and §39's
   *   Final Acceptance Matrix repeats "Supporting paragraph | None by default".
   *   (§17's illustrative markup snippet does show a `<p>`; that tension was
   *   found and resolved in the P0 audit's Consistency Note A in favour of the
   *   explicit content rule and the acceptance matrix.)
   * - `eyebrow`: no eyebrow copy is approved, and every natural Persian
   *   candidate is drawn from the five generic headings §4 names as forbidden
   *   ("روند خرید", "مراحل همکاری", "فرآیند ما", "نحوه کار ما", "مسیر تأمین").
   *   The component therefore renders a bare `<h2 id>` rather than
   *   SectionHeading, whose `eyebrow` prop is required — the same shape
   *   components/home/evaluation-assurance.tsx already uses on this page.
   * - `cta`: §23 "For V2.0: CTA = none". The page's Header, Hero, and Final
   *   CTA already own conversion; §23 warns specifically against adding a
   *   button "merely because the component ends with Step 04".
   *
   * The visible 01–04 indexes are decorative and derived per locale at render
   * time (lib/content/purchase-process.ts), never stored as content here (§32).
   */
  purchaseProcess: {
    /** Frozen FA H2 (§4); EN/AR are the owner-approved transcreations. */
    title: string;
    steps: { title: string; body: string }[];
  };
  /**
   * LEGACY six-stage procurement narrative — NOT the Homepage Purchase
   * Process. It is retained solely because `app/[locale]/services/page.tsx`
   * and `app/[locale]/contact/page.tsx` still read it; the Homepage no longer
   * renders any of it (components/home/process.tsx consumes `purchaseProcess`
   * above).
   *
   * This field is OUT OF SCOPE for Purchase Process V2.0, which governs the
   * Homepage component only. It is left byte-for-byte unchanged rather than
   * reshaped, because reshaping it would have forced either an invented
   * eyebrow/supporting paragraph for /services (SectionHeading requires
   * `eyebrow`) or a structural rewrite of a page this task is not authorised
   * to touch. Its `input`/`activity`/`output` framing and its sourcing-
   * comparison and supplier-communication wording are exactly what V2.0 §12
   * and §13 forbid on the Homepage, so it must NOT be reintroduced there.
   *
   * Follow-up: /services and /contact need their own approved copy so this
   * field can be retired outright — tracked in
   * docs/purchase-process/PURCHASE_PROCESS_P1_V2_0_IMPLEMENTATION_REPORT.md.
   */
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
      title: "تأمین فولاد پروژه‌ها",
      process: ["ارسال لیست درخواست", "بررسی فنی", "بررسی تجاری", "خرید"],
      body: "آهن آسا مسیر خرید آهن شما را آسان، شفاف و قابل‌کنترل می‌کند.",
      reassurance: "ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند.",
      brandLine: "ما مراقب سرمایه شما هستیم.",
      secondaryCta: "درخواست قیمت تلفنی",
    },
    productShowcase: {
      eyebrow: "محصولات",
      title: "گروه‌های کالایی فولاد و آلیاژ.",
      body: "هر گروه کالایی بخشی از خدمت مدیریت خرید آهن آساست — بررسی، مقایسه تأمین و هماهنگی تا تحویل.",
      cta: "همه محصولات",
    },
    evaluationAssurance: {
      title: "پیش از ارائه پیشنهاد، چه چیزهایی بررسی می‌شود؟",
      body: "هر درخواست از نظر مشخصات فنی، امکان تأمین، شرایط تجاری و الزامات تحویل بررسی می‌شود تا مبنای پیشنهاد برای شما روشن باشد.",
      axes: [
        {
          title: "انطباق فنی",
          body: "محصول، ابعاد، گرید، استاندارد و سایر مشخصات ضروری درخواست بررسی می‌شود. در صورت نیاز پروژه، الزامات مدارک فنی و کیفی نیز لحاظ می‌شود.",
        },
        {
          title: "امکان تأمین",
          body: "امکان تهیه مورد درخواست و محدودیت‌های مؤثر بر آن بررسی می‌شود.",
        },
        {
          title: "شرایط تجاری",
          body: "مقدار و واحد، قیمت پیشنهادی، شرایط پرداخت و مدت اعتبار پیشنهاد به‌صورت روشن مشخص می‌شود.",
        },
        {
          title: "تحویل",
          body: "مقصد، زمان موردنیاز، شرایط حمل و مبنای تحویل در صورت اثرگذاری بر پیشنهاد بررسی می‌شود.",
        },
      ],
    },
    buyerValue: {
      eyebrow: "همراهی در خرید",
      title: "آهن آسا چگونه خرید آهن را برای شما آسان می‌کند؟",
      body: "از زمان ارسال درخواست تا انجام تعهدات توافق‌شده، بررسی، هماهنگی و پیگیری خرید شما در یک مسیر مشخص ادامه پیدا می‌کند.",
      promises: [
        {
          title: "یک کارشناس واقعی، همراه خرید شماست",
          body: "درخواست شما صرفاً یک فرم یا شماره پیگیری نیست؛ یک کارشناس از زمان ارسال درخواست تا انجام تعهدات توافق‌شده، پاسخ‌گو و پیگیر آن است.",
        },
        {
          title: "اقلام متنوع، در یک مسیر هماهنگ",
          body: "فرقی نمی‌کند درخواست شما یک قلم مشخص باشد یا فهرستی از محصولات با مشخصات و شرایط متفاوت؛ بررسی و هماهنگی آن‌ها در یک مسیر منسجم انجام می‌شود.",
        },
        {
          title: "کوچک یا عمده، درخواست شما جدی است",
          body: "حجم سفارش، معیار کیفیت توجه ما نیست؛ هر درخواست با استاندارد مشخصی از بررسی، شفافیت و پیگیری دنبال می‌شود.",
        },
        {
          title: "پیگیری تا تحویل کالا ادامه دارد",
          body: "کار ما با تأیید پیشنهاد تمام نمی‌شود؛ سفارش تا انجام تعهدات توافق‌شده پیگیری می‌شود و در صورت نیاز و توافق، هماهنگی بارگیری و حمل نیز انجام خواهد شد.",
        },
      ],
    },
    purchaseProcess: {
      title: "از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟",
      steps: [
        {
          title: "ارسال درخواست",
          body: "لیست خرید یا مشخصات نیاز خود را ارسال می‌کنید.",
        },
        {
          title: "بررسی درخواست",
          body: "درخواست بررسی می‌شود و اگر اطلاعاتی برای تکمیل آن لازم باشد، با شما هماهنگ می‌کنیم.",
        },
        {
          title: "دریافت پیشنهاد",
          body: "پیشنهاد و شرایط مرتبط برای بررسی و تصمیم‌گیری شما ارائه می‌شود.",
        },
        {
          title: "تأیید و پیگیری سفارش",
          body: "پس از تأیید پیشنهاد، سفارش بر اساس شرایط توافق‌شده وارد مرحله اجرا و پیگیری می‌شود.",
        },
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
      title: "Steel procurement for projects",
      process: ["Submit request list", "Technical review", "Commercial review", "Purchase"],
      body: "Ahan Asa makes your steel purchasing process easier, clearer, and more controllable.",
      reassurance: "Sending your purchase list creates no commitment.",
      brandLine: "We protect your capital.",
      secondaryCta: "Request a phone quote",
    },
    productShowcase: {
      eyebrow: "Products",
      title: "Steel and alloy product categories.",
      body: "Every category is part of Ahan Asa's purchasing-management service — review, sourcing comparison, and coordination through to delivery.",
      cta: "All products",
    },
    evaluationAssurance: {
      title: "What is reviewed before a proposal is presented?",
      body: "Each request is reviewed for technical specifications, sourcing feasibility, commercial conditions, and delivery requirements so the basis of the proposal is clear to you.",
      axes: [
        {
          title: "Technical conformity",
          body: "The product, dimensions, grade, standard, and other essential request specifications are reviewed. Where required by the project, technical and quality documentation requirements are also considered.",
        },
        {
          title: "Sourcing feasibility",
          body: "The feasibility of sourcing the requested item and the constraints that materially affect it are reviewed.",
        },
        {
          title: "Commercial conditions",
          body: "The quantity and unit, proposed price, payment terms, and proposal validity period are stated clearly.",
        },
        {
          title: "Delivery",
          body: "Destination, required timing, transport conditions, and delivery basis are reviewed when they affect the proposal.",
        },
      ],
    },
    buyerValue: {
      eyebrow: "Support throughout your purchase",
      title: "How does Ahan Asa make buying steel easier for you?",
      body: "From submitting your request through completion of the agreed commitments, your purchase follows a clear path of review, coordination, and follow-up.",
      promises: [
        {
          title: "A real specialist stays with your request",
          body: "Your request is more than a form or tracking number. A specialist remains available to answer questions and follow it through completion of the agreed commitments.",
        },
        {
          title: "Diverse items, one coordinated path",
          body: "Whether you need one specific item or a list of products with different specifications and conditions, their review and coordination are handled through one consistent path.",
        },
        {
          title: "Small or bulk, your request matters",
          body: "Order volume does not determine the quality of our attention. Every request follows a defined standard of review, clarity, and follow-up.",
        },
        {
          title: "Follow-up continues through delivery",
          body: "Our work does not end when you approve the proposal. We follow the order through the agreed commitments and, when needed and agreed, coordinate loading and transport as well.",
        },
      ],
    },
    purchaseProcess: {
      title: "What happens from request submission through to purchase?",
      steps: [
        {
          title: "Submit a request",
          body: "You send your purchase list or the specifications of what you need.",
        },
        {
          title: "Request review",
          body: "We review your request and, if any information is needed to complete it, we coordinate with you.",
        },
        {
          title: "Receive a proposal",
          body: "A proposal and the related terms are presented for your review and decision.",
        },
        {
          title: "Approval and order follow-up",
          body: "After you approve the proposal, the order moves into execution and follow-up based on the agreed terms.",
        },
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
      title: "توريد الصلب للمشاريع",
      process: ["إرسال قائمة الطلب", "المراجعة الفنية", "المراجعة التجارية", "الشراء"],
      body: "يجعل آهن آسا مسار شراء الفولاد أسهل وأوضح وأكثر قابلية للتحكم.",
      reassurance: "إرسال قائمة الشراء لا يُنشئ أي التزام عليك.",
      brandLine: "نحن نحرص على رأس مالك.",
      secondaryCta: "طلب عرض سعر هاتفيًا",
    },
    productShowcase: {
      eyebrow: "المنتجات",
      title: "فئات منتجات الصلب والسبائك.",
      body: "كل فئة جزء من خدمة إدارة الشراء لدى آهن آسا — المراجعة ومقارنة التوريد والتنسيق حتى التسليم.",
      cta: "كل المنتجات",
    },
    evaluationAssurance: {
      title: "ما الذي تتم مراجعته قبل تقديم العرض؟",
      body: "تتم مراجعة كل طلب من حيث المواصفات الفنية، وإمكانية التوريد، والشروط التجارية، ومتطلبات التسليم، بحيث يكون أساس العرض واضحًا لكم.",
      axes: [
        {
          title: "المطابقة الفنية",
          body: "تتم مراجعة المنتج والأبعاد والدرجة والمواصفة القياسية وسائر المواصفات الأساسية للطلب. وعند حاجة المشروع، تؤخذ متطلبات الوثائق الفنية ووثائق الجودة في الاعتبار أيضًا.",
        },
        {
          title: "إمكانية التوريد",
          body: "تتم مراجعة إمكانية توفير الصنف المطلوب والقيود المؤثرة في إمكانية توريده.",
        },
        {
          title: "الشروط التجارية",
          body: "يتم توضيح الكمية والوحدة والسعر المقترح وشروط الدفع ومدة صلاحية العرض بصورة واضحة.",
        },
        {
          title: "التسليم",
          body: "تتم مراجعة الوجهة والموعد المطلوب وشروط النقل وأساس التسليم عندما تكون مؤثرة في العرض.",
        },
      ],
    },
    buyerValue: {
      eyebrow: "مرافقة خلال رحلة الشراء",
      title: "كيف تجعل آهن آسا شراء الحديد أسهل بالنسبة إليك؟",
      body: "من إرسال الطلب حتى تنفيذ الالتزامات المتفق عليها، تستمر مراجعة عملية الشراء وتنسيقها ومتابعتها ضمن مسار واضح.",
      promises: [
        {
          title: "خبير حقيقي يرافق طلبك",
          body: "طلبك ليس مجرد نموذج أو رقم متابعة؛ يبقى خبير متاحاً للإجابة عن استفساراتك ومتابعة الطلب حتى تنفيذ الالتزامات المتفق عليها.",
        },
        {
          title: "أصناف متنوعة ضمن مسار منسّق",
          body: "سواء كان طلبك لصنف واحد محدد أو لقائمة منتجات بمواصفات وشروط مختلفة، تتم مراجعتها وتنسيقها ضمن مسار واحد ومنسجم.",
        },
        {
          title: "صغيراً كان أم بالجملة، يؤخذ طلبك بجدية",
          body: "حجم الطلب لا يحدد مستوى اهتمامنا؛ فكل طلب يخضع لمعيار واضح من المراجعة والشفافية والمتابعة.",
        },
        {
          title: "تستمر المتابعة حتى استلام البضاعة",
          body: "لا ينتهي دورنا عند موافقتك على العرض؛ نتابع الطلب حتى تنفيذ الالتزامات المتفق عليها، وعند الحاجة وبالاتفاق، ننسق التحميل والنقل أيضاً.",
        },
      ],
    },
    purchaseProcess: {
      title: "ماذا يحدث من إرسال الطلب حتى الشراء؟",
      steps: [
        {
          title: "إرسال الطلب",
          body: "ترسل قائمة مشترياتك أو مواصفات احتياجك.",
        },
        {
          title: "مراجعة الطلب",
          body: "تتم مراجعة طلبك، وإذا كانت هناك معلومات لازمة لاستكماله، نتواصل معك لاستكمالها.",
        },
        {
          title: "استلام العرض",
          body: "يُقدَّم لك العرض والشروط المرتبطة به لمراجعته واتخاذ القرار.",
        },
        {
          title: "التأكيد ومتابعة الطلب",
          body: "بعد تأكيدك للعرض، ينتقل الطلب إلى مرحلة التنفيذ والمتابعة وفقًا للشروط المتفق عليها.",
        },
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
