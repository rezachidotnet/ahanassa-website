# Ahan Asa Website — Font Strategy

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Canonical production origin:** `https://www.ahanassa.com`  
> **Document:** `FONT_STRATEGY.md`  
> **Status:** Draft v1.0 — Implementation contract  
> **Last updated:** 2026-08-25  
> **Primary website language:** Persian (`fa-IR`), fully RTL  
> **Framework baseline:** Next.js App Router with `next/font/local`

---

## 1. Purpose

This document defines the production font-loading contract for the Ahan Asa website. It determines which font assets may be shipped, how they are loaded, which files are preloaded, how fallback behavior is controlled, how font-related layout shift is measured, and how Persian and mixed-direction content remain readable.

This is an implementation document for Claude Code and human developers. It supplements:

- `BRAND_GUIDELINES.md` for typographic character and brand usage;
- `TYPOGRAPHY_SYSTEM.md` for type scale, roles, line height, and composition;
- `STACK.md` for framework and dependency decisions;
- `PERFORMANCE_GUIDELINES.md` for site-wide budgets and Core Web Vitals;
- `LOCALIZATION.md` for future locale routing and RTL/LTR behavior;
- `CACHING_STRATEGY.md` for final CDN and cache policy.

This document governs font delivery. It does not redesign the type scale or recreate the official Ahan Asa wordmark.

---

## 2. Decision Keywords

- **MUST** — mandatory for production.
- **MUST NOT** — prohibited unless a later approved decision replaces this rule.
- **SHOULD** — default implementation; deviation requires a recorded reason.
- **MAY** — optional and permitted only when it serves a verified requirement.
- **GATE** — a condition that must pass before an asset or behavior can be activated.

Claude Code MUST NOT silently change the primary family, add a remote font provider, add a second production family, or bypass the licensing gate. Material changes must be recorded in `DECISIONS.md`.

---

## 3. Locked Strategy at a Glance

| Area | Production rule |
|---|---|
| Delivery | Self-hosted font files only |
| Framework API | `next/font/local` |
| Remote fonts | Prohibited |
| Google Fonts runtime request | Prohibited |
| Font CDN | Prohibited |
| Phase 1 locale | Persian only, `lang="fa"`, `dir="rtl"` |
| Preferred Persian family | Yekan Bakh, subject to license and asset approval gate |
| Guaranteed release baseline | Estedad Variable, self-hosted, OFL-1.1 |
| Secondary emergency fallback | Vazirmatn Variable, self-hosted, OFL-1.1 |
| System fallback | `Tahoma`, `Arial`, `sans-serif` |
| Phase 1 web families | One active family |
| Preferred format | WOFF2 variable font |
| Style | Normal only unless real italic content is approved |
| Required weights | `400`, `500`, `600`, `700`, `800` |
| Preload | One active normal variable WOFF2 file only |
| Display policy | `swap` |
| Font synthesis | Disabled |
| Initial font requests | One |
| Initial font transfer target | `≤ 140 KB` compressed |
| Initial font transfer hard limit | `≤ 180 KB` compressed |
| Font-attributable CLS | `≤ 0.02` per representative page |
| Runtime font requests to third parties | Zero |

---

## 4. Approved Family Decision

### 4.1 Preferred production family: Yekan Bakh

Yekan Bakh is the preferred live Persian typeface for Ahan Asa because it supports the approved premium, editorial, modern, and confident direction.

Yekan Bakh may become the active production family only when all of the following are complete:

1. the project owner has provided or approved the source files;
2. a valid webfont license permits self-hosting on `ahanassa.com` and approved preview domains;
3. the license record is stored with the font assets;
4. the production WOFF2 files have a documented source and version;
5. the approved files contain the required Persian glyphs, punctuation, numerals, and weights;
6. the initial-route font budget passes;
7. visual regression and layout-shift tests pass.

Until every gate passes, Yekan Bakh MUST NOT be committed, copied from another site, downloaded from an unverified distributor, or referenced from a third-party URL.

### 4.2 Guaranteed release baseline: Estedad Variable

If the Yekan Bakh gate has not passed, the production site MUST use the locally hosted Estedad variable WOFF2 file. Estedad is the approved deterministic release baseline, not an arbitrary browser fallback.

Reasons:

- it matches the modern geometric direction already approved in `BRAND_GUIDELINES.md`;
- it supports Arabic and Latin codepoints needed in Persian interfaces;
- it provides a `wght` variable axis from `100` to `900`;
- it is optimized for screen and web use;
- the upstream project is licensed under SIL Open Font License 1.1.

Only an official release asset or a reproducible project-approved build may be used. The repository MUST retain the applicable license text.

### 4.3 Emergency replacement: Vazirmatn Variable

Vazirmatn Variable is an approved emergency replacement if Estedad fails a verified glyph, rendering, browser, or accessibility requirement.

Activating Vazirmatn requires:

- a documented defect in the active baseline;
- a visual comparison on Persian production content;
- the same performance and QA checks defined here;
- a decision entry in `DECISIONS.md`.

Vazirmatn MUST NOT be downloaded at runtime from Google Fonts, jsDelivr, npm CDN, GitHub raw URLs, or any other external host. The official project asset must be copied into the repository and served locally with its OFL-1.1 license.

### 4.4 Latin inside Persian pages

Phase 1 MUST NOT load a separate Latin family merely for occasional English text, URLs, standards, grades, dimensions, or product codes. The active Persian family’s Latin coverage and the system fallback stack must handle these fragments.

A dedicated Latin family may be introduced only when an English locale is approved for publication and `LOCALIZATION.md` defines locale-specific loading. It MUST NOT be preloaded on Persian routes unless measurement proves it is used in above-the-fold content and the performance budget remains valid.

### 4.5 Official wordmark

The official Persian or English Ahan Asa wordmark is fixed vector artwork. It MUST NOT be recreated with Yekan Bakh, Estedad, Vazirmatn, Montserrat, live HTML text, CSS, canvas, or generated SVG paths.

---

## 5. Weight and Style Map

### 5.1 Required weights

The production family must provide these functional weights:

| Weight | Token | Approved use |
|---:|---|---|
| `400` | `--font-weight-regular` | Body copy, descriptions, long-form content |
| `500` | `--font-weight-medium` | Navigation, inputs, metadata, compact labels |
| `600` | `--font-weight-semibold` | Buttons, emphasized UI, card titles |
| `700` | `--font-weight-bold` | Section headings, strong labels, key figures |
| `800` | `--font-weight-extrabold` | Hero and major display headings only |

Do not load `100`, `200`, `300`, or `900` solely because a variable font supports them. They are outside the approved Phase 1 role map.

### 5.2 Variable font rule

If the approved WOFF2 file is variable, declare the real supported range, then constrain application tokens to `400–800`. Do not animate the weight axis.

### 5.3 Static font policy

Multiple static weight files are not approved for Phase 1 because they conflict with the locked one-request initial font budget. The active production family must provide a reliable variable WOFF2 file covering the required `400–800` role range.

If the licensed Yekan Bakh package does not provide a variable asset that passes QA and the byte budget, its activation gate remains closed and the site uses Estedad Variable. Do not weaken the request budget to force the preferred commercial family into production.

### 5.4 Style rule

The Persian Phase 1 interface uses normal/upright text. Italic font files MUST NOT be loaded unless approved content contains a real semantic italic role and the selected Persian family renders it correctly.

### 5.5 Font synthesis

Browsers MUST NOT synthesize missing bold or italic faces.

```css
html {
  font-synthesis: none;
}
```

If a required weight is missing, implementation must fail review; it must not rely on browser-generated faux bold.

---

## 6. Asset Governance

### 6.1 Repository location

Use this structure:

```text
src/
├── app/
│   ├── fonts.ts
│   └── layout.tsx
└── styles/
    ├── globals.css
    └── tokens.css

assets/
└── fonts/
    ├── approved/
    │   ├── ahan-asa-fa-variable.woff2
    │   ├── LICENSE.txt
    │   └── FONT_MANIFEST.md
    └── source/
        └── README.md
```

If `src/app/fonts.ts` imports assets outside its directory and the framework version does not accept that path, place the web-ready files in `src/app/_fonts/` while keeping authoritative source packages under `assets/fonts/source/`.

Font files MUST NOT be placed in `public/` when they are managed through `next/font/local`.

### 6.2 Web asset naming

Application imports must use stable, brand-owned names rather than vendor download names:

```text
ahan-asa-fa-variable.woff2
```

The original vendor filename, family, version, weight range, source URL or purchase record, license, checksum, and conversion history belong in `FONT_MANIFEST.md`.

### 6.3 Required manifest fields

```md
# Font Manifest

- Active family:
- Vendor/upstream:
- Source version:
- Source acquisition date:
- License name:
- License evidence/location:
- Permitted domains:
- Original filename:
- Production filename:
- Format:
- Style:
- Weight range:
- Unicode/script coverage:
- SHA-256:
- Conversion/subsetting performed:
- Conversion tool and version:
- Approved by:
- Approval date:
```

No production font may have a missing license or unknown provenance.

### 6.4 Source integrity

- Preserve the original licensed package separately from optimized web outputs.
- Do not overwrite source files during conversion.
- Record SHA-256 checksums for source and production assets.
- Do not rename or modify a font when its license prohibits that operation.
- Preserve OFL license files when shipping Estedad or Vazirmatn.
- Treat commercial font files as licensed project assets; do not expose source packages unnecessarily.

### 6.5 Conversion and subsetting

Conversion or subsetting is allowed only when the license permits modification and redistribution.

Any generated webfont must:

- be WOFF2;
- preserve OpenType shaping required for Persian;
- preserve required glyph composition and joining behavior;
- preserve required Persian and Arabic punctuation;
- preserve Persian and Latin numerals used by the product;
- pass shaping tests before replacement;
- be reproducible from a pinned toolchain;
- be documented in `FONT_MANIFEST.md`.

Do not subset Arabic-script fonts with a naive character list. Contextual forms, marks, ligatures, join controls, OpenType tables, punctuation, and mixed-script content must remain valid.

---

## 7. Next.js Implementation

### 7.1 Single source of truth

Font declarations MUST exist in one module only: `src/app/fonts.ts`. Pages and components MUST NOT call `localFont()` independently.

### 7.2 Variable-font implementation

Use this implementation when the approved active asset is a variable WOFF2 file:

```ts
// src/app/fonts.ts
import localFont from "next/font/local";

export const ahanAsaPersian = localFont({
  src: [
    {
      path: "./_fonts/ahan-asa-fa-variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-ahan-asa-fa",
  display: "swap",
  preload: true,
  fallback: ["Tahoma", "Arial", "sans-serif"],
});
```

The declared weight range MUST match the real font metadata. Do not copy `100 900` if the approved commercial asset supports a narrower range.

### 7.3 Family activation procedure

The application uses the stable production filename `ahan-asa-fa-variable.woff2`. Activating a newly approved family requires replacing that reviewed asset, updating `FONT_MANIFEST.md`, running the full release gates, and committing the new content checksum. Components and pages must not change their family name or CSS variable.

If a candidate family has only static files, do not create a parallel static configuration. Keep the current approved variable baseline active.

### 7.4 Root layout

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { ahanAsaPersian } from "./fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ahanassa.com"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={ahanAsaPersian.variable}
    >
      <body>{children}</body>
    </html>
  );
}
```

Do not add `suppressHydrationWarning` merely to hide a direction, locale, or class mismatch.

### 7.5 Global CSS

```css
/* src/styles/globals.css */
html {
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

body {
  font-family:
    var(--font-ahan-asa-fa),
    Tahoma,
    Arial,
    sans-serif;
  font-weight: 400;
}

button,
input,
textarea,
select {
  font: inherit;
}

code,
kbd,
samp,
pre {
  font-family: ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace;
}
```

Do not apply `text-rendering: geometricPrecision` globally. Do not apply artificial letter spacing to Persian text.

### 7.6 Tailwind CSS mapping

For the approved Tailwind CSS 4 CSS-first configuration:

```css
@theme inline {
  --font-sans: var(--font-ahan-asa-fa), Tahoma, Arial, sans-serif;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
}
```

Components use semantic type recipes from `TYPOGRAPHY_SYSTEM.md`. They MUST NOT introduce ad hoc `font-family` declarations.

### 7.7 Forbidden implementation patterns

The following are prohibited:

```css
/* Prohibited: remote provider */
@import url("https://fonts.googleapis.com/css2?family=...");

/* Prohibited: remote CDN */
@font-face {
  src: url("https://cdn.example.com/font.woff2");
}

/* Prohibited: uncontrolled public asset duplication */
@font-face {
  src: url("/fonts/copy-final-2.woff");
}
```

Also prohibited:

- `<link rel="stylesheet">` to a font provider;
- runtime JavaScript font loaders;
- Base64-embedding fonts into CSS or JavaScript;
- icon fonts;
- loading the same asset through both `next/font/local` and manual `@font-face`;
- defining font imports in multiple layouts or components;
- importing a full font npm package when one reviewed WOFF2 asset is sufficient.

---

## 8. Loading and Preload Policy

### 8.1 Default loading sequence

1. The server renders HTML using the generated `next/font` class and CSS variable.
2. The browser discovers one same-origin WOFF2 preload for the active Phase 1 family.
3. Text paints immediately using the fallback stack if the webfont is not ready.
4. The active webfont swaps in when available.
5. No client component or runtime script participates in font loading.

### 8.2 Preload rules

- Preload exactly one active normal variable WOFF2 asset on Persian Phase 1 routes.
- Do not manually duplicate a preload emitted by `next/font`.
- Do not preload inactive fallback families.
- Do not preload italic assets.
- Do not preload a Latin-only family on Persian routes.
- Do not preload fonts used only below the fold, in print, or in unpublished locales.
- If a page does not use the global family, remove the usage rather than adding another preload.

### 8.3 `font-display`

Use `display: "swap"` through `next/font/local`.

The project chooses immediate readable fallback text over invisible text. `block` is prohibited. `fallback` or `optional` may not replace `swap` without measured evidence, a content readability review, and a recorded decision.

### 8.4 Preconnect and DNS hints

No font-origin `preconnect` or `dns-prefetch` is required because production fonts are served from the application’s own origin. Do not add connection hints for Google Fonts, fonts.gstatic.com, jsDelivr, unpkg, GitHub, or a vendor CDN.

### 8.5 Priority isolation

Font loading must not compete with unnecessary scripts, autoplay video, or multiple priority images. The only `fetchpriority="high"` image should be the verified LCP image when one exists. Font preloading remains limited to the active critical asset.

---

## 9. Fallback and Layout Stability

### 9.1 Fallback stack

The baseline stack is:

```css
font-family:
  var(--font-ahan-asa-fa),
  Tahoma,
  Arial,
  sans-serif;
```

Do not place Cairo, IBM Plex Sans Arabic, a remote Google family, or a generic Arabic family before the approved Persian face. A non-Persian Arabic font must not override Persian glyphs.

### 9.2 Metric verification

Fallback metrics must be verified against the exact production WOFF2 asset. The team must compare at least:

- hero heading width and line count;
- main navigation width;
- button width;
- body paragraph height;
- form label and error height;
- table header wrapping;
- large Persian numerals;
- mixed Persian/Latin specification strings.

Do not guess `size-adjust`, `ascent-override`, `descent-override`, or `line-gap-override` values. If metric overrides are introduced, they must be generated or measured from the exact active font and committed with the test evidence.

### 9.3 Stable layout rules

- Do not size navigation or buttons to the exact width of one font rendering.
- Use resilient gaps and min/max inline sizes.
- Reserve stable block size for hero headings where late font swap could alter line count.
- Avoid fixed-height text containers.
- Avoid clipping with `overflow: hidden` on live text.
- Keep line-height unitless.
- Test with the font request blocked and delayed.
- Prevent horizontal overflow at `320 px` and above.

### 9.4 CLS thresholds

The following are mandatory on representative production pages:

| Metric | Target | Failure threshold |
|---|---:|---:|
| Font-attributable CLS | `≤ 0.02` | `> 0.02` |
| Total page CLS | `≤ 0.05` preferred | `> 0.10` |
| Hero line-count change after swap | `0` | Any change |
| Navigation wrap change after swap | `0` | Any change |
| CTA displacement after swap | `≤ 2 px` | `> 2 px` |

If the active commercial font cannot meet these limits, adjust responsive measures, approved type sizes, or verified fallback metrics. Do not hide the shift with delayed visibility.

---

## 10. Performance Budgets

### 10.1 Initial-route budget

For a cold-cache Persian landing page:

| Budget | Target | Hard limit |
|---|---:|---:|
| Initial font requests | `1` | `1` |
| Initial WOFF2 transfer | `≤ 140 KB` | `≤ 180 KB` |
| Total active font families | `1` | `1` |
| Third-party font requests | `0` | `0` |
| Duplicate font downloads | `0` | `0` |
| Font-loading JavaScript | `0 KB` | `0 KB` |

The transfer size must be measured from a production build with compression and cache disabled. File size on disk is supporting evidence, not the final network measurement.

### 10.2 Budget failure response

When a font exceeds the hard limit, use this order:

1. verify that the file is WOFF2 and not TTF/OTF/WOFF;
2. remove unused styles and non-required static weights;
3. use a license-compliant variable asset when smaller than the static set;
4. create a license-compliant, shaping-safe subset using a reproducible process;
5. use the approved Estedad baseline if the preferred commercial asset still fails;
6. record the final decision.

Do not solve the problem by moving the same oversized file to an external CDN.

### 10.3 Core Web Vitals relationship

Font loading must support:

- immediate readable text for LCP content;
- no unacceptable layout shift;
- no runtime JavaScript work;
- stable hero and CTA geometry;
- repeat-view delivery from an immutable cache.

Passing the byte budget does not excuse poor CLS. Passing CLS does not excuse a remote or unlicensed font request.

---

## 11. Caching and Response Rules

The final cache architecture belongs in `CACHING_STRATEGY.md`; the following minimum rules are binding:

- generated font URLs must be content-hashed;
- font assets must be same-origin;
- hashed production assets should receive a one-year immutable browser cache;
- the response must use the correct `font/woff2` MIME type;
- CORS headers must not be broadened unnecessarily for same-origin use;
- font assets must not set cookies;
- HTML must not use the same immutable cache policy as hashed font assets;
- a font replacement must produce a new content hash.

Expected production direction:

```http
Content-Type: font/woff2
Cache-Control: public, max-age=31536000, immutable
```

Do not hard-code a hashed Next.js font URL in content, CSS, tests, or documentation. The build owns that URL.

---

## 12. Persian, RTL, and Mixed-Direction Rules

### 12.1 Document root

Phase 1 must render:

```html
<html lang="fa" dir="rtl">
```

Direction is semantic and must be present in server-rendered HTML. It must not be applied after hydration.

### 12.2 Persian text quality

- Use correct Persian characters: `ی` and `ک`, not Arabic variants where Persian is intended.
- Preserve zero-width non-joiners and correct half-spaces.
- Do not add tracking/letter spacing to connected Persian text.
- Use real Persian punctuation and appropriate line breaking.
- Do not replace live text with an image to fix typography.
- Do not convert every numeral automatically when the technical meaning requires Latin digits.

### 12.3 Mixed-direction isolation

URLs, email addresses, phone numbers, standards, steel grades, measurements, tracking codes, and model numbers must be isolated:

```tsx
<bdi dir="ltr">S355JR</bdi>
<bdi dir="ltr">120 × 60 × 4 mm</bdi>
<a href="mailto:info@ahanassa.com" dir="ltr">
  info@ahanassa.com
</a>
```

Supporting CSS:

```css
.technical-value {
  direction: ltr;
  unicode-bidi: isolate;
  font-variant-numeric: tabular-nums;
}
```

Do not change the entire component to LTR because one value is LTR.

### 12.4 Numerals

- Editorial Persian copy should follow the approved content rule for Persian numerals.
- Technical grades, standards, URLs, emails, phone links, and machine-readable identifiers must preserve their source characters.
- Tabular commercial or technical data should use `font-variant-numeric: tabular-nums` when the active font supports it.
- JavaScript numeral conversion must not run solely for decoration.

---

## 13. Future Locale Loading

Only Persian is published in Phase 1. Unsupported language routes and their fonts MUST NOT be added prematurely.

When an English, Arabic, or Russian locale is approved:

1. define its live typeface and license in an updated font decision;
2. load it in the smallest locale-specific layout boundary;
3. do not preload it on unrelated locales;
4. verify `lang` and `dir` server-side;
5. verify glyph coverage and fallbacks independently;
6. keep the global initial-route budget valid;
7. test cross-locale navigation for duplicate downloads;
8. update `LOCALIZATION.md`, `TYPOGRAPHY_SYSTEM.md`, and this document.

Arabic pages must not automatically reuse the Persian family merely because both use Arabic script. The Arabic reading experience, numerals, punctuation, glyph preferences, and brand direction require explicit approval.

---

## 14. Accessibility Requirements

Font loading and typography must support WCAG 2.2 AA implementation.

- Essential text must remain readable when the webfont fails.
- Text must remain usable at `200%` browser zoom.
- Layout must support text spacing overrides without clipping or overlap.
- Controls must inherit the interface font and remain legible.
- Placeholder text must not carry essential instructions.
- The design must not rely on weight alone to communicate state.
- Thin weights below `400` are prohibited for UI and body text.
- Long Persian paragraphs must use the approved readable line length and unitless line height.
- User styles that replace the font must not break component geometry.
- Icon meaning must not depend on an icon font.

Font swap must not move keyboard focus targets or cause the currently focused control to leave the visible area.

---

## 15. Security and Privacy

- No font request may expose user navigation to a third-party font provider.
- No font stylesheet may be injected from user-controlled content.
- Content Security Policy must not require external `font-src` origins.
- Production should use `font-src 'self'` plus only any framework-required same-origin schemes.
- Do not embed secrets, customer identifiers, or environment values in font URLs.
- Sanitize and validate third-party font packages before committing them.
- Do not execute vendor installers or opaque font-conversion binaries in CI.
- Record the source and checksum of every binary font asset.

Expected CSP direction:

```text
font-src 'self';
```

The final policy belongs in `SECURITY_GUIDELINES.md` and deployment headers.

---

## 16. Testing Strategy

### 16.1 Required test pages

Test at minimum:

- homepage;
- services overview;
- product/material detail;
- request/RFQ form;
- tracking interface;
- long-form guide;
- table or specification-heavy page;
- error and not-found pages.

### 16.2 Required Persian specimen

Use a reviewed specimen containing:

```text
آهن آسا؛ مدیریت هوشمند خرید فولاد و حفاظت از سرمایه پروژه
ی ک پ چ ژ گ هٔ ء ـ نیم‌فاصله
۰۱۲۳۴۵۶۷۸۹ 0123456789
قیمت، وزن، ضخامت، استاندارد و زمان تحویل
S355JR — ST37 — 120 × 60 × 4 mm
info@ahanassa.com — www.ahanassa.com
```

The specimen must be expanded when production content introduces new languages, technical symbols, currency signs, or industry notation.

### 16.3 Browser matrix

Test the production build on current supported versions of:

- Chrome on Windows and Android;
- Edge on Windows;
- Safari on macOS and iOS;
- Firefox on Windows or macOS.

At least one Windows test is mandatory because Tahoma/Arial fallback behavior differs from Apple and Android systems.

### 16.4 Network tests

Verify under:

- normal broadband;
- Fast 3G or equivalent throttling;
- disabled cache;
- warm cache;
- blocked WOFF2 request;
- delayed WOFF2 request;
- offline repeat navigation after the asset has been cached.

### 16.5 Automated assertions

Production tests should assert:

- no request hostname outside the approved application/analytics allowlist serves a font;
- all font responses are WOFF2;
- no Google Fonts or fonts.gstatic.com request occurs;
- no `.ttf`, `.otf`, or `.woff` file is requested;
- the initial page makes one font request;
- every font response returns `200` on first load;
- repeat requests use memory/disk cache or a valid conditional response;
- the root HTML contains `lang="fa"` and `dir="rtl"`;
- computed `font-family` begins with the generated Ahan Asa family;
- computed weights match the five approved roles;
- `document.fonts.check()` succeeds for required specimens;
- font blocking does not hide or disable essential content.

Illustrative Playwright check:

```ts
import { expect, test } from "@playwright/test";

test("Persian font delivery stays local and bounded", async ({ page }) => {
  const fontRequests: string[] = [];

  page.on("request", (request) => {
    if (request.resourceType() === "font") {
      fontRequests.push(request.url());
    }
  });

  await page.goto("/", { waitUntil: "networkidle" });

  expect(fontRequests).toHaveLength(1);
  expect(new URL(fontRequests[0]!).origin).toBe(new URL(page.url()).origin);
  expect(fontRequests[0]).toMatch(/\.woff2(?:\?|$)/);
  expect(page.locator("html")).toHaveAttribute("lang", "fa");
  expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
```

The test must be adapted if the production framework reports cached requests differently. Do not weaken the underlying one-font and same-origin requirements.

### 16.6 Visual regression states

Capture each representative page in three states:

1. font available normally;
2. font request delayed;
3. font request blocked.

Compare line count, navigation wrapping, CTA position, input height, table layout, and horizontal overflow.

---

## 17. Build and Release Gates

A release fails if any item below is true:

- the active font lacks verified provenance or license evidence;
- a runtime request reaches Google Fonts or another font CDN;
- more than one initial font request occurs;
- the initial font transfer exceeds `180 KB`;
- TTF, OTF, WOFF, Base64, or an icon font ships to the browser;
- a required Persian glyph is missing or malformed;
- Persian joining or half-spaces render incorrectly;
- the hero or navigation changes line count after swap;
- font-attributable CLS exceeds `0.02`;
- content becomes invisible or unusable when the font is blocked;
- synthetic bold or italic appears;
- a component introduces its own unapproved family;
- the wordmark is recreated as live text;
- the production root lacks `lang="fa"` or `dir="rtl"`;
- a future-locale font is preloaded on Persian routes without approval.

---

## 18. Claude Code Implementation Rules

Claude Code MUST:

1. read `BRAND_GUIDELINES.md`, `TYPOGRAPHY_SYSTEM.md`, `STACK.md`, `PERFORMANCE_GUIDELINES.md`, and this file before changing fonts;
2. use `next/font/local` from one central module;
3. keep the active asset self-hosted and same-origin;
4. enforce the license and provenance gate;
5. use the approved family decision order;
6. keep one active Phase 1 family and one initial font request;
7. expose the family through `--font-ahan-asa-fa`;
8. apply the variable at the root layout;
9. preserve Persian RTL behavior and mixed-direction isolation;
10. disable font synthesis;
11. measure production transfer size and font-attributable CLS;
12. inspect generated HTML and the network waterfall after framework upgrades;
13. update tests, manifest, and decision records when the font asset changes.

Claude Code MUST NOT:

- use `next/font/google`;
- add Google Fonts CSS;
- fetch fonts during build from a remote provider;
- add a font CDN or npm font package without approval;
- guess commercial licensing rights;
- copy a font from another Ahan Asa, SIPANEL, AvizSazeh, or unrelated website;
- fabricate or trace the official wordmark;
- add a separate Latin family to Persian routes for decorative reasons;
- ship unneeded styles or weights;
- manually duplicate Next.js-generated preloads;
- set hard-coded `font-family` values inside page components;
- conceal font-related layout shift with loaders or delayed opacity;
- convert Persian text to outlines or images.

---

## 19. Operational Change Procedure

Any primary font change must follow this sequence:

1. record the reason and candidate in `DECISIONS.md`;
2. verify purchase, license, permitted domains, and redistribution conditions;
3. archive the original package and license record;
4. generate or select the reviewed WOFF2 output;
5. update `FONT_MANIFEST.md` and SHA-256 values;
6. update the central `next/font/local` declaration;
7. run glyph, RTL, mixed-direction, browser, network, accessibility, and visual tests;
8. compare transfer size and Core Web Vitals with the existing production asset;
9. obtain project-owner approval;
10. deploy to preview;
11. verify the preview waterfall and response headers;
12. release with a new content hash;
13. record the change in `CHANGELOG.md`.

Rollback consists of restoring the last approved central font declaration and asset manifest. Do not reuse a previous hashed URL manually.

---

## 20. Decision Record

| Decision | Status | Owner | Evidence required |
|---|---|---|---|
| Yekan Bakh is the preferred live Persian family | Approved direction | Project Owner | This document and design approval |
| Yekan Bakh production activation | Gated | Project Owner | License, assets, manifest, performance and QA |
| Estedad Variable is the guaranteed release baseline | Approved | Technical Lead | Official asset, OFL-1.1, manifest and QA |
| Vazirmatn Variable is the emergency replacement | Conditional | Technical Lead | Documented defect, OFL-1.1, comparison and QA |
| One active Phase 1 family | Locked | Technical Lead | Production network test |
| Self-hosting via `next/font/local` | Locked | Technical Lead | Build and network inspection |
| Remote font providers | Prohibited | Project Owner | CSP and network test |
| Separate Latin family in Phase 1 | Not approved | Project Owner | Future locale decision |

---

## 21. Acceptance Checklist

### Assets and legal

- [ ] The active family follows the approved decision order.
- [ ] Source, version, license, and permitted use are documented.
- [ ] Original and production files have recorded SHA-256 values.
- [ ] Required license text is stored with the assets.
- [ ] The production file is WOFF2.
- [ ] No unverified commercial asset exists in the repository.

### Implementation

- [ ] Font configuration exists only in `src/app/fonts.ts`.
- [ ] `next/font/local` is used.
- [ ] The CSS variable is `--font-ahan-asa-fa`.
- [ ] The root document renders `lang="fa"` and `dir="rtl"`.
- [ ] Body and native controls inherit the approved family.
- [ ] Required weights `400`, `500`, `600`, `700`, and `800` render correctly.
- [ ] `font-synthesis: none` is active.
- [ ] No component defines an unapproved font family.
- [ ] No official wordmark is reproduced with live text.

### Loading and performance

- [ ] One same-origin font request occurs on the initial Persian route.
- [ ] No remote font provider or third-party font CDN is contacted.
- [ ] The transferred asset is `≤ 140 KB`, or a documented exception remains below `180 KB`.
- [ ] No duplicate preload exists.
- [ ] No TTF, OTF, WOFF, Base64 font, or icon font ships.
- [ ] Font-attributable CLS is `≤ 0.02`.
- [ ] Hero and navigation line counts do not change after swap.
- [ ] Hashed font assets receive immutable caching.

### Language and accessibility

- [ ] Persian glyphs, joining, punctuation, numerals, and half-spaces pass review.
- [ ] Mixed-direction technical strings are isolated correctly.
- [ ] Content remains readable when the font is delayed or blocked.
- [ ] Layout remains usable at `200%` zoom and from `320 px` viewport width.
- [ ] Controls do not clip under fallback or user-replaced fonts.
- [ ] Browser coverage includes Windows, macOS/iOS, and Android.

---

## 22. Definition of Done

`FONT_STRATEGY.md` is implemented when:

1. an approved active WOFF2 asset exists with complete provenance and license evidence;
2. the central `next/font/local` configuration follows this document;
3. Persian routes load one same-origin font asset and no remote fonts;
4. all required weights and Persian specimens pass visual review;
5. loading, fallback, CLS, cache, browser, and accessibility gates pass;
6. the asset manifest and automated checks are committed;
7. the project owner approves Yekan Bakh or confirms the Estedad release baseline;
8. unresolved future-locale families remain unloaded and explicitly deferred.

Until Yekan Bakh’s production gate passes, Estedad Variable is the mandatory release baseline.

---

## 23. Authoritative References

- [Next.js Font Component — App Router](https://nextjs.org/docs/app/api-reference/components/font)
- [Estedad official repository](https://github.com/aminabedi68/Estedad)
- [Estedad OFL-1.1 license](https://github.com/aminabedi68/Estedad/blob/master/OFL.txt)
- [Vazirmatn official repository](https://github.com/rastikerdar/vazirmatn)
- [Vazirmatn OFL-1.1 license](https://github.com/rastikerdar/vazirmatn/blob/master/OFL.txt)

External references support implementation and licensing review; the project rules in this document remain authoritative for Ahan Asa.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Brand Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |
| Accessibility Review | TBD | Pending | — |
| Performance Review | TBD | Pending | — |
