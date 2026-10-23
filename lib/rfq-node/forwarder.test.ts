import { test } from "node:test";
import assert from "node:assert/strict";
import { forwardOnce, reclaimOnStart, sendNotices } from "./forwarder.ts";
import { makeWorld, PDF, PNG, sha256, type World } from "../testing/rfq-ir-world.ts";

/**
 * W32 (W29 P2 go/no-go 3): the domestic forwarder against the real HTTP intake, the repository's Odoo stub (Odoo's
 * idempotency semantics, contract v1.2) and an R2 that can be cut. "Cutoff" = every outbound call fails like a
 * filtered network (Odoo, R2 and arCaptcha alike).
 */
const MIN = 60_000;

/** Runs forwarder steps until nothing is due, advancing the clock when idle/waiting. */
async function drain(w: World, deps: ReturnType<World["deps"]>, minutes: number): Promise<string[]> {
  const actions: string[] = [];
  const until = w.clock.now.getTime() + minutes * MIN;
  while (w.clock.now.getTime() < until) {
    const step = await forwardOnce(deps);
    actions.push(step.action === "delivered" && step.result.status === "done" ? step.result.classification : step.action);
    // As the service loop: time passes only when nothing is due.
    if (step.action === "idle") w.clock.advance(MIN);
  }
  return actions;
}

const undelivered = (w: World) => Number(w.ops.q<{ n: number }>(`SELECT count(*) n FROM rfqs WHERE odoo_rfq_reference IS NULL`)[0].n);

test("cutoff simulation: all egress dropped → 10 submits stored (201) → 2 h of failures lose nothing → restored → each delivered ONCE, files in R2 sha256-checked, received_at = acceptance time", async () => {
  const w = await makeWorld();
  try {
    // 1. Cut: Odoo and R2 (abroad) unreachable. arCaptcha is domestic (Arvan) and still answers in a real cutoff;
    //    the world's cut() also drops it, so it is lifted only for the moment of each submit (fail-closed captcha).
    const files = new Map<number, Uint8Array[]>();
    const subs = [];
    for (let i = 0; i < 10; i++) {
      const f = i % 3 === 0 ? [PNG, PDF] : [];
      files.set(i, f);
      w.cut(false);
      const s = await w.submit(i, f);
      w.cut(true);
      subs.push({ i, ...s });
    }
    assert.deepEqual(subs.map((s) => s.status), Array(10).fill(201));
    assert.equal(undelivered(w), 10);

    // 2. Two hours of cutoff: every step fails fast; nothing is dropped, nothing reaches Odoo.
    const deps = w.deps();
    const during = await drain(w, deps, 120);
    assert.ok(during.includes("RETRY_PENDING"), during.join(","));
    assert.ok(during.includes("waiting_for_r2"));
    assert.equal(w.odooCalls.length, 0);
    assert.equal(undelivered(w), 10);
    assert.equal(w.ops.q(`SELECT 1 FROM rfqs WHERE sync_status NOT IN ('pending', 'retry')`).length, 0, "no RFQ left in a terminal or claimed state");

    // 3. Restored: everything goes out; the first success makes the network-failed retries due at once.
    w.cut(false);
    await drain(w, deps, 15);
    assert.equal(undelivered(w), 0, "all delivered within 15 min of the link returning");

    // Exactly once per RFQ in Odoo: 10 stub rows, 10 × 201, no 409, keys rfq-ir-<ulid>.
    const created = w.stubDb.q<{ idempotency_key: string; received_at: string; website_reference: string }>(`SELECT idempotency_key, received_at, website_reference FROM stub_rfqs`);
    assert.equal(created.length, 10);
    assert.equal(w.odooCalls.filter((c) => c.status === 201).length, 10);
    assert.equal(w.odooCalls.filter((c) => c.status === 409).length, 0);
    const rows = w.ops.q<{ id: string; reference_number: string; submitted_at: string }>(`SELECT id, reference_number, submitted_at FROM rfqs`);
    for (const r of rows) {
      const odoo = created.find((c) => c.idempotency_key === `rfq-ir-${r.id}`);
      assert.ok(odoo, `rfq-ir-${r.id} in Odoo`);
      assert.equal(odoo.website_reference, r.reference_number);
      assert.equal(Date.parse(odoo.received_at), Date.parse(r.submitted_at), "received_at = the domestic acceptance time");
    }
    // [website-ir] first notes line on every RFQ.
    assert.ok(w.odooCalls.every((c) => String(c.body.notes ?? "").startsWith("[website-ir]")));

    // Files: 4 RFQs × 2 in R2 under the v1.2 key, bytes sha256-identical to what the customer sent; sent as v1.2.
    assert.equal(w.r2.size, 8);
    for (const s of subs.filter((x) => files.get(x.i)!.length)) {
      const sent = files.get(s.i)!;
      sent.forEach((bytes, n) => {
        const key = `rfq-files/${s.reference}/${n + 1}.${bytes[0] === 0x89 ? "png" : "pdf"}`;
        assert.equal(sha256(w.r2.get(key)!.body), sha256(bytes), key);
        assert.equal(w.r2.get(key)!.sha256, sha256(bytes));
      });
      const call = w.odooCalls.find((c) => c.status === 201 && c.body.website_reference === s.reference)!;
      const att = call.body.attachments as { key: string; sha256: string }[];
      assert.equal(att.length, 2);
      assert.deepEqual(att.map((a) => a.sha256), sent.map(sha256));
    }
    assert.equal(w.ops.q(`SELECT 1 FROM rfqs WHERE attachment_count > 0 AND attachments_channel = 'odoo_v12'`).length, 4);
  } finally {
    await w.close();
  }
});

test("crash between Odoo's answer and the result batch: the restarted forwarder re-sends the same key + payload → 200 replay, no duplicate", async () => {
  const w = await makeWorld();
  try {
    await w.submit(1);
    let crash = true;
    const crashing = w.deps({ afterPost: () => { if (crash) throw new Error("SIGKILL"); } });
    await assert.rejects(forwardOnce(crashing), /SIGKILL/);
    assert.equal(w.ops.q<{ sync_status: string }>(`SELECT sync_status FROM rfqs`)[0].sync_status, "syncing");
    assert.equal(w.stubDb.q(`SELECT 1 FROM stub_rfqs`).length, 1, "Odoo already has it");

    // The restart: a `syncing` row is this forwarder's own dead run → due at once (no 15-minute wait).
    crash = false;
    assert.equal(reclaimOnStart(w.ops, w.clock.now), 1);
    const step = await forwardOnce(w.deps());
    assert.equal(step.action, "delivered");
    assert.equal(step.action === "delivered" && step.result.status === "done" && step.result.httpStatus, 200);
    assert.deepEqual(w.odooCalls.map((c) => c.status), [201, 200]);
    assert.equal(w.odooCalls[0].key, w.odooCalls[1].key);
    assert.deepEqual(w.odooCalls[0].body, w.odooCalls[1].body, "byte-identical payload on the retry");
    assert.equal(w.stubDb.q(`SELECT 1 FROM stub_rfqs`).length, 1, "still ONE RFQ in Odoo");
    assert.equal(w.ops.q<{ sync_status: string }>(`SELECT sync_status FROM rfqs`)[0].sync_status, "synced");
  } finally {
    await w.close();
  }
});

test("R2 unreachable but Odoo up: the RFQ waits IR_R2_WAIT_MS, then goes on the notes channel naming the domestic admin view; the channel is kept", async () => {
  const w = await makeWorld();
  try {
    const { reference } = await w.submit(2, [PNG]);
    const base = w.deps({ r2WaitMs: 30 * MIN });
    const failingR2 = { ...base, r2: { put: async () => { throw new TypeError("fetch failed"); }, head: async () => { throw new TypeError("fetch failed"); } } };
    const actions = await drain(w, failingR2, 25);
    assert.ok(actions.every((a) => a === "waiting_for_r2" || a === "idle"), actions.join(","));
    assert.equal(w.odooCalls.length, 0);
    await drain(w, failingR2, 10);
    assert.equal(w.odooCalls.length, 1);
    const sent = w.odooCalls[0].body;
    assert.equal("attachments" in sent, false);
    assert.match(String(sent.notes), /^\[website-ir\]\n/);
    assert.match(String(sent.notes), /held on the domestic server; open with https:\/\/api-staging\.ahanassa\.ir\/__admin\/ir\//);
    assert.match(String(sent.notes), new RegExp(`received — rfq-files/${reference}/1\\.png`));
    assert.equal(w.ops.q<{ c: string }>(`SELECT attachments_channel c FROM rfqs`)[0].c, "notes");
    assert.equal(w.r2.size, 0);
    assert.ok(w.ops.q<{ last_error: string }>(`SELECT last_error FROM ir_file_remote`)[0].last_error.startsWith("r2_"));
  } finally {
    await w.close();
  }
});

test("oldest first, one in flight: deliveries follow submitted_at; never two Odoo calls at once; no maximum age (a 40-day-old RFQ still goes)", async () => {
  const w = await makeWorld();
  try {
    for (const i of [1, 2, 3]) await w.submit(i);
    const ids = w.ops.q<{ id: string }>(`SELECT id FROM rfqs ORDER BY id`).map((r) => r.id);
    // Make the LAST one the oldest, 40 days old.
    const old = new Date(w.clock.now.getTime() - 40 * 86_400_000).toISOString();
    w.ops.sqlite.prepare(`UPDATE rfqs SET submitted_at = ? WHERE id = ?`).run(old, ids[2]);
    let inFlight = 0;
    let maxInFlight = 0;
    const deps = w.deps();
    const odoo = deps.odooFetch;
    deps.odooFetch = async (u, i) => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      try {
        return await odoo(u, i);
      } finally {
        inFlight--;
      }
    };
    await drain(w, deps, 3);
    assert.equal(maxInFlight, 1);
    const order = w.odooCalls.map((c) => c.key.replace("rfq-ir-", ""));
    assert.deepEqual(order, [ids[2], ids[0], ids[1]]);
    assert.equal(undelivered(w), 0);
  } finally {
    await w.close();
  }
});

test("Odoo 401 (iransrv bearer wrong/revoked): retried with backoff, never dropped; MANUAL_REVIEW only for a 4xx payload problem", async () => {
  const w = await makeWorld();
  try {
    await w.submit(4);
    const step = await forwardOnce(w.deps({ odooToken: "wrong" }));
    assert.equal(step.action === "delivered" && step.result.status === "done" && step.result.classification, "RETRY_PENDING_ALERT");
    assert.equal(w.ops.q<{ s: string; e: string }>(`SELECT sync_status s, last_sync_error_code e FROM rfqs`)[0].s, "retry");
    w.clock.advance(3 * MIN);
    await drain(w, w.deps(), 3);
    assert.equal(undelivered(w), 0);
  } finally {
    await w.close();
  }
});

test("new-RFQ Bale notice: reference + counts only, sent once; a failed send is retried", async () => {
  const w = await makeWorld();
  try {
    const { reference } = await w.submit(5, [PNG]);
    const texts: string[] = [];
    let up = false;
    const notify = async (t: string) => (up ? (texts.push(t), true) : false);
    assert.equal(await sendNotices({ ...w.deps(), notify }), 0);
    up = true;
    assert.equal(await sendNotices({ ...w.deps(), notify }), 1);
    assert.equal(await sendNotices({ ...w.deps(), notify }), 0);
    assert.equal(texts.length, 1);
    assert.ok(texts[0].includes(reference));
    assert.ok(!/Buyer|example\.com|912/.test(texts[0]), texts[0]);
  } finally {
    await w.close();
  }
});
