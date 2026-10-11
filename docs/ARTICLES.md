# Articles (W11.1)

Owner-approved 2026-10-09. The articles written in the PRIVATE content repository
(`rezachidotnet/ahanassa-content`, W11.2) are published by the daily content pipeline
(`docs/CONTENT_PUBLICATION_PIPELINE.md`): whatever is merged into its `main` by the publish run ships.
No JSON-LD and no RSS yet (SEO phase). Never in D1.

## Routes (fa unprefixed; ar `/ar/…`, en `/en/…`)

| Route | What |
|---|---|
| `/articles` | listing, newest first, 12 per page, category filter (plain links) |
| `/articles/page/<n>` | listing page n ≥ 2 |
| `/articles/category/<code>` | one category (`buying-guide`, `standards`, `market-analysis`, `application`, `construction-technology`) |
| `/articles/category/<code>/page/<n>` | its page n ≥ 2 |
| `/articles/<slug>` | one article |
| `/images/articles/<locale>/<slug>.png` / `.webp` | its cover (og:image = PNG; cards and page = WebP) |

A locale gets these pages only when it has at least one article; the header/footer item «مقالات» /
«المقالات» / "Articles" (between Industries and About) is shown on the same condition. Slugs `page`,
`category`, `covers` are reserved. hreflang: an article ↔ its published translations (both sides must
publish and point at each other); a listing's page 1 ↔ the same listing in the other locales that have it;
pages ≥ 2 only themselves. All of them are in the production sitemap with the same alternates; lastmod =
the article's `updated` (a listing: the newest it lists).

**Article page:** breadcrumb, category, title, description, «انتشار» + «به‌روزرسانی» dates, reading time
(200 words/min), cover, table of contents (h2s; a sidebar on desktop, a collapsible box on mobile), body,
FAQ, sources (web pages linked `nofollow`; API endpoints named, not linked), author line, «استعلام قیمت» box
(→ `/contact`), related product cards (`related_products`, those published in the locale) + «استعلام
قیمت», related articles (same category first). Body Markdown is parsed to a tree and rendered as React
elements (`lib/articles/markdown.ts`) — no HTML from an article is ever injected.

## Fetch (`lib/content-pipeline/articles-source.ts`) — for W9.7

Only `articles/**/*.md` and `assets/articles/**/*.svg` are read. The clone is shallow, sparse AND
blob-filtered (`--filter=blob:none` + `sparse-checkout /articles/ /assets/articles/`): no other file of the
content repository — in particular `editorial/banned.txt` — is downloaded. Symlinks are not followed.

| Variable | Use |
|---|---|
| `AHANASSA_CONTENT_REPO_TOKEN` | read-only token for that one repository (fine-grained PAT or GitHub App token, `contents: read`); passed to git as an HTTP header through `GIT_CONFIG_*`, never in argv or the URL; redacted from errors |
| `AHANASSA_CONTENT_DEPLOY_KEY_FILE` | alternatively: path to a read-only SSH deploy key file (`GIT_SSH_COMMAND`, `IdentitiesOnly`) |
| `AHANASSA_CONTENT_DIR` | alternatively: an existing checkout (local development, or a CI `actions/checkout` of `main` made with the deploy key); only the two folders are read |
| `AHANASSA_CONTENT_REPO` | default `rezachidotnet/ahanassa-content` |
| `AHANASSA_CONTENT_REF` | default `main` (only merged articles publish) |

W9.7 wiring (not done here): give the content-publish **build** job one of the first three (a secret), nothing
else. The fetch never fails the step; it writes `source/articles.json` and one summary line.

## Fail-safe and the article decrease gate

Same rule as prices (W9.4): if the content repository is not configured or the fetch fails, the run
**builds without articles and warns** — unless the live site already shows articles (the active
publication's `articles_fa/ar/en` counts), then it is **blocked**.

Every article is checked again by the website (`lib/articles/validate.ts`) against THIS run's catalog and
price snapshot; an article that fails is **left out** and named in the run summary (annotation
`articles: left out`), the others publish. If that — or a removal in the content repository — lowers any
locale's article count below the live publication's, the **article decrease gate** stops the run (threshold
0, unlike the 20 % of the catalog counts). An intended removal re-runs with `allow_decrease=true` (recorded).

## Checks per article (validate step) and gates on the pages (artifact gate)

| Rule | Validate step (article left out) | Artifact gate (publish blocked) |
|---|---|---|
| en: zero price data | no currency, no number ≥ 100 000, no amount of this snapshot, no number in a sentence about prices (sizes/weights/standards/years excepted) | the W9.4/W9.6 price gate on every en file + the same text rules on the page's `<main>` (`lib/static/article-gate.ts`) |
| ar: no factory or location | none of this snapshot's factory/location names | price gate (whole ar file) + article gate |
| fa/ar price quotes | allowed (content repo rules: fa factory + location + date; ar date) | the price gate lets a rendered amount stand only inside the article's own text (`data-aa-article-text`) on fa/ar article pages |
| source names | private list (`AHANASSA_PRICE_SOURCE_NAMES_FILE`) over text, links and the cover SVG | source-name scan over every public file |
| links | internal links stay in the locale and resolve to this build's pages (catalog, static pages, other articles that pass — repeated until stable); http(s)/mailto/tel only | link check (links, images, canonical/hreflang reciprocity, sitemap) |
| images | no Markdown image at all; the cover is pure vector (no raster, script, foreignObject, external reference), ≤ 150 KB | article gate: every image/og:image is a file of this site |
| leaks | the public-file leak scan (Persian on en/ar, contacts, private fields) on the article's text | leak scan on every public file |
| JSON-LD | — | article gate: none on article pages |

## Covers (`lib/articles/cover-raster.ts`)

The content repository's 1200×630 SVG (`cover.svg` for fa, `cover.ar.svg` / `cover.en.svg`, else the fa
cover) is rasterized during the static build with resvg (WASM) and ONLY the Estedad static fonts in
`lib/fonts/cover/` (OFL-1.1; no system font), then encoded to WebP with sharp — deterministic, so the
staging and production twins are byte-identical. resvg ignores the SVG `direction` property, so an RTL
cover is normalized first (anchors swapped, one `<text>` per title line, RLM-led runs). The SVG is never
published.

## r4: the robots tag of an article page

Article metadata is long (og image, dates, hreflang), which puts the page's route row near React Flight's
3200-byte outlining threshold, where the robots value — the one length difference between the staging and
production builds — could change the row split and fail the allowlisted-diff gate. So an article page
renders its robots `<meta>` itself, as the LAST element of its own isolated row (React hoists it into
`<head>`); its metadata has no `robots` (`buildPageMetadata({ robotsInPage: true })`).
