# SEO page set (W16.3, decision D-SEO)

Implements the page work in `docs/seo/keyword-map.md` (PR #46) §6–§8, with the owner answers in D-COMPANY-INFO (2026-10-13). JSON-LD and analytics are out of scope here (PR #47).

| Area | What | Where |
|---|---|---|
| Category pages (21) | Own title, H1, meta and a 60–130-word intro per category × locale. fa says «قیمت روز» only on a day the family has prices. ar uses the Iraqi trade words (الشيش، الشيلمان، الصاج، العلب). en never uses a price word. Intro links to the family hub (fa/ar, when published) and the calculator | `lib/content/category-seo.ts`, `app/[locale]/products/category/[category]/page.tsx` |
| Family price hubs | `/prices/<family>` in fa and ar. Dated title and H1; H2 by size with an H3 and `#size-…` anchor per size; fa only: H2 by mill with an H3 and `#mill-…` per factory that has rows that day; weight column; clean product links; FAQ (HTML only, no JSON-LD); RFQ CTA. A family with no priced rows that day is **not published** (no route, sitemap entry or link). en `/en/prices/<family>` 302s to the en category page | `lib/pricing/price-hubs.ts`, `lib/pricing/price-page-data.ts`, `app/[locale]/prices/[family]/page.tsx` |
| `/prices` | Dated title/H1 (families ordered by demand), an H2 over the table, and an H2 section with one card per hub plus clean product links. `/en/prices` now 302s to `/en/products` | `app/[locale]/prices/page.tsx` |
| Weight calculator | Published in en and ar (en has no cost estimate). Titles per §7.5. Linked from product rows, category intros, hubs, `/prices`, the product link block and the home showcase button | `lib/weight-calculator/publication.ts` |
| Product pages | A link block under the specs: category, sibling templates of the category, family hub (fa/ar, when published), calculator, and up to 3 articles whose `related_products` list the product | `components/products/product-related-links.tsx` |
| Raw materials | `/raw-materials` + billet, DRI, iron ore, briquette (HBI), fa/en/ar. RFQ-only banner, no price, no «قیمت» in a title or meta, only standard-level facts | `lib/content/raw-materials.ts`, `app/[locale]/raw-materials/**` |
| Export | `/export` in en and ar: what we export, how to request, RFQ link. No price on either locale. fa `/export` 302s to `/` | `lib/content/export.ts`, `app/[locale]/export/page.tsx` |
| Titles | The en title suffix is "Ahan Asa", not «آهن آسا». Home titles are absolute (brand once). fa home H1 «تأمین و خرید آهن‌آلات پروژه» (text only) | `app/[locale]/layout.tsx`, `lib/metadata/site.ts`, `app/[locale]/page.tsx`, `lib/content/homepage.ts` |
| Industries, Markets | `noindex, follow` on every target and left out of the sitemap until they have real content. The indexing gate enforces both | `lib/seo/indexing-policy.ts` (`PRODUCTION_NOINDEX_PAGES`), `lib/static/indexing-gate.ts` |

Every price-showing block (hubs, `/prices` sections, category/product hub checks) sits in its own async boundary, so the r4 staging/production diff gate stays at "robots value only". Tests: `lib/static/seo-pages-w163.test.ts`.

**Open:**
- The RFQ form has no raw-material option. Raw-material pages link to `/contact`, and the buyer describes the material in the list or notes.
- Footer links (calculator, raw materials) were left out, to keep away from the footer/header PRs.
