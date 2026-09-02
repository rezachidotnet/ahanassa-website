import type { ReconciliationPolicy } from "./provider-config.ts";

/**
 * The safe-deactivation gate (docs/pricing/PRICE_PROVIDER_CONTRACT.md,
 * "Safe reconciliation") — pure decision logic, deliberately split out of
 * `sync-orchestrator.ts` (which touches D1) so it can be unit-tested
 * directly, mirroring `lib/catalog/sync-safety.ts`'s own
 * plausibility-guard pattern in this codebase.
 *
 * Definitive policy: missing quote keys may be soft-deactivated only when
 * ALL of — full-snapshot mode, the provider explicitly opted in
 * (`allowSnapshotReconciliation`), the fetch completed, and zero records
 * were rejected by normalization/mapping this run. An exactly-empty
 * incoming set is governed SOLELY by `allowAuthoritativeEmptySnapshot`
 * (never additionally gated by `maxReconciliationDeactivationFraction` —
 * that's the separate, non-empty abnormal-collapse case). When the
 * incoming set is non-empty but some previously-active quotes are
 * missing, deactivation proceeds only up to the provider's own declared
 * `maxReconciliationDeactivationFraction`; an undeclared fraction means
 * "block any non-zero deactivation" — no universal percentage is
 * hardcoded.
 */

export interface ReconciliationGateInput {
  mode: "full_snapshot" | "incremental";
  complete: boolean;
  /** Records rejected by normalization or mapping this run (isolated per-record rejections that didn't stop the whole run — see sync-orchestrator.ts step 2/3). */
  rejectedRecordCount: number;
  /** Total normalized+mapped quotes returned this run, for this provider. */
  incomingKeyCount: number;
  /** Previously-`active` quote_keys for this provider that are NOT present in this run's incoming set — computed precisely by the orchestrator as a real set difference, never inferred from a count delta. */
  missingKeyCount: number;
  /** How many quote_keys were `active` for this provider before this run — the denominator for the collapse-fraction check. */
  previousActiveKeyCountForProvider: number;
  policy: ReconciliationPolicy;
}

export type ReconciliationConcern = "incomplete_fetch" | "partial_validation_or_mapping_failure" | "suspicious_empty_snapshot" | "suspicious_count_collapse";

export type ReconciliationGateResult = { shouldReconcile: true } | { shouldReconcile: false; concern: ReconciliationConcern | null };

export function evaluateReconciliationGate(input: ReconciliationGateInput): ReconciliationGateResult {
  // Structurally inapplicable, not a "concern" — an incremental-mode
  // provider's response never deactivates by absence, and a provider that
  // hasn't opted into snapshot reconciliation at all simply never
  // reconciles. Neither is worth flagging as suspicious.
  if (input.mode !== "full_snapshot") return { shouldReconcile: false, concern: null };
  if (!input.policy.allowSnapshotReconciliation) return { shouldReconcile: false, concern: null };

  if (!input.complete) return { shouldReconcile: false, concern: "incomplete_fetch" };
  if (input.rejectedRecordCount > 0) return { shouldReconcile: false, concern: "partial_validation_or_mapping_failure" };

  if (input.incomingKeyCount === 0) {
    return input.policy.allowAuthoritativeEmptySnapshot ? { shouldReconcile: true } : { shouldReconcile: false, concern: "suspicious_empty_snapshot" };
  }

  if (input.missingKeyCount > 0) {
    const fraction = input.previousActiveKeyCountForProvider > 0 ? input.missingKeyCount / input.previousActiveKeyCountForProvider : 1;
    const allowedFraction = input.policy.maxReconciliationDeactivationFraction;
    const withinAllowance = allowedFraction !== undefined && fraction <= allowedFraction;
    if (!withinAllowance) return { shouldReconcile: false, concern: "suspicious_count_collapse" };
  }

  return { shouldReconcile: true };
}
