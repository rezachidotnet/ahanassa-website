import { test } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_SITE_HOST, isIranMirrorHost, pageUrlForHost, rfqApiMirrorOrigins, rfqEndpointForHost, turnstileUnreachableDelay, TURNSTILE_UNREACHABLE_MS } from "./iran-mirror.ts";
import { STATIC_TARGETS } from "../static/targets.ts";
import { filesEndpointFor } from "../rfq/upload-files.ts";
import { extractEndpointFor } from "../rfq/extract/browser.ts";

const PROD = `${STATIC_TARGETS.production.rfqApiOrigin}/api/rfqs`;
const STAGING = `${STATIC_TARGETS.staging.rfqApiOrigin}/api/rfqs`;

test("W27: the Iran mirror hosts, case-insensitive; nothing else", () => {
  for (const host of ["www.ahanassa.ir", "ahanassa.ir", "new.ahanassa.ir", "WWW.AHANASSA.IR"]) assert.equal(isIranMirrorHost(host), true, host);
  for (const host of ["www.ahanassa.com", "api.ahanassa.ir", "evil.ahanassa.ir", "ahanassa.ir.evil.example", "localhost", ""]) assert.equal(isIranMirrorHost(host), false, host);
});

test("W27: on www.ahanassa.ir / ahanassa.ir the production endpoint moves to api.ahanassa.ir — and so do files/uploads/extract", () => {
  for (const host of ["www.ahanassa.ir", "ahanassa.ir"]) {
    const endpoint = rfqEndpointForHost(PROD, host);
    assert.equal(endpoint, "https://api.ahanassa.ir/api/rfqs");
    // Everything else the form calls is derived from that one endpoint.
    assert.equal(filesEndpointFor(endpoint), "https://api.ahanassa.ir/api/rfqs/files");
    assert.equal(`${filesEndpointFor(endpoint)}/AA-RFQ-1/1`, "https://api.ahanassa.ir/api/rfqs/files/AA-RFQ-1/1");
    assert.equal(extractEndpointFor(endpoint), "https://api.ahanassa.ir/api/rfqs/extract");
  }
});

test("W27: www.ahanassa.com, staging, local and relative endpoints are left exactly as baked", () => {
  assert.equal(rfqEndpointForHost(PROD, "www.ahanassa.com"), PROD);
  assert.equal(rfqEndpointForHost(STAGING, "ahanassa-v11-static-staging.nova-b1e6f0.workers.dev"), STAGING);
  // Each Iran page host rewrites only its own target's API: a staging page on www.ahanassa.ir stays on staging.
  assert.equal(rfqEndpointForHost(STAGING, "www.ahanassa.ir"), STAGING);
  assert.equal(rfqEndpointForHost(PROD, "staging.ahanassa.ir"), PROD);
  assert.equal(rfqEndpointForHost("/api/rfqs", "www.ahanassa.ir"), "/api/rfqs");
  assert.equal(rfqEndpointForHost("http://api.ahanassa.com/api/rfqs", "www.ahanassa.ir"), "http://api.ahanassa.com/api/rfqs");
  assert.equal(rfqEndpointForHost(PROD, "localhost"), PROD);
});

test("W32: CSP Iran API origins — production: api.ahanassa.ir + the shadow api-new.ahanassa.ir; staging: api-staging.ahanassa.ir", () => {
  assert.deepEqual(rfqApiMirrorOrigins(STATIC_TARGETS.production.rfqApiOrigin), ["https://api.ahanassa.ir", "https://api-new.ahanassa.ir"]);
  assert.deepEqual(rfqApiMirrorOrigins(STATIC_TARGETS.staging.rfqApiOrigin), ["https://api-staging.ahanassa.ir"]);
  assert.deepEqual(rfqApiMirrorOrigins("not a url"), []);
});

test("W27: Turnstile timeout — watched only on a mirror host, ~8 s from navigation start", () => {
  assert.equal(turnstileUnreachableDelay("www.ahanassa.com", 0), null);
  assert.equal(turnstileUnreachableDelay("localhost", 0), null);
  assert.equal(TURNSTILE_UNREACHABLE_MS, 8_000);
  assert.equal(turnstileUnreachableDelay("www.ahanassa.ir", 0), 8_000);
  // The form mounts after hydration (and once more after the basket restore): only the rest of the budget is waited.
  assert.equal(turnstileUnreachableDelay("ahanassa.ir", 2_500), 5_500);
  assert.equal(turnstileUnreachableDelay("www.ahanassa.ir", 12_000), 0);
});

test("W27: share/copied page URLs move to the mirror host only on the mirror and only for the canonical host", () => {
  const url = "https://www.ahanassa.com/prices/chart/rebar-a3-12?x=1#c";
  assert.equal(pageUrlForHost(url, "www.ahanassa.com"), url);
  assert.equal(pageUrlForHost(url, "www.ahanassa.ir"), "https://www.ahanassa.ir/prices/chart/rebar-a3-12?x=1#c");
  assert.equal(pageUrlForHost(url, "ahanassa.ir"), "https://ahanassa.ir/prices/chart/rebar-a3-12?x=1#c");
  assert.equal(pageUrlForHost("https://wa.me/989134222795", "www.ahanassa.ir"), "https://wa.me/989134222795");
  assert.equal(pageUrlForHost("/prices", "www.ahanassa.ir"), "/prices");
  assert.equal(pageUrlForHost(`https://${CANONICAL_SITE_HOST}/`, "www.ahanassa.ir"), "https://www.ahanassa.ir/");
});

test("W32: P2 API hosts — new.ahanassa.ir → api-new.ahanassa.ir (shadow), staging.ahanassa.ir → api-staging.ahanassa.ir; www/apex .ir stay on api.ahanassa.ir (NOT switched)", () => {
  assert.equal(rfqEndpointForHost(PROD, "new.ahanassa.ir"), "https://api-new.ahanassa.ir/api/rfqs");
  assert.equal(rfqEndpointForHost(STAGING, "staging.ahanassa.ir"), "https://api-staging.ahanassa.ir/api/rfqs");
  assert.equal(rfqEndpointForHost(PROD, "www.ahanassa.ir"), "https://api.ahanassa.ir/api/rfqs");
  assert.equal(rfqEndpointForHost(PROD, "ahanassa.ir"), "https://api.ahanassa.ir/api/rfqs");
  assert.equal(isIranMirrorHost("staging.ahanassa.ir"), true);
  for (const host of ["api-new.ahanassa.ir", "api-staging.ahanassa.ir"]) assert.equal(isIranMirrorHost(host), false, host);
});
