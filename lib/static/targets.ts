/**
 * Static build targets (architecture V1.1 §6.1, A4): the only per-target
 * values baked into public-assets. Single source for the build, the CSP
 * `connect-src` in _headers, the /contact form's endpoint and the gate.
 * Both values are public (Turnstile SITE keys are public by design).
 */
export interface StaticTarget {
  /** Origin of the standalone RFQ Worker the static /contact page posts to. */
  rfqApiOrigin: string;
  /** Turnstile site key for this target's static host (undefined = no widget). */
  turnstileSiteKey: string | undefined;
}

export const STATIC_TARGETS = {
  staging: {
    rfqApiOrigin: "https://api-staging.ahanassa.com",
    // Widget "ahanassa-v11-staging" (hostname: the v11 static staging host), created in W2.
    turnstileSiteKey: "0x4AAAAAAFLyizJLrUFUHeNf" as string | undefined,
  },
  production: {
    rfqApiOrigin: "https://api.ahanassa.com",
    // Same public site key as wrangler.jsonc env.production.vars (a test keeps them equal).
    turnstileSiteKey: "0x4AAAAAAEi2RZ3NHcqTk0ej",
  },
} satisfies Record<"staging" | "production", StaticTarget>;

export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
