# RFQ file upload (D-RFQ-FILE, W13.1; follow-up decisions of 2026-10-13)

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

Production stays off until the owner switches it on. The owner accepted the current upload checks as
the `PROJECT_OVERRIDES.md` §8 control on 2026-10-13 (ClamAV comes with the W14 server;
`DOCUMENT_AUDIT_REPORT.md` DAR-065). To switch production on, the owner:

1. applies migration 0009 to production DB_OPS (needed by the code even with upload off, for RFQs with
   files only — a file-less RFQ never touches the 0009 columns);
2. creates the bucket;
3. adds the binding;
4. sets the flag (see `workers/rfq/wrangler.jsonc`).

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
   - **Storage:** the bytes stream into R2 at `rfq-files/<reference>/<slot>.<ext>` (the prefix Odoo
     contract v1.2 accepts). A 15 MB file is never held whole in Worker memory. Every chunk is hashed on
     the way; the SHA-256 of the stored bytes is recorded (`checksum_sha256`) and sent to Odoo.
   - **Refused or failed file:** the write is aborted and **the key is deleted**. In local workerd
     testing, an aborted stream still left an object behind, so the code deletes the key every time.
   - **Retry:** a file can be sent again (e.g. after a storage error) until the list is frozen.
   - **Release:** when no file is pending any more, the RFQ is released to delivery at once.
4. **After the uploads** the visitor sees only the tracking number (W10.3). A file that did not arrive is
   never reported to the visitor. Staff see it in Odoo instead.

## Allowed files

jpg, jpeg, png, webp, heic, pdf, xlsx, xls, csv, docx, txt. At most 5 files, each at most 15 MB.

**HEIC** (D-RFQ-FILE-6): the file input's `accept` list (`RFQ_FILE_ACCEPT`) names JPEG, PNG and WebP
but not HEIC. iPhone Safari then converts a photo from the library to JPEG before the upload. A HEIC
file that still arrives (for example picked from Files) is accepted; Odoo cannot decode it and marks it
"manual reading needed".

| Refusal | When |
|---|---|
| `extension_not_allowed` | anything else (svg, html, doc, …) |
| `macro_file` | xlsm, docm, xlsb, … or a renamed macro workbook/document |
| `executable_or_archive` | exe, zip, rar, 7z, … or such content under an allowed name |
| `content_mismatch` | the magic bytes do not match the extension; binary data in csv/txt |
| `file_too_large` / `empty_file` | over 15 MB / 0 bytes |

The filename is kept for staff only, in D1 and in Odoo (the v1.2 `filename`, or `notes`). Before it is stored, the path, control
characters and bidi controls are removed, and it is cut to 120 characters. The filename is never used in
a storage key or in a public response. **No file content is ever rendered back on the site.**

**Known limit:** an Excel 4.0 (XLM) macro sheet inside a legacy `.xls` has no storage of its own, so the
scan does not see it. Staff should open files from customers with macros disabled. These checks are the
accepted §8 control until a real scanner (ClamAV, W14) is added.

## Odoo hand-off — contract v1.2, `notes` as the fallback

Owner decision 2026-10-13 (D-RFQ-FILE-2). Odoo's contract v1.2
(`docs/contracts/RFQ_API_CONTRACT_V1_2_ATTACHMENTS.md` in ahanassa-odoo, module
`ahanassa_rfq_file_intake`) adds an optional top-level `attachments` key to `POST /api/v1/rfq`:

```json
"attachments": [
  { "key": "rfq-files/AA-RFQ-PGSXPA7M/1.xlsx", "filename": "لیست خرید.xlsx", "size": 5120,
    "sha256": "<64 hex, of the stored bytes>", "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
]
```

- Every **received** file is sent this way. Odoo records it with the RFQ and its cron downloads it from
  the private bucket (read-only token), checks size and SHA-256, and reads it into draft lines.
- A file that did **not** arrive is not in `attachments`; the `notes` name it instead
  (`[website] Files with this request: 1 attached as customer files, 1 NOT RECEIVED: …`).
- The filename is the sanitized one, or `<slot>.<ext>` once the PII purge cleared it.

**Fallback.** An Odoo without the module answers `400 invalid_payload` "payload contains unsupported
fields" and stores nothing. The delivery then re-sends, in the same attempt and under the same
`Idempotency-Key`, the old payload with the whole list in `notes`:

```
<customer message>

[website] Files with this request: 1 received, 1 NOT RECEIVED (private storage; open with the RFQ admin tool, /__admin/attachments):
1. لیست خرید.xlsx — 5 KB — received — rfq-files/AA-RFQ-PGSXPA7M/1.xlsx
2. photo.png — 2.4 MB — FILE NOT RECEIVED (not received — storage error)
```

So the website works before and after the Odoo deploy. Any other answer (another 400, 5xx, timeout)
is handled as before.

**Same payload on every retry.**

- The first attempt freezes the list: it sets `rfqs.attachments_frozen_at`, and every file still
  pending becomes `failed` / `not_received`. A late upload gets 409 `UPLOAD_CLOSED`, with its object
  deleted.
- `rfqs.attachments_channel` keeps the channel (`odoo_v12` or `notes`) once Odoo accepted it, or once
  the fallback was taken. A retry never switches channel, so Odoo sees the same payload and answers
  200 replay instead of 409.

**File-only RFQ** (D-RFQ-FILE-5). Odoo requires at least one item line. When the customer sent files
and no rows, the delivery sends one clearly marked placeholder line: «[website] Items are in the
attached file(s) — the customer sent no item rows», 1 ton, with item notes saying that quantity and
unit are not the customer's. Nothing is read from the file to build it.

**Staging.** The staging Odoo stub (`workers/odoo-stub`) answers like an Odoo without v1.2 by default,
so staging exercises the fallback. Set the stub var `STUB_CONTRACT = "1.2"` to test the v1.2 path.

## Staff access

Both admin routes need the bearer `ADMIN_TOKEN`, the same as the §15 tool:

- `GET /__admin/attachments?reference=AA-RFQ-…` lists the files of one RFQ.
- `GET /__admin/attachments/<id>` downloads one file. The response is always
  `application/octet-stream` + `attachment` + `nosniff` + `no-store` + a sandbox CSP. Every download is
  written to `rfq_attachment_access_log`.
- The list shows the checksum, the Odoo confirmation, the retention date and `deleted_at`. A file
  past its retention answers **410** (open it in Odoo); the attempt is logged as `deleted`.

The Cloudflare dashboard (R2 → bucket) also works.

## Data and retention

- `migrations/0009_rfq_attachments.sql` adds `rfq_attachments`, following
  `01-sources/DATABASE_SCHEMA.md`. `scan_status` is always `not_configured`.
- The same migration adds `rfqs.attachments_frozen_at` and `rfq_attachment_access_log`.
- The PII retention job clears `original_filename` 30 days after delivery, together with the other
  personal fields.
- The same migration adds `rfqs.attachments_channel` and, on `rfq_attachments`, `checksum_sha256`
  (filled on upload), `odoo_confirmed_at`, `retention_until` and `deleted_at`.
- **R2 retention** (D-RFQ-FILE-4): `retention_until` is set at intake to **90 days**, and to **30 days
  after** `odoo_confirmed_at` when Odoo accepts the RFQ with the file as a v1.2 attachment (that 2xx is
  the confirmation the website receives; Odoo's cron downloads the file within minutes). The RFQ
  Worker's existing `*/5` cron deletes due objects, 20 per run (`lib/rfq-worker/file-retention.ts`), and
  sets `deleted_at`. The row and its `upload_status` stay, so the list sent to Odoo never changes. A
  file sent in `notes` (fallback) is never "confirmed", so it stays 90 days.

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
card says so once files are chosen.

**File-only RFQ** (D-RFQ-FILE-5): with at least one file accepted by the form, no item row is needed.
Untouched rows are not sent; a row the customer started must still be complete. On the wire,
`items: []` is valid only with a non-empty `attachments` (`hasRowsOrFiles`); the RFQ is saved with
`submission_method = 'attachment'` and `item_count = 0`. No row is invented from the file. Odoo gets
the marked placeholder line described above.
