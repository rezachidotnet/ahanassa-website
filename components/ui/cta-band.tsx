import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { ButtonLink } from "@/components/ui/button";

/**
 * Final CTA block. Copy defaults to the approved library
 * (CTA_STRATEGY.md §5.7); callers may override for a page-specific variant.
 * Navy-800 surface with the shared Buttons in their on-navy treatment
 * (`on-inverse`: cream primary, white-outlined secondary, cream focus ring) —
 * the copper button was retired by owner decision D-W10-2
 * (docs/OWNER_DECISIONS.md). CTA destination/business meaning still follows
 * the canonical RFQ flow.
 */
const defaults: Record<Locale, { eyebrow: string; title: string; body: string; primary: string; secondary: string }> = {
  fa: {
    eyebrow: "گام بعدی",
    title: "فاکتور یا لیست خرید دارید؟",
    body: "آن را برای آهن آسا بفرستید تا نیاز شما بررسی و مسیر مناسب تأمین مشخص شود.",
    primary: "ارسال فاکتور یا لیست خرید",
    secondary: "درخواست مشاوره خرید",
  },
  en: {
    eyebrow: "Next step",
    title: "Have an invoice or purchase list ready?",
    body: "Send it to Ahan Asa so we can review your requirement and confirm the right sourcing path.",
    primary: "Send invoice or purchase list",
    secondary: "Request a procurement consultation",
  },
  ar: {
    eyebrow: "الخطوة التالية",
    title: "هل لديك فاتورة أو قائمة شراء جاهزة؟",
    body: "أرسلها إلى آهن آسا لمراجعة احتياجك وتحديد مسار التوريد المناسب.",
    primary: "إرسال الفاتورة أو قائمة الشراء",
    secondary: "طلب استشارة شراء",
  },
};

export function CtaBand({
  locale,
  title,
  body,
}: {
  locale: Locale;
  title?: string;
  body?: string;
}) {
  const copy = defaults[locale];

  return (
    <section className="bg-navy-800 on-inverse relative isolate overflow-hidden">
      <Image
        src="/images/ops/containers.png"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="object-cover opacity-25"
      />
      <div className="from-navy-800 via-navy-800/90 to-navy-800/50 absolute inset-0 bg-linear-to-r rtl:bg-linear-to-l" aria-hidden="true" />
      <div className="container-x relative grid gap-10 py-16 lg:grid-cols-12 lg:items-end lg:py-20">
        <div className="lg:col-span-7">
          <p className="eyebrow text-accent-on-inverse flex items-center gap-3">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2 className="mt-5 text-3xl leading-[1.1] font-bold text-white sm:text-4xl">{title ?? copy.title}</h2>
          <p className="mt-5 max-w-xl text-on-inverse-muted text-base leading-relaxed">{body ?? copy.body}</p>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-5 lg:items-end">
          <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" size="lg" className="group h-auto min-h-14 py-3">
            {copy.primary}
            <ArrowRight className="size-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href={localizedPath(locale, "/contact")} variant="secondary" size="lg" className="h-auto min-h-14 py-3">
            {copy.secondary}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
