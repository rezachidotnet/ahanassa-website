import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchFilesCapability, filesEndpointFor, uploadRfqFiles } from "./upload-files.ts";

const noSleep = async () => {};

test("filesEndpointFor + capability: enabled only on a well-formed enabled:true answer; errors and 404 mean no upload field", async () => {
  assert.equal(filesEndpointFor("https://api.ahanassa.com/api/rfqs"), "https://api.ahanassa.com/api/rfqs/files");
  const on = (async () => Response.json({ ok: true, enabled: true, maxFiles: 5, maxFileBytes: 15728640, extensions: [] })) as typeof fetch;
  assert.deepEqual(await fetchFilesCapability("x", on), { enabled: true, maxFiles: 5, maxFileBytes: 15728640 });
  assert.equal(await fetchFilesCapability("x", (async () => Response.json({ ok: true, enabled: false })) as typeof fetch), null);
  assert.equal(await fetchFilesCapability("x", (async () => new Response("no", { status: 404 })) as typeof fetch), null);
  assert.equal(await fetchFilesCapability("x", (async () => { throw new TypeError("offline"); }) as typeof fetch), null);
});

test("uploadRfqFiles: one PUT per slot with the idempotency key; 5xx/network retried once, 4xx final; progress reported", async () => {
  const calls: { url: string; key: string | null; method: string }[] = [];
  const answers = [new Response(null, { status: 201 }), new Response(null, { status: 503 }), new Response(null, { status: 201 }), new Response(null, { status: 422 }), "network", "network"];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, key: new Headers(init.headers).get("x-rfq-key"), method: String(init.method) });
    const next = answers.shift();
    if (next === "network") throw new TypeError("offline");
    return next as Response;
  }) as unknown as typeof fetch;
  const progress: string[] = [];
  const outcomes = await uploadRfqFiles("https://api.example/api/rfqs/files", "AA-RFQ-ABC", "key-1234567890abcdef", [new Blob(["a"]), new Blob(["b"]), new Blob(["c"]), new Blob(["d"])], { fetchImpl, sleep: noSleep, onProgress: (d, t) => progress.push(`${d}/${t}`) });
  assert.deepEqual(outcomes, ["received", "received", "rejected", "failed"]);
  assert.deepEqual(calls.map((c) => c.url.split("/").slice(-2).join("/")), ["AA-RFQ-ABC/1", "AA-RFQ-ABC/2", "AA-RFQ-ABC/2", "AA-RFQ-ABC/3", "AA-RFQ-ABC/4", "AA-RFQ-ABC/4"]);
  assert.ok(calls.every((c) => c.key === "key-1234567890abcdef" && c.method === "PUT"));
  assert.deepEqual(progress, ["1/4", "2/4", "3/4", "4/4"]);
});
