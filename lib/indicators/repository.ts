import { getPublicDb } from "../db/public.ts";
import { isStaticExportBuild } from "../static/locale-params.ts";
import type { PublishedIndicatorPointRow, PublishedIndicatorRow } from "../contracts/snapshot-indicators.ts";
import { indicatorsFromRows, type Indicator } from "./presentation.ts";

/**
 * W18.2 — the market indicators of this build, from the snapshot's build-only `published_indicators` /
 * `published_indicator_points` (lib/contracts/snapshot-indicators.ts). Outside the static export build there is
 * no such table: `[]` = render no indicator surface at all (never a placeholder). One read per build process.
 */
let cached: Promise<Indicator[]> | null = null;

export function listIndicators(): Promise<Indicator[]> {
  if (!isStaticExportBuild()) return Promise.resolve([]);
  cached ??= readIndicators();
  return cached;
}

async function readIndicators(): Promise<Indicator[]> {
  const db = getPublicDb();
  const { results: rows } = await db.prepare("SELECT * FROM published_indicators").all<PublishedIndicatorRow>();
  const { results: points } = await db.prepare("SELECT * FROM published_indicator_points ORDER BY code, date").all<PublishedIndicatorPointRow>();
  return indicatorsFromRows(rows ?? [], points ?? []);
}
