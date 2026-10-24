# W43 — alloy and tool steel: website pages now, product pages later

Owner approval: W39 §9 decisions D-ALLOY-1 … D-ALLOY-10, taken as recommended on 2026-10-24.

## What W43 ships

- `/alloy-steel`: the hub «فولاد آلیاژی و ابزار» / "Alloy & tool steel" / «الفولاذ السبائكي وفولاذ العدد», in fa, en and ar.
- One guide per wave-1 grade at `/alloy-steel/<slug>`:

  | Slug | Grade |
  |---|---|
  | `ck45` | CK45, 1.1191 / C45E |
  | `mo40-42crmo4` | MO40, 1.7225 / 42CrMo4 |
  | `vcn150-34crnimo6` | VCN150, 1.6582 / 34CrNiMo6 |
  | `semante-16mncr5` | سمانته 7131, 1.7131 / 16MnCr5 |
  | `1-2312` | 1.2312 / 40CrMnMoS8-6 |
  | `1-2344-h13` | گرمکار 2344, 1.2344 / X40CrMoV5-1 |
  | `spk-1-2080` | SPK, 1.2080 / X210Cr12 |
  | `1-2510-amutit` | 1.2510 / 100MnCrW4 |

- Price on request only (D-ALLOY-5). No price, amount or currency on these pages. «قیمت» / price / سعر never
  appears in a title or meta.
- The «استعلام قیمت» button opens `/contact?alloy=<slug>`. That adds a custom (free-text) RFQ row naming the grade.
  The calculator's alloy section also passes the size text and the total kg (`&spec=…&qty=…&unit=kg`). Code:
  `lib/alloy/rfq.ts`.
- Weight calculator: an alloy and tool steel section that uses the grade's density (D-ALLOY-6), for example
  7.70 for 1.2080 and 7.80 for 1.2344, and shows which density it used. The guides link to it with
  `?grade=<slug>#alloy-weight`.
- JSON-LD on each guide: Article, FAQPage and BreadcrumbList. The hub has BreadcrumbList. Every page is in the
  sitemap with fa/en/ar alternates and in `llms.txt`. Links to the hub: footer products list, Products dropdown and
  drawer, products index.

## Later: product pages for the Odoo wave-1 SKUs

These go live only after Odoo W42 (group `ALLOY_TOOL_BARS`, the wave-1 templates and variants) is deployed and
serving. Do not list an SKU Odoo does not serve.

1. Take the final SKU list from the Odoo W42 report or the deployed catalog. The W39 SKU pattern
   (`AA-AT-RB-1P7131-D50`, `AA-AT-FF-1P2312-CUSTOM`, …) is a proposal only.
2. Add the SKUs to `PUBLIC_ON_FIRST_PUBLISH` in `lib/content-pipeline/variant-publication-allowlist.ts` with the
   decision label "W39 D-ALLOY-1 wave 1, owner 2026-10-24". Use one entry per SKU, never "all new variants".
3. If Odoo creates the templates in draft, add their pages to `lib/content-pipeline/editorial-page-allowlist.ts`,
   as W9.13 groups 7–9 did.
4. Category SEO copy for the new public category goes in `lib/content/category-seo.ts`. Keep the guides as the
   informational pages and link the category listing to them.
5. Once the variants exist, the guide's «استعلام قیمت» can use `?variant=<CVAR>` for the matching size. Keep the
   custom row for sizes that are not variants (forged blocks, cut pieces).
6. Prices stay «قیمت با استعلام» until the W39 §4.3 collector work has run cleanly and the owner approves
   publishing them (two sources agreeing, or manager approval).

## Facts to confirm (from W39 §8)

- Chemistry ranges and delivery hardness on the guides come from the standards and datasheets the W39 study
  cites (EN ISO 683-1/-2/-3, EN ISO 4957). Check them against a licensed copy before treating them as contractual.
- Densities: 7.85 for CK45, MO40, VCN150, 1.7131, 1.2312 and 1.2510; 7.80 for 1.2344; 7.70 for 1.2080. None of
  the wave-1 densities is marked "to confirm" in W39.
- Size ranges are the ranges the market offers, not stock.
