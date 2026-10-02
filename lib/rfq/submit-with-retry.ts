/**
 * Browser-side RFQ submit with bounded retry (architecture V1.1 r3 §8.3).
 *
 * Retries at most RETRY_DELAYS_MS.length times (2) on a network error or an
 * HTTP 5xx, with the SAME body (hence the same `idempotencyKey`) every time.
 * Never retries on 4xx. A 200 replay is a normal success (the original
 * reference). The last failure is returned/thrown so the caller shows its
 * normal error only after the final attempt.
 */
import type { RfqResponse } from "./types.ts";

/** Base delays before retry 1 and retry 2 (exponential-ish); ±20 % jitter is added. */
export const RETRY_DELAYS_MS = [1000, 3000] as const;

export type SubmitDeps = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

export type SubmitOutcome = { status: number; body: RfqResponse | null };

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function submitRfqWithRetry(endpoint: string, payload: unknown, deps: SubmitDeps = {}): Promise<SubmitOutcome> {
  const doFetch = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const random = deps.random ?? Math.random;
  const body = JSON.stringify(payload); // one serialization: identical bytes on every attempt

  for (let attempt = 0; ; attempt++) {
    const retriesLeft = attempt < RETRY_DELAYS_MS.length;
    let outcome: SubmitOutcome | null = null;
    let failure: unknown;
    try {
      const res = await doFetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body });
      let parsed: RfqResponse | null = null;
      try {
        parsed = (await res.json()) as RfqResponse;
      } catch {
        parsed = null;
      }
      outcome = { status: res.status, body: parsed };
    } catch (err) {
      failure = err;
    }

    const retryable = outcome ? outcome.status >= 500 : true;
    if (outcome && !retryable) return outcome;
    if (!retryable || !retriesLeft) {
      if (outcome) return outcome;
      throw failure;
    }
    const base = RETRY_DELAYS_MS[attempt];
    await sleep(Math.round(base * (0.8 + random() * 0.4)));
  }
}
