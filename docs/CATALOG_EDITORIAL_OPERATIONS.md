# Catalog Editorial Operations — Internal Operator Workflow

**Status:** Active — canonical for the internal, repo-local Catalog editorial operator surface: `scripts/catalog-editorial.ts`.
**Established:** 2026-08-30 (DOCUMENT_AUDIT_REPORT.md DAR-038), building on `docs/CATALOG_EDITORIAL_PUBLICATION.md` (DAR-036) and `docs/CATALOG_PUBLIC_ROUTES.md` (DAR-037).
**Scope:** `scripts/catalog-editorial.ts`, `lib/catalog/editorial-cli.ts`, `scripts/pilot/`. Not a public admin panel, not an authentication system, not a public write endpoint — an operator/developer-invoked local tool only.

---

## 1. What this is, and isn't

This is the minimal internal mechanism that lets an authorized developer/operator prepare and publish real Catalog editorial content — inspect what needs setup, write locale-specific content, move it through the existing review workflow, and publish/unpublish it — **without** a Website admin UI, **without** a browser authentication system, **without** a public HTTP write route, and **without** ever writing to Odoo.

It is a single TypeScript file (`scripts/catalog-editorial.ts`), run directly with Node's native TypeScript support (`node scripts/catalog-editorial.ts <command> ...` — the same mechanism this repo's own `npm test` already uses; no build step, no new dependency). It is never imported by application code and has no HTTP listener of any kind.

---

## 2. Why it talks to D1 through `wrangler`, not through the app's own repository code

`lib/catalog/editorial-repository.ts` (the Workers-runtime repository) reaches D1 via `getPublicDb()`, which imports `cloudflare:workers` — a module specifier that only resolves inside the actual Cloudflare Workers runtime (`vinext dev`, a deployed Worker). A plain Node process — which is what a repo-local CLI necessarily is — cannot import it at all; the process would crash on module load before ever reaching a command handler.

This is not a new problem this task introduced — every prior controlled-verification pass against real D1 in this project (DAR-034 through DAR-037) used the same answer: `wrangler d1 execute` is the sanctioned mechanism for a local process to reach real D1 outside the Workers runtime. `scripts/catalog-editorial.ts` formalizes that established pattern into a permanent, reusable, tested tool instead of a series of one-off throwaway scripts.

**What is never duplicated:** every editorial state-machine decision — valid transitions, publish preconditions, publication eligibility, slug validation — is imported verbatim from `lib/catalog/editorial.ts`, the same pure module the Workers-runtime repository uses. The CLI only owns CLI-specific concerns (`lib/catalog/editorial-cli.ts`): argv parsing, the environment write-safeguard, safe SQL-literal rendering (`wrangler d1 execute --command` has no parameter binding — every operator-typed value must be escaped, not interpolated raw), and a fixed, narrow set of SQL statement shapes that each mirror their `editorial-repository.ts` counterpart's exact table/column shape (documented cross-reference in each builder function). Every one of those SQL builders is unit-tested to prove it touches only website-owned columns (`product_seo_contents` in full; `is_public`/`updated_at` on `product_variants`/`catalog_products`) and never an Odoo-owned commercial column.

---

## 3. Environment safety

Every write command requires an explicit `--env local|staging|production` — there is no default. `--env production` additionally requires `--confirm-production`; without it the command is refused before touching anything. Typing a single short command is never enough to publish production content. Read-only commands (`list`, `show`, `validate`) default to `staging` when `--env` is omitted, and never default to `production`.

```bash
node scripts/catalog-editorial.ts publish <xid> --locale fa            # refused: --env required
node scripts/catalog-editorial.ts publish <xid> --locale fa --env production   # refused: needs --confirm-production
node scripts/catalog-editorial.ts publish <xid> --locale fa --env production --confirm-production   # allowed
```

## 4. Dry run

Every write command prints a full preview before applying — target environment, entity XID, locale, current lifecycle state, proposed lifecycle state, slug, and visibility/indexability after the change — whether or not `--dry-run` is passed. Pass `--dry-run` to stop there without writing anything. No secrets are ever printed (`wrangler`'s own credentials are read from its own auth store, never echoed).

## 5. Stable identity

Every content command (`edit`, `validate`, `mark-review`, `approve`, `send-back`, `reopen`, `publish`, `unpublish`, `set-index`, `set-public`/`unset-public`) resolves its target exclusively via `product_template_xid` — never a title, slug, or Odoo integer ID. This matches the hybrid, template-primary model (`docs/CATALOG_PUBLIC_ROUTES.md`): the template is the Website's primary editorial/SEO entity, so it is the CLI's primary editorial identity too.

The one variant-scoped pair of commands, `set-variant-public`/`unset-variant-public`, resolves via `product_variant_xid` — the per-variant visibility-inside-its-published-template flag. There is no variant-level editorial CONTENT command in this phase (no title/slug/description is ever written for a variant by this tool) — that stays the deliberately rare exception path described in `docs/CATALOG_EDITORIAL_PUBLICATION.md`/`docs/CATALOG_PUBLIC_ROUTES.md` §9, unused here.

## 6. Commands

```text
list [--locale fa|en|ar] [--env <env>]
show <template-xid> [--env <env>]
validate <template-xid> --locale <locale> [--env <env>]
edit <template-xid> --locale <locale> --env <env> --title <str> --slug <str> [--intro] [--seo-title] [--seo-description] [--dry-run]
edit <template-xid> --locale <locale> --env <env> --file <path.json> [--dry-run]
mark-review <template-xid> --locale <locale> --env <env> [--dry-run]
approve <template-xid> --locale <locale> --env <env> [--dry-run]
send-back <template-xid> --locale <locale> --env <env> [--dry-run]
reopen <template-xid> --locale <locale> --env <env> [--dry-run]
publish <template-xid> --locale <locale> --env <env> [--confirm-production] [--dry-run]
unpublish <template-xid> --locale <locale> --env <env> [--confirm-production] [--dry-run]
set-index <template-xid> --locale <locale> --status index|noindex|draft --env <env> [--dry-run]
set-public <template-xid> --env <env> [--confirm-production] [--dry-run]
unset-public <template-xid> --env <env> [--confirm-production] [--dry-run]
set-variant-public <variant-xid> --env <env> [--confirm-production] [--dry-run]
unset-variant-public <variant-xid> --env <env> [--confirm-production] [--dry-run]
batch <path.json> --env <env> [--dry-run]
```

`edit`/`batch` never change `contentQualityStatus` or `publishedAt` — editing already-published content does not silently unpublish it (`docs/CATALOG_EDITORIAL_PUBLICATION.md` §3 Q4, reused verbatim, not reimplemented). `publish` requires `contentQualityStatus = 'approved'` plus a non-empty `h1`/`slug` (`canPublish`); `mark-review` requires the same minimum content (`canSubmitForReview`) before `incomplete -> review` is allowed. `publish` additionally warns (without refusing) when the template's own `is_public` flag is still `false` — content can be approved and "published" (an editorial state) while still not actually visible, because visibility also requires the separate `set-public` master switch, exactly as designed in DAR-036.

## 7. State machine reused, not reimplemented

Every transition the CLI performs is validated by the exact same `isValidContentStatusTransition`/`canSubmitForReview`/`canPublish`/`evaluatePublicationEligibility` functions the public routes' repository queries are built around. `incomplete -> review -> approved` (and the two backward transitions, `review -> incomplete` and `approved -> review`) are the only valid content-status moves; a direct `incomplete -> approved` or `approved -> incomplete` is refused with `invalid transition`, the identical rule `editorial.test.ts` already pins.

## 8. Locale handling

`fa`, `en`, `ar` — each fully independent per `(template, locale)` row. FA may be published while EN/AR remain entirely absent (`needs_setup`); nothing in this tool ever copies FA content into EN/AR or marks a locale complete on another locale's behalf. This tool never machine-translates — every `edit`/`batch` call requires the operator (or a prepared batch file) to supply that locale's own text explicitly.

## 9. Import/export (batch)

`batch <path.json>` accepts a JSON array of `{templateXid, locale, h1, slug, intro?, seoTitle?, seoDescription?, bodyJson?}` entries — the exact same field set `edit` accepts, no parallel content format. Every entry is structurally validated (`validateBatchEntry`) and every `templateXid` is resolved against the real database **before any entry is applied** — an unknown XID or a malformed entry aborts the entire batch with zero writes, rather than applying some entries and failing partway through. This is still domain-validated, parameterized (escaped) SQL under the hood — never raw content injected directly into a statement.

## 10. Auditability

Every applied write prints one JSON line (`AUDIT {...}`) to stdout with `timestamp`, `environment`, `entityXid`, `locale`, `action`, `previousState`, `resultingState` — enough for `grep`/redirection into a log file for traceability, without a dedicated audit subsystem. No secret ever appears in this output.

---

## 11. Real template inventory (13 templates, verified live 2026-08-30)

| Template XID | Name | Variants | Group | Standard |
|---|---|---:|---|---|
| `product_tmpl_pf_rhs` | Rectangular Hollow Section (RHS) | 38 | RHS | EN10219-2 |
| `product_tmpl_pf_shs` | Square Hollow Section (SHS) | 29 | SHS | EN10219-2 |
| `product_tmpl_sh_hr_s235jr_plate` | Hot Rolled Plate S235JR | 22 | SHEET_PLATE | EN10029 |
| `product_tmpl_sh_hr_s355jr_plate` | Hot Rolled Plate S355JR | 22 | SHEET_PLATE | EN10029 |
| `product_tmpl_bm_inp` | IPN / INP Beam | 21 | BEAMS | EN10365 |
| `product_tmpl_bm_ipe` | IPE Beam | 18 | BEAMS | EN10365 |
| `product_tmpl_sh_hr_s355jr_sheet` | Hot Rolled Sheet S355JR | 15 | SHEET_PLATE | EN10051 |
| `product_tmpl_sh_hr_s235jr_sheet` | Hot Rolled Sheet S235JR | 15 | SHEET_PLATE | EN10051 |
| `product_tmpl_rb_s240` | Plain Rebar S240 (A1) | 13 | REBAR | INSO3132 |
| `product_tmpl_pp_smls_a106_gr_b` | Seamless Pipe ASTM A106 Gr. B | 12 | SEAMLESS_PIPE | ASMEB36.10M |
| `product_tmpl_rb_aj400` | Ribbed Rebar Aj400 (A3) | 11 | REBAR | INSO3132 |
| `product_tmpl_rb_aj340` | Ribbed Rebar Aj340 (A2) | 11 | REBAR | INSO3132 |
| `product_tmpl_rb_aj500` | Ribbed Rebar Aj500 (A4) | 10 | REBAR | INSO3132 |

(Unchanged from `docs/CATALOG_PUBLIC_ROUTES.md` §2 — repeated here for this document's own self-containedness.)

## 12. Staging launch pilot — 3 templates selected, FA published

`scripts/pilot/staging-launch-pilot.fa.json` is the deterministic, committed, reviewable input used to prepare the first real staging pilot. Three templates were selected for materially different specification shapes (real dimension key sets, verified live — `docs/CATALOG_PUBLIC_ROUTES.md` §2):

| Template | Why selected |
|---|---|
| Ribbed Rebar Aj340 (A2) | REBAR/RIBBED_REBAR — 2-key dimension shape (`diameter_mm`, `length_mm`), the site's highest-volume commodity group |
| Hot Rolled Plate S355JR | SHEET_PLATE/HOT_ROLLED_PLATE — 3-key dimension shape (`width_mm`, `thickness_mm`, `length_mm`), a distinct grade/standard pair (S355JR / EN 10029) |
| Square Hollow Section (SHS) | HOLLOW_SECTIONS_PROFILES/SHS_FORM — 4-key dimension shape (`width_mm`, `height_mm`, `thickness_mm`, `length_mm`), no grade in the Product Master (`grade_code = null`) — a real, different data shape worth proving the presenter and eligibility gate both handle correctly |

Content basis: every number/standard/grade in the pilot copy (diameter/thickness/width ranges, `INSO 3132`, `EN 10029`, `EN 10219-2`, grade codes) was read directly from live DB_PUBLIC (`json_extract` min/max over `dimensions_json` for each template — see DAR-038 for the exact queries run). No price, stock, delivery, or certification claim is made anywhere. FA is the only locale populated, per this task's own "do not delay FA solely because EN/AR aren't ready" instruction.

Applied to **staging only** (left in place, not reverted — this is the deliberate first-launch pilot content):

```bash
node scripts/catalog-editorial.ts batch scripts/pilot/staging-launch-pilot.fa.json --env staging
node scripts/catalog-editorial.ts mark-review <xid> --locale fa --env staging   # x3
node scripts/catalog-editorial.ts approve <xid> --locale fa --env staging       # x3
node scripts/catalog-editorial.ts publish <xid> --locale fa --env staging       # x3
node scripts/catalog-editorial.ts set-public <xid> --env staging                # x3
node scripts/catalog-editorial.ts set-index <xid> --locale fa --status index --env staging   # x3
node scripts/catalog-editorial.ts set-variant-public <variant-xid> --env staging             # x12 (4 per template)
```

For each of the 3 templates, exactly **4 of its real commercial variants** (a small size, mid size, and large size, spanning the family's real range) were additionally marked `is_public = true` — proving the spec table shows only deliberately-selected variants, not the template's entire variant set, without needing every variant individually reviewed before a template can go live.

**Resulting staging state (2026-08-30, real, persisted — see DAR-038 for full command transcript):**

```text
13 templates total, 3 published/visible/indexable (rb_aj340, sh_hr_s355jr_plate, pf_shs)
10 templates remain needs_setup — hidden, exactly as they were before this task
12 of 237 variants marked is_public=true (4 per pilot template) — 225 remain hidden
sitemap.xml: exactly 3 URLs (the 3 pilot template detail pages)
```

**Production was never touched by this pilot** — see §14.

## 13. Route validation against the pilot

Real dev-server requests (`vinext dev`, not a deployment) against a **local D1 mirror** carrying the same real 237-variant commercial data and the identical pilot sequence replayed locally (real remote staging D1 cannot be reached from local dev — no remote-bindings mode exists in the installed `@cloudflare/vite-plugin` version, an established constraint from DAR-035) confirmed:

- `/products` (fa): shows exactly the 3 pilot templates, nothing else.
- `/products/rebar-aj340`, `/products/hot-rolled-plate-s355jr`, `/products/square-hollow-section-shs`: `200`, correct `<title>`/`<meta name="description">`/canonical, `robots: index, follow` (real per-entity indexability — the site-wide pre-launch `noindex` posture on the *listing* page is separate and unchanged), spec table showing exactly the 4 marked-public variants (not all 11/22/29), nominal-weight disclaimer present, zero price/stock/availability text.
- `/products/does-not-exist`: `404`.
- `/en/products`: shows the real empty state (FA published, EN not — locale independence proven through the actual route, not just the database).
- `/sitemap.xml`: exactly 3 `<url>` entries, matching the 3 indexable pilot pages.

A real content bug was caught and fixed during this validation: the pilot's `seoTitle` values initially included a manual `" | آهن آسا"` suffix, duplicating the root layout's own automatic `%s | آهن آسا` title template (`app/[locale]/layout.tsx`) and rendering `"... | آهن آسا | آهن آسا"`. Fixed by removing the manual suffix from `scripts/pilot/staging-launch-pilot.fa.json` and re-applying via `batch` to both the local mirror and real staging — which also served as a live proof that editing already-published content does not disturb its publish state (`previousState: published -> resultingState: published`, unchanged).

## 14. Production safety

Production `DB_PUBLIC` was **only read**, never written, throughout this task. Verified immediately before and after every staging/local write sequence: 237 commercial variants present in both environments throughout; production `is_public` (variant and template) remained `0` on every row; production `product_seo_contents` remained empty; production's own real editorial baseline (established at DAR-036/037: 237/237/0/0) is unchanged. No staging pilot editorial record was copied into production by this task.

## 15. Sync preservation

A real, live sync-preservation check was run against staging: one real, already-published pilot variant (`ahanassa_marketplace.product_rb_aj340_d10_l12`, one of the 4 marked-public REBAR variants) had its `catalog_updated_at` deliberately forced stale via direct SQL (not an Odoo write — a local tracking-timestamp edit only), then a real full sync was run against the live Odoo Public Catalog API. Verified: the variant received a genuine commercial-field `UPDATE` (`sync_version` incremented, `catalog_updated_at` refreshed to the real Odoo value) while its `is_public` flag, and the template's own `product_seo_contents` row (`h1`, `slug`, `content_quality_status`, `published_at`, `index_status`) remained byte-identical throughout — full command transcript and before/after values in DAR-038.

## 16. RFQ boundary (unchanged, not implemented here)

`VariantSpecTable` continues to render `sku` per row and carries `xid` on the underlying data object without displaying it (`docs/CATALOG_PUBLIC_ROUTES.md` §10) — no RFQ preselection wiring was added by this task. Custom RFQ item entry remains the only path from the site's request flow today.

## 17. Pricing / availability boundary

Zero price, stock, or availability claim anywhere in the pilot content or the tool's own output — verified by full-text search of the pilot JSON, the rendered pilot pages, and the CLI's own source.
