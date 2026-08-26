# Ahan Asa Form Architecture

**File:** FORM_ARCHITECTURE.md  
**Brand:** Ahan Asa — آهن آسا  
**Version:** 1.0  
**Date:** 2026-08-25  
**Status:** Implementation baseline  
**Primary locale:** Persian (fa-IR, RTL)  
**Document language:** English, with approved Persian interface copy

---

## 1. Purpose

This document defines the complete form and lead-capture architecture for the Ahan Asa website: form inventory, conversion flows, field contracts, validation, file handling, server submission, lead normalization, routing, privacy, accessibility, analytics, failure recovery, security, testing, and implementation rules.

It is the implementation authority for:

- the primary procurement request at **/request**;
- secure invoice and material-list submission;
- consultation requests that enter the same canonical flow;
- contact capture where a structured request is appropriate;
- optional future resource-access forms;
- server-side inquiry creation through **/api/inquiries**;
- conditional secure upload handling through **/api/uploads**;
- provider-neutral delivery to an approved CRM or internal lead store.

This document must be read with:

- PROJECT_BRIEF.md
- CTA_STRATEGY.md
- CONTENT_MODEL.md
- ROUTES.md
- ACCESSIBILITY.md
- API_INTEGRATIONS.md when available
- ANALYTICS_TRACKING.md when available
- SECURITY_GUIDELINES.md when available
- ENVIRONMENT_VARIABLES.md when available

If a later document changes a field, provider, retention period, route, or legal requirement, the conflict must be recorded in DECISIONS.md and this document must be updated before implementation.

---

## 2. Strategic Context

### 2.1 Brand role

Ahan Asa is a premium B2B steel procurement-management partner. It helps clients clarify purchasing requirements, assess sourcing options, reduce avoidable procurement risk, and coordinate an agreed purchasing path.

Approved brand promise:

> **ما مراقب سرمایه شما هستیم.**

The form experience must feel like the beginning of a professional procurement review—not a retail checkout, public price inquiry, marketplace listing, or commodity lead trap.

### 2.2 Primary conversion

The dominant conversion is:

> **ارسال فاکتور یا لیست خرید**

All major acquisition CTAs must lead to one canonical request flow at **/request**. Page context may prefill the flow, but it must not create a separate form architecture for every service, material category, article, or campaign.

### 2.3 Accepted starting points

A user may begin with any one of the following:

- supplier invoice;
- material or purchase list;
- bill of quantities;
- project procurement document;
- written steel requirement;
- request for procurement consultation when the list is incomplete.

The website must not require a visitor to create an account, browse a catalog, choose a supplier, or calculate a quotation before submitting.

### 2.4 What submission means

Submission means:

1. Ahan Asa has received the information for an initial review.
2. The request may require clarification.
3. Sourcing or comparison work starts only within the approved operational process.
4. A proposal or next step may follow after review.

Submission does not mean:

- a purchase order has been created;
- a price is final;
- stock has been reserved;
- supply or delivery is guaranteed;
- a contract has been formed;
- payment is due;
- an instant quotation has been generated.

### 2.5 Primary success measure

The main outcome is not the highest possible form count. It is a reliable number of usable, consented, attributable procurement inquiries that the operations team can review without unnecessary re-entry or ambiguity.

---

## 3. Architecture Principles

### 3.1 One canonical lead path

Use one request route, one field model, one validation contract, and one server-side inquiry pipeline. Contextual forms must be configurations of the same system, not isolated implementations.

### 3.2 Minimum necessary friction

Ask only for information needed to:

- identify a responsible contact;
- understand what should be reviewed;
- safely access submitted documents;
- return with a relevant next step.

Do not collect fields merely because a CRM supports them.

### 3.3 Document-first, not document-required

Documents are strongly encouraged because they improve request quality, but they are not mandatory. A user without a file must be able to submit a written requirement or consultation request.

### 3.4 Conditional completeness

Every valid submission must include:

- full name;
- phone number;
- privacy acknowledgement;
- at least one usable requirement input:
  - one successfully uploaded document; or
  - a meaningful written description.

Optional fields remain optional in the interface, schema, API, CRM adapter, and internal process.

### 3.5 Server authority

Client-side validation improves usability. Server-side validation is authoritative. The browser must never decide that:

- an uploaded file is safe;
- a hidden context value is trusted;
- a request is not spam;
- a lead was successfully created;
- a user may access a stored document.

### 3.6 Progressive enhancement

The form should remain understandable if client-side enhancements fail. Where technically practical, standard fields, labels, privacy links, and a basic submit path must remain available.

### 3.7 Privacy by design

Invoices, purchase lists, contact data, supplier information, project details, and internal routing data are confidential. They must never appear in:

- static page bundles;
- public asset folders;
- query strings;
- analytics events;
- client-readable logs;
- public object-storage URLs;
- confirmation-page source;
- email attachments sent through uncontrolled channels.

### 3.8 Honest feedback

Success may be shown only after the server confirms durable receipt of the inquiry and all referenced documents. A visual upload completion state is not submission success.

### 3.9 No dead-end failure

A failed request must preserve safe user input, identify the recoverable problem, and offer retry. An approved verified contact channel may be shown as a fallback, but failure must never be disguised as success.

### 3.10 Accessible by default

The full request flow—including validation, upload, step navigation, loading, error, retry, and confirmation—must meet WCAG 2.2 AA requirements defined in ACCESSIBILITY.md.

---

## 4. Phase 1 Scope

### 4.1 Included

- canonical procurement request;
- optional multi-file upload;
- written-request fallback;
- consultation intent;
- page and CTA context capture;
- contact data;
- privacy acknowledgement;
- server-side validation;
- abuse protection;
- inquiry persistence;
- provider-neutral CRM delivery;
- internal notification after durable receipt;
- confirmation state;
- consent-aware analytics without PII;
- accessible error recovery.

### 4.2 Conditional

These may ship only when the corresponding operational and technical capability is approved:

- secure file upload;
- CRM synchronization;
- customer acknowledgement by email or SMS;
- WhatsApp as a verified alternate contact channel;
- resource-access forms;
- marketing consent;
- CAPTCHA or managed bot challenge;
- public reference number.

### 4.3 Deferred or prohibited in Phase 1

- live quotation;
- automatic pricing;
- online payment;
- cart or checkout;
- purchase-order creation;
- public inventory;
- supplier marketplace;
- customer account;
- customer dashboard;
- public request tracking;
- OCR or AI interpretation of invoices;
- automated commercial promises;
- unverified response-time claims;
- newsletter capture without an approved newsletter program;
- document collection through a third-party form embed.

---

## 5. Form Inventory

| Form ID | User-facing purpose | Route or entry | Phase 1 status | Destination |
|---|---|---|---|---|
| procurement-request | Send invoice, list, BOQ, document, or written need | /request | Required | /api/inquiries |
| procurement-consultation | Ask for guidance without a final list | /request with approved intent context | Required configuration | /api/inquiries |
| contextual-request | Continue from a material, service, guide, or campaign | /request with validated context | Required configuration | /api/inquiries |
| general-contact | Structured business inquiry | Prefer /request with contact intent | Limited | /api/inquiries |
| resource-access | Access an intentionally gated resource | Resource page | Deferred by default | /api/inquiries or approved access service |
| marketing-subscription | Newsletter or updates | None at launch | Deferred | Approved marketing provider |
| request-tracking | Follow an existing request | Reserved route | Deferred | Approved authenticated service |

### 5.1 Canonicalization rule

The first four rows are not separate React form implementations. They are approved configurations of one Request Flow and one Inquiry schema.

### 5.2 Contact-page rule

The Contact page should prioritize verified phone, email, address, and other approved channels. If a form is needed, it should use the canonical request system with a general-contact intent. Do not build a second uncontrolled contact form.

### 5.3 Resource-access rule

Public resources should be ungated by default. A form may gate a resource only when:

- the resource has meaningful commercial value;
- the user receives the resource regardless of lead qualification;
- the required fields are proportionate;
- the access and privacy copy are approved;
- delivery is technically reliable;
- the resource remains accessible to keyboard and assistive-technology users.

### 5.4 Marketing-subscription rule

Do not display a newsletter field until there is:

- a real publication program;
- a named owner;
- an approved sending provider;
- double opt-in or another legally approved mechanism;
- unsubscribe handling;
- a separate optional marketing consent.

Procurement consent must never be reused as marketing consent.

---

## 6. Canonical Request Experience

### 6.1 Route contract

| Route | Method | Role | Indexing |
|---|---|---|---|
| /request | GET | Render the canonical request experience | noindex, follow |
| /request/confirmation | GET | Display successful receipt without sensitive data | noindex, nofollow |
| /api/inquiries | POST | Validate and durably create an inquiry | Not indexable |
| /api/uploads | POST or approved presigned flow | Initialize or receive secure uploads | Conditional; not indexable |

The user stays on **/request** while moving through steps. Do not publish step URLs such as **/request/step-1**.

### 6.2 Recommended four-step flow

| Step | Persian title | Purpose | Required to continue |
|---|---|---|---|
| 1 | نوع درخواست | Establish the user's starting point | One intent |
| 2 | اطلاعات و مدارک خرید | Collect files or a written requirement | One clean upload or meaningful description |
| 3 | اطلاعات تماس | Identify the responsible contact | Full name and valid phone |
| 4 | بازبینی و ارسال | Confirm details and consent | Required acknowledgement |

### 6.3 Step 1 — Request intent

Approved options:

| Code | Persian label | Meaning |
|---|---|---|
| invoice-review | بررسی فاکتور | The user has a supplier invoice |
| material-list | ارسال لیست خرید | The user has a material or purchase list |
| project-document | ارسال مدارک پروژه | The user has a BOQ or project document |
| written-requirement | ثبت نیاز خرید | The user will describe the requirement |
| consultation | مشاوره برای تعریف خرید | The user needs help defining the requirement |

Rules:

- exactly one primary intent is required;
- options must be semantic radio controls, not inaccessible cards;
- a contextual CTA may preselect an intent, but the user must be able to change it;
- campaign or page context must not silently lock the intent;
- choosing an intent must not imply a price, availability, or service commitment.

### 6.4 Step 2 — Requirement and documents

The user may:

- upload one or more approved files;
- enter a written description;
- provide both.

At least one clean file or a meaningful description is required before final submission. A selected or uploading file does not satisfy this condition.

Recommended Persian support copy:

> فاکتور، لیست خرید یا مدارک پروژه را اضافه کنید. اگر فایل آماده ندارید، نیاز خریدتان را بنویسید.

The form must explain:

- accepted file types;
- per-file and total size limits;
- that files are reviewed for the submitted request;
- that submission is not a purchase order;
- that sensitive passwords should not be included in the description.

### 6.5 Step 3 — Contact

Collect the minimum reliable contact information:

- full name;
- phone country code;
- phone number.

Email, company, role, preferred contact method, and location are optional unless a later operational decision makes one necessary.

### 6.6 Step 4 — Review and consent

Display a readable summary:

- request type;
- filenames and sizes, not file contents;
- written description;
- contact information;
- optional context;
- privacy acknowledgement.

The user must be able to return to any previous step without losing data.

Submit label:

> **ارسال برای بررسی**

Do not use:

- خرید
- پرداخت
- ثبت سفارش
- دریافت قیمت قطعی
- رزرو موجودی

### 6.7 Single-page fallback

If product testing shows that steps create unnecessary friction, the same fields may be displayed in one page. This is a presentation change, not a schema change. The required data, validation, accessibility, security, analytics, and API contracts remain identical.

---

## 7. Field Contract

### 7.1 Public field matrix

| Field key | Persian label | Type | Requirement | Validation summary |
|---|---|---|---|---|
| intent | نوع درخواست | radio enum | Required | Approved enum only |
| documents | فایل‌ها | file list | Conditional | At least one clean file or description |
| requirementDescription | توضیحات نیاز خرید | textarea | Conditional | Meaningful text when no clean file |
| materialCategories | گروه‌های کالایی | multiselect | Optional | Approved taxonomy IDs only |
| estimatedQuantity | مقدار تقریبی | text | Optional | Sanitized, length-limited; no forced unit |
| deliveryLocation | محل تحویل | text | Optional | Sanitized, length-limited |
| projectName | نام پروژه | text | Optional | Sanitized, length-limited |
| companyName | نام شرکت | text | Optional | Sanitized, length-limited |
| fullName | نام و نام خانوادگی | text | Required | Human-readable, length-limited |
| phoneCountryCode | پیش‌شماره کشور | combobox/text | Required | Approved calling-code pattern |
| phoneNationalNumber | شماره تماس | tel | Required | Locale-aware digits, server normalized |
| email | ایمیل | email | Optional | Valid only when present |
| role | سمت | text | Optional | Sanitized, length-limited |
| preferredContactMethod | روش ترجیحی تماس | radio/select | Optional | Approved channel enum |
| privacyAcknowledged | تأیید حریم خصوصی | checkbox | Required | Must be true |
| marketingConsent | دریافت اطلاع‌رسانی | checkbox | Deferred/optional | Separate, unchecked |

### 7.2 Hidden and server-derived fields

| Field key | Source | Client visibility | Trust rule |
|---|---|---|---|
| formVersion | application config | Hidden | Server must allowlist |
| locale | route/application | Hidden | Server must allowlist |
| direction | derived from locale | Not submitted if unnecessary | Server derives |
| sourcePage | server/referrer-safe context | Hidden | Validate same-site path |
| sourceSection | CTA context | Hidden | Allowlist or length-limit |
| ctaIntent | CTA component | Hidden | Allowlist |
| categorySlug | contextual CTA | Hidden | Validate against published taxonomy |
| serviceSlug | contextual CTA | Hidden | Validate against published content |
| guideSlug | contextual CTA | Hidden | Validate against published content |
| campaignId | approved campaign config | Hidden | Never trust arbitrary value |
| utmSource | landing attribution | Hidden/internal | Sanitize; no PII |
| utmMedium | landing attribution | Hidden/internal | Sanitize; no PII |
| utmCampaign | landing attribution | Hidden/internal | Sanitize; no PII |
| referrerHost | server-derived | Not editable | Store origin only where possible |
| idempotencyKey | client-generated UUID | Technical | Server verifies uniqueness |
| submittedAt | server clock | Not editable | Never accept client timestamp as authority |
| userAgentClass | server-derived | Internal | Minimize; do not fingerprint unnecessarily |
| spamSignals | server-derived | Internal | Never expose scoring logic |

### 7.3 Fields prohibited at launch

Do not collect:

- national ID;
- bank or card information;
- account password;
- supplier-portal credentials;
- payment proof unless a later transaction flow is approved;
- exact financial capacity;
- personal address unrelated to delivery;
- public social profile;
- birth date;
- unnecessary identity documents;
- internal lead score from the user;
- a free-form “how did you hear about us?” field when attribution already provides sufficient context.

### 7.4 Conditional requirement rule

The API-level invariant is:

> fullName + valid phone + privacyAcknowledged + (one clean document OR meaningful requirementDescription)

Client code and server code must implement the same logical condition from a shared schema where practical.

### 7.5 Meaningful description

The written requirement must:

- contain at least 20 non-whitespace characters after normalization;
- contain no more than 3,000 characters;
- not consist only of repeated characters, a phone number, or a URL;
- accept Persian, Arabic, Latin, and mixed-direction technical content;
- preserve line breaks;
- be rendered as plain text internally unless separately sanitized.

The minimum is a quality safeguard, not a reason to reject concise but valid technical input. Server logging should flag edge cases for review rather than expose detailed anti-spam rules.

---

## 8. Field-Level Validation

### 8.1 General rules

- Validate on blur only after a user has interacted with a field.
- Validate again on step continuation.
- Validate all required conditions on final submission.
- Do not clear a field after an error.
- Place a specific error next to the field.
- Link error text using **aria-describedby** or **aria-errormessage**.
- Move focus to the error summary after a failed final submission.
- Do not rely on red color alone.
- Do not validate every keystroke in a disruptive way.
- Server errors override client assumptions.

### 8.2 Full name

Recommended constraints:

- 2 to 100 Unicode characters after trimming;
- Persian, Arabic, Latin, spaces, hyphens, apostrophes, and common name punctuation allowed;
- numeric-only values rejected;
- HTML treated as plain text;
- repeated whitespace normalized.

Error copy:

> نام و نام خانوادگی را وارد کنید.

### 8.3 Phone

Rules:

- display country code separately;
- default to **+98** for Persian launch, while allowing change;
- accept Persian and Arabic-Indic digits and normalize them to ASCII server-side;
- remove spaces, hyphens, parentheses, and direction marks before validation;
- store the normalized number in E.164 form when possible;
- keep the display value separate only when operationally necessary;
- do not require a leading zero after a country code;
- do not expose whether the number already exists in the system.

Error copy:

> شماره تماس را با پیش‌شماره صحیح وارد کنید.

### 8.4 Email

Rules:

- optional;
- trim surrounding spaces;
- normalize domain case;
- do not over-restrict valid addresses;
- maximum 254 characters;
- no confirmation field;
- if acknowledgement by email is not operational, do not imply that email will be sent.

Error copy:

> ایمیل را به شکل صحیح وارد کنید.

### 8.5 Optional text fields

Recommended maximums:

| Field | Maximum |
|---|---:|
| companyName | 160 characters |
| projectName | 160 characters |
| role | 100 characters |
| deliveryLocation | 200 characters |
| estimatedQuantity | 100 characters |
| sourceSection | 100 characters |

Reject control characters and null bytes. Render all content as escaped text.

### 8.6 Material categories

- values must be approved stable taxonomy IDs;
- labels are localized in the interface;
- unknown values are rejected or safely ignored according to the shared schema;
- “سایر” may reveal a short optional text field;
- do not require the user to know the exact category;
- allow mixed-category lists.

### 8.7 Consent

Privacy acknowledgement must:

- be unchecked by default;
- use a real checkbox;
- link to **/privacy**;
- use specific wording;
- identify request handling, not marketing;
- be versioned in the submitted ConsentRecord.

Provisional Persian copy pending legal approval:

> با ارسال این درخواست، تأیید می‌کنم اطلاعات و مدارک ارائه‌شده برای بررسی و پیگیری درخواست خرید من استفاده شود و اطلاعیه حریم خصوصی را مطالعه کرده‌ام.

Legal approval is required before launch. Claude Code must not silently rewrite this into a broader consent.

---

## 9. File Upload Architecture

### 9.1 Launch file policy

Recommended launch limits:

| Rule | Value |
|---|---|
| Maximum files | 5 |
| Maximum size per file | 10 MiB |
| Maximum combined size | 25 MiB |
| Temporary incomplete-upload lifetime | Maximum 24 hours |
| Public access | Never |
| Malware scan | Required before operational access |

Accepted extensions and MIME families:

| Extension | Expected MIME | Purpose |
|---|---|---|
| .pdf | application/pdf | Invoice, BOQ, specification |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | Material list |
| .xls | application/vnd.ms-excel | Legacy spreadsheet |
| .csv | text/csv or approved compatible value | Tabular list |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | Project document |
| .jpg / .jpeg | image/jpeg | Photograph or scan |
| .png | image/png | Image or screenshot |

Rejected by default:

- executable files;
- scripts;
- HTML;
- SVG;
- macro-enabled Office files;
- password-protected archives;
- ZIP, RAR, 7z, and other archives;
- disk images;
- unknown binary formats;
- double-extension files intended to disguise type.

### 9.2 User interface

The upload component must provide:

- visible **افزودن فایل** button;
- native file picker;
- optional drag-and-drop enhancement;
- accepted types and limits before selection;
- filename, type, and formatted size after selection;
- individual progress where real progress is available;
- individual status: selected, uploading, scanning, ready, failed, rejected;
- remove and retry actions;
- accessible status announcements;
- keyboard operation;
- no drag-only requirement.

### 9.3 Status model

| Code | Persian display | Can satisfy submission requirement? |
|---|---|---:|
| selected | آماده بارگذاری | No |
| uploading | در حال بارگذاری | No |
| uploaded | بارگذاری شد؛ در حال بررسی | No |
| scanning | در حال بررسی امنیت فایل | No |
| clean | آماده ارسال | Yes |
| rejected-type | نوع فایل مجاز نیست | No |
| rejected-size | حجم فایل بیشتر از حد مجاز است | No |
| malware-rejected | امکان پذیرش این فایل وجود ندارد | No |
| upload-failed | بارگذاری کامل نشد | No |
| scan-failed | بررسی فایل کامل نشد | No |
| removed | حذف شد | No |

Do not expose malware signatures, storage keys, vendor details, or security rules in public errors.

### 9.4 Preferred secure upload flow

1. Browser requests an upload authorization from **/api/uploads** with filename, size, and declared type.
2. Server validates session, limits, type allowlist, rate limit, and current form state.
3. Server creates a random private storage key and short-lived upload authorization.
4. Browser uploads directly to private object storage or streams through the server.
5. Storage or server verifies size and file signature.
6. Malware scanning runs.
7. Server returns an opaque document token and clean/pending state.
8. Final **/api/inquiries** submission references only approved opaque document tokens.
9. Server atomically binds clean documents to the created inquiry.
10. Unbound temporary uploads expire automatically.

### 9.5 Upload security rules

- Never trust filename extension or browser MIME alone.
- Verify file signature where technically possible.
- Generate the storage key; never use the original filename as the key.
- Preserve the original filename only as sanitized metadata.
- Strip path separators and control characters.
- Keep the bucket/container private.
- Use short-lived, scope-limited upload authorization.
- Do not allow overwrite.
- Encrypt in transit and at rest.
- Scan before staff access.
- Log authorized internal access.
- Do not render uploaded HTML or active document content in the public site.
- Use attachment disposition for authorized downloads where appropriate.
- Do not attach documents directly to notification emails.

### 9.6 Failed upload behavior

- Preserve other completed fields.
- Allow retry of only the failed file.
- Allow removal and alternative selection.
- Allow written-description fallback.
- Prevent final submission while a required file is still uploading or scanning, unless a sufficient written description exists and the user removes the pending file.
- Do not silently omit a failed file from submission.

### 9.7 Retention decisions

The following are implementation defaults pending legal and operational approval:

| Data | Default |
|---|---|
| Unbound temporary upload | Delete within 24 hours |
| Rejected/quarantined upload | Delete within 7 days unless required for a documented security investigation |
| Submitted inquiry documents | Retain for 180 days after the last relevant inquiry activity |
| Access logs | Retain according to approved security policy |
| Consent evidence | Retain for the life of the related inquiry record and required audit period |

Before launch, the privacy owner must approve or replace these periods. Retention values must be configurable, not scattered as hard-coded literals.

---

## 10. Client Form State

### 10.1 State model

Recommended state:

~~~ts
type RequestIntent =
  | "invoice-review"
  | "material-list"
  | "project-document"
  | "written-requirement"
  | "consultation";

type UploadState =
  | "selected"
  | "uploading"
  | "uploaded"
  | "scanning"
  | "clean"
  | "failed"
  | "rejected";

type RequestDraft = {
  formVersion: string;
  currentStep: 1 | 2 | 3 | 4;
  intent?: RequestIntent;
  requirementDescription?: string;
  materialCategoryIds: string[];
  estimatedQuantity?: string;
  deliveryLocation?: string;
  projectName?: string;
  companyName?: string;
  fullName?: string;
  phoneCountryCode: string;
  phoneNationalNumber?: string;
  email?: string;
  role?: string;
  preferredContactMethod?: "phone" | "email" | "whatsapp";
  uploads: ClientUploadItem[];
  privacyAcknowledged: boolean;
  marketingConsent?: boolean;
  context: SafeRequestContext;
  idempotencyKey: string;
};
~~~

### 10.2 State-machine phases

| State | Allowed next states |
|---|---|
| idle | editing |
| editing | validating, uploading |
| uploading | editing, ready, upload-error |
| upload-error | uploading, editing |
| validating | editing, ready |
| ready | submitting, editing |
| submitting | succeeded, submission-error |
| submission-error | submitting, editing |
| succeeded | terminal/new-request |

### 10.3 Persistence

Default behavior:

- preserve state during internal step navigation;
- preserve state after recoverable validation or server failure;
- do not place form values in the URL;
- do not place uploaded file bytes in localStorage;
- do not persist personal data across long periods by default;
- use sessionStorage only when a privacy review approves it;
- if session restoration is enabled, exclude document tokens after expiration;
- clear the draft after confirmed success.

### 10.4 Navigation protection

If a user has meaningful unsent content and leaves the route:

- avoid aggressive modal traps;
- browser unload protection may be used only when data loss is likely;
- internal navigation may show an accessible confirmation dialog;
- the dialog must identify what may be lost;
- do not block departure after successful submission.

---

## 11. API Contract

### 11.1 Endpoint

**POST /api/inquiries**

The endpoint is the single public server entry for accepted inquiry configurations.

### 11.2 Request headers

| Header | Requirement |
|---|---|
| Content-Type | application/json for tokenized upload flow |
| Accept | application/json |
| Idempotency-Key | Required UUID |
| X-CSRF-Token | Required when the chosen framework/session model needs it |

Do not send secrets or provider credentials from the browser.

### 11.3 Conceptual request payload

~~~json
{
  "formVersion": "1.0",
  "locale": "fa-IR",
  "intent": "material-list",
  "contact": {
    "fullName": "نام کاربر",
    "phoneCountryCode": "+98",
    "phoneNationalNumber": "9120000000",
    "email": null,
    "role": null,
    "preferredContactMethod": "phone"
  },
  "company": {
    "name": null
  },
  "project": {
    "name": null,
    "deliveryLocation": null
  },
  "requestedMaterialCategoryIds": [],
  "estimatedQuantity": null,
  "requirementDescription": "شرح نیاز خرید",
  "documentTokens": ["opaque_document_token"],
  "context": {
    "sourcePage": "/steel-products",
    "sourceSection": "final-cta",
    "ctaIntent": "submit_documents",
    "categorySlug": null,
    "serviceSlug": null,
    "guideSlug": null,
    "campaignId": null
  },
  "attribution": {
    "utmSource": null,
    "utmMedium": null,
    "utmCampaign": null
  },
  "consent": {
    "privacyAcknowledged": true,
    "privacyNoticeVersion": "approved-version-id",
    "marketingConsent": false
  }
}
~~~

Values above are examples, not production data.

### 11.4 Success response

~~~json
{
  "ok": true,
  "submissionId": "opaque-public-safe-id",
  "referenceNumber": null,
  "confirmationPath": "/request/confirmation"
}
~~~

Rules:

- **submissionId** must be opaque and not grant record access.
- **referenceNumber** is returned only when the backend creates a customer-safe reference.
- no internal database ID, CRM ID, assignment, supplier name, score, or security result may be returned.

### 11.5 Validation error response

~~~json
{
  "ok": false,
  "code": "VALIDATION_FAILED",
  "message": "اطلاعات واردشده نیاز به اصلاح دارد.",
  "fieldErrors": {
    "phoneNationalNumber": "شماره تماس را با پیش‌شماره صحیح وارد کنید."
  },
  "retryable": true
}
~~~

### 11.6 System error response

~~~json
{
  "ok": false,
  "code": "SUBMISSION_UNAVAILABLE",
  "message": "درخواست ثبت نشد. اطلاعات شما در این صفحه حفظ شده است؛ دوباره تلاش کنید.",
  "retryable": true
}
~~~

Public errors must remain generic. Correlation IDs may be logged internally; expose one only when support operations can use it safely.

### 11.7 Response status guidance

| Status | Use |
|---|---|
| 201 | Inquiry durably created |
| 400 | Malformed request |
| 403 | CSRF or origin failure |
| 409 | Idempotency conflict or safe duplicate response |
| 413 | Payload or file limit exceeded |
| 422 | Field or conditional validation failed |
| 429 | Rate limit |
| 500 | Unexpected server failure |
| 503 | Required downstream service unavailable and no durable queue exists |

### 11.8 Durable receipt rule

Return success only when:

- the inquiry is durably stored in the website-controlled data boundary; and
- clean referenced documents are bound to it; and
- any required asynchronous delivery job has been durably queued.

A CRM timeout does not have to fail the user submission if the website has already stored the inquiry and queued a safe retry. Without durable local storage or a durable queue, a failed required CRM write must not be shown as success.

### 11.9 Idempotency

- Generate a unique Idempotency-Key when the draft begins.
- Reuse it for retries of the same final submission.
- Store the request hash and result for a bounded period.
- Return the original safe success result for an identical replay.
- Reject conflicting payloads that reuse the same key.
- Generate a new key only after confirmed success or an intentional new request.

This prevents double leads when a user double-clicks, refreshes, or retries after a network timeout.

---

## 12. Server Processing Pipeline

The required order is:

1. Verify method, content type, origin, and request size.
2. Apply rate limiting and abuse checks.
3. Parse safely.
4. Normalize locale-sensitive digits and whitespace.
5. Validate the shared schema.
6. Verify contextual IDs against approved content.
7. Verify document tokens, ownership, expiry, scan state, and limits.
8. Evaluate the conditional completeness rule.
9. Record the consent version and timestamp.
10. Check idempotency.
11. Create the confidential inquiry transactionally.
12. Bind documents to the inquiry.
13. Commit durable delivery or synchronization work.
14. Create a non-sensitive public-safe result.
15. Emit server-side operational telemetry.
16. Return success.

If a later stage fails, the transaction or compensating process must avoid:

- orphaned long-lived files;
- an inquiry without its declared documents;
- multiple CRM leads;
- success without durable receipt;
- leaked provider errors.

---

## 13. Inquiry Data Model

### 13.1 Canonical entity

The secure system must map submission data to the CONTENT_MODEL.md **ProcurementInquiry** model:

| Group | Core fields |
|---|---|
| Identity | id, referenceNumber, submittedAt |
| Origin | formVersion, locale, sourcePage, sourceCampaign |
| Contact | fullName, normalized phone, optional email, role, preferred method |
| Organization | optional company |
| Project | optional project name and delivery location |
| Requirement | intent, category references, quantity text, description |
| Documents | secure document references |
| Consent | notice version, acknowledgement, optional marketing consent |
| Operations | status, assignment, spam assessment, retentionUntil |

### 13.2 Classification

| Classification | Examples | Rule |
|---|---|---|
| Public-safe | form ID, allowed file types, approved labels | May be sent to client |
| Confidential | name, phone, email, company, project, message | Authorized operational access only |
| Restricted | documents, consent audit, internal assignment, spam signals | Least-privilege access and audit |
| Analytics-only | page context, non-PII campaign fields | No contact data |

### 13.3 Initial status

An accepted request begins with:

> **received — درخواست دریافت شد**

Phase 1 does not expose the full status model publicly. Internal statuses may follow CONTENT_MODEL.md, but no tracking UI may be added until authentication, privacy, operational ownership, and route scope are approved.

---

## 14. CRM and Downstream Integration

### 14.1 Provider-neutral boundary

No CRM provider is approved by this document. Implement a provider-neutral server adapter:

~~~ts
interface InquiryDestination {
  deliver(inquiryId: string): Promise<DeliveryResult>;
}
~~~

Provider credentials, field mappings, pipeline IDs, stage IDs, webhook secrets, and endpoints must stay in protected server configuration.

### 14.2 Mapping contract

The adapter should receive normalized internal data, not raw browser payloads.

Recommended mapping:

| Internal field | Destination concept |
|---|---|
| referenceNumber | External reference |
| intent | Lead/request type |
| fullName | Contact name |
| normalizedPhone | Primary phone |
| email | Email |
| companyName | Company |
| projectName | Project |
| deliveryLocation | Delivery/project location |
| materialCategories | Procurement categories |
| estimatedQuantity | Quantity note |
| requirementDescription | Requirement summary |
| secureDocumentLinks | Authenticated internal links, never public URLs |
| sourcePage | Web source |
| campaign | Approved attribution |
| consent | Audit metadata or secure reference |

### 14.3 Delivery guarantees

- Use retry with bounded exponential backoff for transient failures.
- Use a dead-letter or failed-delivery state after retries.
- Alert an owner when delivery remains failed.
- Preserve one internal inquiry as the source of truth.
- Do not create a new lead on every retry.
- Record provider response IDs in restricted logs or integration metadata.
- Do not expose provider state to the public user.

### 14.4 Duplicate handling

Idempotent retries must never create duplicates.

Possible business duplicates—such as the same phone submitting a different request—must not be automatically deleted or merged. Flag them for operational review using:

- normalized phone;
- optional normalized email;
- similar documents or checksum;
- short submission interval;
- same requirement context.

Do not expose duplicate detection to the user.

### 14.5 Internal notification

After durable receipt, an internal notification may contain:

- reference number;
- request intent;
- contact name;
- masked or approved contact detail;
- short sanitized summary;
- secure authenticated link to the internal record.

It must not contain:

- document attachments;
- public document links;
- full invoice contents;
- credentials;
- unescaped HTML from the user.

### 14.6 Customer acknowledgement

Customer acknowledgement is conditional on an approved provider and verified operations.

If enabled:

- send only after durable receipt;
- identify Ahan Asa clearly;
- include the safe reference when available;
- state only an approved next step;
- do not promise an unverified response time;
- do not include submitted documents;
- provide a verified contact path;
- respect the submitted language.

---

## 15. Lead Routing and Qualification

### 15.1 Initial routing

All valid Phase 1 procurement inquiries enter one monitored **Procurement Intake** queue unless a later operational map is approved.

The system may add non-public routing hints:

- request intent;
- material categories;
- delivery location;
- document present;
- consultation required;
- campaign;
- language.

### 15.2 Assignment

Assignment must be deterministic and auditable:

1. Apply an approved routing rule.
2. Assign to an active owner or queue.
3. Record assignment time and rule version.
4. Notify the owner.
5. Escalate unassigned items to a fallback queue.

Do not silently drop a lead because a category, region, or owner is unknown.

### 15.3 Qualification

Qualification is an internal operational activity. The public form must not imitate a loan, insurance, or credit application.

Useful signals may include:

- clean document attached;
- description completeness;
- named delivery location;
- stated quantity;
- business email;
- approved category;
- duplicate/spam confidence.

Signals must not:

- create discriminatory decisions;
- be sent to analytics;
- be displayed to users;
- replace human review for commercially meaningful requests;
- infer sensitive personal characteristics.

### 15.4 Public response expectations

Do not publish “response within X minutes/hours” until operations have measured and approved it. Internal service targets may exist without becoming public promises.

---

## 16. WhatsApp and Direct Contact

### 16.1 Role

WhatsApp may be an alternate assisted-contact channel. It is not the source of truth for website form submission.

### 16.2 Rules

- Use only a verified business number.
- Use a normal link that works without a custom widget.
- A prefilled message may include a generic, non-sensitive context.
- Do not put name, phone, email, invoice number, material list, or document URL in the link.
- Do not auto-open WhatsApp without user action.
- Do not show “submitted” after a WhatsApp click.
- Do not copy form data into the clipboard or message without explicit user action.
- Track only the channel click and page context; never track the message contents.
- Explain that documents sent through WhatsApp follow that channel's handling rules.
- Do not use WhatsApp as the only fallback for form failure.

Recommended generic Persian message:

> سلام، برای ثبت یا تکمیل درخواست خرید آهن راهنمایی می‌خواهم.

### 16.3 Form coexistence

Inside the active Request flow:

- do not show a visually competing sticky WhatsApp button;
- a quiet fallback link may appear after a real submission failure;
- leaving for WhatsApp must not clear the current draft;
- returning to the page must not create a duplicate submission.

---

## 17. Privacy and Consent

### 17.1 Notice timing

Show concise privacy information before final submission, with a link to **/privacy**. Do not hide essential handling information only inside a modal.

### 17.2 Purpose limitation

Submitted data may be used only for approved purposes:

- reviewing the request;
- contacting the requester;
- clarifying requirements;
- managing the procurement inquiry;
- protecting the service against abuse;
- meeting legal or audit obligations.

Marketing requires separate optional consent.

### 17.3 Consent record

Record:

- consent type;
- notice version;
- approved text ID;
- boolean choice;
- server timestamp;
- locale;
- form version;
- inquiry ID.

Do not store an unnecessary full IP address as consent evidence unless legal and security owners explicitly require it.

### 17.4 Data minimization

- Do not send form values to third-party analytics.
- Do not store browser autofill data before submission.
- Do not log raw payloads.
- Mask phone and email in operational logs.
- Redact filenames from general application logs.
- Do not use session replay on the Request route.
- Disable third-party widgets that capture keystrokes.

### 17.5 User rights and deletion

The Privacy page must identify the approved contact path for access, correction, or deletion requests. The implementation must support locating data by secure internal reference without exposing a public lookup endpoint.

---

## 18. Security and Abuse Protection

### 18.1 Required controls

- HTTPS only;
- strict request-size limits;
- same-origin and CSRF protection where applicable;
- schema validation;
- output escaping;
- rate limiting;
- honeypot field;
- minimum human-completion timing signal;
- file type, size, signature, and malware checks;
- private storage;
- least-privilege credentials;
- secret rotation;
- secure headers;
- dependency review;
- protected logs;
- alerting on failure spikes;
- idempotency.

### 18.2 Rate limiting

Apply layered limits to:

- upload authorization;
- upload completion checks;
- inquiry submission;
- acknowledgement resend if introduced.

Limits must account for shared corporate networks and mobile carrier NAT. A block must provide an accessible, non-accusatory recovery message.

### 18.3 Bot challenge

Use passive controls first. If a managed challenge is necessary:

- invoke it only after risk signals where possible;
- do not make a visual puzzle the only completion path;
- test keyboard and screen-reader access;
- document third-party data processing;
- obtain analytics/privacy approval;
- provide an equivalent fallback.

### 18.4 Honeypot

- visually hide it without exposing it to assistive technology or keyboard users;
- use a plausible but non-sensitive server-recognized field;
- never rely on it alone;
- do not reveal the exact rejection reason;
- do not retain its value as lead data.

### 18.5 Logging

Operational logs may include:

- request result code;
- route;
- form version;
- non-sensitive context;
- latency;
- provider delivery state;
- upload state counts;
- correlation ID.

Logs must exclude:

- raw phone;
- email;
- description;
- filenames;
- file URLs or tokens;
- document content;
- consent copy;
- CRM credentials;
- full request body.

---

## 19. Accessibility Contract

### 19.1 Structure

- Use a real **form** element.
- Every control needs a persistent visible label.
- Use **fieldset** and **legend** for radio and checkbox groups.
- Mark required and optional status in visible text.
- Instructions must appear before they are needed.
- Step titles must be real headings.
- Progress must not rely on color alone.
- DOM order must match Persian RTL reading order.

### 19.2 Step navigation

- Step changes must update the visible title.
- Move focus to the new step heading after forward/back navigation.
- Announce progress such as **مرحله ۲ از ۴**.
- Back must not erase data.
- Browser Back must not unexpectedly resubmit.
- Completed-step indicators must not be the only way to edit a step.
- Do not trap focus inside the form.

### 19.3 Errors

On failed final validation:

1. Show a summary at the top of the form.
2. Give it an appropriate heading.
3. Move focus to the summary.
4. Link each summary item to its field.
5. Keep field-level errors.
6. Preserve all valid values and clean uploads.

Example summary heading:

> لطفاً موارد زیر را اصلاح کنید.

### 19.4 Dynamic status

Use restrained live regions:

- polite for upload progress completion and normal status;
- assertive only when immediate action is required;
- avoid announcing every percentage update;
- announce file name plus final outcome;
- keep visual status text available after announcement.

### 19.5 File control

- Native picker is required.
- Drag and drop is optional.
- Remove and retry are semantic buttons.
- Filename direction must be isolated for mixed Persian/Latin text.
- Progress must include a text equivalent.
- Focus must move predictably after removal.

### 19.6 Input direction

- Page and labels use RTL.
- Email, phone, filenames, measurements, model codes, and URLs need bidi isolation.
- Do not force an entire field to LTR when mixed Persian content is expected.
- Numeric input behavior must be tested with Persian and Latin digits.

### 19.7 Touch, zoom, and responsive behavior

- Touch targets must meet the project minimum of 44 × 44 CSS px.
- The form must reflow at 320 CSS px.
- It must work at 200% text resize and 400% zoom.
- Sticky site CTAs must be removed or suppressed while the form is active.
- The mobile keyboard must not hide the active field or error.
- Error summaries and upload lists must not require horizontal page scrolling.

### 19.8 Reduced motion

Step changes and success states may use subtle motion, but:

- motion must not communicate the only state change;
- reduced-motion preference must be honored;
- no celebratory autoplay animation may delay the result;
- focus movement and announcements remain authoritative.

---

## 20. UX Copy Contract

### 20.1 Page opening

Recommended title:

> فاکتور یا لیست خریدتان را برای بررسی ارسال کنید

Recommended introduction:

> مدارک یا توضیحات خرید را بفرستید تا نیاز شما بررسی و مسیر مناسب تأمین مشخص شود. ارسال این فرم به‌معنای ثبت سفارش یا ایجاد تعهد خرید نیست.

### 20.2 Required and optional labels

Use:

- **ضروری**
- **اختیاری**

Do not rely only on an asterisk. If an asterisk is used, explain it once before the form.

### 20.3 File copy

| Purpose | Persian copy |
|---|---|
| Add | افزودن فایل |
| Add more | افزودن فایل دیگر |
| Replace | جایگزینی فایل |
| Remove | حذف فایل |
| Retry | تلاش دوباره |
| Empty | هنوز فایلی اضافه نشده است. |
| Unsupported | این نوع فایل قابل ارسال نیست. |
| Too large | حجم فایل بیشتر از حد مجاز است. |
| Failed | بارگذاری کامل نشد. |
| Ready | فایل آماده ارسال است. |

### 20.4 Submission states

| State | Button or message |
|---|---|
| Ready | ارسال برای بررسی |
| Submitting | در حال ارسال… |
| Success | درخواست شما دریافت شد. |
| Validation failure | لطفاً اطلاعات مشخص‌شده را اصلاح کنید. |
| Server failure | درخواست ثبت نشد. اطلاعات شما در این صفحه حفظ شده است؛ دوباره تلاش کنید. |

### 20.5 Confirmation

Required confirmation content:

- explicit receipt;
- safe reference only when real;
- next operational step;
- response expectation only when verified;
- fallback contact path;
- **ثبت درخواست جدید**;
- **بازگشت به صفحه اصلی**.

Do not display:

- fake progress;
- fake assignment;
- generated response time;
- internal lead status;
- customer name or phone in the URL;
- uploaded document links.

---

## 21. Analytics and Measurement

### 21.1 Principles

- Analytics must never receive PII or document data.
- Analytics consent rules apply.
- Measurement must distinguish intent, start, friction, and durable success.
- A button click is not a lead.
- A file selection is not a submission.
- Only server-confirmed success counts as a primary conversion.

### 21.2 Event schema

| Event | Trigger | Allowed parameters |
|---|---|---|
| request_form_view | Request form becomes visible | form_id, form_version, locale, source_page |
| request_form_start | First meaningful interaction | form_id, intent_context, source_section |
| request_intent_select | User selects intent | intent |
| request_step_complete | Valid step continued | step_number, step_name |
| request_file_select | Approved local selection attempt | file_type_group, size_bucket, file_count |
| request_upload_success | One file reaches clean state | file_type_group, size_bucket |
| request_upload_error | Upload fails or is rejected | error_category, file_type_group |
| request_validation_error | Validation blocks progress | step_number, field_key, error_category |
| request_submit_attempt | User activates final submit | form_id, intent, has_document, has_description |
| request_submit_success | Server confirms durable receipt | form_id, intent, has_document, source_page |
| request_submit_error | Submission fails | error_category, retryable |
| request_retry | User retries | stage |
| direct_contact_click | User selects verified direct channel | channel, source_page, source_section |

### 21.3 Prohibited analytics parameters

Never send:

- name;
- phone;
- email;
- company;
- project name;
- delivery location;
- exact quantity;
- description;
- filename;
- file size in raw bytes;
- document token;
- submission ID;
- reference number;
- full URL containing user-provided values;
- CRM ID;
- IP address as an event parameter.

### 21.4 Event quality

- Deduplicate success by idempotency result.
- Do not fire success from the client before API confirmation.
- Prefer server-side conversion confirmation where the analytics architecture supports it.
- Use bounded enums rather than free text.
- Bucket file size.
- Version event definitions.
- Record consent mode without sending consent text.

### 21.5 Funnel

Primary funnel:

1. request_form_view
2. request_form_start
3. request_step_complete: requirement
4. request_step_complete: contact
5. request_submit_attempt
6. request_submit_success

Diagnostic views may segment by:

- intent;
- source page;
- source section;
- device category;
- locale;
- document versus written description;
- validation category;
- upload failure category.

Do not optimize the form by removing necessary privacy or security controls merely to improve completion rate.

---

## 22. Failure and Recovery Matrix

| Failure | User state preserved | User action | System action |
|---|---:|---|---|
| Client field invalid | Yes | Correct field | No API call |
| File type rejected | Yes | Choose another or use description | Discard rejected bytes |
| File too large | Yes | Choose smaller file or description | Do not authorize upload |
| Upload interrupted | Yes | Retry file | Resume only if secure implementation supports it |
| Malware rejected | Other fields yes | Remove file or use description | Quarantine/delete by policy |
| Scan unavailable | Yes | Retry later or use description | Do not mark file clean |
| Network failure on submit | Yes | Retry | Reuse idempotency key |
| API validation failure | Yes | Correct fields | Return field map |
| Durable store unavailable | Yes | Retry/fallback contact | Return failure, alert operations |
| CRM unavailable with durable queue | N/A after success | No action required | Queue retry |
| CRM unavailable without durable queue | Yes | Retry later | Do not claim success |
| Duplicate retry | N/A | Show original confirmation | Return idempotent result |
| Analytics unavailable | Yes | Continue normally | Do not block submission |
| Notification unavailable | N/A | No user impact | Retry/alert internally |

### 22.1 No-data-loss rule

On a retryable error:

- preserve all text and selections;
- preserve clean file tokens while valid;
- preserve the same idempotency key;
- restore focus to the error;
- do not require reaccepting unchanged privacy text unless the notice version changed;
- never ask the user to reconstruct the entire request without necessity.

---

## 23. Performance and Reliability

### 23.1 Loading

- Do not load upload SDKs until the upload area is near interaction, unless this harms reliability.
- Keep essential form HTML in the initial page response.
- Avoid a large form library when native controls and a shared schema are sufficient.
- Reserve space for errors and file rows to reduce layout shift.
- Lazy third-party contact widgets must not delay the form.

### 23.2 Timeouts

- Show an in-progress state during real submission.
- Do not use an arbitrary client timeout to assume failure while the server may still commit.
- After an uncertain timeout, retry with the same idempotency key.
- Upload authorization and signed URLs must expire.
- A polling flow for scan state must use bounded intervals and stop on navigation or terminal state.

### 23.3 Availability

The request page must:

- render even when analytics fails;
- allow written inquiry when optional upload infrastructure is unavailable, if the core API is healthy;
- show a truthful maintenance state when the inquiry API is unavailable;
- avoid fake offline storage of sensitive requests.

### 23.4 Monitoring

Monitor:

- inquiry success rate;
- API latency;
- validation rejection rate by category;
- upload initialization and completion;
- scan failure rate;
- durable queue depth;
- CRM delivery failures;
- unassigned inquiries;
- duplicate prevention;
- notification failures.

Alerts must not contain raw user data.

---

## 24. Responsive Behavior

### 24.1 Desktop

- Keep the form column readable rather than excessively wide.
- Place support copy near the relevant field.
- A separate summary rail is allowed only if it remains synchronized and accessible.
- Do not let decorative media compete with the form.

### 24.2 Mobile

- Use one column.
- Keep labels above controls.
- Use full-width primary step actions where useful.
- Keep Back visually secondary.
- Do not show the global sticky CTA.
- Keep file actions reachable without horizontal scrolling.
- Use safe-area insets.
- Avoid automatic focus that unexpectedly opens the keyboard on page load.

### 24.3 Breakpoint independence

Validation, field order, required conditions, and API payload must not change by viewport. Responsive design may change presentation only.

---

## 25. Component Architecture

Recommended components:

| Component | Responsibility |
|---|---|
| RequestForm | Own flow state and submission orchestration |
| FormProgress | Expose current and total steps |
| RequestIntentFieldset | Select approved starting point |
| RequirementFields | Description, categories, quantity, location |
| SecureUpload | File selection and orchestration |
| UploadItem | One file's status and actions |
| ContactFields | Name, phone, optional contact fields |
| PhoneField | Country code, normalization-friendly number input |
| ConsentFields | Privacy and optional marketing consent |
| ReviewSummary | Readable pre-submit summary |
| FieldError | Field-specific error contract |
| ErrorSummary | Linked list of final validation errors |
| SubmissionStatus | Loading, error, and success announcement |
| FormFallbackContact | Verified fallback channel after failure |

### 25.1 Shared schema

Use one schema definition for:

- field names;
- enum values;
- limits;
- conditional requirement;
- client validation;
- server validation;
- test fixtures;
- CRM mapping types.

The server must still independently enforce all rules.

### 25.2 No provider logic in UI

Components must not import:

- CRM SDKs;
- storage admin clients;
- notification credentials;
- analytics secrets;
- internal pipeline IDs.

UI components submit to the website's own server contract.

---

## 26. Suggested Type Contracts

~~~ts
type SafeRequestContext = {
  sourcePage: string;
  sourceSection?: string;
  ctaIntent?: string;
  categorySlug?: string;
  serviceSlug?: string;
  guideSlug?: string;
  campaignId?: string;
};

type InquirySubmission = {
  formVersion: string;
  locale: "fa-IR";
  intent: RequestIntent;
  contact: {
    fullName: string;
    phoneCountryCode: string;
    phoneNationalNumber: string;
    email?: string;
    role?: string;
    preferredContactMethod?: "phone" | "email" | "whatsapp";
  };
  company?: {
    name?: string;
  };
  project?: {
    name?: string;
    deliveryLocation?: string;
  };
  requestedMaterialCategoryIds: string[];
  estimatedQuantity?: string;
  requirementDescription?: string;
  documentTokens: string[];
  context: SafeRequestContext;
  attribution?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  consent: {
    privacyAcknowledged: true;
    privacyNoticeVersion: string;
    marketingConsent?: boolean;
  };
};
~~~

These types are conceptual. The runtime schema remains authoritative.

---

## 27. SEO and Indexing

- **/request**: noindex, follow.
- **/request/confirmation**: noindex, nofollow.
- API routes: never in sitemap.
- Do not place form data in query parameters.
- Do not generate indexable step routes.
- Confirmation content must not expose PII to crawlers or shared previews.
- Page metadata should describe the request action without promising instant quotation.
- Canonical for **/request** points to itself.
- Unsupported locale form routes must not be published as empty translations.

---

## 28. Testing Strategy

### 28.1 Unit tests

Test:

- digit normalization;
- E.164 conversion;
- whitespace normalization;
- enum allowlists;
- conditional file-or-description rule;
- size aggregation;
- filename sanitization;
- context validation;
- consent version requirement;
- idempotency behavior;
- analytics parameter redaction.

### 28.2 Component tests

Test:

- every visible label;
- required and optional indicators;
- radio and checkbox semantics;
- step progress;
- focus after step change;
- field errors;
- error summary links;
- file add/remove/retry;
- upload status announcements;
- submit busy state;
- draft preservation;
- success and failure rendering;
- RTL and mixed-direction content.

### 28.3 API integration tests

Test:

- valid description-only request;
- valid file request;
- valid combined request;
- missing contact;
- missing requirement input;
- invalid context;
- expired document token;
- unclean document;
- size and count limits;
- CSRF/origin failure;
- rate limit;
- duplicate identical retry;
- conflicting idempotency key;
- CRM success;
- CRM transient failure with durable queue;
- durable-store failure;
- notification failure after accepted request.

### 28.4 End-to-end journeys

At minimum:

1. Submit a Persian written requirement with name and phone.
2. Upload a valid PDF, remove it, add an XLSX, and submit.
3. Trigger and correct every required-field error.
4. Lose network during upload and retry.
5. Lose network after submit and recover idempotently.
6. Complete the flow using keyboard only.
7. Complete at 320 CSS px and 400% zoom.
8. Complete with NVDA or VoiceOver.
9. Verify no PII appears in the URL, analytics payload, or browser console.
10. Verify confirmation refresh does not resubmit.

### 28.5 Security tests

- malicious MIME/extension mismatch;
- double extension;
- oversized file;
- decompression/archive rejection;
- HTML/SVG rejection;
- macro-enabled document rejection;
- path traversal filename;
- XSS in every text field;
- SQL/NoSQL injection strings;
- forged document token;
- token reuse by another session;
- expired upload authorization;
- CSRF;
- abusive request burst;
- log redaction;
- unauthorized private-file access.

### 28.6 Accessibility acceptance

No Blocker or High accessibility issue may remain in:

- empty form;
- every step;
- validation state;
- upload progress;
- upload failure;
- submission loading;
- submission failure;
- confirmation.

Automated testing alone is insufficient.

---

## 29. Acceptance Criteria

The Phase 1 form architecture is complete only when:

- every primary CTA resolves to **/request**;
- no competing lead form exists;
- one intent is required;
- name and phone are required;
- file upload is optional;
- description is required when no clean file exists;
- all optional fields are optional end to end;
- **/api/inquiries** validates on the server;
- success requires durable receipt;
- retries are idempotent;
- file storage is private;
- files are verified and scanned;
- PII is absent from URLs and analytics;
- privacy acknowledgement is versioned;
- CRM delivery cannot create duplicate leads on retry;
- provider failure has a monitored recovery path;
- the form is keyboard and screen-reader usable;
- errors preserve data and support recovery;
- confirmation contains no fake status or promise;
- Phase 1 exclusions remain excluded;
- legal, retention, contact, and provider decision gates are closed.

---

## 30. Required Decision Register Before Launch

The following values must be explicitly confirmed and recorded in DECISIONS.md:

| Decision | Proposed baseline | Owner |
|---|---|---|
| CRM or inquiry destination | Provider-neutral adapter; provider TBD | Product/Operations |
| Durable source of truth | Website-controlled secure inquiry store | Technical |
| File upload enabled | Yes only with private storage and scanning | Technical/Security |
| File limits | 5 files; 10 MiB each; 25 MiB total | Product/Technical |
| Accepted file types | PDF, XLSX, XLS, CSV, DOCX, JPG, PNG | Operations/Security |
| Submitted-file retention | 180 days after last activity | Legal/Operations |
| Temporary-upload retention | 24 hours | Security |
| Privacy notice text/version | Pending legal approval | Legal |
| Verified phone/email/WhatsApp | Pending verification | Operations |
| Public reference number | Disabled unless backend supports it | Product/Technical |
| Customer acknowledgement channel | Disabled until provider approved | Operations |
| Public response-time promise | None | Operations |
| CAPTCHA/provider | None by default; risk-based only | Security/Privacy |
| Marketing consent/newsletter | Deferred | Marketing/Legal |

An unresolved value must not be invented by Claude Code.

---

## 31. Claude Code Implementation Mandates

Claude Code MUST:

1. Read PROJECT_BRIEF.md, CTA_STRATEGY.md, CONTENT_MODEL.md, ROUTES.md, ACCESSIBILITY.md, and this file before changing forms.
2. Use **/request** as the canonical acquisition flow.
3. Use **/api/inquiries** as the public submission endpoint.
4. Keep CRM, storage, notification, and security credentials server-only.
5. Implement client and server validation from a shared contract where practical.
6. Preserve server authority.
7. Enforce the file-or-description conditional requirement.
8. Keep optional fields optional across UI, API, storage, and integration mapping.
9. Never put PII or document tokens in URLs.
10. Never send PII or filenames to analytics.
11. Never claim success before durable receipt.
12. Implement idempotent final submission.
13. Store files privately and require verified clean status before operational access.
14. Preserve entered data after recoverable failure.
15. Implement accessible labels, errors, focus, statuses, and keyboard behavior initially—not as later cleanup.
16. Suppress persistent global CTAs while the Request form is active.
17. Use verified contact channels only.
18. Do not add public tracking, accounts, checkout, payment, live prices, inventory, or automated quotation.
19. Do not select a CRM, CAPTCHA, email, SMS, storage, or analytics provider without an approved decision.
20. Stop and report a conflict when another document requests a prohibited behavior or an unapproved operational promise.

### 31.1 Prohibited implementation shortcuts

- client-only submission;
- email-only form delivery without durable storage;
- public upload folder;
- raw form payload logging;
- provider SDK in client components;
- base64 file upload inside analytics or JSON lead fields;
- validation only after data reaches the CRM;
- success based on a 200 response from an upload endpoint;
- one new endpoint per page or CTA;
- unlabelled icon controls;
- placeholder-only labels;
- disabling paste;
- forcing account creation;
- mandatory company or email without an approved reason;
- prechecked consent;
- hidden marketing opt-in;
- public sequential request IDs;
- fake progress or fake response estimates.

---

## 32. Implementation Checklist

### Product and copy

- [ ] Canonical intent options approved
- [ ] Persian labels approved
- [ ] Privacy text legally approved
- [ ] Confirmation next-step copy operationally verified
- [ ] No instant-price or purchase-order implication
- [ ] Optional fields remain optional

### Frontend

- [ ] One RequestForm implementation
- [ ] Shared schema integrated
- [ ] Four-step or approved single-page presentation
- [ ] RTL and bidi-safe technical values
- [ ] Accessible upload control
- [ ] Error summary and field links
- [ ] Busy, failure, retry, and success states
- [ ] Draft preserved on recoverable failure
- [ ] Sticky global CTA suppressed on form route
- [ ] No PII in URL, storage, console, or analytics

### Backend

- [ ] /api/inquiries implemented
- [ ] /api/uploads implemented only if approved
- [ ] Server validation complete
- [ ] Idempotency complete
- [ ] Durable inquiry store complete
- [ ] Transactional document binding complete
- [ ] Private storage and scanning complete
- [ ] Rate limit and abuse controls complete
- [ ] CRM adapter and retry complete
- [ ] Internal notification safe
- [ ] Log redaction verified
- [ ] Retention jobs verified

### Analytics

- [ ] Events use approved bounded parameters
- [ ] PII audit passes
- [ ] Success fires only after durable receipt
- [ ] Consent behavior verified
- [ ] Duplicate success events prevented
- [ ] Session replay disabled on request flow

### QA

- [ ] Description-only request passes
- [ ] File request passes
- [ ] Upload retry passes
- [ ] Duplicate submit prevented
- [ ] Server failure preserves data
- [ ] Keyboard flow passes
- [ ] Screen-reader flow passes
- [ ] 320 CSS px and 400% zoom pass
- [ ] Security file cases pass
- [ ] Confirmation refresh does not resubmit
- [ ] No Blocker or High defect remains

---

## 33. Definition of Done

FORM_ARCHITECTURE.md is implemented when Ahan Asa has one secure, honest, accessible, measurable, and operationally usable inquiry system that:

- accepts an invoice, material list, project document, written requirement, or consultation request;
- requires only the minimum reliable contact and requirement information;
- protects confidential documents and personal data;
- produces a durable inquiry before showing success;
- prevents duplicate delivery;
- preserves user work through recoverable errors;
- supplies operations with normalized context;
- remains independent of an unapproved provider;
- does not behave like a store, public price engine, or automated quotation service;
- faithfully expresses the promise that Ahan Asa protects the client's capital through professional procurement review.

