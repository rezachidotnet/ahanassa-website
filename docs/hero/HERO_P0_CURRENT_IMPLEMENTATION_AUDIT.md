# HERO-P0 — Current Implementation Audit Against Final Frozen V2.3

**Status:** COMPLETE
**Task type:** READ-ONLY AUDIT (no Hero/Header/Price Strip/Product Showcase/Odoo/D1/Cloudflare runtime changes made)

---

## RESULT

**C. HERO V2.3 MATERIAL IMPLEMENTATION GAP — HERO-P1 REQUIRED**

The current `components/home/hero.tsx` is the original pre-frozen "v0" homepage hero (its own source comment says so explicitly — see §3 below). It predates `docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md` entirely (per the prior Frozen UI Spec Durability Checkpoint, the Hero V2.3 document had zero prior repository presence before being imported) and has never been reconciled against it. The gaps are structural (layout architecture, missing content elements), not cosmetic.

---

## PREFLIGHT

```
pwd:      /Users/reza/Developer/ahanassa-website
branch:   feat/header-frozen-v2
HEAD:     f0ee19fdfe813dc1419cf4e6ca240b9720a89041   (matches task's stated handoff HEAD exactly)
status:   clean (working tree clean at phase start)
```

`git log --oneline --decorate -12` at phase start showed an unbroken, expected lineage ending at `f0ee19f (HEAD -> feat/header-frozen-v2) docs: record final Header V2.1 reconciliation`. No unrelated drift. No STOP condition triggered.

## BASE SHA

`f0ee19fdfe813dc1419cf4e6ca240b9720a89041`

## AUTHORITATIVE SPEC

`docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md` — read in full (1832 lines). Confirmed internally consistent: title block, §38 ("Final Status" — historically labeled V2.2, superseded), §51 (V2.1 acceptance addendum, superseded), §55 (V2.2 checkpoint, superseded), §59.4 (current V2.3 approval) all agree the file's current authority is V2.3. No document-identity conflict found (§59 self-check passes).

Implementation checklist extracted (A–Q), condensed:

- **A. Business/copy** — frozen eyebrow/H1/supporting copy (§2); no stronger localized claims (§29).
- **B. CTA architecture** — Primary → `/request` (§3.1, §30.1); Secondary phone, subordinate (§3.2, §30.2).
- **C. Trust/reassurance** — reassurance line required (§4); trust micro-layer max 3 points, text-only (§5, §31).
- **D. Layout** — desktop ~55/45 copy/visual, logical inline-start/inline-end (§10, §22.1); mobile frozen order (§17, §22.2).
- **E. Hero media** — Steel + Procurement Evidence concept (§7); prohibited ownership imagery (§8, §32); no fake readable commercial data (§9); ~4:3 preferred ratio (§12).
- **F. Responsive** — 320–1440 viewport matrix, no overflow (§22.3).
- **G. RTL/LTR** — logical layout flips by direction; DOM order stable (§10, §22.1).
- **H. Accessibility** — one H1, semantics, contrast ≥4.5:1 / ≥3:1 UI, no hover/animation-only info (§23).
- **I. Motion** — grouped copy reveal ~420–480ms, restrained visual reveal ~500–600ms if present; rejected: parallax/slider/autoplay/bounce (§15, §16).
- **J. Progressive enhancement** — full baseline usability with no JS (§26).
- **K. Performance/LCP/CLS** — reserved aspect, responsive delivery, evidence-based LCP priority only (§27, §14 of task).
- **L. Failure isolation** — copy/CTAs/trust survive image failure (§28).
- **M. CTA visual spec** — radius 6–8px, height 48–52px desktop / ≥48px mobile, padding 24–32px, font 15–16px/600, Primary min-width ~180px, identical height, restrained states, `scale(0.98)` max (§53).
- **N. forced-colors** — `@media (forced-colors: active)` required for CTA boundary/focus preservation (§56).
- **O. focus-visible** — `:focus-visible` custom ring, no blanket `:focus{outline:none}` (§57).
- **P. INP/responsiveness** — navigation begins immediately; no animation-gated delay (§58).
- **Q. document-version integrity** — file name/title/status agreement (§59) — confirmed intact for this spec file itself.

---

## CURRENT HERO FILE TREE

```
app/[locale]/page.tsx
  └─ <Hero locale={locale} />               components/home/hero.tsx
       ├─ homepageCopy[locale].hero          lib/content/homepage.ts   (eyebrow/title/body/brandLine/secondaryCta/rail)
       ├─ primaryCta[locale]                 lib/content/nav.ts        ("ارسال لیست خرید" / etc., route hardcoded in hero.tsx, NOT sourced from a route constant)
       ├─ CONTACT_PHONE_E164 / CONTACT_WHATSAPP_URL   lib/content/contact-channels.ts
       ├─ buttonVariants (Primary CTA only)   components/ui/button.tsx
       ├─ localizedPath()                     config/locales.ts
       ├─ next/image → /images/hero-steel-mill.png   public/images/hero-steel-mill.png (1024×1024 PNG, 1.56 MB)
       └─ styles: bg-navy, text-copper-400, hairline-grid   styles/tokens.css, styles/theme-extensions.css
```

No `Reveal` (`components/ui/reveal.tsx`) import — Hero is the only major homepage section with zero motion wrapper (Reach/Capabilities/ProductShowcase/Process all use it). No Hero-specific test file exists anywhere in the repository (`find` for `*hero*` returns only `docs/hero/`, the build output under `dist/`, `components/ui/page-hero.tsx` — an unrelated generic page-header component used elsewhere, not the homepage Hero — and `components/home/hero.tsx` itself).

## CURRENT HERO DATA / CONTENT FLOW

```
lib/content/homepage.ts  →  HomepageCopy.hero: { eyebrow, title, body, brandLine, secondaryCta, rail: {title,body}[4] }
```

There is **no `reassurance` field and no 3-item `trustPoints`/`trust` field anywhere in the `HomepageCopy` type** for any locale. `brandLine` exists in the data for all three locales but is never read/rendered by `hero.tsx` (confirmed by full source read — no `t.brandLine` reference in the component).

---

## FA COPY AUDIT

| Element | CURRENT | FROZEN | STATUS |
|---|---|---|---|
| Eyebrow | مدیریت تأمین و خرید پروژه‌ای فولاد | مدیریت تأمین فولاد پروژه | **GAP** |
| H1 | خرید آهن را به یک تصمیم مطمئن تبدیل کنید. | تأمین فولاد پروژه، با بررسی فنی و تجاری پیش از خرید. | **GAP** |
| Supporting copy | فاکتور یا لیست خریدتان را بفرستید؛ آهن آسا نیاز پروژه، گزینه‌های تأمین و مسیر خرید را با نگاه فنی و تجاری بررسی و هماهنگ می‌کند. | لیست خرید یا نیاز پروژه را ارسال کنید؛ آهن آسا مشخصات، گزینه‌های تأمین و شرایط تجاری را بررسی می‌کند تا مسیر خرید شفاف‌تر و قابل‌کنترل‌تر باشد. | **GAP** |
| Primary CTA text | ارسال لیست خرید | ارسال لیست خرید | **PASS** |
| Primary CTA route | `/contact` | `/request` | **GAP** (material — `/request` already exists and builds successfully) |
| Secondary CTA text | درخواست قیمت تلفنی | درخواست قیمت تلفنی | **PASS** |
| Secondary CTA action | `tel:+989120656528` | phone action | **PASS** |
| Reassurance | *(absent — no field in data model)* | ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود. | **GAP** |
| Trust micro-layer | *(absent — replaced by unrelated 4-item "protection controls" rail)* | بررسی فنی نیاز • مقایسه گزینه‌های تأمین • هماهنگی خرید (max 3) | **GAP** |
| Brand line | *(present in data, never rendered)* | ما مراقب سرمایه شما هستیم. | **GAP** |

**FA COPY: GAP** — business copy differs materially from the frozen baseline text (not just paraphrase-level), and three of the nine frozen content elements (reassurance, trust micro-layer, brand line) do not appear in the rendered page at all.

## EN COPY AUDIT

Same structural absences as FA (reassurance/trust-micro-layer/brand-line not rendered). Business meaning is preserved and not overclaimed (no guarantee/ownership language found). One locale-specific deviation: Secondary CTA is **"Request a quote on WhatsApp"** → `https://wa.me/...`, not a phone action — this is a different channel/verb than the frozen "phone, subordinate" requirement (§30.2), not merely a translation choice.

**EN COPY: GAP**

## AR COPY AUDIT

Same structural absences as FA/EN. Business meaning preserved, no stronger claims found. Same WhatsApp-instead-of-phone deviation as EN ("طلب سعر عبر واتساب").

**AR COPY: GAP**

---

## POSITIONING / BUSINESS ROLE

The rendered copy (all three locales) correctly communicates: buyer sends an invoice/purchase list → Ahan Asa reviews technically/commercially → coordinates sourcing. No checkout/marketplace/instant-price language found. This part of the frozen positioning intent is preserved even though the literal frozen sentences are not used verbatim (see FA/EN/AR copy audits above).

## PRIMARY CTA

Text: **PASS** (FA exact match; EN/AR faithful equivalents from `lib/content/nav.ts`).
Route: **GAP** — hardcoded to `/contact` in `hero.tsx:48` (`localizedPath(locale, "/contact")`), not `/request`. The `/request` route exists and is a build-confirmed route (`npm run build` output lists `ƒ /:locale/request`), so this is a same-repo wiring gap, not a missing dependency. This is the single most material finding in this audit under §30.1 ("The destination must be real... No fake modal or placeholder action") combined with the Final Acceptance Matrix row `Primary CTA | /request`.
Navigation is real (`<Link>`), no modal, no JS gating, confirmed to work with JavaScript disabled (see §PROGRESSIVE ENHANCEMENT below).

**PRIMARY CTA: GAP**

## SECONDARY CTA

FA: `tel:+989120656528` sourced from `CONTACT_PHONE_E164` (Central Verified Business Identity, not a Hero-local hardcode) — **PASS**.
EN/AR: `CONTACT_WHATSAPP_URL` (`wa.me` deep link) — same verified underlying number, different channel/verb ("Request a quote on WhatsApp" vs. frozen "phone action"). This is a locale-specific product decision made in a prior (RFQ/UX polish) phase, documented in `lib/content/contact-channels.ts`'s own header comment. It does not fabricate a number and does not replace the Primary RFQ path, but it does not match the frozen spec's stated secondary-CTA channel for en/ar. **This is a decision requiring owner input, not a code defect** — see HERO-P1 boundary.

**SECONDARY CTA: GAP** (FA channel compliant; en/ar channel diverges from spec text)

---

## CTA VISUAL SPEC (measured, real Chromium computed styles at 1280px)

| Check | Measured | Required | STATUS |
|---|---|---|---|
| Corner radius | `0px` | 6–8px | **GAP** |
| Primary/Secondary radius identical | both 0px (identical, but wrong value) | identical | PASS on parity, GAP on value |
| Height | 52px (both) | 48–52px desktop | **PASS** |
| Horizontal padding | 32px/32px | 24–32px | **PASS** |
| Font size | 14px | 15–16px | **GAP** |
| Font weight | 600 | 600 | **PASS** |
| Primary min width (desktop) | not min-width constrained; content-driven, visually >180px at 1280px | ~180px | PASS (observed) |
| Primary treatment | solid `bg-copper` (brand copper, not navy) | "solid fill — brand navy" | **GAP** — spec (§53.3) specifies navy for the Primary fill; current implementation uses the copper/accent color instead |
| Secondary treatment | outline/ghost, `border-white/25`, no fill | outline/ghost, no fill | **PASS** |
| Secondary lighter-tint fill | none present | forbidden | **PASS** |
| Mobile CTA vertical gap | `gap-3` (12px) container, both wrap in a `flex flex-wrap gap-3` row, not stacked full-width at 390px (see screenshot) | ≥12–16px between full-width/dominant-width buttons | **GAP-adjacent** — at 390px the two CTAs remain side-by-side rather than adopting a mobile "full-width or dominant width" stacked treatment; gap is horizontal, not the vertical stacking gap the spec's mobile guidance (§53.4/§22.2) describes |
| Active/pressed state | no `scale()` transform found in source | `scale(0.98)` max | **GAP** (not implemented) |
| Focus (Primary) | `focus-visible:outline-2 outline-offset-2` copper ring (shared button convention) | visible, ≥3:1, offset | **PASS** |
| Focus (Secondary) | no explicit `:focus-visible` styling (custom anchor, browser default only) | same custom treatment as Primary | **GAP** (inconsistent, not necessarily invisible) |
| forced-colors support | none found anywhere in `styles/` (`grep -rn "forced-colors"` → zero hits, repo-wide) | required (§56) | **GAP** |

Note on measurement method: font-size/height/padding/radius were read via `getComputedStyle()` in a live headless-Chromium session against the running dev server (not eyeballed). The 14px font-size finding is notable because `buttonVariants` size `"lg"` is defined as `text-base` (should compute ~16px) while the cva base classes also set `text-sm` (14px) — the rendered 14px suggests the base `text-sm` is winning over the `lg` variant's `text-base` in the current Tailwind/`cn()` merge, which is worth root-causing in HERO-P1 rather than assumed.

**CTA VISUAL SPEC: GAP**

## CTA INP / RESPONSIVENESS

Primary CTA is a plain `<Link>` (real anchor under the hood via vinext/Next routing), no `onClick`, no `setTimeout`, no animation-end gating, no synchronous heavy JS. Activation begins navigation immediately. No pressed-state transform exists to even risk gating navigation.

**CTA INP: PASS**

---

## REASSURANCE

Not present in `HomepageCopy` data model for any locale; not rendered.

**REASSURANCE: GAP**

## TRUST MICRO-LAYER

Not present as specified (max 3, text-first, no promotional styling). What exists instead is a 4-column `<dl>` "rail" (`شفافیت در نیاز` / `کنترل تأمین` / `حفاظت تجاری` / `هماهنگی تحویل` for FA) styled as a bordered stat-strip with bold `<dt>` + muted `<dd>` — this is a different, larger UI element than the frozen "short phrases, text-first, no badge styling" trust micro-layer, and it has 4 items, not ≤3. Content itself is not fabricated (the component's own source comment confirms this rail deliberately replaces v0's fake tonnage/country statistics with real capability descriptions — a legitimate anti-fabrication fix from an earlier phase), but it does not satisfy the frozen Trust Micro-Layer requirement.

**TRUST LAYER: GAP**

## BRAND LINE

`brandLine` exists in `lib/content/homepage.ts` for fa/en/ar but is dead data — never read by `hero.tsx`. Confirmed absent from every locale's rendered DOM via live-page text search.

**BRAND LINE: GAP** (present in data, absent in render)

---

## DESKTOP LAYOUT

Current: single `max-w-3xl` copy block over a full-bleed `next/image` (`fill`, `object-cover`, 45% opacity) with a physical (`bg-linear-to-r`, not logical) navy gradient overlay and a decorative hairline grid. There is no two-column split; the image is a background wash behind the entire section, not a distinct ~45%-width visual panel.

This does not implement the frozen §10/§22.1 requirement (`inline-start = copy`, `inline-end = visual`, ~55/45 desktop split, RTL/LTR-flippable). Because the gradient direction is physical (`to right`) rather than logical, its darkest/most-opaque zone is fixed on the physical left regardless of text direction — for FA/AR (RTL, text right-aligned) the text sits over the *more transparent* end of the gradient rather than the *more opaque* end used for EN. In the real rendered screenshot this did not produce a visible legibility problem (the underlying photo is uniformly dark), but it is a latent, direction-dependent contrast risk that a future asset swap could expose — worth fixing in HERO-P1 regardless of the larger layout rework.

**DESKTOP LAYOUT: GAP**

## MOBILE CONTENT ORDER

Verified via live 390px render (FA): Eyebrow → H1 → Supporting copy → Primary CTA → Secondary CTA → [4-item rail]. The first five elements match the frozen order. Reassurance, trust micro-layer (as specified), and brand line are absent rather than misplaced. "Hero visual" cannot appear last as a discrete mobile block because it is a persistent full-bleed background behind the entire section, not a block-level element in the content flow — so §17's literal ordering requirement for the visual doesn't strictly apply to this architecture, but neither is it satisfied in spirit (the visual is omnipresent, not deliberately sequenced after the trust layer/brand line).

**MOBILE ORDER: GAP** (partial — CTA-and-above order is compliant; full order cannot be verified because 3 of 9 elements don't exist)

## RTL / LTR

No horizontal overflow at any of the 24 (locale × viewport) combinations tested (320/360/390/430/768/1024/1280/1440 × fa/en/ar), confirmed live. `dir="rtl"` correctly applied for fa/ar; text mirrors correctly (arrow icon uses `rtl:-scale-x-100`). DOM order is stable (no tabindex/accessibility reordering hacks found). The RTL/LTR *split-layout flip* itself doesn't apply since there is no split layout (see Desktop Layout above).

**RTL/LTR: PASS** (no overflow/clipping/DOM-order defects) — layout-split-specific requirement is GAP, tracked separately above.

---

## HERO VISUAL

File: `public/images/hero-steel-mill.png`, PNG, 1024×1024 (1:1, not the preferred ~4:3), 1.56 MB, delivered via `next/image` with `fill` + `priority` + `sizes="100vw"`.

**Actual image content** (viewed directly, full resolution): a dim, moody interior shot of an active steel-rolling production line — a glowing red-hot steel bar/rail on a roller conveyor mid-process, overhead gantry crane, industrial machinery either side, and **two workers in hard hats standing at the line**. This is a textbook match for every item on the §8 prohibited list: "generic steel mill," "production line," and "welding worker"/production-worker scene implying ownership. It directly implies Ahan Asa owns/operates a steel manufacturing facility — which contradicts both the Hero's own frozen role (§1: procurement/sourcing, not manufacturing) and `CLAUDE.md`'s core product truth ("premium B2B steel procurement and sourcing partner... not a commodity marketplace... not a manufacturer").

## VISUAL CLAIM INTEGRITY

**FALSE OWNERSHIP CLAIM: PRESENT.** This is the most severe individual finding in this audit.

## MEDIA PROVENANCE

No provenance/sourcing note exists for `hero-steel-mill.png` anywhere in the repository (no README, no comment, no metadata file). Given `PROJECT_OVERRIDES.md`/`CLAUDE.md`'s repeated emphasis on not inventing unverified material, an unattributed AI-generated-looking industrial photo being used as the homepage's first-screen visual is itself a governance gap independent of its prohibited subject matter.

**HERO VISUAL: GAP** — **FALSE OWNERSHIP CLAIM: PRESENT**

## MEDIA FAILURE ISOLATION

Copy and CTAs are DOM siblings of the `<Image>`, not dependent on it loading — if the image 404s, H1/body/CTAs/rail remain fully present and functional (confirmed by reading the DOM structure; not separately load-tested with a broken URL in this pass, since doing so would require a runtime change to test against — out of scope for an audit-only phase). `alt=""` and `aria-hidden="true"` mean no broken-alt-text artifact, but a `fill`-sized `<img>` with a broken source can render a visible browser default broken-image glyph across the section; this was not empirically forced/observed in this phase.

**MEDIA FAILURE ISOLATION: PASS** (copy/CTA independence confirmed structurally) — broken-image-glyph visual risk noted as unverified, not scored as a failure.

## MEDIA PERFORMANCE

`priority` (→ eager + high fetchpriority equivalent under `next/image`) is applied unconditionally, with no comment or measurement recorded anywhere justifying that this image is the actual LCP element. Given the image is a full-viewport-width background at 45% opacity behind large headline text, either the image or the H1 could plausibly be the real LCP candidate — this has not been measured (no Lighthouse/PerformanceObserver trace exists in the repo).

**LCP PRIORITY: ASSUMED** (not evidence-based, per §14 of the task's own required classification)

`sizes="100vw"` is present (responsive delivery exists at the `next/image` config level); no explicit `width`/`height` reservation was needed since `fill` + a `relative`/`isolate` positioned parent section reserves space via the section's own content-driven height — no CLS risk identified from the image itself.

**LCP/CLS: NEEDS MEASUREMENT**

---

## DESIGN TOKENS

Hero consumes shared Tailwind/token-backed utility classes (`bg-navy`, `text-copper-400`, `text-white/70`, etc.) rather than arbitrary hex literals — consistent with the shared token system read in `styles/tokens.css` during PRICE-P4/NAV-P1.1. No unrelated local colors found.

**DESIGN TOKENS: PASS**

## TYPOGRAPHY / FONT STABILITY

No Hero-specific `@font-face`, `font-display`, or `size-adjust` override exists — Hero consumes the global font strategy, matching §44.2's explicit preference ("Hero consumes the global font strategy rather than maintaining a divergent local configuration"). Global font-loading behavior itself was not re-measured in this phase (out of this audit's file-change scope; no regression evidence found).

**FONT STABILITY: NEEDS MEASUREMENT** (deferred to the shared/global font-strategy owner, not Hero-specific)

---

## MOTION

No `Reveal` wrapper and no CSS animation/transition found on Hero's copy or visual. Motion is described in §15 without an explicit "OPTIONAL" qualifier the way §16/§19 explicitly mark rejected items, but the task's own instruction (§17) directs auditors not to treat absence as an automatic defect "unless the frozen spec explicitly requires the enhancement rather than merely permits it" — and §35's acceptance matrix pairs "Copy motion | Single grouped reveal" with "Motion required for usability | FORBIDDEN," i.e., motion is a describe-if-present treatment, not a hard requirement. Omitting motion on the very first paint also has a plausible, legitimate LCP-protection rationale (all other homepage sections that use `Reveal` are below the fold).

**MOTION: NOT IMPLEMENTED** (classified as approved-optional absence, not a defect — see Prioritized Findings)

## REDUCED MOTION

Trivially satisfied — there is no motion to disable. Live check with `prefers-reduced-motion: reduce` emulated confirms H1 renders at `opacity: 1` immediately.

**REDUCED MOTION: PASS**

## PROGRESSIVE ENHANCEMENT

Verified live with JavaScript fully disabled (`javaScriptEnabled: false`): H1 visible (`opacity: 1`), Primary CTA anchor present with its (currently wrong, but real) `href`. Hero has no `"use client"` directive and no hydration-gated visibility — fully server-rendered baseline.

**PROGRESSIVE ENHANCEMENT: PASS**

---

## ACCESSIBILITY

- Exactly one `<h1>` on the homepage, inside Hero. **PASS**
- Semantic structure: `<section>` → eyebrow `<p>` → `<h1>` → body `<p>` → CTA `<Link>`/`<a>` → `<dl>`/`<dt>`/`<dd>` rail. **PASS**
- CTA semantics: Primary is a real `<Link>` (anchor); Secondary is a real `<a>`. Both keyboard-reachable, native Enter/click activation. **PASS**
- Contrast: computed precisely for the two solid-color CTA pairs using the actual token hex values (`--aa-color-brand-copper-600: #b04a2f`, `--aa-color-brand-navy-900: #0b2545`) against white text via the WCAG relative-luminance formula:
  - White on copper (Primary CTA fill): **5.43:1** — PASS (≥4.5:1).
  - White on navy (Secondary CTA surface / body copy over the darkest part of the gradient): **15.38:1** — PASS.
  - Body copy over the photographic gradient (not a flat color) cannot be computed exactly without pixel-sampling tooling not available in this pass; the real rendered 1280px screenshot was inspected directly and text remains clearly legible throughout — no visual contrast failure observed in the actual render.
- No hover-only or animation-only information found (there is no motion at all, and no content is conditionally hidden).
- RTL/LTR: correct `dir` attribute, correct icon mirroring, no duplicate/confusing screen-reader output found.

**ACCESSIBILITY: PASS** (with the noted photographic-background contrast caveat: qualitatively verified via real screenshot, not pixel-measured)

## FORCED COLORS

Zero `@media (forced-colors: active)` rules exist anywhere in the repository (`grep -rn "forced-colors" styles/ app/ components/` → no results). Live Chromium `forcedColors: "active"` emulation against the running Hero shows the Primary CTA computing to `border: 0px` and `background-color: rgba(255,255,255,0)` (fully transparent) — i.e., with no explicit forced-colors rule, the Primary CTA has no guaranteed visible boundary or fill under Windows High Contrast Mode. This is exactly the risk §56.1 exists to prevent.

**FORCED COLORS: GAP**

## FOCUS-VISIBLE

Primary CTA reuses the shared `buttonVariants` `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aa-color-focus-ring)]` convention (same pattern already validated site-wide in NAV-P1.1) — **PASS**. Secondary CTA (a bespoke `<a>` in `hero.tsx`, not routed through `buttonVariants`) has no explicit `:focus-visible` styling at all, so its focus indication depends entirely on the browser's native default outline — not necessarily broken, but inconsistent with the Primary CTA and with the frozen §57 "same custom treatment" expectation.

**FOCUS-VISIBLE: GAP** (Primary compliant; Secondary inconsistent)

## PREFERS-CONTRAST

No `@media (prefers-contrast: more)` rule exists for Hero (or anywhere in `styles/`). Per §49/§50, this is an approved *optional* enhancement, not a blocker.

**PREFERS-CONTRAST: NOT IMPLEMENTED — OPTIONAL** (absence is not scored as a defect)

---

## RESPONSIVE MATRIX

Live-rendered at 320/360/390/430/768/1024/1280/1440 across fa/en/ar (24 combinations total): **zero horizontal overflow, zero zero-size/clipped `<h1>`** in every case.

**RESPONSIVE MATRIX: PASS**

## ZOOM / REFLOW

Tested at 200% and 400% CSS zoom on a representative FA mobile viewport (390px): no horizontal overflow at either zoom level.

**ZOOM 200: PASS**
**ZOOM 400: PASS**

---

## STRUCTURED DATA / SEO

No `Product`/`Offer`/`AggregateRating`/`Review`/`Organization` JSON-LD generated from Hero's decorative content was found (Hero itself emits no structured data; homepage-level structured data is handled elsewhere per `lib/seo/schema.ts`, out of this audit's scope). H1/supporting copy/CTA all exist in server-rendered HTML (confirmed via the no-JS check above).

**STRUCTURED DATA / SEO: PASS**

## TRUST / CLAIM AUDIT

No customer counts, tonnage, review stars, "best price"/"fastest delivery"/guarantee language, or supplier/factory logo walls found anywhere in Hero's rendered text. The 4-item rail's content ("شفافیت در نیاز", "کنترل تأمین", "حفاظت تجاری", "هماهنگی تحویل" / English & Arabic equivalents) is descriptive of process, not a numeric or unverifiable claim.

**TRUST / CLAIM AUDIT: PASS**

## CURRENT VISUAL CHARACTER

Observable, spec-relevant mismatches only (no subjective preference applied): the full-bleed darkened photographic background plus hairline grid overlay reads as a generic "corporate hero band" pattern rather than the frozen "Steel + Procurement Evidence" split-panel concept, and the visual subject itself (steel mill / production line / workers) is the opposite of the "controlled industrial presentation... illustrative composition elements, not commercial product claims" direction in §7.

---

## REQUIRED V2.3 RULES (frozen, non-negotiable — gaps found)

1. Frozen FA copy (eyebrow/H1/supporting copy) — GAP.
2. Primary CTA → `/request` — GAP (currently `/contact`).
3. Reassurance line — GAP (absent).
4. Trust micro-layer, max 3, text-first — GAP (absent; replaced by a 4-item unrelated rail).
5. Brand line rendered — GAP (present in data, not rendered).
6. Desktop ~55/45 logical split layout — GAP (full-bleed single column instead).
7. No factory-ownership/production-line/worker imagery — GAP (**FALSE OWNERSHIP CLAIM: PRESENT**).
8. CTA corner radius 6–8px — GAP (0px).
9. CTA font size 15–16px — GAP (measured 14px).
10. Primary CTA solid brand **navy** — GAP (currently copper).
11. CTA active/pressed `scale(0.98)` — GAP (not implemented).
12. `@media (forced-colors: active)` support — GAP (absent repo-wide).
13. Secondary CTA `:focus-visible` custom treatment — GAP (inconsistent with Primary).

## APPROVED OPTIONAL ENHANCEMENTS (not implemented — correctly not blockers)

- Hero copy/visual reveal motion (§15) — not implemented; legitimate LCP-protection rationale plausible.
- `prefers-contrast: more` (§49) — not implemented anywhere; explicitly optional.
- Container queries (§43) — not used; explicitly optional.
- CSS `linear()` easing (§45) — moot, no motion exists yet.
- View Transitions to `/request` (§48) — not implemented; explicitly optional and explicitly not required.
- `size-adjust` font metric tuning (§44.1) — not implemented; requires measurement, not mandatory.

---

## PRIORITIZED FINDINGS

**P0**
1. Primary CTA routes to `/contact`, not `/request` — breaks the frozen primary conversion path; `/request` already exists and builds successfully (`hero.tsx:48`).
2. Hero visual (`hero-steel-mill.png`) depicts an active steel-mill production line with workers — a direct, unambiguous false-ownership implication prohibited by §8/§32 and contradicted by the site's own core product truth.

**P1**
3. Reassurance line entirely absent from the data model and render, for all locales.
4. Trust micro-layer entirely absent (replaced by an unrelated 4-item rail, which also exceeds the 3-item maximum).
5. Brand line present in `homepageCopy` data but never rendered — dead data plus a missing required element.
6. Desktop layout is a full-bleed single-column band, not the frozen ~55/45 inline-start/inline-end split.
7. Primary CTA fill color is brand copper, not the frozen brand navy (§53.3).
8. No `@media (forced-colors: active)` support anywhere — Primary CTA has zero guaranteed boundary/fill under Windows High Contrast Mode (live-verified).
9. Secondary CTA channel for en/ar is WhatsApp, not phone — diverges from the frozen §30.2 secondary-CTA channel; needs an explicit owner decision (keep WhatsApp for en/ar vs. align to phone) rather than a unilateral code fix.

**P2**
10. CTA corner radius is 0px against the frozen 6–8px.
11. CTA font-size measures 14px against the frozen 15–16px (likely a `buttonVariants` size-variant/class-merge issue, needs root-causing).
12. No `scale(0.98)` active/pressed feedback on either CTA.
13. Secondary CTA lacks the shared `:focus-visible` treatment used by the Primary CTA (inconsistent, not necessarily invisible).
14. Physical (non-logical) gradient direction on the Hero background is a latent RTL-dependent contrast risk (not currently visible, but fragile against a future asset change).
15. `hero-steel-mill.png` has no documented provenance anywhere in the repository.
16. Hero image LCP-priority treatment (`priority`) is applied without recorded measurement evidence.

**P3**
17. No copy/visual reveal motion implemented (approved-optional absence).
18. `prefers-contrast: more` not implemented (approved-optional).
19. `size-adjust` font-metric tuning not implemented (approved-optional, requires measurement).
20. Mobile CTA row is horizontally paired rather than adopting a stacked full-width/dominant-width treatment at narrow widths.

---

## HERO-P1 IMPLEMENTATION BOUNDARY (recommended, NOT implemented in this phase)

**Files likely affected:**
- `components/home/hero.tsx` — primary rewrite target: fix CTA route, restructure to a real desktop split layout, add reassurance/trust-micro-layer/brand-line rendering, apply CTA visual spec (radius, navy fill, active-state, forced-colors, focus-visible parity).
- `lib/content/homepage.ts` — extend `HomepageCopy.hero` with `reassurance: string` and a `trust: string[]` (max 3) field for fa/en/ar; decide whether to reconcile eyebrow/H1/body to the frozen literal baseline or keep the current (also-legitimate, non-fabricated) copy — **this is a content decision requiring owner input**, not a mechanical fix.
- `public/images/hero-steel-mill.png` (or a net-new asset) — **requires owner input**: the current image cannot be reused as-is (§8 violation); a replacement following the "Steel + Procurement Evidence" (IPE/rebar/plate + procurement-document cues, no factory/production-line/worker) direction must be sourced or generated and approved before HERO-P1 can close the visual-integrity gap.
- `styles/` (wherever the shared button/CTA primitives live) — add `border-radius`, `scale(0.98)` active state, and `@media (forced-colors: active)` rules; likely shared with any other CTA using `buttonVariants`, not Hero-only.

**Optional improvements explicitly excluded from HERO-P1:** reveal motion, `prefers-contrast: more`, container queries, View Transitions, `size-adjust` — none are required to reach V2.3 compliance.

**Media decisions requiring owner input:**
- Replacement Hero image sourcing/generation/approval (cannot proceed without this — no Hero-visual fix is possible without a compliant asset).
- Whether en/ar Secondary CTA stays WhatsApp or moves to a phone action.
- Whether to adopt the frozen literal FA/EN/AR copy verbatim or retain the current (also non-fabricated, but different) copy — a content-owner call, not an engineering one.

**Tests required in HERO-P1:** a `lib/content/hero-frozen-spec-invariants.test.ts` (source-text assertions, following the established `next/image`/`next/link`-safe pattern used for `header-frozen-spec-invariants.test.ts` and `price-strip-static.test.ts`) asserting: CTA href is `/request`; reassurance/trust/brand-line content exists and renders; trust array length ≤3; no forbidden motion patterns; CTA classnames include the frozen radius/font-size tokens.

**Browser verification required in HERO-P1:** the same fa/en/ar × 8-viewport overflow matrix (already established safe — expect it to remain PASS since layout changes are additive, not viewport-breaking), plus a fresh forced-colors screenshot pass and a fresh WCAG-contrast pass against whatever navy-fill Primary CTA and new Hero image are actually shipped (the current computed-contrast numbers in this report are only valid for the current copper fill / current image and must be re-measured after the fix).

---

## FILES CREATED

- `docs/hero/HERO_P0_CURRENT_IMPLEMENTATION_AUDIT.md` (this report)

## FILES MODIFIED

None. (`tsconfig.tsbuildinfo` was transiently regenerated by running `npx tsc --noEmit` and was reverted with `git checkout -- tsconfig.tsbuildinfo` before finishing this phase, per the audit-only constraint.)

## TEST RESULTS

`npm test`: **850/850 passing**, 0 failing (no Hero-specific tests exist yet — this count reflects the pre-existing suite, unaffected by this read-only phase).

## TSC

`npx tsc --noEmit`: **PASS** (zero errors).

## BUILD

`npm run build`: **PASS**. Confirmed route table includes `ƒ /:locale/request` (the correct destination Hero's Primary CTA should use).

## GIT

No runtime/source files were modified. `git status --short` was empty at phase start, empty at phase end (the one transient `tsconfig.tsbuildinfo` diff produced by running `tsc --noEmit` was reverted). Only this report file is new.

## PRODUCTION SAFETY

No production/staging/Cloudflare/D1/Odoo systems touched. No push. No deploy. Dev server used only for local verification and was stopped before finishing this phase.

## RISKS

- The false-ownership Hero image is a live brand/positioning risk on the current production site right now (this audit did not change it, since HERO-P0 is read-only, but the owner should be made aware this is currently live, not merely a documentation gap).
- The `/contact`-instead-of-`/request` CTA route may be actively costing conversions to the correct RFQ flow.
- Any HERO-P1 fix to the Hero image requires new owner-approved media before it can close the most severe finding — this is not something engineering can resolve unilaterally.

## NEXT PHASE

Recommend **HERO-P1** scoped exactly per the boundary above, gated on owner input for: (a) the replacement Hero image, (b) whether to adopt the frozen literal copy verbatim, (c) the en/ar Secondary CTA channel decision. Everything else in the boundary (CTA route fix, reassurance/trust/brand-line rendering, CTA visual-spec hardening, forced-colors support) can proceed without further owner input.
