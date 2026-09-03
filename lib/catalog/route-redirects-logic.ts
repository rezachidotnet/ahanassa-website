/**
 * Pure route-redirect validation/chain-collapse logic — this task's §11-12.
 * Split from `lib/catalog/route-redirects.ts` (D1-touching) the same way
 * `sync.ts` is split from `repository.ts`.
 *
 * Generic across entity types (products/categories/articles/price-pages —
 * this task's explicit "not product-specific") — nothing here assumes a
 * `/products/` prefix or a catalog entity.
 */

export type RedirectStatusCode = 301 | 302 | 410;

export interface RouteRedirectRow {
  locale: string;
  oldPath: string;
  targetPath: string | null;
  statusCode: RedirectStatusCode;
  entityType: string;
  entityId: string;
}

export type RedirectValidationResult = { ok: true } | { ok: false; reason: "self_redirect" | "loop_detected" | "missing_target" };

/**
 * Validates one candidate redirect against the FULL existing set for the
 * same locale before it is written. Two independent safety properties:
 *   - self-redirect: `oldPath === targetPath` is never allowed.
 *   - loop: following `targetPath` through the existing table (a single
 *     hop is normal; more than one hop before reaching a path that is NOT
 *     itself a redirect source, or reaching back to `oldPath`, is a loop)
 *     is rejected. Chains are collapsed at WRITE time instead (see
 *     `planSlugChangeRedirects` below) specifically so this loop check
 *     never has to walk more than one hop in the steady state — this
 *     function still defends the invariant even if that discipline is
 *     ever violated by a future caller.
 */
export function validateRedirectInsert(candidate: { oldPath: string; targetPath: string | null; statusCode: RedirectStatusCode }, existingForLocale: RouteRedirectRow[]): RedirectValidationResult {
  if (candidate.statusCode === 410) {
    // A terminal removal deliberately has no target — this task's own
    // "never invent replacements" for a no-replacement retirement.
    return candidate.targetPath === null ? { ok: true } : { ok: false, reason: "missing_target" };
  }

  if (!candidate.targetPath) return { ok: false, reason: "missing_target" };
  if (candidate.targetPath === candidate.oldPath) return { ok: false, reason: "self_redirect" };

  const bySource = new Map(existingForLocale.map((r) => [r.oldPath, r]));
  const visited = new Set<string>([candidate.oldPath]);
  let cursor: string | null = candidate.targetPath;
  let hops = 0;
  const MAX_HOPS = 10; // generous vs. the expected single-hop steady state; a real cycle is caught long before this, an accidental very-long legitimate chain is not silently truncated into a false "not a loop"

  while (cursor && hops < MAX_HOPS) {
    if (visited.has(cursor)) return { ok: false, reason: "loop_detected" };
    visited.add(cursor);
    const next: RouteRedirectRow | undefined = bySource.get(cursor);
    if (!next) break; // cursor is not itself a redirect source — chain terminates normally
    cursor = next.targetPath;
    hops++;
  }
  if (hops >= MAX_HOPS) return { ok: false, reason: "loop_detected" };

  return { ok: true };
}

export interface SlugChangePlan {
  /** The new/updated row: old slug's path -> the entity's new canonical path. */
  newRedirect: { oldPath: string; targetPath: string };
  /** Any pre-existing redirect rows that pointed at the entity's now-superseded old path and must be repointed at the new path instead, so no caller ever has to hop through more than one redirect (chain collapse at write time). */
  chainCollapseUpdates: { oldPath: string; targetPath: string }[];
}

/**
 * Called whenever an entity's canonical path for a locale changes (e.g. a
 * template's slug is edited). Never called for a brand-new entity's first
 * slug — this task's explicit "do NOT blindly create redirect rows for
 * first-time slug creation" (the caller is responsible for only invoking
 * this when a PREVIOUS canonical path already existed).
 */
export function planSlugChangeRedirects(previousPath: string, newPath: string, existingForLocale: RouteRedirectRow[]): SlugChangePlan {
  const chainCollapseUpdates = existingForLocale.filter((r) => r.targetPath === previousPath && r.statusCode !== 410).map((r) => ({ oldPath: r.oldPath, targetPath: newPath }));

  return {
    newRedirect: { oldPath: previousPath, targetPath: newPath },
    chainCollapseUpdates,
  };
}
