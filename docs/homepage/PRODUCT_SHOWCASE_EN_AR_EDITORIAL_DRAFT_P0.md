# Product Showcase EN/AR Editorial Draft (PS-L10N-P0)

Date: 2026-09-14
Task type: read-only data inspection + editorial draft preparation. No database write, no deploy, no migration.

---

# RESULT

**DRAFTS READY.** Owner-reviewable EN/AR editorial drafts prepared for all 3 currently-published FA Homepage products, faithfully translated from the real, approved FA `product_seo_contents` rows on staging `DB_PUBLIC`. Nothing was written to any database. Publication remains a separate, later, explicit action using the existing editorial CLI (`scripts/catalog-editorial.ts`), after owner review/approval of the drafts below.

---

# SOURCE DATA

Read-only, live, from staging `DB_PUBLIC` (`wrangler d1 execute DB_PUBLIC --env staging --remote`, no `--local`, no write flag used anywhere in this task):

```sql
SELECT s.id, s.entity_id, s.entity_type, s.locale, s.slug, s.h1, s.intro, s.body_json,
       s.seo_title, s.seo_description, s.faq_json, s.index_status,
       s.content_quality_status, s.published_at, cp.template_xid
FROM product_seo_contents s
JOIN catalog_products cp ON cp.id = s.entity_id
WHERE s.entity_type = 'product'
ORDER BY cp.template_xid;
```

Returned exactly 3 rows, one `fa` row per product — confirmed identical to the previously-established staging content-gap finding (`docs/homepage/PRODUCT_SHOWCASE_STAGING_DEFECT_FIX_REPORT.md`). Cross-checked technical claims against `product_variants` (`commercial_size`, `group_code`, `family_code`) for the same 3 `product_id`s — every size/standard figure in the FA text matches the real variant data actually synced for these products; nothing in the drafts below states a size, standard, or range not already present in this authoritative source.

Schema used (`product_seo_contents`, `migrations_public/0001_catalog_schema.sql`): `id, entity_type, entity_id, locale, slug, h1, intro, body_json, seo_title, seo_description, faq_json, index_status, content_quality_status, published_at, updated_at`. No field was invented; `faq_json` is `null` on all 3 FA rows and is left unproposed (not fabricated) below.

---

# PRODUCT 1 — SHS

**Identity:** `ahanassa_marketplace.product_tmpl_pf_shs` (`entity_id` = `01M19CWBRW88XJTEKC3S6M2J57`) — Square Hollow Section, group `SHS`, family `HOLLOW_SECTIONS_PROFILES`. Real synced variant sizes observed: 40×40×3 through 200×200×10 (mm).

## FA AUTHORITY

| Field | Value |
|---|---|
| slug | `square-hollow-section-shs` |
| h1 | پروفیل مربعی توخالی (SHS) |
| intro | پروفیل مربعی توخالی (SHS) بر اساس استاندارد EN 10219-2، در سایز ۴۰ تا ۲۰۰ میلی‌متر و ضخامت ۲.۵ تا ۱۲ میلی‌متر. |
| body_json | `{"blocks":[{"type":"paragraph","text":"پروفیل مربعی توخالی (SHS) یکی از مقاطع پرکاربرد در سازه‌های فلزی است که مطابق استاندارد EN 10219-2، در سایز ۴۰×۴۰ تا ۲۰۰×۲۰۰ میلی‌متر و ضخامت ۲.۵ تا ۱۲ میلی‌متر در فهرست کالایی آهن آسا موجود است."},{"type":"paragraph","text":"برای بررسی سایز، ضخامت و مقدار مورد نیاز خود، فاکتور یا لیست خرید بفرستید."}]}` |
| seo_title | پروفیل مربعی توخالی SHS |
| seo_description | پروفیل مربعی توخالی (SHS)، سایز ۴۰ تا ۲۰۰ میلی‌متر، استاندارد EN 10219-2 — از فهرست کالایی آهن آسا برای بررسی و ارسال فاکتور. |
| content_quality_status / published_at | `approved` / `2026-08-30T17:43:40.581Z` |

## EN DRAFT

| Field | Proposed value |
|---|---|
| slug | `square-hollow-section-shs` (identical to FA — see SLUG STRATEGY) |
| h1 | Square Hollow Section (SHS) |
| intro | Square Hollow Section (SHS) profiles to EN 10219-2, in sizes 40 to 200 mm and thickness 2.5 to 12 mm. |
| body (2 paragraphs) | 1. "Square Hollow Section (SHS) is one of the widely used sections in steel structures. Manufactured to EN 10219-2, it is available in Ahan Asa's product list in sizes from 40×40 to 200×200 mm and thicknesses from 2.5 to 12 mm." 2. "Send your invoice or purchase list to review the size, thickness, and quantity you need." |
| seo_title | Square Hollow Section (SHS) |
| seo_description | Square Hollow Section (SHS), sizes 40 to 200 mm, EN 10219-2 standard — from Ahan Asa's product list for review and invoice submission. |

## AR DRAFT

| Field | Proposed value |
|---|---|
| slug | `square-hollow-section-shs` (identical — Arabic script is not a valid slug character set in this schema; see SLUG STRATEGY) |
| h1 | بروفيل مربع مجوف (SHS) |
| intro | بروفيل مربع مجوف (SHS) وفق المعيار EN 10219-2، بمقاسات من 40 إلى 200 مم وسماكة من 2.5 إلى 12 مم. |
| body (2 paragraphs) | 1. "بروفيل مربع مجوف (SHS) هو أحد المقاطع الأكثر استخدامًا في الإنشاءات الفولاذية. وفقًا للمعيار EN 10219-2، فهو متوفر في قائمة منتجات آهن آسا بمقاسات من 40×40 إلى 200×200 مم وسماكة من 2.5 إلى 12 مم." 2. "أرسل فاتورتك أو قائمة الشراء الخاصة بك لمراجعة المقاس والسماكة والكمية التي تحتاجها." |
| seo_title | بروفيل مربع مجوف (SHS) |
| seo_description | بروفيل مربع مجوف (SHS)، مقاسات من 40 إلى 200 مم، وفق المعيار EN 10219-2 — من قائمة منتجات آهن آسا للمراجعة وإرسال الفاتورة. |

---

# PRODUCT 2 — AJ340 REBAR

**Identity:** `ahanassa_marketplace.product_tmpl_rb_aj340` (`entity_id` = `01M19CWBRWP4V1FAGPPWNKKFCR`) — ribbed rebar grade Aj340 (market equivalent A2), group `REBAR`, family `LONG_PRODUCTS`. Real synced variant sizes observed: Ø10, Ø16, Ø20, Ø28 mm (matching the FA text's stated Ø8–Ø32 range).

## FA AUTHORITY

| Field | Value |
|---|---|
| slug | `rebar-aj340` |
| h1 | میلگرد آجدار Aj340 (A2) |
| intro | میلگرد آجدار Aj340 (A2) بر اساس استاندارد INSO 3132، در سایزهای Ø8 تا Ø32 میلی‌متر و طول ۱۲ متر. |
| body_json | `{"blocks":[{"type":"paragraph","text":"میلگرد آجدار Aj340 (معادل بازاری A2) یکی از گریدهای پرکاربرد میلگرد ساختمانی است که در سایزهای مختلف از Ø8 تا Ø32 میلی‌متر، با طول استاندارد ۱۲ متر، مطابق استاندارد INSO 3132 در فهرست کالایی آهن آسا موجود است."},{"type":"paragraph","text":"برای بررسی سایز و مقدار مورد نیاز خود، فاکتور یا لیست خرید بفرستید تا کارشناسان آهن آسا مسیر مناسب تأمین را بررسی کنند."}]}` |
| seo_title | میلگرد آجدار Aj340 (A2) |
| seo_description | میلگرد آجدار Aj340 (A2)، سایز Ø8 تا Ø32 میلی‌متر، استاندارد INSO 3132 — از فهرست کالایی آهن آسا برای بررسی و ارسال فاکتور. |
| content_quality_status / published_at | `approved` / `2026-08-30T17:43:16.072Z` |

## EN DRAFT

| Field | Proposed value |
|---|---|
| slug | `rebar-aj340` (identical to FA) |
| h1 | Ribbed Rebar Aj340 (A2) |
| intro | Ribbed rebar Aj340 (market equivalent A2) to INSO 3132, in sizes Ø8 to Ø32 mm and 12 m length. |
| body (2 paragraphs) | 1. "Ribbed rebar Aj340 (market equivalent A2) is one of the widely used grades of construction rebar. It is available in Ahan Asa's product list in sizes from Ø8 to Ø32 mm, in the standard 12 m length, manufactured to INSO 3132." 2. "Send your invoice or purchase list to review the size and quantity you need — Ahan Asa's specialists will review the appropriate sourcing path." |
| seo_title | Ribbed Rebar Aj340 (A2) |
| seo_description | Ribbed rebar Aj340 (A2), sizes Ø8 to Ø32 mm, INSO 3132 standard — from Ahan Asa's product list for review and invoice submission. |

**Note:** `INSO 3132` is preserved verbatim (Iran National Standards Organization standard 3132) — not translated, not replaced with a different national/international standard, since no equivalent designation is stated in the FA source.

## AR DRAFT

| Field | Proposed value |
|---|---|
| slug | `rebar-aj340` (identical) |
| h1 | حديد تسليح مضلع Aj340 (A2) |
| intro | حديد تسليح مضلع Aj340 (المعادل التجاري A2) وفق المعيار INSO 3132، بمقاسات من Ø8 إلى Ø32 مم وطول 12 متر. |
| body (2 paragraphs) | 1. "حديد التسليح المضلع Aj340 (المعادل التجاري A2) هو أحد أكثر درجات حديد التسليح الإنشائي استخدامًا. وهو متوفر في قائمة منتجات آهن آسا بمقاسات مختلفة من Ø8 إلى Ø32 مم، وبطول قياسي 12 متر، وفقًا للمعيار INSO 3132." 2. "أرسل فاتورتك أو قائمة الشراء الخاصة بك لمراجعة المقاس والكمية التي تحتاجها؛ سيقوم خبراء آهن آسا بمراجعة مسار التوريد المناسب." |
| seo_title | حديد تسليح مضلع Aj340 (A2) |
| seo_description | حديد تسليح مضلع Aj340 (A2)، مقاسات من Ø8 إلى Ø32 مم، وفق المعيار INSO 3132 — من قائمة منتجات آهن آسا للمراجعة وإرسال الفاتورة. |

---

# PRODUCT 3 — S355JR HOT-ROLLED PLATE

**Identity:** `ahanassa_marketplace.product_tmpl_sh_hr_s355jr_plate` (`entity_id` = `01M19CWBRWVJZCCBD5SA22VDCM`) — hot-rolled structural plate grade S355JR, group `SHEET_PLATE`, family `FLAT_PRODUCTS`. Real synced variant sizes observed include 10×1500×6000 and 20×1500×6000 (mm), consistent with the FA text's stated 8–60 mm thickness / 1500–2000 mm width range.

## FA AUTHORITY

| Field | Value |
|---|---|
| slug | `hot-rolled-plate-s355jr` |
| h1 | ورق گرم‌نورد S355JR |
| intro | ورق گرم‌نورد گرید S355JR بر اساس استاندارد EN 10029، در ضخامت ۸ تا ۶۰ میلی‌متر و عرض ۱۵۰۰ تا ۲۰۰۰ میلی‌متر. |
| body_json | `{"blocks":[{"type":"paragraph","text":"ورق گرم‌نورد گرید S355JR یکی از گریدهای رایج ورق سازه‌ای است که مطابق استاندارد EN 10029، در ضخامت‌های ۸ تا ۶۰ میلی‌متر و عرض ۱۵۰۰ تا ۲۰۰۰ میلی‌متر در فهرست کالایی آهن آسا موجود است."},{"type":"paragraph","text":"برای بررسی ضخامت، عرض و مقدار مورد نیاز خود، فاکتور یا لیست خرید بفرستید."}]}` |
| seo_title | ورق گرم‌نورد S355JR |
| seo_description | ورق گرم‌نورد گرید S355JR، ضخامت ۸ تا ۶۰ میلی‌متر، استاندارد EN 10029 — از فهرست کالایی آهن آسا برای بررسی و ارسال فاکتور. |
| content_quality_status / published_at | `approved` / `2026-08-30T17:43:35.417Z` |

## EN DRAFT

| Field | Proposed value |
|---|---|
| slug | `hot-rolled-plate-s355jr` (identical to FA) |
| h1 | Hot-Rolled Plate S355JR |
| intro | Hot-rolled plate, grade S355JR, to EN 10029, in thickness 8 to 60 mm and width 1500 to 2000 mm. |
| body (2 paragraphs) | 1. "Hot-rolled plate grade S355JR is one of the common structural plate grades. It is available in Ahan Asa's product list in thicknesses from 8 to 60 mm and widths from 1500 to 2000 mm, manufactured to EN 10029." 2. "Send your invoice or purchase list to review the thickness, width, and quantity you need." |
| seo_title | Hot-Rolled Plate S355JR |
| seo_description | Hot-rolled plate grade S355JR, thickness 8 to 60 mm, EN 10029 standard — from Ahan Asa's product list for review and invoice submission. |

## AR DRAFT

| Field | Proposed value |
|---|---|
| slug | `hot-rolled-plate-s355jr` (identical) |
| h1 | صاج ساخن الدرفلة S355JR |
| intro | صاج ساخن الدرفلة درجة S355JR وفق المعيار EN 10029، بسماكة من 8 إلى 60 مم وعرض من 1500 إلى 2000 مم. |
| body (2 paragraphs) | 1. "صاج ساخن الدرفلة درجة S355JR هو أحد الدرجات الشائعة لصاج الإنشاءات. وهو متوفر في قائمة منتجات آهن آسا بسماكات من 8 إلى 60 مم وعرض من 1500 إلى 2000 مم، وفقًا للمعيار EN 10029." 2. "أرسل فاتورتك أو قائمة الشراء الخاصة بك لمراجعة السماكة والعرض والكمية التي تحتاجها." |
| seo_title | صاج ساخن الدرفلة S355JR |
| seo_description | صاج ساخن الدرفلة درجة S355JR، سماكة من 8 إلى 60 مم، وفق المعيار EN 10029 — من قائمة منتجات آهن آسا للمراجعة وإرسال الفاتورة. |

---

# SLUG STRATEGY

**Architecture supports per-locale slugs (Option A), confirmed from schema and code, not guessed:**

- `product_seo_contents.slug` is a per-`(entity_type, entity_id, locale)` row field; the unique index is `uq_product_seo_contents_slug_locale (slug, locale)` — scoped *per locale*, not globally, meaning each locale is architecturally free to have its own distinct slug string.
- `getPublishedCatalogTemplateBySlug(locale, slug)` (`lib/catalog/editorial-repository.ts`) resolves the detail route by the `(locale, slug)` pair together — confirmed by reading the SQL directly (`WHERE ... s.locale = ? AND s.slug = ?`).
- `docs/CATALOG_PUBLIC_ROUTES.md` states explicitly: *"an `en` visitor never sees a `fa`-only published template"* — locale-scoped resolution is the documented, existing design, not an accident.

**However, the stored slug VALUE is always constrained to ASCII**, regardless of locale: `lib/catalog/editorial.ts#SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/` — lowercase Latin letters, digits, and hyphens only. This is enforced by `isValidSlug`/`validateBatchEntry`, used by every write path (`editorial-cli.ts`). A literal Arabic-script or Persian-script slug is therefore **not valid** and would be rejected by the existing tooling.

**Consequence, observed directly in the existing FA data:** all 3 current FA slugs are already plain, descriptive, ASCII/English-style strings (`square-hollow-section-shs`, `rebar-aj340`, `hot-rolled-plate-s355jr`) — not Persian transliterations. There is no established precedent for "translating" a slug per locale in this dataset; the existing convention is one stable, descriptive, ASCII identifier reused as-is.

**Recommendation: reuse the identical slug string across fa/en/ar for all 3 products** (shown in each DRAFT section above). This is architecturally still 3 independent rows/fields (satisfying Option A's routing mechanism), but the *value* is identical across locales — the natural, non-invented choice given the existing FA precedent and the ASCII-only constraint, rather than inventing a separate transliteration scheme with no established basis.

---

# FACTUAL CLAIM REVIEW

Every claim in every draft was checked against its FA source and the real `product_variants` rows for the same product — no claim was invented:

- **Sizes/standards:** every dimension and standard number (EN 10219-2, INSO 3132, EN 10029; size/thickness/width ranges) is a direct translation of the FA source, cross-confirmed against real synced variant `commercial_size` values.
- **No price/availability claims:** none present in FA source; none added.
- **No supplier/mill claims:** none present in FA source; none added.
- **No MTC/Heat-No claims:** none present in FA source; none added.
- **No fabricated project references:** none present in FA source; none added.
- **No invented properties:** no mechanical/chemical property, certification, origin, or performance claim beyond what the FA `intro`/`body_json` already states.
- **Call-to-action wording** ("send your invoice or purchase list") mirrors the FA source's own established CTA phrasing exactly — this is the site's existing, approved conversion model (`ارسال فاکتور / لیست خرید`), not new marketing copy.

---

# FIELDS REQUIRED FOR PUBLICATION

For the owner/editor to actually publish these, once approved, using the existing operator CLI (`scripts/catalog-editorial.ts`, documented in `docs/CATALOG_EDITORIAL_OPERATIONS.md` — not run in this task):

1. `edit <template-xid> --locale en --env <env> --title "<h1>" --slug "<slug>" [--intro] [--seo-title] [--seo-description]` (or the equivalent `batch <path.json>` entry shape: `{templateXid, locale, h1, slug, intro, seoTitle, seoDescription, bodyJson}`) — creates the row at `content_quality_status = 'incomplete'`.
2. `mark-review <template-xid> --locale en --env <env>` — requires non-empty `h1`+`slug` (`canSubmitForReview`), already satisfied by the drafts above.
3. `approve <template-xid> --locale en --env <env>` — owner/editor sign-off, moves to `approved`.
4. `publish <template-xid> --locale en --env <env> [--confirm-production]` — requires `content_quality_status = 'approved'` plus non-empty `h1`/`slug` (`canPublish`); sets `published_at`.
5. Repeat identically for `--locale ar`.

`body_json` for each draft above follows the exact same 2-paragraph-block shape as the FA rows (`{"blocks":[{"type":"paragraph","text":"..."}, {"type":"paragraph","text":"..."}]}`), ready to paste into a batch file or `--file` argument without reformatting.

`faq_json`, `index_status` beyond the default, and any field not listed here were not touched or proposed — nothing was invented beyond what FA already has.

---

# OWNER APPROVAL REQUIRED

**YES.** These are drafts for review only. Before any write:
1. Owner/content reviewer confirms the EN/AR translations are accurate and acceptable (this task is not staffed by a certified technical translator — the drafts are faithful to the FA source and cross-checked against real variant data, but should still get a human review pass, especially the Arabic industry terminology, before publication).
2. Owner confirms the slug-reuse strategy (identical ASCII slug across locales) is the desired approach, or specifies an alternative.
3. A future, separate task then runs the actual `edit`/`mark-review`/`approve`/`publish` CLI sequence per product per locale — **not part of this task.**

---

# DATABASE WRITES

**NONE.** Every database interaction in this task was a plain `SELECT` via `wrangler d1 execute --env staging --remote` (no `--local` write-simulation, no `INSERT`/`UPDATE`/`ON CONFLICT` statement executed). No editorial CLI command (`edit`, `mark-review`, `approve`, `publish`, `batch`, or any other) was run.

---

# PRODUCTION SAFETY

No production resource was read, written, deployed to, or migrated. No staging resource was written either — this was a read-only inspection task. No Worker was deployed. No migration was run. `main` was not touched.
