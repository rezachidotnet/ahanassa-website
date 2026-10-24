import type { Locale } from "../../config/locales.ts";
import type { AlloyForm } from "./weight.ts";

/**
 * W43 (D-ALLOY-6) — copy of the weight calculator's alloy/tool steel section
 * (components/tools/alloy-weight-calculator.tsx). Kept apart from lib/weight-calculator/copy.ts so the catalog
 * calculator's copy contract does not change. Same rules: ar uses Arabic letters only, en no Arabic script,
 * formula symbols and units Latin; no price.
 */
export interface AlloyCalculatorCopy {
  title: string;
  intro: string;
  grade: string;
  form: string;
  forms: Record<AlloyForm, string>;
  fields: Record<string, string>;
  /** Plate sheet sides are in metres. */
  plateFields: Record<string, string>;
  length: string;
  quantity: string;
  resultTitle: string;
  perMetre: string;
  perSquareMetre: string;
  perPiece: string;
  total: string;
  totalTon: string;
  densityUsed: (density: string, grade: string) => string;
  weighedNote: string;
  /** The «مبنای محاسبه» line of the calculator page. */
  basis: string;
  invalid: string;
  rfqCta: string;
  unitKgPerMetre: string;
  unitKgPerSquareMetre: string;
  unitKg: string;
  unitTon: string;
}

export const ALLOY_CALCULATOR_COPY: Record<Locale, AlloyCalculatorCopy> = {
  fa: {
    title: "وزن فولاد آلیاژی و ابزار با چگالی گرید",
    intro: "چگالی فولادهای ابزار با فولاد معمولی (۷٫۸۵) فرق دارد؛ مثلاً SPK حدود ۷٫۷۰ و گرمکار 2344 حدود ۷٫۸۰. گرید را انتخاب کنید تا وزن با چگالی همان گرید حساب شود.",
    grade: "گرید",
    form: "شکل",
    forms: { round: "گرد", square: "چهارپهلو", flat: "تسمه (عرض × ضخامت)", hex: "شش‌پر", plate: "ورق", block: "بلوک برش‌خورده", disc: "دیسک برش‌خورده" },
    fields: { d: "قطر (میلی‌متر)", a: "ضلع (میلی‌متر)", b: "عرض (میلی‌متر)", t: "ضخامت (میلی‌متر)", s: "فاصله دو سطح موازی (میلی‌متر)", l: "طول (میلی‌متر)", w: "عرض (میلی‌متر)", h: "ارتفاع / ضخامت (میلی‌متر)" },
    plateFields: { t: "ضخامت (میلی‌متر)", w: "عرض ورق (متر)", l: "طول ورق (متر)" },
    length: "طول هر شاخه یا قطعه (متر)",
    quantity: "تعداد",
    resultTitle: "نتیجه",
    perMetre: "وزن هر متر",
    perSquareMetre: "وزن هر متر مربع",
    perPiece: "وزن هر قطعه",
    total: "وزن کل",
    totalTon: "وزن کل (تن)",
    densityUsed: (density, grade) => `چگالی مورد استفاده: ${density} کیلوگرم بر دسی‌متر مکعب (${grade})`,
    weighedNote: "وزن اسمی است؛ وزن واقعی با توزین تعیین می‌شود و فولاد ابزار معمولاً بر اساس وزن قطعه برش‌خورده فروخته می‌شود.",
    basis: "فولاد آلیاژی و ابزار: گرد \u2066ρ·π/4·d²\u2069، چهارپهلو \u2066ρ·a²\u2069، تسمه \u2066ρ·b·t\u2069، شش‌پر \u2066ρ·(√3/2)·s²\u2069، ورق \u2066ρ·t\u2069، بلوک \u2066ρ·L·W·H\u2069 و دیسک \u2066ρ·π/4·d²·h\u2069، با چگالی ρ همان گرید (مثلاً ۷٫۷۰ برای 1.2080 و ۷٫۸۰ برای 1.2344).",
    invalid: "ابعاد را با عدد مثبت وارد کنید.",
    rfqCta: "استعلام قیمت برای همین سایز",
    unitKgPerMetre: "کیلوگرم بر متر",
    unitKgPerSquareMetre: "کیلوگرم بر متر مربع",
    unitKg: "کیلوگرم",
    unitTon: "تن",
  },
  en: {
    title: "Alloy and tool steel weight at the grade's density",
    intro: "Tool steels are not as dense as plain steel (7.85): SPK is about 7.70 and 1.2344 about 7.80, for example. Choose the grade and the weight is computed at that grade's density.",
    grade: "Grade",
    form: "Form",
    forms: { round: "Round", square: "Square", flat: "Flat (width × thickness)", hex: "Hexagon", plate: "Plate", block: "Cut block", disc: "Cut disc" },
    fields: { d: "Diameter (mm)", a: "Side (mm)", b: "Width (mm)", t: "Thickness (mm)", s: "Across flats (mm)", l: "Length (mm)", w: "Width (mm)", h: "Height / thickness (mm)" },
    plateFields: { t: "Thickness (mm)", w: "Sheet width (m)", l: "Sheet length (m)" },
    length: "Length of each bar or piece (m)",
    quantity: "Quantity",
    resultTitle: "Result",
    perMetre: "Weight per metre",
    perSquareMetre: "Weight per square metre",
    perPiece: "Weight per piece",
    total: "Total weight",
    totalTon: "Total weight (tonnes)",
    densityUsed: (density, grade) => `Density used: ${density} kg/dm³ (${grade})`,
    weighedNote: "Nominal weight; the actual weight is weighed, and tool steel is usually sold by the weight of the cut piece.",
    basis: "Alloy and tool steel: round ρ·π/4·d², square ρ·a², flat ρ·b·t, hexagon ρ·(√3/2)·s², plate ρ·t, block ρ·L·W·H and disc ρ·π/4·d²·h, at the grade's own density ρ (for example 7.70 for 1.2080 and 7.80 for 1.2344).",
    invalid: "Enter the dimensions as positive numbers.",
    rfqCta: "Request a quote for this size",
    unitKgPerMetre: "kg/m",
    unitKgPerSquareMetre: "kg/m²",
    unitKg: "kg",
    unitTon: "t",
  },
  ar: {
    title: "وزن الفولاذ السبائكي وفولاذ العدد بكثافة الدرجة",
    intro: "تختلف كثافة فولاذ العدد عن الفولاذ العادي (7.85)؛ فكثافة 1.2080 نحو 7.70 وكثافة 1.2344 نحو 7.80 مثلًا. اختر الدرجة ليُحسب الوزن بكثافتها.",
    grade: "الدرجة",
    form: "الشكل",
    forms: { round: "مستدير", square: "مربع", flat: "مسطح (العرض × السماكة)", hex: "سداسي", plate: "لوح", block: "كتلة مقصوصة", disc: "قرص مقصوص" },
    fields: { d: "القطر (مم)", a: "الضلع (مم)", b: "العرض (مم)", t: "السماكة (مم)", s: "المسافة بين الوجهين المتقابلين (مم)", l: "الطول (مم)", w: "العرض (مم)", h: "الارتفاع / السماكة (مم)" },
    plateFields: { t: "السماكة (مم)", w: "عرض اللوح (م)", l: "طول اللوح (م)" },
    length: "طول كل قضيب أو قطعة (م)",
    quantity: "العدد",
    resultTitle: "النتيجة",
    perMetre: "الوزن لكل متر",
    perSquareMetre: "الوزن لكل متر مربع",
    perPiece: "وزن القطعة",
    total: "الوزن الإجمالي",
    totalTon: "الوزن الإجمالي (طن)",
    densityUsed: (density, grade) => `الكثافة المستخدمة: ${density} كغ/دسم³ (${grade})`,
    weighedNote: "الوزن اسمي؛ ويُحدَّد الوزن الفعلي بالوزن، ويُباع فولاذ العدد عادةً بوزن القطعة المقصوصة.",
    basis: "الفولاذ السبائكي وفولاذ العدد: المستدير \u2066ρ·π/4·d²\u2069، والمربع \u2066ρ·a²\u2069، والمسطح \u2066ρ·b·t\u2069، والسداسي \u2066ρ·(√3/2)·s²\u2069، واللوح \u2066ρ·t\u2069، والكتلة \u2066ρ·L·W·H\u2069، والقرص \u2066ρ·π/4·d²·h\u2069، بكثافة الدرجة نفسها ρ (مثلًا 7.70 للدرجة 1.2080 و7.80 للدرجة 1.2344).",
    invalid: "أدخل الأبعاد بأرقام موجبة.",
    rfqCta: "طلب عرض لهذا المقاس",
    unitKgPerMetre: "كغ/م",
    unitKgPerSquareMetre: "كغ/م²",
    unitKg: "كغ",
    unitTon: "طن",
  },
};
