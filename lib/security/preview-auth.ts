/**
 * TEMPORARY / NON-LIVE ONLY — Deployment Stage 1 preview protection.
 *
 * Cloudflare Access is not enabled on this account and could not be
 * enabled with the currently authorized Wrangler OAuth token (no Zero
 * Trust/Access API scope; enabling it is a one-time dashboard action) — see
 * docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md. Until Access (or an equivalent) is
 * available, `workers/entry.ts` calls `checkPreviewBasicAuth` on every
 * single HTTP request before any application routing — homepage, Catalog,
 * `/api/rfqs` included, with no exclusion — because this non-live
 * deployment carries the real, live-writing Odoo RFQ credential. Delete
 * this file and its one call site in `workers/entry.ts` entirely before the
 * public `ahanassa.com` cutover; see that doc's "Removing the preview gate"
 * section for the exact steps.
 */

const REALM = "Ahan Asa non-live preview";

/** Returns a 401 Response if the request must be blocked, or `null` if it may proceed. */
export function checkPreviewBasicAuth(request: Request): Response | null {
  const expectedUser = process.env.PREVIEW_BASIC_AUTH_USER;
  const expectedPassword = process.env.PREVIEW_BASIC_AUTH_PASSWORD;

  // Fail closed: if either credential isn't configured, refuse every
  // request rather than leaving the gate open by omission.
  if (!expectedUser || !expectedPassword) {
    return unauthorized();
  }

  const header = request.headers.get("Authorization");
  if (!header || !header.startsWith("Basic ")) {
    return unauthorized();
  }

  const provided = decodeBasicAuth(header.slice("Basic ".length));
  if (!provided) {
    return unauthorized();
  }

  const userMatches = timingSafeEqual(provided.user, expectedUser);
  const passwordMatches = timingSafeEqual(provided.password, expectedPassword);
  if (!userMatches || !passwordMatches) {
    return unauthorized();
  }

  return null;
}

function unauthorized(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

function decodeBasicAuth(base64Credentials: string): { user: string; password: string } | null {
  let decoded: string;
  try {
    decoded = atob(base64Credentials);
  } catch {
    return null;
  }
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return null;
  return { user: decoded.slice(0, separatorIndex), password: decoded.slice(separatorIndex + 1) };
}

/** Constant-time comparison — a preview credential must never be distinguishable via response-time differences. */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const length = Math.max(aBytes.length, bBytes.length, 32);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}
