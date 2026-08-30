import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildContentQualityStatusSql,
  buildPublishSql,
  buildSetIndexStatusSql,
  buildSetTemplatePublicationFlagSql,
  buildSetVariantPublicationFlagSql,
  buildUnpublishSql,
  buildUpsertDraftSql,
  describeEnvironmentError,
  flagBoolean,
  flagString,
  formatAuditEntry,
  isCliEnv,
  isSlugConflictErrorText,
  parseArgs,
  resolveReadEnvironment,
  resolveWriteEnvironment,
  sqliteLiteral,
  validateBatchEntry,
  wranglerExecuteArgs,
} from "./editorial-cli.ts";
import { isValidSlug } from "./editorial.ts";

// --- argv parsing ---

test("parseArgs extracts the command and positional args", () => {
  const result = parseArgs(["show", "ahanassa_marketplace.product_tmpl_rb_aj340"]);
  assert.equal(result.command, "show");
  assert.deepEqual(result.positional, ["ahanassa_marketplace.product_tmpl_rb_aj340"]);
});

test("parseArgs reads --key value pairs", () => {
  const result = parseArgs(["publish", "xid", "--locale", "fa", "--env", "staging"]);
  assert.equal(result.flags.locale, "fa");
  assert.equal(result.flags.env, "staging");
});

test("parseArgs reads --key=value pairs", () => {
  const result = parseArgs(["publish", "--env=production"]);
  assert.equal(result.flags.env, "production");
});

test("parseArgs treats a flag with no following value as boolean true", () => {
  const result = parseArgs(["publish", "--dry-run"]);
  assert.equal(result.flags["dry-run"], true);
});

test("parseArgs with no arguments returns a null command", () => {
  const result = parseArgs([]);
  assert.equal(result.command, null);
  assert.deepEqual(result.positional, []);
});

test("flagString/flagBoolean helpers read the right shape", () => {
  const flags = { env: "staging", "dry-run": true as const };
  assert.equal(flagString(flags, "env"), "staging");
  assert.equal(flagString(flags, "missing"), undefined);
  assert.equal(flagBoolean(flags, "dry-run"), true);
  assert.equal(flagBoolean(flags, "confirm-production"), false);
});

// --- environment safeguard (Stage B / H: "explicit environment required", "production double-confirmation") ---

test("resolveWriteEnvironment refuses when --env is missing — no implicit default", () => {
  const result = resolveWriteEnvironment({});
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "missing_env");
});

test("resolveWriteEnvironment refuses an unrecognized --env value", () => {
  const result = resolveWriteEnvironment({ env: "prod" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid_env");
});

test("resolveWriteEnvironment accepts staging with no extra confirmation", () => {
  const result = resolveWriteEnvironment({ env: "staging" });
  assert.deepEqual(result, { ok: true, env: "staging" });
});

test("resolveWriteEnvironment accepts local with no extra confirmation", () => {
  const result = resolveWriteEnvironment({ env: "local" });
  assert.deepEqual(result, { ok: true, env: "local" });
});

test("resolveWriteEnvironment refuses production without --confirm-production", () => {
  const result = resolveWriteEnvironment({ env: "production" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "production_confirmation_required");
});

test("resolveWriteEnvironment refuses production even with a falsy --confirm-production string", () => {
  const result = resolveWriteEnvironment({ env: "production", "confirm-production": "false" });
  assert.equal(result.ok, false);
});

test("resolveWriteEnvironment accepts production only with an explicit --confirm-production", () => {
  const result = resolveWriteEnvironment({ env: "production", "confirm-production": true });
  assert.deepEqual(result, { ok: true, env: "production" });
});

test("resolveReadEnvironment defaults to staging (never production) when --env is omitted", () => {
  const result = resolveReadEnvironment({});
  assert.deepEqual(result, { ok: true, env: "staging" });
});

test("resolveReadEnvironment still validates an explicitly-given bad value", () => {
  const result = resolveReadEnvironment({ env: "nope" });
  assert.equal(result.ok, false);
});

test("resolveReadEnvironment allows an explicit production read without confirm-production (reads are not the guarded action)", () => {
  const result = resolveReadEnvironment({ env: "production" });
  assert.deepEqual(result, { ok: true, env: "production" });
});

test("describeEnvironmentError produces a human-readable message for each failure reason", () => {
  assert.match(describeEnvironmentError({ ok: false, reason: "missing_env" }), /required/);
  assert.match(describeEnvironmentError({ ok: false, reason: "invalid_env", value: "x" }), /not a valid/);
  assert.match(describeEnvironmentError({ ok: false, reason: "production_confirmation_required" }), /confirm-production/);
});

test("isCliEnv accepts only the three known environments", () => {
  assert.equal(isCliEnv("local"), true);
  assert.equal(isCliEnv("staging"), true);
  assert.equal(isCliEnv("production"), true);
  assert.equal(isCliEnv("prod"), false);
  assert.equal(isCliEnv(""), false);
});

// --- SQL literal safety ---

test("sqliteLiteral doubles embedded single quotes (the standard SQLite escape)", () => {
  assert.equal(sqliteLiteral("O'Brien steel"), "'O''Brien steel'");
});

test("sqliteLiteral renders null as the SQL keyword, unquoted", () => {
  assert.equal(sqliteLiteral(null), "NULL");
});

test("sqliteLiteral renders numbers unquoted", () => {
  assert.equal(sqliteLiteral(10), "10");
});

test("sqliteLiteral rejects a non-finite number rather than emitting invalid SQL", () => {
  assert.throws(() => sqliteLiteral(Number.POSITIVE_INFINITY));
});

test("sqliteLiteral renders booleans as 0/1", () => {
  assert.equal(sqliteLiteral(true), "1");
  assert.equal(sqliteLiteral(false), "0");
});

test("sqliteLiteral escapes a value containing a semicolon and quote together without breaking the statement shape", () => {
  const rendered = sqliteLiteral("Plate 10mm; DROP TABLE product_seo_contents; --");
  assert.equal(rendered, "'Plate 10mm; DROP TABLE product_seo_contents; --'");
  // Still a single, self-contained quoted literal — no unescaped quote to close it early.
  assert.equal((rendered.match(/(?<!')'(?!')/g) ?? []).length, 2);
});

test("sqliteLiteral round-trips Persian text with an embedded quote unchanged in content", () => {
  const rendered = sqliteLiteral("میلگرد آجدار Aj340 (A2)'s spec");
  assert.ok(rendered.includes("میلگرد آجدار Aj340 (A2)''s spec"));
});

// --- wrangler invocation shape ---

test("wranglerExecuteArgs uses --local for the local environment, never --env/--remote", () => {
  const args = wranglerExecuteArgs("local", "SELECT 1;");
  assert.ok(args.includes("--local"));
  assert.ok(!args.includes("--remote"));
  assert.ok(!args.includes("--env"));
});

test("wranglerExecuteArgs uses --env <name> --remote for staging", () => {
  const args = wranglerExecuteArgs("staging", "SELECT 1;");
  assert.ok(args.includes("--env"));
  assert.ok(args.includes("staging"));
  assert.ok(args.includes("--remote"));
});

test("wranglerExecuteArgs uses --env production --remote for production", () => {
  const args = wranglerExecuteArgs("production", "SELECT 1;");
  assert.ok(args.includes("production"));
  assert.ok(args.includes("--remote"));
});

test("wranglerExecuteArgs always targets DB_PUBLIC, never DB_OPS", () => {
  const args = wranglerExecuteArgs("staging", "SELECT 1;");
  assert.ok(args.includes("DB_PUBLIC"));
  assert.ok(!args.includes("DB_OPS"));
});

// --- fixed SQL statement shapes: operator never mutates commercial catalog fields ---

const FORBIDDEN_COMMERCIAL_COLUMNS = [
  "commercial_name",
  "commercial_size",
  "section_size",
  "schedule",
  "family_code",
  "group_code",
  "form_code",
  "grade_code",
  "standard_code",
  "dimensions_json",
  "nominal_weight_json",
  "allowed_commercial_units",
  "inventory_uom",
  "catalog_updated_at",
  "sync_status",
  "sync_version",
  "is_active",
];

test("buildSetVariantPublicationFlagSql only ever writes is_public/updated_at on product_variants", () => {
  const sql = buildSetVariantPublicationFlagSql("var_1", true, "2026-08-30T00:00:00.000Z");
  assert.match(sql, /^UPDATE product_variants SET is_public = 1, updated_at = '2026-08-30T00:00:00\.000Z' WHERE id = 'var_1';$/);
  for (const column of FORBIDDEN_COMMERCIAL_COLUMNS) assert.ok(!sql.includes(column), `must not touch ${column}`);
});

test("buildSetTemplatePublicationFlagSql only ever writes is_public/updated_at on catalog_products", () => {
  const sql = buildSetTemplatePublicationFlagSql("tmpl_1", false, "2026-08-30T00:00:00.000Z");
  assert.match(sql, /^UPDATE catalog_products SET is_public = 0, updated_at = '2026-08-30T00:00:00\.000Z' WHERE id = 'tmpl_1';$/);
  for (const column of FORBIDDEN_COMMERCIAL_COLUMNS) assert.ok(!sql.includes(column), `must not touch ${column}`);
});

test("buildUpsertDraftSql only ever targets product_seo_contents, never product_variants/catalog_products", () => {
  const sql = buildUpsertDraftSql({
    id: "seo_1",
    entityType: "product",
    entityId: "tmpl_1",
    locale: "fa",
    slug: "rebar-aj340",
    h1: "میلگرد آجدار Aj340",
    intro: null,
    bodyJson: null,
    seoTitle: null,
    seoDescription: null,
    now: "2026-08-30T00:00:00.000Z",
  });
  assert.ok(sql.startsWith("INSERT INTO product_seo_contents"));
  assert.ok(!sql.includes("product_variants"));
  assert.ok(!sql.includes("catalog_products"));
  assert.ok(sql.includes("'product'"));
  assert.ok(sql.includes("'tmpl_1'"));
  assert.ok(sql.includes("'fa'"));
});

test("buildUpsertDraftSql never resets content_quality_status/published_at on the ON CONFLICT branch (DAR-036 Stage B Q4)", () => {
  const sql = buildUpsertDraftSql({
    id: "seo_1",
    entityType: "variant",
    entityId: "var_1",
    locale: "fa",
    slug: "s",
    h1: "h",
    intro: null,
    bodyJson: null,
    seoTitle: null,
    seoDescription: null,
    now: "2026-08-30T00:00:00.000Z",
  });
  const conflictClause = sql.split("DO UPDATE SET")[1];
  assert.ok(!conflictClause.includes("content_quality_status"));
  assert.ok(!conflictClause.includes("published_at"));
});

test("buildContentQualityStatusSql targets only product_seo_contents", () => {
  const sql = buildContentQualityStatusSql("product", "tmpl_1", "fa", "review", "2026-08-30T00:00:00.000Z");
  assert.equal(sql, "UPDATE product_seo_contents SET content_quality_status = 'review', updated_at = '2026-08-30T00:00:00.000Z' WHERE entity_type = 'product' AND entity_id = 'tmpl_1' AND locale = 'fa';");
});

test("buildPublishSql sets published_at to the given timestamp, scoped to entity+locale", () => {
  const sql = buildPublishSql("product", "tmpl_1", "fa", "2026-08-30T12:00:00.000Z");
  assert.ok(sql.includes("published_at = '2026-08-30T12:00:00.000Z'"));
  assert.ok(sql.includes("entity_id = 'tmpl_1'"));
  assert.ok(sql.includes("locale = 'fa'"));
});

test("buildUnpublishSql sets published_at to NULL without touching content_quality_status", () => {
  const sql = buildUnpublishSql("product", "tmpl_1", "fa", "2026-08-30T12:00:00.000Z");
  assert.ok(sql.includes("published_at = NULL"));
  assert.ok(!sql.includes("content_quality_status"));
});

test("buildSetIndexStatusSql only ever writes index_status, never published_at or content_quality_status", () => {
  const sql = buildSetIndexStatusSql("product", "tmpl_1", "fa", "index", "2026-08-30T12:00:00.000Z");
  assert.ok(sql.includes("index_status = 'index'"));
  assert.ok(!sql.includes("published_at"));
  assert.ok(!sql.includes("content_quality_status"));
});

// --- slug conflict classification ---

test("isSlugConflictErrorText recognizes a real SQLite unique-constraint message", () => {
  assert.equal(isSlugConflictErrorText("D1_ERROR: UNIQUE constraint failed: product_seo_contents.slug, product_seo_contents.locale"), true);
});

test("isSlugConflictErrorText does not misclassify an unrelated error", () => {
  assert.equal(isSlugConflictErrorText("D1_ERROR: no such table: product_seo_contents"), false);
});

// --- batch input validation (Stage L) ---

test("validateBatchEntry accepts a well-formed entry", () => {
  const result = validateBatchEntry({ templateXid: "x", locale: "fa", h1: "میلگرد", slug: "rebar-aj340" }, isValidSlug);
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateBatchEntry rejects a missing templateXid", () => {
  const result = validateBatchEntry({ locale: "fa", h1: "x", slug: "x" }, isValidSlug);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("templateXid")));
});

test("validateBatchEntry rejects an unsupported locale", () => {
  const result = validateBatchEntry({ templateXid: "x", locale: "de", h1: "x", slug: "x" }, isValidSlug);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("locale")));
});

test("validateBatchEntry rejects an invalid (non-normalized) slug", () => {
  const result = validateBatchEntry({ templateXid: "x", locale: "fa", h1: "x", slug: "Not A Slug" }, isValidSlug);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("slug")));
});

test("validateBatchEntry rejects a non-object entry rather than crashing", () => {
  assert.equal(validateBatchEntry("not an object", isValidSlug).ok, false);
  assert.equal(validateBatchEntry(null, isValidSlug).ok, false);
});

// --- audit log formatting (Stage K) ---

test("formatAuditEntry produces a single JSON line with the required fields, no secrets", () => {
  const line = formatAuditEntry({
    timestamp: "2026-08-30T12:00:00.000Z",
    environment: "staging",
    entityXid: "ahanassa_marketplace.product_tmpl_rb_aj340",
    locale: "fa",
    action: "publish",
    previousState: "ready",
    resultingState: "published",
  });
  const parsed = JSON.parse(line);
  assert.equal(parsed.environment, "staging");
  assert.equal(parsed.action, "publish");
  assert.equal(parsed.previousState, "ready");
  assert.equal(parsed.resultingState, "published");
  assert.ok(!line.toLowerCase().includes("secret"));
  assert.ok(!line.toLowerCase().includes("api_key"));
});
