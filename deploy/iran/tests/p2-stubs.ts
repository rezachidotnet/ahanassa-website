/**
 * W32/W35 Docker rehearsal (docker-rehearsal-p2.sh): the outside world of the domestic RFQ intake, as TLS servers inside
 * a `--network none` container. Bundled on the host with esbuild (no npm in the container).
 *
 *   [::1]:9444      IPv6 ONLY — "abroad": odoo.ahanassa.com (the repository's own Odoo stub, workers/odoo-stub, contract
 *                   v1.2, Odoo's idempotency semantics). The cutoff drill drops this port with ip6tables.
 *   127.0.0.1:9443  "domestic" (iptables NATs 127.0.0.3:443 here): tapi.bale.ai and, W35, s3.ir-thr-at1.arvanstorage.ir —
 *                   an S3 PUT/HEAD store (path style /<bucket>/<key>, SigV4 header with region ir-thr-at1, the body's
 *                   x-amz-content-sha256 checked) standing in for ArvanCloud Object Storage. No captcha service: the
 *                   intake issues and verifies its own ALTCHA challenges.
 *
 *   GET /__test/stats on either: what each stub received (for the rehearsal's assertions).
 *   /tmp/odoo-slow (file exists): Odoo answers 8 s AFTER it stored the RFQ — the crash drill kills the forwarder then.
 */
import fs from "node:fs";
import https from "node:https";
import { createHash } from "node:crypto";
import stub from "../../../workers/odoo-stub/index.ts";
import { NodeD1 } from "../../../lib/rfq-node/sqlite-d1.ts";
// @ts-expect-error -- esbuild text loader (bundled by p2-prep.ts)
import schemaSql from "../../../workers/odoo-stub/schema.sql";

const [certFile, keyFile] = process.argv.slice(2);
const tls = { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) };
const stubDb = new NodeD1(":memory:", [{ name: "schema.sql", sql: schemaSql as unknown as string }]);
const stubEnv = { STUB_DB: stubDb.asD1(), STUB_BEARER: "rehearsal-ir-bearer", STUB_CONTRACT: "1.2", CONTROL_TOKEN: "c" };
const objects = new Map<string, { bucket: string; sha256: string; meta: string | null; bytes: number }>();
const storeFamilies: string[] = [];
const bale: string[] = [];
const odooFamilies: string[] = [];
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

function body(req: import("node:http").IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

const stats = () => ({
  odoo_rfqs: stubDb.q(`SELECT idempotency_key, received_at, website_reference FROM stub_rfqs ORDER BY created_at`),
  odoo_requests: stubDb.q(`SELECT key, status FROM stub_requests ORDER BY id`),
  odoo_families: odooFamilies,
  store: Object.fromEntries(objects),
  store_families: storeFamilies,
  bale,
});

const abroad = https.createServer(tls, async (req, res) => {
  const host = (req.headers.host ?? "").split(":")[0];
  const data = await body(req);
  if (req.url === "/__test/stats") return void res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(stats()));
  if (host === "odoo.ahanassa.com") {
    odooFamilies.push(req.socket.remoteFamily ?? "?");
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const answer = await stub.fetch(new Request(`https://odoo.ahanassa.com${req.url}`, { method: req.method, headers, body: req.method === "POST" ? (data as unknown as BodyInit) : undefined }), stubEnv as never);
    if (fs.existsSync("/tmp/odoo-slow")) await new Promise((r) => setTimeout(r, 8_000));
    res.writeHead(answer.status, { "content-type": "application/json" });
    return void res.end(Buffer.from(await answer.arrayBuffer()));
  }
  res.writeHead(404).end();
});

const domestic = https.createServer(tls, async (req, res) => {
  const host = (req.headers.host ?? "").split(":")[0];
  const data = await body(req);
  if (req.url === "/__test/stats") return void res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(stats()));
  if (host === "s3.ir-thr-at1.arvanstorage.ir") {
    storeFamilies.push(req.socket.remoteFamily ?? "?");
    if (!/^AWS4-HMAC-SHA256 Credential=AKREHEARSAL\/\d{8}\/ir-thr-at1\/s3\/aws4_request,/.test(String(req.headers.authorization ?? ""))) return void res.writeHead(403).end();
    const [, bucket = "", ...rest] = (req.url ?? "").split("/");
    const key = `${bucket}/${decodeURIComponent(rest.join("/"))}`;
    if (req.method === "PUT") {
      if (req.headers["x-amz-content-sha256"] !== sha(data)) return void res.writeHead(400).end("XAmzContentSHA256Mismatch");
      objects.set(key, { bucket, sha256: sha(data), meta: (req.headers["x-amz-meta-sha256"] as string) ?? null, bytes: data.length });
      return void res.writeHead(200, { etag: `"${sha(data).slice(0, 32)}"` }).end();
    }
    if (req.method === "HEAD") {
      const o = objects.get(key);
      if (!o) return void res.writeHead(404).end();
      return void res.writeHead(200, { "content-length": String(o.bytes), ...(o.meta ? { "x-amz-meta-sha256": o.meta } : {}) }).end();
    }
  }
  if (host === "tapi.bale.ai" && /^\/bot[^/]+\/sendMessage$/.test(req.url ?? "")) {
    bale.push(String((JSON.parse(data.toString()) as { text?: string }).text));
    return void res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true,"result":{"message_id":1}}');
  }
  res.writeHead(404).end();
});

abroad.listen(9444, "::1", () => console.log("abroad stub on [::1]:9444"));
domestic.listen(9443, "127.0.0.1", () => console.log("domestic stub on 127.0.0.1:9443"));
