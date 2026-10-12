import { test } from "node:test";
import assert from "node:assert/strict";
import { SqliteD1, OPS_MIGRATIONS, PUBLIC_MIGRATIONS } from "../testing/sqlite-d1.ts";
import { handleRfqSubmit } from "./submit.ts";
import { deliverOne } from "./delivery.ts";
import { filesCapability, filesPreflight, handleFileUpload, RFQ_KEY_HEADER } from "./attachments.ts";
import { handleAdmin } from "./admin.ts";
import { ATTACHMENT_WAIT_MS } from "../rfq/intake-store.ts";
import { MAX_RFQ_FILE_BYTES } from "../rfq/attachment-policy.ts";
import type { RfqWorkerEnv } from "./config.ts";

/**
 * D-RFQ-FILE (docs/RFQ_FILE_UPLOAD.md): declared files on POST /api/rfqs,
 * bytes on PUT /api/rfqs/files/<reference>/<slot>, the private R2 write, and
 * the file list in the Odoo `notes`. Real migrations (node:sqlite), an
 * in-memory R2 double that can be told to fail.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonOf = async (r: Response): Promise<any> => r.json();
const ORIGIN = "https://static.example";
const SNAP = "snap-e55d81c754270c1f";
const KEY = "0f8fad5b-d9cb-469f-a165-70867728950e";

class MemoryBucket {
  objects = new Map<string, { bytes: Uint8Array; contentType?: string }>();
  failPut = false;
  puts = 0;
  async put(key: string, value: ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string } }) {
    this.puts++;
    // Pessimistic like workerd in local testing: what was received is kept even when the stream
    // is aborted or the put fails — so only an explicit delete leaves the bucket clean.
    const chunks: Uint8Array[] = [];
    let failure: unknown = null;
    try {
      for await (const chunk of value) chunks.push(chunk);
    } catch (err) {
      failure = err;
    }
    const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    chunks.reduce((at, c) => (bytes.set(c, at), at + c.length), 0);
    this.objects.set(key, { bytes, contentType: options?.httpMetadata?.contentType });
    if (failure) throw failure;
    if (this.failPut) throw new Error("R2 unavailable");
    return { key, etag: `etag-${bytes.length}`, size: bytes.length };
  }
  async get(key: string) {
    const o = this.objects.get(key);
    return o ? { body: new Response(o.bytes as BodyInit).body } : null;
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
}

function setup(overrides: Partial<RfqWorkerEnv> = {}, limiterOk = true) {
  const ops = new SqliteD1([OPS_MIGRATIONS]);
  const pub = new SqliteD1([PUBLIC_MIGRATIONS]);
  const now = new Date().toISOString();
  pub.sqlite.prepare(`INSERT INTO publication_state (version, created_at, status, updated_at) VALUES (?, ?, 'active', ?)`).run(SNAP, now, now);
  pub.sqlite.prepare(`INSERT INTO publication_pointer (id, active_version, updated_at) VALUES (1, ?, ?)`).run(SNAP, now);
  const bucket = new MemoryBucket();
  const limiterKeys: string[] = [];
  const env: RfqWorkerEnv = {
    DB_OPS: ops.asD1(),
    DB_PUBLIC: pub.asD1(),
    RFQ_RATE_LIMITER: { limit: async ({ key }) => (limiterKeys.push(key), { success: limiterOk }) },
    ALLOWED_ORIGINS: ORIGIN,
    TURNSTILE_EXPECTED_HOSTNAMES: "static.example",
    TURNSTILE_SECRET_KEY: "secret",
    ODOO_BASE_URL: "https://stub.example",
    ODOO_RFQ_API_TOKEN: "bearer",
    ODOO_INTAKE_V11: "1",
    RFQ_FILES: bucket as unknown as R2Bucket,
    RFQ_FILES_ENABLED: "1",
    ADMIN_TOKEN: "admin-secret",
    ...overrides,
  };
  return { ops, env, bucket, limiterKeys };
}

const turnstile = (success = true) => (async () => Response.json({ success, action: "rfq_submit", hostname: "static.example" })) as typeof fetch;

function body(attachments: unknown, overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: KEY,
    locale: "fa",
    fullName: "Test Buyer",
    email: "buyer@example.com",
    phoneCountry: "IR",
    phoneLocal: "9121234567",
    message: "لیست پیوست شده",
    items: [{ freeformTitle: "میلگرد ۱۶", quantityText: "12", unit: "ton" }],
    website: "",
    formRenderedAt: Date.now() - 60_000,
    turnstileToken: "token",
    catalogSnapshotVersion: SNAP,
    attachments,
    ...overrides,
  };
}

const submit = (env: RfqWorkerEnv, payload: unknown, fetchImpl = turnstile()) =>
  handleRfqSubmit(new Request("https://api.example/api/rfqs", { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify(payload) }), env, { fetchImpl });

function put(env: RfqWorkerEnv, reference: string, slot: number, bytes: Uint8Array, headers: Record<string, string> = {}) {
  const url = new URL(`https://api.example/api/rfqs/files/${reference}/${slot}`);
  const request = new Request(url, { method: "PUT", headers: { origin: ORIGIN, "content-type": "application/octet-stream", "content-length": String(bytes.length), [RFQ_KEY_HEADER]: KEY, ...headers }, body: bytes as BodyInit });
  return handleFileUpload(request, env, url);
}

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const bytes = (...parts: (string | number[] | Uint8Array)[]) => {
  const chunks = parts.map((p) => (typeof p === "string" ? ascii(p) : Uint8Array.from(p)));
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) out.set(c, (at += c.length) - c.length);
  return out;
};
const filler = (n: number) => new Uint8Array(n).fill(0x41);
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], filler(6000));
/** Zip local headers carry the entry names uncompressed — that is all the scanner needs. */
const XLSX = bytes([0x50, 0x4b, 0x03, 0x04], filler(40), "[Content_Types].xml", filler(9000), "xl/workbook.xml", filler(300));
const XLSM_RENAMED = bytes([0x50, 0x4b, 0x03, 0x04], filler(40), "[Content_Types].xml", filler(9000), "xl/workbook.xml", filler(10), "xl/vbaProject.bin", filler(300));
const ZIP_RENAMED = bytes([0x50, 0x4b, 0x03, 0x04], filler(40), "photos/a.jpg", filler(9000));
const PDF = bytes("%PDF-1.7\n", filler(5000));
const EXE = bytes("MZ", [0x90, 0x00], filler(5000));

async function accepted(env: RfqWorkerEnv, files: { name: string; size: number }[]) {
  const res = await submit(env, body(files));
  assert.equal(res.status, 201);
  return (await jsonOf(res)).reference as string;
}

async function deliver(env: RfqWorkerEnv, ops: SqliteD1, at = new Date(Date.now() + ATTACHMENT_WAIT_MS + 1000)) {
  const rfqId = ops.q("SELECT id FROM rfqs")[0].id as string;
  let sent: Record<string, unknown> | null = null;
  const fetchImpl = (async (_url: string, init: RequestInit) => ((sent = JSON.parse(String(init.body))), Response.json({ data: { reference: "S00042", status: "new" }, meta: { idempotent_replay: false } }, { status: 201 }))) as unknown as typeof fetch;
  const result = await deliverOne(env.DB_OPS, rfqId, { odooBaseUrl: "https://stub.example", token: "bearer", intakeV11: true, fetchImpl, now: () => at });
  return { result, sent: sent as Record<string, unknown> | null };
}

// --- capability / disabled ---------------------------------------------------------

test("capability: enabled only with BOTH the R2 binding and RFQ_FILES_ENABLED=1; preflight allows PUT + X-RFQ-Key", async () => {
  const req = new Request("https://api.example/api/rfqs/files", { headers: { origin: ORIGIN } });
  assert.deepEqual(await jsonOf(filesCapability(req, setup().env)), { ok: true, enabled: true, maxFiles: 5, maxFileBytes: MAX_RFQ_FILE_BYTES, extensions: ["jpg", "jpeg", "png", "webp", "heic", "pdf", "xlsx", "xls", "csv", "docx", "txt"] });
  assert.deepEqual(await jsonOf(filesCapability(req, setup({ RFQ_FILES_ENABLED: "0" }).env)), { ok: true, enabled: false });
  assert.deepEqual(await jsonOf(filesCapability(req, setup({ RFQ_FILES: undefined }).env)), { ok: true, enabled: false });
  const pre = filesPreflight(new Request("https://api.example/api/rfqs/files/AA-RFQ-X/1", { method: "OPTIONS", headers: { origin: ORIGIN } }), [ORIGIN]);
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get("access-control-allow-methods") ?? "", /PUT/);
  assert.match(pre.headers.get("access-control-allow-headers") ?? "", /x-rfq-key/);
  assert.equal(filesPreflight(new Request("https://api.example/api/rfqs/files/AA-RFQ-X/1", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), [ORIGIN]).status, 403);
});

test("upload switched off: an RFQ declaring files is refused (422 uploads_disabled); without files it is accepted as before", async () => {
  const { env, ops } = setup({ RFQ_FILES_ENABLED: "0" });
  const res = await submit(env, body([{ name: "list.xlsx", size: 100 }]));
  assert.equal(res.status, 422);
  assert.deepEqual((await jsonOf(res)).fieldErrors, { attachments: ["uploads_disabled"] });
  assert.equal((await submit(env, body(undefined))).status, 201);
  assert.equal(ops.q("SELECT submission_method m, attachment_count c FROM rfqs")[0].m, "structured");
});

// --- declared-file validation -----------------------------------------------------

test("declared files: macro, executable/archive and unknown extensions, too many and too large files are refused before Turnstile — nothing saved", async () => {
  const { env, ops } = setup();
  let siteverify = 0;
  const counting = (async () => (siteverify++, Response.json({ success: true, action: "rfq_submit", hostname: "static.example" }))) as typeof fetch;
  const cases: [unknown, Record<string, string[]> | string][] = [
    [[{ name: "prices.xlsm", size: 10 }], { "attachments[0].name": ["macro_file"] }],
    [[{ name: "ok.pdf", size: 10 }, { name: "letter.DOCM", size: 10 }], { "attachments[1].name": ["macro_file"] }],
    [[{ name: "setup.exe", size: 10 }], { "attachments[0].name": ["executable_or_archive"] }],
    [[{ name: "drawings.zip", size: 10 }], { "attachments[0].name": ["executable_or_archive"] }],
    [[{ name: "image.svg", size: 10 }], { "attachments[0].name": ["extension_not_allowed"] }],
    [[{ name: "noextension", size: 10 }], { "attachments[0].name": ["extension_not_allowed"] }],
    [Array.from({ length: 6 }, (_, i) => ({ name: `${i}.pdf`, size: 10 })), "too_big"],
    [[{ name: "big.pdf", size: MAX_RFQ_FILE_BYTES + 1 }], "too_big"],
  ];
  for (const [files, expected] of cases) {
    const res = await submit(env, body(files), counting);
    assert.equal(res.status, 422, JSON.stringify(files).slice(0, 80));
    const errors = (await jsonOf(res)).fieldErrors;
    if (typeof expected === "string") assert.ok(Object.values(errors).flat().includes(expected), JSON.stringify(errors));
    else assert.deepEqual(errors, expected);
  }
  assert.equal(siteverify, 0);
  assert.equal(ops.q("SELECT count(*) n FROM rfqs")[0].n, 0);
});

test("Turnstile failure with files declared: 403, no RFQ, no file rows, nothing in R2, no upload possible", async () => {
  const { env, ops, bucket } = setup();
  const res = await submit(env, body([{ name: "list.xlsx", size: XLSX.length }]), turnstile(false));
  assert.equal(res.status, 403);
  assert.equal((await jsonOf(res)).code, "VERIFICATION_FAILED");
  assert.equal(ops.q("SELECT count(*) n FROM rfqs")[0].n, 0);
  assert.equal(ops.q("SELECT count(*) n FROM rfq_attachments")[0].n, 0);
  assert.equal((await put(env, "AA-RFQ-0000000000", 1, XLSX)).status, 404);
  assert.equal(bucket.puts, 0);
});

// --- happy path ------------------------------------------------------------------

test("RFQ with basket rows + 2 files: rows pending, delivery held; uploads land in the PRIVATE bucket under rfq/<reference>/<slot>.<ext>; Odoo notes list them", async () => {
  const { env, ops, bucket, limiterKeys } = setup();
  const reference = await accepted(env, [
    { name: "C:\\Users\\me\\لیست خرید.xlsx", size: XLSX.length },
    { name: "photo.PNG", size: PNG.length },
  ]);
  const rfq = ops.q("SELECT id, submission_method m, attachment_count c FROM rfqs")[0];
  assert.deepEqual([rfq.m, rfq.c], ["mixed", 2]);
  const rows = ops.q("SELECT slot, original_filename, extension, upload_status, scan_status, object_key FROM rfq_attachments ORDER BY slot");
  assert.deepEqual(rows.map((r) => [r.slot, r.original_filename, r.extension, r.upload_status, r.scan_status, r.object_key]), [
    [1, "لیست خرید.xlsx", "xlsx", "pending", "not_configured", `rfq/${reference}/1.xlsx`],
    [2, "photo.PNG", "png", "pending", "not_configured", `rfq/${reference}/2.png`],
  ]);
  const held = Date.parse(ops.q("SELECT available_at a FROM integration_outbox")[0].a as string);
  assert.ok(held - Date.now() > ATTACHMENT_WAIT_MS - 5000, "outbox waits for the files");

  const first = await put(env, reference, 1, XLSX);
  assert.equal(first.status, 201);
  assert.deepEqual(await jsonOf(first), { ok: true, status: "received" });
  assert.ok(Date.parse(ops.q("SELECT available_at a FROM integration_outbox")[0].a as string) > Date.now() + 60_000, "still held: slot 2 pending");
  assert.equal((await put(env, reference, 2, PNG)).status, 201);
  assert.ok(Date.parse(ops.q("SELECT available_at a FROM integration_outbox")[0].a as string) <= Date.now(), "released once no file is pending");
  assert.ok(limiterKeys.some((k) => k.startsWith("files:")), "uploads use their own rate-limit key space");

  assert.deepEqual([...bucket.objects.keys()].sort(), [`rfq/${reference}/1.xlsx`, `rfq/${reference}/2.png`]);
  assert.deepEqual(bucket.objects.get(`rfq/${reference}/2.png`)?.bytes, PNG);
  assert.equal(bucket.objects.get(`rfq/${reference}/1.xlsx`)?.contentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  // Same slot again: idempotent, nothing rewritten.
  assert.equal((await put(env, reference, 2, PNG)).status, 200);
  assert.equal(bucket.puts, 2);

  const { result, sent } = await deliver(env, ops, new Date());
  assert.equal(result.status === "done" && result.classification, "DELIVERED");
  const notes = String(sent?.notes);
  assert.ok(notes.startsWith("لیست پیوست شده\n\n[website] Files with this request: 2 received"), notes);
  assert.match(notes, new RegExp(`1\\. لیست خرید\\.xlsx — \\d+ KB — received — rfq/${reference}/1\\.xlsx`));
  assert.match(notes, new RegExp(`2\\. photo\\.PNG — \\d+ KB — received — rfq/${reference}/2\\.png`));
  assert.equal(Object.hasOwn(sent ?? {}, "attachments"), false, "no new key for Odoo's strict allow-list");
  assert.equal(sent?.website_reference, reference);
});

// --- byte validation ---------------------------------------------------------------

test("bytes: magic-number mismatch, renamed macro workbook, renamed zip and renamed executable are refused; nothing is stored; the RFQ stays", async () => {
  const { env, ops, bucket } = setup();
  const reference = await accepted(env, [
    { name: "a.png", size: PDF.length },
    { name: "b.xlsx", size: XLSM_RENAMED.length },
    { name: "c.xlsx", size: ZIP_RENAMED.length },
    { name: "d.pdf", size: EXE.length },
  ]);
  const expect = [
    [1, PDF, "content_mismatch"],
    [2, XLSM_RENAMED, "macro_file"],
    [3, ZIP_RENAMED, "executable_or_archive"],
    [4, EXE, "executable_or_archive"],
  ] as const;
  for (const [slot, data, reason] of expect) {
    const res = await put(env, reference, slot, data);
    assert.equal(res.status, 422, `slot ${slot}`);
    assert.deepEqual(await jsonOf(res), { ok: false, code: "FILE_REJECTED", reason });
  }
  assert.equal(bucket.objects.size, 0, "a refused file is never left in R2");
  assert.deepEqual(ops.q("SELECT upload_status s, failure_code f FROM rfq_attachments ORDER BY slot").map((r) => `${r.s}:${r.f}`), ["failed:content_mismatch", "failed:macro_file", "failed:executable_or_archive", "failed:executable_or_archive"]);
  assert.equal(ops.q("SELECT count(*) n FROM rfqs")[0].n, 1);
  const { sent } = await deliver(env, ops, new Date());
  assert.match(String(sent?.notes), /0 received, 4 NOT RECEIVED/);
  assert.match(String(sent?.notes), /2\. b\.xlsx — \d+ KB — FILE NOT RECEIVED \(not received — macro file refused\)/);
});

test("R2 write failure: 503 STORAGE_UNAVAILABLE, the RFQ is still saved, the file is flagged not received, Odoo is told so; a retry can still succeed", async () => {
  const { env, ops, bucket } = setup();
  const reference = await accepted(env, [{ name: "list.pdf", size: PDF.length }, { name: "photo.png", size: PNG.length }]);
  bucket.failPut = true;
  const res = await put(env, reference, 1, PDF);
  assert.equal(res.status, 503);
  assert.equal((await jsonOf(res)).code, "STORAGE_UNAVAILABLE");
  assert.equal(ops.q("SELECT count(*) n FROM rfqs")[0].n, 1);
  assert.deepEqual(ops.q("SELECT upload_status s, failure_code f, upload_attempts n FROM rfq_attachments WHERE slot = 1")[0], { s: "failed", f: "storage_error", n: 1 });

  // The browser's single retry works while the list is not frozen.
  bucket.failPut = false;
  assert.equal((await put(env, reference, 2, PNG)).status, 201);
  bucket.failPut = true;
  assert.equal((await put(env, reference, 1, PDF)).status, 503);
  const { result, sent } = await deliver(env, ops, new Date());
  assert.equal(result.status === "done" && result.classification, "DELIVERED");
  assert.match(String(sent?.notes), /1 received, 1 NOT RECEIVED/);
  assert.match(String(sent?.notes), /1\. list\.pdf — \d+ KB — FILE NOT RECEIVED \(not received — storage error\)/);
  assert.equal(bucket.objects.size, 1);
});

test("a file never uploaded: after the wait the delivery freezes the list (not_received); a late upload is refused (409) and nothing is stored; retries send identical notes", async () => {
  const { env, ops, bucket } = setup();
  const reference = await accepted(env, [{ name: "list.csv", size: 40 }]);
  const rfqId = ops.q("SELECT id FROM rfqs")[0].id as string;
  // Odoo is down on the first attempt -> retry; notes must not change between attempts.
  const notes: string[] = [];
  const failing = (async (_u: string, init: RequestInit) => (notes.push(JSON.parse(String(init.body)).notes), new Response("down", { status: 503 }))) as unknown as typeof fetch;
  const later = new Date(Date.now() + ATTACHMENT_WAIT_MS + 1000);
  const first = await deliverOne(env.DB_OPS, rfqId, { odooBaseUrl: "https://stub.example", token: "t", intakeV11: true, fetchImpl: failing, now: () => later });
  assert.equal(first.status === "done" && first.classification, "RETRY_PENDING");
  assert.deepEqual(ops.q("SELECT upload_status s, failure_code f FROM rfq_attachments")[0], { s: "failed", f: "not_received" });

  const late = await put(env, reference, 1, bytes("product,size\nrebar,16\n", filler(18)));
  assert.equal(late.status, 409);
  assert.equal((await jsonOf(late)).code, "UPLOAD_CLOSED");
  assert.equal(bucket.objects.size, 0);

  const again = new Date(later.getTime() + 3 * 60 * 60 * 1000);
  await deliverOne(env.DB_OPS, rfqId, { odooBaseUrl: "https://stub.example", token: "t", intakeV11: true, fetchImpl: failing, now: () => again });
  assert.equal(notes.length, 2);
  assert.equal(notes[0], notes[1]);
  assert.match(notes[0], /1\. list\.csv — 1 KB — FILE NOT RECEIVED \(not received\)/);
});

test("upload guards: wrong key / reference / slot -> 404 (one answer); missing length 411; too large 413; size mismatch 422; rate limit 429; limiter missing 503; bad origin 403", async () => {
  const { env } = setup();
  const reference = await accepted(env, [{ name: "a.png", size: PNG.length }]);
  assert.equal((await put(env, reference, 1, PNG, { [RFQ_KEY_HEADER]: "ffffffff-d9cb-469f-a165-70867728950e" })).status, 404);
  assert.equal((await put(env, "AA-RFQ-ZZZZZZZZZZ", 1, PNG)).status, 404);
  assert.equal((await put(env, reference, 2, PNG)).status, 404);
  assert.equal((await put(env, reference, 9, PNG)).status, 404);
  assert.equal((await put(env, reference, 1, PNG, { "content-length": String(MAX_RFQ_FILE_BYTES + 1) })).status, 413);
  assert.equal((await put(env, reference, 1, PNG.subarray(0, 5000))).status, 422);
  assert.equal((await put(env, reference, 1, PNG, { origin: "https://evil.example" })).status, 403);
  const limited = setup({}, false);
  const ref2 = await accepted(limited.env, [{ name: "a.png", size: PNG.length }]).catch(() => null);
  assert.equal(ref2, null, "the shared limiter also refuses the RFQ itself");
  assert.equal((await put(setup({ RFQ_RATE_LIMITER: { limit: async () => ({ success: false }) } }).env, reference, 1, PNG)).status, 429);
  assert.equal((await put(setup({ RFQ_RATE_LIMITER: undefined }).env, reference, 1, PNG)).status, 503);
  const url = new URL(`https://api.example/api/rfqs/files/${reference}/1`);
  const noLength = new Request(url, { method: "PUT", headers: { origin: ORIGIN, [RFQ_KEY_HEADER]: KEY } });
  assert.equal((await handleFileUpload(noLength, env, url)).status, 411);
});

test("idempotency: the same request with the same files replays (200, same reference); different files under the same key conflict (409)", async () => {
  const { env, ops } = setup();
  const files = [{ name: "a.png", size: PNG.length }];
  const reference = await accepted(env, files);
  const replay = await submit(env, body(files));
  assert.equal(replay.status, 200);
  assert.equal((await jsonOf(replay)).reference, reference);
  assert.equal((await submit(env, body([{ name: "b.png", size: PNG.length }]))).status, 409);
  assert.equal(ops.q("SELECT count(*) n FROM rfq_attachments")[0].n, 1);
});

test("admin: list + download need ADMIN_TOKEN; the download is octet-stream, attachment, nosniff, no-store, and is access-logged", async () => {
  const { env, ops } = setup();
  const reference = await accepted(env, [{ name: "لیست.png", size: PNG.length }]);
  await put(env, reference, 1, PNG);
  const call = (path: string, token = "admin-secret") => handleAdmin(new Request(`https://api.example${path}`, { headers: { authorization: `Bearer ${token}`, "x-admin-actor": "staff" } }), env, new URL(`https://api.example${path}`));
  assert.equal((await call(`/__admin/attachments?reference=${reference}`, "wrong")).status, 404);
  const list = await jsonOf(await call(`/__admin/attachments?reference=${reference}`));
  assert.equal(list.count, 1);
  const id = list.attachments[0].id as string;
  const res = await call(`/__admin/attachments/${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/octet-stream");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.match(res.headers.get("content-disposition") ?? "", /^attachment; filename="1\.png"; filename\*=UTF-8''/);
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), PNG);
  assert.deepEqual(ops.q("SELECT actor, result FROM rfq_attachment_access_log"), [{ actor: "staff", result: "ok" }]);
});
