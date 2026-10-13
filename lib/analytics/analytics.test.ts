import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ANALYTICS_EVENTS, buildEvent, clickEventFor, trackEvent } from "./events.ts";
import { gtmScriptUrl, shouldLoadGtm, startGtm } from "./gtm.ts";
import { buildCspReportOnly } from "../security/headers.ts";
import { GA4_MEASUREMENT_ID, GA4_MEASUREMENT_ID_PATTERN, GTM_CONTAINER_ID, gtmContainerId } from "../../config/analytics.ts";

test("events: the seven D-SEO events, each with a fixed parameter allowlist", () => {
  assert.deepEqual(Object.keys(ANALYTICS_EVENTS).sort(), ["basket_add", "calculator_use", "file_upload", "phone_click", "price_page_view", "rfq_submit", "whatsapp_click"]);
  assert.deepEqual(ANALYTICS_EVENTS.rfq_submit, ["rfq_tracking_number"], "rfq_submit carries the tracking number only");
});

test("buildEvent: unknown keys are dropped; values that could be personal data never pass", () => {
  assert.deepEqual(buildEvent("rfq_submit", { rfq_tracking_number: "AA-RFQ-20261013-0042" }), { event: "rfq_submit", rfq_tracking_number: "AA-RFQ-20261013-0042" });
  const leaky = { rfq_tracking_number: "AA-1", email: "a@b.co", phone: "09121234567", name: "Ali" } as Record<string, string>;
  assert.deepEqual(buildEvent("rfq_submit", leaky), { event: "rfq_submit", rfq_tracking_number: "AA-1" });
  for (const bad of ["a@b.co", "+989121234567", "Ali Rezaei", "x".repeat(65), "<script>", ""]) assert.deepEqual(buildEvent("rfq_submit", { rfq_tracking_number: bad }), { event: "rfq_submit" }, bad);
  assert.deepEqual(buildEvent("file_upload", { file_count: 2, file_type: "pdf" }), { event: "file_upload", file_count: 2, file_type: "pdf" });
  assert.deepEqual(buildEvent("file_upload", { file_count: Number.NaN, file_type: "invoice of mr x.pdf" }), { event: "file_upload" });
  assert.deepEqual(buildEvent("calculator_use", { calculator_product_group: "REBAR", calculator_mode: "pieces" }), { event: "calculator_use", calculator_product_group: "REBAR", calculator_mode: "pieces" });
});

test("trackEvent: pushes to window.dataLayer, creating it; a no-op without window", () => {
  trackEvent("phone_click", { link_location: "header" }); // no window in node: must not throw
  const g = globalThis as { window?: { dataLayer?: unknown[] } };
  g.window = {};
  try {
    trackEvent("phone_click", { link_location: "header" });
    trackEvent("price_page_view", { price_date: "2026-10-13" });
    assert.deepEqual(g.window.dataLayer, [{ event: "phone_click", link_location: "header" }, { event: "price_page_view", price_date: "2026-10-13" }]);
  } finally {
    delete g.window;
  }
});

test("clickEventFor: tel: and WhatsApp links only", () => {
  assert.equal(clickEventFor("tel:+983135134"), "phone_click");
  assert.equal(clickEventFor("https://wa.me/989121234567?text=x"), "whatsapp_click");
  assert.equal(clickEventFor("https://api.whatsapp.com/send?phone=1"), "whatsapp_click");
  assert.equal(clickEventFor("/contact"), null);
  assert.equal(clickEventFor("https://evil.example/wa.me/1"), null);
});

test("GTM: loads on the production hostname, or anywhere with ?gtm_debug=; never with a missing/malformed ID", () => {
  assert.equal(shouldLoadGtm("www.ahanassa.com", ""), true);
  assert.equal(shouldLoadGtm("staging.ahanassa.com", ""), false);
  assert.equal(shouldLoadGtm("127.0.0.1", "?gtm_debug=x&a=1"), true);
  assert.equal(gtmContainerId("GTM-ABC123"), "GTM-ABC123");
  for (const bad of ["", "GTM-", "gtm-abc123", "G-ABC123", "GTM-ABC123\"><script>", null]) assert.equal(gtmContainerId(bad), null, String(bad));
  assert.equal(gtmScriptUrl("GTM-ABC123"), "https://www.googletagmanager.com/gtm.js?id=GTM-ABC123");

  const appended: { async: boolean; src: string }[] = [];
  const fakeWindow = (hostname: string) =>
    ({ location: { hostname, search: "" }, document: { createElement: () => ({ async: false, src: "" }), head: { appendChild: (s: { async: boolean; src: string }) => appended.push(s) } } }) as unknown as Window & { dataLayer?: unknown[] };
  const prod = fakeWindow("www.ahanassa.com");
  assert.equal(startGtm(prod, "GTM-ABC123"), true);
  assert.equal(startGtm(prod, "GTM-ABC123"), false, "once per page");
  assert.equal(appended.length, 1);
  assert.deepEqual({ async: appended[0].async, src: appended[0].src }, { async: true, src: "https://www.googletagmanager.com/gtm.js?id=GTM-ABC123" });
  assert.equal((prod.dataLayer![0] as { event: string }).event, "gtm.js");
  assert.equal(startGtm(fakeWindow("staging.ahanassa.com"), "GTM-ABC123"), false);
  assert.equal(startGtm(fakeWindow("www.ahanassa.com"), null), false);
});

test("config: the owner-supplied IDs (2026-10-13), well-formed", () => {
  assert.equal(GTM_CONTAINER_ID, "GTM-TFN25VZQ");
  assert.equal(gtmContainerId(GTM_CONTAINER_ID), GTM_CONTAINER_ID);
  assert.equal(GA4_MEASUREMENT_ID, "G-C8MZB6DXPZ");
  assert.ok(GA4_MEASUREMENT_ID_PATTERN.test(GA4_MEASUREMENT_ID));
});

test("GA4 loads only through GTM: no gtag.js and no G- measurement ID in any site source", () => {
  const files: string[] = [];
  const walk = (dir: URL) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const child = new URL(`${e.name}${e.isDirectory() ? "/" : ""}`, dir);
      if (e.isDirectory()) walk(child);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(child.pathname);
    }
  };
  for (const dir of ["app/", "components/", "lib/"]) walk(new URL(`../../${dir}`, import.meta.url));
  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(code, /gtag\/js|gtag\(|G-C8MZB6DXPZ|GA4_MEASUREMENT_ID/, `${file}: GA4 must be configured inside GTM only (double counting)`);
  }
});

test("wiring: rfq_submit sends the tracking number only; the layout mounts the runtime once", () => {
  const form = fs.readFileSync(new URL("../../components/contact/enquiry-form.tsx", import.meta.url), "utf8");
  const calls = [...form.matchAll(/trackEvent\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(calls, ['"rfq_submit", { rfq_tracking_number: body.reference }']);
  const layout = fs.readFileSync(new URL("../../app/[locale]/layout.tsx", import.meta.url), "utf8");
  assert.equal(layout.match(/<AnalyticsRuntime /g)?.length, 1);
});

test("CSP allows GTM and GA4 (script, image beacon, fetch/sendBeacon), so an enforced policy keeps analytics", () => {
  const csp = Object.fromEntries(buildCspReportOnly(["https://api.ahanassa.com"]).split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));
  assert.ok(csp["script-src"].includes("https://*.googletagmanager.com"));
  for (const origin of ["https://*.google-analytics.com", "https://*.googletagmanager.com"]) assert.ok(csp["img-src"].includes(origin), origin);
  for (const origin of ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"]) assert.ok(csp["connect-src"].includes(origin), origin);
  assert.ok(!csp["script-src"].includes("'unsafe-inline'") && !csp["script-src"].includes("'unsafe-eval'"));
});
