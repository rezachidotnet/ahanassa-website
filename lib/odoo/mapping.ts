/**
 * Provisional Odoo object mapping — 01-sources/TECHNICAL_ARCHITECTURE.md
 * §14.3. Documentation only; nothing in lib/odoo/adapter.ts executes
 * against these model names yet (DAR-013 — version/modules/field mapping
 * unresolved). Centralized here per 01-sources/DATA_ARCHITECTURE(1).md §21
 * ("Do not hardcode these mappings across the application") so that when
 * the mapping is approved, this is the one place it gets filled in.
 */
export const PROVISIONAL_ODOO_MAPPING = {
  personOrCompany: { model: "res.partner", gate: "Deduplication and hierarchy rules" },
  opportunity: { model: "crm.lead", gate: "Pipeline, team, source, UTM mapping" },
  rfqHeader: { model: "TBD — custom RFQ model linked to crm.lead, or approved equivalent", gate: "Module/field inspection" },
  rfqItem: { model: "TBD — custom structured RFQ line model", gate: "Required to preserve lines" },
  product: { model: "product.template", gate: "Published subset/field mapping" },
  variant: { model: "product.product", gate: "Attributes and codes" },
  unit: { model: "uom.uom", gate: "Allowed units/conversions" },
} as const;
