import { fetchProcessingGroups, type ProcessingLocale } from "./odoo-api-client";
import { planProcessingGroupsSync, validateProcessingGroupsBatch } from "./sync";
import { createProcessingGroup, getAllProcessingGroupsForSync, updateProcessingGroup, withdrawProcessingGroups } from "./repository";

/**
 * Sync orchestrator — the only place that wires fetch (odoo-api-client) ->
 * validate/plan (sync.ts) -> apply (repository.ts), mirroring
 * `lib/catalog/sync-runner.ts`'s own role exactly. Not exposed as an HTTP
 * route (same CLAUDE.md "no unauthenticated public sync endpoint" rule) —
 * `lib/processing/scheduled-sync.ts` (Cron-triggered) is the intended
 * caller.
 *
 * ARCHITECTURAL DECISION (task §5): Option B — a small Processing-specific
 * adapter on top of shared primitives, not a full reuse of
 * `lib/catalog/sync-runner.ts` (Option A) and not an unrelated
 * from-scratch implementation (Option C). Concretely reused: the D1 access
 * pattern (`getPublicDb`), ULID id generation, the lease/durable-state
 * repository *shape* (`lib/processing/sync-state-repository.ts` mirrors
 * `lib/catalog/sync-state-repository.ts`'s design), the "fail closed, never
 * partially apply a bad batch" control flow, and the conditional-GET
 * transport shape already present in `lib/catalog/odoo-api-client.ts`.
 *
 * Deliberately NOT reused: `lib/catalog/sync-safety.ts#evaluateFullSyncPlausibility`'s
 * ratio-based "implausible drop" guard. That guard's constants
 * (`MIN_CATALOG_SIZE_FOR_GUARD = 5`, `CATASTROPHIC_DROP_RATIO = 0.5`) are
 * calibrated to the Catalog's real scale (237 variants) — at Processing's
 * real scale (a small, fixed handful of groups, e.g. 3), that guard's own
 * `currentActiveCount < 5` escape hatch means it would ALWAYS be bypassed,
 * silently doing nothing at exactly the scale where a real bug would be
 * most visible. Worse, the ratio check itself is the wrong shape for
 * Processing: a single group's legitimate individual withdrawal already
 * looks like a large relative drop (e.g. 2/3 remaining = 33% drop) that
 * `CATASTROPHIC_DROP_RATIO = 0.5` would incorrectly refuse, even though
 * task §11 explicitly expects ordinary individual-group withdrawal to work.
 * Reusing it unchanged would either do nothing (below the size floor) or
 * actively block legitimate withdrawals (above it) — not a safe default
 * either way.
 *
 * Processing's actual safety net is the general one from task §9/§10: a
 * response must pass full shape + domain validation (odoo-api-client.ts +
 * sync.ts#validateProcessingGroupsBatch) to be applied AT ALL — a
 * genuinely validated, well-formed, `meta.total`-consistent empty response
 * is a legitimate authoritative "withdraw everything" result (task §10);
 * anything that fails validation (malformed JSON, wrong shape, duplicate
 * identity, total mismatch) is refused before ever calling `repository.ts`,
 * leaving DB_PUBLIC's last-known-good rows completely untouched. See
 * `sync.test.ts` for the explicit "valid empty vs malformed" test task §10
 * requires.
 */

export interface ProcessingLocaleSyncResult {
  locale: ProcessingLocale;
  status: "ok" | "not_modified" | "not_configured" | "failed";
  created: number;
  updated: number;
  withdrawn: number;
  unchanged: number;
  etag?: string;
  reasonCode?: string;
}

/**
 * Runs one locale's sync pass. Never throws on an upstream/validation
 * problem — every failure path returns `status: "failed"` with a safe
 * `reasonCode` instead, and `repository.ts` writes are only ever reached
 * after both the transport-shape check (`odoo-api-client.ts`) and the
 * domain-batch check (`sync.ts#validateProcessingGroupsBatch`) succeed —
 * the task §9 FAILURE LAW ("a failed or malformed upstream sync must NOT
 * wipe the last-known-good DB_PUBLIC ... dataset") holds structurally, not
 * by a special-cased guard.
 */
export async function runProcessingLocaleSync(locale: ProcessingLocale, ifNoneMatch: string | null): Promise<ProcessingLocaleSyncResult> {
  const empty = { created: 0, updated: 0, withdrawn: 0, unchanged: 0 };

  const fetched = await fetchProcessingGroups({ locale, ifNoneMatch });

  if (fetched.status === "not_configured") {
    return { locale, status: "not_configured", ...empty };
  }
  if (fetched.status === "not_modified") {
    // Task §12: never an error, never a DB_PUBLIC mutation.
    return { locale, status: "not_modified", ...empty, etag: ifNoneMatch ?? undefined };
  }
  if (fetched.status === "failed" || !fetched.items || !fetched.meta) {
    return { locale, status: "failed", ...empty, reasonCode: fetched.reasonCode ?? "PROCESSING_SYNC_FETCH_FAILED" };
  }

  const validated = validateProcessingGroupsBatch(fetched.items, fetched.meta);
  if (!validated.valid) {
    // Malformed/inconsistent batch — DB_PUBLIC is never touched (task §9).
    return { locale, status: "failed", ...empty, reasonCode: validated.reasonCode };
  }

  const existing = await getAllProcessingGroupsForSync(locale);
  const plan = planProcessingGroupsSync(validated.items, existing);

  for (const item of plan.toCreate) {
    await createProcessingGroup(locale, item);
  }
  for (const { id, patch } of plan.toUpdate) {
    await updateProcessingGroup(id, patch);
  }
  await withdrawProcessingGroups(plan.toWithdraw);

  return {
    locale,
    status: "ok",
    created: plan.toCreate.length,
    updated: plan.toUpdate.length,
    withdrawn: plan.toWithdraw.length,
    unchanged: plan.unchanged.length,
    etag: fetched.etag,
  };
}
