# Contact Address Consistency P1 Report (CONTACT-P1)

Date: 2026-09-14
Task type: narrow address-consistency patch, staging only. No redesign, no schema-type change, no phone change.

---

# RESULT

**PASS.**

---

# BASE SHA

`6fe6d9484d32ba499cd37a27cee850e2722215d5` (HEAD at the start of this task, immediately following HP-CONTENT-P1).

---

# OLD ACTIVE ADDRESS REFERENCES

**Found and fixed, exactly two** (the Footer itself was already correct, updated in HP-CONTENT-P1):

1. `app/[locale]/contact/page.tsx` — `addressLines` for fa/en/ar still had the pre-plaque address (`["اصفهان، خیابان هزارجریب", "کوی آزادگان"]` and its EN/AR equivalents).
2. `lib/seo/schema.ts` — Organization `address.streetAddress` still had `"خیابان هزارجریب، کوی آزادگان"` (no plaque).

A repo-wide search (`grep -rn "خیابان هزارجریب\|Hezar Jarib\|هزار جريب" --include="*.ts" --include="*.tsx"`) confirmed these were the only two active-code locations still holding the old address, matching exactly what HP-CONTENT-P1's own report flagged as the remaining gap. No shared address content constant exists in this repository (only `lib/content/contact-channels.ts` for the phone) — per instruction, none was created; the two files were fixed directly, no broader refactor performed.

**After this fix: zero old active address references remain** anywhere in `.ts`/`.tsx` source.

---

# CONTACT PAGE

**PASS.** `app/[locale]/contact/page.tsx`'s `addressLines` updated for all three locales, matching the Footer's exact values byte-for-byte:

- fa: `اصفهان، خیابان هزارجریب، کوی آزادگان، پلاک 6`
- en: `Hezar Jarib Street, Kooy Azadegan, No. 6, Isfahan, Iran`
- ar: `شارع هزار جريب، حي آزادگان، رقم 6، أصفهان، إيران`

No postal code, district, building name, or coordinates invented. Live-verified on the deployed staging Worker (see FA/EN/AR below).

---

# STRUCTURED DATA

**PASS.** `lib/seo/schema.ts`'s Organization `address.streetAddress` updated to `"خیابان هزارجریب، کوی آزادگان، پلاک 6"`. Schema shape fully preserved — still a `PostalAddress` object under `Organization.address` with the same three fields (`streetAddress`, `addressLocality`, `addressCountry`); no new schema type added, `addressLocality`/`addressCountry` untouched. Live-verified in the rendered JSON-LD on the deployed Homepage:

```json
"address":{"@type":"PostalAddress","streetAddress":"خیابان هزارجریب، کوی آزادگان، پلاک 6","addressLocality":"اصفهان","addressCountry":"IR"},"contactPoint":{"@type":"ContactPoint","telephone":"03135134","contactType":"sales","areaServed":"IR"}
```

---

# FOOTER

**PASS, unchanged.** `components/layout/SiteFooter.tsx` already had the correct address from HP-CONTENT-P1 — re-verified live, byte-identical, no regression from this task's changes.

---

# FA

**PASS.** `/contact` → `200`. New address present verbatim; old address (`"کوی آزادگان</p>"`, the prior line-2-only fragment) confirmed absent. Phone `03135134` present, old phone absent. No error strings.

# EN

**PASS.** `/en/contact` → `200`. New address (`Hezar Jarib Street, Kooy Azadegan, No. 6, Isfahan, Iran`) present. Phone `03135134` present.

# AR

**PASS.** `/ar/contact` → `200`. New address (`شارع هزار جريب، حي آزادگان، رقم 6، أصفهان، إيران`) present. Phone `03135134` present.

---

# TESTS

`npm test` → **1249/1249 passing**, 0 failed. (No test in the repository pinned the old address strings in either changed file, so no test file required updating for this task.)

---

# TSC

`npx tsc --noEmit` → **PASS**, clean.

---

# BUILD

`npm run build` → **PASS**, all routes built, no errors. `git diff --check` → clean.

---

# IMPLEMENTATION COMMIT

`23151e8` — `fix(contact): synchronize public company address`

Files: `app/[locale]/contact/page.tsx`, `lib/seo/schema.ts`.

---

# PREVIOUS WORKER VERSION

`673e9336-d3e6-4639-bd25-3f41e34b0309` (the version live at the start of this task, from the HP-CONTENT-P1 deploy).

---

# NEW WORKER VERSION

`b125a448-96ec-4c03-b71e-d69113f9e5c1` — confirmed 100% active via `wrangler deployments list --name ahanassa-bootstrap-staging`. Bindings confirmed all-staging (`ahanassa-ops-staging`, `ahanassa-public-staging`, `APP_ENV="staging"`), zero production leakage.

Pre-deploy gates, both confirmed fresh: `DB_PUBLIC` staging and `DB_OPS` staging both `✅ No migrations to apply!` — no migration was needed or created (pure content change). Deployed via `npx vinext-cloudflare deploy --env staging`.

---

# REGRESSION CHECK

All re-verified live against the new deployment, none touched by this task and none regressed:

- Phone: `03135134` present everywhere (Header/Footer/Contact/Hero/Final CTA/schema `telephone`) — **PASS**
- Footer positioning copy (`تامین فولاد پروژه شما`) — unchanged — **PASS**
- Hero step 4 (`تأمین`) — unchanged, present — **PASS**
- Final CTA heading (`خرید آهن پروژه‌تان را شروع کنید`) — unchanged — **PASS**
- Price Strip: absent — **PASS**
- Evidence: absent — **PASS**
- Product Showcase responsive behavior: not touched by this task (no CSS/layout file was edited) — unchanged.

---

# PRODUCTION SAFETY

No production resource was created, read, modified, deployed to, or migrated in this task (one read-only `wrangler deployments list --name ahanassa-production` confirmed the production version unchanged at `b07d8697-620c-485c-8fed-21b893ab602c`). Every `wrangler` command specified `--env staging` or `--name ahanassa-bootstrap-staging` explicitly. No Odoo call was made. `main` was not pushed, merged, or touched. Phone was not changed (unchanged from HP-CONTENT-P1's `03135134`). No component was redesigned — only two address string values were updated.
