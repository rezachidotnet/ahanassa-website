# Google Tag Manager and GA4: setup (W16.4, decision D-SEO)

This page is for the owner. It covers what the site sends, and every step to do in Google Tag Manager (GTM) and Google Analytics 4 (GA4).

| | |
|---|---|
| GTM container | **`GTM-TFN25VZQ`** (in `config/analytics.ts`) |
| GA4 measurement ID | **`G-C8MZB6DXPZ`**, entered only in GTM (step 1) |

The steps start at [§3](#3-step-1--create-the-google-tag-ga4-in-gtm). §1–§2 explain what the site already does.

## 1. What the site does

The site does three things, and only these:

- It loads GTM.
- It pushes events to `window.dataLayer`.
- It never loads `gtag.js` directly.

**GA4 is configured inside GTM, as a Google tag.** The site has no GA4 code and no gtag.js snippet, and a test enforces that (`lib/analytics/analytics.test.ts`). If a second Google tag for `G-C8MZB6DXPZ` were added anywhere else (in the page or in a second GTM tag), every page view would be counted twice.

| Piece | File |
|---|---|
| Container ID and production hostname | `config/analytics.ts` |
| Event names and their allowed parameters | `lib/analytics/events.ts` |
| GTM loader (production hostname, or `?gtm_debug=`, after the page's `load` event) | `lib/analytics/gtm.ts` |
| One component in the layout: `page_locale`, phone and WhatsApp clicks, `rfq_cta_click`, GTM start | `components/analytics/analytics-runtime.tsx` |
| The article page's `article_read` (75% sentinel) and `article_cta_click` | `components/analytics/article-analytics.tsx` |

### Performance

- GTM starts after the window `load` event, so it never competes with the page's LCP image.
- The script is `async`.
- The component renders nothing, so it causes no layout shift.
- There is no `<noscript>` iframe. The CSP has no `frame-src` for Google, and visitors without JavaScript are not measured.

### Staging stays out of GA4

The staging and production builds are byte-identical except for robots, sitemap, `_headers`, the Turnstile key and the RFQ origin (the r4 gate). For that reason the container ID is not set per target. Instead, the browser checks its hostname: only `www.ahanassa.com` loads GTM. Any other host loads it only when the URL has `?gtm_debug=`, which GTM Preview adds automatically.

## 2. dataLayer events

**No personal data is ever sent.**
- Each event has a fixed allowlist of parameters.
- A string value must be a short token: letters, digits and `_ - . :`, with no spaces, `@` or `+`, and at most 64 characters. Anything else is dropped (`buildEvent`).
- A name, email, phone number, message, file name, article or product title, or any Persian/Arabic text can never pass. Articles and products are identified by their URL slug (ASCII) and the catalog family code only.

| Event | Fires when | Parameters |
|---|---|---|
| `rfq_submit` | The RFQ API accepted a request (the tracking-number panel appears) | `rfq_tracking_number` (only this) |
| `phone_click` | Any `tel:` link is clicked (header, footer, hero, mobile menu, CTA) | `link_location`: `header` / `footer` / `mobile_menu` / `main` / `home_expert` (the homepage «با کارشناس فروش صحبت کنید» section, W20.3) |
| `whatsapp_click` | Any `wa.me` / WhatsApp link is clicked | `link_location` (as `phone_click`, plus `sticky` = the floating WhatsApp button on en/ar pages, W20.1) |
| `calculator_use` | The visitor's first change to the weight calculator on this page view | `calculator_product_group` (e.g. `REBAR`), `calculator_mode` |
| `price_page_view` | `/prices` or `/ar/prices` is viewed (when it has prices) | `price_date` (the newest price date shown, `YYYY-MM-DD`) |
| `basket_add` | A product joins the RFQ basket: the visitor arrives at `/contact` from a product, price or calculator link. A duplicate of a row already in the basket, a full list or a reload sends nothing | `basket_size` (filled rows after the add), `product_family`, `product_slug`, `add_source`: `product` / `price` / `calculator` (the page the visitor came from; left out when it was another page or unknown) |
| `file_upload` | A file passes the attachment checks and joins the RFQ (once per accepted file; refused files send nothing) | `file_count` (files attached after this one), `file_type` (the policy's extension, e.g. `pdf`; never the file name) |
| `product_view` | A product page (`/products/<slug>`) loads | `product_family`, `product_slug` |
| `rfq_cta_click` | Any RFQ link (to `/contact` or `/request`: «استعلام قیمت»/«ارسال لیست خرید» buttons, the header CTA, the basket badge) is clicked **outside an article** | `cta_location`: `header` (header or mobile menu) / `home_expert` (the homepage expert section, W20.3) / `home` / `product` / `category` / `price` / `calculator` (the page it was on; left out in the footer and on other pages); `product_family` when the page or the calculator's selected product has one |
| `calculator_open` | The weight calculator page loads | `calculator_entry`: `home_cta` / `category` / `product` / `price` (the previous page on this site) / `direct` (anything else: no referrer, another site, another page) |
| `article_read` | The reader reaches 75% of an article's body (an invisible line at 75% of the body enters the screen; once per page view) | `article_slug`, `article_lang` (`fa` / `en` / `ar`) |
| `article_cta_click` | An RFQ («استعلام قیمت») button or link **inside an article** is clicked | `article_slug`, `article_lang`, `cta_location`: `inline` (a link in the article text) / `product_card` (the button under the related products) / `bottom` (the «استعلام قیمت» box beside, or on mobile below, the article) |
| `chart_view` | W18.2: a fa price chart page (`/prices/chart/<slug>`) or the en/ar market-indicators page loads | `chart_type`: `product_price` / `market_indicators`; `product_slug` (product_price only) |
| `chart_range_change` | W18.2: the 30/90-day switch of a chart page is used | `chart_range`: `30` / `90`, `product_slug` |
| `gauge_view` | W18.2: the price-position gauge of a fa product page is at least half on screen (once per page view) | `gauge_position`: `low` / `mid` / `high`, `gauge_window`: `30` / `90` (the longest shown), `product_slug` |
| `chart_to_rfq` | W18.2: «قیمت قطعی برای حجم شما» is clicked (it also sends `rfq_cta_click`) | `cta_location`: `gauge` (product page) / `chart_page`, `product_slug`, `product_family` |
| `chart_share` | W18.3: «اشتراک در واتساپ», «اشتراک در تلگرام» or «اشتراک در بله» on a fa chart page is clicked. Bale has no web share URL, so its button copies the page title + link (toast «لینک کپی شد»); the event is sent on the click. Sent **instead of** `whatsapp_click` (sharing is not a contact) | `share_method`: `whatsapp` / `telegram` / `bale`, `product_slug` |
| `indicator_page_view` | W18.2: `/en/market-indicators` or `/ar/market-indicators` loads | `page_lang`: `en` / `ar`, `indicator_count` |
| `expert_call_click` / `expert_whatsapp_click` / `expert_rfq_click` / `expert_chat_click` | An action in the homepage «با کارشناس فروش صحبت کنید» section is clicked: phone, WhatsApp, the RFQ («ارسال فاکتور یا لیست خرید») or live chat (W21, only when configured). Sent **in addition to** `phone_click` / `whatsapp_click` / `rfq_cta_click` (`home_expert`), so do not add both into one total | `expert_variant`: `A` (Concierge card) / `B` (Split band) — the layout the site was built with (W20.3 redesign) |

Values:
- `product_family` is the catalog's public category code, the same code as the price hubs and category pages: `REBAR`, `BEAM` (IPE/INP), `ANGLE`, `CHANNEL`, `BOX_SECTION`, `SHEET_PLATE`, `PIPE`.
- `product_slug` / `article_slug` are the page's URL slug, e.g. `rebar-aj340`. Never the title.
- The page-of-origin values (`add_source`, `calculator_entry`) come only from the path of the previous page on this site (the browser's referrer). No query string, no other site's address.
- An RFQ click inside an article sends only `article_cta_click`; a click anywhere else sends only `rfq_cta_click`. The header CTA on an article page is outside the article, so it is `rfq_cta_click` with `cta_location=header`.

Every page also pushes `{ page_locale: "fa" | "en" | "ar" }` before any event.

Every page is a full page load (static site), so GA4's normal page view is enough. You do **not** need a History Change trigger.

## 3. Step 1 — create the Google tag (GA4) in GTM

Do this first. It is the only place GA4 is configured.

1. Open tagmanager.google.com → container **`GTM-TFN25VZQ`** → Workspace.
2. Variables → User-Defined Variables → New → **Constant**. Name it `CONST - GA4 ID`, value **`G-C8MZB6DXPZ`**. Save.
3. Variables → New → **Data Layer Variable** (Version 2). Name it `DLV - page_locale`, Data Layer Variable Name `page_locale`. Save.
4. Tags → New:
   - Name: `Google tag - GA4`.
   - Tag type: **Google Tag**. Tag ID: `{{CONST - GA4 ID}}`, which is `G-C8MZB6DXPZ`.
   - Configuration settings → add the parameter `page_locale` = `{{DLV - page_locale}}`.
   - Trigger: **Initialization - All Pages**.
   - Save.
5. Make sure no other tag in the container is a Google tag or GA4 configuration for `G-C8MZB6DXPZ`. There must be exactly one, or page views double.

This one tag sends GA4's page views (every page is a full load, so you do **not** need a History Change trigger). It also turns on enhanced measurement, which is configured in GA4 in step 4.

## 4. Step 2 — the remaining variables

Variables → User-Defined Variables → New. Create each of these as a **Data Layer Variable** (Version 2):

| Variable name | Data Layer Variable Name |
|---|---|
| `DLV - rfq_tracking_number` | `rfq_tracking_number` |
| `DLV - link_location` | `link_location` |
| `DLV - calculator_product_group` | `calculator_product_group` |
| `DLV - calculator_mode` | `calculator_mode` |
| `DLV - price_date` | `price_date` |
| `DLV - basket_size` | `basket_size` |
| `DLV - file_count` | `file_count` |
| `DLV - file_type` | `file_type` |
| `DLV - product_family` | `product_family` |
| `DLV - product_slug` | `product_slug` |
| `DLV - add_source` | `add_source` |
| `DLV - cta_location` | `cta_location` |
| `DLV - calculator_entry` | `calculator_entry` |
| `DLV - article_slug` | `article_slug` |
| `DLV - article_lang` | `article_lang` |
| `DLV - share_method` | `share_method` |

## 5. Step 3 — one trigger and one GA4 event tag per event

Do this for each of the 12 events. (The D-ARTICLE-METRICS tags and triggers — `product_view`, `rfq_cta_click`, `calculator_open`, `article_read`, `article_cta_click` and the new `basket_add` parameters — were imported on 2026-10-14; check that they match the table.)

**Trigger:** Triggers → New.
- Type: **Custom Event**.
- Event name: exactly the event name, for example `rfq_submit`.
- This trigger fires on: **All Custom Events**.
- Name it `CE - rfq_submit`.

**Tag:** Tags → New.
- Type: **Google Analytics: GA4 Event**.
- Measurement ID: `{{CONST - GA4 ID}}`.
- Event name: the same name.
- Event parameters: as in the table.
- Trigger: its `CE - …` trigger.
- Name it `GA4 - rfq_submit`.

| Tag | Event name | Event parameters (name = value) |
|---|---|---|
| `GA4 - rfq_submit` | `rfq_submit` | `rfq_tracking_number` = `{{DLV - rfq_tracking_number}}` |
| `GA4 - phone_click` | `phone_click` | `link_location` = `{{DLV - link_location}}` |
| `GA4 - whatsapp_click` | `whatsapp_click` | `link_location` = `{{DLV - link_location}}` |
| `GA4 - calculator_use` | `calculator_use` | `calculator_product_group` = `{{DLV - calculator_product_group}}`, `calculator_mode` = `{{DLV - calculator_mode}}` |
| `GA4 - price_page_view` | `price_page_view` | `price_date` = `{{DLV - price_date}}` |
| `GA4 - basket_add` | `basket_add` | `basket_size` = `{{DLV - basket_size}}`, `product_family` = `{{DLV - product_family}}`, `product_slug` = `{{DLV - product_slug}}`, `add_source` = `{{DLV - add_source}}` |
| `GA4 - file_upload` | `file_upload` | `file_count` = `{{DLV - file_count}}`, `file_type` = `{{DLV - file_type}}` |
| `GA4 - product_view` | `product_view` | `product_family` = `{{DLV - product_family}}`, `product_slug` = `{{DLV - product_slug}}` |
| `GA4 - rfq_cta_click` | `rfq_cta_click` | `cta_location` = `{{DLV - cta_location}}`, `product_family` = `{{DLV - product_family}}` |
| `GA4 - calculator_open` | `calculator_open` | `calculator_entry` = `{{DLV - calculator_entry}}` |
| `GA4 - article_read` | `article_read` | `article_slug` = `{{DLV - article_slug}}`, `article_lang` = `{{DLV - article_lang}}` |
| `GA4 - article_cta_click` | `article_cta_click` | `article_slug` = `{{DLV - article_slug}}`, `article_lang` = `{{DLV - article_lang}}`, `cta_location` = `{{DLV - cta_location}}` |
| `GA4 - chart_view` | `chart_view` | `chart_type` = `{{DLV - chart_type}}`, `product_slug` = `{{DLV - product_slug}}` |
| `GA4 - chart_range_change` | `chart_range_change` | `chart_range` = `{{DLV - chart_range}}`, `product_slug` = `{{DLV - product_slug}}` |
| `GA4 - gauge_view` | `gauge_view` | `gauge_position` = `{{DLV - gauge_position}}`, `gauge_window` = `{{DLV - gauge_window}}`, `product_slug` = `{{DLV - product_slug}}` |
| `GA4 - chart_to_rfq` | `chart_to_rfq` | `cta_location` = `{{DLV - cta_location}}`, `product_slug` = `{{DLV - product_slug}}`, `product_family` = `{{DLV - product_family}}` |
| `GA4 - chart_share` | `chart_share` | `share_method` = `{{DLV - share_method}}`, `product_slug` = `{{DLV - product_slug}}` |
| `GA4 - indicator_page_view` | `indicator_page_view` | `page_lang` = `{{DLV - page_lang}}`, `indicator_count` = `{{DLV - indicator_count}}` |

Do **not** add a Custom HTML tag. The site's CSP allows scripts only from the site itself, Turnstile and `*.googletagmanager.com`.

## 6. Step 4 — GA4 property settings

In analytics.google.com, open the property that owns `G-C8MZB6DXPZ`:

1. Admin → Data streams → the `www.ahanassa.com` web stream (its Measurement ID must be `G-C8MZB6DXPZ`) → Enhanced measurement:
   - Keep page views, scrolls, outbound clicks, site search and file downloads on.
   - Turn **Form interactions** off. Our `rfq_submit` is the real conversion, and GA4's automatic form event would double-count.
2. Admin → Data collection: leave Google signals **off** unless you decide otherwise. The CSP has no doubleclick origin.
3. Admin → Data retention: 14 months.
4. Admin → Events. The events appear after they first fire, up to 24 hours later. Mark `rfq_submit` as a **key event**. Optionally also mark `phone_click` and `whatsapp_click`.
5. Admin → Custom definitions → Create custom dimension (scope **Event**) for each of these: `page_locale`, `link_location`, `calculator_product_group`, `calculator_mode`, `price_date`, `file_type`, `product_family`, `product_slug`, `add_source`, `cta_location`, `calculator_entry`, `article_slug`, `article_lang`. (`cta_location` is one dimension for both `rfq_cta_click` and `article_cta_click`; read it together with the event name.) Then create a custom metric (unit: standard) for `basket_size` and `file_count`. `rfq_tracking_number` is optional; register it only if you want to find a single request in GA4.

### CSP (DAR-066, resolved 2026-10-13)

The Content-Security-Policy is still **Report-Only**, and it already allows everything GTM and GA4 need, so switching it to enforced will not break analytics:

| Directive | Google origins |
|---|---|
| `script-src` | `https://*.googletagmanager.com` |
| `img-src` | `https://*.google-analytics.com https://*.googletagmanager.com` |
| `connect-src` | `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` |

GTM Preview's own panel (`tagmanager.google.com`) is not allowed. It is a debugging tool, and under an enforced CSP Preview would only lose its on-page badge. If you add Google signals or Ads tags later, their origins must be added first.

## 7. Step 5 — test before publishing the container

1. In GTM, click **Preview** and enter `https://www.ahanassa.com/`. Tag Assistant opens the site with `?gtm_debug=…`. That parameter also loads GTM on staging, so you can test there too, with staging's address.
2. Check each of these:
   - Every page: `Google tag - GA4` fires **once**, and `page_locale` is in the dataLayer.
   - Click the phone number in the header: you should see `phone_click`, `link_location=header`.
   - Change a field on `/tools/weight-calculator`: `calculator_use` fires once.
   - Open `/prices`: `price_page_view`.
   - Open a product page and click «استعلام قیمت»: `basket_add`, `basket_size=1`. A second product: `basket_size=2`.
   - On staging, attach a PDF to the request form: `file_upload`, `file_count=1`, `file_type=pdf`.
   - Open a product page: `product_view` with `product_family` (e.g. `REBAR`) and `product_slug`.
   - On that product page click «درخواست این قلم» in the size table: on `/contact`, `basket_add` also carries `product_family`, `product_slug` and `add_source=product`. From the calculator's «استعلام برای همین مقدار» button: `add_source=calculator`.
   - Click the header's RFQ button: `rfq_cta_click`, `cta_location=header`. The home hero's: `cta_location=home`. A product page's main «استعلام قیمت» button: `cta_location=product` with `product_family`. `/prices`: `price`; `/products/category/rebar`: `category` + `REBAR`.
   - Open `/tools/weight-calculator` from the home page's calculator button: `calculator_open`, `calculator_entry=home_cta`. Type the address directly: `direct`.
   - Articles (only when `/articles` lists at least one; with none, there is nothing to test): open an article and scroll down. `article_read` fires **once**, when about three quarters of the text has passed, with `article_slug` and `article_lang`; scrolling back and forth does not repeat it.
   - In the article, click a «استعلام قیمت» link in the text (`cta_location=inline`), the button under the related products (`product_card`) and the «استعلام قیمت» box (`bottom`): `article_cta_click` each time, and **no** `rfq_cta_click`.
   - Send a test RFQ on staging: `rfq_submit` with only the tracking number. Check that the dataLayer has no name, phone, email, file name, title or Persian text.
3. GA4 → Admin → DebugView shows the same events.

## 8. Step 6 — publish

1. GTM → **Submit** → Version name `W16.4 initial` → **Publish**.
2. Nothing reaches GA4 until PR #47 is deployed, because the site does not load the container before then.

## 9. After publishing and deploying

- GA4 → Reports → Realtime should show visits within a minute.
- GA4 → Reports → Engagement → Pages: one page view per page load. Two per load means a second Google tag exists (step 1.5).
- Re-run Lighthouse on the home page. GTM loads after `load`, so LCP and CLS must not change.
