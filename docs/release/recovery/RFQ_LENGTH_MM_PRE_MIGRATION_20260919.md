# RFQ `length_mm` — Pre-Migration Evidence

**Timestamp (UTC):** 2026-09-19T15:13:34Z
**Database name:** `ahanassa-ops-production`
**Database ID:** `7240a6a7-c293-4e6e-baf3-95838a3c2944`
**Binding:** `DB_OPS` (env `production`)
**Migration to apply:** `migrations/0005_rfq_length_mm.sql`

## Row counts before migration

```
SELECT COUNT(*) FROM rfqs;       -- 3
SELECT COUNT(*) FROM rfq_items;  -- 14
```

## Pending migrations (per `wrangler d1 migrations list`)

```
Migrations to be applied:
┌────────────────────────┐
│ Name                   │
├────────────────────────┤
│ 0005_rfq_length_mm.sql │
└────────────────────────┘
```

Confirms migrations 0001–0004 are already applied to production and 0005 is the only pending migration.

## Schema before migration — `PRAGMA table_info(rfq_items)`

`length_mm` is **absent** (24 columns, cid 0–23).

| cid | name | type | notnull | dflt_value | pk |
|---|---|---|---|---|---|
| 0 | id | TEXT | 0 | null | 1 |
| 1 | rfq_id | TEXT | 1 | null | 0 |
| 2 | line_number | INTEGER | 1 | null | 0 |
| 3 | source | TEXT | 1 | null | 0 |
| 4 | category_ref | TEXT | 0 | null | 0 |
| 5 | product_ref | TEXT | 0 | null | 0 |
| 6 | variant_ref | TEXT | 0 | null | 0 |
| 7 | unit_ref | TEXT | 0 | null | 0 |
| 8 | category_label | TEXT | 0 | null | 0 |
| 9 | product_label | TEXT | 0 | null | 0 |
| 10 | variant_label | TEXT | 0 | null | 0 |
| 11 | unit_label | TEXT | 0 | null | 0 |
| 12 | freeform_title | TEXT | 0 | null | 0 |
| 13 | size_text | TEXT | 0 | null | 0 |
| 14 | quantity_text | TEXT | 1 | null | 0 |
| 15 | quantity_value | INTEGER | 0 | null | 0 |
| 16 | quantity_scale | INTEGER | 0 | null | 0 |
| 17 | description | TEXT | 0 | null | 0 |
| 18 | odoo_product_id | INTEGER | 0 | null | 0 |
| 19 | odoo_uom_id | INTEGER | 0 | null | 0 |
| 20 | resolution_status | TEXT | 1 | 'not_applicable' | 0 |
| 21 | created_at | TEXT | 1 | null | 0 |
| 22 | updated_at | TEXT | 1 | null | 0 |
| 23 | sku_snapshot | TEXT | 0 | null | 0 |

## Migration to be applied

```sql
-- migrations/0005_rfq_length_mm.sql
ALTER TABLE rfq_items ADD COLUMN length_mm INTEGER
  CHECK (length_mm IS NULL OR (length_mm > 0 AND length_mm <= 1000000));
```

Additive, nullable, backward-compatible (`ALTER TABLE ADD COLUMN`); no `DROP`/table recreate. Consistent with the existing `quantity_value` CHECK convention in `0001_rfq_ops_schema.sql`.

Note: the migration file's own header comment states "0 [rfq_items rows] in production" at authoring time; verified-live production now holds 3 `rfqs` / 14 `rfq_items` rows as of this evidence capture. This does not change the migration's safety — the column is nullable with no default, so existing rows are unaffected.
