{
    "name": "Ahan Asa Website RFQ Integration",
    "version": "19.0.1.0.0",
    "summary": "Adds a unique, staff-visible website RFQ reference field to CRM leads for idempotent website RFQ sync.",
    "description": """
Adds `crm.lead.x_website_rfq_reference` (Char, unique, readonly, indexed) so the
Ahan Asa website's RFQ-to-Odoo sync adapter has a real, database-enforced
idempotency guard that does not require the integration user to hold the
broad `base.group_erp_manager` ("Access Rights") group.

Background: the website adapter's primary idempotency guard is Cloudflare D1
(`integration_mappings`), checked before this Odoo model is ever called. This
field is defense-in-depth for the narrow crash window between a successful
`crm.lead` create and the D1 mapping write landing -- see
lib/odoo/mapping.ts / lib/odoo/adapter.ts in the ahanassa-website repository
for the full design rationale (DOCUMENT_AUDIT_REPORT.md DAR-026/DAR-027).

Follows the same pattern as the existing cyan_crm_reference* modules already
installed on this database.
""",
    "category": "Sales/CRM",
    "author": "Ahan Asa",
    "license": "LGPL-3",
    "depends": ["crm"],
    "installable": True,
    "application": False,
    "auto_install": False,
}
