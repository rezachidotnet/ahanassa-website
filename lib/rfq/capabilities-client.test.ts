import { test } from "node:test";
import assert from "node:assert/strict";
import { capabilitiesEndpointFor, fetchRfqCapabilities } from "./capabilities-client.ts";
import { rfqCapabilities } from "../rfq-worker/capabilities.ts";
import type { RfqWorkerEnv } from "../rfq-worker/config.ts";

/** W32: the form learns its captcha from the API it talks to — never from the page host. */
const route = (answers: Record<string, () => Response>) => (async (url: string | URL) => (answers[String(url)] ?? (() => new Response("", { status: 404 })))()) as typeof fetch;
const EP = "https://api-new.ahanassa.ir/api/rfqs";

test("domestic intake answer → arCaptcha with its site key; files + extract carried over", async () => {
  const env = { ALLOWED_ORIGINS: "https://new.ahanassa.ir", CAPTCHA_PROVIDER: "arcaptcha", ARCAPTCHA_SITE_KEY: "abc_DEF-123", RFQ_FILES: {} as R2Bucket, RFQ_FILES_ENABLED: "1" } as RfqWorkerEnv;
  const live = rfqCapabilities(new Request(capabilitiesEndpointFor(EP), { headers: { origin: "https://new.ahanassa.ir" } }), env);
  const c = await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => live }));
  assert.deepEqual(c?.captcha, { provider: "arcaptcha", siteKey: "abc_DEF-123" });
  assert.equal(c?.files?.enabled, true);
  assert.deepEqual(c?.files?.extract, { lists: false, pictures: false });
});

test("the Worker answer → Turnstile; an OLD Worker without the route (404) → Turnstile + the files capability from GET …/files", async () => {
  const w = await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => Response.json({ ok: true, captcha: { provider: "turnstile" }, files: { enabled: false }, extract: { lists: false, pictures: false } }) }));
  assert.deepEqual(w, { captcha: { provider: "turnstile" }, files: null });
  const old = await fetchRfqCapabilities(EP, route({ [`${EP}/files`]: () => Response.json({ ok: true, enabled: true, maxFiles: 5, maxFileBytes: 15728640, extract: { lists: true, pictures: false } }) }));
  assert.deepEqual(old?.captcha, { provider: "turnstile" });
  assert.equal(old?.files?.maxFiles, 5);
});

test("unreachable, 5xx, an unknown provider or a malformed site key → null (the caller keeps its default; never a guessed widget)", async () => {
  assert.equal(await fetchRfqCapabilities(EP, (async () => { throw new TypeError("fetch failed"); }) as typeof fetch), null);
  assert.equal(await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => new Response("", { status: 503 }) })), null);
  assert.equal(await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => Response.json({ captcha: { provider: "hcaptcha" } }) })), null);
  assert.equal(await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => Response.json({ captcha: { provider: "arcaptcha", siteKey: "<script>" } }) })), null);
});
