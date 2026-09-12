import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { INDUSTRY_SECTORS } from "../content/industries.ts";
import { MEDIA_PROVENANCE_REGISTRY, effectiveTruthClass, findIndustrySectorMedia, findMediaRecord, isPublishable, type MediaProvenanceRecord } from "./provenance-registry.ts";

/**
 * 01-sources/MEDIA_GUIDELINES.md §27 ("Media Registry") coverage.
 *
 * Two jobs: prove the three Industries records actually carry the provenance
 * information §27/§28.1 require (rather than a plausible-looking shape), and
 * prove the §5 rule "Unknown provenance defaults to `restricted`" is enforced
 * by CODE, not by reviewer discipline — that rule is the one that legitimately
 * kept the Industries section unpublished through IND-P1.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

/** Reads a PNG's real pixel dimensions from its IHDR header. */
function pngDimensions(absolutePath: string): { width: number; height: number } {
  const header = readFileSync(absolutePath).subarray(0, 24);
  assert.equal(header.subarray(12, 16).toString("ascii"), "IHDR", `${absolutePath} is not a PNG`);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

const INDUSTRIES_RECORDS = MEDIA_PROVENANCE_REGISTRY.filter((record) => record.industrySector !== undefined);

// ---------------------------------------------------------------------------
// The three Industries assets — required provenance fields
// ---------------------------------------------------------------------------

test("the registry holds exactly one record per frozen Industries sector, in the frozen order (§2)", () => {
  assert.equal(INDUSTRIES_RECORDS.length, 3, "three sector slots, three records");
  assert.deepEqual(
    INDUSTRIES_RECORDS.map((record) => record.industrySector),
    [...INDUSTRY_SECTORS],
    "one record per sector, following the frozen construction -> petrochemical -> manufacturing order",
  );
});

test("every Industries record carries the full provenance information §27/§28.1 require", () => {
  for (const record of INDUSTRIES_RECORDS) {
    const where = `${record.id}`;
    // Canonical public path + the owner's original filename, so the import is
    // auditable in both directions.
    assert.match(record.src, /^\/images\/industries\/[a-z0-9-]+\.png$/, `${where}: canonical local asset path`);
    assert.match(record.originalFilename, /^[\w.-]+\.png$/, `${where}: the owner's original filename must be recorded`);
    assert.notEqual(record.originalFilename, path.basename(record.src), `${where}: the file was deliberately renamed on import, so the two names differ`);

    assert.equal(record.provenance, "owner-provided", `${where}: provenance`);
    assert.ok(record.sourceOwner.length > 0, `${where}: a rights holder must be named`);
    assert.equal(record.rightsStatus, "owned", `${where}: rights basis`);
    assert.equal(record.attributionRequired, false, `${where}: owner-provided assets carry no attribution requirement`);

    assert.equal(record.approvedUse, "Homepage Industries / Use Cases", `${where}: approved use`);
    assert.equal(record.approvalStatus, "approved", `${where}: approval status`);
    assert.match(record.approvedAt, /^\d{4}-\d{2}-\d{2}$/, `${where}: an ISO approval date is required`);

    assert.equal(record.notAhanAsaProjectEvidence, true, `${where}: must be flagged as NOT project evidence`);
    assert.equal(record.decorative, true, `${where}: rendered with empty alt`);
    assert.equal(record.type, "image", `${where}: type`);
    assert.equal(record.purpose, "context", `${where}: these illustrate a sector; they explain and prove nothing`);
    assert.ok(record.notes.length > 0, `${where}: what the asset actually depicts must be written down`);
  }
});

test("no Industries asset claims to be evidence of real Ahan Asa work (§8, MEDIA_GUIDELINES §4.4/§29)", () => {
  for (const record of INDUSTRIES_RECORDS) {
    assert.notEqual(record.truthClass, "verified-evidence", `${record.id}: these are sector illustrations, never operational proof`);
    assert.equal(record.purpose, "context", `${record.id}: purpose must not be "evidence"`);
    assert.equal(record.notAhanAsaProjectEvidence, true, `${record.id}: the explicit flag must be set`);
  }
});

test("the declared dimensions and 4:3 ratio are true of the real files on disk (§8)", () => {
  for (const record of INDUSTRIES_RECORDS) {
    const absolute = path.join(REPO_ROOT, "public", record.src);
    assert.ok(existsSync(absolute), `${record.id}: ${record.src} must exist in public/`);
    const actual = pngDimensions(absolute);
    assert.equal(actual.width, record.width, `${record.id}: recorded width must match the file`);
    assert.equal(actual.height, record.height, `${record.id}: recorded height must match the file`);
    assert.equal(record.aspectRatio, "4:3", `${record.id}: §8 common ratio`);
    // The ratio claim must be arithmetically true of the file, not just typed
    // into the record — these are natively 4:3, so object-cover crops nothing.
    assert.equal(actual.width * 3, actual.height * 4, `${record.id}: the file itself must really be 4:3`);
  }
});

test("no registry asset is hotlinked, and none reuses a Hero image (§8)", () => {
  for (const record of MEDIA_PROVENANCE_REGISTRY) {
    assert.ok(record.src.startsWith("/"), `${record.id}: assets must be repository-local`);
    assert.ok(!record.src.startsWith("//"), `${record.id}: protocol-relative is still external`);
    assert.ok(!/https?:/.test(record.src), `${record.id}: §8 forbids an external host`);
    for (const forbidden of ["hero-steel-mill", "hero-steel-procurement", "/images/products/"]) {
      assert.ok(!record.src.includes(forbidden), `${record.id}: §8 forbids reusing \`${forbidden}\``);
    }
  }
});

test("record ids and canonical paths are unique", () => {
  const ids = MEDIA_PROVENANCE_REGISTRY.map((record) => record.id);
  const paths = MEDIA_PROVENANCE_REGISTRY.map((record) => record.src);
  assert.equal(new Set(ids).size, ids.length, "duplicate record id");
  assert.equal(new Set(paths).size, paths.length, "duplicate canonical path");
});

// ---------------------------------------------------------------------------
// §5 enforcement — "Unknown provenance defaults to `restricted`"
// ---------------------------------------------------------------------------

const APPROVED: MediaProvenanceRecord = INDUSTRIES_RECORDS[0];

test("unknown provenance resolves to `restricted` and is not publishable (§5)", () => {
  // The exact rule IND-P1 cited as the reason nothing could be published.
  const unknown: MediaProvenanceRecord = { ...APPROVED, id: "test-unknown", provenance: "unknown" };
  assert.equal(effectiveTruthClass(unknown), "restricted", "§5: unknown provenance defaults to restricted");
  assert.equal(isPublishable(unknown), false, "§5: restricted media must not be published");
});

test("a record cannot escape `restricted` by simply declaring a friendlier truth class (§5)", () => {
  // The enforcement must not be trusting: `truthClass` is a claim, and an
  // unprovenanced or unapproved asset stays restricted regardless of it.
  const lying: MediaProvenanceRecord = { ...APPROVED, id: "test-lying", provenance: "unknown", truthClass: "verified-context" };
  assert.equal(effectiveTruthClass(lying), "restricted", "provenance outranks the declared class");
  assert.equal(isPublishable(lying), false);
});

test("an unapproved, rejected or expired asset is not publishable (§27, §32.2)", () => {
  for (const approvalStatus of ["draft", "rejected", "expired"] as const) {
    const record: MediaProvenanceRecord = { ...APPROVED, id: `test-${approvalStatus}`, approvalStatus };
    assert.equal(effectiveTruthClass(record), "restricted", `${approvalStatus} must resolve to restricted`);
    assert.equal(isPublishable(record), false, `${approvalStatus} must not be publishable`);
  }
});

test("restricted rights status is never publishable (§5, §27)", () => {
  const record: MediaProvenanceRecord = { ...APPROVED, id: "test-rights", rightsStatus: "restricted" };
  assert.equal(effectiveTruthClass(record), "restricted");
  assert.equal(isPublishable(record), false);
});

test("all three real Industries records ARE publishable", () => {
  for (const record of INDUSTRIES_RECORDS) {
    assert.notEqual(effectiveTruthClass(record), "restricted", `${record.id}: provenance is recorded, so it is not restricted`);
    assert.equal(isPublishable(record), true, `${record.id}: must be publishable`);
  }
});

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

test("findMediaRecord resolves a registered path and returns null for anything else", () => {
  assert.equal(findMediaRecord(APPROVED.src)?.id, APPROVED.id);
  // An unregistered asset must NOT resolve — that is what makes the invariants
  // test's "no unprovenanced asset may be published" check meaningful.
  assert.equal(findMediaRecord("/images/ops/warehouse.png"), null, "a pre-existing unregistered repo image has no provenance record");
  assert.equal(findMediaRecord("/images/industries/does-not-exist.png"), null);
});

test("findIndustrySectorMedia returns the right asset for each frozen sector", () => {
  for (const sector of INDUSTRY_SECTORS) {
    const record = findIndustrySectorMedia(sector);
    assert.ok(record, `${sector}: must resolve`);
    assert.equal(record!.industrySector, sector);
    assert.equal(record!.approvedUse, "Homepage Industries / Use Cases");
  }
});
