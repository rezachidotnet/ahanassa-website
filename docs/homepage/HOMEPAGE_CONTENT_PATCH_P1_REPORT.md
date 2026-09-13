# Homepage Content Patch P1 Report (HP-CONTENT-P1)

Date: 2026-09-14
Task type: narrow, owner-approved content patch (phone/address/Hero step 4/Final CTA copy), staging only. No component redesign, no structural change.

---

# RESULT

**PASS.**

---

# BASE SHA

`46479236e708762b1a122716404990ff9ca1dd6d` (HEAD at the start of this task).

---

# PHONE

**`03135134`** — set verbatim in the single canonical source, `lib/content/contact-channels.ts` (`CONTACT_PHONE_E164`), consumed unchanged by Hero, Header, the mobile nav drawer, `FinalCta`, `SiteFooter`, and the Organization SEO schema (`lib/seo/schema.ts`). Not rejected, expanded, normalized, or reformatted, per instruction — the constant is named `CONTACT_PHONE_E164` for historical reasons but its value is intentionally not E.164 shaped; this was not renamed (out of narrow scope).

**Old value (`+989120656528`) — confirmed absent** from all active (non-historical) source: `grep -rl "989120656528" --include="*.ts" --include="*.tsx"` returns zero matches repository-wide. It remains, correctly untouched, in 12 historical implementation/audit reports (`PROJECT_OVERRIDES.md`'s own dated §7.2 history line, `DOCUMENT_AUDIT_REPORT.md`, and 10 dated implementation reports under `docs/`) — none of these were rewritten, per instruction.

**Notable finding surfaced during this task:** `PROJECT_OVERRIDES.md` §7.2 previously recorded the digits `۰۳۱۳۵۱۳۴` (Eastern Arabic form of the same number) as "a superseded historical candidate, never confirmed, never published... an 8-digit fragment (short for a standard Isfahan landline)." This task's owner instruction is a direct, current, explicit confirmation of the identical number (Latin digits) — per `CLAUDE.md` §8 instruction precedence ("The project owner's latest explicit instruction" is priority #1), this new confirmation supersedes that prior candidate-status note. `PROJECT_OVERRIDES.md` §7.1/§7.2 were updated to record this accurately (see PRODUCTION SAFETY / governance note below) — this is a content-fact correction to the living cross-project decision record, not a rewrite of a historical implementation report.

Two test assertions (`lib/content/hero-frozen-spec-invariants.test.ts`, `lib/content/final-cta-frozen-spec-invariants.test.ts`) previously required `CONTACT_PHONE_E164` to match `/^\+\d{6,15}$/` (a generic E.164 shape) — updated to pin the exact new owner-approved value instead, since the new number is not E.164 shaped by design.

---

# FOOTER ADDRESS

**PASS.** `components/layout/SiteFooter.tsx`'s `addressLines` updated for all three locales to the exact requested fact (street/alley/plaque), translated/localized per locale, no invented detail (no postal code, no building name):

- fa: `اصفهان، خیابان هزارجریب، کوی آزادگان، پلاک 6` (owner's exact string, verbatim)
- en: `Hezar Jarib Street, Kooy Azadegan, No. 6, Isfahan, Iran`
- ar: `شارع هزار جريب، حي آزادگان، رقم 6، أصفهان، إيران`

**Known, deliberate scope gap:** `app/[locale]/contact/page.tsx` has its own separate, independent `addressLines` (same old address, no plaque number) and `lib/seo/schema.ts`'s Organization `streetAddress` also still has the old address — neither was touched, since the task explicitly scoped this change to "Footer address" only. This is now a real, visible inconsistency (Footer says "پلاک 6," the contact page and structured data do not) — flagged here as a follow-up gap for a future task, not silently expanded into.

---

# FOOTER POSITIONING COPY

**PASS.** `role` field replaced for all three locales:

- fa: `تامین فولاد پروژه شما` (owner's exact string, verbatim — including the owner's own spelling without the hamza on تأمین)
- en: `Steel supply for your project.`
- ar: `توريد الصلب لمشروعك.`

No marketing claim added; matches the existing site tone (short declarative line, same as the string it replaces).

---

# HERO STEP 4

**PASS.** `lib/content/homepage.ts`'s `hero.process` 4th element changed in all three locales, step count/order/layout untouched:

- fa: `خرید` → `تأمین`
- en: `Purchase` → `Sourcing` (matching this project's own established `تأمین` → "sourcing" translation convention, used throughout the rest of this same file)
- ar: `الشراء` → `التوريد` (same established convention)

Verified live: the deployed Hero's `<ol>` renders exactly `1. ارسال لیست درخواست → 2. بررسی فنی → 3. بررسی تجاری → 4. تأمین`.

A test in `hero-frozen-spec-invariants.test.ts` that pinned the old 4-element array exactly was updated to the new array (a legitimate "owner-directed baseline" update, not a historical-report rewrite).

---

# FINAL CTA HEADING

**PASS.**

- fa: `خرید آهن پروژه‌تان را شروع کنید` (exact, verbatim)
- en: `Start your project's steel purchase`
- ar: `ابدأ شراء الحديد لمشروعك`

---

# FINAL CTA SUPPORT COPY

**PASS.**

- fa: `اقلام مورد نیازتان را ارسال کنید تا کارشناس آهن آسا همین حالا با شما تماس بگیرد.` (exact, verbatim)
- en: `Send the items you need so an Ahan Asa specialist calls you right away.`
- ar: `أرسل الأصناف التي تحتاجها ليتصل بك خبير آهن آسا في الحال.`

CTA buttons unchanged: `primaryCta`/`secondaryCta`/`reassurance` fields in `homepageCopy[locale].finalCta` were not touched in any locale.

The frozen spec document the test suite reads as its content authority (`docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md`) was updated to match — its §2/§3/§4 canonical-content sections are the literal source `final-cta-frozen-spec-invariants.test.ts` diffs the shipped copy against at runtime (not a static string in the test itself), so leaving it stale would have made the test fail. An amendment note was added to the document's Status/Date header; its layout/design/position sections (§1, §5) were left untouched, since only content changed.

---

# FA

**PASS.** `/` → `200`. Live-verified: new phone (`03135134`), new Footer address, new Footer positioning line, Hero step 4 = `تأمین` (confirmed in the exact 4th `<li>` position), Final CTA new heading + new support text, old phone/old Final CTA heading both confirmed absent. Product Showcase preserved (`data-count="3"`, same 3 real cards as before this task). No error strings found.

# EN

**PASS.** `/en` → `200`. New phone present, old phone absent, new Final CTA title/body present, "Sourcing" step present, new Footer role/address present. Old Final CTA title confirmed absent.

# AR

**PASS.** `/ar` → `200`. New phone present, old phone absent, new Final CTA title/body present, "التوريد" step present, new Footer role/address present. Old Final CTA title confirmed absent.

---

# TESTS

`npm test` → **1249/1249 passing**, 0 failed. (Same count as before this task — content-test assertions were updated in place, not added/removed net.)

---

# TSC

`npx tsc --noEmit` → **PASS**, clean.

---

# BUILD

`npm run build` → **PASS**, all routes built, no errors. `git diff --check` → clean.

---

# IMPLEMENTATION COMMIT

`4ae0c0c` — `fix(home): update contact and homepage conversion copy`

Files: `PROJECT_OVERRIDES.md`, `components/layout/SiteFooter.tsx`, `docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md`, `lib/content/contact-channels.ts`, `lib/content/final-cta-frozen-spec-invariants.test.ts`, `lib/content/hero-frozen-spec-invariants.test.ts`, `lib/content/homepage.ts`.

---

# PREVIOUS WORKER VERSION

`701211b0-ef31-4e25-9b08-cbe09e2d1b9d` (the version live at the start of this task, from the prior PS-P3 deploy).

---

# STAGING DEPLOY

Pre-deploy gates, all confirmed fresh:
- `DB_PUBLIC` staging: `✅ No migrations to apply!`
- `DB_OPS` staging: `✅ No migrations to apply!`
- Staging resources reconfirmed: Worker `ahanassa-bootstrap-staging`, `DB_OPS` = `ahanassa-ops-staging`, `DB_PUBLIC` = `ahanassa-public-staging` — distinct from production.
- **No migration was needed or created** — this is a pure content/copy change.

Deployed via `npx vinext-cloudflare deploy --env staging` (the currently-established staging path; the GitHub Actions `deploy-staging.yml` workflow-indexing gap remains unresolved, unchanged from prior tasks — not re-solved here). Result: **success.**

---

# NEW WORKER VERSION

`673e9336-d3e6-4639-bd25-3f41e34b0309` — confirmed 100% active via `wrangler deployments list --name ahanassa-bootstrap-staging`. Bindings confirmed all-staging, zero production leakage.

---

# REGRESSION CHECK

All verified live against the new deployment:

- Header, Hero, Buyer Value, Industries, Final CTA, Footer: all present — **PASS**
- Price Strip: absent (`selected-prices-heading` not found) — **PASS**
- Evidence: absent — **PASS**
- Product Showcase: `data-count="3"` on `/` (fa), unchanged from before this task — **PASS**
- Product Showcase responsive contract (PS-P3): CSS asset hash unchanged (`index.DN4P47Gq.css` — identical file, confirming zero CSS/layout change), and directly re-fetched/inspected: `<1280px → 1 column` (380px/640px/1024px tiers all `--aa-showcase-columns:1`), `≥1280px → 3/4-column desktop grid` — **PASS, fully preserved**
- Noindex: `<meta name="robots" content="noindex, follow">` present on `/` — **PASS**
- No `no such table`/`no such column`/`uncaught`/`TypeError`/`ReferenceError` found in any fetched page — **PASS**

---

# PRODUCTION SAFETY

No production resource was created, read, modified, deployed to, or migrated. Every `wrangler` command specified `--env staging` or `--name ahanassa-bootstrap-staging` explicitly. No Odoo call was made. `main` was not pushed, merged, or touched. No migration was applied anywhere. Product Showcase ranking/query logic, its responsive fix, Header navigation architecture, Footer structure, Hero layout/image, Final CTA layout/colors, Buyer Value, Industries, Price Strip, Evidence, RFQ architecture, Odoo, and CI/CD workflows were all left untouched, per explicit instruction.

**Governance note:** `PROJECT_OVERRIDES.md` §7.1/§7.2 (the living cross-project decision record, not a historical report) were updated in the same implementation commit to reflect the new owner-confirmed address and phone as current facts — this correction was necessary because the phone number's prior entry explicitly mischaracterized the exact digits now confirmed as "a superseded historical candidate, never confirmed." No other section of that file was touched. `docs/footer/FOOTER_P1_RECONCILIATION_IMPLEMENTATION_REPORT.md` and other dated historical implementation reports that quote the old phone number were left exactly as written.

---

# REMAINING GAPS (not part of this task's scope, flagged for a future task)

1. `app/[locale]/contact/page.tsx`'s own address block still shows the old address (no plaque number) — now inconsistent with the Footer.
2. `lib/seo/schema.ts`'s Organization `streetAddress` still shows the old address — now inconsistent with the Footer.
3. Real interactive browser acceptance for this content patch was not separately re-run (Claude-in-Chrome extension unavailable in this environment, same as prior tasks); verification here is real HTTP + HTML-body inspection against the live deployed staging Worker.
