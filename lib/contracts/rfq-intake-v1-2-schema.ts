import { z } from "zod";
import { RFQ_INTAKE_V12_EXTENSIONS, RFQ_INTAKE_V12_KEY_PATTERN, RFQ_INTAKE_V12_MAX_ATTACHMENTS, RFQ_INTAKE_V12_MAX_FILE_BYTES } from "./rfq-intake-v1-2.ts";

/**
 * Zod mirror of Odoo's v1.2 `attachments` validation (ahanassa_rfq_file_intake
 * `controllers/rfq_api.py` `validate_attachments`). Used by tests and the
 * staging Odoo stub only — never by the production RFQ Worker bundle.
 */
const odooExtension = (filename: string) => /\.([A-Za-z0-9]{1,5})$/.exec(filename)?.[1].toLowerCase() ?? "";

export const rfqIntakeAttachment = z
  .object({
    key: z.string().regex(RFQ_INTAKE_V12_KEY_PATTERN).refine((k) => !k.includes("..") && !k.includes("//"), "key must not contain .. or //"),
    filename: z
      .string()
      .max(255)
      .refine((f) => f.trim().length > 0, "filename is required")
      // eslint-disable-next-line no-control-regex
      .refine((f) => !/[/\\\x00-\x1f]/.test(f), "filename must not contain / \\ or control characters")
      .refine((f) => (RFQ_INTAKE_V12_EXTENSIONS as readonly string[]).includes(odooExtension(f)), "file type is not accepted"),
    size: z.number().int().positive().max(RFQ_INTAKE_V12_MAX_FILE_BYTES),
    sha256: z.string().regex(/^[0-9a-fA-F]{64}$/),
    content_type: z.string().max(128).nullable().optional(),
  })
  .strict();

export const rfqIntakeAttachments = z
  .array(rfqIntakeAttachment)
  .max(RFQ_INTAKE_V12_MAX_ATTACHMENTS)
  .refine((list) => new Set(list.map((a) => a.key)).size === list.length, "attachment keys must be unique");
