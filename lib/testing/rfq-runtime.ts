import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SqliteD1, OPS_MIGRATIONS, PUBLIC_MIGRATIONS } from "./sqlite-d1.ts";
import { NodeD1 } from "../rfq-node/sqlite-d1.ts";
import { FsBucket } from "../rfq-node/fs-bucket.ts";
import { loadMigrations } from "../rfq-node/migrations.ts";

/**
 * W32 (W29 P2 §3.2): the RFQ Worker test suites run against BOTH runtimes.
 *
 *   RFQ_TEST_RUNTIME unset / "worker"   the D1 stand-in (in-memory SQLite, lib/testing/sqlite-d1.ts) + an in-memory
 *                                       R2 double — the Cloudflare Worker's semantics, as before W32
 *   RFQ_TEST_RUNTIME=node               the PRODUCTION Node adapters of the domestic intake: NodeD1 on a WAL file with
 *                                       the migrations recorded in d1_migrations (+ the IR-only tables), FsBucket on
 *                                       disk — exactly what iransrv runs
 *
 * lib/rfq-node/dual-runtime.test.ts re-runs lib/rfq-worker/{rfq-worker,attachments}.test.ts with
 * RFQ_TEST_RUNTIME=node, so `npm test` fails if a test passes on the Worker and fails on Node.
 */
export const RFQ_TEST_RUNTIME: "worker" | "node" = process.env.RFQ_TEST_RUNTIME === "node" ? "node" : "worker";

/** The surface both runtimes' DB objects share (NodeD1 is structurally the D1 stand-in plus file handling). */
export type TestDb = SqliteD1;

let tmpRoot: string | null = null;
function tmpDir(): string {
  tmpRoot ??= fs.mkdtempSync(path.join(os.tmpdir(), "rfq-node-test-"));
  return fs.mkdtempSync(path.join(tmpRoot, "x-"));
}
process.on("exit", () => {
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
});

export function makeDb(kind: "ops" | "public"): TestDb {
  if (RFQ_TEST_RUNTIME === "worker") return new SqliteD1([kind === "ops" ? OPS_MIGRATIONS : PUBLIC_MIGRATIONS]);
  const m = loadMigrations();
  const migrations = kind === "ops" ? [...m.ops, ...m.ir.map((x) => ({ ...x, name: `ir/${x.name}` }))] : m.public;
  return new NodeD1(path.join(tmpDir(), `${kind}.sqlite`), migrations) as unknown as TestDb;
}

export interface TestBucket {
  objects: Map<string, { bytes: Uint8Array; contentType?: string }>;
  failPut: boolean;
  puts: number;
}

/** Worker runtime: in-memory R2 double, pessimistic like workerd in local testing (what was received is kept even
 *  when the stream is aborted or the put fails — so only an explicit delete leaves the bucket clean). */
export class MemoryBucket implements TestBucket {
  objects = new Map<string, { bytes: Uint8Array; contentType?: string }>();
  failPut = false;
  puts = 0;
  async put(key: string, value: ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string } }) {
    this.puts++;
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

/** Node runtime: the production FsBucket, plus the same test hooks (failPut keeps what was written, like above). */
export class TestFsBucket extends FsBucket implements TestBucket {
  failPut = false;
  puts = 0;
  private readonly types = new Map<string, string | undefined>();
  async put(key: string, value: ReadableStream<Uint8Array> | Uint8Array | string, options?: { httpMetadata?: { contentType?: string } }) {
    this.puts++;
    const stored = await super.put(key, value, options);
    this.types.set(key, options?.httpMetadata?.contentType);
    if (this.failPut) throw new Error("R2 unavailable");
    return stored;
  }
  get objects(): Map<string, { bytes: Uint8Array; contentType?: string }> {
    const out = new Map<string, { bytes: Uint8Array; contentType?: string }>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (!e.name.includes(".part-")) {
          const key = path.relative(this.root, p).split(path.sep).join("/");
          out.set(key, { bytes: new Uint8Array(fs.readFileSync(p)), contentType: this.types.get(key) });
        }
      }
    };
    walk(this.root);
    return out;
  }
}

export function makeBucket(): TestBucket & { asR2?: () => R2Bucket } {
  return RFQ_TEST_RUNTIME === "worker" ? new MemoryBucket() : new TestFsBucket(path.join(tmpDir(), "files"));
}
