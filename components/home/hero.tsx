import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { homepageCopy } from "@/lib/content/homepage";
import { primaryCta } from "@/lib/content/nav";
import { buttonVariants } from "@/components/ui/button";

/**
 * Hero — HOMEPAGE_SPEC.md §9. Editorial split (text inline-start, evidence
 * media complementary), matching the approved visual reference's hero
 * proportions and copper-accented headline treatment. Media: real
 * procurement-context photography, not decorative industrial cliché
 * (§9.5).
 */
export function Hero({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].hero;

  return (
    <section className="bg-navy relative isolate overflow-hidden">
      <Image
        src="/images/ops/inspection.png"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-40"
      />
      <div className="from-navy via-navy/85 to-navy/30 absolute inset-0 bg-linear-to-r" aria-hidden="true" />
      <div className="hairline-grid absolute inset-0" aria-hidden="true" />

      <div className="container-x relative pt-20 pb-16 lg:pt-28 lg:pb-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-copper-400 flex items-center gap-3">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {t.eyebrow}
          </p>

          <h1 className="mt-7 text-4xl leading-[1.08] font-extrabold text-white sm:text-5xl lg:text-[3.75rem]">
            {t.title}
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">{t.body}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href={localizedPath(locale, "/contact")}
              className={buttonVariants({ variant: "default", size: "lg", className: "group" })}
            >
              {primaryCta[locale].full}
              <ArrowRight className="size-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
            <a
              href="#process"
              className="inline-flex items-center gap-2.5 border border-white/25 px-7 py-4 text-sm font-semibold tracking-wide text-white transition-colors hover:border-white hover:bg-white/5"
            >
              {locale === "fa" ? "آشنایی با فرآیند خرید" : locale === "ar" ? "تعرف على مسار الشراء" : "Learn how the process works"}
            </a>
          </div>

          <p className="text-copper-400 mt-10 text-sm font-semibold">{t.brandLine}</p>
        </div>
      </div>
    </section>
  );
}
