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
 * W17.4: the four W9.8 flat categories do state their thickness and width ranges (owner instruction
 * 2026-10-14) — taken from the Odoo catalog source (ahanassa_catalog_flat_raw tools/build_catalog.py).
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
  // W17.4 — the W9.8 flat categories (Odoo ahanassa_catalog_flat_raw). Facts are the catalog's own: grade,
  // standard, thickness and width ranges of the six templates (tools/build_catalog.py); coils are sold by
  // actual weight. Market words next to the formal term: رول/کلاف، شیت، ST37، ST12، روغنی. No price hub yet,
  // so the fa title is the unpriced one until a hub is added (lib/pricing/price-hubs.ts).
  GALVANIZED_SHEET: {
    fa: {
      name: "ورق گالوانیزه",
      pricedTitle: "ورق گالوانیزه رول و شیت DX51D+Z: ضخامت و قیمت روز",
      pricedDescription: "ورق گالوانیزه گرم رول (کلاف) و شیت با گرید DX51D+Z طبق EN 10346، ضخامت ۰٫۴ تا ۳ میلی‌متر، عرض ۱۰۰۰ و ۱۲۵۰، با قیمت روز ورق گالوانیزه رول.",
      title: "ورق گالوانیزه رول و شیت DX51D+Z: ضخامت و ابعاد",
      h1: "ورق گالوانیزه",
      description: "ورق گالوانیزه گرم رول (کلاف) و شیت با گرید DX51D+Z طبق EN 10346، ضخامت ۰٫۴ تا ۳ میلی‌متر و عرض ۱۰۰۰ یا ۱۲۵۰. برای خرید ورق گالوانیزه استعلام بگیرید.",
      intro:
        "ورق گالوانیزه ورق فولادی با پوشش روی است که به روش غوطه‌وری گرم تولید می‌شود و در کانال کولر، سقف و دیوار سوله، لوازم خانگی و قطعات صنعتی به کار می‌رود. این گروه ورق گالوانیزه رول (کلاف) و ورق گالوانیزه شیت (برش‌خورده) با گرید DX51D+Z طبق استاندارد EN 10346 را دربرمی‌گیرد؛ ضخامت از ۰٫۴ تا ۳ میلی‌متر، عرض رول ۱۰۰۰ یا ۱۲۵۰ میلی‌متر و ابعاد شیت ۱۰۰۰×۲۰۰۰ یا ۱۲۵۰×۲۵۰۰ میلی‌متر است. رول بر اساس وزن واقعی (باسکول) فروخته می‌شود. ضخامت، عرض یا ابعاد، وزن پوشش و مقدار را بفرستید.",
    },
    ar: {
      name: "الصاج المجلفن",
      title: "الصاج المجلفن لفائف وألواح DX51D+Z: السماكات",
      h1: "الصاج المجلفن",
      description: "صاج مجلفن بالغمس الساخن، لفائف وألواح مقطوعة بدرجة DX51D+Z وفق EN 10346، بسماكة من 0.4 إلى 3 مم وعرض 1000 أو 1250 مم. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "الصاج المجلفن صاج فولاذي مطلي بالزنك بطريقة الغمس الساخن، ويُستخدم في مجاري التكييف وأسقف وجدران الهناجر والأجهزة المنزلية والقطع الصناعية. تضم هذه الفئة لفائف الصاج المجلفن والألواح المقطوعة بدرجة DX51D+Z وفق المعيار EN 10346، بسماكة من 0.4 إلى 3 مم، وعرض اللفّ 1000 أو 1250 مم، ومقاس الألواح 1000×2000 أو 1250×2500 مم. تُباع اللفائف حسب الوزن الفعلي على الميزان. أرسل السماكة والعرض أو المقاس وكتلة الطلاء والكمية ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "galvanized steel",
      title: "Galvanized Steel Coil & Sheet DX51D+Z — EN 10346",
      h1: "Galvanized steel",
      description: "Hot-dip galvanized steel coil and cut sheet, grade DX51D+Z to EN 10346, 0.4 to 3 mm thick, 1000 or 1250 mm wide. Send your list to request a quote.",
      intro:
        "Galvanized steel is zinc-coated by hot dipping and is used for air ducts, shed roofing and cladding, household appliances and fabricated parts. This category covers galvanized coil and cut-to-length sheet in grade DX51D+Z to EN 10346, 0.4 to 3 mm thick; coils are 1000 or 1250 mm wide and sheets 1000×2000 or 1250×2500 mm. Coils are sold by actual weighbridge weight. Send thickness, width or sheet size, coating mass and quantity and Ahan Asa reviews the sourcing options.",
    },
  },
  PREPAINTED_SHEET: {
    fa: {
      name: "ورق رنگی",
      pricedTitle: "ورق رنگی (PPGI) رول پایه DX51D+Z: رنگ‌ها و قیمت روز",
      pricedDescription: "ورق رنگی پیش‌رنگ‌شده (PPGI) رول با پایه گالوانیزه DX51D+Z و رنگ طبق EN 10169، ضخامت ۰٫۴ تا ۰٫۷ میلی‌متر و عرض ۱۲۵۰، با قیمت روز.",
      title: "ورق رنگی (PPGI) رول پایه DX51D+Z: ضخامت و رنگ‌ها",
      h1: "ورق رنگی (PPGI)",
      description: "ورق رنگی پیش‌رنگ‌شده (PPGI) رول با پایه گالوانیزه DX51D+Z طبق EN 10346 و رنگ طبق EN 10169، ضخامت ۰٫۴ تا ۰٫۷ میلی‌متر و عرض ۱۲۵۰. استعلام قیمت بگیرید.",
      intro:
        "ورق رنگی یا ورق پیش‌رنگ‌شده (PPGI) ورق گالوانیزه‌ای است که در کارخانه رنگ می‌شود و در سقف و دیوار سوله، ساندویچ پانل، کانکس و لوازم خانگی به کار می‌رود. این گروه ورق رنگی رول (کلاف) با پایه گالوانیزه DX51D+Z طبق EN 10346 و سیستم رنگ طبق EN 10169 را دربرمی‌گیرد؛ ضخامت ۰٫۴ تا ۰٫۷ میلی‌متر، عرض ۱۲۵۰ میلی‌متر و شش رنگ: آبی، سفید، سفید یخچالی، قرمز، نارنجی و قهوه‌ای. فروش بر اساس وزن واقعی است. رنگ، عرض یا نوع رنگ دیگر را در درخواست بنویسید.",
    },
    ar: {
      name: "الصاج المطلي",
      title: "الصاج المطلي مسبقاً (PPGI) لفائف DX51D+Z: الألوان",
      h1: "الصاج المطلي مسبقاً (PPGI)",
      description: "لفائف صاج مجلفن مطلي مسبقاً (PPGI) بأساس DX51D+Z وفق EN 10346 وطلاء وفق EN 10169، بسماكة من 0.4 إلى 0.7 مم وعرض 1250 مم. أرسل قائمة الشراء لطلب عرض.",
      intro:
        "الصاج المطلي مسبقاً (PPGI) صاج مجلفن يُطلى في المصنع، ويُستخدم في أسقف وجدران الهناجر والألواح المعزولة (ساندويتش بانل) والكرفانات والأجهزة المنزلية. تضم هذه الفئة لفائف الصاج المطلي بأساس مجلفن بدرجة DX51D+Z وفق EN 10346 ونظام طلاء وفق EN 10169، بسماكة من 0.4 إلى 0.7 مم وعرض 1250 مم، بستة ألوان: الأزرق والأبيض وأبيض الأجهزة والأحمر والبرتقالي والبني. تُباع حسب الوزن الفعلي. اذكر في طلبك أي لون أو عرض أو نظام طلاء آخر ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "pre-painted steel",
      title: "Pre-Painted Galvanized Steel Coil (PPGI) — DX51D+Z",
      h1: "Pre-painted steel (PPGI)",
      description: "Pre-painted galvanized steel coil (PPGI), DX51D+Z base to EN 10346, paint system to EN 10169, 0.4 to 0.7 mm thick, 1250 mm wide. Request a quote.",
      intro:
        "Pre-painted galvanized steel (PPGI) is galvanized coil painted at the mill, used for shed roofing and cladding, sandwich panels, portable cabins and household appliances. This category covers PPGI coil on a DX51D+Z galvanized base to EN 10346 with a paint system to EN 10169, 0.4 to 0.7 mm thick and 1250 mm wide, in six colours: blue, white, appliance white, red, orange and brown. It is sold by actual weight. Name any other colour, width or paint system in your request and Ahan Asa reviews the sourcing options.",
    },
  },
  HOT_ROLLED_COIL: {
    fa: {
      name: "ورق سیاه رول",
      pricedTitle: "ورق سیاه رول (کلاف گرم) ST37: ضخامت، عرض و قیمت روز",
      pricedDescription: "ورق سیاه رول یا کلاف گرم با گرید S235JR (ST37) و تلرانس طبق EN 10051، ضخامت ۲ تا ۱۵ میلی‌متر، عرض ۱۰۰۰، ۱۲۵۰ و ۱۵۰۰، با قیمت روز.",
      title: "ورق سیاه رول (کلاف گرم) S235JR (ST37): ضخامت و عرض",
      h1: "ورق سیاه رول (کلاف گرم)",
      description: "ورق سیاه رول یا کلاف گرم‌نورد با گرید S235JR (ST37) و تلرانس طبق EN 10051، ضخامت ۲ تا ۱۵ میلی‌متر، عرض ۱۰۰۰، ۱۲۵۰ یا ۱۵۰۰. استعلام قیمت بگیرید.",
      intro:
        "ورق سیاه رول یا کلاف گرم، ورق فولادی گرم‌نوردی است که به‌صورت کلاف عرضه می‌شود و برای لوله‌سازی، پروفیل‌سازی، برش به ورق و ساخت قطعات صنعتی به کار می‌رود. این گروه کلاف گرم با گرید S235JR (معادل ST37) و تلرانس ابعادی طبق EN 10051 را دربرمی‌گیرد؛ ضخامت از ۲ تا ۱۵ میلی‌متر و عرض ۱۰۰۰، ۱۲۵۰ یا ۱۵۰۰ میلی‌متر است. کلاف بر اساس وزن واقعی (باسکول) فروخته می‌شود و وزن هر کلاف معمولاً ۳ تا ۲۵ تن است. ضخامت، عرض، مقدار و کارخانه مورد نظر را بفرستید.",
    },
    ar: {
      name: "لفائف الصاج الأسود",
      title: "لفائف الصلب المدرفلة على الساخن S235JR (ST37)",
      h1: "لفائف الصلب المدرفلة على الساخن",
      description: "لفائف صلب مدرفلة على الساخن (HRC) بدرجة S235JR (ST37) وتفاوتات وفق EN 10051، بسماكة من 2 إلى 15 مم وعرض 1000 أو 1250 أو 1500 مم. أرسل قائمتك لطلب عرض.",
      intro:
        "لفائف الصلب المدرفلة على الساخن (HRC) صاج أسود يُورَّد على شكل لفائف، ويُستخدم في صناعة الأنابيب والمقاطع والتقطيع إلى ألواح وتصنيع القطع الصناعية. تضم هذه الفئة لفائف بدرجة S235JR (تعادل ST37) بتفاوتات أبعاد وفق EN 10051، بسماكة من 2 إلى 15 مم وعرض 1000 أو 1250 أو 1500 مم. تُباع اللفائف حسب الوزن الفعلي على الميزان، ويزن اللفّ عادةً من 3 إلى 25 طناً. أرسل السماكة والعرض والكمية والمصنع المفضل ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "hot-rolled coil",
      title: "Hot-Rolled Steel Coil (HRC) S235JR — EN 10051",
      h1: "Hot-rolled coil (HRC)",
      description: "Hot-rolled steel coil (HRC) in grade S235JR (ST37), tolerances to EN 10051, 2 to 15 mm thick and 1000, 1250 or 1500 mm wide. Send your list to request a quote.",
      intro:
        "Hot-rolled coil is black steel strip supplied in coils, used for pipe and section making, cutting to sheet and fabricated parts. This category covers coil in grade S235JR (equivalent to ST37) with dimensional tolerances to EN 10051, 2 to 15 mm thick and 1000, 1250 or 1500 mm wide. Coils are sold by actual weighbridge weight; a coil usually weighs 3 to 25 tonnes. Send thickness, width, quantity and the preferred mill and Ahan Asa reviews the sourcing options.",
    },
  },
  COLD_ROLLED: {
    fa: {
      name: "ورق روغنی",
      pricedTitle: "ورق روغنی (نورد سرد) DC01 / ST12: رول، شیت و قیمت روز",
      pricedDescription: "ورق روغنی سردنورد رول (کلاف) و شیت با گرید DC01 (ST12) طبق EN 10130، ضخامت ۰٫۴ تا ۲ میلی‌متر، عرض ۱۰۰۰ و ۱۲۵۰، با قیمت روز رول.",
      title: "ورق روغنی (نورد سرد) DC01 / ST12: رول، شیت و ضخامت",
      h1: "ورق روغنی (نورد سرد)",
      description: "ورق روغنی سردنورد رول (کلاف) و شیت با گرید DC01 (معادل ST12) طبق EN 10130، ضخامت ۰٫۴ تا ۲ میلی‌متر و عرض ۱۰۰۰ یا ۱۲۵۰. استعلام قیمت بگیرید.",
      intro:
        "ورق روغنی یا ورق سردنورد، ورق فولادی نازک با سطح صاف است که پس از نورد سرد روغن‌کاری می‌شود و در لوازم خانگی، بدنه تابلو برق، قطعات خودرو و مبلمان فلزی به کار می‌رود. این گروه ورق روغنی رول (کلاف سرد) با ضخامت ۰٫۴ تا ۲ میلی‌متر و عرض ۱۰۰۰ یا ۱۲۵۰ میلی‌متر و ورق روغنی شیت با ضخامت ۰٫۵ تا ۲ میلی‌متر در ابعاد ۱۰۰۰×۲۰۰۰ یا ۱۲۵۰×۲۵۰۰ میلی‌متر را دربرمی‌گیرد؛ گرید DC01 (معادل ST12) طبق EN 10130. فروش بر اساس وزن واقعی است.",
    },
    ar: {
      name: "الصاج المدرفل على البارد",
      title: "الصاج المدرفل على البارد DC01 (ST12): لفائف وألواح",
      h1: "الصاج المدرفل على البارد",
      description: "صاج مدرفل على البارد ومزيّت، لفائف وألواح مقطوعة بدرجة DC01 (ST12) وفق EN 10130، بسماكة من 0.4 إلى 2 مم وعرض 1000 أو 1250 مم. أرسل قائمتك لطلب عرض.",
      intro:
        "الصاج المدرفل على البارد صاج فولاذي رقيق ذو سطح أملس يُزيَّت بعد الدرفلة الباردة، ويُستخدم في الأجهزة المنزلية وهياكل اللوحات الكهربائية وقطع السيارات والأثاث المعدني. تضم هذه الفئة لفائف بسماكة من 0.4 إلى 2 مم وعرض 1000 أو 1250 مم، وألواحاً مقطوعة بسماكة من 0.5 إلى 2 مم بمقاس 1000×2000 أو 1250×2500 مم، بدرجة DC01 (تعادل ST12) وفق EN 10130. تُباع حسب الوزن الفعلي. أرسل السماكة والعرض أو المقاس والكمية ليراجع آهن آسا خيارات التوريد.",
    },
    en: {
      name: "cold-rolled steel",
      title: "Cold-Rolled Steel Coil & Sheet DC01 (ST12) — EN 10130",
      h1: "Cold-rolled steel (CRC)",
      description: "Cold-rolled, oiled steel coil and cut sheet in grade DC01 (ST12) to EN 10130, 0.4 to 2 mm thick, 1000 or 1250 mm wide. Send your list to request a quote.",
      intro:
        "Cold-rolled steel is thin, smooth-surfaced sheet that is oiled after cold rolling, used for household appliances, electrical cabinets, automotive parts and metal furniture. This category covers coil 0.4 to 2 mm thick and 1000 or 1250 mm wide, and cut-to-length sheet 0.5 to 2 mm thick in 1000×2000 or 1250×2500 mm, in grade DC01 (equivalent to ST12) to EN 10130. It is sold by actual weight. Send thickness, width or sheet size and quantity and Ahan Asa reviews the sourcing options.",
    },
  },
};

/**
 * W17.4: categories the weight calculator cannot compute (it has no coil or coated-sheet shape,
 * lib/weight-calculator/model.ts FORM_SHAPES) — their pages never link to it as if it could.
 */
export const CATEGORIES_WITHOUT_CALCULATOR: ReadonlySet<string> = new Set(["GALVANIZED_SHEET", "PREPAINTED_SHEET", "HOT_ROLLED_COIL", "COLD_ROLLED"]);

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
