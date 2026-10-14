# SEO Keyword Map — v11 (decision D-SEO)

- **Task:** W16.1. Research and docs only. No site code changes here.
- **Goal:** page 1 on Google for Ahan Asa in **fa** (primary), **ar** and **en**.
- **Date / data snapshot:** 2026-10-13 (21 Mehr 1405). Live site crawled from `https://www.ahanassa.com/sitemap.xml` (93 URLs).
- **Status:** PROPOSAL. The owner approves it by merging this PR. Code changes in §7 and §8, and the new pages in §6, are separate later tasks.
- **Consumers:** the page-build tasks (§6), the metadata task (§7), and the article agent **W11.3** (§9).

**Relation to `01-sources/SEO_KEYWORD_MAP.md`.** That document is still the authority for positioning, cannibalization principles and on-page rules. It was written before public prices existed. Its §12 exclusions of price keywords (`قیمت آهن امروز`, size-level price pages) and of en/ar targeting are already superseded by `PROJECT_OVERRIDES.md` §1 (fa/ar/en) and §4 (public catalog and pricing). This map applies those overrides to the live v11 site. It does not edit `01-sources/`.

---

## 0. Hard rules (apply to every row below)

| Rule | fa | ar | en |
|---|---|---|---|
| Finished-product price | price + factory + delivery location + date + VAT note (D-PRICE-DISPLAY) | **price only**: Toman/kg, date, VAT note. **No factory and no delivery location** anywhere in ar (D-W94-4) | **zero price data**: no amounts, no currency, no price words in titles or metas |
| Raw materials (billet, slab, DRI, pellet, concentrate, scrap) | **never priced** (RFQ only) | never priced | never priced |
| Price-intent keywords («قیمت …», «سعر …») | target them | target them, with ar price rules | **do not target**. Map en price queries to spec, weight and supplier intent |
| Price sources | **never named**: not in titles, metas, body, links, alt text, file names or this repo | same | same |
| JSON-LD offers | none (D-PRICE) | none | none |
| Factory (mill) names | allowed in fa titles, H2s and body, as the *product's mill*, never implying Ahan Asa makes steel | **forbidden** | allowed in specs only, without any price |

Competitor sites are described here only by **type** (for example "national price portal" or "news site with a daily price post"). No competitor domain or brand is named in this repository.

---

## 1. Method and limits

1. **Site audit.** Every URL in the live sitemap was fetched. For each one we recorded title, meta description, H1, H2s, word count in `<main>`, links in `<main>`, inbound links, robots and JSON-LD count. We also checked `/robots.txt` and the non-sitemap routes `/articles`, `/en/prices` and `/ar/tools/weight-calculator`.
2. **Demand signal.** Google Autocomplete was harvested with each seed plus an alphabet and digit expansion:
   - **fa** (`hl=fa`, `gl=ir`): 81 seeds, **9,469** unique suggestions, of which **8,012** are steel-related.
   - **ar** (`hl=ar`, `gl=iq`): 24 seeds, **1,438** suggestions.
   - **en** (`hl=en`): 22 seeds, **817** suggestions.

   For each seed, the first suggestions are the most-searched completions, and a modifier that recurs across seeds signals breadth of demand.
3. **SERP and competitor structure.** We looked at result pages for the head terms («قیمت میلگرد امروز», «قیمت آهن آلات», «قیمت تیرآهن») and at the page patterns of the sites that rank. §3.6 covers this.
4. **Trends and news.** We read news-site coverage of the Mehr 1405 market: the dollar rate, billet prices, Iran Mercantile Exchange (بورس کالا) offerings and mill price changes. §4 covers this.

**Limits.**
- **No absolute volumes.** Google Trends and Keyword Planner are not reachable from this environment: the Trends API returned 404 and needs a browser. The demand tiers below (★★★ high, ★★ medium, ★ low) are *relative*. They come from autocomplete rank and breadth, not from monthly volumes.
- **First task after merge:** export 90 days of Google Search Console queries and Trends "related queries" for the five head terms, then re-rank the P1 and P2 rows (§10).
- All suggestions were taken on a single day. Seasonal terms (§4) will move.

---

## 2. Audit of the live v11 site

### 2.1 Inventory

| Page type | URLs (fa / ar / en) | Words in `<main>` | Inbound links per page | Notes |
|---|---|---|---|---|
| Home | `/`, `/ar`, `/en` | 310–366 | all | H1 «تأمین فولاد پروژه‌ها»; 2 JSON-LD |
| Products index | `/products` ×3 | 161–277 | 34 | 25 links in main |
| Category | `/products/category/{rebar,beam,angle,channel,box-section,sheet-plate,pipe}` ×3 = 21 | 74–117 | 34 | **thin**, **duplicate H1 and meta** (§2.2 #1) |
| Product | 16 products ×3 = 48 | 160–1,016 | 5 | 3 links in main; no price in en; ar price only |
| Prices | `/prices`, `/ar/prices` | 1,584–1,884 | 32–33 | **no H2**, **no links in main** (§2.2 #3) |
| Weight calculator | `/tools/weight-calculator` (fa only) | 566 | **2** | not in the header; en/ar redirect (302) |
| Services / About / Industries / Markets / Contact | ×3 each | 74–219 (contact ≈1,000, mostly form) | 34 (services 93) | industries and markets are **thin placeholders** |
| Articles | none in production | — | — | `/articles` returns **404** on production. The articles feature (#39) is merged on the branch but not yet released, so the sitemap has no articles |

### 2.2 Findings, ranked by SEO impact

| # | Finding | Evidence | Fix (owner of fix) |
|---|---|---|---|
| 1 | **All 21 category pages share one H1 and one meta description.** H1 = «گروه‌های کالایی فولاد و آلیاژ.» (the products-index H1) on every category in every locale. Meta = the products-index body text. | `app/[locale]/products/category/[category]/page.tsx` passes `description: t.body`; `ProductsListing` renders the index hero | Category-specific H1, meta and intro (§7.3). Biggest quick win: these URLs are the natural owners of «میلگرد», «تیرآهن», «نبشی» … |
| 2 | **Product meta descriptions are boilerplate.** 12 of 16 fa metas read «… — دسته … در فهرست کالایی آهن آسا.» (49–63 chars). en/ar have the same pattern on all 16 | crawl | Template with sizes, standard, mill-price hint (fa), and «استعلام» (§7.4) |
| 3 | **`/prices` is a dead end.** One H1, no H2, and the only link in `<main>` is `/`. The product rows do not link to their product pages. One URL tries to rank for every «قیمت X» query | crawl | H2 per family + row links to product pages + per-family hubs (§6 P1-1) |
| 4 | **Product pages link to nothing related.** The only links in `<main>` are `/`, `/products` and `/contact`. There is no link to the category, sibling grades, `/prices`, the calculator, or articles | crawl | Internal-link block (§8) |
| 5 | **The calculator is nearly orphaned.** Only 2 internal links point to it (the home showcase button and itself). It is not in the header or footer. «وزن …», «جدول اشتال» and «محاسبه وزن …» together are the **largest informational demand** in the dataset (§3.2) | crawl | Header/footer link + links from product rows (fa "محاسبه وزن" link exists per row) + per-family entry pages (§6 P2-2) |
| 6 | **The en brand suffix is in Persian.** Every en title ends with «\| آهن آسا» (`app/[locale]/layout.tsx` template uses `siteConfig.name`) | crawl | Locale brand: en "Ahan Asa", ar «آهن آسا» (keep), fa «آهن آسا» |
| 7 | **The home title repeats the brand.** «آهن آسا — مدیریت خرید فولاد \| آهن آسا». No commercial keyword appears in any home title | crawl | `title.absolute` (§7.1) |
| 8 | **No page targets the head terms in its title.** No title contains «خرید آهن», «قیمت آهن», «آهن آلات», «قیمت میلگرد» or «قیمت تیرآهن». `/prices` says «قیمت روز آهن‌آلات», which is close | crawl | §7 |
| 9 | **Industries (74–88 words) and Markets (94–115) are placeholders.** Their copy says «فهرست کامل … به‌زودی». Thin, indexable, and no keyword target | crawl | Either fill them with real content or set `noindex` until filled (owner) |
| 10 | **Service sub-items in the header all point to `/services`.** «فرآوری ورق», «فرآوری میلگرد، مقاطع و لوله» and «ساخت قطعات طبق نقشه» go there, but `/services` does not mention processing. It covers only the 6-step purchasing process | `docs/HEADER_SERVICES_P6_REPORT.md` | Service pages, once the owner confirms the service scope (§6 P2-4) |
| 11 | **The language switcher on `/prices` links to `/en/prices`, which 302-redirects** (en has no prices by rule) | inbound-link count: `/en/prices` ×2 | Point the en switcher on price pages to `/en/products` |
| 12 | **No articles are live yet.** The informational demand (§3.2–3.4) has no landing pages | `/articles` 404 | Release #39; start W11.3 with §9 |
| 13 | Calculator **en/ar not published** (`WEIGHT_CALCULATOR_LOCALES = ["fa"]`) although ar price support is ready | `docs/OWNER_DECISIONS.md` D-W94-4 | Approve en/ar copy, then publish (§6 P1-3). en "steel weight calculator", "rebar weight chart" and ar «حساب وزن الحديد» are large demand pools |
| 14 | **Name/address/phone consistency (NAP).** The header phone `03135134` uses the 031 prefix (Isfahan). The brief says the business is in Tehran, and the prices table says «انبار تهران» | crawl | Confirm one business address and city before local-SEO work (§3.7) |

Good, keep: every page is `index, follow` and self-canonical. `robots.txt` is clean (`/api/` and `/*?` are blocked). Product pages have JSON-LD with no offers. hreflang is in the sitemap. Every product shows per-size weight per metre and per bar, a strong unique asset for «وزن …» queries.

---

## 3. What people search (research findings)

### 3.1 Price intent (fa)

- **Head terms:** «قیمت آهن», «قیمت آهن آلات», «قیمت آهن امروز», «قیمت میلگرد», «قیمت تیرآهن», «قیمت ورق سیاه», «قیمت قوطی», «قیمت نبشی», «قیمت ناودانی», «قیمت لوله مانیسمان».
- **«امروز»** is the strongest modifier: 431 suggestions. Freshness is part of the intent, so titles should carry the date (§7.2).
- **Size is the second axis.** Rebar is dominated by **۱۶** (216 suggestions), then ۸, ۱۴, ۱۲, ۶, ۱۰, ۲۰, ۱۸. Beam: **۱۴** ≫ ۱۶, ۱۸, ۲۰, ۲۴. Angle: ۴, ۵, ۳, ۶, ۸, ۱۰. Channel: ۸, ۱۰, ۱۲, ۱۴, ۶. Box: ۴۰×۴۰, ۴۰×۸۰, ۲×۲, ۴×۴, ۳۰×۶۰. Sheet: ۱، ۱٫۵، ۲، ۳، ۴، ۸، ۱۰ میل.
- **Mill is the third axis:**

  | Mill | Suggestions |
  |---|---|
  | ذوب آهن (اصفهان) | 49 (plus most of the 320 «اصفهان» suggestions, which mean this mill rather than the city) |
  | مبارکه | 54 |
  | بناب | 54 |
  | یزد / بافق | 87 |
  | نیشابور | 44 |
  | زاگرس | 28 |
  | میانه | 26 |
  | جهان فولاد | 29 |
  | فولاد خوزستان | 17 |
  | کاشان | 15 |
  | کاوه | 10 |
  | اکسین | 8 |

  Several of these mills appear in our own price data. §5.2 lists which.
- **Light/heavy («سبک/سنگین»)** is a real axis for angle, channel and beam (94–96 suggestions).
- **Delivery-basis modifiers:** «کیلویی», «شاخه», «۶ متری/۱۲ متری», «درب کارخانه», «بورس کالا».
- **Not ours:** «ضایعات / دست دوم» (217 and 107 suggestions) is consumer scrap and used-steel intent, and «خرده فروشی» is retail. Do not target either. Raw-material scrap is covered RFQ-only in §5.6.
- **Not in the catalog yet, big demand:** «ورق گالوانیزه» (368), «ورق روغنی» (99), «تیرآهن هاش / HEA-HEB» (171), «لوله گالوانیزه», «پروفیل». This is a catalog-expansion signal for the owner (§10), not a page to build now.

### 3.2 Weight and spec intent (fa) — the biggest informational pool

- **«وزن …»** has 1,816 suggestions. Every product × size pattern exists: «وزن میلگرد ۱۶», «وزن تیرآهن ۱۴», «وزن قوطی ۴۰ در ۴۰», «وزن نبشی ۴ سبک», «وزن ورق ۲ میل».
- **«جدول …»** has 270: «جدول وزن میلگرد», «جدول اشتال», «جدول اشتال تیرآهن / ناودانی / نبشی / قوطی», «… pdf».
- **«محاسبه وزن …»:** «محاسبه وزن ورق آهن», «محاسبه وزن میلگرد».
- **Mixed weight and price questions:** «قیمت میلگرد ۱۶ چند کیلو است», «قیمت هر شاخه میلگرد ۱۶ چقدر است». These are a natural bridge from the calculator to prices.

### 3.3 Comparison and definition intent (fa)

- **Grades:** «تفاوت/فرق میلگرد A2 و A3», «A3 بهتر است یا A2», «A3 و A4», «میلگرد ساده و آجدار».
- **Definitions:** «… چیست» for تیرآهن IPE، هاش، ناودانی UPN، ورق ST37/ST52، لوله مانیسمان.
- **Pipe:** «رده ۴۰ / رده ۸۰» (pipe schedule).
- **Buying route:** «نحوه خرید میلگرد از بورس کالا», «خرید میلگرد از کارخانه», «چگونه از بورس کالا میلگرد بخریم».
- **Market forecast:** «پیش بینی قیمت آهن در روزهای آینده / هفته آینده / ۱۴۰۵», «نمودار قیمت آهن».

### 3.4 Raw materials (fa) — RFQ only

| Material | Typical queries |
|---|---|
| Billet | «قیمت شمش فولاد», «شمش فولادی 3SP / 5SP», «خرید/فروش شمش فولادی», «شمش فولاد صادراتی», «شمش در بورس کالا» |
| DRI | «آهن اسفنجی» (price, buy/sell, Bourse, «بریکت») |
| Pellet | «گندله» (price in Bourse, «فروش گندله صادراتی») |
| Concentrate | «کنسانتره سنگ آهن / مگنتیت» |
| Scrap | «قراضه آهن» (buy/sell, light/heavy) |
| Slab | «اسلب فولادی» — mostly confused with ceramic or wood slabs, so low priority |

We target **«خرید/فروش/تأمین/مشخصات/استاندارد»** intent, never «قیمت», because raw materials are never priced. Pages say «استعلام قیمت از طریق درخواست».

### 3.5 Arabic (gl=iq): Iraq vocabulary, Egypt competition

- Generic «سعر الحديد اليوم» belongs to Egypt and Saudi Arabia (prices in local currency). **We cannot win it with Toman prices.**
- Our winnable cluster is **Iranian steel**: «الحديد الايراني», «سعر الحديد الايراني», «سعر طن الحديد الايراني», «حديد تسليح ايراني», «انواع الحديد الايراني», «استيراد الحديد من ايران».
- **Iraqi trade words** (use them in ar titles, H1s and body next to the formal term):

  | Product | Iraqi words |
  |---|---|
  | rebar | **شيش** (شيش الحديد) / حديد التسليح |
  | I-beam (IPE/IPN) | **شيلمان** (سعر الشيلمان في العراق) |
  | box section | **حديد مربع / علب** |
  | sheet | **صاج** |
  | sheet types (W17.4) | **الصاج الأسود** (black) · **الصاج المزيت** (cold-rolled, oiled) · **الصاج المجلفن** (galvanized) · **الصاج الملون** (PPGI); coil = **رول** / **لفائف** — *provisional, owner-accepted 2026-10-14 (W17.5)* |
  | angle | **زاوية / زاويه** |
  | billet | بليت |
- **Sheet-type words are provisional (owner decision, W17.5, 2026-10-14).** The owner accepts the ar sheet-type and coil words above for the Iraq market, with no code change. In site copy today (W17.4: `lib/content/category-seo.ts`, `lib/content/category-nav.ts`, `lib/content/export.ts`) «الصاج الأسود», «الصاج المجلفن», «رول» and «لفائف» appear; «المزيت» and «الملون» do not (the copy says «الصاج المدرفل على البارد» and «الصاج المطلي», and Odoo owns the ar category names). They are not yet confirmed by an Iraqi buyer or by Search Console data; revisit them when ar impressions for the sheet categories exist, and change copy only on a new owner decision.
- **Weight:** «وزن حديد التسليح حسب القطر», «وزن حديد التسليح في المتر الطولي», «جدول اوزان الحديد», «حساب وزن الحديد». The ar calculator is a direct fit (§6 P1-3).

### 3.6 English: global spec intent and Iran supply

- **Winnable without prices:** "ipe beam weight chart", "ipe 200 / 300 beam weight", "rebar weight chart kg per meter", "square hollow section weight per meter", "steel weight calculator in kg", "seamless pipe astm a106 grade b", "what is s355jr steel", "upn channel dimensions".
- **Iran supply:** "iranian steel suppliers", "steel companies in iran", "iran steel billet", "steel billets manufacturers in iran", "iranian steel mills".
- **Do not target:** "iran steel price", "rebar price per ton" (en has no prices), and news queries about attacks or war (§4.3).

**Competitor pattern seen in SERPs (types only).** Two kinds of sites rank:
1. **National price portals.** Per-family price pages with a table by size × mill × location, a date in the H1, a price chart, a weight column, an FAQ and a strong internal mesh. Many also have per-size and per-mill pages.
2. **News sites.** A daily post titled «قیمت میلگرد امروز {weekday} {date}؛ {headline}».

Our edge: one verified table with factory, location, VAT note and date (fa), a weight per size on every product, and an RFQ path. **Our gap:** per-family hubs, a dated title, H2 structure, and links.

### 3.7 Local (Tehran)

Local queries: «آهن فروشی تهران», «بازار آهن تهران», «بازار آهن شادآباد», «فروش آهن آلات تهران», «برشکاری ورق تهران», «خرید آهن قراضه تهران». We target these through `/contact` and `/about` with full NAP, a Google Business Profile, and one guide article (§9 #17). **No city doorway pages** (rule kept from `01-sources/SEO_KEYWORD_MAP.md` §12). The NAP question in §2.2 #14 must be settled first.

---

## 4. Seasonal and news-driven demand

### 4.1 Recurring cycle (fa)

| Window (Persian calendar) | What moves search | Content action |
|---|---|---|
| **Every working day, morning** | «قیمت … امروز» peaks with market open and the IME session | Date in price-page titles, rebuilt daily (§7.2) |
| **IME (بورس کالا) offering days**, weekly | «قیمت میلگرد در بورس کالا امروز», «شمش در بورس» | Weekly market article (§9 #2), linked from `/prices` |
| **Mill price-list changes** (any day) | «قیمت میلگرد ذوب آهن», «لیست قیمت …» | Mill H2 sections on family hubs (§6 P1-1) |
| **Dollar-rate jumps** (news-driven) | «قیمت آهن» spikes, «پیش بینی قیمت آهن» | Same-day market article that explains the drivers, no forecasts we cannot source |
| **Tir–Shahrivar** (summer power cuts to industry) and **Dey–Bahman** (winter gas cuts) | Billet and rebar output falls, prices firm, «پیش بینی قیمت آهن» | Pre-season articles «اثر قطعی برق بر بازار آهن» |
| **Esfand** (pre-Nowruz buying, year-end budgets) | «خرید آهن», «قیمت آهن قبل از عید» | «بهترین زمان خرید آهن» refresh (§9 #11) |
| **Farvardin** (holiday slowdown) | low volume | Evergreen guides |
| **Ordibehesht–Mehr** (construction season) | «خرید میلگرد», «وزن …», «برآورد آهن اسکلت» | Buying guides and weight tables |
| **Mehr 1405 (now)** | News reports a dollar jump, firmer billet, then a price correction (19 Mehr) | Weekly market report already in the content repo's calendar |

### 4.2 Arabic (Iraq)

Iraqi demand follows the construction season and import news (border and customs changes, the dollar-to-dinar rate). Evergreen ar pages (weight, types, "Iranian steel") beat price news for us, because ar shows Toman, not dinar or dollars per ton (§10 Q3).

### 4.3 English

Suggestions include event queries about Iranian mills ("…attacked", "…war steel prices"). **Do not target them.** They carry no buying intent and a brand-safety risk. The en focus stays on specs, weights and supplier evaluation.

---

## 5. Keyword clusters → target URL

**Legend.**
- **Intent:** T = transactional (price/buy), C = commercial investigation, I = informational, N = navigational/local.
- **Priority:** **P1** = quick win (existing page, or small new page, long-tail first, 0–4 weeks); **P2** = new page or content, 1–3 months; **P3** = conditional or later.
- **Demand:** ★★★ / ★★ / ★ (relative, §1).
- "NEW" = a page that does not exist yet (§6). One cluster → one owner URL. Other pages link to the owner and do not compete with it (`01-sources/SEO_KEYWORD_MAP.md` §13).

### 5.1 Hub price clusters

| ID | fa primary / secondary keywords | Intent | Demand | Owner URL (fa) | Pri | ar variant → URL | en variant → URL |
|---|---|---|---|---|---|---|---|
| PR-00 | قیمت آهن آلات امروز / قیمت آهن امروز / قیمت آهن / لیست قیمت آهن آلات / قیمت آهن آلات ساختمانی | T | ★★★ | `/prices` | P1 | أسعار الحديد الإيراني اليوم / سعر الحديد الايراني → `/ar/prices` | — (no price; en price queries go to `/en/products`) |
| PR-01 | قیمت میلگرد / قیمت میلگرد امروز / قیمت میلگرد آجدار / قیمت میلگرد ساده | T | ★★★ | NEW `/prices/rebar` | P1 | سعر حديد التسليح الايراني اليوم / سعر الشيش الايراني → NEW `/ar/prices/rebar` | — |
| PR-02 | قیمت تیرآهن / قیمت تیرآهن امروز / قیمت تیرآهن IPE | T | ★★★ | NEW `/prices/beam` | P1 | سعر الشيلمان الايراني / سعر الجسور الحديد → NEW `/ar/prices/beam` | — |
| PR-03 | قیمت ورق سیاه / قیمت ورق آهن / قیمت ورق ST37 / ST52 / قیمت ورق فولاد مبارکه | T | ★★★ | NEW `/prices/sheet-plate` | P1 | سعر الصاج الايراني اليوم → NEW `/ar/prices/sheet-plate` | — |
| PR-04 | قیمت قوطی / قیمت پروفیل / قیمت قوطی ۴۰×۴۰ / ۴۰×۸۰ | T | ★★★ | NEW `/prices/box-section` | P1 | سعر الحديد المربع الايراني → NEW `/ar/prices/box-section` | — |
| PR-05 | قیمت نبشی / قیمت نبشی ۴ / ۵ / ۶ | T | ★★ | NEW `/prices/angle` | P1 | سعر الزاوية الحديد → NEW `/ar/prices/angle` | — |
| PR-06 | قیمت ناودانی / قیمت ناودانی ۸ / ۱۰ / ۱۲ | T | ★★ | `/products/category/channel` until the family has prices, then NEW `/prices/channel` | P3 | — | — |
| PR-07 | قیمت لوله مانیسمان / رده ۴۰ / ۸۰ | T | ★★ | `/products/seamless-pipe-a106-grade-b` until priced, then NEW `/prices/pipe` | P3 | — | — |

### 5.2 Size and mill long-tail (quick wins: fa first)

These do **not** get their own pages in P1. They are served by **H2/H3 sections and anchor IDs on the family hubs**. The hub table is grouped by size, and there is one H2 per mill that has rows. Separate size pages are P3, only when they can carry unique content (§6 P3-1).

| ID | Pattern (examples) | Intent | Demand | Owner | Pri |
|---|---|---|---|---|---|
| PR-01s | قیمت میلگرد ۱۶ / ۱۴ / ۱۲ / ۱۰ / ۸ / ۱۸ / ۲۰ / ۲۲ / ۲۵ / ۲۸ / ۳۲ (+ «امروز») | T | ★★★ (۱۶) / ★★ | `/prices/rebar#size-16` … (H3 per size) | P1 |
| PR-01m | قیمت میلگرد ذوب آهن اصفهان / میانه / نورد گرم سمنان / بافق یزد / کویر کاشان / آذر گستر سدید … (only mills present in the snapshot that day) | T | ★★ | `/prices/rebar#mill-<code>` (H2 per mill) | P1 |
| PR-02s | قیمت تیرآهن ۱۴ / ۱۶ / ۱۸ / ۲۰ / ۲۴ / ۳۰ (+ «امروز», «ذوب آهن») | T | ★★★ (۱۴) | `/prices/beam#size-14` … | P1 |
| PR-02m | قیمت تیرآهن ذوب آهن / ظفر بناب / … (mills in the snapshot) | T | ★★ | `/prices/beam#mill-<code>` | P1 |
| PR-03s | قیمت ورق ۲ / ۳ / ۴ / ۶ / ۸ / ۱۰ میل / قیمت ورق ضخیم (پلیت) | T | ★★ | `/prices/sheet-plate#thk-2` … | P1 |
| PR-03m | قیمت ورق فولاد مبارکه / اکسین / فولاد کاویان | T | ★★ | `/prices/sheet-plate#mill-<code>` | P1 |
| PR-04s | قیمت قوطی ۴۰×۴۰ / ۴۰×۸۰ / ۶۰×۴۰ / ۱۰۰×۱۰۰ / قیمت پروفیل ساختمانی | T | ★★ | `/prices/box-section#…` | P1 |
| PR-05s | قیمت نبشی ۴ / ۵ / ۶ / ۸ / ۱۰ | T | ★★ | `/prices/angle#…` | P1 |
| PR-xx-ar | سعر الشيش ١٦ / سعر الشيلمان ١٤ … | T | ★ | the ar hub, the same anchors (**no mill sections in ar**) | P2 |

**Mill names in our data on 2026-10-10** (from the live `/prices` filter): ذوب آهن اصفهان، فولاد مبارکه اصفهان، میانه (فولاد آذربایجان)، ظفر بناب، کویر کاشان، نورد گرم سمنان، بافق یزد، کرمانشاه، آذر گستر سدید، نورد فولاد نوین متین، درپاد تبریز، ناب تبریز، اکسین خوزستان، فولاد کاویان، فولاد البرز ایرانیان (فایکو)، صبا فولاد منظومه، شکفته، ظهوریان، کالوپ، پروفیل صنعت ماهان، پروفیل فولادی اصفهان، and the لوله و پروفیل group. A mill H2 renders **only on days that mill has rows**. Never write a mill heading with no price under it.

### 5.3 Product, category and grade clusters

| ID | fa keywords | Intent | Demand | Owner (fa) | Pri | ar (→ `/ar/…` same path) | en (→ `/en/…` same path) |
|---|---|---|---|---|---|---|---|
| CA-RB | میلگرد / انواع میلگرد / خرید میلگرد / میلگرد ساختمانی | C | ★★★ | `/products/category/rebar` | P1 | حديد التسليح الايراني / شيش حديد / انواع حديد التسليح | Iranian rebar / steel rebar supplier Iran / rebar grades |
| CA-BM | تیرآهن / خرید تیرآهن / انواع تیرآهن / تیرآهن IPE و IPN | C | ★★★ | `/products/category/beam` | P1 | الشيلمان / جسور حديد IPE | steel I-beams IPE IPN supplier |
| CA-AN | نبشی / خرید نبشی / سایز نبشی | C | ★★ | `/products/category/angle` | P1 | زاوية حديد | equal angle steel |
| CA-CH | ناودانی / خرید ناودانی / ناودانی UPN و UPE | C | ★★ | `/products/category/channel` | P1 | مجرى حديد UPN | UPN UPE channel |
| CA-BX | قوطی / پروفیل / قوطی پروفیل / خرید قوطی ساختمانی | C | ★★ | `/products/category/box-section` | P1 | حديد مربع / علب حديد | hollow sections SHS RHS |
| CA-SH | ورق / ورق سیاه / ورق گرم‌نورد / خرید ورق سیاه / ورق ST37 / ST52 | C | ★★★ | `/products/category/sheet-plate` | P1 | صاج حديد / الواح فولاذية | hot rolled steel plate S235JR S355JR |
| CA-PP | لوله / لوله مانیسمان / لوله بدون درز | C | ★★ | `/products/category/pipe` | P1 | انابيب حديد غير ملحومة | seamless steel pipe |
| PD-A1 | میلگرد ساده / میلگرد A1 / S240 / قیمت میلگرد ساده | C/T | ★★ | `/products/rebar-s240` | P1 | حديد تسليح أملس | plain round bar S240 |
| PD-A2 | میلگرد A2 / میلگرد آجدار A2 / Aj340 | C/T | ★★ | `/products/rebar-aj340` | P1 | حديد تسليح A2 | rebar A2 Aj340 |
| PD-A3 | میلگرد A3 / میلگرد آجدار A3 / قیمت میلگرد A3 / Aj400 | C/T | ★★★ | `/products/rebar-aj400` | P1 | حديد تسليح A3 | rebar A3 / AIII grade |
| PD-A4 | میلگرد A4 / Aj500 / میلگرد A4 قیمت | C/T | ★★ | `/products/rebar-aj500` | P1 | حديد تسليح A4 | rebar A4 Aj500 / B500 |
| PD-IPE | تیرآهن IPE / IPE 140 / 160 / 180 / 200 / 240 / 300 / قیمت تیرآهن IPE | C/T | ★★★ | `/products/ipe-beam` | P1 | شيلمان IPE / كمرة IPE | IPE beam sizes / IPE 200 dimensions |
| PD-IPN | تیرآهن IPN / INP / تیرآهن معمولی | C | ★ | `/products/ipn-inp-beam` | P1 | كمرة IPN | IPN beam |
| PD-UPN | ناودانی UPN / ناودانی ۸ / ۱۰ / ۱۲ سبک و سنگین | C | ★★ | `/products/channel-upn` | P1 | مجرى UPN | UPN channel sizes |
| PD-UPE | ناودانی UPE | C | ★ | `/products/channel-upe` | P1 | مجرى UPE | UPE channel |
| PD-ANG | نبشی مساوی / نبشی ۵ / ۶ / ۸ / ۱۰ | C | ★★ | `/products/equal-angle` | P1 | زاوية متساوية | equal angle sizes EN 10056 |
| PD-SHS | قوطی مربع / پروفیل مربعی / قوطی ۴۰×۴۰ / ۱۰۰×۱۰۰ | C | ★★ | `/products/square-hollow-section-shs` | P1 | حديد مربع SHS | square hollow section sizes |
| PD-RHS | قوطی مستطیل / پروفیل مستطیلی / قوطی ۴۰×۸۰ / ۶۰×۴۰ | C | ★★ | `/products/rectangular-hollow-section-rhs` | P1 | حديد مستطيل RHS | rectangular hollow section sizes |
| PD-SH235 | ورق سیاه ST37 / ورق S235JR / ورق ۲ / ۳ میل | C/T | ★★ | `/products/hot-rolled-sheet-s235jr` | P1 | صاج S235JR | S235JR hot rolled sheet |
| PD-SH355 | ورق ST52 / ورق S355JR نازک | C/T | ★★ | `/products/hot-rolled-sheet-s355jr` | P1 | صاج S355JR | S355JR sheet |
| PD-PL235 | ورق ضخیم / پلیت / ورق ۱۰ / ۱۲ / ۲۰ میل ST37 | C/T | ★★ | `/products/hot-rolled-plate-s235jr` | P1 | لوح S235JR | S235JR plate |
| PD-PL355 | ورق ST52 ضخیم / پلیت S355JR | C/T | ★★ | `/products/hot-rolled-plate-s355jr` | P1 | لوح S355JR | S355JR plate / what is s355jr steel |
| PD-A106 | لوله مانیسمان رده ۴۰ / A106 گرید B / لوله بدون درز ۱ / ۲ / ۳ اینچ | C | ★★ | `/products/seamless-pipe-a106-grade-b` | P1 | انبوب غير ملحوم A106 | seamless pipe ASTM A106 grade B |

**Ownership note.** «قیمت میلگرد A3» belongs to the product page `rebar-aj400` (grade-specific, with a PriceBlock). Generic «قیمت میلگرد» belongs to `/prices/rebar`. The hub links each grade row to its product page, and each product page links "all rebar prices" back to the hub.

### 5.4 Weight, «جدول اشتال» and the calculator

| ID | fa keywords | Intent | Demand | Owner (fa) | Pri | ar | en |
|---|---|---|---|---|---|---|---|
| WT-00 | محاسبه وزن آهن آلات / محاسبه وزن آهن / محاسبه وزن ورق آهن / محاسبه وزن میلگرد | I (tool) | ★★★ | `/tools/weight-calculator` (+ NEW family entries, §6 P2-2) | P1 | حساب وزن الحديد / حاسبة وزن الحديد → `/ar/tools/weight-calculator` (publish) | steel weight calculator kg → `/en/tools/weight-calculator` (publish) |
| WT-RB | جدول وزن میلگرد / وزن میلگرد ۸–۳۲ / وزن هر شاخه میلگرد ۱۶ / میلگرد ۱۶ چند کیلو است | I | ★★★ | article `rebar-weight-table` (exists in the content repo; retarget to rebar only, §9 note) | P1 | وزن حديد التسليح حسب القطر / في المتر الطولي (ar article) | rebar weight chart kg per meter (en article) |
| WT-BM | وزن تیرآهن / وزن تیرآهن ۱۴ / ۱۶ / ۱۸ / جدول اشتال تیرآهن | I | ★★★ | article cal-014 «جدول وزن تیرآهن» | P1 | وزن الشيلمان | ipe beam weight chart / ipe 200 weight |
| WT-BX | وزن قوطی ۴۰×۴۰ / ۴۰×۸۰ / ۲×۲ / جدول وزن قوطی / جدول اشتال قوطی | I | ★★ | article cal-018 | P1 | جدول اوزان الحديد المربع | square hollow section weight per meter |
| WT-AN | وزن نبشی ۴ / ۵ / ۶ سبک و سنگین / جدول اشتال نبشی | I | ★★ | NEW article (§9 #4) | P1 | — | equal angle weight chart |
| WT-CH | وزن ناودانی ۸ / ۱۰ / ۱۲ سبک و سنگین / جدول اشتال ناودانی | I | ★★ | article cal-021 | P2 | — | UPN weight chart |
| WT-SH | وزن ورق ۲ میل / وزن ورق آهن / فرمول وزن ورق | I | ★★ | article cal-019 | P2 | حساب وزن الصاج | steel plate weight per m² |
| WT-PP | وزن لوله / جدول وزن لوله مانیسمان رده ۴۰ / اسکجول | I | ★ | article cal-020 | P2 | — | sch 40 pipe weight chart |
| WT-ST | جدول اشتال / جدول اشتال کامل / جدول اشتال pdf | I | ★★ | the articles above, cross-linked; no single "full stahl" page (copyrighted tables) | P2 | — | — |

### 5.5 Market, buying-route and guide clusters (articles)

| ID | fa keywords | Intent | Demand | Owner | Pri |
|---|---|---|---|---|---|
| MK-01 | پیش بینی قیمت آهن / … هفته آینده / … ۱۴۰۵ / نمودار قیمت آهن | I | ★★★ | recurring weekly market article (§9 #2), linked from `/prices` | P1 |
| MK-02 | قیمت میلگرد در بورس کالا امروز / خرید میلگرد از بورس کالا / نحوه خرید میلگرد از بورس | I/C | ★★ | article §9 #7 | P1 |
| MK-03 | عوامل موثر بر قیمت آهن / دلار و قیمت آهن / شمش و میلگرد | I | ★★ | article §9 #10 (cal-025) | P2 |
| MK-04 | بهترین زمان خرید آهن / فصل خرید آهن | I | ★ | article §9 #11 (cal-026/029) | P2 |
| GD-01 | تفاوت میلگرد A2 و A3 / A3 و A4 / ساده و آجدار | I | ★★★ | article cal-015 | P1 |
| GD-02 | تفاوت تیرآهن IPE و IPN / تیرآهن هاش چیست | I | ★★ | article cal-002 | P1 |
| GD-03 | ورق ST37 و ST52 / S235JR و S355JR | I | ★★ | article cal-016 | P1 |
| GD-04 | قیمت درب کارخانه و انبار / خرید آهن شاخه‌ای یا کیلویی | I/C | ★★ | articles cal-004, cal-005 | P2 |
| GD-05 | خرید عمده آهن آلات / تامین آهن آلات پروژه / شرکت بازرگانی آهن | C | ★★ | `/services` (+ `/` for the brand version) | P1 |

### 5.6 Raw materials (RFQ only, never priced, in all locales)

| ID | fa keywords (no «قیمت» in titles) | Intent | Demand | Owner | Pri | ar | en |
|---|---|---|---|---|---|---|---|
| RM-00 | مواد اولیه فولاد / تأمین مواد اولیه فولاد | C | ★ | NEW `/raw-materials` | P2 | المواد الخام للصلب من ايران | Iranian steel raw materials supplier |
| RM-01 | شمش فولادی / خرید شمش فولادی / فروش شمش فولادی / شمش 3SP / 5SP | C | ★★★ | NEW `/raw-materials/billet` | P2 | بليت حديد ايراني / استيراد البليت من ايران | Iranian steel billet supplier / 3SP 5SP billet |
| RM-02 | آهن اسفنجی / خرید آهن اسفنجی / بریکت آهن اسفنجی (HBI) | C | ★★ | NEW `/raw-materials/dri` | P2 | الحديد الاسفنجي الايراني | Iranian DRI / HBI supplier |
| RM-03 | گندله / فروش گندله / گندله صادراتی | C | ★★ | NEW `/raw-materials/pellet` | P3 | كريات الحديد (بيليت خام) | iron ore pellets Iran |
| RM-04 | کنسانتره سنگ آهن / فروش کنسانتره آهن | C | ★ | NEW `/raw-materials/iron-ore-concentrate` | P3 | مركز خام الحديد | iron ore concentrate Iran |
| RM-05 | قراضه آهن / خرید قراضه آهن (bulk, mill grade; not household scrap) | C | ★★ | NEW `/raw-materials/scrap` | P3 | سكراب الحديد | HMS steel scrap |
| RM-06 | اسلب فولادی | C | ★ | NEW `/raw-materials/slab` | P3 | سلاب فولاذي | steel slab Iran |

**Gate.** The owner must confirm which raw materials Ahan Asa actually sources (§10 Q2). A raw-material page with no real supply line is a credibility risk. The en billet and DRI pages are the strongest en opportunity in the dataset, if export is approved (`01-sources/SEO_KEYWORD_MAP.md` §12 "export/import: conditional").

### 5.7 Brand, trust, services and local

| ID | Keywords | Owner | Pri |
|---|---|---|---|
| BR-01 | آهن آسا / ahan asa / ahanassa / آهن آسا قیمت | `/` (+ sitelinks) | P1 |
| SV-01 | مدیریت خرید فولاد / تأمین آهن آلات پروژه / خرید عمده آهن آلات | `/services` | P1 |
| SV-02 | برشکاری ورق / برش ورق آهن / فرآوری ورق | NEW `/services/sheet-processing` | P2 (scope gate) |
| SV-03 | برش و خم میلگرد / خم میلگرد / فرآوری مقاطع و لوله | NEW `/services/bar-section-processing` | P2 (scope gate) |
| SV-04 | ساخت قطعات فلزی طبق نقشه | NEW `/services/fabrication` | P3 (scope gate) |
| LC-01 | آهن فروشی تهران / فروش آهن آلات تهران / بازار آهن تهران | `/contact` (NAP + map) + Google Business Profile + article §9 #17 | P2 (NAP gate) |
| AB-01 | شرکت بازرگانی آهن / تأمین کننده آهن آلات | `/about` | P2 |

---

## 6. New pages to build

Every new page follows the frozen visual system (`CLAUDE.md` §5a) and the §0 price rules, and is added to the sitemap with hreflang only for the locales it really publishes in.

| ID | URL(s) | Locales | What it is | Price rule | Prerequisites | Pri |
|---|---|---|---|---|---|---|
| **P1-1** | `/prices/{rebar,beam,sheet-plate,box-section,angle}` (+ `/ar/…`) | fa, ar | **Family price hubs.** The family's rows from the same snapshot as `/prices`. Contents: H1 with date; intro (60–120 words, no claims we cannot back); H2 «قیمت {family} بر اساس سایز» with an H3 + `id` per size; H2 per mill with rows (fa only); weight column per bar (from the catalog); row → product-page link; «محاسبه وزن» link; «استعلام قیمت نهایی» CTA; FAQ (3–5 Q&As from §3.3, not price promises); links to 2–3 articles. **`/prices` becomes the hub-of-hubs**: H2 per family linking to these. A family with zero priced rows that day **does not publish** (no empty hub) | fa full; ar price-only (no factory, no location, **no mill H2s**) | Build-time split of the existing price snapshot; price gate and source-name scan extended to the new routes | P1 |
| **P1-2** | Fixes to existing pages | all | §7 titles/H1/metas; §2.2 #1 category H1/meta/intro; #3 `/prices` H2s and links; #4 product link block; #6 en brand; #11 switcher | as-is | Code release | P1 |
| **P1-3** | `/en/tools/weight-calculator`, `/ar/tools/weight-calculator` | en, ar | Publish the calculator that already exists. ar cost estimate is approved behaviour (D-W94-4); en has no cost estimate | en none; ar price only | Owner approval of the en/ar copy (`lib/weight-calculator/copy.ts`) | P1 |
| **P2-1** | `/raw-materials`, `/raw-materials/billet`, `/raw-materials/dri` (+ en, ar) | fa, en, ar | RFQ-only material pages: what it is, grades and specs (3SP/5SP, chemistry ranges, sizes, with a cited standard), typical documents, «ارسال درخواست» with the material preselected. **No price, no «قیمت» in titles** | never priced | Owner confirms the supply scope (§10 Q2). The RFQ form needs a raw-material option | P2 |
| **P2-2** | `/tools/weight-calculator/{rebar,beam,angle,channel,box-section,sheet-plate,pipe}` | fa (then en, ar) | Calculator **entry pages** with the family preselected, an H1 «محاسبه وزن {family}», and a static per-size weight table rendered from the catalog (deterministic, no agent text). They own «محاسبه وزن X». Articles own «جدول وزن X» (§5.4) | none (ar estimate as in P1-3) | Path-based preselect, because `?` URLs are disallowed in robots | P2 |
| **P2-3** | `/articles/**` | fa, ar, en | Release #39, then W11.3 publishes §9 | fa/ar quotes in article text only (D-W111-3) | Production release | P2 (release is P1) |
| **P2-4** | `/services/sheet-processing`, `/services/bar-section-processing` | fa (+ en, ar when copy exists) | One page per processing service in the header | none | Owner-confirmed service description (what is done in-house vs coordinated) | P2 |
| **P3-1** | `/prices/rebar/{8…32}`, `/prices/beam/{14,16,18,20}` | fa | Size pages, **only** for sizes that on publish day have ≥ 3 mills priced, plus a price-history series (not built yet). Otherwise the hub anchors keep the traffic | fa full | A price-history store (D1). A rule that removes a size page from the sitemap when its condition fails | P3 |
| **P3-2** | `/prices/mills/{code}` | fa | Per-mill page: every product of that mill that we price | fa full | Same condition as P3-1. Must not imply we are the mill | P3 |
| **P3-3** | `/prices/channel`, `/prices/pipe` | fa, ar | Hubs for families once they have prices | as P1-1 | Pricing for those families | P3 |
| **P3-4** | `/raw-materials/{pellet,iron-ore-concentrate,scrap,slab}` | fa, en, ar | As P2-1 | never priced | As P2-1 | P3 |

**Not proposed, on purpose:**
- City pages ("آهن فروشی {city}") — doorway risk.
- A "full stahl table PDF" — copyright and accuracy risk.
- Pages for products we do not carry (galvanized or oiled sheet, HEA/HEB). Those are catalog decisions first (§10 Q4).
- en price pages of any kind.

---

## 7. Title / H1 / meta proposals for every existing page

**Conventions.**
- The layout template appends ` | آهن آسا` in every locale today. This proposal keeps it for fa and ar and changes it to ` | Ahan Asa` for en.
- Lengths below **exclude** that suffix. Target ≤ 50 characters for the title body and 120–155 for metas.
- `{date}` = the date of the price snapshot, rendered at build time in the same format as the page's existing date label (fa e.g. «۱۹ مهر ۱۴۰۵»; ar as its current date label). Price pages rebuild daily, so a dated title is honest.
- H1 may differ from the title. The H1 is on-page copy and must keep the frozen visual layout.
- The **home H1** is hero copy inside the frozen design. Changing it needs owner sign-off.
- ar text never names a factory or location. en never mentions a price.

### 7.1 Home, index and trust pages

| URL | Title (body) | H1 | Meta description |
|---|---|---|---|
| `/` | **absolute:** «آهن آسا \| خرید آهن‌آلات و قیمت روز آهن برای پروژه» | keep «تأمین فولاد پروژه‌ها» (frozen); optional owner change: «تأمین و خرید آهن‌آلات پروژه» | «قیمت روز میلگرد، تیرآهن، ورق و قوطی با نام کارخانه و تاریخ. فاکتور یا لیست خریدتان را بفرستید؛ آهن آسا مشخصات، گزینه‌های تأمین و تحویل را بررسی می‌کند.» |
| `/ar` | **absolute:** «آهن آسا \| توريد الحديد الإيراني للمشاريع» | keep «توريد الصلب للمشاريع» | «أسعار حديد التسليح والشيلمان والصاج الإيراني اليوم، مع جداول الأوزان والمواصفات. أرسل قائمة الشراء ليراجع آهن آسا الاحتياج وخيارات التوريد.» |
| `/en` | **absolute:** "Ahan Asa \| Iranian Steel Sourcing for Projects" | keep "Steel procurement for projects" | "Rebar, IPE beams, plates and hollow sections from Iranian mills — specs, sizes and weight tables. Send your purchase list and Ahan Asa reviews sourcing and delivery." |
| `/products` | «محصولات فولادی: میلگرد، تیرآهن، ورق، قوطی، نبشی» | «محصولات فولادی و آهن‌آلات ساختمانی» | «انواع میلگرد، تیرآهن، ناودانی، نبشی، قوطی، ورق و لوله با سایز، استاندارد، وزن هر شاخه و قیمت روز. برای هر قلم استعلام قیمت بگیرید.» |
| `/ar/products` | «منتجات الحديد: حديد التسليح، الشيلمان، الصاج، المربع» | «منتجات الحديد والصلب الإيرانية» | «حديد التسليح، الشيلمان IPE، الزوايا، المجاري، الحديد المربع، الصاج والأنابيب: المقاسات والمعايير والأوزان، مع سعر اليوم لبعض المقاسات.» |
| `/en/products` | "Steel Products: Rebar, IPE Beams, Plate, Hollow Sections" | "Steel products from Iranian mills" | "Rebar, IPE/IPN beams, UPN/UPE channels, angles, SHS/RHS, hot-rolled sheet and plate, seamless pipe — sizes, standards and nominal weights. Request a quote." |
| `/services` | «مدیریت خرید و تأمین آهن‌آلات پروژه» | «تأمین آهن‌آلات پروژه، از بررسی تا تحویل» | «خرید عمده آهن‌آلات برای پروژه: بررسی مشخصات، مقایسه گزینه‌های تأمین، پیشنهاد خرید و هماهنگی تحویل در یک فرآیند شش‌مرحله‌ای.» |
| `/ar/services` | «إدارة شراء وتوريد الحديد للمشاريع» | «توريد الحديد للمشاريع من المراجعة إلى التسليم» | «شراء الحديد بالجملة للمشاريع: مراجعة المواصفات، مقارنة خيارات التوريد، عرض الشراء وتنسيق التسليم في ست مراحل.» |
| `/en/services` | "Steel Procurement Management for Projects" | "Steel procurement, from review to delivery" | "Bulk steel purchasing for projects: specification review, supply-option comparison, purchase proposal and delivery coordination in six steps." |
| `/about` | «درباره آهن آسا؛ مدیر خرید فولاد شما» | keep | «آهن آسا خرید فولاد را از سمت خریدار مدیریت می‌کند: بررسی نیاز، مقایسه تأمین، شفافیت قیمت و هماهنگی تحویل. نه فروشگاه، نه بازارگاه.» |
| `/ar/about` | «عن آهن آسا: مدير شراء الحديد الخاص بك» | keep | «يدير آهن آسا شراء الحديد من جانب المشتري: مراجعة الاحتياج، مقارنة التوريد، وتنسيق التسليم.» |
| `/en/about` | "About Ahan Asa — Your Steel Purchasing Manager" | keep | "Ahan Asa manages steel purchasing from the buyer's side: requirement review, supply comparison and delivery coordination — not a seller, not a marketplace." |
| `/industries` (+ ar, en) | keep, after real content: «تأمین آهن‌آلات برای صنایع و پروژه‌ها» | keep | rewrite once the industry list is published (§2.2 #9) |
| `/markets` (+ ar, en) | keep, after real content | keep | as above |
| `/contact` | «ارسال لیست خرید آهن‌آلات و استعلام قیمت» | keep | «فاکتور، BOM یا لیست خرید آهن‌آلات را بفرستید: مشخصات، مقدار و زمان تحویل. کارشناسان آهن آسا بررسی و پاسخ می‌دهند.» (+ NAP once §2.2 #14 is settled) |
| `/ar/contact` | «أرسل قائمة شراء الحديد واطلب عرض سعر» | keep | «أرسل الفاتورة أو قائمة المواد: المواصفات والكمية وموعد التسليم، ويراجعها فريق آهن آسا.» |
| `/en/contact` | "Request a Steel Quote — Send Your Purchase List" | keep | "Send an invoice, BOM or material list with specs, quantity and timing; the Ahan Asa team reviews it and replies." |

### 7.2 Price pages (rebuilt daily)

| URL | Title (body) | H1 | Meta description |
|---|---|---|---|
| `/prices` | «قیمت آهن‌آلات امروز {date}؛ میلگرد، تیرآهن، ورق» | «قیمت روز آهن‌آلات — {date}» | «قیمت امروز میلگرد، تیرآهن، ورق، قوطی و نبشی به تومان برای هر کیلوگرم، با کارخانه، محل تحویل و ارزش افزوده. برای قیمت نهایی سفارش استعلام بگیرید.» |
| `/ar/prices` | «أسعار الحديد الإيراني اليوم {date}» | «أسعار الحديد اليوم — {date}» | «أسعار حديد التسليح والشيلمان والصاج والحديد المربع الإيراني اليوم بالتومان لكل كيلوغرام، شاملة ضريبة القيمة المضافة. اطلب السعر النهائي لطلبك.» |
| NEW `/prices/rebar` | «قیمت میلگرد امروز {date}؛ سایز ۸ تا ۳۲» | «قیمت روز میلگرد — {date}» | «قیمت امروز میلگرد آجدار A3 و ساده A1 به تفکیک سایز و کارخانه، به تومان برای هر کیلوگرم، همراه با وزن هر شاخه. استعلام قیمت نهایی.» |
| NEW `/prices/beam` | «قیمت تیرآهن امروز {date}؛ IPE 14 تا 30» (only sizes present) | «قیمت روز تیرآهن — {date}» | «قیمت امروز تیرآهن IPE به تفکیک سایز و کارخانه، به تومان برای هر کیلوگرم، با وزن هر شاخه ۱۲ متری.» |
| NEW `/prices/sheet-plate` | «قیمت ورق سیاه امروز {date}؛ ST37 و ST52» | «قیمت روز ورق — {date}» | «قیمت امروز ورق سیاه گرم‌نورد و ورق ضخیم S235JR و S355JR به تفکیک ضخامت و کارخانه، به تومان برای هر کیلوگرم.» |
| NEW `/prices/box-section` | «قیمت قوطی و پروفیل امروز {date}» | «قیمت روز قوطی — {date}» | «قیمت امروز قوطی مربع و مستطیل (SHS/RHS) به تفکیک سایز، ضخامت و کارخانه، به تومان برای هر کیلوگرم.» |
| NEW `/prices/angle` | «قیمت نبشی امروز {date}» | «قیمت روز نبشی — {date}» | «قیمت امروز نبشی مساوی به تفکیک سایز و کارخانه، به تومان برای هر کیلوگرم، با وزن هر شاخه.» |
| NEW `/ar/prices/{family}` | «سعر حديد التسليح الإيراني اليوم {date}» / «سعر الشيلمان الإيراني اليوم {date}» / «سعر الصاج…» / «سعر الحديد المربع…» / «سعر الزاوية الحديد…» | «سعر … اليوم — {date}» | price + size + VAT note; **no factory or location** |

### 7.3 Category pages (fix the duplicate H1 and meta, §2.2 #1)

Pattern. The intro paragraph (60–120 words) is new copy per category: what the family is, its grades and standards, and how to request. «قیمت روز» is mentioned only when the family has priced rows.

| Category | fa title / H1 / meta | ar title / H1 | en title / H1 |
|---|---|---|---|
| rebar | «میلگرد آجدار و ساده: انواع، وزن و قیمت روز» / «میلگرد» / «میلگرد ساده A1 و آجدار A2، A3 و A4 از سایز ۸ تا ۵۰، با استاندارد INSO 3132، وزن هر شاخه و قیمت روز. استعلام قیمت بگیرید.» | «حديد التسليح الإيراني (الشيش): الأنواع والأوزان» / «حديد التسليح» | "Rebar from Iranian Mills — Grades A1–A4, Sizes Ø8–Ø50" / "Rebar" |
| beam | «تیرآهن IPE و IPN: سایزها، وزن و قیمت روز» / «تیرآهن» / «تیرآهن IPE و IPN از ۸۰ تا ۶۰۰، با وزن هر متر و هر شاخه ۱۲ متری و قیمت روز سایزهای پرمصرف. استعلام قیمت بگیرید.» | «الشيلمان (كمرات IPE وIPN): المقاسات والأوزان» / «الشيلمان» | "IPE & IPN Steel Beams — Sizes 80–600, Weights" / "Steel beams" |
| angle | «نبشی مساوی: سایزها، وزن و قیمت روز» / «نبشی» / «نبشی مساوی‌الاضلاع ۵۰×۵۰×۵ تا ۱۰۰×۱۰۰×۱۰، استاندارد EN 10056-1، وزن هر شاخه و قیمت روز.» | «الزاوية الحديد المتساوية: المقاسات والأوزان» / «الزوايا» | "Equal Angle Steel — Sizes, Weights, EN 10056-1" / "Angles" |
| channel | «ناودانی UPN و UPE: سایزها و وزن» / «ناودانی» / «ناودانی UPN و UPE از ۸۰ تا ۲۰۰، استاندارد EN 10365، با وزن هر متر و هر شاخه. استعلام قیمت.» (no «قیمت روز» while unpriced) | «مجاري UPN وUPE: المقاسات والأوزان» / «المجاري» | "UPN & UPE Channels — Sizes and Weights" / "Channels" |
| box-section | «قوطی و پروفیل ساختمانی: سایز، وزن و قیمت روز» / «قوطی و پروفیل» / «قوطی مربع (SHS) و مستطیل (RHS) با ابعاد و ضخامت‌های مختلف، وزن هر شاخه ۶ متری و قیمت روز. استعلام قیمت بگیرید.» | «الحديد المربع والمستطيل (علب): المقاسات والأوزان» / «الحديد المربع والمستطيل» | "Square & Rectangular Hollow Sections (SHS/RHS)" / "Hollow sections" |
| sheet-plate | «ورق سیاه و ورق ضخیم: ST37، ST52، قیمت روز» / «ورق فولادی» / «ورق سیاه گرم‌نورد و ورق ضخیم (پلیت) S235JR و S355JR از ضخامت ۲ تا ۶۰ میلی‌متر، با وزن هر ورق و قیمت روز.» | «الصاج والألواح الفولاذية S235JR وS355JR» / «الصاج والألواح» | "Hot-Rolled Steel Sheet & Plate — S235JR, S355JR" / "Sheet & plate" |
| pipe | «لوله مانیسمان (بدون درز) A106: سایز و وزن» / «لوله فولادی» / «لوله بدون درز ASTM A106 گرید B، رده ۴۰، از ½ تا ۸ اینچ، با وزن هر متر و هر شاخه. استعلام قیمت.» | «أنابيب غير ملحومة ASTM A106: المقاسات والأوزان» / «الأنابيب» | "Seamless Steel Pipe ASTM A106 Grade B — SCH 40" / "Steel pipe" |

ar metas for categories follow the same pattern without factory names. en metas follow it without any price word.

### 7.4 Product pages (16 × 3)

**Pattern** (generated from catalog fields; the hand-written proposals follow):
- **fa title:** «{name} \| قیمت روز، وزن و سایز» when the product has a priced variant; otherwise «{name} \| سایز، وزن و استعلام قیمت».
- **fa H1:** `{name}`, unchanged.
- **fa meta:** «{name} سایز {min} تا {max}، استاندارد {std}، وزن هر شاخه و قیمت روز به تومان برای هر کیلوگرم (کارخانه، محل تحویل، تاریخ). استعلام قیمت نهایی.» Drop the price clause when the product is unpriced.
- **ar title:** «{ar name} \| المقاسات والأوزان وسعر اليوم». ar meta: the same, without factory or location.
- **en title:** "{en name} — Sizes, Weights & Specs". en meta: "{en name}: sizes {min}–{max}, {std}, nominal weight per metre and per bar. Sourced from Iranian mills — request a quote."

| Product (fa path) | fa title body | fa meta (≤155) | en title body | ar title body |
|---|---|---|---|---|
| `rebar-s240` | «میلگرد ساده A1 (S240) \| قیمت روز، وزن و سایز» | «میلگرد ساده A1 گرید S240 سایز ۱۰ تا ۵۰، وزن هر متر و شاخه ۱۲ متری و قیمت روز با کارخانه و محل تحویل. استعلام قیمت نهایی.» | "Plain Round Bar S240 (A1) — Sizes Ø10–Ø50, Weights" | «حديد تسليح أملس S240 (A1) \| المقاسات والأوزان وسعر اليوم» |
| `rebar-aj340` | «میلگرد آجدار A2 (Aj340) \| قیمت روز، وزن و سایز» | «میلگرد آجدار A2 (AIII-340) سایز ۸ تا ۳۲، استاندارد INSO 3132، وزن هر شاخه و قیمت روز. استعلام قیمت نهایی.» | "Ribbed Rebar A2 (Aj340) — Sizes Ø8–Ø32, INSO 3132" | «حديد تسليح مضلع A2 \| المقاسات والأوزان وسعر اليوم» |
| `rebar-aj400` | «میلگرد آجدار A3 (Aj400) \| قیمت روز، وزن و سایز» | «میلگرد آجدار A3 سایز ۸ تا ۳۲ از کارخانه‌های مختلف؛ قیمت امروز به تومان برای هر کیلوگرم، وزن هر شاخه ۱۲ متری و استعلام قیمت نهایی.» | "Ribbed Rebar A3 (Aj400) — Sizes Ø8–Ø32, Weights" | «حديد تسليح مضلع A3 (الشيش) \| المقاسات وسعر اليوم» |
| `rebar-aj500` | «میلگرد آجدار A4 (Aj500) \| قیمت روز، وزن و سایز» | «میلگرد آجدار A4 گرید Aj500 سایز ۱۰ تا ۳۲، وزن هر شاخه و قیمت روز با کارخانه و محل تحویل. استعلام قیمت نهایی.» | "Ribbed Rebar A4 (Aj500) — Sizes Ø10–Ø32" | «حديد تسليح مضلع A4 \| المقاسات والأوزان وسعر اليوم» |
| `ipe-beam` | «تیرآهن IPE \| قیمت روز، وزن و سایز ۸۰ تا ۶۰۰» | «تیرآهن IPE از ۸۰ تا ۶۰۰، وزن هر متر و هر شاخه ۱۲ متری و قیمت روز سایزهای پرمصرف با کارخانه و تاریخ. استعلام قیمت.» | "IPE Beam — Sizes IPE 80–600, Weight per Metre" | «شيلمان IPE \| المقاسات والأوزان وسعر اليوم» |
| `ipn-inp-beam` | «تیرآهن IPN (INP) \| سایز، وزن و استعلام قیمت» | «تیرآهن IPN / INP از ۸۰ تا ۶۰۰، با ارتفاع، وزن هر متر و وزن هر شاخه ۱۲ متری. استعلام قیمت از آهن آسا.» | "IPN / INP Beam — Sizes 80–600, Weight per Metre" | «كمرة IPN \| المقاسات والأوزان» |
| `channel-upn` | «ناودانی UPN \| سایز، وزن و استعلام قیمت» | «ناودانی UPN از ۸۰ تا ۲۰۰ طبق EN 10365، با وزن هر متر و هر شاخه. استعلام قیمت از آهن آسا.» | "UPN Channel — Sizes 80–200, EN 10365 Weights" | «مجرى UPN \| المقاسات والأوزان» |
| `channel-upe` | «ناودانی UPE \| سایز، وزن و استعلام قیمت» | «ناودانی UPE (بال موازی) از ۸۰ تا ۲۰۰ طبق EN 10365، با وزن هر متر و هر شاخه. استعلام قیمت.» | "UPE Channel — Parallel Flange, Sizes 80–200" | «مجرى UPE \| المقاسات والأوزان» |
| `equal-angle` | «نبشی مساوی \| قیمت روز، وزن و سایز» | «نبشی مساوی‌الاضلاع ۵۰×۵۰×۵ تا ۱۰۰×۱۰۰×۱۰ طبق EN 10056-1، وزن هر شاخه و قیمت روز. استعلام قیمت نهایی.» | "Equal Angle — 50×50×5 to 100×100×10, EN 10056-1" | «زاوية متساوية الأضلاع \| المقاسات والأوزان وسعر اليوم» |
| `square-hollow-section-shs` | «قوطی مربع (SHS) \| قیمت روز، وزن و سایز» | «قوطی و پروفیل مربعی ۴۰ تا ۲۰۰ طبق EN 10219-2، وزن هر شاخه ۶ متری و قیمت روز با کارخانه. استعلام قیمت.» | "Square Hollow Section (SHS) — Sizes 40–200, Weights" | «حديد مربع SHS \| المقاسات والأوزان وسعر اليوم» |
| `rectangular-hollow-section-rhs` | «قوطی مستطیل (RHS) \| قیمت روز، وزن و سایز» | «قوطی و پروفیل مستطیلی از ۶۰×۴۰ تا ۳۰۰×۲۰۰، وزن هر شاخه ۶ متری و قیمت روز با کارخانه. استعلام قیمت نهایی.» | "Rectangular Hollow Section (RHS) — 60×40 to 300×200" | «حديد مستطيل RHS \| المقاسات والأوزان وسعر اليوم» |
| `hot-rolled-sheet-s235jr` | «ورق سیاه ST37 (S235JR) \| قیمت روز و وزن» | «ورق سیاه گرم‌نورد S235JR (ST37) ضخامت ۲ تا ۶ میلی‌متر، وزن هر ورق و قیمت روز با کارخانه و محل تحویل.» | "Hot-Rolled Sheet S235JR (ST37) — 2–6 mm" | «صاج S235JR \| المقاسات والأوزان وسعر اليوم» |
| `hot-rolled-sheet-s355jr` | «ورق سیاه ST52 (S355JR) \| قیمت روز و وزن» | «ورق سیاه گرم‌نورد S355JR (ST52) ضخامت ۲ تا ۶ میلی‌متر، وزن هر ورق و قیمت روز. استعلام قیمت نهایی.» | "Hot-Rolled Sheet S355JR (ST52) — 2–6 mm" | «صاج S355JR \| المقاسات والأوزان وسعر اليوم» |
| `hot-rolled-plate-s235jr` | «ورق ضخیم (پلیت) ST37 \| قیمت روز و وزن» | «ورق سیاه ضخیم S235JR (ST37) ضخامت ۸ تا ۶۰ میلی‌متر، وزن هر ورق و قیمت روز با کارخانه و محل تحویل.» | "Steel Plate S235JR (ST37) — 8–60 mm" | «لوح S235JR \| المقاسات والأوزان وسعر اليوم» |
| `hot-rolled-plate-s355jr` | «ورق ضخیم ST52 (S355JR) \| قیمت روز و وزن» | «ورق گرم‌نورد S355JR (ST52) ضخامت ۸ تا ۶۰ میلی‌متر طبق EN 10029، وزن هر ورق و قیمت روز. استعلام قیمت.» | "Steel Plate S355JR (ST52) — 8–60 mm, EN 10029" | «لوح S355JR \| المقاسات والأوزان وسعر اليوم» |
| `seamless-pipe-a106-grade-b` | «لوله مانیسمان A106 رده ۴۰ \| سایز و وزن» | «لوله بدون درز (مانیسمان) ASTM A106 گرید B رده ۴۰ از ½ تا ۸ اینچ، وزن هر متر و شاخه ۶ متری. استعلام قیمت.» | "Seamless Pipe ASTM A106 Gr. B, SCH 40 — ½\"–8\"" | «أنبوب غير ملحوم A106 \| المقاسات والأوزان» |

**Rules for these strings.**
- The price clause («قیمت روز» / «سعر اليوم») is **computed at build**: present only when the product has a priced variant in that locale's snapshot. Today IPN, UPN, UPE and A106 have no price, so their rows above carry none.
- Size ranges come from the catalog at build time, never hand-typed (the figures above are as of 2026-10-13).
- The **ar** «(الشيش)» and «الشيلمان» trade words are proposals for the ar copy approver.

### 7.5 Calculator

| URL | Title (body) | H1 | Meta description |
|---|---|---|---|
| `/tools/weight-calculator` | «محاسبه وزن آهن‌آلات: میلگرد، تیرآهن، ورق، قوطی» | keep «محاسبه وزن آهن‌آلات» | keep current (150 chars, good) |
| `/ar/tools/weight-calculator` (P1-3) | «حساب وزن الحديد: التسليح، الشيلمان، الصاج» | «حاسبة وزن الحديد» | «احسب الوزن الاسمي لحديد التسليح والشيلمان والمجاري والزوايا والحديد المربع والصاج لكل متر ولكل قطعة وللطلب كاملًا.» |
| `/en/tools/weight-calculator` (P1-3) | "Steel Weight Calculator (kg) — Rebar, IPE, Plate" | "Steel weight calculator" | "Nominal weight of rebar, IPE beams, channels, angles, hollow sections, pipe and plate — per metre, per bar and per order, in kg." |

---

## 8. Internal linking plan (do with P1-2)

1. **`/prices` → family hubs.** One H2 per family linking to its hub. Each row links to its product page, with anchor text = the product name.
2. **Family hub ↔ product pages.** Every hub row links to its product page. Every priced product page links back with «قیمت روز همه انواع {family}».
3. **Product page link block** (`<main>`, below the spec table):
   - the category;
   - sibling grades, for example A2 ↔ A3 ↔ A4 or S235JR ↔ S355JR;
   - «محاسبه وزن {family}» (family entry, P2-2; until then `/tools/weight-calculator`);
   - 2–3 related articles (reverse of `related_products`).
4. **Category page:** the intro links to the family hub (if priced) and to the weight article.
5. **Header/footer:**
   - add «محاسبه وزن» (fa now; en and ar after P1-3) to the footer product column;
   - add «قیمت روز» to the footer (already in the header);
   - footer link to `/raw-materials` once P2-1 ships.
6. **Articles:**
   - every price-intent article links to the matching hub with an exact-match anchor once, for example «قیمت روز میلگرد»;
   - every weight article links to the calculator family entry;
   - the article validator already checks that links resolve (`docs/ARTICLES.md`).
7. **Anchor-text discipline.**
   - Do not use a hub's head term as the anchor to a different page. For example, never link «قیمت میلگرد» to a product page; use «قیمت میلگرد A3».
   - No "click here" anchors.

---

## 9. 30 article topics for the article agent (W11.3), ranked

**Ranking basis:**
1. Demand (§3).
2. Low difficulty: long-tail, spec- and weight-based, where a correct table wins.
3. Fit with our assets (catalog weights, snapshot prices).
4. Business value (leads to a product page or RFQ).

`cal-…` = the existing id in `ahanassa-content/editorial/calendar.yml`. Reuse it so the 90-day rule works. "NEW" topics should be appended there.

**Locale rules** (same as §0):
- fa articles may quote prices in their own text: factory + location + date.
- ar may quote a price with a date only, and never names a factory.
- en never quotes a price.

Raw-material articles quote no price in any locale.

| # | Working title (fa) | Main keyword (fa) | Secondary | Locales | Links to | Calendar id |
|---|---|---|---|---|---|---|
| 1 | جدول وزن تیرآهن IPE؛ وزن هر متر و هر شاخه از IPE 80 تا 600 | وزن تیرآهن | وزن تیرآهن ۱۴ / ۱۶ / ۱۸، جدول اشتال تیرآهن | fa, ar («وزن الشيلمان»), en ("IPE beam weight chart") | `ipe-beam`, calculator | cal-014 |
| 2 | گزارش هفتگی بازار آهن: دلار، شمش، بورس کالا و قیمت‌ها (recurring) | پیش بینی قیمت آهن | قیمت آهن هفته آینده، نمودار قیمت آهن | fa (ar with prices, no factories; en: no-price market note or skip) | `/prices`, hubs | NEW (series; the existing `steel-price-report-*` is its first issue) |
| 3 | تفاوت میلگرد A2، A3 و A4؛ کدام برای پروژه شما؟ | تفاوت میلگرد A2 و A3 | A3 بهتر است یا A2، میلگرد A3 و A4 | fa, ar, en ("rebar grades A1–A4 vs B500") | 4 rebar products | cal-015 |
| 4 | جدول وزن نبشی؛ نبشی ۳ تا ۱۰ سبک و سنگین | وزن نبشی | وزن نبشی ۴ / ۵ / ۶، جدول اشتال نبشی | fa, en | `equal-angle` | NEW (merge cal-022 «سایز نبشی») |
| 5 | جدول وزن قوطی و پروفیل؛ ۲×۲، ۴۰×۴۰، ۴۰×۸۰ و بیشتر | وزن قوطی | جدول وزن قوطی، جدول اشتال قوطی | fa, ar («جدول اوزان الحديد المربع»), en ("SHS weight per meter") | SHS, RHS | cal-018 |
| 6 | جدول وزن ناودانی UPN و UPE؛ ناودانی ۸، ۱۰ و ۱۲ | وزن ناودانی | ناودانی سبک و سنگین، جدول اشتال ناودانی | fa, en | UPN, UPE | cal-021 |
| 7 | خرید میلگرد از بورس کالا یا بازار آزاد؟ مراحل، هزینه‌ها و ریسک‌ها | نحوه خرید میلگرد از بورس کالا | خرید میلگرد از کارخانه، قیمت میلگرد در بورس کالا | fa | rebar hub, `/services` | NEW |
| 8 | وزن ورق آهن؛ فرمول و جدول ورق ۱ تا ۶۰ میل | وزن ورق آهن | وزن ورق ۲ میل، محاسبه وزن ورق | fa, ar («حساب وزن الصاج»), en ("steel plate weight per m²") | 4 sheet/plate products, calculator | cal-019 |
| 9 | ورق ST37 و ST52 (S235JR و S355JR)؛ تفاوت و کاربرد | ورق st52 و st37 | ورق st37 چیست، ورق st52 چیست | fa, en ("what is S355JR steel") | sheet/plate products | cal-016 |
| 10 | چه چیزهایی قیمت آهن را تغییر می‌دهد؟ دلار، شمش، انرژی و صادرات | عوامل موثر بر قیمت آهن | دلار و قیمت آهن، شمش و میلگرد | fa, ar | `/prices` | cal-025 |
| 11 | بهترین زمان خرید آهن در سال؛ فصل، عید و قطعی برق | بهترین زمان خرید آهن | فصل خرید آهن، قیمت آهن قبل از عید | fa | `/prices`, `/contact` | cal-026 + cal-029 |
| 12 | تیرآهن IPE یا IPN؛ کدام برای پروژه شما؟ (+ تیرآهن هاش چیست) | تفاوت تیرآهن IPE و IPN | تیرآهن هاش چیست | fa, ar, en ("IPE vs IPN") | IPE, IPN | cal-002 |
| 13 | قیمت شاخه‌ای یا کیلویی؟ قیمت هر شاخه میلگرد ۱۶ را چطور حساب کنیم | قیمت هر شاخه میلگرد | میلگرد ۱۶ چند کیلو است، خرید آهن شاخه ای | fa | rebar hub, calculator | cal-005 |
| 14 | جدول وزن لوله مانیسمان و اسکجول؛ رده ۴۰ و ۸۰ | اسکجول لوله | لوله مانیسمان رده ۴۰، وزن لوله | fa, en ("SCH 40 pipe weight chart") | A106 | cal-020 |
| 15 | قیمت درب کارخانه، انبار و تحویل در کارگاه؛ تفاوت در عمل | قیمت درب کارخانه آهن | هزینه حمل آهن | fa | hubs | cal-004 + cal-027 |
| 16 | شمش فولادی 3SP و 5SP چیست؟ مشخصات و کاربرد | شمش فولادی 3SP | شمش 5SP، خرید شمش فولادی | fa, ar, en ("3SP vs 5SP billet") | `/raw-materials/billet` (P2-1) | NEW (gate: §10 Q2) |
| 17 | راهنمای بازار آهن تهران؛ خرید آهن‌آلات در تهران بدون دردسر | بازار آهن تهران | آهن فروشی تهران، بازار آهن شادآباد | fa | `/contact` | NEW (gate: §10 Q1, NAP) |
| 18 | از سنگ آهن تا میلگرد: کنسانتره، گندله، آهن اسفنجی و شمش | زنجیره تولید فولاد | آهن اسفنجی چیست، گندله چیست | fa, ar, en | `/raw-materials` | NEW |
| 19 | استاندارد میلگرد INSO 3132؛ چه چیزهایی را روی بار چک کنیم | استاندارد میلگرد | مشخصات میلگرد آجدار | fa, ar | rebar products | cal-017 |
| 20 | برآورد آهن‌آلات اسکلت فلزی پیش از خرید؛ گام‌به‌گام | برآورد آهن اسکلت فلزی | محاسبه آهن مصرفی ساختمان | fa | beam, plate, angle, calculator | cal-009 |
| 21 | گواهی آنالیز (Mill Test Certificate) فولاد را چطور بخوانیم؟ | گواهی آنالیز فولاد | mill certificate | fa, ar, en ("how to read a mill test certificate") | all, `/services` | cal-024 |
| 22 | هزینه آهن‌آلات اسکلت ساختمان در ۱۴۰۵ (fa with a dated price example only) | هزینه اسکلت ساختمان | آهن مصرفی هر متر مربع | fa | hubs | cal-030 |
| 23 | خرید قوطی و پروفیل ساختمانی برای سازه سبک | خرید قوطی ساختمانی | قوطی ستون، پروفیل ساختمانی | fa | SHS, RHS | cal-007 (+ cal-040) |
| 24 | طول وصله و خم میلگرد؛ آنچه پیمانکار باید بداند | طول وصله میلگرد | خم میلگرد ستون | fa | rebar, SV-03 (later) | cal-037 + cal-038 |
| 25 | آهن اسفنجی (DRI/HBI) چیست و چگونه تأمین می‌شود؟ | آهن اسفنجی | بریکت آهن اسفنجی | fa, ar, en ("Iranian DRI HBI") | `/raw-materials/dri` | NEW (gate: §10 Q2) |
| 26 | ar-native: «الحديد الإيراني: الأنواع والمعايير وما يجب معرفته قبل الشراء» | الحديد الايراني | حديد تسليح ايراني، انواع الحديد الايراني | ar (fa and en versions optional) | `/ar/products`, `/ar/prices` | NEW (no factory names in ar) |
| 27 | en-native: "How to Evaluate an Iranian Steel Supplier: Standards, Certificates, Inspection" | iranian steel suppliers | steel companies in iran | en (fa/ar optional) | `/en/products`, `/en/services` | NEW (export scope gate, §10 Q5) |
| 28 | پیش‌فاکتور آهن‌آلات را چطور بخوانیم؟ ارزش افزوده، حمل، کسری وزن | پیش فاکتور آهن | ارزش افزوده آهن | fa | `/contact` | cal-011 + cal-031 |
| 29 | چک‌لیست تحویل بار آهن در کارگاه؛ وزن‌کشی، برچسب، مدارک | تحویل بار آهن | باسکول، کسری بار | fa | `/services` | cal-006 |
| 30 | کاربرد نبشی و ناودانی در ساختمان و صنعت | کاربرد نبشی | کاربرد ناودانی | fa, en | angle, UPN, UPE | cal-041 + cal-046 |

**Overlap to fix in the content repo:**
- **Rebar weight article.** `rebar-weight-table` (already written) covers rebar **and** IPE in one article. Retitle it to rebar only («جدول وزن میلگرد؛ …») and move the IPE table to #1. Otherwise the two articles compete for «وزن تیرآهن».
- **Weekly market report (#2).** It must not invent forecasts. Use the dated drivers (dollar rate, IME results, billet, mill list changes) with cited sources, and say "outlook" only for what the sources say.

---

## 10. Open questions for the owner

| # | Question | Blocks |
|---|---|---|
| Q1 | Which single business address, city and phone are the official NAP? The header phone uses the 031 prefix; the brief says Tehran | LC-01, #17, Google Business Profile |
| Q2 | Which raw materials does Ahan Asa really source (billet, DRI, pellet, concentrate, scrap, slab), and for which markets? | §5.6, P2-1, P3-4, #16, #25 |
| Q3 | ar shows Toman/kg, but Iraqi buyers think in dinar or USD per ton. Keep Toman only (current rule), or approve a separate ar unit? (Would need a new price decision.) | ar price CTR |
| Q4 | Catalog expansion: galvanized and oiled sheet, HEA/HEB, galvanized pipe (strong demand, §3.1) | new product and price pages |
| Q5 | Is export (en/ar buyers outside Iran) an approved line? This governs en supplier and raw-material targeting | #27, en raw materials |
| Q6 | Approve the ar trade words «شيش», «شيلمان», «حديد مربع» in ar titles | §7 ar strings |
| Q7 | Industries and Markets: fill with real content, or `noindex` until filled? | §2.2 #9 |
| Q8 | Home H1 (frozen hero): keep, or approve «تأمین و خرید آهن‌آلات پروژه»? | §7.1 |

**Measurement (after merge).**
1. In GSC, verify the property (if not done) and submit the sitemap.
2. Export queries and pages (90 days). Re-rank the P1/P2 rows by real impressions, and record the change here.
3. Track per cluster: impressions, average position and CTR for the owner URL. Flag any second URL that ranks for a cluster owned by another page (cannibalization).
4. Re-run the autocomplete harvest each season. The seeds are in this document (§3).
