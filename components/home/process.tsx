import { homepageCopy } from "@/lib/content/homepage";
import { purchaseStepIndex } from "@/lib/content/purchase-process";
import type { Locale } from "@/config/locales";

const HEADING_ID = "home-purchase-process-heading";

/**
 * Purchase Process — implements the frozen V2.0 spec
 * (docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md).
 *
 * Answers exactly one customer question (§1): "از ارسال درخواست تا خرید چه
 * اتفاقی می‌افتد؟" — what happens, and in what ORDER. The sibling
 * components/home/evaluation-assurance.tsx immediately above it owns the
 * different question "چه چیزهایی بررسی می‌شود؟" (what is CHECKED), and §3
 * requires the two to stay separate — which is why no grade/standard/
 * documentation/sourcing-feasibility/price-basis/payment-term/Incoterm/
 * delivery-criteria detail appears here (§8.3).
 *
 * This REPLACES the previous six-stage `input`/`activity`/`output` card grid
 * (audited in docs/purchase-process/PURCHASE_PROCESS_P0_CURRENT_IMPLEMENTATION_AUDIT.md).
 * That model is retired from the Homepage outright, not reshaped: §6 freezes
 * exactly four public steps, and its retired steps 03 ("ارزیابی تأمین" —
 * comparing sourcing options) and 06 ("ارتباط با تأمین‌کننده" — supplier
 * communication) are precisely the internal procurement theater §12 and the
 * middleman-chain narration §13 prohibit.
 *
 * Deliberate implementation choices, each traceable to the spec:
 *
 * - `<ol>`, never `<ul>` (§17). This is the deliberate INVERSE of
 *   evaluation-assurance.tsx, which uses `<ul>` because its axes are criteria
 *   with no chronology. Here the sequence is meaningful, so §16 makes the
 *   ordered list "the semantic source of sequence" and the visible 01–04
 *   glyphs "visual scanning only" — hence `aria-hidden` on every index.
 * - NO SectionHeading, and no supporting paragraph. §5 freezes the structure
 *   as `H2 -> 4-step process`, explicitly not `H2 -> generic explanatory
 *   paragraph -> 4-step process` (§39: "Supporting paragraph | None by
 *   default"). SectionHeading's `eyebrow` prop is required, and every natural
 *   Persian eyebrow here sits on §4's forbidden list, so a bare `<h2 id>`
 *   pointed at by `aria-labelledby` is used — the same shape
 *   evaluation-assurance.tsx and price-strip.tsx already use on this page.
 * - NO CTA of any kind (§23 "For V2.0: CTA = none"). The retired `<Link>` to
 *   /contact is gone, along with the `next/link` and `localizedPath` imports:
 *   §23 warns specifically against a conversion button added "merely because
 *   the component ends with Step 04", and Header/Hero/Final CTA already own
 *   conversion on this page.
 * - NO icons, NO images, NO cards, NO borders/shadows around steps (§15/§20).
 *   §15: "The connector + typography + numbering are sufficient visual
 *   structure." Steps are plain, non-focusable, non-clickable list items with
 *   no hover state — nothing may read as clickable.
 * - NO Reveal / zero dedicated JS (§28 "0 dedicated interaction JS", §21
 *   "Motion is optional"). The simplest compliant implementation has no
 *   reveal at all, so SSR, JS-off, and reduced-motion are the same render
 *   (§29: "JavaScript unavailable -> all steps remain visible"). The retired
 *   implementation's per-item `Reveal` stagger is dropped rather than
 *   shortened.
 * - Clean white surface, navy typography, restrained copper markers and
 *   connector (§20), reusing existing tokens and intentionally contrasting
 *   with the warm-cream Evaluation / Assurance section directly above it.
 * - Zero I/O (§27): pure localized editorial content, SSR/static. Odoo,
 *   DB_PUBLIC, the Product/Processing projections, RFQ live state and pricing
 *   are all irrelevant to it, so none of them can break it (§29).
 *
 * LAYOUT — the single most load-bearing rule in this component (§14/§18/§19,
 * regression gate §38.3):
 *
 *   narrow  ->  connected VERTICAL timeline   (ol is `flex flex-col`)
 *   lg+     ->  connected HORIZONTAL timeline (ol is `lg:flex-row`)
 *
 * There is NO intermediate 2x2 (or 2xN) state at any width, ever. That is
 * structural, not merely untested: the list is a single flex line at every
 * breakpoint and `flex-wrap` defaults to `nowrap`, so no wrap class exists to
 * produce a second row. No `grid`/`grid-cols-*` utility appears anywhere in
 * this component — a grid is exactly how the retired implementation produced
 * the forbidden `sm:grid-cols-2` 2-up state §14 rules out for "introducing
 * ambiguous reading direction and weakening the chronological model".
 *
 * CONNECTOR (§14/§21/§22): a 1px copper rule rendered as an `aria-hidden`
 * span, running below each index in vertical mode and beside it in horizontal
 * mode. It is rendered for every step except the last, so the line always ends
 * on step 04 rather than trailing off. It is STATIC — no animation, no
 * transition, no progressive fill, no "current"/"completed" node styling, no
 * checkmarks (§21: "The process connector itself must not animate or
 * progressively fill"; §22: it must never resemble a live order tracker).
 * Because it spans each item's full extent, it meets the next item's index
 * with no visual break, and because chronology is also carried by the DOM
 * order, the `<ol>`, and the numbers, the section still reads correctly if the
 * connector's color is not perceived at all (§31).
 *
 * RTL/LTR (§33): one shared, direction-aware implementation. Every axis-
 * sensitive utility is logical, not physical (`flex` direction, `gap`, `ms-*`,
 * `pe-*`) — so FA/AR lay the horizontal timeline out right-to-left and EN
 * left-to-right from the same markup, with no mirrored variant and no
 * per-locale component.
 */
export function Process({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].purchaseProcess;
  const lastIndex = t.steps.length - 1;

  return (
    <section id="process" aria-labelledby={HEADING_ID} className="border-border bg-background scroll-mt-18 border-b py-20 lg:py-28">
      <div className="container-x">
        <h2 id={HEADING_ID} className="text-navy max-w-3xl text-3xl leading-[1.15] font-bold text-balance sm:text-4xl lg:text-[2.5rem]">
          {t.title}
        </h2>

        {/*
          §14/§18: one flex line at every width — column when narrow, row from
          `lg` up. `flex-wrap` is left at its `nowrap` default on purpose; a
          wrap utility here is what would create the forbidden 2x2 (§38.3).
          `lg` rather than a smaller breakpoint because §19 ties the collapse
          point to actual content fit: at the 80rem container's `lg` width each
          of the four columns is ~215px, which holds the longest FA/AR step
          copy in ~4 lines, while a 4-up row at tablet width would compress
          them past readability.
        */}
        <ol className="mt-14 flex flex-col lg:mt-16 lg:flex-row">
          {t.steps.map((step, i) => (
            <li key={step.title} className="group/step flex min-w-0 gap-5 lg:flex-1 lg:flex-col lg:gap-0">
              {/*
                The rail: index + connector. Flips from a column (index above
                the vertical line) to a row (index beside the horizontal line)
                at the same breakpoint as the list itself.
              */}
              <div className="flex flex-col items-center lg:flex-row lg:items-center">
                {/*
                  §16/§32: decorative scanning aid only — locale-scripted
                  (FA ۰۱–۰۴ / AR ٠١–٠٤ / EN 01–04), tabular figures, always
                  aria-hidden. Sequence semantics live entirely in the <ol>,
                  so hiding these from assistive technology loses nothing.
                  Never styled as a filled step badge or status node (§22).
                */}
                <span aria-hidden="true" className="text-copper shrink-0 text-sm font-semibold tabular-nums">
                  {purchaseStepIndex(locale, i)}
                </span>
                {i < lastIndex && (
                  <span aria-hidden="true" className="bg-copper/40 mt-3 w-px flex-1 lg:mt-0 lg:ms-4 lg:h-px lg:w-auto" />
                )}
              </div>

              <div className="pb-10 group-last/step:pb-0 lg:mt-6 lg:pb-0 lg:pe-8">
                <h3 className="text-navy text-lg font-bold">{step.title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
