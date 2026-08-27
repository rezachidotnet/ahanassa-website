# 02 — RFQ Conversion UX

> Ahan Asa | آهن آسا — v0 canonical package
> Consolidated from: `CTA_STRATEGY.md`, `FORM_ARCHITECTURE.md` (user-facing UX portions), `COPY_GUIDELINES.md` (§15–18 conversion/form copy), `ANALYTICS_TRACKING.md` (§8.3 RFQ funnel) — reconciled against `PROJECT_OVERRIDES.md` and `CLAUDE.md`.
> Backend data model, D1 persistence, outbox pattern, Odoo sync, and attachment storage: `06_PRODUCTS_CMS_ODOO_RFQ.md`. Visual component tokens (buttons, forms, motion): `01_UX_UI_DESIGN.md`.

---

## 1. Conversion model

### 1.1 Primary conversion

The website's single dominant conversion is:

> **ارسال لیست خرید** — send a purchase list (invoice, BOM, material list, or written procurement requirement) and begin a managed procurement review.

This is the short canonical form used consistently across this v0 package. It denotes the same concept the source documents express more fully as **«ارسال فاکتور یا لیست خرید»** (send an invoice or purchase list) — the underlying accepted starting points are unchanged (see §4.1): an existing supplier invoice, a material/purchase list, a bill of quantities, a written requirement, or a request for procurement consultation. Use **«ارسال لیست خرید»** as the default visible label; a longer contextual variant may be used only where it more accurately names the destination (§3).

This is **not** "buy now." The CTA does not promise the lowest price, immediate supply, a guaranteed savings, or an instant quotation — it promises a professional first review and a clear next step. Submission never implies: a purchase order has been created, a price is final, stock has been reserved, supply/delivery is guaranteed, a contract has been formed, or payment is due.

**Canonical reassurance near meaningful high-commitment conversion moments:** «ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.» This is reassurance copy, not a legal or commercial promise.

### 1.2 Conversion journey

```text
Visitor submits invoice, material list, or written requirement
    ↓
Ahan Asa reviews the submission
    ↓
Missing/ambiguous requirements are clarified
    ↓
Sourcing and purchasing options are evaluated
    ↓
A proposal / next-step recommendation is presented
    ↓
Client confirms the intended purchase path
    ↓
Supply and delivery coordination proceed within the agreed scope
```

### 1.3 CTA principles

- **One dominant action per viewport/section.** Secondary actions may exist but must never visually compete with the primary CTA.
- **Intent before promotion.** Labels describe the next action ("ارسال لیست خرید", "آشنایی با فرآیند خرید", "پیگیری درخواست") — never vague or pressuring language ("شروع کنید", "همین حالا اقدام کنید", "فرصت را از دست ندهید", "ارزان‌ترین قیمت را بگیرید").
- **Low-pressure confidence.** No artificial urgency, countdowns, scarcity, fear-based pressure, or repeated promotional overlays.
- **Explain the next step.** Every high-commitment CTA is paired with short copy stating what to send, what Ahan Asa will do, what to expect next, and whether the action creates any obligation (it does not).
- **Progressive commitment by visitor state** — see §2.
- **No dead-end CTA.** Every CTA leads to a real, implemented, accessible destination. Placeholder buttons, non-functional upload areas, fake chat, fake tracking, and simulated submission success are prohibited.
- **Proof before pressure.** CTA prominence never substitutes for missing evidence; trust is built through process clarity elsewhere on the page (see `01_UX_UI_DESIGN.md` §9, `EvidenceCard`/`TrustEvidenceSection`).

---

## 2. CTA hierarchy and selection by visitor intent

| Level | Approved label | Typical destination | Weight |
|---|---|---|---|
| Primary | `ارسال لیست خرید` | Canonical RFQ route | Highest |
| Secondary | `آشنایی با فرآیند خرید` | Process page/section | Medium |
| Contextual | `ارسال درخواست خرید [این گروه/محصول]` | RFQ route with editable pre-filled context | Medium |
| Consultation | `درخواست مشاوره خرید` | RFQ route with consultation intent (no file required) | Medium/low |
| Support | `تماس با ما` | Contact page | Low |
| Utility | `پیگیری درخواست` | Verified tracking/follow-up flow — only if such a flow actually exists | Low, persistent where appropriate |
| Form submit | `ارسال برای بررسی` | Form submission action | Highest, within the form |

**Selection logic (in order):** if inside the form, its next valid step is primary → if already submitted, tracking/confirmation is primary → if the page carries high procurement intent, use the global primary CTA → if the page represents a defined category/service, use a contextual CTA to the canonical RFQ route → if the visitor needs understanding before committing, prioritize the process/guidance action → otherwise, Contact is a support action only, never the acquisition path.

**Priority rule:** the primary CTA remains the most visible acquisition action site-wide. Phone, WhatsApp, social links, and generic "Contact" must never outrank it. **Utility rule:** `پیگیری درخواست` serves existing leads (footer, mobile menu, confirmation page) and must never be the dominant homepage hero action.

**Page placement guardrail:** homepage carries at most ~3 full-strength primary-CTA instances across the page (excluding the persistent header), placed at meaningful decision points, not arbitrary spacing. Category/material cards use descriptive text links, not a primary button on every card. Do not place a CTA after every process stage.

**Homepage/header CTA mapping:** use **ارسال لیست خرید** as the primary CTA in the header, hero, and pre-footer/final CTA. Use **آشنایی با فرآیند خرید** as the outlined header secondary action and the hero secondary educational action. **تماس با ما** remains a support/navigation action. Screenshot labels such as **ثبت درخواست خرید**, **مشاهده فرآیند همکاری**, and **تماس سریع** are non-authoritative and must not be used as canonical CTA labels.

---

## 3. Copy library (canonical baseline)

| Purpose | Approved Persian copy |
|---|---|
| Global primary conversion | **ارسال لیست خرید** |
| Compact header/mobile label (with full accessible name) | `ارسال لیست` — accessible name must still resolve to the full primary label |
| Hero secondary action | `آشنایی با فرآیند خرید` |
| Guided alternative (no file ready) | `درخواست مشاوره خرید` |
| Form submission | `ارسال برای بررسی` |
| Existing-request utility | `پیگیری درخواست` |
| General support | `تماس با ما` |
| Add / add another / replace / remove file | `افزودن فایل` / `افزودن فایل دیگر` / `جایگزینی فایل` / `حذف فایل` |
| Retry after failure | `تلاش دوباره` |
| Written-inquiry fallback | `ثبت درخواست بدون فایل` |
| No-obligation reassurance | **ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.** |
| What happens next | **پس از ارسال: بررسی درخواست ← تکمیل اطلاعات در صورت نیاز ← ارائه مسیر پیشنهادی تأمین** |
| List-less escape hatch | **لیست کامل آماده ندارید؟ درخواست مشاوره خرید** |

**Final CTA block (page-ending pattern):**

> **فاکتور یا لیست خرید دارید؟**
> آن را برای آهن آسا بفرستید تا نیاز شما بررسی و مسیر مناسب تأمین مشخص شود.
> **ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.**
> **پس از ارسال: بررسی درخواست ← تکمیل اطلاعات در صورت نیاز ← ارائه مسیر پیشنهادی تأمین**
> Primary: **ارسال لیست خرید**
> Helper: **لیست کامل آماده ندارید؟ درخواست مشاوره خرید** — a subordinate text/helper action that uses the existing consultation intent in the same RFQ flow.

**Prohibited CTA/label language** (unless a claim is formally approved with evidence): `دریافت ارزان‌ترین قیمت`, `تضمین بهترین قیمت`, `خرید بدون ریسک`, `تحویل فوری`, `قیمت قطعی آنلاین`, `استعلام لحظه‌ای`, `همین حالا`, `فقط امروز`, `آخرین فرصت`. Never use `خرید`, `پرداخت`, or `ثبت سفارش` for the submit action — it does not create a transaction.

**Copy construction rules:** action-first verb + specific object; 2–5 Persian words typical (longer only when shortening changes meaning); use the buyer's language (`فاکتور`, `لیست خرید`, `درخواست`, `بررسی`) over internal jargon (lead, opportunity, pipeline, RFQ — unless explained); the destination must always match the promise (a submit-documents CTA opens the RFQ flow, never Contact; a process CTA opens the process page, never a form).

---

## 4. Canonical RFQ route and flow

### 4.1 Accepted starting points

A visitor may begin with any one of: a supplier invoice, a material/purchase list, a bill of quantities, a written procurement requirement, or a request for consultation (list not yet finalized). **No account creation, catalog browsing, or supplier selection may be required before submission.**

### 4.2 One canonical flow

All acquisition CTAs across the site resolve to **one** canonical request route and **one** underlying inquiry schema — never a separate form per service/category/campaign. The confirmed canonical RFQ routes are `/request` for Persian, `/en/request` for English, and `/ar/request` for Arabic. `/request-consultation` is legacy/older and may redirect to the canonical route. Implement against a single symbolic route key, never a hardcoded literal duplicated across components.

### 4.3 Recommended four-step flow (or an equivalent single-page presentation)

| Step | Persian title | Purpose | Required to continue |
|---|---|---|---|
| 1 | نوع درخواست | Establish starting point | One intent selected |
| 2 | اطلاعات و مدارک خرید | Collect an uploaded document/image when enabled, pasted list text, manual purchase-list lines, or a written requirement | One clean upload **or** at least one entered line **or** a meaningful pasted/written requirement |
| 3 | اطلاعات تماس | Identify the responsible contact | Full name + valid phone |
| 4 | بازبینی و ارسال | Confirm details and consent | Privacy acknowledgement |

A single-page presentation is a permitted UI variant if usability testing favors it — the underlying required data, validation, accessibility, and API contract stay identical; this is a presentation change, not a schema change.

**Step 2 first-class input paths:** present three user-facing ways to provide the purchase requirement within the same canonical RFQ flow:

1. **File/document** — upload an existing purchase-list document or image, only when the approved production upload-security pipeline is enabled.
2. **Paste your list** — provide a comfortable multiline field labeled **«لیست خود را اینجا کپی کنید»** for existing textual purchase-list content copied from spreadsheet cells/rows, messaging, email, notes, or a textual BOM/material list. Preserve pasted line breaks and treat this as the existing meaningful written/freeform requirement path; do not imply automatic parsing, OCR, AI extraction, `document_review`, structured-row generation, or automatic `rfq_items` creation.
3. **Enter items manually** — provide structured lines supporting, as applicable, product/category, size / variant, grade / standard where relevant, unit, and quantity. Do not invent additional mandatory line fields.

When production upload is disabled, make **Paste your list** and **Enter items manually** the prominent available paths. Explain calmly that file upload becomes available only when the secure document-processing path is enabled; do not show a fake upload control, make a permanently disabled upload box the dominant experience, or imply that uploading is currently possible. When upload is enabled, all three paths may be visible and the visitor may choose whichever is easiest.

**Preparation guidance, not a precondition:** product/category, size or variant, grade/standard where relevant, unit, quantity, delivery detail, and other technical context are helpful information that improves review; the visitor does not need a complete purchase list or full specifications before submitting. If a grade, standard, size detail, final quantity, or other technical value is unknown, allow it to remain unspecified where the schema permits and explain that it can be clarified during review. Never pressure the visitor to guess a technical value or imply that Ahan Asa is making an engineering/design decision where professional technical approval is required.

**Step 1 — intent options** (semantic radio controls, contextual CTA may pre-select but the visitor must be able to change it):

| Code | Persian label |
|---|---|
| `invoice-review` | بررسی فاکتور |
| `material-list` | ارسال لیست خرید |
| `project-document` | ارسال مدارک پروژه |
| `written-requirement` | ثبت نیاز خرید |
| `consultation` | مشاوره برای تعریف خرید |

**Step 4 — review and consent:** readable summary (request type, filenames/sizes — never file contents, written description, contact info, optional context, privacy acknowledgement); the visitor can return to any prior step without losing data.

**Review reassurance:** **ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.** After submission, communicate the process without a time promise: **پس از ارسال: بررسی درخواست ← تکمیل اطلاعات در صورت نیاز ← ارائه مسیر پیشنهادی تأمین**. A visitor may submit a rough or partial need; missing technical detail can be clarified during review.

### 4.4 Conditional completeness rule

Every valid submission requires, at the API boundary:

```text
fullName + valid phone + privacyAcknowledged + (one clean uploaded document OR at least one manual purchase-list line OR a meaningful pasted/written requirement)
```

All other fields (email, company, project name, delivery location, material categories beyond the line itself, estimated quantity outside a line, role, preferred contact method) stay optional end-to-end — UI, API, and downstream mapping. A file that is merely *selected* or still *uploading* does not satisfy the "one clean document" branch.

**Manual purchase-list line entry:** the user-facing manual-entry path must support, as applicable, product/category, size / variant, grade / standard where relevant, unit, and quantity. Do not invent additional mandatory line fields. The UI may keep a freeform description path for needs that do not fit structured catalog selection.

**Meaningful pasted/written requirement:** ≥ 20 non-whitespace characters after normalization, ≤ 3,000 characters, not merely a repeated character/phone number/URL. Accepts Persian, Arabic, Latin, and mixed-direction technical content; line breaks preserved. The maximum permitted pasted-list length and its relationship to the current 3,000-character description limit remain **OPEN DECISION — DO NOT INVENT**; design the multiline experience to accommodate longer pasted lists once the final limit is approved.

---

## 5. File upload UX

**Required interface behavior:** a visible "افزودن فایل" button with a native file picker always works, drag-and-drop is optional supplementary affordance; accepted types/limits are stated *before* selection; after selection show filename (bidi-isolated), type, formatted size, and a per-file status; individual remove/retry actions; accessible status announcements; keyboard operable throughout.

**Status model (Persian display / whether it satisfies the submission requirement):**

| Status | Display | Satisfies requirement? |
|---|---|---:|
| selected | آماده بارگذاری | No |
| uploading | در حال بارگذاری | No |
| uploaded / scanning | بارگذاری شد؛ در حال بررسی | No |
| clean | آماده ارسال | **Yes** |
| rejected-type | نوع فایل مجاز نیست | No |
| rejected-size | حجم فایل بیشتر از حد مجاز است | No |
| malware-rejected | امکان پذیرش این فایل وجود ندارد | No |
| upload/scan-failed | بارگذاری/بررسی کامل نشد | No |

Never expose malware signatures, storage keys, vendor names, or internal security rules in a public error. A failed file never silently drops from the submission — the UI must let the visitor retry, remove and re-select, or fall back to a written description.

**Launch file policy** (provisional, pending final security/ops/legal approval — see §9): customers may submit an existing purchase-list document or image. The production accepted file-type allowlist is not owner-approved yet; do not present any PDF/spreadsheet/document/image list as final. Final server-side allowlist, MIME/signature validation, file-count and size limits, scanning policy, retention, and production enablement are security gates. Rejected by default unless explicitly approved: executables, scripts, HTML, SVG, macro-enabled Office files, password-protected archives, any archive format (ZIP/RAR/7z), disk images, and active content.

**Production gating (hard rule, cross-referenced from `06_PRODUCTS_CMS_ODOO_RFQ.md`):** the upload UI described here must remain disabled in production until secure private storage, malware/content scanning, and consented data handling are approved and implemented end-to-end — see §9 for the open scanning-provider decision. When upload is unavailable, prominently offer the first-class **Paste your list** and **Enter items manually** paths, explain that secure file upload is pending its approved document-processing path, and never show a fake control or imply that uploading is currently possible.

---

## 6. Mobile RFQ CTA

- The primary inquiry action stays reachable within or immediately adjacent to the mobile navigation menu at all times.
- A compact visible label (`ارسال لیست`) is permitted only paired with the full accessible name.
- On appropriate public acquisition/content pages, a persistent bottom sticky CTA is enabled by default with the canonical label **ارسال لیست خرید** (the compact `ارسال لیست` variant is allowed only where space genuinely requires it, with an equivalent full accessible name). It is a controlled conversion aid: use the existing Forge Copper conversion treatment where appropriate, sufficient contrast, at least the system-standard 44×44px touch target, and no continuous pulse, bounce, animation, or artificial urgency.
- The sticky CTA must never overlap active form fields, validation messages, submit/next buttons, cookie/privacy controls, browser chrome, accessibility controls, or another fixed/mobile primary conversion control. It must not create horizontal overflow or content obstruction; it must remain keyboard- and screen-reader-accessible and respect mobile safe-area insets.
- Account for the virtual keyboard: suppress or appropriately reposition the sticky CTA whenever it would obstruct or visually conflict with the active field, an inline validation message, or the submit/next action.
- The sticky CTA must be hidden on `/request`, `/en/request`, and `/ar/request`, because the form's own step/action controls are primary there.
- **While the Request form route is active, the global/sticky site-wide CTA must be suppressed** — the form's own step actions are the only primary call to action on that route; do not show a second competing button.
- Mobile file actions remain reachable without horizontal scrolling; the virtual keyboard must never hide the active field, an inline error, or the submit action.
- The Paste your list path is especially important on mobile: use a large, comfortable multiline input that accepts Persian, Arabic, Latin, and mixed-direction technical text; preserves line breaks; requires no horizontal scrolling; works with pasted multiline content; preserves pasted data on validation or network errors; remains usable with the virtual keyboard; and provides a clear way to switch to manual item entry. WhatsApp is not a production submission channel unless independently approved.

---

## 7. Validation and error handling

- Validate on blur only after genuine interaction, and again on step continuation / final submission — never disruptively on every keystroke of an incomplete value.
- Never clear a field after an error; preserve all valid values and any already-clean uploaded file tokens through a recoverable failure.
- Errors are specific and programmatically linked to their field (`aria-describedby`/`aria-errormessage`); on a failed final submission, an error summary receives focus with links to each affected field.
- Server-side validation is authoritative — client-side validation only improves the recovery experience; the browser never independently decides a file is safe, a hidden context value is trusted, or a submission succeeded.
- Idempotent retry: the same client-generated idempotency key is reused for retries of one logical submission (never regenerated until confirmed success or an intentional new request) so a network timeout, double-click, or page refresh never creates a duplicate lead. Full server-side contract: `06_PRODUCTS_CMS_ODOO_RFQ.md`.

**Representative copy:**

| State | Copy |
|---|---|
| Field required | `نام و نام خانوادگی را وارد کنید.` |
| Phone format | `شماره تماس را با پیش‌شماره صحیح وارد کنید.` |
| File too large | `حجم فایل بیشتر از حد مجاز است.` |
| Upload interrupted | `بارگذاری کامل نشد.` |
| Submission failed (data preserved) | `درخواست ثبت نشد. اطلاعات شما در این صفحه حفظ شده است؛ دوباره تلاش کنید.` |

Never show `خطا!`, an unnamed "invalid input," or blaming language ("اطلاعات را اشتباه وارد کرده‌اید").

---

## 8. Confirmation state

Success is shown **only after the server confirms durable receipt** (see the durable-persist-before-acknowledgement contract in `06_PRODUCTS_CMS_ODOO_RFQ.md`) — a client-side "upload complete" indicator is never sufficient. The confirmation must state: that the request was received, a reference number **only if the backend genuinely generates one**, what the team will review, the expected next step, and how to add missing information; `پیگیری درخواست` appears only if a real follow-up mechanism exists. The compatible user-facing sequence is: **پس از ارسال: بررسی درخواست ← تکمیل اطلاعات در صورت نیاز ← ارائه مسیر پیشنهادی تأمین**. The confirmation may also reinforce: **ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.** Never display: fake progress, fake assignment, a generated/invented response-time promise, internal lead status, or the visitor's name/phone in the URL. A refresh of the confirmation page must never resubmit or create a duplicate lead.

### 8.1 RFQ analytics taxonomy

RFQ analytics event names are conceptual and stable; exact GTM/GA4 IDs remain open in `04_SEO_PERFORMANCE_ANALYTICS.md`. Events must never include PII, filenames, purchase-list text, raw quantities, Odoo IDs, signed URLs, or contact details. The primary lead event is still `generate_lead`, and it fires only after server-confirmed durable receipt.

| Event | Fires on |
|---|---|
| `request_form_view` | RFQ/request flow is viewed |
| `request_form_start` | Visitor meaningfully starts the flow |
| `request_file_select` | Visitor selects a file for upload |
| `request_upload_start` | Upload begins, where upload is enabled |
| `request_upload_success` | Upload reaches the server-accepted uploaded/scan-pending or clean state, as implemented |
| `request_upload_error` | Upload or validation fails recoverably |
| `request_manual_entry_select` | Visitor chooses the manual purchase-list entry path |
| `request_item_add` | Visitor adds a manual purchase-list line |
| `request_step_complete` | Visitor completes a meaningful step/progression point |
| `request_submit_attempt` | Final submit is attempted |
| `request_submit_success` | Server confirms durable RFQ receipt |
| `request_submit_error` | Final submit fails and data is preserved for recovery |
| `request_retry` | Visitor retries after an upload or submission failure |

Use one owner for each event source so GTM Enhanced Measurement and manual pushes never double-count the same action. The confirmation-triggered `request_submit_success` may map to `generate_lead`; no opened form, CTA click, selected file, or client-only success state may do so.

---

## 9. Open decisions — do not invent

The following are explicitly unresolved in the source corpus; do not fabricate values for them:

- **Odoo integration details** — Odoo is the confirmed commercial/business system of truth where appropriate; exact version, installed modules, API/protocol, model mapping, field mapping, authentication, and integration details remain open.
- **Final accepted file types, size limits, and retention periods** — §5 is provisional only, pending final security/operations/legal approval.
- **Attachment malware-scanning provider** — owner-confirmed as non-blocking for foundation work, but a hard gate before production uploads (see `05_TECH_DATA_CLOUDFLARE.md` / `06_PRODUCTS_CMS_ODOO_RFQ.md`).
- **Privacy notice legal text and consent wording** — the working direction in the source docs is provisional pending legal approval.
- **Verified phone/email/WhatsApp channels** — company phone is an unconfirmed candidate only (`PROJECT_OVERRIDES.md` §7.2) and must not be published; do not invent a number, email address, or WhatsApp business number.
- **Public response-time promise** — none exists; never state or imply a turnaround time.
- **CAPTCHA/bot-challenge provider** — none selected by default; risk-based only if introduced.
- **Public request-tracking mechanism** — reserved/deferred; do not build a fake or mocked tracking UI.
- **Maximum permitted pasted-list length and its relationship to the current 3,000-character meaningful-requirement limit** — OPEN DECISION — DO NOT INVENT; this does not block the v0 UX design.

## 10. Consistency notes for this package

- Primary CTA label used consistently as **«ارسال لیست خرید»** throughout this package (per the governing task instruction), understood as shorthand for the fuller invoice/BOM/material-list submission concept documented in `01-sources/CTA_STRATEGY.md` and `01-sources/COPY_GUIDELINES.md` as **«ارسال فاکتور یا لیست خرید»** — both phrases denote the same single canonical conversion action and destination.
- Mobile RFQ CTA behavior (§6) is consistent with the global header/footer rules in `01_UX_UI_DESIGN.md` §13–14: exactly one competing CTA at a time, suppressed on the active form route.
- Upload-disabled-until-scanning-approved is stated identically here and in `06_PRODUCTS_CMS_ODOO_RFQ.md` — this file owns the *UX* consequence (honest fallback), the other file owns the *security pipeline* requirement.
