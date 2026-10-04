import { test } from "node:test";
import assert from "node:assert/strict";
import { SqliteD1, OPS_MIGRATIONS } from "../testing/sqlite-d1.ts";
import { runPiiRetention, piiRetentionSummaryMarkdown } from "./pii-retention.ts";

// Fixtures: synthetic RFQs only (no real customer data).
const NOW = new Date("2026-11-15T12:00:00.000Z");
const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();

interface Fixture {
  id: string;
  syncStatus: string;
  reference: string | null;
  syncedDaysAgo: number | null;
  freeform?: boolean;
}

function seed(rows: Fixture[]) {
  const db = new SqliteD1([OPS_MIGRATIONS]);
  for (const r of rows) {
    const t = iso(40 * DAY);
    db.sqlite
      .prepare(
        `INSERT INTO rfqs (id, reference_number, idempotency_key_hash, locale, company_name, project_name, project_city, message, item_count,
           sync_status, odoo_rfq_reference, last_synced_at, submitted_at, created_at, updated_at, payload_fingerprint, catalog_snapshot_version)
         VALUES (?, ?, ?, 'fa', 'Synthetic Co', 'Project X', 'Isfahan', 'call me at 0912 000 0000', 1, ?, ?, ?, ?, ?, ?, ?, 'snap-2026100407093900')`,
      )
      .run(r.id, `AA-RFQ-${r.id}`, `hash-${r.id}`, r.syncStatus, r.reference, r.syncedDaysAgo === null ? null : iso(r.syncedDaysAgo * DAY), t, t, t, `fp-${r.id}`);
    db.sqlite
      .prepare(
        `INSERT INTO rfq_contacts (rfq_id, full_name, job_title, phone_iso2, phone_country_code, phone_national, phone_e164, email_normalized, country_code, city, preferred_contact_method, created_at, updated_at)
         VALUES (?, 'Synthetic Person', 'Buyer', 'IR', '98', '9120000000', '+989120000000', 'buyer@example.test', 'IR', 'Isfahan', 'phone', ?, ?)`,
      )
      .run(r.id, t, t);
    db.sqlite
      .prepare(
        `INSERT INTO rfq_items (id, rfq_id, line_number, source, variant_ref, variant_label, freeform_title, size_text, quantity_text, quantity_value, quantity_scale, description, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?, 'Rebar Ø16', ?, '16mm', '200 ton', 200, 0, 'deliver to my house', ?, ?)`,
      )
      .run(`item-${r.id}`, r.id, r.freeform ? "freeform" : "selected", r.freeform ? null : "CVAR-000008", r.freeform ? "special beam" : null, t, t);
  }
  return db;
}

const rfq = (db: SqliteD1, id: string) => db.sqlite.prepare("SELECT * FROM rfqs WHERE id = ?").get(id) as Record<string, unknown>;
const contact = (db: SqliteD1, id: string) => db.sqlite.prepare("SELECT * FROM rfq_contacts WHERE rfq_id = ?").get(id) as Record<string, unknown>;
const item = (db: SqliteD1, id: string) => db.sqlite.prepare("SELECT * FROM rfq_items WHERE rfq_id = ?").get(id) as Record<string, unknown>;

const FIXTURES: Fixture[] = [
  { id: "old1", syncStatus: "synced", reference: "ODOO-1", syncedDaysAgo: 31 },
  { id: "old2", syncStatus: "synced", reference: "ODOO-2", syncedDaysAgo: 35, freeform: true },
  { id: "fresh", syncStatus: "synced", reference: "ODOO-3", syncedDaysAgo: 10 },
  { id: "noref", syncStatus: "synced", reference: null, syncedDaysAgo: 60 },
  { id: "failed", syncStatus: "failed", reference: null, syncedDaysAgo: null },
  { id: "manual", syncStatus: "manual_review", reference: null, syncedDaysAgo: null },
  { id: "pending", syncStatus: "pending", reference: null, syncedDaysAgo: null },
  { id: "retry", syncStatus: "retry", reference: null, syncedDaysAgo: null },
];

test("dry run counts and writes nothing", async () => {
  const db = seed(FIXTURES);
  const before = JSON.stringify(db.sqlite.prepare("SELECT * FROM rfqs ORDER BY id").all());
  const r = await runPiiRetention(db as unknown as D1Database, { now: NOW, dryRun: true });
  assert.deepEqual({ unstamped: r.unstamped, stamped: r.stamped, due: r.due, purged: r.purged, remainingDue: r.remainingDue, undelivered: r.undelivered }, { unstamped: 3, stamped: 3, due: 2, purged: 2, remainingDue: 0, undelivered: 5 });
  assert.equal(JSON.stringify(db.sqlite.prepare("SELECT * FROM rfqs ORDER BY id").all()), before);
  assert.match(piiRetentionSummaryMarkdown(r, "test"), /DRY RUN/);
});

test("delivered for 30+ days: personal fields cleared, non-personal record kept, retention_until set", async () => {
  const db = seed(FIXTURES);
  const keep = rfq(db, "old1");
  const r = await runPiiRetention(db as unknown as D1Database, { now: NOW });
  assert.equal(r.purged, 2);
  assert.equal(r.remainingDue, 0);
  for (const id of ["old1", "old2"]) {
    const row = rfq(db, id);
    assert.equal(row.company_name, null);
    assert.equal(row.project_city, null);
    assert.equal(row.message, null);
    assert.equal(row.pii_purged_at, NOW.toISOString());
    for (const k of ["id", "reference_number", "idempotency_key_hash", "sync_status", "odoo_rfq_reference", "payload_fingerprint", "catalog_snapshot_version", "submitted_at", "created_at", "updated_at", "last_synced_at", "item_count"]) {
      if (id === "old1") assert.equal(row[k], keep[k], k);
      else assert.notEqual(row[k], null, k);
    }
    const c = contact(db, id);
    assert.equal(c.full_name, "");
    for (const k of ["job_title", "phone_iso2", "phone_country_code", "phone_national", "phone_e164", "email_normalized", "country_code", "city", "preferred_contact_method"]) assert.equal(c[k], null, k);
    const it = item(db, id);
    assert.equal(it.description, null);
    assert.equal(it.size_text, null);
    assert.equal(it.quantity_text, "");
    assert.equal(it.quantity_value, 200, "parsed quantity kept");
    assert.equal(it.variant_label, "Rebar Ø16", "catalog label kept");
  }
  assert.equal(item(db, "old2").freeform_title, "", "free-text title cleared, line identity CHECK still satisfied");
  assert.equal(item(db, "old1").variant_ref, "CVAR-000008");
  // retention_until = delivery + 30 days.
  assert.equal(rfq(db, "old1").retention_until, new Date(NOW.getTime() - 31 * DAY + 30 * DAY).toISOString());
});

test("never clears an undelivered RFQ, and not before 30 days", async () => {
  const db = seed(FIXTURES);
  await runPiiRetention(db as unknown as D1Database, { now: NOW });
  for (const id of ["fresh", "noref", "failed", "manual", "pending", "retry"]) {
    assert.equal(rfq(db, id).pii_purged_at, null, id);
    assert.equal(rfq(db, id).company_name, "Synthetic Co", id);
    assert.equal(contact(db, id).email_normalized, "buyer@example.test", id);
    assert.equal(item(db, id).description, "deliver to my house", id);
  }
  assert.equal(rfq(db, "fresh").retention_until, new Date(NOW.getTime() - 10 * DAY + 30 * DAY).toISOString(), "a delivered row gets retention_until even before it is due");
  for (const id of ["noref", "failed", "manual", "pending", "retry"]) assert.equal(rfq(db, id).retention_until, null, `${id}: undelivered rows get no retention_until`);
});

test("one bounded batch per run; the next run continues; a purged row is never touched again", async () => {
  const many: Fixture[] = Array.from({ length: 7 }, (_, i) => ({ id: `d${i}`, syncStatus: "synced", reference: `ODOO-${i}`, syncedDaysAgo: 40 + i }));
  const db = seed(many);
  const first = await runPiiRetention(db as unknown as D1Database, { now: NOW, batch: 3 });
  assert.deepEqual([first.due, first.purged, first.remainingDue], [7, 3, 4]);
  assert.equal(rfq(db, "d6").pii_purged_at, NOW.toISOString(), "oldest first");
  const later = new Date(NOW.getTime() + 3_600_000);
  const second = await runPiiRetention(db as unknown as D1Database, { now: later, batch: 3 });
  assert.deepEqual([second.due, second.purged, second.remainingDue, second.alreadyPurged], [4, 3, 1, 3]);
  assert.equal(rfq(db, "d6").pii_purged_at, NOW.toISOString(), "first purge time kept");
  const third = await runPiiRetention(db as unknown as D1Database, { now: later, batch: 3 });
  assert.deepEqual([third.purged, third.remainingDue, third.alreadyPurged], [1, 0, 6]);
  const idle = await runPiiRetention(db as unknown as D1Database, { now: later, batch: 3 });
  assert.equal(idle.purged, 0);
});

test("a row that leaves the delivered state between selection and purge is not cleared", async () => {
  const db = seed([{ id: "x", syncStatus: "synced", reference: "ODOO-9", syncedDaysAgo: 45 }]);
  const real = db.batch.bind(db);
  (db as unknown as { batch: typeof db.batch }).batch = async (stmts) => {
    db.sqlite.exec("UPDATE rfqs SET sync_status = 'retry', odoo_rfq_reference = NULL WHERE id = 'x'");
    return real(stmts);
  };
  const r = await runPiiRetention(db as unknown as D1Database, { now: NOW });
  assert.equal(r.purged, 0);
  assert.equal(contact(db, "x").email_normalized, "buyer@example.test");
});

test("parameters are validated (retention days, batch)", async () => {
  const db = seed([]);
  await assert.rejects(runPiiRetention(db as unknown as D1Database, { now: NOW, retentionDays: 0 }), /retentionDays/);
  await assert.rejects(runPiiRetention(db as unknown as D1Database, { now: NOW, batch: 1.5 }), /batch/);
});
