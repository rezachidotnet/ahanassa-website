# Ahan Asa Website — Metadata Specification

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `METADATA_SPEC.md`  
> **Status:** Draft v1.0 — implementation contract for approval  
> **Last updated:** 2026-08-25  
> **Launch locale:** Persian (`fa-IR`), fully RTL  
> **Primary scope:** HTML title, meta description, canonical, robots, Open Graph, and social-share metadata

---

## 1. Purpose

This document defines how metadata must be authored, stored, generated, rendered, validated, and maintained across the Ahan Asa website.

It is an implementation contract for Claude Code, developers, SEO specialists, content editors, designers, and QA reviewers. It covers:

- HTML `<title>`;
- meta description;
- canonical URL;
- robots directives;
- Open Graph metadata;
- X/Twitter card metadata;
- locale metadata;
- dynamic metadata templates;
- social-share images;
- fallback and inheritance behavior;
- page-family rules;
- Next.js App Router implementation;
- quality assurance and change control.

This file does not replace:

- `SEO_KEYWORD_MAP.md` for keyword ownership;
- `SEO_PAGE_MAP.md` for search intent and page mapping;
- `ROUTES.md` for canonical paths and indexation states;
- `HREFLANG_CANONICAL.md` for multilingual equivalence;
- `STRUCTURED_DATA.md` for JSON-LD;
- `MEDIA_GUIDELINES.md` for the full media system;
- `COPY_GUIDELINES.md` for site-wide copy rules.

---

## 2. Brand and Search Positioning

All metadata must reinforce the approved position:

> Ahan Asa is a professional steel procurement-management partner that protects the client's commercial and project interests. It is not an online steel shop, price board, supplier marketplace, or commodity trading platform.

### 2.1 Approved identity

| Field | Approved value |
|---|---|
| Persian brand name | `آهن آسا` |
| Latin brand name | `Ahan Asa` |
| Domain | `ahanassa.com` |
| Brand promise | `ما مراقب سرمایه شما هستیم.` |
| Brand essence | `آسایش از خرید درست` |
| Primary service category | Steel procurement management and project purchasing support |
| Primary market | Iran |
| Launch language | Persian |
| Launch direction | RTL |
| Primary conversion | Sending an invoice, BOM, material list, or procurement request |

### 2.2 Metadata tone

Metadata must feel:

- precise;
- calm;
- protective;
- commercially intelligent;
- technically credible;
- premium but restrained;
- clear to non-expert buyers.

Metadata must not use:

- clickbait;
- artificial urgency;
- keyword stuffing;
- vague corporate superlatives;
- exaggerated certainty;
- unsupported market, geographic, inventory, price, or delivery claims.

### 2.3 Prohibited claims

Do not use any equivalent of the following unless a separately approved evidence record explicitly authorizes it:

- `کمترین قیمت` / lowest price;
- `بهترین قیمت بازار`;
- `تضمین قیمت`;
- `تضمین تحویل`;
- `بدون ریسک`;
- `موجودی قطعی`;
- `ارسال فوری`;
- `بهترین تأمین‌کننده آهن`;
- `قیمت لحظه‌ای آهن`;
- `فروش مستقیم کارخانه`;
- active coverage in Iraq, Oman, or GCC markets;
- unverified supplier, factory, certification, project, client, or inventory claims.

---

## 3. Source of Truth and Conflict Resolution

Metadata decisions follow this priority:

1. Explicit owner decisions in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `BRAND_GUIDELINES.md`
4. Approved `SITEMAP.md` and `ROUTES.md`
5. `SEO_STRATEGY.md`
6. `SEO_KEYWORD_MAP.md`
7. `SEO_PAGE_MAP.md`
8. `COPY_GUIDELINES.md`
9. `METADATA_SPEC.md`
10. Page-level content records and implementation

The canonical route, page identity, primary intent, metadata, H1, visible introduction, and internal-link anchors must describe the same subject.

If the approved route inventory conflicts across project documents, Claude Code must not publish duplicate variants. It must:

1. use a stable internal `pageKey`;
2. flag the conflicting routes;
3. obtain or apply the recorded route decision;
4. update `ROUTES.md`, `SITEMAP.md`, `SEO_PAGE_MAP.md`, redirects, and this file together.

---

## 4. Core Principles

### 4.1 One page, one metadata identity

Every canonical, indexable page requires a unique:

- title;
- description;
- canonical URL;
- primary search intent;
- social-share identity.

Do not reuse the homepage title or description as a site-wide fallback on published pages.

### 4.2 Human meaning before keyword coverage

The title and description must help a real visitor understand:

- what the page contains;
- whether it matches their need;
- why opening it is useful.

Use the mapped primary phrase naturally. Do not enumerate keyword variants.

### 4.3 Important meaning first

Place the decisive page subject toward the beginning of the title and description. Do not spend the beginning on generic brand language.

Homepage exception: the brand may appear first because the homepage owns brand/entity discovery.

### 4.4 Metadata must match visible content

Metadata must not promise information, inventory, prices, services, files, evidence, or geographic coverage that the page does not visibly provide.

### 4.5 No false control over search snippets

Search engines may rewrite title links and snippets. Character counts in this document are editorial targets, not guaranteed display limits.

---

## 5. Required Metadata Matrix

| Field | Indexable page | Noindex utility | Dynamic detail | Required rule |
|---|---:|---:|---:|---|
| HTML title | Yes | Yes | Yes | Unique and descriptive |
| Meta description | Yes | Yes | Yes | Accurate page summary |
| Canonical | Yes | Yes | Yes | Absolute approved HTTPS URL |
| Robots | Explicit | Explicit | Explicit | Derived from route manifest |
| `og:title` | Yes | Yes | Yes | May be slightly more editorial than HTML title |
| `og:description` | Yes | Yes | Yes | Share-focused, accurate summary |
| `og:url` | Yes | Yes | Yes | Must equal canonical |
| `og:type` | Yes | Yes | Yes | Determined by page family |
| `og:site_name` | Yes | Yes | Yes | `آهن آسا` |
| `og:locale` | Yes | Yes | Yes | `fa_IR` |
| `og:image` | Yes | Recommended | Yes | Absolute HTTPS URL |
| `og:image:alt` | Yes | Recommended | Yes | Describe image purpose/content |
| X/Twitter card | Yes | Recommended | Yes | `summary_large_image` by default |
| Hreflang | Only approved locales | No | Only approved locales | Never publish incomplete alternates |

---

## 6. HTML Title Specification

### 6.1 Format

Preferred formats:

```text
Homepage: آهن آسا | [primary positioning]
Inner page: [page subject] | آهن آسا
Detail page: [specific topic] | آهن آسا
```

Use the vertical bar `|` as the standard separator. Do not mix `-`, `–`, `—`, `•`, and `|` across templates.

### 6.2 Editorial budget

- Preferred working range: approximately 35–65 Persian characters including spaces.
- A shorter title is acceptable when it is complete and distinctive.
- A longer title is acceptable when removing text would materially reduce clarity.
- The linter must warn, not automatically rewrite, titles outside the working range.
- Never truncate source text with `...` inside the HTML title.

### 6.3 Title requirements

Every title must:

- uniquely identify the page;
- express the page's primary intent;
- use natural Persian;
- use the approved brand spelling `آهن آسا`;
- avoid repeating the same word unnecessarily;
- avoid all-caps Latin text;
- remain understandable outside the site's navigation context.

### 6.4 Title anti-patterns

Reject:

```text
خانه | آهن آسا
محصولات | آهن آسا
خدمات آهن آهن خرید آهن قیمت آهن | آهن آسا
بهترین و ارزان‌ترین خرید آهن با تضمین قیمت
آهن آسا | آهن آسا | مدیریت خرید آهن
```

### 6.5 Relationship to H1

The title and H1 may differ, but must share the same page intent.

- Title: concise search-result label.
- H1: primary on-page promise or question.
- They must not target different subjects.
- Exact duplication is allowed but not required.

Homepage example:

```text
Title: آهن آسا | مدیریت تأمین و خرید پروژه‌ای فولاد
H1: خرید آهن را به یک تصمیم مطمئن تبدیل کنید.
```

---

## 7. Meta Description Specification

### 7.1 Purpose

The description is a concise, accurate preview of the page. It should communicate the page's value without reading like an advertisement or a list of keywords.

### 7.2 Editorial budget

- Preferred working range: approximately 110–170 Persian characters including spaces.
- The range is not a search-engine limit.
- Descriptions may be truncated or replaced according to the query and device.
- The linter should warn on very short, very long, duplicate, or missing descriptions.

### 7.3 Recommended structure

Use one or two natural sentences containing:

1. the page subject;
2. the practical value or scope;
3. an optional low-pressure next step.

Example:

```text
آهن آسا نیاز فنی و تجاری پروژه، گزینه‌های تأمین و مسیر خرید فولاد را بررسی و هماهنگ می‌کند تا تصمیم خرید با کنترل بیشتری انجام شود.
```

### 7.4 Description rules

- Describe the actual page, not the whole company.
- Use the primary phrase naturally when it improves clarity.
- Avoid opening every description with the same sentence.
- Do not repeat the title word for word.
- Do not list material names unless the page genuinely covers them.
- Do not include phone numbers, temporary campaigns, volatile prices, or unverified response times.
- Do not use quotation marks merely to attract attention.
- Do not end with fake urgency such as `همین حالا بخرید`.

### 7.5 Dynamic descriptions

A dynamic page may be published only when a human-readable description can be produced from approved fields. Do not concatenate optional fields into broken or repetitive Persian.

Bad:

```text
خرید ورق ورق فولادی قیمت ورق مشخصات ورق تأمین ورق از آهن آسا
```

Good pattern:

```text
[categoryName] را از نظر مشخصات، مدارک موردنیاز و ریسک‌های خرید پروژه‌ای بررسی کنید و اطلاعات لازم برای ثبت درخواست را بشناسید.
```

---

## 8. Canonical URL Rules

### 8.1 Canonical origin

All absolute URLs must derive from one validated configuration value:

```text
NEXT_PUBLIC_SITE_URL=https://<approved-canonical-host>
```

The final choice between apex and `www` remains a deployment decision. Do not hardcode both forms.

### 8.2 Canonical requirements

- HTTPS only.
- Exactly one canonical per HTML page.
- Self-referencing canonical on every canonical page.
- Canonical must use the approved route and trailing-slash policy.
- `og:url` must equal the canonical.
- Internal links and XML sitemap entries must use the same URL.
- `/fa/...` must not canonicalize as a second Persian copy; it must redirect to the unprefixed Persian route if introduced as a legacy alias.

### 8.3 Query parameters

- Tracking parameters must not create new canonical identities.
- Filter, sort, search, pagination, preview, and campaign states follow `ROUTES.md` and `SITEMAP_ROBOTS_SPEC.md`.
- Never use canonical tags to conceal materially different pages.
- Never canonicalize an unpublished dynamic route to a parent page; return a true `404` instead.

---

## 9. Robots Metadata

### 9.1 Route-manifest ownership

Robots behavior must be derived from a controlled route manifest, not inferred from URL text at runtime.

Recommended states:

| Page state | Robots |
|---|---|
| Complete canonical content page | `index, follow` |
| Primary request form | `noindex, follow` |
| Confirmation/success page | `noindex, nofollow` |
| Preview/draft | `noindex, nofollow, noarchive` |
| Internal search/filter state | `noindex, follow` unless stricter rule approved |
| Error, maintenance, or secure utility | `noindex, nofollow` |
| Unpublished dynamic slug | Return `404`; do not render a noindex placeholder |

Default `index, follow` may be implicit in HTML, but the application content model should still store the intended indexation state for QA.

### 9.2 Critical rule

Do not block a URL in `robots.txt` when crawlers must see a `noindex` directive on that URL.

### 9.3 Meta keywords

Do not output `<meta name="keywords">`. Google does not use it for ranking or indexation.

---

## 10. Open Graph Specification

### 10.1 Required base properties

Every published shareable page must provide:

```html
<meta property="og:title" content="...">
<meta property="og:type" content="website">
<meta property="og:image" content="https://...">
<meta property="og:url" content="https://...">
```

The Ahan Asa implementation must also provide:

```html
<meta property="og:description" content="...">
<meta property="og:site_name" content="آهن آسا">
<meta property="og:locale" content="fa_IR">
<meta property="og:image:alt" content="...">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

### 10.2 Open Graph title

- May omit the brand suffix when `og:site_name` already identifies the brand.
- Should remain clear when displayed without surrounding page context.
- Preferred working range: 40–80 Persian characters.
- Must not introduce claims absent from the page.

### 10.3 Open Graph description

- May be slightly more editorial than the search description.
- Must accurately summarize the visible page.
- Preferred working range: 100–200 Persian characters.
- Avoid repeating the Open Graph title.

### 10.4 Open Graph types

| Page family | `og:type` |
|---|---|
| Homepage, hub, capability, about, contact, legal, request | `website` |
| Insight article | `article` |
| Resource detail with substantive editorial landing page | `article` |
| Verified project/case study | `article` when editorial metadata exists; otherwise `website` |
| Material or industry detail | `website` |

When `article` is used, add approved values where available:

- `article:published_time`;
- `article:modified_time`;
- `article:author` only for a real public author URL;
- `article:section`;
- restrained `article:tag` values from the controlled taxonomy.

Do not fabricate dates, authors, or categories.

### 10.5 Locale

- HTML locale: `fa-IR`.
- Open Graph locale: `fa_IR`.
- Do not add `og:locale:alternate` for English or Arabic until those locales are fully approved and public.

---

## 11. X/Twitter Card Specification

Default card:

```text
twitter:card = summary_large_image
```

Required fields:

- `twitter:title`;
- `twitter:description`;
- `twitter:image`;
- `twitter:image:alt`.

Rules:

- Reuse Open Graph title, description, and image unless a verified platform-specific reason requires an override.
- Add `twitter:site` only after an official account is approved.
- Do not publish placeholder handles.
- Do not use `summary` for pages whose main share asset is designed for the 1.91:1 format.

---

## 12. Social-Share Image System

### 12.1 Standard asset

| Property | Standard |
|---|---|
| Canvas | `1200 × 630 px` |
| Aspect ratio | `1.91:1` |
| Format | JPEG or PNG |
| Color space | sRGB |
| URL | Absolute HTTPS |
| Minimum variants | One verified site default plus approved page-family variants |

### 12.2 Default image direction

The default Ahan Asa image should use:

- Steel Navy `#0B2545`;
- Forge Copper `#B04A2F`;
- White `#FFFFFF`;
- the approved master icon or lockup;
- restrained steel/document-control visual language;
- generous negative space;
- no fake facility, supplier, inventory, truck, or project imagery.

### 12.3 Text and safe area

- Keep important content at least 72 px from every canvas edge.
- Keep the logo and core title inside a conservative central safe zone.
- Limit text to one concise title plus optional category label.
- Do not place meta descriptions, paragraphs, URLs, or CTAs in the image.
- Use the official Persian logo artwork; do not reconstruct its lettering with a web font.
- Ensure Persian joining, glyph shaping, punctuation, and direction render correctly.

### 12.4 Image hierarchy

Use the first available approved asset in this order:

1. page-specific verified project, guide, or category image;
2. approved page-family generated image;
3. default Ahan Asa brand image.

Never use:

- low-resolution images;
- a client logo without permission;
- confidential invoice/BOM text;
- supplier quotations or personal data;
- unlicensed stock media;
- an image that implies a capability or asset Ahan Asa does not own.

### 12.5 Alt text

`og:image:alt` must describe the image rather than repeat the page title mechanically.

Examples:

```text
هویت بصری آهن آسا در کنار نمایی انتزاعی از کنترل اسناد خرید فولاد
چک‌لیست مقایسه فنی و تجاری پیشنهادهای خرید فولاد
```

---

## 13. Page-Level Metadata Registry

The following is the working Persian metadata set for the current route contract. The final route path must be taken from the approved `ROUTES.md`; where project documents conflict, the metadata remains attached to the stable `pageKey` until the path is resolved.

### 13.1 Core pages

| `pageKey` | Current route | HTML title | Meta description | Robots | OG type |
|---|---|---|---|---|---|
| `home` | `/` | `آهن آسا | مدیریت تأمین و خرید پروژه‌ای فولاد` | `آهن آسا نیاز فنی و تجاری پروژه، گزینه‌های تأمین و مسیر خرید فولاد را بررسی و هماهنگ می‌کند تا تصمیم خرید با کنترل بیشتری انجام شود.` | Index, follow | website |
| `about` | `/about` | `درباره آهن آسا | مدیریت خرید پروژه‌ای فولاد` | `با رویکرد، اصول و نقش آهن آسا در مدیریت خرید پروژه‌ای فولاد آشنا شوید؛ روشی مبتنی بر بررسی فنی، مقایسه تجاری و کنترل فرآیند.` | Index, follow | website |
| `procurement` | `/procurement` | `مدیریت خرید آهن و فولاد پروژه‌ای | آهن آسا` | `مدیریت خرید آهن در آهن آسا از تعریف نیاز و ارزیابی گزینه‌های تأمین تا مقایسه پیشنهادها، کنترل مدارک و هماهنگی تحویل را پوشش می‌دهد.` | Index, follow | website |
| `procurementProcess` | `/procurement-process` | `فرآیند مدیریت خرید آهن؛ از نیاز تا تحویل | آهن آسا` | `مراحل همکاری با آهن آسا را از ارسال فاکتور یا لیست خرید تا بررسی نیاز، انتخاب مسیر تأمین، هماهنگی خرید و پیگیری تحویل ببینید.` | Index, follow | website |
| `steelProductsHub` | `/steel-products` | `گروه‌های کالایی فولاد برای خرید پروژه‌ای | آهن آسا` | `گروه‌های کالایی مورد تأیید برای خرید پروژه‌ای فولاد را همراه با اطلاعات موردنیاز، ملاحظات فنی و مسیر ثبت درخواست بررسی کنید.` | Index, follow | website |
| `industriesHub` | `/industries` | `مدیریت خرید فولاد برای پروژه‌ها و صنایع | آهن آسا` | `نیازهای متفاوت خرید فولاد در پروژه‌های ساختمانی، صنعتی و اجرایی را بشناسید و ببینید چه اطلاعاتی برای بررسی درخواست لازم است.` | Index, follow | website |
| `projectsHub` | `/projects` | `تجربه‌ها و شواهد خرید پروژه‌ای فولاد | آهن آسا` | `نمونه‌های تأییدشده از مسئله خرید، دامنه همکاری و روش کنترل فنی و تجاری آهن آسا را در پروژه‌های قابل انتشار بررسی کنید.` | Index only with substantive verified evidence | website |
| `insightsHub` | `/insights` | `راهنمای خرید و تأمین آهن و فولاد | آهن آسا` | `راهنماهای کاربردی آهن آسا درباره تعریف نیاز، مقایسه پیشنهادها، ارزیابی تأمین‌کننده، کنترل مدارک و برنامه‌ریزی تحویل فولاد.` | Index, follow | website |
| `resourcesHub` | `/resources` | `منابع و چک‌لیست‌های خرید فولاد | آهن آسا` | `به منابع تأییدشده، چک‌لیست‌ها و ابزارهای کاربردی برای آماده‌سازی درخواست و کنترل بهتر فرآیند خرید پروژه‌ای فولاد دسترسی پیدا کنید.` | Index, follow | website |
| `faq` | `/faq` | `پرسش‌های متداول مدیریت خرید آهن | آهن آسا` | `پاسخ پرسش‌های رایج درباره ثبت درخواست، مدارک لازم، مقایسه پیشنهادها، کنترل مشخصات، هماهنگی خرید و تحویل فولاد را بخوانید.` | Index, follow | website |
| `contact` | `/contact` | `تماس با آهن آسا | مشاوره خرید فولاد` | `برای پرسش‌های عمومی یا گفت‌وگو درباره مدیریت خرید پروژه‌ای فولاد با آهن آسا تماس بگیرید؛ برای درخواست خرید، فاکتور یا لیست خود را ارسال کنید.` | Index, follow | website |
| `request` | `/request` | `ارسال فاکتور یا لیست خرید | آهن آسا` | `فاکتور، BOM یا لیست خرید فولاد پروژه را ارسال کنید تا نیاز فنی و تجاری، اطلاعات لازم و مسیر مناسب بررسی درخواست مشخص شود.` | Noindex, follow | website |
| `privacy` | `/privacy` | `حریم خصوصی و اطلاعات درخواست‌ها | آهن آسا` | `نحوه جمع‌آوری، استفاده، نگهداری و حفاظت از اطلاعات تماس و مدارک ارسالی در وب‌سایت آهن آسا را بررسی کنید.` | Index, follow after legal approval | website |
| `terms` | `/terms` | `شرایط استفاده از وب‌سایت | آهن آسا` | `شرایط استفاده از وب‌سایت، ثبت درخواست خرید، ارسال مدارک و حدود مسئولیت‌های مرتبط با خدمات آنلاین آهن آسا را مطالعه کنید.` | Index only when substantive and legally approved | website |

### 13.2 Operational and system pages

| Page/state | HTML title | Description | Robots | Canonical/OG rule |
|---|---|---|---|---|
| Request confirmation | `درخواست شما دریافت شد | آهن آسا` | `درخواست شما ثبت شد. ادامه پیگیری فقط از مسیرهای تأییدشده آهن آسا انجام می‌شود.` | Noindex, nofollow | May omit canonical or self-canonical according to technical policy; never enter sitemap |
| Request failure | `ارسال درخواست کامل نشد | آهن آسا` | `ارسال درخواست کامل نشد. اطلاعات را بررسی کنید یا از مسیر تماس تأییدشده کمک بگیرید.` | Noindex, nofollow | No social indexing |
| 404 | `صفحه پیدا نشد | آهن آسا` | `نشانی واردشده معتبر نیست یا صفحه موردنظر در دسترس نیست.` | Noindex, nofollow | No canonical to homepage |
| 500/error | `خطایی رخ داد | آهن آسا` | `نمایش این بخش با خطا روبه‌رو شد. دوباره تلاش کنید یا به صفحه اصلی بازگردید.` | Noindex, nofollow | No canonical to homepage |
| Maintenance | `وب‌سایت موقتاً در دسترس نیست | آهن آسا` | `وب‌سایت آهن آسا موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.` | Noindex, nofollow | Return correct maintenance status; do not index |
| Draft/preview | Content title plus `پیش‌نمایش` | Internal only | Noindex, nofollow, noarchive | Must not share production canonical as an indexable duplicate |

The final public Persian labels remain governed by `COPY_GUIDELINES.md` and `CTA_STRATEGY.md`.

---

## 14. Dynamic Page Templates

### 14.1 Material category

```text
Title: [نام گروه کالا]؛ راهنمای خرید پروژه‌ای | آهن آسا
Description: [نام گروه کالا] را از نظر مشخصات، مدارک موردنیاز و ریسک‌های خرید پروژه‌ای بررسی کنید و اطلاعات لازم برای ثبت درخواست را بشناسید.
OG title: راهنمای خرید پروژه‌ای [نام گروه کالا]
OG type: website
```

Publication requirements:

- approved category name and slug;
- unique intent and substantive content;
- verified scope;
- no implied inventory, price, agency, brand authorization, or guaranteed supply;
- unique title and description after Persian rendering.

### 14.2 Industry/application page

```text
Title: مدیریت خرید فولاد برای [نام صنعت/کاربرد] | آهن آسا
Description: ملاحظات فنی، تجاری و اجرایی خرید فولاد برای [نام صنعت/کاربرد] را بشناسید و اطلاعات لازم برای بررسی یک درخواست پروژه‌ای را آماده کنید.
OG title: خرید پروژه‌ای فولاد برای [نام صنعت/کاربرد]
OG type: website
```

Do not generate city, region, or industry pages without unique content and approved operational relevance.

### 14.3 Project/case study

```text
Title: [عنوان تأییدشده پروژه یا مسئله] | تجربه آهن آسا
Description: [مسئله خرید]، دامنه همکاری آهن آسا و روش تأییدشده کنترل فنی و تجاری در [عنوان عمومی پروژه] را بررسی کنید.
OG title: [عنوان کوتاه و تأییدشده مطالعه موردی]
OG type: article
```

Required source fields:

- approved public title;
- approved anonymization when needed;
- verified scope and result;
- publication permission;
- approved image;
- publication and update dates when `article` is used.

Do not expose confidential project identifiers, clients, prices, quantities, documents, locations, or outcomes in metadata.

### 14.4 Insight article

```text
Title: [عنوان مقاله] | آهن آسا
Description: [خلاصه مستقل و دقیق مقاله که پرسش اصلی، دامنه پاسخ و فایده عملی آن را توضیح می‌دهد.]
OG title: [عنوان اشتراک‌گذاری؛ در صورت نیاز کوتاه‌تر از عنوان مقاله]
OG type: article
```

Requirements:

- approved title and search intent;
- original description, not the first paragraph copied blindly;
- publication and modification dates;
- real reviewed author or organization attribution;
- no unsupported forecasts or standards claims.

### 14.5 Resource detail

```text
Title: [نام منبع یا چک‌لیست] | منابع آهن آسا
Description: [نوع منبع] برای [مخاطب/کاربرد]؛ شامل [محتوای واقعی و تأییدشده] و اطلاعات نسخه یا تاریخ به‌روزرسانی.
OG title: [نام منبع]
OG type: article
```

The metadata must not promise a download unless the file exists and its access flow works.

---

## 15. Data Model

Recommended content contract:

```ts
type Indexation = 'index-follow' | 'noindex-follow' | 'noindex-nofollow';

type OpenGraphType = 'website' | 'article';

type SeoMetadata = {
  pageKey: string;
  locale: 'fa-IR';
  title: string;
  description: string;
  canonicalPath: `/${string}` | '/';
  indexation: Indexation;
  openGraph: {
    title?: string;
    description?: string;
    type: OpenGraphType;
    image?: {
      src: string;
      width: 1200;
      height: 630;
      alt: string;
    };
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
  twitter?: {
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
  };
  alternates?: Array<{
    locale: string;
    path: string;
  }>;
};
```

### 15.1 Validation schema

At build time, validate:

- non-empty strings after trimming;
- unique `pageKey`;
- unique canonical path per locale;
- unique title and description among indexable pages;
- title/description editorial-budget warnings;
- no unresolved template tokens such as `[نام گروه کالا]`;
- valid absolute resolved canonical and image URLs;
- indexation state matching route policy;
- image dimensions and alt text;
- article fields only with valid ISO dates;
- no unpublished alternates;
- no confidential data patterns.

---

## 16. Next.js App Router Implementation

### 16.1 Root layout

Use a single metadata base and site-wide defaults. Page metadata must override the default title and description.

```ts
import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!siteUrl) {
  throw new Error('NEXT_PUBLIC_SITE_URL is required');
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'آهن آسا | مدیریت تأمین و خرید پروژه‌ای فولاد',
    template: '%s | آهن آسا',
  },
  description:
    'آهن آسا نیاز فنی و تجاری پروژه، گزینه‌های تأمین و مسیر خرید فولاد را بررسی و هماهنگ می‌کند.',
  applicationName: 'آهن آسا',
  openGraph: {
    siteName: 'آهن آسا',
    locale: 'fa_IR',
    type: 'website',
    images: [
      {
        url: '/og/default-1200x630.jpg',
        width: 1200,
        height: 630,
        alt: 'هویت بصری آهن آسا و مدیریت خرید پروژه‌ای فولاد',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
};
```

Do not pass a title already containing `| آهن آسا` into a template that appends it again. The homepage should use an absolute title override when the brand-first format is required.

### 16.2 Static page example

```ts
export const metadata: Metadata = {
  title: 'مدیریت خرید آهن و فولاد پروژه‌ای',
  description:
    'مدیریت خرید آهن در آهن آسا از تعریف نیاز و ارزیابی گزینه‌های تأمین تا مقایسه پیشنهادها، کنترل مدارک و هماهنگی تحویل را پوشش می‌دهد.',
  alternates: {
    canonical: '/procurement',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'مدیریت خرید پروژه‌ای آهن و فولاد',
    description:
      'از تعریف نیاز تا ارزیابی تأمین، کنترل مدارک و هماهنگی تحویل؛ رویکرد آهن آسا به مدیریت خرید پروژه‌ای فولاد.',
    url: '/procurement',
    type: 'website',
  },
};
```

### 16.3 Dynamic page example

```ts
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublishedCategory(slug);

  if (!category) notFound();

  const path = `/steel-products/${category.slug}`;

  return {
    title: `${category.nameFa}؛ راهنمای خرید پروژه‌ای`,
    description: category.seoDescription,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      title: `راهنمای خرید پروژه‌ای ${category.nameFa}`,
      description: category.ogDescription ?? category.seoDescription,
      url: path,
      type: 'website',
      images: [category.ogImage],
    },
  };
}
```

Dynamic metadata and page rendering must load the same approved content record. Do not let metadata resolve for a page that later renders `not found` or unpublished content.

### 16.4 File-based image generation

Next.js file conventions such as `opengraph-image` and `twitter-image` may be used for static or generated assets. Generated images must:

- use the approved brand system;
- load approved Persian font files locally;
- render correct Persian shaping;
- be deterministic for the same content version;
- fail the build or fall back safely when required assets are absent;
- never include confidential source fields.

### 16.5 Server rendering

Critical metadata must be present in server-rendered HTML. Do not inject or replace it only after client-side hydration.

---

## 17. Inheritance and Fallback Rules

### 17.1 Allowed inheritance

These values may inherit from the root:

- metadata base;
- site name;
- locale;
- default OG image;
- X/Twitter card type;
- favicon and app icons;
- generic verification tags.

### 17.2 Forbidden fallback behavior

Published pages must not silently inherit:

- homepage title;
- homepage description;
- homepage canonical;
- `index, follow` when the route is a utility page;
- article dates from another record;
- localized alternates that do not exist;
- a misleading category or project image.

Missing required page metadata must fail content validation for production.

---

## 18. Localization and Direction

### 18.1 Persian launch

- Document language: `<html lang="fa" dir="rtl">` or the approved BCP 47 variant used consistently by the application.
- Content locale: `fa-IR`.
- Open Graph locale: `fa_IR`.
- Persian routes are unprefixed.
- Persian punctuation and joining must be preserved.
- Avoid mixing Persian and Latin words unless the term is necessary and familiar.

### 18.2 Future locales

When English or Arabic is approved:

- every locale gets human-authored title, description, and OG copy;
- do not translate keywords literally without localized search research;
- canonical points to the current-language page;
- hreflang points only to real, indexable equivalents;
- missing translations are omitted, not filled with Persian content;
- `x-default` behavior follows `HREFLANG_CANONICAL.md`;
- Open Graph alternates use the correct underscore locale syntax.

---

## 19. Sensitive Data and Privacy

Metadata, URLs, social images, analytics payloads, and structured data must never contain:

- customer names without permission;
- personal phone numbers or emails;
- invoice numbers;
- request identifiers;
- uploaded file names;
- material quantities tied to a confidential request;
- quotation values, supplier prices, or commercial terms;
- internal project codes;
- authentication tokens;
- unpublished client, supplier, or project details.

This rule applies to confirmation pages and preview deployments as well as indexable pages.

---

## 20. CMS and Editorial Workflow

### 20.1 Required editor fields

For every indexable content record:

- page title/H1;
- SEO title;
- meta description;
- canonical slug/path;
- primary intent or mapped page key;
- indexation state;
- OG title override, optional;
- OG description override, optional;
- OG image and alt text;
- publication state;
- publication date and modified date for articles;
- reviewer/approval state.

### 20.2 Preview

The editor preview must show:

- search-result-style title and description;
- mobile and desktop truncation risk as an approximation, not a guarantee;
- social card preview;
- canonical URL;
- robots state;
- unresolved validation warnings.

### 20.3 Approval

Metadata may reach production only when:

1. page copy is approved;
2. route and indexation state are approved;
3. SEO intent is mapped;
4. claims are verified;
5. image rights and privacy are cleared;
6. QA passes.

---

## 21. Automated Validation

The build or CI pipeline should fail on:

- missing title or description on a publishable page;
- duplicate canonical URL;
- non-HTTPS production canonical;
- canonical host mismatch;
- unresolved template placeholder;
- missing dynamic record;
- `index` on a draft, confirmation, preview, secure, or error route;
- unpublished locale alternate;
- missing OG image on an indexable detail page with no valid fallback;
- invalid article date;
- a production route with placeholder copy;
- sensitive-data patterns in metadata fields.

The pipeline should warn on:

- duplicate or near-duplicate titles/descriptions;
- titles or descriptions outside the editorial budget;
- title/H1 intent mismatch;
- missing image alt text;
- default OG image used on a high-value detail page;
- stale `modifiedTime` after a substantive update;
- Open Graph copy identical to an unsuitable search snippet;
- unapproved claims or geographic terms.

Do not auto-rewrite approved Persian metadata in CI.

---

## 22. Manual QA Checklist

For every representative page family, verify:

- [ ] One HTML title exists.
- [ ] Title is unique, natural, and intent-aligned.
- [ ] Description is unique and accurately summarizes visible content.
- [ ] Canonical is absolute, HTTPS, and resolves to the approved URL.
- [ ] Canonical, `og:url`, sitemap URL, and internal links agree.
- [ ] Robots state matches the route manifest.
- [ ] Indexable pages return `200` and are not blocked from crawling.
- [ ] Unpublished slugs return a genuine `404`.
- [ ] `/fa` does not expose a duplicate Persian site.
- [ ] `og:title`, `og:description`, `og:image`, and `og:image:alt` exist.
- [ ] OG image is 1200 × 630, readable, and correctly branded.
- [ ] Persian text in generated images is correctly shaped and ordered.
- [ ] X/Twitter card metadata resolves to the intended large image.
- [ ] Article dates and authors are real and visible where required.
- [ ] No unsupported alternate locale is emitted.
- [ ] No confidential data appears in head markup or social images.
- [ ] Search and social previews are checked using current validation tools.
- [ ] Page source, not only the hydrated DOM, contains critical metadata.

---

## 23. Monitoring and Maintenance

After launch:

- monitor Google Search Console for duplicate titles, canonical discrepancies, indexing exclusions, and unexpected snippet behavior;
- inspect representative URLs after route, CMS, or deployment changes;
- review click-through performance by query and page before rewriting metadata;
- change one meaningful variable at a time when testing title or description improvements;
- retain a change record with date, page, old value, new value, reason, and observed outcome;
- refresh metadata when page scope changes materially;
- do not change canonical slugs solely to improve wording;
- ensure removed or merged pages follow `REDIRECTS.md`.

Search-engine rewrites are not automatically defects. Investigate alignment among title, H1, visible introduction, anchors, and page intent before changing copy.

---

## 24. Claude Code Rules

Claude Code must:

1. Read the approved route and SEO maps before implementing metadata.
2. Generate metadata from a typed, centralized content source.
3. Use one canonical-origin configuration value.
4. Preserve Persian as the unprefixed Phase 1 locale.
5. Keep titles, descriptions, canonicals, robots, OG, and social cards aligned.
6. Return `404` for unpublished dynamic records.
7. Exclude drafts, filters, confirmations, utilities, and previews from indexation.
8. Validate unique metadata during build or CI.
9. Use only approved claims, images, authors, dates, and evidence.
10. Record material metadata changes in `CHANGELOG.md`.
11. Update the SEO page map when a page's primary intent changes.
12. Preserve sensitive-data boundaries in every metadata surface.

Claude Code must not:

- generate pages or metadata from keyword lists alone;
- invent service, inventory, price, supplier, market, or delivery claims;
- publish `meta keywords`;
- duplicate homepage metadata across routes;
- use a canonical tag as a substitute for redirects or correct routing;
- canonicalize missing pages to the homepage;
- create `/fa` duplicates;
- emit hreflang for incomplete locales;
- place customer or request data in the document head;
- reconstruct the approved Persian logo as ordinary type inside OG images;
- publish placeholder titles such as `Page`, `Home`, `Coming Soon`, or `Untitled`;
- silently resolve route conflicts that affect SEO.

---

## 25. Acceptance Criteria

This specification is ready for implementation when:

- [ ] The canonical host is approved.
- [ ] The route conflict, if any, between sitemap and route documents is resolved.
- [ ] Every launch page has an approved `pageKey`, route, title, description, robots state, and OG type.
- [ ] Homepage metadata is approved against the homepage copy.
- [ ] Dynamic metadata fields exist in the content model.
- [ ] The default OG image is approved and exported.
- [ ] Page-family OG templates are designed or a valid default fallback is accepted.
- [ ] Indexation rules match `ROUTES.md` and `SITEMAP_ROBOTS_SPEC.md`.
- [ ] Future locales remain disabled until complete.
- [ ] CI validation and representative QA tests pass.
- [ ] No metadata contains unsupported claims or sensitive data.

---

## 26. Open Decisions

| Decision | Current state | Owner/document |
|---|---|---|
| Canonical apex vs `www` host | `TBD` | Technical/deployment decision |
| Final route set where `SITEMAP.md` and `ROUTES.md` differ | `TBD` | Project owner + SEO + technical |
| Final homepage primary keyword | Pending SEO-map approval | `SEO_KEYWORD_MAP.md` / `SEO_PAGE_MAP.md` |
| Final launch material categories | `TBD` | Business owner + content model |
| Public Projects launch and project claims | Conditional | Business/legal/content approval |
| Default OG image artwork | Pending design approval | Brand + media owner |
| Page-family OG image templates | Pending design decision | Design system + media guidelines |
| Official social account handle | Not approved | Brand owner |
| English and Arabic launch | Reserved | Localization decision |
| Legal page wording and indexation readiness | Pending legal approval | Legal owner |
| Resource gating and download behavior | Pending | Content/form architecture |

Unresolved items must remain explicit. They must not be filled with assumptions in production.

---

## 27. Reference Basis

This specification follows these external implementation principles:

- Google may create title links from several page signals; titles should be descriptive and concise.
- Google may create snippets from page content and may use the meta description when it better represents the page.
- Search display has no guaranteed character limit; truncation varies by device and context.
- Canonical signals should be consistent across redirects, `rel="canonical"`, internal links, and XML sitemap URLs.
- Open Graph requires `og:title`, `og:type`, `og:image`, and `og:url` as its core properties.
- Next.js App Router metadata should use the Metadata API, `generateMetadata`, or supported metadata file conventions.

Official references:

- Google Search Central — Title links: `https://developers.google.com/search/docs/appearance/title-link`
- Google Search Central — Snippets and meta descriptions: `https://developers.google.com/search/docs/appearance/snippet`
- Google Search Central — Canonical URLs: `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Google Search Central — Robots meta tags: `https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag`
- Open Graph protocol: `https://ogp.me/`
- Next.js — `generateMetadata`: `https://nextjs.org/docs/app/api-reference/functions/generate-metadata`
- Next.js — Metadata and OG images: `https://nextjs.org/docs/app/getting-started/metadata-and-og-images`

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Brand Approval | TBD | Pending | — |
| Content/SEO Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |
| Legal/Privacy Approval | TBD | Pending | — |

---

**End of `METADATA_SPEC.md`**
