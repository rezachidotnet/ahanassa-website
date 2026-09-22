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
