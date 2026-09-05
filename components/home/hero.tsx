import { ArrowRight } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { homepageCopy } from "@/lib/content/homepage";
import { primaryCta } from "@/lib/content/nav";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Hero — Homepage Hero, aligned with Hero Frozen V2.4
 * (docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.4.md), which incorporates all
 * non-superseded V2.3 rules (docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md).
 * Desktop is a real logical split (copy ~55% / visual ~45%, inline-start/
 * inline-end via a plain `flex` row — flex's "row" main axis already
 * follows the container's text direction, so FA/AR naturally render
 * copy-right/visual-left and EN copy-left/visual-right with no
 * order/tabindex hacks). Mobile stacks in the same DOM order (§17/§22.2).
 *
 * Surface: the HERO-P1.1 light warm content card (`--aa-color-bg-warm`)
 * on top of the navy section remains — navy reads as an ambient frame.
 *
 * Button ownership (V2.4 §2): Hero no longer owns Button visual/interaction
 * geometry at all — both CTAs consume the Shared Button Component
 * (docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md) via
 * `components/ui/button.tsx`'s `primary`/`secondary` variants at
 * size="button". Hero owns only width/composition (min-width on desktop,
 * full-width on mobile) and CTA order/spacing.
 *
 * Hero visual: the previous `hero-steel-mill.png` depicted an active
 * production line with workers — a false factory-ownership implication
 * forbidden by §8/§32 (see docs/hero/HERO_P0_CURRENT_IMPLEMENTATION_AUDIT.md).
 * No compliant "Steel + Procurement Evidence" photograph exists in the
 * repository yet (every candidate under public/images/products/* is the
 * same kind of factory-floor/storage-yard photography with visible
 * workers). This remains a TEMPORARY SAFE MEDIA STATE: a pure CSS/SVG
 * panel (no photograph, so it cannot produce a broken-image state)
 * layering a stacked sheet/plate cue, a procurement-checklist cue, and a
 * steel cross-section cue — no readable commercial data, no ownership
 * implication. Replace with owner-approved photography when supplied;
 * nothing else in this component needs to change to do so.
 */
export function Hero({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].hero;

  return (
    <section className="bg-navy relative isolate overflow-hidden">
      <div className="hairline-grid absolute inset-0" aria-hidden="true" />

      <div className="container-x relative py-8 lg:py-16">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--aa-color-bg-warm)] p-6 shadow-[var(--aa-shadow-md)] sm:p-10 lg:p-14">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-10">
            <div className="lg:w-[55%]">
              <p className="eyebrow text-copper flex items-center gap-3">
                <span className="h-px w-8 bg-current" aria-hidden="true" />
                {t.eyebrow}
              </p>

              <h1 className="text-navy mt-7 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-[4rem]">{t.title}</h1>

              <p className="text-muted-foreground mt-7 max-w-xl text-lg leading-relaxed">{t.body}</p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <ButtonLink
                  href={localizedPath(locale, "/request")}
                  variant="primary"
                  size="button"
                  className="group w-full sm:w-auto sm:min-w-[180px]"
                >
                  {primaryCta[locale].full}
                  <ArrowRight className="size-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </ButtonLink>
                <a href={`tel:${CONTACT_PHONE_E164}`} className={cn(buttonVariants({ variant: "secondary", size: "button" }), "w-full sm:w-auto")}>
                  {t.secondaryCta}
                </a>
              </div>

              <p className="text-muted-foreground mt-6 max-w-xl text-sm leading-relaxed">{t.reassurance}</p>

              <ul className="text-muted-foreground mt-5 flex flex-wrap gap-x-2 gap-y-1.5 text-sm">
                {t.trust.map((point, index) => (
                  <li key={point} className={index > 0 ? "before:text-navy/30 before:me-2 before:content-['•']" : ""}>
                    {point}
                  </li>
                ))}
              </ul>

              <p className="text-copper mt-8 text-sm font-semibold">{t.brandLine}</p>
            </div>

            <div className="lg:w-[45%]" aria-hidden="true">
              <div
                className="bg-navy relative mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-[var(--aa-shadow-md)] lg:mx-0"
                style={{
                  aspectRatio: "4 / 3",
                  backgroundImage: "radial-gradient(120% 120% at 18% 12%, var(--aa-color-action-primary-bg-hover) 0%, var(--aa-color-brand-navy-900) 65%)",
                }}
              >
                <div className="hairline-grid absolute inset-0 opacity-40" />
                <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" focusable="false">
                  {/* stacked sheet/plate cue */}
                  <g fill="rgb(255 255 255 / 0.06)">
                    <rect x="36" y="172" width="220" height="88" rx="10" transform="rotate(-4 146 216)" />
                    <rect x="58" y="188" width="220" height="88" rx="10" transform="rotate(3 168 232)" />
                  </g>
                  {/* procurement checklist / specification-review cue */}
                  <g stroke="rgb(255 255 255 / 0.5)" strokeWidth="2.5">
                    <rect x="44" y="54" width="12" height="12" rx="2" />
                    <rect x="44" y="84" width="12" height="12" rx="2" />
                    <rect x="44" y="114" width="12" height="12" rx="2" />
                  </g>
                  <g stroke="rgb(255 255 255 / 0.3)" strokeWidth="3" strokeLinecap="round">
                    <line x1="72" y1="60" x2="248" y2="60" />
                    <line x1="72" y1="90" x2="284" y2="90" />
                    <line x1="72" y1="120" x2="212" y2="120" />
                  </g>
                  {/* steel cross-section cue */}
                  <g stroke="var(--aa-color-brand-copper-600)" strokeWidth="7" strokeLinecap="round" opacity="0.75">
                    <line x1="336" y1="176" x2="336" y2="256" />
                    <line x1="360" y1="176" x2="360" y2="256" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
