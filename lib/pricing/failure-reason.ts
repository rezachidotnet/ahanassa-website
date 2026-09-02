import { ProviderNotConfiguredError } from "./provider.ts";

/**
 * The ONE authoritative, documented `price_sync_state.last_failure_reason_code`
 * vocabulary (docs/pricing/PRICE_PROVIDER_CONTRACT.md §11/§14). Raw
 * `Error` class names/messages are NEVER persisted to `price_sync_state` —
 * only these canonical codes. Raw error detail may appear in structured
 * diagnostic logs (console.error), never in the persisted monitoring
 * state, and never including credentials or provider payload data.
 */
export type PriceSyncFailureReasonCode =
  | "provider_not_configured"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_configuration_error"
  | "database_unavailable"
  | "lease_acquisition_failed"
  | "incomplete_fetch"
  | "critical_normalization_failure"
  | "partial_validation_or_mapping_failure"
  | "suspicious_empty_snapshot"
  | "suspicious_count_collapse"
  | "persistence_failed"
  | "unknown_provider_failure";

/**
 * The sync orchestrator (lib/pricing/sync-orchestrator.ts) tracks which
 * stage it's in and, on any thrown error, maps `(stage, error)` to exactly
 * one canonical code via this pure, unit-tested function — never
 * `error.constructor.name` or `error.message` directly. Kept separate
 * from the orchestrator itself so it's testable without D1 (same pattern
 * as lib/pricing/sync-safety.ts).
 */
export type SyncStage = "get_db" | "registry_lookup" | "config_resolution" | "lease_acquisition" | "provider_fetch" | "normalize_map" | "persistence" | "record_outcome";

export function reasonCodeForStage(stage: SyncStage, error: unknown): PriceSyncFailureReasonCode {
  switch (stage) {
    case "get_db":
      return "database_unavailable";
    case "registry_lookup":
      return "unknown_provider_failure";
    case "config_resolution":
      return "provider_configuration_error";
    case "lease_acquisition":
      return "lease_acquisition_failed";
    case "provider_fetch":
      return error instanceof ProviderNotConfiguredError ? "provider_not_configured" : isTimeoutLike(error) ? "provider_timeout" : "provider_unavailable";
    case "normalize_map":
      return "critical_normalization_failure";
    case "persistence":
      return "persistence_failed";
    case "record_outcome":
      return "persistence_failed";
    default:
      return "unknown_provider_failure";
  }
}

/** Recognizes the standard `AbortError`/`TimeoutError` shapes a provider adapter's own fetch may throw — never inferred from a free-text message match beyond the DOMException-standard `.name`. */
function isTimeoutLike(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/** Only ever extracts a short, safe, scalar message for diagnostic logging — never the raw error object (which could carry provider payload data) and never a credential/secret. */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}
