# RFQ PII retention (website side)

**Owner decision 2026-10-04 (`docs/OWNER_DECISIONS.md`):** customer data is kept in **Odoo without a time
limit** — Odoo is the system of record. The website's `DB_OPS` copy is only a **delivery buffer**.
Architecture V1.1 §13.4 (its 90-day default is replaced by this decision).

## Rule

| RFQ state | What happens |
|---|---|
| Delivered: `sync_status = 'synced'` **and** `odoo_rfq_reference` present | `retention_until` = `last_synced_at` + **30 days** [parameter]. When it has passed, the personal fields are cleared. |
| Anything else (`pending`, `queued`, `syncing`, `retry`, `failed`, `manual_review`, or no Odoo reference) | **Never cleared**, no `retention_until`. |

Cleared (the personal fields):

| Table | Columns |
|---|---|
| `rfqs` | `company_name`, `project_name`, `project_city` (delivery location), `message` |
| `rfq_contacts` | `full_name` (→ `''`, the column is NOT NULL), `job_title`, `phone_iso2`, `phone_country_code`, `phone_national`, `phone_e164`, `email_normalized`, `country_code`, `city`, `preferred_contact_method` |
| `rfq_items` (customer free text) | `freeform_title` (→ `''` when present: the line's identity CHECK needs a non-null value), `size_text`, `quantity_text` (→ `''`, NOT NULL), `description` |

Kept (non-personal): ids, `reference_number`, `odoo_rfq_reference`, `idempotency_key_hash`,
`payload_fingerprint`, `catalog_snapshot_version`, `locale`, `sync_status` and sync bookkeeping, all
timestamps, `retention_until`, `pii_purged_at`; per line the catalog refs and labels, parsed
`quantity_value`/`quantity_scale`, `length_mm`; the status history, outbox (identifiers only), attempts
(no payload) and admin actions.

**IP address and user agent:** `DB_OPS` stores neither. The RFQ Worker uses the client IP only as an
in-memory rate-limit key and logs no payload (architecture §13.1), so there is nothing to clear.

**D1 Time Travel:** Cloudflare keeps point-in-time restore history of a D1 database (7 days on Workers Free,
30 days on paid plans). A cleared value can therefore remain recoverable from that history for that long
after the purge; it is not readable through any application path.

## Job

- **Where:** a step of the CI reconciler job (`.github/workflows/rfq-ci-reconciler.yml` on `main`), after
  delivery — **not** a Worker cron (the account is at 5/5 cron triggers). It runs whenever the reconciler runs
  (about hourly: the Odoo-server timer and GitHub `schedule`).
- **Code:** `lib/rfq/pii-retention.ts` (`runPiiRetention`), CLI `scripts/rfq/pii-retention.ts`.
- **Bounded:** each run writes `retention_until` for at most 500 delivered rows and clears at most **25** RFQs
  (one atomic batch: contacts, items, then the RFQ row with `pii_purged_at`); the rest is left for the next
  runs, oldest first. Every statement repeats the delivered predicate, so a row that leaves the delivered state
  between selection and purge is not touched.
- **Dry run:** `--dry-run true` (workflow input `retention_dry_run`) counts and writes nothing.
- **Output:** counts only — never an RFQ id, reference or personal value (stdout JSON + job summary).
- **Schema:** migration `0008_rfq_pii_retention.sql` adds `rfqs.pii_purged_at` and an index;
  `rfqs.retention_until` exists since `0001`.

```bash
node scripts/rfq/pii-retention.ts --config workers/rfq/wrangler.jsonc --env staging --database DB_OPS \
  --retention-days 30 --batch 25 --dry-run true
```

Parameters (architecture §20, no new version needed): retention days (30), batch (25).

## Failure

The step fails only when it cannot run (D1 unreachable, schema missing). The reconciler job then fails and
e-mails like every other failed run (`docs/OPS_ALERTS.md`). Delivery is not affected: the step runs after it.

## Production

Not run against production yet. W8: apply migration `0008` to production `DB_OPS`, then add the same step to the
production reconciler job.
