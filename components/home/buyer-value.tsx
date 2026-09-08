import { homepageCopy } from "@/lib/content/homepage";
import { buyerValuePromiseIndex } from "@/lib/content/buyer-value";
import type { Locale } from "@/config/locales";

const HEADING_ID = "home-buyer-value-heading";

/**
 * Buyer Value / Service Promise — implements the frozen V1.0 spec
 * (docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md),
 * placed on the Homepage by
 * docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md §4,
 * and styled per
 * docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md.
 *
 * Answers exactly one buyer question (§1): "Why should I place my steel
 * request with Ahan Asa?" — supplier selection. It owns human accountability,
 * coordinated handling of diverse requested items, equal seriousness for small
 * and bulk requests, and follow-up through agreed delivery obligations (§2).
 *
 * It does NOT own product discovery, price reporting, the technical/commercial
 * review checklist, operational statistics, industry case studies, or the
 * primary conversion CTA (§2) — which is why there is no product link, no
 * price, no metric, and no button anywhere in this file.
 *
 * SUPERSESSION. For the Homepage this component replaces
 * `components/home/evaluation-assurance.tsx` (§21, Composition §8). That file,
 * its content, and its frozen V2.1 spec are all deliberately RETAINED and
 * untouched — the Homepage simply stopped importing it. Nothing was deleted.
 *
 * Deliberate implementation choices, each traceable to a frozen rule:
 *
 * - `<ul role="list">`, never `<ol>` (§8). The four promises are not
 *   sequential steps, and §7 is explicit that the visible numbers "communicate
 *   grouping and scanability, not a chronological process". This is the exact
 *   INVERSE of components/home/process.tsx, whose `<ol>` carries real
 *   chronology. `role="list"` is written out because Tailwind Preflight sets
 *   `list-style: none`, which drops native list semantics in Safari/VoiceOver;
 *   §16 requires "Promises are represented as one semantic list".
 * - NO Reveal, NO "use client", zero dedicated JS (§13: "The content MUST be
 *   visible by default. JavaScript or animation failure MUST NOT leave any
 *   item at `opacity: 0`"). The simplest compliant implementation has no
 *   entrance animation at all, so the SSR render, the JS-disabled render, the
 *   failed-hydration render and the `prefers-reduced-motion` render are the
 *   same bytes. This is strictly stronger than reusing
 *   `components/ui/reveal.tsx`, and matches what the two sibling frozen
 *   editorial components already do.
 * - NO SectionHeading, and in particular NO `.eyebrow` utility. That utility
 *   applies `text-transform: uppercase` and `letter-spacing: 0.16em`, and §12
 *   states "No artificial letter-spacing is permitted for Persian or Arabic
 *   text" — two of the three locales render this eyebrow in Persian/Arabic.
 *   The eyebrow is therefore plain small semibold Copper text with normal
 *   tracking (§9.2 "Forge Copper, small and restrained"), and the section uses
 *   a bare `<h2 id>` pointed at by `aria-labelledby`, the same shape
 *   evaluation-assurance.tsx, process.tsx and price-strip.tsx already use.
 * - NO CTA of any kind (§14, §22.4). Conversion stays owned by the Header,
 *   Hero and Final CTA (Composition §11). There is no `<Link>`, no `<button>`,
 *   no `href`, and therefore nothing focusable — §16: "No keyboard focus is
 *   introduced for non-interactive items."
 * - NO icons, NO image, NO per-item background, shadow, radius, hover lift or
 *   pointer cursor (§9.3, §14). Promise items must not read as clickable, and
 *   §9.3 prohibits generic stock icons outright.
 * - Zero I/O. Pure localized editorial content, server-rendered. Odoo,
 *   DB_PUBLIC, the catalog/processing projections and pricing are all
 *   irrelevant to it, so none of them can suppress it — which is what
 *   Composition §9 requires of an always-present section.
 *
 * SURFACE (§9.1 / Visual System §6.2 "Content Section"): full-width Warm Cream
 * `#FBF5EB` via the existing `--aa-color-bg-warm` token, content aligned to the
 * shared `container-x`. No outer floating card, no engineering grid, no image
 * panel, no section shadow — Visual System §7 names "placing every section
 * inside a large floating card" as the Card Soup anti-pattern, and §6.1
 * reserves the complete Hero treatment for the Hero alone. The preceding
 * Product Showcase sits on White (`bg-background`), so the transition into this
 * section is visible without a heavy divider (§9.1).
 *
 * LAYOUT — the load-bearing rule (§9.3, §9.4, §15, §22.7):
 *
 *   narrow  ->  ONE column
 *   md+     ->  flat 2x2 grid
 *
 * There is NO four-column state at any width, ever, and that is structural
 * rather than merely untested: the grid declares exactly two column tracks
 * (`md:grid-cols-2`) and no other `grid-cols-*` utility appears in this file,
 * so no width can produce a third or fourth track. §9.4 freezes 2x2 precisely
 * because "the approved Persian, English, and Arabic copy requires comfortable
 * line length" and four columns would produce "narrow, tall text columns".
 *
 * `md` (48rem/768px) rather than a later breakpoint is set from content fit,
 * as §15 requires ("Breakpoints MUST respond to content fit"). At 768px the
 * `container-x` width is 768 - 2 x clamp()-resolved 23px gutter = 722px, so
 * each column is 361px and each promise's text measure is ~321px after the
 * 40px divider-side padding. Against the longest approved string in each
 * locale that measure yields roughly four to five lines of 14px body copy and
 * two lines of 18px H3 — comfortable, and inside §12's two-line H3 target.
 *
 * HONEST LIMIT ON THAT NUMBER: the widths above are computed from the
 * container/gutter/padding arithmetic and character counts, NOT read off a
 * rendered browser. Live-browser measurement was BLOCKED in the session that
 * wrote this component (no Chrome extension connected), so the layout is
 * verified structurally — compiled-CSS rules and server-rendered DOM — rather
 * than visually. Overflow specifically IS structurally guaranteed: the
 * compiled rule is `grid-template-columns: repeat(2, minmax(0, 1fr))`, and the
 * `minmax(0, ...)` floor is what stops a long unbroken token from forcing a
 * track wider than its share and producing horizontal scroll (§15 "No
 * horizontal scrolling is permitted"). If a future session gets a real browser,
 * §20's locale sweep should confirm the line counts and may move this
 * breakpoint later; nothing else in the component depends on the exact value.
 *
 * DIVIDERS (§10). Exactly one central vertical and one central horizontal
 * divider in the 2x2 — never a full grid of rules, never a box per item:
 *
 *   md+     item 02 and item 04 carry `border-s`  -> ONE vertical rule
 *           item 03 and item 04 carry `border-t`  -> ONE horizontal rule
 *   narrow  items 02, 03, 04 carry `border-t`     -> inter-item rules only,
 *           item 01 has none (no unnecessary top border) and item 04 has no
 *           bottom border (no rule after the final item)
 *
 * Neither rule reaches the section's outer edge: both are drawn inside
 * `container-x`, which is inset from the viewport by `--aa-page-gutter`, and
 * the section's own 80/112px vertical padding keeps the vertical rule clear of
 * the top and bottom edges. Internal padding does the rest of the separating,
 * per §10. The rules use `--color-border` (the approved neutral-200 token,
 * Visual System §5.3), never Forge Copper — §10: "Dividers MUST remain visible
 * but quiet and MUST NOT use full-strength Forge Copper." They are also never
 * the only grouping signal: the `<h3>` per item and the per-item padding
 * already carry it, so the section still reads correctly if the rule colour is
 * not perceived at all.
 *
 * SPACING (§11) — every value comes from the shared scale; §11 forbids
 * "one-off arbitrary spacing tokens solely for this component". Header-to-grid
 * `mt-9`/`md:mt-12` = 36/48px (§11 targets 28-36 / 40-48). Number-to-H3
 * `gap-4` = 16px (target 12-16). H3-to-body `mt-3` = 12px (target 10-14).
 *
 * RECORDED EXCEPTION (Visual System §23 requires exceptions be explicit).
 * Section vertical padding is `py-20 lg:py-28` = 80/112px. Desktop 112px sits
 * inside §11's 96-120px target; mobile 80px sits above its 56-72px target. The
 * shared value is used deliberately, because two harder rules point at it:
 * §11's own "Exact values MUST use the shared spacing scale", and Visual System
 * §13's requirement that all major Homepage sections share one rhythm — every
 * neighbouring section (Hero, Product Showcase, Reach, and the retained
 * Evaluation/Purchase Process components) uses exactly `py-20 lg:py-28`, so a
 * component-specific mobile value would be the visible inconsistency Visual
 * System §21.12 treats as a failure. The §11 figures are stated as "Target
 * behavior", not as a release gate.
 *
 * RTL/LTR (§12, §15). One shared, direction-aware implementation: every
 * axis-sensitive utility is logical, not physical (`border-s`, `ps-*`, `pe-*`,
 * `gap`), so FA/AR lay out right-to-left and EN left-to-right from identical
 * markup, with no mirrored variant and no per-locale component. Reading order
 * matches visual order in all three locales because the DOM order IS the
 * promise order (§16).
 */

/**
 * Per-item classes for the exactly-four promises (§22.2). Written as four
 * complete literal strings rather than composed at runtime: Tailwind scans
 * source text, so a computed class name (`md:${side}-10`) would be purged from
 * the compiled stylesheet and the divider would silently disappear in
 * production. Index 0..3 maps to promise 01..04; the array length is asserted
 * against BUYER_VALUE_PROMISE_COUNT in the invariants test.
 */
const PROMISE_CELL_CLASSES = [
  // 01 — row 1 / column 1. No divider on any side; no top padding (first item
  // in the single-column stack), bottom padding clears the horizontal rule.
  "pb-7 md:pb-10 md:pe-10",
  // 02 — row 1 / column 2. Carries the vertical rule from `md` up; in the
  // single-column stack it instead carries the first inter-item rule, which is
  // why `border-t` is switched off again at `md`.
  "border-border border-t pt-7 pb-7 md:border-t-0 md:border-s md:ps-10 md:pt-0 md:pb-10",
  // 03 — row 2 / column 1. Its `border-t` is the central horizontal rule at
  // `md` and an inter-item rule below it — the one item where both layouts
  // want the same border.
  "border-border border-t pt-7 pb-7 md:pe-10 md:pt-10 md:pb-0",
  // 04 — row 2 / column 2. Where both central rules meet. No bottom padding
  // and no bottom border: §10 "No divider appears after the final item."
  "border-border border-t pt-7 md:border-s md:ps-10 md:pt-10",
];

export function BuyerValue({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].buyerValue;

  return (
    <section aria-labelledby={HEADING_ID} className="border-border border-b bg-[var(--aa-color-bg-warm)] py-20 lg:py-28">
      <div className="container-x">
        {/*
          §7's frozen hierarchy: eyebrow -> H2 -> one supporting statement ->
          four promises -> no CTA. `max-w-2xl` gives the heading block the
          "controlled maximum line length" §9.2 requires, so the H2 and the
          supporting sentence never span the full 80rem container (Visual
          System §12: "long Persian lines spanning the full content width are
          prohibited").
        */}
        <div className="max-w-2xl">
          {/*
            §9.2: Forge Copper, small and restrained, and secondary to the H2
            (§7). Deliberately NOT the `.eyebrow` utility — its uppercase +
            0.16em tracking is exactly the "artificial letter-spacing" §12
            forbids for the Persian and Arabic versions of this string.
          */}
          <p className="text-copper text-sm font-semibold">{t.eyebrow}</p>
          <h2 id={HEADING_ID} className="text-navy mt-4 text-3xl leading-[1.15] font-bold text-balance sm:text-4xl lg:text-[2.5rem]">
            {t.title}
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">{t.body}</p>
        </div>

        {/*
          §9.3 "One flat 2x2 grid on desktop and tablet ... One column on
          mobile". Exactly two column tracks and no other grid-cols utility
          anywhere in this file, so a four-up state is structurally
          unreachable (§9.4). No `gap` — the dividers and the per-item padding
          in PROMISE_CELL_CLASSES do the separating, and a gap would pull the
          two central rules apart into four floating edges.
        */}
        <ul role="list" className="mt-9 grid md:mt-12 md:grid-cols-2">
          {t.promises.map((promise, i) => (
            <li key={promise.title} className={PROMISE_CELL_CLASSES[i]}>
              <div className="flex items-baseline gap-4">
                {/*
                  §7/§8: decorative scanning aid only — locale-scripted
                  (FA ۰۱–۰۴ / AR ٠١–٠٤ / EN 01–04), tabular figures, always
                  aria-hidden so it cannot produce the "duplicated or
                  misleading screen-reader announcements" §8 warns about.
                  Never styled as a step badge, and never animated as a
                  sequence (§13).
                */}
                <span aria-hidden="true" className="text-copper shrink-0 text-sm font-semibold tabular-nums">
                  {buyerValuePromiseIndex(locale, i)}
                </span>
                <h3 className="text-navy text-lg font-bold">{promise.title}</h3>
              </div>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{promise.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
