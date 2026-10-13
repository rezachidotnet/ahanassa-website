/**
 * The file list an RFQ carries to Odoo (D-RFQ-FILE; owner decision
 * 2026-10-13: contract v1.2 first, `notes` only as the fallback).
 *
 *  - channel `odoo_v12`: the received files go in the v1.2 `attachments` key
 *    (`buildV12Attachments`); Odoo downloads them from the PRIVATE R2 bucket.
 *    `notes` then names only the files that did NOT arrive, so staff know.
 *  - channel `notes`: Odoo answered that it does not support v1.2 (its v1.1
 *    `_TOP_KEYS` rejects the key), so the whole list travels in the top-level
 *    `notes` text after the customer's message — the channel the "[website]
 *    variant unpublished at receipt" flag already uses. Staff open the files
 *    with the RFQ Worker's /__admin tool.
 *
 * Built only from the frozen rfq_attachments rows (lib/rfq-worker/delivery.ts),
 * so every retry on the same channel sends a byte-identical payload under the
 * same Idempotency-Key.
 */
import type { RfqIntakeAttachment } from "../contracts/rfq-intake-v1-2.ts";

export type AttachmentChannel = "odoo_v12" | "notes";

export interface AttachmentNoteRow {
  slot: number;
  original_filename: string;
  byte_size: number;
  upload_status: string;
  failure_code: string | null;
  object_key: string;
  extension: string;
  mime_declared: string;
  checksum_sha256: string | null;
}

const REASONS: Record<string, string> = {
  not_received: "not received",
  storage_error: "not received — storage error",
  empty_file: "not received — empty file",
  file_too_large: "not received — file too large",
  extension_not_allowed: "not received — file type not allowed",
  macro_file: "not received — macro file refused",
  executable_or_archive: "not received — executable or archive refused",
  content_mismatch: "not received — content does not match the file type",
};

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** A row Odoo can take as a v1.2 attachment: stored, with its checksum. */
const sendable = (r: AttachmentNoteRow) => r.upload_status === "uploaded" && typeof r.checksum_sha256 === "string" && /^[0-9a-f]{64}$/.test(r.checksum_sha256);

/** The customer's filename (already sanitized at intake), or `<slot>.<ext>` once the PII purge cleared it. */
const displayName = (r: AttachmentNoteRow) => r.original_filename || `${r.slot}.${r.extension}`;

/** The v1.2 `attachments` list: every received file, in slot order. */
export function buildV12Attachments(rows: readonly AttachmentNoteRow[]): RfqIntakeAttachment[] {
  return [...rows]
    .sort((a, b) => a.slot - b.slot)
    .filter(sendable)
    .map((r) => ({ key: r.object_key, filename: displayName(r), size: r.byte_size, sha256: r.checksum_sha256 as string, content_type: r.mime_declared }));
}

/** Channel for a first attempt: v1.2 when at least one file can be sent that way. */
export const preferredChannel = (rows: readonly AttachmentNoteRow[]): AttachmentChannel => (rows.some(sendable) ? "odoo_v12" : "notes");

export function buildAttachmentNotes(rows: readonly AttachmentNoteRow[], channel: AttachmentChannel = "notes"): string | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => a.slot - b.slot);
  const missing = sorted.filter((r) => r.upload_status !== "uploaded");
  const reason = (r: AttachmentNoteRow) => `FILE NOT RECEIVED (${REASONS[r.failure_code ?? "not_received"] ?? "not received"})`;
  if (channel === "odoo_v12") {
    if (!missing.length) return null;
    const sent = sorted.length - missing.length;
    const head = `[website] Files with this request: ${sent} attached as customer files, ${missing.length} NOT RECEIVED:`;
    return [head, ...missing.map((r) => `${r.slot}. ${displayName(r)} — ${formatFileSize(r.byte_size)} — ${reason(r)}`)].join("\n");
  }
  const lines = sorted.map((r) => `${r.slot}. ${displayName(r)} — ${formatFileSize(r.byte_size)} — ${r.upload_status === "uploaded" ? `received — ${r.object_key}` : reason(r)}`);
  const head = `[website] Files with this request: ${sorted.length - missing.length} received${missing.length ? `, ${missing.length} NOT RECEIVED` : ""} (private storage; open with the RFQ admin tool, /__admin/attachments):`;
  return [head, ...lines].join("\n");
}

/** The customer's message, then the file list — what the delivery sends as Odoo `notes`. */
export function notesWithAttachments(message: string | null, rows: readonly AttachmentNoteRow[], channel: AttachmentChannel = "notes"): string | null {
  const files = buildAttachmentNotes(rows, channel);
  if (!files) return message;
  return message ? `${message}\n\n${files}` : files;
}

/**
 * File-only RFQ (owner decision 2026-10-13): Odoo requires at least one item
 * line, so the delivery sends this one, clearly marked, when the customer sent
 * files and no item rows. Its quantity/unit are NOT the customer's (Odoo needs
 * a positive quantity and a v1.1 unit); the item notes say so. Nothing is read
 * from the file to build it.
 */
export const FILE_ONLY_PLACEHOLDER = {
  title: "[website] Items are in the attached file(s) — the customer sent no item rows",
  quantity: 1,
  uom: "ton",
  notes: "[website] placeholder line: quantity and unit are not the customer's; read the attached file(s)",
} as const;
