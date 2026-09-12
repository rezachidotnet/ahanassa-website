import { localizedPath, type Locale } from "@/config/locales";
import { homepageCopy } from "@/lib/content/homepage";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HEADING_ID = "home-final-cta-heading";

/**
 * Final CTA — implements the frozen V1.0 spec
 * (docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md), placed on the
 * Homepage by
 * docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md §4/§6.7,
 * and styled per
 * docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md §9/§14.
 *
 * Answers exactly one buyer question (§1, Composition §6.7): "What is my next
 * safe and clear action?" Its sole conversion goal is sending a purchase list /
 * submitting an RFQ. The telephone action is a SECONDARY alternative toward the
 * same purchasing goal, not a competing third primary — which is why there are
 * exactly two actions here and no form, upload widget, checkout or instant
 * quotation (§1, §5).
 *
 * ------------------------------------------------------------------------
 * WHAT THIS REPLACES, AND WHAT IT DELIBERATELY DOES NOT
 * ------------------------------------------------------------------------
 *
 * For the HOMEPAGE ONLY, this component takes the closing-CTA slot previously
 * filled by `components/ui/cta-band.tsx`. `cta-band.tsx` is NOT superseded and
 * was NOT modified: it is a SHARED component that still renders, unchanged, on
 * /products, /products/[slug], /industries, /markets, /about and /services.
 * Rewriting it in place would have silently changed six other pages' closing
 * CTAs, which this phase does not authorize — §13 is explicit that Products,
 * Price, Buyer Value, Evidence and Industries behavior must be preserved, and
 * the same reasoning applies to every page outside the Homepage. So the
 * Homepage simply stopped importing it, exactly as it stopped importing
 * `reach.tsx` (Industries V1.0) and `evaluation-assurance.tsx` (Buyer Value
 * V1.0) before it. Nothing was deleted. See
 * docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md.
 *
 * The old CtaBand copy ("فاکتور یا لیست خرید دارید؟" / a second CTA also
 * pointing at /contact / a background photograph under a gradient / a Copper
 * eyebrow) is therefore untouched for those six pages and simply not used
 * here — §2-§4 freeze different copy, §6 forbids the photograph and gradient,
 * §5 forbids the eyebrow, and §7 requires the primary action to resolve to the
 * approved RFQ route rather than /contact.
 *
 * ------------------------------------------------------------------------
 * ALWAYS PRESENT — no eligibility gate of any kind (§11, Composition §9)
 * ------------------------------------------------------------------------
 *
 * §11: "Final CTA has no data eligibility threshold or evidence feature flag.
 * It must remain visible when Price, Products, Evidence or Industries fail or
 * are omitted." That is structural here, not merely intended: there is NO
 * `return null` in this file, no props other than `locale`, and the import list
 * contains no repository, binding, flag or projection — so there is nothing
 * that could suppress it. Industries currently returns `null` (no reviewed
 * imagery yet) and Verified Evidence does not exist at all; neither fact
 * reaches this component, which renders identically either way.
 *
 * Deliberate implementation choices, each traceable to a frozen rule:
 *
 * - CANONICAL RFQ DESTINATION (§7). The primary action resolves through
 *   `localizedPath(locale, "/request")` — the exact helper and route
 *   components/home/hero.tsx already uses for the approved primary CTA
 *   (Hero V2.4; pinned by lib/content/hero-frozen-spec-invariants.test.ts).
 *   No per-locale string is hard-coded, no new route was created, and the
 *   older /contact destination CtaBand uses is deliberately not reused. §11:
 *   a missing route would be a release defect, never a "#".
 * - VERIFIED TELEPHONE CHANNEL (§7). The secondary action is
 *   `tel:${CONTACT_PHONE_E164}`, the single owner-supplied number in
 *   lib/content/contact-channels.ts, already used identically by the Hero,
 *   SiteHeader and the mobile drawer. The number is never written out a second
 *   time here. No callback modal, no business hours, no invented number.
 * - SHARED BUTTON COMPONENT (§7). Both actions consume
 *   docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md through
 *   `variant="primary"`/`"secondary"` at `size="button"` — the same contract
 *   Header and Hero use — so geometry, focus ring, forced-colors boundary and
 *   press feedback are inherited rather than re-implemented. The older
 *   `default`/`lg` Copper variants CtaBand uses are NOT reused; §7 requires
 *   filled-primary/outline-secondary hierarchy, not a Copper accent, and §10
 *   warns outright against Copper for small text on Navy.
 * - ON-DARK COLOR INVERSION (§7). Only the two color pairs are overridden at
 *   the call site: the primary becomes Warm Cream filled with Navy text, the
 *   secondary a transparent surface with a light outline and light label.
 *   §7 requires exactly this inversion — a Navy-filled primary would be
 *   invisible on a Navy section — and it is a consumer-level className
 *   override, not a new variant, so no other Button consumer is affected.
 * - HEIGHT MAY GROW, NEVER CLIP (§6, §7). `h-auto min-h-12 py-3` replaces the
 *   shared `h-12`. At rest the geometry is IDENTICAL — `text-base` is
 *   16px/24px and `py-3` is 12px top + 12px bottom, so 24 + 24 = exactly the
 *   frozen 48px — but under text-only zoom or a large browser minimum font
 *   size the button grows instead of cropping its label, which is what §7
 *   ("At text zoom allow height to grow instead of clipping") requires and
 *   what a fixed `height` cannot do. No `truncate`, `line-clamp` or
 *   `whitespace-nowrap` exists here either.
 * - FOCUS RING RETONED FOR THE NAVY SURFACE (§10). The global focus ring is
 *   Forge Copper `#B04A2F`, which measures 2.83:1 against Steel Navy
 *   `#0B2545` — below the 3:1 non-text contrast floor §10's "contrast-checked
 *   offset outline" requires. The section therefore rebinds
 *   `--aa-color-focus-ring` to Warm Cream for its own subtree only
 *   (14.19:1 on Navy). This is a scoped custom-property override, so BOTH
 *   focus paths — `.aa-button:focus-visible`'s shorthand in
 *   styles/theme-extensions.css and the cva base's Tailwind utility — pick it
 *   up with no new CSS rule, no `!important`, and zero effect on any other
 *   page. The 3px offset keeps the ring on the Navy field rather than on the
 *   Cream button face.
 * - NO Reveal, NO "use client", zero dedicated JS (§10: "All content and links
 *   must work without client-side motion or hydration"; §11's JS-disabled
 *   check). The simplest compliant implementation has no entrance animation at
 *   all, so the SSR render, the JS-disabled render, the failed-hydration
 *   render and the `prefers-reduced-motion` render are the same bytes — the
 *   same choice buyer-value.tsx and industries.tsx already made, and strictly
 *   stronger than reusing components/ui/reveal.tsx.
 * - NO eyebrow, icon, arrow, image, counter, process rail or third action
 *   (§5, §6, §10). A bare `<h2 id>` is pointed at by `aria-labelledby`. There
 *   is deliberately no `<ArrowRight>`: §10 makes arrows optional and requires
 *   any arrow be decorative and locale-aware, and the simplest way to satisfy
 *   "no external icon dependency solely for this section" is to have none.
 * - Zero I/O. Pure localized editorial content, server-rendered. Odoo,
 *   DB_PUBLIC, the catalog/processing projections, pricing and Evidence are
 *   all irrelevant to it and none is imported, so none of them can suppress
 *   it — which is exactly what §11 and Composition §9 require of the one
 *   section that must always close the page.
 *
 * SURFACE (§6 / Visual System §9, §14 "Final action -> Navy high-emphasis
 * surface"): full-width flat Steel Navy `#0B2545` via the existing `bg-navy`
 * token, content aligned to the shared `container-x`. Deliberately NOT
 * `bg-navy-800` (the darker `--aa-color-action-primary-bg-active` interaction
 * shade CtaBand uses) — §6 names the surface by its hex, and `--color-navy` is
 * the alias that resolves to exactly `#0B2545`. No Cream inset card, no
 * engineering grid, no background photograph, no image panel, no decorative
 * SVG, no hero-scale radius, no shadow and no gradient: §6 forbids each by
 * name, and Visual System §8.1/§9 reserve the complete Hero composition for
 * the Hero alone.
 *
 * CONTRAST, computed from the actual token hex values rather than assumed:
 * Warm Cream `#FBF5EB` on Navy `#0B2545` = 14.19:1 (heading, §6 floor 3:1);
 * White `#FFFFFF` on Navy = 15.39:1 (supporting text and reassurance, §6 floor
 * 4.5:1). Full-strength White is used for both rather than the `text-white/60`
 * CtaBand applies to its body — that composites to ~6.4:1, which would pass,
 * but §6 says to "avoid arbitrary opacity that makes secondary text
 * unreadable", so the opacity is simply not introduced.
 *
 * LAYOUT (§6):
 *
 *   narrow  ->  ONE column, semantic order H2 -> supporting -> primary ->
 *               secondary -> reassurance, buttons filling the content width
 *   lg+     ->  TWO columns, ~60% copy at the reading start / ~40% actions at
 *               the reading end
 *
 * `lg` (64rem/1024px) is §6's own initial breakpoint, kept after a content-fit
 * check. At 1024px the `container-x` width is 1024 - 2 x clamp()-resolved
 * 30.7px gutter = ~962px; the 48px gap is absorbed proportionally by the two
 * flex children, giving ~549px of copy and ~366px of action column. The
 * longest approved supporting string is the Persian one at ~107 characters,
 * which is roughly two lines at 16px in 549px, and the Persian H2 (39
 * characters at 36px) is two lines — comfortable, and the `max-w-2xl` cap
 * keeps the reading measure controlled at wider viewports (Visual System §12
 * prohibits long Persian lines spanning the full content width).
 *
 * BUTTONS ARE STACKED, NOT SIDE BY SIDE, AND THAT IS THE VERIFIED CHOICE (§6).
 * §6 permits side-by-side "when their full labels fit" and requires stacking
 * otherwise — "never truncate labels or force four-word English labels into a
 * narrow width". The arithmetic says they do not fit: the longest pair is
 * English, "Send your purchase list" (23 characters) and "Request pricing by
 * phone" (24), which at 16px semibold Estedad (~8.5px average Latin advance)
 * need ~196px and ~204px of text plus 56px of `px-7` padding each — ~252px and
 * ~260px, i.e. ~524px including a 12px gap. The action column is at most 40%
 * of the 1280px maximum container, i.e. ~512px, and only ~366px at the 1024px
 * breakpoint itself. So a side-by-side row would force exactly the narrow
 * English buttons §6 names. They are stacked with a `gap-3` (12px, inside §6's
 * 12-16px mobile range) at every width instead, each well past §7's ~180px
 * desktop minimum, and the reassurance sits directly below the PAIR so it is
 * visually associated with both.
 *
 * HONEST LIMIT ON THOSE NUMBERS: the widths above are computed from the
 * container/gutter/padding arithmetic and character counts, NOT read off a
 * rendered browser. Live-browser measurement was unavailable in the session
 * that wrote this component, so the layout is verified structurally —
 * compiled-CSS rules and server-rendered DOM — rather than visually. Overflow
 * specifically IS structurally safe: the two columns are flex children with
 * the default `min-width: auto` relaxed by their percentage widths and
 * `flex-shrink: 1`, nothing is `nowrap`, and no fixed pixel width appears
 * anywhere in this file, so no width can produce horizontal scroll (§6 "no
 * horizontal scrolling").
 *
 * SPACING (§8) — every value comes from the shared scale; §8 forbids adding
 * "both external spacing and equivalent section padding at the same boundary",
 * so the section owns all of its own rhythm and no sibling adds a margin
 * against it. H2-to-supporting `mt-4` = 16px (§8 target 12-16). Copy-to-actions
 * when stacked `mt-8` = 32px (target 24-32), collapsed to `lg:mt-0` once the
 * two columns sit side by side. Reassurance gap `mt-4` = 16px (target 12-16).
 *
 * RECORDED EXCEPTION (Visual System §23 requires exceptions be explicit).
 * Section vertical padding is `py-20 lg:py-28` = 80/112px. Desktop 112px sits
 * inside §8's 96-120px target; mobile 80px sits above its 56-72px target. The
 * shared value is used deliberately, because Visual System §13 requires all
 * major Homepage sections share one rhythm and every sibling section uses
 * exactly `py-20 lg:py-28` — a component-specific mobile value would be the
 * visible inconsistency Visual System §21.12 treats as a failure. This is the
 * same recorded exception buyer-value.tsx and industries.tsx already carry.
 *
 * FOOTER BOUNDARY (§9). `components/layout/SiteFooter.tsx` is also `bg-navy`,
 * so this is a Navy-to-Navy transition. §9's remedy is applied literally: a
 * restrained light divider (`border-b border-white/20`, a hairline, not a
 * band) plus deliberate independent padding on both sides — this section's own
 * 80/112px and the Footer's own 64/80px. No unrelated light section was
 * inserted into the frozen composition to separate them, and the Footer's
 * links, copy, ownership and layout were not touched at all.
 *
 * RTL/LTR (§8). One shared, direction-aware implementation. The flex row's
 * main axis already follows the container's text direction, so FA/AR render
 * copy-right / actions-left and EN copy-left / actions-right from identical
 * markup — the same technique the Hero uses, with no `order`, no `tabindex`
 * and no mirrored variant. DOM reading order IS the semantic order in all
 * three locales, so nothing depends on CSS to produce a correct screen-reader
 * sequence. No tracking utility is applied to any text (§8: no Persian/Arabic
 * letter-spacing).
 */
export function FinalCta({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].finalCta;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="bg-navy border-b border-white/20 py-20 lg:py-28 [--aa-color-focus-ring:var(--aa-color-brand-cream-50)]"
    >
      <div className="container-x flex flex-col lg:flex-row lg:items-center lg:gap-12">
        {/*
          §6's reading-start copy column. `max-w-2xl` gives the heading block
          the controlled maximum line length Visual System §12 requires, so the
          Persian H2 and supporting sentence never span the full 80rem
          container.
        */}
        <div className="lg:w-[60%]">
          <h2
            id={HEADING_ID}
            className="max-w-2xl text-3xl leading-[1.15] font-bold text-balance text-[var(--aa-color-brand-cream-50)] sm:text-4xl lg:text-[2.5rem]"
          >
            {t.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white">{t.body}</p>
        </div>

        {/*
          §6's reading-end action area. On narrow viewports this simply follows
          the copy in the same DOM order, which is also the required semantic
          order H2 -> supporting -> primary -> secondary -> reassurance.
        */}
        <div className="mt-8 lg:mt-0 lg:w-[40%]">
          <div className="flex flex-col gap-3">
            <ButtonLink
              href={localizedPath(locale, "/request")}
              variant="primary"
              size="button"
              className="h-auto min-h-12 w-full bg-[var(--aa-color-brand-cream-50)] py-3 text-navy shadow-none hover:bg-white active:bg-white"
            >
              {t.primaryCta}
            </ButtonLink>
            <a
              href={`tel:${CONTACT_PHONE_E164}`}
              className={cn(
                buttonVariants({ variant: "secondary", size: "button" }),
                "h-auto min-h-12 w-full border-white/70 py-3 text-white hover:border-white hover:bg-white/10",
              )}
            >
              {t.secondaryCta}
            </a>
          </div>
          {/* §5: visible normal text next to the action area — never a tooltip or a legal footnote. */}
          <p className="mt-4 text-sm leading-relaxed text-white">{t.reassurance}</p>
        </div>
      </div>
    </section>
  );
}
