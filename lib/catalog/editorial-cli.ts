import type { ContentQualityStatus, IndexStatus } from "./types.ts";

/**
 * Pure, D1-free building blocks for `scripts/catalog-editorial.ts` — the
 * internal operator CLI (DOCUMENT_AUDIT_REPORT.md DAR-038,
 * docs/CATALOG_EDITORIAL_OPERATIONS.md). Split out the same way
 * `lib/catalog/catalog-filters.ts` is split from `editorial-repository.ts`:
 * this file has zero `cloudflare:workers` import chain, so it is directly
 * `node --test`-able; the CLI script itself does the actual D1 work by
 * shelling out to `wrangler d1 execute` (the same sanctioned mechanism
 * every prior controlled-verification pass in this project has used —
 * there is no way to reach a real D1 binding from plain Node otherwise).
 *
 * All editorial STATE-MACHINE decisions (valid transitions, publish
 * preconditions, publication eligibility, slug validation) still live
 * exclusively in `lib/catalog/editorial.ts` and are imported verbatim by
 * the CLI — nothing here duplicates that logic. This file only owns CLI-
 * specific concerns: argv parsing, the environment write-safeguard, safe
 * SQL-literal rendering (wrangler's `--command` has no parameter binding),
 * and the fixed, narrow set of SQL statement shapes the operator is ever
 * allowed to run — each mirrors the identical table/column shape of its
 * `lib/catalog/editorial-repository.ts` counterpart.
 */

// ---------------------------------------------------------------------------
// argv parsing
// ---------------------------------------------------------------------------

export interface ParsedArgs {
  command: string | null;
  positional: string[];
  flags: Record<string, string | boolean>;
}

/** `--key value`, `--key=value`, and boolean `--key` (no value/next arg starts with `--`) are all supported. */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command = null, ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq !== -1) {
        flags[token.slice(2, eq)] = token.slice(eq + 1);
        continue;
      }
      const key = token.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }
    positional.push(token);
  }

  return { command, positional, flags };
}

export function flagString(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

export function flagBoolean(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true || flags[key] === "true";
}

// ---------------------------------------------------------------------------
// Environment safeguard (Stage B) — the operator's single most important
// safety property: a write can never silently land on production.
// ---------------------------------------------------------------------------

export const CLI_ENVIRONMENTS = ["local", "staging", "production"] as const;
export type CliEnv = (typeof CLI_ENVIRONMENTS)[number];

export function isCliEnv(value: string): value is CliEnv {
  return (CLI_ENVIRONMENTS as readonly string[]).includes(value);
}

export type EnvironmentResolution =
  | { ok: true; env: CliEnv }
  | { ok: false; reason: "missing_env" }
  | { ok: false; reason: "invalid_env"; value: string }
  | { ok: false; reason: "production_confirmation_required" };

/**
 * Every WRITE command must call this — never a bare default. `--env` is
 * mandatory (no implicit "staging"); `--env production` additionally
 * requires `--confirm-production` (Stage B "extra explicit confirmation
 * mechanism"). Typing a single short command is never sufficient to write
 * to production.
 */
export function resolveWriteEnvironment(flags: Record<string, string | boolean>): EnvironmentResolution {
  const raw = flagString(flags, "env");
  if (!raw) return { ok: false, reason: "missing_env" };
  if (!isCliEnv(raw)) return { ok: false, reason: "invalid_env", value: raw };
  if (raw === "production" && !flagBoolean(flags, "confirm-production")) {
    return { ok: false, reason: "production_confirmation_required" };
  }
  return { ok: true, env: raw };
}

/** Read-only commands may default to `staging` (never `production`) when `--env` is omitted, but an explicitly-given value is still validated. */
export function resolveReadEnvironment(flags: Record<string, string | boolean>): EnvironmentResolution {
  const raw = flagString(flags, "env");
  if (!raw) return { ok: true, env: "staging" };
  if (!isCliEnv(raw)) return { ok: false, reason: "invalid_env", value: raw };
  return { ok: true, env: raw };
}

export function describeEnvironmentError(result: Extract<EnvironmentResolution, { ok: false }>): string {
  switch (result.reason) {
    case "missing_env":
      return "Refusing to write: --env <local|staging|production> is required. There is no default target.";
    case "invalid_env":
      return `Refusing to write: "${result.value}" is not a valid --env (must be local, staging, or production).`;
    case "production_confirmation_required":
      return "Refusing to write to production: --env production also requires --confirm-production. This is deliberate — a single short command must never be enough to publish production content.";
  }
}

// ---------------------------------------------------------------------------
// Safe SQL-literal rendering — `wrangler d1 execute --command` has no
// parameter binding, so every operator-supplied value (locale-specific
// editorial copy, which is arbitrary free text) must be escaped into a
// literal before being placed in a SQL statement string.
// ---------------------------------------------------------------------------

/** Standard SQLite single-quote doubling. Never used on identifiers/keywords — only ever on a value already destined for a `'...'` literal position. */
export function sqliteLiteral(value: string | number | boolean | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Refusing to render a non-finite number into SQL");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${value.replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// wrangler invocation shape
// ---------------------------------------------------------------------------

/** Builds the `wrangler d1 execute` argv for one SQL statement against the given environment. `local` never uses `--env`/`--remote`; staging/production always do. */
export function wranglerExecuteArgs(env: CliEnv, sql: string): string[] {
  const base = ["wrangler", "d1", "execute", "DB_PUBLIC"];
  const envArgs = env === "local" ? ["--local"] : ["--env", env, "--remote"];
  return [...base, ...envArgs, "--command", sql, "--json"];
}

// ---------------------------------------------------------------------------
// Fixed SQL statement shapes — the ONLY writes the operator CLI may ever
// issue. Each mirrors its lib/catalog/editorial-repository.ts counterpart's
// table/column shape exactly (cross-referenced in each doc comment) so the
// two never drift into inconsistent behavior. Every UPDATE here touches
// only website-owned columns (`product_seo_contents` in full;
// `is_public`/`updated_at` on `product_variants`/`catalog_products`) — never
// a single Odoo-owned commercial column.
// ---------------------------------------------------------------------------

export interface UpsertDraftInput {
  id: string;
  entityType: "variant" | "product";
  entityId: string;
  locale: string;
  slug: string;
  h1: string | null;
  intro: string | null;
  bodyJson: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  now: string;
}

/** Mirrors `editorial-repository.ts#upsertEditorialDraft`. */
export function buildUpsertDraftSql(input: UpsertDraftInput): string {
  return (
    `INSERT INTO product_seo_contents (id, entity_type, entity_id, locale, slug, h1, intro, body_json, seo_title, seo_description, faq_json, index_status, content_quality_status, published_at, updated_at) ` +
    `VALUES (${sqliteLiteral(input.id)}, ${sqliteLiteral(input.entityType)}, ${sqliteLiteral(input.entityId)}, ${sqliteLiteral(input.locale)}, ${sqliteLiteral(input.slug)}, ${sqliteLiteral(input.h1)}, ${sqliteLiteral(input.intro)}, ${sqliteLiteral(input.bodyJson)}, ${sqliteLiteral(input.seoTitle)}, ${sqliteLiteral(input.seoDescription)}, NULL, 'draft', 'incomplete', NULL, ${sqliteLiteral(input.now)}) ` +
    `ON CONFLICT(entity_type, entity_id, locale) DO UPDATE SET slug = excluded.slug, h1 = excluded.h1, intro = excluded.intro, body_json = excluded.body_json, seo_title = excluded.seo_title, seo_description = excluded.seo_description, updated_at = excluded.updated_at;`
  );
}

/** Mirrors `editorial-repository.ts`'s internal `setContentQualityStatus`. */
export function buildContentQualityStatusSql(entityType: "variant" | "product", entityId: string, locale: string, to: ContentQualityStatus, now: string): string {
  return `UPDATE product_seo_contents SET content_quality_status = ${sqliteLiteral(to)}, updated_at = ${sqliteLiteral(now)} WHERE entity_type = ${sqliteLiteral(entityType)} AND entity_id = ${sqliteLiteral(entityId)} AND locale = ${sqliteLiteral(locale)};`;
}

/** Mirrors `editorial-repository.ts#publishContent`. */
export function buildPublishSql(entityType: "variant" | "product", entityId: string, locale: string, now: string): string {
  return `UPDATE product_seo_contents SET published_at = ${sqliteLiteral(now)}, updated_at = ${sqliteLiteral(now)} WHERE entity_type = ${sqliteLiteral(entityType)} AND entity_id = ${sqliteLiteral(entityId)} AND locale = ${sqliteLiteral(locale)};`;
}

/** Mirrors `editorial-repository.ts#unpublishContent`. */
export function buildUnpublishSql(entityType: "variant" | "product", entityId: string, locale: string, now: string): string {
  return `UPDATE product_seo_contents SET published_at = NULL, updated_at = ${sqliteLiteral(now)} WHERE entity_type = ${sqliteLiteral(entityType)} AND entity_id = ${sqliteLiteral(entityId)} AND locale = ${sqliteLiteral(locale)};`;
}

/** Mirrors `editorial-repository.ts#setIndexStatus`. */
export function buildSetIndexStatusSql(entityType: "variant" | "product", entityId: string, locale: string, indexStatus: IndexStatus, now: string): string {
  return `UPDATE product_seo_contents SET index_status = ${sqliteLiteral(indexStatus)}, updated_at = ${sqliteLiteral(now)} WHERE entity_type = ${sqliteLiteral(entityType)} AND entity_id = ${sqliteLiteral(entityId)} AND locale = ${sqliteLiteral(locale)};`;
}

/** Mirrors `editorial-repository.ts#setVariantPublicationFlag`. The ONLY column this CLI ever writes on `product_variants` besides `updated_at`. */
export function buildSetVariantPublicationFlagSql(variantId: string, isPublic: boolean, now: string): string {
  return `UPDATE product_variants SET is_public = ${sqliteLiteral(isPublic)}, updated_at = ${sqliteLiteral(now)} WHERE id = ${sqliteLiteral(variantId)};`;
}

/** Mirrors `editorial-repository.ts#setTemplatePublicationFlag`. The ONLY column this CLI ever writes on `catalog_products` besides `updated_at`. */
export function buildSetTemplatePublicationFlagSql(catalogProductId: string, isPublic: boolean, now: string): string {
  return `UPDATE catalog_products SET is_public = ${sqliteLiteral(isPublic)}, updated_at = ${sqliteLiteral(now)} WHERE id = ${sqliteLiteral(catalogProductId)};`;
}

// ---------------------------------------------------------------------------
// Error classification (mirrors editorial-repository.ts#isUniqueConstraintError)
// ---------------------------------------------------------------------------

export function isSlugConflictErrorText(text: string): boolean {
  return /UNIQUE constraint failed/i.test(text);
}

// ---------------------------------------------------------------------------
// Batch editorial input (Stage L) — deterministic, domain-typed, no raw SQL.
// ---------------------------------------------------------------------------

export interface BatchEditorialEntry {
  templateXid: string;
  locale: string;
  h1: string;
  slug: string;
  intro?: string;
  seoTitle?: string;
  seoDescription?: string;
  bodyJson?: unknown;
}

export interface BatchValidationResult {
  ok: boolean;
  errors: string[];
}

/** Pure structural + slug-format validation only — existence of the template XID and slug-uniqueness are necessarily live-DB checks, performed by the CLI at apply time, not here. */
export function validateBatchEntry(entry: unknown, isValidSlug: (s: string) => boolean): BatchValidationResult {
  const errors: string[] = [];
  if (typeof entry !== "object" || entry === null) return { ok: false, errors: ["entry is not an object"] };
  const e = entry as Record<string, unknown>;

  if (typeof e.templateXid !== "string" || e.templateXid.trim().length === 0) errors.push("templateXid is required");
  if (typeof e.locale !== "string" || !["fa", "en", "ar"].includes(e.locale)) errors.push("locale must be one of fa, en, ar");
  if (typeof e.h1 !== "string" || e.h1.trim().length === 0) errors.push("h1 is required");
  if (typeof e.slug !== "string" || !isValidSlug(e.slug)) errors.push("slug is required and must already be a normalized, valid slug");
  if (e.intro !== undefined && typeof e.intro !== "string") errors.push("intro must be a string when present");
  if (e.seoTitle !== undefined && typeof e.seoTitle !== "string") errors.push("seoTitle must be a string when present");
  if (e.seoDescription !== undefined && typeof e.seoDescription !== "string") errors.push("seoDescription must be a string when present");

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Operator auditability (Stage K) — one structured line per applied write.
// ---------------------------------------------------------------------------

export interface OperatorAuditEntry {
  timestamp: string;
  environment: CliEnv;
  entityXid: string;
  locale: string | null;
  action: string;
  previousState: string | null;
  resultingState: string;
}

/** A single, greppable, secret-free JSON line — no heavy audit subsystem needed at this scale. */
export function formatAuditEntry(entry: OperatorAuditEntry): string {
  return JSON.stringify(entry);
}
