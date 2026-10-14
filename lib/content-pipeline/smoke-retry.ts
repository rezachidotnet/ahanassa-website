/**
 * W17.5 (owner, 2026-10-14) — retries for the publish smoke's browser check.
 *
 * On 2026-10-14 one publish smoke failed with "could not start Chrome", another with "/ar/contact … not
 * hydrated", and the next identical run passed: both were flakes of the runner, not of the artifact. So
 * `scripts/static/hydration-check.ts` starts Chrome up to `CHROME_START_ATTEMPTS` times and
 * `scripts/content/publish.ts` re-runs the /contact hydration check once after `CONTACT_HYDRATION_RETRY.delayMs`
 * before failing. A failure that survives every attempt is thrown unchanged, so its message is the one the
 * smoke always reported.
 */
export interface RetryOptions {
  /** Total attempts, including the first (>= 1). */
  attempts: number;
  /** Wait between a failed attempt and the next one. */
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Called after a failed attempt that will be retried (1-based attempt number). */
  onRetry?: (attempt: number, error: unknown) => void;
}

export const CHROME_START_ATTEMPTS = 3;
export const CONTACT_HYDRATION_RETRY = { attempts: 2, delayMs: 30_000 } as const;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Runs `run` until it resolves or `attempts` are used up; rethrows the last attempt's error as it is. */
export async function withRetries<T>(run: (attempt: number) => Promise<T>, { attempts, delayMs = 0, sleep = defaultSleep, onRetry }: RetryOptions): Promise<T> {
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error(`attempts must be a positive integer (got ${attempts})`);
  for (let attempt = 1; ; attempt++) {
    try {
      return await run(attempt);
    } catch (error) {
      if (attempt >= attempts) throw error;
      onRetry?.(attempt, error);
      if (delayMs > 0) await sleep(delayMs);
    }
  }
}
