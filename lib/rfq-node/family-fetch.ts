import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import type { LookupFunction } from "node:net";

/**
 * W32 (P0 2026-10-22 finding 1): from iransrv, IPv4 to `*.ahanassa.com` is filtered by SNI (TLS completes, then the
 * request stalls); IPv6 worked 3/3. R2 works on both. So the forwarder talks to Odoo and to the .ir R2 bucket over
 * IPv6 ONLY — never "IPv6 first, then IPv4", which would spend every timeout on a path known to stall.
 *
 * `familyFetch(6)` is a fetch-compatible function over node:http(s) with the socket pinned to one address family:
 * the DNS lookup asks only for that family (AAAA; the TCI IPv4 resolvers answer AAAA fine, so a dead IPv6 resolver
 * does not matter) and the connection uses only it. No AAAA = a network error, as a filtered path would be.
 * Request bodies are strings or bytes (RFQ JSON; one RFQ file ≤ 15 MiB); responses are buffered (Odoo JSON, S3 XML).
 *
 * `connectTimeoutMs` bounds the TCP+TLS setup; the caller's AbortSignal bounds the whole request.
 */
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface FamilyFetchOptions {
  connectTimeoutMs?: number;
  /** Tests: a lookup to use instead of the system resolver. */
  lookup?: LookupFunction;
}

export function familyFetch(family: 4 | 6, options: FamilyFetchOptions = {}): FetchLike {
  const lookup: LookupFunction =
    options.lookup ??
    ((hostname, opts, callback) => {
      dns.lookup(hostname, { ...(opts as object), family, all: false, verbatim: true }, callback as never);
    });
  return (input, init = {}) =>
    new Promise<Response>((resolve, reject) => {
      const url = new URL(String(input));
      const mod = url.protocol === "https:" ? https : url.protocol === "http:" ? http : null;
      if (!mod) return reject(new TypeError(`unsupported protocol ${url.protocol}`));
      const headers: Record<string, string> = {};
      new Headers(init.headers ?? {}).forEach((v, k) => (headers[k] = v));
      let body: Buffer | null = null;
      if (init.body !== undefined && init.body !== null) {
        if (typeof init.body === "string") body = Buffer.from(init.body);
        else if (init.body instanceof Uint8Array) body = Buffer.from(init.body.buffer, init.body.byteOffset, init.body.byteLength);
        else if (init.body instanceof ArrayBuffer) body = Buffer.from(init.body);
        else return reject(new TypeError("familyFetch: body must be a string or bytes"));
        headers["content-length"] = String(body.length);
      }
      const signal = init.signal;
      if (signal?.aborted) return reject(abortError());
      const req = mod.request(
        url,
        { method: init.method ?? "GET", headers, family, lookup, agent: false, timeout: options.connectTimeoutMs ?? 5_000 },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("error", reject);
          res.on("end", () => {
            const h = new Headers();
            for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) h.set(k, Array.isArray(v) ? v.join(", ") : v);
            const status = res.statusCode ?? 502;
            const nullBody = status === 204 || status === 304 || (init.method ?? "GET").toUpperCase() === "HEAD";
            resolve(new Response(nullBody ? null : Buffer.concat(chunks), { status, headers: h }));
          });
        },
      );
      // `timeout` fires on socket inactivity — before the connection exists that is the connect timeout.
      req.on("timeout", () => req.destroy(Object.assign(new Error("connect timeout"), { name: "TimeoutError" })));
      req.on("error", reject);
      const onAbort = () => req.destroy(abortError());
      signal?.addEventListener("abort", onAbort, { once: true });
      req.on("close", () => signal?.removeEventListener("abort", onAbort));
      if (body) req.write(body);
      req.end();
    });
}

function abortError(): Error {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}
