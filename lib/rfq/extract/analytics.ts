/**
 * W13.3 dataLayer events. Same privacy rule and shape as the site's
 * measurement vocabulary (W16.4, lib/analytics/events.ts in PR #47, not yet
 * on this branch's base): an allowlist of keys, numbers or short tokens only
 * — never a file name, never anything read from a file. When #47 is merged,
 * these two calls become `trackEvent(...)` and `rfq_extract` joins
 * ANALYTICS_EVENTS (docs/RFQ_INSTANT_EXTRACT.md "Analytics").
 *
 *   file_upload  — a file passed the attachment checks: file_count, file_type (the policy's extension)
 *   rfq_extract  — a reading ended: extract_result, row_count, review_count, file_type, extract_seconds
 */
export const EXTRACT_EVENTS = {
  file_upload: ["file_count", "file_type"],
  rfq_extract: ["extract_result", "row_count", "review_count", "file_type", "extract_seconds"],
} as const satisfies Record<string, readonly string[]>;

export type ExtractEventName = keyof typeof EXTRACT_EVENTS;
type Params<E extends ExtractEventName> = Partial<Record<(typeof EXTRACT_EVENTS)[E][number], string | number>>;

const SAFE_TOKEN = /^[A-Za-z0-9_.:-]{1,64}$/;

export function buildExtractEvent<E extends ExtractEventName>(event: E, params: Params<E>): Record<string, string | number> {
  const out: Record<string, string | number> = { event };
  const allowed: readonly string[] = EXTRACT_EVENTS[event];
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (!allowed.includes(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "string" && SAFE_TOKEN.test(value)) out[key] = value;
  }
  return out;
}

/** Pushes one event to window.dataLayer; a no-op outside the browser; never throws. */
export function trackExtractEvent<E extends ExtractEventName>(event: E, params: Params<E>): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    (w.dataLayer ??= []).push(buildExtractEvent(event, params));
  } catch {
    // Measurement must never break the form.
  }
}
