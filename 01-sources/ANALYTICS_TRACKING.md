# ANALYTICS_TRACKING.md

> مشخصات GA4، Google Tag Manager، Data Layer و Event Tracking وب‌سایت آهن آسا

| مشخصه | مقدار |
|---|---|
| پروژه | Ahan Asa / آهن آسا |
| دامنه اصلی | `https://ahanassa.com` |
| نوع کسب‌وکار | مدیریت تأمین فولاد و پشتیبانی خرید پروژه‌ای B2B |
| زبان فعلی | فارسی، کاملاً RTL |
| بازار اصلی | ایران |
| بازارهای توسعه آتی | عراق و عمان |
| تبدیل اصلی | ارسال موفق فاکتور، لیستوفر یا لیست خرید |
| مسیر اصلی تبدیل | `/request-consultation` |
| مسیر تماس | `/contact` |
| نسخه سند | `1.0.0` |
| وضعیت | Ready for implementation — شناسه‌های سرویس باید پس از ایجاد حساب‌ها تکمیل شوند |
| آخرین بازبینی | 2026-08-25 |

---

## 1. هدف سند

این سند قرارداد اجرایی واحد میان طراحی، توسعه، بازاریابی و فروش برای اندازه‌گیری رفتار کاربران وب‌سایت آهن آسا است. پیاده‌سازی Analytics باید بتواند بدون تبدیل سایت به یک سامانه پر از Tracker، به پرسش‌های زیر پاسخ دهد:

1. کاربران از چه کانال‌ها و کمپین‌هایی وارد سایت می‌شوند؟
2. کدام صفحات و موضوعات بیشترین تقاضای باکیفیت را ایجاد می‌کنند؟
3. کاربران چگونه از محتوا به CTA، فرم و ارسال درخواست می‌رسند؟
4. در کدام مرحله از قیف RFQ بیشترین ریزش رخ می‌دهد؟
5. چه تعداد درخواست واقعی و در آینده چه تعداد Lead واجد شرایط ایجاد می‌شود؟
6. عملکرد زبان‌ها و بازارهای آتی چگونه با یکدیگر مقایسه می‌شود؟

Analytics ابزار تصمیم‌گیری است، نه ابزار شناسایی فرد. هیچ داده شخصی یا محتوای محرمانه خرید و پروژه نباید وارد GA4 یا GTM شود.

---

## 2. اصول قطعی اندازه‌گیری

### 2.1 اصل تبدیل

- رویداد `generate_lead` فقط پس از تأیید موفقیت درخواست توسط Server ثبت شود.
- کلیک روی CTA، باز کردن فرم یا کلیک تماس، Lead قطعی محسوب نشود.
- Validation سمت Client یا نمایش ظاهری پیام موفقیت، برای ثبت `generate_lead` کافی نیست.
- هر ارسال موفق فقط یک‌بار ثبت شود؛ Refresh، Back/Forward و Retry نباید Lead تکراری بسازند.
- در گزارش‌ها «RFQ ثبت‌شده»، «تماس کمکی» و «تعامل محتوایی» از یکدیگر جدا بمانند.

### 2.2 اصل کمینه‌گرایی

- ابتدا فقط رویدادهایی پیاده‌سازی شوند که یک تصمیم تجاری مشخص را پشتیبانی می‌کنند.
- رویدادهای مبهم مانند `button_click`، `engagement` یا `interaction` ممنوع‌اند.
- Event name باید عمل را توضیح دهد و Parameters زمینه آن را کامل کنند.
- برای یک رفتار واحد، فقط یک منبع ثبت انتخاب شود؛ Enhanced Measurement و GTM نباید یک رویداد را هم‌زمان و تکراری ارسال کنند.

### 2.3 اصل حریم خصوصی

موارد زیر تحت هیچ شرایطی نباید به Google Analytics، Google Ads یا Data Layer ارسال شوند:

- نام و نام خانوادگی؛
- شماره تلفن، موبایل و واتس‌اپ؛
- ایمیل؛
- نام شرکت یا نام شخص تماس؛
- متن پیام، توضیحات پروژه یا اقلام لیست خرید؛
- آدرس پروژه یا نشانی دقیق؛
- نام فایل آپلودشده توسط کاربر؛
- محتوای فاکتور، لیستوفر، PDF، تصویر یا فایل پیوست؛
- URL دارای Query Parameter حاوی داده کاربر؛
- شناسه CRM که به‌تنهایی یا با داده دیگر بتواند فرد را شناسایی کند.

در صورت نیاز تحلیلی، فقط مقادیر طبقه‌بندی‌شده و غیرشخصی مانند `lead_type=invoice`، `file_count=2` یا `file_extensions=pdf_xlsx` ارسال شوند.

---

## 3. معماری ابزارها

| لایه | ابزار | مسئولیت |
|---|---|---|
| Presentation | وب‌سایت آهن آسا | نمایش صفحات، فرم‌ها، CTAها و Consent UI |
| Collection Contract | `window.dataLayer` | انتقال استاندارد و مستقل از DOM رویدادها و Context |
| Tag Management | Google Tag Manager | Trigger، Variable، Consent و ارسال Tagها |
| Analytics | Google Analytics 4 | تحلیل Acquisition، Engagement، Funnel و Key Events |
| Search | Google Search Console | تحلیل Query، Landing Page و Organic Search |
| Reporting | GA4 Explorations / Looker Studio | گزارش مدیریتی و بازاریابی |
| CRM — فاز بعد | CRM/API تأییدشده | وضعیت Qualification، Proposal و Contract بدون PII در GA4 |

### تصمیم معماری

1. GTM تنها درگاه Client-side برای نصب GA4 و Tagهای بازاریابی باشد.
2. `gtag.js` به‌صورت موازی و مستقل در کد سایت نصب نشود.
3. کد اپلیکیشن فقط رویدادهای معنایی را به `dataLayer` Push کند.
4. GTM مسئول تبدیل Data Layer Eventها به GA4 Event باشد.
5. Trackerهای تبلیغاتی تا زمان نیاز تجاری، تأیید حقوقی و Consent معتبر نصب نشوند.

---

## 4. حساب‌ها و شناسه‌ها

هیچ شناسه‌ای نباید توسط توسعه‌دهنده حدس زده یا در Repository عمومی ثبت شود.

| مورد | مقدار Production | وضعیت |
|---|---|---|
| GA4 Account | `[TO_BE_CREATED_OR_CONFIRMED]` | الزامی |
| GA4 Property | `[TO_BE_CREATED_OR_CONFIRMED]` | الزامی |
| Web Data Stream URL | `https://ahanassa.com` | قطعی |
| Measurement ID | `G-XXXXXXXXXX` | Placeholder |
| GTM Account | `[TO_BE_CREATED_OR_CONFIRMED]` | الزامی |
| GTM Web Container ID | `GTM-XXXXXXX` | Placeholder |
| Google Search Console Property | `sc-domain:ahanassa.com` | باید تأیید شود |
| Google Ads Account | `[NOT_REQUIRED_IN_PHASE_1]` | فاز بعد |

### متغیرهای محیطی پیشنهادی

```env
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_ENV=production
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_CONSENT_MODE=basic
```

قواعد:

- مقدار واقعی Production در فایل نمونه `.env.example` نوشته نشود؛ فقط Placeholder ثبت شود.
- در `development` و `test`، ارسال به Property اصلی غیرفعال باشد.
- Staging یا Tag ارسال نکند، یا از Stream/Property مستقل استفاده کند.
- فعال‌بودن Debug فقط در محیط توسعه مجاز است.

---

## 5. تنظیمات پایه GA4

### 5.1 Property

| تنظیم | مقدار پیشنهادی |
|---|---|
| Property time zone | `Asia/Tehran` |
| Currency | `IRR` تا زمان تصمیم مالی نهایی |
| Data retention | `14 months` |
| Reset user data on new activity | روشن، مگر تصمیم مستند دیگری گرفته شود |
| Google Signals | در فاز اول خاموش |
| Ads personalization | در فاز اول خاموش |
| Internal traffic filter | تعریف و ابتدا در حالت Testing |
| Developer traffic filter | تعریف برای Debug/Development |
| Unwanted referrals | فقط بر اساس Domain واقعی سرویس‌های واسط آینده |

`14 months` بیشترین Retention قابل انتخاب برای داده‌های User-level و Event-level در نسخه استاندارد GA4 است. این مقدار به معنی مجوز جمع‌آوری داده شخصی نیست.

### 5.2 Enhanced Measurement

| قابلیت | وضعیت | توضیح |
|---|---|---|
| Page views | روشن با کنترل عدم تکرار | برای Route Change باید Strategy مشخص باشد |
| Scrolls | روشن | رویداد پیش‌فرض در حدود 90% صفحه |
| Outbound clicks | روشن | برای لینک‌های خارجی عمومی |
| Site search | فقط در صورت وجود جست‌وجوی داخلی | Query باید پاک‌سازی شود |
| Video engagement | فقط اگر ویدئوی پشتیبانی‌شده وجود دارد | پس از QA |
| File downloads | روشن برای Assetهای عمومی | برای فایل آپلودی کاربر کاربرد ندارد |
| Form interactions | خاموش | فرم‌های AJAX/RFQ به‌صورت صریح از Data Layer ثبت می‌شوند تا Duplicate ایجاد نشود |

### 5.3 Page View در SPA / Next.js

در صورت استفاده از Next.js App Router یا هر معماری SPA:

- یک Strategy بیشتر استفاده نشود: Page View خودکار یا Page View دستی.
- اگر Route Change به‌درستی توسط Tag خودکار ثبت نمی‌شود، `send_page_view=false` تنظیم و `page_view` دستی روی Route Change ارسال شود.
- Query String پیش از ارسال پاک‌سازی شود، مگر پارامترهای کمپین مجاز.
- Hash، Token، Email، Phone و هر داده فرم از `page_location` حذف شود.
- در اولین Load، فقط یک Page View ثبت شود.
- تغییر Modal، Tab، Accordion و Filter به‌تنهایی Page View نیست.

---

## 6. قرارداد نام‌گذاری

### 6.1 Event name

- فقط حروف کوچک انگلیسی، اعداد و Underscore؛
- قالب `lower_snake_case`؛
- نام با فعل آغاز شود؛
- نام ثابت باشد و متن فارسی UI وارد نام رویداد نشود؛
- از نام‌های رزروشده و Recommended گوگل، در صورت تطابق معنایی، استفاده شود؛
- تغییر نام رویداد بعد از انتشار نیازمند Migration و ثبت در `CHANGELOG.md` است.

نمونه صحیح:

```text
generate_lead
form_start
cta_click
click_phone
rfq_file_attach
```

نمونه ممنوع:

```text
Button Click
submitForm2
کلیک_دکمه
event
conversion
```

### 6.2 Parameter name

Parameters نیز باید `lower_snake_case` باشند. مقدارهای طبقه‌بندی‌شده تا حد ممکن با Slug لاتین و ثابت ارسال شوند.

### 6.3 شناسه عناصر

متن نمایشی CTA ممکن است در آینده تغییر کند؛ بنابراین گزارش‌گیری نباید فقط به `cta_text` وابسته باشد. هر CTA مهم باید یک شناسه پایدار داشته باشد:

```text
home_hero_primary
home_process_secondary
header_rfq_primary
mobile_sticky_rfq
procurement_midpage_rfq
footer_contact
```

---

## 7. Context مشترک همه رویدادهای سفارشی

| Parameter | نوع | نمونه | توضیح |
|---|---|---|---|
| `event_id` | string | UUID | شناسه یکتای رویداد برای کنترل Duplicate |
| `page_type` | enum | `home` | نوع صفحه |
| `page_path` | string | `/request-consultation` | Path پاک‌سازی‌شده و بدون داده شخصی |
| `page_section` | enum/string | `hero` | بخش صفحه |
| `language` | enum | `fa` | زبان محتوا |
| `market` | enum | `ir` | بازار هدف محتوا، نه موقعیت دقیق کاربر |
| `site_environment` | enum | `production` | `production`، `staging` یا `development` |
| `content_group` | enum | `procurement` | گروه محتوایی سطح بالا |

### مقادیر مجاز اولیه `page_type`

```text
home
procurement
process
materials_hub
material_detail
industries_hub
industry_detail
about
faq
contact
rfq
privacy
legal
not_found
```

### مقادیر مجاز اولیه `content_group`

```text
brand
procurement
process
materials
industries
company
support
lead_generation
legal
```

---

## 8. Measurement Plan

### 8.1 رویدادهای پایه و خودکار

| Event | منبع | Trigger | Key Event | پارامترهای مهم |
|---|---|---|---|---|
| `page_view` | GA4/GTM | بارگذاری صفحه یا Route Change واقعی | خیر | `page_location`, `page_title`, `page_referrer` |
| `session_start` | GA4 | آغاز Session | خیر | خودکار |
| `first_visit` | GA4 | اولین بازدید Browser | خیر | خودکار |
| `user_engagement` | GA4 | تعامل فعال | خیر | خودکار |
| `scroll` | Enhanced Measurement | رسیدن برای اولین بار به حدود 90% صفحه | خیر | `percent_scrolled` در صورت نیاز سفارشی نشود |
| `click` | Enhanced Measurement | کلیک Outbound | خیر | `link_url`, `link_domain`, `outbound` |
| `file_download` | Enhanced Measurement/GTM | کلیک دانلود Asset عمومی | خیر | `file_name`, `file_extension`, `link_url` |
| `view_search_results` | GA4 Recommended | نمایش نتایج جست‌وجوی داخلی | خیر | `search_term` پاک‌سازی‌شده |

توجه: `file_download` فقط کلیک روی لینک دانلود Asset عمومی را اندازه می‌گیرد و اثبات دریافت کامل فایل نیست.

### 8.2 CTA و Navigation

| Event | Trigger دقیق | Key Event | Parameters |
|---|---|---|---|
| `cta_click` | کلیک روی CTA تجاری دارای `data-analytics-id` | خیر | `cta_id`, `cta_text`, `cta_destination`, `page_section`, `cta_position` |
| `navigation_click` | کلیک روی آیتم‌های اصلی Header/Mobile/Footer | خیر | `navigation_area`, `item_id`, `destination_path` |
| `faq_expand` | بازشدن سؤال FAQ توسط کاربر | خیر | `faq_id`, `faq_category`, `page_section` |
| `click_phone` | کلیک لینک `tel:` | کمکی | `contact_location`, `page_section` |
| `click_email` | کلیک لینک `mailto:` | کمکی | `contact_location`, `page_section` |
| `click_whatsapp` | کلیک CTA واتس‌اپ رسمی | کمکی | `contact_location`, `page_section`, `message_template_id` |

قواعد:

- شماره تلفن، ایمیل و متن WhatsApp در Parameters ارسال نشوند.
- `cta_text` فقط متن ثابت طراحی‌شده است؛ هر متن تولیدشده توسط کاربر ممنوع است.
- کلیک روی CTA اصلی «ارسال فاکتور یا لیست خرید» باید `cta_id` یکتا بر اساس محل نمایش داشته باشد.
- CTA ثانویه «آشنایی با فرآیند خرید» با `cta_click` ثبت شود، نه Lead.

### 8.3 فرم RFQ و Lead Capture

| Event | Trigger دقیق | Key Event | Parameters |
|---|---|---|---|
| `view_rfq` | اولین نمایش واقعی صفحه/بخش فرم در Session | خیر | `form_id`, `form_variant`, `entry_point` |
| `form_start` | اولین تعامل معتبر با یکی از Fieldهای فرم | خیر | `form_id`, `form_name`, `form_variant` |
| `rfq_file_attach` | انتخاب فایل معتبر توسط کاربر | خیر | `form_id`, `file_count`, `file_extensions`, `total_size_bucket` |
| `form_validation_error` | جلوگیری از ارسال به علت Validation | خیر | `form_id`, `field_id`, `error_code`, `error_type` |
| `form_submit_attempt` | اقدام کاربر برای ارسال فرم پس از Validation Client | خیر | `form_id`, `lead_type`, `file_count` |
| `form_submit_error` | شکست درخواست Server/Network | خیر | `form_id`, `error_code`, `error_type`, `retryable` |
| `generate_lead` | پاسخ موفق Server و ایجاد Lead/RFQ | اصلی | `form_id`, `lead_type`, `submission_method`, `file_count`, `event_id` |

### قواعد فرم

1. `form_start` در هر Session و برای هر `form_id` فقط یک‌بار ثبت شود.
2. `form_validation_error` در هر تلاش ارسال ثبت شود، نه روی هر Keystroke.
3. `field_id` باید شناسه عمومی باشد؛ مانند `phone` یا `attachment`، نه مقدار Field.
4. `error_code` باید طبقه‌بندی ثابت داشته باشد؛ مانند `required`, `invalid_format`, `file_too_large`, `network_error`, `server_error`.
5. `rfq_file_attach` نام فایل را ارسال نکند.
6. `generate_lead` فقط پس از ایجاد موفق رکورد یا دریافت پاسخ موفق قابل اتکا ثبت شود.
7. Event ID سمت Server یا در مرز تأیید Server تولید و برای Deduplication استفاده شود.
8. اگر صفحه تشکر وجود دارد، Refresh آن نباید Lead جدید ایجاد کند.
9. اگر ارسال به CRM/Odoo شکست خورد اما درخواست در Backend امن ذخیره شد، معیار موفقیت باید بر اساس تصمیم `FORM_ARCHITECTURE.md` تعیین شود؛ UI به‌تنهایی مرجع نیست.

### مقادیر مجاز `lead_type`

```text
invoice
purchase_list
cutting_list
consultation
general_contact
other
```

برای جلوگیری از چندزبانه‌شدن داده، مقدار فارسی «لیستوفر» در Analytics با Slug ثابت `cutting_list` ذخیره شود.

### مقادیر مجاز `total_size_bucket`

```text
under_1mb
1_5mb
5_10mb
10_25mb
over_25mb
```

### 8.4 Asset و Content Intent

| Event | Trigger دقیق | Key Event | Parameters |
|---|---|---|---|
| `file_download` | کلیک دانلود کاتالوگ/راهنمای عمومی | خیر | پارامترهای استاندارد + `asset_id`, `asset_type`, `asset_language` |
| `copy_contact_detail` | Copy شماره یا اطلاعات تماس از UI | خیر | `contact_type`, `page_section` |
| `process_step_view` | مشاهده آگاهانه مرحله Process فقط در UI تعاملی | خیر | `step_id`, `step_order` |
| `material_filter` | تغییر Filter در Materials در صورت وجود | خیر | `filter_name`, `filter_value` |

رویداد اختصاصی برای مشاهده عادی هر صفحه ساخته نشود؛ `page_view`، `page_type` و `content_group` برای این تحلیل کافی‌اند.

### 8.5 رویدادهای فاز دوم CRM

این رویدادها فقط پس از اتصال رسمی CRM/API، تعریف شناسه غیرشخصی، Consent/Privacy Review و تست Measurement Protocol فعال شوند:

| Event | Trigger تجاری | Key Event | توضیح |
|---|---|---|---|
| `qualify_lead` | تأیید Lead به‌عنوان واجد شرایط | اصلی تجاری | GA4 Recommended Event |
| `disqualify_lead` | رد Lead با دلیل طبقه‌بندی‌شده | خیر | بدون متن آزاد |
| `proposal_issued` | صدور پیشنهاد رسمی | خیر | Custom، بدون مبلغ در فاز اول |
| `contract_won` | تبدیل Lead به قرارداد | اصلی درآمدی | فقط پس از طراحی مدل ارزش و Attribution |

اطلاعات شخصی CRM نباید به GA4 منتقل شود. اتصال Offline باید با شناسه Pseudonymous مجاز، حداقل داده و مستندات حقوقی انجام شود.

---

## 9. Key Events و Conversion Policy

### 9.1 طبقه‌بندی

| سطح | Event | وضعیت |
|---|---|---|
| Primary | `generate_lead` | از روز اول به‌عنوان Key Event فعال شود |
| Assisted | `click_phone` | در گزارش جدا؛ در صورت نیاز Key Event ثانویه |
| Assisted | `click_whatsapp` | در گزارش جدا؛ در صورت نیاز Key Event ثانویه |
| Assisted | `click_email` | ترجیحاً Event عادی |
| Content intent | `file_download` | Event عادی، مگر Asset مشخص Lead Magnet باشد |
| CRM primary | `qualify_lead` | فاز دوم |
| Revenue primary | `contract_won` | فاز دوم |

### 9.2 Counting method

- `generate_lead`: یک‌بار به‌ازای هر Event ID موفق؛ تنظیم پیشنهادی Key Event برابر `Once per event` است، در حالی که Deduplication اپلیکیشن همچنان الزامی است.
- تماس‌های کمکی: هر کلیک ثبت شود، اما در Dashboard با Lead واقعی جمع نشود.
- تغییر وضعیت CRM: فقط تغییر واقعی State ثبت شود، نه هر Save یا Sync.

### 9.3 Advertising Conversion

تا زمانی که Google Ads فعال نشده است، GA4 Key Event به‌صورت Advertising Conversion Import نشود. پس از فعال‌سازی Ads:

1. فقط `generate_lead` به‌عنوان Conversion اصلی Import شود.
2. کلیک تماس و واتس‌اپ Secondary باشند.
3. `qualify_lead` در فاز CRM برای Bidding باکیفیت‌تر بررسی شود.
4. Consent Mode v2 و Ads Consent پیش از انتشار الزامی است.

---

## 10. Data Layer Specification

### 10.1 راه‌اندازی

`window.dataLayer` باید پیش از Container GTM ایجاد شود و در هیچ نقطه‌ای Overwrite نشود:

```html
<script>
  window.dataLayer = window.dataLayer || [];
</script>
```

تنها یک Data Layer سراسری در هر صفحه استفاده شود.

### 10.2 Page context

```js
window.dataLayer.push({
  event: 'page_context',
  page_type: 'rfq',
  page_path: '/request-consultation',
  content_group: 'lead_generation',
  language: 'fa',
  market: 'ir',
  site_environment: 'production'
});
```

### 10.3 CTA click

```js
window.dataLayer.push({
  event: 'cta_click',
  event_id: crypto.randomUUID(),
  cta_id: 'home_hero_primary',
  cta_text: 'ارسال فاکتور یا لیست خرید',
  cta_destination: '/request-consultation',
  cta_position: 1,
  page_type: 'home',
  page_section: 'hero',
  language: 'fa',
  market: 'ir'
});
```

### 10.4 Form start

```js
window.dataLayer.push({
  event: 'form_start',
  event_id: crypto.randomUUID(),
  form_id: 'rfq_primary',
  form_name: 'request_consultation',
  form_variant: 'default',
  page_type: 'rfq',
  page_section: 'rfq_form',
  language: 'fa'
});
```

### 10.5 File attachment

```js
window.dataLayer.push({
  event: 'rfq_file_attach',
  event_id: crypto.randomUUID(),
  form_id: 'rfq_primary',
  file_count: 2,
  file_extensions: 'pdf_xlsx',
  total_size_bucket: '5_10mb'
});
```

نام فایل و محتوای آن عمداً در این Payload وجود ندارد.

### 10.6 Successful lead

```js
window.dataLayer.push({
  event: 'generate_lead',
  event_id: '<server-confirmed-non-pii-event-id>',
  form_id: 'rfq_primary',
  lead_type: 'purchase_list',
  submission_method: 'web_form',
  file_count: 2,
  page_type: 'rfq',
  page_path: '/request-consultation',
  language: 'fa',
  market: 'ir'
});
```

### 10.7 Error event

```js
window.dataLayer.push({
  event: 'form_submit_error',
  event_id: crypto.randomUUID(),
  form_id: 'rfq_primary',
  error_code: 'server_error',
  error_type: 'submission',
  retryable: true
});
```

### 10.8 تابع مرکزی پیشنهادی

تمام Componentها باید از یک Wrapper مرکزی استفاده کنند و مستقیماً `dataLayer.push` را تکرار نکنند:

```ts
type AnalyticsValue = string | number | boolean | undefined;

type AnalyticsPayload = Record<string, AnalyticsValue> & {
  event: string;
};

export function trackEvent(payload: AnalyticsPayload): void {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'true') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    ...payload,
    site_environment:
      process.env.NEXT_PUBLIC_SITE_ENV || 'development'
  });
}
```

Type declaration:

```ts
declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown>>;
  }
}
```

این نمونه باید با معماری نهایی پروژه و قواعد `TECHNICAL_ARCHITECTURE.md` و `FOLDER_STRUCTURE.md` تطبیق داده شود.

---

## 11. GTM Container Specification

### 11.1 ساختار نام‌گذاری

#### Tags

```text
GA4 - Google Tag - Base
GA4 - Event - generate_lead
GA4 - Event - cta_click
GA4 - Event - form_start
GA4 - Event - form_submit_attempt
GA4 - Event - form_submit_error
GA4 - Event - rfq_file_attach
GA4 - Event - click_phone
GA4 - Event - click_whatsapp
```

#### Triggers

```text
CE - generate_lead
CE - cta_click
CE - form_start
CE - form_submit_attempt
CE - form_submit_error
CE - rfq_file_attach
CE - click_phone
CE - click_whatsapp
PV - All Pages - Production
```

#### Variables

```text
CONST - GA4 Measurement ID
CONST - Site Environment
DLV - event_id
DLV - page_type
DLV - page_section
DLV - content_group
DLV - language
DLV - market
DLV - cta_id
DLV - cta_text
DLV - cta_destination
DLV - form_id
DLV - lead_type
DLV - file_count
DLV - error_code
```

### 11.2 Folderها

```text
00 - Consent
10 - Core Analytics
20 - Lead Generation
30 - Contact Actions
40 - Content Engagement
80 - QA and Debug
90 - Deprecated
```

### 11.3 قواعد Container

- از Triggerهای عمومی CSS Click برای تبدیل اصلی استفاده نشود.
- Custom HTML فقط در صورت نبود Tag Template امن و پس از Code Review مجاز است.
- همه Tags باید Consent requirement مشخص داشته باشند.
- Tags فقط در Production ارسال شوند، مگر Stream مستقل تست تعریف شده باشد.
- نام هر Version باید شامل تاریخ، Ticket/Task و شرح کوتاه باشد.
- پیش از Publish، Preview و QA الزامی است.
- Workspace مشترک بدون توضیح و Version Note منتشر نشود.
- Tag یا Variable حذف‌شده ابتدا به Folder `90 - Deprecated` منتقل و پس از یک Release پاک شود.

---

## 12. Consent Mode v2 و Cookie Consent

### 12.1 تصمیم پایه

پیاده‌سازی اولیه باید Privacy-first و از نوع Basic Consent Mode باشد:

- قبل از رضایت، Tagهای Analytics و Advertising اجرا نشوند.
- وضعیت پیش‌فرض برای Storage و Advertising برابر `denied` باشد.
- Consent Update باید در همان صفحه و پیش از Navigation بعدی اعمال شود.
- کاربر بتواند رضایت را رد، قبول یا بعداً تغییر دهد.
- لینک «تنظیمات کوکی» در Footer و صفحه Privacy در دسترس باشد.

### 12.2 وضعیت‌های Consent

```js
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500
});
```

پس از رضایت Analytics:

```js
gtag('consent', 'update', {
  analytics_storage: 'granted'
});
```

رضایت تبلیغاتی به‌صورت مستقل و فقط در صورت وجود Tag تبلیغاتی مدیریت شود:

```js
gtag('consent', 'update', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
});
```

### 12.3 دسته‌های Consent UI

| دسته | پیش‌فرض | امکان غیرفعال‌سازی | توضیح |
|---|---|---|---|
| ضروری | فعال | خیر | امنیت و عملکرد پایه فرم |
| تحلیل | غیرفعال تا رضایت | بله | GA4 |
| تبلیغات | غیرفعال تا رضایت | بله | Google Ads/Remarketing در آینده |

### 12.4 الزامات

- Consent state در Data Layer شامل شناسه شخصی نباشد.
- تغییر Consent به‌عنوان Conversion یا Marketing Event ثبت نشود.
- Banner در RTL، Keyboard-friendly و سازگار با Screen Reader باشد.
- «رد همه» نباید از «قبول همه» پنهان‌تر یا سخت‌تر باشد.
- متن حقوقی و منطقه‌ای باید پیش از Launch توسط مسئول حقوقی/حریم خصوصی تأیید شود.
- در صورت انتخاب Advanced Consent Mode در آینده، تصمیم و علت آن در `DECISIONS.md` ثبت شود.

---

## 13. Campaign و UTM Governance

### 13.1 پارامترهای مجاز

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

### 13.2 قواعد مقدارگذاری

- فقط حروف کوچک لاتین، عدد، Underscore یا Hyphen؛
- بدون فاصله و بدون نام شخص؛
- Source نام Platform باشد؛
- Medium نوع کانال باشد؛
- Campaign نام Initiative پایدار باشد؛
- Content برای تمایز Creative/Placement؛
- Term فقط برای Keyword یا Segment غیرشخصی.

### 13.3 Taxonomy پیشنهادی

| Field | نمونه |
|---|---|
| `utm_source` | `google`, `linkedin`, `instagram`, `newsletter`, `partner` |
| `utm_medium` | `organic`, `cpc`, `social`, `email`, `referral`, `offline` |
| `utm_campaign` | `rfq_launch_2026`, `steel_procurement_iraq_2026` |
| `utm_content` | `hero_video_a`, `technical_post_03`, `qr_catalog_back` |
| `utm_term` | `steel_procurement` |

### 13.4 ممنوعیت‌ها

- UTM روی لینک‌های داخلی سایت استفاده نشود؛ این کار Attribution اصلی را خراب می‌کند.
- شماره مشتری، نام فروشنده، Email یا Phone در UTM قرار نگیرد.
- لینک‌های چاپی/QR باید نام‌گذاری مصوب و Short URL قابل مدیریت داشته باشند.
- تغییر نام کمپین در میانه اجرا بدون Mapping مستند ممنوع است.

---

## 14. Custom Dimensions و Metrics

فقط پارامترهایی که واقعاً در Report یا Funnel استفاده می‌شوند به Custom Definition تبدیل شوند.

### Event-scoped Dimensions پیشنهادی

| نام نمایشی | Parameter |
|---|---|
| Page Type | `page_type` |
| Page Section | `page_section` |
| Content Group | `content_group` |
| Language | `language` |
| Market | `market` |
| CTA ID | `cta_id` |
| CTA Destination | `cta_destination` |
| Form ID | `form_id` |
| Lead Type | `lead_type` |
| Asset ID | `asset_id` |
| Error Code | `error_code` |

### Custom Metrics پیشنهادی

| نام نمایشی | Parameter | واحد |
|---|---|---|
| File Count | `file_count` | Standard |
| CTA Position | `cta_position` | Standard |

`event_id` برای QA و Deduplication است و نباید بدون نیاز به Custom Dimension تبدیل شود؛ Cardinality بالا می‌تواند کیفیت گزارش‌ها را کاهش دهد.

---

## 15. Funnelها و KPIها

### 15.1 قیف اصلی RFQ

```text
Landing Page View
→ CTA Click
→ View RFQ
→ Form Start
→ Submit Attempt
→ Generate Lead
```

### 15.2 KPIهای اصلی

| KPI | فرمول |
|---|---|
| Website Lead Conversion Rate | `Users with generate_lead / Total users × 100` |
| Session Lead Conversion Rate | `Sessions with generate_lead / Sessions × 100` |
| CTA Click Rate | `Users with cta_click / Eligible page users × 100` |
| CTA-to-Form Rate | `Users with form_start after cta_click / Users with cta_click × 100` |
| Form Start Rate | `Users with form_start / Users with view_rfq × 100` |
| Form Completion Rate | `Users with generate_lead / Users with form_start × 100` |
| Submit Error Rate | `form_submit_error / form_submit_attempt × 100` |
| Assisted Contact Rate | `Users with phone/whatsapp/email click / Users × 100` |
| Organic Lead Rate | `Organic users with generate_lead / Organic users × 100` |
| Qualified Lead Rate — فاز دوم | `qualify_lead / generate_lead × 100` |

### 15.3 ابعاد تحلیل

- Source / Medium؛
- Campaign؛
- Default Channel Group؛
- Landing Page؛
- `page_type` و `content_group`؛
- Device category؛
- Language و Market؛
- New / Returning؛
- Lead type؛
- CTA ID و Page section.

### 15.4 گزارش‌های الزامی

1. Acquisition Overview؛
2. Organic Landing Pages؛
3. RFQ Funnel؛
4. CTA Performance؛
5. Form Errors؛
6. Contact Actions؛
7. Content/Asset Downloads؛
8. Language and Market — پس از چندزبانه‌شدن؛
9. Lead Quality — پس از اتصال CRM.

در Dashboard مدیریتی، `generate_lead` از Contact Clickها جدا نمایش داده شود تا تعداد Lead بزرگ‌نمایی نشود.

---

## 16. QA و Validation Plan

### 16.1 ابزارهای تست

- GTM Preview؛
- Google Tag Assistant؛
- GA4 DebugView؛
- GA4 Realtime؛
- Browser DevTools: Network، Console و Storage؛
- گزارش‌های استاندارد GA4 پس از زمان پردازش.

### 16.2 ماتریس تست

| سناریو | انتظار |
|---|---|
| اولین بارگذاری Home | دقیقاً یک `page_view` |
| Route Change در SPA | دقیقاً یک `page_view` با Path جدید |
| باز و بسته‌کردن Menu/Modal | بدون Page View جدید |
| کلیک CTA Hero | یک `cta_click` با `home_hero_primary` |
| اولین تعامل فرم | یک `form_start` |
| تعامل‌های بعدی همان فرم | بدون `form_start` تکراری |
| خطای Required | `form_validation_error` بدون مقدار Field |
| انتخاب فایل | `rfq_file_attach` بدون نام فایل |
| شکست Network | `form_submit_error` و بدون `generate_lead` |
| پاسخ موفق Server | یک `generate_lead` |
| Refresh صفحه تشکر | بدون `generate_lead` جدید |
| کلیک `tel:` | `click_phone` بدون شماره |
| رد Consent | هیچ Tag تحلیلی/تبلیغاتی اجرا نشود |
| قبول Analytics | GA4 پس از Consent فعال شود |
| تغییر نظر و لغو Analytics | ارسال بعدی Analytics متوقف شود |
| محیط Staging | هیچ داده‌ای به Property اصلی نرود |
| URL دارای Email/Phone | داده حساس پیش از ارسال حذف شود |

### 16.3 Browser و Device

حداقل روی موارد زیر تست شود:

- Chrome Desktop؛
- Firefox Desktop؛
- Safari Desktop؛
- Chrome Android؛
- Safari iOS؛
- Desktop، Tablet و Mobile Breakpointها؛
- حالت Keyboard-only و Screen Reader برای Consent Banner.

### 16.4 معیار پذیرش Release

- هیچ خطای Console مرتبط با GTM/Analytics وجود ندارد.
- هیچ PII در Requestهای Analytics دیده نمی‌شود.
- هر رویداد فقط یک‌بار و با Parameters صحیح ثبت می‌شود.
- Consent قبل از Tagها مقدار پیش‌فرض را تنظیم می‌کند.
- `generate_lead` فقط در Success واقعی ثبت می‌شود.
- Data از Development/Staging وارد Property اصلی نمی‌شود.
- Naming با این سند مطابقت دارد.
- Tag Assistant و DebugView هر دو نتیجه صحیح نشان می‌دهند.
- عملکرد فرم با مسدودبودن Trackerها مختل نمی‌شود.

---

## 17. Data Quality Monitoring

### بررسی روزانه در هفته اول Launch

- وجود `page_view` و `session_start`؛
- نبود Spike یا Drop غیرعادی؛
- نسبت منطقی `generate_lead` به رکوردهای Backend؛
- نبود Duplicate در `generate_lead`؛
- نبود URL یا Parameter مشکوک به PII؛
- وضعیت Consent و Tag firing.

### بررسی هفتگی در ماه اول

- مقایسه تعداد Lead در GA4 و Backend/CRM؛
- بررسی Top Events و Eventهای ناشناخته؛
- بررسی `not_found` و Landing Pageهای خطادار؛
- بررسی Source/Mediumهای `(not set)` و `unassigned`؛
- بررسی Referralهای ناخواسته؛
- بررسی Form error rate.

### تلورانس تطبیق

GA4 و Backend لزوماً برابر مطلق نیستند، زیرا Consent، Ad Blocker، قطع اتصال و محدودیت Browser می‌توانند مانع ثبت Client-side شوند. Backend مرجع قطعی تعداد درخواست‌های ثبت‌شده است؛ GA4 مرجع تحلیل رفتار و Attribution است.

---

## 18. امنیت، دسترسی و Governance

### 18.1 دسترسی

- حساب سازمانی مالک GA4 و GTM باشد، نه حساب شخصی پیمانکار.
- حداقل دو Administrator سازمانی قابل اعتماد وجود داشته باشد.
- اصل Least Privilege رعایت شود.
- احراز هویت دومرحله‌ای برای حساب‌های دارای Publish Access الزامی است.
- دسترسی پیمانکار پس از پایان همکاری بازبینی یا حذف شود.
- Credential یا Secret در GTM Custom HTML ذخیره نشود.

### 18.2 تغییرات

هر تغییر Tracking باید شامل موارد زیر باشد:

1. علت تجاری؛
2. Event و Parameters؛
3. Owner؛
4. محیط تست؛
5. نتیجه QA؛
6. تاریخ Publish؛
7. شماره Version Container؛
8. اثر احتمالی بر Privacy و Reporting.

### 18.3 حذف و Deprecation

- Event بدون Migration ناگهانی تغییر نام ندهد.
- Event منسوخ حداقل یک Release با وضعیت Deprecated باقی بماند.
- Reportها و Custom Definitions پیش از حذف Event بررسی شوند.
- تاریخ پایان Collection در `CHANGELOG.md` ثبت شود.

---

## 19. Performance Rules

- GTM نباید Rendering محتوای اصلی را Block کند.
- Scriptهای Third-party غیرضروری نصب نشوند.
- Custom HTML و Listenerهای سراسری متعدد ممنوع‌اند.
- Listenerهای Analytics باید Passive و سبک باشند، مگر نیاز فنی خلاف آن را ثابت کند.
- Scroll Tracking سفارشی چندمرحله‌ای در فاز اول اجرا نشود؛ Event استاندارد برای نیاز اولیه کافی است.
- Tag Sequencing و Consent نباید Submission فرم را متوقف کنند.
- شکست GA4/GTM نباید باعث شکست Navigation، Download یا RFQ شود.
- تأثیر Tagها بر Core Web Vitals پیش و پس از انتشار اندازه‌گیری شود.

---

## 20. مراحل اجرای پیشنهادی

### Phase 0 — Ownership و Setup

- ایجاد/تأیید حساب سازمانی GA4 و GTM؛
- تعیین Owner؛
- تکمیل Measurement ID و Container ID؛
- تعریف Production/Staging policy؛
- ایجاد Property و Web Stream؛
- تنظیم Time zone، Retention و Filters.

### Phase 1 — Core Measurement

- نصب GTM؛
- نصب GA4 از طریق GTM؛
- پیاده‌سازی Consent Mode v2؛
- Page View صحیح؛
- Enhanced Measurement منتخب؛
- Page Context؛
- Internal/Developer traffic testing.

### Phase 2 — Lead Funnel

- CTA tracking؛
- Form start و validation؛
- File attach metadata بدون PII؛
- Submit attempt/error؛
- `generate_lead` پس از Success واقعی؛
- Mark کردن `generate_lead` به‌عنوان Key Event؛
- ساخت RFQ Funnel.

### Phase 3 — Reporting و Optimization

- Custom Dimensions ضروری؛
- Acquisition و Landing reports؛
- CTA/Form Dashboard؛
- UTM governance؛
- تطبیق GA4 با Backend؛
- Baseline سی‌روزه.

### Phase 4 — CRM و Paid Media

- تعریف شناسه Pseudonymous؛
- Qualification events؛
- Measurement Protocol با Validation؛
- Google Ads integration؛
- Conversion import؛
- Value-based optimization فقط پس از Data quality کافی.

---

## 21. Definition of Done

پیاده‌سازی Analytics زمانی کامل است که:

- [ ] مالکیت سازمانی GA4 و GTM مشخص است.
- [ ] شناسه‌های واقعی فقط در Configuration امن قرار دارند.
- [ ] GTM تنها درگاه Client-side Analytics است.
- [ ] Consent Mode v2 پیش از Tagها اجرا می‌شود.
- [ ] Page View در Load و Route Change Duplicate ندارد.
- [ ] همه CTAهای کلیدی `data-analytics-id` پایدار دارند.
- [ ] Form funnel مطابق این سند ثبت می‌شود.
- [ ] `generate_lead` فقط پس از Success واقعی Server ارسال می‌شود.
- [ ] Refresh/Retry باعث Lead تکراری نمی‌شود.
- [ ] هیچ PII، متن آزاد یا نام فایل آپلودی به GA4 نمی‌رود.
- [ ] `generate_lead` به‌عنوان Primary Key Event فعال است.
- [ ] Contact clickها از Lead واقعی جدا گزارش می‌شوند.
- [ ] Internal و Developer traffic فیلتر شده‌اند.
- [ ] Staging/Development داده Production را آلوده نمی‌کنند.
- [ ] QA در Tag Assistant، DebugView و Realtime موفق است.
- [ ] گزارش RFQ Funnel و Acquisition ساخته شده است.
- [ ] Event dictionary و GTM Version در `CHANGELOG.md` ثبت شده‌اند.
- [ ] Privacy Policy و Cookie UI با رفتار واقعی Tracking هماهنگ‌اند.

---

## 22. موارد ممنوع برای Claude Code

Claude Code و هر توسعه‌دهنده خودکار نباید:

- شناسه GA4 یا GTM جعلی تولید کند؛
- بدون مجوز، Tracker جدید اضافه کند؛
- GA4 را هم با GTM و هم با `gtag.js` نصب کند؛
- `generate_lead` را روی Button Click یا Form Attempt ثبت کند؛
- داده فرم یا PII را در Event، URL، Log یا Data Layer قرار دهد؛
- نام فایل آپلودی کاربر را Track کند؛
- Consent را دور بزند یا قبل از تصمیم کاربر Tag غیرضروری اجرا کند؛
- Event name یا Parameter را خارج از این قرارداد تغییر دهد؛
- کد Analytics را به منطق حیاتی فرم وابسته کند؛
- Production Tag را در Local یا Staging فعال کند؛
- بدون Preview، QA و Version Note، Container را Publish کند.

در صورت تعارض این سند با `FORM_ARCHITECTURE.md`، `PRIVACY`، `SECURITY_GUIDELINES.md` یا تصمیم حقوقی جدید، Tracking متوقف و تعارض ابتدا در `DECISIONS.md` حل شود.

---

## 23. منابع رسمی

- [Google Analytics — Recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Google Analytics — Enhanced measurement events](https://support.google.com/analytics/answer/9216061?hl=en)
- [Google Tag Manager — The data layer](https://developers.google.com/tag-platform/tag-manager/datalayer)
- [Google Analytics — Mark events as key events](https://support.google.com/analytics/answer/13128484?hl=en)
- [Google Tag Platform — Set up consent mode on websites](https://developers.google.com/tag-platform/security/guides/consent)
- [Google Tag Platform — Troubleshoot consent mode with Tag Assistant](https://developers.google.com/tag-platform/security/guides/consent-debugging)
- [Google Analytics — Avoid sending Personally Identifiable Information](https://support.google.com/analytics/answer/6366371?hl=en)
- [Google Analytics — Data retention](https://support.google.com/analytics/answer/7667196?hl=en)

---

## 24. تصمیم نهایی سند

معیار موفقیت وب‌سایت آهن آسا تعداد کلیک‌ها نیست؛ تعداد درخواست‌های واقعی و در آینده تعداد Leadهای واجد شرایط است. بنابراین:

> `generate_lead` تنها تبدیل اصلی فاز اول است، Backend مرجع قطعی ثبت درخواست است، GTM لایه مدیریت Tag و GA4 ابزار تحلیل رفتار و Attribution خواهد بود؛ بدون ارسال هیچ داده شخصی یا محرمانه.
