# Product Showcase Technical Claim Reconciliation (PS-L10N-P0.1)

Date: 2026-09-14
Task type: read-only factual reconciliation, staging `DB_PUBLIC` only. No database write, no deploy, no publication.

---

# RESULT

**B — CLAIMS SUPPORTED AS NOMINAL RANGE — REPHRASE AVAILABILITY WORDING BEFORE PUBLICATION.**

Every numeric range, standard designation, and grade claim in the FA authority (and the EN/AR drafts translated from it) is genuinely, fully traceable to real, currently-synced `product_variants` rows — none is fabricated or unsupported. However, the apparent mismatch flagged in the task brief was caused by an earlier, **incomplete** query (10-row `LIMIT`) that under-counted the real synced variant set; a complete, unfiltered read of all synced rows resolves every "mismatch" as **the full range being real, but only partially reflected among the subset of variants currently marked `is_public = 1`**. The one genuine issue is wording: "available in Ahan Asa's product list" (and its FA/AR equivalents) reads as an availability/stock claim for the *entire* stated range, when only a narrower subset of that range is actually marked publicly orderable today. That phrasing should be softened before publication; the numbers themselves do not need to change.

---

# METHOD

All queries below are read-only `SELECT`s via `wrangler d1 execute DB_PUBLIC --env staging --remote` (no `--local`, no write flag). No row was inserted, updated, or deleted. The task brief's "known apparent mismatches" were produced by a prior task's `LIMIT 10` query across all 3 products combined (10 rows total, not 10 per product) — this task re-ran each query per-product, unfiltered, to get the true complete set.

---

# PRODUCT 1 — SHS (`product_tmpl_pf_shs`)

Real synced variants (`sync_status='synced'`, `is_active=1`): **29 total**, width/height 40–200 mm, thickness 2.5–12 mm (verified directly: `40×40×2.5` through `200×200×12`). Of these, **4 are `is_public=1`**: `40×40×3`, `80×80×4`, `120×120×6`, `200×200×10` — width/height range among these 4 is also 40–200 mm (matches exactly), but thickness among these 4 is only 3–10 mm (narrower than the full 2.5–12 mm). `standard_code`/`standard_name` = `EN10219-2` / "EN 10219-2 — Cold formed welded structural hollow sections..." on all 29 rows, no exceptions.

| Claim | Value | Authority | Supported | Semantic type | Action |
|---|---|---|---|---|---|
| Standard | EN 10219-2 | A (uniform on all 29 synced rows) | YES | SYNCED VARIANT | KEEP |
| Width/height range | 40–200 mm | A (full synced set: 40–200 mm; the 4 public rows also span 40–200 mm) | YES | SYNCED VARIANT | KEEP |
| Thickness range | 2.5–12 mm | A (full synced set: 2.5–12 mm; but the 4 `is_public=1` rows span only 3–10 mm) | PARTIAL | SYNCED VARIANT | NARROW or REPHRASE |

---

# PRODUCT 2 — AJ340 REBAR (`product_tmpl_rb_aj340`)

Real synced variants: **11 total**, Ø8 through Ø32 mm, all at 12,000 mm (12 m) length — verified directly, every one of the 11 rows has `dimensions_json.length_mm = 12000`, no exception. Of these, **4 are `is_public=1`**: Ø10, Ø16, Ø20, Ø28 — narrower than the full Ø8–Ø32 range (misses Ø8 and Ø32 specifically), but the 12 m length is identical across all 11 (public and non-public alike). `standard_code`/`standard_name` = `INSO3132` / "INSO 3132 — Hot-rolled steel bars for reinforcement of concrete"; `grade_code`/`grade_name` = `AJ340` / "Aj340 (market A2)" — both uniform on all 11 rows, and this is the **exact, Odoo-sourced source** of the "market equivalent A2" phrasing already used in the FA/EN/AR drafts (not an invented equivalence).

| Claim | Value | Authority | Supported | Semantic type | Action |
|---|---|---|---|---|---|
| Standard | INSO 3132 | A (uniform on all 11 synced rows) | YES | SYNCED VARIANT | KEEP |
| Grade / market equivalence | Aj340 (market A2) | A (`grade_code`/`grade_name`, Odoo-sourced, uniform on all 11 rows) | YES | SYNCED VARIANT | KEEP |
| Diameter range | Ø8–Ø32 | A (full synced set: Ø8–Ø32; the 4 `is_public=1` rows span only Ø10–Ø28) | PARTIAL | SYNCED VARIANT | NARROW or REPHRASE |
| Length | 12 m | A (uniform on all 11 rows, including all 4 public ones — no narrowing at all) | YES | SYNCED VARIANT | KEEP |

---

# PRODUCT 3 — S355JR HOT-ROLLED PLATE (`product_tmpl_sh_hr_s355jr_plate`)

Real synced variants: **22 total**, thickness 8–60 mm × width 1500/2000 mm — verified directly, every combination present (`8×1500×6000` through `60×2000×6000`). Of these, **4 are `is_public=1`**: `10×1500×6000`, `20×1500×6000`, `30×2000×6000`, `50×2000×6000` — thickness among these 4 is 10–50 mm (narrower than the full 8–60 mm), but width is 1500 mm **and** 2000 mm both present among the 4 public rows (matches the full 1500–2000 mm range exactly). `standard_code`/`standard_name` = `EN10029` / "EN 10029 — Hot-rolled steel plates 3 mm thick or above..."; `grade_code`/`grade_name` = `S355JR` / "S355JR" — uniform on all 22 rows.

| Claim | Value | Authority | Supported | Semantic type | Action |
|---|---|---|---|---|---|
| Standard | EN 10029 | A (uniform on all 22 synced rows) | YES | SYNCED VARIANT | KEEP |
| Grade | S355JR | A (uniform on all 22 rows) | YES | SYNCED VARIANT | KEEP |
| Thickness range | 8–60 mm | A (full synced set: 8–60 mm; the 4 `is_public=1` rows span only 10–50 mm) | PARTIAL | SYNCED VARIANT | NARROW or REPHRASE |
| Width range | 1500–2000 mm | A (full synced set AND the 4 public rows both span 1500–2000 mm) | YES | SYNCED VARIANT | KEEP |

---

# SEMANTICS — WHAT EACH LAYER ACTUALLY MEANS

Distinguished explicitly, per instruction, not conflated:

- **Nominal product range:** in this schema there is no separate "nominal range" field at the `catalog_products` (template) level — no min/max column exists there at all (verified: `migrations_public/0001_catalog_schema.sql` and `0002_catalog_v1_contract.sql`'s `catalog_products`/`product_variants` definitions contain no range/min/max column). The closest thing to a "nominal range" is the **full set of currently-synced variant rows** — this is a direct projection of Odoo `product.product` (the schema's own header comment: "projection of Odoo product.product (sellable variant)"), not a separately-authored technical spec document. There is no other authoritative "Product Master range" document in this repository beyond what is actually synced.
- **Variants currently represented in DB_PUBLIC:** exactly the 29 / 11 / 22 rows found above, each with `sync_status='synced'`, `is_active=1`. This is real, live data, not a placeholder.
- **Currently `is_public=1` (the subset the website's own detail-page spec table and RFQ preselection actually render, per this repository's established convention):** a narrower subset — 4 rows per product in every case here.
- **Current stock/inventory:** **no such field exists anywhere in this schema.** `catalog_products`/`product_variants` have no inventory/stock/quantity-on-hand column (confirmed by reading both `CREATE TABLE` statements in full) — the repository's own architecture deliberately keeps stock/inventory out of the public projection (`CLAUDE.md` "system of record" boundary; `01-sources/DATABASE_SCHEMA.md`). Nothing in the editorial drafts should ever be read as, or accidentally imply, a stock statement, because no stock data exists to back one.
- **Supplier availability:** also not tracked anywhere in this schema — no supplier/vendor field exists on `product_variants`. Any "available" wording cannot mean supplier availability either, because that fact isn't tracked at all.

**Conclusion:** the FA/EN/AR editorial content's ranges describe the **synced Product Master technical range** (real, Odoo-sourced, correctly attributable) — never stock, never supplier availability. The risk is purely one of *reader interpretation* of the word "available"/"موجود"/"متوفر," not of any actual fabricated data.

---

# WORDING REVIEW

The recurring phrase in every FA `body_json` first paragraph — **"در فهرست کالایی آهن آسا موجود است"** — and its EN/AR draft translations ("is available in Ahan Asa's product list" / "متوفر في قائمة منتجات آهن آسا") were reviewed for truthfulness given the authority established above.

- **Literal meaning:** "is present/listed in Ahan Asa's product list/catalog" — this part is true without qualification; every one of these 3 templates genuinely is in the real, synced catalog.
- **Risk:** in ordinary Persian commercial usage, "موجود است" (literally "is present/exists") commonly carries an **in-stock** connotation ("موجود در انبار" = "in stock in the warehouse"), and its English/Arabic draft translations ("available" / "متوفر") carry the same availability connotation even more directly. Stated immediately after the **full** numeric range (e.g., "sizes 40 to 200 mm, thickness 2.5 to 12 mm"), a reader could reasonably infer that *every* size in that full range is available/in-stock right now — which is not established: only 4 specific sizes per product are currently marked `is_public=1` (the repository's own signal for "actually offered on the public site today").
- **What is NOT at risk:** the second paragraph of every draft/FA body already exists specifically to avoid an availability promise — it asks the reader to "send your invoice or purchase list to review the size/thickness/quantity you need," which is this site's own established, approved conversion model (never instant/guaranteed availability). This CTA sentence needs no change.

**Recommended safer wording direction (not applied — no write performed):** replace the stock-flavored "موجود است"/"available"/"متوفر" with a neutral catalog-inclusion verb that carries no stock connotation, e.g. FA: "...در فهرست کالایی آهن آسا قرار دارد" (is included in / listed in Ahan Asa's product list) instead of "...موجود است"; EN: "...is included in Ahan Asa's product list" instead of "...is available in..."; AR: "...مدرج ضمن قائمة منتجات آهن آسا" (is listed within Ahan Asa's product list) instead of "...متوفر في...". This is a wording-direction recommendation only — no file was edited in this task.

---

# OUTPUT TABLE (CONSOLIDATED)

| Product | Claim | Value/range | Authority | Supported | Semantic type | Action |
|---|---|---|---|---|---|---|
| SHS | Standard | EN 10219-2 | A | YES | SYNCED VARIANT | KEEP |
| SHS | Width/height range | 40–200 mm | A | YES | SYNCED VARIANT | KEEP |
| SHS | Thickness range | 2.5–12 mm | A | PARTIAL (full synced YES; public-only 3–10 mm) | SYNCED VARIANT | NARROW or REPHRASE |
| AJ340 | Standard | INSO 3132 | A | YES | SYNCED VARIANT | KEEP |
| AJ340 | Grade / equivalence | Aj340 (market A2) | A | YES | SYNCED VARIANT | KEEP |
| AJ340 | Diameter range | Ø8–Ø32 | A | PARTIAL (full synced YES; public-only Ø10–Ø28) | SYNCED VARIANT | NARROW or REPHRASE |
| AJ340 | Length | 12 m | A | YES (true even at public-only level) | SYNCED VARIANT | KEEP |
| S355JR | Standard | EN 10029 | A | YES | SYNCED VARIANT | KEEP |
| S355JR | Grade | S355JR | A | YES | SYNCED VARIANT | KEEP |
| S355JR | Thickness range | 8–60 mm | A | PARTIAL (full synced YES; public-only 10–50 mm) | SYNCED VARIANT | NARROW or REPHRASE |
| S355JR | Width range | 1500–2000 mm | A | YES (true even at public-only level) | SYNCED VARIANT | KEEP |
| All 3 | "available in product list" wording | — | C (editorial phrasing, not a data field) | reader-interpretation risk, not a factual error | EDITORIAL ONLY | REPHRASE |

---

# RECOMMENDATION SUMMARY

- **Numeric ranges, standards, and grades: KEEP as drafted.** All are genuine, Odoo-sourced, currently-synced facts — not invented, not editorial-only guesses. No FA/EN/AR range number needs to change.
- **Availability-flavored verb ("موجود است"/"available"/"متوفر"): REPHRASE** to a neutral catalog-inclusion statement (see WORDING REVIEW above), in all three locales, before publication — this addresses the *only* real risk found, without touching any of the correct numeric content.
- This is a **wording-precision** correction, not a factual correction — no claim in the current drafts is untrue; the concern is solely that a reader could over-interpret "available" as "every stated size is currently orderable," which the `is_public` data does not fully support.

---

# DATABASE WRITES

**NONE.** Every database interaction in this task was a read-only `SELECT` (`wrangler d1 execute DB_PUBLIC --env staging --remote`, no `--local`, no INSERT/UPDATE/DELETE, no editorial CLI command run).

---

# DEPLOY

**NO.** No Worker was built or deployed in this task.

---

# PRODUCTION TOUCHED

**NO.** No production resource was read, written, or touched. This task only queried the staging `DB_PUBLIC` database, read-only.
