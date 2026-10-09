import type { Locale } from "../../config/locales.ts";
import type { ShapeKind } from "./model.ts";
import { STANDARDS } from "./standards.ts";

/**
 * Weight calculator copy (W10.1). fa is the source text. The en and ar
 * strings are DRAFTS awaiting owner approval (PROJECT_OVERRIDES.md §1: no
 * machine-made final translations) — listed as such in the W10.1 PR.
 *
 * Digits inside the copy are written in each locale's own digits (fa
 * Persian, ar Arabic-Indic, en ASCII); formula symbols (d, t, A, π) and
 * standard numbers stay Latin on every locale. Arabic text uses Arabic
 * letters only (ي/ك, never Persian ی/ک) — the leak scan flags Persian
 * letters on ar pages, and weight-calculator.test.ts checks it here first.
 * Latin formulas inside fa/ar lines are wrapped in Unicode direction isolates
 * (U+2066 … U+2069) so the RTL paragraph cannot reorder their symbols.
 */
export interface WeightCalculatorCopy {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  body: string;
  formTitle: string;
  product: string;
  size: string;
  customSize: string;
  tableSize: (size: string) => string;
  length: string;
  quantity: string;
  unit: string;
  piece: Record<"bar" | "sheet", string>;
  kg: string;
  ton: string;
  fields: Record<ShapeKind, Record<string, string>>;
  resultTitle: string;
  perMetre: string;
  perSquareMetre: string;
  perPiece: Record<"bar" | "sheet", string>;
  pieces: Record<"bar" | "sheet", string>;
  piecesNeeded: Record<"bar" | "sheet", string>;
  exactPieces: (value: string) => string;
  total: string;
  totalTon: string;
  unitKgPerMetre: string;
  unitKgPerSquareMetre: string;
  unitKg: string;
  unitTon: string;
  source: Record<"catalog" | "table" | "formula", string>;
  invalid: string;
  rfqCta: string;
  rfqCustomNote: string;
  rfqCustomLink: string;
  /** «برآورد هزینه با قیمت <تاریخ>، شامل ارزش افزوده» — split around the date, which renders as a <time>. */
  priceLabel: { before: string; after: string };
  priceUnit: string;
  priceDisclaimer: string;
  basisTitle: string;
  basisCatalog: string;
  basis: Record<"rebar" | "plate" | "hollow" | "pipe" | "angle" | "channel" | "beam", string>;
  basisRounding: string;
  standardsTitle: string;
}

const fa: WeightCalculatorCopy = {
  metaTitle: "محاسبه وزن آهن‌آلات",
  metaDescription: "وزن اسمی میلگرد، تیرآهن، ناودانی، نبشی، قوطی، لوله و ورق را برای هر متر، هر شاخه و کل سفارش محاسبه کنید؛ بر پایه کاتالوگ آهن آسا و جدول‌های استاندارد.",
  eyebrow: "محاسبه‌گر وزن",
  title: "محاسبه وزن آهن‌آلات",
  body: "مقطع و سایز را انتخاب کنید و تعداد، کیلوگرم یا تن را وارد کنید تا وزن اسمی هر متر، هر شاخه و کل سفارش را ببینید.",
  formTitle: "مشخصات کالا",
  product: "مقطع",
  size: "سایز",
  customSize: "ابعاد دلخواه (محاسبه با فرمول)",
  tableSize: (size) => `${size} (جدول استاندارد)`,
  length: "طول هر شاخه (متر)",
  quantity: "مقدار",
  unit: "واحد مقدار",
  piece: { bar: "شاخه", sheet: "ورق" },
  kg: "کیلوگرم",
  ton: "تن",
  fields: {
    rebar: { d: "قطر (میلی‌متر)" },
    plate: { t: "ضخامت (میلی‌متر)", w: "عرض (میلی‌متر)", l: "طول (میلی‌متر)" },
    shs: { a: "ضلع (میلی‌متر)", t: "ضخامت (میلی‌متر)" },
    rhs: { h: "ارتفاع (میلی‌متر)", b: "عرض (میلی‌متر)", t: "ضخامت (میلی‌متر)" },
    pipe: { D: "قطر خارجی (میلی‌متر)", t: "ضخامت جداره (میلی‌متر)" },
    angle: { b: "طول بال (میلی‌متر)", t: "ضخامت (میلی‌متر)" },
    channel: { h: "ارتفاع (میلی‌متر)", b: "عرض بال (میلی‌متر)", tw: "ضخامت جان (میلی‌متر)", tf: "ضخامت بال (میلی‌متر)", r: "شعاع ریشه (میلی‌متر، اختیاری)" },
    ipe: {},
    ipn: {},
  },
  resultTitle: "نتیجه محاسبه",
  perMetre: "وزن هر متر",
  perSquareMetre: "وزن هر متر مربع",
  perPiece: { bar: "وزن هر شاخه", sheet: "وزن هر ورق" },
  pieces: { bar: "تعداد شاخه", sheet: "تعداد ورق" },
  piecesNeeded: { bar: "تعداد شاخه لازم", sheet: "تعداد ورق لازم" },
  exactPieces: (value) => `دقیق: ${value}؛ رو به بالا گرد شده`,
  total: "وزن کل",
  totalTon: "وزن کل به تن",
  unitKgPerMetre: "کیلوگرم/متر",
  unitKgPerSquareMetre: "کیلوگرم/متر مربع",
  unitKg: "کیلوگرم",
  unitTon: "تن",
  source: { catalog: "مقدار کاتالوگ", table: "جدول استاندارد EN 10365", formula: "محاسبه با فرمول" },
  invalid: "برای دیدن نتیجه، همه مقدارها را با عدد مثبت وارد کنید (تعداد به صورت عدد صحیح).",
  rfqCta: "استعلام برای همین مقدار",
  rfqCustomNote: "سایزهای خارج از کاتالوگ را با مشخصات کامل در فرم درخواست بنویسید.",
  rfqCustomLink: "رفتن به فرم درخواست",
  priceLabel: { before: "برآورد هزینه با قیمت ", after: "، شامل ارزش افزوده" },
  priceUnit: "تومان",
  priceDisclaimer: "برآورد تقریبی بر پایه وزن اسمی و قیمت همان تاریخ است و پیش‌فاکتور نیست؛ برای قیمت روز استعلام بگیرید.",
  basisTitle: "مبنای محاسبه",
  basisCatalog: "«مقدار کاتالوگ»: هر جا کاتالوگ آهن آسا وزن اسمی همان کالا را دارد، همان عدد به کار می‌رود.",
  basis: {
    rebar: "میلگرد: وزن هر متر = \u2066d² ÷ ۱۶۲\u2069 (d قطر به میلی‌متر) — ISO 6935-2 / INSO 3132.",
    plate: "ورق: وزن = ضخامت (mm) × عرض (m) × طول (m) × ۷٫۸۵ کیلوگرم بر دسی‌متر مکعب — EN 10029 / EN 10051.",
    hollow: "قوطی و پروفیل: \u2066A = 2t(B + H − 2t) − (4 − π)(ro² − ri²)\u2069 با شعاع گوشه‌های پیوست B استاندارد، چگالی ۷۸۵۰ کیلوگرم بر متر مکعب — EN 10219-2.",
    pipe: "لوله: وزن هر متر = \u2066۰٫۰۲۴۶۶۱۵ × (D − t) × t\u2069، یعنی چگالی ۷۸۵۰ کیلوگرم بر متر مکعب — ASME B36.10M.",
    angle: "نبشی: \u2066A = t(2b − t)\u2069 بدون شعاع گوشه‌ها (حدود ۱٪ کمتر از جدول استاندارد)، چگالی ۷۸۵۰ کیلوگرم بر متر مکعب — EN 10056-1.",
    channel: "ناودانی: \u2066A = 2·b·tf + (h − 2tf)·tw + 2(1 − π/4)r²\u2069، چگالی ۷۸۵۰ کیلوگرم بر متر مکعب — ابعاد EN 10365.",
    beam: "تیرآهن IPE و IPN: فقط از جدول وزن واحد طول EN 10365؛ از ابعاد محاسبه نمی‌شود.",
  },
  basisRounding:
    "گرد کردن: محاسبه با دقت کامل انجام می‌شود و فقط عدد نمایش‌داده‌شده گرد می‌شود (نیم به بالا): وزن هر متر تا ۳ رقم اعشار، وزن هر شاخه یا ورق تا ۲ رقم، وزن کل تا ۱ رقم و تن تا ۳ رقم. تعداد لازم برای رسیدن به یک وزن به عدد صحیح بالاتر گرد می‌شود. برآورد هزینه تا نزدیک‌ترین ۱٬۰۰۰ تومان گرد می‌شود.",
  standardsTitle: "استانداردها",
};

const en: WeightCalculatorCopy = {
  metaTitle: "Steel weight calculator",
  metaDescription: "Calculate the nominal weight of rebar, beams, channels, angles, hollow sections, pipe and plate per metre, per piece and for the whole order — from the Ahan Asa catalog and standard tables.",
  eyebrow: "Weight calculator",
  title: "Steel weight calculator",
  body: "Choose the section and size, then enter pieces, kilograms or tonnes to see the nominal weight per metre, per piece and for the whole order.",
  formTitle: "Item details",
  product: "Section",
  size: "Size",
  customSize: "Custom dimensions (formula)",
  tableSize: (size) => `${size} (standard table)`,
  length: "Length of one bar (m)",
  quantity: "Quantity",
  unit: "Quantity unit",
  piece: { bar: "pc", sheet: "sheet(s)" },
  kg: "kg",
  ton: "tonnes",
  fields: {
    rebar: { d: "Diameter (mm)" },
    plate: { t: "Thickness (mm)", w: "Width (mm)", l: "Length (mm)" },
    shs: { a: "Side (mm)", t: "Thickness (mm)" },
    rhs: { h: "Height (mm)", b: "Width (mm)", t: "Thickness (mm)" },
    pipe: { D: "Outside diameter (mm)", t: "Wall thickness (mm)" },
    angle: { b: "Leg length (mm)", t: "Thickness (mm)" },
    channel: { h: "Height (mm)", b: "Flange width (mm)", tw: "Web thickness (mm)", tf: "Flange thickness (mm)", r: "Root radius (mm, optional)" },
    ipe: {},
    ipn: {},
  },
  resultTitle: "Result",
  perMetre: "Weight per metre",
  perSquareMetre: "Weight per square metre",
  perPiece: { bar: "Weight per piece", sheet: "Weight per sheet" },
  pieces: { bar: "Pieces", sheet: "Sheets" },
  piecesNeeded: { bar: "Pieces needed", sheet: "Sheets needed" },
  exactPieces: (value) => `exact: ${value}; rounded up`,
  total: "Total weight",
  totalTon: "Total weight in tonnes",
  unitKgPerMetre: "kg/m",
  unitKgPerSquareMetre: "kg/m²",
  unitKg: "kg",
  unitTon: "t",
  source: { catalog: "Catalog value", table: "EN 10365 standard table", formula: "Formula" },
  invalid: "Enter positive numbers in every field to see the result (pieces as a whole number).",
  rfqCta: "Request a quote for this quantity",
  rfqCustomNote: "For sizes outside the catalog, describe the full specification in the request form.",
  rfqCustomLink: "Go to the request form",
  priceLabel: { before: "Cost estimate at the price of ", after: ", VAT included" },
  priceUnit: "Toman",
  priceDisclaimer: "An approximate estimate from the nominal weight and the dated price, not a quotation; ask for today's price.",
  basisTitle: "How it is calculated",
  basisCatalog: "“Catalog value”: wherever the Ahan Asa catalog has the nominal weight of the exact item, that figure is used.",
  basis: {
    rebar: "Rebar: weight per metre = d² ÷ 162 (d = diameter in mm) — ISO 6935-2 / INSO 3132.",
    plate: "Plate and sheet: weight = thickness (mm) × width (m) × length (m) × 7.85 kg/dm³ — EN 10029 / EN 10051.",
    hollow: "Hollow sections: A = 2t(B + H − 2t) − (4 − π)(ro² − ri²) with the corner radii of the standard's Annex B, density 7850 kg/m³ — EN 10219-2.",
    pipe: "Pipe: weight per metre = 0.0246615 × (D − t) × t, i.e. density 7850 kg/m³ — ASME B36.10M.",
    angle: "Angles: A = t(2b − t) without the corner radii (about 1% under the standard table), density 7850 kg/m³ — EN 10056-1.",
    channel: "Channels: A = 2·b·tf + (h − 2tf)·tw + 2(1 − π/4)r², density 7850 kg/m³ — EN 10365 dimensions.",
    beam: "IPE and IPN beams: only from the EN 10365 mass-per-metre table, never computed from dimensions.",
  },
  basisRounding:
    "Rounding: everything is calculated at full precision and only the displayed figure is rounded (half up): weight per metre to 3 decimals, per piece or sheet to 2, total weight to 1 and tonnes to 3. The number of pieces needed to reach a weight is rounded up to a whole number. A cost estimate is rounded to the nearest 1,000 Toman.",
  standardsTitle: "Standards",
};

const ar: WeightCalculatorCopy = {
  metaTitle: "حاسبة وزن الحديد",
  metaDescription: "احسب الوزن الاسمي لحديد التسليح والكمرات والمجاري والزوايا والمقاطع المجوفة والأنابيب والألواح لكل متر ولكل قطعة وللطلب كله، استنادًا إلى كتالوج آهن آسا والجداول القياسية.",
  eyebrow: "حاسبة الوزن",
  title: "حاسبة وزن الحديد",
  body: "اختر المقطع والمقاس ثم أدخل العدد أو الكيلوغرام أو الطن لترى الوزن الاسمي لكل متر ولكل قطعة وللطلب كله.",
  formTitle: "بيانات الصنف",
  product: "المقطع",
  size: "المقاس",
  customSize: "أبعاد مخصصة (بالمعادلة)",
  tableSize: (size) => `${size} (الجدول القياسي)`,
  length: "طول القطعة الواحدة (م)",
  quantity: "الكمية",
  unit: "وحدة الكمية",
  piece: { bar: "قطعة", sheet: "لوح" },
  kg: "كيلوغرام",
  ton: "طن",
  fields: {
    rebar: { d: "القطر (مم)" },
    plate: { t: "السماكة (مم)", w: "العرض (مم)", l: "الطول (مم)" },
    shs: { a: "الضلع (مم)", t: "السماكة (مم)" },
    rhs: { h: "الارتفاع (مم)", b: "العرض (مم)", t: "السماكة (مم)" },
    pipe: { D: "القطر الخارجي (مم)", t: "سماكة الجدار (مم)" },
    angle: { b: "طول الضلع (مم)", t: "السماكة (مم)" },
    channel: { h: "الارتفاع (مم)", b: "عرض الشفة (مم)", tw: "سماكة الجذع (مم)", tf: "سماكة الشفة (مم)", r: "نصف قطر الجذر (مم، اختياري)" },
    ipe: {},
    ipn: {},
  },
  resultTitle: "النتيجة",
  perMetre: "الوزن لكل متر",
  perSquareMetre: "الوزن لكل متر مربع",
  perPiece: { bar: "وزن القطعة", sheet: "وزن اللوح" },
  pieces: { bar: "عدد القطع", sheet: "عدد الألواح" },
  piecesNeeded: { bar: "عدد القطع اللازم", sheet: "عدد الألواح اللازم" },
  exactPieces: (value) => `بالضبط: ${value}؛ مقرَّب إلى الأعلى`,
  total: "الوزن الإجمالي",
  totalTon: "الوزن الإجمالي بالطن",
  unitKgPerMetre: "كجم/م",
  unitKgPerSquareMetre: "كجم/م²",
  unitKg: "كجم",
  unitTon: "طن",
  source: { catalog: "قيمة الكتالوج", table: "الجدول القياسي EN 10365", formula: "محسوب بالمعادلة" },
  invalid: "أدخل أعدادًا موجبة في كل الحقول لترى النتيجة (العدد رقم صحيح).",
  rfqCta: "طلب عرض سعر لهذه الكمية",
  rfqCustomNote: "للمقاسات غير الموجودة في الكتالوج، اكتب المواصفات كاملة في نموذج الطلب.",
  rfqCustomLink: "الانتقال إلى نموذج الطلب",
  priceLabel: { before: "تقدير التكلفة بسعر ", after: "، شامل ضريبة القيمة المضافة" },
  priceUnit: "تومان",
  priceDisclaimer: "تقدير تقريبي من الوزن الاسمي وسعر ذلك التاريخ، وليس عرض سعر؛ اطلب سعر اليوم.",
  basisTitle: "أساس الحساب",
  basisCatalog: "«قيمة الكتالوج»: حيثما يحتوي كتالوج آهن آسا على الوزن الاسمي للصنف نفسه، يُستخدم ذلك الرقم.",
  basis: {
    rebar: "حديد التسليح: الوزن لكل متر = \u2066d² ÷ ١٦٢\u2069 (d القطر بالمليمتر) — ISO 6935-2 / INSO 3132.",
    plate: "الألواح والصاج: الوزن = السماكة (mm) × العرض (m) × الطول (m) × ٧٫٨٥ كجم/دسم³ — EN 10029 / EN 10051.",
    hollow: "المقاطع المجوفة: \u2066A = 2t(B + H − 2t) − (4 − π)(ro² − ri²)\u2069 بأنصاف أقطار الزوايا في الملحق B من المعيار، الكثافة ٧٨٥٠ كجم/م³ — EN 10219-2.",
    pipe: "الأنابيب: الوزن لكل متر = \u2066٠٫٠٢٤٦٦١٥ × (D − t) × t\u2069، أي كثافة ٧٨٥٠ كجم/م³ — ASME B36.10M.",
    angle: "الزوايا: \u2066A = t(2b − t)\u2069 دون أنصاف أقطار الزوايا (أقل بنحو ١٪ من الجدول القياسي)، الكثافة ٧٨٥٠ كجم/م³ — EN 10056-1.",
    channel: "المجاري: \u2066A = 2·b·tf + (h − 2tf)·tw + 2(1 − π/4)r²\u2069، الكثافة ٧٨٥٠ كجم/م³ — أبعاد EN 10365.",
    beam: "كمرات IPE وIPN: من جدول الكتلة لكل متر في EN 10365 فقط، ولا تُحسب من الأبعاد.",
  },
  basisRounding:
    "التقريب: يُجرى الحساب بالدقة الكاملة ويُقرَّب الرقم المعروض فقط (النصف إلى الأعلى): الوزن لكل متر إلى ٣ منازل عشرية، ولكل قطعة أو لوح إلى منزلتين، والوزن الإجمالي إلى منزلة واحدة، والطن إلى ٣ منازل. يُقرَّب عدد القطع اللازم للوصول إلى وزن ما إلى العدد الصحيح الأعلى. ويُقرَّب تقدير التكلفة إلى أقرب ١٬٠٠٠ تومان.",
  standardsTitle: "المعايير",
};

export const WEIGHT_CALCULATOR_COPY: Readonly<Record<Locale, WeightCalculatorCopy>> = { fa, en, ar };

/** The visible «مبنای محاسبه» list, in shape order, each line paired with the citation it states. */
export const BASIS_LINES = ["rebar", "plate", "hollow", "pipe", "angle", "channel", "beam"] as const;

/** The standards the note lists (Latin titles, same on every locale). */
export const BASIS_STANDARDS = Object.values(STANDARDS);
