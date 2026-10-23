import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { familyFetch } from "./family-fetch.ts";
import { signS3, s3Client } from "./s3.ts";
import { NodeD1 } from "./sqlite-d1.ts";
import { loadMigrations } from "./migrations.ts";
import { loadVariantIndex, listVersions } from "./public-index.ts";
import { resolveVariantsFromIndex } from "../rfq-worker/variant-index.ts";
import { purgeConfirmed, maintain } from "./retention.ts";
import { FsBucket } from "./fs-bucket.ts";
import { backupHourly, backupOffsite } from "./backup.ts";
import { assertNoPii, baleSender, newRfqNotice } from "./bale.ts";
import { alertOnChange, healthStatus } from "./health.ts";
import { SlidingWindowLimiter } from "./rate-limiter.ts";
import { buildOutboundRfqIdempotencyKey } from "../odoo/rfq-payload-mapper.ts";
import { makeWorld } from "../testing/rfq-ir-world.ts";
import { forwardOnce } from "./forwarder.ts";
import { loadConfig } from "./config.ts";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "rfq-node-parts-"));

const serve = (host: string) =>
  new Promise<{ port: number; close: () => Promise<void>; hits: string[] }>((resolve) => {
    const hits: string[] = [];
    const s = http.createServer((req, res) => {
      hits.push(req.socket.remoteFamily ?? "?");
      res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ ok: true }));
    });
    s.listen(0, host, () => resolve({ port: (s.address() as { port: number }).port, hits, close: () => new Promise((r) => s.close(() => r())) }));
  });

test("familyFetch(6): IPv6 ONLY — reaches a server on ::1, never falls back to IPv4 (P0: v4 to *.ahanassa.com is SNI-filtered)", async (t) => {
  const v6 = await serve("::1").catch(() => null);
  if (!v6) return t.skip("no IPv6 loopback on this machine");
  const v4 = await serve("127.0.0.1");
  try {
    const res = await familyFetch(6)(`http://localhost:${v6.port}/api/v1/rfq`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(res.status, 201);
    assert.deepEqual(v6.hits, ["IPv6"]);
    // A host that only answers on IPv4 is a network error for familyFetch(6) — no silent IPv4 attempt.
    await assert.rejects(familyFetch(6)(`http://localhost:${v4.port}/x`, { signal: AbortSignal.timeout(3000) }));
    assert.deepEqual(v4.hits, []);
    // And the lookup asks for AAAA only: a name with only an A record fails.
    await assert.rejects(familyFetch(6, { lookup: (_h, _o, cb) => (cb as (e: Error | null) => void)(Object.assign(new Error("ENODATA"), { code: "ENODATA" })) })(`http://example.invalid:${v6.port}/`));
    // familyFetch(4) for the IPv4-only hosts (Bale, Arvan S3, GitHub).
    assert.equal((await familyFetch(4)(`http://localhost:${v4.port}/`)).status, 201);
  } finally {
    await v6.close();
    await v4.close();
  }
});

test("familyFetch: the caller's AbortSignal bounds the request (Odoo timeout → classified as a network timeout)", async () => {
  const s = http.createServer(() => {});
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", () => r()));
  try {
    const port = (s.address() as { port: number }).port;
    await assert.rejects(familyFetch(4)(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(200) }), (e: Error) => e.name === "AbortError");
  } finally {
    s.closeAllConnections();
    s.close();
  }
});

test("S3 SigV4: the AWS documented 'GET Object' example (same vector as the Python activator's test)", () => {
  const h = signS3("GET", "https://examplebucket.s3.amazonaws.com/test.txt", { region: "us-east-1", accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" }, createHash("sha256").update("").digest("hex"), new Date("2013-05-24T00:00:00Z"), { Range: "bytes=0-9" });
  assert.equal(h.Authorization, "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
});

test("S3 client: PUT carries the body's real SHA-256 + x-amz-meta-sha256; HEAD reads size and that metadata back", async () => {
  const seen: { method: string; url: string; headers: Headers; body?: unknown }[] = [];
  const fetchImpl = async (url: string | URL, init?: RequestInit) => {
    seen.push({ method: String(init?.method), url: String(url), headers: new Headers(init?.headers), body: init?.body });
    return init?.method === "HEAD" ? new Response(null, { status: 200, headers: { "content-length": "3", "x-amz-meta-sha256": "abc" } }) : new Response("", { status: 200 });
  };
  // W35: the Arvan files bucket (path-style, region ir-thr-at1).
  const c = s3Client({ endpoint: "https://s3.ir-thr-at1.arvanstorage.ir", bucket: "ahanassa-rfq-files-ir", region: "ir-thr-at1", accessKeyId: "k", secretAccessKey: "s" }, fetchImpl);
  await c.put("rfq-files/AA-RFQ-1/1.png", Buffer.from("abc"), { sha256: "abc", contentType: "image/png" });
  assert.equal(seen[0].url, "https://s3.ir-thr-at1.arvanstorage.ir/ahanassa-rfq-files-ir/rfq-files/AA-RFQ-1/1.png");
  assert.match(seen[0].headers.get("authorization") ?? "", /Credential=k\/\d{8}\/ir-thr-at1\/s3\/aws4_request/);
  assert.equal(seen[0].headers.get("x-amz-content-sha256"), createHash("sha256").update("abc").digest("hex"));
  assert.equal(seen[0].headers.get("x-amz-meta-sha256"), "abc");
  assert.match(seen[0].headers.get("authorization") ?? "", /SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date;x-amz-meta-sha256/);
  assert.deepEqual(await c.head("rfq-files/AA-RFQ-1/1.png"), { status: 200, size: 3, sha256: "abc" });
});

test("Odoo key prefix: rfq-ir-<ulid> (disjoint from the Worker's rfq-<ulid>), Odoo's key regex holds; nothing else is accepted as a prefix", () => {
  const id = "01JAAAAAAAAAAAAAAAAAAAAAAA";
  assert.equal(buildOutboundRfqIdempotencyKey(id), `rfq-${id}`);
  assert.equal(buildOutboundRfqIdempotencyKey(id, "rfq-ir-"), `rfq-ir-${id}`);
  assert.match(buildOutboundRfqIdempotencyKey(id, "rfq-ir-"), /^[A-Za-z0-9._~-]{1,128}$/);
  for (const bad of ["", "ir-", "rfq-ir", "rfq-IR-", "rfq-a b-"]) assert.throws(() => buildOutboundRfqIdempotencyKey(id, bad), bad);
});

test("NodeD1: migrations are recorded once (a restart applies nothing twice); batch is atomic", async () => {
  const dir = tmp();
  const m = loadMigrations();
  const file = path.join(dir, "ops.sqlite");
  const a = new NodeD1(file, m.ops);
  assert.equal(a.q("SELECT name FROM d1_migrations").length, m.ops.length);
  a.close();
  const b = new NodeD1(file, m.ops);
  assert.deepEqual(b.migrate(m.ops), []);
  await assert.rejects(b.batch([b.prepare(`INSERT INTO rfq_admin_actions (id, action, reason, actor, result, created_at) VALUES ('x', 'retry', 'r', 'a', 'ok', 'now')`), b.prepare(`INSERT INTO rfq_admin_actions (id, action, reason, actor, result, created_at) VALUES ('x', 'retry', 'r', 'a', 'ok', 'now')`)]));
  assert.equal(b.q("SELECT 1 FROM rfq_admin_actions").length, 0, "the first insert was rolled back");
  assert.equal((fs.statSync(file).mode & 0o777).toString(8), "600");
  b.close();
  fs.rmSync(dir, { recursive: true });
});

test("variant index: loaded from the release file, active version switched, the last 5 snapshot versions kept (a visitor on an older page still validates)", async () => {
  const dir = tmp();
  const pub = new NodeD1(":memory:", loadMigrations().public);
  const sel = (id: string) => JSON.stringify({ variantXid: id, templateXid: "CTMPL-000007", sku: `SKU-${id}`, variantSpecLabel: "Ø16", productLabel: "Rebar", templateSlug: "rebar", categoryCode: "LONG", categoryLabel: "x", groupCode: "REBAR" });
  const versions = Array.from({ length: 7 }, (_, i) => `snap-${String(i).repeat(16)}`);
  versions.forEach((v, i) => {
    const f = path.join(dir, `${i}.json`);
    fs.writeFileSync(f, JSON.stringify({ snapshot_version: v, rows: [{ snapshot_version: v, locale: "fa", canonical_variant_id: `CVAR-00000${i}`, template_id: "CTMPL-000007", group_code: "REBAR", allowed_units: ["ton"], selection_json: sel(`CVAR-00000${i}`) }] }));
    const r = loadVariantIndex(pub, f, new Date(Date.UTC(2026, 9, 22, 0, i)));
    assert.equal(r.changed, true);
    assert.equal(loadVariantIndex(pub, f, new Date(Date.UTC(2026, 9, 22, 0, i, 30))).changed, false, "reloading the same release is a no-op");
  });
  assert.deepEqual(listVersions(pub), versions.slice(2).reverse());
  const res = await resolveVariantsFromIndex(pub.asD1(), "fa", ["CVAR-000003", "CVAR-000006"], versions[3]);
  assert.equal(res.activeVersion, versions[6]);
  assert.equal(res.variants.get("CVAR-000003")?.unpublishedAtReceipt, true);
  assert.equal(res.variants.get("CVAR-000006")?.unpublishedAtReceipt, false);
  assert.throws(() => loadVariantIndex(pub, (fs.writeFileSync(path.join(dir, "bad.json"), '{"snapshot_version":"x","rows":[]}'), path.join(dir, "bad.json"))));
  fs.rmSync(dir, { recursive: true });
});

test("D-IR-1 buffer: an RFQ is purged 30 days after Odoo confirmed it (all rows, outbox, IR bookkeeping); never while undelivered or while a file is still held", async () => {
  const w = await makeWorld();
  try {
    await w.submit(1);
    await w.submit(2);
    const { reference: withFile } = await w.submit(3, [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Uint8Array(100)])]);
    // Deliver #1 and #3 (the file goes as v1.2 → local copy retained 30 days); #2 stays undelivered (Odoo cut).
    const ids = w.ops.q<{ id: string; reference_number: string }>(`SELECT id, reference_number FROM rfqs ORDER BY submitted_at`);
    w.ops.sqlite.prepare(`UPDATE integration_outbox SET available_at = '2999-01-01T00:00:00Z' WHERE aggregate_id = ?`).run(ids[1].id);
    for (let i = 0; i < 6; i++) await forwardOnce(w.deps());
    assert.equal(w.ops.q(`SELECT 1 FROM rfqs WHERE odoo_rfq_reference IS NOT NULL`).length, 2);
    const bucket = new FsBucket(path.join(w.dir, "data", "files"));
    const day = 86_400_000;
    const at = (days: number) => new Date(w.clock.now.getTime() + days * day);
    assert.equal(purgeConfirmed(w.ops, at(29), 30, 100), 0);
    const r = await maintain(w.ops, bucket, at(31));
    assert.equal(r.files.deleted, 1, "the v1.2-confirmed file is deleted after 30 days");
    assert.equal(r.purged, 2);
    assert.deepEqual(w.ops.q<{ reference_number: string }>(`SELECT reference_number FROM rfqs`).map((x) => x.reference_number), [ids[1].reference_number]);
    for (const t of ["rfq_contacts", "rfq_items", "rfq_attachments", "ir_file_remote", "ir_notices"]) assert.equal(w.ops.q(`SELECT 1 FROM ${t} t WHERE NOT EXISTS (SELECT 1 FROM rfqs r WHERE r.id = ${t === "ir_file_remote" ? "(SELECT rfq_id FROM rfq_attachments a WHERE a.id = t.attachment_id)" : "t.rfq_id"})`).length, 0, t);
    assert.equal(w.ops.q(`SELECT 1 FROM integration_outbox`).length, 1);
    assert.equal(w.ops.q(`SELECT 1 FROM integration_attempts a JOIN integration_outbox o ON o.event_id = a.event_id`).length, w.ops.q(`SELECT 1 FROM integration_attempts`).length);
    assert.equal(fs.existsSync(path.join(w.dir, "data", "files", "rfq-files", withFile)), false);
    // 400 days later the undelivered one is still there.
    await maintain(w.ops, bucket, at(400));
    assert.equal(w.ops.q(`SELECT 1 FROM rfqs`).length, 1);
  } finally {
    await w.close();
  }
});

test("backups: hourly copy is age-encrypted to the owner key (decrypts to a valid DB); no plaintext left; 24 hourly / 7 daily kept; offsite = DB + undelivered files only", async (t) => {
  const age = spawnSync("age", ["--version"]);
  if (age.status !== 0) return t.skip("age is not installed");
  const dir = tmp();
  execFileSync("age-keygen", ["-o", path.join(dir, "key.txt")], { stdio: "ignore" });
  const recipient = /public key: (age1[0-9a-z]+)/.exec(fs.readFileSync(path.join(dir, "key.txt"), "utf8"))![1];
  const w = await makeWorld();
  try {
    await w.submit(1, [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Uint8Array(50)])]);
    const cfg = { dir: path.join(dir, "b"), ageRecipient: recipient, keepHourly: 3, keepDaily: 2 };
    for (let h = 0; h < 5; h++) await backupHourly(w.ops, cfg, new Date(Date.UTC(2026, 9, 22 + Math.floor(h / 2), h)));
    assert.equal(fs.readdirSync(path.join(cfg.dir, "hourly")).length, 3);
    assert.equal(fs.readdirSync(path.join(cfg.dir, "daily")).length, 2);
    assert.deepEqual(fs.readdirSync(path.join(cfg.dir, ".work")), [], "no plaintext copy left behind");
    const last = fs.readdirSync(path.join(cfg.dir, "hourly")).sort().at(-1)!;
    const enc = fs.readFileSync(path.join(cfg.dir, "hourly", last));
    assert.ok(enc.subarray(0, 21).toString().startsWith("age-encryption.org/v1"));
    assert.ok(!enc.includes(Buffer.from("Buyer 1")));
    execFileSync("age", ["-d", "-i", path.join(dir, "key.txt"), "-o", path.join(dir, "restored.sqlite"), path.join(cfg.dir, "hourly", last)]);
    const restored = new NodeD1(path.join(dir, "restored.sqlite"));
    assert.equal(restored.q<{ full_name: string }>(`SELECT full_name FROM rfq_contacts`)[0].full_name, "Buyer 1");
    restored.close();
    const puts: string[] = [];
    const s3 = { put: async (k: string, b: Buffer) => (puts.push(`${k}:${b.length}`), { status: 200 }), head: async () => ({ status: 200, size: Number(puts.at(-1)!.split(":")[1]), sha256: null }) };
    const off = await backupOffsite(w.ops, cfg, path.join(w.dir, "data", "files"), s3, "staging", new Date(Date.UTC(2026, 9, 25, 3)));
    assert.deepEqual(off.uploaded, ["ahanassa-rfq/staging/20261025/ops.sqlite.age", "ahanassa-rfq/staging/20261025/undelivered-files.tar.age"]);
    await assert.rejects(backupHourly(w.ops, { ...cfg, ageRecipient: "" }), /age recipient/);
  } finally {
    await w.close();
    fs.rmSync(dir, { recursive: true });
  }
});

test("Bale: a notice carries reference + counts only; a text with an e-mail or phone number is refused before sending; the token never appears in a log", async () => {
  const notice = newRfqNotice("production", "AA-RFQ-12345678", 3, 1);
  assert.equal(notice, "درخواست جدید (سرور داخلی) AA-RFQ-12345678: ۳ قلم، ۱ فایل. جزئیات در پنل داخلی.");
  assert.doesNotThrow(() => assertNoPii(notice), "an all-digit reference is not a phone number");
  assert.throws(() => assertNoPii("call 0912 123 4567"));
  assert.throws(() => assertNoPii("buyer@example.com"));
  assert.throws(() => assertNoPii("۰۹۱۲۱۲۳۴۵۶۷"));
  const calls: string[] = [];
  const logs: string[] = [];
  const orig = console.error;
  console.error = (m: string) => logs.push(m);
  try {
    const send = baleSender({ token: "123:SECRET", chatId: "-100" }, async (u) => (calls.push(String(u)), new Response('{"ok":false}', { status: 403 })));
    assert.equal(await send("hello"), false);
  } finally {
    console.error = orig;
  }
  assert.deepEqual(calls, ["https://tapi.bale.ai/bot123:SECRET/sendMessage"]);
  assert.ok(logs.every((l) => !l.includes("SECRET")));
});

test("health: state-change alerts only (one when a condition starts, one when it clears); an undeliverable alert is retried", async () => {
  const w = await makeWorld();
  try {
    await w.submit(1);
    w.ops.sqlite.prepare(`UPDATE rfqs SET submitted_at = ?`).run(new Date(Date.now() - 2 * 3_600_000).toISOString());
    const sent: string[] = [];
    let up = true;
    const notify = async (t: string) => (up ? (sent.push(t), true) : false);
    const status = (intakeUp = true) => healthStatus({ db: w.ops, now: new Date(), intakeUp, forwarderAgeMs: 1000, diskFreeRatio: 0.9 });
    assert.deepEqual(status().conditions, ["outbox_old"]);
    up = false;
    assert.deepEqual(await alertOnChange(w.ops, status(), "staging", notify), []);
    up = true;
    assert.equal((await alertOnChange(w.ops, status(), "staging", notify)).length, 1, "retried");
    assert.equal((await alertOnChange(w.ops, status(), "staging", notify)).length, 0, "no repeat");
    assert.equal((await alertOnChange(w.ops, status(false), "staging", notify)).length, 1);
    w.ops.sqlite.exec(`UPDATE rfqs SET odoo_rfq_reference = 'S1', sync_status = 'synced'`);
    const cleared = await alertOnChange(w.ops, status(), "staging", notify);
    assert.equal(cleared.length, 2);
    assert.ok(cleared.every((t) => t.includes("cleared")));
    assert.ok(sent.every((t) => !/Buyer|example\.com/.test(t)));
  } finally {
    await w.close();
  }
});

test("sliding-window limiter: 20 per 60 s per key, exact", async () => {
  let now = 0;
  const l = new SlidingWindowLimiter(20, 60_000, () => now);
  for (let i = 0; i < 20; i++) assert.equal((await l.limit({ key: "a" })).success, true);
  assert.equal((await l.limit({ key: "a" })).success, false);
  assert.equal((await l.limit({ key: "b" })).success, true);
  now = 60_001;
  assert.equal((await l.limit({ key: "a" })).success, true);
});

test("W35 example configs: ALTCHA, the Arvan files bucket per env + the shared Arvan backup bucket, owner's age recipient; arCaptcha and R2 are gone; loadConfig refuses the old keys", () => {
  for (const env of ["staging", "production"] as const) {
    const file = path.resolve(import.meta.dirname, `../../deploy/iran/etc/rfq-${env}.json.example`);
    const text = fs.readFileSync(file, "utf8");
    assert.ok(!/arcaptcha|r2\.cloudflarestorage|"r2"|r2_wait/i.test(text), file);
    const c = loadConfig(file);
    assert.deepEqual(c.captcha, { provider: "altcha" });
    assert.deepEqual(c.files_store, { endpoint: "https://s3.ir-thr-at1.arvanstorage.ir", bucket: env === "production" ? "ahanassa-rfq-files-ir" : "ahanassa-rfq-files-ir-staging", region: "ir-thr-at1" });
    assert.deepEqual(c.backup?.offsite, { endpoint: "https://s3.ir-thr-at1.arvanstorage.ir", bucket: "ahanassa-backup-ir", region: "ir-thr-at1" });
    assert.equal(c.backup?.age_recipient, "age18an8579663dnnpznpqvwcm5w8h9z9cx5tutavuzq582k90h0udhsellxh6");
    const old = { ...JSON.parse(text), captcha: { provider: "arcaptcha", site_key: "k" } };
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "w35-cfg-")), "c.json");
    fs.writeFileSync(tmp, JSON.stringify(old));
    assert.throws(() => loadConfig(tmp), /captcha\.provider must be altcha/);
    const { files_store: _drop, ...noStore } = JSON.parse(text);
    fs.writeFileSync(tmp, JSON.stringify({ ...noStore, r2: { endpoint: "https://x", bucket: "b", region: "auto" }, r2_wait_ms: 7200000 }));
    assert.throws(() => loadConfig(tmp), /files_store/);
  }
});

test("W35: processes opening a fresh ops.sqlite at the same moment (intake + forwarder at rfq-units) all succeed; each migration recorded once", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "w35-race-"));
  try {
    const file = path.join(dir, "ops.sqlite");
    const script = `import { NodeD1 } from ${JSON.stringify(path.resolve(import.meta.dirname, "sqlite-d1.ts"))};
import { loadMigrations } from ${JSON.stringify(path.resolve(import.meta.dirname, "migrations.ts"))};
const m = loadMigrations();
new NodeD1(process.argv[1], [...m.ops, ...m.ir.map((x) => ({ ...x, name: "ir/" + x.name }))]);`;
    const runs = await Promise.all(
      Array.from({ length: 8 }, () =>
        new Promise<{ code: number | null; err: string }>((resolve) => {
          const c = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", script, file], { stdio: ["ignore", "ignore", "pipe"] });
          let err = "";
          c.stderr.on("data", (d) => (err += d));
          c.on("exit", (code) => resolve({ code, err }));
        }),
      ),
    );
    assert.deepEqual(runs.map((r) => r.code), Array(8).fill(0), runs.map((r) => r.err).join("\n"));
    const db = new NodeD1(file);
    const names = db.q<{ name: string; n: number }>(`SELECT name, count(*) AS n FROM d1_migrations GROUP BY name`);
    const m = loadMigrations();
    assert.equal(names.length, m.ops.length + m.ir.length);
    assert.ok(names.every((r) => Number(r.n) === 1));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
