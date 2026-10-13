/**
 * rfq_intake v1.2 — the additive `attachments` key on Odoo `POST /api/v1/rfq`
 * (owner decision 2026-10-13, W13.1 follow-up). Mirror of the Odoo-owned
 * contract `docs/contracts/RFQ_API_CONTRACT_V1_2_ATTACHMENTS.md`
 * (ahanassa-odoo PR #10, commit 605c14b, module ahanassa_rfq_file_intake).
 * Odoo is the authority; everything else in the request is v1.1
 * (lib/contracts/rfq-intake-v1-1.ts).
 *
 * The website sends only files that passed its upload checks and are stored
 * in its PRIVATE R2 bucket; Odoo downloads them later with a read-only token
 * and checks size and SHA-256.
 *
 * Zod-free (the production RFQ Worker bundle carries no zod); the schema used
 * by tests and the staging stub is lib/contracts/rfq-intake-v1-2-schema.ts.
 */

export const RFQ_INTAKE_V12_MAX_ATTACHMENTS = 10;
export const RFQ_INTAKE_V12_MAX_FILE_BYTES = 20 * 1024 * 1024;
/** Odoo `models/r2.py` KEY_PATTERN (plus: no `..`, no `//`). */
export const RFQ_INTAKE_V12_KEY_PATTERN = /^rfq-files\/[A-Za-z0-9][A-Za-z0-9._\-/]{0,400}$/;
/** Odoo `lib/readers.py` `_EXTENSIONS`. */
export const RFQ_INTAKE_V12_EXTENSIONS = ["xlsx", "xlsm", "xls", "csv", "docx", "txt", "pdf", "jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "bmp", "tif", "tiff"] as const;

export interface RfqIntakeAttachment {
  key: string;
  filename: string;
  size: number;
  sha256: string;
  content_type?: string | null;
}

/**
 * What an Odoo WITHOUT ahanassa_rfq_file_intake answers to a payload with
 * `attachments`: `400 invalid_payload` with exactly this message
 * (ahanassa_marketplace `controllers/rfq_api.py` `_validate`, `_TOP_KEYS`).
 * Nothing is stored in that case, so the same Idempotency-Key is still free.
 */
export const V11_UNSUPPORTED_FIELDS_MESSAGE = "payload contains unsupported fields";

/** True when Odoo answered that it does not know contract v1.2 (see V11_UNSUPPORTED_FIELDS_MESSAGE). */
export function isV12UnsupportedAnswer(status: number, body: unknown): boolean {
  if (status !== 400 || typeof body !== "object" || body === null) return false;
  const error = (body as { error?: { code?: unknown; message?: unknown } }).error;
  return error?.code === "invalid_payload" && error.message === V11_UNSUPPORTED_FIELDS_MESSAGE;
}
