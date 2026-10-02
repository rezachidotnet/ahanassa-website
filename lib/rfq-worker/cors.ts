/**
 * CORS for POST /api/rfqs (docs/contracts/RFQ_SUBMIT_V1.md): exact-origin
 * allow-list from configuration, never a wildcard, never credentials.
 */
export function isAllowedOrigin(origin: string | null, allowed: readonly string[]): origin is string {
  return origin !== null && allowed.includes(origin);
}

export function corsHeaders(origin: string | null, allowed: readonly string[]): Record<string, string> {
  return isAllowedOrigin(origin, allowed) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
}

/** Preflight: 204 with the allow headers only for an allowed origin; otherwise 403 without any Access-Control-Allow-* header. */
export function preflightResponse(request: Request, allowed: readonly string[]): Response {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, allowed)) return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
