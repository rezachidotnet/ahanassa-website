import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import type http from "node:http";
import stub from "../../workers/odoo-stub/index.ts";
import { NodeD1 } from "../rfq-node/sqlite-d1.ts";
import { createIntake, listen } from "../rfq-node/server.ts";
import { intakeEnv, openStores } from "../rfq-node/env.ts";
import { loadVariantIndex } from "../rfq-node/public-index.ts";
import type { ForwarderDeps } from "../rfq-node/forwarder.ts";
import type { S3Client } from "../rfq-node/s3.ts";
import type { IrConfig } from "../rfq-node/config.ts";

/**
 * W32 test world: the domestic intake as it runs on iransrv, in one process — the real node:http server on loopback
 * (production entry of the RFQ Worker, NodeD1 files, FsBucket), the repository's Odoo stub (workers/odoo-stub,
 * contract v1.2, Odoo's idempotency semantics) and an in-memory R2. `cut()` drops ALL egress (Odoo, R2, arCaptcha):
 * every call throws like a filtered network, which is what an international cutoff looks like from iransrv.
 */
export const ORIGIN = "https://staging.ahanassa.ir";
export const SNAP = "snap-e55d81c754270c1f";
export const ARC_SITE_KEY = "arc-site-key-test";
const realFetch = globalThis.fetch;
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

export const PNG = (() => {
  const b = new Uint8Array(6008).fill(0x41);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return b;
})();
export const PDF = new Uint8Array([...new TextEncoder().encode("%PDF-1.7\n"), ...new Uint8Array(5000).fill(0x42)]);

export interface World {
  dir: string;
  base: string;
  ops: NodeD1;
  stubDb: NodeD1;
  r2: Map<string, { body: Buffer; sha256?: string }>;
  odooCalls: { key: string; body: Record<string, unknown>; status: number }[];
  captchaCalls: number;
  cut(on: boolean): void;
  deps(overrides?: Partial<ForwarderDeps>): ForwarderDeps;
  submit(i: number, files?: Uint8Array[], extra?: Record<string, unknown>, headers?: Record<string, string>): Promise<{ status: number; reference: string; key: string }>;
  close(): Promise<void>;
  clock: { now: Date; advance(ms: number): void };
}

export async function makeWorld(options: { stubContract?: "1.1" | "1.2"; arcaptchaOk?: boolean } = {}): Promise<World> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rfq-ir-world-"));
  const stores = openStores(path.join(dir, "data"));
  const indexFile = path.join(dir, "rfq-variant-index.json");
  fs.writeFileSync(indexFile, JSON.stringify({ snapshot_version: SNAP, rows: [] }));
  loadVariantIndex(stores.pub, indexFile);
  const cfg = { env: "staging", allowed_origins: [ORIGIN], captcha: { provider: "arcaptcha", site_key: ARC_SITE_KEY }, files_enabled: true } as unknown as IrConfig;
  const env = intakeEnv(cfg, stores, { adminToken: "admin-secret", arcaptchaSecret: "arc-secret" });
  let cutOff = false;
  const world = { captchaCalls: 0 } as World;
  // The intake's own outbound call (arCaptcha verify) goes through the global fetch.
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://api.arcaptcha.ir/")) {
      world.captchaCalls++;
      if (cutOff) throw new TypeError("fetch failed");
      return Response.json({ success: options.arcaptchaOk ?? true });
    }
    return realFetch(input as never, init);
  }) as typeof fetch;
  const intake = createIntake({ env, db: stores.ops, publicOrigin: "https://api-staging.ahanassa.ir" });
  const server: http.Server = await listen(intake, "127.0.0.1", 0);
  const port = (server.address() as { port: number }).port;

  const stubDb = new NodeD1(":memory:", [{ name: "schema.sql", sql: fs.readFileSync(path.resolve(import.meta.dirname, "../../workers/odoo-stub/schema.sql"), "utf8") }]);
  const stubEnv = { STUB_DB: stubDb.asD1(), STUB_BEARER: "ir-bearer", STUB_CONTRACT: options.stubContract ?? "1.2", CONTROL_TOKEN: "c" };
  const odooCalls: World["odooCalls"] = [];
  const r2 = new Map<string, { body: Buffer; sha256?: string }>();
  const fakeR2: S3Client = {
    async put(key, body, meta) {
      if (cutOff) throw new TypeError("fetch failed");
      r2.set(key, { body: Buffer.from(body), sha256: meta?.sha256 });
      return { status: 200 };
    },
    async head(key) {
      if (cutOff) throw new TypeError("fetch failed");
      const o = r2.get(key);
      return o ? { status: 200, size: o.body.length, sha256: o.sha256 ?? null } : { status: 404, size: null, sha256: null };
    },
  };
  const clock = { now: new Date(Date.now() + 1000), advance(ms: number) { clock.now = new Date(clock.now.getTime() + ms); } };

  Object.assign(world, {
    dir,
    base: `http://127.0.0.1:${port}`,
    ops: stores.ops,
    stubDb,
    r2,
    odooCalls,
    clock,
    cut(on: boolean) {
      cutOff = on;
    },
    deps(overrides: Partial<ForwarderDeps> = {}): ForwarderDeps {
      return {
        db: stores.ops,
        bucket: stores.bucket,
        r2: fakeR2,
        odooBaseUrl: "https://odoo.ahanassa.com",
        odooToken: "ir-bearer",
        intakeV11: true,
        odooFetch: async (input, init) => {
          if (cutOff) throw new TypeError("fetch failed");
          const res = await stub.fetch(new Request(String(input), init), stubEnv as never);
          const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
          odooCalls.push({ key: new Headers(init?.headers).get("idempotency-key") ?? "", body, status: res.status });
          return res;
        },
        r2WaitMs: 3 * 60 * 60_000,
        filesStorageHint: "held on the domestic server; open with https://api-staging.ahanassa.ir/__admin/ir/",
        env: "staging",
        now: () => clock.now,
        random: () => 0.5,
        ...overrides,
      };
    },
    async submit(i: number, files: Uint8Array[] = [], extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
      const key = `0f8fad5b-d9cb-469f-a165-${String(708677289500 + i).padStart(12, "0")}`;
      const names = files.map((f, n) => (f[0] === 0x89 ? `photo-${n + 1}.png` : `list-${n + 1}.pdf`));
      const body = {
        idempotencyKey: key,
        locale: "fa",
        fullName: `Buyer ${i}`,
        email: `buyer${i}@example.com`,
        phoneCountry: "IR",
        phoneLocal: "9121234567",
        items: [{ freeformTitle: `میلگرد ${i}`, quantityText: String(10 + i), unit: "ton" }],
        website: "",
        formRenderedAt: Date.now() - 60_000,
        turnstileToken: "arc-token",
        catalogSnapshotVersion: SNAP,
        ...(files.length ? { attachments: files.map((f, n) => ({ name: names[n], size: f.length })) } : {}),
        ...extra,
      };
      const res = await realFetch(`${world.base}/api/rfqs`, { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, "x-ahanassa-client-ip": `5.6.7.${i % 250}`, ...headers }, body: JSON.stringify(body) });
      const json = (await res.json()) as { reference?: string };
      const reference = json.reference ?? "";
      for (const [n, f] of (res.status === 201 ? files : []).entries()) {
        const put = await realFetch(`${world.base}/api/rfqs/files/${reference}/${n + 1}`, { method: "PUT", headers: { origin: ORIGIN, "content-type": "application/octet-stream", "x-rfq-key": key, "content-length": String(f.length) }, body: f as BodyInit });
        if (put.status !== 201) throw new Error(`upload ${reference}/${n + 1}: ${put.status} ${await put.text()}`);
      }
      return { status: res.status, reference, key };
    },
    async close() {
      globalThis.fetch = realFetch;
      await new Promise((r) => server.close(r));
      fs.rmSync(dir, { recursive: true, force: true });
    },
  });
  return world;
}

export { sha256 };
