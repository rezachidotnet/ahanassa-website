# Google Tag Manager and GA4: setup (W16.4, decision D-SEO)

This page is for the owner. It covers what the site sends, and every step to do in Google Tag Manager (GTM) and Google Analytics 4 (GA4).

## 1. What the site does

The site does three things, and only these:

- It loads GTM.
- It pushes events to `window.dataLayer`.
- It never loads `gtag.js` directly.

**GA4 is configured inside GTM.** The site has no GA4 code.

| Piece | File |
|---|---|
| Container ID and production hostname | `config/analytics.ts` |
| Event names and their allowed parameters | `lib/analytics/events.ts` |
| GTM loader (production hostname, or `?gtm_debug=`, after the page's `load` event) | `lib/analytics/gtm.ts` |
| One component in the layout: `page_locale`, phone and WhatsApp clicks, GTM start | `components/analytics/analytics-runtime.tsx` |

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
- A name, email, phone number, message or file name can never pass.

| Event | Fires when | Parameters |
|---|---|---|
| `rfq_submit` | The RFQ API accepted a request (the tracking-number panel appears) | `rfq_tracking_number` (only this) |
| `phone_click` | Any `tel:` link is clicked (header, footer, hero, mobile menu, CTA) | `link_location`: `header` / `footer` / `mobile_menu` / `main` |
| `whatsapp_click` | Any `wa.me` / WhatsApp link is clicked | `link_location` |
| `calculator_use` | The visitor's first change to the weight calculator on this page view | `calculator_product_group` (e.g. `REBAR`), `calculator_mode` |
| `price_page_view` | `/prices` or `/ar/prices` is viewed (when it has prices) | `price_date` (the newest price date shown, `YYYY-MM-DD`) |
| `basket_add` | A product is added to the RFQ basket (wired when PR #44 merges) | `basket_size` |
| `file_upload` | A file is attached to an RFQ (wired when PR #45 / W13.1 merges) | `file_count`, `file_type` (extension, e.g. `pdf`) |

Every page also pushes `{ page_locale: "fa" | "en" | "ar" }` before any event.

Every page is a full page load (static site), so GA4's normal page view is enough. You do **not** need a History Change trigger.

## 3. Before you start

1. Send the two IDs: the GTM container ID (`GTM-XXXXXXX`) and the GA4 measurement ID (`G-XXXXXXXXXX`).
2. I put them in `config/analytics.ts`, in a small PR. A test checks their format.
3. Until that PR is deployed, nothing loads. Steps 4–6 can be done in GTM before that.

## 4. Create the GA4 property (if it does not exist yet)

1. In analytics.google.com, go to Admin → Create → Property. Name it `Ahan Asa – www.ahanassa.com`, set the time zone to Iran and the currency to IRR.
2. Add a data stream: Web, URL `https://www.ahanassa.com`, name `www`. Copy the **Measurement ID** (`G-…`).
3. In the stream, open Enhanced measurement:
   - Keep page views, scrolls, outbound clicks, site search and file downloads on.
   - Turn **Form interactions** off. Our `rfq_submit` is the real conversion, and GA4's automatic form event would double-count.
4. Admin → Data collection: leave Google signals **off** unless you decide otherwise.
5. Admin → Data retention: 14 months.

## 5. GTM: variables

In tagmanager.google.com, open the container → Variables → User-Defined Variables → New. Create each of these as a **Data Layer Variable** (Version 2):

| Variable name | Data Layer Variable Name |
|---|---|
| `DLV - page_locale` | `page_locale` |
| `DLV - rfq_tracking_number` | `rfq_tracking_number` |
| `DLV - link_location` | `link_location` |
| `DLV - calculator_product_group` | `calculator_product_group` |
| `DLV - calculator_mode` | `calculator_mode` |
| `DLV - price_date` | `price_date` |
| `DLV - basket_size` | `basket_size` |
| `DLV - file_count` | `file_count` |
| `DLV - file_type` | `file_type` |

Also create one **Constant** variable: `CONST - GA4 ID` = your `G-…` ID.

## 6. GTM: the GA4 configuration tag

Tags → New:
- Name: `GA4 - Config`.
- Tag type: **Google Tag**. Tag ID: `{{CONST - GA4 ID}}`.
- Configuration settings → add the parameter `page_locale` = `{{DLV - page_locale}}`.
- Trigger: **Initialization - All Pages**.
- Save.

## 7. GTM: one trigger and one tag per event

Do this for each of the 7 events.

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
| `GA4 - basket_add` | `basket_add` | `basket_size` = `{{DLV - basket_size}}` |
| `GA4 - file_upload` | `file_upload` | `file_count` = `{{DLV - file_count}}`, `file_type` = `{{DLV - file_type}}` |

Do **not** add a Custom HTML tag. The site's CSP allows scripts only from the site itself, Turnstile and `www.googletagmanager.com`.

## 8. GA4: conversions and custom dimensions

1. GA4 → Admin → Events. The events appear after they first fire, up to 24 hours later.
2. Mark `rfq_submit` as a **key event**. Optionally also mark `phone_click` and `whatsapp_click`.
3. Admin → Custom definitions → Create custom dimension (scope **Event**) for each of these: `page_locale`, `link_location`, `calculator_product_group`, `calculator_mode`, `price_date`, `file_type`. Then create a custom metric (unit: standard) for `basket_size` and `file_count`. `rfq_tracking_number` is optional; register it only if you want to find a single request in GA4.

### CSP note (DAR-066, open)

The site's Content-Security-Policy is **Report-Only**. It lists GTM and GA4's image beacons, but `connect-src` is pinned by architecture V1.1 §6.1 to the site, Turnstile and the RFQ API. GA4 hits therefore work, but they produce CSP reports.

Before the CSP is ever switched to enforced, decide one of these:
- allow `https://*.google-analytics.com https://*.analytics.google.com` in `connect-src`, or
- accept that GA4 stops.

## 9. Test before publishing the container

1. In GTM, click **Preview** and enter `https://www.ahanassa.com/`. Tag Assistant opens the site with `?gtm_debug=…`. That parameter also loads GTM on staging, so you can test there too, with staging's address.
2. Check each of these:
   - Every page: `GA4 - Config` fires, and `page_locale` is in the dataLayer.
   - Click the phone number in the header: you should see `phone_click`, `link_location=header`.
   - Change a field on `/tools/weight-calculator`: `calculator_use` fires once.
   - Open `/prices`: `price_page_view`.
   - Send a test RFQ on staging: `rfq_submit` with only the tracking number. Check that the dataLayer has no name, phone or email.
3. GA4 → Admin → DebugView shows the same events.
4. GTM → **Submit** → Version name `W16.4 initial` → **Publish**.

## 10. After publishing

- GA4 → Reports → Realtime should show visits within a minute.
- Re-run Lighthouse on the home page. GTM loads after `load`, so LCP and CLS must not change.
