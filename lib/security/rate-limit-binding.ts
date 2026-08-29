import { env } from "cloudflare:workers";
import { evaluateRateLimit, getClientIp, type RateLimitCheck, type RateLimiterBinding } from "./rate-limit.ts";

export { getClientIp };

/** Convenience wrapper resolving the real Cloudflare binding — used by the route handler. */
export async function checkRfqRateLimit(request: Request): Promise<RateLimitCheck> {
  const limiter = (env as CloudflareEnv).RFQ_RATE_LIMITER as RateLimiterBinding | undefined;
  return evaluateRateLimit(limiter, getClientIp(request));
}
