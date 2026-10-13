import type { Locale } from "../../config/locales.ts";

/**
 * W16.3 (D-SEO, docs/seo/keyword-map.md §2.2 #1, §5.3, §7.3) — the category pages' own title, H1, meta and
 * intro. Before this every `/products/category/<segment>` reused the products-index H1 and body, so all 21
 * pages shared one H1 and one meta description.
 *
 * fa mentions «قیمت روز» only on a day the family has prices (`priced`, from the build-time snapshot); ar
 * uses the Iraqi trade words of §3.5 next to the formal term and never a factory; en never a price word.
 * Facts are the catalog's own: the grades, forms and standards of the published variants (no size ranges,
 * which change with the catalog). A category without an entry here keeps the generic listing copy.
 */
export interface CategorySeoCopy {
  title: string;
  h1: string;
  description: string;
  intro: string;
}

interface CategoryEntry {
  /** Short family name used in link labels («قیمت روز میلگرد», «حساب وزن حديد التسليح»). */
  name: string;
  /** fa only: title and meta on a day the family has prices. */
  pricedTitle?: string;
  pricedDescription?: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
}

export const CATEGORY_SEO: Record<string, Record<Locale, CategoryEntry>> = {
  REBAR: {
    fa: {
      name: "میلگرد",
      pricedTitle: "میلگرد آجدار و ساده: انواع، وزن و قیمت روز",
      pricedDescription: "میلگرد ساده A1 و آجدار A2، A3 و A4 طبق استاندارد INSO 3132، با وزن هر شاخه و قیمت روز. برای خرید میلگرد پروژه استعلام قیمت بگیرید.",
      title: "میلگرد آجدار و ساده: انواع، سایز و وزن",
      h1: "میلگرد",
      description: "میلگرد ساده A1 و آجدار A2، A3 و A4 طبق استاندارد INSO 3132، با سایزها و وزن هر شاخه. برای خرید میلگرد پروژه استعلام قیمت بگیرید.",
      intro:
        "میلگرد پرمصرف‌ترین مقطع فولادی در سازه‌های بتنی است. در این گروه میلگرد ساده A1 (S240) و میلگرد آجدار A2 (Aj340)، A3 (Aj400) و A4 (Aj500) طبق استاندارد ملی INSO 3132 آمده‌اند. در صفحه هر محصول، سایزهای موجود با وزن اسمی هر متر و هر شاخه درج شده است. آهن آسا خرید میلگرد را از سمت شما مدیریت می‌کند: لیست خرید یا فاکتور پروژه را بفرستید تا مشخصات، گزینه‌های تأمین و زمان تحویل بررسی و پیشنهاد خرید ارسال شود.",
    },
    ar: {
      name: "حديد التسليح",
      title: "حديد التسليح الإيراني (الشيش): الأنواع والأوزان",
      h1: "حديد التسليح",
      description: "حديد تسليح أملس A1 ومضلع A2 وA3 وA4 وفق المعيار الإيراني INSO 3132، مع المقاسات ووزن كل قضيب. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "حديد التسليح (الشيش) هو المقطع الفولاذي الأكثر استخدامًا في المنشآت الخرسانية. تضم هذه الفئة حديد التسليح الأملس A1 (S240) والمضلع A2 (Aj340) وA3 (Aj400) وA4 (Aj500) وفق المعيار الوطني الإيراني INSO 3132. في صفحة كل منتج تجد المقاسات المتاحة مع الوزن الاسمي لكل متر ولكل قضيب. أرسل قائمة الشراء ليراجع فريق آهن آسا المواصفات وخيارات التوريد وموعد التسليم.",
    },
    en: {
      name: "rebar",
      title: "Rebar from Iranian Mills — Grades A1 to A4",
      h1: "Rebar",
      description: "Plain A1 (S240) and ribbed A2, A3 and A4 rebar to INSO 3132, with sizes and nominal weight per metre and per bar. Send your purchase list to request a quote.",
      intro:
        "Rebar is the most used steel section in reinforced-concrete structures. This category covers plain rebar A1 (S240) and ribbed rebar A2 (Aj340), A3 (Aj400) and A4 (Aj500) to the Iranian national standard INSO 3132. Each product page lists the available sizes with the nominal weight per metre and per bar. Send your purchase list and Ahan Asa reviews the specification, the sourcing options and the delivery timing.",
    },
  },
  BEAM: {
    fa: {
      name: "تیرآهن",
      pricedTitle: "تیرآهن IPE و IPN: سایزها، وزن و قیمت روز",
      pricedDescription: "تیرآهن IPE و IPN طبق EN 10365، با ارتفاع مقطع، وزن هر متر و هر شاخه و قیمت روز سایزهای پرمصرف. استعلام قیمت بگیرید.",
      title: "تیرآهن IPE و IPN: سایزها و وزن",
      h1: "تیرآهن",
      description: "تیرآهن IPE و IPN طبق EN 10365، با ارتفاع مقطع و وزن هر متر و هر شاخه. برای خرید تیرآهن پروژه استعلام قیمت بگیرید.",
      intro:
        "تیرآهن مقطع اصلی ستون و تیر در اسکلت فلزی است. این گروه شامل تیرآهن IPE با بال‌های موازی و تیرآهن IPN (INP) با بال‌های شیب‌دار است که ابعاد و وزن هر دو در استاندارد EN 10365 آمده است. در صفحه هر محصول، سایزهای موجود با ارتفاع مقطع، وزن هر متر و وزن هر شاخه دیده می‌شود. برای خرید تیرآهن، لیست سایزها و مقدار را بفرستید تا آهن آسا گزینه‌های تأمین و تحویل را بررسی کند.",
    },
    ar: {
      name: "الشيلمان",
      title: "الشيلمان (كمرات IPE وIPN): المقاسات والأوزان",
      h1: "الشيلمان",
      description: "كمرات حديد IPE وIPN (الشيلمان) وفق EN 10365، مع ارتفاع المقطع والوزن لكل متر ولكل قطعة. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "الشيلمان (الكمرات الحديدية) هو المقطع الأساسي للأعمدة والجسور في الهياكل الفولاذية. تضم هذه الفئة كمرات IPE ذات الأجنحة المتوازية وكمرات IPN ذات الأجنحة المائلة، وأبعادها وأوزانها في المعيار EN 10365. في صفحة كل منتج تجد المقاسات المتاحة مع ارتفاع المقطع والوزن لكل متر ولكل قطعة. أرسل قائمة المقاسات والكميات ليراجع آهن آسا خيارات التوريد والتسليم.",
    },
    en: {
      name: "steel beams",
      title: "IPE & IPN Steel Beams — Sizes and Weights",
      h1: "Steel beams",
      description: "IPE (parallel flange) and IPN (tapered flange) steel beams to EN 10365, with section height and nominal weight per metre and per bar. Request a quote.",
      intro:
        "Steel I-beams carry columns and girders in steel frames. This category covers IPE beams with parallel flanges and IPN (INP) beams with tapered flanges; the dimensions and masses of both follow EN 10365. Each product page lists the available sizes with the section height and the nominal weight per metre and per bar. Send your size list and quantities and Ahan Asa reviews the sourcing and delivery options.",
    },
  },
  ANGLE: {
    fa: {
      name: "نبشی",
      pricedTitle: "نبشی مساوی: سایزها، وزن و قیمت روز",
      pricedDescription: "نبشی مساوی‌الاضلاع طبق استاندارد EN 10056-1، با طول بال، ضخامت، وزن هر متر و قیمت روز. استعلام قیمت بگیرید.",
      title: "نبشی مساوی: سایزها و وزن",
      h1: "نبشی",
      description: "نبشی مساوی‌الاضلاع طبق استاندارد EN 10056-1، با طول بال، ضخامت و وزن هر متر. برای خرید نبشی استعلام قیمت بگیرید.",
      intro:
        "نبشی مقطعی L شکل است که در اتصالات، بادبندها، خرپاها و سازه‌های سبک به کار می‌رود. نبشی‌های این گروه مساوی‌الاضلاع‌اند و هر سایز با طول بال و ضخامت (مثلاً ۵۰×۵۰×۵) طبق EN 10056-1 مشخص می‌شود. وزن اسمی هر متر در صفحه محصول آمده است. برای خرید نبشی، سایز، طول و مقدار مورد نیاز را در لیست خرید بفرستید تا گزینه‌های تأمین بررسی شود.",
    },
    ar: {
      name: "الزوايا",
      title: "الزاوية الحديد المتساوية: المقاسات والأوزان",
      h1: "الزوايا",
      description: "زوايا حديد متساوية الأضلاع وفق EN 10056-1، مع طول الضلع والسماكة والوزن لكل متر. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "الزاوية الحديد مقطع على شكل L يُستخدم في الوصلات والتقويات والجملونات والمنشآت الخفيفة. الزوايا في هذه الفئة متساوية الأضلاع، ويُحدَّد كل مقاس بطول الضلع والسماكة (مثل 50×50×5) وفق EN 10056-1. الوزن الاسمي لكل متر موجود في صفحة المنتج. أرسل المقاس والطول والكمية المطلوبة في قائمة الشراء ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "angles",
      title: "Equal Angle Steel — Sizes and Weights, EN 10056-1",
      h1: "Angles",
      description: "Equal-leg steel angles to EN 10056-1, with leg length, thickness and nominal weight per metre. Send your purchase list to request a quote.",
      intro:
        "Steel angles are L-shaped sections used for connections, bracing, trusses and light structures. The angles in this category are equal-leg; a size is given as leg × leg × thickness (for example 50×50×5) to EN 10056-1. The nominal weight per metre is on the product page. Send the size, length and quantity you need with your purchase list and Ahan Asa reviews the sourcing options.",
    },
  },
  CHANNEL: {
    fa: {
      name: "ناودانی",
      pricedTitle: "ناودانی UPN و UPE: سایزها، وزن و قیمت روز",
      pricedDescription: "ناودانی UPN (بال شیب‌دار) و UPE (بال موازی) طبق EN 10365، با ارتفاع مقطع، وزن هر متر و قیمت روز. استعلام قیمت بگیرید.",
      title: "ناودانی UPN و UPE: سایزها و وزن",
      h1: "ناودانی",
      description: "ناودانی UPN (بال شیب‌دار) و UPE (بال موازی) طبق EN 10365، با ارتفاع مقطع و وزن هر متر. برای خرید ناودانی استعلام قیمت بگیرید.",
      intro:
        "ناودانی مقطعی U شکل است که در قاب‌ها، تیرهای فرعی، نعل‌درگاه و سازه‌های صنعتی استفاده می‌شود. این گروه شامل ناودانی UPN با بال‌های شیب‌دار و ناودانی UPE با بال‌های موازی است و ابعاد و وزن هر دو در EN 10365 آمده است. سایزهای موجود و وزن هر متر در صفحه هر محصول درج شده است. برای خرید ناودانی، لیست سایز و مقدار را بفرستید تا آهن آسا گزینه‌های تأمین را بررسی کند.",
    },
    ar: {
      name: "المجاري",
      title: "مجاري UPN وUPE: المقاسات والأوزان",
      h1: "المجاري",
      description: "مجاري حديد UPN (أجنحة مائلة) وUPE (أجنحة متوازية) وفق EN 10365، مع ارتفاع المقطع والوزن لكل متر. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "المجرى مقطع حديدي على شكل U يُستخدم في الإطارات والجسور الثانوية والمنشآت الصناعية. تضم هذه الفئة مجاري UPN ذات الأجنحة المائلة ومجاري UPE ذات الأجنحة المتوازية، وأبعادها وأوزانها في المعيار EN 10365. المقاسات المتاحة والوزن لكل متر في صفحة كل منتج. أرسل قائمة المقاسات والكميات ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "channels",
      title: "UPN & UPE Channels — Sizes and Weights",
      h1: "Channels",
      description: "UPN (tapered flange) and UPE (parallel flange) steel channels to EN 10365, with section height and nominal weight per metre. Request a quote.",
      intro:
        "Channels are U-shaped sections used in frames, secondary beams, lintels and industrial structures. This category covers UPN channels with tapered flanges and UPE channels with parallel flanges; the dimensions and masses of both follow EN 10365. The available sizes and the weight per metre are on each product page. Send your size list and quantities and Ahan Asa reviews the sourcing options.",
    },
  },
  BOX_SECTION: {
    fa: {
      name: "قوطی و پروفیل",
      pricedTitle: "قوطی و پروفیل ساختمانی: سایز، وزن و قیمت روز",
      pricedDescription: "قوطی مربع (SHS) و مستطیل (RHS) طبق EN 10219-2 با ابعاد و ضخامت‌های مختلف، وزن هر شاخه و قیمت روز. استعلام قیمت بگیرید.",
      title: "قوطی و پروفیل ساختمانی: سایز و وزن",
      h1: "قوطی و پروفیل",
      description: "قوطی مربع (SHS) و مستطیل (RHS) طبق EN 10219-2 با ابعاد و ضخامت‌های مختلف و وزن هر شاخه. برای خرید قوطی استعلام قیمت بگیرید.",
      intro:
        "قوطی یا پروفیل ساختمانی مقطع توخالی جوشی سردشکل‌داده‌شده است که در ستون‌های سبک، خرپا، سوله، نرده و سازه‌های فلزی به کار می‌رود. این گروه شامل قوطی مربع (SHS) و قوطی مستطیل (RHS) طبق EN 10219-2 است و هر سایز با ابعاد بیرونی و ضخامت دیواره مشخص می‌شود. وزن اسمی هر متر و هر شاخه در صفحه هر محصول آمده است. لیست سایز، ضخامت و مقدار را بفرستید تا گزینه‌های تأمین بررسی شود.",
    },
    ar: {
      name: "الحديد المربع والمستطيل",
      title: "الحديد المربع والمستطيل (علب): المقاسات والأوزان",
      h1: "الحديد المربع والمستطيل",
      description: "حديد مربع (SHS) ومستطيل (RHS) مجوف وفق EN 10219-2 بأبعاد وسماكات مختلفة، مع الوزن لكل قطعة. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "الحديد المربع والمستطيل (العلب) مقاطع مجوفة ملحومة مشكّلة على البارد، تُستخدم في الأعمدة الخفيفة والجملونات والهناجر والأسوار والهياكل المعدنية. تضم هذه الفئة المقاطع المربعة (SHS) والمستطيلة (RHS) وفق EN 10219-2، ويُحدَّد كل مقاس بالأبعاد الخارجية وسماكة الجدار. الوزن الاسمي لكل متر ولكل قطعة في صفحة كل منتج. أرسل المقاسات والسماكات والكميات ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "hollow sections",
      title: "Square & Rectangular Hollow Sections (SHS/RHS)",
      h1: "Hollow sections",
      description: "Cold-formed welded square (SHS) and rectangular (RHS) hollow sections to EN 10219-2, with dimensions, wall thickness and nominal weight per bar. Request a quote.",
      intro:
        "Hollow sections are cold-formed welded tubes used in light columns, trusses, sheds, railings and steel structures. This category covers square (SHS) and rectangular (RHS) sections to EN 10219-2; each size is given by its outside dimensions and wall thickness. The nominal weights per metre and per bar are on each product page. Send sizes, thicknesses and quantities and Ahan Asa reviews the sourcing options.",
    },
  },
  SHEET_PLATE: {
    fa: {
      name: "ورق",
      pricedTitle: "ورق سیاه و ورق ضخیم: ST37، ST52 و قیمت روز",
      pricedDescription: "ورق سیاه گرم‌نورد و ورق ضخیم (پلیت) S235JR (ST37) و S355JR (ST52) طبق EN 10051 و EN 10029، با وزن هر ورق و قیمت روز.",
      title: "ورق سیاه و ورق ضخیم ST37 و ST52: ضخامت و وزن",
      h1: "ورق فولادی",
      description: "ورق سیاه گرم‌نورد و ورق ضخیم (پلیت) S235JR (ST37) و S355JR (ST52) طبق EN 10051 و EN 10029، با وزن هر ورق. استعلام قیمت بگیرید.",
      intro:
        "ورق سیاه گرم‌نورد در ساخت مخزن، شاسی، سوله و قطعات صنعتی و ورق ضخیم (پلیت) در صفحه ستون، ستون‌های ساخته‌شده و سازه‌های سنگین به کار می‌رود. این گروه ورق‌های گرید S235JR (معادل ST37) و S355JR (معادل ST52) را در ضخامت‌ها و عرض‌های مختلف دربرمی‌گیرد و تلرانس‌ها طبق EN 10051 و EN 10029 است. وزن اسمی هر ورق در صفحه هر محصول آمده است. برای خرید ورق، ضخامت، ابعاد، گرید و مقدار را بفرستید.",
    },
    ar: {
      name: "الصاج",
      title: "الصاج والألواح الفولاذية S235JR وS355JR",
      h1: "الصاج والألواح",
      description: "صاج حديد مدرفل على الساخن وألواح سميكة بدرجة S235JR وS355JR وفق EN 10051 وEN 10029، مع وزن كل لوح. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "يُستخدم الصاج المدرفل على الساخن في الخزانات والشاسيهات والهناجر والقطع الصناعية، وتُستخدم الألواح السميكة في قواعد الأعمدة والمنشآت الثقيلة. تضم هذه الفئة الدرجتين S235JR (تعادل ST37) وS355JR (تعادل ST52) بسماكات وعروض مختلفة، والتفاوتات وفق EN 10051 وEN 10029. الوزن الاسمي لكل لوح في صفحة كل منتج. أرسل السماكة والأبعاد والدرجة والكمية ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "sheet and plate",
      title: "Hot-Rolled Steel Sheet & Plate — S235JR, S355JR",
      h1: "Sheet & plate",
      description: "Hot-rolled steel sheet and plate in S235JR (ST37) and S355JR (ST52), tolerances to EN 10051 and EN 10029, with nominal weight per sheet. Request a quote.",
      intro:
        "Hot-rolled sheet is used for tanks, chassis, sheds and fabricated parts; thicker plate for base plates, built-up columns and heavy structures. This category covers the grades S235JR (equivalent to ST37) and S355JR (equivalent to ST52) in a range of thicknesses and widths, with tolerances to EN 10051 and EN 10029. The nominal weight per sheet is on each product page. Send thickness, dimensions, grade and quantity to request a quote.",
    },
  },
  PIPE: {
    fa: {
      name: "لوله مانیسمان",
      pricedTitle: "لوله مانیسمان (بدون درز) A106: سایز، وزن و قیمت روز",
      pricedDescription: "لوله بدون درز (مانیسمان) ASTM A106 گرید B با ابعاد ASME B36.10M (رده ۴۰)، با قطر خارجی، ضخامت، وزن هر متر و قیمت روز.",
      title: "لوله مانیسمان (بدون درز) A106: سایز و وزن",
      h1: "لوله فولادی",
      description: "لوله بدون درز (مانیسمان) ASTM A106 گرید B با ابعاد ASME B36.10M (رده ۴۰)، با قطر خارجی، ضخامت و وزن هر متر. استعلام قیمت بگیرید.",
      intro:
        "لوله بدون درز یا مانیسمان در خطوط انتقال سیالات، تأسیسات صنعتی و سازه به کار می‌رود. لوله این گروه ASTM A106 گرید B است و قطر خارجی و ضخامت دیواره آن طبق ASME B36.10M در رده (اسکجول) ۴۰ آمده است. وزن اسمی هر متر و هر شاخه در صفحه محصول درج شده است. برای خرید لوله، قطر، رده، طول و مقدار مورد نیاز را بفرستید تا آهن آسا گزینه‌های تأمین را بررسی کند.",
    },
    ar: {
      name: "الأنابيب",
      title: "أنابيب غير ملحومة ASTM A106: المقاسات والأوزان",
      h1: "الأنابيب",
      description: "أنابيب فولاذية غير ملحومة ASTM A106 درجة B بأبعاد ASME B36.10M (SCH 40)، مع القطر الخارجي والسماكة والوزن لكل متر. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "تُستخدم الأنابيب غير الملحومة في خطوط نقل السوائل والمنشآت الصناعية والهياكل. أنابيب هذه الفئة من مادة ASTM A106 درجة B، وقطرها الخارجي وسماكة جدارها وفق ASME B36.10M بجدول (SCH) 40. الوزن الاسمي لكل متر ولكل قطعة في صفحة المنتج. أرسل القطر والجدول والطول والكمية المطلوبة ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "steel pipe",
      title: "Seamless Steel Pipe ASTM A106 Grade B — SCH 40",
      h1: "Steel pipe",
      description: "Seamless steel pipe, ASTM A106 Grade B, dimensions to ASME B36.10M (SCH 40), with outside diameter, wall thickness and nominal weight per metre. Request a quote.",
      intro:
        "Seamless pipe is used in fluid lines, industrial plants and structures. The pipe in this category is ASTM A106 Grade B, with outside diameter and wall thickness to ASME B36.10M, schedule 40. The nominal weights per metre and per length are on the product page. Send the diameter, schedule, length and quantity you need and Ahan Asa reviews the sourcing options.",
    },
  },
};

/** The page copy of a category in a locale; `priced` = the family has prices today (fa title/meta only). */
export function categorySeo(code: string, locale: Locale, priced: boolean): (CategorySeoCopy & { name: string }) | null {
  const entry = CATEGORY_SEO[code]?.[locale];
  if (!entry) return null;
  const usePriced = priced && entry.pricedTitle !== undefined;
  return {
    name: entry.name,
    title: usePriced ? entry.pricedTitle! : entry.title,
    h1: entry.h1,
    description: usePriced ? (entry.pricedDescription ?? entry.description) : entry.description,
    intro: entry.intro,
  };
}

/** Link labels of the category intro (to the family price hub and the calculator). */
export const CATEGORY_LINK_COPY: Record<Locale, { hub: (name: string) => string; calculator: (name: string) => string; heading: string }> = {
  fa: { hub: (n) => `قیمت روز ${n}`, calculator: (n) => `محاسبه وزن ${n}`, heading: "درباره این گروه" },
  ar: { hub: (n) => `سعر ${n} اليوم`, calculator: (n) => `حساب وزن ${n}`, heading: "عن هذه الفئة" },
  en: { hub: () => "", calculator: (n) => `Weight calculator for ${n}`, heading: "About this category" },
};
