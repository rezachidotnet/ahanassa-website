# RFQ instant item extraction (W13.3, D-RFQ-EXTRACT)

Owner request 2026-10-13. When a customer attaches a list — a photo, a PDF, an Excel or CSV file — the RFQ
form fills its item rows within seconds. The customer reviews, edits and submits. **The original file is
still uploaded** with the RFQ (W13.1, private R2) and reaches Odoo through the v1.2 `attachments` field, so
staff can compare the picture with the list.

Builds on `docs/RFQ_FILE_UPLOAD.md`. Production stays **off** until the owner switches it on (below).

## Where each file is read

| File | Read by | Sent anywhere for reading? |
|---|---|---|
| xlsx, csv, txt | the visitor's browser (`lib/rfq/extract/readers.ts`, `lines.ts`) | no |
| jpg, png, webp (and HEIC where the browser can decode it) | Workers AI vision model, via `POST /api/rfqs/extract` | a shrunk, grey copy (≤ 1600 px) |
| pdf | the RFQ Worker: text layer (Workers AI Markdown conversion), else the page pictures of a scan → vision model | the PDF as it is |
| xls, docx | not read — attached only; Odoo reads them | no |

Matching to the catalog always runs in the browser, against the same `/data/rfq-catalog.<locale>.json`
the product picker uses, so a matched row is always a variant the visitor can see and the Worker accepts.

## Design decisions (for the owner's review)

1. **No file is stored by the reading call, and the W13.1 upload is not reused.** The W13.1 upload only
   exists *after* the RFQ is submitted (its credential is the RFQ's idempotency key, its key is the
   tracking number). Reading has to happen *before* submit, so `POST /api/rfqs/extract` is a separate,
   stateless call: the bytes live in that request only (no D1, no R2, no Queue — a test proves the endpoint
   never touches them). The file itself is uploaded once, unchanged, at submit, exactly as in W13.1.
2. **Typed lists are read in the browser.** The file is already in memory there; nothing is uploaded twice,
   no Worker CPU is used (the account is on Workers Free: 10 ms CPU per request), and it works within half a
   second.
3. **The Worker returns a picture's transcript; the browser parses it.** The deterministic parser (header
   guessing in fa/ar/en, Persian/Arabic digits, units, price columns ignored) compiles about a hundred
   regular expressions — 4–11 ms cold in V8, too close to the 10 ms limit. The Worker only checks, with one
   cheap regular expression, whether the text looks like a list (table rows, or a number followed by a unit
   word). If it does, it returns the cleaned transcript and the browser parses it with the same code it uses
   for spreadsheets. If it does not (prose such as «بیست تن میلگرد شانزده»), the Worker calls the text model
   with the strict JSON schema and validates the answer server-side.
4. **The text model is a fallback, not a second step on every picture.** Measured below: the text models
   add 8–16 s, and the 70B model rewrote `raw_text` («میلقرد», «A̳»). The vision model already writes the
   rows with ` | ` between cells, which the parser reads in no extra time and without changing a word.
5. **Every row read from a picture says «لطفاً بررسی کنید».** The vision models measured here misread
   Persian digits (the zero is a dot: «۴۰» → «۴», «۳۵۰۰» → «۲۵۰۰», «۱۴» → «۱۲»). Rows from spreadsheets and
   typed text are flagged only when something is actually uncertain.
6. **Workers AI** (Cloudflare, the account that runs the website) is the same provider the Odoo W13.2 intake
   already uses for the same files, with the same vision model and the same prompts.

## The endpoint

`POST <rfq-origin>/api/rfqs/extract` — body: the file bytes; headers `X-File-Ext` (jpg/jpeg/png/webp/pdf)
and `X-Turnstile-Token`. Checks, cheapest first; nothing reaches Workers AI before all of them pass:

| Check | Refusal |
|---|---|
| method; switch (`RFQ_EXTRACT_ENABLED=1`, `AI` binding, file upload on) | 405; 404 `EXTRACT_DISABLED` |
| exact CORS origin | 403 |
| extension allowed; `Content-Length` present, ≤ 15 MB, > 0 | 415 / 411 / 413 / 422 |
| per-IP rate limit, own binding `RFQ_EXTRACT_RATE_LIMITER` (6 / 60 s), fail-closed | 429 / 503 |
| Turnstile: action **`rfq_extract`**, our hostname (a submit token is refused) | 403 / 503 |
| body length = `Content-Length`; magic bytes = extension; executables/archives refused (W13.1's `checkFileHead`) | 422 |
| reading within 25 s | 504 `EXTRACT_TIMEOUT` |
| model error / invalid JSON / unreadable PDF / empty | 502 `EXTRACT_FAILED` + reason |

Answer: `{ ok, source: "image" | "pdf_text", transcript }` (a list's text, control characters removed,
≤ 20 000 characters) or `{ ok, source, lines }` (the text model's lines, validated:
`lib/rfq/extract/ai-answer.ts` — exactly `{"lines": [...]}` with the known keys and types, every text capped
and price-stripped; anything else is refused whole, never repaired). The browser checks the answer again
(`parseExtractedLines`, length caps) before anything reaches the form. Logs carry sizes, timings, counts
and the model-call count — never content.

**Turnstile.** The form renders a second, invisible widget (same site key, action `rfq_extract`,
`execution: "execute"`, `appearance: "interaction-only"`); it shows a challenge only if Cloudflare asks
for one. A fresh token is taken for each reading, so the submit widget's token is never spent. No new
widget or dashboard change is needed: the action is free-form. The staging-only Turnstile test path
(`TURNSTILE_TEST_MODE=1`, measurement windows) covers this endpoint too.

**Models** (vars `EXTRACT_VISION_MODEL`, `EXTRACT_TEXT_MODEL` override them): vision
`@cf/meta/llama-4-scout-17b-16e-instruct` (as Odoo W13.2); text fallback
`@cf/mistralai/mistral-small-3.1-24b-instruct` (Odoo uses Llama 3.3 70B; Mistral was faster, cheaper and
kept the customer's words — measurements below).

## From lines to rows

`lib/rfq/extract/match.ts` (ideas from the Odoo W13.2 matcher and the price collector):

1. **Family** from the customer's words, with letters unified (ی/ي, ک/ك, آ/ا, ZWNJ, no spaces) and one-letter
   slips tolerated in longer words («مبلگرد»). fa/ar/en words for rebar, beams, channels, angles, hollow
   sections, sheet/plate and pipe.
2. **Grade/type** narrows the products: A1/A2/A3/A4 ↔ S240/Aj340/Aj400/Aj500, ST37 ↔ S235, ST52 ↔ S355,
   IPE vs IPN, UPE vs UPN — by the template slug, so it works in every locale.
3. **Sizes that exist:** every stated size must be one of a variant's own sizes (small tolerance). «تیرآهن ۱۸»
   is 180 mm; «۸×۸۰×۸۰» is 80×80×8; pipe «۴ اینچ», «2"», «DN100» become outside diameters.
4. Steel the catalog does not carry (galvanised, stainless, cold-rolled, HEA/HEB, welded pipe, …) is
   **not in catalog**, never a near miss.

| Result | Row |
|---|---|
| one variant | catalog row, variant selected |
| several (grade/type not stated, width open) or no size | catalog row with category (and product, when only one fits); «لطفاً بررسی کنید». Picking the product then selects the size that was read. |
| not in catalog | free-text row (product + size as read). Nothing read is dropped. |

The quantity is filled only with a unit the row may offer (Launch UoM policy): «۱۲۰ شاخه» on a beam or a
free-text row is never turned into 120 kg — the quantity is left empty, the row is flagged, and it is filled
in automatically if the visitor picks a product that offers that unit. At most 20 rows; the rest is counted
in the message (the whole file is still sent).

## Form (fa/ar/en, mobile first)

- On attach: «در حال خواندن لیست شما… (معمولاً ۵ تا ۱۵ ثانیه)» next to the file (`aria-live`).
- Then: «N ردیف از این فایل در فرم نوشته شد…» with how many are flagged, and «حذف ردیف‌های این فایل».
- Each row from a file: «از فایل شما», the customer's own text («در فایل شما: …», plain text), and when
  unsure «لطفاً بررسی کنید» with what to check (product/size, missing quantity, unit not offered, numbers read
  from a picture). Flagged rows have a warning background.
- Failure or timeout: the message says the file stays attached and is sent with the request; «خواندن دوباره»
  retries. **Submit is never blocked by reading**; a reading that finishes after submit changes nothing.
- Removing a file keeps its rows (the visitor may have worked on them) but they no longer claim a file.

## Provenance to Odoo (no contract change)

For a row from a still-attached file, the existing item `description` (Odoo's `notes`) follows the note
contract of Odoo PR #10 (`ahanassa_rfq_file_intake` `models/customer_lines.py`, contract v1.2 "Rows
pre-filled from the customer's file"):

    از فایل: <the customer's text> — فایل «<file name>» — ویرایش‌شده توسط مشتری | <customer's own note>

- it **starts with «از فایل:»** (colon right after فایل), so Odoo shows the badge «از فایل مشتری»;
- «— ویرایش‌شده توسط مشتری» only when the visitor changed product, size, quantity or unit;
- the file name is the one Odoo stores for the attachment (`sanitizeFilename`), so Odoo compares the row only
  with that file;
- « | <own note>» only when the customer wrote one;
- ≤ 1000 characters: the file text and the own note are shortened, never the prefix, file name or edited mark.

A hand-typed row's note never starts with «از فایل:»: if the customer typed that themselves, «یادداشت: » is put
in front. `composeItemNote`; the format is pinned by a test in `lib/rfq/extract-match.test.ts`. Always Persian,
for staff. The file goes as before through the v1.2 `attachments`.

## No prices

Price columns («قیمت», «مبلغ», «فی», price, السعر, …) are never read; price phrases and currency amounts are
removed from every text (`stripPrices`); the AI schema has no price field and an answer with one is refused.
No price-source names (the gate's source-name scan ran clean on both artifacts).

## Analytics

`file_upload` {file_count, file_type} when a file passes the checks; `rfq_extract` {extract_result
(ok/empty/unsupported/unreadable/timeout/rate_limited/verification/unavailable/failed), row_count,
review_count, file_type, extract_seconds} when a reading ends. Allowlisted keys and short tokens only —
never a name or anything read (`lib/rfq/extract/analytics.ts`). **When PR #47 (W16.4) is merged:** replace
these calls with its `trackEvent`, add `rfq_extract` to `ANALYTICS_EVENTS`, and keep one `file_upload` call
(both PRs fire it at the same place in `addFiles`).

## Switch

| Environment | `AI` | `RFQ_EXTRACT_RATE_LIMITER` | `RFQ_EXTRACT_ENABLED` | Result |
|---|---|---|---|---|
| staging | bound | namespace 1104, 6 / 60 s | `1` | on (with W13.1 upload on) |
| production | — | — | `0` | **off** |

`GET /api/rfqs/files` now also answers `extract: {lists, pictures}`; an older Worker that does not send it
means "attach only". To switch production on (owner), after W13.1's own steps (0009, bucket, binding,
`RFQ_FILES_ENABLED=1`): add `"ai": { "binding": "AI" }`, add the ratelimit
`{ "name": "RFQ_EXTRACT_RATE_LIMITER", "namespace_id": "1105", "simple": { "limit": 6, "period": 60 } }`, set
`RFQ_EXTRACT_ENABLED` to `"1"`. **No new secret.** Ratelimit namespaces need no dashboard step.

## Measurements (2026-10-13/14)

Local `wrangler dev` of the RFQ Worker with the real Workers AI binding (remote), invented fixtures
(`scripts/rfq/build-extract-fixtures.ts`: a tilted phone photo of a printed table, a handwriting-*style*
list in a Nastaliq font, a scanned one-page PDF, a typed PDF, a typed Excel). Real handwriting reads worse
than the handwriting-style fixture.

**Latency** (Worker time; browser end-to-end adds the upload):

| File | Path | Time |
|---|---|---|
| typed Excel / CSV | browser | ~0.5 s end-to-end |
| typed PDF (text layer) | toMarkdown → transcript | 0.6–1.7 s (browser 1.7–4 s) |
| phone photo (shrunk + grey, 67 KB) | Scout → transcript | 5.2–8.0 s |
| handwriting-style photo | Scout → transcript | 2.8–5.6 s |
| scanned PDF (1 page) | toMarkdown, page JPEG → Scout | 6.8–7.5 s |
| prose (no list) | + text model | + 7.6 s (Mistral Small 3.1) |

Text models on the same transcript: Llama 3.3 70B fp8-fast 11.6 s (rewrote raw text), Qwen3-30B 16.4 s,
Llama 3.1 8B fast 3.4 s (sizes wrong), Mistral Small 3.1 10.4 s / 7.6 s (good), gpt-oss-20b and
GLM-4.7-flash returned no valid JSON. Vision models: Scout 4.5–11 s; Mistral Small 3.1 7–9 s (worse digits,
columns reversed); Gemma 4 26B 47 s with an empty answer; GLM-5.3-flash is not available on Workers Free.

**Accuracy** (Scout): on the phone photo 3 of 5 rows exactly right after the browser's grey/contrast step
(without it, Persian zeros were dropped: «۱۸۰» → «۱۸», «۶۰۰۰×۱۵۰۰×۱۰» garbled); the remaining errors were
digits («۳۵۰۰» → «۲۵۰۰», «۴۰» sometimes «۴»). Handwriting-style: «۱۴» → «۱۲», «۴ اینچ» → «۲ اینچ», one
quantity misplaced. Scanned page without the grey step: zeros read as dots («۲۰» → «۲.۰»). Hence decision 5.

**Worker CPU** (V8, Node 24, cold process): a picture request's own work — head check, base64 of the 67 KB
picture, request JSON, the list test, cleaning, response JSON — **≈ 0.5 ms**; a 2 MB picture ≈ 4 ms
(the browser sends ≤ 1600 px, typically 50–300 KB); scanning a 15 MB PDF for page pictures 1.8 ms; the
text-model answer's validation ≈ 1 ms. AI calls are I/O and do not count. The parser in the browser:
≈ 6 ms cold, 0.2 ms per list warm.

**Cost**: Scout ≈ 69–71 neurons per picture (≈ 2 500 prompt tokens); the text fallback 13–25 (Mistral).
The Workers Free allocation (10 000 neurons/day) covers roughly 140 picture readings a day; past it the
model calls fail and the form shows the "could not read — file attached" message.

**Bundle**: production RFQ Worker 289 → ~308 KiB raw (wrangler: 327 KiB / gzip 76 KiB); the bundle-scan
budget moved from 300 to 330 KiB (it guards against zod and test code, which are still absent).

## Limits

- Digits in pictures need the visitor's check (above). xls/docx are not read here (Odoo reads them).
- A Persian *typed* PDF whose text layer is in visual (reversed) order reads poorly; the file is attached.
- HEIC is read only where the browser can decode it (Safari); elsewhere the file is attached only.
- At most 20 rows; one file is read at a time, in the order attached.
- Rows restored from the session basket after a reload no longer carry «از فایل» (files are not kept either).

## Code and tests

`lib/rfq/extract/*` (normalize, units, lines, readers, ai-answer, match, to-rows, enhance, browser,
analytics, test-fixtures), `lib/rfq-worker/extract.ts`, `components/contact/use-rfq-list-extraction.ts`,
`rfq-files-field.tsx`, `rfq-item-row.tsx`, `enquiry-form.tsx`. Tests: `lib/rfq/extract-parsing.test.ts`,
`lib/rfq/extract-match.test.ts`, `lib/rfq-worker/extract.test.ts` (Turnstile/rate-limit failures, AI
timeout / error / invalid JSON, PDF paths, nothing stored, matching edge cases, recorded real transcripts
of the photo fixtures). Typed fixtures are built in memory (`test-fixtures.ts`); the pictures are rendered
by `scripts/rfq/build-extract-fixtures.ts` and not committed (binary files outside the approved asset
directories make a release AMBIGUOUS).
