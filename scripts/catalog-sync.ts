import { execFileSync } from "node:child_process";
import {
  describeEnvironmentError,
  flagBoolean,
  parseArgs,
  resolveReadEnvironment,
  resolveWriteEnvironment,
  sqliteLiteral,
  wranglerExecuteArgs,
  type CliEnv,
} from "../lib/catalog/editorial-cli.ts";
import { fetchCatalogProductsPage } from "../lib/catalog/odoo-api-client.ts";
import { normalizeCatalogTimestamp, planCatalogV1Sync, slugifyFromSku, slugifyTemplateXid } from "../lib/catalog/sync.ts";
import { applyIncrementalWatermarkMargin, evaluateFullSyncPlausibility } from "../lib/catalog/sync-safety.ts";
import {
  buildAcquireLeaseSql,
  buildDeactivateVariantsSql,
  buildInsertCatalogProductSql,
  buildInsertVariantSql,
  buildRecordAttemptStartSql,
  buildRecordFailureSql,
  buildRecordSuccessSql,
  buildReleaseLeaseSql,
  buildSelectCatalogProductByTemplateXidSql,
  buildSelectSyncStateSql,
  buildUpdateVariantCommercialFieldsSql,
} from "../lib/catalog/sync-sql.ts";
import { ulid } from "../lib/rfq/ulid.ts";
import type { CatalogApiProduct } from "../lib/catalog/odoo-api-client.ts";
import type { ProductVariant } from "../lib/catalog/types.ts";
import type { CatalogSyncType } from "../lib/catalog/sync-state-repository.ts";

/**
 * Manual Catalog synchronization operator CLI — Stage H,
 * DOCUMENT_AUDIT_REPORT.md DAR-040, docs/CATALOG_SYNC_OPERATIONS.md.
 *
 * Run with: node scripts/catalog-sync.ts <command> [args...]
 *
 * A controlled way for an operator/developer to run an incremental sync or
 * a full reconciliation without waiting for the scheduled Cron trigger —
 * NOT a public HTTP endpoint. Reaches D1 exclusively via `wrangler d1
 * execute` (same reason and same pattern as scripts/catalog-editorial.ts:
 * this is a plain Node process, which cannot import anything that pulls in
 * `cloudflare:workers`). Reaches Odoo exclusively via a real `fetch()` call
 * to the same public, anonymous, read-only Catalog API the scheduled Worker
 * itself uses (`lib/catalog/odoo-api-client.ts`, imported directly and
 * unmodified — this script never re-implements fetching).
 *
 * All planning logic (`planCatalogV1Sync`) and all safety logic
 * (`evaluateFullSyncPlausibility`, `applyIncrementalWatermarkMargin`) is
 * imported directly from the same pure modules the real scheduled
 * coordinator (`lib/catalog/scheduled-sync.ts`) uses — nothing is
 * reimplemented here. Only the "apply this plan to D1" step is
 * necessarily script-specific (SQL text generated via
 * `lib/catalog/sync-sql.ts`, which mirrors `lib/catalog/repository.ts`
 * exactly), for the same unavoidable reason `scripts/catalog-editorial.ts`
 * needed its own SQL builders.
 *
 * Environment safeguards are reused verbatim from
 * `lib/catalog/editorial-cli.ts` — every write requires an explicit
 * `--env`, and `--env production` additionally requires
 * `--confirm-production`.
 */

const LEASE_DURATION_MS = 10 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 200;

function runD1<T = Record<string, unknown>>(env: CliEnv, sql: string): T[] {
  const args = wranglerExecuteArgs(env, sql);
  let stdout: string;
  try {
    stdout = execFileSync("npx", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(`wrangler d1 execute failed:\n${`${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message ?? ""}`.slice(0, 2000)}`);
  }
  const parsed = JSON.parse(stdout) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? [];
}

function nowIso(): string {
  return new Date().toISOString();
}

// --- Odoo fetch (real HTTP, plain Node-compatible) ---

async function fetchAllPages(updatedSince?: string): Promise<{ status: "ok" | "not_configured" | "failed"; items: CatalogApiProduct[]; reasonCode?: string }> {
  const items: CatalogApiProduct[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await fetchCatalogProductsPage({ page, pageSize: DEFAULT_PAGE_SIZE, updatedSince, locale: "fa" });
    if (result.status === "not_configured") return { status: "not_configured", items: [] };
    if (result.status !== "ok" || !result.data) return { status: "failed", items: [], reasonCode: result.reasonCode ?? "CATALOG_SYNC_LIST_FAILED" };
    items.push(...result.data.items);
    if (page >= result.data.meta.pages) break;
  }
  return { status: "ok", items };
}

// --- existing-variant read (mirrors repository.ts#getAllVariantsForSync) ---

function mapExistingRow(row: Record<string, unknown>): ProductVariant {
  const parseJson = (raw: unknown): Record<string, number> | null => {
    if (typeof raw !== "string" || !raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, number>) : null;
    } catch {
      return null;
    }
  };
  return {
    id: row.id as string,
    productId: row.product_id as string,
    xid: row.xid as string,
    sku: row.sku as string,
    commercialName: row.commercial_name as string,
    nameFa: row.name_fa as string,
    slugFa: row.slug_fa as string | null,
    commercialSize: row.commercial_size as string | null,
    sectionSize: row.section_size as string | null,
    schedule: row.schedule as string | null,
    family: { code: row.family_code as string | null, name: row.family_name as string | null },
    group: { code: row.group_code as string | null, name: row.group_name as string | null },
    form: { code: row.form_code as string | null, name: row.form_name as string | null },
    grade: { code: row.grade_code as string | null, name: row.grade_name as string | null },
    standard: { code: row.standard_code as string | null, name: row.standard_name as string | null },
    dimensions: parseJson(row.dimensions_json),
    nominalWeight: parseJson(row.nominal_weight_json),
    allowedCommercialUnits: row.allowed_commercial_units as string | null,
    inventoryUom: row.inventory_uom as string | null,
    catalogUpdatedAt: row.catalog_updated_at as string | null,
    isActive: row.is_active === 1,
    isPublic: row.is_public === 1,
    isPricePublic: row.is_price_public === 1,
    syncStatus: row.sync_status as ProductVariant["syncStatus"],
    syncVersion: row.sync_version as number,
    lastSyncedAt: row.last_synced_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function getAllExisting(env: CliEnv): ProductVariant[] {
  return runD1<Record<string, unknown>>(env, `SELECT * FROM product_variants;`).map(mapExistingRow);
}

// --- apply plan (mirrors repository.ts's writes, via sync-sql.ts builders) ---

function applyPlanRemote(env: CliEnv, plan: ReturnType<typeof planCatalogV1Sync>, now: string): { created: number; updated: number; deactivated: number } {
  const templateIdCache = new Map<string, string>();

  function ensureCatalogProductId(templateXid: string, commercialTemplateName: string): string {
    const cached = templateIdCache.get(templateXid);
    if (cached) return cached;
    const existing = runD1<{ id: string }>(env, buildSelectCatalogProductByTemplateXidSql(templateXid));
    if (existing.length > 0) {
      templateIdCache.set(templateXid, existing[0].id);
      return existing[0].id;
    }
    const id = ulid();
    runD1(env, buildInsertCatalogProductSql({ id, templateXid, commercialTemplateName, nameFa: commercialTemplateName, slugFa: slugifyTemplateXid(templateXid), now }));
    templateIdCache.set(templateXid, id);
    return id;
  }

  for (const item of plan.toCreate) {
    const productId = ensureCatalogProductId(item.templateXid, item.commercialTemplateName);
    runD1(env, buildInsertVariantSql(ulid(), productId, item, item.commercialName, slugifyFromSku(item.sku), now));
  }
  for (const { id, patch } of plan.toUpdate) {
    runD1(env, buildUpdateVariantCommercialFieldsSql(id, patch, now));
  }
  const deactivateSql = buildDeactivateVariantsSql(plan.toDeactivate, now);
  if (deactivateSql) runD1(env, deactivateSql);

  return { created: plan.toCreate.length, updated: plan.toUpdate.length, deactivated: plan.toDeactivate.length };
}

// --- sync_state helpers ---

interface SyncStateRow {
  last_attempted_at: string | null;
  last_attempted_type: string | null;
  last_success_at: string | null;
  last_success_type: string | null;
  last_incremental_watermark: string | null;
  last_full_reconciliation_at: string | null;
  last_full_upstream_count: number | null;
  consecutive_failure_count: number;
  last_failure_at: string | null;
  last_failure_type: string | null;
  last_failure_reason_code: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
}

function getState(env: CliEnv): SyncStateRow {
  const rows = runD1<SyncStateRow>(env, buildSelectSyncStateSql());
  if (rows.length === 0) throw new Error("catalog_sync_state singleton row missing — migrations_public/0003_catalog_sync_state.sql not applied to this environment");
  return rows[0];
}

function printState(env: CliEnv, state: SyncStateRow): void {
  console.log(`\nCatalog sync state — env=${env}`);
  for (const [key, value] of Object.entries(state)) console.log(`  ${key}: ${value}`);
}

function acquireLease(env: CliEnv): string {
  const runId = ulid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS).toISOString();
  runD1(env, buildAcquireLeaseSql(runId, expiresAt, now.toISOString()));
  // Verify we actually won it (wrangler's exec doesn't return affected-row count in a way this script parses) — a cheap follow-up read confirms ownership.
  const state = getState(env);
  if (state.lease_owner !== runId) {
    throw new Error("could not acquire the catalog sync lease — another run currently holds it (scheduled Cron or another manual run). Try again shortly.");
  }
  return runId;
}

function releaseLease(env: CliEnv, runId: string): void {
  runD1(env, buildReleaseLeaseSql(runId, nowIso()));
}

// --- commands ---

function mustReadEnv(flags: ReturnType<typeof parseArgs>["flags"]): CliEnv {
  const result = resolveReadEnvironment(flags);
  if (!result.ok) throw new Error(describeEnvironmentError(result));
  return result.env;
}

function cmdStatus(flags: ReturnType<typeof parseArgs>["flags"]): void {
  const env = mustReadEnv(flags);
  printState(env, getState(env));
}

async function cmdIncremental(flags: ReturnType<typeof parseArgs>["flags"]): Promise<void> {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const env = envResult.env;
  const dryRun = flagBoolean(flags, "dry-run");

  const stateBefore = getState(env);
  console.log(`\nIncremental sync — env=${env} watermarkBefore=${stateBefore.last_incremental_watermark} dryRun=${dryRun}`);

  if (!stateBefore.last_incremental_watermark) {
    console.log("No prior watermark — run a full reconciliation first (`full --env " + env + "`).");
    return;
  }

  const pulled = await fetchAllPages(stateBefore.last_incremental_watermark);
  if (pulled.status !== "ok") {
    console.error(`Fetch failed: status=${pulled.status} reasonCode=${pulled.reasonCode ?? ""}`);
    if (!dryRun) runOutsideLease(env, "incremental", () => runD1(env, buildRecordFailureSql("incremental", pulled.reasonCode ?? "CATALOG_SYNC_LIST_FAILED", nowIso())));
    process.exitCode = 1;
    return;
  }

  const existing = getAllExisting(env);
  const plan = planCatalogV1Sync(pulled.items, existing, false);
  console.log(`Plan: toCreate=${plan.toCreate.length} toUpdate=${plan.toUpdate.length} toDeactivate=${plan.toDeactivate.length} unchanged=${plan.unchanged.length}`);

  if (dryRun) {
    console.log("(dry run — no write performed)");
    return;
  }

  const runId = acquireLease(env);
  try {
    runD1(env, buildRecordAttemptStartSql("incremental", nowIso()));
    const now = nowIso();
    const applied = applyPlanRemote(env, plan, now);
    const maxObserved = pulled.items.length > 0 ? pulled.items.map((p) => normalizeCatalogTimestamp(p.updated_at)).sort().at(-1)! : null;
    const watermark = maxObserved ? applyIncrementalWatermarkMargin(maxObserved) : null;
    runD1(env, buildRecordSuccessSql("incremental", pulled.items.length, watermark, nowIso()));
    console.log(`Applied: created=${applied.created} updated=${applied.updated} deactivated=${applied.deactivated} watermarkAfter=${watermark ?? stateBefore.last_incremental_watermark}`);
  } catch (err) {
    runD1(env, buildRecordFailureSql("incremental", "CATALOG_SYNC_MANUAL_CLI_ERROR", nowIso()));
    throw err;
  } finally {
    releaseLease(env, runId);
  }
}

async function cmdFull(flags: ReturnType<typeof parseArgs>["flags"]): Promise<void> {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const env = envResult.env;
  const dryRun = flagBoolean(flags, "dry-run");

  console.log(`\nFull reconciliation — env=${env} dryRun=${dryRun}`);

  const pulled = await fetchAllPages();
  if (pulled.status !== "ok") {
    console.error(`Fetch failed: status=${pulled.status} reasonCode=${pulled.reasonCode ?? ""} — Catalog left untouched (partial-pagination failure never applies a partial plan)`);
    if (!dryRun) runOutsideLease(env, "full", () => runD1(env, buildRecordFailureSql("full", pulled.reasonCode ?? "CATALOG_SYNC_LIST_FAILED", nowIso())));
    process.exitCode = 1;
    return;
  }

  const existing = getAllExisting(env);
  const currentActiveCount = existing.filter((v) => v.isActive).length;
  const plausibility = evaluateFullSyncPlausibility({ upstreamCount: pulled.items.length, currentActiveCount });
  console.log(`Upstream observed: ${pulled.items.length} — current active in DB_PUBLIC: ${currentActiveCount} — plausible: ${plausibility.plausible}`);

  if (!plausibility.plausible) {
    console.error(`REFUSED: ${plausibility.reason} — Catalog left untouched. This is the empty/implausible-upstream safety guard, not a bug.`);
    if (!dryRun) runOutsideLease(env, "full", () => runD1(env, buildRecordFailureSql("full", plausibility.reason === "empty_upstream" ? "CATALOG_SYNC_EMPTY_UPSTREAM" : "CATALOG_SYNC_IMPLAUSIBLE_DROP", nowIso())));
    process.exitCode = 1;
    return;
  }

  const plan = planCatalogV1Sync(pulled.items, existing, true);
  console.log(`Plan: toCreate=${plan.toCreate.length} toUpdate=${plan.toUpdate.length} toDeactivate=${plan.toDeactivate.length} unchanged=${plan.unchanged.length}`);

  if (dryRun) {
    console.log("(dry run — no write performed)");
    return;
  }

  const runId = acquireLease(env);
  try {
    runD1(env, buildRecordAttemptStartSql("full", nowIso()));
    const now = nowIso();
    const applied = applyPlanRemote(env, plan, now);
    const maxObserved = pulled.items.length > 0 ? pulled.items.map((p) => normalizeCatalogTimestamp(p.updated_at)).sort().at(-1)! : null;
    const watermark = maxObserved ? applyIncrementalWatermarkMargin(maxObserved) : null;
    runD1(env, buildRecordSuccessSql("full", pulled.items.length, watermark, nowIso()));
    console.log(`Applied: created=${applied.created} updated=${applied.updated} deactivated=${applied.deactivated} watermarkAfter=${watermark ?? "(unchanged)"}`);
  } catch (err) {
    runD1(env, buildRecordFailureSql("full", "CATALOG_SYNC_MANUAL_CLI_ERROR", nowIso()));
    throw err;
  } finally {
    releaseLease(env, runId);
  }
}

/** For the (rare) case a failure needs recording before/without ever acquiring the lease (e.g. the upstream fetch itself failed) — writes state directly, no lease involved since nothing else was touched. */
function runOutsideLease(_env: CliEnv, _type: CatalogSyncType, fn: () => void): void {
  fn();
}

function printUsage(): void {
  console.log(`
Ahan Asa Catalog synchronization operator CLI (docs/CATALOG_SYNC_OPERATIONS.md)

  status [--env local|staging|production]
  incremental --env <env> [--dry-run]
  full --env <env> [--confirm-production] [--dry-run]

--env is REQUIRED for incremental/full (no default; a write can never silently land on production).
--env production additionally requires --confirm-production.
`);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  try {
    switch (command) {
      case "status":
        return cmdStatus(flags);
      case "incremental":
        return await cmdIncremental(flags);
      case "full":
        return await cmdFull(flags);
      default:
        printUsage();
        process.exitCode = command ? 1 : 0;
    }
  } catch (err) {
    console.error(`ERROR: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

main();
