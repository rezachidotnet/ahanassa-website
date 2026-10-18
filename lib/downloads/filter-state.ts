/**
 * W20.8 — the Download Center filter as a shareable URL: `/downloads?q=<size>&type=dxf|pdf|catalog&family=<segment>`
 * (`family` = the public category's listing segment, e.g. "box-section"). Pure, for the client island and tests.
 * Unknown values are dropped, so a stale or hand-edited link never leaves an impossible filter in place.
 */
export const DOWNLOAD_FILE_TYPES = ["all", "dxf", "pdf", "catalog"] as const;
export type DownloadFileType = (typeof DOWNLOAD_FILE_TYPES)[number];

export interface DownloadFilterState {
  q: string;
  type: DownloadFileType;
  /** A family's segment, or "" for every family. */
  family: string;
}

export const EMPTY_DOWNLOAD_FILTER: DownloadFilterState = { q: "", type: "all", family: "" };
const MAX_QUERY = 60;

export function parseDownloadFilter(search: string, families: readonly string[]): DownloadFilterState {
  const p = new URLSearchParams(search);
  const type = p.get("type") ?? "all";
  const family = p.get("family") ?? "";
  return {
    q: (p.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY),
    type: (DOWNLOAD_FILE_TYPES as readonly string[]).includes(type) ? (type as DownloadFileType) : "all",
    family: families.includes(family) ? family : "",
  };
}

/** The page's `location.search` for a state, keeping any other parameter (e.g. `gtm_debug`); "" when empty. */
export function downloadFilterSearch(current: string, state: DownloadFilterState): string {
  const p = new URLSearchParams(current);
  for (const key of ["q", "type", "family"]) p.delete(key);
  const q = state.q.trim().slice(0, MAX_QUERY);
  if (q) p.set("q", q);
  if (state.type !== "all") p.set("type", state.type);
  if (state.family) p.set("family", state.family);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function sameDownloadFilter(a: DownloadFilterState, b: DownloadFilterState): boolean {
  return a.q === b.q && a.type === b.type && a.family === b.family;
}
