# Final CTA — CTA-P1 V1.0 Implementation Report

**Phase:** CTA-P1 — implement Homepage Final CTA V1.0
**Date:** 2026-09-12
**Branch:** `worktree-final-cta-p1`
**Report path rationale:** `docs/final-cta/` follows the established
one-directory-per-concern convention already used by `docs/hero/`,
`docs/buyer-value/`, `docs/industries/`, `docs/product-showcase/`,
`docs/purchase-process/` and `docs/evaluation-assurance/` — the frozen spec and
its implementation report live together beside the component's own authority.

```
FINAL CTA AUTHORITY: V1.0
FINAL CTA: IMPLEMENTED
HOMEPAGE POSITION: PASS
DUPLICATE HOMEPAGE CTA: ABSENT
FA: PASS
EN: PASS
AR: PASS
PRIMARY RFQ DESTINATION: VERIFIED
PHONE ACTION: VERIFIED
HERO ROUTE REUSE: PASS
SHARED BUTTON: PASS
DESKTOP: PASS
MOBILE: PASS
SEMANTICS: PASS
CTA COUNT: 2
REASSURANCE: PASS
IMAGES: ABSENT
PROCESS CONTENT: ABSENT
ODOO DEPENDENCY: ABSENT
DB_PUBLIC DEPENDENCY: ABSENT
EVIDENCE DEPENDENCY: ABSENT
INDUSTRIES DEPENDENCY: ABSENT
SSR: PASS
READY FOR CTA-P2: YES
```

---

# RESULT

**B — FINAL CTA IMPLEMENTED; VERIFIED LIVE VISUAL CHECK GAP REMAINS.**

Every functional, content, destination, semantic, data-independence and
structural requirement of Final CTA V1.0 is implemented and machine-verified.
Both destinations are genuinely verified: the primary resolves through the
Hero's own `localizedPath(locale, "/request")` helper to a route that exists
(`app/[locale]/request/page.tsx`), and the secondary uses the single
owner-supplied `CONTACT_PHONE_E164` already live in the Hero, Header and mobile
drawer. There is no phone configuration gap.

The single reason this is B rather than A is the one thing the spec's §13
handoff explicitly asks for and this session could not do: **live browser
verification**. `mcp__claude-in-chrome__list_connected_browsers` returned `[]`
— no Chrome extension is connected, the same condition the Buyer Value and
Industries phases recorded. So no before/after screenshot at FA/EN/AR desktop,
tablet and mobile exists, no real keyboard-focus observation was made, no
real 200%-zoom reflow was observed, and no rendered pixel measurement backs the
responsive arithmetic below. Everything responsive, geometric and contrast-
related in this report is **computed or read off compiled CSS and
server-rendered DOM**, and is labelled as such throughout. That is a genuine,
non-critical verification gap, not a defect — it is exactly what CTA-P2 should
close first.

Nothing else is outstanding. No `GAP` is being hidden behind that label.

---

# PREFLIGHT

```
pwd     /Users/reza/Developer/ahanassa-website/.claude/worktrees/final-cta-p1
branch  worktree-final-cta-p1
HEAD    c68cdca51c6a3bf6009f5aab27a49d5235af00e7
status  clean (git status --short returned nothing)
log     c68cdca docs: record Industries Use Cases V1.0 implementation
        5915b77 docs: register Industries Use Cases V1.0
        efce576 feat(home): implement Industries Use Cases V1.0
        b885831 docs: import Industries Use Cases V1.0 freeze
        1d1ea2b docs: record Homepage HP-R1 reconciliation
```

Repository instructions read: `CLAUDE.md` (root operating contract). **No
`AGENTS.md` exists** anywhere in the tree. Commands from `package.json`:
`npm test` = `node --test lib/**/*.test.ts components/**/*.test.ts`,
`npm run build` = `vinext build`, `npx tsc --noEmit`. **There is no separately
defined lint script** in `package.json` — `test`, `dev`, `build`, `start`,
`deploy`, `preview` and `cf-typegen` are the complete script set.

---

# BASE SHA

`c68cdca51c6a3bf6009f5aab27a49d5235af00e7` — matches the expected starting
point exactly. Working tree was clean before any change.

---

# AUTHORITATIVE SPEC

`docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md`

Imported byte-for-byte from `~/Downloads/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md`,
the sole candidate in that directory (the only other CTA-named file there is
`ahanassa-cta-audit-report.md`, dated 2026-08-27, a different and much older
document — not a competing version of this freeze). No wording was modified.
The source file in `~/Downloads/` was **not** touched, moved or deleted.

Read in full before any code was written, together with:

- `docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md` (§4, §6.7, §7, §9, §11, §16.14)
- `docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md` (§5, §8, §9, §13, §14, §21)
- `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md`
- `docs/industries/INDUSTRIES_P1_V1_0_IMPLEMENTATION_REPORT.md`
- `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md`
- `docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md`
- current code: `app/[locale]/page.tsx`, `components/ui/cta-band.tsx`,
  `components/home/hero.tsx`, `components/home/buyer-value.tsx`,
  `components/home/industries.tsx`, `components/ui/button.tsx`,
  `components/ui/button-variants.ts`, `lib/content/contact-channels.ts`,
  `lib/content/homepage.ts`, `config/locales.ts`,
  `components/layout/SiteFooter.tsx`, `styles/tokens.css`,
  `styles/theme-extensions.css`

---

# SPEC HASH

```
SOURCE  ~/Downloads/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md
        b51cfa6b0fa84494e48e9d0035d16349dc0bd5ac398048f8544e2fcd9b78cebe
TARGET  docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md
        b51cfa6b0fa84494e48e9d0035d16349dc0bd5ac398048f8544e2fcd9b78cebe
SIZE    11617 bytes
cmp     byte-identical (exit 0)
```

---

# SPEC IMPORT COMMIT

`9a9d1b397a46d959141cff01f77aae2b1a735ca2` — `docs: import Final CTA V1.0 freeze`.
One file, spec only, no code.

---

# CURRENT CTA BEFORE

The Homepage's closing CTA was `components/ui/cta-band.tsx`'s `CtaBand`,
rendered by `app/[locale]/page.tsx` as `<CtaBand locale={locale} />` at the end
of the fragment. Its exact "before" state:

| Property | Before (CtaBand, on the Homepage) |
|---|---|
| Surface | `bg-navy-800` (i.e. `--aa-color-action-primary-bg-active`, the darker interaction-state shade — **not** `#0B2545`), `relative isolate overflow-hidden` |
| Imagery | `<Image src="/images/ops/containers.png" fill className="object-cover opacity-25">` |
| Overlay | `from-navy-800 via-navy-800/90 to-navy-800/50 bg-linear-to-r` gradient |
| Eyebrow | present — `.eyebrow` utility (uppercase + 0.16em tracking) in `text-copper-400`, with a rule glyph |
| FA H2 | «فاکتور یا لیست خرید دارید؟» |
| FA body | «آن را برای آهن آسا بفرستید تا نیاز شما بررسی و مسیر مناسب تأمین مشخص شود.» in `text-white/60` |
| FA primary label | «ارسال فاکتور یا لیست خرید» |
| FA secondary label | «درخواست مشاوره خرید» |
| Primary destination | `localizedPath(locale, "/contact")` |
| Secondary destination | `localizedPath(locale, "/contact")` — **the same route as the primary**; no telephone action at all |
| Primary button | `buttonVariants({ variant: "default", size: "lg" })` — the legacy Copper fill |
| Secondary button | a hand-rolled `border border-white/25 px-7 py-4 text-sm` anchor, not the Shared Button |
| Reassurance | none |
| Layout | `lg:grid-cols-12`, 7/5 split, `lg:items-end` |
| Motion | `ArrowRight` with `group-hover:translate-x-1` |

Not one of those rows matches Final CTA V1.0: §2–§4 freeze different copy, §5
forbids the eyebrow, §6 forbids the photograph, the gradient and the `isolate`
composition, §7 requires `/request` rather than `/contact` and a telephone
secondary rather than a second link to the same page, and §7 requires the
filled-Cream/outlined-light Shared Button hierarchy rather than the Copper
`default`/`lg` pair.

**Critically, `CtaBand` is not Homepage-specific.** It is imported and rendered
by six other pages:

```
app/[locale]/products/page.tsx          line 10 / 66
app/[locale]/products/[slug]/page.tsx   line 11 / 148
app/[locale]/industries/page.tsx        line  6 / 55
app/[locale]/markets/page.tsx           line  6 / 55
app/[locale]/about/page.tsx             line  6 / 69
app/[locale]/services/page.tsx          line  9 / 74
```

This is the repository's own instance of the "shared FooterCTA-equivalent" the
task warns about. Rewriting it in place would have silently changed six pages
this phase does not govern.

---

# CTA AFTER

A new, Homepage-dedicated `components/home/final-cta.tsx` exporting `FinalCta`,
implementing the frozen V1.0 spec. `app/[locale]/page.tsx` swapped its closing
`<CtaBand locale={locale} />` for `<FinalCta locale={locale} />` and dropped the
`@/components/ui/cta-band` import.

**`components/ui/cta-band.tsx` was NOT modified — zero bytes changed.** It does
not appear in the runtime commit's file list. All six other consumer pages are
likewise untouched and still import and render it exactly as before; verified
both at source level (tests) and at runtime (curl, below). This follows the
repository's established supersession pattern (Reach → Industries,
Evaluation/Assurance → Buyer Value) with one deliberate strengthening: CtaBand
is recorded as **replaced for the Homepage only, explicitly NOT superseded**,
because unlike Reach and Evaluation/Assurance it is still actively rendering
elsewhere. Registered in `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` §3
and a new §3.1.

---

# HOMEPAGE POSITION

**PASS.** `FinalCta` is the last Homepage content section, immediately before
the global Footer (which `app/[locale]/layout.tsx` renders).

```
Hero -> PriceStrip[conditional] -> ProductShowcase -> BuyerValue ->
[Verified Evidence: absent] -> Industries[conditional, null today] -> FinalCta -> Footer
```

Asserted structurally, not just by eyeball: the invariants test slices the
rendered fragment after `<FinalCta ... />` and requires the only remaining JSX
tag to be `JsonLd` (a non-visual `<script type="application/ld+json">`). Order
assertions `BuyerValue < FinalCta` and `Industries < FinalCta` are pinned in
both `homepage-composition-invariants.test.ts` and
`purchase-process-frozen-spec-invariants.test.ts`.

Today, with Industries returning `null`, the live sequence is
Buyer Value → Final CTA → Footer, with no gap, heading or placeholder between
them — Buyer Value's own `border-b` and bottom padding meet the Final CTA
directly. If Industries later becomes eligible, or if Evidence is ever built,
the Final CTA's position is unchanged, because it does not read either one.

---

# DUPLICATE CTA CHECK

**ABSENT.** Exactly one closing conversion block renders on the Homepage.

- Source: `app/[locale]/page.tsx` contains exactly one `<FinalCta`, no
  `<CtaBand`, and no `@/components/ui/cta-band` import.
- Runtime (SOURCE-SSR): `aria-labelledby="home-final-cta-heading"` appears
  once in each of `/`, `/en`, `/ar`; the old CtaBand copy
  («فاکتور یا لیست خرید دارید؟» / "Have an invoice or purchase list ready?" /
  «هل لديك فاتورة أو قائمة شراء جاهزة؟») appears **zero** times in the Homepage
  HTML for every locale.
- No other component named FooterCTA, ClosingCta, ConversionBand or equivalent
  exists anywhere in `components/`. Buyer Value and Industries carry no `<Link>`,
  `<a>`, `href` or `<button>` at all (asserted by their own invariants files),
  so neither can constitute a second closing CTA.
- The Header's and Hero's RFQ CTAs are the approved entry-point actions, not a
  closing block; Composition §11 gives conversion to the Hero and the Final CTA
  jointly and forbids a competing third primary, which is why the Final CTA
  carries exactly two actions toward the *same* goal.

---

# FA CONTENT

```
H2            لیست خرید آهن شما از همین‌جا شروع می‌شود
Supporting    اقلام موردنیازتان را ارسال کنید تا کارشناس آهن آسا، مشخصات و شرایط درخواست شما را بررسی و پیگیری کند.
Primary       ارسال لیست خرید
Secondary     درخواست قیمت تلفنی
Reassurance   ارسال درخواست، تعهدی برای خرید ایجاد نمی‌کند.
```

No eyebrow. No additional paragraph. Stored in
`lib/content/homepage.ts` → `homepageCopy.fa.finalCta`, whose object shape is
asserted to be exactly `{body, primaryCta, reassurance, secondaryCta, title}`.

**PASS** — every string is compared character-for-character against the
imported freeze document itself (parsed out of §2 at test time), never against
a string retyped into the test, so the test cannot drift from its authority.

---

# EN CONTENT

```
H2            Start your steel purchase request here
Supporting    Send the items you need so an Ahan Asa specialist can review the specifications and requirements and follow up on your request.
Primary       Send your purchase list
Secondary     Request pricing by phone
Reassurance   Submitting a request does not commit you to a purchase.
```

**PASS** — pinned against §3 of the imported document.

---

# AR CONTENT

```
H2            ابدأ طلب شراء الحديد من هنا
Supporting    أرسل الأصناف التي تحتاجها ليراجع خبير آهن آسا المواصفات ومتطلبات الشراء ويتابع طلبك.
Primary       أرسل قائمة مشترياتك
Secondary     استفسر عن الأسعار هاتفياً
Reassurance   إرسال الطلب لا يلزمك بالشراء.
```

**PASS** — pinned against §4 of the imported document.

---

# PRIMARY DESTINATION

**VERIFIED.** `href={localizedPath(locale, "/request")}` — the exact helper and
route `components/home/hero.tsx` uses for the approved primary CTA (Hero V2.4,
pinned by `lib/content/hero-frozen-spec-invariants.test.ts`). No per-locale
string is hard-coded; no new route was created; the older `/contact`
destination is deliberately not reused.

Resolved paths, asserted directly against `config/locales.ts`:

| Locale | `localizedPath(locale, "/request")` | SSR-rendered `href` |
|---|---|---|
| fa | `/request` | `/request` |
| en | `/en/request` | `/en/request` |
| ar | `/ar/request` | `/ar/request` |

The route really exists: `app/[locale]/request/page.tsx`, confirmed by an
`existsSync` assertion in the invariants test and by the build output listing
`ƒ /:locale/request`. No `href="#"` exists anywhere in the component (§11:
a missing primary route is a release defect, never a `#`).

---

# PHONE ACTION

**VERIFIED.** `href={\`tel:${CONTACT_PHONE_E164}\`}` where `CONTACT_PHONE_E164`
is imported from `@/lib/content/contact-channels` — the single owner-supplied
number (`+989120656528`, confirmed in-session by the project owner per that
file's own header), already used identically by `components/home/hero.tsx`,
`components/layout/SiteHeader.tsx` and `components/layout/mobile-nav-drawer.tsx`.

- The number is never written out a second time. The test asserts
  `!/tel:\+\d{6,15}/.test(SOURCE)` — the same assertion style Hero's own
  invariants file uses.
- SSR output for all three locales: `href="tel:+989120656528"`.
- No callback modal, no business hours, no `<dialog>`, no invented number. §7's
  "if no verified working telephone destination is available, omit only the
  secondary action" branch did **not** apply — the destination is real.

**This is not a PHONE CONFIGURATION GAP.**

---

# SHARED BUTTON

**PASS.** Both actions consume the Shared Button Component V1.0
(`docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md`) through
`components/ui/button.tsx`:

- Primary: `<ButtonLink href={localizedPath(locale, "/request")} variant="primary" size="button">`
- Secondary: a plain `<a href="tel:…">` styled with
  `cn(buttonVariants({ variant: "secondary", size: "button" }), …)`

— the same two call shapes Hero and Header already use. The legacy Copper
`default`/`lg` pair that `cta-band.tsx` uses is **not** reused; nor are
`inverse`, `outline` or `ghost`. No new variant was invented.

**Geometry (STATIC-COMPILED-CSS VERIFIED)** against §7's 48–52px height /
6–8px radius / 24–32px horizontal padding / 15–16px at weight 600 /
~180px desktop minimum:

| Property | Compiled rule | Value | §7 target |
|---|---|---|---|
| Height (resting) | `.py-3{padding-block:calc(var(--spacing)*3)}` with `--spacing:.25rem` → 12px + 12px, plus `.text-base{line-height:var(--text-base--line-height)}` where `--text-base--line-height:calc(1.5/1)` → 24px | **48px exactly** | 48–52px ✓ |
| Min height floor | `.min-h-12{min-height:calc(var(--spacing)*12)}` | 48px | 48px touch target ✓ |
| Horizontal padding | `.px-7` | 28px each side | 24–32px ✓ |
| Font size | `.text-base{font-size:var(--text-base)}`, `--text-base:1rem` | 16px | 15–16px ✓ |
| Weight | `font-semibold` in the cva base | 600 | 600 ✓ |
| Radius | `rounded-[var(--aa-radius-sm)]` from the compound variant | shared small radius | 6–8px ✓ |
| Min width | `w-full` inside a column that is ≥288px at every tested viewport | ≥288px | ~180px ✓ |

**Deliberate call-site override, and why it is not a variant change.**
`h-auto min-h-12 py-3` replaces the shared `h-12`. §7 requires "At text zoom
allow height to grow instead of clipping", and a fixed `height:3rem` cannot do
that. The arithmetic above shows the resting geometry is **identical to the
frozen 48px** — 12 + 24 + 12 — so nothing about the default appearance changes;
only the failure mode does. SSR output confirms `tailwind-merge` really dropped
`h-12` from the emitted class list (the rendered class string contains
`h-auto min-h-12` and no `h-12`). No `truncate`, `line-clamp`,
`text-ellipsis`, `whitespace-nowrap` or `overflow-hidden` exists in the file, so
a label can only ever wrap, never crop.

**On-dark color inversion (§7).** Only the color pairs are overridden:

- Primary → `bg-[var(--aa-color-brand-cream-50)] text-navy` (Warm Cream fill,
  Navy label), plus `hover:bg-white active:bg-white` and `shadow-none`.
- Secondary → `border-white/70 text-white hover:border-white hover:bg-white/10`
  over the variant's own `bg-transparent`.

§7 requires exactly this inversion; a Navy-filled primary would be invisible on
a Navy section. SSR output confirms `tailwind-merge` dropped `bg-navy`,
`text-navy`'s counterpart `text-white` from the primary variant, `border-navy/60`,
`hover:border-navy` and `hover:bg-navy/5` from the secondary. The compiled
stylesheet places `.shadow-none` (offset 37302) **after**
`.shadow-[var(--aa-shadow-sm)]` (offset 36648), so equal-specificity source
order makes `shadow-none` win — the primary really has no shadow on this
surface (§6 "no heavy shadow").

**Residual, honestly stated:** the cva base string carries `tracking-wide`
(0.025em). That is part of the frozen Shared Button V1.0 contract and applies
identically to the Header's and Hero's own Persian and Arabic button labels
today. This component adds no tracking utility of its own, and §8's
"no Persian/Arabic letter-spacing" rule is satisfied for all of the section's
*text*; the button label tracking is a pre-existing Shared-Button-level property
that CTA-P1 deliberately did not unilaterally change. Flagged for the Button
contract's own next revision, not fixed here.

---

# VISUAL SURFACE

Full-width flat Steel Navy via `bg-navy`. Compiled:
`.bg-navy{background-color:var(--aa-color-brand-navy-900)}` and
`--aa-color-brand-navy-900: #0b2545` — exactly §6's `#0B2545`.
`bg-navy-800` (`--aa-color-action-primary-bg-active`, a darker interaction-state
token, which is what CtaBand uses) is **not** used, and a test forbids it.
Content aligned to the shared `container-x`.

§6's prohibitions are each asserted absent: no `<Image>`, no `next/image`
import, no `hairline-grid`, no `<svg>`, no `bg-linear-to`/`bg-gradient`, no
`rounded-3xl`/`rounded-2xl`, no `backdrop-*`, no `isolate`, no `shadow-*` other
than the explicit `shadow-none`, and no image-file extension anywhere in the
file. There is no Cream inset card — the Hero's complete composition is
reserved for the Hero (Visual System §8.1/§9).

**Contrast — computed from the actual token hex values (not assumed):**

| Element | Foreground | Background | Ratio | Requirement | Result |
|---|---|---|---|---|---|
| H2 | Warm Cream `#FBF5EB` | Steel Navy `#0B2545` | **14.19:1** | ≥3:1 (large heading) | PASS by 4.7× |
| Supporting `<p>` | White `#FFFFFF` | `#0B2545` | **15.39:1** | ≥4.5:1 (normal) | PASS by 3.4× |
| Reassurance `<p>` | White `#FFFFFF` | `#0B2545` | **15.39:1** | ≥4.5:1 (normal) | PASS by 3.4× |
| Primary button label | Navy `#0B2545` | Cream `#FBF5EB` | **14.19:1** | ≥4.5:1 | PASS |
| Secondary button label | White `#FFFFFF` | `#0B2545` | **15.39:1** | ≥4.5:1 | PASS |
| Secondary button outline | `white/70` → `#B6BEC7` composited | `#0B2545` | **8.19:1** | ≥3:1 (non-text) | PASS |

`text-white/60` — the opacity `cta-band.tsx` applies to its body copy — was
**not** copied. Composited it is `#9DA8B5` on Navy = **6.38:1**, which would
technically pass 4.5:1, but §6 says to "avoid arbitrary opacity that makes
secondary text unreadable", so the opacity is simply not introduced at all. A
test forbids any `text-white/NN` inside the rendered JSX.

Estedad Variable is inherited from the global `<body>` font stack; no
font-family is set locally. FA/AR render RTL and EN LTR from the document
direction set by `app/[locale]/layout.tsx`; no tracking utility and no `<br>` is
used anywhere in the component.

---

# DESKTOP

Two columns from `lg` (1024px): `flex flex-col lg:flex-row lg:items-center
lg:gap-12`, with `lg:w-[60%]` copy at the reading start and `lg:w-[40%]` actions
at the reading end. The flex row's main axis already follows the container's
text direction, so FA/AR render copy-right / actions-left and EN copy-left /
actions-right from one shared markup — no `order`, no `tabindex`, no
`flex-row-reverse`, no physical `left`/`right` utility anywhere (a test pins the
physical-utility list to empty).

Computed column widths (`container-x` = `min(100% - 2×clamp(1rem,3vw,2rem), 80rem)`;
the 48px `gap-12` is absorbed proportionally by the two `flex-shrink:1` children):

| Viewport | Container | Copy column | Action column |
|---|---|---|---|
| 1024px | 962.6px | ~548.7px | ~365.8px |
| 1280px | 1216px | ~700.8px (text capped at `max-w-2xl` = 672px) | ~467.2px |
| 1440px+ | 1280px (max) | ~739.2px (text capped at 672px) | ~492.8px |

`max-w-2xl` on both the H2 and the supporting `<p>` gives §6's "constrained
reading width, not full-viewport lines" and Visual System §12's prohibition on
long Persian lines spanning the full content width.

**STATIC-COMPILED-CSS VERIFIED:** `.lg\:w-\[60\%\]{width:60%}` and
`.lg\:w-\[40\%\]{width:40%}` are present in the compiled stylesheet. The column
figures themselves are **computed arithmetic, NOT measured in a browser.**

---

# MOBILE

Single column below `lg`, in the required semantic order
H2 → supporting → primary → secondary → reassurance — which is also the DOM
order, asserted by a positional test over the five content markers.

Buttons: `flex flex-col gap-3` with `w-full` on both — full available content
width, stacked, **12px gap** (`gap-3`, inside §6's 12–16px range).

**Breakpoint justification — computed, not assumed.** §6's initial candidate is
1024px, and it was kept after a content-fit check rather than accepted blindly:

Longest button labels and their computed widths at 16px semibold
(~8.5px average Latin advance, ~7.5px Persian/Arabic), plus 56px of `px-7`:

| Locale | Label | Chars | Computed button width |
|---|---|---|---|
| EN secondary | "Request pricing by phone" | 24 | ~260px |
| EN primary | "Send your purchase list" | 23 | ~252px |
| AR secondary | «استفسر عن الأسعار هاتفياً» | 25 | ~244px |
| AR primary | «أرسل قائمة مشترياتك» | 19 | ~199px |
| FA secondary | «درخواست قیمت تلفنی» | 18 | ~191px |
| FA primary | «ارسال لیست خرید» | 15 | ~169px |

Narrowest container tested is 288px (a 320px viewport, gutter `clamp` resolving
to 16px). The widest label needs ~260px — it fits on one line with ~28px to
spare, in every locale. At 375px the container is 343px; at 768px, 721.9px.
So no width between 320px and 1024px truncates, wraps or overflows.

**Why the buttons are STACKED rather than side by side, at every width.** §6
permits side by side "when their full labels fit" and requires stacking
otherwise — "never truncate labels or force four-word English labels into a
narrow width". The arithmetic says they do not fit: the EN pair needs
~252 + 12 + 260 = **~524px**, but the action column is at most **~492.8px** even
at the 1280px container maximum, and only **~365.8px** at the 1024px breakpoint
itself. A side-by-side row would therefore force exactly the narrow English
buttons §6 names. Stacking is the spec-compliant choice here, not a shortcut,
and it keeps one behavior across all three locales instead of a
locale-dependent layout. The reassurance sits directly below the **pair**, so it
is visually and semantically associated with both.

No `overflow-x`, `snap-x`, `flex-nowrap`, carousel or fixed pixel width exists;
a test pins the complete set of arbitrary widths in the file to exactly
`["lg:w-[60%]", "lg:w-[40%]"]`.

---

# FOOTER BOUNDARY

`components/layout/SiteFooter.tsx` is `bg-navy text-white` — the **same** Steel
Navy as this section, so this is a Navy-to-Navy transition and §9 applies
literally.

Applied: a restrained light divider `border-b border-white/20` (a hairline —
compiled to `border-color: color-mix(in oklab, var(--color-white) 20%, transparent)`),
plus deliberate independent padding on both sides — this section's own
`py-20 lg:py-28` (80/112px) and the Footer's own `py-16 lg:py-20` (64/80px).

Explicitly **not** done: no fake light section was inserted between them, and
the Footer's links, copy, navigation, ownership, layout and colours were not
touched at all. §9 is clear that this is "a specific boundary treatment within
the visual freeze's allowed deliberate transition, not authorization to redesign
Footer".

Note on the surrounding rhythm (§9 "Maintain the existing White/Cream breathing
space before this Navy surface"): Buyer Value immediately precedes on Warm
Cream today, and Industries — White — will sit between them when it becomes
eligible. Either way a light section precedes the Navy band, so the two Navy
surfaces on the page (Hero and Final CTA) are never adjacent. This is asserted
structurally by the existing "no two consecutive heavy Navy sections" test,
which now names `components/home/final-cta.tsx`.

---

# CONTENT BOUNDARY

Every §5 prohibition is asserted absent, at both the copy and the markup level:

| Forbidden | Status |
|---|---|
| Eyebrow | ABSENT — no field exists on the copy object, and no eyebrow element exists |
| Process steps | ABSENT — no `<ol>`, `<ul>`, `<li>`; no `t.process` read |
| Product list | ABSENT — no catalog import, no list markup |
| Testimonial / counter / metric | ABSENT — no numeric claim of any kind in the copy |
| Contact form | ABSENT — no `<form>`, `<input>`, `<textarea>`, `<select>`, `<label>` |
| Upload widget | ABSENT — no file input, no upload language in any locale |
| Additional paragraph | ABSENT — exactly two `<p>` elements exist (supporting + reassurance), asserted by count |
| Third CTA | ABSENT — exactly two `href=` attributes in the whole JSX, asserted by count |
| Attachment / voice / photo-OCR / instant-quote / checkout claim | ABSENT — locale-specific regex sweeps for attach/upload/photo/voice/spreadsheet/cart/checkout in EN, FA and AR |
| "best" / "cheapest" / "fastest" / guaranteed availability / guaranteed response time / guaranteed delivery | ABSENT — locale-specific regex sweeps in EN, FA and AR |

The reassurance is a real visible `<p>` — never a `title=` tooltip,
`aria-describedby`, `<details>` disclosure or `sr-only` footnote; a test forbids
each of those.

---

# CLAIM SAFETY

The approved copy is pinned character-for-character against the imported freeze
document, so no "improvement" into a capability claim can ship without failing a
test. On top of that pinning, three independent claim sweeps run per locale:
overclaim shapes (guarantee / cheapest / best / fastest / instant / in stock /
"within N" / 24-7, and their FA and AR equivalents), unsupported-capability
shapes (attachment, upload, photo, voice, spreadsheet, Excel, PDF, cart,
checkout, instant quote), and the Homepage-wide operational-statistic sweep
already in `homepage-composition-invariants.test.ts` (percentages and
hour/minute/day figures in all three scripts), which now covers the new
`finalCta` copy automatically because it stringifies the whole
`homepageCopy[locale]` object.

The copy names only what the existing flow really does: the buyer sends items, a
specialist reviews specifications and requirements, and follows up. No response
time, no stock position, no supplier relationship, no certification, no
automatic fulfilment. The non-commitment reassurance is a statement about the
buyer's obligation, not a service-level promise.

Duplication gate (Composition §7): tests assert the Final CTA's H2, body and
reassurance differ from the Hero's, and that its H2 differs from Buyer Value's
and Industries' — it is a closing action, not a summary of either.

---

# SEMANTICS

```html
<section aria-labelledby="home-final-cta-heading">
  <h2 id="home-final-cta-heading">…</h2>
  <p>…supporting…</p>
  <a data-slot="button-link" href="/request">…primary…</a>
  <a href="tel:+989120656528">…secondary…</a>
  <p>…reassurance…</p>
</section>
```

- Exactly one `<section>`, exactly one `<h2>`, and the `aria-labelledby` id
  matches the heading id — all asserted by count.
- No `<h1>` (§10: "Do not add a second H1" — the single Homepage H1 belongs to
  the Hero) and no `<h3>`/`<h4>`.
- Both actions are semantic links, because both activations are navigations
  (an internal route and a `tel:` URL). No `<button>`, no `role="button"`, no
  `onClick`, no `disabled` — §7 reserves a real `<button>` for an existing
  action that requires it, and neither of these does.
- No nested interactive controls; no whole-section click target (a test asserts
  there is no `href`/`onClick` before the `<h2>` in the JSX).
- DOM order IS the required semantic order, so the screen-reader sequence needs
  no CSS cooperation. No `order-*`, `flex-col-reverse` or `tabIndex` exists.

---

# INTERACTION

Primary and secondary are the only actions — two `href`s, full stop. No third
CTA, no accordion, no modal, no `<dialog>`, no carousel, no hover lift, no
whole-card click, no form submission. Hover/active feedback is inherited from
the Shared Button: colour/border transitions at `duration-[160ms]` (inside
§10's 150–200ms band) and `active:scale-[0.98]`, which is itself disabled under
`motion-reduce`.

Keyboard focus: §10 requires a contrast-checked offset outline visible against
both the light button and the Navy background. The global focus ring is Forge
Copper `#B04A2F`, which computes to **2.83:1 against Steel Navy `#0B2545`** —
**below the 3:1 non-text floor.** Rather than accept that, the section rebinds
`--aa-color-focus-ring` to Warm Cream for its own subtree only, via the
arbitrary-property utility `[--aa-color-focus-ring:var(--aa-color-brand-cream-50)]`,
compiled as
`.\[--aa-color-focus-ring\:var\(--aa-color-brand-cream-50\)\]{--aa-color-focus-ring:var(--aa-color-brand-cream-50)}`.
Cream on Navy is **14.19:1**. Because both focus paths read the same variable —
`.aa-button:focus-visible { outline: 2px solid var(--aa-color-focus-ring) }` in
`styles/theme-extensions.css`, and the cva base's
`focus-visible:outline-[var(--aa-color-focus-ring)]` — a single scoped
custom-property override fixes both, with no new CSS rule, no `!important`, no
specificity fight, and zero effect on any other page or component. The 3px
`outline-offset` keeps the ring on the Navy field rather than on the Cream
button face, so it is never Cream-on-Cream. `outline-none` is never applied.
The forced-colors boundary from `.aa-button` is inherited unchanged.

**This is STATIC-COMPILED-CSS VERIFIED (the rules and the variable binding are
present in the built stylesheet) and NOT live-keyboard verified** — no browser
was available to Tab through it.

---

# MOTION

None. No `Reveal`, no `"use client"`, no `useEffect`/`useState`/
`IntersectionObserver`, no `animate-*`, no `opacity-0`, no bounce, pulse,
attention loop or card-lift. The SSR render, the JS-disabled render, the
failed-hydration render and the `prefers-reduced-motion` render are the same
bytes — the same choice `buyer-value.tsx` and `industries.tsx` already made, and
strictly stronger than reusing the shared `components/ui/reveal.tsx`. §10 permits
either; the static implementation was preferred.

---

# SSR

**PASS — SOURCE-SSR STRUCTURAL PROOF.** A fresh dev server (`npm run dev`,
port 3001) was started and each locale fetched with curl. All five approved
strings and both `href`s are present in the server-rendered HTML for every
locale, with no client hydration involved:

| Locale | HTTP | Bytes | H2 | Primary href | Secondary href |
|---|---|---|---|---|---|
| fa (`/`) | 200 | 155171 | «لیست خرید آهن شما از همین‌جا شروع می‌شود» | `/request` | `tel:+989120656528` |
| en (`/en`) | 200 | 152630 | "Start your steel purchase request here" | `/en/request` | `tel:+989120656528` |
| ar (`/ar`) | 200 | 111011 | «ابدأ طلب شراء الحديد من هنا» | `/ar/request` | `tel:+989120656528` |

`<footer` appears after the section's closing tag in all three. No client-side
fetch for copy exists (`fetch(`, `useSWR`, `axios`, `XMLHttpRequest` all absent);
no element rests at `opacity: 0`.

---

# JS-OFF

**SOURCE-SSR STRUCTURAL PROOF — not a browser JS-disable test.** curl is an
HTTP client; it does not execute or "disable" JavaScript, and calling it a
JS-off test would be dishonest. What is actually proven: the component is a pure
server component with no client directive, no hooks, no event handlers and no
client-side data access, and every string and both `href`s are already in the
transmitted HTML above. Both actions are plain anchors, so navigation and the
`tel:` dial work with zero JS runtime by construction. A real
JavaScript-disabled browser check remains **NOT RUN** and belongs to CTA-P2.

---

# RESPONSIVE MATRIX

All figures **computed** from `container-x`'s own `clamp()`/`max-width` rules
and the compiled utility values, cross-checked against the compiled stylesheet.
**Not measured in a browser.**

| Viewport | Gutter | Container | Layout | Copy col | Action col | Button width | Longest label fits? |
|---|---|---|---|---|---|---|---|
| 320px | 16px | 288px | 1 column | 288px | 288px | 288px | ~260px EN — yes, 28px spare |
| 375px | 16px | 343px | 1 column | 343px | 343px | 343px | yes |
| 414px | 16px | 382px | 1 column | 382px | 382px | 382px | yes |
| 768px | 23.04px | 721.9px | 1 column | 721.9px | 721.9px | 721.9px | yes |
| 1023px | 30.69px | 961.6px | 1 column | 961.6px | 961.6px | 961.6px | yes |
| 1024px | 30.72px | 962.6px | 2 columns | ~548.7px | ~365.8px | ~365.8px | yes |
| 1280px | 32px | 1216px | 2 columns | ~700.8px (text ≤672px) | ~467.2px | ~467.2px | yes |
| 1440px | 32px | 1280px (max) | 2 columns | ~739.2px (text ≤672px) | ~492.8px | ~492.8px | yes |

No horizontal scroll is structurally possible: no fixed pixel width exists in
the file, both columns are `flex-shrink: 1` percentage children, nothing is
`nowrap`, and there is no `overflow-x` anywhere.

---

# ZOOM / REFLOW

**Computed, NOT observed.** Two distinct cases:

1. **Browser page zoom** (the common case) scales the CSS pixel, so a 1280px
   viewport at 200% behaves as a 640px viewport: the layout falls to the single
   column, the container is ~601.6px, and the ~260px widest button fits on one
   line with large margin. No clipping, no horizontal scroll.

2. **Text-only zoom / large browser minimum font size** grows the label without
   growing the box. This is exactly the case `h-auto min-h-12 py-3` was chosen
   for: at a 320px viewport with 200% text zoom the EN secondary label needs
   ~464px against a 288px container, so it wraps to two lines and the button
   grows to roughly 12 + 48 + 12 = 120px instead of cropping. Under the frozen
   `h-12` (`height: 3rem`) the second line would have been clipped. No
   `truncate`, `line-clamp`, `text-ellipsis`, `whitespace-nowrap` or
   `overflow-hidden` exists to cut a label, and the section has no fixed height.

A real 200%-zoom reflow observation in a browser is **NOT RUN**.

---

# ACCESSIBILITY

| Check | Result | Evidence class |
|---|---|---|
| One `<section aria-labelledby>` → one `<h2 id>` | PASS | source-pinned + SSR |
| No second H1; heading level continuity | PASS | source-pinned |
| Reading order == DOM order == visual order (logical CSS only) | PASS | source-pinned (zero physical utilities) |
| Semantic links for both actions; no fake/disabled control | PASS | source-pinned + SSR |
| No nested interactive elements; no whole-section click target | PASS | source-pinned |
| H2 contrast on Navy | 14.19:1 (≥3:1) | computed from token hex |
| Body + reassurance contrast on Navy | 15.39:1 (≥4.5:1) | computed from token hex |
| Primary button label contrast | 14.19:1 | computed from token hex |
| Secondary outline contrast | 8.19:1 (≥3:1) | computed from token hex |
| Focus ring contrast on Navy | 14.19:1 after the scoped Cream rebind (Copper would have been 2.83:1) | computed + STATIC-COMPILED-CSS |
| Focus not clipped by overflow | PASS — no `overflow-hidden`/`overflow-x` in the section; 3px offset sits on the open Navy field | source-pinned |
| Touch target ≥48px | PASS — `min-h-12` floor plus full-width | STATIC-COMPILED-CSS |
| Reduced motion | PASS — no motion at all; the Shared Button's `active:scale` is already `motion-reduce:`-guarded | source-pinned |
| Forced colors | Inherited unchanged from `.aa-button` | STATIC-COMPILED-CSS |
| No hidden crawler/agent-only layer | PASS — no `<noscript>`, no `dangerouslySetInnerHTML`, no `display:none`/`text-indent:-` | source-pinned |
| Live screen-reader / keyboard sweep | **NOT RUN** | no browser available |

---

# ANALYTICS

**Nothing was added — deliberately.** No approved analytics convention exists in
this repository: `01-sources/DECISIONS.md` OPEN-005 still defers the provider,
and no event helper, `dataLayer`, `gtag`, `track()` or `sendBeacon` call exists
anywhere in the Homepage components. §7 forbids introducing a new provider, so
the correct implementation adds nothing at all rather than inventing a
convention that a future provider decision would have to unpick. A test asserts
the absence of every such identifier in this component.

No RFQ contents, phone contents or customer identity is sent anywhere; the
component only renders two links and submits nothing.

---

# HOMEPAGE FAILURE ISOLATION

The Final CTA has **no eligibility gate of any kind**, and that is structural
rather than merely intended:

- No `return null` exists in the file. A test asserts the file contains exactly
  **one** `return` — the section itself.
- The component's only input is `locale`; a test pins the signature
  `export function FinalCta({ locale }: { locale: Locale })`.
- The complete import list is pinned to exactly
  `["@/components/ui/button", "@/config/locales", "@/lib/content/contact-channels", "@/lib/content/homepage", "@/lib/utils"]`
  — no repository, binding, flag or projection can appear without failing.
- Forbidden-identifier sweep: `cloudflare:workers`, `DB_PUBLIC`, `DB_OPS`,
  `odoo`/`Odoo`, `listHomepageProductCandidates`, `getHomepagePriceStrip`,
  `priceStrip`, `PRICE_STRIP_ENABLED`, `catalog`, `industries`/`Industries`,
  `evidence`/`Evidence`, `migrations_public`, `process.env` — all absent.
- It is rendered **after** every `try`/`catch` on the page (asserted by index
  comparison), so no Showcase or price failure can reach it.
- Industries returns `null` today and the Final CTA still renders — proven at
  runtime by the SSR fetch above, where the Industries section is genuinely
  absent from the HTML and the Final CTA is genuinely present. A dedicated test
  also asserts the Final CTA reads neither `resolveIndustrySectorImages` nor
  `isIndustriesCopyComplete`.

RFQ endpoint outage: the component submits nothing — it links to `/request`,
whose own truthful error/retry behavior is untouched. No client-side submission
logic and therefore no possible fake success state was added.

---

# REGRESSION

- **`components/ui/cta-band.tsx`: ZERO bytes changed.** It is absent from the
  runtime commit's file list. Its export, its own FA/EN/AR copy and its
  `/contact` destinations are all asserted still present by two tests.
- **All six consumer pages unmodified** and still rendering it. Runtime check
  against the dev server: `/about`, `/industries`, `/markets` and `/services`
  all still serve the old CtaBand copy; the Homepage serves it **zero** times.
  - `/products` returned HTTP 200 but its catalog read raised a local
    `D1_ERROR: no such table`, so the page short-circuits before reaching its
    `<CtaBand>`. **This is a pre-existing local-environment data state, not
    caused by this change**: `app/[locale]/products/page.tsx` is untouched (it
    does not appear in `git status` or in any commit here), its
    `<CtaBand locale={locale} />` is still in the source, and the local dev D1
    simply has no catalog tables provisioned. Asserted at source level instead.
- Header, Hero, Price Strip, Product Showcase, Buyer Value, Industries content
  and its publication gate (`lib/content/industries.ts`), Footer, Odoo, and
  DB_PUBLIC: **all untouched.** The only composition wiring is the two-line
  import/render swap in `app/[locale]/page.tsx` plus a doc-comment entry
  recording it.
- Existing tests that named `CtaBand` as the Homepage's Final CTA were updated
  to name `FinalCta` — a required consequence of the slot change, not a
  weakening: every assertion they made (order, unconditional rendering, single
  H1, Navy-surface uniqueness, shared container, no hidden layer, catch-scope
  isolation) still runs, now against the new component, and two **new**
  assertions were added covering CtaBand's retention and continued use
  elsewhere. No assertion was deleted or loosened.

---

# FILES CREATED

```
docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md   (spec import, byte-identical)
components/home/final-cta.tsx                                 (277 lines)
lib/content/final-cta-frozen-spec-invariants.test.ts          (510 lines, 41 tests)
docs/final-cta/FINAL_CTA_P1_V1_0_IMPLEMENTATION_REPORT.md     (this report)
```

# FILES MODIFIED

```
app/[locale]/page.tsx                                   import + render swap, supersession doc note
lib/content/homepage.ts                                 + HomepageCopy.finalCta and its fa/en/ar content
lib/content/homepage-composition-invariants.test.ts     CtaBand -> FinalCta in the composition contract; + CtaBand-retention test
lib/content/purchase-process-frozen-spec-invariants.test.ts   tail-order marker <CtaBand -> <FinalCta
lib/catalog/homepage-showcase-resilience.test.ts        catch-scope marker <CtaBand -> <FinalCta
docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md         authority set, composition block, register row, new §3.1, pending table
```

# FILES REMOVED

**None.** Nothing was deleted, renamed or moved.

---

# RUNTIME COMMIT

`abb3a4877...` → `abb3a48` — `feat(home): implement Final CTA V1.0`

```
 app/[locale]/page.tsx                                     |  15 +-
 components/home/final-cta.tsx                             | 277 +++++++++++
 lib/catalog/homepage-showcase-resilience.test.ts          |   2 +-
 lib/content/final-cta-frozen-spec-invariants.test.ts      | 510 +++++++++++++++++++++
 lib/content/homepage-composition-invariants.test.ts       |  53 ++-
 lib/content/homepage.ts                                   |  74 +++
 lib/content/purchase-process-frozen-spec-invariants.test.ts |   2 +-
 7 files changed, 916 insertions(+), 17 deletions(-)
```

`components/ui/cta-band.tsx` is **not** in that list.

# GOVERNANCE COMMIT

`bc36e54` — `docs: register Final CTA V1.0`.
`docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md`, 51 insertions / 6 deletions.
Records: the Final CTA freeze in the authority set; `components/home/final-cta.tsx`
as the Final CTA in the frozen composition block; a register row and a new §3.1
stating precisely that **CtaBand is replaced for the Homepage only and is NOT
superseded**, listing the six pages it still serves; and the pending-work table
flipped from "Final CTA redesign — not started" to done.

---

# FOCUSED TESTS

`lib/content/final-cta-frozen-spec-invariants.test.ts` — **41 tests, 41 pass.**
Coverage: authority present and self-consistent; FA/EN/AR copy pinned
character-for-character against the imported document; copy-shape exactness (no
eyebrow, no second paragraph, no destination field); localized-equivalence and
duplication-gate checks; two claim-safety sweeps per locale; reassurance as
visible text; primary destination via `localizedPath`+`/request` with the route
proven to exist and all three resolutions asserted; phone reuse of
`CONTACT_PHONE_E164` with a hard-coded-number prohibition; same-tab, no-fake-
control, no-section-click; Shared Button variant/size reuse and legacy-variant
prohibition; the inversion and the 48px resting arithmetic; the focus-ring
rebind and the CSS rule it depends on; Navy surface and the full §6 prohibition
list; Cream/White contrast tokens and the no-opacity rule; tracking and `<br>`
prohibitions; spacing scale; 60/40 split and single-column fallback; logical-CSS
-only direction; stacked-button proof; overflow/fixed-width prohibition;
semantics and DOM order; exactly-two-actions counts; motion and hydration
absence; SSR copy presence; the no-eligibility-gate structural proof; the pinned
import list and forbidden-dependency sweep; unconditional Homepage placement
with nothing visible after it; Industries-independence; analytics absence; the
CtaBand-untouched/six-consumers proof; and the hidden-layer check.

`lib/content/homepage-composition-invariants.test.ts` — **38 tests, 38 pass**
(37 pre-existing, retargeted where they named the Final CTA; 1 new:
"the shared CtaBand is no longer the Homepage's closing CTA, but is UNCHANGED
and still serves six other pages").

# FULL TESTS

```
npm test
ℹ tests 1211
ℹ pass  1211
ℹ fail  0
ℹ duration_ms 6759
```

Baseline was 1169 passing. 1211 − 1169 = **42 new tests** = 41 (new invariants
file) + 1 (new CtaBand-retention test in the composition file). **No existing
test broke**; the only existing-test edits were the three `CtaBand` → `FinalCta`
marker renames required by the slot change.

# TSC

```
npx tsc --noEmit
exit 0 — no diagnostics
```

# BUILD

```
npm run build   (vinext build)
✓ 228 modules transformed
Build complete.

Routes: ƒ /:locale  /:locale/about  /:locale/contact  /:locale/industries
        /:locale/markets  /:locale/products  /:locale/products/:slug
        /:locale/request  /:locale/services   λ /api/hello  λ /api/rfqs
```

Clean. `/:locale/request` — the primary destination — is present in the route
manifest. `tsconfig.tsbuildinfo`, which the build touches, was restored with
`git restore` before committing and is not part of any commit.

**No separately defined lint command exists** in `package.json`, so none was
run; `tsc --noEmit` is the strongest static check this repository defines.

---

# EVIDENCE STATUS

**Unchanged — still deliberately deferred by the owner, and untouched here.**
No Verified Evidence component, metric, calculation window, freshness gate or
publication contract exists anywhere in the repository. Composition §6.5's
"a marketing substitute MUST NOT be rendered in its place" is respected: nothing
was invented to fill the slot, and the Final CTA neither reads nor depends on
Evidence in any way — asserted by the forbidden-identifier sweep. The
100-eligible-record threshold remains the active, unimplemented rule.

# INDUSTRIES STATUS

**Unchanged — implemented, correctly returning `null`, untouched here.**
`components/home/industries.tsx` and `lib/content/industries.ts` were not
modified; the publication gate still requires three reviewed, provenanced
photographs that do not exist, so `resolveIndustrySectorImages()` returns `null`
and the section omits itself entirely. No imagery was fabricated or substituted.

The Final CTA is provably independent of that state: it reads neither gate
function, it is a separate sibling in the page's flat fragment, and the runtime
SSR fetch confirms the Final CTA renders in all three locales while Industries
is absent from the HTML.

# FOOTER FOLLOW-UP

**Out of scope and deliberately not touched**, exactly as instructed. The known
Footer defects remain open and unmodified:

- stale sample-taxonomy query links;
- hardcoded Persian labels leaking into the EN and AR footers;
- FAQ / process route reconciliation (no `/process` route exists);
- verified contact configuration beyond the single phone number.

The only Footer-adjacent work in CTA-P1 is on the **Final CTA's own side** of
the boundary — its `border-b border-white/20` divider and its own padding. Zero
lines of `components/layout/SiteFooter.tsx` changed.

# MIGRATION STATUS

`migrations_public/0010_homepage_eligibility.sql` remains **PENDING remote
application** and was not touched, not applied, and not marked applied. This
task has **zero** database dependency: the Final CTA reads no D1 binding at all.
No remote migration, no `wrangler d1` command, and no schema change of any kind
was executed.

# PRODUCTION SAFETY

- **No push.** All four commits are local to `worktree-final-cta-p1`.
- **No deploy**, no `wrangler deploy`, no `vinext-cloudflare deploy`.
- **No merge**, no rebase, no amend, no force operation.
- **No remote migration**, no D1 write of any kind.
- **No Odoo** call, change or configuration touched.
- **No WAF, DNS, secret, environment-variable or Cloudflare-settings change.**
- **No secrets fetched or read.**
- The dev server used for SSR verification ran on localhost:3001 and was stopped.
- The source file in `~/Downloads/` was read only; it is unmodified.
- Homepage metadata remains `indexable: false` — unchanged by this phase.
- No write-isolation guard, permission denial or tool safety refusal was
  encountered at any point; nothing was bypassed, and no settings or
  configuration file was modified.

# READY FOR FINAL FREEZE

**YES — ready for CTA-P2.**

Everything the freeze specifies in content, destination, semantics, geometry,
surface, claim safety, failure isolation and Homepage placement is implemented
and machine-verified, with the full suite, type check and production build all
clean. The one thing CTA-P2 must do first is the verification this session could
not: connect a real browser and complete §13's handoff list —

1. before/after screenshots at FA, EN and AR on desktop, tablet and mobile;
2. real keyboard-focus observation on the Navy surface, confirming the Cream
   ring rebind actually renders as computed;
3. a real 200%-zoom reflow check, especially the EN secondary label at 320px,
   which the `h-auto min-h-12 py-3` override is designed for;
4. a genuine JavaScript-disabled browser load;
5. live measurement of the 60/40 columns and the stacked-button decision, which
   may confirm (or refine) the 1024px breakpoint — nothing else in the component
   depends on that value.

Two smaller items should be recorded rather than silently carried: the Shared
Button contract's `tracking-wide` on Persian and Arabic labels (a Button V1.0
question, not a Final CTA one), and the pre-existing local `/products` D1 state
that prevents a runtime CtaBand check on that one page.
