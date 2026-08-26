# LOCALE_CONTENT_STRUCTURE.md

> **پروژه:** وب‌سایت آهن آسا (`ahanassa.com`)  
> **موضوع:** ساختار محتوای زبان‌ها  
> **وضعیت:** نسخه اجرایی اولیه  
> **نسخه سند:** `1.0.0`  
> **آخرین به‌روزرسانی:** `2026-08-25`  
> **اسناد مرتبط:** `LOCALIZATION.md`، `ROUTES.md`، `CONTENT_MODEL.md`، `METADATA_SPEC.md`، `HREFLANG_CANONICAL.md`، `SEO_KEYWORD_MAP.md`

---

## 1. هدف سند

این سند منبع اصلی تصمیم‌گیری درباره سازمان‌دهی، نگهداری، ترجمه، انتشار و کنترل کیفیت محتوای چندزبانه وب‌سایت آهن آسا است.

این سند باید مشخص کند:

- هر زبان چه جایگاهی در سایت دارد.
- محتوا و ترجمه‌ها در چه فایل‌ها یا مدل‌هایی ذخیره می‌شوند.
- چه بخش‌هایی ترجمه‌پذیر و چه بخش‌هایی مشترک هستند.
- route، slug، metadata، CTA، فرم و داده‌های ساختاریافته چگونه در هر زبان مدیریت می‌شوند.
- در صورت نبود ترجمه چه رفتاری مجاز است.
- یک زبان چه زمانی آماده انتشار و index شدن است.

هدف، جلوگیری از محتوای ناقص، ترجمه‌های ناسازگار، کلیدهای تکراری، fallback ناخواسته و صفحات چندزبانه مخلوط است.

---

## 2. تصمیم پایه زبان‌ها

| Locale | زبان | جهت | پیشوند URL | وضعیت اولیه | نقش |
|---|---|---:|---|---|---|
| `fa` | فارسی | RTL | بدون پیشوند | فعال | زبان اصلی و منبع مرجع |
| `en` | English | LTR | `/en` | آماده‌سازی | بازار و ارتباطات بین‌المللی |
| `ar` | العربية | RTL | `/ar` | آماده‌سازی | بازار عراق و کشورهای عربی |

### 2.1 قواعد قطعی

1. فارسی locale پیش‌فرض است و در URL پیشوند `/fa` ندارد.
2. مسیر `/fa/*` در صورت ایجاد یا وجود legacy باید با `308` به معادل فارسی بدون پیشوند منتقل شود.
3. انگلیسی و عربی فقط زمانی فعال می‌شوند که حداقل محتوای الزامی آن زبان کامل و تأیید شده باشد.
4. زبان غیرفعال نباید در language switcher، sitemap، hreflang یا navigation عمومی نمایش داده شود.
5. هیچ صفحه عمومی نباید ترکیبی از دو زبان باشد؛ استثنا فقط نام برند، استاندارد، کد فنی یا اصطلاح تثبیت‌شده است.
6. فارسی منبع پیش‌فرض محتوا است، اما ترجمه انگلیسی و عربی باید بومی‌سازی شود و ترجمه کلمه‌به‌کلمه الزامی نیست.

---

## 3. منبع مرجع محتوا

### 3.1 Source of Truth

- زبان مرجع تجاری و محتوایی: `fa`
- شناسه مرجع بین زبان‌ها: `contentId`
- زبان‌ها باید با شناسه مشترک به یک موجودیت متصل شوند، نه با slug یا عنوان.
- slug، عنوان، توضیحات، متن بدنه، CTA و metadata در هر locale مستقل هستند.
- داده‌های غیرزبانی مانند کد محصول، تاریخ پروژه، وزن، استاندارد فنی و شناسه رکورد مشترک باقی می‌مانند.

### 3.2 اصل جداسازی

هر موجودیت محتوایی باید به دو لایه تقسیم شود:

1. **داده مشترک:** مستقل از زبان؛ مانند شناسه، وضعیت، تصویر، تاریخ، مشخصات عددی و روابط.
2. **داده محلی‌شده:** وابسته به زبان؛ مانند title، slug، summary، body، alt text و SEO metadata.

---

## 4. ساختار URL بر اساس زبان

```text
فارسی:   https://www.ahanassa.com/products/steel-sheet
English: https://www.ahanassa.com/en/products/steel-sheet
Arabic:  https://www.ahanassa.com/ar/products/steel-sheet
```

### 4.1 قواعد URL

- URL فارسی بدون `/fa` است.
- URL انگلیسی با `/en` و عربی با `/ar` آغاز می‌شود.
- slug هر زبان می‌تواند مستقل و متناسب با جست‌وجوی همان بازار باشد.
- استفاده از حروف فارسی و عربی در slug مجاز است، اما برای آهن آسا slug لاتین کوتاه و پایدار ترجیح دارد.
- تغییر slug منتشرشده نیازمند ثبت redirect دائمی در `REDIRECTS.md` است.
- locale نباید از query string مانند `?lang=en` کنترل شود.
- هر صفحه فقط یک URL canonical در هر locale دارد.

### 4.2 مثال route map

| شناسه صفحه | فارسی | انگلیسی | عربی |
|---|---|---|---|
| `home` | `/` | `/en` | `/ar` |
| `about` | `/about` | `/en/about` | `/ar/about` |
| `products` | `/products` | `/en/products` | `/ar/products` |
| `services` | `/services` | `/en/services` | `/ar/services` |
| `contact` | `/contact` | `/en/contact` | `/ar/contact` |
| `rfq` | `/rfq` | `/en/rfq` | `/ar/rfq` |

جدول کامل routeها باید در `ROUTES.md` نگهداری شود.

---

## 5. ساختار پیشنهادی فایل‌ها

ساختار زیر برای Next.js App Router و یک لایه ترجمه مانند `next-intl` پیشنهاد می‌شود:

```text
src/
├── app/
│   └── [locale]/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── about/
│       ├── products/
│       ├── services/
│       ├── contact/
│       └── rfq/
├── i18n/
│   ├── config.ts
│   ├── routing.ts
│   ├── request.ts
│   └── types.ts
├── messages/
│   ├── fa/
│   │   ├── common.json
│   │   ├── navigation.json
│   │   ├── forms.json
│   │   ├── validation.json
│   │   └── pages.json
│   ├── en/
│   │   └── ...
│   └── ar/
│       └── ...
├── content/
│   ├── shared/
│   │   ├── products/
│   │   ├── services/
│   │   └── settings/
│   ├── fa/
│   │   ├── pages/
│   │   ├── products/
│   │   ├── services/
│   │   ├── projects/
│   │   └── insights/
│   ├── en/
│   │   └── ...
│   └── ar/
│       └── ...
└── lib/
    ├── locale/
    ├── content/
    └── seo/
```

### 5.1 تفکیک `messages` و `content`

| محل | کاربرد | نمونه |
|---|---|---|
| `messages/{locale}` | متن‌های کوتاه رابط کاربری | دکمه، label، پیام خطا، navigation |
| `content/{locale}` | محتوای تحریریه‌ای و SEO | صفحات، محصولات، خدمات، پروژه‌ها، مقالات |
| `content/shared` | داده مستقل از زبان | ID، تصویر، مشخصات عددی، relation، status |

متن طولانی صفحه نباید داخل فایل عمومی ترجمه مانند `common.json` ذخیره شود.

---

## 6. Namespaceهای ترجمه رابط کاربری

| Namespace | محتوا |
|---|---|
| `common` | واژه‌ها و اقدام‌های عمومی |
| `navigation` | منو، breadcrumb و language switcher |
| `header` | announcement، جست‌وجو و CTA هدر |
| `footer` | لینک‌ها، اطلاعات تماس و copyright |
| `forms` | label، placeholder و helper text |
| `validation` | پیام‌های خطا و موفقیت |
| `filters` | فیلتر، مرتب‌سازی و pagination |
| `products` | اصطلاحات مشترک رابط محصولات |
| `services` | اصطلاحات مشترک رابط خدمات |
| `projects` | اصطلاحات مشترک رابط پروژه‌ها |
| `seo` | عبارات قالبی محدود و قابل‌کنترل |
| `accessibility` | aria-label و متن‌های screen reader |

### 6.1 نمونه فایل پیام

```json
{
  "common": {
    "actions": {
      "requestQuote": "درخواست قیمت",
      "contactSales": "تماس با فروش",
      "learnMore": "اطلاعات بیشتر"
    },
    "states": {
      "loading": "در حال بارگذاری…",
      "empty": "موردی یافت نشد",
      "error": "خطایی رخ داده است"
    }
  }
}
```

---

## 7. قواعد نام‌گذاری کلیدها

### 7.1 الگوی کلید

```text
domain.section.element.variant
```

نمونه‌ها:

```text
navigation.primary.products
forms.rfq.fields.phone.label
forms.rfq.validation.phone.invalid
pages.home.hero.primaryCta
accessibility.carousel.nextSlide
```

### 7.2 قواعد الزامی

- کلیدها فقط انگلیسی و با `camelCase` نوشته شوند.
- کلید باید مفهوم را بیان کند، نه متن فعلی را.
- کلیدهایی مانند `text1`، `label2` و `homepageText` ممنوع هستند.
- یک کلید با معناهای متفاوت reuse نشود.
- متن ترجمه‌شده نباید به‌عنوان کلید استفاده شود.
- placeholderها باید نام‌دار باشند: `{productName}`، نه `{0}`.
- جمع، جنسیت و حالت‌های دستوری با سازوکار ICU مدیریت شوند، نه با اتصال رشته‌ها.

---

## 8. مدل محتوای محلی‌شده

### 8.1 مدل داده مشترک

```ts
type SharedContentRecord = {
  contentId: string;
  contentType: "page" | "product" | "service" | "project" | "insight";
  status: "draft" | "review" | "approved" | "published" | "archived";
  publishedAt?: string;
  updatedAt: string;
  media: MediaReference[];
  relations: string[];
  technicalData?: Record<string, number | string | boolean>;
};
```

### 8.2 مدل محتوای هر locale

```ts
type LocalizedContentRecord = {
  contentId: string;
  locale: "fa" | "en" | "ar";
  translationStatus: "missing" | "draft" | "review" | "approved" | "published";
  slug: string;
  title: string;
  eyebrow?: string;
  summary: string;
  body: ContentBlock[];
  primaryCta?: LocalizedCta;
  secondaryCta?: LocalizedCta;
  seo: LocalizedSeo;
  mediaText: Record<string, LocalizedMediaText>;
  reviewer?: string;
  reviewedAt?: string;
};
```

### 8.3 مدل SEO محلی‌شده

```ts
type LocalizedSeo = {
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  focusKeyword?: string;
  secondaryKeywords?: string[];
  indexable: boolean;
};
```

---

## 9. دسته‌بندی محتوا بر اساس نیاز ترجمه

| نوع داده | مشترک | محلی‌شده | توضیح |
|---|---:|---:|---|
| `contentId` | ✓ | — | شناسه ثابت بین زبان‌ها |
| عنوان و خلاصه | — | ✓ | متناسب با زبان و بازار |
| slug | — | ✓ | مستقل در هر locale |
| متن بدنه | — | ✓ | ترجمه و بومی‌سازی کامل |
| تصویر اصلی | ✓ | — | مگر بازار به تصویر متفاوت نیاز داشته باشد |
| alt/caption تصویر | — | ✓ | باید در هر زبان نوشته شود |
| کد محصول | ✓ | — | بدون ترجمه |
| مشخصات عددی | ✓ | — | مقدار مشترک، نمایش locale-aware |
| واحد اندازه‌گیری | مقدار مشترک | ✓ | label و قالب نمایش محلی‌شده |
| قیمت | مقدار و ارز | ✓ | قالب نمایش محلی‌شده؛ تبدیل خودکار ممنوع مگر تعریف شده باشد |
| CTA | مقصد مشترک | ✓ | label و پیام متناسب با بازار |
| metadata | — | ✓ | تحقیق و نگارش مستقل برای هر زبان |
| Schema/JSON-LD | بخشی | ✓ | متن‌ها و URLها باید با locale هماهنگ باشند |

---

## 10. ساختار انواع محتوا

### 10.1 صفحات ثابت

```text
content/{locale}/pages/
├── home.mdx
├── about.mdx
├── contact.mdx
├── rfq.mdx
└── privacy.mdx
```

### 10.2 محصولات و مقاطع فولادی

```text
content/{locale}/products/
├── steel-sheet.mdx
├── steel-beam.mdx
├── rebar.mdx
├── hollow-section.mdx
└── steel-pipe.mdx
```

### 10.3 خدمات

```text
content/{locale}/services/
├── procurement-management.mdx
├── supplier-evaluation.mdx
├── price-inquiry.mdx
├── logistics-coordination.mdx
└── quality-control.mdx
```

### 10.4 پروژه‌ها و مطالعات موردی

```text
content/{locale}/projects/{project-id}.mdx
```

### 10.5 محتوای آموزشی و بازار

```text
content/{locale}/insights/{content-id}.mdx
```

نام فایل باید بر پایه `contentId` یا slug پایدار انتخاب شود. ارتباط بین ترجمه‌ها نباید وابسته به ترجمه عنوان باشد.

---

## 11. نمونه frontmatter محتوا

```yaml
---
contentId: product-steel-sheet
locale: fa
translationStatus: approved
slug: products/steel-sheet
title: ورق فولادی
summary: تأمین مهندسی‌شده ورق فولادی با کنترل مشخصات، قیمت و تحویل.
seo:
  metaTitle: خرید و تأمین ورق فولادی | آهن آسا
  metaDescription: استعلام و تأمین ورق فولادی با کنترل فنی، ارزیابی تأمین‌کننده و هماهنگی تحویل توسط آهن آسا.
  focusKeyword: خرید ورق فولادی
  indexable: true
primaryCta:
  label: درخواست استعلام
  href: /rfq?product=steel-sheet
reviewedAt: 2026-08-25
---
```

---

## 12. سیاست ترجمه و بومی‌سازی

### 12.1 مواردی که باید ترجمه شوند

- navigation، breadcrumb و footer
- تمام تیترها، توضیحات و متن بدنه
- CTAها و microcopy
- فرم‌ها و پیام‌های validation
- alt، caption و transcript رسانه
- title، description، OG و داده ساختاریافته
- پیام‌های cookie، privacy، consent و صفحات حقوقی
- ایمیل و پیام تأیید فرم در صورت ارسال بر اساس locale

### 12.2 مواردی که نباید ترجمه شوند

- نام ثبت‌شده برند: `Ahan Asa` / `آهن آسا`
- کد فنی، SKU و شماره استاندارد
- نام تجاری تأمین‌کننده، مگر شکل رسمی محلی آن موجود باشد
- URL، ایمیل و شماره تلفن
- مقادیر عددی اصلی و شناسه‌های دیتابیس

### 12.3 واژه‌نامه

یک glossary مرکزی باید برای اصطلاحات تجاری و فنی نگهداری شود:

```text
content/glossary/
├── terminology.json
├── forbidden-translations.json
└── brand-terms.json
```

نمونه:

| مفهوم | فارسی | English | العربية |
|---|---|---|---|
| مدیریت تأمین | مدیریت تأمین | Procurement Management | إدارة التوريد |
| درخواست قیمت | درخواست قیمت | Request a Quote | طلب عرض سعر |
| کنترل کیفیت | کنترل کیفیت | Quality Control | ضبط الجودة |

هر تغییر مهم در اصطلاحات باید در تمام محتواهای فعال اعمال و ثبت شود.

---

## 13. سیاست fallback

### 13.1 رابط کاربری

- fallback فنی پیام‌های UI می‌تواند از `en` به `fa` فقط در محیط توسعه انجام شود.
- در production، نبود کلید ترجمه باید خطای قابل‌ردیابی ایجاد کند و در QA شناسایی شود.
- نمایش متن فارسی داخل صفحه انگلیسی یا عربی عمومی مجاز نیست.

### 13.2 محتوای صفحه

- محتوای تحریریه‌ای fallback بین زبان‌ها ندارد.
- اگر ترجمه صفحه وجود ندارد، آن route در locale مقصد ساخته یا منتشر نشود.
- redirect خودکار کاربر از صفحه ناموجود به زبان دیگر ممنوع است.
- در صورت درخواست route ناموجود، صفحه `404` همان locale نمایش داده شود.

### 13.3 metadata

- metadata هر locale باید کامل و مستقل باشد.
- fallback فارسی برای title یا description انگلیسی/عربی ممنوع است.
- صفحه فاقد metadata تأییدشده نباید indexable باشد.

---

## 14. چرخه وضعیت ترجمه

```text
missing → draft → review → approved → published
```

| وضعیت | تعریف | قابلیت انتشار |
|---|---|---:|
| `missing` | ترجمه وجود ندارد | خیر |
| `draft` | ترجمه اولیه یا ماشینی | خیر |
| `review` | در انتظار بازبینی تخصصی/زبانی | خیر |
| `approved` | تأیید محتوا و زبان | آماده |
| `published` | در production منتشر شده | بله |

ترجمه ماشینی فقط می‌تواند draft تولید کند و بدون بازبینی انسانی به وضعیت `approved` یا `published` نرسد.

---

## 15. حداقل محتوای لازم برای فعال‌سازی هر زبان

یک locale زمانی فعال می‌شود که همه موارد زیر آماده باشد:

- صفحه اصلی
- درباره ما
- فهرست محصولات و صفحات اصلی محصولات
- خدمات اصلی
- تماس با ما
- فرم RFQ و تمام پیام‌های آن
- header، footer و navigation
- صفحه 404 و خطاهای عمومی
- privacy و consent موردنیاز
- metadata تمام routeهای قابل index
- hreflang و canonical صحیح
- sitemap مستقل locale
- حداقل یک reviewer زبان مقصد
- QA کامل در desktop و mobile

فعال‌سازی بخشی از زبان فقط در صورتی مجاز است که routeهای ناقص اصلاً تولید نشوند و navigation آن زبان به صفحه ناموجود لینک ندهد.

---

## 16. ماتریس تکمیل محتوا

این ماتریس باید در فرایند تولید محتوا یا CMS قابل گزارش باشد:

| contentId | fa | en | ar | مالک محتوا | آخرین بازبینی |
|---|---|---|---|---|---|
| `page-home` | Published | Draft | Missing | Marketing | — |
| `page-about` | Approved | Review | Missing | Brand | — |
| `page-rfq` | Approved | Draft | Draft | Sales | — |
| `product-steel-sheet` | Approved | Missing | Missing | Product | — |

مقادیر جدول نمونه هستند و باید با وضعیت واقعی جایگزین شوند.

---

## 17. SEO چندزبانه

### 17.1 اصول

- keyword map برای هر زبان و بازار مستقل است.
- ترجمه مستقیم keyword فارسی، جایگزین keyword research نیست.
- title و description باید مطابق intent همان زبان نوشته شوند.
- canonical هر صفحه به همان URL در همان locale اشاره می‌کند.
- hreflang فقط بین نسخه‌های واقعاً موجود و indexable ایجاد می‌شود.
- `x-default` به نسخه فارسی اصلی یا selector عمومی مورد تأیید اشاره می‌کند.
- صفحه draft یا ناقص در sitemap و hreflang قرار نمی‌گیرد.

### 17.2 نمونه hreflang منطقی

```html
<link rel="alternate" hreflang="fa-IR" href="https://www.ahanassa.com/products/steel-sheet" />
<link rel="alternate" hreflang="en" href="https://www.ahanassa.com/en/products/steel-sheet" />
<link rel="alternate" hreflang="ar" href="https://www.ahanassa.com/ar/products/steel-sheet" />
<link rel="alternate" hreflang="x-default" href="https://www.ahanassa.com/products/steel-sheet" />
```

این تگ‌ها فقط وقتی مجازند که هر سه صفحه منتشر شده باشند.

---

## 18. Language Switcher

- فقط localeهای فعال و دارای نسخه متناظر صفحه نمایش داده شوند.
- کاربر در صورت تغییر زبان باید به نسخه همان `contentId` منتقل شود.
- انتقال همه صفحات به homepage زبان مقصد ممنوع است.
- اگر نسخه متناظر وجود ندارد، زبان مقصد برای همان صفحه disabled یا پنهان شود.
- انتخاب کاربر می‌تواند در cookie ذخیره شود، اما URL منبع قطعی locale است.
- تشخیص زبان مرورگر فقط برای پیشنهاد زبان مجاز است؛ redirect اجباری بدون رضایت کاربر انجام نشود.
- label زبان‌ها به شکل خودنام نوشته شود: `فارسی`، `English`، `العربية`.

---

## 19. قالب‌بندی locale-aware

### 19.1 اعداد

- مقدار در داده خام عدد باقی بماند.
- نمایش با `Intl.NumberFormat` انجام شود.
- استفاده از اعداد فارسی یا لاتین بر اساس تصمیم طراحی هر locale باشد.
- شماره تلفن، کد رهگیری، SKU و استانداردها تغییر شکل داده نشوند.

### 19.2 تاریخ و زمان

- تاریخ در داده خام با ISO 8601 ذخیره شود.
- نمایش تاریخ با formatter هر locale انجام شود.
- تقویم فارسی در `fa` تنها با تصمیم صریح محصول استفاده شود.
- timezone عملیات باید مشخص و مستقل از locale باشد.

### 19.3 ارز و قیمت

- amount و currency جدا ذخیره شوند.
- نام و قالب ارز ترجمه‌پذیر است؛ مبلغ به‌طور خودکار تبدیل نمی‌شود.
- مشخص شود قیمت با ارزش افزوده، حمل و اعتبار زمانی استعلام چه وضعیتی دارد.

### 19.4 واحدها

- مقدار پایه و واحد canonical ذخیره شود.
- label واحد در هر زبان محلی‌سازی شود.
- تبدیل واحد فقط با قاعده تجاری تأییدشده انجام شود.

---

## 20. رسانه در زبان‌های مختلف

برای هر asset موارد زیر باید قابل محلی‌سازی باشد:

- `alt`
- `caption`
- `credit`
- `transcript`
- متن داخل تصویر یا ویدئو
- نسخه بازارمحور asset در صورت نیاز

تصویر دارای متن فارسی نباید بدون نسخه مناسب در صفحه انگلیسی یا عربی استفاده شود. متن جایگزین باید هدف تصویر را در context همان زبان توصیف کند و ترجمه مکانیکی نام فایل نباشد.

---

## 21. فرم‌ها و Lead Capture

- label، placeholder، helper text و validation برای هر locale مستقل باشند.
- مقدار فنی گزینه‌ها ثابت و label آنها ترجمه‌پذیر باشد.
- locale صفحه همراه lead ذخیره و به CRM ارسال شود.
- پیام تأیید، ایمیل پاسخ و اعلان داخلی باید locale-aware باشند.
- کد کشور تلفن از شماره تلفن جدا ذخیره شود.
- متن رضایت‌نامه و privacy بر اساس locale نمایش داده شود.
- تغییر زبان نباید داده واردشده فرم را بدون هشدار حذف کند.

نمونه مقدار ثابت:

```ts
{
  value: "steel_sheet",
  labelKey: "forms.rfq.productOptions.steelSheet"
}
```

---

## 22. Structured Data

- `name`، `description`، `url`، `inLanguage` و متن breadcrumb با locale صفحه هماهنگ باشند.
- داده‌های مشترک سازمان مانند لوگو و شناسه حقوقی از منبع مرکزی دریافت شوند.
- `inLanguage` برای فارسی `fa-IR`، انگلیسی `en` و عربی متناسب با بازار هدف تعیین شود.
- Schema صفحه منتشرنشده یا ترجمه‌نشده تولید نشود.
- URLهای JSON-LD نباید بین localeها مخلوط شوند.

---

## 23. RTL و LTR در محتوا

- جهت سند از locale تعیین شود: `dir="rtl"` برای `fa` و `ar`، و `dir="ltr"` برای `en`.
- جهت نباید با بررسی متن یا CSS دستی حدس زده شود.
- ایمیل، URL، کد فنی و شماره استاندارد داخل متن RTL باید با wrapper مناسب `dir="ltr"` نمایش داده شوند.
- آیکون‌های جهت‌دار مانند arrow، chevron و progress باید در RTL mirror شوند؛ لوگو و آیکون‌های غیرجهتی mirror نشوند.
- alignment معنایی با `start` و `end` تعریف شود، نه `left` و `right`.

---

## 24. مدیریت تغییرات محتوای مرجع

هر تغییر مهم در نسخه فارسی باید وضعیت ترجمه‌های وابسته را بررسی کند.

### 24.1 تغییرات مهم

- تغییر معنی یا ادعای تجاری
- تغییر مشخصات فنی
- تغییر CTA یا فرایند فروش
- تغییر شرایط حقوقی
- تغییر metadata یا هدف keyword
- اضافه یا حذف section

در این موارد ترجمه‌های منتشرشده به وضعیت `review` بازگردند یا با flag زیر مشخص شوند:

```ts
translationOutdated: true
sourceRevision: 12
translatedFromRevision: 10
```

تغییرات جزئی نگارشی که معنی را تغییر نمی‌دهند، الزاماً ترجمه‌ها را منقضی نمی‌کنند.

---

## 25. Validation خودکار

در build یا CI موارد زیر باید بررسی شوند:

- نبود کلید ترجمه در locale فعال
- کلید اضافی یا orphan در فایل‌های ترجمه
- اختلاف placeholderها بین زبان‌ها
- محتوای `published` بدون metadata
- تکراری بودن slug در یک locale
- نبود نسخه locale برای لینک داخلی
- وجود متن فارسی در محتوای انگلیسی و بالعکس، با allowlist اصطلاحات مجاز
- صفحه indexable با `translationStatus` غیر از `published`
- hreflang به route ناموجود یا non-indexable
- alt خالی برای تصویر محتوایی
- لینک داخلی به locale اشتباه
- JSON نامعتبر یا schema ناقص

خطاهای انتشار باید build را fail کنند؛ warningهای تحریریه‌ای باید در گزارش QA ثبت شوند.

---

## 26. QA محتوای هر locale

### 26.1 زبان و محتوا

- [ ] تمام متن‌ها متعلق به locale فعلی هستند.
- [ ] ترجمه از نظر فنی، تجاری و نگارشی بازبینی شده است.
- [ ] اصطلاحات با glossary هماهنگ هستند.
- [ ] CTA با هدف صفحه و بازار مقصد تناسب دارد.
- [ ] ادعاها، قیمت‌ها و شرایط فروش به‌روز هستند.
- [ ] هیچ placeholder یا متن آزمایشی باقی نمانده است.

### 26.2 مسیر و لینک

- [ ] URL، canonical و breadcrumb صحیح هستند.
- [ ] language switcher به نسخه متناظر می‌رود.
- [ ] تمام لینک‌های داخلی در همان locale باز می‌شوند.
- [ ] routeهای ناقص در navigation یا sitemap نیستند.
- [ ] redirectهای slug قدیمی ثبت و آزمایش شده‌اند.

### 26.3 SEO

- [ ] meta title و description یکتا هستند.
- [ ] keyword و intent مختص بازار مقصد است.
- [ ] hreflang فقط به صفحات منتشرشده اشاره می‌کند.
- [ ] OG و structured data با locale هماهنگ هستند.
- [ ] صفحه دارای یک H1 واضح و محلی‌شده است.

### 26.4 UI و دسترس‌پذیری

- [ ] RTL/LTR صحیح است.
- [ ] متن‌های طولانی باعث overflow یا شکست layout نمی‌شوند.
- [ ] فونت، line-height و فاصله‌گذاری خوانا هستند.
- [ ] aria-labelها ترجمه شده‌اند.
- [ ] focus order و keyboard navigation در هر دو جهت درست است.

---

## 27. الگوهای ممنوع

- قراردادن همه ترجمه‌ها در یک فایل بسیار بزرگ
- استفاده از متن خام داخل componentهای مشترک
- تشخیص locale فقط با `window.location`
- ساخت URL ترجمه با replace کردن رشته مسیر
- fallback محتوای صفحه از فارسی به انگلیسی یا بالعکس
- انتشار ترجمه ماشینی بدون review
- استفاده از یک metadata مشترک برای همه زبان‌ها
- استفاده از slug یا title به‌عنوان شناسه رابطه بین زبان‌ها
- هدایت language switcher به homepage به‌جای صفحه متناظر
- قرار دادن زبان غیرفعال در sitemap یا hreflang
- ترکیب `left/right` ثابت با layout چندجهته
- چسباندن رشته‌ها برای ساخت جمله ترجمه‌شده

---

## 28. قرارداد اجرایی برای Claude Code

Claude Code هنگام ایجاد یا تغییر محتوای چندزبانه باید:

1. ابتدا `LOCALE_CONTENT_STRUCTURE.md` و `LOCALIZATION.md` را بخواند.
2. locale فعال، وضعیت ترجمه و `contentId` را مشخص کند.
3. متن رابط کاربری را داخل component hard-code نکند.
4. برای متن کوتاه از namespace مناسب و برای متن تحریریه‌ای از `content/{locale}` استفاده کند.
5. route، metadata، canonical، hreflang و linkهای داخلی را با هم به‌روزرسانی کند.
6. در نبود ترجمه، صفحه زبان دیگر را fallback نکند.
7. زبان جدید را بدون تکمیل معیارهای بخش 15 فعال نکند.
8. قبل از پایان کار validation ترجمه و build را اجرا کند.
9. هر تغییر slug را در `REDIRECTS.md` ثبت کند.
10. هر تصمیم جدید درباره locale را در `DECISIONS.md` ثبت کند.

---

## 29. Definition of Done

یک صفحه محلی‌شده زمانی کامل است که:

- `contentId` مشترک و locale صحیح دارد.
- ترجمه در وضعیت `approved` یا `published` است.
- slug یکتا و route قابل دسترس است.
- title، summary، body و CTA کامل هستند.
- metadata، OG و structured data محلی‌شده‌اند.
- canonical و hreflang معتبر هستند.
- همه لینک‌های داخلی locale-safe هستند.
- رسانه‌ها alt/caption مناسب دارند.
- فرم‌ها و پیام‌ها در همان زبان نمایش داده می‌شوند.
- صفحه در mobile و desktop و RTL/LTR بررسی شده است.
- تست‌های محتوایی و build بدون خطای blocking اجرا شده‌اند.

---

## 30. تصمیمات باز پیش از فعال‌سازی زبان‌های جدید

موارد زیر باید پیش از انتشار انگلیسی یا عربی نهایی شوند:

- [ ] اولویت تجاری بین `en` و `ar`
- [ ] بازار دقیق عربی: عراق، عمان، GCC یا عربی عمومی
- [ ] کد hreflang دقیق عربی مانند `ar-IQ` یا `ar-OM`
- [ ] سیاست تقویم و نمایش اعداد فارسی
- [ ] سیاست نمایش ارز و واحدها در هر بازار
- [ ] مالک ترجمه و reviewer هر زبان
- [ ] دامنه صفحات موردنیاز برای launch هر locale
- [ ] سیاست ترجمه نام محصولات و استانداردهای فولادی
- [ ] زبان ایمیل‌ها و پیام‌های CRM
- [ ] امکان استفاده از asset متفاوت برای هر بازار

تا زمان تصمیم‌گیری، مقدارهای پیشنهادی این سند مبنای پیاده‌سازی هستند و localeهای `en` و `ar` در وضعیت آماده‌سازی باقی می‌مانند.

---

## 31. خلاصه تصمیم اجرایی

```text
Primary locale: fa
Default URL prefix: none
Secondary locales: en, ar
Secondary locale state: disabled until complete
UI translations: src/messages/{locale}
Editorial content: src/content/{locale}
Shared data: src/content/shared
Cross-locale identity: contentId
Production content fallback: disabled
Translation approval: human review required
Indexing: published content only
```

این سند باید هم‌زمان با اضافه شدن زبان، تغییر معماری محتوا، تغییر CMS یا فعال شدن بازار جدید به‌روزرسانی شود.
