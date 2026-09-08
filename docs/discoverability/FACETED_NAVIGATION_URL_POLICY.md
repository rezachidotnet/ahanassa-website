# Ahan Asa — Faceted Navigation URL Policy

**Status:** Active — **FROZEN POLICY** for catalog crawl/index control.
**Governing frozen authority:** `docs/discoverability/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md` §18–§23, §49 items 5–6, §50.
**Implementation authority it constrains:** `docs/CATALOG_PUBLIC_ROUTES.md` (route/slug/filter/sitemap architecture).
**Created:** 2026-09-08 (GEO-G0 foundation gate).

---

## 1. Why this document exists

V1.1 §19 does not merely describe faceted URLs — it **delegates authorship** of
this policy:

> The catalog team must define:
>
> - crawl policy;
> - canonical policy;
> - index policy;
> - internal-link policy;
>
> for faceted states.

`docs/CATALOG_PUBLIC_ROUTES.md` §6 already owns how filters are *implemented*
(server-rendered `<Link>` toggles over `?family=&group=&form=&grade=&standard=`,
facet values drawn only from published templates) and §13 owns the sitemap
boundary. Neither states a **crawl/index policy** for the resulting URL space.
This file supplies exactly that missing layer and nothing else.

This is a **policy document**. It defines rules and an approval bar. It does not
list, propose, or approve any actual landing page — see §7.

---

## 2. The frozen default

V1.1 §18:

> **A filter state is NOT an indexable SEO landing page by default.**

V1.1 §19 restates the consequence: default filter/sort states must not
automatically generate new indexable identities merely because a user can select
them. The example the spec gives is a URL of exactly the shape this project
produces:

```text
/products/rebar?grade=AJ400&size=16
```

Applied to Ahan Asa's actual parameters, the frozen default is:

| URL shape | Default disposition |
|---|---|
| `/{locale}/products` | The canonical catalog listing identity |
| `/{locale}/products?family=…` | Filter state — not a separate indexable identity |
| `/{locale}/products?group=…` | Filter state — not a separate indexable identity |
| `/{locale}/products?form=…` | Filter state — not a separate indexable identity |
| `/{locale}/products?grade=…` | Filter state — not a separate indexable identity |
| `/{locale}/products?standard=…` | Filter state — not a separate indexable identity |
| any combination of the above | Filter state — not a separate indexable identity |
| `/{locale}/products/{slug}` | A real indexable identity, governed by editorial `index_status`, not by this document |
| `/{locale}/products/{slug}?variant=…` | In-page highlight state — not a separate indexable identity |

The five filter dimensions combine multiplicatively. That is precisely the
"extremely large URL spaces" V1.1 §18 warns about, and it is why the default is
restrictive rather than permissive.

---

## 3. Sort, view, and tracking parameters

V1.1 §22 — parameters that alter only sort order, view mode, UI presentation, or
analytics/tracking **must not create new canonical content identities**. Examples
the spec names:

```text
?sort=price
?view=grid
?utm_source=...
```

Frozen rule for this project: any such parameter, present now or added later,
remains subordinate to the canonical content URL. It never becomes a canonical
identity, never appears in a sitemap, and never receives its own metadata.

Note for implementers: `?sort=`, `?view=`, and `?page=` **do not currently exist**
in this application. This clause is a forward-looking constraint on whoever adds
them, not a description of present behavior. The legacy `?category=` parameter
still linked from the site footer is parsed by nothing and is silently ignored
(`docs/CATALOG_PUBLIC_ROUTES.md` §6); it is a tracking-class parameter for the
purposes of this policy — never a canonical identity.

`?variant=` on a product detail page is a presentation/highlight parameter of the
same class: it selects which existing row of that page's own spec table is
scrolled to and emphasized. It creates no new content and must never become an
indexable identity — this preserves the deliberate decision in
`docs/CATALOG_PUBLIC_ROUTES.md` §4 that 237 independent Variant SEO pages were
not created.

---

## 4. Canonical alone is not crawl control

V1.1 §21, stated explicitly because it is the most common failure mode:

> Canonical is not a universal substitute for controlling crawl explosion.
>
> Do not generate millions of crawlable filter URLs and rely solely on canonical
> tags to clean them up later.

**A correct canonical tag on a filter URL does not satisfy this policy.** A
canonical tag is an indexing hint applied *after* a crawler has already spent
budget discovering and fetching the URL. It does not prevent discovery, does not
prevent fetching, and does not bound the size of the crawl frontier.

Therefore, per filter class, the architecture must decide all five of the
questions V1.1 §21 lists — not just the canonical one:

1. whether the URL exists at all;
2. whether it is crawlable;
3. whether it is indexable;
4. what canonical it uses;
5. whether bots should discover links to it.

Question 5 is the one this project currently leaves unanswered: the filter
options in `components/products/catalog-filter-bar.tsx` are plain `<Link>`
elements, which render as ordinary crawlable `<a href>` anchors. That is
excellent for accessibility and for zero-JS operation, and it must not be
regressed into JavaScript-only controls — but it does mean filter states are
link-discoverable and question 5 needs a deliberate answer before the catalog
listing is ever made indexable. Recording that as an open pre-staging item is
this policy's job; choosing the mechanism is not, and no mechanism is
implemented here.

---

## 5. When a facet may become an indexable landing page

V1.1 §20 — a faceted/attribute combination becomes a deliberate indexable
landing page **only if** it has all seven of:

1. meaningful search/buyer intent;
2. stable canonical URL;
3. unique useful visible content;
4. durable commercial/catalog relevance;
5. intentional internal links;
6. sitemap eligibility;
7. no dependency on ephemeral filter state.

```text
approved landing page
≠
raw filter URL
```

### 5.1 Ahan Asa approval bar

In addition to the seven conditions above, an approved landing page in this
project requires:

- **Explicit owner approval**, recorded before implementation. Satisfying the
  seven conditions is necessary, never sufficient.
- **A real editorial entity**, not a query string. It must resolve through the
  existing `product_seo_contents` editorial model with its own approved `h1`,
  `intro`, `seo_title`, `seo_description`, and its own `index_status` — the same
  publication-eligibility path `docs/CATALOG_PUBLIC_ROUTES.md` §5 already
  enforces for every other indexable catalog URL. It must not be a special-cased
  query-parameter exception layered beside that model.
- **Content that is not a filtered restatement.** If the page's entire value is
  "the listing, minus some rows", it fails condition 3 and must not be created.
  This is also `01-sources/CONTENT_STRATEGY.md` §19.1's existing rule against
  substantially duplicated product variants.
- **No thin-page creation to target a phrase.** V1.0 §33 and §12 both prohibit
  indexable pages whose only purpose is to repeat another page with slightly
  different keywords.

---

## 6. Source-of-truth boundary

V1.1 §23 — indexable catalog logic must remain downstream from the Public Product
Projection. Frozen model:

```text
Odoo Product Master
↓
Public Product Projection
↓
Catalog / approved landing-page policy
↓
Indexable URLs
```

**Do not create an SEO-only product taxonomy that diverges from Odoo/public
commercial truth.** Concretely, for this project: a facet value must originate
from the synced classification columns (`family_code`, `group_code`, `form_code`,
`grade_code`, `standard_code`) already present on real projected variants. A
marketing-invented category, a grade that exists only in copy, or a "collection"
assembled purely for search targeting is prohibited, regardless of its search
volume.

Where a classification is genuinely `null` upstream — structural beams having no
grade, for instance — the corresponding facet dimension is simply absent. It is
never backfilled with an invented value to make a landing page possible.

---

## 7. No approved facet landing pages exist

As of 2026-09-08 this project has **zero** approved facet landing pages, and this
document deliberately proposes none. GEO-G0 is a governance phase; inventing a
list of plausible-looking facet pages here would fabricate commercial decisions
the owner has not made.

When the first one is approved, it is recorded against the criteria in §5, with
its approval reference — not added silently.

---

## 8. Relationship to current implementation

Audited state, 2026-09-08, recorded so the policy is read against reality:

- Filter parameters `?family=&group=&form=&grade=&standard=` are live in
  `app/[locale]/products/page.tsx` via `lib/catalog/catalog-filters.ts`.
- `generateMetadata` for `/products` ignores `searchParams` entirely, so every
  filter state currently resolves its canonical to the clean
  `/{locale}/products` URL. That is the correct canonical behavior required by
  §2 — it is already compliant and must not be regressed.
- `/products` is currently `indexable: false`, and `app/sitemap.ts` contains only
  `index_status='index'` product detail URLs — no filter state has ever been
  submitted for indexing.
- Consequently the *present* risk is low. The policy exists so that the risk does
  not appear the moment the listing shell's `indexable` flag flips, which is a
  one-line change.

Nothing in this document authorizes a code change. Implementing question 5 of §4
is a later, separately-approved task.
