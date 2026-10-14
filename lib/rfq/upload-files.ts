/**
 * Browser side of the RFQ file upload (D-RFQ-FILE; docs/RFQ_FILE_UPLOAD.md).
 * Runs only AFTER the RFQ itself was accepted (it has its tracking number):
 * one PUT per file to `<filesEndpoint>/<reference>/<slot>`, authenticated by
 * the request's own idempotency key. A network error or 5xx is retried once;
 * a 4xx is final. The result never changes what the visitor sees — the
 * success panel shows only the tracking number (W10.3); a file that did not
 * arrive is flagged to staff in Odoo instead.
 */
import { RFQ_KEY_HEADER_NAME } from "./attachment-policy.ts";

export interface FilesCapability {
  enabled: boolean;
  maxFiles: number;
  maxFileBytes: number;
  /** W13.3: whether the form reads an attached list into rows (typed lists in the browser; pictures/PDFs via /api/rfqs/extract). */
  extract: { lists: boolean; pictures: boolean };
}

export type UploadOutcome = "received" | "rejected" | "failed";

export interface UploadDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  onProgress?: (done: number, total: number) => void;
}

const RETRY_DELAY_MS = 1500;

/** `.../api/rfqs` -> `.../api/rfqs/files` (the same RFQ Worker origin; CSP connect-src already allows it). */
export const filesEndpointFor = (rfqEndpoint: string) => `${rfqEndpoint.replace(/\/+$/, "")}/files`;

/** GET <filesEndpoint>: whether this environment accepts files. Any failure means "no upload field". */
export async function fetchFilesCapability(filesEndpoint: string, fetchImpl: typeof fetch = fetch): Promise<FilesCapability | null> {
  try {
    const res = await fetchImpl(filesEndpoint, { method: "GET" });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<FilesCapability> & { ok?: boolean };
    if (body.enabled !== true || typeof body.maxFiles !== "number" || typeof body.maxFileBytes !== "number") return null;
    // An older Worker sends no `extract`: nothing is read, the files are only attached (W13.1).
    const extract = { lists: body.extract?.lists === true, pictures: body.extract?.pictures === true };
    return { enabled: true, maxFiles: body.maxFiles, maxFileBytes: body.maxFileBytes, extract };
  } catch {
    return null;
  }
}

export async function uploadRfqFiles(filesEndpoint: string, reference: string, idempotencyKey: string, files: readonly Blob[], deps: UploadDeps = {}): Promise<UploadOutcome[]> {
  const doFetch = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const outcomes: UploadOutcome[] = [];
  for (let i = 0; i < files.length; i++) {
    const url = `${filesEndpoint}/${encodeURIComponent(reference)}/${i + 1}`;
    let outcome: UploadOutcome = "failed";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await doFetch(url, { method: "PUT", headers: { "content-type": "application/octet-stream", [RFQ_KEY_HEADER_NAME]: idempotencyKey }, body: files[i] });
        if (res.ok) outcome = "received";
        else if (res.status < 500 && res.status !== 429) outcome = "rejected";
        if (outcome !== "failed") break;
      } catch {
        // network error: retry once
      }
      if (attempt === 0) await sleep(RETRY_DELAY_MS);
    }
    outcomes.push(outcome);
    deps.onProgress?.(i + 1, files.length);
  }
  return outcomes;
}
