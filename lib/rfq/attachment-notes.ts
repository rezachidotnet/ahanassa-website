/**
 * The file list an RFQ carries to Odoo (D-RFQ-FILE). Odoo's RFQ API v1.1
 * accepts no unknown key (controllers/rfq_api.py `_TOP_KEYS`), so the
 * references travel in the existing top-level `notes` text, after the
 * customer's own message — the same channel the "[website] variant
 * unpublished at receipt" flag already uses. No second channel, no Odoo change.
 *
 * Built only from the frozen rfq_attachments rows (lib/rfq-worker/delivery.ts),
 * so every retry sends byte-identical notes under the same Idempotency-Key.
 * The files themselves stay in the PRIVATE R2 bucket; the line names the
 * object key that staff open with the RFQ Worker's /__admin tool.
 */
export interface AttachmentNoteRow {
  slot: number;
  original_filename: string;
  byte_size: number;
  upload_status: string;
  failure_code: string | null;
  object_key: string;
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

export function buildAttachmentNotes(rows: readonly AttachmentNoteRow[]): string | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => a.slot - b.slot);
  const missing = sorted.filter((r) => r.upload_status !== "uploaded").length;
  const lines = sorted.map((r) => {
    const name = r.original_filename || "file";
    const state = r.upload_status === "uploaded" ? `received — ${r.object_key}` : `FILE NOT RECEIVED (${REASONS[r.failure_code ?? "not_received"] ?? "not received"})`;
    return `${r.slot}. ${name} — ${formatFileSize(r.byte_size)} — ${state}`;
  });
  const head = `[website] Files with this request: ${sorted.length - missing} received${missing ? `, ${missing} NOT RECEIVED` : ""} (private storage; open with the RFQ admin tool, /__admin/attachments):`;
  return [head, ...lines].join("\n");
}

/** The customer's message, then the file list — what the delivery sends as Odoo `notes`. */
export function notesWithAttachments(message: string | null, rows: readonly AttachmentNoteRow[]): string | null {
  const files = buildAttachmentNotes(rows);
  if (!files) return message;
  return message ? `${message}\n\n${files}` : files;
}
