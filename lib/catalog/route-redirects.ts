import { getPublicDb } from "../db/public.ts";
import { ulid } from "../rfq/ulid.ts";
import { planSlugChangeRedirects, validateRedirectInsert, type RedirectStatusCode, type RouteRedirectRow } from "./route-redirects-logic.ts";
import type { Locale } from "../../config/locales.ts";

/**
 * D1-backed `route_redirects` repository (`migrations_public/0005_homepage_projection.sql`)
 * — validation/chain-collapse decisions live in the pure
 * `route-redirects-logic.ts`; this file only fetches rows and writes.
 * Generic across entity types — this task's §11.
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
 * Single-hop lookup only — write-time chain collapse (`recordSlugChange`
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

/**
 * Called when an entity's canonical path for a locale changes (e.g. an
 * editor edits a template's slug) — never for a brand-new entity's first
 * slug (this task's "do NOT blindly create redirect rows for first-time
 * slug creation"). The caller (`editorial-repository.ts#upsertEditorialDraft`)
 * is responsible for only invoking this when a previous path genuinely
 * existed. Writes the new 301 row and repoints any pre-existing redirect
 * that targeted the old path, atomically, in one D1 `.batch()`.
 */
export async function recordSlugChangeRedirect(locale: Locale, entityType: string, entityId: string, previousPath: string, newPath: string): Promise<void> {
  const db = getPublicDb();
  const existingRows = await db.prepare(`SELECT locale, old_path, target_path, status_code FROM route_redirects WHERE locale = ?`).bind(locale).all<RedirectRow>();
  const existingForLocale = (existingRows.results ?? []).map(toLogicRow);

  const plan = planSlugChangeRedirects(previousPath, newPath, existingForLocale);

  const validation = validateRedirectInsert({ oldPath: plan.newRedirect.oldPath, targetPath: plan.newRedirect.targetPath, statusCode: 301 }, existingForLocale);
  if (!validation.ok) {
    // A self-redirect/loop here means the caller passed an inconsistent
    // previous/new path pair (e.g. re-saving the same slug) — never write a
    // known-broken row; the caller keeps whatever redirect state already
    // existed.
    console.error("ROUTE_REDIRECT_REJECTED", JSON.stringify({ locale, previousPath, newPath, reason: validation.reason }));
    return;
  }

  const now = new Date().toISOString();
  const statements = [
    db
      .prepare(
        `INSERT INTO route_redirects (id, locale, old_path, target_path, status_code, entity_type, entity_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 301, ?, ?, ?, ?)
         ON CONFLICT(locale, old_path) DO UPDATE SET target_path = excluded.target_path, entity_type = excluded.entity_type, entity_id = excluded.entity_id, updated_at = excluded.updated_at`,
      )
      .bind(ulid(), locale, plan.newRedirect.oldPath, plan.newRedirect.targetPath, entityType, entityId, now, now),
    ...plan.chainCollapseUpdates.map((update) => db.prepare(`UPDATE route_redirects SET target_path = ?, updated_at = ? WHERE locale = ? AND old_path = ?`).bind(update.targetPath, now, locale, update.oldPath)),
  ];

  await db.batch(statements);
}
