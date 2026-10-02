import { test } from "node:test";
import assert from "node:assert/strict";
import { rfqSubmitRequest } from "./rfq-submit-v1.ts";
import { checkRfqSubmitRequest, RFQ_SUBMIT_LIMITS } from "./rfq-submit-v1-check.ts";
import { contractFieldErrors } from "../rfq-worker/submit.ts";

/**
 * The RFQ Worker's zod-free checker must give the zod schema's verdict and
 * the same issues — same paths, codes and order — so the 422 fieldErrors the
 * browser sees are unchanged (W3). Inputs are JSON values (the Worker parses
 * the body with JSON.parse), so no undefined-in-array / function / NaN cases.
 */

const valid = () => ({
  idempotencyKey: "0f8fad5b-d9cb-469f-a165-70867728950e",
  locale: "en",
  fullName: "Test Buyer",
  companyName: "Example Co",
  email: "buyer@example.com",
  phoneCountry: "IR",
  phoneLocal: "9121234567",
  deliveryLocation: "Tehran",
  message: "Hello",
  items: [
    { catalogVariantXid: "CVAR-000001", quantityText: "12", unit: "ton", lengthMm: 12000 },
    { freeformTitle: "Free text", productSlug: "rebar", categoryLabel: "Long", gradeOrStandard: "A3", quantityText: "5", unit: "kg", description: "d", lengthMm: null },
  ],
  website: "",
  formRenderedAt: 1790900000000,
  turnstileToken: "token",
  catalogSnapshotVersion: "snap-e55d81c754270c1f",
});

const s = (n: number, ch = "a") => ch.repeat(n);
// Values every field is tried with (JSON-representable only).
const BATTERY: unknown[] = [
  undefined, null, true, 0, 1, -1, 1.5, -3.5, 0.5, 2 ** 60, -(2 ** 60), 1e9, 12000, 1790900000000,
  "", "a", "ab", "IR", "IRN", "!", "a b", "x@y.z", "fa", "en", "ar", "de", "kg", "ton", "branch", "sheet", "meter", "KG",
  "snap-e55d81c754270c1f", "snap-E55D81C754270C1F", "snap-x", "CVAR-000001", "CVAR 1", "0f8fad5b-d9cb-469f-a165-70867728950e",
  s(15), s(16), s(99), s(100), s(101), s(128), s(129), s(160), s(161), s(200), s(201), s(254), s(255), s(1000), s(1001), s(2048), s(2049), s(3000), s(3001),
  s(16, "!"), [], {}, ["a"], { a: 1 }, { length: 3 }, { length: 300 }, { length: "x" }, Array.from({ length: 21 }, () => "a"),
];

function verdicts(input: unknown) {
  const z = rfqSubmitRequest.safeParse(input);
  const c = checkRfqSubmitRequest(input);
  const zIssues = z.success ? [] : z.error.issues.map((i) => [i.path, i.code]);
  const cIssues = c.success ? [] : c.issues.map((i) => [i.path, i.code]);
  return {
    zod: { ok: z.success, issues: zIssues, fieldErrors: z.success ? null : JSON.stringify(contractFieldErrors(z.error.issues as never)) },
    check: { ok: c.success, issues: cIssues, fieldErrors: c.success ? null : JSON.stringify(contractFieldErrors(c.issues)) },
  };
}

function assertSame(input: unknown, label: string) {
  const v = verdicts(input);
  assert.deepEqual(v.check, v.zod, `${label}: ${JSON.stringify(input).slice(0, 300)}`);
}

const roundTrip = (v: unknown) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

test("rfq_submit.v1 check: the valid vector and minimal valid bodies pass in both", () => {
  assertSame(valid(), "full valid");
  const { companyName, deliveryLocation, message, website, formRenderedAt, catalogSnapshotVersion, ...minimal } = valid();
  void [companyName, deliveryLocation, message, website, formRenderedAt, catalogSnapshotVersion];
  assertSame(minimal, "minimal valid");
  assert.equal(checkRfqSubmitRequest(minimal).success, true);
});

test("rfq_submit.v1 check: every top-level field x value battery gives zod's issues, codes and order", () => {
  const keys = Object.keys(valid()).concat(["unknownA"]);
  let n = 0;
  for (const key of keys) {
    for (const value of BATTERY) {
      const body: Record<string, unknown> = valid();
      if (value === undefined) delete body[key];
      else body[key] = roundTrip(value);
      assertSame(body, `field ${key}`);
      n++;
    }
  }
  assert.ok(n >= 950, `${n} cases`);
});

test("rfq_submit.v1 check: every item field x value battery, item shapes and array sizes", () => {
  const itemKeys = Object.keys(RFQ_SUBMIT_LIMITS.item).filter((k) => k !== "units").concat(["unit", "extra"]);
  for (const key of itemKeys) {
    for (const value of BATTERY) {
      const body = valid();
      const item: Record<string, unknown> = { ...body.items[0] };
      if (value === undefined) delete item[key];
      else item[key] = roundTrip(value);
      body.items = [item as never, body.items[1]];
      assertSame(body, `item ${key}`);
    }
  }
  for (const items of [[], [null], [[]], ["x"], [1], {}, "items", null, Array.from({ length: 20 }, () => valid().items[0]), Array.from({ length: 21 }, () => valid().items[0]), Array.from({ length: 25 }, () => ({ quantityText: "", unit: "x", q: 1 }))]) {
    assertSame({ ...valid(), items }, `items ${JSON.stringify(items).slice(0, 40)}`);
  }
});

test("rfq_submit.v1 check: unknown keys (order, nesting) and seeded random multi-field mutations", () => {
  assertSame({ zz: 1, ...valid(), aa: 2, fullName: "x" }, "unknown keys + bad field");
  assertSame({ ...valid(), items: [{ ...valid().items[0], b: 1, a: 2, unit: "x" }] }, "item unknown keys");
  for (const notObject of [null, [], "x", 5, true]) assert.deepEqual(checkRfqSubmitRequest(notObject).success, rfqSubmitRequest.safeParse(notObject).success);

  let seed = 20261002;
  const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);
  const topKeys = Object.keys(valid()).concat(["unknownA", "unknownB"]);
  const itemKeys = ["catalogVariantXid", "productSlug", "freeformTitle", "categoryLabel", "gradeOrStandard", "quantityText", "unit", "description", "lengthMm", "extra"];
  for (let i = 0; i < 3000; i++) {
    const body: Record<string, unknown> = valid();
    for (let m = 0, count = 1 + rnd(4); m < count; m++) {
      const value = BATTERY[rnd(BATTERY.length)];
      if (rnd(3) === 0) {
        const items = (Array.isArray(body.items) ? body.items : valid().items) as Record<string, unknown>[];
        const idx = rnd(items.length);
        const item = { ...items[idx] };
        const key = itemKeys[rnd(itemKeys.length)];
        if (value === undefined) delete item[key];
        else item[key] = roundTrip(value);
        items[idx] = item;
        body.items = items;
      } else {
        const key = topKeys[rnd(topKeys.length)];
        if (value === undefined) delete body[key];
        else body[key] = roundTrip(value);
      }
    }
    assertSame(body, `random #${i}`);
  }
});
