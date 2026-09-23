/**
 * VALIDATED_HISTORICAL_LEDGER_APPEND — docs/release/RELEASE_POLICY.md §7.1,
 * DOCUMENT_AUDIT_REPORT.md DAR-060.
 *
 * The release ledger (docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md) is a
 * HIGH_RELEASE_PATHS file, and a `STABLE_100` row for release N is appended
 * in a commit *after* release N's own SHA. `BASE_PRODUCTION_SHA` is that
 * row's `RELEASE_SHA`, so `git diff BASE_PRODUCTION_SHA..CANDIDATE_SHA`
 * structurally always contains the ledger append — which made every release
 * after a recorded release classify HIGH and left the LOW/MEDIUM direct-100
 * paths unreachable.
 *
 * This module removes ONE thing, and only when it can prove it: a purely
 * historical, append-only addition of new row(s) to the authoritative ledger
 * table. It does NOT reclassify the ledger file. Anything else that touches
 * the ledger — an edited, deleted or reordered row, a header/schema change, a
 * prose edit, a rename, a deletion, a malformed or self-certifying append —
 * keeps the file at its normal HIGH classification or fails the release
 * closed. The exemption is deliberately all-or-nothing and content-exact:
 * everything in the file outside the table's data rows must be byte-identical
 * between BASE and CANDIDATE.
 *
 * Fail-closed vs. not-exempt:
 *   - NOT EXEMPT  — the change is a real ledger modification the policy still
 *                   classifies HIGH (row edit/delete/reorder, schema change,
 *                   prose change, rename/delete of the file, no ledger at
 *                   base). The release may proceed on the HIGH path.
 *   - FAIL CLOSED — the candidate's ledger is itself untrustworthy (malformed
 *                   table, malformed appended row, an appended row that is not
 *                   completed historical release evidence, an appended row
 *                   claiming the candidate as already released, or an append
 *                   that would make BASE_PRODUCTION_SHA resolve differently).
 *                   The gate blocks; no risk level can be assigned safely.
 */

import type { ChangedFile } from "./release-risk-classifier.ts";
import { locateLedgerTable, parseLedgerTable, resolveBaseProductionShaFromManifest, type LedgerRow } from "./release-ledger.ts";

/** The one authoritative ledger this exemption may ever apply to. */
export const LEDGER_PATH = "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md";

export type LedgerAppendValidationCode =
  // no ledger change in the diff at all
  | "NO_LEDGER_CHANGE"
  // the exemption
  | "VALIDATED_HISTORICAL_LEDGER_APPEND"
  // not exempt — a genuine ledger modification, stays HIGH
  | "LEDGER_CHANGE_NOT_A_PLAIN_MODIFICATION"
  | "LEDGER_MISSING_AT_BASE"
  | "LEDGER_MISSING_AT_CANDIDATE"
  | "LEDGER_TABLE_ABSENT_OR_MALFORMED_AT_BASE"
  | "LEDGER_SCHEMA_CHANGED"
  | "LEDGER_NON_ROW_CONTENT_CHANGED"
  | "LEDGER_ROW_EDITED_OR_REORDERED"
  | "LEDGER_ROW_DELETED"
  | "LEDGER_NO_ROWS_APPENDED"
  // fail closed — the candidate's ledger cannot be trusted at all
  | "LEDGER_TABLE_MALFORMED_AT_CANDIDATE"
  | "LEDGER_APPENDED_ROW_MALFORMED"
  | "LEDGER_APPENDED_ROW_NOT_COMPLETED_EVIDENCE"
  | "LEDGER_APPENDED_ROW_CLAIMS_CANDIDATE"
  | "LEDGER_BASE_RESOLUTION_NONDETERMINISTIC";

/** Codes that stop the release outright rather than merely denying the exemption. */
export const FAIL_CLOSED_CODES: readonly LedgerAppendValidationCode[] = [
  "LEDGER_TABLE_MALFORMED_AT_CANDIDATE",
  "LEDGER_APPENDED_ROW_MALFORMED",
  "LEDGER_APPENDED_ROW_NOT_COMPLETED_EVIDENCE",
  "LEDGER_APPENDED_ROW_CLAIMS_CANDIDATE",
  "LEDGER_BASE_RESOLUTION_NONDETERMINISTIC",
];

/** One appended row, reduced to the fields the audit record carries. */
export interface AppendedRowSummary {
  release_sha: string;
  worker_version_id: string;
  release_state: string;
  final_traffic_percent: number | null;
  production_run_id: string | null;
  promotion_run_id: string | null;
  final_risk: string | null;
  result: string;
  timestamp: string;
}

export interface LedgerAppendEvaluation {
  /** Did the change set touch the authoritative ledger at all? */
  ledgerChangePresent: boolean;
  /** May the ledger file be dropped from risk computation? */
  exemptionApplied: boolean;
  /** Must the release be stopped outright? */
  failClosed: boolean;
  code: LedgerAppendValidationCode;
  reasons: string[];
  baseRowCount: number | null;
  candidateRowCount: number | null;
  appendedRows: AppendedRowSummary[];
}

export interface LedgerAppendInput {
  changedFiles: readonly ChangedFile[];
  /** BASE_PRODUCTION_SHA, as already resolved from the trusted ledger. */
  baseProductionSha: string;
  candidateSha: string;
  /** Reads a repository file at a commit; null when it does not exist there. */
  readFileAtCommit(sha: string, filePath: string): string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RUN_ID = /^[0-9]+$/;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const RECORDED_FINAL_RISK = new Set(["LOW", "MEDIUM", "HIGH", "LEGACY_IN_FLIGHT_RELEASE"]);

function verdict(
  code: LedgerAppendValidationCode,
  reasons: string[],
  extra: Partial<LedgerAppendEvaluation> = {},
): LedgerAppendEvaluation {
  return {
    ledgerChangePresent: true,
    exemptionApplied: code === "VALIDATED_HISTORICAL_LEDGER_APPEND",
    failClosed: FAIL_CLOSED_CODES.includes(code),
    code,
    reasons,
    baseRowCount: null,
    candidateRowCount: null,
    appendedRows: [],
    ...extra,
  };
}

function summarize(row: LedgerRow): AppendedRowSummary {
  return {
    release_sha: row.releaseSha,
    worker_version_id: row.workerVersionId,
    release_state: row.releaseState,
    final_traffic_percent: row.finalTrafficPercent,
    production_run_id: row.productionRunId,
    promotion_run_id: row.promotionRunId,
    final_risk: row.finalRisk as string | null,
    result: row.result,
    timestamp: row.timestamp,
  };
}

/**
 * Criterion 9 — "the appended row represents completed historical release
 * evidence". A row is only historical evidence if it names the run that
 * produced it, the Worker Version it is about, a recorded risk level, an
 * outcome and a timestamp. A `STABLE_100` row must additionally record the
 * promotion that took it to 100%. Anything weaker is a forward-looking or
 * placeholder row and never earns the exemption.
 */
export function validateCompletedHistoricalRow(row: LedgerRow): string[] {
  const problems: string[] = [];
  if (!UUID.test(row.workerVersionId)) problems.push(`WORKER_VERSION_ID "${row.workerVersionId}" is not a Worker Version UUID`);
  if (row.productionRunId === null || !RUN_ID.test(row.productionRunId)) {
    problems.push(`PRODUCTION_RUN_ID "${row.productionRunId ?? "-"}" is not a recorded run id — the row names no run that produced it`);
  }
  if (row.result === "") problems.push("RESULT is empty — the release's outcome is not recorded");
  if (!UTC_TIMESTAMP.test(row.timestamp)) problems.push(`TIMESTAMP "${row.timestamp}" is not a UTC YYYY-MM-DDTHH:MM:SSZ timestamp`);
  const finalRisk = row.finalRisk as string | null;
  if (finalRisk === null || !RECORDED_FINAL_RISK.has(finalRisk)) {
    problems.push(`FINAL_RISK "${finalRisk ?? "-"}" is not a recorded risk value — an appended row must carry the release's FINAL_RISK`);
  }
  if (row.releaseState === "STABLE_100") {
    if (row.finalTrafficPercent !== 100) problems.push(`STABLE_100 row records FINAL_TRAFFIC_PERCENT ${row.finalTrafficPercent ?? "-"}, not 100`);
    if (row.promotionRunId === null || !RUN_ID.test(row.promotionRunId)) {
      problems.push(`STABLE_100 row records no PROMOTION_RUN_ID — it does not evidence a completed promotion`);
    }
  }
  return problems;
}

export function evaluateLedgerAppendExemption(input: LedgerAppendInput): LedgerAppendEvaluation {
  const touching = input.changedFiles.filter((f) => f.path === LEDGER_PATH || f.oldPath === LEDGER_PATH);
  if (touching.length === 0) {
    return {
      ledgerChangePresent: false,
      exemptionApplied: false,
      failClosed: false,
      code: "NO_LEDGER_CHANGE",
      reasons: [],
      baseRowCount: null,
      candidateRowCount: null,
      appendedRows: [],
    };
  }

  // Criterion 7 (partial) — only an in-place modification of the ledger can
  // ever be an append. An add, delete, rename, copy or type change is a
  // structural change to the release authority itself.
  if (touching.length !== 1 || touching[0]!.status !== "M" || touching[0]!.path !== LEDGER_PATH || touching[0]!.oldPath !== undefined) {
    return verdict("LEDGER_CHANGE_NOT_A_PLAIN_MODIFICATION", [
      `the ledger appears in the diff as ${touching.map((f) => `${f.status} ${f.oldPath ? `${f.oldPath} -> ` : ""}${f.path}`).join(", ")} — only an in-place modification can be an append-only row addition`,
    ]);
  }

  // Criterion 1 — the ledger must have existed, with its authoritative table,
  // at BASE_PRODUCTION_SHA. There is nothing to compare an append against
  // otherwise.
  const baseText = input.readFileAtCommit(input.baseProductionSha, LEDGER_PATH);
  if (baseText === null) {
    return verdict("LEDGER_MISSING_AT_BASE", [`${LEDGER_PATH} does not exist at BASE_PRODUCTION_SHA ${input.baseProductionSha}`]);
  }
  const candidateText = input.readFileAtCommit(input.candidateSha, LEDGER_PATH);
  if (candidateText === null) {
    return verdict("LEDGER_MISSING_AT_CANDIDATE", [`${LEDGER_PATH} does not exist at CANDIDATE_SHA ${input.candidateSha}`]);
  }

  const baseTable = locateLedgerTable(baseText);
  if (!baseTable.ok) {
    return verdict("LEDGER_TABLE_ABSENT_OR_MALFORMED_AT_BASE", [
      `the authoritative ledger table cannot be located at BASE_PRODUCTION_SHA ${input.baseProductionSha}: ${baseTable.reason}`,
    ]);
  }
  const candidateTable = locateLedgerTable(candidateText);
  if (!candidateTable.ok) {
    return verdict("LEDGER_TABLE_MALFORMED_AT_CANDIDATE", [
      `the authoritative ledger table cannot be located in the candidate's ledger: ${candidateTable.reason}`,
    ]);
  }

  const baseRows = baseTable.table.rowLines;
  const candidateRows = candidateTable.table.rowLines;
  const counts = { baseRowCount: baseRows.length, candidateRowCount: candidateRows.length };

  // Criterion 2 — schema/header unchanged, byte-for-byte.
  if (baseTable.table.headerLine !== candidateTable.table.headerLine || baseTable.table.separatorLine !== candidateTable.table.separatorLine) {
    return verdict(
      "LEDGER_SCHEMA_CHANGED",
      ["the ledger table's header or separator row changed — a schema change is never an append-only row addition"],
      counts,
    );
  }

  // Criterion 12 (and the whole-file guarantee) — everything outside the
  // table's data rows must be byte-identical. Prose, the frozen legacy table,
  // the bootstrap record and the header all count: the exemption covers row
  // appends only, never "a row append plus some editing".
  const skeleton = (text: string, endIndex: number, rowCount: number): string => {
    const lines = text.split("\n");
    lines.splice(endIndex - rowCount, rowCount);
    return lines.join("\n");
  };
  if (skeleton(baseText, baseTable.table.endIndex, baseRows.length) !== skeleton(candidateText, candidateTable.table.endIndex, candidateRows.length)) {
    return verdict(
      "LEDGER_NON_ROW_CONTENT_CHANGED",
      [
        "the ledger changed outside the authoritative table's data rows (prose, the frozen legacy table, or surrounding structure) — the exemption covers appended rows only; move narrative into a release report instead",
      ],
      counts,
    );
  }

  // Criteria 5/6/7 — no deletion, no reordering, at least one new row.
  if (candidateRows.length < baseRows.length) {
    return verdict(
      "LEDGER_ROW_DELETED",
      [`the ledger has ${candidateRows.length} row(s) at the candidate but ${baseRows.length} at BASE_PRODUCTION_SHA — a row was removed`],
      counts,
    );
  }
  // Criteria 3/4/6 — every pre-existing row byte-identical, in the same order.
  for (let i = 0; i < baseRows.length; i += 1) {
    if (baseRows[i] !== candidateRows[i]) {
      return verdict(
        "LEDGER_ROW_EDITED_OR_REORDERED",
        [`ledger row ${i + 1} differs from its BASE_PRODUCTION_SHA content — historical rows are append-only and must never be edited or reordered`],
        counts,
      );
    }
  }
  if (candidateRows.length === baseRows.length) {
    return verdict(
      "LEDGER_NO_ROWS_APPENDED",
      ["the ledger file changed but no row was appended — a non-append ledger change never earns the exemption"],
      counts,
    );
  }

  // Criterion 8 — the whole candidate table must survive the same strict
  // validation a release-time baseline read applies. A malformed appended row
  // makes the release authority unreadable: fail closed.
  const strict = resolveBaseProductionShaFromManifest(candidateText);
  if (!strict.ok && strict.code === "LEDGER_MALFORMED") {
    return verdict("LEDGER_APPENDED_ROW_MALFORMED", [`the candidate's ledger does not validate strictly: ${strict.reason}`], counts);
  }

  const parsedRows = parseLedgerTable(candidateText);
  if (parsedRows.length !== candidateRows.length) {
    return verdict(
      "LEDGER_APPENDED_ROW_MALFORMED",
      [`the candidate's ledger has ${candidateRows.length} row line(s) but the parser read ${parsedRows.length} — refusing to reason about an inconsistent read`],
      counts,
    );
  }
  const appended = parsedRows.slice(baseRows.length);
  const appendedRows = appended.map(summarize);

  // Criterion 10 — an appended row must never claim the commit being
  // classified as already released. That is a candidate certifying itself.
  const selfClaiming = appended.filter((r) => r.releaseSha === input.candidateSha);
  if (selfClaiming.length > 0) {
    return verdict(
      "LEDGER_APPENDED_ROW_CLAIMS_CANDIDATE",
      [
        `an appended ledger row names CANDIDATE_SHA ${input.candidateSha} as an already-released RELEASE_SHA (state ${selfClaiming[0]!.releaseState}) — a release candidate can never carry its own release evidence`,
      ],
      { ...counts, appendedRows },
    );
  }

  // Criterion 9 — each appended row is completed historical release evidence.
  const rowProblems = appended.flatMap((r, i) => validateCompletedHistoricalRow(r).map((p) => `appended row ${baseRows.length + i + 1}: ${p}`));
  if (rowProblems.length > 0) {
    return verdict("LEDGER_APPENDED_ROW_NOT_COMPLETED_EVIDENCE", rowProblems, { ...counts, appendedRows });
  }

  // Criterion 11 — BASE_PRODUCTION_SHA must resolve identically from the
  // candidate's own ledger. In the normal flow the appended row IS the
  // STABLE_100 row that defines the baseline, so this holds by construction;
  // it fails exactly when the candidate's ledger is ahead of, or disagrees
  // with, the trusted one — i.e. when the baseline would depend on which copy
  // you read.
  if (!strict.ok) {
    return verdict(
      "LEDGER_BASE_RESOLUTION_NONDETERMINISTIC",
      [`BASE_PRODUCTION_SHA cannot be resolved from the candidate's own ledger: ${strict.reason}`],
      { ...counts, appendedRows },
    );
  }
  if (strict.releaseSha !== input.baseProductionSha) {
    return verdict(
      "LEDGER_BASE_RESOLUTION_NONDETERMINISTIC",
      [
        `the candidate's ledger resolves BASE_PRODUCTION_SHA to ${strict.releaseSha}, but this release was classified against ${input.baseProductionSha} — the baseline must not depend on which copy of the ledger is read`,
      ],
      { ...counts, appendedRows },
    );
  }

  return verdict(
    "VALIDATED_HISTORICAL_LEDGER_APPEND",
    [
      `${appended.length} row(s) appended to the authoritative ledger; header, separator, every pre-existing row and all non-row content are byte-identical to BASE_PRODUCTION_SHA, every appended row is completed historical release evidence, none names CANDIDATE_SHA, and BASE_PRODUCTION_SHA still resolves to ${input.baseProductionSha}`,
    ],
    { ...counts, appendedRows },
  );
}
