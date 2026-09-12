# Industries / Use Cases V1.0 — IND-P1 Implementation Report

**Phase:** IND-P1
**Date:** 2026-09-12
**Branch:** `worktree-industries-p1`
**Report location rationale:** `docs/industries/` follows the established
one-directory-per-governed-concern convention already used by `docs/hero/`,
`docs/product-showcase/`, `docs/evaluation-assurance/`, `docs/purchase-process/`,
`docs/buyer-value/`, `docs/discoverability/` and `docs/homepage/`. The directory
was created in this phase; the freeze document and this report are its contents.

```
INDUSTRIES AUTHORITY: V1.0
INDUSTRIES: DISABLED
ITEM COUNT: 3
ITEM ORDER: PASS
FA: PASS
EN: PASS
AR: PASS
IMAGES: BLOCKED
IMAGE PROVENANCE: GAP
IMAGE ALT POLICY: PASS
DESKTOP: 3 COLUMNS
INTERMEDIATE 2-COLUMN: ABSENT
NARROW: 1 COLUMN
CTA: ABSENT
ITEM LINKS: ABSENT
ODOO DEPENDENCY: ABSENT
DB_PUBLIC DEPENDENCY: ABSENT
EVIDENCE DEPENDENCY: ABSENT
CLIENT FETCH: ABSENT
SSR: PASS
FINAL CTA STILL PRESENT: YES
VERIFIED EVIDENCE: DEFERRED
REMOTE MIGRATION 0010: PENDING
READY FOR IND-P2 FREEZE: YES
```

---

# RESULT

**B — INDUSTRIES CODE/CONTENT IMPLEMENTED; PUBLIC ENABLEMENT BLOCKED ONLY BY
VERIFIED IMAGE ASSETS.**

The component, its localized content, its publication gate, its Homepage wiring
and 43 new invariant tests are complete and passing. The section renders nothing
today because Industries V1.0 §10 conditions publication on *reviewed imagery*
alongside approved scope and complete copy, and no legitimately usable,
credibly-provenanced sector photograph exists in this repository or in the
operator's import area. §8 closes the door explicitly:

> "Do not ship the component with missing initial image assets; the fallback
> covers runtime failure."

That §8 fallback governs a request that fails **at runtime**; it is not a
licence to publish with no assets selected. Fabricating provenance, hotlinking,
substituting a near-miss photograph and shipping a gradient placeholder were all
available and all deliberately rejected. Supplying three approved assets in
`INDUSTRY_SECTOR_IMAGES` publishes the section with no further code change.

# PREFLIGHT

| Check | Value |
|---|---|
| Working directory | `/Users/reza/Developer/ahanassa-website/.claude/worktrees/industries-p1` |
| Branch | `worktree-industries-p1` |
| Starting HEAD | `1d1ea2b9243257a4a34180756ac6ffa4f81b64f9` |
| Starting `git status --short` | clean |
| Starting HEAD subject | `docs: record Homepage HP-R1 reconciliation` |

No `AGENTS.md` exists in this repository. `CLAUDE.md` was read in full.
No worktree was created, entered or removed by this phase.

# BASE SHA

`1d1ea2b9243257a4a34180756ac6ffa4f81b64f9`

# AUTHORITATIVE SPEC

`docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md`

Imported byte-for-byte from
`~/Downloads/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md`
(10,891 bytes). The source file was read, not modified, and remains in place.

Read in full alongside it, per the phase's reading order:

- `docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md`
- `docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md`
- `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md`
- `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md`
- `CLAUDE.md`, `01-sources/MEDIA_GUIDELINES.md`, `01-sources/IMAGE_OPTIMIZATION.md`
- `app/[locale]/page.tsx`, `components/home/reach.tsx`,
  `components/home/buyer-value.tsx`, `components/home/product-showcase.tsx`,
  `components/ui/reveal.tsx`, `lib/content/homepage.ts`, `lib/content/pages.ts`

# SPEC SHA-256

```
SOURCE  e72326ac185f18b318620667e1800958c0363f5a9ca27dc03055c4bd5083e32c  ~/Downloads/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md
TARGET  e72326ac185f18b318620667e1800958c0363f5a9ca27dc03055c4bd5083e32c  docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md
```

Independently recomputed in this session. **SOURCE == TARGET.** No wording,
translation, sector order, visual requirement or image-policy statement was
altered during import.

# SPEC IMPORT COMMIT

`34946cf` — `docs: import Industries Use Cases V1.0 freeze`
(one file, the imported freeze document, nothing else)

# CURRENT IMPLEMENTATION BEFORE

The Homepage's Industries slot was filled by `Reach`, a markets/coverage band:

| Property | Value |
|---|---|
| Component path | `components/home/reach.tsx` |
| Content owner | `homepageCopy[locale].reach` (eyebrow/title/body/cta) + `marketsCopy[locale].industries` (`lib/content/pages.ts`) |
| H2 (FA) | «درخواست‌ها از صنایع مختلف بررسی می‌شود.» via the shared `SectionHeading` |
| Items | 5 — ساخت‌وساز و زیرساخت · کارخانه‌های نورد مجدد · ریخته‌گری و کارگاه‌های ذوب · ساخت‌وساز و سازه‌های فلزی · خودروسازی و ماشین‌آلات |
| Item count | 5 (vs the frozen 3) |
| Image asset | one — `/images/ops/port-loading.png`, 16:9, `alt="" aria-hidden="true"` |
| Links / CTA | one `<Link>` to `/markets` with an `ArrowUpRight` icon |
| Layout | 12-column split: heading + CTA in `lg:col-span-5`, image + `sm:grid-cols-2` bordered tile grid in `lg:col-span-7` |
| Enable mechanism | none — unconditional; it always rendered |
| Data dependencies | none (pure editorial content) |
| Motion | `Reveal` per tile with a 50 ms stagger |
| Consumers | `app/[locale]/page.tsx` **only** (verified by grep) |

The five names were never fabricated — they are real approved copy, shared
verbatim with `/industries` and `/markets`. They are simply not the frozen
three-sector composition V1.0 defines.

# CURRENT IMPLEMENTATION AFTER

| Property | Value |
|---|---|
| Component path | `components/home/industries.tsx` |
| Content owner | `homepageCopy[locale].industries` (`lib/content/homepage.ts`) |
| Publication gate | `lib/content/industries.ts` |
| H2 (FA) | «تأمین آهن و فولاد برای حوزه کاری شما» — bare `<h2 id>`, no `SectionHeading` |
| Items | 3, the frozen sectors, in the frozen order |
| Image assets | 3 slots declared, **0 supplied** → section omitted |
| Links / CTA | none of any kind |
| Layout | one column narrow, three equal columns at `lg` |
| Enable mechanism | `resolveIndustrySectorImages()` + `isIndustriesCopyComplete(locale)`, both server-side |
| Data dependencies | none — zero I/O |
| Motion | none |
| Rendered output today | `null`, before any markup |

`Reach` is **superseded for the Homepage only**. `components/home/reach.tsx`,
`homepageCopy.*.reach`, `marketsCopy` and `industriesCopy` are all retained
byte-for-byte; `/industries` and `/markets` are untouched and still publish the
five-name list. Two tests fail loudly if any of that is ever deleted.

# HOMEPAGE POSITION

```
Header
  Hero                              always present
  Price Strip           [conditional]   omitted — PRICE_STRIP_ENABLED not "true"
  Product Showcase      required arch.  data-driven
  Buyer Value           always present
  Verified Evidence     [conditional]   not implemented — deferred (correct)
  Industries/Use Cases  [conditional]   IMPLEMENTED, omitted — no reviewed imagery
  Final CTA             always present
Footer
```

Industries is not wired to Evidence in any way. If Evidence later becomes
eligible and is inserted before Industries, Industries' own component contract
does not change — it neither reads nor imports anything Evidence-related.

# EVIDENCE DEFERRED

**VERIFIED EVIDENCE: DEFERRED BY OWNER FOR NEXT PROJECT PHASE.**

`AHANASSA_VERIFIED_EVIDENCE_DESIGN_AND_ODOO_REQUIREMENTS_V0.9` and
`AHANASSA_EVIDENCE_CONTRACT_AND_CLAUDE_HANDOFF_V1.0` were **not** imported, not
implemented, and not referenced by any code in this phase. No Evidence schema,
migration, metric, threshold or component was created. Industries explicitly
requires none of it — V1.0 §10: "A new Odoo model, 100-record threshold or
evidence pipeline is not required for this component. The Evidence threshold
applies only to Evidence."

# CONTENT OWNERSHIP

Localized editorial content in `homepageCopy[locale].industries`, mirroring the
established per-section pattern of `buyerValue` and `purchaseProcess`. The
interface is exactly `{ title, sectors: { title, body }[] }`.

There is deliberately **no** `eyebrow`, **no** `body` and **no** `cta` field —
not merely empty ones, absent ones, so no future edit can populate them without
reopening the frozen structure. Asserted per locale.

No new Odoo model and no new DB_PUBLIC table was created. Pure editorial
content, identical in kind to Buyer Value.

# FA CONTENT

H2: `تأمین آهن و فولاد برای حوزه کاری شما`

1. `پروژه‌های ساختمانی`
   `آهن‌آلات موردنیاز پروژه را با مشخصات، مقدار و برنامه تحویل اعلام کنید تا گزینه‌های تأمین متناسب بررسی شوند.`
2. `پتروشیمی، نفت و گاز`
   `فهرست اقلام را همراه با گرید، استاندارد و الزامات فنی و مدارک موردنیاز ارسال کنید تا امکان تأمین مطابق درخواست بررسی شود.`
3. `تولید و ساخت`
   `نیاز کارگاه یا خط تولید را با ابعاد، جنس و الزامات ساخت مطرح کنید تا بررسی تأمین بر اساس نیاز مصرف شما انجام شود.`

No eyebrow. No supporting paragraph. No CTA.

# EN CONTENT

H2: `Iron and steel sourcing for your sector`

1. `Construction projects`
   `Share your project’s steel requirements, including specifications, quantities and delivery schedule, so suitable sourcing options can be reviewed.`
2. `Petrochemical, oil and gas`
   `Send your item list with the required grades, standards, technical requirements and documentation so sourcing feasibility can be assessed against your request.`
3. `Manufacturing and fabrication`
   `Describe your workshop or production line requirements, including dimensions, material and fabrication requirements, so sourcing can be reviewed for your intended use.`

Note: item 1 uses the typographic apostrophe U+2019 in `project’s`, exactly as
the freeze document does.

# AR CONTENT

H2: `تأمين الحديد والصلب لقطاع عملك`

1. `مشاريع البناء`
   `أرسل احتياجات المشروع من الحديد والصلب مع المواصفات والكميات وجدول التسليم، لتُدرس خيارات التوريد المناسبة.`
2. `البتروكيماويات والنفط والغاز`
   `أرسل قائمة الأصناف مع درجات المواد والمعايير والمتطلبات الفنية والمستندات المطلوبة، لتُدرس إمكانية التوريد وفقاً لطلبك.`
3. `التصنيع والإنتاج`
   `حدّد احتياجات الورشة أو خط الإنتاج، بما في ذلك الأبعاد ونوع المادة ومتطلبات التصنيع، لتُدرس خيارات التوريد وفقاً للاستخدام المقصود.`

**Verification method.** All 21 strings (3 H2s + 9 titles + 9 bodies) are pinned
in `lib/content/industries-frozen-spec-invariants.test.ts` by parsing the
localized sections out of the imported freeze document at test time and
comparing with `assert.equal`. Nothing is retyped into the test, so the test
cannot drift from its own authority. Independently cross-checked in this session
with a substring scan of the document: 21/21 present.

# ITEM ORDER

**PASS.** DOM order is 1 → 2 → 3 in every locale:

1. Construction projects — پروژه‌های ساختمانی — مشاريع البناء
2. Petrochemical, oil and gas — پتروشیمی، نفت و گاز — البتروكيماويات والنفط والغاز
3. Manufacturing and fabrication — تولید و ساخت — التصنيع والإنتاج

The data array is **never** reversed for RTL (§2: "Do not reverse the data array
and also apply RTL"); CSS logical direction alone handles visual reading order,
exactly as Buyer Value and Purchase Process already do. Asserted three ways: a
positional cross-locale equality check, a source scan forbidding
`.reverse()`/`.sort()`/`toReversed`, and a source scan forbidding
`flex-row-reverse`. The gate additionally rejects a reordered image manifest so
a mispaired photograph can never reach a heading.

# CLAIM SAFETY

These three sectors are the owner's declared **intended service scope**. They
are not proof of past projects, approved-vendor status, certification,
guaranteed availability, guaranteed specification compliance, historical
customer relationships, or sector-specific volume history.

Preserved exactly, and pinned:

- EN item 2 keeps "sourcing feasibility can be **assessed**", never a supply
  guarantee — §10: "No claim that all oil/gas grades or standards can be
  supplied."
- FA item 2 keeps «امکان تأمین مطابق درخواست بررسی شود».
- AR item 2 keeps «لتُدرس إمكانية التوريد».
- Every body in every locale ends on a review verb (بررسی شوند / be reviewed /
  تُدرس).

A narrow, locale-specific scan — not a broad brittle keyword sweep across
unrelated content — asserts the absence of: guarantee/تضمین/ضمان,
certification/گواهی/شهادة, customers/مشتریان/عملائنا, case studies,
leading/پیشرو/رائد, best/بهترین/الأفضل, fastest/سریع‌ترین/الأسرع, years of
experience, approved supplier, vendor list, trusted by, and numeric
project/tonnage/client counts. No customer logo, brand name, certification badge
or trust badge appears in the component.

# CONTENT ELIGIBILITY

All-or-nothing, per §10. Publication requires four things at once:

| # | Requirement | State |
|---|---|---|
| 1 | Approved scope — the exact three frozen sectors, in order | **MET** |
| 2 | Complete accurate copy in the active locale | **MET** (FA/EN/AR) |
| 3 | Reviewed imagery | **NOT MET** |
| 4 | Server-side content enable state | **MET** (mechanism exists; see below) |

Because requirement 3 fails, the section omits itself **entirely**: never one or
two items, never a partial locale, never an empty heading, never a placeholder
shell. `resolveIndustrySectorImages()` returns `null` and the component returns
`null` before the first `<section>` is constructed.

**On requirement 4 — a deliberate design choice worth recording.** The enable
state is content-derived (`INDUSTRY_SECTOR_IMAGES` in `lib/content/industries.ts`),
not a new environment variable. This follows the **Product Showcase**
convention — content/data-derived eligibility that fails closed to complete
omission — rather than the **Price Strip** convention (`PRICE_STRIP_ENABLED`).
Reasoning: a flag would add `wrangler.jsonc` + `worker-configuration.d.ts`
deployment surface that could not change the outcome while requirement 3 is
unmet (the section would still, correctly, be omitted with the flag ON). Filling
in the manifest *is* the deliberate publication act §10 asks for. A future
session may layer a flag on top of this gate without reopening it.

The gate is hardened against partial states. It returns `null` for: fewer or
more than three entries; any `null`, empty or whitespace-only `src`; a reordered
manifest; an absolute `https://` URL; and a protocol-relative `//host` URL.

# IMAGE INVENTORY

A genuine content-level inspection was performed — candidate images were
downscaled and **visually opened**, not merely pattern-matched by filename.

**`public/images/` — 23 files, all inspected.**

| Asset | What it actually depicts | Verdict |
|---|---|---|
| `ops/mill-exterior.png` | Integrated steel mill / blast furnace at night, with stacks and piping | Depicts **steel production**, not petrochemical. Mapping it to "Petrochemical, oil and gas" would misdescribe a steel plant as a petrochemical one — the misleading-media case `MEDIA_GUIDELINES.md` §4.4 forbids. **Rejected.** |
| `ops/warehouse.png` | Steel stockholding warehouse — racking, gantry crane, stored sections and coils | Storage, not fabrication or manufacturing. **Rejected.** |
| `ops/truck-loading.png` | Rebar coils lifted onto a flatbed in a steel yard | Logistics, not a construction project site. **Rejected.** |
| `ops/inspection.png` | Caliper measurement of round bar on pallets in a yard | QC inspection, no sector context. **Rejected.** |
| `ops/port-loading.png` | Night break-bulk vessel loading at a quay | Port logistics. **Rejected.** (Also the incumbent `Reach` image.) |
| `ops/containers.png` | Container terminal at dusk | Shipping logistics. **Rejected.** |
| `hero-steel-mill.png`, `hero-steel-procurement.jpg` | Hero imagery | Excluded by §8 **by name**. **Rejected.** |
| `products/*.png` (13) + `steel-placeholder.svg` | Product packshots — rebar, beams, pipe, sheet/plate, billet, ingot, angle, channel, wire rod, HRC, ferro-silicon, sponge iron | §8: "Do not ... use product-packshot imagery in all three slots". **Rejected.** |

All eight photographs are exactly 1024×1024 — consistent with generative
output — and carry no `kMDItemCreator` metadata.

**`~/Downloads` — all 130 image files inspected**, via two contact sheets plus
individual review of every plausible candidate. Contents: personal identity
documents, third-party mill test certificates (Aqil Pardisan Company), marketing
material belonging to **other companies** (SiPanel, AvizSazeh, CyanSteel),
portraits, engineering drawings and section diagrams, invoices, QR codes,
abstract AI artwork, UI screenshots, and logos.

The only frames resembling industrial context are a pre-engineered steel
building and building-envelope photographs that are **another company's**
marketing assets. Using them would be both a licensing violation and a false
implication of an Ahan Asa project. **Rejected.**

**Media registry.** No image provenance registry exists in this repository.
`lib/catalog/media-registry.ts` is a catalog product-image *resolution* module
(template/group/family → packshot path); it records no licence or source. So no
existing asset can even be classified under `MEDIA_GUIDELINES.md` §"Asset
classes", and that document is unambiguous:

> "Unknown provenance defaults to `restricted`." — and `restricted` media:
> "Allowed use: **None**. Must not be published."

**Conclusion: zero (0) legitimately usable sector images available.**

# IMAGE SOURCES

None imported. No file was copied into `public/images/` and no image was
downloaded, generated or referenced externally in this phase.

Four shortcuts were available and each was deliberately rejected:

1. **Substitute the nearest repository photograph** — would misdescribe a steel
   mill as a petrochemical facility and a warehouse as a fabrication workshop.
2. **Fabricate a licence/provenance record** — absolutely forbidden.
3. **Hotlink a web image** — forbidden by §8 and by the task; the gate now
   rejects external URLs programmatically so this cannot happen by accident.
4. **Ship gradient placeholders** — §8 forbids shipping with missing initial
   assets; a placeholder would misrepresent the component as complete.

**Exact assets a future session must supply** (all three, or the section stays
omitted):

| Manifest slot | Required subject | Explicitly must NOT be |
|---|---|---|
| `construction` | Building site, structural steel erection, or reinforcement context | A steel yard or logistics scene |
| `petrochemical-oil-gas` | Industrial process facility / piping context | A **steel mill** — a different sector |
| `manufacturing-fabrication` | Workshop, steel fabrication, or production line context | A storage warehouse |

Each must be: natural industrial photography; consistent treatment across all
three; restrained saturation; comparable light and contrast; 4:3; verified focal
point; a local `/images/...` path; and accompanied by a retained internal
licence/provenance record. None may be a Hero image, a product packshot, a
collage, an icon illustration, or carry a visible customer logo, and none may be
captioned or described as a real Ahan Asa project.

To publish: add the three paths to `INDUSTRY_SECTOR_IMAGES` in
`lib/content/industries.ts` and update the current-state assertion in
`lib/content/industries-frozen-spec-invariants.test.ts`. No other code change is
required. That test is intentionally the review gate — it fails the moment
assets appear without a deliberate, reviewed update.

# IMAGE LICENSE / PROVENANCE

**GAP.** No asset in this repository carries a recorded licence, source, rights
holder, capture date, consent record or asset class. No media registry exists to
hold one. Nothing was invented to fill that gap, and no provenance claim of any
kind is made by this phase.

# IMAGE MAPPING

Declared but unresolved — the manifest binds an image to a sector by stable
identity, not by array position alone:

```
construction               -> null   (no approved asset)
petrochemical-oil-gas      -> null   (no approved asset)
manufacturing-fabrication  -> null   (no approved asset)
```

`resolveIndustrySectorImages()` verifies that entry *i*'s `sector` equals
`INDUSTRY_SECTORS[i]` before returning, so a reordered manifest disables the
section rather than silently pairing the petrochemical photograph with the
construction heading.

# IMAGE FAILURE BEHAVIOR

Written and compiled, exercised once assets land:

- **Geometry stays stable.** `aspect-4/3` on the wrapper reserves the box before
  loading. Compiled: `.aspect-4\/3{aspect-ratio:4/3}`. No CLS.
- **Quiet neutral fallback.** The wrapper carries `bg-surface-2` →
  `--aa-color-bg-muted` → `--aa-color-neutral-100`, which remains visible if the
  request fails.
- **No broken-image icon.** `alt=""` means a failed image renders nothing at
  all, rather than alt text plus a broken-image glyph.
- **No technical error text** is exposed to the customer.
- **Text survives.** The `<h3>` and `<p>` are siblings of the image wrapper, not
  children — a failed image cannot hide its item, and one failure can never hide
  the section.

Per §8 this fallback covers **runtime** failure only. It is not, and was not
used as, a substitute for selecting assets.

# VISUAL SYSTEM

Content Section archetype (Visual System §6.2):

| Aspect | Implementation |
|---|---|
| Background | White `#FFFFFF` via `bg-background` — the token Product Showcase already uses |
| Container | shared `container-x` |
| H2 / H3 | `text-navy` (Steel Navy `#0B2545`) |
| Body | `text-muted-foreground` — the contrast-checked Navy-derived token |
| Copper | **not used** — §6 makes it optional and restrained; with no eyebrow and no index markers there is no restrained place for it |
| Outer floating card | none |
| Filled item cards | none — no `<li>` carries a background |
| Shadows | none |
| Hero engineering grid | none |
| Heavy overlays | none |
| Radius | exactly one — `rounded-xl` on the image, compiled to `--radius-xl: .75rem` = **12px**, matching §8 |
| Font | inherited global Estedad Variable; no new font, and no tracking utility anywhere |

**Buyer Value boundary.** Buyer Value (immediately before) is Warm Cream
`--aa-color-bg-warm`; Industries is White. A real but calm transition, achieved
**without altering Buyer Value** — that file was not touched.

**Final CTA boundary.** `CtaBand` follows on `bg-navy-800`. White → Navy is a
deliberate light-to-dark transition, not a dark-to-dark collision. Industries
carries the same single quiet `border-b` hairline every sibling section uses,
and its own bottom padding is the only bottom spacing, so no double margin is
created. Final CTA was not redesigned — the only change to the page was the
composition wiring.

**Spacing**, all from the shared scale (`--spacing: .25rem`), verified in the
compiled stylesheet:

| Gap | Class | Computed | §6 target |
|---|---|---|---|
| Section vertical | `py-20 lg:py-28` | 80 / 112px | 96–120px desktop ✓ |
| H2 → group | `mt-9 lg:mt-12` | 36 / 48px | 32–48px ✓ |
| Image → H3 | `mt-5` | 20px | 16–20px ✓ |
| H3 → body | `mt-3` | 12px | 10–14px ✓ |
| Column gap | `lg:gap-8` | 32px | 24–32px ✓ |
| Item gap (narrow) | `gap-10` | 40px | 32–40px ✓ |

**Recorded exception.** Mobile section padding is 80px where §6 targets 56–72px.
The shared value is used deliberately because Visual System §13 requires all
major Homepage sections share one rhythm, and every neighbouring section uses
exactly `py-20 lg:py-28`; a component-specific mobile value would be the visible
inconsistency Visual System §21.12 treats as a failure. This is the identical
exception `buyer-value.tsx` already records.

# DESKTOP

Three equal columns from `lg` (1024px), §7's own initial implementation
breakpoint, retained after a content-fit check.

**Arithmetic** (documented in the component as computed, not measured): at
1024px, `container-x` = 1024 − 2 × 32px gutter = 960px; three tracks with two
32px gaps give (960 − 64) / 3 ≈ **298px** per column. The longest approved body
is the Arabic petrochemical string at ~150 characters; at 14px Estedad (~7px
average advance for Arabic, ~6.6px for Latin) a 298px measure carries ~42 Arabic
/ ~45 Latin characters per line — roughly four lines for the longest body in
each locale. The longest H3 ("Manufacturing and fabrication", 30 characters)
fits in two lines at 18px. Comfortable, and inside §7's "avoid narrow/tall text
columns".

Each item is **Image → H3 → Paragraph**, never overlaid — asserted by source
index ordering plus a scan forbidding `absolute inset-0 z-*` and gradient
overlays.

# MOBILE

Below `lg`: one column with the same Image → H3 → Paragraph order and the same
1 → 2 → 3 sequence. No `grid-cols-*` utility applies below `lg`, so the grid
falls back to its single implicit column. Standard page gutters via `container-x`;
40px between items. No carousel, no horizontal scroll, no swipe.

# NO 2-COLUMN STATE

**ABSENT — structurally, not merely untested.**

The component declares exactly **one** column-track utility, `lg:grid-cols-3`.
A regex sweep of the file collects every `grid-cols-*` occurrence and asserts the
result is exactly `["lg:grid-cols-3"]`, so no width can produce two or four
tracks. A second assertion independently forbids `grid-cols-2`, `sm:grid-cols-2`
and `md:grid-cols-2` anywhere in the file.

Compiled rule (`dist/client/_next/static/css/index.CRlXjWGz.css`):

```css
.lg\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
@media (min-width:64rem)   /* = 1024px */
```

The `minmax(0, …)` floor is what structurally prevents a long unbroken token
from forcing a track wider than its share and producing horizontal scroll.

Note: `.grid-cols-2`, `.sm\:grid-cols-2` and `.md\:grid-cols-2` **do** exist in
the compiled stylesheet — they belong to other components (Buyer Value's 2×2
grid, the retained Reach tiles). None is referenced by Industries, which is the
correct scope for this claim and exactly what the source-level assertion checks.

Also absent: `overflow-x`, `snap-x`, `snap-mandatory`, `carousel`, `Swiper`,
`embla`, `scrollLeft`, `flex-nowrap`.

# SEMANTICS

```html
<section aria-labelledby="home-industries-heading">
  <h2 id="home-industries-heading">…</h2>
  <ul role="list">
    <li> <div><Image alt=""/></div> <h3>…</h3> <p>…</p> </li>   ×3
  </ul>
</section>
```

- Exactly one `<section>`, one `<h2>`, one `<ul>`. No `<h1>` — that belongs to
  the Hero.
- **`<ul>`, never `<ol>`** (§9). Sectors carry no ranking or chronology. This is
  the exact inverse of `process.tsx`, whose `<ol>` carries real chronology, and
  matches `buyer-value.tsx`. `role="list"` is written out because Tailwind
  Preflight sets `list-style: none`, which drops native list semantics in
  Safari/VoiceOver.
- **No visible numbering** (§9) — unlike Buyer Value and Purchase Process, which
  both carry decorative 01–04 indexes. No index helper module was created, and
  `list-decimal`/`counter-increment`/`counter-reset` are all absent.
- One `<h3>` and one `<p>` per item.

# RTL / LTR

One shared, direction-aware component. FA/AR render RTL, EN renders LTR, from
identical markup — no mirrored variant, no per-locale component.

Every axis-sensitive utility is logical. A regex sweep asserts the complete
absence of `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `border-l-*`,
`border-r-*`, `text-left` and `text-right` (including responsive variants).

DOM data order is 1 → 2 → 3 in all three locales; the array is never reversed.
No truncation (`truncate`, `line-clamp`, `text-ellipsis`, `whitespace-nowrap`
all absent), no fixed heights (`h-[`, `max-h-` absent), no `<br>`, and no
tracking utility on any text — §6: "No artificial tracking for FA/AR."

# INTERACTION

**None.** Purely informational, per §9.

Asserted absent: `<Link`, `<a `, `<button`, `<Button`, `href=`, `onClick`,
`cursor-pointer`, `hover:`, `group-hover:`, `tabIndex`, `role="button"`. No
accordion, tabs or carousel. No sector route was invented, and the three items
are not all pointed at `/request` or any other generic page — a route-literal
scan of the JSX body confirms it.

Consequently the section introduces **no keyboard focus stop**, which is correct
for non-interactive content.

# MOTION

**None.** The simplest compliant static implementation, matching what
`buyer-value.tsx` and `process.tsx` already chose. `Reveal` is not used and
`components/ui/reveal.tsx` was not modified.

Asserted absent: `"use client"`, `<Reveal`, `useEffect`, `useState`,
`IntersectionObserver`, `opacity-0`, `animate-`.

Result: the SSR render, the JS-disabled render, the failed-hydration render and
the `prefers-reduced-motion` render are the same bytes. This is strictly
stronger than reusing the shared Reveal. No image zoom, no stagger implying
sequence, no process connector, and no animation prerequisite for visibility.

# SSR

**SOURCE-SSR STRUCTURAL PROOF — PASS.**

Fresh `vinext dev` server on `localhost:3001`, fetched with `curl`:

| Locale | HTTP | Bytes | `home-industries-heading` | Frozen H2 present |
|---|---|---|---|---|
| fa | 200 (via 308 redirect) | 155,457 | 0 | 0 |
| en | 200 | 153,090 | 0 | 0 |
| ar | 200 | 155,598 | 0 | 0 |

Correctly and completely absent in all three locales, as Result B requires.

Sections present in the server-rendered HTML — **exactly three, identical in all
three locales**:

```
[0] <section class="bg-navy relative isolate overflow-hidden">                       Hero
[1] <section aria-labelledby="home-buyer-value-heading" class="… bg-[var(--aa-color-bg-warm)] py-20 lg:py-28">   Buyer Value
[2] <section class="bg-navy-800 relative isolate overflow-hidden">                   Final CTA
```

- Buyer Value is immediately followed by the Final CTA — **no gap, no
  placeholder, no empty band**.
- `<section>` tags between the Buyer Value heading and the CTA: **1** (Buyer
  Value's own closing structure). No extra shell survives the omission.
- Empty `<h2></h2>` anywhere on the page: **false**.
- `port-loading` (the retired Reach image): **absent** — confirming Reach no
  longer renders.
- Price Strip omitted (`PRICE_STRIP_ENABLED` not `"true"`) and Product Showcase
  omitted (no local D1 projection data) — both pre-existing, expected local
  states, unchanged by this phase.
- **Final CTA still present: YES**, in all three locales.

# JS-OFF

**SOURCE-SSR STRUCTURAL PROOF / NOT RUN as a browser test.**

No browser JavaScript-disabled test was executed — curl is not a JS-disable test
and is not reported as one. What *is* proven: the component contains no
`"use client"` directive, no hooks, no `IntersectionObserver` and no
`opacity-0`/`animate-` resting state, so its server-rendered output is its only
output and cannot depend on hydration. When assets land and the section renders,
that markup will be in the SSR HTML by construction. A real JS-off browser check
belongs to the publication phase, alongside §11's locale sweep.

# RESPONSIVE MATRIX

| Width | Columns | Method |
|---|---|---|
| < 1024px | 1 | STATIC-COMPILED-CSS VERIFIED — no `grid-cols-*` applies below `lg`; grid falls back to one implicit column |
| ≥ 1024px | 3 | STATIC-COMPILED-CSS VERIFIED — `.lg\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}` inside `@media (min-width:64rem)` |
| any | never 2 | SOURCE STRUCTURAL PROOF — exactly one `grid-cols-*` utility exists in the file |
| any | no horizontal scroll | STATIC-COMPILED-CSS VERIFIED — `minmax(0,1fr)` floor; no `overflow-x` utility |

Rendered-pixel confirmation at 375 / 768 / 1024 / 1440px in FA/EN/AR is **NOT
RUN** — the section does not render, so there is nothing to measure. It is
required by §11's acceptance checklist at publication time.

# ZOOM / REFLOW

**NOT RUN** — nothing renders to zoom. By construction, the layout is
width-driven with no fixed heights and no truncation, so a 200% zoom produces
earlier single-column reflow, which §7 explicitly permits. No text is hidden and
the third item never moves before the second. To be confirmed with the live
locale sweep at publication.

# ACCESSIBILITY

Verified at source level:

- `<section aria-labelledby>` → `<h2 id>` association.
- Correct heading hierarchy: one page `<h1>` (Hero), `<h2>` here, `<h3>` per
  item. No level is skipped, and an omission cannot create a heading-level jump
  because the omission drops the whole section.
- One semantic list with `role="list"` preserved against Preflight.
- Decorative images with `alt=""`; no keyword stuffing.
- No focus stop introduced for non-interactive content.
- Body text uses the contrast-checked `text-muted-foreground` token on White;
  headings use Steel Navy.
- No hidden crawler-only or agent-only layer: `<noscript>`,
  `dangerouslySetInnerHTML`, `display:none`, `visibility:hidden`,
  `text-indent:-` and `sr-only` are all asserted absent.

Contrast measurement and a screen-reader pass are **NOT RUN** — deferred to
publication, when there is rendered output to test.

# PERFORMANCE

- Existing `next/image` pipeline only; **no new image library** was added.
- 4:3 geometry reserved before load → **no CLS**.
- Responsive `sizes="(min-width: 1024px) 31vw, 100vw"`, matching the 3-column
  desktop architecture.
- **No `priority`** — the section is below the fold and `next/image` lazy-loads
  by default.
- Zero client JavaScript contributed by this section.
- Zero I/O: no database read, no network call, no Odoo call. The section cannot
  slow, block or fail the Homepage render.

# HOMEPAGE COMPOSITION

`app/[locale]/page.tsx` now renders:

```
Hero → PriceStrip [conditional] → ProductShowcase → BuyerValue
     → Industries [conditional] → CtaBand
```

- `<Reach>` render and its `@/components/home/reach` import removed.
- `<Industries locale={locale} />` added between `<BuyerValue>` and `<CtaBand>`.
- The page's doc comment updated to record the new slot occupant, the reason
  Industries is currently omitted, and Reach's supersession.
- Relative order asserted: ProductShowcase < BuyerValue < Industries < CtaBand.
- Evidence absence creates no gap (it has no component at all).
- With Industries disabled, Buyer Value directly precedes the Final CTA with no
  shell — verified in the SSR output above.
- Conditional sections still fail independently; Industries imports nothing that
  any sibling reads, so it can neither suppress nor be suppressed by one.

# FILES CREATED

| File | Purpose |
|---|---|
| `docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md` | The imported frozen authority (byte-identical) |
| `components/home/industries.tsx` | The component (249 lines) |
| `lib/content/industries.ts` | Publication gate + image manifest (171 lines) |
| `lib/content/industries-frozen-spec-invariants.test.ts` | 41 component invariants (461 lines) |
| `docs/industries/INDUSTRIES_P1_V1_0_IMPLEMENTATION_REPORT.md` | This report |

# FILES MODIFIED

| File | Change |
|---|---|
| `app/[locale]/page.tsx` | Reach → Industries composition wiring + doc comment |
| `lib/content/homepage.ts` | `industries` interface field + FA/EN/AR content; `reach` marked superseded-for-Homepage in its doc comment (content untouched) |
| `lib/content/homepage-composition-invariants.test.ts` | Industries slot occupant updated; Reach supersession assertions added |
| `lib/content/purchase-process-frozen-spec-invariants.test.ts` | Tail-order test updated to the new slot occupant (its own subject unchanged) |
| `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` | Industries authority registered; Reach entry added; eligibility table updated; new §5.2 image gate |

# FILES REMOVED

**None.** Nothing was deleted in this phase.

Specifically retained and untouched: `components/home/reach.tsx`,
`homepageCopy.*.reach`, `marketsCopy`, `industriesCopy`, `lib/content/pages.ts`,
`app/[locale]/industries/`, `app/[locale]/markets/`,
`public/images/ops/port-loading.png`, and every other image asset.

# RUNTIME COMMIT

`4d570f3` — `feat(home): implement Industries Use Cases V1.0`

```
 app/[locale]/page.tsx                                |  34 +-
 components/home/industries.tsx                       | 249 +++++++++++
 lib/content/homepage-composition-invariants.test.ts  |  85 +++-
 lib/content/homepage.ts                              | 107 +++++
 lib/content/industries-frozen-spec-invariants.test.ts| 461 +++++++++++++++++++++
 lib/content/industries.ts                            | 171 ++++++++
 lib/content/purchase-process-frozen-spec-invariants.test.ts | 14 +-
 7 files changed, 1088 insertions(+), 33 deletions(-)
```

# GOVERNANCE COMMIT

`1d2d29b` — `docs: register Industries Use Cases V1.0`
(one file: `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md`)

# FOCUSED TESTS

`lib/content/industries-frozen-spec-invariants.test.ts` — **41 tests, 41 pass,
0 fail.**

Coverage: spec presence and self-consistency; frozen sector order; per-locale H2
and all three title/body pairs pinned against the imported document; absence of
eyebrow/body/cta fields; cross-locale positional order and no-reversal; the
qualified sourcing-feasibility wording; claim-safety scans; no logo or badge;
section/h2/ul/li/h3/p structure; `<ul>` not `<ol>`; no visible numbering; no
link, button, CTA or hover affordance; no motion or client boundary; the
three-column/one-column architecture with no 2-column state; no carousel or
horizontal scroll; no truncation, fixed height or tracking; logical-properties-
only RTL; White Content Section surface; no card/shadow/Hero grid; Navy and
muted tokens; shared spacing scale; 4:3 geometry, cover fit, 12px radius, lazy
loading, responsive sizes; `alt=""`; no external host, Hero reuse or packshot
reuse; copy-completeness gate; the current no-imagery state; whole-section
omission before any markup; all-or-nothing gate hardening (partial, reordered,
blank, absolute-URL, protocol-relative); zero Odoo/DB_PUBLIC/Evidence/
projection/client-fetch dependency via a pinned import list; gate purity; no
hidden content layer; and Reach retention.

`lib/content/homepage-composition-invariants.test.ts` — **37 tests, 37 pass**
(was 35; +2 for the Reach supersession and the Industries slot).

# FULL TESTS

```
npm test
ℹ tests 1169
ℹ pass  1169
ℹ fail  0
```

Baseline was 1126 passing. **+43 net new tests, zero regressions.**

Two pre-existing tests referenced the Industries slot by its former occupant and
were updated to name the new one — a factual update to match the deliberate
composition change, not a weakening: the Purchase Process test additionally
gained an assertion that Purchase Process must not reappear in the Homepage
tail, and the composition test gained explicit Reach-supersession and
Reach-retention assertions.

# TSC

```
npx tsc --noEmit
(no output, exit 0)
```

**0 errors.**

# BUILD

```
npm run build
✓ 228 modules transformed
Build complete.
```

Clean. All 11 routes built. `tsconfig.tsbuildinfo` was touched by the build and
restored with `git restore` before committing, so it is not part of any commit.

No separate lint script exists in `package.json` (scripts are `dev`, `build`,
`start`, `deploy`, `preview`, `cf-typegen`, `test`), so no separate lint command
was run.

# MIGRATION STATUS

`migrations_public/0010_homepage_eligibility.sql` — **PENDING remote
application.** Untouched by this phase, as required.

Industries has **zero** database dependency, so it neither needs nor interacts
with this migration. No migration was created, edited, executed, or marked
applied anywhere, locally or remotely.

# PRODUCTION SAFETY

Explicitly **not** done in this phase:

- No `git push`. No deploy. No `wrangler deploy`.
- No remote migration, and nothing marked as applied.
- No Odoo change of any kind; no Odoo model, field or endpoint touched.
- No DB_PUBLIC schema change; no new table.
- No secret fetched, read or written.
- No WAF, DNS or Cloudflare configuration change.
- No new dependency, image library or font added.
- Header, Hero, Price Strip, Product Showcase and Buyer Value not modified.
- Final CTA not redesigned — touched only by the composition wiring.
- Footer not touched.
- Evaluation / Assurance and Purchase Process not reintroduced.
- Verified Evidence not implemented; its documents not even imported.
- `01-sources/`, `logo/` and `design-reference/` not modified.
- No file deleted.
- No write-isolation guard, permission prompt or tool safety refusal was
  encountered, and none was bypassed. All edits used Edit/Write directly.

# REMAINING RISKS

1. **The image gap is the only blocker.** Until three reviewed, provenanced
   assets exist, the Homepage has no Industries section. This is a content-
   supply task, not an engineering one. *Mitigated:* exact requirements recorded
   here and in the supersession register §5.2; publishing is a one-file change.
2. **No media provenance registry exists.** `MEDIA_GUIDELINES.md` specifies one;
   the repository has none, and the eight existing operational photographs are
   unclassified and therefore technically `restricted`. This pre-dates and
   exceeds this phase's scope, but it will block Industries publication and is
   worth authoring before assets are selected. **Recommended follow-up.**
3. **Layout arithmetic is computed, not measured.** The 298px column width and
   line-count estimates come from container/gutter/gap arithmetic and character
   counts, not a rendered browser — live-browser verification was BLOCKED (no
   Chrome extension connected). Overflow is structurally guaranteed by
   `minmax(0,1fr)`; line counts are not. §11's locale sweep must confirm them at
   publication and may move the 1024px breakpoint. Nothing else depends on the
   exact value.
4. **The `lg` breakpoint is provisional**, as §7 itself frames it ("use 1024px
   as the initial implementation breakpoint and verify actual content fit").
5. **Locale-fallback behaviour is strict by design.** A future partially
   translated locale omits the section entirely rather than falling back to
   another language. Correct per §10, but worth knowing before adding a locale.

# READY FOR FINAL FREEZE

**YES, for the code and content contract. NO, for publication.**

Ready now: sector scope and order, all FA/EN/AR copy, semantics, layout
architecture, interaction and motion policy, claim safety, the publication gate,
Homepage composition, and 43 invariant tests — all frozen and enforced.

Outstanding before public enablement:

1. Three reviewed, provenanced sector images (IMAGE SOURCES above).
2. A provenance/licence record for them — ideally the media registry
   `MEDIA_GUIDELINES.md` specifies.
3. §11's live acceptance sweep once the section renders: desktop/mobile
   screenshots in FA/EN/AR, tablet, image-failure, 200% zoom, contrast, and a
   JS-disabled check.

**READY FOR IND-P2 FREEZE: YES** — IND-P2 is the image-supply and live-
verification phase, and this phase leaves it a clean, single-file entry point.
