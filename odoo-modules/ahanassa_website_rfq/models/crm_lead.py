from odoo import fields, models


class CrmLead(models.Model):
    _inherit = "crm.lead"

    x_website_rfq_reference = fields.Char(
        string="Website RFQ Reference",
        help="Public reference (AA-RFQ-...) assigned by the Ahan Asa website's RFQ intake system. "
        "Set once at creation by the website's Odoo sync adapter and never changed afterwards. "
        "The unique constraint below is this field's whole purpose: it lets the sync adapter safely "
        "retry/redeliver without ever creating a duplicate lead for the same website RFQ.",
        readonly=True,
        copy=False,
        index=True,
    )

    # Odoo 19 replaces the old `_sql_constraints` list attribute (silently
    # ignored as of this version -- confirmed live: installing this module
    # with the old syntax logged "Model attribute '_sql_constraints' is no
    # longer supported" and created no constraint) with a models.Constraint
    # table object. Name must start with "_"; the DB constraint becomes
    # crm_lead_uniq_x_website_rfq_reference.
    _uniq_x_website_rfq_reference = models.Constraint(
        "UNIQUE (x_website_rfq_reference)",
        "A website RFQ reference must be unique across CRM leads.",
    )
