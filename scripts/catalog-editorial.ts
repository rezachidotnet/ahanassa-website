import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  isSlugConflictErrorText,
  parseArgs,
  resolveReadEnvironment,
  resolveWriteEnvironment,
  sqliteLiteral,
  validateBatchEntry,
  wranglerExecuteArgs,
  type BatchEditorialEntry,
  type CliEnv,
} from "../lib/catalog/editorial-cli.ts";
import { canPublish, canSubmitForReview, describeLifecycleState, evaluatePublicationEligibility, isValidContentStatusTransition, isValidSlug, normalizeSlug } from "../lib/catalog/editorial.ts";
import { ulid } from "../lib/rfq/ulid.ts";
import type { ContentQualityStatus, IndexStatus, ProductSeoContent } from "../lib/catalog/types.ts";

/**
 * Internal Catalog editorial operator CLI — DOCUMENT_AUDIT_REPORT.md
 * DAR-038, docs/CATALOG_EDITORIAL_OPERATIONS.md.
 *
 * Run with: node scripts/catalog-editorial.ts <command> [args...]
 * (Node 24's native TypeScript support runs this file directly — same
 * mechanism this repo's own test suite already uses, no build step, no new
 * dependency.)
 *
 * This is a repo-local, operator-invoked-only tool. It is NOT a server, has
 * no HTTP listener, and is never imported by application code — it exists
 * purely so a developer/operator can prepare and publish real Catalog
 * editorial content without a Website admin UI or authentication system.
 * Every write reaches D1 exclusively via `wrangler d1 execute` (the same
 * sanctioned mechanism used for every prior controlled-verification pass in
 * this project — see DOCUMENT_AUDIT_REPORT.md DAR-034 through DAR-037);
 * this script never imports `lib/db/public.ts`/`cloudflare:workers`.
 *
 * All state-machine/publication-eligibility decisions are delegated to
 * `lib/catalog/editorial.ts` — nothing here reimplements those rules.
 *
 * Content commands (`edit`, `validate`, `mark-review`, `approve`,
 * `send-back`, `reopen`, `publish`, `unpublish`, `set-index`, `set-public`)
 * all resolve their target via the stable `product_template_xid` — never a
 * title, slug, or Odoo integer ID (this task's own "Stable Identity"
 * requirement). The one variant-scoped command (`set-variant-public`/
 * `unset-variant-public`) resolves via `product_variant_xid` — the site's
 * hybrid model has no per-variant editorial CONTENT in this phase, only the
 * per-variant visibility-inside-its-template flag.
 */

class SlugConflictError extends Error {}
class NotFoundError extends Error {}

function nowIso(): string {
  return new Date().toISOString();
}

function runD1<T = Record<string, unknown>>(env: CliEnv, sql: string): T[] {
  const args = wranglerExecuteArgs(env, sql);
  let stdout: string;
  try {
    stdout = execFileSync("npx", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const text = `${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message ?? ""}`;
    if (isSlugConflictErrorText(text)) throw new SlugConflictError("slug already in use for this locale");
    throw new Error(`wrangler d1 execute failed:\n${text.slice(0, 2000)}`);
  }
  const parsed = JSON.parse(stdout) as Array<{ results: T[]; success: boolean }>;
  return parsed[0]?.results ?? [];
}

// --- row shapes (read-only, minimal — full domain mapping lives in lib/catalog/editorial-repository.ts for the Workers runtime) ---

interface TemplateRow {
  id: string;
  templateXid: string;
  commercialTemplateName: string;
  isActive: boolean;
  isPublic: boolean;
}

function mapTemplateRow(row: { id: string; template_xid: string; commercial_template_name: string; is_active: number; is_public: number }): TemplateRow {
  return { id: row.id, templateXid: row.template_xid, commercialTemplateName: row.commercial_template_name, isActive: row.is_active === 1, isPublic: row.is_public === 1 };
}

interface VariantRow {
  id: string;
  xid: string;
  sku: string;
  isActive: boolean;
  isPublic: boolean;
}

function mapVariantRow(row: { id: string; xid: string; sku: string; is_active: number; is_public: number }): VariantRow {
  return { id: row.id, xid: row.xid, sku: row.sku, isActive: row.is_active === 1, isPublic: row.is_public === 1 };
}

interface SeoRow {
  h1: string | null;
  slug: string;
  intro: string | null;
  seo_title: string | null;
  seo_description: string | null;
  index_status: IndexStatus;
  content_quality_status: ContentQualityStatus;
  published_at: string | null;
  updated_at: string;
}

function mapSeoRow(row: SeoRow): Pick<ProductSeoContent, "h1" | "slug" | "intro" | "seoTitle" | "seoDescription" | "indexStatus" | "contentQualityStatus" | "publishedAt" | "updatedAt"> {
  return {
    h1: row.h1,
    slug: row.slug,
    intro: row.intro,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    indexStatus: row.index_status,
    contentQualityStatus: row.content_quality_status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

function resolveTemplate(env: CliEnv, templateXid: string): TemplateRow {
  const rows = runD1<{ id: string; template_xid: string; commercial_template_name: string; is_active: number; is_public: number }>(
    env,
    `SELECT id, template_xid, commercial_template_name, is_active, is_public FROM catalog_products WHERE template_xid = ${sqliteLiteral(templateXid)};`,
  );
  if (rows.length === 0) throw new NotFoundError(`no catalog_products row for template_xid ${templateXid}`);
  return mapTemplateRow(rows[0]);
}

function resolveVariant(env: CliEnv, variantXid: string): VariantRow {
  const rows = runD1<{ id: string; xid: string; sku: string; is_active: number; is_public: number }>(
    env,
    `SELECT id, xid, sku, is_active, is_public FROM product_variants WHERE xid = ${sqliteLiteral(variantXid)};`,
  );
  if (rows.length === 0) throw new NotFoundError(`no product_variants row for xid ${variantXid}`);
  return mapVariantRow(rows[0]);
}

function fetchSeoRow(env: CliEnv, templateId: string, locale: string): (SeoRow & { id: string }) | null {
  const rows = runD1<SeoRow & { id: string }>(
    env,
    `SELECT * FROM product_seo_contents WHERE entity_type = 'product' AND entity_id = ${sqliteLiteral(templateId)} AND locale = ${sqliteLiteral(locale)};`,
  );
  return rows[0] ?? null;
}

// --- output helpers ---

function printPreview(label: string, data: Record<string, unknown>): void {
  console.log(`\n${label}`);
  for (const [key, value] of Object.entries(data)) {
    console.log(`  ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
  }
}

function printAudit(entry: Parameters<typeof formatAuditEntry>[0]): void {
  console.log(`AUDIT ${formatAuditEntry(entry)}`);
}

function requireLocale(flags: ReturnType<typeof parseArgs>["flags"]): string {
  const locale = flagString(flags, "locale");
  if (!locale || !["fa", "en", "ar"].includes(locale)) {
    throw new Error("--locale <fa|en|ar> is required for this command");
  }
  return locale;
}

// --- commands ---

function cmdList(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const env = mustReadEnv(flags);
  const locale = flagString(flags, "locale") ?? "fa";

  const rows = runD1<{
    template_xid: string;
    commercial_template_name: string;
    is_active: number;
    is_public: number;
    content_quality_status: ContentQualityStatus | null;
    published_at: string | null;
    slug: string | null;
    h1: string | null;
    index_status: IndexStatus | null;
    eligible_variant_count: number;
  }>(
    env,
    `SELECT cp.template_xid, cp.commercial_template_name, cp.is_active, cp.is_public,
            s.content_quality_status, s.published_at, s.slug, s.h1, s.index_status,
            (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = cp.id AND pv.is_active = 1 AND pv.is_public = 1) as eligible_variant_count
     FROM catalog_products cp
     LEFT JOIN product_seo_contents s ON s.entity_type = 'product' AND s.entity_id = cp.id AND s.locale = ${sqliteLiteral(locale)}
     ORDER BY cp.commercial_template_name ASC;`,
  );

  console.log(`\n${rows.length} templates — locale=${locale} env=${env}\n`);
  for (const row of rows) {
    const seo = row.content_quality_status
      ? { h1: row.h1, slug: row.slug ?? "", intro: null, seoTitle: null, seoDescription: null, indexStatus: row.index_status!, contentQualityStatus: row.content_quality_status, publishedAt: row.published_at, updatedAt: "" }
      : null;
    const lifecycle = describeLifecycleState(seo as ProductSeoContent | null);
    const eligibility = evaluatePublicationEligibility({ isActive: row.is_active === 1, isPublic: row.is_public === 1 }, seo);
    console.log(
      `${row.template_xid.padEnd(58)} ${row.commercial_template_name.padEnd(30)} state=${lifecycle.padEnd(10)} visible=${eligibility.visible} indexable=${eligibility.indexable} eligibleVariants=${row.eligible_variant_count}`,
    );
  }
}

function cmdShow(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const env = mustReadEnv(flags);
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: show <template-xid> [--env <env>]");
  const template = resolveTemplate(env, templateXid);

  const variantStats = runD1<{ n: number; active_n: number; public_n: number }>(
    env,
    `SELECT COUNT(*) as n, SUM(is_active) as active_n, SUM(is_public) as public_n FROM product_variants WHERE product_id = ${sqliteLiteral(template.id)};`,
  )[0];

  printPreview(`Template: ${template.templateXid}`, {
    env,
    commercialTemplateName: template.commercialTemplateName,
    isActive: template.isActive,
    isPublic: template.isPublic,
    totalVariants: variantStats?.n ?? 0,
    activeVariants: variantStats?.active_n ?? 0,
    publicVariants: variantStats?.public_n ?? 0,
  });

  for (const locale of ["fa", "en", "ar"] as const) {
    const seoRow = fetchSeoRow(env, template.id, locale);
    const seo = seoRow ? mapSeoRow(seoRow) : null;
    const lifecycle = describeLifecycleState(seo as ProductSeoContent | null);
    const eligibility = evaluatePublicationEligibility({ isActive: template.isActive, isPublic: template.isPublic }, seo);
    printPreview(`  locale=${locale}`, {
      lifecycle,
      slug: seo?.slug ?? null,
      h1: seo?.h1 ?? null,
      indexStatus: seo?.indexStatus ?? null,
      publishedAt: seo?.publishedAt ?? null,
      visible: eligibility.visible,
      indexable: eligibility.indexable,
      reasons: eligibility.reasons,
    });
  }
}

interface EditFields {
  h1: string;
  slug: string;
  intro?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  bodyJson?: unknown;
}

function applyEditorialDraft(env: CliEnv, template: TemplateRow, locale: string, fields: EditFields, dryRun: boolean): void {
  if (!isValidSlug(fields.slug)) {
    const normalized = normalizeSlug(fields.slug);
    if (!isValidSlug(normalized)) throw new Error(`"${fields.slug}" cannot be normalized into a valid slug — supply an ASCII, transliterated candidate`);
    fields.slug = normalized;
  }

  const before = fetchSeoRow(env, template.id, locale);
  const beforeMapped = before ? mapSeoRow(before) : null;
  const beforeLifecycle = describeLifecycleState(beforeMapped as ProductSeoContent | null);
  // upsertEditorialDraft never changes contentQualityStatus/publishedAt on
  // an update (DAR-036 Stage B Q4) — the proposed lifecycle after an edit is
  // therefore unchanged from the current one, except for a brand-new row,
  // which always starts at "draft".
  const proposedLifecycle = before ? beforeLifecycle : "draft";

  printPreview(`Proposed edit: ${template.templateXid}`, {
    env,
    locale,
    currentLifecycleState: beforeLifecycle,
    proposedLifecycleState: proposedLifecycle,
    slug: fields.slug,
    h1: fields.h1,
    dryRun,
  });

  if (dryRun) {
    console.log("  (dry run — no write performed)");
    return;
  }

  const sql = buildUpsertDraftSql({
    id: ulid(),
    entityType: "product",
    entityId: template.id,
    locale,
    slug: fields.slug,
    h1: fields.h1,
    intro: fields.intro ?? null,
    bodyJson: fields.bodyJson ? JSON.stringify(fields.bodyJson) : null,
    seoTitle: fields.seoTitle ?? null,
    seoDescription: fields.seoDescription ?? null,
    now: nowIso(),
  });
  runD1(env, sql);
  printAudit({ timestamp: nowIso(), environment: env, entityXid: template.templateXid, locale, action: "edit", previousState: beforeLifecycle, resultingState: proposedLifecycle });
}

function cmdEdit(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: edit <template-xid> --locale <fa|en|ar> --env <env> [--title <str> --slug <str> | --file <path.json>]");
  const locale = requireLocale(flags);
  const template = resolveTemplate(envResult.env, templateXid);
  const dryRun = flagBoolean(flags, "dry-run");

  let fields: EditFields;
  const filePath = flagString(flags, "file");
  if (filePath) {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as EditFields;
    fields = raw;
  } else {
    const title = flagString(flags, "title");
    const slug = flagString(flags, "slug");
    if (!title || !slug) throw new Error("--title and --slug are required (or supply --file <path.json>)");
    fields = { h1: title, slug, intro: flagString(flags, "intro") ?? null, seoTitle: flagString(flags, "seo-title") ?? null, seoDescription: flagString(flags, "seo-description") ?? null };
  }

  applyEditorialDraft(envResult.env, template, locale, fields, dryRun);
}

function cmdValidate(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const env = mustReadEnv(flags);
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: validate <template-xid> --locale <fa|en|ar> [--env <env>]");
  const locale = requireLocale(flags);
  const template = resolveTemplate(env, templateXid);
  const seoRow = fetchSeoRow(env, template.id, locale);
  const seo = seoRow ? mapSeoRow(seoRow) : null;

  printPreview(`Validation: ${templateXid} / ${locale}`, {
    env,
    exists: Boolean(seo),
    canSubmitForReview: seo ? canSubmitForReview(seo) : false,
    canPublish: seo ? canPublish(seo) : false,
    currentEligibility: seo ? evaluatePublicationEligibility({ isActive: template.isActive, isPublic: template.isPublic }, seo) : evaluatePublicationEligibility({ isActive: template.isActive, isPublic: template.isPublic }, null),
  });
}

function requireSeoRow(env: CliEnv, template: TemplateRow, locale: string): SeoRow & { id: string } {
  const row = fetchSeoRow(env, template.id, locale);
  if (!row) throw new NotFoundError(`no editorial content exists yet for ${template.templateXid} / ${locale} — run "edit" first`);
  return row;
}

function applyContentTransition(env: CliEnv, template: TemplateRow, locale: string, from: ContentQualityStatus[], to: ContentQualityStatus, action: string, dryRun: boolean, extraPrecondition?: (seo: ReturnType<typeof mapSeoRow>) => string | null): void {
  const current = requireSeoRow(env, template, locale);
  const mapped = mapSeoRow(current);
  const beforeLifecycle = describeLifecycleState(mapped as ProductSeoContent | null);

  if (!from.includes(mapped.contentQualityStatus) || !isValidContentStatusTransition(mapped.contentQualityStatus, to)) {
    throw new Error(`invalid transition: ${mapped.contentQualityStatus} -> ${to} is not allowed`);
  }
  if (extraPrecondition) {
    const reason = extraPrecondition(mapped);
    if (reason) throw new Error(`precondition failed: ${reason}`);
  }

  const proposed = { ...mapped, contentQualityStatus: to };
  const proposedLifecycle = describeLifecycleState(proposed as ProductSeoContent);
  const eligibilityAfter = evaluatePublicationEligibility({ isActive: template.isActive, isPublic: template.isPublic }, proposed);

  printPreview(`Proposed ${action}: ${template.templateXid}`, {
    env,
    locale,
    currentLifecycleState: beforeLifecycle,
    proposedLifecycleState: proposedLifecycle,
    slug: mapped.slug,
    visibleAfter: eligibilityAfter.visible,
    indexableAfter: eligibilityAfter.indexable,
    dryRun,
  });

  if (dryRun) {
    console.log("  (dry run — no write performed)");
    return;
  }

  runD1(env, buildContentQualityStatusSql("product", template.id, locale, to, nowIso()));
  printAudit({ timestamp: nowIso(), environment: env, entityXid: template.templateXid, locale, action, previousState: beforeLifecycle, resultingState: proposedLifecycle });
}

function cmdMarkReview(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: mark-review <template-xid> --locale <fa|en|ar> --env <env>");
  const locale = requireLocale(flags);
  const template = resolveTemplate(envResult.env, templateXid);
  applyContentTransition(envResult.env, template, locale, ["incomplete"], "review", "mark-review", flagBoolean(flags, "dry-run"), (seo) => (canSubmitForReview(seo) ? null : "missing required h1/slug"));
}

function cmdApprove(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: approve <template-xid> --locale <fa|en|ar> --env <env>");
  const locale = requireLocale(flags);
  const template = resolveTemplate(envResult.env, templateXid);
  applyContentTransition(envResult.env, template, locale, ["review"], "approved", "approve", flagBoolean(flags, "dry-run"));
}

function cmdSendBack(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: send-back <template-xid> --locale <fa|en|ar> --env <env>");
  const locale = requireLocale(flags);
  const template = resolveTemplate(envResult.env, templateXid);
  applyContentTransition(envResult.env, template, locale, ["review"], "incomplete", "send-back", flagBoolean(flags, "dry-run"));
}

function cmdReopen(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: reopen <template-xid> --locale <fa|en|ar> --env <env>");
  const locale = requireLocale(flags);
  const template = resolveTemplate(envResult.env, templateXid);
  applyContentTransition(envResult.env, template, locale, ["approved"], "review", "reopen", flagBoolean(flags, "dry-run"));
}

function cmdPublish(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: publish <template-xid> --locale <fa|en|ar> --env <env> [--confirm-production]");
  const locale = requireLocale(flags);
  const template = resolveTemplate(envResult.env, templateXid);
  const dryRun = flagBoolean(flags, "dry-run");

  const current = requireSeoRow(envResult.env, template, locale);
  const mapped = mapSeoRow(current);
  const beforeLifecycle = describeLifecycleState(mapped as ProductSeoContent);
  if (!canPublish(mapped)) throw new Error(`precondition failed: content must be approved with a title and slug before it can be published (current: ${mapped.contentQualityStatus})`);

  const proposed = { ...mapped, publishedAt: nowIso() };
  const proposedLifecycle = describeLifecycleState(proposed as ProductSeoContent);
  const eligibilityAfter = evaluatePublicationEligibility({ isActive: template.isActive, isPublic: template.isPublic }, proposed);

  printPreview(`Proposed publish: ${template.templateXid}`, {
    env: envResult.env,
    locale,
    currentLifecycleState: beforeLifecycle,
    proposedLifecycleState: proposedLifecycle,
    slug: mapped.slug,
    visibleAfter: eligibilityAfter.visible,
    indexableAfter: eligibilityAfter.indexable,
    templateIsPublic: template.isPublic,
    dryRun,
  });
  if (!template.isPublic) {
    console.log('  NOTE: catalog_products.is_public is still false — this template will not be publicly visible until "set-public" is also run.');
  }

  if (dryRun) {
    console.log("  (dry run — no write performed)");
    return;
  }

  runD1(envResult.env, buildPublishSql("product", template.id, locale, nowIso()));
  printAudit({ timestamp: nowIso(), environment: envResult.env, entityXid: template.templateXid, locale, action: "publish", previousState: beforeLifecycle, resultingState: proposedLifecycle });
}

function cmdUnpublish(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: unpublish <template-xid> --locale <fa|en|ar> --env <env> [--confirm-production]");
  const locale = requireLocale(flags);
  const template = resolveTemplate(envResult.env, templateXid);
  const dryRun = flagBoolean(flags, "dry-run");

  const current = requireSeoRow(envResult.env, template, locale);
  const mapped = mapSeoRow(current);
  const beforeLifecycle = describeLifecycleState(mapped as ProductSeoContent);
  const proposed = { ...mapped, publishedAt: null };
  const proposedLifecycle = describeLifecycleState(proposed as ProductSeoContent);
  const eligibilityAfter = evaluatePublicationEligibility({ isActive: template.isActive, isPublic: template.isPublic }, proposed);

  printPreview(`Proposed unpublish: ${template.templateXid}`, { env: envResult.env, locale, currentLifecycleState: beforeLifecycle, proposedLifecycleState: proposedLifecycle, visibleAfter: eligibilityAfter.visible, indexableAfter: eligibilityAfter.indexable, dryRun });

  if (dryRun) {
    console.log("  (dry run — no write performed)");
    return;
  }
  runD1(envResult.env, buildUnpublishSql("product", template.id, locale, nowIso()));
  printAudit({ timestamp: nowIso(), environment: envResult.env, entityXid: template.templateXid, locale, action: "unpublish", previousState: beforeLifecycle, resultingState: proposedLifecycle });
}

function cmdSetIndex(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error("usage: set-index <template-xid> --locale <fa|en|ar> --status <index|noindex|draft> --env <env>");
  const locale = requireLocale(flags);
  const status = flagString(flags, "status");
  if (!status || !["index", "noindex", "draft"].includes(status)) throw new Error("--status must be one of index, noindex, draft");
  const template = resolveTemplate(envResult.env, templateXid);
  const dryRun = flagBoolean(flags, "dry-run");

  const current = requireSeoRow(envResult.env, template, locale);
  const mapped = mapSeoRow(current);
  const beforeLifecycle = describeLifecycleState(mapped as ProductSeoContent);
  const proposed = { ...mapped, indexStatus: status as IndexStatus };
  const eligibilityAfter = evaluatePublicationEligibility({ isActive: template.isActive, isPublic: template.isPublic }, proposed);

  printPreview(`Proposed set-index: ${template.templateXid}`, { env: envResult.env, locale, currentIndexStatus: mapped.indexStatus, proposedIndexStatus: status, currentLifecycleState: beforeLifecycle, visibleAfter: eligibilityAfter.visible, indexableAfter: eligibilityAfter.indexable, dryRun });

  if (dryRun) {
    console.log("  (dry run — no write performed)");
    return;
  }
  runD1(envResult.env, buildSetIndexStatusSql("product", template.id, locale, status as IndexStatus, nowIso()));
  printAudit({ timestamp: nowIso(), environment: envResult.env, entityXid: template.templateXid, locale, action: "set-index", previousState: mapped.indexStatus, resultingState: status });
}

function cmdSetPublic(positional: string[], flags: ReturnType<typeof parseArgs>["flags"], isPublic: boolean): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const templateXid = positional[0];
  if (!templateXid) throw new Error(`usage: ${isPublic ? "set-public" : "unset-public"} <template-xid> --env <env> [--confirm-production]`);
  const template = resolveTemplate(envResult.env, templateXid);
  const dryRun = flagBoolean(flags, "dry-run");

  printPreview(`Proposed ${isPublic ? "set-public" : "unset-public"}: ${template.templateXid}`, { env: envResult.env, currentIsPublic: template.isPublic, proposedIsPublic: isPublic, dryRun });
  if (dryRun) {
    console.log("  (dry run — no write performed)");
    return;
  }
  runD1(envResult.env, buildSetTemplatePublicationFlagSql(template.id, isPublic, nowIso()));
  printAudit({ timestamp: nowIso(), environment: envResult.env, entityXid: template.templateXid, locale: null, action: isPublic ? "set-public" : "unset-public", previousState: String(template.isPublic), resultingState: String(isPublic) });
}

function cmdSetVariantPublic(positional: string[], flags: ReturnType<typeof parseArgs>["flags"], isPublic: boolean): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const variantXid = positional[0];
  if (!variantXid) throw new Error(`usage: ${isPublic ? "set-variant-public" : "unset-variant-public"} <variant-xid> --env <env> [--confirm-production]`);
  const variant = resolveVariant(envResult.env, variantXid);
  const dryRun = flagBoolean(flags, "dry-run");

  printPreview(`Proposed ${isPublic ? "set-variant-public" : "unset-variant-public"}: ${variant.xid}`, { env: envResult.env, sku: variant.sku, isActive: variant.isActive, currentIsPublic: variant.isPublic, proposedIsPublic: isPublic, dryRun });
  if (dryRun) {
    console.log("  (dry run — no write performed)");
    return;
  }
  runD1(envResult.env, buildSetVariantPublicationFlagSql(variant.id, isPublic, nowIso()));
  printAudit({ timestamp: nowIso(), environment: envResult.env, entityXid: variant.xid, locale: null, action: isPublic ? "set-variant-public" : "unset-variant-public", previousState: String(variant.isPublic), resultingState: String(isPublic) });
}

function cmdBatch(positional: string[], flags: ReturnType<typeof parseArgs>["flags"]): void {
  const envResult = resolveWriteEnvironment(flags);
  if (!envResult.ok) throw new Error(describeEnvironmentError(envResult));
  const filePath = positional[0];
  if (!filePath) throw new Error("usage: batch <path.json> --env <env> [--dry-run]");
  const dryRun = flagBoolean(flags, "dry-run");

  const entries = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
  if (!Array.isArray(entries)) throw new Error("batch file must contain a JSON array of editorial entries");

  const resolved: { entry: BatchEditorialEntry; template: TemplateRow }[] = [];
  for (const [i, raw] of entries.entries()) {
    const validation = validateBatchEntry(raw, isValidSlug);
    if (!validation.ok) throw new Error(`entry ${i}: ${validation.errors.join("; ")}`);
    const entry = raw as BatchEditorialEntry;
    const template = resolveTemplate(envResult.env, entry.templateXid); // throws NotFoundError if unknown, aborting the whole batch before any write
    resolved.push({ entry, template });
  }

  console.log(`\nBatch: ${resolved.length} entries validated — env=${envResult.env} dryRun=${dryRun}`);
  for (const { entry, template } of resolved) {
    applyEditorialDraft(envResult.env, template, entry.locale, { h1: entry.h1, slug: entry.slug, intro: entry.intro ?? null, seoTitle: entry.seoTitle ?? null, seoDescription: entry.seoDescription ?? null, bodyJson: entry.bodyJson }, dryRun);
  }
}

function mustReadEnv(flags: ReturnType<typeof parseArgs>["flags"]): CliEnv {
  const result = resolveReadEnvironment(flags);
  if (!result.ok) throw new Error(describeEnvironmentError(result));
  return result.env;
}

function printUsage(): void {
  console.log(`
Ahan Asa Catalog editorial operator CLI (docs/CATALOG_EDITORIAL_OPERATIONS.md)

  list [--locale fa|en|ar] [--env local|staging|production]
  show <template-xid> [--env <env>]
  validate <template-xid> --locale <locale> [--env <env>]
  edit <template-xid> --locale <locale> --env <env> --title <str> --slug <str> [--intro] [--seo-title] [--seo-description] [--dry-run]
  edit <template-xid> --locale <locale> --env <env> --file <path.json> [--dry-run]
  mark-review <template-xid> --locale <locale> --env <env> [--dry-run]
  approve <template-xid> --locale <locale> --env <env> [--dry-run]
  send-back <template-xid> --locale <locale> --env <env> [--dry-run]
  reopen <template-xid> --locale <locale> --env <env> [--dry-run]
  publish <template-xid> --locale <locale> --env <env> [--confirm-production] [--dry-run]
  unpublish <template-xid> --locale <locale> --env <env> [--confirm-production] [--dry-run]
  set-index <template-xid> --locale <locale> --status index|noindex|draft --env <env> [--dry-run]
  set-public <template-xid> --env <env> [--confirm-production] [--dry-run]
  unset-public <template-xid> --env <env> [--confirm-production] [--dry-run]
  set-variant-public <variant-xid> --env <env> [--confirm-production] [--dry-run]
  unset-variant-public <variant-xid> --env <env> [--confirm-production] [--dry-run]
  batch <path.json> --env <env> [--dry-run]

--env is REQUIRED for every write command (local|staging|production).
--env production additionally requires --confirm-production.
`);
}

function main(): void {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));

  try {
    switch (command) {
      case "list":
        return cmdList(positional, flags);
      case "show":
        return cmdShow(positional, flags);
      case "validate":
        return cmdValidate(positional, flags);
      case "edit":
        return cmdEdit(positional, flags);
      case "mark-review":
        return cmdMarkReview(positional, flags);
      case "approve":
        return cmdApprove(positional, flags);
      case "send-back":
        return cmdSendBack(positional, flags);
      case "reopen":
        return cmdReopen(positional, flags);
      case "publish":
        return cmdPublish(positional, flags);
      case "unpublish":
        return cmdUnpublish(positional, flags);
      case "set-index":
        return cmdSetIndex(positional, flags);
      case "set-public":
        return cmdSetPublic(positional, flags, true);
      case "unset-public":
        return cmdSetPublic(positional, flags, false);
      case "set-variant-public":
        return cmdSetVariantPublic(positional, flags, true);
      case "unset-variant-public":
        return cmdSetVariantPublic(positional, flags, false);
      case "batch":
        return cmdBatch(positional, flags);
      default:
        printUsage();
        process.exitCode = command ? 1 : 0;
    }
  } catch (err) {
    if (err instanceof NotFoundError) {
      console.error(`NOT FOUND: ${err.message}`);
    } else if (err instanceof SlugConflictError) {
      console.error(`SLUG CONFLICT: ${err.message}`);
    } else {
      console.error(`ERROR: ${(err as Error).message}`);
    }
    process.exitCode = 1;
  }
}

main();
