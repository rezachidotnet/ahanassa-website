import Image from "next/image";
import { homepageCopy } from "@/lib/content/homepage";
import { isIndustriesCopyComplete, resolveIndustrySectorImages } from "@/lib/content/industries";
import type { Locale } from "@/config/locales";

const HEADING_ID = "home-industries-heading";

/**
 * Industries / Use Cases — implements the frozen V1.0 spec
 * (docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md),
 * placed on the Homepage by
 * docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md §4/§6.6,
 * and styled per
 * docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md.
 *
 * Answers exactly one buyer question (§1): "Does Ahan Asa understand purchases
 * or projects like mine?" It is NOT a customer portfolio, case-study block,
 * certification display, service-promise section, product catalog, purchase
 * process, or operational Evidence — §1 assigns each of those elsewhere, which
 * is why there is no logo, no metric, no project count and no CTA in this file.
 *
 * SUPERSESSION. For the Homepage this component replaces
 * `components/home/reach.tsx` (Composition §8). That file, its
 * `homepageCopy.*.reach` content and the `marketsCopy`/`industriesCopy`
 * industry lists it reads are ALL deliberately RETAINED and untouched — the
 * Homepage simply stopped importing it, and `/industries` and `/markets` still
 * publish those lists. Nothing was deleted. Same pattern as the Evaluation /
 * Assurance and Purchase Process supersessions before it.
 *
 * ------------------------------------------------------------------------
 * CURRENT STATE: THIS SECTION RENDERS NOTHING. That is correct, not a bug.
 * ------------------------------------------------------------------------
 *
 * §10 gates publication on four things at once — approved scope, complete
 * localized copy, REVIEWED IMAGERY, and a server-side enable state. Copy and
 * scope are complete and pinned by the invariants test; imagery is not. No
 * asset in this repository or in the operator's import area depicts a
 * construction site, a petrochemical/oil/gas facility or a fabrication
 * workshop, and none carries recorded provenance
 * (01-sources/MEDIA_GUIDELINES.md: "Unknown provenance defaults to
 * `restricted`"; `restricted` "Must not be published"). §8 is explicit: "Do
 * not ship the component with missing initial image assets; the fallback
 * covers runtime failure" — the §8 fallback is for a request that fails at
 * runtime, never a substitute for selecting assets.
 *
 * So `resolveIndustrySectorImages()` returns `null` and this component returns
 * `null` BEFORE any markup exists. Everything below is written, typed and
 * tested; supplying three approved assets in `INDUSTRY_SECTOR_IMAGES`
 * (lib/content/industries.ts) publishes it with no further code change. See
 * docs/industries/INDUSTRIES_P1_V1_0_IMPLEMENTATION_REPORT.md.
 *
 * Deliberate implementation choices, each traceable to a frozen rule:
 *
 * - ALL-OR-NOTHING OMISSION (§10, Composition §9). The two `return null`
 *   guards run before the first `<section>`, so an ineligible state drops the
 *   COMPLETE semantic section — no empty H2, no placeholder shell, no
 *   background band, no unexplained whitespace, and never a one- or two-item
 *   subset. §10: "Do not display incomplete one-/two-item subsets in V1.0".
 * - `<ul role="list">`, never `<ol>` (§9: "one unordered list of three items"
 *   and "No visible sequential numbers: these are sectors, not steps or a
 *   ranking"). This matches buyer-value.tsx and is the exact INVERSE of
 *   process.tsx, whose `<ol>` carries real chronology. `role="list"` is
 *   written out because Tailwind Preflight sets `list-style: none`, which
 *   drops native list semantics in Safari/VoiceOver.
 * - NO visible index numbers. Both sibling editorial components render a
 *   decorative 01-04 marker; §9 forbids one here, so there is no counterpart
 *   to `buyerValuePromiseIndex`/`purchaseStepIndex` and no such module exists.
 * - NO Reveal, NO "use client", zero dedicated JS (§9: "Motion may be
 *   omitted... Content must be visible by default, without hydration or
 *   IntersectionObserver success"). The simplest compliant implementation has
 *   no entrance animation at all, so the SSR render, the JS-disabled render,
 *   the failed-hydration render and the `prefers-reduced-motion` render are
 *   the same bytes. Same choice buyer-value.tsx and process.tsx already made.
 * - NO SectionHeading and NO eyebrow (§3: "No extra eyebrow or introductory
 *   paragraph is required"; §6 freezes H2 -> three items). A bare `<h2 id>`
 *   is pointed at by `aria-labelledby`. No tracking utility is applied to any
 *   text, per §6 "No artificial tracking for FA/AR".
 * - NO CTA, link, button, pointer cursor or hover lift of any kind (§9).
 *   Conversion stays owned by the Header, Hero and Final CTA (Composition
 *   §11). There is no `<Link>`, no `href`, and therefore nothing focusable —
 *   the items are informational, so introducing a tab stop would be wrong.
 *   §9 specifically forbids inventing sector routes or pointing all three
 *   items at one generic page, so neither was done.
 * - NO Copper. §6 makes it "optional and restrained, not a background"; with
 *   no eyebrow and no index markers there is no restrained place for it, so
 *   the section is Navy-on-White and the accent budget stays with the
 *   components that need it (Visual System §21.2).
 * - Zero I/O. Pure localized editorial content plus a static asset manifest,
 *   server-rendered. §10: "A new Odoo model, 100-record threshold or evidence
 *   pipeline is not required for this component. The Evidence threshold
 *   applies only to Evidence." Odoo, DB_PUBLIC, the catalog/processing
 *   projections and pricing are all irrelevant here and none is imported, so
 *   none of them can suppress this section — and this section can suppress
 *   none of them (Composition §9's independent-failure rule).
 *
 * SURFACE (§6 / Visual System §6.2 "Content Section"): full-width White
 * `#FFFFFF` via the existing `bg-background` token, content aligned to the
 * shared `container-x`. No outer floating card, no individual filled item
 * cards, no strong shadow, no Hero engineering grid, no heavy overlay — §6
 * names each of those, and Visual System §7 calls a page of floating cards the
 * Card Soup anti-pattern.
 *
 * BUYER VALUE BOUNDARY (§6 "visually distinct from Buyer Value and Hero").
 * Buyer Value immediately precedes this section on Warm Cream
 * (`--aa-color-bg-warm`); this section is White. That is a real but calm
 * surface change, readable without a heavy divider, and it was achieved
 * WITHOUT altering Buyer Value.
 *
 * FINAL CTA BOUNDARY. `components/ui/cta-band.tsx` follows on the Navy
 * high-emphasis surface, so the White -> Navy transition is deliberate and is
 * not a dark-to-dark collision. The single `border-b` here is the same quiet
 * hairline every sibling section carries; the section's own bottom padding is
 * the only bottom spacing, so no double margin is created against the CTA. If
 * this section is omitted, Buyer Value's own `border-b` and padding meet the
 * CTA directly and nothing is left behind — there is no wrapper to collapse.
 *
 * LAYOUT — the load-bearing rule (§7):
 *
 *   narrow  ->  ONE column
 *   lg+     ->  THREE equal columns
 *
 * There is NO two-column state at any width, ever, and that is structural
 * rather than merely untested: the grid declares exactly one responsive
 * column-track utility (`lg:grid-cols-3`) and no other `grid-cols-*` utility
 * appears anywhere in this file, so no width can produce two tracks. §7 is
 * explicit — "Do not create a two-column layout with an isolated third item,
 * autoplay carousel or horizontal scrolling" — and there is likewise no
 * carousel, no `overflow-x`, no scroll-snap and no swipe handler here.
 *
 * `lg` (64rem/1024px) is §7's own initial implementation breakpoint, kept
 * after a content-fit check. At 1024px the `container-x` width is
 * 1024 - 2 x clamp()-resolved 32px gutter = 960px; three tracks with two 32px
 * gaps give (960 - 64) / 3 = ~298px per column. The longest approved body is
 * the Arabic petrochemical string at ~150 characters; at 14px Estedad the
 * average advance is ~7px for Arabic script and ~6.6px for Latin, so ~298px
 * carries ~42 Arabic / ~45 Latin characters per line, i.e. roughly four lines
 * for the longest body in each locale, and the longest H3 ("Manufacturing and
 * fabrication", 30 characters) fits in two lines at 18px. That is comfortable
 * and inside §7's "avoid narrow/tall text columns".
 *
 * HONEST LIMIT ON THAT NUMBER: the widths above are computed from the
 * container/gutter/gap arithmetic and character counts, NOT read off a
 * rendered browser, and the section does not render today so no live
 * measurement of it is even possible. Live-browser measurement was BLOCKED in
 * the session that wrote this component (no Chrome extension connected), so
 * the layout is verified structurally — compiled-CSS rules — rather than
 * visually. Overflow specifically IS structurally guaranteed: the compiled
 * rule is `grid-template-columns: repeat(3, minmax(0, 1fr))`, and the
 * `minmax(0, ...)` floor is what stops a long unbroken token from forcing a
 * track wider than its share and producing horizontal scroll. §11's locale
 * sweep must confirm the line counts when the section is first published, and
 * may move this breakpoint later; nothing else here depends on the value.
 *
 * SPACING (§6) — every value comes from the shared scale. Section padding is
 * `py-20 lg:py-28` = 80/112px: desktop 112px sits inside §6's 96-120px target,
 * and the shared mobile 80px is used deliberately over §6's 56-72px because
 * Visual System §13 requires all major Homepage sections share one rhythm —
 * every neighbouring section uses exactly `py-20 lg:py-28`, so a
 * component-specific mobile value would be the visible inconsistency Visual
 * System §21.12 treats as a failure. This is the same recorded exception
 * buyer-value.tsx already carries. H2-to-group `mt-9`/`lg:mt-12` = 36/48px
 * (§6 target 32-48). Image-to-H3 `mt-5` = 20px (target 16-20). H3-to-body
 * `mt-3` = 12px (target 10-14). Inter-item gap `gap-10` = 40px narrow (§7
 * target 32-40) and `lg:gap-8` = 32px columns (§6 target 24-32).
 *
 * IMAGES (§8), for when assets land. Common 4:3 via `aspect-4/3` on a wrapper
 * that reserves the geometry BEFORE loading, so there is no CLS; `object-cover`
 * with `fill`; a modest `rounded-xl` (12px) radius; responsive `sizes`; and no
 * `priority`, because the section is below the fold and next/image lazy-loads
 * by default. The wrapper carries `bg-surface-2`, which IS the §8 runtime
 * fallback: if an image request fails, the reserved box stays exactly the same
 * size and shows a quiet neutral tone — the text beside it remains fully
 * visible, no broken-image icon appears (the `alt` is empty, so a failed image
 * renders nothing rather than alt text plus an icon), no technical error text
 * is shown, and one failed image can never hide its item or the section.
 *
 * ALT POLICY (§8). `alt=""` on all three. The images "only illustrate the
 * sectors already named in adjacent headings and add no unique information",
 * so they are decorative; §8 also forbids keyword-stuffed alt outright. This
 * matches product-showcase.tsx's treatment of its representative photography.
 * If a future asset ever conveys meaningful additional information, §8
 * requires accurate localized alt text instead — that would be a content
 * change, not a styling one.
 *
 * RTL/LTR (§2, §6). One shared, direction-aware implementation. The DOM order
 * IS the frozen sector order 1-2-3 in every locale — the array is never
 * reversed (§2: "Do not reverse the data array and also apply RTL") — and
 * every axis-sensitive utility is logical rather than physical, so FA/AR lay
 * out right-to-left and EN left-to-right from identical markup with no
 * mirrored variant and no per-locale component. Text alignment follows the
 * inherited direction; nothing is truncated and no height is fixed (§6).
 */
export function Industries({ locale }: { locale: Locale }) {
  // §10's all-or-nothing gate, evaluated on the server before any markup.
  // Both guards must pass; either failing omits the entire section.
  const images = resolveIndustrySectorImages();
  if (images === null) return null;
  if (!isIndustriesCopyComplete(locale)) return null;

  const t = homepageCopy[locale].industries;

  return (
    <section aria-labelledby={HEADING_ID} className="border-border bg-background border-b py-20 lg:py-28">
      <div className="container-x">
        {/*
          §6's frozen hierarchy: H2 -> three items. No eyebrow, no supporting
          paragraph, no CTA. `max-w-2xl` gives the heading the controlled
          maximum line length Visual System §12 requires, so the Persian H2
          never spans the full 80rem container.
        */}
        <h2 id={HEADING_ID} className="text-navy max-w-2xl text-3xl leading-[1.15] font-bold text-balance sm:text-4xl lg:text-[2.5rem]">
          {t.title}
        </h2>

        {/*
          §7 "Three columns at widths where all three approved translations
          remain comfortably readable ... Below that breakpoint, use one
          column". Exactly one grid-cols utility in this file, so a two-column
          state is structurally unreachable. No overflow-x, no snap, no
          carousel.
        */}
        <ul role="list" className="mt-9 grid gap-10 lg:mt-12 lg:grid-cols-3 lg:gap-8">
          {t.sectors.map((sector, i) => (
            <li key={sector.title}>
              {/*
                §8: geometry reserved before load (no CLS), 4:3, object-cover,
                12px radius. `bg-surface-2` is the quiet neutral fallback that
                remains if the image request fails — the box keeps its size and
                the text below stays visible. Never overlaid on the text (§6:
                "Keep text below imagery, never overlaid").
              */}
              <div className="bg-surface-2 relative aspect-4/3 overflow-hidden rounded-xl">
                <Image
                  src={images[i].src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 31vw, 100vw"
                  className="object-cover"
                />
              </div>
              <h3 className="text-navy mt-5 text-lg font-bold">{sector.title}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{sector.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
