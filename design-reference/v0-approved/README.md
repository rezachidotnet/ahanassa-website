# Approved Visual Baseline — v0-Derived Design

## Approval status

**APPROVED.** This directory is the version-controlled, portable visual reference for the Ahan Asa website's current approved design direction.

- **Approved:** 2026-08-28 (owner decision — see `PROJECT_OVERRIDES.md` §8b, `DOCUMENT_AUDIT_REPORT.md` DAR-021).
- **Frozen from source migration commit:** `b1d0841` (`feat: adopt approved v0 design as visual authority`), on branch `feat/integrate-v0-design`.
- **Captured:** 2026-08-28, from the canonical repository's own `vinext dev` server running at that commit — not from the external `ahanassa-v0` project directly, and not from the older `design-reference/homepage-desktop-v1.png`.

## Visual authority rule

1. **Visual/UI/layout/styling:** the current canonical implementation in this repository (`app/`, `components/`) **plus this directory** as the version-controlled visual record of what that implementation looked like when approved. Neither the screenshots here nor the external `ahanassa-v0` folder are themselves rendered by the production site — the canonical codebase is.
2. **Business/functional/content:** canonical project documents (`PROJECT_OVERRIDES.md` → `CLAUDE.md` → `01-sources/` → verified implementation facts), unchanged by this directory's existence.
3. **Technical architecture:** the canonical repository (Cloudflare Workers, vinext, Vite, wrangler) — unaffected.
4. **SEO:** canonical SEO architecture (`app/robots.ts`, `app/sitemap.ts`, `lib/metadata/`, `lib/seo/`) — unaffected.
5. **Localization:** canonical `app/[locale]/` architecture and `config/locales.ts` — unaffected.
6. **RFQ:** canonical RFQ documentation and the durable-capture contract — unaffected.
7. **Odoo/backend:** canonical architecture — unaffected.

**The external directory `/Users/reza/Developer/ahanassa-v0` is no longer required by any future Claude/Codex/CI environment.** It remains documented, here and in `CLAUDE.md`/`PROJECT_OVERRIDES.md`, as the historical source the visual direction originated from, but nothing in this repository depends on that path existing. The canonical implementation in this repository, together with this directory, is the complete, portable, self-contained record of the approved visual direction.

## `design-reference/homepage-desktop-v1.png` status

That file is **historical only**. It predates the v0-derived visual direction, is not deleted, and must not be used as a visual target — see `CLAUDE.md` §5a and `PROJECT_OVERRIDES.md` §8a/§8b for the full precedence history.

## Screenshots

All captured with headless Chrome (via `puppeteer-core`, invoked ad hoc from outside this project — see "Tooling" below) against the canonical `vinext dev` server, after scrolling through each page once so scroll-triggered reveal animations render in their settled (fully visible) state, not mid-transition.

| File | Page (fa, default locale) | Viewport | Capture mode |
|---|---|---|---|
| `homepage-desktop-fa.png` | `/` | 1440×1200 | full-page |
| `homepage-mobile-fa.png` | `/` | 390×844 | full-page |
| `mobile-nav-open-fa.png` | `/` with the mobile nav drawer open | 390×844 | viewport only (not full-page — this is a fixed-overlay UI state, not a scrollable page) |
| `products-desktop-fa.png` | `/products` | 1440×1200 | full-page |
| `services-desktop-fa.png` | `/services` | 1440×1200 | full-page |
| `contact-desktop-fa.png` | `/contact` | 1440×1200 | full-page |

**Viewport dimensions, documented explicitly:**

- Desktop: **1440×1200** (`page.setViewport({ width: 1440, height: 1200 })`). 1200 is the initial viewport height only — full-page screenshots capture the entire scrollable page regardless of this number.
- Mobile: **390×844** (`page.setViewport({ width: 390, height: 844 })`) — iPhone 12/13/14-class modern mobile viewport.

Pages intentionally not captured here (about, markets, product-detail, en/ar locales) are covered by the same shared components (`SiteHeader`, `SiteFooter`, `PageHero`, `CtaBand`, card grids) already represented above; add further captures here if a future visual regression needs a specific page as evidence, rather than mechanically screenshotting every route.

## What this directory is for

- A **regression/reference baseline**: "does the current implementation still look like what was approved?"
- Evidence for `DOCUMENT_AUDIT_REPORT.md` entries and future design-direction decisions.
- A way to review the approved visual direction **without needing the external `ahanassa-v0` folder, or a running dev server, to exist.**

## What this directory is explicitly NOT for

- **Not a pixel-perfect contract.** Do not hardcode CSS to match these screenshots' exact pixel dimensions, line-wrap points, or image crops. The production implementation is responsive; these are reference captures at two viewport sizes among many the site must support.
- **Not a content freeze.** Text visible in these screenshots (copy, product names, FAQ answers, sample-catalog data) is exactly what existed at capture time. Legitimate, approved changes to canonical content, translations, or sample data will make future screenshots differ from these — **that difference alone does not constitute a visual regression.** A regression is a change in layout, composition, spacing rhythm, color application, card/border treatment, typography hierarchy, or interaction pattern that was not an intentional, approved design decision.
- **Not editable source.** These are captured artifacts, not files to hand-edit. To update the baseline after an approved visual change, recapture from the running implementation and replace the relevant file(s) — do not touch the PNGs directly.
- **Not authoritative for business facts.** Confirmed/unconfirmed company facts, contact details, and content rules remain exactly as governed by `PROJECT_OVERRIDES.md` §10 and `CLAUDE.md` §7, regardless of what sample or placeholder content happens to be visible in a given screenshot.

## Tooling note

Screenshots were captured with `puppeteer-core` driving the system-installed Google Chrome, run from a scratch directory **outside this repository** — `puppeteer-core` was deliberately **not** added to this project's `package.json`. Regenerating these screenshots does not require adding any new project dependency; any headless-browser tooling invoked ad hoc against a running `vinext dev`/`vinext start` server is sufficient.
