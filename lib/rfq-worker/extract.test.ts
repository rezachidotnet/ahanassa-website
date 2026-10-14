import { test } from "node:test";
import assert from "node:assert/strict";
import { createRfqWorker } from "../../workers/rfq/app.ts";
import { cleanTranscript, DEFAULT_TEXT_MODEL, DEFAULT_VISION_MODEL, EXTRACT_PATH, extractPreflight, handleExtract, looksLikeList, MAX_TRANSCRIPT_CHARS, pdfLayerText, pdfPageJpegs, TRANSCRIBE_PROMPT } from "./extract.ts";
import { transcriptToLines } from "../rfq/extract/lines.ts";
import { scannedPdf, syntheticJpeg, typedPdf } from "../rfq/extract/test-fixtures.ts";
import { filesCapability } from "./attachments.ts";
import type { AiBinding, RateLimiter, RfqWorkerEnv } from "./config.ts";

/**
 * W13.3 POST /api/rfqs/extract (docs/RFQ_INSTANT_EXTRACT.md): every refusal happens before Workers AI
 * is called; nothing is stored; the answer is strict, validated lines. Workers AI is a fake here —
 * the transcripts are real outputs recorded on 2026-10-13.
 */
// The pictures' bytes only need to pass the JPEG checks here (the fake vision model "reads" them); their real
// transcripts, recorded from the photo fixtures of scripts/rfq/build-extract-fixtures.ts, are the fake's answers.
const FIXTURES: Record<string, () => Uint8Array> = {
  "phone-photo.fa.jpg": () => syntheticJpeg(67_000),
  "handwritten-photo.fa.jpg": () => syntheticJpeg(56_000),
  "typed-list.en.pdf": typedPdf,
  "scanned-list.fa.pdf": () => scannedPdf(syntheticJpeg(40_000)),
};
const fixture = (name: string) => FIXTURES[name]();
const ORIGIN = "https://static.example";
const URL_ = `https://api.example${EXTRACT_PATH}`;
const PHONE_TRANSCRIPT = "لیست اقلام درخواستی\nردیف شرح کالا | سایز | مقدار | واحد\n۱ میلگرد آجدار A3 | ۱۶ | ۲۰ | تن\n۲ تیرآهن IPE | ۱۸ | ۴۰ | شاخه\n۳ نبشی | ۵۰×۵۰×۵ | ۲۵۰۰ | کیلوگرم";

interface Call {
  model: string;
  inputs: Record<string, unknown>;
}

function fakeAi(answers: { vision?: unknown; text?: unknown; markdown?: string; delayMs?: number; throws?: boolean } = {}) {
  const calls: Call[] = [];
  const ai: AiBinding = {
    async run(model, inputs) {
      calls.push({ model, inputs: inputs as Record<string, unknown> });
      if (answers.delayMs) await new Promise((r) => setTimeout(r, answers.delayMs));
      if (answers.throws) throw new Error("5007: model unavailable");
      return { response: model === DEFAULT_VISION_MODEL ? (answers.vision ?? PHONE_TRANSCRIPT) : answers.text };
    },
    async toMarkdown() {
      calls.push({ model: "toMarkdown", inputs: {} });
      return [{ format: "markdown", data: answers.markdown ?? "# list.pdf\n## Metadata\n- PDFFormatVersion=1.4\n\n## Contents\n### Page 1\n\n" }];
    },
  };
  return { ai, calls };
}

function limiter(success = true, throws = false): RateLimiter & { keys: string[] } {
  const keys: string[] = [];
  return {
    keys,
    async limit({ key }) {
      keys.push(key);
      if (throws) throw new Error("limiter down");
      return { success };
    },
  };
}

/** No D1, no R2, no Queue: anything touching them would throw — the endpoint must not store anything. */
const untouchable = new Proxy({}, { get: () => { throw new Error("storage touched"); } });

function env(over: Partial<RfqWorkerEnv> = {}, ai = fakeAi().ai): RfqWorkerEnv {
  return {
    DB_OPS: untouchable as D1Database,
    DB_PUBLIC: untouchable as D1Database,
    RFQ_FILES: untouchable as R2Bucket,
    RFQ_FILES_ENABLED: "1",
    RFQ_EXTRACT_ENABLED: "1",
    AI: ai,
    RFQ_EXTRACT_RATE_LIMITER: limiter(),
    ALLOWED_ORIGINS: ORIGIN,
    TURNSTILE_EXPECTED_HOSTNAMES: "static.example",
    TURNSTILE_SECRET_KEY: "secret",
    ...over,
  };
}

const siteverify = (action = "rfq_extract", success = true) => (async () => Response.json({ success, action, hostname: "static.example" })) as typeof fetch;

function request(body: Uint8Array | null, headers: Record<string, string> = {}): Request {
  return new Request(URL_, {
    method: "POST",
    headers: { origin: ORIGIN, "x-file-ext": "jpg", "x-turnstile-token": "token", "cf-connecting-ip": "203.0.113.9", ...(body ? { "content-length": String(body.length) } : {}), ...headers },
    body: body as BodyInit | null,
  });
}

const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

test("switch: off unless upload is on AND RFQ_EXTRACT_ENABLED=1 AND the AI binding; the capability says which part is on", async () => {
  const photo = fixture("phone-photo.fa.jpg");
  for (const over of [{ RFQ_EXTRACT_ENABLED: "0" }, { AI: undefined }, { RFQ_FILES_ENABLED: "0" }, { RFQ_FILES: undefined }] as Partial<RfqWorkerEnv>[]) {
    const res = await handleExtract(request(photo), env(over), { fetchImpl: siteverify() });
    assert.equal(res.status, 404, JSON.stringify(Object.keys(over)));
    assert.equal((await json(res)).code, "EXTRACT_DISABLED");
  }
  const cap = (e: RfqWorkerEnv) => filesCapability(new Request("https://api.example/api/rfqs/files", { headers: { origin: ORIGIN } }), e).json() as Promise<{ extract?: unknown }>;
  assert.deepEqual((await cap(env())).extract, { lists: true, pictures: true });
  assert.deepEqual((await cap(env({ AI: undefined }))).extract, { lists: true, pictures: false });
  assert.deepEqual((await cap(env({ RFQ_EXTRACT_ENABLED: "0" }))).extract, { lists: false, pictures: false });
});

test("refusals before any model call: method, origin, type, length, rate limit (fail-closed), Turnstile", async () => {
  const photo = fixture("phone-photo.fa.jpg");
  const { ai, calls } = fakeAi();
  const e = env({}, ai);
  const status = async (req: Request, environment = e, fetchImpl = siteverify()) => (await handleExtract(req, environment, { fetchImpl })).status;
  assert.equal(await status(new Request(URL_, { method: "GET", headers: { origin: ORIGIN } })), 405);
  assert.equal(await status(request(photo, { origin: "https://evil.example" })), 403);
  assert.equal(await status(request(photo, { "x-file-ext": "xlsx" })), 415, "typed lists are read in the browser, never here");
  assert.equal(await status(request(photo, { "x-file-ext": "exe" })), 415);
  assert.equal(await status(request(photo, { "content-length": "abc" })), 411);
  assert.equal(await status(request(photo, { "content-length": String(16 * 1024 * 1024) })), 413);
  assert.equal(await status(request(photo, { "content-length": "0" })), 422);
  assert.equal(await status(request(photo), env({ RFQ_EXTRACT_RATE_LIMITER: undefined }, ai)), 503, "no limiter: fail closed");
  assert.equal(await status(request(photo), env({ RFQ_EXTRACT_RATE_LIMITER: limiter(true, true) }, ai)), 503, "limiter error: fail closed");
  const limited = await handleExtract(request(photo), env({ RFQ_EXTRACT_RATE_LIMITER: limiter(false) }, ai), { fetchImpl: siteverify() });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.equal(await status(request(photo, { "x-turnstile-token": "" })), 403, "no token");
  assert.equal(await status(request(photo), e, siteverify("rfq_extract", false)), 403, "token rejected");
  assert.equal(await status(request(photo), e, siteverify("rfq_submit")), 403, "a submit token is not an extract token");
  assert.equal(await status(request(photo), e, (async () => new Response("down", { status: 500 })) as typeof fetch), 503, "Siteverify unavailable");
  assert.equal(calls.length, 0, "Workers AI was never called");
});

test("the rate-limit key is per client IP and separate from the RFQ's own key space", async () => {
  const lim = limiter();
  await handleExtract(request(fixture("phone-photo.fa.jpg")), env({ RFQ_EXTRACT_RATE_LIMITER: lim }), { fetchImpl: siteverify() });
  assert.equal(lim.keys.length, 1);
  assert.match(lim.keys[0], /^extract:[0-9a-f]{16,}$/);
  assert.ok(!lim.keys[0].includes("203.0.113.9"), "the IP itself is not the key");
});

test("same byte checks as W13.1: magic bytes must match the extension; executables refused; body length must match", async () => {
  const { ai, calls } = fakeAi();
  const e = env({}, ai);
  const pdfAsJpg = await handleExtract(request(fixture("typed-list.en.pdf")), e, { fetchImpl: siteverify() });
  assert.equal(pdfAsJpg.status, 422);
  assert.equal((await json(pdfAsJpg)).reason, "content_mismatch");
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, ...new Uint8Array(200)]);
  const exeRes = await handleExtract(request(exe, { "x-file-ext": "pdf" }), e, { fetchImpl: siteverify() });
  assert.equal((await json(exeRes)).reason, "executable_or_archive");
  const short = await handleExtract(request(fixture("phone-photo.fa.jpg"), { "content-length": "100" }), e, { fetchImpl: siteverify() });
  assert.equal(short.status, 422);
  assert.equal(calls.length, 0);
});

test("a photo: one vision call; a list comes back as its transcript for the browser's parser — no file stored", async () => {
  const { ai, calls } = fakeAi();
  const res = await handleExtract(request(fixture("phone-photo.fa.jpg")), env({}, ai), { fetchImpl: siteverify() });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("access-control-allow-origin"), ORIGIN);
  const body = await json(res);
  assert.equal(body.source, "image");
  assert.equal(body.lines, undefined);
  assert.equal(body.transcript, PHONE_TRANSCRIPT);
  // what the browser then does with it (lib/rfq/extract/browser.ts)
  assert.deepEqual(transcriptToLines(String(body.transcript)).map((l) => [l.quantity, l.unit]), [[20, "ton"], [40, "branch"], [2500, "kg"]]);
  assert.deepEqual(calls.map((c) => c.model), [DEFAULT_VISION_MODEL], "no text-model call for a table");
  const content = (calls[0].inputs.messages as { content: { type: string; text?: string; image_url?: { url: string } }[] }[])[0].content;
  assert.equal(content[0].text, TRANSCRIBE_PROMPT);
  assert.match(content[1].image_url!.url, /^data:image\/jpeg;base64,\/9j\//);
});

test("list or prose: one cheap test decides who structures the text; the transcript is cleaned and capped", () => {
  assert.equal(looksLikeList(PHONE_TRANSCRIPT), true);
  assert.equal(looksLikeList("میلگرد ۱۶ آجدار - ۱۲تن"), true);
  assert.equal(looksLikeList("Rebar 16 - 20 ton"), true);
  assert.equal(looksLikeList("سلام وقت بخیر. برای پروژه بیست تن میلگرد شانزده لازم داریم."), false);
  assert.equal(cleanTranscript("a\u0000b\r\nc\u202ed"), "ab\ncd");
  assert.equal(cleanTranscript("x".repeat(MAX_TRANSCRIPT_CHARS + 50)).length, MAX_TRANSCRIPT_CHARS);
});

test("prose the parser cannot read goes to the text model with the strict schema; invalid JSON is refused, not repaired", async () => {
  const prose = "سلام وقت بخیر. برای پروژه بیست تن میلگرد شانزده آجدار لازم داریم.";
  const answer = { lines: [{ product: "میلگرد آجدار", size: "شانزده", thickness: null, grade: null, standard: null, quantity: 20, unit: "تن", raw_text: "بیست تن میلگرد شانزده آجدار" }] };
  const ok = fakeAi({ vision: prose, text: answer });
  const res = await handleExtract(request(fixture("handwritten-photo.fa.jpg")), env({}, ok.ai), { fetchImpl: siteverify() });
  assert.equal(res.status, 200);
  assert.deepEqual(ok.calls.map((c) => c.model), [DEFAULT_VISION_MODEL, DEFAULT_TEXT_MODEL]);
  assert.equal((ok.calls[1].inputs.response_format as { type: string }).type, "json_schema");
  assert.equal(((await json(res)).lines as unknown[]).length, 1);

  for (const bad of ["{not json", { lines: [{ product: "x", raw_text: "x", price: 1 }] }, { lines: "x" }]) {
    const { ai } = fakeAi({ vision: prose, text: bad });
    const r = await handleExtract(request(fixture("handwritten-photo.fa.jpg")), env({}, ai), { fetchImpl: siteverify() });
    assert.equal(r.status, 502, JSON.stringify(bad));
    assert.deepEqual(await json(r), { ok: false, code: "EXTRACT_FAILED", reason: "invalid_answer" });
  }
});

test("Workers AI errors and timeouts: 502 / 504, never a stack or model text in the answer", async () => {
  const failing = fakeAi({ throws: true });
  const failed = await handleExtract(request(fixture("phone-photo.fa.jpg")), env({}, failing.ai), { fetchImpl: siteverify() });
  assert.equal(failed.status, 502);
  assert.deepEqual(await json(failed), { ok: false, code: "EXTRACT_FAILED", reason: "ai_error" });
  const slow = fakeAi({ delayMs: 200 });
  const timedOut = await handleExtract(request(fixture("phone-photo.fa.jpg")), env({}, slow.ai), { fetchImpl: siteverify(), timeoutMs: 20 });
  assert.equal(timedOut.status, 504);
  assert.deepEqual(await json(timedOut), { ok: false, code: "EXTRACT_TIMEOUT" });
  const empty = await handleExtract(request(fixture("phone-photo.fa.jpg")), env({}, fakeAi({ vision: "   " }).ai), { fetchImpl: siteverify() });
  assert.deepEqual(await json(empty), { ok: false, code: "EXTRACT_FAILED", reason: "empty" });
});

test("PDFs: a text layer is read without any vision call; a scan's page picture goes to the vision model; neither → unreadable", async () => {
  const typed = fakeAi({ markdown: "# list.pdf\n## Metadata\n- PDFFormatVersion=1.4\n\n## Contents\n### Page 1\nRequest for quotation\n1. Rebar A3 diameter 16 - 20 ton\n2. Equal angle 50x50x5 - 3500 kg\nThank you\n" });
  const typedRes = await handleExtract(request(fixture("typed-list.en.pdf"), { "x-file-ext": "pdf" }), env({}, typed.ai), { fetchImpl: siteverify() });
  const typedBody = await json(typedRes);
  assert.equal(typedBody.source, "pdf_text");
  assert.deepEqual(transcriptToLines(String(typedBody.transcript)).map((l) => l.quantity), [20, 3500]);
  assert.deepEqual(typed.calls.map((c) => c.model), ["toMarkdown"]);

  const scan = fakeAi();
  const scanRes = await handleExtract(request(fixture("scanned-list.fa.pdf"), { "x-file-ext": "pdf" }), env({}, scan.ai), { fetchImpl: siteverify() });
  assert.equal((await json(scanRes)).source, "image");
  assert.deepEqual(scan.calls.map((c) => c.model), ["toMarkdown", DEFAULT_VISION_MODEL]);

  const noPictures = fakeAi();
  const blank = await handleExtract(request(fixture("typed-list.en.pdf"), { "x-file-ext": "pdf" }), env({}, noPictures.ai), { fetchImpl: siteverify() });
  assert.deepEqual(await json(blank), { ok: false, code: "EXTRACT_FAILED", reason: "unreadable" });
});

test("PDF helpers: page JPEGs found by byte search (small images skipped); toMarkdown metadata is not text", () => {
  const pages = pdfPageJpegs(fixture("scanned-list.fa.pdf"));
  assert.equal(pages.length, 1);
  assert.deepEqual([...pages[0].subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.deepEqual(pdfPageJpegs(fixture("typed-list.en.pdf")), []);
  assert.equal(pdfLayerText("# list.pdf\n## Metadata\n- PDFFormatVersion=1.4\n- IsLinearized=false\n\n## Contents\n### Page 1\n\n"), "");
  assert.equal(pdfLayerText("## Contents\n### Page 1\n1. Rebar A3 diameter 16 - 20 ton\n### Page 2\n2. Angle 50x50x5 - 3 ton\n"), "1. Rebar A3 diameter 16 - 20 ton\n2. Angle 50x50x5 - 3 ton");
  assert.equal(pdfLayerText("## Contents\n### Page 1\nPage 1 of 1\n"), "", "a few characters are a stamp, not a list");
});

test("routing: the Worker serves /api/rfqs/extract and its preflight (allowed origin + the two headers only)", async () => {
  const worker = createRfqWorker();
  const pre = await worker.fetch(new Request(URL_, { method: "OPTIONS", headers: { origin: ORIGIN } }), env(), {} as ExecutionContext);
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get("access-control-allow-headers") ?? "", /x-turnstile-token/);
  assert.match(pre.headers.get("access-control-allow-headers") ?? "", /x-file-ext/);
  assert.equal(pre.headers.get("access-control-allow-methods"), "POST");
  assert.equal(extractPreflight(new Request(URL_, { method: "OPTIONS", headers: { origin: "https://evil.example" } }), [ORIGIN]).status, 403);
  const off = await worker.fetch(request(fixture("phone-photo.fa.jpg")), env({ RFQ_EXTRACT_ENABLED: "0" }), {} as ExecutionContext);
  assert.equal(off.status, 404);
});
