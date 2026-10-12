# RFQ file upload (D-RFQ-FILE, W13.1)

Owner decision 2026-10-12: the RFQ form takes an optional «بارگذاری لیست اقلام» / "Upload your item
list" field in fa/ar/en. No sign-up is needed. Turnstile protects it, and the files go to a **private**
R2 bucket. This supersedes "attachments go via WhatsApp" (D-W103-3, architecture §19 item 5) for any
environment where upload is switched on.

## Switch

Upload is on only when the RFQ Worker has **both** of these:

- the `RFQ_FILES` R2 binding;
- `RFQ_FILES_ENABLED = "1"`.

The `/contact` page asks once, with `GET <rfq-origin>/api/rfqs/files`, and shows the field only when
the answer is `enabled: true`. The prerendered HTML never contains the field, so the staging and
production artifacts stay identical apart from the allowlisted values (r4 target-diff gate). No
`lib/static/targets.ts` value was added.

| Environment | `RFQ_FILES` | `RFQ_FILES_ENABLED` | Result |
|---|---|---|---|
| staging | `ahanassa-v11-rfq-files-staging` (eu) | `1` | on, once the bucket exists |
| production | — (not bound) | `0` | **off**: the field is hidden |

Production stays off on purpose. `PROJECT_OVERRIDES.md` §8 and `01-sources/SECURITY_GUIDELINES.md`
§13 make production uploads wait for a malware-scanning decision (`DOCUMENT_AUDIT_REPORT.md` DAR-065).
To switch production on, the owner:

1. creates the bucket;
2. adds the binding;
3. sets the flag (see `workers/rfq/wrangler.jsonc`).

## Flow

1. **Browser, before submit.** `lib/rfq/attachment-policy.ts` runs the same checks the server will run.
   The form explains each refused file in the visitor's language.
2. **`POST /api/rfqs`** (rfq_submit.v1) declares the files as `attachments: [{name, size}]`, with at most
   5 entries.
   - The Worker checks the declared files before Turnstile (422 `attachments[i].name: [reason]`).
   - It then runs Turnstile, the per-IP rate limit and the rest of the intake as before.
   - It saves the RFQ in one D1 batch, with one `rfq_attachments` row (`pending`) per file.
   - The files are part of the payload fingerprint, so the same key with other files gets 409.
   - The outbox row waits up to **10 minutes** for the files (`ATTACHMENT_WAIT_MS`).
3. **`PUT /api/rfqs/files/<reference>/<slot>`**, one request per file, sent only after step 2 succeeded.
   - **Credential:** the request's own idempotency key in `X-RFQ-Key`. The browser still has it; D1
     holds only its SHA-256. No new secret, and no second Turnstile token per file.
   - **Rate limit:** per client IP, on the same binding with its own key space (`files:<hash>`).
     It fails closed.
   - **Checks:**
     - `Content-Length` must equal the declared size, at most 15 MB.
     - The first 4 KB must carry the extension's magic bytes. Nothing is written before this passes.
     - Office files (xlsx, docx, xls) are scanned chunk by chunk while they stream. The scan refuses
       `vbaProject.bin` and `vbaData.xml` (macros), a zip with no `[Content_Types].xml` (an archive),
       and `_VBA_PROJECT_CUR` in a legacy `.xls`.
     - Executable and archive signatures are refused whatever the extension says: MZ, ELF, Mach-O,
       `#!`, Rar, 7z, gzip, bzip2, xz, zstd, cab and tar.
   - **Storage:** the bytes stream into R2 at `rfq/<reference>/<slot>.<ext>`. A 15 MB file is never
     held whole in Worker memory. Images, PDF and text are piped natively.
   - **Refused or failed file:** the write is aborted and **the key is deleted**. In local workerd
     testing, an aborted stream still left an object behind, so the code deletes the key every time.
   - **Retry:** a file can be sent again (e.g. after a storage error) until the list is frozen.
   - **Release:** when no file is pending any more, the RFQ is released to delivery at once.
4. **After the uploads** the visitor sees only the tracking number (W10.3). A file that did not arrive is
   never reported to the visitor. Staff see it in Odoo instead.

## Allowed files

jpg, jpeg, png, webp, heic, pdf, xlsx, xls, csv, docx, txt. At most 5 files, each at most 15 MB.

| Refusal | When |
|---|---|
| `extension_not_allowed` | anything else (svg, html, doc, …) |
| `macro_file` | xlsm, docm, xlsb, … or a renamed macro workbook/document |
| `executable_or_archive` | exe, zip, rar, 7z, … or such content under an allowed name |
| `content_mismatch` | the magic bytes do not match the extension; binary data in csv/txt |
| `file_too_large` / `empty_file` | over 15 MB / 0 bytes |

The filename is kept for staff only, in D1 and in Odoo `notes`. Before it is stored, the path, control
characters and bidi controls are removed, and it is cut to 120 characters. The filename is never used in
a storage key or in a public response. **No file content is ever rendered back on the site.**

**Known limit:** an Excel 4.0 (XLM) macro sheet inside a legacy `.xls` has no storage of its own, so the
scan does not see it. Staff should open files from customers with macros disabled. A real malware
scanner is the §8 decision.

## Odoo hand-off — the existing channel

Odoo's RFQ API v1.1 rejects unknown keys (`controllers/rfq_api.py` `_TOP_KEYS`). The file references
therefore travel in the existing top-level **`notes`** text, after the customer's message. This is the
channel the "[website] variant unpublished at receipt" flag already uses, so no second channel is
created and Odoo needs no change. Example:

```
<customer message>

[website] Files with this request: 1 received, 1 NOT RECEIVED (private storage; open with the RFQ admin tool, /__admin/attachments):
1. لیست خرید.xlsx — 5 KB — received — rfq/AA-RFQ-PGSXPA7M/1.xlsx
2. photo.png — 2.4 MB — FILE NOT RECEIVED (not received — storage error)
```

On its **first** attempt, the delivery freezes the list:

- it sets `rfqs.attachments_frozen_at`;
- every file still pending becomes `failed` / `not_received`.

Every retry then sends the same notes under the same `Idempotency-Key`, and a late upload gets 409
`UPLOAD_CLOSED`, with its object deleted.

A later Odoo change (contract v1.2) could pull the files into `ir.attachment`. This task does not
include it.

## Staff access

Both admin routes need the bearer `ADMIN_TOKEN`, the same as the §15 tool:

- `GET /__admin/attachments?reference=AA-RFQ-…` lists the files of one RFQ.
- `GET /__admin/attachments/<id>` downloads one file. The response is always
  `application/octet-stream` + `attachment` + `nosniff` + `no-store` + a sandbox CSP. Every download is
  written to `rfq_attachment_access_log`.

The Cloudflare dashboard (R2 → bucket) also works.

## Data and retention

- `migrations/0009_rfq_attachments.sql` adds `rfq_attachments`, following
  `01-sources/DATABASE_SCHEMA.md`. `scan_status` is always `not_configured`.
- The same migration adds `rfqs.attachments_frozen_at` and `rfq_attachment_access_log`.
- The PII retention job clears `original_filename` 30 days after delivery, together with the other
  personal fields.
- **The R2 objects are not deleted by any job**, because Odoo holds only their keys. How long they stay is
  an open owner decision. An R2 lifecycle rule is the simple way.

## Template

`public/downloads/ahanassa-item-list-{fa,en,ar}.xlsx` has these columns:

| Locale | Columns |
|---|---|
| fa | محصول، سایز، ضخامت، گرید / استاندارد، مقدار، واحد |
| en | Product, Size, Thickness, Grade / standard, Quantity, Unit |
| ar | المنتج، المقاس، السماكة، الدرجة / المعيار، الكمية، الوحدة |

- fa and ar sheets are right-to-left. The header row is frozen.
- The Unit column offers the Launch units as a dropdown, and free text is still allowed.
- There are no macros, no formulas and no example data.
- `node scripts/rfq/build-item-list-template.ts` writes the files deterministically. A test fails if a
  committed file differs from the generator output, and checks that the upload policy accepts the
  template when it is sent back.

## Basket (W10.5)

The basket rows and the files go in the same RFQ. Files cannot be kept in `sessionStorage`, and the
security rules forbid keeping them there anyway. «ادامه انتخاب محصول» or a reload drops them, and the
card says so once files are chosen. At least one item row is still required: Odoo requires one, and
`DATABASE_SCHEMA.md` forbids inventing rows from a file.
