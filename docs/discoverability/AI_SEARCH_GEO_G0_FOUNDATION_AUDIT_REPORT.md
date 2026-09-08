# AHAN ASA — AI SEARCH / GEO / DISCOVERABILITY
# GEO-G0 FOUNDATION GATE — AUDIT REPORT

**Phase:** GEO-G0 — V1.1 Foundation Gate (spec import + architecture audit + governance baseline)
**Date:** 2026-09-08
**Nature:** Documentation and governance only. Read-only against all runtime code.

```
AI SEARCH / GEO AUTHORITY: V1.1 + V1.0 IF PRESENT
HOMEPAGE COMPONENTS REOPENED: NO
CRAWLER REGISTRY: CREATED
FACET POLICY: CREATED
CWV POLICY: PRESENT
IMAGE DISCOVERY POLICY: PRESENT
CONTENT TRUST POLICY: PRESENT
AGENT CONTENT SECURITY POLICY: CREATED
RUNTIME CHANGE IN GEO-G0: NO
PRODUCTION ROBOTS CHANGED: NO
CLOUDFLARE WAF CHANGED: NO
REMOTE MIGRATION: NO
DEPLOY: NO
HOMEPAGE MAY CONTINUE: YES
GEO-G1 REQUIRED BEFORE NEXT HOMEPAGE COMPONENT: NO
```

---

# RESULT

**PASS — foundation established, no runtime change required.**

V1.1 was imported byte-for-byte. A full read-only audit of the repository against
V1.1 and V1.0 was completed. Three governance artifacts plus a directory index
were created; four further candidate artifacts were **deliberately not created**
because existing repository authorities already own those concerns and creating
parallel documents would have produced a duplicate authority tree.

No frozen Homepage component was reopened. No runtime, test, config, migration,
robots, WAF, DNS, or deployment change was made. Tests, typecheck, and build are
unchanged from baseline.

Two genuine defects were found (§ CURRENT COMPLIANCE MATRIX and the dedicated
findings below): a **stale sample-data category taxonomy linked from the global
footer on every page**, and **Organization/WebSite structured data emitted only
on a noindex page**. Neither blocks Homepage work; both are pre-staging items.

---

# PREFLIGHT

| Check | Result |
|---|---|
| Working directory | `/Users/reza/Developer/ahanassa-website/.claude/worktrees/geo-g0` |
| Branch | `worktree-geo-g0` |
| Working tree at start | Clean |
| Working tree at end | Clean |
| Worktree created by this task | No — pre-existing, entered directly |
| `git worktree` commands run | None |
| Write-isolation guard encountered | None. No guard, permission denial, or tool refusal occurred; no bypass of any kind was attempted or performed. All writes used Write/Edit inside this worktree. |

---

# BASE SHA

```
04667f043af298fbf60d2d2a3cd0f0d21d6e0b65
```

Short form `04667f0` — `docs: freeze Purchase Process V2.0`. Confirmed as HEAD
with a clean tree before any change.

---

# V1.0 STATUS

**Present as source material in `~/Downloads`; deliberately NOT imported into the
repository.**

| Property | Value |
|---|---|
| File | `~/Downloads/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.0.md` |
| Size | 27,546 bytes |
| SHA-256 | `a2bfbcf7643385ce1ba416287abe16f89f67ed4bb0c36905a16616a2918596f5` |
| In-repo copy | None, before or after this task |

V1.0 was read in full for context. **V1.1 extends V1.0; it does not replace it.**
Verified from V1.1's own framing rather than assumed:

- V1.1 front matter: `**Extends:** AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.0.md`
- V1.1 §1: "Version 1.1 hardens the existing V1.0 architecture without reopening
  previously frozen Homepage component specifications. … The existing V1.0
  principles remain authoritative unless explicitly refined here."
- V1.1 §49: "In addition to V1.0 release validation, PASS now also requires: …"

Per this task's §8, only the V1.1 authority was committed. V1.0 therefore remains
an external source document. Citations to V1.0 sections in the created governance
files are explicitly marked as citations to that external source. **This is a
recorded scope decision, not an oversight** — if the owner wants V1.0 versioned
in-repo as the base authority V1.1 extends, that is a separate, trivial import
task.

---

# V1.1 SOURCE

| Property | Value |
|---|---|
| File | `~/Downloads/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md` |
| Size | 25,041 bytes |
| Candidates found | Exactly one — no ambiguity |
| Source file after import | Untouched (read and copied only) |

---

# V1.1 SHA-256

```
Source: f6557dbcdf9d5cdc5f1da3bbd13c52f5a39655f0ac1cb3213108307812359b4e
Target: f6557dbcdf9d5cdc5f1da3bbd13c52f5a39655f0ac1cb3213108307812359b4e
```

**Match confirmed.** Independently re-verified with `shasum -a 256` on both files,
plus a `cmp` byte-comparison which reported identity. Nothing was rewritten,
normalized, merged, corrected, or removed — crawler names, vendor statements,
dated claims, and section structure are exactly as authored.

Destination: `docs/discoverability/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md`

---

# SPEC IMPORT COMMIT

```
85dfa5f0a4185af22811ab8feb350e4af535728e
docs: import AI Search GEO architecture V1.1
1 file changed, 1045 insertions(+)
```

Only the V1.1 file. No other file touched.

---

# AUTHORITY MAP

Derived by reading V1.1's actual section structure, not assumed.

## FROZEN POLICY — requires a new architecture version to change

| V1.1 sections | Subject |
|---|---|
| §2 | Frozen principle — discoverability must not create duplicate truth, duplicate pages, crawler chaos, unsafe hidden instructions, fake authority, mobile content loss, index bloat, or performance regression |
| §3 | Crawler purpose classes A/B/C/D |
| §5 (rule), §6 (rule), §11 | Search ≠ user-retrieval ≠ training separation; Anthropic three-role separation |
| §8 | No User-Agent-only trust |
| §9, §47 | robots.txt is crawler policy, never a security boundary |
| §15–§17 | Numeric CWV gates, field-vs-lab authority, regression gate |
| §18–§23 | Faceted navigation: filter state is not indexable by default; sort/view/tracking never canonical; canonical is not crawl control; projection-downstream source of truth |
| §24–§28 | Image discoverability baseline; no blanket `ImageObject`; no keyword-stuffed decorative alt |
| §29–§33 | E-E-A-T as quality framework; Who/How/Why; authorship honesty; AI-assisted content responsibility |
| §34–§38, §44 | Agent-facing content security; no machine-only layer; untrusted content is untrusted |
| §39–§43 | Mobile-first content, image, and metadata parity |
| §50, §51 | Acceptance matrix; explicitly rejected interpretations |
| §52 | Non-reopening of frozen Homepage components |

## MAINTAINABLE REGISTRY — updatable without an architecture version bump

| V1.1 sections | Subject |
|---|---|
| §4, §5 (tables), §6 (tables), §7 | Vendor token inventory across all classes |
| §12 | Explicit split: "The policy is frozen. The vendor-token inventory is maintainable." A token rename does not require a version bump; a material policy change does |
| §14 | Required registry fields |
| §13, §48 | Review cadence, event triggers, and review checklist |

## OPERATIONAL IMPLEMENTATION — derived artifacts, not architecture

| V1.1 sections | Subject |
|---|---|
| §53 | The eleven recommended future operational artifacts |
| §19 (delegation clause) | "The catalog team must define: crawl policy; canonical policy; index policy; internal-link policy" |
| §27 | Image sitemap — optional, where beneficial |

## PRE-STAGING GATE — must pass before a staging/production release

| V1.1 sections | Subject |
|---|---|
| §49 items 1–15 | The V1.1 release-gate additions, layered on V1.0 §55's 25-item checklist |
| §46 | Bing/Microsoft discovery; intended public pages must not block Bingbot |

## PRODUCTION MONITORING — requires real production evidence

| V1.1 sections | Subject |
|---|---|
| §16.1 | Field data authoritative where sufficient real-user data exists |
| §45 | Observability: crawler identity claim, status code, WAF action, rate-limit event, path, cache/origin, verification outcome |
| §13 (ongoing), §48 | Quarterly + event-driven registry review |
| §46 | Bing Webmaster Tools; IndexNow evaluated later |

---

# FROZEN HOMEPAGE NON-REOPENING

V1.1's non-reopening clause is **§52, "Relationship to Frozen Homepage
Components"** — section number verified by reading the document, not assumed. It
states the addendum does not reopen Header, Hero, Price Strip, Product Showcase,
Evaluation / Assurance V2.1, or Purchase Process V2.0, and that any visible
content/layout/CTA change to those components still requires its own versioned
approval. V1.0 §54 states the same rule and adds: "Do not silently modify frozen
UI under the label 'SEO' or 'GEO'."

Per-component status after this phase:

| Frozen component | Status |
|---|---|
| Header / Navigation V2.2 | **NOT REOPENED** |
| Shared Button V1.0 | **NOT REOPENED** |
| Hero V2.4 | **NOT REOPENED** |
| Price Strip V2.1 | **NOT REOPENED** |
| Product Showcase V2.0 | **NOT REOPENED** |
| Evaluation / Assurance V2.1 | **NOT REOPENED** |
| Purchase Process V2.0 | **NOT REOPENED** |

No file under `components/home/`, `components/layout/SiteHeader.tsx`,
`components/layout/header-nav-disclosure.tsx`,
`components/layout/mobile-nav-drawer.tsx`, `components/ui/button.tsx`, or
`components/ui/button-variants.ts` was modified, and no test covering them was
touched.

## Recommendations classified as FUTURE VERSIONED COMPONENT CHANGE REQUIRED

None. Every V1.1 requirement that touches a frozen component is already satisfied
by the existing implementation:

- **Product Showcase imagery / V1.1 §25–§26.** Showcase card images use `alt=""`,
  justified in-code by V2.0 §56/§78 because the adjacent `<h3>` already states the
  product family name. V1.1 §26 explicitly endorses this: decorative or redundant
  images must not receive keyword-stuffed alt text, and accessibility remains
  authoritative. No change is needed, and none may be made.
- **Hero imagery / V1.1 §26.** The Hero's right-hand visual column is
  `aria-hidden="true"` with `alt=""` — correct for a decorative image adding no
  user-facing information.
- **Purchase Process / V1.0 §20.** `HowTo` JSON-LD is explicitly not required;
  the component's semantic `<ol>` already represents the sequence. No schema was
  added.
- **Evaluation / Purchase Process CTAs / V1.0 §53.** The frozen rule that these
  components need no dedicated CTA is preserved; nothing in this phase adds one.

---

# CURRENT ROBOTS IMPLEMENTATION

**File:** `app/robots.ts` (Next.js `MetadataRoute.Robots`, served at `/robots.txt`;
excluded from the locale proxy matcher in `proxy.ts`).

Actual behavior, read from the file rather than assumed:

```
APP_ENV === "production":
    User-agent: *
    Allow: /
    Disallow: /api/
    Sitemap: {APP_BASE_URL}/sitemap.xml

APP_ENV anything else (local | preview | staging):
    User-agent: *
    Disallow: /
```

**This is wildcard-only. There is no crawler-specific policy of any kind.**

Per-agent current state — every one of these inherits the single `User-agent: *`
group; none is named anywhere in the implementation:

| Agent | Explicit rule present? | Effective production behavior |
|---|---|---|
| `Googlebot` | **No** | Inherits wildcard `Allow: /` |
| `Bingbot` | **No** | Inherits wildcard `Allow: /` |
| `OAI-SearchBot` | **No** | Inherits wildcard `Allow: /` |
| `GPTBot` | **No** | Inherits wildcard `Allow: /` — this is exactly the accidental inheritance V1.0 §5 warns against |
| `Claude-SearchBot` | **No** | Inherits wildcard `Allow: /` |
| `ClaudeBot` | **No** | Inherits wildcard `Allow: /` — accidental inheritance |
| `Claude-User` | **No** | Inherits wildcard `Allow: /` |
| `PerplexityBot` | **No** | Inherits wildcard `Allow: /` |
| `Perplexity-User` | **No** | Inherits wildcard `Allow: /` |
| `Applebot` | **No** | Inherits wildcard `Allow: /` |
| `Google-Extended` | **No** | Not applicable as a crawler (V1.1 §6 — robots product token); absence means no training-use restriction is declared |
| `Applebot-Extended` | **No** | Not applicable as a crawler; absence means no training-use restriction is declared |
| `CCBot` | **No** | Inherits wildcard `Allow: /` |

Assessment against V1.1 §49 item 2 and §50: the search-class rows are
*incidentally* compliant (public pages are allowed), but the training-class rows
are **non-compliant in substance** — V1.0 §5 and §55 item 4 require the GPTBot
policy to be *documented explicitly rather than inherited accidentally from a
generic wildcard rule*, and that is precisely what is happening today for GPTBot,
ClaudeBot, and CCBot.

**No modification was made to robots.**

---

# CURRENT SITEMAP IMPLEMENTATION

**File:** `app/sitemap.ts`, served at `/sitemap.xml`, also excluded from the proxy
matcher.

Generation logic: for each of `fa`, `en`, `ar`, call
`listIndexableCatalogTemplateSlugs(locale)` and emit
`{baseUrl}{localizedPath(locale, '/products/' + slug)}` with the row's real
`updatedAt` as `lastModified`.

Inclusion rules, traced to the repository layer:

| Route class | In sitemap? | Mechanism |
|---|---|---|
| Homepage `/`, `/en`, `/ar` | No | Not enumerated at all — deliberate, all pages currently `indexable: false` |
| `/about`, `/services`, `/industries`, `/markets`, `/contact`, `/request` | No | Not enumerated |
| `/products` listing | No | Not enumerated |
| `/products/{slug}` detail | Yes, conditionally | Only where the template is simultaneously published **and** editorially approved **and** `index_status = 'index'` for that exact locale. Commercially active state alone is never sufficient |
| Filter states `?family=…` etc. | No | Query strings are never constructed by the generator |
| Staging URLs | No | URLs are built from `APP_BASE_URL`, per environment |
| Non-canonical duplicates | No | One URL per `(template, locale)` published row |

Compliance with V1.0 §15: **PASS.** Deterministic, projection-derived, canonical
indexable URLs only. A flat sitemap (rather than a sitemap index) is a documented,
deliberate scale decision.

**No modification was made to the sitemap.**

---

# CURRENT CANONICAL / HREFLANG

**Files:** `lib/metadata/resolve.ts`, `config/locales.ts`, `proxy.ts`.

- **Locale structure.** `fa` is default and unprefixed (`/`), `en` → `/en`,
  `ar` → `/ar`. `proxy.ts` internally rewrites unprefixed requests to
  `/fa/...` while keeping the address bar unprefixed, and **308-redirects** an
  explicit `/fa/...` request to its unprefixed equivalent — so `fa` never has two
  canonical identities. This matches V1.0 §14 and `01-sources/METADATA_SPEC.md`
  §308.
- **Canonical.** `buildCanonicalUrl` always produces the absolute, locale-correct
  URL for the page's own path. Notably, `/products`'s `generateMetadata` ignores
  `searchParams` entirely, so every filter state canonicalizes to the clean
  `/{locale}/products` — already correct per V1.1 §22.
- **hreflang.** `buildLanguageAlternates` emits `fa`/`en`/`ar` plus `x-default`
  for uniform-path pages. Product detail pages instead use
  `buildLanguageAlternatesFromEntries`, driven by
  `listPublishedLocalesForProduct` — alternates are advertised **only** for
  locales that genuinely have a published editorial page for that exact template,
  each with its own independent slug. Missing translations do not generate
  fabricated equivalents.
- **x-default.** Points at the default-locale (`fa`) entry where present,
  otherwise the first genuinely available entry — never a fabricated URL for an
  unpublished locale.
- **No cross-language canonicalization.** No locale page canonicalizes to a
  different language. `<html lang>` and `dir` are set from the same locale
  registry (`fa-IR`/RTL, `en`/LTR, `ar`/RTL).

Compliance with V1.0 §13–§14: **PASS.**

**No modification was made.**

---

# CURRENT STRUCTURED DATA

**Files:** `lib/seo/schema.ts` (node builders), `lib/seo/json-ld.ts`
(serializer), `components/seo/JsonLd.tsx` (emitter).

| Type | Emitted from | Data real? | Tied to visible content? | Mobile/desktop equivalent? |
|---|---|---|---|---|
| `Organization` | `app/[locale]/page.tsx` (homepage only) | Yes — name, alternateName, url, logo, address, `contactPoint.telephone` all reuse the Central Verified Business Identity (`CONTACT_PHONE_E164`, confirmed address) | Yes — the Header renders the same phone number; the footer and contact page render the same address | Yes — server-rendered once, no breakpoint branch |
| `WebSite` | `app/[locale]/page.tsx` (homepage only) | Yes — name, url, publisher `@id` reference | Yes | Yes |
| `BreadcrumbList` | `app/[locale]/products/[slug]/page.tsx` | Yes — built from the page's own real slug and `h1`/commercial template name | Yes — mirrors the visible `PageHero` breadcrumb exactly | Yes |

**No `Product`, `Offer`, `Service`, `FAQPage`, `Article`, or `HowTo` schema is
emitted anywhere.** That is correct and deliberate:

- V1.0 §24–§25 forbid `Product`/`Offer` without honest price/availability data;
  pricing sync is unimplemented and the price strip is disabled
  (`PRICE_STRIP_ENABLED: "false"`).
- V1.0 §20 explicitly removes any `HowTo` requirement from the Purchase Process.
- V1.0 §22 forbids publishing a `SearchAction` when no real site search exists —
  and none is published. **Correct.**

**No fabricated, unsupported, or invented structured data was found.** The
serializer escapes `<`, U+2028, and U+2029 — a real, deliberate injection control.

**One genuine gap** — see the findings section below: `Organization` and `WebSite`
are emitted **only** on the homepage, which is currently `indexable: false`.

**No modification was made.**

---

# CURRENT IMAGE DISCOVERABILITY

**Classification: PARTIAL** — compliant where images exist; the catalog surfaces
that V1.1 §25 is really aimed at have no imagery at all yet.

| Surface | Implementation | Assessment |
|---|---|---|
| Hero (`components/home/hero.tsx`) | `next/image`, `priority`, explicit `sizes`, fixed `aspectRatio: 4/3`, `alt=""` inside an `aria-hidden` column | **Compliant.** Decorative; V1.1 §26 endorses `alt=""` |
| `PageHero` (`components/ui/page-hero.tsx`) | `next/image` `fill`, `priority`, `sizes="100vw"`, `alt` defaults to `""`, rendered at 30% opacity behind a gradient | **Compliant.** Background treatment, carries no information |
| Product Showcase (`components/home/product-showcase.tsx`) | `next/image` `fill`, responsive `sizes` across four breakpoints, `alt=""` with an explicit in-code justification, reduced-motion-guarded hover | **Compliant** under V1.1 §26 — redundant with the adjacent `<h3>`. Frozen; not reopened |
| Catalog listing (`components/products/catalog-template-grid.tsx`) | **No images at all** | **Not yet applicable.** V1.1 §25 has nothing to bind to |
| Product detail (`app/[locale]/products/[slug]/page.tsx`) | **No product image at all** | **GAP for a future phase** — the single most valuable product-image surface does not exist yet |
| CTA band, Reach, footer mark, header mark | `next/image`, `alt=""`, `aria-hidden` where decorative | **Compliant** |

Other findings:

- **No live-Odoo hotlinking risk.** `lib/catalog/media-registry.ts` resolves every
  product image to a local `/images/products/*.png` asset via an
  override → group-default → family-default → generic-fallback chain. It never
  emits an Odoo URL, and it structurally cannot return a broken reference. This
  satisfies V1.1 §25 ("not hotlink live Odoo").
- **All images are stable, local, crawlable URLs** under `public/`.
- **Explicit dimensions or aspect ratios** are present on every image (`fill`
  within an aspect-ratio container, or explicit `width`/`height`).
- **No image sitemap exists.** Correct — V1.1 §27 makes it optional and
  beneficial-only, not a launch requirement, and there is currently no meaningful
  product image on any indexable page for it to describe.
- **No keyword-stuffed alt text found anywhere.**

**No modification was made.**

---

# CURRENT MOBILE CONTENT PARITY

**Classification: COMPLIANT** for the audited surfaces.

The site uses a single responsive DOM. There is no separate mobile template, no
`m.` host, no user-agent branch, and no breakpoint-conditional content fetch
anywhere in `app/` or `components/`. Layout differences are pure CSS.

| Surface | Parity assessment |
|---|---|
| Header / Navigation | Desktop nav and `MobileNavDrawer` are both rendered from the same server-fetched `productFamilies` / `serviceGroups` projections passed down as props. Same destinations, same labels |
| Hero | Single DOM; the decorative image column is `aria-hidden` at all widths. Headline, copy, CTAs, brand line identical |
| Price Strip / Product Showcase / Evaluation / Purchase Process / Reach | Single DOM, CSS-only re-layout; no content is dropped at any breakpoint |
| Product listing and detail | Single DOM, grid re-flow only |
| Services / Markets / Industries / About / Contact | Single DOM |
| Metadata, canonical, hreflang, index directives | Emitted once per request in `generateMetadata`, entirely independent of viewport — **cannot** diverge by breakpoint |
| Structured data | Emitted server-side once per page; no breakpoint branch |

**Interaction-gated content — assessed, not a violation.** Two disclosure
patterns exist: the contact-page FAQ `Accordion` and the mobile nav accordion.
Both render their full content into the **server-rendered DOM** and toggle only
the `hidden` attribute; neither fetches or constructs content on interaction.
V1.1 §41 permits exactly this ("exists in the DOM; remains accessible; is not
loaded only after interaction; remains semantically equivalent to desktop").

**No modification was made.**

---

# CURRENT CRAWLER GOVERNANCE

Before this phase: **none existed.** Verified by searching the whole repository —
`01-sources/SITEMAP_ROBOTS_SPEC.md` contains only three `User-agent: *` examples
and names no AI or search-specific crawler token; `DOCUMENT_AUDIT_REPORT.md`,
`PROJECT_OVERRIDES.md`, `DOCS_INDEX.md`, and `README.md` contain no reference to
GPTBot, OAI-SearchBot, ClaudeBot, Google-Extended, or any equivalent.

After this phase: `docs/discoverability/CRAWLER_POLICY_REGISTRY.md` exists as a
maintainable operational registry under frozen V1.1 policy, with
`LAST REVIEW DATE: 2026-09-08` and `NEXT ROUTINE REVIEW: quarterly`.

It is **documentation, not enforcement.** No robots group, no WAF rule, and no
verification mechanism was created.

---

# SEARCH CRAWLERS

**Class A — V1.1 §3.** V1.1 §4.1 states one Default Public-Page Direction for the
whole class, quoted verbatim: **"Allow intended public indexable pages."** That is
a frozen default direction, not an outstanding owner decision, and it is recorded
as such in the registry for `Googlebot`, `Bingbot`, `OAI-SearchBot`,
`Claude-SearchBot`, `PerplexityBot`, and `Applebot`.

Current implementation state: all six are allowed, but only by wildcard
inheritance — none is named. V1.1 §4 itself notes "This table is not assumed to
remain complete forever."

V1.1 §10 correction recorded: Perplexity's current documentation states
`PerplexityBot → follows robots.txt`. V1.1 §51 explicitly rejects the outdated
claim that it ignores robots.txt, and that outdated claim appears nowhere in this
repository.

---

# USER-DIRECTED RETRIEVAL AGENTS

**Class B — V1.1 §5.** Frozen rule: "User-directed fetchers are not automatically
equivalent to search crawlers or training crawlers."

| Agent | V1.1 stated direction | Resolvable today? |
|---|---|---|
| `Claude-User` | "Allow public pages **if retrieval is desired**" | **No** — conditional. Whether retrieval is desired is undocumented → OWNER DECISION REQUIRED |
| `Perplexity-User` | "Govern separately from index crawler policy" | **No** — procedural, not a decision → OWNER DECISION REQUIRED |

Current implementation: both inherit the wildcard `Allow: /`. That is an
accidental outcome, not a governed decision.

---

# TRAINING / MODEL-USE CONTROLS

**Class C — V1.1 §6.** Frozen rule:

```text
Search visibility decision
≠
training/model-use decision
```

`GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, and `CCBot` all
require an explicit, separate business decision. **None exists** anywhere in this
repository or in the imported specs.

Facts recorded from V1.1 §6 (not inferred):

- `Google-Extended` is a **robots product token, not a separate HTTP crawler
  user-agent**, and blocking it **does not** remove the site from Google Search.
- `Applebot-Extended` controls downstream use policy and **does not itself crawl
  pages**.
- V1.1 §7 explicitly declines to freeze behavioral assumptions for `CCBot` and
  other emerging crawlers without current vendor documentation.

Current implementation: `GPTBot`, `ClaudeBot`, and `CCBot` inherit the production
wildcard `Allow: /`; no `Google-Extended` or `Applebot-Extended` directive is
declared, so no training-use restriction is expressed. **No default was invented
in this phase.**

---

# OWNER POLICY DECISIONS

Consolidated in `# OWNER DECISIONS REQUIRED` below. Every one is recorded
literally as `OWNER DECISION REQUIRED` in the registry's own cells — never as a
guessed default.

---

# CRAWLER IDENTITY VERIFICATION

**Classification: NOTHING EXPLICIT EXISTS.**

Audited `wrangler.jsonc`, `workers/entry.ts`, `proxy.ts`, `lib/security/*`, and
`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`.

| Question | Finding |
|---|---|
| Does allowlisting trust User-Agent only? | **No allowlisting exists at all** — there is nothing to trust or verify |
| Provider/Cloudflare verified-bot mechanism in use? | No. `wrangler.jsonc` declares no bot, WAF, firewall, or managed-ruleset configuration |
| Any reverse-DNS or IP-range check? | None anywhere in the repository |
| Rate limiting? | Yes, but RFQ-scoped only (`RFQ_RATE_LIMITER`, 5/60s) — not crawler-related |
| Other request-boundary gates? | Turnstile on the RFQ path; honeypot; same-origin checks; baseline security headers. None is crawler-aware |
| Temporary Basic Auth gate | **Removed** at the production cutover (`workers/entry.ts` now delegates `fetch` directly to vinext) |

This is technically not a *violation* of V1.1 §8 — that rule forbids trusting a
UA claim, and no UA claim is currently trusted. It is an **absence of the
capability** V1.1 §8 requires once allowlisting is introduced.

**Future action timing:**

| Action | Phase |
|---|---|
| Document the no-UA-only-trust principle and registry `identity_verification` column | **NOW — FOUNDATION** (done in this phase) |
| Design verified-bot WAF handling; decide platform-verified-bot vs. reverse-DNS per provider; record real verification mechanisms per row | **PRE-STAGING** |
| Deploy WAF rules; tune; confirm no legitimate crawler receives 403/429/challenge | **PRODUCTION** |

**No WAF change was made.**

---

# ROBOTS VS SECURITY

**No violation found.** Audited for the common architecture mistake of treating
`robots.txt` as a protection mechanism for private data.

- `app/robots.ts` disallows `/api/` in production. This is crawl hygiene, and the
  API's actual protection is independent: Turnstile verification (fail-closed),
  rate limiting, same-origin checks, server-side validation, and honeypot — all
  enforced regardless of any robots directive.
- Catalog publication state is **not** protected by robots. An unpublished or
  editorially-incomplete template returns a genuine 404 from
  `getPublishedCatalogTemplateBySlug`, and published-vs-nonexistent render
  identically so publication state cannot be probed.
- Private RFQ data is never rendered on a public route.
- Repository documentation contains no claim that robots protects anything.
- The existing docs correctly describe the production preview protection as
  *structural* ("the Basic Auth gate rejects every request … before any HTML is
  ever served"), listing the `noindex` behavior as a separate, additional
  property — not as the protection.

Compliance with V1.1 §9/§47 and V1.0 §38: **PASS.** The one caveat is staging —
see `# STAGING INDEXABILITY`.

**No runtime change was made.**

---

# CRAWLER POLICY REGISTRY

**Created:** `docs/discoverability/CRAWLER_POLICY_REGISTRY.md`

- Searched first; no existing canonical registry was found anywhere.
- Fields per row: `provider`, `agent_token`, `purpose_class`, `allow_public`,
  `training_policy`, `official_reference`, `last_verified`, `robots_behavior`,
  `identity_verification`, `waf_status`, `implementation_status`, `notes`.
- Rows: all 13 required agents — `Googlebot`, `Bingbot`, `OAI-SearchBot`,
  `Claude-SearchBot`, `PerplexityBot`, `Applebot`, `Claude-User`,
  `Perplexity-User`, `GPTBot`, `ClaudeBot`, `Google-Extended`,
  `Applebot-Extended`, `CCBot` — organized by purpose class.
- **No additional rows were invented.** V1.1 §7 also names Meta and ByteDance
  crawler families and unspecified future agents; no row was created for them
  because neither spec provides a token, role, or robots behavior, and V1.1 §7
  forbids freezing assumptions without vendor documentation. This is recorded
  explicitly in the registry's §3.5.
- **No official reference URL was invented.** V1.1 §54 names the documentation
  *families* checked but records no URLs; every `official_reference` cell says
  `NOT RECORDED IN IMPORTED SPECS — record at next review` and names the family.
- **Every unresolved business policy is the literal string
  `OWNER DECISION REQUIRED`.**
- `LAST REVIEW DATE: 2026-09-08`, `NEXT ROUTINE REVIEW: quarterly`, plus V1.1
  §13's five event-driven triggers quoted verbatim and §48's ten-point review
  checklist.
- A §5 "Current enforcement reality" section records that nothing in the registry
  is enforced today, so no reader mistakes it for deployed policy.
- **No scheduled automation was created** (V1.1 §41 governance-ownership
  statement only).

---

# FACETED NAVIGATION

**Live filter parameters found.** `/{locale}/products` accepts five filter
dimensions via `lib/catalog/catalog-filters.ts#parseCatalogFilterParams`:

```
?family=  ?group=  ?form=  ?grade=  ?standard=
```

`/{locale}/products/{slug}` additionally accepts `?variant=`, which highlights and
scrolls to one row of that template's own spec table.

**Parameters confirmed absent:** `?sort=`, `?view=`, `?page=`. No sort or view
control exists anywhere in the application. A legacy `?category=` parameter is
still *linked* (see the defect below) but is parsed by nothing.

Per-pattern assessment:

| Pattern | Crawlable? | Indexable? | Canonical | Internal links | Sitemap |
|---|---|---|---|---|---|
| `/products` | Yes | **No** — `indexable: false` | Self | Header, footer, product-detail back-link | No |
| `?family=` / `?group=` / `?form=` / `?grade=` / `?standard=`, singly or combined | **Yes** — plain `<Link>` → real `<a href>`, zero client JS | No — inherits the listing shell's `indexable: false`; `generateMetadata` ignores `searchParams` | Clean `/{locale}/products` — **correct** | **Yes** — every facet option in `CatalogFilterBar` is a crawlable anchor | No |
| `?sort=` / `?view=` / `?page=` | N/A — do not exist | N/A | N/A | None | No |
| `?category=` (legacy) | **Yes** — linked from the global footer | No | Clean `/{locale}/products` | **Yes, on every page** | No |
| `/products/{slug}` | Yes | Per-entity `index_status` — real data, never hardcoded | Self | Listing grid, showcase cards | Yes, when `index_status='index'` |
| `/products/{slug}?variant=` | Yes | Inherits the detail page | Clean `/products/{slug}` — **correct** | Not linked externally | No |

**Assessment.** The canonical behavior is already correct: filter states resolve
to the clean listing canonical, and `?variant=` to the clean detail canonical.
Crawl *discovery*, however, is unbounded in principle — five dimensions of
crawlable anchors combine multiplicatively. Present risk is low only because the
listing shell is `indexable: false` and no filter URL has ever been submitted for
indexing. That protection is one boolean away from disappearing.

The `<Link>`-based, zero-JS filter design is **good** for accessibility and must
not be regressed into JavaScript-only controls to solve this. The fix belongs in
crawl-discovery policy, not in the interaction model.

**No filter was created, modified, or removed.**

---

# FACET INDEX POLICY

**Created:** `docs/discoverability/FACETED_NAVIGATION_URL_POLICY.md`

- Searched first: `docs/CATALOG_PUBLIC_ROUTES.md` §6/§13 owns filter
  *implementation* and the sitemap boundary but states no crawl/index policy;
  `DOCUMENT_AUDIT_REPORT.md` and the other `docs/CATALOG_*` files contain no facet
  crawl policy. Genuine gap. V1.1 §19 explicitly delegates authorship of this
  document.
- Freezes: a raw filter state is not an indexable SEO landing page by default;
  sort/view/tracking/`?variant=` parameters never create canonical identities; the
  seven V1.1 §20 conditions plus an Ahan Asa approval bar for an approved landing
  page; and the V1.1 §23 projection-downstream source-of-truth model.
- States explicitly, with reasoning, that **canonical alone is NOT sufficient
  crawl-explosion control** (V1.1 §21), and enumerates all five decisions §21
  requires per filter class — flagging question 5 (should bots discover links to
  it?) as the one this project has not answered.
- **Lists zero approved facet landing pages**, and says so explicitly. It is a
  policy document, not a page inventory.

---

# PRODUCT SOURCE-OF-TRUTH BOUNDARY

The V1.1 §23 frozen model —

```text
Odoo Product Master → Public Product Projection → Catalog / approved
landing-page policy → Indexable URLs
```

— **holds for every real catalog surface.** Verified:

- `/products` listing, `/products/{slug}` detail, the Header dropdowns, and the
  Homepage Product Showcase all read exclusively from DB_PUBLIC projections
  (`lib/catalog/editorial-repository.ts`, `lib/processing/public-repository.ts`).
- Homepage showcase candidates share the *literal same*
  `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` constant as the listing and detail
  reads, so a showcase card structurally cannot link to a template the detail
  route would 404 on.
- A dedicated test suite (`lib/catalog/homepage-source-isolation.test.ts`)
  enforces that the homepage, showcase, listing, and detail modules never import
  sample data.
- Sitemap inclusion requires published + approved + `index_status='index'`.

**One divergent taxonomy found — see the defect below.** `lib/content/catalog-sample.ts`
defines a four-value hardcoded category taxonomy (`long`/`flat`/`semi`/`raw`)
that is not derived from any projection, and `components/layout/SiteFooter.tsx`
links to it. This is the one place where a parallel, non-Odoo-derived product
taxonomy is currently exposed to crawlers.

**Product Showcase was not modified.**

---

# CORE WEB VITALS

**Current measurement state: ABSENT.** No CWV instrumentation of any kind exists.

| Checked | Result |
|---|---|
| `package.json` scripts | `dev`, `build`, `start`, `deploy`, `preview`, `cf-typegen`, `test`. **No** lighthouse, perf, or budget script |
| CI configuration | **No `.github/` directory exists.** No CI of any kind |
| `web-vitals` / `next/web-vitals` | Not a dependency; not imported anywhere |
| Lighthouse / PageSpeed tooling | Not present |
| Bundle-size or performance-budget check | Not present |
| RUM / field data collection | Not present. GTM is architecturally required but `NEXT_PUBLIC_GTM_ID` is unset and `getGtmId()` is called from nowhere |

**V1.1 §15 targets, verified by reading the spec rather than assumed:**

```text
LCP <= 2.5 seconds
INP <= 200 milliseconds
CLS <= 0.1
```

Measurement basis: **75th percentile (p75)**, with **mobile and desktop evaluated
separately** (V1.1 §15, §50).

**No claim of current production CWV compliance is made — no field evidence
exists in this repository, and no lab measurement was taken in this phase.** V1.1
§51 explicitly rejects "Passing Lighthouse alone proves production CWV"; this
report additionally cannot even claim a Lighthouse pass.

Architectural direction is favorable (server components, near-zero client JS,
`next/image` with explicit dimensions and responsive `sizes`, subset local
variable font, reduced-motion guards, zero-JS catalog filters), but favorable
architecture is not a measurement and is not recorded as one.

---

# CWV RELEASE POLICY

**Status: PRESENT — no new document created.**

`01-sources/PERFORMANCE_GUIDELINES.md` **already owns this concern completely**,
and its numbers are identical to V1.1's:

| V1.1 requirement | Existing owner |
|---|---|
| LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.10 | §3 table (plus stricter internal targets: 2.0s / 150ms / 0.05) |
| p75 basis | §3: "Measurements MUST be evaluated at the **75th percentile**" |
| Mobile and desktop separately | §3, reinforced by §4: "Desktop scores must not be used to hide poor mobile performance" |
| Field data authoritative where sufficient (V1.1 §16.1) | §56 "Lab vs Field Data": "When sufficient field data exists, field data is the primary indicator of real-world Core Web Vitals" |
| Lab as pre-launch/low-traffic proxy (V1.1 §16.2) | §56's Lab Data subsection — regression detection and development use |
| Regression investigation or documented exception (V1.1 §17) | §58 "Performance Regression Policy" + §59 "Performance Budget" |

`01-sources/SEO_STRATEGY.md` §13.1 states the same three thresholds at p75
independently.

Creating `CWV_RELEASE_GATE.md` would have produced a **duplicate authority tree**
for an already fully-owned concern — explicitly against this task's own
constraint. **Deliberately not created.** V1.1 §53's CWV item is a *production
dashboard*, which is production operations and out of scope here.

**No measured number was fabricated anywhere.**

---

# IMAGE DISCOVERY POLICY

**Status: PRESENT — no new document created.**

The concern is already distributed across existing authorities that, taken with
the newly imported V1.1 §24–§28, cover every V1.1 requirement:

| V1.1 §24–§28 requirement | Existing owner |
|---|---|
| Useful alt on meaningful images; `alt=""` on decorative | `01-sources/MEDIA_GUIDELINES.md` §13.1 alt decision table; `01-sources/IMAGE_OPTIMIZATION.md` §23.1 + §151 role table |
| No keyword-stuffed alt | `01-sources/MEDIA_GUIDELINES.md` §13.2: "Do not stuff keywords" |
| Stable crawlable URLs; no live-Odoo hotlinking | `01-sources/IMAGE_OPTIMIZATION.md` §19.2 (remote images allowed only under a narrow allowlist; "Essential evidence MUST NOT depend on an uncontrolled third-party URL") |
| Explicit dimensions / aspect ratio; responsive derivatives | `01-sources/IMAGE_OPTIMIZATION.md` §25 (CLS), §19.3, and the placement-role model |
| Correct HTML image markup; surrounding context | `01-sources/IMAGE_OPTIMIZATION.md` §400/§571 component patterns; `01-sources/MEDIA_GUIDELINES.md` §13 |
| Image sitemap optional / later | `01-sources/IMAGE_OPTIMIZATION.md` §1274 and §1312: image sitemap policy is conditional, "if implemented" / "if required by `SEO_STRATEGY.md`" |
| No blanket `ImageObject` requirement | V1.1 §24 and §50, now in-repo and frozen |

**Deliberately not created** to avoid a duplicate authority tree. The one genuine
image gap is architectural, not policy: product detail and catalog listing pages
render **no product imagery at all**, so there is nothing yet for V1.1 §25 to bind
to. That is recorded as a future-phase item, not a policy gap.

---

# E-E-A-T / CONTENT TRUST

**Current content architecture audit.** The site has **no** articles, guides,
market analysis, technical calculation pages, standards explanations, or case
studies. There is no blog, no editorial route, no author field, no reviewer field,
no methodology block, and no sources block anywhere in `app/`, `components/`, or
`lib/content/`. The only long-form-ish content is a short FAQ on the contact page.

**Consequently, no content class currently on the site requires authorship or
reviewer governance.** V1.1 §31 states this directly:

> Not every Homepage component needs an author byline.

**Confirmed explicitly: the Homepage components do NOT require bylines**, and none
was added. Nor does any product, service, market, industry, about, or contact page
in its present form.

Content classes that *would* require it, per V1.1 §31, if and when built:
technical buying guides, steel standards explanations, weight/calculation
articles, processing-method comparisons, market analysis, and project/case-study
content. `01-sources/CONTENT_STRATEGY.md` §14.2 and §12 already anticipate several
of these.

**No fake author, reviewer, credential, or expert identity was added anywhere.**

---

# WHO / HOW / WHY

**Status: PRESENT — no new document created.**

`01-sources/CONTENT_STRATEGY.md` already owns this framework substantively:

| V1.1 §30–§33 requirement | Existing owner |
|---|---|
| **WHO** — who created/reviewed | §15 content-record fields `author`, `technical_reviewer`, `commercial_reviewer`, `legal_review_required`; §14.2 "Author/reviewer attribution when appropriate" |
| **HOW** — how sourced/calculated/checked | §16.1 claim classes with per-class minimum approval ("Technical claim → Qualified technical reviewer and source"; "Market/price claim → Commercial owner, dated source, methodology, and expiry"); §16.2 six evidence states; §14.2 "Sources for time-sensitive or technical facts" |
| **WHY** — created to help the buyer | §115 "Do not publish long text merely to appear authoritative or satisfy an assumed SEO word count"; §19.1 one-intent-one-destination, no placeholder pages, no duplicated variants |
| Prohibition on fabricated authority | §21 prohibits "AI-generated facilities, employees, projects, certificates, or inventory presented as real" and "Fake dashboards, documents, signatures, stamps, or quotations"; §16.1 gates every client/project/performance claim behind written permission and evidence |
| No fake expert bylines | V1.1 §31 and §50, now in-repo and frozen |

Combined with the frozen V1.1 §29–§33 text now in the repository, the concern is
fully owned. Creating `CONTENT_TRUST_WHO_HOW_WHY_POLICY.md` would have duplicated
an existing authority tree. **Deliberately not created.**

---

# AI-ASSISTED CONTENT

**Status: PRESENT — governed by existing authority plus frozen V1.1 §33.**

`01-sources/CONTENT_STRATEGY.md` §19.1: "AI-assisted drafts require human fact,
originality, scope, and usefulness review." §21 prohibits presenting AI-generated
facilities, employees, projects, certificates, or inventory as real.
`01-sources/COPY_GUIDELINES.md` §513: "Do not present stock or AI-generated
imagery as operational evidence."

V1.1 §33, now frozen in-repo, completes the rule: factual responsibility remains
with Ahan Asa; technical claims must be checked; authorship must not falsely
attribute machine-written material to a person who did not review it; content must
still satisfy Who/How/Why; and AI use is itself neither a quality signal nor a
disqualifier.

The authorship-honesty clause is additionally restated as a hard prohibition in
the newly created `AGENT_FACING_CONTENT_SECURITY_POLICY.md` §2, because a
fabricated byline is simultaneously a content-trust failure and an agent-facing
trust manipulation.

---

# AGENT-FACING CONTENT SECURITY

**Audit result: NO VIOLATIONS FOUND.**

A repository-wide search across `app/`, `components/`, `lib/`, `public/`, and
`styles/` for injection phrasing and agent-directed content —
"ignore previous/prior instructions", "you are an AI", "as an AI", assistant-name
directives, "system prompt", and `assistant:` role markers — returned **zero
matches**.

Every hidden or visually-suppressed element was examined and classified.
**All fall into the legitimate accessibility category:**

| Pattern | Instances | Classification |
|---|---|---|
| `aria-hidden="true"` on decorative icons, hairlines, gradient overlays, step numerals, connector rules | ~30 | **Legitimate.** Prevents duplicate/meaningless screen-reader announcement |
| `sr-only` | 1 — the catalog grid's `aria-live="polite"` result-count announcement | **Legitimate.** Standard live-region pattern; announces a real, visible count |
| `hidden={!open}` on accordion and disclosure panels | Several | **Legitimate.** Content is server-rendered into the DOM; only visibility toggles |
| `alt=""` | All decorative/redundant images | **Legitimate.** Required by V1.1 §26 and `01-sources/MEDIA_GUIDELINES.md` §13.1 |
| `opacity-0` on hover-reveal arrow icons | 3 | **Legitimate.** Purely ornamental affordance; icons carry no text |
| `dangerouslySetInnerHTML` | 1 — `components/seo/JsonLd.tsx` | **Legitimate and hardened.** Serializes project-authored schema through `lib/seo/json-ld.ts`, escaping `<`, U+2028, U+2029 |

**No ordinary accessibility pattern was flagged as a security issue**, and no
machine-only content layer exists. The site presents the same public truth to
humans, search engines, and AI retrieval systems.

**Created:** `docs/discoverability/AGENT_FACING_CONTENT_SECURITY_POLICY.md` —
searched first and confirmed genuinely unowned: `01-sources/SECURITY_GUIDELINES.md`
covers input sanitization for downloads, SVG, Markdown/MDX, and CMS blocks (§11.2)
but contains **no** agent-facing, prompt-injection, hidden-text, or cloaking
provision; `01-sources/SEO_STRATEGY.md` contains no hidden-text or cloaking
section either. V1.1 §53 item 11 explicitly names this artifact. It forbids hidden
agent instructions, machine-only prompts, CSS-hidden directives, malicious
metadata prompts, and agent manipulation unrelated to visible meaning; carefully
enumerates the *permitted* accessibility patterns so the policy cannot be misread
into damaging accessibility; and freezes V1.1 §44's same-public-truth rule.

---

# UGC / UNTRUSTED CONTENT

**NOT CURRENTLY APPLICABLE.**

The site publicly renders no user-generated content, no comments, no reviews, no
supplier-submitted descriptions, no uploaded rich text, no imported external
content, and no third-party embeds. There is no rich-text or Markdown rendering
path on any public route.

The only `dangerouslySetInnerHTML` is the hardened JSON-LD serializer described
above — project-authored data, not untrusted input.

RFQ form submissions are inbound only: validated server-side, persisted to D1, and
forwarded to Odoo. **They are never rendered back onto a public page.**

No sanitization runtime was implemented in this phase. Section 4 of the new agent
content-security policy carries the V1.1 §36/§38 controls forward for whenever an
untrusted-content surface is first proposed; building it is future security work.

---

# MOBILE-FIRST INDEXING

**Status: PRESENT — no new policy document created.**

`01-sources/SEO_STRATEGY.md` §13 already states the parity rule directly:

> نسخه موبایل باید همان محتوای اصلی، لینک‌های مهم، Metadata و Structured Data
> نسخه Desktop را داشته باشد.
>
> *(The mobile version must have the same primary content, important links,
> Metadata, and Structured Data as the desktop version.)*

`01-sources/SEO_QA_CHECKLIST.md` LNK-06 adds the navigation-parity check
("Mobile and desktop navigation expose the same essential crawlable
destinations"). Together with the newly frozen V1.1 §39–§43, the concern is fully
owned, so `MOBILE_CONTENT_PARITY_POLICY.md` was **deliberately not created** —
it would have been a duplicate authority tree.

Implementation compliance is **COMPLIANT**; see `# CURRENT MOBILE CONTENT PARITY`.
The single-responsive-DOM architecture makes the required parity structural rather
than something that must be manually maintained per breakpoint.

---

# MOBILE / DESKTOP METADATA PARITY

**COMPLIANT — structurally guaranteed.**

Canonical, hreflang, `x-default`, title, meta description, Open Graph, robots
directives, and JSON-LD are all produced in `generateMetadata` / server components
per request. **None of them reads a viewport, breakpoint, media query, or
user-agent.** There is no code path by which they could diverge between mobile and
desktop for the same canonical URL, which is exactly V1.1 §43's requirement.

---

# STAGING INDEXABILITY

**Classification: PARTIAL.**

Current mechanism, traced through `wrangler.jsonc` (`env.staging` sets
`APP_ENV: "staging"`) and `app/robots.ts`:

| Control | Present? | Note |
|---|---|---|
| Environment-specific robots | **Yes** — non-production emits `User-agent: * / Disallow: /` | The primary control |
| Per-page `noindex` meta | **Partially** — every page except product detail is `indexable: false`; product detail is `index` when its editorial `index_status='index'` | Real per-entity data, correctly not hardcoded |
| Canonical never points at staging | **Yes** — canonicals derive from `APP_BASE_URL` per environment; production docs confirm canonicals pointed at `www.ahanassa.com` even from the preview host |
| `X-Robots-Tag` response header | **No** — not set anywhere in the codebase. Prior deployment notes observed one on the Basic-Auth-era preview; nothing in the current tree emits it |
| Authentication / access control | **No** — the temporary Basic Auth gate was **removed** at the production cutover (`workers/entry.ts`), and no Cloudflare Access policy is declared in this repository |

**Two honest gaps recorded:**

1. **Staging protection is now robots-only.** With Basic Auth removed and no
   Access policy in the repository, a staging deployment is publicly reachable and
   relies on voluntary crawler compliance. Per V1.1 §9/§47, that is crawler
   policy, **not** security. V1.0 §39 permits "noindex; environment-specific
   robots; access control where appropriate" — the first two are present, the
   third is not.
2. **A latent directive conflict.** On staging, robots.txt disallows crawling
   site-wide, while a product detail page with `index_status='index'` would emit
   `index, follow`. A page that is crawl-disallowed cannot have its `noindex` read,
   so a URL-only index entry becomes possible if such a URL is ever discovered
   externally. This is currently theoretical — staging has zero published
   templates — but it is a real ordering hazard worth closing with an
   environment-level `X-Robots-Tag: noindex` before any staging content is
   published.

**No staging configuration was changed in this phase.**

---

# OBSERVABILITY

**Classification: ABSENT for search/crawler purposes.**

| Signal required by V1.1 §45 / V1.0 §44 | Present? |
|---|---|
| Crawler UA claim | No |
| Requested path | No (per-request logging not implemented) |
| Status code | No |
| WAF action | No — no WAF rules exist |
| Rate-limit event | Partially — RFQ rate limiting exists but is not exposed as crawler observability |
| Cache / origin behavior | No |
| Search referrer | No |
| AI-search referrer (`utm_source=chatgpt.com`, V1.0 §40) | No — no analytics is installed at all |
| Crawler identity verification outcome | No — no verification mechanism exists |

What *does* exist: targeted `console.error` tags for projection read failures
(`HEADER_PRODUCT_FAMILIES_READ_ERROR`, `HEADER_SERVICE_GROUPS_READ_ERROR`,
`HOMEPAGE_PRODUCT_SHOWCASE_READ_ERROR`), plus durable RFQ integration audit state
in D1 (`integration_attempts`, `dead_letter_records`). Both are operational
correctness signals, not search observability.

GTM is architecturally required (`PROJECT_OVERRIDES.md` §5) but the container ID
is unset and `getGtmId()` is called from nowhere, so no analytics runs.

**Forward-looking note only. No production dashboard, log pipeline, analytics
property, or external integration was created.** V1.0 §44's standard applies: "A
crawler policy that exists only on paper is insufficient" — that is a
pre-staging/production obligation, recorded below.

---

# CURRENT COMPLIANCE MATRIX

| V1.1 gate | Status | Basis |
|---|---|---|
| Crawler taxonomy (search / retrieval / training / unknown) | **PASS** | Frozen in imported V1.1 §3 and applied as the registry's structure |
| Crawler registry documented and recently verified | **PASS** | Created 2026-09-08 with review date and cadence |
| Search vs user-retrieval vs training separation | **PARTIAL** | Documented and structurally separated in the registry; **not implemented** — robots.txt has a single wildcard group for all three classes |
| No User-Agent-only WAF trust | **PASS (vacuously)** | No allowlisting exists, so no UA claim is trusted. The verification *capability* is absent — pre-staging item |
| robots.txt / security separation | **PASS** | No repository code or doc treats robots as protection; real controls are independent |
| CWV policy documented | **PASS** | `01-sources/PERFORMANCE_GUIDELINES.md` §3/§56/§58 — thresholds identical to V1.1 |
| CWV measured / instrumented | **FAIL** | No Lighthouse, no web-vitals, no CI, no field data. No compliance claim made |
| Facet crawl/index policy documented | **PASS** | Created this phase |
| Raw sort/filter states not indexable by default | **PASS** | Filter states canonicalize to the clean listing URL; listing is `indexable: false`; no filter URL is ever in the sitemap |
| Facet crawl-discovery bounded | **PARTIAL** | Crawlable anchors across five combinable dimensions; V1.1 §21 question 5 unanswered. Currently masked by site-wide noindex |
| Product source-of-truth boundary | **PARTIAL** | Holds for every real catalog surface; **one divergent sample taxonomy is linked from the global footer** — see findings |
| Image discoverability policy | **PASS** | Owned by `01-sources/IMAGE_OPTIMIZATION.md` + `MEDIA_GUIDELINES.md` + V1.1 §24–§28 |
| Product imagery crawlable with appropriate alt | **NOT YET APPLICABLE** | Catalog listing and detail pages render no product imagery yet |
| No blanket `ImageObject`; no decorative keyword alt | **PASS** | No `ImageObject` anywhere; no keyword-stuffed alt found |
| E-E-A-T / content-trust governance | **PASS** | Owned by `01-sources/CONTENT_STRATEGY.md` §14.2/§15/§16/§19.1/§21 + V1.1 §29–§33 |
| Who / How / Why for substantive content | **NOT YET APPLICABLE** | No substantive editorial content exists yet. Framework is in place for when it does |
| No fake author/expert identities | **PASS** | None exist; none added |
| Agent content security — no hidden agent instructions | **PASS** | Zero violations found; policy created |
| UGC / untrusted content sanitization | **NOT CURRENTLY APPLICABLE** | No UGC or third-party embed surface exists |
| Mobile primary-content parity | **PASS** | Single responsive DOM; no breakpoint-conditional content |
| Mobile / desktop metadata parity | **PASS** | Metadata is viewport-independent by construction |
| Structured data honest and visible-content-backed | **PARTIAL** | All emitted schema is real and visible-backed; **Organization/WebSite are emitted only on a noindex page** — see findings |
| Canonical / hreflang / x-default | **PASS** | Reciprocal, publication-aware, no cross-language canonicalization, `fa` 308-normalized |
| Sitemap contains only canonical indexable URLs | **PASS** | Triple-gated projection query; no staging, filter, or duplicate URLs |
| Staging not indexable | **PARTIAL** | Robots-only; no access control since Basic Auth removal; latent robots-vs-noindex ordering conflict |
| Observability | **FAIL** | No crawler, search-referral, WAF, or AI-referral observability of any kind |
| GPTBot / ClaudeBot / Google-Extended / Applebot-Extended / CCBot policy | **OWNER DECISION REQUIRED** | No business decision documented anywhere; none inferred |
| `Claude-User` / `Perplexity-User` policy | **OWNER DECISION REQUIRED** | V1.1 gives conditional/procedural direction only |
| Frozen Homepage components not reopened | **PASS** | All seven untouched |

---

# NOW FOUNDATION

Completed in this phase.

1. V1.1 imported byte-for-byte as the frozen authority.
2. `docs/discoverability/` established as the canonical governance home.
3. Crawler policy registry created — 13 rows, purpose-classified, dated, with
   review cadence and event triggers.
4. Faceted navigation URL policy created — frozen defaults plus the approval bar.
5. Agent-facing content security policy created — prohibitions, the
   accessibility-vs-manipulation distinction, and a pre-publication checklist.
6. Directory index created, recording both what exists and which concerns are
   deliberately owned elsewhere.
7. Full read-only audit recorded in this report.
8. Owner decisions enumerated without any of them being resolved by inference.

---

# NEXT — HOMEPAGE WORK MAY CONTINUE

Nothing in this audit blocks the remaining Homepage component work.

- No frozen component requires a discoverability-driven change.
- No cross-cutting runtime guard is missing in a way that would make further
  Homepage work unsafe or produce rework.
- Both defects found are outside the frozen Homepage component set
  (`SiteFooter.tsx` and JSON-LD placement) and are independently fixable at any
  time.
- Any *new* Homepage component should simply satisfy the existing rules already in
  force: server-rendered primary content, semantic HTML, mobile parity, honest
  structured data, no hidden agent-directed text, and no fabricated facts.

---

# PRE-STAGING ITEMS

Derived from actual findings, not a generic checklist.

1. **Resolve the training-crawler owner decisions** (GPTBot, ClaudeBot,
   Google-Extended, Applebot-Extended, CCBot) and the user-directed retrieval
   decisions (Claude-User, Perplexity-User). Blocks item 2.
2. **Author the production robots policy** — replace the wildcard-only rule with
   explicit per-class groups, so no training crawler inherits a policy accidentally
   (V1.0 §5, §55 item 4).
3. **Answer V1.1 §21 question 5 for catalog facets** — decide whether crawlers
   should discover the five-dimension filter link space, and by what mechanism.
   Must be settled *before* `/products`'s `indexable` flag is ever flipped to true.
4. **Fix the footer sample-taxonomy links** (defect 1 below) — either wire them to
   real projection-derived filter values or remove them.
5. **Move `Organization`/`WebSite` structured data to a surface that will actually
   be indexed** (defect 2 below), or resolve the homepage's own index posture.
6. **Close the staging indexability gap** — add environment-level
   `X-Robots-Tag: noindex` and/or restore an access control, so staging protection
   does not rest on voluntary robots compliance alone.
7. **Design verified-bot WAF handling** — decide the verification mechanism per
   provider and record it in the registry's `identity_verification` column. Design
   only; no deployment.
8. **Crawler smoke test** — confirm `robots.txt` returns 200 and that legitimate
   crawlers receive no 403/429/challenge (V1.0 §4, §8).
9. **Sitemap validation** against the real published set.
10. **Canonical / hreflang regression test** — lock in the reciprocal, publication-aware
    behavior so a future change cannot silently break it.
11. **Structured-data validation** for the three emitted types.
12. **Lab CWV baseline** — mobile and desktop separately, as the pre-launch proxy
    V1.1 §16.2 permits. There is currently no baseline of any kind.
13. **Search-metadata regression tests** — title, description, canonical, robots
    directives, and Open Graph per route.

---

# STAGING VALIDATION ITEMS

1. Verify staging serves `Disallow: /` and, once added, the `X-Robots-Tag` header.
2. Verify no staging URL appears in any sitemap and no canonical points at a
   staging host.
3. Verify the new per-class robots policy renders exactly as authored.
4. Exercise the crawler smoke test against the staging host.
5. Re-run the canonical/hreflang and structured-data checks against real staging
   data rather than a local fixture.
6. Confirm mobile and desktop return identical primary content, metadata, and
   structured data for the same URL.
7. Confirm no facet URL is reachable in a sitemap or an index directive.

---

# PRODUCTION / POST-LAUNCH ITEMS

Requires real production evidence; deliberately kept separate from the pre-staging
list.

1. **Field CWV at p75**, mobile and desktop separately — the only authoritative
   CWV measurement (V1.1 §16.1).
2. **Crawler traffic monitoring** — identity claim, path, status, WAF action,
   rate-limit event, cache/origin, verification outcome (V1.1 §45).
3. **Google Search Console** — indexing, coverage, crawl errors, sitemap health,
   queries, locale performance, manual actions (V1.0 §43).
4. **Bing Webmaster Tools** (V1.1 §46).
5. **AI/search referral analysis**, including `utm_source=chatgpt.com` classified
   as its own source rather than generic referral (V1.0 §40–§42).
6. **Verified crawler behavior confirmation** — that legitimate bots are not being
   challenged or throttled.
7. **Quarterly crawler registry review** per V1.1 §13/§48, plus the five
   event-driven triggers.
8. **Production WAF tuning** once rules exist.
9. **IndexNow evaluation** — later, only if it materially improves timely
   discovery (V1.1 §46).

---

# OWNER DECISIONS REQUIRED

Every item below is genuinely undocumented. **None was resolved, inferred, or
given a plausible default.** Search-discovery policy is kept strictly separate
from training/model-use policy throughout, because they are different questions
with potentially different answers.

## Training / model-use policy (class C — V1.1 §6)

1. **`GPTBot`** — allow or block OpenAI training-related crawling? Currently
   inherits the wildcard `Allow: /` by accident, which V1.0 §5 explicitly warns
   against.
2. **`ClaudeBot`** — allow or block Anthropic model-development collection?
   Currently inherits the wildcard.
3. **`Google-Extended`** — permit or restrict use of Google-crawled Ahan Asa
   content for Gemini training and certain grounding use? *Note for the decision:
   V1.1 §6 records that blocking it does not remove the site from Google Search.*
4. **`Applebot-Extended`** — permit or restrict use of Applebot-crawled content
   for Apple foundation-model training?
5. **`CCBot` / Common Crawl** — permit or block? V1.1 §7 declines to characterize
   it without current vendor documentation, so it needs both verification and a
   decision.
6. **Emerging training crawlers generally** — is there a standing default
   position for a newly discovered training crawler between quarterly reviews, or
   must each be decided individually?

## User-directed retrieval policy (class B — V1.1 §5)

7. **`Claude-User`** — is user-directed retrieval of Ahan Asa public pages
   desired? V1.1's direction is conditional on exactly this.
8. **`Perplexity-User`** — same question; V1.1 says only "govern separately."

## Search-discovery policy (class A)

9. **`Bingbot` training/model-use** — no Microsoft training-control token is
   recorded in V1.1 or V1.0. Is a separate position needed for Microsoft's
   model use, distinct from Bing search indexing?
10. **`PerplexityBot` training/model-use** — same gap for Perplexity.

*(Class A search access itself is already resolved by V1.1 §4.1's frozen "Allow
intended public indexable pages" direction and is not an open decision.)*

## Site posture

11. **Homepage index posture** — the homepage is `indexable: false` pending
    content-owner review of copy classified `draft`. When does it become
    indexable? This gates defect 2 below and much of the pre-staging list.
12. **Catalog listing index posture** — when does `/products` become indexable?
    This is the trigger that makes the facet crawl-discovery question urgent.
13. **Staging access control** — restore an authentication gate for staging, or
    accept robots-only protection with an explicit acknowledgement that it is not
    a security boundary?
14. **Official crawler documentation URLs** — the registry's `official_reference`
    cells need real vendor URLs recorded at the first review. None was invented.

---

# GEO-G1 BOUNDARY

**Not required before further Homepage work.** Defined here only so the scope is
unambiguous whenever it is authorized.

GEO-G1 would be the first *implementation* phase, and its natural boundary is:

- `app/robots.ts` — replace the wildcard-only policy with explicit per-purpose-class
  groups, once decisions 1–10 above exist. Plus a test file asserting the emitted
  policy per environment.
- `components/layout/SiteFooter.tsx` and `lib/content/catalog-sample.ts` — remove
  or correctly rewire the sample-taxonomy category links (defect 1).
- Structured-data placement — relocate `Organization`/`WebSite` emission so it
  reaches an indexable surface (defect 2), most plausibly the locale layout.
- An environment-level `X-Robots-Tag` for non-production, in `lib/security/headers.ts`
  or `proxy.ts`.
- Metadata/structured-data regression tests under the existing `node --test`
  harness.

**Explicitly out of GEO-G1:** any frozen Homepage component, any Cloudflare WAF or
DNS change, any migration, any deployment, and any analytics or dashboard
provisioning.

**Nothing from the above was implemented in this phase.**

---

# HOMEPAGE CONTINUATION DECISION

**Answer: A — NO. The documentation/governance foundation is sufficient; Homepage
work may continue.**

Reasoning:

- No discoverability requirement forces a visible change to any frozen component;
  every V1.1 image, structured-data, and CTA rule that touches them is already
  satisfied.
- The two genuine defects are in the global footer and in JSON-LD placement —
  neither is a frozen component, neither is on the critical path of building the
  next Homepage section, and neither will be made worse by continuing.
- The one architecturally significant open risk (facet crawl discovery) is gated
  behind the `/products` index posture, not behind Homepage work.
- No cross-cutting runtime safety guard is missing in a way that would cause
  rework if Homepage components continue to be built to the existing standards.

Answer B was considered and rejected: the candidate guard — an environment-level
`X-Robots-Tag` — is a genuine gap, but it is a *staging release* concern, not a
precondition for authoring another Homepage component, and treating it as a
blocker would stop useful work for no risk reduction.

Answer C was rejected: no material architecture defect blocks further Homepage
work.

---

# GENUINE DEFECTS FOUND

Surfaced separately rather than left inside a table.

## Defect 1 — Global footer links to a stale sample-data taxonomy on every page

**Severity: real, currently masked, sitewide. Pre-staging.**

`components/layout/SiteFooter.tsx` imports `categories` from
`lib/content/catalog-sample.ts` — explicitly marked "SAMPLE product-catalog data —
structural placeholder only" — and renders four links of the form:

```
/{locale}/products?category=long | flat | semi | raw
```

Three independent problems:

1. **Dead-end links.** The real filter parser
   (`lib/catalog/catalog-filters.ts#parseCatalogFilterParams`) reads only
   `family`, `group`, `form`, `grade`, and `standard`. `?category=` is silently
   ignored, so all four links resolve to the **unfiltered** `/products` listing
   while presenting themselves as category navigation.
2. **A parallel non-projection taxonomy.** `long`/`flat`/`semi`/`raw` is a
   hardcoded taxonomy derived from no projection and from no Odoo classification.
   This is exactly what V1.1 §23 prohibits — "Do not create an SEO-only product
   taxonomy that diverges from Odoo/public commercial truth" — and it is the only
   place in the codebase where such a taxonomy is exposed to crawlers.
3. **Localization defect.** The labels are hardcoded Persian and render unchanged
   on `/en` and `/ar` pages.

Because this is the **global footer**, it is the most-repeated internal link
pattern on the site, present on every page of the live production domain. It is
currently masked by the site-wide `indexable: false` posture, but the links are
real, crawlable, and followed.

`SiteFooter.tsx` is **not** a frozen Homepage component, so this is fixable
without reopening any freeze. It was deliberately not fixed in this read-only
phase.

*Related minor staleness:* `lib/content/catalog-sample.ts`'s own header claims
"every catalog route built on this data … carries a visible 'sample data' notice
(see `app/[locale]/products/*`)". That notice no longer exists — the catalog
routes were rewritten onto real DB_PUBLIC data. The comment is stale, not harmful.

## Defect 2 — Organization and WebSite structured data are emitted only on a noindex page

**Severity: moderate. Pre-staging.**

`organizationSchema()` and `websiteSchema()` are emitted from exactly one place:
`app/[locale]/page.tsx`, the homepage — which is currently `indexable: false`.

V1.0 §21 requires `Organization` structured data at "the appropriate site/global
layer", and V1.0 §30 makes entity consistency a gate. Today the *only* pages that
can actually be indexed are product detail pages, and those emit **only**
`BreadcrumbList` — so a crawler indexing the live site currently receives **no
Organization entity at all**.

The schema content itself is correct and honest — real verified name, address, and
the same phone number the Header renders, with no fabricated fields. The defect is
purely one of **placement**: global-layer schema is attached to a page-level,
currently-unindexed surface.

The natural fix is to emit it from `app/[locale]/layout.tsx` so it accompanies
every page. That is a runtime change and was deliberately not made here.

## Non-defects, explicitly cleared

- Filter states canonicalizing to the clean listing URL — **already correct**.
- `alt=""` throughout the Homepage — **correct** under V1.1 §26; not a violation.
- Absence of `Product`/`Offer`/`SearchAction`/`HowTo` schema — **deliberately
  correct** under V1.0 §20/§22/§24/§25.
- All `sr-only`/`aria-hidden` usage — **legitimate accessibility**, not agent
  manipulation.
- Empty sitemap output in environments with no published templates — **expected
  correct output**, already documented.

---

# FILES CREATED

| File | Reason |
|---|---|
| `docs/discoverability/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md` | The frozen V1.1 authority, imported byte-for-byte |
| `docs/discoverability/CRAWLER_POLICY_REGISTRY.md` | No crawler registry existed anywhere; V1.1 §12/§14 require a maintainable inventory held separately from frozen policy |
| `docs/discoverability/FACETED_NAVIGATION_URL_POLICY.md` | No facet crawl/index policy existed; V1.1 §19 explicitly delegates authorship, and crawlable five-dimension filter links are already live |
| `docs/discoverability/AGENT_FACING_CONTENT_SECURITY_POLICY.md` | No repository document covered agent-facing content security; `01-sources/SECURITY_GUIDELINES.md` covers input sanitization only. V1.1 §53 item 11 names this artifact |
| `docs/discoverability/README.md` | More than one governance file was created; indexes them by category and records which concerns are deliberately owned elsewhere |
| `docs/discoverability/AI_SEARCH_GEO_G0_FOUNDATION_AUDIT_REPORT.md` | This report |

## Candidate artifacts deliberately NOT created

| Candidate | Existing owner that made it a duplicate |
|---|---|
| `CWV_RELEASE_GATE.md` | `01-sources/PERFORMANCE_GUIDELINES.md` §3 (identical thresholds, p75, mobile/desktop separation), §56 (lab vs field authority), §58 (regression policy) |
| `IMAGE_DISCOVERABILITY_POLICY.md` | `01-sources/IMAGE_OPTIMIZATION.md` §19.2/§23.1/§25 + `01-sources/MEDIA_GUIDELINES.md` §13, with V1.1 §24–§28 now frozen in-repo |
| `CONTENT_TRUST_WHO_HOW_WHY_POLICY.md` | `01-sources/CONTENT_STRATEGY.md` §14.2/§15/§16/§19.1/§21, with V1.1 §29–§33 now frozen in-repo |
| `MOBILE_CONTENT_PARITY_POLICY.md` | `01-sources/SEO_STRATEGY.md` §13 (states the parity rule directly) + `01-sources/SEO_QA_CHECKLIST.md` LNK-06, with V1.1 §39–§43 now frozen in-repo |

# FILES MODIFIED

**None.** No pre-existing file in the repository was edited, moved, or deleted.

`tsconfig.tsbuildinfo` was incidentally regenerated by running `npx tsc --noEmit`
and `npm run build` for verification; it was restored to its committed state, and
the working tree is clean.

---

# SPEC IMPORT COMMIT

```
85dfa5f0a4185af22811ab8feb350e4af535728e
docs: import AI Search GEO architecture V1.1
 docs/discoverability/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md | 1045 +
 1 file changed, 1045 insertions(+)
```

# GOVERNANCE COMMIT

```
2b4b7b357f40bf155e253d43cf731c70156da482
docs: establish AI search GEO governance baseline
 docs/discoverability/AGENT_FACING_CONTENT_SECURITY_POLICY.md | 167 +
 docs/discoverability/CRAWLER_POLICY_REGISTRY.md              | 225 +
 docs/discoverability/FACETED_NAVIGATION_URL_POLICY.md        | 238 +
 docs/discoverability/README.md                               |  81 +
 4 files changed, 711 insertions(+)
```

Neither commit was amended.

---

# TESTS

```
npm test

ℹ tests 1034
ℹ suites 0
ℹ pass 1034
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6476.978167
```

**1034 passed, 0 failed — identical to the pre-existing baseline**, as required
for a phase that touches no runtime code.

# TSC

```
npx tsc --noEmit
exit code 0 — no diagnostics
```

# BUILD

```
npm run build

✓ 2010 modules transformed (client)
✓ 228 modules transformed (ssr)
Build complete.
```

Routes emitted: `/:locale`, `/:locale/about`, `/:locale/contact`,
`/:locale/industries`, `/:locale/markets`, `/:locale/products`,
`/:locale/products/:slug`, `/:locale/request`, `/:locale/services`,
`/api/hello`, `/api/rfqs`. Unchanged from baseline. No errors, no warnings.

---

# GIT

```
Branch:   worktree-geo-g0
Base:     04667f043af298fbf60d2d2a3cd0f0d21d6e0b65

04667f0  docs: freeze Purchase Process V2.0        (base)
85dfa5f  docs: import AI Search GEO architecture V1.1
2b4b7b3  docs: establish AI search GEO governance baseline
<this>   docs: record AI search GEO foundation audit

git status --short: clean
Pushed: NO
```

Three commits, in the required order, none amended. All six changed paths are
under `docs/discoverability/`.

---

# PRODUCTION SAFETY

| Action | Status |
|---|---|
| Frozen Homepage component modified | **NO** — all seven untouched |
| Any runtime code modified | **NO** |
| Any test file modified | **NO** |
| Any config file modified | **NO** — `wrangler.jsonc`, `package.json`, `tsconfig.json`, `vite.config.ts`, `next.config.ts`, `proxy.ts` all untouched |
| `app/robots.ts` modified | **NO** |
| `app/sitemap.ts` modified | **NO** |
| `migrations_public/0010_homepage_eligibility.sql` | **NOT touched, NOT applied** — left exactly as found |
| Any migration applied (local or remote) | **NO** |
| Cloudflare WAF / firewall / bot rules changed | **NO** — none exist in this repository |
| DNS changed | **NO** |
| Deployed / pushed | **NO** |
| Search Console / Bing Webmaster connected | **NO** |
| IndexNow enabled | **NO** |
| Production dashboard created | **NO** |
| Scheduled automation created | **NO** |
| Downloads source files modified | **NO** — read only; hashes re-verified unchanged |
| `01-sources/`, `logo/`, `design-reference/` modified | **NO** |
| Write-isolation guard encountered or bypassed | **No guard was encountered; nothing was bypassed** |
| Fabricated facts, URLs, measurements, or policies | **NONE.** Every unresolved business decision is recorded literally as OWNER DECISION REQUIRED |

---

# NEXT PHASE

1. **Owner reviews the 14 decisions** in `# OWNER DECISIONS REQUIRED`, keeping
   search-discovery policy separate from training/model-use policy.
2. **Homepage component work continues** — unblocked; no GEO-G1 prerequisite.
3. **GEO-G1** (when authorized) implements the narrow boundary defined above:
   per-class robots policy, the two defect fixes, an environment-level
   `X-Robots-Tag`, and metadata/structured-data regression tests. No frozen
   component, no WAF, no deploy.
4. **Pre-staging gate** works through the 13 items listed above before any staging
   release.
5. **First quarterly crawler registry review** is due by **2026-12-08**, or sooner
   on any of V1.1 §13's five event triggers.
