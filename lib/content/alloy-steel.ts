import type { Locale } from "../../config/locales.ts";
import { localizeNumbers, ltrParentheses } from "./locale-digits.ts";
import { ALLOY_GRADE_SLUGS, ALLOY_GRADES, ALLOY_STEEL_ROUTE, type AlloyGradeGroup, type AlloyGradeSlug } from "../alloy/grades.ts";

export { ALLOY_STEEL_ROUTE };

/**
 * W43 (owner, 2026-10-24: W39 §9 approved as recommended — D-ALLOY-1 wave-1 grades, D-ALLOY-5 price on
 * request, D-ALLOY-7 hub + 8 guides in fa/en/ar) — `/alloy-steel` and one guide per grade.
 *
 * Same rules as the raw-material pages (lib/content/raw-materials.ts), checked by
 * lib/static/alloy-pages-w43.test.ts and, on the built pages, by the price gate:
 * - no price, amount or currency anywhere, and no «قیمت» / price / سعر in a title or meta; every page carries
 *   the «قیمت با استعلام» banner and the RFQ link (lib/alloy/rfq.ts);
 * - standard-level facts only (W39 §3.1 and the standards and datasheets it cites: EN ISO 683-1/-2/-3,
 *   EN ISO 4957): names and equivalents, composition ranges, delivery state, uses, the size ranges the market
 *   offers (never stock), and a nominal weight table at the grade's density;
 * - no mill, origin country, supplier, stock or delivery-time claim; trade names (SPK, «آموتیت») only as the
 *   market's name for the grade (W39 §6.4).
 *
 * Titles: the W39 §7 table (market name first, then W.Nr; ≤ 60 characters before the layout's brand suffix).
 * ar titles say «طلب التوريد» where the table had «طلب السعر»: no price word in a title while no price is shown.
 */
export const ALLOY_STEEL_LOCALES: readonly Locale[] = ["fa", "en", "ar"];
export const alloyGradePath = (slug: AlloyGradeSlug) => `${ALLOY_STEEL_ROUTE}/${slug}`;

/** The content date of the guides (Article `datePublished`/`dateModified`); move it when the copy changes. */
export const ALLOY_GUIDES_UPDATED = "2026-10-24";

export type AlloyFormKind = "round" | "peeled" | "square" | "flat" | "plate";

/** Language-neutral facts per grade. Digits are ASCII here and localized when rendered (localizeNumbers). */
export interface AlloyGradeFacts {
  /** Element and range in mass %, as the standard gives it. */
  chemistry: ReadonlyArray<readonly [string, string]>;
  /** Delivery forms and the size range the market offers (not a stock list). */
  forms: ReadonlyArray<{ kind: AlloyFormKind; range: string }>;
  /** Sizes of the nominal weight table (mm): round Ø, square side, flat b × t, plate t. */
  weights: { round?: readonly number[]; square?: readonly number[]; flat?: ReadonlyArray<readonly [number, number]>; plate?: readonly number[] };
  related: readonly AlloyGradeSlug[];
  /** Words an article title must contain to be listed as related (case-insensitive). */
  articleTokens: readonly string[];
}

export const ALLOY_FACTS: Readonly<Record<AlloyGradeSlug, AlloyGradeFacts>> = {
  ck45: {
    chemistry: [["C", "0.42–0.50"], ["Si", "≤ 0.40"], ["Mn", "0.50–0.80"], ["Cr", "≤ 0.40"], ["Mo", "≤ 0.10"], ["Ni", "≤ 0.40"]],
    forms: [
      { kind: "round", range: "Ø 8–630 mm" },
      { kind: "peeled", range: "L 6 m" },
      { kind: "square", range: "20–60 mm" },
      { kind: "flat", range: "235×1555 … 600×1180 mm" },
      { kind: "plate", range: "t 3–80 mm · 2000×6000 mm" },
    ],
    weights: { round: [10, 20, 30, 40, 50, 60, 80, 100, 150, 200, 300], square: [20, 30, 40, 50, 60], plate: [10, 15, 20, 30, 40, 50, 80] },
    related: ["mo40-42crmo4", "semante-16mncr5", "vcn150-34crnimo6"],
    articleTokens: ["CK45", "1.1191", "آلیاژی"],
  },
  "mo40-42crmo4": {
    chemistry: [["C", "0.38–0.45"], ["Si", "≤ 0.40"], ["Mn", "0.60–0.90"], ["Cr", "0.90–1.20"], ["Mo", "0.15–0.30"]],
    forms: [
      { kind: "round", range: "Ø 10–1000 mm" },
      { kind: "flat", range: "170×170 … 610×1200 mm" },
      { kind: "plate", range: "t 10–30 mm" },
    ],
    weights: { round: [20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400], flat: [[170, 170], [200, 400], [300, 600], [610, 1200]], plate: [10, 15, 20, 25, 30] },
    related: ["ck45", "vcn150-34crnimo6", "1-2312"],
    articleTokens: ["MO40", "42CrMo4", "4140", "1.7225", "آلیاژی"],
  },
  "vcn150-34crnimo6": {
    chemistry: [["C", "0.30–0.38"], ["Si", "≤ 0.40"], ["Mn", "0.50–0.80"], ["Cr", "1.30–1.70"], ["Mo", "0.15–0.30"], ["Ni", "1.30–1.70"]],
    forms: [{ kind: "round", range: "Ø 20–400 mm" }],
    weights: { round: [20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400] },
    related: ["mo40-42crmo4", "semante-16mncr5", "ck45"],
    articleTokens: ["VCN", "34CrNiMo6", "4340", "1.6582", "آلیاژی"],
  },
  "semante-16mncr5": {
    chemistry: [["C", "0.14–0.19"], ["Si", "≤ 0.40"], ["Mn", "1.00–1.30"], ["Cr", "0.80–1.10"]],
    forms: [{ kind: "round", range: "Ø 20–850 mm" }],
    weights: { round: [20, 30, 40, 50, 60, 80, 100, 150, 200, 300] },
    related: ["ck45", "mo40-42crmo4", "vcn150-34crnimo6"],
    articleTokens: ["سمانته", "16MnCr5", "7131", "آلیاژی"],
  },
  "1-2312": {
    chemistry: [["C", "0.35–0.45"], ["Si", "0.30–0.50"], ["Mn", "1.40–1.60"], ["Cr", "1.80–2.00"], ["Mo", "0.15–0.25"], ["S", "0.05–0.10"]],
    forms: [
      { kind: "flat", range: "260×310 … 620×620 mm" },
      { kind: "round", range: "Ø 200–350 mm" },
    ],
    weights: { flat: [[260, 310], [300, 500], [400, 600], [620, 620]], round: [200, 250, 300, 350] },
    related: ["mo40-42crmo4", "1-2344-h13", "spk-1-2080"],
    articleTokens: ["2312", "P20", "قالب"],
  },
  "1-2344-h13": {
    chemistry: [["C", "0.35–0.42"], ["Si", "0.80–1.20"], ["Mn", "0.25–0.50"], ["Cr", "4.80–5.50"], ["Mo", "1.20–1.50"], ["V", "0.85–1.15"]],
    forms: [{ kind: "round", range: "Ø 20–300 mm" }],
    weights: { round: [20, 30, 40, 50, 60, 80, 100, 150, 200, 300] },
    related: ["1-2312", "spk-1-2080", "1-2510-amutit"],
    articleTokens: ["2344", "H13", "گرمکار"],
  },
  "spk-1-2080": {
    chemistry: [["C", "1.90–2.20"], ["Si", "0.10–0.60"], ["Mn", "0.20–0.60"], ["Cr", "11.00–13.00"]],
    forms: [
      { kind: "round", range: "Ø 30–200 mm" },
      { kind: "flat", range: "10×52 … 100×400 mm" },
    ],
    weights: { round: [30, 40, 50, 60, 80, 100, 150, 200], flat: [[10, 52], [20, 100], [50, 200], [100, 400]] },
    related: ["1-2510-amutit", "1-2344-h13", "1-2312"],
    articleTokens: ["SPK", "2080", "D3", "سردکار"],
  },
  "1-2510-amutit": {
    chemistry: [["C", "0.90–1.05"], ["Si", "0.10–0.40"], ["Mn", "1.00–1.20"], ["Cr", "0.50–0.70"], ["V", "0.05–0.15"], ["W", "0.50–0.70"]],
    forms: [{ kind: "round", range: "Ø 57–100+ mm" }],
    weights: { round: [60, 70, 80, 90, 100] },
    related: ["spk-1-2080", "1-2344-h13", "1-2312"],
    articleTokens: ["2510", "O1", "آموتیت"],
  },
};

export interface AlloyGradeCopy {
  /** Short name in running text and FAQ questions («CK45», «گرمکار 2344»). */
  short: string;
  /** Card and breadcrumb label. */
  name: string;
  /** The market's name for the grade, shown in the equivalents table. */
  market: string;
  title: string;
  h1: string;
  description: string;
  /** One line on the hub card. */
  summary: string;
  intro: readonly string[];
  uses: readonly string[];
  delivery: string;
  heatTreatment: string;
  /** The grade's own FAQ item; the common ones (what, density, equivalents, quote) are built by alloyFaq. */
  faq: { q: string; a: string };
}

const GRADE_COPY: Readonly<Record<AlloyGradeSlug, Record<Locale, AlloyGradeCopy>>> = {
  ck45: {
    fa: {
      short: "CK45",
      name: "CK45 (1.1191)",
      market: "CK45، میلگرد آلیاژی CK45، شفت CK45",
      title: "فولاد CK45 (1.1191): مشخصات، سایز و استعلام خرید",
      h1: "فولاد CK45 (1.1191 / C45E)",
      description: "مشخصات فولاد CK45 (1.1191، AISI 1045)، کاربرد، سایزهای گرد، چهارپهلو و ورق، حالت تحویل و جدول وزن؛ ارسال درخواست خرید با سایز و طول برش.",
      summary: "فولاد کربنی بهسازی‌پذیر برای شفت، پین و چرخ‌دنده؛ گرد، شفت، چهارپهلو، تسمه و ورق.",
      intro: [
        "CK45 نام بازاری فولاد C45E با شماره مواد 1.1191 است: فولاد کربنی بهسازی‌پذیر با حدود ۰٫۴۵ درصد کربن طبق استاندارد EN ISO 683-1. معادل آمریکایی نزدیک آن AISI 1045 است.",
        "طبق EN این فولاد غیرآلیاژی است، اما بازار ایران آن را کنار فولادهای آلیاژی و با نام «میلگرد آلیاژی CK45» معامله می‌کند؛ به همین دلیل در این دسته آمده است. CK45 پس از بهسازی (سخت‌کاری و بازپخت) یا سخت‌کاری سطحی القایی برای قطعات با تنش متوسط به کار می‌رود.",
      ],
      uses: ["شفت و محور ماشین‌آلات", "پین، پیچ و مهره‌های صنعتی", "چرخ‌دنده و قطعات با تنش متوسط", "قطعات عمومی ماشین‌کاری"],
      delivery: "معمولاً نوردگرم یا نرماله تحویل می‌شود؛ شفت‌ها پوست‌کنی و تراشکاری‌شده («تک‌پولیش») و ورق به صورت فابریک. سختی نهایی با بهسازی یا سخت‌کاری القایی به دست می‌آید و به قطر قطعه بستگی دارد.",
      heatTreatment: "CK45 را می‌توان نرماله یا بهسازی کرد (سخت‌کاری در آب یا روغن و سپس بازپخت) یا سطح آن را به روش القایی یا شعله سخت کرد. سختی‌پذیری آن محدود است و در قطرهای بزرگ مغز قطعه نرم‌تر از سطح می‌ماند؛ برای مقاطع بزرگ و پرتنش معمولاً MO40 انتخاب می‌شود.",
      faq: { q: "تفاوت CK45 با MO40 چیست؟", a: "CK45 فولاد کربنی است و MO40 (42CrMo4) کروم و مولیبدن دارد؛ MO40 عمیق‌تر سخت می‌شود و در مقاطع بزرگ استحکام بیشتری می‌گیرد، پس برای شفت‌ها و قطعات پرتنش‌تر به کار می‌رود." },
    },
    en: {
      short: "CK45",
      name: "CK45 (1.1191)",
      market: "CK45, CK45 alloy bar, CK45 shaft",
      title: "CK45 / C45E (1.1191, AISI 1045) Steel — Specs & Sizes",
      h1: "CK45 steel (1.1191 / C45E)",
      description: "CK45 (C45E, 1.1191, AISI 1045): chemistry, uses, round, square and plate sizes, delivery state and a weight table. Request a quote with size and cut length.",
      summary: "Medium-carbon steel for quenching and tempering: shafts, pins and gears; round, peeled shaft, square, forged flat and plate.",
      intro: [
        "CK45 is the Iranian market name of C45E, material number 1.1191: a medium-carbon steel for quenching and tempering with about 0.45 % carbon, to EN ISO 683-1. Its closest American equivalent is AISI 1045.",
        "By EN it is a non-alloy steel, but the Iranian market trades it next to alloy steels, as 'CK45 alloy bar', which is why it is listed here. After quenching and tempering, or induction hardening of the surface, it is used for medium-stress parts.",
      ],
      uses: ["Machine shafts and axles", "Pins, bolts and industrial fasteners", "Gears and medium-stress parts", "General machined parts"],
      delivery: "Usually supplied hot-rolled or normalised; shafts are peeled and turned, plate as mill plate. The final hardness comes from quenching and tempering or induction hardening and depends on the section size.",
      heatTreatment: "CK45 can be normalised, quenched (water or oil) and tempered, or surface-hardened by induction or flame. Its hardenability is limited, so in large diameters the core stays softer than the surface; for large, highly stressed sections MO40 is usually chosen.",
      faq: { q: "What is the difference between CK45 and MO40?", a: "CK45 is a carbon steel; MO40 (42CrMo4) adds chromium and molybdenum, so it hardens deeper and reaches higher strength in large sections. MO40 is used for more highly stressed shafts and parts." },
    },
    ar: {
      short: "CK45",
      name: "CK45 (1.1191)",
      market: "CK45، قضبان CK45 السبائكية",
      title: "فولاذ CK45 ‏(1.1191): المواصفات والمقاسات وطلب التوريد",
      h1: "فولاذ CK45 ‏(1.1191 / C45E)",
      description: "مواصفات فولاذ CK45 ‏(C45E، 1.1191، AISI 1045): التركيب والاستخدامات ومقاسات القضبان المستديرة والمربعة والألواح وجدول الوزن. أرسل طلبك بالمقاس وطول القص.",
      summary: "فولاذ كربوني للتقسية والمراجعة للأعمدة والمسامير والتروس؛ قضبان مستديرة ومربعة ومسطحات وألواح.",
      intro: [
        "‏CK45 هو الاسم التجاري في السوق الإيرانية للفولاذ C45E برقم المادة 1.1191: فولاذ كربوني متوسط الكربون للتقسية والمراجعة بنحو 0.45 % كربون وفق المعيار EN ISO 683-1، ومكافئه الأمريكي الأقرب AISI 1045.",
        "وفق EN هو فولاذ غير سبائكي، لكن السوق الإيرانية تتداوله إلى جانب الفولاذ السبائكي باسم «قضبان CK45 السبائكية»، لذلك أُدرج هنا. ويُستخدم بعد التقسية والمراجعة أو التصليد السطحي بالحث للقطع ذات الإجهاد المتوسط.",
      ],
      uses: ["أعمدة ومحاور الآلات", "المسامير والبراغي الصناعية", "التروس والقطع ذات الإجهاد المتوسط", "قطع التشغيل العامة"],
      delivery: "يُسلَّم عادةً مدرفلًا على الساخن أو مُطبَّعًا؛ والأعمدة مقشورة ومخروطة، والألواح بحالة المصنع. تتحدد الصلادة النهائية بالتقسية والمراجعة أو بالتصليد بالحث وتعتمد على قطر القطعة.",
      heatTreatment: "يمكن تطبيع CK45 أو تقسيته (بالماء أو الزيت) ثم مراجعته، أو تصليد سطحه بالحث أو باللهب. قابليته للتصليد محدودة، فيبقى القلب في الأقطار الكبيرة أقل صلادة من السطح؛ ولذلك يُختار MO40 عادةً للمقاطع الكبيرة عالية الإجهاد.",
      faq: { q: "ما الفرق بين CK45 وMO40؟", a: "‏CK45 فولاذ كربوني، أما MO40 ‏(42CrMo4) فيحتوي على الكروم والموليبدنوم، فيتصلد إلى عمق أكبر ويبلغ مقاومة أعلى في المقاطع الكبيرة، ويُستخدم للأعمدة والقطع الأعلى إجهادًا." },
    },
  },
  "mo40-42crmo4": {
    fa: {
      short: "MO40",
      name: "MO40 (1.7225)",
      market: "MO40، فولاد 7225",
      title: "فولاد MO40 (1.7225 / 4140): مشخصات و استعلام خرید",
      h1: "فولاد MO40 (1.7225 / 42CrMo4)",
      description: "مشخصات فولاد MO40 (1.7225، 42CrMo4، AISI 4140)، کاربرد، سایزهای گرد، تسمه و ورق، حالت تحویل و جدول وزن؛ ارسال درخواست خرید با سایز و طول برش.",
      summary: "فولاد کروم‌مولیبدن بهسازی برای شفت، محور و پیچ‌های پرتنش؛ گرد، تسمه آهنگری و ورق.",
      intro: [
        "MO40 نام بازاری فولاد 42CrMo4 با شماره مواد 1.7225 است: فولاد بهسازی کروم‌مولیبدن‌دار طبق استاندارد EN ISO 683-2 که معادل آمریکایی نزدیک آن AISI 4140 است.",
        "کروم و مولیبدن سختی‌پذیری آن را از فولادهای کربنی مانند CK45 بیشتر می‌کنند؛ بنابراین مقاطع بزرگ‌تر هم پس از بهسازی استحکام و چقرمگی خوبی دارند. MO40 از فولادهای بهسازی پرمصرف بازار ایران است.",
      ],
      uses: ["شفت‌ها و محورهای پرتنش", "اکسل و قطعات انتقال قدرت", "پیچ و مهره‌های با استحکام بالا", "صفحه‌ها و بدنه قالب"],
      delivery: "نوردگرم یا آنیل‌شده عرضه می‌شود و برای ساخت قالب اغلب بهسازی‌شده (Q+T) تحویل می‌گیرد. سختی پس از بهسازی به قطر مقطع و دمای بازپخت بستگی دارد؛ مقدار مورد نیاز را در درخواست بنویسید.",
      heatTreatment: "MO40 معمولاً در روغن سخت و سپس بازپخت (بهسازی) می‌شود و سطح آن را می‌توان القایی سخت یا نیتراته کرد. قطعات جوشکاری‌شده پیش‌گرم و عملیات حرارتی پس از جوش لازم دارند.",
      faq: { q: "MO40 همان 4140 است؟", a: "MO40 (42CrMo4، 1.7225) معادل نزدیک AISI 4140 است و ترکیب آن‌ها تقریباً یکسان است، اما حدود عناصر در دو استاندارد کمی فرق دارد؛ اگر نقشه شما یکی از آن‌ها را الزام کرده، همان را در درخواست بنویسید." },
    },
    en: {
      short: "MO40",
      name: "MO40 (1.7225)",
      market: "MO40, 7225",
      title: "42CrMo4 / MO40 (1.7225, AISI 4140) Bar — Specs & RFQ",
      h1: "MO40 steel (1.7225 / 42CrMo4)",
      description: "MO40 (42CrMo4, 1.7225, AISI 4140): chemistry, uses, round, forged flat and plate sizes, delivery state and a weight table. Request a quote with size and cut length.",
      summary: "Chromium-molybdenum steel for quenching and tempering: highly stressed shafts, axles and bolts; round, forged flat and plate.",
      intro: [
        "MO40 is the Iranian market name of 42CrMo4, material number 1.7225: a chromium-molybdenum steel for quenching and tempering to EN ISO 683-2. Its closest American equivalent is AISI 4140.",
        "Chromium and molybdenum give it a higher hardenability than carbon steels such as CK45, so larger sections still reach good strength and toughness after quenching and tempering. It is one of the most traded heat-treatable steels in the Iranian market.",
      ],
      uses: ["Highly stressed shafts and spindles", "Axles and power-transmission parts", "High-strength bolts and nuts", "Mould bases and holder plates"],
      delivery: "Supplied hot-rolled or annealed, and for mould making often quenched and tempered (Q+T). The hardness after quenching and tempering depends on the section size and the tempering temperature; state what you need in the request.",
      heatTreatment: "MO40 is usually oil-quenched and tempered; its surface can be induction-hardened or nitrided. Welded parts need preheating and post-weld heat treatment.",
      faq: { q: "Is MO40 the same as 4140?", a: "MO40 (42CrMo4, 1.7225) is the close equivalent of AISI 4140 and their compositions are almost the same, but the element limits of the two standards differ slightly. If your drawing requires one of them, name it in the request." },
    },
    ar: {
      short: "MO40",
      name: "MO40 (1.7225)",
      market: "MO40، 7225",
      title: "فولاذ MO40 ‏(1.7225 / 4140): المواصفات وطلب التوريد",
      h1: "فولاذ MO40 ‏(1.7225 / 42CrMo4)",
      description: "مواصفات فولاذ MO40 ‏(42CrMo4، 1.7225، AISI 4140): التركيب والاستخدامات ومقاسات القضبان المستديرة والمسطحات المطروقة والألواح وجدول الوزن. أرسل طلبك بالمقاس.",
      summary: "فولاذ كروم موليبدنوم للتقسية والمراجعة للأعمدة والمحاور والبراغي عالية الإجهاد؛ قضبان مستديرة ومسطحات مطروقة وألواح.",
      intro: [
        "‏MO40 هو الاسم التجاري في السوق الإيرانية للفولاذ 42CrMo4 برقم المادة 1.7225: فولاذ كروم موليبدنوم للتقسية والمراجعة وفق المعيار EN ISO 683-2، ومكافئه الأمريكي الأقرب AISI 4140.",
        "يرفع الكروم والموليبدنوم قابليته للتصليد مقارنةً بالفولاذ الكربوني مثل CK45، فتبلغ المقاطع الأكبر مقاومة ومتانة جيدتين بعد التقسية والمراجعة. وهو من أكثر أنواع فولاذ التقسية تداولًا في السوق الإيرانية.",
      ],
      uses: ["الأعمدة والمحاور عالية الإجهاد", "المحاور وقطع نقل الحركة", "البراغي والصواميل عالية المقاومة", "قواعد القوالب وألواح التثبيت"],
      delivery: "يُسلَّم مدرفلًا على الساخن أو مُلدَّنًا، ولصناعة القوالب غالبًا مُقسّى ومُراجَعًا (Q+T). تعتمد الصلادة بعد التقسية والمراجعة على قطر المقطع ودرجة حرارة المراجعة؛ اذكر المطلوب في طلبك.",
      heatTreatment: "يُقسّى MO40 عادةً بالزيت ثم يُراجَع، ويمكن تصليد سطحه بالحث أو بالنيترة. وتحتاج القطع الملحومة إلى تسخين مسبق ومعالجة حرارية بعد اللحام.",
      faq: { q: "هل MO40 هو نفسه 4140؟", a: "‏MO40 ‏(42CrMo4، 1.7225) هو المكافئ القريب لـ AISI 4140 وتركيبهما متقارب جدًا، لكن حدود العناصر في المعيارين تختلف قليلًا. إذا اشترط رسمك أحدهما فاذكره في الطلب." },
    },
  },
  "vcn150-34crnimo6": {
    fa: {
      short: "VCN150",
      name: "VCN150 (1.6582)",
      market: "VCN150، VCN",
      title: "فولاد VCN150 (1.6582 / 4340): مشخصات و استعلام",
      h1: "فولاد VCN150 (1.6582 / 34CrNiMo6)",
      description: "مشخصات فولاد VCN150 (1.6582، 34CrNiMo6، AISI 4340)، کاربرد، سایزهای گرد، حالت تحویل و جدول وزن؛ ارسال درخواست خرید با قطر، طول برش و حالت تحویل.",
      summary: "فولاد کروم‌نیکل‌مولیبدن بهسازی برای شفت‌ها، چرخ‌دنده‌ها و میل‌لنگ‌های سنگین؛ گرد.",
      intro: [
        "VCN150 نام بازاری فولاد 34CrNiMo6 با شماره مواد 1.6582 است: فولاد بهسازی کروم‌نیکل‌مولیبدن‌دار طبق EN ISO 683-2 که معادل آمریکایی نزدیک آن AISI 4340 است.",
        "نیکل در کنار کروم و مولیبدن سختی‌پذیری بسیار بالا و چقرمگی خوب در مقاطع بزرگ می‌دهد؛ به همین دلیل برای قطعات سنگین‌تر از محدوده MO40 به کار می‌رود. VCN200 (1.6580، 30CrNiMo8) گرید نزدیک دیگری با همین کاربرد است.",
      ],
      uses: ["شفت‌های سنگین و پرتنش", "چرخ‌دنده‌های بزرگ", "میل‌لنگ و قطعات انتقال قدرت سنگین", "قطعات زیر ضربه و بار متناوب"],
      delivery: "آنیل‌شده یا بهسازی‌شده (Q+T) عرضه می‌شود. برای قطعات بزرگ، حالت تحویل و سختی یا استحکام مورد نیاز را در درخواست مشخص کنید.",
      heatTreatment: "VCN150 معمولاً در روغن سخت و سپس بازپخت می‌شود و قابلیت نیتراته شدن دارد. سختی‌پذیری بالای آن یعنی مغز مقاطع بزرگ پس از بهسازی یکنواخت‌تر از MO40 سخت می‌شود.",
      faq: { q: "تفاوت VCN150 و MO40 چیست؟", a: "هر دو فولاد بهسازی‌اند، اما VCN150 (34CrNiMo6) نیکل هم دارد؛ عمیق‌تر سخت می‌شود و در مقاطع بزرگ چقرمه‌تر است، پس برای قطعات سنگین‌تر و زیر ضربه انتخاب می‌شود." },
    },
    en: {
      short: "VCN150",
      name: "VCN150 (1.6582)",
      market: "VCN150, VCN",
      title: "34CrNiMo6 / VCN150 (1.6582, AISI 4340) — Specs & RFQ",
      h1: "VCN150 steel (1.6582 / 34CrNiMo6)",
      description: "VCN150 (34CrNiMo6, 1.6582, AISI 4340): chemistry, uses, round bar sizes, delivery state and a weight table. Request a quote with diameter, cut length and delivery state.",
      summary: "Chromium-nickel-molybdenum steel for quenching and tempering: heavy-duty shafts, gears and crankshafts; round bar.",
      intro: [
        "VCN150 is the Iranian market name of 34CrNiMo6, material number 1.6582: a chromium-nickel-molybdenum steel for quenching and tempering to EN ISO 683-2. Its closest American equivalent is AISI 4340.",
        "Nickel, together with chromium and molybdenum, gives a very high hardenability and good toughness in large sections, so it is used for parts heavier than the MO40 range. VCN200 (1.6580, 30CrNiMo8) is a close grade for the same uses.",
      ],
      uses: ["Heavy-duty, highly stressed shafts", "Large gears", "Crankshafts and heavy power-transmission parts", "Parts under impact and alternating load"],
      delivery: "Supplied annealed or quenched and tempered (Q+T). For large parts, state the delivery state and the hardness or strength you need in the request.",
      heatTreatment: "VCN150 is usually oil-quenched and tempered and can be nitrided. Its high hardenability means the core of large sections hardens more evenly than MO40 after quenching and tempering.",
      faq: { q: "What is the difference between VCN150 and MO40?", a: "Both are steels for quenching and tempering, but VCN150 (34CrNiMo6) also contains nickel. It hardens deeper and is tougher in large sections, so it is chosen for heavier parts and parts under impact." },
    },
    ar: {
      short: "VCN150",
      name: "VCN150 (1.6582)",
      market: "VCN150، VCN",
      title: "فولاذ VCN150 ‏(1.6582): المواصفات وطلب التوريد",
      h1: "فولاذ VCN150 ‏(1.6582 / 34CrNiMo6)",
      description: "مواصفات فولاذ VCN150 ‏(34CrNiMo6، 1.6582، AISI 4340): التركيب والاستخدامات ومقاسات القضبان المستديرة وحالة التسليم وجدول الوزن. أرسل طلبك بالقطر وطول القص.",
      summary: "فولاذ كروم نيكل موليبدنوم للتقسية والمراجعة للأعمدة والتروس وأعمدة المرفق الثقيلة؛ قضبان مستديرة.",
      intro: [
        "‏VCN150 هو الاسم التجاري في السوق الإيرانية للفولاذ 34CrNiMo6 برقم المادة 1.6582: فولاذ كروم نيكل موليبدنوم للتقسية والمراجعة وفق EN ISO 683-2، ومكافئه الأمريكي الأقرب AISI 4340.",
        "يمنح النيكل مع الكروم والموليبدنوم قابلية تصليد عالية جدًا ومتانة جيدة في المقاطع الكبيرة، لذلك يُستخدم لقطع أثقل من نطاق MO40. والدرجة VCN200 ‏(1.6580، 30CrNiMo8) درجة قريبة للاستخدامات نفسها.",
      ],
      uses: ["الأعمدة الثقيلة عالية الإجهاد", "التروس الكبيرة", "أعمدة المرفق وقطع نقل الحركة الثقيلة", "القطع المعرضة للصدمات والأحمال المتناوبة"],
      delivery: "يُسلَّم مُلدَّنًا أو مُقسّى ومُراجَعًا (Q+T). للقطع الكبيرة اذكر حالة التسليم والصلادة أو المقاومة المطلوبة في الطلب.",
      heatTreatment: "يُقسّى VCN150 عادةً بالزيت ثم يُراجَع، ويمكن نيترته. وتعني قابليته العالية للتصليد أن قلب المقاطع الكبيرة يتصلد بانتظام أكبر من MO40 بعد التقسية والمراجعة.",
      faq: { q: "ما الفرق بين VCN150 وMO40؟", a: "كلاهما فولاذ للتقسية والمراجعة، لكن VCN150 ‏(34CrNiMo6) يحتوي أيضًا على النيكل، فيتصلد إلى عمق أكبر ويكون أمتن في المقاطع الكبيرة، ويُختار للقطع الأثقل والمعرضة للصدمات." },
    },
  },
  "semante-16mncr5": {
    fa: {
      short: "سمانته 7131",
      name: "سمانته 7131 (1.7131)",
      market: "سمانته 7131، فولاد 7131",
      title: "فولاد سمانته 7131 (16MnCr5): مشخصات و استعلام خرید",
      h1: "فولاد سمانته 7131 (1.7131 / 16MnCr5)",
      description: "مشخصات فولاد سمانته 7131 (1.7131، 16MnCr5، AISI 5115)، کاربرد، سایزهای گرد، کربن‌دهی و جدول وزن؛ ارسال درخواست خرید با قطر، طول برش و حالت تحویل.",
      summary: "فولاد کربن‌دهی (سمانته) منگنز‌کروم برای چرخ‌دنده، پین و بادامک؛ گرد.",
      intro: [
        "«سمانته» نامی است که بازار ایران به فولادهای کربن‌دهی (Case-hardening) می‌دهد و 7131 از رایج‌ترین آن‌هاست: فولاد 16MnCr5 با شماره مواد 1.7131 طبق EN ISO 683-3 که معادل آمریکایی نزدیک آن AISI 5115 است.",
        "این فولاد کربن کمی دارد؛ قطعه پس از ماشین‌کاری کربن‌دهی و سخت می‌شود تا سطحی سخت و مقاوم به سایش روی مغزی چقرمه به دست آید. سمانته‌های نیکل‌دار مانند 1.5920 (18CrNi8) و 1.6587 (18CrNiMo7-6) برای چرخ‌دنده‌های سنگین‌ترند و گریدهای جداگانه‌ای هستند.",
      ],
      uses: ["چرخ‌دنده‌های گیربکس و انتقال قدرت", "پین، گژن‌پین و بوش", "بادامک و میل‌بادامک", "قطعات با سطح مقاوم به سایش و مغز چقرمه"],
      delivery: "معمولاً آنیل‌شده و آماده ماشین‌کاری عرضه می‌شود. سختی نهایی سطح با کربن‌دهی، سخت‌کاری و بازپخت در کارگاه عملیات حرارتی به دست می‌آید و عمق لایه را طراح قطعه تعیین می‌کند.",
      heatTreatment: "مسیر معمول: ماشین‌کاری در حالت آنیل، کربن‌دهی (گازی یا جامد)، سخت‌کاری مستقیم یا دوباره و بازپخت در دمای پایین. عمق لایه کربن‌دهی و سختی سطح را در نقشه قطعه مشخص کنید.",
      faq: { q: "سمانته یعنی چه؟", a: "در بازار ایران «سمانته» به فولادهای کم‌کربنی گفته می‌شود که برای کربن‌دهی (سمانتاسیون) ساخته شده‌اند؛ پس از کربن‌دهی و سخت‌کاری، سطح سخت و مغز چقرمه می‌ماند. 16MnCr5 (1.7131) از رایج‌ترین آن‌هاست." },
    },
    en: {
      short: "16MnCr5",
      name: "16MnCr5 (1.7131)",
      market: "semante 7131, 7131",
      title: "16MnCr5 Case-Hardening Steel (1.7131) — Specs & RFQ",
      h1: "16MnCr5 case-hardening steel (1.7131)",
      description: "16MnCr5 (1.7131, AISI 5115) case-hardening steel, sold in Iran as 'semante 7131': chemistry, uses, round sizes and a weight table. Request a quote with diameter.",
      summary: "Manganese-chromium case-hardening steel for gears, pins and cams; round bar.",
      intro: [
        "In the Iranian market 'semante' is the name for case-hardening steels, and 7131 is one of the most common: 16MnCr5, material number 1.7131, to EN ISO 683-3. Its closest American equivalent is AISI 5115.",
        "It is a low-carbon steel: after machining, the part is carburised and hardened, which gives a hard, wear-resistant surface over a tough core. Nickel case-hardening steels such as 1.5920 (18CrNi8) and 1.6587 (18CrNiMo7-6) are for heavier gears and are separate grades.",
      ],
      uses: ["Gearbox and power-transmission gears", "Pins, gudgeon pins and bushes", "Cams and camshafts", "Parts that need a wear-resistant surface and a tough core"],
      delivery: "Usually supplied annealed, ready for machining. The final surface hardness comes from carburising, hardening and tempering at the heat-treatment shop, and the case depth is set by the part designer.",
      heatTreatment: "The usual route: machining in the annealed state, carburising (gas or pack), direct or re-hardening, and low-temperature tempering. Specify the case depth and surface hardness on the part drawing.",
      faq: { q: "What does 'semante' mean?", a: "In the Iranian market 'semante' means a low-carbon steel made for carburising (cementation). After carburising and hardening the surface is hard and the core stays tough. 16MnCr5 (1.7131) is one of the most common." },
    },
    ar: {
      short: "16MnCr5",
      name: "16MnCr5 (1.7131)",
      market: "سمانته 7131",
      title: "فولاذ التصليد السطحي 16MnCr5 ‏(1.7131): المواصفات",
      h1: "فولاذ التصليد السطحي 16MnCr5 ‏(1.7131)",
      description: "مواصفات فولاذ التصليد السطحي 16MnCr5 ‏(1.7131، AISI 5115): التركيب والاستخدامات ومقاسات القضبان المستديرة والكربنة وجدول الوزن. أرسل طلبك بالقطر وطول القص.",
      summary: "فولاذ منغنيز كروم للتصليد السطحي للتروس والمسامير والكامات؛ قضبان مستديرة.",
      intro: [
        "يُعرف فولاذ التصليد السطحي في السوق الإيرانية باسم «سمانته»، و7131 من أكثرها شيوعًا: الفولاذ 16MnCr5 برقم المادة 1.7131 وفق EN ISO 683-3، ومكافئه الأمريكي الأقرب AISI 5115.",
        "هو فولاذ منخفض الكربون: بعد التشغيل تُكربَن القطعة وتُقسّى، فينتج سطح صلد مقاوم للتآكل فوق قلب متين. أما فولاذ التصليد السطحي المحتوي على النيكل مثل 1.5920 ‏(18CrNi8) و1.6587 ‏(18CrNiMo7-6) فهو للتروس الأثقل ودرجات مستقلة.",
      ],
      uses: ["تروس علب السرعة ونقل الحركة", "المسامير ومسامير المكبس والجلب", "الكامات وأعمدة الكامات", "القطع التي تحتاج سطحًا مقاومًا للتآكل وقلبًا متينًا"],
      delivery: "يُسلَّم عادةً مُلدَّنًا وجاهزًا للتشغيل. تتحقق صلادة السطح النهائية بالكربنة والتقسية والمراجعة في ورشة المعالجة الحرارية، ويحدد مصمم القطعة عمق الطبقة.",
      heatTreatment: "المسار المعتاد: التشغيل في الحالة الملدنة، ثم الكربنة (غازية أو صلبة)، ثم التقسية المباشرة أو إعادة التقسية، ثم المراجعة بدرجة حرارة منخفضة. حدّد عمق الطبقة المكربنة وصلادة السطح في رسم القطعة.",
      faq: { q: "ما المقصود بفولاذ «سمانته»؟", a: "في السوق الإيرانية تعني «سمانته» فولاذًا منخفض الكربون مخصصًا للكربنة (السمنتة). بعد الكربنة والتقسية يصبح السطح صلدًا ويبقى القلب متينًا. و16MnCr5 ‏(1.7131) من أكثرها شيوعًا." },
    },
  },
  "1-2312": {
    fa: {
      short: "2312",
      name: "قالب پلاستیک 2312 (1.2312)",
      market: "فولاد قالب پلاستیک 2312",
      title: "فولاد قالب پلاستیک 2312 (P20+S): مشخصات و استعلام",
      h1: "فولاد قالب پلاستیک 2312 (1.2312 / 40CrMnMoS8-6)",
      description: "مشخصات فولاد قالب پلاستیک 1.2312 (40CrMnMoS8-6، P20+S)، سختی پیش‌سخت، کاربرد، سایز تسمه و گرد و جدول وزن؛ ارسال درخواست خرید با ابعاد بلوک و برش.",
      summary: "فولاد قالب پلاستیک پیش‌سخت با گوگرد برای ماشین‌کاری آسان؛ تسمه و بلوک آهنگری، گرد.",
      intro: [
        "1.2312 با نام EN ISO 4957 ‏40CrMnMoS8-6 فولاد قالب پلاستیک است و معادل آمریکایی نزدیک آن P20 با گوگرد (P20+S) است. در بازار با نام «فولاد قالب پلاستیک 2312» شناخته می‌شود.",
        "این فولاد پیش‌سخت تحویل می‌شود، پس قالب بدون عملیات حرارتی بعدی ماشین‌کاری می‌شود و گوگرد افزوده ماشین‌کاری را آسان‌تر می‌کند. همین گوگرد آن را برای پولیش آینه‌ای و حکاکی شیمیایی نامناسب می‌کند؛ برای آن کاربردها گریدهای بدون گوگرد مانند 1.2311 یا 1.2738 پرسیده می‌شوند.",
      ],
      uses: ["صفحه‌ها و کویته‌های قالب تزریق پلاستیک", "صفحه‌های نگهدارنده و بدنه قالب", "قطعاتی که پیش‌سخت و بدون عملیات حرارتی ماشین‌کاری می‌شوند"],
      delivery: "پیش‌سخت (بهسازی‌شده) با سختی حدود ۲۸۰ تا ۳۲۵ برینل تحویل می‌شود. بلوک‌ها معمولاً به ابعاد سفارشی برش می‌خورند و قطعه برش‌خورده توزین می‌شود.",
      heatTreatment: "چون پیش‌سخت تحویل می‌شود، معمولاً عملیات حرارتی لازم ندارد. پس از ماشین‌کاری سنگین می‌توان تنش‌زدایی کرد و برای مقاومت به سایش بیشتر، سطح آن را نیتراته کرد.",
      faq: { q: "سختی فولاد 1.2312 چقدر است؟", a: "1.2312 پیش‌سخت با سختی حدود ۲۸۰ تا ۳۲۵ برینل (HB) تحویل می‌شود و برای ساخت قالب بدون عملیات حرارتی بعدی ماشین‌کاری می‌شود." },
    },
    en: {
      short: "1.2312",
      name: "1.2312 (P20+S)",
      market: "plastic mould steel 2312",
      title: "1.2312 (P20+S) Plastic Mould Steel — Specs & RFQ",
      h1: "1.2312 plastic mould steel (40CrMnMoS8-6)",
      description: "1.2312 (40CrMnMoS8-6, P20+S) plastic mould steel: pre-hardened hardness, uses, forged flat and round sizes and a weight table. Request a quote with block size and cuts.",
      summary: "Pre-hardened plastic mould steel with sulphur for easy machining; forged flat and block, round.",
      intro: [
        "1.2312, EN ISO 4957 name 40CrMnMoS8-6, is a plastic mould steel; its closest American equivalent is P20 with sulphur (P20+S). The Iranian market calls it 'plastic mould steel 2312'.",
        "It is supplied pre-hardened, so the mould is machined without later heat treatment, and the added sulphur makes machining easier. The same sulphur makes it unsuitable for mirror polishing and photo-etching; for those, sulphur-free grades such as 1.2311 or 1.2738 are asked for.",
      ],
      uses: ["Plastic injection mould plates and cavities", "Holder plates and mould bases", "Parts machined pre-hardened, without heat treatment"],
      delivery: "Supplied pre-hardened (quenched and tempered) at about 280–325 HB. Blocks are usually saw-cut to the ordered size, and the cut piece is weighed.",
      heatTreatment: "Supplied pre-hardened, it usually needs no heat treatment. Stress relieving after heavy machining is possible, and the surface can be nitrided for more wear resistance.",
      faq: { q: "What is the hardness of 1.2312?", a: "1.2312 is supplied pre-hardened at about 280–325 HB and is machined into moulds without later heat treatment." },
    },
    ar: {
      short: "1.2312",
      name: "1.2312 (P20+S)",
      market: "فولاذ قوالب البلاستيك 2312",
      title: "فولاذ قوالب البلاستيك 1.2312 ‏(P20+S): المواصفات",
      h1: "فولاذ قوالب البلاستيك 1.2312 ‏(40CrMnMoS8-6)",
      description: "مواصفات فولاذ قوالب البلاستيك 1.2312 ‏(40CrMnMoS8-6، P20+S): الصلادة المسبقة والاستخدامات ومقاسات المسطحات المطروقة والقضبان المستديرة وجدول الوزن. أرسل طلبك.",
      summary: "فولاذ قوالب بلاستيك مُقسّى مسبقًا مع الكبريت لتسهيل التشغيل؛ مسطحات وكتل مطروقة وقضبان مستديرة.",
      intro: [
        "‏1.2312، واسمه في EN ISO 4957 ‏40CrMnMoS8-6، فولاذ لقوالب البلاستيك، ومكافئه الأمريكي الأقرب P20 مع الكبريت (P20+S).",
        "يُسلَّم مُقسّى مسبقًا، فتُشغَّل القوالب دون معالجة حرارية لاحقة، ويسهّل الكبريت المضاف التشغيل. لكن الكبريت نفسه يجعله غير مناسب للتلميع المرآتي والحفر الكيميائي؛ ولهذه الاستخدامات تُطلب درجات خالية من الكبريت مثل 1.2311 أو 1.2738.",
      ],
      uses: ["ألواح وتجاويف قوالب حقن البلاستيك", "ألواح التثبيت وقواعد القوالب", "القطع التي تُشغَّل مُقسّاة مسبقًا دون معالجة حرارية"],
      delivery: "يُسلَّم مُقسّى مسبقًا (مُقسّى ومُراجَعًا) بصلادة نحو 280 إلى 325 برينل. تُقص الكتل عادةً بالمنشار إلى المقاس المطلوب، وتوزن القطعة المقصوصة.",
      heatTreatment: "لأنه يُسلَّم مُقسّى مسبقًا فلا يحتاج عادةً إلى معالجة حرارية. يمكن إزالة الإجهادات بعد التشغيل الثقيل، ويمكن نيترة السطح لزيادة مقاومة التآكل.",
      faq: { q: "ما صلادة فولاذ 1.2312؟", a: "يُسلَّم 1.2312 مُقسّى مسبقًا بصلادة نحو 280 إلى 325 برينل (HB)، ويُشغَّل إلى قوالب دون معالجة حرارية لاحقة." },
    },
  },
  "1-2344-h13": {
    fa: {
      short: "گرمکار 2344",
      name: "گرمکار 2344 (1.2344)",
      market: "فولاد گرمکار 2344",
      title: "فولاد گرمکار 2344 (H13): مشخصات، سختی و استعلام",
      h1: "فولاد گرمکار 2344 (1.2344 / X40CrMoV5-1)",
      description: "مشخصات فولاد گرمکار 1.2344 (X40CrMoV5-1، H13)، سختی آنیل، کاربرد در دایکست، اکستروژن و فورج، سایزهای گرد و جدول وزن؛ ارسال درخواست خرید با قطر و برش.",
      summary: "فولاد ابزار گرمکار کروم‌مولیبدن‌وانادیم برای قالب دایکست، اکستروژن و فورج؛ گرد.",
      intro: [
        "1.2344 با نام EN ISO 4957 ‏X40CrMoV5-1 از پرکاربردترین فولادهای ابزار گرمکار است و معادل آمریکایی آن H13 است. در بازار ایران با نام «فولاد گرمکار 2344» شناخته می‌شود.",
        "حدود ۵ درصد کروم همراه با مولیبدن و وانادیم به آن مقاومت در برابر نرم شدن در دمای بالا، چقرمگی و مقاومت در برابر ترک‌های خستگی حرارتی می‌دهد؛ ترکیبی که قالب‌های در تماس با فلز داغ لازم دارند.",
      ],
      uses: ["قالب‌های دایکست آلومینیوم و روی", "قالب و ماتریس اکستروژن", "اینسرت‌های قالب فورج", "ابزارهای برش و پانچ گرم"],
      delivery: "آنیل‌شده با سختی حداکثر ۲۲۹ برینل تحویل می‌شود تا ماشین‌کاری شود؛ سپس قطعه سخت‌کاری و بازپخت می‌شود. گرد معمولاً به طول یا وزن مورد نیاز برش می‌خورد.",
      heatTreatment: "پس از ماشین‌کاری، سخت‌کاری (معمولاً در کوره خلأ با سرد کردن گازی، یا در روغن) و دست‌کم دو بار بازپخت انجام می‌شود. سختی کاری بر اساس نوع قالب انتخاب می‌شود؛ آن را در نقشه یا درخواست بنویسید.",
      faq: { q: "سختی فولاد 2344 در حالت تحویل چقدر است؟", a: "1.2344 آنیل‌شده با سختی حداکثر ۲۲۹ برینل (HB) تحویل می‌شود؛ سختی کاری پس از سخت‌کاری و بازپخت به دست می‌آید و بر اساس کاربرد قالب انتخاب می‌شود." },
    },
    en: {
      short: "1.2344",
      name: "1.2344 (H13)",
      market: "hot-work steel 2344",
      title: "1.2344 / H13 Hot-Work Tool Steel — Specs & RFQ",
      h1: "1.2344 hot-work tool steel (X40CrMoV5-1 / H13)",
      description: "1.2344 (X40CrMoV5-1, AISI H13) hot-work tool steel: annealed hardness, uses in die casting, extrusion and forging, round sizes and a weight table. Request a quote.",
      summary: "Chromium-molybdenum-vanadium hot-work tool steel for die-casting, extrusion and forging dies; round bar.",
      intro: [
        "1.2344, EN ISO 4957 name X40CrMoV5-1, is one of the most widely used hot-work tool steels; its American equivalent is H13. The Iranian market calls it 'hot-work steel 2344'.",
        "About 5 % chromium with molybdenum and vanadium gives it resistance to softening at high temperature, toughness and resistance to heat-checking: the combination dies in contact with hot metal need.",
      ],
      uses: ["Aluminium and zinc die-casting dies", "Extrusion dies and tooling", "Forging die inserts", "Hot shearing and punching tools"],
      delivery: "Supplied annealed at 229 HB maximum for machining; the part is then hardened and tempered. Round bar is usually cut to the length or weight you need.",
      heatTreatment: "After machining: hardening (usually vacuum hardening with a gas quench, or oil) and at least two tempers. The working hardness is chosen for the die type; state it on the drawing or in the request.",
      faq: { q: "What is the delivery hardness of 1.2344?", a: "1.2344 is supplied annealed at 229 HB maximum. The working hardness comes from hardening and tempering and is chosen for the die application." },
    },
    ar: {
      short: "1.2344",
      name: "1.2344 (H13)",
      market: "فولاذ العمل الساخن 2344",
      title: "فولاذ العمل الساخن 1.2344 ‏(H13): المواصفات وطلب التوريد",
      h1: "فولاذ العمل الساخن 1.2344 ‏(X40CrMoV5-1 / H13)",
      description: "مواصفات فولاذ العمل الساخن 1.2344 ‏(X40CrMoV5-1، H13): صلادة التلدين والاستخدام في الصب بالضغط والبثق والطرق ومقاسات القضبان المستديرة وجدول الوزن. أرسل طلبك.",
      summary: "فولاذ عدد للعمل الساخن بالكروم والموليبدنوم والفاناديوم لقوالب الصب بالضغط والبثق والطرق؛ قضبان مستديرة.",
      intro: [
        "‏1.2344، واسمه في EN ISO 4957 ‏X40CrMoV5-1، من أوسع أنواع فولاذ العمل الساخن استخدامًا، ومكافئه الأمريكي H13.",
        "يمنحه نحو 5 % كروم مع الموليبدنوم والفاناديوم مقاومةً للتليّن في درجات الحرارة العالية ومتانةً ومقاومةً لتشققات التعب الحراري، وهو ما تحتاجه القوالب التي تعمل ملامسةً للمعدن الساخن.",
      ],
      uses: ["قوالب الصب بالضغط للألمنيوم والزنك", "قوالب ومصفوفات البثق", "حشوات قوالب الطرق", "عدد القص والثقب على الساخن"],
      delivery: "يُسلَّم مُلدَّنًا بصلادة 229 برينل كحد أقصى للتشغيل، ثم تُقسّى القطعة وتُراجَع. وتُقص القضبان المستديرة عادةً بالطول أو الوزن المطلوب.",
      heatTreatment: "بعد التشغيل: التقسية (عادةً في فرن مفرغ مع التبريد بالغاز، أو بالزيت) ثم المراجعة مرتين على الأقل. تُختار صلادة العمل حسب نوع القالب؛ اذكرها في الرسم أو الطلب.",
      faq: { q: "ما صلادة فولاذ 1.2344 عند التسليم؟", a: "يُسلَّم 1.2344 مُلدَّنًا بصلادة 229 برينل (HB) كحد أقصى، وتتحقق صلادة العمل بالتقسية والمراجعة وتُختار حسب استخدام القالب." },
    },
  },
  "spk-1-2080": {
    fa: {
      short: "SPK",
      name: "SPK (1.2080)",
      market: "SPK، فولاد سردکار 2080",
      title: "فولاد SPK (1.2080 / D3): مشخصات و استعلام خرید",
      h1: "فولاد SPK (1.2080 / X210Cr12)",
      description: "مشخصات فولاد سردکار SPK (1.2080، X210Cr12، D3)، سختی آنیل، کاربرد در قالب برش و پانچ، سایز گرد و تسمه و جدول وزن؛ ارسال درخواست خرید با ابعاد و برش.",
      summary: "فولاد ابزار سردکار پرکربن و پرکروم برای قالب‌های برش، پانچ و تیغه قیچی؛ گرد و تسمه.",
      intro: [
        "1.2080 با نام EN ISO 4957 ‏X210Cr12 فولاد ابزار سردکار با حدود ۲ درصد کربن و ۱۲ درصد کروم است و معادل آمریکایی آن D3 است. در بازار ایران با نام «SPK» شناخته می‌شود؛ این نام از نام تجاری یک تولیدکننده گرفته شده است.",
        "کاربیدهای فراوان کروم مقاومت به سایش بسیار بالایی به آن می‌دهند، اما چقرمگی آن از فولادهای سردکار کم‌کربن‌تر کمتر است. گریدهای نزدیک بازار، SPK-R (1.2436، X210CrW12) و 1.2379 (X153CrMoV12، D2)، گریدهای جداگانه‌ای هستند و باید با شماره مواد سفارش داده شوند.",
      ],
      uses: ["قالب‌های برش و پانچ ورق", "تیغه‌های قیچی و برش", "ابزارهای شکل‌دهی سرد با سایش بالا", "قالب‌های کشش و فرم‌دهی"],
      delivery: "آنیل‌شده با سختی حداکثر ۲۴۸ برینل تحویل می‌شود. تسمه و گرد معمولاً به ابعاد سفارشی برش می‌خورند و قطعه برش‌خورده توزین می‌شود.",
      heatTreatment: "پس از ماشین‌کاری در حالت آنیل، سخت‌کاری (در روغن یا کوره خلأ) و بازپخت انجام می‌شود. تغییر ابعاد در عملیات حرارتی کم است، اما قطعات با لبه‌های نازک به دلیل چقرمگی محدود باید با دقت طراحی شوند.",
      faq: { q: "SPK همان 1.2080 است؟", a: "بله؛ در بازار ایران «SPK» نام رایج فولاد سردکار 1.2080 (X210Cr12، D3) است. SPK-R و 1.2379 گریدهای دیگری‌اند؛ هنگام سفارش شماره مواد را بنویسید." },
    },
    en: {
      short: "1.2080",
      name: "1.2080 (D3, SPK)",
      market: "SPK, cold-work steel 2080",
      title: "1.2080 / D3 (SPK) Cold-Work Tool Steel — Specs & RFQ",
      h1: "1.2080 cold-work tool steel (X210Cr12 / D3)",
      description: "1.2080 (X210Cr12, AISI D3) cold-work tool steel, sold in Iran as SPK: annealed hardness, uses in blanking dies, round and flat sizes and a weight table. Request a quote.",
      summary: "High-carbon, high-chromium cold-work tool steel for blanking and punching dies and shear blades; round and flat.",
      intro: [
        "1.2080, EN ISO 4957 name X210Cr12, is a cold-work tool steel with about 2 % carbon and 12 % chromium; its American equivalent is D3. In the Iranian market it is called 'SPK', a name taken from a manufacturer's trade name.",
        "Its many chromium carbides give it very high wear resistance, but it is less tough than lower-carbon cold-work steels. The nearby market grades SPK-R (1.2436, X210CrW12) and 1.2379 (X153CrMoV12, D2) are separate grades and should be ordered by material number.",
      ],
      uses: ["Sheet blanking and punching dies", "Shear and cutting blades", "High-wear cold-forming tools", "Drawing and forming dies"],
      delivery: "Supplied annealed at 248 HB maximum. Flat and round bar are usually cut to the ordered size, and the cut piece is weighed.",
      heatTreatment: "After machining in the annealed state: hardening (oil or vacuum) and tempering. Dimensional change in heat treatment is small, but thin-edged parts need careful design because of its limited toughness.",
      faq: { q: "Is SPK the same as 1.2080?", a: "Yes: in the Iranian market 'SPK' is the usual name of the cold-work steel 1.2080 (X210Cr12, D3). SPK-R and 1.2379 are other grades; give the material number when you order." },
    },
    ar: {
      short: "1.2080",
      name: "1.2080 (D3)",
      market: "SPK",
      title: "فولاذ العمل البارد 1.2080 ‏(D3): المواصفات وطلب التوريد",
      h1: "فولاذ العمل البارد 1.2080 ‏(X210Cr12 / D3)",
      description: "مواصفات فولاذ العمل البارد 1.2080 ‏(X210Cr12، D3): صلادة التلدين والاستخدام في قوالب القص والثقب ومقاسات القضبان المستديرة والمسطحات وجدول الوزن. أرسل طلبك.",
      summary: "فولاذ عدد للعمل البارد عالي الكربون والكروم لقوالب القص والثقب وشفرات المقصات؛ قضبان مستديرة ومسطحات.",
      intro: [
        "‏1.2080، واسمه في EN ISO 4957 ‏X210Cr12، فولاذ عدد للعمل البارد بنحو 2 % كربون و12 % كروم، ومكافئه الأمريكي D3. ويُعرف في السوق الإيرانية باسم «SPK» المأخوذ من اسم تجاري لأحد المنتجين.",
        "تمنحه كربيدات الكروم الكثيرة مقاومة عالية جدًا للتآكل، لكن متانته أقل من فولاذ العمل البارد الأقل كربونًا. أما الدرجتان القريبتان في السوق SPK-R ‏(1.2436، X210CrW12) و1.2379 ‏(X153CrMoV12، D2) فهما درجتان مستقلتان وتُطلبان برقم المادة.",
      ],
      uses: ["قوالب قص الصاج وثقبه", "شفرات المقصات والقطع", "عدد التشكيل على البارد عالية التآكل", "قوالب السحب والتشكيل"],
      delivery: "يُسلَّم مُلدَّنًا بصلادة 248 برينل كحد أقصى. تُقص المسطحات والقضبان المستديرة عادةً إلى المقاس المطلوب، وتوزن القطعة المقصوصة.",
      heatTreatment: "بعد التشغيل في الحالة الملدنة: التقسية (بالزيت أو في فرن مفرغ) ثم المراجعة. التغير في الأبعاد أثناء المعالجة الحرارية قليل، لكن القطع ذات الحواف الرقيقة تحتاج إلى تصميم دقيق بسبب متانته المحدودة.",
      faq: { q: "هل SPK هو نفسه 1.2080؟", a: "نعم، في السوق الإيرانية «SPK» هو الاسم الشائع لفولاذ العمل البارد 1.2080 ‏(X210Cr12، D3). أما SPK-R و1.2379 فدرجات أخرى؛ اذكر رقم المادة عند الطلب." },
    },
  },
  "1-2510-amutit": {
    fa: {
      short: "آموتیت 2510",
      name: "آموتیت 2510 (1.2510)",
      market: "آموتیت، فولاد 2510",
      title: "فولاد آموتیت 2510 (O1): مشخصات و استعلام خرید",
      h1: "فولاد آموتیت 2510 (1.2510 / 100MnCrW4)",
      description: "مشخصات فولاد ابزار 1.2510 (100MnCrW4، O1) معروف به آموتیت، سختی آنیل، کاربرد در گیج، پانچ و قالب‌های کوچک، سایز گرد و جدول وزن؛ ارسال درخواست خرید.",
      summary: "فولاد ابزار سردکار روغن‌سخت برای گیج، پانچ، قالب‌های کوچک و تیغه؛ گرد.",
      intro: [
        "1.2510 با نام EN ISO 4957 ‏100MnCrW4 فولاد ابزار سردکار روغن‌سخت است و معادل آمریکایی آن O1 است. در بازار ایران با نام «آموتیت» شناخته می‌شود که از نام تجاری یک تولیدکننده گرفته شده است.",
        "با سخت‌کاری در روغن به سختی بالا و پایداری ابعادی خوب می‌رسد و در حالت آنیل به‌آسانی ماشین‌کاری می‌شود؛ به همین دلیل برای ابزارهای دقیق و قطعات کوچک‌تر رایج است.",
      ],
      uses: ["گیج‌ها و ابزارهای اندازه‌گیری", "پانچ و قالب‌های برش کوچک", "تیغه و چاقوهای صنعتی", "ابزارهای دقیق کارگاهی"],
      delivery: "آنیل‌شده با سختی حداکثر ۲۳۰ برینل تحویل می‌شود و پس از ماشین‌کاری در روغن سخت و بازپخت می‌شود. گرد معمولاً به طول مورد نیاز برش می‌خورد.",
      heatTreatment: "سخت‌کاری با سرد کردن در روغن و سپس بازپخت در دمای پایین؛ سختی کاری بر اساس ابزار انتخاب می‌شود.",
      faq: { q: "آموتیت همان 1.2510 است؟", a: "بله؛ در بازار ایران «آموتیت» نام رایج فولاد ابزار 1.2510 (100MnCrW4، O1) است. هنگام سفارش شماره مواد را بنویسید." },
    },
    en: {
      short: "1.2510",
      name: "1.2510 (O1)",
      market: "amutit, 2510",
      title: "1.2510 / O1 Oil-Hardening Tool Steel — Specs & RFQ",
      h1: "1.2510 oil-hardening tool steel (100MnCrW4 / O1)",
      description: "1.2510 (100MnCrW4, AISI O1) oil-hardening tool steel: annealed hardness, uses in gauges, punches and small dies, round sizes and a weight table. Request a quote.",
      summary: "Oil-hardening cold-work tool steel for gauges, punches, small dies and blades; round bar.",
      intro: [
        "1.2510, EN ISO 4957 name 100MnCrW4, is an oil-hardening cold-work tool steel; its American equivalent is O1. In the Iranian market it is known as 'amutit', a name taken from a manufacturer's trade name.",
        "It reaches a high hardness with good dimensional stability when oil-quenched, and machines easily in the annealed state, which is why it is common for precision tools and smaller parts.",
      ],
      uses: ["Gauges and measuring tools", "Punches and small blanking dies", "Industrial blades and knives", "Precision workshop tools"],
      delivery: "Supplied annealed at 230 HB maximum; after machining it is oil-hardened and tempered. Round bar is usually cut to the length you need.",
      heatTreatment: "Hardening with an oil quench, then low-temperature tempering; the working hardness is chosen for the tool.",
      faq: { q: "Is 'amutit' the same as 1.2510?", a: "Yes: in the Iranian market 'amutit' is the usual name of the tool steel 1.2510 (100MnCrW4, O1). Give the material number when you order." },
    },
    ar: {
      short: "1.2510",
      name: "1.2510 (O1)",
      market: "2510",
      title: "فولاذ العدد 1.2510 ‏(O1): المواصفات وطلب التوريد",
      h1: "فولاذ العدد 1.2510 ‏(100MnCrW4 / O1)",
      description: "مواصفات فولاذ العدد 1.2510 ‏(100MnCrW4، O1) المُقسّى بالزيت: صلادة التلدين والاستخدام في المقاييس والمثاقب والقوالب الصغيرة ومقاسات القضبان المستديرة وجدول الوزن.",
      summary: "فولاذ عدد للعمل البارد يُقسّى بالزيت للمقاييس والمثاقب والقوالب الصغيرة والشفرات؛ قضبان مستديرة.",
      intro: [
        "‏1.2510، واسمه في EN ISO 4957 ‏100MnCrW4، فولاذ عدد للعمل البارد يُقسّى بالزيت، ومكافئه الأمريكي O1.",
        "يبلغ صلادة عالية مع ثبات جيد في الأبعاد عند تقسيته بالزيت، ويسهل تشغيله في الحالة الملدنة، لذلك يشيع استخدامه للعدد الدقيقة والقطع الأصغر.",
      ],
      uses: ["المقاييس وأدوات القياس", "المثاقب وقوالب القص الصغيرة", "الشفرات والسكاكين الصناعية", "العدد الدقيقة للورش"],
      delivery: "يُسلَّم مُلدَّنًا بصلادة 230 برينل كحد أقصى، وبعد التشغيل يُقسّى بالزيت ويُراجَع. وتُقص القضبان المستديرة عادةً بالطول المطلوب.",
      heatTreatment: "التقسية بالتبريد في الزيت ثم المراجعة بدرجة حرارة منخفضة؛ وتُختار صلادة العمل حسب العدة.",
      faq: { q: "ما استخدامات فولاذ 1.2510؟", a: "يُستخدم 1.2510 ‏(O1) للمقاييس والمثاقب وقوالب القص الصغيرة والشفرات والعدد الدقيقة، ويُقسّى بالزيت بعد التشغيل." },
    },
  },
};

/** Every fa/ar string of a value through ltrParentheses (RTL order of "(1.7225 / 42CrMo4)"); en unchanged. */
function rtlFixed<T>(value: T): T {
  if (typeof value === "string") return ltrParentheses(value) as T;
  if (Array.isArray(value)) return value.map(rtlFixed) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rtlFixed(v)])) as T;
  return value;
}

export const ALLOY_GRADE_COPY: Readonly<Record<AlloyGradeSlug, Record<Locale, AlloyGradeCopy>>> = Object.fromEntries(
  Object.entries(GRADE_COPY).map(([slug, c]) => [slug, { fa: rtlFixed(c.fa), en: c.en, ar: rtlFixed(c.ar) }]),
) as Record<AlloyGradeSlug, Record<Locale, AlloyGradeCopy>>;

interface AlloyUiCopy {
  eyebrow: string;
  hubTitle: string;
  hubH1: string;
  hubDescription: string;
  hubIntro: string;
  groups: Record<AlloyGradeGroup, { title: string; body: string }>;
  moreGrades: string;
  bannerTitle: string;
  bannerBody: string;
  cta: string;
  more: string;
  equivalentsTitle: string;
  equivalents: { wnr: string; en: string; standard: string; aisi: string; market: string; density: string };
  chemistryTitle: string;
  chemistryNote: (standard: string) => string;
  element: string;
  range: string;
  deliveryTitle: string;
  heatTitle: string;
  usesTitle: string;
  formsTitle: string;
  formsNote: string;
  forms: Record<AlloyFormKind, string>;
  weightTitle: string;
  weightNote: (density: string, wnr: string) => string;
  weightHead: { round: string; square: string; flat: string; plate: string; kgPerMetre: string; kgPerSquareMetre: string; sheet: string };
  weightCaption: Record<"round" | "square" | "flat" | "plate", string>;
  specifyTitle: string;
  specify: readonly string[];
  documentsTitle: string;
  documents: readonly string[];
  faqTitle: string;
  relatedTitle: string;
  linksTitle: string;
  calculatorLink: string;
  calculatorHubLink: string;
  hubLink: string;
  articlesLink: string;
  densityUnit: string;
  /** Common FAQ items, built from the grade's facts. */
  faqWhat: (short: string) => string;
  faqDensity: (short: string, wnr: string, density: string) => { q: string; a: string };
  faqEquivalents: (short: string, wnr: string, enName: string, standard: string, aisi: string) => { q: string; a: string };
  faqQuote: (short: string) => { q: string; a: string };
}

export const ALLOY_UI: Record<Locale, AlloyUiCopy> = {
  fa: {
    eyebrow: "فولاد آلیاژی و ابزار",
    hubTitle: "فولاد آلیاژی و ابزار: مشخصات گریدها و استعلام خرید",
    hubH1: "فولاد آلیاژی و ابزار",
    hubDescription: "راهنمای گریدهای فولاد آلیاژی و ابزار: CK45، MO40، VCN150، سمانته 7131، 2312، گرمکار 2344، SPK و 2510؛ معادل‌ها، کاربرد، سایز و جدول وزن، با ارسال درخواست خرید.",
    hubIntro:
      "آهن آسا فولادهای بهسازی، سمانته و فولادهای ابزار را به صورت گرد، تسمه و بلوک آهنگری، چهارپهلو و ورق برای کارگاه‌های قطعه‌سازی و قالب‌سازی و واحدهای صنعتی تأمین می‌کند. در هر راهنما معادل‌های DIN، EN و AISI، ترکیب شیمیایی، حالت تحویل، کاربردها، محدوده سایز و جدول وزن با چگالی همان گرید آمده است. این گروه با استعلام عرضه می‌شود: گرید، ابعاد، طول برش و حالت تحویل را بفرستید.",
    groups: {
      engineering: {
        title: "فولادهای بهسازی و سمانته",
        body: "فولادهای ماشین‌سازی: فولادهای «بهسازی» (CK45، MO40، VCN150) پس از سخت‌کاری و بازپخت استحکام و چقرمگی می‌گیرند و «سمانته» (7131) کم‌کربن است و پس از کربن‌دهی، سطحی سخت روی مغزی چقرمه پیدا می‌کند. این گروه بیشتر به شاخه کامل یا تن معامله می‌شود.",
      },
      tool: {
        title: "فولادهای ابزار و قالب",
        body: "فولادهای ابزار طبق EN ISO 4957: «قالب پلاستیک» (2312) پیش‌سخت تحویل می‌شود، «گرمکار» (2344) برای قالب‌هایی است که با فلز داغ کار می‌کنند و «سردکار» (SPK و 2510) برای برش و شکل‌دهی در دمای محیط. این گروه معمولاً به ابعاد سفارشی برش می‌خورد و قطعه برش‌خورده توزین می‌شود.",
      },
    },
    moreGrades: "گریدهای دیگر، مانند فولاد تندبر (HSS)، فولاد نقره‌ای، فولاد منگنزی هادفیلد، 1.2379 یا ورق ضد سایش، را هم می‌توانید با شماره مواد در فرم درخواست بنویسید.",
    bannerTitle: "قیمت با استعلام",
    bannerBody: "قیمت روز فولاد آلیاژی و ابزار روی سایت منتشر نمی‌شود. پیشنهاد پس از بررسی درخواست شما و بر اساس گرید، ابعاد، طول برش، حالت تحویل، مقدار و زمان تحویل اعلام می‌شود.",
    cta: "استعلام قیمت",
    more: "مشخصات، سایز و جدول وزن",
    equivalentsTitle: "معادل‌ها",
    equivalents: { wnr: "شماره مواد (DIN)", en: "نام EN", standard: "استاندارد", aisi: "معادل AISI/SAE (تقریبی)", market: "نام در بازار", density: "چگالی اسمی" },
    chemistryTitle: "ترکیب شیمیایی",
    chemistryNote: (standard) => `درصد وزنی، محدوده‌های ${standard}؛ ملاک قرارداد، گواهی آنالیز ذوب همان محموله است.`,
    element: "عنصر",
    range: "محدوده (٪)",
    deliveryTitle: "سختی و حالت تحویل",
    heatTitle: "عملیات حرارتی",
    usesTitle: "کاربردها",
    formsTitle: "شکل‌های عرضه و محدوده سایز",
    formsNote: "محدوده‌هایی که در بازار عرضه می‌شود، نه فهرست موجودی. گردهای بزرگ‌تر از حدود ۱۰۰ میلی‌متر معمولاً آهنگری‌اند و به صورت بازه قطر معامله می‌شوند.",
    forms: { round: "گرد (میلگرد آلیاژی)", peeled: "شفت تراشکاری‌شده (تک‌پولیش)", square: "چهارپهلو", flat: "تسمه و بلوک آهنگری", plate: "ورق" },
    weightTitle: "سایز و وزن",
    weightNote: (density, wnr) => `وزن اسمی با چگالی ${density} کیلوگرم بر دسی‌متر مکعب (${wnr}) حساب شده است. وزن واقعی با توزین تعیین می‌شود و فولاد ابزار معمولاً بر اساس وزن قطعه برش‌خورده فروخته می‌شود.`,
    weightHead: { round: "قطر (mm)", square: "ضلع (mm)", flat: "عرض × ضخامت (mm)", plate: "ضخامت (mm)", kgPerMetre: "وزن هر متر (kg)", kgPerSquareMetre: "وزن هر متر مربع (kg)", sheet: "ورق ۲۰۰۰×۶۰۰۰ (kg)" },
    weightCaption: { round: "گرد", square: "چهارپهلو", flat: "تسمه و بلوک", plate: "ورق" },
    specifyTitle: "در استعلام چه بنویسیم؟",
    specify: [
      "گرید و شماره مواد، و استاندارد اگر نقشه آن را الزام کرده است",
      "شکل: گرد، تسمه یا بلوک، چهارپهلو یا ورق",
      "ابعاد دقیق: قطر، یا عرض × ضخامت، یا ضخامت ورق",
      "طول برش یا تعداد و ابعاد قطعه‌ها، یا شاخه کامل",
      "حالت تحویل: نرماله، آنیل، پیش‌سخت یا بهسازی‌شده، تراشکاری‌شده",
      "مقدار به کیلوگرم یا تن، محل و زمان تحویل",
      "مبدأ مورد نظر (تولید داخل یا وارداتی)، اگر برای شما مهم است",
    ],
    documentsTitle: "مدارک قابل درخواست",
    documents: ["گواهی بازرسی EN 10204 نوع 3.1 (آنالیز ذوب و سختی)", "گزارش آزمون فراصوتی (UT) برای سایزهای آهنگری", "گزارش سختی برای تحویل پیش‌سخت یا بهسازی‌شده"],
    faqTitle: "پرسش‌های رایج",
    relatedTitle: "گریدهای مرتبط",
    linksTitle: "لینک‌های مفید",
    calculatorLink: "ماشین‌حساب وزن با چگالی این گرید",
    calculatorHubLink: "ماشین‌حساب وزن فولاد آلیاژی با چگالی هر گرید",
    hubLink: "همه گریدهای فولاد آلیاژی و ابزار",
    articlesLink: "مقالات آهن آسا",
    densityUnit: "kg/dm³",
    faqWhat: (short) => `فولاد ${short} چیست؟`,
    faqDensity: (short, wnr, density) => ({ q: `چگالی فولاد ${short} چقدر است؟`, a: `چگالی اسمی ${wnr} حدود ${density} کیلوگرم بر دسی‌متر مکعب (گرم بر سانتی‌متر مکعب) است؛ جدول وزن این صفحه و ماشین‌حساب وزن با همین عدد حساب می‌کنند. وزن واقعی با توزین تعیین می‌شود.` }),
    faqEquivalents: (short, wnr, enName, standard, aisi) => ({ q: `معادل فولاد ${short} چیست؟`, a: `${wnr} در ${standard} با نام ${enName} آمده و معادل آمریکایی نزدیک آن AISI ${aisi} است. معادل‌ها تقریبی‌اند؛ اگر نقشه شما استاندارد خاصی را الزام کرده، همان را در درخواست بنویسید.` }),
    faqQuote: (short) => ({ q: `قیمت فولاد ${short} چطور اعلام می‌شود؟`, a: "قیمت این گروه روی سایت منتشر نمی‌شود. گرید، شکل و ابعاد، طول برش یا تعداد قطعه، حالت تحویل و مدارک مورد نیاز را بفرستید تا پس از بررسی، پیشنهاد برای شما ارسال شود." }),
  },
  en: {
    eyebrow: "Alloy & tool steel",
    hubTitle: "Alloy & Tool Steel Grades — Specs and RFQ",
    hubH1: "Alloy & tool steel",
    hubDescription: "Alloy and tool steel grade guides: CK45, 42CrMo4, 34CrNiMo6, 16MnCr5, 1.2312, 1.2344, 1.2080 and 1.2510 — equivalents, uses, sizes and weight tables.",
    hubIntro:
      "Ahan Asa sources steels for quenching and tempering, case-hardening steels and tool steels as round bar, forged flat and block, square and plate for machine shops, mould makers and industrial plants. Each guide gives the DIN, EN and AISI equivalents, the composition, the delivery state, typical uses, the size ranges and a weight table at the grade's own density. This group is offered on request: send the grade, size, cut length and delivery state.",
    groups: {
      engineering: {
        title: "Steels for quenching and tempering, and case-hardening steels",
        body: "Machine-building steels: CK45, MO40 and VCN150 gain strength and toughness by quenching and tempering, while 16MnCr5 is a low-carbon steel that gets a hard surface over a tough core by carburising. This group is mostly traded by the full bar or by the tonne.",
      },
      tool: {
        title: "Tool and mould steels",
        body: "Tool steels to EN ISO 4957: plastic mould steel 1.2312 is supplied pre-hardened, hot-work steel 1.2344 is for dies that work against hot metal, and the cold-work steels 1.2080 and 1.2510 cut and form at room temperature. This group is usually cut to the ordered size, and the cut piece is weighed.",
      },
    },
    moreGrades: "Other grades, such as high-speed steel (HSS), silver steel, Hadfield manganese steel, 1.2379 or wear-resistant plate, can also be requested by material number in the request form.",
    bannerTitle: "Quote on request",
    bannerBody: "Alloy and tool steel is offered on request only. The offer follows our review of your request: grade, size, cut length, delivery state, quantity and timing.",
    cta: "Request a quote",
    more: "Specs, sizes and weight table",
    equivalentsTitle: "Equivalents",
    equivalents: { wnr: "Material number (DIN)", en: "EN name", standard: "Standard", aisi: "AISI/SAE (approx.)", market: "Iranian market name", density: "Nominal density" },
    chemistryTitle: "Chemical composition",
    chemistryNote: (standard) => `Mass %, ranges of ${standard}; the heat certificate of the delivered material is what the contract relies on.`,
    element: "Element",
    range: "Range (%)",
    deliveryTitle: "Hardness and delivery state",
    heatTitle: "Heat treatment",
    usesTitle: "Typical uses",
    formsTitle: "Delivery forms and size ranges",
    formsNote: "The ranges the market offers, not a stock list. Rounds above about 100 mm are usually forged and traded in diameter bands.",
    forms: { round: "Round bar", peeled: "Peeled and turned shaft", square: "Square bar", flat: "Forged flat and block", plate: "Plate" },
    weightTitle: "Sizes and weights",
    weightNote: (density, wnr) => `Nominal weights at a density of ${density} kg/dm³ (${wnr}). The actual weight is weighed, and tool steel is usually sold by the weight of the cut piece.`,
    weightHead: { round: "Diameter (mm)", square: "Side (mm)", flat: "Width × thickness (mm)", plate: "Thickness (mm)", kgPerMetre: "kg per metre", kgPerSquareMetre: "kg per m²", sheet: "2000×6000 sheet (kg)" },
    weightCaption: { round: "Round bar", square: "Square bar", flat: "Flat and block", plate: "Plate" },
    specifyTitle: "What to include in your request",
    specify: [
      "Grade and material number, and the standard if your drawing requires one",
      "Form: round, flat or block, square or plate",
      "Exact size: diameter, width × thickness, or plate thickness",
      "Cut length, or the number and size of pieces, or full bars",
      "Delivery state: normalised, annealed, pre-hardened or quenched and tempered, turned",
      "Quantity in kg or tonnes, place and date of delivery",
      "Preferred origin (made in Iran or imported), if it matters to you",
    ],
    documentsTitle: "Documents you can ask for",
    documents: ["EN 10204 type 3.1 inspection certificate (heat analysis and hardness)", "Ultrasonic test (UT) report for forged sizes", "Hardness report for pre-hardened or quenched and tempered material"],
    faqTitle: "Frequently asked questions",
    relatedTitle: "Related grades",
    linksTitle: "Useful links",
    calculatorLink: "Weight calculator at this grade's density",
    calculatorHubLink: "Weight calculator with each grade's density",
    hubLink: "All alloy and tool steel grades",
    articlesLink: "Ahan Asa articles",
    densityUnit: "kg/dm³",
    faqWhat: (short) => `What is ${short} steel?`,
    faqDensity: (short, wnr, density) => ({ q: `What is the density of ${short}?`, a: `The nominal density of ${wnr} is about ${density} kg/dm³ (g/cm³); the weight table on this page and the weight calculator use this value. The actual weight is weighed.` }),
    faqEquivalents: (short, wnr, enName, standard, aisi) => ({ q: `What is the equivalent of ${short}?`, a: `${wnr} is listed in ${standard} as ${enName}; its closest American equivalent is AISI ${aisi}. Equivalents are approximate: if your drawing requires a specific standard, name it in the request.` }),
    faqQuote: (short) => ({ q: `How do I get a quote for ${short}?`, a: "Send the grade, form and size, the cut length or number of pieces, the delivery state and the documents you need. We review the request and send you an offer." }),
  },
  ar: {
    eyebrow: "الفولاذ السبائكي وفولاذ العدد",
    hubTitle: "الفولاذ السبائكي وفولاذ العدد: المواصفات وطلب التوريد",
    hubH1: "الفولاذ السبائكي وفولاذ العدد",
    hubDescription: "أدلة درجات الفولاذ السبائكي وفولاذ العدد: CK45 وMO40 وVCN150 و16MnCr5 و1.2312 و1.2344 و1.2080 و1.2510، بالمكافئات والاستخدامات والمقاسات وجداول الوزن.",
    hubIntro:
      "يوفّر آهن آسا فولاذ التقسية والمراجعة وفولاذ التصليد السطحي وفولاذ العدد على شكل قضبان مستديرة ومسطحات وكتل مطروقة وقضبان مربعة وألواح لورش تصنيع القطع والقوالب والمنشآت الصناعية. يعرض كل دليل مكافئات DIN وEN وAISI والتركيب الكيميائي وحالة التسليم والاستخدامات ونطاقات المقاسات وجدول وزن بكثافة الدرجة نفسها. تُعرض هذه المجموعة عبر الطلب: أرسل الدرجة والمقاس وطول القص وحالة التسليم.",
    groups: {
      engineering: {
        title: "فولاذ التقسية والمراجعة وفولاذ التصليد السطحي",
        body: "فولاذ صناعة الآلات: يكتسب CK45 وMO40 وVCN150 المقاومة والمتانة بالتقسية والمراجعة، أما 16MnCr5 فهو فولاذ منخفض الكربون يكتسب بالكربنة سطحًا صلدًا فوق قلب متين. وتُتداول هذه المجموعة غالبًا بالقضيب الكامل أو بالطن.",
      },
      tool: {
        title: "فولاذ العدد والقوالب",
        body: "فولاذ العدد وفق EN ISO 4957: يُسلَّم فولاذ قوالب البلاستيك 1.2312 مُقسّى مسبقًا، وفولاذ العمل الساخن 1.2344 للقوالب التي تعمل مع المعدن الساخن، وفولاذ العمل البارد 1.2080 و1.2510 للقص والتشكيل في درجة حرارة الغرفة. وتُقص هذه المجموعة عادةً إلى المقاس المطلوب وتوزن القطعة المقصوصة.",
      },
    },
    moreGrades: "يمكنك أيضًا طلب درجات أخرى برقم المادة في نموذج الطلب، مثل الفولاذ السريع (HSS) والفولاذ الفضي وفولاذ هادفيلد المنغنيزي و1.2379 والألواح المقاومة للتآكل.",
    bannerTitle: "العرض عند الطلب",
    bannerBody: "يُقدَّم الفولاذ السبائكي وفولاذ العدد عبر الطلب فقط. يُرسل العرض بعد مراجعة طلبك حسب الدرجة والمقاس وطول القص وحالة التسليم والكمية والتوقيت.",
    cta: "طلب عرض",
    more: "المواصفات والمقاسات وجدول الوزن",
    equivalentsTitle: "المكافئات",
    equivalents: { wnr: "رقم المادة (DIN)", en: "الاسم وفق EN", standard: "المعيار", aisi: "مكافئ AISI/SAE (تقريبي)", market: "الاسم في السوق الإيرانية", density: "الكثافة الاسمية" },
    chemistryTitle: "التركيب الكيميائي",
    chemistryNote: (standard) => `نسبة وزنية، حدود ${standard}؛ والمرجع في العقد هو شهادة تحليل الصبة للمادة المسلَّمة.`,
    element: "العنصر",
    range: "المدى (%)",
    deliveryTitle: "الصلادة وحالة التسليم",
    heatTitle: "المعالجة الحرارية",
    usesTitle: "الاستخدامات",
    formsTitle: "أشكال التوريد ونطاقات المقاسات",
    formsNote: "هذه النطاقات المعروضة في السوق، وليست قائمة مخزون. والقضبان المستديرة الأكبر من نحو 100 مم مطروقة عادةً وتُتداول بنطاقات أقطار.",
    forms: { round: "قضبان مستديرة", peeled: "أعمدة مقشورة ومخروطة", square: "قضبان مربعة", flat: "مسطحات وكتل مطروقة", plate: "ألواح" },
    weightTitle: "المقاسات والأوزان",
    weightNote: (density, wnr) => `الأوزان الاسمية بكثافة ${density} كغ/دسم³ (${wnr}). ويُحدَّد الوزن الفعلي بالوزن، ويُباع فولاذ العدد عادةً بوزن القطعة المقصوصة.`,
    weightHead: { round: "القطر (مم)", square: "الضلع (مم)", flat: "العرض × السماكة (مم)", plate: "السماكة (مم)", kgPerMetre: "كغ لكل متر", kgPerSquareMetre: "كغ لكل م²", sheet: "لوح 2000×6000 (كغ)" },
    weightCaption: { round: "قضبان مستديرة", square: "قضبان مربعة", flat: "مسطحات وكتل", plate: "ألواح" },
    specifyTitle: "ماذا تكتب في طلبك؟",
    specify: [
      "الدرجة ورقم المادة، والمعيار إذا اشترطه الرسم",
      "الشكل: مستدير أو مسطح أو كتلة أو مربع أو لوح",
      "المقاس الدقيق: القطر، أو العرض × السماكة، أو سماكة اللوح",
      "طول القص أو عدد القطع ومقاساتها، أو قضبان كاملة",
      "حالة التسليم: مُطبَّع أو مُلدَّن أو مُقسّى مسبقًا أو مُقسّى ومُراجَع أو مخروط",
      "الكمية بالكيلوغرام أو الطن، ومكان التسليم وموعده",
      "المنشأ المفضل (محلي أو مستورد) إذا كان مهمًا لك",
    ],
    documentsTitle: "مستندات يمكن طلبها",
    documents: ["شهادة فحص EN 10204 من النوع 3.1 (تحليل الصبة والصلادة)", "تقرير الفحص بالموجات فوق الصوتية (UT) للمقاسات المطروقة", "تقرير الصلادة للمادة المُقسّاة مسبقًا أو المُقسّاة والمُراجَعة"],
    faqTitle: "أسئلة شائعة",
    relatedTitle: "درجات ذات صلة",
    linksTitle: "روابط مفيدة",
    calculatorLink: "حاسبة الوزن بكثافة هذه الدرجة",
    calculatorHubLink: "حاسبة الوزن بكثافة كل درجة",
    hubLink: "كل درجات الفولاذ السبائكي وفولاذ العدد",
    articlesLink: "مقالات آهن آسا",
    densityUnit: "كغ/دسم³",
    faqWhat: (short) => `ما هو فولاذ ${short}؟`,
    faqDensity: (short, wnr, density) => ({ q: `ما كثافة فولاذ ${short}؟`, a: `الكثافة الاسمية للدرجة ${wnr} نحو ${density} كغ/دسم³ (غ/سم³)، وبها يُحسب جدول الوزن في هذه الصفحة وحاسبة الوزن. ويُحدَّد الوزن الفعلي بالوزن.` }),
    faqEquivalents: (short, wnr, enName, standard, aisi) => ({ q: `ما مكافئ فولاذ ${short}؟`, a: `ترد الدرجة ${wnr} في ${standard} باسم ${enName}، ومكافئها الأمريكي الأقرب AISI ${aisi}. المكافئات تقريبية؛ فإذا اشترط رسمك معيارًا محددًا فاذكره في الطلب.` }),
    faqQuote: (short) => ({ q: `كيف أطلب عرضًا لفولاذ ${short}؟`, a: "أرسل الدرجة والشكل والمقاس وطول القص أو عدد القطع وحالة التسليم والمستندات المطلوبة، فنراجع طلبك ونرسل لك العرض." }),
  },
};

export { localizeNumbers };

/** The grade's density as the page writes it («۷٫۸۵», "7.85", «٧٫٨٥»). */
export const alloyDensityLabel = (locale: Locale, slug: AlloyGradeSlug) => localizeNumbers(locale, ALLOY_GRADES[slug].density.toFixed(2));

/** The visible FAQ of a guide: what it is, density, equivalents, the grade's own item, how to get a quote. */
export function alloyFaq(locale: Locale, slug: AlloyGradeSlug): { q: string; a: string }[] {
  const g = ALLOY_GRADES[slug];
  const c = ALLOY_GRADE_COPY[slug][locale];
  const t = ALLOY_UI[locale];
  return [
    { q: t.faqWhat(c.short), a: c.intro[0] },
    t.faqDensity(c.short, g.wnr, alloyDensityLabel(locale, slug)),
    t.faqEquivalents(c.short, g.wnr, g.enName, g.standard, g.aisi),
    c.faq,
    t.faqQuote(c.short),
  ];
}

/** Grades of a hub group, in ALLOY_GRADE_SLUGS order. */
export const alloyGradesOf = (group: AlloyGradeGroup) => ALLOY_GRADE_SLUGS.filter((s) => ALLOY_GRADES[s].group === group);
