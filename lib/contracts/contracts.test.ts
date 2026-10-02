import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalReceivedAt, classifyIntakeStatus, intakeCanonicalJson, intakeFingerprint, pythonFloatRepr, rfqIntakeRequest, RFQ_INTAKE_ERRORS } from "./rfq-intake-v1-1.ts";
import { rfqSubmitRequest, RFQ_SUBMIT_ALLOWED_ORIGINS, RFQ_SUBMIT_RESPONSES } from "./rfq-submit-v1.ts";
import { rfqVariantIndexRow, snapshotV1 } from "./snapshot-v1.ts";
import { artifactManifest, publicManifest, publicRfqCatalog } from "./artifact-v1.ts";
import { computeSnapshotVersion, parseSnapshot, readSnapshotFile } from "../static/snapshot-io.ts";
import { validateRfqSubmission } from "../rfq/validation.ts";
import { mapRfqToApiPayload } from "../odoo/rfq-payload-mapper.ts";

const vectors = JSON.parse(fs.readFileSync(new URL("./fixtures/rfq-intake-fingerprint-vectors.json", import.meta.url), "utf8")) as { name: string; payload: unknown; canonical: string; fingerprint: string }[];
const FIXTURE = new URL("../../fixtures/snapshot/staging-2026-10-01.snapshot.json", import.meta.url);

// --- rfq_intake v1.1 (website -> Odoo) ---------------------------------------

test("rfq_intake v1.1: canonical JSON and fingerprint match Python's json.dumps byte-for-byte (generated vectors)", async () => {
  assert.ok(vectors.length >= 6);
  for (const v of vectors) {
    const payload = rfqIntakeRequest.parse(v.payload);
    assert.equal(intakeCanonicalJson(payload), v.canonical, `${v.name}: canonical JSON`);
    assert.equal(await intakeFingerprint(payload), v.fingerprint, `${v.name}: fingerprint`);
  }
});

test("rfq_intake v1.1: the same instant in two offsets is one fingerprint; microseconds only when non-zero", () => {
  assert.equal(canonicalReceivedAt("2026-10-02T03:41:07+03:30"), "2026-10-02T00:11:07Z");
  assert.equal(canonicalReceivedAt("2026-10-02T00:11:07Z"), "2026-10-02T00:11:07Z");
  assert.equal(canonicalReceivedAt("2026-10-02T00:11:07.1234Z"), "2026-10-02T00:11:07.123400Z");
  assert.equal(canonicalReceivedAt("2026-10-02T00:11:07.000000Z"), "2026-10-02T00:11:07Z");
  assert.throws(() => canonicalReceivedAt("2026-10-02T00:11:07"), /offset/);
  assert.throws(() => canonicalReceivedAt("2026-10-02"));
});

test("rfq_intake v1.1: Python float repr for quantities", () => {
  assert.equal(pythonFloatRepr(12), "12.0");
  assert.equal(pythonFloatRepr(5.5), "5.5");
  assert.equal(pythonFloatRepr(1e16), "1e+16");
  assert.equal(pythonFloatRepr(0.00001), "1e-05");
  assert.equal(pythonFloatRepr(123456789012.0), "123456789012.0");
});

test("rfq_intake v1.1: unknown keys are rejected; website_reference and received_at formats are enforced", () => {
  const base = { customer: { name: "A", email: "a@example.com" }, items: [{ description: "x", quantity: 1, uom: "kg" }] };
  assert.equal(rfqIntakeRequest.safeParse(base).success, true);
  assert.equal(rfqIntakeRequest.safeParse({ ...base, extra: 1 }).success, false);
  assert.equal(rfqIntakeRequest.safeParse({ ...base, website_reference: "AA-RFQ-K3QW9T2H" }).success, true);
  assert.equal(rfqIntakeRequest.safeParse({ ...base, website_reference: "AA-RFQ-k3qw9t2h" }).success, false);
  assert.equal(rfqIntakeRequest.safeParse({ ...base, received_at: "2026-10-02T00:11:07" }).success, false);
});

test("rfq_intake v1.1: null text fields are accepted like absent keys (Odoo _text); the mapper's free-text line validates", () => {
  const base = { customer: { name: "A", email: "a@example.com", company: null, phone: null }, items: [{ product_variant_xid: null, sku: null, description: "x", notes: null, quantity: 1, uom: "kg", length_mm: null }] };
  assert.equal(rfqIntakeRequest.safeParse(base).success, true);
  // still required: a free-text line without a description
  assert.equal(rfqIntakeRequest.safeParse({ ...base, items: [{ product_variant_xid: null, quantity: 1, uom: "kg" }] }).success, false);
  const m = mapRfqToApiPayload({ locale: "en", fullName: "W2", companyName: null, phone: null, email: "w2@example.com", message: null,
    items: [{ lineNumber: 1, variantRef: null, skuSnapshot: null, freeformTitle: "Free text", description: null, quantityText: "5", quantityValue: 5, quantityScale: 0, unitCode: "kg", lengthMm: null }] });
  assert.ok(m.ok);
  const wire = JSON.parse(JSON.stringify({ ...m.payload, received_at: "2026-10-02T08:42:35.987Z", website_reference: "AA-RFQ-K1GZDAD2" }));
  assert.equal(rfqIntakeRequest.safeParse(wire).success, true);
});

test("rfq_intake v1.1: every Odoo status maps to the architecture §6.2 classification", () => {
  assert.equal(classifyIntakeStatus(201), "DELIVERED");
  assert.equal(classifyIntakeStatus(200), "DELIVERED");
  assert.equal(classifyIntakeStatus(401), "RETRY_PENDING_ALERT");
  assert.equal(classifyIntakeStatus(403), "RETRY_PENDING_ALERT");
  for (const s of [429, 500, 502, 503, "network_error", "timeout"] as const) assert.equal(classifyIntakeStatus(s), "RETRY_PENDING");
  for (const s of [400, 409, 413, 415]) assert.equal(classifyIntakeStatus(s), "MANUAL_REVIEW");
  for (const e of RFQ_INTAKE_ERRORS) {
    const c = classifyIntakeStatus(e.http);
    assert.equal(c, e.classification, `${e.http} ${e.code}`);
  }
});

// --- rfq_submit.v1 (browser -> RFQ Worker) ----------------------------------

const validSubmit = {
  idempotencyKey: "0f8fad5b-d9cb-469f-a165-70867728950e",
  locale: "en",
  fullName: "Test Buyer",
  email: "buyer@example.com",
  phoneCountry: "IR",
  phoneLocal: "9121234567",
  items: [
    { catalogVariantXid: "CVAR-000123", quantityText: "12", unit: "ton" },
    { freeformTitle: "Custom item", quantityText: "500", unit: "kg" },
  ],
  website: "",
  formRenderedAt: 1,
  turnstileToken: "token",
  catalogSnapshotVersion: "snap-e55d81c754270c1f",
};

test("rfq_submit.v1: a payload the current server validator accepts is valid under the contract", () => {
  assert.equal(validateRfqSubmission(validSubmit).ok, true);
  assert.equal(rfqSubmitRequest.safeParse(validSubmit).success, true);
});

test("rfq_submit.v1: strict — unknown keys, a non-empty honeypot, a bad snapshot version or >20 items are rejected", () => {
  assert.equal(rfqSubmitRequest.safeParse({ ...validSubmit, extra: true }).success, false);
  assert.equal(rfqSubmitRequest.safeParse({ ...validSubmit, website: "http://spam" }).success, false);
  assert.equal(rfqSubmitRequest.safeParse({ ...validSubmit, catalogSnapshotVersion: "snap-XYZ" }).success, false);
  assert.equal(rfqSubmitRequest.safeParse({ ...validSubmit, items: Array.from({ length: 21 }, () => validSubmit.items[1]) }).success, false);
  assert.equal(rfqSubmitRequest.safeParse({ ...validSubmit, idempotencyKey: "short" }).success, false);
});

test("rfq_submit.v1: response table covers 201/200/400/403/409/413/415/422/429/503; CORS origins are exact production/staging origins", () => {
  assert.deepEqual(RFQ_SUBMIT_RESPONSES.map((r) => r.http).sort(), [200, 201, 400, 403, 409, 413, 415, 422, 429, 503]);
  assert.deepEqual([...RFQ_SUBMIT_ALLOWED_ORIGINS.production], ["https://www.ahanassa.com"]);
  for (const origin of [...RFQ_SUBMIT_ALLOWED_ORIGINS.production, ...RFQ_SUBMIT_ALLOWED_ORIGINS.staging]) assert.match(origin, /^https:\/\/[a-z0-9.-]+$/);
});

// --- snapshot.v1 --------------------------------------------------------------

test("snapshot.v1: the committed fixture validates and its version is derived from its content", () => {
  const snapshot = readSnapshotFile(FIXTURE.pathname);
  assert.equal(snapshot.snapshot_version, computeSnapshotVersion(snapshot.tables));
  assert.equal(snapshot.tables.catalog_products.length, 16);
  assert.equal(snapshot.tables.product_variants.length, 256);
  assert.equal(snapshot.tables.catalog_public_categories.length, 21);
});

test("snapshot.v1: a tampered table, an unknown column or a dangling variant is rejected", () => {
  const raw = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const tampered = structuredClone(raw);
  tampered.tables.catalog_products[0].commercial_template_name = "changed";
  assert.throws(() => parseSnapshot(tampered), /does not match its content/);
  const extraColumn = structuredClone(raw);
  extraColumn.tables.product_variants[0].cost_price = 1;
  assert.equal(snapshotV1.safeParse(extraColumn).success, false);
  const dangling = structuredClone(raw);
  dangling.tables.product_variants[0].product_id = "missing";
  assert.equal(snapshotV1.safeParse(dangling).success, false);
});

test("snapshot.v1: rfq_variant_index row shape", () => {
  const row = { snapshot_version: "snap-e55d81c754270c1f", locale: "fa", canonical_variant_id: "CVAR-000123", template_id: "CTMPL-000003", group_code: "RHS", allowed_units: ["kg", "ton"], selection_json: "{}" };
  assert.equal(rfqVariantIndexRow.safeParse(row).success, true);
  assert.equal(rfqVariantIndexRow.safeParse({ ...row, extra: 1 }).success, false);
});

// --- artifact.v1 ---------------------------------------------------------------

test("artifact.v1: public RFQ catalog JSON is strict and never carries categoryLabel", () => {
  const item = { variantXid: "CVAR-1", templateXid: "CTMPL-1", sku: "S", variantSpecLabel: "10", productLabel: "P", templateSlug: "p", categoryCode: "LONG", groupCode: "REBAR", publicCategoryCode: "REBAR", publicCategoryLabel: "Rebar" };
  const doc = { schema_version: "rfq-catalog.v1", snapshot_version: "snap-e55d81c754270c1f", locale: "en", items: [item] };
  assert.equal(publicRfqCatalog.safeParse(doc).success, true);
  assert.equal(publicRfqCatalog.safeParse({ ...doc, items: [{ ...item, categoryLabel: "محصولات طویل" }] }).success, false);
});

test("artifact.v1: manifests are strict; the public manifest exposes no internals", () => {
  assert.equal(publicManifest.safeParse({ schema_version: "artifact.public.v1", snapshot_version: "snap-e55d81c754270c1f", generated_at: "x", locales: ["fa"] }).success, true);
  assert.equal(publicManifest.safeParse({ schema_version: "artifact.public.v1", snapshot_version: "snap-e55d81c754270c1f", generated_at: "x", locales: ["fa"], code_sha: "a".repeat(40) }).success, false);
  const m = { schema_version: "artifact.v1", code_sha: "a".repeat(40), snapshot_version: "snap-e55d81c754270c1f", environment: "staging", generated_at: "x", counts: {}, public_assets: [{ path: "index.html", bytes: 1, sha256: "0".repeat(64) }], private_snapshot: [] };
  assert.equal(artifactManifest.safeParse(m).success, true);
  assert.equal(artifactManifest.safeParse({ ...m, public_assets: [{ path: "../x", bytes: 1, sha256: "0".repeat(64) }] }).success, false);
});
