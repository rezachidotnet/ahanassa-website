# Go-Live Readiness — Ahan Asa Website

**Status:** Canonical readiness record for the pre-`ahanassa.com`-cutover phase (this task). Covers CONTENT + SEO + SECURITY + PERFORMANCE + PRODUCTION PUBLICATION + CUTOVER READINESS.
**Date:** 2026-09-01/02.
**Scope boundary:** This task did NOT change DNS, did NOT touch Vercel, did NOT remove the legacy live Website, did NOT perform the final domain cutover, did NOT implement Pricing or Customer Authentication/Portal, and did NOT modify Odoo. See `docs/GO_LIVE_CUTOVER_RUNBOOK.md` for the separate, not-yet-executed Stage 2 plan.
**Branch:** `chore/go-live-readiness`, starting ancestor `f980781` (Task 15, "chore: validate multi-item RFQ on Cloudflare").

---

## 1. Starting state

- Branch: `chore/go-live-readiness`.
- Ancestor `f980781` confirmed included (fast-forward-corrected at task start; see git log).
- Working tree: clean at task start.

## 2. Documents read

`CLAUDE.md`, `PROJECT_OVERRIDES.md`, `DOCS_INDEX.md`, `DOCUMENT_AUDIT_REPORT.md`, `README.md`, `01-sources/DO_NOT_CHANGE.md` §1–2, and all 8 launch-critical docs: `docs/CATALOG_EDITORIAL_PUBLICATION.md`, `docs/CATALOG_PUBLIC_ROUTES.md`, `docs/CATALOG_EDITORIAL_OPERATIONS.md`, `docs/CATALOG_SYNC_OPERATIONS.md`, `docs/CATALOG_RFQ_INTEGRATION.md`, `docs/RFQ_MULTI_ITEM_FORM.md` (via prior session context), `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`, `docs/ODOO_RFQ_API_INTEGRATION.md`.

## 3. No new application architecture introduced

Per this task's own critical rule, no new architecture was introduced. The only code changes are: (a) a genuine SEO defect fix (hreflang, §9 below) using entirely pre-existing tables/functions, and (b) real production Catalog editorial content written through the already-existing `scripts/catalog-editorial.ts` operator tool (DAR-038) — no new tool, migration, or write path was created.

## 4. Stage A — Production Catalog editorial inventory (before this task)

All 13 real templates / 237 real variants, live-queried directly against production `DB_PUBLIC` at task start:

| Template XID | Name | Variants | Family | FA editorial state | Publication | Index | Launch-ready? |
|---|---|---:|---|---|---|---|---|
| `product_tmpl_pf_rhs` | Rectangular Hollow Section (RHS) | 38 | Hollow Sections & Profiles | needs_setup | unpublished | — | not selected |
| `product_tmpl_pf_shs` | Square Hollow Section (SHS) | 29 | Hollow Sections & Profiles | needs_setup | unpublished | — | **selected** |
| `product_tmpl_sh_hr_s235jr_plate` | Hot Rolled Plate S235JR | 22 | Flat Products | needs_setup | unpublished | — | not selected |
| `product_tmpl_sh_hr_s355jr_plate` | Hot Rolled Plate S355JR | 22 | Flat Products | needs_setup | unpublished | — | **selected** |
| `product_tmpl_bm_inp` | IPN / INP Beam | 21 | Long Products | needs_setup | unpublished | — | not selected |
| `product_tmpl_bm_ipe` | IPE Beam | 18 | Long Products | needs_setup | unpublished | — | not selected |
| `product_tmpl_sh_hr_s355jr_sheet` | Hot Rolled Sheet S355JR | 15 | Flat Products | needs_setup | unpublished | — | not selected |
| `product_tmpl_sh_hr_s235jr_sheet` | Hot Rolled Sheet S235JR | 15 | Flat Products | needs_setup | unpublished | — | not selected |
| `product_tmpl_rb_s240` | Plain Rebar S240 (A1) | 13 | Long Products | needs_setup | unpublished | — | not selected |
| `product_tmpl_pp_smls_a106_gr_b` | Seamless Pipe ASTM A106 Gr. B | 12 | Pipes & Tubes | needs_setup | unpublished | — | not selected |
| `product_tmpl_rb_aj400` | Ribbed Rebar Aj400 (A3) | 11 | Long Products | needs_setup | unpublished | — | not selected |
| `product_tmpl_rb_aj340` | Ribbed Rebar Aj340 (A2) | 11 | Long Products | needs_setup | unpublished | — | **selected** |
| `product_tmpl_rb_aj500` | Ribbed Rebar Aj500 (A4) | 10 | Long Products | needs_setup | unpublished | — | not selected |

Baseline before this task, both staging and production: 237 active variants, 0 `is_public`, 0 `product_seo_contents` rows, 0 visible, 0 indexable — matching every prior audit trail (DAR-036/037/038).

## 5. Stage B — Launch template selection

**Selected: Ribbed Rebar Aj340 (A2), Hot Rolled Plate S355JR, Square Hollow Section (SHS).** The DAR-038 staging pilot set was reconsidered against this task's own criteria and re-confirmed rather than assumed:

- **Structural representativeness:** three distinct spec shapes — 2-key rebar (`diameter_mm`, `length_mm`), 3-key plate (`width_mm`, `thickness_mm`, `length_mm`), 4-key hollow section (`width_mm`, `height_mm`, `thickness_mm`, `length_mm`) — and three distinct product families (Long/Rebar, Flat/Plate, Hollow-Section/Profile).
- **Verified data quality:** content was already written from real DB_PUBLIC data and live-verified end-to-end on staging (DAR-038); every number was independently re-checked against live production `DB_PUBLIC` in this task (see §6).
- **Business importance:** rebar and structural sections are core commodity groups for a steel-procurement business.
- **Sufficient variant count:** 11/22/29 real variants each, none thin.
- **No unsupported claims needed:** every fact in the content is a direct database field.

Not selected: the other 10 templates, including the larger RHS (38 variants) and both beam profiles — reserved for a future editorial pass, not a launch blocker.

## 6. Stage C — Production editorial content

Content is FA-only (launch priority; EN/AR intentionally not blocked on). Applied via `scripts/pilot/production-launch.fa.json` (new, committed) — the DAR-038 staging content with two owner-directed wording corrections applied before production publication:

1. `در فهرست کالایی آهن آسا موجود است` (implies current stock) → `در فهرست محصولات آهن آسا تعریف شده است` (neutral: "is defined in Ahan Asa's product list") — applied everywhere the phrase occurred (intro/body/meta), not only the one literal instance quoted, for consistency.
2. `فاکتور یا لیست خرید بفرستید` → `لیست خرید یا مشخصات مورد نیاز خود را ارسال کنید`; `ارسال فاکتور` removed from all three meta descriptions.

Final content per template (H1, slug, intro, long description, SEO title, meta description) — see `scripts/pilot/production-launch.fa.json` for the exact, committed source of truth. Every technical claim (size range, thickness range, standard, grade, variant count) is sourced directly from live production `DB_PUBLIC` `product_variants` rows, re-verified in this task, not carried over from memory. Zero price, stock, delivery-time, certification, or supplier claim anywhere.

Index status: `index` for all 3 (FA). Publication state: `published` for all 3.

## 7. Production publication — executed

Via `node scripts/catalog-editorial.ts <cmd> --env production --confirm-production`, the established DAR-038 operator workflow, batch → mark-review → approve → publish → set-public → set-index, then `set-variant-public` for 12 representative variants (owner-approved list):

- Rebar Aj340: Ø8, Ø16, Ø22, Ø32
- Plate S355JR: 8×1500×6000, 20×1500×6000, 35×2000×6000, 60×2000×6000
- SHS: 40×40×2.5, 80×80×5, 120×120×8, 200×200×12

**Verified post-publication (live D1 queries against production, this task):**

```text
product_seo_contents: exactly 3 rows, all entity_type='product', locale='fa',
  content_quality_status='approved', published_at IS NOT NULL, index_status='index'
catalog_products.is_public = 1: exactly 3 (the selected templates only)
product_variants.is_public = 1: exactly 12 (the approved representative variants only)
node scripts/catalog-editorial.ts list --env production:
  3 templates state=published visible=true indexable=true eligibleVariants=4
  10 templates state=needs_setup visible=false indexable=false eligibleVariants=0  (unchanged)
```

No SQL was hand-written against production content tables — every write went through the existing, tested `lib/catalog/editorial.ts` state machine via the CLI. A pre-write `--dry-run` preview was run and reviewed (twice — once before the wording corrections, once after) before any real write.

## 8. Variant visibility — hybrid model preserved

Each published template's specification table shows **exactly its 4 marked-public variants**, never its full variant set (11/22/29) — the same rule proven in DAR-038, re-verified via `eligibleVariants=4` in the `list` output above. 225 of 237 variants remain non-public, unaffected. No 237-page SEO explosion; template pages remain the sole indexable Catalog entity (`docs/CATALOG_PUBLIC_ROUTES.md` §1).

## 9. Stage D/E — Runtime validation

**D1-layer verification: complete** (§7 above — the exact predicate the public routes and sitemap query use, `evaluatePublicationEligibility`, confirms `visible=true, indexable=true` for all 3, `eligibleVariants=4` for all 3).

**A real, genuine SEO defect was found and fixed during this stage:** the Product detail page (`app/[locale]/products/[slug]/page.tsx`) built its `hreflang` alternates by blindly generating `fa`/`en`/`ar` URLs for the same slug (`buildLanguageAlternates`), regardless of whether an `en`/`ar` editorial row actually exists for that entity. With only FA published, this would have advertised `hreflang="en"`/`hreflang="ar"` links to `/en/products/rebar-aj340` and `/ar/products/rebar-aj340` — both real 404s, since the schema allows each locale's slug to differ per `(entity, locale)` row and none exists yet for en/ar. **Fixed:** a new repository read, `lib/catalog/editorial-repository.ts#listPublishedLocalesForProduct`, plus a new metadata helper, `lib/metadata/resolve.ts#buildLanguageAlternatesFromEntries`, restrict the product detail page's hreflang map to only the locales that actually have a published row — using each locale's own slug, never the current locale's slug reused. 5 new unit tests added (`lib/metadata/resolve.test.ts`); `tsc --noEmit`, `npm test` (367/367), and `CLOUDFLARE_ENV=production npx vinext build` all pass with the fix in place. Two pre-existing files (`lib/metadata/resolve.ts`, `lib/metadata/site.ts`) had their `@/`-alias imports converted to relative `.ts` imports as part of adding the first-ever direct unit test for this module (matching the repo's existing convention, e.g. `lib/rfq/validation.ts`) — a mechanical prerequisite for the fix to be testable at all, not a behavior change.

**Deployment status: DEPLOYED** (superseding this section's earlier "not yet deployed" note). The hreflang fix, together with the additional UI/UX corrections found during the owner's own manual production verification pass (§29 below), was deployed as one consolidated Worker version, `1e3d89fa-f635-4701-8ae0-cc290a7643b2`, promoted to 100% traffic on `ahanassa-production` (same Worker, `workers.dev` only, no DNS change). Live-confirmed: `<link rel="alternate" hreflang="fa">` and `hreflang="x-default"` only on `/products/rebar-aj340` — no fabricated `en`/`ar` link.

**Live HTTP verification against the Basic-Auth-gated Worker: now performed**, superseding this section's earlier note that it was declined. See §29 for the full consolidated verification.

**No new production RFQ was submitted** during this task (confirmed: `SELECT COUNT(*) FROM rfqs` on production = 2, unchanged, both the pre-existing synthetic records from Deployment Stage 1/DAR-044).

## 10. Stage F — Sitemap

`app/sitemap.ts` queries `listIndexableCatalogTemplateSlugs(locale)` per locale — the exact same `evaluatePublicationEligibility`-derived predicate confirmed in §7. With 3 FA templates now `published`+`is_public`+`index_status='index'`, and zero EN/AR editorial rows, the expected sitemap output is now exactly 3 URLs (`/products/rebar-aj340`, `/products/hot-rolled-plate-s355jr`, `/products/square-hollow-section-shs`), all unprefixed (fa, the default locale) — zero raw Variant URLs, zero unpublished-template URLs, zero `workers.dev` URLs (the sitemap always builds from `siteConfig.baseUrl`, §11), zero staging/demo content. Live confirmation of the actual served `/sitemap.xml` is part of the same residual manual-verification item as §9 (requires the deployed fix + Basic Auth access).

## 11. Stage G — Canonical URLs

**Already correct, no code change needed.** `lib/env.ts#getAppBaseUrl()` hardcodes `CANONICAL_ORIGIN = "https://www.ahanassa.com"` as its fallback and only honors an explicit `APP_BASE_URL` environment override — `wrangler.jsonc`'s `env.production.vars` does **not** set `APP_BASE_URL`, so canonical URLs never depend on the request's runtime hostname; they are always `https://www.ahanassa.com/...`, verified structurally in code and already live-confirmed in DAR-042 §12 (`<link rel="canonical" href="https://www.ahanassa.com/products">` observed on the deployed non-live Worker). This holds for every page including the newly published product detail pages, since `buildCanonicalUrl`/`buildPageMetadata` are unchanged in this respect.

## 12. WWW policy

**`https://www.ahanassa.com` (www) is canonical** — `CANONICAL_ORIGIN` in `lib/env.ts`, matching `PROJECT_OVERRIDES.md`'s own document header (`Domain: https://www.ahanassa.com`) and `01-sources/DO_NOT_CHANGE.md`'s registered domain. This is an existing, already-implemented decision — not invented by this task.

## 13. Stage H — hreflang

Fixed for the Product detail page (§9). All other current routes (`/`, `/about`, `/contact`, `/products` listing, `/services`, `/markets`) use the uniform `buildLanguageAlternates(path)` correctly, since those routes genuinely exist (as routes) in all 3 locales regardless of content-quality state — they are not per-locale-editorial-gated entities the way a Catalog Product page is. `x-default` correctly points at the unprefixed FA route everywhere (`PROJECT_OVERRIDES.md` §1).

## 14. Stage I — robots

`app/robots.ts`: when `APP_ENV !== "production"`, disallow everything (used for local/staging). When `APP_ENV === "production"` (set in `wrangler.jsonc`'s `env.production.vars`, present on the deployed non-live Worker today), it returns `allow: "/"` plus a `sitemap` link — this is **already the correct LIVE-state policy**, not something that needs to change at cutover. Today's non-live Worker is prevented from being indexed by two layers that are **independent of `robots.ts`**: (1) Cloudflare's own automatic `X-Robots-Tag: noindex` injection on every `*.workers.dev` subdomain (platform-level, not this repo's code — confirmed via DAR-042 §19's own observation), and (2) the temporary Basic Auth gate rejecting every request, including crawlers, with `401` before any HTML is served. **Both of these protections disappear once a custom domain (`ahanassa.com`) is attached and Basic Auth is removed** — which is exactly the intended transition, not a regression: `robots.ts`'s `APP_ENV === "production"` branch was already written for the live state. Per-page `indexable` flags remain the real, final gate on what's actually indexed (§15) — this is not "keeping the real domain globally noindex after cutover" (the failure mode this stage warns against); it's the designed mechanism.

## 15. Stage J — Structured data

`lib/seo/schema.ts` emits only `Organization` (with the confirmed real address, `PROJECT_OVERRIDES.md` §7.1), `WebSite`, and `BreadcrumbList` — verified by direct code inspection, unchanged by this task. **No `Product`/`Offer` schema is emitted anywhere**, including on the newly published product detail pages — a deliberate, pre-existing decision (`docs/CATALOG_PUBLIC_ROUTES.md` §12: emitting `Product` schema without a real `Offer` would be misleading structured data). No price/availability/rating/review schema exists anywhere in the codebase.

## 16. Stage K — Final SEO QA

- Unique localized titles/descriptions: yes, per-template, verified in §6/§7 (3 distinct, real, non-generic titles/descriptions).
- Canonical: correct (§11).
- hreflang: correct after the fix in §9 (not yet deployed — §28).
- Open Graph: `buildPageMetadata` sets `openGraph.title/description/url/siteName/locale/type` unconditionally for every page including product details — unchanged, correct.
- Sitemap: correct logic, expected 3 entries (§10); live confirmation pending (§9).
- Robots: correct, already live-state-ready (§14).
- Heading hierarchy: product detail page uses `PageHero` (h1) → `<h2>` "مشخصات فنی و اندازه‌های موجود" — correct single-h1 structure, unchanged by this task.
- Internal linking: product detail → `/contact` (RFQ CTA) and back to `/products`; breadcrumb (`Home → Products → this product`) present as both visible UI and `BreadcrumbList` JSON-LD.
- No duplicate/thin Variant pages: confirmed (§8) — 225 of 237 variants remain non-public; only 3 template pages are indexable.

**Genuine, real blocker identified in this stage:** the homepage (`/`), `/about`, `/contact`, and the `/products` listing page itself all remain hardcoded `indexable: false` (`app/[locale]/page.tsx`, `about/page.tsx`, `contact/page.tsx`, `products/page.tsx`) — this predates this task (established site-wide pre-launch posture per DAR-037) and was not changed here, since flipping it is a content/business readiness decision (are these pages' current copy genuinely final/approved for indexing?) outside a narrow readiness-audit's authority — not something to silently flip. **Flagged as an owner decision, not fixed unilaterally** — see §28.

## 17. Stage L — Turnstile real-domain readiness

Current widget (`0x4AAAAAAEi2RZ3NHcqTk0ej`, `managed` mode) is allowlisted **only** for `ahanassa-production.nova-b1e6f0.workers.dev` (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §6). **Before cutover:** `ahanassa.com` and `www.ahanassa.com` must be added to the widget's domain allowlist via the Cloudflare dashboard/API — not done in this task (no domain exists to add yet; premature). The workers.dev hostname should remain allowlisted until final pre-cutover validation is complete, per this task's own instruction — not removed here. No secret value was read, printed, or exposed in this task.

## 18. Stage M — Basic Auth (unchanged, plan confirmed)

**Not removed in this task**, per explicit instruction — ordinary non-live validation continues to need it. The exact removal steps are already fully documented (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §7, restated in the cutover runbook, §5 of `docs/GO_LIVE_CUTOVER_RUNBOOK.md`): delete `lib/security/preview-auth.ts`(+test), revert `workers/entry.ts`'s `fetch` to the plain `vinextHandler.fetch` reference, delete the two secrets, redeploy. This is a small, isolated change that does not touch Turnstile, security headers, RFQ API, or Catalog — confirmed by inspection (the gate sits entirely at the top of `workers/entry.ts#fetch`, before any application routing).

## 19. Stage N — Security QA

- Security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera/mic/geo/payment/usb/interest-cohort all denied), `Content-Security-Policy-Report-Only` (narrowly scoped to `'self'` + the Turnstile origin) — `lib/security/headers.ts`, unchanged, code-verified.
- Turnstile: mandatory server-side Siteverify, fails closed (`lib/rfq/service.ts`/`lib/security/turnstile.ts`), unchanged, 21 passing unit tests.
- Rate limiter: `RFQ_RATE_LIMITER`, 5 req/60s, fails open only if the binding itself is absent (documented, deliberate — Turnstile is the authoritative gate), unchanged.
- Honeypot + minimum-completion timing: unchanged, tested (`lib/rfq/validation.ts`).
- Same-origin/content-type/content-length checks: unchanged (`app/api/rfqs/route.ts`).
- `MAX_ITEMS = 20`: unchanged, still the single canonical constant (`lib/rfq/validation.ts`), still explicitly proof-tested (8 dedicated tests in `lib/rfq/validation.test.ts`).
- Basic Auth: still protects every route including `/api/rfqs` on the non-live Worker — unchanged (§18).
- Secret exposure: `ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `PREVIEW_BASIC_AUTH_USER`/`PASSWORD` — no value was read, printed, logged, or committed by this task; the assistant deliberately declined (and was independently blocked by the auto-mode classifier) from writing the Basic Auth credential to any file this session. `verification_session` — unchanged code guarantee (never persisted, never logged; `docs/ODOO_RFQ_API_INTEGRATION.md` §7), not touched by this task.
- No aggressive penetration testing was performed against production infrastructure, per this task's own instruction.

## 20. Stage O — Performance QA

No rendering/bundle/font/image code changed by this task. The only runtime addition is one extra, narrow D1 `SELECT` on the product detail page (`listPublishedLocalesForProduct`, a single indexed-lookup query against `product_seo_contents` keyed by `entity_id`) — negligible relative to the existing per-page query the same route already performs (`getPublishedCatalogTemplateBySlug`). Baseline numbers from the most recent real deployment smoke test (DAR-042/044, unchanged code path otherwise): `/` ~0.43–0.55s TTFB, `/contact` ~0.45–0.55s TTFB steady-state. No broad optimization was undertaken, per this task's own "only if a clear launch blocker appears" instruction — none was found.

## 21. Stage P — Mobile QA

Not independently re-verified live this session (requires Basic Auth access — see §9's residual item). No layout/component code was changed by this task for the Catalog pages (`VariantSpecTable`, `PageHero`, `CtaBand`) — these are the same components already live-verified responsive in DAR-044 for the RFQ multi-item form's own mobile pass. **Residual manual-verification item**, not a known defect.

## 22. Stage Q — Accessibility QA

No accessibility-affecting markup was changed by this task. Live keyboard/screen-reader/contrast verification of the newly-published product pages was not performed this session (same access constraint as §9/§21). **Residual manual-verification item**, not a known defect — no code change in this task altered headings, labels, focus order, or ARIA usage on any page.

## 23. Stage R — Content QA

- No lorem ipsum, no sample/test/synthetic text in the 3 published templates (verified: full-text grep of `scripts/pilot/production-launch.fa.json` for price/stock/Persian-Rial/Toman terms — none found, §6).
- No fake reviews/testimonials/stats — none introduced.
- Contact information: the confirmed address (`PROJECT_OVERRIDES.md` §7.1) is used verbatim in `app/[locale]/contact/page.tsx` and `components/layout/SiteFooter.tsx` (grep-confirmed, unchanged by this task). **The phone number remains correctly unpublished** — `PROJECT_OVERRIDES.md` §7.2 explicitly leaves it unconfirmed; grep confirms no phone number/`tel:` link exists anywhere in `app/`/`components/`/`lib/content/`. Company legal entity, email, business hours remain unconfirmed and are correctly absent — not fabricated.

## 24. Stage S — Synthetic/test data isolation

Confirmed: production `rfqs` still contains exactly the 2 pre-existing, self-evidently-synthetic records (`AA-RFQ-VD1DCR16`, `AA-RFQ-C3SZCRT7` — both carry `(SYNTHETIC)` in `company_name` and an `.invalid` email domain) — no new record was added by this task, and neither is exposed on any public surface (DB_OPS has no public read route). Both remain as legitimate operational audit evidence, per this task's own "may remain as operational evidence" instruction — not deleted.

## 25. Stage T — Cloudflare production inventory (names only)

| Resource | Name |
|---|---|
| Worker | `ahanassa-production` (current version `878a1e82-43d8-4f5b-b737-d26598b2e07d`, pending redeploy for the hreflang fix) |
| D1 (ops) | `ahanassa-ops-production` |
| D1 (catalog) | `ahanassa-public-production` |
| Queue | `ahanassa-odoo-sync-production` |
| DLQ | `ahanassa-odoo-sync-production-dlq` |
| Rate limiter namespace | `2001` |
| Turnstile widget | `0x4AAAAAAEi2RZ3NHcqTk0ej` (managed, workers.dev-only allowlist) |
| Secrets (names only) | `ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `PREVIEW_BASIC_AUTH_USER`, `PREVIEW_BASIC_AUTH_PASSWORD` |

## 26. Stage U/V — Cron and Queue/DLQ final check

**Cron: healthy, actively running against production.** Live-queried `catalog_sync_state` this task: `last_success_at` (incremental) `2026-09-01T12:01:51Z`, `last_full_reconciliation_at` `2026-09-01T02:30:27Z`, `last_full_upstream_count: 237`, `consecutive_failure_count: 0`, lease released (`lease_owner: null`). All three configured Cron expressions (`*/5`, `0 */3`, `30 2`) are active on the deployed Worker since Deployment Stage 1 (`wrangler deploy` activates triggers on first deploy). No duplicate Cron Trigger was created.

**Queue/DLQ: healthy.** `wrangler queues list` confirms exactly 1 producer / 1 consumer on `ahanassa-odoo-sync-production` and its DLQ, correctly isolated from the staging queues (distinct names, distinct IDs). DLQ contains exactly the same 2 historical, `resolved` records from the Deployment Stage 1 Odoo-side defect recovery (§24-adjacent) — no new unresolved DLQ entry. These 2 records are clearly differentiated as resolved historical evidence, not active unresolved failures — confirmed via direct query in this task (`resolution_status: "resolved"` on both).

## 27. Stage W/X — Cutover architecture and Basic Auth rotation

See `docs/GO_LIVE_CUTOVER_RUNBOOK.md` — the full Stage 2 plan (not executed in this task), including the explicit Basic Auth credential rotation/removal requirement (the current temporary credential was exposed during interactive Stage 1 testing and must not be retained long-term — its value is not printed anywhere in this document or that one).

## 28. Go-Live Readiness Gate

**GO-LIVE BLOCKED (2026-09-02, at the time this section was written). Superseded — see §30 for the final verdict as of the Final Go-Live Readiness pass (2026-09-02, later the same day).**

Genuine remaining blockers (not exhaustive process items — only things that must change before a real cutover):

1. ~~hreflang fix not yet deployed~~ — **RESOLVED.** Deployed in the §29 consolidated correction pass, live-verified.
2. ~~Live HTTP verification not performed~~ — **RESOLVED for the items covered in §29** (catalog pages, filter narrowing, RFQ form fixes, hreflang, canonical, security headers, Basic Auth, secret non-exposure — all live-verified against the deployed Worker). **Still open:** independent live mobile-device and assistive-technology (screen reader) verification — the §29 pass verified DOM/CSS output via HTTP responses, not a real device/AT pass.
3. **Homepage/about/contact/products-listing remain `indexable: false`** (§16) — a real, undecided item: is this the intended launch posture (soft-launch the catalog only) or should these flip before/at cutover? Requires an explicit owner decision, not a unilateral code change.
4. **`ahanassa.com`/`www.ahanassa.com` not yet added to the Turnstile widget's domain allowlist** (§17) — expected to remain open until a domain exists to add (i.e., resolved as part of Stage 2 cutover itself, not before).
5. **Basic Auth removal/rotation not yet executed** (§18/§27) — by design, deferred to Stage 2 cutover; the current temporary credential still must not be retained as a long-term secret once Stage 2 begins.
6. **`UNIT / INVENTORY / PROCUREMENT ARCHITECTURE GATE` — OPEN, owner-directed.** See `docs/UOM_INVENTORY_PROCUREMENT_GATE.md` for the full 19-item scope (customer-requested UOM vs. Odoo inventory UOM, branch/sheet/meter→nominal-kg conversion, coil/bundle conversion, nominal vs. actual weight, Supplier Offer UOM, MOQ UOM, sourcing allocation, PO/receipt/Vendor Bill/Customer Invoice reconciliation, returns/cancellation, multi-supplier allocation). **This is an explicit, owner-mandated blocker on the overall Go-Live verdict, independent of Website code readiness** — it is Odoo/ERP-side architecture work, not implementable or resolvable from this repository, and per the owner's own instruction, `GO-LIVE READY` may not be declared until it is either PASS or explicitly waived by an owner-level decision.

**What is genuinely ready:** production Catalog editorial content for 3 launch templates (real, verified, owner-reviewed, owner-corrected wording, correctly scoped hybrid-model publication); canonical URL logic; WWW policy; structured data; security controls; Cron/Queue/DLQ; synthetic data isolation; no new production RFQ throughout either pass; hreflang fix (deployed, live-verified); Catalog filter conditional narrowing (deployed, live-verified); RFQ layout/RTL-select/required-field/phone-required/Turnstile-UX fixes (deployed, live-verified); `tsc`/`npm test` (382/382)/`npm run build` all clean; public DNS/Vercel untouched throughout both passes. See §29 for the full second-pass detail and final report.

---

## 29. Correction pass — production UI/UX/SEO fixes found during owner manual verification (2026-09-02)

Following §7's production Catalog publication, the project owner manually verified the live pages and found 8 real, distinct defects. This section documents the root cause, fix, and live verification for each — all deployed together in one consolidated Worker version, `1e3d89fa-f635-4701-8ae0-cc290a7643b2`.

### 29.1 Catalog filter root cause

`lib/catalog/editorial-repository.ts#getPublicCatalogFilterFacets` computed each filter dimension's option list (`family`/`group`/`form`/`grade`/`standard`) as an independent `DISTINCT` over every published template's variants — a **marginal**, per-column set, not a set of real co-occurring combinations. With 3 published templates from different families, this let a visitor combine one real value from each dimension into a combination that matched **zero** real templates (e.g. `group=REBAR&grade=S355JR` — `S355JR` is a real grade, but only ever co-occurs with the Plate template, never with `REBAR`). The listing page then rendered the generic "catalog is being prepared" empty state, which reads as a technical failure rather than "this exact combination has nothing published."

### 29.2 Catalog filter fix

Added `lib/catalog/catalog-filters.ts#computeConditionalFacets` (pure, unit-tested, 7 new tests using the real 3-template production fixture) — a standard "faceted search" narrowing: each dimension's option list is now computed only from rows that already match every *other* currently-active filter (a dimension's own active value is excluded from its own filter so it doesn't vanish from its own list). `getPublicCatalogFilterFacets(locale, activeFilters)` now takes the current filters and delegates to this function; `app/[locale]/products/page.tsx` passes `filters` through. Live-verified: `?group=REBAR` now only ever offers `grade=AJ340` (never `S355JR`), `form=RIBBED_REBAR`, `standard=INSO3132` — every remaining link is guaranteed, by construction, to match at least one real published template (also directly proven by a dedicated test that exhaustively checks every two-dimension combination in the resulting facets against the real fixture rows).

The empty-state component (`components/products/catalog-empty-state.tsx`) now has two variants: `"catalog-preparing"` (the original wording, unchanged — used when zero templates are published system-wide) and `"no-filter-match"` (new: "در حال حاضر محصول منتشرشده‌ای با این مشخصات وجود ندارد" / "There is currently no published product matching these filters", with a "Clear filters" link back to `/products`) — selected by whether any filter is active. A manually-constructed dead-end URL (`?group=REBAR&grade=S355JR`) now correctly shows the new, non-alarming wording — live-verified on the deployed Worker. Normal navigation no longer generates a link to any such dead end in the first place; a manually-typed/stale URL still degrades gracefully.

### 29.3 Variant navigation behavior

No independent Variant SEO pages were created — the hybrid model (Template page = indexable; Variant = identity within it) is unchanged. `components/products/variant-spec-table.tsx` now accepts an optional `highlightXid`; the Product detail page (`app/[locale]/products/[slug]/page.tsx`) reads an optional `?variant=<xid>` query param, resolves it against the page's own already-published, already-public variants (never trusts an unmatched value), and if it matches: highlights that row (background + a "(انتخاب‌شده)"/"(Selected item)" label, fully server-rendered, no JS required to see it) and gives it a stable `id` anchor (`variantRowAnchorId`, derived from the customer-facing SKU — the internal `xid` itself is still never rendered, consistent with the existing rule). A small client component (`components/products/scroll-to-anchor.tsx`) scrolls that row into view on load as a progressive enhancement — the highlight itself needs no JS. Live-verified: `/products/rebar-aj340?variant=ahanassa_marketplace.product_rb_aj340_d16_l12` renders the Ø16 row with the highlight classes and the "selected" label; the row also carries `id="v-aa-rb-aj340-d16-l12"` for a future direct `#anchor` deep link.

### 29.4 RFQ overlap root cause/fix

Root cause: nested CSS Grid contexts (the page-level 12-column grid → the RFQ form's own `grid` wrapper → the "Requested products" card) each default to `min-width: auto` for their grid items — the desktop item table's own intrinsic minimum width (8 columns) could force one or more of these grid items wider than their allotted track, visually squeezing/overlapping the "Next steps" aside column beside it. Fix: `min-w-0` added at every level in the chain that needed it (`app/[locale]/contact/page.tsx`'s `lg:col-span-7` column wrapper, `components/contact/enquiry-form.tsx`'s own `<form className="grid ...">`, and the "Requested products" card `<div>` directly) — the standard, documented CSS fix for this exact class of bug. No absolute positioning, no negative margins. The table's own pre-existing `overflow-x-auto` wrapper now correctly contains horizontal scroll within its own box instead of expanding its ancestors. Live-verified: all three `min-w-0` classes present in the deployed page's HTML.

### 29.5 RTL select clipping root cause/fix

Root cause: the RFQ form's `<select>` elements relied entirely on the browser's native dropdown-arrow rendering and its (browser- and platform-inconsistent) reserved space — in RTL, some browsers do not reliably reserve enough room for long selected text next to the native arrow, letting text render underneath it. Fix: `components/contact/rfq-item-row.tsx` now wraps every `<select>` (Category, Product/Template, Spec/Variant, Unit — all 4, both desktop table and mobile card renders) in a new `SelectField` component: `appearance-none` removes the inconsistent native rendering, a `<ChevronDown>` icon (already-used `lucide-react`) is positioned via `end-3` (a CSS logical property — "inline-end", i.e. LEFT in RTL, RIGHT in LTR, correct in both directions automatically, never a hardcoded `right-3`), and `pe-9` (`padding-inline-end`) guarantees fixed, generous space so text can never render under the icon. `truncate` lets a genuinely long value elide with an ellipsis instead of overflowing, and each select's own `title` attribute carries the full untruncated selected label for hover/assistive-tech access. Live-verified: 8 selects on the deployed `/contact` page carry the new `appearance-none truncate pe-9` classes; 15 chevron icons render correctly positioned via the logical `end-3` property.

### 29.6 Required-field UX

Added a visible, consistent `*` marker (red, via `RequiredMark`, with a screen-reader-only "(required)"/"(الزامی)" label alongside the visual asterisk — not hidden inside an `aria-hidden` wrapper) to Name, Company, Email, and Phone labels in `components/contact/enquiry-form.tsx`. Every marked field also carries the real HTML `required` + `aria-required="true"` attributes — the marker is never shown on a field the backend treats as optional, and never omitted from one it requires (matches server validation exactly, see §29.7/29.8). Live-verified: 4 `aria-required="true"` attributes present on the deployed `/contact` page.

### 29.7 Phone-required contract change

**Owner decision implemented, both sides:**

- **Server:** `lib/rfq/validation.ts#validateRfqSubmission` now rejects a missing/empty/whitespace-only `phone` with `fieldErrors.phone: ["required"]` — previously phone was fully optional (`phone && ...`). A present-but-malformed phone still produces `["invalid"]`, unchanged. This is strictly a Website-side tightening — the Odoo RFQ API contract, `lib/odoo/rfq-payload-mapper.ts`, and the Odoo-side "name + one contact method" rule are completely untouched; the Website is now stricter than Odoo requires, never weaker.
- **Client:** `phone` input gained `required` + `aria-required="true"` (§29.6) — native browser validation now blocks submission with an empty phone, matching the server exactly.
- **Types:** deliberately left as `phone: string | null` in `ValidationResult`/`RfqSubmissionInput` — changing this to a non-nullable type would have required touching every downstream consumer (`lib/rfq/service.ts`, `lib/rfq/repository.ts`, `lib/odoo/rfq-payload-mapper.ts`) for a guarantee those consumers already handle correctly via `?? `/null-checks; the *validator* is now the sole source of the non-null guarantee, exactly as the equivalent guarantee already works for `fullName`/`companyName`/`email`.
- **Email/Company:** unchanged — still required, exactly as before this task. Nothing was made optional.
- **Localized errors:** `phoneRequired`/`phoneInvalid` copy added in fa/en/ar (currently used as the phone input's `title` attribute; the field-level error surfaces through the existing native-validation + error-summary mechanism, consistent with how Name/Company/Email already behave — no new server-error-rendering mechanism was introduced for this one field).
- **Tests:** 6 new dedicated tests (missing/empty/whitespace-only phone rejected; malformed phone still rejected; well-formed phone accepted and never returned as null; Persian-digit/separator normalization still works) plus 3 regression tests confirming fullName/companyName/email are still required, unaffected by this change (`lib/rfq/validation.test.ts`). `basePayload()`'s test fixture updated to include a valid phone so every pre-existing "accepts" test continues to exercise a realistic, fully-valid submission.

### 29.8 Turnstile disabled-state UX

`components/contact/enquiry-form.tsx` now tracks a UI-only `turnstileStatus` (`"verifying" | "interactive" | "failed" | "success"`), driven by real, documented Cloudflare Turnstile `render()` callbacks — `before-interactive-callback`/`after-interactive-callback` (fire exactly when an interactive challenge appears/resolves) in addition to the existing `callback`/`error-callback`/`expired-callback`, plus `timeout-callback` (also real, also now handled, previously ignored). **Submit's actual enabled/disabled condition is completely unchanged** (`turnstileBlocking = Boolean(turnstileSiteKey) && !turnstileToken`) — this is purely explanatory UI next to the widget, never a way to bypass verification:

- No token yet, no interaction shown → "در حال انجام تأیید امنیتی…" / "Running security verification…" (`role="status"`).
- Interactive challenge visible → "برای فعال شدن ارسال درخواست، تأیید امنیتی را تکمیل کنید." / "Complete the security verification to enable sending your request." (`role="status"`).
- Failed/expired/timed out → "تأیید امنیتی کامل نشد. لطفاً دوباره تلاش کنید." / "Security verification did not complete. Please try again." (`role="alert"`) — no raw Turnstile error code/message is ever surfaced; `resetTurnstile()` (already existing) lets the visitor retry via the same widget, unchanged mechanism. Live-verified: the default "verifying" message renders in the deployed page's initial HTML (before any client-side interaction).

### 29.9 Hreflang status

Unchanged from §9/§13 — the fix (only advertise hreflang for locales with a real published row, using each locale's own slug) is now **deployed and live-verified**: `/products/rebar-aj340` on the live Worker returns exactly `hreflang="fa"` and `hreflang="x-default"`, no fabricated `en`/`ar` link.

### 29.10 Tests

`npx tsc --noEmit` — clean. `npm test` — **382/382 passing** (up from 367: +6 phone-required tests, +3 required-field regression tests, +7 `computeConditionalFacets` tests, +5 hreflang-alternates tests already added in the prior pass, with the earlier pass's own count already folded in — see `lib/catalog/catalog-filters.test.ts`, `lib/rfq/validation.test.ts`). `npm run build` (`CLOUDFLARE_ENV=production`) — clean, unchanged route list. `git diff --check` — clean. No existing test was weakened, skipped, or deleted; the 1–20-line RFQ cap tests are untouched.

### 29.11 Deployed Worker version

- **Version ID:** `1e3d89fa-f635-4701-8ae0-cc290a7643b2` (message: "Go-Live Readiness UI/SEO fixes: hreflang, catalog filter narrowing, RFQ layout/RTL/required-field/phone/Turnstile UX").
- **Promoted to 100% traffic** via `wrangler versions deploy 1e3d89fa-...@100` — confirmed via `wrangler deployments list`.
- **Secrets carried forward**, verified via `wrangler versions view` before promotion: `ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `PREVIEW_BASIC_AUTH_USER`, `PREVIEW_BASIC_AUTH_PASSWORD` — all 4 present; bindings correct (`DB_OPS` = `ahanassa-ops-production`, `DB_PUBLIC` = `ahanassa-public-production`, `ODOO_SYNC_QUEUE` = `ahanassa-odoo-sync-production`).
- Same Worker as every prior deployment (`ahanassa-production`) — no second Worker created.

### 29.12 Runtime validation (live, against the deployed Worker, Basic-Auth-authenticated)

| Check | Result |
|---|---|
| `/products` | `200`, lists exactly the 3 published templates |
| `/products/rebar-aj340` | `200` |
| `/products/hot-rolled-plate-s355jr` | `200` |
| `/products/square-hollow-section-shs` | `200` |
| `/products?group=REBAR&grade=S355JR` (manually constructed unavailable filter) | `200`, new "no product matches these filters" wording, not the old "catalog is being prepared" wording |
| `/contact` | `200` |
| hreflang on `/products/rebar-aj340` | exactly `fa` + `x-default` |
| canonical on `/products/rebar-aj340` | `https://www.ahanassa.com/products/rebar-aj340` |
| Filter narrowing (`?group=REBAR`) | `grade` facet only offers `AJ340`, never `S355JR` |
| Required-field markers | 4 `aria-required="true"` attributes present |
| Phone validation | `<input id="phone" required aria-required="true" ...>` present |
| Layout fix | `grid min-w-0 gap-8` present |
| Select fix | 8 selects carry `appearance-none truncate pe-9`; 15 chevron icons render |
| Turnstile explanatory status | "در حال انجام تأیید امنیتی…" present in initial HTML |
| Basic Auth | `401` on unauthenticated `/` and `POST /api/rfqs` — unchanged, still gates everything |
| Secret exposure | zero matches for any of the 4 secret names in the rendered `/contact` HTML |

Desktop-viewport verification was performed via direct HTTP/DOM inspection (`curl` against the real deployed Worker) rather than a rendered screenshot — no browser-automation tool was available in this session (the Chrome extension reported not connected). The fixes themselves use standard, well-established, deterministic CSS techniques (`min-w-0` for grid-item overflow containment; logical `pe-9`/`end-3` properties for RTL-safe select padding/icon positioning, which resolve correctly in both directions by definition, not by browser quirk) rather than viewport-specific hacks, and the underlying DOM/class output was directly confirmed correct on the live page. A live mobile-device pass and a real screen-reader pass were not performed this session — see §28 item 2.

### 29.13 Catalog publication counts

**Unchanged, exactly as required:** 3 published/indexable FA templates (`Ribbed Rebar Aj340`, `Hot Rolled Plate S355JR`, `Square Hollow Section`), 12 public representative variants. Verified via direct D1 query immediately after this deployment: `catalog_products WHERE is_public=1` → `3`; `product_variants WHERE is_public=1` → `12`. No additional Catalog content was published in this correction task.

### 29.14 Basic Auth status

**Unchanged, still fully active** — re-verified live immediately after this deployment: `401` on unauthenticated `GET /` and `POST /api/rfqs`; correct credentials still authenticate normally (used throughout §29.12's verification). Not removed, not rotated, per this task's own explicit instruction.

### 29.15 DNS/Vercel status

**Unchanged.** `https://www.ahanassa.com/` still resolves directly to the live legacy Vercel deployment (`server: Vercel`, `x-vercel-id` present in response headers, confirmed via a direct read-only request immediately after this deployment). No Cloudflare route or custom domain was attached to `ahanassa-production` at any point. The only publicly reachable surface for this Worker remains the same Basic-Auth-gated `https://ahanassa-production.nova-b1e6f0.workers.dev`.

### 29.16 Git status

Working tree has the 14 modified + 5 new files from this correction pass, not yet committed at the time this document was written (commit follows immediately after, per this task's own "commit only after all validation passes" instruction). No production RFQ was created; no production D1 write occurred in this pass beyond what §29.13 documents (none — this pass touched only application code, not Catalog content).

### 29.17 Gate restated

This correction pass fixes real, confirmed UI/SEO defects and is fully verified live. It does **not**, by itself, change the overall Go-Live verdict from `GO-LIVE BLOCKED` (§28) — the `UNIT / INVENTORY / PROCUREMENT ARCHITECTURE GATE` (`docs/UOM_INVENTORY_PROCUREMENT_GATE.md`) remains open and is an explicit, owner-mandated blocker independent of Website code readiness, per the owner's own instruction that these UI fixes passing does not by itself justify `GO-LIVE READY`.

---

## 30. Final Go-Live Readiness (2026-09-02, branch `chore/final-go-live-readiness`, based on `b03b62a`)

Between §29 and this section, two further tasks were completed and deployed: RFQ Launch UoM Contract Alignment (`docs/RFQ_LAUNCH_UOM_ALIGNMENT.md`, commit `42ce8fe`, DAR-046) and its Cloudflare runtime validation (evidence commit `b03b62a`, DAR-047) — the Website's RFQ unit-of-measure policy is now aligned with, and live-verified against, Odoo Ahan Asa Marketplace production `19.0.27.0.0`'s confirmed Launch policy (Rebar kg/ton/branch, Plate kg/ton/sheet, SHS kg/ton/meter, Custom kg/ton only). This section covers the Final Go-Live Readiness pass itself: a Git/Vercel lineage audit, a full re-verification of every prior readiness area, and the final verdict.

### 30.1 Git / legacy `main` lineage — read-only audit

`origin/main` is a genuinely separate, unrelated 3-commit lineage (`c2f6e13` "first commit" → `b316264` "feat: launch Ahan Asa holding page" → `d22d752` "fix: align canonical URLs with www domain"), dated 2026-08-18 — a minimal static Next.js "coming soon" page, not the Website this project has been building. It was not touched, merged into, rebased onto, or force-pushed during this task — every command run against it was read-only (`git fetch`, `git log`, `git show`).

**Critical new finding: Vercel's Git integration is connected to this exact GitHub repository and auto-deploys every pushed branch, not only `main`.** Confirmed via read-only `vercel` CLI inspection (`vercel ls`, `vercel inspect` — no `vercel deploy`/`vercel link`/`vercel env` or any state-changing command was run): every feature branch this Website workstream has pushed (e.g. `fix/rfq-launch-uom-policy`) produced a corresponding Vercel **Preview** deployment, all failing quickly (~11–15s, this repo's Cloudflare/`vinext` build is not Vercel-compatible) — harmless (Preview only, no public linkage) but previously unidentified. The **Production** target is confirmed tied to `main` (a `git-main` alias on the live production deployment, whose timestamp exactly matches `d22d752`) and has not redeployed in the 15 days since — none of this project's work has touched live production. Full detail and the Stage-2 procedural consequence (disconnect Vercel's Git integration, or reassign its Production Branch, **before** `main` is ever touched by a future Git operation — not required for the DNS cutover itself): `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8, `DOCUMENT_AUDIT_REPORT.md` DAR-048.

**Holding-page behavior to preserve for rollback (§30.5/Phase V below):** brand mark + H1 "تأمین آهن‌آلات مطابق نیاز شما" + tagline "ما مراقب سرمایه شما هستیم." + status line "وب‌سایت در دست طراحی است." + footer showing "www.ahanassa.com" — confirmed byte-for-byte live today at `https://www.ahanassa.com/` (verified by direct comparison against `d22d752`'s committed source). This is not being copied into the new Website (correctly out of scope) — it remains available, unmodified, at `origin/main` and in the live Vercel deployment as the rollback target.

**Canonical-host decision represented by `d22d752`:** apex `ahanassa.com` → `www.ahanassa.com` (www canonical). **Does not conflict with, and is not superseded by, the new Website's own independently-established canonical-host policy** (`lib/env.ts#CANONICAL_ORIGIN = "https://www.ahanassa.com"`) — both arrived at, and both currently actively enforce, the identical decision. Live-reconfirmed: `curl -I https://ahanassa.com/` → `308` → `https://www.ahanassa.com/` (Vercel-level redirect, `server: Vercel` header); `dig` confirms both hostnames resolve to Vercel's edge IPs, `www` additionally carrying a Vercel-managed CNAME-style record. No new canonical-host decision was needed or made — see `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §6 (updated with this corroboration).

### 30.2 No-feature inventory (Phase B) — real current-launch blockers

None found. Deferred/non-Launch scope (Customer Auth, Customer Portal, coil/bundle/piece automated units, `fixed_quantity` settlement for future products, Website Pricing display, Supplier public offers, automated actual-weight device/OCR integration) is correctly not in scope for the current RFQ-intake-only Launch flow and was not implemented.

**The `UNIT / INVENTORY / PROCUREMENT ARCHITECTURE GATE` (§28 item 6) is reassessed, not newly resolved wholesale** — see `docs/UOM_INVENTORY_PROCUREMENT_GATE.md` §6 for the full reasoning. Summary: items 1–9 (customer-facing UOM policy, kg/ton/branch/sheet/meter conversion existence, nominal-vs-actual-weight settlement) are now substantively addressed for the current Launch product set by newly-confirmed Odoo production gates (`Launch UOM Hardening: LIVE PASS`, `Dynamic Pricing Unit Basis: LIVE PASS`, `Settlement Dual-Sided Billing: LIVE PASS`, Launch products/policies use `actual_weight`). Items 10–19 (Supplier Offer/MOQ UOM, sourcing allocation, PO/receipt/Vendor Bill/Customer Invoice reconciliation, returns, multi-supplier allocation) remain genuinely open, undocumented Odoo/ERP work — but are correctly non-blocking for the current launch flow, which structurally ends at durable RFQ capture and does not depend on any of them (`CLAUDE.md` §7's own request→review→proposal→sourcing flow — all human-mediated downstream of RFQ intake, not Website-automated). This reassessment is not an Odoo-side implementation and does not touch Odoo.

### 30.3 Website re-verification (Phases C–S) — all re-confirmed live, no regression

| Area | Result |
|---|---|
| Catalog publication (Phase C) | Exactly 3 published templates (`rebar-aj340`, `hot-rolled-plate-s355jr`, `square-hollow-section-shs`), 12 public variants — unchanged, re-confirmed via direct D1 query |
| Product pages (Phase D) | `/products`, all 3 detail pages, `/contact` all `200`; real H1 confirmed (`میلگرد آجدار Aj340 (A2)`) |
| RFQ / UoM (Phase E) | Rebar unit list re-confirmed live: exactly kg/ton/branch — no regression since DAR-047 |
| SEO (Phase F) | Canonical never `workers.dev` (always `https://www.ahanassa.com/...`); hreflang exactly `fa`+`x-default`, no fabricated en/ar; sitemap exactly 3 URLs; robots `Allow: /` with correct sitemap reference |
| Canonical host policy (Phase G) | Resolved and corroborated — §30.1 above; `www.ahanassa.com` canonical, apex redirects |
| Robots / preview indexing (Phase H) | Unchanged from §14: `robots.ts`'s `APP_ENV === "production"` branch is already the correct live-state policy; the non-live Worker is kept non-indexable today by Basic Auth + Cloudflare's automatic `*.workers.dev` `X-Robots-Tag: noindex` (platform-level, not app code) — both disappear together only once Basic Auth is removed and a custom domain is attached at Stage 2, which is the intended transition, not a risk of "stuck noindex after launch" |
| Turnstile domain readiness (Phase I) | Widget (`0x4AAAAAAEi2RZ3NHcqTk0ej`) still allowlisted for `ahanassa-production.nova-b1e6f0.workers.dev` only — unchanged; Stage 2 action (add `ahanassa.com`/`www.ahanassa.com`) already documented in the cutover runbook §4, not executed here (no real domain to add yet); no secret value read or exposed |
| Basic Auth removal plan (Phase J) | Unchanged, still fully documented (`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §3) — not removed in this phase; public-mode retained protections (Turnstile, rate limiting, same-origin, honeypot, security headers, RFQ validation) all independently confirmed still active and structurally unrelated to the Basic Auth gate (it sits before all application routing, not interleaved with these) |
| Security (Phase K) | Re-confirmed live: CSP-Report-Only/X-Content-Type-Options/X-Frame-Options/Referrer-Policy/Permissions-Policy all present; unauthenticated `/` and `POST /api/rfqs` → `401`; zero secret-name matches in rendered `/contact` HTML; rate limiting/honeypot/body limits/`MAX_ITEMS=20` unchanged (no code touched them) |
| Content signal / AI / Markdown (Phase L) | N/A — no such capability exists in this repository; correctly not added |
| Performance (Phase M) | `/products` ~0.68–0.80s TTFB, `/contact` ~0.60–0.61s TTFB, `/` ~0.91s TTFB — somewhat higher than the ~0.45–0.55s prior baseline but **no application code changed** since the last measurement (only documentation) — attributed to routing/network variance, not a regression; no optimization performed per this phase's own "only if severe" instruction |
| Mobile / RTL (Phase N) | No UI code has changed since the DAR-044/047 mobile passes (RFQ form card-layout DOM-equivalence, RTL select fix) — no new regression risk; not independently re-screenshotted this pass |
| Accessibility (Phase O) | No UI code has changed since the last accessibility-considered pass (required-field markers, `aria-live` counter, semantic table/card structure, labels) — no new regression risk |
| Infrastructure inventory (Phase P) | Unchanged: Worker `ahanassa-production` (current version `ac09d55c-c80c-455d-a827-c3730cba22c5`), `DB_OPS`=`ahanassa-ops-production`, `DB_PUBLIC`=`ahanassa-public-production`, Queue `ahanassa-odoo-sync-production`+DLQ, Turnstile widget `0x4AAAAAAEi2RZ3NHcqTk0ej`, secrets (names only) `ODOO_RFQ_API_TOKEN`/`TURNSTILE_SECRET_KEY`/`PREVIEW_BASIC_AUTH_USER`/`PREVIEW_BASIC_AUTH_PASSWORD` |
| Cron / Queue / DLQ (Phase Q) | Healthy: last incremental success `2026-09-02T12:01:16Z`, last full reconciliation `2026-09-02T02:30:42Z` (upstream count 237), `consecutive_failure_count: 0`, lease released; Queue 1 producer/1 consumer; DLQ still exactly the same 2 historical `resolved` records, no new entry |
| Odoo health, read-only (Phase R) | `odoo.ahanassa.com/` → `200`; Public Catalog API meta → `200`; RFQ API route unauthenticated probe → `401` (route exists, requires auth — not `404`/`500`) — no systemic failure; no Odoo write of any kind performed |
| Synthetic data isolation (Phase S) | Unchanged: exactly 2 pre-existing, self-evidently-synthetic `rfqs` rows (`AA-RFQ-VD1DCR16`, `AA-RFQ-C3SZCRT7`), no new row, DB_OPS has no public read surface — no new production RFQ was created in this phase |

### 30.4 Vercel / current public site record (Phase T)

See §30.1 for the full Git/Vercel audit. Summary snapshot for rollback baseline: apex `ahanassa.com` → `308` → `www.ahanassa.com`; `www.ahanassa.com` → `200`, served by Vercel (`x-nextjs-prerender: 1`, edge-cached); both hostnames DNS-resolve to Vercel's edge IPs (`216.198.79.65`, `64.29.17.65`), `www` additionally via a Vercel-managed record; Vercel project `ahanassa-website` (`prj_NoKwW7dH04S8sElswllEz5LMENLX`), Production deployment unchanged for 15 days, Git-connected with Production Branch = `main`. Vercel was not disconnected, and no deployment was triggered by this audit.

### 30.5 Stage 2 cutover runbook and rollback (Phases U/V)

`docs/GO_LIVE_CUTOVER_RUNBOOK.md` updated (not executed) with: the Vercel Git-integration finding and its required Stage-2 procedural consequence (§8, restated in §30.1 above); the corroborated www-canonical decision (§6). All 15 originally-required runbook elements (final source commit, Worker deployment, Turnstile hostname readiness, Basic Auth removal, custom domain/route attachment, apex DNS handling, www policy/redirect, Vercel transition, smoke checks, RFQ security check, Catalog check, SEO/canonical check, rollback triggers, rollback commands, post-launch monitoring) remain present and current. Rollback continues to rest on: DNS revert as the primary/fastest path (§11 of the runbook), the durable-first-write RFQ architecture guaranteeing no RFQ loss across any rollback (an already-accepted RFQ is durably in `DB_OPS` before Odoo sync is even attempted, independent of which Worker version or domain target is currently live), and the legacy Vercel deployment remaining fully intact and untouched as the rollback target throughout.

### 30.6 Final tests (Phase W)

`npx tsc --noEmit` — clean. `npm test` — 449/449 passing (unchanged; no test code touched in this phase). `npm run build` — clean, unchanged route list. `git diff --check` — clean. No lint script exists in this repository beyond `tsc`/`node --test` (confirmed, `package.json`).

### 30.7 Final Verdict

**GO-LIVE READY.**

- No unresolved Launch-critical Website defect — confirmed across every re-verified area in §30.3.
- No unresolved Launch-critical Odoo defect — confirmed via the newly-reassessed UOM/Inventory/Procurement gate (§30.2) and read-only Odoo health checks (Phase R); genuinely open items (gate items 10–19) are correctly non-blocking for the RFQ-intake-only current Launch scope.
- Catalog publication correct — 3 templates / 12 variants, unchanged, verified.
- RFQ/UoM policy correct — aligned with and live-verified against confirmed Odoo production gates (DAR-046/047).
- Pricing/Settlement production gates already passed (Odoo-reported, not independently verifiable from this repository, which has no Odoo database access).
- SEO/canonical/hreflang correct — verified live, corroborated by the independent legacy-lineage decision.
- Turnstile domain readiness confirmed — the Stage 2 action (add the two real hostnames to the existing widget) is fully documented and ready to execute; not executed early, correctly, since no real domain is attached to the Worker yet.
- Basic Auth removal procedure ready — fully documented, not executed early, correctly.
- Security acceptable — headers, Turnstile, rate limiting, honeypot, secret non-exposure all re-confirmed live.
- Worker/DB/Queue/Cron healthy — all re-confirmed live and current.
- Rollback executable — documented, enhanced this pass with the Vercel Git-integration procedural finding; RFQ-loss-free by architecture.
- DNS/Vercel remain unchanged during this phase — confirmed before and after every audit action; only read-only `vercel`/`dig`/`curl`/`git` commands were run.

**Stage 2 domain cutover was NOT performed in this task**, per its own explicit instruction. `docs/GO_LIVE_CUTOVER_RUNBOOK.md` is the authoritative, up-to-date, unexecuted plan for when the owner authorizes it.

## 31. Stage 2B Production Cutover — Execution Record (2026-09-02)

Full detail: `DOCUMENT_AUDIT_REPORT.md` DAR-050, `docs/GO_LIVE_CUTOVER_RUNBOOK.md` "Execution record".

**`www.ahanassa.com` cutover executed and verified live.** Preview Basic Auth removed (commit `39db058`); Worker version `cbbf0344-2e08-4e82-b7dc-b453b635de6e` deployed to 100% traffic on the existing `ahanassa-production` Worker (no new Worker created); `PREVIEW_BASIC_AUTH_USER`/`PASSWORD` secrets deleted; `TURNSTILE_SECRET_KEY`/`ODOO_RFQ_API_TOKEN` untouched and never printed; Turnstile allowlist reconfirmed unchanged (`workers.dev`/`www.ahanassa.com`/`ahanassa.com`) via `wrangler turnstile widget list --json`. The project owner deleted the pre-existing `www.ahanassa.com` Vercel CNAME directly in the Cloudflare dashboard (the executing agent holds no Cloudflare zone write access); `www.ahanassa.com` was then attached as a Worker Custom Domain, TLS valid immediately, and the full smoke/SEO/Catalog/RFQ-UoM/security/Queue/Cron/DLQ/Odoo-read-only gate passed live against the real domain.

**One regression found and fixed:** the first Custom Domain attach attempt (correctly blocked by Cloudflare because the Vercel CNAME still existed) had a side effect — `wrangler triggers deploy` silently disabled the `workers.dev` preview endpoint because `workers_dev` was never explicit in `wrangler.jsonc`. Execution stopped immediately at this serious error, per this task's own explicit instruction, and was reported to the owner rather than worked around. After owner authorization, `"workers_dev": true` was added permanently and the endpoint restored before retrying the (by-then-unblocked) Custom Domain attachment.

**Apex `ahanassa.com` was not modified** — still serving its unchanged pre-cutover Vercel behavior. The apex → `www` permanent redirect remains open, blocked on the same Cloudflare zone write access gap (Redirect Rules are a zone-level Rulesets feature outside every `wrangler` subcommand and this agent's token scope) — not a defect in the Website, Worker, or DNS state.

`origin/main` reconfirmed unchanged at `d22d752` throughout. Legacy Vercel project/production deployment remain fully intact as the rollback target.

**Gate: WWW PRODUCTION CUTOVER: PASS. APEX REDIRECT: OPEN (access-blocked).**
