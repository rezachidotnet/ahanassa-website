/**
 * SAMPLE product-catalog data — structural placeholder only.
 *
 * Per CLAUDE.md §11 / PROJECT_OVERRIDES.md §4, the real public catalog must
 * be sourced from the synchronized D1 layer (never invented, never a live
 * Odoo call), which does not exist yet. This dataset exists only to
 * demonstrate the catalog page's layout/filtering pattern and must never be
 * presented as Ahan Asa's actual current offering — every catalog route
 * built on this data is non-indexable and carries a visible "sample data"
 * notice (see app/[locale]/products/*). Grades/standards listed are real
 * published international designations (ASTM/EN/DIN/JIS/GOST etc.) used
 * only as illustrative category examples, not as a claim that Ahan Asa
 * currently stocks or supplies them.
 *
 * Content is Persian-only; see the catalog pages' locale notice for why.
 */

export type ProductCategory = "long" | "flat" | "semi" | "raw";

export interface SampleProduct {
  slug: string;
  name: string;
  category: ProductCategory;
  code: string;
  image: string;
  summary: string;
  description: string;
  specs: { label: string; value: string }[];
  grades: string[];
  standards: string[];
  applications: string[];
}

export const categories: { id: ProductCategory; label: string; blurb: string }[] = [
  { id: "long", label: "مقاطع طولی", blurb: "میلگرد، مفتول، مقاطع و میله‌ها برای سازه و ساخت‌وساز." },
  { id: "flat", label: "مقاطع تخت", blurb: "کویل، ورق و پلیت برای شکل‌دهی و ساخت‌وساز." },
  { id: "semi", label: "محصولات نیمه‌ساخته", blurb: "بیلت و شمش برای کارخانه‌های نورد مجدد و ریخته‌گری." },
  { id: "raw", label: "مواد اولیه و آلیاژها", blurb: "آهن اسفنجی و فروآلیاژها برای کارگاه‌های ذوب." },
];

export const sampleProducts: SampleProduct[] = [
  {
    slug: "deformed-rebar",
    name: "میلگرد آجدار",
    category: "long",
    code: "LP-01",
    image: "/images/products/rebar.png",
    summary: "میلگرد آجدار برای سازه‌های بتنی.",
    description: "میلگرد گرم‌نورد با هندسه آج یکنواخت برای سازه‌های بتن‌آرمه.",
    specs: [
      { label: "قطر", value: "8 – 40 mm" },
      { label: "طول", value: "6 m / 12 m" },
    ],
    grades: ["B500B", "B500C", "Grade 60"],
    standards: ["ASTM A615/A706", "BS 4449", "DIN 488"],
    applications: ["اسکلت بتنی ساختمان", "پل و تونل"],
  },
  {
    slug: "wire-rod",
    name: "مفتول",
    category: "long",
    code: "LP-02",
    image: "/images/products/wire-rod.png",
    summary: "کلاف‌های کربن پایین تا بالا برای کشش سیم و مش.",
    description: "مفتول گرم‌نورد در کلاف‌های خنک‌شده کنترل‌شده برای کشش سرد و جوش مش.",
    specs: [
      { label: "قطر", value: "5.5 – 16 mm" },
      { label: "وزن کلاف", value: "1.8 – 2.2 t" },
    ],
    grades: ["SAE 1006", "SAE 1008", "SAE 1045"],
    standards: ["ASTM A510", "EN 10016"],
    applications: ["سیم کشش سرد", "میخ و پیچ"],
  },
  {
    slug: "structural-beams",
    name: "تیرآهن — IPE / HEA / HEB",
    category: "long",
    code: "LP-03",
    image: "/images/products/beams.png",
    summary: "تیرآهن‌های I و H برای اسکلت فلزی.",
    description: "مقاطع سازه‌ای گرم‌نورد با ضخامت یکنواخت جان و بال.",
    specs: [{ label: "ارتفاع", value: "IPE 100–600, HEA/HEB 100–600" }],
    grades: ["S235JR", "S355JR", "A992"],
    standards: ["EN 10025-2", "ASTM A992/A36"],
    applications: ["اسکلت ساختمان فلزی", "سالن‌های صنعتی"],
  },
  {
    slug: "angle-bar",
    name: "نبشی",
    category: "long",
    code: "LP-04",
    image: "/images/products/angle-bar.png",
    summary: "نبشی‌های بال مساوی و نامساوی.",
    description: "نبشی گرم‌نورد برای اتصالات جوشی و پیچی.",
    specs: [{ label: "سایز", value: "20×20 – 200×200 mm" }],
    grades: ["S235JR", "S355JR", "A36"],
    standards: ["EN 10056", "ASTM A36"],
    applications: ["خرپا و مهاربندی"],
  },
  {
    slug: "u-channel",
    name: "ناودانی — UPN / UPE",
    category: "long",
    code: "LP-05",
    image: "/images/products/u-channel.png",
    summary: "ناودانی برای پرلین و قاب‌بندی.",
    description: "ناودانی گرم‌نورد با بال موازی یا مخروطی.",
    specs: [{ label: "ارتفاع", value: "50 – 400 mm" }],
    grades: ["S235JR", "S275JR"],
    standards: ["EN 10025-2", "DIN 1026"],
    applications: ["پرلین و قاب‌بندی ثانویه"],
  },
  {
    slug: "flat-square-bar",
    name: "میلگرد تخت و مربع",
    category: "long",
    code: "LP-06",
    image: "/images/products/flat-bar.png",
    summary: "میلگرد بازرگانی برای مهندسی عمومی.",
    description: "میلگرد بازرگانی در مقاطع تخت، مربع و گرد.",
    specs: [{ label: "تخت", value: "20×3 – 200×25 mm" }],
    grades: ["S235JR", "C45"],
    standards: ["EN 10058/10059/10060"],
    applications: ["خوراک آهنگری و ماشین‌کاری"],
  },
  {
    slug: "hot-rolled-coil",
    name: "کویل گرم‌نورد",
    category: "flat",
    code: "FP-01",
    image: "/images/products/hrc.png",
    summary: "کویل گرم‌نورد برای شکل‌دهی و تولید لوله.",
    description: "کویل گرم‌نورد با کنترل تاب و تخت بودن.",
    specs: [{ label: "ضخامت", value: "1.2 – 16 mm" }],
    grades: ["SAE 1006", "S235JR"],
    standards: ["ASTM A1011/A36", "EN 10025"],
    applications: ["لوله جوشی", "پروفیل رول‌فرم"],
  },
  {
    slug: "sheet-plate",
    name: "ورق و پلیت",
    category: "flat",
    code: "FP-02",
    image: "/images/products/sheet-plate.png",
    summary: "ورق و پلیت ضخیم برای کارهای سازه‌ای.",
    description: "ورق و پلیت ضخیم گرم‌نورد به‌صورت خام یا نرمالایز.",
    specs: [{ label: "ضخامت", value: "2 – 100 mm" }],
    grades: ["S355J2+N", "A516 Gr.70"],
    standards: ["EN 10025-2", "ASTM A36/A516"],
    applications: ["مخزن و ظروف تحت فشار"],
  },
  {
    slug: "pipe-tube",
    name: "لوله و پروفیل توخالی",
    category: "flat",
    code: "FP-03",
    image: "/images/products/pipe.png",
    summary: "لوله جوشی و بدون درز، پروفیل توخالی.",
    description: "لوله انتقال جوشی و بدون درز در کنار پروفیل‌های توخالی.",
    specs: [{ label: "قطر خارجی", value: "21.3 – 610 mm" }],
    grades: ["ASTM A53 B", "API 5L B"],
    standards: ["ASTM A53/A500", "API 5L"],
    applications: ["خطوط آب و گاز"],
  },
  {
    slug: "steel-billet",
    name: "بیلت فولادی",
    category: "semi",
    code: "SF-01",
    image: "/images/products/billet.png",
    summary: "بیلت ریخته‌گری پیوسته برای نورد مجدد.",
    description: "بیلت مربعی ریخته‌گری پیوسته با ترکیب شیمیایی کنترل‌شده.",
    specs: [{ label: "مقطع", value: "100×100 – 165×165 mm" }],
    grades: ["3SP", "Q235"],
    standards: ["GOST 380", "GB 700"],
    applications: ["نورد مجدد میلگرد و مفتول"],
  },
  {
    slug: "ingot",
    name: "شمش آلومینیوم و روی",
    category: "semi",
    code: "SF-02",
    image: "/images/products/ingot.png",
    summary: "شمش غیرآهنی برای دایکاست و آلیاژسازی.",
    description: "شمش غیرآهنی اولیه و ثانویه بر اساس آنالیز.",
    specs: [{ label: "آلومینیوم", value: "A7 / A8, حداقل 99.7%" }],
    grades: ["A7", "A8", "Zinc SHG"],
    standards: ["ASTM B179", "BS EN 1179"],
    applications: ["دایکاست", "گالوانیزه گرم"],
  },
  {
    slug: "sponge-iron",
    name: "آهن اسفنجی (DRI)",
    category: "raw",
    code: "RM-01",
    image: "/images/products/sponge-iron.png",
    summary: "آهن احیای مستقیم برای کوره‌های ذوب.",
    description: "آهن احیای مستقیم به‌صورت کلوخه و پلت، غربال‌شده برای یکنواختی سایز.",
    specs: [{ label: "آهن کل (Fe)", value: "88 – 92 %" }],
    grades: ["DRI Lump", "DRI Pellet"],
    standards: ["ISO 11256"],
    applications: ["خوراک کوره قوس الکتریکی"],
  },
  {
    slug: "ferro-alloys",
    name: "فروآلیاژها",
    category: "raw",
    code: "RM-02",
    image: "/images/products/ferro-silicon.png",
    summary: "فروسیلیس، فرومنگنز و سیلیکومنگنز.",
    description: "اکسیژن‌زداها و افزودنی‌های آلیاژی خردشده و غربال‌شده.",
    specs: [{ label: "فروسیلیس", value: "Si 72 – 75 %" }],
    grades: ["FeSi 75", "FeMn HC"],
    standards: ["ASTM A100/A99", "ISO 5445"],
    applications: ["اکسیژن‌زدایی و آلیاژسازی فولاد"],
  },
];

export function getSampleProduct(slug: string) {
  return sampleProducts.find((p) => p.slug === slug);
}

export function categoryLabel(id: ProductCategory) {
  return categories.find((c) => c.id === id)?.label ?? id;
}
