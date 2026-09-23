import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAIL_CLOSED_CODES,
  LEDGER_PATH,
  evaluateLedgerAppendExemption,
  validateCompletedHistoricalRow,
  type LedgerAppendValidationCode,
} from "./ledger-append-exemption.ts";
import { parseLedgerTable } from "./release-ledger.ts";
import type { ChangedFile } from "./release-risk-classifier.ts";

// VALIDATED_HISTORICAL_LEDGER_APPEND — docs/release/RELEASE_POLICY.md §7.1,
// DOCUMENT_AUDIT_REPORT.md DAR-060. Every SHA / Worker Version ID / run id
// here is synthetic.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

const OLD = "a".repeat(40);
const BASE = "b".repeat(40);
const CANDIDATE = "c".repeat(40);
const OTHER = "d".repeat(40);

const HEADER =
  "| RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT | STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID | FINAL_RISK | RESULT | TIMESTAMP | NOTES |";
const SEPARATOR = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";

interface RowOverrides {
  workerVersionId?: string;
  finalTrafficPercent?: string;
  stagingRunId?: string;
  productionRunId?: string;
  promotionRunId?: string;
  rollbackVersionId?: string;
  finalRisk?: string;
  result?: string;
  timestamp?: string;
  notes?: string;
}

function row(sha: string, state: string, o: RowOverrides = {}): string {
  const cells = [
    `\`${sha}\``,
    o.workerVersionId === undefined ? "`00000000-0000-4000-8000-000000000001`" : o.workerVersionId,
    state,
    o.finalTrafficPercent ?? "100",
    o.stagingRunId ?? "`900000001`",
    o.productionRunId ?? "`900000002`",
    o.promotionRunId ?? "`900000003`",
    o.rollbackVersionId ?? "`00000000-0000-4000-8000-000000000002`",
    o.finalRisk ?? "HIGH",
    o.result ?? "PASS",
    o.timestamp ?? "2026-01-01T00:00:00Z",
    o.notes ?? "synthetic",
  ];
  return `| ${cells.join(" | ")} |`;
}

const PROSE_BEFORE = ["# Production Deployment Manifest", "", "Prose paragraph explaining the ledger.", "", "## Ledger (RELEASE_POLICY.md schema)", ""];
const PROSE_AFTER = [
  "",
  "A trailing note about the ledger.",
  "",
  "## Ledger (legacy format)",
  "",
  "| Date (UTC) | Deployed SHA | Notes |",
  "| --- | --- | --- |",
  "| 2026-01-01T00:00:00Z | `" + OLD + "` | frozen legacy row |",
  "",
];

function manifest(rows: string[], opts: { header?: string; separator?: string; before?: string[]; after?: string[] } = {}): string {
  return [...(opts.before ?? PROSE_BEFORE), opts.header ?? HEADER, opts.separator ?? SEPARATOR, ...rows, ...(opts.after ?? PROSE_AFTER)].join("\n");
}

/** The state of the ledger at BASE_PRODUCTION_SHA in every scenario below. */
const BASE_ROWS = [row(OLD, "STABLE_100", { promotionRunId: "`800000003`" }), row(BASE, "CANARY_ACTIVE", { finalTrafficPercent: "10", promotionRunId: "-" })];
const BASE_LEDGER = manifest(BASE_ROWS);
/** The real-world append: the STABLE_100 row that makes BASE the baseline. */
const APPENDED_STABLE_ROW = row(BASE, "STABLE_100");

const MODIFIED: ChangedFile[] = [{ status: "M", path: LEDGER_PATH }];

function evaluate(
  candidateLedger: string | null,
  opts: { baseLedger?: string | null; changedFiles?: ChangedFile[]; baseProductionSha?: string; candidateSha?: string } = {},
) {
  const baseLedger = opts.baseLedger === undefined ? BASE_LEDGER : opts.baseLedger;
  return evaluateLedgerAppendExemption({
    changedFiles: opts.changedFiles ?? MODIFIED,
    baseProductionSha: opts.baseProductionSha ?? BASE,
    candidateSha: opts.candidateSha ?? CANDIDATE,
    readFileAtCommit(sha, filePath) {
      assert.equal(filePath, LEDGER_PATH, "the exemption must only ever read the authoritative ledger");
      if (sha === (opts.baseProductionSha ?? BASE)) return baseLedger;
      if (sha === (opts.candidateSha ?? CANDIDATE)) return candidateLedger;
      throw new Error(`unexpected commit read: ${sha}`);
    },
  });
}

function expectCode(result: { code: LedgerAppendValidationCode }, code: LedgerAppendValidationCode, ctx = ""): void {
  assert.equal(result.code, code, `${ctx}${JSON.stringify(result, null, 2)}`);
}

// ---------------------------------------------------------------------------
// Sanity: the base fixture really is a valid, resolvable ledger.
// ---------------------------------------------------------------------------

test("L0. the fixture ledger parses and the BASE row is a real CANARY_ACTIVE row", () => {
  const rows = parseLedgerTable(BASE_LEDGER);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.releaseState, "STABLE_100");
  assert.equal(rows[1]!.releaseState, "CANARY_ACTIVE");
  assert.equal(rows[1]!.releaseSha, BASE);
});

// ---------------------------------------------------------------------------
// The exemption itself
// ---------------------------------------------------------------------------

test("L1. no ledger file in the diff -> the exemption never engages", () => {
  const r = evaluate(null, { changedFiles: [{ status: "M", path: "styles/globals.css" }] });
  expectCode(r, "NO_LEDGER_CHANGE");
  assert.equal(r.ledgerChangePresent, false);
  assert.equal(r.exemptionApplied, false);
  assert.equal(r.failClosed, false);
});

test("L2. a valid historical append is exempt, and reports the appended row as evidence", () => {
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW]));
  expectCode(r, "VALIDATED_HISTORICAL_LEDGER_APPEND");
  assert.equal(r.ledgerChangePresent, true);
  assert.equal(r.exemptionApplied, true);
  assert.equal(r.failClosed, false);
  assert.equal(r.baseRowCount, 2);
  assert.equal(r.candidateRowCount, 3);
  assert.deepEqual(
    r.appendedRows.map((x) => [x.release_sha, x.release_state, x.final_risk]),
    [[BASE, "STABLE_100", "HIGH"]],
  );
});

test("L3. two appended rows at once are still an append", () => {
  const extra = row(OTHER, "SUPERSEDED", { finalTrafficPercent: "0", promotionRunId: "-", finalRisk: "MEDIUM" });
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW, extra]));
  expectCode(r, "VALIDATED_HISTORICAL_LEDGER_APPEND");
  assert.equal(r.appendedRows.length, 2);
});

// ---------------------------------------------------------------------------
// NOT EXEMPT — a real ledger modification; the file keeps its HIGH class.
// ---------------------------------------------------------------------------

test("L4. an edited historical row is never exempt (stays HIGH, not a fail-closed block)", () => {
  const tampered = [...BASE_ROWS];
  tampered[0] = row(OLD, "STABLE_100", { promotionRunId: "`800000003`", result: "FAIL" });
  const r = evaluate(manifest([...tampered, APPENDED_STABLE_ROW]));
  expectCode(r, "LEDGER_ROW_EDITED_OR_REORDERED");
  assert.equal(r.exemptionApplied, false);
  assert.equal(r.failClosed, false);
});

test("L5. a deleted historical row is never exempt", () => {
  const r = evaluate(manifest([BASE_ROWS[0]!]));
  expectCode(r, "LEDGER_ROW_DELETED");
  assert.equal(r.exemptionApplied, false);
});

test("L6. reordered historical rows are never exempt", () => {
  const r = evaluate(manifest([BASE_ROWS[1]!, BASE_ROWS[0]!, APPENDED_STABLE_ROW]));
  expectCode(r, "LEDGER_ROW_EDITED_OR_REORDERED");
  assert.equal(r.exemptionApplied, false);
});

test("L7. a schema/header edit is never exempt", () => {
  const renamedHeader = HEADER.replace("| FINAL_RISK |", "| RISK |");
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW], { header: renamedHeader }));
  expectCode(r, "LEDGER_SCHEMA_CHANGED");
  assert.equal(r.exemptionApplied, false);
});

test("L7b. a separator-row edit is a schema change", () => {
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW], { separator: SEPARATOR.replace("| --- |", "| :--- |") }));
  expectCode(r, "LEDGER_SCHEMA_CHANGED");
});

test("L8. an append that also edits prose is never exempt — appended rows only", () => {
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW], { after: [...PROSE_AFTER, "An extra narrative paragraph."] }));
  expectCode(r, "LEDGER_NON_ROW_CONTENT_CHANGED");
  assert.equal(r.exemptionApplied, false);
});

test("L8b. an append that also edits the frozen legacy table is never exempt", () => {
  const after = PROSE_AFTER.map((l) => (l.includes("frozen legacy row") ? l.replace("frozen legacy row", "rewritten") : l));
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW], { after }));
  expectCode(r, "LEDGER_NON_ROW_CONTENT_CHANGED");
});

test("L9. a ledger change with no appended row is never exempt", () => {
  const r = evaluate(BASE_LEDGER);
  expectCode(r, "LEDGER_NO_ROWS_APPENDED");
  assert.equal(r.exemptionApplied, false);
});

test("L10. a rename, copy, deletion or addition of the ledger is never an append", () => {
  for (const changed of [
    [{ status: "D", path: LEDGER_PATH }],
    [{ status: "A", path: LEDGER_PATH }],
    [{ status: "R", path: "docs/release/OTHER.md", oldPath: LEDGER_PATH }],
    [{ status: "C", path: LEDGER_PATH, oldPath: "docs/release/OTHER.md" }],
  ] as ChangedFile[][]) {
    const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW]), { changedFiles: changed });
    expectCode(r, "LEDGER_CHANGE_NOT_A_PLAIN_MODIFICATION", `${JSON.stringify(changed)} `);
    assert.equal(r.exemptionApplied, false);
  }
});

test("L11. no ledger at BASE_PRODUCTION_SHA -> not exempt", () => {
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW]), { baseLedger: null });
  expectCode(r, "LEDGER_MISSING_AT_BASE");
  assert.equal(r.exemptionApplied, false);
});

test("L12. no authoritative table at BASE_PRODUCTION_SHA -> not exempt (the pre-policy manifest shape)", () => {
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW]), { baseLedger: "# Production Deployment Manifest\n\nNo policy-schema table yet.\n" });
  expectCode(r, "LEDGER_TABLE_ABSENT_OR_MALFORMED_AT_BASE");
  assert.equal(r.exemptionApplied, false);
  assert.equal(r.failClosed, false);
});

// ---------------------------------------------------------------------------
// FAIL CLOSED — the candidate's ledger cannot be trusted at all.
// ---------------------------------------------------------------------------

test("L13. a malformed appended row fails closed", () => {
  const short = APPENDED_STABLE_ROW.replace(" | synthetic |", " |");
  const r = evaluate(manifest([...BASE_ROWS, short]));
  expectCode(r, "LEDGER_APPENDED_ROW_MALFORMED");
  assert.equal(r.failClosed, true);
  assert.equal(r.exemptionApplied, false);
});

test("L13b. an unreadable/duplicated table in the candidate fails closed", () => {
  const doubled = manifest([...BASE_ROWS, APPENDED_STABLE_ROW]) + "\n\n" + manifest([APPENDED_STABLE_ROW]);
  const r = evaluate(doubled);
  expectCode(r, "LEDGER_TABLE_MALFORMED_AT_CANDIDATE");
  assert.equal(r.failClosed, true);
});

test("L14. an appended row naming CANDIDATE_SHA as already released fails closed", () => {
  const selfClaim = row(CANDIDATE, "STABLE_100");
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW, selfClaim]));
  expectCode(r, "LEDGER_APPENDED_ROW_CLAIMS_CANDIDATE");
  assert.equal(r.failClosed, true);
  assert.match(r.reasons[0]!, /can never carry its own release evidence/);
});

test("L15. an appended row that is not completed historical evidence fails closed", () => {
  const cases: Array<[string, string]> = [
    ["no FINAL_RISK", row(BASE, "STABLE_100", { finalRisk: "-" })],
    ["no PRODUCTION_RUN_ID", row(BASE, "STABLE_100", { productionRunId: "-" })],
    ["no PROMOTION_RUN_ID on a STABLE_100 row", row(BASE, "STABLE_100", { promotionRunId: "-" })],
    ["STABLE_100 not at 100%", row(BASE, "STABLE_100", { finalTrafficPercent: "10" })],
    ["non-UUID Worker Version", row(BASE, "STABLE_100", { workerVersionId: "not-a-uuid" })],
    ["unparseable timestamp", row(BASE, "STABLE_100", { timestamp: "yesterday" })],
  ];
  for (const [label, appended] of cases) {
    const r = evaluate(manifest([...BASE_ROWS, appended]));
    expectCode(r, "LEDGER_APPENDED_ROW_NOT_COMPLETED_EVIDENCE", `${label}: `);
    assert.equal(r.failClosed, true, label);
  }
});

test("L16. an append that moves BASE_PRODUCTION_SHA resolution fails closed", () => {
  // A STABLE_100 row for a release the trusted ledger does not know about:
  // the baseline would then depend on which copy of the ledger is read.
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW, row(OTHER, "STABLE_100")]));
  expectCode(r, "LEDGER_BASE_RESOLUTION_NONDETERMINISTIC");
  assert.equal(r.failClosed, true);
});

test("L17. BASE_PRODUCTION_SHA still resolves from the exempt candidate's own ledger", () => {
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW]));
  assert.equal(r.exemptionApplied, true);
  assert.match(r.reasons[0]!, new RegExp(`BASE_PRODUCTION_SHA still resolves to ${BASE}`));
});

test("L18. FAIL_CLOSED_CODES is exactly the untrustworthy-ledger set", () => {
  assert.deepEqual([...FAIL_CLOSED_CODES].sort(), [
    "LEDGER_APPENDED_ROW_CLAIMS_CANDIDATE",
    "LEDGER_APPENDED_ROW_MALFORMED",
    "LEDGER_APPENDED_ROW_NOT_COMPLETED_EVIDENCE",
    "LEDGER_BASE_RESOLUTION_NONDETERMINISTIC",
    "LEDGER_TABLE_MALFORMED_AT_CANDIDATE",
  ]);
});

// ---------------------------------------------------------------------------
// Row-level evidence rule
// ---------------------------------------------------------------------------

test("L19. validateCompletedHistoricalRow accepts a complete row and names every gap otherwise", () => {
  const [complete] = parseLedgerTable(manifest([APPENDED_STABLE_ROW]));
  assert.deepEqual(validateCompletedHistoricalRow(complete!), []);
  const [incomplete] = parseLedgerTable(manifest([row(BASE, "STABLE_100", { finalRisk: "-", promotionRunId: "-", result: "-" })]));
  const problems = validateCompletedHistoricalRow(incomplete!);
  assert.equal(problems.length, 3, problems.join(" | "));
});

test("L20. a non-STABLE_100 appended row does not need a promotion run", () => {
  const canary = row(OTHER, "CANARY_ACTIVE", { finalTrafficPercent: "10", promotionRunId: "-", finalRisk: "HIGH" });
  const r = evaluate(manifest([...BASE_ROWS, APPENDED_STABLE_ROW, canary]));
  expectCode(r, "VALIDATED_HISTORICAL_LEDGER_APPEND");
});

// ---------------------------------------------------------------------------
// The exemption lives in tested TypeScript, not in YAML/bash (DAR-060).
// ---------------------------------------------------------------------------

test("L21. no workflow reimplements the exemption in YAML/bash", () => {
  // Naming the ledger file in a human-readable message is fine; carrying the
  // exemption's decision vocabulary or a row-diffing implementation is not.
  const markers = [
    "VALIDATED_HISTORICAL_LEDGER_APPEND",
    "LEDGER_APPENDED_ROW_CLAIMS_CANDIDATE",
    "LEDGER_APPENDED_ROW_NOT_COMPLETED_EVIDENCE",
    "LEDGER_ROW_EDITED_OR_REORDERED",
    "LEDGER_BASE_RESOLUTION_NONDETERMINISTIC",
    "LEDGER_NON_ROW_CONTENT_CHANGED",
    "LEDGER_APPEND_EXEMPTION_APPLIED: true",
  ];
  for (const wf of ["deploy-production.yml", "promote-production.yml", "verify-production.yml", "deploy-staging.yml", "ci.yml"]) {
    const text = readFileSync(path.join(repoRoot, ".github", "workflows", wf), "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("#"))
      .join("\n");
    for (const m of markers) {
      assert.ok(!text.includes(m), `${wf} must not carry ledger-append-exemption logic (found "${m}")`);
    }
  }
});

test("L22. deploy-production.yml extracts the exemption module into the trusted engine", () => {
  const wf = readFileSync(path.join(repoRoot, ".github", "workflows", "deploy-production.yml"), "utf8");
  assert.match(wf, /lib\/ci\/ledger-append-exemption\.ts/, "the gate's engine extraction must include the exemption module");
});

const REAL_IDENTIFIERS_BLOCKLIST = ["f2202ab5", "4a32c5f9", "b07d8697", "35719752606", "35533626395"];

test("L23. this test file and the exemption module use synthetic identifiers only", () => {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const declStart = self.indexOf("const REAL_IDENTIFIERS_BLOCKLIST = [");
  const withoutDecl = self.slice(0, declStart) + self.slice(self.indexOf("];", declStart) + 2);
  for (const source of [withoutDecl, readFileSync(path.join(here, "ledger-append-exemption.ts"), "utf8")]) {
    assert.deepEqual(REAL_IDENTIFIERS_BLOCKLIST.filter((id) => source.includes(id)), []);
  }
});
