/**
 * Browser-side idempotency-key lifecycle (architecture V1.1 r3 W3.2).
 *
 * One key per draft, kept in memory only. It changes ONLY when
 *   - a payload-affecting field is edited (`payloadEdited`), or
 *   - a request succeeded (201/200) and the customer starts a new one (`startNewRequest`).
 * Any error (403 Turnstile, 5xx after retries, network) leaves the key alone:
 * "try again" resets the Turnstile widget and resubmits with the SAME key, so a
 * stored-but-unacknowledged first attempt replays instead of duplicating.
 */
export type IdempotencyKeyLifecycle = {
  current(): string;
  payloadEdited(): void;
  startNewRequest(): void;
};

export function createIdempotencyKeyLifecycle(generate: () => string): IdempotencyKeyLifecycle {
  let key = generate();
  return {
    current: () => key,
    payloadEdited: () => {
      key = generate();
    },
    startNewRequest: () => {
      key = generate();
    },
  };
}
