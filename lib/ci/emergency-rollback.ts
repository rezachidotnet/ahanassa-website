/**
 * Emergency rollback target validation — docs/release/RELEASE_POLICY.md
 * §Phase 12. Emergency rollback is a distinct OPERATION_TYPE from an
 * ordinary RELEASE: it targets a previously recorded, deterministic,
 * validated Worker Version — never an arbitrary SHA or an arbitrary Worker
 * Version ID typed in at dispatch time.
 *
 * A valid rollback target is any Worker Version ID that already appears in
 * the release ledger, either as a row's own WORKER_VERSION_ID (something
 * that was itself deployed and recorded) or as a row's ROLLBACK_VERSION_ID
 * (something explicitly captured as a safe rollback target before a traffic
 * shift, per the deploy-production.yml PREVIOUS_VERSION_ID convention this
 * mirrors). Anything else — including a syntactically-plausible but
 * never-recorded UUID, or a 40-hex commit SHA passed where a Worker Version
 * ID belongs — fails closed.
 */

import type { LedgerRow } from "./release-ledger.ts";

export type OperationType = "RELEASE" | "EMERGENCY_ROLLBACK";

const WORKER_VERSION_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMMIT_SHA_SHAPE = /^[0-9a-f]{40}$/i;

export type RollbackTargetResolution =
  | { ok: true; versionId: string; recordedAs: "WORKER_VERSION_ID" | "ROLLBACK_VERSION_ID"; row: LedgerRow }
  | { ok: false; code: "ROLLBACK_TARGET_UNRESOLVED"; reason: string };

/**
 * Validates a requested emergency-rollback target against the release
 * ledger. Never trusts the shape of the input alone — a well-formed UUID
 * that simply never appears in ledger evidence is rejected exactly like a
 * malformed one.
 */
export function validateRollbackTarget(requestedVersionId: string, ledgerRows: readonly LedgerRow[]): RollbackTargetResolution {
  if (!requestedVersionId || requestedVersionId.trim() === "") {
    return { ok: false, code: "ROLLBACK_TARGET_UNRESOLVED", reason: "no rollback target was supplied" };
  }
  if (COMMIT_SHA_SHAPE.test(requestedVersionId)) {
    return {
      ok: false,
      code: "ROLLBACK_TARGET_UNRESOLVED",
      reason: "a 40-hex commit SHA is not a valid rollback target — rollback targets a previously recorded Worker Version ID, never an arbitrary SHA",
    };
  }
  if (!WORKER_VERSION_ID_SHAPE.test(requestedVersionId)) {
    return { ok: false, code: "ROLLBACK_TARGET_UNRESOLVED", reason: "the supplied value is not a well-formed Worker Version ID" };
  }
  if (ledgerRows.length === 0) {
    return { ok: false, code: "ROLLBACK_TARGET_UNRESOLVED", reason: "the release ledger is empty — no recorded rollback target exists" };
  }

  for (const r of ledgerRows) {
    if (r.workerVersionId === requestedVersionId) {
      return { ok: true, versionId: requestedVersionId, recordedAs: "WORKER_VERSION_ID", row: r };
    }
  }
  for (const r of ledgerRows) {
    if (r.rollbackVersionId === requestedVersionId) {
      return { ok: true, versionId: requestedVersionId, recordedAs: "ROLLBACK_VERSION_ID", row: r };
    }
  }

  return {
    ok: false,
    code: "ROLLBACK_TARGET_UNRESOLVED",
    reason: `"${requestedVersionId}" does not appear as a WORKER_VERSION_ID or ROLLBACK_VERSION_ID in any release ledger row — arbitrary rollback targets are forbidden`,
  };
}
