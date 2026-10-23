import { test } from "node:test";
import assert from "node:assert/strict";
import { altchaChallengeUrl, capabilitiesEndpointFor, fetchRfqCapabilities } from "./capabilities-client.ts";
import { rfqCapabilities } from "../rfq-worker/capabilities.ts";
import type { RfqWorkerEnv } from "../rfq-worker/config.ts";

/** W32/W35: the form learns its captcha from the API it talks to — never from the page host. */
const route = (answers: Record<string, () => Response>) => (async (url: string | URL) => (answers[String(url)] ?? (() => new Response("", { status: 404 })))()) as typeof fetch;
const EP = "https://api-new.ahanassa.ir/api/rfqs";
const verifier = { verify: async () => ({ ok: true }) as const };

test("domestic intake answer → ALTCHA with the challenge URL on the API's own host; files + extract carried over", async () => {
  const env = { ALLOWED_ORIGINS: "https://new.ahanassa.ir", CAPTCHA_PROVIDER: "altcha", ALTCHA: verifier, RFQ_FILES: {} as R2Bucket, RFQ_FILES_ENABLED: "1" } as unknown as RfqWorkerEnv;
  const live = rfqCapabilities(new Request(capabilitiesEndpointFor(EP), { headers: { origin: "https://new.ahanassa.ir" } }), env);
  const c = await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => live }));
  assert.deepEqual(c?.captcha, { provider: "altcha", challengeUrl: "https://api-new.ahanassa.ir/api/rfqs/captcha-challenge" });
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

test("unreachable, 5xx, an unknown provider (incl. the removed arcaptcha) or a challenge path off the API → null (never a guessed widget)", async () => {
  assert.equal(await fetchRfqCapabilities(EP, (async () => { throw new TypeError("fetch failed"); }) as typeof fetch), null);
  assert.equal(await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => new Response("", { status: 503 }) })), null);
  assert.equal(await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => Response.json({ captcha: { provider: "hcaptcha" } }) })), null);
  assert.equal(await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => Response.json({ captcha: { provider: "arcaptcha", siteKey: "abc" } }) })), null);
  for (const p of ["https://evil.example/api/rfqs/x", "//evil.example/api/rfqs/x", "/api/rfqs/../x", "/other/path", "/api/rfqs/a?b", "", null]) {
    assert.equal(altchaChallengeUrl(EP, p), null, String(p));
    assert.equal(await fetchRfqCapabilities(EP, route({ [`${EP}/capabilities`]: () => Response.json({ captcha: { provider: "altcha", challengePath: p } }) })), null, String(p));
  }
});
