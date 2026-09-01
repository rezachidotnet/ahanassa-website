import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { checkPreviewBasicAuth } from "./preview-auth.ts";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.PREVIEW_BASIC_AUTH_USER = "ahanassa-preview";
  process.env.PREVIEW_BASIC_AUTH_PASSWORD = "correct-horse-battery-staple";
});

afterEach(() => {
  process.env = { ...originalEnv };
});

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

function requestTo(url: string, init: RequestInit = {}): Request {
  return new Request(url, init);
}

test("checkPreviewBasicAuth returns 401 when no Authorization header is present", () => {
  const result = checkPreviewBasicAuth(requestTo("https://preview.example.com/"));
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth sets a WWW-Authenticate: Basic header on 401", () => {
  const result = checkPreviewBasicAuth(requestTo("https://preview.example.com/"));
  assert.ok(result);
  assert.match(result.headers.get("WWW-Authenticate") ?? "", /^Basic realm=/);
});

test("checkPreviewBasicAuth returns 401 for wrong credentials", () => {
  const request = requestTo("https://preview.example.com/", {
    headers: { Authorization: basicAuthHeader("ahanassa-preview", "wrong-password") },
  });
  const result = checkPreviewBasicAuth(request);
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth returns 401 for a wrong username with the right password", () => {
  const request = requestTo("https://preview.example.com/", {
    headers: { Authorization: basicAuthHeader("someone-else", "correct-horse-battery-staple") },
  });
  const result = checkPreviewBasicAuth(request);
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth returns null (pass-through) for correct credentials", () => {
  const request = requestTo("https://preview.example.com/", {
    headers: { Authorization: basicAuthHeader("ahanassa-preview", "correct-horse-battery-staple") },
  });
  const result = checkPreviewBasicAuth(request);
  assert.equal(result, null);
});

test("checkPreviewBasicAuth rejects a malformed (non-Basic) Authorization header", () => {
  const request = requestTo("https://preview.example.com/", { headers: { Authorization: "Bearer some-token" } });
  const result = checkPreviewBasicAuth(request);
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth rejects an Authorization header with invalid base64", () => {
  const request = requestTo("https://preview.example.com/", { headers: { Authorization: "Basic not-valid-base64!!" } });
  const result = checkPreviewBasicAuth(request);
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth rejects decoded credentials with no ':' separator", () => {
  const request = requestTo("https://preview.example.com/", {
    headers: { Authorization: `Basic ${Buffer.from("no-separator-here", "utf8").toString("base64")}` },
  });
  const result = checkPreviewBasicAuth(request);
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth fails closed when credentials are not configured at all, even with a correctly-formatted request", () => {
  delete process.env.PREVIEW_BASIC_AUTH_USER;
  delete process.env.PREVIEW_BASIC_AUTH_PASSWORD;
  const request = requestTo("https://preview.example.com/", {
    headers: { Authorization: basicAuthHeader("anything", "anything") },
  });
  const result = checkPreviewBasicAuth(request);
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth fails closed when only one of the two env vars is configured", () => {
  delete process.env.PREVIEW_BASIC_AUTH_PASSWORD;
  const request = requestTo("https://preview.example.com/", {
    headers: { Authorization: basicAuthHeader("ahanassa-preview", "") },
  });
  const result = checkPreviewBasicAuth(request);
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth gates a POST to /api/rfqs identically to any other route — no exclusion for the RFQ API", () => {
  const unauthenticated = checkPreviewBasicAuth(
    requestTo("https://preview.example.com/api/rfqs", { method: "POST", body: JSON.stringify({ fake: "rfq" }) }),
  );
  assert.ok(unauthenticated);
  assert.equal(unauthenticated.status, 401);

  const authenticated = checkPreviewBasicAuth(
    requestTo("https://preview.example.com/api/rfqs", {
      method: "POST",
      body: JSON.stringify({ fake: "rfq" }),
      headers: { Authorization: basicAuthHeader("ahanassa-preview", "correct-horse-battery-staple") },
    }),
  );
  assert.equal(authenticated, null);
});

test("checkPreviewBasicAuth ignores a credential passed as a query parameter — Basic Auth via header only", () => {
  const request = requestTo("https://preview.example.com/?user=ahanassa-preview&password=correct-horse-battery-staple");
  const result = checkPreviewBasicAuth(request);
  assert.ok(result);
  assert.equal(result.status, 401);
});

test("checkPreviewBasicAuth's 401 response body/headers never echo the configured credential values", async () => {
  const result = checkPreviewBasicAuth(requestTo("https://preview.example.com/"));
  assert.ok(result);
  const serializedHeaders = JSON.stringify([...result.headers.entries()]);
  assert.doesNotMatch(serializedHeaders, /correct-horse-battery-staple/);
  assert.doesNotMatch(serializedHeaders, /ahanassa-preview/);
  const body = await result.text();
  assert.doesNotMatch(body, /correct-horse-battery-staple/);
  assert.doesNotMatch(body, /ahanassa-preview/);
});
