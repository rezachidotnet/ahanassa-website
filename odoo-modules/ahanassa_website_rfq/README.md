# ahanassa_website_rfq

Small custom Odoo 19 module, installed live on `ahanassa` (`odoo.ahanassa.com`, container `odoo-ahantorob`) on 2026-08-29. Not part of the Cloudflare Worker deployment — this is server-side Odoo code, versioned here for review/reproducibility. See `DOCUMENT_AUDIT_REPORT.md` DAR-027 and `../../lib/odoo/mapping.ts` (`RFQ_REFERENCE_MAPPING`) in the main repository for the full design rationale.

## What it does

Adds one field to `crm.lead`:

- `x_website_rfq_reference` — `Char`, readonly, indexed, holding the website's public `AA-RFQ-...` reference.
- A real Postgres `UNIQUE` constraint (`crm_lead_uniq_x_website_rfq_reference`) enforces that at most one lead can ever hold a given reference.

## Why it exists

The website's RFQ→Odoo sync adapter (`lib/odoo/adapter.ts` in the main repo) needs a database-enforced idempotency guard so that Cloudflare Queues' at-least-once redelivery — or a crash between a successful `crm.lead` create and the website's own D1 mapping write — can never create a duplicate lead for the same RFQ.

The first working design (DAR-026) reused Odoo's own `ir.model.data` external-ID table, which has exactly this kind of unique index natively. That design was rejected before any credential was issued: in this Odoo install, the *only* group with any access to `ir.model.data` is `base.group_erp_manager` ("Access Rights"), which also grants full CRUD (including delete) on 28 other technical/admin models — `res.groups`, `ir.model.access`, `ir.model.fields`, `res.users`, `res.company`, and more. Handing a website-integration API key that group was judged a disproportionate blast radius for what is really just one narrow "does this RFQ already exist?" check.

This module gives the same DB-level guarantee on a purpose-built field instead, so the ongoing integration user only ever needs ordinary `sales_team.group_sale_salesman`-level `crm.lead`/`res.partner` access — no elevated technical group.

## Odoo 19 note

Odoo 19 silently ignores the old `_sql_constraints` model attribute (logs `"Model attribute '_sql_constraints' is no longer supported"` and creates no constraint). This module uses the replacement `models.Constraint` table-object API. This was caught live during first install of this exact module — see the git history of `models/crm_lead.py` / the provisioning session transcript for the before/after.

## Deployment

Deployed via `scp` to the host path `/opt/odoo/addons/ahanassa_website_rfq` (bind-mounted into the `odoo-ahantorob` container at `/mnt/extra-addons`, per `addons_path` in the container's `odoo.conf`), ownership `messagebus:messagebus` to match sibling addon directories, then:

```bash
docker exec odoo-ahantorob odoo -d ahanassa -i ahanassa_website_rfq --stop-after-init --no-http --log-level=info
```

(`--no-http` avoids the "Address already in use" error from the already-running server holding port 8069; a later change would use `-u ahanassa_website_rfq` instead of `-i` to upgrade in place.)

Verified live afterwards via read-only Postgres introspection (`information_schema.columns`, `pg_constraint`) — see DAR-027 for the full trail.

## Uninstalling

Standard Odoo module uninstall (Settings → Apps → this module → Uninstall, or the ORM equivalent `env['ir.module.module'].search([('name','=','ahanassa_website_rfq')]).button_immediate_uninstall()`) drops the field and constraint cleanly since both are owned by this module's own `ir.model.data` records — no manual schema cleanup needed. Not verified live in this pass (no reason to uninstall a module just installed); documented for future reference only.
