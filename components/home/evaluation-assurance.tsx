import { homepageCopy } from "@/lib/content/homepage";
import { evaluationAxisIndex } from "@/lib/content/evaluation-assurance";
import type { Locale } from "@/config/locales";

const HEADING_ID = "home-evaluation-assurance-heading";

/**
 * Evaluation / Assurance — implements the frozen V2.1 spec
 * (docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md).
 *
 * Answers exactly one customer question (§1): "پیش از ارائه پیشنهاد، چه
 * چیزهایی بررسی می‌شود؟" — what is CHECKED, never what happens next. The
 * chronological "what happens, and in what sequence" question stays owned by
 * components/home/process.tsx (§41's mandatory boundary), which is why there
 * is no step language, no arrow, no connector, and no <ol> here.
 *
 * This component REPLACES two retired v0-baseline sections that used to sit
 * between Product Showcase and Process — `components/home/capabilities.tsx`
 * ("آنچه ما انجام می‌دهیم") and `components/home/assurance.tsx` ("روش
 * ارزیابی"). Neither one's content was migrated: §15 forbids a "what we do"
 * list inside this component, and §4.1 names "روش ارزیابی" first among the
 * six generic headings it must not use.
 *
 * Deliberate implementation choices, each traceable to the spec:
 *
 * - NO SectionHeading. §29 freezes the structure as `<h2>` + `<p>` + `<ul>`
 *   with no eyebrow, and SectionHeading's `eyebrow` prop is required — every
 *   natural Persian eyebrow for this concept is on §4.1's forbidden list, so
 *   satisfying that prop would mean inventing banned copy. A bare `<h2 id>`
 *   pointed at by `aria-labelledby` is the same shape
 *   components/home/price-strip.tsx already uses on this page.
 * - `<ul>`, never `<ol>` (§29): the four axes are criteria, not steps.
 * - NO Reveal / zero dedicated JS (§38 "0 dedicated interaction JS", §26
 *   "motion is optional"). The simplest compliant implementation has no
 *   reveal at all, so JS-off, reduced-motion, and SSR are the same render.
 * - No image (§39 "No image is required for this section"), no icons (§21),
 *   no CTA (§25), no card grid (§18), no interaction of any kind (§23/§24) —
 *   rows are rendered as plain, non-focusable, non-clickable list items with
 *   no hover state whatsoever.
 * - Warm cream surface / navy text / restrained copper index / subtle
 *   dividers (§19), reusing the existing `--aa-color-bg-warm` token rather
 *   than introducing a new one.
 * - Zero I/O (§36): pure localized editorial content, SSR/static. Odoo,
 *   DB_PUBLIC, the Processing/Product projections, and pricing are all
 *   irrelevant to it, so none of them can break it (§40).
 *
 * Layout: ~40/60 intro-to-list split on desktop (§16.1) via a 5/7 split of a
 * 12-column grid, collapsing to a single column below `lg` — earlier than the
 * framework default, which §28 explicitly permits when localized content fit
 * calls for it (FA/AR/EN axis copy is long enough that a 40/60 split at
 * tablet width produces an uncomfortably narrow measure). Stacked DOM order
 * is exactly §27's required mobile reading order: H2 → supporting copy →
 * axis 01 → 02 → 03 → 04. Directions are logical (`ms`/`gap`, no physical
 * left/right), so FA/AR RTL and EN LTR share one implementation (§34).
 */
export function EvaluationAssurance({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].evaluationAssurance;

  return (
    <section aria-labelledby={HEADING_ID} className="border-border border-b bg-[var(--aa-color-bg-warm)] py-20 lg:py-28">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 id={HEADING_ID} className="text-navy text-3xl leading-[1.15] font-bold text-balance sm:text-4xl lg:text-[2.5rem]">
              {t.title}
            </h2>
            <p className="text-muted-foreground mt-5 text-base leading-relaxed">{t.body}</p>
          </div>

          {/*
            §22: dividers are permitted between rows and the final row needs
            no bottom divider — `divide-y` gives exactly that (Tailwind v4
            applies a bottom border to every child except the last; verified in
            the browser: rows 1–3 carry a 1px --color-border rule, row 4 none).
            They are never the ONLY separator — row padding and the per-row
            <h3> already communicate the grouping, so the section still reads
            correctly if the divider color is lost, which is what §22 requires.
          */}
          <ul className="divide-border divide-y self-start lg:col-span-7">
            {t.axes.map((axis, i) => (
              <li key={axis.title} className="py-7 first:pt-0 last:pb-0">
                <div className="flex items-baseline gap-4">
                  {/*
                    §20/§20.1: decorative scanning aid only — locale-scripted
                    (FA ۰۱–۰۴ / AR ٠١–٠٤ / EN 01–04), tabular figures, always
                    aria-hidden, deliberately smaller than the row heading, and
                    never styled as a step badge. The list order is carried
                    entirely by the DOM, so hiding these from assistive tech
                    loses nothing.
                  */}
                  <span aria-hidden="true" className="text-copper shrink-0 text-sm font-semibold tabular-nums">
                    {evaluationAxisIndex(locale, i)}
                  </span>
                  <h3 className="text-navy text-lg font-bold">{axis.title}</h3>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{axis.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
