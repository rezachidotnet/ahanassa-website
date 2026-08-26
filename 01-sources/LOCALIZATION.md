# Localization Architecture

**Project:** Ahan Asa (آهن آسا)  
**Document:** `LOCALIZATION.md`  
**Status:** Implementation specification  
**Version:** 1.0  
**Last updated:** 2026-08-25  
**Primary stack:** Next.js App Router, TypeScript, static-first rendering  

---

## 1. Purpose

This document defines how the Ahan Asa website must support multiple languages and both right-to-left and left-to-right interfaces. It is the implementation contract for routing, translation, layout direction, formatting, forms, content, accessibility, performance, analytics, and quality assurance.

The objectives are to:

- deliver a first-class Persian experience rather than a translated English layout;
- support English and Arabic without duplicating application logic;
- prevent mixed-direction layout defects;
- keep every locale indexable and technically consistent;
- make missing, stale, or machine-generated translations visible before deployment;
- allow additional markets and locales to be added without restructuring the application.

This document does not define the final sitemap, page copy, keyword targeting, canonical tags, or translation ownership in detail. Those concerns belong to:

- `ROUTES.md`
- `CONTENT_MODEL.md`
- `COPY_GUIDELINES.md`
- `SEO_KEYWORD_MAP.md`
- `LOCALE_CONTENT_STRUCTURE.md`
- `HREFLANG_CANONICAL.md`
- `METADATA_SPEC.md`

Where documents conflict, explicit route and SEO decisions in `ROUTES.md` and `HREFLANG_CANONICAL.md` take precedence. This document controls localization behavior and UI direction.

---

## 2. Core Decisions

| Area | Required decision |
| --- | --- |
| Primary locale | Persian for Iran: `fa-IR` |
| Public locale code | `fa` |
| Primary URL format | Persian pages are unprefixed |
| Secondary locales | English `en`; Arabic `ar` |
| Secondary URL format | Locale-prefixed: `/en/...` and `/ar/...` |
| Text direction | `fa` and `ar`: RTL; `en`: LTR |
| Default fallback | Persian content only as an internal development fallback; never silently shown on published English or Arabic pages |
| Framework | Next.js App Router with `next-intl`, unless `STACK.md` explicitly replaces it |
| Rendering | Static generation by default; server rendering only where required |
| Language detection | First visit may use a suggestion; never force repeated redirects based on browser language |
| Locale persistence | Explicit user selection stored in a cookie |
| Internal identifiers | Locale-neutral, stable IDs and enums |
| Translation model | Structured message catalogs plus locale-specific page content |
| CSS strategy | Logical properties; no direction-specific duplication unless visually necessary |
| Search indexing | Each published locale has self-consistent metadata, canonical, and hreflang annotations |

These are implementation requirements. Any deviation must be recorded in `DECISIONS.md` before code changes.

---

## 3. Supported Locale Matrix

| Public code | Language/market | BCP 47 tag | Direction | URL prefix | Initial status | Default numeral presentation |
| --- | --- | --- | --- | --- | --- | --- |
| `fa` | Persian / Iran | `fa-IR` | RTL | none | Primary and complete | Persian in editorial UI; Latin where technical accuracy requires it |
| `en` | English / international | `en` | LTR | `/en` | Published only when complete | Latin |
| `ar` | Arabic / regional | `ar` | RTL | `/ar` | Published only when complete | Locale-aware; technical values may remain Latin |

### 3.1 Locale registry

All locale behavior must be derived from one typed registry. Do not scatter arrays such as `['fa', 'en', 'ar']` across the codebase.

```ts
export const locales = ['fa', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fa';

export const localeConfig = {
  fa: {
    languageTag: 'fa-IR',
    dir: 'rtl',
    label: 'فارسی',
    htmlLang: 'fa-IR',
    urlPrefix: '',
  },
  en: {
    languageTag: 'en',
    dir: 'ltr',
    label: 'English',
    htmlLang: 'en',
    urlPrefix: '/en',
  },
  ar: {
    languageTag: 'ar',
    dir: 'rtl',
    label: 'العربية',
    htmlLang: 'ar',
    urlPrefix: '/ar',
  },
} as const;
```

If the Arabic content later becomes market-specific, introduce a deliberate locale such as `ar-IQ` or `ar-OM`; do not change the semantic meaning of the existing `ar` code silently.

### 3.2 Locale lifecycle

Each locale has one of these states:

- `draft`: visible only in preview and excluded from production navigation, sitemap, hreflang, and indexing;
- `partial`: available for internal QA but not public;
- `published`: complete, reviewed, linked, indexed, and included in locale switching;
- `retired`: permanently redirected according to `REDIRECTS.md`.

Locale publication is an explicit release decision. The existence of a message file must not automatically publish a locale.

---

## 4. URL and Routing Policy

### 4.1 Required URL model

```text
/                         Persian homepage
/en                      English homepage
/ar                      Arabic homepage
/{route}                 Persian page
/en/{route}              English equivalent
/ar/{route}              Arabic equivalent
```

Persian must never be publicly duplicated under `/fa`. If legacy or accidental `/fa` URLs exist, they must permanently redirect to the matching unprefixed Persian URL.

Examples below are illustrative; final route segments must come from `ROUTES.md`:

| Content identity | Persian | English | Arabic |
| --- | --- | --- | --- |
| Homepage | `/` | `/en` | `/ar` |
| About | `/about` | `/en/about` | `/ar/about` |
| Contact | `/contact` | `/en/contact` | `/ar/contact` |
| RFQ | `/rfq` | `/en/rfq` | `/ar/rfq` |

### 4.2 Route identity

Every translatable page must have a locale-neutral content identity, for example `about`, `contact`, or a UUID. Locale variants are siblings of the same entity, not unrelated pages.

```ts
type LocalizedPage = {
  id: string;
  routeKey: string;
  locales: Partial<Record<Locale, PageTranslation>>;
};
```

This identity is used for:

- language-switcher destinations;
- canonical and hreflang generation;
- translation completeness checks;
- analytics comparison;
- redirect mapping;
- CMS relationships.

### 4.3 Slugs

- Public slugs must be explicitly defined in `ROUTES.md` or the content record.
- Never translate slugs at runtime by passing them through a message catalog.
- Never use a translated page title as an implicit slug.
- Dynamic content must store a slug per published locale.
- Slugs must be lowercase where the script supports case, hyphen-separated, stable, and free of tracking parameters.
- Changing a published slug requires a permanent redirect from the previous localized URL.
- If localized slugs are not yet approved, use the same stable Latin route segment across locales. Consistency is safer than automatic transliteration.

### 4.4 Locale detection and redirects

Required behavior:

1. A URL prefix always wins.
2. An explicit locale cookie may be used for suggestions and future navigation.
3. Browser `Accept-Language` may inform a one-time, dismissible suggestion.
4. Search bots, shared links, and returning users must not be forcibly redirected away from a valid locale URL.
5. Unknown locale-like prefixes return a localized 404 or redirect only when an unambiguous historical mapping exists.
6. Query strings and fragments must be preserved during valid locale switching where safe.

Do not use IP geolocation as a hard redirect mechanism. Country and language are not equivalent.

### 4.5 Middleware boundaries

Middleware must process public content routes only. Exclude at minimum:

- `/api/*`
- `/_next/*`
- static files with extensions;
- monitoring and health endpoints;
- webhooks;
- preview endpoints where locale resolution is handled explicitly;
- `robots.txt`, `sitemap.xml`, and other root technical files.

The exact matcher belongs in the application configuration and must be covered by routing tests.

---

## 5. Application Structure

Recommended structure:

```text
app/
  [locale]/
    layout.tsx
    page.tsx
    [...localized routes]
  api/
i18n/
  config.ts
  navigation.ts
  request.ts
  routing.ts
messages/
  fa/
    common.json
    navigation.json
    forms.json
    validation.json
  en/
    common.json
    navigation.json
    forms.json
    validation.json
  ar/
    common.json
    navigation.json
    forms.json
    validation.json
content/
  pages/
  products/
  insights/
lib/
  formatting/
  localization/
```

The actual layout may follow `FOLDER_STRUCTURE.md`, but it must preserve the separation between:

- short reusable interface messages;
- long editorial or SEO content;
- locale-neutral business data;
- locale-specific presentation fields;
- formatting utilities;
- routing configuration.

### 5.1 Message catalogs vs. page content

Use message catalogs for:

- buttons and controls;
- navigation labels;
- form labels and validation;
- dialogs and notices;
- system states;
- accessibility labels;
- short repeated interface copy.

Use typed content files or the CMS for:

- page titles and body content;
- service or product descriptions;
- project stories;
- articles and resources;
- FAQs;
- SEO metadata;
- market-specific commercial statements.

Do not place entire marketing pages inside one large JSON translation value.

---

## 6. Translation Key Contract

### 6.1 Key naming

Keys must describe meaning, not the current source-language sentence.

Good:

```json
{
  "navigation": {
    "requestQuote": "...",
    "openMenu": "..."
  },
  "rfq": {
    "submit": "...",
    "successTitle": "..."
  }
}
```

Avoid:

```json
{
  "click_here": "...",
  "send_your_request_now": "...",
  "button1": "..."
}
```

Rules:

- Use stable, semantic, camelCase keys.
- Namespace keys by feature or component.
- Do not reuse a key merely because two English strings happen to match.
- Include translator context for ambiguous terms.
- Use ICU messages for variables, pluralization, and selection.
- Never concatenate translated fragments to build a sentence.
- Do not embed HTML in translation strings.
- Rich text must use controlled placeholder tags supported by the translation library.

### 6.2 Variables and plurals

```json
{
  "resultsCount": "{count, plural, =0 {No results} one {# result} other {# results}}",
  "welcome": "Welcome, {name}"
}
```

- Variables must have typed names.
- User-supplied values must remain escaped.
- Plural categories must follow the target locale, not English assumptions.
- Avoid passing preformatted sentence fragments into translations.

### 6.3 Catalog parity

CI must compare published locale catalogs with the source catalog and fail when:

- a required key is missing;
- an unknown key suggests drift or a typo;
- ICU syntax is invalid;
- placeholders differ between locales;
- a message is empty;
- a value is still marked `TODO_TRANSLATE`;
- a prohibited machine-translation marker remains.

Unused-key reporting may begin as a warning and become an error after the catalog stabilizes.

---

## 7. Translation Quality and Governance

### 7.1 Content must be localized, not mechanically translated

Each locale may require different:

- terminology;
- sentence length and hierarchy;
- examples and proof points;
- units or currency presentation;
- contact expectations;
- CTA wording;
- legal notices;
- keyword focus;
- image alternatives.

Commercial promises, prices, delivery regions, standards, and contact channels must be verified for the target market. Translation must never imply availability that the business has not approved.

### 7.2 Review workflow

Required states for localized content:

```text
source draft → translation → linguistic review → technical review → SEO review → approved → published
```

Review roles may be combined for small releases, but the states must remain visible.

Technical review is mandatory for steel grades, standards, dimensions, weights, tolerances, product names, commercial terms, and procurement terminology.

### 7.3 Machine translation

Machine translation may be used only as a draft accelerator. It must not be published without human linguistic and technical review. Generated drafts must be labeled in the content workflow and excluded from production until approved.

### 7.4 Terminology glossary

Maintain a project glossary with at least:

- approved brand spelling: `Ahan Asa` and `آهن آسا`;
- product and steel terminology;
- procurement and logistics terms;
- CTA translations;
- units and standards;
- terms that remain untranslated;
- forbidden or misleading alternatives.

Brand names, legal company names, trademarks, standards, grade names, and technical codes must not be freely translated.

---

## 8. RTL and LTR Architecture

### 8.1 Document attributes

The root layout must set both `lang` and `dir` from the validated locale registry.

```tsx
<html lang={localeConfig[locale].htmlLang} dir={localeConfig[locale].dir}>
  <body>{children}</body>
</html>
```

Never derive `dir` from user input. Never leave `lang` fixed to one language.

### 8.2 CSS logical properties

Use logical properties by default:

| Avoid | Use |
| --- | --- |
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `left` / `right` for flow alignment | `inset-inline-start` / `inset-inline-end` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |
| `float: right` | modern grid/flex layout |

Physical properties are allowed only for genuinely physical placement, such as an image focal point or a decorative object that must stay on one side in every locale.

### 8.3 Flex, grid, and source order

- Preserve a semantic DOM order that makes sense for keyboard and screen-reader navigation.
- Do not use `row-reverse` merely to repair RTL visuals.
- Prefer logical alignment and locale-aware component variants.
- Grid areas may be deliberately mirrored when the visual reading order requires it.
- Never change keyboard focus order with CSS `order`.

### 8.4 Icons and directional assets

Mirror icons that express direction:

- forward/back arrows;
- chevrons;
- pagination direction;
- undo/redo where semantics follow writing direction;
- breadcrumb separators where appropriate.

Do not mirror:

- logos;
- phone, email, download, search, play, pause, or close icons;
- maps or geographic images;
- charts and technical diagrams;
- product photography;
- numbers and mathematical symbols without an explicit rule.

Directional icons should receive a locale-aware transform through a shared component, not ad hoc page CSS.

### 8.5 Mixed-direction text

Steel specifications, phone numbers, emails, URLs, part codes, standards, and Latin brand names frequently appear inside RTL copy. Protect them with semantic isolation:

```tsx
<bdi>{value}</bdi>
```

or:

```css
.technical-value {
  direction: ltr;
  unicode-bidi: isolate;
  display: inline-block;
}
```

Use LTR isolation for values such as:

- `S235JR`
- `ASTM A36`
- `HEB 200`
- `+98 21 ...`
- `info@ahanassa.com`
- URLs and tracking codes.

Never insert invisible Unicode direction characters manually into CMS content unless a documented exception requires them.

### 8.6 Components requiring explicit RTL QA

- header and mega-menu;
- mobile drawer;
- breadcrumbs;
- tabs and carousels;
- accordions;
- pagination;
- data tables;
- filters and sort controls;
- form fields with prefixes or suffixes;
- phone and country-code inputs;
- range sliders;
- charts and timelines;
- toast notifications;
- modal close controls;
- previous/next article navigation.

---

## 9. Typography

- Font assignments must come from `FONT_STRATEGY.md` and `TYPOGRAPHY_SYSTEM.md`.
- Persian and Arabic fonts must contain the required glyphs, punctuation, numerals, diacritics, and weights.
- Do not rely on browser-synthesized bold or italic for scripts where the result is visually poor.
- English and technical Latin text may use the approved Latin companion font.
- Line height must be tested independently per script.
- Avoid fixed-height text containers.
- UI controls must tolerate at least 30% text expansion in English and Arabic.
- Do not use letter-spacing on connected Persian or Arabic text.
- Use non-breaking spans selectively for grade names, dimensions, and units that must not split.

Any font subset must be verified against real Persian and Arabic content before deployment. A subset missing Arabic presentation forms or Persian-specific characters is a release blocker.

---

## 10. Numbers, Dates, Time, Units, and Currency

### 10.1 Formatting utilities

Use `Intl` or the localization library. Do not format display values with handcrafted replacements.

```ts
new Intl.NumberFormat(languageTag, options).format(value);
new Intl.DateTimeFormat(languageTag, options).format(date);
```

Formatting functions must accept a locale explicitly or obtain it from the validated request context.

### 10.2 Numbers

- Store numbers as numeric values, never localized strings.
- Localize thousands and decimal separators for display.
- Keep technical identifiers unchanged.
- Choose Persian or Latin digits according to the component policy, not by global string replacement.
- Input parsers should accept expected Persian, Arabic, and Latin digits, normalize them, and validate the result.
- Copy-to-clipboard values should use a machine-safe canonical representation where relevant.

### 10.3 Dates and calendars

- Store timestamps in UTC using ISO 8601.
- Display dates in the visitor's locale and approved calendar.
- Persian editorial dates may use the Solar Hijri calendar when product requirements call for it.
- Contracts, standards, shipping records, and cross-border documents must state the calendar unambiguously.
- Never convert a date by changing only the year digits.
- Time-zone-sensitive values must name the time zone when ambiguity matters.

### 10.4 Measurements

- Store a canonical numeric value and unit separately.
- Never translate unit symbols as ordinary prose.
- Use a non-breaking space between values and units where typographically appropriate.
- Preserve decimal precision required by engineering data.
- Unit conversion must be a business decision; localization alone must not convert engineering values.

Examples include `mm`, `m`, `m²`, `kg`, `t`, and `kg/m`.

### 10.5 Currency

- Store amount and ISO currency code separately.
- Do not assume Persian means IRR or Arabic means a particular Gulf currency.
- Display rial, toman, USD, EUR, or another currency only when the data explicitly specifies it.
- If toman is used, label it clearly because it is not the ISO currency unit.
- Pricing claims require market approval and must not be copied automatically between locales.

---

## 11. Forms and Validation

Forms must follow `FORM_ARCHITECTURE.md` and these localization requirements.

### 11.1 Labels and messages

- Every visible label, placeholder, hint, error, success message, and consent statement must be localized.
- Placeholders must not replace labels.
- Validation errors must explain how to correct the field.
- Server errors must return stable error codes; the UI maps them to localized messages.
- Never return raw backend or English exception text to the visitor.

### 11.2 Data entry

- Person and company names must support Unicode.
- Do not reject Persian or Arabic characters with Latin-only regex patterns.
- Email and URL fields are rendered LTR inside RTL forms.
- Phone fields use an explicit country code and a normalized E.164 value where possible.
- Country, province, and city choices must use stable codes rather than translated labels as stored values.
- Numeric inputs must normalize accepted digit sets before validation.
- File-upload constraints and error messages must be localized.

### 11.3 Submission payload

Every lead or RFQ must include:

```ts
{
  locale: 'fa' | 'en' | 'ar',
  languageTag: string,
  sourcePath: string,
  submittedAt: string,
  // normalized business fields
}
```

Preserve the visitor's original text. Do not translate lead content automatically before storage. If an internal translation is generated for sales operations, retain it as a separate field with provenance.

### 11.4 Form direction

The form layout follows the page direction, but the following typically remain LTR:

- email;
- URL;
- phone number;
- product code;
- standard or grade code;
- tracking/reference number.

Prefixes and suffixes must appear in the correct logical order in both directions.

---

## 12. Navigation and Language Switching

### 12.1 Language switcher

The language switcher must:

- use each language's native label: `فارسی`, `English`, `العربية`;
- link to the equivalent page, not always the homepage;
- fall back to the target locale homepage only when no equivalent is published;
- clearly indicate the current language;
- be keyboard and screen-reader accessible;
- avoid country flags as language labels;
- preserve safe query parameters only;
- update the locale cookie after an explicit selection.

If the equivalent target page is unavailable, either disable that option with an accessible explanation or link to the target homepage according to the global product decision. The behavior must be consistent sitewide.

### 12.2 Localized navigation

- Navigation structure may differ by market only when approved in `INFORMATION_ARCHITECTURE.md`.
- A label may be localized, but its destination must use the route mapping rather than string manipulation.
- Mobile and desktop navigation must share the same route source.
- Breadcrumbs use localized labels and the public localized URLs.

---

## 13. Metadata and Search Boundaries

Detailed SEO rules belong to `HREFLANG_CANONICAL.md`, `METADATA_SPEC.md`, and `SITEMAP_ROBOTS_SPEC.md`. Localization implementation must ensure:

- localized `title` and meta description;
- localized Open Graph fields;
- correct `<html lang>`;
- a self-referencing canonical for each indexable locale URL;
- hreflang links only between valid, published equivalents;
- `x-default` according to the approved SEO specification;
- locale-aware structured data text;
- locale-aware breadcrumbs;
- locale-specific sitemap inclusion;
- no English metadata on Persian or Arabic pages;
- no indexing of partial or placeholder translations.

Do not automatically translate keywords. Search intent and terminology must be researched per language and market.

Structured data IDs should remain stable across locale variants where they describe the same organization or entity, while human-readable fields are localized.

---

## 14. Media Localization

- Decorative images may be shared across locales.
- Images containing text must have locale-specific variants or be redesigned without embedded text.
- Alt text must be localized according to the image's purpose; decorative images use empty alt text.
- Captions, credits, transcripts, and subtitles must be localized.
- Video subtitles should use valid BCP 47 language tags.
- Product and engineering imagery must not be mirrored.
- Locale-specific media must keep a shared asset identity and explicit locale variants.
- Do not place essential translated copy inside raster images.

Asset selection must remain compatible with `MEDIA_GUIDELINES.md` and `IMAGE_OPTIMIZATION.md`.

---

## 15. Content Model Requirements

Localized content must distinguish global, market-specific, and translated fields.

```ts
type LocalizedString = Partial<Record<Locale, string>>;

type ContentEntity = {
  id: string;
  statusByLocale: Partial<Record<Locale, 'draft' | 'review' | 'published'>>;
  slugByLocale: Partial<Record<Locale, string>>;
  title: LocalizedString;
  summary: LocalizedString;
  body: Partial<Record<Locale, unknown>>;
  metadata: Partial<Record<Locale, SeoMetadata>>;
  updatedAt: string;
};
```

Rules:

- Global IDs never change with language.
- Publication status is per locale.
- Slugs and metadata are per locale.
- Localized fields must not overwrite one another.
- Source locale and translation provenance must be recorded where a CMS supports them.
- Market-specific facts are modeled explicitly rather than hidden inside translation text.
- Deleting one locale must not delete the shared entity.

The final schema belongs in `CONTENT_MODEL.md` and `CMS_ARCHITECTURE.md`.

---

## 16. Fallback and Error Policy

### 16.1 UI messages

During development, a missing translation may fall back to Persian and log a structured warning. In production:

- published locales must have complete required catalogs;
- missing critical UI messages are build or release failures;
- an observable fallback must be reported to monitoring;
- raw translation keys must never be visible to visitors.

### 16.2 Page content

Never render a Persian page body inside an English or Arabic route without an explicit bilingual content design. If the translation is unavailable:

- do not publish that locale variant;
- remove it from locale navigation, sitemap, and hreflang;
- return the approved not-found behavior or redirect only if specified.

### 16.3 Not-found and error pages

404, 500, maintenance, empty-state, and offline messages must be localized. Error routes must preserve the best known locale without leaking technical details.

---

## 17. Accessibility Requirements

- Set correct `lang` and `dir` on the document.
- Apply `lang` to inline passages in another language when pronunciation matters.
- Maintain semantic headings and landmark order across directions.
- Ensure the language switcher exposes its name, current state, and destination language.
- Localize accessible names, labels, instructions, errors, and live-region messages.
- Verify focus indicators in RTL and LTR.
- Do not use visual position such as “on the right” in instructions unless it is dynamically localized and still necessary.
- Screen readers must read mixed-direction technical values intelligibly.
- Keyboard interaction must follow component semantics, not visual mirroring assumptions.
- Text must remain usable at 200% zoom and with content expansion.

All relevant criteria in `ACCESSIBILITY.md` and `ACCESSIBILITY_QA.md` remain mandatory.

---

## 18. Performance Requirements

- Load only the catalogs required for the active locale and route.
- Split catalogs by namespace or feature when beneficial.
- Do not ship all locale content to the client.
- Resolve translations on the server for server-rendered content.
- Minimize client components used solely for localization.
- Preload only the fonts required for the current script and critical rendering path.
- Avoid duplicate RTL and LTR stylesheets when logical CSS can support both.
- Statically generate all stable locale routes.
- Cache locale-neutral data independently where safe.
- Include each locale in bundle-size and Core Web Vitals testing.

Localization must not cause hydration mismatches. Locale, time zone, and formatting inputs must be deterministic between server and client.

---

## 19. Analytics and Consent

Every relevant analytics event should include the active locale as a property, for example:

```ts
{
  event: 'rfq_submit',
  locale: 'fa',
  page_path: '/rfq'
}
```

Requirements:

- Report the public locale code consistently.
- Keep event names locale-neutral.
- Do not translate analytics property keys.
- Record the canonical public path, not an internal route template.
- Track language-switch events without storing sensitive content.
- Localize consent interfaces and honor the applicable market policy.
- Never send raw form values or translated lead text to analytics.

The complete event contract belongs in `ANALYTICS_TRACKING.md`.

---

## 20. Testing Strategy

### 20.1 Automated tests

Required automated coverage:

- locale registry and direction mapping;
- prefix and unprefixed route resolution;
- `/fa/*` redirect behavior if applicable;
- route equivalents used by the language switcher;
- message catalog parity and ICU validation;
- missing-message behavior;
- `lang` and `dir` output;
- number, date, currency, and unit formatting;
- digit normalization in forms;
- email, phone, URL, and technical-value direction isolation;
- localized metadata generation;
- no partial locales in navigation or sitemap;
- safe query preservation during locale switching;
- locale included in form submissions and analytics events.

### 20.2 Visual regression matrix

At minimum, capture representative pages for:

| Locale | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Persian RTL | Required | Required | Required |
| English LTR | Required | Required | Required |
| Arabic RTL | Required | Required | Required |

Test the longest realistic translations, not only short placeholder copy.

### 20.3 Manual QA checklist

For every published locale:

- [ ] Correct URL and redirect behavior
- [ ] Correct document `lang` and `dir`
- [ ] Header, footer, navigation, and mobile drawer complete
- [ ] Language switcher reaches the equivalent page
- [ ] No raw keys, empty strings, or fallback-language leakage
- [ ] Titles, headings, and body copy linguistically reviewed
- [ ] Technical terminology reviewed
- [ ] Forms accept expected scripts and digits
- [ ] Validation and success states localized
- [ ] Email, phone, URLs, and codes display in the correct order
- [ ] Icons mirror only where semantically appropriate
- [ ] Tables, carousels, breadcrumbs, and pagination work in both directions
- [ ] Dates, numbers, units, and currency are unambiguous
- [ ] Metadata, canonical, hreflang, OG, and structured data are correct
- [ ] Images, alt text, captions, and video subtitles are appropriate
- [ ] Keyboard and screen-reader flows remain logical
- [ ] No clipping at 200% zoom or with long content
- [ ] No locale-specific console errors or hydration warnings
- [ ] Analytics and RFQ payloads contain the correct locale

---

## 21. Release Gates

A locale may be published only when all of the following are true:

- route mapping is complete;
- all critical interface messages exist;
- required page content is approved;
- technical terminology has been reviewed;
- metadata is complete and language-correct;
- canonical and hreflang validation passes;
- navigation and locale switching pass;
- representative RTL/LTR visual regression passes;
- form validation and submission pass;
- accessibility checks pass;
- no fallback-language leakage exists;
- sitemap and indexing status match the locale state;
- analytics records the correct locale;
- the owner approves the market-specific commercial claims.

Partial translation is not a production-ready locale.

---

## 22. Implementation Checklist for Claude Code

Claude Code must complete localization in this order:

1. Read `STACK.md`, `ROUTES.md`, `FOLDER_STRUCTURE.md`, `CONTENT_MODEL.md`, and the SEO specifications.
2. Create one typed locale registry.
3. Configure locale-aware App Router routing.
4. Implement unprefixed Persian and prefixed English/Arabic URLs.
5. Add validated `lang` and `dir` attributes to the root layout.
6. Create locale-aware navigation helpers and ban hardcoded locale prefixes in components.
7. Establish message namespaces and typed access where supported.
8. Separate interface messages from editorial page content.
9. Convert shared layout CSS to logical properties.
10. Add direction-aware icons and mixed-direction isolation utilities.
11. Implement number, date, digit, unit, and currency formatters.
12. Localize forms and include locale metadata in submissions.
13. Implement equivalent-page language switching.
14. Integrate localized metadata and route identities with the SEO layer.
15. Add catalog validation, routing tests, and visual regression coverage.
16. Keep incomplete locales out of production navigation and indexing.
17. Run the full locale QA matrix before deployment.

Claude Code must not:

- invent translations for publication;
- publish an incomplete locale;
- create duplicate Persian routes under `/fa`;
- hardcode `dir="rtl"` or `lang="fa"` globally;
- concatenate translated sentences;
- use country flags as the only language indicator;
- translate route slugs at runtime;
- rely on CSS `row-reverse` as a universal RTL solution;
- expose raw backend errors;
- convert currencies or engineering units implicitly;
- reuse Persian metadata on English or Arabic pages;
- create locale redirects based solely on IP location;
- add locale-specific logic outside the shared registry without documentation.

---

## 23. Definition of Done

Localization is complete when a visitor can enter any published locale directly, navigate the full approved journey, switch to an equivalent page, read correctly directed and reviewed content, submit a localized form, and receive localized feedback without encountering mixed-language leakage, direction defects, invalid formatting, duplicate URLs, or inconsistent SEO annotations.

The architecture is complete when a new locale can be added primarily by:

1. registering it in the locale configuration;
2. adding approved message catalogs and content variants;
3. defining route and SEO mappings;
4. adding font or formatting exceptions if necessary;
5. passing the same automated and manual release gates.

---

## 24. Open Decisions

The following must be confirmed before the affected feature is finalized:

- whether Arabic is neutral `ar` or targeted to a specific market such as Iraq or Oman;
- whether Persian editorial dates use Solar Hijri everywhere or only in selected content;
- whether technical numeric values use Latin digits across all locales;
- whether public slugs remain shared Latin segments or are localized per language;
- what the language switcher does when an equivalent page is unavailable;
- which locale is used as `x-default`;
- which currencies and price-display rules are permitted per market;
- who approves Persian, English, and Arabic technical terminology;
- whether a CMS or repository-managed content files own long-form translations.

Record the confirmed answers in `DECISIONS.md`, then update the related source-of-truth document.

