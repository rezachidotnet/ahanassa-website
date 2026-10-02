import { test } from "node:test";
import assert from "node:assert/strict";
import { SqliteD1, OPS_MIGRATIONS } from "../testing/sqlite-d1.ts";
import { deliveryHealth, healthSummaryMarkdown } from "./health.ts";

function insert(ops: SqliteD1, id: string, syncStatus: string, minutesAgo: number, now: Date, reference: string | null = null) {
  const at = new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  ops.sqlite
    .prepare(`INSERT INTO rfqs (id, reference_number, idempotency_key_hash, locale, sync_status, odoo_rfq_reference, submitted_at, created_at, updated_at) VALUES (?, ?, ?, 'en', ?, ?, ?, ?, ?)`)
    .run(id, `AA-RFQ-${id}`, `h-${id}`, syncStatus, reference, at, at, at);
}

test("delivery health (§15): undelivered = pending/queued/syncing/retry without an Odoo reference; age buckets; manual_review and retry counts", async () => {
  const now = new Date("2026-10-02T12:00:00.000Z");
  const ops = new SqliteD1([OPS_MIGRATIONS]);
  const empty = await deliveryHealth(ops.asD1(), now);
  assert.deepEqual({ ...empty, checkedAt: undefined }, { checkedAt: undefined, undelivered: 0, undeliveredOver15m: 0, undeliveredOver30m: 0, oldestUndeliveredSubmittedAt: null, oldestUndeliveredAgeMinutes: null, retry: 0, manualReview: 0 });
  insert(ops, "A1", "pending", 5, now);
  insert(ops, "A2", "queued", 20, now);
  insert(ops, "A3", "retry", 95, now);
  insert(ops, "A4", "syncing", 31, now);
  insert(ops, "A5", "manual_review", 300, now);
  insert(ops, "A6", "failed", 400, now); // closed by an admin
  insert(ops, "A7", "synced", 500, now, "RFQ-1");
  const h = await deliveryHealth(ops.asD1(), now);
  assert.equal(h.undelivered, 4);
  assert.equal(h.undeliveredOver15m, 3);
  assert.equal(h.undeliveredOver30m, 2);
  assert.equal(h.oldestUndeliveredAgeMinutes, 95);
  assert.equal(h.retry, 1);
  assert.equal(h.manualReview, 1);
  const md = healthSummaryMarkdown(h, "staging", { attempted: 1, delivered: 1 });
  assert.match(md, /❌ 2 RFQ\(s\) undelivered for more than 30 min/);
  assert.match(md, /\| MANUAL_REVIEW \| 1 \|/);
});
