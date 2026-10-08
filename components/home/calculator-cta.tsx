import { Calculator, Check } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { ButtonLink } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/surface-variants";

/** The calculator route (owner decision D-W10-5). */
export const WEIGHT_CALCULATOR_PATH = "/tools/weight-calculator";

/**
 * Home-page CTA block for the weight calculator (W10.0 report §5.7, owner
 * decision D-W10-5) — built in W10.2 but NOT rendered until the calculator
 * ships; the task that ships it places this block directly after the Hero
 * (docs/HOMEPAGE_RANKING.md then needs its section-order note).
 *
 * A procurement tool, not a cart: no price anywhere in the block. The
 * preview on the inline-end side is a static, non-interactive picture
 * (aria-hidden) marked as a sample; its figure is the catalog's nominal
 * weight for IPE 180 (18.8 kg/m) x 12 m x 20 = 4,512 kg.
 */
const copy: Record<
  Locale,
  { eyebrow: string; title: string; body: string; points: string[]; cta: string; sample: string; product: string; size: string; length: string; count: string; result: string; disclaimer: string }
> = {
  fa: {
    eyebrow: "ابزار رایگان",
    title: "وزن آهن‌آلات را قبل از خرید محاسبه کنید",
    body: "مقطع، سایز، طول و تعداد را وارد کنید تا وزن اسمی سفارش‌تان را ببینید.",
    points: ["برای مقاطع پرکاربرد فولادی", "بر پایه وزن اسمی جدول‌های استاندارد", "بدون ثبت‌نام"],
    cta: "باز کردن محاسبه‌گر وزن",
    sample: "نمونه",
    product: "مقطع",
    size: "سایز",
    length: "طول (متر)",
    count: "تعداد",
    result: "وزن اسمی",
    disclaimer: "وزن اسمی/نظری است؛ معادل وزن باسکول نیست.",
  },
  en: {
    eyebrow: "Free tool",
    title: "Calculate steel weight before you buy",
    body: "Enter the section, size, length and quantity to see the nominal weight of your order.",
    points: ["For the most-used steel sections", "Based on standard nominal-weight tables", "No sign-up"],
    cta: "Open the weight calculator",
    sample: "Sample",
    product: "Section",
    size: "Size",
    length: "Length (m)",
    count: "Quantity",
    result: "Nominal weight",
    disclaimer: "Nominal / theoretical weight — not the weighbridge weight.",
  },
  ar: {
    eyebrow: "أداة مجانية",
    title: "احسب وزن الحديد قبل الشراء",
    body: "أدخل المقطع والمقاس والطول والعدد لترى الوزن الاسمي لطلبك.",
    points: ["لأكثر المقاطع الفولاذية استخدامًا", "على أساس جداول الوزن الاسمي القياسية", "دون تسجيل"],
    cta: "فتح حاسبة الوزن",
    sample: "مثال",
    product: "المقطع",
    size: "المقاس",
    length: "الطول (م)",
    count: "العدد",
    result: "الوزن الاسمي",
    disclaimer: "وزن اسمي/نظري وليس وزن الميزان.",
  },
};

const NUMERALS: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };

export function CalculatorCta({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const n = (value: number) => new Intl.NumberFormat(NUMERALS[locale]).format(value);
  const rows: [string, string][] = [
    [t.product, "IPE"],
    [t.size, "180"],
    [t.length, n(12)],
    [t.count, n(20)],
  ];

  return (
    <section aria-labelledby="calculator-cta-title" className="bg-surface section-y">
      <div className="container-x">
        <div className={cardVariants({ variant: "panel", className: "grid items-center gap-10 lg:grid-cols-2" })}>
          <div>
            <p className="eyebrow text-copper flex items-center gap-3">
              <span className="h-px w-8 bg-current" aria-hidden="true" />
              {t.eyebrow}
            </p>
            <h2 id="calculator-cta-title" className="text-navy text-h2 mt-4 font-extrabold">
              {t.title}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl">{t.body}</p>
            <ul className="mt-5 grid gap-2">
              {t.points.map((point) => (
                <li key={point} className="text-neutral-700 flex items-center gap-2 text-sm">
                  <Check className="text-copper size-4 shrink-0" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <ButtonLink href={localizedPath(locale, WEIGHT_CALCULATOR_PATH)} variant="primary" className="mt-7">
              <Calculator aria-hidden="true" />
              {t.cta}
            </ButtonLink>
          </div>

          {/* Static preview — a picture of the tool, not a form. */}
          <div aria-hidden="true" className={cardVariants({ className: "relative grid gap-3 p-5" })}>
            <span className="text-[var(--aa-color-warning-800)] absolute end-4 top-4 rounded-[var(--aa-radius-tag)] border border-dashed border-[var(--aa-color-warning-800)] bg-[var(--aa-color-warning-50)] px-1.5 text-[11px] font-bold">
              {t.sample}
            </span>
            <dl className="grid grid-cols-2 gap-3">
              {rows.map(([label, value]) => (
                <div key={label} className="grid gap-1">
                  <dt className="text-neutral-700 text-xs font-semibold">{label}</dt>
                  <dd className="border-border-control text-navy flex min-h-11 items-center rounded-[var(--aa-radius-control)] border px-3 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="bg-navy flex items-center justify-between rounded-[var(--aa-radius-control)] px-4 py-3 text-white">
              <span className="text-on-inverse-muted text-sm">{t.result}</span>
              <span className="text-lg font-extrabold">≈ {n(4512)} kg</span>
            </p>
            <p className="text-tertiary text-xs">{t.disclaimer}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
