/**
 * Odoo-sync queue event envelope — 01-sources/TECHNICAL_ARCHITECTURE.md
 * §14.4. Payloads stay minimal (identifiers only); the consumer re-reads
 * authoritative data from D1 rather than trusting queue-carried copies
 * (01-sources/DATA_ARCHITECTURE(1).md §26).
 */
export interface OdooSyncEvent {
  event_id: string;
  event_type: "rfq.created";
  aggregate_id: string;
  aggregate_version: number;
  occurred_at: string;
  schema_version: number;
  correlation_id: string;
}

export function isOdooSyncEvent(value: unknown): value is OdooSyncEvent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.event_id === "string" &&
    v.event_type === "rfq.created" &&
    typeof v.aggregate_id === "string" &&
    typeof v.aggregate_version === "number" &&
    typeof v.occurred_at === "string" &&
    typeof v.schema_version === "number" &&
    typeof v.correlation_id === "string"
  );
}
