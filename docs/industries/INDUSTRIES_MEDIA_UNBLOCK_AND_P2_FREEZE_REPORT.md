# INDUSTRIES MEDIA UNBLOCK — IMPLEMENTATION REPORT

**Date:** 2026-09-12
**Branch:** `worktree-industries-media-unblock`
**Base:** `c68cdca` (tip of `feat/header-hero-integrated` at the IND-P1 report commit)

```
INDUSTRIES MEDIA GATE: OPEN
IMAGES IMPORTED: 3
PROVENANCE: OWNER-PROVIDED
REGISTRY CREATED: YES
REGISTRY ENTRIES: 3
SECTOR MAPPING: PASS
COPY UNCHANGED: PASS
LAYOUT UNCHANGED: PASS
SEMANTICS UNCHANGED: PASS
ALT POLICY: PASS
4:3 GEOMETRY: PASS
OBJECT-FIT COVER: PASS
HERO IMAGE REUSE: ABSENT
EXTERNAL HOTLINK: ABSENT
CUSTOMER/PROJECT ATTRIBUTION: ABSENT
INDUSTRIES NOW RENDERS: YES
SSR: PASS
IMAGE HTTP STATUS: 3x200
FULL TESTS: 1185 pass / 0 fail (baseline 1169 pass / 0 fail)
TSC: PASS
BUILD: PASS
READY FOR FINAL FREEZE: YES
```

---

# RESULT

The Industries / Use Cases section, implemented but deliberately disabled in
IND-P1, now publishes. Three owner-approved sector images were imported, given
the repository's first media-provenance records, and bound to the three frozen
sector slots. The all-or-nothing §10 gate flipped from closed to open, and the
section renders server-side in fa, en and ar.

`components/home/industries.tsx` required **ZERO** changes — it was already
written to consume `resolveIndustrySectorImages()`. No copy, layout, semantics
or markup changed anywhere.

The honest headline: **IND-P1 was not blocked by a shortage of pictures. It was
blocked by the absence of any provenance record at all.** `MEDIA_GUIDELINES.md`
§5 states "Unknown provenance defaults to `restricted`", and `restricted` media
"Must not be published" — which made every image in this repository
unpublishable into that section regardless of what it depicted. Building the
§27 registry is therefore the change that legitimately opened the gate; the
images alone could not have.

---

# PREFLIGHT

Read in full before any code was written:

- `01-sources/MEDIA_GUIDELINES.md` — §5 (truth/approval classes), §9 (ratios),
  §10 (formats), §11 (performance budget), §12 (framework image
  implementation), §25 (file naming), §26 (repository organization), §27 (media
  registry), §28 (rights/consent/privacy), §29 (AI/synthetic media), §32
  (lifecycle), §33 (Claude Code implementation rules).
- `docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md` —
  whole document, §8 (image requirements) and §10 (eligibility) in detail.
- `docs/industries/INDUSTRIES_P1_V1_0_IMPLEMENTATION_REPORT.md` — IMAGE
  INVENTORY and the recorded rejections.
- `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` §5 and §5.2.
- `CLAUDE.md` and `01-sources/CLAUDE.md` (§21 media/brand rules, §31 binding
  override summary: `AI_IMAGES_ALLOWED = true`, `LICENSED_MEDIA_ALLOWED = true`).
- Current code: `lib/content/industries.ts`, `components/home/industries.tsx`,
  `lib/content/industries-frozen-spec-invariants.test.ts`,
  `lib/content/homepage-composition-invariants.test.ts`,
  `lib/catalog/media-registry.ts`, `public/images/` tree, `next.config.ts`,
  `wrangler.jsonc` image binding, `package.json` scripts.

Worktree sanity re-check: HEAD `c68cdca`, branch
`worktree-industries-media-unblock`, `git status --short` clean.

---

# BASE SHA

```
c68cdca51c6a3bf6009f5aab27a49d5235af00e7
```

Confirmed as starting HEAD; working tree clean at start.

---

# IMAGE INVENTORY (BEFORE)

`INDUSTRY_SECTOR_IMAGES` held three `null`s:

```ts
[ { sector: "construction",              src: null },
  { sector: "petrochemical-oil-gas",     src: null },
  { sector: "manufacturing-fabrication", src: null } ]
```

`public/images/` contained 22 files (2 hero, 6 `ops/`, 13 `products/` plus one
placeholder SVG). Every one had already been inspected and rejected in IND-P1 —
steel-mill/logistics/QC/storage subjects, product packshots, or Hero imagery
excluded by §8 by name. None carried recorded provenance. No provenance registry
existed anywhere in the repository.

---

# IMAGE SOURCE FILES DISCOVERED

Re-ran the search independently. Exactly one candidate per requested prefix, no
ambiguity, nothing to disambiguate:

| Original file | Bytes | Dimensions | SHA-256 |
|---|---:|---|---|
| `~/Downloads/picp-building.png` | 2,457,522 | 1448×1086 | `d43b99d699469f74c3067ab81b4b485517c38068d178e9001f2ebcde6d7deaba` |
| `~/Downloads/pic-oil.png` | 2,481,992 | 1448×1086 | `1bf7de5c1fcc58763b091f469f6f118df34454d6ce3c3db52ad20232bccf6390` |
| `~/Downloads/pic-work.png` | 2,495,416 | 1448×1086 | `2c4329a597557d036defd8d5b13df2f9db01b3c046d1854d0d23a25699bb23d7` |

All three hashes independently recomputed and **match** the values supplied by
the parent session. All are sRGB PNG, 72 dpi, and carry **no** camera model, no
creator, no GPS and no capture EXIF (`kMDItemCreator`, `kMDItemLatitude`,
`kMDItemLongitude`, `kMDItemAcquisitionModel` all null) — so §28.3's
GPS/EXIF-stripping requirement is satisfied by the sources as delivered.

1448 × 1086 is **exactly** 4:3 (1448 × 3 = 4344 = 1086 × 4).

---

# IMAGE CONTENT VERIFICATION

Each file was **opened and viewed at full size**, not matched by filename.

| File | What it actually depicts | §8 slot | Verdict |
|---|---|---|---|
| `picp-building.png` | Multi-storey steel-frame building under construction: grey structural columns and beams, cross-bracing, poured floor slabs, bundled rebar and stock I-beams in the foreground, two workers in hard hats, urban/mountain backdrop | 1 — "a building site, structural steel erection or reinforcement context" | **Accepted** |
| `pic-oil.png` | Industrial process facility: long elevated pipe racks running to camera, two distillation/process towers with access ladders and platforms, valves and vessels at grade, open desert setting | 2 — "a relevant industrial facility and piping context" | **Accepted.** Critically **not** a steel mill, so it does not repeat the misdescription that disqualified `ops/mill-exterior.png` |
| `pic-work.png` | Metal fabrication workshop: radial drill press boring a steel I-beam clamped on its table, swarf on the flange, benches and structural steel stock behind, one worker at a bench in the background | 3 — "a workshop, steel fabrication or production context" | **Accepted.** A fabrication workshop, **not** storage — avoiding the reason `ops/warehouse.png` was rejected |

§29 artifact review (required because the truth class is `conceptual`): checked
all three for fake text, false branding, unsafe equipment, impossible
structures, distorted PPE, incorrect steel geometry and misleading scale. **No
legible text, no readable branding and no customer logo appears in any of the
three.** Steel geometry, PPE and scale are plausible throughout. The only text
anywhere is an illegible smudge on a foreground beam in the construction image —
not readable as any mark or brand.

Treatment is consistent across all three: natural industrial photography look,
restrained saturation, comparable daylight and contrast — satisfying §8's
consistency requirement.

---

# IMAGE IMPORT

Copied with `cp` (never moved, never deleted) into `public/images/industries/`,
following the established `public/images/<category>/<name>.<ext>` convention
already used by `ops/` and `products/`.

On `MEDIA_GUIDELINES.md` §26's conceptual `public/media/images/...` tree: §26
itself says "If the existing repository uses a different established structure,
map these roles into it instead of creating a parallel asset system." This repo
has an established `public/images/<category>/` structure, so a new
`public/media/` tree would have been exactly the parallel system §26 forbids.

Filenames follow §25 (lowercase Latin, hyphenated, subject-descriptive, no
`final`/`new` suffixes) and match the repo's existing two-word `ops/` style.

| Original | Canonical repo path | Bytes | SHA-256 |
|---|---|---:|---|
| `picp-building.png` | `public/images/industries/construction-site.png` | 2,457,522 | `d43b99d6…6d7deaba` |
| `pic-oil.png` | `public/images/industries/petrochemical-facility.png` | 2,481,992 | `1bf7de5c…bccf6390` |
| `pic-work.png` | `public/images/industries/fabrication-workshop.png` | 2,495,416 | `2c4329a5…5699bb23d7` |

Imported copies are **byte-identical** to the sources (hashes verified after
copy). The three `~/Downloads` originals remain present and unchanged.

**Format/size note, honestly stated.** These are 2.4–2.5 MB PNGs, matching the
repo's existing convention (its 21 other photographs are 1.4–2.7 MB PNGs).
§10.1 prefers "AVIF through the framework image pipeline" for photography, and
§11 budgets a card image at ≤80 KB. Both are satisfied *at delivery*, which is
what §11 measures ("Budgets apply to the resource selected for the user's
viewport, not only to the largest source file"): `next/image` re-encodes these
at request time, and the measured delivered resource is **66–73 KB JPEG** at
`w=640` (see IMAGE HTTP VERIFICATION). Pre-converting the stored masters to
AVIF was rejected as out of scope — it would diverge from the convention all 21
existing assets follow, and is a repo-wide media-pipeline decision, not an
Industries one.

---

# MEDIA PROVENANCE REGISTRY

**Created: `lib/media/provenance-registry.ts`** — the repository's first
implementation of `MEDIA_GUIDELINES.md` §27 ("Media Registry").

**Placement.** `lib/<domain>/` matches the repo's established layout
(`lib/catalog/`, `lib/content/`, `lib/rfq/`, …). §26's literal
`content/media/media-registry.ts` path was not used because no `content/`
top-level directory exists in this repository; §27 explicitly permits an
equivalent information model in TypeScript.

**Why not extend `lib/catalog/media-registry.ts`.** That module already exists
but answers a different question — *which* packshot to show for a given Odoo
product classification (template/group/family → path). It records no source,
licence, rights holder, truth class or approval, as its own header states. §26
forbids a parallel *asset system*, not a second *concern*: the new file owns
PROVENANCE (may an asset be published at all, and on what basis), the existing
one owns RESOLUTION (which asset to pick). They are deliberately not merged, and
this change does not touch catalog media. The naming avoids collision.

**Scope.** Deliberately narrow: the three new assets only. The ~21 pre-existing
images are **not** backfilled — inventing provenance for assets whose origin
nobody recorded would be precisely the fabrication §5 and §33 forbid, and a
retroactive audit is a separate, owner-involving task. Their absence from the
registry is the honest state and does **not** retroactively bless them. The
schema is shaped so they can be added later without changing any consumer.

---

# REGISTRY SCHEMA

```ts
export type MediaTruthClass = "verified-evidence" | "verified-context" | "licensed-stock" | "conceptual" | "restricted";
export type MediaRightsStatus = "owned" | "licensed" | "permission" | "restricted";
export type MediaApprovalStatus = "draft" | "approved" | "rejected" | "expired";
export type MediaProvenance = "owner-provided" | "licensed-stock" | "commissioned" | "captured-in-house" | "unknown";
export type MediaPurpose = "evidence" | "explanation" | "context" | "humanization" | "navigation" | "brand";

export interface MediaProvenanceRecord {
  readonly id: string;
  readonly type: "image" | "video" | "logo" | "icon" | "diagram" | "document";
  readonly src: string;                       // canonical public path, always local
  readonly originalFilename: string;          // the owner's filename, for two-way audit
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: string;
  readonly provenance: MediaProvenance;
  readonly sourceOwner: string;
  readonly rightsStatus: MediaRightsStatus;
  readonly attributionRequired: boolean;      // §28.1 explicit record
  readonly truthClass: MediaTruthClass;
  readonly purpose: MediaPurpose;
  readonly approvedUse: string;
  readonly industrySector?: IndustrySector;   // Industries placement only
  readonly notAhanAsaProjectEvidence: boolean; // explicit machine-checkable flag
  readonly decorative: boolean;
  readonly approvalStatus: MediaApprovalStatus;
  readonly approvedAt: string;                // ISO date
  readonly notes: string;
}
```

Mapped from §27's reference schema: `id`, `type`, `src`, `width`, `height`,
`aspectRatio`, `purpose`, `truthClass`, `sourceOwner`, `rightsStatus`,
`approvalStatus`, `approvedAt`, `notes` are carried through verbatim. Dropped as
inapplicable to three decorative stills: `locale` (all shared), `alt`/`caption`
(empty by §8), `focalPoint` (native 4:3, nothing to bias), `poster`, `captions`,
`transcript`, `consentReference` (no identifiable person is the subject),
`expiresAt` (no licence term). Added: `originalFilename`, `provenance`,
`attributionRequired`, `approvedUse`, `industrySector`,
`notAhanAsaProjectEvidence`, `decorative` — the fields this task requires.

**Enforcement functions.** §5's rule is enforced in code, not trusted to
reviewers:

```ts
export function effectiveTruthClass(record: MediaProvenanceRecord): MediaTruthClass {
  if (record.provenance === "unknown") return "restricted";
  if (record.rightsStatus === "restricted") return "restricted";
  if (record.approvalStatus !== "approved") return "restricted";
  return record.truthClass;
}
export function isPublishable(record: MediaProvenanceRecord): boolean {
  return effectiveTruthClass(record) !== "restricted";
}
export function findMediaRecord(src: string): MediaProvenanceRecord | null;
export function findIndustrySectorMedia(sector: IndustrySector): MediaProvenanceRecord | null;
```

A record therefore **cannot** declare itself publishable by writing a friendlier
value into `truthClass`: unknown provenance or a non-approved status wins.
`findIndustrySectorMedia` returns `null` for an unpublishable record, so a
`restricted` asset's path can never be obtained through it (§27: "`restricted`
assets must never resolve to a public URL").

---

# REGISTRY ENTRIES

All three share: `type: "image"`, `provenance: "owner-provided"`,
`sourceOwner: "Cyan Sanat Iranian Co. LTD (project owner)"`,
`rightsStatus: "owned"`, `attributionRequired: false`,
`truthClass: "conceptual"`, `purpose: "context"`,
`approvedUse: "Homepage Industries / Use Cases"`,
`notAhanAsaProjectEvidence: true`, `decorative: true`,
`approvalStatus: "approved"`, `approvedAt: "2026-09-12"`,
`width: 1448`, `height: 1086`, `aspectRatio: "4:3"`.

| `id` | `src` | `originalFilename` | `industrySector` |
|---|---|---|---|
| `industries-construction-site` | `/images/industries/construction-site.png` | `picp-building.png` | `construction` |
| `industries-petrochemical-facility` | `/images/industries/petrochemical-facility.png` | `pic-oil.png` | `petrochemical-oil-gas` |
| `industries-fabrication-workshop` | `/images/industries/fabrication-workshop.png` | `pic-work.png` | `manufacturing-fabrication` |

Each `notes` field records what the asset actually depicts, which §8 slot it
satisfies, and the shared provenance caveat: owner-provided and owner-approved
generic sector illustration, depicting the purchasing sector only, not a
photograph of any Ahan Asa project/facility/customer/delivery/capability and
never to be captioned as one; origin not established by any supplied record; no
third-party licence document supplied, the rights basis being the owner's own
supply and approval.

## Truth class — a judgment call, stated plainly

All three are `conceptual`, **not** `verified-context`. This is deliberate and
is the one substantive discretionary decision in this task.

Nothing supplied with these files establishes their **origin** — whether they
are photographs or generated imagery. The files carry no camera model, no
creator, no GPS and no capture EXIF at all, and their uniform 1448×1086
dimensions match no camera sensor.

- `verified-context` asserts "Real industrial or procurement context, accurately
  licensed" (§5). Asserting that without evidence would itself be the fabricated
  provenance §5 forbids.
- `conceptual` covers "Illustration, render, abstract composition, or
  AI-generated concept" and is correct under **both** possibilities: if the
  images are generated, §29 *requires* `conceptual`; if they are real
  photographs, `conceptual` merely under-claims, which costs nothing because
  this placement makes no evidentiary claim anyway.

Erring toward `conceptual` can only make handling stricter; erring toward
`verified-context` would publish an unverified truth claim. `conceptual` is a
**publishable** class under §5 ("clearly conceptual explanation or editorial
art") — it is not `restricted`, and provenance here is *known* (owner-provided),
so the §5 unknown-provenance default does not apply.

`PROJECT_OVERRIDES.md` / `01-sources/CLAUDE.md` §31 set `AI_IMAGES_ALLOWED =
true`, and Industries V1.0 §8 explicitly anticipates this case: "Generated
imagery, if later explicitly selected, must not be described as a real Ahan Asa
project or evidence of capability." That constraint is met.

**§29 public-disclosure trigger: assessed and NOT met.** Disclosure is required
"when a reasonable visitor could interpret it as documentary". These render with
empty alt, no caption, no number, no logo and no metric, beneath headings naming
a *purchasing sector* rather than any Ahan Asa work, and V1.0 §10 states the
sectors are "not proof of historical projects". Nothing presents them as
documentary. **This is a judgment call and is flagged as such**; if a future
placement ever captions one of these images, the assessment must be redone. The
reasoning is recorded in the module so it is not silently reversed.

---

# INDUSTRIES GATE BEFORE

```ts
resolveIndustrySectorImages() === null      // all three src were null
Industries({ locale })          === null    // returns before any markup
```

Section entirely absent from the Homepage in all locales.

---

# INDUSTRIES GATE AFTER

```ts
resolveIndustrySectorImages() === [
  { sector: "construction",              src: "/images/industries/construction-site.png" },
  { sector: "petrochemical-oil-gas",     src: "/images/industries/petrochemical-facility.png" },
  { sector: "manufacturing-fabrication", src: "/images/industries/fabrication-workshop.png" },
]
isIndustriesCopyComplete("fa" | "en" | "ar") === true
```

Both of the component's guards pass, so the section renders. The gate function
itself was **not modified** — it still enforces all-or-nothing resolution,
frozen sector order, non-empty `src`, and local-path-only (rejecting `//` and
absolute URLs). Only the data it reads changed.

---

# COPY/LAYOUT/SEMANTICS UNCHANGED

- `components/home/industries.tsx` — **NOT MODIFIED.** Zero changes. It was
  already written to consume `resolveIndustrySectorImages()`, so publication
  required no component work at all.
- `lib/content/homepage.ts` — **NOT MODIFIED.** No `homepageCopy.*.industries`
  change in any locale.
- `lib/content/industries.ts` — the `INDUSTRY_SECTOR_IMAGES` constant only
  (three `null`s → three paths), plus doc-comment updates that would otherwise
  have become actively false (the header stated "CURRENT STATE … NOT ELIGIBLE").
  No exported type, signature or function body changed; `resolveIndustrySectorImages`
  and `isIndustriesCopyComplete` are byte-identical.

Every pre-existing invariant continues to pass unmodified: sector order, H2 and
all nine localized title/body strings pinned character-for-character against the
freeze document, `<ul role="list">` with no `<ol>`, one H2 / three H3 / three
`<p>`, no eyebrow, no CTA, no link, no button, no hover affordance, no motion,
no client boundary, single `lg:grid-cols-3` (no two-column state), no carousel,
no truncation, logical-only direction utilities, White Content Section surface,
no card/shadow, Navy headings, shared spacing scale.

---

# FOCAL POINT / CROP VERIFICATION

**No cropping occurs at any viewport — confirmed arithmetically, not assumed.**

All three sources are natively 1448×1086 = exactly 4:3 (verified by reading each
PNG's IHDR header, and asserted in the test suite). The component renders them
into an `aspect-4/3` wrapper with `object-cover`. When source ratio equals
container ratio, `object-cover` scales without trimming either axis — so zero
pixels are lost on any of the three, at every breakpoint.

The wrapper still enforces `aspect-4/3` + `object-cover` **defensively**, exactly
as the component already did, rather than relying on the source dimensions.

Subject placement was checked against that result: the building frame is
centred and fully inside frame; the process towers sit upper-centre-right with
generous sky; the drill press and I-beam occupy the centre-right foreground.
None sits at an extreme edge, so all three would survive even a future
non-4:3 re-crop. No `object-position` override or focal-point metadata was
needed, and none was added.

---

# ALT POLICY

`alt=""` on all three — **unchanged**. The component already rendered a single
mapped `<Image>` with an empty alt (V1.0 §8: the images "only illustrate the
sectors already named in adjacent headings and add no unique information, use
empty alt text"). Confirmed unchanged in source and verified in rendered SSR
output: **3 × `alt=""`, 0 non-empty alt** in the section, in every locale.

Each registry record carries `decorative: true`, so the registry and the render
agree. No keyword stuffing (§8 forbids it outright); no caption anywhere.

---

# HOTLINK CHECK

**ABSENT.** All three are local `/images/industries/…` paths. The unmodified
gate rejects any `src` that does not start with `/`, or that starts with `//`.
The registry test asserts no record's `src` is protocol-relative or contains
`http(s):`. The rendered section contains **zero** external `http(s)` references.
No remote host was added to `next.config.ts` (still `{}`), and no CDN or new
dependency was introduced.

---

# HERO IMAGE REUSE CHECK

**ABSENT.** Neither `hero-steel-mill.png` nor `hero-steel-procurement.jpg`
appears in the manifest, the registry or the component — all three are new,
distinct assets. Enforced by two tests: the pre-existing invariants check on the
component and gate sources, and a new registry-wide check that no record's `src`
contains `hero-steel-mill`, `hero-steel-procurement` or `/images/products/`
(§8 excludes Hero imagery by name and forbids packshots in all three slots).

---

# ATTRIBUTION CHECK

**No customer or project attribution anywhere.** No caption, no company name, no
logo, no project reference in markup, copy, registry notes or code comments.

`attributionRequired: false` on all three. Confirmed against §28.1, which
requires the attribution requirement to be *recorded* rather than assumed: these
are owner-provided assets from the project owner, with no third-party licence
imposing an attribution condition, so there is no attribution to render. No rule
in `MEDIA_GUIDELINES.md` imposes attribution on owner-provided media.

Tests assert `notAhanAsaProjectEvidence === true` and `truthClass !==
"verified-evidence"` and `purpose === "context"` (never `"evidence"`) on every
Industries record.

---

# FILES CREATED

```
public/images/industries/construction-site.png       2,457,522 bytes
public/images/industries/petrochemical-facility.png  2,481,992 bytes
public/images/industries/fabrication-workshop.png    2,495,416 bytes
lib/media/provenance-registry.ts
lib/media/provenance-registry.test.ts
docs/industries/INDUSTRIES_MEDIA_UNBLOCK_AND_P2_FREEZE_REPORT.md   (this file)
```

# FILES MODIFIED

```
lib/content/industries.ts                             (image manifest + doc comments)
lib/content/industries-frozen-spec-invariants.test.ts (image-gate assertion flipped; 3 tests added)
docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md       (governance commit)
```

# FILES REMOVED

```
NONE
```

No file was deleted, moved or overwritten. The three `~/Downloads` originals
were **copied**, never moved, and remain present with unchanged hashes.

---

# RUNTIME COMMIT(S)

```
5d81a24  feat(industries): open the V1.0 publication gate with provenanced sector imagery
```

One runtime commit. Images, registry, wiring and tests are a single coherent
unit — the images are unpublishable without the registry, and the registry
exists for the images, so splitting them would have produced a commit that
fails its own stated rule. No separate docs-only commit was warranted: the
registry's schema documentation lives in the module it describes.

Files in that commit: the three PNGs, `lib/media/provenance-registry.ts`,
`lib/media/provenance-registry.test.ts`, `lib/content/industries.ts`,
`lib/content/industries-frozen-spec-invariants.test.ts`.
**`components/home/industries.tsx` and `lib/content/homepage.ts` are NOT in it.**

# GOVERNANCE COMMIT

```
2921528  docs(homepage): record the Industries image gate as closed
```

Updates `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md`: the §5 eligibility
row (OMITTED → PUBLISHED), §5.2 (outstanding gate → RESOLVED, with the assets
and the registry rationale recorded), and the §6 pending-item row. History is
kept rather than deleted, per the register's own convention.

---

# FOCUSED TESTS

**`lib/media/provenance-registry.test.ts` — 13 new tests:**

1. exactly one record per frozen sector, in frozen order;
2. every record carries the full §27/§28.1 provenance field set (canonical path,
   original filename, provenance, source owner, rights status, attribution flag,
   approved use, approval status, ISO approval date, not-evidence flag,
   decorative flag, type, purpose, non-empty notes) — and the original filename
   differs from the imported basename, proving the rename is recorded both ways;
3. no record claims to be evidence of real Ahan Asa work;
4. declared dimensions and the 4:3 ratio are **true of the real files on disk**
   (PNG IHDR parsed; `width × 3 === height × 4` asserted arithmetically);
5. no hotlink, no protocol-relative path, no Hero/packshot reuse;
6. ids and canonical paths unique;
7. **unknown provenance → `restricted`, not publishable** (the §5 rule);
8. **a record cannot escape `restricted` by declaring a friendlier truth class**;
9. draft / rejected / expired approval status → `restricted`;
10. `rightsStatus: "restricted"` → not publishable;
11. all three real records ARE publishable;
12. `findMediaRecord` resolves registered paths, returns `null` otherwise —
    including for a pre-existing unregistered repo image;
13. `findIndustrySectorMedia` returns the right asset per sector.

**`lib/content/industries-frozen-spec-invariants.test.ts` — 1 flipped, 3 added:**

- *flipped*: "CURRENT STATE — no reviewed imagery exists, so the section is
  correctly ineligible" → "three reviewed, provenanced assets exist, so the
  section IS eligible", asserting non-null resolution, three entries, frozen
  sector order and the exact three expected paths;
- *added*: every manifest path is local, under `/images/industries/`, and the
  file **really exists on disk**;
- *added*: no Industries asset may be published without a publishable registry
  record bound to the same sector, flagged not-evidence, decorative and 4:3 —
  the §5 rule enforced in the publishing direction;
- *added*: "INDUSTRIES NOW RENDERS" — both component guards pass in all three
  locales, three local assets resolve, and the render is still `alt=""` + 4:3 +
  `object-cover`.

**Diff discipline verified.** `git diff` on the invariants file shows exactly
**8 removed lines** — the old ineligible-state test and nothing else. Every
other assertion (content pinning, claim safety, semantics, interaction,
responsive contract, visual surface, image policy, data safety, supersession) is
untouched.

**Registry↔manifest coupling, deliberately test-only.** `INDUSTRY_SECTOR_IMAGES`
holds literal paths rather than importing from the registry, keeping the runtime
change to exactly the manifest constant as scoped. The guarantee that nothing
unprovenanced can be published is enforced by test instead of by runtime
coupling — the smallest change that still closes the hole.

---

# FULL TESTS

```
BEFORE (baseline at c68cdca):  tests 1169 | pass 1169 | fail 0
AFTER:                         tests 1185 | pass 1185 | fail 0
```

+16 tests (13 registry + 3 invariants), **zero regressions**. No existing test
was deleted, skipped or weakened.

# TSC

```
npx tsc --noEmit   →  exit 0, no diagnostics
```
**PASS.**

# BUILD

```
npm run build  →  ✓ 228 modules transformed; build complete
```
**PASS.** All 11 routes built. `tsconfig.tsbuildinfo` was touched by the build
and restored with `git restore` before committing.

No separate lint script exists in `package.json` (scripts are `dev`, `build`,
`start`, `deploy`, `preview`, `cf-typegen`, `test`), so no lint command was run
— there is none to run.

---

# SSR VERIFICATION

**LIVE BROWSER VERIFIED: NOT RUN — BLOCKED.** `list_connected_browsers`
returned `[]`; no Chrome extension is connected in this environment. Same
blocker the IND-P1 session recorded. No screenshot, no rendered-pixel,
computed-style, zoom or RTL-visual check was performed, and none is claimed.

**SOURCE-SSR STRUCTURAL PROOF — PASS.** Fresh `vinext dev` on
`http://localhost:3000`, fetched over HTTP with `curl` and parsed:

| Check | `/` (fa) | `/en` | `/ar` |
|---|---|---|---|
| HTTP status | 200 | 200 (after 308 → trailing slash) | 200 (after 308) |
| Section present (`home-industries-heading`) | yes | yes | yes |
| `aria-labelledby` → H2 | yes | yes | yes |
| Sector images rendered | 3 | 3 | 3 |
| Image order | construction → petrochemical → fabrication | same | same |
| `alt=""` / non-empty alt | 3 / 0 | 3 / 0 | 3 / 0 |
| `aspect-4/3` wrappers | 3 | 3 | 3 |
| `object-cover` | 3 | 3 | 3 |
| `<ul role="list">` / `<ol>` | 1 / 0 | 1 / 0 | 1 / 0 |
| `<li>` / `<h2>` / `<h3>` | 3 / 1 / 3 | 3 / 1 / 3 | 3 / 1 / 3 |
| `<a>` / `<button>` | 0 / 0 | 0 / 0 | 0 / 0 |
| External `http(s)` refs | 0 | 0 | 0 |

Rendered H2/H3s match the frozen canonical copy exactly — fa
«تأمین آهن و فولاد برای حوزه کاری شما» / پروژه‌های ساختمانی / پتروشیمی، نفت و گاز /
تولید و ساخت; en "Iron and steel sourcing for your sector" / Construction projects /
Petrochemical, oil and gas / Manufacturing and fabrication; ar
«تأمين الحديد والصلب لقطاع عملك» / مشاريع البناء / البتروكيماويات والنفط والغاز /
التصنيع والإنتاج.

Emitted markup per item (real SSR output, JS not required):

```html
<img src="/_next/image?url=%2Fimages%2Findustries%2Fconstruction-site.png&w=640&q=75"
     alt="" loading="lazy" decoding="async"
     sizes="(min-width: 1024px) 31vw, 100vw" class="object-cover"
     data-nimg="fill" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>
```

`loading="lazy"` confirms §8/§11 below-fold behaviour and the absence of
`priority`; geometry is reserved by the wrapper, so no CLS.

---

# IMAGE HTTP VERIFICATION

Live HTTP fetches against the dev server — **3 × 200, no broken links**:

| URL | Status | Bytes | Content-Type |
|---|---|---:|---|
| `/images/industries/construction-site.png` | **200** | 2,457,522 | `image/png` |
| `/images/industries/petrochemical-facility.png` | **200** | 2,481,992 | `image/png` |
| `/images/industries/fabrication-workshop.png` | **200** | 2,495,416 | `image/png` |

Served byte counts match the imported files exactly. The optimized resources the
page actually requests were fetched too:

| Optimized URL (`w=640&q=75`) | Status | Bytes | Content-Type |
|---|---|---:|---|
| `_next/image` → construction-site | **200** | 73,464 | `image/jpeg` |
| `_next/image` → fabrication-workshop | **200** | 70,514 | `image/jpeg` |
| `_next/image` → petrochemical-facility | **200** | 66,418 | `image/jpeg` |

66–73 KB delivered, inside §11's ≤80 KB card-image target — so the performance
budget is met at the resource actually selected for the viewport, which is what
§11 measures.

---

# HOMEPAGE COMPOSITION IMPACT

The Homepage gains one section that was previously omitted. Order is unchanged
and still matches the frozen composition:

```
Header → Hero → [Price Strip] → Product Showcase → Buyer Value
       → [Verified Evidence] → Industries / Use Cases → Final CTA → Footer
```

Industries still follows Buyer Value and precedes the Final CTA. Surface
transition is as designed: Buyer Value (Warm Cream) → Industries (White) →
CtaBand (Navy). No double margin — the section's own `border-b` and padding are
the same hairline every sibling carries.

`app/[locale]/page.tsx` was **not modified**; it already rendered `<Industries>`,
which simply stopped returning `null`. No other component's eligibility changed.
Price Strip and Verified Evidence remain omitted for their own unrelated
reasons.

Not touched: Header, Hero, Product Showcase, Buyer Value, Final CTA/CtaBand,
Footer, `lib/content/homepage.ts`, `components/home/reach.tsx` (still retained
and still serving `/industries` and `/markets`).

---

# PRODUCTION SAFETY

- No push, no deploy, no merge, no remote anything. Commits are local to
  `worktree-industries-media-unblock`.
- **Zero database involvement.** `migrations_public/0010_homepage_eligibility.sql`
  remains **PENDING** and untouched — not executed, not marked applied. Nothing
  in this change reads D1: Industries is pure localized content plus a static
  asset manifest.
- No Odoo call, no queue, no secret read, no environment or config change.
  `next.config.ts`, `wrangler.jsonc` and `package.json` are untouched.
- No new dependency, no new remote host, no CDN.
- No client JavaScript added — the section remains a pure server component with
  no hydration prerequisite; it renders identically with JS disabled.
- Additive and reversible: reverting `5d81a24` restores the closed gate exactly.
- No write-isolation guard, permission denial or tool safety refusal was
  encountered, and none was bypassed. All edits used ordinary Edit/Write inside
  the worktree; no Bash/heredoc side-channel was used to write repository files,
  and no settings were modified.
- The three `~/Downloads` originals are unmodified and still present.

---

# READY FOR FINAL FREEZE

**YES**, with the residual items below stated rather than buried.

Satisfied: frozen sector order and copy unchanged and still pinned; three
reviewed, provenanced assets bound to the three slots; all-or-nothing gate open
and enforced; decorative `alt=""`; 4:3 with no crop; `object-cover`; local
assets only; no Hero or packshot reuse; no customer/project attribution; 1185
tests green; clean tsc; clean build; SSR-verified in fa/en/ar; three images
HTTP 200.

Residual, none blocking:

1. **No live-browser verification.** Rendered pixels, computed styles, RTL
   visual behaviour, 200 % zoom and the §7 three-column line-count check at
   1024 px remain structurally reasoned, not observed. V1.0 §11's locale sweep
   and the screenshot checklist items still need a session with a connected
   browser — this is the first time the section has ever been renderable, so
   that sweep is now possible for the first time.
2. **Truth class is a judgment call.** `conceptual` is the conservative floor
   chosen because the images' origin is not established by any supplied record.
   If the owner confirms they are licensed photographs, the class may be raised
   to `verified-context` or `licensed-stock` *with* a licence record — and only
   then.
3. **The ~21 pre-existing repo images remain unregistered** and therefore
   unclassified. They are not published by this change, but any future surface
   that wants them needs their provenance recorded first.
4. **Stored masters are PNG, not AVIF.** Delivery is within budget (66–73 KB),
   so §11 is satisfied; converting the stored masters is a repo-wide media
   pipeline decision affecting all 24 images, deliberately out of scope here.
5. `migrations_public/0010_homepage_eligibility.sql` is still pending — unrelated
   to this component, which has no DB dependency.
