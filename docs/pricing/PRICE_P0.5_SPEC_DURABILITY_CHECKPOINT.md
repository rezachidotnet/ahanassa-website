# PRICE-P0.5 — Spec Durability + Final Architecture Decision Checkpoint

Date: 2026-09-04
Repository: `/Users/reza/Developer/ahanassa-website`
Task type: **DOCUMENTATION / GIT DURABILITY ONLY** — no runtime pricing changes, no migration 0008.

## RESULT: PASS

## SPEC DURABILITY

- Authoritative V2.1 file path: `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`
- Exact status: `FROZEN / APPROVED`, Version `2.1`, Date `2026-09-04`
- **Provenance disclosure (important):** no standalone "owner-approved V2.1 document" was ever supplied to this repository or this session as a separate artifact. The file's content is transcribed, without paraphrase, from the inline requirements embedded in the two prior task prompts issued against this repository on 2026-09-04 (the V2.1 Implementation Architecture Audit task and the PRICE-P0 gate task). This is disclosed explicitly in the file's own header, not silently presented as a verbatim external document. If a real owner-authored spec file exists outside this repository, this file should be reconciled against it.

  > **Provenance update (2026-09-04, added during the later Spec Reconciliation task — this bullet left unaltered above as historical record):** the real owner-approved artifact was subsequently supplied and committed at `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md` (commit `6b5e4f6`, "docs: reconcile Price Strip v2.1 with owner-approved spec"), superseding the compiled version this checkpoint originally recorded. See that commit and `docs/pricing/PRICE_STRIP_V2.1_AUDIT.md`'s own matching update note for the full account.

## P0 EVIDENCE

- Audit path: `docs/pricing/PRICE_STRIP_V2.1_AUDIT.md` — pre-existing from the prior task, unmodified, verified present in full (486 lines) before commit.
- Architecture gate path: `docs/pricing/PRICE_P0_IDENTITY_FRESHNESS_GATE.md` — pre-existing from the prior task, unmodified, verified present in full (393 lines) before commit, already at the exact required path (no move was needed).

## FROZEN DECISIONS

Recorded in `docs/pricing/PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md`, exactly as specified in this task's own §4:

- **Dual identity:** `product_key` (existing, unchanged, Template) + `variant_key` (new, exact Product Variant). Commercial price mapping anchors to the variant; template identity stays for title/routing/grouping. No rename/drop of `product_key`.
- **Specification ownership:** `catalog_products` + `product_variants` (grade, size, thickness, dimensions, section, commercial size). Provider free-text stays audit/provenance-only. No second commercial product master.
- **Routing:** `/products/{template-slug}?variant={variant-xid}` when a real variant exists. No new route required for V2.1.
- **Freshness states:** FRESH / AGING / STALE / UNAVAILABLE — the previous "show stale, labeled" behavior is explicitly superseded for the Homepage.
- **Derived-state rule:** `freshness_state` is never persisted as authoritative; derived at read time from current time + `source_timestamp` + a persisted cadence policy. No separate reconciliation job.
- **Source timestamp authority:** `source_timestamp` is the freshness authority; `synced_at` is fallback-only when no source timestamp exists.
- **Provider policy ownership:** primary policy belongs to the price source/provider, with a benchmark-specific override reserved for a real future business case — not added speculatively in PRICE-P1.
- **Weekend/schedule handling:** cadence kind + interval alone is insufficient for the weekend rule; expected publication weekdays/schedule + timezone must be evaluated/likely persisted; a full holiday/market-calendar engine is explicitly deferred, documented as a deliberate V1 boundary, not an oversight.
- **Migration policy:** PRICE-P1 requires a new additive migration; migration `0004` is not touched; no existing schema is dropped/renamed.

## CONTRADICTIONS FOUND

**None.** Cross-checked against `migrations_public/0004_public_price_quotes.sql`, `migrations_public/0007_processing_groups.sql`, `lib/pricing/*`, the Product Catalog variant schema (`migrations_public/0002_catalog_v1_contract.sql`), the RFQ `templateXid`/`variantXid` precedent, the live `/products/[slug]?variant=` mechanism, and the frozen spec itself. Full reasoning recorded in the Architecture Decisions doc's own "Consistency review" section. The one genuine tension on record — Decision D reversing the currently-documented "show stale, labeled" behavior in `docs/pricing/PRICE_PROVIDER_CONTRACT.md` §10 — is a **deliberate, disclosed supersession**, called out explicitly in both that document and this checkpoint, not an unnoticed contradiction.

## NEXT MIGRATION NUMBER

`0008` — verified directly from `ls migrations_public/` immediately before writing the decisions document (current highest: `0007_processing_groups.sql`), not assumed from the task prompt's own suggestion.

## COMMIT

- SHA: `7204f002a0caa7e64667b1c94fa014f22461e504`
- Message: `docs: freeze Price Strip v2.1 architecture decisions`
- Files: exactly 4 — `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`, `docs/pricing/PRICE_P0_IDENTITY_FRESHNESS_GATE.md`, `docs/pricing/PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md`, `docs/pricing/PRICE_STRIP_V2.1_AUDIT.md` (1,224 insertions, 0 deletions, 0 files modified/deleted).

## GIT

- Branch: `feat/header-frozen-v2`
- HEAD: `7204f002a0caa7e64667b1c94fa014f22461e504`
- Working tree clean: **YES** (`git status --short` empty after commit)
- `git diff --check`: clean (exit 0), run before staging
- Push: **NO**
- Deploy: **NO**

---

`PRICE STRIP V2.1 SPEC DURABILITY: PASS`
`PRICE-P0 ARCHITECTURE DECISIONS: PASS`
`READY FOR PRICE-P1: YES`
