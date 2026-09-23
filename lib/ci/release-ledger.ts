/**
 * Production release ledger resolution — docs/release/RELEASE_POLICY.md
 * §Ledger / §Phase 3 (bootstrap) / §Phase 4 (BASE_PRODUCTION_SHA).
 *
 * Parses docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md's append-only
 * ledger table and resolves BASE_PRODUCTION_SHA: the RELEASE_SHA of the
 * latest row whose RELEASE_STATE is STABLE_100. BASE_PRODUCTION_SHA is
 * never main, branch HEAD, the latest staging SHA, the latest commit, or
 * the active canary's SHA — only a ledger row explicitly marked STABLE_100
 * counts. An active canary (CANARY_ACTIVE / LEGACY_IN_FLIGHT_RELEASE) is
 * historical/in-flight evidence and never displaces the prior STABLE_100
 * row as the base.
 */

export type ReleaseState = "STABLE_100" | "CANARY_ACTIVE" | "ROLLED_BACK" | "SUPERSEDED" | "LEGACY_IN_FLIGHT_RELEASE";

export interface LedgerRow {
  releaseSha: string;
  workerVersionId: string;
  releaseState: ReleaseState;
  finalTrafficPercent: number | null;
  stagingRunId: string | null;
  productionRunId: string | null;
  promotionRunId: string | null;
  rollbackVersionId: string | null;
  finalRisk: "LOW" | "MEDIUM" | "HIGH" | null;
  result: string;
  timestamp: string;
}

export type BaseProductionShaResolution =
  | { ok: true; releaseSha: string; row: LedgerRow }
  | { ok: false; code: "BASE_PRODUCTION_SHA_UNRESOLVED"; reason: string };

/**
 * Resolves BASE_PRODUCTION_SHA from a parsed ledger. Rows are assumed to be
 * in append-only, oldest-first order (as the ledger file itself is
 * maintained) — the LAST row with releaseState === "STABLE_100" is
 * authoritative, since a later STABLE_100 row records a subsequent
 * promotion superseding an earlier one.
 */
export function resolveBaseProductionSha(rows: readonly LedgerRow[]): BaseProductionShaResolution {
  const stableRows = rows.filter((r) => r.releaseState === "STABLE_100");
  if (stableRows.length === 0) {
    return {
      ok: false,
      code: "BASE_PRODUCTION_SHA_UNRESOLVED",
      reason:
        rows.length === 0
          ? "the release ledger is empty — no release evidence exists yet"
          : "the release ledger contains no row with RELEASE_STATE STABLE_100 — an active canary or legacy in-flight release never substitutes for a proven stable baseline",
    };
  }
  const latest = stableRows[stableRows.length - 1];
  return { ok: true, releaseSha: latest.releaseSha, row: latest };
}

/**
 * Parses the "Ledger" markdown table this module expects
 * docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md to carry — a GFM pipe
 * table whose header row (after normalization) is exactly:
 *
 *   RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT |
 *   STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID |
 *   FINAL_RISK | RESULT | TIMESTAMP
 *
 * A literal `-` in any cell means "not applicable/not recorded" and parses
 * to null. Returns rows in file order (oldest first, matching the
 * append-only convention) — never reorders or reinterprets historical rows.
 */
export function parseLedgerTable(markdown: string): LedgerRow[] {
  const lines = markdown.split("\n");
  const headerIdx = lines.findIndex((l) => /^\s*\|\s*RELEASE_SHA\s*\|/.test(l));
  if (headerIdx === -1) return [];

  const rows: LedgerRow[] = [];
  // Row 1 after the header is the "---|---|..." separator; data starts at +2.
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim().startsWith("|")) break;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 11) continue;

    const cell = (v: string): string | null => (v === "" || v === "-" ? null : v.replace(/^`|`$/g, ""));
    const [releaseSha, workerVersionId, releaseState, finalTrafficPercent, stagingRunId, productionRunId, promotionRunId, rollbackVersionId, finalRisk, result, timestamp] =
      cells;

    rows.push({
      releaseSha: cell(releaseSha!) ?? "",
      workerVersionId: cell(workerVersionId!) ?? "",
      releaseState: (cell(releaseState!) ?? "SUPERSEDED") as ReleaseState,
      finalTrafficPercent: cell(finalTrafficPercent!) === null ? null : Number(cell(finalTrafficPercent!)),
      stagingRunId: cell(stagingRunId!),
      productionRunId: cell(productionRunId!),
      promotionRunId: cell(promotionRunId!),
      rollbackVersionId: cell(rollbackVersionId!),
      finalRisk: cell(finalRisk!) as LedgerRow["finalRisk"],
      result: cell(result!) ?? "",
      timestamp: cell(timestamp!) ?? "",
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Strict, release-time baseline resolution — RELEASE_POLICY.md §0.2/§2.
//
// parseLedgerTable above is deliberately lenient (positional, skips short
// rows, defaults an empty RELEASE_STATE) so historical tooling can read the
// file. A real release gate must never act on a lenient read: a reordered
// header, a truncated row, an unknown RELEASE_STATE, or a malformed SHA could
// silently shift which row counts as STABLE_100. resolveBaseProductionShaFromManifest
// validates the whole authoritative table first and fails closed
// (LEDGER_MALFORMED) on anything it cannot read unambiguously, then resolves
// through the same resolveBaseProductionSha every other caller uses.
// ---------------------------------------------------------------------------

export const LEDGER_COLUMNS = [
  "RELEASE_SHA",
  "WORKER_VERSION_ID",
  "RELEASE_STATE",
  "FINAL_TRAFFIC_PERCENT",
  "STAGING_RUN_ID",
  "PRODUCTION_RUN_ID",
  "PROMOTION_RUN_ID",
  "ROLLBACK_VERSION_ID",
  "FINAL_RISK",
  "RESULT",
  "TIMESTAMP",
] as const;

const RELEASE_STATES = new Set<string>(["STABLE_100", "CANARY_ACTIVE", "ROLLED_BACK", "SUPERSEDED", "LEGACY_IN_FLIGHT_RELEASE"]);

/**
 * FINAL_RISK values a ledger row may carry. LEGACY_IN_FLIGHT_RELEASE is the
 * marker promote-production.yml emits for the pre-policy release
 * (RELEASE_POLICY.md §17) — historical evidence, accepted as-is, never
 * reinterpreted as a risk level.
 */
const LEDGER_FINAL_RISK_VALUES = new Set<string>(["LOW", "MEDIUM", "HIGH", "LEGACY_IN_FLIGHT_RELEASE"]);

const FULL_SHA = /^[0-9a-f]{40}$/;
/** The authoritative ledger table's header line. Exactly one may exist in the file. */
export const LEDGER_HEADER_LINE = /^\s*\|\s*RELEASE_SHA\s*\|/;
const SEPARATOR_CELL = /^:?-{3,}:?$/;

/**
 * Where the one authoritative ledger table sits inside a manifest, and the
 * exact lines its rows occupy. Purely structural — it validates nothing about
 * a row's contents (resolveBaseProductionShaFromManifest does that) — so a
 * caller that needs to compare two revisions of the ledger line-by-line
 * (lib/ci/ledger-append-exemption.ts) can do so without re-deriving where the
 * table starts and ends.
 */
export interface LedgerTableLocation {
  headerIndex: number;
  headerLine: string;
  separatorIndex: number;
  separatorLine: string;
  /** Data-row lines in file order, verbatim (never trimmed or normalized). */
  rowLines: string[];
  /** Index of the first line AFTER the last data row. */
  endIndex: number;
}

export function locateLedgerTable(markdown: string): { ok: true; table: LedgerTableLocation } | { ok: false; reason: string } {
  const lines = markdown.split("\n");
  const headerIdxs = lines.flatMap((l, i) => (LEDGER_HEADER_LINE.test(l) ? [i] : []));
  if (headerIdxs.length === 0) return { ok: false, reason: "no ledger table with a RELEASE_SHA header was found" };
  if (headerIdxs.length > 1) {
    return { ok: false, reason: `${headerIdxs.length} ledger tables with a RELEASE_SHA header were found — exactly one authoritative table is required` };
  }
  const headerIndex = headerIdxs[0]!;
  const separatorIndex = headerIndex + 1;
  const separatorLine = lines[separatorIndex];
  if (separatorLine === undefined || !separatorLine.trim().startsWith("|")) {
    return { ok: false, reason: "ledger header is not followed by a separator row" };
  }
  const rowLines: string[] = [];
  let i = separatorIndex + 1;
  for (; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (!line.trim().startsWith("|")) break;
    rowLines.push(line);
  }
  return { ok: true, table: { headerIndex, headerLine: lines[headerIndex]!, separatorIndex, separatorLine, rowLines, endIndex: i } };
}

export type StrictBaseProductionShaResolution =
  | BaseProductionShaResolution
  | { ok: false; code: "LEDGER_MALFORMED"; reason: string };

function splitRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
}

function unquote(v: string): string {
  return v.replace(/^`|`$/g, "");
}

export function resolveBaseProductionShaFromManifest(markdown: string): StrictBaseProductionShaResolution {
  const malformed = (reason: string): StrictBaseProductionShaResolution => ({ ok: false, code: "LEDGER_MALFORMED", reason });
  const lines = markdown.split("\n");

  const headerIdxs = lines.flatMap((l, i) => (LEDGER_HEADER_LINE.test(l) ? [i] : []));
  if (headerIdxs.length === 0) return malformed("no ledger table with a RELEASE_SHA header was found");
  if (headerIdxs.length > 1) {
    return malformed(`${headerIdxs.length} ledger tables with a RELEASE_SHA header were found — exactly one authoritative table is required`);
  }
  const headerIdx = headerIdxs[0]!;

  const header = splitRow(lines[headerIdx]!);
  if (header.length < LEDGER_COLUMNS.length || LEDGER_COLUMNS.some((c, i) => header[i] !== c)) {
    return malformed(`ledger header columns are [${header.join(", ")}] — the first ${LEDGER_COLUMNS.length} must be exactly [${LEDGER_COLUMNS.join(", ")}]`);
  }

  const separator = lines[headerIdx + 1];
  if (separator === undefined || !separator.trim().startsWith("|")) return malformed("ledger header is not followed by a separator row");
  const sepCells = splitRow(separator);
  if (sepCells.length !== header.length || !sepCells.every((c) => SEPARATOR_CELL.test(c))) {
    return malformed("ledger separator row does not match the header's column count/shape");
  }

  let dataRows = 0;
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim().startsWith("|")) break;
    dataRows++;
    const where = `ledger row ${dataRows} (line ${i + 1})`;
    const cells = splitRow(line);
    if (cells.length !== header.length) {
      return malformed(`${where} has ${cells.length} cells, expected ${header.length}`);
    }
    const releaseSha = unquote(cells[0]!);
    const releaseState = unquote(cells[2]!);
    const finalRisk = unquote(cells[8]!);
    if (!FULL_SHA.test(releaseSha)) return malformed(`${where} RELEASE_SHA "${releaseSha}" is not a full 40-character lowercase commit SHA`);
    if (!RELEASE_STATES.has(releaseState)) return malformed(`${where} RELEASE_STATE "${releaseState}" is not a recognized state`);
    if (finalRisk !== "-" && finalRisk !== "" && !LEDGER_FINAL_RISK_VALUES.has(finalRisk)) {
      return malformed(`${where} FINAL_RISK "${finalRisk}" is not a recognized value`);
    }
  }

  const rows = parseLedgerTable(markdown);
  if (rows.length !== dataRows) {
    return malformed(`validated ${dataRows} ledger row(s) but the ledger parser read ${rows.length} — refusing to resolve from an inconsistent read`);
  }
  return resolveBaseProductionSha(rows);
}
