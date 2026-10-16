import type { Locale } from "../../config/locales.ts";

/**
 * /about (W16.3) — the owner-approved Persian text of 2026-10-13, verbatim except the brand, which is written
 * «آهن آسا» as everywhere on the site (lib/metadata/site.ts). ar is formal Arabic for Gulf/Iraqi buyers and en
 * formal English; both translate the same facts and add none. No price amount anywhere on this page.
 * Title/meta: docs/seo/keyword-map.md §7.1.
 */
export interface AboutPageCopy {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  introTitle: string;
  intro: string[];
  timelineTitle: string;
  timelineYear: string;
  timelineEvent: string;
  timeline: { year: string; event: string }[];
  supplyTitle: string;
  supply: { label: string; text: string }[];
  whyTitle: string;
  why: { label: string; text: string }[];
  platformTitle: string;
  platform: string;
  groupTitle: string;
  groupIntro: string;
  leadershipTitle: string;
  /** W17.1 (owner): shown exactly as «role: name», no honorific, no note. W20.1 (owner, 2026-10-16): CEO first, then the chairman. */
  leadership: { role: string; name: string }[];
  contactTitle: string;
  phoneLabel: string;
  cta: string;
  links: { calculator: string; rawMaterials: string; export: string | null };
}

export const ABOUT_COPY: Record<Locale, AboutPageCopy> = {
  fa: {
    metaTitle: "درباره آهن آسا؛ مدیر خرید فولاد شما",
    metaDescription: "آهن آسا خرید فولاد را از سمت خریدار مدیریت می‌کند: بررسی نیاز، مقایسه تأمین، شفافیت قیمت و هماهنگی تحویل. نه فروشگاه، نه بازارگاه.",
    eyebrow: "درباره ما",
    h1: "درباره آهن آسا",
    introTitle: "تأمین مطمئن فولاد، با پشتوانهٔ سه دهه تجربه در صنعت ساخت",
    intro: [
      "آهن آسا یکی از زیرمجموعه‌های گروه فضاسازه نقش جهان است؛ گروهی که از سال ۱۳۷۶ در زمینهٔ طراحی، ساخت و اجرای سازه‌های فلزی (استراکچر) فعالیت می‌کند. این گروه در طول سال‌ها با تکیه بر تجربهٔ خود، شاخه‌های تخصصی دیگری نیز ایجاد کرده است تا نیازهای مختلف صنعت ساخت را پوشش دهد.",
      "مدیران آهن آسا حدود سی سال سابقه در صنعت استراکچر دارند و در این مدت با بازار فولاد، تولیدکنندگان دست‌اول و کیفیت محصولات آن‌ها از نزدیک آشنا شده‌اند. آهن آسا بر پایهٔ همین تجربه شکل گرفت تا این شناخت را در اختیار مشتریان بگذارد و فولاد باکیفیت را با قیمت مناسب تأمین کند.",
    ],
    timelineTitle: "مسیر ما",
    timelineYear: "سال",
    timelineEvent: "رویداد",
    timeline: [
      { year: "۱۳۷۶", event: "شکل‌گیری هستهٔ اولیهٔ گروه فضاسازه نقش جهان در طراحی و اجرای سازه‌های فلزی" },
      { year: "۱۳۸۸", event: "ورود سهامداران جدید و شتاب گرفتن رشد گروه" },
      { year: "۱۳۹۴", event: "تأسیس سی‌پانل، در زمینهٔ پوشش سالن‌های صنعتی" },
      { year: "۱۴۰۰", event: "تأسیس آویز سازه، در زمینهٔ سقف کاذب سالن‌ها" },
      { year: "۱۴۰۳", event: "آغاز فعالیت آهن آسا در تأمین مقاطع فولادی و راه‌اندازی دفتر تهران" },
      { year: "۱۴۰۴", event: "تأمین فولاد مورد نیاز پروژه‌های پتروشیمی و آغاز صادرات به عراق" },
      { year: "۱۴۰۵", event: "ورود به تأمین مواد اولیهٔ کارخانه‌های فولاد، بهره‌برداری از سامانهٔ آهن آسا و تأسیس آی‌صنعت" },
    ],
    supplyTitle: "چه چیزهایی تأمین می‌کنیم",
    supply: [
      { label: "مقاطع ساختمانی", text: "میلگرد، تیرآهن، ناودانی، نبشی، قوطی و پروفیل" },
      { label: "ورق و کلاف", text: "ورق سیاه، روغنی، گالوانیزه و رنگی" },
      { label: "لوله", text: "لولهٔ درزدار و بدون درز" },
      { label: "مواد اولیهٔ فولاد", text: "شمش، آهن اسفنجی، سنگ آهن و بریکت، به‌صورت تنی و از طریق استعلام" },
    ],
    whyTitle: "چرا آهن آسا",
    why: [
      { label: "شناخت تولیدکننده و کیفیت", text: "محصولات را از تولیدکنندگان دست‌اول تأمین می‌کنیم و کارخانه، مشخصات و محل تحویل هر کالا را شفاف اعلام می‌کنیم." },
      { label: "قیمت روز شفاف", text: "قیمت آهن‌آلات هر روز در سامانهٔ آهن آسا، با احتساب ارزش افزوده و همراه با تاریخ و نام کارخانه، به‌روز می‌شود." },
      { label: "استعلام آسان", text: "لیست اقلام خود را آنلاین ارسال کنید؛ از فرم سایت تا فایل اکسل، PDF یا عکس لیست. کارشناسان ما با پیش‌فاکتور پاسخ می‌دهند." },
      { label: "تجربهٔ پروژه‌های بزرگ", text: "از پروژه‌های ساختمانی تا تأمین فولاد پروژه‌های پتروشیمی." },
      { label: "صادرات", text: "با نمایندگان فعال در عراق و کویت، آهن‌آلات و مواد اولیهٔ فولاد را به کشورهای منطقه صادر می‌کنیم." },
    ],
    platformTitle: "سامانهٔ آهن آسا",
    platform: "سامانهٔ آهن آسا در سال ۱۴۰۵ به بهره‌برداری رسید؛ سامانه‌ای جامع برای خرید آهن‌آلات که قیمت روز، استعلام آنلاین با امکان ارسال فایل، ماشین‌حساب وزن و راهنمای انتخاب کالا را یک‌جا در اختیار مشتریان قرار می‌دهد.",
    groupTitle: "گروه فضاسازه نقش جهان",
    groupIntro: "آهن آسا عضوی از گروه فضاسازه نقش جهان (fazasazeh.ir) است و در کنار شرکت‌های هم‌گروه خود، زنجیرهٔ کاملی از خدمات صنعت ساخت را پوشش می‌دهد:",
    leadershipTitle: "مدیریت",
    leadership: [
      { role: "مدیرعامل", name: "فاطمه زاهدی" },
      { role: "رئیس هیئت‌مدیره", name: "امیرموسی طالقانی" },
    ],
    contactTitle: "ارتباط با ما",
    phoneLabel: "تلفن",
    cta: "ارسال استعلام قیمت",
    links: { calculator: "ماشین‌حساب وزن", rawMaterials: "مواد اولیهٔ فولاد", export: null },
  },
  en: {
    metaTitle: "About Ahan Asa — Your Steel Purchasing Manager",
    metaDescription: "Ahan Asa manages steel purchasing from the buyer's side: requirement review, supply comparison and delivery coordination — not a seller, not a marketplace.",
    eyebrow: "About us",
    h1: "About Ahan Asa",
    introTitle: "Reliable steel supply, backed by three decades in the construction industry",
    intro: [
      "Ahan Asa is a member of the Fazasazeh Naghsh-e Jahan group, which has worked in the design, fabrication and erection of steel structures since 1997 (1376 SH). Over the years the group has drawn on that experience to set up further specialised companies that serve different needs of the construction industry.",
      "Ahan Asa's managers have around thirty years of experience in the steel-structure industry, and in that time have come to know the steel market, the primary producers and the quality of their products at first hand. Ahan Asa was founded on this experience, to put that knowledge at its customers' service and to supply quality steel at a fair price.",
    ],
    timelineTitle: "Our path",
    timelineYear: "Year",
    timelineEvent: "Milestone",
    timeline: [
      { year: "1376 SH (1997)", event: "The core of the Fazasazeh Naghsh-e Jahan group is formed, in the design and erection of steel structures" },
      { year: "1388 SH (2009–10)", event: "New shareholders join and the group's growth accelerates" },
      { year: "1394 SH (2015–16)", event: "SiPanel is founded, for the cladding of industrial halls" },
      { year: "1400 SH (2021–22)", event: "Aviz Sazeh is founded, for suspended ceilings in halls" },
      { year: "1403 SH (2024–25)", event: "Ahan Asa begins supplying steel sections and opens its Tehran office" },
      { year: "1404 SH (2025–26)", event: "Steel supply for petrochemical projects; exports to Iraq begin" },
      { year: "1405 SH (2026–27)", event: "Supply of raw materials to steel plants begins, the Ahan Asa platform goes live and AiSanat is founded" },
    ],
    supplyTitle: "What we supply",
    supply: [
      { label: "Structural sections", text: "rebar, I-beams, channels, angles, hollow sections and profiles" },
      { label: "Sheet and coil", text: "hot-rolled black, oiled, galvanised and pre-painted sheet" },
      { label: "Pipe", text: "welded and seamless pipe" },
      { label: "Steel raw materials", text: "billet, direct reduced iron, iron ore and briquettes, by the tonne and on request" },
    ],
    whyTitle: "Why Ahan Asa",
    why: [
      { label: "We know the producers and the quality", text: "We source from primary producers and state clearly the mill, the specification and the delivery point of every item." },
      { label: "Transparent daily prices", text: "Steel prices are updated every day on the Ahan Asa platform, including VAT and showing the date and the mill." },
      { label: "Easy enquiries", text: "Send your item list online — through the website form or as an Excel file, a PDF or a photo of the list. Our team replies with a pro-forma invoice." },
      { label: "Experience with large projects", text: "From building projects to steel supply for petrochemical projects." },
      { label: "Export", text: "With active representatives in Iraq and Kuwait, we export steel products and steel raw materials to countries in the region." },
    ],
    platformTitle: "The Ahan Asa platform",
    platform: "The Ahan Asa platform went live in 1405 SH (2026): a complete system for buying steel that brings together daily prices, online enquiries with file upload, a weight calculator and a product selection guide in one place.",
    groupTitle: "The Fazasazeh Naghsh-e Jahan group",
    groupIntro: "Ahan Asa is a member of the Fazasazeh Naghsh-e Jahan group (fazasazeh.ir). Together with its sister companies it covers a complete chain of services for the construction industry:",
    leadershipTitle: "Management",
    leadership: [
      { role: "Chief Executive Officer", name: "Fatemeh Zahedi" },
      { role: "Chairman of the Board", name: "Amirmousa Taleghani" },
    ],
    contactTitle: "Contact us",
    phoneLabel: "Phone",
    cta: "Request a quote",
    links: { calculator: "Weight calculator", rawMaterials: "Steel raw materials", export: "Export from Iran" },
  },
  ar: {
    metaTitle: "عن آهن آسا: مدير شراء الحديد الخاص بك",
    metaDescription: "يدير آهن آسا شراء الحديد من جانب المشتري: مراجعة الاحتياج، ومقارنة خيارات التوريد، وتنسيق التسليم، ضمن مجموعة فضاسازه نقش جهان العاملة منذ عام 1997.",
    eyebrow: "من نحن",
    h1: "عن آهن آسا",
    introTitle: "توريد موثوق للحديد، تدعمه ثلاثة عقود من الخبرة في قطاع البناء",
    intro: [
      "آهن آسا إحدى شركات مجموعة فضاسازه نقش جهان، وهي مجموعة تعمل منذ عام 1997 (1376 هـ.ش) في تصميم الهياكل المعدنية وتصنيعها وتنفيذها. وقد أنشأت المجموعة على مرّ السنين، استنادًا إلى خبرتها، شركات متخصصة أخرى لتلبية الاحتياجات المختلفة لقطاع البناء.",
      "يتمتع مديرو آهن آسا بخبرة تقارب ثلاثين عامًا في قطاع الهياكل الفولاذية، اطّلعوا خلالها عن قرب على سوق الحديد والمنتجين الرئيسيين وجودة منتجاتهم. وعلى هذه الخبرة تأسست آهن آسا، لتضع هذه المعرفة في خدمة عملائها وتوفّر لهم حديدًا عالي الجودة بسعر مناسب.",
    ],
    timelineTitle: "مسيرتنا",
    timelineYear: "السنة",
    timelineEvent: "الحدث",
    timeline: [
      { year: "1376 هـ.ش (1997)", event: "تشكّل النواة الأولى لمجموعة فضاسازه نقش جهان في تصميم الهياكل المعدنية وتنفيذها" },
      { year: "1388 هـ.ش (2009–2010)", event: "انضمام مساهمين جدد وتسارع نمو المجموعة" },
      { year: "1394 هـ.ش (2015–2016)", event: "تأسيس سي بانل في مجال تغطية الصالات الصناعية" },
      { year: "1400 هـ.ش (2021–2022)", event: "تأسيس آويز سازه في مجال الأسقف المعلقة للصالات" },
      { year: "1403 هـ.ش (2024–2025)", event: "بدء نشاط آهن آسا في توريد المقاطع الفولاذية وافتتاح مكتب طهران" },
      { year: "1404 هـ.ش (2025–2026)", event: "توريد الحديد لمشاريع البتروكيماويات وبدء التصدير إلى العراق" },
      { year: "1405 هـ.ش (2026–2027)", event: "بدء توريد المواد الخام لمصانع الصلب، وتشغيل منصة آهن آسا، وتأسيس آي صنعت" },
    ],
    supplyTitle: "ما الذي نورّده",
    supply: [
      { label: "مقاطع البناء", text: "حديد التسليح (الشيش)، والشيلمان، والمجاري، والزوايا، والحديد المربع والمستطيل (العلب)، والبروفيلات" },
      { label: "الصاج واللفائف", text: "الصاج الأسود، والمزيّت، والمجلفن، والملوّن" },
      { label: "الأنابيب", text: "الأنابيب الملحومة وغير الملحومة" },
      { label: "المواد الخام للصلب", text: "البليت، والحديد الإسفنجي، وخام الحديد، والحديد المقولب، بالطن وعبر طلب التسعير" },
    ],
    whyTitle: "لماذا آهن آسا",
    why: [
      { label: "معرفة المنتِج والجودة", text: "نورّد المنتجات من المنتجين الرئيسيين، ونعلن بوضوح المصنع والمواصفات ومكان التسليم لكل صنف." },
      { label: "أسعار يومية شفافة", text: "تُحدَّث أسعار الحديد يوميًا على منصة آهن آسا شاملةً ضريبة القيمة المضافة، مع التاريخ واسم المصنع." },
      { label: "طلب تسعير سهل", text: "أرسل قائمة أصنافك عبر الإنترنت، من خلال نموذج الموقع أو كملف Excel أو PDF أو صورة للقائمة، ويردّ فريقنا بفاتورة مبدئية." },
      { label: "خبرة في المشاريع الكبرى", text: "من مشاريع البناء إلى توريد الحديد لمشاريع البتروكيماويات." },
      { label: "التصدير", text: "من خلال ممثلين نشطين في العراق والكويت، نصدّر الحديد والمواد الخام للصلب إلى دول المنطقة." },
    ],
    platformTitle: "منصة آهن آسا",
    platform: "دخلت منصة آهن آسا حيز التشغيل عام 1405 هـ.ش (2026)، وهي منظومة متكاملة لشراء الحديد تجمع في مكان واحد أسعار اليوم، وطلب التسعير عبر الإنترنت مع إمكانية إرسال الملفات، وحاسبة الوزن، ودليل اختيار المنتجات.",
    groupTitle: "مجموعة فضاسازه نقش جهان",
    groupIntro: "آهن آسا عضو في مجموعة فضاسازه نقش جهان (fazasazeh.ir)، وتغطي مع الشركات الشقيقة في المجموعة سلسلة متكاملة من خدمات قطاع البناء:",
    leadershipTitle: "الإدارة",
    leadership: [
      { role: "المديرة التنفيذية", name: "فاطمة زاهدي" },
      { role: "رئيس مجلس الإدارة", name: "أمير موسى طالقاني" },
    ],
    contactTitle: "تواصل معنا",
    phoneLabel: "الهاتف",
    cta: "إرسال طلب تسعير",
    links: { calculator: "حاسبة الوزن", rawMaterials: "المواد الخام للصلب", export: "التصدير من إيران" },
  },
};

/**
 * Photo slots (owner brief: ~/claude-reports/ahanassa/about-photos/ was empty on 2026-10-13, so none ship).
 * To add one (W16.5 image pipeline, docs/performance/IMAGE_PIPELINE.md): put the original under
 * public/_originals/images/about/ (provenance per PROJECT_OVERRIDES §6.2), list its public path
 * (/images/about/<name>.jpg) in lib/media/image-sources.ts#OPTIMIZED_IMAGE_SOURCES with role "gallery", run
 * scripts/images/build-variants.ts, and add it here with the generated width/height and an alt text per locale.
 * The page renders it through components/ui/image.tsx (AVIF/WebP srcset, lazy) and only when this list is
 * non-empty; lib/media/image-variants.test.ts fails on a src with no variants.
 */
export const ABOUT_PHOTOS: ReadonlyArray<{ src: string; width: number; height: number; alt: Record<Locale, string> }> = [];
