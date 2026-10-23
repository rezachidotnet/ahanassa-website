/**
 * W32 (W29 P2 §3.4), W35: the form asks the RFQ API it talks to what it offers — GET <rfqEndpoint>/capabilities
 * (lib/rfq-worker/capabilities.ts) — and loads ONLY the captcha that API names:
 *
 *   api.ahanassa.com (Cloudflare Worker)            → Turnstile
 *   api-staging/-new.ahanassa.ir (iransrv intake)   → ALTCHA, its challenge URL on that SAME API host
 *   api.ahanassa.ir                                 → whatever Arvan's origin for it is today
 *
 * The ALTCHA challenge path must be one of the RFQ API's own paths (`/api/rfqs/<name>`): the answer can never point
 * the form at another host.
 *
 * An older Worker without the route (404) means Turnstile, and its file capability is read from GET …/files as
 * before (lib/rfq/upload-files.ts). Any other failure is `null`: the caller keeps its default (Turnstile on .com; on
 * an Iran host the W27 "could not load" message with phone / e-mail / WhatsApp then shows).
 */
import { fetchFilesCapability, filesEndpointFor, type FilesCapability } from "./upload-files.ts";

export type CaptchaChoice = { provider: "turnstile" } | { provider: "altcha"; challengeUrl: string };

export interface RfqCapabilities {
  captcha: CaptchaChoice;
  files: FilesCapability | null;
}

export const capabilitiesEndpointFor = (rfqEndpoint: string) => `${rfqEndpoint.replace(/\/+$/, "")}/capabilities`;

const CHALLENGE_PATH = /^\/api\/rfqs\/[a-z][a-z-]{0,39}$/;

/** The absolute challenge URL on the RFQ API's own origin, or null for anything else. */
export function altchaChallengeUrl(rfqEndpoint: string, challengePath: unknown): string | null {
  if (typeof challengePath !== "string" || !CHALLENGE_PATH.test(challengePath)) return null;
  try {
    return new URL(challengePath, new URL(rfqEndpoint).origin).toString();
  } catch {
    return null;
  }
}

export async function fetchRfqCapabilities(rfqEndpoint: string, fetchImpl: typeof fetch = fetch, timeoutMs = 8_000): Promise<RfqCapabilities | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(capabilitiesEndpointFor(rfqEndpoint), { method: "GET", signal: controller.signal });
    if (res.status === 404) return { captcha: { provider: "turnstile" }, files: await fetchFilesCapability(filesEndpointFor(rfqEndpoint), fetchImpl) };
    if (!res.ok) return null;
    const body = (await res.json()) as { captcha?: { provider?: unknown; challengePath?: unknown }; files?: Partial<FilesCapability> & { enabled?: unknown }; extract?: { lists?: unknown; pictures?: unknown } };
    let captcha: CaptchaChoice;
    const challengeUrl = body.captcha?.provider === "altcha" ? altchaChallengeUrl(rfqEndpoint, body.captcha.challengePath) : null;
    if (challengeUrl) captcha = { provider: "altcha", challengeUrl };
    else if (body.captcha?.provider === "turnstile") captcha = { provider: "turnstile" };
    else return null;
    const f = body.files;
    const files: FilesCapability | null =
      f?.enabled === true && typeof f.maxFiles === "number" && typeof f.maxFileBytes === "number"
        ? { enabled: true, maxFiles: f.maxFiles, maxFileBytes: f.maxFileBytes, extract: { lists: body.extract?.lists === true, pictures: body.extract?.pictures === true } }
        : null;
    return { captcha, files };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
