import { ulid } from "../rfq/ulid.ts";
import type { OdooSyncEvent } from "./types.ts";

/**
 * Pure outbox-event builder (no `cloudflare:workers` import), shared by the
 * legacy SSR route (via lib/queue/outbox.ts) and the standalone RFQ Worker.
 */
export interface OutboxRow {
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  eventType: string;
  schemaVersion: number;
  correlationId: string;
  payloadJson: string;
  availableAt: string;
  createdAt: string;
}

export function buildRfqCreatedEvent(rfqId: string, correlationId: string, occurredAt = new Date().toISOString()): { event: OdooSyncEvent; row: OutboxRow } {
  const eventId = ulid();
  const event: OdooSyncEvent = {
    event_id: eventId,
    event_type: "rfq.created",
    aggregate_id: rfqId,
    aggregate_version: 1,
    occurred_at: occurredAt,
    schema_version: 1,
    correlation_id: correlationId,
  };
  const row: OutboxRow = {
    eventId,
    aggregateType: "rfq",
    aggregateId: rfqId,
    aggregateVersion: 1,
    eventType: "rfq.created",
    schemaVersion: 1,
    correlationId,
    payloadJson: JSON.stringify(event),
    availableAt: occurredAt,
    createdAt: occurredAt,
  };
  return { event, row };
}
