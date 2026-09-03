import { getPublicDb } from "../db/public.ts";
import { ulid } from "../rfq/ulid.ts";
import { planSlugChangeRedirectStatements, type RedirectStatusCode, type RouteRedirectRow } from "./route-redirects-logic.ts";
import type { Locale } from "../../config/locales.ts";

/**
 * D1-backed `route_redirects` repository (`migrations_public/0005_homepage_projection.sql`,
 * `migrations_public/0006_route_redirects_308.sql`) — validation/chain-collapse
 * decisions live in the pure `route-redirects-logic.ts`; this file only
 * fetches rows and builds statements. Generic across entity types — this
 * task's §11.
 */

interface RedirectRow {
  locale: string;
  old_path: string;
  target_path: string | null;
  status_code: number;
}

function toLogicRow(row: RedirectRow): RouteRedirectRow {
  return { locale: row.locale, oldPath: row.old_path, targetPath: row.target_path, statusCode: row.status_code as RedirectStatusCode, entityType: "", entityId: "" };
}

/**
 * Single-hop lookup only — write-time chain collapse (`buildSlugChangeRedirectStatements`
 * below) is what keeps a read here from ever needing to follow more than
 * one hop in the steady state (this task's own "no redirect loops"
 * combined with "chain collapse at write time" design, mirrored from
 * `route-redirects-logic.ts`'s own header comment).
 */
export interface ResolvedRedirect {
  targetPath: string | null;
  statusCode: RedirectStatusCode;
}

export async function resolveRouteRedirect(locale: Locale, oldPath: string): Promise<ResolvedRedirect | null> {
  const db = getPublicDb();
  const row = await db.prepare(`SELECT locale, old_path, target_path, status_code FROM route_redirects WHERE locale = ? AND old_path = ?`).bind(locale, oldPath).first<RedirectRow>();
  return row ? { targetPath: row.target_path, statusCode: row.status_code as RedirectStatusCode } : null;
}

export type BuildSlugChangeRedirectResult = { ok: true; statements: D1PreparedStatement[] } | { ok: false; reason: "self_redirect" | "loop_detected" | "missing_target" };

/**
 * Builds (never executes) the D1 statements needed to record a canonical
 * slug change as a permanent redirect, plus any write-time chain collapse —
 * called when an entity's canonical path for a locale changes (e.g. an
 * editor edits a template's slug), never for a brand-new entity's first
 * slug (this task's "do NOT blindly create redirect rows for first-time
 * slug creation"). The caller (`editorial-repository.ts#upsertEditorialDraft`)
 * is responsible for only invoking this when a previous path genuinely
 * existed, and — critically — for including the returned statements in the
 * SAME `db.batch()` call as the slug-owning content write, so the two
 * commit or fail together. This function deliberately does NOT call
 * `.batch()`/`.run()` itself: slug redirects are not a best-effort
 * convenience overlay — an existing indexed canonical URL must never become
 * unreachable because a redirect write was skipped or failed independently
 * of the slug change it describes (this task's atomicity requirement).
 *
 * Returns `{ ok: false }` (never throws, never writes) when the candidate
 * redirect would be a self-redirect or a loop — the caller must treat this
 * as a reason to refuse the whole slug change, not merely skip the
 * redirect, since a slug change with no safe way to preserve its previous
 * URL is not a safe slug change at all.
 */
export async function buildSlugChangeRedirectStatements(locale: Locale, entityType: string, entityId: string, previousPath: string, newPath: string): Promise<BuildSlugChangeRedirectResult> {
  const db = getPublicDb();
  const existingRows = await db.prepare(`SELECT locale, old_path, target_path, status_code FROM route_redirects WHERE locale = ?`).bind(locale).all<RedirectRow>();
  const existingForLocale = (existingRows.results ?? []).map(toLogicRow);

  // The actual decision (safe to proceed? which statements, in which order?)
  // is delegated entirely to the pure, exhaustively-unit-tested
  // `planSlugChangeRedirectStatements` (`route-redirects-logic.ts`) — this
  // function's only remaining job is the D1-specific mechanics: fetch the
  // existing rows above, then turn the pure plan's plain SQL+params into
  // real `D1PreparedStatement`s below. Kept a thin, D1-only wrapper
  // deliberately, so the actual redirect-safety logic stays unit-testable
  // without a live database.
  const plan = planSlugChangeRedirectStatements(locale, entityType, entityId, previousPath, newPath, existingForLocale, ulid(), new Date().toISOString());
  if (!plan.ok) {
    return plan;
  }

  return { ok: true, statements: plan.statements.map((s) => db.prepare(s.sql).bind(...s.params)) };
}
