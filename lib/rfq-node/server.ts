import http from "node:http";
import { Readable } from "node:stream";
import { createRfqWorker } from "../../workers/rfq/app.ts";
import type { RfqWorkerEnv } from "../rfq-worker/config.ts";
import type { NodeD1 } from "./sqlite-d1.ts";
import { handleIrAdmin } from "./admin-ir.ts";
import { outboxDue } from "./health.ts";

/**
 * W32 (W29 P2 §3.1–§3.4): the domestic RFQ intake's HTTP front — node:http on 127.0.0.1 behind nginx, handing every
 * request to the SAME `createRfqWorker().fetch` the Cloudflare Worker runs (production entry: no test routes), with
 * Node bindings in `env` (lib/rfq-node/env.ts). Only three things are Node's own:
 *
 *  - the client IP: nginx sets `X-Ahanassa-Client-IP` to Arvan's X-Real-IP (real_ip from the 14 Arvan ranges only).
 *    It is trusted ONLY from a loopback peer and is handed to the shared code as `CF-Connecting-IP`, the header
 *    lib/security/rate-limit.ts reads; any client-sent CF-Connecting-IP / X-Real-IP / X-Ahanassa-Client-IP is dropped
 *    first. X-Forwarded-For is never used. The IP is only a rate-limit key in memory; it is never stored or logged;
 *  - `GET /healthz`: `{ok, outbox_due, oldest_due_min}` (no personal data) for the external check;
 *  - `/__admin/ir/*`: the domestic admin view (lib/rfq-node/admin-ir.ts).
 *
 * The URL the shared code sees is built from the configured public origin, never from the Host header.
 * `ctx.waitUntil` promises are tracked; shutdown waits for them.
 */
export interface IntakeOptions {
  env: RfqWorkerEnv;
  db: NodeD1;
  publicOrigin: string;
  now?: () => Date;
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const IP_LITERAL = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:.]{3,45})$/i;
const DROP = ["cf-connecting-ip", "x-real-ip", "x-ahanassa-client-ip", "x-forwarded-for", "forwarded", "connection", "keep-alive", "transfer-encoding", "upgrade", "proxy-connection"];

export function trustedClientIp(peer: string | undefined, header: string | undefined): string {
  const forwarded = header?.trim();
  if (peer && LOOPBACK.has(peer) && forwarded && IP_LITERAL.test(forwarded)) return forwarded;
  return peer?.replace(/^::ffff:/, "") ?? "unknown";
}

export function createIntake(options: IntakeOptions) {
  const worker = createRfqWorker();
  const pending = new Set<Promise<unknown>>();
  const ctx = {
    waitUntil(p: Promise<unknown>) {
      const tracked = p.catch(() => {}).finally(() => pending.delete(tracked));
      pending.add(tracked);
    },
    passThroughOnException() {},
    props: {},
  } as unknown as ExecutionContext;

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") {
      const { due, oldestMin } = outboxDue(options.db, options.now?.() ?? new Date());
      return new Response(JSON.stringify({ ok: true, outbox_due: due, oldest_due_min: oldestMin }), { status: 200, headers: { "content-type": "application/json", "Cache-Control": "no-store" } });
    }
    const admin = await handleIrAdmin(request, url, options.db, options.env.ADMIN_TOKEN);
    if (admin) return admin;
    return worker.fetch(request, options.env, ctx);
  }

  /** node:http request → the shared code's Request (body streamed, client IP from the trusted header only). */
  function toRequest(req: http.IncomingMessage): Request {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined || DROP.includes(k)) continue;
      headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    }
    const header = req.headers["x-ahanassa-client-ip"];
    headers.set("cf-connecting-ip", trustedClientIp(req.socket.remoteAddress, Array.isArray(header) ? header[0] : header));
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", options.publicOrigin);
    const body = method === "GET" || method === "HEAD" ? undefined : (Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>);
    return new Request(url, { method, headers, body, duplex: "half" } as RequestInit);
  }

  async function nodeHandler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let response: Response;
    try {
      response = await handle(toRequest(req));
    } catch (err) {
      console.error(JSON.stringify({ operation: "ir.http", result: "error", errorClass: err instanceof Error ? err.name : "unknown" }));
      response = new Response(JSON.stringify({ ok: false, code: "SERVICE_UNAVAILABLE" }), { status: 503, headers: { "content-type": "application/json", "Retry-After": "10", "Cache-Control": "no-store" } });
    }
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => (headers[k] = v));
    res.writeHead(response.status, headers);
    if (!response.body || req.method === "HEAD") return void res.end();
    Readable.fromWeb(response.body as never).on("error", () => res.destroy()).pipe(res);
  }

  return {
    handle,
    nodeHandler,
    /** Waits for the tracked waitUntil work (graceful shutdown). */
    drain: () => Promise.all([...pending]),
  };
}

export function listen(intake: ReturnType<typeof createIntake>, host: string, port: number): Promise<http.Server> {
  const server = http.createServer({ requestTimeout: 15 * 60_000, headersTimeout: 30_000 }, (req, res) => void intake.nodeHandler(req, res));
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}
