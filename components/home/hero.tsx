import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { homepageCopy } from "@/lib/content/homepage";
import { primaryCta } from "@/lib/content/nav";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";

/**
 * Hero — Homepage Hero, aligned with Hero Frozen V2.3
 * (docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md) per the HERO-P1
 * compliance pass. Desktop is a real logical split (copy ~55% / visual
 * ~45%, inline-start/inline-end via a plain `flex` row — flex's "row" main
 * axis already follows the container's text direction, so FA/AR naturally
 * render copy-right/visual-left and EN copy-left/visual-right with no
 * order/tabindex hacks). Mobile stacks in the same DOM order (§17/§22.2).
 *
 * Hero visual: the previous `hero-steel-mill.png` depicted an active
 * production line with workers — a false factory-ownership implication
 * forbidden by §8/§32 (see docs/hero/HERO_P0_CURRENT_IMPLEMENTATION_AUDIT.md).
 * No compliant "Steel + Procurement Evidence" photograph exists in the
 * repository yet (every candidate under public/images/products/* is the
 * same kind of factory-floor/storage-yard photography with visible
 * workers). Per HERO-P1 §15/§0.3, this renders a TEMPORARY SAFE MEDIA
 * STATE instead: a pure CSS/SVG abstract panel (no photograph, so it
 * cannot produce a broken-image state) evoking a procurement document
 * (thin horizontal lines) and steel cross-sections (two vertical copper
 * bars) — no readable commercial data, no ownership implication. Replace
 * with owner-approved photography when supplied; nothing else in this
 * component needs to change to do so.
 */
export function Hero({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].hero;

  return (
    <section className="bg-navy relative isolate overflow-hidden">
      <div className="hairline-grid absolute inset-0" aria-hidden="true" />

      <div className="container-x relative flex flex-col gap-12 py-16 lg:flex-row lg:items-center lg:gap-10 lg:py-24">
        <div className="lg:w-[55%]">
          <p className="eyebrow text-copper-400 flex items-center gap-3">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {t.eyebrow}
          </p>

          <h1 className="mt-7 text-4xl leading-[1.05] font-extrabold text-white sm:text-5xl lg:text-[4rem]">{t.title}</h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/75">{t.body}</p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={localizedPath(locale, "/request")}
              className="hero-cta group w-full bg-white text-navy shadow-[var(--aa-shadow-sm)] hover:bg-white/90 active:bg-white/85 sm:w-auto sm:min-w-[180px]"
            >
              {primaryCta[locale].full}
              <ArrowRight className="size-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
            <a
              href={`tel:${CONTACT_PHONE_E164}`}
              className="hero-cta w-full border border-white/45 bg-transparent text-white hover:border-white/70 hover:bg-white/5 sm:w-auto"
            >
              {t.secondaryCta}
            </a>
          </div>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/75">{t.reassurance}</p>

          <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-1.5 text-sm text-white/75">
            {t.trust.map((point, index) => (
              <li key={point} className={index > 0 ? "before:me-2 before:text-white/40 before:content-['•']" : ""}>
                {point}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-sm font-semibold text-white/60">{t.brandLine}</p>
        </div>

        <div className="lg:w-[45%]" aria-hidden="true">
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] lg:mx-0" style={{ aspectRatio: "4 / 3" }}>
            <div className="hairline-grid absolute inset-0 opacity-70" />
            <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" focusable="false">
              <g stroke="rgb(255 255 255 / 0.3)" strokeWidth="3" strokeLinecap="round">
                <line x1="48" y1="96" x2="272" y2="96" />
                <line x1="48" y1="136" x2="308" y2="136" />
                <line x1="48" y1="176" x2="232" y2="176" />
              </g>
              <g stroke="var(--aa-color-brand-copper-600)" strokeWidth="7" strokeLinecap="round" opacity="0.55">
                <line x1="336" y1="56" x2="336" y2="244" />
                <line x1="360" y1="56" x2="360" y2="244" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
