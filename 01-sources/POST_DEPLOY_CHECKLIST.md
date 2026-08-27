# POST_DEPLOY_CHECKLIST.md

> چک‌لیست اجرایی کنترل وب‌سایت پس از استقرار در محیط Production

## 1. مشخصات سند

| فیلد | مقدار |
|---|---|
| پروژه | Ahan Asa Website |
| نوع سند | Post-Deployment Verification Runbook |
| محیط هدف | Production |
| پشته مرجع | Next.js App Router + vinext + Cloudflare Workers |
| مالک اجرا | Release Owner / DevOps |
| تأییدکنندگان | Technical Lead، QA، SEO، Marketing |
| زمان شروع | حداکثر ۵ دقیقه پس از Deploy |
| چرخه‌های بازبینی | ۰–۱۵ دقیقه، ۱۵–۶۰ دقیقه، ۲۴ ساعت، ۷۲ ساعت و ۷ روز |
| وضعیت سند | Living Document |

---

## 2. هدف

این سند برای اطمینان از صحت فنی، عملکردی، امنیتی، تحلیلی و SEO وب‌سایت پس از هر Deploy در محیط Production استفاده می‌شود. Deploy تنها زمانی «تکمیل‌شده» محسوب می‌شود که:

- همه کنترل‌های سطح `P0` و `P1` موفق باشند؛
- برای موارد ناموفق، Incident ثبت و مالک تعیین شده باشد؛
- شواهد اجرای تست‌ها در گزارش انتشار ثبت شده باشد؛
- Release Owner نتیجه نهایی را تأیید کرده باشد.

این سند جایگزین `PRE_DEPLOY_CHECKLIST.md`، تست‌های خودکار یا برنامه Rollback نیست؛ بلکه صحت نسخه‌ای را بررسی می‌کند که عملاً به کاربران ارائه شده است.

---

## 3. قواعد استفاده

### 3.1 وضعیت هر کنترل

- `[ ]` اجرا نشده
- `[x]` موفق
- `FAIL` ناموفق و نیازمند اقدام
- `N/A` نامرتبط با این انتشار؛ همراه با دلیل

هیچ موردی حذف نشود. موارد نامرتبط باید با `N/A` و توضیح ثبت شوند.

### 3.2 اولویت‌ها

| سطح | تعریف | اقدام |
|---|---|---|
| `P0 — Critical` | قطعی عمومی، خطر امنیتی، از دست رفتن داده، فرم اصلی کاملاً خراب یا انتشار اطلاعات محرمانه | توقف بررسی، فعال‌کردن Incident و Rollback طبق ماتریس اختیار |
| `P1 — High` | خرابی مسیر یا قابلیت اصلی، خطای گسترده SEO، Analytics یا چندزبانه | تصمیم Fix-forward یا Rollback حداکثر طی ۳۰ دقیقه |
| `P2 — Medium` | ایراد محدود، افت عملکرد یا مشکل ظاهری قابل‌توجه | ثبت Issue و تعیین SLA |
| `P3 — Low` | ایراد جزئی بدون اثر جدی بر کاربر یا کسب‌وکار | افزودن به Backlog |

### 3.3 الزامات شواهد

برای هر `FAIL` حداقل موارد زیر ثبت شود:

- URL و Locale؛
- زمان مشاهده همراه با Timezone؛
- دستگاه، مرورگر و نوع اتصال؛
- اسکرین‌شات، ویدئو، Log یا خروجی دستور؛
- Deployment ID و Commit SHA؛
- شدت، مالک و تصمیم نهایی.

### 3.4 قواعد Claude Code

Claude Code هنگام اجرای این سند باید:

1. ابتدا اطلاعات انتشار و دامنه‌های مجاز را دریافت یا از اسناد پروژه استخراج کند.
2. بررسی‌های Read-only را پیش از هر تست تغییردهنده داده اجرا کند.
3. هیچ Secret، Token، Cookie، اطلاعات فرم یا Environment Value را در خروجی چاپ نکند.
4. برای تست فرم فقط از داده آزمایشی تأییدشده با پیشوند `[POST-DEPLOY-TEST]` استفاده کند.
5. بدون اختیار صریح، Rollback، تغییر DNS، Purge سراسری Cache یا تغییر Production انجام ندهد.
6. در پایان، گزارش بخش 17 را کامل کند؛ صرف عبارت «Deploy موفق بود» قابل قبول نیست.

---

## 4. اطلاعات انتشار

```text
Project:
Production URL:
Canonical Host:
Deployment Provider:
Deployment ID / URL:
Git Branch:
Commit SHA:
Release Tag:
Deployed By:
Deploy Started At:
Deploy Completed At:
Previous Stable Deployment:
Rollback Target:
Change Summary:
Known Risks:
Incident Channel / Ticket:
```

### متغیرهای نمونه برای بررسی خط فرمان

```bash
export SITE_ORIGIN="https://www.example.com"
export CANONICAL_HOST="www.example.com"
```

> مقدار نمونه باید با دامنه واقعی Production جایگزین شود. هیچ Secret در Shell History یا گزارش ذخیره نشود.

---

## 5. دروازه صفر — ۰ تا ۵ دقیقه پس از Deploy

### 5.1 وضعیت Deploy

- [ ] `P0` وضعیت Deployment در پلتفرم `Ready/Success` است.
- [ ] `P0` Deployment به دامنه Production متصل و همان نسخه مورد انتظار است.
- [ ] `P0` Commit SHA و Deployment ID با Release ثبت‌شده تطابق دارند.
- [ ] `P0` Build Log فاقد خطای پنهان، Crash یا شکست مرحله Post-build است.
- [ ] `P1` Environment Variables موردنیاز در Production موجودند؛ فقط نام و وضعیت وجود بررسی شود، نه مقدار Secret.
- [ ] `P1` Cron Job، Queue، Webhook و Migrationهای مرتبط، در صورت وجود، وضعیت سالم دارند.
- [ ] `P1` نسخه قبلی سالم و روش Rollback قابل دسترس است.

### 5.2 دسترس‌پذیری اولیه

- [ ] `P0` صفحه اصلی از خارج شبکه توسعه باز می‌شود.
- [ ] `P0` پاسخ صفحه اصلی `2xx` یا Redirect مورد انتظار است و `5xx` مشاهده نمی‌شود.
- [ ] `P0` HTML متعلق به نسخه Production است، نه Preview، Maintenance یا نسخه قدیمی.
- [ ] `P0` فایل‌های JavaScript، CSS، Font و تصاویر بحرانی بارگذاری می‌شوند.
- [ ] `P1` یک URL نامعتبر، صفحه 404 صحیح با Status مناسب برمی‌گرداند.

```bash
curl -sSIL "$SITE_ORIGIN/"
curl -sS -o /dev/null -w 'status=%{http_code} time=%{time_total}s\n' "$SITE_ORIGIN/"
curl -sS -o /dev/null -w 'status=%{http_code}\n' "$SITE_ORIGIN/__post_deploy_missing_page__"
```

**معیار عبور:** نبود `5xx`، نبود Asset بحرانی شکسته و قابل استفاده بودن صفحه اصلی.

---

## 6. دامنه، DNS، HTTPS و CDN — ۰ تا ۱۵ دقیقه

- [ ] `P0` دامنه اصلی به مقصد Production صحیح Resolve می‌شود.
- [ ] `P0` گواهی TLS معتبر، منقضی‌نشده و منطبق با Host است.
- [ ] `P0` تمام نسخه‌های `http` به `https` هدایت می‌شوند.
- [ ] `P1` دامنه Apex و `www` مطابق تصمیم Canonical فقط به یک Host نهایی می‌رسند.
- [ ] `P1` Redirect Loop، زنجیره غیرضروری یا انتقال به دامنه قدیمی وجود ندارد.
- [ ] `P1` مسیر و Query String در Redirectهای دامنه حفظ می‌شوند.
- [ ] `P1` Cloudflare هیچ صفحه Challenge یا Block ناخواسته به کاربران واقعی نشان نمی‌دهد.
- [ ] `P1` Cache سبب نمایش HTML نسخه قبلی یا محتوای Locale اشتباه نمی‌شود.
- [ ] `P2` Headerهای Cache برای HTML و Assetهای Hash‌شده مطابق `CACHING_STRATEGY.md` هستند.
- [ ] `P2` فشرده‌سازی Brotli یا gzip برای منابع متنی فعال است.

```bash
curl -sSIL "http://example.com/test-path?source=qa"
curl -sSIL "https://example.com/test-path?source=qa"
curl -sSIL "https://www.example.com/test-path?source=qa"
```

**معیار عبور:** همه ورودی‌های دامنه حداکثر با مسیر Redirect مصوب به Canonical HTTPS می‌رسند.

---

## 7. Smoke Test مسیرها و رابط کاربری — ۵ تا ۳۰ دقیقه

### 7.1 مسیرهای اصلی

- [ ] `P0` Home
- [ ] `P1` About
- [ ] `P1` Products / Services / Systems Hub
- [ ] `P1` صفحه جزئیات حداقل یک محصول یا خدمت
- [ ] `P1` Projects / Portfolio
- [ ] `P1` Contact
- [ ] `P0` RFQ / Lead Capture
- [ ] `P1` Privacy / Terms، در صورت وجود
- [ ] `P1` صفحات محتوایی یا Resourceهای تغییرکرده در این Release
- [ ] `P1` تمام URLهای مشخص‌شده در Change Summary

برای هر مسیر کلیدی بررسی شود:

- [ ] Status Code صحیح است.
- [ ] H1، متن اصلی، CTA و تصاویر نمایش داده می‌شوند.
- [ ] Link یا Button بن‌بست وجود ندارد.
- [ ] Header، Navigation، Mobile Menu و Footer سالم‌اند.
- [ ] Hydration Error، Blank State یا Flash شدید محتوای بدون Style دیده نمی‌شود.
- [ ] Back/Forward مرورگر، Refresh مستقیم و Deep Link درست عمل می‌کنند.
- [ ] Console فاقد خطاهای جدید و تکرارشونده است.
- [ ] Network فاقد درخواست‌های `4xx/5xx` غیرمنتظره است.

### 7.2 دستگاه‌ها و مرورگرها

- [ ] `P1` Chrome Desktop — آخرین نسخه پایدار
- [ ] `P1` Safari Desktop یا iOS Safari
- [ ] `P1` Chrome Android
- [ ] `P2` Firefox Desktop
- [ ] `P2` Edge Desktop
- [ ] `P1` عرض‌های مرجع Mobile، Tablet و Desktop طبق `RESPONSIVE_QA.md`

---

## 8. جریان‌های تبدیل و Integrationها — ۱۰ تا ۴۵ دقیقه

### 8.1 فرم‌ها

- [ ] `P0` فرم RFQ با داده آزمایشی معتبر ارسال می‌شود.
- [ ] `P0` Lead فقط یک‌بار در CRM/Email/Database ایجاد می‌شود.
- [ ] `P0` Success State واقعی است و قبل از تأیید Backend نمایش داده نمی‌شود.
- [ ] `P1` Validation فیلدهای Required، Email، Phone و Upload صحیح است.
- [ ] `P1` خطای Backend به پیام قابل فهم و قابل بازیابی برای کاربر تبدیل می‌شود.
- [ ] `P1` Double-click باعث ثبت تکراری نمی‌شود.
- [ ] `P1` Attribution مانند UTM، Landing Page، Locale و Referrer منتقل می‌شود.
- [ ] `P1` Notification داخلی به گیرنده صحیح می‌رسد.
- [ ] `P1` پاسخ خودکار کاربر، در صورت تعریف، با زبان و برند صحیح ارسال می‌شود.
- [ ] `P1` داده‌های شخصی در URL، Log مرورگر یا Event Analytics نشت نمی‌کنند.
- [ ] `P2` Spam Protection مانع کاربر واقعی نمی‌شود.

```text
Test Lead Prefix: [POST-DEPLOY-TEST]
Submitted At:
Form URL:
Locale:
CRM/Database Record ID:
Notification Received At:
Duplicate Created: Yes / No
Cleanup Owner:
```

### 8.2 CTA و ارتباط مستقیم

- [ ] `P1` شماره‌های تلفن قابل کلیک و صحیح‌اند.
- [ ] `P1` WhatsApp به شماره، متن و Locale درست باز می‌شود.
- [ ] `P1` Email Link مقصد و Subject مورد انتظار دارد.
- [ ] `P1` CTAهای Header، Hero، صفحات داخلی و Footer مقصد صحیح دارند.
- [ ] `P1` فایل‌های Download با نام، MIME Type و نسخه صحیح دریافت می‌شوند.

### 8.3 API و سرویس‌های خارجی

- [ ] `P0` Endpointهای بحرانی پاسخ سالم دارند.
- [ ] `P1` Webhookها با Signature/Secret صحیح پردازش می‌شوند.
- [ ] `P1` Rate Limit یا WAF درخواست معتبر را مسدود نمی‌کند.
- [ ] `P1` Timeout، Retry و Fallback مطابق `API_INTEGRATIONS.md` عمل می‌کنند.
- [ ] `P1` هیچ URL مربوط به Staging، localhost یا سرویس قدیمی در Production وجود ندارد.

---

## 9. چندزبانه، RTL و LTR — ۱۵ تا ۴۵ دقیقه

> فقط Localeهای فعال پروژه بررسی شوند. Locale غیرفعال با `N/A` علامت‌گذاری شود.

- [ ] `P1` Locale پیش‌فرض در مسیر مصوب باز می‌شود؛ برای نمونه فارسی بدون Prefix.
- [ ] `P1` مسیرهای `/en`، `/ar` و `/ru` در صورت فعال بودن پاسخ صحیح دارند.
- [ ] `P1` تغییر زبان، معادل همان صفحه را باز می‌کند؛ نه همیشه Home.
- [ ] `P1` `lang` و `dir` عنصر `<html>` برای هر Locale صحیح‌اند.
- [ ] `P1` فارسی و عربی RTL و انگلیسی/روسی LTR نمایش داده می‌شوند.
- [ ] `P1` Header، فرم، شماره تلفن، Icon، Breadcrumb و Slider در هر جهت سالم‌اند.
- [ ] `P1` ترجمه کلیدهای UI موجود است و Raw Translation Key دیده نمی‌شود.
- [ ] `P1` محتوا، Metadata، پیام Validation و Success State با Locale یکسان‌اند.
- [ ] `P2` اعداد، تاریخ، واحد و قالب تلفن طبق قواعد پروژه نمایش داده می‌شوند.
- [ ] `P2` Text Overflow، بریدگی متن و جابه‌جایی ناخواسته در ترجمه‌های طولانی وجود ندارد.

---

## 10. SEO فنی و قابلیت ایندکس — ۱۵ تا ۶۰ دقیقه

### 10.1 کنترل‌های بحرانی

- [ ] `P0` هیچ `noindex` ناخواسته در صفحات عمومی Production وجود ندارد.
- [ ] `P0` `robots.txt` موتورهای جست‌وجو را به‌اشتباه از کل سایت مسدود نمی‌کند.
- [ ] `P0` Canonicalها به دامنه و پروتکل Production اشاره می‌کنند.
- [ ] `P1` `sitemap.xml` با Status `200` در دسترس است.
- [ ] `P1` Sitemap فقط URLهای Canonical، قابل ایندکس و Production را شامل می‌شود.
- [ ] `P1` URLهای Preview، Staging، localhost، Query-based و Redirect شده در Sitemap نیستند.
- [ ] `P1` Sitemap در `robots.txt` با URL صحیح معرفی شده است.

```bash
curl -sS "$SITE_ORIGIN/robots.txt"
curl -sSIL "$SITE_ORIGIN/sitemap.xml"
curl -sS "$SITE_ORIGIN/" | sed -n '1,220p'
```

### 10.2 Metadata و Social Sharing

- [ ] `P1` هر صفحه کلیدی Title و Meta Description منحصربه‌فرد و Locale-صحیح دارد.
- [ ] `P1` یک Canonical معتبر و Self-referencing روی صفحات اصلی وجود دارد.
- [ ] `P1` Open Graph Title، Description، URL و Image صحیح‌اند.
- [ ] `P1` Twitter/X Card مطابق Spec تولید می‌شود.
- [ ] `P1` Favicon، Apple Touch Icon و Web Manifest در صورت تعریف در دسترس‌اند.
- [ ] `P2` تصویر Social Sharing از محیط عمومی قابل Fetch است و نسبت/حجم مناسبی دارد.

### 10.3 Hreflang و داده ساختاریافته

- [ ] `P1` هر Locale فعال، Hreflang متقابل و URL صحیح دارد.
- [ ] `P1` `x-default` مطابق تصمیم پروژه تنظیم شده است.
- [ ] `P1` هیچ Hreflang به Redirect، 404، Locale اشتباه یا دامنه قدیمی اشاره نمی‌کند.
- [ ] `P1` JSON-LD معتبر، قابل Parse و منطبق با محتوای قابل مشاهده صفحه است.
- [ ] `P1` Organization، WebSite، Breadcrumb یا Schemaهای صفحه طبق `STRUCTURED_DATA.md` بررسی شده‌اند.
- [ ] `P2` Rich Results Test یا Schema Validator روی نمونه صفحات اجرا شده است.

### 10.4 لینک و Migration

- [ ] `P1` لینک‌های داخلی مهم به URL Canonical می‌روند.
- [ ] `P1` Broken Link بحرانی وجود ندارد.
- [ ] `P1` Redirectهای دامنه یا URLهای قدیمی طبق `REDIRECTS.md` کار می‌کنند.
- [ ] `P1` Redirectها Status دائمی مصوب را دارند و مقصد نهایی `200` است.
- [ ] `P1` در صورت تغییر دامنه، Canonical، Sitemap، Structured Data و Open Graph همگی دامنه جدید را دارند.
- [ ] `P2` چند URL کلیدی با URL Inspection در Search Console بررسی شده‌اند.

---

## 11. Analytics، Tag Manager و Attribution — ۱۵ تا ۶۰ دقیقه

- [ ] `P1` Container و Property مربوط به Production هستند، نه Test/Staging.
- [ ] `P1` Page View اولیه فقط یک‌بار ثبت می‌شود.
- [ ] `P1` Client-side Navigation در Next.js Page View صحیح ایجاد می‌کند.
- [ ] `P1` Eventهای CTA، فرم شروع، فرم موفق، تماس، WhatsApp و Download ثبت می‌شوند.
- [ ] `P1` نام Event و Parameterها مطابق `ANALYTICS_TRACKING.md` هستند.
- [ ] `P1` UTMها و Session Attribution پس از Navigation از بین نمی‌روند.
- [ ] `P1` Debug/Realtime View دریافت Event آزمایشی را نشان می‌دهد.
- [ ] `P1` Event تکراری ناشی از GTM و کد مستقیم وجود ندارد.
- [ ] `P0` PII مانند نام، شماره تلفن، Email یا متن پیام به Analytics ارسال نمی‌شود.
- [ ] `P1` Consent Banner و Consent Mode، در صورت الزام، قبل و بعد از رضایت رفتار صحیح دارند.
- [ ] `P2` Referralهای داخلی یا Payment/CRM Domain باعث شکستن Session نمی‌شوند.

---

## 12. امنیت و حریم خصوصی — ۱۵ تا ۶۰ دقیقه

- [ ] `P0` Secret، API Key، Source Map حساس یا Environment Value در HTML/JS عمومی افشا نشده است.
- [ ] `P0` Routeهای Admin، Preview، Debug و Development عمومی نشده‌اند.
- [ ] `P0` فایل‌های حساس مانند `.env`، `.git`، Backup و Log قابل دریافت نیستند.
- [ ] `P1` Headerهای امنیتی مصوب در پاسخ Production وجود دارند.
- [ ] `P1` CSP، در صورت فعال بودن، Script/Font/Image معتبر را مسدود نمی‌کند.
- [ ] `P1` Cookieها، در صورت وجود، Flagهای `Secure`، `HttpOnly` و `SameSite` مناسب دارند.
- [ ] `P1` فرم و API در برابر ورودی نامعتبر، Injection ساده و Payload بیش‌ازحد رفتار امن دارند.
- [ ] `P1` CORS فقط Originهای موردنیاز را مجاز می‌کند.
- [ ] `P1` WAF و Rate Limit فعال‌اند و False Positive بحرانی ایجاد نمی‌کنند.
- [ ] `P1` صفحه Privacy و Consent با رفتار واقعی Tracking سازگار است.
- [ ] `P2` Dependency/Runtime Alert جدید و بحرانی پس از Deploy وجود ندارد.

نمونه فایل‌های حساس برای کنترل Status، بدون تلاش برای دورزدن کنترل دسترسی:

```text
/.env
/.env.production
/.git/config
/backup.zip
/debug
```

**معیار عبور:** هیچ فایل حساس نباید با محتوای قابل استفاده و Status موفق عمومی شود.

---

## 13. عملکرد و Core Web Vitals — ۳۰ تا ۶۰ دقیقه

### 13.1 تست مصنوعی اولیه

- [ ] `P1` Lighthouse روی Home، یک صفحه داخلی سنگین و یک صفحه تبدیل اجرا شده است.
- [ ] `P1` تست Mobile و Desktop هر دو اجرا شده‌اند.
- [ ] `P1` نتایج با Baseline یا Budget پروژه مقایسه شده‌اند.
- [ ] `P1` افت معنادار نسبت به نسخه قبلی بررسی و توضیح داده شده است.
- [ ] `P1` تصاویر Hero، Fontها و JavaScript غیرضروری باعث Regression بحرانی نشده‌اند.
- [ ] `P2` Cache سرد و گرم هر دو بررسی شده‌اند.
- [ ] `P2` TTFB از حد بودجه پروژه عبور نکرده است.

### 13.2 اهداف میدانی مرجع

درصد ۷۵ بازدیدهای واقعی باید در محدوده «خوب» قرار گیرد:

| معیار | هدف خوب |
|---|---:|
| LCP | `≤ 2.5s` |
| INP | `≤ 200ms` |
| CLS | `≤ 0.1` |

> داده آزمایشگاهی بلافاصله پس از Deploy برای تشخیص Regression استفاده می‌شود؛ قضاوت نهایی Core Web Vitals باید با داده میدانی/RUM و پس از جمع‌شدن نمونه کافی انجام شود.

### 13.3 کنترل منابع

- [ ] `P1` تصویر LCP در اندازه مناسب، بدون Lazy-load نامناسب و بدون دانلود چندبرابری است.
- [ ] `P1` Fontهای اصلی بدون 404، CORS Error یا FOIT طولانی بارگذاری می‌شوند.
- [ ] `P1` Bundle جدید غیرمنتظره یا Third-party Script مسدودکننده ایجاد نشده است.
- [ ] `P1` Layout Shift ناشی از تصویر، Banner، Font یا Widget جدید کنترل شده است.
- [ ] `P2` Preload/Preconnect فقط برای منابع بحرانی و واقعی استفاده شده است.
- [ ] `P2` Assetهای Hash‌شده Cache طولانی و HTML سیاست Cache مناسب دارد.

---

## 14. دسترس‌پذیری و تجربه کاربر — ۳۰ تا ۶۰ دقیقه

- [ ] `P1` Navigation کامل با Keyboard ممکن است.
- [ ] `P1` Focus Indicator قابل مشاهده است.
- [ ] `P1` ترتیب Focus منطقی و بدون Trap ناخواسته است.
- [ ] `P1` Skip Link، در صورت تعریف، کار می‌کند.
- [ ] `P1` Label فرم‌ها، Error Messageها و Required State برای Screen Reader قابل تشخیص‌اند.
- [ ] `P1` Contrast متن و CTAهای اصلی مطابق استاندارد پروژه است.
- [ ] `P1` تصاویر محتوایی Alt مناسب و تصاویر تزئینی Alt خالی دارند.
- [ ] `P1` Heading Hierarchy منطقی است و H1 گم یا تکراری ناخواسته نیست.
- [ ] `P1` Modal، Mobile Menu و Dropdown با Keyboard باز و بسته می‌شوند.
- [ ] `P2` `prefers-reduced-motion` رعایت شده است.
- [ ] `P2` Zoom تا 200% باعث از دست رفتن عملکرد اصلی نمی‌شود.
- [ ] `P2` اسکن خودکار Accessibility روی صفحات نمونه بدون خطای بحرانی است.

---

## 15. پایش پس از انتشار

### 15.1 بازه ۰ تا ۶۰ دقیقه

- [ ] `P0` نرخ `5xx` و Crashها افزایش غیرعادی ندارد.
- [ ] `P0` Function/Edge Runtime Error جدید دیده نمی‌شود.
- [ ] `P1` Latency و Error Rate APIها در محدوده عادی‌اند.
- [ ] `P1` Logها فاقد Loop، Retry Storm یا درخواست تکراری غیرعادی هستند.
- [ ] `P1` فرم‌ها و Eventها پس از Cache گرم نیز سالم‌اند.
- [ ] `P1` Alertهای عملیاتی فعال و گیرندگان آن صحیح‌اند.

### 15.2 بازه ۲۴ ساعت

- [ ] نرخ خطای Frontend و Backend با ۷ روز قبل مقایسه شده است.
- [ ] نرخ تبدیل فرم و CTA افت غیرعادی ندارد.
- [ ] داده GA4/GTM بدون شکاف یا Duplicate قابل مشاهده است.
- [ ] صفحات کلیدی در CDN مناطق هدف قابل دسترسی‌اند.
- [ ] Webhook، Email و CRM Leadهای واقعی بدون خطا پردازش شده‌اند.
- [ ] گزارش Search Console برای خطای Crawl یا Indexing جدید بررسی شده است.
- [ ] مصرف Function، Bandwidth و API خارج از الگوی معمول نیست.

### 15.3 بازه ۷۲ ساعت

- [ ] خطاهای ثبت‌شده کاربران و تیم فروش مرور شده‌اند.
- [ ] Broken Link، 404 و Redirectهای پرتکرار تحلیل شده‌اند.
- [ ] Performance میدانی اولیه و دستگاه‌های کند بررسی شده‌اند.
- [ ] نرخ تبدیل و Drop-off صفحات کلیدی با Baseline مقایسه شده است.
- [ ] Issueهای `P1/P2` مالک، Deadline و وضعیت روشن دارند.

### 15.4 بازه ۷ روز

- [ ] Core Web Vitals/RUM با نمونه موجود مرور شده است.
- [ ] Coverage، Crawl Stats، Indexing و Sitemap در Search Console بررسی شده‌اند.
- [ ] Landing Pageها و Queryهای مهم افت غیرعادی ندارند.
- [ ] KPIهای کسب‌وکار با Baseline پیش از انتشار مقایسه شده‌اند.
- [ ] هزینه و مصرف سرویس‌ها با Budget مقایسه شده است.
- [ ] Post-Release Review تکمیل و درس‌آموخته‌ها در `DECISIONS.md` یا `CHANGELOG.md` ثبت شده‌اند.

---

## 16. شرایط Rollback و Fix-forward

### 16.1 Rollback فوری پیشنهاد می‌شود اگر

- سایت یا جریان اصلی برای بخش معناداری از کاربران در دسترس نیست؛
- داده از بین می‌رود، خراب می‌شود یا به مقصد اشتباه ارسال می‌شود؛
- Secret یا اطلاعات شخصی افشا شده است؛
- خطای `5xx`، Crash یا Latency شدید و پایدار ایجاد شده است؛
- فرم اصلی یا Integration حیاتی کاملاً از کار افتاده و Fix سریع و کم‌ریسک ممکن نیست؛
- تغییر SEO گسترده مانند `noindex` کل سایت، Canonical به دامنه اشتباه یا حذف Sitemap رخ داده است؛
- Regression مهم بدون راه‌حل امن در بازه تصمیم انتشار وجود دارد.

### 16.2 Fix-forward مناسب است اگر

- دامنه اثر محدود و دقیقاً شناخته‌شده است؛
- داده و امنیت در خطر نیستند؛
- اصلاح کوچک، قابل تست و سریع‌تر از Rollback است؛
- Rollback خود باعث ناسازگاری داده یا اختلال بزرگ‌تر می‌شود؛
- Release Owner و Technical Lead تصمیم را ثبت و تأیید کرده‌اند.

### 16.3 مراحل Incident

1. زمان و دامنه اثر را ثبت کنید.
2. تغییرات بیشتر را متوقف کنید.
3. Severity و Incident Owner را تعیین کنید.
4. نسخه سالم قبلی و قابلیت Rollback را تأیید کنید.
5. طبق ماتریس اختیار، Rollback یا Fix-forward را اجرا کنید.
6. دسترسی، فرم‌ها، داده و Monitoring را دوباره بررسی کنید.
7. علت، Timeline، اثر و اقدام پیشگیرانه را ثبت کنید.

```text
Incident ID:
Detected At:
Detected By:
Severity:
Affected URLs/Locales:
User/Business Impact:
Decision: Rollback / Fix-forward / Monitor
Approved By:
Action Started At:
Service Restored At:
Root Cause:
Follow-up Owner:
```

---

## 17. گزارش نهایی انتشار

```markdown
# Post-Deploy Report

- Project:
- Production URL:
- Deployment ID:
- Commit SHA:
- Release Owner:
- Verification Started:
- Verification Completed:

## Result

- Final Status: PASS / PASS WITH KNOWN ISSUES / ROLLED BACK / FAILED
- P0 Passed: __ / __
- P1 Passed: __ / __
- P2 Issues: __
- P3 Issues: __

## Critical Evidence

- Homepage:
- Canonical HTTPS:
- RFQ Test Record:
- Analytics Realtime:
- robots.txt:
- sitemap.xml:
- Lighthouse / Performance:
- Error Monitoring:

## Open Issues

| ID | Severity | Description | URL/Locale | Owner | Deadline | Status |
|---|---|---|---|---|---|---|
| | | | | | | |

## Decision

- Decision: Keep Release / Fix-forward / Rollback
- Approved By:
- Approval Time:
- Notes:
```

### امضای انتشار

| نقش | نام | وضعیت | زمان | توضیح |
|---|---|---|---|---|
| Release Owner |  |  |  |  |
| Technical Lead |  |  |  |  |
| QA |  |  |  |  |
| SEO |  |  |  |  |
| Marketing / Business Owner |  |  |  |  |

---

## 18. معیار نهایی Done

انتشار فقط زمانی بسته می‌شود که تمام موارد زیر برقرار باشند:

- [ ] همه کنترل‌های `P0` موفق‌اند.
- [ ] همه کنترل‌های `P1` موفق‌اند یا Exception مکتوب و تأییدشده دارند.
- [ ] فرم/Lead، Analytics و Integrationهای حیاتی با شواهد واقعی تست شده‌اند.
- [ ] SEO، Canonical، Sitemap، Robots و Localeها سالم‌اند.
- [ ] Error Rate و Performance Regression بحرانی ندارند.
- [ ] همه Issueها Severity، Owner و Deadline دارند.
- [ ] گزارش نهایی و تصمیم Keep/Fix-forward/Rollback ثبت شده است.
- [ ] بررسی‌های ۲۴ ساعت، ۷۲ ساعت و ۷ روز زمان‌بندی و مالک‌گذاری شده‌اند.

---

## 19. منابع مرجع

- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Cloudflare Workers: Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
- [Web Vitals](https://web.dev/articles/vitals)
- [Google Search: Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google Search: Localized Versions and Hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google Search: Block Indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

---

## 20. تاریخچه تغییرات سند

| نسخه | تاریخ | تغییر | نویسنده/تأییدکننده |
|---|---|---|---|
| 1.0.0 | 2026-08-25 | ایجاد نسخه اولیه چک‌لیست پس از Deploy |  |
