import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { homepageCopy } from "@/lib/content/homepage";
import { primaryCta } from "@/lib/content/nav";
import { buttonVariants } from "@/components/ui/button";

/**
 * Hero — visual composition matches the approved v0 implementation
 * (ahanassa-v0/components/home/hero.tsx): full-bleed Navy hero, hairline
 * grid overlay, copper eyebrow, large headline, copper primary CTA +
 * outlined secondary CTA, four-column rail beneath (PROJECT_OVERRIDES.md
 * §8b). v0's rail showed fabricated statistics ("1.2M tons", "38
 * countries", ...); this rail shows the four protection controls instead —
 * same visual slot, no invented numbers (DOCUMENT_AUDIT_REPORT.md DAR-020).
 */
export function Hero({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].hero;

  return (
    <section className="bg-navy relative isolate overflow-hidden">
      <Image
        src="/images/hero-steel-mill.png"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-45"
      />
      <div className="from-navy via-navy/85 to-navy/25 absolute inset-0 bg-linear-to-r" aria-hidden="true" />
      <div className="hairline-grid absolute inset-0" aria-hidden="true" />

      <div className="container-x relative pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-3xl">
          <p className="eyebrow text-copper-400 flex items-center gap-3">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {t.eyebrow}
          </p>

          <h1 className="mt-7 text-4xl leading-[1.05] font-extrabold text-white sm:text-5xl lg:text-[4rem]">{t.title}</h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">{t.body}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href={localizedPath(locale, "/contact")} className={buttonVariants({ variant: "default", size: "lg", className: "group" })}>
              {primaryCta[locale].full}
              <ArrowRight className="size-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
            <a
              href="#process"
              className="inline-flex items-center gap-2.5 border border-white/25 px-7 py-4 text-sm font-semibold tracking-wide text-white transition-colors hover:border-white hover:bg-white/5"
            >
              {t.secondaryCta}
            </a>
          </div>
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-px border-t border-white/15 pt-px lg:mt-24 lg:grid-cols-4">
          {t.rail.map((item) => (
            <div key={item.title} className="border-b border-white/10 py-6 pe-6 lg:border-e lg:border-b-0 lg:py-7 lg:last:border-e-0">
              <dt className="text-base font-bold text-white">{item.title}</dt>
              <dd className="mt-2 text-xs leading-relaxed tracking-wide text-white/50">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
