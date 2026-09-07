import Image from "next/image";
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
 * Hero visual: `public/images/hero-steel-procurement.jpg` — the earlier
 * `hero-steel-mill.png` (an active production line with workers, a false
 * factory-ownership implication forbidden by §8/§32, see
 * docs/hero/HERO_P0_CURRENT_IMPLEMENTATION_AUDIT.md) and the CSS/SVG
 * temporary placeholder that replaced it are both superseded by this
 * owner-supplied photo: a natural photographic stockyard shot of stacked
 * steel stock (tube, bar, sheet) — the "Steel + Procurement Evidence"
 * concept, no owned-factory implication, no readable commercial data in
 * the image itself. Delivered at 4:3 (1448×1086), matching the visual column's
 * own aspect-ratio exactly, so `object-cover` shows the image undistorted
 * with no cropping. Decorative relative to the Hero's own text content
 * (which already carries every real claim), so it follows this
 * homepage's established decorative-image convention — empty `alt`, the
 * column `aria-hidden` — the same pattern `components/home/assurance.tsx`
 * uses for its own supporting photo.
 *
 * Content note (owner-directed change, post-dates Hero V2.3/V2.4): the
 * static 3-point trust micro-layer those frozen documents specify has
 * been removed and replaced by a 4-step process rail (submit → technical
 * review → commercial review → purchase), rendered between H1 and the
 * supporting copy. This is a deliberate content/positioning revision, not
 * a silent drift — the frozen spec documents have not been updated to
 * match and should be reconciled in a future documentation pass.
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

              <ol className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 lg:mt-10 lg:flex lg:gap-0">
                {t.process.map((step, index) => (
                  <li key={step} className="relative flex items-center gap-2.5 lg:flex-1 lg:ps-5">
                    {index > 0 && (
                      <span
                        aria-hidden="true"
                        className="bg-navy/20 absolute inset-inline-start-0 top-1/2 hidden h-px w-5 -translate-y-1/2 lg:block"
                      />
                    )}
                    <span className="text-copper border-copper/30 inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums">
                      {index + 1}
                    </span>
                    <span className="text-navy text-sm font-semibold leading-snug">{step}</span>
                  </li>
                ))}
              </ol>

              <p className="text-muted-foreground mt-8 max-w-xl text-lg leading-relaxed">{t.body}</p>

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

              <p className="text-muted-foreground mt-6 max-w-xl text-xs leading-relaxed font-normal">{t.reassurance}</p>

              <p className="text-copper mt-8 text-base font-semibold">{t.brandLine}</p>
            </div>

            <div className="lg:w-[45%]" aria-hidden="true">
              <div className="bg-navy relative mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-[var(--aa-shadow-md)] lg:mx-0" style={{ aspectRatio: "4 / 3" }}>
                <Image
                  src="/images/hero-steel-procurement.jpg"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 400px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
